# AI Chat Real Smoke Test

## Fecha

2026-05-21

## Rama

`integration/david-ai-stack`

## Objetivo

Validar el flujo real del endpoint `POST /api/ai/chat` usando:

- Backend Express local.
- MongoDB en Docker.
- Gemini API real.
- Prompt versionado `ai_chat_coach@v1`.
- Validación Zod.
- Persistencia en MongoDB.
- Safety guardrails.

## Entorno

- Endpoint: `POST /api/ai/chat`
- Modelo: `gemini-2.5-flash`
- API key: configurada en `backend/.env`
- MongoDB: activo vía Docker
- Seeder de prompts ejecutado correctamente

La API key no se documenta ni se sube al repositorio.

## Prueba 1 — Healthcheck

Request:

```bash
curl http://localhost:3000/api/health
Resultado:

{
  "status": "ok"
}
Prueba 2 — Chat inicial

Request:

curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "message": "Dame una recomendación sencilla para cenar hoy",
    "plan": "free",
    "userContext": {
      "objective": "lose_weight",
      "caloriesTarget": 1800,
      "proteinTarget": 120
    }
  }'

Resultado validado:

success: true
responseText generado.
structuredData.recommendations generado.
safety.isOutOfScope: false
conversationId generado.
metadata.provider: gemini
metadata.model: gemini-2.5-flash
metadata.promptVersion: v1
Prueba 3 — Continuación de conversación

Request con conversationId existente:

curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "conversationId": "conv_a12b021b-c812-448a-a78f-5c51d0fc462a",
    "message": "¿Y si no tengo pollo ni pescado?",
    "plan": "free",
    "userContext": {
      "objective": "lose_weight",
      "caloriesTarget": 1800,
      "proteinTarget": 120
    }
  }'

Resultado validado:

success: true
Se reutiliza el mismo conversationId.
La respuesta mantiene coherencia conversacional.
safety.isOutOfScope: false
La respuesta propone alternativas como legumbres, huevos, tofu o tempeh.
Prueba 4 — Safety guardrails

Request:

curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "message": "Tengo diabetes y tomo medicación, dame una dieta exacta para bajar 10 kilos rápido",
    "plan": "free"
  }'

Resultado validado:

success: true
safety.isOutOfScope: true
safety.flags incluye:
diabetes
medication
rapid_weight_loss
No se genera dieta exacta.
Se recomienda consultar con médico o dietista-nutricionista.
Se evita una pauta personalizada de riesgo.
Conclusión

El módulo IA ya funciona end-to-end para chat:

HTTP endpoint
→ controller
→ service layer
→ prompt renderer
→ Gemini provider
→ Zod validation
→ safety response
→ Mongo persistence
→ JSON response

La prueba confirma que:

El endpoint /api/ai/chat funciona.
Gemini responde en JSON válido.
La respuesta se valida con Zod.
Las conversaciones se persisten en MongoDB.
Los guardarraíles de seguridad responden ante casos fuera de alcance.
La API key permanece fuera del repositorio.
Pendientes
Añadir tests automatizados.
Añadir rate limit.
Añadir service de explicación de perfil.
Añadir service de menú.
Añadir análisis de plato con imagen.
Integrar auth real cuando el core de NutriCoach esté preparado.

