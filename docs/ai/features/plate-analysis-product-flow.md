# RegistrarComida — flujo de análisis de plato (producto)

> Estado: **MVP listo**.
> Fecha: 2026-05-27.
> Pantalla: `/registrar-comida` (frontend React Router).

---

## Flujo end-to-end

```
Usuario
  │
  │ 1. Sube imagen (cámara o galería)
  ▼
RegistrarComida.tsx ── mealService.analyzeImage(file) ──► POST /api/ai/analyze-preview
                                                                │
                                                                ▼
                                                    aiLegacyAnalyze.controller.ts
                                                                │
                                                                ▼
                                                    runAiPlateAnalysis(input)
                                                                │
                                          ┌─────────────────────┼─────────────────────┐
                                          ▼                     ▼                     ▼
                                  Gemini Vision          AiPlateAnalysis        Cache check
                                  (multimodal)           (Mongo: SIEMPRE       (24h por hash
                                                          se persiste)         de imagen+prompt)
                                          │
                                          ▼
                          Respuesta enriquecida:
                          { analysis, analysisId, responseText,
                            detectedFoods, proportions,
                            recommendations, warnings, confidence }
                                          │
                                          ▼
Usuario edita campos (nombre, kcal, P/G/HC) y selecciona categoría
                                          │
                                          │ 2. Pulsa "Guardar"
                                          ▼
RegistrarComida.tsx ── mealService.saveAnalyzedMeal(payload) ──► POST /api/ai/save-analyzed-meal
                                                                        │
                                                                        ▼
                                                            mealModel.create  (PostgreSQL: Meal)
                                                            profileModel.assignMeal (PostgreSQL: Profile_Meal)
                                                                        │
                                                                        ▼
                                                            201 + { success, data: { meal } }
                                          │
                                          ▼
                                  navigate('/perfil')
                                          │
                                          ▼
                          Profile dashboard lee /api/meals/profile/mine
                          y la comida aparece asignada al día
```

---

## Persistencia dual

| Sistema | Qué guarda | Cuándo |
|---|---|---|
| **Mongo** (`AiPlateAnalysis`) | Análisis completo (responseText, detectedFoods, estimatedNutrition, proportions, recommendations, warnings, metadata, safety, costEstimate) | **Siempre**, en cada llamada a `/analyze-preview` (audit trail + cache key) |
| **PostgreSQL** (`Meal` + `Profile_Meal`) | Comida editable en dashboard (name, calories, protein, fat, carbs, source) y su asignación al user | **Solo si el user pulsa Guardar** vía `/save-analyzed-meal` |

Por qué dos sistemas:
- El análisis IA es un artefacto auditable del módulo IA y vive en Mongo con el resto del módulo (conversaciones, weekly plans, cache).
- La comida visible en el dashboard P0 vive en PostgreSQL, integrada con el resto del schema P0 (`Profile`, `Profile_Meal`, etc.).

---

## Análisis enriquecido en UI

`RegistrarComida.tsx` muestra, además de los campos editables clásicos:

| Sección | Origen | Renderiza |
|---|---|---|
| **Resumen IA** | `analysis.responseText` | Card con texto natural del análisis |
| **Alimentos detectados** | `analysis.detectedFoods[]` | Tags con color según `confidence` (high=verde, medium=ámbar, low=rojo) |
| **Proporción estimada** | `analysis.proportions` | Pills P / HC / Veg / G con porcentajes |
| **Warnings** | `analysis.warnings[]` | Lista con icono ⚠️ |
| **Recomendaciones** | `analysis.recommendations[]` | Lista con ✓ |
| **Campos editables** | `analysis.{name,calories,protein,fat,carbs}` | Inputs (el user puede ajustar antes de guardar) |
| **Selector de categoría** | local state | Pills Desayuno/Almuerzo/Merienda/Cena |

CSS en `RegistrarComida.css` bajo el bloque "AI Rich Analysis".

---

## Por qué se trunca `name` a ≤100 chars

La columna `Meal.name` en PostgreSQL es `varchar(100) NOT NULL` y el Zod schema de `/save-analyzed-meal` también caps en `.max(100)`. Cuando Gemini detecta varios alimentos con nombres descriptivos largos:

```ts
result.structuredData.detectedFoods.map(f => f.name).join(', ')
// → "Pechuga de pollo a la plancha, Arroz integral cocido, Brócoli al vapor, ..."  (>100 chars)
```

