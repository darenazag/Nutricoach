/**
 * @file Seeder que rellena la base de datos UNA VEZ usando dos APIs:
 *  - Open Food Facts (principal): nutrientes reales de los alimentos base.
 *  - TheMealDB (secundaria): metadatos de recetas (nombre, imagen, fuente).
 *
 * Particularidad de diseno: TheMealDB NO proporciona datos nutricionales
 * (calorias/macros). Por eso los macros de cada comida se CALCULAN sumando
 * los de sus alimentos componentes, que si vienen de Open Food Facts. De
 * TheMealDB tomamos el nombre, la imagen y la fuente del plato.
 *
 * Flujo:
 *  1. Por cada alimento base, busca en Open Food Facts y guarda Food_item.
 *  2. Por cada plato, busca en TheMealDB sus metadatos, calcula los macros
 *     desde los alimentos componentes y guarda Meal + Meal_Food_item.
 *  3. Asigna comidas a los perfiles existentes (Profile_Meal).
 *
 * Tras esta ejecucion, la app sirve los datos desde la BD sin volver a llamar
 * a las APIs. Ejecutar con: `npm run db:seed`.
 *
 * IMPORTANTE: requiere haber ejecutado antes `npm run db:init`.
 */

import { assertExternalApisConfig } from '../config/env.js';
import { closePool } from '../config/db.js';
import * as off from '../services/openFoodFactsService.js';
import * as mealDb from '../services/theMealDbService.js';
import * as foodItemModel from '../models/foodItemModel.js';
import * as mealModel from '../models/mealModel.js';
import * as profileModel from '../models/profileModel.js';
import { OffNutriments } from '../types/openFoodFacts.js';
import { FoodItem, Meal } from '../types/domain.js';

/** Alimento base a sembrar: id local + termino de busqueda en Open Food Facts. */
interface FoodSeed {
  foodId: number;
  query: string;
  /** Nombre legible de respaldo si la API no devuelve product_name. */
  fallbackName: string;
}

/** Plato a sembrar: id local, busqueda en TheMealDB y alimentos componentes. */
interface MealSeed {
  mealId: number;
  /** Termino de busqueda en TheMealDB (nombre del plato). */
  query: string;
  /** Nombre de respaldo si TheMealDB no devuelve resultados. */
  fallbackName: string;
  /** Ids locales (FoodSeed.foodId) que componen el plato. */
  componentFoodIds: number[];
}

/** Alimentos base (conservan los ids del esquema original 101-106). */
const FOOD_SEEDS: FoodSeed[] = [
  { foodId: 101, query: 'chicken breast', fallbackName: 'Pechuga de Pollo' },
  { foodId: 102, query: 'brown rice', fallbackName: 'Arroz Integral' },
  { foodId: 103, query: 'eggs', fallbackName: 'Huevo Entero' },
  { foodId: 104, query: 'rolled oats', fallbackName: 'Avena en copos' },
  { foodId: 105, query: 'broccoli', fallbackName: 'Brocoli' },
  { foodId: 106, query: 'avocado', fallbackName: 'Aguacate' },
];

/** Platos (conservan los ids del esquema original 201-203). */
const MEAL_SEEDS: MealSeed[] = [
  {
    mealId: 201,
    query: 'chicken',
    fallbackName: 'Pollo con Arroz y Brocoli Fit',
    componentFoodIds: [101, 102, 105],
  },
  {
    mealId: 202,
    query: 'omelette',
    fallbackName: 'Tortilla de Avena y Aguacate',
    componentFoodIds: [103, 104, 106],
  },
  {
    mealId: 203,
    query: 'rice',
    fallbackName: 'Bowl de Arroz, Huevo y Aguacate',
    componentFoodIds: [102, 103, 106],
  },
];

/** Asignaciones perfil -> comida (replican Profile_Meal original). */
const PROFILE_MEAL_SEEDS: Array<{ userId: number; mealId: number }> = [
  { userId: 1, mealId: 201 },
  { userId: 1, mealId: 203 },
  { userId: 2, mealId: 202 },
  { userId: 3, mealId: 201 },
];

/** Redondea a un decimal para mantener limpios los valores nutricionales. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Extrae macros (por 100 g) de los nutrientes de Open Food Facts.
 *
 * @param {OffNutriments | undefined} n - Nutrientes del producto.
 * @returns {{ calories: number; protein: number; fat: number; carbs: number }}
 */
function extractMacros(n: OffNutriments | undefined): {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
} {
  return {
    calories: round1(n?.['energy-kcal_100g'] ?? 0),
    protein: round1(n?.proteins_100g ?? 0),
    fat: round1(n?.fat_100g ?? 0),
    carbs: round1(n?.carbohydrates_100g ?? 0),
  };
}

/**
 * Siembra los alimentos base consultando Open Food Facts.
 *
 * @returns {Promise<void>}
 */
