import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CORE_DOMAINS } from '../../data/domains';

/**
 * Structural contract for the restructured home page (2026-08-10). Encodes
 * the measurable bounds from contract/design-integrity.md and
 * contract/foundation-navigation.md: dense typographic domain index instead
 * of a card grid, the live interactive inside the first 1200px, a visual
 * playground entry point, bounded bordered boxes and micro-labels, and
 * substantive hero prose.
 */

const DOMAIN_ENTRIES = [
  ['Manipulation & Learned Policies', '/manipulation/'],
  ['RL, Sim-to-Real & Locomotion', '/rl-sim2real/'],
  ['World Models', '/world-models/'],
  ['Data, Hardware & Evaluation', '/data-hardware/'],
  ['Classical Foundations', '/classical/'],
  ['Frontier & Open Problems', '/frontier/'],
  ['Adjacent Domains', '/adjacent/'],
] as const;

/** Elements inside main bordered on all four sides and at least 80px tall. */
function countBorderedBoxes(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return -1;
    let count = 0;
    for (const el of Array.from(main.querySelectorAll('*'))) {
      const cs = getComputedStyle(el);
      const widths = [
        cs.borderTopWidth,
        cs.borderRightWidth,
        cs.borderBottomWidth,
        cs.borderLeftWidth,
      ].map((w) => parseFloat(w));
      const colors = [
        cs.borderTopColor,
        cs.borderRightColor,
        cs.borderBottomColor,
        cs.borderLeftColor,
      ];
      const opaque = colors.every(
        (c) => c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)',
      );
      const rect = el.getBoundingClientRect();
      if (widths.every((w) => w >= 1) && opaque && rect.height >= 80) {
        count += 1;
      }
    }
    return count;
  });
}

/** Leaf elements styled as uppercase letterspaced micro-labels. */
function countMicroLabels(page: Page): Promise<number> {
  return page.evaluate(() => {
    let count = 0;
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.children.length > 0) continue;
      const text = (el.textContent ?? '').trim();
      if (text.length < 3) continue;
      const cs = getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize);
      if (fontSize > 15) continue;
      const spacing =
        cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      if (spacing < 0.02 * fontSize) continue;
      const upper =
        cs.textTransform === 'uppercase' ||
        (text === text.toUpperCase() && /[A-Z]/.test(text));
      if (upper) count += 1;
    }
    return count;
  });
}

