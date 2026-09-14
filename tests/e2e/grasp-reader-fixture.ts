import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { graspReaderBase } from './grasp-reader-inputs';

export const readerBaseURL = graspReaderBase();

export const test = base.extend({
  page: async ({ page }, providePage, info) => {
    if (!readerBaseURL) {
      await providePage(page);
      return;
    }
    const errors: string[] = [];
    const external: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(`${readerBaseURL}/`) || /^(data|blob):/.test(url)) return route.continue();
      external.push(url);
      return route.abort();
    });
    await page.addInitScript(() => {
      const install = () => {
        if (!document.documentElement || document.getElementById('grasp-owned-dev-portal')) return;
        const style = document.createElement('style');
        style.id = 'grasp-owned-dev-portal';
        // Only Next's non-shipped portal is hidden. Product popups stay real.
        style.textContent = 'nextjs-portal{display:none!important}';
        document.documentElement.append(style);
      };
      new MutationObserver(install).observe(document, { childList: true, subtree: true });
      install();
    });
    try {
      await providePage(page);
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    } finally {
      mkdirSync(info.outputDir, { recursive: true });
      writeFileSync(info.outputPath('case-observation.json'), JSON.stringify({
        observedAt: new Date().toISOString(), title: info.title, project: info.project.name,
        status: info.status, viewport: page.viewportSize(), url: page.url(),
        annotations: info.annotations, errors, external,
        inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
        fixture: 'Only Next dev portal hidden. No product popup or error suppression.',
      }, null, 2) + '\n');
    }
  },
});

if (readerBaseURL) test.use({ baseURL: readerBaseURL });
