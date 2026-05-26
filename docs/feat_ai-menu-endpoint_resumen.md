# Feature: `feat/ai-menu-endpoint` — Endpoint MVP `POST /api/ai/menu`

> Rama: `feat/ai-menu-endpoint`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express 5 + TypeScript + Mongoose 9 + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit**.

---

## 1. Objetivo

Exponer el segundo endpoint backend del módulo IA — `POST /api/ai/menu` — siguiendo el mismo patrón que `POST /api/ai/chat`: service que orquesta (validar request → cargar prompt → renderizar → llamar Gemini → validar respuesta → persistir) + controller fino + ruta + manejo de errores delegado al middleware global.

Reutiliza todo el andamiaje ya existente (prompt `ai_menu_generator`, `aiMenuRequestSchema` / `aiMenuResponseSchema`, default template, provider, repositorios) — la feature es 100% mecánica.

---

## 2. Endpoint

`POST /api/ai/menu`

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |

### 2.1. Body (validado por `aiMenuRequestSchema`, `.strict()`)

```jsonc
{
  "userId": "u_demo_123",                 // string, requerido
  "objective": "lose_weight",             // "lose_weight" | "maintain" | "gain_muscle", requerido
  "caloriesTarget": 1800,                 // number, [1200, 4500], requerido
  "proteinTarget": 120,                   // number ≥ 0, opcional
  "carbsTarget": 200,                     // number ≥ 0, opcional
  "fatTarget": 60,                        // number ≥ 0, opcional
  "days": 3,                              // int [1..7], opcional
  "mealsPerDay": 4,                       // int [1..6], opcional
  "notes": "vegetariano si es posible",   // string ≤ 1000 chars, opcional
  "plan": "free"                          // "free" | "pro", opcional
}
```

### 2.2. Respuesta 200

```jsonc
{
  "success": true,
  "data": {
    "responseText": "Resumen del menú propuesto…",
    "structuredData": {
      "dailyCalories": 1800,
      "days": [
        {
          "day": 1,
          "meals": [
            {
              "name": "Desayuno",
              "description": "Yogur natural con avena y fruta",
              "estimatedCalories": 420,
              "estimatedProtein": 22,
              "estimatedCarbs": 60,
              "estimatedFat": 10
            }
            // ...
          ]
        }
        // ...
      ],
      "recommendations": ["..."],
      "warnings": ["..."]
    },
    "safety": {
      "isOutOfScope": false,
      "flags": [],
      "escalationMessage": null
    },
    "conversationId": "conv_<uuid>",
    "metadata": {
      "provider": "gemini",
      "model": "gemini-2.5-flash",
      "promptVersion": "v1",
      "cached": false
    }
  }
}
```

Side-effects en Mongo (por llamada exitosa):

- 1 `AiConversation` con `type: 'menu_generation'`.
- 1 `AiMessage` `role: 'user'` con `content` = JSON serializado del request (sin `userId`).
- 1 `AiMessage` `role: 'assistant'` con `responseText`, `structuredData`, `provider`, `model`, `promptVersion`, `safety` (mapeado).

---

## 3. Flujo interno (`runAiMenu`)

```
input (unknown)
  └─► aiMenuRequestSchema.safeParse                              → validation_error
  ▼
  conversationId = generateConversationId()
  ▼
  createConversation({ type: 'menu_generation', provider: 'gemini' })   → persistence_error
  ▼
  addMessage(user) { msg_<uuid>, role:'user', content: JSON.stringify(request \ userId) }
                                                                  → persistence_error
  ▼
  getDefaultPromptTemplate('ai_menu_generator')                   → prompt_not_found
  ▼
  buildRenderedPrompt({ systemPrompt, userPromptTemplate, vars }) // vars: objective, caloriesTarget, …
  ▼
  generateGeminiJson<unknown>({ systemPrompt, userPrompt })       → provider_error
  ▼
  validateAiResponse(aiMenuResponseSchema, parsed)                → validation_error
  ▼
  addMessage(assistant) {
     msg_<uuid>, role:'assistant', content: responseText, structuredData,
     provider, model, promptVersion,
     safety: mapSafetyForPersistence(aiResponse.safety)
  }                                                                → persistence_error
  ▼
  return { responseText, structuredData, safety, conversationId, metadata }
```

