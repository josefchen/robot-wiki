import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Figure tests drive many animation frames; the 5 s default times them
    // out when the machine is busy, which says nothing about the figure.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      '.next/**',
      'out/**',
    ],
  },
});
