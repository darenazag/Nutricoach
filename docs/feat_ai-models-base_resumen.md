# Feature: `feat/ai-models-base` — Persistencia base del módulo IA (MongoDB + Mongoose)

> Rama: `feat/ai-models-base`
> Rama de integración personal: `integration/david-ai-stack`
> Stack: Node.js + Express + TypeScript + Mongoose 9 (MongoDB)
> Estado: implementado, type-check y build OK, **sin commit ni push**.

---

## 1. Objetivo

Crear la persistencia base del módulo IA en MongoDB usando Mongoose, dejando el sistema preparado para:

- conversaciones IA,
- mensajes de chat,
- plantillas/versiones de prompts,
- caché de resultados IA,
- análisis de platos por imagen,
- futura migración a embeddings / vector search.

PostgreSQL + Sequelize seguirá siendo la base principal del producto. MongoDB se usa **solo** para el módulo IA.

---

## 2. Reglas respetadas

- No se cambió de rama.
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL ni Sequelize.
- No se implementaron controllers, routes ni services.
- No se llamó a Gemini.
- No se implementó RAG ni embeddings (solo se dejó hook `futureEmbedding`).
- No se añadieron dependencias nuevas.
- No se guardan imágenes reales en Mongo; solo metadata/resultados.
- Código tipado, simple y compatible con TypeScript actual (Node16 + ESM, imports con `.js`).

---

## 3. Estructura creada

```
backend/src/modules/ai/
├── index.ts
├── types/
│   ├── ai.types.ts
│   └── index.ts
├── models/
│   ├── AiConversation.model.ts
│   ├── AiMessage.model.ts
│   ├── AiPromptTemplate.model.ts
│   ├── AiCacheEntry.model.ts
│   ├── AiPlateAnalysis.model.ts
│   └── index.ts
└── repositories/
    ├── aiConversation.repository.ts
    ├── aiCache.repository.ts
    └── index.ts
```

Archivos clave:

- [ai.types.ts](../backend/src/modules/ai/types/ai.types.ts) — tipos/enums + constantes runtime para los `enum` de Mongoose + interfaces auxiliares.
- [AiConversation.model.ts](../backend/src/modules/ai/models/AiConversation.model.ts)
- [AiMessage.model.ts](../backend/src/modules/ai/models/AiMessage.model.ts)
- [AiPromptTemplate.model.ts](../backend/src/modules/ai/models/AiPromptTemplate.model.ts)
- [AiCacheEntry.model.ts](../backend/src/modules/ai/models/AiCacheEntry.model.ts)
- [AiPlateAnalysis.model.ts](../backend/src/modules/ai/models/AiPlateAnalysis.model.ts)
- [aiConversation.repository.ts](../backend/src/modules/ai/repositories/aiConversation.repository.ts)
- [aiCache.repository.ts](../backend/src/modules/ai/repositories/aiCache.repository.ts)

No se modificó ningún archivo previo (ni `package.json`, ni `tsconfig.json`, ni `config/mongo.ts`).

---

## 4. Tipos y enums (`ai.types.ts`)

```ts
type AiInteractionType = 'chat' | 'menu_generation' | 'plate_analysis';
type AiRole            = 'user' | 'assistant' | 'system';
type AiConfidence      = 'low' | 'medium' | 'high';
type AiProvider        = 'gemini';
type AiPlan            = 'free' | 'pro';
type AiConversationStatus = 'active' | 'archived';
```

Además se exportan **arrays constantes** equivalentes (`AI_INTERACTION_TYPES`, `AI_ROLES`, etc.) para usarlos en los `enum` de Mongoose sin duplicar literales, y se exponen interfaces auxiliares:

- `AiTokenUsage`, `AiCostEstimate`, `AiSafetyInfo`
- `AiDetectedFood`, `AiEstimatedNutrition`, `AiPlateProportions`
- `AiImageMetadata`, `AiFutureEmbedding`

---

## 5. Modelos Mongoose

Todos los modelos usan `timestamps: true` (=> `createdAt` / `updatedAt`), `collection` explícita, y exportan un tipo `XxxDocument` derivado con `InferSchemaType<…>`. Los subdocumentos auxiliares se definen con `_id: false`.

