import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const catalog = parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
// Every mutation receives fresh selected plans; unrelated plans remain immutable.
const plans = () => catalog.map(p => p.id.startsWith('rl-finetuning-closeout-')
  ? structuredClone(p) : p);
const rows = (compoundPlans = plans()) =>
  parseLedger('audit/manipulation.md', text('audit/manipulation.md'),
    new Set(CITATIONS.map(c => c.id)), { compoundPlans })
    .find(section => section.slug === 'rl-finetuning')!.claimRecords;

describe('bounded DPPO and ConRFT closeout', () => {
  it('binds both current originals and retains the recorded source inconsistency', () => {
    for (const ordinal of [1, 2]) {
      const row = rows()[ordinal - 1];
      expect(row.verdict).toBe(ordinal === 1 ? 'corrected'
        : 'S (time-range and comparator-intervention conflicts represented)');
      expect(row.outcome).toBe(ordinal === 1 ? 'passing' : 'recorded-inconsistency');
      expect(row.evidenceFailures).toEqual([]);
    }
  });

  it('retains protocol, counterexample and denominator qualifications', () => {
    const prose = text('content/manipulation/rl-finetuning.mdx');
    for (const value of ['16 of 20', 'HalfCheetah', 'Lamp', '15-90',
      '39.4%', '144%', '20 trials', '40']) {
      expect(prose).toContain(value);
    }
    expect(prose).not.toContain('attacks the chain\'s length instead of its likelihood');
    expect(text('components/mdx/rl-methods-table.tsx'))
      .not.toContain('Strongest overall fine-tuning performance and efficiency');
  });

  it('rejects every removed part, duplicate, stale passage and wrong citation pair', () => {
    const selected = plans().filter(p => p.id.startsWith('rl-finetuning-closeout-'));
    expect(selected).toHaveLength(2);
    for (const original of selected) {
      expect(original.parts.length).toBeGreaterThan(0);
      for (const part of original.parts) {
        for (const mutation of ['missing', 'duplicate', 'extra', 'stale', 'wrong-citation']) {
          const changed = plans();
          const plan = changed.find(p => p.id === original.id)!;
          const item = plan.evidence.find(e => e.partId === part.id)!;
          if (mutation === 'missing') plan.evidence = plan.evidence.filter(e => e.partId !== part.id);
          if (mutation === 'duplicate') plan.evidence.push({ ...item });
          if (mutation === 'extra') plan.evidence.push({ ...item, partId: 'not-a-required-part' });
          if (mutation === 'stale') item.supportingPassage += ' changed';
          if (mutation === 'wrong-citation') item.citationId = 'dagger-2011';
          if (mutation !== 'stale') {
            for (const review of plan.adjudications) {
              review.evidenceDigest = compoundPartDigest(plan, review.partId);
            }
          }
          expect(rows(changed)[original.rowOrdinal - 1].evidenceFailures.length,
            `${original.id}/${part.id}/${mutation}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('requires exactly the sixteen reviewed citation/part/URL pairs', () => {
    const required = [
      { ordinal: 1, prefix: 'd', citation: 'dppo-2024', arxiv: '2409.00588', version: 'v3',
        parts: ['identity', 'mdp', 'training', 'benchmarks', 'limits', 'physical', 'code'] },
      { ordinal: 2, prefix: 'c', citation: 'conrft-2025', arxiv: '2502.05450', version: 'v2',
        parts: ['identity', 'foundation', 'offline', 'online', 'sampling', 'results', 'baseline', 'limits', 'code'] },
    ];
    for (const source of required) {
      const plan = plans().find(p => p.id.startsWith('rl-finetuning-closeout-')
        && p.rowOrdinal === source.ordinal)!;
      const expected = source.parts.map(part => ({
        partId: `${source.prefix}-${part}`,
        citationId: source.citation,
        sourceUrl: ['identity', 'code'].includes(part)
          ? `https://arxiv.org/abs/${source.arxiv}`
          : `https://arxiv.org/html/${source.arxiv}${source.version}`,
      }));
      const pairs = plan.evidence.map(({ partId, citationId, sourceUrl }) =>
        ({ partId, citationId, sourceUrl }));
      expect(pairs).toEqual(expected);
      expect(plan.parts.map(p => p.id)).toEqual(expected.map(p => p.partId));
      const wrongUrl = structuredClone(pairs);
      wrongUrl[0].sourceUrl = 'https://arxiv.org/abs/1011.0686';
      expect(wrongUrl).not.toEqual(expected);
    }
  });
});
