# feat/ai-dev-lab-plate-upload — Resumen técnico

**Rama:** `feat/ai-dev-lab-plate-upload`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-22

---

## Objetivo

Activar la sección de análisis de plato por imagen en la AI Dev Lab,
usando `fetch` + `FormData` para llamar a `POST /api/ai/plate-analysis`
y mostrando el resultado estructurado en pantalla.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/types/ai.types.ts` | +`NutritionRange`, `EstimatedNutrition`, `DetectedFood`, `PlateProportions`, `PlateAnalysisStructuredData`, `AiPlateAnalysisResponseData`, `AiPlateAnalysisFormPayload` |
| `frontend/src/services/aiApi.ts` | +`sendAiPlateAnalysis()` con FormData |
| `frontend/src/pages/AiLabPage.tsx` | Reescrito: sección imagen activa, `PlateResponsePanel`, estado independiente |
| `frontend/src/styles/aiLab.css` | +estilos: file input, preview, food list, nutrition grid, proportions |

---

## Cómo probar la subida

**Prerrequisitos:**
- Backend corriendo en `http://localhost:3000`
- `GEMINI_API_KEY` válida en `backend/.env`
- MongoDB levantado

**Pasos:**
1. Arranca backend: `cd backend && npm run dev`
2. Arranca frontend: `cd frontend && npm run dev`
3. Abre `http://localhost:5173`
4. (Opcional) Ajusta userId, objetivo y calorías en la sección de chat — el contexto se comparte con el análisis de imagen.
5. En la sección **"Análisis de plato por imagen"**, haz clic en el área de carga.
6. Selecciona una imagen `.jpg`, `.png` o `.webp` de menos de 5 MB.
7. Aparece un preview de la imagen.
8. Pulsa **"Analizar plato"**.
9. Espera la respuesta de Gemini Vision (~3–10 s).
10. El panel derecho muestra:
    - Texto de análisis
    - Estado de safety
    - Alimentos detectados con nivel de confianza
    - Rangos nutricionales (calorías, proteína, hidratos, grasa)
    - Confianza global y razón
    - Proporciones del plato
    - Suposiciones del modelo
    - Recomendaciones y avisos
    - analysisId + metadata del modelo

---

## Decisiones de diseño

- **Contexto compartido:** userId, objetivo, calorías y plan se leen del estado del formulario de chat. El usuario los configura una sola vez y sirven para ambas funciones.
- **Sin Content-Type manual:** `FormData` con `fetch` sin cabecera `Content-Type` deja que el browser añada el `multipart/boundary` correcto.
- **Preview local:** `URL.createObjectURL(file)` genera la vista previa sin subir nada al servidor todavía.
- **Estado independiente:** el panel de chat y el de imagen tienen loading/error/response separados — fallar en uno no afecta al otro.

---

## Resultado build

```
tsc -b        ✓  (0 errores TypeScript)
vite build    ✓  (215 kB JS / 9.9 kB CSS)
```

---

## Qué NO se implementó

- No hay auth real.
- No hay selección de `mealId` en el formulario (se puede añadir como campo opcional).
- No hay indicador de progreso de carga (la llamada es síncrona).
- No hay historial de análisis anteriores en la UI.
- No se diferencia visualmente entre confianza alta/media/baja en los rangos de nutrición.

---

## Comando para commit

```bash
git add frontend/src/types/ai.types.ts \
        frontend/src/services/aiApi.ts \
        frontend/src/pages/AiLabPage.tsx \
        frontend/src/styles/aiLab.css \
        docs/feat_ai-dev-lab-plate-upload_resumen.md
git commit -m "feat(ui): activate plate analysis section in AI dev lab"
```
