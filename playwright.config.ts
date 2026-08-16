import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  // Each WebGL test renders the SO-101 in software (SwiftShader). Parallel
  // workers oversubscribe the CPU and starve frame renders and evaluate
  // calls, which made canvas and playback assertions flaky under load.
  // WebGL e2e runs serially on this machine; reliability over wall time.
  workers: 1,
  use: {
    baseURL: 'http://localhost:3200',
    launchOptions: {
      // Headless Chromium needs these flags to get a WebGL context
      // (see research/06-stack-feasibility.md).
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
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
