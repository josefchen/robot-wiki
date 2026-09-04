import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
   * being confused with "reachable immediately".
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

export type ProgressCounterObservation = {
  routeId: string;
  route: string;
  matches: string[];
  /** Registry-derived counts the route printed, with their sourced values. */
  reconciledCounts: Array<{ text: string; expected: number; actual: number }>;
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
 * Every tracked file whose bytes can change what this sweep measured: the
 * page that mounts the tools, the instrument itself, the surface primitive
 * the preview stands on, the derivation and the model behind the preview,
 * the registered textual alternatives, the stylesheet that owns the tokens,
 * and the shell that wraps every swept route.
 */
export const HOME_TOOLS_SOURCE_PATHS = [
  'app/globals.css',
  'app/layout.tsx',
  'app/page.tsx',
  'components/home/so101-chain-preview.tsx',
  'components/interactive/reliability-compounding.tsx',
  'components/ui/chart-description.tsx',
  'components/ui/surface.tsx',
  'lib/chart-descriptions.ts',
  'lib/so101-kinematics.ts',
  'public/models/so101/so101.urdf',
] as const;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of every source above plus the swept route set. Editing the page,
 * the model, or the route registry without re-running the sweep is then a
 * stale-evidence failure rather than a silently preserved green row.
 */
export function homeToolsEvidenceFingerprint(input: {
  root: string;
  routeIds: readonly string[];
}): string {
  const parts = [...HOME_TOOLS_SOURCE_PATHS].sort().map(
    (path) => `${path}:${sha256(readFileSync(join(input.root, path), 'utf8'))}`,
  );
  return sha256([...parts, [...input.routeIds].sort().join(',')].join('\n'));
}

export function readHomeToolsEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): HomeToolsEvidence {
  const artifact = input.artifact as Partial<HomeToolsEvidence>;
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('home tools evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error(
      `home tools evidence version ${String(artifact.version)} is not 1`,
    );
  }
  if (artifact.fingerprint !== input.fingerprint) {
    throw new Error(
      'home tools evidence is stale: a home tool source, the shipped model, or the public route set changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
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
  if (!artifact.featured || typeof artifact.featured !== 'object') {
    throw new Error(
      'home tools evidence discovered no featured instrument, so VAL-NAV-006 was never measured',
    );
  }
  if ((artifact.siblingMounts ?? []).length === 0) {
    throw new Error(
      'home tools evidence discovered no sibling mount of the featured instrument: VAL-CROSS-015 would quantify over nothing',
    );
  }
  if ((artifact.playground ?? { graphics: [] }).graphics.length === 0) {
    throw new Error(
      'home tools evidence found no graphic in the playground entry point, so VAL-DESIGN-013 was never measured',
    );
  }
  if ((artifact.responsive ?? []).length === 0) {
    throw new Error(
      'home tools evidence recorded no responsive measurement: VAL-B2-SHELL-009 would quantify over nothing',
    );
  }
  if ((artifact.accessibility ?? []).length === 0) {
    throw new Error(
      'home tools evidence recorded no accessibility profile, so VAL-DESIGN-014 was never measured',
    );
  }
  if ((artifact.progressCounters ?? []).length === 0) {
    throw new Error(
      'home tools evidence swept no route for progress counters: VAL-DESIGN-015 would quantify over nothing',
    );
  }
  return artifact as HomeToolsEvidence;
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
      },
      failures: telemetryFailures,
    },
  ];
}

/**
 * Decides `VAL-CROSS-015` per sibling mount of the featured component.
 *
 * The population is every other registered mount of the same source, so a
 * mount that drifts is a failing member rather than a comparison nobody
 * made. Parity is asserted on the readout for equal slider values, not on
 * equal key presses: the mounts declare different ranges, and equal presses
 * on different ranges are not the same input.
 */
export function crossMountVerdicts(evidence: HomeToolsEvidence): Verdict[] {
  const home = evidence.featured;
  return evidence.siblingMounts.map((mount) => {
    const failures: string[] = [];
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
  routes: ReadonlyArray<{ id: string; path: string }>,
): Verdict[] {
  if (routes.length === 0) {
    throw new Error(
      'the progress-counter route population is empty: VAL-DESIGN-015 would quantify over nothing',
    );
  }
  return routes.map(({ id, path }) => {
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
    for (const count of observation.reconciledCounts) {
      if (count.expected !== count.actual) {
        failures.push(
          `${path} prints "${count.text}" where the registry holds ${count.expected}`,
        );
      }
    }
    return {
      id,
      observed: {
        route: path,
        matches: observation.matches,
        reconciled: observation.reconciledCounts,
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
