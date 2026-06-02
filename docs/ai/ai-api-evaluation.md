# NutriCoach AI — Evaluación de APIs y datasets nutricionales

**Fecha:** 2026-05-21
**Decisión final:** no integrar API externa de pago obligatoria en MVP.
**Ver contexto completo en:** [docs/ai-nutrition-research.md](ai-nutrition-research.md)

---

## 1. Tabla comparativa

| API / Dataset | Tipo | Coste visible | Barcode | Imagen | Alimentos genéricos | Recetas | Cobertura España/EU | Idioma | Alérgenos | Encaje MVP | Encaje Fase 2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **BEDCA / AESAN** | Dataset oficial offline | Sin coste visible | No | No | Sí | No | Muy bueno | ES | Parcial | Apoyo documental | Apoyo documental |
| **USDA FoodData Central** | API pública | Gratuita (API key) | Parcial | No | Excelente | No | Limitado (EE.UU.) | EN | No | Sí — genéricos | Sí |
| **Open Food Facts** | API abierta | Sin coste | Sí | Sí (metadatos) | Parcial | No | Bueno en envasados EU | Varios | Parcial | Opcional — barcode | Sí |
| **Edamam** | API comercial | Desde $14/mes | Sí | Sí (Vision) | Sí | Sí | Bueno (multilingüe) | ES incluido | Sí (90+ etiquetas) | No | Prioritario |
| **FatSecret** | API comercial | Sin precio público claro | Sí (+90%) | Sí | Sí | Sí | Muy bueno (58+ países) | 26 idiomas | Sí | No | Prioritario |
| **Spoonacular** | API comercial | Desde $29/mes | Parcial | Recetas | Sí | Sí | Limitado | Solo inglés | Parcial | Descartar | No recomendado |
| **Nutritionix** | API comercial | Desde $499/mes | Sí | No (visible) | Sí | No | Poco claro para EU | EN | Parcial | Descartar | No recomendado |

---

## 2. Detalle por opción

### BEDCA / AESAN (dataset offline)

**Qué ofrece:**
- Base española de composición de alimentos genéricos.
- Datos abiertos de alimentos y bebidas comercializados en España.
- Construida con estándares EuroFIR.

**Ventajas:**
- Sin coste de licencia visible.
- Muy buen encaje local y cultural.
- Valores nutricionales fiables para alimentos genéricos españoles.

**Limitaciones:**
- No existe una API pública REST equivalente a los vendors SaaS.
- Los datos de productos comercializados pueden desactualizarse.
- La responsabilidad de la etiqueta corresponde al operador económico, no a AESAN.
- Encaja mejor como importación offline o ETL que como dependencia en tiempo real.

**Riesgos:**
- Desactualización en productos comerciales.
- No automatizable fácilmente sin trabajo de integración previo.

**Decisión:**
> Usar como referencia documental y apoyo offline para alimentos genéricos españoles. No como dependencia online obligatoria en MVP.

---

### USDA FoodData Central

**Qué ofrece:**
- API pública oficial del USDA (Estados Unidos).
- Incluye Foundation Foods, SR Legacy, FNDDS y Branded Foods.
- Datos en dominio público (CC0).
- Límite: 1.000 req/hora por IP por defecto con API key de data.gov.

**Ventajas:**
- Gratuita con límites claros y documentados.
- Muy sólida para alimentos genéricos y valores nutricionales base.
- Branded Foods se actualizan mensualmente.
- Documentación REST clara y fácil de integrar.

**Limitaciones:**
- Orientada a composición, no a UX de recetas o meal planning.
- La cobertura de branded foods es más fuerte para EE.UU. que para España.
- No soporta análisis de imagen.

**Riesgos:**
- Datos de marcas europeas menos completos que en fatsecret o Edamam.

**Decisión:**
> Usar en MVP como base gratuita para alimentos genéricos y validación nutricional backend.

---

### Open Food Facts

**Qué ofrece:**
- Base abierta de productos alimentarios con datos de la comunidad.
- API REST sin autenticación para lectura (con User-Agent personalizado).
- Barcode lookup, nutrición, Nutri-Score, NOVA, alérgenos, imágenes.
- Exportaciones masivas disponibles.
- Límites públicos: 15 req/min por IP para productos, 10 req/min para búsquedas.

**Ventajas:**
- Sin coste de licencia.
- Fácil de integrar para un microservicio de barcode.
- Buena cobertura de productos envasados en Europa.
- Datos abiertos y reutilizables.

**Limitaciones:**
- Calidad desigual — los datos los aporta la comunidad, sin garantía de exactitud.
- No es una API de recetas ni de alimentos genéricos no envasados.
- Alérgenos y NOVA dependen de que existan ingredientes completos en la entrada.

**Riesgos:**
- Datos incorrectos o incompletos en productos de baja popularidad.
- Límites bajos por IP para búsquedas masivas.

**Decisión:**
> Opcional en MVP para barcode y productos envasados. Integración ligera y sin coste.

---

### Edamam

**Qué ofrece:**
- Food Database API: búsqueda por alimento o UPC, nutrición, etiquetas de dieta y salud, NLP para food logging.
- Nutrition Analysis API: análisis de receta o texto libre con NLP.
- Vision API integrada en su ecosistema.
- Soporte multilingüe, incluido español.
- 70–90+ etiquetas de dieta, salud y alergia.

