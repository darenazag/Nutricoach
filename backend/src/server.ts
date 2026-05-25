/**
 * @file Punto de entrada: arranca el servidor HTTP.
 */

import { createApp } from './app.js';
import { env, assertAuthConfig } from './config/env.js';
import { closePool } from './config/db.js';

// Falla pronto si la config de auth es insegura en produccion.
assertAuthConfig();

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] NutriCoach backend escuchando en puerto ${env.port}`);
  console.log(`[server] Entorno: ${env.nodeEnv}`);
});

/**
 * Cierre ordenado ante senales del sistema: cierra el pool y el servidor.
 *
 * @param {string} signal - Senal recibida.
 * @returns {Promise<void>}
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`[server] Recibida senal ${signal}, cerrando...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
