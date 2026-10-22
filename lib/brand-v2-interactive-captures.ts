import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
  ARTICLE_BODY_COMPUTED_IMPORT,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';
import {
  CONVERGENCE_EXEMPTIONS,
  readConvergenceRegistry,
} from './brand-v2-global-convergence-evidence.ts';
import type { BrandV2Registry } from './brand-v2-runners.ts';

/**
 * Evidence for `VAL-B2-VIZ-012`: every production mount of every
 * interactive source, captured as pixels in its default state and in one
 * registered changed state, at the phone and the desktop page frame, tiled
 * into deterministic contact sheets, with its exact expected and observed
 * case counts and the §1.12 reference-feature rubric decided per mount.
 *
 * The row cannot be met by computed styles on a mount's root. Each capture
 * is an element screenshot the sweep took until two consecutive shots were
 * byte-identical (§1.11: settled, fonts loaded, not mid-animation), with its
 * luminance spread so a blank capture is refused; the changed capture has to
 * differ from the default one, a registered reset has to bring a
 * deterministic state back, and the rubric reads every painted descendant of the mount
 * through the global convergence collector, attributed to the mount it sits
 * in. Pixel equality is used only for those same-input/same-output checks,
 * never to compare one composition with another.
 */

export const INTERACTIVE_CAPTURES_EVIDENCE_PATH = 'evidence/brand-v2/interactive-captures.json';

/** Where the committed contact sheets live. */
export const INTERACTIVE_CAPTURE_SHEET_DIR = 'evidence/brand-v2/interactive-captures';

/** The sweep whose own bytes decide what this evidence recorded. */
export const INTERACTIVE_CAPTURES_SWEEP_MODULE = 'tests/e2e/brand-v2-interactive-captures.spec.ts';

export const INTERACTIVE_CAPTURES_VERSION = 1;

/** `VAL-B2-VIZ-012` quantifies over the registry's production mounts. */
export const INTERACTIVE_CAPTURE_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#interactive.mounts';

/** The phone and desktop page frames (`contract/brand-v2-registries.json` `pageFrames`). */
export const INTERACTIVE_CAPTURE_VIEWPORTS = [
  { id: '375x812', role: 'mobile', width: 375, height: 812, frame: 'frame:mobile' },
  { id: '1440x900', role: 'desktop', width: 1440, height: 900, frame: 'frame:desktop' },
] as const;

export type CaptureViewportId = (typeof INTERACTIVE_CAPTURE_VIEWPORTS)[number]['id'];

export const INTERACTIVE_CAPTURE_STATES = ['default', 'changed'] as const;
export type CaptureState = (typeof INTERACTIVE_CAPTURE_STATES)[number];

/** Shots a capture may take before two consecutive ones agree. */
export const CAPTURE_SETTLE_ATTEMPTS = 8;

/**
 * The luminance standard deviation below which a capture is blank: a frame
 * of paper with a headline, a hairline and a plot reads well above this; an
 * unpainted or all-paper box reads under one.
 */
export const MIN_LUMINANCE_SPREAD = 4;

/** Sub-pixel layout either side of the viewport edge. */
export const CAPTURE_EDGE_TOLERANCE_PX = 0.5;

/** §1.12 Hierarchy: no desktop primary heading exceeds three rendered lines. */
export const MAX_HEADLINE_LINES = 3;

/** Mounts tiled on one contact sheet. */
export const SHEET_MOUNTS = 6;

/** The contact sheet's JPEG quality; the sheet is an overview, the hashes are the record. */
export const SHEET_JPEG_QUALITY = 60;

/** Tile widths on a sheet, per viewport. */
export const SHEET_TILE_WIDTH_PX: Readonly<Record<CaptureViewportId, number>> = {
  '375x812': 150,
  '1440x900': 320,
};

/**
 * The first-party text families (`data/type-roles.json` `firstPartyRoles`)
 * and the math families KaTeX sets equations in, which the article
 * typography rows seal separately.
 */
export const SEALED_TEXT_FAMILIES = ['DM Sans', 'Geist', 'Geist Mono'] as const;
export const MATH_FAMILY_PATTERN_SOURCE = '^KaTeX_';

/** The superseded identity families; none may render inside a mount. */
export const RETIRED_FAMILY_PATTERN_SOURCE = 'Tektur|IBM Plex|Newsreader';

/** An alternate spelling of the public identity, or the retired descriptor. */
export const ALTERNATE_IDENTITY_PATTERN_SOURCE =
  '\\b(?:robot-wiki|Robot-Wiki|ROBOT WIKI|RobotWiki|Robotics encyclopaedia)\\b';

