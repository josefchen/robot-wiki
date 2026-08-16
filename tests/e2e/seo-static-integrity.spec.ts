import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, modules, publishedModules } from '../../data/modules';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Global SEO + static-export integrity (VAL-BUILD-003/005/006,
 * VAL-ADJ-015/016/017, VAL-CROSS-023/024, VAL-A11Y-015).
 *
 * Everything here is checked against the SHIPPED artifact: the out/ export
 * on disk plus the same files served by the dependency-free static server
 * (static-export-server.ts, OS-assigned port). The dev server cannot show
 * metadata resolution, sitemap membership, or serving behavior.
 *
 * Route set: enumerated from the module registry (publishedModules), the
 * DOMAINS list, and the fixed top-level routes, so a newly published module
 * is picked up automatically.
 */

const OUT = join(process.cwd(), 'out');
const SITE_ORIGIN = 'https://robot-wiki.com';

const TOP_LEVEL_ROUTES = [
  '/market-map/',
  '/playground/',
  '/search/',
  '/glossary/',
  '/credits/',
  '/a-z/',
] as const;

function moduleRoute(m: { domain: string; slug: string }): string {
  return `/${m.domain}/${m.slug}/`;
}

/** Every route the export is expected to carry (mirrors app/sitemap.ts). */
function expectedRoutes(): string[] {
  return [
    '/',
    ...DOMAINS.map((d) => `/${d}/`),
    ...TOP_LEVEL_ROUTES,
    ...publishedModules().map(moduleRoute),
  ];
}

function htmlForRoute(route: string): string {
  return readFileSync(join(OUT, route, 'index.html'), 'utf8');
}

function extract(html: string, pattern: RegExp): string | null {
  return html.match(pattern)?.[1] ?? null;
}

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the seo-static-integrity spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test.describe('sitemap.xml (VAL-BUILD-003, VAL-ADJ-015)', () => {
  const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  test('is well-formed urlset XML', () => {
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    // Every <url> block carries a loc; open/close tags balance.
    expect(locs.length).toBeGreaterThan(0);
    expect(xml.match(/<url>/g)?.length).toBe(locs.length);
    expect(xml.match(/<\/urlset>/g)?.length).toBe(1);
    for (const loc of locs) {
      expect(
        () => new URL(loc),
        `loc is an absolute URL: ${loc}`,
      ).not.toThrow();
    }
  });

  test('contains exactly the published route set: every published module, every fixed route, nothing else (VAL-BUILD-003)', () => {
    const expected = new Set(expectedRoutes().map((r) => `${SITE_ORIGIN}${r}`));
    const actual = new Set(locs);
    for (const url of expected) {
      expect(actual, `sitemap missing ${url}`).toContain(url);
    }
    for (const url of actual) {
      expect(expected, `sitemap carries unexpected entry ${url}`).toContain(
        url,
      );
    }
    // Count matches the registry-derived total exactly.
    expect(locs.length).toBe(expectedRoutes().length);
  });

  test('no draft module appears (VAL-BUILD-001 overlap)', () => {
    for (const m of modules.filter((m) => m.status === 'draft')) {
      expect(
        locs,
        `draft ${m.domain}/${m.slug} leaked into the sitemap`,
      ).not.toContain(`${SITE_ORIGIN}/${m.domain}/${m.slug}/`);
    }
  });

  test('every loc is on the apex origin (SITE_URL)', () => {
    for (const loc of locs) {
      const url = new URL(loc);
      expect(url.origin, `loc origin on ${loc}`).toBe(SITE_ORIGIN);
    }
  });

  test('serves 200 as sitemap.xml (VAL-ADJ-017)', async ({ request }) => {
    const response = await request.get(`${BASE}/sitemap.xml`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    expect(await response.text()).toBe(xml);
  });
});

test.describe('robots.txt (VAL-ADJ-016, VAL-ADJ-017)', () => {
  const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8');

  test('is non-empty and syntactically valid', () => {
    expect(robots.trim().length).toBeGreaterThan(0);
    expect(robots).toMatch(/^User-agent:\s*\S+/im);
    // Explicit rule lines (allow or disallow) plus a sitemap pointer.
    expect(robots).toMatch(/^(Allow|Disallow):/im);
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });

  test('serves 200 as robots.txt with text content type (VAL-ADJ-017)', async ({
    request,
  }) => {
    const response = await request.get(`${BASE}/robots.txt`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    expect(await response.text()).toBe(robots);
  });
});

test.describe('per-route metadata (VAL-BUILD-005, VAL-BUILD-006, VAL-A11Y-015)', () => {
  const routes = expectedRoutes();
  const moduleTitles = new Map(
    publishedModules().map((m) => [moduleRoute(m), m.title]),
  );

  test('unique non-empty titles across every exported route', () => {
    const seen = new Map<string, string>();
    for (const route of [...routes, '/404/']) {
      const html =
        route === '/404/'
          ? readFileSync(join(OUT, '404.html'), 'utf8')
          : htmlForRoute(route);
      const title = extract(html, /<title>([^<]*)<\/title>/);
      expect(title, `${route} ships a non-empty title`).toBeTruthy();
      const prior = seen.get(title!);
      expect(
        prior,
        `title "${title}" shared by ${prior} and ${route}`,
      ).toBeUndefined();
      seen.set(title!, route);
    }
  });

  test('unique non-empty meta descriptions across every exported route', () => {
    const seen = new Map<string, string>();
    for (const route of routes) {
      const desc = extract(
        htmlForRoute(route),
        /<meta name="description" content="([^"]*)"/,
      );
      expect(desc, `${route} ships a meta description`).toBeTruthy();
      expect(
        desc!.trim().length,
        `${route} description is non-empty`,
      ).toBeGreaterThan(10);
      const prior = seen.get(desc!);
      expect(
        prior,
        `description shared by ${prior} and ${route}`,
      ).toBeUndefined();
      seen.set(desc!, route);
    }
  });

  test('OG tags and canonical per route: article on modules, website elsewhere', () => {
    for (const route of routes) {
      const html = htmlForRoute(route);
      const isModule = moduleTitles.has(route);

      const ogTitle = extract(
        html,
        /<meta property="og:title" content="([^"]*)"/,
      );
      expect(ogTitle, `${route} ships og:title`).toBeTruthy();
      const ogDesc = extract(
        html,
        /<meta property="og:description" content="([^"]*)"/,
      );
      expect(ogDesc, `${route} ships og:description`).toBeTruthy();
      expect(
        ogDesc!.trim().length,
        `${route} og:description is non-empty`,
      ).toBeGreaterThan(10);

      const ogType = extract(
        html,
        /<meta property="og:type" content="([^"]*)"/,
      );
      expect(ogType, `${route} ships og:type`).toBe(
        isModule ? 'article' : 'website',
      );
      if (isModule) {
        // og:title carries the module title (plus the site-name template).
        expect(
          ogTitle!.startsWith(moduleTitles.get(route)!),
          `${route} og:title "${ogTitle}" names the module title`,
        ).toBe(true);
      }

      const canonical = extract(html, /<link rel="canonical" href="([^"]*)"/);
      expect(canonical, `${route} ships a canonical link`).toBeTruthy();
      const canonicalUrl = new URL(canonical!);
      expect(canonicalUrl.origin, `${route} canonical origin`).toBe(
        SITE_ORIGIN,
      );
      expect(
        canonicalUrl.pathname,
        `${route} canonical is self-referential`,
      ).toBe(route);
      const ogUrl = extract(html, /<meta property="og:url" content="([^"]*)"/);
      expect(ogUrl, `${route} ships og:url`).toBe(canonical);
    }
  });
});

