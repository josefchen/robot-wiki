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
};

/** Content modules are the module pages; `app/` owns the routes around them. */
const MODULE_PAGE_OWNER_PREFIX = 'content/';

/**
 * Whether a registered mount seeds the instrument itself rather than
 * inheriting the component's own default state.
 *
 * A `default*` prop in the registration is the whole of it. This is a fact
 * about the registration, not about the render: a mount that passes no
 * default opens on the same state every other such mount opens on, which is
 * what makes "opens like home" a derivable claim rather than an approval.
 */
export function registersOwnDefaultState(props: string): boolean {
  return /(?:^|\s)default[A-Z]\w*=/.test(props);
}

/**
 * The home/module-page pairing `VAL-CROSS-015` quantifies over, derived from
 * the interactive registry.
 *
 * Reported as the whole set of module-page mounts rather than as one picked
 * mount. The assertion's singular ("its module page") has no unique referent
 * in this tree: `interactive:ReliabilityCompounding` is registered on two
 * module pages, and no registry field names one of them as canonical. A
 * hand-picked pair would be an approval wearing a derivation's clothes, and
 * checking home against every module-page mount is strictly stronger than
 * checking it against any one of them, so the pair is widened rather than
 * chosen. See the note on `crossMountVerdicts` for the registry field that
 * would make the singular derivable.
 */
export function modulePageMounts(
  registrations: readonly FeaturedMountRegistration[],
): FeaturedMountRegistration[] {
  return registrations.filter(({ ownerPath }) =>
    ownerPath.startsWith(MODULE_PAGE_OWNER_PREFIX),
  );
}

/**
 * Decides `VAL-CROSS-015` per registered mount of the featured component.
 *
 * The assertion pairs home with the interactive's module page, and the
 * pairing is derived here from the interactive registry: home is the mount
 * whose owner is the home route's own module, and a module-page mount is one
 * whose owner is a content module. Both halves are registered facts. What
 * they cannot supply is the assertion's singular: this interactive is
 * mounted on two module pages, and nothing in the registry says which is
 * "its" one, so the pair is widened to every module-page mount rather than
 * picked. A `canonicalRoute` (or equivalent) field on the interactive source
 * row would make the singular derivable; until one exists this row is honest
 * about being the stronger claim rather than the stated one.
 *
 * Three things are asserted, and they are kept apart because conflating them
 * is what produced the exemption this replaced:
 *
 * - **The model.** Every mount, with no exception of any kind, must open
 *   printing what the shared model predicts from its own recorded inputs.
 *   The commit-to-reveal quiz seeded to 95% over 14 steps is held to this
 *   exactly as home is; being seeded differently is not being excused.
 * - **The behaviour.** Every mount driven to the same slider values must
 *   read what home reads, must reset to its own initial state twice over,
 *   and must expose the same controls. This is what "behaves identically"
 *   says, and it is genuinely justified across all mounts of one component.
 * - **The configuration.** A mount whose registration declares no `default*`
 *   prop inherits the component's one default state, so it must open exactly
 *   where home opens. A mount whose registration declares one must not:
 *   opening where home opens would mean the registered seed does nothing.
 *
 * The reading this replaces asserted configuration parity over every mount
 * and then exempted the seeded quiz through
 * `contract/brand-v2-seeded-mount-registry.json`, a checked-in approval
 * granting one mount an exception to a locked criterion. Nothing grants an
 * exception now: the quiz's seed is read off its own registration, which is
 * generated from the document that mounts it.
 */
