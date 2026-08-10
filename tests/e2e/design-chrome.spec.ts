import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
];

/** The shared definitions from contract/design-integrity.md, in-page. */
const DEFS = `
function alpha(color) {
  const m = color.match(/rgba?\\(([^)]+)\\)/);
  if (!m) return 1;
  const parts = m[1].split(',').map((s) => parseFloat(s));
  return parts.length === 4 ? parts[3] : 1;
}
function visible(el) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
}
function fullyBordered(el) {
  const cs = getComputedStyle(el);
  return ['Top', 'Right', 'Bottom', 'Left'].every(
    (s) => parseFloat(cs['border' + s + 'Width']) >= 1 && alpha(cs['border' + s + 'Color']) > 0,
  );
}
function realInput(el) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.hasAttribute('contenteditable');
}
function microLabels() {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (text.length < 3) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs > 15) continue;
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    if (ls / fs < 0.02) continue;
    const upper = cs.textTransform === 'uppercase' || (text === text.toUpperCase() && /[A-Z]/.test(text));
    if (!upper || !visible(el)) continue;
    out.push({ text, em: Math.round((ls / fs) * 1000) / 1000 });
  }
  return out;
}
function eyebrows() {
  const headings = [...document.querySelectorAll('h1, h2, h3')];
  return microLabels().filter((l) => {
    const el = [...document.querySelectorAll('*')].find(
      (e) => e.children.length === 0 && (e.textContent || '').trim() === l.text,
    );
    if (!el) return false;
    if (el.tagName === 'LABEL') return false; // a control's own label is not an eyebrow
    const r = el.getBoundingClientRect();
    return headings.some((h) => {
      const hr = h.getBoundingClientRect();
      return hr.top - r.bottom >= -1 && hr.top - r.bottom <= 48 && Math.abs(hr.left - r.left) <= 8;
    });
  });
}
function doublyBoxed() {
  const out = [];
  for (const el of document.querySelectorAll('button, a, [role="button"], [aria-hidden="true"]')) {
    if (!visible(el) || realInput(el) || !fullyBordered(el)) continue;
    let anc = el.parentElement;
    let nested = false;
    while (anc) {
      const cs = getComputedStyle(anc);
      const any = ['Top', 'Right', 'Bottom', 'Left'].some(
        (s) => parseFloat(cs['border' + s + 'Width']) >= 1 && alpha(cs['border' + s + 'Color']) > 0,
      );
      if (any) { nested = fullyBordered(anc); break; }
      anc = anc.parentElement;
    }
    let flush = false;
    const r = el.getBoundingClientRect();
    for (const sib of [el.previousElementSibling, el.nextElementSibling]) {
      if (!sib || realInput(sib) || !fullyBordered(sib)) continue;
      const sr = sib.getBoundingClientRect();
      const hGap = Math.max(r.left - sr.right, sr.left - r.right);
      const vGap = Math.max(r.top - sr.bottom, sr.top - r.bottom);
      if (hGap < 4 && vGap < 4) flush = true;
    }
    if (nested || flush) out.push(el.tagName + '.' + (el.getAttribute('class') || '').slice(0, 40));
  }
  return out;
}
`;

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
    const rules = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return [];
      const mainW = main.getBoundingClientRect().width;
      const out: string[] = [];
      for (const el of main.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 0.8 * mainW) continue;
        const opaque = (c: string) => !c.startsWith('rgba') || parseFloat(c.split(',')[3] ?? '1') > 0;
        const top = parseFloat(cs.borderTopWidth) >= 1 && opaque(cs.borderTopColor);
        const bottom = parseFloat(cs.borderBottomWidth) >= 1 && opaque(cs.borderBottomColor);
        if (top || bottom) out.push(el.tagName);
      }
      return out;
    });
    expect(rules.length).toBeLessThanOrEqual(2);
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
      return {
        left: pcs.borderLeftWidth,
        right: pcs.borderRightWidth,
        bg: pcs.backgroundColor,
        scrimOpacity: parseFloat(scs.opacity),
        coverage: (sr.width * sr.height) / (innerWidth * innerHeight),
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.left).toBe('0px');
    expect(metrics!.right).toBe('0px');
    expect(metrics!.scrimOpacity).toBeGreaterThan(0);
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
        join(__dirname, '../fixtures/nav-accessible-names.json'),
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
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
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
    const outline = await link.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(1);
  });
});
