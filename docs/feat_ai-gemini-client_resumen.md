# Feature: `feat/ai-gemini-client` — Cliente interno para Gemini (@google/genai)

> Rama: `feat/ai-gemini-client`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + TypeScript + `@google/genai` 2.4.0
> Estado: implementado, type-check y build OK, **sin llamadas reales a Gemini**, **sin commit ni push**.

---

## 1. Objetivo

Encapsular el SDK `@google/genai` en un cliente interno del módulo IA que:

- gestione configuración por entorno,
- exponga errores tipados,
- devuelva siempre JSON parseado,
- permita ser consumido por la futura capa de service (validación Zod + persistencia + cache),
- no exponga la API key,
- no se llame al arrancar la app,
- no cree endpoints públicos.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-gemini-client`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, routes/controllers, servicios reales, modelos Mongoose ni schemas Zod.
- No se añadieron dependencias (`@google/genai` 2.4.0 ya estaba en `dependencies`).
- No se ejecutaron llamadas reales a Gemini.
- La `GEMINI_API_KEY` no aparece en código; solo se lee desde `process.env`.

Decisión transversal: **una sola API key de pago, restringida y sólo en backend**. Los planes `free` / `pro` se controlarán más adelante con límites propios en backend (rate limit, contadores, etc.), no con varias API keys.

---

## 3. Archivos creados / modificados

**Creados previamente en la rama (ya commiteados):**

- [aiProvider.types.ts](../backend/src/modules/ai/providers/aiProvider.types.ts)
- [geminiClient.ts](../backend/src/modules/ai/providers/geminiClient.ts) — extendido en esta tanda.
- [providers/index.ts](../backend/src/modules/ai/providers/index.ts)
- Línea `export * from './providers/index.js'` en [modules/ai/index.ts](../backend/src/modules/ai/index.ts).

**Modificados en esta tanda:**

- [backend/src/modules/ai/providers/geminiClient.ts](../backend/src/modules/ai/providers/geminiClient.ts) — fallbacks de entorno + conversión a dynamic import.
- [backend/.env.example](../backend/.env.example) — añade `GEMINI_TEMPERATURE=0.4` y `GEMINI_MAX_OUTPUT_TOKENS=1024`.

**Documentación reescrita:**

- [docs/feat_ai-gemini-client_resumen.md](feat_ai-gemini-client_resumen.md) — este documento. La versión anterior describía una migración a `"type": "module"` que finalmente no se aplicó (ver §8).

Sin nuevas dependencias.

---

## 4. Variables necesarias

| Variable | Default si no se define | Notas |
|---|---|---|
| `GEMINI_API_KEY` | — (obligatoria) | Si falta → `AiProviderError('missing_api_key')`. Restringida y sólo en backend. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Sobreescribible por petición con `request.model`. |
| `GEMINI_TEMPERATURE` | `0.4` | Parseado con fallback si no es número. Sobreescribible con `request.temperature`. |
| `GEMINI_MAX_OUTPUT_TOKENS` | `1024` | Parseado con fallback y `Math.trunc` para asegurar entero. Sobreescribible con `request.maxOutputTokens`. |

`backend/.env.example` actualizado:

```dotenv
# Gemini IA
GEMINI_API_KEY=replace_with_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.4
GEMINI_MAX_OUTPUT_TOKENS=1024
```

---

## 5. Una sola API key de pago — por qué

- **Seguridad**: una sola key, restringida en Google Cloud (cuota, IPs, referrers, alerts) y guardada solo en `backend/.env`. El frontend nunca la ve.
- **Operativa**: facturación centralizada, cuota agregada, rotación trivial.
- **Diseño de planes**: free/pro se diferencian en el **backend** mediante rate limits, contadores y reglas de negocio (p. ej. número de análisis/día, modelo más caro para pro), no con múltiples keys.
- **Auditoría**: una única source-of-truth para llamadas externas a Gemini.

Esto se refleja también en la metadata de respuesta: `provider: 'gemini'` es enum literal único, sin `providerKeyId` ni equivalentes.

---

## 6. Comportamiento del cliente

### 6.1. `createGeminiClient(): Promise<GoogleGenAI>`

- Lee `GEMINI_API_KEY` perezosamente (en cada llamada). No se invoca al arrancar la app.
- Si falta la clave → lanza `AiProviderError('missing_api_key')`.
- Carga el SDK vía **dynamic import** (`await import('@google/genai')`) y devuelve la instancia configurada.
- `import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };` sólo trae los tipos sin generar `require`.

### 6.2. `generateGeminiJson<T>(request: AiProviderRequest): Promise<AiProviderJsonResponse<T>>`

Flujo:

1. Resuelve `model`, `temperature`, `maxOutputTokens` (request → env → default).
2. Llama a `createGeminiClient()` perezosamente.
3. Invoca `client.models.generateContent({ model, contents, config })`.
4. `config.systemInstruction = systemPrompt` (no se concatena al user prompt).
5. `config.responseMimeType = 'application/json'` → fuerza JSON nativo del SDK. **No** se añade la instrucción textual "Devuelve solo JSON válido…" porque `responseMimeType` ya lo garantiza sin depender de `zod-to-json-schema` u otros paquetes.
6. Extrae `response.text`.
7. Si está vacío → `AiProviderError('invalid_response')`.
8. Si `JSON.parse(text)` falla → `AiProviderError('json_parse_error')` con los primeros 300 chars del texto crudo.
9. Si la propia llamada al SDK falla → `AiProviderError('provider_error')` envolviendo el original como `cause`.
10. **No** valida contra Zod. **No** persiste en Mongo. **No** cachea.

Devuelve:

```ts
{
  text: string,         // texto crudo devuelto por Gemini
  parsed: T,            // JSON parseado (tipado por el caller)
  raw: unknown,         // response completa del SDK (debug)
  metadata: {
    provider: 'gemini',
    model: string,
    cached: false,
  },
}
```

### 6.3. Tipos exportados (`aiProvider.types.ts`)

- `AiProviderName = 'gemini'`
- `AiProviderRequest = { systemPrompt; userPrompt; model?; temperature?; maxOutputTokens? }`
- `AiProviderJsonResponse<T = unknown>` con `text`, `parsed`, `raw`, `metadata`
- `AiProviderErrorCode = 'missing_api_key' | 'invalid_response' | 'provider_error' | 'json_parse_error'`
- `AiProviderError extends Error` con `code` y `cause` (vía `Error.cause` de ES2022).

---

## 7. Errores controlados

| Código | Lanzado cuando | Quién debe manejarlo |
|---|---|---|
| `missing_api_key` | No hay `GEMINI_API_KEY` en `process.env`. | Capa de service (HTTP 500 + log) o caller al primer uso. |
| `invalid_response` | El SDK devuelve `text` vacío o solo whitespace. | Service: reintentar con prompt distinto, fallback, registrar incidencia. |
| `provider_error` | El SDK lanza (red, cuota, modelo inválido, etc.). | Service: log + categorizar por subtipo si interesa. |
| `json_parse_error` | El texto no parsea como JSON. | Service: log con primeros 300 chars + decisión (reintento o respuesta de error al usuario). |

Todos heredan `Error.cause` para mantener el stack original.

---

## 8. Decisión técnica relevante: dynamic import (no migrar a ESM)

`@google/genai` 2.4.0 declara `"type": "module"` y el resolvedor de Node16/CJS no permite hacer `import { GoogleGenAI } from '@google/genai'` desde un archivo CJS. La primera ejecución de `tsc --noEmit` rompió con `TS1479`.

Opciones evaluadas y decisión:

| Opción | Decisión |
|---|---|
| Migrar backend a ESM (`"type": "module"` en `package.json`) | Descartada — impacto global, exige reescribir el seeder (`require.main === module`) y otros entry-points. |
| Cambiar `module: NodeNext` en `tsconfig.json` | Descartada — riesgo de side-effects sutiles en otros archivos. |
| **Dynamic import + `import type` con `resolution-mode: 'import'`** | **Elegida.** Cambio contenido a `geminiClient.ts`. El resto del backend sigue CJS. |

Implementación:

```ts
import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };

