import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { compoundPartDigest, parseCompoundPlans, parseLedger } from '@/lib/audit-ledger';

const ledger = readFileSync('audit/manipulation.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const base = 'afeeb058097ed5720ca11b03e41d3d2167573f5d';
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const previous = parseLedger('audit/manipulation.md', before('audit/manipulation.md'), ids, {
  compoundPlans: JSON.parse(before('audit/compound-evidence.json')),
}).find(section => section.slug === 'comparison-matrix')!.claimRecords;
// Preserve the actual base's unselected readiness; only original 1 is newly complete.
const ready = [1, ...previous.flatMap((row, i) => row.evidenceFailures.length ? [] : [i + 1])];
const rows = (compoundPlans = plans) => parseLedger('audit/manipulation.md', ledger, ids, {
  // Plans only bind rows in their own ledger; scoping keeps each mutation
  // re-parse proportional to this ledger, not the merged catalog.
  compoundPlans: compoundPlans.filter(p => p.ledgerPath === 'audit/manipulation.md'),
}).find(section => section.slug === 'comparison-matrix')!.claimRecords;

describe('comparison fixed original audit population', () => {
  it('adds only original 1 to base readiness, retaining all 25 original identities', () => {
    expect(previous[0].evidenceFailures.length).toBeGreaterThan(0);
    expect(rows()).toHaveLength(25);
    expect(ready).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(rows().flatMap((row, i) => row.evidenceFailures.length ? [] : [i + 1])).toEqual(ready);
  });

  it('fails each whole ready row when any one required part loses its passage', { timeout: 60000 }, () => {
    const current = rows();
    for (const ordinal of ready) {
      const planId = current[ordinal - 1].compound!.planId;
      const original = plans.find(p => p.id === planId)!;
      for (const part of original.parts) {
        // Clone only the mutated plan; the rest of the catalog is untouched
        // and cloning it per iteration does not scale on the merged ledger.
        const clone = structuredClone(original);
        clone.evidence = clone.evidence.filter(e => e.partId !== part.id);
        for (const review of clone.adjudications) review.evidenceDigest = compoundPartDigest(clone, review.partId);
        const changed = plans.map(p => (p.id === original.id ? clone : p));
        expect(rows(changed)[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      }
    }
  });

  it('requires the actual 21-source identity union and both supported introductory setups', () => {
    const citations = matter(readFileSync('content/manipulation/comparison-matrix.mdx', 'utf8')).data.citations as string[];
    const plan = plans.find(p => p.id === 'comparison-current-1-20260907')!;
    const identity = plan.parts.filter(p => p.id.startsWith('identity-'));
    expect(citations).toHaveLength(21);
    expect(identity.flatMap(p => p.requiredCitationIds).sort()).toEqual([...citations].sort());
    expect(plan.parts.filter(p => p.id.startsWith('intro-')).map(p => p.id)).toEqual(['intro-rt2-serving', 'intro-openvla-inference']);
    expect(rows()[0].evidenceFailures).toEqual([]);
  });
});
