# AI Module — Resultados de Smoke Test Real

## Contexto

Prueba controlada ejecutada el **2026-05-25** contra entorno local:

| Componente | Detalle |
|------------|---------|
| Rama | `docs/ai-real-smoke-test-results` |
| Backend | `npm run dev` (Express + TypeScript, puerto 3000) |
| MongoDB | Docker Compose, puerto 27018 |
| Proveedor AI | Gemini real (`gemini-2.5-flash`) |
| Tests unitarios | Vitest (mock Gemini) — 28 tests, todos PASS |

Objetivo: verificar que los 5 endpoints responden correctamente con datos reales, y que el flujo cache HIT/MISS funciona de extremo a extremo.

---

## Resultados por endpoint

### 1. POST /api/ai/chat

**Payload:**
```json
{ "userId": "smoke-test-user", "message": "¿Qué desayuno recomiendas para ganar músculo?", "plan": "free" }
```

| Llamada | Resultado | cached | Observaciones |
|---------|-----------|--------|---------------|
| 1ª | PASS ✓ | `false` | Gemini respondió correctamente |

**Datos clave:**
- `conversationId`: `conv_8c2c4d5b-fd8c-4470-879a-21b2b4559ecd`
- Respuesta estructurada: texto con recomendación de desayuno para ganancia muscular
- HTTP 200

> Chat no implementa cache (multi-turno, fuera de scope de cache actual). Solo se verifica flujo MISS.

---

### 2. GET /api/ai/conversations/:conversationId

**Usando `conversationId` del test anterior:**
```
GET /api/ai/conversations/conv_8c2c4d5b-fd8c-4470-879a-21b2b4559ecd
```

| Resultado | Observaciones |
|-----------|---------------|
| PASS ✓ | 2 mensajes (user + assistant), sin `_id` ni `__v`, ordenados cronológicamente |

**Datos clave:**
- `conversation.type`: `chat`
- `messages[0].role`: `user`
- `messages[1].role`: `assistant`
- HTTP 200

**Verificación 404:**
```
GET /api/ai/conversations/conv-inexistente
→ HTTP 404 { success: false, error: { code: "not_found" } }
```

---

### 3. POST /api/ai/menu

**Payload:**
```json
{
  "userId": "smoke-test-user",
  "objective": "gain_muscle",
  "caloriesTarget": 2800,
  "proteinTarget": 180,
  "days": 1,
  "mealsPerDay": 4,
  "plan": "free"
}
```

| Llamada | Resultado | cached | Observaciones |
|---------|-----------|--------|---------------|
| 1ª (MISS) | PASS ✓ | `false` | Gemini generó menú de 4 comidas, ~2660 kcal |
| 2ª (HIT) | PASS ✓ | `true` | Sin llamada Gemini, respuesta idéntica |

**Datos clave (MISS):**
- `conversationId`: `conv_a898b938-ec28-4c8b-930d-6b2333d4faaa`
- 4 comidas: Desayuno, Almuerzo, Merienda, Cena
- `dailyCalories`: 2660, `estimatedProtein`: 186 g total

**Dato GET /conversations tras menu:**
```
GET /api/ai/conversations/conv_a898b938-ec28-4c8b-930d-6b2333d4faaa
→ PASS ✓ — 2 mensajes, structuredData con días y recomendaciones completas
```

---

### 4. POST /api/ai/profile-explanation

**Payload:**
```json
{
  "userId": "smoke-test-user",
  "objective": "lose_weight",
  "caloriesTarget": 1600,
  "proteinTarget": 120,
  "plan": "free"
}
```

| Llamada | Resultado | cached | Observaciones |
|---------|-----------|--------|---------------|
| 1ª (MISS) | PASS ✓ | `false` | Gemini generó explicación personalizada |
| 2ª (HIT) | PASS ✓ | `true` | Sin llamada Gemini |

**Datos clave (MISS):**
- `conversationId`: `conv_933a1e1e-5b94-4c67-ba8e-27aa1b1060d5`
- Explicación coherente con objetivo `lose_weight` y macros indicados

---

### 5. POST /api/ai/plate-analysis

**Imagen:** PNG local 2560×2782 px, 1.7 MB (captura del AI Dev Lab con plato de comida).

