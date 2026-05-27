# Provider router — Gemini + DeepSeek

> Estado: **MVP listo**.
> Fecha: 2026-05-27.

---

## Resumen

NutriCoach IA usa **dos proveedores LLM** con asignación por modalidad:

| Modalidad | Provider primario | Fallback | Por qué |
|---|---|---|---|
| Texto (chat, profile-explanation, menu, weekly menu) | **DeepSeek** | Gemini | Coste/token significativamente menor que Gemini |
| Imagen / multimodal (análisis de plato) | **Gemini** | — | DeepSeek no soporta visión multimodal hoy |

El router de proveedor vive en el módulo IA del backend y decide a qué cliente llamar según el tipo de interacción y la configuración de entorno.

---

## Configuración (`.env`)

Variables relevantes (valores reales **fuera del repo**):

```env
# Toggle global de DeepSeek
AI_ENABLE_DEEPSEEK=true

# Proveedor primario para texto
AI_TEXT_PROVIDER=deepseek

# Keys (valores en .env real, NUNCA commiteadas)
DEEPSEEK_API_KEY=
GEMINI_API_KEY=

# Endpoints / modelos (opcionales; defaults razonables)
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=
GEMINI_MODEL=
```

**Para texto con DeepSeek activo se requieren ambos toggles**: `AI_ENABLE_DEEPSEEK=true` **y** `AI_TEXT_PROVIDER=deepseek`. Si falta cualquiera, el router cae a Gemini sin ruido.

**Si `GEMINI_API_KEY` falta** el módulo de plate-analysis devuelve `provider_error` desde `runAiPlateAnalysis`. Documentado como error común en [final-mvp-smoke-test.md](final-mvp-smoke-test.md).

---

## Cuándo cae a Gemini el texto

El fallback no es solo "si DeepSeek tira" — también se dispara cuando DeepSeek responde pero **no pasa validación Zod** del schema esperado por el endpoint. Casos típicos:

- DeepSeek devuelve JSON con campos extra/menos de los esperados.
- DeepSeek omite parte del JSON Schema en menús largos.
- DeepSeek devuelve texto en lugar de JSON cuando el endpoint pide JSON estricto.

El endpoint donde esto se ve con más frecuencia hoy es **`/api/ai/menu/weekly`**, ya que genera 7 días con estructura anidada estricta. Está documentado en [docs/ai-module-current-status.md](../../ai-module-current-status.md#deuda-técnica-pendiente) como deuda técnica (#4 — robustez DeepSeek/JSON).

Para chat y profile-explanation el fallback es raro porque los esquemas son más simples.

---

## Costes / riesgos

| Tema | Detalle |
|---|---|
| **Coste DeepSeek** | Muy bajo por token vs Gemini. Justifica el routing primario a DeepSeek para texto. |
| **Coste Gemini imagen** | El análisis de plato cachea 24 h por hash de imagen + prompt; misma imagen → 0 coste extra. |
| **Coste por fallback** | Si DeepSeek falla y se reintenta con Gemini, se paga la llamada al fallback. En weekly menu esto puede multiplicar el coste hasta que se mejore (#4 de deuda). |
| **Rate limit por user** | **No implementado todavía** (#2 de deuda). Token válido = peticiones sin tope dentro de la cuota del backend. |
| **Métricas reales de tokens** | No expuestas hoy. El campo `realTokensAvailable: false` en `/menu/weekly/:planId` lo refleja. |

---

## Cómo verificar qué provider respondió

Cada respuesta del módulo IA incluye metadata con el proveedor real usado. Dos formas de inspeccionar:

### 1. Desde `/ai-lab` (recomendado para QA técnico)

`/ai-lab` muestra crudo el campo `metadata.provider` y `metadata.model` en cada respuesta. Es la forma rápida de confirmar que DeepSeek está respondiendo (no Gemini fallback).

### 2. Desde `/asistente-ia` (smoke producto)

`/asistente-ia` no expone el provider en UI. Para verificarlo durante una prueba MVP:

```bash
# Tras login, sacar token de localStorage en DevTools:
TOKEN="<bearer token>"

curl -s -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<id>","message":"hola","objective":"maintain","caloriesTarget":2000}' \
  | jq '.data.metadata'
```

Esperado con `AI_TEXT_PROVIDER=deepseek` y `AI_ENABLE_DEEPSEEK=true`:

```json
{
  "provider": "deepseek",
  "model": "deepseek-...",
  "cached": false
}
```

Si ves `"provider": "gemini"` cuando esperabas DeepSeek → revisar las dos variables `.env` y los logs del backend (`[router] DeepSeek failed: ... falling back to Gemini`).

---

## Tests

- **`aiProviderRouter.service.test.ts`** cubre los caminos: DeepSeek activo, DeepSeek desactivado, fallback a Gemini, error fatal, validación Zod fallida.
- **`deepseekClient.test.ts`** cubre el cliente HTTP con mocks (no toca API real).
- **`aiPlateAnalysis.service.test.ts`** cubre el camino multimodal Gemini.

Mocks en `backend/src/__tests__/ai/setup.ts` — Gemini y DeepSeek siempre mockeados en tests.

---

## Ver también

- [docs/ai-module-current-status.md](../../ai-module-current-status.md) — resumen ejecutivo y endpoints.
- [docs/ai-module-architecture.md](../../ai-module-architecture.md) — arquitectura interna del router.
- [docs/ai-api-evaluation.md](../../ai-api-evaluation.md) — evaluación inicial de proveedores.
