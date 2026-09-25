import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';

const root = process.cwd();
type CompoundPlan = ReturnType<typeof parseCompoundPlans>[number];
const ledgerPath = 'audit/rl-sim2real.md';
const article = readFileSync(join(root, 'content/rl-sim2real/reward-design-mpc.mdx'), 'utf8');
const ledger = readFileSync(join(root, ledgerPath), 'utf8');
const plans = JSON.parse(readFileSync(join(root, 'audit/compound-evidence.json'), 'utf8')) as CompoundPlan[];
const ids = new Set(CITATIONS.map(citation => citation.id));
const selected = () => {
  const plan = plans.find(candidate => candidate.id === 'rudin-kl-writer-20260909');
  expect(plan, 'the reviewed KL original must have its own native plan').toBeDefined();
  return structuredClone(plan!);
};
const failures = (plan: CompoundPlan) => {
  const sections = parseLedger(ledgerPath, ledger, ids, {
    compoundPlans: plans.map(candidate => candidate.id === plan.id ? plan : candidate),
  });
  return sections.flatMap(section => section.claimRecords)
    .find(record => record.claim.startsWith('Rudin Table 3 and Algorithm 1 use desired KL 0.01'))!.evidenceFailures;
};

describe('Rudin KL mechanism is not a reward-retuning guarantee', () => {
  it('removes the unsupported causal guarantee and exact-target wording', () => {
    expect(article).not.toContain('weight-retuning loop stays survivable');
    expect(article).not.toContain('adjusts each update to hold a target KL divergence');
    expect(article).toContain('This mechanism does not establish that reward retuning is stable.');
  });

  it('retains the sourced desired KL and both threshold directions', () => {
    expect(article).toContain('desired KL of 0.01');
    expect(article).toContain('exceeds twice the target');
    expect(article).toContain('below half the target');
  });

  it('binds every required AND part without dropping paper identity', () => {
    const plan = selected();
    expect(plan.parts.map(part => part.id)).toEqual(['kl-rule', 'purpose-cut', 'paper-identity']);
    expect(plan.evidence).toHaveLength(4);
    expect(failures(plan)).toEqual([]);
  });

  it('preserves the printed update factors and clamps in source text', () => {
    const text = selected().evidence.find(item => item.partId === 'kl-rule')!.supportingPassage;
    expect(text).toContain('10^{-5}');
    expect(text).toContain('alpha/1.5');
    expect(text).toContain('10^{-2}');
    expect(text).toContain('1.5');
  });

  it('rejects a missing jointly required source item', () => {
    const plan = selected();
    plan.evidence = plan.evidence.filter(item => item.partId !== 'kl-rule');
    expect(failures(plan).length).toBeGreaterThan(0);
  });

  it('rejects stale source adjudication after passage mutation', () => {
    const plan = selected();
    plan.evidence[0].supportingPassage += ' fabricated guarantee';
    expect(failures(plan).length).toBeGreaterThan(0);
  });

  it('rejects removal of the identity AND part without renewed review', () => {
    const plan = selected();
    plan.parts = plan.parts.filter(part => part.id !== 'paper-identity');
    expect(failures(plan).length).toBeGreaterThan(0);
  });

  it('rejects a stale current four-cell digest', () => {
    const plan = selected();
    plan.originalCellsDigest = '0'.repeat(64);
    expect(failures(plan).length).toBeGreaterThan(0);
  });

  it('binds actual writer review, not the source-only review identity', () => {
    const plan = selected();
    if (!plan.planReview) throw new Error('KL plan review is required');
    expect(plan.planReview.reviewedBy).toBe('agent:68812493/integrator');
    expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
    for (const review of plan.adjudications) {
      expect(review.evidenceDigest).toBe(compoundPartDigest(plan, review.partId));
    }
  });
});
