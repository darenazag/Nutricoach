# Arquitectura del módulo IA de NutriCoach AI

## 1. Objetivo del documento

Este documento define la estrategia técnica del módulo de inteligencia artificial de **NutriCoach AI**.

La idea principal es desarrollar el módulo IA de forma aislada, controlada y reutilizable, dentro de una rama de integración propia:

```txt
integration/david-ai-stack
```

Esta rama actúa como una rama de integración específica del módulo IA. No se integra en la rama común del equipo hasta que el módulo sea funcional, esté documentado y pueda conectarse al backend principal de NutriCoach sin romper la funcionalidad existente.

---

## 2. Decisión arquitectónica

El módulo IA se desarrolla como un **módulo backend desacoplado**, diseñado como si fuera una API consumible por NutriCoach.

En el MVP, el módulo vive dentro del mismo backend Express para reducir complejidad DevOps:

```txt
backend/
└── src/
    └── modules/
        └── ai/
```

Pero se diseña con capas separadas para que, si el proyecto crece, pueda extraerse más adelante como un microservicio independiente:

```txt
Fase actual:
NutriCoach backend
└── modules/ai/

Fase futura:
nutricoach-api
ai-service-api
```

La prioridad actual no es crear un microservicio separado, sino construir un módulo interno limpio, escalable y fácil de integrar.

---

## 3. Principio de aislamiento

El módulo IA no debe depender directamente de la estructura interna definitiva del resto del backend mientras esta todavía esté evolucionando.

En vez de acoplarse directamente a tablas como `User`, `Profile`, `Meal` o `FoodItem`, el módulo debe recibir un contexto normalizado:

```ts
interface AiUserContext {
  userId: string;
  objective?: 'lose_weight' | 'maintain' | 'gain_muscle';
  caloriesTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  plan?: 'free' | 'pro';
}
```

De esta forma, cuando el backend principal de NutriCoach esté más avanzado, solo habrá que crear una capa adaptadora que transforme los datos reales del usuario en el formato esperado por el módulo IA.

---

## 4. Capa adaptadora futura

Cuando el core de NutriCoach tenga modelos estables de usuarios, perfiles, comidas y objetivos, se creará una capa adaptadora:

```txt
backend/src/modules/ai/adapters/nutricoachContext.adapter.ts
```

Responsabilidad de esta capa:

```txt
User/Profile/Meal en PostgreSQL
        ↓
nutricoachContext.adapter.ts
        ↓
AiUserContext normalizado
        ↓
AI Module
```

Esto permite que el módulo IA siga siendo independiente del diseño interno del resto de la aplicación.

---

## 5. Responsabilidades del módulo IA

El módulo IA se encargará de:

- Gestionar conversaciones IA.
- Guardar mensajes y respuestas generadas.
- Versionar prompts.
- Renderizar plantillas de prompts.
- Validar entradas y salidas con Zod.
- Encapsular llamadas a Gemini.
- Aplicar reglas de seguridad.
- Generar respuestas orientativas para chat nutricional.
- Generar menús educativos y aproximados.
- Analizar imágenes de platos de forma aproximada.
- Guardar resultados IA en MongoDB.
- Cachear respuestas reutilizables para reducir coste.

El módulo IA no será responsable de:

- Gestionar usuarios.
- Gestionar autenticación global.
- Persistir perfiles nutricionales principales.
- Sustituir la lógica de negocio principal de NutriCoach.
- Diagnosticar enfermedades.
- Generar dietas clínicas.
- Gestionar pagos o planes comerciales reales.

---

## 6. Estructura propuesta del módulo

La estructura esperada del módulo es:

```txt
backend/src/modules/ai/
├── adapters/
│   └── nutricoachContext.adapter.ts          # Futuro: adaptar datos del core a contexto IA
├── clients/
│   └── gemini.client.ts                      # Futuro: wrapper de Gemini
├── models/
│   ├── AiConversation.model.ts
│   ├── AiMessage.model.ts
│   ├── AiPromptTemplate.model.ts
│   ├── AiCacheEntry.model.ts
│   └── AiPlateAnalysis.model.ts
├── prompts/
│   ├── aiChat.prompt.ts
│   ├── aiMenu.prompt.ts
│   ├── aiPlateAnalysis.prompt.ts
│   ├── defaultPromptTemplates.ts
│   ├── promptVersions.ts
│   └── renderPromptTemplate.ts
├── repositories/
│   ├── aiConversation.repository.ts
│   └── aiCache.repository.ts
├── routes/
│   └── ai.routes.ts                         # Futuro: endpoints /api/ai
├── schemas/
│   ├── aiChat.schema.ts
│   ├── aiMenu.schema.ts
│   └── aiPlateAnalysis.schema.ts
├── seeders/
│   └── seedAiPromptTemplates.ts
├── services/
│   ├── aiChat.service.ts                    # Futuro
│   ├── aiMenu.service.ts                    # Futuro
│   ├── aiPlateAnalysis.service.ts           # Futuro
│   └── aiResponse.types.ts
├── safety/
│   └── aiSafetyRules.ts                     # Futuro
├── types/
│   └── ai.types.ts
└── index.ts
```

No todos los archivos existen desde el inicio. La estructura se irá completando por features pequeñas.

---

## 7. Flujo interno del módulo IA

El flujo ideal del módulo será:

```txt
Request validada con Zod
        ↓
Contexto normalizado
        ↓
Reglas de seguridad
        ↓
Prompt template versionado
        ↓
Prompt renderizado
        ↓
Gemini client
        ↓
Respuesta JSON estructurada
        ↓
Validación de salida
        ↓
Persistencia en MongoDB
        ↓
Respuesta al frontend
```

