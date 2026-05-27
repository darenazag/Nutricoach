/**
 * @file Modelo de acceso a datos para la tabla `public."User"`.
 * Los IDs son generados automáticamente por SERIAL en la BD.
 * La contraseña solo se expone cuando es estrictamente necesario (login).
 */

import { query } from '../config/db.js';
import type { SafeUser, User } from '../types/domain.js';

/**
 * Devuelve todos los usuarios sin exponer la contraseña.
 *
 * @param {number} limit  - Máximo de filas a devolver.
 * @param {number} offset - Desplazamiento para paginación.
 * @returns {Promise<{ data: SafeUser[]; total: number }>}
 */
export async function findAll(
  limit: number,
  offset: number
): Promise<{ data: SafeUser[]; total: number }> {
  const [rows, count] = await Promise.all([
    query<SafeUser>(
      'SELECT user_id, name, email FROM public."User" ORDER BY user_id LIMIT $1 OFFSET $2',
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) AS count FROM public."User"'),
  ]);
  return { data: rows.rows, total: Number(count.rows[0].count) };
}

/**
 * Busca un usuario (sin contraseña) por su id.
 *
 * @param {number} userId - Identificador del usuario.
 * @returns {Promise<SafeUser | null>} El usuario o null si no existe.
 */
export async function findById(userId: number): Promise<SafeUser | null> {
  const result = await query<SafeUser>(
    'SELECT user_id, name, email FROM public."User" WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Busca un usuario completo (con contraseña) por email. Útil para login.
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
 * Inserta un nuevo usuario. El user_id es generado por SERIAL.
 * El campo email tiene restricción UNIQUE en la BD.
 *
 * @param {Omit<User, 'user_id'>} newUser - Datos del usuario (sin id).
 * @returns {Promise<SafeUser>} El usuario creado con su id asignado.
 */
export async function create(newUser: Omit<User, 'user_id'>): Promise<SafeUser> {
  const result = await query<SafeUser>(
    `INSERT INTO public."User" (name, password, email)
     VALUES ($1, $2, $3)
     RETURNING user_id, name, email`,
    [newUser.name, newUser.password, newUser.email]
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
