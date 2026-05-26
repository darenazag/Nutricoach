# fix/ai-cache-mongoose-return-document — Resumen

## Objetivo

Eliminar el warning de deprecación de Mongoose 9 que aparecía en cada ejecución de `npm test` y en runtime cuando el cache realizaba un upsert o un incremento de hit:

```
[MONGOOSE] Warning: mongoose: the `new` option for `findOneAndUpdate()` is deprecated.
Use `returnDocument: 'after'` instead.
```

---

## Warning corregido

| Campo deprecado | Sustituto correcto |
|-----------------|--------------------|
| `{ new: true }` | `{ returnDocument: 'after' }` |

Mongoose 9 mantiene retrocompatibilidad con `new: true` pero emite el warning. Mongoose 10 eliminará la opción. `returnDocument: 'after'` es la forma canónica desde Mongoose 8+.

---

## Archivo modificado

`backend/src/modules/ai/repositories/aiCache.repository.ts`

### Cambios aplicados

**`upsertCacheEntry` (línea 15):**
```diff
-    { new: true, upsert: true, setDefaultsOnInsert: true },
+    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
```

**`incrementCacheHit` (línea 27):**
```diff
-    { new: true },
+    { returnDocument: 'after' },
```

Ambas funciones llaman a `findOneAndUpdate()` y necesitan recibir el documento actualizado tras la operación. `returnDocument: 'after'` es semánticamente equivalente a `new: true`: devuelve el documento en su estado posterior a la escritura, no el previo.

---

## Por qué `returnDocument: 'after'` es equivalente a `new: true`

MongoDB admite dos valores para este flag: `'before'` (el documento tal como estaba antes de la operación, equivalente al comportamiento por defecto) y `'after'` (el documento tal como queda tras aplicar el update). El alias `new: true` era la API original del driver de Mongoose; Mongoose 9 lo renombró para alinearse con el nombre que usa el driver oficial de MongoDB Node.js y la documentación del servidor. El comportamiento en runtime es idéntico.

---

## Búsqueda de usos adicionales

```bash
grep -rn "findOneAndUpdate" backend/src/modules/ai/
```

Resultado: únicamente los dos casos en `aiCache.repository.ts`. No hay otros usos de `findOneAndUpdate` con `new: true` en el módulo IA.

---

## Resultado de verificaciones

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓   (dist/ sin archivos de test)
npm test       →  5 passed (5 test files), 28 passed (28 tests) ✓
               →  Sin warning de findOneAndUpdate en la salida
```

Tiempo de test: ~2.5 s (sin arranque de MongoMemoryServer gracias a binario ya descargado).

---

## Qué NO se tocó

| Área | Motivo |
|------|--------|
| `main`, `dev`, ramas de compañeros | Regla de aislamiento |
| Frontend | Cambio exclusivamente backend |
| `.env` / secretos | No aplica |
| Dependencias (`package.json`) | No es necesario añadir nada |
| Resto del módulo IA | Sin otros `findOneAndUpdate` afectados |
| Fuera del módulo IA | No se buscó ni modificó código ajeno al scope |
| Tests | No requieren cambio; el mock de repositorio en tests no usa la opción deprecada |

---

## Comandos para commit (NO ejecutar hasta autorización)

```bash
git add backend/src/modules/ai/repositories/aiCache.repository.ts
git add docs/fix_ai-cache-mongoose-return-document_resumen.md
git commit -m "$(cat <<'EOF'
fix(ai): replace deprecated findOneAndUpdate new:true with returnDocument:'after'

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
