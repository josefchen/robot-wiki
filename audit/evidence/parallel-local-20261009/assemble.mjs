// Rebinds parallel18 to the BatchScale scene from the recorded numeric and
// browser runs: same plan id, part ids, cells and external evidence; new
// mount, disclosure, local part texts, proofs and reviews. Reviews are
// integrator reviews, not independent acceptance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CITATIONS } from '../../../data/citations.ts';
import { publishedModules } from '../../../data/modules.ts';
import {
  LOCAL_BASIS_REQUIRED_TARGETS, loadLocalBasisContext, localPartDigest, localPlanDigest, localSceneRegistry,
  parseLocalBasisCatalog, recomputeLocalDerivation, validateLocalBasisPlan,
} from '../../../lib/audit-local-basis.ts';
import { ARTICLE, DIRECTORY, MOUNT, artifact, cases, member, save } from './support.ts';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const PLAN_ID = 'parallel-local-p18-20260923';
const catalogPath = 'audit/local-basis.json';
const catalogText = fs.readFileSync(catalogPath, 'utf8');
const raw = JSON.parse(catalogText);
// The catalog is rewritten whole, so it must already be in that serialization.
assert.equal(JSON.stringify(raw, null, 2) + '\n', catalogText);
const before = structuredClone(raw);
const planIndex = raw.plans.findIndex(p => p.id === PLAN_ID);
const previous = raw.plans[planIndex];
const first = raw.proofs.findIndex(p => p.planId === PLAN_ID);
assert.deepEqual(raw.proofs.flatMap((p, i) => p.planId === PLAN_ID ? [i] : []), Array.from({ length: 13 }, (_, k) => first + k));
assert.deepEqual(read(`${DIRECTORY}/previous-parallel-plan-and-proofs.json`),
  { plan: previous, proofs: raw.proofs.slice(first, first + 13) });

const numeric = read(`${DIRECTORY}/numeric-run.json`);
const browser = read(`${DIRECTORY}/browser-run.json`);
for (const run of [numeric, browser]) {
  assert.equal(run.exitCode, 0);
  assert.equal(run.cwd, '/srv/robot-wiki');
  assert.deepEqual(artifact(run.test.path), run.test);
}
assert.deepEqual([browser.pageErrors, browser.externalRequests, browser.desktopAxeViolations, browser.mobileAxeViolations], [[], [], [], []]);
assert.deepEqual(numeric.cases.map(c => c.id), cases.map(c => c.id));

const target = LOCAL_BASIS_REQUIRED_TARGETS[previous.originalId];
assert.deepEqual(target, { component: 'BatchScale', recipe: 'batch-scale', mounts: [1], scene: 'batch-scale' });
const scenes = localSceneRegistry(process.cwd(), { [previous.originalId]: target });
assert.equal(scenes.sources.length, 1);
assert.deepEqual(scenes.mounts.map(m => m.id), [MOUNT]);
const [source] = scenes.sources;
const [mounted] = scenes.mounts;
const DISCLOSURE = 'The opening scene is an illustrative calculation: a fixed 220-million-transition budget, an assumed CPU-cost curve that raises per-iteration costs, and a calibrated near-four-minute time at 4,096 environments.';
assert.equal(fs.readFileSync(ARTICLE, 'utf8').split(DISCLOSURE).length, 2);
const disclosure = { member: member(ARTICLE, DISCLOSURE), text: DISCLOSURE };

