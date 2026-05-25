/**
 * @file Tipos para las respuestas de TheMealDB.
 * TheMealDB devuelve recetas con ingredientes/medidas en campos planos
 * numerados (strIngredient1..20, strMeasure1..20) y NO incluye datos
 * nutricionales (calorias/macros), que deben calcularse aparte.
 */

/**
 * Receta de TheMealDB. Solo se tipan los campos usados; los ingredientes
 * numerados se acceden por indice de cadena.
 */
export interface MealDbMeal {
  /** Id de la receta en TheMealDB. */
  idMeal: string;
  /** Nombre del plato. */
  strMeal: string;
  /** Categoria (ej. "Chicken"). */
  strCategory?: string;
  /** Region/cocina (ej. "Italian"). */
  strArea?: string;
  /** Instrucciones de preparacion. */
  strInstructions?: string;
  /** URL de la imagen del plato. */
  strMealThumb?: string;
  /** Etiquetas separadas por comas. */
  strTags?: string | null;
  /** URL de video de YouTube. */
  strYoutube?: string;
  /**
   * Ingredientes y medidas numerados: strIngredient1..20, strMeasure1..20.
   * Se acceden dinamicamente, de ahi la firma de indice.
   */
  [key: string]: string | null | undefined;
}

/** Respuesta de los endpoints de TheMealDB. `meals` es null si no hay match. */
export interface MealDbResponse {
  meals: MealDbMeal[] | null;
}
