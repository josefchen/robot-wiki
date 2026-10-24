import { describe, expect, it } from 'vitest';
import {
  CONTROL_STATES_SWEEP_MODULE,
  CONTROL_STATES_VERSION,
  CONTROL_STATE_ASSERTIONS,
  CONTROL_STATE_EXEMPTIONS,
  CONTROL_STATE_VIEWPORTS,
  RETIRED_LIME_RGB,
  controlStateVerdict,
  readControlStatesEvidence,
  type ControlActionObservation,
  type ControlDisabledObservation,
  type ControlIconObservation,
  type ControlSelectionObservation,
  type ControlStateRegistry,
  type ControlStatesEvidence,
  type ControlVariantObservation,
  type StatusChipObservation,
} from '../../lib/brand-v2-control-states-evidence';

const ROUTES = ['/', '/how-robots-work/', '/article/'];
const [PHONE, DESKTOP] = CONTROL_STATE_VIEWPORTS.map(({ id }) => id);
const VIEWPORTS = [PHONE, DESKTOP];

const REGISTRY: ControlStateRegistry = {
  routes: { public: ROUTES.map((path) => ({ path })) },
  controls: [
    {
      id: 'control:secondary-action',
      statePurpose: 'action',
      supportedStates: ['default', 'hover', 'active', 'focus-visible', 'disabled'],
      mountState: 'production',
      disabledException: null,
    },
    {
      id: 'control:selection',
      statePurpose: 'persistent-selection',
      supportedStates: ['unselected', 'selected', 'hover', 'focus-visible', 'disabled'],
      mountState: 'production',
      disabledException: null,
    },
    {
      id: 'control:disabled',
      statePurpose: 'unavailable-action',
      supportedStates: ['disabled'],
      mountState: 'library-only',
      disabledException: null,
    },
  ],
};

const changed = (count = 1) => ({ changed: count > 0 ? ['button[0].color: a -> b'] : [], changedCount: count });

function variant(overrides: Partial<ControlVariantObservation> = {}): ControlVariantObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    member: 'control:secondary-action',
    variant: 'control:secondary-action|button',
    instances: 1,
    element: '<button>Copy</button>',
    name: 'Copy code to clipboard',
    disabled: false,
    selected: 'none',
    exemption: null,
    pointer: 'reachable',
    coveredBy: null,
    hover: changed(),
    pressed: changed(),
    focusVisible: { ...changed(3), matched: true },
    transientAria: { hover: [], pressed: [] },
    restStable: true,
    ...overrides,
  };
}

function selection(overrides: Partial<ControlSelectionObservation> = {}): ControlSelectionObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    member: 'control:selection',
    variant: 'control:selection|button',
    element: '<button aria-pressed="true">Both</button>',
    name: 'Both',
    semantic: 'aria-pressed',
    method: 'activated',
    diff: changed(2),
    cues: { underline: true, rule: false, weightStep: 0, glyph: false, colour: true, nativeMark: false },
    paint: { background: 'rgba(0, 0, 0, 0)', colour: 'rgb(28, 28, 26)', lime: false, radiusPx: 0, heightPx: 28 },
    restored: true,
    exemption: null,
    ...overrides,
  };
}

function disabled(overrides: Partial<ControlDisabledObservation> = {}): ControlDisabledObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    member: 'control:secondary-action',
    element: '<button disabled>Export</button>',
    name: 'Export',
    native: true,
    ariaDisabled: false,
    enabledDiff: changed(),
    neutral: {
      cursor: 'default',
      opacity: 0.45,
      enabledOpacity: 1,
      colour: 'rgb(28, 28, 26)',
      enabledColour: 'rgb(28, 28, 26)',
      background: 'rgba(0, 0, 0, 0)',
      attenuated: true,
      activeFill: false,
    },
    activation: { pointerChanged: false, keyboardChanged: false, navigated: false },
    exemption: null,
    ...overrides,
  };
}

function action(overrides: Partial<ControlActionObservation> = {}): ControlActionObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    member: 'control:secondary-action',
    kind: 'copy-code',
    element: '<button aria-label="Copy code to clipboard">',
    name: 'Copy code to clipboard',
    visibleText: '',
    nameContainsVisibleText: true,
    focusVisible: true,
    performed: true,
    restored: null,
    detail: 'clipboard equals the block code',
    ...overrides,
  };
}

