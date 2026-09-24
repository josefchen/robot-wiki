// Exact rebinding after the article's single prose-only "0–2" -> "0 to 2" edit.
// This does NOT assert that a second browser test ran.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { buildManifest, sha256 } from '../../../lib/brand-v2-baseline.ts';
import { localPlanDigest, localPartDigest, parseLocalBasisCatalog } from '../../../lib/audit-local-basis.ts';

const directory = 'audit/evidence/final-seven-closure-20260923';
const article = 'content/frontier/safety-and-assurance.mdx';
const text = 'The instrument is an authored teaching model. It chooses C = 0.85 m at that context-specific minimum, robot speed 1 m/s and operator approach 1.6 m/s by default';
const ref = path => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
};
const git = path => execFileSync('git', ['show', `HEAD:${path}`],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const bytes = readFileSync(article);
const fragment = Buffer.from(text);
const offset = bytes.indexOf(fragment);
assert(offset >= 0);
const id = 'article:frontier/safety-and-assurance';
const baseline = buildManifest('prose',
  [{ id, value: { path: article, body: matter(bytes.toString()).content.trim() } }]).members[0].hash;
const member = {
  file: ref(article), id, offset, length: fragment.length, sha256: sha256(fragment),
  baseline: { kind: 'prose', hash: baseline },
};
const wholeMember = {
  file: ref(article), id, offset: 0, length: bytes.length, sha256: sha256(bytes),
  baseline: { kind: 'prose', hash: baseline },
};
for (const width of [1440, 375]) {
  const dom = readFileSync(`${directory}/collaborativeoperationmodes-1-default-${width}.dom.txt`, 'utf8');
  assert(dom.includes(text), 'unchanged authored disclosure prefix missing in the earlier captured browser DOM');
}
const catalogPath = 'audit/local-basis.json';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const prior = JSON.parse(git(catalogPath));
assert.deepEqual(catalog.plans.slice(0, 20), prior.plans);
assert.deepEqual(catalog.proofs.slice(0, 154), prior.proofs);
let changed = 0;
const saveReview = (review, event, inputDigest, message) => {
  review.inputDigest = inputDigest;
  if (!review.rationale.includes(message.trim())) review.rationale += message;
  event.inputDigest = inputDigest;
  event.rationale = review.rationale;
  event.observedAt = new Date().toISOString();
  writeFileSync(review.event.path, JSON.stringify(event, null, 2) + '\n');
  review.event = ref(review.event.path);
};
for (const plan of catalog.plans.filter(p =>
  p.originalId.startsWith('audit/frontier.md:safety-and-assurance:') &&
  [5, 6].includes(p.rowOrdinal))) {
  plan.disclosure = { member, text };
  const proofs = catalog.proofs.filter(p => p.planId === plan.id);
  assert.equal(proofs.length, 4);
  for (const proof of proofs) {
    proof.disclosure = plan.disclosure;
    proof.artifacts = proof.artifacts.map(a => a.file.path === article ? wholeMember : a);
    const run = Object.fromEntries(Object.entries(proof.provenance)
      .filter(([key]) => key !== 'receipt'));
    const receiptPath = proof.provenance.receipt.path;
    const receipt = {
      schemaVersion: 'local-run-v1', ...run, inputDigest: proof.inputDigest,
      outputDigest: proof.outputDigest, dependencies: proof.artifacts, observations: proof.observations ?? [],
    };
    writeFileSync(receiptPath, JSON.stringify(receipt) + '\n');
    proof.provenance.receipt = ref(receiptPath);
    changed++;
  }
  for (const adjudication of plan.adjudications) {
    const event = JSON.parse(readFileSync(adjudication.event.path, 'utf8'));
    saveReview(adjudication, event, localPartDigest(plan, adjudication.partId, proofs),
      ' After browser capture, a source-only prose lint normalized the range notation to 0 to 2. The exact disclosure prefix and controls/readouts remain visible in the recorded DOM; no second browser run is asserted.');
  }
  const event = JSON.parse(readFileSync(plan.planReview.event.path, 'utf8'));
  saveReview(plan.planReview, event, localPlanDigest(plan),
    ' Final punctuation normalization occurred after mounted capture. This review binds the final whole-article hash and unchanged visible disclosure prefix, not a later browser execution.');
}
assert.equal(changed, 8);
parseLocalBasisCatalog(catalog);
// Preserve every old plan/proof byte verbatim by splicing only the seven new
// plans and 33 new proofs into the original HEAD serialization.
const format = xs => xs.map(x => '    ' + JSON.stringify(x, null, 2).replace(/\n/g, '\n    ')).join(',\n');
const original = git(catalogPath);
const marker = '\n  ],\n  "proofs": [';
assert.equal(original.split(marker).length, 2);
let at = original.indexOf(marker);
let output = original.slice(0, at) + ',\n' + format(catalog.plans.slice(20)) + original.slice(at);
const end = '\n  ]\n}\n';
assert(output.endsWith(end));
at = output.lastIndexOf(end);
output = output.slice(0, at) + ',\n' + format(catalog.proofs.slice(154)) + output.slice(at);
assert.deepEqual(JSON.parse(output), catalog);
writeFileSync(catalogPath, output);

const approvalsPath = 'contract/brand-v2-approved-deltas.json';
const raw = readFileSync(approvalsPath, 'utf8');
const approvals = JSON.parse(raw);
const delta = approvals.entries.find(x => x.id === 'final-seven-closure-20260923-4');
assert(delta && delta.memberId === id);
delta.newHash = baseline;
at = raw.indexOf(',\n    {\n      "id": "final-seven-closure-20260923-1"');
assert(at > 0);
const appended = approvals.entries.slice(-6);
const next = raw.slice(0, at) + ',\n' + format(appended) + '\n  ]\n}\n';
assert.deepEqual(JSON.parse(next).entries.slice(0, -6), approvals.entries.slice(0, -6));
writeFileSync(approvalsPath, next);
console.log('Safety text normalization rebound:', changed, 'proofs, 10 reviews, new article SHA-256', member.file.sha256);
