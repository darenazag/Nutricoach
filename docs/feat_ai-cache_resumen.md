# Feature: `feat/ai-cache` — Caché MVP de resultados IA para menú y profile-explanation

> Rama: `feat/ai-cache` (salida desde `integration/david-ai-stack`)
> Stack: Node.js + TypeScript + Mongoose 9 (`AiCacheEntry`) + Zod 4 + `@google/genai`
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit**.

---

## 1. Alcance

Activar el modelo `AiCacheEntry` (con su TTL ya configurado) en los dos endpoints **one-shot** del módulo IA:

- `POST /api/ai/menu` → `runAiMenu`
- `POST /api/ai/profile-explanation` → `runAiProfileExplanation`

El service `aiCache.service.ts` expone helpers genéricos (`buildCacheKey`, `tryGetCached`, `storeCache`) reutilizables por cualquier futuro caller. Cero dependencias nuevas — todo se apoya en `node:crypto`, los repositorios existentes y el modelo `AiCacheEntry` (que ya tenía índice TTL desde la primera feature del sprint).

---

## 2. Endpoints cacheados

| Endpoint | Cacheado | Por qué |
|---|---|---|
| `POST /api/ai/menu` | ✅ | One-shot. Mismo `objective + caloriesTarget + macros + days + mealsPerDay + notes + plan` → mismo menú. Ahorro inmediato cuando varios usuarios piden parámetros similares. |
| `POST /api/ai/profile-explanation` | ✅ | One-shot. Mismo `objective + BMR + TDEE + caloriesTarget + macros + plan` → misma explicación. |
| `POST /api/ai/chat` | ❌ | Conversacional. Cachear rompe el flujo: la misma "pregunta" en dos hilos distintos quiere respuestas distintas según contexto. **Decisión firme**. |
| `POST /api/ai/plate-analysis` | ❌ | Multimodal (Gemini Vision). El cacheKey actual no contempla la imagen (sería `sha256` del buffer base64 → posible, pero queda fuera de esta fase para mantener el MVP pequeño). |

---

## 3. Por qué `chat` queda **fuera** del cache

- **Contexto**: el chat se construye sobre `conversationId` y el mensaje del usuario depende del historial implícito que esa conversación representa. Cachear por el par `(systemPrompt, userPrompt)` ignoraría todo eso.
- **Confusión de usuario**: dos personas con el mismo mensaje exacto en hilos distintos esperan respuestas matizadas, no idénticas. Cachear las haría sentir "scripted".
- **Sin ahorro real**: el chat suele variar en cada turno; el hit rate sería bajo.
- **Side-effect en historial**: cachear un assistant message implicaría persistir un mensaje "asistente" que no fue generado en ese turno — distorsiona la auditoría del hilo.

---

## 4. Por qué `plate-analysis` queda fuera de **esta fase**

- El input incluye un **binario de imagen** que no entra en el `cacheKey` actual. Habría que hashear el buffer (`sha256(image.buffer)`) y combinarlo con el prompt. Es 3-5 líneas extra de código y una decisión sobre cómo serializar la imagen para el hash.
- Esta feature MVP se centra en validar el patrón (helpers + flujo hit/miss + persistencia) sobre los dos casos textuales. Cuando el patrón esté en producción, una rama posterior puede sumar plate-analysis con la variante multimodal.
- Cero riesgo de regresión: `runAiPlateAnalysis` no se ha tocado en esta rama.

---

## 5. Diseño del `cacheKey`

```ts
sha256( JSON.stringify({
  systemPrompt,    // rendered (igual para todo el endpoint dado un promptVersion)
  userPrompt,      // rendered con los placeholders del request real
  model,           // process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  promptVersion,   // del template (ej. 'v1')
}) )
```

Salida: hex sha256 (64 chars).

Garantías:

- **Determinista**: misma combinación → misma key.
- **Insensible al orden**: las claves del objeto son fijas, no se serializa el `request` crudo.
- **Versionado**: cambiar `promptVersion` invalida toda la caché previa sin tocar el modelo Mongo (TTL la barre con el tiempo; el nuevo tráfico ya no la consulta).
- **Aislado por modelo**: cambiar `GEMINI_MODEL` (de `gemini-2.5-flash` a otro) genera keys distintas.

