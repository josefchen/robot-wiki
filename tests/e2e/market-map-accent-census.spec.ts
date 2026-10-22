import { expect, test, type Page } from '@playwright/test';

/**
 * The accent census of the market map (VAL-B2-MAP-004): the muted blue
 * accent #3B6EA8 paints only the one highlighted thing in each view and the
 * legend key that explains it. In the grid, bubble and timeline views, in
 * their default, filtered, selected and focused states, at 1440 and 375 px,
 * every element whose computed paint is the accent must be one of:
 *
 * - the bubble chart's focus ring (circle[data-focus-ring]);
 * - the open company's bubble mark;
 * - the open company's timeline round;
 * - the "Open company" legend key ([data-legend-key="open-company"]).
 *
 * No element anywhere on the page paints the retired brand-v2 lime
 * (#C6FF19) or signal blues (#245FFF, #245EDB). The open sheet's links are
 * ink and underlined, and a focused control shows a 1 px ink outline.
 * Styles are read only after every running transition and animation has
 * finished, so a hover or focus fade cannot hide a colour mid-flight.
 */

const ROUTE = '/market-map/';

const ACCENT = 'rgb(59, 110, 168)';
const INK = 'rgb(28, 28, 26)';
const RETIRED = {
  'lime #C6FF19': 'rgb(198, 255, 25)',
  'signal #245FFF': 'rgb(36, 95, 255)',
  'signal #245EDB': 'rgb(36, 94, 219)',
} as const;

/** The company the selected state opens: plotted in the bubble view and dated in the timeline. */
const OPEN = 'figure-ai';

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '375x812', width: 375, height: 812 },
] as const;

const VIEWS = ['grid', 'bubble', 'timeline'] as const;
type View = (typeof VIEWS)[number];

const STATES = ['default', 'filtered', 'selected', 'focused'] as const;
type State = (typeof STATES)[number];

type Painted = {
  /** A short description of the element, for the failure message. */
  element: string;
  /** The computed properties that carry the colour. */
  properties: string[];
  /** Which allowed accent role it plays, or null. */
  role: 'focus-ring' | 'selected-mark' | 'selected-round' | 'legend-key' | null;
};

function url(view: View, state: State): string {
  const params = new URLSearchParams();
  if (state === 'filtered') params.set('segment', 'humanoids');
  if (view !== 'grid') params.set('view', view);
  const search = params.toString() === '' ? '' : `?${params}`;
  return `${ROUTE}${search}${state === 'selected' ? `#company-${OPEN}` : ''}`;
}

/** Waits until no transition or animation is running anywhere on the page. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 5; round += 1) {
      const running = document.getAnimations();
      if (running.length === 0) return;
      await Promise.all(running.map((animation) => animation.finished.catch(() => null)));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
  });
}

/** The view's first keyboard stop, focused as the keyboard focuses it. */
async function focusView(page: Page, view: View) {
  const target =
    view === 'grid'
      ? page.locator('button[data-map-tile]').first()
      : view === 'bubble'
        ? page.locator(`circle[data-company-id="${OPEN}"]`)
        : page.locator(`[data-company-id="${OPEN}"] > button`);
  await expect(target).toHaveCount(1);
  await expect(async () => {
    await target.focus();
    await expect(target).toBeFocused({ timeout: 1_000 });
    if (view === 'bubble') {
      await expect(page.locator('circle[data-focus-ring]')).toHaveCount(1, { timeout: 1_000 });
    }
  }).toPass({ timeout: 15_000 });
}

/** Every element painting `colours`, with the accent role each one plays. */
async function census(page: Page, colours: string[], openId: string | null): Promise<Painted[]> {
  return page.evaluate(
    ({ colours, openId }) => {
      const wanted = new Set(colours);
      const found: Painted[] = [];
      const describe = (el: Element) => {
        const attrs = Array.from(el.attributes)
          .filter((attr) => attr.name.startsWith('data-') || attr.name === 'class' || attr.name === 'aria-label')
          .map((attr) => `${attr.name}="${attr.value.slice(0, 60)}"`)
          .join(' ');
        return `<${el.tagName.toLowerCase()} ${attrs}>`;
      };
      const hasOwnText = (el: Element) =>
        Array.from(el.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        );
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        const style = getComputedStyle(el);
        const properties: string[] = [];
        const check = (name: string, value: string, painted: boolean) => {
          if (painted && [...wanted].some((colour) => value.includes(colour))) properties.push(name);
        };
        check('color', style.color, hasOwnText(el));
        check('background-color', style.backgroundColor, true);
        check('background-image', style.backgroundImage, style.backgroundImage !== 'none');
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          check(
            `border-${side}-color`,
            style.getPropertyValue(`border-${side}-color`),
            style.getPropertyValue(`border-${side}-style`) !== 'none' &&
              parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0,
          );
        }
        check(
          'outline-color',
          style.outlineColor,
          style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
        );
        check(
          'text-decoration-color',
          style.textDecorationColor,
          style.textDecorationLine !== 'none' && hasOwnText(el),
        );
        check('box-shadow', style.boxShadow, style.boxShadow !== 'none');
        if (el instanceof SVGElement) {
          check('fill', style.fill, style.fill !== 'none' && parseFloat(style.fillOpacity) > 0);
          check(
            'stroke',
            style.stroke,
            style.stroke !== 'none' && parseFloat(style.strokeWidth) > 0 && parseFloat(style.strokeOpacity) > 0,
          );
        }
        if (properties.length === 0) continue;

        let role: Painted['role'] = null;
        if (el.matches('circle[data-focus-ring]')) role = 'focus-ring';
        else if (el.matches('[data-legend-key="open-company"]')) role = 'legend-key';
        else if (
          openId !== null &&
          el.matches('circle[data-mark-ink]') &&
          el.parentElement?.querySelector(`:scope > circle[data-company-id="${openId}"][aria-expanded="true"]`)
        )
          role = 'selected-mark';
        else if (openId !== null && el.matches(`circle[data-timeline-round="${openId}"]`)) role = 'selected-round';
        found.push({ element: describe(el), properties, role });
      }
      return found;
    },
    { colours, openId },
  );
}

