/**
 * @file Inicializa la base de datos ejecutando el `schema.sql` original.
 * Este script aplica el SQL tal cual lo proporciono el usuario (tablas + datos
 * semilla). Ejecutar con: `npm run db:init`.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool, closePool } from '../config/db.js';

/** Directorio del modulo actual (equivalente a __dirname en ESM). */
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Lee y ejecuta el fichero schema.sql contra la base de datos.
 *
 * @returns {Promise<void>}
 */
async function initDb(): Promise<void> {
  const sqlPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('[db:init] Ejecutando schema.sql...');
  // El fichero ya incluye su propio BEGIN/COMMIT, asi que se lanza completo.
  await pool.query(sql);
  console.log('[db:init] Esquema y datos semilla aplicados correctamente.');
}

initDb()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[db:init] Error:', message);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
