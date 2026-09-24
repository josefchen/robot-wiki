import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { committedSource } from '../helpers/continuation-integration';
import {
  compoundPartDigest, compoundPlanDigest, parseLedger, type CompoundPlan,
} from '../../lib/audit-ledger';

const plans: CompoundPlan[] = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const markdown = readFileSync('audit/data-hardware.md', 'utf8');
const selected = plans.filter(p => p.ledgerPath === 'audit/data-hardware.md'
  && p.articleSlug === 'industrial-deployment' && [27, 28].includes(p.rowOrdinal));
const parse = (input = plans) => parseLedger('audit/data-hardware.md', markdown,
  new Set(CITATIONS.map(c => c.id)), { compoundPlans: input })
  .find(s => s.slug === 'industrial-deployment')!;
const article = readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8');
const section = article.split("## The integrator's multiple\n")[1].split('\n## ')[0];

describe('industrial cost and responsibility coupled originals', () => {
  it('binds exactly two originals with all eight parts and source pairs', () => {
    expect(selected).toHaveLength(2);
    expect(selected.map(p => p.rowOrdinal)).toEqual([27, 28]);
    expect(selected.map(p => p.parts.length)).toEqual([3, 5]);
    expect(selected.map(p => p.evidence.length)).toEqual([3, 5]);
    for (const n of [27, 28]) {
      expect(parse().claimRecords[n - 1].evidenceFailures).toEqual([]);
      expect(parse().claimRecords[n - 1].verdict).toMatch(/^C\b/);
    }
  });
  it('binds actual reviews and every supported adjudication to current evidence', () => {
    expect(selected).toHaveLength(2);
    for (const p of selected) {
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications).toHaveLength(p.parts.length);
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
    }
  });
  it('fails closed for each missing part adjudication and each missing source pair', () => {
    expect(selected).toHaveLength(2);
    for (const p of selected) for (const part of p.parts) for (const kind of ['review', 'pair']) {
      const changed = structuredClone(plans);
      const target = changed.find(c => c.id === p.id)!;
      if (kind === 'review') target.adjudications = target.adjudications.filter(a => a.partId !== part.id);
      else target.evidence = target.evidence.filter(e => e.partId !== part.id);
      expect(parse(changed).claimRecords[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
  it('rejects stale tuples, stale source reviews and a missing whole-plan review', () => {
    expect(selected).toHaveLength(2);
    for (const p of selected) for (const kind of ['tuple', 'passage', 'review']) {
      const changed = structuredClone(plans);
      const target = changed.find(c => c.id === p.id)!;
      if (kind === 'tuple') target.originalCellsDigest = '0'.repeat(64);
      if (kind === 'passage') target.evidence[0].supportingPassage += ' Changed after review.';
      if (kind === 'review') target.planReview = null;
      expect(parse(changed).claimRecords[p.rowOrdinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
  it('keeps OSHA guidance, role overlap and employer obligations together', () => {
    expect(section).toContain("OSHA's Technical Manual, discussing ANSI/RIA R15.06-2012");
    expect(section).toContain('Manufacturers or employers may also act as integrators.');
    expect(section).toContain('The employer retains responsibility for a safe workplace');
    expect(section).toContain('risk assessment alone does not establish');
    expect(section).not.toContain('not the robot manufacturer');
    expect(section).not.toContain('ISO 10218-2:2025');
  });
  it('attributes the dated commercial list without fixtures or cycle guarantees', () => {
    expect(section).toContain("EVST's July 15, 2026");
    expect(section).toContain('application-specific end-of-arm tooling');
    expect(section).toContain('any vision-guided pick logic for mixed loads');
    expect(section).toContain('The surrounding-line work depends on what is already installed');
    expect(section).not.toContain('part fixtures');
    expect(section).not.toContain('at the quoted cycle');
  });
  it('classifies EVST without changing registry values or certifying an OSHA year', () => {
    const registry = readFileSync('data/citations.ts', 'utf8').split("id: 'evst-cell-cost-2026'")[0].slice(-700);
    expect(registry).toContain('Commercial EVST integrator/vendor guide, last updated July 15, 2026.');
    expect(registry).toContain('not independent');
    expect(registry).toContain('not fixed arm-only prices');
    expect(CITATIONS.find(c => c.id === 'evst-cell-cost-2026')?.authors).toEqual(['EVST Engineering Team']);
    expect(CITATIONS.find(c => c.id === 'osha-otm-robots')?.url)
      .toBe('https://www.osha.gov/otm/section-4-safety-hazards/chapter-4');
    expect(committedSource('0cbdda1', 'content/data-hardware/industrial-deployment.mdx'))
      .toContain('lastReviewed: "2026-08-22"');
    expect(article).toContain('lastReviewed: "2026-09-24"');
  });
  it('does not credit industrial52 or either held safety conjunction', () => {
    expect(parse().claimRecords[51].evidenceFailures.length).toBeGreaterThan(0);
    const safety = parseLedger('audit/frontier.md', readFileSync('audit/frontier.md', 'utf8'),
      new Set(CITATIONS.map(c => c.id)), { compoundPlans: plans })
      .find(s => s.slug === 'safety-and-assurance')!;
    for (const n of [5, 6]) expect(safety.claimRecords[n - 1].evidenceFailures.length).toBeGreaterThan(0);
  });
});
