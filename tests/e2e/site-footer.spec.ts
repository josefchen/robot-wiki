import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import {
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  REPOSITORY_URL,
} from '../../lib/identity';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * Site footer and author identity (VAL-DIST-006, VAL-DIST-007,
 * VAL-DIST-009), checked against the SHIPPED artifact:
 *
 * - exactly one <footer> per published route, outside main/aside (and
 *   outside every other sectioning content element, so it resolves as a
 *   contentinfo landmark), with non-zero height at 1440px and 375px, at
 *   least 20 visible characters, and no em or en dash;
 * - a repository link with the same href on every route, carrying a
 *   non-empty accessible name that reads as a source destination;
 * - meta[name=author] on every route, byte-identical after whitespace
 *   collapse with the footer occurrence and the /credits occurrence;
 * - the author name sits inside an anchor to an external profile;
 * - zero axe violations at 1440px and no horizontal overflow at 375px on
 *   /, one article route, and /credits.
 *
 * Population derivation: the published route set is read from the export's
 * own sitemap.xml (the crawlable set), never a hardcoded list, and a
 * sanity floor asserts the sweep sees the full set. The article
 * representative is the registry's first published module. Href
 * resolvability (200 after redirects) is verified out of band with curl
 * and recorded in the feature handoff; tests stay offline.
 */

const OUT = join(process.cwd(), 'out');
/** The contract's source-destination test for the repository link name. */
const SOURCE_NAME_RE = /source|repo|repositor|github|code/i;
/** Em dash and en dash, banned in footer text. */
const DASHES = /[\u2013\u2014]/;
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 375, height: 667 },
] as const;

function htmlPath(route: string): string {
  const clean = route.replace(/^\//, '').replace(/\/$/, '');
  return join(OUT, clean === '' ? 'index.html' : join(clean, 'index.html'));
}

/** The published route set, derived from the export's own sitemap. */
function publishedRouteSet(): string[] {
  const xml = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
}

/** One published article route, derived from the module registry. */
const firstArticle = publishedModules()[0];
const ARTICLE_ROUTE = `/${firstArticle.domain}/${firstArticle.slug}/`;
const TRIO_ROUTES = ['/', ARTICLE_ROUTE, '/credits/'];

let server: StaticExportServer | null = null;
let BASE = '';

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the site-footer spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

interface LinkMetrics {
  href: string;
  name: string;
}

interface FooterMetrics {
  count: number;
  landmarkAncestor: string | null;
  height: number;
  text: string;
  repo: LinkMetrics | null;
  profile: LinkMetrics | null;
}

/** Everything the assertions need about the rendered footer, in one pass. */
async function footerMetrics(page: Page): Promise<FooterMetrics> {
  return page.evaluate(
    ([repoUrl, profileUrl]) => {
      const footers = Array.from(document.querySelectorAll('footer'));
      const footer = footers[0];
      if (!footer) {
        return {
          count: footers.length,
          landmarkAncestor: null,
          height: 0,
          text: '',
          repo: null,
          profile: null,
        };
      }
      const accessibleName = (a: HTMLAnchorElement) =>
        (a.getAttribute('aria-label') ?? a.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim();
      const links = Array.from(footer.querySelectorAll('a'));
      const repo = links.find((a) => a.getAttribute('href') === repoUrl);
      const profile = links.find((a) => a.getAttribute('href') === profileUrl);
      return {
        count: footers.length,
        landmarkAncestor:
          footer.closest('main, aside, article, nav, section')?.tagName.toLowerCase() ??
          null,
        height: footer.getBoundingClientRect().height,
        text: (footer as HTMLElement).innerText,
        repo: repo
          ? { href: repo.getAttribute('href') ?? '', name: accessibleName(repo) }
          : null,
        profile: profile
          ? {
              href: profile.getAttribute('href') ?? '',
              name: accessibleName(profile),
            }
          : null,
      };
    },
    [REPOSITORY_URL, AUTHOR_PROFILE_URL] as const,
  );
}

test.describe('crawler view (the exported HTML)', () => {
  test('every published route: one footer, exact author meta, repo and profile links inside it', () => {
    const routes = publishedRouteSet();
    // Sanity floor: the sitemap-derived set is the full published route
    // set (43 articles + 14 non-article destinations), not a stub.
    expect(routes.length).toBeGreaterThan(50);
    for (const route of routes) {
      const html = readFileSync(htmlPath(route), 'utf8');
      expect(
        html.match(/<footer[\s>]/g) ?? [],
        `${route}: exactly one <footer> element`,
      ).toHaveLength(1);

      const authorMetas = (html.match(/<meta\s[^>]*>/g) ?? []).filter((tag) =>
        /name="author"/.test(tag),
      );
      expect(
        authorMetas,
        `${route}: exactly one meta[name=author]`,
      ).toHaveLength(1);
      const content = /content="([^"]*)"/.exec(authorMetas[0])?.[1] ?? '';
      expect(content, `${route}: author meta is the owner's name verbatim`).toBe(
        AUTHOR_NAME,
      );

      const footerStart = html.search(/<footer[\s>]/);
      const footerHtml = html.slice(footerStart, html.indexOf('</footer>'));
      expect(
        footerHtml,
        `${route}: footer links the source repository`,
      ).toContain(`href="${REPOSITORY_URL}"`);
      expect(
        footerHtml,
        `${route}: footer links the external profile`,
      ).toContain(`href="${AUTHOR_PROFILE_URL}"`);
      expect(footerHtml, `${route}: footer names the author`).toContain(
        AUTHOR_NAME,
      );
    }
  });
});

