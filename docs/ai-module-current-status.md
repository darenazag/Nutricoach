# Módulo IA — Estado actual

> Rama de integración: `integration/david-ai-stack`
> Fecha: 2025-05-25
> Stack: Node.js + Express + TypeScript (CJS, `module: Node16`) + Mongoose 9 + Zod 4 + `@google/genai`

---

## Resumen ejecutivo

El módulo IA de NutriCoach está **completamente operativo** en su rama de integración. Expone 5 endpoints REST, persiste todas las interacciones en MongoDB, aplica caché determinista para los endpoints de generación one-shot y valida entradas y salidas con Zod. Gemini es el único proveedor implementado. No existe autenticación en los endpoints de IA todavía.

---

## Endpoints actuales

| Método | Ruta | Función | Caché |
|--------|------|---------|-------|
| POST | `/api/ai/chat` | Chat conversacional multi-turno | ❌ No |
| POST | `/api/ai/menu` | Generación de menú orientativo | ✅ 24 h |
| POST | `/api/ai/profile-explanation` | Explicación del perfil nutricional | ✅ 24 h |
| POST | `/api/ai/plate-analysis` | Análisis de imagen de plato | ❌ No |
| GET  | `/api/ai/conversations/:conversationId` | Lectura de conversación + mensajes | — |

Todos responden con la forma:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## Tabla endpoint / servicio / persistencia / caché

| Endpoint | Servicio | Colección principal | Colección auxiliar | Caché |
|----------|----------|--------------------|--------------------|-------|
| POST /chat | `runAiChat` | `ai_conversations` + `ai_messages` | — | No |
| POST /menu | `runAiMenu` | `ai_conversations` + `ai_messages` | `ai_cache_entries` | Sí |
| POST /profile-explanation | `runAiProfileExplanation` | `ai_conversations` + `ai_messages` | `ai_cache_entries` | Sí |
| POST /plate-analysis | `runAiPlateAnalysis` | `ai_plate_analyses` + `ai_conversations` + `ai_messages` | — | No |
| GET /conversations/:id | `getAiConversationById` | `ai_conversations` + `ai_messages` | — | — |

---

## Arquitectura del módulo IA

```
backend/src/modules/ai/
├── index.ts                            ← barrel del módulo
├── types/
│   └── ai.types.ts                     ← enums, union types, interfaces compartidas
├── models/                             ← Mongoose 9 (InferSchemaType)
│   ├── AiConversation.model.ts
│   ├── AiMessage.model.ts
│   ├── AiPromptTemplate.model.ts
│   ├── AiCacheEntry.model.ts
│   └── AiPlateAnalysis.model.ts
├── repositories/
│   ├── aiConversation.repository.ts    ← CRUD conversaciones y mensajes
│   └── aiCache.repository.ts           ← lookup / upsert / hit-tracking
├── schemas/                            ← Zod 4 strict
│   ├── aiChat.schema.ts
│   ├── aiMenu.schema.ts
│   ├── aiPlateAnalysis.schema.ts
│   ├── aiProfileExplanation.schema.ts
│   └── aiSafety.schema.ts              ← shared: isOutOfScope, flags, escalationMessage
├── prompts/
│   ├── aiChat.prompt.ts
│   ├── aiMenu.prompt.ts
│   ├── aiPlateAnalysis.prompt.ts
│   ├── aiProfileExplanation.prompt.ts
│   ├── sharedSafetyRules.prompt.ts     ← reglas de seguridad inyectadas en todos los prompts
│   ├── renderPromptTemplate.ts         ← sustitución de {{placeholders}}
│   ├── defaultPromptTemplates.ts       ← seed ready para Mongo
│   └── promptVersions.ts              ← claves y versiones de los prompts
├── providers/
│   ├── geminiClient.ts                 ← dynamic import de @google/genai (ESM en CJS)
│   └── aiProvider.types.ts
├── services/
│   ├── aiChat.service.ts
│   ├── aiMenu.service.ts
│   ├── aiProfileExplanation.service.ts
│   ├── aiPlateAnalysis.service.ts
│   ├── aiConversations.service.ts      ← read-side
│   ├── aiCache.service.ts
│   ├── aiPrompt.service.ts
│   ├── aiValidation.service.ts
│   ├── aiId.service.ts
│   ├── aiServiceError.ts
│   └── aiResponse.types.ts
├── controllers/
│   ├── aiChat.controller.ts
│   ├── aiMenu.controller.ts
│   ├── aiProfileExplanation.controller.ts
│   ├── aiPlateAnalysis.controller.ts
│   └── aiConversations.controller.ts
├── routes/
│   └── ai.routes.ts
└── seeders/
    └── seedAiPromptTemplates.ts        ← idempotente, npm run seed:ai-prompts
```

