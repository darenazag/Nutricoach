import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import routes from './routes/index.js';
import { aiRouter } from './modules/ai/routes/ai.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

// Brute-force protection for auth endpoints (register + login).
// 20 requests per 15 minutes per IP before a 429 is returned.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL ?? '*', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Apply rate limiter only to auth mutation endpoints (login / register).
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

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
