import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { publishedModules } from '../data/modules.ts';
import { moduleBody } from './references.ts';
import { PROSE_MEASURE_CH } from './brand-v2-article-evidence.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * Evidence for the two article rows a dense surface decides: what a reader
 * without sight gets from an equation, and whether a table wider than the
 * reading column stays inside the page.
 *
 * Both are rendered facts and neither survives a source read. A table's
 * scroll container is a computed `overflow-x` and a `scrollWidth` against a
 * `clientWidth`, so whether it scrolls at all depends on the viewport it was
 * given; the four interactive comparison tables that shipped without
 * keyboard access overflowed only at 375px and were invisible to every
 * desktop-width sweep the repository already ran. An equation's accessible
 * text is the MathML KaTeX emits beside the glyphs, which exists only after
 * the pipeline has run.
 *
 * The expectation is DERIVED: the route population comes from the module
 * registry, and every route whose own MDX carries math delimiters must
 * render an equation, so a sweep that quietly stopped finding math fails
 * rather than passing over an empty set.
 */
export const TABLE_MATH_EVIDENCE_PATH =
  'evidence/brand-v2/article-tables-math.json';

/**
 * The two widths these rows are decided at.
 *
 * `VAL-B2-ART-008` has two clauses that bind at opposite ends: "remain
 * inside the viewport through internal horizontal scrolling" is only
 * testable where the table is wider than the column it sits in, which is
 * 375px, and "without reducing the prose measure below readable bounds" is
 * the desktop cap `VAL-B2-ART-002` seals. One width would leave one clause
 * unmeasured while it read as decided.
 */
export const TABLE_MATH_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812 },
  { id: '1440x900', width: 1440, height: 900 },
] as const;

export const TABLE_MATH_MOBILE_VIEWPORT_ID = '375x812';
export const TABLE_MATH_DESKTOP_VIEWPORT_ID = '1440x900';

/** The sweep whose own bytes decide what this evidence recorded. */
export const TABLE_MATH_SWEEP_MODULE =
  'tests/e2e/brand-v2-article-tables-math.spec.ts';

/**
 * How far a rendered box may exceed the container that is supposed to hold
 * it before it counts as spilling. Sub-pixel layout rounding routinely puts
 * a fraction of a pixel outside a box that visually contains it.
 */
export const CONTAINMENT_TOLERANCE_PX = 0.5;

/**
 * Raw TeX a reader must never see. `VAL-NAV-024` names the two forms that
 * survive a broken pipeline: the display delimiters, and a control sequence
 * sitting in text because it was never typeset.
 */
