import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../data/modules';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * VAL-EDU-045: an article's prose reaches its first interactive before it
 * becomes a wall.
 *
 * The population is DERIVED from the module registry, never a literal route
 * list, so a module published later is graded by this spec automatically
 * rather than silently skipped. The in-scope set is then narrowed by a
 * measured property of each rendered page (does it mount an interactive at
 * all), which is what the contract's exclusion of the three table-only
 * adjacent routes actually means. Those three are asserted to be excluded
 * BY NAME below, so the exclusion cannot quietly grow to cover a route that
 * regressed.
 */

/** Contract clause (a). */
const MAX_PRECEDING_WORDS = 300;
/** Contract clause (b). */
const MAX_PRECEDING_H2 = 1;
/** Contract clause (c), at a 1440x900 viewport. */
const MAX_TOP_EDGE_PX = 1600;

/**
 * Contract clause (d). Second-person instruction patterns, verbatim from the
 * assertion text. A generic "the interactive below shows" matches none of
 * them, which is the point.
 */
const CUE_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['drag', /\bdrag\b/i],
  ['move the', /\bmove the\b/i],
  ['slide', /\bslide\b/i],
  ['toggle', /\btoggle\b/i],
  ['switch', /\bswitch (it |the )?/i],
  ['turn on/off', /\bturn (it |the )?(on|off)\b/i],
  ['set the', /\bset (it |the )/i],
  ['try', /\btry\b/i],
];

/**
 * Routes the contract excludes by construction: they mount only static MDX
 * tables, so they have no first interactive to reach. The contract requires
 * these to be REPORTED as excluded rather than failed.
 */
const CONTRACT_EXCLUSIONS = [
  '/adjacent/autonomous-vehicles/',
  '/adjacent/space/',
  '/adjacent/surgical/',
] as const;

interface Measurement {
  hasInteractive: boolean;
  precedingWords: number;
  precedingH2: number;
  precedingH2Texts: string[];
  topEdge: number;
  adjacentParagraphs: string[];
  controlLabels: string[];
}

function articleRoutes(): string[] {
  return publishedModules().map((m) => `/${m.domain}/${m.slug}/`);
}

function completeMeasurements(
  measurements: ReadonlyMap<string, Measurement>,
): Array<[string, Measurement]> {
  const routes = articleRoutes();
  expect(
    routes.length,
    'no published article routes derived from the registry',
  ).toBeGreaterThan(0);
  expect(
    measurements.size,
    `shared measurement corpus is incomplete: expected ${routes.length} routes, received ${measurements.size}`,
  ).toBe(routes.length);
  expect(
    [...measurements.keys()].sort(),
    'shared measurement corpus routes do not match the published registry',
  ).toEqual([...routes].sort());
  return routes.map((route) => [route, measurements.get(route)!]);
}

/**
 * Locate the first interactive and measure the four clauses against it, in
 * one page evaluation so every number describes the same layout pass.
 *
 * "Interactive" follows the contract definition: a region holding a
 * non-decorative SVG root and at least one control. The filterable MDX
 * tables render controls and no SVG root, and they are still the article's
 * first interactive surface, so a control-only region is the documented
 * fallback rather than a miss.
 */
