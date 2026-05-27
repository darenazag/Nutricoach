/**
 * @file Modelo de acceso a datos para la tabla `public."Meal"` y su
 * relación N:M con `Food_item` a través de `Meal_Food_item`.
 * Los IDs son generados por SERIAL. El campo `name` tiene restricción UNIQUE.
 */

import { query, withTransaction } from '../config/db.js';
import type { FoodItem, Meal, MealWithItems } from '../types/domain.js';

/** Columnas de Food_item en JOINs. */
const FOOD_COLS =
  'f.food_id, f.name, f.protein, f.calories, f.carbs, f.fat, f.source';

/** Columnas de Meal. */
const MEAL_COLS =
  'meal_id, name, calories, protein, fat, carbs, img, source';

/**
 * Devuelve comidas paginadas.
 *
 * @param {number} limit  - Máximo de filas.
 * @param {number} offset - Desplazamiento.
 * @returns {Promise<{ data: Meal[]; total: number }>}
 */
export async function findAll(
  limit: number,
  offset: number
): Promise<{ data: Meal[]; total: number }> {
  const [rows, count] = await Promise.all([
    query<Meal>(
      `SELECT ${MEAL_COLS} FROM public."Meal" ORDER BY meal_id LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) AS count FROM public."Meal"'),
  ]);
  return { data: rows.rows, total: Number(count.rows[0].count) };
}

/**
 * Busca una comida por su id.
 *
 * @param {number} mealId - Identificador de la comida.
 * @returns {Promise<Meal | null>} La comida o null.
 */
export async function findById(mealId: number): Promise<Meal | null> {
  const result = await query<Meal>(
    `SELECT ${MEAL_COLS} FROM public."Meal" WHERE meal_id = $1`,
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
export async function findByIdWithItems(mealId: number): Promise<MealWithItems | null> {
  const meal = await findById(mealId);
  if (!meal) return null;

  const items = await query<FoodItem>(
    `SELECT ${FOOD_COLS}
     FROM public."Food_item" f
     INNER JOIN public."Meal_Food_item" mf ON mf."Food_item_food_id" = f.food_id
     WHERE mf."Meal_meal_id" = $1
     ORDER BY f.food_id`,
    [mealId]
  );
  return { ...meal, items: items.rows };
}

/**
 * Inserta una comida. El meal_id es generado por SERIAL.
 * Lanza DatabaseError (code 23505) si el nombre ya existe.
 *
 * @param {Omit<Meal, 'meal_id'>} meal - Comida sin id.
 * @returns {Promise<Meal>} La comida con su id asignado.
 */
export async function create(meal: Omit<Meal, 'meal_id'>): Promise<Meal> {
  const result = await query<Meal>(
    `INSERT INTO public."Meal" (name, calories, protein, fat, carbs, img, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${MEAL_COLS}`,
    [meal.name, meal.calories, meal.protein, meal.fat, meal.carbs, meal.img, meal.source]
  );
  return result.rows[0];
}

/**
 * Inserta o actualiza una comida por nombre (idempotente).
 * Usado en scripts de seed para evitar duplicados entre ejecuciones.
 *
 * @param {Omit<Meal, 'meal_id'>} meal - Comida sin id.
 * @returns {Promise<Meal>} La comida resultante.
 */
export async function upsertByName(meal: Omit<Meal, 'meal_id'>): Promise<Meal> {
  const result = await query<Meal>(
    `INSERT INTO public."Meal" (name, calories, protein, fat, carbs, img, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (name) DO UPDATE
       SET calories = EXCLUDED.calories,
           protein  = EXCLUDED.protein,
           fat      = EXCLUDED.fat,
           carbs    = EXCLUDED.carbs,
           img      = EXCLUDED.img,
           source   = EXCLUDED.source
     RETURNING ${MEAL_COLS}`,
    [meal.name, meal.calories, meal.protein, meal.fat, meal.carbs, meal.img, meal.source]
  );
  return result.rows[0];
}

/**
 * Vincula un alimento a una comida en la tabla puente.
 * Usa ON CONFLICT DO NOTHING gracias a la PK compuesta.
 *
 * @param {number} mealId - Id de la comida.
 * @param {number} foodId - Id del alimento.
 * @returns {Promise<void>}
 */
export async function linkFoodItem(mealId: number, foodId: number): Promise<void> {
  await query(
    `INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id")
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [mealId, foodId]
  );
}

/**
 * Crea una comida y enlaza sus alimentos en una sola transacción atómica.
 * El meal_id es generado por SERIAL.
 *
 * @param {Omit<Meal, 'meal_id'>} meal    - Comida sin id.
 * @param {number[]}             foodIds - Ids de alimentos que la componen.
 * @returns {Promise<MealWithItems>} La comida con sus ingredientes.
 */
export async function createWithItems(
  meal: Omit<Meal, 'meal_id'>,
  foodIds: number[]
): Promise<MealWithItems> {
  return withTransaction(async (client) => {
    // Insertar la comida y obtener el meal_id generado por SERIAL
    const mealResult = await client.query<Meal>(
      `INSERT INTO public."Meal" (name, calories, protein, fat, carbs, img, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${MEAL_COLS}`,
      [meal.name, meal.calories, meal.protein, meal.fat, meal.carbs, meal.img, meal.source]
    );
    const savedMeal = mealResult.rows[0];

    // Vincular alimentos (PK compuesta evita duplicados)
    for (const foodId of foodIds) {
      await client.query(
        `INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id")
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [savedMeal.meal_id, foodId]
      );
    }

    // Devolver la comida con sus ingredientes
    const items = await client.query<FoodItem>(
      `SELECT ${FOOD_COLS}
       FROM public."Food_item" f
       INNER JOIN public."Meal_Food_item" mf ON mf."Food_item_food_id" = f.food_id
       WHERE mf."Meal_meal_id" = $1
       ORDER BY f.food_id`,
      [savedMeal.meal_id]
    );

    return { ...savedMeal, items: items.rows };
  });
}
