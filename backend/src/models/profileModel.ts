/**
 * @file Modelo de acceso a datos para la tabla `public."Profile"`.
 * Nota: las columnas en camelCase del esquema requieren comillas dobles en SQL.
 */

import { query } from '../config/db.js';
import { MealType, Profile, ProfileMealAssignment } from '../types/domain.js';

/** Lista de columnas seleccionables con sus alias camelCase. */
const SELECT_COLUMNS = `
  user_id,
  weight,
  age,
  height,
  gender,
  "activityFactor" AS "activityFactor",
  "objective" AS "objective",
  "basalMetabolicRate" AS "basalMetabolicRate",
  "totalDailyEnergyExpenditure" AS "totalDailyEnergyExpenditure"
`;

let profileMealTypeColumnReady: Promise<void> | null = null;

function ensureProfileMealTypeColumn(): Promise<void> {
  if (!profileMealTypeColumnReady) {
    profileMealTypeColumnReady = query(
      `ALTER TABLE public."Profile_Meal"
       ADD COLUMN IF NOT EXISTS meal_type character varying(20)`
    ).then(() => undefined);
  }

  return profileMealTypeColumnReady;
}

/**
 * Devuelve todos los perfiles.
 *
 * @returns {Promise<Profile[]>} Lista de perfiles.
 */
export async function findAll(): Promise<Profile[]> {
  const result = await query<Profile>(
    `SELECT ${SELECT_COLUMNS} FROM public."Profile" ORDER BY user_id`
  );
  return result.rows;
}

/**
 * Busca un perfil por su user_id.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<Profile | null>} El perfil o null.
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
 * @param {Profile} profile - Perfil a guardar.
 * @returns {Promise<Profile>} El perfil guardado.
 */
export async function create(profile: Profile): Promise<Profile> {
  const result = await query<Profile>(
    `INSERT INTO public."Profile"
       (user_id, weight, age, height, gender, "activityFactor", "objective",
        "basalMetabolicRate", "totalDailyEnergyExpenditure")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE
       SET weight = EXCLUDED.weight, age = EXCLUDED.age, height = EXCLUDED.height,
           gender = EXCLUDED.gender, "activityFactor" = EXCLUDED."activityFactor",
           "objective" = EXCLUDED."objective",
           "basalMetabolicRate" = EXCLUDED."basalMetabolicRate",
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
 * Devuelve las comidas asignadas a un perfil (via Profile_Meal).
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
 * Devuelve las comidas asignadas a un perfil junto con su categoria.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<ProfileMealAssignment[]>} Asignaciones del perfil.
 */
export async function findMealAssignments(
  userId: number
): Promise<ProfileMealAssignment[]> {
  await ensureProfileMealTypeColumn();

  const result = await query<{
    Meal_meal_id: number;
    meal_type: MealType | null;
  }>(
    `SELECT "Meal_meal_id", meal_type
     FROM public."Profile_Meal"
     WHERE "Profile_user_id" = $1`,
    [userId]
  );

  return result.rows.map((row) => ({
    mealId: row.Meal_meal_id,
    mealType: row.meal_type,
  }));
}

/**
 * Asigna una comida a un perfil (idempotente).
 *
 * @param {number} userId - Id del perfil.
 * @param {number} mealId - Id de la comida.
 * @returns {Promise<void>}
 */
export async function assignMeal(
  userId: number,
  mealId: number,
  mealType: MealType | null = null
): Promise<void> {
  await ensureProfileMealTypeColumn();

  await query(
    `WITH updated AS (
       UPDATE public."Profile_Meal"
       SET meal_type = $3
       WHERE "Profile_user_id" = $1 AND "Meal_meal_id" = $2
       RETURNING 1
     )
     INSERT INTO public."Profile_Meal" ("Profile_user_id", "Meal_meal_id", meal_type)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (SELECT 1 FROM updated)`,
    [userId, mealId, mealType]
  );
}
