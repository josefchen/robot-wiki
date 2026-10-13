import { z } from 'zod';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  SHIPPED_GEOMETRY_MODEL_CLASS,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';
import { BRAND_V2_RESPONSIVE_VIEWPORTS } from './brand-v2-responsive-viewports.ts';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';

/**
 * Evidence for home's featured scene, its tools line, and its
 * responsive/accessible convergence, and the fail-closed readers that decide
 * whether that evidence may grant a result. The featured scene is a 3D
 * explainer from /how-robots-work/ (the owner's front-page decision of 13
 * October 2026), on its poster until the reader starts it.
 *
 * The assertions here (`VAL-NAV-006`, `VAL-NAV-007`, `VAL-CROSS-015`,
 * `VAL-DESIGN-004`, `VAL-DESIGN-013`, `VAL-DESIGN-014`, `VAL-DESIGN-015`,
 * `VAL-EDU-027`, `VAL-OPUS-017`, `VAL-OPUS-020`, `VAL-ADJ-018` and
 * `VAL-B2-SHELL-009`) are all claims about a rendered document under a
 * stated viewport and a stated interaction. None of them is decidable from
 * source: whether a scene waits for its start control, whether stepping it
 * moves its readout, whether the home copy and the explainer's own page
 * agree, whether a stage begins above 1200px, and whether any width overflows are
 * facts about what a browser laid out after it ran the page's own
 * JavaScript.
 *
 * The measurement is therefore a browser sweep of the built export
 * (`tests/e2e/brand-v2-home-tools.spec.ts`), persisted here. Every reader
 * below throws rather than degrade: a stale fingerprint, a missing scene, an
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

/** `VAL-DESIGN-004`: the featured scene's stage begins no lower than this. */
export const FEATURED_INSTRUMENT_MAX_TOP_PX = 1200;
/** `VAL-EDU-027`: at most this many uppercase micro-labels inside main. */
export const HOME_MAX_MICRO_LABELS = 5;
/** `VAL-EDU-027` / `VAL-DESIGN-005`: at most this many bordered boxes. */
export const HOME_MAX_BORDERED_BOXES = 6;

/**
 * The controls the sweep presses Enter on, in order, once the featured
 * explainer is live, on home and on the explainer's own page alike: Next
 * three times (the second press answers step 2's guess without one, which
 * prints the motor tally), Next to step 4, then Back. Each reading is taken
 * after the step has set its readout and step text, so both contexts are
 * read at the same stills; step 5's motor count, which ticks on a timer, is
 * never read.
 */
export const SCENE_KEY_SCRIPT = ['Next', 'Next', 'Next', 'Next', 'Back'] as const;

/** One still the key script put the scene in, and what the page printed there. */
export type SceneStepObservation = {
  key: string;
  readout: string;
  /** The explainer's step text, the caption of the step on screen. */
  caption: string;
};

export type SceneObservation = {
  /** The explainer catalog id the sweep read. */
  sceneId: string;
  route: string;
  /** Scenes the page's main renders (explainers and motion scenes); home has to render exactly one. */
  sceneCount: number;
  frameRole: string | null;
  frameAriaLabel: string | null;
  /** The text the frame's `aria-describedby` resolves to. */
  describedByText: string | null;
  /** The live stage graphic's tag, so a raster still cannot pass as the scene. */
  graphicTag: string | null;
  /** Document-top offset of the stage. */
  graphicTopPx: number;
  graphicHeightPx: number;
  /** The poster the stage shows at first paint, by its source. */
  posterSrc: string | null;
  /** Painted poster images at first paint (decoded, boxed, visible); none is a blank stage. */
  posterMarkCount: number;
  /** The step text printed beside the poster at first paint. */
  posterCaption: string;
  /** Whether a canvas or the 3D kit (three.js) reached the page before the reader started the scene. */
  playerMountedAtFirstPaint: boolean;
  /** Animation frames the page requested, the stage in view, while nobody had touched it. */
  idleFrameRequests: number;
  /** Animation frames it requested over the same window after the start control. */
  playingFrameRequests: number;
  /** Enabled controls inside the frame at first paint, by accessible name. */
  posterControls: string[];
  /** The control that starts the scene, by accessible name; null where the scene starts on its own. */
  startControl: string | null;
  /** Focus ring on the start control while the keyboard holds it. */
  focusOutlineWidthPx: number | null;
  focusOutlineStyle: string | null;
  focusOutlineColour: string | null;
  /** The still the live scene opens on: its readout and step text. */
  openingReadout: string;
  openingCaption: string;
  /** The stills `SCENE_KEY_SCRIPT` produced, in order. */
  steps: SceneStepObservation[];
  resetControlNames: string[];
  /** Readout and step text after the reset control, activated by keyboard. */
  resetReadout: string;
  resetCaption: string;
  /** Readout after stepping away and resetting a second time. */
  secondResetReadout: string;
  /** The viewer and scene module the owning document drives the stage with, read from source. */
  componentModule: string | null;
};

