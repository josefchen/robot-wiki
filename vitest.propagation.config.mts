import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Standalone config for the draft-probe propagation suite
 * (tests/propagation/). The default vitest.config.mts excludes that
 * directory because the suite mutates the real module registry and content
 * tree mid-run, racing the real-repo validator tests under parallel
 * execution. Run with: npm run test:propagation.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/propagation/**/*.test.ts'],
  },
});
