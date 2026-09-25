import { z } from 'zod';
import { deriveEvidenceClosure } from './brand-v2-evidence-closure.ts';
import { ENTITY_TYPES } from './structured-search.ts';

/**
 * The search-states evidence family: the persisted browser sweep behind
 * `VAL-B2-DISC-001..004` and `VAL-B2-DISC-007`.
 *
 * The population is derived, never copied out of a previous run: the facet
 * members come from the shipped entity types in the structured index's own
 * registry (`ENTITY_TYPES`), and the state members are the deterministic
 * search state machine the interface exposes (idle, loading, results, one
 * facet state per shipped type, no-results, both partial failures, total
 * failure, cleared). A reader that cannot see every expected member, or
 * that sees one it does not expect, refuses the artifact instead of
 * grading a subset.
 */

export const SEARCH_STATES_EVIDENCE_PATH =
  'evidence/brand-v2/search-states.json';

/** The canonical population sources the five assertions quantify over. */
export const SEARCH_STATE_POPULATION_SOURCE =
  'evidence/brand-v2/search-states.json#searchStates';
export const SEARCH_RESULT_STATE_POPULATION_SOURCE =
  'evidence/brand-v2/search-states.json#resultStates';
export const SEARCH_FACET_POPULATION_SOURCE =
  'evidence/brand-v2/search-states.json#facetOptions';
export const SEARCH_MOBILE_STATE_POPULATION_SOURCE =
  'evidence/brand-v2/search-states.json#mobileStates';

export const SEARCH_DESKTOP_VIEWPORT = {
  id: '1440x900',
  width: 1440,
  height: 900,
} as const;

export const SEARCH_MOBILE_VIEWPORT = {
  id: '375x812',
  width: 375,
  height: 812,
} as const;

/** The lime a selected facet must compute to (VAL-B2-DISC-003). */
export const SEARCH_SELECTION_RGB = 'rgb(198, 255, 25)';

/** Every facet option, derived from the shipped entity types plus reset. */
export const SEARCH_FACET_OPTIONS: readonly string[] = [
  'all',
  ...ENTITY_TYPES,
];

/** The deterministic state machine the sweep walks, at desktop size. */
export const SEARCH_STATE_IDS: readonly string[] = [
  'state:default-idle',
  'state:loading-first-query',
  'state:results-both-groups',
  ...ENTITY_TYPES.map((type) => `state:facet-${type}`),
  'state:no-results',
  'state:partial-error-prose',
  'state:partial-error-structured',
  'state:total-error',
  'state:cleared-to-idle',
];

/** The states that render result rows and counts (VAL-B2-DISC-002). */
export const SEARCH_RESULT_STATE_IDS: readonly string[] = [
  'state:results-both-groups',
  ...ENTITY_TYPES.map((type) => `state:facet-${type}`),
];

/** The states DISC-007 names for the 375px fit check. */
export const SEARCH_MOBILE_STATE_IDS: readonly string[] = [
  'state:results-both-groups',
  'state:facet-method',
];

export function facetStateId(type: string): string {
  return `state:facet-${type}`;
}

export function searchStateMemberId(stateId: string): string {
  return `search-state:${stateId}`;
}

export function searchFacetMemberId(option: string): string {
  return `search-facet:${option}`;
}

/** The import closure whose bytes decide whether the artifact is stale. */
const SEARCH_CLOSURE_ENTRIES = [
  'app/search/page.tsx',
  'tests/e2e/brand-v2-search-states.spec.ts',
] as const;

/**
 * The staleness fingerprint: the bytes of the search surface's closure plus
 * the literals the verdicts measure, so restyling the search states without
 * re-running the sweep is a stale-evidence failure rather than a silently
 * preserved green row.
 */
export function searchStatesEvidenceFingerprint(input: {
  root: string;
}): string {
  return deriveEvidenceClosure({
    root: input.root,
    entries: SEARCH_CLOSURE_ENTRIES,
    facts: [SEARCH_SELECTION_RGB, '#C6FF19'],
  }).fingerprint;
}