export type FeaturedSceneObservation = SceneObservation & {
  /** The scene's name and caption, the claim the reader meets above the stage. */
  claimText: string;
};

export type ToolsLineObservation = {
  /** The row's links in document order, as paths. */
  links: Array<{ text: string; path: string; topPx: number }>;
  /** Every graphic in the row's subtree, by tag. */
  graphics: string[];
  /** Numbers the row prints; a line of links has no telemetry to show. */
  renderedNumbers: number[];
  /** Descendants with a border on all four sides, which is a card. */
  boxedDescendants: number;
  text: string;
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

export type ChartDisclosureSummaryObservation = {
  text: string;
  textTransform: string;
  letterSpacing: string;
  fontSizePx: number;
  borderTopWidthPx: number;
  borderBottomWidthPx: number;
};

export type HomeDesignBoundsObservation = {
  microLabels: Array<{
    text: string;
    fontSizePx: number;
    family: string;
    tag: string;
    role: string | null;
  }>;
  borderedBoxCount: number;
  axeViolationIds: string[];
  consoleErrors: string[];
  /**
   * Every chart data disclosure summary inside main. `VAL-EDU-027` bounds
   * the summary of the chart home mounts; since the featured figure became
   * a scene home mounts no chart, and a chart added later is measured here
   * rather than excused by a field that could only hold one.
   */
  chartDisclosureSummaries: ChartDisclosureSummaryObservation[];
};

export type HomeToolsEvidence = {
  version: 2;
  fingerprint: string;
  route: string;
  viewport: string;
  featured: FeaturedSceneObservation;
  /**
   * The same scene read on the article the scene registry assigns it to,
   * with the same keys, so `VAL-CROSS-015` compares two observations rather
   * than one observation and a model.
   */
  moduleScene: SceneObservation;
  toolsLine: ToolsLineObservation;
  responsive: RouteWidthObservation[];
  accessibility: AccessibilityProfileObservation[];
  progressCounters: ProgressCounterObservation[];
  designBounds: HomeDesignBoundsObservation;
};

/**
 * The kinds of rendering input this sweep depends on that no module imports.
 *
 * The closure below reaches every public route, the playground among them,
 * so the shipped kinematic model is still an input: an overflow the
 * playground grows from a new model has to invalidate the responsive rows.
 * Since the site-foundation re-skin of 2026-10-10 the pages load their
 * faces through `next/font/google`, so no route names a font binary and the
 * web font class is no longer declared.
 */
const HOME_TOOLS_NON_IMPORT_CLASSES = [SHIPPED_GEOMETRY_MODEL_CLASS] as const;

/**
 * The entry points this evidence is about.
 *
 * `VAL-B2-SHELL-009` measures document overflow on every public route at
 * four widths, so its closure is every route entry, not the home page.
 * Route ids stay in the fingerprint as a fact, because a route leaving the
 * registry has to invalidate the artifact even though no file changed.
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
 * module imports, and the swept route set.
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
const sceneObservationShape = {
  sceneId: z.string(),
  route: z.string(),
  sceneCount: z.number(),
  frameRole: z.string().nullable(),
  frameAriaLabel: z.string().nullable(),
  describedByText: z.string().nullable(),
  graphicTag: z.string().nullable(),
  graphicTopPx: z.number(),
  graphicHeightPx: z.number(),
  posterSrc: z.string().nullable(),
  posterMarkCount: z.number(),
  posterCaption: z.string(),
  playerMountedAtFirstPaint: z.boolean(),
  idleFrameRequests: z.number(),
  playingFrameRequests: z.number(),
  posterControls: z.array(z.string()),
  startControl: z.string().nullable(),
  focusOutlineWidthPx: z.number().nullable(),
  focusOutlineStyle: z.string().nullable(),
  focusOutlineColour: z.string().nullable(),
  openingReadout: z.string(),
  openingCaption: z.string(),
  steps: z.array(
    z.object({ key: z.string(), readout: z.string(), caption: z.string() }),
  ),
  resetControlNames: z.array(z.string()),
  resetReadout: z.string(),
  resetCaption: z.string(),
  secondResetReadout: z.string(),
  componentModule: z.string().nullable(),
};

/** The complete nested shape of the persisted home tools sweep. */
export const homeToolsEvidenceSchema = z.object({
  version: z.literal(2),
  fingerprint: z.string(),
  route: z.string(),
  viewport: z.string(),
  featured: z.object({ ...sceneObservationShape, claimText: z.string() }),
  moduleScene: z.object(sceneObservationShape),
  toolsLine: z.object({
    links: z.array(
      z.object({ text: z.string(), path: z.string(), topPx: z.number() }),
    ),
    graphics: z.array(z.string()),
    renderedNumbers: z.array(z.number()),
    boxedDescendants: z.number(),
    text: z.string(),
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
        z.object({ tag: z.string(), id: z.string(), rightPx: z.number() }),
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
        tag: z.string(),
        role: z.string().nullable(),
      }),
    ),
    borderedBoxCount: z.number(),
    axeViolationIds: z.array(z.string()),
    consoleErrors: z.array(z.string()),
    chartDisclosureSummaries: z.array(
      z.object({
        text: z.string(),
        textTransform: z.string(),
        letterSpacing: z.string(),
        fontSizePx: z.number(),
        borderTopWidthPx: z.number(),
        borderBottomWidthPx: z.number(),
      }),
    ),
  }),
});

