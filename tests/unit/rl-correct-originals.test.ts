import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const parsedCatalog = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
// Mutations touch only the four selected plans; do not reparse the entire catalog
// for every adversarial case or share mutable selected plans between cases.
const catalog = () => parsedCatalog.map(plan => plan.id.startsWith('rl-correct-original-')
  ? structuredClone(plan) : plan);
const rows = (plans = catalog()) => parseLedger('audit/manipulation.md',
  read('audit/manipulation.md'), new Set(CITATIONS.map(c => c.id)),
  { compoundPlans: plans }).find(s => s.slug === 'rl-finetuning')!.claimRecords;
const sources = [
  { ordinal: 6, name: 'HIL-SERL', citation: 'hil-serl-2024',
    body: 'https://ar5iv.labs.arxiv.org/html/2410.21845',
    metadata: 'https://arxiv.org/abs/2410.21845',
    parts: ['identity', 'rlpd-mechanism', 'correction-data', 'jenga-exception',
      'results-protocol', 'ikea-attempt-budget', 'baseline200', 'limits', 'reported-code'] },
  { ordinal: 8, name: 'RLDG', citation: 'rldg-2024',
    body: 'https://arxiv.org/pdf/2412.09858', metadata: 'https://arxiv.org/abs/2412.09858',
    parts: ['identity', 'distillation-mechanism', 'matched-comparison', 'training-evaluation-scope',
      'assembly-percentage-points', 'action-state-analysis', 'limitations'] },
  { ordinal: 9, name: 'Liu', citation: 'rl-vla-generalization-2025',
    body: 'https://arxiv.org/pdf/2505.19789v4', metadata: 'https://arxiv.org/abs/2505.19789',
    parts: ['identity-version-venue', 'tested-algorithm-comparison', 'model-training-task-scope',
      'main-generalization-results', 'version-extensions-and-counterexamples'] },
  { ordinal: 10, name: 'PAIR-VLA', citation: 'pair-vla-2026',
    body: 'https://arxiv.org/pdf/2605.13105v1', metadata: 'https://arxiv.org/abs/2605.13105',
    parts: ['identity-version', 'model-training-reward-task-scope', 'paired-action-objectives',
      'comparative-results-and-failures', 'causal-limits-and-named-relationship'] },
];
const planId = (ordinal: number) => `rl-correct-original-${ordinal}-20260908`;

