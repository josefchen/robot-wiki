import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';
import { closeBrowserAndStopServer } from './static-spec-teardown';
import { CONVERGENCE_EXEMPTIONS } from '../../lib/brand-v2-global-convergence-evidence';

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
  '/how-robots-work/',
  '/search/',
  '/glossary/',
  '/credits/',
  '/editorial-policy/',
  '/about/',
  '/privacy/',
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

/**
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the brand-v2 sidebar rail (`aside`, painted over the page's left edge) is
 * gone (9154d672). The one rail left is the article's contents rail
 * (`[data-article-rail]`), a grid column beside the text from 1200 px. Where
 * it stands beside the column it is the edge no content may sit left of;
 * everywhere else (narrower widths, pages without a rail) the edge is the
 * desktop frame's 48 px inline padding (VAL-B2-SPACE-002), so every route
 * at every rail width is still measured against a bound.
 */
const DESKTOP_FRAME_INSET = 48;

/**
 * Frame insets the checked-in convergence register exempts from the 48 px
 * rule: /how-robots-work/ keeps its owner-frozen 24 px gutter (Josef,
 * 12 October 2026, `owner-freeze:how-robots-work`, predicate
 * inline-padding). The entry is read from the register, so the bound moves
 * only with it.
 */
const FROZEN_FRAME_INSETS: Record<string, number> = (() => {
  const entry = CONVERGENCE_EXEMPTIONS.find((item) => item.id === 'owner-freeze:how-robots-work');
  expect(entry?.predicates, 'the how-robots-work frame exemption').toContain('inline-padding');
  const gutter = Number(/(\d+) px tablet gutter/.exec(entry?.reason ?? '')?.[1]);
  expect(gutter, 'the registered gutter width').toBe(24);
  return Object.fromEntries((entry?.routes ?? []).map((id) => [id.replace(/^route:/, ''), gutter]));
})();

interface WidthRecord {
  width: number;
  innerWidth: number;
  clientWidth: number;
  gutter: number;
  /** The contents rail's right edge, when it stands beside the column. */
  railRight: number | null;
  /** Whether the page is an article sheet ([data-prose-column]). */
  article: boolean;
  /** Whether the article sheet is the three-column grid. */
  sheetGrid: boolean;
  /** The sheet's resolved column gap in px, when it is the grid. */
  columnGap: number | null;
  proseReferenceLeft: number | null;
  minLeft: number | null;
  minLeftElement: Offender | null;
  offenders: Offender[];
  scrollWidth: number;
  rootOverflowX: string;
  bodyOverflowX: string;
  wideSurfaces: {
    width: number;
    left: number;
    inProseColumn: boolean;
    describe: string;
  }[];
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
async function measureWidth(page: Page, viewportWidth: number, inset: number): Promise<WidthRecord> {
  const collect = () =>
    page.evaluate((inset) => {
      const main = document.querySelector('main');
      const column = document.querySelector('[data-prose-column]');
      const sheetGrid = column !== null && getComputedStyle(column).display === 'grid';
      const rail = document.querySelector('[data-article-rail]');
      const railVisible =
        rail !== null &&
        getComputedStyle(rail).display !== 'none' &&
        rail.getBoundingClientRect().width > 0;
      // Below 1200 px the rail is the in-flow "Contents" disclosure above
      // the text, not an edge beside it.
      const railRight = railVisible && sheetGrid
        ? rail!.getBoundingClientRect().right
        : null;
      const columnGap = sheetGrid ? parseFloat(getComputedStyle(column!).columnGap) : null;

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
          // The rail is inside main now (the sidebar was outside it): the
          // rail itself and the sheet that holds it are not content beside it.
          if (rail !== null && (rail.contains(el) || el.contains(rail))) continue;
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
      const bound = railRight ?? inset;
      // The sidebar covered the strip a full-width wrapper now keeps clear
      // with its own padding (the 48 px frame inset), so an element is
      // measured where it paints: its border box when it draws a border, a
      // background other than the page ground or a shadow, otherwise its
      // content box, inside which its text and children sit.
      const ground = getComputedStyle(document.body).backgroundColor;
      const paintedLeft = (el: Element) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const background = cs.backgroundColor;
        const paintsBox =
          parseFloat(cs.borderLeftWidth) > 0 ||
          cs.backgroundImage !== 'none' ||
          cs.boxShadow !== 'none' ||
          (background !== ground && !/^rgba\(.*,\s*0\)$/.test(background) && background !== 'transparent');
        return paintsBox ? r.left : r.left + parseFloat(cs.paddingLeft);
      };
      for (const el of candidates) {
        const left = paintedLeft(el);
        if (minLeft === null || left < minLeft) {
          minLeft = left;
          minLeftElement = describe(el);
        }
        if (left < bound) offenders.push(describe(el));
      }

      const wideSurfaces = [...document.querySelectorAll('.wide-measure')].map(
        (el) => {
          const r = el.getBoundingClientRect();
          return {
            width: r.width,
            left: r.left,
            // A wide surface outside an article gets no
            // --wide-measure-available and would silently render at width 0
            // if the geometry rule were not scoped to the prose column.
            inProseColumn: el.closest('[data-prose-column]') !== null,
            describe: `<${el.tagName.toLowerCase()} class="${(el.getAttribute('class') ?? '').slice(0, 80)}">`,
          };
        },
      );

      // The article's own reading column: the widest <p> that is not inside
      // a wide surface, a table, a figure, or a callout container.
      let proseReferenceWidth: number | null = null;
      let proseReferenceLeft: number | null = null;
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
          const { width: w, left } = p.getBoundingClientRect();
          if (w > 0 && (proseReferenceWidth === null || w > proseReferenceWidth)) {
            proseReferenceWidth = w;
            proseReferenceLeft = left;
          }
        }
      }

