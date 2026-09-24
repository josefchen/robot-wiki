import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { Weights } from '../../lib/reward-shaping.ts';
import { dirname, join } from 'node:path';
import { buildManifest, sha256 } from '../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, ledgerSummary } from '../../lib/audit-ledger.ts';
import {
  LOCAL_BASIS_REQUIRED_TARGETS, LOCAL_RECIPE_DEPENDENCIES, parseLocalBasisCatalog, recomputeLocalDerivation,
  createLocalArtifactReader, loadLocalBasisContext, localPlanDigest, localPartDigest,
  validateLocalBasisPlan, type LocalPlan, type LocalProof, type LocalBasisContext, type LocalMember,
} from '../../lib/audit-local-basis.ts';

describe('authored-local-basis-v1', () => {
  it('accepts only the exact versioned empty envelope', () => {
    const empty = { schemaVersion: 'authored-local-basis-v1', plans: [], proofs: [] };
    expect(parseLocalBasisCatalog(empty)).toEqual(empty);
    for (const bad of [null, [], {}, { ...empty, schemaVersion: 'v0' }, { ...empty, supported: true }]) {
      expect(() => parseLocalBasisCatalog(bad)).toThrow();
    }
    expect(Object.keys(LOCAL_BASIS_REQUIRED_TARGETS)).toHaveLength(27);
  });
  it('recomputes a safety distance against independent arithmetic', () => {
    const result = recomputeLocalDerivation({
      id: 'safety', mode: 'derive', inputs: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6 },
    });
    const values = result.values as { separation: number; force: number };
    expect(values.separation).toBeCloseTo(1.6 * (0.1 + 1 / 10) + 1 * 0.1 + 1 / 20 + 0.85 + 0.1, 12);
    expect(values.force).toBe(Math.sqrt(25000 * 4));
  });
  it('rejects arbitrary recipes, missing inputs, units and executable expressions', () => {
    for (const bad of [
      { id: 'shell', mode: 'derive', inputs: { command: 'echo supported' } },
      { id: 'safety', mode: 'derive', inputs: {} },
      { id: 'safety', mode: 'derive', inputs: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, unit: 'cm' } },
    ]) expect(() => recomputeLocalDerivation(bad)).toThrow();
  });
});

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const project = process.cwd();
const fixtureText = 'SYNTHETIC ONLY: authored illustrative assumptions, not scientific measurements.';
function fixture(mixed = false, model: 'reward' | 'parallel' = 'reward') {
  const root = mkdtempSync(join(tmpdir(), 'audit-local-fixture-')); roots.push(root);
  const put = (path: string, value: string | Buffer) => {
    mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value);
  };
  const ref = (path: string) => {
    const bytes = readFileSync(join(root, path));
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  };
  const full = (path: string): LocalMember => {
    const file = ref(path);
    const source = readFileSync(join(root, path), 'utf8');
    const prose = path.startsWith('content/');
    const component = path.startsWith('components/');
    const id = prose ? `article:${path.slice(8, -4)}` : component ? `source:${path}` : `file:${path}`;
    return { file, id, offset: 0, length: file.bytes, sha256: file.sha256,
      ...((prose || component) ? { baseline: { kind: prose ? 'prose' as const : 'interactive-sources-mounts' as const,
        hash: buildManifest(prose ? 'prose' : 'interactive-sources-mounts', [{ id,
          value: prose ? { path, body: source.trim() } : { path, source } }]).members[0].hash } } : {}) };
  };
  const slug = model === 'reward' ? 'reward-design-mpc' : 'parallel-sim-rl';
  const ordinal = model === 'reward' ? 4 : 18;
  const componentName = model === 'reward' ? 'RewardShaping' : 'TrainingTimeChart';
  const article = `content/rl-sim2real/${slug}.mdx`;
  const registry = JSON.parse(readFileSync(join(project, 'contract/brand-v2-registries.json'), 'utf8'));
  const source = registry.interactive.sources.find((s: { id: string }) => s.id === `interactive:${componentName}`);
  const mounted = registry.interactive.mounts.find((m: { id: string }) => m.id === `mount:/rl-sim2real/${slug}/:${componentName}:1`);
  const component = source.sourcePath as string;
  const test = 'tests/unit/audit-local-basis.test.ts';
  const dependencies = [...LOCAL_RECIPE_DEPENDENCIES[model], 'lib/audit-local-basis.ts', component, article, test];
  for (const path of dependencies.filter(p => p !== article)) {
    put(path, readFileSync(join(project, path)));
  }
  put(article, fixtureText);
  const currentCells = { claim: 'SYNTHETIC authored reward term set', sourceChecked: 'synthetic local basis',
    verdict: 'V', note: 'SYNTHETIC not a real audit' };
  const row = (binding: string) => `| ${Object.values(currentCells).join(' | ')} | | | | ${binding} |`;
  const header = `# Synthetic\n## ${slug}.mdx\n| Claim | Source checked | Verdict | Note | Citation ID | Source URL fetched | Supporting passage | Evidence plan |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  const markdown = header + Array.from({ length: ordinal }, (_, i) => row(i === ordinal - 1 ? 'synthetic-local' : '')).join('\n');
  put('audit/fixtures/original.md', markdown);
  put('contract/brand-v2-registries.json', JSON.stringify(registry));
  const plan: LocalPlan = {
    id: 'synthetic-local', kind: 'explicit-parts-v2', originalId: `audit/rl-sim2real.md:${slug}:${ordinal}`,
    ledgerPath: 'audit/rl-sim2real.md', articleSlug: slug, rowOrdinal: ordinal,
    originalBinding: { originalCells: { ...currentCells }, originalTupleDigest: originalClaimDigest(currentCells),
      snapshot: ref('audit/fixtures/original.md'), sourceCommit: 'a'.repeat(40) },
    currentCells, currentTupleDigest: originalClaimDigest(currentCells),
    mounts: [{ sourceId: source.id, sourceFingerprint: source.fingerprint, mountId: mounted.id,
      mountFingerprint: mounted.fingerprint, route: mounted.route }],
    disclosure: { member: full(article), text: fixtureText },
    parts: [{ id: 'local', kind: 'authored-parameter', text: fixtureText, requiredProofIds: ['parameters'] }],
    evidence: [], planReview: null, adjudications: [],
  };
  const recipe = { id: model, mode: 'parameters' as const, inputs: {} };
  const expected = recomputeLocalDerivation(recipe);
  put('audit/fixtures/input.json', JSON.stringify(recipe));
  put('audit/fixtures/output.json', JSON.stringify(expected));
  const proof: LocalProof = {
    id: 'parameters', planId: plan.id, partId: 'local', kind: 'authored-parameter',
    originalId: plan.originalId, originalTupleDigest: plan.originalBinding.originalTupleDigest,
    currentTupleDigest: plan.currentTupleDigest,
    artifacts: dependencies.map(full),
    disclosure: plan.disclosure, recipe, expected, bases: [],
    input: ref('audit/fixtures/input.json'), output: ref('audit/fixtures/output.json'),
    inputDigest: ref('audit/fixtures/input.json').sha256, outputDigest: ref('audit/fixtures/output.json').sha256,
    provenance: { command: `SYNTHETIC ONLY node ${test}`, runner: 'node', cwd: root,
      environment: { NODE_DISABLE_COMPILE_CACHE: '1' }, startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-01T00:00:01Z', exitCode: 0, test: ref(test),
      receipt: { path: 'audit/fixtures/run.json', bytes: 1, sha256: '0'.repeat(64) } },
  };
  const context: LocalBasisContext = { root, registry: registry.interactive,
    publishedRoutes: [mounted.route], catalog: { schemaVersion: 'authored-local-basis-v1', plans: [plan], proofs: [proof] } };
  const sealRun = (p: LocalProof) => {
    const { receipt: _receipt, ...run } = p.provenance; void _receipt;
    put(`audit/fixtures/run-${p.id}.json`, JSON.stringify({ schemaVersion: 'local-run-v1', ...run,
      inputDigest: p.inputDigest, outputDigest: p.outputDigest, dependencies: p.artifacts,
      observations: p.kind === 'observed-behavior' ? p.observations : [] }));
    p.provenance.receipt = ref(`audit/fixtures/run-${p.id}.json`);
  };
  const sealReviews = () => {
    const review = (partId: string | null) => {
      const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, context.catalog.proofs);
      const path = `audit/fixtures/review-${partId ?? 'plan'}.json`;
      const fields = { reviewedBy: 'SYNTHETIC reviewer; not a real audit', rationale: fixtureText, inputDigest };
      put(path, JSON.stringify({ schemaVersion: 'local-review-event-v1', sessionId: 'SYNTHETIC-SESSION',
        role: 'integrator', eventId: `SYNTHETIC-${partId}`, observedAt: '2026-01-01T00:00:02Z',
        ...fields, scope: partId === null ? 'plan' : 'part', partId, outcome: 'supported',
        inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest }));
      return { ...fields, event: ref(path) };
    };
    plan.planReview = review(null);
    plan.adjudications = plan.parts.map(p => ({ ...review(p.id), partId: p.id, outcome: 'supported' }));
  };
  if (mixed) {
    plan.parts.unshift({ id: 'paper', kind: 'external-source', text: 'SYNTHETIC external obligation', requiredCitationIds: ['synthetic-paper'] });
    put('audit/fixtures/response.txt', 'SYNTHETIC external passage. Not a fetched source or actual evidence.');
    plan.evidence.push({ partId: 'paper', citationId: 'synthetic-paper', sourceUrl: 'https://source.example/paper',
      supportingPassage: readFileSync(join(root, 'audit/fixtures/response.txt'), 'utf8'),
      provenance: { retrievedAt: '2026-01-01T00:00:00Z', tool: 'SYNTHETIC fixture', response: ref('audit/fixtures/response.txt'), passage: full('audit/fixtures/response.txt') } });
  }
  sealRun(proof); sealReviews();
  const validate = () => validateLocalBasisPlan(plan, currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, new Set(['synthetic-paper']), context);
  return { root, plan, proof, context, validate, put, ref, full, sealRun, sealReviews, markdown, currentCells };
}

describe('authored-local-basis-v1 immutable synthetic fixtures (never real evidence)', () => {
  it('validates a relocated checkout without accessing or relabeling the execution directory', () => {
    const f = fixture(true);
    const destination = mkdtempSync(join(tmpdir(), 'audit-local-relocated-'));
    roots.push(destination);
    cpSync(f.root, destination, { recursive: true });
    const originalProof = JSON.stringify(f.proof);
    rmSync(f.root, { recursive: true });
    f.context.root = destination;
    expect(f.validate().failures).toEqual([]);
    expect(JSON.stringify(f.proof)).toBe(originalProof);
  });
  it.each([false, true])('accepts complete synthetic local/mixed proof, mixed=%s', mixed => {
    const f = fixture(mixed);
    expect(parseLocalBasisCatalog(f.context.catalog)).toEqual(f.context.catalog);
    expect(f.validate().failures).toEqual([]);
    const section = parseLedger(f.plan.ledgerPath, f.markdown, new Set(['synthetic-paper']), { localBasis: f.context })[0];
    expect(section.claimRecords[3].evidenceFailures).toEqual([]);
    expect(section.evidenceKinds).toEqual({ [mixed ? 'mixed-local' : 'authored-local']: 1 });
    expect(section.claimRecords[3].citationId).toBe('');
    expect(ledgerSummary([section])).toContain('Complete evidence records: 1');
  });
  it.each(['claim', 'sourceChecked', 'verdict', 'note'] as const)('rejects current native cell drift: %s', key => {
    const f = fixture(); f.plan.currentCells = { ...f.currentCells, [key]: 'changed' };
    f.plan.currentTupleDigest = originalClaimDigest(f.plan.currentCells); f.sealReviews();
    expect(f.validate().failures.join(' ')).toMatch(/current native/);
  });
  it.each(['claim', 'sourceChecked', 'verdict', 'note'] as const)('rejects invented original cells: %s', key => {
    const f = fixture(); f.plan.originalBinding.originalCells[key] = 'invented original';
    f.plan.originalBinding.originalTupleDigest = originalClaimDigest(f.plan.originalBinding.originalCells);
    expect(f.validate().failures.join(' ')).toMatch(/original snapshot/);
  });
  it.each(['originalId', 'ledgerPath', 'articleSlug', 'rowOrdinal'] as const)('rejects wrong identity: %s', key => {
    const f = fixture();
    if (key === 'rowOrdinal') f.plan[key] = 17; else f.plan[key] += '-wrong';
    expect(() => parseLocalBasisCatalog(f.context.catalog)).toThrow();
  });
  it.each(['empirical-result', 'bibliographic-p1', 'registry-absence', 'disagreement', 'glossary-resolution'])('rejects forbidden category %s', kind => {
    const f = fixture();
    expect(() => parseLocalBasisCatalog({ ...f.context.catalog, proofs: [{ ...f.proof, kind }] })).toThrow();
  });
  it.each(['citationId', 'sourceUrl', 'supportingPassage', 'fetchedAt'])('rejects external fields on local proof: %s', key => {
    const f = fixture();
    expect(() => parseLocalBasisCatalog({ ...f.context.catalog, proofs: [{ ...f.proof, [key]: 'invented' }] })).toThrow();
  });
  it('requires the catalog, exact proof inventory and published target', () => {
    const f = fixture();
    expect(() => loadLocalBasisContext(f.root, f.context.publishedRoutes)).toThrow();
    f.put('audit/local-basis.json', '{}');
    expect(() => loadLocalBasisContext(f.root, f.context.publishedRoutes)).toThrow();
    f.put('audit/local-basis.json', JSON.stringify(f.context.catalog));
    expect(() => loadLocalBasisContext(f.root, [])).toThrow(/unpublished/);
    expect(loadLocalBasisContext(f.root, f.context.publishedRoutes).catalog.plans).toHaveLength(1);
    expect(() => parseLocalBasisCatalog({ ...f.context.catalog, proofs: [] })).toThrow(/inventory/);
    expect(() => parseLocalBasisCatalog({ ...f.context.catalog, proofs: [f.proof, f.proof] })).toThrow(/duplicate/);
  });
  it.each(['lib/gait.ts', 'lib/reward-shaping.ts', 'lib/audit-local-basis.ts'])('requires complete dependency %s', path => {
    const f = fixture(); f.proof.artifacts = f.proof.artifacts.filter(a => a.file.path !== path);
    f.sealRun(f.proof); f.sealReviews();
    expect(f.validate().failures.join(' ')).toContain(`missing mandatory dependency ${path}`);
  });
  it('pins the safety imported force data and reward gait data', () => {
    expect(LOCAL_RECIPE_DEPENDENCIES.safety).toEqual(['lib/safety-modes.ts', 'lib/force-limits.ts']);
    expect(LOCAL_RECIPE_DEPENDENCIES.reward).toEqual(['lib/reward-shaping.ts', 'lib/gait.ts']);
  });
  it.each(['bytes', 'hash', 'member', 'missing', 'source'])('rejects drift: %s', mutation => {
    const f = fixture();
    if (mutation === 'bytes') f.proof.input.bytes++;
    if (mutation === 'hash') f.proof.output.sha256 = '0'.repeat(64);
    if (mutation === 'member') f.proof.artifacts[0].offset++;
    if (mutation === 'missing') f.proof.input.path = 'audit/missing.json';
    if (mutation === 'source') f.put('lib/gait.ts', 'changed computation');
    f.sealReviews();
    expect(f.validate().failures.length).toBeGreaterThan(0);
  });
  it('rejects escaped paths, symlinks, directories and overlarge files', () => {
    const f = fixture(); const read = createLocalArtifactReader(f.root);
    for (const path of ['../outside', '/etc/passwd', 'audit/../lib/gait.ts', 'audit\\escape', 'public/fake.json']) {
      expect(() => read({ ...f.proof.input, path })).toThrow();
    }
    symlinkSync(join(f.root, 'lib/gait.ts'), join(f.root, 'audit/link'));
    expect(() => read({ ...f.proof.input, path: 'audit/link' })).toThrow(/symlink/);
    expect(() => read({ ...f.proof.input, path: 'audit/fixtures' })).toThrow();
    expect(() => read({ ...f.proof.input, bytes: 9 * 1024 * 1024 })).toThrow();
  });
  it('rejects rehashed wrong output, units and precision rather than trusting hashes', () => {
    for (const key of ['values', 'units', 'precision', 'formula'] as const) {
      const f = fixture();
      if (key === 'values') f.proof.expected.values = { total: 999 };
      else f.proof.expected[key] = 'wrong';
      f.put('audit/fixtures/output.json', JSON.stringify(f.proof.expected));
      f.proof.output = f.ref('audit/fixtures/output.json'); f.proof.outputDigest = f.proof.output.sha256;
      f.sealRun(f.proof); f.sealReviews();
      expect(f.validate().failures.join(' ')).toMatch(/recomputed/);
    }
  });
  it.each(['absent', 'name-only', 'wrong-input', 'copied-part', 'unresolved', 'contradicted', 'duplicate'])('requires actual bound review event: %s', mutation => {
    const f = fixture(true);
    if (mutation === 'absent') f.plan.planReview = null;
    if (mutation === 'name-only') f.plan.planReview!.event.path = 'audit/nonexistent-review.json';
    if (mutation === 'wrong-input') f.plan.planReview!.inputDigest = '0'.repeat(64);
    if (mutation === 'copied-part') f.plan.adjudications[1].event = f.plan.adjudications[0].event;
    if (mutation === 'unresolved' || mutation === 'contradicted') f.plan.adjudications[0].outcome = mutation;
    if (mutation === 'duplicate') f.plan.adjudications[1] = f.plan.adjudications[0];
    expect(f.validate().failures.length).toBeGreaterThan(0);
  });
  it('cannot shrink or retype the inventory by recomputing producer review hashes', () => {
    const f = fixture(true);
    f.plan.parts.shift(); f.plan.evidence = []; f.plan.adjudications.shift();
    f.plan.planReview!.inputDigest = localPlanDigest(f.plan);
    f.plan.adjudications[0].inputDigest = localPartDigest(f.plan, 'local', [f.proof]);
    expect(f.validate().failures.join(' ')).toMatch(/review event/);
  });
  it.each(['missing-external', 'missing-local', 'self-url', 'repo-text', 'invented-citation', 'extra-item'])('enforces full typed external/local AND: %s', mutation => {
    const f = fixture(true);
    if (mutation === 'missing-external') f.plan.evidence = [];
    if (mutation === 'missing-local') f.context.catalog.proofs = [];
    if (mutation === 'self-url') f.plan.evidence[0].sourceUrl = 'https://robot-wiki.example/rl-sim2real/reward-design-mpc/';
    if (mutation === 'repo-text') f.plan.evidence[0].supportingPassage = 'REPO TEXT, no HTTP: constants are real';
    if (mutation === 'invented-citation') f.plan.evidence[0].citationId = 'local-made-up';
    if (mutation === 'extra-item') f.plan.evidence.push(f.plan.evidence[0]);
    f.sealReviews();
    expect(f.validate().failures.length).toBeGreaterThan(0);
  });
  it.each(['failed', 'future', 'wrong-cwd', 'stale-receipt'])('rejects execution provenance defect: %s', mutation => {
    const f = fixture();
    if (mutation === 'failed') f.proof.provenance.exitCode = 1;
    if (mutation === 'future') f.proof.provenance.endedAt = '2999-01-01T00:00:00Z';
    if (mutation === 'wrong-cwd') f.proof.provenance.cwd = '/wrong';
    if (mutation === 'stale-receipt') f.proof.provenance.command += ' changed';
    f.sealReviews();
    expect(f.validate().failures.length).toBeGreaterThan(0);
  });
  it('cannot use an old legacy plan alongside the typed target or remove its binding', () => {
    const f = fixture();
    const legacy = { id: 'legacy', ledgerPath: f.plan.ledgerPath, articleSlug: f.plan.articleSlug,
      rowOrdinal: 4, originalCellsDigest: f.plan.currentTupleDigest, kind: 'explicit-parts',
      parts: [{ id: 'old', text: fixtureText, requiredCitationIds: ['synthetic-paper'] }],
      evidence: [], planReview: null, adjudications: [] };
    expect(() => parseLedger(f.plan.ledgerPath, f.markdown, new Set(), { compoundPlans: [legacy], localBasis: f.context })).toThrow(/cross-catalog/);
    const rows = parseLedger(f.plan.ledgerPath, f.markdown.replace('| synthetic-local |', '| |'),
      new Set(), { localBasis: f.context })[0].claimRecords;
    expect(rows[3].evidenceFailures.join(' ')).toMatch(/binding/);
  });
});

describe('authored-local-basis-v1 independent numeric and state oracles', () => {
  it('keeps authored reward cents and priority classification', () => {
    const w = { velTrack: 1, yawTrack: .5, torque: .8, jointAccel: .5, actionRate: .8,
      jointLimit: 1, collision: 1, baseHeight: .5, orientation: .8, airTime: .6, stumble: .8, termination: 1.5 };
    const result = recomputeLocalDerivation({ id: 'reward', mode: 'derive', inputs: { weights: w, phase: 0 } });
    expect(result.values).toMatchObject({ total: -5.52, behavior: 'balanced' });
    expect(recomputeLocalDerivation({ id: 'reward', mode: 'derive', inputs: { weights: { ...w, torque: 4, actionRate: .2 }, phase: .5 } }).values)
      .toMatchObject({ behavior: 'chatter' });
  });
  it('checks friction Gaussian and plateau independently', () => {
    const result = recomputeLocalDerivation({ id: 'friction', mode: 'derive', inputs: { mu: .89, range: .35 } });
    expect(result.values).toMatchObject({ point: .97 * Math.exp(-((.89 - .8) ** 2) / (2 * .09 ** 2)), peak: .93 - .55 * .35, dr: .93 - .55 * .35 });
  });
  it('checks teacher zero-degradation and gait wrap/stance states', () => {
    const result = recomputeLocalDerivation({ id: 'teacher', mode: 'derive', inputs: { degradation: 0 } });
    expect(result.values).toMatchObject({ mae: 0, divergence: 0, occluded: Array(24).fill(false) });
    const gaitResult = recomputeLocalDerivation({ id: 'gait', mode: 'derive', inputs: { gait: 'trot', phase: 0, direction: -1 } });
    expect(gaitResult.values).toMatchObject({ nextPhase: .95,
      legs: [{ id: 'lf', phase: 0, stance: true }, { id: 'rf', phase: .5, stance: false },
        { id: 'lh', phase: .5, stance: false }, { id: 'rh', phase: 0, stance: true }] });
  });
  it('checks parallel iteration costs without importing its oracle', () => {
    const result = recomputeLocalDerivation({ id: 'parallel', mode: 'derive', inputs: { envs: 4096, cpuBound: false, samples: 3 } });
    expect(result.values).toMatchObject({ iterations: 2.2e8 / (4096 * 24),
      seconds: 2.2e8 / (4096 * 24) * (.02 + 4096 * .000004 + .04 + .03) });
  });
  it('checks economics arithmetic and Eureka identity diff', () => {
    const result = recomputeLocalDerivation({ id: 'economics', mode: 'derive', inputs: {
      robotCost: 80000, integrationMultiple: 2.5, cycleTimeSeconds: 6, uptimePercent: 100,
      successRatePercent: 90, jamClearSeconds: 15, wageUsdPerHour: 25,
    } });
    expect(result.values).toMatchObject({ totalCellCost: 200000, effectiveSecondsPerPick: 7.5,
      netPicksPerHour: 480, monthlyPicks: 350400, monthlyLaborValue: 14600, paybackMonths: 200000 / 14600 });
    const replay = recomputeLocalDerivation({ id: 'eureka', mode: 'derive', inputs: { previous: 0, next: 0 } });
    expect(replay.values).toMatchObject({ diff: [
      { type: 'same', text: 'def reward(obs, act):' }, { type: 'same', text: '    # task: walk forward at 1.0 m/s' },
      { type: 'same', text: '    return obs.base_lin_vel_x' },
    ] });
  });
});


function withDerivation(observed: boolean) {
  const f = fixture();
  const inputs = { weights: (f.proof.expected.values as { weights: Weights }).weights, phase: 0 };
  const recipe = { id: 'reward' as const, mode: 'derive' as const, inputs };
  const expected = recomputeLocalDerivation(recipe);
  f.put('audit/fixtures/derived-input.json', JSON.stringify(recipe));
  f.put('audit/fixtures/derived-output.json', JSON.stringify(expected));
  const transition = { mountId: f.plan.mounts[0].mountId, caseId: 'default', prestate: 'SYNTHETIC unmounted',
    action: 'SYNTHETIC mount', poststate: 'SYNTHETIC default state' };
  const capture = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(capture);
  capture.writeUInt32BE(375, 16); capture.writeUInt32BE(812, 20);
  f.put('audit/fixtures/capture.png', capture);
  f.put('audit/fixtures/dom.txt', fixtureText + '\n-5.52');
  const common = { ...f.proof, id: 'derived', partId: 'derived', recipe, expected,
    input: f.ref('audit/fixtures/derived-input.json'), output: f.ref('audit/fixtures/derived-output.json'),
    inputDigest: f.ref('audit/fixtures/derived-input.json').sha256, outputDigest: f.ref('audit/fixtures/derived-output.json').sha256,
    bases: [{ input: 'weights', kind: 'authored-parameter' as const, proofId: 'parameters', pointer: '/weights', unit: 'dimensionless' },
      { input: 'phase', kind: 'authored-parameter' as const, proofId: 'parameters', pointer: '/phase', unit: 'cycle' }],
    provenance: { ...f.proof.provenance, runner: observed ? 'playwright' as const : 'node' as const },
  };
  const proof: LocalProof = observed ? { ...common, kind: 'observed-behavior', observations: [{ ...transition,
    viewport: { width: 375, height: 812 }, readouts: [{ selector: '[data-readout]', text: '-5.52' }],
    dom: f.ref('audit/fixtures/dom.txt'), capture: f.ref('audit/fixtures/capture.png') }] }
    : { ...common, kind: 'derived-result' };
  f.plan.parts.push(observed ? { id: 'derived', kind: 'observed-behavior', text: fixtureText,
    requiredProofIds: ['derived'], requiredObservations: [transition] }
    : { id: 'derived', kind: 'derived-result', text: fixtureText, requiredProofIds: ['derived'] });
  f.context.catalog.proofs.push(proof); f.sealRun(proof); f.sealReviews();
  return { ...f, derived: proof };
}

describe('authored-local-basis-v1 derivation and offline observation receipts', () => {
  it.each([false, true])('accepts fully bound synthetic derivation/observation, observed=%s', observed => {
    const f = withDerivation(observed);
    expect(() => parseLocalBasisCatalog(f.context.catalog)).not.toThrow();
    expect(f.validate().failures).toEqual([]);
  });
  it.each(['missing-basis', 'wrong-unit', 'wrong-pointer', 'external-substitution'])('rejects input basis defect %s', change => {
    const f = withDerivation(false);
    if (change === 'missing-basis') f.derived.bases.pop();
    if (change === 'wrong-unit') f.derived.bases[0].unit = 'm/s';
    if (change === 'wrong-pointer' && f.derived.bases[0].kind === 'authored-parameter') f.derived.bases[0].pointer = '/phase';
    if (change === 'external-substitution') f.derived.bases[0] = { kind: 'external-source', input: 'weights', partId: 'absent-paper', value: {}, unit: 'dimensionless' };
    f.sealRun(f.derived); f.sealReviews();
    expect(f.validate().failures.join(' ')).toMatch(/basis|unit|external part/);
  });
  it.each(['static-code', 'missing-transition', 'wrong-mount', 'wrong-case', 'wrong-readout', 'wrong-viewport', 'stale-dom', 'stale-run'])('fails unobserved/mismatched behavior %s', change => {
    const f = withDerivation(true);
    if (f.derived.kind !== 'observed-behavior') throw Error('fixture category');
    const observation = f.derived.observations[0];
    if (change === 'static-code') f.derived.provenance.runner = 'node';
    if (change === 'missing-transition') f.derived.observations = [];
    if (change === 'wrong-mount') observation.mountId += '-invented';
    if (change === 'wrong-case') observation.caseId = 'unregistered';
    if (change === 'wrong-readout') { observation.readouts[0].text = '999'; f.put('audit/fixtures/dom.txt', fixtureText + '999'); observation.dom = f.ref('audit/fixtures/dom.txt'); }
    if (change === 'wrong-viewport') observation.viewport.width = 999;
    if (change === 'stale-dom') f.put('audit/fixtures/dom.txt', 'changed DOM');
    if (change !== 'stale-run') f.sealRun(f.derived); else f.derived.provenance.command += ' changed';
    f.sealReviews();
    expect(f.validate().failures.length).toBeGreaterThan(0);
  });
  it('preserves a failing legacy row diagnostic with an empty local catalog', () => {
    const f = fixture(); f.context.catalog = { schemaVersion: 'authored-local-basis-v1', plans: [], proofs: [] };
    const without = parseLedger(f.plan.ledgerPath, f.markdown);
    expect(parseLedger(f.plan.ledgerPath, f.markdown, new Set(), { localBasis: f.context })).toEqual(without);
  });
  it('rejects a wrong file member identity even with unchanged bytes', () => {
    const f = fixture(); f.proof.artifacts[0].id = 'file:wrong-member';
    f.sealRun(f.proof); f.sealReviews();
    expect(f.validate().failures.join(' ')).toMatch(/member selector/);
  });
});

const authoredDefaults: Weights = { velTrack: 1, yawTrack: .5, torque: .8, jointAccel: .5,
  actionRate: .8, jointLimit: 1, collision: 1, baseHeight: .5, orientation: .8,
  airTime: .6, stumble: .8, termination: 1.5 };
function withAuthoredCase(recipe: LocalProof['recipe'], pointers: Record<string, string>) {
  if (recipe.id !== 'reward' && recipe.id !== 'parallel') throw Error('synthetic case recipe');
  const f = fixture(false, recipe.id);
  const units: Record<string, string> = { weights: 'dimensionless', phase: 'cycle',
    envs: 'count', cpuBound: 'boolean', samples: 'count' };
  const proof: LocalProof = { ...f.proof, id: 'case', partId: 'case', kind: 'derived-result',
    recipe, expected: recomputeLocalDerivation(recipe), provenance: { ...f.proof.provenance },
    bases: Object.entries(pointers).map(([input, pointer]) =>
      ({ input, pointer, unit: units[input], kind: 'authored-parameter', proofId: f.proof.id })) };
  const seal = () => {
    f.put('audit/fixtures/case-input.json', JSON.stringify(proof.recipe));
    f.put('audit/fixtures/case-output.json', JSON.stringify(proof.expected));
    proof.input = f.ref('audit/fixtures/case-input.json'); proof.inputDigest = proof.input.sha256;
    proof.output = f.ref('audit/fixtures/case-output.json'); proof.outputDigest = proof.output.sha256;
    f.sealRun(proof); f.sealReviews();
  };
  f.plan.parts.push({ id: 'case', kind: 'derived-result', text: fixtureText, requiredProofIds: [proof.id] });
  f.context.catalog.proofs.push(proof); seal();
  return { ...f, derived: proof, seal };
}

describe('authored-local-basis-v1 compatibility cases', () => {
  function historicalFixture(testName?: 'reward' | 'sim2real' | 'parallel') {
    const f = fixture(true);
    const bind = (path: string, snapshot: string) => {
      const retained = `audit/evidence/local-proof-compat-20260923/${snapshot}`;
      f.put(retained, readFileSync(join(project, retained)));
      const old = { ...f.full(retained), id: `file:${path}`, file: { ...f.ref(retained), path } };
      const index = f.proof.artifacts.findIndex(a => a.file.path === path);
      if (index >= 0) f.proof.artifacts[index] = old;
      else f.proof.artifacts.push(old);
      return old.file;
    };
    bind('lib/audit-local-basis.ts', 'audit-local-basis.pre-portability.ts.txt');
    if (testName) {
      const path = `tests/unit/${testName}-local-evidence.test.ts`;
      f.put(path, readFileSync(join(project, path)));
      f.proof.artifacts = f.proof.artifacts.filter(a => a.file.path !== f.proof.provenance.test.path);
      f.proof.provenance.test = bind(path, `${testName}-local-evidence.pre-portability.test.ts.txt`);
      f.proof.provenance.command = `SYNTHETIC ONLY vitest ${path}`;
    }
    f.sealRun(f.proof); f.sealReviews();
    return f;
  }
  it.each([undefined, 'reward', 'sim2real', 'parallel'] as const)(
    'retains the exact historical checker and reviewed test version: %s', testName => {
      const f = historicalFixture(testName);
      const before = JSON.stringify(f.context.catalog);
      expect(f.validate().failures).toEqual([]);
      expect(JSON.stringify(f.context.catalog)).toBe(before);
      // Generic artifact reads never silently select a historical snapshot.
      const checker = f.proof.artifacts.find(a => a.file.path === 'lib/audit-local-basis.ts')!;
      // The industrial reader also supports exact reviewed historical bindings,
      // but this fixture has no such review, so a generic read must still fail.
      expect(() => createLocalArtifactReader(f.root)(checker.file)).toThrow(/bytes\/hash|ENOENT/);
    },
  );
  it.each(['missing', 'corrupt', 'symlink', 'directory', 'unknown-hash', 'computation', 'context-checker', 'live-model'])(
    'fails closed on historical dependency drift: %s', change => {
      const f = historicalFixture();
      const snapshot = 'audit/evidence/local-proof-compat-20260923/audit-local-basis.pre-portability.ts.txt';
      if (['missing', 'symlink', 'directory'].includes(change)) rmSync(join(f.root, snapshot));
      if (change === 'corrupt') f.put(snapshot, 'corrupt retained checker');
      if (change === 'symlink') symlinkSync(join(project, snapshot), join(f.root, snapshot));
      if (change === 'directory') mkdirSync(join(f.root, snapshot));
      if (change === 'unknown-hash') f.proof.artifacts.find(a => a.file.path === 'lib/audit-local-basis.ts')!.file.sha256 = '0'.repeat(64);
      if (change === 'computation') f.put('lib/audit-local-basis.ts',
        readFileSync(join(project, 'lib/audit-local-basis.ts'), 'utf8').replace('const finite =', 'const finite /* drift */ ='));
      if (change === 'context-checker') f.put('lib/audit-local-basis.ts',
        readFileSync(join(project, 'lib/audit-local-basis.ts'), 'utf8') + '\n// different verifier\n');
      if (change === 'live-model') f.put('lib/gait.ts', 'changed live computation');
      f.sealRun(f.proof); f.sealReviews();
      expect(f.validate().failures.length).toBeGreaterThan(0);
    },
  );
  it.each(['reward', 'sim2real', 'parallel'] as const)('rejects later %s test changes and corrupt test snapshots', testName => {
    const f = historicalFixture(testName);
    const path = f.proof.provenance.test.path;
    const current = readFileSync(join(f.root, path));
    f.put(path, Buffer.concat([current, Buffer.from('\n// unreviewed test edit\n')]));
    expect(f.validate().failures.join(' ')).toContain('unreviewed historical test compatibility');
    f.put(path, current);
    f.put(`audit/evidence/local-proof-compat-20260923/${testName}-local-evidence.pre-portability.test.ts.txt`, 'corrupt');
    expect(f.validate().failures.join(' ')).toMatch(/bytes\/hash/);
  });
  it.each(['relative/path', '/absolute/../noncanonical', '/nul\0path'])('rejects invalid historical cwd %s even with a matching synthetic receipt', cwd => {
    const f = fixture();
    f.proof.provenance.cwd = cwd;
    f.sealRun(f.proof); f.sealReviews();
    expect(f.validate().failures.join(' ')).toContain('failed/missing real execution provenance');
  });
  it.each([
    ['freeze', { torque: 4 }, 'frozen'],
    ['prance', { airTime: 4 }, 'prancing'],
    ['chatter', { actionRate: 0 }, 'chatter'],
    ['dominanceCounterexample', { velTrack: 4, torque: 4 }, 'balanced'],
    ['priorityTie', { torque: 4, airTime: 4 }, 'frozen'],
  ] as const)('binds the entire independently chosen reward %s case', (name, delta, behavior) => {
    const weights = { ...authoredDefaults, ...delta };
    const f = withAuthoredCase({ id: 'reward', mode: 'derive', inputs: { weights, phase: 0 } },
      { weights: `/authoredCases/${name}/weights`, phase: '/phase' });
    expect(f.derived.expected.values).toMatchObject({ behavior });
    expect(parseLocalBasisCatalog(f.context.catalog)).toEqual(f.context.catalog);
    expect(f.validate().failures).toEqual([]);
  });
  it.each([
    [64, false, '/authoredDomains/envs/min', '/cpuBound'],
    [16384, false, '/authoredDomains/envs/max', '/cpuBound'],
    [4096, true, '/envs', '/authoredDomains/cpuBound/on'],
    [64, true, '/authoredDomains/envs/min', '/authoredDomains/cpuBound/on'],
    [16384, true, '/authoredDomains/envs/max', '/authoredDomains/cpuBound/on'],
  ] as const)('binds parallel envs=%s CPU=%s and preserves 49 samples', (envs, cpuBound, envPointer, cpuPointer) => {
    const f = withAuthoredCase({ id: 'parallel', mode: 'derive', inputs: { envs, cpuBound, samples: 49 } },
      { envs: envPointer, cpuBound: cpuPointer, samples: '/samples' });
    const values = f.derived.expected.values as { seconds: number; curve: unknown[]; display: string[] };
    // Independent cost arithmetic: only the CPU variant adds per-environment work.
    const seconds = 220000000 / (envs * 24) * (.02 + envs * .000004 + .04 + .03 + (cpuBound ? envs * .000022 : 0));
    expect(values.seconds).toBeCloseTo(seconds, 10);
    expect(values.curve).toHaveLength(49);
    expect(values.display[0]).toBe(envs.toLocaleString('en-US'));
    expect(f.validate().failures).toEqual([]);
  });
  it.each(['default-pointer', 'partial-object', 'different-plan', 'tampered-parameter', 'changed-input'])('rejects reward case basis defect: %s', mutation => {
    const f = withAuthoredCase({ id: 'reward', mode: 'derive', inputs: { weights: { ...authoredDefaults, torque: 4 }, phase: 0 } },
      { weights: '/authoredCases/freeze/weights', phase: '/phase' });
    const basis = f.derived.bases[0];
    if (basis.kind !== 'authored-parameter') throw Error('synthetic basis');
    if (mutation === 'default-pointer') basis.pointer = '/weights';
    if (mutation === 'partial-object') basis.pointer += '/torque';
    if (mutation === 'different-plan') f.proof.planId = 'another-plan';
    if (mutation === 'changed-input' && f.derived.recipe.id === 'reward' && f.derived.recipe.mode === 'derive') {
      f.derived.recipe.inputs.weights.yawTrack = 4;
      f.derived.expected = recomputeLocalDerivation(f.derived.recipe);
    }
    if (mutation === 'tampered-parameter') {
      f.proof.expected.values = { weights: authoredDefaults, phase: 0, authoredCases: { freeze: { weights: { ...authoredDefaults, torque: 4 } } } };
      f.put('audit/fixtures/output.json', JSON.stringify(f.proof.expected));
      f.proof.output = f.ref('audit/fixtures/output.json'); f.proof.outputDigest = f.proof.output.sha256; f.sealRun(f.proof);
    }
    f.seal();
    expect(f.validate().failures.join(' ')).toMatch(/input basis|recomputed|missing or extra/);
  });
  it('does not treat the parallel false default as an authored true basis', () => {
    const f = withAuthoredCase({ id: 'parallel', mode: 'derive', inputs: { envs: 64, cpuBound: true, samples: 49 } },
      { envs: '/authoredDomains/envs/min', cpuBound: '/cpuBound', samples: '/samples' });
    expect(f.validate().failures.join(' ')).toMatch(/basis mismatch/);
  });
  it.each(['envs', 'samples'] as const)('rejects changed parallel %s despite a rehashed correct derivation', input => {
    const f = withAuthoredCase({ id: 'parallel', mode: 'derive', inputs: { envs: 64, cpuBound: true, samples: 49 } },
      { envs: '/authoredDomains/envs/min', cpuBound: '/authoredDomains/cpuBound/on', samples: '/samples' });
    if (f.derived.recipe.id !== 'parallel' || f.derived.recipe.mode !== 'derive') throw Error('synthetic recipe');
    f.derived.recipe.inputs[input] = input === 'envs' ? 128 : 3;
    f.derived.expected = recomputeLocalDerivation(f.derived.recipe); f.seal();
    expect(f.validate().failures.join(' ')).toMatch(/authored input basis mismatch/);
  });
  const unrelated = '\n## unrelated.mdx\n| Claim | Source checked | Verdict |\n| --- | --- | --- |\n| SYNTHETIC | source | V | extra unheaded cell |\n';
  it('selects only the unique original section after hashing the whole raw snapshot', () => {
    const f = fixture();
    const raw = '# Whole historical fixture\r\n' + unrelated + '\n' + f.markdown + unrelated.replace('unrelated.mdx', 'other.mdx');
    expect(() => parseLedger(f.plan.ledgerPath, raw)).toThrow(/extra.*cells/);
    f.put('audit/fixtures/original.md', raw);
    f.plan.originalBinding.snapshot = f.ref('audit/fixtures/original.md'); f.sealReviews();
    expect(f.validate().failures).toEqual([]);
    // Drift outside the selected section must still invalidate the whole snapshot.
    f.put('audit/fixtures/original.md', raw.replace('extra unheaded cell', 'changed unrelated cell'));
    expect(f.validate().failures.join(' ')).toMatch(/artifact bytes\/hash/);
  });
  it.each(['absent', 'duplicate', 'continued', 'suffixed', 'ordinal', 'cells', 'malformed-selected'])('rejects original section defect: %s', mutation => {
    const f = fixture();
    let raw = f.markdown;
    if (mutation === 'absent') raw = raw.replace('reward-design-mpc.mdx', 'absent.mdx');
    if (mutation === 'duplicate') raw += '\n' + f.markdown.replaceAll('synthetic-local', '');
    if (mutation === 'continued') raw += '\n' + f.markdown.replaceAll('synthetic-local', '').replace('reward-design-mpc.mdx', 'reward-design-mpc.mdx (continued)');
    if (mutation === 'suffixed') raw += '\n' + f.markdown.replaceAll('synthetic-local', '').replace('reward-design-mpc.mdx', 'reward-design-mpc.mdx (historical copy)');
    if (mutation === 'ordinal') raw = raw.slice(0, raw.lastIndexOf('\n'));
    if (mutation === 'cells') raw = raw.replaceAll(f.currentCells.claim, 'SYNTHETIC different original');
    if (mutation === 'malformed-selected') raw += ' extra unheaded cell |';
    f.put('audit/fixtures/original.md', raw);
    f.plan.originalBinding.snapshot = f.ref('audit/fixtures/original.md'); f.sealReviews();
    expect(f.validate().failures.join(' ')).toMatch(/original.*(?:section|snapshot)|extra.*cells/);
  });
});
