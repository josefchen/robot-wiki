import { readFileSync } from 'node:fs';
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
  approvedDeltaPath,
  buildManifest,
  sha256,
  type ApprovedDelta,
  type BaselineBundle,
} from './brand-v2-baseline.ts';
import { interactiveCapturePlan, type CapturePlanMount } from './brand-v2-interactive-captures.ts';
import { READOUT_SETTLE_MS } from '../components/motion/settled-speech.ts';
import type { BrandV2Registry } from './brand-v2-runners.ts';

/**
 * The keyboard transition ledger: every production mount of every
 * interactive source, operated by a real keyboard in a browser, with each
 * transition's before and after state, its live-region announcements, where
 * focus went, the pointer equivalent's state, and the keyboard return to
 * the state it started from. One artifact decides six assertions per mount:
 *
 * - `VAL-B2-VIZ-002`: series stay told apart without colour in the default
 *   state and in every state a slider end or a discrete option leads to;
 * - `VAL-B2-VIZ-007`: every control works by keyboard (sliders by End, Home
 *   and arrow keys, never by setting a value), shows a visible focus ring,
 *   exposes its state, and the mount returns to a deterministic default:
 *   through its reset where it registers one, and otherwise by returning
 *   each control by keyboard to the exact default state digest;
 * - `VAL-B2-VIZ-008`: a settled mount changes nothing on its own over an
 *   idle window under both motion preferences, and a numeric readout that
 *   is not source data sits in a self-labelled frame;
 * - `VAL-B2-VIZ-016` and `VAL-EDU-038`: per transition, pointer and keyboard
 *   reach the same state, focus stays on the operated control, no action is
 *   announced twice, every designated readout that changed was
 *   spoken (by its polite region, by the frame's announcer, or by the
 *   slider's own value text), ids stay unique, names contain the visible
 *   label, focus order follows the document, and what hover reveals focus
 *   reveals too;
 * - `VAL-EDU-015`: the runtime default a fresh load renders is the one the
 *   ledger measured, every transition returns to it, and each of the
 *   source's sealed `baseline:brand-v2` behavioural defaults is unchanged,
 *   approved by an exact delta chain, or belongs to a source the seal never
 *   held.
 *
 * The designated readout is the figure's DOM-text readout (the settled
 * reading of VAL-EDU-038): chart descriptions and data tables track the
 * controls by design and are never live regions, so they are not readouts.
 */

export const INTERACTIVE_LEDGER_EVIDENCE_PATH = 'evidence/brand-v2/interactive-ledger.json';

/** The sweep whose own bytes decide what this evidence recorded. */
export const INTERACTIVE_LEDGER_SWEEP_MODULE = 'tests/e2e/brand-v2-interactive-states.spec.ts';

export const INTERACTIVE_LEDGER_VERSION = 1;

/** The ledger quantifies over the registry's production mounts. */
export const INTERACTIVE_LEDGER_POPULATION_SOURCE = 'contract/brand-v2-registries.json#interactive.mounts';

/** The desktop page frame every transition is driven at. */
export const INTERACTIVE_LEDGER_VIEWPORT = { id: '1440x900', width: 1440, height: 900 } as const;

/** How long a settled mount is watched with no input. */
export const IDLE_WINDOW_MS = 3000;

export const IDLE_MOTION_MODES = ['no-preference', 'reduce'] as const;
export type IdleMotion = (typeof IDLE_MOTION_MODES)[number];

/**
 * How long a transition's announcements are collected: the settle the
 * figure announcer waits for, the fold relay's extra 200 ms, the 50 ms
 * write and a margin, so a spoken result is never cut off.
 */
export const ANNOUNCEMENT_WINDOW_MS = READOUT_SETTLE_MS + 200 + 50 + 300;

/** The figure's designated DOM-text readouts. */
export const READOUT_SELECTOR =
  '[data-figure-readout], [data-readout], [data-figure-control-value], [data-testid$="-readout"]';

/** Live regions, as the figure's own announcer and fold relay read them. */
export const LIVE_REGION_SELECTOR = '[aria-live], [role="status"], [role="log"], [role="alert"], output';

export const LEDGER_ASSERTIONS = [
  'VAL-B2-VIZ-002',
  'VAL-B2-VIZ-007',
  'VAL-B2-VIZ-008',
  'VAL-B2-VIZ-016',
  'VAL-EDU-015',
  'VAL-EDU-038',
] as const;
export type LedgerAssertion = (typeof LEDGER_ASSERTIONS)[number];

/** The ledger rows the product enforcement map carries. */
export const LEDGER_ENFORCED_ASSERTIONS = [
  'VAL-B2-VIZ-002',
  'VAL-B2-VIZ-007',
  'VAL-B2-VIZ-008',
  'VAL-B2-VIZ-016',
] as const;

export type SpokenTransition = {
  mountId: string;
  /** The controls, by accessible name, whose result must be spoken. */
  controls: readonly string[];
  /** What one of the transition's announcements must say. */
  says: RegExp;
  /** Why nothing else would speak for it. */
  because: string;
};

/**
 * Transitions whose result only the drawing shows unless a live region says
 * it. A designated readout that changes unspoken already fails; these
 * controls move no readout, so the ledger requires each recorded transition
 * that moved the control's own state to carry an announcement saying its
 * result, and at least one such transition to be recorded at all.
 */