/* ------------------------------------------------------------------ */
/* Observation schema                                                  */
/* ------------------------------------------------------------------ */

const groupSchema = z.object({
  id: z.enum(['prose', 'structured']),
  rowCount: z.number().int().min(0),
  countText: z.string().nullable(),
  errorNote: z.boolean(),
  emptyNote: z.boolean(),
});

const facetSchema = z.object({
  selected: z.string(),
  pressedByOption: z.record(z.string(), z.boolean()),
  selectedBackgroundRgb: z.string(),
  selectedHasCheckMarker: z.boolean(),
  rowTypes: z.array(z.string()),
});

export type SearchStateObservation = z.infer<typeof stateSchema>;

const stateSchema = z.object({
  stateId: z.string().min(1),
  viewport: z.string().min(1),
  statusText: z.string(),
  liveRegionRole: z.string().nullable(),
  liveRegionAriaLive: z.string().nullable(),
  inputFocused: z.boolean(),
  documentScrollWidthPx: z.number().int().min(0),
  documentClientWidthPx: z.number().int().min(0),
  idleCopyVisible: z.boolean(),
  loadingRowCount: z.number().int().min(0),
  siteEmptyNodeCount: z.number().int().min(0),
  unavailableNoteCount: z.number().int().min(0),
  clearControlVisible: z.boolean(),
  proseTitles: z.array(z.string()),
  structuredRowTypes: z.array(z.string()),
  groups: z.array(groupSchema).min(2).max(2),
  facet: facetSchema.nullable(),
});

const facetKeyboardSchema = z.object({
  optionActivatedByKeyboard: z.record(z.string(), z.boolean()),
  resetByKeyboard: z.boolean(),
  focusRetainedOnInputThroughSettle: z.boolean(),
});

export const searchStatesEvidenceSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string().min(1),
  desktopViewport: z.literal(SEARCH_DESKTOP_VIEWPORT.id),
  mobileViewport: z.literal(SEARCH_MOBILE_VIEWPORT.id),
  states: z.array(stateSchema).min(1),
  facetKeyboard: facetKeyboardSchema,
});

export type SearchStatesEvidence = z.infer<typeof searchStatesEvidenceSchema>;

/* ------------------------------------------------------------------ */
/* Fail-closed reader                                                  */
/* ------------------------------------------------------------------ */