export const RAW_TEX_PATTERN = /\$\$|\\frac|\\begin\{|\\sum_|\\int_/;

/**
 * Block display math, used to derive which routes must render a typeset
 * equation.
 *
 * Only the block form is derived from. Inline `$…$` cannot be told apart
 * from prose by pattern: the hardware articles quote prices, and
 * `sub-\$300 … a \$32,000 configuration` and a `<Stat value="$17k+" note="to
 * $32,000" />` both read as inline delimiters to any regex that is not the
 * remark parser. A derivation that claimed those routes carry math would
 * fail the sweep over a price list. A line opening with `$$` has no such
 * second reading.
 */
const DISPLAY_MATH_DELIMITER_PATTERN = /^[ \t]*\$\$/gm;

/**
 * Fenced code, used the same way: a route whose own MDX opens a fence must
 * render a code box, so a collector that stopped finding them fails rather
 * than reporting a clean sweep over nothing.
 */
const CODE_FENCE_DELIMITER_PATTERN = /^[ \t]*```/gm;

function tableMathClosureEntries(root: string): string[] {
  return [
    ...routeEntryModules(evidenceClosureGraph(root)),
    TABLE_MATH_SWEEP_MODULE,
  ].sort();
}

/** Every published article route, in a stable order. */
export function tableMathRoutes(): string[] {
  const routes = publishedModules()
    .map(({ domain, slug }) => `/${domain}/${slug}/`)
    .sort();
  if (routes.length === 0) {
    throw new Error(
      'the article route population is empty, so every table and equation verdict would pass vacuously',
    );
  }
  return routes;
}

/**
 * How many display-math blocks each route's own MDX body opens, derived
 * independently of anything a browser reported.
 *
 * This is the half that makes a failed equation a failing member rather than
 * an absent one. KaTeX renders a parse failure as a root `.katex-error` and
 * emits no `.katex-display` at all, so counting only what typeset
 * successfully cannot tell a page with three equations from a page with four
 * where one broke. Comparing the successful output against a count derived
 * from the source can.
 */
export function displayMathSourceCounts(root: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { domain, slug } of publishedModules()) {
    const body = moduleBody(
      readFileSync(join(root, 'content', domain, `${slug}.mdx`), 'utf8'),
    );
    const delimiters = body.match(DISPLAY_MATH_DELIMITER_PATTERN)?.length ?? 0;
    if (delimiters === 0) continue;
    if (delimiters % 2 !== 0) {
      throw new Error(
        `content/${domain}/${slug}.mdx opens ${delimiters} display-math delimiters, an odd number, so its display blocks cannot be counted`,
      );
    }
    counts.set(`/${domain}/${slug}/`, delimiters / 2);
  }
  if (counts.size === 0) {
    throw new Error(
      'no published article opens a display-math block, so the equation reconciliation would check nothing',
    );
  }
  return counts;
}

/**
 * The routes whose own MDX body opens a display-math block, and which must
 * therefore render at least one typeset display equation.
 */
export function mathSourceRoutes(root: string): string[] {
  return [...displayMathSourceCounts(root).keys()].sort();
}

/**
 * How many fenced code samples each route's own MDX body opens.
 *
 * The floor under the code half of the scroll-region population. A route
 * may render more code boxes than its prose opens - an interactive mounts
 * its own - so this is a minimum rather than an equality, but a route that
 * renders fewer has lost a sample the source still contains.
 */
export function codeFenceSourceCounts(root: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { domain, slug } of publishedModules()) {
    const body = moduleBody(
      readFileSync(join(root, 'content', domain, `${slug}.mdx`), 'utf8'),
    );
    const fences = body.match(CODE_FENCE_DELIMITER_PATTERN)?.length ?? 0;
    if (fences === 0) continue;
    if (fences % 2 !== 0) {
      throw new Error(
        `content/${domain}/${slug}.mdx opens ${fences} code fences, an odd number, so its code samples cannot be counted`,
      );
    }
    counts.set(`/${domain}/${slug}/`, fences / 2);
  }
  if (counts.size === 0) {
    throw new Error(
      'no published article opens a fenced code sample, so the code reconciliation would check nothing',
    );
  }
  return counts;
}

/**
 * The fingerprint the sweep records and the generator re-derives.
 *
 * The derived math-route list is hashed in as a fact: an article that gained
 * or lost an equation must invalidate this evidence even though no `.ts`
 * byte moved.
 */
export function tableMathEvidenceFingerprint(input: { root: string }): string {
  const facts = [
    `measure:${PROSE_MEASURE_CH.min}-${PROSE_MEASURE_CH.max}`,
    `containment:${CONTAINMENT_TOLERANCE_PX}`,
    `raw-tex:${RAW_TEX_PATTERN.source}`,
    ...TABLE_MATH_VIEWPORTS.map(({ id }) => `viewport:${id}`),
    ...tableMathRoutes().map((route) => `route:${route}`),
    ...[...displayMathSourceCounts(input.root).entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([route, blocks]) => `math-source:${route}=${blocks}`),
    ...[...codeFenceSourceCounts(input.root).entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([route, samples]) => `code-source:${route}=${samples}`),
  ];
  return deriveEvidenceClosure({
    root: input.root,
    entries: tableMathClosureEntries(input.root),
    facts,
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

const equationObservationSchema = z.object({
  index: z.number(),
  /** `display` for a `.katex-display` block, `inline` otherwise. */
  display: z.boolean(),
  /** The MathML KaTeX emits beside the glyphs: the accessible text itself. */
  mathmlText: z.string(),
  /** The TeX annotation inside that MathML: the equivalent explanation. */
  annotationTex: z.string(),
  /** Whether the glyph layer is hidden, so the two are not read together. */
  htmlLayerHidden: z.boolean(),
  /** A `.katex-error` node, which is how a failed parse renders. */
  renderError: z.boolean(),
  /** Visible text as a reader meets it, for the raw-TeX check. */
  renderedText: z.string(),
  fontFamilyHead: z.string(),
  /** Own scroll geometry: a wide display block scrolls inside its own box. */
  scrollWidth: z.number(),
  clientWidth: z.number(),
  tabIndex: z.number(),
  /** The role and name of the box itself, which is a keyboard stop. */
  role: z.string().nullable(),
  accessibleName: z.string(),
  /** How far the painted box sits outside the viewport, in px. */
  viewportOverflowPx: z.number(),
});

const tableObservationSchema = z.object({
  index: z.number(),
  /** Accessible name of the table itself: its caption, label or region. */
  accessibleName: z.string(),
  captionText: z.string(),
  columnHeaders: z.number(),
  rowHeaders: z.number(),
  /** Header cells with no `scope`, which associate with nothing. */
  unscopedHeaders: z.number(),
  sortButtons: z.number(),
  sortedColumns: z.number(),
  /** Cells reading `not disclosed` and `n/a`, kept distinct on purpose. */
  notDisclosedCells: z.number(),
  notApplicableCells: z.number(),
  /** The nearest ancestor whose computed `overflow-x` scrolls, if any. */
  scrollContainer: z
    .object({
      overflowX: z.string(),
      tabIndex: z.number(),
      role: z.string().nullable(),
      accessibleName: z.string(),
      clientWidth: z.number(),
      scrollWidth: z.number(),
      /** Whether a real `scrollTo` moved it, proving the scroll is live. */
      scrolledBy: z.number(),
    })
    .nullable(),
  tableWidth: z.number(),
  /** How far the table spills past its own scroll container, in px. */
  containerOverflowPx: z.number(),
  /** How far the scroll container itself spills past the viewport, in px. */
  viewportOverflowPx: z.number(),
});

/**
 * One box a reader can scroll, or land on, that is not a control.
 *
 * The population is derived from what the browser laid out, from two
 * independent conditions, and neither of them is the property being
 * asserted. A box joins because its computed overflow scrolls and its
 * content is wider than its visible width - whether or not anything made it
 * reachable - or because it takes keyboard focus while being no control at
 * all. The first condition catches an unreachable scroll box, the second
 * catches an anonymous tab stop; the incumbent table check had neither, so
 * it collected only containers that were ALREADY reachable and swept only
 * at 1440px, where none of them overflow.
 */
const scrollRegionObservationSchema = z.object({
  index: z.number(),
  /** `table`, `math`, `code` or `other`, from what the box holds. */
  kind: z.enum(['table', 'math', 'code', 'other']),
  /** Opening tag and identifying attributes, for the failure message. */
  outline: z.string(),
  role: z.string().nullable(),
  accessibleName: z.string(),
  tabIndex: z.number(),
  clientWidth: z.number(),
  scrollWidth: z.number(),
  /** Whether a real `scrollTo` moved it, proving the scroll is live. */
  scrolledBy: z.number(),
});

const routeObservationSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  viewportWidth: z.number(),
  documentScrollWidth: z.number(),
  /** Root and body `overflow-x`, so a clipped page cannot read as a clean one. */
  rootOverflowX: z.string(),
  bodyOverflowX: z.string(),
  /** The widest running paragraph, measured the way `VAL-B2-ART-002` measures it. */
  proseWidthPx: z.number(),
  zeroAdvancePx: z.number(),
  visibleTextLength: z.number(),
  tables: z.array(tableObservationSchema),
  equations: z.array(equationObservationSchema),
  scrollRegions: z.array(scrollRegionObservationSchema),
});

export const tableMathEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  routes: z.array(z.string()),
  observations: z.array(routeObservationSchema),
});

export type TableMathEvidence = z.infer<typeof tableMathEvidenceSchema>;
export type TableMathRouteObservation = z.infer<typeof routeObservationSchema>;
export type TableObservation = z.infer<typeof tableObservationSchema>;
export type EquationObservation = z.infer<typeof equationObservationSchema>;
export type ScrollRegionObservation = z.infer<
  typeof scrollRegionObservationSchema
>;

/** One member's reading, and every way it failed the requirement. */
export type Verdict<Observed> = {
  id: string;
  observed: Observed;
  failures: string[];
};

/** The stable member id of one rendered table occurrence. */
export function tableMemberId(
  observation: TableMathRouteObservation,
  table: TableObservation,
): string {
  return `${observation.route}|${observation.viewport}|table#${table.index}`;
}

