# feat/ai-tests-mvp — Resumen

## Objetivo

Añadir una suite mínima de tests automatizados al módulo IA para proteger:
- Validación Zod de requests
- Flujo cache HIT / MISS en los tres endpoints cacheados
- Comportamiento del hash de imagen en plate-analysis
- Lectura de conversaciones (read-side)
- Mapeo correcto de errores en el `errorHandler`

Sin llamar nunca a Gemini real.

---

## Dependencias dev añadidas

| Paquete | Versión instalada | Uso |
|---------|-------------------|-----|
| `vitest` | ^4.1.7 | Runner, mocking (vi.mock), assertions |
| `mongodb-memory-server` | ^11.1.0 | MongoDB en memoria para tests de integración |

`supertest` evaluado pero no necesario para el MVP (tests al nivel de servicio, no HTTP).

---

## Estrategia de mocks

### Proveedor Gemini

`generateGeminiJson` y `generateGeminiJsonWithImage` se reemplazan con `vi.fn()` en cada test file mediante `vi.mock`:

```typescript
vi.mock('../../modules/ai/providers/index.js', () => ({
  AiProviderError: class extends Error { /* compatible constructor */ },
  generateGeminiJson: vi.fn(),
  generateGeminiJsonWithImage: vi.fn(),
  createGeminiClient: vi.fn(),
}));
```

- `vi.mock` se eleva (hoisting) al inicio del módulo por Vitest, garantizando que los servicios reciben el mock al importarse.
- `AiProviderError` se proporciona con constructor compatible para que los `instanceof` en los servicios funcionen dentro del worker.
- `beforeEach` resetea el mock y reasigna el valor de retorno por defecto para aislar cada test.

### ¿Por qué mock local y no `importOriginal`?

El módulo `providers/index.js` re-exporta desde `geminiClient.ts`, que contiene un import type con atributo `resolution-mode: 'import'` (TypeScript-specific). Usar `importOriginal()` cargaría el módulo real e interactuaría con el ESM dinámico de `@google/genai`. El mock de fábrica local es más seguro, más rápido y suficiente para el scope MVP.

---

## Estrategia Mongo memory server

- `mongodb-memory-server` arranca un proceso MongoDB en memoria por test worker.
- La conexión Mongoose se establece en `beforeAll` (timeout 60 s para la primera descarga del binario).
- `afterEach` limpia todas las colecciones → no hay estado compartido entre `it()`.
- `afterAll` desconecta Mongoose y para el servidor.

El setup está centralizado en `src/__tests__/ai/setup.ts` y referenciado en `vitest.config.ts` como `setupFiles`, lo que lo aplica a todos los test files automáticamente.

Los modelos Mongoose (`AiConversation`, `AiMessage`, `AiCacheEntry`, `AiPlateAnalysis`) se registran en el momento en que se importan los servicios, y quedan ligados a la conexión en memoria. No se necesita seed de prompts (getDefaultPromptTemplate lee de defaults en memoria).

---

## Tests implementados

### errorHandler.test.ts (7 tests)

| Test | Verifica |
|------|---------|
| `not_found → 404` | AiServiceError('not_found') → HTTP 404 |
| `validation_error → 400` | AiServiceError('validation_error') → HTTP 400 |
| `invalid_image → 400` | AiServiceError('invalid_image') → HTTP 400 |
| `provider_error → 502` | AiServiceError('provider_error') → HTTP 502 |
| `persistence_error → 500` | AiServiceError('persistence_error') → HTTP 500 |
| `AiProviderError → 502` | AiProviderError escapa → fallback 502 |
| `generic Error → 500` | Error genérico → 500 |

### aiConversations.service.test.ts (6 tests)

| Test | Verifica |
|------|---------|
| Devuelve conversation + messages ordenados | Lectura correcta desde MongoDB |
| Empty messages array | Conversación sin mensajes |
| No `_id`/`__v` en conversation DTO | Mapeo limpio de campos |
| No `_id`/`__v` en message DTOs | Mapeo limpio de campos |
| `not_found` para conversationId inexistente | AiServiceError con code correcto |
| `validation_error` para conversationId vacío | Guard de entrada |

### aiMenu.service.test.ts (5 tests)

| Test | Verifica |
|------|---------|
| validation_error sin objective válido | Zod schema reject |
| validation_error con caloriesTarget < 1200 | Zod range validation |
| MISS → cached: false, llama a Gemini 1 vez | Flujo normal |
| HIT → cached: true, no llama a Gemini | Cache funciona |
| HIT contiene mismo responseText | Integridad de datos cacheados |

### aiProfileExplanation.service.test.ts (4 tests)

