import { z } from 'zod';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  SHIPPED_GEOMETRY_MODEL_CLASS,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from './brand-v2-evidence-closure.ts';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * The control-states evidence family: the persisted browser sweep behind
 * `VAL-B2-COMP-002`, `-005`, `-007`, `-011` and `-015`.
 *
 * The sweep visits every registered public route state at a phone and a
 * desktop width and reads every rendered control the registry governs: its
 * paint at rest, under the pointer, while the pointer is held down and under
 * keyboard focus, the ARIA it exposes in each of those moments, its selected
 * and disabled states, the icons it carries, and the clear, copy, sort,
 * reset, disclosure and close actions it performs from the keyboard.
 *
 * Its members are the rows of the controls registry
 * (`contract/brand-v2-registries.json#controls`), so a row is decided over
 * every rendered instance of that registered control. A registered row the
 * routes never render (`mountState: library-only`) is not applicable; a
 * production row the sweep never met is a failure, never a pass.
 */

export const CONTROL_STATES_EVIDENCE_PATH = 'evidence/brand-v2/control-states.json';
export const CONTROL_STATES_SWEEP_MODULE = 'tests/e2e/brand-v2-control-states.spec.ts';
export const CONTROL_STATES_POPULATION_SOURCE = 'contract/brand-v2-registries.json#controls';
export const CONTROL_STATES_VERSION = 1;

export const CONTROL_STATE_VIEWPORTS = [
  { id: '375x812', width: 375, height: 812 },
  { id: '1440x900', width: 1440, height: 900 },
] as const;

export const CONTROL_STATE_ASSERTIONS = [
  'VAL-B2-COMP-002',
  'VAL-B2-COMP-005',
  'VAL-B2-COMP-007',
  'VAL-B2-COMP-011',
  'VAL-B2-COMP-015',
] as const;
export type ControlStateAssertion = (typeof CONTROL_STATE_ASSERTIONS)[number];

/** The lime the retired brand-v2 selection painted; any trace of it fails. */
export const RETIRED_LIME_RGB = 'rgb(198, 255, 25)';
/** The minimum weight step that counts as a selection cue on its own. */
export const SELECTED_WEIGHT_STEP = 200;
/** Paper, the only ground a selected chip may sit on besides transparency. */
export const PAPER_RGB = 'rgb(250, 250, 248)';
/** The status tokens a page-ground status chip paints its word in. */
export const STATUS_CHIP_RGB: Readonly<Record<string, string>> = {
  ok: 'rgb(26, 111, 69)',
  warn: 'rgb(138, 90, 0)',
  err: 'rgb(165, 42, 30)',
};

/** The action kinds `VAL-B2-COMP-005` names, plus the icon-only close. */
export const CONTROL_ACTION_KINDS = [
  'clear',
  'copy-link',
  'copy-code',
  'sort',
  'reset',
  'disclosure',
  'close',
] as const;
export type ControlActionKind = (typeof CONTROL_ACTION_KINDS)[number];

/**
 * The state clauses an observation can be decided on. An exemption names
 * the clauses it covers, and nothing else is excused.
 */
export const CONTROL_STATE_CLAUSES = [
  'hover-distinct',
  'pressed-distinct',
  'focus-visible-distinct',
  'selected-distinct',
  'selected-unfilled',
  'disabled-distinct',
  'disabled-neutral',
] as const;
export type ControlStateClause = (typeof CONTROL_STATE_CLAUSES)[number];

export type ControlStateExemption = {
  id: string;
  selector: string;
  routes: readonly string[];
  clauses: readonly ControlStateClause[];
  reason: string;
};

const OWNER_FREEZE =
  'Josef, 12 October 2026: "Leave /how-robots-work/ exactly as it is." The explainer viewer keeps its frozen look on its own page and as home\'s featured scene, its controls included; its state paint is a known owner-gated difference, not drift. Its ARIA, disabled exposure and activation are still decided.';

/**
 * The checked-in exemption register. Each entry is scoped to a selector, the
 * routes it may be used on and the paint clauses its reason covers. A clause
 * the sweep never needed is refused, so no entry stands as an allowance.
 */
export const CONTROL_STATE_EXEMPTIONS: readonly ControlStateExemption[] = [
  {
    id: 'owner-freeze:explainers',
    selector: '[data-explainers]',
    routes: ['/', '/how-robots-work/'],
    clauses: ['hover-distinct', 'pressed-distinct', 'selected-unfilled'],
    reason: OWNER_FREEZE,
  },
];

/** The registry slice the sweep and the verdicts read. */
export type ControlStateRegistry = {
  routes: { public: ReadonlyArray<{ path: string }> };
  controls: ReadonlyArray<{
    id: string;
    statePurpose: string;
    supportedStates: readonly string[];
    mountState: string;
    disabledException: string | null;
  }>;
};

function registryFacts(registry: ControlStateRegistry): string {
  return JSON.stringify(
    registry.controls.map(({ id, statePurpose, supportedStates, mountState, disabledException }) => [
      id,
      statePurpose,
      supportedStates,
      mountState,
      disabledException,
    ]),
  );
}

