// Scoped transaction after actual review of this exact whole AND inventory.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { buildManifest } from '../../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import { localPlanDigest, localPartDigest, parseLocalBasisCatalog, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { DIRECTORY, save } from './typed-support.ts';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const additions = parseLocalBasisCatalog(read(`${DIRECTORY}/native-catalog-draft.json`));
const bindings = read(`${DIRECTORY}/selected-bindings.json`);
const prior = parseLocalBasisCatalog(read('audit/local-basis.json'));
assert.equal(prior.plans.length, 3);
assert.equal(prior.proofs.length, 22);
const ledgerPath = 'audit/rl-sim2real.md';
const oldMarkdown = fs.readFileSync(ledgerPath, 'utf8');
const legacy = read('audit/compound-evidence.json');
assert.equal(legacy.length, 860);
const ids = new Set(CITATIONS.map(c => c.id));
const articleCitations = Object.fromEntries(fs.readdirSync('content/rl-sim2real')
  .filter(f => f.endsWith('.mdx')).map(f => [f.slice(0, -4), matter(fs.readFileSync(`content/rl-sim2real/${f}`, 'utf8')).data.citations]));
const context = {
  root: process.cwd(), catalog: { schemaVersion: 'authored-local-basis-v1', plans: [...prior.plans, ...additions.plans], proofs: [...prior.proofs, ...additions.proofs] },
  registry: read('contract/brand-v2-registries.json').interactive,
  publishedRoutes: ['/rl-sim2real/reward-design-mpc/', '/rl-sim2real/sim2real-transfer/'],
};
const before = parseLedger(ledgerPath, oldMarkdown, ids, { compoundPlans: legacy, articleCitations, localBasis: { ...context, catalog: prior } });
const selected = before.find(s => s.slug === 'sim2real-transfer').claimRecords;
for (const b of bindings) assert.equal(originalClaimDigest(selected[b.rowOrdinal - 1]), b.currentTupleDigest, `Application identity drift ${b.originalId}`);

