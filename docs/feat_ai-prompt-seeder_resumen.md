# Feature: `feat/ai-prompt-seeder` — Seeder idempotente de plantillas de prompts IA en MongoDB

> Rama: `feat/ai-prompt-seeder`
> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + TypeScript + Mongoose 9 + `tsx`
> Estado: implementado, type-check y build OK, seeder **no ejecutado** localmente (falta `.env`/Mongo).

---

## 1. Objetivo

Crear un seeder **idempotente** que inserte o actualice en MongoDB las plantillas de prompts IA versionadas (`ai_chat_coach`, `ai_menu_generator`, `ai_plate_analysis`), ejecutable desde CLI con `npm run seed:ai-prompts`.

No se conecta con Gemini, no se crean endpoints, no se modifica el modelo Mongoose.

---

## 2. Reglas respetadas

- No se cambió de rama (`feat/ai-prompt-seeder`).
- No se hizo commit ni push.
- No se tocó frontend, Docker, PostgreSQL ni Sequelize.
- No se modificaron modelos Mongoose, schemas Zod, repositorios ni prompts.
- No se crearon routes ni controllers.
- No se llamó a Gemini.
- No se añadieron dependencias (Mongoose y `tsx` ya estaban).
- No se subió `.env`.

---

## 3. Archivos creados / modificados

**Creados (2):**

```
backend/src/modules/ai/seeders/
├── seedAiPromptTemplates.ts
└── index.ts
```

- [seedAiPromptTemplates.ts](../backend/src/modules/ai/seeders/seedAiPromptTemplates.ts) — función `seedAiPromptTemplates()` + runner CLI.
- [seeders/index.ts](../backend/src/modules/ai/seeders/index.ts) — re-exporta `seedAiPromptTemplates`.

**Modificados (2):**

- [backend/src/modules/ai/index.ts](../backend/src/modules/ai/index.ts) — añade `export * from './seeders/index.js'`.
- [backend/package.json](../backend/package.json) — añade el script:

  ```json
  "seed:ai-prompts": "tsx src/modules/ai/seeders/seedAiPromptTemplates.ts"
  ```

  Ningún otro script tocado.

---

## 4. Cómo funciona el upsert idempotente

El seeder recorre `defaultAiPromptTemplates` y para cada entrada ejecuta:

```ts
await AiPromptTemplate.updateOne(
  { promptKey: tpl.promptKey, version: tpl.version },   // filtro único
  {
    $set: {
      type:               tpl.type,
      systemPrompt:       tpl.systemPrompt,
      userPromptTemplate: tpl.userPromptTemplate,
      outputSchema:       tpl.outputSchema,
      isActive:           tpl.isActive,
      notes:              tpl.notes,
    },
  },
  { upsert: true },
);
```

Garantías:

- **Idempotencia por par `{promptKey, version}`**, que es índice único en `AiPromptTemplate` (ya existente). Ejecutarlo N veces deja la misma cantidad de documentos.
- **`$set` parcial**: solo actualiza los 6 campos de contenido. `createdAt` y `updatedAt` los gestiona Mongoose por `timestamps: true`.
- **Sin borrados**: el seeder no elimina templates antiguas. Versiones `v2`, `v3`… coexistirán cuando se introduzcan.
- **Logs por entrada** con la acción real:
  - `CREATED` → `result.upsertedCount > 0`
  - `UPDATED` → `result.modifiedCount > 0`
  - `UNCHANGED` → ni una cosa ni la otra (segundas ejecuciones consecutivas).
- **Resumen final** con `created`, `updated`, `unchanged`, `total`.
- **`mongoose.disconnect()` en `finally`**, solo si la conexión llegó a abrirse, para que el proceso termine limpiamente.
- **`process.exitCode = 1`** en caso de error, sin matar el proceso a la fuerza para permitir el disconnect.

### Detección de ejecución directa

El script usa `require.main === module` (CJS-compatible — el proyecto compila a CJS porque `package.json` no declara `"type": "module"`). Así:

- `npm run seed:ai-prompts` → `tsx` lo invoca como entry-point → ejecuta `main()`.
- Importar `seedAiPromptTemplates` desde `seeders/index.ts` o desde el barrel del módulo IA → **no** dispara `main()`, solo expone la función.

---

## 5. Comando de ejecución

```bash
cd backend
npm run seed:ai-prompts
```

Salida esperada (primera ejecución contra Mongo vacío):

```
[mongo] Connected
[seed:ai-prompts] Processing 3 prompt template(s)...
[seed:ai-prompts] CREATED   ai_chat_coach@v1 (chat)
[seed:ai-prompts] CREATED   ai_menu_generator@v1 (menu_generation)
[seed:ai-prompts] CREATED   ai_plate_analysis@v1 (plate_analysis)
[seed:ai-prompts] Done. created=3, updated=0, unchanged=0, total=3
[seed:ai-prompts] OK
[seed:ai-prompts] Mongo disconnected.
```

Segunda ejecución consecutiva sin cambios en el código:

