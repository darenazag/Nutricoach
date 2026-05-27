# Memoria técnica — Módulo IA NutriCoach

> Versión: borrador para entrega bootcamp / revisión del equipo
> Rama: `docs/technical-memory-ai-module`
> Base funcional: `integration/full-integration-sanitized`
> Fecha: 2026-05-27

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Objetivos del módulo IA](#2-objetivos-del-módulo-ia)
3. [Arquitectura general](#3-arquitectura-general)
4. [Integración con P0](#4-integración-con-p0)
5. [Seguridad y autenticación](#5-seguridad-y-autenticación)
6. [Proveedores IA](#6-proveedores-ia)
7. [Funcionalidades implementadas](#7-funcionalidades-implementadas)
8. [Flujo técnico de análisis de plato](#8-flujo-técnico-de-análisis-de-plato)
9. [Persistencia](#9-persistencia)
10. [Validación y pruebas](#10-validación-y-pruebas)
11. [Problemas encontrados y soluciones](#11-problemas-encontrados-y-soluciones)
12. [Decisiones técnicas relevantes](#12-decisiones-técnicas-relevantes)
13. [Deuda técnica y siguientes pasos](#13-deuda-técnica-y-siguientes-pasos)
14. [Conclusión](#14-conclusión)

---

## 1. Resumen ejecutivo

**NutriCoach** es una aplicación web cuyo MVP P0 ya ofrecía: registro de usuario, perfil nutricional con cálculo de TMB/TDEE, registro de comidas y dashboard de progreso. Está implementada con React + TypeScript + Vite en el frontend y Node.js + Express + TypeScript + PostgreSQL en el backend.

El **módulo IA** añade al MVP la capa de inteligencia que diferencia el producto:

- **Asistente conversacional nutricional**: chat multi-turno con un nutricionista virtual.
- **Análisis de platos por imagen**: el usuario sube una foto y la IA identifica alimentos, estima macronutrientes y sugiere ajustes.
- **Generación de menús**: menú diario orientativo y plan semanal completo (7 días).
- **Guardado de comidas analizadas**: integra el resultado de la IA con el dashboard P0 sin que el usuario tenga que reintroducir los datos.
- **Integración transparente con dashboard/perfil**: la comida guardada vía IA aparece en el dashboard sin tocar el frontend P0.

El módulo está **operativo como MVP** y validado localmente. La cobertura de tests es de **101/101** en backend, lint y build limpios en frontend.

---

## 2. Objetivos del módulo IA

### Objetivos funcionales

| Objetivo | Cómo se cumple |
|---|---|
| Asistencia nutricional orientativa | Chat IA accesible desde `/asistente-ia` con contexto del perfil del usuario |
| Mejorar la experiencia de registro de comidas | El usuario sube una foto y obtiene macros estimados sin teclear |
| Reducir la fricción usando análisis de imagen | Una sola pantalla `/registrar-comida` cubre subida, análisis y guardado |
| Planificar alimentación a corto plazo | Generación asíncrona de menú semanal con polling de progreso |
| Mantener seguridad por usuario | Cada respuesta IA queda asociada al `userId` autenticado, sin posibilidad de impersonación |

### Objetivos técnicos

| Objetivo | Cómo se cumple |
|---|---|
| Integrar IA sin romper P0 | Adaptadores legacy `/api/ai/analyze` y `/analyze-preview` preservan los contratos que ya usaban `AIBubble.tsx` y `RegistrarComida.tsx` |
| Aislar datos IA de datos funcionales | Mongo para conversaciones, plate analyses y weekly plans; PostgreSQL para perfil, comidas y dashboard |
| Routing de proveedor con criterio de coste | DeepSeek para texto, Gemini para imagen, fallback automático |
| Validación estricta de entrada/salida | Zod en cada endpoint, tanto para request body como para output del LLM |
| Auditabilidad | Cada análisis y conversación queda persistido en Mongo aunque sea cache hit |

---

## 3. Arquitectura general

### Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + React Router |
| Backend | Node.js 20 + Express + TypeScript + Mongoose 9 + Zod |
| Base de datos funcional | PostgreSQL (vía Sequelize/pg) |
| Base de datos IA | MongoDB (vía Mongoose) |
| Proveedor LLM texto | DeepSeek (HTTP cliente propio) |
| Proveedor LLM multimodal | Gemini (`@google/genai`) |
| Procesamiento de imagen | `sharp` (resize y normalización antes de mandar a Gemini) |
| Auth | JWT (`jsonwebtoken`) con secret en `.env` |

### Diagrama textual

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Vite)                         │
│                                                                  │
│   /perfil           ─── lee comidas P0 (Profile, Profile_Meal)   │
│   /registrar-comida ─── subir imagen + análisis IA + guardar     │
│   /asistente-ia     ─── chat, menú semanal, CTA análisis         │
│   /ai-lab           ─── pantalla técnica QA/dev                  │
│                                                                  │
│   services/api.ts    ─── cliente P0 (con normalización errores)  │
│   services/aiApi.ts  ─── cliente AI Lab (mismo token P0)         │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               │ JWT en localStorage          │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│   BACKEND P0             │    │   BACKEND MÓDULO IA             │
│   /api/auth              │    │   /api/ai/* (todos con JWT)     │
│   /api/profile           │    │   ├─ /chat                       │
│   /api/meals             │    │   ├─ /menu, /menu/weekly         │
│   /api/foods             │    │   ├─ /profile-explanation        │
│                          │    │   ├─ /plate-analysis             │
│                          │    │   ├─ /analyze (legacy)           │
│                          │    │   ├─ /analyze-preview (legacy)   │
│                          │    │   ├─ /save-analyzed-meal (new)   │
│                          │    │   └─ /conversations              │
└──────────┬───────────────┘    └────────┬──────────────────┬─────┘
           │                             │                  │
           ▼                             ▼                  ▼
   ┌──────────────┐              ┌──────────────┐    ┌────────────┐
   │  PostgreSQL  │              │   MongoDB    │    │ Providers  │
   │              │              │              │    │            │
   │  User        │              │  AiConv.     │    │  DeepSeek  │
   │  Profile     │              │  AiMessage   │    │  Gemini    │
   │  Meal        │◄─────────────┤  AiPlateAna. │    │            │
   │  Profile_Meal│  save-       │  AiWeeklyPlan│    │            │
   │              │  analyzed-   │  AiCacheEntry│    │            │
   │              │  meal        │  AiPromptTpl │    │            │
   └──────────────┘              └──────────────┘    └────────────┘
```

### Separación de responsabilidades

| Capa Mongo / IA | Capa Postgres / P0 |
|---|---|
| `AiConversation`, `AiMessage` | `User`, `Profile` |
| `AiPlateAnalysis` (resultado IA crudo) | `Meal`, `Profile_Meal` (lo que ve el dashboard) |
| `AiWeeklyMenuPlan`, `AiWeeklyMenuDay` | — |
| `AiCacheEntry` (cache por hash) | — |
| `AiPromptTemplate` (plantillas con versión) | — |

El módulo IA **no escribe** en PostgreSQL salvo en el endpoint puente `/api/ai/save-analyzed-meal` (explicado en §8). El resto de su persistencia vive en Mongo.

---

## 4. Integración con P0

La regla arquitectónica que rige todo el módulo IA es explícita:

> **NO adaptar el frontend/base P0 al módulo IA.**
> **SÍ adaptar el módulo IA al frontend/base P0.**

Esto significa que pantallas existentes (`Profile`, `RegistrarComida`, `AIBubble`) **no se rediseñan** para encajar con la IA; en su lugar, la IA expone endpoints que respetan los contratos que esas pantallas ya usaban.

### Puntos de integración concretos

| Pantalla P0 | Cómo integra con IA |
|---|---|
| `Profile.tsx` / Dashboard | Lee `/api/meals/profile/mine` (P0). Las comidas guardadas vía IA aparecen ahí sin modificar el componente |
| `RegistrarComida.tsx` | Llama `/api/ai/analyze-preview` para análisis enriquecido y `/api/ai/save-analyzed-meal` para guardar. Sigue mostrando los inputs editables del MVP P0 |
| `AIBubble.tsx` (cápsula flotante) | Sigue llamando `/api/ai/analyze` sin cambios. Solo le exigimos un JWT válido (que ya tenía) |
| `Header.tsx` | Se le añadió un link "🤖 Asistente IA" en el dropdown del avatar — única modificación visual real |

### Por qué no se reescribe la app base

- **MVP demostrable rápido**: el equipo necesita un módulo IA funcionando sobre la app que ya existe, no una refundación.
- **Riesgo controlado**: cualquier bug del módulo IA no rompe el resto de la app porque las pantallas P0 siguen ejerciendo sus contratos previos.
- **Roadmap claro**: cuando el equipo P0 amplíe sus endpoints (ver deuda técnica), el módulo IA podrá deprecar sus workarounds (como `/save-analyzed-meal`) sin retoques en frontend.

---

## 5. Seguridad y autenticación

### Reglas

1. **JWT obligatorio en todos los endpoints `/api/ai/*`** mediante una sola línea al inicio del router:
   ```ts
   aiRouter.use(authenticate);
   ```
   Una petición sin `Authorization: Bearer <token>` válido devuelve `401` antes de tocar ningún controller.

2. **`userId` siempre se deriva de `req.auth.sub`** (lo pone el middleware tras verificar el JWT).

3. **`body.userId` y `query.userId` se ignoran** aunque el cliente los envíe manipulados (p. ej. `"hacker"`). Cada controller hace:
   ```ts
   { ...body, userId: String(req.auth!.sub) }
   ```
   justo antes de invocar al service.

4. **Ownership en conversaciones**: `findConversationByIdAndUser({conversationId, userId})` filtra siempre. Una conversación que existe pero pertenece a otro usuario devuelve **`not_found`** — mismo código que la inexistente — para no filtrar qué IDs existen en el sistema.

5. **Listado paginado de conversaciones** filtra siempre por `{ userId }` en el repository, tanto en `find` como en `countDocuments`. No existe forma de obtener conversaciones ajenas.

### Cobertura por endpoint

| Endpoint | `userId` fuente | Ownership extra |
|---|---|---|
| POST `/chat`, `/menu`, `/menu/weekly`, `/profile-explanation`, `/plate-analysis` | `req.auth.sub` (sobrescribe body) | — |
| GET `/menu/weekly/:planId` | lookup por planId | refuerzo pendiente |
| GET `/conversations` | `req.auth.sub` (ignora query) | filtro `{userId}` en repo |
| GET `/conversations/:conversationId` | `req.auth.sub` | cross-user → `not_found` |
| POST `/analyze`, `/analyze-preview` | `req.auth.sub` vía adapter | — |
| POST `/save-analyzed-meal` | `req.auth.sub` (no admin) | bypass de `requireAdmin` de P0 — ver §8 y §13 |

### Frontend

Tanto el cliente P0 (`services/api.ts`) como el cliente AI Lab (`services/aiApi.ts`) leen el **mismo** `localStorage.getItem('token')`. Esto significa que el login del frontend P0 sirve para autenticar también al módulo IA — no hay dos sesiones.

---

## 6. Proveedores IA

### Asignación por modalidad

| Modalidad | Provider primario | Fallback | Por qué |
|---|---|---|---|
| Texto (chat, profile-explanation, menu, weekly menu) | **DeepSeek** | Gemini | Coste/token significativamente menor |
| Imagen / multimodal (análisis de plato) | **Gemini** | — | DeepSeek no soporta visión multimodal hoy |

### Variables `.env` relevantes

> Los valores reales **nunca** se commitean al repo.

```env
# Toggle global de DeepSeek
AI_ENABLE_DEEPSEEK=true

# Proveedor primario para texto
AI_TEXT_PROVIDER=deepseek

# Keys (rellenar en .env real)
DEEPSEEK_API_KEY=
GEMINI_API_KEY=

# Endpoints / modelos (opcionales; defaults razonables)
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=
GEMINI_MODEL=
```

Para que el texto use DeepSeek se requieren **ambos** toggles: `AI_ENABLE_DEEPSEEK=true` **y** `AI_TEXT_PROVIDER=deepseek`. Si falta cualquiera, el router cae a Gemini sin error visible.

### Fallback Gemini para texto

No solo se dispara si DeepSeek tira (red, 5xx, timeout): también cuando DeepSeek responde pero el JSON **no pasa validación Zod**. Casos típicos:
- DeepSeek devuelve JSON con campos extra/faltantes vs el schema esperado.
- DeepSeek omite parte del JSON Schema en menús largos.
- DeepSeek devuelve texto plano cuando el endpoint pide JSON estricto.

El endpoint donde esto se ve con más frecuencia hoy es `/api/ai/menu/weekly`, que necesita estructura anidada estricta. Es **deuda técnica conocida** (ver §13).

### Limitaciones actuales

- **Rate limit por user**: no implementado. Token válido = peticiones sin tope dentro de la cuota del backend.
- **Métricas reales de tokens**: no expuestas. El campo `realTokensAvailable: false` en `/menu/weekly/:planId` lo refleja.
- **`GEMINI_API_KEY` ausente**: el módulo de plate-analysis devuelve `provider_error` desde `runAiPlateAnalysis`.

---

## 7. Funcionalidades implementadas

### 7.1 Chat IA

- Endpoint: `POST /api/ai/chat`.
- Soporta multi-turno: el frontend mantiene un `conversationId` y lo envía en peticiones posteriores para que el backend asocie todos los mensajes a la misma conversación.
- Provider: DeepSeek (cuando activo); fallback Gemini.
- Persistencia: cada par `user_message` + `assistant_message` queda guardado en Mongo como `AiMessage` asociado a un `AiConversation`.
- Validación: Zod en request y en output del LLM.

### 7.2 Asistente IA de usuario `/asistente-ia`

- Pantalla producto para el usuario final, accesible desde el dropdown del avatar en el `Header`.
- Tres tabs:
  - **Chat IA** — conversación libre.
  - **Menú Semanal** — genera plan de 7 días con polling.
  - **Análisis de Plato (CTA)** — redirige a `/registrar-comida` (que ya implementa el upload).
- Protección de acceso: si `isAuthenticated === false` → `<Navigate to="/login" replace />`.
- Diferencia con `/ai-lab`: aquí no se muestra metadata técnica (provider/model/cached); el foco es UX.

### 7.3 AI Lab técnico `/ai-lab`

- Pantalla de QA/dev. Conserva forms técnicos con JSON crudo de respuestas, incluida `metadata.provider` y `metadata.model`.
- Cubre todos los endpoints IA individualmente (chat, menu, weekly menu, plate-analysis, profile-explanation, conversaciones).
- No visible para el usuario final desde Header: accesible navegando a `/ai-lab` directamente.

### 7.4 Menú semanal IA

- Endpoint async: `POST /api/ai/menu/weekly` → `202 Accepted` + `{ planId }`.
- Polling: `GET /api/ai/menu/weekly/:planId` cada ~4 s desde frontend.
- Backend genera **día a día**: cada día es una llamada al provider para evitar problemas de JSON largo y permitir recuperación parcial.
- Modelos Mongo: `AiWeeklyMenuPlan` (estado, progreso, contadores) + `AiWeeklyMenuDay` (datos de cada día).
- Estado final: `completed` (7/7) | `partial_failed` (≥1 fallo, ≥1 éxito) | `failed` (todos fallaron).

### 7.5 Análisis de plato por imagen

- Endpoint: `POST /api/ai/plate-analysis` (multipart). Versión legacy `POST /api/ai/analyze-preview` para `RegistrarComida.tsx`.
- Pipeline: validar mime/tamaño → resize con `sharp` → Gemini Vision → Zod schema sobre la salida → persistir `AiPlateAnalysis` en Mongo.
- Cache 24 h por SHA-256 de `(imagen + prompt + modelo)`: subir la misma imagen dos veces no consume API.
- Detalle del flujo completo en §8.

### 7.6 Guardado de comida analizada

- Endpoint nuevo (workaround MVP): `POST /api/ai/save-analyzed-meal`.
- Genera `meal_id = Date.now()` (la tabla `Meal` no tiene autoincrement), crea la fila en PostgreSQL y la asigna al user en `Profile_Meal`.
- Requiere solo JWT (no admin), a diferencia de `POST /api/meals` que está bloqueado por `requireAdmin` — ver §11 y §13.

### 7.7 Conversaciones paginadas

- `GET /api/ai/conversations?page=&limit=` (defaults `1` y `10`, max `50`).
- Estrategia anti-clamping: `limit > 50` → `validation_error` (no silenciar para evitar que el cliente crea que recibió la ventana completa).
- Orden: `updatedAt desc` con `createdAt desc` como tiebreaker.
- Ownership en tres capas: controller → service → repository, sin posibilidad de bypass.

---

## 8. Flujo técnico de análisis de plato

Paso a paso, desde que el usuario sube la imagen hasta que la comida aparece en el dashboard:

```
1. Usuario en /registrar-comida → tab Foto → sube imagen
                │
                ▼
2. Frontend: mealService.analyzeImage(file)
   POST /api/ai/analyze-preview  (multipart, campo "image")
                │
                ▼
3. Backend: aiLegacyAnalyze.controller.postAnalyzePreview
   ├─ multer parsea y valida (mime, tamaño <5 MB)
   ├─ sharp redimensiona si el lado mayor >1024 px
   └─ buildAiPlateContextFromP0User(req.auth.sub) lee
      objective y caloriesTarget desde el perfil P0
                │
                ▼
4. Service: runAiPlateAnalysis(input)
   ├─ Cache check: SHA-256(imagen + prompt + modelo)
   │   ├─ HIT  → reutiliza resultado, ahorra llamada
   │   └─ MISS → llama a Gemini Vision con el prompt
   ├─ Zod valida la salida del LLM
   └─ Persiste SIEMPRE un nuevo AiPlateAnalysis en Mongo
      (audit trail, incluso en cache hit)
                │
                ▼
5. Backend responde:
   {
     analysis: { name, calories, protein, fat, carbs, source },
     analysisId, responseText, detectedFoods,
     proportions, recommendations, warnings, confidence
   }
                │
                ▼
6. Frontend muestra análisis enriquecido:
   ├─ responseText (resumen IA)
   ├─ detectedFoods con tags coloreadas por confianza
   ├─ proportions (P/HC/Veg/G)
   ├─ recommendations + warnings
   └─ Inputs editables: name, kcal, P, G, HC
                │
                ▼
7. Usuario revisa, ajusta valores si quiere y selecciona
   categoría (Desayuno / Almuerzo / Merienda / Cena)
                │
                ▼
8. Pulsa Guardar
   Frontend: mealService.saveAnalyzedMeal(payload)
   POST /api/ai/save-analyzed-meal (JSON)
                │
                ▼
9. Backend: aiLegacyAnalyze.controller.postSaveAnalyzedMeal
   ├─ Zod valida el body
   ├─ meal_id = Date.now()
   ├─ mealModel.create({ meal_id, ...payload, img:null, source })
   └─ profileModel.assignMeal(userId, meal_id)
                │
                ▼
10. 201 + { success, data: { meal } }
    Frontend: navigate('/perfil')
    Profile dashboard ya muestra la comida vía /api/meals/profile/mine
```

### Notas técnicas relevantes

- **El `name` se trunca a ≤100 caracteres** en el backend antes de devolverlo al frontend. La columna `Meal.name` en PostgreSQL es `varchar(100) NOT NULL` y el Zod schema de `/save-analyzed-meal` también caps en `.max(100)`. Cuando Gemini detecta varios alimentos, el `join(', ')` de sus nombres puede superar fácilmente 100 chars y disparar `400` aguas abajo. Truncar en `analyze-preview` garantiza que el input editable nunca arranca con un valor inválido.

- **`POST /api/meals` exige `requireAdmin`**, por contrato P0. Un user normal recibiría `403`. Por eso existe `POST /api/ai/save-analyzed-meal` como workaround MVP: solo pide JWT y hace meal-create + assign en una sola llamada.

- **Deuda técnica**: la solución correcta a largo plazo es revisar el contrato P0 para permitir que un user autenticado cree sus propias comidas, y entonces **deprecar `/save-analyzed-meal`**. Documentado como #2 en §13.

### Persistencia dual

| Sistema | Qué guarda | Cuándo |
|---|---|---|
| **Mongo** (`AiPlateAnalysis`) | Análisis completo (responseText, detectedFoods, estimatedNutrition, proportions, recommendations, warnings, metadata, safety) | **Siempre**, en cada llamada a `/analyze-preview` |
| **PostgreSQL** (`Meal` + `Profile_Meal`) | Comida editable del dashboard (name, calories, protein, fat, carbs, source) y su asignación al user | **Solo si el user pulsa Guardar** |

El análisis IA es un artefacto auditable y vive con el resto del módulo IA en Mongo. La comida visible en el dashboard P0 vive en PostgreSQL, integrada con el resto del schema P0.

---

## 9. Persistencia

### PostgreSQL (datos funcionales / P0)

| Tabla | Contenido |
|---|---|
| `User` | Cuentas (id, name, email, password) |
| `Profile` | Perfil nutricional (peso, edad, altura, objetivo, TMB, TDEE) |
| `Meal` | Catálogo de comidas (id, nombre, macros) — `varchar(100)` para el `name` |
| `Profile_Meal` | Asignación user ↔ comida |
| `Food_item` | Alimentos individuales por porción estándar |
| `Meal_Food_item` | Composición de cada comida |

### MongoDB (datos del módulo IA)

| Colección | Contenido |
|---|---|
| `AiConversation` | Metadatos de conversación: userId, type, status, provider, timestamps |
| `AiMessage` | Mensajes individuales asociados a una conversación (user / assistant / system) |
| `AiPlateAnalysis` | Análisis crudo de cada subida de imagen (audit trail) |
| `AiWeeklyMenuPlan` | Cabecera de un plan semanal: estado, progreso, contadores |
| `AiWeeklyMenuDay` | Cada día de un plan semanal por separado, recuperable individualmente |
| `AiCacheEntry` | Cache key/value con TTL por tipo de interacción |
| `AiPromptTemplate` | Plantillas de prompt con `promptVersion` para auditar evoluciones |

### Por qué dos bases

- **Aislamiento de modelos**: el schema P0 está estable y heredado; el módulo IA evoluciona rápido y necesita flexibilidad de documento.
- **Coste y queries distintos**: las queries de IA son por hash, paginación y filtros simples; PostgreSQL queda para joins y agregaciones P0.
- **Roadmap independiente**: si en producción se decide cachear plate analyses en Redis o mover prompts a S3, no afecta a la base P0.

---

## 10. Validación y pruebas

### Comandos

```bash
# Backend
cd backend && npm run lint && npm test

# Frontend
cd frontend && npm run lint && npm run build
```

### Resultados actuales

| Validación | Resultado |
|---|---|
| Backend lint (`tsc --noEmit`) | ✅ 0 errores |
| Backend tests (Vitest) | ✅ **101/101 en 11 ficheros** (~12 s) |
| Frontend lint (ESLint) | ✅ 0 errores (2 warnings preexistentes en `MenuSugerido`, fuera de scope) |
| Frontend build (`tsc -b && vite build`) | ✅ OK (warning de chunk >500 kB, deuda conocida) |

### Composición de tests backend

| Fichero | Tests |
|---|---|
| `aiAuthOverride.controller.test.ts` | 11 |
| `aiConversations.service.test.ts` | 17 |
| `aiLegacyAnalyze.test.ts` | 9 |
| `aiMenu.service.test.ts` | ~6 |
| `aiPlateAnalysis.service.test.ts` | ~7 |
| `aiProfileExplanation.service.test.ts` | ~5 |
| `aiProviderRouter.service.test.ts` | ~9 |
| `aiWeeklyMenu.service.test.ts` | ~7 |
| `deepseekClient.test.ts` | ~6 |
| `errorHandler.test.ts` | ~5 |
| `nutricoachContext.adapter.test.ts` | 10 |
| **Total** | **101** |

- **`mongodb-memory-server`** se usa para tests que tocan modelos Mongoose (no requiere Mongo real).
- **Gemini y DeepSeek están mockeados** en todos los tests — no se consume cuota real durante CI.

### Smoke manual MVP

Checklist completo y reproducible en [docs/ai/features/final-mvp-smoke-test.md](ai/features/final-mvp-smoke-test.md). Resumen:

1. Login en `/login`.
2. Chat en `/asistente-ia` → tab Chat IA.
3. Subir imagen en `/registrar-comida`.
4. Guardar comida y verificar que aparece en dashboard.
5. Generar menú semanal en `/asistente-ia` → tab Menú Semanal.

### Endpoints probados (smoke)

- `POST /api/ai/chat` ✅
- `POST /api/ai/analyze-preview` ✅
- `POST /api/ai/save-analyzed-meal` ✅ (la fix del 400 ya aplicada)
- `POST /api/ai/menu/weekly` + `GET /api/ai/menu/weekly/:planId` ✅
- `POST /api/ai/analyze` (vía AIBubble) ✅ — backward compat preservada

---

## 11. Problemas encontrados y soluciones

Durante el desarrollo aparecieron varios bloqueos. Documento los principales con la causa y la solución aplicada.

| # | Problema | Causa | Solución |
|---|---|---|---|
| 1 | Análisis de plato devuelve `provider_error` | `GEMINI_API_KEY` ausente o inválida en `.env` | Documentar como pre-requisito en smoke test; el backend marca el error explícitamente para distinguirlo de bugs de código |
| 2 | `MongooseServerSelectionError: Authentication failed` | Mongo en `27018` (no estándar) pero `.env` apuntaba a `27017` | Ajustar `MONGO_URI` en `.env`; documentar la posibilidad de drift de puertos en smoke test |
| 3 | `EADDRINUSE :::3000` al arrancar backend | Otro backend zombi sobrevivió a un crash o reload | `lsof -ti:3000 \| xargs kill -9`; documentado en smoke como error común |
| 4 | `{"error":"Falta el token de autenticacion"}` (401) | Sesión expirada o `localStorage.token` limpiado | Login de nuevo; el guard de `/asistente-ia` redirige a `/login` automáticamente |
| 5 | `POST /api/meals` devolvía 403 al guardar comida | El endpoint P0 exige `requireAdmin` por contrato | **Nuevo endpoint `POST /api/ai/save-analyzed-meal`** que solo requiere JWT y crea meal + assign en una llamada |
| 6 | `400 Bad Request` al guardar tras análisis | El `name` generado por la IA al unir alimentos detectados superaba 100 chars y Zod (+ `varchar(100)` de la DB) lo rechazaba | Truncar `name` a 100 chars (con elipsis si excede) en `postAnalyzePreview` antes de devolverlo al frontend |
| 7 | Errores del módulo IA aparecían como `[object Object]` en alert y `console.error` | `api.ts` hacía `new ApiError(data.error, status)` y `data.error` era el objeto `{code, message}` del módulo IA, no un string | **Normalizar en `api.ts`**: extraer `.message` cuando `data.error` es objeto, usar directamente cuando es string. Eliminó el `[object Object]` globalmente |
| 8 | Weekly menu cae a Gemini en algunos días | DeepSeek no respeta siempre el JSON Schema estricto en estructuras anidadas largas | Fallback automático a Gemini para mantener el resultado correcto. **Documentado como deuda técnica** (#9 en §13) |

Lección recurrente: **enmascarar errores es el bug que multiplica todos los demás**. Una vez `api.ts` empezó a surfear los mensajes reales del backend, todos los bugs siguientes fueron diagnosticables en minutos en lugar de horas.

---

## 12. Decisiones técnicas relevantes

### No tocar P0 más de lo necesario

Decisión: el módulo IA se adapta a P0. Pantallas como `Profile`, `RegistrarComida` o `AIBubble` mantienen sus contratos. Solo se permitió tocar:
- `Header.tsx` para añadir el link a `/asistente-ia`.
- `RegistrarComida.tsx` para enriquecer el display del análisis y cambiar el endpoint de guardado.

**Por qué**: bajo riesgo de regresión en P0, MVP en menos tiempo, claridad de boundary entre módulos.

### Crear `/asistente-ia` en lugar de convertir `/ai-lab`

Decisión: `/ai-lab` ya tenía rasgos de pantalla técnica (JSON crudo, metadata visible, controles granulares). Convertirlo a pantalla producto habría requerido reescribir UX y mantener dos modos.

**Solución**: pantalla nueva `/asistente-ia` con UX de producto y tabs, vinculada desde Header. `/ai-lab` se mantiene oculto para QA/dev.

### Mantener `/ai-lab` como QA/dev

Decisión: no eliminar `/ai-lab` aunque exista `/asistente-ia`. `/ai-lab` sigue siendo útil para:
- Probar endpoints individuales con payloads custom.
- Ver `metadata.provider` y `metadata.model` para confirmar el routing DeepSeek/Gemini.
- Smoke rápido sin tener que pasar por la UX completa.

### DeepSeek para coste, Gemini para imagen

Decisión: enrutar texto a DeepSeek (más barato) y multimodal a Gemini (única opción viable hoy). Fallback automático entre ellos.

**Trade-off conocido**: cuando DeepSeek no respeta el JSON Schema, el coste se multiplica por la llamada al fallback. Es deuda técnica (#9 en §13) pero el comportamiento es correcto.

### Documentar deuda técnica en vez de sobredimensionar MVP

Decisión: en lugar de implementar rate limiting, CI, panel admin, métricas de tokens, etc. desde el MVP, **documentar explícitamente** que son deuda técnica conocida y dejarlos para iteraciones posteriores.

**Razón**: el MVP demuestra valor de producto end-to-end. Añadir infraestructura no demostrable habría alargado la entrega sin valor visible.

---

## 13. Deuda técnica y siguientes pasos

Lista priorizada por impacto operativo y de producto:

1. **PR final a `dev`** tras revisión del equipo. Hoy el MVP vive en `integration/full-integration-sanitized`; queda integrarlo en la rama compartida y, eventualmente, `main`.
2. **Permisos P0 para users creando comidas**: revisar `POST /api/meals` para permitir que un user autenticado cree sus propias comidas. Una vez disponible, **deprecar `/api/ai/save-analyzed-meal`** y mover `RegistrarComida` a usar el endpoint P0 directamente.
3. **Rate limiting / control de coste** por usuario y por plan (`free` vs `pro`), idealmente delante de `authenticate` para que un token válido siga rate-limited.
4. **CI mínimo**: GitHub Actions que ejecute `npm run lint` y `npm test` (backend) + `npm run lint` y `npm run build` (frontend) en cada PR contra `integration/full-integration-sanitized` o `main`.
5. **Docker demo / producción unificado**: `docker-compose.yml` con servicios Mongo + Postgres + API + frontend bajo un solo comando.
6. **Prompts en runtime desde Mongo**: hoy las plantillas vienen de `getDefaultPromptTemplate` en memoria. Mover a `AiPromptTemplate` cargado desde Mongo permitiría iterar prompts sin redeploy.
7. **Panel admin IA**: revisar conversaciones, plate analyses y weekly plans generados, con búsqueda básica y métricas por usuario.
8. **Métricas reales de tokens y coste** por usuario / conversación, expuestas en el panel admin. Hoy `realTokensAvailable: false` en las respuestas.
9. **Mejorar weekly menu DeepSeek/Zod**: refinar prompt y parser para que DeepSeek respete el JSON Schema sin disparar el fallback Gemini en el caso típico.
10. **`VITE_API_URL` unificado** entre P0 (`services/api.ts`) y AI Lab (`services/aiApi.ts`) para evitar drift en producción.
11. **Bundle splitting con `React.lazy`** para AI Lab / Asistente IA. Hoy el bundle JS pasa de 500 kB y vite-reporter lo marca.

### Mantenidos (futuro)

- Cobertura multimodal extendida (audio/video).
- Cache invalidation por evento de cambio de perfil P0 (hoy el TTL hace el trabajo).
- Internacionalización de prompts.

---

## 14. Conclusión

El módulo IA de NutriCoach está:

- **Integrado** con la base P0 sin haber roto su contrato (pantallas P0 intactas salvo lo estrictamente necesario).
- **Validado localmente** con lint y tests en verde en ambos lados (backend 101/101, frontend OK).
- **Documentado** con resumen ejecutivo, feature docs por área y un checklist de smoke reproducible.
- **Preparado para revisión del equipo** y futura integración en `dev` y `main`.

El MVP entrega valor de producto demostrable end-to-end: el usuario sube una foto de comida, la IA la analiza, el usuario ajusta si quiere y la comida queda registrada en su dashboard sin teclear macros. Como complemento, dispone de un asistente conversacional y planificación semanal accesibles desde una pantalla pensada para él.

La deuda técnica conocida está documentada y priorizada, con la fix más arquitectónica (permisos P0) ya identificada como el siguiente paso natural. Ninguna deuda bloquea la demo del MVP; todas son mejoras de robustez, coste o experiencia operativa.

---

## Referencias

- [docs/ai-module-current-status.md](ai-module-current-status.md) — estado actual del módulo IA.
- [docs/ai/features/provider-router-gemini-deepseek.md](ai/features/provider-router-gemini-deepseek.md) — router de proveedor.
- [docs/ai/features/user-assistant-dashboard.md](ai/features/user-assistant-dashboard.md) — pantalla `/asistente-ia`.
- [docs/ai/features/plate-analysis-product-flow.md](ai/features/plate-analysis-product-flow.md) — flujo de RegistrarComida.
- [docs/ai/features/final-mvp-smoke-test.md](ai/features/final-mvp-smoke-test.md) — smoke MVP reproducible.
- [docs/ai/features/auth-real-context.md](ai/features/auth-real-context.md) — feature de auth real.
- [docs/ai/features/conversations-pagination.md](ai/features/conversations-pagination.md) — listado paginado.
- [docs/ai-module-architecture.md](ai-module-architecture.md) — arquitectura interna del módulo.
- [docs/ai-module-demo-guide.md](ai-module-demo-guide.md) — guion de demo.
