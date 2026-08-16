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
    for (const locator of [wordmark, overview]) {
      const box = await locator.boundingBox();
      expect(box, 'hero element visible in first viewport').not.toBeNull();
      expect(box!.y).toBeLessThan(900);
    }
    const main = page.locator('#main-content');
    for (const [name, href] of DOMAIN_ENTRIES) {
      const link = main.getByRole('link', { name, exact: true }).first();
      // next/link normalizes trailing slashes between dev and export; the
      // domain segment is what matters.
      const hrefValue = await link.getAttribute('href');
      expect(hrefValue).toMatch(new RegExp(`^${href}/?$`));
      const box = await link.boundingBox();
      expect(box, `${name} link inside first viewport`).not.toBeNull();
      expect(box!.y).toBeLessThan(900);
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
    const top = await featured
      .locator('svg')
      .first()
      .evaluate((el) => {
        return el.getBoundingClientRect().top + window.scrollY;
      });
    expect(top).toBeLessThanOrEqual(1200);
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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/');
    await main.getByRole('link', { name: /Market Map/ }).click();
    await expect(page).toHaveURL(/\/market-map\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
    const counts = await page.evaluate(
      (names) => {
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
      },
      DOMAIN_ENTRIES.map(([name]) => name),
    );
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
    const index = page.getByRole('region', { name: /domain index/i });
    await expect(index.getByRole('listitem')).toHaveCount(7);
  });
});