/**
 * The fingerprint the sweep records and the generator re-derives: every
 * module a public route reaches, this sweep and this module, the swept route
 * states, the control registry rows and the exemption register. Restyling a
 * control or moving a registry row without re-running the sweep is a
 * stale-evidence failure, not a preserved green row.
 */
export function controlStatesEvidenceFingerprint(input: {
  root: string;
  routes: readonly string[];
  registry: ControlStateRegistry;
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: [
      ...routeEntryModules(evidenceClosureGraph(input.root)),
      CONTROL_STATES_SWEEP_MODULE,
    ],
    nonImportClasses: [SHIPPED_GEOMETRY_MODEL_CLASS],
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
    facts: [
      [...input.routes].sort().join(','),
      registryFacts(input.registry),
      JSON.stringify(CONTROL_STATE_EXEMPTIONS),
      JSON.stringify(CONTROL_STATE_VIEWPORTS),
      [RETIRED_LIME_RGB, PAPER_RGB, String(SELECTED_WEIGHT_STEP)].join(','),
      JSON.stringify(STATUS_CHIP_RGB),
    ],
  }).fingerprint;
}

/* ------------------------------------------------------------------ */
/* Observation schema                                                  */
/* ------------------------------------------------------------------ */

const diffSchema = z.object({
  changed: z.array(z.string()),
  changedCount: z.number().int().min(0),
});

const variantSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  member: z.string(),
  variant: z.string(),
  instances: z.number().int().min(1),
  element: z.string(),
  name: z.string(),
  disabled: z.boolean(),
  selected: z.enum(['selected', 'unselected', 'none']),
  exemption: z.string().nullable(),
  /** Where the pointer could not reach the control, why. */
  pointer: z.enum(['reachable', 'offscreen-until-focus', 'covered']),
  coveredBy: z.string().nullable(),
  hover: diffSchema.nullable(),
  pressed: diffSchema.nullable(),
  focusVisible: diffSchema.extend({ matched: z.boolean() }).nullable(),
  transientAria: z.object({
    hover: z.array(z.string()),
    pressed: z.array(z.string()),
  }),
  restStable: z.boolean(),
});

const cuesSchema = z.object({
  underline: z.boolean(),
  rule: z.boolean(),
  weightStep: z.number(),
  glyph: z.boolean(),
  colour: z.boolean(),
  nativeMark: z.boolean(),
});

const selectionSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  member: z.string(),
  variant: z.string(),
  element: z.string(),
  name: z.string(),
  /** The semantic state attribute that carries the selection, if any. */
  semantic: z.enum(['aria-pressed', 'aria-selected', 'aria-checked', 'checked', 'aria-expanded', 'aria-current']).nullable(),
  method: z.enum(['rendered-pair', 'activated']),
  diff: diffSchema,
  cues: cuesSchema,
  paint: z.object({
    background: z.string(),
    colour: z.string(),
    lime: z.boolean(),
    radiusPx: z.number(),
    heightPx: z.number(),
  }),
  /**
   * Whether the sweep returned the control to its prior state. Null is a
   * one-way choice by design: a native radio group that had nothing chosen
   * and offers no reset, which no input can return to "nothing chosen".
   */
  restored: z.boolean().nullable(),
  exemption: z.string().nullable(),
});

const disabledSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  member: z.string(),
  element: z.string(),
  name: z.string(),
  native: z.boolean(),
  ariaDisabled: z.boolean(),
  enabledDiff: diffSchema,
  neutral: z.object({
    cursor: z.string(),
    opacity: z.number(),
    enabledOpacity: z.number(),
    colour: z.string(),
    enabledColour: z.string(),
    background: z.string(),
    attenuated: z.boolean(),
    activeFill: z.boolean(),
  }),
  activation: z.object({
    pointerChanged: z.boolean(),
    keyboardChanged: z.boolean().nullable(),
    navigated: z.boolean(),
  }),
  exemption: z.string().nullable(),
});

const unexposedDisabledSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  member: z.string(),
  element: z.string(),
  cue: z.string(),
});

const actionSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  member: z.string(),
  kind: z.enum(CONTROL_ACTION_KINDS),
  element: z.string(),
  name: z.string(),
  visibleText: z.string(),
  nameContainsVisibleText: z.boolean(),
  focusVisible: z.boolean(),
  performed: z.boolean(),
  restored: z.boolean().nullable(),
  detail: z.string(),
});

const iconSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  /** The registered control that owns a functional icon, else null. */
  member: z.string().nullable(),
  role: z.enum(['functional', 'decorative', 'informative', 'figure', 'exposed-unnamed']),
  count: z.number().int().min(1),
  element: z.string(),
  ownerName: z.string(),
  hidden: z.boolean(),
  focusable: z.boolean(),
});

const statusChipSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  kind: z.enum(['badge', 'stage']),
  variant: z.string(),
  count: z.number().int().min(1),
  text: z.string(),
  colour: z.string(),
  background: z.string(),
  radiusPx: z.number(),
  heightPx: z.number(),
  lime: z.boolean(),
  borderStyle: z.string(),
  fontWeight: z.number(),
});

