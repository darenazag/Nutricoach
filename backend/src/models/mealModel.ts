/**
 * @file Modelo de acceso a datos para la tabla `public."Meal"` y su
 * relacion con `Food_item` a traves de `Meal_Food_item`.
 */

import { query, withTransaction } from '../config/db.js';
import { FoodItem, Meal, MealWithItems } from '../types/domain.js';

type NewMeal = Omit<Meal, 'meal_id'>;

/**
 * Devuelve todas las comidas.
 *
 * @returns {Promise<Meal[]>} Lista de comidas.
 */
export async function findAll(): Promise<Meal[]> {
  const result = await query<Meal>(
    'SELECT meal_id, name, calories, protein, fat, carbs, img, source FROM public."Meal" ORDER BY meal_id'
  );
  return result.rows;
}

/**
 * Busca una comida por su id.
 *
 * @param {number} mealId - Identificador de la comida.
 * @returns {Promise<Meal | null>} La comida o null.
 */
export async function findById(mealId: number): Promise<Meal | null> {
  const result = await query<Meal>(
    'SELECT meal_id, name, calories, protein, fat, carbs, img, source FROM public."Meal" WHERE meal_id = $1',
    [mealId]
  );
  return result.rows[0] ?? null;
}

/**
 * Devuelve una comida junto con los alimentos que la componen.
 *
 * @param {number} mealId - Identificador de la comida.
 * @returns {Promise<MealWithItems | null>} Comida con ingredientes o null.
 */
export async function findByIdWithItems(
  mealId: number
): Promise<MealWithItems | null> {
  const meal = await findById(mealId);
  if (!meal) {
    return null;
  }
  const items = await query<FoodItem>(
    `SELECT f.food_id, f.protein, f.calories, f.carbs, f.fat, f.source
     FROM public."Food_item" f
     INNER JOIN public."Meal_Food_item" mf ON mf."Food_item_food_id" = f.food_id
     WHERE mf."Meal_meal_id" = $1
     ORDER BY f.food_id`,
    [mealId]
  );
  return { ...meal, items: items.rows };
}

/**
 * Inserta o actualiza una comida (idempotente por meal_id).
 *
 * @param {Meal} meal - Comida a guardar.
 * @returns {Promise<Meal>} La comida guardada.
 */
export async function create(meal: Meal): Promise<Meal> {
  const result = await query<Meal>(
    `INSERT INTO public."Meal" (meal_id, name, calories, protein, fat, carbs, img, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (meal_id) DO UPDATE
       SET name = EXCLUDED.name,
           calories = EXCLUDED.calories,
           protein = EXCLUDED.protein,
           fat = EXCLUDED.fat,
           carbs = EXCLUDED.carbs,
           img = EXCLUDED.img,
           source = EXCLUDED.source
     RETURNING meal_id, name, calories, protein, fat, carbs, img, source`,
    [
      meal.meal_id,
      meal.name,
      meal.calories,
      meal.protein,
      meal.fat,
      meal.carbs,
      meal.img,
      meal.source,
    ]
  );
  return result.rows[0];
}

/**
 * Inserta una comida generando el identificador desde PostgreSQL.
 * La tabla original no usa SERIAL; el lock serializa MAX + 1 para evitar
 * colisiones entre guardados concurrentes.
 *
 * @param {NewMeal} meal - Comida sin identificador.
 * @returns {Promise<Meal>} La comida guardada.
 */
export async function createWithGeneratedId(meal: NewMeal): Promise<Meal> {
  return withTransaction(async (client) => {
    await client.query('LOCK TABLE public."Meal" IN EXCLUSIVE MODE');

    const nextIdResult = await client.query<{ next_id: number }>(
      'SELECT COALESCE(MAX(meal_id), 0) + 1 AS next_id FROM public."Meal"'
    );
    const mealId = Number(nextIdResult.rows[0]?.next_id ?? 1);

    const result = await client.query<Meal>(
      `INSERT INTO public."Meal" (meal_id, name, calories, protein, fat, carbs, img, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING meal_id, name, calories, protein, fat, carbs, img, source`,
      [
        mealId,
        meal.name,
        meal.calories,
        meal.protein,
        meal.fat,
        meal.carbs,
        meal.img,
        meal.source,
      ]
    );

    return result.rows[0];
  });
}

/**
 * Vincula un alimento a una comida en la tabla puente Meal_Food_item.
 * Evita duplicados comprobando existencia previa.
 *
 * @param {number} mealId - Id de la comida.
 * @param {number} foodId - Id del alimento.
 * @returns {Promise<void>}
 */
export async function linkFoodItem(
  mealId: number,
  foodId: number
): Promise<void> {
  await query(
    `INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id")
     SELECT $1, $2
     WHERE NOT EXISTS (
       SELECT 1 FROM public."Meal_Food_item"
       WHERE "Meal_meal_id" = $1 AND "Food_item_food_id" = $2
     )`,
    [mealId, foodId]
  );
}

/**
 * Crea una comida y enlaza sus alimentos en una sola transaccion.
 *
 * @param {Meal} meal - Comida a guardar.
 * @param {number[]} foodIds - Ids de alimentos que la componen.
 * @returns {Promise<MealWithItems>} La comida con sus ingredientes.
 */
export async function createWithItems(
  meal: Meal,
  foodIds: number[]
): Promise<MealWithItems> {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO public."Meal" (meal_id, name, calories, protein, fat, carbs, img, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (meal_id) DO UPDATE
         SET name = EXCLUDED.name, calories = EXCLUDED.calories,
             protein = EXCLUDED.protein, fat = EXCLUDED.fat,
             carbs = EXCLUDED.carbs, img = EXCLUDED.img, source = EXCLUDED.source`,
      [
        meal.meal_id,
        meal.name,
        meal.calories,
        meal.protein,
        meal.fat,
        meal.carbs,
        meal.img,
        meal.source,
      ]
    );

    for (const foodId of foodIds) {
      await client.query(
        `INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id")
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM public."Meal_Food_item"
           WHERE "Meal_meal_id" = $1 AND "Food_item_food_id" = $2
         )`,
        [meal.meal_id, foodId]
      );
    }

    const items = await client.query<FoodItem>(
      `SELECT f.food_id, f.protein, f.calories, f.carbs, f.fat, f.source
       FROM public."Food_item" f
       INNER JOIN public."Meal_Food_item" mf ON mf."Food_item_food_id" = f.food_id
       WHERE mf."Meal_meal_id" = $1
       ORDER BY f.food_id`,
      [meal.meal_id]
    );

    return { ...meal, items: items.rows };
  });
}