/**
 * The §1.12 reference-feature rubric, one row per anchor, applied to every
 * mount in both states at both widths. Each row names the collector
 * predicates that decide it inside the mount; a row with extra measures
 * says so. A failed applicable row fails the mount; rows are never averaged.
 */
export const CAPTURE_RUBRIC = [
  {
    id: 'identity',
    anchor: 'Identity',
    predicates: [],
    measures:
      'no superseded identity family (Tektur, IBM Plex, Newsreader) and no alternate identity or descriptor string renders inside the mount',
  },
  {
    id: 'hierarchy',
    anchor: 'Hierarchy',
    predicates: [],
    measures: `the figure headline renders in at most ${MAX_HEADLINE_LINES} lines at 1440x900`,
  },
  {
    id: 'grid',
    anchor: 'Grid and alignment',
    predicates: ['device-misaligned', 'unregistered-device'],
    measures: 'every device inside the mount is registered and within its registered tolerance of its anchor',
  },
  {
    id: 'devices',
    anchor: 'Purposeful devices',
    predicates: ['device-exposed', 'device-under-prose', 'ambient-animation'],
    measures:
      'no device obscures content or intercepts input, nothing moves at rest, and the phone capture carries no more registered devices than the desktop one',
  },
  {
    id: 'light-dark',
    anchor: 'Light/dark balance',
    predicates: ['dark-surface', 'dark-shell'],
    measures: 'the mount stays on the light page; no unregistered dark surface',
  },
  {
    id: 'repetition',
    anchor: 'Repetition and frames',
    predicates: ['repeated-signature', 'nested-frame', 'frame-depth', 'bento-grid', 'empty-card'],
    measures:
      'at most three adjacent siblings share a signature, no redundant four-sided nested frame, frame depth at most two',
  },
  {
    id: 'palette-type',
    anchor: 'Palette and type',
    predicates: [
      'retired-paint',
      'accent-outside-figure',
      'gradient',
      'link-hue',
      'accent-as-warning',
      'success-in-grey-or-accent',
      'selection-fill',
      'selection-colour-text',
      'state-non-colour-cue',
      'primary-ink-fill',
      'secondary-quiet',
      'action-colour-fill',
      'disabled-neutral',
      'technical-glyph',
      'casing-drift',
    ],
    measures:
      'every painted colour and state resolves to the sealed roles, and every text run renders in a sealed family',
  },
  {
    id: 'material',
    anchor: 'Material treatment',
    predicates: [
      'material',
      'texture',
      'text-contrast',
      'boundary-contrast',
      'shadow',
      'glow',
      'rounded-corner',
      'capsule',
      'border-weight',
      'dashed-border',
      'double-rule',
    ],
    measures: 'paper material, 1 px rules, no shadow, glow, radius or texture, and text and boundaries that clear contrast',
  },
  {
    id: 'readable',
    anchor: 'Readable (§1.13)',
    predicates: ['clipped-text', 'text-collision', 'broken-word'],
    measures: 'no text inside the mount is clipped, overlapped or broken inside a word',
  },
] as const;

export type CaptureRubricId = (typeof CAPTURE_RUBRIC)[number]['id'];

/**
 * Collector predicates that are properties of the page around a mount, not
 * of the mount: the page-wide rows decide them over every route. A finding
 * inside a mount under one of these is recorded and left to those rows; a
 * predicate in neither list is refused, so a new collector predicate cannot
 * fall through the rubric unread.
 */
export const PAGE_LEVEL_PREDICATES: Readonly<Record<string, string>> = {
  'citation-language': 'VAL-B2-ART citation rows read citation marks page-wide',
  'citation-target': 'VAL-B2-ART citation rows read citation targets page-wide',
  'inline-padding': 'VAL-B2-SPACE-002 reads the page frame gutter, which the mount sits inside',
  'composition-offgrid': 'VAL-B2-GRID-001 reads major page blocks against their frame lines',
  'rail-colour': 'the contents rail is page chrome outside every mount',
};

const RUBRIC_PREDICATE_OWNER = new Map<string, CaptureRubricId>(
  CAPTURE_RUBRIC.flatMap(({ id, predicates }) =>
    (predicates as readonly string[]).map((predicate) => [predicate, id] as const),
  ),
);

/** A mount's root is its instrument frame, or the block around a plain prose table. */
export const PLAIN_TABLE_SOURCES: ReadonlySet<string> = new Set([
  'interactive:DatasetTable',
  'interactive:HardwareGuide',
  'interactive:TeleopRigMatrix',
]);

export type ChangedBy = 'slider' | 'discrete' | 'action' | 'focus';