/** The stable member id of one scrollable or focusable box. */
export function scrollRegionMemberId(
  observation: TableMathRouteObservation,
  region: ScrollRegionObservation,
): string {
  return `${observation.route}|${observation.viewport}|${region.kind}-box#${region.index}`;
}

/** The stable member id of one rendered equation occurrence. */
export function equationMemberId(
  observation: TableMathRouteObservation,
  equation: EquationObservation,
): string {
  return `${observation.route}|${observation.viewport}|${
    equation.renderError ? 'error' : equation.display ? 'display' : 'inline'
  }#${equation.index}`;
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, both declared viewports, exactly the derived article
 * routes in both directions, one observation per route and viewport, a
 * non-empty page behind every one, an equation on every route whose own
 * source carries math, and non-empty table and equation populations overall.
 * Anything else throws.
 */
export function readTableMathEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  root: string;
}): TableMathEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('table and math evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(
      `table and math evidence version ${String(version)} is not 1`,
    );
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'table and math evidence is stale: an article, a shared primitive or a sealed threshold changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    tableMathEvidenceSchema,
    envelope,
    'table and math evidence',
  );

  const expectedRoutes = tableMathRoutes();
  if (
    JSON.stringify([...artifact.routes].sort()) !==
    JSON.stringify(expectedRoutes)
  ) {
    throw new Error(
      `table and math evidence covers ${artifact.routes.length} routes, not the ${expectedRoutes.length} the module registry derives`,
    );
  }
  const expectedViewports = TABLE_MATH_VIEWPORTS.map(({ id }) => id);
  if (
    JSON.stringify([...artifact.viewports].sort()) !==
    JSON.stringify([...expectedViewports].sort())
  ) {
    throw new Error(
      `table and math evidence was swept at ${artifact.viewports.join(', ')}, not ${expectedViewports.join(', ')}`,
    );
  }

  const mathBlocks = displayMathSourceCounts(input.root);
  const codeSamples = codeFenceSourceCounts(input.root);
  const seen = new Set<string>();
  for (const observation of artifact.observations) {
    const key = `${observation.route}|${observation.viewport}`;
    if (seen.has(key)) {
      throw new Error(`table and math evidence records ${key} twice`);
    }
    seen.add(key);
    if (!artifact.routes.includes(observation.route)) {
      throw new Error(
        `table and math evidence records ${observation.route}, which the module registry does not derive`,
      );
    }
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `table and math evidence records an empty page at ${key}: a blank render cannot decide a table or equation claim`,
      );
    }
    // The successful output, reconciled against a count derived from the
    // source. A parse failure emits a root `.katex-error` and no
    // `.katex-display`, so this comparison is what turns a broken equation
    // into a failing member instead of a missing one; an excess means a
    // component renders display math the derivation cannot see, which is
    // equally a population this evidence does not describe.
    const typesetDisplays = observation.equations.filter(
      ({ display, renderError }) => display && !renderError,
    ).length;
    const declaredBlocks = mathBlocks.get(observation.route) ?? 0;
    if (typesetDisplays !== declaredBlocks) {
      const broken = observation.equations.filter(
        ({ renderError }) => renderError,
      ).length;
      throw new Error(
        `${key} typesets ${typesetDisplays} display equation(s) where its own MDX body opens ${declaredBlocks} display-math block(s)${
          broken > 0 ? ` and ${broken} expression(s) failed to parse` : ''
        }`,
      );
    }
    // The same reconciliation for the other dense box. A route may render
    // more code boxes than its prose opens, because an interactive mounts
    // its own, but never fewer.
    const codeBoxes = observation.scrollRegions.filter(
      ({ kind }) => kind === 'code',
    ).length;
    const declaredSamples = codeSamples.get(observation.route) ?? 0;
    if (codeBoxes < declaredSamples) {
      throw new Error(
        `${key} renders ${codeBoxes} code box(es) where its own MDX body opens ${declaredSamples} fenced sample(s)`,
      );
    }
  }
  const missingPairs = artifact.routes
    .flatMap((route) => expectedViewports.map((v) => `${route}|${v}`))
    .filter((key) => !seen.has(key));
  if (missingPairs.length > 0) {
    throw new Error(
      `table and math evidence is missing ${missingPairs.length} route/viewport reading(s), starting with ${missingPairs[0]}`,
    );
  }
  if (artifact.observations.every(({ tables }) => tables.length === 0)) {
    throw new Error(
      'the sweep found no table anywhere, so every table verdict would pass vacuously',
    );
  }
  if (artifact.observations.every(({ equations }) => equations.length === 0)) {
    throw new Error(
      'the sweep found no equation anywhere, so every equation verdict would pass vacuously',
    );
  }
  for (const kind of ['math', 'code'] as const) {
    if (
      artifact.observations.every(({ scrollRegions }) =>
        scrollRegions.every((region) => region.kind !== kind),
      )
    ) {
      throw new Error(
        `the sweep found no ${kind} box anywhere, so every ${kind} scroll-region verdict would pass vacuously`,
      );
    }
  }
  return artifact;
}

