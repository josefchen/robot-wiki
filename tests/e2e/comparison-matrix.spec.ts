import { expect, test } from '@playwright/test';

/**
 * The manipulation comparison matrix is one of the five dense comparison
 * surfaces that must stay usable at 375px (VAL-A11Y-018): no page-level
 * horizontal scroll, the matrix itself scrolls (or reflows) within its own
 * container, and no content is clipped or overlapping. The module had no
 * dedicated e2e spec; this closes that gap alongside the per-surface checks
 * in the datasets, hardware-taxonomy, teleop-rigs, and competing-theses
 * specs.
 */

const ROUTE = '/manipulation/comparison-matrix/';

test.describe('manipulation comparison matrix', () => {
  test('renders the matrix with headers and method rows', async ({ page }) => {
    await page.goto(ROUTE);
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    const headers = await table.locator('thead th').allInnerTexts();
    expect(headers.length).toBeGreaterThanOrEqual(5);
    expect(headers.join(' ')).toContain('Method');
    // Real rows for real methods, not a skeleton.
    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(10);
  });

  test('the query filter narrows the matrix and reset restores it', async ({ page }) => {
    await page.goto(ROUTE);
    const table = page.locator('table').first();
    const before = await table.locator('tbody tr').count();
    // The count readout is aria-live, so the narrowed state is announced.
    await page.locator('#matrix-filter').fill('diffusion');
    const after = await table.locator('tbody tr').count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    await expect(page.locator('p[aria-live="polite"]')).toContainText(
      `${after} of ${before} methods`,
    );
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect
      .poll(() => table.locator('tbody tr').count())
      .toBe(before);
  });

  test('usable at 375px: no page scroll, matrix scrolls in its own container (VAL-A11Y-018)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);

    // Zero page-level horizontal scroll.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    // The matrix surface itself is the scroller: its container has
    // overflow-x auto (or the table reflowed to fit, in which case nothing
    // is clipped either way).
    const surface = page.evaluate(() => {
      const el = document.querySelector('main [class*="overflow-x-auto"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        overflowX: cs.overflowX,
        scrollsInternally: el.scrollWidth > el.clientWidth,
        contentWiderThanContainer: el.scrollWidth - el.clientWidth,
      };
    });
    expect(surface, 'a horizontally scrollable table container exists').not.toBeNull();
    const s = await surface;
    if (s!.scrollsInternally) {
      // Scrollable within its own container: the reader can reach every
      // column without moving the page.
      expect(s!.overflowX).toBe('auto');
    }

    // No clipped or overlapping header cells at this width.
    const clipped = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return 0;
      const tableRight = table.getBoundingClientRect().right;
      let count = 0;
      for (const th of table.querySelectorAll('thead th')) {
        if (th.getBoundingClientRect().right > tableRight + 1) count += 1;
      }
      return count;
    });
    expect(clipped, 'header cells rendered outside the table box').toBe(0);
    await context.close();
  });
});