export async function createGeminiClient(): Promise<GoogleGenAI> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new AiProviderError(
      'GEMINI_API_KEY is not set. Add it to your .env file.',
      'missing_api_key',
    );
  }
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}
```

Trade-off: `createGeminiClient` pasa a ser `async`. Todos los callers internos ya están en contexto async (`generateGeminiJson` lo es), así que no hay propagación. Si en el futuro se migra el backend a ESM, este patrón sigue funcionando sin cambios.

> Nota: la versión inicial de este documento describía una migración a `"type": "module"`. Esa ruta finalmente no se aplicó; queda anotada aquí como histórico de la decisión.

---

## 9. Qué NO se ha implementado (intencional)

- ❌ Validación Zod de la respuesta (será una feature posterior de service layer).
- ❌ Persistencia en `AiMessage` / `AiCacheEntry`.
- ❌ Caché de respuestas (`metadata.cached` es siempre `false` por contrato).
- ❌ Reintentos automáticos, backoff exponencial, circuit breaker.
- ❌ Streaming (`generateContentStream`).
- ❌ Multimodal real (visión / audio): la firma actual sólo admite `userPrompt` textual; el análisis de plato vendrá en otra feature con `inlineData`.
- ❌ Endpoints públicos.
- ❌ Llamadas reales a Gemini (no se ejecutó porque no hay `GEMINI_API_KEY` configurada en esta máquina y la regla lo exige).
- ❌ Tests automatizados (queda para una rama con `vitest` o similar + mocks).
- ❌ Dependencias nuevas (`zod-to-json-schema`, etc.).

---

## 10. Cómo se probará cuando haya API key

> ⚠️ **No ejecutar sin permiso explícito.** Las pruebas reales consumen cuota de pago.

Script ad-hoc (no se commitea):

```ts
// backend/src/scripts/try-gemini.ts (temporal, no commitear)
import 'dotenv/config';
import {
  generateGeminiJson,
  buildRenderedPrompt,
  aiChatPromptTemplate,
} from '../modules/ai/index.js';

