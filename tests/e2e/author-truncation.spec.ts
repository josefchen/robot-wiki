import matter from 'gray-matter';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTHORS_SHOWN } from '../../components/article/author-list';
import { getCitation } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';
import { closeBrowserAndStopServer } from './static-spec-teardown';

/**
 * Author-list truncation in the References bibliography (VAL-WIKI-029),
 * measured on the shipped artifact in out/.
 *
 * Baseline before the fix (measured 2026-08-21): the renderer joined the
 * whole array, so on /manipulation/pi-line both 87-name twins rendered 1275
 * characters across 16 author line boxes at 1440px and 32 at 375px, with no
 * elision marker and no expand affordance anywhere on the page. The
 * References section was 2443px tall at 1440px and 4213px at 375px with
 * nothing to reduce.
 */

const OUT = join(process.cwd(), 'out');

/** The route that renders both 87-name twins at once. */
const ANCHOR = '/manipulation/pi-line/';

/** Marker pattern from clause (a). */
const ELISION = /\b(?:\+|and)\s*(\d+)\s+(?:more|others|authors)\b/i;

let server: StaticExportServer;
let browser: Browser;

test.beforeAll(async () => {
  server = await startStaticExportServer(OUT);
  browser = await chromium.launch();
});

test.afterAll(async () => {
  await closeBrowserAndStopServer(browser, server);
});

/** Declared citation ids for an article, deduped, in frontmatter order. */
function declaredIds(domain: string, slug: string): string[] {
  const source = readFileSync(
    join(process.cwd(), 'content', domain, `${slug}.mdx`),
    'utf8',
  );
  const fm = matter(source).data as { citations?: unknown };
  const ids = Array.isArray(fm.citations) ? (fm.citations as string[]) : [];
  return [...new Set(ids)];
}

