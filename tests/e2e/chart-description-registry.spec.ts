import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHART_DESCRIPTIONS } from '../../lib/chart-descriptions';
import { validateRenderedChartDescriptionRoutes } from '../../lib/chart-description-rules';
import { publishedModules } from '../../data/modules';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * Registry-vs-DOM drift backstop for the default-state chart descriptions.
 *
 * scripts/check-chart-descriptions.ts holds the expected default-state
 * takeaway for every registered chart, but until this spec nothing
 * compared those strings to what the site renders: the older
 * chart-descriptions / chart-state-descriptions specs compare the rendered
 * description against the chart's OWN DOM (structure, control tracking,
 * restore-to-default) and never read the registry, and their populations
 * are hand-maintained subsets. That is how the GeneralistReleaseTimeline
 * entry drifted to a stale "Apr 2026" while the component derived
 * "Jul 2026" from the last release, with every gate green.
 *
 * POPULATION: derived from the registry itself (every CHART_DESCRIPTIONS
 * entry) crossed with the derived published-article route set plus the
 * home route. No hand-maintained chart list; a new registry entry is
 * automatically in scope, and its declared owner must be a member of the
 * published route corpus. Registry entries count source mounts, while the
 * rendered described-root population can be larger because mapped
 * subcomponents render multiple roots. Both populations are derived and
 * reconciled below rather than pinned in volatile comments.
 *
 * COMPARISON SURFACE: rendered innerText, never raw HTML containment.
 * React inserts <!-- --> comment markers between interpolated JSX
 * children, so raw-HTML substring checks false-fail on exactly the
 * entries whose numbers are interpolated from state (the ones that matter
 * most here). innerText carries no comment nodes.
 *
 * RESIDUAL LIMIT, stated plainly: this backstop pins the DEFAULT state
 * only. A description whose clause is true at the default and false after
 * one control move (the class that produced the three published false
 * claims) still passes here, because both the registry and the rendered
 * default DOM carry the same wrong clause. Per-state truth comes from
 * DERIVING the varying clause from state at render time inside the
 * component; the state-tracking halves of the older specs exercise that
 * derivation. This gate is drift verification of the default render, not
 * truth verification.
 */

const OUT = join(process.cwd(), 'out');

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  expect(
    existsSync(join(OUT, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-description-registry spec',
  ).toBe(true);
  server = await startStaticExportServer(OUT);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

function slash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/** Routes that can host a chart: every published article plus the home page. */
const ROUTES = ['/', ...publishedModules().map((m) => slash(`/${m.domain}/${m.slug}`))];

/** Collapse whitespace so innerText and authored JSX text compare equal. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Collect every default-state description text from the rendered DOM.
 *
 * Components render descriptions at their default configuration on first
 * load, so one pass per route is enough; no control is touched. Non-zero
 * cardinality is asserted per collection so a selector regression that
 * matches nothing fails loudly instead of passing vacuously.
 */
async function collectRenderedDescriptions(
  page: Page,
): Promise<{ byRoute: Map<string, Set<string>>; rootCount: number }> {
  const byRoute = new Map<string, Set<string>>();
  let rootCount = 0;
  for (const route of ROUTES) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    expect(response?.status(), `${route} serves 200`).toBe(200);
    const texts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-chart-description]')).map((el) =>
        (el as HTMLElement).innerText,
      ),
    );
    const normalized = new Set(texts.map(normalize));
    byRoute.set(route, normalized);
    rootCount += texts.length;
  }
  return { byRoute, rootCount };
}

test.describe('registry population is derived, not hand-maintained', () => {
  test('every registry entry is in scope and the route set is the full corpus', () => {
    expect(CHART_DESCRIPTIONS.length, 'registry is non-empty').toBeGreaterThan(0);
    expect(ROUTES.length, 'derived route corpus (home + published articles)').toBeGreaterThan(40);
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
    const routeSet = new Set(ROUTES);
    for (const entry of CHART_DESCRIPTIONS) {
      expect(
        routeSet.has(entry.route),
        `${entry.component} owning route ${entry.route} is published`,
      ).toBe(true);
    }
  });
});

test.describe('registry text equals the rendered default-state description', () => {
  test('every registry entry renders verbatim on its owning route', async ({ page }) => {
    test.setTimeout(180_000);
    const rendered = await collectRenderedDescriptions(page);
    expect(
      rendered.rootCount,
      'the DOM sweep saw described charts (non-zero rendered population)',
    ).toBeGreaterThanOrEqual(CHART_DESCRIPTIONS.length);
    const problems = validateRenderedChartDescriptionRoutes(
      CHART_DESCRIPTIONS.map((entry) => ({ ...entry, text: normalize(entry.text) })),
      rendered.byRoute,
    );
    expect(
      problems,
      problems
        .map((problem) => `${problem.component}: ${problem.message}`)
        .join('\n\n'),
    ).toEqual([]);
  });
});