test.describe('home page', () => {
  test('renders the robot-wiki wordmark heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'robot-wiki' }),
    ).toBeVisible();
  });

  test('has zero axe accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('first viewport carries wordmark, overview, and all seven domain links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const wordmark = page.getByRole('heading', {
      level: 1,
      name: 'robot-wiki',
    });
    const overview = page.getByText(/encyclopedia of modern robotics/);
    // The full box must sit inside the first viewport (VAL-HOME-001/
    // VAL-DSHOME-001): a top edge above y=900 with the body hanging below
    // it is a clipped premise, and checking y alone would pass it.
    const insideFirstViewport = async (
      locator: ReturnType<Page['locator']>,
      label: string,
    ) => {
      const box = await locator.boundingBox();
      expect(box, `${label} visible in first viewport`).not.toBeNull();
      expect(box!.y, `${label} top above fold`).toBeGreaterThanOrEqual(0);
      expect(
        box!.y + box!.height,
        `${label} bottom edge must be at or before y=900`,
      ).toBeLessThanOrEqual(900);
    };
    await insideFirstViewport(wordmark, 'hero wordmark');
    await insideFirstViewport(overview, 'hero overview');
    const main = page.locator('#main-content');
    for (const [name, href] of DOMAIN_ENTRIES) {
      const link = main.getByRole('link', { name, exact: true }).first();
      // next/link normalizes trailing slashes between dev and export; the
      // domain segment is what matters.
      const hrefValue = await link.getAttribute('href');
      expect(hrefValue).toMatch(new RegExp(`^${href}/?$`));
      await insideFirstViewport(link, `${name} link`);
    }
  });

  test('domain index is a dense list, not a grid of bordered cards', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const index = page.getByRole('region', { name: /domain index/i });
    const items = index.getByRole('listitem');
    await expect(items).toHaveCount(7);
    for (const item of await items.all()) {
      const borders = await item.evaluate((el) => {
        const cs = getComputedStyle(el);
        return [
          cs.borderTopWidth,
          cs.borderRightWidth,
          cs.borderBottomWidth,
          cs.borderLeftWidth,
        ].map((w) => parseFloat(w));
      });
      const fullyBordered = borders.every((w) => w >= 1);
      expect(fullyBordered, 'index row must not be a bordered card').toBe(
        false,
      );
    }
  });

  test('the six core domain entries click through to real domain pages (VAL-NAV-003)', async ({
    page,
  }) => {
    // The index rows being links is necessary but not sufficient: a wrong
    // href would ship green without following them. Each core entry is
    // clicked; the destination URL must carry the domain segment, serve
    // HTTP 200, and render the domain landing's own content rather than
    // the 404 shell.
    const core = DOMAIN_ENTRIES.filter(([, href]) =>
      (CORE_DOMAINS as readonly string[]).includes(href.replaceAll('/', '')),
    );
    expect(core, 'DOMAIN_ENTRIES covers every core domain').toHaveLength(6);
    for (const [name, href] of core) {
      await test.step(`${name} -> ${href}`, async () => {
        await page.goto('/');
        const index = page.getByRole('region', { name: /domain index/i });
        await index.getByRole('link', { name, exact: true }).click();
        const segment = href.replaceAll('/', '');
        await expect(page).toHaveURL(new RegExp(`/${segment}/?$`));
        // Real content, not the 404 shell ("Page not found"): the domain
        // landing's own h1 and description prose.
        await expect(
          page.getByRole('heading', { level: 1, name }),
        ).toBeVisible();
        const response = await page.reload();
        expect(response, `main resource for ${href}`).not.toBeNull();
        expect(response!.ok(), `${href} serves HTTP 200`).toBe(true);
      });
    }
  });

  test('featured interactive svg top edge is within the first 1200px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const featured = page.getByRole('region', {
      name: /featured interactive/i,
    });
    // Strictly below 1200px (VAL-HOME-003/VAL-DSHOME-003): the bound is
    // "begins before y=1200", so exactly 1200 does not satisfy it.
    const top = await featured.locator('svg').first().evaluate((el) => {
      return el.getBoundingClientRect().top + window.scrollY;
    });
    expect(top).toBeLessThan(1200);
  });

  test('playground entry point renders a visual, not text alone', async ({
    page,
  }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Kinematics Playground/ });
    const shapes = await link
      .locator('svg')
      .first()
      .locator('circle, line, path, rect')
      .count();
    expect(shapes).toBeGreaterThanOrEqual(3);
  });

  test('market map and playground entries navigate to their routes', async ({
    page,
  }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    await main.getByRole('link', { name: /Kinematics Playground/ }).click();
    await expect(page).toHaveURL(/\/playground\/?$/);
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    await page.goto('/');
    await main.getByRole('link', { name: /Market Map/ }).click();
    await expect(page).toHaveURL(/\/market-map\/?$/);
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
  });

  test('bordered boxes inside main are bounded', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    expect(await countBorderedBoxes(page)).toBeLessThanOrEqual(6);
  });

  test('uppercase letterspaced micro-labels are bounded', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    expect(await countMicroLabels(page)).toBeLessThanOrEqual(5);
  });

  test('each domain display name is anchor text at most twice', async ({
    page,
  }) => {
    await page.goto('/');
    const counts = await page.evaluate((names) => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const result: Record<string, number> = {};
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const name of names) {
        result[name] = anchors.filter(
          (a) => normalize(a.textContent ?? '') === normalize(name),
        ).length;
      }
      return result;
    }, DOMAIN_ENTRIES.map(([name]) => name));
    for (const [name, count] of Object.entries(counts)) {
      expect(count, `${name} anchor occurrences`).toBeLessThanOrEqual(2);
    }
  });

  test('hero overview prose is substantive and free of banned tokens', async ({
    page,
  }) => {
    await page.goto('/');
    const prose = await page
      .getByText(/encyclopedia of modern robotics/)
      .first()
      .textContent();
    expect(prose).not.toBeNull();
    const text = prose!.trim();
    const words = text.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(25);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(text).not.toMatch(/[—–]/);
    const banned = [
      /seamless/i,
      /cutting-edge/i,
      /revolutionary/i,
      /game-chang/i,
      /unlock/i,
      /leverage/i,
      /harness/i,
      /elevate/i,
      /delve/i,
      /powered by AI/i,
      /one-stop/i,
      /ultimate guide/i,
    ];
    for (const token of banned) {
      expect(text).not.toMatch(token);
    }
  });

  test('how-to-read guidance links into content and never says atlas', async ({
    page,
  }) => {
    await page.goto('/');
    const homeText = await page.locator('#main-content').textContent();
    expect(homeText).not.toMatch(/atlas/i);
    const howTo = page.getByRole('region', { name: /how to read this wiki/i });
    await expect(howTo.getByText(/citation chip/)).toBeVisible();
    const link = howTo
      .getByRole('link', { name: /Action Chunking \(ACT and ALOHA\)/ })
      .first();
    await link.click();
    await expect(page).toHaveURL(/\/manipulation\/action-chunking\/?$/);
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
  });

  test('no horizontal overflow at 375px and the index reflows', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
    const index = page.getByRole('region', { name: /domain index/i });
    await expect(index.getByRole('listitem')).toHaveCount(7);
  });

  test('at 375px the hero grid is an exact 80px band below the lockup (VAL-DSHOME-009)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const boxes = await page.evaluate(() => {
      // The hero title sheet is the bordered grid container on the home
      // introduction section; the lockup is the wordmark/descriptor block
      // and the grid is the literal .engineering-grid field.
      const hero = document
        .querySelector('.engineering-grid')
        ?.closest('section > div');
      const grid = document.querySelector('.engineering-grid');
      const h1 = document.querySelector('main h1');
      if (!hero || !grid || !h1) return null;
      // The lockup column is the grid field's sibling (the text column of
      // the title sheet); the lockup bottom is its bottom edge.
      const lockup = grid.previousElementSibling;
      if (!lockup) return null;
      const r = (el: Element) => {
        const b = el.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, height: b.height };
      };
      return { hero: r(hero), grid: r(grid), lockup: r(lockup) };
    });
    expect(boxes, 'hero sheet, lockup column, and grid field present').not.toBeNull();
    const { hero, grid, lockup } = boxes!;
    // The grid becomes a band immediately below the complete lockup and
    // closes the hero: no gap, no overlap, exactly 80px tall.
    expect(grid.top).toBeCloseTo(lockup.bottom, 1);
    expect(grid.bottom).toBeCloseTo(hero.bottom, 1);
    expect(grid.height).toBeCloseTo(80, 1);
    expect(grid.top).toBeGreaterThanOrEqual(lockup.top);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the hero engineering grid is the literal locked device (VAL-DSBRAND-004)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const grid = page.locator('.engineering-grid');
    // Exactly one grid field on the home title sheet...
    await expect(grid).toHaveCount(1);
    const metrics = await grid.evaluate((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      // The two axis spans and the registration point are the grid's
      // three decorated children, in document order.
      const children = Array.from(el.children).map((child) => {
        const ccs = getComputedStyle(child);
        const b = child.getBoundingClientRect();
        return {
          borderTop: ccs.borderTopWidth,
          borderLeft: ccs.borderLeftWidth,
          color: ccs.borderLeftColor,
          background: ccs.backgroundColor,
          box: { x: b.x, y: b.y, w: b.width, h: b.height },
        };
      });
      return {
        bg: cs.backgroundColor,
        image: cs.backgroundImage,
        size: cs.backgroundSize,
        box: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        children,
      };
    });
    // 32px tile on the surface ground with the 1px #d9d6cd line.
    expect(metrics.size).toBe('32px 32px');
    expect(metrics.bg).toBe('rgb(251, 250, 247)');
    expect(metrics.image).toContain('stroke%3D%27%23d9d6cd%27');
    // From md the field is exactly 13rem (208px) wide.
    expect(metrics.box.w).toBeCloseTo(208, 0);
    // Two 1px strong axes plus one 8px accent registration point.
    expect(metrics.children).toHaveLength(3);
    const [vAxis, hAxis, point] = metrics.children;
    expect(vAxis.borderLeft).toBe('1px');
    expect(hAxis.borderTop).toBe('1px');
    expect(point.box.w).toBeCloseTo(8, 1);
    expect(point.box.h).toBeCloseTo(8, 1);
    expect(point.background).toBe('rgb(36, 94, 219)');
    // The axes cross at the field centre, and the point sits on that
    // intersection.
    const cx = metrics.box.x + metrics.box.w / 2;
    const cy = metrics.box.y + metrics.box.h / 2;
    expect(vAxis.box.x).toBeCloseTo(cx, 1);
    expect(hAxis.box.y).toBeCloseTo(cy, 1);
    expect(point.box.x + point.box.w / 2).toBeCloseTo(cx, 1);
    expect(point.box.y + point.box.h / 2).toBeCloseTo(cy, 1);
  });

  test('the engineering grid appears only on the home title sheet (VAL-DSBRAND-005)', async ({ page }) => {
    const routes = [
      '/',
      '/manipulation/action-chunking/',
      '/market-map/',
      '/playground/',
      '/search/',
      '/glossary/',
    ];
    for (const route of routes) {
      await page.goto(route);
      const grids = await page.evaluate(() => {
        const hit = (el: Element): boolean => {
          const cs = getComputedStyle(el);
          return cs.backgroundImage.includes('svg');
        };
        const all = Array.from(document.querySelectorAll('*')).filter(hit);
        return all.map((el) => el.tagName + '.' + (el.id || el.className || ''));
      });
      if (route === '/') {
        // Home: exactly the title-sheet field, and never on body, main,
        // article, or a prose container.
        expect(grids, 'home grid inventory').toHaveLength(1);
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
