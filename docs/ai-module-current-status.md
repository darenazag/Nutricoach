# Módulo IA — Estado actual

> Rama de integración: `integration/full-integration-sanitized`
> Fecha: 2026-05-26
> Stack: Node.js + Express + TypeScript + Mongoose 9 + Zod + `@google/genai`

---

## Resumen ejecutivo

El módulo IA está **integrado con la base P0** y operativo dentro de NutriCoach. Estado actual:

- **JWT obligatorio en todos los endpoints `/api/ai/*`** (`aiRouter.use(authenticate)`).
- **`userId` se deriva siempre de `req.auth.sub`**; el backend no confía en `userId` que llegue desde body o query del frontend.
- **Ownership real en conversaciones**: una conversación que pertenece a otro usuario devuelve `not_found`, no `forbidden`, para no filtrar qué IDs existen.
- **10 endpoints HTTP** activos (5 escritura, 2 lectura de conversaciones, 2 weekly menu, 2 adaptadores legacy para P0).
- **Legacy adapters** `/api/ai/analyze` y `/api/ai/analyze-preview` siguen sirviendo a `AIBubble.tsx` y `RegistrarComida.tsx` sin tocar el frontend P0.
- **AI Lab del frontend** envía `Authorization: Bearer <token>` desde `aiApi.ts` usando el mismo `localStorage.token` que el cliente P0.
- **Tests backend: 101/101 en 11 ficheros**, lint en verde.

La premisa arquitectónica sigue siendo: el módulo IA se adapta a la base P0, no al revés.

---

## Endpoints actuales

| Método | Ruta | Función | Auth | Notas |
|---|---|---|---|---|
| POST | `/api/ai/chat` | Chat conversacional multi-turno | JWT | userId desde JWT; cache: no |
| POST | `/api/ai/menu` | Generación de menú orientativo (one-shot) | JWT | cache 24 h |
| POST | `/api/ai/menu/weekly` | Generación asíncrona de menú semanal | JWT | 202 + polling |
| GET | `/api/ai/menu/weekly/:planId` | Polling del estado del plan semanal | JWT | — |
| POST | `/api/ai/profile-explanation` | Explicación del perfil nutricional calculado por P0 | JWT | cache 24 h; no recalcula valores |
| POST | `/api/ai/plate-analysis` | Análisis multimodal de plato (imagen → Gemini Vision) | JWT | multipart `image`; cache 24 h con hash de imagen |
| GET | `/api/ai/conversations` | Listado paginado de conversaciones del usuario | JWT | `?page=&limit=` (default 1/10, max 50) |
| GET | `/api/ai/conversations/:conversationId` | Lectura de una conversación + mensajes | JWT + ownership | `not_found` para conversaciones de otro user |
| POST | `/api/ai/analyze` | Adaptador legacy para `AIBubble.tsx` | JWT | mismo contrato `{success,data}`; ahora con auth |
| POST | `/api/ai/analyze-preview` | Adaptador legacy para `RegistrarComida.tsx` | JWT | devuelve `{analysis:{...}}`; reusa `runAiPlateAnalysis` |

Forma de respuesta común:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Excepción: `/api/ai/analyze-preview` mantiene el contrato P0 `{ "analysis": { name, calories, protein, fat, carbs, source } }` para no romper a `RegistrarComida.tsx`.

---

## Seguridad actual

- **`aiRouter.use(authenticate)`** se aplica una vez al inicio de `ai.routes.ts` y cubre todos los endpoints del router. Petición sin Bearer válido → `401` antes de tocar el controller.
- **`req.auth.sub` es la única fuente de `userId`** en cada controller de escritura: `{ ...body, userId: String(req.auth!.sub) }` justo antes de invocar al service.
- **`body.userId` y `query.userId` se ignoran** aunque el cliente los envíe (incluyendo intentos de impersonación tipo `"hacker"`).
- **Ownership en `getAiConversationById`** vía `findConversationByIdAndUser`. La paginación `listAiConversationsForUser` filtra siempre por `{ userId }` en el repository.
- **Adaptadores legacy `/analyze` y `/analyze-preview`** también pasan por `authenticate`. El `userId` se inyecta en el contexto de plate-analysis mediante `buildAiPlateContextFromP0User(req.auth!.sub)`, que enriquece el input con `objective` y `caloriesTarget` leídos del perfil P0 en PostgreSQL.

