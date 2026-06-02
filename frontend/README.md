# NutriCoach AI — Frontend

SPA React para la gestión de hábitos nutricionales, registro de comidas y funcionalidades de IA.

## Stack

| Tecnología | Uso |
|---|---|
| React 19 + TypeScript | Framework SPA y tipos estáticos |
| Vite | Bundler y servidor de desarrollo |
| Tailwind CSS | Estilos utilitarios |
| React Router | Navegación entre páginas |
| Recharts | Gráficas de calorías y macronutrientes |

## Páginas y rutas

| Ruta | Página | Descripción |
|---|---|---|
| `/` | Landing | Página de bienvenida y presentación |
| `/login` | Login | Inicio de sesión |
| `/register` | Register | Registro de usuario |
| `/about-you` | AboutYouStep | Paso 1 del onboarding — datos básicos |
| `/objective` | ObjectiveStep | Paso 2 del onboarding — objetivo nutricional |
| `/profile` | Profile | Dashboard principal — calorías, macros, menú sugerido |
| `/profile/edit` | EditProfile | Edición del perfil nutricional |
| `/profile/form` | ProfileForm | Creación del perfil (primer acceso) |
| `/meal-log` | MealLog | Historial de comidas registradas |
| `/registrar-comida` | RegistrarComida | Registro manual o por análisis de imagen IA |

## Instalación y desarrollo

```bash
npm install
cp .env.example .env   # solo necesario si no usas el proxy de Vite
npm run dev
```

En desarrollo, el proxy de Vite reenvía `/api/*` al backend en `http://localhost:3000` sin necesidad de configurar `VITE_API_URL`.

## Variables de entorno

```env
# Solo necesario en producción (o si el backend no corre en localhost:3000)
VITE_API_URL=https://api.tudominio.com/api
```

Ver `.env.example` para referencia.

## Scripts

```bash
npm run dev      # Servidor de desarrollo con HMR
npm run build    # Compilación para producción (salida en dist/)
npm run preview  # Preview del build de producción
npm run lint     # ESLint
```

## Cliente HTTP

Toda la comunicación con el backend pasa por `src/services/api.ts`, que:

- Añade automáticamente el header `Authorization: Bearer <token>` en peticiones autenticadas.
- Normaliza los dos formatos de error de la API (`{ error: string }` de P0 y `{ success: false, error: { message } }` del módulo IA).
- Lanza `ApiError` con el código de estado HTTP para que los componentes puedan distinguir 401 de 404 de 500.

## Arquitectura de componentes

```
src/
├── pages/           Vistas completas (una por ruta)
├── components/      Componentes reutilizables
│   ├── charts/      Gráficas de macros y calorías (Recharts)
│   ├── MenuSugerido/ Menú semanal orientativo generado por IA
│   ├── AIBubble/    Widget flotante de chat IA
│   └── ...
├── hooks/           Custom hooks (useAuth, useProfile, ...)
├── services/        api.ts — cliente HTTP centralizado
├── types/           Tipos de dominio compartidos con el backend
└── utils/           Funciones de utilidad (normalizeImage, ...)
```