function* eachTable(
  evidence: TableMathEvidence,
): Generator<[TableMathRouteObservation, TableObservation]> {
  for (const observation of evidence.observations) {
    for (const table of observation.tables) yield [observation, table];
  }
}

function* eachEquation(
  evidence: TableMathEvidence,
): Generator<[TableMathRouteObservation, EquationObservation]> {
  for (const observation of evidence.observations) {
    for (const equation of observation.equations) yield [observation, equation];
  }
}

function* eachScrollRegion(
  evidence: TableMathEvidence,
): Generator<[TableMathRouteObservation, ScrollRegionObservation]> {
  for (const observation of evidence.observations) {
    for (const region of observation.scrollRegions) yield [observation, region];
  }
}

function nonEmpty<T>(verdicts: Map<string, T>, what: string): Map<string, T> {
  if (verdicts.size === 0) {
    throw new Error(
      `the ${what} population is empty, so its verdicts would pass vacuously`,
    );
  }
  return verdicts;
}

/**
 * `VAL-B2-ART-007`: equations expose accessible text or an equivalent
 * explanation.
 *
 * Graded per equation occurrence and per viewport, inline and display alike.
 * The accessible text is the MathML KaTeX writes beside the glyphs, and the
 * equivalent explanation is the TeX annotation inside it; the glyph layer
 * has to stay hidden from assistive technology or the two are announced
 * together as a stream of isolated letters. A display block wide enough to
 * scroll also has to be reachable by keyboard, because an equation whose
 * right-hand side is unreachable has not been exposed to anyone.
 */
