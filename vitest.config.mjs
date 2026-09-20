import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { minForks: 2, maxForks: 2 } },
    testTimeout: 120_000,
  },
});