const SIBLINGS = 'All sibling robot-count and curve states remain required.';
const OBSERVED = [
  { envs: 64, on: false, beat: 'one-batch', names: ['one-batch'],
    text: `Stepped back three beats from the 16,384-robot recap, the mounted BatchScale scene shows beat one-batch: "64 robots at once: 3.6 hours of training", the method text "64 robots, 3.6 hours", the marker at the 64-robot end of the solid curve, one robot dot and the dashed curve hidden. Retired with the TrainingTimeChart and written in here: the environment slider with its drag and keyboard bounds (beat stepping replaces it) and the aria-pressed CPU toggle (the dashed curve appears at the cpu and recap beats instead). ${SIBLINGS}`,
    look: 'beat one-batch with the marker at the 64-robot end of the solid curve, one robot dot, no dashed curve and the readout "64 robots at once: 3.6 hours of training"' },
  { envs: 64, on: true, beat: 'one-batch', names: ['one-batch-keyboard'],
    text: `Reached again from the keyboard (Home, then ArrowRight), the one-batch beat keeps the dashed curve hidden, its path still places the 64-robot vertex at the recomputed time, and the method text reads the dashed 64-robot time "3.6 hours". ${SIBLINGS}`,
    look: 'the same one-batch state reached from the keyboard, the dashed curve hidden; the dashed 64-robot time 3.6 hours sits in the DOM method text below the viewport' },
  { envs: 4096, on: false, beat: 'scale', names: ['scale'],
    text: `Two beats back from the recap, beat scale shows "4,096 robots at once: 4.0 minutes of training", the method text "4,096 robots, 4.0 minutes", the marker at 4,096 robots on the solid curve, 64 robot dots and the dashed curve hidden. Page default, Reset and the 375 px check moved to the 16,384 part because the scene's poster is the 16,384 recap; the retired chart defaulted to 4,096. ${SIBLINGS}`,
    look: 'beat scale with the marker at 4,096 robots on the solid curve, 64 robot dots, no dashed curve and the readout "4,096 robots at once: 4.0 minutes of training"' },
  { envs: 4096, on: true, beat: 'cpu', names: ['cpu'],
    text: `One beat back from the recap, beat cpu shows the dashed CPU-cost curve with its 4,096-robot vertex at the recomputed time, and the method text reads the dashed time "7.3 minutes"; the readout and marker stay on the solid 4,096-robot time. ${SIBLINGS}`,
    look: 'beat cpu with the dashed "with computer overhead" curve drawn above the solid one, the marker still on the solid curve at 4,096 robots and the readout still the solid 4.0 minutes' },
  { envs: 16384, on: false, beat: 'recap', names: ['default', 'reset', 'mobile-default'],
    text: `On load, after Reset and at a 375 px viewport, the scene shows its 16,384-robot recap poster: "16,384 robots at once: 1.5 minutes of training", the method text "16,384 robots, 1.5 minutes", the annotation about 1.5 minutes, 256 robot dots and the marker at the 16,384-robot end of the solid curve. Retired with the TrainingTimeChart and written in here: the Rudin flat and rough chart markers. The scene draws neither; the bounds stay in the article prose and the external parts. ${SIBLINGS}`,
    look: 'the recap poster on load and after Reset (marker at 16,384 robots, 256 robot dots, the "about 1.5 minutes" annotation, both curves), and the same state at 375 px with the chart, readout and status line inside the viewport' },
  { envs: 16384, on: true, beat: 'recap', names: ['recap'],
    text: `Stepping forward three beats from one-batch returns to the recap, where the dashed curve ends at its 16,384-robot vertex at the recomputed time and the method text reads the dashed time "4.8 minutes". ${SIBLINGS}`,
    look: 'the recap reached by stepping forward, with the dashed curve ending above the marker at 16,384 robots' },
];
const suffix = o => `${o.envs}-${o.on ? 'on' : 'off'}`;
const transition = ({ mountId, caseId, prestate, action, poststate }) => ({ mountId, caseId, prestate, action, poststate });
const observation = name => {
  const o = browser.observations.find(o => o.name === name);
  assert(o, name);
  assert.deepEqual(artifact(o.dom.path), o.dom);
  assert.deepEqual(artifact(o.capture.path), o.capture);
  const { viewport, readouts, dom, capture } = o;
  return { ...transition(o), viewport, readouts, dom, capture };
};

