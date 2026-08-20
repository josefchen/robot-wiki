import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Rail clearance and wide-surface geometry (VAL-DESIGN-024 through
 * VAL-DESIGN-027), measured on the shipped artifact in out/.
 *
 * Content pushed left of the desktop rail is painted underneath it and is
 * unreachable: an LTR document cannot scroll to a negative offset, so the
 * loss is silent and no scrollbar signals it. That is why these assertions
 * measure a left edge rather than page overflow.
 *
 * The scrollbar model matters and is why VAL-DESIGN-025 exists as its own
 * sweep. Headless Chromium launches with --hide-scrollbars and uses overlay
 * scrollbars, so `100vw` and `documentElement.clientWidth` agree and a
 * default run cannot observe a layout that measures itself against the full
 * viewport instead of the width actually available. The second sweep drops
 * that default arg and declares a 15px `::-webkit-scrollbar`, then proves
 * the gutter is real before it measures any geometry.
 */

const OUT = join(process.cwd(), 'out');

/** Every route the export publishes, derived from the module registry. */
const ROUTES: string[] = [
  '/',
  ...DOMAINS.map((d) => `/${d}/`),
  '/market-map/',
  '/playground/',
  '/search/',
  '/glossary/',
  '/credits/',
  '/a-z/',
  ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
];

/** VAL-DESIGN-024 / VAL-DESIGN-025 widths, plus the VAL-DESIGN-027 pair. */
const RAIL_WIDTHS = [1024, 1152, 1280, 1440, 1600, 1616, 1920];
const OVERFLOW_WIDTHS = [375, 768, 1024, 1280, 1440, 1600, 1920];
const RATIO_WIDTHS = [1280, 1440, 1600, 1920];
const SWEEP_WIDTHS = [...new Set([...RAIL_WIDTHS, ...OVERFLOW_WIDTHS])].sort(
  (a, b) => a - b,
);

/** A 15px classic scrollbar, wide enough to sit inside the 15-17px band. */
const CLASSIC_SCROLLBAR_CSS = `
  html::-webkit-scrollbar { width: 15px; }
  html::-webkit-scrollbar-track { background: #111; }
  html::-webkit-scrollbar-thumb { background: #666; }
`;

