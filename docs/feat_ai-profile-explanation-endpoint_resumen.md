# Feature: `feat/ai-profile-explanation-endpoint` — Endpoint MVP `POST /api/ai/profile-explanation`

> Rama: `feat/ai-profile-explanation-endpoint` (apilada sobre `feat/ai-menu-endpoint`)
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express 5 + TypeScript + Mongoose 9 + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit**.

---

## 1. Objetivo

Exponer el cuarto y último endpoint del módulo IA — `POST /api/ai/profile-explanation` — siguiendo el mismo patrón mecánico ya consolidado por `runAiChat` y `runAiMenu`.

El endpoint recibe los valores nutricionales **ya calculados por el backend** (BMR, TDEE, calorías y macros objetivo) y los explica al usuario en lenguaje claro y motivador. La IA **no recalcula** nada — solo traduce los números a lenguaje cotidiano. Este endpoint cierra el conjunto de los 4 casos de uso planificados (chat, menu, plate-analysis, profile-explanation).

---

## 2. Endpoint

`POST /api/ai/profile-explanation`

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |

### 2.1. Body (validado por `aiProfileExplanationRequestSchema`, `.strict()`)

```jsonc
{
  "userId": "u_demo_123",                     // string, requerido
  "objective": "lose_weight",                 // "lose_weight" | "maintain" | "gain_muscle", requerido
  "basalMetabolicRate": 1520,                 // number > 0 (kcal/día), requerido
  "totalDailyEnergyExpenditure": 2280,        // number > 0 (kcal/día), requerido
  "caloriesTarget": 1800,                     // number [1200..4500], requerido
  "proteinTarget": 120,                       // number ≥ 0, opcional
  "carbsTarget": 200,                         // number ≥ 0, opcional
  "fatTarget": 60,                            // number ≥ 0, opcional
  "plan": "free"                              // "free" | "pro", opcional
}
```

### 2.2. Respuesta 200

```jsonc
{
  "success": true,
  "data": {
    "responseText": "Vamos a entender qué significan tus números…",
    "structuredData": {
      "explainedMetrics": [
        "Tu BMR es la energía que tu cuerpo usa en reposo…",
        "Tu TDEE es lo que gastas en un día normal…",
        "Tus calorías objetivo son…"
      ],
      "recommendations": ["..."],
      "warnings": ["..."],
      "confidence": "high"
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

- 1 `AiConversation` con `type: 'profile_explanation'`.
- 1 `AiMessage` `role: 'user'` con `content` = JSON serializado del request (sin `userId`).
- 1 `AiMessage` `role: 'assistant'` con `responseText`, `structuredData`, `provider`, `model`, `promptVersion`, `safety` (mapeado).

---

## 3. Flujo interno (`runAiProfileExplanation`)

```
input (unknown)
  └─► aiProfileExplanationRequestSchema.safeParse                 → validation_error
  ▼
  conversationId = generateConversationId()
  ▼
  createConversation({ type: 'profile_explanation', provider: 'gemini' })   → persistence_error
  ▼
  addMessage(user) { msg_<uuid>, role:'user', content: JSON.stringify(request \ userId) }
                                                                  → persistence_error
  ▼
  getDefaultPromptTemplate('ai_profile_explanation')              → prompt_not_found
  ▼
  buildRenderedPrompt({ systemPrompt, userPromptTemplate, vars })
    // vars: objective, basalMetabolicRate, totalDailyEnergyExpenditure,
    //       caloriesTarget, proteinTarget, carbsTarget, fatTarget, plan
  ▼
  generateGeminiJson<unknown>({ systemPrompt, userPrompt })       → provider_error
  ▼
  validateAiResponse(aiProfileExplanationResponseSchema, parsed)  → validation_error
  ▼
  addMessage(assistant) {
     msg_<uuid>, role:'assistant', content: responseText, structuredData,
     provider, model, promptVersion,
     safety: mapSafetyForPersistence(aiResponse.safety)
  }                                                                → persistence_error
  ▼
  return { responseText, structuredData, safety, conversationId, metadata }