/**
 * What the browser found on one page before it measured anything: the
 * population each observation family must account for, one observation per
 * counted item. The reader reconciles every family against it, so an
 * observation the artifact lost (or never took) is a shortfall, and an
 * observation it holds twice is a surplus.
 */
const censusSchema = z.object({
  /** Distinct rendered variants per member; each is read once, its `instances` summing to the page count. */
  variants: z.record(z.string(), z.number().int().min(1)),
  /** Distinct disabled variants per member; each is clicked and keyed once. */
  disabled: z.record(z.string(), z.number().int().min(1)),
  /** Rendered controls that look unavailable without exposing it. */
  unexposedDisabled: z.number().int().min(0),
  /** Selection kinds per member: one selected-state read each, a segmented container read with its segment. */
  selections: z.record(z.string(), z.number().int().min(1)),
  /** Actions per kind: one per distinct idempotent action, every copy-code and reset, every prepared flow's action. */
  actions: z.record(z.string(), z.number().int().min(1)),
  /** Rendered icons, each counted in one icon group. */
  icons: z.number().int().min(0),
  /** Rendered status chips, each counted in one chip group. */
  statusChips: z.number().int().min(0),
});

const pageSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  status: z.number(),
  controls: z.record(z.string(), z.number()),
  unregistered: z.array(z.string()),
  codeBlocks: z.number().int().min(0),
  census: censusSchema,
});

export const controlStatesEvidenceSchema = z.object({
  version: z.literal(CONTROL_STATES_VERSION),
  generatedBy: z.literal(CONTROL_STATES_SWEEP_MODULE),
  fingerprint: z.string(),
  viewports: z.array(z.string()),
  routes: z.array(z.string()),
  pages: z.array(pageSchema),
  variants: z.array(variantSchema),
  selections: z.array(selectionSchema),
  disabled: z.array(disabledSchema),
  unexposedDisabled: z.array(unexposedDisabledSchema),
  actions: z.array(actionSchema),
  icons: z.array(iconSchema),
  statusChips: z.array(statusChipSchema),
});

export type ControlStatesEvidence = z.infer<typeof controlStatesEvidenceSchema>;
export type ControlVariantObservation = z.infer<typeof variantSchema>;
export type ControlSelectionObservation = z.infer<typeof selectionSchema>;
export type ControlDisabledObservation = z.infer<typeof disabledSchema>;
export type ControlActionObservation = z.infer<typeof actionSchema>;
export type ControlIconObservation = z.infer<typeof iconSchema>;
export type StatusChipObservation = z.infer<typeof statusChipSchema>;
export type ControlPageObservation = z.infer<typeof pageSchema>;
export type ControlPageCensus = z.infer<typeof censusSchema>;

/**
 * Reads the persisted sweep and refuses anything it cannot grade honestly:
 * the wrong shape, a stale fingerprint, the wrong viewports, a route state
 * set that disagrees with the registry in either direction, a duplicate or
 * missing route/viewport page, a page that did not load, a control id the
 * registry does not hold, an exemption the register does not grant, and an
 * observation family that falls short of or exceeds its page census.
 */
