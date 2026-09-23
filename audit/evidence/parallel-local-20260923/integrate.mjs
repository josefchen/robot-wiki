// One-shot bounded transaction, after actual source/output/image review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { buildManifest } from '../../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import { localPlanDigest, localPartDigest, parseLocalBasisCatalog, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { ARTICLE, DIRECTORY, ROUTE, save } from './support.ts';

const BASE = '9a7860420e316bdb9b721c2245a894df8902ad1e';
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), BASE);
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const binding = read(`${DIRECTORY}/selected-binding.json`);
const prior = parseLocalBasisCatalog(read('audit/local-basis.json'));
assert.equal(prior.plans.length, 5);
assert.equal(prior.proofs.length, 36);
const additions = parseLocalBasisCatalog(read(`${DIRECTORY}/bound-catalog-draft.json`));
const plan = additions.plans[0];
const legacyText = fs.readFileSync('audit/compound-evidence.json', 'utf8');
const legacy = JSON.parse(legacyText);
assert.equal(legacy.length, 860);
const retired = read(`${DIRECTORY}/legacy-plan-original.json`);
assert.deepEqual(legacy.find(p => p.id === retired.id), retired);
const registry = read('contract/brand-v2-registries.json').interactive;
const ids = new Set(CITATIONS.map(c => c.id));
const articleCitations = Object.fromEntries(fs.readdirSync('content/rl-sim2real').filter(f => f.endsWith('.mdx'))
  .map(f => [f.slice(0, -4), matter(fs.readFileSync(`content/rl-sim2real/${f}`, 'utf8')).data.citations]));
const ledgerPath = 'audit/rl-sim2real.md';
const oldMarkdown = fs.readFileSync(ledgerPath, 'utf8');
const context = { root: process.cwd(), catalog: prior, registry,
  publishedRoutes: [ROUTE, '/rl-sim2real/reward-design-mpc/', '/rl-sim2real/sim2real-transfer/'] };
const before = parseLedger(ledgerPath, oldMarkdown, ids, { compoundPlans: legacy, articleCitations, localBasis: context });
const selected = before.find(s => s.slug === 'parallel-sim-rl').claimRecords[17];
assert.equal(originalClaimDigest(selected), 'f17a3fd555b9708f82c3bed9711c059c50804e989722b4563ab62914e8f7cdc0');
assert.equal(originalClaimDigest(selected), binding.currentTupleDigest);

const rationale = {
  'p18-rudin-flat-bound': 'I read the actual retained abstract: flat policies in under four minutes, uneven terrain in twenty. It does not bind the flat run to4096 environments or say4min equality. The flat diamond is explicitly an authored x choice and a plotted upper-bound y. September6 FetchUrl full-body bytes match the original response; unversioned ar5iv is not a v3 body pin or a new retrieval.',
  'p18-rudin-rough-protocol': 'I read the retained simulation/deployment paragraph and adjacent hardware footnote:4096 robots,98304 batch,1500 updates, under20min, i9-11900k and RTX A6000. The24 steps per robot is the quotient98304/4096, not an invented literal quotation or a configuration transferred to the flat run. The paper budget1500*98304=147456000 differs from the chosen220000000 transitions; independent tests reject treating them as equal.',
  'p18-isaac-measured-anchors': 'I read the actual v1 Section4.1 and4.1.1 text, equation and Figure13 caption. Headless state-only DextrAH grasp/lift and Franka cabinet training exceeds900k/1.6M FPS at eight RTX PRO6000 GPUs and16384 environments. FPS is environment steps/(simulation+learning time), not camera-only or robot-control Hz. The source identifies distributed RTX PRO6000 and dual EPYC9554 hardware. These original anchors remain explicit external obligations, not hidden in notes or borrowed credit from rows8/9.',
  'p18-isaac-cpu-context': 'I read the v1 hardware and comparison paragraphs together: 5090/8-core9800X3D comes close to the two-GPU RTX PRO6000 server on Franka, with distinct DextrAH behavior and task-dependent CPU bottlenecks in PhysX/main loop. Dual EPYC9554 server context remains. This motivates a toy toggle, not the chosen per-environment CPU cost or a universal measured curve.',
  'p18-authored-cost-model': 'I checked the explicit reader-local authored/not-benchmark disclosure against whole model/component/article members and fresh native parameter extraction.220M target,24 rollout, default4096/CPUoff,64..16384 endpoints,49samples, cost seconds[.02,.000004,.04,.03,.000022], and both marker x values4096 are chosen inputs. Paper time bounds are not recast as authored measurements. Every derived input has an exact same-plan parameter pointer, including both CPU booleans and endpoint domains.',
  'p18-cost-arithmetic': 'Independent closed-form time=(220M/24)*(.09/envs+marginal) and FPS=24/(.09/envs+marginal) agree at64/4096/16384 in both CPU modes; every one of49 samples matches an independent sixth-octave grid. Raw time*FPS=220M; rounded readouts alone are not the oracle. Default238.08268229166666s/924048.7291322002FPS and max-off87.02067057291667s versus max-on288.6873372395833s are local results. Crossover12500 exists only CPUoff. Rounding, iteration/bucket displays and exact SVG coordinates were also checked in the actual mounted producer.',
};
for (const part of plan.parts.filter(p => p.kind === 'observed-behavior')) rationale[part.id] =
  `I reviewed this exact output-specific group: ${part.text} Real Playwright actions and DOM captures witness all its named transitions, matching the independent numeric output and same-plan input bases. Full rendered DOM includes the disclosure, both bound labels and readouts; true viewport PNG dimensions are retained. Default, max-on and mobile-default screenshots were manually inspected; other captures were programmatically checked, not claimed manually inspected. Mobile chart/control/readouts are visible; lower explanatory prose continues below the viewport, so this is not a full-mobile-page visibility claim. All sibling groups remain mandatory.`;
