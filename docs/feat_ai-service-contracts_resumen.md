# Feature: `feat/ai-service-contracts` — Contratos, DTOs y validaciones Zod del módulo IA

> Rama: `feat/ai-service-contracts`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express + TypeScript + Zod 4
> Estado: implementado, type-check y build OK, **sin commit ni push**.

---

## 1. Objetivo

Definir los **contratos internos**, DTOs y validaciones Zod del módulo IA, **sin** implementar todavía:

- llamadas reales a Gemini,
- services con lógica,
- endpoints públicos,
- RAG ni embeddings reales,
- validación del binario de la imagen.

Esto deja el módulo listo para que la siguiente capa (services + controllers + Gemini) tenga tipos y validadores estables a los que conectarse.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-service-contracts`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL ni Sequelize.
- No se modificaron modelos Mongoose, repositorios ni tipos existentes.
- No se crearon routes, controllers ni services con lógica.
- No se llamó a Gemini.
- No se implementó RAG ni embeddings.
- No se añadieron dependencias (Zod 4.4.3 ya estaba).
- Cambios pequeños, tipados y verificables.

---

## 3. Estructura nueva

```
backend/src/modules/ai/
├── index.ts                      (modificado: +2 líneas de export)
├── schemas/                      (nuevo)
│   ├── aiChat.schema.ts
│   ├── aiMenu.schema.ts
│   ├── aiPlateAnalysis.schema.ts
│   └── index.ts
└── services/                     (nuevo)
    ├── aiResponse.types.ts
    └── index.ts
```

Archivos clave:

- [aiChat.schema.ts](../backend/src/modules/ai/schemas/aiChat.schema.ts)
- [aiMenu.schema.ts](../backend/src/modules/ai/schemas/aiMenu.schema.ts)
- [aiPlateAnalysis.schema.ts](../backend/src/modules/ai/schemas/aiPlateAnalysis.schema.ts)
- [schemas/index.ts](../backend/src/modules/ai/schemas/index.ts)
- [services/aiResponse.types.ts](../backend/src/modules/ai/services/aiResponse.types.ts)
- [services/index.ts](../backend/src/modules/ai/services/index.ts)
- [modules/ai/index.ts](../backend/src/modules/ai/index.ts) (modificado)

---

## 4. Schemas Zod creados

Todos los schemas usan **`.strict()`** (rechazan campos extra), enums tipados (`z.enum`) y mensajes de error mínimos cuando aportan claridad. Los enums de `objective`, `plan` y `confidence` se definen localmente en cada schema para mantener cada archivo autocontenido.

### 4.1. `aiChat.schema.ts`

**Entrada — `aiChatRequestSchema`:**

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | required, min 1 |
| `conversationId` | string | opcional |
| `message` | string | required, 1–4000 chars |
| `userContext` | objeto strict | opcional |
| `userContext.objective` | `"lose_weight" \| "maintain" \| "gain_muscle"` | opcional |
| `userContext.caloriesTarget` | number > 0 | opcional |
| `userContext.proteinTarget` | number ≥ 0 | opcional |
| `userContext.carbsTarget` | number ≥ 0 | opcional |
| `userContext.fatTarget` | number ≥ 0 | opcional |
| `plan` | `"free" \| "pro"` | opcional |

**Salida — `aiChatResponseSchema`:**

```ts
{
  responseText: string,
  structuredData: {
    recommendations: string[],   // default []
    warnings: string[],          // default []
    followUpQuestions: string[], // default []
    confidence: "low" | "medium" | "high"
  }
}
```

### 4.2. `aiMenu.schema.ts`

**Entrada — `aiMenuRequestSchema`:**

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | required |
| `objective` | `"lose_weight" \| "maintain" \| "gain_muscle"` | required |
| `caloriesTarget` | number > 0 | required |
| `proteinTarget` | number ≥ 0 | opcional |
| `carbsTarget` | number ≥ 0 | opcional |
| `fatTarget` | number ≥ 0 | opcional |
| `days` | int 1–7 | opcional |
| `mealsPerDay` | int 1–6 | opcional |
| `notes` | string ≤ 1000 | opcional |
| `plan` | `"free" \| "pro"` | opcional |

**Salida — `aiMenuResponseSchema`:**

```ts
{
  responseText: string,
  structuredData: {
    dailyCalories: number,
    days: Array<{
      day: number,                 // entero ≥ 1
      meals: Array<{
        name: string,
        description: string,
        estimatedCalories: number,
        estimatedProtein: number,
        estimatedCarbs: number,
        estimatedFat: number
      }>
    }>,
    recommendations: string[],     // default []
    warnings: string[]             // default []
  }
}
```

### 4.3. `aiPlateAnalysis.schema.ts`

**Entrada — `aiPlateAnalysisRequestSchema`:**

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | required |
| `mealId` | string | opcional |
| `imageMetadata.mimeType` | string | required, regex `^image/` |
| `imageMetadata.sizeBytes` | int > 0 | required |
| `imageMetadata.width` | int > 0 | opcional |
| `imageMetadata.height` | int > 0 | opcional |
| `objective` | `"lose_weight" \| "maintain" \| "gain_muscle"` | opcional |
| `caloriesTarget` | number > 0 | opcional |
| `plan` | `"free" \| "pro"` | opcional |

> No valida el binario real de la imagen — eso irá en otra rama con `multer` + `sharp`.

**Salida — `aiPlateAnalysisResponseSchema`:**

```ts
{
  responseText: string,
  structuredData: {
    detectedFoods: Array<{
      name: string,
      estimatedQuantity: string,
      confidence: "low" | "medium" | "high"
    }>,
    estimatedNutrition: {
      calories: number,
      protein: number,
      carbs: number,
      fat: number
    },
    proportions: {
      protein: string,
      carbs: string,
      vegetables: string,
      fats: string
    },
    recommendations: string[],   // default []
    warnings: string[],          // default []
    confidence: "low" | "medium" | "high"
  }
}
```

---

## 5. Tipos exportados (`services/aiResponse.types.ts`)

Derivados de los schemas con `z.infer<typeof …>`:

```ts
type AiChatRequest            = z.infer<typeof aiChatRequestSchema>;
type AiChatResponse           = z.infer<typeof aiChatResponseSchema>;
type AiMenuRequest            = z.infer<typeof aiMenuRequestSchema>;
type AiMenuResponse           = z.infer<typeof aiMenuResponseSchema>;
type AiPlateAnalysisRequest   = z.infer<typeof aiPlateAnalysisRequestSchema>;
type AiPlateAnalysisResponse  = z.infer<typeof aiPlateAnalysisResponseSchema>;
```

Más el contenedor genérico:

```ts
interface AiServiceMetadata {
  provider: AiProvider;   // 'gemini' (reusa el tipo del módulo types)
  model: string;
  promptVersion: string;
  cached: boolean;
}

