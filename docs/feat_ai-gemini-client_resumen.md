# feat/ai-gemini-client — Resumen técnico

**Rama:** `feat/ai-gemini-client`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-21
**SDK:** `@google/genai` v2.4.0

---

## Objetivo

Crear un cliente interno para Gemini que encapsule el SDK `@google/genai`, gestione configuración,
errores y respuesta JSON, sin crear endpoints públicos ni inicializar conexiones al arrancar la app.

---

## Archivos creados

| Archivo | Descripción |
|---|---|
| `backend/src/modules/ai/providers/aiProvider.types.ts` | Tipos compartidos y clase `AiProviderError` |
| `backend/src/modules/ai/providers/geminiClient.ts` | `createGeminiClient()` y `generateGeminiJson()` |
| `backend/src/modules/ai/providers/index.ts` | Re-exportaciones del módulo providers |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/src/modules/ai/index.ts` | +`export * from './providers/index.js'` |
| `backend/package.json` | +`"type": "module"` — necesario para que TypeScript resuelva correctamente el SDK ESM |

---

## Variables de entorno necesarias

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GEMINI_API_KEY` | Clave de la API de Google AI | `AIza...` |
| `GEMINI_MODEL` | Modelo a usar (fallback incluido) | `gemini-2.5-flash` |

Ambas ya estaban en `backend/.env.example`. Sin cambios en ese archivo.

---

## API del cliente

### `createGeminiClient(): GoogleGenAI`

Crea y devuelve una instancia configurada de `GoogleGenAI`.
Lanza `AiProviderError('missing_api_key')` si no está configurada la clave.
**No llamar al arrancar la app** — se instancia bajo demanda.

### `generateGeminiJson<T>(request: AiProviderRequest): Promise<AiProviderJsonResponse<T>>`

Envía un prompt estructurado a Gemini y devuelve la respuesta parseada.

**Parámetros:**
```ts
interface AiProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;          // por defecto process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  temperature?: number;
  maxOutputTokens?: number;
}
```

**Respuesta:**
```ts
interface AiProviderJsonResponse<T> {
  text: string;      // texto bruto de Gemini
  parsed: T | null;  // resultado de JSON.parse(text) — siempre T en happy path
  raw: unknown;      // objeto response completo del SDK
  metadata: {
    provider: 'gemini';
    model: string;
    cached: false;
  };
}
```

**Llamada al SDK:**
```ts
client.models.generateContent({
  model,
  contents: request.userPrompt,
  config: {
    systemInstruction: request.systemPrompt,
    responseMimeType: 'application/json', // JSON estricto, sin markdown
    temperature?,
    maxOutputTokens?,
  },
});
```

---

## Errores controlados

| Código | Cuándo se lanza |
|---|---|
| `missing_api_key` | `GEMINI_API_KEY` no está en `process.env` |
| `invalid_response` | Gemini devuelve texto vacío |
| `provider_error` | La llamada al SDK falla por red, límite de cuota, etc. |
| `json_parse_error` | El texto de la respuesta no es JSON válido |

Todos heredan de `AiProviderError extends Error` con campo `code: AiProviderErrorCode`.
La **validación Zod** y la **persistencia en Mongo** son responsabilidad del service layer.

**Decisión de diseño:** `json_parse_error` lanza error en lugar de devolver `parsed: null`,
para que el service layer lo capture y decida si reintentar, loggear o devolver error al usuario.

---

## Por qué se añadió `"type": "module"` al package.json

`@google/genai` v2.4.0 tiene `"type": "module"` en su propio `package.json`.
TypeScript con `"module": "Node16"` sin `"type": "module"` en el backend trata los archivos
del proyecto como CJS y lanza `error TS1479` al importar el SDK.

Todos los archivos del backend ya usaban `import`/`export` con extensiones `.js` (compatible con ESM)
desde la configuración inicial del tsconfig, por lo que añadir `"type": "module"` no rompe
ningún archivo existente y es la solución estándar para proyectos Node.js ESM con TypeScript 6.

---

## Cómo probar cuando haya API key

```ts
import { generateGeminiJson } from './modules/ai/providers/index.js';
import { aiChatPromptTemplate } from './modules/ai/prompts/index.js';
import { buildRenderedPrompt } from './modules/ai/prompts/index.js';

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

const result = await generateGeminiJson({
  systemPrompt: rendered.systemPrompt,
  userPrompt: rendered.userPrompt,
  temperature: 0.3,
});

console.log(result.parsed);
console.log(result.metadata);
```

Llamada real NO ejecutada — no hay `GEMINI_API_KEY` configurada en el entorno de desarrollo local.

---

## Qué NO se implementó

- No se llama a Gemini al arrancar la app.
- No hay routes ni controllers.
- No hay validación Zod en este layer.
- No hay persistencia en Mongo.
- No hay caché (campo `cached: false` reservado para service layer).
- No hay reintentos automáticos (responsibility del service layer).
- No hay streaming (puede añadirse con `streamGenerateContent` del SDK si el proyecto lo necesita).

---

## Verificación

```
npm run check   ✓  (0 errores TypeScript)
npm run build   ✓  (0 errores, emite dist/)
GEMINI_API_KEY  —  no configurada, no se probó llamada real
```

---

## Siguiente paso recomendado

**Rama:** `feat/ai-chat-service`

Objetivo: crear el servicio `AiChatService` que:
1. Recibe un `AiChatRequest` validado por Zod.
2. Construye el prompt con `buildRenderedPrompt`.
3. Llama a `generateGeminiJson<AiChatResponse>`.
4. Valida la respuesta con `aiChatResponseSchema.safeParse`.
5. Persiste en MongoDB (conversación + mensaje).
6. Devuelve `AiServiceResult<AiChatStructuredData>`.