const observedText = {
  's23-both-mounted-panels-default': 'The actual ordinary FrictionTransfer mount starts at mu 0.80/half-width 0.35 and Reset restores those values and the original SVG after a width change.',
  's23-both-mounted-panels-wide': 'The ordinary mount redraws at half-width 0.65; selecting the prediction reveals mount two at half-width 0.65, and its Reset restores 0.65 independently of the ordinary 0.35 default.',
  's23-both-mounted-panels-tail': 'Setting mu 1.50 at half-width 0.35 moves the real-friction line in both mounted panels and displays the separately recomputed tail percentages.',
  's24-mounted-degradation-default': 'The actual teacher mount starts at degradation 0.15 and Reset returns the original input/reconstruction markup, MAE 0.01 m, discrepancy 0.02 and 3/24 occluded channels.',
  's24-mounted-degradation-zero': 'Changing the actual teacher control from degradation 1 to 0 restores exact terrain colors, unoccluded input, MAE 0.00 m and discrepancy 0.00.',
  's24-mounted-degradation-high': 'Changing the actual teacher control from degradation 0.15 to 1 alters input/reconstruction panels, occludes 24/24 channels and displays MAE 0.17 m and discrepancy 0.38.',
};
const rationale = {
  's23-tobin-framing': 'I read the exact retained Tobin abstract in context: simulated-image rendering randomization and nonrealistic textures motivate visual transfer. It does not supply these friction curves, coefficients or percentages. Versioned v1 URL and original September 8 web fetch response identity remain distinct from this review.',
  's23-peng-framing': 'I read retained v3 Section IV through IV-C, including expected return over a distribution of dynamics and the concrete mass/damping/friction/timing/noise examples. The Fetch pushing experiment is not this illustrative Gaussian/plateau model or a universal width-versus-peak law.',
  's23-adr': 'I read the actual performance-threshold definition and ADR boundary-sampling paragraph: high and low thresholds adjust the distribution with training progress. This supports the original ADR anchor; it is not inferred from a source label or replaced by local calculations.',
  's23-isaac-plumbing': 'I read Isaac Lab v1 Section5.3: runtime parameter changes versus pre-play mesh scale/collider changes, CPU APIs for masses/friction/contact offsets/armature, and the adjacent configurable ADR curriculum with dexsuite references. This preserves both CPU/GPU qualification and original ADR attribution.',
  's23-curves-and-mount-defaults': 'Whole model/component/article members disclose all curve constants and ranges as authored. Fresh native extraction independently checked mu0.8, ranges0.2..1.5 and0.1..0.65, point peak0.97/sigma0.09 and edge sigma0.1. The 0.93-0.55*range formula and mount props0.35/0.65 are fixed choices, not uncertainty intervals or empirical success rates.',
  's23-arithmetic': 'Fresh native extraction agrees with independently implemented Gaussian, plateau and tail arithmetic at (0.8,0.35), (0.8,0.65), (1.5,0.35). Peaks0.7375 and0.5725 display74% and57%. Every mu/range input has an exact same-plan authored pointer/value, not an ungrounded numeric literal.',
  's24-privileged-context': 'I read Lee Section4.1: privileged terrain/contact teacher trained by RL, then action/latent supervision of a proprioceptive-history TCN deployed on physical machines. The preserved unversioned ar5iv body equals its actual original web fetch capture at2026-09-08T08:14:45.521Z; no v1 pin or fresh retrieval is asserted.',
  's24-input-mismatch': 'I read the actual Isaac Lab v1 RGB-distillation paragraph: partial versus privileged inputs can produce a performance drop, particularly with camera occlusion. It does not establish this illustration coefficients, numeric discrepancy or a universal no-training-budget error floor. The unsupported empirical interpretation is corrected.',
  's24-authored-terrain-noise': 'I checked the24-cell authored sine/step/depression terrain, LCG multiplier48271/modulus2147483647, seeds123456789/987654321, four-decimal fields, sigma3/offsets-6..6 edge-normalized blur,0.06 noise/0.12 same-sign dropout,0.45 input-noise coefficient and0..1 default0.15 control against independent construction and whole-file members. The explicit authored-toy paragraph says not measured robot data and not inference from bars.',
  's24-reconstruction': 'Independent per-cell reconstruction/readings/occlusion and native outputs agree at0,0.15,1. MAE uses unrounded errors; rounding reconstructed cells first is a tested negative control. Divergence is exactly2.2*MAE; default/high MAE0.009894210242181204/0.1709614016145414 and discrepancy0.02176726253279865/0.37611508355199114 are constructed values, not learned action error.',
};
const reviewedBy = 'integrator run f86f6148; integrator review; max';
const observedAt = new Date().toISOString();
for (const plan of additions.plans) {
  for (const part of plan.parts) {
    if (observedText[part.id]) {
      part.text = observedText[part.id];
      rationale[part.id] = `I reviewed this exact output-specific transition group: ${part.text} Actual guarded-port Playwright executed the actions; full rendered DOM text includes the local disclosure and matching readouts, and1440x1000 PNGs have the true viewport dimensions. Inputs bind this same plan parameters. All sibling observation groups remain AND requirements, preserving both mounts and reset defaults. Four final images were manually inspected (friction-wide, reveal-reset, teacher-high, teacher-reset); other states were programmatically checked and captured, not claimed manually image-reviewed.`;
    }
  }
  function review(partId) {
    const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, additions.proofs);
    const reason = partId === null
      ? `I reviewed the complete original/current AND inventory and exact ordered ${plan.parts.length} native parts. The original ${plan.rowOrdinal === 23 ? 7 : 5} obligations all survive; one observed obligation is partitioned into three output-specific subparts, not weakened or expanded into a full registry census. All external passages, authored disclosure, independent arithmetic, exact native receipts and genuine observed transitions are required. Source/body/fetch identity, original cells and failed draft history survive. This is integrator adjudication, not independent validation or release acceptance.`
      : rationale[partId];
    assert(reason, `Unreviewed part ${partId}`);
    const event = save(partId === null ? `s${plan.rowOrdinal}-plan.review.json` : `${partId}.review.json`, {
      schemaVersion: 'local-review-event-v1', sessionId: 'f86f6148', role: 'integrator',
      eventId: `${plan.id}:${partId ?? 'whole-plan'}:${observedAt}`, observedAt, reviewedBy, rationale: reason,
      outcome: 'supported', scope: partId === null ? 'plan' : 'part', partId, inputDigest, inventory: plan.parts,
      originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
    });
    return { reviewedBy, rationale: reason, inputDigest, event, ...(partId === null ? {} : { partId, outcome: 'supported' }) };
  }
  plan.planReview = review(null);
  plan.adjudications = plan.parts.map(p => review(p.id));
}
context.catalog = parseLocalBasisCatalog(context.catalog);
for (const plan of context.catalog.plans) {
  assert.deepEqual(validateLocalBasisPlan(plan, plan.currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context).failures, [], plan.id);
}
const lines = oldMarkdown.split('\n');
for (const plan of additions.plans) {
  const c = plan.currentCells;
  lines[selected[plan.rowOrdinal - 1].line - 1] = '| ' + [c.claim, c.sourceChecked, c.verdict, c.note, '', '', '', plan.id]
    .map(s => s.replaceAll('|', '\\|').replaceAll('\n', '<br>')).join(' | ') + ' |';
}
let markdown = lines.join('\n');
markdown += '\n\n## Sim2real typed-local original and correction history, 2026-09-23\n\n'
  + 'The following exact pre-application tuples and immutable original bindings are non-counted history. Original7/5-part inventories remain in `audit/evidence/sim2real-local-20260923/selected-bindings.json`; all source bodies, raw runs and rejected unreviewed drafts remain untouched. Final9/7-part plans partition each observed obligation into three output-specific groups while retaining every original external AND local obligation.\n\n```json\n'
  + JSON.stringify(bindings.map(b => ({ originalId: b.originalId, rowOrdinal: b.rowOrdinal, currentCells: b.currentCells,
    currentTupleDigest: b.currentTupleDigest, originalBinding: b.originalBinding })), null, 2) + '\n```\n';