export type CapturePlanMount = {
  mountId: string;
  sourceId: string;
  component: string;
  sourcePath: string;
  route: string;
  /** 1-based position among this component's mounts on the route. */
  ordinal: number;
  plainTable: boolean;
  /** The registry's cases for this mount, in registry order. */
  caseIds: string[];
  expectedCaseCount: number;
  /** How the changed capture is reached, and the registered case it exercises. */
  changedBy: ChangedBy;
  changedCaseId: string;
  hasReset: boolean;
};

export type CapturePlanSource = {
  sourceId: string;
  mountIds: string[];
  notApplicableReason: string | null;
};

export type InteractiveCapturePlan = {
  mounts: CapturePlanMount[];
  sources: CapturePlanSource[];
  routes: string[];
};

/**
 * The capture plan, derived from the registry alone: every mount, grouped by
 * route in route order and in registry (document) order within a route, and
 * the changed state each one is captured in. The changed state is the first
 * registered control case a mount has: its first slider moved to the far
 * end, else its first unselected discrete option, else (a stepper with only
 * buttons) one press of its own primary action, which is the state its
 * registered reset restores from, else (a static figure whose only control
 * is its disclosure) its first control holding keyboard focus.
 */
export function interactiveCapturePlan(
  registry: Pick<BrandV2Registry, 'interactive'>,
): InteractiveCapturePlan {
  const { sources, mounts } = registry.interactive;
  if (sources.length === 0 || mounts.length === 0) {
    throw new Error('the interactive registry has no sources or no mounts, so there is nothing to capture');
  }
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const routes = [...new Set(mounts.map(({ route }) => route))].sort((a, b) => a.localeCompare(b));
  const planned: CapturePlanMount[] = [];
  for (const route of routes) {
    for (const mount of mounts.filter((candidate) => candidate.route === route)) {
      const source = sourceById.get(mount.sourceId);
      if (!source?.sourcePath) throw new Error(`${mount.id} names no registered source file`);
      if (mount.cases.length === 0 || mount.expectedCaseCount !== mount.cases.length) {
        throw new Error(`${mount.id} registers ${mount.expectedCaseCount} cases but lists ${mount.cases.length}`);
      }
      const applicable = mount.cases.filter((stateCase) => !stateCase.notApplicableReason);
      const slider = applicable.find(({ kind }) => kind === 'slider-boundaries');
      const discrete = applicable.find(
        ({ kind, id }) => kind === 'discrete-options' && !/-witness$/.test(id),
      );
      const hover = applicable.find(({ kind }) => kind === 'hover');
      const reset = applicable.find(({ kind }) => kind === 'reset');
      const focus = applicable.find(({ kind }) => kind === 'focus');
      let changedBy: ChangedBy;
      let changedCaseId: string;
      if (slider) {
        changedBy = 'slider';
        changedCaseId = slider.id;
      } else if (discrete) {
        changedBy = 'discrete';
        changedCaseId = discrete.id;
      } else if (hover && reset) {
        changedBy = 'action';
        changedCaseId = reset.id;
      } else if (focus) {
        changedBy = 'focus';
        changedCaseId = focus.id;
      } else {
        throw new Error(
          `${mount.id} registers no slider, discrete option, resettable action or focusable control, so it has no changed state to capture`,
        );
      }
      planned.push({
        mountId: mount.id,
        sourceId: mount.sourceId,
        component: source.component,
        sourcePath: source.sourcePath,
        route,
        ordinal: mount.ordinal,
        plainTable: PLAIN_TABLE_SOURCES.has(mount.sourceId),
        caseIds: mount.cases.map(({ id }) => id),
        expectedCaseCount: mount.expectedCaseCount,
        changedBy,
        changedCaseId,
        hasReset: Boolean(reset),
      });
    }
  }
  const planSources = sources.map((source) => {
    const mountIds = planned.filter(({ sourceId }) => sourceId === source.id).map(({ mountId }) => mountId);
    return {
      sourceId: source.id,
      mountIds,
      notApplicableReason:
        mountIds.length === 0
          ? `${source.component} has no production mount (no article or route module mounts it), so no reader-reachable render exists to capture; its source stays in the registry and in the VIZ-010 three-way parity`
          : null,
    };
  });
  return { mounts: planned, sources: planSources, routes };
}

/** One capture's key on a contact sheet. */
export function captureKey(mountId: string, viewport: string, state: string): string {
  return `${mountId}@${viewport}:${state}`;
}

