import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // `all: true` so untested files count as 0% instead of being
      // excluded from the denominator (otherwise "coverage" only ever
      // measures the files tests already happen to import).
      all: true,
      // Modest floor below current (~14% stmts/lines, ~51% branches,
      // ~26% funcs); ratchet up as coverage grows.
      statements: 12,
      lines: 12,
      branches: 45,
      functions: 20,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
