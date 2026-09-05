import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { IMAGES, attributionText, figureKind, licenceLabel } from '../data/images.ts';
import type { SiteImage } from '../data/schemas/image.ts';
import { LEGAL_BASES } from '../data/schemas/image.ts';
import { publishedModules } from '../data/modules.ts';
import { referencedImageIds } from './images.ts';
import { moduleBody } from './references.ts';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * Evidence for the figures an article carries, the two original diagrams,
 * and the provenance record behind every licensed image.
 *
 * Ten rows are decided here and they split by what can decide them.
 *
 * Five are RENDERED facts. Whether a diagram is a bounded instrument is a
 * background colour and a border a browser painted; whether its label is
 * legible on that instrument is a contrast ratio between two computed
 * colours; whether alt text repeats the caption beside it is a comparison
 * between two strings that only exist together once the template has run.
 * None of them is decidable from source, so they are measured at both
 * widths and read back through a reader that throws rather than degrade.
 *
 * Five are RECORD facts, and measuring them in a browser would be a
 * category error: a licence is not painted, and an SVG's semantic geometry
 * is a property of the bytes on disk. Those are derived from the registry,
 * the immutable baseline manifest and the files themselves.
 *
 * The expectation for the rendered half is DERIVED from the same registry
 * the template renders from, never from a stored copy of a previous render.
 * A stored copy can only detect drift away from itself and would bless a
 * figure that was wrong when the copy was taken.
 */
export const FIGURE_RUNTIME_EVIDENCE_PATH = 'evidence/brand-v2/figures.json';

/** The two widths the article rows are measured at. */
export const FIGURE_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812 },
  { id: '1440x900', width: 1440, height: 900 },
] as const;

export const FIGURE_MOBILE_VIEWPORT_ID = '375x812';
export const FIGURE_DESKTOP_VIEWPORT_ID = '1440x900';

/** WCAG AA: the credit, the caption and the instrument label are all small text. */
export const FIGURE_CONTRAST_FLOOR = 4.5;

/**
 * The relative luminance a background must stay under to count as the dark
 * instrument the row calls for. `#242D33` reads 0.023 and paper `#F5F6F7`
 * reads 0.925, so the threshold separates them by two orders of magnitude
 * and cannot be met by a merely tinted plate.
 */
export const DARK_INSTRUMENT_LUMINANCE_CEILING = 0.1;

/**
 * WCAG 1.4.11 for a graphical boundary. The plate's edge is a non-text
 * object, so 3:1 is the floor that separates a boundary a reader can see
 * from one only a stylesheet knows about.
 */
export const BOUNDARY_CONTRAST_FLOOR = 3;

/** The surface a dark diagram is required to be mounted on. */
export const BOUNDED_DARK_SURFACE_ID = 'surface:bounded-dark-instrument';

/** The visible classification an original schematic opens with. */
export const SCHEMATIC_LABEL_TEXT = 'Original schematic';

/** The registry page, which renders every registered image in one place. */
export const CREDITS_ROUTE = '/credits/';

/** The sweep whose own bytes decide what this evidence recorded. */
export const FIGURE_SWEEP_MODULE = 'tests/e2e/brand-v2-figures.spec.ts';

/** The bases `VAL-B2-IMG-008` admits for reusable editorial content. */
export const REUSABLE_CONTENT_BASES = LEGAL_BASES.filter(
  (basis) => basis !== 'official-identification-use',
);

function figureClosureEntries(root: string): string[] {
  return [
    ...routeEntryModules(evidenceClosureGraph(root)),
    FIGURE_SWEEP_MODULE,
  ].sort();
}

/**
 * The figures every swept route is supposed to render, derived the way the
 * pages derive them: `referencedImageIds` over each published article body,
 * and the whole registry for `/credits`, which lists every entry.
 *
 * Keyed by route so a sweep observation can be matched without re-deriving.
 */
export function expectedFigureGraph(root: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const entry of publishedModules()) {
    const source = readFileSync(
      join(root, 'content', entry.domain, `${entry.slug}.mdx`),
      'utf8',
    );
    const ids = referencedImageIds(moduleBody(source));
    if (ids.length > 0) graph.set(`/${entry.domain}/${entry.slug}/`, ids);
  }
  graph.set(
    CREDITS_ROUTE,
    IMAGES.map(({ id }) => id),
  );
  if (graph.size < 2) {
    throw new Error(
      'the expected figure graph holds fewer than two routes, so the figure population would be decided by one page',
    );
  }
  return graph;
}

