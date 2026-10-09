import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseCompoundPlans, parseLedger } from '@/lib/audit-ledger';

const article = readFileSync('content/rl-sim2real/reward-design-mpc.mdx', 'utf8');
const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const section = parseLedger('audit/rl-sim2real.md', ledger, new Set(CITATIONS.map(c => c.id)), { compoundPlans: plans })
  .find(s => s.slug === 'reward-design-mpc')!;

describe('constrained reward originals', () => {
  for (const [ordinal, partCount, pairCount] of [[6, 7, 8], [7, 5, 6], [8, 3, 4]]) {
    it(`original ${ordinal} has a corrected complete current record`, () => {
      const row = section.claimRecords[ordinal - 1];
      expect(row.verdict).toBe('corrected');
      expect(row.evidenceFailures).toEqual([]);
    });
    it(`original ${ordinal} retains all source pairs and reviewed AND parts`, () => {
      const plan = plans.find(p => p.id === `constrained-reward-method-${ordinal}-20260908`);
      expect(plan).toBeDefined();
      expect(plan!.parts).toHaveLength(partCount);
      expect(plan!.evidence).toHaveLength(pairCount);
      expect(plan!.originalCellsDigest).toBe(originalClaimDigest(section.claimRecords[ordinal - 1]));
      expect(plan!.planReview?.planDigest).toBe(compoundPlanDigest(plan!));
      for (const part of plan!.parts) {
        const review = plan!.adjudications.find(a => a.partId === part.id);
        expect(review?.outcome).toBe('supported');
        expect(review?.evidenceDigest).toBe(compoundPartDigest(plan!, part.id));
      }
    });
  }
  it('distinguishes three rewards, eleven constraints and transfer-only tuning', () => {
    expect(article).toContain('three rewards (command tracking, joint torque, action smoothness)');
    expect(article).toContain('11 constraints, six probabilistic and five average');
    expect(article).toContain('only the torque coefficient among the rewards');
    expect(article).toContain('by trial and error');
    expect(article).toContain('though constraint limits and PD gains still changed');
    expect(article).not.toContain('abolishes the weights');
  });
  it('separates seven simulated robots from two deployed robots and probabilistic limits', () => {
    expect(article).toContain('Raibo, Mini-cheetah, Hound, ANYmal B, ANYmal C, Unitree Go1 and Atlas');
    expect(article).toContain('deploying on Raibo and Mini-cheetah');
    expect(article).toContain('not per-step hard bounds');
  });
  it('preserves manual stage design and the actual reward/cost counts', () => {
    expect(article).toContain('split acrobatic tasks into manual stages');
    expect(article).toContain('Stand-Sit-Jump-Air-Land');
    expect(article).toContain('five reward and five cost functions');
    expect(article).toContain('stage-transition rules, cost thresholds, preferences and hyperparameters stay hand-set');
  });
  it('binds the named stage-wise simulator platforms inside the supporting passage', () => {
    const evidence = plans.find(p => p.id === 'constrained-reward-method-7-20260908')?.evidence
      .filter(e => e.partId === 'evaluation-split').map(e => e.supportingPassage).join('\n') ?? '';
    expect(evidence).toContain('Go1, a quadrupedal robot, and H1, a humanoid');
    expect(evidence).toContain('side-roll, back-flip, and two-hand walk');
  });
  it('keeps penalty sign and counterevidence without a universal ROGER guarantee', () => {
    expect(article).toContain('with penalties subtracted from the primary reward');
    expect(article).toContain('exploration-induced violation');
    expect(article).toContain('zero-penalty optimality and gentle system and learning dynamics');
    expect(article).not.toContain('any fixed offline choice cannot guarantee');
  });
  it('retains exact correction history without an article review-date bump', () => {
    expect(ledger.includes('constrained-reward-original-history-20260909')).toBe(true);
    expect(article).toContain('lastReviewed: "2026-08-17"');
  });
  it('preserves audited source URLs and does not invent a stage-wise venue', () => {
    for (const [id, doc] of [['rewards-constraints-2024', '2308.12517'], ['stagewise-cmorl-2024', '2409.15755'], ['gain-adaptation-2025', '2510.10759']]) {
      expect(CITATIONS.find(c => c.id === id)?.url).toBe(`https://arxiv.org/abs/${doc}`);
    }
    expect(CITATIONS.find(c => c.id === 'stagewise-cmorl-2024')?.venue).toBeUndefined();
  });
});
