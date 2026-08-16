import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Hover, focus, and roving-keyboard affordances on the bubble view, proven
 * in a real browser (jsdom has no layout, no hit-testing, no computed
 * focus-visible styles). VAL-MKT-023 stays green: selection semantics are
 * regression-checked alongside the new affordances.
 */

const ROUTE = '/market-map/';

function marks(page: Page): Locator {
  return page.locator('circle[data-company-id]');
}

function mark(page: Page, id: string): Locator {
  return page.locator(`circle[data-company-id="${id}"]`);
}

function label(page: Page): Locator {
  return page.locator('[data-bubble-label]');
}

async function openBubble(page: Page) {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: 'Bubble' }).click();
  await expect(
    page.getByRole('group', { name: /bubble chart/i }),
  ).toBeVisible();
}

test.describe('bubble view hover/focus affordances', () => {
  test('hover reveals the company name and plotted value without a click', async ({
    page,
  }) => {
    await openBubble(page);
    await mark(page, 'figure-ai').hover();
    await expect(label(page)).toBeVisible();
    await expect(label(page)).toContainText('Figure AI');
    await expect(label(page)).toContainText('$39B');
    // Hovering away clears it: only one label exists at a time.
    await page.mouse.move(8, 8);
    await expect(label(page)).toHaveCount(0);
  });

  test('keyboard focus reveals the same label as hover', async ({ page }) => {
    await openBubble(page);
    // The marks are one tab stop (roving tabindex). Reach it from the top
    // of the page: skip link -> shell controls -> the chart.
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() =>
        document.activeElement?.matches('circle[data-company-id]'),
      );
      if (active) break;
    }
    await expect(marks(page).first()).toBeFocused();
    const activeId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(activeId).toBeTruthy();
    const name = await mark(page, activeId as string).getAttribute(
      'aria-label',
    );
    const companyName = name?.split(', founded')[0];
    await expect(label(page)).toBeVisible();
    await expect(label(page)).toContainText(companyName as string);
    // Focus parity: blurring clears the label exactly like hover-out.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect(label(page)).toHaveCount(0);
  });

  test('the focus ring is visibly painted (computed-style proof)', async ({
    page,
  }) => {
    await openBubble(page);
    await mark(page, 'figure-ai').focus();
    const ring = page.locator('circle[data-focus-ring]');
    await expect(ring).toHaveCount(1);
    await expect(ring).toBeVisible();
    await expect(ring).toHaveCSS('stroke', 'rgb(245, 166, 35)');
    const r = parseFloat((await ring.getAttribute('r')) ?? '0');
    expect(r).toBeGreaterThan(6);
    // The ring renders outside the clip group, so it is never cut at the
    // plot's top/bottom edges. Focus the extreme-top mark on the full
    // dataset (measured: saronic-defense cy=33.3; the painted ring top
    // is cy - r - halfStroke = 23.8, above the clip rect's top edge
    // y=24) and prove both facts: structural (no clip-path ancestor) and
    // numeric (the painted edge extends past where the clip would cut).
    await mark(page, 'saronic-defense').focus();
    const ringFacts = await page.evaluate(() => {
      const ring = document.querySelector('circle[data-focus-ring]');
      if (!ring) return { insideClip: true, paintedTop: Infinity };
      return {
        insideClip: ring.closest('g[clip-path]') !== null,
        paintedTop:
          parseFloat(ring.getAttribute('cy') ?? '0') -
          parseFloat(ring.getAttribute('r') ?? '0') -
          parseFloat(ring.getAttribute('stroke-width') ?? '0') / 2,
      };
    });
    expect(ringFacts.insideClip).toBe(false);
    expect(ringFacts.paintedTop).toBeLessThan(24);
    // The ring clears when focus leaves the mark.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect(ring).toHaveCount(0);
  });

  test('arrow keys move between marks spatially (single tab stop)', async ({
    page,
  }) => {
    await openBubble(page);
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() =>
        document.activeElement?.matches('circle[data-company-id]'),
      );
      if (active) break;
    }
    const firstId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(firstId).toBeTruthy();

    await page.keyboard.press('ArrowRight');
    const secondId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
    // The label follows the roving focus.
    await expect(label(page)).toBeVisible();

    // Left of the second mark: the move is spatial (nearest mark with a
    // smaller cx), so assert geometry rather than assuming a round trip.
    await page.keyboard.press('ArrowLeft');
    const backId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(backId).toBeTruthy();
    expect(backId).not.toBe(secondId);
    const cxs = await page.evaluate(
      (ids: string[]) =>
        ids.map((id) =>
          parseFloat(
            document
              .querySelector(`circle[data-company-id="${id}"]`)
              ?.getAttribute('cx') ?? '0',
          ),
        ),
      [secondId as string, backId as string],
    );
    expect(cxs[1]).toBeLessThanOrEqual(cxs[0]);

    // Roving: the chart contributes exactly one tab stop.
    const tabbables = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('circle[data-company-id][tabindex="0"]'),
      ).length,
    );
    expect(tabbables).toBe(1);
  });

  test('the roving tab stop keeps the last-focused mark after blur', async ({
    page,
  }) => {
    await openBubble(page);
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() =>
        document.activeElement?.matches('circle[data-company-id]'),
      );
      if (active) break;
    }
    await page.keyboard.press('ArrowRight');
    const movedId = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(movedId).toBeTruthy();
    // Blur the chart entirely (focus leaves for the page shell). WAI-ARIA
    // roving tabindex keeps the stop on the last-focused item, so Tab
    // returns to the same mark instead of resetting to the first.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect(label(page)).toHaveCount(0);
    const stop = await page.evaluate(
      () =>
        document
          .querySelector('circle[data-company-id][tabindex="0"]')
          ?.getAttribute('data-company-id'),
    );
    expect(stop).toBe(movedId);
    // And Tab re-enters the chart on that same mark.
    await page.keyboard.press('Tab');
    const reentered = await page.evaluate(
      () => document.activeElement?.getAttribute('data-company-id'),
    );
    expect(reentered).toBe(movedId);
  });

  test('Enter and Space still select and reveal the detail panel', async ({
    page,
  }) => {
    await openBubble(page);
    const figure = mark(page, 'figure-ai');
    await figure.focus();
    await figure.press('Enter');
    await expect(page.locator('[data-bubble-detail]')).toContainText('Figure AI');
    await expect(page.locator('[data-bubble-detail]')).toContainText('$39B');
    await figure.press('Enter');
    await expect(page.locator('[data-bubble-detail]')).toHaveCount(0);

    const pi = mark(page, 'physical-intelligence');
    await pi.focus();
    await pi.press(' ');
    await expect(page.locator('[data-bubble-detail]')).toContainText(
      'Physical Intelligence',
    );
  });

  test('deep link highlights the hashed mark in bubble view', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // country=CN excludes Figure AI (US); the deep link relaxes the
    // filter and the bubble mark carries the highlight treatment.
    await page.goto(`${ROUTE}?view=bubble&country=CN#company-figure-ai`);
    const figure = mark(page, 'figure-ai');
    await expect(figure).toBeVisible();
    await expect(figure).toHaveCSS('fill', 'rgb(245, 166, 35)');
    await expect(figure).toHaveAttribute('r', '6');
    // Selection state falls out naturally: the detail panel shows the
    // hashed company.
    await expect(page.locator('[data-bubble-detail]')).toContainText('Figure AI');
    // The filter was relaxed so the mark is plotted at all.
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('deep link highlights the hashed row in timeline view', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}?view=timeline&country=CN#company-figure-ai`);
    const row = page.locator('[data-company-id="figure-ai"][data-timeline-id]');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveCSS('box-shadow', /inset/);
    await expect(page.getByText('112 of 112 companies')).toBeVisible();
  });

  test('no axe violations on the bubble view with focus inside the chart', async ({
    page,
  }) => {
    await openBubble(page);
    await mark(page, 'figure-ai').hover();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