/** The routes the sweep visits, in a stable order. */
export function figureRoutes(root: string): string[] {
  return [...expectedFigureGraph(root).keys()].sort();
}

/**
 * The fingerprint the sweep records and the generator re-derives.
 *
 * The derived route/figure graph is hashed in as a fact: an article that
 * gained an `<Image>` reference must invalidate this evidence even though no
 * `.ts` byte moved.
 */
export function figureEvidenceFingerprint(input: { root: string }): string {
  const graph = expectedFigureGraph(input.root);
  const facts = [
    `contrast-floor:${FIGURE_CONTRAST_FLOOR}`,
    `dark-ceiling:${DARK_INSTRUMENT_LUMINANCE_CEILING}`,
    `surface:${BOUNDED_DARK_SURFACE_ID}`,
    `label:${SCHEMATIC_LABEL_TEXT}`,
    ...FIGURE_VIEWPORTS.map(({ id }) => `viewport:${id}`),
    ...[...graph.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([route, ids]) => `figures:${route}=${ids.join(',')}`),
    ...IMAGES.map(
      (image) =>
        `record:${image.id}|${figureKind(image)}|${image.licence}|${attributionText(image)}`,
    ),
  ];
  return deriveEvidenceClosure({
    root: input.root,
    entries: figureClosureEntries(input.root),
    facts,
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

const linkSchema = z.object({ href: z.string(), text: z.string() });

const figureObservationSchema = z.object({
  /** The registry id the figure resolved, from `data-image-id`. */
  imageId: z.string(),
  /** Occurrence index within the route, so a repeated image stays distinct. */
  index: z.number(),
  figureKind: z.string(),
  src: z.string(),
  alt: z.string(),
  /** Author-declared intrinsic size, which is what reserves the space. */
  declaredWidth: z.string().nullable(),
  declaredHeight: z.string().nullable(),
  loading: z.string().nullable(),
  /** The decoded pixels: 0 when the browser never fetched the file. */
  naturalWidth: z.number(),
  naturalHeight: z.number(),
  complete: z.boolean(),
  /** Painted box, and how far it spills past its own container. */
  renderedWidth: z.number(),
  renderedHeight: z.number(),
  overflowPx: z.number(),
  caption: z.string(),
  captionFontFamily: z.string(),
  captionContrast: z.number(),
  credit: z.string(),
  creditFontFamily: z.string(),
  creditContrast: z.number(),
  creditLinks: z.array(linkSchema),
  /** The bounded-dark plate, when the figure is mounted on one. */
  surfaceId: z.string().nullable(),
  surfaceBackground: z.string().nullable(),
  surfaceLuminance: z.number().nullable(),
  surfaceBorderWidth: z.number(),
  surfaceBorderStyle: z.string().nullable(),
  /** The luminance of the ground the instrument sits on. */
  surroundLuminance: z.number().nullable(),
  /**
   * The strongest luminance step the plate's edge makes: against the ground
   * behind it, or between its border and its own fill. A dark plate on paper
   * is bounded by the step itself, so a border painted in the plate's own
   * colour is not a missing boundary.
   */
  boundaryContrast: z.number(),
  /** The self-identifying micro-label and how legible it is on that plate. */
  label: z.string().nullable(),
  labelFontFamily: z.string().nullable(),
  labelContrast: z.number().nullable(),
});

const routeObservationSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  viewportWidth: z.number(),
  documentScrollWidth: z.number(),
  visibleTextLength: z.number(),
  figures: z.array(figureObservationSchema),
});

export const figureRuntimeEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  routes: z.array(z.string()),
  observations: z.array(routeObservationSchema),
});

export type FigureRuntimeEvidence = z.infer<typeof figureRuntimeEvidenceSchema>;
export type RouteObservation = z.infer<typeof routeObservationSchema>;
export type FigureObservation = z.infer<typeof figureObservationSchema>;

/** One member's reading, and every way it failed the requirement. */
export type Verdict<Observed> = {
  id: string;
  observed: Observed;
  failures: string[];
};

