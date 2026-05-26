# feat/ai-dashboard-lab-core — Resumen

## Objetivo

Convertir el AI Dev Lab (que solo cubría chat + análisis de plato) en un dashboard interno completo que permite probar los 5 endpoints del módulo IA, con perfil compartido, seguimiento de caché y panel de uso de sesión.

---

## Arquitectura UI

Layout de dos columnas (grid `400px | 1fr`, existente):

```
┌─ lab-header ─────────────────────────────────────────────┐
│ NutriCoach AI Dev Lab                    [DEV INTERNO]   │
├──────────────────────────────────────────────────────────┤
│  COLUMNA IZQUIERDA (sticky)  │  COLUMNA DERECHA          │
│  ──────────────────────────  │  ──────────────────────── │
│  Perfil compartido           │  [Tab Nav Bar]            │
│   userId                     │  Chat|Menú|Perfil|        │
│   objective                  │  Análisis|Conversaciones  │
│   caloriesTarget             │                           │
│   proteinTarget              │  [Contenido tab activo]   │
│   carbsTarget (opc.)        │   form + resultado        │
│   fatTarget (opc.)          │   + JSON raw plegable     │
│   plan                       │                           │
│                              │                           │
│  Uso IA (sesión actual)      │                           │
│   totalRequests              │                           │
│   cacheHits / cacheMisses    │                           │
│   Última operación           │                           │
└──────────────────────────────────────────────────────────┘
```

En pantallas < 900 px: columna izquierda apila sobre la derecha (breakpoint existente).

---

## Secciones implementadas

### 1. Perfil compartido

Panel lateral izquierdo persistente. Alimenta los 5 tabs:

| Campo | Aplica a |
|-------|---------|
| `userId` | Chat, Menú, Perfil, Plato, — |
| `objective` | Chat (contexto), Menú, Perfil, Plato |
| `caloriesTarget` | Todos |
| `proteinTarget` | Chat, Menú, Perfil |
| `carbsTarget` (opcional) | Chat, Menú, Perfil |
| `fatTarget` (opcional) | Chat, Menú, Perfil |
| `plan` | Todos |

### 2. Tab — Chat

- Campo de mensaje + conversationId (auto-rellenado)
- Botones: Enviar, Caso safety, Limpiar
- Respuesta: texto + safety + recomendaciones + avisos + preguntas de seguimiento + confianza + conversationId + metadata
- JSON raw plegable

### 3. Tab — Menú

- Campos tab-locales: `days` (1–7), `mealsPerDay` (1–6), `notes` (opcional)
- Valores del perfil compartido como contexto
- Botones: **Generar menú** + **Repetir (caché)** (deshabilitado hasta primera petición)
- Resultado: resumen + tarjetas por día → comidas con macros (kcal, prot, HC, grasa) + recomendaciones + avisos + conversationId + metadata (badge CACHE HIT/MISS)
- JSON raw plegable

### 4. Tab — Perfil

- Campos tab-locales: `basalMetabolicRate` (TMB), `totalDailyEnergyExpenditure` (TDEE) — requeridos por el endpoint
- Valores del perfil compartido como contexto
- Botones: **Explicar perfil** + **Repetir (caché)**
- Resultado: explicación + métricas explicadas + recomendaciones + avisos + confianza + conversationId + metadata
- JSON raw plegable

### 5. Tab — Análisis de plato

- Selector de imagen (jpeg/png/webp)
- Nota de ayuda para imágenes de `backend/data/mock-images/food/`
- Botones: **Analizar plato** + **Repetir (caché)** + Limpiar
- Resultado: texto + safety + alimentos detectados + rangos nutricionales + proporciones + suposiciones + recomendaciones + analysisId + metadata
- JSON raw plegable

### 6. Tab — Menú semanal async

- Campos tab-locales: `mealsPerDay` (1–6), `notes` (opcional)
- Valores del perfil compartido como contexto (objetivo, kcal, proteína, plan)
- Botón **Generar menú semanal** → POST /api/ai/menu/weekly → 202, recibe `planId`
- Auto-poll cada 5 s mientras `status === 'generating'` (usa `useRef` + `setInterval` para evitar stale closures)
- Botón **Consultar progreso** para polling manual
- Resultado:
  - Badge de estado (`generating` / `completed` / `partial_failed` / `failed`)
  - Barra de progreso animada (días completados / 7)
  - Tarjetas por día: comidas con macros + recomendaciones + badge `CACHED` si aplica
  - Panel **Uso estimado**: llamadas planificadas, completadas, cache hits/misses
  - Aviso de que los tokens reales no están disponibles (Token Taximeter pendiente)
- JSON raw plegable (actualizado en cada poll)
- Botón Limpiar: limpia estado local + detiene el poll activo