Diferencia respecto al chat: **cada llamada crea una conversación nueva** — `aiMenuRequestSchema` no admite `conversationId`. Si se quisiese encadenar regeneraciones, sería una iteración futura del esquema.

---

## 4. Archivos creados / modificados

**Creados (3):**

- [backend/src/modules/ai/services/aiMenu.service.ts](../backend/src/modules/ai/services/aiMenu.service.ts) — `runAiMenu`, `AiMenuServiceResult`, helpers internos (`buildMenuPromptVariables`, `mapSafetyForPersistence`, `persist`, `serializeMenuRequestForPersistence`).
- [backend/src/modules/ai/controllers/aiMenu.controller.ts](../backend/src/modules/ai/controllers/aiMenu.controller.ts) — `postAiMenu` (thin wrapper).
- [docs/feat_ai-menu-endpoint_resumen.md](feat_ai-menu-endpoint_resumen.md) — este documento.

**Modificados (3):**

- [backend/src/modules/ai/routes/ai.routes.ts](../backend/src/modules/ai/routes/ai.routes.ts) — registra `POST /menu`.
- [backend/src/modules/ai/services/index.ts](../backend/src/modules/ai/services/index.ts) — re-exporta `runAiMenu` + `AiMenuServiceResult`.
- [backend/src/modules/ai/index.ts](../backend/src/modules/ai/index.ts) — re-exporta `postAiMenu`.

**No modificados (intencional):**

- `schemas/aiMenu.schema.ts` — ya soportaba la forma necesaria (`request` + `response` con `safety`).
- `prompts/aiMenu.prompt.ts`, `prompts/defaultPromptTemplates.ts`, `prompts/promptVersions.ts` — sin cambios.
- `providers/`, `repositories/`, `models/`, `types/` — sin cambios.
- `app.ts`, `server.ts`, `middlewares/errorHandler.ts` — sin cambios (el handler ya cubre `validation_error` / `prompt_not_found` / `provider_error` / `persistence_error`).

Sin nuevas dependencias.

---

## 5. Errores posibles

Misma forma JSON que el resto del API:

```jsonc
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": …,   // solo si NODE_ENV !== 'production'
    "stack": "…"    // solo si NODE_ENV !== 'production'
  }
}
```

| `code` | HTTP | Cuándo |
|---|---|---|
| `validation_error` | **400** | Body inválido (zod issues) — p.ej. `caloriesTarget < 1200`, `days > 7`, `objective` desconocido — o respuesta IA mal formada. |
| `prompt_not_found` | 500 | No hay template registrado para `ai_menu_generator` (no debería ocurrir; el default está en `defaultAiPromptTemplates`). |
| `provider_error` | **502** | Fallo Gemini (incluye `missing_api_key`, `invalid_response`, `provider_error`, `json_parse_error` vía `details.providerCode`). |
| `persistence_error` | 500 | Fallo Mongo en create/addMessage. |
| `internal_error` | 500 | Fallback inesperado. |

---

## 6. Limitaciones

- **Sin auth**: `userId` se toma del body — trust-on-client. Vale para Postman/dev; en producción lo pondrá el middleware de auth.
- **Sin caché**: cada petición llama a Gemini y persiste 2 mensajes.
- **Sin `conversationId` reusable**: el esquema actual no lo admite. Para "regenerar el menú anterior" se crea otra conversación.
- **Sin streaming**.
- **Sin `tokenUsage` real**: defaults a 0 hasta que el SDK exponga `usageMetadata`.
- **Side-effect documentado**: si Gemini falla *después* de crear la conversación y el user message, ambos quedan persistidos. El siguiente intento crea una conversación nueva (no reutiliza la huérfana). Es consistente con el comportamiento del chat.
- **Modelo `AiConversation`**: el `type: 'menu_generation'` ya está soportado por `AI_INTERACTION_TYPES` — no hubo que tocar modelo ni schema.

---

## 7. Comandos de prueba `curl`

### 7.1. Sin Gemini real

> Suficiente para verificar el camino HTTP + validación + errores. **No** consume cuota.

Arrancar:

```bash
docker compose up -d mongo
cd backend
cp .env.example .env       # editar MONGO_URI si procede
npm run dev
```

Body inválido (`caloriesTarget` demasiado bajo) → 400:

```bash
curl -i -X POST http://localhost:3000/api/ai/menu \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u_demo","objective":"lose_weight","caloriesTarget":900}'
```