export const SPOKEN_TRANSITIONS: readonly SpokenTransition[] = [
  {
    mountId: 'mount:/manipulation/generalist-policies/:GeneralistReleaseTimeline:1',
    controls: ['Downloadable only', 'All', 'Downloadable', 'Not downloadable', 'Not disclosed'],
    says: /^(?:All \d+ shown|\d+ of \d+ shown: [a-z ]+ only)$/,
    because: 'a filter fades the other rows in place and keeps the selected card, so the polite card does not change',
  },
];

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export type LedgerCase = {
  id: string;
  kind: string;
  selector: string | null;
  notApplicableReason: string | null;
};

export type LedgerPlanMount = CapturePlanMount & {
  /** The route section whose test sweeps this mount. */
  group: string;
  cases: LedgerCase[];
};

export type InteractiveLedgerPlan = {
  mounts: LedgerPlanMount[];
  groups: Array<{ id: string; mountIds: string[] }>;
};

/** The section of the site a route belongs to: its first path segment. */
export function ledgerGroupOf(route: string): string {
  return route.split('/').filter(Boolean)[0] ?? 'home';
}

/**
 * The ledger plan, from the registry alone: the capture plan's mounts in
 * its order, each with its registered cases, grouped by site section so
 * each section is swept by its own test.
 */
export function interactiveLedgerPlan(registry: Pick<BrandV2Registry, 'interactive'>): InteractiveLedgerPlan {
  const capture = interactiveCapturePlan(registry);
  const registered = new Map(registry.interactive.mounts.map((mount) => [mount.id, mount]));
  const mounts = capture.mounts.map((mount) => ({
    ...mount,
    group: ledgerGroupOf(mount.route),
    cases: registered.get(mount.mountId)!.cases.map((stateCase) => ({
      id: stateCase.id,
      kind: stateCase.kind,
      selector: 'selector' in stateCase && typeof stateCase.selector === 'string' ? stateCase.selector : null,
      notApplicableReason: stateCase.notApplicableReason ?? null,
    })),
  }));
  if (mounts.length === 0) throw new Error('the interactive ledger plan has no mounts');
  const groupIds = [...new Set(mounts.map(({ group }) => group))].sort((a, b) => a.localeCompare(b));
  return {
    mounts,
    groups: groupIds.map((id) => ({
      id,
      mountIds: mounts.filter(({ group }) => group === id).map(({ mountId }) => mountId),
    })),
  };
}

function planFacts(plan: InteractiveLedgerPlan): string {
  return JSON.stringify({
    mounts: plan.mounts.map(({ mountId, group, hasReset, cases }) => [
      mountId,
      group,
      hasReset,
      cases.map(({ id, kind, selector, notApplicableReason }) => [id, kind, selector, notApplicableReason]),
    ]),
    viewport: INTERACTIVE_LEDGER_VIEWPORT,
    idle: [IDLE_WINDOW_MS, IDLE_MOTION_MODES],
    windows: [ANNOUNCEMENT_WINDOW_MS, READOUT_SELECTOR, LIVE_REGION_SELECTOR],
  });
}

/**
 * The fingerprint the sweep records and the generator re-derives: every
 * module a public route reaches, the sweep and what it imports, and the plan.
 */
export function interactiveLedgerEvidenceFingerprint(input: { root: string; plan: InteractiveLedgerPlan }): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: [...routeEntryModules(evidenceClosureGraph(input.root)), INTERACTIVE_LEDGER_SWEEP_MODULE],
    facts: [planFacts(input.plan)],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
  }).fingerprint;
}

/* ------------------------------------------------------------------ */
/* Artifact schema                                                     */
/* ------------------------------------------------------------------ */

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const CONTROL_KINDS = [
  'slider',
  'toggle',
  'action',
  'reset',
  'disclosure',
  'radio',
  'checkbox',
  'select',
  'text',
  'region',
] as const;
export type ControlKind = (typeof CONTROL_KINDS)[number];

const controlSchema = z.object({
  /** Position among the root's controls, in document order. */
  index: z.number().int().min(0),
  kind: z.enum(CONTROL_KINDS),
  /** The accessible name as the browser's accessibility tree computes it. */
  name: z.string(),
  /** The visible label or text a reader sees for it. */
  visibleText: z.string(),
  labelInName: z.boolean(),
  /** A disabled control is outside the tab order by design and is not operated. */
  disabled: z.boolean(),
  /** The fold (`details` summary index) it sits in, or null when it is outside every fold. */
  fold: z.number().int().min(0).nullable(),
  /** Reached by Tab (or by arrow keys inside its radio group) with the keyboard alone. */
  reached: z.boolean(),
  focusVisible: z.boolean(),
  /** The ring drawn while it held keyboard focus. */
  ring: z.object({ style: z.string(), widthPx: z.number(), color: z.string() }),
  /** The registered cases whose selector names it. */
  caseIds: z.array(z.string()),
  /** A slider's value as the page loaded it. */
  defaultValue: z.string().nullable(),
  /** A slider's default value is printed in its visible readout or value text. */
  defaultStated: z.boolean().nullable(),
});

