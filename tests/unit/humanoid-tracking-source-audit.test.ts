import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const text = (path: string) => readFileSync(path, 'utf8');
const body = () => text('content/rl-sim2real/humanoid-wbc.mdx');
const catalog = () => parseCompoundPlans(JSON.parse(text('audit/compound-evidence.json')));
const selected = [
  [2, 'phc', 'phc-2023'],
  [4, 'omni', 'omnih2o-2024'],
  [5, 'human', 'humanplus-2024'],
] as const;
function planFor(group: string) {
  const p = catalog().find(p => p.id === `humanoid-tracking-${group}-20260908`);
  expect(p, 'The original requires a complete, actually reviewed plan').toBeDefined();
  return structuredClone(p!);
}
function rowFor(plan: CompoundPlan) {
  return parseLedger('audit/rl-sim2real.md', text('audit/rl-sim2real.md'),
    new Set(CITATIONS.map(c => c.id)), {
      compoundPlans: catalog().map(p => p.id === plan.id ? plan : p),
    }).find(s => s.slug === 'humanoid-wbc')!.claimRecords[plan.rowOrdinal - 1];
}

describe('PHC, OmniH2O and HumanPlus source corrections', () => {
  it('scopes PHC to simulated avatars and progressive failed subsets', () => {
    for (const phrase of ['simulated avatars, not a physical robot', '98.9%',
      '11,313 filtered AMASS training clips', 'training-set result',
      'progressively harder failed subsets', 'separate recovery primitive',
      'multiplicative composer', 'recovery artifacts']) expect(body()).toContain(phrase);
    expect(body()).not.toContain('as the motion set grew');
  });
  it('separates OmniH2O goal generation localization and low-level control', () => {
    for (const phrase of ['privileged RL teacher', 'Robot root odometry',
      'without an explicit global-linear-velocity input', 'Appendix A describes torque outputs',
      'demonstrated GPT-4o setup', 'selection among motion primitives',
      'not direct low-level motor control', 'four of the six recorded tasks',
      'ten runs per task', 'no safety guarantees']) expect(body()).toContain(phrase);
    expect(body()).not.toContain('OmniH2O generalized the interface');
  });
  it('separates HumanPlus human observation robot sensing shadowing and BC', () => {
    for (const phrase of ['not as the robot’s only sensor', 'IMU and joint-encoder',
      'body-joint position setpoints', 'seated operation bypasses',
      'two head-mounted RGB cameras', 'Humanoid Imitation Transformer',
      'binocular images and proprioception', 'limited locomotion scope']) expect(body()).toContain(phrase);
    expect(body()).not.toContain('Tracking stopped being the product');
  });
  it('preserves H2O, ASAP, the source population and the unfinished review date', () => {
    for (const phrase of ['H2O adapts ideas from simulated humanoid animation',
      'follows PULSE', 'robot-side motion capture for linear velocity',
      'ASAP then attacked the residual dynamics gap', 'lastReviewed: "2026-08-17"']) expect(body()).toContain(phrase);
    for (const [, , citationId] of selected) {
      const c = CITATIONS.find(c => c.id === citationId)!;
      expect(c.url).toBe(`https://arxiv.org/abs/${c.arxiv}`);
    }
  });
  describe.each(selected)('original %i (%s)', (ordinal, group, citationId) => {
    it('binds all three AND parts and exact paired evidence to the current row', () => {
      const p = planFor(group), row = rowFor(p);
      expect(p.rowOrdinal).toBe(ordinal);
      expect(p.parts).toHaveLength(3);
      expect(p.evidence).toHaveLength(3);
      expect(p.parts.every(part => JSON.stringify(part.requiredCitationIds) === JSON.stringify([citationId]))).toBe(true);
      expect(p.evidence.every(e => e.citationId === citationId && e.sourceUrl.startsWith('https://arxiv.org/html/'))).toBe(true);
      expect(p.originalCellsDigest).toBe(originalClaimDigest(row));
      expect(p.planReview!.reviewedBy).toBe('agent:cf70d662-e6ba-47a0-bbfd-010ce9debc92/integrator');
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications).toHaveLength(3);
      for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      expect(row.evidenceFailures).toEqual([]);
      expect(row.verdict).toBe('corrected');
    });
    it('rejects every omitted part, paired item and adjudication', () => {
      for (const key of ['parts', 'evidence', 'adjudications'] as const) {
        for (let i = 0; i < 3; i++) {
          const p = planFor(group);
          p[key].splice(i, 1);
          expect(rowFor(p).evidenceFailures.length).toBeGreaterThan(0);
        }
      }
    });
    it('rejects stale cells, missing review, altered passage and wrong citation pairing', () => {
      const stale = planFor(group);
      stale.originalCellsDigest = '0'.repeat(64);
      expect(rowFor(stale).evidenceFailures.length).toBeGreaterThan(0);
      const missing = planFor(group);
      missing.planReview = null;
      expect(rowFor(missing).evidenceFailures.length).toBeGreaterThan(0);
      const altered = planFor(group);
      altered.evidence[0].supportingPassage += ' unsupported addition';
      expect(rowFor(altered).evidenceFailures.length).toBeGreaterThan(0);
      const wrong = planFor(group);
      wrong.evidence[0].citationId = 'h2o-2024';
      expect(rowFor(wrong).evidenceFailures.length).toBeGreaterThan(0);
    });
  });
});
