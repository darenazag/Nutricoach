/**
 * @file Pool de conexiones a PostgreSQL usando node-postgres (pg).
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env.js';

/**
 * Pool unico de conexiones. Reutilizable en toda la aplicacion.
 * Si DATABASE_URL esta definida se usa; si no, se compone con los campos sueltos.
 */
export const pool: Pool = env.db.url
  ? new Pool({ connectionString: env.db.url })
  : new Pool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
    });

pool.on('error', (err: Error) => {
  // Error inesperado en un cliente inactivo del pool.
  console.error('[db] Error inesperado en el pool de PostgreSQL:', err.message);
});

/**
 * Ejecuta una consulta parametrizada contra el pool.
 *
 * @template T - Forma de las filas devueltas.
 * @param {string} text - SQL con placeholders ($1, $2, ...).
 * @param {ReadonlyArray<unknown>} [params] - Valores de los placeholders.
 * @returns {Promise<QueryResult<T>>} Resultado de la consulta.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[] | undefined);
}

/**
 * Ejecuta una funcion dentro de una transaccion.
 * Hace COMMIT si la funcion termina bien y ROLLBACK si lanza.
 *
 * @template T - Tipo devuelto por el callback.
 * @param {(client: PoolClient) => Promise<T>} fn - Trabajo a ejecutar.
 * @returns {Promise<T>} El resultado del callback.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cierra el pool de conexiones. Util en scripts puntuales y en shutdown.
 *
 * @returns {Promise<void>}
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
