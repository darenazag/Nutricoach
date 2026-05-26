> **Documento histórico.** Describe el estado del módulo IA al final del primer sprint de infraestructura (antes de implementar endpoints, servicios ni integración con Gemini). Para el estado actual ver [docs/ai-module-current-status.md](ai-module-current-status.md).

---

# Sprint `integration/david-ai-stack` — Módulo IA backend de NutriCoach

> Rama base personal: `integration/david-ai-stack`
> Stack: Node.js + Express + TypeScript + Mongoose 9 (Mongo) + Zod 4
> Estado: 4 features mergeadas en la rama base personal, 1 feature pendiente de merge.

---

## 1. Objetivo del sprint

Dejar el **backend del módulo IA listo para integrar Gemini** en un sprint posterior, sin tocar todavía:

- Gemini real (`@google/genai`),
- RAG, embeddings, vector search,
- routes/controllers públicos,
- frontend, Docker, PostgreSQL/Sequelize.

El sprint construye el stack en 5 capas independientes y verificables: **infra → persistencia → contratos → prompts → seed**. Cada capa se entregó en su propia rama con doc dedicada en `docs/`.

---

## 2. Features que componen el sprint

| Orden | Rama | Estado | Doc detallada |
|---|---|---|---|
| 1 | `feat/ai-infra-setup` | mergeada | [feat_ai-infra-setup_resumen.md](feat_ai-infra-setup_resumen.md) |
| 2 | `feat/ai-models-base` | mergeada | [feat_ai-models-base_resumen.md](feat_ai-models-base_resumen.md) |
| 3 | `feat/ai-service-contracts` | mergeada | [feat_ai-service-contracts_resumen.md](feat_ai-service-contracts_resumen.md) |
| 4 | `feat/ai-prompt-templates` | mergeada | [feat_ai-prompt-templates_resumen.md](feat_ai-prompt-templates_resumen.md) |
| 5 | `feat/ai-prompt-seeder` | **pendiente de merge** | [feat_ai-prompt-seeder_resumen.md](feat_ai-prompt-seeder_resumen.md) |

Las 4 primeras ya están en `integration/david-ai-stack`. La 5 (seeder) sigue en su rama propia, con check/build OK, lista para PR.

---

## 3. Vista de árbol entregada

Al terminar el sprint, el módulo IA queda con esta forma:

```
backend/src/modules/ai/
├── index.ts                            ← barrel del módulo
├── types/
│   ├── ai.types.ts                     ← enums y interfaces compartidas
│   └── index.ts
├── models/                             ← Mongoose 9
│   ├── AiConversation.model.ts
│   ├── AiMessage.model.ts
│   ├── AiPromptTemplate.model.ts
│   ├── AiCacheEntry.model.ts
│   ├── AiPlateAnalysis.model.ts
│   └── index.ts
├── repositories/                       ← funciones async exportadas
│   ├── aiConversation.repository.ts
│   ├── aiCache.repository.ts
│   └── index.ts
├── schemas/                            ← Zod 4 (strict)
│   ├── aiChat.schema.ts
│   ├── aiMenu.schema.ts
│   ├── aiPlateAnalysis.schema.ts
│   └── index.ts
├── services/                           ← solo tipos por ahora
│   ├── aiResponse.types.ts             ← AiServiceResult<T>, *Request/Response
│   └── index.ts
├── prompts/                            ← plantillas versionadas en español
│   ├── promptVersions.ts               ← AI_*_PROMPT_KEY, AI_PROMPT_VERSION = 'v1'
│   ├── aiChat.prompt.ts
│   ├── aiMenu.prompt.ts
│   ├── aiPlateAnalysis.prompt.ts
│   ├── defaultPromptTemplates.ts       ← seed listo para Mongo
│   └── index.ts
└── seeders/                            ← (feature 5, pendiente de merge)
    ├── seedAiPromptTemplates.ts        ← idempotente, ejecutable por tsx
    └── index.ts
```

---

