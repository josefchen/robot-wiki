import { expect, test, type Locator, type Page } from '@playwright/test';
import { COMPANIES } from '../../data/companies';

/**
 * From 1024 px the company details are a non-modal side sheet, so the map,
 * the chart and the timeline stay usable while it is open. That only holds
 * if nothing the keyboard can reach sits under the sheet (VAL-B2-MAP-006,
 * WCAG 2.4.11 Focus Not Obscured): every tile, timeline row, bubble mark and
 * filter control has to land beside it when focused. The populations are
 * derived from the rendered page and the company registry, never typed in.
 */

const ROUTE = '/market-map/';

const DESKTOPS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
] as const;

/** Ink, #1C1C1A: the focus ring and the selected tile's rule. */
const INK = 'rgb(28, 28, 26)';

type Box = { left: number; top: number; right: number; bottom: number };

function sideSheet(page: Page): Locator {
  return page.locator('[data-company-sheet="side"]');
}

/** Resolves once the element and everything inside it stop animating. */
async function settle(target: Locator) {
  await target.evaluate((el) =>
    Promise.all(
      el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => null)),
    ),
  );
}

/**
 * Selects a company with a pointer. Clicks that land before hydration do
 * nothing, so retry until the details open; an open sheet is never clicked
 * again, because a second click on the same company closes it.
 */
async function openWithPointer(page: Page, target: Locator) {
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    if ((await dialog.count()) === 0) await target.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

async function sheetBox(page: Page): Promise<Box> {
  const sheet = sideSheet(page);
  await expect(sheet).toBeVisible();
  await settle(sheet);
  return sheet.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
}

type Focused = {
  /** What the focused element is, for the failure message. */
  name: string;
  box: Box;
  /** Its box shares area with the sheet's. */
  overlaps: boolean;
  /** It lies wholly left of the sheet, so no scroll position can hide it. */
  beside: boolean;
  /** The topmost element at its centre is the element itself. */
  onTop: boolean;
  /** The topmost element at its centre belongs to the sheet. */
  underSheet: boolean;
  focusVisible: boolean;
  outline: string;
};

/**
 * The focused element against the open sheet, read once its own
 * transitions settle (transition-colors includes the outline colour).
 */
async function focusedAgainstSheet(page: Page, sheet: Box): Promise<Focused> {
  return page.evaluate(async (s) => {
    const el = document.activeElement;
    if (!el || el === document.body) throw new Error('focus is on the body');
    await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => null)));
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const name =
      el.getAttribute('data-map-tile') ??
      el.getAttribute('data-company-id') ??
      el.parentElement?.getAttribute('data-timeline-id') ??
      el.getAttribute('aria-label') ??
      (el.id || (el.textContent ?? '').trim().slice(0, 40));
    return {
      name: `${el.tagName.toLowerCase()} ${name}`,
      box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      overlaps: r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top,
      beside: r.right <= s.left,
      onTop: hit !== null && (hit === el || el.contains(hit)),
      underSheet: hit?.closest('[data-company-sheet]') != null,
      focusVisible: el.matches(':focus-visible'),
      outline: `${style.outlineStyle} ${style.outlineColor}`,
    };
  }, sheet);
}

/** Overlapping the sheet, or reaching under it, or covered at its centre. */
function hiddenBySheet(focused: Focused, { needOnTop }: { needOnTop: boolean }) {
  return (
    focused.overlaps || !focused.beside || focused.underSheet || (needOnTop && !focused.onTop)
  );
}

function describeHidden(focused: Focused) {
  const { left, top, right, bottom } = focused.box;
  return `${focused.name} at [${Math.round(left)}, ${Math.round(top)}, ${Math.round(right)}, ${Math.round(bottom)}]`;
}

async function activeAttribute(page: Page, attribute: string) {
  return page.evaluate((name) => document.activeElement?.getAttribute(name) ?? null, attribute);
}

/** Every tile's box with the page scrolled to the top, keyed by company. */
async function tileLayout(page: Page): Promise<Record<string, number[]>> {
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.locator('button[data-map-tile]').evaluateAll((tiles) =>
    Object.fromEntries(
      tiles.map((tile) => {
        const r = tile.getBoundingClientRect();
        return [
          tile.getAttribute('data-map-tile') ?? '',
          [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        ];
      }),
    ),
  );
}

/** Wholly inside the window, below the sticky site bar. */
async function inViewport(target: Locator) {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const bar =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 0;
    return r.top >= bar && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
  });
}

