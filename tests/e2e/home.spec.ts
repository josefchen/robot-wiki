import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CORE_DOMAINS } from '../../data/domains';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import { forEachInOwnContext } from './helpers/per-route-context';

/**
 * Structural contract for the home front page. Encodes the design
 * bounds and the navigation rules: a dense contents index instead of a
 * card grid, the contents under the name in the first screen, the six
 * entries that are not articles, bounded bordered boxes and micro-labels,
 * no overview paragraph, and the reading guide on /about/.
 *
 * Updated for the contents-first front page of 14 November 2026: the
 * scene left the first screen and the contents took its place, so the pins
 * that held the scene's poster and start button inside 1440x900 now hold
 * the contents there at the same strength: the identity, descriptor,
 * counts, search, the contents heading and the head of every contents
 * column sit inside 1440x900, and the search and the first field show in
 * the first screen of a 390x844 phone.
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

  test('first viewport carries the identity line, counts, search and the start of the contents', async ({
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
    const contents = page.getByRole('region', { name: 'Contents' });
    const firstDomain = contents.locator('[data-contents-domain]').first();
    // The full box must sit inside the first viewport: a top edge above
    // y=900 with the body hanging below
    // it is a clipped premise, and checking y alone would pass it.
    const insideFirstViewport = async (
      locator: ReturnType<Page['locator']>,
      label: string,
      height = 900,
    ) => {
      const box = await locator.boundingBox();
      expect(box, `${label} visible in first viewport`).not.toBeNull();
      expect(box!.y, `${label} top above fold`).toBeGreaterThanOrEqual(0);
      expect(
        box!.y + box!.height,
        `${label} bottom edge must be at or before y=${height}`,
      ).toBeLessThanOrEqual(height);
    };
    await insideFirstViewport(wordmark, 'hero wordmark');
    await insideFirstViewport(descriptor, 'descriptor');
    await insideFirstViewport(counts, 'registry counts');
    await insideFirstViewport(search, 'search box');
    await insideFirstViewport(contents.getByRole('heading', { level: 2 }), 'contents heading');
    // The first field shows its name, its scope and its first ten articles.
    await insideFirstViewport(firstDomain.locator('.contents-head'), 'first field head');
    await insideFirstViewport(firstDomain.getByRole('listitem').nth(9), 'tenth article of the first field');
    // The contents are the widest thing in the first screen: four columns
    // across the frame, each opening on a field's name inside the screen.
    const index = await contents.locator('.home-index').boundingBox();
    expect(index!.width).toBeGreaterThan(1300);
    const heads = await contents.locator('.contents-name').evaluateAll((names) =>
      names.map((name) => {
        const box = name.getBoundingClientRect();
        return { left: Math.round(box.left), bottom: box.bottom };
      }),
    );
    const columns = [...new Set(heads.map(({ left }) => left))];
    expect(columns, 'contents columns at 1440px').toHaveLength(4);
    for (const left of columns) {
      const top = Math.min(...heads.filter((head) => head.left === left).map(({ bottom }) => bottom));
      expect(top, `the column at ${left}px opens inside the first screen`).toBeLessThanOrEqual(900);
    }
    // Nothing stands between the name and the contents.
    expect(
      await contents.evaluate((el) => el.previousElementSibling?.getAttribute('aria-label')),
    ).toBe('Introduction');
    // On a phone the search and the first field's name and first article
    // already show in the first screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await insideFirstViewport(search, 'search box on a phone', 844);
    await insideFirstViewport(firstDomain.locator('.contents-name'), 'first field name on a phone', 844);
    await insideFirstViewport(firstDomain.getByRole('listitem').first(), 'first article on a phone', 844);
  });

  test('the wordmark holds its locked type scale at both stated viewports', async ({
    page,
  }) => {
    // The shared DM Sans 400 display h1, 40-48px at 375 and 84-92px at
    // 1440, line height 0.90-0.96, at the registered home-wordmark instance
    // (wght 400) with no variation-axis override. Measured after fonts
    // settle, because the size is fluid and a fallback face would change the
    // box the seventh domain link is then checked against.
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
    // that pushed the first field's tenth article past y=900 would trade the
    // type scale for the first-viewport rule. Asserted here as well as in the
    // first-viewport test so a type change cannot pass this test alone.
    const tenth = page
      .getByRole('region', { name: 'Contents' })
      .locator('[data-contents-domain]')
      .first()
      .getByRole('listitem')
      .nth(9);
    const box = await tenth.boundingBox();
    expect(box, 'tenth article of the first field measured at 1440x900').not.toBeNull();
    expect(box!.y + box!.height, 'tenth article bottom edge at 1440x900').toBeLessThanOrEqual(900);
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

  test('the six core domain entries click through to real domain pages', async ({
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

  test('the introduction holds the name and the search alone: no scene, picture or second control', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const intro = page.getByRole('region', { name: 'Introduction' });
    await expect(intro.locator('[data-explainer-scene], [data-x="stage"], img, picture, canvas, svg')).toHaveCount(0);
    await expect(intro.getByRole('button')).toHaveCount(1);
    await expect(intro.getByRole('button')).toHaveText('Search');
    await expect(intro.getByRole('link')).toHaveCount(0);
    // The contents begin where the scene used to: inside the first screen.
    const top = await page
      .getByRole('region', { name: 'Contents' })
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(top).toBeLessThan(450);
  });

  test('"Also in the wiki" links Robotics now, the explainers, the market map, the playground, the glossary and the index as plain entries', async ({
    page,
  }) => {
    await page.goto('/');
    const also = page.getByRole('region', { name: 'Also in the wiki' });
    for (const [name, href] of [
      ['Robotics now', /^\/now\/?$/],
      ['How robots work', /^\/how-robots-work\/?$/],
      ['Market map', /^\/market-map\/?$/],
      ['Playground', /^\/playground\/?$/],
      ['Glossary', /^\/glossary\/?$/],
      ['A to Z index', /^\/a-z\/?$/],
    ] as const) {
      const link = also.getByRole('heading', { level: 3, name }).getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      expect(await link.getAttribute('href')).toMatch(href);
    }
    // Six entries, one line of text under each, and no picture.
    await expect(also.getByRole('listitem')).toHaveCount(6);
    expect(await also.getByRole('img').count()).toBe(0);
    for (const line of await also.locator('li > p').allInnerTexts()) {
      expect(line.split(/\s+/).length).toBeGreaterThan(5);
    }
  });

  test('Tab from the top reaches the search, then the contents in reading order, with a visible focus ring', async ({
    page,
  }) => {
    // Some seventy stops, each read after its ring has settled.
    test.setTimeout(90_000);
    // The ring is read at rest: a control that eases its colours eases the
    // ring's colour in too.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const expected = await page.evaluate(() => {
      const contents = document.querySelector('#contents');
      return [...(contents?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href') ?? '');
    });
    expect(expected.length).toBeGreaterThan(50);
    const stops: { where: string; id: string; href: string; ring: boolean; inView: boolean; at: string }[] = [];
    for (let presses = 0; presses < expected.length + 12; presses += 1) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(async () => {
        // Wait out the control's colour transition, so the ring has arrived.
        const until = performance.now() + 1_000;
        do {
          await new Promise((done) => requestAnimationFrame(done));
        } while (document.getAnimations().length > 0 && performance.now() < until);
        const el = document.activeElement as HTMLElement;
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          where: el.closest('main') ? (el.closest('section')?.id || el.closest('section')?.getAttribute('aria-label') || '') : 'chrome',
          id: el.id || el.tagName.toLowerCase(),
          href: el.getAttribute('href') ?? '',
          // The house ring: a 1px solid ink outline, offset 2px.
          ring:
            cs.outlineStyle === 'solid' &&
            cs.outlineWidth === '1px' &&
            cs.outlineOffset === '2px' &&
            cs.outlineColor === 'rgb(28, 28, 26)',
          inView: box.top >= -1 && box.bottom <= window.innerHeight + 1,
          at: `${Math.round(box.top)} to ${Math.round(box.bottom)} of ${window.innerHeight}`,
        };
      });
      stops.push(stop);
      if (stop.where !== 'chrome' && stop.where !== 'Introduction' && stop.where !== 'contents') break;
    }
    const inMain = stops.filter(({ where }) => where !== 'chrome');
    // The chrome comes first and is short: the skip link, the wordmark and
    // the top bar's four entries.
    expect(stops.findIndex(({ where }) => where !== 'chrome')).toBe(6);
    // Then the search box and its button, and nothing else in the introduction.
    expect(inMain.slice(0, 2).map(({ where, id }) => `${where}:${id}`)).toEqual([
      'Introduction:home-search-input',
      'Introduction:button',
    ]);
    // Then every link of the contents, in the order it is read.
    const contents = inMain.filter(({ where }) => where === 'contents');
    expect(contents.map(({ href }) => href)).toEqual(expected);
    expect(inMain[2].where).toBe('contents');
    // Every stop shows the ring and is scrolled into view.
    for (const stop of inMain) {
      expect(stop.ring, `focus ring on ${stop.id} ${stop.href}`).toBe(true);
      expect(stop.inView, `${stop.id} ${stop.href} in view when focused, at ${stop.at}`).toBe(true);
    }
  });

  test('the footer lines up with the sections above it on home, and keeps its column elsewhere', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const edges = async () =>
      page.evaluate(() => {
        const footer = document.querySelector('[data-site-footer] > div:last-child')!.getBoundingClientRect();
        const section = document.querySelector('main > section:last-of-type h2')?.getBoundingClientRect();
        return { footerLeft: footer.left, footerWidth: footer.width, sectionLeft: section?.left ?? null };
      });
    const home = await edges();
    expect(home.footerLeft).toBeCloseTo(0, 0);
    expect(home.footerWidth).toBeCloseTo(1440, 0);
    await page.goto('/about/');
    const about = await edges();
    expect(about.footerWidth).toBeCloseTo(960 + 2 * 48, 0);
    expect(home.sectionLeft).toBeCloseTo(48, 0);
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
    await main.getByRole('link', { name: 'Market map', exact: true }).click();
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

  test('home carries no overview paragraph and its text is free of banned tokens', async ({
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

  test('the reading guide lives on /about/, links into content and never says atlas', async ({
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

  // Updated for the contents-first front page of 14 November 2026: the
  // 375px masthead is the lockup, then the search and its counts; the
  // contents open after it on their 1px hairline rule with the heading
  // under it. Each relation is pinned at one-decimal precision.
  test('at 375px the masthead runs lockup, search, and the contents hairline follows', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.evaluate(() => {
      const hero = document.querySelector('main section[aria-label="Introduction"]');
      const lockup = hero?.querySelector(':scope > .home-lockup');
      const find = hero?.querySelector(':scope > .home-find');
      const next = hero?.nextElementSibling;
      const heading = next?.querySelector(':scope > h2');
      if (!hero || !lockup || !find || !next || !heading) return null;
      const r = (el: Element) => {
        const b = el.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, height: b.height };
      };
      const ncs = getComputedStyle(next);
      return {
        hero: r(hero),
        lockup: r(lockup),
        find: r(find),
        next: {
          ...r(next),
          width: ncs.borderTopWidth,
          colour: ncs.borderTopColor,
          name: next.getAttribute('aria-labelledby'),
        },
        heading: r(heading),
        children: [...hero.children]
          .filter((el) => el.tagName !== 'SCRIPT')
          .map((el) => el.tagName.toLowerCase()),
      };
    });
    expect(boxes, 'masthead lockup, search and the next section present').not.toBeNull();
    const { hero, lockup, find, next, heading, children } = boxes!;
    expect(children).toEqual(['div', 'div']);
    expect(next.name).toBe('contents-heading');
    expect(lockup.top - hero.top).toBeCloseTo(24, 1);
    expect(find.top - lockup.bottom).toBeCloseTo(24, 1);
    expect(find.bottom).toBeCloseTo(hero.bottom, 1);
    expect(next.top - hero.bottom).toBeCloseTo(32, 1);
    expect(heading.top - next.top).toBeCloseTo(17, 1);
    expect(next.width).toBe('1px');
    expect(next.colour).toBe('rgba(28, 28, 26, 0.22)');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  // Updated for the research-page standard of 10 October 2026
  // (the dot grid was removed in 9154d672): the old pin read the
  // one .engineering-grid field as the locked device (32px #D9DADB SVG tile
  // on white, a 208px column, two 1px axes and an 8px signal-blue point
  // sharing one centre). The locked title sheet is now plain paper: no grid
  // node or registered dot-grid device, the exact paper ground #FAFAF8 with
  // no texture or frame on the sheet, the declared `material:paper`.
  // Updated for the contents-first front page of 14 November 2026: the
  // sheet paints no image at all; the lockup holds the six columns left of
  // the frame's centre line with the name on one line, and the search the
  // six to its right, the two ending on one bottom edge.
  test('the hero title sheet is the locked plain-paper masthead with no grid device', async ({
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
      const painted = [el, ...el.querySelectorAll('*')]
        .flatMap((node) =>
          ['', '::before', '::after']
            .map((pseudo) => getComputedStyle(node, pseudo).backgroundImage)
            .filter((value) => value !== 'none'),
        );
      const lockup = el.querySelector(':scope > .home-lockup');
      const lead = lockup?.querySelector('.home-descriptor');
      const find = el.querySelector(':scope > .home-find');
      const search = find?.querySelector('form');
      const h1Style = getComputedStyle(el.querySelector('h1')!);
      return {
        bg: cs.backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        image: cs.backgroundImage,
        borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
        shadow: cs.boxShadow,
        painted,
        lockup: lockup ? box(lockup) : null,
        lead: lead ? box(lead) : null,
        search: search ? box(search) : null,
        find: find ? box(find) : null,
        h1: box(el.querySelector('h1')!),
        h1Line: parseFloat(h1Style.lineHeight),
        media: el.querySelectorAll('img, picture, canvas, svg, video').length,
      };
    });
    expect(metrics.bg).toBe('rgb(250, 250, 248)');
    expect(metrics.body).toBe('rgb(250, 250, 248)');
    expect(metrics.image).toBe('none');
    expect(metrics.painted).toEqual([]);
    expect(metrics.borders).toEqual(['0px', '0px', '0px', '0px']);
    expect(metrics.shadow).toBe('none');
    expect(metrics.media).toBe(0);
    for (const key of ['lockup', 'lead', 'search', 'find'] as const) {
      expect(metrics[key], key).not.toBeNull();
    }
    const lockup = metrics.lockup!;
    const lead = metrics.lead!;
    const search = metrics.search!;
    const find = metrics.find!;
    const h1 = metrics.h1;
    // Six columns of a 12-column, 32px-gutter frame, 1344px wide: 656px.
    expect(lockup.left).toBeCloseTo(48, 1);
    expect(lockup.w).toBeCloseTo(656, 0);
    // The name stands on one line, the descriptor under it.
    expect(h1.bottom - h1.top).toBeCloseTo(metrics.h1Line, 0);
    expect(lead.top).toBeGreaterThanOrEqual(h1.bottom);
    // The search starts on the centre line, one gutter right of the lockup,
    // fills its six columns to the frame's right edge, and ends on the
    // lockup's bottom edge.
    expect(find.left - lockup.right).toBeCloseTo(32, 1);
    expect(find.right).toBeCloseTo(1392, 1);
    expect(search.left).toBeCloseTo(find.left, 1);
    expect(search.right).toBeCloseTo(find.right, 1);
    expect(find.bottom).toBeCloseTo(lockup.bottom, 1);
    expect(find.top).toBeGreaterThan(h1.top);
  });

  // Updated for the research-page standard of 10 October 2026
  // (the dot grid was removed in 9154d672): the old pin read
  // "exactly one svg-grid background on /, the title sheet's
  // .engineering-grid, never on body, main, article or prose, and none on
  // any other route". On the same derived population no route paints an
  // engineering-grid device now: no svg background on any element and no
  // grid node or registered dot-grid device, and
  // home's title sheet and everything in it paints no image at all.
  test('no route paints an engineering-grid device, home title sheet included', async ({ browser }) => {
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