const after = parseLedger(ledgerPath, markdown, ids, { compoundPlans: legacy, articleCitations, localBasis: context });
for (const n of [23, 24]) assert.deepEqual(after.find(s => s.slug === 'sim2real-transfer').claimRecords[n - 1].evidenceFailures, []);
markdown = withLedgerSummary(markdown, after);
const deltas = read('contract/brand-v2-approved-deltas.json');
assert.equal(deltas.entries.length, 1039);
for (const [index, path] of ['content/rl-sim2real/sim2real-transfer.mdx', 'components/interactive/teacher-student.tsx'].entries()) {
  // The partial checkpoint changed these members without an approval. Bind
  // from the last actually approved pre-partial member, not a no-op at HEAD.
  const oldSource = execFileSync('git', ['show', `e50e884624ef22b91defe7de6d7468d6353cadb7:${path}`], { encoding: 'utf8' });
  const source = fs.readFileSync(path, 'utf8');
  const prose = path.startsWith('content/');
  const manifest = prose ? 'prose' : 'interactive-sources-mounts';
  const memberId = prose ? `article:${path.slice(8, -4)}` : `source:${path}`;
  const hash = text => buildManifest(manifest, [{ id: memberId, value: prose ? { path, body: matter(text).content.trim() } : { path, source: text } }]).members[0].hash;
  assert.notEqual(hash(oldSource), hash(source));
  const previous = deltas.entries.filter(d => d.manifest === manifest && d.memberId === memberId).at(-1);
  if (previous) assert.equal(previous.newHash, hash(oldSource), 'Approval chain endpoint');
  deltas.entries.push({ id: `sim2real-local-20260923-${index + 1}`, manifest, memberId,
    oldHash: hash(oldSource), newHash: hash(source),
    reason: 'Only sim2real23/24: disclose authored terrain/noise/direct reconstruction and normalized discrepancy, remove unsupported empirical distillation-floor inference, and correct high-terrain color explanation. No formulas, constants, controls, geometry or citation IDs changed.',
    ownerApproval: 'September23 authored-evidence decision and bounded sim2real integrator authorization, including same-assignment round2 at validation/brand-v2-editorial/source-recovery-20260906/convergence-sim2real-local-integration-20260923/authorization.md. Parent current-HEAD preflight3a2903eff31e7ece7eb713cf6cd3f7b856e3a779; not independent acceptance.',
    responsibleMilestone: 'brand-v2-editorial', affectedAssertions: ['VAL-B2-BASE-010', 'VAL-AUDIT-002', 'VAL-AUDIT-009'], disposition: 'permanent',
  });
}
// Preserve every pre-existing object; no legacy plan is removed or rewritten.
assert.deepEqual(context.catalog.plans.slice(0, 3), prior.plans);
assert.deepEqual(context.catalog.proofs.slice(0, 22), prior.proofs);
fs.writeFileSync('audit/local-basis.json', JSON.stringify(context.catalog, null, 2) + '\n');
fs.writeFileSync(ledgerPath, markdown);
fs.writeFileSync('contract/brand-v2-approved-deltas.json', JSON.stringify(deltas, null, 2) + '\n');
console.log(JSON.stringify({ reviewedAt: observedAt, applied: 2, held: 0, addedPlans: 2, nativeParts: 16, originalObligations: 12, proofs: 14, reviewEvents: 18, sourcePairs: 6, approvals: deltas.entries.length }));
