# NutriCoach

Aplicación full-stack de guía nutricional orientativa, con perfil de usuario, objetivos, registro de comidas, dashboard y módulo de inteligencia artificial integrado.

> Proyecto final de bootcamp Full Stack. Esta versión es el **MVP funcional** del producto.

---

## Estado actual

- ✅ **MVP funcional** y validado en local.
- ✅ **Módulo IA integrado** (chat, menú semanal, análisis de plato por imagen, guardado de comida).
- ✅ **Backend lint OK · 101/101 tests pasando.**
- ✅ **Frontend lint 0 errores · build OK.**
- ⏳ **Despliegue VPS: pendiente.** Próximo paso del proyecto. Variables de producción y plan de despliegue todavía no aplicados.
- ⚠️ **No es una aplicación médica.** Las recomendaciones son orientativas y educativas (ver [Aviso de responsabilidad](#aviso-de-responsabilidad)).

---

## Aviso de responsabilidad

NutriCoach ofrece recomendaciones **orientativas y educativas** sobre hábitos saludables.

No sustituye el criterio de profesionales sanitarios, médicos, dietistas o nutricionistas. La aplicación **no debe utilizarse** para diagnóstico médico, tratamiento de enfermedades, dietas clínicas ni decisiones relacionadas con patologías, medicación o trastornos alimentarios.

Las estimaciones de calorías, macronutrientes o alimentos detectados por IA pueden ser imprecisas y son siempre revisables y editables por el usuario antes de guardarse.

---

## Funcionalidades principales

- **Registro / login** con JWT.
- **Perfil nutricional** (peso, altura, edad, objetivo, factor de actividad → TMB y TDEE calculados).
- **Dashboard** con calorías, macros, progreso y proyección de peso a 100 días.
- **Registro de comidas** (manual + por imagen analizada con IA).
- **Menú sugerido del día** con preview de alimentos (fallback local P0).
- **Asistente IA** (`/asistente-ia`): pantalla de producto para usuario final.
- **Chat IA** multi-turno con contexto del perfil.
- **Menú semanal IA** asíncrono (202 + polling, 7 días, recuperación parcial).
- **Análisis de plato por imagen**: foto → detección de alimentos → estimación de macros → guardado en dashboard.
- **Documentación técnica** completa en `docs/`.

> Pantalla técnica `/ai-lab` reservada a QA / desarrollo, no es visible desde el Header.

---

## Módulo IA — resumen

| Modalidad | Proveedor primario | Fallback | Por qué |
|---|---|---|---|
| Texto (chat, menú, profile-explanation) | **DeepSeek** | Gemini | Coste/token significativamente menor |
| Imagen / multimodal (análisis de plato) | **Gemini** | — | DeepSeek no soporta visión multimodal hoy |

- Persistencia IA en **MongoDB** (conversaciones, plate analyses, menús semanales, cache).
- Persistencia funcional en **PostgreSQL** (perfil, comidas, asignaciones, dashboard).
- Auth obligatorio en todos los `/api/ai/*` (`aiRouter.use(authenticate)`).
- `userId` siempre derivado de `req.auth.sub` (nunca del body o query).

Detalle completo: [docs/ai/features/provider-router-gemini-deepseek.md](docs/ai/features/provider-router-gemini-deepseek.md).

---

## Arquitectura técnica

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + React Router | SPA, dashboard, formularios, chat IA, subida de imagen |
| Backend | Node 20 + Express + TypeScript | API REST, auth JWT, validación Zod, módulo IA |
| Base de datos funcional | PostgreSQL (pg) | Usuarios, perfiles, comidas, asignaciones |
| Base de datos IA | MongoDB (Mongoose) | Conversaciones, plate analyses, weekly plans, cache, prompts |
| Providers IA | DeepSeek (texto) + Gemini (imagen + fallback texto) | Generación de contenido nutricional |
| Procesamiento imagen | sharp | Resize y normalización pre-Gemini |
| Validación | Zod | Request/response en cada endpoint AI |
| Testing | Vitest + mongodb-memory-server | 101/101 backend tests |

### Diagrama textual

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Vite)                         │
│   /perfil           ─── dashboard + menú sugerido local          │
│   /registrar-comida ─── upload + análisis IA + guardar           │
│   /asistente-ia     ─── chat + menú semanal + CTA análisis       │
│   /ai-lab           ─── pantalla técnica QA/dev                  │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ JWT en localStorage          │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│   BACKEND P0             │    │   BACKEND MÓDULO IA             │
│   /api/auth              │    │   /api/ai/*  (todos con JWT)    │
│   /api/profile           │    │   chat, menu, menu/weekly,      │
│   /api/meals             │    │   plate-analysis,               │
│   /api/foods             │    │   analyze, analyze-preview,     │
│                          │    │   save-analyzed-meal,           │
│                          │    │   conversations                  │
└──────────┬───────────────┘    └────────┬──────────────────┬─────┘
           ▼                             ▼                  ▼
   ┌──────────────┐              ┌──────────────┐    ┌────────────┐
   │  PostgreSQL  │              │   MongoDB    │    │ Providers  │
   │  User/Profile│              │  AiConv.     │    │  DeepSeek  │
   │  Meal        │◄─────────────┤  AiPlateAna. │    │  Gemini    │
   │  Profile_Meal│  save-       │  AiWeeklyPlan│    │            │
   │              │  analyzed-   │  AiCacheEntry│    │            │
   │              │  meal        │  AiPromptTpl │    │            │
   └──────────────┘              └──────────────┘    └────────────┘
```

---

## Estructura del repositorio

```
Nutricoach/
├── frontend/              # React + TypeScript + Vite (SPA)
│   ├── src/
│   │   ├── pages/         # Profile, AiAssistantPage, RegistrarComida, Login, Register, …
│   │   ├── components/    # Header, AIBubble, MenuSugerido*, Hero, …
│   │   ├── services/      # api.ts (P0), aiApi.ts (IA), mealService.tsx
│   │   ├── context/       # AuthProvider, ThemeContext
│   │   ├── styles/        # aiAssistant.css y otros estilos compartidos
│   │   └── types/         # Tipos compartidos
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, profile, meals, foods, users (P0)
│   │   ├── controllers/   # P0 controllers
│   │   ├── models/        # P0 (mealModel, profileModel, userModel)
│   │   ├── middlewares/   # authenticate, authorize (requireAdmin), errorHandler
│   │   ├── modules/ai/    # MÓDULO IA — autocontenido
│   │   │   ├── routes/        # ai.routes.ts (todos con authenticate)
│   │   │   ├── controllers/   # 7 controllers
│   │   │   ├── services/      # runAiChat, runAiPlateAnalysis, weeklyMenu, …
│   │   │   ├── repositories/  # Mongo CRUD
│   │   │   ├── models/        # AiConversation, AiPlateAnalysis, AiWeekly*, AiCacheEntry
│   │   │   ├── providers/     # geminiClient, deepseekClient, router
│   │   │   ├── schemas/       # Zod
│   │   │   └── prompts/       # plantillas con versión
│   │   └── scripts/       # initDb, seedFromApis
│   ├── __tests__/         # Vitest (101 tests, mongodb-memory-server)
│   └── package.json
├── docs/                  # Documentación técnica
│   ├── memoria-tecnica-modulo-ia.md         # Memoria entrega bootcamp
│   ├── ai-module-current-status.md          # Estado actual módulo IA
│   ├── ai-module-architecture.md            # Arquitectura interna IA
│   └── ai/features/
│       ├── final-mvp-smoke-test.md          # Checklist smoke MVP
│       ├── provider-router-gemini-deepseek.md
│       ├── user-assistant-dashboard.md      # /asistente-ia
│       ├── plate-analysis-product-flow.md   # flujo RegistrarComida
│       ├── auth-real-context.md
│       └── conversations-pagination.md
└── README.md              # (este archivo)
```

---

## Configuración local

> Pasos genéricos para arrancar el MVP en local. **No incluyen claves reales** — todas las variables sensibles van en `.env` no commiteado.

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd Nutricoach
```

### 2. Instalar dependencias

```bash
cd backend  && npm ci
cd ../frontend && npm ci
```

### 3. Configurar variables de entorno

```bash
# Backend
cd backend
cp .env.example .env
# Editar .env con tus credenciales reales (Postgres, Mongo, JWT_SECRET, GEMINI_API_KEY, DEEPSEEK_API_KEY si procede)

# Frontend (opcional; por defecto apunta a localhost:3000)
cd ../frontend
# Crear .env solo si quieres sobrescribir VITE_API_URL
```

### 4. Levantar Mongo y PostgreSQL

PostgreSQL y MongoDB deben estar disponibles antes de arrancar el backend (puerto local, contenedor Docker propio, o servicio externo). Ajustar `MONGO_URI`, `DB_*` / `POSTGRES_*` en `backend/.env` según corresponda.

### 5. Inicializar bases y seeds (una sola vez)

```bash
cd backend
npm run db:init           # crea tablas PostgreSQL
npm run db:seed           # rellena alimentos y comidas desde Open Food Facts + TheMealDB
npm run seed:ai-prompts   # carga plantillas de prompt en Mongo
```

### 6. Arrancar backend y frontend

```bash
# Terminal 1
cd backend && npm run dev          # http://localhost:3000

# Terminal 2
cd frontend && npm run dev         # http://localhost:5173
```

Detalle paso a paso y errores comunes: [docs/ai/features/final-mvp-smoke-test.md](docs/ai/features/final-mvp-smoke-test.md).

---

## Variables de entorno principales

> **Nunca commitear valores reales.** El fichero `.env.example` está en el repo; el `.env` real no.

### Backend (`backend/.env`)

| Variable | Uso | Obligatoria |
|---|---|---|
| `NODE_ENV` | `development` / `production` | Recomendada |
| `PORT` | Puerto del backend (default `3000`) | No |
| `CLIENT_URL` | Origen permitido CORS (URL del frontend) | **Sí en VPS** |
| `JWT_SECRET` | Secret para firmar JWT | **Sí** |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Conexión PostgreSQL P0 | **Sí** |
| `MONGO_URI` | Conexión MongoDB para módulo IA | **Sí** |
| `GEMINI_API_KEY` | API key Gemini (imagen + fallback texto) | **Sí para IA** |
| `GEMINI_MODEL` | Modelo Gemini (default `gemini-2.5-flash`) | No |
| `DEEPSEEK_API_KEY` | API key DeepSeek (texto) | Opcional |
| `DEEPSEEK_MODEL` | Modelo DeepSeek (default `deepseek-chat`) | No |
| `AI_TEXT_PROVIDER` | `gemini` (default) o `deepseek` | Recomendada |
| `AI_TEXT_FALLBACK_PROVIDER` | `gemini` | Recomendada |
| `AI_ENABLE_DEEPSEEK` | `true` para activar DeepSeek | Recomendada |

### Frontend (`frontend/.env`, opcional)

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL absoluta del backend público (en VPS, obligatoria) |

---

## Scripts útiles

Solo se listan scripts **reales** definidos en cada `package.json`.

### Backend (`backend/package.json`)

| Script | Comando | Uso |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Arranca el backend en modo desarrollo (hot reload) |
| `npm run build` | `tsc && npm run copy:assets` | Compila TypeScript a `dist/` y copia `schema.sql` |
| `npm start` | `node dist/server.js` | Arranca el backend compilado |
| `npm run lint` / `npm run check` | `tsc --noEmit` | Type-check sin emitir ficheros |
| `npm test` | `vitest run` | Ejecuta los 101 tests del módulo IA |
| `npm run db:init` | `tsx src/scripts/initDb.ts` | Crea tablas y seed inicial en PostgreSQL |
| `npm run db:seed` | `tsx src/scripts/seedFromApis.ts` | Rellena alimentos/comidas desde APIs externas |
| `npm run seed:ai-prompts` | `tsx src/modules/ai/seeders/seedAiPromptTemplates.ts` | Carga plantillas de prompt en Mongo |

### Frontend (`frontend/package.json`)

| Script | Comando | Uso |
|---|---|---|
| `npm run dev` | `vite` | Arranca el frontend en modo desarrollo |
| `npm run build` | `tsc -b && vite build` | Build de producción a `dist/` |
| `npm run lint` | `eslint .` | Lint del código |
| `npm run preview` | `vite preview` | Sirve el `dist/` localmente para revisión |

---

## Validación MVP

### Comandos automatizados

```bash
# Backend
cd backend
npm run lint    # → 0 errores
npm test        # → 101/101 passing

# Frontend
cd frontend
npm run lint    # → 0 errores (2 warnings preexistentes en componente huérfano MenuSugerido)
npm run build   # → OK (warning chunk >500 kB es deuda conocida)
```

### Smoke manual completo

1. **Login** (`/login` o registrarse en `/register` + completar perfil).
2. **Perfil** (`/perfil`) → ver dashboard, menú sugerido del día con preview de alimentos.
3. **Asistente IA** (`/asistente-ia`) — accesible desde el botón flotante 🤖.
4. **Chat IA** → conversar (debería usar DeepSeek si las variables están activas).
5. **Menú semanal IA** → generar plan, ver polling de 7 días.
6. **Registrar comida** (`/registrar-comida`) → subir imagen, análisis aparece con detectedFoods + macros editables.
7. **Guardar comida** → vuelve a `/perfil` y la comida aparece asignada al día.

Checklist completo y reproducible: [docs/ai/features/final-mvp-smoke-test.md](docs/ai/features/final-mvp-smoke-test.md).

---

## Documentación adicional

| Documento | Para qué sirve |
|---|---|
| [docs/memoria-tecnica-modulo-ia.md](docs/memoria-tecnica-modulo-ia.md) | Memoria técnica completa del módulo IA (entrega bootcamp) |
| [docs/ai-module-current-status.md](docs/ai-module-current-status.md) | Resumen ejecutivo de endpoints, seguridad y estado |
| [docs/ai-module-architecture.md](docs/ai-module-architecture.md) | Arquitectura interna (servicios, providers, prompts, cache) |
| [docs/ai/features/final-mvp-smoke-test.md](docs/ai/features/final-mvp-smoke-test.md) | Checklist reproducible de smoke MVP |
| [docs/ai/features/provider-router-gemini-deepseek.md](docs/ai/features/provider-router-gemini-deepseek.md) | Routing DeepSeek/Gemini + fallback |
| [docs/ai/features/user-assistant-dashboard.md](docs/ai/features/user-assistant-dashboard.md) | Pantalla `/asistente-ia` |
| [docs/ai/features/plate-analysis-product-flow.md](docs/ai/features/plate-analysis-product-flow.md) | Flujo `/registrar-comida` end-to-end |
| [docs/ai/features/auth-real-context.md](docs/ai/features/auth-real-context.md) | Auth real en endpoints IA |
| [docs/ai/features/conversations-pagination.md](docs/ai/features/conversations-pagination.md) | Listado paginado de conversaciones |

---

## Estado del despliegue

**Despliegue VPS: PENDIENTE.** El MVP está validado en local pero **todavía no se ha desplegado** en ningún servidor público.

**Próximo paso:** preparar el plan de despliegue (Docker compose unificado, reverse proxy, HTTPS, dominios, variables de entorno de producción).

### Variables críticas a definir cuando se aborde el despliegue

Antes de cualquier `npm start` en VPS, asegurar que el `.env` de producción tiene:

- `CLIENT_URL` apuntando al dominio del frontend público (evitar el fallback `*` de CORS).
- `VITE_API_URL` (en el build del frontend) apuntando al backend público.
- `GEMINI_API_KEY` real (sin ella, el análisis de plato devuelve `provider_error`).
- `DEEPSEEK_API_KEY` real si se quiere routing a DeepSeek para texto.
- `MONGO_URI` apuntando al Mongo de producción (no `localhost`).
- `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` apuntando al Postgres de producción.
- `JWT_SECRET` largo y distinto del de desarrollo.
- `NODE_ENV=production`.

> Esta sección se ampliará con instrucciones detalladas cuando el despliegue esté efectivamente preparado y validado. No se documenta aquí lo que aún no se ha hecho.

---

## Deuda técnica conocida

Lista priorizada y documentada en [docs/memoria-tecnica-modulo-ia.md § 13](docs/memoria-tecnica-modulo-ia.md):

| # | Tema | Estado |
|---|---|---|
| 1 | Permisos P0 para que usuarios creen sus propias comidas (deprecar el workaround `/api/ai/save-analyzed-meal`) | Pendiente |
| 2 | Rate limiting / control de coste por usuario y plan | Pendiente |
| 3 | Prompts cargados desde Mongo en runtime (hoy están en memoria) | Pendiente |
| 4 | Robustez DeepSeek / Zod en menú semanal (reducir fallback Gemini) | Pendiente |
| 5 | CI mínimo (lint + tests + build por PR) | Pendiente |
| 6 | Docker compose unificado (frontend + backend + Mongo + Postgres) para demo/prod | Pendiente |
| 7 | Métricas reales de tokens y coste expuestas en panel | Pendiente |
| 8 | Ownership en `GET /api/ai/menu/weekly/:planId` (defensa más allá del UUID) | Pendiente |
| 9 | Guard React en `/ai-lab` (hoy depende del backend para rechazar) | Pendiente |
| 10 | Unificar `VITE_API_URL` entre `services/api.ts` y `services/aiApi.ts` | Pendiente |
| 11 | Limpiar componentes huérfanos (`MenuSugerido`, `MealsSection`, `MealLog`) | Pendiente |
| 12 | Bundle splitting con `React.lazy` para `/asistente-ia` y `/ai-lab` | Pendiente |
| 13 | Panel admin para revisar conversaciones, plate analyses y weekly plans | Pendiente |

---

## Equipo

| Integrante | GitHub |
|---|---|
| Dario | [@darenazag](https://github.com/darenazag) |
| Eli | [@Danzanfer](https://github.com/Danzanfer) |
| Jeferson | [@Jeffersonfferss](https://github.com/Jeffersonfferss) |
| David | [@David-LS-Bilbao](https://github.com/David-LS-Bilbao) |

---

## Licencia

Pendiente de definir.
