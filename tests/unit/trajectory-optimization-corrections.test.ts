import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { GLOSSARY } from '../../data/glossary';
import { CITATIONS } from '../../data/citations';
import { parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';

const article = readFileSync('content/classical/motion-planning.mdx', 'utf8');
const catalog = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/classical.md', 'utf8');
const required = [
  'interior waypoints', 'workspace signed-distance field is negative',
  'inverse of a smoothness metric', 'first six joints of a seven-DoF Barrett WAM',
  '105 planning problems', 'CHOMP solved 99', 'ZMP preview controller',
  'Hamiltonian Monte Carlo', 'squared displacements between successive waypoints',
  'linear constraints are imposed directly', String.raw`d_{\mathrm{check}}>d_{\mathrm{safe}}`,
  'it expands when actual improvement', String.raw`d_{\mathrm{arc}}=r\phi^2/8`,
  'not guaranteed accurate in 3D', 'Bullet and convex hulls',
  'those were penalized at discrete times', '198 seven-DoF PR2 arm problems',
  '96 eighteen-DoF full-body problems', 'three seconds per CHOMP initialization',
  'thirty-second full-body OMPL limit', 'not a separate smoothness measurement',
  '| TrajOpt | 0.84 | 0.20 | 1.2 |', '| TrajOpt | 0.63 | 2.1 | 1.08 |',
  'Table II contains no CHOMP full-body result', "not evidence that sampling followed by refinement is the standard industrial pipeline today",
];
describe('trajectory corrections retain their scientific counterconditions', () => {
  for (const text of required) it(text, () => expect(article).toContain(text));
  it('retains math delimiters and the existing article review hold', () => {
    expect(article.match(/^\$\$$/gm)).toHaveLength(14);
    expect(article).toContain('lastReviewed: "2026-08-17"');
  });
  it('couples the glossary to both sources without a success guarantee', () => {
    const term = GLOSSARY.find(t => t.id === 'trajectory-optimization')!;
    expect(term.citations).toEqual(['ratliff-2009', 'schulman-2013']);
    expect(term.definition).toContain('not unconditional safety guarantees');
    expect(term.definition).toContain('can expand or shrink');
  });
});
function selected(plans: unknown) {
  return parseLedger('audit/classical.md', ledger, new Set(CITATIONS.map(c => c.id)), {
    compoundPlans: parseCompoundPlans(plans),
    articleCitations: { 'motion-planning': matter(article).data.citations },
  }).find(s => s.slug === 'motion-planning')!.claimRecords.slice(11, 14);
}
describe('native mandatory AND and current adjudication coverage', () => {
  it('completes exactly the three selected originals together', () => {
    expect(selected(catalog).map(r => r.evidenceFailures)).toEqual([[], [], []]);
    const plans = catalog.filter((p: { id: string }) => /^trajectory-optimization-(12|13|14)-20260913$/.test(p.id));
    expect(plans).toHaveLength(3);
    expect(plans.map((p: { parts: unknown[] }) => p.parts.length)).toEqual([6, 8, 3]);
  });
  for (const ordinal of [12, 13, 14]) {
    it(`rejects a missing atomic member ${ordinal}`, () => {
      const mutated = catalog.filter((p: { id: string }) => p.id !== `trajectory-optimization-${ordinal}-20260913`);
      expect(selected(mutated)[ordinal - 12].evidenceFailures.length).toBeGreaterThan(0);
    });
  }
  for (const citation of ['ratliff-2009', 'schulman-2013']) {
    it(`requires ${citation} for every two-source part`, () => {
      const mutated = structuredClone(catalog);
      const plan = mutated.find((p: { id: string }) => p.id === 'trajectory-optimization-14-20260913');
      expect(plan).toBeDefined();
      plan.evidence = plan.evidence.filter((e: { citationId: string }) => e.citationId !== citation);
      expect(selected(mutated)[2].evidenceFailures.length).toBeGreaterThan(0);
    });
  }
  const plans = parseCompoundPlans(catalog).filter(p => /^trajectory-optimization-(12|13|14)-20260913$/.test(p.id));
  for (const sourcePlan of plans) {
    for (const [index, item] of sourcePlan.evidence.entries()) {
      for (const mode of ['deleted', 'placeholder']) {
        it(`rejects ${mode} ${item.partId}/${item.citationId}`, () => {
          const mutated = structuredClone(catalog);
          const plan = mutated.find((p: { id: string }) => p.id === sourcePlan.id);
          if (mode === 'deleted') plan.evidence.splice(index, 1);
          else plan.evidence[index].supportingPassage = 'TODO';
          expect(selected(mutated)[sourcePlan.rowOrdinal - 12].evidenceFailures.length).toBeGreaterThan(0);
        });
      }
    }
    for (const part of sourcePlan.parts) {
      it(`rejects stale adjudication for ${part.id}`, () => {
        const mutated = structuredClone(catalog);
        const plan = mutated.find((p: { id: string }) => p.id === sourcePlan.id);
        plan.adjudications.find((a: { partId: string }) => a.partId === part.id).evidenceDigest = '0'.repeat(64);
        expect(selected(mutated)[sourcePlan.rowOrdinal - 12].evidenceFailures.length).toBeGreaterThan(0);
      });
    }
  }
});
