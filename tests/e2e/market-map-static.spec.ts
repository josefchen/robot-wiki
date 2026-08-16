import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Static-export contract for /market-map (VAL-MKT-001, VAL-MKT-007, VAL-MKT-021).
 * Filtering, view switching, and card expand must work on the shipped
 * artifact with no runtime data fetch.
 */

const OUT = join(process.cwd(), 'out');

let server: StaticExportServer | null = null;
let BASE = '';

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'market-map/index.html')),
    'out/market-map/index.html is missing: run `npm run build` first',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test('static export prerenders 112 cards and filters client-side (VAL-MKT-001, VAL-MKT-021)', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const type = request.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      apiRequests.push(request.url());
    }
  });

  await page.goto(`${BASE}/market-map/`);
  await expect(page.getByText('112 of 112 companies')).toBeVisible();
  await expect(page.locator('article[data-company-id]')).toHaveCount(112);

  await page.locator('#filter-segment').selectOption('humanoids');
  await expect(page.getByText('35 of 112 companies')).toBeVisible();
  await expect(page.locator('article[data-company-id]')).toHaveCount(35);
  expect(page.url()).toContain('segment=humanoids');

  await page.getByRole('button', { name: 'Timeline' }).click();
  await expect(page.getByText('Figure AI')).toBeVisible();

  await page.getByRole('button', { name: 'Grid' }).click();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('112 of 112 companies')).toBeVisible();
  const pi = page.locator('article[data-company-id="physical-intelligence"]');
  await pi.getByRole('button', { name: 'Expand' }).click();
  await expect(pi.getByText('openpi')).toBeVisible();

  // VAL-MKT-021: no runtime data/API fetch. Next.js still prefetches
  // same-origin HTML and `__next.*.txt` RSC payloads as static assets
  // when the client router hydrates; those are not company-data requests.
  const runtimeData = apiRequests.filter((url) => {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(BASE).origin) return true;
    if (parsed.searchParams.has('_rsc')) return false;
    if (parsed.pathname.includes('__next.')) return false;
    if (parsed.pathname.endsWith('/')) return false;
    return /\/api\//.test(parsed.pathname);
  });
  expect(runtimeData).toEqual([]);
});

test('deep links apply on the static export (VAL-MKT-007)', async ({
  page,
}) => {
  await page.goto(`${BASE}/market-map/?segment=humanoids&country=US`);
  await expect(page.getByText('6 of 112 companies')).toBeVisible();
  await expect(page.locator('article[data-company-id]')).toHaveCount(6);
});