      return {
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        railRight,
        article: column !== null,
        sheetGrid,
        columnGap,
        proseReferenceLeft,
        minLeft,
        minLeftElement,
        offenders: offenders.slice(0, 12),
        scrollWidth: document.documentElement.scrollWidth,
        rootOverflowX: getComputedStyle(document.documentElement).overflowX,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        wideSurfaces,
        proseReferenceWidth,
      };
    }, inset);

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
    article: settled.article,
    sheetGrid: settled.sheetGrid,
    columnGap: settled.columnGap,
    proseReferenceLeft: settled.proseReferenceLeft,
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
    const inset = FROZEN_FRAME_INSETS[route] ?? DESKTOP_FRAME_INSET;
    for (const width of SWEEP_WIDTHS) byWidth.push(await measureWidth(page, width, inset));
    records.push({ route, byWidth });
  }
  return records;
}

function clearanceFailures(records: RouteRecord[]): string[] {
  const failures: string[] = [];
  for (const { route, byWidth } of records) {
    for (const rec of byWidth) {
      if (!RAIL_WIDTHS.includes(rec.width)) continue;
      // Owner-approved successor (Josef, 2026-10-10, the research-page
      // standard): the old pin required a visible sidebar rail on every
      // route at every rail width. An article now stands as the
      // three-column sheet from 1200 px with its contents rail beside the
      // column; elsewhere the bound is the 48 px desktop frame inset.
      if (rec.article && rec.width >= 1200) {
        expect(rec.sheetGrid, `${route} @${rec.width}: the article sheet is the three-column grid`).toBe(true);
        expect(
          rec.railRight,
          `${route} @${rec.width}: no visible contents rail to measure against`,
        ).not.toBeNull();
      }
      const railRight = rec.railRight ?? FROZEN_FRAME_INSETS[route] ?? DESKTOP_FRAME_INSET;
      if (rec.minLeft === null) continue;
      if (rec.minLeft < railRight) {
        const el = rec.minLeftElement;
        failures.push(
          `${route} @${rec.width}px: minLeft=${rec.minLeft.toFixed(2)} bound=${railRight.toFixed(2)} ` +
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
  await closeBrowserAndStopServer(classicBrowser, server);
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

  test('VAL-DESIGN-026: wide surfaces stand wider than the prose column, centred on it, at the sheet rule', () => {
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old pin held every wide surface at least 1.25x the
    // prose column, a bound for the brand-v2 62-68ch column. The sheet's
    // column is now up to 960 px between the contents rail and the notes,
    // and a wide surface takes min(1020px, column + 2 x column gap - 8px),
    // the extra width from the gaps only (app/globals.css, 9154d672), which
    // is about 1.06x the column. Each surface is now held to that exact
    // width, strictly wider than the column, and centred on it, all within
    // 1 px.
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
        expect(rec.columnGap, `${route} @${rec.width}: the sheet's column gap`).not.toBeNull();
        const reference = rec.proseReferenceWidth as number;
        const centre = (rec.proseReferenceLeft as number) + reference / 2;
        const expected = Math.min(1020, reference + 2 * (rec.columnGap as number) - 8);
        for (const surface of rec.wideSurfaces) {
          measured += 1;
          const ratio = surface.width / reference;
          if (
            Math.abs(surface.width - expected) > 1 ||
            surface.width <= reference ||
            Math.abs(surface.left + surface.width / 2 - centre) > 1
          )
            failures.push(
              `${route} @${rec.width}px: wide surface ${surface.width.toFixed(1)}px at ${surface.left.toFixed(1)} vs prose ${reference.toFixed(1)}px centred at ${centre.toFixed(1)}, expected ${expected.toFixed(1)}px, ratio ${ratio.toFixed(3)}`,
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

  test('every wide surface is authored inside the article prose column', () => {
    // The geometry rule is scoped to [data-prose-column] because only that
    // element supplies --wide-measure-available. Outside it the utility
    // degrades to an ordinary block rather than collapsing to width 0, but
    // degrading is not what an author asking for a wide surface wants, so
    // the misplaced call site has to fail somewhere rather than look fine.
    const misplaced: string[] = [];
    const collapsed: string[] = [];
    for (const { route, byWidth } of overlay) {
      for (const rec of byWidth) {
        if (!RAIL_WIDTHS.includes(rec.width)) continue;
        for (const surface of rec.wideSurfaces) {
          if (!surface.inProseColumn)
            misplaced.push(
              `${route} @${rec.width}px: ${surface.describe} is not inside [data-prose-column]`,
            );
          // A collapsed surface has no left edge to occlude anything, so it
          // would pass every clearance bound above by disappearing.
          if (surface.width <= 0)
            collapsed.push(
              `${route} @${rec.width}px: ${surface.describe} rendered ${surface.width}px wide`,
            );
        }
      }
    }
    expect(
      misplaced,
      `wide-measure used outside an article prose column:\n${misplaced.join('\n')}`,
    ).toEqual([]);
    expect(
      collapsed,
      `wide-measure surfaces collapsed to zero width:\n${collapsed.join('\n')}`,
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
