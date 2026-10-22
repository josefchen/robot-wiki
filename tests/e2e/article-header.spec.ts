import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { getCitation } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { inlineCitationIds, moduleBody, resolveReferences } from '../../lib/references';
import { WORDS_PER_MINUTE } from '../../lib/reading-time';
import { forEachInOwnContext, inOwnContext } from './helpers/per-route-context';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

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

function frontmatterLastReviewed(domain: string, slug: string): string | undefined {
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
  return resolveReferences(ids, inlineCitationIds(moduleBody(source)), getCitation)
    .length;
}

async function displayedReadingMinutes(page: Page): Promise<number> {
  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard): the monospace <dl> became one meta line, "Updated … · N min
  // read · N sources", with the same data hooks.
  const text = (await page.locator('[data-article-meta] [data-header-reading-minutes]').textContent()) ?? '';
  const match = /^(\d+)\s*min read$/.exec(text.trim());
  expect(match, `reading-time slot shows "${text.trim()}"`).not.toBeNull();
  return Number(match?.[1]);
}

/**
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * from 1200 px each citation's sidenote stands in the margin beside the
 * prose. A note is the citation's apparatus, as the hover tooltip it
 * replaced was, and the reading-time measure leaves it out
 * (lib/reading-time.ts and the `.sidenote` rule in app/globals.css), so the
 * rendered prose is read with the notes set aside and restored after.
 */
async function proseWordCount(page: Page): Promise<number> {
  return page.locator('article .prose').evaluate((prose) => {
    const notes = [...prose.querySelectorAll<HTMLElement>('[data-sidenote]')];
    const display = notes.map((note) => note.style.display);
    for (const note of notes) note.style.display = 'none';
    const text = (prose as HTMLElement).innerText;
    notes.forEach((note, index) => { note.style.display = display[index]; });
    return text.trim().split(/\s+/).filter(Boolean).length;
  });
}

type TitleBreak = { word: string; hyphen: boolean };

/**
 * Every line break that falls inside a word of the article title, and
 * whether a hyphen was painted at the end of that line, plus the widest
 * unbreakable run's share of the title's line. Characters are compared by
 * their offset in the title text, so a break at a space (a trailing space
 * paints nothing) is never read as a break inside a word.
 */
