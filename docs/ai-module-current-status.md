# Módulo IA — Estado actual (MVP final)

> Rama de integración: `integration/full-integration-sanitized`
> Fecha: 2026-05-27
> Stack: Node.js + Express + TypeScript + Mongoose 9 + Zod + `@google/genai` + DeepSeek

> **Despliegue VPS: PENDIENTE.** El módulo está validado en local. No se ha desplegado todavía en ningún servidor público. Variables de entorno de producción (`CLIENT_URL`, `VITE_API_URL`, `GEMINI_API_KEY`, `MONGO_URI`, …) deben definirse cuando se aborde el despliegue.

---

## Resumen ejecutivo

El módulo IA está **operativo como MVP de producto** dentro de NutriCoach. Estado actual:

- **MVP IA funcional end-to-end**: chat de texto, análisis de plato con imagen, menú semanal y explicación de perfil.
- **Router de proveedor**:
  - **DeepSeek** para texto (chat, profile-explanation, menu, weekly menu) por coste — activo cuando `AI_TEXT_PROVIDER=deepseek` y `AI_ENABLE_DEEPSEEK=true`.
  - **Gemini** para imagen/multimodal siempre (`/api/ai/analyze`, `/api/ai/analyze-preview`, `/api/ai/plate-analysis`).
  - **Gemini como fallback de texto** si DeepSeek falla o no valida contra Zod (especialmente útil en weekly menu que necesita JSON estricto).
- **`/asistente-ia`** es la **pantalla de producto** para el usuario final (chat + menú semanal + CTA análisis de plato), integrada en el Header.
- **`/ai-lab`** queda como **herramienta técnica/dev** para QA y debugging interno.
- **`RegistrarComida`** ahora muestra **análisis completo del plato** (responseText, detectedFoods, proportions, recommendations, warnings) y permite **guardar la comida** vía `POST /api/ai/save-analyzed-meal`.
- **Persistencia dual**:
  - El análisis se persiste **siempre** en Mongo como `AiPlateAnalysis` (auditoría/cache).
  - La comida visible en dashboard/perfil se guarda en **PostgreSQL** (`Meal` + `Profile_Meal`) mediante el flujo P0 estándar.
- **JWT obligatorio en todos los endpoints `/api/ai/*`** (`aiRouter.use(authenticate)`).
- **`userId` se deriva siempre de `req.auth.sub`**; el backend no confía en `userId` que llegue desde body o query del frontend.
- **Tests backend: 101/101 en 11 ficheros**, lint en verde.
- **Frontend lint: 0 errores** (2 warnings preexistentes en `MenuSugerido`, fuera de scope). **Build OK**.

La premisa arquitectónica sigue siendo: el módulo IA se adapta a la base P0, no al revés.

---

## Endpoints actuales

| Método | Ruta | Función | Auth | Notas |
|---|---|---|---|---|
| POST | `/api/ai/chat` | Chat conversacional multi-turno | JWT | userId desde JWT; provider router (DeepSeek/Gemini) |
| POST | `/api/ai/menu` | Generación de menú orientativo (one-shot) | JWT | cache 24 h |
| POST | `/api/ai/menu/weekly` | Generación asíncrona de menú semanal | JWT | 202 + polling; DeepSeek con fallback Gemini |
| GET | `/api/ai/menu/weekly/:planId` | Polling del estado del plan semanal | JWT | — |
| POST | `/api/ai/profile-explanation` | Explicación del perfil nutricional calculado por P0 | JWT | cache 24 h; no recalcula valores |
| POST | `/api/ai/plate-analysis` | Análisis multimodal de plato (imagen → Gemini Vision) | JWT | multipart `image`; cache 24 h con hash de imagen |
| GET | `/api/ai/conversations` | Listado paginado de conversaciones del usuario | JWT | `?page=&limit=` (default 1/10, max 50) |
| GET | `/api/ai/conversations/:conversationId` | Lectura de una conversación + mensajes | JWT + ownership | `not_found` para conversaciones de otro user |
| POST | `/api/ai/analyze` | Adaptador legacy para `AIBubble.tsx` | JWT | mismo contrato `{success,data}`; ahora con auth |
| POST | `/api/ai/analyze-preview` | Adaptador legacy para `RegistrarComida.tsx` | JWT | devuelve `{analysis:{...}, ...campos enriquecidos}`; backward compatible |
| POST | `/api/ai/save-analyzed-meal` | **(nuevo)** Guarda comida analizada en P0 (PostgreSQL) y la asigna al user | JWT | bypass de `requireAdmin` que bloquea `/api/meals` |

