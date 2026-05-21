# feat/ai-prompt-safety-hardening — Resumen técnico

**Rama:** `feat/ai-prompt-safety-hardening`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-21
**Origen:** Auditoría de prompts que detectó gaps críticos de seguridad y cobertura.

---

## Objetivo

Corregir todos los gaps detectados en la auditoría de prompts:
- Unificar y reforzar los guardarraíles de seguridad médica/alimentaria en los tres prompts existentes.
- Añadir el prompt de explicación de perfil nutricional (`ai_profile_explanation`) que faltaba.
- Añadir el campo `safety` estructurado a todos los schemas de respuesta.
- Cambiar las estimaciones nutricionales en análisis de imagen de valores exactos a rangos.
- Añadir límites de seguridad al schema de petición de menú.

---

## Archivos creados

| Archivo | Descripción |
|---|---|
| `backend/src/modules/ai/prompts/sharedSafetyRules.prompt.ts` | Bloque único de guardarraíles inyectado en todos los system prompts |
| `backend/src/modules/ai/prompts/aiProfileExplanation.prompt.ts` | Nuevo prompt: explicación del perfil nutricional calculado tras onboarding |
| `backend/src/modules/ai/schemas/aiSafety.schema.ts` | Schema Zod para el campo `safety` compartido en todas las respuestas |
| `backend/src/modules/ai/schemas/aiProfileExplanation.schema.ts` | Request y response schemas del nuevo prompt |

## Archivos modificados

| Archivo | Cambio principal |
|---|---|
| `backend/src/modules/ai/prompts/aiChat.prompt.ts` | +SHARED_SAFETY_RULES, +modelo plato 50/25/25, +comportamiento con contexto vacío, +safety en output |
| `backend/src/modules/ai/prompts/aiMenu.prompt.ts` | +SHARED_SAFETY_RULES, +no alcohol, +no garantía alérgenos, +umbral calorías, +safety en output |
| `backend/src/modules/ai/prompts/aiPlateAnalysis.prompt.ts` | +SHARED_SAFETY_RULES, +no alérgenos desde imagen, +no comentarios corporales, +rangos en estimación, +assumptions, +confidenceReason, +safety |
| `backend/src/modules/ai/prompts/defaultPromptTemplates.ts` | +entrada profile_explanation, +safety en output schemas |
| `backend/src/modules/ai/prompts/index.ts` | +nuevas exportaciones |
| `backend/src/modules/ai/prompts/promptVersions.ts` | +AI_PROFILE_EXPLANATION_PROMPT_KEY |
| `backend/src/modules/ai/schemas/aiChat.schema.ts` | +safety field en aiChatResponseSchema |
| `backend/src/modules/ai/schemas/aiMenu.schema.ts` | +safety field, caloriesTarget min 1200 max 4500 |
| `backend/src/modules/ai/schemas/aiPlateAnalysis.schema.ts` | +safety, estimatedNutrition → rangos, +assumptions, +confidenceReason |
| `backend/src/modules/ai/schemas/index.ts` | +aiSafety, +aiProfileExplanation exports |
| `backend/src/modules/ai/services/aiResponse.types.ts` | +AiProfileExplanationRequest/Response, +AiSafetyOutput |
| `backend/src/modules/ai/types/ai.types.ts` | +'profile_explanation' en AiInteractionType y AI_INTERACTION_TYPES |

---

## Gaps corregidos de la auditoría

### Críticos

| Gap | Corrección |
|---|---|
| `aiPlateAnalysis` no prohibía afirmar ausencia de alérgenos | Añadido en SHARED_SAFETY_RULES + instrucción específica en aiPlateAnalysis |
| `aiMenu` sin umbral mínimo de calorías | Schema: min 1200, max 4500. Prompt: fallback a 1600 kcal si valor < 1200 |
| Menores de edad no mencionados en ningún prompt | Añadido en SHARED_SAFETY_RULES → aplica a los 4 prompts |
| `aiChat` sin prohibición de estrategias compensatorias | Añadido en SHARED_SAFETY_RULES |

### Altos

| Gap | Corrección |
|---|---|
| Estimaciones de imagen como punto único | `estimatedNutrition` cambiado a rangos (`caloriesRange`, `proteinRange`, `carbsRange`, `fatRange`) |
| Suplementación no cubierta en ningún prompt | Añadido en SHARED_SAFETY_RULES |
| Cirugía bariátrica no cubierta | Añadido en SHARED_SAFETY_RULES |
| Prompt de perfil nutricional inexistente | Creado `aiProfileExplanation.prompt.ts` y schema completo |
| Sin `isOutOfScope` programático | Campo `safety.isOutOfScope` en todos los schemas de respuesta |

