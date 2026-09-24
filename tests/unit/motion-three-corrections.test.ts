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
    expect(article).toContain('not a universal cutoff at a few dimensions');
    expect(article).toContain('semi-algebraic models for chains and trees can be generated automatically');
    expect(article).toContain('PSPACE-hardness');
    expect(article).toContain('Closed-chain constraints can also make efficient sampling difficult');
    expect(article).not.toMatch(/no one can mesh or visualize|its volume explodes|hopeless beyond a few dimensions/);
  });
  it('distinguishes Voronoi selection, dense sampling and query success from speed', () => {
    expect(article).toContain("In the report's planar holonomic example");
    expect(article).toContain("book's step-size-free dense-tree construction assumes an infinite dense sample sequence");
    expect(article).toContain('not a guarantee of fast coverage on every problem');
    expect(article).toContain('distinguishes exploring free space from solving a start-goal query');
    expect(article).not.toContain('canopy spreads through free space fast');
  });
  it('states the precise robust geometric completeness model', () => {
    for (const text of [String.raw`$X=(0,1)^d$, $d\geq2$`, 'an open goal region',
      String.raw`positive clearance $\delta>0$`, 'independent uniform free-space samples',
      'fixed positive connection radius for sPRM', 'collision tests over entire straight-line connections',
      '1-nearest sPRM counterexample is not probabilistically complete']) {
      expect(article).toContain(text);
    }
    expect(article).not.toContain('Both RRT and PRM are probabilistically complete: if a path exists');
  });
  it('retains a meaningful ordered DoF trigger and retains the subsequently corrected original-5 equation', () => {
    expect(article).toContain('number of <Term id="degrees-of-freedom">degrees of freedom</Term> is unbounded');
    expect([...article.matchAll(/<Term id="([^"]+)"/g)].map(m => m[1]))
      .toEqual(['trajectory-optimization', 'configuration-space', 'degrees-of-freedom']);
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