---

## Flujo de chat (`POST /api/ai/chat`)

```
req.body → aiChat.controller
  → runAiChat(body)
      1. Zod safeParse (aiChatRequestSchema) → validation_error si falla
      2. resolveConversationId:
           - si req.conversationId existe en Mongo → reusar
           - si no existe → crear conversación con ese id
           - si no se envía → generar nuevo conversationId
      3. persist addMessage (role: 'user')
      4. getDefaultPromptTemplate(AI_CHAT_PROMPT_KEY) ← lee de memoria (seeded)
      5. buildRenderedPrompt → renderiza {{placeholders}}
      6. generateGeminiJson({ systemPrompt, userPrompt }) ← llama a Gemini
      7. validateAiResponse(aiChatResponseSchema, parsed)
      8. persist addMessage (role: 'assistant', con safety, model, promptVersion)
      9. return AiChatServiceResult { responseText, structuredData, safety, conversationId, metadata }
  → res.json({ success: true, data })
```

**Sin caché.** Cada turno llama a Gemini.

---

## Flujo de menú (`POST /api/ai/menu`)

```
req.body → aiMenu.controller
  → runAiMenu(body)
      1. Zod safeParse (aiMenuRequestSchema)
      2. generateConversationId() → persist createConversation (type: 'menu_generation')
      3. persist addMessage (role: 'user', contenido: JSON del request)
      4. getDefaultPromptTemplate + buildRenderedPrompt
      5. buildCacheKey(SHA256 { systemPrompt, userPrompt, model, promptVersion })
      6. tryGetCached(cacheKey):
           HIT  → validateAiResponse contra schema → metadata.cached = true
           MISS → generateGeminiJson → validateAiResponse → storeCache (TTL 24 h)
      7. persist addMessage (role: 'assistant')
      8. return AiMenuServiceResult { ..., metadata.cached }
  → res.json({ success: true, data })
```

---

## Flujo de profile-explanation (`POST /api/ai/profile-explanation`)

Idéntico al flujo de menú. Cache key incluye los campos renderizados del perfil del usuario. `type: 'profile_explanation'` en la conversación.

---

## Flujo de plate-analysis (`POST /api/ai/plate-analysis`)

```
req (multipart/form-data) → handlePlateAnalysis (RequestHandler[])
  [multer] memoryStorage, límite 5 MB, accept jpeg/png/webp
    └── error MulterError → AiServiceError('invalid_image') → 400
  [sharp] leer metadata → resize ≤ 1024 px (mantiene aspect ratio)
  → runAiPlateAnalysis({ imageBuffer, mimeType, userId, ... })
      1. Zod safeParse (aiPlateAnalysisRequestSchema)
      2. generateConversationId() → persist createConversation (type: 'plate_analysis')
      3. persist addMessage (role: 'user')
      4. getDefaultPromptTemplate + buildRenderedPrompt
      5. generateGeminiJsonWithImage({ systemPrompt, userPrompt, imageBuffer, mimeType })
           └── contents = [{ role:'user', parts: [
                 { inlineData: { mimeType, data: base64 } },
                 { text: userPrompt }
               ]}]
      6. validateAiResponse(aiPlateAnalysisResponseSchema, parsed)
      7. persist AiPlateAnalysis (detectedFoods, estimatedNutrition con rangos min/max, proporciones...)
      8. persist addMessage (role: 'assistant')
      9. return AiPlateAnalysisServiceResult { responseText, structuredData, safety, analysisId, metadata }
  → res.json({ success: true, data })
```

