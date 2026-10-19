import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANIES } from '../../data/companies';
import { companyIdSetIssues } from '../../lib/company-population';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Static-export contract for /market-map (VAL-MKT-001, VAL-MKT-007, VAL-MKT-021).
 * Filtering, view switching, and the company details must work on the
 * shipped artifact with no runtime data fetch.
 */

const OUT = join(process.cwd(), 'out');
const REGISTRY_IDS = COMPANIES.map(({ id }) => id);

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

test('static export prerenders 111 tiles and filters client-side (VAL-MKT-001, VAL-MKT-021)', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const type = request.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      apiRequests.push(request.url());
    }
  });

  // The served HTML already holds every tile, before any script runs.
  const html = await (await page.request.get(`${BASE}/market-map/`)).text();
  expect(html.match(/data-map-tile="/g)).toHaveLength(111);
  // The count above is the dataset tripwire; the ids must also be exactly
  // the registry's (tests/unit/company-population.test.ts plants each miss).
  const prerendered = [...html.matchAll(/data-map-tile="([^"]+)"/g)].map(([, id]) => id);
  expect(
    companyIdSetIssues(REGISTRY_IDS, prerendered, {
      expected: 'the company registry',
      observed: 'the prerendered map',
    }),
  ).toEqual([]);

  await page.goto(`${BASE}/market-map/`);
  await expect(page.getByText('111 of 111 companies')).toBeVisible();
  await expect(page.locator('button[data-map-tile]')).toHaveCount(111);
  const hydrated = await page
    .locator('button[data-map-tile]')
    .evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('data-map-tile') ?? ''));
  expect(
    companyIdSetIssues(REGISTRY_IDS, hydrated, {
      expected: 'the company registry',
      observed: 'the hydrated map',
    }),
  ).toEqual([]);

  await page
    .getByRole('group', { name: 'Segment' })
    .getByRole('button', { name: /^Humanoids/ })
    .click();
  await expect(page.getByText('34 of 111 companies')).toBeVisible();
  // 34 tiles for the 34-row humanoids segment (the duplicate
  // galaxea-ai-robot removal took the segment 35 -> 34).
  await expect(page.locator('button[data-map-tile]')).toHaveCount(34);
  expect(page.url()).toContain('segment=humanoids');

  await page.getByRole('button', { name: 'Timeline' }).click();
  await expect(page.getByText('Figure AI')).toBeVisible();

  await page.getByRole('button', { name: 'Grid' }).click();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText('111 of 111 companies')).toBeVisible();
  await page.locator('button[data-map-tile="physical-intelligence"]').click();
  const pi = page.getByRole('dialog', { name: 'Physical Intelligence' });
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

test('deep links apply on the static export (VAL-MKT-007)', async ({ page }) => {
  await page.goto(`${BASE}/market-map/?segment=humanoids&country=US`);
  await expect(page.getByText('6 of 111 companies')).toBeVisible();
  await expect(page.locator('button[data-map-tile]')).toHaveCount(6);
});