function titleBreaks(): { breaks: TitleBreak[]; widestWordShare: number } {
  const h1 = document.querySelector<HTMLElement>('article header h1');
  if (!h1) return { breaks: [], widestWordShare: 0 };
  const fontSize = Number.parseFloat(getComputedStyle(h1).fontSize);
  const sameLine = (a: number, b: number) => Math.abs(a - b) < fontSize / 4;
  const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);
  const range = document.createRange();
  const chars: { ch: string; at: number; top: number; right: number; node: Text }[] = [];
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  let at = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (let i = 0; i < node.length; i += 1, at += 1) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (rect && rect.width > 0) chars.push({ ch: node.data[i], at, top: rect.top, right: rect.right, node });
    }
  }
  const joined = (a: number, b: number) => chars[b].at - chars[a].at === 1;
  const breaks: TitleBreak[] = [];
  for (let i = 1; i < chars.length; i += 1) {
    const prev = chars[i - 1];
    const next = chars[i];
    if (sameLine(prev.top, next.top) || !joined(i - 1, i)) continue;
    if (!isWordChar(prev.ch) || !isWordChar(next.ch)) continue;
    // A hyphenation break paints a hyphen past the line's last character; a
    // word forced apart because it is wider than the line paints nothing.
    range.selectNodeContents(prev.node);
    const hyphen = Array.from(range.getClientRects()).some(
      (rect) => sameLine(rect.top, prev.top) && rect.right >= prev.right + fontSize * 0.15,
    );
    let start = i - 1;
    while (start > 0 && isWordChar(chars[start - 1].ch) && joined(start - 1, start)) start -= 1;
    let end = i;
    while (end < chars.length - 1 && isWordChar(chars[end + 1].ch) && joined(end, end + 1)) end += 1;
    const word = chars.slice(start, end + 1).map(({ ch }) => ch).join('');
    breaks.push({ word: `${word.slice(0, i - start)}|${word.slice(i - start)}`, hyphen });
  }
  // A run the browser may not break: whitespace and hard hyphens end it.
  const runs = (h1.textContent ?? '').split(/\s+/).flatMap((word) => word.split(/(?<=-)/)).filter(Boolean);
  const measure = document.createElement('span');
  measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
  h1.append(measure);
  let widest = 0;
  for (const run of runs) {
    measure.textContent = run;
    widest = Math.max(widest, measure.getBoundingClientRect().width);
  }
  measure.remove();
  return { breaks, widestWordShare: widest / h1.clientWidth };
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
    browser,
  }) => {
    test.setTimeout(300_000);
    expect(published.length).toBeGreaterThan(0);

    await forEachInOwnContext(browser, published, async (page, m) => {
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
          .replace(/^Updated\s*/, '')
          .replace(/\s*·\s*$/, '')
          .trim();
        expect(text).toBe(expectedDateText(iso));
        expect(text).not.toMatch(/^\d{1,4}[\/.]\d{1,2}[\/.]\d{1,4}$/);
      });
    });
  });

  test('every header citation count equals the References entries actually rendered (VAL-WIKI-014)', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const seenCounts = new Set<number>();

    await forEachInOwnContext(browser, published, async (page, m) => {
      await test.step(`${m.domain}/${m.slug}`, async () => {
        await page.goto(`${BASE}/${m.domain}/${m.slug}/`);

        const headerCount = Number(
          await page
            .locator('[data-article-meta] [data-header-citation-count]')
            .getAttribute('data-header-citation-count'),
        );
        // The visible count is the same number, spelled with its noun.
        await expect(page.locator('[data-article-meta] [data-header-citation-count]')).toHaveText(
          `${headerCount} ${headerCount === 1 ? 'source' : 'sources'}`,
        );
        const renderedCount = await page.locator('ol [data-reference-id]').count();
        const resolvedCount = expectedCitationCount(m.domain, m.slug);

        // One source: header, bibliography and the resolved registry list
        // all agree on the same page.
        expect(headerCount).toBe(renderedCount);
        expect(renderedCount).toBe(resolvedCount);
        seenCounts.add(headerCount);
      });
    });

    // Not a hardcoded constant: the published set genuinely spans several
    // distinct citation counts.
    expect(seenCounts.size).toBeGreaterThan(1);
  });

  test('reading time matches the rendered article at 200 wpm within a minute, varies, never degenerate (VAL-WIKI-015)', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    expect(WORDS_PER_MINUTE).toBe(200);

    const minutesByArticle = new Map<string, number>();
    const wordsByArticle = new Map<string, number>();

    await forEachInOwnContext(browser, published, async (page, m) => {
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
        expect(Math.abs(displayed - words / WORDS_PER_MINUTE)).toBeLessThanOrEqual(1);

        minutesByArticle.set(key, displayed);
        wordsByArticle.set(key, words);
      });
    });

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

  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard): the line is muted Geist below the lead, not monospace. Quiet
  // and small is now measured: smaller than the body text and in the muted
  // ink, never the full ink.
  test('the metadata renders quiet and small: muted, smaller than the body, no badges, no emoji', async ({
    page,
  }) => {
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);
    const meta = page.locator('article header [data-article-meta]');
    await expect(meta).toBeVisible();
    const look = await meta.evaluate((el) => {
      const style = getComputedStyle(el);
      const body = document.querySelector('article .prose p');
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement('span');
      probe.style.color = root.getPropertyValue('--muted').trim();
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      return {
        size: parseFloat(style.fontSize),
        bodySize: body ? parseFloat(getComputedStyle(body).fontSize) : 0,
        color: style.color,
        muted,
        ink: root.getPropertyValue('--ink').trim(),
        family: style.fontFamily,
      };
    });
    expect(look.bodySize).toBeGreaterThan(0);
    expect(look.size).toBeLessThan(look.bodySize);
    expect(look.color).toBe(look.muted);
    expect(look.family).not.toMatch(/mono/i);

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

    const items = page.locator('article header [data-article-meta] > span, article header [data-article-meta] > a');
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
      .locator('article header [data-article-meta] > span, article header [data-article-meta] > a')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(1440);
    }
    await context.close();
  });

  test('no article title breaks inside a word without a hyphen at 375px or 390px', async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    const widths = [375, 390] as const;
    const unhyphenated: string[] = [];
    let tightest = { route: '', width: 0, share: 0 };
    let measured = 0;

    for (const width of widths) {
      await forEachInOwnContext(
        browser,
        published,
        async (page, m) => {
          const route = `/${m.domain}/${m.slug}/`;
          await page.goto(`${BASE}${route}`);
          await page.evaluate(() => document.fonts.ready);
          const { breaks, widestWordShare } = await page.evaluate(titleBreaks);
          measured += 1;
          for (const { word } of breaks.filter(({ hyphen }) => !hyphen)) {
            unhyphenated.push(`${route} at ${width}px: ${word}`);
          }
          if (widestWordShare > tightest.share) tightest = { route, width, share: widestWordShare };
        },
        { viewport: { width, height: 812 } },
      );
    }

    expect(measured).toBe(published.length * widths.length);
    expect(unhyphenated).toEqual([]);

    // The detector can see a forced break: the tightest title, set just
    // past the size at which its widest run fills the line and with
    // hyphenation off, must report one.
    expect(tightest.share).toBeGreaterThan(0.5);
    const planted = await inOwnContext(
      browser,
      async (page) => {
        await page.goto(`${BASE}${tightest.route}`);
        await page.evaluate(() => document.fonts.ready);
        const size = await page
          .locator('article header h1')
          .evaluate((h1) => Number.parseFloat(getComputedStyle(h1).fontSize));
        await page.addStyleTag({
          content: `article header h1 { font-size: ${(size / tightest.share) * 1.08}px !important; hyphens: manual !important; }`,
        });
        return (await page.evaluate(titleBreaks)).breaks;
      },
      { viewport: { width: tightest.width, height: 812 } },
    );
    expect(planted.filter(({ hyphen }) => !hyphen).length, `planted break on ${tightest.route}`).toBeGreaterThan(0);
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
    expect(html).toMatch(/Updated <time/);

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

  test('zero axe violations with the header metadata rendered', async ({ page }) => {
    await page.goto(`${BASE}/manipulation/comparison-matrix/`);
    const results = await new AxeBuilder({ page })
      .include('article header')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