interface Offender {
  tag: string;
  className: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WidthRecord {
  width: number;
  innerWidth: number;
  clientWidth: number;
  gutter: number;
  railRight: number | null;
  minLeft: number | null;
  minLeftElement: Offender | null;
  offenders: Offender[];
  scrollWidth: number;
  rootOverflowX: string;
  bodyOverflowX: string;
  wideSurfaces: { width: number; left: number }[];
  proseReferenceWidth: number | null;
}

type RouteRecord = { route: string; byWidth: WidthRecord[] };

/**
 * Measure one viewport width on the loaded page. `railRight` is the rail's
 * `getBoundingClientRect().right`, which includes the border it paints.
 * Candidate content elements follow contract/design-integrity.md: inside
 * <main>, at least 24x8, rendered, and with SVG descendants folded into
 * their <svg> because a browser reports path bounds in viewBox coordinates.
 */
async function measureWidth(page: Page, viewportWidth: number): Promise<WidthRecord> {
  const collect = () =>
    page.evaluate(() => {
      const main = document.querySelector('main');
      const aside = document.querySelector('aside');
      const railVisible =
        aside !== null && getComputedStyle(aside).display !== 'none';
      const railRight = railVisible
        ? aside!.getBoundingClientRect().right
        : null;

      const describe = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: (el.getAttribute('class') ?? '').slice(0, 80),
          text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        };
      };

      const candidates: Element[] = [];
      if (main) {
        for (const el of main.querySelectorAll('*')) {
          const tag = el.tagName.toLowerCase();
          if (tag !== 'svg' && el.closest('svg')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          if (parseFloat(cs.opacity) <= 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 24 || r.height < 8) continue;
          candidates.push(el);
        }
      }

      let minLeft: number | null = null;
      let minLeftElement: ReturnType<typeof describe> | null = null;
      const offenders: ReturnType<typeof describe>[] = [];
      for (const el of candidates) {
        const left = el.getBoundingClientRect().left;
        if (minLeft === null || left < minLeft) {
          minLeft = left;
          minLeftElement = describe(el);
        }
        if (railRight !== null && left < railRight) offenders.push(describe(el));
      }

      const wideSurfaces = [...document.querySelectorAll('.wide-measure')].map(
        (el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, left: r.left };
        },
      );

      // The article's own reading column: the widest <p> that is not inside
      // a wide surface, a table, a figure, or a callout container.
      let proseReferenceWidth: number | null = null;
      if (main) {
        for (const p of main.querySelectorAll('p')) {
          if (
            p.closest('.wide-measure') ||
            p.closest('table') ||
            p.closest('figure') ||
            p.closest('[role="note"]') ||
            p.closest('aside')
          )
            continue;
          const cs = getComputedStyle(p);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const w = p.getBoundingClientRect().width;
          if (w > 0 && (proseReferenceWidth === null || w > proseReferenceWidth))
            proseReferenceWidth = w;
        }
      }

      return {
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        railRight,
        minLeft,
        minLeftElement,
        offenders: offenders.slice(0, 12),
        scrollWidth: document.documentElement.scrollWidth,
        rootOverflowX: getComputedStyle(document.documentElement).overflowX,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        wideSurfaces,
        proseReferenceWidth,
      };
    });

  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const settled = await collect();
  // Repeat after scrolling to the bottom so a surface that only mounts on
  // intersection is measured too; both passes must satisfy the bounds.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(120);
  const scrolled = await collect();
  await page.evaluate(() => window.scrollTo(0, 0));

  const worst = (a: number | null, b: number | null) =>
    a === null ? b : b === null ? a : Math.min(a, b);

  return {
    width: viewportWidth,
    innerWidth: settled.innerWidth,
    clientWidth: settled.clientWidth,
    gutter: settled.innerWidth - settled.clientWidth,
    railRight: settled.railRight,
    minLeft: worst(settled.minLeft, scrolled.minLeft),
    minLeftElement:
      scrolled.minLeft !== null &&
      settled.minLeft !== null &&
      scrolled.minLeft < settled.minLeft
        ? scrolled.minLeftElement
        : settled.minLeftElement,
    offenders: [...settled.offenders, ...scrolled.offenders].slice(0, 12),
    scrollWidth: Math.max(settled.scrollWidth, scrolled.scrollWidth),
    rootOverflowX: settled.rootOverflowX,
    bodyOverflowX: settled.bodyOverflowX,
    wideSurfaces: settled.wideSurfaces,
    proseReferenceWidth: settled.proseReferenceWidth,
  };
}

async function sweep(page: Page, base: string): Promise<RouteRecord[]> {
  const records: RouteRecord[] = [];
  for (const route of ROUTES) {
    await page.goto(`${base}${route}`, { waitUntil: 'load' });
    const byWidth: WidthRecord[] = [];
    for (const width of SWEEP_WIDTHS) byWidth.push(await measureWidth(page, width));
    records.push({ route, byWidth });
  }
  return records;
}

function clearanceFailures(records: RouteRecord[]): string[] {
  const failures: string[] = [];
  for (const { route, byWidth } of records) {
    for (const rec of byWidth) {
      if (!RAIL_WIDTHS.includes(rec.width)) continue;
      expect(
        rec.railRight,
        `${route} @${rec.width}: no visible rail to measure against`,
      ).not.toBeNull();
      const railRight = rec.railRight as number;
      if (rec.minLeft === null) continue;
      if (rec.minLeft < railRight) {
        const el = rec.minLeftElement;
        failures.push(
          `${route} @${rec.width}px: minLeft=${rec.minLeft.toFixed(2)} railRight=${railRight.toFixed(2)} ` +
            `clearance=${(rec.minLeft - railRight).toFixed(2)}px element=<${el?.tag} class="${el?.className}"> "${el?.text}"`,
        );
      }
    }
  }
  return failures;
}

let server: StaticExportServer | null = null;
let overlay: RouteRecord[] = [];
let classic: RouteRecord[] = [];
let overlayGutters: number[] = [];
let classicGutters: number[] = [];
let classicBrowser: Browser | null = null;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(15 * 60_000);
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the rail-clearance spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT, 0);
  const base = `http://localhost:${server.port}`;

  const overlayPage = await browser.newPage();
  overlay = await sweep(overlayPage, base);
  overlayGutters = overlay[0].byWidth.map((r) => r.gutter);
  await overlayPage.close();

  // Chromium's default --hide-scrollbars is what makes headless use overlay
  // scrollbars; dropping it and declaring a width gives a real 15px gutter.
  classicBrowser = await chromium.launch({
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });
  const classicPage = await classicBrowser.newPage();
  await classicPage.addInitScript((css: string) => {
    const inject = () => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  }, CLASSIC_SCROLLBAR_CSS);
  classic = await sweep(classicPage, base);
  classicGutters = classic[0].byWidth.map((r) => r.gutter);
  await classicPage.close();
});