**Sin caché** todavía. El hash de la imagen (`sha256(imageBuffer)`) está pendiente de integrar en la cache key.

---

## Flujo de GET conversation (`GET /api/ai/conversations/:conversationId`)

```
req.params.conversationId → aiConversations.controller
  → getAiConversationById(conversationId)
      1. Validar que conversationId no esté vacío → validation_error (400)
      2. findConversationById(conversationId) → si null → AiServiceError('not_found') → 404
      3. findMessagesByConversation(conversationId) → ordenados por createdAt ASC
      4. Mapear a DTOs limpios (sin _id, __v, tokenUsage, costEstimate)
      5. return { conversation, messages }
  → res.json({ success: true, data: { conversation, messages } })
```

---

## Estado de caché

| Endpoint | Caché activa | Clave | TTL por defecto |
|----------|-------------|-------|-----------------|
| chat | No | — | — |
| menu | Sí | SHA256({ systemPrompt, userPrompt, model, promptVersion }) | 24 h |
| profile-explanation | Sí | SHA256({ systemPrompt, userPrompt, model, promptVersion }) | 24 h |
| plate-analysis | No (pendiente) | SHA256 imagen + contexto | — |

**Comportamiento del caché:**
- `tryGetCached`: retorna `null` si no existe o ha expirado. Incrementa `hitCount` (best-effort, non-blocking).
- `storeCache`: upsert. Errores swallowed — el caché nunca interrumpe el flujo de usuario.
- TTL configurable con `AI_CACHE_TTL_SECONDS`. Si ≤ 0, la entrada es permanente (sin `expiresAt`; el índice TTL de Mongo no la borra).

---

## Variables de entorno relevantes

Ver `backend/.env.example` para la lista completa. Las variables del módulo IA:

```env
# Gemini
GEMINI_API_KEY=replace_with_gemini_api_key   ← nunca commitear el valor real
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.4
GEMINI_MAX_OUTPUT_TOKENS=1024

# MongoDB (módulo IA)
MONGO_URI=mongodb://user:pass@localhost:27017/nutricoach_ai?authSource=admin
MONGO_DB=nutricoach_ai

# Caché IA (opcional)
AI_CACHE_TTL_SECONDS=86400   ← por defecto 24 h; 0 = permanente; ausente = 24 h
```

`GEMINI_API_KEY` se lee únicamente desde `process.env`. No está hardcodeada en ningún archivo del repositorio.

---

## Cómo probar localmente

### 1. Levantar dependencias

```bash
docker compose up -d mongo
```

### 2. Preparar entorno backend

```bash
cd backend
cp .env.example .env
# editar .env: añadir GEMINI_API_KEY real, ajustar MONGO_URI si difiere
```

### 3. Sembrar plantillas de prompts

```bash
npm run seed:ai-prompts
```

### 4. Arrancar backend

```bash
npm run dev
```

### 5. Pruebas con curl

```bash
# Chat
curl -s -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","message":"Hola, ¿qué me recomiendas para ganar músculo?","plan":"free"}' | jq .

# Menú
curl -s -X POST http://localhost:3000/api/ai/menu \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","objective":"gain_muscle","caloriesTarget":2800,"plan":"pro"}' | jq .

# Profile explanation
curl -s -X POST http://localhost:3000/api/ai/profile-explanation \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","objective":"lose_weight","caloriesTarget":1800,"plan":"free"}' | jq .

# Plate analysis (imagen real)
curl -s -X POST http://localhost:3000/api/ai/plate-analysis \
  -F "userId=test-user" \
  -F "objective=maintain" \
  -F "image=@/ruta/a/foto.jpg" | jq .

# Leer conversación (usar conversationId devuelto por chat)
curl -s http://localhost:3000/api/ai/conversations/<conversationId> | jq .

# 404 esperado
curl -s http://localhost:3000/api/ai/conversations/no-existe | jq .
```

