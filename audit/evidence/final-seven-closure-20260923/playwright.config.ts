import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../../tests/e2e',
  testMatch: 'final-seven-closure-evidence.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'line',
  outputDir: './playwright-output',
  use: { baseURL: 'http://127.0.0.1:3298', browserName: 'chromium' },
  webServer: {
    command: 'NODE_DISABLE_COMPILE_CACHE=1 node_modules/.bin/next dev --hostname 127.0.0.1 --port 3298',
    cwd: '/home/remy-simpc4/Projects/robot-wiki-droid-continuation',
    url: 'http://127.0.0.1:3298',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