test.describe('static-export integrity (VAL-CROSS-023, VAL-CROSS-024)', () => {
  test('every route is prerendered as HTML in out/ (no dynamic output)', () => {
    for (const route of expectedRoutes()) {
      expect(
        existsSync(join(OUT, route, 'index.html')),
        `${route} is not prerendered in out/`,
      ).toBe(true);
    }
    // No function/serverless output alongside the export.
    expect(
      existsSync(join(process.cwd(), '.vercel', 'output', 'functions')),
    ).toBe(false);
    expect(existsSync(join(OUT, 'middleware.js'))).toBe(false);
  });

  test('sampled routes serve 200 with their heading from a plain static server (VAL-CROSS-024)', async ({
    page,
  }) => {
    const sampled: Array<[string, RegExp]> = [
      ['/', /robot-wiki|Modern Robotics/i],
      ...DOMAINS.slice(0, 6).map((d) => {
        const mod = publishedModules().find((m) => m.domain === d)!;
        return [
          moduleRoute(mod),
          new RegExp(mod.title.split('(')[0].trim().slice(0, 24), 'i'),
        ] as [string, RegExp];
      }),
      ['/playground/', /kinematics|playground/i],
      ['/market-map/', /market map/i],
      ['/search/', /search/i],
    ];
    for (const [route, heading] of sampled) {
      const response = await page.goto(`${BASE}${route}`);
      expect(response?.status(), `${route} serves 200`).toBe(200);
      await expect(
        page.locator('h1').first(),
        `${route} renders its heading`,
      ).toContainText(heading);
    }
  });

  test('client-side navigation works from the statically served site (VAL-CROSS-024)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    const target = publishedModules().find((m) => m.domain === 'manipulation')!;
    // The sidebar carries every published module by title (the home body
    // links domains, not articles). Expand any collapsed domain sections
    // first (the accordion starts closed).
    const buttons = page.locator('aside').getByRole('button');
    for (let i = 0; i < (await buttons.count()); i += 1) {
      const b = buttons.nth(i);
      if ((await b.getAttribute('aria-expanded')) === 'false') await b.click();
    }
    await page
      .locator('aside')
      .getByRole('link', { name: target.title, exact: false })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${target.domain}/${target.slug}/$`),
    );
    await expect(page.locator('h1').first()).toContainText(
      target.title.split('(')[0].trim().slice(0, 24),
    );
  });

  test('exported route files exist on disk for every crawlable route', () => {
    // Belt-and-braces for the sitemap: every loc in the BUILT sitemap has a
    // prerendered file (catches any drift between generator and artifact).
    const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
    for (const match of xml.matchAll(
      /<loc>[^<]*robot-wiki\.com([^<]*)<\/loc>/g,
    )) {
      const route = match[1];
      expect(
        existsSync(join(OUT, route, 'index.html')),
        `sitemap loc ${route} has no prerendered file`,
      ).toBe(true);
    }
  });
});

test.describe('out/ directory hygiene', () => {
  test('no draft route directory exists in the export', () => {
    for (const m of modules.filter((m) => m.status === 'draft')) {
      expect(
        existsSync(join(OUT, m.domain, m.slug, 'index.html')),
        `draft ${m.domain}/${m.slug} was exported`,
      ).toBe(false);
    }
  });

  test('no digit-suffixed shadow directories in the export', () => {
    const shadows = readdirSync(OUT).filter((entry) => / \d+$/.test(entry));
    expect(
      shadows,
      `sync-tool shadow copies in out/: ${shadows.join(', ')}`,
    ).toEqual([]);
  });
});
