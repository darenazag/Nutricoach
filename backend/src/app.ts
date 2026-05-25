/**
 * @file Configuracion de la aplicacion Express (middlewares y rutas).
 */

import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

/**
 * Construye y configura la aplicacion Express.
 *
 * @returns {Application} La app lista para escuchar.
 */
export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  /** Endpoint de salud para comprobar que el servicio responde. */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nutricoach-backend' });
  });

  app.use('/api', routes);

  // Manejo de 404 y errores (deben ir al final).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
