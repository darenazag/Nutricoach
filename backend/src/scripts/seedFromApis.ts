/**
 * @file Script de seed que consulta Open Food Facts y TheMealDB para
 * poblar las tablas Food_item y Meal con datos reales.
 * Usa upsert por nombre para ser idempotente entre ejecuciones.
 * Uso: npm run db:seed
 *
 * NOTA: Los valores nutricionales de las comidas de TheMealDB son
 * estimaciones basadas en macros porcentuales típicos, ya que esa API
 * no proporciona datos nutricionales exactos.
 */

import { closePool } from '../config/db.js';
import * as foodItemModel from '../models/foodItemModel.js';
import * as mealModel from '../models/mealModel.js';
import { searchProduct } from '../services/openFoodFactsService.js';
import { extractIngredients, searchMealByName } from '../services/theMealDbService.js';

/** Alimentos a buscar en Open Food Facts. */
const FOOD_TERMS = [
  'chicken breast',
  'brown rice',
  'egg',
  'oats',
  'salmon',
  'broccoli',
  'banana',
  'almonds',
  'greek yogurt',
  'lentils',
];

/** Platos a buscar en TheMealDB. */
const MEAL_TERMS = [
  'chicken',
  'pasta',
  'salad',
  'soup',
  'beef',
  'fish',
  'rice',
  'vegetable',
];

/**
 * Pausa la ejecución el tiempo indicado.
 *
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>}
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seed de alimentos desde Open Food Facts.
 * Usa upsert por nombre para ser idempotente.
 *
 * @returns {Promise<void>}
 */
async function seedFoods(): Promise<void> {
  console.log('\n[seed] === Alimentos (Open Food Facts) ===');
  for (const term of FOOD_TERMS) {
    try {
      const product = await searchProduct(term);
      if (!product || !product.nutriments) {
        console.log(`  [skip] ${term}: sin datos nutricionales`);
        continue;
      }
      const n = product.nutriments;
      const item = {
        name:     product.product_name?.trim() || term,
        source:   `OpenFoodFacts:${product.code ?? term}`,
        calories: Math.round(n['energy-kcal_100g']   ?? 0),
        protein:  Math.round((n.proteins_100g        ?? 0) * 10) / 10,
        carbs:    Math.round((n.carbohydrates_100g   ?? 0) * 10) / 10,
        fat:      Math.round((n.fat_100g             ?? 0) * 10) / 10,
      };
      const saved = await foodItemModel.upsertByName(item);
      console.log(`  [ok] ${saved.name} (${saved.calories} kcal/100g) — id: ${saved.food_id}`);
    } catch (err) {
      console.warn(`  [warn] ${term}:`, err instanceof Error ? err.message : err);
    }
    await sleep(300); // Respeta los límites de la API
  }
}

/**
 * Seed de comidas desde TheMealDB.
 * Los macros son estimaciones proporcionales al total calórico.
 * Usa upsert por nombre para ser idempotente.
 *
 * @returns {Promise<void>}
 */
async function seedMeals(): Promise<void> {
  console.log('\n[seed] === Comidas (TheMealDB) ===');
  for (const term of MEAL_TERMS) {
    try {
      const recipe = await searchMealByName(term);
      if (!recipe) {
        console.log(`  [skip] ${term}: sin resultados`);
        continue;
      }
      const ingredients = extractIngredients(recipe);
      // TheMealDB no proporciona macros nutricionales.
      // Estimación simplificada: 400 kcal base + 20 kcal por ingrediente.
      // En producción se debería cruzar con una BD nutricional.
      const estimatedCals = 400 + ingredients.length * 20;
      const meal = {
        name:     recipe.strMeal,
        calories: estimatedCals,
        protein:  Math.round(estimatedCals * 0.25 / 4),
        carbs:    Math.round(estimatedCals * 0.45 / 4),
        fat:      Math.round(estimatedCals * 0.30 / 9),
        img:      recipe.strMealThumb ?? null,
        source:   `TheMealDB:#${recipe.idMeal}`,
      };
      const saved = await mealModel.upsertByName(meal);
      console.log(`  [ok] ${saved.name} (~${saved.calories} kcal) — id: ${saved.meal_id}`);
    } catch (err) {
      console.warn(`  [warn] ${term}:`, err instanceof Error ? err.message : err);
    }
    await sleep(300);
  }
}

/**
 * Punto de entrada del script de seed.
 *
 * @returns {Promise<void>}
 */
async function seed(): Promise<void> {
  try {
    await seedFoods();
    await seedMeals();
    console.log('\n[seed] Seed completado.\n');
  } finally {
    await closePool();
  }
}

seed().catch((err: unknown) => {
  console.error('[seed] Error fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
