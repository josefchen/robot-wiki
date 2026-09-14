import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { compoundPartDigest, compoundPlanDigest, originalClaimDigest, parseCompoundPlans, parseLedger, type CompoundPlan } from '../../lib/audit-ledger';

const expected: Record<string, Record<string, string>> = {
  "rrt-hierarchy-20260914-hierarchical-3": {
    "moka-vqa": "5997216599f399b2e231fce981732f755c6d2f2a4a3e4dd25fc8661578b8d620",
    "moka-candidate-marks": "0c99d150687eaad2dbb58f7106e762fbb8279894728efdffed7311130ba9aa69",
    "moka-keypoint-roles": "ab17489ef14eaeca200cdafea7bdf93480be4f39a41ca85eb8bcde7d325e0445",
    "moka-execution-boundary": "534016b655d4f1921d0f6fa99a0fb295399b5452f471b91f67cebaa0286e6ec3",
    "moka-optional-learning": "3f7eca41bdb9d25aa603a71511e89220aa5111afbd406bf3901433c70cd288a7",
    "moka-scope-disagreements": "56730934e38c64007b592b25ff9a89388b7ed0c9cfeead32f3f40716d5ced9c6"
  },
  "rrt-hierarchy-20260914-hierarchical-4": {
    "rekep-numerical-programs": "89e932bc73e670160f5b78d9fcf004c1a9c7255021d6a4034e9b858889f018c7",
    "rekep-proposal-vlm": "4c973853e9681d5c682c66e4315fc5289ecbb23c687bb3721044810f9552686e",
    "rekep-hierarchical-optimization": "fce68c25239b5d2cd3d7babf2315d180c0bfc17594bac51b4d7e734b7d84b77f",
    "rekep-penalties-not-guarantees": "6f2d374327bbf7d7e96e3d59d6dd18f25f8f33bc974b6a71d60ee0e5d4e389dc",
    "rekep-tracking-evaluation-assumptions": "de27f8ad126cd01becf2698d36d11a79b929272aff39135af1bccb7f45126d3c",
    "rekep-source-differences": "e78da6252fca5138360d4d50b7dcec5e9fc924c36541a2195acc2646fb1c5c1e"
  },
  "rrt-hierarchy-20260914-hierarchical-5": {
    "robopoint-training-mixture": "18b9d0d299c9408e010cd0300a24954112cbe06653e2d602b13e426f736e518d",
    "robopoint-point-interface": "12b622dd8dbde47f261bae212f03513a3e94e61192c240e40a68f24a69a658b0",
    "robopoint-where2place-protocol": "e9708e9389108769bf9fedff4da1044621873cbfdfe092b3d4335b73c384edf5",
    "robopoint-where2place-values": "e9708e9389108769bf9fedff4da1044621873cbfdfe092b3d4335b73c384edf5",
    "robopoint-downstream-boundary": "c24ab48a2be537d3aea281795eabde40f9df007d6813fe0501c51a6e3eed38ac",
    "robopoint-original-headline-limits": "091c9ebf266e12242037bf2d67426afa452b3636278fc2b90167eb5a33211823"
  },
  "rrt-hierarchy-20260914-motion-5": {
    "report-identity": "f1605d462e0424e683f416424722d58cfe49884b68e5780cdd310be9402f318a",
    "report-date": "46cd50e6c99a0842a539586bff2b7ad429941d6a730ac63be9a42757586d0a7b",
    "sample-nearest-control": "ac87ad1c9619b4d16e0d1a24542cf114091c7cdd15272ceca038deb0d231d2da",
    "local-feasibility": "7746b587df5df099261670704e2692067ad3433f78ca288b89ade28807917034",
    "equation-correction": "d065d22cf34fe9dbe667e972a0bc4a1cf23627a1840a55dcac2175a74637b341",
    "book-formulation-difference": "19edfa69a182a7576f0f0fe00dae9c68cf54a7f5edcd945c42ecf363956c4874",
    "state-glossary-coupling": "d9c632bdea96bf85367e13678101949c029cf819e63a7065f27ed5e7ad8ed051"
  }
};
const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const registry = new Set(CITATIONS.map(c => c.id));
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const get = (id: string) => {
  const p = catalog.find(p => p.id === id);
  assert.ok(p, `missing independently reviewed plan ${id}`);
  return p;
};
function evidenceContract(p: CompoundPlan) {
  const specification = expected[p.id];
  assert.ok(specification);
  assert.deepEqual(p.parts.map(v => v.id), Object.keys(specification));
  assert.equal(p.evidence.length, p.parts.length);
  for (const part of p.parts) {
    const items = p.evidence.filter(e => e.partId === part.id);
    assert.equal(items.length, 1);
    assert.deepEqual(part.requiredCitationIds, [items[0].citationId]);
    assert.equal(hash([items[0].citationId, items[0].sourceUrl, items[0].supportingPassage]), specification[part.id]);
  }
}
function record(p: CompoundPlan, supplied = catalog) {
  const sections = parseLedger(p.ledgerPath, readFileSync(p.ledgerPath, 'utf8'), registry, { compoundPlans: supplied });
  return sections.find(s => s.slug === p.articleSlug)!.claimRecords[p.rowOrdinal - 1];
}
function rehash(p: CompoundPlan) {
  p.planReview!.planDigest = compoundPlanDigest(p);
  for (const a of p.adjudications) a.evidenceDigest = compoundPartDigest(p, a.partId);
}
function nativeFailures(p: CompoundPlan) {
  return record(p, catalog.map(v => v.id === p.id ? p : v)).evidenceFailures;
}
describe('RRT and hierarchy whole-current-claim corrections', () => {
  for (const [id, spec] of Object.entries(expected)) {
    it(`${id}: exact AND evidence, native current cells and authored reviews`, () => {
      const p = get(id);
      evidenceContract(p);
      expect(p.parts).toHaveLength(id.endsWith('motion-5') ? 7 : 6);
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.planReview!.rationale.length).toBeGreaterThan(150);
      expect(p.adjudications).toHaveLength(Object.keys(spec).length);
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.rationale.length).toBeGreaterThan(100);
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
      expect(originalClaimDigest(record(p))).toBe(p.originalCellsDigest);
      expect(record(p).evidenceFailures).toEqual([]);
    });
    it(`${id}: rejects missing, duplicate, stale and wrong-source evidence`, () => {
      const p = get(id);
      for (const change of [
        (x: CompoundPlan) => { x.evidence.pop(); },
        (x: CompoundPlan) => { x.evidence.push(structuredClone(x.evidence[0])); },
        (x: CompoundPlan) => { x.planReview = null; },
        (x: CompoundPlan) => { x.originalCellsDigest = '0'.repeat(64); },
        (x: CompoundPlan) => { x.evidence[0].sourceUrl = 'not a URL'; },
        (x: CompoundPlan) => { x.evidence[0].citationId = 'not-a-registered-source'; },
        (x: CompoundPlan) => { x.adjudications[0].outcome = 'unresolved'; },
      ]) {
        const clone = structuredClone(p); change(clone);
        expect(nativeFailures(clone).length).toBeGreaterThan(0);
      }
      expect(() => parseCompoundPlans([...catalog, p])).toThrow();
    });
    it(`${id}: rehashing cannot authorize reduced AND or wrong scientific passages`, () => {
      const p = get(id);
      for (const part of p.parts) {
        const omitted = structuredClone(p);
        omitted.parts = omitted.parts.filter(v => v.id !== part.id);
        omitted.evidence = omitted.evidence.filter(v => v.partId !== part.id);
        omitted.adjudications = omitted.adjudications.filter(v => v.partId !== part.id);
        rehash(omitted);
        expect(() => evidenceContract(omitted)).toThrow();
        const wrong = structuredClone(p);
        wrong.evidence.find(v => v.partId === part.id)!.supportingPassage = 'The article claims that this method always succeeds safely.';
        rehash(wrong);
        expect(() => evidenceContract(wrong)).toThrow();
      }
      const wrongSource = structuredClone(p);
      wrongSource.evidence[0].sourceUrl = 'https://example.org/unrelated-primary';
      rehash(wrongSource);
      expect(() => evidenceContract(wrongSource)).toThrow();
    });
  }
  it('keeps the actual dated bibliography and rejects the unrelated date passage', () => {
    const p = get('rrt-hierarchy-20260914-motion-5');
    const date = p.evidence.find(e => e.partId === 'report-date')!;
    expect(date.citationId).toBe('lavalle-2006');
    expect(date.supportingPassage).toContain('[103]');
    expect(date.supportingPassage).toContain('Technical Report 98-11');
    expect(date.supportingPassage).toContain('Oct. 1998');
    expect(date.supportingPassage).not.toMatch(/Kalos|Whitlock|1986/);
  });
  it('applies all RRT reader endpoints while preserving the toy and article date', () => {
    const article = readFileSync('content/classical/motion-planning.mdx', 'utf8');
    const glossary = readFileSync('data/glossary.ts', 'utf8');
    for (const phrase of ['October 1998', 'entire local paths', 'fixed time interval',
      'Euler approximation', 'Runge-Kutta', 'initial obstacle-free construction',
      "nearest point in the tree's swath", 'Figure 5.18 splits the edge']) expect(article).toContain(phrase);
    expect(article).toContain(String.raw`x_{new} \approx x + f(x,u)\Delta t`);
    expect(article).toContain('\n$$\n' + String.raw`x_{new} \approx x + f(x,u)\Delta t` + '\n$$\n');
    expect(article).not.toContain(String.raw`q_{new} = q_{near} + \epsilon`);
    expect(article).toContain(`note="Iowa State TR 98-11; date in LaValle's bibliography"`);
    expect(article).toContain('lastReviewed: "2026-08-17"');
    expect(glossary).toContain('A kinodynamic planner can instead use a state that includes both configuration and velocity.');
    expect(glossary).toContain("citations: ['lozano-perez-1983', 'lavalle-2006', 'lavalle-1998']");
    expect(glossary).not.toContain('Motion planners, sampling-based or optimization-based, all search this space');
  });
  it('retains hierarchy protocol and disagreement qualifications without perception replay', () => {
    const r = get('rrt-hierarchy-20260914-hierarchical-5');
    const text = r.evidence.find(e => e.partId === 'robopoint-where2place-values')!.supportingPassage;
    for (const value of ['46.77', '29.06', '0.45', '1.33']) expect(text).toContain(value);
    expect(record(r).note).toContain('100 real-world images');
    expect(record(r).note).toContain('30.5%');
    expect(record(r).note).toContain('39.5%');
    expect(record(get('rrt-hierarchy-20260914-hierarchical-3')).note).toContain('reference 70');
    expect(record(get('rrt-hierarchy-20260914-hierarchical-4')).note).toContain('[-1,1]');
    expect(catalog.filter(p => p.id.startsWith('rrt-hierarchy-20260914-'))).toHaveLength(4);
  });
});