export function readControlStatesEvidence(input: {
  artifact: unknown;
  fingerprint: string;
  routes: readonly string[];
  registry: ControlStateRegistry;
}): ControlStatesEvidence {
  const envelope = input.artifact as { version?: unknown; fingerprint?: unknown } | null;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('control-states evidence is not an object');
  }
  if (envelope.version !== CONTROL_STATES_VERSION) {
    throw new Error(`control-states evidence version ${String(envelope.version)} is not ${CONTROL_STATES_VERSION}`);
  }
  if (envelope.fingerprint !== input.fingerprint) {
    throw new Error(
      `control-states evidence is stale: a route, a control, the registry or the exemption register changed since the sweep ran. Re-run npx playwright test --config playwright.brand-v2.config.ts ${CONTROL_STATES_SWEEP_MODULE}.`,
    );
  }
  const evidence = parseEvidenceArtifact(controlStatesEvidenceSchema, envelope, 'control-states evidence');

  const expectedRoutes = [...input.routes].sort();
  if (expectedRoutes.length === 0) {
    throw new Error('the swept route population is empty, so every control verdict would pass vacuously');
  }
  if (JSON.stringify([...evidence.routes].sort()) !== JSON.stringify(expectedRoutes)) {
    throw new Error(
      `control-states evidence covers ${evidence.routes.length} route states, not the ${expectedRoutes.length} the registry derives`,
    );
  }
  const viewportIds = CONTROL_STATE_VIEWPORTS.map(({ id }) => id);
  if (JSON.stringify([...evidence.viewports].sort()) !== JSON.stringify([...viewportIds].sort())) {
    throw new Error(`control-states evidence was swept at ${evidence.viewports.join(', ')}, not ${viewportIds.join(', ')}`);
  }
  const pageKey = (route: string, viewport: string) => `${route}@${viewport}`;
  const expectedPages = new Set(expectedRoutes.flatMap((route) => viewportIds.map((viewport) => pageKey(route, viewport))));
  const seen = new Set<string>();
  for (const page of evidence.pages) {
    const key = pageKey(page.route, page.viewport);
    if (!expectedPages.has(key)) throw new Error(`control-states evidence holds unexpected page ${key}`);
    if (seen.has(key)) throw new Error(`control-states evidence holds duplicate page ${key}`);
    if (page.status >= 400) throw new Error(`control-states evidence page ${key} loaded with status ${page.status}`);
    seen.add(key);
  }
  const missing = [...expectedPages].filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(`control-states evidence is incomplete: missing ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` and ${missing.length - 5} more` : ''}`);
  }

  const registered = new Set(input.registry.controls.map(({ id }) => id));
  const records: Array<{ member: string | null; route: string; viewport: string }> = [
    ...evidence.variants,
    ...evidence.selections,
    ...evidence.disabled,
    ...evidence.unexposedDisabled,
    ...evidence.actions,
    ...evidence.icons,
  ];
  for (const record of records) {
    if (!seen.has(pageKey(record.route, record.viewport))) {
      throw new Error(`control-states evidence records a member on ${pageKey(record.route, record.viewport)}, which is not a swept page`);
    }
    if (record.member !== null && !registered.has(record.member)) {
      throw new Error(`control-states evidence records ${record.member}, which the controls registry does not hold`);
    }
  }
  for (const page of evidence.pages) {
    for (const id of Object.keys(page.controls)) {
      if (!registered.has(id)) {
        throw new Error(`control-states evidence counts ${id} on ${pageKey(page.route, page.viewport)}, which the controls registry does not hold`);
      }
    }
  }
  for (const chip of evidence.statusChips) {
    if (!seen.has(pageKey(chip.route, chip.viewport))) {
      throw new Error(`control-states evidence records a status chip on ${pageKey(chip.route, chip.viewport)}, which is not a swept page`);
    }
  }
  const exemptions = new Map(CONTROL_STATE_EXEMPTIONS.map((entry) => [entry.id, entry]));
  for (const record of [...evidence.variants, ...evidence.selections, ...evidence.disabled]) {
    if (record.exemption === null) continue;
    const entry = exemptions.get(record.exemption);
    if (!entry) throw new Error(`control-states evidence uses ${record.exemption}, which the exemption register does not hold`);
    if (!entry.routes.includes(record.route)) {
      throw new Error(`control-states evidence uses ${record.exemption} on ${record.route}, which it is not registered for`);
    }
  }
  const discrepancies = populationDiscrepancies(evidence);
  if (discrepancies.length > 0) {
    throw new Error(
      `control-states evidence does not reconcile with the browser census: ${discrepancies.slice(0, 5).join('; ')}${discrepancies.length > 5 ? `; and ${discrepancies.length - 5} more` : ''}`,
    );
  }
  return evidence;
}

/**
 * Every observation family reconciled with the census its page persisted,
 * in both directions: a family that holds fewer observations than the page
 * counted has lost a member (whose failure would then never be graded), and
 * one that holds more has a member twice. Each discrepancy names the route,
 * the viewport, the family and the count.
 */
export function populationDiscrepancies(evidence: ControlStatesEvidence): string[] {
  const discrepancies: string[] = [];
  const byPage = <Entry extends { route: string; viewport: string }>(records: readonly Entry[]) => {
    const pages = new Map<string, Entry[]>();
    for (const record of records) {
      const key = `${record.route}@${record.viewport}`;
      pages.set(key, [...(pages.get(key) ?? []), record]);
    }
    return (page: { route: string; viewport: string }) => pages.get(`${page.route}@${page.viewport}`) ?? [];
  };
  const variantsOn = byPage(evidence.variants);
  const selectionsOn = byPage(evidence.selections);
  const disabledOn = byPage(evidence.disabled);
  const unexposedOn = byPage(evidence.unexposedDisabled);
  const actionsOn = byPage(evidence.actions);
  const iconsOn = byPage(evidence.icons);
  const chipsOn = byPage(evidence.statusChips);
  for (const page of evidence.pages) {
    const where = `${page.route} @ ${page.viewport}`;
    const tally = (family: string, counted: number, observed: number) => {
      if (observed < counted) {
        discrepancies.push(`${where} ${family}: ${counted - observed} missing (${observed} observed of ${counted} counted)`);
      } else if (observed > counted) {
        discrepancies.push(`${where} ${family}: ${observed - counted} more than counted (${observed} observed of ${counted} counted)`);
      }
    };
    const census = page.census;
    const variants = variantsOn(page);
    for (const member of new Set([...Object.keys(page.controls), ...Object.keys(census.variants), ...variants.map((variant) => variant.member)])) {
      const own = variants.filter((variant) => variant.member === member);
      tally(`${member} variant observations`, census.variants[member] ?? 0, own.length);
      tally(`${member} rendered instances`, page.controls[member] ?? 0, own.reduce((sum, variant) => sum + variant.instances, 0));
    }
    const disabled = disabledOn(page);
    for (const member of new Set([
      ...Object.keys(census.disabled),
      ...disabled.map((record) => record.member),
      ...variants.filter((variant) => variant.disabled).map((variant) => variant.member),
    ])) {
      const counted = census.disabled[member] ?? 0;
      tally(`${member} disabled observations`, counted, disabled.filter((record) => record.member === member).length);
      tally(`${member} disabled variants`, counted, variants.filter((variant) => variant.member === member && variant.disabled).length);
    }
    tally('unexposed-disabled observations', census.unexposedDisabled, unexposedOn(page).length);
    const selections = selectionsOn(page);
    for (const member of new Set([...Object.keys(census.selections), ...selections.map((selection) => selection.member)])) {
      tally(`${member} selected-state observations`, census.selections[member] ?? 0, selections.filter((selection) => selection.member === member).length);
    }
    const actions = actionsOn(page);
    for (const kind of new Set([...Object.keys(census.actions), ...actions.map((action) => action.kind)])) {
      tally(`${kind} action observations`, census.actions[kind] ?? 0, actions.filter((action) => action.kind === kind).length);
    }
    tally('code-block copy actions', page.codeBlocks, actions.filter((action) => action.kind === 'copy-code').length);
    tally('icons', census.icons, iconsOn(page).reduce((sum, icon) => sum + icon.count, 0));
    tally('status chips', census.statusChips, chipsOn(page).reduce((sum, chip) => sum + chip.count, 0));
  }
  return discrepancies;
}

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