### Medios

| Gap | Corrección |
|---|---|
| `aiPlateAnalysis` sin `assumptions` | Añadido campo en schema y prompt |
| `aiPlateAnalysis` sin `confidenceReason` | Añadido campo en schema y prompt (obligatorio) |
| `aiChat` sin instrucción para contexto vacío | Añadida instrucción explícita en system prompt |
| Modelo de plato 50/25/25 no referenciado en chat | Añadido como marco de referencia educativa |
| Lista de derivación no unificada | SHARED_SAFETY_RULES es la única fuente de verdad para derivaciones |
| `aiMenu` podía incluir alcohol | Prohibición añadida en reglas de contenido |

---

## Nuevo prompt: `ai_profile_explanation`

**Clave:** `ai_profile_explanation`
**Tipo:** `profile_explanation`
**Versión:** `v1`

**Cuándo se usa:** tras el onboarding, cuando el backend ya ha calculado BMR, TDEE, calorías objetivo y macros. Gemini explica esos valores al usuario en lenguaje claro y motivador.

**Variables del userPromptTemplate:**
`{{objective}}`, `{{basalMetabolicRate}}`, `{{totalDailyEnergyExpenditure}}`, `{{caloriesTarget}}`, `{{proteinTarget}}`, `{{carbsTarget}}`, `{{fatTarget}}`, `{{plan}}`

**Output:**
```json
{
  "responseText": "string motivador",
  "structuredData": {
    "explainedMetrics": ["..."],
    "recommendations": ["..."],
    "warnings": ["..."],
    "confidence": "high | medium | low"
  },
  "safety": { "isOutOfScope": false, "flags": [], "escalationMessage": null }
}
```

---

## Cambios en schemas

### `aiSafety.schema.ts` (nuevo — compartido)
```ts
{ isOutOfScope: boolean, flags: string[], escalationMessage: string | null | undefined }
```

### `aiPlateAnalysis` — estimatedNutrition
**Antes:** `{ calories: number, protein: number, carbs: number, fat: number }`
**Después:** `{ caloriesRange: {min, max}, proteinRange: {min, max}, carbsRange: {min, max}, fatRange: {min, max} }`

### `aiMenu` — caloriesTarget
**Antes:** `z.number().positive()`
**Después:** `z.number().min(1200).max(4500)`

### Todos los response schemas
Añadido: `safety: aiSafetySchema`

---

## Breaking changes

| Cambio | Impacto |
|---|---|
| `estimatedNutrition` en plate analysis cambia de estructura | Cualquier código que lea `calories`, `protein`, `carbs`, `fat` como número directo debe migrar a `.caloriesRange.min/.max`, etc. |
| `aiMenuRequestSchema.caloriesTarget` ahora tiene min/max | Peticiones con calorías < 1200 o > 4500 serán rechazadas por Zod |
| Todos los response schemas añaden campo `safety` | Código que construya objetos de respuesta manualmente debe incluir el campo |
| `AiInteractionType` añade `'profile_explanation'` | Compatible hacia atrás — es una ampliación, no un renombre |

Como no existen todavía routes, controllers ni servicios que consuman estos tipos, los breaking changes son actualmente solo de capa de schema/tipos.

---

## Qué NO se implementó

- No se llama a Gemini.
- No se crean routes ni controllers.
- No se modifican modelos Mongoose.
- No se añaden dependencias.
- No se implementa RAG ni embeddings.
- No se implementa el seeder para el nuevo prompt (se hará en rama posterior).
- No se valida el rango de `caloriesTarget` en el prompt de profile explanation con fallback (solo en aiMenu).

---

## Verificación

```
npm run check   ✓  (0 errores TypeScript)
npm run build   ✓  (0 errores, emite dist/)
```

---

## Siguiente paso recomendado

**Rama:** `feat/ai-gemini-service`

Objetivo: crear el servicio que:
1. Toma un `BuildRenderedPromptOutput` del renderer.
2. Lo envía a Gemini con el prompt correcto.
3. Parsea la respuesta JSON.
4. La valida con los schemas Zod correspondientes.
5. Persiste el resultado en MongoDB.
6. Devuelve `AiServiceResult<T>`.
