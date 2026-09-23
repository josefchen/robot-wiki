// One-shot selected-row application after actual whole-inventory review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { CITATIONS } from '../../../data/citations.ts';
import { buildManifest } from '../../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import { localPlanDigest, localPartDigest, parseLocalBasisCatalog, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { ARTICLE, COMPONENT, DIRECTORY, ROUTE, artifact } from './support.ts';

const BASE = '9e4441ecb1c212cc977ba1d94ccd94d169230238';
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), BASE);
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const binding = read(`${DIRECTORY}/selected-binding.json`);
const prior = parseLocalBasisCatalog(read('audit/local-basis.json'));
assert.equal(prior.plans.length, 6); assert.equal(prior.proofs.length, 49);
const additions = parseLocalBasisCatalog(read(`${DIRECTORY}/catalog-bound-draft.json`));
const plan = additions.plans[0];
const legacy = read('audit/compound-evidence.json');
assert.equal(legacy.length, 859);
assert(!legacy.some(p => p.originalId === plan.originalId), 'Unanticipated active legacy target; no permission to alter catalog');
const registry = read('contract/brand-v2-registries.json').interactive;
const ids = new Set(CITATIONS.map(c => c.id));
const articleCitations = Object.fromEntries(fs.readdirSync('content/data-hardware').filter(f => f.endsWith('.mdx'))
  .map(f => [f.slice(0, -4), matter(fs.readFileSync(`content/data-hardware/${f}`, 'utf8')).data.citations]));
const ledgerPath = 'audit/data-hardware.md';
const oldMarkdown = fs.readFileSync(ledgerPath, 'utf8');
const context = { root: process.cwd(), catalog: prior, registry,
  publishedRoutes: [ROUTE, '/rl-sim2real/parallel-sim-rl/', '/rl-sim2real/reward-design-mpc/', '/rl-sim2real/sim2real-transfer/'] };
const before = parseLedger(ledgerPath, oldMarkdown, ids, { compoundPlans: legacy, articleCitations, localBasis: context });
const selected = before.find(s => s.slug === 'industrial-deployment').claimRecords[51];
assert.equal(originalClaimDigest(selected), '051dea589332e8976bfef45afcfb4b5f45f17827dc31c106bef1f476caf20a84');
assert.equal(originalClaimDigest(selected), binding.currentTupleDigest);
for (const k of ['claim','sourceChecked','verdict','note']) assert.equal(selected[k], binding.currentCells[k]);
assert.equal(plan.originalBinding.originalTupleDigest, '82e25ed8ad6381edd7ae91d5a247ead79a3185c9b3e113a1b5501b00f344b864');
assert.equal(plan.originalBinding.originalCells.verdict, 'Unresolved (component files are out of my edit scope; recorded below)');