const registryById = new Map(IMAGES.map((image) => [image.id, image]));

/** The stable member id of one rendered figure occurrence. */
export function figureMemberId(
  observation: RouteObservation,
  figure: FigureObservation,
): string {
  return `${observation.route}|${observation.viewport}|${figure.imageId}#${figure.index}`;
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, both declared viewports, exactly the derived routes in
 * both directions, one observation per route and viewport, a non-empty page
 * behind every one, a figure set per route that agrees with the derived
 * graph, and a `data-image-id` on every figure that the registry holds.
 * Anything else throws.
 */
export function readFigureRuntimeEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  root: string;
}): FigureRuntimeEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('figure runtime evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(`figure runtime evidence version ${String(version)} is not 1`);
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'figure runtime evidence is stale: a figure reference, an image record or a sealed threshold changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    figureRuntimeEvidenceSchema,
    envelope,
    'figure runtime evidence',
  );

  const graph = expectedFigureGraph(input.root);
  const expectedRoutes = [...graph.keys()].sort();
  if (
    JSON.stringify([...artifact.routes].sort()) !== JSON.stringify(expectedRoutes)
  ) {
    throw new Error(
      `figure runtime evidence covers ${artifact.routes.length} routes, not the ${expectedRoutes.length} the content derives`,
    );
  }
  const expectedViewports = FIGURE_VIEWPORTS.map(({ id }) => id);
  if (
    JSON.stringify([...artifact.viewports].sort()) !==
    JSON.stringify([...expectedViewports].sort())
  ) {
    throw new Error(
      `figure runtime evidence was swept at ${artifact.viewports.join(', ')}, not ${expectedViewports.join(', ')}`,
    );
  }

  const seen = new Set<string>();
  for (const observation of artifact.observations) {
    const key = `${observation.route}|${observation.viewport}`;
    if (seen.has(key)) {
      throw new Error(`figure runtime evidence records ${key} twice`);
    }
    seen.add(key);
    if (!artifact.routes.includes(observation.route)) {
      throw new Error(
        `figure runtime evidence records ${observation.route}, which the figure graph does not derive`,
      );
    }
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `figure runtime evidence records an empty page at ${key}: a blank render cannot decide a figure claim`,
      );
    }
    const expectedIds = graph.get(observation.route) ?? [];
    const renderedIds = observation.figures.map(({ imageId }) => imageId);
    const missing = expectedIds.filter((id) => !renderedIds.includes(id));
    if (missing.length > 0) {
      throw new Error(
        `${key} renders no figure for ${missing[0]}, which the page's own source references`,
      );
    }
    for (const figure of observation.figures) {
      if (!registryById.has(figure.imageId)) {
        throw new Error(
          `${key} renders a figure for "${figure.imageId}", which the image registry does not hold`,
        );
      }
      const declared = figureKind(registryById.get(figure.imageId) as SiteImage);
      if (figure.figureKind !== declared) {
        throw new Error(
          `${key} renders ${figure.imageId} as a ${figure.figureKind} where the registry declares ${declared}`,
        );
      }
      // The two descriptions the contract uses, "dark article diagram" and
      // "schematic", have to pick out the same set or the populations below
      // are quantifying over different things while claiming not to.
      const mounted = figure.surfaceId === BOUNDED_DARK_SURFACE_ID;
      if (mounted !== (declared === 'original-schematic')) {
        throw new Error(
          `${key} ${mounted ? 'mounts' : 'does not mount'} ${figure.imageId} on the bounded dark instrument while the registry calls it a ${declared}: the dark-diagram and schematic populations have diverged`,
        );
      }
    }
  }
  const missingPairs = artifact.routes
    .flatMap((route) => expectedViewports.map((v) => `${route}|${v}`))
    .filter((key) => !seen.has(key));
  if (missingPairs.length > 0) {
    throw new Error(
      `figure runtime evidence is missing ${missingPairs.length} route/viewport reading(s), starting with ${missingPairs[0]}`,
    );
  }
  if (artifact.observations.every(({ figures }) => figures.length === 0)) {
    throw new Error(
      'the figure sweep found no figures anywhere, so every figure verdict would pass vacuously',
    );
  }
  return artifact;
}

