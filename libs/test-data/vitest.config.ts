import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['libs/test-data/src/**/*.{test,spec}.{ts,mts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@zitro/models': resolve(__dirname, '../models/src/index.ts'),
      '@zitro/mappers': resolve(__dirname, '../mappers/src/index.ts'),
    },
  },
});
