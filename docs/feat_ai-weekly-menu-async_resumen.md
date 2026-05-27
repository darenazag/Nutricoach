# feat/ai-weekly-menu-async — Resumen

## Objetivo

Resolver el problema de truncación y bloqueo de la generación de menú semanal. El endpoint original (`POST /api/ai/menu`) lanza una sola llamada Gemini con 7 días × N comidas → el JSON puede superar los límites del modelo y truncarse silenciosamente, y el HTTP request bloquea hasta que Gemini responde.

**Solución:** arquitectura asíncrona con polling.

- `POST /api/ai/menu/weekly` responde en <200ms con `202 Accepted` y lanza generación en background.
- La generación llama a Gemini **una vez por día** (7 llamadas independientes en serie).
- `GET /api/ai/menu/weekly/:planId` devuelve el progreso y los días ya completados mientras la generación sigue corriendo.

---

## Endpoints nuevos

### POST /api/ai/menu/weekly

**Request body (JSON):**
```json
{
  "userId": "string",
  "objective": "lose_weight | maintain | gain_muscle",
  "caloriesTarget": 2200,
  "proteinTarget": 150,
  "carbsTarget": 220,
  "fatTarget": 70,
  "mealsPerDay": 3,
  "notes": "sin gluten",
  "plan": "free | pro"
}
```

**Response `202 Accepted`:**
```json
{
  "success": true,
  "data": {
    "planId": "plan_<uuid>",
    "status": "generating",
    "totalDays": 7,
    "message": "Generación iniciada. Consulta GET /api/ai/menu/weekly/:planId para el progreso."
  }
}
```

---

