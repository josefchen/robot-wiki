import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const planId = 'osha-industrial-modes-20260915-industrial-deployment-38';
const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const plan = plans.find(p => p.id === planId
  && p.ledgerPath === 'audit/data-hardware.md'
  && p.articleSlug === 'industrial-deployment'
  && p.rowOrdinal === 38);
const parse = (catalog = plans) => parseLedger('audit/data-hardware.md', ledger,
  new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog })
  .find(s => s.slug === 'industrial-deployment')!;

const partIds = ['guards-and-presence', 'automatic-population',
  'manual-teaching-safeguards', 'speed-condition-and-textual-limits'];

describe('industrial OSHA modes original 38', () => {
  it('binds one exact original with all four mandatory parts and pairs', () => {
    expect(plan).toBeDefined();
    expect(plan!.parts.map(p => p.id)).toEqual(partIds);
    expect(plan!.parts.every(p => p.requiredCitationIds)).toBe(true);
    expect(plan!.parts.reduce((n, p) => n + p.requiredCitationIds.length, 0)).toBe(4);
    expect(plan!.evidence).toHaveLength(4);
    expect(plan!.evidence.every(e => e.citationId === 'osha-otm-robots'
      && e.sourceUrl === 'https://www.osha.gov/otm/section-4-safety-hazards/chapter-4')).toBe(true);
    expect(parse().claimRecords[37].evidenceFailures).toEqual([]);
    expect(parse().claimRecords[37].compound?.planId).toBe(planId);
  });

  it('preserves the exact inequality direction and textual speed limit', () => {
    const speedPart = plan!.parts.find(p => p.id === 'speed-condition-and-textual-limits')!;
    expect(speedPart.text).toContain('not greater than');
    expect(speedPart.text).not.toContain('less than 250');
    const speedEvidence = plan!.evidence.find(e => e.partId === 'speed-condition-and-textual-limits')!;
    expect(speedEvidence.supportingPassage).toContain('not greater than 10 inches/second (250mm/second)');
    expect(speedEvidence.supportingPassage).toContain('less than 10 inches (250 mm) per second');
    expect(speedEvidence.supportingPassage).toContain('or less on any part of the application');
    // The integrated claim keeps OSHA's guards terminology, not gates.
    expect(parse().claimRecords[37].claim).toContain('guards such as fences and barriers');
    expect(parse().claimRecords[37].claim).not.toContain('gates');
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

  it('rejects every missing part, evidence item, stale tuple or stale review', () => {
    for (let i = 0; i < plan!.evidence.length + 4; i++) {
      const changed = structuredClone(plans);
      const target = changed.find(x => x.id === planId)!;
      if (i < target.evidence.length) target.evidence.splice(i, 1);
      else if (i === plan!.evidence.length) target.originalCellsDigest = '0'.repeat(64);
      else if (i === plan!.evidence.length + 1) target.planReview = null;
      else if (i === plan!.evidence.length + 2) target.evidence[0].supportingPassage += ' changed';
      else target.adjudications.pop();
      expect(parse(changed).claimRecords[37].evidenceFailures.length).toBeGreaterThan(0);
    }
  });

  it('keeps the guard-only article endpoint byte-identical (no article edit)', () => {
    const guardSpan = "OSHA's Technical Manual describes safeguards for non-collaborative robot applications during automatic operation: guards such as fences and barriers, interlocked guards, and presence-sensing devices. It also describes reduced-speed manual mode with an enabling device for workers teaching inside the safeguarded space, plus lockout/tagout procedures and training. Its maintenance guidance calls for control of hazardous energy under 29 CFR 1910.147 or 29 CFR 1910.333 <Cite id=\"osha-otm-robots\" />.";
    expect(article.match(guardSpan)).toHaveLength(1);
  });

  it('does not disturb the protected neighbor original 39 row', () => {
    const neighbor = parse().claimRecords[38];
    expect(neighbor.compound?.planId).toBe('symbotic-industrial-20260912-industrial-deployment-39');
    expect(neighbor.evidenceFailures).toEqual([]);
  });
});
