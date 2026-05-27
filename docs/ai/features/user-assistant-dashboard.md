# `/asistente-ia` — Asistente IA del usuario final

> Estado: **MVP listo**.
> Fecha: 2026-05-27.
> Ruta: `/asistente-ia` (frontend React Router).

---

## Objetivo de producto

`/asistente-ia` es la **pantalla de usuario final** del módulo IA — la cara visible para el usuario que paga por la app. Concentra las tres interacciones IA principales en una sola pantalla con tabs:

1. **Chat IA** — conversación libre con el asistente nutricional.
2. **Menú Semanal** — generación asíncrona de un plan de 7 días.
3. **Análisis de Plato** — CTA que lleva a `/registrar-comida`, donde está el flujo real de subida de imagen.

Es distinta de `/ai-lab`, que es una pantalla técnica para desarrolladores/QA.

---

## Acceso

| Elemento | Ubicación |
|---|---|
| Link en el Header | Dropdown del avatar de usuario → "🤖 Asistente IA" |
| Ruta | `/asistente-ia` |
| Componente | `frontend/src/pages/AiAssistantPage.tsx` |
| Estilos | `frontend/src/styles/aiAssistant.css` |

El link solo aparece para usuarios autenticados (la sección del avatar solo se renderiza si `isAuthenticated === true`).

---

## Protección por auth

La página implementa un **guard de auth** después de los hooks de React:

```tsx
if (!isAuthenticated) return <Navigate to="/login" replace />
```

Si el token desaparece (logout, expiración, limpieza manual de `localStorage`), el siguiente render redirige al login. El guard va **después** de todos los hooks para no romper el orden de hooks de React.

---

## Tab 1 — Chat IA

- Envía cada mensaje a `POST /api/ai/chat` vía `sendAiChatMessage` (helper de `frontend/src/services/aiApi.ts`).
- Mantiene `conversationId` en un `useRef` para que el backend asocie todos los mensajes a la misma conversación multi-turno. La primera petición no lo envía; las siguientes sí.
- Provider real: **DeepSeek** cuando está activo (ver [provider-router-gemini-deepseek.md](provider-router-gemini-deepseek.md)).
- UI: burbujas user / assistant, indicador `…` mientras espera respuesta.

---

## Tab 2 — Menú Semanal

- Petición inicial: `POST /api/ai/menu/weekly` con `objective` y `caloriesTarget` del perfil (cargados desde `GET /profile` al montar la página).
- Respuesta: `202 Accepted` + `{ planId }`.
- Polling: `GET /api/ai/menu/weekly/:planId` cada **4 segundos** vía `window.setInterval`. Se detiene cuando `status ∈ { completed, partial_failed, failed }`.
- UI: barra de progreso (`completedDays / totalDays`), lista de días renderizados a medida que llegan.
- Cleanup: el `useEffect` limpia el interval en unmount para evitar leaks.

---

## Tab 3 — Análisis de Plato (CTA)

Esta pantalla **no implementa** el upload de imagen. En su lugar muestra un CTA que redirige a `/registrar-comida`, donde está el flujo completo (análisis enriquecido + edición + guardado). Detalle en [plate-analysis-product-flow.md](plate-analysis-product-flow.md).

Razón de diseño: `/registrar-comida` ya existe en P0 con cámara + galería + categoría (Desayuno / Almuerzo / Merienda / Cena). Duplicar el upload en `/asistente-ia` no aporta valor MVP.

---

## Diferencia con `/ai-lab`

| | `/asistente-ia` | `/ai-lab` |
|---|---|---|
| Audiencia | Usuario final | Desarrollador / QA |
| Estilo | UX de producto (tabs, burbujas, polish) | Forms técnicos con JSON crudo |
| Endpoints | Chat + weekly menu + redirect a registrar comida | Todos los endpoints IA individualmente |
| Metadata visible | No (provider / model ocultos) | Sí (`metadata.provider`, `metadata.model`, `cached`) |
| Hidden / dev-only | No — visible en Header | Sí — solo navegando a `/ai-lab` directamente |
| Auth | Sí (guard + redirect login) | Sí (mismo helper `withAuth`) |

`/ai-lab` se conserva como herramienta de debug y QA durante el desarrollo; no se ha eliminado.

---

## Ver también

- [docs/ai-module-current-status.md](../../ai-module-current-status.md) — endpoints y arquitectura general.
- [provider-router-gemini-deepseek.md](provider-router-gemini-deepseek.md) — cómo decide el backend qué provider usar.
- [plate-analysis-product-flow.md](plate-analysis-product-flow.md) — el flujo al que apunta el CTA.
- [final-mvp-smoke-test.md](final-mvp-smoke-test.md) — checklist de smoke con esta pantalla incluida.