const observedAt = new Date().toISOString();
const reviewedBy = 'Droid integrator f86f6148-94a8-4312-bf35-13bdf5c6d211; custom:droidproxy:gpt-6-astra; max';
function review(partId) {
  const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, additions.proofs);
  const reason = partId === null
    ? 'I reviewed the exact complete original/current seven-obligation AND inventory, now12 native parts because the one mounted obligation has six output-specific siblings. Four external obligations, one authored model, all six independent numerical combinations and all eight real observations remain required. Original tuple/raw snapshot, retired legacy plan, source provenance and failed draft survive. One actual integration, not independent validation, whole-article cleanliness or release acceptance.'
    : rationale[partId];
  assert(reason);
  const event = save(partId === null ? 'plan.review.json' : `${partId}.review.json`, {
    schemaVersion: 'local-review-event-v1', sessionId: 'f86f6148-94a8-4312-bf35-13bdf5c6d211',
    role: 'integrator', eventId: `${plan.id}:${partId ?? 'plan'}:${observedAt}`,
    observedAt, reviewedBy, rationale: reason, outcome: 'supported',
    scope: partId === null ? 'plan' : 'part', partId, inputDigest, inventory: plan.parts,
    originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
  });
  return { reviewedBy, rationale: reason, inputDigest, event, ...(partId === null ? {} : { partId, outcome: 'supported' }) };
}
plan.planReview = review(null);
plan.adjudications = plan.parts.map(p => review(p.id));
context.catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1',
  plans: [...prior.plans, plan], proofs: [...prior.proofs, ...additions.proofs] });
