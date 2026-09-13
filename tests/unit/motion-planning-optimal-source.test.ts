import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLedger, parseCompoundPlans, compoundPartDigest } from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';
const read = (p: string) => fs.readFileSync(p, 'utf8');
const endpoints = [
  {
    "id": "row9-optimality-prose-and-math",
    "path": "content/classical/motion-planning.mdx",
    "text": "Karaman and Frazzoli's 2011 analysis separates finding a feasible path from improving its cost. Their RRT non-optimality proof includes an obstacle-free Euclidean example with a steering distance at least the domain diameter in which the best path cost converges almost surely to a suboptimal value. Their PRM result concerns the forest-building version that rejects connections within an already connected component; it is not a result about every roadmap planner. The same paper proves asymptotic optimality for fixed-radius simplified PRM, which allows those connections, at greater computational cost <Cite id=\"karaman-frazzoli-2011\" />.\n\nRRT\\* adds least-cost parent selection and rewiring; Algorithm 6 writes these costs additively. A new vertex keeps its feasible nearest parent unless a collision-free connection through a nearby vertex gives a cheaper path from the root. Neighbors are reattached only when a collision-free route through the new vertex lowers their cost. With $n$ vertices, Algorithm 6 uses\n\n$$\nr_n = \\min\\!\\left\\{\\eta,\\; \\gamma\\left(\\frac{\\log n}{n}\\right)^{1/d}\\right\\},\n$$\n\nwhere $\\eta>0$ caps the local steering distance and $d\\geq2$ is the Euclidean space dimension. The coefficient $\\gamma$ must be sufficiently large for the problem: Theorem 38 and Appendix G's Lemma 71 print different sufficient bounds. The latter's conservative condition is $\\gamma>4(\\mu(X_{free})/\\zeta_d)^{1/d}$, where $\\mu(X_{free})$ is free-space volume and $\\zeta_d$ is unit-ball volume; this is not a claim that the coefficient is minimal <Cite id=\"karaman-frazzoli-2011\" />.\n\nThe convergence statement is conditional and concerns a bounded Euclidean domain. The paper uses independent uniform free-space samples, Euclidean distance and straight-line collision checking, not differential constraints. Its cost is positive on nontrivial paths, monotone under concatenation and bounded by a constant times path length. A finite-cost optimum must be robust: it has weak clearance, meaning it can be continuously deformed into paths with positive clearance, and the cost must be continuous for paths approaching that optimum in the paper's bounded-variation norm. Under this setup, its RRT\\* result is\n\n$$\n\\mathbb{P}\\!\\left(\\lim_{n\\to\\infty}c_n=c^*\\right)=1.\n$$\n\nHere $c_n$ is the best feasible solution cost after $n$ iterations. This is an asymptotic cost guarantee, not a promise of an exact optimum after a finite budget. The non-optimality analysis also assumes that the set of states traversed by optimal paths has measure zero <Cite id=\"karaman-frazzoli-2011\" />.\n\nThe computational comparison is narrower than a runtime promise: for fixed dimension and environment, the paper's efficient spatial-search model gives expected asymptotic processing work of order $n\\log n$ for RRT\\*, within a constant factor of RRT's processing order. It does not bound every iteration's elapsed time by the same factor. In particular, its collision-check count grows as $O(\\log n)$ per iteration, while plain RRT makes one such check <Cite id=\"karaman-frazzoli-2011\" />."
  },
  {
    "id": "row10-informed-prose-and-math",
    "path": "content/classical/motion-planning.mdx",
    "text": "RRT\\* with global sampling also improves routes to states irrelevant to a particular start-goal query. Informed RRT\\* addresses that work after a first solution is found. For Euclidean path length in $\\mathbb{R}^d$ with fixed start and goal, it samples directly from the planning domain's intersection with\n\n$$\n\\widehat{X}_f=\\left\\{x:\\lVert x-x_{start}\\rVert_2+\\lVert x-x_{goal}\\rVert_2\\leq c_{best}\\right\\}.\n$$\n\nThis is a prolate hyperspheroid with start and goal as its foci and current best path length $c_{best}$ as its transverse diameter. Writing $f(x)$ for the optimal start-goal cost constrained through $x$, the true improving set is $X_f=\\{x:f(x)<c_{best}\\}$. The distance sum is an admissible lower bound: the region contains every state on a strictly improving feasible path, but a state inside it need not be collision-free or belong to any improving path. The planner still performs collision checks. Before the first finite-cost solution, it samples globally like RRT\\* <Cite id=\"gammell-2014\" />.\n\nThe paper reports the underlying RRT\\* completeness and optimality guarantees, not a universal speedup. Its linear expected-cost convergence calculation assumes no obstacles and a rewiring radius larger than the informed subset's diameter. Its simulation comparisons used common unoptimized code and 100 runs per variation on shared maps and seeds, with random-world refinement measured for 60 seconds after an initial solution. Those experiments found faster refinement than RRT\\*; when the informed set covers the planning domain, the heuristic supplies no focusing advantage <Cite id=\"gammell-2014\" />.\n\nSection V describes the Sample routine more strongly, as if every sampled state admits an improving path. That wording exceeds the admissible-superset construction in Section III and Algorithm 2; geometric membership alone does not establish it. Section V-A also leaves the exact informed rewiring-radius expression as ongoing work, so the paper does not supply a settled new threshold here <Cite id=\"gammell-2014\" />."
  },
  {
    "id": "row9-stat",
    "path": "content/classical/motion-planning.mdx",
    "text": "  <Stat label=\"RRT* analysis\" value=\"2011\" note=\"Karaman and Frazzoli; conditional theorem\" />"
  },
  {
    "id": "row9-registry-comment",
    "path": "data/citations.ts",
    "text": "    // Source: arXiv:1105.1186v1, 5 May 2011; Karaman and Frazzoli.\n    // The landing page says IJRR is forthcoming; final issue metadata\n    // is not established by this preprint. Algorithm 1 PRM differs from sPRM.\n"
  },
  {
    "id": "row9-registry-edition",
    "path": "data/citations.ts",
    "text": "    id: 'karaman-frazzoli-2011',\n    title: 'Sampling-based Algorithms for Optimal Motion Planning',\n    authors: ['Sertac Karaman', 'Emilio Frazzoli'],\n    year: 2011,\n    venue: 'arXiv preprint',"
  },
  {
    "id": "row10-registry-comment",
    "path": "data/citations.ts",
    "text": "    // Source: arXiv:1404.2334v3, 28 November 2014; landing metadata\n    // records IROS 2014, pp. 2997-3004. The ellipsoidal path-length\n    // heuristic is an admissible superset, not exact feasible improving states.\n"
  },
  {
    "id": "ompl-prose",
    "path": "content/classical/motion-planning.mdx",
    "text": "The Open Motion Planning Library's project documentation lists implementations of PRM and RRT, along with benchmarking tools for comparing planners. The core library is designed to integrate with external collision-checking and visualization components <Cite id=\"ompl-2012\" />."
  },
  {
    "id": "ompl-registry-comment",
    "path": "data/citations.ts",
    "text": "    // This entry links to project documentation, not a version-pinned copy\n    // of the associated 2012 paper. The fetched project page lists PRM/RRT\n    // implementations and benchmarking/integration capabilities; it does\n    // not establish field-wide adoption or testing certification. The\n    // paper title, authors and year below remain a separate P1 identity check."
  }
];
const cases = [[9, 7, 7, 21], [10, 5, 5, 15], [11, 3, 4, 4]] as const;
function native() {
  const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
  const parse = (catalog = plans) => parseLedger('audit/classical.md', read('audit/classical.md'), new Set(CITATIONS.map(c => c.id)), { compoundPlans: catalog }).find(s => s.slug === 'motion-planning')!;
  return { plans, parse };
}
describe('Optimal sampling and OMPL source-bound endpoints', () => {
  for (const e of endpoints) it(e.id + ' keeps its complete qualified endpoint', () => {
    expect(read(e.path).split(e.text).length - 1).toBe(1);
  });
  it('retains the article review date and exact ten-source population', () => {
    const article = read('content/classical/motion-planning.mdx');
    expect(article).toContain('lastReviewed: "2026-08-17"');
    const sourceIds = ['lozano-perez-1983', 'kavraki-1996', 'lavalle-1998', 'lavalle-kuffner-2001', 'karaman-frazzoli-2011', 'gammell-2014', 'ratliff-2009', 'schulman-2013', 'lavalle-2006', 'ompl-2012'];
    const front = article.split('citations:\n')[1].split('seeAlso:')[0];
    expect(front.trim().split('\n').map(x => x.trim().replace('- ', ''))).toEqual(sourceIds);
    expect(article).not.toMatch(/Most practitioners never implement|ships tested versions|reference implementation the field benchmarks against/);
  });
});
describe('Optimal sampling and OMPL complete mandatory AND plans', () => {
  for (const [ordinal, parts, items, excerpts] of cases) {
    it(`original ${ordinal} requires all ${parts} parts and ${items} native bundles retaining ${excerpts} literal excerpts`, () => {
      const { plans, parse } = native();
      const plan = plans.find(p => p.articleSlug === 'motion-planning' && p.rowOrdinal === ordinal)!;
      expect(plan).toBeDefined(); expect(plan.parts).toHaveLength(parts); expect(plan.evidence).toHaveLength(items);
      expect(plan.evidence.reduce((n, item) => n + item.supportingPassage.split('\n\n[…]\n\n').length, 0)).toBe(excerpts);
      expect(plan.planReview).not.toBeNull(); expect(plan.adjudications).toHaveLength(parts);
      expect(parse().claimRecords[ordinal - 1].evidenceFailures).toEqual([]);
    });
    for (const mode of ['plan', 'adjudication'] as const) it(`original ${ordinal} rejects stale ${mode} review`, () => {
      const { plans, parse } = native();
      const mutated = structuredClone(plans);
      const plan = mutated.find(p => p.articleSlug === 'motion-planning' && p.rowOrdinal === ordinal)!;
      if (mode === 'plan') plan.planReview = { ...plan.planReview!, planDigest: '0'.repeat(64) };
      else plan.adjudications[0] = { ...plan.adjudications[0], evidenceDigest: '0'.repeat(64) };
      expect(parse(mutated).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
    });
    for (let part = 0; part < parts; part++) for (const mode of ['deleted-source', 'malformed-source'] as const) {
      it(`original ${ordinal} rejects ${mode} for required part ${part + 1}`, () => {
        const { plans, parse } = native();
        const index = plans.findIndex(p => p.articleSlug === 'motion-planning' && p.rowOrdinal === ordinal);
        expect(index).toBeGreaterThanOrEqual(0);
        const mutated = structuredClone(plans), plan = mutated[index], id = plan.parts[part].id;
        plan.evidence = mode === 'deleted-source' ? plan.evidence.filter(e => e.partId !== id)
          : plan.evidence.map(e => e.partId === id ? { ...e, supportingPassage: '' } : e);
        plan.adjudications = plan.adjudications.map(a => a.partId === id ? { ...a, evidenceDigest: compoundPartDigest(plan, id) } : a);
        expect(parse(mutated).claimRecords[ordinal - 1].evidenceFailures.length).toBeGreaterThan(0);
      });
    }
  }
});