| Test | Verifica |
|------|---------|
| validation_error sin campos requeridos | Zod schema reject |
| MISS → cached: false | Flujo normal |
| HIT → cached: true, sin llamada Gemini | Cache funciona |
| HIT y MISS tienen conversationId distintos | Audit trail por petición |

### aiPlateAnalysis.service.test.ts (6 tests)

| Test | Verifica |
|------|---------|
| validation_error cuando userId está vacío | Zod validation |
| MISS → cached: false, analysisId con prefijo correcto | Flujo normal |
| HIT con mismo imageBuffer → cached: true | SHA-256 imagen en cache key |
| HIT genera nuevo analysisId | Audit trail siempre activo |
| MISS con imageBuffer diferente | SHA-256 distingue imágenes distintas |
| MISS con mismo imageBuffer pero diferente objective | Prompt renderizado cambia → cache key cambia |

**Total: 28 tests, 5 archivos.**

---

## Configuración de ficheros

### Nuevos archivos

| Archivo | Función |
|---------|---------|
| `backend/vitest.config.ts` | Configuración Vitest: node env, include, setupFiles, timeouts |
| `backend/src/__tests__/ai/setup.ts` | MongoDB memory server + Mongoose lifecycle |
| `backend/src/__tests__/ai/errorHandler.test.ts` | Tests del middleware global de errores |
| `backend/src/__tests__/ai/aiConversations.service.test.ts` | Tests del servicio de lectura de conversaciones |
| `backend/src/__tests__/ai/aiMenu.service.test.ts` | Tests de cache HIT/MISS en runAiMenu |
| `backend/src/__tests__/ai/aiProfileExplanation.service.test.ts` | Tests de cache en runAiProfileExplanation |
| `backend/src/__tests__/ai/aiPlateAnalysis.service.test.ts` | Tests de cache con imageHash en runAiPlateAnalysis |
| `docs/feat_ai-tests-mvp_resumen.md` | Este documento |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/package.json` | `"test": "vitest run"`, devDeps añadidas |
| `backend/tsconfig.json` | `"src/__tests__"` añadido a `exclude` (tsc no compila tests; `dist/` limpio) |

---

## Resultado de verificaciones

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓   (dist/ sin archivos de test)
npm test       →  5 passed (5 test files), 28 passed (28 tests) ✓
```

Tiempo total de ejecución: ~21 s (incluye arranque de mongodb-memory-server × 5 workers).

### Warning de Mongoose

```
[MONGOOSE] Warning: mongoose: the `new` option for `findOneAndUpdate()` is deprecated.
Use `returnDocument: 'after'` instead.
```

Emitido por `aiCache.repository.ts` → `upsertCacheEntry()`. Es una deprecación de Mongoose 9 hacia 10, no un fallo de test. Pendiente de corregir en `feat/ai-cache-cleanup` o similar.

---

## Tests que NO se implementaron (fuera de scope MVP)

| Feature | Motivo |
|---------|--------|
| `runAiChat` | Complejidad del flujo multi-turno requiere scaffolding de conversación previo; no tiene cache que proteger |
| HTTP integration (supertest) | Los tests de servicio ya validan la lógica; la capa HTTP es thin wrapper |
| `AiProviderError` propagación a HTTP 502 | Cubierto indirectamente en errorHandler test |
| Tests de concurrencia en cache | Fuera de scope MVP |
| Validación Zod de respuesta AI corrupta | Requiere que `validateAiResponse` lance con schema inválido; deja para siguiente iteración |
| Seed de prompts desde Mongo en runtime | `getDefaultPromptTemplate` usa defaults en memoria; cuando se implemente la lectura desde Mongo habrá que añadir tests |
| CI pipeline (GitHub Actions) | Pendiente de configurar en `feat/ai-ci` |

---

## Comandos de verificación

```bash
cd backend
npm run check   # TypeScript type check (excluye __tests__)
npm run build   # Compila solo src/ (excluye __tests__)
npm test        # Ejecuta todos los tests en src/__tests__/**/*.test.ts
```

---

## Limitaciones

| Área | Limitación |
|------|-----------|
| Cobertura | No hay reporte de cobertura (no se añadió `@vitest/coverage-v8`); pendiente |
| Tipo en mocks | Test files excluidos de tsconfig → errores de tipo en tests no detectados por `tsc --noEmit` |
| Worker pool | Cada test file arranque su propio MongoMemoryServer → lento en CI con muchos archivos; solución futura: `globalSetup` |
| Warning findOneAndUpdate | Deprecación Mongoose 9 pendiente de corregir en `aiCache.repository.ts` |
