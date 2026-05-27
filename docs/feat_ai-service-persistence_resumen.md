# Feature: `feat/ai-service-persistence` — Persistencia mínima del flujo de chat IA

> Rama: `feat/ai-service-persistence`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + TypeScript + Mongoose 9 + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit ni push**.

---

## 1. Objetivo

Añadir **persistencia mínima en MongoDB** al flujo interno `runAiChat`, conservando todos los pasos previos (validación, render, llamada al provider, validación de respuesta) y exponiendo el `conversationId` al caller. Sin endpoints públicos.

Esto cierra el hueco que dejaba la feature `feat/ai-service-layer`: ahora cada turno de chat se traduce en una `AiConversation` (creada si no existía) + 2 `AiMessage` (user + assistant) en Mongo.

---

## 2. Reglas respetadas

- No se cambió de rama.
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL/Sequelize, routes/controllers.
- No se modificaron modelos Mongoose, schemas Zod, prompts ni provider.
- No se añadieron dependencias (`crypto.randomUUID()` viene de `node:crypto`).
- No se ejecutaron llamadas reales a Gemini.
- No se implementaron menú, plato, perfil, RAG, embeddings ni cache.

---

## 3. Archivos creados / modificados

**Creados (1):**

- [aiId.service.ts](../backend/src/modules/ai/services/aiId.service.ts) — helpers `generateConversationId()` / `generateMessageId()` con `crypto.randomUUID()` y prefijos `conv_` / `msg_`.

**Modificados (3):**

- [aiServiceError.ts](../backend/src/modules/ai/services/aiServiceError.ts) — añade `'persistence_error'` a `AiServiceErrorCode`.
- [aiChat.service.ts](../backend/src/modules/ai/services/aiChat.service.ts) — reescrito con persistencia + `resolveConversationId` + `mapSafetyForPersistence` + wrapper `persist()`.
- [services/index.ts](../backend/src/modules/ai/services/index.ts) — re-exporta los helpers de IDs.

**No modificados (intencional):**

- `repositories/aiConversation.repository.ts` — ya exponía las 4 funciones requeridas (`createConversation`, `findConversationById`, `addMessage`, `findMessagesByConversation`) y aceptan `Partial<Document>` con los campos que necesitamos.
- Modelos Mongoose — sin cambios.
- Schemas Zod — sin cambios.

**Doc:** [docs/feat_ai-service-persistence_resumen.md](feat_ai-service-persistence_resumen.md).

Sin nuevas dependencias.

---

## 4. Flujo de persistencia del nuevo `runAiChat`

```
input (unknown)
  └─► aiChatRequestSchema.safeParse                              → validation_error
  ▼
  resolveConversationId(request)
    ├─ if request.conversationId:
    │    ├─ findConversationById(id)                              → persistence_error
    │    └─ if not found → createConversation({id, userId, type:'chat', provider:'gemini'})  → persistence_error
    └─ else:
         └─ id = generateConversationId() ; createConversation(...)  → persistence_error
  ▼
  addMessage(user)  { messageId, conversationId, userId, role:'user', content, provider }  → persistence_error
  ▼
  getDefaultPromptTemplate('ai_chat_coach')                       → prompt_not_found
  ▼
  buildRenderedPrompt({systemPrompt, userPromptTemplate, vars})
  ▼
  generateGeminiJson<unknown>({systemPrompt, userPrompt})         → provider_error
  ▼
  validateAiResponse(aiChatResponseSchema, parsed)                → validation_error
  ▼
  addMessage(assistant) {
     messageId, conversationId, userId,
     role:'assistant', content, structuredData,
     provider, model, promptVersion,
     safety: mapSafetyForPersistence(aiResponse.safety)
  }                                                                → persistence_error
  ▼
  AiChatServiceResult { responseText, structuredData, safety, conversationId, metadata }
```

**Nota de side-effect documentada en el código**: si Gemini falla *después* de haber persistido el user message, la conversación y el user message permanecen en Mongo. Es intencional — mirror del comportamiento real de un chat y permite reintentar el turno desde el cliente.

Todas las operaciones de Mongo van envueltas por un helper interno:

```ts
async function persist<T>(action: string, fn: () => Promise<T>, details?): Promise<T>
```

que convierte cualquier excepción en `AiServiceError('persistence_error')` con `cause` y `details` (incluyen `action`, `conversationId`, `userId`, `role` cuando aplica).

