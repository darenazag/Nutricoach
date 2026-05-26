# feat/ai-infra-setup — Resumen de infraestructura base

**Rama:** `feat/ai-infra-setup`
**Base:** `core/project`
**Fecha:** 2026-05-19

---

## Archivos creados / modificados

| Archivo | Acción |
|---|---|
| `backend/package.json` | Reescrito — deps limpias + scripts |
| `backend/tsconfig.json` | Creado — `Node16` para TypeScript 6 |
| `backend/src/server.ts` | Escrito — arranque mínimo |
| `backend/src/app.ts` | Escrito — Express + healthcheck `/api/health` |
| `backend/src/config/postgres.ts` | Creado — conexión Sequelize |
| `backend/src/config/mongo.ts` | Creado — conexión Mongoose |
| `backend/.env.example` | Rellenado — todas las variables |
| `docker-compose.yml` | Creado en raíz — postgres + mongo + pgadmin |

---

## Dependencias instaladas (backend)

### Producción

```
express, cors, dotenv, cookie-parser
sequelize, pg, pg-hstore
mongoose
jsonwebtoken, google-auth-library
zod
multer, sharp
@google/genai
```

### Desarrollo

```
typescript, tsx
@types/node, @types/express, @types/cors
@types/cookie-parser, @types/jsonwebtoken, @types/multer
```

---

## Scripts añadidos

```json
"dev":   "tsx watch src/server.ts",
"build": "tsc",
"start": "node dist/server.js",
"check": "tsc --noEmit"
```

---

## Verificaciones ejecutadas

```
npm run check       ✓  (0 errores TypeScript)
npm run build       ✓  (0 errores, emite dist/)
docker compose config  ✓  (yaml válido, 3 servicios)
```

---

## Cómo verificar localmente

```bash
# 1. Copiar variables de entorno y editar con valores reales
cp backend/.env.example backend/.env

# 2. Levantar bases de datos
docker compose up -d

# 3. Arrancar backend en desarrollo
cd backend && npm run dev

# 4. Comprobar healthcheck
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "..." }
```

---

## Riesgos detectados

- `backend/docker-compose.yml` (dentro del backend) está **vacío** — el correcto es el de la raíz. Borrar en la PR.
- `package-lock.json` en la **raíz** del repo es un residuo generado accidentalmente. Borrar en la PR.
- `dist/` generado por `npm run build` debe estar en `.gitignore` del backend — verificar antes del commit.

---

## Qué NO se ha implementado

- Rutas reales (auth, IA, comidas, usuarios)
- Modelos Sequelize ni Mongoose
- Lógica de negocio
- Integración real con Gemini
- Cálculos nutricionales
- Google Auth / JWT

---

## Siguiente rama recomendada

```
chore/docker-local-cleanup
```

Objetivo: borrar `backend/docker-compose.yml` vacío, el `package-lock.json` de la raíz y verificar que `dist/` está en `.gitignore` antes de abrir la PR de esta rama.