### 7. Tab — Conversaciones

- Input `conversationId`
- Botones: **Cargar conversación** + **Usar último ID** (auto-rellena con el último ID generado en sesión)
- Resultado: metadatos de conversación (tipo, estado, proveedor, fecha) + lista de mensajes con badge `user`/`assistant` + structuredData plegable por mensaje
- JSON raw plegable

### 8. Panel Uso IA (sesión)

Contadores locales, no persistidos:

| Métrica | Descripción |
|---------|-------------|
| `totalRequests` | Peticiones IA enviadas en la sesión |
| `cacheHits` | Respuestas servidas desde caché |
| `cacheMisses` | Llamadas reales a Gemini |
| Última operación | endpoint + id + badge HIT/MISS + modelo + prompt version |

El botón "Repetir (caché)" en Menú, Perfil y Análisis reutiliza el payload exacto de la última petición, permitiendo verificar el flujo HIT de forma determinista.

---

## Endpoints cubiertos

| Endpoint | Tab | Caché | Repetir |
|----------|-----|-------|---------|
| POST /api/ai/chat | Chat | — | No (multi-turno) |
| POST /api/ai/menu | Menú | ✓ | ✓ |
| POST /api/ai/menu/weekly | Menú semanal | ✓ (por día) | No |
| GET /api/ai/menu/weekly/:planId | Menú semanal (poll) | — | — |
| POST /api/ai/profile-explanation | Perfil | ✓ | ✓ |
| POST /api/ai/plate-analysis | Análisis plato | ✓ | ✓ |
| GET /api/ai/conversations/:id | Conversaciones | — | No |

---

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/types/ai.types.ts` | +10 interfaces originales + 8 tipos weekly (AiWeeklyMenuRequest, AiWeeklyMenuCreateResponse, AiWeeklyMenuMeal, AiWeeklyMenuDayDto, AiWeeklyMenuProgress, AiWeeklyUsageEstimation, AiWeeklyMenuPlanDto, AiWeeklyPlanStatus/DayStatus) |
| `frontend/src/services/aiApi.ts` | +2 funciones: sendAiWeeklyMenuRequest, getAiWeeklyMenuPlan |
| `frontend/src/pages/AiLabPage.tsx` | +1 tab weekly: 11 state vars, handleWeeklySubmit, pollWeeklyPlan, useEffect auto-poll |
| `frontend/src/styles/aiLab.css` | +~170 líneas: weekly status badges, progress bar, day cards, meal items, usage grid |
| `docs/feat_ai-dashboard-lab-core_resumen.md` | Este documento |

**Backend: sin cambios.** App.tsx: sin cambios.

---

## Token Taximeter — preparación futura

El panel "Uso IA" muestra contadores locales de sesión (hits/misses) y el texto:
> "Tokens reales pendientes de instrumentar en backend."

La adaptación real del **Token Taximeter** (que mide tokens y coste de Gemini en otra app) se realizará en una feature separada, revisando el sistema existente de esa app. Los módulos propuestos para cuando se implemente:

```
backend/src/modules/ai/services/aiUsage.service.ts
backend/src/modules/ai/models/AiUsageRun.model.ts
backend/src/modules/ai/repositories/aiUsage.repository.ts
```

El proveedor Gemini (`@google/genai`) ya devuelve `usageMetadata` en las respuestas. Cuando se instrumente, se leerá de ahí sin modificar el contrato público de los servicios.

---

## Qué NO se implementó

| Feature | Motivo |
|---------|--------|
| Auth real | Dev lab sin auth por diseño |
| Tokens / coste real | Token Taximeter pendiente (ver arriba) |
| Persistencia de contadores | Session-local intencionado; no hay modelo de usage en Mongo todavía |
| Lista de conversaciones sin ID | Backend no tiene endpoint GET /conversations (listado) |
| Integración con landing real | Fuera de scope |
| Cambios en backend | No necesarios |

---

## Limitaciones

| Área | Limitación |
|------|-----------|
| Imágenes de prueba | El navegador no puede leer `backend/data/mock-images/` directamente |
| BMR/TDEE en Perfil | El usuario debe calcularlos manualmente (no hay calculadora integrada) |
| Contador de uso | Se pierde al recargar la página (no persiste) |
| Multi-turno | El tab de Chat soporta multi-turno vía conversationId pero no permite ver el historial en línea (usa el tab de Conversaciones para eso) |

---

## Verificación

```
npm run check  →  0 errors ✓   (backend)
npm run build  →  0 errors ✓   (backend)
npm test       →  6 passed (6 files), 38 passed (38 tests) ✓
npm run build  →  ✓ built in ~474ms   (frontend, 251 kB JS, 15 kB CSS)
```