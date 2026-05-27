# Feature: `feat/ai-prompt-templates` — Plantillas de prompts versionadas del módulo IA

> Rama: `feat/ai-prompt-templates`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express + TypeScript (sin llamadas a Gemini todavía)
> Estado: implementado, type-check y build OK, **sin commit ni push**.

---

## 1. Objetivo

Crear las **plantillas de prompts versionadas** (system + user template) del módulo IA en español, listas para:

- ser usadas por el futuro service de Gemini,
- ser cargadas en MongoDB como `AiPromptTemplate` mediante un seed,
- mantener trazabilidad por `promptKey` + `version`.

No se conecta con Gemini, no se crean endpoints, no se ejecuta inferencia.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-prompt-templates`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL ni Sequelize.
- No se modificaron modelos Mongoose, repositorios, schemas Zod ni tipos previos.
- No se crearon routes ni controllers.
- No se llamó a Gemini.
- No se añadieron dependencias.
- Todos los prompts están en **español**.
- La IA se posiciona como **guía educativa**, no como profesional sanitario.

---

## 3. Archivos creados / modificados

**Creados (6):**

```
backend/src/modules/ai/prompts/
├── promptVersions.ts
├── aiChat.prompt.ts
├── aiMenu.prompt.ts
├── aiPlateAnalysis.prompt.ts
├── defaultPromptTemplates.ts
└── index.ts
```

- [promptVersions.ts](../backend/src/modules/ai/prompts/promptVersions.ts) — `AI_*_PROMPT_KEY` y `AI_PROMPT_VERSION = "v1"`.
- [aiChat.prompt.ts](../backend/src/modules/ai/prompts/aiChat.prompt.ts)
- [aiMenu.prompt.ts](../backend/src/modules/ai/prompts/aiMenu.prompt.ts)
- [aiPlateAnalysis.prompt.ts](../backend/src/modules/ai/prompts/aiPlateAnalysis.prompt.ts)
- [defaultPromptTemplates.ts](../backend/src/modules/ai/prompts/defaultPromptTemplates.ts)
- [prompts/index.ts](../backend/src/modules/ai/prompts/index.ts)

**Modificado (1):**

- [backend/src/modules/ai/index.ts](../backend/src/modules/ai/index.ts) — añade `export * from './prompts/index.js'`. Mantiene los exports previos.

---

## 4. Resumen de cada prompt

Todos los prompts:

- están redactados en **español claro y breve**,
- piden devolver **SIEMPRE un JSON válido** con la forma exacta documentada en el system prompt,
- usan placeholders `{{campo}}` que el futuro service rellenará (`message`, `objective`, `caloriesTarget`, `mealsPerDay`, `mimeType`…),
- delegan el formato estructurado en el JSON, y dejan el texto humano en `responseText`.

### 4.1. `aiChat.prompt.ts` — `ai_chat_coach v1`

- **Rol:** asistente educativo conversacional de hábitos saludables.
- **Tono:** claro, empático, breve.
- **Entrada:** `message` + `userContext` opcional (`objective`, `caloriesTarget`, `proteinTarget`, `carbsTarget`, `fatTarget`) + `plan`.
- **Salida JSON:** `responseText`, `structuredData.{recommendations, warnings, followUpQuestions, confidence}`.
- Encaja con `aiChatRequestSchema` / `aiChatResponseSchema`.

### 4.2. `aiMenu.prompt.ts` — `ai_menu_generator v1`

- **Rol:** generador de menú orientativo según objetivo y calorías previamente calculadas por el backend.
- **Reglas de contenido:** alimentos comunes, combinaciones sencillas (proteína + hidratos + verduras + grasa saludable), sin restricciones complejas en MVP salvo lo que venga en `notes`.
- **Entrada:** `objective`, `caloriesTarget`, macros opcionales, `days` (1–7), `mealsPerDay` (1–6), `notes`, `plan`.
- **Salida JSON:** `responseText`, `structuredData.{dailyCalories, days[].meals[], recommendations, warnings}`.
- Restricción clave: `dailyCalories` debe acercarse a `caloriesTarget` (margen ±10%), `days.length = days`, `meals.length = mealsPerDay`.
- Encaja con `aiMenuRequestSchema` / `aiMenuResponseSchema`.

### 4.3. `aiPlateAnalysis.prompt.ts` — `ai_plate_analysis v1`

- **Rol:** análisis aproximado de un plato a partir de imagen.
- **Reglas de contenido:** identificar alimentos visibles; si faltan referencias de tamaño usar `confidence: "low"`; no asumir ingredientes invisibles (salsas, aceites de cocinado); sugerir mejoras de proporción.
- **Entrada:** `imageMetadata.{mimeType,sizeBytes,width,height}` + contexto opcional (`objective`, `caloriesTarget`, `plan`).
- **Salida JSON:** `responseText`, `structuredData.{detectedFoods, estimatedNutrition, proportions, recommendations, warnings, confidence}`.
- Encaja con `aiPlateAnalysisRequestSchema` / `aiPlateAnalysisResponseSchema`.

### 4.4. `defaultPromptTemplates.ts` — seed listo para Mongo

Array `defaultAiPromptTemplates: DefaultAiPromptTemplate[]` con un elemento por prompt. Cada elemento incluye los 8 campos exigidos por el modelo `AiPromptTemplate`:

| Campo | Origen |
|---|---|
| `promptKey` | de `promptVersions.ts` |
| `version` | `AI_PROMPT_VERSION = "v1"` |
| `type` | `AiInteractionType` (`chat`, `menu_generation`, `plate_analysis`) |
| `systemPrompt` | string del archivo de prompt correspondiente |
| `userPromptTemplate` | string del archivo de prompt correspondiente |
| `outputSchema` | objeto descriptivo simple alineado con los schemas Zod |
| `isActive` | `true` para v1 |
| `notes` | apunta al schema Zod que valida la salida |

---

## 5. Cómo encajan con `AiPromptTemplate`

El modelo `AiPromptTemplate` (Mongoose) tiene exactamente estos campos: `promptKey`, `version`, `type`, `systemPrompt`, `userPromptTemplate`, `outputSchema`, `isActive`, `notes` + `timestamps`. La interfaz `DefaultAiPromptTemplate` exportada está alineada uno a uno con esa forma, por lo que un futuro seeder podrá hacer simplemente:

```ts
import { AiPromptTemplate, defaultAiPromptTemplates } from '../modules/ai/index.js';