```
[seed:ai-prompts] UNCHANGED ai_chat_coach@v1 (chat)
[seed:ai-prompts] UNCHANGED ai_menu_generator@v1 (menu_generation)
[seed:ai-prompts] UNCHANGED ai_plate_analysis@v1 (plate_analysis)
[seed:ai-prompts] Done. created=0, updated=0, unchanged=3, total=3
```

Tras tocar un `systemPrompt` o `userPromptTemplate`:

```
[seed:ai-prompts] UPDATED   ai_chat_coach@v1 (chat)
[seed:ai-prompts] UNCHANGED ai_menu_generator@v1 (menu_generation)
[seed:ai-prompts] UNCHANGED ai_plate_analysis@v1 (plate_analysis)
```

---

## 6. Variables necesarias

| Variable | Origen | Notas |
|---|---|---|
| `MONGO_URI` | `.env` (raíz de `backend/`) | Cadena de conexión a la BBDD del módulo IA. Usada por `connectMongo()`. |

Cómo preparar el entorno desde cero:

```bash
docker compose up -d mongo
cd backend
cp .env.example .env
# editar MONGO_URI si fuese distinta de la del .env.example
npm run seed:ai-prompts
```

`.env.example` ya trae un valor por defecto compatible con el `docker-compose` del repo:

```
MONGO_URI=mongodb://nutricoach_ai:change_me@localhost:27017/nutricoach_ai?authSource=admin
```

---

## 7. Verificación check / build

```bash
tsc --noEmit  → CHECK OK   (0 errores)
tsc           → BUILD OK   (0 errores, dist/ generado)

git status:
  modified:   backend/package.json
  modified:   backend/src/modules/ai/index.ts
  Untracked:  backend/src/modules/ai/seeders/

git diff --stat:
  backend/package.json            | 1 +
  backend/src/modules/ai/index.ts | 1 +
  2 files changed, 2 insertions(+)
```

> Nota técnica: el proyecto compila a CJS (no hay `"type": "module"` en `package.json`), por eso el seeder usa `require.main === module` en vez de `import.meta.url`/top-level `await`, que `tsc` rechaza bajo `module: Node16` + paquete CJS.

---

## 8. ¿Se pudo ejecutar el seeder?

**No, intencionalmente.** En esta máquina:

- No existe `backend/.env` (la regla "No subir .env" impide crearlo).
- No se levantó el contenedor Mongo (la regla "No tocar Docker" lo impide).

Por tanto el seeder no se ejecutó. Esto **no es un error de build**: la verificación obligatoria (`tsc --noEmit`, `tsc`) pasa sin errores.

Para probarlo localmente:

```bash
docker compose up -d mongo
cd backend
cp .env.example .env       # editar MONGO_URI si procede
npm run seed:ai-prompts
```

---

## 9. Qué NO se ha implementado (intencional)

- ❌ Borrado o desactivación de templates obsoletas (el seeder solo upsertea).
- ❌ Validación previa de los `outputSchema` contra los schemas Zod (queda para tests).
- ❌ Activación A/B de versiones (`isActive: false` para forzar otra versión).
- ❌ CLI con flags (`--dry-run`, `--only=chat`, etc.).
- ❌ Otros seeders (usuarios demo, recetas, etc.).
- ❌ Integración con Gemini.
- ❌ Endpoints públicos.
- ❌ Cambios en modelos Mongoose, schemas Zod, repositorios, Postgres, Docker, frontend.
- ❌ Dependencias nuevas.

---

## 10. Siguiente paso recomendado

1. **Tests** unitarios del seeder con `mongodb-memory-server` (verificar: idempotencia tras 2 runs, `UPDATED` cuando cambia un `systemPrompt`, no inserta duplicados).
2. **Render utility** para sustituir `{{placeholders}}` por valores reales antes de enviar el prompt a Gemini.
3. **Service de Gemini** que cargue el template activo por `promptKey`, lo renderice, llame a `@google/genai`, valide la salida JSON con los `*ResponseSchema` y persista en `AiMessage` + `AiCacheEntry`.
4. **Health check** en `/api/health` que reporte si los templates esperados están seedados.

---

## 11. Comando recomendado para commit (NO ejecutado)

```bash
git add backend/src/modules/ai/seeders \
        backend/src/modules/ai/index.ts \
        backend/package.json \
        docs/feat_ai-prompt-seeder_resumen.md

git commit -m "feat(ai): add idempotent Mongo seeder for AI prompt templates

- Add seedAiPromptTemplates() with upsert by {promptKey, version}
- Log per-entry action (CREATED/UPDATED/UNCHANGED) and final summary
- CJS-compatible entry-point detection (require.main === module)
- Disconnect Mongoose in finally block; exitCode 1 on failure
- Add npm script seed:ai-prompts using tsx
- Re-export seeder from the ai module barrel
- Add docs/feat_ai-prompt-seeder_resumen.md
- No Gemini calls, no routes, no embeddings yet"
```
