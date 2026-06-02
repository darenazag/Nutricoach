import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/ai/setup.ts'],
    // mongodb-memory-server downloads the binary on first run — allow extra time.
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
