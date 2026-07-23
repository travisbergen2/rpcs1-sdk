import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['eval/**/*.test.ts'],
    testTimeout: 600_000,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
