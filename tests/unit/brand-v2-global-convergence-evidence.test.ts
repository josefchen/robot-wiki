import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONVERGENCE_EXEMPTIONS,
  FRAME_ROWS,
  GLOBAL_CONVERGENCE_ASSERTION_POPULATION_SOURCES,
  GLOBAL_CONVERGENCE_EVIDENCE_PATH,
  GLOBAL_CONVERGENCE_VIEWPORTS,
  ROUTE_ROW_PREDICATES,
  TYPE_POPULATIONS,
  TYPE_POPULATION_SOURCE,
  TYPE_ROW,
  frameRowVerdicts,
  globalConvergenceEvidenceFingerprint,
  globalConvergenceVerdicts,
  readGlobalConvergenceEvidence,
  routeRowVerdicts,
  typePopulationVerdicts,
  type ConvergenceTypeTuple,
  type GlobalConvergenceEvidence,
  type GlobalConvergenceObservation,
} from '@/lib/brand-v2-global-convergence-evidence';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ id: string; path: string }> };
  pageFrames: Array<{ id: string; minimumPaddingPx: number }>;
};
const ROUTE_IDS = REGISTRY.routes.public.map(({ id }) => id);

const COMMITTED = JSON.parse(
  readFileSync(join(ROOT, GLOBAL_CONVERGENCE_EVIDENCE_PATH), 'utf8'),
) as GlobalConvergenceEvidence;

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(change: (evidence: GlobalConvergenceEvidence) => void): GlobalConvergenceEvidence {
  const copy = JSON.parse(JSON.stringify(COMMITTED)) as GlobalConvergenceEvidence;
  change(copy);
  return copy;
}

/** Reads a mutant under the committed fingerprint, so only the mutation can be refused. */
function read(evidence: GlobalConvergenceEvidence, routeIds: readonly string[] = ROUTE_IDS) {
  return readGlobalConvergenceEvidence({ artifact: evidence, fingerprint: COMMITTED.fingerprint, routeIds });
}

function failing(verdicts: Map<string, { failures: string[] }>): string[] {
  return [...verdicts.entries()].filter(([, { failures }]) => failures.length > 0).map(([id]) => id);
}

const at = (evidence: GlobalConvergenceEvidence, routeId: string, viewport: string): GlobalConvergenceObservation => {
  const observation = evidence.observations.find((row) => row.routeId === routeId && row.viewport === viewport);
  if (!observation) throw new Error(`no ${routeId} at ${viewport} in the committed sweep`);
  return observation;
};

/** The registered route a hand-picked sample would skip: the last one. */
const TARGET = ROUTE_IDS[ROUTE_IDS.length - 1];

/** A desktop route owned by each frame kind, read off the committed sweep. */
const ownedBy = (frame: string) =>
  COMMITTED.observations.find(
    (row) => row.viewport === '1440x900' && row.page.frame.owners[0] === frame,
  )!.routeId;

const FULFILLED = [
  'VAL-B2-COL-004',
  'VAL-B2-COL-005',
  'VAL-B2-COL-006',
  'VAL-B2-COL-007',
  'VAL-B2-COL-008',
  'VAL-B2-COL-009',
  'VAL-B2-COMP-001',
  'VAL-B2-COMP-006',
  'VAL-B2-COMP-008',
  'VAL-B2-COMP-016',
  'VAL-B2-SPACE-001',
  'VAL-B2-SPACE-002',
  'VAL-B2-SPACE-003',
  'VAL-B2-SPACE-004',
  'VAL-B2-SPACE-005',
  'VAL-B2-SPACE-006',
  'VAL-B2-TYPE-018',
];