---

## 5. Generación de `conversationId` / `messageId`

`backend/src/modules/ai/services/aiId.service.ts`:

```ts
import { randomUUID } from 'node:crypto';

export function generateConversationId(): string { return `conv_${randomUUID()}`; }
export function generateMessageId():      string { return `msg_${randomUUID()}`; }
```

Decisiones:

- **`crypto.randomUUID()` nativo de Node** — sin dependencia `uuid`. Disponible en Node ≥ 14.17, sobrado en este proyecto.
- **Prefijos `conv_` / `msg_`** — facilitan inspección en logs, herramientas de debugging y `grep` sobre dumps de Mongo. No tienen significado funcional.
- Los helpers se exportan desde el barrel de services para que la capa HTTP futura pueda generar IDs sin reimplementar la convención.

---

## 6. Qué guarda en `AiConversation`

Solo en la creación (no se actualiza en cada turno):

| Campo | Valor | Notas |
|---|---|---|
| `conversationId` | provided o generado | `unique` en el modelo. |
| `userId` | `request.userId` | índice simple + compuesto con `createdAt`. |
| `type` | `'chat'` | literal `AiInteractionType`. |
| `provider` | `'gemini'` | default del modelo, explícito aquí para claridad. |
| `title`, `model`, `status`, `metadata` | defaults del modelo | `''`, `''`, `'active'`, `{}`. |
| `createdAt`, `updatedAt` | timestamps automáticos | |

No se guarda el `model` específico en la conversación (cada `AiMessage` ya lo registra). Si el día de mañana se necesita "modelo principal de la conversación" se podrá derivar del último assistant message o añadir un update post-respuesta.

---

## 7. Qué guarda en `AiMessage`

### 7.1. Mensaje user (antes de llamar a Gemini)

| Campo | Valor |
|---|---|
| `messageId` | `msg_<uuid>` |
| `conversationId` | resuelto en este turno |
| `userId` | `request.userId` |
| `role` | `'user'` |
| `content` | `request.message` |
| `provider` | `'gemini'` |
| `tokenUsage`, `costEstimate`, `safety` | defaults del modelo (todo a 0 / blocked:false / reason:'') |

### 7.2. Mensaje assistant (tras validar la respuesta IA)

| Campo | Valor |
|---|---|
| `messageId` | `msg_<uuid>` |
| `conversationId`, `userId`, `role: 'assistant'` | |
| `content` | `aiResponse.responseText` |
| `structuredData` | `aiResponse.structuredData` (Mixed) |
| `provider` | de `providerResponse.metadata.provider` |
| `model` | de `providerResponse.metadata.model` |
| `promptVersion` | de la plantilla cargada (`v1`) |
| `safety` | mapeado por `mapSafetyForPersistence` |
| `tokenUsage`, `costEstimate` | defaults (0) — Gemini SDK 2.4.0 no expone tokens estables; se cableará en otra rama. |

### 7.3. Mapeo de `safety` (Zod → modelo)

El `safety` del schema Zod (`aiSafetySchema`) tiene **forma distinta** al `safety` del modelo:

```
Zod:    { isOutOfScope: boolean, flags: string[], escalationMessage?: string | null }
Mongo:  { blocked: boolean, reason: string }
```

Regla aplicada en `mapSafetyForPersistence`:

- `blocked = safety.isOutOfScope ?? false`
- `reason = safety.escalationMessage || safety.flags.join(', ')`

El objeto Zod completo se mantiene en la respuesta del service para el caller; en BBDD se conserva la versión resumida que ya soporta el modelo sin tocarlo. Si en el futuro se necesita el detalle (array completo de `flags`, distinción `escalationMessage` vs `flags`), bastará con extender el subdocumento `SafetySchema` en `AiMessage.model.ts`.

---

## 8. Errores controlados

| `AiServiceErrorCode` | Cuándo | `details` |
|---|---|---|
| `validation_error` | Request o respuesta IA fallan Zod | `ZodIssue[]` |
| `prompt_not_found` | `promptKey` sin plantilla en defaults | `{ promptKey }` |
| `provider_error` | `AiProviderError` desde Gemini client | `{ providerCode }` |
| `persistence_error` | **nuevo.** Cualquier fallo Mongo (`find`, `create`, `addMessage`) | `{ action, conversationId?, userId?, role? }` |

Todos heredan `Error.cause` para conservar la traza original.

