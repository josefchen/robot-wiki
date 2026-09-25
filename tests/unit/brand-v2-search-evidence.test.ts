import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES } from '@/lib/structured-search';
import {
  SEARCH_DESKTOP_VIEWPORT,
  SEARCH_FACET_OPTIONS,
  SEARCH_MOBILE_STATE_IDS,
  SEARCH_MOBILE_VIEWPORT,
  SEARCH_RESULT_STATE_IDS,
  SEARCH_STATE_IDS,
  SEARCH_STATES_EVIDENCE_PATH,
  facetStateId,
  readSearchStatesEvidence,
  searchAnnouncementVerdicts,
  searchDataDerivationVerdicts,
  searchFacetMemberId,
  searchFacetSelectionVerdicts,
  searchMobileFitVerdicts,
  searchStateMemberId,
  searchStateTreatmentVerdicts,
  searchStatesEvidenceFingerprint,
  type SearchStatesEvidence,
} from '@/lib/brand-v2-search-evidence';

const ROOT = process.cwd();

function fingerprint(): string {
  return searchStatesEvidenceFingerprint({ root: ROOT });
}

function committed(): SearchStatesEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, SEARCH_STATES_EVIDENCE_PATH), 'utf8'),
  ) as SearchStatesEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: SearchStatesEvidence) => void,
): SearchStatesEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as SearchStatesEvidence;
  change(copy);
  return copy;
}

function accept(evidence: SearchStatesEvidence): SearchStatesEvidence {
  return readSearchStatesEvidence({
    artifact: evidence,
    fingerprint: fingerprint(),
  });
}

