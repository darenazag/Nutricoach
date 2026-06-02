# NutriCoach AI — Investigación nutricional y decisiones de producto

**Rama:** `docs/ai-nutrition-research`
**Fecha:** 2026-05-21
**Uso:** Memoria del proyecto, contexto técnico para futuras features de IA.

---

## 1. Resumen ejecutivo

NutriCoach AI debe comportarse en el MVP como un **asistente educativo de hábitos saludables para población general adulta sana**, no como un sistema clínico ni de dietética profesional.

La base científica más sólida y aplicable no está en dietas concretas sino en un núcleo compartido por las principales guías internacionales (OMS, AESAN, EFSA, Harvard Healthy Eating Plate, NHS Eatwell Guide): más alimentos mínimamente procesados, prioridad a verduras, frutas, legumbres y cereales integrales, uso preferente de grasas insaturadas, moderación de sal, azúcares libres y grasas saturadas, y mensajes simples de equilibrio y variedad.

**La conclusión más importante para el módulo IA:**

> El LLM no debe ser la fuente de verdad nutricional. Debe conversar, reformular y explicar. Las restricciones de seguridad, la detección de casos fuera de alcance, la estructura de salida, los niveles de confianza y los cálculos nutricionales básicos deben residir en el backend mediante lógica determinista, no en el modelo generativo.

---

## 2. Alcance del MVP

### Incluido

- Chat educativo sobre hábitos saludables para adultos sin patologías declaradas.
- Menús orientativos basados en plantillas y reglas nutricionales sencillas.
- Análisis de plato por imagen como hipótesis editable, nunca como medición exacta.
- Cálculo determinista en backend de BMR, TDEE, calorías objetivo y macros estimados.
- Almacenamiento de conversaciones, análisis y caché en MongoDB.

### Excluido

- Diagnóstico, tratamiento o planes para enfermedades.
- Suplementación y medicación.
- Embarazo, lactancia, menores, trastornos de la conducta alimentaria.
- Diabetes, HTA, enfermedad renal, hepática o cardiovascular.
- Cirugía bariátrica.
- RAG, vector search o embeddings.
- APIs de nutrición de pago en MVP.
- Micronutrientes detallados desde imagen.

---

## 3. Principios nutricionales generales

Las siguientes reglas están alineadas entre OMS, AESAN, EFSA, Harvard Healthy Eating Plate y Eatwell Guide. Son la base editorial del producto.

### Modelo de plato

| Fracción | Contenido |
|---|---|
| 50% | Verduras y frutas |
| 25% | Cereales preferentemente integrales |
| 25% | Proteína saludable (legumbres, pescado, huevo, carne magra, tofu) |

Agua como bebida principal. Aceite de oliva como grasa culinaria preferente.

### Recomendaciones de frecuencia (referencia AESAN)

| Alimento | Frecuencia orientativa |
|---|---|
| Verduras/hortalizas | 2–4 raciones/día |
| Fruta | 3–5 raciones/día |
| Cereales (preferiblemente integrales) | 4–6 raciones/día |
| Legumbres | 2–4 veces/semana |
| Lácteos | 2–4 raciones/día |
| Pescado | Al menos 2 veces/semana |
| Huevos | 2–4 veces/semana |
| Carne roja | No más de 2 veces/semana |
| Agua | 1,5–2,5 L/día |

### Límites de referencia (EFSA / OMS)

| Nutriente | Referencia |
|---|---|
| Azúcares libres | < 10% de la energía total (idealmente < 5%) |
| Sal | < 5 g/día |
| Grasas saturadas | < 10% de la energía |
| Grasas trans | < 1% de la energía |
| Grasa total | 20–35% de la energía |
| Hidratos de carbono | 45–60% de la energía |
| Fibra | 25 g/día |
| Proteína | 0,83 g/kg/día (adulto sano) |

Estas referencias son valores poblacionales para adultos sanos, no objetivos terapéuticos individuales.

---

## 4. Límites de seguridad

### Casos de derivación obligatoria

El sistema debe interrumpir la personalización y derivar a un profesional cuando aparezcan:

- Embarazo, lactancia.
- Menores de edad.
- Diabetes, HTA, enfermedad renal, hepática o cardiovascular.
- Trastornos de la conducta alimentaria (anorexia, bulimia, etc.).
- Cirugía bariátrica.
- Medicación o suplementación.
- Síntomas o datos analíticos.
- Pérdida de peso extrema o acelerada.

