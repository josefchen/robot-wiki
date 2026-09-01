import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** The active marker: the aria-hidden 2px rule inside the active link. */
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
    expect(m!.markerBorderLeft).toBe('2px');
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
      // The scrim's separation is its background alpha, which must parse
      // to exactly 0.8 (80%). Tailwind 4 compiles bg-bg/80 to
      // color-mix(in oklab, ... 80%), and the computed value resolves
      // through several notations (rgba, color(srgb r g b / a),
      // color-mix with a resolved ratio), so every channel is captured
      // and the alpha is extracted from whichever notation appears.
      const bg = scs.backgroundColor;
      let scrimAlpha = 1;
      const rgba = bg.match(/rgba?\(([^)]+)\)/);
      if (rgba) {
        const parts = rgba[1].split(',').map((s) => parseFloat(s));
        if (parts.length === 4) scrimAlpha = parts[3];
      } else {
        const fnAlpha = bg.match(/\/\s*([\d.]+)%?\s*\)/);
        if (fnAlpha) {
          scrimAlpha = parseFloat(fnAlpha[1]);
          if (bg.match(/\/\s*[\d.]+%\s*\)/)) scrimAlpha /= 100;
        } else {
          const mix = bg.match(/color-mix\([^)]*?\s([\d.]+)%\s*\)/);
          if (mix) scrimAlpha = parseFloat(mix[1]) / 100;
        }
      }
      return {
        left: pcs.borderLeftWidth,
        right: pcs.borderRightWidth,
        boxShadow: pcs.boxShadow,
        bg: pcs.backgroundColor,
        scrimBg: bg,
        scrimAlpha,
        scrimOpacity: parseFloat(scs.opacity),
        coverage: (sr.width * sr.height) / (innerWidth * innerHeight),
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.left).toBe('0px');
    expect(metrics!.right).toBe('0px');
    expect(metrics!.boxShadow).toBe('none');
    // Exact 80% scrim background alpha (VAL-DSSURFACE-020): the parsed
    // rgba alpha is 0.8, not merely positive, and not the opacity
    // property (which stays 1; the alpha lives in the colour).
    expect(metrics!.scrimAlpha).toBeCloseTo(0.8, 3);
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

    for (const route of AUDITED_ROUTES) {
      await page.goto(route);
      const current = await page.locator('[aria-current="page"]').count();
      expect(current, `aria-current count on ${route}`).toBe(1);
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

  test('the protected treatments survive (sidebar border-r, header border-b, focus outline)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const asideBorder = await page
      .locator('aside')
      .evaluate((el) => getComputedStyle(el).borderRightWidth);
    expect(asideBorder).toBe('1px');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const headerBorder = await page
      .locator('header')
      .evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(headerBorder).toBe('1px');

    const link = page.locator('header').getByRole('link', { name: 'robot-wiki' });
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
    expect(heroWordmark?.trim()).toBe('robot-wiki');
    const heroDescriptor = page
      .getByRole('region', { name: 'Introduction' })
      .getByText('Robotics encyclopaedia', { exact: true });
    await expect(heroDescriptor).toHaveCount(1);

    // Desktop sidebar lockup at 1440px: wordmark link plus descriptor,
    // exactly once each, and no other lockup on the page carries it.
    const sidebarDescriptor = page
      .locator('aside')
      .getByText('Robotics encyclopaedia', { exact: true });
    await expect(sidebarDescriptor).toHaveCount(1);
    const sidebarWordmark = await page
      .locator('aside')
      .getByRole('link', { name: 'robot-wiki' })
      .textContent();
    expect(sidebarWordmark?.trim()).toBe('robot-wiki');

    // Mobile header at 375px: wordmark present, descriptor omitted.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const headerWordmark = await page
      .locator('header')
      .getByRole('link', { name: 'robot-wiki' })
      .textContent();
    expect(headerWordmark?.trim()).toBe('robot-wiki');
    await expect(
      page
        .locator('header')
        .getByText('Robotics encyclopaedia', { exact: true }),
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

    // Home wordmark: 48px/48px below sm, 60px/60px from sm, Sans 600,
    // tracking -0.035em; descriptor 10px mono uppercase 0.14em.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const homeH1Mobile = await metricsOf('main h1');
    expect(homeH1Mobile.size).toBeCloseTo(48, 5);
    expect(homeH1Mobile.lineHeight).toBeCloseTo(48, 5);
    expect(homeH1Mobile.weight).toBe('600');
    expect(homeH1Mobile.family).toContain('IBM Plex Sans');
    expect(em(homeH1Mobile)).toBeCloseTo(-0.035, 2);
    const heroDescriptor = await metricsOf(
      'main [aria-label="Introduction"] p.font-mono',
    );
    expect(heroDescriptor.size).toBeCloseTo(10, 5);
    expect(heroDescriptor.transform).toBe('uppercase');
    expect(heroDescriptor.family).toContain('IBM Plex Mono');
    expect(em(heroDescriptor)).toBeCloseTo(0.14, 2);
    // Mobile header lockup: 15px Sans 600 wordmark, no descriptor.
    const mobileHeaderWordmark = await metricsOf('header a');
    expect(mobileHeaderWordmark.size).toBeCloseTo(15, 5);
    expect(mobileHeaderWordmark.weight).toBe('600');
    expect(mobileHeaderWordmark.family).toContain('IBM Plex Sans');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const homeH1Desktop = await metricsOf('main h1');
    expect(homeH1Desktop.size).toBeCloseTo(60, 5);
    expect(homeH1Desktop.lineHeight).toBeCloseTo(60, 5);
    // Desktop sidebar lockup: 17px Sans 600 wordmark, 9px mono
    // uppercase descriptor at 0.14em.
    const sidebarWordmark = await metricsOf('aside a[href="/"]');
    expect(sidebarWordmark.size).toBeCloseTo(17, 5);
    expect(sidebarWordmark.weight).toBe('600');
    expect(sidebarWordmark.family).toContain('IBM Plex Sans');
    const sidebarDescriptor = await page
      .locator('aside')
      .getByText('Robotics encyclopaedia', { exact: true })
      .evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          family: cs.fontFamily,
          size: parseFloat(cs.fontSize),
          tracking: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
          transform: cs.textTransform,
        };
      });
    expect(sidebarDescriptor.size).toBeCloseTo(9, 5);
    expect(sidebarDescriptor.transform).toBe('uppercase');
    expect(sidebarDescriptor.family).toContain('IBM Plex Mono');
    expect(parseFloat(sidebarDescriptor.tracking) / sidebarDescriptor.size).toBeCloseTo(
      0.14,
      2,
    );

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
    expect(articleH1Desktop.family).toContain('IBM Plex Sans');
    expect(articleH1Desktop.weight).toBe('600');
    const proseH2 = await metricsOf('article .prose h2');
    expect(proseH2.size).toBeCloseTo(22, 5);
    expect(proseH2.family).toContain('IBM Plex Sans');
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