Body válido pero sin `GEMINI_API_KEY` → 502 `provider_error` con `details.providerCode: "missing_api_key"`:

```bash
curl -i -X POST http://localhost:3000/api/ai/menu \
  -H 'Content-Type: application/json' \
  -d '{
        "userId": "u_demo_123",
        "objective": "lose_weight",
        "caloriesTarget": 1800
      }'
```

Aunque el 502 se devuelva, la conversación + user message ya estarán en Mongo (side-effect documentado).

### 7.2. Con `GEMINI_API_KEY`

> ⚠️ **Consume cuota de pago. No ejecutar sin permiso explícito.**

```bash
curl -i -X POST http://localhost:3000/api/ai/menu \
  -H 'Content-Type: application/json' \
  -d '{
        "userId": "u_demo_123",
        "objective": "lose_weight",
        "caloriesTarget": 1800,
        "proteinTarget": 120,
        "carbsTarget": 200,
        "fatTarget": 60,
        "days": 3,
        "mealsPerDay": 4,
        "notes": "vegetariano si es posible",
        "plan": "free"
      }'
```

Esperado: 200 con `data.structuredData.days.length === 3`, `data.structuredData.days[0].meals.length === 4`, y `data.metadata.model === "gemini-2.5-flash"`.

Inspeccionar Mongo:

```js
use nutricoach_ai
db.ai_conversations.find({type: "menu_generation"}).sort({createdAt: -1}).limit(5)
db.ai_messages.find({conversationId: "conv_<uuid>"}).sort({createdAt: 1})
```

---

## 8. Verificación check / build

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status --short:
  M src/modules/ai/index.ts
  M src/modules/ai/routes/ai.routes.ts
  M src/modules/ai/services/index.ts
  ?? src/modules/ai/controllers/aiMenu.controller.ts
  ?? src/modules/ai/services/aiMenu.service.ts

git diff --stat:
  backend/src/modules/ai/index.ts            | 1 +
  backend/src/modules/ai/routes/ai.routes.ts | 4 ++++
  backend/src/modules/ai/services/index.ts   | 1 +
  3 files changed, 6 insertions(+)
```

Sin llamadas reales a Gemini en esta sesión.

---

## 9. Qué NO se ha implementado (intencional)

- ❌ Llamadas reales a Gemini.
- ❌ Auth (`userId` del body, trust-on-client).
- ❌ Rate limit / free vs pro.
- ❌ Caché de respuestas (`AiCacheEntry`).
- ❌ Streaming.
- ❌ Reintentos / circuit breaker.
- ❌ Encadenamiento de regeneraciones (cada petición = conversación nueva).
- ❌ Token usage real / coste.
- ❌ Cambios en frontend, README, `docs/ai-module-demo-guide.md`.
- ❌ Tests automatizados (vitest + supertest + mock provider + `mongodb-memory-server`).
- ❌ Dependencias nuevas.
- ❌ Cambios en modelos, schemas Zod, prompts, provider, repositorios, types.

---

## 10. Comandos exactos para commit (NO ejecutados)

```bash
git status --short
git diff --stat
git diff --name-only

git add backend/src/modules/ai/services/aiMenu.service.ts \
        backend/src/modules/ai/controllers/aiMenu.controller.ts \
        backend/src/modules/ai/routes/ai.routes.ts \
        backend/src/modules/ai/services/index.ts \
        backend/src/modules/ai/index.ts \
        docs/feat_ai-menu-endpoint_resumen.md

git commit -m "feat(ai): add POST /api/ai/menu endpoint backed by runAiMenu

- Add runAiMenu service: validate (aiMenuRequestSchema), create conversation
  (type 'menu_generation'), persist user message (serialized request),
  load + render ai_menu_generator template, call Gemini, validate response
  (aiMenuResponseSchema), persist assistant message with provider/model/
  promptVersion/safety; return responseText/structuredData/safety/
  conversationId/metadata
- Add postAiMenu controller (thin wrapper, same shape as postAiChat)
- Register POST /menu in ai.routes.ts
- Re-export runAiMenu, AiMenuServiceResult and postAiMenu from barrels
- No new dependencies, no model/schema/prompt/provider changes
- No real Gemini calls"
```

Sin `git add .`, sin commit, sin push.