Sobre el `model` resuelto: el service usa `process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash'` (el modelo que **pide**, no el que Gemini reporta en `metadata.model` después). Esto es:

- consistente con la construcción del cacheKey (que sucede **antes** de llamar a Gemini),
- estable entre runs (Gemini puede pinear `-001` internamente y eso no debe romper la cache),
- documentado en `aiCache.service.ts`.

`inputHash` se guarda igual al `cacheKey` por simplicidad. El modelo `AiCacheEntry` lo tiene como índice; en futuras analíticas (cuántos prompts únicos hubo en X días) basta con `distinct('inputHash')`.

---

## 6. TTL

```
AI_CACHE_TTL_SECONDS  → leído de process.env
                     ↓
   undefined/'' o no numérico → DEFAULT_CACHE_TTL_SECONDS = 86400 (24h)
   número > 0                  → expiresAt = now + ttl
   número <= 0                 → NO se setea expiresAt (cache PERMANENTE)
```

Comportamiento del TTL en Mongo:

- `AiCacheEntry` tiene `{ expiresAt: 1, expireAfterSeconds: 0 }`. El sweep background borra el doc cuando `expiresAt < now`.
- Defensivamente, `tryGetCached` también comprueba `expiresAt` en runtime: el sweep de Mongo puede tardar hasta ~60s, y queremos evitar devolver un hit "ya expirado" en esa ventana.
- Si `expiresAt` está **omitido** (caso `ttlSeconds <= 0`), Mongo no lo borra nunca. Es un escape hatch documentado — útil para fixtures o tests, **no** recomendable en producción.

24h de default cubre el caso típico: el usuario reabre la app, el menú/explicación es el mismo y se sirve de cache, eliminando una llamada de pago.

---

## 7. Persistencia en cache **hit**

Decisión firme: en hit **se persiste igualmente el assistant message en `AiMessage`**, con:

- `provider: 'gemini'`
- `model: resolvedModel` (el del cacheKey, no el de runtime de Gemini porque no hubo llamada)
- `promptVersion: template.version`
- `safety: mapSafetyForPersistence(aiResponse.safety)` (mapeo a `{ blocked, reason }` ya usado en el resto de services)
- `structuredData` y `content` reconstruidos del JSON cacheado tras validarlo con el mismo Zod schema que en miss.

Por qué persistir igualmente:

- **Auditoría**: la conversación queda completa en Mongo. Un usuario que ve la respuesta tiene su `AiMessage` correspondiente, indistinguible operacionalmente de un miss.
- **Trazabilidad de side-effect**: ya hemos creado la `AiConversation` y el user message; saltarse el assistant message dejaría conversaciones huérfanas.
- **Una sola forma**: el response al cliente es idéntico en shape entre hit y miss; solo cambia `metadata.cached`.

Lo que **no** se hace en hit:

- No se llama a Gemini.
- No se re-escribe en cache (sí se incrementa `hitCount` best-effort dentro de `tryGetCached`).

---

## 8. Flujo `runAiMenu` / `runAiProfileExplanation` actualizado

```
validar request (Zod)                                   → validation_error
   ↓
createConversation + addMessage(user) [igual que antes] → persistence_error
   ↓
getDefaultPromptTemplate + buildRenderedPrompt
   ↓
cacheKey = sha256({systemPrompt, userPrompt, model, promptVersion})
   ↓
cachedJson = tryGetCached(cacheKey)            // hit-counter incrementado dentro
   ↓
   ┌─────────────────────────┐         ┌───────────────────────────────┐
   │ if cachedJson !== null  │         │ else (miss)                   │
   │   validateAiResponse    │         │   generateGeminiJson          │
   │   usedProvider='gemini' │         │   validateAiResponse          │
   │   usedModel=resolved    │         │   storeCache(best-effort)     │
   │   cached=true           │         │   usedProvider/Model=provider │
   │                         │         │   cached=false                │
   └─────────────────────────┘         └───────────────────────────────┘
   ↓
addMessage(assistant) [igual flujo, usando usedProvider/usedModel]
   ↓
return { responseText, structuredData, safety, conversationId,
         metadata: { provider: usedProvider, model: usedModel,
                     promptVersion, cached } }
```

