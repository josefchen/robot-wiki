import { expect, test } from '@playwright/test';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Route-flow closure for the discovery milestone
 * (brand-v2-discovery-route-flows-history-and-404):
 *
 * 1. VAL-CROSS-025 — unknown top-level and article paths serve the styled
 *    404 with the site chrome intact, a human-readable message, and a
 *    working way home; the export ships out/404.html. Verified against the
 *    static export through a host-like server (unknown paths get the
 *    themed 404 document with a 404 status), because the dev server
 *    serves not-found per request and cannot reproduce the shipped
 *    artifact's behavior.
 * 2. Browser Back/Forward restore each prior route AND move focus to the
 *    restored page's heading — the tracked defect where Back restored the
 *    URL but left activeElement on BODY at both widths (audit 2026-09).
 * 3. The chrome destinations named by the feature (market map, playground,
 *    A-Z, search entry, home wordmark) are reachable by clicking alone.
 */

const OUT = join(process.cwd(), 'out');

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the route-flows spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT, 0, {
    notFoundFallback: true,
  });
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

/**
 * Clicks must be client-side navigations for the history tests below: a
 * freshly loaded static page hydrates slightly after its load event, and an
 * immediate click falls through to a plain anchor navigation, replacing the
 * document. The Next router initializes history.state (null on the raw
 * document) during hydration, so waiting for it is a deterministic
 * hydrated signal. (A history step that loads a full document is covered
 * separately: the component also restores focus for back_forward loads.)
 */
async function gotoSettled(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.history.state !== null);
}

test.describe('browser history restores route and focus', () => {
  test('back and forward steps restore each route with heading focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoSettled(page, `${BASE}/`);
    // Real click navigation: home domain index → domain landing → article.
    // Scoped to main content: the desktop sidebar carries the same article
    // link in a persistent DOM node, and focus correctly STAYS on a link
    // that survives the history step — these flows must exercise the
    // content link that unmounts, which is where focus was lost.
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Manipulation & Learned Policies' })
      .click();
    await page.waitForURL(/\/manipulation\/$/);
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Action Chunking (ACT and ALOHA)' })
      .click();
    await page.waitForURL(/\/manipulation\/action-chunking\/$/);

    await page.goBack();
    await page.waitForURL(/\/manipulation\/$/);
    await expect(page.locator('main h1')).toBeFocused();

    await page.goBack();
    await page.waitForURL(`${BASE}/`);
    await expect(page.locator('main h1')).toBeFocused();

    await page.goForward();
    await page.waitForURL(/\/manipulation\/$/);
    await expect(page.locator('main h1')).toBeFocused();

    await page.goForward();
    await page.waitForURL(/\/manipulation\/action-chunking\/$/);
    await expect(page.locator('main h1')).toBeFocused();
  });

  test('back restores heading focus at mobile width too', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoSettled(page, `${BASE}/manipulation/`);
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Action Chunking (ACT and ALOHA)' })
      .click();
    await page.waitForURL(/\/manipulation\/action-chunking\/$/);
    await page.goBack();
    await page.waitForURL(/\/manipulation\/$/);
    await expect(page.locator('main h1')).toBeFocused();
  });

  test('back leaves focus on a sidebar link that survived the step', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoSettled(page, `${BASE}/manipulation/`);
    // The sidebar never unmounts, so the clicked link keeps focus across
    // the whole history step: nothing was lost, so nothing may be moved.
    const link = page
      .getByRole('navigation', { name: 'Robot Wiki taxonomy' })
      .getByRole('link', { name: 'Action Chunking (ACT and ALOHA)' });
    await link.click();
    await page.waitForURL(/\/manipulation\/action-chunking\/$/);
    await page.goBack();
    await page.waitForURL(/\/manipulation\/$/);
    await expect(link).toBeFocused();
    await expect(page.locator('main h1')).not.toBeFocused();
  });

  test('back from a breadcrumb jump restores the article with heading focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoSettled(page, `${BASE}/manipulation/action-chunking/`);
    // The breadcrumb trail is the wiki's own way back (Home › Domain ›
    // Article); using it and returning must land focus on the article.
    await page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: 'Home' })
      .click();
    await page.waitForURL(`${BASE}/`);
    await page.goBack();
    await page.waitForURL(/\/manipulation\/action-chunking\/$/);
    await expect(page.locator('main h1')).toBeFocused();
  });

  test('a full-document Back load also lands focus on the heading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Two direct document loads create cross-document history entries, so
    // the Back step reloads the document rather than restoring it in place.
    await page.goto(`${BASE}/manipulation/`, { waitUntil: 'load' });
    await page.goto(`${BASE}/playground/`, { waitUntil: 'load' });
    await page.goBack();
    await page.waitForURL(/\/manipulation\/$/);
    await expect(page.locator('main h1')).toBeFocused();
  });
});

