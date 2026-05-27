# feat/ai-plate-analysis-cache — Resumen

## Objetivo

Añadir caché determinista a `runAiPlateAnalysis` para evitar llamadas redundantes a Gemini Vision cuando se envía la misma imagen con los mismos parámetros de contexto.

---

## Por qué plate-analysis necesitaba imageHash

Los endpoints de menú y profile-explanation usan un cache key basado en:
```
SHA256({ systemPrompt, userPrompt, model, promptVersion })
```

Para plate-analysis esto no es suficiente. El endpoint es multimodal: la imagen forma parte de la entrada real de Gemini y determina completamente el resultado. Dos peticiones con idénticos parámetros de contexto (objetivo, calorías, plan) pero imágenes distintas producirían el mismo cache key — y el usuario B recibiría el análisis de la imagen del usuario A.

La solución es incluir `SHA256(imageBuffer)` en el cache key.

---

## Cache key

```
imageHash   = SHA256(imageBuffer)           ← hex, 64 chars
cacheKey    = SHA256({
                systemPrompt,
                userPrompt,
                model,
                promptVersion,
                imageHash
              })                            ← hex, 64 chars
```

### Implementación

Función local en `aiPlateAnalysis.service.ts` (no se modifica `buildCacheKey` de `aiCache.service.ts`):

```typescript
function buildImageBufferHash(imageBuffer: Buffer): string {
  return createHash('sha256').update(imageBuffer).digest('hex');
}

function buildPlateAnalysisCacheKey(params: {
  systemPrompt: string; userPrompt: string;
  model: string; promptVersion: string; imageHash: string;
}): string {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex');
}
```

Se usa `node:crypto` (built-in de Node.js, sin nuevas dependencias).

### Por qué no se extiende `buildCacheKey` existente

`buildCacheKey` en `aiCache.service.ts` está siendo usado por menu y profile-explanation. Modificarlo (aunque sea con campo opcional) introduce riesgo de regresión en esos flujos. Una función local en el propio servicio de plate-analysis es más segura y más explícita sobre la intención.

---

## Flujo HIT / MISS

```
runAiPlateAnalysis(input)
  ↓
  Zod validate (metadata, no imageBuffer)
  ↓
  getDefaultPromptTemplate + buildRenderedPrompt
  ↓
  imageHash = SHA256(input.imageBuffer)
  cacheKey  = SHA256({ systemPrompt, userPrompt, model, promptVersion, imageHash })
  ↓
  tryGetCached(cacheKey)
      │
      ├─ HIT ─────────────────────────────────────────────────────────────
      │   validateAiResponse(aiPlateAnalysisResponseSchema, cachedJson)
      │   usedProvider = 'gemini'
      │   usedModel    = resolvedModel (GEMINI_MODEL env)
      │   cached       = true
      │   rawForPersistence = cachedJson
      │
      └─ MISS ─────────────────────────────────────────────────────────────
          generateGeminiJsonWithImage({ systemPrompt, userPrompt, imageBuffer, mimeType })
          validateAiResponse(aiPlateAnalysisResponseSchema, providerResponse.parsed)
          storeCache({ cacheKey, type:'plate_analysis', inputHash: imageHash, ... })
          usedProvider = providerResponse.metadata.provider
          usedModel    = providerResponse.metadata.model
          cached       = false
          rawForPersistence = providerResponse.parsed
  ↓
  persistAnalysis(analysisId, input, aiResponse, rawForPersistence)   ← siempre
  ↓
  return { ..., metadata.cached }
```

---

## Persistencia en HIT

En cache hit **siempre se crea un nuevo documento `AiPlateAnalysis`** con un `analysisId` fresco (`analysis_<uuid>`).

Razones:
- Trazabilidad por petición: cada llamada queda registrada aunque el resultado venga de caché.
- El campo `rawAiResponse` almacena el JSON cacheado (mismo dato que el MISS original).
- No hay información de `imageBuffer` almacenada nunca (campo `imageStored: false`).

---

## TTL