function* eachFigure(
  evidence: FigureRuntimeEvidence,
): Generator<[RouteObservation, FigureObservation]> {
  for (const observation of evidence.observations) {
    for (const figure of observation.figures) yield [observation, figure];
  }
}

const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);

/** How much of `a` is already said by `b`, between 0 and 1. */
function overlap(a: string, b: string): number {
  const left = words(a);
  if (left.length === 0) return 1;
  const right = new Set(words(b));
  return left.filter((token) => right.has(token)).length / left.length;
}

function nonEmpty<T>(verdicts: Map<string, T>, what: string): Map<string, T> {
  if (verdicts.size === 0) {
    throw new Error(`the ${what} population is empty, so its verdicts would pass vacuously`);
  }
  return verdicts;
}

/**
 * `VAL-B2-ART-004`: a dark article diagram is a bounded instrument with an
 * accessible inverse label, a visible boundary, and an equivalent textual
 * description.
 *
 * Graded per occurrence and per viewport. A plate that keeps its border at
 * 1440px and loses it at 375px is not a bounded instrument, and grading by
 * route would hide exactly that.
 */
export function darkInstrumentVerdicts(
  evidence: FigureRuntimeEvidence,
): Map<string, Verdict<FigureObservation>> {
  const verdicts = new Map<string, Verdict<FigureObservation>>();
  for (const [observation, figure] of eachFigure(evidence)) {
    if (figure.figureKind !== 'original-schematic') continue;
    const id = figureMemberId(observation, figure);
    const failures: string[] = [];
    if (figure.surfaceId !== BOUNDED_DARK_SURFACE_ID) {
      failures.push(
        `${id} sits on ${figure.surfaceId ?? 'the page ground'} rather than the registered ${BOUNDED_DARK_SURFACE_ID}`,
      );
    }
    if (
      figure.surfaceLuminance === null ||
      figure.surfaceLuminance > DARK_INSTRUMENT_LUMINANCE_CEILING
    ) {
      failures.push(
        `${id} paints its instrument at luminance ${figure.surfaceLuminance ?? 'none'}, above the ${DARK_INSTRUMENT_LUMINANCE_CEILING} ceiling that makes it dark`,
      );
    }
    if (figure.surfaceBorderWidth <= 0 || figure.surfaceBorderStyle !== 'solid') {
      failures.push(
        `${id} draws no border (${figure.surfaceBorderWidth}px ${figure.surfaceBorderStyle ?? 'none'})`,
      );
    }
    if (figure.boundaryContrast < BOUNDARY_CONTRAST_FLOOR) {
      failures.push(
        `${id} edges its instrument at ${figure.boundaryContrast}:1 against everything around it, below the ${BOUNDARY_CONTRAST_FLOOR}:1 floor that makes a boundary visible`,
      );
    }
    if (figure.label === null || figure.label.trim().length === 0) {
      failures.push(`${id} carries no label on the instrument`);
    } else if (
      figure.labelContrast === null ||
      figure.labelContrast < FIGURE_CONTRAST_FLOOR
    ) {
      failures.push(
        `${id} sets its inverse label at ${figure.labelContrast ?? 0}:1 on the instrument, below the ${FIGURE_CONTRAST_FLOOR}:1 floor`,
      );
    }
    // "An equivalent textual description": the alt carries the drawing for a
    // reader who cannot see it, and the caption says what it is for. A
    // diagram with a two-word alt has a label, not a description.
    if (figure.alt.trim().length < 40) {
      failures.push(
        `${id} describes the drawing in ${figure.alt.trim().length} characters, too few to stand in for it`,
      );
    }
    if (figure.caption.trim().length === 0) {
      failures.push(`${id} renders no caption`);
    }
    if (figure.overflowPx > 0.5) {
      failures.push(
        `${id} spills ${figure.overflowPx.toFixed(1)}px past the instrument that is supposed to bound it`,
      );
    }
    verdicts.set(id, { id, observed: figure, failures });
  }
  return nonEmpty(verdicts, 'dark-diagram occurrence');
}

/**
 * `VAL-B2-ART-006` and `VAL-B2-IMG-003`: a schematic says what it is and
 * does not imply a source-published mapping or measurement.
 *
 * The two rows are separate sentences about the same requirement, so they
 * share one verdict function rather than two near-copies that could drift.
 */
