# fix/ai-prompt-seeder-esm-entrypoint — Resumen técnico

**Rama:** `fix/ai-prompt-seeder-esm-entrypoint`
**Base:** `integration/david-ai-stack`
**Fecha:** 2026-05-21

---

## Error original

```
ReferenceError: require is not defined in ES module scope
```

Archivo: `backend/src/modules/ai/seeders/seedAiPromptTemplates.ts`
Línea: `if (require.main === module) { ... }`

---

## Causa

El archivo usaba el patrón CommonJS `require.main === module` para detectar si era el script
principal. Cuando se añadió `"type": "module"` al `backend/package.json` (necesario para
importar `@google/genai` que es ESM-only), Node.js/tsx pasó a tratar todos los archivos `.ts`
como módulos ESM. En ESM no existe `require` en el scope del módulo.

---

## Solución aplicada

Cambio mínimo en `seedAiPromptTemplates.ts`: dos líneas añadidas, cuatro reemplazadas.

**Antes:**
```ts
// CJS-compatible entry-point detection
if (require.main === module) {
  main().catch(...);
}
```

**Después:**
```ts
import { fileURLToPath } from 'node:url';

// ESM entry-point detection
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch(...);
}
```

### Por qué funciona

- `import.meta.url` — URL absoluta del módulo actual (ej. `file:///…/seedAiPromptTemplates.ts`).
- `fileURLToPath(import.meta.url)` — convierte la URL a ruta del sistema de archivos.
- `process.argv[1]` — ruta del script pasado a `tsx` o `node` al ejecutarlo directamente.
- La comparación es equivalente a `require.main === module` en semántica: solo es `true`
  cuando el archivo es el punto de entrada directo, no cuando se importa desde otro módulo.

`fileURLToPath` es parte de `node:url` (built-in de Node.js), sin dependencias nuevas.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/src/modules/ai/seeders/seedAiPromptTemplates.ts` | +`import { fileURLToPath } from 'node:url'`, reemplazo de `require.main === module` por `isMain` |
| `backend/package.json` | +`"type": "module"` (arrastrado de `feat/ai-gemini-client`) |

---

## Verificación

```
npm run check   ✓  (0 errores TypeScript)
npm run build   ✓  (0 errores)
```

```
npm run seed:ai-prompts

[mongo] Connected
[seed:ai-prompts] Processing 4 prompt template(s)...
[seed:ai-prompts] CREATED   ai_chat_coach@v1 (chat)
[seed:ai-prompts] CREATED   ai_menu_generator@v1 (menu_generation)
[seed:ai-prompts] CREATED   ai_plate_analysis@v1 (plate_analysis)
[seed:ai-prompts] CREATED   ai_profile_explanation@v1 (profile_explanation)
[seed:ai-prompts] Done. created=4, updated=0, unchanged=0, total=4
[seed:ai-prompts] OK
[seed:ai-prompts] Mongo disconnected.
```

Los 4 prompts versionados se insertaron correctamente en MongoDB.

---

## Qué NO se tocó

- `tsconfig.json` — sin cambios.
- Frontend, Docker, Gemini client.
- La función exportada `seedAiPromptTemplates()` sigue exportada y reutilizable desde otros módulos.
- Ningún otro archivo del backend.

---

## Comando para commit

```bash
git add backend/src/modules/ai/seeders/seedAiPromptTemplates.ts backend/package.json
git commit -m "fix(ai): replace require.main with ESM import.meta.url in prompt seeder"
```
