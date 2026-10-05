import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { EXPLAINER_WORDS } from '../../components/explainers/words';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * /how-robots-work/ fills its explainer column in the browser, so search
 * reaches the explainers only through the text the page serves. Runs on the
 * export, where the Pagefind index exists.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before this spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test('the served page holds every explainer question and step', async ({ request }) => {
  const html = await (await request.get(`${BASE}/how-robots-work/`)).text();
  const text = html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  for (const { id } of EXPLAINER_ORDER) {
    const words = EXPLAINER_WORDS[id];
    expect(text, `${id} question`).toContain(words.question);
    for (const step of words.steps) expect(text, `${id} step`).toContain(step);
  }
});

test('a search for each explainer question returns the page', async ({ page }) => {
  test.setTimeout(180_000);
  const missed: string[] = [];
  for (const { id } of EXPLAINER_ORDER) {
    const { question } = EXPLAINER_WORDS[id];
    await page.goto(`${BASE}/search/?q=${encodeURIComponent(question)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status').first()).not.toHaveText(/Searching for/i, { timeout: 20_000 });
    const hrefs = await page
      .locator('[data-results-group="prose"] a[data-search-result]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    if (!hrefs.some((href) => new URL(href, BASE).pathname === '/how-robots-work/')) {
      missed.push(`${id}: "${question}" returned ${hrefs.join(', ') || 'nothing'}`);
    }
  }
  expect(missed, 'explainer questions that do not find the page').toEqual([]);
});
