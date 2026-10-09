import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), svgr()],
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Include all source files so untested ones count as 0% instead of
      // being excluded from the denominator (otherwise "coverage" only
      // ever measures the files tests already happen to import). This is
      // Vitest 4's replacement for the removed `all: true` option.
      include: ['src/**'],
      // Set ~3 points below measured; ratchet up as coverage grows.
      // Values recalibrated for Vitest 4 — the denominator changed with
      // the all->include migration, so these differ from the old config.
      thresholds: {
        statements: 65,
        lines: 67,
        branches: 59,
        functions: 64,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
