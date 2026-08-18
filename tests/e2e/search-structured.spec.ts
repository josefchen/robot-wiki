import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Structured-entity search against the shipped artifact. The MiniSearch
 * index lives in public/search-index.json and is copied into out/ by the
 * static export; the dev server never proves the postbuild check.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before the search-structured spec',
  ).toBe(true);
  expect(
    existsSync(join(outDir, 'search-index.json')),
    'out/search-index.json is missing: the structured MiniSearch index was not exported',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

async function typeQuery(page: Page, query: string) {
  const box = page.getByRole('searchbox', { name: 'Search the wiki' });
  await box.fill('');
  await box.pressSequentially(query, { delay: 15 });
}

async function waitForSettled(page: Page) {
  await expect(page.getByRole('status').first()).not.toHaveText(/searching/i, {
    timeout: 15_000,
  });
}

test.describe('structured search on the static export', () => {
  test('a company query produces a typed structured group (VAL-SEARCH-003)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Figure AI');
    await waitForSettled(page);

    const structured = page.getByRole('region', { name: 'Structured' });
    await expect(structured).toBeVisible();
    const figure = structured.getByRole('link', { name: /^Figure AI/ });
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute('href', /\/market-map\/#company-figure-ai/);
    await expect(structured.getByText(/^company$/i).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Modules' })).toBeVisible();
  });

  test('a query matching both layers shows both groups (VAL-SEARCH-004)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'ACT');
    await waitForSettled(page);

    const prose = page.getByRole('region', { name: 'Modules' });
    const structured = page.getByRole('region', { name: 'Structured' });
    await expect(prose).toBeVisible();
    await expect(structured).toBeVisible();
    await expect(
      prose.getByRole('link', { name: /Action Chunking/ }),
    ).toBeVisible();
    await expect(structured.getByRole('link', { name: /^ACT/ })).toBeVisible();
    await expect(structured.getByText(/^method$/i).first()).toBeVisible();
  });

  test('clicking a company result lands on that card (VAL-SEARCH-006)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Figure AI');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Structured' })
      .getByRole('link', { name: /^Figure AI/ })
      .click();
    await expect(page).toHaveURL(/\/market-map\/#company-figure-ai/);
    const card = page.locator('[data-company-id="figure-ai"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Figure AI' })).toBeVisible();
  });

  test('clicking a method result lands on that row (VAL-SEARCH-006)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Diffusion Policy');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Structured' })
      .getByRole('link', { name: /^Diffusion Policy/ })
      .click();
    await expect(page).toHaveURL(
      /\/manipulation\/comparison-matrix\/#method-diffusion-policy/,
    );
    const row = page.locator('[data-entity-id="method-diffusion-policy"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Diffusion Policy');
  });

  test('clicking a dataset result lands on that row (VAL-SEARCH-006)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'DROID');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Structured' })
      .getByRole('link', { name: /^DROID/ })
      .click();
    await expect(page).toHaveURL(/\/data-hardware\/datasets\/#dataset-droid/);
    const row = page.locator('[data-entity-id="dataset-droid"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('DROID');
  });

  test('no-match query shows empty notes in both groups (VAL-SEARCH-008)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'zzqxzzqxzz');
    await waitForSettled(page);
    await expect(page.getByText(/no module prose matches/i)).toBeVisible();
    await expect(
      page.getByText(/no structured (entities|results) match/i),
    ).toBeVisible();
    await expect(page.getByText(/searching/i)).toHaveCount(0);
    await expect(page.locator('[data-search-result]')).toHaveCount(0);
  });

  test('mixed query shows results in one group and an explicit empty note in the other (VAL-SEARCH-008)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'compounding');
    await waitForSettled(page);

    const prose = page.getByRole('region', { name: 'Modules' });
    const structured = page.getByRole('region', { name: 'Structured' });
    await expect(prose).toBeVisible();
    await expect(structured).toBeVisible();
    const proseCount = await prose.locator('[data-search-result]').count();
    expect(proseCount).toBeGreaterThan(0);
    await expect(
      structured.getByText(/no structured (entities|results) match/i),
    ).toBeVisible();
    expect(await structured.locator('[data-search-result]').count()).toBe(0);
    await expect(page.getByText(/searching/i)).toHaveCount(0);
  });

  test('type facet narrows structured results and leaves prose (VAL-SEARCH-010)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'open');
    await waitForSettled(page);

    const structured = page.getByRole('region', { name: 'Structured' });
    const prose = page.getByRole('region', { name: 'Modules' });
    const beforeStructured = await structured
      .locator('[data-search-result]')
      .count();
    expect(beforeStructured).toBeGreaterThan(1);
    const proseBefore = await prose.locator('[data-search-result]').allTextContents();

    await page.getByRole('button', { name: /^Companies$/i }).click();
    const after = structured.locator('[data-search-result]');
    await expect(after.first()).toBeVisible();
    const types = await structured.locator('[data-entity-type]').allTextContents();
    expect(types.every((label) => /company/i.test(label))).toBe(true);
    expect(await after.count()).toBeLessThan(beforeStructured);

    const proseAfter = await prose.locator('[data-search-result]').allTextContents();
    expect(proseAfter).toEqual(proseBefore);

    await page.getByRole('button', { name: /^All types$/i }).click();
    expect(await structured.locator('[data-search-result]').count()).toBe(
      beforeStructured,
    );
    expect(await prose.locator('[data-search-result]').allTextContents()).toEqual(
      proseBefore,
    );
  });

  test('zero axe violations in empty, both-groups, no-results, and facet states (VAL-A11Y-003)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/search`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await typeQuery(page, 'ACT');
    await waitForSettled(page);
    await expect(page.getByRole('region', { name: 'Structured' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole('button', { name: /^Methods$/i }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await typeQuery(page, 'zzqxzzqxzz');
    await waitForSettled(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('the exported index is valid JSON covering every shipped entity (VAL-SEARCH-013, VAL-SEARCH-014)', () => {
    const raw = readFileSync(
      join(process.cwd(), 'out', 'search-index.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw) as { documentCount?: number };
    expect(parsed.documentCount).toBeGreaterThanOrEqual(111 + 18 + 6);
  });
});
