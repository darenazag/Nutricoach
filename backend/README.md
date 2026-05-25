# NutriCoach Backend

Backend MVC para la gestión de perfiles nutricionales, comidas y alimentos, con integración de **Open Food Facts** (API principal, alimentos) y **TheMealDB** (API secundaria, recetas) para rellenar la base de datos.

Construido con **Express + node-postgres (pg)** y **TypeScript**. Documentado con **JSDoc**.

## Arquitectura (MVC)

```
src/
├── config/         Conexión a BD (db.ts) y variables de entorno (env.ts)
├── models/         Acceso a datos: queries SQL por entidad
├── controllers/    Lógica de cada endpoint (incluye authController)
├── routes/         Definición de rutas Express (incluye authRoutes)
├── services/       Clientes de Open Food Facts y TheMealDB, y auth (authService)
├── middlewares/    Manejo de errores, autenticación JWT, autorización por rol y validación Zod
├── validators/     Esquemas Zod centralizados
├── scripts/        initDb.ts (crea BD) y seedFromApis.ts (relleno)
├── types/          Interfaces TypeScript (dominio, Open Food Facts, TheMealDB)
├── utils/          HttpError, asyncHandler
├── app.ts          Configuración de Express
└── server.ts       Punto de entrada
```

El flujo respeta la separación MVC: las **rutas** delegan en los **controladores**, que orquestan la lógica y llaman a los **modelos**, que son los únicos que ejecutan SQL. Las integraciones externas (Open Food Facts y TheMealDB) viven en **services** y solo las usa el seeder.

## Requisitos

- Node.js 18+ (usa `fetch` nativo y **ES modules**; probado en Node 22)
- PostgreSQL 12+
- **Sin claves de pago.** Open Food Facts es libre (solo pide un User-Agent que identifique tu app) y TheMealDB usa la clave de desarrollo gratuita `1`.