> La imagen **no se sube al repositorio**. Solo se usa localmente para la prueba.

**Payload (multipart/form-data):**
```
userId=smoke-test-user
objective=lose_weight
caloriesTarget=1800
plan=free
image=<binary PNG>
```

| Llamada | Resultado | cached | Observaciones |
|---------|-----------|--------|---------------|
| 1ª (MISS) | PASS ✓ | `false` | Gemini analizó imagen correctamente |
| 2ª (HIT) | PASS ✓ | `true` | Cache hit por SHA-256 de imagen + contexto |

**Datos clave (MISS):**
- `analysisId`: `analysis_a64d5d7f-b3c5-4c7f-8189-828fb3b6cfed`
- Alimentos detectados: Salmón a la plancha, Quinoa cocida, Aguacate en láminas, Ensalada de hojas verdes y tomates cherry
- `estimatedNutrition.caloriesRange`: 480–680 kcal
- `confidence`: medium

**Datos clave (HIT):**
- `analysisId`: `analysis_5549ccf8-3203-41f2-8db2-582375b7bc84` (nuevo — audit trail activo)
- Mismos `detectedFoods` que el MISS
- Sin llamada a Gemini

---

## Resumen de resultados

| # | Endpoint | Escenario | HTTP | cached | Resultado |
|---|----------|-----------|------|--------|-----------|
| 1 | POST /chat | MISS | 200 | false | PASS ✓ |
| 2 | GET /conversations/:id | Chat conv | 200 | — | PASS ✓ |
| 3 | POST /menu | MISS | 200 | false | PASS ✓ |
| 4 | POST /menu | HIT | 200 | true | PASS ✓ |
| 5 | GET /conversations/:id | Menu conv | 200 | — | PASS ✓ |
| 6 | POST /profile-explanation | MISS | 200 | false | PASS ✓ |
| 7 | POST /profile-explanation | HIT | 200 | true | PASS ✓ |
| 8 | POST /plate-analysis | MISS | 200 | false | PASS ✓ |
| 9 | POST /plate-analysis | HIT | 200 | true | PASS ✓ |

**9/9 escenarios PASS. 0 fallos.**

---

## Hallazgos durante el test

### Enum `objective` en plate-analysis

La primera llamada a `/plate-analysis` usó `objective=weight_loss`, que fue rechazada con HTTP 400:

```json
{ "code": "validation_error", "message": "Plate analysis request failed Zod validation.",
  "details": [{ "path": ["objective"], "message": "Invalid option: expected one of \"lose_weight\"|\"maintain\"|\"gain_muscle\"" }] }
```

**Comportamiento correcto:** Zod rechaza el enum inválido antes de llamar a Gemini. El valor correcto es `lose_weight`. No es un bug — es la validación funcionando como se espera. La documentación debe aclarar los valores aceptados.

### analysisId siempre nuevo en HIT

En el HIT de plate-analysis el `analysisId` es diferente al del MISS. Esto es intencional: `persistAnalysis` se ejecuta siempre para mantener el audit trail, independientemente de si el resultado viene de cache o de Gemini.

### Warning de Mongoose (no es fallo)

```
[MONGOOSE] Warning: mongoose: the `new` option for `findOneAndUpdate()` is deprecated.
Use `returnDocument: 'after'` instead.
```

Emitido por `aiCache.repository.ts` → `upsertCacheEntry()`. Deprecación de Mongoose 9 hacia 10. No afecta al comportamiento. Pendiente de corregir en tarea futura.

---

## Verificaciones técnicas previas

```
npm run check  →  0 errors ✓
npm run build  →  0 errors ✓   (dist/ sin archivos de test)
npm test       →  5 passed (5 test files), 28 passed (28 tests) ✓
```

---

## Conclusión

El módulo IA está **operativo en todos sus endpoints** contra Gemini real y MongoDB local. El sistema de cache (HIT/MISS) funciona de extremo a extremo para los tres endpoints cacheados (menu, profile-explanation, plate-analysis). La lectura de conversaciones devuelve datos limpios sin campos internos de Mongo. La validación Zod rechaza correctamente los inputs inválidos antes de llegar al proveedor.
