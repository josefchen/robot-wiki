// Assemble genuine executions and retained source bytes; review remains pending.
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
const source = read(`${DIRECTORY}/source-provenance.json`);
const registry = read('contract/brand-v2-registries.json').interactive;
const registered = registry.sources.find(s => s.sourcePath === COMPONENT);
assert(registered);
assert.equal(artifact(source.savedText).sha256, source.source.representation.sha256);
assert.equal(artifact(source.savedBody).sha256, source.originalProvenance.bodySha256);
for (const run of [numeric, browser]) {
  assert.equal(run.exitCode, 0);
  assert.equal(artifact(run.test.path).sha256, run.test.sha256);
}
const currentCells = {
  claim: 'DeploymentEconomics robotCost is an authored80000 USD example with chosen20000..250000 range/5000 step, not an EVST arm-price quote; complete-cell vendor context, all seven model inputs, capital-only arithmetic and actual mounted controls are separately evidenced.',
  sourceChecked: 'EVST July15,2026 complete-cell guide: verified retained September6 readable text and raw HTML with original provenance; actual September23 independent economics calculations and mounted default/endpoints/Reset.',
  verdict: 'C',
  note: 'The first historical Unresolved original and every prior current cell are preserved verbatim in non-counted history. EVST states no fixed list prices and complete-cell bands; its third-to-half arm share and multi-shift12..24/single-shift24..36-month guidance are vendor context, not certificates for chosen80000,2.5 or24. All defaults, ranges,730hours/month and60-month amortization are authored. Cost/pick is capital-only modeled output; no operating costs or financial forecast. Hourly throughput includes downtime and is labelled per elapsed hour. All five original obligations survive; the mounted obligation is partitioned by three prices. No new fetch, current-liveness claim, other industrial-row promotion or independent acceptance.',
};
const article = fs.readFileSync(ARTICLE, 'utf8');
const start = article.indexOf('This calculator is an authored worked example');
const disclosure = article.slice(start, article.indexOf('\n\n', start));
assert(start >= 0 && disclosure.includes('chosen 24-month'));
const plan = {
  id: 'economics-local-i52-20260923', kind: 'explicit-parts-v2',
  originalId: binding.originalId, ledgerPath: 'audit/data-hardware.md', articleSlug: 'industrial-deployment', rowOrdinal: 52,
  originalBinding: { ...binding.originalBinding, snapshot: artifact(`${DIRECTORY}/original-data-hardware.md`) },
  currentCells, currentTupleDigest: originalClaimDigest(currentCells),
  mounts: registry.mounts.filter(m => m.route === ROUTE && m.sourceId === registered.id).map(m => ({
    sourceId: registered.id, sourceFingerprint: registered.fingerprint, mountId: m.id, mountFingerprint: m.fingerprint, route: m.route,
  })),
  disclosure: { member: member(ARTICLE, disclosure), text: disclosure },
  parts: [], evidence: [], planReview: null, adjudications: [],
};
for (const p of binding.parts.filter(p => p.kind === 'external-source')) {
  plan.parts.push({ id: p.id, kind: p.kind, text: p.text, requiredCitationIds: ['evst-cell-cost-2026'] });
}
for (const p of read(`${DIRECTORY}/source-passages.json`)) {
  plan.evidence.push({ partId: p.partId, citationId: 'evst-cell-cost-2026', sourceUrl: source.source.sourceUrl,
    supportingPassage: p.text, provenance: {
      retrievedAt: source.originalProvenance.originalFetchWindow.result,
      tool: 'Preserved September6 curl response, final status200 only; readable text derived from retained raw HTML, both hashes verified. No headers/redirect-chain proof or current request. September23 semantic review is not retrieval.',
      response: artifact(source.savedText), passage: member(source.savedText, p.text),
    } });
}
plan.parts.push({
  id: 'i52-authored-price-and-inputs', kind: 'authored-parameter',
  text: binding.parts.find(p => p.id === 'i52-authored-price-and-inputs').text,
  requiredProofIds: ['i52-parameters'],
}, {
  id: 'i52-price-arithmetic', kind: 'derived-result',
  text: binding.parts.find(p => p.id === 'i52-price-arithmetic').text,
  requiredProofIds: numeric.cases.filter(c => c.recipe.mode === 'derive').map(c => c.id),
});
const proofs = [];
const units = { robotCost: 'USD', integrationMultiple: 'dimensionless', cycleTimeSeconds: 's', uptimePercent: '%',
  successRatePercent: '%', jamClearSeconds: 's', wageUsdPerHour: 'USD/hour' };
