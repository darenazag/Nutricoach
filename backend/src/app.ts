import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { aiRouter } from './modules/ai/routes/ai.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/ai', aiRouter);

// Global error middleware — MUST be registered last.
app.use(errorHandler);

export default app;