async function open(route: string, width: number): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}${route}`);
  return page;
}

/** The rendered author text of every entry, keyed by registry id. */
async function authorText(page: Page): Promise<Record<string, string>> {
  const rows = await page
    .locator('ol [data-reference-id]')
    .evaluateAll((els) =>
      els.map((el) => [
        el.getAttribute('data-reference-id') ?? '',
        el.querySelector('[data-author-names]')?.textContent ?? '',
      ]),
    );
  return Object.fromEntries(rows);
}

test.describe('References author truncation (VAL-WIKI-029)', () => {
  // The population is derived from the module registry, so an article added
  // later is swept without touching this file.
  test('every entry on every published article is bounded and its marker counts correctly', async () => {
    const page = await open('/', 1440);
    const failures: string[] = [];
    let entriesSeen = 0;
    let markersSeen = 0;

    for (const entry of publishedModules()) {
      const route = `/${entry.domain}/${entry.slug}/`;
      await page.goto(`http://127.0.0.1:${server.port}${route}`);
      const rendered = await authorText(page);
      const ids = declaredIds(entry.domain, entry.slug);
      expect(Object.keys(rendered), `entries on ${route}`).toHaveLength(
        ids.length,
      );
      expect(ids.length).toBeGreaterThan(0);

      for (const id of ids) {
        entriesSeen += 1;
        const citation = getCitation(id);
        expect(citation, `registry entry ${id}`).toBeDefined();
        if (!citation) continue;
        const text = rendered[id] ?? '';
        const total = citation.authors.length;
        const shown = citation.authors.filter((a) => text.includes(a));
        const match = ELISION.exec(text);

        if (total <= AUTHORS_SHOWN) {
          if (match) failures.push(`${route} ${id}: marker on a ${total}-author entry`);
          if (text !== citation.authors.join(', ')) {
            failures.push(`${route} ${id}: short list not rendered in full`);
          }
          continue;
        }

        markersSeen += 1;
        if (shown.length !== AUTHORS_SHOWN) {
          failures.push(
            `${route} ${id}: rendered ${shown.length} of ${total} names, bound is ${AUTHORS_SHOWN}`,
          );
        }
        if (!match) {
          failures.push(`${route} ${id}: no elision marker on a ${total}-author entry`);
          continue;
        }
        const stated = Number(match[1]);
        if (stated !== total - AUTHORS_SHOWN) {
          failures.push(
            `${route} ${id}: marker states ${stated}, expected ${total - AUTHORS_SHOWN}`,
          );
        }
        // Clause (d): rendered names are registry names in registry order,
        // and the first author is never elided away.
        if (
          shown.join('|') !== citation.authors.slice(0, AUTHORS_SHOWN).join('|')
        ) {
          failures.push(`${route} ${id}: rendered names out of registry order`);
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
    // Guards against a silent zero-match sweep.
    expect(entriesSeen).toBeGreaterThan(200);
    expect(markersSeen).toBeGreaterThan(20);
    await page.context().close();
  });

  for (const width of [1440, 375]) {
    test(`no author line exceeds 4 line boxes on the anchor route at ${width}px`, async () => {
      const page = await open(ANCHOR, width);
      const rows = await page
        .locator('ol [data-reference-id]')
        .evaluateAll((els) =>
          els.map((el) => {
            const names = el.querySelector('[data-author-names]');
            const range = document.createRange();
            if (names) range.selectNodeContents(names);
            return {
              id: el.getAttribute('data-reference-id') ?? '',
              lineBoxes: names ? range.getClientRects().length : 0,
            };
          }),
        );
      const over = rows.filter((r) => r.lineBoxes > 4);
      expect(
        over,
        over.map((r) => `${r.id}: ${r.lineBoxes} line boxes`).join('\n'),
      ).toEqual([]);
      await page.context().close();
    });

    test(`expanding every author list grows the References section by over 30% at ${width}px`, async () => {
      const page = await open(ANCHOR, width);
      const section = page.locator(
        'section[aria-labelledby="references-heading"]',
      );
      const truncated = await section.evaluate(
        (el) => el.getBoundingClientRect().height,
      );
      const buttons = section.locator('button[aria-expanded="false"]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        await section.locator('button[aria-expanded="false"]').first().click();
      }
      const expanded = await section.evaluate(
        (el) => el.getBoundingClientRect().height,
      );
      const reduction = (expanded - truncated) / expanded;
      expect(
        reduction,
        `truncated ${Math.round(truncated)}px vs expanded ${Math.round(expanded)}px`,
      ).toBeGreaterThanOrEqual(0.3);
      await page.context().close();
    });
  }

  test('the expand affordance is keyboard reachable and reveals the full registry list in order', async () => {
    const page = await open(ANCHOR, 1440);
    const entry = page.locator('ol [data-reference-id="pi07-2026"]');
    const citation = getCitation('pi07-2026');
    expect(citation?.authors).toHaveLength(87);
    if (!citation) return;

    const button = entry.getByRole('button', {
      name: `Show all ${citation.authors.length} authors`,
    });
    await expect(button).toBeVisible();

    // Reachable by keyboard, with a visible focus indicator.
    const unfocused = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`;
    });
    await button.focus();
    await expect(button).toBeFocused();
    const focused = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`;
    });
    expect(focused).not.toBe(unfocused);

    await button.press('Enter');
    const names = await entry
      .locator('[data-author-names]')
      .evaluate((el) => el.textContent ?? '');
    expect(names).toBe(citation.authors.join(', '));

    // The twin on the same page is independent and still truncated.
    const twin = await page
      .locator('ol [data-reference-id="pi07-blog-2026"] [data-author-names]')
      .evaluate((el) => el.textContent ?? '');
    expect(twin).toMatch(ELISION);
    await page.context().close();
  });

  test('the entry count is unchanged by truncation (VAL-WIKI-014)', async () => {
    const page = await open(ANCHOR, 1440);
    const declared = declaredIds('manipulation', 'pi-line');
    await expect(page.locator('ol [data-reference-id]')).toHaveCount(
      declared.length,
    );
    // The header's citation count still matches the rendered entry count.
    const header = await page.locator('#main-content').innerText();
    expect(header).toMatch(new RegExp(`\\b${declared.length}\\b`));
    await page.context().close();
  });

  test('References still shows year, venue and a primary-source link (VAL-WIKI-002)', async () => {
    const page = await open(ANCHOR, 1440);
    for (const id of declaredIds('manipulation', 'pi-line')) {
      const citation = getCitation(id);
      if (!citation) continue;
      const entry = page.locator(`ol [data-reference-id="${id}"]`);
      const meta = await entry.locator('p').first().innerText();
      expect(meta).toContain(String(citation.year));
      if (citation.venue) expect(meta).toContain(citation.venue);
      await expect(entry.locator('a[target="_blank"]').first()).toHaveAttribute(
        'href',
        citation.url,
      );
    }
    await page.context().close();
  });

  test('no page-level horizontal overflow at 375px (VAL-WIKI-006)', async () => {
    const page = await open(ANCHOR, 375);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  test('zero axe violations in both states on the anchor route (VAL-WIKI-018)', async () => {
    const page = await open(ANCHOR, 1440);
    const truncated = await new AxeBuilder({ page }).analyze();
    expect(truncated.violations).toEqual([]);
    const section = page.locator(
      'section[aria-labelledby="references-heading"]',
    );
    const count = await section.locator('button[aria-expanded="false"]').count();
    for (let i = 0; i < count; i += 1) {
      await section.locator('button[aria-expanded="false"]').first().click();
    }
    const expanded = await new AxeBuilder({ page }).analyze();
    expect(expanded.violations).toEqual([]);
    await page.context().close();
  });
});
