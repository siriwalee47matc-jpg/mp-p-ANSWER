import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/lib/api.ts'],
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 100,
        lines: 80,
      },
    },
  },
});