test.afterAll(async () => {
  await classicBrowser?.close();
  await server?.stop();
});

test.describe('rail clearance and wide-surface geometry', () => {
  test('VAL-DESIGN-024: no content sits left of the rail (overlay scrollbars)', () => {
    const failures = clearanceFailures(overlay);
    expect(
      failures,
      `Content occluded by the sidebar rail:\n${failures.join('\n')}`,
    ).toEqual([]);
  });

  test('VAL-DESIGN-025: the emulation produced a space-consuming scrollbar', () => {
    // Fails, never skips: an evidence bundle with no gutter proves nothing.
    for (const [i, gutter] of classicGutters.entries()) {
      expect(
        gutter,
        `classic-scrollbar sweep @${SWEEP_WIDTHS[i]}px: innerWidth - clientWidth = ${gutter}, ` +
          'expected 15-17px. The scrollbar emulation did not take effect.',
      ).toBeGreaterThanOrEqual(15);
      expect(gutter).toBeLessThanOrEqual(17);
    }
    // The control: the default sweep really is the overlay model, so the
    // two sweeps are measuring different things rather than the same one.
    expect(overlayGutters.every((g) => g === 0)).toBe(true);
  });

  test('VAL-DESIGN-025: no content sits left of the rail (classic scrollbar)', () => {
    const failures = clearanceFailures(classic);
    expect(
      failures,
      `Content occluded by the sidebar rail with a 15px scrollbar gutter:\n${failures.join('\n')}`,
    ).toEqual([]);
  });

  test('VAL-DESIGN-026: wide surfaces stay at least 1.25x the prose column', () => {
    const failures: string[] = [];
    let measured = 0;
    for (const { route, byWidth } of overlay) {
      for (const rec of byWidth) {
        if (!RATIO_WIDTHS.includes(rec.width)) continue;
        if (rec.wideSurfaces.length === 0) continue;
        expect(
          rec.proseReferenceWidth,
          `${route} @${rec.width}: no prose paragraph to compare against`,
        ).not.toBeNull();
        const reference = rec.proseReferenceWidth as number;
        for (const surface of rec.wideSurfaces) {
          measured += 1;
          const ratio = surface.width / reference;
          if (ratio < 1.25)
            failures.push(
              `${route} @${rec.width}px: wide surface ${surface.width.toFixed(1)}px vs prose ${reference.toFixed(1)}px, ratio ${ratio.toFixed(3)}`,
            );
        }
      }
    }
    // A zero-match sweep satisfies every loop written over it: 11 wide
    // surfaces at 4 widths is the population this assertion grades.
    expect(measured).toBe(11 * RATIO_WIDTHS.length);
    expect(
      failures,
      `Wide surfaces narrowed into the prose column:\n${failures.join('\n')}`,
    ).toEqual([]);
  });

  test('VAL-DESIGN-027: no page-level horizontal scroll, and no overflow band-aid', () => {
    const scrollFailures: string[] = [];
    const suppressionFailures: string[] = [];
    for (const records of [overlay, classic]) {
      for (const { route, byWidth } of records) {
        for (const rec of byWidth) {
          if (!OVERFLOW_WIDTHS.includes(rec.width)) continue;
          if (rec.scrollWidth > rec.innerWidth)
            scrollFailures.push(
              `${route} @${rec.width}px: scrollWidth=${rec.scrollWidth} innerWidth=${rec.innerWidth} delta=${rec.scrollWidth - rec.innerWidth}`,
            );
          for (const [el, value] of [
            ['root', rec.rootOverflowX],
            ['body', rec.bodyOverflowX],
          ] as const) {
            if (value === 'hidden' || value === 'clip')
              suppressionFailures.push(
                `${route} @${rec.width}px: ${el} overflow-x is ${value}`,
              );
          }
        }
      }
    }
    expect(
      scrollFailures,
      `Page-level horizontal scroll:\n${scrollFailures.join('\n')}`,
    ).toEqual([]);
    expect(
      suppressionFailures,
      `Horizontal axis suppressed on the root or body:\n${suppressionFailures.join('\n')}`,
    ).toEqual([]);
  });
});