for (const p of context.catalog.plans) assert.deepEqual(validateLocalBasisPlan(p, p.currentCells, p.id,
  { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context).failures, [], p.id);
const lines = oldMarkdown.split('\n');
const c = plan.currentCells;
lines[selected.line - 1] = '| ' + [c.claim, c.sourceChecked, c.verdict, c.note, '', '', '', plan.id]
  .map(s => s.replaceAll('|', '\\|').replaceAll('\n', '<br>')).join(' | ') + ' |';
let markdown = lines.join('\n') + '\n\n## Parallel18 typed-local original and correction history, 2026-09-23\n\n'
  + 'Non-counted exact history: the old four cells, original binding and selected retired legacy plan follow. All seven original obligations remain mandatory; only the one observed obligation is partitioned by six distinct input combinations. Failed unreviewed draft and original source bodies remain intact in audit/evidence/parallel-local-20260923/.\n\n```json\n'
  + JSON.stringify({ originalId: binding.originalId, rowOrdinal: 18, beforeCells: binding.currentCells,
    beforeTupleDigest: binding.currentTupleDigest, originalBinding: binding.originalBinding, retiredLegacyPlan: retired }, null, 2) + '\n```\n';
const remaining = legacy.filter(p => p.id !== retired.id);
assert.equal(remaining.length, 859);
const after = parseLedger(ledgerPath, markdown, ids, { compoundPlans: remaining, articleCitations, localBasis: context });
assert.deepEqual(after.find(s => s.slug === 'parallel-sim-rl').claimRecords[17].evidenceFailures, []);
markdown = withLedgerSummary(markdown, after);
const deltaText = fs.readFileSync('contract/brand-v2-approved-deltas.json', 'utf8');
const deltas = JSON.parse(deltaText);
assert.equal(deltas.entries.length, 1041);
const memberId = 'article:rl-sim2real/parallel-sim-rl';
const proseHash = source => buildManifest('prose', [{ id: memberId, value: { path: ARTICLE, body: matter(source).content.trim() } }]).members[0].hash;
const oldHash = proseHash(execFileSync('git', ['show', `${BASE}:${ARTICLE}`], { encoding: 'utf8' }));
const newHash = proseHash(fs.readFileSync(ARTICLE, 'utf8'));
assert.notEqual(oldHash, newHash);
assert.equal(deltas.entries.filter(d => d.manifest === 'prose' && d.memberId === memberId).at(-1).newHash, oldHash);
const delta = { id: 'parallel-local-20260923-1', manifest: 'prose', memberId, oldHash, newHash,
  reason: 'Only parallel18: distinguish authored220M fixed-budget comparison, chosen costs/defaults/49-point grid and flat-marker x from empirical training measurements. No formulas, controls, geometry or citation IDs changed.',
  ownerApproval: 'Owner authored-evidence decision and exact bounded parallel18 authorization at /home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/convergence-parallel-local-integration-20260923/authorization.md; parent preflight9a78604 rechecked at application.',
  responsibleMilestone: 'brand-v2-editorial', affectedAssertions: ['VAL-B2-BASE-010', 'VAL-AUDIT-002', 'VAL-AUDIT-009'], disposition: 'permanent' };

// Find top-level JSON array entries while preserving old serialized bytes.
function spans(text, key) {
  const start = key ? new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text).index + new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text)[0].length : text.indexOf('[') + 1;
  const entries = [];
  let pos = start;
  while (true) {
    while (/\s|,/.test(text[pos])) pos++;
    if (text[pos] === ']') return { start, end: pos, entries };
    const from = pos;
    let depth = 0, quoted = false, escaped = false;
    for (; pos < text.length; pos++) {
      const ch = text[pos];
      if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue; }
      if (ch === '"') quoted = true;
      else if ('[{'.includes(ch)) depth++;
      else if (']}'.includes(ch) && --depth === 0) { pos++; break; }
    }
    entries.push({ from, to: pos, raw: text.slice(from, pos) });
  }
}
function append(text, key, values) {
  const a = spans(text, key);
  const content = values.map(v => JSON.stringify(v, null, 2).split('\n').map(l => `    ${l}`).join('\n')).join(',\n');
  return text.slice(0, a.end).trimEnd() + ',\n' + content + '\n  ' + text.slice(a.end);
}
const catalogText = fs.readFileSync('audit/local-basis.json', 'utf8');
let updated = append(catalogText, 'plans', [plan]);
updated = append(updated, 'proofs', additions.proofs);
assert.deepEqual(JSON.parse(updated), context.catalog);
const a = spans(legacyText);
const index = legacy.findIndex(p => p.id === retired.id);
const from = index === 0 ? a.entries[index].from : a.entries[index - 1].to;
const to = index === 0 ? a.entries[1].from : a.entries[index].to;
const remainingText = legacyText.slice(0, from) + legacyText.slice(to);
assert.deepEqual(JSON.parse(remainingText), remaining);
const updatedDeltas = append(deltaText, 'entries', [delta]);
assert.deepEqual(JSON.parse(updatedDeltas).entries.slice(0, 1041), deltas.entries);
fs.writeFileSync('audit/local-basis.json', updated);
fs.writeFileSync('audit/compound-evidence.json', remainingText);
fs.writeFileSync('contract/brand-v2-approved-deltas.json', updatedDeltas);
fs.writeFileSync(ledgerPath, markdown);
console.log(JSON.stringify({ reviewedAt: observedAt, applied: 1, held: 0, parts: 12, originalObligations: 7, proofs: 13,
  reviews: 13, externalPairs: 4, legacyPlans: remaining.length, typedPlans: context.catalog.plans.length, approvals: 1042 }));