function icon(overrides: Partial<ControlIconObservation> = {}): ControlIconObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    member: 'control:secondary-action',
    role: 'functional',
    count: 1,
    element: '<button aria-label="Copy code to clipboard">',
    ownerName: 'Copy code to clipboard',
    hidden: true,
    focusable: false,
    ...overrides,
  };
}

function chip(overrides: Partial<StatusChipObservation> = {}): StatusChipObservation {
  return {
    route: '/article/',
    viewport: DESKTOP,
    kind: 'badge',
    variant: 'ok',
    count: 1,
    text: 'Shipped',
    colour: 'rgb(26, 111, 69)',
    background: 'rgba(0, 0, 0, 0)',
    radiusPx: 0,
    heightPx: 18,
    lime: false,
    borderStyle: 'none',
    fontWeight: 500,
    ...overrides,
  };
}

const tallied = <T,>(records: readonly T[], keyOf: (record: T) => string, weight: (record: T) => number = () => 1) =>
  records.reduce<Record<string, number>>((counts, record) => {
    counts[keyOf(record)] = (counts[keyOf(record)] ?? 0) + weight(record);
    return counts;
  }, {});

/**
 * Gives every page the counts and census its observations account for, as
 * the browser would have counted them before measuring: the clean sweep
 * reconciles by construction, so a mutation applied afterwards is the only
 * thing that can make it disagree.
 */
function censused(evidence: ControlStatesEvidence): ControlStatesEvidence {
  for (const page of evidence.pages) {
    const on = <T extends { route: string; viewport: string }>(records: readonly T[]) =>
      records.filter((record) => record.route === page.route && record.viewport === page.viewport);
    page.controls = tallied(on(evidence.variants), (record) => record.member, (record) => record.instances);
    page.census = {
      variants: tallied(on(evidence.variants), (record) => record.member),
      disabled: tallied(on(evidence.disabled), (record) => record.member),
      unexposedDisabled: on(evidence.unexposedDisabled).length,
      selections: tallied(on(evidence.selections), (record) => record.member),
      actions: tallied(on(evidence.actions), (record) => record.kind),
      icons: on(evidence.icons).reduce((sum, record) => sum + record.count, 0),
      statusChips: on(evidence.statusChips).reduce((sum, record) => sum + record.count, 0),
    };
  }
  return evidence;
}

const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const EMPTY_CENSUS = { variants: {}, disabled: {}, unexposedDisabled: 0, selections: {}, actions: {}, icons: 0, statusChips: 0 };

/** A clean sweep: every production control measured at both widths. */
function sweep(): ControlStatesEvidence {
  const perViewport = <T extends { viewport: string }>(make: (viewport: string) => T) => VIEWPORTS.map(make);
  return censused({
    version: CONTROL_STATES_VERSION,
    generatedBy: CONTROL_STATES_SWEEP_MODULE,
    fingerprint: 'fingerprint',
    viewports: [...VIEWPORTS],
    routes: [...ROUTES],
    pages: ROUTES.flatMap((route) =>
      VIEWPORTS.map((viewport) => ({
        route,
        viewport,
        status: 200,
        controls: {},
        unregistered: [],
        codeBlocks: route === '/article/' ? 1 : 0,
        census: EMPTY_CENSUS,
      })),
    ),
    variants: [
      ...perViewport((viewport) => variant({ viewport })),
      // The unavailable Export action, read once as a variant and once as a
      // disabled control.
      variant({
        variant: 'control:secondary-action|button|disabled',
        element: '<button disabled>Export</button>',
        name: 'Export',
        disabled: true,
        hover: null,
        pressed: null,
        focusVisible: null,
      }),
      ...perViewport((viewport) =>
        variant({ viewport, member: 'control:selection', variant: 'control:selection|button', selected: 'unselected', instances: 2 }),
      ),
      // The explainer register is used: an owner-frozen control whose hover
      // and press paint the same as rest.
      variant({
        route: '/how-robots-work/',
        member: 'control:selection',
        variant: 'control:selection|explainer',
        selected: 'unselected',
        hover: changed(0),
        pressed: changed(0),
        exemption: 'owner-freeze:explainers',
      }),
    ],
    selections: [
      ...perViewport((viewport) => selection({ viewport })),
      selection({
        route: '/how-robots-work/',
        variant: 'control:selection|explainer',
        paint: { background: 'rgb(240, 243, 246)', colour: 'rgb(28, 28, 26)', lime: false, radiusPx: 0, heightPx: 28 },
        exemption: 'owner-freeze:explainers',
      }),
    ],
    disabled: [disabled()],
    unexposedDisabled: [],
    actions: perViewport((viewport) => action({ viewport })),
    icons: [...perViewport((viewport) => icon({ viewport })), icon({ member: null, role: 'decorative', element: '<svg aria-hidden="true">' })],
    statusChips: [chip()],
  });
}