Detalle de cobertura por endpoint:

| Endpoint | `userId` fuente | Ownership extra |
|---|---|---|
| POST `/chat`, `/menu`, `/menu/weekly`, `/profile-explanation`, `/plate-analysis` | `req.auth.sub` (sobrescribe body) | — |
| GET `/menu/weekly/:planId` | no aplica (lookup por planId) | pendiente refuerzo si surge necesidad |
| GET `/conversations` | `req.auth.sub` (ignora `query.userId`) | filtro `{userId}` en repo |
| GET `/conversations/:conversationId` | `req.auth.sub` | `findConversationByIdAndUser` → cross-user = `not_found` |
| POST `/analyze`, `/analyze-preview` | `req.auth.sub` vía adapter | — |

---

## Integración con P0

- **`AIBubble.tsx`** (cápsula flotante de análisis rápido) consume `POST /api/ai/analyze`. Frontend intacto; solo el backend cambió para autenticar y resolver el contexto.
- **`RegistrarComida.tsx`** consume `POST /api/ai/analyze-preview`. Misma situación: respuesta `{ analysis: {...} }` intacta.
- **`Profile.tsx`** no llama al módulo IA directamente; usa los servicios P0. No se ha tocado.
- **AI Lab (`frontend/src/pages/AiLabPage.tsx`)** consume el resto de endpoints IA a través de `frontend/src/services/aiApi.ts`, que ahora añade `Authorization: Bearer <token>` (vía `withAuth()` helper, leyendo `localStorage.getItem('token')` con el mismo criterio que `services/api.tsx`).
- **`buildAiPlateContextFromP0User(userId)`** lee `Profile` desde PostgreSQL/Sequelize (P0) y devuelve `{ objective, caloriesTarget, plan }` para enriquecer el input de plate-analysis. Tolerante a fallos: si Mongo o Postgres caen, devuelve un contexto mínimo en lugar de tirar la petición.

---

## Conversaciones

### GET `/api/ai/conversations`

Listado paginado de conversaciones del usuario autenticado.

- Query: `?page=1&limit=10`
- Defaults: `page=1`, `limit=10`
- **`limit` máximo: 50.** Pedir más devuelve `validation_error` (no clamping silencioso) para evitar que el cliente crea que recibió la ventana completa.
- Respuesta: `{ items: ConversationDto[], pagination: { page, limit, total, totalPages } }`
- Orden: `updatedAt desc` con `createdAt desc` como tiebreaker.
- Ownership: filtro `{ userId: req.auth.sub }` en el repository. Total cuenta solo del owner.

### GET `/api/ai/conversations/:conversationId`

Lectura de una conversación concreta + sus mensajes.

- Ownership en el repository: `findConversationByIdAndUser`.
- Si la conversación no existe **o** pertenece a otro user → `AiServiceError('not_found')` → HTTP 404. Mismo código para ambos casos para no filtrar existencia.
- Devuelve `{ conversation: ConversationDto, messages: MessageDto[] }` con DTOs limpios (sin `_id`, `__v`, `tokenUsage`, `costEstimate`).

Detalle completo en `docs/ai/features/conversations-pagination.md`.

---

## Estado de tests

- **`npm run lint`** (backend, `tsc --noEmit`): OK, 0 errores.
- **`npm test`** (backend, Vitest): **101/101 tests en 11 ficheros**, ~12 s.
- **Frontend build** validado en la feature anterior de auth: `tsc -b && vite build` OK. Warning de "chunk > 500 kB" no bloqueante (deuda conocida de bundle splitting).
- **`mongodb-memory-server`** se usa para los tests de service que tocan modelos Mongoose.
- **Mock de Gemini** en los tests de provider router y plate-analysis para no consumir cuota real.

