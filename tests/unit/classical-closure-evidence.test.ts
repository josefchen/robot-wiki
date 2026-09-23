import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { originalClaimDigest, parseLedger } from '../../lib/audit-ledger';
import {
  LOCAL_BASIS_REQUIRED_TARGETS, loadLocalBasisContext, recomputeLocalDerivation,
  validateLocalBasisPlan,
} from '../../lib/audit-local-basis';
import { parseCorrectedDispositions } from '../../lib/audit-corrected-disposition';
import { buildRrt, edgesUpTo, RRT_SCENE } from '../../lib/rrt';

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8');
const json = (path: string) => JSON.parse(read(path));
const evidence = 'audit/evidence/classical-closure-20260923';
const ids = new Set(CITATIONS.map(c => c.id));
const selected = { kinematics: [3, 11, 12], 'motion-planning': [15], perception: [1, 2, 3, 7, 19, 59] };
const inputs = { handEyeDeg: .5, depthPct: 2, poseMm: 3, workingDistanceM: .5, target: 'opaque' };

describe('classical closure recipes and reader corrections', () => {
  it('registers only the seven additional authored obligations', () => {
    expect(Object.keys(LOCAL_BASIS_REQUIRED_TARGETS)).toHaveLength(21);
    for (const [slug, ordinals] of Object.entries(selected)) {
      for (const ordinal of ordinals) {
        expect(Object.hasOwn(LOCAL_BASIS_REQUIRED_TARGETS, `audit/classical.md:${slug}:${ordinal}`))
          .toBe(slug !== 'kinematics');
      }
    }
  });
  it('removes unsupported IK attributions without deleting the playground or DH matrix', () => {
    const article = read('content/classical/kinematics.mdx');
    expect(article).toContain('lavalle-2006');
    for (const absent of ['Wampler', 'Levenberg-Marquardt', 'wampler-1986', 'levenberg-1944', 'marquardt-1963',
      'denavit-hartenberg-1955', 'residual decreases monotonically', '\\lambda^2 I']) {
      expect(article).not.toContain(absent);
    }
    for (const retained of ['<PlanarFkArm', '<DhParameterTable', '/playground', 'A_i = \\begin{bmatrix}',
      'product-of-exponentials', '±0.5mm']) expect(article).toContain(retained);
  });
  it('labels the fixed RRT as authored and extensions as capped, not all equal length', () => {
    expect(read('content/classical/motion-planning.mdx')).toContain('19981001');
    const component = read('components/interactive/rrt-explorer.tsx');
    expect(component).toMatch(/authored/i);
    expect(component).not.toContain('fixed length toward it');
    const values = recomputeLocalDerivation({ id: 'rrt', mode: 'parameters', inputs: {} }).values;
    expect(values).toMatchObject({ defaults: { seed: 19981001, stepSize: 2, goalBias: .015, maxIterations: 900 },
      scene: { width: 100, height: 64, obstacles: RRT_SCENE.obstacles } });
    const tree = buildRrt(RRT_SCENE);
    const lengths = edgesUpTo(tree, tree.nodes.length).map(e => Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y));
    expect(lengths.every(n => n <= 2 + 1e-12)).toBe(true);
    expect(lengths.some(n => n < 1.99)).toBe(true);
    expect(tree.nodes.map(n => n.id)).toEqual(Array.from({ length: tree.nodes.length }, (_, i) => i));
    const replay = recomputeLocalDerivation({ id: 'rrt', mode: 'derive', inputs: { iteration: 0 } }).values;
    expect(replay).toMatchObject({ visibleNodes: 1, visibleEdges: 0, goalReached: false,
      display: [`0 / ${tree.nodes.length - 1}`, '1', 'tree not started', 'n/a'] });
  });
  it.each([.15, .5, 1.5])('checks RSS and shares independently at distance %s m', workingDistanceM => {
    const handeye = workingDistanceM * 1000 * Math.tan(Math.PI / 360);
    const sum = handeye ** 2 + 10 ** 2 + 3 ** 2;
    const values = recomputeLocalDerivation({ id: 'perception', mode: 'derive',
      inputs: { ...inputs, workingDistanceM } }).values;
    expect(values).toMatchObject({ totalMm: Math.sqrt(sum), effectiveDepthPct: 2,
      contributions: [{ mm: handeye, share: handeye ** 2 / sum }, { mm: 10, share: 100 / sum }, { mm: 3, share: 9 / sum }] });
  });
  it('keeps authored target floors and model bands distinct from material/collision predictions', () => {
    const component = read('components/interactive/perception-error-budget.tsx');
    for (const absent of ['of the variance', 'will jam', 'the sensors return garbage', 'VERDICT_TEXT']) expect(component).not.toContain(absent);
    expect(component).toContain('model band');
    const values = recomputeLocalDerivation({ id: 'perception', mode: 'derive',
      inputs: { ...inputs, handEyeDeg: 0, target: 'transparent' } }).values;
    expect(values).toMatchObject({ totalMm: Math.sqrt(80 ** 2 + 3 ** 2), effectiveDepthPct: 16,
      display: [Math.sqrt(6409).toFixed(2) + ' mm', '80.00 mm at 16.0%', 'above model band'] });
    const near = recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs: { ...inputs, handEyeDeg: 0, workingDistanceM: .15 } });
    const far = recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs: { ...inputs, handEyeDeg: 0, workingDistanceM: 1.5 } });
    expect(near).toEqual(far);
  });
  it('derives the prose-only 0.1 m tangent example without inventing a slider state', () => {
    const result = recomputeLocalDerivation({ id: 'perception-ray', mode: 'derive', inputs: { angleDeg: 1, distanceM: .1 } });
    expect(result.values).toMatchObject({ mm: 100 * Math.tan(Math.PI / 180), rounded: '1.7' });
    expect(recomputeLocalDerivation({ id: 'perception-ray', mode: 'derive', inputs: { angleDeg: 1, distanceM: 1 } }).values)
      .toMatchObject({ mm: 1000 * Math.tan(Math.PI / 180), rounded: '17' });
    expect(() => recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs: { ...inputs, workingDistanceM: .1 } })).toThrow();
  });
  it('counts the selected headings rather than every heading or a universal architecture', () => {
    const parameters = recomputeLocalDerivation({ id: 'perception-stages', mode: 'parameters', inputs: {} }).values as { headings: string[] };
    expect(parameters.headings).toHaveLength(6);
    expect(recomputeLocalDerivation({ id: 'perception-stages', mode: 'derive', inputs: parameters }).values)
      .toMatchObject({ count: 6, occurrences: [1, 1, 1, 1, 1, 1] });
    const bad = [...parameters.headings]; bad[5] = bad[0];
    expect(() => recomputeLocalDerivation({ id: 'perception-stages', mode: 'derive', inputs: { headings: bad } })).toThrow();
  });
  it.runIf(process.env.CLASSICAL_CLOSURE_NUMERIC === '1')('records bounded numeric outputs after independent assertions', () => {
    const cases = { opening: inputs, near: { ...inputs, workingDistanceM: .15 }, far: { ...inputs, workingDistanceM: 1.5 },
      zeroNear: { ...inputs, handEyeDeg: 0, workingDistanceM: .15 }, zeroFar: { ...inputs, handEyeDeg: 0, workingDistanceM: 1.5 },
      specular: { ...inputs, target: 'specular' }, transparent: { ...inputs, target: 'transparent' } };
    const recipes = [
      ...['rrt', 'perception', 'perception-ray', 'perception-stages'].map(id => ({ name: `${id}-parameters`, recipe: { id, mode: 'parameters', inputs: {} } })),
      ...Object.entries({ opening: 0, step: 1, playback: 3, scrub: 100 }).map(([name, iteration]) =>
        ({ name: `rrt-${name}`, recipe: { id: 'rrt', mode: 'derive', inputs: { iteration } } })),
      ...Object.entries(cases).map(([name, inputs]) => ({ name: `perception-${name}`, recipe: { id: 'perception', mode: 'derive', inputs } })),
      ...[.1, 1].map(distanceM => ({ name: `ray-${distanceM}`, recipe: { id: 'perception-ray', mode: 'derive', inputs: { angleDeg: 1, distanceM } } })),
      { name: 'ray-zero', recipe: { id: 'perception-ray', mode: 'derive', inputs: { angleDeg: 0, distanceM: 1 } } },
      { name: 'stages', recipe: { id: 'perception-stages', mode: 'derive',
        inputs: recomputeLocalDerivation({ id: 'perception-stages', mode: 'parameters', inputs: {} }).values } },
    ];
    const results = recipes.map(({ name, recipe }) => ({ name, recipe, output: recomputeLocalDerivation(recipe) }));
    for (const [name, p] of Object.entries(cases)) {
      const multiple = ({ opaque: 1, specular: 3, transparent: 8 } as Record<string, number>)[p.target];
      const hand = p.workingDistanceM * 1000 * Math.tan(p.handEyeDeg * Math.PI / 180);
      const depth = .5 * 1000 * Math.max(p.depthPct, 2 * multiple) / 100;
      const expected = Math.sqrt(hand ** 2 + depth ** 2 + p.poseMm ** 2);
      expect(results.find(r => r.name === `perception-${name}`)!.output.values).toMatchObject({ totalMm: expected, slackMm: 15, bandsMm: [15, 30] });
    }
    expect(results.find(r => r.name === 'ray-zero')!.output.values).toMatchObject({ mm: 0, rounded: '0' });
    writeFileSync(`${root}/${evidence}/numeric-results.json`, JSON.stringify({ observedAt: new Date().toISOString(),
      test: 'tests/unit/classical-closure-evidence.test.ts', results }, null, 2) + '\n');
  });
});