describe('search-states evidence', () => {
  it('refuses stale, incomplete, and malformed search evidence', () => {
    // The committed artifact reads clean against the current tree.
    expect(() => accept(committed())).not.toThrow();

    // A stale fingerprint is refused rather than degraded.
    const stale = mutate((evidence) => {
      evidence.fingerprint = '0'.repeat(64);
    });
    expect(() =>
      readSearchStatesEvidence({ artifact: stale, fingerprint: fingerprint() }),
    ).toThrow(/stale/);

    // A missing state is refused by name.
    const missing = mutate((evidence) => {
      evidence.states = evidence.states.filter(
        ({ stateId }) => stateId !== 'state:no-results',
      );
    });
    expect(() => accept(missing)).toThrow(/missing state:no-results@1440x900/);

    // An extra state is refused in the other direction.
    const extra = mutate((evidence) => {
      evidence.states.push({
        ...evidence.states[0],
        stateId: 'state:not-a-state',
        viewport: SEARCH_DESKTOP_VIEWPORT.id,
      });
    });
    expect(() => accept(extra)).toThrow(/unexpected member state:not-a-state/);

    // The same state recorded twice at one viewport is a duplicate, not a
    // second chance.
    const duplicate = mutate((evidence) => {
      evidence.states.push(
        evidence.states.find(
          ({ stateId }) => stateId === 'state:no-results',
        )!,
      );
    });
    expect(() => accept(duplicate)).toThrow(/duplicate member state:no-results/);

    // A missing 375px member is refused even though its desktop twin exists.
    const noMobile = mutate((evidence) => {
      evidence.states = evidence.states.filter(
        ({ viewport }) => viewport !== SEARCH_MOBILE_VIEWPORT.id,
      );
    });
    expect(() => accept(noMobile)).toThrow(
      /missing state:results-both-groups@375x812/,
    );

    // A state that settled without announcing anything is unmeasured.
    const silent = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === 'state:total-error',
      );
      if (state) state.statusText = '';
    });
    expect(() => accept(silent)).toThrow(/empty status announcement/);

    // A malformed artifact is refused rather than partially read.
    expect(() =>
      readSearchStatesEvidence({
        artifact: { version: 2 },
        fingerprint: fingerprint(),
      }),
    ).toThrow(/malformed/);
  });

  it('covers the exact derived populations, in neither direction silent', () => {
    const evidence = accept(committed());

    // The facet options are the shipped entity types plus the reset, and
    // the state machine is the interface's own, never a copy of the run.
    expect([...SEARCH_FACET_OPTIONS]).toEqual(['all', ...ENTITY_TYPES]);
    expect([...SEARCH_STATE_IDS]).toEqual([
      'state:default-idle',
      'state:loading-first-query',
      'state:results-both-groups',
      ...ENTITY_TYPES.map(facetStateId),
      'state:no-results',
      'state:partial-error-prose',
      'state:partial-error-structured',
      'state:total-error',
      'state:cleared-to-idle',
    ]);

    // The verdict populations are the ones the assertions name.
    expect(searchStateTreatmentVerdicts(evidence).map(({ id }) => id)).toEqual(
      SEARCH_STATE_IDS.map(searchStateMemberId),
    );
    expect(searchDataDerivationVerdicts(evidence).map(({ id }) => id)).toEqual(
      SEARCH_RESULT_STATE_IDS.map(searchStateMemberId),
    );
    expect(searchFacetSelectionVerdicts(evidence).map(({ id }) => id)).toEqual(
      SEARCH_FACET_OPTIONS.map(searchFacetMemberId),
    );
    expect(searchAnnouncementVerdicts(evidence).map(({ id }) => id)).toEqual(
      SEARCH_STATE_IDS.map(searchStateMemberId),
    );
    expect(searchMobileFitVerdicts(evidence).map(({ id }) => id)).toEqual(
      SEARCH_MOBILE_STATE_IDS.map(searchStateMemberId),
    );
  });

  it('keeps one announcement verdict per member, holding both observations', () => {
    const evidence = accept(committed());
    const announcements = searchAnnouncementVerdicts(evidence);
    // One verdict per state member, no duplicate ids: the generator indexes
    // the verdicts by member id, so a second verdict reusing a member's id
    // would silently overwrite the first observation instead of joining it.
    expect(new Set(announcements.map(({ id }) => id)).size).toBe(
      announcements.length,
    );

    // The settled-results member carries both of its DISC-004 readings:
    // the live-region announcement and focus retention through settle.
    const settled = announcements.find(
      ({ id }) => id === searchStateMemberId('state:results-both-groups'),
    )!;
    expect(settled.observed).toMatchObject({
      statusText: expect.any(String),
      inputFocused: true,
      focusRetainedOnInputThroughSettle: true,
    });

    // A settle that moved focus out of the input fails the same member by
    // name, so the folded-in reading is still a decidable predicate.
    const stoleFocusDuringSettle = mutate((copy) => {
      copy.facetKeyboard.focusRetainedOnInputThroughSettle = false;
    });
    expect(
      searchAnnouncementVerdicts(stoleFocusDuringSettle)
        .find(
          ({ id }) => id === searchStateMemberId('state:results-both-groups'),
        )!
        .failures,
    ).toContain('focus left the input while the typed query settled');
  });

  it('fails the members its predicates exist to catch, and only those', () => {
    // A fabricated empty note on a failed index is the lie this family
    // exists to catch: the failed group must not claim nothing matched.
    const fabricated = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === 'state:partial-error-prose',
      );
      const prose = state?.groups.find(({ id }) => id === 'prose');
      if (prose) {
        prose.errorNote = false;
        prose.emptyNote = true;
      }
    });
    const treatment = searchStateTreatmentVerdicts(fabricated)
      .find(({ id }) => id === searchStateMemberId('state:partial-error-prose'))!
      .failures.join('\n');
    expect(treatment).toContain('shows no error');
    expect(treatment).toContain('claims nothing matched');

    // A count that disagrees with its rows fails the derivation member.
    const lying = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === 'state:results-both-groups',
      );
      const structured = state?.groups.find(({ id }) => id === 'structured');
      if (structured) structured.countText = '99 results';
    });
    expect(
      searchDataDerivationVerdicts(lying)
        .find(({ id }) => id === searchStateMemberId('state:results-both-groups'))!
        .failures.join('\n'),
    ).toContain('count says 99 but');

    // A title carrying site suffix residue fails by name.
    const suffixed = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === 'state:results-both-groups',
      );
      if (state?.proseTitles.length) {
        state.proseTitles[0] = `${state.proseTitles[0]} - robot-wiki`;
      }
    });
    expect(
      searchDataDerivationVerdicts(suffixed)
        .find(({ id }) => id === searchStateMemberId('state:results-both-groups'))!
        .failures.join('\n'),
    ).toContain('residue');

    // A facet selected without its lime fails, and so does one whose
    // keyboard activation was never recorded.
    const unlabeled = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === facetStateId('dataset'),
      );
      if (state?.facet) state.facet.selectedBackgroundRgb = 'rgb(250, 250, 247)';
    });
    expect(
      searchFacetSelectionVerdicts(unlabeled).flatMap(({ failures }) => failures),
    ).toContain(
      'the selected dataset facet computes to rgb(250, 250, 247), not lime',
    );
    const noKeyboard = mutate((evidence) => {
      evidence.facetKeyboard.optionActivatedByKeyboard.company = false;
    });
    expect(
      searchFacetSelectionVerdicts(noKeyboard).flatMap(({ failures }) => failures),
    ).toContain('company cannot be activated by keyboard');

    // An announcement that moved focus out of the input fails by name.
    const stoleFocus = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId }) => stateId === 'state:no-results',
      );
      if (state) state.inputFocused = false;
    });
    expect(
      searchAnnouncementVerdicts(stoleFocus).flatMap(({ failures }) => failures),
    ).toContain(
      'state:no-results at 1440x900 left the input without a directing action',
    );

    // A 375px member that overflowed the document fails by name.
    const overflowed = mutate((evidence) => {
      const state = evidence.states.find(
        ({ stateId, viewport }) =>
          stateId === 'state:facet-method' && viewport === SEARCH_MOBILE_VIEWPORT.id,
      );
      if (state) state.documentScrollWidthPx = 400;
    });
    expect(
      searchMobileFitVerdicts(overflowed).flatMap(({ failures }) => failures),
    ).toContain('the document overflows by 25px');
  });

  it('holds every committed member green against the current tree', () => {
    const evidence = accept(committed());
    expect(
      searchStateTreatmentVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      searchDataDerivationVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      searchFacetSelectionVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      searchAnnouncementVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      searchMobileFitVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
  });
});

