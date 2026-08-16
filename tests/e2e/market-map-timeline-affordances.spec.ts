import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Roving-tabindex keyboard affordances on the funding timeline (tab-stop
 * parity with the bubble view, addressed after misc-hardening-3 flagged
 * the timeline's one-tabbable-button-per-row shape). The rows form one
 * tab stop; ArrowUp/ArrowDown move chronologically in visual order.
 * jsdom cannot prove focus order or native activation, so the whole
 * contract is pinned here in a real browser, alongside the deep-link
 * anchor scroll that must keep working (a074903).
 */

const ROUTE = '/market-map/';

function rowButtons(page: Page): Locator {
  return page.locator('[data-timeline-id] > button');
}

async function openTimeline(page: Page) {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: 'Timeline' }).click();
  await expect(rowButtons(page).first()).toBeVisible();
}

/** Tab from the top of the page until the timeline takes focus. */
async function tabIntoTimeline(page: Page): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() =>
      document.activeElement?.matches('[data-timeline-id] > button'),
    );
    if (active) return;
  }
  throw new Error('Tab never reached the timeline rows');
}

function focusedRowId(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document.activeElement?.closest('[data-timeline-id]')?.getAttribute(
        'data-timeline-id',
      ) ?? null,
  );
}

test.describe('timeline view roving keyboard affordances', () => {
  test('is a single tab stop with ArrowUp/ArrowDown movement', async ({
    page,
  }) => {
    await openTimeline(page);
    // 66 events render; exactly one row is tabbable, the rest are -1.
    await expect(rowButtons(page)).toHaveCount(66);
    const tabbables = await page.evaluate(
      () =>
        document.querySelectorAll('[data-timeline-id] > button[tabindex="0"]')
          .length,
    );
    expect(tabbables).toBe(1);

    await tabIntoTimeline(page);
    const firstId = await focusedRowId(page);
    expect(firstId).toBeTruthy();

    // Down moves to the next row in visual (chronological) order.
    await page.keyboard.press('ArrowDown');
    const secondId = await focusedRowId(page);
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);

    // Up goes back to where we came from.
    await page.keyboard.press('ArrowUp');
    expect(await focusedRowId(page)).toBe(firstId);

    // Roving: still exactly one tab stop after the moves.
    const stillOne = await page.evaluate(
      () =>
        document.querySelectorAll('[data-timeline-id] > button[tabindex="0"]')
          .length,
    );
    expect(stillOne).toBe(1);
  });

  test('arrow movement follows the chronological render order', async ({
    page,
  }) => {
    await openTimeline(page);
    // Drive from the first row; the next row down must be the second
    // rendered row (date order, the order the reader sees).
    const first = rowButtons(page).first();
    await first.focus();
    const ids = await rowButtons(page).evaluateAll((buttons) =>
      buttons
        .slice(0, 3)
        .map(
          (button) =>
            button.closest('[data-timeline-id]')?.getAttribute('data-timeline-id'),
        ),
    );
    expect(ids[0]).toBeTruthy();

    await page.keyboard.press('ArrowDown');
    expect(await focusedRowId(page)).toBe(ids[1]);
    await page.keyboard.press('ArrowDown');
    expect(await focusedRowId(page)).toBe(ids[2]);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focusedRowId(page)).toBe(ids[0]);
  });

  test('wraps at both ends of the list', async ({ page }) => {
    await openTimeline(page);
    // Buttons carry no data-timeline-id themselves; read from the li.
    const first = rowButtons(page).first();
    const last = rowButtons(page).last();
    const firstLi = await first
      .locator('..')
      .getAttribute('data-timeline-id');
    const lastLi = await last.locator('..').getAttribute('data-timeline-id');
    expect(firstLi).toBeTruthy();
    expect(lastLi).toBeTruthy();

    await first.focus();
    await page.keyboard.press('ArrowUp');
    expect(await focusedRowId(page)).toBe(lastLi);
    await page.keyboard.press('ArrowDown');
    expect(await focusedRowId(page)).toBe(firstLi);

    await last.focus();
    await page.keyboard.press('ArrowDown');
    expect(await focusedRowId(page)).toBe(firstLi);
  });

  test('keeps the roving stop on the last-focused row after blur', async ({
    page,
  }) => {
    await openTimeline(page);
    await tabIntoTimeline(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const movedId = await focusedRowId(page);
    expect(movedId).toBeTruthy();
    // Blur the timeline entirely (focus leaves for the page shell).
    // WAI-ARIA roving tabindex keeps the stop on the last-focused item.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    const stop = await page.evaluate(
      () =>
        document
          .querySelector('[data-timeline-id] > button[tabindex="0"]')
          ?.closest('[data-timeline-id]')
          ?.getAttribute('data-timeline-id'),
    );
    expect(stop).toBe(movedId);
    // Tab re-enters the list on the same row.
    await tabIntoTimeline(page);
    expect(await focusedRowId(page)).toBe(movedId);
  });

  test('Enter activates the focused row and Space toggles it closed', async ({
    page,
  }) => {
    await openTimeline(page);
    const figure = page.locator('[data-company-id="figure-ai"] > button');
    await figure.focus();
    await page.keyboard.press('Enter');
    const detail = page.locator('[data-timeline-detail]');
    await expect(detail).toHaveCount(1);
    await expect(detail).toContainText('$39B');
    await page.keyboard.press('Enter');
    await expect(detail).toHaveCount(0);

    const pi = page.locator(
      '[data-company-id="physical-intelligence"] > button',
    );
    await pi.focus();
    await pi.press(' ');
    await expect(page.locator('[data-timeline-detail]')).toHaveCount(1);
    await expect(
      page.locator('[data-timeline-detail]'),
    ).toContainText('$5.6B');
  });

  test('deep link still scrolls to and highlights the hashed row', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // country=CN excludes Figure AI (US); the deep link relaxes the
    // filter, the row renders, and the anchor scroll still lands.
    await page.goto(`${ROUTE}?view=timeline&country=CN#company-figure-ai`);
    const row = page.locator('[data-company-id="figure-ai"][data-timeline-id]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveCSS('box-shadow', /inset/);
    // The scroll actually landed (the a074903 contract).
    await expect(
      row.locator('button'),
    ).toBeInViewport({ ratio: 0.5 });
    // The hash entry point owns the roving stop.
    await expect(
      page.locator('[data-company-id="figure-ai"] > button'),
    ).toHaveAttribute('tabindex', '0');
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a filtered timeline keeps the roving contract (35 humanoids)', async ({
    page,
  }) => {
    await openTimeline(page);
    await page.locator('#filter-segment').selectOption('humanoids');
    await expect(page.getByText('35 of 112 companies')).toBeVisible();
    const rows = rowButtons(page);
    expect(await rows.count()).toBeGreaterThan(1);
    const tabbables = await page.evaluate(
      () =>
        document.querySelectorAll('[data-timeline-id] > button[tabindex="0"]')
          .length,
    );
    expect(tabbables).toBe(1);
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    const moved = await focusedRowId(page);
    const firstId = await rows
      .first()
      .locator('..')
      .getAttribute('data-timeline-id');
    expect(moved).toBeTruthy();
    expect(moved).not.toBe(firstId);
  });

  test('no axe violations on the timeline with focus inside the list', async ({
    page,
  }) => {
    await openTimeline(page);
    await rowButtons(page).first().focus();
    await page.keyboard.press('ArrowDown');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
