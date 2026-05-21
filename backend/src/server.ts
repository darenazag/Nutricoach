import 'dotenv/config';
import app from './app.js';
import { connectMongo } from './config/mongo.js';

const PORT = process.env.PORT ?? 3000;

/**
 * Boots the HTTP server.
 *
 * Mongo is required by the AI module (conversations, messages, prompt
 * templates, cache). We connect BEFORE binding the port so the process
 * fails fast if MONGO_URI is missing or unreachable — better than serving
 * traffic with broken /api/ai routes.
 *
 * Set MONGO_URI in backend/.env. See backend/.env.example for a value
 * compatible with the project's docker compose mongo service.
 */
async function bootstrap(): Promise<void> {
  try {
    await connectMongo();
  } catch (err) {
    console.error('[server] Failed to connect to Mongo:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] Running on port ${PORT} — ${process.env.NODE_ENV ?? 'development'}`);
  });
}

bootstrap();