Mismo mecanismo que menu y profile-explanation:
- Default: 24 horas (`86400` segundos).
- Configurable con `AI_CACHE_TTL_SECONDS` en `.env`.
- Si ≤ 0: entrada permanente (sin `expiresAt`, el índice TTL de Mongo no la borra).
- El caché nunca interrumpe el flujo: errores de `tryGetCached` y `storeCache` se capturan como `console.warn`.

---

## `inputHash` en la entrada de caché

Se almacena `imageHash` (SHA-256 del buffer de imagen) como `inputHash` en `AiCacheEntry`. El `cacheKey` ya es el hash compuesto (imagen + prompts + modelo). Guardar `imageHash` en `inputHash` permite:
- Identificar qué imagen generó la entrada sin almacenar el binario.
- Facilitar futura auditoría o borrado por imagen.

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `docs/feat_ai-plate-analysis-cache_resumen.md` | Este documento |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/modules/ai/services/aiPlateAnalysis.service.ts` | Añadidos `buildImageBufferHash`, `buildPlateAnalysisCacheKey`, flujo HIT/MISS, imports de caché y tipos |

## Archivos NO modificados

- `aiCache.service.ts` — contrato público intacto
- `buildCacheKey` — sin cambios
- `aiChat.service.ts`, `aiMenu.service.ts`, `aiProfileExplanation.service.ts` — intactos
- Controllers, routes, modelos, repositorios, frontend — intactos

---

## Limitaciones conocidas

| Área | Limitación |
|------|-----------|
| Imagen procesada vs original | `imageHash` se calcula sobre el buffer ya procesado por Sharp (resize ≤ 1024 px). La misma imagen en distinta resolución de entrada produce el mismo hash si Sharp la recorta igual. Correcto por diseño — el hash representa la entrada real de Gemini. |
| Imágenes similares pero distintas | No hay deduplicación perceptual (pHash, embedding visual). Dos fotos del mismo plato con distinta iluminación serán dos entradas de caché. |
| Sin invalidación manual | No hay endpoint para borrar entradas de caché por imagen o por usuario. |
| Conversación no persistida | `runAiPlateAnalysis` no crea `AiConversation` + `AiMessage` (comportamiento previo mantenido). Solo persiste `AiPlateAnalysis`. |

---

## Cómo probar manualmente

```bash
# 1. Levantar MongoDB
docker compose up -d mongo

# 2. Arrancar backend
cd backend && npm run dev

# 3. Primera llamada (MISS) — llamará a Gemini
curl -s -X POST http://localhost:3000/api/ai/plate-analysis \
  -F "userId=test-user" \
  -F "objective=maintain" \
  -F "image=@/ruta/a/foto.jpg" | jq .data.metadata

# Esperado: "cached": false

# 4. Segunda llamada con la misma imagen (HIT) — no llama a Gemini
curl -s -X POST http://localhost:3000/api/ai/plate-analysis \
  -F "userId=test-user" \
  -F "objective=maintain" \
  -F "image=@/ruta/a/foto.jpg" | jq .data.metadata

# Esperado: "cached": true, analysisId distinto al del paso 3

# 5. Tercera llamada con imagen diferente (MISS)
curl -s -X POST http://localhost:3000/api/ai/plate-analysis \
  -F "userId=test-user" \
  -F "objective=maintain" \
  -F "image=@/ruta/a/otra_foto.jpg" | jq .data.metadata

# Esperado: "cached": false
```

Verificar en MongoDB:
```js
// En mongo shell o Compass
db.ai_cache_entries.find({ type: 'plate_analysis' }).pretty()
db.ai_plate_analyses.find({}).sort({ createdAt: -1 }).limit(5).pretty()
```

---

## Resultado check / build

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓
```

---

## Qué NO se implementó

- Caché en `runAiChat` (fuera de scope por diseño — chat es conversacional).
- Invalidación manual de caché por usuario o imagen.
- Deduplicación perceptual de imágenes (pHash).
- Paginación de `AiPlateAnalysis` almacenados.
- Tests automatizados (pendiente en `feat/ai-tests`).