El controller `postAnalyzePreview` trunca el `name` a 100 chars (con elipsis si excede) **antes de devolverlo** al frontend. Esto garantiza:

1. El input editable en UI nunca arranca con un valor que el backend rechazaría.
2. La Zod validation de `/save-analyzed-meal` pasa con el `name` por defecto.
3. La columna `varchar(100)` de PostgreSQL no devuelve error de truncamiento.

El user puede editar el nombre antes de guardar; el límite de 100 chars sigue aplicando en cualquier caso.

---

## Por qué no se usa `/api/meals` para usuarios normales

`POST /api/meals` en P0 está protegido por **`requireAdmin`**. Un user normal que intentara llamarlo recibiría `403`. Razones P0 (anteriores al módulo IA):

- El catálogo `Meal` en P0 se diseñó como tabla maestra curada por admin, no editable por user final.
- La asignación de meal a user va por la tabla puente `Profile_Meal` y existe el endpoint `/api/meals/profile/assign` para eso, pero **requiere que el `mealId` ya exista** en la tabla `Meal`.

Para análisis IA esto bloquea el flujo MVP de producto — el user no puede guardar una comida nueva detectada por la IA. Solución MVP: **`POST /api/ai/save-analyzed-meal`** dentro del módulo IA. Solo requiere JWT (no admin), crea la `Meal` en PostgreSQL con un `meal_id` generado por timestamp, y la asigna al user en una sola petición.

### Deuda técnica de permisos P0

El workaround actual es funcional pero arquitectónicamente forzado: el módulo IA está escribiendo en tablas P0 que conceptualmente son de P0. La fix correcta (documentada como #1 en [docs/ai-module-current-status.md](../../ai-module-current-status.md#deuda-técnica-pendiente)):

- Revisar el contrato de `/api/meals` en P0 para permitir que un user autenticado cree sus propias comidas.
- Una vez disponible, **deprecar `/api/ai/save-analyzed-meal`** y mover RegistrarComida a usar `POST /api/meals` + `POST /api/meals/profile/assign` directamente.
- Eliminar el endpoint IA específico y los imports de `mealModel`/`profileModel` desde `aiLegacyAnalyze.controller.ts`.

Hasta entonces, el workaround se mantiene como **solución oficial MVP**.

---

## AIBubble sigue usando `/api/ai/analyze`

`AIBubble.tsx` (cápsula flotante de análisis rápido fuera de `RegistrarComida`) **no ha cambiado**:

- Sigue llamando a `POST /api/ai/analyze`.
- Sigue siendo "fire and forget" — solo comprueba `res.ok`, no lee el body.
- No usa `/api/ai/analyze-preview` ni `/api/ai/save-analyzed-meal`.

Esto está garantizado por contrato: cualquier cambio futuro en los adapters legacy debe preservar el comportamiento de AIBubble (es la primera línea de comprobación al modificarlos).

---

## Manejo de errores

- El backend devuelve errores con shape `{ success: false, error: { code, message } }`.
- **`api.ts` normaliza** ambos shapes (P0 y AI) para extraer el `.message` real, evitando el `[object Object]` que aparecía antes en `console.error` y `alert`.
- `handleSave` en `RegistrarComida.tsx` muestra `err.message` directamente cuando es útil; cae al genérico solo si está vacío o degradado.
- Errores típicos visibles ahora al usuario:
  - `"Invalid request body: String must contain at most 100 character(s)"` — si nombre editado excede 100 chars.
  - `"Falta el token de autenticacion"` — si el token desapareció entre análisis y guardado.

---

## Ver también

- [docs/ai-module-current-status.md](../../ai-module-current-status.md) — endpoints y resumen ejecutivo.
- [user-assistant-dashboard.md](user-assistant-dashboard.md) — pantalla `/asistente-ia` que enlaza a este flujo.
- [provider-router-gemini-deepseek.md](provider-router-gemini-deepseek.md) — por qué imagen siempre va a Gemini.
- [final-mvp-smoke-test.md](final-mvp-smoke-test.md) — checklist de smoke incluyendo este flujo.
- [docs/feat_ai-plate-analysis-mvp_resumen.md](../../feat_ai-plate-analysis-mvp_resumen.md) — resumen histórico del MVP de plate analysis.
