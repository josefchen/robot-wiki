import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { releaseScopeFiles, RELEASE_TEST_SCOPES, type ReleaseTestScope } from './lib/brand-v2-release-test-run';

const scope = process.env.ROBOT_WIKI_RELEASE_TEST_SCOPE ?? 'product';
if (!Object.hasOwn(RELEASE_TEST_SCOPES, scope) || scope === 'brand-v2') throw new Error('Invalid production test scope');

/** The ordinary product corpus, served from the exact stamped export. */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: releaseScopeFiles(process.cwd(), scope as ReleaseTestScope).map((path)=>`**/${path.replace(/^tests\/e2e\//,'')}`),
  outputDir: 'test-results/release-product',
  use: { ...base.use, baseURL: 'http://localhost:3200' },
  webServer: {
    command: 'node scripts/serve-brand-v2-release.ts',
    url: 'http://localhost:3200',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
