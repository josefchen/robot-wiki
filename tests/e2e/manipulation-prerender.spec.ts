import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import { collectConsole } from './helpers/console';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Manipulation routes are prerendered and console-clean (VAL-MAN-061).
 *
 * Both halves are judged against the SHIPPED artifact, the out/ export, not
 * the dev server: prerendering is a property of the HTML a static host
 * hands a client with JavaScript disabled, and the dev server always
 * hydrates. The first half therefore reads the exported bytes directly; the
 * second serves those same bytes and drives a browser over them.
 *
 * The route set is derived from the module registry rather than listed, so
 * a manipulation article published later is swept here without an edit, and
 * a route that leaves the registry stops being asserted. The count is
 * pinned separately: a registry that silently loses a manipulation entry
 * would otherwise shrink this suite to nothing and still pass.
 */

const OUT = join(process.cwd(), 'out');

/** Every published manipulation article, in registry order. */
const ROUTES = publishedModules()
  .filter((m) => m.domain === 'manipulation')
  .map((m) => ({ route: `/manipulation/${m.slug}/`, title: m.title }));

/**
 * The registry's manipulation count at the time this suite was written.
 * Publishing a thirteenth article is a one-line update here; losing one
 * silently is what this exists to catch.
 */
const EXPECTED_ROUTE_COUNT = 12;

/**
 * Text that only ever appears in the App Router's client-side error or
 * not-found fallback. Its presence in exported HTML means the route did not
 * prerender its own content.
 */
const FALLBACK_MARKERS = [
  '__next_error__',
  'This page could not be found',
] as const;

function exportedHtml(route: string): string {
  const file = join(OUT, route, 'index.html');
  if (!existsSync(file)) {
    throw new Error(`${route} is missing from the export: ${file}`);
  }
  return readFileSync(file, 'utf8');
}

/** The text of the first h1 in an HTML string, whitespace collapsed. */
function firstH1(html: string): string | null {
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!match) return null;
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Visible text length of the exported document, tags and scripts removed. */
function visibleTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

test.describe('manipulation routes prerender and stay console-clean', () => {
  let server: StaticExportServer;

  test.beforeAll(async () => {
    expect(
      existsSync(join(OUT, 'index.html')),
      'out/ is missing: run `npm run build` before this suite',
    ).toBe(true);
    server = await startStaticExportServer(OUT, 0, { notFoundFallback: true });
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('the registry still publishes every manipulation route this suite sweeps', () => {
    expect(ROUTES.length).toBe(EXPECTED_ROUTE_COUNT);
  });

  for (const { route, title } of ROUTES) {
    test(`${route} ships prerendered HTML carrying its own h1 and prose`, () => {
      const html = exportedHtml(route);
      for (const marker of FALLBACK_MARKERS) {
        expect(html, `${route} exported the client fallback`).not.toContain(
          marker,
        );
      }
      expect(firstH1(html), `${route} exported no h1`).toBe(title);
      // A hydration-only shell still carries the chrome, so the floor is
      // set above nav + footer text rather than above zero.
      expect(
        visibleTextLength(html),
        `${route} exported a shell with no article body`,
      ).toBeGreaterThan(2000);
      expect(html).toContain('data-pagefind-body');
    });

    test(`${route} serves 200 and reaches idle with a clean console`, async ({
      page,
    }) => {
      const log = collectConsole(page);
      const response = await page.goto(`http://localhost:${server.port}${route}`, {
        waitUntil: 'networkidle',
      });
      expect(response?.status(), `${route} did not serve 200`).toBe(200);
      await expect(page.locator('h1')).toHaveText(title);
      expect(log.errors, `${route} logged console or network errors`).toEqual(
        [],
      );
    });
  }
});
