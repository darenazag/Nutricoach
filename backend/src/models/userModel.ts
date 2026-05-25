/**
 * @file Modelo de acceso a datos para la tabla `public."User"`.
 */

import { query } from '../config/db.js';
import { SafeUser, User } from '../types/domain.js';

/**
 * Devuelve todos los usuarios sin exponer la contrasenia.
 *
 * @returns {Promise<SafeUser[]>} Lista de usuarios seguros.
 */
export async function findAll(): Promise<SafeUser[]> {
  const result = await query<SafeUser>(
    'SELECT user_id, name, email FROM public."User" ORDER BY user_id'
  );
  return result.rows;
}

/**
 * Busca un usuario (sin password) por su id.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<SafeUser | null>} El usuario o null.
 */
export async function findById(userId: number): Promise<SafeUser | null> {
  const result = await query<SafeUser>(
    'SELECT user_id, name, email FROM public."User" WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Busca un usuario completo (con password) por email. Util para login.
 *
 * @param {string} email - Correo del usuario.
 * @returns {Promise<User | null>} El usuario completo o null.
 */
export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT user_id, name, password, email FROM public."User" WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

/**
 * Inserta o actualiza un usuario (idempotente por user_id).
 *
 * @param {User} user - Usuario a guardar.
 * @returns {Promise<SafeUser>} El usuario guardado, sin password.
 */
export async function create(user: User): Promise<SafeUser> {
  const result = await query<SafeUser>(
    `INSERT INTO public."User" (user_id, name, password, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET name = EXCLUDED.name, password = EXCLUDED.password, email = EXCLUDED.email
     RETURNING user_id, name, email`,
    [user.user_id, user.name, user.password, user.email]
  );
  return result.rows[0];
}

/**
 * Comprueba si ya existe un usuario con el email dado.
 *
 * @param {string} email - Correo a comprobar.
 * @returns {Promise<boolean>} true si existe.
 */
export async function existsByEmail(email: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM public."User" WHERE email = $1 LIMIT 1',
    [email]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Devuelve el siguiente user_id disponible (max + 1, o 1 si la tabla esta vacia).
 * Util porque el esquema original no usa autoincremento.
 *
 * @returns {Promise<number>} El proximo id libre.
 */
export async function nextId(): Promise<number> {
  const result = await query<{ next_id: number }>(
    'SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM public."User"'
  );
  return Number(result.rows[0].next_id);
}