export function equationAccessibilityVerdicts(
  evidence: TableMathEvidence,
): Map<string, Verdict<EquationObservation>> {
  const verdicts = new Map<string, Verdict<EquationObservation>>();
  for (const [observation, equation] of eachEquation(evidence)) {
    const id = equationMemberId(observation, equation);
    const failures: string[] = [];
    if (equation.renderError) {
      failures.push(`${id} rendered a KaTeX parse error instead of an equation`);
    }
    if (equation.mathmlText.trim().length === 0) {
      failures.push(
        `${id} emits no MathML, so a reader without sight is offered nothing where the equation is`,
      );
    }
    if (equation.annotationTex.trim().length === 0) {
      failures.push(
        `${id} carries no TeX annotation, so its MathML has no source-form equivalent`,
      );
    }
    if (!equation.htmlLayerHidden) {
      failures.push(
        `${id} leaves its glyph layer exposed to assistive technology, which reads the typeset letters over the MathML`,
      );
    }
    if (RAW_TEX_PATTERN.test(equation.renderedText)) {
      failures.push(
        `${id} shows raw TeX to the reader: "${equation.renderedText.slice(0, 40)}"`,
      );
    }
    if (!/mono|katex/i.test(equation.fontFamilyHead)) {
      failures.push(
        `${id} sets its equation in ${equation.fontFamilyHead}, neither the math face nor the mono face the type contract assigns`,
      );
    }
    // The scroll clause binds only where the block actually scrolls: a
    // narrow equation is not a scrollable region and does not need a tab
    // stop, and demanding one would put 288 empty stops in the reading order.
    if (equation.scrollWidth > equation.clientWidth + 1 && equation.tabIndex !== 0) {
      failures.push(
        `${id} scrolls ${equation.scrollWidth}px inside a ${equation.clientWidth}px box with tabIndex ${equation.tabIndex}, so its right-hand side is unreachable without a pointer`,
      );
    }
    // A display block IS a keyboard stop, on every route, because the
    // pipeline gives it one. Exposing the equation therefore means the box
    // a reader lands on says what it is: an anonymous stop in the middle of
    // an article exposes the equation to nobody.
    if (equation.display && equation.tabIndex >= 0) {
      if (equation.role !== 'region') {
        failures.push(
          `${id} is a keyboard stop with role ${equation.role ?? 'none'}, so nothing announces the equation boundary a reader has landed on`,
        );
      }
      if (equation.accessibleName.trim().length === 0) {
        failures.push(
          `${id} is an anonymous keyboard stop: a reader who tabs into the equation is told nothing about where they are`,
        );
      }
    }
    if (equation.viewportOverflowPx > CONTAINMENT_TOLERANCE_PX) {
      failures.push(
        `${id} paints ${equation.viewportOverflowPx.toFixed(1)}px outside the ${observation.viewportWidth}px viewport`,
      );
    }
    verdicts.set(id, { id, observed: equation, failures });
  }
  return nonEmpty(verdicts, 'equation occurrence');
}

