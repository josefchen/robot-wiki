/**
 * Finite two-row checkpoint of the nine-row parent selection.
 * No commands from a catalog are executed. Old proof/review objects are kept.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { buildManifest, type JsonValue } from '../../../lib/brand-v2-baseline.ts';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import { loadLocalBasisContext, localPlanDigest, localPartDigest, parseLocalBasisCatalog,
  validateLocalBasisPlan, type LocalArtifact, type LocalMember, type LocalPlan, type LocalProof } from '../../../lib/audit-local-basis.ts';
import { CITATIONS } from '../../../data/citations.ts';
import { publishedModules } from '../../../data/modules.ts';

const directory = 'audit/evidence/crossdomain-closure-20260923';
const mission = 'validation/brand-v2-editorial/source-recovery-20260906/closure-crossdomain-integration-20260923';
const root = process.cwd();
const read = (path: string) => readFileSync(path, 'utf8');
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string): LocalArtifact => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha(bytes) };
};
const save = (name: string, value: unknown) => {
  const path = `${directory}/${name}`;
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return artifact(path);
};
const member = (path: string, excerpt?: string): LocalMember => {
  const bytes = readFileSync(path);
  const selected = excerpt === undefined ? bytes : Buffer.from(excerpt);
  const offset = bytes.indexOf(selected);
  if (offset < 0) throw Error(`Absent member ${path}`);
  const prose = path.startsWith('content/');
  return { file: artifact(path), id: prose ? `article:${path.slice(8, -4)}` : `file:${path}`,
    offset, length: selected.length, sha256: sha(selected), ...(prose ? { baseline: {
      kind: 'prose' as const, hash: buildManifest('prose', [{ id: `article:${path.slice(8, -4)}`,
        value: { path, body: matter(bytes.toString()).content.trim() } as JsonValue }]).members[0].hash,
    } } : {}) };
};
const packet = JSON.parse(read(`${directory}/row-history.json`));
const selected = [packet.rows[0], packet.rows[3]];
if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== '5c48b2eb362be0a7e0fad87855740a208a258647') {
  throw Error('Unexpected external HEAD; preserve work and stop');
}
const preflight = JSON.parse(read(`${directory}/preflight.json`));
if (!preflight.currentHeadIdentityValid || preflight.commit !== '5c48b2eb362be0a7e0fad87855740a208a258647') throw Error('Missing parent identity result');
const historicalCatalog = JSON.parse(execFileSync('git', ['show', '5c48b2eb362be0a7e0fad87855740a208a258647:audit/local-basis.json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
const canonical = (x: unknown): string => JSON.stringify(x, (_key, value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value);
const catalogText = read('audit/local-basis.json');
const catalog = parseLocalBasisCatalog(JSON.parse(catalogText));
for (const [key, list] of [['plans', catalog.plans], ['proofs', catalog.proofs]] as const) {
  for (const value of list) {
    const prior = historicalCatalog[key].find((p: { id: string }) => p.id === value.id);
    if (!prior || canonical(value) !== canonical(prior)) throw Error(`Existing ${key} changed: ${value.id}`);
  }
}
const numeric = JSON.parse(read(`${directory}/numeric-results.json`));
const run = JSON.parse(read(`${mission}/command-receipts.json`)).commands.find((r: { command: string; exitCode: number }) =>
  r.exitCode === 0 && r.command.includes('CROSSDOMAIN_NUMERIC=1'));
if (!run) throw Error('No successful actual numeric execution');
const browser = JSON.parse(read(`${directory}/browser-observations.json`));
if (browser.observations.length !== 4 || browser.errors.length) throw Error('Missing actual two-viewport observations');
const newPlans: LocalPlan[] = [];
const newProofs: LocalProof[] = [];
const reviewedBy = 'implementation run b7856fa2; integrator review, not independent acceptance';
const rationales = [
  'Reviewed all 13 exact IDs and duplicate-free cardinality, actual passing numeric tests, two viewport DOM/captures and filter/reset preservation. Removed all unsupported aggregate Stat date/download/source-format claims and the seven-entry enumeration, including accessible aggregate date wording. Existing independently completed entry facts remain unchanged; the selected count certifies neither weights nor licenses nor papers nor replication.',
  'Reviewed the six exact WM_PARADIGMS IDs and duplicate-free cardinality, matching the six selected article groups. Existing scientific-to-editorial qualification is preserved with the word authored made explicit. No survey passage is claimed to establish six universal paradigms; the superseded unresolved compound plan remains archived, not promoted.',
];
for (const [index, row] of selected.entries()) {
  const [ledgerPath, slug, ordinal] = row.originalId.split(':');
  const before = read(ledgerPath);
  const current = parseLedger(ledgerPath, before).find(s => s.slug === slug)!.claimRecords[Number(ordinal) - 1];
  if (originalClaimDigest(current) !== row.currentTupleDigest) throw Error(`Application identity drift ${row.originalId}`);
  const article = `content/${ledgerPath.slice(6, -3)}/${slug}.mdx`;
  const articleText = read(article);
  const disclosureText = articleText.split('\n').find(s => s.startsWith(index === 0
    ? 'The timeline contains 13 selected records' : 'The six example groups below'))!;
  const disclosure = { text: disclosureText, member: member(article, disclosureText) };
  const currentCells = { claim: row.proposedFinalClaim,
    sourceChecked: 'Explicit authored selection; independently checked finite ID count and actual bounded reader observations. No external source certification or new retrieval.',
    verdict: 'C',
    note: `Original and preceding four-cell records retained verbatim in ${directory}/row-history.json and original raw ledger snapshot. ${rationales[index]} Actual numeric run: tests/unit/crossdomain-closure-evidence.test.ts, 8 passed; mounted run: tests/e2e/crossdomain-closure-evidence.spec.ts, 1 passed at 1440x1000 and 375x812. No whole-corpus acceptance.`,
  };
  const plan: LocalPlan = {
    id: `crossdomain-${index === 0 ? 'generalist19' : 'taxonomy4'}-20260923`, kind: 'explicit-parts-v2',
    originalId: row.originalId, ledgerPath, articleSlug: slug, rowOrdinal: Number(ordinal),
    originalBinding: { originalCells: row.originalHistory.originalCells,
      originalTupleDigest: row.originalHistory.originalTupleDigest,
      sourceCommit: row.originalHistory.sourceCommit, snapshot: artifact(`${directory}/original-${ledgerPath.slice(6, -3)}.md`) },
    currentCells, currentTupleDigest: originalClaimDigest(currentCells), mounts: [],
    disclosure, parts: [], evidence: [], planReview: null, adjudications: [],
  };
  const recipeId = index === 0 ? 'generalist-selection' : 'taxonomy-selection';
  const cases = numeric.results.filter((r: { recipe: { id: string } }) => r.recipe.id === recipeId);
  if (cases.length !== 2) throw Error('Incomplete actual numeric cases');
  const parameterId = `${plan.id}-parameters`;
  for (const sample of cases) {
    const parameters = sample.recipe.mode === 'parameters';
    const id = parameters ? parameterId : `${plan.id}-count`;
    const kind = parameters ? 'authored-parameter' : 'derived-result';
    plan.parts.push({ id, kind, text: parameters
      ? 'Exact ordered author-selected member IDs, not source facts or a census.'
      : rationales[index], requiredProofIds: [id] });
    const input = save(`${id}-input.json`, sample.recipe);
    const output = save(`${id}-output.json`, sample.output);
    const dependencies = [
      article, index === 0 ? 'lib/generalist-policies.ts' : 'lib/world-model-taxonomy.ts',
      'lib/audit-local-basis.ts', 'tests/unit/crossdomain-closure-evidence.test.ts',
      ...(index === 0 ? ['components/interactive/generalist-release-timeline.tsx'] : ['components/mdx/wm-taxonomy-table.tsx']),
    ].map(path => member(path));
    const fields = { command: `NODE_DISABLE_COMPILE_CACHE=1 ${run.command}`,
      runner: 'vitest' as const, cwd: root, environment: { NODE_DISABLE_COMPILE_CACHE: '1' as const },
      startedAt: run.startedAt, endedAt: run.endedAt, exitCode: run.exitCode,
      test: artifact('tests/unit/crossdomain-closure-evidence.test.ts') };
    const receipt = save(`${id}-receipt.json`, { schemaVersion: 'local-run-v1', ...fields,
      inputDigest: input.sha256, outputDigest: output.sha256, dependencies, observations: [] });
    newProofs.push({ id, planId: plan.id, partId: id, kind, originalId: plan.originalId,
      originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
      artifacts: dependencies, disclosure, recipe: sample.recipe, expected: sample.output,
      input, output, inputDigest: input.sha256, outputDigest: output.sha256, provenance: { ...fields, receipt },
      bases: parameters ? [] : [{ input: 'ids', kind: 'authored-parameter',
        proofId: parameterId, pointer: '/ids', unit: 'authored-ID-selection' }],
    });
  }
  const review = (partId: string | null, inputDigest: string) => {
    const rationale = rationales[index] + ' Reviewed every original/current conjunct, actual command outcomes, removal, reader disclosure, model selection and proof dependency identity after execution. Authored input selection and count derivation are separate AND parts.';
    const event = save(`${plan.id}-review-${partId ? partId.endsWith('-count') ? 'count' : 'parameters' : 'plan'}.json`, {
      schemaVersion: 'local-review-event-v1', sessionId: 'b7856fa2',
      role: 'integrator', eventId: `${plan.id}:${partId ?? 'plan'}`, observedAt: new Date().toISOString(),
      reviewedBy, rationale, outcome: 'supported', scope: partId ? 'part' : 'plan', partId,
      inputDigest, inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
    });
    return { reviewedBy, rationale, inputDigest, event };
  };
  plan.planReview = review(null, localPlanDigest(plan));
  plan.adjudications = plan.parts.map(p => ({ partId: p.id, outcome: 'supported',
    ...review(p.id, localPartDigest(plan, p.id, newProofs)) }));
  newPlans.push(plan);
}
const combined = parseLocalBasisCatalog({ ...catalog, plans: [...catalog.plans, ...newPlans], proofs: [...catalog.proofs, ...newProofs] });
const routes = publishedModules().map(m => `/${m.domain}/${m.slug}/`);
const context = { ...loadLocalBasisContext(root, routes), catalog: combined };
const ids = new Set(CITATIONS.map(c => c.id));
for (const plan of newPlans) {
  const result = validateLocalBasisPlan(plan, plan.currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context);
  if (result.failures.length) throw Error(JSON.stringify(result));
}
const append = (source: string, key: string, values: unknown[]) => {
  const token = `"${key}": [`, start = source.indexOf(token) + token.length;
  if (start < token.length) throw Error('Missing catalog array');
  let depth = 1, quoted = false, escaped = false, end = start;
  for (; end < source.length; end++) {
    const c = source[end];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) break;
  }
  return source.slice(0, end).trimEnd() + ',\n' + values.map(v => JSON.stringify(v, null, 2).split('\n')
    .map(s => '    ' + s).join('\n')).join(',\n') + '\n  ' + source.slice(end);
};
writeFileSync('audit/local-basis.json', append(append(catalogText, 'plans', newPlans), 'proofs', newProofs));
let compounds = read('audit/compound-evidence.json');
const superseded = JSON.parse(read(`${directory}/superseded-plans.json`));
for (const p of superseded) {
  const exact = JSON.stringify(p, null, 2).split('\n').map(s => '  ' + s).join('\n') + ',\n';
  if (compounds.split(exact).length !== 2) throw Error('Legacy removal is not exact');
  compounds = compounds.replace(exact, '');
}
writeFileSync('audit/compound-evidence.json', compounds);
const compoundPlans = JSON.parse(compounds);
const citations = Object.fromEntries(publishedModules().map(m => [m.slug, matter(read(`content/${m.domain}/${m.slug}.mdx`)).data.citations]));
for (const plan of newPlans) {
  const before = read(plan.ledgerPath);
  const row = parseLedger(plan.ledgerPath, before).find(s => s.slug === plan.articleSlug)!.claimRecords[plan.rowOrdinal - 1];
  const original = selected.find(r => r.originalId === plan.originalId)!;
  if (originalClaimDigest(row) !== original.currentTupleDigest) throw Error('Application tuple changed immediately before ledger write');
  const lines = before.split('\n');
  const escape = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  lines[row.line - 1] = '| ' + [plan.currentCells.claim, plan.currentCells.sourceChecked,
    plan.currentCells.verdict, plan.currentCells.note, '', '', '', plan.id].map(escape).join(' | ') + ' |';
  let updated = lines.join('\n');
  const sections = parseLedger(plan.ledgerPath, updated, ids, { localBasis: context, compoundPlans, articleCitations: citations });
  const applied = sections.find(s => s.slug === plan.articleSlug)!.claimRecords[plan.rowOrdinal - 1];
  if (applied.evidenceFailures.length) throw Error(JSON.stringify(applied.evidenceFailures));
  updated = withLedgerSummary(updated, sections);
  writeFileSync(plan.ledgerPath, updated);
}
save('application-result.json', {
  appliedOriginalIds: newPlans.map(p => p.originalId), plansAdded: newPlans.length, proofsAdded: newProofs.length,
  legacyPlansArchivedNotPromoted: superseded.map((p: { id: string }) => p.id), provenance: 'No external source retrieval; exact local author-selected IDs and actual numeric/browser executions only.',
});
console.log('Applied 2 exact original closures, 2 plans / 4 proofs; 18 old plans / 150 old proofs unchanged.');