Este flujo evita que Gemini actúe como una caja negra sin control.

---

## 8. Bases de datos

### PostgreSQL

PostgreSQL será la fuente principal de verdad de la aplicación.

Debe guardar:

- Usuarios.
- Perfil nutricional.
- Objetivos.
- Comidas.
- Alimentos.
- Menús aceptados o guardados.
- Datos principales de negocio.

### MongoDB

MongoDB se usará solo para el módulo IA.

Debe guardar:

- Conversaciones IA.
- Mensajes IA.
- Prompts versionados.
- Caché de resultados IA.
- Análisis de platos.
- Respuestas crudas de Gemini.
- Metadatos de coste, tokens, confianza y seguridad.

MongoDB no sustituye a PostgreSQL. Su uso está limitado a datos semiestructurados generados por IA.

---

## 9. API interna esperada

Cuando el módulo esté listo, NutriCoach podrá consumirlo mediante endpoints como:

```txt
POST /api/ai/chat
POST /api/ai/menu
POST /api/ai/plate-analysis
GET  /api/ai/conversations
GET  /api/ai/conversations/:conversationId/messages
```

Estos endpoints se integrarán más adelante con:

- Autenticación real.
- Usuario real.
- Perfil nutricional real.
- Comidas reales.
- Frontend real.

Hasta entonces, el módulo debe mantenerse desacoplado y probado con contexto normalizado.

---

## 10. Integración futura con NutriCoach

Cuando el backend común esté más avanzado, antes de abrir PR hacia `core/project` se hará una revisión completa del estado real del repo.

La integración seguirá estos pasos:

1. Actualizar `integration/david-ai-stack` con los últimos cambios de `core/project`.
2. Revisar modelos reales de usuario, perfil y comidas.
3. Crear/adaptar `nutricoachContext.adapter.ts`.
4. Conectar rutas IA con autenticación real.
5. Conectar servicios IA con datos reales del usuario.
6. Validar que no se rompe ningún endpoint existente.
7. Ejecutar `npm run check` y `npm run build`.
8. Probar Docker local.
9. Crear PR final hacia `core/project`.

---

## 11. Estrategia Git

La rama estable del módulo será:

```txt
integration/david-ai-stack
```

Cada feature se desarrolla en ramas pequeñas:

```txt
feat/ai-prompt-renderer
feat/ai-gemini-client
feat/ai-service-layer
feat/ai-safety-rules
feat/ai-chat-service
feat/ai-menu-service
feat/ai-plate-analysis-service
feat/ai-routes
```

Flujo:

```bash
git switch integration/david-ai-stack
git pull --ff-only origin integration/david-ai-stack
git switch -c feat/nombre-feature
```

Al terminar:

```bash
git add .
git commit -m "feat(ai): describe feature"
git push -u origin feat/nombre-feature
```

Después se integra en la rama del módulo:

```bash
git switch integration/david-ai-stack
git pull --ff-only origin integration/david-ai-stack
git merge --no-ff feat/nombre-feature -m "merge: add nombre feature"
git push
```

Cuando la feature ya esté mergeada, se puede borrar su rama para mantener limpio el repo.

---

## 12. Criterios para considerar el módulo listo para PR

El módulo IA no se integrará en `core/project` hasta que cumpla estos criterios:

- [ ] Backend compila sin errores.
- [ ] `npm run check` pasa.
- [ ] `npm run build` pasa.
- [ ] Docker local está validado.
- [ ] MongoDB IA funciona.
- [ ] Prompts están versionados.
- [ ] Seeder de prompts funciona.
- [ ] Gemini está encapsulado en un cliente interno.
- [ ] Entradas y salidas están validadas con Zod.
- [ ] Existen reglas de seguridad.
- [ ] Existen endpoints `/api/ai`.
- [ ] No se rompe ninguna funcionalidad existente.
- [ ] Existe documentación técnica del módulo.
- [ ] Existe documentación de límites nutricionales y seguridad.
- [ ] El módulo puede adaptarse al core real mediante una capa adaptadora.

---

## 13. Ventajas de esta estrategia

Esta estrategia permite:

- Trabajar el módulo IA sin bloquear al resto del equipo.
- Evitar cambios parciales en la rama común.
- Mantener trazabilidad por features.
- Proteger la rama `core/project` de código incompleto.
- Diseñar el módulo como una API reutilizable.
- Facilitar una futura extracción a microservicio.
- Mantener el MVP simple, pero preparado para crecer.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Que el módulo IA se aleje del backend real | Revisar periódicamente `core/project` y adaptar mediante capa `adapters/` |
| Duplicar lógica de usuarios o perfiles | El módulo IA solo recibe contexto normalizado; PostgreSQL sigue siendo fuente principal |
| Sobrediseñar como microservicio prematuramente | Mantenerlo dentro del backend Express durante el MVP |
| Acoplar Gemini directamente a controllers | Encapsular Gemini en `clients/gemini.client.ts` y servicios internos |
| Generar consejos nutricionales inseguros | Aplicar reglas de seguridad y validaciones antes/después del LLM |
| Dificultar el PR final | Mantener documentación, commits pequeños y builds verdes |

---

## 15. Decisión final

El módulo IA de NutriCoach se desarrollará como un módulo backend desacoplado y consumible, integrado temporalmente dentro del backend principal para simplificar el MVP.

La rama `integration/david-ai-stack` será tratada como rama de integración del módulo IA.

El módulo se integrará en `core/project` solo cuando sea funcional, esté probado y pueda adaptarse al estado real de NutriCoach sin romper el backend ni el frontend.

Esta decisión permite construir un sistema IA escalable, reutilizable y defendible técnicamente, manteniendo al mismo tiempo un alcance realista para un proyecto de bootcamp.
