# feat/ai-conversations-read-endpoint — Resumen

## Objetivo

Exponer el lado de lectura del almacenamiento de conversaciones IA.
Los endpoints POST (chat, menú, perfil, análisis de plato) persisten datos en MongoDB (`ai_conversations`, `ai_messages`), pero hasta ahora no existía ningún endpoint para recuperarlos. Esta feature cierra ese gap.

---

## Endpoint implementado

```
GET /api/ai/conversations/:conversationId
```

---

## Respuesta 200

```json
{
  "success": true,
  "data": {
    "conversation": {
      "conversationId": "conv_abc123",
      "userId": "user_xyz",
      "type": "chat",
      "status": "active",
      "provider": "gemini",
      "createdAt": "2025-05-25T12:00:00.000Z",
      "updatedAt": "2025-05-25T12:01:00.000Z"
    },
    "messages": [
      {
        "messageId": "msg_001",
        "conversationId": "conv_abc123",
        "userId": "user_xyz",
        "role": "user",
        "content": "¿Qué como si quiero ganar músculo?",
        "structuredData": null,
        "provider": "gemini",
        "model": "gemini-2.5-flash",
        "promptVersion": "1.0.0",
        "safety": { "blocked": false, "reason": "" },
        "createdAt": "2025-05-25T12:00:00.000Z",
        "updatedAt": "2025-05-25T12:00:00.000Z"
      }
    ]
  }
}
```

Los mensajes se devuelven ordenados cronológicamente (`createdAt` ascendente).

---

## Respuesta 404

```json
{
  "success": false,
  "error": {
    "code": "not_found",
    "message": "AI conversation not found."
  }
}
```

Ocurre cuando el `conversationId` no existe en MongoDB.

---

## Flujo interno

```
GET /api/ai/conversations/:conversationId
  ↓
aiConversations.controller.ts
  → getAiConversationById(conversationId)
      ↓
  aiConversations.service.ts
    1. Valida que conversationId no esté vacío (→ AiServiceError 'validation_error' 400)
    2. findConversationById(conversationId) — si null → AiServiceError 'not_found' 404
    3. findMessagesByConversation(conversationId) — ordenados por createdAt ASC
    4. Mapea a DTOs limpios (sin _id, sin __v, sin tokenUsage, sin costEstimate)
    5. Devuelve { conversation, messages }
  ↓
controller → res.json({ success: true, data })
  ↑ errores → next(err) → errorHandler.ts → HTTP status según code
```

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `backend/src/modules/ai/services/aiConversations.service.ts` | Lógica de negocio: busca conversación y mensajes, mapea a DTOs |
| `backend/src/modules/ai/controllers/aiConversations.controller.ts` | Capa HTTP fina: lee param, llama servicio, delega errores |
| `docs/feat_ai-conversations-read-endpoint_resumen.md` | Este documento |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/modules/ai/services/aiServiceError.ts` | Añadido code `'not_found'` a `AiServiceErrorCode` |
| `backend/src/middlewares/errorHandler.ts` | Añadido `not_found: 404` al mapa de status HTTP |
| `backend/src/modules/ai/routes/ai.routes.ts` | Añadida ruta `GET /conversations/:conversationId` |
| `backend/src/modules/ai/services/index.ts` | Re-export de `getAiConversationById` y tipos DTO |
| `backend/src/modules/ai/index.ts` | Re-export de `getAiConversation` controller |

---

## Repositorios reutilizados (sin modificar)

- `aiConversation.repository.ts` → `findConversationById(conversationId)` + `findMessagesByConversation(conversationId)`
- Ambas funciones ya usaban `.lean()` y ordenación correcta.

---

## Errores posibles

| Code | HTTP | Cuándo |
|------|------|--------|
| `validation_error` | 400 | conversationId vacío |
| `not_found` | 404 | conversationId no existe en Mongo |
| `internal_error` | 500 | error de conexión Mongo u otro inesperado |

---

## Curl de prueba

```bash
# 1. Lanza un chat y copia el conversationId de la respuesta
curl -s -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","message":"Hola","plan":"free"}' | jq .data.conversationId

# 2. Recupera la conversación
curl -s http://localhost:3000/api/ai/conversations/<conversationId> | jq .

# 3. Prueba 404
curl -s http://localhost:3000/api/ai/conversations/nonexistent-id | jq .
```

---

## Resultado check / build

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓
```

---

## Limitaciones conocidas

- No hay paginación. Si la conversación tiene muchos mensajes, todos se devuelven en una sola respuesta.
- `tokenUsage` y `costEstimate` no se exponen en el DTO (datos internos de infraestructura).
- Solo busca por `conversationId`. No existe endpoint de listado por `userId`.

---

## Qué NO se implementó (fuera de scope)

- `GET /api/ai/conversations?userId=...` — listado de conversaciones por usuario
- Paginación de mensajes
- Extensión del AI Dev Lab para llamar este endpoint
- Tests (pendiente en `feat/ai-tests`)
