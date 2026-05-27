# NutriCoach Backend — Integrado

Backend MVC en TypeScript (Node.js + Express + PostgreSQL) que integra los backends de Eli y Dario.

## Stack

- **Runtime**: Node.js 20 + TypeScript (ES Modules)
- **Framework**: Express 4
- **BD**: PostgreSQL 16 (pg nativo, sin ORM)
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Validación**: Zod
- **APIs externas**: Open Food Facts · TheMealDB

## Estructura MVC

```
src/
├── config/         env.ts · db.ts
├── controllers/    authController · mealController · profileController
│                   foodItemController · userController
├── middlewares/    authenticate · authorize · validate · errorHandler
├── models/         userModel · profileModel · mealModel · foodItemModel
├── routes/         index · authRoutes · mealRoutes · profileRoutes
│                   profileAliasRoutes · foodItemRoutes · userRoutes
├── services/       authService · openFoodFactsService · theMealDbService
├── types/          domain · openFoodFacts · theMealDb
├── utils/          asyncHandler · httpError · metabolism
├── validators/     schemas.ts
├── scripts/        initDb.ts · seedFromApis.ts
├── app.ts
└── server.ts
```

## Inicio rápido

```bash
cp .env.example .env          # Ajusta credenciales
npm install
docker-compose up -d db       # Levanta PostgreSQL
npm run db:init               # Crea el esquema
npm run db:seed               # Seed desde APIs externas (opcional)
npm run dev                   # Servidor en modo desarrollo
```

## Rutas disponibles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Registro con cálculo automático de BMR/TDEE |
| POST | /api/auth/login | — | Login, devuelve JWT |
| GET | /api/auth/me | JWT | Usuario autenticado |
| GET | /api/meals | — | Lista comidas |
| GET | /api/meals/recommend | JWT | Proyección 100 días personalizada |
| GET | /api/meals/:id | — | Comida con ingredientes |
| POST | /api/meals | JWT+admin | Crear comida |
| GET | /api/meals/profile/mine | JWT | Mis comidas asignadas |
| POST | /api/meals/profile/assign | JWT | Asignar comida a mi perfil |
| GET | /api/profile | JWT | Mi perfil |
| POST | /api/profile | JWT | Crear/actualizar mi perfil |
| GET | /api/profile/streak | JWT | Racha semanal |
| GET | /api/profiles | — | Todos los perfiles |
| GET | /api/profiles/:id | — | Perfil por id |
| POST | /api/profiles | JWT | Crear perfil (admin puede crear ajenos) |
| POST | /api/profiles/:id/meals | JWT | Asignar comida a perfil |
| GET | /api/foods | — | Lista alimentos |
| GET | /api/foods/:id | — | Alimento por id |
| POST | /api/foods | JWT+admin | Crear alimento |
| DELETE | /api/foods/:id | JWT+admin | Eliminar alimento |
| GET | /api/users | JWT+admin | Lista usuarios |
| GET | /api/users/:id | JWT+admin | Usuario por id |

## Registro — body de ejemplo

```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "miPassword123",
  "weight": 65,
  "height": 165,
  "age": 28,
  "gender": "F",
  "activityFactor": "A",
  "objective": "P"
}
```

`activityFactor`: S (Sedentario) · L (Ligero) · A (Activo) · V (Muy activo)  
`objective`: P (Perder) · M (Mantener) · G (Ganar)

BMR y TDEE se calculan automáticamente (Mifflin-St Jeor).