`runAiChat` y `runAiPlateAnalysis` **NO se han tocado**.

---

## 9. Errores controlados

Los códigos siguen siendo los mismos:

| Código | Cuándo (en relación al cache) |
|---|---|
| `validation_error` | Request inválido **o** payload cacheado corrupto (la validación es la misma que en miss). |
| `prompt_not_found` | Template ausente — antes del cache lookup. |
| `provider_error` | Gemini fail en miss. |
| `persistence_error` | Fallo Mongo creando conversación / persistiendo mensajes (igual que antes). |

**`storeCache` y `tryGetCached` no propagan errores propios**: se loguean con `console.warn` y el flujo cae al camino "miss" (lookup) o "skip" (store). El cache nunca debe romper la respuesta al usuario.

Consecuencia: si Mongo está caído, las dos rutas siguen funcionando — solo pierden el ahorro. Si la cache devuelve datos corruptos, el siguiente intento los regenera tras la `validation_error` que el caller verá una sola vez.

---

## 10. Archivos creados / modificados

**Creados (1):**

- [backend/src/modules/ai/services/aiCache.service.ts](../backend/src/modules/ai/services/aiCache.service.ts) — `buildCacheKey`, `tryGetCached`, `storeCache`, `getCacheTtlSeconds`, tipos `BuildCacheKeyInput` / `StoreCacheInput`.

**Modificados (3):**

- [backend/src/modules/ai/services/aiMenu.service.ts](../backend/src/modules/ai/services/aiMenu.service.ts) — flujo hit/miss + `type: 'menu_generation'` en `storeCache`.
- [backend/src/modules/ai/services/aiProfileExplanation.service.ts](../backend/src/modules/ai/services/aiProfileExplanation.service.ts) — flujo hit/miss + `type: 'profile_explanation'` en `storeCache`.
- [backend/src/modules/ai/services/index.ts](../backend/src/modules/ai/services/index.ts) — re-exporta los 4 helpers y los 2 tipos.

**No modificados (intencional):**

- `runAiChat`, `runAiPlateAnalysis`, controllers, routes, prompts, schemas, modelos, repositorios, provider, app, server, errorHandler, frontend, README, demo guide, `package.json`, `tsconfig.json`.

Sin nuevas dependencias.

---

## 11. Verificación check / build

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status --short:
   M src/modules/ai/services/aiMenu.service.ts
   M src/modules/ai/services/aiProfileExplanation.service.ts
   M src/modules/ai/services/index.ts
  ?? src/modules/ai/services/aiCache.service.ts

git diff --stat:
   backend/src/modules/ai/services/aiMenu.service.ts                | 100 ++++++++++++++----
   backend/src/modules/ai/services/aiProfileExplanation.service.ts  | 103 ++++++++++++++-----
   backend/src/modules/ai/services/index.ts                         |   8 ++
   3 files changed, 170 insertions(+), 41 deletions(-)
```

Sin llamadas reales a Gemini en esta sesión.

---

## 12. Cómo probar (manual)

Cache miss → hit (sin Gemini real basta para validar el flujo de cache si Mongo está arriba):

```bash
docker compose up -d mongo
cd backend
cp .env.example .env       # editar MONGO_URI; opcionalmente AI_CACHE_TTL_SECONDS=3600
npm run dev
```

Primer POST → miss → 502 (si no hay `GEMINI_API_KEY`) pero la conversación y el user message ya quedan en Mongo. Para validar el cache de verdad **hace falta `GEMINI_API_KEY`** (consume cuota — pedir permiso).

Con `GEMINI_API_KEY`:

```bash
# 1) MISS — Gemini real, se guarda en cache
curl -s -X POST http://localhost:3000/api/ai/menu \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u1","objective":"lose_weight","caloriesTarget":1800,"days":1,"mealsPerDay":3}' \
  | jq '.data.metadata.cached'   # → false

# 2) HIT — mismo body, no se llama a Gemini
curl -s -X POST http://localhost:3000/api/ai/menu \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u1","objective":"lose_weight","caloriesTarget":1800,"days":1,"mealsPerDay":3}' \
  | jq '.data.metadata.cached'   # → true
