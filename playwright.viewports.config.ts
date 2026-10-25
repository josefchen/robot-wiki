import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * The default corpus (playwright.config.ts) has one Desktop Chrome project at
 * 1280x720, so `npm run test:e2e` never lays a page out at 375 or 1440. This
 * config runs the same specs, server and settings at one other viewport, read
 * from E2E_VIEWPORT as WIDTHxHEIGHT:
 *
 *   E2E_VIEWPORT=375x812 npm run test:e2e:viewport -- tests/e2e/<spec>.ts
 *   E2E_VIEWPORT=1440x900 npm run test:e2e:viewport -- tests/e2e/<spec>.ts
 *
 * It must stay at the repository root: readerGateInputs resolves the reader
 * lanes' specs against the directory of the config file.
 */
const requested = process.env.E2E_VIEWPORT ?? '';
const size = /^(\d{3,4})x(\d{3,4})$/.exec(requested);
if (!size) {
  throw new Error(`E2E_VIEWPORT must be WIDTHxHEIGHT, for example 375x812 or 1440x900 (got "${requested}")`);
}
const viewport = { width: Number(size[1]), height: Number(size[2]) };

export default defineConfig({
  ...base,
  projects: (base.projects ?? []).map((project) => ({
    ...project,
    name: `${project.name}-${viewport.width}x${viewport.height}`,
    use: { ...project.use, viewport },
  })),
});