describe('classical closure native evidence and preservation', () => {
  const context = () => ({
    localBasis: loadLocalBasisContext(root, publishedModules().map(m => `/${m.domain}/${m.slug}/`)),
    correctedDispositions: { root, records: parseCorrectedDispositions([
      ...json('audit/evidence/industrial-closure-20260923/corrections.json'), ...json(`${evidence}/corrections.json`),
    ]) },
    compoundPlans: json('audit/compound-evidence.json'),
    articleCitations: { kinematics: [
      'lavalle-2006', 'whitney-1969', 'modern-robotics-2017', 'so-arm100-repo-2026',
      'act-aloha-2023', 'isaac-gr00t-repo-2026',
    ] },
  });
  it('closes all ten exact originals with complete evidence and retains 994 identities', () => {
    const ctx = context();
    const sections = parseLedger('audit/classical.md', read('audit/classical.md'), ids, ctx);
    for (const [slug, ordinals] of Object.entries(selected)) {
      for (const ordinal of ordinals) {
        const row = sections.find(s => s.slug === slug)!.claimRecords[ordinal - 1];
        expect(row.evidenceFailures, `${slug}:${ordinal}`).toEqual([]);
        expect(row.outcome).toBe('passing');
      }
    }
    const before = parseLedger('audit/classical.md', read(`${evidence}/classical-before.md`));
    expect(sections.map(s => [s.slug, s.claimRows])).toEqual(before.map(s => [s.slug, s.claimRows]));
    const all = ['classical', 'manipulation', 'rl-sim2real', 'world-models', 'data-hardware', 'frontier', 'adjacent'];
    expect(all.flatMap(d => parseLedger(`audit/${d}.md`, read(`audit/${d}.md`))).reduce((n, s) => n + s.claimRows, 0)).toBe(994);
  });
  it('preserves old local proof bytes and the full AND source obligations', () => {
    const ctx = context();
    expect(ctx.localBasis.catalog.plans).toHaveLength(18);
    const old = json(`${evidence}/preservation-before.json`);
    for (const binding of old.selected) expect(binding.currentTupleDigest).toBe(originalClaimDigest(binding.currentCells));
    for (const ordinal of [1, 2, 3, 7]) {
      const plan = ctx.localBasis.catalog.plans.find(p => p.originalId === `audit/classical.md:perception:${ordinal}`)!;
      expect(plan.parts.some(p => p.kind === 'external-source')).toBe(true);
      const broken = structuredClone(plan); broken.evidence = [];
      expect(validateLocalBasisPlan(broken, broken.currentCells, broken.id, { citationId: '', sourceUrl: '', supportingPassage: '' },
        ids, ctx.localBasis).failures.length).toBeGreaterThan(0);
    }
    for (const ordinal of [19, 59]) {
      const plan = ctx.localBasis.catalog.plans.find(p => p.originalId === `audit/classical.md:perception:${ordinal}`)!;
      expect(plan.mounts).toEqual([]);
      expect(plan.parts.every(p => p.kind !== 'observed-behavior')).toBe(true);
    }
  });
  it.each(['proof', 'observation', 'review', 'output', 'input-unit', 'history'])('fails closed on missing/stale %s', mutation => {
    const ctx = context();
    const plan = ctx.localBasis.catalog.plans.find(p => p.originalId === 'audit/classical.md:perception:7')!;
    const proof = ctx.localBasis.catalog.proofs.find(p => p.planId === plan.id && p.kind === 'observed-behavior')!;
    if (mutation === 'proof') ctx.localBasis.catalog.proofs = ctx.localBasis.catalog.proofs.filter(p => p.id !== proof.id);
    if (mutation === 'observation' && proof.kind === 'observed-behavior') proof.observations[0].readouts[0].text = 'invented';
    if (mutation === 'review') plan.adjudications[0].inputDigest = '0'.repeat(64);
    if (mutation === 'output') proof.expected.values = { totalMm: 999 };
    if (mutation === 'input-unit') proof.bases[0].unit = 'cm';
    if (mutation === 'history') plan.originalBinding.originalTupleDigest = '0'.repeat(64);
    expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id, { citationId: '', sourceUrl: '', supportingPassage: '' },
      ids, ctx.localBasis).failures.length).toBeGreaterThan(0);
  });
});
