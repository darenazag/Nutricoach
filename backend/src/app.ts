import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';
import routes from './routes/index.js';
import { aiRouter } from './modules/ai/routes/ai.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL ?? '*', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nutricoach-backend', timestamp: new Date().toISOString() });
  });

  // Legacy alias kept so older smoke scripts and Docker healthchecks keep working.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nutricoach-backend', timestamp: new Date().toISOString() });
  });

  // P0 routes: auth, profile, meals, food items
  app.use('/api', routes);

  // AI module routes (Mongo-backed, Gemini/DeepSeek)
  app.use('/api/ai', aiRouter);

  // 404 + error handlers must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
