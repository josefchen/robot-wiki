import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * The structured-search facet bar during a query transition. The previous
 * query's rows deliberately stay on screen until the new results land
 * atomically, so the facet bar must not present them as current: while a
 * new query is resolving it is inert and visibly pending (dimmed, never a
 * spinner), and once the new results are on screen it works again and the
 * settled counts match what is rendered.
 *
 * The searching window is pinned deterministically with the Playwright
 * clock: paused, the 200ms debounce can never fire, so the page cannot
 * leave the searching state no matter how slow the machine is.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'search-index.json')),
    'out/search-index.json is missing: run `npm run build` before the search-facet-pending spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

/**
 * The fake clock is installed at a FIXED epoch, never at Date.now(), so
 * every later clock operation is relative to a constant both sides agree
 * on. This removes the full-suite race at its root (history: 41793aa
 * replaced a Node-wall-clock pauseAt target with a target read from the
 * page, which narrowed the window but left a race, because between the
 * read and the pauseAt the loaded machine's clock controller can
 * fast-forward fake time past the target, and pauseAt then throws
 * "Cannot fast-forward to the past"; observed in full runs 795/1 and
 * never standalone). The pause target below is the fixed epoch plus a
 * margin far larger than any fake time the first phase can accumulate:
 * fake time only advances while the clock runs, the phase's own timers
 * are a 200ms debounce plus search settling, and PAUSE_MARGIN_MS is ten
 * minutes. There is nothing left to read, so there is nothing left to
 * race.
 */
const CLOCK_EPOCH = Date.parse('2024-12-10T08:00:00');
const PAUSE_MARGIN_MS = 10 * 60 * 1000;

async function waitForSettled(page: Page) {
  await expect(page.getByRole('status').first()).not.toHaveText(/searching/i, {
    timeout: 15_000,
  });
}

test.describe('structured facet bar during search transitions', () => {
  test('facet bar is inert and dimmed while resolving, enabled once results land', async ({
    page,
  }) => {
    await page.clock.install({ time: CLOCK_EPOCH });
    await page.goto(`${BASE}/search`);

    const box = page.getByRole('searchbox', { name: 'Search the wiki' });
    await box.pressSequentially('open', { delay: 15 });
    await waitForSettled(page);

    const bar = page.getByRole('group', { name: 'Filter by type' });
    await expect(bar).toBeVisible();
    const companies = bar.getByRole('button', { name: /^Companies$/i });
    await expect(companies).toBeEnabled();

    // Freeze time and keep typing: the debounce keeps resetting and can
    // never fire, so the page is pinned in the searching state with the
    // previous query's rows still on screen. The target is a constant
    // offset from the fixed install epoch (see CLOCK_EPOCH above), so it
    // is always strictly in the fake clock's future.
    await page.clock.pauseAt(new Date(CLOCK_EPOCH + PAUSE_MARGIN_MS));
    await box.pressSequentially('source', { delay: 15 });

    await expect(page.getByRole('status').first()).toHaveText(/Searching for/);
    await expect(bar).toBeVisible();
    await expect(
      bar.getByRole('button', { name: /^All types$/i }),
    ).toBeDisabled();
    await expect(companies).toBeDisabled();
    // Visibly pending: dimmed, not spinning.
    await expect(bar).toHaveCSS('opacity', '0.6');
    await expect(page.locator('.animate-spin')).toHaveCount(0);

    await page.clock.resume();
    await waitForSettled(page);
  });

  test('once new results are on screen, the facet bar works and counts match the rows', async ({
    page,
  }) => {
    await page.goto(`${BASE}/search`);
    const box = page.getByRole('searchbox', { name: 'Search the wiki' });
    await box.pressSequentially('Figure AI', { delay: 15 });
    await waitForSettled(page);

    const structured = page.getByRole('region', { name: 'Structured' });
    const bar = structured.getByRole('group', { name: 'Filter by type' });
    const companies = bar.getByRole('button', { name: /^Companies$/i });
    await expect(companies).toBeEnabled();

    // Settled counts describe exactly what is on screen.
    const rows = structured.locator('[data-search-result]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    const countText = await structured
      .getByText(/^\d+ results?$/)
      .textContent();
    expect(Number(countText?.split(' ')[0])).toBe(rowCount);

    // Faceting still narrows the current (not a previous) result set.
    await companies.click();
    await expect(rows.first()).toBeVisible();
    const after = await rows.count();
    expect(after).toBeLessThanOrEqual(rowCount);
    const narrowed = await structured
      .getByText(/^\d+ results?$/)
      .textContent();
    expect(Number(narrowed?.split(' ')[0])).toBe(after);
    await expect(page.locator('.animate-spin')).toHaveCount(0);
  });
});
