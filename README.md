# NutriCoach AI

Aplicación web fullstack de hábitos saludables con registro de comidas, dashboard nutricional y módulo de inteligencia artificial.

> Proyecto grupal final de bootcamp Full Stack.

---

## Aviso de responsabilidad

NutriCoach AI ofrece recomendaciones orientativas y educativas sobre hábitos saludables.

No sustituye el criterio de profesionales sanitarios, médicos, dietistas o nutricionistas. No debe utilizarse para diagnóstico médico, tratamiento de enfermedades, dietas clínicas ni decisiones relacionadas con patologías, medicación o trastornos alimentarios.

Las estimaciones de calorías y macronutrientes generadas por IA son aproximadas y pueden contener errores.

---

## Estado del proyecto

**MVP implementado y funcional.** Todas las funcionalidades planificadas están en producción en la rama `main`.

| Funcionalidad | Estado |
|---|---|
| Registro e inicio de sesión (JWT + bcrypt) | ✅ |
| Perfil nutricional (peso, altura, edad, objetivo, actividad) | ✅ |
| Registro manual de comidas | ✅ |
| Dashboard de calorías y macronutrientes | ✅ |
| Menú semanal orientativo con IA | ✅ |
| Chat IA para dudas nutricionales | ✅ |
| Análisis orientativo de imagen de plato | ✅ |
| Historial de conversaciones con IA | ✅ |

---

## Stack tecnológico

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS | SPA, rutas, formularios, dashboard, subida de imágenes |
| Backend | Node.js + Express 5 + TypeScript | API REST, autenticación, validaciones, lógica de negocio |
| Base de datos principal | PostgreSQL + node-postgres (pg) | Usuarios, perfiles, comidas, alimentos (queries SQL directas) |
| Base de datos IA | MongoDB + Mongoose | Conversaciones, mensajes, plantillas de prompt, caché IA |
| IA | Gemini API (principal) + DeepSeek (fallback opcional) | Menús, chat, análisis de imagen, explicación de perfil |
| Validación | Zod | Validación de cuerpos de petición en todos los endpoints |
| Seguridad | helmet + express-rate-limit + bcryptjs + jsonwebtoken | Cabeceras HTTP, rate limiting en auth, hashing, JWT |
| Tests | Vitest | 116 tests unitarios (módulo IA + seguridad auth) |
| Deploy | Docker + Docker Compose | Contenedores para API, PostgreSQL, MongoDB y pgAdmin |

---

## Arquitectura

```
Frontend React (Vite)
        │
        │  HTTPS / REST JSON
        ▼
Backend Express API
        │
        ├── PostgreSQL (pg)
        │     └── User, HealthProfile, Meal, Food_item, Profile_Meal
        │
        └── MongoDB (Mongoose)
              └── AiConversation, AiMessage, AiPromptTemplate, AiCache
                        │
                        ├── Gemini API  (proveedor principal)
                        └── DeepSeek API (fallback opcional)
```

El frontend nunca llama directamente a las APIs de IA. Todas las peticiones pasan por el backend, que protege las credenciales, valida entradas y estructura las respuestas.

---

## Estructura del repositorio

```
Nutricoach/
├── backend/                 API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/          Conexión a BD y variables de entorno
│   │   ├── controllers/     Controladores P0 (auth, profile, meals, foods)
│   │   ├── middlewares/     errorHandler, authenticate, authorize, validate
│   │   ├── models/          Acceso a datos PostgreSQL (queries parametrizadas)
│   │   ├── modules/ai/      Módulo IA completo (controllers, services, models, routes)
│   │   ├── routes/          Rutas P0
│   │   ├── scripts/         initDb.ts, seedFromApis.ts
│   │   ├── services/        authService, seeder clients
│   │   ├── types/           Tipos de dominio TypeScript
│   │   ├── utils/           HttpError, asyncHandler
│   │   ├── validators/      Esquemas Zod centralizados
│   │   ├── app.ts           Configuración Express (helmet, CORS, rate limit)
│   │   └── server.ts        Punto de entrada
│   ├── .env.example
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/                SPA React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      Componentes reutilizables
│   │   ├── pages/           Vistas principales
│   │   ├── services/        Cliente HTTP (api.ts)
│   │   ├── hooks/           Custom hooks
│   │   └── types/           Tipos de dominio frontend
│   └── .env.example
├── docs/                    Documentación técnica y diagramas
│   ├── diagramas-tecnicos.md
│   ├── ai-module-architecture.md
│   ├── ai-module-current-status.md
│   └── diagrams/            Diagramas Mermaid (ER, clases, casos de uso)
└── docker-compose.yml       Solo bases de datos (desarrollo local)
```

---

## Instalación y ejecución local

### Requisitos previos

- Node.js 20+
- PostgreSQL 12+
- MongoDB 7+ (o Docker)

### 1. Clonar el repositorio

```bash
git clone git@github.com:darenazag/Nutricoach.git
cd Nutricoach
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env   # edita con tus credenciales reales
```

Variables obligatorias en `backend/.env`:

```env
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/nutricoach
MONGO_URI=mongodb://usuario:contraseña@localhost:27017/nutricoach_ai?authSource=admin
JWT_SECRET=cadena_larga_aleatoria_segura
GEMINI_API_KEY=tu_clave_de_gemini
CLIENT_URL=http://localhost:5173
```

Ver `backend/.env.example` para la lista completa de variables.

### 3. Inicializar la base de datos PostgreSQL