describe('global convergence evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = readGlobalConvergenceEvidence({
      artifact: COMMITTED,
      fingerprint: globalConvergenceEvidenceFingerprint({ root: ROOT, routeIds: ROUTE_IDS }),
      routeIds: ROUTE_IDS,
    });
    const verdicts = globalConvergenceVerdicts(evidence);
    expect(Object.keys(verdicts).sort()).toEqual([...FULFILLED].sort());
    expect(Object.keys(GLOBAL_CONVERGENCE_ASSERTION_POPULATION_SOURCES).sort()).toEqual([...FULFILLED].sort());
    for (const [assertionId, members] of Object.entries(verdicts)) {
      const failures = [...members.values()].flatMap(({ id, failures: list }) => list.map((f) => `${id}: ${f}`));
      expect(failures, assertionId).toEqual([]);
      // Each row's verdict keys are exactly the members of the population it
      // is recorded over, in both directions.
      const source = GLOBAL_CONVERGENCE_ASSERTION_POPULATION_SOURCES[assertionId];
      const members_ =
        source === 'contract/brand-v2-registries.json#routes.public'
          ? ROUTE_IDS
          : source === 'contract/brand-v2-registries.json#pageFrames'
            ? REGISTRY.pageFrames.map(({ id }) => id)
            : source === TYPE_POPULATION_SOURCE
              ? Object.keys(TYPE_POPULATIONS)
              : [];
      expect([...members.keys()].sort(), assertionId).toEqual([...members_].sort());
    }
    // The sweep measures each frame against the inline minimum the page-frame
    // registry declares for it.
    expect(
      GLOBAL_CONVERGENCE_VIEWPORTS.map(({ frame, minimumInlinePaddingPx }) => [frame, minimumInlinePaddingPx]),
    ).toEqual(REGISTRY.pageFrames.map(({ id, minimumPaddingPx }) => [id, minimumPaddingPx]));
  });

  it('refuses stale, incomplete, and vacuous convergence evidence', () => {
    expect(() => read(COMMITTED)).not.toThrow();

    expect(() => read(mutate((e) => ((e as { version: number }).version = 2)))).toThrow(/version 2/);
    expect(() =>
      readGlobalConvergenceEvidence({ artifact: COMMITTED, fingerprint: 'another tree', routeIds: ROUTE_IDS }),
    ).toThrow(/stale/);
    expect(() => read(COMMITTED, [])).toThrow(/public route population is empty/);

    // The route set has to be the registry's in both directions.
    expect(() =>
      read(
        mutate((e) => {
          e.routeIds = e.routeIds.filter((id) => id !== TARGET);
          e.observations = e.observations.filter(({ routeId }) => routeId !== TARGET);
        }),
      ),
    ).toThrow(new RegExp(`dropped: ${TARGET.replace(/[/]/g, '\\/')}`));
    expect(() => read(mutate((e) => e.routeIds.push('route:/planted/')))).toThrow(/extra: route:\/planted\//);
    expect(() =>
      read(
        mutate((e) => {
          const copy = JSON.parse(JSON.stringify(at(e, TARGET, '375x812'))) as GlobalConvergenceObservation;
          copy.routeId = 'route:/planted/';
          e.observations.push(copy);
        }),
      ),
    ).toThrow(/route:\/planted\/, which is not a registered public route/);

    // One reading per route and width, no more and no fewer.
    expect(() => read(mutate((e) => e.observations.push(at(e, TARGET, '375x812'))))).toThrow(/twice/);
    expect(() =>
      read(mutate((e) => e.observations.splice(e.observations.indexOf(at(e, TARGET, '768x1024')), 1))),
    ).toThrow(/missing 1 route\/viewport reading/);
    expect(() => read(mutate((e) => (e.viewports = ['375x812', '1440x900'])))).toThrow(/swept at 375x812, 1440x900/);
    expect(() => read(mutate((e) => (at(e, TARGET, '1440x900').viewport = '1280x800')))).toThrow(
      /unswept viewport|twice|missing/,
    );

    // A page that did not serve, rendered nothing, or gave the keyboard nothing.
    expect(() => read(mutate((e) => (at(e, TARGET, '375x812').status = 404)))).toThrow(/status 404/);
    expect(() => read(mutate((e) => (at(e, TARGET, '375x812').page.counts.textRuns = 0)))).toThrow(/empty page/);
    expect(() => read(mutate((e) => at(e, TARGET, '375x812').focus.pop()))).toThrow(/29 keyboard stop/);
    expect(() =>
      read(mutate((e) => (at(e, TARGET, '375x812').focus = at(e, TARGET, '375x812').focus.map(() => null)))),
    ).toThrow(/reached anything/);

    // An exemption the register does not hold, or holds for something else.
    expect(() =>
      read(
        mutate((e) =>
          at(e, TARGET, '1440x900').page.findings.push({
            predicate: 'gradient',
            element: 'div[data-planted]',
            detail: 'planted',
            exemption: 'planted:anything-goes',
          }),
        ),
      ),
    ).toThrow(/"planted:anything-goes", which the register does not hold/);
    expect(() =>
      read(
        mutate((e) =>
          at(e, TARGET, '1440x900').page.findings.push({
            predicate: 'gradient',
            element: 'pre[data-planted]',
            detail: 'planted',
            exemption: 'code-block-radius',
          }),
        ),
      ),
    ).toThrow(/"code-block-radius" is not registered for gradient/);
    expect(() =>
      read(
        mutate((e) =>
          at(e, TARGET, '1440x900').page.findings.push({
            predicate: 'rounded-corner',
            element: 'div[data-explainers] button',
            detail: 'planted',
            exemption: 'owner-freeze:explainers',
          }),
        ),
      ),
    ).toThrow(new RegExp(`"owner-freeze:explainers" is not registered for ${TARGET.replace(/[/]/g, '\\/')}`));
    expect(() =>
      read(
        mutate((e) =>
          at(e, TARGET, '1440x900').page.offLadderSpacing.push({
            valuePx: 5,
            property: 'paddingTop',
            count: 1,
            element: 'label input[type="radio"]',
            exemption: 'spacing:native-choice-in-label',
          }),
        ),
      ),
    ).toThrow(/"spacing:native-choice-in-label" does not cover paddingTop/);
    expect(() =>
      read(
        mutate((e) =>
          at(e, TARGET, '1440x900').page.offLadderSpacing.push({
            valuePx: 3,
            property: 'marginTop',
            count: 1,
            element: 'label input[type="radio"]',
            exemption: 'spacing:native-choice-in-label',
          }),
        ),
      ),
    ).toThrow(/"spacing:native-choice-in-label" does not cover 3px/);

    // A register entry, or one clause of it, that nothing needed.
    expect(() =>
      read(
        mutate((e) => {
          for (const { page } of e.observations) {
            page.offLadderSpacing = page.offLadderSpacing.filter(
              ({ exemption }) => exemption !== 'spacing:native-choice-in-label',
            );
          }
        }),
      ),
    ).toThrow(/"spacing:native-choice-in-label" registers predicate:spacing-ladder, value:5, which the sweep never needed/);
    expect(() =>
      read(
        mutate((e) => {
          for (const { page } of e.observations) {
            page.offLadderSpacing = page.offLadderSpacing.filter(
              ({ exemption, valuePx }) => !(exemption === 'spacing:em-derived' && valuePx === 4.55),
            );
          }
        }),
      ),
    ).toThrow(/"spacing:em-derived" registers value:4\.55/);
    expect(() =>
      read(
        mutate((e) => {
          for (const observation of e.observations) {
            for (const stop of observation.focus) if (stop) stop.offsetExemption = null;
          }
        }),
      ),
    ).toThrow(/"focus:inset-ring" registers predicate:focus-offset, route:route:\/market-map\/, route:route:\/playground\//);
    // Every register entry is exercised by the committed sweep.
    expect(CONVERGENCE_EXEMPTIONS.length).toBeGreaterThan(0);

    // An empty population decides nothing.
    expect(() =>
      read(
        mutate((e) => {
          for (const { page } of e.observations) page.counts.primaryActions = 0;
        }),
      ),
    ).toThrow(/no primaryActions anywhere/);
    expect(() =>
      read(
        mutate((e) => {
          for (const { page } of e.observations) page.counts.citationLabels = 0;
        }),
      ),
    ).toThrow(/no citationLabels anywhere/);
    expect(() =>
      read(
        mutate((e) => {
          for (const { page } of e.observations) {
            page.typeTuples = page.typeTuples.filter(({ population }) => population !== 'feature');
          }
        }),
      ),
    ).toThrow(/the feature type population is empty/);
    expect(() =>
      read(
        mutate((e) => {
          for (const { page, viewport } of e.observations) if (viewport === '768x1024') page.sectionGaps = [];
        }),
      ),
    ).toThrow(/section-separation population is empty at 768x1024/);
    expect(() =>
      read(
        mutate((e) => {
          for (const { page, viewport } of e.observations) if (viewport === '375x812') page.controlGaps = [];
        }),
      ),
    ).toThrow(/control-gap population is empty at 375x812/);
  });

  it('fails each planted violation under the rows that own it', () => {
    // Every route predicate fails its owning rows on the planted route, and
    // only there.
    const predicates = [...new Set(Object.values(ROUTE_ROW_PREDICATES).flat())].filter(
      (predicate) => predicate !== 'focus-ring',
    );
    for (const predicate of predicates) {
      const planted = mutate((e) =>
        at(e, TARGET, '768x1024').page.findings.push({
          predicate,
          element: 'div[data-planted]',
          detail: 'planted',
          exemption: null,
        }),
      );
      for (const [assertionId, owned] of Object.entries(ROUTE_ROW_PREDICATES)) {
        expect(failing(routeRowVerdicts(planted, assertionId)), `${predicate} under ${assertionId}`).toEqual(
          owned.includes(predicate) ? [TARGET] : [],
        );
      }
      // The same finding under an exemption fails nothing; whether the
      // register grants it is the reader's decision, proved above.
      const exempted = mutate((e) =>
        at(e, TARGET, '768x1024').page.findings.push({
          predicate,
          element: 'div[data-planted]',
          detail: 'planted',
          exemption: 'owner-freeze:explainers',
        }),
      );
      for (const assertionId of Object.keys(ROUTE_ROW_PREDICATES)) {
        expect(failing(routeRowVerdicts(exempted, assertionId)), `exempted ${predicate}`).toEqual([]);
      }
    }

    // The keyboard ring is 1 px solid ink, 2 px out.
    type FocusStop = NonNullable<GlobalConvergenceObservation['focus'][number]>;
    const ring = (change: (stop: FocusStop) => void) =>
      mutate((e) => {
        const stop = at(e, TARGET, '375x812').focus.find((candidate) => candidate && !candidate.exemption)!;
        change(stop);
      });
    const ringCases: Array<[string, (stop: FocusStop) => void]> = [
      ['a signal-blue ring', (stop) => (stop.outlineColour = 'rgb(36, 95, 255)')],
      ['an accent ring', (stop) => (stop.outlineColour = 'rgb(59, 110, 168)')],
      ['a 2 px ring', (stop) => (stop.outlineWidthPx = 2)],
      ['a dotted ring', (stop) => (stop.outlineStyle = 'dotted')],
      ['no ring', (stop) => (stop.outlineStyle = 'none')],
      ['a ring offset 0 px with no inset exemption', (stop) => (stop.outlineOffsetPx = 0)],
    ];
    for (const [label, change] of ringCases) {
      const planted = ring(change);
      expect(failing(routeRowVerdicts(planted, 'VAL-B2-COL-006')), label).toEqual([TARGET]);
      for (const assertionId of Object.keys(ROUTE_ROW_PREDICATES).filter((id) => id !== 'VAL-B2-COL-006')) {
        expect(failing(routeRowVerdicts(planted, assertionId)), `${label} under ${assertionId}`).toEqual([]);
      }
    }
    expect(
      failing(
        routeRowVerdicts(
          ring((stop) => {
            stop.outlineOffsetPx = -1;
            stop.offsetExemption = 'focus:inset-ring';
          }),
          'VAL-B2-COL-006',
        ),
      ),
      'an excused inset ring',
    ).toEqual([]);
    expect(
      failing(
        routeRowVerdicts(
          ring((stop) => {
            stop.outlineOffsetPx = -1;
            stop.offsetExemption = 'focus:inset-ring';
            stop.outlineWidthPx = 2;
          }),
          'VAL-B2-COL-006',
        ),
      ),
      'an inset exemption excuses only the offset',
    ).toEqual([TARGET]);

    // The frame rows: each defect fails its own rows at its own frame.
    const editorial = ownedBy('frame:article');
    const narrow = ownedBy('frame:narrow');
    const sheet = ownedBy('frame:sheet');
    const frameCases: Array<[string, (e: GlobalConvergenceEvidence) => void, string[], string]> = [
      [
        'an unregistered 7 px margin',
        (e) =>
          at(e, TARGET, '375x812').page.offLadderSpacing.push({
            valuePx: 7,
            property: 'marginTop',
            count: 1,
            element: 'div[data-planted]',
            exemption: null,
          }),
        ['VAL-B2-SPACE-001', 'VAL-B2-SPACE-005'],
        'frame:mobile',
      ],
      [
        'a 20 px half-step',
        (e) =>
          at(e, TARGET, '375x812').page.offLadderSpacing.push({
            valuePx: 20,
            property: 'marginTop',
            count: 1,
            element: 'div[data-planted]',
            exemption: null,
          }),
        [],
        'frame:mobile',
      ],
      [
        'a spacing token off the ladder',
        (e) => {
          const token = at(e, TARGET, '768x1024').page.spacingTokens.find(({ name }) => name === '--space-128')!;
          token.valuePx = 120;
        },
        ['VAL-B2-SPACE-001', 'VAL-B2-SPACE-005'],
        'frame:tablet',
      ],
      [
        'text 8 px from the edge',
        (e) =>
          at(e, TARGET, '375x812').page.findings.push({
            predicate: 'inline-padding',
            element: 'p[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-002'],
        'frame:mobile',
      ],
      [
        'a section 40 px under the last block on a phone',
        (e) => at(e, TARGET, '375x812').page.sectionGaps.push({ element: 'h2[data-planted]', gapPx: 40, exemption: null }),
        ['VAL-B2-SPACE-003'],
        'frame:mobile',
      ],
      [
        'a section 100 px under the last block on a tablet',
        (e) => at(e, TARGET, '768x1024').page.sectionGaps.push({ element: 'h2[data-planted]', gapPx: 100, exemption: null }),
        [],
        'frame:tablet',
      ],
      [
        'a section 60 px under the last block on the desktop',
        (e) => at(e, TARGET, '1440x900').page.sectionGaps.push({ element: 'h2[data-planted]', gapPx: 60, exemption: null }),
        ['VAL-B2-SPACE-003'],
        'frame:desktop',
      ],
      [
        'a component padded 8 px',
        (e) =>
          at(e, TARGET, '1440x900').page.componentInteriors.push({
            element: 'div[data-planted]',
            paddingPx: [8, 16],
            exemption: null,
          }),
        ['VAL-B2-SPACE-003'],
        'frame:desktop',
      ],
      [
        'related controls 16 px apart',
        (e) => at(e, TARGET, '375x812').page.controlGaps.push({ element: 'button[data-planted]', gapPx: 16, exemption: null }),
        ['VAL-B2-SPACE-003'],
        'frame:mobile',
      ],
      [
        'a 1100 px paragraph',
        (e) => (at(e, TARGET, '375x812').page.frame.widestParagraphPx = 1100),
        ['VAL-B2-SPACE-004'],
        'frame:mobile',
      ],
      [
        'a 1200 px editorial frame',
        (e) => (at(e, editorial, '1440x900').page.frame.wideFrameWidthPx = 1200),
        ['VAL-B2-SPACE-004'],
        'frame:desktop',
      ],
      [
        'a 1000 px reading column',
        (e) => (at(e, editorial, '1440x900').page.frame.readingColumnWidthPx = 1000),
        ['VAL-B2-SPACE-004'],
        'frame:desktop',
      ],
      [
        'a 1000 px sheet column',
        (e) => (at(e, sheet, '1440x900').page.frame.frameContentWidthPx = 1000),
        ['VAL-B2-SPACE-004'],
        'frame:desktop',
      ],
      [
        'a 75ch narrow frame',
        (e) => {
          const frame = at(e, narrow, '1440x900').page.frame;
          frame.frameContentWidthPx = (frame.frameCh ?? 1) * 75;
        },
        ['VAL-B2-SPACE-004'],
        'frame:desktop',
      ],
      [
        'an h1 no frame owns',
        (e) => (at(e, TARGET, '375x812').page.frame.owners = []),
        ['VAL-B2-SPACE-005'],
        'frame:mobile',
      ],
      [
        'an h1 in an unregistered frame',
        (e) => (at(e, TARGET, '768x1024').page.frame.owners = ['frame:planted']),
        ['VAL-B2-SPACE-005'],
        'frame:tablet',
      ],
      [
        'two text boxes overlapping',
        (e) =>
          at(e, TARGET, '375x812').page.findings.push({
            predicate: 'text-collision',
            element: 'span[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-005', 'VAL-B2-SPACE-006'],
        'frame:mobile',
      ],
      [
        'clipped text',
        (e) =>
          at(e, TARGET, '1440x900').page.findings.push({
            predicate: 'clipped-text',
            element: 'span[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-006'],
        'frame:desktop',
      ],
      [
        'a heading broken inside a word',
        (e) =>
          at(e, TARGET, '375x812').page.findings.push({
            predicate: 'broken-word',
            element: 'h1[data-planted]',
            detail: 'planted',
            exemption: null,
          }),
        ['VAL-B2-SPACE-006'],
        'frame:mobile',
      ],
      [
        'a focused control under an overlay',
        (e) => {
          const stop = at(e, TARGET, '768x1024').focus.find((candidate) => candidate && !candidate.exemption)!;
          stop.obscuredBy = 'div.planted-overlay';
        },
        ['VAL-B2-SPACE-006'],
        'frame:tablet',
      ],
    ];
    for (const [label, change, rows, frame] of frameCases) {
      const planted = mutate(change);
      for (const assertionId of FRAME_ROWS) {
        expect(failing(frameRowVerdicts(planted, assertionId)), `${label} under ${assertionId}`).toEqual(
          rows.includes(assertionId) ? [frame] : [],
        );
      }
    }

    // A tuple outside every sealed form fails its own population only.
    const tuple = (overrides: Partial<ConvergenceTypeTuple>): ConvergenceTypeTuple => ({
      population: 'reading-body',
      family: 'Geist',
      weight: 400,
      sizePx: 16,
      lineHeightRatio: 1.62,
      trackingEm: 0,
      transform: 'none',
      parentSizeRatio: 1,
      maxLineWidthPx: 700,
      count: 1,
      element: 'p[data-planted]',
      text: 'planted',
      exemption: null,
      ...overrides,
    });
    for (const population of Object.keys(TYPE_POPULATIONS)) {
      const planted = mutate((e) =>
        at(e, TARGET, '1440x900').page.typeTuples.push(tuple({ population, family: 'Tektur' })),
      );
      expect(failing(typePopulationVerdicts(planted)), population).toEqual([population]);
      const exempted = mutate((e) =>
        at(e, TARGET, '1440x900').page.typeTuples.push(
          tuple({ population, family: 'Tektur', exemption: 'owner-freeze:explainers' }),
        ),
      );
      expect(failing(typePopulationVerdicts(exempted)), `exempted ${population}`).toEqual([]);
    }
    for (const [label, viewport, overrides, fails] of [
      ['a 17 px reading line', '1440x900', { sizePx: 17 }, true],
      ['a reading line 1.4 tall', '375x812', { lineHeightRatio: 1.4 }, true],
      ['a 1000 px reading line', '1440x900', { maxLineWidthPx: 1000 }, true],
      ['a sealed reading line', '375x812', {}, false],
      [
        'a 60 px page h1 on a phone',
        '375x812',
        { population: 'page-h1', family: 'DM Sans', sizePx: 60, lineHeightRatio: 0.92, maxLineWidthPx: 320 },
        true,
      ],
      [
        'a 60 px page h1 on a tablet',
        '768x1024',
        { population: 'page-h1', family: 'DM Sans', sizePx: 60, lineHeightRatio: 0.92, maxLineWidthPx: 640 },
        false,
      ],
      [
        'an untracked section head',
        '1440x900',
        {
          population: 'section-display',
          family: 'DM Sans',
          weight: 600,
          sizePx: 20,
          lineHeightRatio: 1.3,
          trackingEm: 0,
          transform: 'uppercase',
        },
        true,
      ],
      [
        'a superscript at its line size',
        '1440x900',
        { population: 'script', sizePx: 12, lineHeightRatio: 1, maxLineWidthPx: 20, parentSizeRatio: 1 },
        true,
      ],
    ] as const) {
      const planted = mutate((e) =>
        at(e, TARGET, viewport).page.typeTuples.push(tuple(overrides as Partial<ConvergenceTypeTuple>)),
      );
      const population = (overrides as Partial<ConvergenceTypeTuple>).population ?? 'reading-body';
      expect(failing(typePopulationVerdicts(planted)), label).toEqual(fails ? [population] : []);
    }

    // An omitted population is a failure of its own, not a silent pass.
    const emptied = mutate((e) => {
      for (const { page } of e.observations) {
        page.typeTuples = page.typeTuples.filter(({ population }) => population !== 'registration-label');
      }
    });
    expect(failing(typePopulationVerdicts(emptied))).toEqual(['registration-label']);
    expect(typePopulationVerdicts(emptied).get('registration-label')!.failures).toEqual([
      'the registration-label population is empty',
    ]);
    expect(TYPE_ROW).toBe('VAL-B2-TYPE-018');
  });
});