const readoutSchema = z.object({
  key: z.string(),
  before: z.string(),
  after: z.string(),
  /**
   * How the change reached a screen reader; `hidden` when the readout is
   * not rendered after the action (in a closed fold), so nothing reads it.
   */
  announced: z.enum(['unchanged', 'hidden', 'live-region', 'announcer', 'value-text', 'none']),
});

const stateSchema = z.object({
  digest: sha256Schema,
  /** The operated control's own exposed state (value, value text, pressed, checked, open). */
  control: z.string(),
});

const seriesSchema = z.object({
  count: z.number().int().min(0),
  pairs: z.number().int().min(0),
  violations: z.array(z.string()),
});

const transitionSchema = z.object({
  caseId: z.string().min(1),
  control: z.number().int().min(0),
  /** The fold the transition started in, or null for the mount's default state. */
  fold: z.number().int().min(0).nullable(),
  keys: z.array(z.string()).min(1),
  before: stateSchema,
  after: stateSchema,
  /** The control's own state moved, or for an action, a readout moved and was spoken. */
  stateExposed: z.boolean(),
  readouts: z.array(readoutSchema),
  /** What each rendered live region said after the keys, in order, with its time after them. */
  announcements: z.array(z.object({ region: z.string(), politeness: z.string(), text: z.string(), atMs: z.number() })),
  focus: z.object({ after: z.string(), retained: z.boolean(), visible: z.boolean() }),
  duplicateIds: z.array(z.string()),
  /** The pointer doing the same thing from the same state, or why there is no pointer equivalent. */
  pointer: z.union([
    z.object({ action: z.string(), digest: sha256Schema, matches: z.boolean() }),
    z.object({ reason: z.string().min(1) }),
  ]),
  /** How long the transition, its pointer twin and its returns took to drive. */
  durationMs: z.number().int().nonnegative(),
  /** What the transition changed in the root, element by element (at most six lines). */
  changes: z.array(z.string()),
  /**
   * The keyboard return to the state the transition started from: through
   * the control itself, or through the figure's reset where it registers one.
   */
  returned: z.object({
    keys: z.array(z.string()),
    digest: sha256Schema,
    restored: z.boolean(),
    via: z.enum(['none-needed', 'control', 'reset']),
    /** What still differed, when the return did not restore the state. */
    residue: z.array(z.string()),
  }),
  series: seriesSchema.nullable(),
});

const hoverSchema = z.object({
  target: z.string(),
  control: z.number().int().min(0).nullable(),
  hoverRevealed: z.array(z.string()),
  focusRevealed: z.array(z.string()),
});

const caseRecordSchema = z.object({
  caseId: z.string().min(1),
  kind: z.string().min(1),
  status: z.enum(['observed', 'not-applicable', 'source-witness', 'missing']),
  /** Controls in the root that the case's selector names. */
  matched: z.number().int().min(0).nullable(),
  /** Ledger records (controls, transitions or hover readings) the case holds. */
  records: z.number().int().min(0),
  detail: z.string(),
});

const idleSchema = z.object({
  motion: z.enum(IDLE_MOTION_MODES),
  windowMs: z.number().int().positive(),
  /** Mutations of text, values, value text, geometry or run state with no input. */
  mutations: z.number().int().min(0),
  samples: z.array(z.string()),
  digest: sha256Schema,
});

const observationSchema = z.object({
  mountId: z.string().min(1),
  status: z.number().int(),
  default: z.object({
    digest: sha256Schema,
    readouts: z.array(z.string()),
    controls: z.array(z.string()),
    tokens: z.object({ color: z.string(), signal: z.string(), fontFamily: z.string() }),
    geometry: z.object({ widthPx: z.number(), heightPx: z.number(), viewBoxes: z.array(z.string()) }),
    series: seriesSchema.nullable(),
  }),
  focusOrder: z.object({
    expected: z.array(z.string()),
    visited: z.array(z.string()),
    positiveTabindex: z.number().int().min(0),
  }),
  controls: z.array(controlSchema),
  transitions: z.array(transitionSchema),
  hover: z.array(hoverSchema),
  reset: z
    .object({
      reached: z.boolean(),
      focusVisible: z.boolean(),
      fromDigest: sha256Schema,
      keys: z.array(z.string()),
      digest: sha256Schema,
      restored: z.boolean(),
    })
    .nullable(),
  pairwise: z
    .object({
      sliderMoved: z.boolean(),
      discreteChanged: z.boolean(),
      sliderHeld: z.boolean(),
      returned: z.boolean(),
    })
    .nullable(),
  cases: z.array(caseRecordSchema).min(1),
  idle: z.array(idleSchema),
  telemetry: z.object({
    kind: z.string().nullable(),
    numericReadouts: z.array(z.string()),
    selfLabelled: z.boolean(),
  }),
  /** Fresh loads a transition that did not return needed, so the next one started where it should. */
  restores: z.number().int().min(0),
});

export const interactiveLedgerEvidenceSchema = z.object({
  version: z.literal(INTERACTIVE_LEDGER_VERSION),
  fingerprint: z.string().min(1),
  viewport: z.literal(INTERACTIVE_LEDGER_VIEWPORT.id),
  groups: z.array(z.object({ id: z.string().min(1), mountIds: z.array(z.string()) })),
  mountIds: z.array(z.string()),
  observations: z.array(observationSchema),
});