const external = previous.parts.filter(p => p.kind === 'external-source');
const derived = numeric.cases.filter(c => c.recipe.mode === 'derive');
const parts = [...external, {
  id: 'p18-authored-cost-model', kind: 'authored-parameter', requiredProofIds: ['p18-batch-parameters'],
  text: 'The target 2.2e8 transitions, 24 rollout steps as a chosen model input, cost seconds [0.02,4e-6,0.04,0.03,2.2e-5], the fixed-budget assumption, the BatchScale beat-end robot counts (one-batch 64, scale 4,096, cpu 4,096, recap 16,384) and its two curves (solid without and dashed with the assumed per-robot CPU cost) are authored. Retired with the TrainingTimeChart and written in here: the 49-point sample grid (the scene draws exact 32-segment solid and dashed paths) and the flat-marker x (the scene draws no Rudin marker; its near-four-minute 4,096 time is a chosen calibration).',
}, {
  id: 'p18-cost-arithmetic', kind: 'derived-result', requiredProofIds: derived.map(c => c.id),
  text: 'Iterations=target/(robots*24); wall time=iterations*(sim+learn+CPU) with sim 0.02+4e-6*robots, learn 0.04 and CPU 0.03 s, the dashed curve adding 2.2e-5 s per robot to CPU; the time reads in hours or minutes to one decimal, otherwise whole seconds, in the readout sentence and the method text. A fixed formula, not an empirical learning curve. Retired with the TrainingTimeChart: throughput (FPS), per-iteration time, bucket shares and the crossover are no longer rendered, so no observation asserts them; the per-iteration breakdown is still recomputed.',
}, ...OBSERVED.map(o => ({
  id: `p18-mounted-${suffix(o)}`, kind: 'observed-behavior', text: o.text,
  requiredProofIds: [`p18-batch-observed-${suffix(o)}`], requiredObservations: o.names.map(n => transition(observation(n))),
}))];
assert.deepEqual(parts.map(p => [p.id, p.kind]), previous.parts.map(p => [p.id, p.kind]));

const runFields = run => Object.fromEntries(['command', 'runner', 'cwd', 'environment', 'startedAt', 'endedAt', 'exitCode', 'test']
  .map(key => [key, run[key]]));
const beatOf = (envs, on) => OBSERVED.find(o => o.envs === envs && o.on === on).beat;
function proof(id, partId, kind, data, names = []) {
  const observed = kind === 'observed-behavior';
  const run = observed ? browser : numeric;
  const artifacts = observed ? browser.dependencies : data.dependencies;
  for (const dependency of artifacts) assert.deepEqual(member(dependency.file.path), dependency);
  assert.deepEqual(recomputeLocalDerivation(data.recipe), data.expected);
  const observations = names.map(observation);
  for (const o of observations) assert(data.expected.values.display.every(d => o.readouts.some(r => r.text === d)), `${id} readouts`);
  const input = save(`${id}.input.json`, data.recipe);
  const output = save(`${id}.output.json`, data.expected);
  const provenance = runFields(run);
  const receipt = save(`${id}.receipt.json`, { schemaVersion: 'local-run-v1', ...provenance,
    inputDigest: input.sha256, outputDigest: output.sha256, dependencies: artifacts, observations });
  const bases = [];
  if (data.recipe.mode === 'derive') {
    const { envs, cpuBound } = data.recipe.inputs;
    bases.push({ input: 'envs', kind: 'authored-parameter', proofId: 'p18-batch-parameters', pointer: `/beatRobots/${beatOf(envs, cpuBound)}`, unit: 'count' },
      { input: 'cpuBound', kind: 'authored-parameter', proofId: 'p18-batch-parameters', pointer: `/curves/${cpuBound ? 'dashed' : 'solid'}`, unit: 'boolean' });
  }
  return { id, planId: PLAN_ID, partId, originalId: previous.originalId,
    originalTupleDigest: previous.originalBinding.originalTupleDigest, currentTupleDigest: previous.currentTupleDigest,
    artifacts, disclosure, recipe: data.recipe, expected: data.expected, input, output,
    inputDigest: input.sha256, outputDigest: output.sha256, provenance: { ...provenance, receipt }, bases, kind,
    ...(observed ? { observations } : {}) };
}
const proofs = [
  ...numeric.cases.map(c => c.recipe.mode === 'parameters'
    ? proof(c.id, 'p18-authored-cost-model', 'authored-parameter', c)
    : proof(c.id, 'p18-cost-arithmetic', 'derived-result', c)),
  ...OBSERVED.map(o => proof(`p18-batch-observed-${suffix(o)}`, `p18-mounted-${suffix(o)}`, 'observed-behavior',
    numeric.cases.find(c => c.id === `p18-batch-${suffix(o)}`), o.names)),
];
const draft = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans: [{
  id: PLAN_ID, kind: previous.kind, originalId: previous.originalId, ledgerPath: previous.ledgerPath,
  articleSlug: previous.articleSlug, rowOrdinal: previous.rowOrdinal, originalBinding: previous.originalBinding,
  currentCells: previous.currentCells, currentTupleDigest: previous.currentTupleDigest,
  mounts: [{ sourceId: source.id, sourceFingerprint: source.fingerprint, mountId: mounted.id,
    mountFingerprint: mounted.fingerprint, route: mounted.route }],
  disclosure, parts, evidence: previous.evidence, planReview: null, adjudications: [],
}], proofs });
const plan = draft.plans[0];

