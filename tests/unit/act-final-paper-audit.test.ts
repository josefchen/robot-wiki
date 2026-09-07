import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
  parseLedger,
} from '@/lib/audit-ledger';

const path = 'audit/manipulation.md';
const ledger = readFileSync(path, 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const citations = matter(readFileSync('content/manipulation/action-chunking.mdx', 'utf8')).data.citations as string[];
const rows = (compoundPlans = plans) => parseLedger(path, ledger, ids, {
  compoundPlans, articleCitations: { 'action-chunking': citations },
}).find(section => section.slug === 'action-chunking')!.claimRecords;

describe('ACT final paper audit binding', () => {
  it('completes exactly the existing 32 ACT identities including the two corrected rows', () => {
    expect(rows()).toHaveLength(32);
    expect(rows().every(row => row.evidenceFailures.length === 0)).toBe(true);
    for (const ordinal of [27, 28]) {
      expect(rows()[ordinal - 1].verdict).toBe('corrected');
      expect(rows()[ordinal - 1].claim).toContain('licensing terms');
    }
  });
  it('requires the full sixteen-source current P1 union', () => {
    const p1 = plans.find(p => p.id === 'action-chunking-frontmatter-p1')!;
    expect(citations).toHaveLength(16);
    expect(p1.parts.flatMap(part => part.requiredCitationIds).sort()).toEqual([...citations].sort());
    for (const id of ['pi06-model-card-2025', 'pi07-2026']) {
      const changed = structuredClone(plans);
      const current = changed.find(p => p.id === p1.id)!;
      current.parts = current.parts.filter(part => part.id !== id);
      current.evidence = current.evidence.filter(item => item.partId !== id);
      current.adjudications = current.adjudications.filter(item => item.partId !== id);
      current.planReview!.planDigest = compoundPlanDigest(current);
      for (const review of current.adjudications) {
        review.evidenceDigest = compoundPartDigest(current, review.partId);
      }
      expect(rows(changed)[31].evidenceFailures.join(' ')).toContain('P1 required citation set');
    }
  });
  it('does not complete a paper row with an omitted required source passage', () => {
    for (const ordinal of [27, 28]) {
      const changed = structuredClone(plans);
      const plan = changed.find(p => p.id === `act-final-paper-${ordinal}-20260907`)!;
      plan.evidence = plan.evidence.filter(item => item.partId !== 'source-scoped-availability');
      expect(rows(changed)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
});
