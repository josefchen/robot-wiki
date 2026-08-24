import { defineConfig, devices } from '@playwright/test';
import { PLAYWRIGHT_SWIFTSHADER_ARGS } from './playwright.config';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /brand-v2.*\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    ...devices['Desktop Chrome'],
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    launchOptions: {
      args: [...PLAYWRIGHT_SWIFTSHADER_ARGS],
    },
  },
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/brand-v2',
});