const UNCHANGED = 'Unchanged part, text and retained passage; the validator re-reads the retained response and the passage bytes.';
const LOOKED = 'I read the recorded Playwright action, its DOM capture and PNG, and looked at the capture:';
const PROOF_CHECKS = 'The DOM holds the disclosure sentence and readouts equal to the recomputed display, and the spec also checked the exact 32-segment solid and dashed paths, the marker and the robot dots against an independent restatement of the stage geometry.';
const rationale = {
  'p18-rudin-flat-bound': `${UNCHANGED} The article now carries this bound in prose and a stat, not on a chart: "Flat terrain took under four minutes" and the "< 4 min" stat for the separate flat run. The scene disclosure calls its near-four-minute 4,096-environment time a calibration and the next sentence says only Rudin's separate deployment run ties 4,096 robots to a reported bound. BatchScale draws no flat marker, so nothing reader-facing equates the bound with a 4,096-robot measurement.`,
  'p18-rudin-rough-protocol': `${UNCHANGED} The article still states the separate deployment run: 4,096 robots, 98,304-transition batches (24 steps per robot) and 1,500 updates in under 20 minutes on an i9-11900k CPU and RTX A6000 GPU. The scene's 24 rollout steps are a chosen input equal to 98,304/4,096, and its 220-million-transition budget is not the paper's 1,500 x 98,304 = 147,456,000; the unit suite still rejects treating the two as equal.`,
  'p18-isaac-measured-anchors': `${UNCHANGED} The article still reports the headless state-based anchors as measurements, apart from the scene: with eight RTX PRO 6000 GPUs and 16,384 environments the DextrAH teacher grasp-and-lift task exceeds 900,000 FPS and Franka cabinet 1.6 million, counting environment steps over simulation plus learning time, and the "> 900k FPS" and "> 1.6M FPS" stats repeat them. The scene renders no throughput, so no toy number competes with these anchors.`,
  'p18-isaac-cpu-context': `${UNCHANGED} The paragraph after the scene disclosure ties the dashed curve to the reported, task-dependent comparison: an RTX 5090 workstation with an AMD 9800X3D nearly matching a server with two RTX PRO 6000 GPUs and two 64-core EPYC 9554 CPUs on a state-based Franka drawer task, attributed to CPU bottlenecks in PhysX and the training loop. The scene's per-robot CPU cost is an assumption this context motivates, not a measured curve; the dashed curve replaces the retired CPU toggle.`,
  'p18-authored-cost-model': 'I compared the p18-batch-parameters output with lib/parallel-sim.ts and the checker extraction: 220,000,000 transitions, 24 rollout steps, costs [0.02, 0.000004, 0.04, 0.03, 0.000022] s, beat-end robots one-batch 64, scale 4,096, cpu 4,096 and recap 16,384, and the solid (CPU cost off) and dashed (on) curves. Every derivation input points into these values (/beatRobots/<beat> and /curves/solid or /curves/dashed). The part text records the retired 49-point grid and flat-marker x, and the scene method text calls the robot counts, times and main-computer cost authored.',
  'p18-cost-arithmetic': 'The six derive proofs match the independent closed form in the evidence support and the older oracle to nine decimals: 64 robots 12,927.29 s without and 13,128.96 s with the CPU cost (3.6 hours both), 4,096 robots 238.08 s (4.0 minutes) and 439.75 s (7.3 minutes), 16,384 robots 87.02 s (1.5 minutes) and 288.69 s (4.8 minutes). The displays are the readout sentence and method fragment for the solid curve and the bare time for the dashed curve. FPS, crossover and bucket shares are no longer part of this recipe, as the part text records.',
};
for (const o of OBSERVED) rationale[`p18-mounted-${suffix(o)}`] = `${LOOKED} ${o.look}. ${PROOF_CHECKS} Sibling states stay required.`;
const PLAN_RATIONALE = 'I reviewed the complete rebound inventory: the same plan id, original binding, current cells and 12 part ids and kinds, now bound to the BatchScale scene mount (scene:BatchScale, fingerprints from the checker scene registry) instead of the retired TrainingTimeChart mount, with the disclosure moved to the article sentence that introduces the scene as an illustrative calculation. The four external parts and their retained Rudin and Isaac Lab passages are unchanged. The authored, derived and six observed parts are rewritten for the scene, and every retired chart facet is written into a part text: the environment slider and CPU toggle, the FPS, per-iteration and bucket-share readouts, the 49-point sample grid and the Rudin chart markers. All 13 proofs come from one numeric run and one browser run made against the final checker, and the earlier plan and proofs survive unchanged in previous-parallel-plan-and-proofs.json. This is an integrator review, not independent acceptance.';