export function schematicSelfIdentificationVerdicts(
  evidence: FigureRuntimeEvidence,
): Map<string, Verdict<FigureObservation>> {
  const verdicts = new Map<string, Verdict<FigureObservation>>();
  for (const [observation, figure] of eachFigure(evidence)) {
    if (figure.figureKind !== 'original-schematic') continue;
    const id = figureMemberId(observation, figure);
    const entry = registryById.get(figure.imageId) as SiteImage;
    const failures: string[] = [];
    if (figure.label !== SCHEMATIC_LABEL_TEXT) {
      failures.push(
        `${id} identifies itself as "${figure.label ?? 'nothing'}" rather than "${SCHEMATIC_LABEL_TEXT}"`,
      );
    }
    if (!figure.credit.startsWith('Diagram:')) {
      failures.push(
        `${id} opens its credit with "${figure.credit.slice(0, 24)}", not the diagram noun`,
      );
    }
    // A source link on an original drawing is the implication the row bans:
    // it offers the reader an "original" to check the mapping against, and
    // there is none. The licence deed is the one link that belongs here.
    const offSite = figure.creditLinks.filter(
      ({ href }) => href !== entry.licenceUrl,
    );
    if (offSite.length > 0) {
      failures.push(
        `${id} links its credit to ${offSite[0].href}, implying a published original this drawing does not have`,
      );
    }
    if (entry.sourceUrl !== undefined) {
      failures.push(
        `${id} records a source URL for a drawing this site made, so the registry claims a published original too`,
      );
    }
    verdicts.set(id, { id, observed: figure, failures });
  }
  return nonEmpty(verdicts, 'schematic occurrence');
}

/**
 * `VAL-B2-ART-005`: every caption states a takeaway, and every credit
 * exposes creator, source and licence.
 *
 * "States a takeaway" is graded as: a whole sentence, longer than a label,
 * that is not the alt text again. A caption that repeats the alt has told a
 * sighted reader nothing the picture did not already say, which is the
 * failure the row is describing even though it cannot be spelled as a
 * keyword.
 */
export function captionAndCreditVerdicts(
  evidence: FigureRuntimeEvidence,
): Map<string, Verdict<FigureObservation>> {
  const verdicts = new Map<string, Verdict<FigureObservation>>();
  for (const [observation, figure] of eachFigure(evidence)) {
    const id = figureMemberId(observation, figure);
    const entry = registryById.get(figure.imageId) as SiteImage;
    const failures: string[] = [];
    const caption = figure.caption.trim();
    if (caption.length < 25) {
      failures.push(
        `${id} captions the figure in ${caption.length} characters, which is a label rather than a takeaway`,
      );
    }
    if (!/[.?!]$/.test(caption)) {
      failures.push(`${id} ends its caption on "${caption.slice(-12)}", not a sentence`);
    }
    if (overlap(caption, figure.alt) > 0.85) {
      failures.push(
        `${id} repeats its own alt text as the caption, so the caption adds nothing`,
      );
    }
    if (figure.captionContrast < FIGURE_CONTRAST_FLOOR) {
      failures.push(
        `${id} sets its caption at ${figure.captionContrast}:1, below the ${FIGURE_CONTRAST_FLOOR}:1 floor`,
      );
    }

    const credit = figure.credit.replace(/\s+/g, ' ').trim();
    if (credit.length === 0) {
      failures.push(`${id} renders no credit at all`);
    }
    for (const [what, value] of [
      ['creator', entry.creator],
      ['source', entry.sourceName],
      ['licence', licenceLabel(entry)],
    ] as const) {
      if (!credit.includes(value)) {
        failures.push(`${id} credits no ${what}: "${value}" is absent from "${credit}"`);
      }
    }
    if (credit !== attributionText(entry)) {
      failures.push(
        `${id} renders "${credit}" where the registry records "${attributionText(entry)}"`,
      );
    }
    if (!figure.creditLinks.some(({ href }) => href === entry.licenceUrl)) {
      failures.push(`${id} does not link its credit to the licence it names`);
    }
    // An external asset has a page it came from, and the row asks for the
    // source to be exposed rather than merely named.
    if (
      entry.sourceUrl !== undefined &&
      !figure.creditLinks.some(({ href }) => href === entry.sourceUrl)
    ) {
      failures.push(`${id} names its source without linking to ${entry.sourceUrl}`);
    }
    if (figure.creditContrast < FIGURE_CONTRAST_FLOOR) {
      failures.push(
        `${id} sets its credit at ${figure.creditContrast}:1, below the ${FIGURE_CONTRAST_FLOOR}:1 floor`,
      );
    }
    verdicts.set(id, { id, observed: figure, failures });
  }
  return nonEmpty(verdicts, 'figure occurrence');
}