Forma de respuesta común:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Excepción: `/api/ai/analyze-preview` mantiene el contrato P0 `{ "analysis": { name, calories, protein, fat, carbs, source } }` para no romper a `RegistrarComida.tsx`, y añade campos opcionales (`analysisId`, `responseText`, `detectedFoods`, `proportions`, `recommendations`, `warnings`, `confidence`) al mismo nivel.

---

## Seguridad actual

- **`aiRouter.use(authenticate)`** se aplica una vez al inicio de `ai.routes.ts` y cubre todos los endpoints del router. Petición sin Bearer válido → `401` antes de tocar el controller.
- **`req.auth.sub` es la única fuente de `userId`** en cada controller de escritura.
- **`body.userId` y `query.userId` se ignoran** aunque el cliente los envíe (incluyendo intentos de impersonación).
- **Ownership en conversaciones**: cross-user → `not_found` para no filtrar existencia.
- **`/api/ai/save-analyzed-meal`** solo requiere JWT, no `requireAdmin`. La razón: `POST /api/meals` (P0) está restringido a admin por contrato P0, y bloquea al usuario final. Este endpoint del módulo IA es el camino oficial para que un user normal cree comidas tras el análisis IA — ver deuda técnica abajo.

---

## Integración con P0

- **`AIBubble.tsx`** (cápsula flotante de análisis rápido) consume `POST /api/ai/analyze`. Frontend intacto.
- **`RegistrarComida.tsx`** consume:
  - `POST /api/ai/analyze-preview` para análisis enriquecido tras subir imagen.
  - `POST /api/ai/save-analyzed-meal` para persistir la comida en P0 y asignarla al user. Detalle en [docs/ai/features/plate-analysis-product-flow.md](ai/features/plate-analysis-product-flow.md).
- **`Profile.tsx` / Dashboard** lee las comidas asignadas vía servicios P0 estándar (`/api/meals/profile/mine`). Las comidas guardadas vía `/api/ai/save-analyzed-meal` aparecen ahí sin tocar el frontend P0.
- **`/asistente-ia` (`AiAssistantPage.tsx`)** es la pantalla producto del usuario final. Detalle en [docs/ai/features/user-assistant-dashboard.md](ai/features/user-assistant-dashboard.md).
- **`/ai-lab` (`AiLabPage.tsx`)** queda como pantalla técnica/dev para probar endpoints individualmente.
- **`buildAiPlateContextFromP0User(userId)`** lee `Profile` desde PostgreSQL/Sequelize (P0) y devuelve `{ objective, caloriesTarget, plan }` para enriquecer el input de plate-analysis. Tolerante a fallos.

### Normalización de errores frontend

- **`frontend/src/services/api.ts`** extrae `.message` de cualquier shape de error (`{ error: "string" }` de P0 o `{ error: { code, message } }` del módulo IA). Esto **elimina globalmente** el `[object Object]` que aparecía antes en alerts y `console.error` cuando el módulo IA devolvía un 4xx.

---

## Estado de tests

- **`npm run lint`** (backend, `tsc --noEmit`): OK, 0 errores.
- **`npm test`** (backend, Vitest): **101/101 tests en 11 ficheros**, ~12 s.
- **Frontend `npm run lint`**: 0 errores (2 warnings preexistentes en `MenuSugerido`).
- **Frontend `npm run build`**: OK (`tsc -b && vite build`). Warning de "chunk > 500 kB" no bloqueante.
- **`mongodb-memory-server`** se usa para los tests de service que tocan modelos Mongoose.
- **Mock de Gemini y DeepSeek** en los tests para no consumir cuota real.

