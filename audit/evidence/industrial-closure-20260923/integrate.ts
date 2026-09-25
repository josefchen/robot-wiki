/**
 * One-shot integration of the eight preflighted industrial originals. Inputs
 * are retained source bodies and actual numeric/browser observations, not
 * commands to execute. Existing catalogs and receipts are never regenerated.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { originalClaimDigest, parseLedger, withLedgerSummary } from '../../../lib/audit-ledger.ts';
import { loadLocalBasisContext, localPlanDigest, localPartDigest, parseLocalBasisCatalog,
  parseOriginalLedgerSection, validateLocalBasisPlan, type LocalPlan, type LocalProof } from '../../../lib/audit-local-basis.ts';
import { correctedChildDigest, correctedInputDigest, type CorrectedDisposition } from '../../../lib/audit-corrected-disposition.ts';
import { CITATIONS } from '../../../data/citations.ts';
import { publishedModules } from '../../../data/modules.ts';
import { ARTICLE, COMPONENT, DIRECTORY, artifact, member, save, sha } from './support.ts';

const read = (path: string) => readFileSync(path, 'utf8');
const packet = JSON.parse(read(`${DIRECTORY}/row-history.json`));
const sources = JSON.parse(read(`${DIRECTORY}/sources.json`));
const numeric = JSON.parse(read(`${DIRECTORY}/numeric-run-final.json`));
const browser = JSON.parse(read(`${DIRECTORY}/browser-run.json`));
const ledgerPath = 'audit/data-hardware.md';
const originalSnapshot = 'audit/evidence/economics-local-20260923/original-data-hardware.md';
const snapshotRows = parseOriginalLedgerSection(ledgerPath, 'industrial-deployment', read(originalSnapshot)).claimRecords;
const before = read(ledgerPath);
const beforeRows = parseLedger(ledgerPath, before).find(s => s.slug === 'industrial-deployment')!.claimRecords;
const ids = new Set(CITATIONS.map(c => c.id));
const catalogText = read('audit/local-basis.json');
const catalog = parseLocalBasisCatalog(JSON.parse(catalogText));
const compoundPlans = JSON.parse(read('audit/compound-evidence.json'));
const routes = publishedModules().map(m => `/${m.domain}/${m.slug}/`);
const disclosureText = read(ARTICLE).split('\n').find(s => s.startsWith('This calculator is an authored worked example'))!;
const disclosure = { text: disclosureText, member: member(ARTICLE, disclosureText) };
const i52 = catalog.plans.find(p => p.rowOrdinal === 52 && p.articleSlug === 'industrial-deployment')!;
const reviewedBy = 'integrator run 7260b9a1 (integrator review; not independent acceptance)';
const now = () => new Date().toISOString();
const resume = process.env.INDUSTRIAL_RESUME_APPLICATION === '1';
const current = new Map<number, { claim: string; sourceChecked: string; verdict: string; note: string }>();
for (const row of packet) {
  if (originalClaimDigest(beforeRows[row.rowOrdinal - 1]) !== row.currentTupleDigest ||
      originalClaimDigest(snapshotRows[row.rowOrdinal - 1]) !== row.originalHistory.originalTupleDigest) {
    throw Error(`Application identity changed for ${row.originalId}`);
  }
  current.set(row.rowOrdinal, {
    claim: row.correctedClaim,
    sourceChecked: row.rowOrdinal === 31
      ? 'Retained LEI Takt Time primary body; actual 2026-09-22 access, no stated publication date. No new fetch or HTTP status.'
      : row.rowOrdinal === 32
        ? 'Retained LEI Cycle Time and NASA Lesson841 text; actual independent calculator execution. Distinct external AND authored/derived parts.'
        : [37, 47, 48].includes(row.rowOrdinal)
          ? 'Finite correction record; actual desktop/mobile mounted glossary, reference, field and cross-link checks with complete original history.'
          : 'Explicit authored assumptions, independently checked finite arithmetic, and actual required mounted comparisons where claimed.',
    verdict: row.rowOrdinal === 47 ? 'Cut (historical ledger certification withdrawn)' : 'C',
    note: `Original and immediately preceding four-cell tuples retained verbatim in ${DIRECTORY}/row-history.json; earliest raw snapshot ${originalSnapshot}. ${row.rowOrdinal === 47 ? 'No article-removal span is claimed; current glossary observations are separate from the withdrawn historical audit assertion.' : row.rowOrdinal === 48 ? 'Every other industrial original is a required AND child, with actual registry/render comparison; not certification by calculator proof alone.' : 'Correction does not certify the superseded assertion.'} Retained retrieval times are not today’s review times. No independent acceptance.`,
  });
}

// Actual semantic continuity review: all pre-existing recipe computations are
// unchanged. Added finite recipe/targets and proof-validation support do not
// alter any old expected output. The model/component are byte-identical.
if (!resume) save('dependency-review.json', {
  schemaVersion: 'industrial-dependency-review-v1', reviewedBy, observedAt: now(),
  rationale: 'Reviewed the checker diff: existing parameter/derive outputs are unchanged; the economics-examples branch alone adds three chosen values and overhead. Recomputed old proofs remain required. Current article preserves the entire industrial52 disclosure, vendor qualifications and mount. Historical receipts/observations are not replayed or relabelled; the changed comparisons have their own actual observations.',
  bindings: [
    {
      historical: { path: 'lib/audit-local-basis.ts', bytes: 40817, sha256: '99f3d60d05b597500a75800c01be8cb0b2a70146b993a8f72021df6dfdcadec8' },
      current: artifact('lib/audit-local-basis.ts'), snapshot: artifact(`${DIRECTORY}/original-checker.ts.txt`),
      rationale: 'Existing recipe branches and expected outputs remain exact; current validator still recomputes each retained result and enforces every original evidence obligation.',
    },
    {
      historical: i52.disclosure.member.file, current: artifact(ARTICLE),
      snapshot: artifact(`${DIRECTORY}/before-article.mdx`), preservedText: [i52.disclosure.text],
      rationale: 'Industrial52 disclosure and component/model remain unchanged. Only separate arithmetic examples, LEI definitions, unsupported attribution/certainty and dashboard count change; none reinterprets old robot-cost observations.',
    },
  ], unchangedModel: artifact('lib/deployment-economics.ts'), unchangedComponent: artifact(COMPONENT),
});

const newPlans: LocalPlan[] = resume ? catalog.plans.filter(p => p.id.startsWith('industrial-closure-')) : [];
const newProofs: LocalProof[] = resume ? catalog.proofs.filter(p => newPlans.some(plan => plan.id === p.planId)) : [];
const units: Record<string, string> = { robotCost: 'USD', integrationMultiple: 'dimensionless',
  cycleTimeSeconds: 's', uptimePercent: '%', successRatePercent: '%', jamClearSeconds: 's', wageUsdPerHour: 'USD/hour' };
const meanings: Record<number, string> = {
  9: 'Two full-precision evaluations at15s imply11.56→11.82 months; difference rounds0.26 and relative increase2.2%, not2.3%. Actual UI shows11.6→11.8. All constants are authored; no claim of measured profitability.',
  10: 'Two evaluations at300s imply12.11→17.30 months (+5.19),542.9→380.0 elapsed-hour picks (30% lower); both within the chosen24-month horizon. Actual UI shows12.1→17.3 and integer throughput543→380, not a verdict flip.',
  32: 'LEI supports measured part/process cycle time. NASA explicitly distinguishes inherent/operational availability and operable-state uptime; equation images were not read and no removed equation is certified. Independently checked capital-only cost/pick equals cell capital/(monthly modeled picks×60), with no operating-cost term.',
  33: 'Explicit99% success and10s per failed attempt imply0.01×10=0.1 seconds per attempt. This is a hypothetical expectation, not a measured intervention rate or economic viability claim.',
};
for (const ordinal of resume ? [] : [9, 10, 32, 33]) {
  const row = packet.find((r: { rowOrdinal: number }) => r.rowOrdinal === ordinal);
  const c = current.get(ordinal)!;
  const plan: LocalPlan = {
    id: `industrial-closure-${ordinal}-20260923`, kind: 'explicit-parts-v2',
    originalId: row.originalId, ledgerPath, articleSlug: 'industrial-deployment', rowOrdinal: ordinal,
    originalBinding: { originalCells: row.originalHistory.originalCells,
      originalTupleDigest: row.originalHistory.originalTupleDigest, snapshot: artifact(originalSnapshot),
      sourceCommit: '20f32c04cbfc35c2dba56845954b7fabcd10f37b' },
    currentCells: c, currentTupleDigest: originalClaimDigest(c), mounts: i52.mounts,
    disclosure, parts: [], evidence: [], planReview: null, adjudications: [],
  };
  if (ordinal === 32) {
    for (const citationId of ['lei-cycle-time-definition', 'nasa-availability-prediction-analysis']) {
      const source = sources[citationId];
      const body = read(source.decodedText);
      const quotes = source.supportingPassages as string[];
      const relevant = citationId.startsWith('lei') ? [quotes[0]] : quotes.slice(1);
      const start = body.indexOf(relevant[0]), last = relevant.at(-1)!;
      const passage = body.slice(start, body.indexOf(last) + last.length);
      if (start < 0 || relevant.some(q => !passage.includes(q))) throw Error('Retained passage mismatch');
      const partId = `i32-${citationId}`;
      plan.parts.push({ id: partId, kind: 'external-source', text: citationId.startsWith('lei')
        ? 'Measured time to produce a part or complete a process; official undated LEI definition.'
        : 'Inherent/operational availability distinctions, MTBF/MTTR parameters, excluded/included delay categories, and uptime as operable state; no unread equations.',
      requiredCitationIds: [citationId] });
      plan.evidence.push({ partId, citationId, sourceUrl: source.sourceUrl, supportingPassage: passage,
        provenance: { retrievedAt: source.provenance.observedAt, tool: source.provenance.tool,
          response: artifact(source.decodedText), passage: member(source.decodedText, passage) } });
    }
  }
  const parameterId = `i${ordinal}-parameters`;
  plan.parts.push({ id: parameterId, kind: 'authored-parameter',
    text: 'All seven input choices and ranges plus730-hour/60-month/24-month constants; explicit99%/10s/300s comparison choices, not empirical values.',
    requiredProofIds: [parameterId] });
  const selectedCases = ordinal === 9 ? [0, 1, 2] : ordinal === 10 ? [0, 3, 4] : ordinal === 32 ? [0, 1] : [0, 5];
  const derivedIds = selectedCases.slice(1).map(index => `i${ordinal}-derived-${index}`);
  plan.parts.push({ id: `i${ordinal}-derived`, kind: 'derived-result', text: meanings[ordinal], requiredProofIds: derivedIds });
  for (const index of selectedCases) {
    const sample = numeric.cases[index];
    const parameter = index === 0;
    const proofId = parameter ? parameterId : `i${ordinal}-derived-${index}`;
    const input = save(`${proofId}-input.json`, sample.recipe);
    const output = save(`${proofId}-output.json`, sample.expected);
    const { cases: _cases, ...run } = numeric; void _cases;
    const base = {
      id: proofId, planId: plan.id, partId: parameter ? parameterId : `i${ordinal}-derived`,
      originalId: plan.originalId, originalTupleDigest: plan.originalBinding.originalTupleDigest,
      currentTupleDigest: plan.currentTupleDigest, artifacts: sample.dependencies, disclosure,
      recipe: sample.recipe, expected: sample.expected, input, output, inputDigest: input.sha256, outputDigest: output.sha256,
      bases: parameter ? [] : Object.entries(sample.recipe.inputs).map(([key, value]) => ({
        input: key, kind: 'authored-parameter' as const, proofId: parameterId, unit: units[key],
        pointer: `/${key === 'successRatePercent' && value === 99 ? 'comparisonSuccess' : key === 'jamClearSeconds' && value === 10 ? 'exampleClearing' : key === 'jamClearSeconds' && value === 300 ? 'expensiveClearing' : key}`,
      })),
    };
    const receipt = save(`${proofId}-receipt.json`, { schemaVersion: 'local-run-v1', ...run,
      inputDigest: input.sha256, outputDigest: output.sha256, dependencies: base.artifacts, observations: [] });
    newProofs.push({ ...base, kind: parameter ? 'authored-parameter' : 'derived-result', provenance: { ...run, receipt } });
  }
  if (ordinal === 9 || ordinal === 10) {
    for (const [index, obs] of browser.observations.entries()) {
      if (obs.input.jamClearSeconds !== (ordinal === 9 ? 15 : 300)) continue;
      const id = `i${ordinal}-observed-${index}`;
      const { input: inputValues, ...observation } = obs;
      const { mountId, caseId, prestate, action, poststate } = observation;
      plan.parts.push({ id, kind: 'observed-behavior',
        text: `Actual existing mount at success${inputValues.successRatePercent}% and clearing${inputValues.jamClearSeconds}s; rounded cost/payback and integer throughput, with the chosen24-month verdict.`,
        requiredProofIds: [id], requiredObservations: [{ mountId, caseId, prestate, action, poststate }] });
      const numericProof = newProofs.find(p => p.planId === plan.id && p.kind === 'derived-result' &&
        JSON.stringify(p.recipe.inputs) === JSON.stringify(inputValues))!;
      if (!numericProof) throw Error('Observed/numeric case mismatch');
      const run = Object.fromEntries(['command', 'runner', 'cwd', 'environment', 'startedAt', 'endedAt', 'exitCode', 'test'].map(k => [k, browser[k]]));
      const receipt = save(`${id}-receipt.json`, { schemaVersion: 'local-run-v1', ...run,
        inputDigest: numericProof.inputDigest, outputDigest: numericProof.outputDigest,
        dependencies: browser.proofDependencies, observations: [observation] });
      newProofs.push({ ...numericProof, id, partId: id, kind: 'observed-behavior',
        artifacts: browser.proofDependencies, observations: [observation],
        provenance: { ...run, receipt } as LocalProof['provenance'] });
    }
  }
  const reviewEvent = (partId: string | null, inputDigest: string, rationale: string) => {
    const event = save(`review-${ordinal}-${partId ?? 'plan'}.json`, {
      schemaVersion: 'local-review-event-v1', sessionId: '7260b9a1',
      role: 'integrator', eventId: `industrial-${ordinal}-${partId ?? 'plan'}`, observedAt: now(),
      reviewedBy, rationale, outcome: 'supported', scope: partId ? 'part' : 'plan', partId,
      inputDigest, inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
    });
    return { reviewedBy, rationale, inputDigest, event };
  };
  plan.planReview = reviewEvent(null, localPlanDigest(plan),
    `Reviewed whole original/current inventory and exact corrected article. ${meanings[ordinal]} External parts, if present, remain separate AND obligations; no generic internal truth category.`);
  plan.adjudications = plan.parts.map(part => ({ partId: part.id, outcome: 'supported',
    ...reviewEvent(part.id, localPartDigest(plan, part.id, newProofs),
      `${part.text} Reviewed retained document context or actual independently checked numeric/mounted artifacts for this precise part. ${meanings[ordinal]} No new retrieval, historical replay or independent acceptance is claimed.`) }));
  newPlans.push(plan);
}

// Append without reserializing any of the seven historical plans/56 proofs.
const appendArray = (source: string, key: string, values: unknown[]) => {
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
  return source.slice(0, end).trimEnd() + ',\n' + values.map(v => JSON.stringify(v, null, 2).split('\n').map(s => '    ' + s).join('\n')).join(',\n') + '\n  ' + source.slice(end);
};
const combined = resume ? catalog : { ...catalog, plans: [...catalog.plans, ...newPlans], proofs: [...catalog.proofs, ...newProofs] };
parseLocalBasisCatalog(combined);
const context = { ...loadLocalBasisContext(process.cwd(), routes), catalog: combined };
for (const plan of newPlans) {
  const result = validateLocalBasisPlan(plan, plan.currentCells, plan.id,
    { citationId: '', sourceUrl: '', supportingPassage: '' }, ids, context);
  if (result.failures.length) throw Error(JSON.stringify(result));
}
if (!resume) writeFileSync('audit/local-basis.json', appendArray(appendArray(catalogText, 'plans', newPlans), 'proofs', newProofs));

const corrections: CorrectedDisposition[] = [];
for (const ordinal of [37, 47, 48] as const) {
  const row = packet.find((r: { rowOrdinal: number }) => r.rowOrdinal === ordinal);
  const c = current.get(ordinal)!;
  corrections.push({
    id: `industrial-correction-${ordinal}-20260923`, originalId: row.originalId, rowOrdinal: ordinal,
    kind: ordinal === 37 ? 'removed-assertion' : ordinal === 47 ? 'withdrawn-audit-certification' : 'p4-conjunction',
    originalCells: row.originalHistory.originalCells, originalTupleDigest: row.originalHistory.originalTupleDigest,
    snapshot: artifact(originalSnapshot), currentCells: c, currentTupleDigest: originalClaimDigest(c),
    article: artifact(ARTICLE), dependencies: browser.dependencies.filter((d: { path: string }) => d.path !== ARTICLE),
    requiredPresent: ordinal === 37 ? ['[The Reliability Gap](/frontier/reliability-gap)']
      : ordinal === 48 ? [disclosureText, 'not a measured intervention rate', 'no published success rate'] : [],
    requiredAbsent: ordinal === 37 ? ['six-row deployment dashboard'] : [],
    execution: artifact(`${DIRECTORY}/browser-run.json`), children: [],
    review: { reviewedBy, rationale: ordinal === 37
      ? 'Inspected before/current article: exact numbered assertion removed; unnumbered cross-reference retained and actual link200. This does not prove the old count.'
      : ordinal === 47
        ? 'Historical glossary/old validate:content certification is ledger-only and withdrawn, not external truth or a fictitious article removal. Actual current term inventory, registry IDs and every tooltip were checked at both viewports.'
        : 'Reviewed the whole P4 population: four external Stat values and scoped numeric prose use the complete other-row AND; seven controls and calculated outputs are explicitly authored; glossary and references match canonical registries. Figure success remains unpublished, not filled with an estimate; no inapplicable field is inferred. n.d. is limited to the two undated LEI entries with actual access dates.',
    observedAt: now(), inputDigest: '0'.repeat(64) },
  });
}
const escape = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const lines = before.split('\n');
for (const row of packet) {
  const c = current.get(row.rowOrdinal)!;
  const originalLine = lines[beforeRows[row.rowOrdinal - 1].line - 1];
  const columns = originalLine.trim().slice(1, -1).split(/(?<!\\)\|/).map(s => s.trim());
  // The native industrial table's exact current shape, not guessed source order.
  if (columns.length < 3 || columns.length > 8) throw Error('Industrial table shape changed');
  const plan = newPlans.find(p => p.rowOrdinal === row.rowOrdinal);
  const correction = corrections.find(p => p.rowOrdinal === row.rowOrdinal);
  const source = row.rowOrdinal === 31 ? sources['lei-takt-time-definition'] : null;
  const passage = source ? source.supportingPassages.join(' ') : '';
  lines[beforeRows[row.rowOrdinal - 1].line - 1] = '| ' + [
    c.claim, c.sourceChecked, c.verdict, source?.citationId ?? '', source?.sourceUrl ?? '',
    passage, c.note, plan?.id ?? correction?.id ?? '',
  ].map(escape).join(' | ') + ' |';
}
let changed = lines.join('\n');
const evidenceContext = { compoundPlans, localBasis: context,
  correctedDispositions: { root: process.cwd(), records: corrections } };
for (const correction of corrections) {
  if (correction.rowOrdinal === 48) {
    const children = parseLedger(ledgerPath, changed, ids, evidenceContext)
      .find(s => s.slug === 'industrial-deployment')!.claimRecords;
    correction.children = children.flatMap((r, i) => i === 47 ? [] : [{ rowOrdinal: i + 1, digest: correctedChildDigest(r) }]);
  }
  correction.review.inputDigest = correctedInputDigest(correction);
}
const checked = parseLedger(ledgerPath, changed, ids, evidenceContext);
const selected = checked.find(s => s.slug === 'industrial-deployment')!;
for (const row of packet) {
  const result = selected.claimRecords[row.rowOrdinal - 1];
  if (result.evidenceFailures.length) throw Error(`${row.rowOrdinal}: ${JSON.stringify(result.evidenceFailures)}`);
}
save('corrections.json', corrections);
changed = withLedgerSummary(changed, checked);
writeFileSync(ledgerPath, changed);
save('integration-result.json', { applied: packet.map((r: { originalId: string }) => r.originalId),
  selectedComplete: 8, industrialRows: selected.claimRows, industrialIncomplete: selected.unevidencedRows.length,
  newPlans: newPlans.length, newProofs: newProofs.length, originalCatalogSha256: sha(catalogText),
  reviewedAt: now(), note: 'Finite integration checks only; whole native corpus accounting and independent acceptance remain separate.' });
console.log('Integrated eight exact industrial originals; four new plans / fourteen proofs, three correction records. No prior evidence replayed.');