/**
 * `VAL-B2-IMG-005`: alt text communicates content and function, does not
 * repeat the caption beside it, and does not use the repository identity as
 * public branding.
 *
 * The static-delivery clauses of `VAL-IMG-009` to `VAL-IMG-012` are checked
 * on the same reading, because they are the same figure at the same two
 * widths and re-sweeping for them would double 40 page loads to prove the
 * same pixels: the declared intrinsic size that reserves the space, the
 * decoded bytes that prove the file arrived, and the box that has to stay
 * inside a 375px viewport.
 */
export function altTextAndDeliveryVerdicts(
  evidence: FigureRuntimeEvidence,
): Map<string, Verdict<FigureObservation>> {
  const verdicts = new Map<string, Verdict<FigureObservation>>();
  for (const [observation, figure] of eachFigure(evidence)) {
    const id = figureMemberId(observation, figure);
    const entry = registryById.get(figure.imageId) as SiteImage;
    const failures: string[] = [];
    const alt = figure.alt.trim();
    if (alt.length < 15) {
      failures.push(`${id} carries ${alt.length} characters of alt text`);
    }
    if (alt !== entry.alt) {
      failures.push(`${id} renders alt text the registry does not hold`);
    }
    if (overlap(alt, figure.caption) > 0.85) {
      failures.push(
        `${id} repeats the caption beside it as its alt text, so a screen reader hears the same sentence twice`,
      );
    }
    if (/robot-wiki|robot-atlas-trajectory/i.test(alt)) {
      failures.push(
        `${id} uses the technical repository identity in alt text, where the public identity belongs`,
      );
    }
    const file = figure.src.split('/').pop() ?? '';
    if (alt.toLowerCase().includes(file.toLowerCase())) {
      failures.push(`${id} names the file "${file}" in its alt text`);
    }

    if (figure.declaredWidth !== String(entry.width)) {
      failures.push(
        `${id} declares width ${figure.declaredWidth ?? 'nothing'}, not the intrinsic ${entry.width} that reserves the space`,
      );
    }
    if (figure.declaredHeight !== String(entry.height)) {
      failures.push(
        `${id} declares height ${figure.declaredHeight ?? 'nothing'}, not the intrinsic ${entry.height}`,
      );
    }
    if (!figure.complete || figure.naturalWidth === 0) {
      failures.push(`${id} never decoded: the browser fetched no pixels for ${figure.src}`);
    }
    if (figure.renderedWidth > observation.viewportWidth) {
      failures.push(
        `${id} paints ${figure.renderedWidth.toFixed(0)}px wide inside a ${observation.viewportWidth}px viewport`,
      );
    }
    if (figure.overflowPx > 0.5) {
      failures.push(
        `${id} overflows its container by ${figure.overflowPx.toFixed(1)}px`,
      );
    }
    verdicts.set(id, { id, observed: figure, failures });
  }
  return nonEmpty(verdicts, 'figure occurrence');
}

/** Members the rendered rows quantify over: every figure occurrence. */
export function figureOccurrenceMembers(
  evidence: FigureRuntimeEvidence,
): string[] {
  return [...eachFigure(evidence)]
    .map(([observation, figure]) => figureMemberId(observation, figure))
    .sort();
}

/** Members the schematic rows quantify over. */
export function schematicOccurrenceMembers(
  evidence: FigureRuntimeEvidence,
): string[] {
  return [...eachFigure(evidence)]
    .filter(([, figure]) => figure.figureKind === 'original-schematic')
    .map(([observation, figure]) => figureMemberId(observation, figure))
    .sort();
}
