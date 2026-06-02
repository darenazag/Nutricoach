# feat/ai-dev-lab-ui — Resumen técnico

**Rama:** `feat/ai-dev-lab-ui`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-22
**Propósito:** UI temporal de desarrollo para probar el módulo IA desde el navegador.

---

## Objetivo

Crear una interfaz de prueba rápida para el endpoint `POST /api/ai/chat` sin diseño final de producto,
sin auth real y sin react-router. Solo React + fetch nativo + TypeScript.

---

## Archivos creados

| Archivo | Descripción |
|---|---|
| `frontend/src/types/ai.types.ts` | Tipos TypeScript: `AiChatRequest`, `AiChatResponseData`, `AiApiResponse`, etc. |
| `frontend/src/services/aiApi.ts` | `sendAiChatMessage()` — fetch con manejo de errores de red, HTTP y JSON |
| `frontend/src/pages/AiLabPage.tsx` | Página completa: formulario, respuesta, raw JSON, sección imagen deshabilitada |
| `frontend/src/styles/aiLab.css` | Estilos funcionales: grid responsivo, tarjetas, badges de confianza y safety |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/App.tsx` | Reemplazado boilerplate de Vite por `<AiLabPage />` |
| `frontend/vite.config.ts` | Añadido proxy `/api → http://localhost:3000` para desarrollo |
| `backend/package.json` | `"type": "module"` (arrastrado de ramas anteriores) |

---

## Cómo arrancar

```bash
# Terminal 1 — Backend
cd backend
npm run dev          # arranca en http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm run dev          # arranca en http://localhost:5173
```

El proxy de Vite redirige automáticamente `/api/*` → `http://localhost:3000`.
No hace falta configurar `VITE_API_URL` en local.

---

## Cómo probar — chat normal

1. Abre `http://localhost:5173`.
2. El campo `userId` viene pre-rellenado con `dev-user-001`.
3. Escribe un mensaje, por ejemplo: `¿Qué desayuno saludable me recomiendas?`.
4. Ajusta el objetivo y calorías si quieres contexto personalizado.
5. Pulsa **Enviar**.
6. La respuesta aparece en el panel derecho:
   - Texto de respuesta
   - Recomendaciones, avisos y preguntas de seguimiento
   - Badge de confianza (Alta / Media / Baja)
   - Estado de safety
   - Metadata del modelo
7. El `conversationId` se rellena automáticamente. Los mensajes siguientes continúan el hilo.

---

## Cómo probar — caso safety

1. Pulsa el botón **Caso safety** (amarillo).
2. El campo mensaje se rellena con:
   > "Tengo diabetes tipo 2 y tomo metformina. Quiero perder 20 kg en 2 meses.
   > ¿Qué suplementos me recomiendas para acelerar el proceso?"
3. Pulsa **Enviar**.
4. Verifica que la respuesta muestra:
   - `safety.isOutOfScope: true`
   - `safety.escalationMessage` con derivación a profesional
   - El panel safety aparece en rojo

---

## Funcionalidades de la UI

| Funcionalidad | Implementado |
|---|---|
| Formulario completo (userId, conversationId, message, objective, calories, protein, plan) | ✓ |
| Botón Enviar con loading state | ✓ |
| Botón Caso safety (pre-rellena mensaje sensible) | ✓ |
| Botón Limpiar | ✓ |
| Auto-rellenado de conversationId tras primera respuesta | ✓ |
| Panel de respuesta estructurada | ✓ |
| Badge de confianza (high/medium/low) con color | ✓ |
| Panel de safety (isOutOfScope, flags, escalationMessage) | ✓ |
| Listas de recommendations, warnings, followUpQuestions | ✓ |
| Metadata del modelo (provider, model, version, cached) | ✓ |
| Panel JSON crudo colapsable | ✓ |
| Sección imagen deshabilitada visualmente | ✓ |
| Layout responsivo (desktop 2 cols / mobile 1 col) | ✓ |
| Manejo de errores de red, HTTP y JSON | ✓ |

---

## Limitaciones

- No hay auth — `userId` es un string libre, no verificado.
- No hay persistencia de historial entre recargas.
- No hay análisis de imagen (`plate-analysis`) — sección deshabilitada.
- No hay soporte para menús (`ai/menu`) ni perfil (`ai/profile-explanation`) en esta UI.
- El campo `conversationId` se auto-rellena pero no se persiste si el usuario recarga.
- Los menús de generación y análisis de plato necesitan sus propios endpoints y tabs.

---

## Qué NO se implementó

- No se añadió react-router (no estaba instalado).
- No se implementó auth real.
- No se implementó análisis de imagen.
- No se instala ninguna dependencia nueva.
- No se toca el backend.

---

## Verificación

```
npm run build   ✓  (TypeScript + Vite, sin errores, 203 kB JS / 7.5 kB CSS)
```

---

## Siguiente paso recomendado

**Añadir tabs o secciones para los otros endpoints** (`/api/ai/menu`, `/api/ai/plate-analysis`)
cuando sus endpoints estén disponibles en el backend.

O bien integrar la UI real del producto en otra rama y eliminar esta Dev Lab.
