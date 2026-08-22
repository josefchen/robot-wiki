import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { DOMAINS, publishedModules } from '../../data/modules';
import { SITE_URL } from '../../lib/site';
import { startStaticExportServer } from './static-export-server';

/**
 * Social-card metadata on every published route (VAL-DIST-001,
 * VAL-DIST-004), with regression guards for the assertions this area must
 * not weaken: VAL-BRAND-003 (canonical and og:url apex-correct per route)
 * and VAL-BUILD-006 (og:type article on module routes, website elsewhere).
 *
 * Population derivation: the article route set walks the module registry
 * (publishedModules, never a hardcoded list), the domain landings walk
 * DOMAINS, and the standalone routes are named once. 47 + 7 + 7 = 61.
 *
 * Crawler view: the exported .html read directly (the contract allows
 * this form), plus one no-JavaScript browser pass pinning that nothing
 * here is hydration-only. A social scraper never runs the page script.
 *
 * The metadata replacement trap is why these are per-route sweeps: a
 * route-level metadata object replaces the layout's for the same key, so
 * a twitter block declared once in app/layout.tsx is silently dropped on
 * every route that declares its own. Asserting the layout source instead
 * of each route's output has already shipped that defect once.
 */

const NON_ARTICLE_ROUTES = [
  '/',
  '/a-z/',
  '/market-map/',
  '/playground/',
  '/glossary/',
  '/credits/',
  '/search/',
  ...DOMAINS.map((d) => `/${d}/`),
] as const;

const ARTICLE_ROUTES = publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
const ALL_ROUTES = [...ARTICLE_ROUTES, ...NON_ARTICLE_ROUTES];

function routeToHtmlPath(route: string): string {
  const clean = route.replace(/^\//, '').replace(/\/$/, '');
  return clean === '' ? 'out/index.html' : `out/${clean}/index.html`;
}

function crawl(route: string): string {
  return readFileSync(routeToHtmlPath(route), 'utf8');
}

/** Collapses whitespace; the card comparison is on collapsed strings. */
function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Decodes the entities Next emits into attribute values and h1 text. */
function decodeEntities(s: string): string {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'");
}

function metaContents(html: string, attr: 'name' | 'property', key: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) {
    const tag = m[0];
    const kv = new RegExp(`${attr}="([^"]+)"`).exec(tag);
    if (kv?.[1] !== key) continue;
    const cv = /content="([^"]*)"/.exec(tag);
    out.push(cv ? decodeEntities(cv[1]) : '');
  }
  return out;
}

function firstH1(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  return m ? collapse(decodeEntities(m[1].replace(/<[^>]+>/g, ' '))) : null;
}

function documentTitle(html: string): string {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? collapse(decodeEntities(m[1])) : '';
}

/** document.title minus the '%s - robot-wiki' site-name template. */
function strippedTitle(html: string): string {
  return documentTitle(html).replace(/\s*[-\u2013\u2014|]\s*robot-wiki\s*$/, '');
}

