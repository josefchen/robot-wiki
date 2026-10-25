import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import { openArticlesPanel } from './helpers/articles-panel';
import { DESIGN_DEFS } from './helpers/design-defs';
import { settleTransitions } from './settle';

/**
 * Design chrome discipline (VAL-DESIGN-016 through VAL-DESIGN-022): the
 * active-nav marker, article rule count, boxed controls, the mobile drawer
 * edge, micro-label tracking unity, and nav semantics. The countable
 * definitions mirror contract/design-integrity.md.
 */

const MODULE_ROUTE = '/manipulation/action-chunking/';
const DOMAIN_ROUTE = '/manipulation/';
const STANDALONE_ROUTE = '/glossary/';
const AUDITED_ROUTES = [
  '/',
  MODULE_ROUTE,
  DOMAIN_ROUTE,
  '/market-map',
  '/playground',
  '/search',
  '/glossary',
  '/credits',
];

/** The shared definitions from contract/design-integrity.md, in-page. */
const DEFS = DESIGN_DEFS;

function evaluateDefs<T>(page: Page, call: string): Promise<T> {
  return page.evaluate(`(() => { ${DEFS}; return ${call}; })()`) as Promise<T>;
}

const INK = 'rgb(28, 28, 26)';

/**
 * The current-route mark on the taxonomy entry for `route`.
 *
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the old reader measured the registered aria-hidden active-interval rail
 * inside `aside a[aria-current="page"]` (3px lime, full link height). The
 * sidebar and its rail are gone; the taxonomy nav lives in the "Site
 * navigation" panel the top bar's "Articles" button opens, and the current
 * entry is marked by the link itself: ink, a weight step over its idle
 * siblings, and a 1 px ink rule or underline, never a colour fill and never
 * a device. Every fact the rail reader returned has a counterpart here.
 */
async function markerMetrics(page: Page, route: string) {
  await page.goto(route);
  await openArticlesPanel(page);
  const metrics = await page.evaluate((ink) => {
    const nav = document.querySelector(
      '[role="dialog"] nav[aria-label="Robot Wiki taxonomy drawer"]',
    );
    const link = nav?.querySelector('a[aria-current="page"]');
    if (!nav || !link) return null;
    const idle = [...(link.closest('ul')?.querySelectorAll('a[href]') ?? [])].find(
      (a) => !a.hasAttribute('aria-current'),
    );
    if (!idle) return null;
    const lcs = getComputedStyle(link);
    const lr = link.getBoundingClientRect();
    const sides = ['Top', 'Right', 'Bottom', 'Left'] as const;
    const inkRuleSides = sides.filter(
      (s) =>
        lcs.getPropertyValue(`border-${s.toLowerCase()}-width`) === '1px' &&
        lcs.getPropertyValue(`border-${s.toLowerCase()}-style`) === 'solid' &&
        lcs.getPropertyValue(`border-${s.toLowerCase()}-color`) === ink,
    );
    const inkUnderline =
      lcs.textDecorationLine.includes('underline') &&
      lcs.textDecorationThickness === '1px' &&
      lcs.textDecorationColor === ink;
    return {
      linkBoxShadow: lcs.boxShadow,
      linkRadii: [
        lcs.borderTopLeftRadius,
        lcs.borderTopRightRadius,
        lcs.borderBottomLeftRadius,
        lcs.borderBottomRightRadius,
      ],
      linkBackground: lcs.backgroundColor,
      linkBackgroundImage: lcs.backgroundImage,
      devices: link.querySelectorAll('[aria-hidden="true"], [data-brand-device-id]').length,
      pseudoContent: [
        getComputedStyle(link, '::before').content,
        getComputedStyle(link, '::after').content,
      ],
      colour: lcs.color,
      weight: Number.parseFloat(lcs.fontWeight),
      idleWeight: Number.parseFloat(getComputedStyle(idle).fontWeight),
      inkRule: inkRuleSides.length > 0 || inkUnderline,
      ruleReport: `border ${sides.map((s) => lcs.getPropertyValue(`border-${s.toLowerCase()}-width`) + ' ' + lcs.getPropertyValue(`border-${s.toLowerCase()}-color`)).join(' / ')}; text-decoration ${lcs.textDecorationLine} ${lcs.textDecorationThickness} ${lcs.textDecorationColor}`,
      leftOffset: lr.left - nav.getBoundingClientRect().left,
    };
  }, INK);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeHidden();
  return metrics;
}