export type InteractiveLedgerEvidence = z.infer<typeof interactiveLedgerEvidenceSchema>;
export type LedgerObservation = z.infer<typeof observationSchema>;
export type LedgerTransition = z.infer<typeof transitionSchema>;
export type LedgerControl = z.infer<typeof controlSchema>;
export type LedgerHover = z.infer<typeof hoverSchema>;
export type LedgerCaseRecord = z.infer<typeof caseRecordSchema>;
export type LedgerIdle = z.infer<typeof idleSchema>;
export type LedgerSeries = z.infer<typeof seriesSchema>;

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

/** The cases whose records are transitions rather than controls or hover readings. */
const TRANSITION_CASE_KINDS = new Set(['slider-boundaries', 'discrete-options']);

/** Control kinds the ledger operates; a reset is pressed in its own reading, a region only takes focus. */
const OPERATED_KINDS = new Set<string>(['slider', 'toggle', 'action', 'disclosure', 'radio', 'checkbox', 'select', 'text']);

/**
 * The fail-closed reader. It refuses a stale fingerprint, another viewport,
 * an empty population, a mount set, group set or reading set that
 * disagrees with the plan in either direction or in order, a reading whose
 * cases are not the registry's in order, a case that holds fewer records
 * than the controls its selector names, a slider or discrete case without
 * transitions, a transition that names no recorded control, a registered
 * reset without its reading, a pairwise case without its reading, and a
 * reading without both idle windows.
 */
export function readInteractiveLedgerEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  plan: InteractiveLedgerPlan;
}): InteractiveLedgerEvidence {
  const evidence = parseEvidenceArtifact(
    interactiveLedgerEvidenceSchema,
    input.artifact,
    INTERACTIVE_LEDGER_EVIDENCE_PATH,
  );
  if (evidence.fingerprint !== input.fingerprint) {
    throw new Error(
      `${INTERACTIVE_LEDGER_EVIDENCE_PATH} is stale: its fingerprint does not match the current mounts, sweep and plan; re-run ${INTERACTIVE_LEDGER_SWEEP_MODULE}`,
    );
  }
  if (input.plan.mounts.length === 0 || evidence.mountIds.length === 0 || evidence.observations.length === 0) {
    throw new Error('the interactive ledger population is empty, so it decides nothing');
  }
  const planMountIds = input.plan.mounts.map(({ mountId }) => mountId);
  const mountDrift = populationDrift('interactive-ledger mounts', evidence.mountIds, planMountIds);
  if (mountDrift) throw new Error(mountDrift);
  const groupDrift = populationDrift(
    'interactive-ledger groups',
    evidence.groups.map(({ id }) => id),
    input.plan.groups.map(({ id }) => id),
  );
  if (groupDrift) throw new Error(groupDrift);
  input.plan.groups.forEach((group, index) => {
    if (!sameList(evidence.groups[index].mountIds, group.mountIds)) {
      throw new Error(`interactive-ledger group ${group.id} holds other mounts than the plan puts in it`);
    }
  });
  const readingDrift = populationDrift(
    'interactive-ledger readings',
    evidence.observations.map(({ mountId }) => mountId),
    planMountIds,
  );
  if (readingDrift) throw new Error(readingDrift);

  let transitions = 0;
  for (const [index, observation] of evidence.observations.entries()) {
    const mount = input.plan.mounts[index];
    const at = observation.mountId;
    const caseDrift = populationDrift(
      `${at} cases`,
      observation.cases.map(({ caseId }) => caseId),
      mount.cases.map(({ id }) => id),
    );
    if (caseDrift) throw new Error(caseDrift);
    const controlIndices = new Set(observation.controls.map(({ index: control }) => control));
    if (controlIndices.size !== observation.controls.length) {
      throw new Error(`${at} records one control index twice`);
    }
    for (const transition of observation.transitions) {
      if (!controlIndices.has(transition.control)) {
        throw new Error(`${at} records a transition of control ${transition.control}, which it never recorded`);
      }
      if (!mount.cases.some(({ id }) => id === transition.caseId)) {
        throw new Error(`${at} records a transition under ${transition.caseId}, which the registry does not hold`);
      }
    }
    transitions += observation.transitions.length;
    for (const [caseIndex, record] of observation.cases.entries()) {
      const planned = mount.cases[caseIndex];
      if (record.kind !== planned.kind) {
        throw new Error(`${at} records ${record.caseId} as ${record.kind}, the registry has ${planned.kind}`);
      }
      if ((record.status === 'not-applicable') !== (planned.notApplicableReason !== null)) {
        throw new Error(`${at} ${record.caseId} is not applicable only if it carries a typed reason, and only then`);
      }
      const held = observation.transitions.filter(({ caseId }) => caseId === record.caseId).length;
      if (planned.selector !== null && record.status === 'observed') {
        if (record.matched === null || record.matched === 0) {
          throw new Error(`${at} ${record.caseId} is observed but its selector named no control in the root`);
        }
        const actual =
          record.kind === 'focus'
            ? observation.controls.length
            : record.kind === 'hover'
              ? observation.hover.filter(({ control }) => control !== null).length
              : held;
        if (record.records !== actual) {
          throw new Error(`${at} ${record.caseId} claims ${record.records} ledger record(s) but holds ${actual}`);
        }
        if (record.records < record.matched) {
          throw new Error(
            `${at} ${record.caseId} holds ${record.records} ledger record(s) for ${record.matched} control(s): a record was omitted`,
          );
        }
      }
      if (TRANSITION_CASE_KINDS.has(record.kind) && record.status === 'observed' && planned.selector !== null && held === 0) {
        throw new Error(`${at} ${record.caseId} is observed but records no transition`);
      }
    }
    for (const control of observation.controls) {
      if (control.disabled || !OPERATED_KINDS.has(control.kind)) continue;
      if (!observation.transitions.some((transition) => transition.control === control.index)) {
        throw new Error(`${at} records no transition of its ${control.kind} control ${control.index}: a record was omitted`);
      }
    }
    if (mount.hasReset && observation.reset === null) {
      throw new Error(`${at} registers a reset but the ledger holds no reset reading`);
    }
    const pairwise = mount.cases.some(({ kind, notApplicableReason }) => kind === 'pairwise' && !notApplicableReason);
    if (pairwise && observation.pairwise === null) {
      throw new Error(`${at} registers a pairwise case but the ledger holds no pairwise reading`);
    }
    const motions = observation.idle.map(({ motion }) => motion);
    if (!sameList(motions, IDLE_MOTION_MODES)) {
      throw new Error(`${at} records idle windows ${motions.join('/') || 'none'}, not ${IDLE_MOTION_MODES.join('/')}`);
    }
  }
  if (transitions === 0) throw new Error('the interactive ledger records no transition at all');
  return evidence;
}