describe('search enforcement artifacts', () => {
  /** The five DISC rows the search-states family measures per member. */
  const SEARCH_ASSERTION_IDS = [
    'VAL-B2-DISC-001',
    'VAL-B2-DISC-002',
    'VAL-B2-DISC-003',
    'VAL-B2-DISC-004',
    'VAL-B2-DISC-007',
  ] as const;

  type EnforcementMapDocument = {
    rows: Array<{
      assertionId: string;
      enforcementTargets: Array<{
        kind: string;
        mechanism: string;
        file?: string;
      }>;
    }>;
  };

  function committedMap(): EnforcementMapDocument {
    return JSON.parse(
      readFileSync(
        join(ROOT, 'contract', 'brand-v2-enforcement-map.json'),
        'utf8',
      ),
    ) as EnforcementMapDocument;
  }

  it('routes the five search-state rows through the persisted sweep, not pending rollout', () => {
    const map = committedMap();
    for (const assertionId of SEARCH_ASSERTION_IDS) {
      const row = map.rows.find((entry) => entry.assertionId === assertionId);
      if (!row) throw new Error(`${assertionId} has no map row`);
      const evidenceRow = row.enforcementTargets.find(
        (target) => target.kind === 'evidence-row',
      );
      if (!evidenceRow) {
        throw new Error(`${assertionId} names no evidence-row target`);
      }
      // These rows are measured: their results are per-member passes over
      // the committed sweep. The mechanism must say so instead of
      // disclaiming rollout evidence the artifact already holds.
      expect(evidenceRow.mechanism).toContain(
        'per-member evidence derived from the persisted search-states sweep',
      );
      expect(evidenceRow.mechanism).not.toContain('pending rollout evidence');
      // The sweep that writes the artifact and the reader gate that
      // refuses a stale or incomplete one are both named as test targets.
      const testFiles = row.enforcementTargets
        .filter((target) => target.kind === 'test')
        .map((target) => target.file);
      expect(testFiles).toContain('tests/e2e/brand-v2-search-states.spec.ts');
      expect(testFiles).toContain('tests/unit/brand-v2-search-evidence.test.ts');
    }
  });

  it('keeps both live-region and focus-retention readings on the DISC-004 results member', () => {
    const corpus = JSON.parse(
      readFileSync(join(ROOT, 'evidence', 'brand-v2', 'results.json'), 'utf8'),
    ) as {
      results: Array<{
        resultId: string;
        payload?: { computed?: Record<string, unknown> };
      }>;
    };
    const row = corpus.results.find(
      (entry) =>
        entry.resultId ===
        'result:VAL-B2-DISC-004:search-state:state:results-both-groups',
    );
    if (!row) {
      throw new Error('the DISC-004 results-both-groups result row is missing');
    }
    // The member is announced (statusText over a polite status region,
    // focus held in the input) and keeps focus through settle; a verdict
    // family whose ids collide would publish only one of the two readings.
    expect(row.payload?.computed).toMatchObject({
      statusText: expect.any(String),
      inputFocused: true,
      focusRetainedOnInputThroughSettle: true,
    });
  });
});