test.describe('social card metadata (VAL-DIST-001, VAL-DIST-004)', () => {
  test('the published route set is derived, complete, and sized', () => {
    expect(ARTICLE_ROUTES.length).toBe(47);
    expect(DOMAINS.length).toBe(7);
    expect(ALL_ROUTES.length).toBe(ARTICLE_ROUTES.length + 7 + 7);
    expect(new Set(ALL_ROUTES).size).toBe(ALL_ROUTES.length);
  });

  test('every route declares exactly one summary_large_image twitter:card (VAL-DIST-001)', () => {
    expect(ALL_ROUTES.length).toBeGreaterThan(0);
    for (const route of ALL_ROUTES) {
      const values = metaContents(crawl(route), 'name', 'twitter:card');
      expect(
        values.length,
        `${route} declares exactly one twitter:card`,
      ).toBe(1);
      expect(values[0], `${route} card type`).toBe('summary_large_image');
    }
  });

  test('og:title equals the rendered h1 or the suffix-stripped document title (VAL-DIST-004)', () => {
    for (const route of ALL_ROUTES) {
      const html = crawl(route);
      const ogTitles = metaContents(html, 'property', 'og:title');
      expect(ogTitles.length, `${route} ships one og:title`).toBe(1);
      const ogTitle = collapse(ogTitles[0]);
      expect(ogTitle.length, `${route} og:title non-empty`).toBeGreaterThan(0);

      const h1 = firstH1(html);
      const stripped = strippedTitle(html);
      expect(
        ogTitle === h1 || ogTitle === stripped,
        `${route} og:title "${ogTitle}" must equal h1 "${h1}" or stripped title "${stripped}"`,
      ).toBe(true);
    }
  });

  test('og:description is 50 to 200 chars, shared by at most 2 routes, and dash-free (VAL-DIST-004)', () => {
    // Non-zero cardinality guard: a locator matching nothing satisfies
    // every downstream loop.
    expect(ALL_ROUTES.length).toBeGreaterThan(0);
    const sharedBy = new Map<string, number>();
    for (const route of ALL_ROUTES) {
      const html = crawl(route);
      const descs = metaContents(html, 'property', 'og:description');
      expect(descs.length, `${route} ships one og:description`).toBe(1);
      const desc = collapse(descs[0]);
      expect(desc.length, `${route} description length (got "${desc}")`).toBeGreaterThanOrEqual(50);
      expect(desc.length, `${route} description length`).toBeLessThanOrEqual(200);
      sharedBy.set(desc, (sharedBy.get(desc) ?? 0) + 1);
    }
    for (const [desc, count] of sharedBy) {
      expect(
        count,
        `description "${desc}" is shared by ${count} routes (max 2)`,
      ).toBeLessThanOrEqual(2);
    }
  });

  test('no card title or description contains an em-dash or en-dash (VAL-DIST-004)', () => {
    for (const route of ALL_ROUTES) {
      const html = crawl(route);
      const ogTitle = metaContents(html, 'property', 'og:title')[0] ?? '';
      const ogDesc = metaContents(html, 'property', 'og:description')[0] ?? '';
      expect(ogTitle, `${route} og:title`).not.toMatch(/[\u2013\u2014]/);
      expect(ogDesc, `${route} og:description`).not.toMatch(/[\u2013\u2014]/);
    }
  });

  test('declared twitter:title and twitter:description equal their og counterparts exactly (VAL-DIST-004)', () => {
    for (const route of ALL_ROUTES) {
      const html = crawl(route);
      const ogTitle = metaContents(html, 'property', 'og:title')[0] ?? '';
      const ogDesc = metaContents(html, 'property', 'og:description')[0] ?? '';
      const twTitles = metaContents(html, 'name', 'twitter:title');
      if (twTitles.length > 0) {
        expect(twTitles.length, `${route} declares twitter:title at most once`).toBe(1);
        expect(twTitles[0], `${route} twitter:title equals og:title`).toBe(ogTitle);
      }
      const twDescs = metaContents(html, 'name', 'twitter:description');
      if (twDescs.length > 0) {
        expect(twDescs.length, `${route} declares twitter:description at most once`).toBe(1);
        expect(twDescs[0], `${route} twitter:description equals og:description`).toBe(ogDesc);
      }
    }
  });

  test('canonical and og:url stay apex-origin and route-correct (VAL-BRAND-003 guard)', () => {
    for (const route of ALL_ROUTES) {
      const html = crawl(route);
      const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/.exec(html)?.[1];
      expect(canonical, `${route} ships a canonical`).toBeTruthy();
      const canonicalUrl = new URL(canonical!);
      expect(canonicalUrl.origin, `${route} canonical origin`).toBe(SITE_URL);
      expect(canonicalUrl.pathname, `${route} canonical is self-referential`).toBe(route);

      const ogUrls = metaContents(html, 'property', 'og:url');
      expect(ogUrls.length, `${route} ships one og:url`).toBe(1);
      expect(ogUrls[0], `${route} og:url matches canonical`).toBe(canonical);
    }
  });

  test('og:type stays article on module routes and website elsewhere (VAL-BUILD-006 guard)', () => {
    const articleSet = new Set(ARTICLE_ROUTES);
    for (const route of ALL_ROUTES) {
      const types = metaContents(crawl(route), 'property', 'og:type');
      expect(types.length, `${route} ships one og:type`).toBe(1);
      expect(types[0], `${route} og:type`).toBe(articleSet.has(route) ? 'article' : 'website');
    }
  });

  // The crawler view proper: a real browser with JavaScript disabled,
  // the shape a social scraper actually operates in. The file sweeps
  // above cover all 56 routes; this pins, on a representative sample,
  // that the tags are in the served document and not hydration-only.
  test.use({ javaScriptEnabled: false });
  test('card tags are present in the no-JavaScript DOM on sample routes', async ({ page }) => {
    const server = await startStaticExportServer('out');
    try {
      const samples = [
        '/',
        '/search/',
        '/manipulation/',
        '/manipulation/action-chunking/',
      ];
      for (const route of samples) {
        const res = await page.goto(`http://localhost:${server.port}${route}`);
        expect(res?.status(), `${route} serves 200 without JS`).toBe(200);
        await expect(
          page.locator('meta[name="twitter:card"]'),
        ).toHaveAttribute('content', 'summary_large_image');
        await expect(
          page.locator('meta[property="og:title"]'),
        ).toHaveAttribute('content', collapse(firstH1(crawl(route)) ?? ''));
        await expect(
          page.locator('meta[property="og:image"]'),
        ).toHaveAttribute('content', new RegExp(`^${SITE_URL}/og/`));
      }
    } finally {
      await server.stop();
    }
  });
});