for (const tpl of defaultAiPromptTemplates) {
  await AiPromptTemplate.updateOne(
    { promptKey: tpl.promptKey, version: tpl.version },
    { $set: tpl },
    { upsert: true },
  );
}
```

El índice único `{ promptKey: 1, version: 1 }` del modelo garantiza la idempotencia del seed.

---

## 6. Límites de seguridad incluidos en todos los prompts

Embebidos en el `systemPrompt` de los tres prompts:

- La IA **no es** médico, dietista-nutricionista clínico ni psicólogo.
- **No** emite diagnósticos, **no** prescribe medicación, **no** diseña dietas terapéuticas.
- Ante mención de **enfermedad, medicación, embarazo, lactancia, TCA o síntomas graves** → recomendar acudir a un profesional sanitario (en `warnings`) y evitar pautas concretas.
- Estimaciones de calorías y macros se presentan como **aproximadas**, no clínicas.
- Para análisis de plato: confianza baja si faltan referencias de tamaño, **no asumir** ingredientes invisibles, **no guardar** la imagen ni inferir datos personales.
- Para menús: en MVP **no se aplican restricciones complejas** (vegano estricto, sin gluten, FODMAP…) salvo lo que llegue explícito en `notes`.
- El JSON de salida obliga a una clave `warnings`, que es el canal para todas las advertencias y derivaciones.

---

## 7. Qué NO se ha implementado (intencional)

- ❌ Llamadas a Gemini / `@google/genai`.
- ❌ Service con renderizado real de los placeholders `{{...}}` (queda para la siguiente rama).
- ❌ Seeder ejecutable que escriba `defaultAiPromptTemplates` en Mongo (queda para la siguiente rama).
- ❌ Endpoints públicos (routes/controllers).
- ❌ RAG, embeddings, vector search.
- ❌ Manejo real del binario de la imagen (multer/sharp).
- ❌ Tests automatizados de prompts.
- ❌ Versiones `v2` u otros experimentos A/B.
- ❌ Cambios en modelos Mongoose, repositorios, schemas Zod, Postgres/Sequelize, Docker, frontend.
- ❌ Dependencias nuevas.

---

## 8. Verificación

```bash
# Type-check
node node_modules/typescript/bin/tsc --noEmit   → CHECK OK   (0 errores)

# Build
node node_modules/typescript/bin/tsc            → BUILD OK   (0 errores)

# git status
On branch feat/ai-prompt-templates
Changes not staged for commit:
  modified:   backend/src/modules/ai/index.ts
Untracked files:
  backend/src/modules/ai/prompts/

# git diff --stat
backend/src/modules/ai/index.ts | 1 +
1 file changed, 1 insertion(+)
```

---

## 9. Siguiente paso recomendado

1. **Seeder de prompts**: script idempotente que recorra `defaultAiPromptTemplates` y haga `upsert` por `{promptKey, version}` sobre `AiPromptTemplate`.
2. **Render utility**: función `renderPromptTemplate(template, vars)` que sustituya los placeholders `{{x}}` con escape y defaults seguros (`"—"` si el valor es `undefined`).
3. **Service de Gemini**: orquestador que carga el template activo, lo renderiza, llama a `@google/genai`, valida la respuesta JSON contra los `*ResponseSchema` y persiste en `AiMessage` + cache.
4. **Tests** unitarios del renderer y de parseo/validación de respuestas IA.

---

## 10. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai/prompts \
        backend/src/modules/ai/index.ts

git commit -m "feat(ai): add versioned Spanish prompt templates for chat, menu and plate analysis

- Add system + user templates for ai_chat_coach, ai_menu_generator, ai_plate_analysis (v1)
- Enforce strict JSON output aligned with existing Zod response schemas
- Include safety limits (no diagnosis, no clinical diets, escalate to healthcare professional)
- Add defaultAiPromptTemplates array ready for an idempotent Mongo seed
- Re-export prompts from the ai module barrel
- No Gemini calls, no seeder, no routes, no embeddings yet"
```