## 4. Resumen por feature

### 4.1. `feat/ai-infra-setup` — Infraestructura base

Setup inicial del backend para soportar el módulo IA: conexión a Mongo en `backend/src/config/mongo.ts` (`connectMongo()`), variables de entorno en `.env.example`, base de Express en `app.ts` / `server.ts`. Sin lógica de IA aún.

→ Detalle: [feat_ai-infra-setup_resumen.md](feat_ai-infra-setup_resumen.md)

### 4.2. `feat/ai-models-base` — Persistencia Mongoose

5 modelos en colecciones independientes para todo el ciclo IA: conversaciones, mensajes, plantillas de prompt, caché de resultados y análisis de plato. Índices únicos y compuestos para los accesos previstos. **TTL** en `AiCacheEntry.expiresAt`. Repositorios mínimos para conversaciones/mensajes y caché. Sin services, sin endpoints.

→ Detalle: [feat_ai-models-base_resumen.md](feat_ai-models-base_resumen.md)

### 4.3. `feat/ai-service-contracts` — DTOs y validaciones Zod

3 pares `request/response` Zod (`aiChat`, `aiMenu`, `aiPlateAnalysis`) con `.strict()`, mensajes de error claros y tipos inferidos vía `z.infer`. Contenedor genérico `AiServiceResult<TStructuredData>` con `metadata` (`provider`, `model`, `promptVersion`, `cached`). Sin services reales, sin Gemini.

→ Detalle: [feat_ai-service-contracts_resumen.md](feat_ai-service-contracts_resumen.md)

### 4.4. `feat/ai-prompt-templates` — Prompts versionados

`systemPrompt` + `userPromptTemplate` para los 3 casos de uso, redactados en español, alineados 1:1 con los `*ResponseSchema` (la IA debe devolver JSON exacto). Incluyen **límites de seguridad obligatorios** (no diagnóstico, no patologías, no medicación, no TCA; derivar a profesional sanitario; estimaciones aproximadas). Versión común `v1`. Se exporta también un array `defaultAiPromptTemplates` listo para seed.

→ Detalle: [feat_ai-prompt-templates_resumen.md](feat_ai-prompt-templates_resumen.md)

### 4.5. `feat/ai-prompt-seeder` — Seeder idempotente *(pendiente de merge)*

Seeder CLI ejecutable con `npm run seed:ai-prompts` (`tsx`). Hace `updateOne` con `$set` y `upsert: true` por `{promptKey, version}`, índice único ya existente en el modelo. Logs por entrada con acción real (`CREATED` / `UPDATED` / `UNCHANGED`), resumen final, `mongoose.disconnect()` en `finally`, exitCode 1 en error. Detección de entry-point CJS-compatible (`require.main === module`).

→ Detalle: [feat_ai-prompt-seeder_resumen.md](feat_ai-prompt-seeder_resumen.md)

---

## 5. Reglas que rigieron todo el sprint

Idénticas en todas las features:

- No cambiar de rama, no commit, no push (se entrega para revisión manual).
- No tocar frontend, Docker, PostgreSQL/Sequelize.
- No crear routes/controllers todavía.
- No llamar a Gemini.
- No implementar RAG ni embeddings reales.
- No añadir dependencias nuevas (todo se hizo con lo que ya estaba: `mongoose`, `zod`, `dotenv`, `tsx`, `typescript`).
- No subir `.env`.
- Cambios pequeños y verificables por capa.

---

## 6. Decisiones técnicas relevantes

