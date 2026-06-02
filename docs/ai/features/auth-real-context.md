# Feature: Auth real en endpoints IA

## Objetivo

Cerrar el primer hueco de seguridad detectado por la auditoría del módulo IA: todos los endpoints bajo `/api/ai` pasan a estar protegidos con JWT real, y el backend deja de confiar en cualquier `userId` que llegue desde el frontend (body, query o headers). El `userId` se deriva siempre del JWT autenticado.

Regla arquitectónica que rige esta feature:

> NO adaptar el frontend/base P0 al módulo IA.
> SÍ adaptar el módulo IA al frontend/base P0.

El módulo IA se acomoda al contrato de auth de P0 (mismo `localStorage.token`, mismo `Bearer <token>` que el resto de la app). No al revés.

## Estado

- **Rama de documentación:** `docs/ai-current-features`
- **Base funcional:** `integration/full-integration-sanitized`
- **Commits relevantes en la base:**
  - `9494c5f fix(ai): enforce authenticated user across AI endpoints`
  - `c9d68e6 fix(ai): enforce conversation ownership and AI Lab auth`
- **Estado:** implementado y validado
- **Tests backend tras esta feature:** **88/88** (11 ficheros)

## Endpoints protegidos

Todos los endpoints del router IA (`backend/src/modules/ai/routes/ai.routes.ts`) están protegidos con una sola línea al inicio:

```ts
aiRouter.use(authenticate);
```

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/ai/chat` | JWT |
| POST | `/api/ai/menu` | JWT |
| POST | `/api/ai/menu/weekly` | JWT |
| GET | `/api/ai/menu/weekly/:planId` | JWT |
| POST | `/api/ai/profile-explanation` | JWT |
| POST | `/api/ai/plate-analysis` | JWT |
| GET | `/api/ai/conversations/:conversationId` | JWT + ownership |
| GET | `/api/ai/conversations` | JWT |
| POST | `/api/ai/analyze` | JWT (legacy adapter) |
| POST | `/api/ai/analyze-preview` | JWT (legacy adapter) |

El middleware `authenticate` es el mismo que ya usa la API P0, importado vía `../../../middlewares/authenticate.js`.

Una petición sin `Authorization: Bearer <token>` válido devuelve `401` por el middleware antes de tocar ningún controller.

## Reglas de seguridad

- **`userId` siempre sale de `req.auth.sub`** (lo pone el middleware tras verificar el JWT).
- **`body.userId` se ignora** aunque el cliente lo envíe manipulado (p. ej. `"hacker"`). Cada controller hace `{ ...body, userId: String(req.auth!.sub) }` justo antes de invocar al service.
- **`query.userId` se ignora** en los endpoints GET. El listado de conversaciones, por ejemplo, solo usa `String(req.auth!.sub)`.
- **`plate-analysis` ya no usa `anonymous`** ni `legacy_adapter` como fallback. El controller ancla `userId` al JWT.
- **`conversations/:conversationId` valida ownership** a nivel de repositorio: `findConversationByIdAndUser({conversationId, userId})`. Una conversación que existe pero pertenece a otro usuario devuelve `not_found` (mismo código que la inexistente, para no filtrar qué IDs existen).
- **`/analyze` y `/analyze-preview` son adaptadores legacy** que `AIBubble.tsx` y `RegistrarComida.tsx` ya invocaban antes de esta feature. Se han protegido sin tocar el contrato de respuesta ni el frontend.

## Frontend AI Lab

El cliente HTTP del AI Lab (`frontend/src/services/aiApi.ts`) ahora envía `Authorization` en cada llamada:

```ts
function getAuthToken(): string | null {
  try { return localStorage.getItem('token'); } catch { return null; }
}

function withAuth(base: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}
```

`localStorage.getItem('token')` es exactamente el mismo criterio que usa el cliente P0 (`frontend/src/services/api.tsx`), de modo que el login del frontend P0 sirve para autenticar también las llamadas del AI Lab.

Helpers aplicados a los 7 fetches del AI Lab:

| Función | Endpoint | Headers |
|---|---|---|
| `sendAiChatMessage` | POST `/api/ai/chat` | `withAuth({ 'Content-Type': 'application/json' })` |
| `sendAiMenuRequest` | POST `/api/ai/menu` | idem |
| `sendAiProfileExplanation` | POST `/api/ai/profile-explanation` | idem |
| `sendAiWeeklyMenuRequest` | POST `/api/ai/menu/weekly` | idem |
| `sendAiPlateAnalysis` | POST `/api/ai/plate-analysis` (multipart) | `withAuth()` — sin Content-Type para que el navegador añada el boundary |
| `getAiWeeklyMenuPlan` | GET `/api/ai/menu/weekly/:id` | `withAuth()` |
| `getAiConversation` | GET `/api/ai/conversations/:id` | `withAuth()` |

## Qué NO se tocó

Mantener la regla arquitectónica obligó a dejar intactos:

- `frontend/src/components/AIBubble/AIBubble.tsx`
- `frontend/src/pages/RegistrarComida/RegistrarComida.tsx`
- `frontend/src/pages/Profile/Profile.tsx`
- Cualquier otro componente UI de P0
- Contratos de respuesta P0 (`{ success, data }` y `{ analysis: { ... } }` para los legacy adapters)
- El adaptador `buildAiPlateContextFromP0User` (que ya existía y solo se le sigue pasando `req.auth!.sub`)

## Tests

Cobertura añadida en `backend/src/__tests__/ai/`:

- **`aiAuthOverride.controller.test.ts`** (nuevo): por cada uno de los 5 controllers de escritura (chat, menú, profile-explanation, weekly menu, plate-analysis), verifica que `body.userId='hacker'` se reemplaza por `userId='123'` antes de llegar al service. También cubre que JWT subjects distintos producen `userId` distintos (`sub=7 → '7'`, `sub=42 → '42'`) y que `getAiConversation` toma el `userId` del JWT en lugar de cualquier parámetro de URL.
- **`aiConversations.service.test.ts`** (extendido): añade 3 casos de ownership — owner-match devuelve la conversación, otro usuario obtiene `not_found`, `userId` blank lanza `validation_error`.
- **`aiLegacyAnalyze.test.ts`** (ya existente): tras esta feature, los handlers legacy reciben `req.auth.sub = 123` y validan que `runAiPlateAnalysis` recibe `userId: '123'` (no `'legacy_adapter'`).

Resultado tras esta feature: `88/88` tests en 11 ficheros (`npm run lint` y `npm test` en verde).

## Pendientes

Aún por trabajar, en orden recomendado:

- **Smoke real con Gemini** sobre un entorno con `GEMINI_API_KEY` válida para confirmar que la autenticación no rompió el camino feliz end-to-end.
- **Rate limiting** por usuario y por plan (`free` vs `pro`), idealmente delante del `authenticate` para que un token válido siga rate-limited.
- **Prompts activos cargados desde Mongo en runtime** en lugar de las plantillas en memoria (`getDefaultPromptTemplate`).
- **CI mínimo** que ejecute `npm run lint` y `npm test` en cada PR contra `integration/full-integration-sanitized`.
- **Docker demo / producción unificado** con servicio Mongo + servicio API + servicio frontend.
