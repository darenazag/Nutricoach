# NutriCoach AI

App fullstack de hábitos saludables, registro de comidas, menús e IA.

> Proyecto grupal final de bootcamp Full Stack.

---

## Descripción

NutriCoach AI es una aplicación web fullstack pensada para ayudar a usuarios a mejorar sus hábitos de alimentación de forma sencilla, visual y orientativa.

El proyecto busca resolver problemas habituales como la falta de visibilidad sobre lo que se come durante el día, la dificultad de estimar calorías manualmente y el tiempo necesario para planificar menús equilibrados.

La aplicación se plantea como una herramienta de bienestar y educación nutricional, no como una aplicación médica. Su objetivo es facilitar el registro de comidas, mostrar progreso mediante un dashboard y usar IA para generar menús, resolver dudas generales y estimar de forma aproximada el contenido de un plato a partir de una imagen.

---

## Aviso de responsabilidad

NutriCoach AI ofrece recomendaciones orientativas y educativas sobre hábitos saludables.

No sustituye el criterio de profesionales sanitarios, médicos, dietistas o nutricionistas. La aplicación no debe utilizarse para diagnóstico médico, tratamiento de enfermedades, dietas clínicas ni decisiones relacionadas con patologías, medicación o trastornos alimentarios.

Las estimaciones de calorías, macronutrientes o alimentos detectados por IA pueden ser imprecisas y deberán poder revisarse o corregirse manualmente por el usuario.

---

## Funcionalidades MVP previstas

Estas funcionalidades están planificadas para la primera versión del proyecto. No implican que estén ya implementadas.

- Registro e inicio de sesión de usuarios.
- Perfil nutricional básico con edad, peso, altura, objetivo y nivel de actividad.
- Registro manual de comidas diarias.
- Dashboard de calorías, macronutrientes y progreso.
- Generación de menús orientativos con IA.
- Chat IA para dudas generales sobre hábitos saludables.
- Estimación orientativa de calorías desde una imagen de plato como funcionalidad diferencial.

---

## Funcionalidades fuera del MVP

Para mantener el alcance realista, estas funcionalidades quedan fuera de la primera versión:

- Diagnóstico médico.
- Dietas clínicas o planes para patologías específicas.
- Integración con wearables.
- Escáner de código de barras.
- Rutinas deportivas avanzadas.
- Comunidad, sistema social o publicaciones entre usuarios.

---

## Stack tecnológico

| Capa | Tecnología prevista | Uso |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | SPA, rutas, formularios, dashboard y subida de imágenes |
| Backend | Node.js + Express + TypeScript | API REST, autenticación, validaciones y lógica de negocio |
| Base de datos | PostgreSQL | Persistencia relacional de usuarios, comidas, menús e interacciones |
| ORM | Sequelize | Modelos, asociaciones, migraciones y seeders |
| IA | Gemini API | Generación de menús, chat y análisis orientativo de imagen |
| Gráficas | Recharts o similar | Visualización de calorías, macros y evolución |
| Deploy | VPS + Docker/Docker Compose + reverse proxy | Despliegue de frontend, backend y base de datos |

---

## Arquitectura inicial

La arquitectura prevista separa frontend, backend, base de datos y servicios de IA:

```txt
Frontend React
    |
    v
Backend Express API
    |
    v
PostgreSQL + Sequelize
```

Para las funcionalidades de IA:

```txt
Frontend React
    |
    v
Backend Express API
    |
    v
Gemini API
```

El frontend nunca llamará directamente a Gemini. Todas las peticiones a IA pasarán por el backend para proteger credenciales, validar entradas, controlar costes, aplicar reglas de seguridad y estructurar las respuestas antes de enviarlas al cliente.

---

## Despliegue previsto

El proyecto está pensado para desplegarse en un VPS Linux propio usando Docker y Docker Compose.

La arquitectura de despliegue prevista contempla un reverse proxy con HTTPS delante del frontend y del backend. El frontend y la API Express se servirán detrás de este reverse proxy, evitando exponer servicios internos de forma innecesaria.

PostgreSQL deberá quedar dentro de una red interna de Docker y no exponerse públicamente. Solo el backend debería poder comunicarse con la base de datos.

Esta sección se ampliará cuando existan la estructura `client/`, `server/` y el archivo `docker-compose.yml`. No se documentarán aquí IPs, usuarios SSH, rutas privadas, tokens ni credenciales reales.

---

## Modelo de datos previsto

Modelo inicial orientado a PostgreSQL + Sequelize. Podrá evolucionar durante la fase de implementación.

| Entidad | Responsabilidad | Relaciones previstas |
| --- | --- | --- |
| `User` | Cuenta de usuario, autenticación y datos básicos | Tiene un `HealthProfile`, muchas `Meal`, muchos `MenuPlan` y muchas `AIInteraction` |
| `HealthProfile` | Datos nutricionales básicos del usuario | Pertenece a un `User` |
| `Meal` | Registro de una comida diaria | Pertenece a un `User` y contiene varios `FoodItem` |
| `FoodItem` | Alimento o ingrediente dentro de una comida | Pertenece a una `Meal` |
| `MenuPlan` | Menú diario o semanal generado o guardado | Pertenece a un `User` |
| `AIInteraction` | Historial de interacciones con IA | Pertenece a un `User` y guarda tipo, entrada y salida |

