// Bind genuine executions and retained sources; no review is pre-certified.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { originalClaimDigest } from '../../../lib/audit-ledger.ts';
import { parseLocalBasisCatalog, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { CITATIONS } from '../../../data/citations.ts';
import { ARTICLE, COMPONENT, DIRECTORY, ROUTE, artifact, member, save } from './support.ts';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const binding = read(`${DIRECTORY}/selected-binding.json`);
const numeric = read(`${DIRECTORY}/numeric-run.json`);
const browser = read(`${DIRECTORY}/browser-run.json`);
const sources = read(`${DIRECTORY}/source-provenance.json`).sources;
const registry = read('contract/brand-v2-registries.json').interactive;
const registered = registry.sources.find(s => s.sourcePath === COMPONENT);
assert(registered);
for (const source of sources) assert.equal(artifact(source.savedPath).sha256, source.sha256);
for (const run of [numeric, browser]) {
  assert.equal(run.exitCode, 0);
  assert.equal(artifact(run.test.path).sha256, run.test.sha256);
}
const currentCells = {
  claim: 'TrainingTimeChart uses a chosen fixed budget, cost buckets and49-point log grid, not an empirical learning curve; actual environment/CPU controls, formatted readouts, bound markers and Reset are evidenced.',
  sourceChecked: 'Retained Rudin full ar5iv response (September6) and Isaac Lab v1 body (September8), original retrieval provenance verified; actual September23 independent arithmetic and mounted observations.',
  verdict: 'C',
  note: 'The220-million-transition budget, cost constants, sample grid and flat-marker x are authored. Rudin flat under-four-minute and separate4096/98304/1500-update under20-minute workstation protocol remain external;24 rollout steps follows98304/4096 and is also a chosen toy input. Isaac Lab headless >900k/>1.6M environment-learning FPS, eight RTX PRO6000 GPUs/16384 envs and task-specific CPU/hardware comparison remain required external parts, not notes-only exemptions. Seven original obligations survive; observed subparts partition six input combinations with actual default/reset/mobile observations. Original cells and selected retired legacy plan remain unchanged in history. No empirical calibration validation, new retrieval, current liveness or independent acceptance.',
};
const text = fs.readFileSync(ARTICLE, 'utf8');
const start = text.indexOf('This authored fixed-transitions model is not a benchmark.');
const disclosure = text.slice(start, text.indexOf('\n\n', start));
assert(start >= 0 && disclosure.includes('49 logarithmically spaced'));
const plan = {
  id: 'parallel-local-p18-20260923', kind: 'explicit-parts-v2',
  originalId: binding.originalId, ledgerPath: 'audit/rl-sim2real.md', articleSlug: 'parallel-sim-rl', rowOrdinal: 18,
  originalBinding: { ...binding.originalBinding, snapshot: artifact(`${DIRECTORY}/original-rl-sim2real.md`) },
  currentCells, currentTupleDigest: originalClaimDigest(currentCells),
  mounts: registry.mounts.filter(m => m.route === ROUTE && m.sourceId === registered.id).map(m => ({
    sourceId: registered.id, sourceFingerprint: registered.fingerprint, mountId: m.id, mountFingerprint: m.fingerprint, route: m.route,
  })),
  disclosure: { member: member(ARTICLE, disclosure), text: disclosure },
  parts: [], evidence: [], planReview: null, adjudications: [],
};
const proofs = [];
for (const p of binding.parts.filter(p => p.kind === 'external-source')) {
  const citationId = p.id.includes('rudin') ? 'rudin-2021' : 'isaac-lab-2025';
  plan.parts.push({ id: p.id, kind: p.kind, text: p.text, requiredCitationIds: [citationId] });
}
for (const passage of read(`${DIRECTORY}/source-passages.json`)) {
  const source = sources.find(s => s.citationId === passage.citationId);
  const path = source.savedPath.slice(process.cwd().length + 1);
  plan.evidence.push({ partId: passage.partId, citationId: source.citationId, sourceUrl: source.sourceUrl,
    supportingPassage: passage.text, provenance: { retrievedAt: source.retrievedAt,
      tool: source.citationId === 'rudin-2021'
        ? 'Original retained FetchUrl unversioned ar5iv full response; byte-equal to original capture; no new request or body revision pin'
        : 'Original retained versioned GET body/receipt; byte-equal to original body; no new request',
      response: artifact(path), passage: member(path, passage.text) } });
}
plan.parts.push({
  id: 'p18-authored-cost-model', kind: 'authored-parameter',
  text: binding.parts.find(p => p.id === 'p18-authored-cost-model').text,
  requiredProofIds: ['p18-parameters'],
}, {
  id: 'p18-cost-arithmetic', kind: 'derived-result',
  text: binding.parts.find(p => p.id === 'p18-cost-arithmetic').text,
  requiredProofIds: numeric.cases.filter(c => c.recipe.mode === 'derive').map(c => c.id),
});
function addProof(id, partId, kind, data, names = []) {
  const run = kind === 'observed-behavior' ? browser : numeric;
  const recordedDependencies = kind === 'observed-behavior' ? browser.dependencies : data.dependencies;
  for (const d of recordedDependencies) assert.equal(artifact(d.file.path).sha256, d.file.sha256);
  // Optional top-level runtime metadata stays in the raw run/provenance,
  // not in the closed source-member schema. All native required source inputs remain.
  const dependencies = recordedDependencies.filter(d => /^(audit|lib|content|components|tests|contract)\//.test(d.file.path));
  for (const d of dependencies) assert.equal(artifact(d.file.path).sha256, d.file.sha256);
  const observations = names.map(name => {
    const o = browser.observations.find(o => o.name === name);
    assert.deepEqual(o.input, data.recipe.inputs);
    assert.equal(artifact(o.dom.path).sha256, o.dom.sha256);
    assert.equal(artifact(o.capture.path).sha256, o.capture.sha256);
    const { mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture } = o;
    return { mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture };
  });
  const input = save(`bound-${id}.input.json`, data.recipe);
  const output = save(`bound-${id}.output.json`, data.expected);
  const provenance = { command: run.command, runner: run.runner, cwd: run.cwd, environment: run.environment,
    startedAt: run.startedAt, endedAt: run.endedAt, exitCode: run.exitCode, test: run.test };
  const receipt = save(`bound-${id}.receipt.json`, { schemaVersion: 'local-run-v1', ...provenance,
    inputDigest: input.sha256, outputDigest: output.sha256, dependencies, observations });
  const bases = [];
  if (data.recipe.mode === 'derive') {
    const { envs, cpuBound } = data.recipe.inputs;
    for (const [input, pointer, unit] of [
      ['envs', envs === 4096 ? '/envs' : `/authoredDomains/envs/${envs === 64 ? 'min' : 'max'}`, 'count'],
      ['cpuBound', `/authoredDomains/cpuBound/${cpuBound ? 'on' : 'off'}`, 'boolean'],
      ['samples', '/samples', 'count'],
    ]) bases.push({ input, kind: 'authored-parameter', proofId: 'p18-parameters', pointer, unit });
  }
  proofs.push({ id, planId: plan.id, partId, originalId: plan.originalId,
    originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
    kind, artifacts: dependencies, disclosure: plan.disclosure, recipe: data.recipe, expected: data.expected,
    input, output, inputDigest: input.sha256, outputDigest: output.sha256,
    provenance: { ...provenance, receipt }, bases, ...(kind === 'observed-behavior' ? { observations } : {}) });
}
for (const data of numeric.cases) addProof(data.id,
  data.recipe.mode === 'parameters' ? 'p18-authored-cost-model' : 'p18-cost-arithmetic',
  data.recipe.mode === 'parameters' ? 'authored-parameter' : 'derived-result', data);
for (const [envs, on, names] of [
  [64, false, ['min-off']], [64, true, ['min-on']],
  [4096, false, ['default', 'reset', 'mobile-default']], [4096, true, ['default-on']],
  [16384, false, ['max-off']], [16384, true, ['max-on']],
]) {
  const suffix = `${envs}-${on ? 'on' : 'off'}`;
  const id = `p18-observed-${suffix}`;
  const partId = `p18-mounted-${suffix}`;
  const observations = names.map(n => browser.observations.find(o => o.name === n));
  plan.parts.push({ id: partId, kind: 'observed-behavior',
    text: `The actual mounted chart at${envs} environments with CPU${on ? 'on' : 'off'} displays the independently recomputed wall time, throughput, iterations, bucket shares and49-point curve. ${names.includes('reset') ? 'Default, Reset and375px viewport retain default4096/CPU-off state.' : 'The named slider/toggle action reaches this state.'} Both Rudin markers retain separate bound labels; all sibling input combinations remain required.`,
    requiredProofIds: [id], requiredObservations: observations.map(({ mountId, caseId, prestate, action, poststate }) => ({ mountId, caseId, prestate, action, poststate })) });
  addProof(id, partId, 'observed-behavior', numeric.cases.find(c => c.id === `p18-${suffix}`), names);
}
const catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans: [plan], proofs });
save('bound-catalog-draft.json', catalog);
save('bound-assembly-provenance.json', { assembledAt: new Date().toISOString(), newReviews: 0,
  verifiedAdditionalRuntimeMetadata: browser.dependencies.filter(d => !/^(audit|lib|content|components|tests|contract)\//.test(d.file.path)),
  numericalRun: artifact(`${DIRECTORY}/numeric-run.json`), browserRun: artifact(`${DIRECTORY}/browser-run.json`),
  source: artifact(`${DIRECTORY}/source-provenance.json`), qualification: 'Exact original source identity and actual run dependencies verified; no semantic review pre-certified.' });
const validation = validateLocalBasisPlan(plan, plan.currentCells, plan.id, { citationId: '', sourceUrl: '', supportingPassage: '' },
  new Set(CITATIONS.map(c => c.id)), { root: process.cwd(), catalog, registry, publishedRoutes: [ROUTE] });
console.log(JSON.stringify({ parts: plan.parts.length, proofs: proofs.length, sources: plan.evidence.length, failuresBeforeActualReview: validation.failures }, null, 2));