async function seedFoods(): Promise<void> {
  console.log('[seed] Sembrando alimentos (Open Food Facts)...');
  for (const seed of FOOD_SEEDS) {
    let product = null;
    
    // 1. Envolvemos SOLO la llamada a la API en un try/catch
    try {
      product = await off.searchProduct(seed.query);
    } catch (apiError) {
      console.warn(`[seed]  - Error de conexión para "${seed.query}". Usando datos de respaldo.`);
    }

    // 2. Si no hay producto (ya sea por error 503 o porque no se encontró) 
    // extraemos macros en 0 o por defecto y usamos el fallbackName
    const macros = extractMacros(product?.nutriments);
    const name = product?.product_name?.trim() || seed.fallbackName;

    const item: FoodItem = {
      food_id: seed.foodId,
      protein: macros.protein,
      calories: macros.calories,
      carbs: macros.carbs,
      fat: macros.fat,
      source: product ? name : `${name} (Respaldo Offline)`,
    };

    await foodItemModel.create(item);
    console.log(`[seed]  - ${item.source} (id ${item.food_id}) insertado.`);
  }
}
/**
 * Calcula los macros de una comida sumando los de sus alimentos componentes
 * (ya almacenados en la BD por seedFoods).
 *
 * @param {number[]} foodIds - Ids de los alimentos componentes.
 * @returns {Promise<{ calories: number; protein: number; fat: number; carbs: number }>}
 */
async function aggregateMacros(foodIds: number[]): Promise<{
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}> {
  let calories = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;
  for (const foodId of foodIds) {
    const food = await foodItemModel.findById(foodId);
    if (food) {
      calories += food.calories;
      protein += food.protein;
      fat += food.fat;
      carbs += food.carbs;
    }
  }
  return {
    calories: round1(calories),
    protein: round1(protein),
    fat: round1(fat),
    carbs: round1(carbs),
  };
}

/**
 * Siembra los platos: toma metadatos de TheMealDB (nombre, imagen, fuente) y
 * calcula los macros desde los alimentos componentes. Enlaza Meal_Food_item.
 *
 * @returns {Promise<void>}
 */
async function seedMeals(): Promise<void> {
  console.log('[seed] Sembrando comidas (TheMealDB + macros calculados)...');
  for (const seed of MEAL_SEEDS) {
    let recipe = null;

    // 1. Envolvemos la llamada a la API en un try/catch para aislar fallos de red/servidor
    try {
      recipe = await mealDb.searchMealByName(seed.query);
      if (!recipe) {
        console.warn(
          `[seed]  - Sin receta en TheMealDB para "${seed.query}", usando fallback.`
        );
      }
    } catch (apiError) {
      console.warn(
        `[seed]  - Error de conexión con TheMealDB para "${seed.query}". Usando datos de respaldo.`
      );
    }

    // 2. Se calculan los macros acumulados independientemente de si la API respondió o no
    const macros = await aggregateMacros(seed.componentFoodIds);

    // El nombre y la imagen vienen de TheMealDB; si falló la API o no hay receta, usamos el fallback.
    const name = recipe?.strMeal ?? seed.fallbackName;
    const img = recipe?.strMealThumb ?? null;
    
    // Ajustamos la fuente para saber si el origen del nombre/metadato fue real o un respaldo offline
    const source = recipe
      ? `TheMealDB: ${recipe.strArea ?? ''} ${recipe.strCategory ?? ''}`.trim()
      : 'Calculado desde alimentos base (Respaldo Offline)';

    const meal: Meal = {
      meal_id: seed.mealId,
      name,
      calories: macros.calories,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      img,
      source,
    };

    // 3. Realizamos la inserción y el enlazado en la base de datos
    await mealModel.createWithItems(meal, seed.componentFoodIds);
    console.log(`[seed]  - ${meal.name} (id ${meal.meal_id}) insertado y enlazado.`);
  }
}

/**
 * Asigna comidas a los perfiles (Profile_Meal).
 *
 * @returns {Promise<void>}
 */
async function seedProfileMeals(): Promise<void> {
  console.log('[seed] Asignando comidas a perfiles (Profile_Meal)...');
  for (const { userId, mealId } of PROFILE_MEAL_SEEDS) {
    const profile = await profileModel.findById(userId);
    if (!profile) {
      console.warn(`[seed]  - Perfil ${userId} no existe, se omite.`);
      continue;
    }
    await profileModel.assignMeal(userId, mealId);
    console.log(`[seed]  - Perfil ${userId} <- comida ${mealId}.`);
  }
}

/**
 * Orquesta el sembrado completo en el orden correcto de dependencias.
 *
 * @returns {Promise<void>}
 */
async function seed(): Promise<void> {
  assertExternalApisConfig();
  await seedFoods();
  await seedMeals();
  await seedProfileMeals();
  console.log('[seed] Sembrado completado con exito.');
}

seed()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[seed] Error:', message);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