`'conversation_not_found'` **no** se introduce: si llega un `conversationId` que no existe, se crea con ese mismo ID (decisión documentada). Permite que un cliente nuevo defina el ID por su lado sin un round-trip extra.

---

## 9. Qué NO se ha implementado (intencional)

- ❌ **Caché** (`AiCacheEntry`): `metadata.cached` sigue en `false`.
- ❌ **Token usage real** y `costEstimate`: el SDK 2.4.0 no expone tokens de forma estable; se rellenará cuando el provider los devuelva.
- ❌ Carga de plantillas desde Mongo (`getDefaultPromptTemplate` sigue leyendo `defaultAiPromptTemplates`).
- ❌ Services para menú, análisis de plato y explicación de perfil (mismo patrón, otras ramas).
- ❌ Endpoints públicos, middlewares Express, rate limit por plan.
- ❌ Llamadas reales a Gemini.
- ❌ Tests automatizados (mock del provider + `mongodb-memory-server`).
- ❌ Reintentos / circuit breaker.
- ❌ Borrado o expiración de conversaciones (`status: 'archived'`).
- ❌ RAG, embeddings, subida de imágenes.

---

## 10. Verificación check / build

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status:
  modified:   backend/src/modules/ai/services/aiChat.service.ts
  modified:   backend/src/modules/ai/services/aiServiceError.ts
  modified:   backend/src/modules/ai/services/index.ts
  Untracked:  backend/src/modules/ai/services/aiId.service.ts

git diff --stat:
  backend/src/modules/ai/services/aiChat.service.ts | 160 ++++++++++++++++++++--
  backend/src/modules/ai/services/aiServiceError.ts |   3 +-
  backend/src/modules/ai/services/index.ts          |   1 +
  3 files changed, 152 insertions(+), 12 deletions(-)
```

Sin necesidad de levantar Mongo para validar: el check es estático. El flujo real solo puede probarse con `MONGO_URI` apuntando a una instancia accesible (`docker compose up -d mongo` + `cp .env.example .env`), y con `GEMINI_API_KEY` válida cuando se quiera ejercitar el camino completo.

---

## 11. Siguiente paso recomendado

1. **Cache de respuestas IA**: antes de llamar a Gemini, calcular `cacheKey = sha256(systemPrompt + userPrompt + model + promptVersion)` y consultar `AiCacheEntry`. Si hay hit, devolver con `metadata.cached = true` y sin escribir assistant message duplicado (o con un flag). En miss, persistir el resultado con TTL.
2. **Token usage / coste**: cuando el SDK exponga `usageMetadata`, rellenar `tokenUsage` y `costEstimate` antes de `addMessage(assistant)`.
3. **Recuperación de historial**: helper `loadConversationHistory(conversationId, limit)` que devuelva los últimos N mensajes para inyectarlos en el prompt y dar memoria al chat (hoy cada turno es stateless en cuanto a contenido).
4. **Replicar el patrón** en `aiMenu.service.ts` y `aiPlateAnalysis.service.ts`, reutilizando el wrapper `persist()` y los helpers de IDs.
5. **Tests** con `vitest` + `mongodb-memory-server` + mock de `generateGeminiJson` para cubrir los 4 códigos de error.
6. **Capa HTTP**: middleware `validateBody(schema)` + controller que mapee `AiServiceErrorCode` → status (`validation_error → 400`, `prompt_not_found → 500`, `provider_error → 502`, `persistence_error → 500`).

---

## 12. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai/services \
        docs/feat_ai-service-persistence_resumen.md

git commit -m "feat(ai): persist chat turn in Mongo (conversation + user/assistant messages)

- Add aiId.service with generateConversationId/MessageId using crypto.randomUUID
- Add 'persistence_error' to AiServiceErrorCode for Mongo failures
- runAiChat now:
  * resolves the conversation (find by id, create if missing, generate id if absent)
  * persists the user message before calling Gemini
  * persists the assistant message after Zod validation, with provider, model,
    promptVersion, structuredData and mapped safety
  * returns conversationId alongside responseText/structuredData/safety/metadata
- Map Zod safety (isOutOfScope/flags/escalationMessage) -> Mongo safety (blocked/reason)
  without touching the AiMessage model
- Wrap every Mongo call in persist() helper -> AiServiceError('persistence_error')
- Re-export id helpers from services/index
- No cache, no token usage, no routes, no real Gemini calls yet"
```

Sin commit ni push.
