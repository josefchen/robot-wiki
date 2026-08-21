import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import { RESULT_LIMIT } from '../../lib/search';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Prose ranking, cap ordering, and structured snippets against the shipped
 * export (VAL-SEARCH-024/025/026). The Pagefind index and the exported
 * MiniSearch index only exist in out/, so the dev server cannot prove any
 * of this.
 *
 * Every population here is DERIVED from the module registry or from the
 * raw index at run time, never from a literal query list: the index was
 * widened from 42 to 55 pages under this feature's own nose, and a
 * hardcoded query set would have gone on grading the old index.
 */

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before the search-ranking spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function samePath(href: string, route: string): boolean {
  return (
    new URL(href, 'http://x').pathname.replace(/\/$/, '') ===
    route.replace(/\/$/, '')
  );
}

type Rendered = {
  prose: Array<{ href: string; title: string; markCount: number }>;
  structured: Array<{ href: string; title: string; snippet: string }>;
};

async function search(page: Page, query: string): Promise<Rendered> {
  await page.goto(`${BASE}/search/?q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('status').first()).not.toHaveText(
    /Searching for/i,
    { timeout: 20_000 },
  );
  return await page.evaluate(() => {
    const read = (group: string) =>
      [
        ...document.querySelectorAll(
          `[data-results-group="${group}"] a[data-search-result]`,
        ),
      ];
    return {
      prose: read('prose').map((el) => ({
        href: el.getAttribute('href') ?? '',
        title: (el.querySelector('span')?.textContent ?? '').trim(),
        markCount: el.querySelectorAll('.search-excerpt mark').length,
      })),
      structured: read('structured').map((el) => ({
        href: el.getAttribute('href') ?? '',
        title: (
          el.querySelector('[data-entity-title]')?.textContent ?? ''
        ).trim(),
        snippet: (
          el.querySelector('[data-entity-snippet]')?.textContent ?? ''
        ).trim(),
      })),
    };
  });
}

/** Raw Pagefind hits, before the app's genuineness filter and cap. */
async function rawHits(
  page: Page,
  query: string,
): Promise<Array<{ url: string; content: string }>> {
  await page.goto(`${BASE}/search/`, { waitUntil: 'domcontentloaded' });
  return await page.evaluate(async (q) => {
    const load = new Function('s', 'return import(s)') as (
      s: string,
    ) => Promise<{
      search: (query: string) => Promise<{
        results: Array<{ data: () => Promise<{ url: string; content?: string }> }>;
      }>;
    }>;
    const pagefind = await load('/pagefind/pagefind.js');
    const response = await pagefind.search(q);
    const data = await Promise.all(response.results.map((r) => r.data()));
    return data.map((d) => ({ url: d.url, content: d.content ?? '' }));
  }, query);
}

/** The app's genuineness rule, restated so the spec can grade a raw hit. */
function tokenize(value: string): string[] {
  return value.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((t) => t.toLowerCase());
}

function isGenuine(query: string, content: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return false;
  if (!content.trim()) return true;
  const words = tokenize(content);
  return tokens.every((token) => words.some((word) => word.startsWith(token)));
}

test.describe('VAL-SEARCH-024: prose results are ranked, with the title weighted', () => {
  /**
   * A query is only a valid case for this assertion when it appears in one
   * article's own h1 AND in the body prose of at least one other published
   * article: without the second condition there is nothing for the title
   * weight to outrank. Both halves are measured from the export.
   */
  let cases: Array<{ query: string; owner: string; alsoMentionedOn: string[] }>;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300_000);
    const page = await browser.newPage();
    const routes = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);

    const headings = new Map<string, string>();
    const bodies = new Map<string, string>();
    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const { h1, body } = await page.evaluate(() => ({
        h1: document.querySelector('main h1')?.textContent ?? '',
        body:
          (document.querySelector('main') as HTMLElement | null)?.innerText ??
          '',
      }));
      headings.set(route, normalize(h1));
      bodies.set(route, normalize(body));
    }

    cases = [];
    for (const route of routes) {
      const heading = headings.get(route)!;
      // A single-character word can never match: Pagefind does not index
      // one-character terms, so a title reduced to one would be untestable
      // rather than unranked.
      if (!heading || heading.split(' ').some((w) => w.length < 2)) continue;
      const elsewhere = routes.filter(
        (other) => other !== route && bodies.get(other)!.includes(heading),
      );
      if (elsewhere.length === 0) continue;
      cases.push({ query: heading, owner: route, alsoMentionedOn: elsewhere });
    }
    await page.close();
  });

  test('at least 5 title queries are also mentioned in another article', () => {
    expect(
      cases.length,
      'not enough queries where a title also appears in another article: the assertion cannot be graded',
    ).toBeGreaterThanOrEqual(5);
  });

  test('the title-matching article is the first prose result, identically across three runs', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const notFirst: string[] = [];
    const nondeterministic: string[] = [];

    for (const entry of cases) {
      const runs: string[][] = [];
      // Two runs in one session plus one after a full reload, which is what
      // distinguishes a stable sort from a lucky one.
      for (let i = 0; i < 2; i += 1) {
        runs.push((await search(page, entry.query)).prose.map((h) => h.href));
      }
      await page.reload();
      runs.push((await search(page, entry.query)).prose.map((h) => h.href));

      if (
        JSON.stringify(runs[0]) !== JSON.stringify(runs[1]) ||
        JSON.stringify(runs[1]) !== JSON.stringify(runs[2])
      ) {
        nondeterministic.push(
          `"${entry.query}": ${runs.map((r) => r.join('|')).join(' vs ')}`,
        );
        continue;
      }
      if (runs[0].length === 0 || !samePath(runs[0][0]!, entry.owner)) {
        notFirst.push(
          `"${entry.query}" owned by ${entry.owner} (also on ${entry.alsoMentionedOn.join(', ')}) ranked ${runs[0].join(', ') || 'nothing'}`,
        );
      }
    }

    expect(nondeterministic, 'queries whose order changed across runs').toEqual(
      [],
    );
    expect(notFirst, 'queries where the title-matching article is not first').toEqual(
      [],
    );
  });
});

test.describe('VAL-SEARCH-025: the cap is applied after the genuineness filter', () => {
  /**
   * Saturating queries, derived by asking the raw index which queries
   * return more hits than the cap. A saturating query is exactly where a
   * mis-ordered cap discards a genuine hit, so the population has to come
   * from the index rather than from a remembered list.
   */
  let saturating: Array<{
    query: string;
    raw: Array<{ url: string; genuine: boolean }>;
  }>;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300_000);
    const page = await browser.newPage();
    // Broad single-word queries: common enough to exceed the cap, and each
    // one is a real term a reader would type.
    const candidates = [
      'policy',
      'robot',
      'control',
      'learning',
      'model',
      'data',
      'task',
      'system',
      'training',
      'action',
    ];
    saturating = [];
    for (const query of candidates) {
      const hits = await rawHits(page, query);
      if (hits.length <= RESULT_LIMIT) continue;
      saturating.push({
        query,
        raw: hits.map((hit) => ({
          url: hit.url,
          genuine: isGenuine(query, hit.content),
        })),
      });
    }
    await page.close();
  });

  test('at least 3 queries return more raw hits than the cap', () => {
    expect(
      saturating.length,
      'no query saturates the cap, so the ordering cannot be graded',
    ).toBeGreaterThanOrEqual(3);
    for (const entry of saturating) {
      expect(entry.raw.length).toBeGreaterThan(RESULT_LIMIT);
    }
  });

  test('the rendered count reaches the cap and no rejected hit is rendered', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    for (const entry of saturating) {
      const genuine = entry.raw.filter((hit) => hit.genuine);
      const rendered = (await search(page, entry.query)).prose;

      const expected = Math.min(genuine.length, RESULT_LIMIT);
      expect(
        rendered.length,
        `"${entry.query}": ${genuine.length} genuine of ${entry.raw.length} raw hits, but only ${rendered.length} rendered`,
      ).toBe(expected);

      const rejected = new Set(
        entry.raw.filter((hit) => !hit.genuine).map((hit) => hit.url),
      );
      const padded = rendered.filter((hit) => rejected.has(hit.href));
      expect(
        padded.map((h) => h.href),
        `"${entry.query}": rejected hits rendered as padding`,
      ).toEqual([]);
    }
  });

  test('a genuine hit the index ranked past the cap is rendered', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    // The defect this assertion exists to catch only arises when the raw
    // list holds a rejected hit INSIDE the cap: that is what pushes a
    // genuine hit past it. At least one query must exhibit that shape, or
    // the run proves nothing.
    let graded = 0;
    for (const entry of saturating) {
      const rejectedInsideCap = entry.raw
        .slice(0, RESULT_LIMIT)
        .filter((hit) => !hit.genuine).length;
      if (rejectedInsideCap === 0) continue;

      const genuinePastCap = entry.raw
        .slice(RESULT_LIMIT)
        .filter((hit) => hit.genuine)
        .slice(0, rejectedInsideCap);
      if (genuinePastCap.length === 0) continue;

      const rendered = (await search(page, entry.query)).prose;
      for (const hit of genuinePastCap) {
        expect(
          rendered.some((r) => samePath(r.href, hit.url)),
          `"${entry.query}": genuine hit ${hit.url} was ranked past the cap (position >${RESULT_LIMIT}) and is missing from the rendered set`,
        ).toBe(true);
      }
      graded += 1;
    }
    expect(
      graded,
      'no query had a rejected hit inside the cap and a genuine hit past it, so the post-cap rescue was never exercised',
    ).toBeGreaterThan(0);
  });
});

test.describe('VAL-SEARCH-026: structured results carry a snippet', () => {
  const MIN_SNIPPET_CHARS = 40;
  const SIX_WORD_WINDOW = 6;
  // Two entity types minimum, spread across all three: two company queries,
  // one method query and one dataset query.
  const QUERIES = ['humanoid', 'robotics', 'flow matching', 'manipulation'];

  test('each query returns at least 3 structured results across at least two types', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const types = new Set<string>();
    for (const query of QUERIES) {
      const { structured } = await search(page, query);
      expect(
        structured.length,
        `"${query}" returned ${structured.length} structured results`,
      ).toBeGreaterThanOrEqual(3);
      const seen = await page
        .locator('[data-results-group="structured"] [data-entity-type]')
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute('data-entity-type') ?? ''),
        );
      for (const type of seen) types.add(type);
    }
    expect([...types].length).toBeGreaterThanOrEqual(2);
  });

  test('every structured result carries a distinct, dash-free snippet of 40+ characters', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    for (const query of QUERIES) {
      const { structured } = await search(page, query);
      const seen = new Set<string>();
      for (const hit of structured) {
        expect(
          hit.snippet.length,
          `"${query}" / ${hit.title}: snippet is "${hit.snippet}"`,
        ).toBeGreaterThanOrEqual(MIN_SNIPPET_CHARS);
        expect(
          /[\u2013\u2014]/.test(hit.snippet),
          `"${query}" / ${hit.title}: snippet contains a banned dash`,
        ).toBe(false);
        expect(
          seen.has(hit.snippet),
          `"${query}": duplicate snippet "${hit.snippet}"`,
        ).toBe(false);
        seen.add(hit.snippet);
      }
    }
  });

  test('a 6-word window of every snippet is verbatim on its destination route', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const routeText = new Map<string, string>();
    const failures: string[] = [];

    for (const query of QUERIES) {
      const { structured } = await search(page, query);
      for (const hit of structured) {
        const route = new URL(hit.href, 'http://x').pathname;
        if (!routeText.has(route)) {
          await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
          // The market map and both tables render every row client-side.
          await page.waitForTimeout(1000);
          routeText.set(
            route,
            normalize(
              await page.evaluate(
                () =>
                  (document.querySelector('main') as HTMLElement | null)
                    ?.innerText ?? '',
              ),
            ),
          );
        }
        const words = normalize(hit.snippet).split(' ').filter(Boolean);
        expect(words.length).toBeGreaterThanOrEqual(SIX_WORD_WINDOW);
        const window = words.slice(0, SIX_WORD_WINDOW).join(' ');
        if (!routeText.get(route)!.includes(window)) {
          failures.push(`${hit.title} (${route}): "${window}" not found`);
        }
      }
    }
    expect(failures, 'snippet windows missing from their destination route').toEqual(
      [],
    );
  });

  test('prose excerpt highlighting does not regress on the same queries', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    for (const query of QUERIES) {
      const { prose } = await search(page, query);
      expect(prose.length, `"${query}" returned no prose results`).toBeGreaterThan(
        0,
      );
      const marked = prose.filter((hit) => hit.markCount > 0);
      expect(
        marked.length,
        `"${query}": ${prose.length} prose results, none carrying a <mark> span`,
      ).toBeGreaterThan(0);
    }
  });
});
