/**
 * @file Punto de entrada del servidor HTTP.
 * Arranca Express, verifica la configuración crítica y gestiona el cierre ordenado.
 */

import { createApp } from './app.js';
import { assertAuthConfig, env } from './config/env.js';
import { closePool } from './config/db.js';

// Falla rápido si el JWT_SECRET es el inseguro por defecto en producción.
assertAuthConfig();

const app    = createApp();
const server = app.listen(env.port, () => {
  console.log(`[server] NutriCoach backend escuchando en puerto ${env.port}`);
  console.log(`[server] Entorno: ${env.nodeEnv}`);
});

/**
 * Cierre ordenado ante señales del sistema operativo.
 * Cierra el servidor HTTP y el pool de conexiones a la BD.
 *
 * @param {string} signal - Señal recibida (SIGINT | SIGTERM).
 * @returns {Promise<void>}
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`[server] Señal ${signal} recibida, cerrando...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
