import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/backend-failover.test.ts'],
    pool: 'threads',
    restoreMocks: true,
    unstubGlobals: true
  }
});