for (const viewport of VIEWPORTS) {
  test.describe(`market-map accent census at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const view of VIEWS) {
      for (const state of STATES) {
        test(`${view} view, ${state}: the accent marks only the highlight and its legend key (VAL-B2-MAP-004)`, async ({
          page,
        }) => {
          await page.goto(url(view, state));
          await expect(page.getByText(/^\d+ of 111 companies$/)).toBeVisible();
          if (view === 'bubble') {
            await expect(page.locator('circle[data-company-id]').first()).toBeVisible();
          }
          if (view === 'timeline') {
            await expect(page.locator('[data-timeline-id] > button').first()).toBeVisible();
          }
          if (state === 'filtered') {
            await expect(page.getByText('34 of 111 companies')).toBeVisible();
          }
          const openId = state === 'selected' ? OPEN : null;
          if (state === 'selected') {
            await expect(page.locator('[data-company-detail]')).toHaveAttribute('data-company-detail', OPEN);
          }
          if (state === 'focused') await focusView(page, view);
          await settle(page);

          const accent = await census(page, [ACCENT], openId);
          const strays = accent.filter((painted) => painted.role === null);
          expect(strays, 'elements painting the accent outside its allowed roles').toEqual([]);

          // Each allowed role appears exactly where its state puts it.
          const roles = (role: Painted['role']) => accent.filter((painted) => painted.role === role).length;
          expect(roles('legend-key'), 'the legend key of a chart view').toBe(view === 'grid' ? 0 : 1);
          expect(roles('selected-mark'), 'the open company’s bubble mark').toBe(
            view === 'bubble' && state === 'selected' ? 1 : 0,
          );
          expect(roles('selected-round'), 'the open company’s timeline round').toBe(
            view === 'timeline' && state === 'selected' ? 1 : 0,
          );
          expect(roles('focus-ring'), 'the bubble chart’s focus ring').toBe(
            view === 'bubble' && state === 'focused' ? 1 : 0,
          );

          const retired = await census(page, Object.values(RETIRED), null);
          expect(retired, 'elements painting a retired brand-v2 colour').toEqual([]);

          if (state === 'selected') {
            const links = await page.locator('[data-company-detail] a').evaluateAll((anchors) =>
              anchors.map((anchor) => {
                const style = getComputedStyle(anchor);
                return {
                  text: (anchor.textContent ?? '').trim().slice(0, 60),
                  color: style.color,
                  underline: style.textDecorationLine.includes('underline'),
                };
              }),
            );
            expect(links.length).toBeGreaterThan(0);
            for (const link of links) {
              expect(link, 'a sheet link is ink and underlined').toEqual({ ...link, color: INK, underline: true });
            }
          }

          if (state === 'focused') {
            const focused = await page.evaluate(() => {
              const active = document.activeElement as Element;
              const style = getComputedStyle(active);
              return {
                tag: active.tagName.toLowerCase(),
                focusVisible: active.matches(':focus-visible'),
                outlineStyle: style.outlineStyle,
                outlineWidth: style.outlineWidth,
                outlineColor: style.outlineColor,
              };
            });
            expect(focused.focusVisible, 'the keyboard focus is visible').toBe(true);
            if (view === 'bubble') {
              // A mark shows focus with the chart's ring, its browser outline removed.
              await expect(page.locator('circle[data-focus-ring]')).toHaveCSS('stroke', ACCENT);
            } else {
              expect(focused, `the focused ${view} control's outline`).toMatchObject({
                outlineStyle: 'solid',
                outlineWidth: '1px',
                outlineColor: INK,
              });
            }
            // A filter control shows the same 1 px ink outline.
            const segment = page.getByRole('group', { name: 'Segment' }).getByRole('button').first();
            await segment.focus();
            await settle(page);
            const control = await segment.evaluate((el) => {
              const style = getComputedStyle(el);
              return {
                focusVisible: el.matches(':focus-visible'),
                outlineStyle: style.outlineStyle,
                outlineWidth: style.outlineWidth,
                outlineColor: style.outlineColor,
              };
            });
            expect(control, 'the focused segment control').toEqual({
              focusVisible: true,
              outlineStyle: 'solid',
              outlineWidth: '1px',
              outlineColor: INK,
            });
            const afterControl = await census(page, [ACCENT], null);
            expect(afterControl.filter((painted) => painted.role === null)).toEqual([]);
          }
        });
      }
    }
  });
}