### 5.1. `AiConversation` — `ai_conversations`

Cabecera de una conversación IA (chat, generación de menú, análisis).

| Campo | Tipo | Notas |
|---|---|---|
| `conversationId` | string | `required`, `unique` |
| `userId` | string | `required`, `index` |
| `title` | string | default `''` |
| `type` | `AiInteractionType` | enum, required |
| `provider` | `AiProvider` | default `'gemini'` |
| `model` | string | default `''` |
| `status` | `AiConversationStatus` | default `'active'` |
| `metadata` | `Mixed` | default `{}` |

**Índices:** `conversationId` unique, `userId`, compuesto `{ userId: 1, createdAt: -1 }`.

### 5.2. `AiMessage` — `ai_messages`

Mensajes individuales con rol, contenido, datos estructurados, tokens, coste y safety.

| Campo | Tipo | Notas |
|---|---|---|
| `messageId` | string | `required`, `unique` |
| `conversationId` | string | `required`, `index` |
| `userId` | string | `required`, `index` |
| `role` | `AiRole` | enum, required |
| `content` | string | default `''` |
| `structuredData` | `Mixed` | default `null` |
| `provider` | `AiProvider` | default `'gemini'` |
| `model` | string | default `''` |
| `promptVersion` | string | default `''` |
| `tokenUsage` | subdoc `{ inputTokens, outputTokens, totalTokens }` | defaults 0 |
| `costEstimate` | subdoc `{ amount, currency }` | currency default `'USD'` |
| `safety` | subdoc `{ blocked, reason }` | blocked default `false` |

**Índices:** `messageId` unique, `conversationId`, `userId`, compuestos `{ conversationId: 1, createdAt: 1 }` y `{ userId: 1, createdAt: -1 }`.

### 5.3. `AiPromptTemplate` — `ai_prompt_templates`

Versionado de prompts (system + user template) con `outputSchema` opcional.

| Campo | Tipo | Notas |
|---|---|---|
| `promptKey` | string | required |
| `version` | string | required |
| `type` | `AiInteractionType` | enum, required |
| `systemPrompt` | string | default `''` |
| `userPromptTemplate` | string | default `''` |
| `outputSchema` | `Mixed` | default `null` |
| `isActive` | boolean | default `false` |
| `notes` | string | default `''` |

**Índices:** `{ promptKey: 1, version: 1 }` **unique**, `{ promptKey: 1, isActive: 1 }`.

### 5.4. `AiCacheEntry` — `ai_cache_entries`

Caché de resultados IA por `cacheKey` + `inputHash`, con expiración TTL y contador de hits.

| Campo | Tipo | Notas |
|---|---|---|
| `cacheKey` | string | `required`, `unique` |
| `type` | `AiInteractionType` | enum, required |
| `inputHash` | string | required, index |
| `resultText` | string | default `''` |
| `resultJson` | `Mixed` | default `null` |
| `provider` | `AiProvider` | default `'gemini'` |
| `model` | string | default `''` |
| `promptVersion` | string | default `''` |
| `expiresAt` | Date | opcional |
| `hitCount` | number | default `0` |

**Índices:** `cacheKey` unique, `inputHash`, **TTL** `{ expiresAt: 1, expireAfterSeconds: 0 }`.

> Nota TTL: MongoDB borra el documento cuando `expiresAt` ya pasó. Si el campo es `null/undefined`, el documento **no se borra** — comportamiento documentado del TTL en Mongo, por eso es seguro dejar el campo opcional.

### 5.5. `AiPlateAnalysis` — `ai_plate_analyses`

Resultado del análisis IA de un plato. **No** guarda el binario de la imagen, solo metadata.

| Campo | Tipo | Notas |
|---|---|---|
| `analysisId` | string | `required`, `unique` |
| `userId` | string | `required`, `index` |
| `mealId` | string \| null | opcional |
| `imageStored` | boolean | default `false` |
| `imageMetadata` | subdoc `{ mimeType, sizeBytes, width, height }` | |
| `detectedFoods` | `[{ name, estimatedQuantity, confidence }]` | confidence default `'medium'` |
| `estimatedNutrition` | subdoc `{ calories, protein, carbs, fat }` | defaults 0 |
| `proportions` | subdoc `{ protein, carbs, vegetables, fats }` (strings) | |
| `confidence` | `AiConfidence` | default `'medium'` |
| `recommendations` | string[] | default `[]` |
| `warnings` | string[] | default `[]` |
| `rawAiResponse` | `Mixed` | default `null` |
| `futureEmbedding` | subdoc `{ embedding?: number[], embeddingModel, embeddingVersion }` | hook para vector search |

