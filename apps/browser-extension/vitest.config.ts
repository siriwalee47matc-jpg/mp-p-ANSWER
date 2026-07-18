import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/scan-policy.ts'],
      thresholds: {
        statements: 60,
        branches: 25,
        functions: 85,
        lines: 55,
      },
    },
  },
});
