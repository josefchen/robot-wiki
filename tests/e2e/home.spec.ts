import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CORE_DOMAINS } from '../../data/domains';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import { forEachInOwnContext } from './helpers/per-route-context';

/**
 * Structural contract for the home front page. Encodes the measurable
 * bounds from contract/design-integrity.md and
 * contract/foundation-navigation.md: a dense contents index instead of a
 * card grid, the featured scene inside the first 1200px, the playground as a
 * plain link in the tools line, bounded bordered boxes and micro-labels, no
 * overview paragraph, and the reading guide on /about/.
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

  test('first viewport carries the identity line, counts, search and all seven domain links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const wordmark = page.getByRole('heading', {
      level: 1,
      name: PUBLIC_IDENTITY,
    });
    const descriptor = page
      .locator('#main-content')
      .getByText(PUBLIC_DESCRIPTOR, { exact: true });
    const counts = page.locator('[data-home-counts]');
    const search = page
      .getByRole('search', { name: 'Search the wiki' })
      .getByRole('searchbox');
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
    await insideFirstViewport(descriptor, 'descriptor');
    await insideFirstViewport(counts, 'registry counts');
    await insideFirstViewport(search, 'search box');
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
    // contract/design-integrity.md VAL-B2-TYPE-006, as the owner decision
    // of 10 October 2026 (the research-page standard) restated it: the
    // shared DM Sans 400 display h1, 40-48px at 375 and 84-92px at 1440,
    // line height 0.90-0.96, at the registered home-wordmark instance
    // (wght 400) with no variation-axis override (VAL-B2-TYPE-015). It
    // replaced Tektur at 52-68/88-120px, 0.88-0.98, wght 600 / wdth 100,
    // at the same strength. Measured after fonts settle, because the size
    // is fluid and a fallback face would change the box the seventh domain
    // link is then checked against.
    const bands = [
      { width: 375, height: 812, min: 40, max: 48 },
      { width: 1440, height: 900, min: 84, max: 92 },
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
            weight: style.fontWeight,
            family: style.fontFamily.split(',')[0].replaceAll('"', ''),
          };
        });
      const at = `${band.width}px`;
      expect(measured.text, `wordmark text at ${at}`).toBe(PUBLIC_IDENTITY);
      expect(measured.family, `family at ${at}`).toBe('DM Sans');
      expect(measured.fontSizePx, `wordmark size at ${at}`).toBeGreaterThanOrEqual(
        band.min,
      );
      expect(measured.fontSizePx, `wordmark size at ${at}`).toBeLessThanOrEqual(
        band.max,
      );
      expect(
        measured.lineHeightRatio,
        `wordmark line height at ${at}`,
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        measured.lineHeightRatio,
        `wordmark line height at ${at}`,
      ).toBeLessThanOrEqual(0.96);
      expect(measured.weight, `role instance at ${at}`).toBe('400');
      expect(measured.variation, `no axis override at ${at}`).toBe('normal');
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

  test('the contents index is a dense list, not a grid of bordered cards', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const index = page.getByRole('region', { name: 'Contents' });
    const items = index.locator('[data-contents-domain]');
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
        const index = page.getByRole('region', { name: 'Contents' });
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

  test('featured scene stage top edge is within the first 1200px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const featured = page.getByRole('region', { name: 'Featured scene' });
    // Strictly below 1200px (VAL-HOME-003/VAL-DSHOME-003): the bound is
    // "begins before y=1200", so exactly 1200 does not satisfy it. The
    // explainer's stage holds its poster, then its canvas, in one box.
    const stage = featured.locator('[data-explainer-scene] [data-x="stage"]');
    await expect(stage).toHaveCount(1);
    await expect(stage.locator('[data-x="poster"]')).toBeVisible();
    const top = await stage.evaluate((el) => {
      return el.getBoundingClientRect().top + window.scrollY;
    });
    expect(top).toBeLessThan(1200);
  });

  test('the playground entry point is a plain link in the tools line (VAL-DESIGN-013)', async ({
    page,
  }) => {
    await page.goto('/');
    const tools = page.getByRole('region', { name: 'Tools' });
    const playground = tools.getByRole('link', { name: 'Playground', exact: true });
    await expect(playground).toBeVisible();
    expect(await playground.getAttribute('href')).toMatch(/^\/playground\/?$/);
    // No preview, card, skeleton or drawing beside it.
    expect(
      await tools.locator('img, svg, canvas, figure, picture, video').count(),
    ).toBe(0);
    const linkBoxes = await tools.getByRole('link').evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().top),
    );
    expect(linkBoxes).toHaveLength(3);
    for (const top of linkBoxes.slice(1)) {
      expect(Math.abs(linkBoxes[0] - top)).toBeLessThanOrEqual(4);
    }
  });

  test('market map and playground entries navigate to their routes', async ({
    page,
  }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    await main.getByRole('link', { name: 'Playground', exact: true }).click();
    await expect(page).toHaveURL(/\/playground\/?$/);
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    await page.goto('/');
    await main.getByRole('link', { name: 'Market Map', exact: true }).click();
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

  test('home carries no overview paragraph and its text is free of banned tokens (VAL-DESIGN-011)', async ({
    page,
  }) => {
    await page.goto('/');
    const main = page.locator('#main-content');
    await expect(main.getByText(/encyclopedia of modern robotics/i)).toHaveCount(0);
    const text = ((await main.innerText()) ?? '').trim();
    expect(text.length).toBeGreaterThan(0);
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

  test('the reading guide lives on /about/, links into content and never says atlas (VAL-NAV-005)', async ({
    page,
  }) => {
    await page.goto('/');
    const homeText = (await page.locator('#main-content').textContent()) ?? '';
    expect(homeText).not.toMatch(/atlas/i);
    expect(homeText).not.toMatch(/how to read|reading order|prerequisites/i);
    // Reached from the footer, as a reader would.
    await page.getByRole('contentinfo').getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/\/about\/?$/);
    const about = page.locator('#main-content');
    expect((await about.textContent()) ?? '').not.toMatch(/atlas/i);
    const guide = page.getByRole('region', { name: 'Reading the wiki' });
    await expect(guide.getByText(/reading order/i).first()).toBeVisible();
    await expect(guide.getByText(/prerequisite/i).first()).toBeVisible();
    await expect(guide.getByText(/citation chip/i).first()).toBeVisible();
    await guide
      .getByRole('link', { name: 'Action Chunking (ACT and ALOHA)', exact: true })
      .click();
    await expect(page).toHaveURL(/\/manipulation\/action-chunking\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
    const index = page.getByRole('region', { name: 'Contents' });
    await expect(index.locator('[data-contents-domain]')).toHaveCount(7);
  });

  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard; the dot grid was removed in 9154d672): the old pin read the
  // .engineering-grid field as an exact 80px band starting at the lockup's
  // bottom and closing the bordered hero sheet. The masthead is now plain
  // paper with no band: the lockup (h1 and descriptor) is followed by the
  // counts line 12px below and the search 32px below that, the search
  // closes the masthead, and the Contents section opens 48px below it on
  // its 1px hairline rule, 16px under its heading. Each relation is pinned
  // at the old band's one-decimal precision.
  test('at 375px the masthead closes on its search and the first hairline follows at the locked rhythm (VAL-DSHOME-009)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.evaluate(() => {
      const hero = document.querySelector('main section[aria-label="Introduction"]');
      const lockup = hero?.querySelector(':scope > .home-lockup');
      const counts = hero?.querySelector(':scope > [data-home-counts]');
      const search = hero?.querySelector(':scope > form');
      const contents = document.querySelector('main section[aria-labelledby="contents-heading"]');
      const heading = contents?.querySelector(':scope > h2');
      const rule = heading?.nextElementSibling;
      if (!hero || !lockup || !counts || !search || !contents || !heading || !rule) return null;
      const r = (el: Element) => {
        const b = el.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, height: b.height };
      };
      const rcs = getComputedStyle(rule);
      return {
        hero: r(hero),
        lockup: r(lockup),
        counts: r(counts),
        search: r(search),
        contents: r(contents),
        heading: r(heading),
        rule: { ...r(rule), width: rcs.borderTopWidth, colour: rcs.borderTopColor },
        children: [...hero.children]
          .filter((el) => el.tagName !== 'SCRIPT')
          .map((el) => el.tagName.toLowerCase()),
      };
    });
    expect(boxes, 'masthead lockup, counts, search, and the Contents rule present').not.toBeNull();
    const { hero, lockup, counts, search, contents, heading, rule, children } = boxes!;
    // No band between the lockup and the masthead's end: exactly the
    // lockup, the counts line and the search form.
    expect(children).toEqual(['div', 'p', 'form']);
    expect(lockup.top).toBeGreaterThanOrEqual(hero.top);
    expect(counts.top - lockup.bottom).toBeCloseTo(12, 1);
    expect(search.top - counts.bottom).toBeCloseTo(32, 1);
    expect(search.bottom).toBeCloseTo(hero.bottom, 1);
    expect(contents.top - hero.bottom).toBeCloseTo(48, 1);
    expect(heading.top).toBeCloseTo(contents.top, 1);
    expect(rule.top - heading.bottom).toBeCloseTo(16, 1);
    expect(rule.width).toBe('1px');
    expect(rule.colour).toBe('rgba(28, 28, 26, 0.14)');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard; the dot grid was removed in 9154d672): the old pin read the
  // one .engineering-grid field as the locked device (32px #D9DADB SVG tile
  // on white, a 208px column, two 1px axes and an 8px signal-blue point
  // sharing one centre). The locked title sheet is now plain paper: no grid
  // node or registered dot-grid device, the exact paper ground #FAFAF8 with
  // no image, texture or frame on the sheet or anything in it, the declared
  // `material:paper`, and the column that held the field is the counts and
  // search column, exactly 22rem wide, 48px from the lockup, its search
  // ending on the descriptor's last line.
  test('the hero title sheet is the locked plain-paper masthead with no grid device (VAL-DSBRAND-004)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.locator('.engineering-grid, [data-brand-device-id="device:dot-grid"]'),
    ).toHaveCount(0);
    const sheet = page.locator('main section[aria-label="Introduction"]');
    await expect(sheet).toHaveCount(1);
    await expect(sheet).toHaveAttribute('data-brand-material-id', 'material:paper');
    await expect(sheet).toHaveAttribute('data-brand-material-contrast', 'pass');
    const metrics = await sheet.evaluate((el) => {
      const cs = getComputedStyle(el);
      const box = (node: Element) => {
        const b = node.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width };
      };
      const painted = [el, ...el.querySelectorAll('*')].flatMap((node) =>
        ['', '::before', '::after']
          .map((pseudo) => getComputedStyle(node, pseudo).backgroundImage)
          .filter((value) => value !== 'none'),
      );
      const lockup = el.querySelector(':scope > .home-lockup');
      const lead = lockup?.querySelector('.page-lead');
      const counts = el.querySelector(':scope > [data-home-counts]');
      const search = el.querySelector(':scope > form');
      return {
        bg: cs.backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        image: cs.backgroundImage,
        borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
        shadow: cs.boxShadow,
        painted,
        lockup: lockup ? box(lockup) : null,
        lead: lead ? box(lead) : null,
        counts: counts ? box(counts) : null,
        search: search ? box(search) : null,
      };
    });
    expect(metrics.bg).toBe('rgb(250, 250, 248)');
    expect(metrics.body).toBe('rgb(250, 250, 248)');
    expect(metrics.image).toBe('none');
    expect(metrics.painted).toEqual([]);
    expect(metrics.borders).toEqual(['0px', '0px', '0px', '0px']);
    expect(metrics.shadow).toBe('none');
    expect(metrics.lockup).not.toBeNull();
    expect(metrics.lead).not.toBeNull();
    expect(metrics.counts).not.toBeNull();
    expect(metrics.search).not.toBeNull();
    const lockup = metrics.lockup!;
    const lead = metrics.lead!;
    const counts = metrics.counts!;
    const search = metrics.search!;
    // The right column is exactly 22rem (352px), 48px from the lockup.
    expect(search.w).toBeCloseTo(352, 0);
    expect(counts.w).toBeCloseTo(352, 0);
    expect(search.left - lockup.right).toBeCloseTo(48, 1);
    expect(counts.left).toBeCloseTo(search.left, 1);
    // Counts sit 12px above the search, and the search's bottom edge lines
    // up with the descriptor's.
    expect(search.top - counts.bottom).toBeCloseTo(12, 1);
    expect(search.bottom).toBeCloseTo(lead.bottom, 1);
  });

  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard; the dot grid was removed in 9154d672): the old pin read
  // "exactly one svg-grid background on /, the title sheet's
  // .engineering-grid, never on body, main, article or prose, and none on
  // any other route". On the same derived population no route paints an
  // engineering-grid device now: no svg background on any element and no
  // grid node or registered dot-grid device, and
  // home's title sheet and everything in it paints no image at all.
  test('no route paints an engineering-grid device, home title sheet included (VAL-DSBRAND-005)', async ({ browser }) => {
    // One fresh context per route over the whole registry population runs
    // close to the default 30 s budget on its own.
    test.setTimeout(90_000);
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
    await forEachInOwnContext(browser, routes, async (page, route) => {
      await page.goto(route);
      const { grids, devices } = await page.evaluate(() => {
        const grids: string[] = [];
        for (const el of Array.from(document.querySelectorAll('*'))) {
          if (getComputedStyle(el).backgroundImage.includes('svg')) {
            grids.push(el.tagName + '.' + (el.id || el.className || ''));
          }
        }
        const devices = document.querySelectorAll(
          '.engineering-grid, [data-brand-device-id="device:dot-grid"], [data-brand-motif="dot-grid"]',
        ).length;
        return { grids, devices };
      });
      expect(grids, `svg-grid backgrounds on ${route}`).toEqual([]);
      expect(devices, `engineering-grid devices on ${route}`).toBe(0);
      if (route === '/') {
        const on = await page.evaluate(() => {
          const sheet = document.querySelector('main section[aria-label="Introduction"]');
          if (!sheet) return 'missing';
          const painted = [sheet, ...sheet.querySelectorAll('*')].some((el) =>
            ['', '::before', '::after'].some(
              (pseudo) => getComputedStyle(el, pseudo).backgroundImage !== 'none',
            ),
          );
          return painted ? 'painted-title-sheet' : 'plain-title-sheet';
        });
        expect(on).toBe('plain-title-sheet');
      }
    });
  });
});