export type ControlStateVerdict = {
  id: string;
  status: 'passed' | 'not-applicable';
  failures: string[];
  notApplicable: string | null;
  observed: Record<string, unknown>;
};

const where = (record: { route: string; viewport: string; element: string }) =>
  `${record.route} @ ${record.viewport} ${record.element}`;

function exempted(record: { exemption: string | null }, clause: ControlStateClause): boolean {
  if (record.exemption === null) return false;
  const entry = CONTROL_STATE_EXEMPTIONS.find(({ id }) => id === record.exemption);
  return entry !== undefined && entry.clauses.includes(clause);
}

/** Paint that counts as no fill: transparent, or the paper ground. */
export function unfilled(background: string): boolean {
  return (
    background === 'transparent' ||
    background === 'rgba(0, 0, 0, 0)' ||
    /^rgba\([^)]*,\s*0\)$/.test(background) ||
    background === PAPER_RGB
  );
}

/** The non-colour, non-semantic cues a selected state carries. */
export function nonColourCues(cues: ControlSelectionObservation['cues']): string[] {
  const found: string[] = [];
  if (cues.underline) found.push('underline');
  if (cues.rule) found.push('ink rule');
  if (cues.weightStep >= SELECTED_WEIGHT_STEP) found.push(`weight step ${cues.weightStep}`);
  if (cues.glyph) found.push('confirmation glyph');
  if (cues.nativeMark) found.push('native checked mark');
  return found;
}

const CHIP_SEMANTICS = new Set(['aria-pressed', 'aria-selected', 'aria-checked', 'checked']);

/** A selection that confirms a chosen value rather than opening a sheet. */
export function isChip(selection: ControlSelectionObservation): boolean {
  return selection.semantic === null || CHIP_SEMANTICS.has(selection.semantic);
}

/** Every reason one variant fails `VAL-B2-COMP-002`'s paint clauses. */
export function variantStateFailures(
  variant: ControlVariantObservation,
  supported: readonly string[],
): string[] {
  const failures: string[] = [];
  if (variant.disabled) return failures;
  const at = where(variant);
  if (!variant.restStable) failures.push(`${at}: its rest paint did not return after the state probes`);
  if (supported.includes('hover') && variant.selected !== 'selected' && !exempted(variant, 'hover-distinct')) {
    if (variant.pointer === 'covered') {
      failures.push(`${at}: the pointer cannot reach it (covered by ${variant.coveredBy ?? 'another element'})`);
    } else if (variant.pointer === 'reachable') {
      if (variant.hover === null) failures.push(`${at}: hover was not measured`);
      else if (variant.hover.changedCount === 0) failures.push(`${at}: hover paints the same as rest`);
    }
  }
  if (supported.includes('active') && !exempted(variant, 'pressed-distinct')) {
    if (variant.pointer === 'covered') {
      // Already reported under hover for every member that supports both.
      if (!supported.includes('hover')) failures.push(`${at}: the pointer cannot reach it to press it`);
    } else if (variant.pointer === 'reachable') {
      if (variant.pressed === null) failures.push(`${at}: the pressed state was not measured`);
      else if (variant.pressed.changedCount === 0) failures.push(`${at}: pressed paints the same as rest`);
    }
  }
  if (supported.includes('focus-visible') && !exempted(variant, 'focus-visible-distinct')) {
    if (variant.focusVisible === null) failures.push(`${at}: keyboard focus was not measured`);
    else if (!variant.focusVisible.matched) failures.push(`${at}: keyboard focus does not match :focus-visible`);
    else if (variant.focusVisible.changedCount === 0) failures.push(`${at}: keyboard focus paints the same as rest`);
  }
  return failures;
}

