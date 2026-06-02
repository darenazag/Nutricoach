# Feature: Listado paginado de conversaciones IA

## Objetivo

Añadir un endpoint para listar las conversaciones IA del usuario autenticado, con paginación y orden por actividad reciente. Es la pieza que permite a un futuro panel "Mis conversaciones" en el AI Lab mostrar el historial sin tener que recordar cada `conversationId`.

Construido sobre la feature previa de auth real (`docs/ai/features/auth-real-context.md`): owner-scoped, ignora cualquier `userId` que venga desde el cliente.

## Estado

- **Rama de documentación:** `docs/ai-current-features`
- **Base funcional:** `integration/full-integration-sanitized`
- **Commit relevante en la base:** `2b801dd feat(ai): add paginated conversation list`
- **Estado:** implementado y validado
- **Tests backend tras esta feature:** **101/101** (11 ficheros)

## Endpoint

```
GET /api/ai/conversations?page=1&limit=10
Headers: Authorization: Bearer <token>
```

Importante: la ruta `GET /conversations` está registrada **antes** que `GET /conversations/:conversationId` en `ai.routes.ts`, para que el path desnudo no se interprete como un id vacío.

## Auth

- JWT **obligatorio** (mismo `authenticate` global del router IA).
- `userId` se toma de `req.auth.sub` y se convierte a string.
- **No** se acepta `userId` desde la query string ni desde el body. Cualquier `?userId=...` se ignora.

## Request query

| Parámetro | Tipo | Default | Restricciones | Comportamiento si inválido |
|---|---|---|---|---|
| `page` | number | `1` | entero >= 1 | `validation_error` (400) |
| `limit` | number | `10` | entero en `[1, 50]` | `validation_error` (400) |

### Estrategia para `limit > 50`

`validation_error` explícito, **sin clamping silencioso**.

Razón: si el servidor devolviera 50 cuando el cliente pidió 100, el cliente creería que recibió la ventana completa y dejaría de paginar. Mejor un error claro que fuerce al cliente a respetar la paginación.

Estrategia equivalente para `page`: `validation_error` si no es entero positivo (incluye `NaN`, decimales, cero o negativos).

## Response

### Caso con resultados

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "conversationId": "conv_xxx",
        "userId": "123",
        "type": "chat",
        "status": "active",
        "provider": "gemini",
        "createdAt": "2026-05-26T18:45:00.000Z",
        "updatedAt": "2026-05-26T18:50:30.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Caso lista vacía

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

- `totalPages = 0` cuando `total = 0` (no se devuelve `totalPages: 1` con `items: []`).
- En cualquier otro caso, `totalPages = ceil(total / limit)`.

### Orden

Los `items` están ordenados por `updatedAt desc` con `createdAt desc` como tiebreaker. Mongoose con `timestamps: true` garantiza que ambos campos existen en cada documento de `AiConversation`.

### Error

Forma JSON estándar del módulo, gestionada por el `errorHandler` global:

```json
{
  "success": false,
  "error": { "code": "validation_error", "message": "..." }
}
```

## Ownership

El flujo enforce ownership en tres capas, cada una sin posibilidad de bypass:

```
controller (aiConversations.controller.listAiConversations)
  └─ userId = String(req.auth!.sub)               ← JWT, NO query.userId
  └─ page, limit ← parseados de req.query con defaults
        ▼
service (aiConversations.service.listAiConversationsForUser)
  └─ valida userId no blank, page entero >= 1,
     limit entero en [1, 50]                       → validation_error si no
        ▼
repository (aiConversation.repository.findConversationsByUserPaginated)
  └─ AiConversation.find({ userId })               ← filtro Mongo
       .sort({ updatedAt: -1, createdAt: -1 })
       .skip((page - 1) * limit)
       .limit(limit)
  └─ AiConversation.countDocuments({ userId })     ← total con el mismo filtro
```

No existe ningún camino en el que un usuario pueda obtener conversaciones de otro:
- El controller no acepta `userId` del cliente.
- El service exige `userId` no vacío.
- El repository **siempre** filtra por `{ userId }` antes de devolver documentos.

## Tests

Cobertura en `backend/src/__tests__/ai/`:

### Service (`aiConversations.service.test.ts`, 10 tests nuevos)

- Devuelve solo conversaciones del owner.
- No incluye conversaciones de otros usuarios en `total`.
- Paginación correcta: `page=1/2/3` con `limit=2` sobre 5 docs, sin solape.
- Orden por `updatedAt desc` (los más recientes primero).
- Lista vacía → `items=[]`, `total=0`, `totalPages=0`.
- `validation_error` cuando `userId` está blank.
- `validation_error` cuando `page < 1`.
- `validation_error` cuando `page` no es entero (`1.5`, `NaN`).
- `validation_error` cuando `limit < 1`.
- `validation_error` cuando `limit > 50` (estrategia REJECT, sin clamping).

### Controller (`aiAuthOverride.controller.test.ts`, 3 tests nuevos)

- `listAiConversations` usa `req.auth.sub` e **ignora** `query.userId='hacker'`; pasa los `{page, limit}` ya parseados.
- Defaults `page=1`, `limit=10` cuando faltan query params.
- JWT subjects distintos producen scopes de ownership distintos.

### Total acumulado

| Antes de la feature | Después de la feature |
|---|---|
| 88/88 en 11 ficheros | **101/101 en 11 ficheros** |

(13 tests nuevos: 10 service + 3 controller.)

## Pendientes

- **Integración UI** del historial en el AI Lab si se decide ofrecerlo a usuario final.
- **Filtros opcionales** (`?type=chat`, `?status=archived`) si aparece la necesidad.
- **Búsqueda full-text** por título o último mensaje (requiere índice de texto en Mongo).
- **Cursor pagination** (en lugar de offset/limit) si el volumen llega a tamaños donde `skip` deje de escalar.