/**
 * `VAL-B2-ART-008`: tables remain inside the viewport through internal
 * horizontal scrolling, without reducing the prose measure below readable
 * bounds.
 *
 * Graded per table occurrence and per viewport, because a table that is
 * contained at 1440px and spills at 375px is not a contained table, and
 * grading by route would let the wide reading outvote the narrow one.
 *
 * "Through internal horizontal scrolling" is three separate facts and each
 * is measured: the table has a scroll container, the container really moved
 * when something scrolled it, and a keyboard can reach it. The measure
 * clause uses the same widest-running-paragraph reading and the same sealed
 * `PROSE_MEASURE_CH` range as `VAL-B2-ART-002`, so the two rows cannot
 * disagree about what a readable measure is.
 */
export function tableContainmentVerdicts(
  evidence: TableMathEvidence,
): Map<string, Verdict<TableObservation & { measureCh: number }>> {
  const verdicts = new Map<
    string,
    Verdict<TableObservation & { measureCh: number }>
  >();
  for (const [observation, table] of eachTable(evidence)) {
    const id = tableMemberId(observation, table);
    const failures: string[] = [];
    const measureCh =
      observation.zeroAdvancePx > 0
        ? Math.round(
            (observation.proseWidthPx / observation.zeroAdvancePx) * 100,
          ) / 100
        : 0;

    if (table.accessibleName.trim().length === 0) {
      failures.push(
        `${id} renders an unnamed table: it has neither a caption nor a label, so a reader who lands on it is told only that it is a table`,
      );
    }
    if (table.columnHeaders === 0) {
      failures.push(`${id} declares no column header`);
    }
    if (table.unscopedHeaders > 0) {
      failures.push(
        `${id} leaves ${table.unscopedHeaders} header cell(s) without a scope, so they associate with nothing`,
      );
    }
    if (table.sortButtons > 0 && table.sortedColumns === 0) {
      failures.push(
        `${id} offers ${table.sortButtons} sort control(s) but reports no aria-sort, so the sorted column is a fact only the pixels carry`,
      );
    }

    const container = table.scrollContainer;
    if (container === null) {
      // Only a table that is actually wider than its context needs one; a
      // narrow table inside the measure has nothing to scroll.
      if (table.containerOverflowPx > CONTAINMENT_TOLERANCE_PX) {
        failures.push(
          `${id} is ${table.tableWidth}px wide with no scroll container, so it widens the page instead of scrolling`,
        );
      }
    } else {
      const scrolls = container.scrollWidth > container.clientWidth + 1;
      if (scrolls && container.tabIndex !== 0) {
        failures.push(
          `${id} scrolls ${container.scrollWidth}px inside a ${container.clientWidth}px box with tabIndex ${container.tabIndex}, so the columns past its right edge are unreachable without a pointer`,
        );
      }
      if (scrolls && container.accessibleName.trim().length === 0) {
        failures.push(
          `${id} scrolls inside an anonymous box: it has role ${container.role ?? 'none'} and no accessible name, so a reader who lands on it is told nothing about what it holds`,
        );
      }
      if (scrolls && container.scrolledBy <= 0) {
        failures.push(
          `${id} reports a scrollable container that did not move when it was scrolled, so the overflow is clipped rather than scrollable`,
        );
      }
      if (table.containerOverflowPx > CONTAINMENT_TOLERANCE_PX) {
        failures.push(
          `${id} spills ${table.containerOverflowPx.toFixed(1)}px past the container that is supposed to hold it`,
        );
      }
      if (table.viewportOverflowPx > CONTAINMENT_TOLERANCE_PX) {
        failures.push(
          `${id} pushes its container ${table.viewportOverflowPx.toFixed(1)}px outside the ${observation.viewportWidth}px viewport`,
        );
      }
    }

    if (observation.documentScrollWidth > observation.viewportWidth + 0.5) {
      failures.push(
        `${observation.route} scrolls ${observation.documentScrollWidth}px horizontally in a ${observation.viewportWidth}px viewport, so a table on it did not stay inside the page`,
      );
    }
    // A page whose root or body clips horizontal overflow can host a table
    // that spills and still report a clean scroll width, which is exactly
    // the band-aid `VAL-DESIGN-027` refuses.
    for (const [where, overflow] of [
      ['root', observation.rootOverflowX],
      ['body', observation.bodyOverflowX],
    ] as const) {
      if (['hidden', 'clip'].includes(overflow)) {
        failures.push(
          `${observation.route} sets ${where} overflow-x to ${overflow}, hiding whatever a table does to the page width`,
        );
      }
    }

    if (observation.viewport === TABLE_MATH_DESKTOP_VIEWPORT_ID) {
      if (measureCh === 0) {
        failures.push(
          `${observation.route} renders no running prose paragraph beside its table, so the measure clause rests on nothing`,
        );
      } else if (measureCh < PROSE_MEASURE_CH.min) {
        failures.push(
          `${observation.route} sets its prose measure at ${measureCh}ch beside this table, under the ${PROSE_MEASURE_CH.min}ch readable floor`,
        );
      }
    }

    verdicts.set(id, { id, observed: { ...table, measureCh }, failures });
  }
  return nonEmpty(verdicts, 'table occurrence');
}

