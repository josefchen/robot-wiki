// One-shot integration after the actual source, execution and reader review.
// This is not an independent acceptance or a general-purpose approval tool.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { buildManifest } from '../../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import {
  parseLocalBasisCatalog, localPlanDigest, localPartDigest, validateLocalBasisPlan,
} from '../../../lib/audit-local-basis.ts';
import { DIRECTORY, ROOT, save } from './proof-support.ts';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const catalog = parseLocalBasisCatalog(read(`${DIRECTORY}/catalog-draft.json`));
const originalBindings = read(`${DIRECTORY}/selected-bindings.json`);
const legacy = read(`${DIRECTORY}/legacy-plans.json`);
const allLegacy = read('audit/compound-evidence.json');
const oldLocal = read('audit/local-basis.json');
if (oldLocal.plans.length || oldLocal.proofs.length) throw Error('Local catalog ownership changed');
const ledgerPath = 'audit/rl-sim2real.md';
const oldMarkdown = fs.readFileSync(ledgerPath, 'utf8');
const registryIds = new Set(CITATIONS.map(c => c.id));
const articleCitations = Object.fromEntries(fs.readdirSync('content/rl-sim2real').filter(f => f.endsWith('.mdx'))
  .map(f => [f.slice(0, -4), matter(fs.readFileSync(`content/rl-sim2real/${f}`, 'utf8')).data.citations]));
