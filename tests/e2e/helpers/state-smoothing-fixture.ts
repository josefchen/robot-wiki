import { test as base, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ownedEvidencePath } from './keypoint-reader-oracle';
export { expect, type Locator, type Page } from '@playwright/test';

// Instrument all contexts, including the existing spec's explicit browser.newContext cases.
export const test = base.extend<{ stateOffline: void }>({
  stateOffline: [async ({ browser }, runFixture, testInfo) => {
    const root = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
    const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS;
    if (!inputPath) throw new Error('ROBOT_WIKI_GATE_INPUTS is required');
    const inputSha256 = createHash('sha256').update(readFileSync(inputPath)).digest('hex');
    const manifest = JSON.parse(readFileSync(inputPath, 'utf8'));
    for (const path of [testInfo.file, 'tests/e2e/helpers/state-smoothing-fixture.ts', 'tests/e2e/helpers/keypoint-reader-oracle.ts'].map(path => path.startsWith('/') ? path : process.cwd() + '/' + path)) {
      const expected = manifest.inputs[path];
      if (!expected || createHash('sha256').update(readFileSync(path)).digest('hex') !== expected.sha256) throw new Error('Missing or stale reader input: ' + path);
    }
    const contexts: { viewport: object | null; external: string[]; errors: string[]; navigations: string[]; overflow: number[] }[] = [];
    const original = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await original(options);
      const record = { viewport: options?.viewport ?? null, external: [] as string[], errors: [] as string[], navigations: [] as string[], overflow: [] as number[] };
      contexts.push(record);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === testInfo.project.use.baseURL) return route.continue();
        record.external.push(url.href); return route.abort();
      });
      await context.addInitScript(() => {
        const install = () => {
          if (!document.documentElement) return;
          const style = document.createElement('style');
          style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}nextjs-portal{display:none!important}';
          document.documentElement.appendChild(style); observer.disconnect();
        };
        const observer = new MutationObserver(install); observer.observe(document, { childList: true, subtree: true }); install();
      });
      context.on('page', page => {

        page.on('pageerror', error => record.errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') record.errors.push(message.text()); });
        page.on('request', request => {
          if (request.isNavigationRequest() && request.frame() === page.mainFrame()) record.navigations.push(request.url());
        });
        page.on('load', async () => {
          try { record.viewport = page.viewportSize(); record.overflow.push(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)); }
          catch (error) { record.errors.push(String(error)); }
        });
      });
      return context;
    };
    try { await runFixture(); } finally {
      browser.newContext = original;
      writeFileSync(ownedEvidencePath(root, testInfo.outputPath('offline-runtime.json')), JSON.stringify({ inputPath, inputSha256, contexts }, null, 2));
    }
    expect(contexts.length).toBeGreaterThan(0);
    for (const record of contexts) {
      expect(record.external).toEqual([]); expect(record.errors).toEqual([]);
      expect(record.navigations.length).toBeGreaterThan(0); expect(record.navigations.length).toBeLessThanOrEqual(16);
      expect(record.overflow.every(value => value <= 0)).toBe(true);
    }
  }, { auto: true }],
});
