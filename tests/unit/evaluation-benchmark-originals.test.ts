import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPlanDigest, compoundPartDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
const ordinals = [8, 10, 11, 12, 13];
const prose = readFileSync('content/data-hardware/evaluation-crisis.mdx', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const selected = plans.filter(p => p.articleSlug === 'evaluation-crisis' && ordinals.includes(p.rowOrdinal));
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
const records = (catalog = plans) => parseLedger('audit/data-hardware.md', ledger, new Set(CITATIONS.map(c => c.id)), {compoundPlans: catalog}).find(s => s.slug === 'evaluation-crisis')!.claimRecords;
describe('evaluation benchmark originals 8,10,11,12,13', () => {
 it('integrates exactly five originals and every required AND dependency', () => {
  expect(selected.map(p => p.rowOrdinal)).toEqual(ordinals);
  expect(selected.map(p => [p.parts.length, p.parts.reduce((n,x) => n+x.requiredCitationIds.length,0),p.evidence.length])).toEqual([[6,6,7],[10,10,11],[3,3,3],[10,10,10],[4,4,4]]);
  for (const n of ordinals) expect(records()[n-1].evidenceFailures).toEqual([]);
  for (const n of [1,9]) expect(records()[n-1].evidenceFailures.length).toBeGreaterThan(0);
 });
 it('preserves the nine-source union, original date and completed statistics', () => {
  expect(prose).toContain('lastReviewed: "2026-08-17"');
  expect(prose.match(/^  - [a-z][\w-]+$/gm)).toHaveLength(9);
  expect(prose).toContain('<Cite id="droid-2024" />');
  for (const text of ['up to 32%','50 real attempts per task per policy per condition','which is 21.5%','missing simulation data']) expect(prose.includes(text), text).toBe(true);
 });
 it('distinguishes benchmark populations, protocols and bounded conclusions', () => {
  for (const text of ['90 short-horizon','50 human-expert','not guarantees that they are closed','approximately 1,500','not an established 1,500 one-to-one','Mean Maximum Rank Violation','612','4,284','model inference remains with the submitting user']) expect(prose.includes(text), text).toBe(true);
  expect(prose.includes('is a standard testbed for vision-language-action models')).toBe(false);
  expect(prose.includes('closes the second by calibrating')).toBe(false);
 });
 it('rejects missing reviews, missing evidence, stale cells and omitted adjudications', () => {
  expect(selected).toHaveLength(5);
  for (const p of selected) {
   expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
   for (const a of p.adjudications) expect(a.evidenceDigest).toBe(compoundPartDigest(p,a.partId));
   for (const mutate of [
    (q: typeof p) => {q.planReview=null;},
    (q: typeof p) => {q.evidence.pop();},
    (q: typeof p) => {q.originalCellsDigest='0'.repeat(64);},
    (q: typeof p) => {q.adjudications.pop();},
   ]) {
    const bad=structuredClone(plans);mutate(bad.find(q => q.id===p.id)!);
    expect(records(bad)[p.rowOrdinal-1].evidenceFailures.length).toBeGreaterThan(0);
   }
  }
 });
});
