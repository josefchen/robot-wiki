import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { compoundPartDigest, parseCompoundPlans, parseLedger } from '@/lib/audit-ledger';

const ledger = readFileSync('audit/manipulation.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const ready = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25];
const rows = (compoundPlans = plans) => parseLedger('audit/manipulation.md', ledger, ids, {
  compoundPlans,
}).find(section => section.slug === 'comparison-matrix')!.claimRecords;

describe('comparison fixed original audit population', () => {
  it('completes only the twenty-two fully bound claims, retaining all 25 original identities', () => {
    expect(rows()).toHaveLength(25);
    expect(rows().flatMap((row, i) => row.evidenceFailures.length ? [] : [i + 1])).toEqual(ready);
  });

  it('fails each whole ready row when any one required part loses its passage', () => {
    for (const ordinal of ready) {
      const planId = rows()[ordinal - 1].compound!.planId;
      const original = plans.find(p => p.id === planId)!;
      for (const part of original.parts) {
        const changed = structuredClone(plans);
        const plan = changed.find(p => p.id === original.id)!;
        plan.evidence = plan.evidence.filter(e => e.partId !== part.id);
        for (const review of plan.adjudications) review.evidenceDigest = compoundPartDigest(plan, review.partId);
        expect(rows(changed)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    }
  });

  it('requires the actual 21-source identity union and keeps incomplete P1 red', () => {
    const citations = matter(readFileSync('content/manipulation/comparison-matrix.mdx', 'utf8')).data.citations as string[];
    const plan = plans.find(p => p.id === 'comparison-current-1-20260907')!;
    const identity = plan.parts.filter(p => p.id.startsWith('identity-'));
    expect(citations).toHaveLength(21);
    expect(identity.flatMap(p => p.requiredCitationIds).sort()).toEqual([...citations].sort());
    expect(plan.parts.some(p => p.id === 'intro-scopes')).toBe(true);
    expect(rows()[0].evidenceFailures.length).toBeGreaterThan(0);
  });
});