### GET /api/ai/menu/weekly/:planId

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "planId": "plan_<uuid>",
    "status": "generating | completed | partial_failed | failed",
    "userId": "...",
    "objective": "maintain",
    "caloriesTarget": 2200,
    "mealsPerDay": 3,
    "totalDays": 7,
    "completedDays": 4,
    "progress": { "completedDays": 4, "totalDays": 7, "percentage": 57 },
    "days": [
      {
        "dayNumber": 1,
        "status": "completed",
        "cached": false,
        "dailyCalories": 2200,
        "meals": [{ "name": "Desayuno", "description": "...", "estimatedCalories": 400, ... }],
        "recommendations": ["..."],
        "warnings": [],
        "errorMessage": ""
      }
    ],
    "usageEstimation": {
      "providerCallsPlanned": 7,
      "providerCallsCompleted": 4,
      "cacheHits": 0,
      "cacheMisses": 4,
      "realTokensAvailable": false
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response `404 Not Found`** si `planId` desconocido:
```json
{ "success": false, "error": { "code": "not_found", "message": "..." } }
```

---

## Archivos creados/modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/src/modules/ai/types/ai.types.ts` | Modificado | Añade `'weekly_menu_generation'` a `AiInteractionType`, `AiObjective`, `AiWeeklyMenuPlanStatus`, `AiWeeklyMenuDayStatus` y sus arrays |
| `backend/src/modules/ai/models/AiWeeklyMenuPlan.model.ts` | Creado | Mongoose model `ai_weekly_menu_plans` |
| `backend/src/modules/ai/models/AiWeeklyMenuDay.model.ts` | Creado | Mongoose model `ai_weekly_menu_days` |
| `backend/src/modules/ai/models/index.ts` | Modificado | Exporta nuevos modelos |
| `backend/src/modules/ai/schemas/aiWeeklyMenu.schema.ts` | Creado | `aiWeeklyMenuRequestSchema` + `aiWeeklyMenuDayGeminiResponseSchema` (extiende `aiMenuResponseSchema`) |
| `backend/src/modules/ai/schemas/index.ts` | Modificado | Exporta nuevos schemas |
| `backend/src/modules/ai/repositories/aiWeeklyMenu.repository.ts` | Creado | 10 funciones de repositorio para plan y día |
| `backend/src/modules/ai/repositories/index.ts` | Modificado | Exporta nuevo repositorio |
| `backend/src/modules/ai/prompts/promptVersions.ts` | Modificado | Añade `AI_WEEKLY_MENU_DAY_PROMPT_KEY` |
| `backend/src/modules/ai/prompts/aiWeeklyMenuDay.prompt.ts` | Creado | System prompt + user prompt template para un día |
| `backend/src/modules/ai/prompts/defaultPromptTemplates.ts` | Modificado | Añade entrada `ai_weekly_menu_day` |
| `backend/src/modules/ai/prompts/index.ts` | Modificado | Exporta nuevo prompt key y template |
| `backend/src/modules/ai/services/aiWeeklyMenu.service.ts` | Creado | Lógica principal: `createWeeklyMenuPlan`, `generateWeeklyMenuPlan`, `getWeeklyMenuPlanById` |
| `backend/src/modules/ai/services/index.ts` | Modificado | Exporta funciones y tipos del nuevo servicio |
| `backend/src/modules/ai/controllers/aiWeeklyMenu.controller.ts` | Creado | `postAiWeeklyMenu` (POST 202) + `getAiWeeklyMenuPlan` (GET 200/404) |
| `backend/src/modules/ai/index.ts` | Modificado | Exporta nuevos controllers |
| `backend/src/modules/ai/routes/ai.routes.ts` | Modificado | Registra `POST /menu/weekly` y `GET /menu/weekly/:planId` (antes de `POST /menu`) |
| `backend/src/__tests__/ai/aiWeeklyMenu.service.test.ts` | Creado | 10 tests (5 describe × 2 it + extras) |

---

## Diseño asíncrono

### `void fn().catch(handler)` en Node.js

```typescript
// En createWeeklyMenuPlan():
void generateWeeklyMenuPlan(planId, req).catch(async (err) => {
  // Solo captura errores fatales que escapan el bucle por-día
  await updatePlanStatus(planId, 'failed', { fatalError: String(err) });
});
// Returns immediately ← Express responde 202
return { planId, status: 'generating', totalDays: 7, message: '...' };
```

- `void` descarta la Promise de la cadena síncrona — Express no la awaita.
- `.catch()` al final previene `UnhandledPromiseRejection`.
- Errores por día están contenidos dentro del bucle `try/catch` en `generateWeeklyMenuPlan`.

### Resiliencia por día

Si el día N falla, los días N+1…7 continúan generándose. Estado final:
- `completed` — todos 7 OK
- `partial_failed` — ≥1 fallido, ≥1 exitoso  
- `failed` — todos fallaron o error fatal

---

## Cache por día

No se modificó `buildCacheKey`. El cache discrimina automáticamente porque:

1. `systemPrompt` contiene `{{dayNumber}}` → diferente por día.
2. `userPrompt` contiene `{{previousDaysSummary}}` (resumen compacto ~80 chars/día × días anteriores) y `{{previousSummaryHash}}` (SHA256 del resumen, 16 chars hex).
3. El objetivo y calorías del usuario están en el prompt → diferente por perfil.

Un segundo plan con los mismos parámetros → HIT completo → 0 llamadas a Gemini.

---

## Token Taximeter — hooks futuros

Hooks identificados, no implementados. Cuando aterrice el módulo de uso:

```typescript
// En generateWeeklyMenuDay(), tras la llamada a Gemini:
const usageMetadata = providerResponse.raw?.usageMetadata;
// → guardar en AiWeeklyMenuDay.tokenUsage (campo a añadir)
// → sumar en AiWeeklyMenuPlan.totalInputTokens / totalOutputTokens
```

`realTokensAvailable: false` en la respuesta GET mientras no esté instrumentado.

---

## Limitaciones conocidas

| Limitación | Estado |
|------------|--------|
| Si el proceso muere, el plan queda en `generating` | Documentado; startup scan futura puede resetear planes stale (>10 min) |
| El cliente debe hacer polling (5–10 s recomendado) | No hay WebSockets en esta feature |
| 7 llamadas Gemini vs 1 | Cache mitiga desde la segunda petición idéntica |
| Token cost real no instrumentado | `realTokensAvailable: false` hasta Taximeter |

---

## Resultados de verificación

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓
npm test       →  38 passed (6 test files, 10 tests nuevos) ✓
```

---

## Comandos para commit (NO ejecutar hasta autorización)

```bash
git add backend/src/modules/ai/types/ai.types.ts
git add backend/src/modules/ai/models/AiWeeklyMenuPlan.model.ts
git add backend/src/modules/ai/models/AiWeeklyMenuDay.model.ts
git add backend/src/modules/ai/models/index.ts
git add backend/src/modules/ai/repositories/aiWeeklyMenu.repository.ts
git add backend/src/modules/ai/repositories/index.ts
git add backend/src/modules/ai/schemas/aiWeeklyMenu.schema.ts
git add backend/src/modules/ai/schemas/index.ts
git add backend/src/modules/ai/prompts/promptVersions.ts
git add backend/src/modules/ai/prompts/aiWeeklyMenuDay.prompt.ts
git add backend/src/modules/ai/prompts/defaultPromptTemplates.ts
git add backend/src/modules/ai/prompts/index.ts
git add backend/src/modules/ai/services/aiWeeklyMenu.service.ts
git add backend/src/modules/ai/services/index.ts
git add backend/src/modules/ai/controllers/aiWeeklyMenu.controller.ts
git add backend/src/modules/ai/index.ts
git add backend/src/modules/ai/routes/ai.routes.ts
git add backend/src/__tests__/ai/aiWeeklyMenu.service.test.ts
git add docs/feat_ai-weekly-menu-async_resumen.md
git commit -m "$(cat <<'EOF'
feat(ai): add async weekly menu generation with per-day Gemini calls and polling

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