const before = parseLedger(ledgerPath, oldMarkdown, registryIds, { compoundPlans: allLegacy, articleCitations });
const selected = before.find(s => s.slug === 'reward-design-mpc').claimRecords;
for (const b of originalBindings) {
  if (originalClaimDigest(selected[b.rowOrdinal - 1]) !== b.currentTupleDigest) throw Error(`Application drift: ${b.originalId}`);
  const old = legacy.find(p => p.rowOrdinal === b.rowOrdinal);
  if (JSON.stringify(allLegacy.find(p => p.id === old.id)) !== JSON.stringify(old)) throw Error('Legacy plan drift');
}
const rationale = {
  'r4-paper-boundary': 'I read the retained Rudin Section 3.2 and Appendix A.3 Table 2: nine rows, including feet air time. This supports the nine-versus-twelve boundary only, not the authored weights or a runnable recipe. Unversioned full-text identity and original September 6 tool time stay qualified.',
  'r4-reference-code-boundary': 'I read the exact initial-commit _reward_stumble function: feet hitting vertical surfaces, not slip. Reconstructed addition matches upstream Git blob b58c812b64d7c2cb8f969f498310bfd674c0c65c, including no final LF. The local label is separate; this does not make twelve UI terms the source full active objective.',
  'r4-parameters': 'Actual parameter extraction and independent literal checks cover all twelve ordered IDs, labels/signs/magnitudes/defaults, 0..4 in 0.1 increments and stumble label. Article and component disclose chosen teaching parameters, with no learned or empirical provenance.',
  'r4-total': 'The separately written twelve-term signed dot product gives -5.52; the actual recipe output and browser show the same two-decimal total. Units are dimensionless per step, not measured policy quality. Inputs point to this plan authored weights and phase.',
  'r4-mounted-controls': 'Actual Playwright on the article found exactly twelve individually labeled sliders with correct min/default/max/step. Initial and post-chatter Reset show -5.52, balanced and the original phase-zero SVG. Retained DOM/PNG and hashes bind those observations, not a screenshot prediction.',
  'r5-rudin-contrast': 'I read the retained Results 4.2 paragraph in context: trotting converges with dragging-leg or unreasonable base-height artifacts; reward tuning precedes transfer. It does not establish the local freeze/prance/chatter taxonomy. The old literature claim is corrected, not affirmed.',
  'r5-classifier-parameters': 'The authored classifier is priority-ordered: <=0.2 action-rate chatter first, then torque absolute 2.5 and relative 2x velocity freeze, then analogous air-time prance, else balanced. Threshold boundary/priority checks and full dependency hashes accompany explicit non-empirical disclosure.',
  'r5-classifier-and-pose': 'Six actual bound inputs produce balanced/frozen/prancing/chatter/balanced/frozen with independently checked totals -5.52/-8.72/-3.48/-4.72/-5.72/-6.68. Default and admitted authored-case pointers bind every weight object; phase 0 is authored. Pose outputs remain deterministic drawn geometry, not learned trajectories or physical measurements.',
  'r11-eureka-mechanism': 'I read the retained v2 problem definition, methods 3.1-3.3 and PPO training details: generated reward code is optimized by policy learning, evaluated with separate task fitness, then mutated using scalar reward-component/fitness reflection. The September 8 PDF extraction matches original embedded reading text. None of the local three-generation numbers is attributed to that paper.',
  'r11-authored-transcript': 'Actual complete extraction covers the 1.0 m/s teaching task, all code/reflection/statistic fixtures and fitness 0.31/0.58/0.86. Exact numeric statistics were checked independently; article and UI explicitly label all of them authored/scripted, not a recorded Eureka or PPO run.',
  'r11-diffs': 'Actual derivations for 0-to-0, 0-to-1 and 1-to-2 reconstruct both original code arrays in order from the diff and match separately specified deleted lines and fitness displays. Each generation index points to the same plan authored transcript.',
};
const reviewedBy = 'Droid integrator f86f6148-94a8-4312-bf35-13bdf5c6d211; custom:droidproxy:gpt-6-astra; max';
const observedAt = new Date().toISOString();
function review(plan, partId) {
  const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, catalog.proofs);
  let reason = partId === null
    ? `I reviewed this exact whole ordered ${plan.parts.length}-part original/current inventory, actual historical external passages, explicit reader disclosure, independently checked numeric outputs and actual mounted observations. Every external AND local part is required. Original, held and withdrawn history survives; no scientific/P1 obligation is replaced with local proof. This is delegated integrator adjudication, not independent validation or release acceptance.`
    : rationale[partId];
  if (!reason && partId.startsWith('r5-mounted-preview-')) {
    const state = partId.slice('r5-mounted-preview-'.length);
    reason = `Actual registered-mount Playwright transition for ${state}: keyboard min/max input (or Reset) changed the named status, displayed total and actual SVG state. Retained DOM and PNG match the derivation. Reset restored the original pose. This is an observed toy UI state at phase zero, not a trained policy, measured vibration frequency or complete registry-state acceptance.`;
  }
  if (!reason && partId.startsWith('r11-mounted-replay-')) {
    const state = partId.slice('r11-mounted-replay-'.length);
    reason = `Actual registered EurekaLoop observation ${state} binds its own generation/fitness/code/statistics/reflection, DOM and screenshot. Keyboard activation advances the script; generation 2 disables Next; Reset re-enables it and returns 0 without a diff. The disclosure is present in actual DOM. This witnesses these transitions, not all focus cases or a real training experiment.`;
  }
  if (!reason) throw Error(`Unreviewed part ${partId}`);
  const event = save(partId === null ? `r${plan.rowOrdinal}-plan.review.json` : `${partId}.review.json`, {
    schemaVersion: 'local-review-event-v1', sessionId: 'f86f6148-94a8-4312-bf35-13bdf5c6d211',
    role: 'integrator', eventId: `${plan.id}:${partId ?? 'whole-plan'}:${observedAt}`, observedAt,
    reviewedBy, rationale: reason, outcome: 'supported', scope: partId === null ? 'plan' : 'part',
    partId, inputDigest, inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
  });
  return { reviewedBy, rationale: reason, inputDigest, event, ...(partId === null ? {} : { partId, outcome: 'supported' }) };
}
for (const plan of catalog.plans) {
  plan.planReview = review(plan, null);
  plan.adjudications = plan.parts.map(p => review(plan, p.id));
}
const context = {
  root: ROOT, catalog, registry: read('contract/brand-v2-registries.json').interactive,
  publishedRoutes: ['/rl-sim2real/reward-design-mpc/'],
};
for (const plan of catalog.plans) {
  const result = validateLocalBasisPlan(plan, plan.currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, registryIds, context);
  if (result.failures.length) throw Error(JSON.stringify(result));
}
const lines = oldMarkdown.split('\n');
for (const plan of catalog.plans) {
  const record = selected[plan.rowOrdinal - 1];
  const c = plan.currentCells;
  lines[record.line - 1] = '| ' + [c.claim, c.sourceChecked, c.verdict, c.note, '', '', '', plan.id]
    .map(s => s.replaceAll('|', '\\|').replaceAll('\n', '<br>')).join(' | ') + ' |';
}
let markdown = lines.join('\n');
markdown += '\n\n## Reward typed-local integration history, 2026-09-23\n\n'
  + 'Exactly three selected legacy bindings are replaced, not re-certified. The immutable first ledger is retained byte-for-byte at `audit/evidence/reward-local-20260923/original-rl-sim2real.md`; the first cells and pre-application held cells are retained in `selected-bindings.json`, and all three removed legacy plans are retained in `legacy-plans.json` in that directory. Existing named-hold archives and withdrawn reviews above remain untouched. The following exact held tuples and legacy plans are non-counted correction history.\n\n'
  + '<!-- reward-local-history:start -->\n```json\n'
  + JSON.stringify({ originalBindings: originalBindings.map(b => ({ originalId: b.originalId, rowOrdinal: b.rowOrdinal, currentTupleDigest: b.currentTupleDigest, currentCells: b.currentCells, originalBinding: b.originalBinding })), legacyPlans: legacy }, null, 2)
  + '\n```\n<!-- reward-local-history:end -->\n';