test.describe('unknown routes render the styled 404 (VAL-CROSS-025)', () => {
  test('unknown article path: 404 status, themed page, intact chrome, way home', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(`${BASE}/manipulation/no-such-module/`, {
      waitUntil: 'load',
    });
    expect(response?.status()).toBe(404);
    await page.waitForURL(/\/404\/$/);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to the wiki home' }),
    ).toBeVisible();
    // Standard site chrome intact: the taxonomy sidebar is still there.
    await expect(
      page.getByRole('navigation', { name: 'Robot Wiki taxonomy' }),
    ).toBeVisible();
    // The way home works by clicking.
    await page.getByRole('link', { name: 'Back to the wiki home' }).click();
    await page.waitForURL(`${BASE}/`);
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('unknown top-level path: 404 status, themed page, mobile chrome', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto(`${BASE}/no-such-top-level-path/`, {
      waitUntil: 'load',
    });
    expect(response?.status()).toBe(404);
    await page.waitForURL(/\/404\/$/);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    // Mobile chrome intact: the header and its wordmark link are there.
    await expect(page.locator('header').first()).toBeVisible();
    await expect(
      page.locator('header').getByRole('link', { name: 'Robot Wiki' }),
    ).toBeVisible();
    // And the header wordmark is a working way home.
    await page.locator('header').getByRole('link', { name: 'Robot Wiki' }).click();
    await page.waitForURL(`${BASE}/`);
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('the static export ships out/404.html', () => {
    const file = join(OUT, '404.html');
    expect(existsSync(file), 'out/404.html exists').toBe(true);
    expect(statSync(file).size, 'out/404.html is non-empty').toBeGreaterThan(
      0,
    );
  });
});

test.describe('chrome destinations are reachable by clicking alone', () => {
  test('market map, playground, A-Z, search and home through real clicks', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    const taxonomy = page.getByRole('navigation', {
      name: 'Robot Wiki taxonomy',
    });

    await taxonomy.getByRole('link', { name: 'Market Map' }).click();
    await page.waitForURL(/\/market-map\/$/);
    await expect(page.locator('main')).toBeVisible();
    await expect(
      taxonomy.getByRole('link', { name: 'Market Map' }),
    ).toHaveAttribute('aria-current', 'page');

    await taxonomy.getByRole('link', { name: 'Playground' }).click();
    await page.waitForURL(/\/playground\/$/);
    await expect(page.locator('main')).toBeVisible();

    await taxonomy.getByRole('link', { name: 'A-Z Index' }).click();
    await page.waitForURL(/\/a-z\/$/);
    await expect(page.locator('main h1')).toBeVisible();

    // The sidebar search entry point routes to /search with the query.
    await page.locator('#sidebar-search-input').fill('ALOHA');
    await page.locator('#sidebar-search-input').press('Enter');
    await page.waitForURL(/\/search\/?\?q=ALOHA/);
    await expect(page.locator('main')).toBeVisible();

    // The sidebar wordmark is the way home.
    await page
      .locator('#sidebar-rail')
      .getByRole('link', { name: 'Robot Wiki' })
      .click();
    await page.waitForURL(`${BASE}/`);
    await expect(page.locator('main h1')).toBeVisible();
  });
});
