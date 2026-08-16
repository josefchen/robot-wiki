import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { getCitation } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import {
  inlineCitationIds,
  moduleBody,
  resolveReferences,
} from '../../lib/references';
import { WORDS_PER_MINUTE } from '../../lib/reading-time';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Article header metadata (VAL-WIKI-013, VAL-WIKI-014, VAL-WIKI-015):
 * domain, last-reviewed date, reading time and citation count on every
 * published article, rendered by the shared template and derived at build
 * time (frontmatter `lastReviewed`, the resolved References list, and the
 * rendered article measured at WORDS_PER_MINUTE into data/reading-times
 * .json). Verified against the shipped artifact: the static export served
 * locally (an OS-assigned free port; see static-export-server.ts), never
 * the dev server, because the export is what deploys.
 */

let BASE: string;
const published = publishedModules();

// Independent month names: the spec derives the expected date string
// without importing lib/dates, so a broken formatter cannot pass its own
// test.
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function expectedDateText(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function frontmatterLastReviewed(
  domain: string,
  slug: string,
): string | undefined {
  const source = readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
  const value = matter(source).data.lastReviewed;
  return typeof value === 'string' ? value : undefined;
}

function expectedCitationCount(domain: string, slug: string): number {
  const source = readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
  const fm = matter(source).data as { citations?: unknown };
  const ids = Array.isArray(fm.citations) ? (fm.citations as string[]) : [];
  return resolveReferences(
    ids,
    inlineCitationIds(moduleBody(source)),
    getCitation,
  ).length;
}

async function displayedReadingMinutes(page: Page): Promise<number> {
  const text =
    (await page.locator('dd[data-header-reading-minutes]').textContent()) ?? '';
  const match = /^(\d+)\s*min$/.exec(text.trim());
  expect(match, `reading-time slot shows "${text.trim()}"`).not.toBeNull();
  return Number(match?.[1]);
}

async function proseWordCount(page: Page): Promise<number> {
  const text = await page.locator('article .prose').innerText();
  return text.trim().split(/\s+/).filter(Boolean).length;
}

let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the article-header spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test.describe('Article header metadata', () => {
  test('every article shows its frontmatter last-reviewed date, unambiguous and machine-reconcilable (VAL-WIKI-013)', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    expect(published.length).toBeGreaterThan(0);

    for (const m of published) {
      await test.step(`${m.domain}/${m.slug}`, async () => {
        await page.goto(`${BASE}/${m.domain}/${m.slug}/`);
        const iso = frontmatterLastReviewed(m.domain, m.slug);
        expect(iso, `${m.domain}/${m.slug} declares lastReviewed`).toBeTruthy();
        if (!iso) return;

        const slot = page.locator('[data-header-last-reviewed]');
        await expect(slot).toBeVisible();
        // Machine value: exactly the frontmatter string.
        await expect(slot).toHaveAttribute('data-header-last-reviewed', iso);
        const time = slot.locator('time');
        await expect(time).toHaveAttribute('datetime', iso);

        // Displayed value: spelled month, day-month-year, no numeric-only
        // form. Derived independently above, not via lib/dates.
        const text = ((await slot.textContent()) ?? '')
          .replace(/^Last reviewed\s*/, '')
          .trim();
        expect(text).toBe(expectedDateText(iso));
        expect(text).not.toMatch(/^\d{1,4}[\/.]\d{1,2}[\/.]\d{1,4}$/);
      });
    }
  });

  test('every header citation count equals the References entries actually rendered (VAL-WIKI-014)', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const seenCounts = new Set<number>();

    for (const m of published) {
      await test.step(`${m.domain}/${m.slug}`, async () => {
        await page.goto(`${BASE}/${m.domain}/${m.slug}/`);

        const headerCount = Number(
          await page
            .locator('dd[data-header-citation-count]')
            .textContent()
            .then((t) => t?.trim()),
        );
        const renderedCount = await page
          .locator('ol [data-reference-id]')
          .count();
        const resolvedCount = expectedCitationCount(m.domain, m.slug);

        // One source: header, bibliography and the resolved registry list
        // all agree on the same page.
        expect(headerCount).toBe(renderedCount);
        expect(renderedCount).toBe(resolvedCount);
        seenCounts.add(headerCount);
      });
    }

    // Not a hardcoded constant: the published set genuinely spans several
    // distinct citation counts.
    expect(seenCounts.size).toBeGreaterThan(1);
  });

  test('reading time matches the rendered article at 200 wpm within a minute, varies, never degenerate (VAL-WIKI-015)', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    expect(WORDS_PER_MINUTE).toBe(200);

    const minutesByArticle = new Map<string, number>();
    const wordsByArticle = new Map<string, number>();

    for (const m of published) {
      const key = `${m.domain}/${m.slug}`;
      await test.step(key, async () => {
        await page.goto(`${BASE}/${key}/`);
        const displayed = await displayedReadingMinutes(page);
        const words = await proseWordCount(page);

        // Never zero, NaN, blank or fractional: a real whole-minute read.
        expect(Number.isInteger(displayed)).toBe(true);
        expect(displayed).toBeGreaterThanOrEqual(1);

        // The contract: within one minute of the rendered word count at
        // the documented rate.
        expect(
          Math.abs(displayed - words / WORDS_PER_MINUTE),
        ).toBeLessThanOrEqual(1);

        minutesByArticle.set(key, displayed);
        wordsByArticle.set(key, words);
      });
    }

    // Varies between articles: not one constant value site-wide.
    const distinctMinutes = new Set(minutesByArticle.values());
    expect(distinctMinutes.size).toBeGreaterThan(1);

    // The shortest and longest published articles show different values.
    const byWords = [...wordsByArticle.entries()].sort((a, b) => a[1] - b[1]);
    const shortest = byWords[0];
    const longest = byWords[byWords.length - 1];
    expect(longest[1]).toBeGreaterThan(shortest[1]);
    expect(minutesByArticle.get(longest[0])).toBeGreaterThan(
      minutesByArticle.get(shortest[0]) ?? Infinity,
    );
  });

  test('the metadata renders quiet and small: monospace, no badges, no emoji', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);
    const meta = page.locator('article header dl');
    await expect(meta).toBeVisible();
    const className = (await meta.getAttribute('class')) ?? '';
    expect(className).toContain('font-mono');
    expect(className).toContain('text-xs');

    // No badge/pill treatment, no images, no emoji anywhere in the line.
    await expect(meta.locator('img, svg')).toHaveCount(0);
    const text = (await meta.textContent()) ?? '';
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    // And the metadata never out-shouts the title.
    const titleBox = await page.locator('article header h1').boundingBox();
    const metaBox = await meta.boundingBox();
    expect(titleBox && metaBox).toBeTruthy();
    if (titleBox && metaBox) {
      expect(metaBox.height).toBeLessThan(titleBox.height * 3);
    }
  });

  test('the header row wraps without overflowing at 375px (VAL-WIKI-013)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    // Citation-dense article: 22 entries exercises the widest metadata.
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const items = page.locator('article header dl > div');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const box = await items.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    }
    await context.close();
  });

  test('the header row wraps without overflowing at 1440px (VAL-WIKI-013)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const rights = await page
      .locator('article header dl > div')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(1440);
    }
    await context.close();
  });

  test('the metadata ships in the initial HTML: no client-side injection, no layout shift', async ({
    page,
  }) => {
    const route = `${BASE}/classical/kinematics/`;

    // The raw document already carries every value before any script runs.
    const response = await page.goto(route);
    const html = (await response?.body())?.toString('utf8') ?? '';
    expect(html).toContain('data-header-last-reviewed="');
    expect(html).toContain('data-header-reading-minutes="');
    expect(html).toContain('data-header-citation-count="');
    expect(html).toMatch(/Last reviewed/);

    // And the hydrated layout matches it: the header bounding box is
    // identical once scripts have settled (no reflow from late metadata).
    await page.waitForLoadState('networkidle');
    const settled = await page.locator('article header').boundingBox();
    await page.waitForTimeout(500);
    const after = await page.locator('article header').boundingBox();
    expect(settled && after).toBeTruthy();
    if (settled && after) {
      expect(after.x).toBeCloseTo(settled.x, 1);
      expect(after.y).toBeCloseTo(settled.y, 1);
      expect(after.width).toBeCloseTo(settled.width, 1);
      expect(after.height).toBeCloseTo(settled.height, 1);
    }
  });

  test('zero axe violations with the header metadata rendered', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);
    const results = await new AxeBuilder({ page })
      .include('article header')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
