/**
 * @file Modelo de acceso a datos para la tabla `public."Profile"`.
 * Las columnas en camelCase del esquema requieren comillas dobles en SQL.
 */

import { query } from '../config/db.js';
import type { Profile } from '../types/domain.js';

/**
 * Columnas seleccionables con sus alias camelCase.
 */
const SELECT_COLUMNS = `
  user_id,
  weight,
  age,
  height,
  gender,
  "activityFactor"              AS "activityFactor",
  "objective"                   AS "objective",
  "basalMetabolicRate"          AS "basalMetabolicRate",
  "totalDailyEnergyExpenditure" AS "totalDailyEnergyExpenditure"
`;

/**
 * Devuelve perfiles paginados.
 *
 * @param {number} limit  - Máximo de filas.
 * @param {number} offset - Desplazamiento.
 * @returns {Promise<{ data: Profile[]; total: number }>}
 */
export async function findAll(
  limit: number,
  offset: number
): Promise<{ data: Profile[]; total: number }> {
  const [rows, count] = await Promise.all([
    query<Profile>(
      `SELECT ${SELECT_COLUMNS} FROM public."Profile" ORDER BY user_id LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) AS count FROM public."Profile"'),
  ]);
  return { data: rows.rows, total: Number(count.rows[0].count) };
}

/**
 * Busca un perfil por su user_id.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<Profile | null>} El perfil o null si no existe.
 */
export async function findById(userId: number): Promise<Profile | null> {
  const result = await query<Profile>(
    `SELECT ${SELECT_COLUMNS} FROM public."Profile" WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Inserta o actualiza un perfil (idempotente por user_id).
 *
 * @param {Profile} profile - Perfil a guardar (con BMR y TDEE calculados).
 * @returns {Promise<Profile>} El perfil guardado.
 */
export async function create(profile: Profile): Promise<Profile> {
  const result = await query<Profile>(
    `INSERT INTO public."Profile"
       (user_id, weight, age, height, gender, "activityFactor", "objective",
        "basalMetabolicRate", "totalDailyEnergyExpenditure")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE
       SET weight = EXCLUDED.weight,
           age    = EXCLUDED.age,
           height = EXCLUDED.height,
           gender = EXCLUDED.gender,
           "activityFactor"              = EXCLUDED."activityFactor",
           "objective"                   = EXCLUDED."objective",
           "basalMetabolicRate"          = EXCLUDED."basalMetabolicRate",
           "totalDailyEnergyExpenditure" = EXCLUDED."totalDailyEnergyExpenditure"
     RETURNING ${SELECT_COLUMNS}`,
    [
      profile.user_id,
      profile.weight,
      profile.age,
      profile.height,
      profile.gender,
      profile.activityFactor,
      profile.objective,
      profile.basalMetabolicRate,
      profile.totalDailyEnergyExpenditure,
    ]
  );
  return result.rows[0];
}

/**
 * Devuelve los IDs de las comidas asignadas a un perfil.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<number[]>} Ids de las comidas asignadas.
 */
export async function findMealIds(userId: number): Promise<number[]> {
  const result = await query<{ Meal_meal_id: number }>(
    'SELECT "Meal_meal_id" FROM public."Profile_Meal" WHERE "Profile_user_id" = $1',
    [userId]
  );
  return result.rows.map((row) => row.Meal_meal_id);
}

/**
 * Devuelve las fechas distintas (YYYY-MM-DD, UTC) en que el usuario
 * asignó al menos una comida. Ordenadas de más reciente a más antigua.
 * Usadas para calcular la racha de actividad.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<string[]>} Array de fechas ISO en orden descendente.
 */
export async function findMealDates(userId: number): Promise<string[]> {
  const result = await query<{ day: string }>(
    `SELECT DISTINCT to_char(assigned_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
     FROM public."Profile_Meal"
     WHERE "Profile_user_id" = $1
     ORDER BY day DESC`,
    [userId]
  );
  return result.rows.map((r) => r.day);
}

/**
 * Cuenta el total de comidas asignadas a un perfil.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<number>} Número de comidas.
 */
export async function countMeals(userId: number): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM public."Profile_Meal" WHERE "Profile_user_id" = $1',
    [userId]
  );
  return Number(result.rows[0].count);
}

/**
 * Asigna una comida a un perfil.
 * La PK compuesta de la tabla evita duplicados silenciosamente.
 *
 * @param {number} userId - Id del perfil.
 * @param {number} mealId - Id de la comida.
 * @returns {Promise<void>}
 */
export async function assignMeal(userId: number, mealId: number): Promise<void> {
  await query(
    `INSERT INTO public."Profile_Meal" ("Profile_user_id", "Meal_meal_id")
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, mealId]
  );
}
