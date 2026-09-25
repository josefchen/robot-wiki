import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import {
  DISCOVERY_ANCHORS,
  DISCOVERY_ROUTES,
  DOMAIN_LANDING_ROUTES,
  INDEX_ROWS_EVIDENCE_PATH,
  INDEX_SURFACE_ROUTES,
  ROW_RHYTHM_ROUTES,
  discoveryAnchorMemberId,
  discoveryIndexVerdicts,
  editorialRowSurfaceVerdicts,
  expectedGlossaryIds,
  expectedRowCounts,
  indexRowsEvidenceFingerprint,
  indexSurfaceMemberId,
  readIndexRowsEvidence,
  rowRhythmMemberId,
  rowRhythmVerdicts,
  type IndexRowsEvidence,
} from '@/lib/brand-v2-index-evidence';

const ROOT = process.cwd();

function fingerprint(): string {
  return indexRowsEvidenceFingerprint({ root: ROOT });
}

function committed(): IndexRowsEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, INDEX_ROWS_EVIDENCE_PATH), 'utf8'),
  ) as IndexRowsEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: IndexRowsEvidence) => void,
): IndexRowsEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as IndexRowsEvidence;
  change(copy);
  return copy;
}

function accept(evidence: IndexRowsEvidence): IndexRowsEvidence {
  return readIndexRowsEvidence({
    artifact: evidence,
    fingerprint: fingerprint(),
  });
}