/**
 * The page the explainer catalog serves an explainer on, opened at it, or
 * null for an id the catalog does not list.
 */
export function sceneCanonicalRoute(sceneId: string): string | null {
  return EXPLAINER_ORDER.some(({ id }) => id === sceneId)
    ? `/how-robots-work/#${sceneId}`
    : null;
}
function assertKeyScript(scene: SceneObservation, label: string): void {
  const keys = scene.steps.map(({ key }) => key).join(',');
  if (keys !== SCENE_KEY_SCRIPT.join(',')) {
    throw new Error(
      `home tools evidence read ${label} at [${keys}], not the declared key script [${SCENE_KEY_SCRIPT.join(', ')}], so its stills cannot be compared. Re-run npm run refresh:brand-v2-evidence.`,
    );
  }
}

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
  if (version !== 2) {
    throw new Error(`home tools evidence version ${String(version)} is not 2`);
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
  if (artifact.featured.sceneId.length === 0) {
    throw new Error(
      'home tools evidence found no featured scene on home: VAL-DESIGN-004 would quantify over nothing',
    );
  }
  const canonical = sceneCanonicalRoute(artifact.featured.sceneId);
  if (canonical === null) {
    throw new Error(
      `home features ${artifact.featured.sceneId}, which the explainer catalog does not list, so it has no page to be compared with`,
    );
  }
  if (
    artifact.moduleScene.sceneId !== artifact.featured.sceneId ||
    artifact.moduleScene.route !== canonical
  ) {
    throw new Error(
      `home tools evidence compares home with ${artifact.moduleScene.sceneId} on ${artifact.moduleScene.route}, not ${artifact.featured.sceneId} on its own page ${canonical}: VAL-CROSS-015 would compare the wrong pair`,
    );
  }
  assertKeyScript(artifact.featured, 'the home scene');
  assertKeyScript(artifact.moduleScene, `the scene on ${canonical}`);
  if (artifact.toolsLine.links.length === 0) {
    throw new Error(
      'home tools evidence found no link in the tools line, so VAL-DESIGN-013 was never measured',
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
 * An independent model of what one scene may print: given a readout (or the
 * caption the page states its claim in), the failure it amounts to, or null.
 */
export type SceneReadoutModel = (text: string) => string | null;

const NUMBER = /(?<![A-Za-z\d.])\d+(?:\.\d+)?(?![A-Za-z\d])/g;

/** The numbers a readout prints, as numbers, in order; a model name such as G1 prints none. */
export function readoutNumbers(text: string): number[] {
  return [...text.matchAll(NUMBER)].map(([value]) => Number(value));
}

/**
 * The Unitree G1 figures the humanoid explainer states, as Unitree's G1
 * spec page (unitree.com/g1) gives them for the standard robot: 23 joint
 * motors (6 per leg, 5 per arm, 1 at the waist, none in the standard hands),
 * 7 per optional three-finger hand, up to 43 with every option; 1.32 m
 * standing, about 35 kg with its battery, about 2 kg per arm, about 2 hours
 * per charge. Typed here from that page rather than read from the scene, so
 * the scene's readouts are checked against something they did not write.
 */
export const UNITREE_G1_SPEC = {
  legMotors: 12,
  armMotors: 10,
  waistMotors: 1,
  motors: 23,
  threeFingerHandMotors: 14,
  maxMotors: 43,
  heightM: 1.32,
  massKg: 35,
  armPayloadKg: 2,
  batteryHours: 2,
} as const;

const G1_MOTOR_COUNTS: ReadonlySet<number> = new Set([
  UNITREE_G1_SPEC.legMotors,
  UNITREE_G1_SPEC.armMotors,
  UNITREE_G1_SPEC.waistMotors,
  UNITREE_G1_SPEC.motors,
  UNITREE_G1_SPEC.threeFingerHandMotors,
  UNITREE_G1_SPEC.maxMotors,
]);

/**
 * The models the featured-scene telemetry is checked against, by scene id.
 * A scene featured without an entry fails the telemetry anchor instead of
 * passing unexamined.
 */
export const FEATURED_SCENE_MODELS: Readonly<Record<string, SceneReadoutModel>> = {
  // Every quantity is read with its unit and held to the spec page; a bare
  // number is a motor count and has to be one the spec gives; a tally has
  // to add up; a running count never passes the total.
  humanoid: (text) => {
    const g1 = UNITREE_G1_SPEC;
    const checks: Array<[RegExp, readonly number[], string]> = [
      [/(\d+(?:\.\d+)?)\s*metres?\b/g, [g1.heightM], 'height in metres'],
      [/(\d+(?:\.\d+)?)\s*kilograms?\b/g, [g1.massKg, g1.armPayloadKg], 'mass in kilograms'],
      [/(\d+(?:\.\d+)?)\s*hours?\b/g, [g1.batteryHours], 'battery hours'],
    ];
    let rest = text;
    for (const [pattern, allowed, quantity] of checks) {
      for (const [, value] of text.matchAll(pattern)) {
        if (!allowed.includes(Number(value))) {
          return `"${text}" prints ${value} as a ${quantity}, where the G1 spec gives ${allowed.join(' or ')}`;
        }
      }
      rest = rest.replace(pattern, ' ');
    }
    const tally = /legs\s+(\d+),\s+arms\s+(\d+),\s+waist\s+(\d+)\.\s+That is all\s+(\d+)/.exec(text);
    if (tally) {
      const [legs, arms, waist, total] = tally.slice(1).map(Number);
      if (legs !== g1.legMotors || arms !== g1.armMotors || waist !== g1.waistMotors || total !== g1.motors) {
        return `"${text}" tallies legs ${legs}, arms ${arms}, waist ${waist} and ${total} in all, where the G1 spec gives ${g1.legMotors}, ${g1.armMotors}, ${g1.waistMotors} and ${g1.motors}`;
      }
      if (legs + arms + waist !== total) {
        return `"${text}" tallies ${legs} + ${arms} + ${waist}, which is not the ${total} it states`;
      }
    }
    const running = /^Motors:\s+(\d+)$/.exec(text.trim());
    if (running && Number(running[1]) > g1.motors) {
      return `"${text}" counts past the ${g1.motors} motors of the standard G1`;
    }
    for (const value of readoutNumbers(rest)) {
      if (running) break;
      if (!G1_MOTOR_COUNTS.has(value)) {
        return `"${text}" prints ${value}, which is no motor count the G1 spec gives`;
      }
    }
    return null;
  },
};

/** Every readout a scene observation recorded, labelled by the state. */
function recordedReadouts(
  scene: SceneObservation,
): Array<{ state: string; readout: string }> {
  return [
    { state: 'opening', readout: scene.openingReadout },
    ...scene.steps.map(({ key, readout }, index) => ({
      state: `step ${index + 1} (${key})`,
      readout,
    })),
    { state: 'reset', readout: scene.resetReadout },
    { state: 'second reset', readout: scene.secondResetReadout },
  ];
}

/**
 * The anchors `VAL-NAV-006`, `VAL-NAV-007`, `VAL-DESIGN-004` and
 * `VAL-OPUS-017` decompose into on the featured scene. Declared rather than
 * derived from the evidence, so an anchor the sweep forgot to measure is a
 * missing member that fails, not a member that never existed.
 */
export const FEATURED_INSTRUMENT_ANCHORS = [
  'anchor:featured-one-registered-scene',
  'anchor:featured-live-graphic',
  'anchor:featured-poster-at-first-paint',
  'anchor:featured-no-autoplay',
  'anchor:featured-plays-on-activation',
  'anchor:featured-numeric-readout',
  'anchor:featured-keyboard-operable',
  'anchor:featured-visible-focus',
  'anchor:featured-deterministic-reset',
  'anchor:featured-reachable-in-one-scroll',
  'anchor:featured-claim-and-current-state',
  'anchor:featured-no-fabricated-telemetry',
] as const;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The still a reader sees: the readout and the step text together. */
function stillOf(readout: string, caption: string): string {
  return `${readout} | ${caption}`;
}

/**
 * Decides the featured-scene anchors independently.
 *
 * A scene that is live but autoplays fails one row and passes the others,
 * which is what keeps these anchors from collapsing into one boolean
 * wearing twelve names.
 */
export function featuredInstrumentVerdicts(
  evidence: HomeToolsEvidence,
): Verdict[] {
  const featured = evidence.featured;
  const failures = new Map<string, string[]>(
    FEATURED_INSTRUMENT_ANCHORS.map((id) => [id, []]),
  );
  const fail = (id: (typeof FEATURED_INSTRUMENT_ANCHORS)[number], text: string) =>
    failures.get(id)!.push(text);

  if (featured.sceneCount !== 1) {
    fail(
      'anchor:featured-one-registered-scene',
      `home renders ${featured.sceneCount} scenes inside main, not exactly one`,
    );
  }
  if (sceneCanonicalRoute(featured.sceneId) === null) {
    fail(
      'anchor:featured-one-registered-scene',
      `home features ${featured.sceneId}, which the explainer catalog does not list`,
    );
  }

  if (featured.graphicTag !== 'svg' && featured.graphicTag !== 'canvas') {
    fail(
      'anchor:featured-live-graphic',
      `the featured scene stages ${String(featured.graphicTag)} rather than a live svg or canvas`,
    );
  }
  if (featured.frameRole !== 'group' || (featured.frameAriaLabel ?? '').trim() === '') {
    fail(
      'anchor:featured-live-graphic',
      `the scene frame is role ${String(featured.frameRole)} named "${String(featured.frameAriaLabel)}", not a named group`,
    );
  }
  if ((featured.describedByText ?? '').trim().length === 0) {
    fail(
      'anchor:featured-live-graphic',
      'the scene frame points at no textual alternative that resolves on the page',
    );
  }
  if (featured.graphicHeightPx <= 0) {
    fail('anchor:featured-live-graphic', 'the featured stage renders with no box');
  }

  if (featured.posterMarkCount === 0) {
    fail(
      'anchor:featured-poster-at-first-paint',
      'the stage paints no poster at first paint, so it shows a blank or skeleton stage',
    );
  }
  if (featured.posterSrc !== `/explainers/posters/${featured.sceneId}.webp`) {
    fail(
      'anchor:featured-poster-at-first-paint',
      `the stage's first paint shows ${String(featured.posterSrc)}, not the poster of ${featured.sceneId}`,
    );
  }
  if (featured.playerMountedAtFirstPaint) {
    fail(
      'anchor:featured-poster-at-first-paint',
      'the 3D scene or its kit reached the page before anyone started it',
    );
  }
  if (featured.posterCaption.trim().length === 0) {
    fail('anchor:featured-poster-at-first-paint', 'the poster carries no step text');
  }

  if (featured.idleFrameRequests !== 0) {
    fail(
      'anchor:featured-no-autoplay',
      `the untouched page requested ${featured.idleFrameRequests} animation frames, so something animates before the reader starts it`,
    );
  }
  if (featured.startControl === null) {
    fail('anchor:featured-no-autoplay', 'the featured scene offers no control that starts it');
  }
  if (featured.playingFrameRequests <= 0) {
    fail(
      'anchor:featured-plays-on-activation',
      'activating the start control requested no animation frame, so the scene never ran',
    );
  }

  if (readoutNumbers(featured.openingReadout).length === 0) {
    fail(
      'anchor:featured-numeric-readout',
      `the featured readout "${featured.openingReadout}" prints no number`,
    );
  }
  if (featured.posterControls.length === 0) {
    fail(
      'anchor:featured-numeric-readout',
      'the featured scene exposes no enabled control at first paint',
    );
  }

  const stepped = new Set(featured.steps.map(({ readout, caption }) => stillOf(readout, caption)));
  if (stepped.size < 2) {
    fail(
      'anchor:featured-keyboard-operable',
      `the key script left the scene at ${[...stepped].join(', ') || 'nothing'}, so no key changed the visible state`,
    );
  }
  const opening = stillOf(featured.openingReadout, featured.openingCaption);
  if (featured.steps[0] && stillOf(featured.steps[0].readout, featured.steps[0].caption) === opening) {
    fail(
      'anchor:featured-keyboard-operable',
      `${featured.steps[0].key} left the scene at its opening still`,
    );
  }

  if ((featured.focusOutlineWidthPx ?? 0) <= 0) {
    fail(
      'anchor:featured-visible-focus',
      `the focused start control paints a ${String(featured.focusOutlineWidthPx)}px outline, so focus is not visible`,
    );
  }
  if (featured.focusOutlineStyle === null || featured.focusOutlineStyle === 'none') {
    fail('anchor:featured-visible-focus', 'the focused start control paints no outline style');
  }
  if (featured.resetControlNames.length === 0) {
    fail('anchor:featured-deterministic-reset', 'the featured scene exposes no reset control');
  }
  if (featured.resetReadout !== featured.openingReadout) {
    fail(
      'anchor:featured-deterministic-reset',
      `reset restored "${featured.resetReadout}" rather than the opening "${featured.openingReadout}"`,
    );
  }
  if (featured.resetCaption !== featured.openingCaption) {
    fail(
      'anchor:featured-deterministic-reset',
      `reset restored the step "${featured.resetCaption}" rather than the opening "${featured.openingCaption}"`,
    );
  }
  if (featured.secondResetReadout !== featured.openingReadout) {
    fail(
      'anchor:featured-deterministic-reset',
      `a second step and reset restored "${featured.secondResetReadout}" rather than "${featured.openingReadout}", so reset is not deterministic`,
    );
  }

  if (featured.graphicTopPx > FEATURED_INSTRUMENT_MAX_TOP_PX) {
    fail(
      'anchor:featured-reachable-in-one-scroll',
      `the featured stage begins ${featured.graphicTopPx}px down the document, below the ${FEATURED_INSTRUMENT_MAX_TOP_PX}px bound`,
    );
  }

  if (words(featured.claimText) < 8) {
    fail(
      'anchor:featured-claim-and-current-state',
      `the featured scene states "${featured.claimText}", too short to be the claim the scene makes`,
    );
  }
  if (readoutNumbers(featured.openingReadout).length === 0) {
    fail(
      'anchor:featured-claim-and-current-state',
      `the featured scene prints no current-state value beside its stage (observed "${featured.openingReadout}")`,
    );
  }

  const model = FEATURED_SCENE_MODELS[featured.sceneId];
  if (!model) {
    fail(
      'anchor:featured-no-fabricated-telemetry',
      `no independent model is declared for ${featured.sceneId}, so its readouts would go unchecked`,
    );
  } else {
    for (const { state, readout } of [
      ...recordedReadouts(featured),
      { state: 'claim', readout: featured.claimText },
    ]) {
      const problem = model(readout);
      if (problem) fail('anchor:featured-no-fabricated-telemetry', `${state}: ${problem}`);
    }
  }

  const observed: Record<string, Record<string, unknown>> = {
    'anchor:featured-one-registered-scene': {
      sceneId: featured.sceneId,
      sceneCount: featured.sceneCount,
      canonicalRoute: sceneCanonicalRoute(featured.sceneId),
    },
    'anchor:featured-live-graphic': {
      tag: featured.graphicTag,
      role: featured.frameRole,
      ariaLabel: featured.frameAriaLabel,
      heightPx: featured.graphicHeightPx,
    },
    'anchor:featured-poster-at-first-paint': {
      poster: featured.posterSrc,
      painted: featured.posterMarkCount,
      playerMounted: featured.playerMountedAtFirstPaint,
      caption: featured.posterCaption,
    },
    'anchor:featured-no-autoplay': {
      idleFrameRequests: featured.idleFrameRequests,
      startControl: featured.startControl,
    },
    'anchor:featured-plays-on-activation': {
      playingFrameRequests: featured.playingFrameRequests,
    },
    'anchor:featured-numeric-readout': {
      readout: featured.openingReadout,
      controls: featured.posterControls,
    },
    'anchor:featured-keyboard-operable': {
      opening: opening,
      steps: featured.steps,
    },
    'anchor:featured-visible-focus': {
      outlineWidthPx: featured.focusOutlineWidthPx,
      outlineStyle: featured.focusOutlineStyle,
      outlineColour: featured.focusOutlineColour,
    },
    'anchor:featured-deterministic-reset': {
      controls: featured.resetControlNames,
      reset: featured.resetReadout,
      secondReset: featured.secondResetReadout,
    },
    'anchor:featured-reachable-in-one-scroll': {
      topPx: featured.graphicTopPx,
      boundPx: FEATURED_INSTRUMENT_MAX_TOP_PX,
      viewport: HOME_TOOLS_VIEWPORT.id,
    },
    'anchor:featured-claim-and-current-state': {
      claim: featured.claimText,
      currentState: featured.openingReadout,
    },
    'anchor:featured-no-fabricated-telemetry': {
      spec: UNITREE_G1_SPEC,
      readouts: recordedReadouts(featured),
      claim: featured.claimText,
    },
  };
  return FEATURED_INSTRUMENT_ANCHORS.map((id) => ({
    id,
    observed: observed[id],
    failures: failures.get(id)!,
  }));
}
/** One still read on home and on the scene's own page, side by side. */
export type CrossContextStateComparison = {
  state: string;
  home: string;
  module: string;
  agrees: boolean;
};

/** The clause ids a `VAL-CROSS-015` row can be decided by. */
export const CROSS_CONTEXT_CLAUSES = {
  sameComponent: 'clause:one-scene-component-in-both-contexts',
  sharedInputsSharedReadout: 'clause:equivalent-inputs-equivalent-readouts',
  identicalResetState: 'clause:identical-initial-and-reset-state-across-contexts',
} as const;

function still(readout: string, caption: string | null): string {
  return caption === null ? readout : stillOf(readout, caption);
}

/**
 * The home/page comparison written out state by state, so the claim can be
 * read off the observations rather than recomputed. Both sides are
 * observations: neither context is checked against a model here.
 */
export function crossContextStates(
  evidence: HomeToolsEvidence,
): CrossContextStateComparison[] {
  const home = evidence.featured;
  const article = evidence.moduleScene;
  const row = (state: string, left: string, right: string) => ({
    state,
    home: left,
    module: right,
    agrees: left === right,
  });
  return [
    row('opening', still(home.openingReadout, home.openingCaption), still(article.openingReadout, article.openingCaption)),
    ...SCENE_KEY_SCRIPT.map((key, index) =>
      row(
        `step ${index + 1} (${key})`,
        still(home.steps[index]?.readout ?? '(not read)', home.steps[index]?.caption ?? null),
        still(article.steps[index]?.readout ?? '(not read)', article.steps[index]?.caption ?? null),
      ),
    ),
    row('reset', still(home.resetReadout, home.resetCaption), still(article.resetReadout, article.resetCaption)),
    row('second reset', home.secondResetReadout, article.secondResetReadout),
  ];
}

/**
 * Decides `VAL-CROSS-015` for the featured scene.
 *
 * Three clauses. The component clause holds home and the explainer's own
 * page to one viewer and one scene module, read from each document's own
 * imports, so a look-alike copy on home fails even while its readouts
 * happen to agree. The behaviour clause is the criterion's stated Pass
 * condition: the same keys, pressed in both contexts, print the same stills.
 * The reset clause is the locked one: both contexts open on the same still,
 * and each reset returns to it.
 */
export function crossMountVerdicts(evidence: HomeToolsEvidence): Verdict[] {
  const home = evidence.featured;
  const article = evidence.moduleScene;
  const rows = crossContextStates(evidence);
  const disagreeing = (states: string[]) =>
    rows.filter(({ state, agrees }) => states.includes(state) && !agrees);

  const componentFailures: string[] = [];
  if (home.componentModule === null || article.componentModule === null) {
    componentFailures.push(
      `the scene's viewer could not be read from ${home.componentModule === null ? 'app/page.tsx' : `the document behind ${article.route}`}, so the two contexts cannot be shown to mount one component`,
    );
  } else if (home.componentModule !== article.componentModule) {
    componentFailures.push(
      `home drives ${home.componentModule} where ${article.route} drives ${article.componentModule}, so home features a copy rather than the explainer's own scene`,
    );
  }

  const stepStates = SCENE_KEY_SCRIPT.map((key, index) => `step ${index + 1} (${key})`);
  const behaviourFailures = disagreeing(stepStates).map(
    ({ state, home: left, module: right }) =>
      `${state}: home reads "${left}" where ${article.route} reads "${right}"`,
  );

  const resetFailures = disagreeing(['opening', 'reset', 'second reset']).map(
    ({ state, home: left, module: right }) =>
      `the two contexts do not restore the identical initial state at ${state}: home "${left}", ${article.route} "${right}"`,
  );
  for (const scene of [home, article]) {
    if (scene.resetReadout !== scene.openingReadout) {
      resetFailures.push(
        `${scene.route} resets to "${scene.resetReadout}" rather than its own opening "${scene.openingReadout}"`,
      );
    }
  }

  return [
    {
      id: CROSS_CONTEXT_CLAUSES.sameComponent,
      observed: {
        home: home.componentModule,
        module: article.componentModule,
        moduleRoute: article.route,
      },
      failures: componentFailures,
    },
    {
      id: CROSS_CONTEXT_CLAUSES.sharedInputsSharedReadout,
      observed: { keys: [...SCENE_KEY_SCRIPT], rows: rows.filter(({ state }) => stepStates.includes(state)) },
      failures: behaviourFailures,
    },
    {
      id: CROSS_CONTEXT_CLAUSES.identicalResetState,
      observed: { rows: rows.filter(({ state }) => !stepStates.includes(state)) },
      failures: resetFailures,
    },
  ];
}
/** The tools the owner's front page links, with the words that name them. */
export const HOME_TOOL_LINKS = [
  { id: 'anchor:tools-line-playground-link', path: '/playground/', names: /playground/i },
  { id: 'anchor:tools-line-how-robots-work-link', path: '/how-robots-work/', names: /how robots work/i },
  { id: 'anchor:tools-line-market-map-link', path: '/market-map/', names: /market map/i },
] as const;

/** Links sharing one line sit within this many pixels of each other's top. */
const ONE_LINE_TOLERANCE_PX = 4;

/**
 * Decides `VAL-DESIGN-013` and `VAL-OPUS-020`: each tool is a plain text
 * link named for what it opens, and the row holding them stays one line of
 * links with no preview, card, graphic or printed telemetry in it.
 */
export function toolsLineVerdicts(evidence: HomeToolsEvidence): Verdict[] {
  const row = evidence.toolsLine;
  const linkVerdicts = HOME_TOOL_LINKS.map(({ id, path, names }) => {
    const failures: string[] = [];
    const link = row.links.find((candidate) => candidate.path === path);
    if (!link) {
      failures.push(`the tools line carries no link to ${path}`);
    } else if (!names.test(link.text)) {
      failures.push(`the ${path} link reads "${link.text}", which does not name what it opens`);
    }
    return { id, observed: { link: link ?? null }, failures };
  });

  const plainFailures: string[] = [];
  const expected = new Set<string>(HOME_TOOL_LINKS.map(({ path }) => path));
  for (const link of row.links) {
    if (!expected.has(link.path)) {
      plainFailures.push(`the tools line also links ${link.path} ("${link.text}")`);
    }
  }
  for (const graphic of row.graphics) {
    plainFailures.push(`the tools line renders a <${graphic}>, so an entry is a preview rather than a link`);
  }
  if (row.renderedNumbers.length > 0) {
    plainFailures.push(
      `the tools line prints ${row.renderedNumbers.join(', ')}, telemetry a line of links has no source for`,
    );
  }
  if (row.boxedDescendants > 0) {
    plainFailures.push(`the tools line boxes ${row.boxedDescendants} element(s) as cards`);
  }
  const tops = row.links.map(({ topPx }) => topPx);
  if (tops.length > 0 && Math.max(...tops) - Math.min(...tops) > ONE_LINE_TOLERANCE_PX) {
    plainFailures.push(
      `the tools links sit at tops ${tops.join(', ')}px, so the tools are not one line at ${HOME_TOOLS_VIEWPORT.id}`,
    );
  }
  return [
    ...linkVerdicts,
    {
      id: 'anchor:tools-line-plain',
      observed: {
        text: row.text,
        links: row.links,
        graphics: row.graphics,
        boxedDescendants: row.boxedDescendants,
      },
      failures: plainFailures,
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

/** The research-page section head floor: H2 is 20px (`PANTHEON-SPEC.md`). */
export const SECTION_HEAD_MIN_FONT_PX = 20;

/**
 * True only for the standard's section head: an `h2` carrying the
 * registered `section-display` role, set in DM Sans at the H2 size. A
 * small, unregistered or differently set uppercase run is a micro-label.
 */
export function isStandardSectionHead(label: {
  fontSizePx: number;
  family: string;
  tag: string;
  role: string | null;
}): boolean {
  return (
    label.tag === 'h2' &&
    label.role === 'section-display' &&
    /^dm sans$/i.test(label.family) &&
    label.fontSizePx >= SECTION_HEAD_MIN_FONT_PX
  );
}

/** Decides `VAL-EDU-027` per bound the assertion names. */
export function homeDesignBoundVerdicts(evidence: HomeToolsEvidence): Verdict[] {
  const bounds = evidence.designBounds;

  // Owner-approved successor (Josef, 2026-10-10, the research-page
  // standard): section heads are uppercase DM Sans 600 at 20px by the
  // standard, so a registered section head is a heading, not a
  // micro-label. Every other uppercase text still counts.
  const microLabels = bounds.microLabels.filter(
    (label) => !isStandardSectionHead(label),
  );
  const microFailures: string[] = [];
  if (microLabels.length > HOME_MAX_MICRO_LABELS) {
    microFailures.push(
      `home renders ${microLabels.length} uppercase micro-labels, over the ${HOME_MAX_MICRO_LABELS} bound: ${microLabels.map(({ text }) => text).join('; ')}`,
    );
  }

  const borderFailures: string[] = [];
  if (bounds.borderedBoxCount > HOME_MAX_BORDERED_BOXES) {
    borderFailures.push(
      `home renders ${bounds.borderedBoxCount} bordered boxes inside main, over the ${HOME_MAX_BORDERED_BOXES} bound`,
    );
  }

  const summaryFailures: string[] = [];
  for (const summary of bounds.chartDisclosureSummaries) {
    if (summary.textTransform === 'uppercase') {
      summaryFailures.push(
        `the chart disclosure summary "${summary.text}" is uppercased, so it reads as a micro-label`,
      );
    }
    if (summary.borderTopWidthPx !== 0 || summary.borderBottomWidthPx !== 0) {
      summaryFailures.push(
        `the chart disclosure summary "${summary.text}" paints ${summary.borderTopWidthPx}px/${summary.borderBottomWidthPx}px top and bottom borders rather than 0px`,
      );
    }
    if (bounds.microLabels.some(({ text }) => text === summary.text.toUpperCase())) {
      summaryFailures.push(
        `the chart disclosure summary "${summary.text}" was counted as an uppercase micro-label`,
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
      observed: { summaries: bounds.chartDisclosureSummaries },
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
