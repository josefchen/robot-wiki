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
  test('the cup search opens the elbow-up and elbow-down passage by keyboard', async ({page}) => {
    await page.goto(`${BASE}/search/?q=two%20elbow%20poses%20reach%20the%20same%20cup`);
    const box = page.getByRole('searchbox');
    const lead = page.getByRole('region', {name: 'Wiki pages'}).locator('[data-search-result]').first();
    await expect(lead).toHaveAttribute('href', '/classical/kinematics/#inverse-kinematics-has-many-answers-or-none');
    await box.press('ArrowDown');
    await expect(lead).toBeFocused();
    await lead.press('Enter');
    await expect(page.getByRole('heading', {name: 'Inverse kinematics has many answers, or none'})).toBeInViewport();
  });

  test('a company query produces a typed structured group', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Figure AI');
    await waitForSettled(page);

    const structured = page.getByRole('region', { name: 'Companies, methods and datasets' });
    await expect(structured).toBeVisible();
    const figure = structured.getByRole('link', { name: /^Figure AI/ });
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute('href', /\/market-map\/#company-figure-ai/);
    await expect(structured.getByText(/^company$/i).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Wiki pages' })).toBeVisible();
  });

  test('a query matching both layers shows both groups', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'ACT');
    await waitForSettled(page);

    const prose = page.getByRole('region', { name: 'Wiki pages' });
    const structured = page.getByRole('region', { name: 'Companies, methods and datasets' });
    await expect(prose).toBeVisible();
    await expect(structured).toBeVisible();
    // Selected by destination, not by title text. The query "ACT" also
    // matches the manipulation landing route and the home page, both of
    // which list this article by name, so a name-only locator resolves to
    // three elements. The assertion is about the article route being in
    // the prose group, so the href is the identity to select on.
    await expect(
      prose.locator('a[data-search-result][href^="/manipulation/action-chunking"]'),
    ).toBeVisible();
    await expect(structured.getByRole('link', { name: /^ACT/ })).toBeVisible();
    await expect(structured.getByText(/^method$/i).first()).toBeVisible();
  });

  test('clicking a company result lands on that company', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Figure AI');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Companies, methods and datasets' })
      .getByRole('link', { name: /^Figure AI/ })
      .click();
    await expect(page).toHaveURL(/\/market-map\/#company-figure-ai/);
    // The company's tile is on the map and marked, and its details are open.
    const card = page.locator('[data-company-id="figure-ai"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('dialog', { name: 'Figure AI' }).getByRole('heading', { name: 'Figure AI' }),
    ).toBeVisible();
  });

  test('a funding search opens the dated row and its source from the keyboard', async ({page}) => {
    await page.goto(`${BASE}/search/?q=O-ID%20funding`);
    const group = page.getByRole('region', {name: 'Companies, methods and datasets'});
    const result = group.getByRole('link', {name: /^O-ID funding/});
    await expect(result).toHaveCount(1);
    await expect(result).toContainText('Pre-seed · Closed · Reported');
    await result.focus();
    await result.press('Enter');
    const row = page.locator('#round-o-id-2026-09-24');
    await expect(row).toBeVisible();
    await expect(row).toContainText('$1.2M');
    await expect(row.locator('[data-source-link]')).toHaveAttribute('href', /techinasia\.com\//);
  });

  test('financial questions identify the whole company being asked about', async ({page}) => {
    await page.goto(`${BASE}/search`);
    const group = page.getByRole('region', {name: 'Companies, methods and datasets'});
    for (const [query, expected] of [
      ['How much did 1X raise?', 1],
      ['How high can 1X raise its arms?', 0],
      ['Who invested in Motion?', 1],
      ['Who invested in motion planning research?', 0],
      ['How do I raise the sample rate for Physical Intelligence controllers?', 0],
    ] as const) {
      await typeQuery(page, query);
      await waitForSettled(page);
      await expect(group.locator('a[href^="/market-map/rounds/#round-"]')).toHaveCount(expected);
    }
  });

  test('clicking a method result lands on that row', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'Diffusion Policy');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Companies, methods and datasets' })
      .getByRole('link', { name: /^Diffusion Policy/ })
      .click();
    await expect(page).toHaveURL(
      /\/manipulation\/comparison-matrix\/#method-diffusion-policy/,
    );
    const row = page.locator('[data-entity-id="method-diffusion-policy"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Diffusion Policy');
  });

  test('clicking a dataset result lands on that row', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'DROID');
    await waitForSettled(page);
    await page
      .getByRole('region', { name: 'Companies, methods and datasets' })
      .getByRole('link', { name: /^DROID/ })
      .click();
    await expect(page).toHaveURL(/\/data-hardware\/datasets\/#dataset-droid/);
    const row = page.locator('[data-entity-id="dataset-droid"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('DROID');
  });

  test('no-match query shows empty notes in both groups', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'zzqxzzqxzz');
    await waitForSettled(page);
    await expect(page.getByText(/no matching wiki pages/i)).toBeVisible();
    await expect(
      page.getByText(/no matching companies, methods or datasets/i),
    ).toBeVisible();
    await expect(page.getByText(/searching/i)).toHaveCount(0);
    await expect(page.locator('[data-search-result]')).toHaveCount(0);
  });

  test('mixed query shows results in one group and an explicit empty note in the other', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'compounding');
    await waitForSettled(page);

    const prose = page.getByRole('region', { name: 'Wiki pages' });
    const structured = page.getByRole('region', { name: 'Companies, methods and datasets' });
    await expect(prose).toBeVisible();
    await expect(structured).toBeVisible();
    const proseCount = await prose.locator('[data-search-result]').count();
    expect(proseCount).toBeGreaterThan(0);
    await expect(
      structured.getByText(/no matching companies, methods or datasets/i),
    ).toBeVisible();
    expect(await structured.locator('[data-search-result]').count()).toBe(0);
    await expect(page.getByText(/searching/i)).toHaveCount(0);
  });

  test('type facet narrows structured results and leaves prose', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    await typeQuery(page, 'open');
    await waitForSettled(page);

    const structured = page.getByRole('region', { name: 'Companies, methods and datasets' });
    const prose = page.getByRole('region', { name: 'Wiki pages' });
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

  test('zero axe violations in empty, both-groups, no-results, and facet states', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/search`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await typeQuery(page, 'ACT');
    await waitForSettled(page);
    await expect(page.getByRole('region', { name: 'Companies, methods and datasets' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole('button', { name: /^Methods$/i }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await typeQuery(page, 'zzqxzzqxzz');
    await waitForSettled(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('the exported index is valid JSON covering every shipped entity', () => {
    const raw = readFileSync(
      join(process.cwd(), 'out', 'search-index.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw) as { documentCount?: number };
    expect(parsed.documentCount).toBeGreaterThanOrEqual(111 + 18 + 6);
  });
});

test('an exact paper ID opens the cited reference with the keyboard', async ({page}) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  const query = 'https://arxiv.org/pdf/2111.08933v3.pdf#page=2';
  await page.goto(`${BASE}/search/?q=${encodeURIComponent(query)}`);
  const result = page.getByRole('region', { name: 'Citing articles' }).getByRole('link').first();
  await expect(result).toHaveAttribute('href', '/classical/kinematics/#ref-ikflow-2021');
  await expect(page.getByRole('region', { name: 'Citing articles' })).toContainText('IKFlow');
  expect(requested).toContain('/paper-citations.json');
  expect(requested).not.toContain('/search-index.json');
  expect(requested).not.toContain('/pagefind/pagefind.js');
  const input = page.getByRole('searchbox', { name: 'Search the wiki' });
  await input.press('ArrowDown');
  await expect(result).toBeFocused();
  await result.press('Enter');
  await expect(page).toHaveURL(/\/classical\/kinematics\/#ref-ikflow-2021$/);
  const source = page.locator(':target [data-reference-source-link]');
  await expect(source).toBeInViewport();
  await expect(source).toHaveAttribute('href', /arxiv\.org\/abs\/2111\.08933/);
});

test('paper search distinguishes unavailable, uncited and ordinary queries', async ({page}) => {
  let requests = 0;
  await page.route('**/paper-citations.json', async (route) => {
    if (++requests === 1) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await page.goto(`${BASE}/search/?q=arXiv%3A2304.13705`);
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await expect(page.locator('[data-search-empty]')).toHaveCount(0);
  await retry.press('Enter');
  await expect(page.getByRole('link', { name: /^Action Chunking/ }).first()).toBeVisible();
  const citations = page.getByRole('region', { name: 'Citing articles' }).getByRole('link');
  const count = await citations.count();
  expect(count).toBeGreaterThan(1);
  await expect(page.getByRole('status')).toHaveText(`${count} technical chapters cite arXiv:2304.13705`);
  const input = page.getByRole('searchbox', { name: 'Search the wiki' });
  await input.fill('2403.99999');
  await expect(page.getByRole('status')).toHaveText('No technical chapters cite arXiv:2403.99999');
  await expect(page.locator('[data-search-empty]')).toContainText('Try the paper title');
  await input.fill('DROID dataset');
  await expect(page.getByRole('region', { name: 'Wiki pages', exact: true }).getByRole('link').first()).toContainText('Datasets');
  expect(requests).toBe(2);
});

test('a paper linked only from a company profile has no technical chapter matches', async ({ page }) => {
  await page.goto(`${BASE}/search/?q=arxiv%3A2509.14139`);
  await expect(page.getByRole('status')).toHaveText('No technical chapters cite arXiv:2509.14139');
  await page.goto(`${BASE}/companies/unitree/`);
  await expect(page.locator('a[href*="arxiv.org/"][href*="2509.14139"]').first()).toBeAttached();
});
