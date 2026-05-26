# Feature: `feat/ai-service-layer` — Primera capa de servicio del módulo IA

> Rama: `feat/ai-service-layer`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + TypeScript + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit ni push**.

---

## 1. Objetivo

Crear una **primera capa de servicio interna** que orqueste:

- carga de plantilla de prompt,
- renderizado con variables del request,
- llamada al provider Gemini,
- validación Zod del request y de la respuesta,
- exposición de un resultado tipado consumible por la futura capa de controllers.

Solo se implementa el flujo de **chat** en esta feature. Menú, análisis de plato y explicación de perfil seguirán el mismo patrón en features posteriores.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-service-layer`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL/Sequelize, routes/controllers.
- No se ejecutaron llamadas reales a Gemini (sin `GEMINI_API_KEY` y sin orden expresa).
- No se añadieron dependencias.
- No se implementó subida de imágenes, RAG ni embeddings.
- No se modificaron schemas Zod, modelos, repositorios, prompts ni provider.

---

## 3. Archivos creados / modificados

**Creados (4) en `backend/src/modules/ai/services/`:**

- [aiServiceError.ts](../backend/src/modules/ai/services/aiServiceError.ts) — `AiServiceError extends Error` + `AiServiceErrorCode`.
- [aiPrompt.service.ts](../backend/src/modules/ai/services/aiPrompt.service.ts) — `getDefaultPromptTemplate(promptKey)`.
- [aiValidation.service.ts](../backend/src/modules/ai/services/aiValidation.service.ts) — `validateAiResponse<S>(schema, data)`.
- [aiChat.service.ts](../backend/src/modules/ai/services/aiChat.service.ts) — `runAiChat(input)` + `AiChatServiceResult`.

**Modificado (1):**

- [backend/src/modules/ai/services/index.ts](../backend/src/modules/ai/services/index.ts) — añade exports de los 4 nuevos archivos. No exporta `AiSafetyOutput` para evitar colisión con el ya exportado por `schemas/index.ts`.

`backend/src/modules/ai/index.ts` no se tocó: ya hacía `export * from './services/index.js'`.

**Documentación:**

- [docs/feat_ai-service-layer_resumen.md](feat_ai-service-layer_resumen.md) — este documento.

Sin nuevas dependencias.

---

## 4. Flujo interno de `runAiChat(input)`

```
                ┌────────────────────────┐
   input ──►    │  aiChatRequestSchema   │ ── validation_error ─►
                │  (Zod safeParse)       │
                └───────────┬────────────┘
                            │ request: AiChatRequest
                            ▼
                ┌────────────────────────┐
                │ getDefaultPromptTemplate│ ── prompt_not_found ─►
                │ (AI_CHAT_PROMPT_KEY)   │
                └───────────┬────────────┘
                            │ template (systemPrompt, userPromptTemplate, version)
                            ▼
                ┌────────────────────────┐
                │ buildRenderedPrompt    │  (placeholders {{var}})
                └───────────┬────────────┘
                            │ { systemPrompt, userPrompt }
                            ▼
                ┌────────────────────────┐
                │ generateGeminiJson<…>  │ ── provider_error ─►  (wraps AiProviderError)
                └───────────┬────────────┘
                            │ providerResponse.parsed (unknown JSON)
                            ▼
                ┌────────────────────────┐
                │ aiChatResponseSchema   │ ── validation_error ─►
                │ (validateAiResponse)   │
                └───────────┬────────────┘
                            │ aiResponse: AiChatResponse
                            ▼
              AiChatServiceResult { responseText, structuredData, safety, metadata }