const observedAt = new Date().toISOString();
const reviewedBy = 'implementation worker for the parallel18 BatchScale rebinding (not independent acceptance)';
function review(partId) {
  const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, draft.proofs);
  const reason = partId === null ? PLAN_RATIONALE : rationale[partId];
  assert(reason, partId);
  const event = save(partId === null ? 'plan.review.json' : `${partId}.review.json`, {
    schemaVersion: 'local-review-event-v1', sessionId: 'parallel-local-20261012', role: 'integrator',
    eventId: `${plan.id}:${partId ?? 'plan'}:${observedAt}`, observedAt, reviewedBy, rationale: reason,
    outcome: 'supported', scope: partId === null ? 'plan' : 'part', partId, inputDigest,
    inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
  });
  return { reviewedBy, rationale: reason, inputDigest, event, ...(partId === null ? {} : { partId, outcome: 'supported' }) };
}
plan.planReview = review(null);
plan.adjudications = plan.parts.map(p => review(p.id));

const updated = { ...raw, plans: raw.plans.with(planIndex, plan),
  proofs: [...raw.proofs.slice(0, first), ...draft.proofs, ...raw.proofs.slice(first + 13)] };
const catalog = parseLocalBasisCatalog(structuredClone(updated));
const context = { ...loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`)), catalog };
const ids = new Set(CITATIONS.map(c => c.id));
for (const selected of catalog.plans) {
  assert.deepEqual(validateLocalBasisPlan(selected, selected.currentCells, selected.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context).failures, [], selected.id);
}
assert.deepEqual(updated.plans.filter(p => p.id !== PLAN_ID), before.plans.filter(p => p.id !== PLAN_ID));
assert.deepEqual(updated.proofs.filter(p => p.planId !== PLAN_ID), before.proofs.filter(p => p.planId !== PLAN_ID));
for (const key of ['originalBinding', 'currentCells', 'currentTupleDigest', 'evidence']) assert.deepEqual(plan[key], previous[key], key);
assert.deepEqual(plan.parts.filter(p => p.kind === 'external-source'), external);
fs.writeFileSync(catalogPath, JSON.stringify(updated, null, 2) + '\n');
save('assembly-summary.json', {
  assembledAt: observedAt, plan: PLAN_ID, archive: artifact(`${DIRECTORY}/previous-parallel-plan-and-proofs.json`),
  numericRun: artifact(`${DIRECTORY}/numeric-run.json`), browserRun: artifact(`${DIRECTORY}/browser-run.json`),
  proofs: draft.proofs.map(p => p.id), reviews: 1 + plan.adjudications.length,
  unchangedCellsAndExternalEvidence: true, unchangedOtherPlans: true, independentAcceptance: false,
});
console.log(JSON.stringify({ observedAt, parts: plan.parts.length, proofs: draft.proofs.length,
  reviews: 1 + plan.adjudications.length, plans: catalog.plans.length, catalogProofs: catalog.proofs.length }));