test.describe('rendered footer at both viewports', () => {
  for (const route of publishedRouteSet()) {
    test(`one footer outside the landmarks, non-zero height, clean text: ${route}`, async ({
      page,
    }) => {
      await page.setViewportSize(VIEWPORTS[0]);
      await page.goto(BASE + route);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        const m = await footerMetrics(page);
        const at = `${route} @${viewport.width}`;
        expect(m.count, `${at}: exactly one footer element`).toBe(1);
        expect(
          m.landmarkAncestor,
          `${at}: footer is site chrome, not nested inside a sectioning content element (resolves as contentinfo)`,
        ).toBeNull();
        expect(m.height, `${at}: non-zero footer height`).toBeGreaterThan(0);
        const collapsed = m.text.replace(/\s+/g, ' ').trim();
        expect(
          collapsed.length,
          `${at}: at least 20 visible characters`,
        ).toBeGreaterThanOrEqual(20);
        expect(m.text, `${at}: no em or en dash in footer text`).not.toMatch(
          DASHES,
        );
        expect(m.repo, `${at}: repository link present with the same href`).not.toBeNull();
        expect(m.repo?.name.length, `${at}: repository link name is non-empty`).toBeGreaterThan(0);
        expect(m.repo?.name, `${at}: repository link name reads as a source destination`).toMatch(
          SOURCE_NAME_RE,
        );
        expect(
          m.profile?.name,
          `${at}: the profile anchor carries the exact author name`,
        ).toBe(AUTHOR_NAME);
      }
    });
  }
});

test.describe('author identity byte-identity (VAL-DIST-009)', () => {
  test('meta, footer, and /credits occurrences are byte-identical after whitespace collapse', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS[0]);
    await page.goto(BASE + '/credits/');

    // Occurrence 1: the crawler-view meta on /credits/.
    const html = readFileSync(htmlPath('/credits/'), 'utf8');
    const authorMeta = (html.match(/<meta\s[^>]*>/g) ?? []).find((tag) =>
      /name="author"/.test(tag),
    );
    const metaValue =
      (/content="([^"]*)"/.exec(authorMeta ?? '')?.[1] ?? '').replace(
        /\s+/g,
        ' ',
      ).trim() ?? '';

    // Occurrence 2: the visible footer text on /credits/.
    const footerName = (await footerMetrics(page)).profile?.name ?? '';

    // Occurrence 3: the visible /credits occurrence inside main (distinct
    // from the footer, which renders on every route).
    const creditsName = await page.evaluate((profileUrl) => {
      const main = document.querySelector('main');
      const anchor =
        main &&
        Array.from(main.querySelectorAll('a')).find(
          (a) => a.getAttribute('href') === profileUrl,
        );
      return (anchor?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    }, AUTHOR_PROFILE_URL);

    expect(metaValue, 'meta[name=author] names the author').toBe(AUTHOR_NAME);
    expect(footerName, 'the footer names the author').toBe(AUTHOR_NAME);
    expect(creditsName, '/credits names the author in visible text').toBe(
      AUTHOR_NAME,
    );
  });

  test('the profile anchor points off-origin at an external profile', async ({
    page,
  }) => {
    await page.goto(BASE + '/');
    const m = await footerMetrics(page);
    expect(m.profile, 'footer carries the profile anchor').not.toBeNull();
    const origin = new URL(m.profile?.href ?? '').origin;
    expect(origin).not.toBe('https://robot-wiki.com');
    expect(origin).not.toBe('http://localhost');
    // Resolvability (200 after redirects) is verified out of band; see the
    // spec header.
  });
});

test.describe('the footer introduces no accessibility or layout regression', () => {
  for (const route of TRIO_ROUTES) {
    test(`zero axe violations at 1440px: ${route}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[0]);
      await page.goto(BASE + route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations,
        `${route}: zero axe violations with the footer present`,
      ).toEqual([]);
    });

    test(`scrollWidth equals innerWidth at 375px: ${route}`, async ({
      page,
    }) => {
      await page.setViewportSize(VIEWPORTS[1]);
      await page.goto(BASE + route);
      const widths = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        widths.scrollWidth,
        `${route}: no horizontal overflow at 375px with the footer present`,
      ).toBe(widths.innerWidth);
    });
  }
});