### 6. AI Dev Lab (frontend)

El frontend incluye una página temporal en `/ai-lab` para probar chat y análisis de plato desde el navegador sin necesidad de curl.

```bash
cd frontend
npm run dev
# Abrir http://localhost:5173/ai-lab
```

---

## Limitaciones actuales

| Área | Limitación |
|------|-----------|
| Autenticación | Los endpoints de IA no requieren JWT. Cualquier cliente puede llamarlos. |
| Paginación | `GET /conversations/:id` devuelve todos los mensajes sin límite. |
| Caché plate-analysis | No implementada todavía. Cada análisis de imagen llama a Gemini. |
| Usuarios reales | Los endpoints aceptan `userId` como string libre. No se valida contra la tabla `users` de PostgreSQL. |
| Rate limiting | No hay rate limiting por usuario ni por IP. |
| Tests | No existe suite de tests automatizados para el módulo IA. |
| Plantillas en Mongo | `getDefaultPromptTemplate` usa las plantillas en memoria (defaults). Las plantillas seedadas en Mongo no se consultan en runtime todavía. |
| Multimodalidad | Solo imagen + texto. No hay soporte de audio ni video. |
| Idioma | Los prompts están en español. No hay soporte multiidioma. |

---

## Próximos pasos recomendados

En orden de menor a mayor riesgo:

1. **`feat/ai-plate-analysis-cache`** — añadir caché a plate-analysis usando `sha256(imageBuffer)` como parte de la cache key (Node.js built-in `crypto`, sin nuevas dependencias).
2. **`feat/ai-tests`** — Vitest + Supertest + `mongodb-memory-server` + mock del proveedor Gemini.
3. **`feat/ai-auth-guard`** — middleware JWT que proteja los endpoints de IA una vez que el módulo de usuarios esté operativo.
4. **`feat/ai-db-schema-alignment`** — alinear el `userId` de los DTOs con la tabla `users` de PostgreSQL (requiere que el módulo de usuarios esté implementado).
5. **`feat/ai-conversations-list`** — `GET /api/ai/conversations?userId=...` con paginación.
6. **`feat/ai-prompt-runtime-mongo`** — hacer que los servicios carguen la plantilla activa desde Mongo en lugar de los defaults en memoria.

---

## Checklist de aceptación del módulo IA

### Infraestructura
- [x] Conexión a MongoDB con `connectMongo()` al arrancar
- [x] 5 modelos Mongoose con índices y TTL definidos
- [x] 2 repositorios para conversaciones/mensajes y caché
- [x] Variables de entorno documentadas en `.env.example`
- [x] `npm run seed:ai-prompts` operativo e idempotente

### Endpoints
- [x] `POST /api/ai/chat` — chat multi-turno, persiste conversación y mensajes
- [x] `POST /api/ai/menu` — generación one-shot con caché
- [x] `POST /api/ai/profile-explanation` — one-shot con caché
- [x] `POST /api/ai/plate-analysis` — multipart/form-data, imagen → Gemini Vision
- [x] `GET /api/ai/conversations/:conversationId` — lectura de conversación y mensajes

### Calidad
- [x] Validación Zod (strict) en todos los endpoints de escritura
- [x] Jerarquía de errores: `AiProviderError` → `AiServiceError` → `errorHandler` → HTTP status correcto
- [x] Reglas de seguridad compartidas (`sharedSafetyRules`) inyectadas en los 4 prompts de escritura
- [x] Campo `safety.isOutOfScope` en todas las respuestas de escritura
- [x] Gestión de imagen: límite 5 MB, tipos jpeg/png/webp, resize ≤ 1024 px
- [x] `GEMINI_API_KEY` nunca hardcodeada
- [x] `tsc --noEmit` y `tsc` en verde

### Pendiente
- [ ] Tests automatizados
- [ ] Autenticación en endpoints de IA
- [ ] Caché en plate-analysis
- [ ] Paginación en lectura de conversaciones
- [ ] Rate limiting
