# Smoke test MVP final — checklist reproducible

> Estado: **MVP listo**.
> Fecha: 2026-05-27.
> Objetivo: validar que un entorno limpio puede ejercitar todo el flujo IA producto en <15 minutos.

---

## 0. Pre-requisitos

| Tema | Cómo comprobar |
|---|---|
| Node `>=20.x` | `node --version` |
| `npm` | `npm --version` |
| Docker (para Mongo) | `docker --version` |
| Puertos libres: `3000` (backend), `5173` (frontend), `27017` o `27018` (Mongo) | `lsof -i:3000`, `lsof -i:5173`, `lsof -i:27017` |
| Credenciales reales: `GEMINI_API_KEY`. Opcional: `DEEPSEEK_API_KEY` | Email del responsable de claves |

---

## 1. Preparar `.env` local

### Backend (`backend/.env`)

Copiar el ejemplo y rellenar:

```bash
cd backend
cp .env.example .env
```

Editar `.env`:

```env
# PostgreSQL P0 (heredado)
PGHOST=localhost
PGPORT=5432
PGDATABASE=nutricoach
PGUSER=postgres
PGPASSWORD=<password>

# Mongo (módulo IA) — ajustar puerto si tu Mongo local usa otro
MONGO_URI=mongodb://localhost:27017/nutricoach_ai

# JWT
JWT_SECRET=<cadena_larga_aleatoria>
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=<email_admin_opcional>

# Cliente
CLIENT_URL=http://localhost:5173

# Gemini (OBLIGATORIO para imagen)
GEMINI_API_KEY=<key_real>

# DeepSeek (opcional pero recomendado para texto)
AI_ENABLE_DEEPSEEK=true
AI_TEXT_PROVIDER=deepseek
DEEPSEEK_API_KEY=<key_real>
```

**Importante**:
- **`GEMINI_API_KEY` es obligatoria** — sin ella, el análisis de plato devuelve `provider_error`.
- Si `AI_ENABLE_DEEPSEEK=false` o falta `AI_TEXT_PROVIDER=deepseek`, todo el texto cae a Gemini (sigue funcionando, pero más caro).

### Frontend (`frontend/.env` opcional)

Por defecto el frontend asume `VITE_API_URL=http://localhost:3000/api`. Solo crear `.env` si quieres apuntar a otro backend.

---

## 2. Mongo en el puerto correcto

```bash
docker compose up -d mongo
```

Confirmar:

```bash
docker compose ps mongo
```

Debe estar `Up`. Por defecto `docker-compose.yml` expone Mongo en `27017`. Si en tu máquina el Mongo de Docker está en `27018` (caso real visto durante desarrollo), **el `.env` debe reflejarlo**: `MONGO_URI=mongodb://localhost:27018/nutricoach_ai`. Si no, verás `MongooseServerSelectionError: Authentication failed` o connect refused.

---

## 3. Backend

```bash
cd backend
npm ci
npm run seed:ai-prompts    # carga las plantillas de prompt iniciales en Mongo
npm run dev
```

Esperado en consola:

```
[backend] listening on http://localhost:3000
[mongo] connected to mongodb://localhost:.../nutricoach_ai
```

Si ves `EADDRINUSE`: ya hay otro backend en `:3000`. Matarlo antes de continuar:

```bash
lsof -ti:3000 | xargs kill -9
```

---

## 4. Frontend

```bash
cd frontend
npm ci
npm run dev
```

Esperado:

```
VITE ... ready
➜  Local: http://localhost:5173/
```

---

## 5. Login

1. Abrir `http://localhost:5173/login`.
2. Login con un usuario que ya exista en PostgreSQL P0, o registrar uno nuevo en `/register` + completar perfil en `/completar-perfil`.
3. Confirmar en DevTools → Application → Local Storage que existe la clave `token` con un JWT.

---

## 6. Chat DeepSeek (`/asistente-ia` — tab Chat IA)

1. Header → avatar → "🤖 Asistente IA" → tab **Chat IA**.
2. Escribir `"Hola, qué desayuno me recomiendas hoy?"` y enviar.
3. Esperar respuesta (1–4 s).

**Verificación de provider** (opcional):

```bash
TOKEN="<bearer copiado de localStorage>"
curl -s -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<id>","message":"test","objective":"maintain","caloriesTarget":2000}' \
  | jq '.data.metadata.provider'
```

Debe devolver `"deepseek"` si las dos variables `.env` están activas. Si devuelve `"gemini"`, revisar `AI_TEXT_PROVIDER` y `AI_ENABLE_DEEPSEEK` en backend `.env` y reiniciar el backend.

---

## 7. Análisis imagen Gemini (`/registrar-comida`)

1. `/registrar-comida` (también accesible desde Profile dashboard).
2. Tab **Foto** → "Subir foto" → seleccionar una imagen real de comida (JPEG/PNG/WebP, <5 MB).
3. Esperar ~3–8 s a que aparezca el spinner "Analizando tu comida…".
4. Comprobar que aparece:
   - Resumen IA (texto natural).
   - Tags de alimentos detectados con color según confianza.
   - Proporciones P / HC / Veg / G.
   - Recomendaciones / warnings si hay.
   - Inputs editables con nombre, kcal, P/G/HC pre-rellenados.

