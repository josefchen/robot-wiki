import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CORE_DOMAINS } from '../../data/domains';
import { PUBLIC_IDENTITY } from '../../lib/identity';

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
  test('renders the Robot Wiki wordmark heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: PUBLIC_IDENTITY }),
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
      name: PUBLIC_IDENTITY,
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

  test('the wordmark holds its locked type scale at both stated viewports (VAL-B2-TYPE-006)', async ({
    page,
  }) => {
    // contract/design-integrity.md VAL-B2-TYPE-006 and design-system 4.3:
    // 52-68px at 375, 88-120px at 1440, line height 0.88-0.98, at the
    // registered wght=600/wdth=100 instance. Measured after fonts settle,
    // because the size is fluid and a fallback face would change the box
    // the seventh domain link is then checked against.
    const bands = [
      { width: 375, height: 812, min: 52, max: 68 },
      { width: 1440, height: 900, min: 88, max: 120 },
    ] as const;
    for (const band of bands) {
      await page.setViewportSize({ width: band.width, height: band.height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const measured = await page
        .locator('h1[data-tektur-role="home-wordmark"]')
        .evaluate((el) => {
          const style = getComputedStyle(el);
          const fontSizePx = parseFloat(style.fontSize);
          return {
            text: (el.textContent ?? '').trim(),
            fontSizePx,
            lineHeightRatio: parseFloat(style.lineHeight) / fontSizePx,
            variation: style.fontVariationSettings,
            family: style.fontFamily.split(',')[0].replaceAll('"', ''),
          };
        });
      const at = `${band.width}px`;
      expect(measured.text, `wordmark text at ${at}`).toBe(PUBLIC_IDENTITY);
      expect(measured.family.toLowerCase(), `family at ${at}`).toContain(
        'tektur',
      );
      expect(measured.fontSizePx, `wordmark size at ${at}`).toBeGreaterThanOrEqual(
        band.min,
      );
      expect(measured.fontSizePx, `wordmark size at ${at}`).toBeLessThanOrEqual(
        band.max,
      );
      expect(
        measured.lineHeightRatio,
        `wordmark line height at ${at}`,
      ).toBeGreaterThanOrEqual(0.88);
      expect(
        measured.lineHeightRatio,
        `wordmark line height at ${at}`,
      ).toBeLessThanOrEqual(0.98);
      expect(measured.variation, `role instance at ${at}`).toMatch(
        /"wght"\s*600/,
      );
      expect(measured.variation, `role instance at ${at}`).toMatch(
        /"wdth"\s*100/,
      );
    }

    // The scale and the fold are one constraint: a wordmark inside its band
    // that pushed the seventh domain link past y=900 would trade
    // VAL-B2-TYPE-006 for VAL-HOME-001. Asserted here as well as in the
    // first-viewport test so a type change cannot pass this test alone.
    const seventh = page
      .locator('#main-content')
      .getByRole('link', { name: 'Adjacent Domains', exact: true })
      .first();
    const box = await seventh.boundingBox();
    expect(box, 'seventh domain link measured at 1440x900').not.toBeNull();
    expect(
      box!.y + box!.height,
      'seventh domain link bottom edge at 1440x900',
    ).toBeLessThanOrEqual(900);
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
    // The drawing sits beside the link rather than inside it: it carries its
    // own textual alternative in a <details>, which HTML does not allow
    // inside an anchor.
    const card = page.locator('article', {
      has: page.getByRole('link', { name: /Kinematics Playground/ }),
    });
    const figure = card.getByRole('img', { name: /SO-101/ });
    await expect(figure).toBeVisible();
    const shapes = await figure
      .locator('circle, line, path, rect, polyline')
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
      // The hero sheet carries a 1px hairline frame; the grid field fills
      // the sheet to its inner (padding-box) edge, so the comparable
      // bottom is the sheet's border-box bottom minus its bottom border.
      const heroBorder = parseFloat(getComputedStyle(hero).borderBottomWidth);
      return {
        hero: { ...r(hero), bottom: r(hero).bottom - heroBorder },
        grid: r(grid),
        lockup: r(lockup),
      };
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
    // 32px tile on the white surface with the 1px #D9DADB concrete line.
    expect(metrics.size).toBe('32px 32px');
    expect(metrics.bg).toBe('rgb(255, 255, 255)');
    // The tile is a data-URI SVG whose 1px rule is #D9DADB (the
    // apostrophes stay literal in the computed background-image).
    expect(metrics.image).toContain("stroke='%23D9DADB'");
    // From md the field is exactly 13rem (208px) wide.
    expect(metrics.box.w).toBeCloseTo(208, 0);
    // Two 1px strong axes plus one 8px accent registration point.
    expect(metrics.children).toHaveLength(3);
    const [vAxis, hAxis, point] = metrics.children;
    expect(vAxis.borderLeft).toBe('1px');
    expect(hAxis.borderTop).toBe('1px');
    expect(point.box.w).toBeCloseTo(8, 1);
    expect(point.box.h).toBeCloseTo(8, 1);
    expect(point.background).toBe('rgb(36, 95, 255)');
    // The contract claim is concentricity: the vertical axis, the
    // horizontal axis, and the registration point share one centre (the
    // axis hairline's centre is its border's centre, since the border
    // paints on the element's near edge), and each axis spans the field.
    // The shared centre is measured from the elements themselves rather
    // than derived from the field box, because percentage offsets resolve
    // against the field's padding box (inside its own hairline).
    const vCentre = vAxis.box.x + 0.5;
    const hCentre = hAxis.box.y + 0.5;
    const pCentreX = point.box.x + point.box.w / 2;
    const pCentreY = point.box.y + point.box.h / 2;
    expect(vCentre).toBeCloseTo(pCentreX, 1);
    expect(hCentre).toBeCloseTo(pCentreY, 1);
    expect(vAxis.box.y).toBeCloseTo(metrics.box.y, 1);
    expect(vAxis.box.h).toBeCloseTo(metrics.box.h, 1);
    expect(hAxis.box.w).toBeGreaterThanOrEqual(metrics.box.w - 2);
  });

  test('the engineering grid appears only on the home title sheet (VAL-DSBRAND-005)', async ({ page }) => {
    // Population derived from the registry: every published module route
    // plus the standalone surfaces, so a newly published module joins the
    // sweep without a fixture edit.
    const { publishedModules } = await import('../../data/modules');
    const routes = [
      '/',
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
      '/market-map/',
      '/playground/',
      '/search/',
      '/glossary/',
    ];
    expect(routes.length).toBeGreaterThan(2);
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
