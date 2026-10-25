import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectConsole } from './helpers/console';
import { forEachInOwnContext } from './helpers/per-route-context';
import { waitForHydration } from './interaction-ready';

/**
 * The prediction step's reveal hydrates without a mismatch (components/
 * article/commit-to-reveal.tsx). Its disclosure and radios are native
 * controls in the served HTML, so a reader can open the reasoning or pick
 * an option before script arrives. The dev server used to log a hydration
 * mismatch for the open attribute that leaves on the disclosure, and a pick
 * made that early stayed checked with its reasoning shut. Each route that
 * mounts a prediction step is checked on a settled load, with every
 * disclosure opened before hydration, and with an option picked in every
 * region before hydration.
 */

const NAMED_ROUTES = [
  '/classical/control/',
  '/data-hardware/data-bottleneck/',
  '/data-hardware/evaluation-crisis/',
  '/frontier/generalization/',
  '/manipulation/bc-foundations/',
];

/** Every route whose article authors a PredictThenReveal. */
function predictRoutes(): string[] {
  const root = join(process.cwd(), 'content');
  const routes: string[] = [];
  for (const domain of readdirSync(root, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    for (const file of readdirSync(join(root, domain.name))) {
      if (!file.endsWith('.mdx')) continue;
      if (readFileSync(join(root, domain.name, file), 'utf8').includes('<PredictThenReveal')) {
        routes.push(`/${domain.name}/${file.replace(/\.mdx$/, '')}/`);
      }
    }
  }
  return routes.sort();
}

const ROUTES = predictRoutes();
const REGIONS = '[data-predict], [data-self-check]';
const SCRIPT_CHUNK = /\/_next\/static\/chunks\/.*\.js(\?.*)?$/;

test('the population is every route that mounts a prediction step', () => {
  expect(ROUTES).toEqual(expect.arrayContaining(NAMED_ROUTES));
});

const hydrated = (locator: Locator) =>
  locator.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactFiber$')));

/** Load the route with its script chunks held back, act on the served HTML, then let it hydrate. */
async function actBeforeHydration(page: Page, route: string, act: (regions: Locator, count: number) => Promise<void>) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(SCRIPT_CHUNK, async (request) => {
    await held;
    await request.continue();
  });
  await page.goto(route, { waitUntil: 'commit' });
  const regions = page.locator(REGIONS);
  await expect(regions.locator('details[data-reveal] > summary').first()).toBeVisible({ timeout: 60_000 });
  const count = await regions.count();
  expect(count, `${route}: commit regions in the served HTML`).toBeGreaterThan(0);
  await expect(page.locator('[data-predict]').first()).toBeAttached();
  await act(regions, count);
  for (let i = 0; i < count; i++) {
    expect(await hydrated(regions.nth(i).locator('details[data-reveal]')), `${route} #${i}: acted after hydration`).toBe(false);
  }
  release();
  for (let i = 0; i < count; i++) await waitForHydration(regions.nth(i).locator('details[data-reveal] > summary'));
  await page.waitForLoadState('networkidle');
}

test.describe('commit-to-reveal hydration on every prediction-step route', () => {
  test('a settled load logs no console error and leaves every reveal closed', async ({ browser }) => {
    test.slow();
    await forEachInOwnContext(browser, ROUTES, async (page, route) => {
      const log = collectConsole(page);
      await page.goto(route);
      const regions = page.locator(REGIONS);
      const count = await regions.count();
      expect(count, `${route}: commit regions`).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) await waitForHydration(regions.nth(i).locator('details[data-reveal] > summary'));
      await page.waitForLoadState('networkidle');
      for (let i = 0; i < count; i++) {
        await expect(regions.nth(i).locator('details[data-reveal]'), `${route} #${i}`).not.toHaveAttribute('open');
      }
      expect(log.errors, `${route}: console errors`).toEqual([]);
    });
  });

  test('a reveal opened before hydration stays open, unpicked, with no mismatch', async ({ browser }) => {
    test.slow();
    await forEachInOwnContext(browser, ROUTES, async (page, route) => {
      const log = collectConsole(page);
      await actBeforeHydration(page, route, async (regions, count) => {
        for (let i = 0; i < count; i++) await regions.nth(i).locator('details[data-reveal] > summary').click();
      });
      const regions = page.locator(REGIONS);
      const count = await regions.count();
      for (let i = 0; i < count; i++) {
        const region = regions.nth(i);
        const where = `${route} #${i}`;
        await expect(region.locator('details[data-reveal]'), where).toHaveAttribute('open', '');
        await expect(region.locator('details[data-reveal] > summary'), where).toHaveText('Read the reasoning');
        await expect(region.locator('[data-reason][data-selected]'), where).toHaveCount(0);
        await expect(region.locator('[data-pick-marker]'), where).toHaveCount(0);
        await expect(region.locator('input[type="radio"]:checked'), where).toHaveCount(0);
      }
      expect(log.errors, `${route}: console errors`).toEqual([]);
    });
  });

  test('an option picked before hydration is adopted and revealed, with no mismatch', async ({ browser }) => {
    test.slow();
    await forEachInOwnContext(browser, ROUTES, async (page, route) => {
      const log = collectConsole(page);
      const picks: string[] = [];
      await actBeforeHydration(page, route, async (regions, count) => {
        for (let i = 0; i < count; i++) {
          const radio = regions.nth(i).locator('fieldset input[type="radio"]').nth(1);
          await radio.check();
          picks.push((await radio.getAttribute('value'))!);
        }
      });
      const regions = page.locator(REGIONS);
      const count = await regions.count();
      expect(picks).toHaveLength(count);
      for (let i = 0; i < count; i++) {
        const region = regions.nth(i);
        const where = `${route} #${i}`;
        await expect(region.locator('details[data-reveal]'), where).toHaveAttribute('open', '');
        await expect(region.locator('details[data-reveal] > summary'), where).toHaveText('Reasoning');
        await expect(region.locator('fieldset input[type="radio"]').nth(1), where).toBeChecked();
        await expect(region.locator('label[data-chosen="true"]'), where).toHaveCount(1);
        await expect(region.locator('[data-reason][data-selected="true"]'), where).toHaveAttribute('data-reason', picks[i]);
        await expect(region.locator(`[data-reason="${picks[i]}"] [data-pick-marker]`), where).toHaveText('your pick');
      }
      expect(log.errors, `${route}: console errors`).toEqual([]);
    });
  });
});