**Mensaje de derivación tipo:**

> Puedo darte orientación general sobre hábitos saludables, pero este caso requiere valoración de un profesional de la salud. Te recomiendo consultar con tu médico o dietista-nutricionista.

### Reglas hard-coded — nunca ignorar

- No diagnosticar.
- No interpretar síntomas.
- No recomendar dietas clínicas.
- No prescribir calorías "de tratamiento".
- No aconsejar ayunos extremos, detox ni mono-dietas.
- No tratar alergias severas sin fuente fiable.
- No recomendar suplementos para corregir supuestas deficiencias.
- No sustituir medicación.
- No usar lenguaje de "prohibido" o "dañino" sin matiz.

---

## 5. Reglas para el chat educativo

- Responder primero a la pregunta concreta.
- Añadir una recomendación práctica breve y realista.
- No usar tono médico.
- Centrar las respuestas en calidad dietética, no en contar calorías.
- Si el usuario pregunta por adelgazar: hábitos sostenibles, saciedad, estructura de comidas, actividad física, reducción gradual de ultraprocesados — nunca tratamiento.
- Si la pregunta entra en límites de seguridad: detener y derivar.
- Si la información del usuario es incompleta: pedir solo la aclaración mínima necesaria.

---

## 6. Reglas para generación de menús

Los menús del MVP deben generarse desde reglas, no desde creatividad libre del modelo.

**Estructura mínima:**
- Desayuno, comida, cena y 0–1 snack opcional.
- Verduras visibles en comida y cena.
- Fruta 1–3 veces al día.
- Al menos 1 ración de legumbres o pescado en planes de varios días.
- Preferencia por cereales integrales cuando encaje.
- Agua como bebida principal.
- Aceite de oliva como grasa culinaria por defecto.

**Lo que no debe hacer:**
- Presentar el menú como pauta médica o tratamiento dietético.
- Prometer precisión calórica milimétrica.
- Generar "dietas" restrictivas sin justificación.
- Omitir alternativas y sustituciones.

**Lo que sí debe hacer:**
- Mostrar 2–3 sustituciones por preferencias o disponibilidad.
- Si el usuario declara alergia o intolerancia, excluir el alimento pero no garantizar ausencia de trazas.
- Etiquetar cualquier cifra calórica como "estimación aproximada" o usar rangos.

---

## 7. Reglas para análisis de plato por imagen

### Qué puede inferirse razonablemente desde una foto

- Familias de alimentos presentes.
- Distribución de proporciones en el plato.
- Método de cocción aproximado.

### Qué no puede afirmarse desde una foto

- Peso exacto ni cantidad real de ingredientes.
- Aceite absorbido durante la cocción.
- Ingredientes ocultos (salsas, rellenos, especias).
- Ausencia de alérgenos.
- Densidad calórica exacta.
- Micronutrientes.

### Niveles de confianza para imagen

| Nivel | Condiciones |
|---|---|
| Alta | Producto envasado con etiqueta visible o plato simple con 1–2 componentes y referencia de tamaño clara. |
| Media | Plato con 2–4 componentes distinguibles, sin peso exacto pero con buena visibilidad y poco solapamiento. |
| Baja | Guisos, bowls, sopas, pasta con salsa, platos compartidos, rebozados, mala luz, perspectiva extrema o sin referencia de tamaño. |

### Estructura de respuesta para imagen

1. Alimentos que parecen estar presentes.
2. Suposiciones realizadas.
3. Estimación aproximada: kcal (rango), proteína, hidratos, grasa (rangos en g).
4. Nivel de confianza: alto / medio / bajo + razón breve.
5. Cómo mejorar el equilibrio del plato.
6. Qué información adicional mejoraría la estimación.

---

## 8. Política de incertidumbre

Si faltan peso, cantidades, método de cocción o ingredientes clave, el sistema debe:

- Decirlo explícitamente.
- Degradar la precisión y usar rangos amplios.
- Preguntar solo lo mínimo necesario.

**Respuesta correcta:**

> Estimación aproximada: entre 550 y 800 kcal. La incertidumbre sube si hubo aceite extra, queso, salsas o porciones no visibles.