**Ventajas:**
- NLP alimentario avanzado.
- Análisis de recetas y meal planning.
- Soporte en español.
- Ecosistema completo para features de IA nutricional.

**Limitaciones:**
- Desde $14/mes para acceso básico.
- Restricciones estrictas de caching y atribuciÃ³n obligatoria.
- Uso limitado a "human initiated" — no automatización masiva.
- Complejidad contractual mayor que APIs abiertas.

**Riesgos:**
- Dependencia de vendor con términos de uso restrictivos.
- Si se incumple la política de caché, puede cancelarse el acceso.

**Decisión:**
> No integrar en MVP. Fase 2 prioritaria si se necesita NLP alimentario serio, análisis de recetas o visión gestionada.

---

### FatSecret Platform

**Qué ofrece:**
- Base de datos con 58+ datasets de países, 26 idiomas, más de 2,3 millones de alimentos.
- Barcode lookup (>90% de cobertura).
- Recetas con imágenes e instrucciones.
- API de imagen que detecta ítems, pesos y nutrición.
- Datos verificados con actualizaciones diarias.
- OAuth2.

**Ventajas:**
- Mejor cobertura europea y española que USDA entre los vendors comparados.
- Barcode sólido para branded foods internacionales.
- Datos verificados (no solo comunidad).
- España está entre las regiones documentadas.

**Limitaciones:**
- Precio no transparente públicamente para todos los escenarios.
- Add-ons de imagen y NLP se cotizan según volumen y mercado.
- Integración técnica más compleja (OAuth1/OAuth2).

**Riesgos:**
- Precio difícil de anticipar sin negociación directa.
- Mayor complejidad de integración que Open Food Facts o USDA.

**Decisión:**
> No integrar en MVP. Fase 2 prioritaria si se necesita buena cobertura europea de branded foods, barcode sólido o visión con lookup nutricional.

---

### Spoonacular

**Qué ofrece:**
- API de recetas, análisis nutricional, filtros dietéticos, meal planning y listas de compra.
- Usa principalmente USDA para ingredientes.

**Ventajas:**
- Ecosistema de recetas rico.
- Filtros de dieta e intolerancias.

**Limitaciones:**
- Funciona solo en inglés según documentación oficial.
- Encaje cultural limitado para España.
- Cache máxima de 1 hora — restrictivo.
- La documentación advierte que la información nutricional puede contener errores.
- Desde $29/mes para acceso real.

**Riesgos:**
- Idioma incompatible con el producto.
- Menor fiabilidad nutricional declarada.

**Decisión:**
> Descartar para MVP y para fase 2. Solo reevaluar si el proyecto pivota a inglés.

---

### Nutritionix

**Qué ofrece:**
- Track API con búsqueda, NLP para nutrientes y UPC lookup.
- Fuerte en branded foods y datos de restaurantes (foco EE.UU.).

**Ventajas:**
- NLP de alimentos sólido.
- Buena cobertura de productos de supermercado y restaurantes en EE.UU.

**Limitaciones:**
- El plan de prueba gratuita ha sido discontinuado.
- Precios desde $499/mes (Business Trial) hasta $999/mes (Starter).
- Sin análisis de imagen visible en documentación pública.
- Cobertura de España/EU poco clara en documentación pública.

**Riesgos:**
- Coste incompatible con un MVP académico o de bootcamp.
- Acceso muy cerrado sin partners o acuerdo previo.

**Decisión:**
> Descartar. Reevaluar solo si un partner lo financia explícitamente.

---

## 3. Decisión final por fases

### MVP

| Fuente | Uso |
|---|---|
| BEDCA / AESAN | Referencia documental offline para alimentos genéricos españoles. |
| USDA FoodData Central | Base gratuita para alimentos genéricos y validación nutricional en backend. |
| Open Food Facts | Opcional — barcode y productos envasados sin coste. |
| Lógica propia (backend) | Cálculos deterministas: BMR, TDEE, macros, plantillas de menú. |
| Gemini | Lenguaje, menú orientativo, análisis de imagen como hipótesis. |

### Fase 2 (si el proyecto crece)

| Fuente | Condición |
|---|---|
| FatSecret | Si se necesita cobertura sólida de branded foods europeos y barcode fiable. |
| Edamam | Si se priorizan NLP alimentario, análisis de recetas y ecosistema IA nutricional. |

### Descartados

| Fuente | Razón |
|---|---|
| Spoonacular | Solo inglés. Limitaciones culturales y técnicas para España. |
| Nutritionix | Coste prohibitivo y acceso restringido para MVP. |

---

## 4. Preguntas abiertas antes de integrar cualquier API de pago

Antes de contratar Edamam, FatSecret u otro vendor en fases futuras:

1. Verificar precios y términos actualizados — pueden haber cambiado.
2. Validar cobertura real de productos españoles con una batería de 20–30 referencias concretas.
3. Revisar restricciones de caching, atribución y automatización.
4. Confirmar que el uso previsto (meal analysis, logging) encaja con el plan contratado.
5. Evaluar si la cobertura de imagen real cubre los tipos de plato que suben los usuarios.