- **TypeScript Node16 + CJS de salida.** El proyecto no declara `"type": "module"` en `package.json`, por lo que la salida es CommonJS. Esto afectó al seeder: hubo que sustituir `import.meta.url` / top-level `await` por `require.main === module` + `main().catch(...)`. Para el resto de archivos no cambia nada porque solo definen tipos/funciones puras.
- **Imports con extensión `.js` en source `.ts`** (requisito de `module: Node16`).
- **`z.infer` como única fuente de tipos** para los request/response: si cambia el schema, cambia el tipo, sin duplicación.
- **Índice único `{promptKey, version}`** en `AiPromptTemplate` → el seeder no necesita lógica defensiva contra duplicados.
- **TTL en `AiCacheEntry.expiresAt`**: cuando el campo es `null/undefined`, el doc no se borra (comportamiento documentado del TTL en Mongo). Permite caché con y sin caducidad sobre el mismo modelo.
- **Tipos derivados con `InferSchemaType`** en los modelos Mongoose: la forma del documento se mantiene sincronizada con el schema.
- **Salida JSON estricta de los prompts** alineada con los `*ResponseSchema` Zod: el futuro service podrá hacer `safeParse(jsonResponse)` directamente.
- **Subdocumentos sin `_id`** en los modelos (`tokenUsage`, `costEstimate`, `safety`, `imageMetadata`, etc.): documentos más pequeños y sin IDs irrelevantes.

---

## 7. Estado de verificación

- **`tsc --noEmit`** y **`tsc`** verdes en las 5 ramas (4 mergeadas + la pendiente de merge).
- Seeder **no ejecutado** localmente en esta máquina: falta `backend/.env` y Mongo no está levantado. Probarlo localmente:

  ```bash
  docker compose up -d mongo
  cd backend
  cp .env.example .env       # editar MONGO_URI si procede
  npm run seed:ai-prompts
  ```

- Documentación: cada feature tiene su `feat_ai-*_resumen.md` con verificación, qué se hizo y qué no, y comando de commit sugerido. Este documento es el índice del sprint.

---

## 8. Qué NO se ha implementado (queda para el próximo sprint)

- ❌ Integración real con Gemini (`@google/genai`): cargar template activo, renderizar `{{placeholders}}`, llamar, validar la respuesta JSON contra los `*ResponseSchema`, persistir en `AiMessage` + `AiCacheEntry`.
- ❌ Render utility `renderPromptTemplate(template, vars)` con escape y defaults seguros.
- ❌ Services con lógica real (orquestación prompt + provider + cache + persistencia, devolviendo `AiServiceResult<T>`).
- ❌ Endpoints públicos (`POST /api/ai/chat`, `POST /api/ai/menu`, `POST /api/ai/plate-analysis`).
- ❌ Middleware Express `validateBody(schema)` para enchufar Zod a las rutas.
- ❌ Manejo real del binario de imagen (multer + sharp): el `aiPlateAnalysisRequestSchema` ya valida la metadata, pero la subida real va en su propia rama.
- ❌ Tests automatizados (Zod, repositorios contra Mongo en memoria, seeder, prompts).
- ❌ RAG, embeddings reales, vector search (Atlas Search). El subdocumento `futureEmbedding` en `AiPlateAnalysis` ya está reservado como hook.
- ❌ Activación de la conexión a Mongo desde `server.ts` al arrancar (`connectMongo()` existe pero no se invoca aún).

---

## 9. Siguientes pasos sugeridos

1. **Mergear `feat/ai-prompt-seeder`** en `integration/david-ai-stack` (vía PR).
2. **Render utility + tests** del renderer de plantillas.
3. **Service Gemini** detrás del cual queden los `AiServiceResult<T>` ya tipados.
4. **Middleware Zod** + primeras rutas `/api/ai/*`.
5. **Rama de imagen real** con `multer` + `sharp` integrada con el schema de análisis de plato.
6. **Tests** con `mongodb-memory-server` para repositorios y seeder.

---

## 10. Comandos de commit por feature (referencia)

Cada doc detallada incluye su comando exacto. Resumen rápido:

```bash
# 1. feat/ai-infra-setup       → ya mergeada
# 2. feat/ai-models-base       → ya mergeada
# 3. feat/ai-service-contracts → ya mergeada
# 4. feat/ai-prompt-templates  → ya mergeada
# 5. feat/ai-prompt-seeder     → pendiente, comando sugerido en su doc
```