describe('index-rows evidence', () => {
  it('refuses stale, incomplete, and unmeasured index evidence', () => {
    // The committed artifact reads clean against the current tree.
    expect(() => accept(committed())).not.toThrow();

    // A stale fingerprint is refused rather than degraded.
    const stale = mutate((evidence) => {
      evidence.fingerprint = '0'.repeat(64);
    });
    expect(() => readIndexRowsEvidence({ artifact: stale, fingerprint: fingerprint() })).toThrow(
      /stale/,
    );

    // The wrong viewport is refused.
    const wrongViewport = mutate((evidence) => {
      evidence.viewport = '375x812';
    });
    expect(() => accept(wrongViewport)).toThrow(/375x812/);

    // A missing surface is refused in neither direction.
    const missingSurface = mutate((evidence) => {
      evidence.surfaces = evidence.surfaces.filter(
        ({ route }) => route !== '/glossary/',
      );
    });
    expect(() => accept(missingSurface)).toThrow(/missing: \[\/glossary\/\]/);
    const extraSurface = mutate((evidence) => {
      evidence.surfaces.push({
        ...evidence.surfaces[0],
        route: '/not-a-route/',
      });
    });
    expect(() => accept(extraSurface)).toThrow(/extra: \[\/not-a-route\/\]/);

    // An empty page proves nothing and is refused.
    const emptyPage = mutate((evidence) => {
      const glossary = evidence.surfaces.find(({ route }) => route === '/glossary/');
      if (glossary) glossary.visibleTextLength = 0;
    });
    expect(() => accept(emptyPage)).toThrow(/empty rendered page/);

    // A surface with no row list was never measured as an index.
    const noRows = mutate((evidence) => {
      const az = evidence.surfaces.find(({ route }) => route === '/a-z/');
      if (az) az.rowLists = [];
    });
    expect(() => accept(noRows)).toThrow(/no row list at \/a-z\//);

    // A missing fragment-keyboard reading is refused by name.
    const noReading = mutate((evidence) => {
      evidence.fragmentKeyboard = evidence.fragmentKeyboard.filter(
        ({ route, initiator }) =>
          !(route === '/glossary/' && initiator === 'cross-route-link'),
      );
    });
    expect(() => accept(noReading)).toThrow(
      /missing the cross-route-link fragment reading for \/glossary\//,
    );
  });

  it('covers the exact registry-derived populations, in neither direction silent', () => {
    const evidence = accept(committed());
    expect(evidence.surfaces.map(({ route }) => route)).toEqual([
      ...INDEX_SURFACE_ROUTES,
    ]);

    // The verdict populations are the ones the assertions name.
    expect(editorialRowSurfaceVerdicts(evidence).map(({ id }) => id)).toEqual(
      ['/', ...DOMAIN_LANDING_ROUTES].map(indexSurfaceMemberId),
    );
    expect(discoveryIndexVerdicts(evidence).map(({ id }) => id)).toEqual(
      DISCOVERY_ROUTES.flatMap((route) =>
        DISCOVERY_ANCHORS.map((anchor) => discoveryAnchorMemberId(route, anchor)),
      ),
    );
    expect(rowRhythmVerdicts(evidence).map(({ id }) => id)).toEqual(
      ROW_RHYTHM_ROUTES.map(rowRhythmMemberId),
    );

    // The expectations the verdicts compare against are registry-derived.
    const counts = expectedRowCounts();
    expect(counts['/a-z/']).toBe(
      publishedModules().length + expectedGlossaryIds().length,
    );
    expect(counts['/glossary/']).toBe(expectedGlossaryIds().length);
  });

  it('fails the members its predicates exist to catch, and only those', () => {
    // Stripping the separator rules fails the rhythm and shared-treatment
    // members, not the inventory one.
    const stripped = mutate((evidence) => {
      const glossary = evidence.surfaces.find(({ route }) => route === '/glossary/');
      if (glossary) {
        for (const list of glossary.rowLists) {
          list.separatorRuleWidthPx = [];
          list.separatorRuleStyles = [];
        }
      }
    });
    const rhythm = rowRhythmVerdicts(stripped)
      .find((v) => v.route === '/glossary/')!
      .failures.join('\n');
    expect(rhythm).toContain('no 1px rule');
    const shared = discoveryIndexVerdicts(stripped).find(
      (v) => v.route === '/glossary/' && v.anchor === 'shared-index-treatment',
    )!.failures.join('\n');
    expect(shared).toContain('no 1px separator rule');
    // The deep-links anchor of the same route is untouched.
    expect(
      discoveryIndexVerdicts(stripped).find(
        (v) => v.route === '/glossary/' && v.anchor === 'deep-links',
      )!.failures,
    ).toEqual([]);

    // A fragment that leaves focus on the body fails only the keyboard
    // anchor.
    const bodyFocus = mutate((evidence) => {
      for (const reading of evidence.fragmentKeyboard) {
        if (reading.route === '/a-z/' && reading.initiator === 'direct-url') {
          reading.targetReceivedFocus = false;
          reading.nextTabContinuesAtTarget = false;
          reading.activeElementTag = 'BODY';
          reading.activeElementId = '';
        }
      }
    });
    const azVerdicts = discoveryIndexVerdicts(bodyFocus).filter(
      (v) => v.route === '/a-z/',
    );
    expect(
      azVerdicts.find((v) => v.anchor === 'keyboard-reachability')!.failures.join('\n'),
    ).toContain('left focus on <BODY>');
    expect(
      azVerdicts.filter((v) => v.anchor !== 'keyboard-reachability').flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);

    // A missing fragment target fails the deep-links anchor by name.
    const missingTarget = mutate((evidence) => {
      const az = evidence.surfaces.find(({ route }) => route === '/a-z/');
      if (az?.deepLinkTargets) {
        az.deepLinkTargets.missing = [az.deepLinkTargets.missing[0] ?? 'letter-zz'];
      }
    });
    expect(
      discoveryIndexVerdicts(missingTarget).find(
        (v) => v.route === '/a-z/' && v.anchor === 'deep-links',
      )!.failures.join('\n'),
    ).toContain('missing fragment target');

    // A boxed-card conversion fails both editorial and rhythm members.
    const boxed = mutate((evidence) => {
      const domain = evidence.surfaces.find(
        ({ route }) => route === '/frontier/',
      );
      if (domain) {
        for (const list of domain.rowLists) list.boxedRowCount = 6;
      }
    });
    expect(
      editorialRowSurfaceVerdicts(boxed)
        .find((v) => v.route === '/frontier/')!
        .failures.join('\n'),
    ).toContain('four-sided bordered boxes');
    expect(
      rowRhythmVerdicts(boxed).find((v) => v.route === '/frontier/')!.failures.join('\n'),
    ).toContain('boxed card rows');

    // An inventory that drifts from the registry fails the editorial and
    // source-wording members with the expected count named.
    const drift = mutate((evidence) => {
      const domain = evidence.surfaces.find(
        ({ route }) => route === '/manipulation/',
      );
      if (domain) {
        for (const list of domain.rowLists) list.rowCount = 999;
      }
    });
    const expected = expectedRowCounts()['/manipulation/'];
    expect(
      editorialRowSurfaceVerdicts(drift)
        .find((v) => v.route === '/manipulation/')!
        .failures.join('\n'),
    ).toContain(`not the ${expected} the registry derives`);
    expect(
      discoveryIndexVerdicts(drift).flatMap(({ failures }) => failures),
    ).toEqual([]);
  });

  it('holds every committed member green against the current registries', () => {
    const evidence = accept(committed());
    expect(
      editorialRowSurfaceVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      discoveryIndexVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    expect(
      rowRhythmVerdicts(evidence).flatMap(({ failures }) => failures),
    ).toEqual([]);
    // Every fragment reading the committed sweep recorded actually moved
    // focus where the verdict requires it.
    for (const reading of evidence.fragmentKeyboard) {
      if (reading.initiator === 'in-page-jump') continue;
      expect(
        `${reading.route} ${reading.initiator} focus=${reading.activeElementTag}#${reading.activeElementId}`,
        reading.fragment,
      ).toBeTruthy();
    }
  });
});