/** The plan's contact sheets: consecutive runs of mounts, in plan order. */
export function plannedSheets(plan: InteractiveCapturePlan): Array<{ path: string; mountIds: string[] }> {
  const sheets: Array<{ path: string; mountIds: string[] }> = [];
  for (let index = 0; index < plan.mounts.length; index += SHEET_MOUNTS) {
    const number = String(sheets.length + 1).padStart(2, '0');
    sheets.push({
      path: `${INTERACTIVE_CAPTURE_SHEET_DIR}/sheet-${number}.jpg`,
      mountIds: plan.mounts.slice(index, index + SHEET_MOUNTS).map(({ mountId }) => mountId),
    });
  }
  return sheets;
}

/** The capture keys one sheet tiles, in the order it tiles them. */
export function sheetCaptureKeys(mountIds: readonly string[]): string[] {
  return mountIds.flatMap((mountId) =>
    INTERACTIVE_CAPTURE_VIEWPORTS.toReversed().flatMap(({ id }) =>
      INTERACTIVE_CAPTURE_STATES.map((state) => captureKey(mountId, id, state)),
    ),
  );
}

function planFacts(plan: InteractiveCapturePlan): string {
  return JSON.stringify({
    mounts: plan.mounts.map(({ mountId, caseIds, changedBy, changedCaseId, hasReset }) => [
      mountId,
      caseIds,
      changedBy,
      changedCaseId,
      hasReset,
    ]),
    sources: plan.sources.map(({ sourceId, mountIds }) => [sourceId, mountIds]),
    viewports: INTERACTIVE_CAPTURE_VIEWPORTS,
    rubric: CAPTURE_RUBRIC.map(({ id, predicates }) => [id, predicates]),
    pageLevel: Object.keys(PAGE_LEVEL_PREDICATES),
    thresholds: [
      CAPTURE_SETTLE_ATTEMPTS,
      MIN_LUMINANCE_SPREAD,
      MAX_HEADLINE_LINES,
      SHEET_MOUNTS,
      SHEET_JPEG_QUALITY,
      SHEET_TILE_WIDTH_PX,
      SEALED_TEXT_FAMILIES,
      RETIRED_FAMILY_PATTERN_SOURCE,
      ALTERNATE_IDENTITY_PATTERN_SOURCE,
    ],
  });
}

/**
 * The fingerprint the sweep records and the generator re-derives: every
 * module a public route reaches (each mount's component, the instrument
 * primitives, the stylesheets and the articles that mount them), this sweep
 * and what it imports, the plan, and the registry rows the collector reads.
 */