describe('correctly bound RL originals 6/8/9/10', () => {
  it('keeps the four named originals distinct from later completed originals', () => {
    const current = rows();
    expect(current).toHaveLength(11);
    for (const source of sources) {
      const row = current[source.ordinal - 1];
      expect(row.claim).toContain(source.name);
      expect(row.evidenceFailures, `${source.ordinal}/${source.name}`).toEqual([]);
      expect(['passing', 'recorded-inconsistency']).toContain(row.outcome);
      expect(row.compound?.planId).toBe(planId(source.ordinal));
    }
    expect(current[2].claim).toContain('pi_RL');
    expect(current[6].claim).toContain('PLD');
    const laterPlans = [
      [3, 'pirl-edition-20260908-rl-finetuning-3'],
      [7, 'pirl-pld-20260908-rl-finetuning-7'],
      [11, 'rl-method-table-original-11-20260908'],
    ] as const;
    for (const [ordinal, expectedPlan] of laterPlans) {
      const record = current[ordinal - 1];
      expect(record.evidenceFailures).toEqual([]);
      expect(record.compound?.planId).toBe(expectedPlan);
      expect(sources.map(s => planId(s.ordinal))).not.toContain(expectedPlan);
    }
    expect(new Set(current.filter(r => r.compound).map(r => r.compound!.planId)).size)
      .toBe(current.filter(r => r.compound).length);
    expect(current[1].outcome).toBe('recorded-inconsistency');
  });

  it('preserves HIL seed, comparator, attempt and timing distinctions', () => {
    const prose = read('content/manipulation/rl-finetuning.mdx');
    for (const value of ['20 to 30 demonstrations', '30 demonstrations', 'two attempts per sub-policy',
      '6 hours', '49.7%', '9.6 versus 5.4', 'intended stops', 'learning curves']) expect(prose).toContain(value);
    expect(prose).not.toContain('all initialized with 200 demonstrations');
    expect(read('components/mdx/rl-methods-table.tsx')).toContain('6 h for timing belt');
  });

  it('distinguishes percentage points, mixed stages and RLDG limitations', () => {
    const prose = read('content/manipulation/rl-finetuning.mdx');
    for (const value of ['20/20', '12/20', '40-percentage-point', 'grasping and transport',
      'action quality', 'premature object drops', '4 Hz', '10 Hz']) expect(prose).toContain(value);
    expect(prose).not.toContain('by up to 40% higher success rates');
    expect((20 / 20 - 12 / 20) * 100).toBe(40);
    expect((20 - 12) / 12 * 100).toBeCloseTo(66.6666667);
  });

  it('retains Liu appendix exceptions and PAIR noncausal scope', () => {
    const prose = read('content/manipulation/rl-finetuning.mdx');
    for (const value of ['SFT wins', 'January 2026', 'multi-receptacle',
      'sensitivity-only', 'target-pose success', 'in-distribution',
      'does not isolate reward design', 'real-world transfer remains untested']) expect(prose).toContain(value);
    expect(prose).not.toContain('can become newly fragile');
    expect(prose).not.toContain('because the task reward says nothing');
    // Registry landing URLs retain their existing citation-ledger audit.
    // Exact reviewed PDF editions remain mandatory in the source-pair test.
    expect(CITATIONS.find(c => c.id === 'rl-vla-generalization-2025')!.url)
      .toBe('https://arxiv.org/abs/2505.19789');
    expect(CITATIONS.find(c => c.id === 'pair-vla-2026')!.url)
      .toBe('https://arxiv.org/abs/2605.13105');
  });

  it('requires all 26 parts and exactly 29 citation/part/URL pairs', () => {
    const plans = catalog();
    let pairs = 0;
    for (const source of sources) {
      const plan = plans.find(p => p.id === planId(source.ordinal))!;
      expect(plan).toBeDefined();
      expect(plan.parts.map(p => p.id)).toEqual(source.parts);
      const expected = source.parts.flatMap((partId, index) => {
        const body = { partId, citationId: source.citation, sourceUrl: source.body };
        const meta = { ...body, sourceUrl: source.metadata };
        if (index !== 0) return [body];
        return source.ordinal === 6 ? [meta] : source.ordinal === 8 ? [meta, body] : [body, meta];
      });
      expect(plan.evidence.map(({ partId, citationId, sourceUrl }) =>
        ({ partId, citationId, sourceUrl }))).toEqual(expected);
      pairs += expected.length;
    }
    expect(sources.reduce((n, s) => n + s.parts.length, 0)).toBe(26);
    expect(pairs).toBe(29);
  });

  it.each(sources)('rejects every malformed pair for $name original $ordinal', { timeout: 60_000 }, (source) => {
      const original = catalog().find(p => p.id === planId(source.ordinal))!;
      expect(original).toBeDefined();
      for (let index = 0; index < original.evidence.length; index++) {
        for (const kind of ['missing', 'extra', 'duplicate', 'stale', 'wrong-source', 'wrong-citation']) {
          const plans = catalog(), plan = plans.find(p => p.id === original.id)!;
          const item = plan.evidence[index];
          if (kind === 'missing') plan.evidence.splice(index, 1);
          if (kind === 'extra') plan.evidence.push({ ...item, partId: 'not-required' });
          if (kind === 'duplicate') plan.evidence.push({ ...item });
          if (kind === 'stale') item.supportingPassage += ' altered';
          if (kind === 'wrong-source') item.sourceUrl = 'https://arxiv.org/abs/1011.0686';
          if (kind === 'wrong-citation') item.citationId = 'dagger-2011';
          // Structural omissions must fail even when a fixture refreshes its digest.
          // Changed source/passage text must invalidate the real source review.
          if (['extra', 'duplicate', 'wrong-citation'].includes(kind))
            for (const review of plan.adjudications)
              review.evidenceDigest = compoundPartDigest(plan, review.partId);
          expect(rows(plans)[source.ordinal - 1].evidenceFailures.length,
            `${original.id}/${index}/${kind}`).toBeGreaterThan(0);
        }
      }
  });

  it('rejects unreviewed, partial and reduced conjunctions', () => {
    for (const source of sources) for (const kind of ['no-plan-review', 'no-part-review',
      'unresolved-part', 'reduced-plan', 'stale-tuple']) {
      const plans = catalog(), plan = plans.find(p => p.id === planId(source.ordinal))!;
      expect(plan).toBeDefined();
      if (kind === 'no-plan-review') plan.planReview = null;
      if (kind === 'no-part-review') plan.adjudications.pop();
      if (kind === 'unresolved-part') plan.adjudications[0].outcome = 'unresolved';
      if (kind === 'reduced-plan') plan.parts.pop();
      if (kind === 'stale-tuple') plan.originalCellsDigest = '0'.repeat(64);
      expect(rows(plans)[source.ordinal - 1].evidenceFailures.length,
        `${source.ordinal}/${kind}`).toBeGreaterThan(0);
    }
  });
});
