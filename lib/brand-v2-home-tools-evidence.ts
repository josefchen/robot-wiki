import { z } from 'zod';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  SHIPPED_GEOMETRY_MODEL_CLASS,
  WEB_FONT_BINARY_CLASS,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from './brand-v2-responsive-viewports.ts';
import { stripComments } from './source-comments.ts';

/**
 * Evidence for home's live tool entry points and its responsive/accessible
 * convergence, and the fail-closed readers that decide whether that evidence
 * may grant a result.
 *
 * The assertions here (`VAL-NAV-006`, `VAL-NAV-007`, `VAL-CROSS-015`,
 * `VAL-DESIGN-004`, `VAL-DESIGN-013`, `VAL-DESIGN-014`, `VAL-DESIGN-015`,
 * `VAL-EDU-027`, `VAL-ADJ-018` and `VAL-B2-SHELL-009`) are all claims about
 * a rendered document under a stated viewport and a stated interaction. None
 * of them is decidable from source: whether a slider moves a readout, whether
 * two mounts of one component agree, whether a figure begins above 1200px,
 * and whether any width overflows are facts about what a browser laid out
 * after it ran the page's own JavaScript.
 *
 * The measurement is therefore a browser sweep of the built export
 * (`tests/e2e/brand-v2-home-tools.spec.ts`), persisted here. Every reader
 * below throws rather than degrade: a stale fingerprint, a missing mount, an
 * empty responsive sweep, or a population the sweep never visited all refuse
 * the evidence instead of returning a weaker claim.
 */
export const HOME_TOOLS_EVIDENCE_PATH = 'evidence/brand-v2/home-tools.json';

export const HOME_TOOLS_ROUTE = '/';

/**
 * The desktop viewport `VAL-DESIGN-004` and `VAL-EDU-027` state their bounds
 * against. Both name `1440x900` literally, and "no lower than 1200px from
 * the document top" is only decidable against a stated viewport.
 */
export const HOME_TOOLS_VIEWPORT = {
  id: '1440x900',
  width: 1440,
  height: 900,
} as const;

/** `VAL-DESIGN-004`: the featured instrument begins no lower than this. */
export const FEATURED_INSTRUMENT_MAX_TOP_PX = 1200;
/** `VAL-EDU-027`: at most this many uppercase micro-labels inside main. */
export const HOME_MAX_MICRO_LABELS = 5;
/** `VAL-EDU-027` / `VAL-DESIGN-005`: at most this many bordered boxes. */
export const HOME_MAX_BORDERED_BOXES = 6;
/** `VAL-DESIGN-013`: the minimum shape count a preview must draw. */
export const PLAYGROUND_PREVIEW_MIN_SHAPES = 3;

/**
 * The exact inputs every mount of the featured interactive is driven to.
 *
 * They are inside every registered mount's declared range, which is what
 * makes `VAL-CROSS-015` decidable at all: the home mount clamps per-step
 * success to 50-99.9% while the module mounts open it to 0-100%, so "the
 * same control inputs" can only mean the same slider values, never the same
 * number of key presses.
 */
export const CROSS_MOUNT_INPUT = {
  perStepPercent: 95,
  steps: 20,
} as const;

/**
 * The independently computed readout those inputs must produce. Episode
 * success is per-step success compounded over the episode, so the expected
 * value is `0.95 ** 20`; recomputing it here rather than copying the number
 * the page printed is what makes "no fake telemetry" a measurement instead
 * of a screenshot.
 */
export function expectedEpisodeSuccessPercent(
  perStepPercent: number = CROSS_MOUNT_INPUT.perStepPercent,
  steps: number = CROSS_MOUNT_INPUT.steps,
): number {
  return (perStepPercent / 100) ** steps * 100;
}

/**
 * The same prediction in the form the instrument prints it, so a recorded
 * readout can be compared against the model rather than against another
 * recorded readout.
 */
export function expectedEpisodeSuccessReadout(inputs: {
  perStepPercent: number;
  steps: number;
}): string {
  return `${expectedEpisodeSuccessPercent(inputs.perStepPercent, inputs.steps).toFixed(1)}%`;
}

export type SliderObservation = {
  accessibleName: string;
  value: number;
  min: number;
  max: number;
  step: number;
};

export type MountObservation = {
  /** The registry mount id this observation was collected from. */
  mountId: string;
  route: string;
  ordinal: number;
  /** Rendered graphic element, so a screenshot cannot pass as an instrument. */
  graphicTag: string | null;
  graphicRole: string | null;
  graphicAriaLabel: string | null;
  /** Readout before anything is touched. */
  initialReadout: string;
  initialSliders: SliderObservation[];
  /** Readout after both sliders are driven to `CROSS_MOUNT_INPUT`. */
  drivenReadout: string;
  drivenSliders: SliderObservation[];
  /** Readout after the mount's own reset control is activated. */
  resetReadout: string;
  resetSliders: SliderObservation[];
  /** Readout after driving and resetting a second time. */
  secondResetReadout: string;
  /** Whether the sliders were driven by keyboard alone. */
  keyboardDrivenReadout: string | null;
  /** Focus ring measured on the first slider while it holds focus. */
  focusOutlineWidthPx: number | null;
  focusOutlineStyle: string | null;
  focusOutlineColour: string | null;
  resetControlNames: string[];
  /**
   * Disclosures the sweep had to open before the mount was operable. A mount
   * behind an article's commit-to-reveal step is still in the population;
   * recording the path keeps "reachable after one documented action" from
   * being confused with "reachable immediately". It is an observation and
   * never a criterion: being behind a disclosure decides nothing about what
   * a mount may open on, and no verdict reads this field.
   */
  revealedByControls: string[];
};

export type FeaturedInstrumentObservation = MountObservation & {
  /** The claim or question the section states above the instrument. */
  claimText: string;
  /** Instrument-local current-state text, independent of the chart. */
  currentStateText: string;
  /** Document-top offset of the rendered graphic. */
  graphicTopPx: number;
  graphicHeightPx: number;
  /** The registered textual alternative the graphic points at. */
  describedByText: string | null;
};

export type PlaygroundEntryObservation = {
  href: string;
  /** Every graphic in the entry point's own subtree. */
  graphics: Array<{
    tag: string;
    role: string | null;
    ariaHidden: string | null;
    ariaLabel: string | null;
    describedBy: string | null;
    shapeCount: number;
    naturalWidth: number | null;
    widthPx: number;
    heightPx: number;
  }>;
  /** Resolved text of the preview's registered textual alternative. */
  describedByText: string | null;
  /** The surface registry id of the instrument the preview sits on. */
  surfaceId: string | null;
  surfaceBackgroundColour: string | null;
  /** Every number the preview prints, for comparison with the model. */
  renderedNumbers: number[];
  /** Whether the entry point is text alone. */
  textLength: number;
};

export type RouteWidthObservation = {
  routeId: string;
  route: string;
  viewportId: string;
  width: number;
  documentScrollWidthPx: number;
  documentClientWidthPx: number;
  /**
   * Elements whose right edge exceeds the viewport with no clipping or
   * scrolling ancestor, which is what makes an overflow unintended.
   */
  unclippedOverflow: Array<{ tag: string; id: string; rightPx: number }>;
};

export type AccessibilityProfileObservation = {
  id: string;
  route: string;
  description: string;
  violationIds: string[];
  consoleErrors: string[];
  documentScrollWidthPx: number;
  documentClientWidthPx: number;
  /** Registered text members that failed the profile's own geometry rule. */
  failures: string[];
  /** Non-zero so a profile that measured nothing cannot pass. */
  measuredMembers: number;
};

/**
 * What one counted noun on one surface has to equal, derived from the
 * registry the page builds itself from.
 *
 * Declared by the population rather than by the sweep, so the expectation a
 * printed count is measured against cannot be written by the same code that
 * measures it, and so a surface can state which of its totals are not
 * optional.
 */
export type SurfaceCountExpectation = {
  /** Population member id, so a required total can be demanded by name. */
  memberId: string;
  /** The noun as a failure should name it. */
  noun: string;
  /** Which printed nouns this expectation explains, as a regular expression source. */
  nounPattern: string;
  /** The registry total a matching printed count must equal. */
  expected: number;
  /** Whether the surface must print this count at all. */
  required: boolean;
};

export type ProgressCounterObservation = {
  routeId: string;
  route: string;
  matches: string[];
  /**
   * Registry-derived counts the route printed, each naming the expectation
   * member it reconciles against, with the value that member holds and the
   * value the page printed.
   */
  reconciledCounts: Array<{
    memberId: string;
    text: string;
    expected: number;
    actual: number;
  }>;
  /**
   * Count phrases the route printed that no declared expectation explains.
   * Every one of them fails the surface. They used to be recorded here and
   * left alone, which made the list a place to park a total the derivation
   * could no longer express: a surface passed as long as some other count
   * on the page reconciled.
   */
  unreconciledCounts: string[];
};

