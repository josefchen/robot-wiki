import { expect, test, type Locator } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANIES } from '../../data/companies';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Deep-link robustness on the shipped artifact: filter params the dataset
 * does not know are dropped rather than applied, and a #company-<id> hash
 * whose filters exclude the named company relaxes those filters so the
 * company's tile is visible, marked, and scrolled into view, with its
 * details open. jsdom cannot prove any of this: it has no layout, so only a
 * real browser can show the tile landed in the viewport.
 */

/** Ink, --color-ink #1C1C1A: the research-page selected rule. */
const INK = 'rgb(28, 28, 26)';
/** A computed background with no paint. */
const NO_FILL = 'rgba(0, 0, 0, 0)';

/**
 * The research-page selected state (VAL-B2-MAP-003 successor): the open
 * company's tile reads in ink weight on a 1 px ink rule, with no fill, tint,
 * shadow or accent bar.
 */
async function expectSelectedTile(card: Locator) {
  await expect(card).toHaveCSS('border-left-width', '1px');
  await expect(card).toHaveCSS('border-left-style', 'solid');
  await expect(card).toHaveCSS('border-left-color', INK);
  await expect(card).toHaveCSS('background-color', NO_FILL);
  await expect(card).toHaveCSS('background-image', 'none');
  await expect(card).toHaveCSS('box-shadow', 'none');
  await expect(card.locator('[data-tile-name]')).toHaveCSS('font-weight', '600');
}

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'market-map', 'index.html')),
    'out/ is missing or stale: run `npm run build` before the market-map-deep-links spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test.describe('market-map deep links on the static export', () => {
  test('a hash the filters exclude clears those filters and highlights the card', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Figure AI is US and private: both filters exclude it.
    await page.goto(`${BASE}/market-map/?country=CN&status=ipo#company-figure-ai`);

    const card = page.locator('button[data-map-tile="figure-ai"]');
    await expect(card).toBeVisible();
    // Marked: the ink rule and weight only render on the open company; a
    // neighbour keeps the same 1 px rule, transparent, at regular weight.
    await expectSelectedTile(card);
    const neighbour = page.locator('button[data-map-tile="1x-technologies"]');
    await expect(neighbour).toHaveCSS('border-left-width', '1px');
    await expect(neighbour).toHaveCSS('border-left-color', NO_FILL);
    await expect(neighbour.locator('[data-tile-name]')).toHaveCSS('font-weight', '500');
    await expect(neighbour).toHaveAttribute('aria-expanded', 'false');
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(card).toHaveAttribute('aria-controls', 'market-map-company');
    // The scroll actually landed (what jsdom cannot prove).
    await expect(card).toBeInViewport({ ratio: 0.5 });
    // Its details are open, without taking focus from the page.
    await expect(page.getByRole('dialog', { name: 'Figure AI' })).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    // Filters relaxed to the defaults; the explicit hash request survives.
    await expect(page).toHaveURL(/\/market-map\/#company-figure-ai$/);
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a hash keeps the filters the company passes and drops only the rest', async ({
    page,
  }) => {
    // Figure AI is a humanoid (segment passes) but US (country fails).
    await page.goto(`${BASE}/market-map/?segment=humanoids&country=CN#company-figure-ai`);

    const card = page.locator('button[data-map-tile="figure-ai"]');
    await expect(card).toBeVisible();
    // Marked: the ink rule and weight only render on the open company.
    await expectSelectedTile(card);
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(card).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByText('34 of 111 companies')).toBeVisible();
    await expect(page).toHaveURL(
      /\/market-map\/\?segment=humanoids#company-figure-ai$/,
    );
  });

  test('a hash naming an unknown company leaves the filters alone', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${BASE}/market-map/?country=CN#company-ghost`);

    // 22 CN-headquartered rows: the figure-corrections pass moved PaXini's
    // HQ back to Shenzhen per fetched reporting (2026-08-18), CN 20 -> 21,
    // and the market-map field audit moved Astribot from Munich to Shenzhen
    // per its own site and Pandaily (2026-10-20), CN 21 -> 22.
    await expect(page.getByText('22 of 111 companies')).toBeVisible();
    expect(await page.locator('button[data-map-tile]').count()).toBe(22);
    await expect(page.locator('#company-ghost')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a bubble-view hash naming an unplotted company marks no point', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Covariant exists in the dataset but has no disclosed valuation or
    // total raised, so the bubble view never plots it. The deep link opens
    // its details (the company is real) but no mark pretends to be it: no
    // data-bubble-selected state, and the roving fallback keeps exactly one
    // tab stop so the chart stays keyboard-reachable.
    await page.goto(`${BASE}/market-map/?view=bubble#company-covariant`);

    const chart = page.getByRole('group', { name: /bubble chart/i });
    await expect(chart).toBeVisible();
    await expect(page.locator('circle[data-company-id="covariant"]')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Covariant' })).toBeVisible();
    await expect(page.locator('[data-mark-ink].fill-accent')).toHaveCount(0);
    // The chart exposes its selection state as data-bubble-selected: the
    // attribute is absent when nothing is selected (the honest state).
    expect(await chart.getAttribute('data-bubble-selected')).toBeNull();
    const tabbables = await page.evaluate(
      () =>
        document.querySelectorAll('circle[data-company-id][tabindex="0"]')
          .length,
    );
    expect(tabbables).toBe(1);
    await expect(page.getByText('111 of 111 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('unknown subSegment/country/approach params are dropped, valid siblings apply', async ({
    page,
  }) => {
    await page.goto(
      `${BASE}/market-map/?subSegment=bogus-subsegment&country=US&approach=not-an-approach`,
    );

    // 63 -> 64 on 2026-10-20: the field audit moved Starship Technologies'
    // headquarters from London to San Francisco (Wikipedia and its Business
    // Wire release).
    await expect(page.getByText('64 of 111 companies')).toBeVisible();
    expect(await page.locator('button[data-map-tile]').count()).toBe(64);
    await expect(page.locator('#filter-subsegment')).toHaveValue('');
    await expect(page.locator('#filter-approach')).toHaveValue('');
    await expect(page.locator('#filter-country')).toHaveValue('US');
  });

  // Every company in the registry, not a fixed count: a fresh load of its
  // #company-<id> link opens its own sheet, marks its tile, and the sheet
  // links each external page once (VAL-MKT-010).
  for (const company of COMPANIES) {
    test(`#company-${company.id} opens ${company.name}'s details (VAL-B2-MAP-001, VAL-MKT-010)`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(`${BASE}/market-map/#company-${company.id}`);

      const details = page.getByRole('dialog', { name: company.name, exact: true });
      await expect(details).toBeVisible();
      await expect(details.locator('[data-company-detail]')).toHaveAttribute(
        'data-company-detail',
        company.id,
      );
      await expect(details.getByRole('heading', { level: 2 })).toHaveText(company.name);
      const card = page.locator(`button[data-map-tile="${company.id}"]`);
      await expect(card).toHaveAttribute('aria-expanded', 'true');
      await expect(card).toHaveAttribute('aria-controls', 'market-map-company');
      await expect(page).toHaveURL(new RegExp(`/market-map/#company-${company.id}$`));

      // Resolved hrefs, so a homepage with and without its trailing slash
      // counts as one page.
      const hrefs = await details
        .locator('a[href^="http"]')
        .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
      expect(
        hrefs.filter((href, index) => hrefs.indexOf(href) !== index),
        `${company.id}: external pages linked more than once`,
      ).toEqual([]);
      for (const source of company.sources) {
        expect(
          hrefs.filter((href) => href === new URL(source.url).href),
          `${company.id}: ${source.url} linked exactly once`,
        ).toHaveLength(1);
      }
      expect(errors).toEqual([]);
    });
  }

  test('valid subSegment and approach params still hydrate from the URL', async ({
    page,
  }) => {
    await page.goto(
      `${BASE}/market-map/?subSegment=industrial-humanoids&approach=vla`,
    );

    await expect(page.locator('#filter-subsegment')).toHaveValue(
      'industrial-humanoids',
    );
    await expect(page.locator('#filter-approach')).toHaveValue('vla');
    const shown = await page.locator('button[data-map-tile]').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(111);
  });
});