/* ------------------------------------------------------------------ */
/* Sealed source defaults (VAL-EDU-015)                                 */
/* ------------------------------------------------------------------ */

/** The pattern `scripts/brand-v2-baseline.ts` seals behavioural defaults with. */
const BEHAVIORAL_DEFAULT_PATTERN =
  /\b(?:DEFAULT_[A-Z0-9_]+|INITIAL_[A-Z0-9_]+|default[A-Z][A-Za-z0-9]*|initial[A-Z][A-Za-z0-9]*)\b[^\n]{0,180}/g;

export type SourceDefaultMember = {
  memberId: string;
  status: 'unchanged' | 'approved' | 'new-source' | 'unapproved';
  change: 'changed' | 'added' | 'removed' | null;
};

export type SourceDefaultJoin = {
  sourcePath: string;
  /** The seal held this source, so its defaults are preserved rather than defined. */
  sealed: boolean;
  members: SourceDefaultMember[];
};

/** A source's behavioural-default members, hashed as the seal hashes them. */
export function behavioralDefaultMembers(sourcePath: string, text: string): Array<{ id: string; hash: string }> {
  const inputs = [...text.matchAll(BEHAVIORAL_DEFAULT_PATTERN)].map((match, index) => ({
    id: `default:${sourcePath}:${index + 1}`,
    value: { expression: match[0].replace(/\s+/g, ' ').trim() },
  }));
  if (inputs.length === 0) return [];
  return buildManifest('behavioral-defaults', inputs).members.map(({ id, hash }) => ({ id, hash }));
}

/**
 * Joins one source's current behavioural defaults to the sealed ones. A
 * member is unchanged, approved by one complete exact delta chain from the
 * seal, or belongs to a source the seal never held (a figure that defines
 * new state); anything else is unapproved drift.
 */
export function joinSourceDefaults(input: {
  sourcePath: string;
  text: string;
  baseline: Pick<BaselineBundle, 'manifests'>;
  deltas: readonly ApprovedDelta[];
}): SourceDefaultJoin {
  const sealed = input.baseline.manifests['interactive-sources-mounts'].members.some(
    ({ id }) => id === `source:${input.sourcePath}`,
  );
  const prefix = `default:${input.sourcePath}:`;
  const before = new Map(
    input.baseline.manifests['behavioral-defaults'].members
      .filter(({ id }) => id.startsWith(prefix))
      .map(({ id, hash }) => [id, hash]),
  );
  const after = new Map(behavioralDefaultMembers(input.sourcePath, input.text).map(({ id, hash }) => [id, hash]));
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a.localeCompare(b));
  const members = ids.map((memberId): SourceDefaultMember => {
    const oldHash = before.get(memberId);
    const newHash = after.get(memberId);
    if (oldHash === newHash) return { memberId, status: 'unchanged', change: null };
    const change = oldHash === undefined ? 'added' : newHash === undefined ? 'removed' : 'changed';
    if (!sealed) return { memberId, status: 'new-source', change };
    const approval = approvedDeltaPath(
      input.deltas.filter((delta) => delta.manifest === 'behavioral-defaults' && delta.memberId === memberId),
      oldHash ?? sha256('missing'),
      newHash ?? sha256('missing'),
    );
    return { memberId, status: approval.status === 'approved' ? 'approved' : 'unapproved', change };
  });
  return { sourcePath: input.sourcePath, sealed, members };
}

