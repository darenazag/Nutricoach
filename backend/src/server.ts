import 'dotenv/config';
import { createApp } from './app.js';
import { env, assertAuthConfig } from './config/env.js';
import { closePool } from './config/db.js';
import { connectMongo } from './config/mongo.js';

assertAuthConfig();

async function bootstrap(): Promise<void> {
  try {
    await connectMongo();
  } catch (err) {
    console.error('[server] Failed to connect to Mongo:', err);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[server] Running on port ${env.port} — ${env.nodeEnv}`);
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`[server] Signal ${signal} received, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap();
