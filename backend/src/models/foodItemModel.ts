/**
 * @file Modelo de acceso a datos para la tabla `public."Food_item"`.
 */

import { query } from '../config/db.js';
import { FoodItem } from '../types/domain.js';

/**
 * Devuelve todos los alimentos.
 *
 * @returns {Promise<FoodItem[]>} Lista de alimentos.
 */
export async function findAll(): Promise<FoodItem[]> {
  const result = await query<FoodItem>(
    'SELECT food_id, protein, calories, carbs, fat, source FROM public."Food_item" ORDER BY food_id'
  );
  return result.rows;
}

/**
 * Busca un alimento por su id.
 *
 * @param {number} foodId - Identificador del alimento.
 * @returns {Promise<FoodItem | null>} El alimento o null si no existe.
 */
export async function findById(foodId: number): Promise<FoodItem | null> {
  const result = await query<FoodItem>(
    'SELECT food_id, protein, calories, carbs, fat, source FROM public."Food_item" WHERE food_id = $1',
    [foodId]
  );
  return result.rows[0] ?? null;
}

/**
 * Inserta un alimento. Si el food_id ya existe, no hace nada (idempotente).
 *
 * @param {FoodItem} item - Alimento a insertar.
 * @returns {Promise<FoodItem>} El alimento insertado.
 */
export async function create(item: FoodItem): Promise<FoodItem> {
  const result = await query<FoodItem>(
    `INSERT INTO public."Food_item" (food_id, protein, calories, carbs, fat, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (food_id) DO UPDATE
       SET protein = EXCLUDED.protein,
           calories = EXCLUDED.calories,
           carbs = EXCLUDED.carbs,
           fat = EXCLUDED.fat,
           source = EXCLUDED.source
     RETURNING food_id, protein, calories, carbs, fat, source`,
    [item.food_id, item.protein, item.calories, item.carbs, item.fat, item.source]
  );
  return result.rows[0];
}

/**
 * Elimina un alimento por su id.
 *
 * @param {number} foodId - Identificador del alimento.
 * @returns {Promise<boolean>} true si se elimino una fila.
 */
export async function remove(foodId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM public."Food_item" WHERE food_id = $1',
    [foodId]
  );
  return (result.rowCount ?? 0) > 0;
}
