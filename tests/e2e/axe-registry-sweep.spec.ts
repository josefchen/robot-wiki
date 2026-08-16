import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Registry-driven global sweep (VAL-A11Y-017, VAL-CROSS-018): axe-core with
 * zero violations on EVERY published module route plus every other
 * generated route, enumerated from the module registry rather than a
 * hard-coded sample, so a newly published module joins the sweep
 * automatically.
 *
 * The same pass covers the site-wide console/network cleanliness
 * (VAL-A11Y-013, VAL-CROSS-017), the dark-theme invariant (VAL-CROSS-020),
 * and font loading (VAL-A11Y-014). Run against the shipped artifact: the
 * static export served on an OS-assigned port.
 *
 * The 404 page is included since the React hydration mismatch (#418) was
 * fixed (2026-08-15, polish-go-public): the exported document now carries
 * a pre-hydration guard that redirects unknown paths to /404/ before
 * React hydrates, so the route is console-clean like every other.
 */

const OUT = join(process.cwd(), 'out');
/** Near-black page background token (contract VAL-CROSS-020). */
const DARK_BG = 'rgb(11, 13, 14)';

/**
 * Routes served as-is by the export server (each has its index.html).
 * The 404 route joins via a dedicated test below: it must be requested
 * through the host-like 404 fallback to prove the guard redirect leaves
 * a clean, accessible page.
 */
const ROUTES: string[] = [
  '/',
  ...DOMAINS.map((d) => `/${d}/`),
  '/market-map/',
  '/playground/',
  '/search/',
  '/glossary/',
  '/credits/',
  '/a-z/',
  ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
  '/404/',
];

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the axe-registry-sweep spec',
  ).toBe(true);
  // Host-like fallback so the 404 route renders the themed document the
  // way production does (see the 404 test inside the sweep).
  server = await startStaticExportServer(OUT, 0, { notFoundFallback: true });
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

interface RouteObservations {
  consoleErrors: string[];
  failedRequests: string[];
}

/** Collect console errors and failed (>=400) requests for one page load. */
function observe(page: Page): RouteObservations {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('response', (res) => {
    if (res.status() >= 400)
      failedRequests.push(`${res.status()} ${res.url()}`);
  });
  return { consoleErrors, failedRequests };
}

test.describe('registry-driven axe + console sweep', () => {
  for (const route of ROUTES) {
    test(`zero axe violations, zero console errors: ${route}`, async ({
      page,
    }) => {
      // axe's color-contrast pass on the largest table pages (datasets,
      // hardware guide) can take tens of seconds under SwiftShader; the
      // 30s default is not enough for them.
      test.setTimeout(90_000);
      const observed = observe(page);
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: 'load',
      });
      expect(response?.status(), `${route} serves 200`).toBe(200);
      // Settled idle: hydration and font swaps complete before judging.
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations,
        `axe violations on ${route}: ${JSON.stringify(
          results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        )}`,
      ).toEqual([]);

      expect(observed.consoleErrors, `console errors on ${route}`).toEqual([]);
      expect(observed.failedRequests, `failed requests on ${route}`).toEqual(
        [],
      );

      // Dark theme invariant (VAL-CROSS-020): the page background is the
      // dark token after full load; no unthemed default-white page.
      const bg = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      expect(bg, `${route} body background`).toBe(DARK_BG);
    });
  }

  test('search with an executed query stays clean (VAL-A11Y-013)', async ({
    page,
  }) => {
    const observed = observe(page);
    await page.goto(`${BASE}/search/`);
    const box = page.getByRole('searchbox', { name: /search/i }).first();
    await box.fill('policy');
    await box.press('Enter');
    // Wait for a results region to settle (Pagefind on the static index).
    await page.waitForTimeout(1500);
    expect(observed.consoleErrors).toEqual([]);
    expect(observed.failedRequests).toEqual([]);
  });

  test('the three typefaces resolve on home and a module page (VAL-A11Y-014)', async ({
    page,
  }) => {
    // Serif long-form prose only exists on article routes; the home page
    // carries the sans UI and mono readouts.
    for (const route of ['/', '/manipulation/action-chunking/']) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      const fonts = await page.evaluate(() => ({
        sans: getComputedStyle(document.body).fontFamily,
        serif: getComputedStyle(
          document.querySelector('.prose[data-pagefind-body] p, .prose p') ??
            document.body,
        ).fontFamily,
        mono: getComputedStyle(
          document.querySelector('pre, code, .font-mono') ?? document.body,
        ).fontFamily,
      }));
      expect(fonts.sans, `${route} UI text uses Geist Sans`).toMatch(/Geist/i);
      expect(fonts.mono, `${route} code uses JetBrains Mono`).toMatch(
        /JetBrains/i,
      );
      if (route !== '/') {
        expect(fonts.serif, `${route} prose uses Source Serif`).toMatch(
          /Source Serif/i,
        );
      }
    }
  });

  test('the 404 page is axe-clean and console-clean through the host fallback', async ({
    page,
  }) => {
    // Request an unknown path (not /404/ directly) so the server behaves
    // like a real host: 404 status + themed document, guard redirect to
    // /404/, then hydration. This is the VAL-CROSS-025 surface.
    const observed = observe(page);
    const response = await page.goto(`${BASE}/manipulation/does-not-exist/`, {
      waitUntil: 'load',
    });
    // The initial miss is a 404 by definition; the redirect then serves 200.
    expect(response?.status()).toBe(404);
    await page.waitForURL(/\/404\/$/);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations,
      `axe violations on the 404 page: ${JSON.stringify(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      )}`,
    ).toEqual([]);
    // Only the expected 404s: the unknown path itself (plus its RSC probe).
    // No hydration errors, no failed assets.
    expect(
      observed.consoleErrors.filter((e) => !e.includes('404')),
      'no non-404 console errors on the 404 flow',
    ).toEqual([]);
    expect(
      observed.failedRequests.filter(
        (f) => !f.includes('/manipulation/does-not-exist'),
      ),
      'no failed asset requests on the 404 flow',
    ).toEqual([]);
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bg, '404 body background').toBe(DARK_BG);
  });
});

test.describe('responsive viewports (VAL-CROSS-019)', () => {
  // Drawer open/navigate/close at 375 is covered by navigation.spec and
  // design-chrome.spec; per-module 375px no-overflow checks live in each
  // module spec. This block adds the cross-area sample: the same four
  // surfaces at all three widths, including the tablet width nothing else
  // covers.
  const SAMPLED: Array<[string, string]> = [
    ['/', 'home'],
    ['/manipulation/action-chunking/', 'prose module'],
    ['/market-map/', 'market map'],
    ['/playground/', 'playground'],
  ];

  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1280, 800],
  ] as const) {
    for (const [route, label] of SAMPLED) {
      test(`no horizontal overflow at ${width}px on the ${label}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `${label} overflows at ${width}px`,
        ).toBeLessThanOrEqual(0);
      });
    }
  }

  test('playground controls remain usable at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/playground/`, { waitUntil: 'load' });
    // The joint sliders render and respond at phone width (the canvas may
    // still be initializing under SwiftShader; the controls are the claim).
    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused();
    await context.close();
  });
});

test.describe('sitemap routes agree with the registry', () => {
  test('every sitemap loc is covered by this sweep', () => {
    const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
    const swept = new Set(ROUTES);
    for (const match of xml.matchAll(
      /<loc>[^<]*robot-wiki\.com([^<]*)<\/loc>/g,
    )) {
      expect(
        swept,
        `sitemap loc ${match[1]} missing from the sweep route set`,
      ).toContain(match[1]);
    }
  });
});