/** Every reason one variant serialized transient paint as persistent ARIA. */
export function transientAriaFailures(variant: ControlVariantObservation): string[] {
  const at = where(variant);
  return [
    ...variant.transientAria.hover.map((change) => `${at}: hover changed ${change}`),
    ...variant.transientAria.pressed.map((change) => `${at}: pressing changed ${change}`),
  ];
}

/** Every reason one selected state fails the selected-distinct clause. */
export function selectionDistinctFailures(selection: ControlSelectionObservation): string[] {
  const failures: string[] = [];
  const at = where(selection);
  if (!exempted(selection, 'selected-distinct') && selection.diff.changedCount === 0 && !selection.cues.nativeMark) {
    failures.push(`${at}: selected paints the same as unselected`);
  }
  if (selection.restored === false) failures.push(`${at}: activating it to read its selected state could not be undone`);
  return failures;
}

/** Every reason one selected chip fails `VAL-B2-COMP-007`. */
export function chipFailures(selection: ControlSelectionObservation): string[] {
  if (!isChip(selection)) return [];
  const failures: string[] = [];
  const at = where(selection);
  if (selection.semantic === null) failures.push(`${at}: its selected state exposes no aria-pressed, aria-selected, aria-checked or native checked state`);
  const cues = nonColourCues(selection.cues);
  if (cues.length === 0) failures.push(`${at}: its selection is carried by colour alone (no underline, ink rule, ${SELECTED_WEIGHT_STEP} weight step, glyph or native mark)`);
  if (!unfilled(selection.paint.background) && !exempted(selection, 'selected-unfilled')) {
    failures.push(`${at}: the selected state is filled (${selection.paint.background})`);
  }
  if (selection.paint.lime) failures.push(`${at}: the selected state paints the retired lime ${RETIRED_LIME_RGB}`);
  if (selection.paint.heightPx > 0 && selection.paint.radiusPx >= selection.paint.heightPx / 2 - 0.5 && selection.paint.radiusPx > 0) {
    failures.push(`${at}: the selected state is a rounded pill (radius ${selection.paint.radiusPx}px at ${selection.paint.heightPx}px tall)`);
  }
  return failures;
}

/** Every reason one status chip fails `VAL-B2-COMP-007`'s status clause. */
export function statusChipFailures(chip: StatusChipObservation): string[] {
  const failures: string[] = [];
  const at = `${chip.route} @ ${chip.viewport} ${chip.kind} chip "${chip.text}" (${chip.variant})`;
  if (chip.text.trim().length === 0) failures.push(`${at}: carries no text label`);
  if (!unfilled(chip.background)) failures.push(`${at}: is filled (${chip.background})`);
  if (chip.lime) failures.push(`${at}: paints the retired lime`);
  if (chip.heightPx > 0 && chip.radiusPx >= chip.heightPx / 2 - 0.5 && chip.radiusPx > 0) {
    failures.push(`${at}: is a rounded pill (radius ${chip.radiusPx}px)`);
  }
  const expected = STATUS_CHIP_RGB[chip.variant];
  if (chip.kind === 'badge' && expected !== undefined && chip.colour !== expected) {
    failures.push(`${at}: paints ${chip.colour}, not its status colour ${expected}`);
  }
  if (chip.kind === 'stage' && chip.variant !== 'default' && chip.borderStyle === 'none' && chip.fontWeight < 600) {
    failures.push(`${at}: repeats its status by no border style or weight, so colour would be its only cue`);
  }
  return failures;
}

/** Every reason one disabled instance fails `VAL-B2-COMP-015` (and the disabled half of 002). */
export function disabledFailures(
  record: ControlDisabledObservation,
  clause: 'distinct' | 'exposure',
): string[] {
  const failures: string[] = [];
  const at = where(record);
  if (clause === 'distinct') {
    if (!exempted(record, 'disabled-distinct') && record.enabledDiff.changedCount === 0) {
      failures.push(`${at}: disabled paints the same as enabled`);
    }
    return failures;
  }
  if (!record.native && !record.ariaDisabled) failures.push(`${at}: exposes neither native disabled nor aria-disabled`);
  if (record.activation.pointerChanged) failures.push(`${at}: a pointer click changed the page state`);
  if (record.activation.keyboardChanged === true) failures.push(`${at}: Enter or Space changed the page state`);
  if (record.activation.navigated) failures.push(`${at}: activating it navigated`);
  if (!exempted(record, 'disabled-neutral')) {
    if (!record.neutral.attenuated) failures.push(`${at}: its disabled paint is not attenuated from enabled (opacity ${record.neutral.opacity}, colour ${record.neutral.colour})`);
    if (record.neutral.activeFill) failures.push(`${at}: its disabled paint keeps an active-action fill (${record.neutral.background})`);
    if (record.neutral.cursor === 'pointer') failures.push(`${at}: its disabled cursor still offers activation`);
  }
  return failures;
}