function addProof(id, partId, kind, data, names = []) {
  const run = kind === 'observed-behavior' ? browser : numeric;
  const recorded = kind === 'observed-behavior' ? browser.dependencies : data.dependencies;
  for (const d of recorded) assert.equal(artifact(d.file.path).sha256, d.file.sha256);
  const dependencies = recorded.filter(d => /^(audit|lib|content|components|tests|contract)\//.test(d.file.path));
  const observations = names.map(name => {
    const o = browser.observations.find(o => o.name === name);
    assert.deepEqual(o.input, data.recipe.inputs);
    assert.equal(artifact(o.dom.path).sha256, o.dom.sha256);
    assert.equal(artifact(o.capture.path).sha256, o.capture.sha256);
    const { mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture } = o;
    return { mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture };
  });
  const input = save(`${id}.input.json`, data.recipe);
  const output = save(`${id}.output.json`, data.expected);
  const provenance = { command: run.command, runner: run.runner, cwd: run.cwd, environment: run.environment,
    startedAt: run.startedAt, endedAt: run.endedAt, exitCode: run.exitCode, test: run.test };
  const receipt = save(`${id}.receipt.json`, { schemaVersion: 'local-run-v1', ...provenance,
    inputDigest: input.sha256, outputDigest: output.sha256, dependencies, observations });
  const bases = data.recipe.mode === 'derive' ? Object.entries(data.recipe.inputs).map(([input, value]) => ({
    input, kind: 'authored-parameter', proofId: 'i52-parameters',
    pointer: input === 'robotCost' && value !== 80000 ? `/ranges/robotCost/${value === 20000 ? 'min' : 'max'}` : `/${input}`,
    unit: units[input],
  })) : [];
  proofs.push({ id, planId: plan.id, partId, originalId: plan.originalId,
    originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
    kind, artifacts: dependencies, disclosure: plan.disclosure, recipe: data.recipe, expected: data.expected,
    input, output, inputDigest: input.sha256, outputDigest: output.sha256,
    provenance: { ...provenance, receipt }, bases, ...(kind === 'observed-behavior' ? { observations } : {}) });
}
for (const data of numeric.cases) addProof(data.id,
  data.recipe.mode === 'parameters' ? 'i52-authored-price-and-inputs' : 'i52-price-arithmetic',
  data.recipe.mode === 'parameters' ? 'authored-parameter' : 'derived-result', data);
for (const [price, names] of [[20000, ['min']], [80000, ['default', 'reset', 'mobile-default']], [250000, ['max']]]) {
  const partId = `i52-mounted-${price}`;
  const id = `i52-observed-${price}`;
  const observations = names.map(n => browser.observations.find(o => o.name === n));
  plan.parts.push({ id: partId, kind: 'observed-behavior',
    text: `The real mounted calculator at robotCost${price}, other authored defaults fixed, shows the chosen-price disclosure and independently checked capital cost, cost/pick, payback, verdict, picks and elapsed-hour breakdown. Required observations:${names.join(',')}. The original mounted-disclosure obligation survives across all three price groups; Reset restores all seven defaults.`,
    requiredProofIds: [id], requiredObservations: observations.map(({ mountId, caseId, prestate, action, poststate }) => ({ mountId, caseId, prestate, action, poststate })) });
  addProof(id, partId, 'observed-behavior', numeric.cases.find(c => c.id === `i52-${price}`), names);
}
const catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans: [plan], proofs });
save('catalog-draft.json', catalog);
save('assembly-provenance.json', { assembledAt: new Date().toISOString(), newReviews: 0,
  supplementalRuntimeDependencies: browser.dependencies.filter(d => !/^(audit|lib|content|components|tests|contract)\//.test(d.file.path)),
  numericalRun: artifact(`${DIRECTORY}/numeric-run.json`), browserRun: artifact(`${DIRECTORY}/browser-run.json`),
  source: artifact(`${DIRECTORY}/source-provenance.json`),
  qualification: 'Exact first Unresolved original and actual source/run bytes retained. Five original obligations, seven native parts. Review not pre-certified.' });
const validation = validateLocalBasisPlan(plan, plan.currentCells, plan.id, { citationId: '', sourceUrl: '', supportingPassage: '' },
  new Set(CITATIONS.map(c => c.id)), { root: process.cwd(), catalog, registry, publishedRoutes: [ROUTE] });
console.log(JSON.stringify({ parts: plan.parts.length, proofs: proofs.length, sources: plan.evidence.length, failuresBeforeActualReview: validation.failures }, null, 2));