```

`AiChatServiceResult` extiende `AiServiceResult<AiChatResponse['structuredData']>` añadiendo `safety: AiChatResponse['safety']`. El `metadata.promptVersion` se toma del template cargado; `provider`, `model`, `cached` vienen del provider.

---

## 5. Qué valida Zod

| Punto | Schema | Si falla |
|---|---|---|
| Entrada del service | `aiChatRequestSchema` (strict) | `AiServiceError('validation_error')` con `issues` en `details`. |
| Respuesta JSON de Gemini | `aiChatResponseSchema` (strict, incluye `safety: aiSafetySchema`) | `AiServiceError('validation_error')` con `issues` en `details`. |

`validateAiResponse<S extends z.ZodTypeAny>(schema, data): z.infer<S>` es genérica: cualquier otro service (menu, plate analysis, profile explanation) puede reusarla sin duplicación.

---

## 6. Cómo usa el prompt renderer

- `buildChatPromptVariables(req)` aplana el request a un `RenderPromptVariables`:
  - `message` directo.
  - `objective`, `caloriesTarget`, `proteinTarget`, `carbsTarget`, `fatTarget` del `userContext` (o `''` si ausentes).
  - `plan` del request (o `''`).
- `buildRenderedPrompt({ systemPrompt, userPromptTemplate, variables })` reemplaza los `{{placeholders}}` y devuelve `{ systemPrompt, userPrompt, missingVariables }`.
- En esta primera versión se ignora `missingVariables`: el renderer ya garantiza que los huecos se sustituyen por string vacío, y el prompt acepta contexto parcial por diseño. Si en el futuro se quiere ser estricto, basta con lanzar `validation_error` cuando `missingVariables.length > 0`.

---

## 7. Cómo usa el Gemini client

- Llama a `generateGeminiJson<unknown>({ systemPrompt, userPrompt })`. El tipo `unknown` es deliberado: la validación auténtica vive en Zod, no en TypeScript.
- No pasa `model`, `temperature` ni `maxOutputTokens` desde aquí: los defaults vienen de `process.env` (`GEMINI_MODEL`, `GEMINI_TEMPERATURE`, `GEMINI_MAX_OUTPUT_TOKENS`) o de los fallbacks internos del provider (`gemini-2.5-flash`, `0.4`, `1024`).
- Captura `AiProviderError` y la re-emite como `AiServiceError('provider_error')` con `details.providerCode` para que la futura capa HTTP pueda mapear: `missing_api_key` / `invalid_response` / `provider_error` / `json_parse_error` → status code apropiado.

---

## 8. Errores controlados

| `AiServiceErrorCode` | Cuándo | Qué incluye `details` |
|---|---|---|
| `validation_error` | El request o la respuesta IA fallan Zod. | `ZodIssue[]` con la lista de violaciones. |
| `prompt_not_found` | No hay plantilla registrada para el `promptKey` pedido. | `{ promptKey }`. |
| `provider_error` | El provider Gemini lanzó `AiProviderError`. | `{ providerCode }`. |

Todos heredan `Error.cause` para conservar la traza original.

---

## 9. Qué NO se ha implementado (intencional)

- ❌ **Persistencia en Mongo** (`AiConversation`, `AiMessage`). La spec lo permitía pero pedía mínimo. Se omite para mantener esta feature pequeña y testeable. Quedará para la siguiente rama, junto con la generación de `conversationId`/`messageId` y el `tokenUsage`.
- ❌ **Cache** (`AiCacheEntry`): la metadata sigue marcando `cached: false` por contrato.
- ❌ **Carga desde Mongo** de plantillas: `getDefaultPromptTemplate` lee solo `defaultAiPromptTemplates`. La integración Mongo-first se hará después.
- ❌ Services de menú, análisis de plato y explicación de perfil. El patrón está aquí; replicarlos será mecánico.
- ❌ Endpoints públicos, middlewares Express, rate limit.
- ❌ Llamadas reales a Gemini.
- ❌ Tests automatizados (próxima rama, con mock del provider).
- ❌ Reintentos / circuit breaker.
- ❌ Subida real de imágenes (multer / sharp).
- ❌ RAG, embeddings.

---

## 10. Verificación check / build

Primera ejecución del check rompió con:

```
src/modules/ai/index.ts(4,1): error TS2308: Module './schemas/index.js' has
already exported a member named 'AiSafetyOutput'. Consider explicitly
re-exporting to resolve the ambiguity.
```

Causa: `services/aiResponse.types.ts` ya exportaba `AiSafetyOutput` y el `schemas/index.ts` también lo exporta. Ambos llegaban al barrel del módulo. Solución: dejar el `AiSafetyOutput` que ya pertenece a la capa de schemas y quitarlo de la lista re-exportada por `services/index.ts`. El símbolo sigue siendo accesible vía `import { AiSafetyOutput } from '../modules/ai/index.js'`.

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status:
  modified:   backend/src/modules/ai/services/index.ts
  Untracked:  backend/src/modules/ai/services/aiChat.service.ts
              backend/src/modules/ai/services/aiPrompt.service.ts
              backend/src/modules/ai/services/aiServiceError.ts
              backend/src/modules/ai/services/aiValidation.service.ts

git diff --stat:
  backend/src/modules/ai/services/index.ts | 11 +++++++++++
  1 file changed, 11 insertions(+)
```

---

## 11. Siguiente paso recomendado

1. **Persistencia mínima**: en `runAiChat`, tras la validación, crear/actualizar `AiConversation` (si `conversationId` no llega, generarlo) y persistir el user message + assistant message en `AiMessage` con `tokenUsage`, `costEstimate`, `safety`.
2. **Cache**: antes de llamar a Gemini, intentar `findCacheByKey(hash(systemPrompt + userPrompt + model))`; tras la llamada, `upsertCacheEntry`. Marcar `metadata.cached = true` en hit.
3. **Servicios análogos** (`runAiMenu`, `runAiPlateAnalysis`, `runAiProfileExplanation`) reutilizando `getDefaultPromptTemplate` + `validateAiResponse`.
4. **Mongo-first lookup** en `aiPrompt.service.ts`: leer la fila activa de `AiPromptTemplate`, caer a `defaultAiPromptTemplates` solo si Mongo no responde o no hay registro activo.
5. **Tests** con `vitest` + mock de `generateGeminiJson` para cubrir los 3 códigos de error sin gastar cuota.
6. **Capa HTTP**: middleware `validateBody(schema)` + controllers que mapeen `AiServiceErrorCode` → HTTP status.

---

## 12. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai/services \
        docs/feat_ai-service-layer_resumen.md

git commit -m "feat(ai): add first internal service layer (chat orchestration)

- Add AiServiceError + AiServiceErrorCode (prompt_not_found | validation_error | provider_error)
- Add aiPrompt.service.getDefaultPromptTemplate using local defaults
- Add aiValidation.service.validateAiResponse<S>(schema, data) generic helper
- Add aiChat.service.runAiChat orchestrating request validation, prompt lookup,
  template render, Gemini call and response Zod validation
- Return AiChatServiceResult with safety + metadata { provider, model, promptVersion, cached }
- Wrap AiProviderError into AiServiceError('provider_error') preserving cause
- Re-export new symbols from services/index; drop AiSafetyOutput re-export to
  avoid collision with schemas/index (TS2308)
- No Mongo persistence, no cache, no real Gemini calls, no routes here"
```

Sin commit ni push.
