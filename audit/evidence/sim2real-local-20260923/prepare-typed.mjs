// Bind actual retained executions. This step does not perform adjudication.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { originalClaimDigest } from '../../../lib/audit-ledger.ts';
import { parseLocalBasisCatalog } from '../../../lib/audit-local-basis.ts';
import { ARTICLE, DIRECTORY, BROWSER, artifact, member, save, sha } from './typed-support.ts';

const MISSION = '/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const packetPath = `${MISSION}/convergence-first-ten-originals-20260923/bindings.json`;
assert.equal(sha(fs.readFileSync(packetPath)), '3fcaaa8b866268238b134390fc3b73eebfbf6afa07b0ed0cb3ec22818b00cb0c');
const bindings = read(packetPath).rows.filter(r => [23, 24].includes(r.rowOrdinal) && r.originalId.includes(':sim2real-transfer:'));
assert.equal(bindings.length, 2);
if (fs.existsSync(`${DIRECTORY}/selected-bindings.json`)) assert.deepEqual(read(`${DIRECTORY}/selected-bindings.json`), bindings);
else save('selected-bindings.json', bindings);
const numeric = read(`${DIRECTORY}/numeric-run-sealed.json`);
const browser = read(`${DIRECTORY}/browser-run-native.json`);
const sourceProvenance = read(`${DIRECTORY}/source-provenance.json`).sources;
const registry = read('contract/brand-v2-registries.json').interactive;
for (const dependency of browser.dependencies) assert.equal(artifact(dependency.path).sha256, dependency.sha256, `Browser dependency changed: ${dependency.path}`);
for (const source of sourceProvenance) {
  assert.equal(sha(fs.readFileSync(source.savedPath)), source.sha256);
}
const browserReceipt = read(`${MISSION}/convergence-sim2real-local-integration-20260923/command-receipts.json`)
  .find(r => r.command.includes('playwright-native') && r.exitCode === 0);
