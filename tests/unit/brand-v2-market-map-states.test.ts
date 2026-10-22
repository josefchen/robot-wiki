import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import {
  MARKET_MAP_CASE_GROUPS,
  MARKET_MAP_FILTER_DIMENSIONS,
  MARKET_MAP_INDEPENDENT_DIMENSIONS,
  MARKET_MAP_LATENCY_SAMPLES,
  MARKET_MAP_PAIRWISE_ALGORITHM,
  MARKET_MAP_PAIRWISE_SEED,
  MARKET_MAP_STATES_EVIDENCE_PATH,
  MARKET_MAP_UPDATE_CEILING_MS,
  expectedCompanies,
  ipogPairwise,
  marketMapCaseGroupMemberId,
  marketMapCaseVerdicts,
  marketMapFilterOptions,
  marketMapGroupCaseCounts,
  marketMapGroupVerdicts,
  marketMapStatePlan,
  marketMapStatesEvidenceFingerprint,
  readMarketMapStatesEvidence,
  uncoveredPairs,
  type MarketMapStatesEvidence,
} from '@/lib/brand-v2-market-map-states';

const ROOT = process.cwd();

function fingerprint(): string {
  return marketMapStatesEvidenceFingerprint({ root: ROOT });
}

function committed(): MarketMapStatesEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, MARKET_MAP_STATES_EVIDENCE_PATH), 'utf8'),
  ) as MarketMapStatesEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: MarketMapStatesEvidence) => void,
): MarketMapStatesEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as MarketMapStatesEvidence;
  change(copy);
  return copy;
}

function accept(evidence: MarketMapStatesEvidence): MarketMapStatesEvidence {
  return readMarketMapStatesEvidence({ artifact: evidence, fingerprint: fingerprint() });
}

