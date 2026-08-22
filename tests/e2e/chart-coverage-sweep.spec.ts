import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Corpus closers for the chart-description milestone (VAL-EDU-035, 036,
 * 037, 040's 375px half). Population is derived from the module registry,
 * never typed as a literal article list.
 *
 * VAL-EDU-040's axe and console halves live in axe-registry-sweep.spec.ts,
 * whose route set is a superset of the 040 set. This file asserts that
 * inclusion and walks article routes at 375px itself.
 */

const OUT = join(process.cwd(), 'out');

function slash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

const ARTICLE_ROUTES = publishedModules().map((m) =>
  slash(`/${m.domain}/${m.slug}`),
);
const DOMAIN_ROUTES = DOMAINS.map((d) => slash(`/${d}`));
const COVERAGE_ROUTES = [
  '/',
  ...DOMAIN_ROUTES,
  '/market-map/',
  '/playground/',
  ...ARTICLE_ROUTES,
];
const CLEAN_ROUTES_040 = [
  ...ARTICLE_ROUTES,
  '/',
  '/glossary/',
  '/a-z/',
  ...DOMAIN_ROUTES,
  '/market-map/',
  '/playground/',
  '/search/',
  '/404/',
];

const STOPWORDS = new Set([
  'with',
  'from',
  'over',
  'against',
  'versus',
  'each',
  'this',
  'that',
  'than',
  'time',
]);

const BANNED_OPENERS = [
  /^(this|the) (chart|graph|figure|diagram|plot)\b/i,
  /^(line|bar|scatter|log-log) chart of\b/i,
  /^diagram showing\b/i,
  /\bshows? (the )?(data|values|relationship)\b/i,
];

function normalizeContract(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\d+/g, '#')
    .trim();
}

type SvgRow = {
  route: string;
  index: number;
  role: string | null;
  ariaHidden: string | null;
  ariaLabel: string;
  describedBy: string | null;
  targetLength: number;
  decorative: boolean;
};

let server: StaticExportServer | null = null;
let BASE: string;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-coverage-sweep spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

test.describe('derived populations', () => {
  test('VAL-EDU-035/040 populations come from the registry', () => {
    expect(ARTICLE_ROUTES.length, 'published article count').toBe(46);
    expect(DOMAIN_ROUTES.length, 'seven domain landings').toBe(7);
    expect(new Set(COVERAGE_ROUTES).size).toBe(COVERAGE_ROUTES.length);
    expect(new Set(CLEAN_ROUTES_040).size).toBe(CLEAN_ROUTES_040.length);
    expect(COVERAGE_ROUTES).toContain('/');
    expect(COVERAGE_ROUTES).toContain('/market-map/');
    expect(COVERAGE_ROUTES).toContain('/playground/');
    expect(CLEAN_ROUTES_040).toContain('/glossary/');
    expect(CLEAN_ROUTES_040).toContain('/a-z/');
    expect(CLEAN_ROUTES_040).toContain('/search/');
    expect(CLEAN_ROUTES_040).toContain('/404/');
  });
});

async function classifySvgs(page: Page, route: string): Promise<SvgRow[]> {
  return page.evaluate((currentRoute) => {
    const rows: SvgRow[] = [];
    const svgs = Array.from(document.querySelectorAll('svg'));
    svgs.forEach((svg, index) => {
      const role = svg.getAttribute('role');
      const ariaHidden = svg.getAttribute('aria-hidden');
      const ariaLabel = (svg.getAttribute('aria-label') ?? '').trim();
      const describedBy = svg.getAttribute('aria-describedby');
      let targetLength = 0;
      if (describedBy) {
        const target = document.getElementById(describedBy);
        targetLength = target ? (target.textContent ?? '').trim().length : -1;
      }
      const decorative =
        ariaHidden === 'true' ||
        role === 'presentation' ||
        role === 'none' ||
        (!role && !ariaLabel && !describedBy);
      rows.push({
        route: currentRoute,
        index,
        role,
        ariaHidden,
        ariaLabel,
        describedBy,
        targetLength,
        decorative,
      });
    });
    return rows;
  }, route);
}

test.describe('VAL-EDU-035 chart-description coverage is complete site-wide', () => {
  test('every SVG on the derived route set is classified; none uncovered', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const rows: SvgRow[] = [];
    for (const route of COVERAGE_ROUTES) {
      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      expect(response?.status(), `${route} serves 200`).toBe(200);
      rows.push(...(await classifySvgs(page, route)));
    }
    expect(rows.length, 'the sweep saw at least one SVG').toBeGreaterThan(0);
    const dangling = rows.filter((row) => row.describedBy && row.targetLength < 0);
    const uncovered = rows.filter(
      (row) => !row.decorative && !(row.describedBy && row.targetLength > 0),
    );
    const described = rows.filter((row) => !row.decorative && row.targetLength > 0);
    expect(
      dangling,
      `dangling aria-describedby: ${JSON.stringify(dangling)}`,
    ).toEqual([]);
    expect(
      uncovered,
      `uncovered non-decorative SVG roots: ${JSON.stringify(uncovered)}`,
    ).toEqual([]);
    expect(
      described.length,
      'at least one non-decorative described root',
    ).toBeGreaterThan(0);
  });
});