export type HomeDesignBoundsObservation = {
  microLabels: Array<{ text: string; fontSizePx: number; family: string }>;
  borderedBoxCount: number;
  axeViolationIds: string[];
  consoleErrors: string[];
  chartDisclosureSummary: {
    text: string;
    textTransform: string;
    letterSpacing: string;
    fontSizePx: number;
    borderTopWidthPx: number;
    borderBottomWidthPx: number;
  } | null;
};

export type HomeToolsEvidence = {
  version: 1;
  fingerprint: string;
  route: string;
  viewport: string;
  featured: FeaturedInstrumentObservation;
  siblingMounts: MountObservation[];
  /**
   * The home/module-page comparison written out row by row, so the locked
   * cross-context claim can be read off the artifact instead of recomputed.
   */
  crossContext: CrossContextTable;
  playground: PlaygroundEntryObservation;
  responsive: RouteWidthObservation[];
  accessibility: AccessibilityProfileObservation[];
  progressCounters: ProgressCounterObservation[];
  designBounds: HomeDesignBoundsObservation;
};

/**
 * The kinds of rendering input this sweep depends on that no module imports.
 *
 * This used to be a one-path list naming the shipped kinematic model, which
 * covered the file somebody remembered and nothing else: renaming the model,
 * shipping a second one, or changing the face the shell renders in all left
 * the fingerprint unmoved. Declaring the classes instead lets the closure
 * derive their members from the files it already holds.
 */
const HOME_TOOLS_NON_IMPORT_CLASSES = [
  WEB_FONT_BINARY_CLASS,
  SHIPPED_GEOMETRY_MODEL_CLASS,
] as const;

/**
 * The entry points this evidence is about.
 *
 * `VAL-B2-SHELL-009` measures document overflow on all sixty-one public
 * routes at four widths, so its closure is every route entry, not the home
 * page. The ten-path list this replaces hashed home and a few shared
 * modules plus the route *ids*, which named which rows existed and nothing
 * about what any of those rows rendered: an article or an index could grow a
 * 333px table at 320px and its own row would still read `passed` from a
 * sweep taken before the edit. Route ids stay in the fingerprint as a fact,
 * because a route leaving the registry has to invalidate the artifact even
 * though no file changed.
 */
export function homeToolsClosureEntries(root: string): string[] {
  return [
    ...routeEntryModules(evidenceClosureGraph(root)),
    'tests/e2e/brand-v2-home-tools.spec.ts',
  ];
}

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of every module any public route reaches, the shipped model no
 * module imports, and the swept route set. Editing any route's render
 * inputs, the model, or the route registry without re-running the sweep is
 * then a stale-evidence failure rather than a silently preserved green row.
 */
export function homeToolsEvidenceFingerprint(input: {
  root: string;
  routeIds: readonly string[];
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: homeToolsClosureEntries(input.root),
    nonImportClasses: HOME_TOOLS_NON_IMPORT_CLASSES,
    facts: [[...input.routeIds].sort().join(',')],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

const sliderSchema = z.object({
  accessibleName: z.string(),
  value: z.number(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
});

const crossContextControlSchema = z.object({
  ordinal: z.number(),
  homeControl: z.string(),
  moduleControl: z.string(),
  homeValue: z.number(),
  moduleValue: z.number(),
  agrees: z.boolean(),
});

const mountObservationShape = {
  mountId: z.string(),
  route: z.string(),
  ordinal: z.number(),
  graphicTag: z.string().nullable(),
  graphicRole: z.string().nullable(),
  graphicAriaLabel: z.string().nullable(),
  initialReadout: z.string(),
  initialSliders: z.array(sliderSchema),
  drivenReadout: z.string(),
  drivenSliders: z.array(sliderSchema),
  resetReadout: z.string(),
  resetSliders: z.array(sliderSchema),
  secondResetReadout: z.string(),
  keyboardDrivenReadout: z.string().nullable(),
  focusOutlineWidthPx: z.number().nullable(),
  focusOutlineStyle: z.string().nullable(),
  focusOutlineColour: z.string().nullable(),
  resetControlNames: z.array(z.string()),
  revealedByControls: z.array(z.string()),
};

/** The complete nested shape of the persisted home tools sweep. */
export const homeToolsEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string(),
  route: z.string(),
  viewport: z.string(),
  featured: z.object({
    ...mountObservationShape,
    claimText: z.string(),
    currentStateText: z.string(),
    graphicTopPx: z.number(),
    graphicHeightPx: z.number(),
    describedByText: z.string().nullable(),
  }),
  siblingMounts: z.array(z.object(mountObservationShape)),
  crossContext: z.object({
    home: z.object({
      mountId: z.string(),
      route: z.string(),
      initialReadout: z.string(),
      resetReadout: z.string(),
      secondResetReadout: z.string(),
      drivenReadout: z.string(),
      initialSliders: z.array(sliderSchema),
      resetSliders: z.array(sliderSchema),
    }),
    pairs: z.array(
      z.object({
        mountId: z.string(),
        route: z.string(),
        ownerPath: z.string(),
        readouts: z.array(
          z.object({
            phase: z.enum(['initial', 'reset', 'second-reset', 'driven']),
            home: z.string(),
            module: z.string(),
            agrees: z.boolean(),
          }),
        ),
        initialControls: z.array(crossContextControlSchema),
        resetControls: z.array(crossContextControlSchema),
      }),
    ),
    excluded: z.array(
      z.object({
        mountId: z.string(),
        route: z.string(),
        ownerPath: z.string(),
        containerPath: z.array(z.string()),
        reason: z.string(),
        stillBoundBy: z.array(z.string()),
      }),
    ),
  }),
  playground: z.object({
    href: z.string(),
    graphics: z.array(
      z.object({
        tag: z.string(),
        role: z.string().nullable(),
        ariaHidden: z.string().nullable(),
        ariaLabel: z.string().nullable(),
        describedBy: z.string().nullable(),
        shapeCount: z.number(),
        naturalWidth: z.number().nullable(),
        widthPx: z.number(),
        heightPx: z.number(),
      }),
    ),
    describedByText: z.string().nullable(),
    surfaceId: z.string().nullable(),
    surfaceBackgroundColour: z.string().nullable(),
    renderedNumbers: z.array(z.number()),
    textLength: z.number(),
  }),
  responsive: z.array(
    z.object({
      routeId: z.string(),
      route: z.string(),
      viewportId: z.string(),
      width: z.number(),
      documentScrollWidthPx: z.number(),
      documentClientWidthPx: z.number(),
      unclippedOverflow: z.array(
        z.object({
          tag: z.string(),
          id: z.string(),
          rightPx: z.number(),
        }),
      ),
    }),
  ),
  accessibility: z.array(
    z.object({
      id: z.string(),
      route: z.string(),
      description: z.string(),
      violationIds: z.array(z.string()),
      consoleErrors: z.array(z.string()),
      documentScrollWidthPx: z.number(),
      documentClientWidthPx: z.number(),
      failures: z.array(z.string()),
      measuredMembers: z.number(),
    }),
  ),
  progressCounters: z.array(
    z.object({
      routeId: z.string(),
      route: z.string(),
      matches: z.array(z.string()),
      reconciledCounts: z.array(
        z.object({
          memberId: z.string(),
          text: z.string(),
          expected: z.number(),
          actual: z.number(),
        }),
      ),
      unreconciledCounts: z.array(z.string()),
    }),
  ),
  designBounds: z.object({
    microLabels: z.array(
      z.object({
        text: z.string(),
        fontSizePx: z.number(),
        family: z.string(),
      }),
    ),
    borderedBoxCount: z.number(),
    axeViolationIds: z.array(z.string()),
    consoleErrors: z.array(z.string()),
    chartDisclosureSummary: z
      .object({
        text: z.string(),
        textTransform: z.string(),
        letterSpacing: z.string(),
        fontSizePx: z.number(),
        borderTopWidthPx: z.number(),
        borderBottomWidthPx: z.number(),
      })
      .nullable(),
  }),
});

export function readHomeToolsEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): HomeToolsEvidence {
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('home tools evidence is not an object');
  }
  const { version, fingerprint } = envelope as {
    version?: unknown;
    fingerprint?: unknown;
  };
  if (version !== 1) {
    throw new Error(`home tools evidence version ${String(version)} is not 1`);
  }
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      'home tools evidence is stale: a home tool source, the shipped model, or the public route set changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const artifact = parseEvidenceArtifact(
    homeToolsEvidenceSchema,
    envelope,
    'home tools evidence',
  );
  if (artifact.route !== HOME_TOOLS_ROUTE) {
    throw new Error(
      `home tools evidence covers ${String(artifact.route)}, not ${HOME_TOOLS_ROUTE}`,
    );
  }
  if (artifact.viewport !== HOME_TOOLS_VIEWPORT.id) {
    throw new Error(
      `home tools evidence was swept at ${String(artifact.viewport)}, not ${HOME_TOOLS_VIEWPORT.id}`,
    );
  }
  if (artifact.siblingMounts.length === 0) {
    throw new Error(
      'home tools evidence discovered no sibling mount of the featured instrument: VAL-CROSS-015 would quantify over nothing',
    );
  }
  if (artifact.crossContext.pairs.length === 0) {
    throw new Error(
      "home tools evidence pairs home with no module-page mount: VAL-CROSS-015's identical-reset-state clause would quantify over nothing",
    );
  }
  // Every measured mount is accounted for by name: compared with home, or
  // excluded with the structural reason that excluded it. A mount that is
  // in neither list is one the artifact is silent about.
  const accounted = new Set([
    ...artifact.crossContext.pairs.map(({ mountId }) => mountId),
    ...artifact.crossContext.excluded.map(({ mountId }) => mountId),
  ]);
  const silent = artifact.siblingMounts
    .filter(({ mountId }) => !accounted.has(mountId))
    .map(({ mountId }) => mountId);
  if (silent.length > 0) {
    throw new Error(
      `home tools evidence measures ${silent.join(', ')} without pairing it with home or naming why it is excluded. Re-run npm run refresh:brand-v2-evidence.`,
    );
  }
  for (const row of artifact.crossContext.excluded) {
    if (row.reason.trim().length === 0 || row.stillBoundBy.length === 0) {
      throw new Error(
        `home tools evidence excludes ${row.mountId} from the cross-context pair with no recorded reason or no remaining clause, so a mount would go unchecked`,
      );
    }
  }
  if (artifact.playground.graphics.length === 0) {
    throw new Error(
      'home tools evidence found no graphic in the playground entry point, so VAL-DESIGN-013 was never measured',
    );
  }
  if (artifact.responsive.length === 0) {
    throw new Error(
      'home tools evidence recorded no responsive measurement: VAL-B2-SHELL-009 would quantify over nothing',
    );
  }
  if (artifact.accessibility.length === 0) {
    throw new Error(
      'home tools evidence recorded no accessibility profile, so VAL-DESIGN-014 was never measured',
    );
  }
  if (artifact.progressCounters.length === 0) {
    throw new Error(
      'home tools evidence swept no route for progress counters: VAL-DESIGN-015 would quantify over nothing',
    );
  }
  // A reconciliation recorded before totals were named cannot say which
  // member it settles, so it cannot settle a required one.
  for (const surface of artifact.progressCounters) {
    for (const count of surface.reconciledCounts) {
      if (count.memberId.length === 0) {
        throw new Error(
          `${surface.route} reconciles "${count.text}" against no named expectation member, so it predates the counted-noun population. Re-run npm run refresh:brand-v2-evidence.`,
        );
      }
    }
  }
  return artifact;
}