/** Every reason one action fails `VAL-B2-COMP-005`. */
export function actionFailures(action: ControlActionObservation): string[] {
  const failures: string[] = [];
  const at = where(action);
  if (!action.focusVisible) failures.push(`${at}: ${action.kind} is not reached with a visible keyboard focus`);
  if (!action.performed) failures.push(`${at}: ${action.kind} "${action.name}" did not perform its labelled action from the keyboard (${action.detail})`);
  if (action.restored === false) failures.push(`${at}: ${action.kind} did not return to its prior state (${action.detail})`);
  if (!action.nameContainsVisibleText) failures.push(`${at}: its accessible name "${action.name}" does not contain its visible text "${action.visibleText}"`);
  return failures;
}

/** Every reason one icon record fails `VAL-B2-COMP-011`. */
export function iconFailures(icon: ControlIconObservation): string[] {
  const at = `${icon.route} @ ${icon.viewport} ${icon.element}`;
  if (icon.role === 'functional' && icon.ownerName.trim().length === 0) {
    return [`${at}: a functional icon's control has no accessible name`];
  }
  if (icon.role === 'exposed-unnamed') {
    return [`${at}: an icon outside any control is neither hidden nor named`];
  }
  if ((icon.role === 'decorative' || icon.role === 'informative') && icon.focusable) {
    return [`${at}: a ${icon.role} icon outside any control is focusable`];
  }
  return [];
}

function exemptionUse(evidence: ControlStatesEvidence): string[] {
  const failures: string[] = [];
  for (const entry of CONTROL_STATE_EXEMPTIONS) {
    for (const clause of entry.clauses) {
      const used =
        evidence.variants.some((variant) => {
          if (variant.exemption !== entry.id) return false;
          if (clause === 'hover-distinct') return variant.hover !== null && variant.hover.changedCount === 0;
          if (clause === 'pressed-distinct') return variant.pressed !== null && variant.pressed.changedCount === 0;
          if (clause === 'focus-visible-distinct') return variant.focusVisible !== null && variant.focusVisible.changedCount === 0;
          return false;
        }) ||
        (clause === 'selected-distinct' &&
          evidence.selections.some((selection) => selection.exemption === entry.id && selection.diff.changedCount === 0)) ||
        (clause === 'selected-unfilled' &&
          evidence.selections.some(
            (selection) => selection.exemption === entry.id && isChip(selection) && !unfilled(selection.paint.background),
          )) ||
        (clause === 'disabled-distinct' &&
          evidence.disabled.some((record) => record.exemption === entry.id && record.enabledDiff.changedCount === 0)) ||
        (clause === 'disabled-neutral' &&
          evidence.disabled.some(
            (record) =>
              record.exemption === entry.id &&
              (!record.neutral.attenuated || record.neutral.activeFill || record.neutral.cursor === 'pointer'),
          ));
      if (!used) failures.push(`exemption ${entry.id} excuses ${clause}, which no swept control needed`);
    }
  }
  return failures;
}

/**
 * The verdict for one assertion and one registered control. Library-only
 * rows are not applicable; every production row must have been rendered,
 * and the page-level clauses (status chips, icons outside controls, the
 * code-block copy population, the exemption register) fail every row of
 * their assertion, because they fail the assertion itself.
 */