interface AiServiceResult<TStructuredData> {
  responseText: string;
  structuredData: TStructuredData;
  metadata: AiServiceMetadata;
}
```

`AiProvider` se reutiliza desde `../types/index.js`, evitando duplicar el literal `'gemini'`.

---

## 6. Barrel del módulo IA (actualizado)

`backend/src/modules/ai/index.ts`:

```ts
export * from './types/index.js';
export * from './models/index.js';
export * from './schemas/index.js';     // ← nuevo
export * from './services/index.js';    // ← nuevo
export * as repositories from './repositories/index.js';
```

`schemas` y `services` se exportan **planos** (igual que `types` y `models`); `repositories` se mantiene como namespace.

Esto permite importar desde fuera del módulo con:

```ts
import {
  aiChatRequestSchema,
  AiChatRequest,
  AiServiceResult,
} from '../modules/ai/index.js';
```

---

## 7. Verificación

```bash
# Type-check
node node_modules/typescript/bin/tsc --noEmit   → CHECK OK   (0 errores)

# Build
node node_modules/typescript/bin/tsc            → BUILD OK   (0 errores, dist/ generado)

# git status
On branch feat/ai-service-contracts
Changes not staged for commit:
  modified:   backend/src/modules/ai/index.ts
Untracked files:
  backend/src/modules/ai/schemas/
  backend/src/modules/ai/services/

# git diff --stat
backend/src/modules/ai/index.ts | 2 ++
1 file changed, 2 insertions(+)
```

> Nota: los scripts `npm run check` / `npm run build` requieren que `tsc` esté resoluble en PATH. En esta máquina el binario se invocó directamente vía `node`, pero el resultado es idéntico al de los scripts npm.

---

## 8. Qué NO se ha implementado (intencional)

- ❌ Services con lógica real (sin clases, sin orquestación).
- ❌ Endpoints públicos (routes/controllers).
- ❌ Llamadas a `@google/genai` / Gemini.
- ❌ RAG, embeddings reales, vector search.
- ❌ Validación del **binario** de la imagen (queda para la rama con `multer` + `sharp`).
- ❌ Middlewares Express de validación Zod (se introducirán cuando existan routes).
- ❌ Cambios en modelos Mongoose, repositorios, Postgres/Sequelize, Docker, frontend.
- ❌ Cambios en `package.json` / `tsconfig.json`.
- ❌ Nuevas dependencias (Zod 4.4.3 ya estaba instalado).

---

## 9. Próximos pasos sugeridos

1. **Middleware Express** genérico `validateBody(schema)` que use `schema.safeParse(req.body)` y devuelva `400` con los issues si falla.
2. **Services reales** del módulo IA: orquestación de prompt + provider + cache + persistencia, devolviendo `AiServiceResult<TStructuredData>`.
3. **Integración con Gemini** (`@google/genai`) detrás del service, con parseo y validación de la respuesta usando los `*ResponseSchema`.
4. **Controllers y routes** (`POST /api/ai/chat`, `POST /api/ai/menu`, `POST /api/ai/plate-analysis`) consumiendo schemas + services.
5. **Rama paralela** para subida real de imágenes (`multer` + `sharp` + `imageMetadata` extraída desde el binario antes de pasar al schema).
6. **Tests** de schemas Zod: casos válidos, casos límite (caloriesTarget=0, days=8, mimeType inválido), strict mode rechazando campos extra.

---

## 10. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai/schemas \
        backend/src/modules/ai/services \
        backend/src/modules/ai/index.ts

git commit -m "feat(ai): add Zod schemas and service contracts for chat, menu and plate analysis

- Add Zod request/response schemas for aiChat, aiMenu, aiPlateAnalysis (strict)
- Add inferred TS types (AiChatRequest/Response, AiMenuRequest/Response, AiPlateAnalysisRequest/Response)
- Add generic AiServiceResult<TStructuredData> with provider/model/promptVersion/cached metadata
- Re-export schemas and services from the ai module barrel
- No services, controllers, routes, Gemini calls or binary image validation yet"
```
