import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3200',
    launchOptions: {
      // Headless Chromium needs these flags to get a WebGL context
      // (see research/06-stack-feasibility.md).
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'PORT=3200 npm run dev',
    url: 'http://localhost:3200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