export function controlStateVerdict(
  assertionId: ControlStateAssertion,
  member: string,
  evidence: ControlStatesEvidence,
  registry: ControlStateRegistry,
): ControlStateVerdict {
  const row = registry.controls.find(({ id }) => id === member);
  if (!row) throw new Error(`${member} is not a registered control`);
  const variants = evidence.variants.filter((variant) => variant.member === member);
  const renderedPages = evidence.pages.filter((page) => (page.controls[member] ?? 0) > 0);
  const rendered = evidence.pages.reduce((sum, page) => sum + (page.controls[member] ?? 0), 0);
  const notApplicable = (reason: string): ControlStateVerdict => ({
    id: member,
    status: 'not-applicable',
    failures: [],
    notApplicable: reason,
    observed: { rendered, renderedPages: renderedPages.length },
  });
  if (row.mountState !== 'production') {
    if (rendered > 0) {
      return {
        id: member,
        status: 'passed',
        failures: [`${member} is registered ${row.mountState} but rendered ${rendered} times`],
        notApplicable: null,
        observed: { rendered },
      };
    }
    return notApplicable(
      `${member} has mount state ${row.mountState}: the sweep over ${evidence.routes.length} route states at ${evidence.viewports.join(' and ')} rendered it 0 times, so no rendered member exists to measure.`,
    );
  }
  const failures: string[] = [];
  if (rendered === 0 || variants.length === 0) {
    failures.push(`${member} is a production control but the sweep rendered none of it`);
  }
  for (const viewport of evidence.viewports) {
    if (!variants.some((variant) => variant.viewport === viewport)) {
      failures.push(`${member} was measured at no route at ${viewport}`);
    }
  }
  const selections = evidence.selections.filter((selection) => selection.member === member);
  const disabled = evidence.disabled.filter((record) => record.member === member);
  const unexposed = evidence.unexposedDisabled.filter((record) => record.member === member);
  const actions = evidence.actions.filter((action) => action.member === member);
  const icons = evidence.icons.filter((icon) => icon.member === member);
  const pageIcons = evidence.icons.filter((icon) => icon.member === null);
  const supported = row.supportedStates;
  const base = {
    rendered,
    renderedPages: renderedPages.length,
    variants: variants.length,
    viewports: evidence.viewports,
  };

  if (assertionId === 'VAL-B2-COMP-002') {
    for (const variant of variants) failures.push(...variantStateFailures(variant, supported));
    for (const variant of variants) failures.push(...transientAriaFailures(variant));
    if (supported.includes('selected')) {
      for (const selection of selections) failures.push(...selectionDistinctFailures(selection));
      if (selections.length === 0) failures.push(`${member} supports a selected state but no selected state was measured`);
    }
    for (const record of disabled) failures.push(...disabledFailures(record, 'distinct'));
    failures.push(...exemptionUse(evidence));
    const count = (key: 'hover' | 'pressed' | 'focusVisible') => variants.filter((variant) => variant[key] !== null).length;
    return {
      id: member,
      status: 'passed',
      failures,
      notApplicable: null,
      observed: {
        ...base,
        hoverMeasured: count('hover'),
        pressedMeasured: count('pressed'),
        focusVisibleMeasured: count('focusVisible'),
        offscreenUntilFocus: variants.filter((variant) => variant.pointer === 'offscreen-until-focus').length,
        selectedMeasured: selections.length,
        disabledMeasured: disabled.length,
        exempted: variants.filter((variant) => variant.exemption !== null).length,
      },
    };
  }

  if (assertionId === 'VAL-B2-COMP-015') {
    for (const variant of variants) failures.push(...transientAriaFailures(variant));
    for (const record of disabled) failures.push(...disabledFailures(record, 'exposure'));
    for (const record of unexposed) {
      failures.push(`${record.route} @ ${record.viewport} ${record.element}: looks unavailable (${record.cue}) but exposes neither native disabled nor aria-disabled`);
    }
    failures.push(...exemptionUse(evidence));
    return {
      id: member,
      status: 'passed',
      failures,
      notApplicable: null,
      observed: {
        ...base,
        transientMeasured: variants.filter((variant) => variant.hover !== null || variant.pressed !== null).length,
        disabledMeasured: disabled.length,
        disabledException: row.disabledException,
      },
    };
  }

  if (assertionId === 'VAL-B2-COMP-005') {
    if (actions.length === 0) {
      return notApplicable(`${member} (${row.statePurpose}) performed none of the clear, copy, sort, reset, disclosure or close actions on any of the ${evidence.routes.length} swept route states at either width.`);
    }
    for (const action of actions) failures.push(...actionFailures(action));
    for (const page of evidence.pages) {
      const copies = evidence.actions.filter(
        (action) => action.kind === 'copy-code' && action.route === page.route && action.viewport === page.viewport,
      ).length;
      if (copies !== page.codeBlocks) {
        failures.push(`${page.route} @ ${page.viewport} renders ${page.codeBlocks} code block(s) but ${copies} code-block copy action(s) were exercised`);
      }
    }
    const byKind = Object.fromEntries(
      CONTROL_ACTION_KINDS.map((kind) => [kind, actions.filter((action) => action.kind === kind).length]),
    );
    return { id: member, status: 'passed', failures, notApplicable: null, observed: { ...base, actions: actions.length, byKind } };
  }

  if (assertionId === 'VAL-B2-COMP-007') {
    if (!supported.includes('selected')) {
      return notApplicable(`${member} (${row.statePurpose}) registers no selected state, so it is not a chip or filter token.`);
    }
    const chips = selections.filter(isChip);
    if (chips.length === 0) failures.push(`${member} is a selection control but no selected chip was measured`);
    for (const selection of selections) failures.push(...chipFailures(selection));
    for (const chip of evidence.statusChips) failures.push(...statusChipFailures(chip));
    for (const viewport of evidence.viewports) {
      if (!chips.some((chip) => chip.viewport === viewport)) failures.push(`${member} has no selected chip measured at ${viewport}`);
    }
    return {
      id: member,
      status: 'passed',
      failures,
      notApplicable: null,
      observed: {
        ...base,
        selectedChips: chips.length,
        openers: selections.length - chips.length,
        statusChips: evidence.statusChips.reduce((sum, chip) => sum + chip.count, 0),
      },
    };
  }

  // VAL-B2-COMP-011
  for (const icon of [...icons, ...pageIcons]) failures.push(...iconFailures(icon));
  const sum = (records: ControlIconObservation[], role: ControlIconObservation['role']) =>
    records.filter((icon) => icon.role === role).reduce((total, icon) => total + icon.count, 0);
  if (pageIcons.length + evidence.icons.filter((icon) => icon.member !== null).length === 0) {
    failures.push('the sweep found no icon at all, so the icon verdict would pass vacuously');
  }
  return {
    id: member,
    status: 'passed',
    failures,
    notApplicable: null,
    observed: {
      ...base,
      functionalIcons: sum(icons, 'functional'),
      decorativeIconsOutsideControls: sum(pageIcons, 'decorative'),
      informativeIconsOutsideControls: sum(pageIcons, 'informative'),
      figureIcons: sum(pageIcons, 'figure'),
    },
  };
}
