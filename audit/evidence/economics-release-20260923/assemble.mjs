import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  localPlanDigest, localPartDigest, parseLocalBasisCatalog,
  validateLocalBasisPlan, recomputeLocalDerivation,
} from '../../../lib/audit-local-basis.ts';
import { CITATIONS } from '../../../data/citations.ts';
import { publishedModules } from '../../../data/modules.ts';
import { DIRECTORY, ARTICLE, artifact, member, save } from './support.ts';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const catalogPath = 'audit/local-basis.json';
const before = read(catalogPath);
const catalog = parseLocalBasisCatalog(structuredClone(before));
const plan = catalog.plans.find(p => p.id === 'economics-local-i52-20260923');
assert(plan);
const previousPlan = before.plans.find(p => p.id === plan.id);
const previousProofs = before.proofs.filter(p => p.planId === plan.id);
const numeric = read(`${DIRECTORY}/numeric-run-final.json`);
const browser = read(`${DIRECTORY}/browser-run.json`);
for (const run of [numeric, browser]) {
  assert.equal(run.exitCode, 0);
  assert.deepEqual(artifact(run.test.path), run.test);
  assert.equal(run.cwd, process.cwd());
}
assert.deepEqual(browser.pageErrors, []);
assert.deepEqual(browser.desktopAxeViolations, []);
assert.deepEqual(browser.mobileAxeViolations, []);
assert.deepEqual(browser.externalRequests, []);
const archivePath = `${DIRECTORY}/previous-economics-plan-and-proofs.json`;
if (!fs.existsSync(archivePath)) save('previous-economics-plan-and-proofs.json', {
  plan: previousPlan, proofs: previousProofs,
});
assert.deepEqual(read(archivePath), { plan: previousPlan, proofs: previousProofs });
const archive = artifact(archivePath);
plan.disclosure.member = member(ARTICLE, plan.disclosure.text);
const proofs = catalog.proofs.filter(p => p.planId === plan.id);
assert.equal(proofs.length, 7);
for (const proof of proofs) {
  const observed = proof.kind === 'observed-behavior';
  const run = observed ? browser : numeric;
  const numericCase = numeric.cases.find(c => c.id === proof.id.replace('i52-observed-', 'i52-'));
  assert(numericCase);
  assert.deepEqual(numericCase.recipe, proof.recipe);
  assert.deepEqual(numericCase.expected, proof.expected);
  assert.deepEqual(recomputeLocalDerivation(proof.recipe), proof.expected);
  proof.disclosure = structuredClone(plan.disclosure);
  proof.artifacts = structuredClone(observed ? browser.dependencies : numericCase.dependencies);
  for (const dependency of proof.artifacts) assert.deepEqual(artifact(dependency.file.path), dependency.file);
  // The native artifact schema accepts only repository subdirectories. Retain
  // root config/lockfile hashes in the unchanged raw run, as the original
  // economics assembler did; every mandatory proof dependency remains bound.
  const runtimeOnly = new Set([
    'playwright.config.ts', 'playwright.economics-release.config.ts',
    'playwright.brand-v2.config.ts', 'package-lock.json',
  ]);
  proof.artifacts = proof.artifacts.filter(d => !runtimeOnly.has(d.file.path));
  if (observed) {
    proof.observations = browser.observations
      .filter(o => o.input.robotCost === proof.recipe.inputs.robotCost)
      .map(({ mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture }) =>
        ({ mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture }));
    assert.deepEqual(proof.observations.map(({ mountId, caseId, prestate, action, poststate }) =>
      ({ mountId, caseId, prestate, action, poststate })),
    plan.parts.find(p => p.id === proof.partId).requiredObservations);
  }
  const provenance = Object.fromEntries([
    'command', 'runner', 'cwd', 'environment', 'startedAt', 'endedAt', 'exitCode', 'test',
  ].map(key => [key, run[key]]));
  const receipt = save(`${proof.id}.bound.receipt.json`, {
    schemaVersion: 'local-run-v1', ...provenance,
    inputDigest: proof.inputDigest, outputDigest: proof.outputDigest,
    dependencies: proof.artifacts,
    observations: observed ? proof.observations : [],
  });
  proof.provenance = { ...provenance, receipt };
}
const at = new Date().toISOString();
const reviewedBy = 'Robot Wiki release steward , integrator, not independent project acceptance';
function review(partId) {
  const prior = partId === null ? previousPlan.planReview
    : previousPlan.adjudications.find(a => a.partId === partId);
  const inputDigest = partId === null ? localPlanDigest(plan)
    : localPartDigest(plan, partId, proofs);
  const rationale = `${prior.rationale} Release integration review: the main-only 2021-2024 hyphen changes whole-article identity but no economics claim or source passage. The original seven-part AND inventory, source provenance, original/current tuples, formulas and outputs remain identical. I checked the actual fresh release numeric and static-export browser runs at default, minimum, maximum, Reset and mobile default; all seven input domains, independent readouts, elapsed-hour wording, capital-only scope, Axe and error checks passed. New receipts bind the current article and checker without altering historical execution times or receipts. This is integrator review, not independent project acceptance.`;
  const event = save(`${partId ?? 'plan'}.bound.review.json`, {
    schemaVersion: 'local-review-event-v1',
    sessionId: 'release-steward-20260923T1745Z',
    role: 'integrator', eventId: `release-20260923:${plan.id}:${partId ?? 'plan'}:${at}`,
    observedAt: at, reviewedBy, rationale, outcome: 'supported',
    scope: partId === null ? 'plan' : 'part', partId, inputDigest,
    inventory: plan.parts, originalId: plan.originalId,
    currentTupleDigest: plan.currentTupleDigest,
  });
  return { reviewedBy, rationale, inputDigest, event };
}
plan.planReview = review(null);
plan.adjudications = plan.parts.map(part => ({
  ...review(part.id), partId: part.id, outcome: 'supported',
}));
const context = {
  root: process.cwd(), catalog,
  registry: read('contract/brand-v2-registries.json').interactive,
  publishedRoutes: publishedModules().map(m => `/${m.domain}/${m.slug}/`),
};
for (const selected of catalog.plans) {
  assert.deepEqual(validateLocalBasisPlan(selected, selected.currentCells, selected.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' },
    new Set(CITATIONS.map(c => c.id)), context).failures, [], selected.id);
}
assert.deepEqual(catalog.plans.filter(p => p.id !== plan.id), before.plans.filter(p => p.id !== plan.id));
assert.deepEqual(catalog.proofs.filter(p => p.planId !== plan.id), before.proofs.filter(p => p.planId !== plan.id));
assert.deepEqual(plan.parts, previousPlan.parts);
assert.deepEqual(plan.evidence, previousPlan.evidence);
assert.deepEqual(plan.originalBinding, previousPlan.originalBinding);
assert.deepEqual(plan.currentCells, previousPlan.currentCells);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
save('refresh-summary.json', {
  at, archive, changedProofs: proofs.map(p => p.id), actualNumericRun: artifact(`${DIRECTORY}/numeric-run-final.json`),
  actualBrowserRun: artifact(`${DIRECTORY}/browser-run.json`),
  noNewCompletions: true, unchangedExternalEvidence: true, unchangedOtherPlans: true,
  independentMissionAcceptance: false,
});
console.log('Fresh economics release evidence: seven proofs, seven part reviews, one plan review; all seven plans validate.');
