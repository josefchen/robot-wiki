import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CITATIONS } from '../../../data/citations.ts';
import { publishedModules } from '../../../data/modules.ts';
import { originalClaimDigest, parseLedger } from '../../../lib/audit-ledger.ts';
import { loadLocalBasisContext, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { buildManifest } from '../../../lib/brand-v2-baseline.ts';
import matter from 'gray-matter';

const read = (p: string) => readFileSync(p, 'utf8');
const directory = 'audit/evidence/crossdomain-closure-20260923';
const ids = new Set(CITATIONS.map(c => c.id));
const routes = publishedModules().map(m => `/${m.domain}/${m.slug}/`);
const context = loadLocalBasisContext(process.cwd(), routes);
const plans = context.catalog.plans.filter(p => p.id.startsWith('crossdomain-'));
assert.equal(plans.length, 2);
const checked: string[] = [];
for (const plan of plans) {
  assert.deepEqual(validateLocalBasisPlan(plan, plan.currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context).failures, []);
  const mutationKinds = ['missing-proof', 'output', 'review', 'history', 'input-unit', 'dependency', 'tuple'];
  for (const mutation of mutationKinds) {
    const ctx = structuredClone(context);
    const p = ctx.catalog.plans.find(p => p.id === plan.id)!;
    const proof = ctx.catalog.proofs.find(v => v.planId === p.id && v.kind === 'derived-result')!;
    if (mutation === 'missing-proof') ctx.catalog.proofs = ctx.catalog.proofs.filter(v => v.id !== proof.id);
    if (mutation === 'output') proof.expected.values = { ids: [], count: 999 };
    if (mutation === 'review') p.adjudications[0].inputDigest = '0'.repeat(64);
    if (mutation === 'history') p.originalBinding.originalTupleDigest = '0'.repeat(64);
    if (mutation === 'input-unit') proof.bases[0].unit = 'scientific paradigms';
    if (mutation === 'dependency') proof.artifacts[0].file.sha256 = '0'.repeat(64);
    if (mutation === 'tuple') p.currentCells.claim += ' changed';
    assert.ok(validateLocalBasisPlan(p, p.currentCells, p.id,
      { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, ctx).failures.length, mutation);
    checked.push(`${p.id}:${mutation}`);
  }
}
const atBase = (p: string) => execFileSync('git', ['show', `5c48b2eb362be0a7e0fad87855740a208a258647:${p}`],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const old = JSON.parse(atBase('audit/local-basis.json'));
assert.deepEqual(context.catalog.plans.slice(0, 18), old.plans);
assert.deepEqual(context.catalog.proofs.slice(0, 150), old.proofs);
const oldLegacy = JSON.parse(atBase('audit/compound-evidence.json'));
const legacy = JSON.parse(read('audit/compound-evidence.json'));
const archived = JSON.parse(read(`${directory}/superseded-plans.json`));
assert.equal(legacy.length, 858);
assert.deepEqual(oldLegacy.filter((p: { id: string }) => !archived.some((a: { id: string }) => a.id === p.id)), legacy);
assert.deepEqual(oldLegacy.filter((p: { id: string }) => archived.some((a: { id: string }) => a.id === p.id)), archived);
let unselected = 0, total = 0;
for (const domain of ['classical', 'manipulation', 'rl-sim2real', 'world-models', 'data-hardware', 'frontier', 'adjacent']) {
  const path = `audit/${domain}.md`;
  const before = parseLedger(path, atBase(path));
  const after = parseLedger(path, read(path));
  assert.deepEqual(before.map(s => [s.slug, s.claimRows]), after.map(s => [s.slug, s.claimRows]));
  for (const section of after) {
    const prior = before.find(s => s.slug === section.slug)!;
    for (const [index, record] of section.claimRecords.entries()) {
      total++;
      if (plans.some(p => p.originalId === `${path}:${section.slug}:${index + 1}`)) continue;
      assert.deepEqual(record, prior.claimRecords[index]);
      unselected++;
    }
  }
}
assert.equal(total, 994); assert.equal(unselected, 992);
const approvals = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
assert.deepEqual(approvals.slice(0, 1079), JSON.parse(atBase('contract/brand-v2-approved-deltas.json')).entries);
const newApprovals = approvals.filter((a: { id: string }) => a.id.startsWith('crossdomain-closure-20260923-'));
assert.equal(newApprovals.length, 3);
for (const path of ['content/manipulation/generalist-policies.mdx', 'content/world-models/taxonomy.mdx',
  'components/interactive/generalist-release-timeline.tsx']) {
  const prose = path.startsWith('content/');
  const manifest = prose ? 'prose' : 'interactive-sources-mounts';
  const memberId = prose ? `article:${path.slice(8, -4)}` : `source:${path}`;
  const fingerprint = (source: string) => buildManifest(manifest, [{ id: memberId,
    value: prose ? { path, body: matter(source).content.trim() } : { path, source } }]).members[0].hash;
  const approval = newApprovals.find((a: { memberId: string }) => a.memberId === memberId);
  assert.equal(approval.oldHash, fingerprint(atBase(path)));
  assert.equal(approval.newHash, fingerprint(read(path)));
  assert.notEqual(approval.newHash, approval.oldHash);
}
for (const plan of plans) assert.equal(plan.currentTupleDigest, originalClaimDigest(plan.currentCells));
const result = { checkedAt: new Date().toISOString(), completeNewPlans: 2, negativeMutationsRejected: checked,
  priorPlansPreserved: 18, priorProofsPreserved: 150, legacyActive: 858, legacyArchived: 1,
  priorApprovalsPreserved: 1079, approvalsAdded: 3, originalIdentities: total, fullUnselectedRecordsPreserved: unselected };
writeFileSync(`${directory}/native-verification.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
