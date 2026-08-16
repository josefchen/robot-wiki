import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Go-public indexing state (VAL-BRAND-007).
 *
 * The owner's go-public decision (2026-08-16) set ALLOW_INDEXING in
 * lib/site.ts to true, so the shipped artifact must permit crawling and
 * carry no residual noindex directive on any crawlable route. The one
 * deliberate exception is the 404 page, which pins its own route-level
 * robots noindex (app/not-found.tsx) so it stays non-indexable independent
 * of the global switch; that independence is what the VAL-BRAND-006 pin in
 * not-found-metadata.spec.ts still guards from the browser side.
 *
 * Checked against the SHIPPED artifact (out/ on disk): robots.txt state and
 * per-route robots meta are export-time facts the dev server cannot show.
 */

const OUT = join(process.cwd(), 'out');
const SITE_ORIGIN = 'https://robot-wiki.com';

test.beforeAll(() => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the indexing-allow spec',
  ).toBe(true);
});

/** Route paths from the sitemap (the crawlable route set). */
function crawlableRoutes(): string[] {
  const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const url = new URL(m[1]);
    expect(url.origin, `sitemap loc on apex origin: ${m[1]}`).toBe(SITE_ORIGIN);
    return url.pathname;
  });
}

test.describe('robots.txt permits crawling (VAL-BRAND-007)', () => {
  const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8');

  test('allow rule for every user agent, no blanket disallow', () => {
    expect(robots).toMatch(/^User-Agent:\s*\*/im);
    expect(robots).toMatch(/^Allow:\s*\/\s*$/im);
    expect(robots, 'no site-wide Disallow survives go-public').not.toMatch(
      /^Disallow:/im,
    );
  });

  test('still points at the apex sitemap', () => {
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

test.describe('per-route robots meta (VAL-BRAND-007)', () => {
  test('zero noindex directives on every crawlable route', () => {
    const routes = crawlableRoutes();
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const html = readFileSync(join(OUT, route, 'index.html'), 'utf8');
      const robotsMeta = (html.match(/<meta name="robots"[^>]*>/g) ?? []).join(
        ' ',
      );
      expect(
        robotsMeta,
        `${route} ships no robots meta carrying a noindex directive`,
      ).not.toContain('noindex');
    }
  });

  test('/404/ stays noindex independent of the switch', () => {
    const html = readFileSync(join(OUT, '404.html'), 'utf8');
    expect(html).toMatch(/<meta name="robots"[^>]*noindex/);
  });
});