(async () => {
  const rendered = buildRenderedPrompt({
    systemPrompt: aiChatPromptTemplate.systemPrompt,
    userPromptTemplate: aiChatPromptTemplate.userPromptTemplate,
    variables: {
      message: '¿Qué desayuno me recomiendas?',
      objective: 'lose_weight',
      caloriesTarget: 1800,
      proteinTarget: 120,
      carbsTarget: 200,
      fatTarget: 60,
      plan: 'free',
    },
  });

  const r = await generateGeminiJson<{ responseText: string }>({
    systemPrompt: rendered.systemPrompt,
    userPrompt: rendered.userPrompt,
  });
  console.log(r.metadata, r.parsed);
})().catch((err) => {
  console.error(err.code ?? 'unknown', err.message);
  process.exit(1);
});
```

Ejecución (con `.env` configurado):

```bash
cd backend
npx tsx src/scripts/try-gemini.ts
```

Checks manuales esperados:

- Sin `GEMINI_API_KEY` → error `missing_api_key`.
- Con `GEMINI_API_KEY` válida → `metadata = { provider: 'gemini', model: 'gemini-2.5-flash', cached: false }` y `parsed` con la forma definida en el prompt.
- Con prompt que fuerce respuesta no-JSON: debería seguir devolviendo JSON gracias a `responseMimeType`; si no, `json_parse_error`.

---

## 11. Verificación check / build

Primera ejecución del check tras añadir el provider rompió con:

```
TS1479  The current file is a CommonJS module whose imports will produce
        'require' calls; however, the referenced file is an ECMAScript module
        and cannot be imported with 'require'.
```

Después se introdujo el `import type` y el dynamic import. Un segundo error apareció:

```
TS1541  Type-only import of an ECMAScript module from a CommonJS module
        must have a 'resolution-mode' attribute.
```

Resuelto añadiendo `with { 'resolution-mode': 'import' }` al `import type`. Resultado final:

```
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status (en esta tanda):
  modified:   backend/.env.example
  modified:   backend/src/modules/ai/providers/geminiClient.ts

git diff --stat:
  backend/.env.example                             |  2 ++
  backend/src/modules/ai/providers/geminiClient.ts | 37 ++++++++++++++++--------
  2 files changed, 27 insertions(+), 12 deletions(-)
```

(Los 3 archivos del directorio `providers/` y la línea de export en `modules/ai/index.ts` ya estaban commiteados en la rama; esta tanda los extiende.)

---

## 12. Siguiente paso recomendado

1. **Service layer del módulo IA** que:
   - cargue la plantilla activa por `promptKey` desde Mongo,
   - renderice con `renderPromptTemplate` / `buildRenderedPrompt`,
   - llame a `generateGeminiJson`,
   - **valide la respuesta JSON contra los `*ResponseSchema` Zod**,
   - persista en `AiMessage` y haga upsert en `AiCacheEntry` con `cacheKey = hash(systemPrompt + userPrompt + model)`.
2. **Middleware de validación Zod** para las futuras rutas Express.
3. **Tests** del provider con un mock del SDK (`vi.mock('@google/genai')`) para cubrir los 4 códigos de error sin gastar cuota.
4. **Multimodal**: extender `AiProviderRequest` con `images?: Array<{ mimeType: string; base64: string }>` cuando arranque el análisis de plato real.
5. **Rate limit por plan** (free/pro) en el middleware antes de invocar el provider.

---

## 13. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/.env.example \
        backend/src/modules/ai/providers/geminiClient.ts \
        docs/feat_ai-gemini-client_resumen.md

git commit -m "feat(ai): wire env config and dynamic import for Gemini client

- Read GEMINI_TEMPERATURE and GEMINI_MAX_OUTPUT_TOKENS from env (defaults 0.4 / 1024)
- Normalize numeric env parsing; truncate maxOutputTokens to integer
- Always apply temperature and maxOutputTokens in Gemini config
- Switch to dynamic import for @google/genai (ESM-only) with typed
  resolution-mode to keep the backend in CJS without TS1479/TS1541
- Add GEMINI_TEMPERATURE and GEMINI_MAX_OUTPUT_TOKENS to .env.example
- Rewrite docs/feat_ai-gemini-client_resumen.md (replaces 'type: module' draft)
- No real Gemini calls, no routes, no Zod validation here"
```

Sin commit ni push.