export type Verdict = {
  id: string;
  observed: Record<string, unknown>;
  failures: string[];
};

/**
 * The anchors `VAL-NAV-006`, `VAL-NAV-007` and `VAL-DESIGN-004` decompose
 * into on the home mount. Declared rather than derived from the evidence, so
 * an anchor the sweep forgot to measure is a missing member that fails, not
 * a member that never existed.
 */
export const FEATURED_INSTRUMENT_ANCHORS = [
  'anchor:featured-live-graphic',
  'anchor:featured-numeric-readout',
  'anchor:featured-keyboard-operable',
  'anchor:featured-visible-focus',
  'anchor:featured-deterministic-reset',
  'anchor:featured-reachable-in-one-scroll',
  'anchor:featured-claim-and-current-state',
  'anchor:featured-no-fabricated-telemetry',
] as const;

const PERCENT = /(\d+(?:\.\d+)?)\s*%/;

/** The number a readout prints, or null when it prints none. */
export function readoutPercent(readout: string): number | null {
  const match = PERCENT.exec(readout);
  return match ? Number(match[1]) : null;
}

/**
 * Decides the featured-instrument anchors independently.
 *
 * An instrument that is live but not resettable fails one row and passes the
 * others, which is what keeps these eight anchors from collapsing into one
 * boolean wearing eight names.
 */
export function featuredInstrumentVerdicts(
  evidence: HomeToolsEvidence,
): Verdict[] {
  const featured = evidence.featured;
  const drivenPercent = readoutPercent(featured.drivenReadout);
  const expectedPercent = expectedEpisodeSuccessPercent();

  const liveFailures: string[] = [];
  if (featured.graphicTag !== 'svg' && featured.graphicTag !== 'canvas') {
    liveFailures.push(
      `the featured mount renders ${String(featured.graphicTag)} rather than a live svg or canvas`,
    );
  }
  if (featured.graphicRole !== 'img') {
    liveFailures.push(
      `the featured graphic carries role ${String(featured.graphicRole)} rather than img`,
    );
  }
  if ((featured.graphicAriaLabel ?? '').trim().length === 0) {
    liveFailures.push('the featured graphic carries no accessible name');
  }
  if (featured.describedByText === null) {
    liveFailures.push(
      'the featured graphic points at no textual alternative that resolves on the page',
    );
  }
  if (featured.graphicHeightPx <= 0) {
    liveFailures.push('the featured graphic renders with no box');
  }

  const readoutFailures: string[] = [];
  if (readoutPercent(featured.initialReadout) === null) {
    readoutFailures.push(
      `the featured mount's readout "${featured.initialReadout}" prints no number`,
    );
  }
  if (featured.initialSliders.length === 0) {
    readoutFailures.push('the featured mount exposes no user control');
  }

  const keyboardFailures: string[] = [];
  if (featured.keyboardDrivenReadout === null) {
    keyboardFailures.push(
      'the featured mount was never driven by keyboard, so operability was not measured',
    );
  } else if (featured.keyboardDrivenReadout === featured.initialReadout) {
    keyboardFailures.push(
      `keyboard operation left the readout at ${featured.initialReadout}, so no control changed the visible state`,
    );
  }
  if (featured.drivenReadout === featured.initialReadout) {
    keyboardFailures.push(
      `driving both sliders to ${CROSS_MOUNT_INPUT.perStepPercent}% over ${CROSS_MOUNT_INPUT.steps} steps left the readout at ${featured.initialReadout}`,
    );
  }

  const focusFailures: string[] = [];
  if ((featured.focusOutlineWidthPx ?? 0) <= 0) {
    focusFailures.push(
      `the focused slider paints a ${String(featured.focusOutlineWidthPx)}px outline, so focus is not visible`,
    );
  }
  if (
    featured.focusOutlineStyle === null ||
    featured.focusOutlineStyle === 'none'
  ) {
    focusFailures.push('the focused slider paints no outline style');
  }

  const resetFailures: string[] = [];
  if (featured.resetControlNames.length === 0) {
    resetFailures.push('the featured mount exposes no reset control');
  }
  if (featured.resetReadout !== featured.initialReadout) {
    resetFailures.push(
      `reset restored ${featured.resetReadout} rather than the initial ${featured.initialReadout}`,
    );
  }
  if (featured.secondResetReadout !== featured.initialReadout) {
    resetFailures.push(
      `a second drive and reset restored ${featured.secondResetReadout} rather than ${featured.initialReadout}, so reset is not deterministic`,
    );
  }
  for (const [index, slider] of featured.resetSliders.entries()) {
    const initial = featured.initialSliders[index];
    if (!initial) {
      resetFailures.push(`reset left ${featured.resetSliders.length} controls where the mount started with ${featured.initialSliders.length}`);
      continue;
    }
    if (slider.value !== initial.value) {
      resetFailures.push(
        `reset left "${slider.accessibleName}" at ${slider.value} rather than its initial ${initial.value}`,
      );
    }
  }

  const reachFailures: string[] = [];
  if (featured.graphicTopPx > FEATURED_INSTRUMENT_MAX_TOP_PX) {
    reachFailures.push(
      `the featured graphic begins ${featured.graphicTopPx}px down the document, below the ${FEATURED_INSTRUMENT_MAX_TOP_PX}px bound`,
    );
  }

  const claimFailures: string[] = [];
  if (featured.claimText.trim().split(/\s+/).filter(Boolean).length < 8) {
    claimFailures.push(
      `the featured section states "${featured.claimText}", too short to be the claim or question the instrument answers`,
    );
  }
  if (!PERCENT.test(featured.currentStateText)) {
    claimFailures.push(
      `the featured mount prints no current-state value beside its controls (observed "${featured.currentStateText}")`,
    );
  }

  const telemetryFailures: string[] = [];
  if (drivenPercent === null) {
    telemetryFailures.push(
      `the driven readout "${featured.drivenReadout}" prints no number to compare with the model`,
    );
  } else if (Math.abs(drivenPercent - expectedPercent) > 0.05) {
    telemetryFailures.push(
      `at ${CROSS_MOUNT_INPUT.perStepPercent}% per step over ${CROSS_MOUNT_INPUT.steps} steps the mount printed ${drivenPercent}%, not the compounded ${expectedPercent.toFixed(1)}%`,
    );
  }
  // The readout the reader meets before touching anything is telemetry too,
  // and it is the value every corresponding mount is held to, so it is
  // checked against the model rather than trusted as the reference.
  const homeSeed = seededInputs(featured.initialSliders);
  if (homeSeed === null) {
    telemetryFailures.push(
      'the featured mount exposes no identifiable per-step and episode-length controls, so its opening readout cannot be checked against the model',
    );
  } else if (
    featured.initialReadout !== expectedEpisodeSuccessReadout(homeSeed)
  ) {
    telemetryFailures.push(
      `the featured mount opens reading ${featured.initialReadout}, not the ${expectedEpisodeSuccessReadout(homeSeed)} its own ${homeSeed.perStepPercent}% per step over ${homeSeed.steps} steps compounds to`,
    );
  }

  return [
    {
      id: 'anchor:featured-live-graphic',
      observed: {
        tag: featured.graphicTag,
        role: featured.graphicRole,
        ariaLabel: featured.graphicAriaLabel,
        heightPx: featured.graphicHeightPx,
      },
      failures: liveFailures,
    },
    {
      id: 'anchor:featured-numeric-readout',
      observed: {
        readout: featured.initialReadout,
        controls: featured.initialSliders.length,
      },
      failures: readoutFailures,
    },
    {
      id: 'anchor:featured-keyboard-operable',
      observed: {
        initial: featured.initialReadout,
        keyboardDriven: featured.keyboardDrivenReadout,
        driven: featured.drivenReadout,
      },
      failures: keyboardFailures,
    },
    {
      id: 'anchor:featured-visible-focus',
      observed: {
        outlineWidthPx: featured.focusOutlineWidthPx,
        outlineStyle: featured.focusOutlineStyle,
        outlineColour: featured.focusOutlineColour,
      },
      failures: focusFailures,
    },
    {
      id: 'anchor:featured-deterministic-reset',
      observed: {
        controls: featured.resetControlNames,
        reset: featured.resetReadout,
        secondReset: featured.secondResetReadout,
      },
      failures: resetFailures,
    },
    {
      id: 'anchor:featured-reachable-in-one-scroll',
      observed: {
        topPx: featured.graphicTopPx,
        boundPx: FEATURED_INSTRUMENT_MAX_TOP_PX,
        viewport: HOME_TOOLS_VIEWPORT.id,
      },
      failures: reachFailures,
    },
    {
      id: 'anchor:featured-claim-and-current-state',
      observed: {
        claim: featured.claimText,
        currentState: featured.currentStateText,
      },
      failures: claimFailures,
    },
    {
      id: 'anchor:featured-no-fabricated-telemetry',
      observed: {
        driven: featured.drivenReadout,
        expectedPercent: Number(expectedPercent.toFixed(4)),
        initial: featured.initialReadout,
        expectedInitial:
          homeSeed === null ? null : expectedEpisodeSuccessReadout(homeSeed),
      },
      failures: telemetryFailures,
    },
  ];
}