test.describe('VAL-EDU-036 descriptions are specific and unique site-wide', () => {
  test('every chart description names quantities, has digits, and is unique', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const seen = new Map<string, { route: string; text: string }>();
    let descriptionCount = 0;
    const problems: string[] = [];

    for (const route of ARTICLE_ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      const reports = await page.evaluate(
        ({ stopwords, bannedSources }) => {
          const banned = bannedSources.map((source) => new RegExp(source, 'i'));
          const items = Array.from(
            document.querySelectorAll('[data-chart-description]'),
          );
          return items.map((el) => {
            const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
            const id = el.id;
            const svgs = id
              ? Array.from(
                  document.querySelectorAll(`svg[aria-describedby="${CSS.escape(id)}"]`),
                )
              : [];
            const labelParts = svgs.map(
              (svg) => (svg.getAttribute('aria-label') ?? '').trim(),
            );
            const svgText = svgs
              .flatMap((svg) =>
                Array.from(svg.querySelectorAll('text')).map(
                  (node) => (node.textContent ?? '').trim(),
                ),
              )
              .filter(Boolean)
              .join(' ');
            const quantitySource = `${labelParts.join(' ')} ${svgText}`.trim();
            const sourceWords = quantitySource
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .map((word) => word.replace(/s$/, ''))
              .filter((word) => word.length >= 4 && !stopwords.includes(word));
            const descWords = text
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .map((word) => word.replace(/s$/, ''))
              .filter((word) => word.length >= 4);
            const matched = [...new Set(sourceWords)].filter((word) =>
              descWords.includes(word),
            );
            const digitTokens = text.split(/\s+/).filter((token) => /\d/.test(token));
            const bannedHit = banned.some((pattern) => pattern.test(text));
            return {
              text,
              matched,
              digitCount: digitTokens.length,
              bannedHit,
              sourceWordCount: new Set(sourceWords).size,
            };
          });
        },
        {
          stopwords: [...STOPWORDS],
          bannedSources: BANNED_OPENERS.map((pattern) => pattern.source),
        },
      );

      for (const report of reports) {
        descriptionCount += 1;
        if (report.digitCount < 2) {
          problems.push(`${route}: fewer than two digit-bearing tokens (${report.digitCount})`);
        }
        if (report.bannedHit) {
          problems.push(`${route}: banned opener in "${report.text.slice(0, 80)}"`);
        }
        if (report.sourceWordCount >= 2 && report.matched.length < 2) {
          problems.push(
            `${route}: named ${report.matched.length} quantity words, need 2 (${report.text.slice(0, 80)})`,
          );
        }
        const key = normalizeContract(report.text);
        const first = seen.get(key);
        if (first) {
          problems.push(
            `${route}: digit-normalised collision with ${first.route}`,
          );
        } else {
          seen.set(key, { route, text: report.text });
        }
      }
    }

    expect(descriptionCount, 'the corpus has chart descriptions').toBeGreaterThan(0);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

test.describe('VAL-EDU-037 WmDisambiguator predictions are available as text', () => {
  test('each selectable paradigm exposes what it predicts', async ({ page }) => {
    await page.goto(`${BASE}/world-models/taxonomy/`, { waitUntil: 'load' });
    const group = page.getByRole('group', { name: 'World-model paradigms' });
    const buttons = group.getByRole('button');
    const count = await buttons.count();
    expect(count).toBe(6);
    const obtained: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i);
      await button.click();
      const name = ((await button.getAttribute('aria-label')) ?? '').trim();
      const visible = (
        (await button.locator('[data-testid^="predicts-"]').innerText()) ?? ''
      ).trim();
      const takeaway = (
        (await page.locator('[data-chart-description]').filter({ hasText: /predicts/ }).first().innerText()) ??
        ''
      ).trim();
      const selectedArt = page.locator('svg[role="img"][aria-describedby]');
      await expect(selectedArt).toHaveCount(1);
      expect(visible.length, `${name} visible predicts`).toBeGreaterThan(10);
      expect(takeaway.length, `${name} takeaway`).toBeGreaterThan(40);
      obtained.push(`${name} | ${visible} | ${takeaway.slice(0, 80)}`);
    }
    expect(obtained).toHaveLength(6);
    const hiddenArts = await page.locator('[data-testid^="panel-art-"][aria-hidden="true"]').count();
    expect(hiddenArts).toBe(5);
  });
});

test.describe('VAL-EDU-040 article routes do not scroll sideways at 375px', () => {
  test('every published article has scrollWidth equal to innerWidth', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 375, height: 812 });
    const overflows: string[] = [];
    for (const route of ARTICLE_ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      const delta = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      if (delta !== 0) overflows.push(`${route} delta=${delta}`);
    }
    expect(overflows, overflows.join('\n')).toEqual([]);
  });
});