---

## Estructura prevista del repositorio

La estructura final todavía está pendiente de cerrar. Una propuesta inicial es:

```txt
Nutricoach/
├── client/
│   └── Aplicación React + TypeScript + Vite
├── server/
│   └── API Node.js + Express + TypeScript
├── docs/
│   └── Documentación técnica y flujo de trabajo
├── docker-compose.yml
└── README.md
```

---

## Instalación y ejecución local

Esta sección es provisional y se actualizará cuando la estructura `client/` y `server/` esté cerrada.

### 1. Clonar el repositorio

```bash
git clone git@github.com:darenazag/Nutricoach.git
cd Nutricoach
```

### 2. Instalar dependencias del frontend

```bash
cd client
npm install
```

### 3. Instalar dependencias del backend

```bash
cd ../server
npm install
```

### 4. Configurar variables de entorno

Crear los archivos `.env` necesarios a partir de los ejemplos que se definan en el proyecto:

```bash
cp .env.example .env
```

No subir archivos `.env` con credenciales reales al repositorio.

### 5. Levantar PostgreSQL

Comando esperado si se usa Docker Compose:

```bash
docker compose up -d postgres
```

### 6. Ejecutar backend y frontend

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

---

## Variables de entorno previstas

Ejemplo orientativo sin valores reales:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE_NAME
JWT_SECRET=replace_with_a_secure_secret
GEMINI_API_KEY=replace_with_your_gemini_api_key
GEMINI_MODEL=gemini-model-name
CLIENT_URL=http://localhost:5173
```

Notas:

- `GEMINI_API_KEY` debe existir solo en el backend.
- `JWT_SECRET` debe ser seguro y diferente entre desarrollo y producción.
- Las credenciales reales no deben subirse nunca a GitHub.

---

## Flujo Git del equipo

Repositorio:

```bash
git@github.com:darenazag/Nutricoach.git
```

| Rama | Uso |
| --- | --- |
| `main` | Rama estable para demos, entregas y despliegues validados |
| `dev` | Rama de integración diaria del equipo |
| `feat/*` | Nuevas funcionalidades |
| `fix/*` | Correcciones concretas |
| `docs/*` | Documentación |

Flujo recomendado:

1. Crear ramas de trabajo desde `dev`.
2. Abrir Pull Request hacia `dev`.
3. Revisar cambios antes de hacer merge.
4. Merge a `main` solo cuando haya una versión estable, demo o entrega validada.

---

## Equipo de trabajo

| Integrante | GitHub |
| --- | --- |
| Dario | [@darenazag](https://github.com/darenazag) |
| Eli | [@Danzanfer](https://github.com/Danzanfer) |
| Jeferson | [@Jeffersonfferss](https://github.com/Jeffersonfferss) |
| David | [@David-LS-Bilbao](https://github.com/David-LS-Bilbao) |

---

## Roles del equipo

| Rol | Responsabilidad principal |
| --- | --- |
| Frontend UI/UX | Diseño visual, layout, componentes base, responsive y experiencia de usuario |
| Frontend funcional | Conexión de pantallas con API, formularios, estados, gráficas y flujos de usuario |
| Backend/API | API REST, autenticación, Sequelize, PostgreSQL, modelos, migraciones y CRUD |
| IA + Deploy + Documentación | Integración con Gemini, prompts, Docker, VPS, documentación y preparación de demo |

---

## Plan de trabajo resumido

| Día | Objetivo | Entregable esperado |
| --- | --- | --- |
| Día 1 | Definición | MVP, roles, modelo inicial, issues, wireframes y README inicial |
| Día 2 | Base técnica | Frontend y backend arrancando con estructura base |
| Día 3 | Auth/perfil | Registro, login y perfil nutricional básico |
| Día 4 | Comidas | CRUD de comidas y alimentos asociado a usuario |
| Día 5 | Dashboard | Resumen de calorías, macros, progreso y gráficas |
| Día 6 | Menús | Generación o gestión inicial de menús |
| Día 7 | IA | Chat IA y generación de menús con respuestas seguras |
| Día 8 | Integración | Flujos completos conectados y revisión de errores |
| Día 9 | Deploy | Docker Compose, VPS, reverse proxy, variables y URL pública |
| Día 10 | Presentación | README final, demo preparada, capturas y guion de presentación |

---

## Estado actual del proyecto

- Fase: planificación inicial.
- README inicial creado.
- Dosier técnico disponible en `docs/`.
- Próximo paso: definir y crear la estructura base de `client/` y `server/`.

---

## Estado actual del módulo IA

El módulo IA (`integration/david-ai-stack`) está operativo con 5 endpoints REST:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ai/chat` | Chat conversacional con Gemini |
| POST | `/api/ai/menu` | Generación de menú orientativo (con caché) |
| POST | `/api/ai/profile-explanation` | Explicación del perfil nutricional (con caché) |
| POST | `/api/ai/plate-analysis` | Análisis de imagen de plato con Gemini Vision |
| GET  | `/api/ai/conversations/:conversationId` | Lectura de conversación y mensajes |

Toda la persistencia IA usa MongoDB + Mongoose. PostgreSQL/Sequelize queda reservado para los datos de usuario.

→ Documentación completa: [docs/ai-module-current-status.md](docs/ai-module-current-status.md)

---

## Licencia

Pendiente de definir.