/**
 * `library/design-system.md`: scrollable regions are keyboard reachable and
 * labelled.
 *
 * Graded per box and per viewport over every scrollable or focusable
 * non-control box the page laid out, whatever it holds. The three facts are
 * separate and each is checked: the box takes focus, it owns a region so a
 * screen reader announces a boundary at all, and that region has a name. A
 * box with the tab stop and no name is the state this repository shipped
 * for every display equation and every fenced sample: the keyboard reader
 * reaches a scroll box that says nothing about what it is holding.
 */
export function scrollRegionVerdicts(
  evidence: TableMathEvidence,
): Map<string, Verdict<ScrollRegionObservation>> {
  const verdicts = new Map<string, Verdict<ScrollRegionObservation>>();
  for (const [observation, region] of eachScrollRegion(evidence)) {
    const id = scrollRegionMemberId(observation, region);
    const failures: string[] = [];
    const scrolls = region.scrollWidth > region.clientWidth + 1;

    if (scrolls && region.tabIndex < 0) {
      failures.push(
        `${id} scrolls ${region.scrollWidth}px inside a ${region.clientWidth}px box with tabIndex ${region.tabIndex}, so everything past its right edge is unreachable without a pointer: ${region.outline}`,
      );
    }
    if (region.role !== 'region') {
      failures.push(
        `${id} takes focus with role ${region.role ?? 'none'}, so a screen reader announces no boundary where the scrolling starts: ${region.outline}`,
      );
    }
    if (region.accessibleName.trim().length === 0) {
      failures.push(
        `${id} is an anonymous scroll stop: a reader who lands on it is told nothing about what it holds: ${region.outline}`,
      );
    }
    if (scrolls && region.scrolledBy <= 0) {
      failures.push(
        `${id} reports a scrollable box that did not move when it was scrolled, so its overflow is clipped rather than scrollable: ${region.outline}`,
      );
    }

    verdicts.set(id, { id, observed: region, failures });
  }
  return nonEmpty(verdicts, 'scrollable region');
}

/** Members the scroll-region rule quantifies over. */
export function scrollRegionMembers(evidence: TableMathEvidence): string[] {
  return [...eachScrollRegion(evidence)]
    .map(([observation, region]) => scrollRegionMemberId(observation, region))
    .sort();
}

/** Members `VAL-B2-ART-008` quantifies over: every rendered table occurrence. */
export function tableOccurrenceMembers(evidence: TableMathEvidence): string[] {
  return [...eachTable(evidence)]
    .map(([observation, table]) => tableMemberId(observation, table))
    .sort();
}

/** Members `VAL-B2-ART-007` quantifies over: every rendered equation occurrence. */
export function equationOccurrenceMembers(
  evidence: TableMathEvidence,
): string[] {
  return [...eachEquation(evidence)]
    .map(([observation, equation]) => equationMemberId(observation, equation))
    .sort();
}
