# feat/ai-plate-analysis-mvp — Resumen técnico

**Rama:** `feat/ai-plate-analysis-mvp`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-22

---

## Objetivo

Crear el endpoint `POST /api/ai/plate-analysis` que acepta una imagen de plato,
la procesa con Gemini Vision, valida la respuesta con Zod y persiste el análisis en MongoDB.
El binario de la imagen nunca se guarda.

---

## Endpoint creado

```
POST /api/ai/plate-analysis
Content-Type: multipart/form-data
```

### Campos del formulario

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `image` | file | Sí | Imagen del plato (jpeg/png/webp, máx. 5 MB) |
| `userId` | string | No | Identificador del usuario (default: `anonymous`) |
| `mealId` | string | No | ID de comida asociada en PostgreSQL |
| `objective` | string | No | `lose_weight` / `maintain` / `gain_muscle` |
| `caloriesTarget` | number | No | Calorías objetivo del usuario |
| `plan` | string | No | `free` / `pro` |

### Límites de imagen

- Formatos aceptados: `image/jpeg`, `image/png`, `image/webp`
- Tamaño máximo: **5 MB**
- Si la imagen supera **1024 px** en cualquier dimensión, se redimensiona automáticamente con Sharp manteniendo proporción
- El binario procesado se envía a Gemini como base64 `inlineData` — nunca se persiste

---

## Respuesta exitosa

```json
{
  "success": true,
  "data": {
    "responseText": "string",
    "structuredData": {
      "detectedFoods": [{ "name": "...", "estimatedQuantity": "...", "confidence": "low|medium|high" }],
      "estimatedNutrition": {
        "caloriesRange": { "min": 400, "max": 600 },
        "proteinRange":  { "min": 20, "max": 35 },
        "carbsRange":    { "min": 50, "max": 70 },
        "fatRange":      { "min": 10, "max": 20 }
      },
      "assumptions": ["string", "..."],
      "confidenceReason": "string",
      "proportions": { "protein": "...", "carbs": "...", "vegetables": "...", "fats": "..." },
      "recommendations": ["string"],
      "warnings": ["string"],
      "confidence": "low|medium|high"
    },
    "safety": {
      "isOutOfScope": false,
      "flags": [],
      "escalationMessage": null
    },
    "metadata": {
      "provider": "gemini",
      "model": "gemini-2.5-flash",
      "promptVersion": "v1",
      "cached": false
    },
    "analysisId": "analysis_<uuid>"
  }
}
```

---

## Flujo interno

```
POST /api/ai/plate-analysis
  → multer (memoryStorage, 5 MB limit, jpeg/png/webp)
  → uploadMiddleware (convierte MulterError → AiServiceError invalid_image)
  → postAiPlateAnalysis controller:
      - sharp: leer metadata (width/height)
      - sharp: resize si > 1024px
      - construir imageMetadata
      - llamar runAiPlateAnalysis(input)
          → aiPlateAnalysisRequestSchema.safeParse (valida metadatos)
          → getDefaultPromptTemplate(AI_PLATE_ANALYSIS_PROMPT_KEY)
          → buildRenderedPrompt (inyecta metadata + objetivo en user prompt)
          → generateGeminiJsonWithImage:
              - base64 del buffer
              - contents: [{ role: 'user', parts: [inlineData, text] }]
              - config: { systemInstruction, responseMimeType: 'application/json' }
              - extrae response.text
              - JSON.parse
          → aiPlateAnalysisResponseSchema.safeParse (valida respuesta)
          → AiPlateAnalysis.create (Mongo)
          → devuelve AiPlateAnalysisServiceResult
  → res.json({ success: true, data: result })
```

---

## Qué guarda Mongo (`ai_plate_analyses`)

| Campo | Descripción |
|---|---|
| `analysisId` | `analysis_<uuid>` generado en el service |
| `userId` | Del body (default: `anonymous`) |
| `mealId` | Del body si existe |
| `imageStored` | Siempre `false` — el binario nunca se guarda |
| `imageMetadata` | mimeType, sizeBytes, width, height (post-resize) |
| `detectedFoods` | Array de alimentos detectados con confianza |
| `estimatedNutrition` | Rangos: caloriesRange, proteinRange, carbsRange, fatRange |
| `assumptions` | Suposiciones del modelo |
| `confidenceReason` | Explicación del nivel de confianza |
| `proportions` | protein, carbs, vegetables, fats |
| `confidence` | Global: low/medium/high |
| `recommendations` | Array de consejos |
| `warnings` | Array de avisos / derivaciones |
| `rawAiResponse` | JSON completo devuelto por Gemini (debug) |

## Qué NO guarda Mongo

- El buffer de imagen original ni el redimensionado.
- El texto base64 enviado a Gemini.
- Tokens de uso (pendiente de que el SDK los exponga).

---

## Cambios en el modelo Mongoose

`EstimatedNutritionSchema` cambió de valores exactos a rangos:

**Antes:** `{ calories, protein, carbs, fat: Number }`
**Después:** `{ caloriesRange, proteinRange, carbsRange, fatRange: { min, max } }`

Nuevos campos añadidos: `assumptions: [String]`, `confidenceReason: String`.

Documentos existentes en la colección retienen la forma antigua (breaking interno, sin migración en MVP).

---

## Errores posibles

| Código | HTTP | Causa |
|---|---|---|
| `invalid_image` | 400 | Sin imagen, tipo no aceptado, o límite superado |
| `validation_error` | 400 | Metadatos inválidos (mimeType, sizeBytes, etc.) |
| `prompt_not_found` | 500 | Template no registrado |
| `provider_error` | 502 | Fallo en la llamada a Gemini |
| `persistence_error` | 500 | Error al escribir en MongoDB |

---

## Ejemplo curl

```bash
curl -X POST http://localhost:3000/api/ai/plate-analysis \
  -F "userId=demo-user" \
  -F "objective=lose_weight" \
  -F "caloriesTarget=1800" \
  -F "plan=free" \
  -F "image=@/ruta/a/plato.jpg"
```

---

## Limitaciones del MVP

- No hay auth real — `userId` es un string libre.
- La imagen se envía completa a Gemini; no se persiste en ningún almacenamiento.
- No hay caché de análisis de platos similares.
- El análisis de alérgenos desde imagen no es fiable — el prompt lo advierte.
- No hay soporte de streaming (la llamada es síncrona).
- Los tokens de uso no se registran todavía (el SDK no los expone en este flujo).

---

## Verificación

```
npm run check   ✓  (0 errores TypeScript)
npm run build   ✓  (0 errores)
```

---

## Siguiente paso recomendado

**Activar la sección de imagen en la AI Dev Lab** (`feat/ai-dev-lab-ui`) añadiendo un
formulario `<input type="file">` que envíe a `POST /api/ai/plate-analysis` con `fetch` y
`FormData`, y muestre los rangos de nutrición y el nivel de confianza.
