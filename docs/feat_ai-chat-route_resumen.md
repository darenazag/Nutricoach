# Feature: `feat/ai-chat-route` — Primer endpoint HTTP del módulo IA

> Rama: `feat/ai-chat-route`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express 5 + TypeScript + Mongoose 9 + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit ni push**.

---

## 1. Objetivo

Exponer el primer endpoint HTTP del módulo IA — `POST /api/ai/chat` — como wrapper fino sobre `runAiChat(input)`, con manejo global de errores y arranque del servidor que garantiza la conexión a Mongo antes de aceptar tráfico.

Sin autenticación real, sin endpoints de menú / plato / perfil.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-chat-route`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL/Sequelize, schemas Zod, modelos, repositories, prompts, provider ni services.
- No se añadieron dependencias.
- No se ejecutaron llamadas reales a Gemini.
- `GEMINI_API_KEY` se sigue leyendo en backend; nunca aparece en código.

---

## 3. Archivos creados / modificados

**Creados (3):**

- [backend/src/modules/ai/controllers/aiChat.controller.ts](../backend/src/modules/ai/controllers/aiChat.controller.ts) — `postAiChat: RequestHandler`.
- [backend/src/modules/ai/routes/ai.routes.ts](../backend/src/modules/ai/routes/ai.routes.ts) — `aiRouter` con `POST /chat`.
- [backend/src/middlewares/errorHandler.ts](../backend/src/middlewares/errorHandler.ts) — error middleware global.

**Modificados (3):**

- [backend/src/app.ts](../backend/src/app.ts) — monta `aiRouter` en `/api/ai` y registra `errorHandler` al final.
- [backend/src/server.ts](../backend/src/server.ts) — `bootstrap()` que conecta a Mongo antes de `app.listen`; sale con `exit(1)` si falla.
- [backend/src/modules/ai/index.ts](../backend/src/modules/ai/index.ts) — re-exporta `aiRouter` y `postAiChat`.

**Doc:** [docs/feat_ai-chat-route_resumen.md](feat_ai-chat-route_resumen.md).

Sin dependencias nuevas.

---

## 4. Endpoint creado

### `POST /api/ai/chat`

**Headers:** `Content-Type: application/json`

**Body (validado por `aiChatRequestSchema` en el service):**

```jsonc
{
  "userId": "u_demo_123",                 // requerido (string, min 1)
  "conversationId": "conv_xxx",           // opcional; si no existe se crea
  "message": "¿Qué desayuno me recomiendas?", // requerido (1..4000 chars)
  "userContext": {                        // opcional, objeto strict
    "objective": "lose_weight",           // "lose_weight" | "maintain" | "gain_muscle"
    "caloriesTarget": 1800,
    "proteinTarget": 120,
    "carbsTarget": 200,
    "fatTarget": 60
  },
  "plan": "free"                          // opcional: "free" | "pro"
}
```

**Respuesta 200:**

```jsonc
{
  "success": true,
  "data": {
    "responseText": "string",
    "structuredData": {
      "recommendations": ["..."],
      "warnings": ["..."],
      "followUpQuestions": ["..."],
      "confidence": "low" | "medium" | "high"
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

Como side-effects, el handler crea/usa una `AiConversation` y persiste 2 `AiMessage` (`role: 'user'` y `role: 'assistant'`).

---

## 5. Errores posibles

Todos siguen la forma:

```jsonc
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": ...,   // solo si NODE_ENV !== 'production'
    "stack": "..."    // solo si NODE_ENV !== 'production'
  }
}
```

| Origen | `code` | HTTP | Cuándo |
|---|---|---|---|
| service | `validation_error` | **400** | Body inválido (zod issues) o respuesta IA mal formada. |
| service | `prompt_not_found` | 500 | No hay template para `ai_chat_coach`. |
| service | `provider_error` | **502** | Gemini fail (incluye `missing_api_key`, `invalid_response`, `provider_error`, `json_parse_error` vía `details.providerCode`). |
| service | `persistence_error` | 500 | Fallo Mongo en create/find/addMessage. |
| provider (escape) | `missing_api_key` / `invalid_response` / `provider_error` / `json_parse_error` | 502 | Defensivo — el service normalmente los envuelve, pero si llegan crudos también caen aquí. |
| cualquier otro | `internal_error` | 500 | Fallback. Se loguea con `console.error('[errorHandler] …')`. |

`details` (Zod issues, `providerCode`, etc.) y `stack` **solo** se devuelven cuando `NODE_ENV !== 'production'`.

---

## 6. Cambios en `app` y `server`

### `app.ts`

```ts
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.get('/api/health', …);          // ← intacto
app.use('/api/ai', aiRouter);       // ← nuevo

app.use(errorHandler);              // ← LAST, captura todo lo de arriba
```

### `server.ts`

```ts
async function bootstrap(): Promise<void> {
  try {
    await connectMongo();           // requiere MONGO_URI; falla rápido si no
  } catch (err) {
    console.error('[server] Failed to connect to Mongo:', err);
    process.exit(1);
  }
  app.listen(PORT, …);
}
bootstrap();
```

**Implicación importante**: `MONGO_URI` pasa a ser **obligatorio** para arrancar el backend. Sin Mongo no se sirve ningún tráfico, incluido `/api/health`. La razón es que las rutas IA persisten en cada turno; arrancar sin Mongo dejaría `/api/ai/*` roto silenciosamente.

> En `backend/.env.example` ya está el `MONGO_URI` por defecto compatible con el docker compose del repo. Si en una máquina no hay Mongo y solo se quiere build/lint, basta con `npm run check` / `npm run build` (no requieren conexión).

---

## 7. Limitaciones

- **Sin autenticación.** `userId` se toma directamente del body — es **trust-on-client**, válido solo para desarrollo / Postman. La autenticación real (JWT u OAuth Google ya configurado en `.env.example`) se introducirá en otra rama y reemplazará `req.body.userId` por `req.user.id` del middleware.
- **Sin rate limit ni control de plan free/pro.**
- **Sin caché** (cada turno llama a Gemini y persiste 2 mensajes).
- **Sin historial inyectado** en el prompt (el chat es stateless desde la perspectiva del prompt — la `AiConversation` solo guarda mensajes para auditoría).
- **Sin streaming** (`generateContentStream`).
- **Sin token usage real** (`AiMessage.tokenUsage` se queda en defaults).
- **CORS** abierto a `process.env.CLIENT_URL` (puede ser `undefined` en dev → cors lo trata como mismo origen).

---

## 8. Cómo probar SIN Gemini real

El primer chequeo no requiere Mongo ni Gemini:

```bash
cd backend
npm run check     # TypeScript
npm run build     # Genera dist/
```

Para arrancar el servidor y verificar el camino HTTP (sin gastar cuota):

```bash
docker compose up -d mongo
cd backend
cp .env.example .env
# editar MONGO_URI si procede
# NO necesitas GEMINI_API_KEY válida para probar errores
npm run dev
```

En otra terminal:

```bash
# Body inválido → 400 validation_error
curl -i -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{}'

# Body válido pero sin GEMINI_API_KEY → 502 provider_error con providerCode "missing_api_key"
curl -i -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u_demo","message":"hola"}'
```

El segundo curl, aunque devuelva 502, ya habrá creado la `AiConversation` y el `AiMessage` (user) en Mongo — comportamiento documentado en el service (side-effect intencional).

---

## 9. Cómo probar CON `GEMINI_API_KEY`

> ⚠️ **Consume cuota de pago. No ejecutar sin permiso explícito.**

```bash
docker compose up -d mongo
cd backend
cp .env.example .env
# editar MONGO_URI si procede
# rellenar GEMINI_API_KEY con una clave válida
npm run dev
```

```bash
curl -i -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
        "userId": "u_demo_123",
        "message": "¿Qué desayuno me recomiendas si entreno por la mañana?",
        "userContext": {
          "objective": "lose_weight",
          "caloriesTarget": 1800,
          "proteinTarget": 120,
          "carbsTarget": 200,
          "fatTarget": 60
        },
        "plan": "free"
      }'
```

Esperado: 200 con `data.responseText` no vacío y `data.metadata.model = "gemini-2.5-flash"`. Para conversaciones encadenadas, repetir reusando `data.conversationId`.

Inspeccionar Mongo:

```js
use nutricoach_ai
db.ai_conversations.find().sort({createdAt:-1}).limit(5)
db.ai_messages.find({conversationId: "conv_<uuid>"}).sort({createdAt:1})
```

---

## 10. Qué NO se ha implementado (intencional)

- ❌ Auth real (JWT / Google OAuth). `userId` se toma del body.
- ❌ Endpoints de `/menu`, `/plate-analysis`, `/profile-explanation`.
- ❌ Middleware de validación Zod en la ruta (la validación vive en el service; el controller es deliberadamente fino).
- ❌ Rate limit, diferenciación free/pro, retry/backoff.
- ❌ Caché (`AiCacheEntry`).
- ❌ Token usage real / coste.
- ❌ Streaming (`generateContentStream`).
- ❌ Subida de imágenes (multer/sharp).
- ❌ RAG, embeddings, vector search.
- ❌ Tests automatizados (vitest + supertest + mock provider + `mongodb-memory-server`).
- ❌ Dependencias nuevas.
- ❌ Cambios en frontend, Docker, Postgres, schemas Zod, modelos, prompts, provider.

**Aviso lateral**: en el repo hay un archivo untracked con nombre extraño `ist chat conversations and messages` (parece un fichero generado por el shell o copy-paste accidental). No se ha tocado — decisión del usuario.

---

## 11. Verificación check / build

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status:
  modified:   backend/src/app.ts
  modified:   backend/src/modules/ai/index.ts
  modified:   backend/src/server.ts
  Untracked:  backend/src/middlewares/
              backend/src/modules/ai/controllers/
              backend/src/modules/ai/routes/

git diff --stat:
  backend/src/app.ts              |  7 +++++++
  backend/src/modules/ai/index.ts |  2 ++
  backend/src/server.ts           | 29 ++++++++++++++++++++++++++---
  3 files changed, 35 insertions(+), 3 deletions(-)
```

---

## 12. Siguiente paso recomendado

1. **Tests HTTP** con `vitest` + `supertest` + mock de `runAiChat`, cubriendo: 200, 400 (body inválido), 502 (`provider_error` y `missing_api_key`), 500 (`persistence_error`).
2. **Auth middleware** que ponga `req.user.id` y eliminar `userId` del body de las rutas IA.
3. **Endpoints hermanos**: `POST /api/ai/menu`, `POST /api/ai/plate-analysis`, `POST /api/ai/profile-explanation` siguiendo el mismo patrón.
4. **GET `/api/ai/conversations/:id`** que use `findMessagesByConversation` para devolver el historial.
5. **Rate limit** (`express-rate-limit` u otro — añadir dependencia en su propia rama) diferenciando free/pro.
6. **Logging estructurado** (pino) para reemplazar el `console.error` del errorHandler.

---

## 13. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/middlewares \
        backend/src/modules/ai/controllers \
        backend/src/modules/ai/routes \
        backend/src/modules/ai/index.ts \
        backend/src/app.ts \
        backend/src/server.ts \
        docs/feat_ai-chat-route_resumen.md

git commit -m "feat(ai): add POST /api/ai/chat endpoint backed by runAiChat

- Add aiChat.controller.postAiChat as a thin wrapper around runAiChat
- Add aiRouter with POST /chat, mounted at /api/ai in app.ts
- Add global errorHandler middleware mapping AiServiceError codes to HTTP:
  validation_error -> 400, prompt_not_found -> 500, provider_error -> 502,
  persistence_error -> 500; AiProviderError -> 502 as defensive fallback;
  details/stack only in non-production
- Connect Mongo in server.ts via bootstrap() before app.listen; exit(1) on failure
- Re-export aiRouter and postAiChat from the ai module barrel
- No auth, no rate limit, no menu/plate/profile routes yet
- No real Gemini calls"
```

Sin commit ni push.
