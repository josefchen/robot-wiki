import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { currentAuditContext, finalSevenBefore, finalSevenPriorPlans } from '../helpers/residual-integration';
import {
  compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';
import { committedText } from '../helpers/editorial-current-context';

const planId = 'locomotion-park7-20260915-legged-locomotion-7';
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/rl-sim2real.md', 'utf8');
const article = readFileSync('content/rl-sim2real/legged-locomotion.mdx', 'utf8');
const plan = plans.find(p => p.id === planId
  && p.ledgerPath === 'audit/rl-sim2real.md'
  && p.articleSlug === 'legged-locomotion'
  && p.rowOrdinal === 7);
const context = currentAuditContext();
const parse = (catalog = plans) => parseLedger('audit/rl-sim2real.md', ledger,
  new Set(CITATIONS.map(c => c.id)), { ...context, compoundPlans: catalog })
  .find(s => s.slug === 'legged-locomotion')!;

const partIds = ['paper-identity', 'bounding-model-and-limits',
  'timing-versus-duty-factor', 'experimental-schedule'];

describe('legged locomotion Park bounding original 7', () => {
  it('binds one exact original with all four mandatory parts and pairs', () => {
    expect(plan).toBeDefined();
    expect(plan!.parts.map(p => p.id)).toEqual(partIds);
    expect(plan!.parts.every(p => p.requiredCitationIds)).toBe(true);
    expect(plan!.parts.reduce((n, p) => n + p.requiredCitationIds.length, 0)).toBe(4);
    expect(plan!.evidence).toHaveLength(4);
    expect(plan!.evidence.every(e => e.citationId === 'park-2017-bounding'
      && e.sourceUrl === 'https://journals.sagepub.com/doi/10.1177/0278364917694244')).toBe(true);
    expect(parse().claimRecords[6].evidenceFailures).toEqual([]);
    expect(parse().claimRecords[6].compound?.planId).toBe(planId);
  });

  it('keeps the preserved mechanism and rejects the drift gloss and proposal artifacts', () => {
    const claim = parse().claimRecords[6].claim;
    expect(claim).toContain('Duty cycle modulation via vertical impulse scaling');
    expect(claim).toContain('T_st = L/v_d');
    expect(claim).toContain('below 3 m/s');
    expect(claim).toContain('6.4 m/s');
    expect(claim).toContain('CoT 0.47');
    expect(claim).toContain('side-wall contact and roll instability');
    expect(claim).not.toContain('made high-speed bounding practical by scaling the duty cycle with speed');
    // The raw proposal's spacing artifact must never reach the ledger.
    expect(claim).not.toContain('up to3m/s');
    // Not preserved evidence: the proposal's gravity-impulse gloss stays out.
    expect(claim).not.toContain('gravity impulse over a full period');
    expect(claim).toContain('not an all-speed timing law');
  });

  it('binds every review to the current whole plan and actual part evidence', () => {
    expect(plan!.planReview?.planDigest).toBe(compoundPlanDigest(plan!));
    expect(plan!.planReview?.reviewedBy).toContain('integrator');
    expect(plan!.adjudications.map(a => a.partId)).toEqual(partIds);
    for (const a of plan!.adjudications) {
      expect(a.outcome).toBe('supported');
      expect(a.evidenceDigest).toBe(compoundPartDigest(plan!, a.partId));
    }
  });

  it('rejects every missing part, evidence item, stale tuple or stale review', { timeout: 60_000 }, () => {
    for (let i = 0; i < plan!.evidence.length + 4; i++) {
      const changed = structuredClone(plans);
      const target = changed.find(x => x.id === planId)!;
      if (i < target.evidence.length) target.evidence.splice(i, 1);
      else if (i === plan!.evidence.length) target.originalCellsDigest = '0'.repeat(64);
      else if (i === plan!.evidence.length + 1) target.planReview = null;
      else if (i === plan!.evidence.length + 2) target.evidence[0].supportingPassage += ' changed';
      else target.adjudications.pop();
      expect(parse(changed).claimRecords[6].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('applies the corrected article span exactly once and removes the drift sentence', () => {
    const drift = 'the MIT Cheetah line made high-speed bounding practical by scaling the duty cycle with speed';
    expect(article.match(drift)).toBeNull();
    const span = 'Park, Wensing and Kim plan stance time from stride length and desired speed';
    expect(article.match(span)).toHaveLength(1);
    expect(article).toContain('modulate the duty cycle via vertical impulse scaling');
    expect(article).toContain('only up to 3 m/s and is fixed above it');
    expect(article).toContain('qualified by side-wall contact and roll instability');
    expect(finalSevenBefore('content/rl-sim2real/legged-locomotion.mdx').match(/<Cite id="park-2017-bounding" \/>/g)).toHaveLength(2);
    expect(article.match(/<Cite id="park-2017-bounding" \/>/g)).toHaveLength(1);
    expect(article).not.toContain('classical and learned alike, modulate duty factor continuously with speed');
    const atPark = committedText('b1ece69637adc753c807a6b0e822e18412ff4931', 'content/rl-sim2real/legged-locomotion.mdx');
    expect(atPark.match(/<Cite id="park-2017-bounding" \/>/g)).toHaveLength(2);
    expect(article.match(/<Cite id="park-2017-bounding" \/>/g)).toHaveLength(1);
    expect(article).not.toContain('canonical nominal values; real controllers');
  });

  it('leaves the protected neighbor 6 and applied rows 2-5 untouched', () => {
    const records = parse().claimRecords;
    // Neighbour 6 was unbound when this pin was written; the 20260917a packet
    // later bound it to its own Choi abstract plan, never to this park7 plan.
    expect(records[5].compound?.planId).toBe('legged-locomotion-6-choi-abstract-20260917a');
    expect(records[5].evidenceFailures).toEqual([]);
    // Row 8 was this lane's protected neighbor; the 2026-09-16i integrator
    // pass lawfully bound it (plan legged-locomotion-8-duty-factor-
    // disclaimer-20260916i) with this park7 plan's retained material reused
    // read-only, so the protection assertion became stale and now asserts
    // the binding instead.
    const prior = parseLedger('audit/rl-sim2real.md', finalSevenBefore('audit/rl-sim2real.md'),
      new Set(CITATIONS.map(c => c.id)), { compoundPlans: finalSevenPriorPlans() })
      .find(s => s.slug === 'legged-locomotion')!.claimRecords[7];
    expect(prior.compound?.planId).toBe('legged-locomotion-8-duty-factor-disclaimer-20260916i');
    expect(prior.claim).toContain('canonical nominal values');
    expect(records[7].localBasis?.planId).toBe('final-seven-rl-sim2real-legged-locomotion-8-20260923');
    expect(records[7].evidenceFailures).toEqual([]);
    expect(records[7].outcome).toBe('passing');
    const corrected = JSON.parse(readFileSync('audit/local-basis.json', 'utf8')).plans
      .find((p: { originalId: string }) => p.originalId === 'audit/rl-sim2real.md:legged-locomotion:8');
    expect(corrected.id).toBe('final-seven-rl-sim2real-legged-locomotion-8-20260923');
    expect(records[7].verdict).toBe('Cut');
    expect(records[7].claim).toContain('universal speed-dependent duty-factor attribution was cut');
    expect(records[1].compound?.planId).toBe('learned-locomotion-legged-locomotion-2-20260908');
    expect(records[2].compound?.planId).toBe('learned-locomotion-legged-locomotion-3-20260908');
    expect(records[3].compound?.planId).toBe('learned-locomotion-legged-locomotion-4-20260908');
    expect(records[4].compound?.planId).toBe('rudin-protocol-writer-legged-locomotion-5-20260909');
    expect(records[1].evidenceFailures).toEqual([]);
    expect(records[4].evidenceFailures).toEqual([]);
  });
});