```

Diferencia clave vs. chat y menú: el prompt instruye explícitamente a **no recalcular** los valores. La IA solo los traduce a lenguaje humano. Si los valores parecen extremos para un adulto sano, debe avisarlo en `warnings` sin modificarlos.

---

## 4. Archivos creados / modificados

**Creados (3):**

- [backend/src/modules/ai/services/aiProfileExplanation.service.ts](../backend/src/modules/ai/services/aiProfileExplanation.service.ts) — `runAiProfileExplanation`, `AiProfileExplanationServiceResult`, helpers internos (`buildProfilePromptVariables`, `mapSafetyForPersistence`, `persist`, `serializeProfileRequestForPersistence`).
- [backend/src/modules/ai/controllers/aiProfileExplanation.controller.ts](../backend/src/modules/ai/controllers/aiProfileExplanation.controller.ts) — `postAiProfileExplanation` (thin wrapper).
- [docs/feat_ai-profile-explanation-endpoint_resumen.md](feat_ai-profile-explanation-endpoint_resumen.md) — este documento.

**Modificados (3):**

- [backend/src/modules/ai/routes/ai.routes.ts](../backend/src/modules/ai/routes/ai.routes.ts) — registra `POST /profile-explanation`.
- [backend/src/modules/ai/services/index.ts](../backend/src/modules/ai/services/index.ts) — re-exporta `runAiProfileExplanation` + `AiProfileExplanationServiceResult`.
- [backend/src/modules/ai/index.ts](../backend/src/modules/ai/index.ts) — re-exporta `postAiProfileExplanation`.

**No modificados (intencional):**

- `schemas/aiProfileExplanation.schema.ts` — ya soportaba request + response con `safety`.
- `prompts/aiProfileExplanation.prompt.ts`, `prompts/defaultPromptTemplates.ts`, `prompts/promptVersions.ts` — sin cambios.
- `providers/`, `repositories/`, `models/`, `types/` — sin cambios.
- `app.ts`, `server.ts`, `middlewares/errorHandler.ts` — sin cambios (cubre `validation_error` / `prompt_not_found` / `provider_error` / `persistence_error`).
- Frontend, README, `docs/ai-module-demo-guide.md` — sin cambios.

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
| `validation_error` | **400** | Body inválido — p.ej. `basalMetabolicRate <= 0`, `caloriesTarget < 1200`, `objective` desconocido — o respuesta IA mal formada. |
| `prompt_not_found` | 500 | No hay template registrado para `ai_profile_explanation` (no debería ocurrir; está en `defaultAiPromptTemplates`). |
| `provider_error` | **502** | Fallo Gemini (incluye `missing_api_key`, `invalid_response`, `provider_error`, `json_parse_error` vía `details.providerCode`). |
| `persistence_error` | 500 | Fallo Mongo en create/addMessage. |
| `internal_error` | 500 | Fallback inesperado. |

---

## 6. Comandos `curl` de prueba

### 6.1. Sin Gemini real

> Suficiente para verificar el camino HTTP + validación + errores. **No** consume cuota.

```bash
docker compose up -d mongo
cd backend
cp .env.example .env       # editar MONGO_URI si procede
npm run dev
```

Body inválido (`basalMetabolicRate <= 0`) → 400:

```bash
curl -i -X POST http://localhost:3000/api/ai/profile-explanation \
  -H 'Content-Type: application/json' \
  -d '{
        "userId": "u_demo",
        "objective": "lose_weight",
        "basalMetabolicRate": 0,
        "totalDailyEnergyExpenditure": 2280,
        "caloriesTarget": 1800
      }'
```

Body válido pero sin `GEMINI_API_KEY` → 502 `provider_error` con `details.providerCode: "missing_api_key"`:

```bash
curl -i -X POST http://localhost:3000/api/ai/profile-explanation \
  -H 'Content-Type: application/json' \
  -d '{
        "userId": "u_demo_123",
        "objective": "lose_weight",
        "basalMetabolicRate": 1520,
        "totalDailyEnergyExpenditure": 2280,
        "caloriesTarget": 1800,
        "proteinTarget": 120,
        "carbsTarget": 200,
        "fatTarget": 60,
        "plan": "free"
      }'
