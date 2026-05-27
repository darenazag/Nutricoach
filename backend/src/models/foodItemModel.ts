/**
 * @file Modelo de acceso a datos para la tabla `public."Food_item"`.
 * Los IDs son generados por SERIAL. El campo `name` tiene restricción UNIQUE.
 */

import { query } from '../config/db.js';
import type { FoodItem } from '../types/domain.js';

/** Columnas seleccionables con sus alias. */
const SELECT_COLS =
  'food_id, name, protein, calories, carbs, fat, source';

/**
 * Devuelve alimentos paginados.
 *
 * @param {number} limit  - Máximo de filas.
 * @param {number} offset - Desplazamiento.
 * @returns {Promise<{ data: FoodItem[]; total: number }>}
 */
export async function findAll(
  limit: number,
  offset: number
): Promise<{ data: FoodItem[]; total: number }> {
  const [rows, count] = await Promise.all([
    query<FoodItem>(
      `SELECT ${SELECT_COLS} FROM public."Food_item" ORDER BY food_id LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) AS count FROM public."Food_item"'),
  ]);
  return { data: rows.rows, total: Number(count.rows[0].count) };
}

/**
 * Busca un alimento por su id.
 *
 * @param {number} foodId - Identificador del alimento.
 * @returns {Promise<FoodItem | null>} El alimento o null si no existe.
 */
export async function findById(foodId: number): Promise<FoodItem | null> {
  const result = await query<FoodItem>(
    `SELECT ${SELECT_COLS} FROM public."Food_item" WHERE food_id = $1`,
    [foodId]
  );
  return result.rows[0] ?? null;
}

/**
 * Inserta un alimento. El food_id es generado por SERIAL.
 * Lanza DatabaseError (code 23505) si el nombre ya existe.
 *
 * @param {Omit<FoodItem, 'food_id'>} item - Alimento sin id.
 * @returns {Promise<FoodItem>} El alimento con su id asignado.
 */
export async function create(item: Omit<FoodItem, 'food_id'>): Promise<FoodItem> {
  const result = await query<FoodItem>(
    `INSERT INTO public."Food_item" (name, protein, calories, carbs, fat, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SELECT_COLS}`,
    [item.name, item.protein, item.calories, item.carbs, item.fat, item.source]
  );
  return result.rows[0];
}

/**
 * Inserta o actualiza un alimento por nombre (idempotente).
 * Usado en scripts de seed para evitar duplicados entre ejecuciones.
 *
 * @param {Omit<FoodItem, 'food_id'>} item - Alimento sin id.
 * @returns {Promise<FoodItem>} El alimento resultante.
 */
export async function upsertByName(item: Omit<FoodItem, 'food_id'>): Promise<FoodItem> {
  const result = await query<FoodItem>(
    `INSERT INTO public."Food_item" (name, protein, calories, carbs, fat, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE
       SET protein  = EXCLUDED.protein,
           calories = EXCLUDED.calories,
           carbs    = EXCLUDED.carbs,
           fat      = EXCLUDED.fat,
           source   = EXCLUDED.source
     RETURNING ${SELECT_COLS}`,
    [item.name, item.protein, item.calories, item.carbs, item.fat, item.source]
  );
  return result.rows[0];
}

/**
 * Elimina un alimento por su id.
 *
 * @param {number} foodId - Identificador del alimento.
 * @returns {Promise<boolean>} true si se eliminó la fila.
 */
export async function remove(foodId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM public."Food_item" WHERE food_id = $1',
    [foodId]
  );
  return (result.rowCount ?? 0) > 0;
}