**Índices:** `analysisId` unique, `userId`, `{ userId: 1, createdAt: -1 }`, `{ mealId: 1 }` con `sparse: true`.

---

## 6. Repositorios

Funciones `async` exportadas (sin clases). Usan los modelos Mongoose directamente. Devuelven objetos planos vía `.lean<T>()` salvo en creaciones puntuales.

### 6.1. `aiConversation.repository.ts`

- `createConversation(data)` — crea una conversación.
- `addMessage(data)` — añade un mensaje a una conversación.
- `findConversationById(conversationId)` — busca por `conversationId`.
- `findMessagesByConversation(conversationId)` — lista mensajes ordenados por `createdAt` asc.

### 6.2. `aiCache.repository.ts`

- `findCacheByKey(cacheKey)` — busca por `cacheKey`.
- `upsertCacheEntry(data)` — upsert por `cacheKey`; inicializa `hitCount` en 0 si es nuevo.
- `incrementCacheHit(cacheKey)` — `$inc` sobre `hitCount`.

---

## 7. Barrels de exportación

- `types/index.ts` → re-exporta `ai.types.js`.
- `models/index.ts` → re-exporta los 5 modelos y sus tipos `Document`.
- `repositories/index.ts` → expone `aiConversationRepository` y `aiCacheRepository` como namespaces.
- `modules/ai/index.ts` → re-exporta `types`, `models` y `repositories` (estos como namespace).

Esto permite importar desde fuera con `import { AiConversation, AiInteractionType } from '../modules/ai/index.js';`.

---

## 8. Verificación

```bash
# Type-check (npm run check)
tsc --noEmit       → 0 errores

# Build (npm run build)
tsc                → 0 errores, dist/ generado

# git status
On branch feat/ai-models-base
Untracked files:
    backend/src/modules/

# git diff --stat
(vacío — no se modificó nada existente)
```

---

## 9. Qué NO se ha implementado (intencionalmente)

- Controllers ni routes (`app.ts` no toca el módulo).
- Services.
- Llamadas a Gemini / `@google/genai`.
- RAG y embeddings reales (solo el subdocumento `futureEmbedding` como hook).
- Vector index (Mongo Atlas Search) — pendiente cuando se aborden embeddings.
- Almacenamiento del binario de imágenes.
- Endpoints públicos.
- Conexión automática a Mongo en arranque — `connectMongo()` existe en `config/mongo.ts` pero no se invoca desde `server.ts` (fuera del scope de esta feature).
- Nuevas dependencias (no se añadió ninguna).
- Cambios en `package.json`, `tsconfig.json`, Docker, Postgres o frontend.

---

## 10. Próximos pasos sugeridos

1. Invocar `connectMongo()` desde `server.ts` antes del `app.listen` (en otra feature).
2. Capa de **services** del módulo IA: orquestación de prompt + provider + cache + persistencia.
3. Integración con `@google/genai` (Gemini) detrás del service.
4. Controllers y routes (`/api/ai/...`).
5. Migración futura a embeddings + vector search (rellenar `futureEmbedding` y añadir Atlas Search index).
6. Tests de repositorios contra Mongo en memoria.

---

## 11. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai
git commit -m "feat(ai): add Mongoose models, types and base repositories for AI module

- Add AiConversation, AiMessage, AiPromptTemplate, AiCacheEntry, AiPlateAnalysis models
- Add shared AI types/enums (interaction type, role, confidence, provider, plan)
- Add minimal repositories for conversations/messages and cache (create, find, upsert, hit)
- Add TTL index on AiCacheEntry.expiresAt and unique/compound indexes per spec
- No controllers, routes, Gemini calls, RAG, embeddings or image storage yet"
```