test.describe('the side sheet sits beside the map, never over it (VAL-B2-MAP-006)', () => {
  for (const viewport of DESKTOPS) {
    const at = `at ${viewport.width}px`;

    test(`every tile the arrow keys reach stays beside the open sheet ${at}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.goto(ROUTE);
      const tiles = page.locator('button[data-map-tile]');
      await expect(tiles).toHaveCount(COMPANIES.length);
      const ids = await tiles.evaluateAll((all) => all.map((tile) => tile.getAttribute('data-map-tile') ?? ''));

      // The last tile in reading order sits in the map's right-hand column,
      // the one the sheet used to cover.
      const opened = tiles.last();
      const openedId = ids[ids.length - 1];
      await openWithPointer(page, opened);
      await expect(page).toHaveURL(new RegExp(`#company-${openedId}$`));
      const sheet = await sheetBox(page);
      expect(sheet.right - sheet.left, at).toBeGreaterThan(0);

      // The tile that opened the details is still in view once the map has
      // made room for them, and still reads selected by its ink rule alone.
      expect(await inViewport(opened), `${openedId} in view ${at}`).toBe(true);
      await settle(opened);
      expect(
        await opened.evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.borderLeftColor, style.backgroundColor, style.boxShadow];
        }),
      ).toEqual([INK, 'rgba(0, 0, 0, 0)', 'none']);

      await page.locator('button[data-map-tile][tabindex="0"]').focus();
      await page.keyboard.press('Home');
      const seen = new Set<string>();
      const hidden: string[] = [];
      const unringed: string[] = [];
      for (let step = 0; step < ids.length; step += 1) {
        if (step > 0) await page.keyboard.press('ArrowRight');
        const focused = await focusedAgainstSheet(page, sheet);
        seen.add((await activeAttribute(page, 'data-map-tile')) ?? '');
        if (hiddenBySheet(focused, { needOnTop: true })) hidden.push(describeHidden(focused));
        if (!focused.focusVisible || focused.outline !== `solid ${INK}`) {
          unringed.push(`${focused.name}: ${focused.outline}`);
        }
      }
      expect([...seen].sort(), `the walk reaches every tile ${at}`).toEqual([...ids].sort());
      expect(hidden, `focused tiles under the sheet ${at}`).toEqual([]);
      expect(unringed, `focused tiles without the ink ring ${at}`).toEqual([]);
    });

    test(`every timeline row the arrow keys reach stays beside the open sheet ${at}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.goto(`${ROUTE}?view=timeline`);
      const rows = page.locator('[data-timeline-id] > button');
      await expect(rows.first()).toBeVisible();
      const ids = await page
        .locator('[data-timeline-id]')
        .evaluateAll((all) => all.map((row) => row.getAttribute('data-timeline-id') ?? ''));
      expect(ids.length, at).toBeGreaterThan(0);

      await openWithPointer(page, rows.last());
      const sheet = await sheetBox(page);

      await page.locator('[data-timeline-id] > button[tabindex="0"]').focus();
      const seen = new Set<string>();
      const hidden: string[] = [];
      for (let step = 0; step < ids.length; step += 1) {
        await page.keyboard.press('ArrowDown');
        const focused = await focusedAgainstSheet(page, sheet);
        seen.add(
          await page.evaluate(
            () => document.activeElement?.parentElement?.getAttribute('data-timeline-id') ?? '',
          ),
        );
        if (hiddenBySheet(focused, { needOnTop: true })) hidden.push(describeHidden(focused));
      }
      expect([...seen].sort(), `the walk reaches every row ${at}`).toEqual([...ids].sort());
      expect(hidden, `focused rows under the sheet ${at}`).toEqual([]);
    });

    test(`every bubble mark the arrow keys reach stays beside the open sheet ${at}`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(viewport);
      await page.goto(`${ROUTE}?view=bubble`);
      const marks = page.locator('circle[data-company-id][role="button"]');
      await expect(marks.first()).toBeAttached();
      const all = await marks.evaluateAll((circles) =>
        circles.map((circle) => circle.getAttribute('data-company-id') ?? ''),
      );
      expect(all.length, at).toBeGreaterThan(0);

      // Open from the keyboard: marks overlap, so a pointer could land on a
      // neighbour.
      const start = page.locator('circle[data-company-id][role="button"][tabindex="0"]');
      await expect(async () => {
        if ((await page.getByRole('dialog').count()) === 0) {
          await start.focus();
          await page.keyboard.press('Enter');
        }
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      const sheet = await sheetBox(page);

      // Breadth-first over the four arrow keys from the roving mark, so the
      // walk covers exactly the marks a keyboard can reach. Marks overlap
      // one another in dense stacks, so a mark need not be topmost at its
      // centre; it must only stay out from under the sheet.
      const first = (await start.getAttribute('data-company-id')) ?? '';
      const reached = new Set<string>([first]);
      const queue = [first];
      const hidden = new Set<string>();
      await start.focus();
      const opening = await focusedAgainstSheet(page, sheet);
      if (hiddenBySheet(opening, { needOnTop: false })) hidden.add(describeHidden(opening));
      while (queue.length > 0) {
        const from = queue.shift() as string;
        for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
          await page.locator(`circle[data-company-id="${from}"]`).focus();
          await page.keyboard.press(key);
          const id = (await activeAttribute(page, 'data-company-id')) ?? '';
          if (reached.has(id)) continue;
          reached.add(id);
          queue.push(id);
          const focused = await focusedAgainstSheet(page, sheet);
          if (hiddenBySheet(focused, { needOnTop: false })) hidden.add(describeHidden(focused));
        }
      }
      expect([...reached].sort(), `the keyboard reaches every mark ${at}`).toEqual([...all].sort());
      expect([...hidden], `focused marks under the sheet ${at}`).toEqual([]);
    });

    test(`every filter control stays beside the open sheet ${at}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // A filtered map shows every control there is: the Clear filters
      // button joins the row, and the fold opens on an active filter.
      await page.goto(`${ROUTE}?country=US`);
      await expect(page.locator('#filter-country')).toBeVisible();
      const tiles = page.locator('button[data-map-tile]');
      await openWithPointer(page, tiles.last());
      const sheet = await sheetBox(page);

      // Segment tabs, search, More filters, Clear filters, the views and
      // the selects in the fold, which is the order Tab takes them in.
      const expected =
        (await page.getByRole('group', { name: 'Segment' }).getByRole('button').count()) +
        (await page.locator('[data-market-map-search]').count()) +
        (await page.getByRole('button', { name: /^More filters/ }).count()) +
        (await page.getByRole('button', { name: 'Clear filters' }).count()) +
        (await page.getByRole('group', { name: 'View' }).getByRole('button').count()) +
        (await page.locator('select[id^="filter-"]').count());
      expect(expected, at).toBeGreaterThan(10);

      const visited: string[] = [];
      const hidden: string[] = [];
      await page.getByRole('group', { name: 'Segment' }).getByRole('button').first().focus();
      for (let step = 0; step <= expected; step += 1) {
        if (step > 0) await page.keyboard.press('Tab');
        const left = await page.evaluate(
          () => document.activeElement?.closest('[data-map-tile], [role="dialog"]') != null,
        );
        if (left) break;
        const focused = await focusedAgainstSheet(page, sheet);
        visited.push(focused.name);
        if (hiddenBySheet(focused, { needOnTop: true })) hidden.push(describeHidden(focused));
      }
      expect(visited, `filter controls walked ${at}`).toHaveLength(expected);
      expect(hidden, `filter controls under the sheet ${at}`).toEqual([]);
    });

    test(`closing the sheet gives the map its full width back ${at}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(ROUTE);
      const tiles = page.locator('button[data-map-tile]');
      await expect(tiles).toHaveCount(COMPANIES.length);
      const before = await tileLayout(page);

      const opened = tiles.last();
      await openWithPointer(page, opened);
      await sheetBox(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(opened).toBeFocused();
      expect(await inViewport(opened), `focus returns to a tile in view ${at}`).toBe(true);

      // Closed, the map is exactly where it was before the sheet opened.
      expect(await tileLayout(page)).toEqual(before);
    });
  }

  test('on a phone the map stays two tiles wide under a modal bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROUTE);
    const tiles = page.locator('button[data-map-tile]');
    await expect(tiles).toHaveCount(COMPANIES.length);
    const before = await tileLayout(page);
    const lefts = new Set(Object.values(before).map(([left]) => left));
    expect(lefts.size).toBe(2);

    await openWithPointer(page, tiles.first());
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('data-company-sheet', 'bottom');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await settle(dialog);
    expect(await tileLayout(page)).toEqual(before);

    await dialog.getByRole('button', { name: /^Close .* details$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(tiles.first()).toBeFocused();
    expect(await tileLayout(page)).toEqual(before);
  });
});
