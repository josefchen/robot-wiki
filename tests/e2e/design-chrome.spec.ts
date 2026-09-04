import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
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

/** The active marker: the registered aria-hidden rail inside the active link. */
async function markerMetrics(page: Page, route: string) {
  await page.goto(route);
  return page.evaluate(() => {
    const link = document.querySelector('aside a[aria-current="page"]');
    const aside = document.querySelector('aside');
    if (!link || !aside) return null;
    const marker = link.querySelector('[aria-hidden="true"]');
    if (!marker) return null;
    const mcs = getComputedStyle(marker);
    const lcs = getComputedStyle(link);
    const mr = marker.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    return {
      markerBoxShadow: mcs.boxShadow,
      markerRadii: [
        mcs.borderTopLeftRadius,
        mcs.borderTopRightRadius,
        mcs.borderBottomLeftRadius,
        mcs.borderBottomRightRadius,
      ],
      markerBorderLeft: mcs.borderLeftWidth,
      markerBorderColour: mcs.borderLeftColor,
      markerDeviceId: marker.getAttribute('data-brand-device-id'),
      linkBoxShadow: lcs.boxShadow,
      heightDiff: Math.abs(mr.height - lr.height),
      leftOffset: mr.left - aside.getBoundingClientRect().left,
    };
  });
}