const rationale = {
 'i52-evst-scope': 'I read the complete retained21932-byte EVST readable representation and verified it and the236502-byte raw HTML against original provenance hashes. The actual payload-section text expressly defines complete-cell budgets, including robot, EOAT, safety, integration and programming, not robot-only list prices. The footnote states no fixed list prices and points to a configuration-specific quote; the FAQ is consistent but has different wording. Neither gives the invented25000..80000 arm-price range. The corrected note says not a sourced quote, not universal absence of arm prices. EVST is a commercial vendor speaking for its own guide, not independent pricing research. September6 final curl200 is historical; no headers/redirect chain or new request is claimed.',
 'i52-vendor-context': 'I read the opening complete-cell capex paragraph, two-to-three-times context, body share, table and payback illustration together. The one bound contiguous passage preserves third-to-half robot share,12..24months in multi-shift operation and the24..36 single-shift/lower-throughput qualification, including labour plus damage/throughput savings in the vendor formula. The local calculator instead uses chosen2.5 and24 and only modeled labour value; these are explicit reader disclosures, not source quotations or measured outcomes. Two excerpts initially violated the native one-pair rule; the final single contiguous passage includes both and all intervening context without changing source text.',
 'i52-authored-price-and-inputs': 'I checked the reader-local authored/not-measured paragraph, seven slider notes and parameter output:80000USD default,20000..250000/5000step, integration2.5,cycle6s,uptime95%,success99.9%,jam15s,wage25USD/hour, all seven complete ranges/steps,730hours/month,60months amortization and24month chosen target. Model constants/defaults/ranges and control geometry are unchanged. Every derived input uses an equal same-plan authored pointer with native units. Existing capital-only modeled-pick and no-running-cost disclosure is intact. The broad no-source-anywhere statement is removed.',
 'i52-price-arithmetic': 'I reviewed the independent elapsed-hour oracle, red/producer results and final output values. At robot20000/80000/250000 with fixed other defaults, capital is50000/200000/625000; payback is2.891131939437634/11.564527757750536/36.139149242970426months and capital cost/pick is0.0020077305134983572/0.008030922053993429/0.025096631418729465USD. Throughput568.5785536159602picks per elapsed hour, monthly415062.344139651picks and labour17294.264339152127USD are common. Productive3411.471321695761s + jam8.52867830423892s + downtime180s =3600. All seven input clamps and nonfinite fallbacks were independently checked. Exact formatting yields0.002/2.9,0.008/11.6,0.025/36.1 with the final verdict outside24. This is authored arithmetic, not a deployment forecast.',
};
for (const part of plan.parts.filter(p => p.kind === 'observed-behavior')) rationale[part.id] =
 `I reviewed the exact real observation group: ${part.text} Actual Playwright controls, current values, bounds/steps, chosen-price note, capital/picks summary, readouts, verdict and hourly shares/seconds match the independent oracle. Default/min/max/Reset/mobile captures and full real rendered DOM are retained; each proof covers all transitions required by its own group. I manually inspected default,max and mobile-default images: desktop calculator and readouts render cleanly;375px shows upper controls and note without overflow, while lower controls/readouts and disclosure continue below the screenshot and were DOM-tested, not claimed visually visible. Desktop/mobile Axe and error checks passed. Initial CSSOM5% versus5.0% test failure and a repair import typo are retained; only the failed producer reran, the12 green existing route tests were not repeated.`;
