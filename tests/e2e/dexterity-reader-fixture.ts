import { test as base, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const readerBaseURL = process.env.ROBOT_WIKI_SCOPED_READER_URL;
if (readerBaseURL) {
  if (readerBaseURL !== 'http://127.0.0.1:3271') throw new Error('Unqualified dexterity reader URL');
  const file = process.env.ROBOT_WIKI_GATE_INPUTS;
  if (!file) throw new Error('Missing current reader inputs');
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const root = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
  if (!root || input.requiredStage !== 'dexterity-reader-v1:readers') throw new Error('Wrong reader input stage');
  const required: string[] = JSON.parse(readFileSync(path.join(root, 'stage-requirements.json'), 'utf8')).readers;
  if (JSON.stringify([...required].sort()) !== JSON.stringify(Object.keys(input.requiredInputs).sort())) {
    throw new Error('Missing or unexpected required reader input');
  }
  for (const p of required) {
    const bytes = readFileSync(p);
    const expected = input.requiredInputs[p];
    if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
      throw new Error(`Stale reader input: ${p}`);
    }
  }
}

export const test = base.extend({
  page: async ({ page }, provide, info) => {
    if (!readerBaseURL) { await provide(page); return; }
    const errors: string[] = [], external: string[] = [];
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
        if (!document.documentElement || document.getElementById('dexterity-owned-dev-portal')) return;
        const style = document.createElement('style');
        style.id = 'dexterity-owned-dev-portal';
        style.textContent = 'nextjs-portal{display:none!important}';
        document.documentElement.append(style);
      };
      new MutationObserver(install).observe(document, { childList: true, subtree: true });
      install();
    });
    try {
      await provide(page);
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    } finally {
      mkdirSync(info.outputDir, { recursive: true });
      writeFileSync(info.outputPath('case-observation.json'), JSON.stringify({
        at: new Date().toISOString(), title: info.title, project: info.project.name,
        status: info.status, viewport: page.viewportSize(), url: page.url(),
        annotations: info.annotations, errors, external, inputs: process.env.ROBOT_WIKI_GATE_INPUTS,
        fixture: 'Only non-shipped Next dev portal hidden; product popups remain real.',
      }, null, 2) + '\n');
    }
  },
});
export { expect };
if (readerBaseURL) test.use({ baseURL: readerBaseURL });
