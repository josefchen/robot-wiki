import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Not-found page brand metadata (VAL-BRAND-002, VAL-BRAND-003).
 * Verified against the shipped artifact: the static export served on :3201
 * (the validation surface per AGENTS.md), not the dev server.
 *
 * The export must satisfy three rules:
 *  1. The 404 page carries the full brand metadata set the rest of the
 *     site carries, including og:site_name = robot-wiki.
 *  2. No reachable route declares a canonical/og:url pointing at a
 *     different route. Next.js's internal /_not-found/ duplicate of the
 *     404 page is pruned from the export (scripts/prune-not-found-artifact.ts
 *     in postbuild) rather than papered over with a canonical.
 *  3. No two reachable routes share a <title>.
 */

const PORT = 3201;
const BASE = `http://localhost:${PORT}`;
const OUT = join(process.cwd(), 'out');
const SITE_ORIGIN = 'https://robot-wiki.com';

let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the not-found-metadata spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT, PORT);
});

test.afterAll(async () => {
  await server?.stop();
});

/** Route paths from the sitemap (the crawlable route set). */
function sitemapRoutes(): string[] {
  const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const url = new URL(m[1]);
    expect(url.origin, `sitemap loc on apex origin: ${m[1]}`).toBe(SITE_ORIGIN);
    return url.pathname;
  });
}

function htmlForRoute(route: string): string {
  // The export uses trailingSlash; each route is a directory of index.html.
  return readFileSync(join(OUT, route, 'index.html'), 'utf8');
}

function extract(html: string, pattern: RegExp): string | null {
  return html.match(pattern)?.[1] ?? null;
}

test.describe('not-found page metadata', () => {
  test('/_not-found/ is not reachable in the export', async ({ request }) => {
    // Next.js emits /_not-found/ as an internal build artifact; it is not a
    // route and must not serve a second copy of the 404 page.
    const response = await request.get(`${BASE}/_not-found/`);
    expect(response.status()).toBe(404);
  });

  test('rendered /404/ carries the full brand metadata set', async ({ page }) => {
    const response = await page.goto(`${BASE}/404/`);
    expect(response?.ok()).toBe(true);

    // NOTE: the 404 page has a known React hydration mismatch (minified
    // #418) owned by polish-go-public; console cleanliness is deliberately
    // not asserted here.
    await expect(page).toHaveTitle('Page not found - robot-wiki');
    await expect(
      page.locator('meta[property="og:site_name"]'),
    ).toHaveAttribute('content', 'robot-wiki');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'website',
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `${SITE_ORIGIN}/404/`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_ORIGIN}/404/`,
    );
    // Indexing guard (VAL-BRAND-006): the 404 route stays noindex too.
    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute('content');
    expect(robots).toContain('noindex');

    // The themed page itself still renders (heading + home link).
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });

  test('every exported route carries og:site_name, a self-canonical, and a unique title', async () => {
    // Build-time sweep over the crawlable route set plus the 404 page.
    const routes = [...sitemapRoutes(), '/404/'];
    const titles = new Map<string, string>();

    for (const route of routes) {
      const html =
        route === '/404/'
          ? readFileSync(join(OUT, '404.html'), 'utf8')
          : htmlForRoute(route);

      const siteName = extract(html, /<meta property="og:site_name" content="([^"]*)"/);
      expect(siteName, `${route} ships og:site_name`).toBe('robot-wiki');

      const canonical = extract(html, /<link rel="canonical" href="([^"]*)"/);
      expect(canonical, `${route} ships a canonical link`).toBeTruthy();
      const canonicalUrl = new URL(canonical!);
      expect(canonicalUrl.origin, `${route} canonical origin`).toBe(SITE_ORIGIN);
      expect(
        canonicalUrl.pathname,
        `${route} canonical points at its own route, not ${canonicalUrl.pathname}`,
      ).toBe(route);

      const ogUrl = extract(html, /<meta property="og:url" content="([^"]*)"/);
      expect(ogUrl, `${route} ships og:url`).toBe(canonical);

      const title = extract(html, /<title>([^<]*)<\/title>/);
      expect(title, `${route} ships a non-empty title`).toBeTruthy();
      const prior = titles.get(title!);
      expect(
        prior,
        `title "${title}" is shared by ${prior} and ${route}`,
      ).toBeUndefined();
      titles.set(title!, route);
    }
  });
});
