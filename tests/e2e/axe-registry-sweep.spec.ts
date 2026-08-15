import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

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
 * The 404 page is deliberately excluded: it has a documented React
 * hydration mismatch (#418) owned by polish-go-public, and it is not a
 * crawlable route.
 */

const OUT = join(process.cwd(), 'out');
/** Near-black page background token (contract VAL-CROSS-020). */
const DARK_BG = 'rgb(11, 13, 14)';

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
];

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the axe-registry-sweep spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
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
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
  });
  return { consoleErrors, failedRequests };
}

test.describe('registry-driven axe + console sweep', () => {
  for (const route of ROUTES) {
    test(`zero axe violations, zero console errors: ${route}`, async ({ page }) => {
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

      expect(
        observed.consoleErrors,
        `console errors on ${route}`,
      ).toEqual([]);
      expect(
        observed.failedRequests,
        `failed requests on ${route}`,
      ).toEqual([]);

      // Dark theme invariant (VAL-CROSS-020): the page background is the
      // dark token after full load; no unthemed default-white page.
      const bg = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      expect(bg, `${route} body background`).toBe(DARK_BG);
    });
  }

  test('search with an executed query stays clean (VAL-A11Y-013)', async ({ page }) => {
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

  test('the three typefaces resolve on home and a module page (VAL-A11Y-014)', async ({ page }) => {
    for (const route of ['/', '/manipulation/action-chunking/']) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle');
      const fonts = await page.evaluate(() => ({
        sans: getComputedStyle(document.body).fontFamily,
        serif: getComputedStyle(document.querySelector('article .prose, .prose') ?? document.body).fontFamily,
        mono: getComputedStyle(
          document.querySelector('pre, code, [data-testid="eureka-code"]') ?? document.body,
        ).fontFamily,
      }));
      expect(fonts.sans, `${route} UI text uses Geist Sans`).toMatch(/Geist/i);
      expect(fonts.serif, `${route} prose uses Source Serif`).toMatch(/Source Serif/i);
      expect(fonts.mono, `${route} code uses JetBrains Mono`).toMatch(/JetBrains/i);
    }
  });
});

test.describe('sitemap routes agree with the registry', () => {
  test('every sitemap loc is covered by this sweep', () => {
    const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
    const swept = new Set(ROUTES);
    for (const match of xml.matchAll(/<loc>[^<]*robot-wiki\.com([^<]*)<\/loc>/g)) {
      expect(swept, `sitemap loc ${match[1]} missing from the sweep route set`).toContain(match[1]);
    }
  });
});