const MEASURE = (): Measurement | null => {
  // Every heading carries a copy-link button (VAL-WIKI-030), which is prose
  // chrome rather than an interactive's control, so a bare `button` selector
  // would find one in the first heading and read the whole article as the
  // interactive region.
  const CONTROLS = 'input, select, button:not([data-heading-permalink])';
  const prose = document.querySelector<HTMLElement>(
    'div[data-pagefind-body].prose',
  );
  if (!prose) return null;

  const decorative = (el: Element) => el.closest('[aria-hidden="true"]') !== null;
  const svgs = Array.from(prose.querySelectorAll('svg')).filter(
    (s) => !decorative(s),
  );

  let region: HTMLElement | null = null;
  let svg: Element | null = null;
  for (const candidate of svgs) {
    let node = candidate.parentElement;
    while (node !== null && node !== prose) {
      if (node.querySelector(CONTROLS) !== null) {
        region = node;
        svg = candidate;
        break;
      }
      node = node.parentElement;
    }
    if (region !== null) break;
  }
  if (region === null) {
    const control = prose.querySelector(CONTROLS);
    let node = control === null ? null : control.parentElement;
    while (node !== null && node !== prose && node.parentElement !== prose) {
      node = node.parentElement;
    }
    if (node !== null && node !== prose) region = node;
  }
  if (region === null) {
    return {
      hasInteractive: false,
      precedingWords: 0,
      precedingH2: 0,
      precedingH2Texts: [],
      topEdge: 0,
      adjacentParagraphs: [],
      controlLabels: [],
    };
  }

  // Clause (a): the rendered prose preceding the interactive's own top-level
  // block. innerText is the measure the contract names, so the clone has to
  // be laid out (offscreen) rather than read as textContent: textContent
  // would miss text-transform and would count the body of a closed
  // <details>, which a reader never sees.
  let topLevel: HTMLElement = region;
  while (topLevel.parentElement !== null && topLevel.parentElement !== prose) {
    topLevel = topLevel.parentElement;
  }
  const holder = document.createElement('div');
  holder.style.position = 'absolute';
  holder.style.left = '-99999px';
  holder.style.width = '65ch';
  for (const child of Array.from(prose.children)) {
    if (child === topLevel) break;
    holder.appendChild(child.cloneNode(true));
  }
  document.body.appendChild(holder);
  const precedingText = holder.innerText;
  holder.remove();
  const precedingWords = precedingText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const PRECEDING = Node.DOCUMENT_POSITION_PRECEDING;
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
  const precedingH2s = Array.from(prose.querySelectorAll('h2')).filter(
    (h) => (region.compareDocumentPosition(h) & PRECEDING) !== 0,
  );

  const rect = (svg ?? region).getBoundingClientRect();

  const paragraphs = Array.from(prose.querySelectorAll('p')).filter(
    (p) => p.innerText.trim().length > 0,
  );
  const before = paragraphs.filter(
    (p) => (region.compareDocumentPosition(p) & PRECEDING) !== 0,
  );
  const after = paragraphs.filter(
    (p) => (region.compareDocumentPosition(p) & FOLLOWING) !== 0,
  );

  const labels: string[] = [];
  for (const control of Array.from(
    region.querySelectorAll<HTMLElement>(CONTROLS),
  )) {
    const aria = control.getAttribute('aria-label');
    if (aria !== null) labels.push(aria);
    const id = control.getAttribute('id');
    if (id !== null) {
      const forLabel = region.querySelector<HTMLElement>(
        `label[for="${CSS.escape(id)}"]`,
      );
      if (forLabel !== null) labels.push(forLabel.innerText);
    }
    const own = control.innerText.trim();
    if (own.length > 0) labels.push(own);
    const wrapping = control.closest<HTMLElement>('label');
    if (wrapping !== null) labels.push(wrapping.innerText);
  }

  return {
    hasInteractive: true,
    precedingWords,
    precedingH2: precedingH2s.length,
    precedingH2Texts: precedingH2s.map((h) => h.innerText),
    topEdge: rect.top + window.scrollY,
    adjacentParagraphs: [...before.slice(-2), ...after.slice(0, 2)].map(
      (p) => p.innerText,
    ),
    controlLabels: Array.from(new Set(labels)).filter((l) => l.length > 0),
  };
};

/**
 * Clause (d) requires BOTH halves: a second-person instruction pattern AND
 * that the instruction names a control the interactive actually renders.
 * Checking only the pattern would accept "try the next module", and checking
 * only the label would accept a passive caption.
 */
function findCue(
  paragraphs: readonly string[],
  controlLabels: readonly string[],
): { pattern: string; control: string; paragraph: string } | null {
  for (const paragraph of paragraphs) {
    const matched = CUE_PATTERNS.find(([, re]) => re.test(paragraph));
    if (matched === undefined) continue;
    const lower = paragraph.toLowerCase();
    const named = controlLabels.find((label) =>
      label
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 4)
        .some((word) => lower.includes(word)),
    );
    if (named !== undefined) {
      return { pattern: matched[0], control: named, paragraph };
    }
  }
  return null;
}

