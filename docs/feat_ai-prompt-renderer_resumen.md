# feat/ai-prompt-renderer — Resumen técnico

**Rama:** `feat/ai-prompt-renderer`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-21

---

## Objetivo

Crear una utilidad interna para renderizar plantillas de prompts con placeholders `{{key}}`
usando datos validados previamente, sin dependencias externas ni acoplamiento a Gemini o MongoDB.

---

## Archivos creados / modificados

| Archivo | Acción |
|---|---|
| `backend/src/modules/ai/prompts/renderPromptTemplate.ts` | Creado — utilidad completa de renderizado |
| `backend/src/modules/ai/prompts/index.ts` | Modificado — nuevas exportaciones añadidas |

---

## Funciones exportadas

### `renderPromptTemplate(template, variables)`

Reemplaza todos los placeholders `{{key}}` o `{{ key }}` encontrados en el template.

- `string | number | boolean` → convierte con `String(value)`.
- `object | array` → convierte con `JSON.stringify(value, null, 2)`.
- `null | undefined` → string vacío `""`.
- Placeholder no encontrado en variables → string vacío `""` (sin error).

### `extractPromptVariables(template)`

Devuelve la lista única de nombres de placeholders presentes en el template.

```ts
extractPromptVariables('Hola {{nombre}}, tu objetivo es {{objetivo}}.')
// → ['nombre', 'objetivo']
```

### `findMissingPromptVariables(template, variables)`

Devuelve los placeholders presentes en el template que faltan en variables (ausentes, `null` o `undefined`).

```ts
findMissingPromptVariables('{{message}} — {{objective}}', { message: 'hola' })
// → ['objective']
```

### `buildRenderedPrompt(input)`

Combina renderizado de userPromptTemplate y detección de variables faltantes en una sola llamada.

**Input:**
```ts
{
  systemPrompt: string;
  userPromptTemplate: string;
  variables: RenderPromptVariables;
}
```

**Output:**
```ts
{
  systemPrompt: string;       // devuelto tal cual (no renderizado)
  userPrompt: string;         // template renderizado con las variables
  missingVariables: string[]; // placeholders que faltaban al renderizar
}
```

---

## Tipo exportado

```ts
type RenderPromptVariables = Record<
  string,
  string | number | boolean | null | undefined | object | unknown[]
>
```

---

## Placeholders soportados

| Formato | Soportado |
|---|---|
| `{{key}}` | Sí |
| `{{ key }}` | Sí (espacios interiores ignorados) |
| `{{key}}` repetido varias veces | Sí (se reemplaza cada ocurrencia) |
| `{{ key }}` con mayúsculas | Sí (`\w+` incluye mayúsculas) |
| `{{key.nested}}` | No — solo identificadores simples |
| `{key}` | No — requiere doble llave |

---

## Comportamiento con variables faltantes

El renderer **no lanza errores** si falta una variable. En su lugar:

- El placeholder desaparece del prompt final (se sustituye por `""`).
- La función `findMissingPromptVariables` informa de qué faltaba.
- El campo `missingVariables` en `buildRenderedPrompt` registra la lista completa.

Esto permite detectar datos incompletos antes de enviar a Gemini sin bloquear el flujo.

---

## Ejemplo de uso

```ts
import {
  buildRenderedPrompt,
  extractPromptVariables,
  findMissingPromptVariables,
} from './modules/ai/prompts/index.js';
import { aiChatPromptTemplate } from './modules/ai/prompts/index.js';

const variables = {
  message: '¿Qué desayuno saludable me recomiendas?',
  objective: 'pérdida de peso',
  caloriesTarget: 1800,
  proteinTarget: 120,
  carbsTarget: null,    // falta
  fatTarget: undefined, // falta
  plan: 'free',
};

const result = buildRenderedPrompt({
  systemPrompt: aiChatPromptTemplate.systemPrompt,
  userPromptTemplate: aiChatPromptTemplate.userPromptTemplate,
  variables,
});

console.log(result.userPrompt);
// Mensaje del usuario:
// """
// ¿Qué desayuno saludable me recomiendas?
// """
// ...
// - Hidratos objetivo (g):
// - Grasa objetivo (g):
// ...

console.log(result.missingVariables);
// → ['carbsTarget', 'fatTarget']
```

---

## Qué NO se implementó

- No se llama a Gemini.
- No se modifican modelos Mongoose ni schemas Zod.
- No se crean routes ni controllers.
- No se añaden dependencias externas.
- No se implementa lógica de negocio (cálculos, validaciones de salud).
- No se implementa caché ni RAG.
- No hay soporte de placeholders anidados (`{{user.name}}`).

---

## Verificación

```
npm run check   ✓  (0 errores TypeScript)
npm run build   ✓  (0 errores, emite dist/)
```

---

## Siguiente paso recomendado

**Rama:** `feat/ai-gemini-service`

Objetivo: crear el servicio que recibe un `BuildRenderedPromptOutput` y lo envía a Gemini,
parsea la respuesta y la valida con los schemas Zod existentes antes de persistir en MongoDB.