> **Módulos:** el proyecto está configurado como **ES modules** (`"type": "module"` en `package.json`, `module`/`moduleResolution: NodeNext` en `tsconfig.json`). Por ello, todos los imports relativos llevan extensión `.js` explícita (apuntan al archivo compilado, aunque el fuente sea `.ts`). El TypeScript se ejecuta en desarrollo con [`tsx`](https://github.com/privatenumber/tsx), que soporta ESM de forma nativa.

## Instalación

```bash
npm install
cp .env.example .env   # ajusta los valores
```

Edita `.env` con los datos de tu PostgreSQL. Para las APIs basta con dejar los valores por defecto (`OFF_USER_AGENT` y `THEMEALDB_API_KEY=1`), aunque conviene poner tu propio email de contacto en el User-Agent.

## Puesta en marcha

El orden importa: primero se crean las tablas, luego se rellenan desde las APIs.

```bash
# 1. Crea las tablas y los datos semilla (perfiles y usuarios)
npm run db:init

# 2. Rellena alimentos, comidas y relaciones desde las APIs (una sola vez)
npm run db:seed

# 3. Arranca el servidor en modo desarrollo
npm run dev
```

Para producción:

```bash
npm run build
npm start
```

## El seeder (Open Food Facts + TheMealDB)

`npm run db:seed` ejecuta `src/scripts/seedFromApis.ts`, que rellena la base **una única vez**:

1. Busca los 6 alimentos base en **Open Food Facts** y guarda sus nutrientes reales (por 100 g) en `Food_item`, conservando los ids 101–106 del esquema original.
2. Para los 3 platos, toma de **TheMealDB** el nombre, la imagen y la fuente (ids 201–203), y los enlaza con sus alimentos en `Meal_Food_item`.
3. Asigna las comidas a los perfiles en `Profile_Meal`.

**Detalle de diseño importante:** TheMealDB no proporciona datos nutricionales (calorías ni macros), solo ingredientes e instrucciones. Por eso los macros de cada comida se **calculan sumando** los de sus alimentos componentes, que sí provienen de Open Food Facts. Si TheMealDB no devuelve receta para un plato, se usa un nombre de respaldo y se mantienen los macros calculados. Todas las inserciones son **idempotentes** (`ON CONFLICT`), así que puedes relanzar el seeder sin duplicar datos.

Tras sembrar, la aplicación sirve todo desde PostgreSQL sin volver a llamar a las APIs.

## Autenticación (JWT)

El backend usa **JWT** para proteger las rutas de escritura y **bcrypt** para hashear contraseñas. La validación de inputs se hace con **Zod** en un middleware antes de cada controlador.

Flujo típico:

```bash
# 1. Registro (crea usuario con password hasheada y devuelve token)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@x.com","password":"12345678"}'

# 2. Login (devuelve token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@x.com","password":"12345678"}'

# 3. Usar el token en rutas protegidas
curl -X POST http://localhost:3000/api/foods \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"food_id":107,"protein":20,"calories":100,"carbs":0,"fat":2,"source":"Atun"}'
```

El servicio de auth es **compatible con las contraseñas en texto plano** del seed original: si el valor almacenado no parece un hash bcrypt, lo compara directamente. Así los usuarios sembrados (Carlos, Elena, Sofía) pueden hacer login sin migración previa. Configura `JWT_SECRET` en `.env` (obligatorio en producción).

## Roles (user / admin)

El rol vive **únicamente en el JWT**, sin tocar la base de datos. Al autenticarse, si el email del usuario coincide con la variable `ADMIN_EMAIL` del `.env`, se le emite un token con rol `admin`; en caso contrario, rol `user`. Cambiar quién es admin es tan simple como cambiar esa variable y volver a iniciar sesión.

Reglas aplicadas:

- **Perfiles**: cualquiera puede *ver* perfiles. Para *modificar* un perfil debes ser su dueño (el `user_id`/`:id` coincide con el de tu token) **o** admin. Solo el admin puede modificar perfiles ajenos. Esto cubre tanto `POST /api/profiles` (comprueba el `user_id` del body) como `POST /api/profiles/:id/meals`.
- **Usuarios**: listar y ver usuarios (`GET /api/users`, `GET /api/users/:id`) requiere admin.
- **Alimentos y comidas**: crear y borrar (`POST`/`DELETE`) requiere admin. La lectura sigue siendo pública.

Respuestas de autorización: `401` si falta el token o es inválido, `403` si el rol o la propiedad no bastan para la acción.

```bash
# Ejemplo: un usuario normal intenta modificar el perfil de otro -> 403
curl -X POST http://localhost:3000/api/profiles/3/meals \
  -H "Authorization: Bearer <TOKEN_DE_USUARIO_2>" \
  -H "Content-Type: application/json" \
  -d '{"mealId":201}'
# -> 403 { "error": "Solo puedes modificar tu propio perfil" }
```

## Endpoints

Base: `http://localhost:3000`. 🔒 = requiere token. 👑 = requiere rol admin (o ser el propio dueño, en el caso de perfiles).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/api/auth/register` | Registra usuario, devuelve token |
| POST | `/api/auth/login` | Login, devuelve token |
| GET | `/api/auth/me` 🔒 | Usuario autenticado (incluye su rol) |
| GET | `/api/foods` | Lista alimentos |
| GET | `/api/foods/:id` | Un alimento |
| POST | `/api/foods` 👑 | Crea un alimento |
| DELETE | `/api/foods/:id` 👑 | Elimina un alimento |
| GET | `/api/meals` | Lista comidas |
| GET | `/api/meals/:id` | Una comida con sus ingredientes |
| POST | `/api/meals` 👑 | Crea una comida (acepta `foodIds[]`) |
| GET | `/api/profiles` | Lista perfiles |
| GET | `/api/profiles/:id` | Un perfil |
| GET | `/api/profiles/:id/meals` | Comidas asignadas a un perfil |
| POST | `/api/profiles` 🔒 | Crea/actualiza un perfil (propio, o cualquiera si admin) |
| POST | `/api/profiles/:id/meals` 🔒 | Asigna una comida (propio, o cualquiera si admin) |
| GET | `/api/users` 👑 | Lista usuarios (sin password) |
| GET | `/api/users/:id` 👑 | Un usuario |

Toda la entrada (body y parámetros `:id`) se valida con Zod; ante datos inválidos la respuesta es `400` con el detalle del fallo.


