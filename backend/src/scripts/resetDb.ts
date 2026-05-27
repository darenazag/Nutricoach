/**
 * @file Script de RESET de la base de datos.
 * ¡PELIGROSO! Elimina TODOS los datos y recrea el esquema desde cero.
 * Uso exclusivo en entornos de DESARROLLO: npm run db:reset
 *
 * En producción usa npm run db:init (solo CREATE IF NOT EXISTS).
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { pool, closePool } from '../config/db.js';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function resetDb(): Promise<void> {
  if (env.nodeEnv === 'production') {
    console.error('[resetDb] ❌  Este script NO puede ejecutarse en NODE_ENV=production.');
    process.exit(1);
  }

  console.warn('[resetDb] ⚠️  ¡ATENCIÓN! Se eliminarán TODOS los datos de la BD.');
  console.warn('[resetDb] Tienes 5 segundos para cancelar (Ctrl+C)...');
  await new Promise((r) => setTimeout(r, 5000));

  const dropSql = `
    BEGIN;
    DROP TABLE IF EXISTS public."Profile_Meal"    CASCADE;
    DROP TABLE IF EXISTS public."Meal_Food_item"  CASCADE;
    DROP TABLE IF EXISTS public."Food_item"       CASCADE;
    DROP TABLE IF EXISTS public."Meal"            CASCADE;
    DROP TABLE IF EXISTS public."Profile"         CASCADE;
    DROP TABLE IF EXISTS public."User"            CASCADE;
    COMMIT;
  `;

  const initSqlPath = resolve(__dirname, '../../init.sql');
  const initSql = readFileSync(initSqlPath, 'utf-8');

  try {
    console.log('[resetDb] Eliminando tablas...');
    await pool.query(dropSql);
    console.log('[resetDb] Recreando esquema...');
    await pool.query(initSql);
    console.log('[resetDb] ✅  Reset completado.');
  } finally {
    await closePool();
  }
}

resetDb().catch((err: unknown) => {
  console.error('[resetDb] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