```

Inspeccionar Mongo:

```js
use nutricoach_ai
db.ai_cache_entries.find().sort({createdAt:-1}).limit(5)
// hitCount debería incrementarse en cada hit posterior al primer miss
```

---

## 13. Limitaciones

- **No invalida cache al cambiar prompts en caliente**: si editas `aiMenu.prompt.ts` sin subir `AI_PROMPT_VERSION`, los hits previos siguen sirviendo el resultado viejo hasta que el TTL los limpie. Workaround: bump del `promptVersion` cuando cambias el contenido del prompt de forma significativa.
- **Cache global, no por usuario**: dos usuarios con el mismo `objective + caloriesTarget + …` comparten el resultado. Es **lo que queremos** para menú/explicación genéricos. Si en el futuro la respuesta empieza a depender de datos personales, el `userId` deberá entrar al `cacheKey`.
- **No hay cache para chat ni plate-analysis** (ver §3 y §4).
- **`hitCount` es best-effort**: si el incremento falla, el hit se sirve igualmente. Las métricas pueden quedar ligeramente por debajo de la realidad.
- **Sin namespacing por entorno**: si dos backends comparten la misma BBDD (dev y staging apuntando al mismo Mongo), comparten cache. En el setup actual con Mongo en docker compose local esto no aplica.
- **`AI_CACHE_TTL_SECONDS=0` → cache permanente**: documentado pero peligroso en producción. Considerar quitarlo a futuro si nadie lo necesita.

---

## 14. Qué NO se ha implementado (intencional)

- ❌ Cache para `runAiChat` (decisión firme).
- ❌ Cache para `runAiPlateAnalysis` (siguiente fase con hash de imagen).
- ❌ Invalidación manual / endpoint admin para borrar cache.
- ❌ Métricas/observabilidad de hit ratio (queda en `hitCount` por entrada; un agregado vendría con la rama de tests + telemetría).
- ❌ Compresión del `resultText` / `resultJson` para entradas grandes.
- ❌ Llamadas reales a Gemini.
- ❌ Tests automatizados (siguiente paso: `feat/ai-tests`).
- ❌ Cambios en frontend, README, demo guide, prompts, schemas, modelos, repos, provider, app, server, errorHandler, package.json.
- ❌ Dependencias nuevas.

---

## 15. Comandos exactos para commit (NO ejecutados)

```bash
# 1) Auditoría previa
git status --short
git diff --stat
git diff --name-only

# 2) Add explícito (sin `git add .`)
git add backend/src/modules/ai/services/aiCache.service.ts \
        backend/src/modules/ai/services/aiMenu.service.ts \
        backend/src/modules/ai/services/aiProfileExplanation.service.ts \
        backend/src/modules/ai/services/index.ts \
        docs/feat_ai-cache_resumen.md

# 3) Commit
git commit -m "feat(ai): add MVP Mongo cache for menu and profile-explanation services

- Add services/aiCache.service.ts with:
  * buildCacheKey({systemPrompt, userPrompt, model, promptVersion}) -> sha256 hex
  * tryGetCached<T>(cacheKey): findCacheByKey + defensive expiresAt check +
    best-effort incrementCacheHit; returns null on miss/expired
  * storeCache(input): upsertCacheEntry with expiresAt only when ttlSeconds > 0
  * getCacheTtlSeconds(): env AI_CACHE_TTL_SECONDS with 86400 fallback
- Plug cache into runAiMenu and runAiProfileExplanation:
  * compute cacheKey after rendering the prompt
  * on HIT  -> validate cached JSON with the same Zod schema, mark cached=true,
              still persist the assistant AiMessage for audit consistency,
              skip Gemini call
  * on MISS -> call Gemini, validate, storeCache (best-effort), persist
              assistant message, mark cached=false
  * cache failures (tryGet/store) are logged and swallowed: cache never breaks the user flow
- Re-export cache helpers from services/index.ts
- runAiChat and runAiPlateAnalysis are NOT touched
- No new dependencies, no schema/model/prompt/provider changes
- No real Gemini calls in this session"
```

Sin `git add .`, sin commit, sin push.