assert(browserReceipt);
const browserRun = {
  command: browserReceipt.command, runner: 'playwright', cwd: process.cwd(),
  environment: { NODE_DISABLE_COMPILE_CACHE: '1' }, startedAt: browser.startedAt,
  endedAt: browser.completedAt, exitCode: 0, test: artifact(BROWSER),
};
const browserDependencies = browser.dependencies.map(d => member(d.path));
const text = fs.readFileSync(ARTICLE, 'utf8');
const between = (body, start, end) => {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, `Missing boundaries ${start}`);
  return body.slice(from, to).trimEnd();
};
const disclosures = {
  23: between(text, 'Both curves and every plotted success value', ' <span className="max-sm:[&_[data-cite-id=tobin-2017]'),
  24: between(text, 'The panel below is an authored toy', '\n\n<TeacherStudent'),
};
const current = {
  23: {
    claim: 'FrictionTransfer uses authored Gaussian/plateau curves and rounded local arithmetic, with observed ordinary and prediction mounts that reset to half-widths 0.35 and 0.65 respectively.',
    sourceChecked: 'Retained Tobin v1, Peng v3, Rubik ADR v1 and Isaac Lab v1 full bodies with original September 8 retrieval provenance; actual September 23 independent numeric and both-mount browser observations.',
    verdict: 'C',
    note: 'Corrected to explicit typed external AND local support, not empirical specialist/generalist measurements. Visual/dynamics framing, performance-threshold ADR and CPU parameter writes with runtime/mesh exceptions remain separate external obligations. All plotted values and ranges are chosen; Gaussian tails and percentage rounding are recomputed. Both actual mounts, reveal and distinct Reset defaults are retained. Original cells and source snapshot are archived unchanged. Historical retrieval is not current liveness; not independent acceptance.',
  },
  24: {
    claim: 'TeacherStudent draws authored terrain/noise and a directly constructed reconstruction; normalized discrepancy is 2.2 times unrounded MAE, with observed degradation 0.15-to-1-to-0 and Reset.',
    sourceChecked: 'Retained Lee unversioned ar5iv body and Isaac Lab v1 body with original September 8 retrieval events; actual September 23 independent per-cell calculations and mounted teacher observations.',
    verdict: 'C',
    note: 'The empirical cost-of-distillation and universal training-budget-floor interpretation is corrected, not verified. Lee supports privileged versus deployable proprioceptive inputs; Isaac Lab supports input-mismatch/occlusion context, not these coefficients. Terrain, seeds, blur, noise/dropout and 2.2 scaling are authored. Reconstruction is computed from the map plus errors, not inferred from the bars; darker cells are higher. Original four cells remain in history. All external AND local obligations remain; no policy training, new retrieval or independent acceptance.',
  },
};
const plans = [];
const proofs = [];
const extracted = id => numeric.cases.find(c => c.id === id);
const transition = (component, ordinal, caseId, prestate, action, poststate) => ({
  mountId: `mount:/rl-sim2real/sim2real-transfer/:${component}:${ordinal}`,
  caseId, prestate, action, poststate,
});
const observed = {
  'friction-default': transition('FrictionTransfer', 1, 'default', 'Article not loaded', 'Navigate to the article', 'mu 0.80, range 0.35; point 97%, DR 74%'),
  'friction-far': transition('FrictionTransfer', 1, 'slider-boundaries-and-anchors', 'mu 0.80, range 0.35', 'Set real friction slider to 1.50', 'Line moves to 1.50; point 0%, DR 0%'),
  'friction-wide': transition('FrictionTransfer', 1, 'slider-boundaries-and-anchors', 'mu 1.50, range 0.35', 'Set friction 0.80 then half-width 0.65', 'DR curve redraws; point 97%, DR 57%'),
  'friction-reset': transition('FrictionTransfer', 1, 'reset', 'mu 0.80, range 0.65', 'Activate ordinary Reset', 'mu 0.80, range 0.35; point 97%, DR 74%; original SVG'),
  'reveal-default': transition('FrictionTransfer', 2, 'default', 'Prediction details closed', 'Choose the authored plateau-falls prediction radio', 'Prediction mount visible at mu 0.80, range 0.65; point 97%, DR 57%'),
  'reveal-changed': transition('FrictionTransfer', 2, 'slider-boundaries-and-anchors', 'Prediction mu 0.80, range 0.65', 'Set prediction friction 1.50 then half-width 0.35', 'Prediction line and curve change; point 0%, DR 0%'),
  'reveal-reset': transition('FrictionTransfer', 2, 'reset', 'Prediction mu 1.50, range 0.35', 'Activate prediction Reset', 'Prediction restores mu 0.80, range 0.65 and 57% DR; ordinary half-width remains 0.35'),
  'teacher-default': transition('TeacherStudent', 1, 'default', 'Article loaded; teacher unchanged', 'Read initial teacher mount', 'Degradation 0.15; MAE 0.01 m; discrepancy 0.02; 3/24 occluded'),
  'teacher-high': transition('TeacherStudent', 1, 'slider-boundaries-and-anchors', 'Degradation 0.15', 'Set degradation to 1', 'MAE 0.17 m; discrepancy 0.38; 24/24 occluded; input and reconstruction change'),
  'teacher-zero': transition('TeacherStudent', 1, 'slider-boundaries-and-anchors', 'Degradation 1', 'Set degradation to 0', 'MAE 0.00 m; discrepancy 0.00; no occlusion; reconstructed colors equal teacher'),
  'teacher-reset': transition('TeacherStudent', 1, 'reset', 'Degradation 0', 'Activate teacher Reset', 'Degradation 0.15, original input/reconstruction markup; MAE 0.01 m and discrepancy 0.02'),
};
function captured(name) {
  const o = browser.observations.find(o => o.name === name);
  assert(o);
  const { png, dom, pngSha256, domSha256 } = o.artifact;
  assert.equal(artifact(png).sha256, pngSha256);
  assert.equal(artifact(dom).sha256, domSha256);
  const readouts = name.startsWith('teacher')
    ? [{ selector: '[data-testid="mae-readout"]', text: o.expected.maeDisplay }, { selector: '[data-testid="divergence-readout"]', text: o.expected.divergenceDisplay }]
    : [{ selector: '[data-testid="real-mu-readout"]', text: o.input.mu.toFixed(2) }, { selector: '[data-testid="point-readout"]', text: o.point }, { selector: '[data-testid="dr-readout"]', text: o.dr }];
  return { ...observed[name], viewport: { width: 1440, height: 1000 }, readouts, dom: artifact(dom), capture: artifact(png) };
}
function source(partId, citationId, start, end) {
  const p = sourceProvenance.find(s => s.citationId === citationId);
  const path = p.savedPath.slice(process.cwd().length + 1);
  const body = fs.readFileSync(path, 'utf8');
  const supportingPassage = between(body, start, end);
  return { partId, citationId, sourceUrl: p.sourceUrl, supportingPassage,
    provenance: { retrievedAt: p.retrievedAt, tool: citationId === 'isaac-lab-2025'
      ? 'Retained original versioned GET body/receipt/headers, hash verified; no new request'
      : 'Retained FetchUrl full-body representation, exact original capture/event verified; no new request',
    response: artifact(path), passage: member(path, supportingPassage) } };
}
for (const binding of bindings) {
  const n = binding.rowOrdinal;
  const family = n === 23 ? 'friction' : 'teacher';
  const component = n === 23 ? 'FrictionTransfer' : 'TeacherStudent';
  const registered = registry.sources.find(s => s.id === `interactive:${component}`);
  const plan = {
    id: `sim2real-local-s${n}-20260923`, kind: 'explicit-parts-v2', originalId: binding.originalId,
    ledgerPath: 'audit/rl-sim2real.md', articleSlug: 'sim2real-transfer', rowOrdinal: n,
    originalBinding: { ...binding.originalBinding, snapshot: artifact(`${DIRECTORY}/original-rl-sim2real.md`) },
    currentCells: current[n], currentTupleDigest: originalClaimDigest(current[n]),
    mounts: registry.mounts.filter(m => m.route === '/rl-sim2real/sim2real-transfer/' && m.sourceId === registered.id)
      .map(m => ({ sourceId: registered.id, sourceFingerprint: registered.fingerprint, mountId: m.id, mountFingerprint: m.fingerprint, route: m.route })),
    disclosure: { member: member(ARTICLE, disclosures[n]), text: disclosures[n] },
    parts: [], evidence: [], planReview: null, adjudications: [],
  };
  const addPart = (id, kind, required, names = []) => {
    const prepared = binding.parts.find(p => p.id === id || id.startsWith(`${p.id}-`));
    assert(prepared && prepared.kind === kind);
    plan.parts.push({ id, kind, text: prepared.text,
      ...(kind === 'external-source' ? { requiredCitationIds: required } : { requiredProofIds: required }),
      ...(kind === 'observed-behavior' ? { requiredObservations: names.map(name => observed[name]) } : {}) });
  };
  function addProof(id, partId, kind, dataId, names = []) {
    const data = extracted(dataId);
    assert(data);
    const isObserved = kind === 'observed-behavior';
    const run = isObserved ? browserRun : numeric;
    const dependencies = isObserved ? browserDependencies.map(m => {
      const d = { ...m };
      if (d.file.path.startsWith('components/') && d.file.path !== registered.sourcePath) {
        d.id = `file:${d.file.path}`; delete d.baseline;
      }
      return d;
    }) : data.dependencies;
    for (const d of dependencies) assert.equal(artifact(d.file.path).sha256, d.file.sha256);
    const observations = names.map(name => {
      const raw = browser.observations.find(o => o.name === name);
      assert.deepEqual(raw.input, data.recipe.inputs);
      const display = data.expected.values.display;
      if (family === 'friction') assert.deepEqual([raw.input.mu.toFixed(2), raw.point, raw.dr], display);
      else assert.deepEqual([raw.expected.maeDisplay, raw.expected.divergenceDisplay], display);
      return captured(name);
    });
    const input = save(`native-${id}.input.json`, data.recipe);
    const output = save(`native-${id}.output.json`, data.expected);
    const provenance = { command: run.command, runner: run.runner, cwd: process.cwd(), environment: run.environment,
      startedAt: run.startedAt, endedAt: run.endedAt, exitCode: 0, test: run.test };
    const receipt = save(`native-${id}.receipt.json`, { schemaVersion: 'local-run-v1', ...provenance,
      inputDigest: input.sha256, outputDigest: output.sha256, dependencies, observations });
    const bases = [];
    if (kind !== 'authored-parameter') {
      const params = data.recipe.inputs;
      const add = (input, pointer) => bases.push({ input, kind: 'authored-parameter', proofId: `s${n}-parameters`, pointer, unit: 'dimensionless' });
      if (family === 'friction') {
        add('mu', params.mu === 0.8 ? '/mu' : '/muRange/1');
        add('range', params.range === 0.35 ? '/range' : '/drRange/1');
      } else add('degradation', params.degradation === 0.15 ? '/degradation' : `/range/${params.degradation}`);
    }
    proofs.push({ id, planId: plan.id, partId, originalId: plan.originalId,
      originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
      kind, artifacts: dependencies, disclosure: plan.disclosure, recipe: data.recipe, expected: data.expected,
      input, output, inputDigest: input.sha256, outputDigest: output.sha256, provenance: { ...provenance, receipt }, bases,
      ...(isObserved ? { observations } : {}) });
  }
  if (n === 23) {
    for (const [id, citation] of [['s23-tobin-framing', 'tobin-2017'], ['s23-peng-framing', 'peng-2018'], ['s23-adr', 'openai-rubiks-cube-2019'], ['s23-isaac-plumbing', 'isaac-lab-2025']]) addPart(id, 'external-source', [citation]);
    plan.evidence.push(
      source('s23-tobin-framing', 'tobin-2017', 'Bridging the', '\nTo demonstrate'),
      source('s23-peng-framing', 'peng-2018', '## IV METHOD', '### IV-DAdaptive Policy'),
      source('s23-adr', 'openai-rubiks-cube-2019', 'Acceptable performance is defined', '\nAlgorithm 1 ADR'),
      source('s23-isaac-plumbing', 'isaac-lab-2025', '<p id="S5.SS3.p2.1"', '\n</div>\n</section>'),
    );
    addPart('s23-curves-and-mount-defaults', 'authored-parameter', ['s23-parameters']);
    addPart('s23-arithmetic', 'derived-result', ['s23-default', 's23-wide', 's23-tail']);
    for (const [state, names] of [['default', ['friction-default', 'friction-reset']], ['wide', ['friction-wide', 'reveal-default', 'reveal-reset']], ['tail', ['friction-far', 'reveal-changed']]]) addPart(`s23-both-mounted-panels-${state}`, 'observed-behavior', [`s23-observed-${state}`], names);
    addProof('s23-parameters', 's23-curves-and-mount-defaults', 'authored-parameter', 's23-parameters');
    for (const id of ['s23-default', 's23-wide', 's23-tail']) addProof(id, 's23-arithmetic', 'derived-result', id);
    addProof('s23-observed-default', 's23-both-mounted-panels-default', 'observed-behavior', 's23-default', ['friction-default', 'friction-reset']);
    addProof('s23-observed-wide', 's23-both-mounted-panels-wide', 'observed-behavior', 's23-wide', ['friction-wide', 'reveal-default', 'reveal-reset']);
    addProof('s23-observed-tail', 's23-both-mounted-panels-tail', 'observed-behavior', 's23-tail', ['friction-far', 'reveal-changed']);
  } else {
    addPart('s24-privileged-context', 'external-source', ['lee-2020']);
    addPart('s24-input-mismatch', 'external-source', ['isaac-lab-2025']);
    plan.evidence.push(
      source('s24-privileged-context', 'lee-2020', '### 4.1 Overview', '### Motion synthesis'),
      source('s24-input-mismatch', 'isaac-lab-2025', '<p id="S5.SS1.SSS2.p1.1"', '\n</div>'),
    );
    addPart('s24-authored-terrain-noise', 'authored-parameter', ['s24-parameters']);
    addPart('s24-reconstruction', 'derived-result', ['s24-zero', 's24-default', 's24-high']);
    for (const [state, names] of [['default', ['teacher-default', 'teacher-reset']], ['zero', ['teacher-zero']], ['high', ['teacher-high']]]) addPart(`s24-mounted-degradation-${state}`, 'observed-behavior', [`s24-observed-${state}`], names);
    addProof('s24-parameters', 's24-authored-terrain-noise', 'authored-parameter', 's24-parameters');
    for (const id of ['s24-zero', 's24-default', 's24-high']) addProof(id, 's24-reconstruction', 'derived-result', id);
    addProof('s24-observed-default', 's24-mounted-degradation-default', 'observed-behavior', 's24-default', ['teacher-default', 'teacher-reset']);
    addProof('s24-observed-zero', 's24-mounted-degradation-zero', 'observed-behavior', 's24-zero', ['teacher-zero']);
    addProof('s24-observed-high', 's24-mounted-degradation-high', 'observed-behavior', 's24-high', ['teacher-high']);
  }
  plans.push(plan);
}
const catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans, proofs });
save('native-catalog-draft.json', catalog);
save('native-typed-assembly-provenance.json', {
  assembledAt: new Date().toISOString(), newReviews: 0, source: artifact(`${DIRECTORY}/source-provenance.json`),
  numericalRun: artifact(`${DIRECTORY}/numeric-run-sealed.json`), browserRun: artifact(`${DIRECTORY}/browser-run-native.json`),
  browserDependenciesMatched: true, browserExecutionRepeated: true,
  qualification: 'Final receipts bind the actual fresh numeric run and desktop-only browser run after the explicit authored-toy disclosure change. All earlier raw runs and draft artifacts remain unchanged. Exact displayed values are checked against native recipe output; receipt assembly time is distinct from actual execution timestamps.',
});
console.log(JSON.stringify({ plans: plans.length, parts: plans.map(p => p.parts.length), proofs: proofs.length, sourcePairs: plans.flatMap(p => p.evidence).length, reviews: 0 }));
