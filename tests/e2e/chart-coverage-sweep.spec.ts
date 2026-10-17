import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAINS, publishedModules } from '../../data/modules';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';
import { forEachInOwnContext } from './helpers/per-route-context';
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
  '/how-robots-work/',
  '/search/',
  '/editorial-policy/',
  '/about/',
  '/privacy/',
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
    // Registry-derived: no literal published count is pinned (it drifted
    // 42 -> 43 -> 47 -> 57 across publishes); non-zero cardinality only.
    expect(ARTICLE_ROUTES.length, 'published article count').toBeGreaterThan(0);
    expect(DOMAIN_ROUTES.length, 'seven domain landings').toBe(7);
    expect(new Set(COVERAGE_ROUTES).size).toBe(COVERAGE_ROUTES.length);
    expect(new Set(CLEAN_ROUTES_040).size).toBe(CLEAN_ROUTES_040.length);
    expect(COVERAGE_ROUTES).toContain('/');
    expect(COVERAGE_ROUTES).toContain('/market-map/');
    expect(COVERAGE_ROUTES).toContain('/playground/');
    expect(CLEAN_ROUTES_040).toContain('/glossary/');
    expect(CLEAN_ROUTES_040).toContain('/a-z/');
    expect(CLEAN_ROUTES_040).toContain('/search/');
    expect(CLEAN_ROUTES_040).toContain('/editorial-policy/');
    expect(CLEAN_ROUTES_040).toContain('/about/');
    expect(CLEAN_ROUTES_040).toContain('/privacy/');
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
      // aria-describedby is an ID reference list: every listed id must
      // resolve, and the description is the text of all of them.
      let targetLength = 0;
      if (describedBy) {
        const targets = describedBy
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id));
        targetLength =
          targets.length > 0 && targets.every((target) => target !== null)
            ? targets.reduce(
                (sum, target) => sum + (target!.textContent ?? '').trim().length,
                0,
              )
            : -1;
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
    browser,
  }) => {
    test.setTimeout(180_000);
    const rows: SvgRow[] = [];
    await forEachInOwnContext(browser, COVERAGE_ROUTES, async (page, route) => {
      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      expect(response?.status(), `${route} serves 200`).toBe(200);
      rows.push(...(await classifySvgs(page, route)));
    });
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

  // The DOM check above proves each reference resolves to text; it cannot
  // see whether the browser speaks that text. Most descriptions sit in a
  // figure's closed "How this was made" fold, and Chromium computes an empty
  // description for a target its closed-disclosure styling skips, so this
  // reads the computed description from the accessibility tree itself.
  test('every exposed described drawing has a computed description with its folds closed', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const rows: ComputedDescriptionRow[] = [];
    await forEachInOwnContext(browser, COVERAGE_ROUTES, async (page, route) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      rows.push(...(await computedDescriptions(page, route)));
    });
    const silent = rows.filter((row) => row.referencedLength > 0 && row.computedLength === 0);
    expect(rows.length, 'the sweep saw described drawings').toBeGreaterThan(0);
    expect(
      rows.filter((row) => row.inClosedFold).length,
      'some description sits inside a closed fold',
    ).toBeGreaterThan(0);
    expect(
      silent,
      `drawings with an empty computed description: ${JSON.stringify(silent)}`,
    ).toEqual([]);
  });
});

type ComputedDescriptionRow = {
  route: string;
  label: string;
  referencedLength: number;
  inClosedFold: boolean;
  computedLength: number;
};

async function computedDescriptions(
  page: Page,
  route: string,
): Promise<ComputedDescriptionRow[]> {
  const marked = await page.evaluate(() => {
    const closedDetails = (el: Element) => {
      for (let d = el.closest('details'); d; d = d.parentElement?.closest('details') ?? null) {
        const summary = d.querySelector(':scope > summary');
        if (!(d as HTMLDetailsElement).open && !summary?.contains(el)) return true;
      }
      return false;
    };
    return Array.from(
      document.querySelectorAll('svg[aria-describedby], [role="img"][aria-describedby]'),
    )
      .filter((el) => !el.closest('[aria-hidden="true"]') && !closedDetails(el))
      .map((el, index) => {
        el.setAttribute('data-ax-description-probe', String(index));
        const targets = (el.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id));
        return {
          index,
          label: (el.getAttribute('aria-label') ?? '').slice(0, 80),
          referencedLength: targets.reduce(
            (sum, target) => sum + (target?.textContent ?? '').trim().length,
            0,
          ),
          inClosedFold: targets.some((target) => target !== null && closedDetails(target)),
        };
      });
  });
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const rows: ComputedDescriptionRow[] = [];
  for (const entry of marked) {
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: `[data-ax-description-probe="${entry.index}"]`,
    });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
      nodeId,
      fetchRelatives: false,
    });
    const computed = String(nodes[0]?.description?.value ?? '').trim();
    rows.push({
      route,
      label: entry.label,
      referencedLength: entry.referencedLength,
      inClosedFold: entry.inClosedFold,
      computedLength: computed.length,
    });
  }
  await cdp.detach();
  return rows;
}

test.describe('VAL-EDU-036 descriptions are specific and unique site-wide', () => {
  test('every chart description names quantities, has digits, and is unique', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const seen = new Map<string, { route: string; text: string }>();
    let descriptionCount = 0;
    const problems: string[] = [];

    await forEachInOwnContext(browser, ARTICLE_ROUTES, async (page, route) => {
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
    });

    expect(descriptionCount, 'the corpus has chart descriptions').toBeGreaterThan(0);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

test.describe('VAL-EDU-037 WmDisambiguator predictions are available as text', () => {
  test('each selectable paradigm exposes what it predicts', async ({ page }) => {
    await page.goto(`${BASE}/world-models/taxonomy/`, { waitUntil: 'load' });
    // The six groups sit in the figure's "Adjust more" fold and the
    // takeaway in "How this was made"; a reader opens both.
    const figure = page.locator('[data-figure-frame="wm-disambiguator"]');
    await openAdjustMore(figure);
    await openHowThisWasMade(figure);
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
    browser,
  }) => {
    test.setTimeout(180_000);
    const overflows: string[] = [];
    await forEachInOwnContext(
      browser,
      ARTICLE_ROUTES,
      async (page, route) => {
        await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
        const delta = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (delta !== 0) overflows.push(`${route} delta=${delta}`);
      },
      { viewport: { width: 375, height: 812 } },
    );
    expect(overflows, overflows.join('\n')).toEqual([]);
  });
});
