/**
 * @file Script de inicialización de la base de datos.
 * Lee el archivo init.sql y lo ejecuta contra PostgreSQL.
 * Uso: npm run db:init
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool, closePool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Lee y ejecuta el archivo SQL de inicialización del esquema.
 *
 * @returns {Promise<void>}
 */
async function initDb(): Promise<void> {
  const sqlPath = resolve(__dirname, '../../init.sql');
  console.log(`[initDb] Leyendo esquema desde: ${sqlPath}`);

  const sql = readFileSync(sqlPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[initDb] Esquema inicializado correctamente.');
  } finally {
    await closePool();
  }
}

initDb().catch((err: unknown) => {
  console.error('[initDb] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