**Respuesta incorrecta:**

> Las calorías de este plato son 742 kcal.

---

## 9. Decisión sobre APIs externas

Ver detalle completo en [docs/ai-api-evaluation.md](ai-api-evaluation.md).

### Resumen de decisión

| Opción | Decisión MVP |
|---|---|
| BEDCA / AESAN (dataset offline) | Usar como referencia documental y apoyo offline. |
| USDA FoodData Central | Usar para alimentos genéricos — gratuito y bien documentado. |
| Open Food Facts | Opcional para barcode/productos envasados — sin coste. |
| Edamam | Fase 2 si se necesita NLP alimentario o análisis de recetas. |
| FatSecret | Fase 2 si se necesita cobertura europea de branded foods. |
| Spoonacular | Descartar — solo inglés, encaje limitado. |
| Nutritionix | Descartar — coste alto, acceso restringido. |

**Regla para el MVP:** no integrar API externa de pago obligatoria. Empezar con fuentes abiertas y lógica propia.

---

## 10. Arquitectura recomendada

```
Usuario
  └─> Frontend
        └─> Backend (Express)
              ├─> Clasificador de intención + seguridad (código propio)
              ├─> Lookup de alimentos (USDA / dataset local)
              ├─> Cálculos deterministas (BMR, TDEE, macros)
              ├─> Plantillas de menú (reglas propias)
              └─> Gemini (lenguaje, menú, imagen)
                    └─> Resultado validado y estructurado
                          └─> MongoDB (conversaciones, análisis, caché, prompts)
```

### Qué calcula el backend (no el LLM)

- Clasificación de intención del usuario.
- Detección de casos fuera de alcance.
- Normalización de unidades y cantidades.
- Aplicación de plantillas de menú.
- Lookup de alimentos en fuente priorizada.
- Conversión a rangos de kcal/macros.
- Puntuación de confianza.
- Generación de advertencias estándar.

### Qué hace Gemini

- Transformar preguntas ambiguas en JSON estructurado.
- Redactar respuestas educativas en español claro.
- Proponer variaciones de menú dentro de los límites dados por backend.
- Analizar imagen y devolver hipótesis estructuradas, no cifras finales cerradas.
- Explicar incertidumbre y solicitar aclaraciones.

### Almacenamiento

| Base | Contenido |
|---|---|
| **PostgreSQL** | Usuarios, perfiles, objetivos, preferencias, historial de menús aceptados, catálogo de alimentos normalizado. |
| **MongoDB** | Conversaciones, mensajes, análisis de plato, prompts versionados, caché con TTL, trazas de seguridad. |

---

## 11. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sobrepasar límites médicos | Alto | Clasificador de seguridad previo al LLM + plantillas de derivación + tests de prompts. |
| Cifras nutricionales demasiado exactas desde imagen | Alto | Rangos obligatorios, nivel de confianza, preguntas de aclaración. |
| Afirmar ausencia de alérgenos desde foto | Muy alto | Nunca garantizar por imagen. Solo confiar en etiqueta o dato declarado. |
| Dependencia excesiva del LLM | Alto | Backend determinista para reglas, seguridad, lookup y formateo. |
| Datos de producto incorrectos o desactualizados | Medio | Mostrar fuente y fecha; caché con expiración; permitir corrección del usuario. |
| Problemas de licencias con APIs | Medio | Revisar términos antes de integrar. Especial cuidado con Edamam. |
| Coste de APIs en producción | Medio | Empezar con fuentes abiertas; vendors de pago solo si hay necesidad real demostrada. |

---

## 12. Conclusión accionable

La combinación más equilibrada para NutriCoach AI en MVP es:

- **Producto educativo** para adulto general sin patologías.
- **Backend con reglas duras** para seguridad, derivación y cálculos deterministas.
- **Gemini como capa de lenguaje** — no como motor autónomo.
- **BEDCA / AESAN / USDA** como base nutricional de referencia.
- **Open Food Facts** como opción ligera para barcode.
- **Imagen tratada como estimación de confianza baja a media.**
- **Vendors de pago solo en fase 2** si el proyecto crece y demuestra necesidad real.

Esta combinación equilibra seguridad, credibilidad técnica, coste y complejidad para un MVP full stack.