test.describe('design chrome discipline', () => {
  test('the active marker is a flat full-height rule, never a clipped shadow (VAL-DESIGN-016)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const m = await markerMetrics(page, MODULE_ROUTE);
    expect(m).not.toBeNull();
    expect(m!.linkBoxShadow).toBe('none');
    expect(m!.markerBoxShadow).toBe('none');
    expect(m!.markerRadii).toEqual(['0px', '0px', '0px', '0px']);
    // The v2 mark is the registered active-interval rail: a real element at
    // the design system's 3px rail weight in selection lime, not the v1 2px
    // signal-blue border. Asserting the registry id as well as the geometry
    // means a hand-rolled span that merely looks the same still fails.
    expect(m!.markerDeviceId).toBe('device:active-interval-rail');
    expect(m!.markerBorderLeft).toBe('3px');
    expect(m!.markerBorderColour).toBe('rgb(198, 255, 25)');
    expect(m!.heightDiff).toBeLessThanOrEqual(1);
  });

  test('the marker sits at one indent depth for every entry kind (VAL-DESIGN-017)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
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
    expect(analysis, 'main element present').not.toBeNull();
    expect(
      analysis!.rules.length,
      `full-width rules: ${JSON.stringify(analysis!.rules)}`,
    ).toBeLessThanOrEqual(2);
    // The exclusions must actually fire on this dense article: it renders
    // Callouts and an Aside (container roles), a bordered comparison
    // table (table internals inside a four-sided frame), and boxed
    // content, and each is evaluated and rejected rather than silently
    // uncounted.
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
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ['/', MODULE_ROUTE, '/playground']) {
      await page.goto(route);
      const inSidebar = await page.evaluate(`(() => {
        ${DEFS};
        const aside = document.querySelector('aside');
        if (!aside) return ['<no aside>'];
        const hits = [];
        for (const el of aside.querySelectorAll('button, a, [role="button"], [aria-hidden="true"]')) {
          if (!visible(el) || realInput(el) || !fullyBordered(el)) continue;
          hits.push(el.tagName + '.' + (el.getAttribute('class') || '').slice(0, 40));
        }
        return hits;
      })()`);
      expect(inSidebar, `boxed controls in the sidebar on ${route}`).toEqual([]);
    }
    // The /search surface: the whole page is search chrome.
    await page.goto('/search');
    const onSearch = await evaluateDefs<string[]>(page, 'doublyBoxed()');
    expect(onSearch).toEqual([]);
    // Text inputs keep their own border as a real affordance.
    await page.goto('/');
    const input = page.getByRole('searchbox', { name: 'Search', exact: true }).first();
    const border = await input.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(border).toBe('1px');
  });

  test('at 375px the drawer is separated by its scrim, not a border (VAL-DESIGN-019/020)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(dialog).toBeVisible();
    const metrics = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const panel = dlg?.querySelector('.relative');
      const scrim = dlg?.querySelector('[aria-hidden]');
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
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const marks = page.locator('[aria-current="page"]');
      expect(await marks.count(), `aria-current count on ${route}`).toBe(
        listed(route) ? 1 : 0,
      );
      if (!listed(route)) continue;
      // The one mark is a sidebar link pointing at this route, never a
      // heading or a decorative node standing in for one.
      const held = await marks.evaluate((el) => ({
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute('href'),
        inAside: el.closest('aside') !== null,
      }));
      expect(held.tag, `aria-current holder on ${route}`).toBe('a');
      expect(held.inAside, `aria-current holder on ${route}`).toBe(true);
      expect(held.href?.replace(/\/?$/, '/')).toBe(route.replace(/\/?$/, '/'));
    }

    // Exactly one <aside> in the document, even on an article whose prose
    // uses marginal notes (they render role="note", not <aside>).
    await page.goto(MODULE_ROUTE);
    await expect(page.locator('aside')).toHaveCount(1);

    // The marker contributes nothing to any accessible name.
    await page.goto(MODULE_ROUTE);
    const activeName = await page
      .locator('aside a[aria-current="page"]')
      .ariaSnapshot();
    const activeEntry = baseline.links.find(
      (l) => l.href === '/manipulation/action-chunking/',
    );
    expect(activeName).toContain(`"${activeEntry?.name ?? ''}"`);

    // Every sidebar link's accessible name matches the pre-rework baseline.
    await page.goto('/');
    const aside = page.locator('aside');
    const buttons = aside.getByRole('button');
    for (let i = 0; i < (await buttons.count()); i += 1) {
      const b = buttons.nth(i);
      if ((await b.getAttribute('aria-expanded')) === 'false') await b.click();
    }
    const links = aside.locator('a[href]');
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

  test('the protected treatments survive (sidebar right boundary, header border-b, focus outline)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // The sidebar's right boundary is unchanged in weight and position but
    // is now the registered outer rail rather than a border on the <aside>,
    // so the shell's one structural division has a registry identity the
    // primitive sweep can own. Measured, not assumed: 1px, full height, at
    // the aside's right edge.
    const rail = await page.locator('aside').evaluate((el) => {
      const device = el.querySelector('[data-brand-device-id="device:outer-rail"]');
      if (!device) return null;
      const cs = getComputedStyle(device);
      const box = device.getBoundingClientRect();
      const host = el.getBoundingClientRect();
      return {
        width: cs.borderLeftWidth,
        colour: cs.borderLeftColor,
        edgeOffset: Math.abs(box.right - host.right),
        heightDiff: Math.abs(box.height - host.height),
        anchor: device.getAttribute('data-brand-anchor-selector'),
      };
    });
    expect(rail).not.toBeNull();
    expect(rail!.width).toBe('1px');
    expect(rail!.anchor).toBe('#sidebar-rail');
    expect(rail!.edgeOffset).toBeLessThanOrEqual(1);
    expect(rail!.heightDiff).toBeLessThanOrEqual(1);
    expect(rail!.colour).not.toBe('rgba(0, 0, 0, 0)');

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
      return { width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
    });
    // The global focus ring is exactly the locked 2px signal-blue outline
    // with a 2px offset (VAL-A11Y-002/VAL-DSA11Y-002). A >= 1px bound
    // would pass a 1px ring the contract forbids.
    expect(outline.width).toBe('2px');
    expect(outline.offset).toBe('2px');
    expect(outline.color).toBe('rgb(36, 95, 255)');
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

    // Desktop sidebar lockup at 1440px: wordmark link, no descriptor.
    await expect(
      page.locator('aside').getByText(PUBLIC_DESCRIPTOR, { exact: true }),
    ).toHaveCount(0);
    const sidebarWordmark = await page
      .locator('aside')
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

    // Home wordmark: the bands VAL-B2-TYPE-006 locks, 52-68px at 375 and
    // 88-120px at 1440 with a 0.88-0.98 line height, at weight 600 and
    // tracking -0.035em; descriptor 12px mono, sentence case. Stated as
    // bands rather than as the two literals the pre-v2 scale shipped,
    // because the size is fluid between them and the contract measures
    // the two viewports below. The family assertion pins the FIRST
    // resolved family, because a computed font-family string still
    // contains every fallback and a `toContain('IBM Plex Sans')` check
    // would pass on a Tektur-led stack and on a Plex-led one alike.
    const inBand = (
      metrics: { size: number; lineHeight: number },
      label: string,
      min: number,
      max: number,
    ) => {
      expect(metrics.size, `${label} size`).toBeGreaterThanOrEqual(min);
      expect(metrics.size, `${label} size`).toBeLessThanOrEqual(max);
      const ratio = metrics.lineHeight / metrics.size;
      expect(ratio, `${label} line height`).toBeGreaterThanOrEqual(0.88);
      expect(ratio, `${label} line height`).toBeLessThanOrEqual(0.98);
    };
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const homeH1Mobile = await metricsOf('main h1');
    inBand(homeH1Mobile, 'home wordmark at 375', 52, 68);
    expect(homeH1Mobile.weight).toBe('600');
    expect(firstFamily(homeH1Mobile.family)).toBe('tektur');
    expect(em(homeH1Mobile)).toBeCloseTo(-0.035, 2);
    const heroDescriptor = await metricsOf(
      'main [aria-label="Introduction"] p.font-mono',
    );
    expect(heroDescriptor.size).toBeCloseTo(12, 5);
    // Sentence case is load-bearing: an uppercase transform would render a
    // descriptor that no longer equals the locked string (VAL-B2-ID-002).
    expect(heroDescriptor.transform).toBe('none');
    expect(firstFamily(heroDescriptor.family)).toBe('ibm plex mono');
    expect(heroDescriptor.text).toBe(PUBLIC_DESCRIPTOR.slice(0, 30));
    // Mobile header lockup: 15px Tektur 600 wordmark, no descriptor.
    const mobileHeaderWordmark = await metricsOf('header a');
    expect(mobileHeaderWordmark.size).toBeCloseTo(15, 5);
    expect(mobileHeaderWordmark.weight).toBe('600');
    expect(firstFamily(mobileHeaderWordmark.family)).toBe('tektur');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const homeH1Desktop = await metricsOf('main h1');
    inBand(homeH1Desktop, 'home wordmark at 1440', 88, 120);
    expect(homeH1Desktop.weight).toBe('600');
    expect(firstFamily(homeH1Desktop.family)).toBe('tektur');
    expect(em(homeH1Desktop)).toBeCloseTo(-0.035, 2);
    // Desktop sidebar lockup: 17px Tektur 600 wordmark, no descriptor
    // (design-system 3.5 makes the shell descriptor optional).
    const sidebarWordmark = await metricsOf('aside a[href="/"]');
    expect(sidebarWordmark.size).toBeCloseTo(17, 5);
    expect(sidebarWordmark.weight).toBe('600');
    expect(firstFamily(sidebarWordmark.family)).toBe('tektur');
    expect(sidebarWordmark.text).toBe(PUBLIC_IDENTITY);

    // Article h1: 32px/35.8px below sm, 40px/44.8px from sm, Sans 600,
    // tracking -0.025em; prose h2 22px and h3 18px, Sans 600.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(MODULE_ROUTE);
    const articleH1Mobile = await metricsOf('article h1');
    expect(articleH1Mobile.size).toBeCloseTo(32, 5);
    expect(articleH1Mobile.lineHeight).toBeCloseTo(35.84, 1);
    expect(em(articleH1Mobile)).toBeCloseTo(-0.025, 2);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(MODULE_ROUTE);
    const articleH1Desktop = await metricsOf('article h1');
    expect(articleH1Desktop.size).toBeCloseTo(40, 5);
    expect(articleH1Desktop.lineHeight).toBeCloseTo(44.8, 1);
    expect(firstFamily(articleH1Desktop.family)).toBe('tektur');
    expect(articleH1Desktop.weight).toBe('600');
    const proseH2 = await metricsOf('article .prose h2');
    expect(proseH2.size).toBeCloseTo(22, 5);
    expect(firstFamily(proseH2.family)).toBe('ibm plex sans');
    const proseH3 = await metricsOf('article .prose h3');
    expect(proseH3.size).toBeCloseTo(18, 5);
  });

  test('components use only the brand-v2 radius ladder (VAL-B2-SURF-001)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Population is derived exhaustively per route: every element in the
    // document is measured (not a hand-picked selector list), and the
    // non-empty population itself is asserted, so a selector drift that
    // matches nothing fails loudly rather than sweeping an empty set.
    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const { offenders, population } = await page.evaluate(() => {
        // Data marks (legend swatches, dots) whose geometry carries meaning
        // are exempt. Every other first-party radius must resolve to the
        // sealed brand-v2 ladder: 0, 2, 4, 8, 16, or 24px.
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
          for (const value of radii) {
            const px = parseFloat(value);
            if (Number.isNaN(px)) continue;
            const inScale = [0, 2, 4, 8, 16, 24].includes(px);
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
    // pass by matching nothing.
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

  test('the engineering grid placement population is derived, not sampled (VAL-DSBRAND-005)', async ({ page }) => {
    // The audited route set is derived from the module registry (the
    // same publishedModules() population every corpus gate uses) plus
    // the standalone chrome routes, so a new module route joins the
    // sweep automatically. On each route every element's background
    // image is inspected; the only legal SVG-grid background is the
    // home title sheet's single .engineering-grid.
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
      await page.goto(route);
      const { grids, population } = await page.evaluate(() => {
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
        return { grids, population };
      });
      expect(population, `element population on ${route}`).toBeGreaterThan(0);
      if (route === '/') {
        expect(
          grids,
          'home grid inventory is exactly the title sheet',
        ).toHaveLength(1);
        expect(grids[0]).toMatch(/^DIV\.engineering-grid/);
        const on = await page.evaluate(() => {
          const grid = document.querySelector('.engineering-grid');
          if (!grid) return 'missing';
          if (grid.matches('body, main, article')) return 'on-structure';
          if (grid.closest('.prose')) return 'behind-prose';
          return 'title-sheet';
        });
        expect(on).toBe('title-sheet');
      } else {
        expect(grids, `svg-grid backgrounds on ${route}`).toEqual([]);
      }
    }
  });
});