const remaining = allLegacy.filter(p => !legacy.some(l => l.id === p.id));
const sections = parseLedger(ledgerPath, markdown, registryIds, { compoundPlans: remaining, articleCitations, localBasis: context });
for (const n of [4, 5, 11]) {
  const record = sections.find(s => s.slug === 'reward-design-mpc').claimRecords[n - 1];
  if (record.evidenceFailures.length) throw Error(JSON.stringify(record.evidenceFailures));
}
markdown = withLedgerSummary(markdown, sections);
// Only actual native member changes are approved. No fabricated library member.
const deltas = read('contract/brand-v2-approved-deltas.json');
for (const [index, path] of ['content/rl-sim2real/reward-design-mpc.mdx', 'components/interactive/reward-shaping.tsx', 'components/interactive/eureka-loop.tsx'].entries()) {
  const oldSource = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
  const newSource = fs.readFileSync(path, 'utf8');
  const prose = path.startsWith('content/');
  const manifest = prose ? 'prose' : 'interactive-sources-mounts';
  const memberId = prose ? `article:${path.slice(8, -4)}` : `source:${path}`;
  const value = s => prose ? { path, body: matter(s).content.trim() } : { path, source: s };
  const hash = s => buildManifest(manifest, [{ id: memberId, value: value(s) }]).members[0].hash;
  if (hash(oldSource) === hash(newSource)) throw Error('No-op approval');
  deltas.entries.push({
    id: `reward-local-20260923-${index + 1}`, manifest, memberId, oldHash: hash(oldSource), newHash: hash(newSource),
    reason: 'Only reward4/5/11: explicit authored-parameter, local weighted-sum/classifier and scripted-transcript disclosures. No formulas, constants, controls, geometry, citations or external scientific results changed.',
    ownerApproval: 'September 23 authored-evidence owner decision and bounded reward integrator authorization at /home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/convergence-reward-local-integration-20260923/authorization.md; parent preflight commit 2aaf0588f0b577fa5a8ea94f9139d0292d9ab433. This is not independent acceptance.',
    responsibleMilestone: 'brand-v2-editorial', affectedAssertions: ['VAL-B2-BASE-010', 'VAL-AUDIT-002', 'VAL-AUDIT-009'],
    disposition: 'permanent',
  });
}
fs.writeFileSync('audit/local-basis.json', JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync('audit/compound-evidence.json', JSON.stringify(remaining, null, 2) + '\n');
fs.writeFileSync(ledgerPath, markdown);
fs.writeFileSync('contract/brand-v2-approved-deltas.json', JSON.stringify(deltas, null, 2) + '\n');
console.log(JSON.stringify({ reviewedAt: observedAt, plans: 3, parts: 19, proofs: 22, externalPairs: 4, legacyPlansBefore: allLegacy.length, legacyPlansAfter: remaining.length, approvals: deltas.entries.length, selectedFailures: [] }));