const outDir = join(process.cwd(), 'out');
const CORPUS_FIXED_BUDGET_MS = 10_000;
const PER_ROUTE_BUDGET_MS = 1_500;

test.describe('VAL-EDU-045 article prose reaches an interactive', () => {
  let server: StaticExportServer;
  const measurements = new Map<string, Measurement>();

  test.beforeAll(async () => {
    expect(
      existsSync(outDir),
      'run `npm run build` first: this spec grades the shipped export',
    ).toBe(true);
    server = await startStaticExportServer(outDir);
  });

  test.afterAll(async () => {
    await server?.stop();
  });

  test('the corpus is non-empty and every published article was measured', async ({
    browser,
  }) => {
    const routes = articleRoutes();
    test.setTimeout(
      CORPUS_FIXED_BUDGET_MS + routes.length * PER_ROUTE_BUDGET_MS,
    );

    expect(routes.length).toBeGreaterThan(30);

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    try {
      for (const route of routes) {
        await page.goto(`http://127.0.0.1:${server.port}${route}`, {
          waitUntil: 'networkidle',
        });
        const measured = await page.evaluate(MEASURE);
        expect(measured, `${route} renders no article prose region`).not.toBeNull();
        measurements.set(route, measured as Measurement);
      }
    } finally {
      await page.close();
    }

    expect(measurements.size).toBe(routes.length);
    completeMeasurements(measurements);
  });

  test('exactly the three table-only adjacent routes are excluded', () => {
    const excluded = completeMeasurements(measurements)
      .filter(([, m]) => !m.hasInteractive)
      .map(([route]) => route)
      .sort();
    // Reported, not failed: these routes mount no interactive by design.
    expect(excluded).toEqual([...CONTRACT_EXCLUSIONS].sort());
  });

  test('clause (a): at most 300 rendered words precede the first interactive', () => {
    const over = completeMeasurements(measurements)
      .filter(([, m]) => m.hasInteractive && m.precedingWords > MAX_PRECEDING_WORDS)
      .map(([route, m]) => `${route} ${m.precedingWords} words`);
    expect(over).toEqual([]);
  });

  test('clause (b): at most one h2 precedes the first interactive', () => {
    const over = completeMeasurements(measurements)
      .filter(([, m]) => m.hasInteractive && m.precedingH2 > MAX_PRECEDING_H2)
      .map(
        ([route, m]) =>
          `${route} ${m.precedingH2} h2 (${m.precedingH2Texts.join(' | ')})`,
      );
    expect(over).toEqual([]);
  });

  test('clause (c): the first non-decorative svg sits within 1600px of the document top', () => {
    const over = completeMeasurements(measurements)
      .filter(([, m]) => m.hasInteractive && m.topEdge > MAX_TOP_EDGE_PX)
      .map(([route, m]) => `${route} ${Math.round(m.topEdge)}px`);
    expect(over).toEqual([]);
  });

  test('clause (d): an operating cue naming a rendered control sits in the adjacent prose', () => {
    const missing = completeMeasurements(measurements)
      .filter(
        ([, m]) =>
          m.hasInteractive &&
          findCue(m.adjacentParagraphs, m.controlLabels) === null,
      )
      .map(([route]) => route);
    expect(missing).toEqual([]);
  });

  test('the cue is outside any gated reveal, since a closed details hides its body from innerText', () => {
    // A cue living inside a closed <details> would not appear in the
    // paragraphs this spec reads at all, so a passing clause (d) already
    // proves the cue is ungated. Pin the count so the clause cannot pass
    // vacuously on an empty paragraph set.
    const entries = completeMeasurements(measurements);
    const cued = entries.filter(
      ([, m]) =>
        m.hasInteractive && findCue(m.adjacentParagraphs, m.controlLabels) !== null,
    );
    const inScope = entries.filter(([, m]) => m.hasInteractive);
    expect(cued.length).toBe(inScope.length);
    for (const [route, m] of cued) {
      const cue = findCue(m.adjacentParagraphs, m.controlLabels);
      expect(cue, route).not.toBeNull();
      expect(m.adjacentParagraphs, route).toContain(
        (cue as { paragraph: string }).paragraph,
      );
    }
  });
});