describe('market-map-states evidence', () => {
  it('refuses stale, incomplete, reordered and malformed market-map evidence', () => {
    // The committed artifact reads clean against the current tree.
    expect(() => accept(committed())).not.toThrow();

    const stale = mutate((evidence) => {
      evidence.fingerprint = '0'.repeat(64);
    });
    expect(() => accept(stale)).toThrow(/stale/);

    // A dropped case is refused by name, and the recorded counts cannot
    // paper over it.
    const dropped = mutate((evidence) => {
      evidence.cases = evidence.cases.filter(({ id }) => id !== 'option:country=CN');
      evidence.caseCounts.observed = evidence.cases.length;
    });
    expect(() => accept(dropped)).toThrow(/missing option:country=CN/);

    // An extra case the registry never derived is refused in the other
    // direction.
    const extra = mutate((evidence) => {
      const [first] = evidence.cases;
      evidence.cases.push({ ...first, id: 'option:country=ZZ' });
      evidence.caseCounts.observed = evidence.cases.length;
    });
    expect(() => accept(extra)).toThrow(/unregistered case option:country=ZZ/);

    const duplicate = mutate((evidence) => {
      evidence.cases.push(evidence.cases.find(({ id }) => id === 'view:bubble')!);
    });
    expect(() => accept(duplicate)).toThrow(/duplicate case view:bubble/);

    const misfiled = mutate((evidence) => {
      evidence.cases.find(({ id }) => id === 'view:bubble')!.group = 'single-options';
    });
    expect(() => accept(misfiled)).toThrow(/files view:bubble under single-options, not views/);

    // The same cases in a different order are nondeterministic evidence.
    const reordered = mutate((evidence) => {
      const index = evidence.cases.findIndex(({ id }) => id === 'view:grid');
      [evidence.cases[index], evidence.cases[index + 1]] = [
        evidence.cases[index + 1],
        evidence.cases[index],
      ];
    });
    expect(() => accept(reordered)).toThrow(/out of registry order at case \d+: recorded view:bubble/);

    const lyingCounts = mutate((evidence) => {
      evidence.caseCounts.expected += 1;
    });
    expect(() => accept(lyingCounts)).toThrow(/counts disagree/);

    const otherSeed = mutate((evidence) => {
      evidence.generator.seed = 'another-seed';
    });
    expect(() => accept(otherSeed)).toThrow(/not the pinned/);

    const empty = mutate((evidence) => {
      evidence.cases = [];
      evidence.caseCounts.observed = 0;
    });
    expect(() => accept(empty)).toThrow(/zero cases/);

    expect(() =>
      readMarketMapStatesEvidence({ artifact: { version: 1 }, fingerprint: fingerprint() }),
    ).toThrow(/malformed/);
  });

  it('decides one member per case group with exact non-zero expected and observed counts', () => {
    const plan = marketMapStatePlan();
    const evidence = accept(committed());
    const verdicts = marketMapGroupVerdicts(evidence, plan);
    expect(verdicts.map(({ id }) => id)).toEqual(
      MARKET_MAP_CASE_GROUPS.map(marketMapCaseGroupMemberId),
    );
    const expectedCounts = marketMapGroupCaseCounts(plan);
    for (const verdict of verdicts) {
      expect(verdict.failures).toEqual([]);
      const group = verdict.observed.group as keyof typeof expectedCounts;
      expect(verdict.observed.expectedCaseCount).toBe(expectedCounts[group]);
      expect(verdict.observed.observedCaseCount).toBe(expectedCounts[group]);
      expect(expectedCounts[group]).toBeGreaterThan(0);
    }
    // Every filter case's rendered set is compared, and the sums the result
    // rows publish are the registry's, not a written-down total.
    const singles = verdicts.find(
      ({ id }) => id === marketMapCaseGroupMemberId('single-options'),
    )!;
    const options = marketMapFilterOptions();
    const derivedTotal = MARKET_MAP_FILTER_DIMENSIONS.flatMap((dimension) =>
      options[dimension].map((value) => expectedCompanies({ [dimension]: value }).length),
    ).reduce((sum, count) => sum + count, 0);
    expect(singles.observed.expectedRenderedTotal).toBe(derivedTotal);
    expect(singles.observed.observedRenderedTotal).toBe(derivedTotal);
  });

  it('fails the case a dropped or an extra rendered company would hide', () => {
    const plan = marketMapStatePlan();
    const dropTile = mutate((evidence) => {
      const record = evidence.cases.find(({ id }) => id === 'option:segment=humanoids')!;
      if (record.observed.kind !== 'filter') throw new Error('not a filter case');
      record.observed.renderedIds = record.observed.renderedIds.slice(1);
    });
    const failing = marketMapCaseVerdicts(dropTile, plan).find(
      ({ id }) => id === 'option:segment=humanoids',
    )!;
    expect(failing.failures.join('\n')).toMatch(/rendered \d+ ids, registry derives \d+: missing \[/);
    expect(
      marketMapGroupVerdicts(dropTile, plan).find(
        ({ id }) => id === marketMapCaseGroupMemberId('single-options'),
      )!.failures.length,
    ).toBeGreaterThan(0);

    const extraTile = mutate((evidence) => {
      const record = evidence.cases.find(({ id }) => id === 'option:country=CN')!;
      if (record.observed.kind !== 'filter') throw new Error('not a filter case');
      const outsider = COMPANIES.find(({ hq }) => hq.country !== 'CN')!;
      record.observed.renderedIds.push(outsider.id);
    });
    const extraFailures = marketMapCaseVerdicts(extraTile, plan).find(
      ({ id }) => id === 'option:country=CN',
    )!.failures;
    expect(extraFailures.join('\n')).toMatch(/extra \[/);
  });

  it('judges a re-measured update by its fastest sample, never a cherry-picked one', () => {
    const plan = marketMapStatePlan();
    const caseId = 'option:segment=humanoids';
    const withSamples = (samples: number[], latencyMs = Math.min(...samples)) =>
      marketMapCaseVerdicts(
        mutate((evidence) => {
          const record = evidence.cases.find(({ id }) => id === caseId)!;
          if (record.observed.kind !== 'filter') throw new Error('not a filter case');
          record.observed.latencySamplesMs = samples;
          record.observed.latencyMs = latencyMs;
        }),
        plan,
      ).find(({ id }) => id === caseId)!.failures;

    const within = MARKET_MAP_UPDATE_CEILING_MS - 1;
    const over = MARKET_MAP_UPDATE_CEILING_MS + 1;
    // One stall, then an update that lands: the case holds.
    expect(withSamples([over, within])).toEqual([]);
    // A hang every time fails at its best.
    expect(withSamples([over, over + 10, over + 20]).join('\n')).toMatch(/over the \d+ ms ceiling/);
    // A sample within the ceiling is not re-measured hoping for a faster one.
    expect(withSamples([within, within - 5]).join('\n')).toMatch(/re-measured after a sample within/);
    // The recorded figure must be the fastest sample, and samples are capped.
    expect(withSamples([over, within], over).join('\n')).toMatch(/not the fastest of its samples/);
    expect(
      withSamples(Array.from({ length: MARKET_MAP_LATENCY_SAMPLES + 1 }, () => over)).join('\n'),
    ).toMatch(/latency samples, not 1 to/);
  });

  it('fails an update that lands after its event task, however fast', () => {
    const plan = marketMapStatePlan();
    const caseId = 'option:segment=humanoids';
    const deferred = mutate((evidence) => {
      const record = evidence.cases.find(({ id }) => id === caseId)!;
      if (record.observed.kind !== 'filter') throw new Error('not a filter case');
      record.observed.lateSteps = [1];
      record.observed.latencyMs = 4;
      record.observed.latencySamplesMs = [4];
    });
    const failures = marketMapCaseVerdicts(deferred, plan).find(({ id }) => id === caseId)!.failures;
    expect(failures.join('\n')).toMatch(/step\(s\) \[1\] had not landed when their event's task ended/);
    const group = marketMapGroupVerdicts(deferred, plan).find(
      ({ id }) => id === marketMapCaseGroupMemberId('single-options'),
    )!;
    expect(group.failures.length).toBeGreaterThan(0);

    const ledgerId = committed().cases.find(({ observed }) => observed.kind === 'keyboard-ledger')!.id;
    const lateAnnouncement = mutate((evidence) => {
      const record = evidence.cases.find(({ id }) => id === ledgerId)!;
      if (record.observed.kind !== 'keyboard-ledger') throw new Error('not the keyboard ledger');
      const step = record.observed.steps.find(({ mutations }) => mutations > 0)!;
      step.inKeyTask = false;
    });
    const ledgerFailures = marketMapCaseVerdicts(lateAnnouncement, plan).find(
      ({ id }) => id === ledgerId,
    )!.failures;
    expect(ledgerFailures.join('\n')).toMatch(
      /the region did not update inside the task of the key that changed it/,
    );
  });

  it('derives a deterministic plan whose counts move with the registry', () => {
    const plan = marketMapStatePlan();
    expect(marketMapStatePlan()).toEqual(plan);
    const ids = plan.cases.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.generator).toMatchObject({
      algorithm: MARKET_MAP_PAIRWISE_ALGORITHM,
      seed: MARKET_MAP_PAIRWISE_SEED,
      dimensions: [...MARKET_MAP_INDEPENDENT_DIMENSIONS],
    });

    // Every discrete option is a case of its own, from the registry.
    const options = marketMapFilterOptions();
    expect(plan.cases.filter(({ group }) => group === 'single-options').map(({ id }) => id)).toEqual(
      MARKET_MAP_FILTER_DIMENSIONS.flatMap((dimension) =>
        options[dimension].map((value) => `option:${dimension}=${value}`),
      ),
    );

    // A company from a new country adds that country's option case and
    // pairwise coverage; nothing is pinned to today's registry size.
    const newcomer = { ...COMPANIES[0], id: 'zz-newcomer', hq: { ...COMPANIES[0].hq, country: 'ZZ' } };
    const grown = marketMapStatePlan([...COMPANIES, newcomer]);
    const grownIds = grown.cases.map(({ id }) => id);
    expect(grownIds).toContain('option:country=ZZ');
    expect(ids).not.toContain('option:country=ZZ');
    expect(grown.generator.levels.country).toBe(plan.generator.levels.country + 1);
    expect(marketMapGroupCaseCounts(grown)['single-options']).toBe(
      marketMapGroupCaseCounts(plan)['single-options'] + 1,
    );

    // A registered higher-order combination whose option disappears is
    // refused, not silently run as an empty intersection.
    expect(() =>
      marketMapStatePlan(COMPANIES.filter(({ hq }) => hq.country !== 'CN')),
    ).toThrow(/no longer offers/);
    expect(() => marketMapStatePlan([])).toThrow(/registry is empty/);
  });

  it('covers every pair of independent filter values with the pinned generator', () => {
    const plan = marketMapStatePlan();
    const options = marketMapFilterOptions();
    const dimensions = MARKET_MAP_INDEPENDENT_DIMENSIONS.map((dimension) => ({
      id: dimension,
      values: ['', ...options[dimension]],
    }));
    const rows = plan.cases
      .filter(({ group }) => group === 'pairwise')
      .map(({ filters = {} }) =>
        Object.fromEntries(
          MARKET_MAP_INDEPENDENT_DIMENSIONS.map((dimension) => [dimension, filters[dimension] ?? '']),
        ),
      );
    expect(rows.length).toBeGreaterThan(0);
    expect(uncoveredPairs(dimensions, rows)).toEqual([]);

    // The generator is pure: the same dimensions and seed give the same
    // rows in the same order, and a covering array on a small fixture.
    const fixture = [
      { id: 'a', values: ['', 'a1', 'a2'] },
      { id: 'b', values: ['', 'b1'] },
      { id: 'c', values: ['', 'c1', 'c2', 'c3'] },
    ];
    const first = ipogPairwise(fixture, MARKET_MAP_PAIRWISE_SEED);
    expect(ipogPairwise(fixture, MARKET_MAP_PAIRWISE_SEED)).toEqual(first);
    expect(uncoveredPairs(fixture, first)).toEqual([]);
    expect(first.length).toBeLessThan(3 * 2 * 4);
    expect(() => ipogPairwise([fixture[0]], MARKET_MAP_PAIRWISE_SEED)).toThrow(/at least two/);
  });
});