export function interactiveCapturesEvidenceFingerprint(input: {
  root: string;
  plan: InteractiveCapturePlan;
}): string {
  const registry = readConvergenceRegistry(input.root);
  return deriveEvidenceClosure({
    root: input.root,
    entries: [
      ...routeEntryModules(evidenceClosureGraph(input.root)),
      INTERACTIVE_CAPTURES_SWEEP_MODULE,
    ],
    facts: [
      planFacts(input.plan),
      JSON.stringify({
        devices: registry.gridDevices.map(({ id, alignmentTolerancePx }) => [id, alignmentTolerancePx]),
        materials: registry.materials.map(({ id }) => id),
      }),
    ],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

/* ------------------------------------------------------------------ */
/* Artifact schema                                                     */
/* ------------------------------------------------------------------ */

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

const captureSchema = z.object({
  state: z.enum(INTERACTIVE_CAPTURE_STATES),
  /** The registered case the state exercises (`default` for the default capture). */
  caseId: z.string().min(1),
  /** The control the sweep changed, named; null for the default capture. */
  control: z.string().nullable(),
  sha256: sha256Schema,
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  settleAttempts: z.number().int().positive(),
  settled: z.boolean(),
  luminanceSpread: z.number().min(0),
  fontsLoaded: z.boolean(),
  rootLeftPx: z.number(),
  rootRightPx: z.number(),
  documentOverflowPx: z.number(),
});

const caseSchema = z.object({
  caseId: z.string().min(1),
  kind: z.string().min(1),
  status: z.enum(['observed', 'not-applicable', 'missing']),
  /** How many matching controls the mount's own root rendered, where the case names a selector. */
  matched: z.number().int().min(0).nullable(),
  detail: z.string(),
});

const findingSchema = z.object({
  state: z.enum(INTERACTIVE_CAPTURE_STATES),
  predicate: z.string().min(1),
  element: z.string(),
  detail: z.string(),
  exemption: z.string().nullable(),
});

const observationSchema = z.object({
  mountId: z.string().min(1),
  viewport: z.string().min(1),
  status: z.number().int(),
  captures: z.array(captureSchema).min(2).max(2),
  /**
   * A registered reset, pressed in the changed state. Its effect is read from
   * the mount's DOM state (markup with announcements emptied, plus every
   * control's value), not from pixels: a repaint after a state change can
   * shift anti-aliasing by a grey level with the same DOM, which is not a
   * state the reader can tell apart.
   */
  reset: z
    .object({
      present: z.number().int().min(0),
      /** The state after the reset equals the state the page loaded in. */
      restoredDefault: z.boolean(),
      /**
       * Only when it did not: the state equals the one the same reset gives a
       * freshly loaded figure (a "Start over" that replays from the first
       * step), so the reset is deterministic whatever the reader did first.
       */
      restoredRestart: z.boolean().nullable(),
    })
    .nullable(),
  cases: z.array(caseSchema).min(1),
  findings: z.array(findingSchema),
  headline: z.object({ text: z.string(), lines: z.number().int().min(0) }).nullable(),
  deviceCount: z.number().int().min(0),
  families: z.array(z.string()),
  retiredFamilies: z.array(z.string()),
  alternateIdentity: z.array(z.string()),
});

const sheetSchema = z.object({
  path: z.string().min(1),
  sha256: sha256Schema,
  bytes: z.number().int().positive(),
  mountIds: z.array(z.string().min(1)).min(1),
  captures: z.array(z.object({ key: z.string().min(1), sha256: sha256Schema })).min(1),
  renderedTwiceIdentical: z.boolean(),
});

export const interactiveCapturesEvidenceSchema = z.object({
  version: z.literal(INTERACTIVE_CAPTURES_VERSION),
  fingerprint: z.string().min(1),
  viewports: z.array(z.string()),
  reducedMotion: z.literal('reduce'),
  mountIds: z.array(z.string()),
  sources: z.array(
    z.object({
      sourceId: z.string().min(1),
      mountIds: z.array(z.string()),
      notApplicableReason: z.string().nullable(),
    }),
  ),
  observations: z.array(observationSchema),
  sheets: z.array(sheetSchema).min(1),
});

export type InteractiveCapturesEvidence = z.infer<typeof interactiveCapturesEvidenceSchema>;
export type InteractiveCaptureObservation = z.infer<typeof observationSchema>;
export type InteractiveCapture = z.infer<typeof captureSchema>;
export type InteractiveCaptureCase = z.infer<typeof caseSchema>;
export type InteractiveCaptureSheet = z.infer<typeof sheetSchema>;

const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

function populationDrift(label: string, recorded: readonly string[], expected: readonly string[]): string | null {
  const recordedSet = new Set(recorded);
  const expectedSet = new Set(expected);
  const dropped = expected.filter((id) => !recordedSet.has(id));
  const extra = recorded.filter((id) => !expectedSet.has(id));
  const duplicated = recorded.filter((id, index) => recorded.indexOf(id) !== index);
  if (dropped.length) return `${label} dropped: ${dropped.slice(0, 4).join(', ')}`;
  if (extra.length) return `${label} holds unregistered: ${extra.slice(0, 4).join(', ')}`;
  if (duplicated.length) return `${label} duplicates: ${duplicated.slice(0, 4).join(', ')}`;
  if (!sameList(recorded, expected)) return `${label} is out of plan order`;
  return null;
}

/**
 * The fail-closed reader. It refuses a stale fingerprint, a mount set or a
 * source accounting that disagrees with the plan in either direction or in
 * order, a missing, extra or duplicated mount/viewport reading, a reading
 * without both captures in order, a finding under a predicate neither the
 * rubric nor the page-level list owns, and a contact-sheet set that does
 * not tile every capture exactly once in plan order, whose recorded hashes
 * disagree with the captures, or (given `root`) whose committed file is
 * missing or holds other bytes.
 */
export function readInteractiveCapturesEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  plan: InteractiveCapturePlan;
  root?: string;
}): InteractiveCapturesEvidence {
  const evidence = parseEvidenceArtifact(
    interactiveCapturesEvidenceSchema,
    input.artifact,
    INTERACTIVE_CAPTURES_EVIDENCE_PATH,
  );
  if (evidence.fingerprint !== input.fingerprint) {
    throw new Error(
      `${INTERACTIVE_CAPTURES_EVIDENCE_PATH} is stale: its fingerprint does not match the current mounts, sweep and plan; re-run ${INTERACTIVE_CAPTURES_SWEEP_MODULE}`,
    );
  }
  const viewportIds = INTERACTIVE_CAPTURE_VIEWPORTS.map(({ id }) => id);
  if (!sameList(evidence.viewports, viewportIds)) {
    throw new Error(`interactive-captures evidence reads ${evidence.viewports.join('/')}, not ${viewportIds.join('/')}`);
  }
  const planMountIds = input.plan.mounts.map(({ mountId }) => mountId);
  const mountDrift = populationDrift('interactive-captures mounts', evidence.mountIds, planMountIds);
  if (mountDrift) throw new Error(mountDrift);

  const sourceDrift = populationDrift(
    'interactive-captures sources',
    evidence.sources.map(({ sourceId }) => sourceId),
    input.plan.sources.map(({ sourceId }) => sourceId),
  );
  if (sourceDrift) throw new Error(sourceDrift);
  input.plan.sources.forEach((planned, index) => {
    const recorded = evidence.sources[index];
    if (!sameList(recorded.mountIds, planned.mountIds)) {
      throw new Error(`${planned.sourceId} accounts mounts ${recorded.mountIds.join(', ')}, the plan has ${planned.mountIds.join(', ')}`);
    }
    if ((recorded.notApplicableReason === null) !== (planned.notApplicableReason === null)) {
      throw new Error(`${planned.sourceId} has no production mount only if it carries a typed reason, and only then`);
    }
  });

  const expectedKeys = planMountIds.flatMap((mountId) => viewportIds.map((viewport) => `${mountId}@${viewport}`));
  const observationDrift = populationDrift(
    'interactive-captures readings',
    evidence.observations.map(({ mountId, viewport }) => `${mountId}@${viewport}`),
    expectedKeys,
  );
  if (observationDrift) throw new Error(observationDrift);

  const routeByMount = new Map(input.plan.mounts.map(({ mountId, route }) => [mountId, route]));
  for (const observation of evidence.observations) {
    const at = `${observation.mountId}@${observation.viewport}`;
    const states = observation.captures.map(({ state }) => state);
    if (!sameList(states, INTERACTIVE_CAPTURE_STATES)) {
      throw new Error(`${at} records captures ${states.join('/')}, not default/changed`);
    }
    for (const finding of observation.findings) {
      if (!RUBRIC_PREDICATE_OWNER.has(finding.predicate) && !(finding.predicate in PAGE_LEVEL_PREDICATES)) {
        throw new Error(`${at} records a ${finding.predicate} finding that no rubric row and no page-level row owns`);
      }
      if (finding.exemption === null) continue;
      // An exemption only excuses what the register holds for that
      // predicate on that route; anything else is a pass the artifact made up.
      const registered = CONVERGENCE_EXEMPTIONS.find(({ id }) => id === finding.exemption);
      if (!registered) {
        throw new Error(`${at} claims exemption "${finding.exemption}", which the register does not hold`);
      }
      if (!(registered.predicates as readonly string[]).includes(finding.predicate)) {
        throw new Error(`${at}: exemption "${finding.exemption}" is not registered for ${finding.predicate}`);
      }
      if (registered.routes && !registered.routes.includes(`route:${routeByMount.get(observation.mountId)}`)) {
        throw new Error(`${at}: exemption "${finding.exemption}" is not registered for its route`);
      }
    }
  }

  const captureHash = new Map(
    evidence.observations.flatMap((observation) =>
      observation.captures.map((capture) => [
        captureKey(observation.mountId, observation.viewport, capture.state),
        capture.sha256,
      ] as const),
    ),
  );
  const planned = plannedSheets(input.plan);
  const sheetDrift = populationDrift(
    'interactive-captures contact sheets',
    evidence.sheets.map(({ path }) => path),
    planned.map(({ path }) => path),
  );
  if (sheetDrift) throw new Error(sheetDrift);
  evidence.sheets.forEach((sheet, index) => {
    if (!sameList(sheet.mountIds, planned[index].mountIds)) {
      throw new Error(`${sheet.path} tiles ${sheet.mountIds.join(', ')}, the plan puts ${planned[index].mountIds.join(', ')} on it`);
    }
    const keys = sheetCaptureKeys(sheet.mountIds);
    if (!sameList(sheet.captures.map(({ key }) => key), keys)) {
      throw new Error(`${sheet.path} does not tile each of its mounts' four captures exactly once, in order`);
    }
    for (const tile of sheet.captures) {
      if (captureHash.get(tile.key) !== tile.sha256) {
        throw new Error(`${sheet.path} tiles ${tile.key} with bytes the reading did not record`);
      }
    }
    if (!sheet.renderedTwiceIdentical) {
      throw new Error(`${sheet.path} rendered differently the second time, so it is not a deterministic contact sheet`);
    }
    if (input.root) {
      const file = join(input.root, sheet.path);
      if (!existsSync(file)) throw new Error(`${sheet.path} is recorded but not committed`);
      const bytes = readFileSync(file);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (digest !== sheet.sha256 || bytes.length !== sheet.bytes) {
        throw new Error(`${sheet.path} holds other bytes than the sweep recorded`);
      }
    }
  });
  if (input.root) {
    const directory = join(input.root, INTERACTIVE_CAPTURE_SHEET_DIR);
    const recorded = new Set(evidence.sheets.map(({ path }) => path));
    const strays = existsSync(directory)
      ? readdirSync(directory)
          .map((file) => `${INTERACTIVE_CAPTURE_SHEET_DIR}/${file}`)
          .filter((path) => !recorded.has(path))
      : [];
    if (strays.length > 0) {
      throw new Error(`${strays.join(', ')} sits beside the recorded contact sheets but no reading records it`);
    }
  }
  return evidence;
}

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

export type CaptureRubricCell = 'pass' | 'fail' | `not-applicable: ${string}`;

export type InteractiveCaptureVerdict = {
  id: string;
  observed: {
    route: string;
    sourceId: string;
    expectedCaseCount: number;
    observedCaseCount: Record<CaptureViewportId, number>;
    changedBy: ChangedBy;
    changedCaseId: string;
    captures: Array<{ viewport: string; state: string; sha256: string; widthPx: number; heightPx: number }>;
    contactSheet: string;
    rubric: Record<CaptureRubricId, CaptureRubricCell>;
  };
  failures: string[];
};

const sealedFamily = (family: string) =>
  (SEALED_TEXT_FAMILIES as readonly string[]).includes(family) ||
  new RegExp(MATH_FAMILY_PATTERN_SOURCE).test(family);

/** One verdict per planned mount, in plan order. */
export function interactiveCaptureVerdicts(
  evidence: InteractiveCapturesEvidence,
  plan: InteractiveCapturePlan,
): Map<string, InteractiveCaptureVerdict> {
  const sheetByMount = new Map(
    evidence.sheets.flatMap((sheet) => sheet.mountIds.map((mountId) => [mountId, sheet.path] as const)),
  );
  const verdicts = new Map<string, InteractiveCaptureVerdict>();
  for (const mount of plan.mounts) {
    const failures: string[] = [];
    const rubricFailures = new Map<CaptureRubricId, string[]>(CAPTURE_RUBRIC.map(({ id }) => [id, []]));
    const fail = (row: CaptureRubricId, message: string) => rubricFailures.get(row)!.push(message);
    const readings = INTERACTIVE_CAPTURE_VIEWPORTS.map(({ id }) => {
      const reading = evidence.observations.find(
        (observation) => observation.mountId === mount.mountId && observation.viewport === id,
      );
      if (!reading) throw new Error(`${mount.mountId} has no ${id} reading; the reader should have refused this`);
      return reading;
    });
    const observedCaseCount = {} as Record<CaptureViewportId, number>;
    for (const reading of readings) {
      const at = `${reading.viewport}`;
      if (reading.status !== 200) failures.push(`${at}: the route answered ${reading.status}`);
      const [defaultCapture, changed] = reading.captures;
      for (const capture of reading.captures) {
        const label = `${at} ${capture.state}`;
        if (!capture.settled) {
          failures.push(`${label}: no two consecutive shots agreed in ${capture.settleAttempts} attempts, so the capture is mid-transition`);
        }
        if (capture.settleAttempts > CAPTURE_SETTLE_ATTEMPTS) {
          failures.push(`${label}: took ${capture.settleAttempts} shots, more than the ${CAPTURE_SETTLE_ATTEMPTS} the sweep allows`);
        }
        if (!capture.fontsLoaded) failures.push(`${label}: captured before the fonts loaded`);
        if (capture.luminanceSpread < MIN_LUMINANCE_SPREAD) {
          failures.push(`${label}: the capture is blank (luminance spread ${capture.luminanceSpread.toFixed(2)} < ${MIN_LUMINANCE_SPREAD})`);
        }
        const viewportWidth = INTERACTIVE_CAPTURE_VIEWPORTS.find(({ id }) => id === reading.viewport)!.width;
        if (
          capture.rootLeftPx < -CAPTURE_EDGE_TOLERANCE_PX ||
          capture.rootRightPx > viewportWidth + CAPTURE_EDGE_TOLERANCE_PX
        ) {
          failures.push(
            `${label}: the mount spans ${capture.rootLeftPx.toFixed(1)} to ${capture.rootRightPx.toFixed(1)} px, outside the ${viewportWidth} px viewport, so the capture is clipped`,
          );
        }
        if (capture.documentOverflowPx > CAPTURE_EDGE_TOLERANCE_PX) {
          failures.push(`${label}: the page scrolls ${capture.documentOverflowPx.toFixed(1)} px sideways in this state`);
        }
      }
      if (changed.caseId !== mount.changedCaseId) {
        failures.push(`${at}: the changed capture exercises ${changed.caseId}, the plan registers ${mount.changedCaseId}`);
      }
      if (!changed.control) failures.push(`${at}: the changed capture names no control it changed`);
      if (changed.sha256 === defaultCapture.sha256) {
        failures.push(`${at}: the changed state (${changed.control ?? 'no control'}) paints the same pixels as the default`);
      }
      if (mount.hasReset) {
        if (!reading.reset || reading.reset.present !== 1) {
          failures.push(`${at}: the mount registers a reset but its root renders ${reading.reset?.present ?? 0} reset actions, not 1`);
        } else if (!reading.reset.restoredDefault && reading.reset.restoredRestart !== true) {
          failures.push(
            `${at}: the reset brings back neither the default state nor the state it gives a freshly loaded figure`,
          );
        }
      } else if (reading.reset !== null) {
        failures.push(`${at}: a reset reading is recorded for a mount that registers no reset case`);
      }

      const recordedCaseIds = reading.cases.map(({ caseId }) => caseId);
      observedCaseCount[reading.viewport as CaptureViewportId] = reading.cases.filter(
        ({ status }) => status !== 'missing',
      ).length;
      if (!sameList(recordedCaseIds, mount.caseIds)) {
        failures.push(
          `${at}: observed cases ${recordedCaseIds.join(', ')} disagree with the ${mount.expectedCaseCount} registered (${mount.caseIds.join(', ')})`,
        );
      }
      for (const stateCase of reading.cases) {
        if (stateCase.status === 'missing') {
          failures.push(`${at}: case ${stateCase.caseId} was not observed: ${stateCase.detail}`);
        }
      }
      if (observedCaseCount[reading.viewport as CaptureViewportId] !== mount.expectedCaseCount) {
        failures.push(
          `${at}: ${observedCaseCount[reading.viewport as CaptureViewportId]} cases observed, ${mount.expectedCaseCount} expected`,
        );
      }

      for (const finding of reading.findings) {
        if (finding.exemption) continue;
        const row = RUBRIC_PREDICATE_OWNER.get(finding.predicate);
        if (row) fail(row, `${at} ${finding.state}: ${finding.predicate} on ${finding.element}: ${finding.detail}`);
      }
      if (reading.retiredFamilies.length > 0) {
        fail('identity', `${at}: renders ${reading.retiredFamilies.join(', ')}`);
      }
      if (reading.alternateIdentity.length > 0) {
        fail('identity', `${at}: shows ${reading.alternateIdentity.join(', ')}`);
      }
      const unsealed = reading.families.filter((family) => !sealedFamily(family));
      if (unsealed.length > 0) {
        fail('palette-type', `${at}: text renders in ${unsealed.join(', ')}, outside the sealed families`);
      }
    }
    const [mobile, desktop] = readings;
    if (mobile.deviceCount > desktop.deviceCount) {
      fail('devices', `the phone capture carries ${mobile.deviceCount} registered devices, the desktop one ${desktop.deviceCount}`);
    }
    if (!mount.plainTable) {
      if (!desktop.headline) {
        fail('hierarchy', 'the framed mount renders no figure headline at 1440x900');
      } else if (desktop.headline.lines > MAX_HEADLINE_LINES) {
        fail('hierarchy', `the headline "${desktop.headline.text}" renders in ${desktop.headline.lines} lines at 1440x900`);
      }
    }
    const rubric = {} as Record<CaptureRubricId, CaptureRubricCell>;
    for (const { id } of CAPTURE_RUBRIC) {
      if (id === 'hierarchy' && mount.plainTable) {
        rubric[id] = 'not-applicable: a plain prose table has no figure headline; the article heading above it is measured by the article rows';
        continue;
      }
      const list = rubricFailures.get(id)!;
      rubric[id] = list.length === 0 ? 'pass' : 'fail';
      failures.push(...list.map((message) => `${id}: ${message}`));
    }
    verdicts.set(mount.mountId, {
      id: mount.mountId,
      observed: {
        route: mount.route,
        sourceId: mount.sourceId,
        expectedCaseCount: mount.expectedCaseCount,
        observedCaseCount,
        changedBy: mount.changedBy,
        changedCaseId: mount.changedCaseId,
        captures: readings.flatMap((reading) =>
          reading.captures.map(({ state, sha256, widthPx, heightPx }) => ({
            viewport: reading.viewport,
            state,
            sha256,
            widthPx,
            heightPx,
          })),
        ),
        contactSheet: sheetByMount.get(mount.mountId) ?? 'none',
        rubric,
      },
      failures,
    });
  }
  return verdicts;
}