```bash
# Crea las tablas y los datos semilla (usuarios y perfiles)
npm run db:init

# Rellena alimentos, comidas y relaciones desde Open Food Facts y TheMealDB
npm run db:seed
```

### 4. Inicializar las plantillas de prompt de IA (MongoDB)

```bash
npm run seed:ai-prompts
```

### 5. Arrancar el backend

```bash
npm run dev      # desarrollo (tsx watch)
npm run build && npm start   # producción
```

### 6. Configurar y arrancar el frontend

```bash
cd ../frontend
npm install
cp .env.example .env   # ajusta VITE_API_URL si no usas el proxy de Vite
npm run dev
```

El proxy de Vite en desarrollo reenvía `/api/*` a `http://localhost:3000` automáticamente, por lo que `VITE_API_URL` no es necesario en local.

### Con Docker Compose (recomendado para bases de datos)

```bash
# Levanta PostgreSQL, MongoDB y pgAdmin en local
docker compose up -d

# O levanta toda la aplicación (API incluida) desde backend/
cd backend
docker compose up -d
```

---

## Endpoints del API

### Autenticación y usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Registro, devuelve JWT |
| POST | `/api/auth/login` | — | Login, devuelve JWT |
| GET | `/api/auth/me` | 🔒 | Usuario autenticado |
| GET | `/api/users` | 👑 | Lista usuarios |
| GET | `/api/users/:id` | 👑 | Un usuario |

> Login y register tienen rate limit: **20 peticiones / 15 minutos** por IP.

### Perfiles nutricionales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/profiles` | — | Lista perfiles |
| GET | `/api/profiles/:id` | — | Un perfil |
| GET | `/api/profiles/:id/meals` | — | Comidas del perfil |
| POST | `/api/profiles` | 🔒 | Crea/actualiza perfil propio |
| POST | `/api/profiles/:id/meals` | 🔒 | Asigna comida al perfil |

### Alimentos y comidas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/foods` | — | Lista alimentos |
| GET | `/api/foods/:id` | — | Un alimento |
| POST | `/api/foods` | 👑 | Crea alimento |
| DELETE | `/api/foods/:id` | 👑 | Elimina alimento |
| GET | `/api/meals` | — | Lista comidas |
| GET | `/api/meals/:id` | — | Una comida |
| POST | `/api/meals` | 👑 | Crea comida |

### Módulo IA

Todos los endpoints IA requieren JWT (`🔒`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ai/chat` | Chat conversacional con Gemini |
| POST | `/api/ai/menu` | Menú orientativo diario (con caché) |
| POST | `/api/ai/menu/weekly` | Plan de menú semanal (con caché) |
| GET | `/api/ai/menu/weekly/:planId` | Recupera un plan semanal guardado |
| POST | `/api/ai/profile-explanation` | Explicación del perfil nutricional (con caché) |
| POST | `/api/ai/plate-analysis` | Análisis de imagen de plato (`multipart/form-data`) |
| POST | `/api/ai/analyze` | Análisis legacy (usado por frontend AIBubble) |
| POST | `/api/ai/analyze-preview` | Previsualización de análisis (RegistrarComida) |
| POST | `/api/ai/save-analyzed-meal` | Guarda comida analizada |
| GET | `/api/ai/conversations` | Lista conversaciones del usuario (paginado) |
| GET | `/api/ai/conversations/:id` | Una conversación con sus mensajes |

🔒 = requiere `Authorization: Bearer <token>` · 👑 = requiere rol admin

---

## Seguridad

| Capa | Mecanismo |
|---|---|
| Cabeceras HTTP | `helmet` (X-Content-Type-Options, X-Frame-Options, CSP, HSTS...) |
| Rate limiting | `express-rate-limit` en login y register (20 req / 15 min / IP) |
| Autenticación | JWT firmado con `JWT_SECRET`, expira en 1h |
| Contraseñas | bcrypt (10 rounds) |
| Validación de entrada | Zod en todos los endpoints (400 ante datos inválidos) |
| SQL injection | Queries parametrizadas (`WHERE email = $1`), sin concatenación SQL |
| CORS | Restringido a `CLIENT_URL` (en producción esta variable es obligatoria) |
| Secretos | Nunca en código fuente; validación de variables en arranque |

---

## Tests

```bash
cd backend
npm test        # 116 tests (vitest)
npm run lint    # TypeScript type-check
```

Cobertura: módulo IA (servicios, controladores, seguridad auth) y seguridad de login (SQL injection, Zod).

---

## Flujo Git

| Rama | Uso |
|---|---|
| `main` | Versión estable — demos, entrega y despliegue validado |
| `dev` | Integración continua del equipo |
| `core/project` | Rama de trabajo principal durante el desarrollo |
| `feat/*` / `fix/*` / `test/*` | Ramas de trabajo por tarea |

Flujo: rama de trabajo → PR a `core/project` → PR a `dev` → PR a `main`.

---

## Equipo

| Integrante | GitHub | Rol principal |
|---|---|---|
| Dario | [@darenazag](https://github.com/darenazag) | Frontend UI/UX + liderazgo técnico |
| Eli | [@Danzanfer](https://github.com/Danzanfer) | Frontend funcional |
| Jeferson | [@Jeffersonfferss](https://github.com/Jeffersonfferss) | Backend / API P0 |
| David | [@davidlopezsotelo](https://github.com/davidlopezsotelo) | Módulo IA + deploy + documentación |

---

## Licencia

MIT
