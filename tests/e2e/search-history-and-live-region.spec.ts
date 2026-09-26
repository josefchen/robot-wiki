import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Review-fix coverage for the history-focus helper and the search live
 * region (VAL-NAV-028, VAL-NAV-029, VAL-SEARCH-027).
 *
 * Runs against the shipped export, because these are SPA-history behaviors
 * of the built client bundle, not dev-server behavior:
 * - Back between two /search?q= entries (the shell search box pushes one
 *   entry per submit) is a query-only history step: the pathname never
 *   changes, so focus restoration has to key on path plus query.
 * - A hash-only Back on the first page must not arm a heading move that a
 *   later click fires, and a click after a query-only Back must never
 *   land focus on a page heading the reader did not navigate to by
 *   keyboard.
 * - The polite live region must name the active type filter when the
 *   module index has failed and the filter is hiding real structured
 *   hits, never a total miss (fixture: the Pagefind loader is answered
 *   with a 503).
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  if (!existsSync(outDir)) {
    throw new Error('Static export missing: run npm run build first.');
  }
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

/** A short description of document.activeElement for focus assertions. */
async function focusState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'BODY';
    if (el === document.querySelector('main h1')) return 'H1';
    if (el.tagName === 'A') {
      const text = (el.textContent ?? '').trim().slice(0, 40);
      return `A(${text})`;
    }
    if (el instanceof HTMLInputElement) return `INPUT(${el.id || el.name})`;
    return el.tagName.toLowerCase();
  });
}

/** Submit a query through the persistent shell search box (a router push). */
async function submitShellQuery(page: Page, query: string) {
  const box = page.locator('#sidebar-search-input');
  await expect(box).toBeVisible();
  await box.fill(query);
  await box.press('Enter');
}

/** Wait until the search page's polite region stops saying "Searching". */
async function settleSearch(page: Page) {
  await expect
    .poll(
      async () =>
        (await page.getByRole('status').first().textContent()) ?? '',
      { timeout: 15_000 },
    )
    .not.toContain('Searching');
}

test.describe('history focus across search queries', () => {
  test('Back between two /search?q= entries restores heading focus', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await submitShellQuery(page, 'aloha');
    await expect(page).toHaveURL(/\/search\/\?q=aloha$/);
    await settleSearch(page);
    await submitShellQuery(page, 'chunk');
    await expect(page).toHaveURL(/\/search\/\?q=chunk$/);
    await settleSearch(page);

    // The reader's focus is not held by any control that survived the
    // step (the observed defect lands focus on BODY in exactly this
    // state), so it is parked on the body the way a reader mid-results
    // has it.
    await page.evaluate(() => {
      const el = document.activeElement;
      if (el && el !== document.body) (el as HTMLElement).blur();
    });
    expect(await focusState(page)).toBe('BODY');

    await page.goBack();
    await expect(page).toHaveURL(/\/search\/\?q=aloha$/);
    // VAL-NAV-028: the heading (or a still-mounted result) receives
    // focus; BODY is the failure.
    await expect
      .poll(() => focusState(page), { timeout: 5_000 })
      .not.toBe('BODY');
  });

  test('a hash-only Back on the first page does not arm a heading steal', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    // An in-page fragment jump pushes a history entry the router never
    // pushed itself, then Back restores the entry the document loaded on.
    await page.evaluate(() => {
      window.location.hash = 'hero';
    });
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // A click navigation inside the two-second window: focus belongs to
    // the clicked link (or body), never the destination page's heading.
    await page.getByRole('link', { name: 'Market Map' }).first().click();
    await expect(page).toHaveURL(/\/market-map\/$/);
    expect(await focusState(page)).not.toBe('H1');
  });

  test('a click right after a query-only Back never lands focus on the heading', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await submitShellQuery(page, 'aloha');
    await expect(page).toHaveURL(/\/search\/\?q=aloha$/);
    await settleSearch(page);
    await submitShellQuery(page, 'chunk');
    await expect(page).toHaveURL(/\/search\/\?q=chunk$/);
    await settleSearch(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\/\?q=aloha$/);
    await settleSearch(page);

    // Click a shell link immediately: whatever the click focused, the
    // armed query-only step must not fire at the new page's heading.
    await page.getByRole('link', { name: 'Market Map' }).first().click();
    await expect(page).toHaveURL(/\/market-map\/$/);
    expect(await focusState(page)).not.toBe('H1');
  });
});

test.describe('VAL-SEARCH-027: facet narrowing announced before index failure', () => {
  test('names the active filter while the module index is unavailable', async ({
    page,
  }) => {
    // The module (Pagefind) index cannot load; the structured index is
    // intact and holds real hits the facet is about to hide.
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'text/javascript',
        body: 'search index unavailable',
      }),
    );
    await page.goto(`${BASE}/search`);
    const input = page.getByRole('searchbox', { name: 'Search the wiki' });
    await input.fill('figure');
    await settleSearch(page);
    // A real structured hit exists unfiltered.
    await expect(page.getByRole('region', { name: 'Structured' })).toContainText(
      'Figure AI',
    );

    await page.getByRole('button', { name: 'Methods', exact: true }).click();
    const status = page.getByRole('status').first();
    await expect(status).toContainText('under the active type filter');
    await expect(status).toContainText('module index is unavailable');
    // The total-miss verdict must not be announced while unfiltered
    // entity matches exist behind the facet.
    await expect(status).not.toContainText('entity matches');
    // What the reader hears agrees with the visible recovery copy.
    await expect(
      page.getByRole('button', { name: /clear the type filter/i }),
    ).toBeVisible();
  });
});
