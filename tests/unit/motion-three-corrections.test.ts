import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCompoundPlans, compoundPartDigest, compoundPlanDigest } from '../../lib/audit-ledger';

const article = readFileSync('content/classical/motion-planning.mdx', 'utf8');
const catalog = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const plan = (ordinal: number) => {
  const result = catalog.find(p => p.id === `motion-three-${ordinal}-20260913`);
  expect(result, `reviewed original ${ordinal}`).toBeDefined();
  return result!;
};

describe('motion originals 3, 6 and 8', () => {
  it('replaces dimensional impossibility with scoped complexity and constructive limits', () => {
    expect(article).toContain('semi-algebraic models for chains and trees can be generated automatically');
    expect(article).toContain('PSPACE-hard when the number of');
    expect(article).toContain('Hardness holds for a planar linkage with multiple links and for a multi-arm robot among 3D polyhedra');
    expect(article).toContain('closed-chain constraints make sampling difficult');
    expect(article).not.toMatch(/no one can mesh or visualize|its volume explodes|hopeless beyond a few dimensions/);
  });
  it('distinguishes Voronoi selection, dense sampling and query success from speed', () => {
    expect(article).toContain('Nearest-neighbor selection gives RRT a Voronoi bias, because frontier vertices own larger Voronoi regions');
    expect(article).toContain('The report leaves convergence rates open');
    expect(article).toContain('approaches one as sampling continues, with no finite-budget guarantee');
    expect(article).not.toContain('canopy spreads through free space fast');
  });
  it('states the precise robust geometric completeness model', () => {
    for (const text of [String.raw`$X=(0,1)^d$, $d\geq2$`,
      String.raw`clearance $\delta>0$`, 'uniform independent samples',
      'a fixed sPRM radius', 'straight-line collision tests',
      'A 1-nearest-neighbor sPRM is not probabilistically complete']) {
      expect(article).toContain(text);
    }
    expect(article).not.toContain('Both RRT and PRM are probabilistically complete: if a path exists');
  });
  it('retains a meaningful ordered DoF trigger and retains the subsequently corrected original-5 equation', () => {
    expect(article).toContain('number of <Term id="degrees-of-freedom">degrees of freedom</Term> is unbounded');
    expect([...article.matchAll(/<Term id="([^"]+)"/g)].map(m => m[1]))
      .toEqual(['configuration-space', 'degrees-of-freedom', 'trajectory-optimization']);
    expect(article).toContain(String.raw`x_{new} \approx x + f(x,u)\Delta t`);
    expect(article).toContain('lastReviewed: "2026-08-17"');
    // The TrajOpt tables were extracted into shared components; the
    // scroll-region aria-labels live there now, not inline in the article.
    const trajoptTables = readFileSync(
      'components/mdx/trajopt-results-table.tsx',
      'utf8',
    );
    expect(article).toContain('<TrajOptArmTable');
    expect(article).toContain('<TrajOptFullBodyTable');
    expect(trajoptTables).toContain('ariaLabel="TrajOpt arm benchmark results"');
    expect(trajoptTables).toContain('ariaLabel="TrajOpt full-body benchmark results"');
  });
  for (const [ordinal, parts, items] of [[3, 5, 5], [6, 3, 4], [8, 6, 6]]) {
    it(`binds all AND parts and genuine review digests for original ${ordinal}`, () => {
      const p = plan(ordinal);
      expect(p.parts).toHaveLength(parts);
      expect(p.evidence).toHaveLength(items);
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications).toHaveLength(parts);
      for (const part of p.parts) {
        const adjudication = p.adjudications.find(a => a.partId === part.id);
        expect(adjudication?.outcome).toBe('supported');
        expect(adjudication?.evidenceDigest).toBe(compoundPartDigest(p, part.id));
        for (const citationId of part.requiredCitationIds) {
          expect(p.evidence.filter(e => e.partId === part.id && e.citationId === citationId)).toHaveLength(1);
        }
      }
    });
  }
  it('includes the actual density, collision and counterexample statements rather than preceding text', () => {
    const dense = plan(6).evidence.find(e => e.partId === 'denseness-hypotheses')!.supportingPassage;
    expect(dense).toContain('α denote an infinite, dense sequence');
    expect(dense).toContain('new edge might not reach');
    const primitives = plan(8).evidence.find(e => e.partId === 'local-planners')!.supportingPassage;
    expect(primitives).toContain('Steering: Given two points');
    expect(primitives).toContain('Collision Test: Given two points');
    expect(primitives).toContain('line segment between');
    const theorem = plan(8).evidence.find(e => e.partId === 'precise-theorem-family')!.supportingPassage;
    expect(theorem).toContain('Theorem 17 (Incompleteness of k-nearest sPRM for k = 1)');
  });
});