---

## Deuda técnica pendiente

En orden de impacto operativo:

1. **Permisos P0**: `POST /api/meals` exige `requireAdmin`, lo que obliga a tener `/api/ai/save-analyzed-meal` como workaround. La fix correcta es revisar el contrato P0 para permitir que un user autenticado cree sus propias comidas, y entonces deprecar el endpoint IA específico.
2. **Rate limiting / control de coste** por usuario y por plan (`free` vs `pro`), idealmente delante de `authenticate` para que un token válido siga rate-limited.
3. **Prompts activos cargados desde Mongo en runtime** en lugar de las plantillas en memoria (`getDefaultPromptTemplate`).
4. **Weekly menu — robustez DeepSeek/JSON**: hoy DeepSeek puede no respetar siempre el JSON Schema estricto, lo que dispara el fallback a Gemini. Mejorar prompt + parser para que DeepSeek sirva sin caer a Gemini en el caso típico.
5. **CI mínimo** que ejecute `npm run lint` y `npm test` (backend) + `npm run lint` y `npm run build` (frontend) en cada PR contra `integration/full-integration-sanitized` o `main`.
6. **Docker demo / producción unificado** con servicio Mongo + servicio API + servicio frontend bajo un solo `docker-compose.yml`.
7. **`VITE_API_URL` unificado** entre P0 (`services/api.ts`) y AI Lab (`services/aiApi.ts`) para evitar drift en producción.
8. **Métricas reales de tokens y coste** por usuario / conversación, expuestas en un panel admin.
9. **Bundle splitting con `React.lazy`** para AI Lab / Asistente IA (hoy el bundle JS pasa de 500 kB y vite-reporter lo marca).
10. **Panel admin** para revisar conversaciones, plate analyses, y plans semanales generados.

### Mantenidos (futuro)

- Cobertura multimodal extendida (audio/video).
- Cache invalidation por evento de cambio de perfil P0 (hoy el TTL hace el trabajo).
- Internacionalización de prompts.

---

## Cómo probar localmente

Ver checklist reproducible en [docs/ai/features/final-mvp-smoke-test.md](ai/features/final-mvp-smoke-test.md).

Resumen rápido:

```bash
# 1. Mongo
docker compose up -d mongo

# 2. Backend
cd backend && cp .env.example .env  # añadir GEMINI_API_KEY y opcional DEEPSEEK_API_KEY
npm ci && npm run seed:ai-prompts && npm run dev

# 3. Frontend
cd frontend && npm ci && npm run dev

# 4. Validación
cd backend  && npm run lint && npm test
cd frontend && npm run lint && npm run build
```

---

## Ver también

- [docs/ai/features/provider-router-gemini-deepseek.md](ai/features/provider-router-gemini-deepseek.md) — router de proveedor texto/imagen y fallback.
- [docs/ai/features/user-assistant-dashboard.md](ai/features/user-assistant-dashboard.md) — `/asistente-ia` (pantalla producto).
- [docs/ai/features/plate-analysis-product-flow.md](ai/features/plate-analysis-product-flow.md) — flujo de RegistrarComida + guardado.
- [docs/ai/features/final-mvp-smoke-test.md](ai/features/final-mvp-smoke-test.md) — checklist de smoke MVP.
- [docs/ai/features/auth-real-context.md](ai/features/auth-real-context.md) — detalle de la feature de auth real y override de `userId`.
- [docs/ai/features/conversations-pagination.md](ai/features/conversations-pagination.md) — detalle del listado paginado.
- [docs/ai-module-architecture.md](ai-module-architecture.md) — arquitectura interna del módulo (servicios, providers, prompts, cache).
- [docs/ai-module-demo-guide.md](ai-module-demo-guide.md) — guion de demo del módulo IA.