export function readSearchStatesEvidence(input: {
  artifact: unknown;
  fingerprint: string;
}): SearchStatesEvidence {
  const parsed = searchStatesEvidenceSchema.safeParse(input.artifact);
  if (!parsed.success) {
    throw new Error(
      `search-states evidence is malformed: ${parsed.error.issues
        .slice(0, 4)
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  const evidence = parsed.data;
  if (evidence.fingerprint !== input.fingerprint) {
    throw new Error(
      'search-states evidence is stale: the fingerprint does not match the current search closure',
    );
  }

  const memberKey = (stateId: string, viewport: string) =>
    `${stateId}@${viewport}`;
  const expected = new Set([
    ...SEARCH_STATE_IDS.map((id) => memberKey(id, SEARCH_DESKTOP_VIEWPORT.id)),
    ...SEARCH_MOBILE_STATE_IDS.map((id) =>
      memberKey(id, SEARCH_MOBILE_VIEWPORT.id),
    ),
  ]);
  const seen = new Set<string>();
  for (const state of evidence.states) {
    const key = memberKey(state.stateId, state.viewport);
    if (!expected.has(key)) {
      throw new Error(
        `search-states evidence holds unexpected member ${state.stateId} at ${state.viewport}`,
      );
    }
    if (seen.has(key)) {
      throw new Error(
        `search-states evidence holds duplicate member ${state.stateId} at ${state.viewport}`,
      );
    }
    seen.add(key);
  }
  const missing = [...expected].filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(
      `search-states evidence is incomplete: missing ${missing.join(', ')}`,
    );
  }

  for (const state of evidence.states) {
    if (state.stateId === 'state:default-idle') continue;
    if (state.stateId === 'state:cleared-to-idle') continue;
    if (!state.statusText.trim()) {
      throw new Error(
        `search-states evidence member ${state.stateId} recorded an empty status announcement`,
      );
    }
  }
  return evidence;
}

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

export type SearchStateVerdict = {
  id: string;
  failures: string[];
  observed: Record<string, unknown>;
};

function groupOf(
  state: SearchStateObservation,
  id: 'prose' | 'structured',
): SearchStateObservation['groups'][number] {
  const group = state.groups.find((entry) => entry.id === id);
  if (!group) {
    throw new Error(`member ${state.stateId} is missing its ${id} group`);
  }
  return group;
}

/** VAL-B2-DISC-001: every state exposes its own deterministic treatment. */
export function searchStateTreatmentVerdicts(
  evidence: SearchStatesEvidence,
): SearchStateVerdict[] {
  return SEARCH_STATE_IDS.map((stateId) => {
    const state = evidence.states.find(
      (entry) => entry.stateId === stateId,
    );
    if (!state) {
      throw new Error(`search-states sweep decided no member ${stateId}`);
    }
    const failures: string[] = [];
    const observed: Record<string, unknown> = {
      statusText: state.statusText,
      loadingRowCount: state.loadingRowCount,
      idleCopyVisible: state.idleCopyVisible,
    };
    if (state.stateId === 'state:default-idle') {
      if (!state.idleCopyVisible) failures.push('the idle copy is not shown');
      if (state.loadingRowCount > 0) failures.push('a loading row is shown');
      if (state.groups.some((group) => group.rowCount > 0)) {
        failures.push('a results group is populated');
      }
    } else if (state.stateId === 'state:cleared-to-idle') {
      if (!state.idleCopyVisible) failures.push('the idle copy is not shown');
      if (state.groups.some((group) => group.rowCount > 0)) {
        failures.push('a results group is populated');
      }
    } else if (state.stateId === 'state:loading-first-query') {
      if (state.loadingRowCount !== 2) {
        failures.push(
          `expected one loading row per group, saw ${state.loadingRowCount}`,
        );
      }
      if (!/^Searching for/.test(state.statusText)) {
        failures.push('the status line does not announce the in-flight query');
      }
    } else if (state.stateId === 'state:results-both-groups') {
      for (const id of ['prose', 'structured'] as const) {
        const group = groupOf(state, id);
        if (group.rowCount === 0) failures.push(`the ${id} group is empty`);
        if (group.errorNote) failures.push(`the ${id} group shows an error`);
      }
    } else if (state.stateId.startsWith('state:facet-')) {
      const type = state.stateId.slice('state:facet-'.length);
      if (!state.facet) {
        failures.push('no facet reading was recorded');
      } else {
        if (state.facet.selected !== type) {
          failures.push(`the selected facet is ${state.facet.selected}`);
        }
        if (!state.facet.rowTypes.every((row) => row === type)) {
          failures.push('a visible row is not of the selected type');
        }
      }
    } else if (state.stateId === 'state:no-results') {
      if (state.siteEmptyNodeCount !== 1) {
        failures.push('the site-wide no-results node is not shown once');
      }
      for (const id of ['prose', 'structured'] as const) {
        const group = groupOf(state, id);
        if (!group.emptyNote) failures.push(`the ${id} group has no note`);
        if (group.errorNote) failures.push(`the ${id} group shows an error`);
      }
    } else if (state.stateId === 'state:partial-error-prose') {
      const prose = groupOf(state, 'prose');
      const structured = groupOf(state, 'structured');
      if (!prose.errorNote) failures.push('the prose group shows no error');
      if (prose.emptyNote) {
        failures.push('the failed prose group claims nothing matched');
      }
      if (structured.rowCount === 0) {
        failures.push('the healthy structured group is empty');
      }
      if (state.siteEmptyNodeCount > 0) {
        failures.push('the site-wide no-results node is shown');
      }
    } else if (state.stateId === 'state:partial-error-structured') {
      const structured = groupOf(state, 'structured');
      const prose = groupOf(state, 'prose');
      if (!structured.errorNote) {
        failures.push('the structured group shows no error');
      }
      if (structured.emptyNote) {
        failures.push('the failed structured group claims nothing matched');
      }
      if (prose.rowCount === 0) {
        failures.push('the healthy prose group is empty');
      }
      if (state.siteEmptyNodeCount > 0) {
        failures.push('the site-wide no-results node is shown');
      }
    } else if (state.stateId === 'state:total-error') {
      if (state.unavailableNoteCount !== 1) {
        failures.push('the unavailable note is not shown once');
      }
      if (state.statusText !== 'The search index is unavailable') {
        failures.push('the status line does not name the unavailable index');
      }
    }
    return { id: searchStateMemberId(stateId), failures, observed };
  });
}

const SITE_SUFFIX_PATTERNS = [
  /\s[-|]\s*robot-wiki\s*$/i,
  /\s[-|]\s*robot-atlas\s*$/i,
  /[\s|-]+$/,
];

/** VAL-B2-DISC-002: counts, titles, and notes stay data-derived. */
export function searchDataDerivationVerdicts(
  evidence: SearchStatesEvidence,
): SearchStateVerdict[] {
  return SEARCH_RESULT_STATE_IDS.map((stateId) => {
    const state = evidence.states.find(
      (entry) => entry.stateId === stateId,
    );
    if (!state) {
      throw new Error(`search-states sweep decided no member ${stateId}`);
    }
    const failures: string[] = [];
    for (const group of state.groups) {
      if (group.countText === null) {
        if (group.rowCount > 0) {
          failures.push(`the ${group.id} group shows rows without a count`);
        }
        continue;
      }
      const parsed = /^(\d+) results?$/.exec(group.countText.trim());
      if (!parsed) {
        failures.push(
          `the ${group.id} count "${group.countText}" is not a result count`,
        );
      } else if (Number(parsed[1]) !== group.rowCount) {
        failures.push(
          `the ${group.id} count says ${parsed[1]} but ${group.rowCount} rows render`,
        );
      }
    }
    for (const title of state.proseTitles) {
      if (!title.trim()) {
        failures.push('a prose result title is empty');
        continue;
      }
      for (const pattern of SITE_SUFFIX_PATTERNS) {
        if (pattern.test(title)) {
          failures.push(`a prose title carries residue: "${title}"`);
          break;
        }
      }
    }
    if (
      groupOf(state, 'structured').rowCount > 0 &&
      state.structuredRowTypes.length === 0
    ) {
      failures.push('structured rows render without their type labels');
    }
    return {
      id: searchStateMemberId(stateId),
      failures,
      observed: {
        counts: state.groups.map((group) => group.countText),
        proseTitleCount: state.proseTitles.length,
      },
    };
  });
}

/** VAL-B2-DISC-003: lime plus marker plus keyboard clear/reset per option. */
export function searchFacetSelectionVerdicts(
  evidence: SearchStatesEvidence,
): SearchStateVerdict[] {
  return SEARCH_FACET_OPTIONS.map((option) => {
    const failures: string[] = [];
    const observed: Record<string, unknown> = {};
    // Every option, "All types" included, is a real selected state; the
    // sweep records it in whichever member holds that option selected.
    const state =
      option === 'all'
        ? evidence.states.find(
            (entry) => entry.stateId === 'state:results-both-groups',
          )
        : evidence.states.find(
            (entry) => entry.stateId === facetStateId(option),
          );
    if (!state?.facet) {
      failures.push(`no selected reading was recorded for ${option}`);
    } else {
      observed.selected = state.facet.selected;
      observed.selectedBackgroundRgb = state.facet.selectedBackgroundRgb;
      if (state.facet.selected !== option) {
        failures.push(`the selected facet is ${state.facet.selected}`);
      }
      if (state.facet.selectedBackgroundRgb !== SEARCH_SELECTION_RGB) {
        failures.push(
          `the selected ${option} facet computes to ${state.facet.selectedBackgroundRgb}, not lime`,
        );
      }
      if (!state.facet.selectedHasCheckMarker) {
        failures.push(`the selected ${option} facet shows no check marker`);
      }
      if (state.facet.pressedByOption[option] !== true) {
        failures.push(`the selected ${option} facet is not aria-pressed`);
      }
      const pressedOptions = Object.entries(
        state.facet.pressedByOption,
      ).filter(([, pressed]) => pressed);
      if (pressedOptions.length !== 1 || pressedOptions[0][0] !== option) {
        failures.push(
          `${pressedOptions.length} facet options are pressed at once`,
        );
      }
    }
    if (!evidence.facetKeyboard.optionActivatedByKeyboard[option]) {
      failures.push(`${option} cannot be activated by keyboard`);
    }
    if (!evidence.facetKeyboard.resetByKeyboard) {
      failures.push('the facet cannot be reset by keyboard');
    }
    return { id: searchFacetMemberId(option), failures, observed };
  });
}

/** VAL-B2-DISC-004: announcements land without stealing focus. */
export function searchAnnouncementVerdicts(
  evidence: SearchStatesEvidence,
): SearchStateVerdict[] {
  // The states a typed query drives: after typing, focus belongs in the
  // input until the reader moves it. The default idle page is arrival, not
  // typing, so it carries no such expectation.
  const typingDriven = new Set([
    'state:loading-first-query',
    'state:results-both-groups',
    'state:no-results',
    'state:partial-error-prose',
    'state:partial-error-structured',
    'state:total-error',
    'state:cleared-to-idle',
  ]);
  return SEARCH_STATE_IDS.map((stateId): SearchStateVerdict => {
    const state = evidence.states.find(
      (entry) => entry.stateId === stateId,
    );
    if (!state) {
      throw new Error(`search-states sweep decided no member ${stateId}`);
    }
    const failures: string[] = [];
    if (state.liveRegionRole !== 'status') {
      failures.push('the status region does not expose role=status');
    }
    if (state.liveRegionAriaLive !== 'polite') {
      failures.push('the status region is not polite');
    }
    if (typingDriven.has(stateId) && !state.inputFocused) {
      failures.push(
        `${state.stateId} at ${state.viewport} left the input without a directing action`,
      );
    }
    const observed: Record<string, unknown> = {
      statusText: state.statusText,
      inputFocused: state.inputFocused,
    };
    if (stateId === 'state:results-both-groups') {
      // Focus retention through settle is a second observation of this
      // member, not a second member: it is folded into the same verdict so
      // every verdict id stays unique. A verdict appended under the same
      // member id would be collapsed by the generator's per-member index,
      // and the live-region reading it shadowed would stop being published.
      const retained = evidence.facetKeyboard.focusRetainedOnInputThroughSettle;
      observed.focusRetainedOnInputThroughSettle = retained;
      if (!retained) {
        failures.push('focus left the input while the typed query settled');
      }
    }
    return {
      id: searchStateMemberId(stateId),
      failures,
      observed,
    };
  });
}

/** VAL-B2-DISC-007: rows, facets, and clear/reset fit at 375px. */
export function searchMobileFitVerdicts(
  evidence: SearchStatesEvidence,
): SearchStateVerdict[] {
  return SEARCH_MOBILE_STATE_IDS.map((stateId) => {
    const state = evidence.states.find(
      (entry) =>
        entry.stateId === stateId &&
        entry.viewport === SEARCH_MOBILE_VIEWPORT.id,
    );
    if (!state) {
      throw new Error(
        `search-states sweep decided no 375px member ${stateId}`,
      );
    }
    const failures: string[] = [];
    if (state.documentScrollWidthPx > state.documentClientWidthPx) {
      failures.push(
        `the document overflows by ${state.documentScrollWidthPx - state.documentClientWidthPx}px`,
      );
    }
    if (!state.clearControlVisible) {
      failures.push('the clear control is not visible');
    }
    if (
      stateId === 'state:facet-method' &&
      state.facet?.selected !== 'method'
    ) {
      failures.push('the Methods facet is not selected');
    }
    return {
      id: searchStateMemberId(stateId),
      failures,
      observed: {
        scrollWidth: state.documentScrollWidthPx,
        clientWidth: state.documentClientWidthPx,
      },
    };
  });
}