/**
 * The two controls every mount of the featured instrument exposes, located
 * by accessible name rather than by position so a mount that grew a third
 * control is still read correctly. Returns null when either control cannot
 * be identified, which the caller turns into a failure: an instrument whose
 * inputs cannot be named is one whose state cannot be compared.
 */
function seededInputs(
  sliders: readonly SliderObservation[],
): { perStepPercent: number; steps: number } | null {
  const perStep = sliders.find(({ accessibleName }) =>
    /per-step/i.test(accessibleName),
  );
  const steps = sliders.find(({ accessibleName }) =>
    /episode length/i.test(accessibleName),
  );
  if (!perStep || !steps) return null;
  return { perStepPercent: perStep.value, steps: steps.value };
}

/**
 * One registered mount of the featured interactive, as the interactive
 * registry records it.
 *
 * `ownerPath` and `props` are the two registered facts the pairing is
 * derived from, and neither is a property the markup can grant itself: the
 * registry is generated from the tree, so a mount's owner is the document
 * that mounts it and its props are the ones it is written with.
 */
export type FeaturedMountRegistration = {
  mountId: string;
  route: string;
  /** The document that mounts it: `app/page.tsx`, or a content module. */
  ownerPath: string;
  /** The mount's registered JSX props, verbatim. */
  props: string;
  /**
   * The component elements enclosing this mount in its document, outermost
   * first, each carrying the control kinds its own module declares.
   *
   * Generated by the census from the document's element tree. Unlike
   * `props`, this is not a fact the mount states about itself: a mount
   * becomes the child of another component only by being moved inside it,
   * which changes what the page is, and it cannot make its container stop
   * declaring the controls that make the container an interactive one.
   */
  containers: ReadonlyArray<{
    component: string;
    sourcePath: string | null;
    controlKinds: readonly string[];
  }>;
};

/** Content modules are the module pages; `app/` owns the routes around them. */
const MODULE_PAGE_OWNER_PREFIX = 'content/';

/**
 * The component parameter each half of the shared model is seeded from.
 *
 * Naming them binds the model to the component's own parameter list; the
 * values behind the names are read out of the component source and are
 * never restated here. A component that stops declaring either parameter is
 * one this model can no longer be computed for, and that throws rather than
 * falling back to a number written next to the assertion.
 */
const PER_STEP_PARAMETER = 'defaultPerStep';
const EPISODE_LENGTH_PARAMETER = 'defaultSteps';

/** Slider values are floats; a control is at its declared value within this. */
const SLIDER_VALUE_TOLERANCE = 1e-6;

/**
 * What the featured component declares about its own canonical state, read
 * from the component's source.
 *
 * `configurableParameters` are the parameters the component gives a
 * canonical default value to, so overriding one is departing from the
 * canonical render. A parameter the component declares without a default
 * (`className`) has no canonical value to depart from and is not one.
 */
export type FeaturedComponentDefaults = {
  configurableParameters: string[];
  /** The declared per-step success probability, in the component's own unit. */
  perStepFraction: number;
  /** The declared episode length, in steps. */
  steps: number;
};