/** Every planned source's join, read from the tree, the seal and the approved deltas. */
export function interactiveLedgerSourceJoins(root: string, plan: InteractiveLedgerPlan): Map<string, SourceDefaultJoin> {
  const baseline = JSON.parse(
    readFileSync(join(root, 'evidence/brand-v2/baseline/baseline.json'), 'utf8'),
  ) as BaselineBundle;
  const deltas = (
    JSON.parse(readFileSync(join(root, 'contract/brand-v2-approved-deltas.json'), 'utf8')) as { entries: ApprovedDelta[] }
  ).entries;
  const joins = new Map<string, SourceDefaultJoin>();
  for (const { sourcePath } of plan.mounts) {
    if (joins.has(sourcePath)) continue;
    joins.set(
      sourcePath,
      joinSourceDefaults({ sourcePath, text: readFileSync(join(root, sourcePath), 'utf8'), baseline, deltas }),
    );
  }
  return joins;
}

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

export type InteractiveLedgerVerdict = {
  id: string;
  failures: Record<LedgerAssertion, string[]>;
  /**
   * The `VAL-EDU-015` failures that are sealed-default drift: a member of
   * the source's `baseline:brand-v2` behavioural defaults that changed with
   * no approved delta. They are the same comparison the baseline gate makes
   * (`VAL-B2-BASE-011`) and close only through approved deltas.
   */
  sealedDefaultDrift: string[];
  observed: {
    route: string;
    sourceId: string;
    controls: number;
    transitions: number;
    announcements: number;
    seriesStates: number;
    sliderStatesCompared: number;
    idleMutations: Record<IdleMotion, number>;
    reset: 'restored' | 'not-restored' | 'not-registered';
    sourceDefaults: Record<SourceDefaultMember['status'], number>;
  };
};

const SLIDER_KEYS = new Set(['End', 'Home']);

const spokenWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/\.(?!\d)/g, ' ')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .trim();
/** Numbers by size: one region says "x -0.23" where another says "0.23 left". */
const spokenNumbers = (text: string) =>
  (text.replace(/[\u2212\u2013]/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Math.abs(Number(n.replace(/,/g, ''))));

/**
 * Pairs of announcements of one action that say the same thing: the same
 * words twice, or two regions where one says no number the other does not.
 * One region telling a run pause by pause ("settling", then "balanced")
 * says new things each time and is not a duplicate.
 */
export function duplicateAnnouncements(
  announcements: ReadonlyArray<{ region: string; text: string }>,
): string[] {
  const found: string[] = [];
  announcements.forEach((first, i) => {
    for (const second of announcements.slice(i + 1)) {
      const same = spokenWords(first.text) === spokenWords(second.text);
      const a = spokenNumbers(first.text);
      const b = spokenNumbers(second.text);
      const covered =
        first.region !== second.region &&
        a.length > 0 &&
        b.length > 0 &&
        (a.every((n) => b.includes(n)) || b.every((n) => a.includes(n)));
      if (same || covered) {
        found.push(`${first.region} "${first.text.slice(0, 60)}" and ${second.region} "${second.text.slice(0, 60)}"`);
      }
    }
  });
  return found;
}

/**
 * Each mount's six verdicts, decided from what the ledger recorded. A
 * clause the mount cannot hit (no slider, no fold, no reset) is not
 * evaluated for it; every clause it can hit is.
 */
export function interactiveLedgerVerdicts(
  evidence: InteractiveLedgerEvidence,
  plan: InteractiveLedgerPlan,
  joins: ReadonlyMap<string, SourceDefaultJoin>,
): Map<string, InteractiveLedgerVerdict> {
  const verdicts = new Map<string, InteractiveLedgerVerdict>();
  const mounts = new Map(plan.mounts.map((mount) => [mount.mountId, mount]));
  evidence.observations.forEach((observation) => {
    const mount = mounts.get(observation.mountId);
    if (!mount) throw new Error(`${observation.mountId} is not a planned mount`);
    const failures = Object.fromEntries(LEDGER_ASSERTIONS.map((id) => [id, [] as string[]])) as Record<
      LedgerAssertion,
      string[]
    >;
    const fail = (id: LedgerAssertion, message: string) => failures[id].push(message);
    const controlAt = new Map(observation.controls.map((control) => [control.index, control]));
    const named = (control: number) => {
      const row = controlAt.get(control);
      return row ? `${row.kind} "${row.name || row.visibleText}"` : `control ${control}`;
    };

    if (observation.status !== 200) {
      for (const id of LEDGER_ASSERTIONS) fail(id, `the route answered ${observation.status}`);
    }

    // VAL-B2-VIZ-002: every series pair in every recorded state.
    const seriesStates = [
      ...(observation.default.series ? [['default', observation.default.series] as const] : []),
      ...observation.transitions.flatMap((transition) =>
        transition.series ? [[`${named(transition.control)} ${transition.keys.join('+')}`, transition.series] as const] : [],
      ),
    ];
    for (const [state, series] of seriesStates) {
      for (const violation of series.violations) fail('VAL-B2-VIZ-002', `${state}: ${violation}`);
    }
    // A slider end state is compared exactly when the ledger re-read its
    // series there; on a mount that draws several series every end state of
    // every operated slider must be one, so a planned state cannot drop out.
    const sliderEnds = observation.transitions.filter(
      (transition) =>
        controlAt.get(transition.control)?.kind === 'slider' && transition.keys.some((key) => SLIDER_KEYS.has(key)),
    );
    const sliderStatesCompared = sliderEnds.filter(({ series }) => (series?.count ?? 0) >= 2).length;
    const multiSeries = seriesStates.some(([, series]) => series.count >= 2);
    const hasSliderCase = mount.cases.some(({ kind, notApplicableReason }) => kind === 'slider-boundaries' && !notApplicableReason);
    if (hasSliderCase && multiSeries) {
      for (const control of observation.controls) {
        if (control.kind !== 'slider' || control.disabled) continue;
        const ends = sliderEnds.filter((transition) => transition.control === control.index);
        if (ends.length === 0) {
          fail('VAL-B2-VIZ-002', `${named(control.index)}: no end state was reached, so its series were never compared there`);
        }
        for (const end of ends.filter(({ series }) => series === null)) {
          fail('VAL-B2-VIZ-002', `${named(control.index)} ${end.keys.join('+')}: the series were not re-read in this end state`);
        }
      }
    }

    // VAL-B2-VIZ-007: keyboard reach, visible focus, exposed state, deterministic return.
    for (const record of observation.cases) {
      if (record.status !== 'missing') continue;
      fail('VAL-B2-VIZ-007', `registered case ${record.caseId} was not observed: ${record.detail}`);
      fail('VAL-B2-VIZ-016', `registered case ${record.caseId} was not observed: ${record.detail}`);
    }
    for (const control of observation.controls) {
      if (control.disabled) continue;
      if (!control.reached) fail('VAL-B2-VIZ-007', `${named(control.index)} is not reached by the keyboard`);
      else if (!control.focusVisible || control.ring.style === 'none' || control.ring.widthPx < 1) {
        fail('VAL-B2-VIZ-007', `${named(control.index)} shows no visible focus ring under keyboard focus`);
      }
      if (control.kind === 'slider' && !mount.hasReset && control.defaultStated !== true) {
        fail('VAL-B2-VIZ-007', `${named(control.index)} does not state its default value in a visible readout`);
      }
    }
    for (const transition of observation.transitions) {
      const control = controlAt.get(transition.control);
      if (control?.kind === 'slider' && !transition.keys.every((key) => /^(End|Home|Arrow(Up|Down|Left|Right)|Page(Up|Down))$/.test(key))) {
        fail('VAL-B2-VIZ-007', `${named(transition.control)} was driven by ${transition.keys.join('+')}, not by slider keys`);
      }
      if (!transition.stateExposed) {
        fail('VAL-B2-VIZ-007', `${named(transition.control)} ${transition.keys.join('+')} exposes no state change`);
      }
      if (!transition.returned.restored) {
        fail(
          'VAL-B2-VIZ-007',
          `${named(transition.control)} ${transition.keys.join('+')} does not return by keyboard to the state it left`,
        );
      }
    }
    if (mount.hasReset) {
      const reset = observation.reset!;
      if (!reset.reached || !reset.focusVisible) fail('VAL-B2-VIZ-007', 'the reset is not reached by the keyboard with a visible ring');
      if (reset.fromDigest === observation.default.digest) fail('VAL-B2-VIZ-007', 'the reset was pressed from the default state, so it proved nothing');
      if (!reset.restored) fail('VAL-B2-VIZ-007', 'the reset, pressed by keyboard, does not restore the exact default state');
    }
    if (observation.pairwise) {
      const pair = observation.pairwise;
      // A preset may set the slider (a camera preset sets its delay), so the
      // slider holding its value is recorded, not required.
      if (!pair.sliderMoved || !pair.discreteChanged || !pair.returned) {
        fail('VAL-B2-VIZ-007', `the slider and a discrete option were not both operated and returned by keyboard (${JSON.stringify(pair)})`);
      }
    }

    // VAL-B2-VIZ-008: nothing moves on its own; numbers that are not source data say so.
    for (const idle of observation.idle) {
      if (idle.windowMs < IDLE_WINDOW_MS) {
        fail('VAL-B2-VIZ-008', `the idle window under ${idle.motion} motion drew for only ${idle.windowMs} of ${IDLE_WINDOW_MS} ms`);
      }
      if (idle.mutations > 0) {
        fail(
          'VAL-B2-VIZ-008',
          `${idle.mutations} change(s) with no input over ${idle.windowMs} ms under ${idle.motion} motion: ${idle.samples.slice(0, 3).join('; ')}`,
        );
      }
    }
    const telemetry = observation.telemetry;
    if (telemetry.kind === null) fail('VAL-B2-VIZ-008', 'the source has no data classification');
    else if (telemetry.kind !== 'source-data' && telemetry.numericReadouts.length > 0 && !telemetry.selfLabelled) {
      fail('VAL-B2-VIZ-008', `numeric readouts of a ${telemetry.kind} frame carry no self-label: ${telemetry.numericReadouts[0]}`);
    }

    // VAL-B2-VIZ-016 and VAL-EDU-038: per transition parity, focus and speech.
    for (const transition of observation.transitions) {
      const label = `${named(transition.control)} ${transition.keys.join('+')}`;
      if ('matches' in transition.pointer && !transition.pointer.matches) {
        fail('VAL-B2-VIZ-016', `${label}: the pointer (${transition.pointer.action}) reaches another state than the keyboard`);
      }
      if (!transition.focus.retained) {
        const message = `${label}: focus left the operated control for ${transition.focus.after}`;
        fail('VAL-B2-VIZ-016', message);
        fail('VAL-EDU-038', message);
      }
      if (transition.duplicateIds.length > 0) {
        fail('VAL-B2-VIZ-016', `${label}: duplicate ids ${transition.duplicateIds.slice(0, 3).join(', ')}`);
      }
      for (const duplicate of duplicateAnnouncements(transition.announcements)) {
        const message = `${label}: one action is announced twice, ${duplicate}`;
        fail('VAL-B2-VIZ-016', message);
        fail('VAL-EDU-038', message);
      }
      for (const readout of transition.readouts) {
        if (readout.announced !== 'none') continue;
        const message = `${label}: readout ${readout.key} changed ("${readout.before.slice(0, 40)}" to "${readout.after.slice(0, 40)}") without being spoken`;
        fail('VAL-B2-VIZ-016', message);
        fail('VAL-EDU-038', message);
      }
    }
    for (const required of SPOKEN_TRANSITIONS.filter(({ mountId }) => mountId === observation.mountId)) {
      const moved = observation.transitions.filter(
        (transition) =>
          required.controls.includes(controlAt.get(transition.control)?.name ?? '') &&
          transition.before.control !== transition.after.control,
      );
      const fails = (message: string) => {
        fail('VAL-B2-VIZ-016', message);
        fail('VAL-EDU-038', message);
      };
      if (moved.length === 0) {
        fails(`no transition of ${required.controls.join(', ')} that moved its state was recorded, so its result was never heard`);
      }
      for (const transition of moved) {
        if (transition.announcements.some(({ text }) => required.says.test(text))) continue;
        const said = transition.announcements.map(({ text }) => `"${text.slice(0, 60)}"`).join(', ') || 'nothing';
        fails(`${named(transition.control)} ${transition.keys.join('+')}: its result is not spoken (${required.because}); live regions said ${said}`);
      }
    }
    for (const control of observation.controls) {
      if (!control.labelInName) {
        fail('VAL-B2-VIZ-016', `${named(control.index)}: its name "${control.name}" does not contain its visible label "${control.visibleText}"`);
      }
    }
    for (const hover of observation.hover) {
      const focus = new Set(hover.focusRevealed);
      const missing = hover.hoverRevealed.filter((line) => !focus.has(line));
      const extra = hover.focusRevealed.filter((line) => !hover.hoverRevealed.includes(line));
      if (missing.length > 0 || extra.length > 0) {
        fail(
          'VAL-B2-VIZ-016',
          `${hover.target}: hover reveals [${hover.hoverRevealed.join(' | ')}] but focus reveals [${hover.focusRevealed.join(' | ')}]`,
        );
      }
    }
    const order = observation.focusOrder;
    if (order.positiveTabindex > 0) fail('VAL-B2-VIZ-016', `${order.positiveTabindex} positive tabindex value(s) reorder focus`);
    if (!sameList(order.visited, order.expected)) {
      fail('VAL-B2-VIZ-016', `Tab visits [${order.visited.join(', ')}], document order is [${order.expected.join(', ')}]`);
    }

    // VAL-EDU-015: the runtime default is deterministic and its sealed source defaults hold.
    for (const idle of observation.idle) {
      if (idle.motion === 'reduce' && idle.digest !== observation.default.digest) {
        fail('VAL-EDU-015', 'a fresh load renders another default state than the one the ledger measured');
      }
    }
    if (observation.transitions.some(({ returned }) => !returned.restored)) {
      fail('VAL-EDU-015', 'a keyboard transition does not return to the default it left');
    }
    if (mount.hasReset && !observation.reset?.restored) fail('VAL-EDU-015', 'the reset does not restore the default');
    const join = joins.get(mount.sourcePath);
    if (!join) fail('VAL-EDU-015', `${mount.sourcePath} has no sealed-default join`);
    const sourceDefaults = { unchanged: 0, approved: 0, 'new-source': 0, unapproved: 0 };
    const sealedDefaultDrift: string[] = [];
    for (const member of join?.members ?? []) {
      sourceDefaults[member.status] += 1;
      if (member.status === 'unapproved') {
        const message = `${member.memberId} is ${member.change} without an approved delta`;
        sealedDefaultDrift.push(message);
        fail('VAL-EDU-015', message);
      }
    }

    verdicts.set(observation.mountId, {
      id: observation.mountId,
      failures,
      sealedDefaultDrift,
      observed: {
        route: mount.route,
        sourceId: mount.sourceId,
        controls: observation.controls.length,
        transitions: observation.transitions.length,
        announcements: observation.transitions.reduce((total, { announcements }) => total + announcements.length, 0),
        seriesStates: seriesStates.length,
        sliderStatesCompared,
        idleMutations: Object.fromEntries(observation.idle.map(({ motion, mutations }) => [motion, mutations])) as Record<
          IdleMotion,
          number
        >,
        reset: !mount.hasReset ? 'not-registered' : observation.reset?.restored ? 'restored' : 'not-restored',
        sourceDefaults,
      },
    });
  });
  return verdicts;
}
