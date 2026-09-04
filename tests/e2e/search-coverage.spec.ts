import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, DOMAIN_META, modules, publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Search coverage over the whole published route set, the site's own
 * navigation labels, and the empty state (VAL-SEARCH-021/022/023).
 *
 * Runs against the shipped export, because the Pagefind index only exists
 * there. Pagefind's scoping rule is the reason this spec exists: once any
 * page in a site declares `data-pagefind-body`, every page that declares
 * none is dropped from the index entirely, so the 13 non-article
 * destinations were invisible to search while the 42 articles were fine.
 *
 * The route population is DERIVED from the module registry plus the fixed
 * non-article destinations, never a literal list of today's routes: a
 * hardcoded population turns a corpus sweep into a spot check that cannot
 * see the route somebody adds next.
 */

let server: StaticExportServer | null = null;
let BASE: string;

/** The published route set, minus /search, which is exempt. */
const NON_ARTICLE_ROUTES = [
  '/',
  ...DOMAINS.map((domain) => `/${domain}/`),
  '/a-z/',
  '/market-map/',
  '/playground/',
  '/glossary/',
  '/credits/',
];

function articleRoutes(): string[] {
  return publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
}

function allRoutes(): string[] {
  return [...NON_ARTICLE_ROUTES, ...articleRoutes()];
}

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'pagefind', 'pagefind.js')),
    'out/ is missing or stale: run `npm run build` before the search-coverage spec',
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
  const a = new URL(href, 'http://x').pathname.replace(/\/$/, '');
  return a === route.replace(/\/$/, '');
}

/**
 * A route's indexable visible text: `main`'s rendered text with every
 * `data-pagefind-ignore` subtree removed. Chrome the site deliberately
 * excludes from the index on EVERY route (the breadcrumb trail, interactive
 * control labels, the article metadata row) is not a legitimate source of a
 * phrase, so a window straddling it would grade the assertion against text
 * no route was ever meant to match.
 */
async function indexableText(page: Page, route: string): Promise<string> {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return '';
    const clone = main.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll('[data-pagefind-ignore], nav[aria-label="Breadcrumb"]')
      .forEach((node) => node.remove());
    document.body.appendChild(clone);
    const text = clone.innerText;
    clone.remove();
    return text;
  });
}

/** Full visible text of `main`, used for the corpus-wide uniqueness count. */
async function mainText(page: Page, route: string): Promise<string> {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return await page.evaluate(
    () => (document.querySelector('main') as HTMLElement | null)?.innerText ?? '',
  );
}

/**
 * Four-word windows that are usable as a query. Single-character words are
 * excluded: they are fragments a compound left behind ("A-Z" normalizes to
 * "a z"), and Pagefind's own tokenizer does not index a one-character term,
 * so a window containing one cannot match on any route. Excluding them is a
 * property of the tokenizer rather than of the route under test, and every
 * route here has plenty of other windows.
 */
function fourWordWindows(text: string): string[] {
  const words = normalize(text).split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + 4 <= words.length; i += 1) {
    const window = words.slice(i, i + 4);
    if (window.some((word) => word.length < 2)) continue;
    out.push(window.join(' '));
  }
  return out;
}

type Settled = {
  status: string;
  prose: Array<{ href: string; title: string }>;
  structured: Array<{ href: string; title: string }>;
  siteEmptyCount: number;
};

