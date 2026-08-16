import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Deep-link robustness on the shipped artifact: filter params the dataset
 * does not know are dropped rather than applied, and a #company-<id> hash
 * whose filters exclude the named company relaxes those filters so the
 * card is visible, highlighted, and scrolled into view. jsdom cannot prove
 * any of this: it has no layout, so only a real browser can show the card
 * landed in the viewport.
 */

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
    await page.goto(
      `${BASE}/market-map/?country=CN&status=ipo#company-figure-ai`,
    );

    const card = page.locator('article[data-company-id="figure-ai"]');
    await expect(card).toBeVisible();
    // Highlighted: the inset accent edge only renders on the hashed card.
    await expect(card).toHaveCSS('box-shadow', /inset/);
    // The scroll actually landed (what jsdom cannot prove).
    await expect(card).toBeInViewport({ ratio: 0.5 });
    // Filters relaxed to the defaults; the explicit hash request survives.
    await expect(page).toHaveURL(/\/market-map\/#company-figure-ai$/);
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a hash keeps the filters the company passes and drops only the rest', async ({
    page,
  }) => {
    // Figure AI is a humanoid (segment passes) but US (country fails).
    await page.goto(
      `${BASE}/market-map/?segment=humanoids&country=CN#company-figure-ai`,
    );

    const card = page.locator('article[data-company-id="figure-ai"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS('box-shadow', /inset/);
    await expect(card).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
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

    await expect(page.getByText('22 of 112 companies')).toBeVisible();
    expect(await page.locator('article[data-company-id]').count()).toBe(22);
    await expect(page.locator('#company-ghost')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a bubble-view hash naming an unplotted company selects nothing', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // Covariant exists in the dataset but has no disclosed valuation or
    // total raised, so the bubble view never plots it. The deep link must
    // not leave an inert selection: no mark, no detail panel, no
    // data-bubble-selected state, and the roving fallback keeps exactly
    // one tab stop so the chart stays keyboard-reachable.
    await page.goto(`${BASE}/market-map/?view=bubble#company-covariant`);

    const chart = page.getByRole('group', { name: /bubble chart/i });
    await expect(chart).toBeVisible();
    await expect(
      page.locator('circle[data-company-id="covariant"]'),
    ).toHaveCount(0);
    await expect(page.locator('[data-bubble-detail]')).toHaveCount(0);
    // The chart exposes its selection state as data-bubble-selected: the
    // attribute is absent when nothing is selected (the honest state).
    expect(await chart.getAttribute('data-bubble-selected')).toBeNull();
    const tabbables = await page.evaluate(
      () =>
        document.querySelectorAll('circle[data-company-id][tabindex="0"]')
          .length,
    );
    expect(tabbables).toBe(1);
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('unknown subSegment/country/approach params are dropped, valid siblings apply', async ({
    page,
  }) => {
    await page.goto(
      `${BASE}/market-map/?subSegment=bogus-subsegment&country=US&approach=not-an-approach`,
    );

    await expect(page.getByText('63 of 112 companies')).toBeVisible();
    expect(await page.locator('article[data-company-id]').count()).toBe(63);
    await expect(page.locator('#filter-subsegment')).toHaveValue('');
    await expect(page.locator('#filter-approach')).toHaveValue('');
    await expect(page.locator('#filter-country')).toHaveValue('US');
  });

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
    const shown = await page.locator('article[data-company-id]').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(112);
  });
});