```

Aunque devuelva 502, la conversación + user message ya estarán en Mongo (side-effect documentado, igual que en menu y chat).

### 6.2. Con `GEMINI_API_KEY`

> ⚠️ **Consume cuota de pago. No ejecutar sin permiso explícito.**

Mismo body válido que arriba. Esperado: 200 con `data.structuredData.explainedMetrics.length ≥ 2`, `data.structuredData.confidence` definido y `data.metadata.model === "gemini-2.5-flash"`.

Inspeccionar Mongo:

```js
use nutricoach_ai
db.ai_conversations.find({type: "profile_explanation"}).sort({createdAt: -1}).limit(5)
db.ai_messages.find({conversationId: "conv_<uuid>"}).sort({createdAt: 1})
```

---

## 7. Verificación check / build

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status --short:
  M src/modules/ai/index.ts
  M src/modules/ai/routes/ai.routes.ts
  M src/modules/ai/services/index.ts
  ?? src/modules/ai/controllers/aiProfileExplanation.controller.ts
  ?? src/modules/ai/services/aiProfileExplanation.service.ts

git diff --stat:
  backend/src/modules/ai/index.ts            | 1 +
  backend/src/modules/ai/routes/ai.routes.ts | 4 ++++
  backend/src/modules/ai/services/index.ts   | 4 ++++
  3 files changed, 9 insertions(+)
```

Sin llamadas reales a Gemini en esta sesión.

---

## 8. Limitaciones

- **Sin auth**: `userId` se toma del body — trust-on-client. Igual que el resto de endpoints IA actuales.
- **Sin caché**: cada petición llama a Gemini y persiste 2 mensajes (incluso si el perfil del usuario no ha cambiado). El siguiente paso natural es `feat/ai-cache` con `cacheKey = sha256(systemPrompt + userPrompt + model + promptVersion)`.
- **One-shot**: cada llamada crea una conversación nueva. No hay "regeneración" reutilizando contexto.
- **No recalcula**: la IA solo explica. Los valores BMR/TDEE/objetivo los calcula el backend antes de invocar este endpoint.
- **Side-effect documentado**: si Gemini falla *después* de crear la conversación + user message, ambos quedan persistidos. Mismo patrón que chat y menu.

---

## 9. Qué NO se ha implementado (intencional)

- ❌ Llamadas reales a Gemini.
- ❌ Auth (`userId` del body, trust-on-client).
- ❌ Rate limit / free vs pro.
- ❌ Caché de respuestas (`AiCacheEntry`).
- ❌ Streaming.
- ❌ Reintentos / circuit breaker.
- ❌ Encadenamiento de regeneraciones.
- ❌ Token usage real / coste.
- ❌ Cambios en frontend, README, `docs/ai-module-demo-guide.md`.
- ❌ Tests automatizados (vitest + supertest + mock provider + `mongodb-memory-server`).
- ❌ Dependencias nuevas.
- ❌ Cambios en modelos, schemas Zod, prompts, provider, repositorios, types, middlewares, app, server.

Con esta feature, los **4 endpoints del módulo IA están cerrados**: `/chat`, `/menu`, `/profile-explanation`, `/plate-analysis`. El siguiente paso natural deja de ser mecánico y pasa a ser de plataforma (caché, tests, auth, rate limit).

---

## 10. Comandos exactos para commit (NO ejecutados)

```bash
# 1) Auditoría previa
git status --short
git diff --stat
git diff --name-only

# 2) Add explícito (sin `git add .`)
git add backend/src/modules/ai/services/aiProfileExplanation.service.ts \
        backend/src/modules/ai/controllers/aiProfileExplanation.controller.ts \
        backend/src/modules/ai/routes/ai.routes.ts \
        backend/src/modules/ai/services/index.ts \
        backend/src/modules/ai/index.ts \
        docs/feat_ai-profile-explanation-endpoint_resumen.md

# 3) Commit
git commit -m "feat(ai): add POST /api/ai/profile-explanation endpoint backed by runAiProfileExplanation

- Add runAiProfileExplanation service: validate (aiProfileExplanationRequestSchema),
  create conversation (type 'profile_explanation'), persist user message
  (serialized request without userId), load + render ai_profile_explanation
  template, call Gemini, validate response (aiProfileExplanationResponseSchema),
  persist assistant message with provider/model/promptVersion/safety;
  return responseText/structuredData/safety/conversationId/metadata
- Add postAiProfileExplanation controller (thin wrapper, same shape as
  postAiChat / postAiMenu)
- Register POST /profile-explanation in ai.routes.ts
- Re-export runAiProfileExplanation, AiProfileExplanationServiceResult and
  postAiProfileExplanation from barrels
- No new dependencies, no model/schema/prompt/provider changes
- No real Gemini calls
- Closes the planned set of 4 AI endpoints (chat, menu, profile-explanation,
  plate-analysis)"
```

Sin `git add .`, sin commit, sin push.