test.describe('design chrome discipline', () => {
  test('the active marker is a flat full-height rule, never a clipped shadow (VAL-DESIGN-016)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const m = await markerMetrics(page, MODULE_ROUTE);
    expect(m).not.toBeNull();
    expect(m!.linkBoxShadow).toBe('none');
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard; contract VAL-B2-COL-005, VAL-B2-SURF-002): the old pins read
    // the registered active-interval rail inside the sidebar link (no
    // shadow, square, device id `device:active-interval-rail`, 3px, lime
    // rgb(198, 255, 25), full link height). The current entry now carries
    // no device and no colour fill: square, unfilled, ink, one weight step
    // over its idle siblings, and a 1 px ink rule or underline.
    expect(m!.linkRadii).toEqual(['0px', '0px', '0px', '0px']);
    expect(m!.devices).toBe(0);
    expect(m!.pseudoContent).toEqual(['none', 'none']);
    expect(m!.linkBackground).toBe('rgba(0, 0, 0, 0)');
    expect(m!.linkBackgroundImage).toBe('none');
    expect(m!.colour).toBe(INK);
    expect(m!.weight).toBeGreaterThanOrEqual(500);
    expect(m!.weight).toBeGreaterThan(m!.idleWeight);
    expect(m!.inkRule, `1 px ink rule or underline on the current entry: ${m!.ruleReport}`).toBe(true);
  });

  test('the marker sits at one indent depth for every entry kind (VAL-DESIGN-017)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the offset was the sidebar rail's distance from the
    // <aside> edge; it is now the current entry's own box (the mark) from
    // the left edge of the panel's taxonomy nav, for the same three entry
    // kinds (article, domain overview, standalone page).
    const offsets: number[] = [];
    for (const route of [MODULE_ROUTE, DOMAIN_ROUTE, STANDALONE_ROUTE]) {
      const m = await markerMetrics(page, route);
      expect(m, `marker on ${route}`).not.toBeNull();
      offsets.push(m!.leftOffset);
    }
    const spread = Math.max(...offsets) - Math.min(...offsets);
    expect(spread).toBeLessThanOrEqual(1);
  });

  test('a dense article renders at most two full-width rules (VAL-DESIGN-018)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(MODULE_ROUTE);
    // The article chosen renders See also, Linked from and References.
    for (const heading of ['See also', 'Linked from', 'References']) {
      await expect(
        page.locator('article').getByRole('heading', { name: heading }),
      ).toBeVisible();
    }
    // The evaluator mirrors contract/design-integrity.md's shared
    // definitions: each candidate is measured against ITS OWN text column
    // (the data-prose-column hook first, then the ancestor heuristics), a
    // rule is an <hr> or a single-axis horizontal border, and four-sided
    // boxes and container roles (Callout, Aside) are never dividers. The
    // previous version measured against <main>, which on a 1440px article
    // route is ~1.75x the prose column, so it counted zero rules for any
    // implementation and could never fail.
    //
    // The article no longer carries a Callout or Aside (VAL-OPUS-151), so a
    // callout-shaped note is planted in the prose to keep the container-role
    // exclusion exercised. It has top and bottom borders at
    // full column width, so it would count as a rule if container roles were
    // not excluded.
    await page.evaluate(() => {
      const prose = document.querySelector('article .prose') ?? document.querySelector('article');
      const plant = document.createElement('div');
      plant.setAttribute('role', 'note');
      plant.setAttribute('data-test-plant', 'container-role');
      plant.style.borderTop = '1px solid rgb(0, 0, 0)';
      plant.style.borderBottom = '1px solid rgb(0, 0, 0)';
      plant.textContent = 'Planted note';
      prose?.appendChild(plant);
    });
    const analysis = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const alpha = (color: string): number => {
        const m = color.match(/rgba?\(([^)]+)\)/);
        if (!m) return 1;
        const parts = m[1].split(',').map((s) => parseFloat(s));
        return parts.length === 4 ? parts[3] : 1;
      };
      const sideOn = (
        cs: CSSStyleDeclaration,
        side: 'top' | 'right' | 'bottom' | 'left',
      ): boolean =>
        parseFloat(cs.getPropertyValue(`border-${side}-width`)) >= 1 &&
        alpha(cs.getPropertyValue(`border-${side}-color`)) > 0;
      // "Text column" per the contract: the named hook first, then the
      // nearest ancestor <article>, then the nearest ancestor with a
      // computed max-width, else <main>.
      const textColumnOf = (el: Element): Element => {
        const hooked = el.closest('[data-prose-column]');
        if (hooked) return hooked;
        const article = el.closest('article');
        if (article) return article;
        let node = el.parentElement;
        while (node) {
          if (getComputedStyle(node).maxWidth !== 'none') return node;
          node = node.parentElement;
        }
        return main;
      };
      const CONTAINER_ROLES = new Set(['note', 'alert', 'complementary']);
      const describe = (el: Element) => ({
        tag: el.tagName.toLowerCase(),
        className: (el.getAttribute('class') ?? '').slice(0, 60),
      });
      const rules: Array<ReturnType<typeof describe> & { ratio: number }> = [];
      const rejected: Array<ReturnType<typeof describe> & { reason: string }> =
        [];
      for (const el of Array.from(main.querySelectorAll('*'))) {
        const cs = getComputedStyle(el);
        const top = sideOn(cs, 'top');
        const bottom = sideOn(cs, 'bottom');
        const left = sideOn(cs, 'left');
        const right = sideOn(cs, 'right');
        const isHr = el.tagName === 'HR';
        if (!isHr && !top && !bottom) continue;
        if (
          el.tagName === 'ASIDE' ||
          CONTAINER_ROLES.has(el.getAttribute('role') ?? '')
        ) {
          rejected.push({ ...describe(el), reason: 'container role' });
          continue;
        }
        // Table internals (rows, cells, captions) are separators WITHIN a
        // single content block, not "section dividers painted between
        // blocks" (the shared definition's first sentence); the table's
        // own frame is excluded below as a four-sided box.
        if (el.closest('table')) {
          rejected.push({ ...describe(el), reason: 'table internal' });
          continue;
        }
        if (top && bottom && left && right) {
          rejected.push({ ...describe(el), reason: 'four-sided box' });
          continue;
        }
        // A divider paints on the horizontal axis only; side borders make
        // the element the edge of a box (a titled code block, a card).
        if (!isHr && (left || right)) {
          rejected.push({ ...describe(el), reason: 'side borders: box edge' });
          continue;
        }
        // A candidate inside a fully bordered ancestor is that box's
        // edge, not a section divider (VAL-DESIGN-018: "any four-sided
        // framed box contributes 0 ... no matter which of its borders is
        // visible"). The nearest bordered ancestor inside <main> decides:
        // a framed-table caveat strip carries only border-top itself but
        // sits inside a four-sided frame. Aligned with
        // chart-state-descriptions.spec.ts so the two counters agree.
        {
          let anc = el.parentElement;
          let rejectedAsBoxEdge = false;
          while (anc && anc !== main) {
            const acs = getComputedStyle(anc);
            const any = sideOn(acs, 'top') || sideOn(acs, 'right') || sideOn(acs, 'bottom') || sideOn(acs, 'left');
            if (any) {
              rejectedAsBoxEdge =
                sideOn(acs, 'top') &&
                sideOn(acs, 'right') &&
                sideOn(acs, 'bottom') &&
                sideOn(acs, 'left');
              break;
            }
            anc = anc.parentElement;
          }
          if (rejectedAsBoxEdge) {
            rejected.push({ ...describe(el), reason: 'inside a framed ancestor box' });
            continue;
          }
        }
        const column = textColumnOf(el);
        const columnWidth = column.getBoundingClientRect().width;
        const ratio =
          columnWidth === 0
            ? 0
            : el.getBoundingClientRect().width / columnWidth;
        if (ratio < 0.8) {
          rejected.push({
            ...describe(el),
            reason: `narrow: ${ratio.toFixed(2)} of its text column`,
          });
          continue;
        }
        rules.push({ ...describe(el), ratio: Math.round(ratio * 100) / 100 });
      }
      return { rules, rejected };
    });
    await page.locator('[data-test-plant="container-role"]').evaluate((el) => el.remove());
    expect(analysis, 'main element present').not.toBeNull();
    expect(
      analysis!.rules.length,
      `full-width rules: ${JSON.stringify(analysis!.rules)}`,
    ).toBeLessThanOrEqual(2);
    // The exclusions must actually fire on this dense article: the planted
    // note (container role), a bordered comparison table (table internals
    // inside a four-sided frame), and boxed content are each evaluated and
    // rejected rather than silently uncounted.
    const reasons = new Set(analysis!.rejected.map((r) => r.reason));
    expect(reasons, JSON.stringify(analysis!.rejected)).toContain(
      'container role',
    );
    expect(reasons, JSON.stringify(analysis!.rejected)).toContain(
      'four-sided box',
    );
    expect(reasons, JSON.stringify(analysis!.rejected)).toContain(
      'table internal',
    );
    // And visually: exactly two hairlines in the article column (header +
    // the apparatus divider), with the trailing sections rule-free.
    const sections = page.locator('article > section');
    const n = await sections.count();
    for (let i = 0; i < n; i += 1) {
      const borderTop = await sections.nth(i).evaluate(
        (el) => getComputedStyle(el).borderTopWidth,
      );
      expect(borderTop).toBe('0px');
    }
  });

  test('no control is boxed inside an already-bordered container (VAL-DESIGN-019)', async ({
    page,
  }) => {
    // The bound applies to the chrome surfaces: the sidebar, the mobile
    // header, the drawer, and the search surfaces. Bordered buttons inside
    // a module's interactive panel are content, not chrome.
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old sweep read every control inside the persistent
    // <aside> sidebar. The sidebar's controls now live in the "Site
    // navigation" panel and the top bar, so the same sweep reads both, and
    // the standard's unboxed control (radius 0, no fill) is checked on the
    // same population alongside the four-sided-border test.
    await page.setViewportSize({ width: 1440, height: 900 });
    const chromeControls = (scope: string) => `(() => {
        ${DEFS};
        const root = document.querySelector(${JSON.stringify(scope)});
        if (!root) return ['<no ${scope}>'];
        const hits = [];
        let population = 0;
        for (const el of root.querySelectorAll('button, a, [role="button"], [aria-hidden="true"]')) {
          if (!visible(el) || realInput(el)) continue;
          population += 1;
          const cs = getComputedStyle(el);
          const label = el.tagName + '.' + (el.getAttribute('class') || '').slice(0, 40);
          if (fullyBordered(el)) hits.push(label + ' boxed');
          if (el.getAttribute('aria-hidden') !== 'true') {
            const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
            if (radii.some((r) => parseFloat(r) !== 0)) hits.push(label + ' radius ' + radii.join(' '));
            if (alpha(cs.backgroundColor) > 0) hits.push(label + ' fill ' + cs.backgroundColor);
          }
        }
        if (population === 0) hits.push('<empty ${scope}>');
        return hits;
      })()`;
    for (const route of ['/', MODULE_ROUTE, '/playground']) {
      await page.goto(route);
      const inTopBar = await page.evaluate(chromeControls('header[data-site-topbar]'));
      expect(inTopBar, `boxed controls in the top bar on ${route}`).toEqual([]);
      await openArticlesPanel(page);
      const inPanel = await page.evaluate(
        chromeControls('[role="dialog"][aria-label="Site navigation"] > div:not([aria-hidden])'),
      );
      expect(inPanel, `boxed controls in the navigation panel on ${route}`).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeHidden();
    }
    // The /search surface: the whole page is search chrome.
    await page.goto('/search');
    const onSearch = await evaluateDefs<string[]>(page, 'doublyBoxed()');
    expect(onSearch).toEqual([]);
    // Text inputs keep their own border as a real affordance.
    await page.goto('/');
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the home search's accessible name was "Search"; the front
    // page's visible label is now "Search articles, sources and glossary"
    // (bf50f0f4, "Rebuild the home page as an encyclopedia front page").
    const input = page
      .getByRole('searchbox', { name: 'Search articles, sources and glossary', exact: true })
      .first();
    const border = await input.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(border).toBe('1px');
  });

  test('at 375px the drawer is separated by its scrim, not a border (VAL-DESIGN-019/020)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the "Open navigation menu" drawer trigger became the top
    // bar's "Articles" button, which opens the same "Site navigation"
    // dialog at every width, and the panel is no longer the dialog's
    // `.relative` child but its one child that is not the aria-hidden
    // scrim. The panel still has no border and no shadow, and the ink scrim
    // still carries its one edge, so every measurement below is unchanged.
    await openArticlesPanel(page);
    const metrics = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-label="Site navigation"]');
      const panel = dlg?.querySelector(':scope > div:not([aria-hidden])');
      const scrim = dlg?.querySelector(':scope > [aria-hidden]');
      if (!panel || !scrim) return null;
      const pcs = getComputedStyle(panel);
      const scs = getComputedStyle(scrim);
      const sr = scrim.getBoundingClientRect();
      // What separates the panel is the colour the scrim actually paints
      // over the page, so it is composited by the browser's own colour
      // engine rather than parsed out of the notation. Reading the alpha
      // instead would have called the previous paper-on-paper scrim an 80%
      // separation when it composited to the panel's own colour and
      // separated nothing.
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const pixel = (fills: string[]): [number, number, number] => {
        if (!ctx) return [-1, -1, -1];
        ctx.clearRect(0, 0, 1, 1);
        for (const fill of fills) {
          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, 1, 1);
        }
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return [data[0], data[1], data[2]];
      };
      const luminance = (rgb: [number, number, number]) => {
        const [r, g, b] = rgb.map((channel) => {
          const value = channel / 255;
          return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const pageBg = getComputedStyle(document.body).backgroundColor;
      const composited = pixel([pageBg, scs.backgroundColor]);
      const panelRgb = pixel([pcs.backgroundColor]);
      const light = Math.max(luminance(composited), luminance(panelRgb));
      const dark = Math.min(luminance(composited), luminance(panelRgb));
      return {
        left: pcs.borderLeftWidth,
        right: pcs.borderRightWidth,
        boxShadow: pcs.boxShadow,
        bg: pcs.backgroundColor,
        scrimBg: scs.backgroundColor,
        scrimOpacity: parseFloat(scs.opacity),
        canvasRoundTrip: pixel(['rgb(1, 2, 3)']),
        composited,
        panelRgb,
        separation: (light + 0.05) / (dark + 0.05),
        coverage: (sr.width * sr.height) / (innerWidth * innerHeight),
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.left).toBe('0px');
    expect(metrics!.right).toBe('0px');
    expect(metrics!.boxShadow).toBe('none');
    // A parse failure would composite to the page ground and read as no
    // separation at all, so the canvas is proved to work first.
    expect(metrics!.canvasRoundTrip).toEqual([1, 2, 3]);
    // The scrim carries the boundary on its own, because the panel has no
    // border and no shadow. WCAG 1.4.11 puts a visible boundary between two
    // adjacent areas at 3:1, so anything below that is not separating them.
    expect(metrics!.separation).toBeGreaterThanOrEqual(3);
    // The alpha lives in the colour, not in the opacity property, so the
    // panel above it stays fully opaque.
    expect(metrics!.scrimOpacity).toBeCloseTo(1, 3);
    expect(metrics!.coverage).toBeGreaterThanOrEqual(0.9);
    // Opaque panel background keeps the edge legible against the scrim.
    expect(
      /^rgb\(/.test(metrics!.bg) || metrics!.bg.endsWith(', 1)'),
    ).toBe(true);
    const found = await evaluateDefs<string[]>(page, 'doublyBoxed()');
    expect(found).toEqual([]);
  });

  test('every uppercase micro-label site-wide uses one tracking value (VAL-DESIGN-021a)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const ratios = new Set<number>();
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const labels = await evaluateDefs<Array<{ text: string; em: number }>>(
        page,
        'microLabels()',
      );
      for (const l of labels) ratios.add(l.em);
    }
    expect([...ratios]).toHaveLength(1);
  });

  test('no eyebrow text repeats across routes (VAL-DESIGN-021b)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const seen = new Map<string, string>();
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const brows = await evaluateDefs<Array<{ text: string }>>(page, 'eyebrows()');
      for (const b of brows) {
        const key = b.text.trim().replace(/\s+/g, ' ').toLowerCase();
        const prev = seen.get(key);
        expect(prev, `eyebrow "${b.text}" on both ${prev} and ${route}`).toBeUndefined();
        seen.set(key, route);
      }
    }
  });

  test('nav semantics survive the rework (VAL-DESIGN-022)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const baseline = JSON.parse(
      readFileSync(
        join(
          fileURLToPath(new URL('.', import.meta.url)),
          '../fixtures/nav-accessible-names.json',
        ),
        'utf8',
      ),
    ) as { linkCount: number; links: Array<{ href: string; name: string }> };

    // aria-current="page" belongs to the navigation entry for the current
    // route. A route the taxonomy does not list has no entry to mark, so it
    // exposes none: requiring one everywhere is what previously pushed the
    // state onto /search's <h1>, where it announced a heading as a
    // navigation position (VAL-B2-SHELL-002).
    const taxonomy = new Set(baseline.links.map(({ href }) => href));
    const listed = (route: string) =>
      taxonomy.has(route) || taxonomy.has(`${route}/`);
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the old reader counted aria-current="page" across the
    // document with the persistent <aside> sidebar on screen and required
    // the holder to sit in that <aside>. The sidebar's entries now live in
    // the "Site navigation" panel the top bar's "Articles" button opens, so
    // each route is read with the panel open: the page behind it is inert,
    // the count is taken over what is not inert, and the one holder has to
    // be a link inside the panel pointing at this route.
    const panel = page.getByRole('dialog', { name: 'Site navigation' });
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      await openArticlesPanel(page);
      const held = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-current="page"]')]
          .filter((el) => el.closest('[inert]') === null)
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            href: el.getAttribute('href'),
            inPanel:
              el.closest('[role="dialog"][aria-label="Site navigation"]') !== null,
          })),
      );
      expect(held.length, `aria-current count on ${route}`).toBe(
        listed(route) ? 1 : 0,
      );
      if (listed(route)) {
        // The one mark is a panel link pointing at this route, never a
        // heading or a decorative node standing in for one.
        expect(held[0].tag, `aria-current holder on ${route}`).toBe('a');
        expect(held[0].inPanel, `aria-current holder on ${route}`).toBe(true);
        expect(held[0].href?.replace(/\/?$/, '/')).toBe(route.replace(/\/?$/, '/'));
      }
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
    }

    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): "exactly one <aside> (the sidebar), even on an article
    // whose prose uses marginal notes" became "no <aside> at all": the
    // shell's navigation is the top bar's one `nav[aria-label="Site"]` and
    // the panel dialog, and the article's margin sidenotes still never
    // render as <aside>. The top bar's nav holds exactly the panel trigger
    // and the explainer link, with their semantics.
    await page.goto(MODULE_ROUTE);
    await expect(page.locator('aside')).toHaveCount(0);
    const siteNav = page.locator('header[data-site-topbar] nav[aria-label="Site"]');
    await expect(page.locator('nav[aria-label="Site"]')).toHaveCount(1);
    await expect(siteNav.locator('button, a[href]')).toHaveCount(2);
    const trigger = siteNav.getByRole('button', { name: 'Articles', exact: true });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-controls', 'mobile-nav-drawer');
    await expect(
      siteNav.getByRole('link', { name: 'How robots work', exact: true }),
    ).toHaveAttribute('href', '/how-robots-work/');

    // The marker contributes nothing to any accessible name.
    await openArticlesPanel(page);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('aside')).toHaveCount(0);
    const activeName = await panel
      .locator('a[aria-current="page"]')
      .ariaSnapshot();
    const activeEntry = baseline.links.find(
      (l) => l.href === '/manipulation/action-chunking/',
    );
    expect(activeName).toContain(`"${activeEntry?.name ?? ''}"`);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    // Every sidebar link's accessible name matches the pre-rework baseline,
    // read in the panel (its lockup first, then the taxonomy nav), the
    // sidebar's order.
    await page.goto('/');
    await openArticlesPanel(page);
    const buttons = panel
      .getByRole('navigation', { name: 'Robot Wiki taxonomy' })
      .getByRole('button');
    for (let i = 0; i < (await buttons.count()); i += 1) {
      const b = buttons.nth(i);
      if ((await b.getAttribute('aria-expanded')) === 'false') await b.click();
    }
    const links = panel.locator('a[href]');
    expect(await links.count()).toBe(baseline.linkCount);
    for (let i = 0; i < baseline.linkCount; i += 1) {
      const snapshot = await links.nth(i).ariaSnapshot();
      const match = snapshot.match(/"((?:[^"\\]|\\.)*)"/);
      const name = match ? match[1].replace(/\\"/g, '"') : snapshot.trim();
      expect(name, `link ${baseline.links[i].href}`).toBe(baseline.links[i].name);
      expect(await links.nth(i).getAttribute('href')).toBe(baseline.links[i].href);
    }
  });

  test('zero axe violations on the audited surfaces (VAL-DESIGN-022)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ['/manipulation/', MODULE_ROUTE]) {
      await page.goto(route);
      await settleTransitions(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `axe violations on ${route}`).toEqual([]);
    }
  });

  test('the protected treatments survive (panel and reading-column boundary, header border-b, focus outline)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the protected boundary was the sidebar's right edge, the
    // registered 1px `device:outer-rail` (anchor `#sidebar-rail`) running
    // the aside's full height at its right edge. The sidebar is gone, so
    // the shell's one structural division is now the boundary between the
    // chrome and the 960 px reading column: at rest no side chrome exists
    // and nothing fixed or sticky covers the column, and the panel, when
    // open, sits flush on the right edge for the full viewport height with
    // the column behind it made inert. Measured on home and an article.
    for (const route of ['/', MODULE_ROUTE]) {
      await page.goto(route);
      await expect(page.locator('aside')).toHaveCount(0);
      await expect(page.getByRole('dialog', { name: 'Site navigation' })).toHaveCount(0);
      const boundary = await page.evaluate(() => {
        const header = document.querySelector('header[data-site-topbar]');
        const main = document.querySelector('main');
        // The reading column: the article's prose, else the first sheet.
        const column =
          document.querySelector('main article .prose') ??
          document.querySelector('main .sheet');
        if (!header || !main || !column) return null;
        const cr = column.getBoundingClientRect();
        const ccs = getComputedStyle(column);
        const covering = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const position = getComputedStyle(el).position;
            if (position !== 'fixed' && position !== 'sticky') return false;
            if (column.contains(el) || el.contains(column)) return false;
            const r = el.getBoundingClientRect();
            const onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
            const overlaps =
              r.left < cr.right - 0.5 &&
              r.right > cr.left + 0.5 &&
              r.top < cr.bottom - 0.5 &&
              r.bottom > cr.top + 0.5;
            return onScreen && overlaps;
          })
          .map((el) => `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)}`);
        // On an article the sticky contents rail is the one piece of side
        // chrome left; its right edge is the column's left boundary.
        const rail = document.querySelector('main nav.article-toc');
        return {
          railGap: rail ? cr.left - rail.getBoundingClientRect().right : null,
          headerOverMain: header.getBoundingClientRect().bottom - main.getBoundingClientRect().top,
          headerWidth: header.getBoundingClientRect().width,
          columnTopBelowHeader: cr.top - header.getBoundingClientRect().bottom,
          columnContentWidth:
            cr.width - parseFloat(ccs.paddingLeft) - parseFloat(ccs.paddingRight),
          centring: Math.abs(cr.left - (document.documentElement.clientWidth - cr.right)),
          covering,
        };
      });
      expect(boundary, `reading column on ${route}`).not.toBeNull();
      expect(Math.abs(boundary!.headerOverMain), `top bar meets main on ${route}`).toBeLessThanOrEqual(1);
      expect(boundary!.headerWidth).toBeCloseTo(await page.evaluate(() => document.documentElement.clientWidth), 0);
      expect(boundary!.columnTopBelowHeader, `column below the top bar on ${route}`).toBeGreaterThanOrEqual(0);
      expect(boundary!.columnContentWidth, `column width on ${route}`).toBeGreaterThanOrEqual(880);
      expect(boundary!.columnContentWidth, `column width on ${route}`).toBeLessThanOrEqual(961);
      if (route === '/') {
        // Home's sheet is the centred 960 px column of the page frame.
        expect(boundary!.centring, `column centred on ${route}`).toBeLessThanOrEqual(1);
      } else {
        // The article sets the column between the contents rail and the
        // note margin, so the rail's right edge bounds it instead.
        expect(boundary!.railGap, `contents rail beside the column on ${route}`).not.toBeNull();
        expect(boundary!.railGap!, `contents rail beside the column on ${route}`).toBeGreaterThanOrEqual(0);
      }
      expect(boundary!.covering, `chrome over the reading column on ${route}`).toEqual([]);
    }
    await page.goto('/');
    await openArticlesPanel(page);
    const panelEdge = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-label="Site navigation"]');
      const panel = dlg?.querySelector(':scope > div:not([aria-hidden])');
      if (!panel) return null;
      const r = panel.getBoundingClientRect();
      return {
        rightOffset: Math.abs(r.right - document.documentElement.clientWidth),
        heightDiff: Math.abs(r.height - innerHeight),
        top: r.top,
        width: r.width,
        mainInert: document.querySelector('main')?.hasAttribute('inert') ?? false,
      };
    });
    expect(panelEdge).not.toBeNull();
    expect(panelEdge!.rightOffset).toBeLessThanOrEqual(1);
    expect(panelEdge!.heightDiff).toBeLessThanOrEqual(1);
    expect(panelEdge!.top).toBeCloseTo(0, 0);
    expect(panelEdge!.width).toBeCloseTo(400, 0);
    expect(panelEdge!.mainInert).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeHidden();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const headerBorder = await page
      .locator('header')
      .evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(headerBorder).toBe('1px');

    const link = page.locator('header').getByRole('link', { name: PUBLIC_IDENTITY });
    await link.focus();
    const outline = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        style: cs.outlineStyle,
        width: cs.outlineWidth,
        offset: cs.outlineOffset,
        color: cs.outlineColor,
      };
    });
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard; contract VAL-B2-COL-006): the global focus ring was the
    // locked 2px signal-blue rgb(36, 95, 255) outline with a 2px offset; it
    // is now exactly a 1px solid ink outline offset 2px. Pinned exactly, so
    // a 2px ring or a coloured one fails as the old pin failed a 1px ring.
    expect(outline.style).toBe('solid');
    expect(outline.width).toBe('1px');
    expect(outline.offset).toBe('2px');
    expect(outline.color).toBe(INK);
  });

  test('the wordmark and descriptor render in exactly the canonical lockups (VAL-DSBRAND-001/002)', async ({
    page,
  }) => {
    // Home hero: wordmark is the h1 text, descriptor exactly once.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const heroWordmark = await page
      .getByRole('heading', { level: 1 })
      .textContent();
    expect(heroWordmark?.trim()).toBe(PUBLIC_IDENTITY);
    const heroDescriptor = page
      .getByRole('region', { name: 'Introduction' })
      .getByText(PUBLIC_DESCRIPTOR, { exact: true });
    await expect(heroDescriptor).toHaveCount(1);
    // The descriptor is a home-hero lockup only: the shell repeats the
    // wordmark, never the descriptor (VAL-B2-ID-007).
    await expect(
      page.getByText(PUBLIC_DESCRIPTOR, { exact: true }),
    ).toHaveCount(1);

    // Desktop shell lockup at 1440px: wordmark link, no descriptor.
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the desktop sidebar's lockup became the top bar's, the
    // one shell lockup at every width.
    const topbar = page.locator('header[data-site-topbar]');
    await expect(topbar).toHaveCount(1);
    await expect(
      topbar.getByText(PUBLIC_DESCRIPTOR, { exact: true }),
    ).toHaveCount(0);
    const sidebarWordmark = await topbar
      .getByRole('link', { name: PUBLIC_IDENTITY })
      .textContent();
    expect(sidebarWordmark?.trim()).toBe(PUBLIC_IDENTITY);

    // Mobile header at 375px: wordmark present, descriptor omitted.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const headerWordmark = await page
      .locator('header')
      .getByRole('link', { name: PUBLIC_IDENTITY })
      .textContent();
    expect(headerWordmark?.trim()).toBe(PUBLIC_IDENTITY);
    await expect(
      page.locator('header').getByText(PUBLIC_DESCRIPTOR, { exact: true }),
    ).toHaveCount(0);
  });

  test('the locked type-scale and lockup metrics render at both breakpoints (VAL-DSTYPE-007)', async ({
    page,
  }) => {
    const metricsOf = (selector: string) =>
      page.locator(selector).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          family: cs.fontFamily,
          size: parseFloat(cs.fontSize),
          lineHeight: parseFloat(cs.lineHeight),
          weight: cs.fontWeight,
          tracking: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
          transform: cs.textTransform,
          text: (el.textContent ?? '').trim().slice(0, 30),
        };
      });
    const em = (m: { size: number; tracking: string }) =>
      parseFloat(m.tracking) / m.size;
    /**
     * The first family a computed font-family stack actually resolves to,
     * lowercased. Reading the HEAD matters because the whole computed
     * string always contains every fallback, so a check over it accepts
     * any leading family. Lowercasing matters because `next/font/local`
     * publishes the registered `Tektur Variable` under the runtime family
     * `tektur`; the proof that the rename still serves the registered
     * binary lives in tests/e2e/brand-v2-tektur-font-delivery.spec.ts,
     * which hashes the payload the browser fetched.
     */
    const firstFamily = (stack: string) =>
      (stack.split(',')[0] ?? '')
        .trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase();

    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard; contract/design-integrity.md VAL-B2-TYPE-003 to -007 and
    // -015, PANTHEON-SPEC.md "Type"): the bands and faces below replace the
    // brand-v2 scale of design-system 4.3 (Tektur 600 wordmark and h1s at
    // 52-68/88-120px, a 12px mono descriptor, 15/17px Tektur shell lockups,
    // Tektur article h1 at 34-44/48-64px, IBM Plex Sans 600 supporting
    // headings) at the same strength: every role is still measured at both
    // viewports for family, size band, line height, weight and tracking.
    // Home wordmark: the shared DM Sans 400 display h1, 40-48px at 375 and
    // 84-92px at 1440 with a 0.90-0.96 line height and slight negative
    // tracking; descriptor as the Geist 16px lead, sentence case. The
    // family assertion pins the FIRST resolved family, because a computed
    // font-family string still contains every fallback.
    const inBand = (
      metrics: { size: number; lineHeight: number },
      label: string,
      min: number,
      max: number,
    ) => {
      expect(metrics.size, `${label} size`).toBeGreaterThanOrEqual(min);
      expect(metrics.size, `${label} size`).toBeLessThanOrEqual(max);
      const ratio = metrics.lineHeight / metrics.size;
      expect(ratio, `${label} line height`).toBeGreaterThanOrEqual(0.9);
      expect(ratio, `${label} line height`).toBeLessThanOrEqual(0.96);
    };
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const homeH1Mobile = await metricsOf('main h1');
    inBand(homeH1Mobile, 'home wordmark at 375', 40, 48);
    expect(homeH1Mobile.weight).toBe('400');
    expect(firstFamily(homeH1Mobile.family)).toBe('dm sans');
    expect(em(homeH1Mobile)).toBeLessThan(0);
    expect(em(homeH1Mobile)).toBeGreaterThanOrEqual(-0.04);
    const heroDescriptor = await metricsOf('main .home-lockup p.page-lead');
    expect(heroDescriptor.size).toBeCloseTo(16, 5);
    expect(heroDescriptor.lineHeight / heroDescriptor.size).toBeCloseTo(1.62, 2);
    // Sentence case is load-bearing: an uppercase transform would render a
    // descriptor that no longer equals the locked string (VAL-B2-ID-002).
    expect(heroDescriptor.transform).toBe('none');
    expect(firstFamily(heroDescriptor.family)).toBe('geist');
    expect(heroDescriptor.text).toBe(PUBLIC_DESCRIPTOR.slice(0, 30));
    // The top bar's lockup, the one shell wordmark at every width: 17px
    // DM Sans 600, no descriptor.
    const mobileHeaderWordmark = await metricsOf('header[data-site-topbar] a[href="/"]');
    expect(mobileHeaderWordmark.size).toBeCloseTo(17, 5);
    expect(mobileHeaderWordmark.weight).toBe('600');
    expect(firstFamily(mobileHeaderWordmark.family)).toBe('dm sans');
    expect(mobileHeaderWordmark.text).toBe(PUBLIC_IDENTITY);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const homeH1Desktop = await metricsOf('main h1');
    inBand(homeH1Desktop, 'home wordmark at 1440', 84, 92);
    expect(homeH1Desktop.weight).toBe('400');
    expect(firstFamily(homeH1Desktop.family)).toBe('dm sans');
    expect(em(homeH1Desktop)).toBeLessThan(0);
    expect(em(homeH1Desktop)).toBeGreaterThanOrEqual(-0.04);
    const desktopWordmark = await metricsOf('header[data-site-topbar] a[href="/"]');
    expect(desktopWordmark.size).toBeCloseTo(17, 5);
    expect(desktopWordmark.weight).toBe('600');
    expect(firstFamily(desktopWordmark.family)).toBe('dm sans');
    expect(desktopWordmark.text).toBe(PUBLIC_IDENTITY);

    // Article h1 and the section ladder under it: the article h1 is the
    // same DM Sans 400 display h1 (VAL-B2-TYPE-007); the H2 is DM Sans 600
    // at about 20px, uppercase, tracked about +0.055em; the H3 is DM Sans
    // 600 at 16px in sentence case.
    const inRange = (
      value: number,
      label: string,
      min: number,
      max: number,
    ) => {
      expect(value, label).toBeGreaterThanOrEqual(min);
      expect(value, label).toBeLessThanOrEqual(max);
    };
    for (const [width, height, min, max] of [[375, 812, 40, 48], [1440, 900, 84, 92]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(MODULE_ROUTE);
      const articleH1 = await metricsOf('article h1');
      inRange(articleH1.size, `article h1 size at ${width}`, min, max);
      inRange(articleH1.lineHeight / articleH1.size, `article h1 line height at ${width}`, 0.9, 0.96);
      expect(firstFamily(articleH1.family)).toBe('dm sans');
      expect(articleH1.weight).toBe('400');
      expect(em(articleH1)).toBeLessThan(0);
      const proseH2 = await metricsOf('article .prose h2');
      inRange(proseH2.size, `prose h2 size at ${width}`, 19, 21);
      expect(firstFamily(proseH2.family)).toBe('dm sans');
      expect(proseH2.weight).toBe('600');
      expect(proseH2.transform).toBe('uppercase');
      expect(em(proseH2)).toBeCloseTo(0.055, 2);
      const proseH3 = await metricsOf('article .prose h3');
      inRange(proseH3.size, `prose h3 size at ${width}`, 15.5, 16.5);
      expect(firstFamily(proseH3.family)).toBe('dm sans');
      expect(proseH3.weight).toBe('600');
      expect(proseH3.transform).toBe('none');
    }
  });

  // Owner-approved successor (research-page standard, Josef, 10 October
  // 2026): the brand-v2 ladder (0, 2, 4, 8, 16, 24px) is replaced by square
  // corners everywhere, with 7px allowed only on code blocks (the `pre` box
  // and its pretty-code title cap). The allowed set narrows, so the sweep is
  // stricter than the ladder it succeeds.
  test('components use only square corners, 7px on code blocks (VAL-B2-SURF-001)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Population is derived exhaustively per route: every element in the
    // document is measured (not a hand-picked selector list), and the
    // non-empty population itself is asserted, so a selector drift that
    // matches nothing fails loudly rather than sweeping an empty set.
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const { offenders, population } = await page.evaluate(() => {
        // Data marks (legend swatches, dots) whose geometry carries meaning
        // are exempt. Every other first-party radius must be 0, except 7px
        // on a code block.
        const offenders: string[] = [];
        let population = 0;
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          population += 1;
          const cs = getComputedStyle(el);
          const radii = [
            cs.borderTopLeftRadius,
            cs.borderTopRightRadius,
            cs.borderBottomRightRadius,
            cs.borderBottomLeftRadius,
          ];
          const isCodeBlock = el.matches(
            '.prose pre, .prose [data-rehype-pretty-code-title]',
          );
          // The How Robots Work explainer (also mounted on home) is frozen
          // as it is by the owner (Josef, 12 October 2026: "Leave
          // /how-robots-work/ exactly as it is"), so it keeps the ladder it
          // shipped with rather than the square successor.
          const isFrozenExplainer = el.closest('[data-explainers]') !== null;
          for (const value of radii) {
            const px = parseFloat(value);
            if (Number.isNaN(px)) continue;
            const inScale =
              px === 0 ||
              (isCodeBlock && px === 7) ||
              (isFrozenExplainer && [2, 4, 8, 16, 24].includes(px));
            if (inScale) continue;
            const isSmallMark = rect.width <= 12 && rect.height <= 12;
            if (!isSmallMark) {
              offenders.push(
                `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)} radius ${value} (${rect.width}x${rect.height})`,
              );
              break;
            }
          }
        }
        return { offenders, population };
      });
      expect(
        population,
        `radius sweep population on ${route} must be non-empty`,
      ).toBeGreaterThan(0);
      expect(offenders, `non-scale radii on ${route}`).toEqual([]);
    }
  });

  test('product surfaces use only registered neutral elevation and no glass (VAL-B2-SURF-004/005)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Exhaustive per-route sweep of every element plus both
    // pseudo-elements for box-shadow/text-shadow values other than
    // none. Population count is asserted non-zero so the sweep cannot
    // pass by matching nothing. No filter is registered: company marks are
    // drawn as single-ink masks (VAL-B2-MAP-007, successor of 2026-10-19),
    // so a filter anywhere fails.
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const { offenders, population } = await page.evaluate(() => {
        const offenders: string[] = [];
        let population = 0;
        const check = (el: Element, pseudo: string) => {
          const cs = getComputedStyle(el, pseudo);
          population += 1;
          for (const prop of ['boxShadow', 'textShadow', 'filter', 'backdropFilter'] as const) {
            const value = cs[prop];
            if (prop === 'boxShadow' && value !== 'none') {
              const surfaceId = (el as HTMLElement).dataset.brandSurfaceId;
              const expectedBlur =
                surfaceId === 'surface:raised'
                  ? 8
                  : surfaceId === 'surface:floating'
                    ? 20
                    : null;
              const lengths = [...value.matchAll(/(-?[\d.]+)px/g)].map(
                (match) => Number(match[1]),
              );
              const blur = lengths[2] ?? Number.POSITIVE_INFINITY;
              const neutralInk =
                /rgba?\(\s*11[,\s]+\s*11[,\s]+\s*12(?:[,\s/]|\))/i.test(
                  value,
                );
              if (
                pseudo !== '' ||
                expectedBlur === null ||
                value.includes('inset') ||
                !neutralInk ||
                blur > expectedBlur
              ) {
                offenders.push(
                  `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)}${pseudo} box-shadow: ${value}`,
                );
              }
            }
            if (prop === 'textShadow' && value !== 'none') {
              offenders.push(
                `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)}${pseudo} text-shadow: ${value}`,
              );
            }
            if ((prop === 'filter' || prop === 'backdropFilter') && value !== 'none') {
              offenders.push(
                `${el.tagName}.${(el.getAttribute('class') ?? '').slice(0, 40)}${pseudo} ${prop}: ${value}`,
              );
            }
          }
        };
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          check(el, '');
          check(el, '::before');
          check(el, '::after');
        }
        return { offenders, population };
      });
      expect(
        population,
        `shadow sweep population on ${route} must be non-empty`,
      ).toBeGreaterThan(0);
      expect(offenders, `shadows/filters on ${route}`).toEqual([]);
    }
  });

  test('the engineering grid placement population is derived, not sampled (VAL-DSBRAND-005)', async ({ browser }) => {
    // One fresh context per route over the whole registry population runs
    // close to the default 30 s budget on its own.
    test.setTimeout(90_000);
    // The audited route set is derived from the module registry (the
    // same publishedModules() population every corpus gate uses) plus
    // the standalone chrome routes, so a new module route joins the
    // sweep automatically. On each route every element's background
    // image is inspected, and none may paint an engineering-grid device.
    const { publishedModules } = await import('../../data/modules');
    const routes = [
      '/',
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
      '/market-map/',
      '/playground/',
      '/search/',
      '/glossary/',
      '/credits/',
      '/a-z/',
    ];
    expect(routes.length).toBeGreaterThan(1 + 1); // home + at least one module
    for (const route of routes) {
      // One context per route, torn down before the next. Reusing a single
      // page across all 54 navigations retains every visited document plus
      // the playground's SwiftShader WebGL contexts in one renderer, and the
      // renderer is killed part-way through the walk on a loaded host. The
      // crash surfaces as `Target page, context or browser has been closed`
      // here or, when the walk just survives, as a sub-200ms failure in the
      // first test of the next spec file to reuse that browser.
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.goto(route);
        // Owner-approved successor (Josef, 2026-10-10, the research-page
        // standard; the dot grid was removed in 9154d672): the old pin read
        // "exactly one svg-grid background on /, the title sheet's
        // .engineering-grid, and none on any other route". Surfaces are
        // plain paper now, so on the same derived population no route
        // paints an engineering-grid device: no svg background on any
        // element, no .engineering-grid node and no
        // registered `device:dot-grid`, and home's title sheet (the
        // Introduction masthead that held the grid) paints no image.
        const { grids, devices, population } = await page.evaluate(() => {
          let population = 0;
          const grids: string[] = [];
          for (const el of Array.from(document.querySelectorAll('*'))) {
            population += 1;
            const cs = getComputedStyle(el);
            if (cs.backgroundImage.includes('svg')) {
              grids.push(
                `${el.tagName}.${el.getAttribute('class') ?? ''}`.slice(0, 60),
              );
            }
          }
          const devices = document.querySelectorAll(
            '.engineering-grid, [data-brand-device-id="device:dot-grid"], [data-brand-motif="dot-grid"]',
          ).length;
          return { grids, devices, population };
        });
        expect(population, `element population on ${route}`).toBeGreaterThan(0);
        expect(grids, `svg-grid backgrounds on ${route}`).toEqual([]);
        expect(devices, `engineering-grid devices on ${route}`).toBe(0);
        if (route === '/') {
          const sheet = await page.evaluate(() => {
            const masthead = document.querySelector('main section[aria-label="Introduction"]');
            if (!masthead) return 'missing';
            const images = [masthead, ...masthead.querySelectorAll('*')].flatMap((el) =>
              ['', '::before', '::after']
                .map((pseudo) => getComputedStyle(el, pseudo).backgroundImage)
                .filter((value) => value !== 'none'),
            );
            return images.length === 0 ? 'plain-title-sheet' : `painted: ${images.join(' | ')}`;
          });
          expect(sheet).toBe('plain-title-sheet');
        }
      } finally {
        await context.close();
      }
    }
  });
});