const observedAt = read(`${DIRECTORY}/plan.review.json`).observedAt;
const reviewedBy = 'Droid integrator f86f6148-94a8-4312-bf35-13bdf5c6d211; custom:droidproxy:gpt-6-astra; max';
function review(partId) {
 const inputDigest = partId === null ? localPlanDigest(plan) : localPartDigest(plan, partId, additions.proofs);
 const reason = partId === null ? 'I reviewed the exact whole original/current five-obligation AND inventory: two external parts, authored parameters, all three independent price calculations, and five real mounted states. Seven native parts partition only the mounted obligation by output price; none is dropped. The genuine first historical Unresolved snapshot/tuple and full prior C/HELD correction history remain intact. Exact source identity, historical retrieval limitations, chosen assumptions, capital-only units and actual browser outputs are distinguished. This is one integration review, not independent Sol/high validation, whole-article cleanliness or release acceptance.' : rationale[partId];
 assert(reason);
 const name = partId === null ? 'plan.review.json' : `${partId}.review.json`;
 const expected = {
  schemaVersion: 'local-review-event-v1', sessionId: 'f86f6148-94a8-4312-bf35-13bdf5c6d211', role: 'integrator',
  eventId: `${plan.id}:${partId ?? 'plan'}:${observedAt}`, observedAt, reviewedBy, rationale: reason, outcome: 'supported',
  scope: partId === null ? 'plan' : 'part', partId, inputDigest, inventory: plan.parts,
  originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
 };
 assert.deepEqual(read(`${DIRECTORY}/${name}`), expected);
 const event = artifact(`${DIRECTORY}/${name}`);
 return { reviewedBy, rationale: reason, inputDigest, event, ...(partId === null ? {} : { partId, outcome: 'supported' }) };
}
plan.planReview = review(null); plan.adjudications = plan.parts.map(p => review(p.id));
context.catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans: [...prior.plans, plan], proofs: [...prior.proofs, ...additions.proofs] });
for (const p of context.catalog.plans) assert.deepEqual(validateLocalBasisPlan(p,p.currentCells,p.id,{citationId:'',sourceUrl:'',supportingPassage:''},ids,context).failures,[],p.id);
const lines = oldMarkdown.split('\n'); const c = plan.currentCells;
lines[selected.line - 1] = '| ' + [c.claim,c.sourceChecked,c.verdict,'','','',c.note,plan.id].map(s=>s.replaceAll('|','\\|').replaceAll('\n','<br>')).join(' | ') + ' |';
let markdown = lines.join('\n') + '\n\n## Economics52 typed-local original and correction history, 2026-09-23\n\nNon-counted exact history preserves the first Unresolved tuple and complete preceding C/HELD cells, including the withdrawn September17 scalar completion. All five original obligations remain required; only the mounted obligation is partitioned into three price-specific groups. No active legacy plan targeted this row and audit/compound-evidence.json is unchanged.\n\n```json\n' + JSON.stringify({ originalId: binding.originalId, rowOrdinal:52, beforeCells:binding.currentCells, beforeTupleDigest:binding.currentTupleDigest, originalBinding:binding.originalBinding },null,2) + '\n```\n';
const after = parseLedger(ledgerPath,markdown,ids,{compoundPlans:legacy,articleCitations,localBasis:context});
assert.deepEqual(after.find(s=>s.slug==='industrial-deployment').claimRecords[51].evidenceFailures,[]);
markdown = withLedgerSummary(markdown,after);
const deltaText = fs.readFileSync('contract/brand-v2-approved-deltas.json','utf8');
const deltas = JSON.parse(deltaText);assert.equal(deltas.entries.length,1042);
const newDeltas = [ARTICLE,COMPONENT].map((path,i)=>{
 const isArticle=path===ARTICLE;const manifest=isArticle?'prose':'interactive-sources-mounts';
 const memberId=isArticle?'article:data-hardware/industrial-deployment':`source:${COMPONENT}`;
 const hash=source=>buildManifest(manifest,[{id:memberId,value:isArticle?{path,body:matter(source).content.trim()}:{path,source}}]).members[0].hash;
 const oldHash=hash(execFileSync('git',['show',`${BASE}:${path}`],{encoding:'utf8'}));const newHash=hash(fs.readFileSync(path,'utf8'));assert.notEqual(oldHash,newHash);
 const previous=deltas.entries.filter(d=>d.manifest===manifest&&d.memberId===memberId).at(-1);if(previous)assert.equal(previous.newHash,oldHash);
 return {id:`economics-local-20260923-${i+1}`,manifest,memberId,oldHash,newHash,
  reason:'Only industrial52: disclose chosen robot cost, full authored model assumptions and vendor-context limits; label throughput per elapsed hour. Preserve capital-only modeled picks. No formula, default, range, control, geometry, citation or other article-claim changes.',
  ownerApproval:'Owner authored-evidence decision and bounded economics52 authorization at /home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/convergence-economics-local-integration-20260923/authorization.md; parent9e4441e identity rechecked at application.',
  responsibleMilestone:'brand-v2-editorial',affectedAssertions:['VAL-B2-BASE-010','VAL-AUDIT-004','VAL-AUDIT-009'],disposition:'permanent'};
});
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

const catalogText = fs.readFileSync('audit/local-basis.json','utf8');
let updated=append(catalogText,'plans',[plan]);updated=append(updated,'proofs',additions.proofs);assert.deepEqual(JSON.parse(updated),context.catalog);
const updatedDeltas=append(deltaText,'entries',newDeltas);assert.deepEqual(JSON.parse(updatedDeltas).entries.slice(0,1042),deltas.entries);
fs.writeFileSync('audit/local-basis.json',updated);fs.writeFileSync('contract/brand-v2-approved-deltas.json',updatedDeltas);fs.writeFileSync(ledgerPath,markdown);
console.log(JSON.stringify({reviewedAt:observedAt,appliedAt:new Date().toISOString(),applied:1,held:0,parts:7,originalObligations:5,proofs:7,reviews:8,externalPairs:2,legacyPlans:859,typedPlans:7,typedProofs:56,approvals:1044}));