/** Index of the bracket matching `text[open]`, ignoring brackets in strings. */
function matchingBracket(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** The top-level members of a destructuring pattern body. */
function patternMembers(body: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote !== null) {
      current += char;
      if (char === '\\') {
        current += body[index + 1] ?? '';
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    if (char === '}' || char === ')' || char === ']') depth -= 1;
    if (char === ',' && depth === 0) {
      members.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  members.push(current);
  return members.map((member) => member.trim()).filter(Boolean);
}

/** A declared default as a number, following one module-level constant. */
function resolveDeclaredNumber(
  expression: string,
  source: string,
): number | null {
  if (/^-?\d+(?:\.\d+)?$/.test(expression)) return Number(expression);
  if (!/^[A-Za-z_$][\w$]*$/.test(expression)) return null;
  const constant = new RegExp(
    `\\bconst\\s+${expression}\\s*(?::[^=]+)?=\\s*(-?\\d+(?:\\.\\d+)?)\\s*;`,
  ).exec(source);
  return constant === null ? null : Number(constant[1]);
}

/**
 * Reads the featured component's declared defaults out of its own source.
 *
 * The prediction every mount is held to is computed from these values, so
 * they are read from the module that declares them rather than copied into
 * this instrument. Changing `defaultSteps` in the component therefore moves
 * the value home's rendered readout has to equal, instead of moving nothing
 * because the instrument carried its own copy of the number.
 *
 * Every parse failure throws. A component whose props cannot be read is one
 * whose canonical default is unknown, and an unknown canonical default must
 * not resolve to a lenient one.
 */
export function featuredComponentDefaults(source: {
  component: string;
  path: string;
  text: string;
}): FeaturedComponentDefaults {
  const text = stripComments(source.text);
  const signature = new RegExp(
    `export\\s+function\\s+${source.component}\\s*\\(`,
  ).exec(text);
  if (signature === null) {
    throw new Error(
      `${source.path} exports no function ${source.component}, so the featured component's declared defaults cannot be read`,
    );
  }
  const afterParen = signature.index + signature[0].length;
  const rest = text.slice(afterParen);
  const lead = rest.length - rest.trimStart().length;
  if (rest.trimStart().startsWith('{') === false) {
    throw new Error(
      `${source.path} does not destructure ${source.component}'s props, so which parameters carry a canonical default cannot be read`,
    );
  }
  const open = afterParen + lead;
  const close = matchingBracket(text, open);
  if (close === -1) {
    throw new Error(
      `${source.path} leaves ${source.component}'s parameter pattern unterminated`,
    );
  }
  const members = patternMembers(text.slice(open + 1, close));
  if (members.length === 0) {
    throw new Error(
      `${source.path} declares no parameter for ${source.component}, so nothing carries a canonical default`,
    );
  }
  const configurableParameters: string[] = [];
  const declared = new Map<string, string>();
  for (const member of members) {
    const equals = member.indexOf('=');
    const name = (equals === -1 ? member : member.slice(0, equals)).trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name) === false) {
      throw new Error(
        `${source.path} declares ${source.component} parameter "${member}", which is not a plain named prop, so what it defaults cannot be read`,
      );
    }
    if (equals === -1) continue;
    configurableParameters.push(name);
    declared.set(name, member.slice(equals + 1).trim());
  }
  const seeds: Record<string, number> = {};
  for (const parameter of [PER_STEP_PARAMETER, EPISODE_LENGTH_PARAMETER]) {
    const expression = declared.get(parameter);
    if (expression === undefined) {
      throw new Error(
        `${source.path} declares no default for ${source.component}'s ${parameter}, so the shared model has no canonical value to predict from`,
      );
    }
    const value = resolveDeclaredNumber(expression, text);
    if (value === null) {
      throw new Error(
        `${source.path} defaults ${source.component}'s ${parameter} to "${expression}", which is not a number the shared model can be computed from`,
      );
    }
    seeds[parameter] = value;
  }
  return {
    configurableParameters,
    perStepFraction: seeds[PER_STEP_PARAMETER],
    steps: seeds[EPISODE_LENGTH_PARAMETER],
  };
}

/**
 * The props one mount is registered with, as name/value pairs.
 *
 * Scanned rather than matched, because a `=` inside a string or an
 * expression is not an attribute boundary. A spread throws: props that
 * cannot be enumerated cannot be reconciled against the component's
 * parameter list.
 */
export function registeredProps(props: string): Map<string, string> {
  const values = new Map<string, string>();
  let index = 0;
  while (index < props.length) {
    const char = props[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    // JSX self-closes the mount; the census keeps that punctuation verbatim.
    if (char === '/' || char === '>') break;
    if (char === '{') {
      throw new Error(
        `the registered props "${props.trim()}" spread an expression, so the props this mount is written with cannot be enumerated`,
      );
    }
    const name = /^[A-Za-z_$][\w$-]*/.exec(props.slice(index));
    if (name === null) {
      throw new Error(
        `the registered props "${props.trim()}" begin an attribute with "${char}"`,
      );
    }
    index += name[0].length;
    while (index < props.length && /\s/.test(props[index])) index += 1;
    if (props[index] !== '=') {
      values.set(name[0], '');
      continue;
    }
    index += 1;
    while (index < props.length && /\s/.test(props[index])) index += 1;
    const opener = props[index];
    if (opener === '"' || opener === "'") {
      const end = props.indexOf(opener, index + 1);
      if (end === -1) {
        throw new Error(
          `the registered props "${props.trim()}" leave ${name[0]} unterminated`,
        );
      }
      values.set(name[0], props.slice(index + 1, end));
      index = end + 1;
      continue;
    }
    if (opener === '{') {
      const end = matchingBracket(props, index);
      if (end === -1) {
        throw new Error(
          `the registered props "${props.trim()}" leave ${name[0]} unterminated`,
        );
      }
      values.set(name[0], props.slice(index + 1, end).trim());
      index = end + 1;
      continue;
    }
    throw new Error(
      `the registered props "${props.trim()}" give ${name[0]} a value beginning "${String(opener)}"`,
    );
  }
  return values;
}

/**
 * The state the shared model predicts one mount opens on: the component's
 * declared defaults, overridden by that mount's own registered props.
 *
 * Uniform. A mount that overrides a seed moves its own prediction and is
 * held to the moved one; it is never held to a weaker claim, and never to
 * none.
 */
export function mountModelInputs(
  registration: FeaturedMountRegistration,
  component: FeaturedComponentDefaults,
): { perStepPercent: number; steps: number } {
  const props = registeredProps(registration.props);
  const numeric = (parameter: string): number | null => {
    const raw = props.get(parameter);
    if (raw === undefined) return null;
    const value = Number(raw);
    if (Number.isFinite(value) === false) {
      throw new Error(
        `${registration.mountId} registers ${parameter}={${raw}}, which is not a number the shared model can be computed from`,
      );
    }
    return value;
  };
  const perStep = numeric(PER_STEP_PARAMETER) ?? component.perStepFraction;
  return {
    // The component's parameter is a probability and the control it seeds is
    // a percentage. The conversion is checked against the rendered control
    // on every mount, so a component that changed the unit fails loudly.
    perStepPercent: perStep * 100,
    steps: numeric(EPISODE_LENGTH_PARAMETER) ?? component.steps,
  };
}

/**
 * The module-page half of the `VAL-CROSS-015` pair, derived from the
 * interactive registry.
 *
 * Reported as the whole set of module-page mounts rather than as one picked
 * mount. The assertion's singular ("its module page") has no unique referent
 * in this tree: `interactive:ReliabilityCompounding` is registered on two
 * module pages, and no registry field names one of them as canonical. A
 * hand-picked pair would be an approval wearing a derivation's clothes, and
 * checking home against every module-page mount is strictly stronger than
 * checking it against any one of them, so the pair is widened rather than
 * chosen.
 */
export function modulePageMounts(
  registrations: readonly FeaturedMountRegistration[],
): FeaturedMountRegistration[] {
  return registrations.filter(({ ownerPath }) =>
    ownerPath.startsWith(MODULE_PAGE_OWNER_PREFIX),
  );
}

/**
 * The component elements enclosing a mount that are themselves interactive.
 *
 * "Interactive" is not spelled here and no container is named: the census
 * records, for every enclosing element, the control kinds that element's own
 * module declares, using the same derivation the interactive registry builds
 * its state cases from. A container that declares a slider or a discrete
 * option is one a reader operates; a layout wrapper declares neither. A
 * second pedagogical wrapper is therefore classified without an edit here,
 * and a mount cannot join or leave this set by changing a prop.
 */
export function interactiveContainers(
  registration: FeaturedMountRegistration,
): Array<{ component: string; sourcePath: string | null; controlKinds: readonly string[] }> {
  return registration.containers
    .filter(({ controlKinds }) => controlKinds.length > 0)
    .map(({ component, sourcePath, controlKinds }) => ({
      component,
      sourcePath,
      controlKinds,
    }));
}

/** One control read on home and on a module page, side by side. */
export type CrossContextControlComparison = {
  ordinal: number;
  homeControl: string;
  moduleControl: string;
  homeValue: number;
  moduleValue: number;
  agrees: boolean;
};

/** One readout read on home and on a module page, side by side. */
export type CrossContextReadoutComparison = {
  phase: 'initial' | 'reset' | 'second-reset' | 'driven';
  home: string;
  module: string;
  agrees: boolean;
};

/** The home/module-page comparison for one qualifying module-page mount. */
export type CrossContextPair = {
  mountId: string;
  route: string;
  ownerPath: string;
  readouts: CrossContextReadoutComparison[];
  initialControls: CrossContextControlComparison[];
  resetControls: CrossContextControlComparison[];
};

/** A measured mount the cross-context pair clause does not reach, and why. */
export type CrossContextExclusion = {
  mountId: string;
  route: string;
  ownerPath: string;
  /** The component elements enclosing it in the document, outermost first. */
  containerPath: string[];
  /** The structural fact that excludes it, in words. */
  reason: string;
  /** The clauses it is still decided by, so nothing goes unchecked. */
  stillBoundBy: string[];
};

/**
 * The cross-context comparison, written out so it can be read rather than
 * recomputed.
 *
 * `VAL-CROSS-015` is a claim about two contexts agreeing, and an artifact
 * that records each context separately leaves the reader to do the pairing.
 * This table puts home's observation and the module page's observation on
 * the same row. It is a rendering of observations the sweep already took,
 * never a substitute for them: `crossMountVerdicts` re-derives it from the
 * raw mounts and refuses an artifact whose table disagrees, so the table
 * cannot become a place to write an agreement that was not measured.
 */
export type CrossContextTable = {
  home: {
    mountId: string;
    route: string;
    initialReadout: string;
    resetReadout: string;
    secondResetReadout: string;
    drivenReadout: string;
    initialSliders: SliderObservation[];
    resetSliders: SliderObservation[];
  };
  pairs: CrossContextPair[];
  excluded: CrossContextExclusion[];
};

/** The clause ids a row can be decided by, named so evidence can cite them. */
export const CROSS_CONTEXT_CLAUSES = {
  canonicalHomeCopy: 'clause:home-features-the-canonical-copy',
  identicalResetState: 'clause:identical-initial-and-reset-state-across-contexts',
  sharedInputsSharedReadout: 'clause:equivalent-inputs-equivalent-readouts',
  sharedModel: 'clause:model-predicted-from-declared-defaults-and-own-props',
} as const;

function compareControls(
  home: readonly SliderObservation[],
  mount: readonly SliderObservation[],
): CrossContextControlComparison[] {
  const length = Math.max(home.length, mount.length);
  const rows: CrossContextControlComparison[] = [];
  for (let index = 0; index < length; index += 1) {
    const left = home[index];
    const right = mount[index];
    rows.push({
      ordinal: index + 1,
      homeControl: left ? left.accessibleName : '(no control)',
      moduleControl: right ? right.accessibleName : '(no control)',
      homeValue: left ? left.value : Number.NaN,
      moduleValue: right ? right.value : Number.NaN,
      agrees:
        left !== undefined &&
        right !== undefined &&
        Math.abs(left.value - right.value) <= SLIDER_VALUE_TOLERANCE,
    });
  }
  return rows;
}

function readoutRow(
  phase: CrossContextReadoutComparison['phase'],
  home: string,
  module: string,
): CrossContextReadoutComparison {
  return { phase, home, module, agrees: home === module };
}

/**
 * Builds the cross-context table from the raw observations and the registry.
 *
 * A module-page mount is compared with home unless a component element
 * encloses it that declares controls of its own. That is the only exclusion,
 * it is structural, and every excluded mount is named here with the element
 * path that excluded it and the clauses that still decide it.
 */
export function deriveCrossContextTable(
  evidence: HomeToolsEvidence,
  registrations: readonly FeaturedMountRegistration[],
): CrossContextTable {
  const home = evidence.featured;
  const byMountId = new Map(
    registrations.map((registration) => [registration.mountId, registration]),
  );
  const pairs: CrossContextPair[] = [];
  const excluded: CrossContextExclusion[] = [];
  for (const mount of evidence.siblingMounts) {
    const registration = byMountId.get(mount.mountId);
    if (!registration) continue;
    const containerPath = registration.containers.map(
      ({ component }) => component,
    );
    const onModulePage = registration.ownerPath.startsWith(
      MODULE_PAGE_OWNER_PREFIX,
    );
    const wrappers = interactiveContainers(registration);
    if (!onModulePage) {
      excluded.push({
        mountId: mount.mountId,
        route: mount.route,
        ownerPath: registration.ownerPath,
        containerPath,
        reason: `${registration.ownerPath} is a route module rather than a content module, so this mount is not a module-page context`,
        stillBoundBy: [
          CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout,
          CROSS_CONTEXT_CLAUSES.sharedModel,
        ],
      });
      continue;
    }
    if (wrappers.length > 0) {
      const inner = wrappers[wrappers.length - 1];
      excluded.push({
        mountId: mount.mountId,
        route: mount.route,
        ownerPath: registration.ownerPath,
        containerPath,
        reason: `the document nests this mount inside <${inner.component}> (${String(inner.sourcePath)}), whose own module declares ${inner.controlKinds.join(', ')} controls, so a reader meets it inside that exercise rather than as the module's own calculator`,
        stillBoundBy: [
          CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout,
          CROSS_CONTEXT_CLAUSES.sharedModel,
        ],
      });
      continue;
    }
    pairs.push({
      mountId: mount.mountId,
      route: mount.route,
      ownerPath: registration.ownerPath,
      readouts: [
        readoutRow('initial', home.initialReadout, mount.initialReadout),
        readoutRow('reset', home.resetReadout, mount.resetReadout),
        readoutRow(
          'second-reset',
          home.secondResetReadout,
          mount.secondResetReadout,
        ),
        readoutRow('driven', home.drivenReadout, mount.drivenReadout),
      ],
      initialControls: compareControls(
        home.initialSliders,
        mount.initialSliders,
      ),
      resetControls: compareControls(home.resetSliders, mount.resetSliders),
    });
  }
  return {
    home: {
      mountId: home.mountId,
      route: home.route,
      initialReadout: home.initialReadout,
      resetReadout: home.resetReadout,
      secondResetReadout: home.secondResetReadout,
      drivenReadout: home.drivenReadout,
      initialSliders: home.initialSliders,
      resetSliders: home.resetSliders,
    },
    pairs,
    excluded,
  };
}

/**
 * Decides `VAL-CROSS-015` over every registered mount of the featured
 * component.
 *
 * The criterion is one sentence with two halves. "The same control inputs
 * produce the same visible numeric readout changes on the home page and on
 * its module page" is a claim about behaviour under equal inputs, and its
 * stated Pass condition covers every mount. "The reset control restores the
 * identical initial state in both contexts" is a claim about two contexts
 * agreeing on one state, and it is written about a pair: *two* contexts,
 * *both* mounts. A model each mount is checked against separately can only
 * prove that a mount's own arithmetic is self-consistent; it cannot prove
 * that two contexts agree, and the round-4 reviewer was right that it never
 * did.
 *
 * Four clauses:
 *
 * 1. **The canonical featured copy.** Home's mount registers no override of
 *    a parameter the component gives a canonical default, so the copy a
 *    reader meets first is the component's own default render.
 * 2. **The identical cross-context reset state.** Every module-page mount
 *    the document does not nest inside another interactive component opens,
 *    resets, and resets again to *home's* rendered readout, with *home's*
 *    rendered control values — observation against observation, not each
 *    against its own model. This is the locked reset clause.
 * 3. **Equivalent inputs, equivalent readouts.** Every mount, the nested one
 *    included, driven to the shared control values reads what home reads and
 *    exposes the same controls. This is the criterion's stated Pass
 *    condition.
 * 4. **The shared model.** Every mount, the nested one included, opens and
 *    resets on what the component's declared defaults overridden by that
 *    mount's own registered props compound to. This is what keeps the quiz
 *    examined rather than merely excused.
 *
 * The clause-2 population is derived from the document's element tree, never
 * from a mount's attributes. `defaultSteps={14}` is the mount speaking about
 * itself and decides nothing here; being a child element of a component that
 * declares its own controls is a fact about the page, and a mount can change
 * it only by being moved, which changes what the page is. Every excluded
 * mount is named in the persisted evidence with the element path that
 * excluded it, and clauses 3 and 4 still decide it.
 */
export function crossMountVerdicts(
  evidence: HomeToolsEvidence,
  registrations: readonly FeaturedMountRegistration[],
  component: FeaturedComponentDefaults,
): Verdict[] {
  const home = evidence.featured;
  const byMountId = new Map(
    registrations.map((registration) => [registration.mountId, registration]),
  );
  if (byMountId.size !== registrations.length) {
    throw new Error(
      'the featured interactive registry names one mount twice, so a mount would be read against two registrations',
    );
  }
  const homeRegistration = byMountId.get(home.mountId);
  if (!homeRegistration) {
    throw new Error(
      `${home.mountId} is the measured home mount and the interactive registry does not contain it, so the home half of the VAL-CROSS-015 pair is unregistered`,
    );
  }
  const modulePages = modulePageMounts(registrations);
  if (modulePages.length === 0) {
    throw new Error(
      'the featured interactive is registered on no module page, so VAL-CROSS-015 pairs home with nothing',
    );
  }
  const measured = new Set(evidence.siblingMounts.map(({ mountId }) => mountId));
  const unmeasured = registrations
    .filter(({ mountId }) => mountId !== home.mountId && !measured.has(mountId))
    .map(({ mountId }) => mountId);
  if (unmeasured.length > 0) {
    throw new Error(
      `the interactive registry registers ${unmeasured.join(', ')}, which the measured population does not contain`,
    );
  }
  const unregistered = evidence.siblingMounts
    .filter(({ mountId }) => !byMountId.has(mountId))
    .map(({ mountId }) => mountId);
  if (unregistered.length > 0) {
    throw new Error(
      `the sweep measured ${unregistered.join(', ')}, which the interactive registry does not register`,
    );
  }
  const table = deriveCrossContextTable(evidence, registrations);
  if (table.pairs.length === 0) {
    throw new Error(
      'every module-page mount of the featured interactive is nested inside another interactive component, so the VAL-CROSS-015 reset clause would quantify over nothing',
    );
  }
  // The persisted table is a rendering of the raw observations, so a
  // hand-written agreement is refused rather than read.
  if (
    JSON.stringify(evidence.crossContext) !== JSON.stringify(table)
  ) {
    throw new Error(
      'the persisted cross-context table is not the one the measured mounts derive, so it states an agreement the sweep did not observe. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  const pairByMountId = new Map(table.pairs.map((pair) => [pair.mountId, pair]));
  const exclusionByMountId = new Map(
    table.excluded.map((row) => [row.mountId, row]),
  );
  // Home is a member of its own assertion, not the yardstick standing
  // outside it, so clauses 3 and 4 decide it too.
  const population: MountObservation[] = [home, ...evidence.siblingMounts];
  return population.map((mount) => {
    const failures: string[] = [];
    const clauses: string[] = [];
    const registration = byMountId.get(mount.mountId)!;
    const onModulePage = registration.ownerPath.startsWith(
      MODULE_PAGE_OWNER_PREFIX,
    );
    const overrides = [...registeredProps(registration.props).keys()].filter(
      (name) => component.configurableParameters.includes(name),
    );
    const predicted = mountModelInputs(registration, component);
    const predictedReadout = expectedEpisodeSuccessReadout(predicted);
    if (registration.route !== mount.route) {
      failures.push(
        `the interactive registry places ${mount.mountId} on ${registration.route}, where it was measured on ${mount.route}`,
      );
    }

    // Clause 1: the featured copy is the canonical one.
    if (mount.mountId === home.mountId) {
      clauses.push(CROSS_CONTEXT_CLAUSES.canonicalHomeCopy);
      if (overrides.length > 0) {
        failures.push(
          `home features ${mount.mountId} with ${overrides.join(', ')} overridden (${registration.props.trim()}), so the copy a reader meets first is not the component's canonical default`,
        );
      }
    }

    // Clause 2: this context and home's context open and reset identically.
    const pair = pairByMountId.get(mount.mountId);
    if (pair) {
      clauses.push(CROSS_CONTEXT_CLAUSES.identicalResetState);
      for (const readout of pair.readouts) {
        if (readout.phase === 'driven') continue;
        if (!readout.agrees) {
          failures.push(
            `${mount.mountId} ${readout.phase === 'initial' ? 'opens' : readout.phase === 'reset' ? 'resets to' : 'resets a second time to'} ${readout.module} on ${mount.route} where home ${readout.phase === 'initial' ? 'opens' : 'resets to'} ${readout.home}, so the two contexts do not restore the identical initial state`,
          );
        }
      }
      for (const [label, rows] of [
        ['opens', pair.initialControls],
        ['resets', pair.resetControls],
      ] as const) {
        for (const row of rows) {
          if (row.agrees) continue;
          failures.push(
            `${mount.mountId} ${label} control ${row.ordinal} ("${row.moduleControl}") at ${row.moduleValue} where home ${label} it ("${row.homeControl}") at ${row.homeValue}`,
          );
        }
      }
    }

    // Clause 3: identical control values produce an identical readout.
    clauses.push(CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout);
    const driven = seededInputs(mount.drivenSliders);
    if (driven === null) {
      failures.push(
        `${mount.mountId} exposes no identifiable per-step and episode-length controls when driven, so its readout cannot be compared with home\u2019s`,
      );
    } else if (
      driven.perStepPercent !== CROSS_MOUNT_INPUT.perStepPercent ||
      driven.steps !== CROSS_MOUNT_INPUT.steps
    ) {
      failures.push(
        `${mount.mountId} was driven to ${driven.perStepPercent}% per step over ${driven.steps} steps rather than the shared ${CROSS_MOUNT_INPUT.perStepPercent}% over ${CROSS_MOUNT_INPUT.steps}, so its readout was never compared on the same inputs`,
      );
    }
    if (mount.drivenReadout !== home.drivenReadout) {
      failures.push(
        `at ${CROSS_MOUNT_INPUT.perStepPercent}% per step over ${CROSS_MOUNT_INPUT.steps} steps ${mount.mountId} reads ${mount.drivenReadout} where home reads ${home.drivenReadout}`,
      );
    }
    if (mount.resetControlNames.length !== home.resetControlNames.length) {
      failures.push(
        `${mount.mountId} exposes ${mount.resetControlNames.length} reset control(s) where home exposes ${home.resetControlNames.length}`,
      );
    }
    if (mount.initialSliders.length !== home.initialSliders.length) {
      failures.push(
        `${mount.mountId} exposes ${mount.initialSliders.length} control(s) where home exposes ${home.initialSliders.length}`,
      );
    }

    // Clause 4: opening and reset state equal the model's prediction.
    clauses.push(CROSS_CONTEXT_CLAUSES.sharedModel);
    const opening = seededInputs(mount.initialSliders);
    if (opening === null) {
      failures.push(
        `${mount.mountId} exposes no identifiable per-step and episode-length controls, so its opening state cannot be compared with the model`,
      );
    } else if (
      Math.abs(opening.perStepPercent - predicted.perStepPercent) >
        SLIDER_VALUE_TOLERANCE ||
      opening.steps !== predicted.steps
    ) {
      failures.push(
        `${mount.mountId} opens at ${opening.perStepPercent}% per step over ${opening.steps} steps where its own registration and the component's declared defaults predict ${predicted.perStepPercent}% over ${predicted.steps}`,
      );
    }
    for (const [phase, readout] of [
      ['opens', mount.initialReadout],
      ['resets to', mount.resetReadout],
      ['resets a second time to', mount.secondResetReadout],
    ] as const) {
      if (readout !== predictedReadout) {
        failures.push(
          `${mount.mountId} ${phase} ${readout} where the shared model predicts ${predictedReadout} from its own ${predicted.perStepPercent}% per step over ${predicted.steps} steps`,
        );
      }
    }
    for (const [index, slider] of mount.resetSliders.entries()) {
      const initial = mount.initialSliders[index];
      if (initial && slider.value !== initial.value) {
        failures.push(
          `${mount.mountId} reset "${slider.accessibleName}" to ${slider.value} rather than ${initial.value}`,
        );
      }
    }
    const exclusion = exclusionByMountId.get(mount.mountId);
    return {
      id: mount.mountId,
      observed: {
        route: mount.route,
        // The derivation, on the row it decided: which document mounts this
        // instance, where in that document's element tree it sits, whether
        // that makes it the module-page half of the pair, the props it is
        // registered with, and which canonical defaults those props move.
        ownerPath: registration.ownerPath,
        isFeaturedHomeMount: mount.mountId === home.mountId,
        onModulePage,
        containerPath: registration.containers.map(
          ({ component: name }) => name,
        ),
        crossContextPaired: pair !== undefined,
        crossContextExclusionReason: exclusion?.reason ?? null,
        clauses,
        registeredProps: registration.props.trim(),
        configurationOverrides: overrides,
        initial: mount.initialReadout,
        reset: mount.resetReadout,
        secondReset: mount.secondResetReadout,
        driven: mount.drivenReadout,
        homeInitial: home.initialReadout,
        homeReset: home.resetReadout,
        homeSecondReset: home.secondResetReadout,
        homeDriven: home.drivenReadout,
        modelPredictedReadout: predictedReadout,
        modelInputs: predicted,
        revealedByControls: mount.revealedByControls,
      },
      failures,
    };
  });
}

/**
 * Decides `VAL-DESIGN-013` in the terms the assertion states: a truthful
 * preview bound to the shipped model, a registered textual alternative, and
 * the shared v2 instrument language rather than a marketing card.
 */
export function playgroundEntryVerdicts(
  evidence: HomeToolsEvidence,
  model: { description: string; numbers: readonly number[] },
): Verdict[] {
  const entry = evidence.playground;
  const named = entry.graphics.filter(
    (graphic) => graphic.role === 'img' && (graphic.ariaLabel ?? '') !== '',
  );
  const drawn = entry.graphics.filter(
    (graphic) =>
      graphic.shapeCount >= PLAYGROUND_PREVIEW_MIN_SHAPES ||
      (graphic.naturalWidth ?? 0) > 0,
  );

  const visualFailures: string[] = [];
  if (drawn.length === 0) {
    visualFailures.push(
      `the playground entry renders ${entry.graphics.length} graphic(s), none with ${PLAYGROUND_PREVIEW_MIN_SHAPES} shapes or a loaded image`,
    );
  }
  if (named.length === 0) {
    visualFailures.push(
      'the playground preview exposes no named graphic, so it reads as decoration',
    );
  }

  const alternativeFailures: string[] = [];
  if (entry.describedByText === null) {
    alternativeFailures.push(
      'the playground preview points at no textual alternative that resolves on the page',
    );
  } else if (entry.describedByText !== model.description) {
    alternativeFailures.push(
      `the playground preview describes itself as "${entry.describedByText}" rather than the sentence derived from the shipped model`,
    );
  }

  const bindingFailures: string[] = [];
  const modelNumbers = new Set(model.numbers.map((value) => Number(value)));
  const unsourced = entry.renderedNumbers.filter(
    (value) => !modelNumbers.has(value),
  );
  if (entry.renderedNumbers.length === 0) {
    bindingFailures.push(
      'the playground preview prints no value from the shipped model, so nothing binds it to the model',
    );
  }
  if (unsourced.length > 0) {
    bindingFailures.push(
      `the playground preview prints ${unsourced.join(', ')}, which the shipped model does not declare`,
    );
  }

  const languageFailures: string[] = [];
  if (entry.surfaceId === null) {
    languageFailures.push(
      'the playground preview stands on no registered surface',
    );
  }
  if (entry.textLength === 0) {
    languageFailures.push('the playground entry renders no text at all');
  }

  return [
    {
      id: 'anchor:playground-entry-visual',
      observed: {
        graphics: entry.graphics.map(({ tag, role, shapeCount }) => ({
          tag,
          role,
          shapeCount,
        })),
      },
      failures: visualFailures,
    },
    {
      id: 'anchor:playground-entry-textual-alternative',
      observed: { describedByText: entry.describedByText },
      failures: alternativeFailures,
    },
    {
      id: 'anchor:playground-entry-model-bound',
      observed: {
        renderedNumbers: entry.renderedNumbers,
        unsourced,
      },
      failures: bindingFailures,
    },
    {
      id: 'anchor:playground-entry-instrument-language',
      observed: {
        surfaceId: entry.surfaceId,
        background: entry.surfaceBackgroundColour,
      },
      failures: languageFailures,
    },
  ];
}

/** The widths every swept route must have been measured at. */
export function requiredSweepWidths(): number[] {
  return BRAND_V2_RESPONSIVE_VIEWPORTS.map(({ width }) => width).sort(
    (left, right) => left - right,
  );
}

/**
 * Decides `VAL-B2-SHELL-009` per public route.
 *
 * Every route carries the shell, so the shell claim is decided on all of
 * them rather than on one representative page; a route measured at fewer
 * than the declared widths fails for being unmeasured, which is the only way
 * a missing width can be distinguished from a passing one.
 */
export function responsiveOverflowVerdicts(
  evidence: HomeToolsEvidence,
  routes: ReadonlyArray<{ id: string; path: string }>,
): Verdict[] {
  if (routes.length === 0) {
    throw new Error(
      'the public route population is empty: VAL-B2-SHELL-009 would quantify over nothing',
    );
  }
  const widths = requiredSweepWidths();
  return routes.map(({ id, path }) => {
    const measurements = evidence.responsive.filter(
      (row) => row.routeId === id,
    );
    const failures: string[] = [];
    const measuredWidths = [...new Set(measurements.map(({ width }) => width))]
      .sort((left, right) => left - right);
    if (measuredWidths.join(',') !== widths.join(',')) {
      failures.push(
        `${path} was measured at [${measuredWidths.join(', ')}], not the declared [${widths.join(', ')}]`,
      );
    }
    for (const row of measurements) {
      if (row.documentScrollWidthPx > row.documentClientWidthPx) {
        failures.push(
          `${path} at ${row.viewportId} scrolls to ${row.documentScrollWidthPx}px inside a ${row.documentClientWidthPx}px viewport`,
        );
      }
      if (row.unclippedOverflow.length > 0) {
        const first = row.unclippedOverflow[0];
        failures.push(
          `${path} at ${row.viewportId} lays ${row.unclippedOverflow.length} element(s) past the viewport with no clipping ancestor, starting with <${first.tag}> at ${first.rightPx}px`,
        );
      }
    }
    return {
      id,
      observed: {
        route: path,
        widths: measuredWidths,
        scrollWidths: measurements.map(
          ({ viewportId, documentScrollWidthPx }) =>
            `${viewportId}:${documentScrollWidthPx}`,
        ),
      },
      failures,
    };
  });
}

/** Decides `VAL-DESIGN-014` and `VAL-ADJ-018` per accessibility profile. */
export function accessibilityProfileVerdicts(
  evidence: HomeToolsEvidence,
): Verdict[] {
  return evidence.accessibility.map((profile) => {
    const failures: string[] = [];
    if (profile.measuredMembers <= 0) {
      failures.push(
        `${profile.id} measured no member, so it decided nothing`,
      );
    }
    for (const violation of profile.violationIds) {
      failures.push(`${profile.id} reports the axe violation ${violation}`);
    }
    for (const error of profile.consoleErrors) {
      failures.push(`${profile.id} logged the console error ${error}`);
    }
    if (profile.documentScrollWidthPx > profile.documentClientWidthPx) {
      failures.push(
        `${profile.id} scrolls to ${profile.documentScrollWidthPx}px inside ${profile.documentClientWidthPx}px`,
      );
    }
    for (const failure of profile.failures) {
      failures.push(`${profile.id}: ${failure}`);
    }
    return {
      id: profile.id,
      observed: {
        route: profile.route,
        description: profile.description,
        measuredMembers: profile.measuredMembers,
      },
      failures,
    };
  });
}

/** Decides `VAL-DESIGN-015` per swept surface. */
export function progressCounterVerdicts(
  evidence: HomeToolsEvidence,
  routes: ReadonlyArray<{
    id: string;
    path: string;
    countExpectations: readonly SurfaceCountExpectation[];
  }>,
): Verdict[] {
  if (routes.length === 0) {
    throw new Error(
      'the progress-counter route population is empty: VAL-DESIGN-015 would quantify over nothing',
    );
  }
  const undeclared = routes.filter(
    ({ countExpectations }) => countExpectations.length === 0,
  );
  if (undeclared.length > 0) {
    throw new Error(
      `${undeclared.map(({ path }) => path).join(', ')} declare no counted-noun expectation, so any total they print would be checked against nothing`,
    );
  }
  return routes.map(({ id, path, countExpectations }) => {
    const observation = evidence.progressCounters.find(
      (row) => row.routeId === id,
    );
    const failures: string[] = [];
    if (!observation) {
      failures.push(`${path} was never swept for progress counters`);
      return { id, observed: { route: path }, failures };
    }
    for (const match of observation.matches) {
      failures.push(`${path} renders the progress counter "${match}"`);
    }
    // An empty reconciliation is not a clean one. Every swept surface prints
    // a registry total, so a surface that reconciled nothing means the
    // derivation stopped being able to express that total, and the loop
    // below then iterated no rows and reported a pass.
    if (observation.reconciledCounts.length === 0) {
      failures.push(
        `${path} reconciled no printed count against the registries${
          observation.unreconciledCounts.length > 0
            ? `, leaving "${observation.unreconciledCounts.join('", "')}" unchecked`
            : ''
        }`,
      );
    }
    // A printed count no expectation explains is an unchecked number on a
    // shipped page, whatever else on that page reconciled.
    for (const phrase of observation.unreconciledCounts) {
      failures.push(
        `${path} prints "${phrase}", which no declared expectation explains, so the number is unchecked`,
      );
    }
    const expectationById = new Map(
      countExpectations.map((expectation) => [expectation.memberId, expectation]),
    );
    for (const count of observation.reconciledCounts) {
      const expectation = expectationById.get(count.memberId);
      if (!expectation) {
        failures.push(
          `${path} reconciles "${count.text}" against "${count.memberId}", which this surface does not declare`,
        );
        continue;
      }
      if (count.expected !== expectation.expected) {
        failures.push(
          `${path} reconciled "${count.text}" against ${count.expected} where the registry holds ${expectation.expected} ${expectation.noun}`,
        );
      }
      if (count.expected !== count.actual) {
        failures.push(
          `${path} prints "${count.text}" where the registry holds ${count.expected}`,
        );
      }
    }
    // Required members are demanded one by one. A surface that prints two
    // registry totals is making two claims, and one of them reconciling
    // leaves the other one unmeasured.
    const reconciledMembers = new Set(
      observation.reconciledCounts.map(({ memberId }) => memberId),
    );
    for (const expectation of countExpectations) {
      if (expectation.required && !reconciledMembers.has(expectation.memberId)) {
        failures.push(
          `${path} prints no ${expectation.noun} count, so "${expectation.memberId}" (${expectation.expected}) went unmeasured`,
        );
      }
    }
    return {
      id,
      observed: {
        route: path,
        matches: observation.matches,
        reconciled: observation.reconciledCounts,
        unreconciled: observation.unreconciledCounts,
        requiredMembers: countExpectations
          .filter(({ required }) => required)
          .map(({ memberId }) => memberId),
      },
      failures,
    };
  });
}

/** Decides `VAL-EDU-027` per bound the assertion names. */
export function homeDesignBoundVerdicts(evidence: HomeToolsEvidence): Verdict[] {
  const bounds = evidence.designBounds;
  const summary = bounds.chartDisclosureSummary;

  const microFailures: string[] = [];
  if (bounds.microLabels.length > HOME_MAX_MICRO_LABELS) {
    microFailures.push(
      `home renders ${bounds.microLabels.length} uppercase micro-labels, over the ${HOME_MAX_MICRO_LABELS} bound: ${bounds.microLabels.map(({ text }) => text).join('; ')}`,
    );
  }

  const borderFailures: string[] = [];
  if (bounds.borderedBoxCount > HOME_MAX_BORDERED_BOXES) {
    borderFailures.push(
      `home renders ${bounds.borderedBoxCount} bordered boxes inside main, over the ${HOME_MAX_BORDERED_BOXES} bound`,
    );
  }

  const summaryFailures: string[] = [];
  if (!summary) {
    summaryFailures.push('home renders no chart data disclosure to measure');
  } else {
    if (summary.textTransform === 'uppercase') {
      summaryFailures.push(
        `the chart disclosure summary is uppercased, so it reads as a micro-label`,
      );
    }
    if (summary.borderTopWidthPx !== 0 || summary.borderBottomWidthPx !== 0) {
      summaryFailures.push(
        `the chart disclosure summary paints ${summary.borderTopWidthPx}px/${summary.borderBottomWidthPx}px top and bottom borders rather than 0px`,
      );
    }
    if (
      bounds.microLabels.some(({ text }) => text === summary.text.toUpperCase())
    ) {
      summaryFailures.push(
        'the chart disclosure summary was counted as an uppercase micro-label',
      );
    }
  }

  const axeFailures: string[] = [];
  for (const violation of bounds.axeViolationIds) {
    axeFailures.push(`home reports the axe violation ${violation}`);
  }
  for (const error of bounds.consoleErrors) {
    axeFailures.push(`home logged the console error ${error}`);
  }

  return [
    {
      id: 'bound:home-micro-labels',
      observed: { microLabels: bounds.microLabels },
      failures: microFailures,
    },
    {
      id: 'bound:home-bordered-boxes',
      observed: { borderedBoxCount: bounds.borderedBoxCount },
      failures: borderFailures,
    },
    {
      id: 'bound:home-chart-disclosure-summary',
      observed: { summary },
      failures: summaryFailures,
    },
    {
      id: 'bound:home-zero-axe-and-console',
      observed: {
        axeViolationIds: bounds.axeViolationIds,
        consoleErrors: bounds.consoleErrors,
      },
      failures: axeFailures,
    },
  ];
}
