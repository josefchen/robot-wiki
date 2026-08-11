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
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      // tests/propagation flips the real module registry and adds a probe
      // content file mid-run, which races the real-repo validator tests in
      // a parallel suite. It runs standalone via npm run test:propagation.
      'tests/propagation/**',
      'node_modules/**',
      '.next/**',
      'out/**',
    ],
  },
});
