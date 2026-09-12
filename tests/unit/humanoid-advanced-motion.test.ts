// Final-current source-backed prose and native evidence regressions.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseLedger, parseCompoundPlans, compoundPlanDigest, compoundPartDigest } from '../../lib/audit-ledger';
const article = () => readFileSync(resolve(process.cwd(), 'content/rl-sim2real/humanoid-wbc.mdx'), 'utf8');
const expected = [
  {
    "id": "humanoid-6",
    "citationId": "exbody2-2024",
    "span": "ExBody2 reports that drifting global keypoint targets can accumulate tracking errors. It uses local keypoint targets with separate velocity tracking. An initial policy ranks reference motions by lower-body tracking error for dataset filtering; a privileged PPO teacher is distilled into a student using observation history. The authors report walking, squatting, and dancing on Unitree G1. Their generalist and fine-tuned specialist policies trade broad coverage against motion-specific precision, and the paper leaves transitions between specialists unresolved <span className=\"max-sm:[&_[role=tooltip]]:-left-28\"><Cite id=\"exbody2-2024\" /></span>."
  },
  {
    "id": "humanoid-7",
    "citationId": "kungfubot-2025",
    "span": "KungfuBot trains a separate policy for each processed reference motion rather than one policy for the whole repertoire. Its adaptive tracking rule tightens the exponential reward’s error tolerance from an exponential moving average of tracking error, with a non-increasing update. Separate curricula lower the early-termination threshold and increase regularization penalties. The authors demonstrate dynamic motions on Unitree G1; their quantitative hardware comparison covers ten Tai Chi trials with the robot root fixed to the origin for evaluation <Cite id=\"kungfubot-2025\" />."
  },
  {
    "id": "humanoid-8",
    "citationId": "gmt-2025",
    "span": "GMT trains a unified motion-tracking controller rather than merging already-trained per-skill policies. Adaptive sampling re-clips long motions and adjusts sampling probabilities using completion and tracking errors. Its privileged teacher uses a learned soft mixture-of-experts: a gating network combines expert action outputs, and a deployable student learns from the teacher through DAgger. The authors demonstrate tracking on Unitree G1, but report the baseline comparisons and ablations in simulation. The controller does not support getting up after a fall or rolling, and is not designed for tracking on slopes and stairs <Cite id=\"gmt-2025\" />."
  }
];
describe('Humanoid advanced motion source scope', () => {
  for (const item of expected) {
    it(`${item.id} preserves the complete qualified source-backed span`, () => {
      expect(article().split(item.span).length - 1).toBe(1);
      expect(CITATIONS.filter(c => c.id === item.citationId)).toHaveLength(1);
    });
  }
  it('does not reintroduce the unsupported cascade or policy-merger framing', () => {
    expect(article()).not.toContain('one missed footstep corrupts the whole-body error');
    expect(article()).not.toContain('GMT merged the per-skill policies');
  });
});

const native = () => {
  const plans = parseCompoundPlans(JSON.parse(readFileSync(resolve(process.cwd(), 'audit/compound-evidence.json'), 'utf8')));
  const ledger = readFileSync(resolve(process.cwd(), 'audit/rl-sim2real.md'), 'utf8');
  const parse = (catalog: typeof plans) => parseLedger('audit/rl-sim2real.md', ledger, new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog }).find(s => s.slug === 'humanoid-wbc')!;
  return { plans, parse };
};
describe('Advanced motion mandatory AND evidence', () => {
  for (const [ordinal, count] of [[6, 7], [7, 5], [8, 7]]) {
    it(`original ${ordinal} completes only with all ${count} current reviewed parts`, () => {
      const { plans, parse } = native();
      const record = parse(plans).claimRecords[ordinal - 1];
      expect(record.evidenceFailures).toEqual([]);
      const plan = plans.find(p => p.articleSlug === 'humanoid-wbc' && p.rowOrdinal === ordinal)!;
      expect(plan.parts).toHaveLength(count);
      expect(plan.evidence).toHaveLength(count);
      expect(plan.adjudications).toHaveLength(count);
      expect(plan.planReview?.planDigest).toBe(compoundPlanDigest(plan));
      for (const part of plan.parts) {
        expect(plan.adjudications.find(a => a.partId === part.id)?.evidenceDigest).toBe(compoundPartDigest(plan, part.id));
        const missing = structuredClone(plans);
        missing.find(p => p.id === plan.id)!.adjudications = plan.adjudications.filter(a => a.partId !== part.id);
        expect(parse(missing).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
        for (const field of ['parts', 'evidence'] as const) {
          const omitted = structuredClone(plans), target = omitted.find(p => p.id === plan.id)!;
          if (field === 'parts') target.parts = target.parts.filter(p => p.id !== part.id);
          else target.evidence = target.evidence.filter(e => e.partId !== part.id);
          expect(parse(omitted).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
        }
      }
      const changed = structuredClone(plans);
      changed.find(p => p.id === plan.id)!.evidence[0].supportingPassage += ' changed';
      expect(parse(changed).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    });
  }
});