---

## 8. Guardar comida (`/registrar-comida` → Guardar)

1. Verificar que los inputs editables tienen valores razonables.
2. Seleccionar categoría (Desayuno / Almuerzo / Merienda / Cena).
3. Pulsar **Guardar**.
4. Esperado:
   - Toast/alert no aparece (no hay error).
   - Navegación automática a `/perfil`.
   - La comida aparece listada en el dashboard del usuario.

**Si aparece alert con error real** (no genérico): el backend ya devuelve mensaje normalizado (ver § "Errores comunes" abajo).

---

## 9. Menú semanal (`/asistente-ia` — tab Menú Semanal)

1. `/asistente-ia` → tab **Menú Semanal**.
2. Pulsar "Generar menú semanal".
3. Esperado:
   - Backend responde `202 Accepted` con `planId`.
   - Frontend hace polling cada ~4 s.
   - Barra de progreso avanza día a día (1/7, 2/7, …).
   - Cada día se renderiza al completarse.
4. Estado final esperado: `status === 'completed'` con 7 días. Si algún día falla, `status === 'partial_failed'` con los días que sí completaron.

**Nota**: si DeepSeek no respeta el JSON Schema (deuda técnica #4), el backend cae a Gemini por día. El resultado sigue siendo válido, solo aumenta el coste — no es un fallo de smoke.

---

## 10. Errores comunes (qué hacer)

| Síntoma | Causa probable | Fix |
|---|---|---|
| Análisis de plato devuelve `provider_error` | `GEMINI_API_KEY` falta o es inválida | Revisar backend `.env`, reiniciar `npm run dev` |
| `MongooseServerSelectionError: Authentication failed` / connect refused | Puerto de Mongo no coincide con `.env` (típicamente `27017` vs `27018`) | Ajustar `MONGO_URI` en backend `.env` |
| `EADDRINUSE :::3000` al arrancar backend | Otro backend ya escuchando en el puerto | `lsof -ti:3000 \| xargs kill -9` y reintentar |
| `{"error":"Falta el token de autenticacion"}` (401) en cualquier endpoint IA | Sesión expirada o `localStorage.token` ausente | Login de nuevo |
| Alert genérico `Error al guardar la comida. Intenta de nuevo.` sin info extra | **Ya corregido en MVP final**: `api.ts` normaliza errores AI; ahora el alert muestra el mensaje real del backend (p. ej. `Invalid request body: ...`) | Si reaparece, comprobar que la fix de `api.ts` sigue vigente |
| Alert/`console.error` con `[object Object]` | **Ya corregido**: `api.ts` extrae `.message` del shape AI antes de lanzar `ApiError` | Si reaparece, revisar `frontend/src/services/api.ts` |
| Análisis funciona pero al guardar `400 Bad Request` con `name too long` | El nombre detectado por la IA excede 100 chars y el user no lo recortó | El endpoint `/analyze-preview` ya trunca a 100; si reaparece, revisar lógica de truncado en `aiLegacyAnalyze.controller.ts` |
| `/asistente-ia` redirige a `/login` aunque acabes de loguearte | Hot-reload del frontend perdió el estado de `AuthContext` pero `localStorage.token` sigue ahí | Refrescar la pestaña (F5) |

---

## 11. Comandos de validación

```bash
# Backend
cd backend
npm run lint    # tsc --noEmit, debe salir limpio
npm test        # Vitest, esperado 101/101

# Frontend
cd frontend
npm run lint    # ESLint, esperado 0 errores (2 warnings preexistentes en MenuSugerido, fuera de scope)
npm run build   # tsc -b + vite build, esperado OK
```

Si los cuatro comandos pasan **y** los pasos 5–9 funcionan en navegador, el MVP IA se considera validado.

---

## 12. Qué NO valida este smoke

- **Coste real** de tokens / llamadas (ver deuda técnica #8 — métricas).
- **Rate limiting** (no implementado — deuda #2).
- **Carga concurrente** (un solo usuario, un solo dispositivo).
- **Mongo en producción** (este checklist asume Mongo local en Docker).
- **HTTPS / dominios reales** (solo `localhost`).

---

## Ver también

- [docs/ai-module-current-status.md](../../ai-module-current-status.md) — resumen ejecutivo del MVP.
- [provider-router-gemini-deepseek.md](provider-router-gemini-deepseek.md) — detalle del router DeepSeek/Gemini.
- [user-assistant-dashboard.md](user-assistant-dashboard.md) — pantalla `/asistente-ia`.
- [plate-analysis-product-flow.md](plate-analysis-product-flow.md) — flujo de `/registrar-comida`.
- [docs/ai-chat-real-smoke-test.md](../../ai-chat-real-smoke-test.md) — smoke histórico de chat (anterior al MVP final).
- [docs/ai-real-smoke-test-results.md](../../ai-real-smoke-test-results.md) — resultados de smokes anteriores.