async function search(page: Page, query: string): Promise<Settled> {
  await page.goto(`${BASE}/search/?q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });
  return await settle(page);
}

async function settle(page: Page): Promise<Settled> {
  const status = page.getByRole('status').first();
  await expect(status).not.toHaveText(/Searching for/i, { timeout: 20_000 });
  const read = (group: string) =>
    page
      .locator(`[data-results-group="${group}"] a[data-search-result]`)
      .evaluateAll((els) =>
        els.map((el) => ({
          href: el.getAttribute('href') ?? '',
          title: (el.querySelector('span')?.textContent ?? '').trim(),
        })),
      );
  return {
    status: (await status.textContent()) ?? '',
    prose: await read('prose'),
    structured: await read('structured'),
    siteEmptyCount: await page.locator('[data-search-empty]').count(),
  };
}

test.describe('VAL-SEARCH-021: every published route is searchable', () => {
  // Derived once: the phrase for each route plus its corpus-wide count.
  // Choosing the phrase from the export rather than pinning literals is
  // what keeps a route added later inside the graded set.
  let phrases: Map<string, { phrase: string; corpusCount: number }>;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300_000);
    const page = await browser.newPage();
    const routes = allRoutes();
    const corpus = new Map<string, string>();
    for (const route of routes) corpus.set(route, normalize(await mainText(page, route)));

    phrases = new Map();
    for (const route of routes) {
      const candidates = fourWordWindows(await indexableText(page, route));
      for (const phrase of candidates) {
        let count = 0;
        for (const [, text] of corpus) if (text.includes(phrase)) count += 1;
        if (count === 1) {
          phrases.set(route, { phrase, corpusCount: count });
          break;
        }
      }
    }
    await page.close();
  });

  test('every route in the set has a phrase of 4+ words unique to it', () => {
    const missing = allRoutes().filter((route) => !phrases.has(route));
    expect(
      missing,
      `routes with no corpus-unique 4-word phrase: ${missing.join(', ')}`,
    ).toEqual([]);
    expect(phrases.size).toBe(allRoutes().length);
    for (const [, { corpusCount }] of phrases) expect(corpusCount).toBe(1);
  });

  test('each non-article destination returns a prose result linking to itself', async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000);
    const zeroResult: string[] = [];
    const wrongRoute: string[] = [];
    for (const route of NON_ARTICLE_ROUTES) {
      const entry = phrases.get(route);
      expect(entry, `no unique phrase derived for ${route}`).toBeTruthy();
      const { prose } = await search(page, entry!.phrase);
      if (prose.length === 0) {
        zeroResult.push(`${route} (phrase "${entry!.phrase}")`);
        continue;
      }
      const own = prose.filter((hit) => samePath(hit.href, route));
      if (own.length === 0) {
        wrongRoute.push(
          `${route} (phrase "${entry!.phrase}" returned only ${prose.map((h) => h.href).join(', ')})`,
        );
        continue;
      }
      const response = await request.get(`${BASE}${own[0]!.href}`);
      expect(response.status(), `${own[0]!.href} did not resolve`).toBe(200);
    }
    expect(zeroResult, 'routes returning zero prose results').toEqual([]);
    expect(wrongRoute, 'routes matched only by other routes').toEqual([]);
  });

  test('a sample of article routes still returns its own prose (VAL-SEARCH-015 stays green)', async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000);
    // One article per domain, so widening the index cannot have displaced
    // the article coverage that already worked.
    const sample = DOMAINS.map((domain) => {
      const first = publishedModules().find((m) => m.domain === domain);
      return first ? `/${first.domain}/${first.slug}/` : null;
    }).filter((route): route is string => route !== null);
    expect(sample.length).toBe(DOMAINS.length);

    for (const route of sample) {
      const entry = phrases.get(route);
      expect(entry, `no unique phrase derived for ${route}`).toBeTruthy();
      const { prose } = await search(page, entry!.phrase);
      const own = prose.filter((hit) => samePath(hit.href, route));
      expect(
        own.length,
        `${route} did not return itself for "${entry!.phrase}" (got ${prose.map((h) => h.href).join(', ')})`,
      ).toBeGreaterThan(0);
      const response = await request.get(`${BASE}${own[0]!.href}`);
      expect(response.status()).toBe(200);
    }
  });

  test('widening the index does not leak draft modules (VAL-BUILD-001)', async ({
    page,
  }) => {
    const drafts = modules.filter((m) => m.status !== 'published');
    test.skip(drafts.length === 0, 'no draft modules in the registry');
    const indexed = await page.evaluate(async () => {
      const load = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{
        search: (
          q: string,
        ) => Promise<{ results: Array<{ data: () => Promise<{ url: string }> }> }>;
      }>;
      const pagefind = await load('/pagefind/pagefind.js');
      const response = await pagefind.search('');
      const data = await Promise.all(response.results.map((r) => r.data()));
      return data.map((d) => d.url);
    });
    for (const draft of drafts) {
      expect(
        indexed.some((url) => url.includes(`/${draft.domain}/${draft.slug}`)),
        `draft ${draft.domain}/${draft.slug} is present in the prose index`,
      ).toBe(false);
    }
  });
});

test.describe("VAL-SEARCH-022: the site's own navigation labels return results", () => {
  // Derived from the same registry the sidebar renders from, so a renamed
  // domain is graded under its new label rather than silently skipped.
  // Credits and Playground are deliberately excluded: on the pre-fix
  // export they returned results only by matching unrelated prose, so
  // using them as queries would let a broken index pass.
  const LABEL_CASES: Array<{ query: string; destination: string | null }> = [
    { query: 'Glossary', destination: '/glossary/' },
    { query: 'A-Z Index', destination: '/a-z/' },
    { query: 'Market Map', destination: '/market-map/' },
    // The sidebar renders this label once inside every domain group, so any
    // one of the seven landing routes is a correct destination.
    { query: 'Domain overview', destination: null },
    { query: DOMAIN_META.adjacent.name, destination: '/adjacent/' },
    { query: DOMAIN_META.classical.name, destination: '/classical/' },
    { query: DOMAIN_META.frontier.name, destination: '/frontier/' },
  ];

  test('the seven labels are the literal strings the navigation renders', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const nav = page.locator('aside nav[aria-label="Robot Wiki taxonomy"]');
    // Only the active route's group is expanded on load, and "Domain
    // overview" renders inside a group's panel, so a collapsed sidebar does
    // not show it. Expanding one group is what a reader does before they
    // could have read the label at all.
    await nav
      .getByRole('button', { name: DOMAIN_META.classical.name })
      .click();
    await expect(nav.getByText('Domain overview').first()).toBeVisible();
    // innerText reflects text-transform, and the "Domain overview" entry is
    // styled uppercase, so it arrives here as "DOMAIN OVERVIEW". The reader
    // types what they read either way, so the comparison is case-folded.
    const navText = (await nav.innerText()).toLowerCase();
    for (const { query } of LABEL_CASES) {
      expect(
        navText.includes(query.toLowerCase()),
        `"${query}" is not rendered in the sidebar, so it is not a navigation label`,
      ).toBe(true);
    }
  });

  for (const { query, destination } of LABEL_CASES) {
    test(`"${query}" returns a result linking to the destination it names`, async ({
      page,
      request,
    }) => {
      const settled = await search(page, query);
      const all = [...settled.prose, ...settled.structured];
      expect(
        all.length,
        `"${query}" returned nothing at all (status: ${settled.status})`,
      ).toBeGreaterThan(0);
      expect(
        settled.siteEmptyCount,
        `"${query}" rendered the empty state`,
      ).toBe(0);

      const matched = destination
        ? all.filter((hit) => samePath(hit.href, destination))
        : all.filter((hit) =>
            DOMAINS.some((domain) => samePath(hit.href, `/${domain}/`)),
          );
      expect(
        matched.length,
        `"${query}" returned ${all.map((h) => h.href).join(', ')}, none of which is the destination the label names`,
      ).toBeGreaterThan(0);

      const response = await request.get(`${BASE}${matched[0]!.href}`);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe('VAL-SEARCH-023: the empty state reports what is actually empty', () => {
  test('(a) zero prose and some entities raises no site-wide empty state', async ({
    page,
  }) => {
    // A company name reaches the structured index; the site-wide message
    // must not claim the wiki has nothing on it.
    const settled = await search(page, 'Saronic');
    expect(settled.structured.length).toBeGreaterThan(0);
    expect(settled.siteEmptyCount).toBe(0);
    expect(settled.status).not.toMatch(/no modules match/i);
    await expect(
      page.getByRole('region', { name: 'Structured' }),
    ).toBeVisible();
  });

  test('(b) both groups empty raises exactly one message naming both surfaces', async ({
    page,
  }) => {
    const settled = await search(page, 'zzqxzzqxzz');
    expect(settled.prose.length).toBe(0);
    expect(settled.structured.length).toBe(0);
    expect(settled.siteEmptyCount).toBe(1);

    const message = await page.locator('[data-search-empty]').innerText();
    expect(message, 'message does not name the prose surface').toMatch(
      /article|page|module/i,
    );
    expect(message, 'message does not name the entity surface').toMatch(
      /method|compan|dataset|entit/i,
    );
    expect(settled.status).toMatch(/article|page|module/i);
    expect(settled.status).toMatch(/method|compan|dataset|entit/i);
  });

  test('(b) the message offers a keyboard-reachable recovery affordance that resolves', async ({
    page,
    request,
  }) => {
    await search(page, 'zzqxzzqxzz');
    const recovery = page.locator('[data-search-empty] a');
    await expect(recovery).toHaveCount(1);
    const href = await recovery.getAttribute('href');
    expect(href).toBeTruthy();
    await expect(recovery).toHaveAccessibleName(/a-z/i);

    await recovery.focus();
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('href') ?? '',
      ),
    ).toBe(href);

    expect((await request.get(`${BASE}${href}`)).status()).toBe(200);
    await recovery.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/\//g, '\\/')}`));
  });

  test('(c) a narrowing type facet names the filter and clears on demand', async ({
    page,
  }) => {
    // A dataset-only query: filtering to companies empties the rendered
    // group while an unfiltered entity match is still there.
    const before = await search(page, 'DROID');
    const types = await page
      .locator('[data-results-group="structured"] [data-entity-type]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-entity-type')));
    expect(before.structured.length).toBeGreaterThan(0);
    expect(types).not.toContain('company');

    const structured = page.getByRole('region', { name: 'Structured' });
    await structured.getByRole('button', { name: /^Companies$/ }).click();
    const narrowed = await settle(page);
    expect(narrowed.structured.length).toBe(0);
    // The site-wide "nothing matches" claim must stay away while
    // unfiltered entity matches exist one click behind the facet.
    expect(narrowed.siteEmptyCount).toBe(0);
    expect(narrowed.status).not.toMatch(/no modules match/i);
    await expect(structured).toContainText(/filter/i);

    const clear = structured.getByRole('button', {
      name: /clear the type filter/i,
    });
    await clear.focus();
    expect(
      await page.evaluate(() => document.activeElement?.textContent ?? ''),
    ).toMatch(/clear the type filter/i);
    await clear.press('Enter');

    const restored = await settle(page);
    expect(restored.structured.length).toBe(before.structured.length);
    expect(restored.structured.map((h) => h.href)).toEqual(
      before.structured.map((h) => h.href),
    );
    await expect(clear).toHaveCount(0);
  });
});