export function crossMountVerdicts(
  evidence: HomeToolsEvidence,
  registrations: readonly FeaturedMountRegistration[],
): Verdict[] {
  const home = evidence.featured;
  const homeInputs = seededInputs(home.initialSliders);
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
  // A mount that inherits the component default is what home's own initial
  // state is compared against. If every sibling seeds itself, nothing is
  // left to compare, and that is a failure rather than a silent pass.
  const inheritingSiblings = evidence.siblingMounts.filter(
    (mount) => !registersOwnDefaultState(byMountId.get(mount.mountId)!.props),
  );
  const homeInherits = !registersOwnDefaultState(homeRegistration.props);
  return evidence.siblingMounts.map((mount) => {
    const failures: string[] = [];
    const registration = byMountId.get(mount.mountId)!;
    const seedsItself = registersOwnDefaultState(registration.props);
    const onModulePage = registration.ownerPath.startsWith(
      MODULE_PAGE_OWNER_PREFIX,
    );
    const mountInputs = seededInputs(mount.initialSliders);
    if (registration.route !== mount.route) {
      failures.push(
        `the interactive registry places ${mount.mountId} on ${registration.route}, where it was measured on ${mount.route}`,
      );
    }
    if (inheritingSiblings.length === 0) {
      failures.push(
        'every registered sibling of the featured instrument seeds its own default state, so no mount is left to compare home\u2019s initial state against',
      );
    }
    if (mountInputs === null) {
      failures.push(
        `${mount.mountId} exposes no identifiable per-step and episode-length controls, so its initial state cannot be compared`,
      );
    } else if (mount.initialReadout !== expectedEpisodeSuccessReadout(mountInputs)) {
      failures.push(
        `${mount.mountId} opens reading ${mount.initialReadout} where the shared model predicts ${expectedEpisodeSuccessReadout(mountInputs)} for its own ${mountInputs.perStepPercent}% per step over ${mountInputs.steps} steps`,
      );
    }
    if (mountInputs !== null && homeInputs === null) {
      failures.push(
        'home exposes no identifiable per-step and episode-length controls, so no mount can be compared against it',
      );
    } else if (mountInputs !== null && homeInputs !== null) {
      const opensLikeHome =
        mountInputs.perStepPercent === homeInputs.perStepPercent &&
        mountInputs.steps === homeInputs.steps;
      if (!seedsItself && !homeInherits) {
        failures.push(
          `${mount.mountId} inherits the component default state while home is registered with one of its own (${homeRegistration.props.trim()}), so home is not the reading of that default to compare it against`,
        );
      } else if (!seedsItself && !opensLikeHome) {
        failures.push(
          `${mount.mountId} registers no default state of its own and opens at ${mountInputs.perStepPercent}% per step over ${mountInputs.steps} steps where home opens at ${homeInputs.perStepPercent}% over ${homeInputs.steps}`,
        );
      } else if (!seedsItself && mount.initialReadout !== home.initialReadout) {
        failures.push(
          `${mount.mountId} registers no default state of its own and opens reading ${mount.initialReadout} where home opens reading ${home.initialReadout}`,
        );
      } else if (seedsItself && opensLikeHome) {
        failures.push(
          `${mount.mountId} is registered with its own default state (${registration.props.trim()}) and opens exactly where home opens, so the registered seed changes nothing the reader meets`,
        );
      }
    }
    if (mount.drivenReadout !== home.drivenReadout) {
      failures.push(
        `at ${CROSS_MOUNT_INPUT.perStepPercent}% per step over ${CROSS_MOUNT_INPUT.steps} steps ${mount.mountId} reads ${mount.drivenReadout} where home reads ${home.drivenReadout}`,
      );
    }
    if (mount.resetReadout !== mount.initialReadout) {
      failures.push(
        `${mount.mountId} reset to ${mount.resetReadout} rather than its own initial ${mount.initialReadout}`,
      );
    }
    if (mount.secondResetReadout !== mount.initialReadout) {
      failures.push(
        `${mount.mountId} is not deterministic under a second reset (${mount.secondResetReadout})`,
      );
    }
    for (const [index, slider] of mount.resetSliders.entries()) {
      const initial = mount.initialSliders[index];
      if (initial && slider.value !== initial.value) {
        failures.push(
          `${mount.mountId} reset "${slider.accessibleName}" to ${slider.value} rather than ${initial.value}`,
        );
      }
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
    return {
      id: mount.mountId,
      observed: {
        route: mount.route,
        driven: mount.drivenReadout,
        homeDriven: home.drivenReadout,
        initial: mount.initialReadout,
        homeInitial: home.initialReadout,
        modelPredictedInitial:
          mountInputs === null
            ? null
            : expectedEpisodeSuccessReadout(mountInputs),
        // The derivation, on the row it decided: which document mounts this
        // instance, whether that makes it the module-page half of the pair,
        // and whether its registration seeds it or leaves it inheriting the
        // component default. Nothing here is an approval; all three are read
        // off the generated interactive registry.
        ownerPath: registration.ownerPath,
        pairedWithHomeAsModulePage: onModulePage,
        registeredProps: registration.props.trim(),
        registersOwnDefaultState: seedsItself,
        initialStateComparedToHome: !seedsItself,
        revealedByControls: mount.revealedByControls,
        reset: mount.resetReadout,
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