Composición de tests (resumen):

| Fichero | Tests |
|---|---|
| `aiAuthOverride.controller.test.ts` | 11 |
| `aiConversations.service.test.ts` | 17 |
| `aiLegacyAnalyze.test.ts` | 9 |
| `aiMenu.service.test.ts` | ~6 |
| `aiPlateAnalysis.service.test.ts` | ~7 |
| `aiProfileExplanation.service.test.ts` | ~5 |
| `aiProviderRouter.service.test.ts` | ~9 |
| `aiWeeklyMenu.service.test.ts` | ~7 |
| `deepseekClient.test.ts` | ~6 |
| `errorHandler.test.ts` | ~5 |
| `nutricoachContext.adapter.test.ts` | 10 |
| **Total** | **101** |

(Conteos aproximados para los ficheros no tocados directamente en las últimas features; el dato firme es el total de 101.)

---

## Pendientes actuales

En orden de impacto operativo:

1. **Rate limiting / control de coste** por usuario y por plan (`free` vs `pro`), idealmente delante de `authenticate` para que un token válido siga rate-limited.
2. **Prompts activos cargados desde Mongo en runtime** en lugar de las plantillas en memoria (`getDefaultPromptTemplate`).
3. **Smoke real con Gemini** sobre un entorno con `GEMINI_API_KEY` válida para confirmar el camino feliz end-to-end tras los cambios de auth.
4. **Docker demo / producción unificado** con servicio Mongo + servicio API + servicio frontend bajo un solo `docker-compose.yml`.
5. **CI mínimo** que ejecute `npm run lint` y `npm test` en cada PR contra `integration/full-integration-sanitized` o `main`.
6. **Documentación raíz**: actualizar `README.md` del repo y `frontend/README.md` para reflejar el módulo IA y el AI Lab.
7. **Posible inconsistencia de `VITE_API_URL`** antes de producción: hoy el frontend lo lee de env, pero el AI Lab y P0 deben apuntar al mismo backend; conviene unificarlo en un solo lugar.
8. **Métricas reales de tokens y coste** por usuario / conversación, expuestas en el dashboard.

### Mantenidos (futuro)

- Cobertura multimodal extendida (audio/video).
- Cache invalidation por evento de cambio de perfil P0 (hoy el TTL hace el trabajo).
- Internacionalización de prompts.

---

## Cómo probar localmente

### 1. Levantar Mongo

```bash
docker compose up -d mongo
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# editar .env: añadir GEMINI_API_KEY real, ajustar MONGO_URI si difiere
npm ci
npm run seed:ai-prompts
npm run dev
```

### 3. Frontend (incluye AI Lab)

```bash
cd frontend
npm ci
npm run dev
# Abrir http://localhost:5173/login → tras hacer login, ir a /ai-lab
```

### 4. Token para curl

Tras hacer login en el frontend, el token queda en `localStorage.token`. Copiarlo y usarlo:

```bash
TOKEN="<bearer token>"

# Listar conversaciones del usuario autenticado
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/ai/conversations?page=1&limit=10" | jq .

# Leer una conversación (ownership: solo si es del user del token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/ai/conversations/<conversationId>" | jq .

# Sin token → 401
curl -i "http://localhost:3000/api/ai/conversations" | head -5
```

---

## Ver también

- `docs/ai/features/auth-real-context.md` — detalle de la feature de auth real y override de `userId`.
- `docs/ai/features/conversations-pagination.md` — detalle del listado paginado.
- `docs/ai-module-architecture.md` — arquitectura interna del módulo (servicios, providers, prompts, cache).
- `docs/ai-module-demo-guide.md` — guion de demo del módulo IA.
