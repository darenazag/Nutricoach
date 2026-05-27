/**
 * @file Configuración de la aplicación Express (middlewares y rutas).
 */

import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

/**
 * Construye y configura la aplicación Express.
 *
 * @returns {Application} La app lista para escuchar.
 */
export function createApp(): Application {
  const app = express();

  // ── Cabeceras de seguridad HTTP (CSP, X-Frame-Options, etc.) ──────────────
  app.use(helmet());

  // ── CORS: solo orígenes configurados explícitamente ───────────────────────
  app.use(
    cors({
      origin: env.allowedOrigins.length > 0 ? env.allowedOrigins : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  // ── Ruta raíz ─────────────────────────────────────────────────────────────
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      mensaje: '¡Bienvenido al backend de Nutricoach! 🥦',
      estado:  'Servidor activo y funcionando',
    });
  });

  /** Endpoint de salud para comprobar que el servicio responde. */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nutricoach-backend' });
  });

  app.use('/api', routes);

  // ── 404 y manejador global de errores (siempre al final) ──────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