const read = (artifact: unknown, overrides: { fingerprint?: string; routes?: readonly string[] } = {}) =>
  readControlStatesEvidence({
    artifact,
    fingerprint: overrides.fingerprint ?? 'fingerprint',
    routes: overrides.routes ?? ROUTES,
    registry: REGISTRY,
  });

const failuresOf = (evidence: ControlStatesEvidence, assertion: (typeof CONTROL_STATE_ASSERTIONS)[number], member: string) =>
  controlStateVerdict(assertion, member, evidence, REGISTRY).failures;

const allFailures = (evidence: ControlStatesEvidence, assertion: (typeof CONTROL_STATE_ASSERTIONS)[number]) =>
  REGISTRY.controls.flatMap(({ id }) => failuresOf(evidence, assertion, id));

describe('control states evidence', () => {
  it('refuses stale, incomplete, and malformed control-state evidence', () => {
    expect(() => read(sweep())).not.toThrow();
    expect(() => read(null)).toThrow(/not an object/);
    expect(() => read({ ...sweep(), version: 0 })).toThrow(/version/);
    expect(() => read(sweep(), { fingerprint: 'other' })).toThrow(/stale/);
    expect(() => read(sweep(), { routes: [] })).toThrow(/population is empty/);
    expect(() => read(sweep(), { routes: ROUTES.slice(1) })).toThrow(/route states, not the/);
    expect(() => read({ ...sweep(), viewports: [DESKTOP] })).toThrow(/swept at/);

    const dropped = sweep();
    dropped.pages = dropped.pages.slice(1);
    expect(() => read(dropped)).toThrow(/incomplete/);

    const duplicated = sweep();
    duplicated.pages.push({ ...duplicated.pages[0] });
    expect(() => read(duplicated)).toThrow(/duplicate page/);

    const extra = sweep();
    extra.pages.push({ ...extra.pages[0], route: '/elsewhere/' });
    expect(() => read(extra)).toThrow(/unexpected page/);

    const failed = sweep();
    failed.pages[0] = { ...failed.pages[0], status: 404 };
    expect(() => read(failed)).toThrow(/status 404/);

    const unregistered = sweep();
    unregistered.variants.push(variant({ member: 'control:invented' }));
    expect(() => read(unregistered)).toThrow(/does not hold/);

    const counted = sweep();
    counted.pages[0] = { ...counted.pages[0], controls: { 'control:invented': 1 } };
    expect(() => read(counted)).toThrow(/does not hold/);

    const unknownExemption = sweep();
    unknownExemption.variants.push(variant({ exemption: 'owner-freeze:nothing' }));
    expect(() => read(unknownExemption)).toThrow(/exemption register does not hold/);

    const misplacedExemption = sweep();
    misplacedExemption.variants.push(variant({ route: '/article/', exemption: 'owner-freeze:explainers' }));
    expect(() => read(misplacedExemption)).toThrow(/not registered for/);

    const malformed = sweep() as unknown as { variants: Array<Record<string, unknown>> };
    malformed.variants[0] = { ...malformed.variants[0], pointer: 'somewhere' };
    expect(() => read(malformed)).toThrow();

    const uncensused = sweep() as unknown as { pages: Array<Record<string, unknown>> };
    delete uncensused.pages[0].census;
    expect(() => read(uncensused)).toThrow();
  });

  it('refuses an artifact that lost a failing member while its page still counts it', () => {
    const where = `/article/ @ ${DESKTOP}`;
    // Each family in turn: one member fails its clause, then its observation
    // is dropped while the page census still counts it. On its own, the
    // verdict would now pass; the reader must refuse the artifact first,
    // naming the route, the viewport, the family and the shortfall.
    const cases: Array<{
      name: string;
      fail: (evidence: ControlStatesEvidence) => void;
      drop: (evidence: ControlStatesEvidence) => void;
      assertion: (typeof CONTROL_STATE_ASSERTIONS)[number];
      member: string;
      family: RegExp;
    }> = [
      {
        name: 'variant',
        fail: (e) => { e.variants[1].hover = changed(0); },
        drop: (e) => { e.variants.splice(1, 1); },
        assertion: 'VAL-B2-COMP-002',
        member: 'control:secondary-action',
        family: /control:secondary-action variant observations: 1 missing \(1 observed of 2 counted\)/,
      },
      {
        name: 'selection',
        fail: (e) => { e.selections[1].diff = changed(0); },
        drop: (e) => { e.selections.splice(1, 1); },
        assertion: 'VAL-B2-COMP-002',
        member: 'control:selection',
        family: /control:selection selected-state observations: 1 missing \(0 observed of 1 counted\)/,
      },
      {
        name: 'disabled control',
        fail: (e) => { e.disabled[0].activation.pointerChanged = true; },
        drop: (e) => { e.disabled.splice(0, 1); },
        assertion: 'VAL-B2-COMP-015',
        member: 'control:secondary-action',
        family: /control:secondary-action disabled observations: 1 missing \(0 observed of 1 counted\)/,
      },
      {
        name: 'unexposed disabled control',
        fail: (e) => {
          e.unexposedDisabled.push({ route: '/article/', viewport: DESKTOP, member: 'control:secondary-action', element: '<button>', cue: 'cursor: not-allowed' });
          censused(e);
        },
        drop: (e) => { e.unexposedDisabled = []; },
        assertion: 'VAL-B2-COMP-015',
        member: 'control:secondary-action',
        family: /unexposed-disabled observations: 1 missing \(0 observed of 1 counted\)/,
      },
      {
        // A sort, not a code-block copy: the copy population is already
        // held to the page's code blocks by the verdict itself.
        name: 'action',
        fail: (e) => {
          e.actions.push(action({ kind: 'sort', element: '<button>Sort by year</button>', name: 'Sort by year', performed: false, detail: 'row order unchanged' }));
          censused(e);
        },
        drop: (e) => { e.actions = e.actions.filter((record) => record.kind !== 'sort'); },
        assertion: 'VAL-B2-COMP-005',
        member: 'control:secondary-action',
        family: /sort action observations: 1 missing \(0 observed of 1 counted\)/,
      },
      {
        name: 'icon',
        fail: (e) => { e.icons[1].ownerName = ''; },
        drop: (e) => { e.icons.splice(1, 1); },
        assertion: 'VAL-B2-COMP-011',
        member: 'control:secondary-action',
        family: /icons: 1 missing \(1 observed of 2 counted\)/,
      },
      {
        name: 'status chip',
        fail: (e) => { e.statusChips[0].text = ''; },
        drop: (e) => { e.statusChips = []; },
        assertion: 'VAL-B2-COMP-007',
        member: 'control:selection',
        family: /status chips: 1 missing \(0 observed of 1 counted\)/,
      },
    ];
    for (const { name, fail, drop, assertion, member, family } of cases) {
      const failing = sweep();
      fail(failing);
      expect(() => read(failing), `${name}: a failing member still reconciles`).not.toThrow();
      expect(failuresOf(failing, assertion, member).length, `${name}: the planted member fails ${assertion}`).toBeGreaterThan(0);

      const lost = structuredClone(failing);
      drop(lost);
      // The bypass: with the failing observation gone, the verdict is clean.
      expect(failuresOf(lost, assertion, member), `${name}: the verdict alone no longer sees the failure`).toEqual([]);
      expect(() => read(lost), `${name}: the reader refuses the lost member`).toThrow(/does not reconcile with the browser census/);
      expect(() => read(lost)).toThrow(new RegExp(`${literal(where)} ${family.source}`));
    }
  });

  it('refuses observations the page census does not account for, and instance totals that disagree', () => {
    const doubled = sweep();
    doubled.selections.push({ ...doubled.selections[1] });
    expect(() => read(doubled)).toThrow(/control:selection selected-state observations: 1 more than counted \(2 observed of 1 counted\)/);

    const iconTwice = sweep();
    iconTwice.icons[1] = { ...iconTwice.icons[1], count: 2 };
    expect(() => read(iconTwice)).toThrow(/icons: 1 more than counted \(3 observed of 2 counted\)/);

    const fewerInstances = sweep();
    fewerInstances.variants[3] = { ...fewerInstances.variants[3], instances: 1 };
    expect(() => read(fewerInstances)).toThrow(/control:selection rendered instances: 1 missing \(1 observed of 2 counted\)/);

    const disabledUnread = sweep();
    disabledUnread.variants[2] = { ...disabledUnread.variants[2], disabled: false };
    expect(() => read(disabledUnread)).toThrow(/control:secondary-action disabled variants: 1 missing \(0 observed of 1 counted\)/);

    const uncopied = sweep();
    uncopied.pages = uncopied.pages.map((page) => (page.route === '/article/' ? { ...page, codeBlocks: 2 } : page));
    expect(() => read(uncopied)).toThrow(/code-block copy actions: 1 missing \(1 observed of 2 counted\)/);

    const uncounted = sweep();
    uncounted.actions.push(action({ route: '/', kind: 'sort', name: 'Sort by year' }));
    expect(() => read(uncounted)).toThrow(new RegExp(`(: |; )${literal(`/ @ ${DESKTOP}`)} sort action observations: 1 more than counted \\(1 observed of 0 counted\\)`));
  });

  it('fails each planted violation under its own clause', () => {
    for (const assertion of CONTROL_STATE_ASSERTIONS) {
      expect(allFailures(sweep(), assertion), `${assertion} on the clean sweep`).toEqual([]);
    }
    // A library-only control is not applicable, never a pass.
    for (const assertion of CONTROL_STATE_ASSERTIONS) {
      expect(controlStateVerdict(assertion, 'control:disabled', sweep(), REGISTRY).status).toBe('not-applicable');
    }
    expect(controlStateVerdict('VAL-B2-COMP-007', 'control:secondary-action', sweep(), REGISTRY).status).toBe('not-applicable');

    const plant = (mutate: (evidence: ControlStatesEvidence) => void) => {
      const evidence = sweep();
      mutate(evidence);
      return evidence;
    };
    const only = (
      evidence: ControlStatesEvidence,
      assertion: (typeof CONTROL_STATE_ASSERTIONS)[number],
      member: string,
      pattern: RegExp,
    ) => {
      const failures = failuresOf(evidence, assertion, member);
      expect(failures.length, `${assertion} ${member} fails`).toBeGreaterThan(0);
      expect(failures.every((failure) => pattern.test(failure)), failures.join('\n')).toBe(true);
    };

    only(plant((e) => { e.variants[0].hover = changed(0); }), 'VAL-B2-COMP-002', 'control:secondary-action', /hover paints the same as rest/);
    only(plant((e) => { e.variants[0].pressed = changed(0); }), 'VAL-B2-COMP-002', 'control:secondary-action', /pressed paints the same as rest/);
    only(plant((e) => { e.variants[0].focusVisible = { ...changed(0), matched: true }; }), 'VAL-B2-COMP-002', 'control:secondary-action', /keyboard focus paints the same as rest/);
    only(plant((e) => { e.variants[0].focusVisible = { ...changed(1), matched: false }; }), 'VAL-B2-COMP-002', 'control:secondary-action', /does not match :focus-visible/);
    only(plant((e) => { e.variants[0].pointer = 'covered'; e.variants[0].coveredBy = '<div>'; }), 'VAL-B2-COMP-002', 'control:secondary-action', /pointer cannot reach it/);
    only(plant((e) => { e.selections[0].diff = changed(0); }), 'VAL-B2-COMP-002', 'control:selection', /selected paints the same as unselected/);
    only(plant((e) => { e.selections[0].restored = false; }), 'VAL-B2-COMP-002', 'control:selection', /could not be undone/);
    // A one-way choice (a radio group with nothing chosen and no reset) is
    // recorded as null and is not an undo failure.
    expect(failuresOf(plant((e) => { e.selections[0].restored = null; }), 'VAL-B2-COMP-002', 'control:selection')).toEqual([]);
    only(plant((e) => { e.disabled[0].enabledDiff = changed(0); }), 'VAL-B2-COMP-002', 'control:secondary-action', /disabled paints the same as enabled/);
    only(plant((e) => { e.variants[0].transientAria.hover = ['3:button:aria-pressed=true (added)']; }), 'VAL-B2-COMP-015', 'control:secondary-action', /hover changed/);

    only(plant((e) => { e.actions[0].performed = false; }), 'VAL-B2-COMP-005', 'control:secondary-action', /did not perform/);
    only(plant((e) => { e.actions[0].focusVisible = false; }), 'VAL-B2-COMP-005', 'control:secondary-action', /visible keyboard focus/);
    only(plant((e) => { e.actions[0].nameContainsVisibleText = false; }), 'VAL-B2-COMP-005', 'control:secondary-action', /does not contain its visible text/);
    only(plant((e) => { e.actions = e.actions.slice(1); }), 'VAL-B2-COMP-005', 'control:secondary-action', /code-block copy/);

    only(plant((e) => { e.selections[0].paint.background = RETIRED_LIME_RGB; e.selections[0].paint.lime = true; }), 'VAL-B2-COMP-007', 'control:selection', /is filled|retired lime/);
    only(plant((e) => { e.selections[0].paint.radiusPx = 14; }), 'VAL-B2-COMP-007', 'control:selection', /rounded pill/);
    only(plant((e) => { e.selections[0].cues.underline = false; }), 'VAL-B2-COMP-007', 'control:selection', /colour alone/);
    only(plant((e) => { e.selections[0].semantic = null; }), 'VAL-B2-COMP-007', 'control:selection', /exposes no aria-pressed/);
    only(plant((e) => { e.statusChips[0].colour = 'rgb(28, 28, 26)'; }), 'VAL-B2-COMP-007', 'control:selection', /not its status colour/);
    only(plant((e) => { e.statusChips[0].text = ''; }), 'VAL-B2-COMP-007', 'control:selection', /carries no text/);

    only(plant((e) => { e.icons[0].ownerName = ''; }), 'VAL-B2-COMP-011', 'control:secondary-action', /no accessible name/);
    only(plant((e) => { e.icons[2] = { ...e.icons[2], role: 'exposed-unnamed', hidden: false }; }), 'VAL-B2-COMP-011', 'control:secondary-action', /neither hidden nor named/);
    only(plant((e) => { e.icons[2] = { ...e.icons[2], focusable: true }; }), 'VAL-B2-COMP-011', 'control:secondary-action', /is focusable/);

    only(plant((e) => { e.disabled[0].activation.pointerChanged = true; }), 'VAL-B2-COMP-015', 'control:secondary-action', /pointer click changed/);
    only(plant((e) => { e.disabled[0].activation.keyboardChanged = true; }), 'VAL-B2-COMP-015', 'control:secondary-action', /Enter or Space changed/);
    only(plant((e) => { e.disabled[0].native = false; }), 'VAL-B2-COMP-015', 'control:secondary-action', /neither native disabled nor aria-disabled/);
    only(plant((e) => { e.disabled[0].neutral.attenuated = false; }), 'VAL-B2-COMP-015', 'control:secondary-action', /not attenuated/);
    only(
      plant((e) => { e.unexposedDisabled.push({ route: '/article/', viewport: DESKTOP, member: 'control:secondary-action', element: '<button>', cue: 'cursor: not-allowed' }); }),
      'VAL-B2-COMP-015',
      'control:secondary-action',
      /looks unavailable/,
    );

    // A production control the sweep never rendered fails every row it owns.
    const unrendered = plant((e) => {
      e.variants = e.variants.filter((record) => record.member !== 'control:selection');
      e.pages = e.pages.map((page) => ({ ...page, controls: { 'control:secondary-action': page.controls['control:secondary-action'] ?? 0 } }));
    });
    expect(failuresOf(unrendered, 'VAL-B2-COMP-002', 'control:selection').some((failure) => /rendered none of it/.test(failure))).toBe(true);
    expect(failuresOf(unrendered, 'VAL-B2-COMP-011', 'control:selection').some((failure) => /rendered none of it/.test(failure))).toBe(true);

    // An exemption clause the sweep never needed is refused.
    const unused = plant((e) => {
      e.variants = e.variants.filter((record) => record.exemption === null);
    });
    for (const clause of CONTROL_STATE_EXEMPTIONS[0].clauses.filter((entry) => entry !== 'selected-unfilled')) {
      expect(failuresOf(unused, 'VAL-B2-COMP-002', 'control:secondary-action')).toContain(
        `exemption owner-freeze:explainers excuses ${clause}, which no swept control needed`,
      );
    }
    // The register excuses only the clauses it names: an exempted control
    // that drops its focus ring still fails.
    only(
      plant((e) => {
        const frozen = e.variants.find((record) => record.exemption !== null)!;
        frozen.focusVisible = { ...changed(0), matched: true };
      }),
      'VAL-B2-COMP-002',
      'control:selection',
      /keyboard focus paints the same as rest/,
    );
  });
});
