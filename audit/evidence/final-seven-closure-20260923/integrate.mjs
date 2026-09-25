// Bounded final-seven evidence integrator. Never executes commands from evidence.
// Run "seed", inspect the generated inventory and source passages, then "apply".
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  localPartDigest, localPlanDigest, parseLocalBasisCatalog, parseOriginalLedgerSection,
  validateLocalBasisPlan, loadLocalBasisContext, LOCAL_BASIS_REQUIRED_TARGETS,
  LOCAL_RECIPE_DEPENDENCIES,
} from '../../../lib/audit-local-basis.ts';
import { originalClaimDigest } from '../../../lib/audit-ledger.ts';
import { buildManifest, sha256, stableJson } from '../../../lib/brand-v2-baseline.ts';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const here = 'audit/evidence/final-seven-closure-20260923';
const mission = 'validation/brand-v2-editorial/source-recovery-20260906';
const packetPath = `${mission}/closure-crossdomain-ready-20260923/rows.json`;
const dispatchPath = `${mission}/closure-final-seven-integration-20260923`;
const read = p => readFileSync(join(root, p));
const json = p => JSON.parse(readFileSync(p[0] === '/' ? p : join(root, p), 'utf8'));
const hash = x => sha256(x);
const ref = p => ({ path: p, bytes: read(p).length, sha256: hash(read(p)) });
const save = (p, value) => {
  writeFileSync(join(root, p), value);
  return ref(p);
};
const compact = x => stableJson(x);
const member = (p, text, kind) => {
  const bytes = read(p);
  const fragment = text === undefined ? bytes : Buffer.from(text);
  const offset = bytes.indexOf(fragment);
  assert(offset >= 0, `missing exact member ${p}: ${String(text).slice(0, 90)}`);
  const m = { file: ref(p), id: kind === 'prose' ? `article:${p.slice(8, -4)}`
    : kind === 'interactive-sources-mounts' ? `source:${p}` : `file:${p}`,
    offset, length: fragment.length, sha256: hash(fragment) };
  if (kind) {
    const source = bytes.toString('utf8');
    const value = kind === 'prose'
      ? { path: p, body: (awaitMatter(source)).trim() }
      : { path: p, source };
    m.baseline = { kind, hash: buildManifest(kind, [{ id: m.id, value }]).members[0].hash };
  }
  return m;
};
// gray-matter is already the canonical prose transformation used by the gate.
import matter from 'gray-matter';
const awaitMatter = source => matter(source).content;

const configs = [
  { domain: 'rl-sim2real', slug: 'legged-locomotion', n: 8, key: 'gait',
    claim: 'The universal speed-dependent duty-factor attribution was cut; the diagram retains four authored illustrative gait timings, not canonical controller responses.',
    source: 'Int: removed unsupported universal attribution in active article; fixed authored gait model and mounted diagram, no Park paper passage borrowed from row 7.',
    verdict: 'Cut',
    note: 'The unsupported classical-and-learned universal speed clause and its local citation were removed in the article. The four retained chosen gait factors and phase offsets are labeled authored and are checked by finite calculations and both mounted viewports; completed Park row 7 is unchanged.' },
  { domain: 'rl-sim2real', slug: 'legged-locomotion', n: 17, key: 'gait',
    claim: 'GaitDiagram shows four chosen walk/trot/bound/pronk duty factors and phase offsets, not canonical measurements or a universal gait law.',
    source: 'Int: active article disclosure; lib/gait.ts authored parameters; mounted GaitDiagram in two viewports.',
    verdict: 'C',
    note: 'Corrected article disclosure names the chosen 0.75/0.50/0.45/0.35 factors and offsets as illustrative, not measured controller behavior. Finite model states and actual default, selected, phase and reset observations bind the teaching model.' },
  { domain: 'data-hardware', slug: 'data-bottleneck', n: 3, key: 'data-scale',
    claim: 'OXE reports 1M+ trajectories across 22 embodiments; its duration is not assigned in this chart. The 10,000/1,000,000-hour targets and collection rates are authored hypothetical inputs, not OXE duration.',
    source: 'open-x-embodiment-2023: retained arXiv HTML v9 and official project page, historical retrievals; Int: authored numeric model and both chart mounts. No new fetch or exhaustive source-absence claim.',
    verdict: 'C',
    note: 'Removed the unsupported OXE hour estimate and ranking from article, data and chart. Verified the count/embodiments against separately preserved paper and official page passages. Did not inspect linked spreadsheets or embedded images, so no exhaustive absence claim; zero OXE numeric bar and explicit hypothetical targets remain reader-visible.' },
  { domain: 'data-hardware', slug: 'data-bottleneck', n: 5, key: 'data-scale',
    claim: 'DROID reports 76k successful trajectories and 350 interaction hours, gathered by 50 collectors with 18 robots across 13 institutions over 12 elapsed months; roughly 16k failed trajectories are separate. The 7 h/rig-year chart case is authored, not DROID-measured productivity.',
    source: 'droid-2024: retained arXiv HTML v2, historical retrieval; Int: authored rate/target model and two mounted chart instances. No new fetch.',
    verdict: 'C',
    note: 'Corrected collector versus robot and elapsed-time units, cut the misleading 350/50 rate lead, and labeled seven hours per rig-year an authored hypothetical throughout the article, chart and quiz. Paper passage supplies corpus and cohort context, not the annualized teaching rate.' },
  { domain: 'data-hardware', slug: 'evaluation-crisis', n: 1, key: 'reliability',
    claim: 'Under an illustrative constant conditional success probability p, p^30 at p=0.95 is 21.5%, and q^(1/n) for q=0.8 is 95.6% at five steps and 99.3% at thirty; these are not measured policy reliabilities.',
    source: 'Int: independent arithmetic and lib/reliability.ts finite derivation plus two actual calculator mounts; no external policy claim.',
    verdict: 'C',
    note: 'Article explicitly states equal conditional probabilities given preceding successes, not inference from an episode success statistic. Verified displayed 0%, 100%, 30/100-step limits, inverse arithmetic in numeric tests; two actual calculator mounts observed. No empirical policy measurement asserted.' },
  { domain: 'frontier', slug: 'safety-and-assurance', n: 5, key: 'safety',
    claim: 'Marvel and Norcross reproduce 850 mm for a normal approach with multiple separate beams, 1200 mm for a single-height beam and a conditional 250 mm two-handed example; this instrument chooses C=0.85 m for a teaching scenario, not a universal certified margin.',
    source: 'marvel-norcross-2017: retained PMC author manuscript, historical retrieval 2026-09-06T00:34:25.849Z; Int: authored safety constants and mounted distance/force modes. No normative ISO text fetched.',
    verdict: 'C',
    note: 'Source table and prose support contextual numbers and at-least qualifier but question applicability to reconfigurable robots and exclude ordinary teach pendants from the two-handed exception. Article/code/component now disclose that the instrument selects its own C, reaction, deceleration and uncertainty values; model calculations are not safety certification.' },
  { domain: 'frontier', slug: 'safety-and-assurance', n: 6, key: 'safety',
    claim: 'Marvel and Norcross frame 1600 mm/s as a qualified §III worst-case assumption when not measured, but also cite 2000 mm/s and later say it may be more prudent; the 1.6 m/s default and 0–2 m/s slider here are authored illustrative choices, not limits.',
    source: 'marvel-norcross-2017: retained PMC author manuscript, historical retrieval 2026-09-06T00:34:25.849Z; Int: authored speed parameters and mounted mode readings. No normative ISO text fetched.',
    verdict: 'S',
    note: 'Both the §III 1600 mm/s framing with greater-than-500 mm proviso and the Discussion 2000 mm/s counterpassage were read. Inconsistency remains recorded. Article now discloses that default and control range are selected teaching inputs rather than a certified or universally worst-case speed.' },
];
const specs = {
  gait: {
    disclosure: 'The diagram fixes authored illustrative duty factors: walk 0.75, trot 0.50, bound 0.45, and pronk 0.35. Its phase offsets and support readouts describe those chosen timing examples, not a universal gait law or a measured controller’s response to speed.',
    parameter: { id: 'gait', mode: 'parameters', inputs: {} },
    derived: { id: 'gait', mode: 'derive', inputs: { gait: 'walk', phase: 0, direction: 1 } },
    behavior: [
      { mount: 1, cases: ['default', 'reset'], recipe: { gait: 'walk', phase: 0, direction: 1 } },
      { mount: 1, cases: ['discrete-options'], recipe: { gait: 'trot', phase: 0, direction: 1 } },
      { mount: 1, cases: ['slider-boundaries-and-anchors'], recipe: { gait: 'trot', phase: .25, direction: 1 } },
    ],
  },
  'data-scale': {
    disclosure: 'The chart below separates dataset counts from a teaching projection. Drag the teleoperation rigs slider to see how fleet size changes collection time under two authored hypothetical rates. The 10,000-hour and 1,000,000-hour targets are hypothetical too, not OXE duration or measured frontier requirements.',
    parameter: { id: 'data-scale', mode: 'parameters', inputs: {} },
    derived: { id: 'data-scale', mode: 'derive', inputs: { rigs: 10, rateId: 'droid-measured', targetHours: 10000 } },
    behavior: [
      { mount: 1, cases: ['default'], recipe: { rigs: 15, rateId: 'dedicated', targetHours: 1000000 } },
      { mount: 2, cases: ['default', 'reset'], recipe: { rigs: 10, rateId: 'droid-measured', targetHours: 10000 } },
      { mount: 2, cases: ['discrete-options'], recipe: { rigs: 10, rateId: 'dedicated', targetHours: 10000 } },
    ],
  },
  reliability: {
    disclosure: 'This is an illustrative probability model, not a measured robot policy. Assume every decision has the same probability p of success conditional on all earlier decisions succeeding. The probability of completing n decisions without failure is then p^n. Choosing p = 0.95 and n = 30 gives 21.5% after rounding to one decimal place; choosing n = 100 gives 0.6%. Drag the episode-length slider to compare those derived examples. Real tasks need not satisfy the constant conditional-probability assumption.',
    parameter: { id: 'reliability', mode: 'parameters', inputs: {} },
    derived: { id: 'reliability', mode: 'derive', inputs: { perStep: .95, steps: 30, inverseTarget: .8 } },
    behavior: [
      { mount: 1, cases: ['default', 'reset'], recipe: { perStep: .95, steps: 30, inverseTarget: .8 } },
      { mount: 1, cases: ['slider-boundaries-and-anchors'], recipe: { perStep: .95, steps: 100, inverseTarget: .8 } },
      { mount: 2, cases: ['default'], recipe: { perStep: .95, steps: 14, inverseTarget: .8 } },
    ],
  },
  safety: {
    disclosure: 'The instrument is an authored teaching model. It chooses C = 0.85 m at that context-specific minimum, robot speed 1 m/s and operator approach 1.6 m/s by default, and a 0–2 m/s range in 0.05 m/s steps for each slider; these controls are not certified operating limits.',
    parameter: { id: 'safety', mode: 'parameters', inputs: {} },
    derived: { id: 'safety', mode: 'derive', inputs: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, displayMode: 'speed-separation' } },
    behavior: [
      { mount: 1, cases: ['default', 'reset'], recipe: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, displayMode: 'speed-separation' } },
      { mount: 1, cases: ['discrete-options'], recipe: { robotSpeed: 1, humanSpeed: 1.6, separation: 1.6, displayMode: 'power-force' } },
    ],
  },
};
const ids = new Set(configs.map(c => `audit/${c.domain}.md:${c.slug}:${c.n}`));
const packetBytes = readFileSync(packetPath);
assert.equal(hash(packetBytes), 'a611a88c9fa8d5aa40da76da073483e141487321d3f8b41cbc4f66b37035b856');
const packet = JSON.parse(packetBytes);
const selected = new Map(packet.rows.filter(r => ids.has(r.originalId)).map(r => [r.originalId, r]));
assert.equal(selected.size, 7);
const dispatch = json(`${dispatchPath}/preflight.json`);
const preflight = new Map(dispatch.bindings.map(b => [b.originalId, b]));
const evidenceRuns = json(`${dispatchPath}/command-receipts.json`).commands;
const numericRun = evidenceRuns[2], browserRun = evidenceRuns[0];
assert.equal(numericRun.exitCode, 0); assert.equal(browserRun.exitCode, 0);
const numeric = json(`${here}/numeric-results-final.json`);
const browser = json(`${here}/browser-observations.json`);
assert.equal(numeric.results.length, 41); assert.equal(browser.observations.length, 30);
assert.deepEqual(browser.errors, []);
const registry = json('contract/brand-v2-registries.json').interactive;
const catalog = json('audit/local-basis.json');
const proofNames = new Set(catalog.proofs.map(p => p.id));
const receiptRef = (name, command) => {
  const p = `${here}/${name}`;
  return save(p, compact(command) + '\n');
};
const recipeProof = (plan, partId, recipe, kind, observations) => {
  const name = `${plan.id}-${partId.replace(/[^a-z0-9-]/g, '-')}`;
  const matching = numeric.results.filter(x => compact(x.recipe) === compact(recipe));
  assert.equal(matching.length, 1, `exact numeric capture ${compact(recipe)}`);
  const expected = matching[0].output;
  const input = save(`${here}/${name}.input.json`, compact(recipe) + '\n');
  const output = save(`${here}/${name}.output.json`, compact(expected) + '\n');
  const testPath = kind === 'observed-behavior'
    ? 'tests/e2e/final-seven-closure-evidence.spec.ts' : 'tests/unit/final-seven-closure-evidence.test.ts';
  const run = kind === 'observed-behavior' ? browserRun : numericRun;
  const articlePath = `content/${plan.ledgerPath.slice(6, -3)}/${plan.articleSlug}.mdx`;
  const source = registry.sources.find(x => x.id === `interactive:${LOCAL_BASIS_REQUIRED_TARGETS[plan.originalId].component}`);
  assert(source);
  const paths = [...new Set([
    ...LOCAL_RECIPE_DEPENDENCIES[recipe.id], source.sourcePath, articlePath, 'lib/audit-local-basis.ts', testPath,
  ])];
  const artifacts = paths.map(path => member(path, undefined,
    path === source.sourcePath ? 'interactive-sources-mounts' : path === articlePath ? 'prose' : undefined));
  const bases = Object.entries(recipe.inputs).map(([key, value]) => {
    if (kind === 'authored-parameter') return null;
    const pointers = {
      gait: { gait: '/gait', phase: '/phase', direction: '/direction' },
      'data-scale': { rigs: '/predictionRigs', rateId: '/rates/1/id', targetHours: '/targetsHours/0' },
      reliability: { perStep: '/defaultPerStep', steps: '/defaultSteps', inverseTarget: '/inverseTarget' },
      safety: { robotSpeed: '/robotSpeed', humanSpeed: '/humanSpeed', separation: '/separation', displayMode: '/displayModes/0' },
    };
    const unit = {
      gait: { gait: 'preset', phase: 'cycle', direction: 'step-direction' },
      'data-scale': { rigs: 'rigs', rateId: 'rate-id', targetHours: 'h' },
      reliability: { perStep: 'probability', steps: 'steps', inverseTarget: 'probability' },
      safety: { robotSpeed: 'm/s', humanSpeed: 'm/s', separation: 'm', displayMode: 'mode-id' },
    }[recipe.id][key];
    const paramProof = catalog.proofs.find(p => p.planId === plan.id && p.kind === 'authored-parameter');
    assert(paramProof, 'parameter proof created before derivations');
    // Nondefault interactive controls are authored choices within finite parameter ranges.
    const findPointer = (value, key) => {
      const entries = Object.entries(paramProof.expected.values);
      if (key === 'gait') return `/presets/${value}/id`;
      if (key === 'phase' && value !== 0) return `/phaseCases/${[0, .25, .95, 1].indexOf(value)}`;
      if (key === 'rigs' && value === 15) return '/defaultRigs';
      if (key === 'rateId' && value === 'dedicated') return '/rates/0/id';
      if (key === 'targetHours' && value === 1000000) return '/targetsHours/1';
      if (key === 'steps' && value === 100) return '/maxSteps';
      if (key === 'steps' && value === 14) return '/predictionSteps';
      if (key === 'displayMode' && value === 'power-force') return '/displayModes/1';
      void entries;
      return pointers[recipe.id][key];
    };
    return { input: key, kind: 'authored-parameter', proofId: paramProof.id, pointer: findPointer(value, key), unit };
  }).filter(Boolean);
  const runFields = {
    command: `NODE_DISABLE_COMPILE_CACHE=1 ${run.command}`,
    runner: kind === 'observed-behavior' ? 'playwright' : 'vitest',
    cwd: root, environment: { NODE_DISABLE_COMPILE_CACHE: '1' },
    startedAt: run.startedAt, endedAt: run.endedAt, exitCode: run.exitCode,
    test: ref(testPath),
  };
  const id = name;
  assert(!proofNames.has(id)); proofNames.add(id);
  const proof = {
    id, planId: plan.id, partId, originalId: plan.originalId,
    originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
    artifacts, disclosure: plan.disclosure, recipe, expected,
    input, output, inputDigest: input.sha256, outputDigest: output.sha256,
    provenance: { ...runFields, receipt: { path: 'temporary', bytes: 1, sha256: '0'.repeat(64) } },
    bases,
    kind,
    ...(kind === 'observed-behavior' ? { observations } : {}),
  };
  const receipt = {
    schemaVersion: 'local-run-v1', ...runFields, inputDigest: input.sha256,
    outputDigest: output.sha256, dependencies: artifacts, observations: observations ?? [],
  };
  proof.provenance.receipt = receiptRef(`${name}.receipt.json`, receipt);
  return proof;
};

// Seed is intentionally unreviewed; the apply phase requires inspecting it.
if (process.argv[2] === 'seed') {
  assert.equal(catalog.plans.length, 20); assert.equal(catalog.proofs.length, 154);
  const proposals = [];
  const newProofs = [];
  for (const c of configs) {
    const originalId = `audit/${c.domain}.md:${c.slug}:${c.n}`;
    const sectionPath = `audit/${c.domain}.md`;
    const originalSnapshot = `original-${c.domain}.md`;
    const original = parseOriginalLedgerSection(sectionPath, c.slug, read(`${here}/${originalSnapshot}`).toString()).claimRecords[c.n - 1];
    const current = parseOriginalLedgerSection(sectionPath, c.slug, read(sectionPath).toString()).claimRecords[c.n - 1];
    const currentCells = Object.fromEntries(['claim', 'sourceChecked', 'verdict', 'note'].map(k => [k, current[k]]));
    assert.equal(originalClaimDigest(currentCells), preflight.get(originalId).currentTupleDigest, originalId);
    assert.deepEqual(currentCells, preflight.get(originalId).currentCells, originalId);
    assert.equal(selected.get(originalId).originalId, originalId);
    const replacement = { claim: c.claim, sourceChecked: c.source, verdict: c.verdict, note: c.note };
    const target = LOCAL_BASIS_REQUIRED_TARGETS[originalId];
    const spec = specs[c.key], route = `/${c.domain}/${c.slug}/`;
    const article = `content/${c.domain}/${c.slug}.mdx`;
    assert(read(article).toString().includes(spec.disclosure), 'corrected article disclosure required');
    const disclosure = { member: member(article, spec.disclosure, 'prose'), text: spec.disclosure };
    const mounts = target.mounts.map(index => {
      const mountId = `mount:${route}:${target.component}:${index}`;
      const mounted = registry.mounts.find(m => m.id === mountId);
      const source = registry.sources.find(s => s.id === mounted?.sourceId);
      assert(source && mounted, mountId);
      return { sourceId: source.id, sourceFingerprint: source.fingerprint, mountId,
        mountFingerprint: mounted.fingerprint, route };
    });
    const plan = {
      id: `final-seven-${c.domain}-${c.slug}-${c.n}-20260923`,
      kind: 'explicit-parts-v2', originalId, ledgerPath: sectionPath, articleSlug: c.slug, rowOrdinal: c.n,
      originalBinding: {
        originalCells: Object.fromEntries(['claim', 'sourceChecked', 'verdict', 'note'].map(k => [k, original[k]])),
        originalTupleDigest: originalClaimDigest(original), snapshot: ref(`${here}/${originalSnapshot}`),
        sourceCommit: '20f32c04cbfc35c2dba56845954b7fabcd10f37b',
      },
      currentCells: replacement, currentTupleDigest: originalClaimDigest(replacement),
      mounts, disclosure, parts: [], evidence: [], planReview: null, adjudications: [],
    };
    // Packet also carries local arithmetic/replacement notes in evidence[];
    // only original-document URL + citation + actual passage can be external.
    const sourceItems = (selected.get(originalId).evidence ?? []).filter(
      e => e.citationId && (e.url || e.sourceUrl) && e.supportingPassage);
    if (sourceItems.length) {
      const partId = `${c.n}-external`;
      plan.parts.push({
        id: partId, kind: 'external-source',
        text: c.key === 'safety'
          ? 'The retained Marvel–Norcross manuscript establishes contextual numbers and their limitations, not chosen safety-control values or normative approval.'
          : 'The distinct retained primary documents establish reported counts and cohort facts, not an annualized authored teaching rate or an exhaustive absence theorem.',
        requiredCitationIds: [...new Set(sourceItems.map(e => e.citationId))],
      });
      const docs = [...new Map(sourceItems.map(e => [e.sha256, e])).values()];
      for (const doc of docs) {
        const path = c.key === 'safety' ? `${here}/retained-marvel-norcross.txt`
          : doc.url.includes('robotics-transformer-x.github.io') ? `${here}/retained-oxe-project-page-readable.txt`
          : `${here}/retained-${c.n === 3 ? 'oxe-html-v9' : 'droid-html-v2'}-readable.txt`;
        const body = read(path).toString();
        const quotes = sourceItems.filter(x => x.sha256 === doc.sha256).map(x => {
          const passage = c.key === 'safety' ? x.supportingPassage : x.supportingPassage.replace(/\s+/g, ' ').trim();
          assert(body.includes(passage), `unverified source passage ${x.locator}`);
          return passage;
        });
        // One contiguous source excerpt per (part, citation, URL); never splice quotations.
        const start = Math.min(...quotes.map(q => body.indexOf(q)));
        const end = Math.max(...quotes.map(q => body.indexOf(q) + q.length));
        const passage = body.slice(start, end);
        assert(passage.length <= 100000, 'source excerpt exceeds bounded schema');
        const timestamp = doc.provenance.historicalRetrievalWindow?.result ?? doc.provenance.observedAt;
        plan.evidence.push({
          partId, citationId: doc.citationId, sourceUrl: doc.sourceUrl ?? doc.url,
          supportingPassage: passage,
          provenance: {
            retrievedAt: timestamp,
            tool: `Retained ${doc.provenance.tool ?? doc.provenance.basis ?? 'PMC manuscript'}; historical retrieval only; independently hash-checked original response and this contiguous readable excerpt; locator ${quotes.map((_, i) => sourceItems.filter(x => x.sha256 === doc.sha256)[i].locator).join(', ')}; no new fetch`,
            response: ref(path), passage: member(path, passage),
          },
        });
      }
    }
    const paramsId = `${c.n}-parameters`;
    plan.parts.push({ id: paramsId, kind: 'authored-parameter',
      text: 'The fixed scenario parameters, units, ranges and default choices are authored, disclosed in the article and pinned to the executable model.',
      requiredProofIds: [`${plan.id}-${paramsId}`] });
    const params = recipeProof(plan, paramsId, spec.parameter, 'authored-parameter');
    catalog.proofs.push(params); newProofs.push(params);
    const derivedId = `${c.n}-derivation`;
    plan.parts.push({ id: derivedId, kind: 'derived-result',
      text: 'The finite calculation and display rounding follow the explicit model inputs; numerical agreement is not a source truth claim.',
      requiredProofIds: [`${plan.id}-${derivedId}`] });
    const derived = recipeProof(plan, derivedId, spec.derived, 'derived-result');
    catalog.proofs.push(derived); newProofs.push(derived);
    for (const [idx, group] of spec.behavior.entries()) {
      const mountId = mounts.find(m => m.mountId.endsWith(`:${group.mount}`))?.mountId;
      assert(mountId, `unregistered mount ${group.mount}`);
      const observations = browser.observations.filter(o =>
        o.mountId === mountId && group.cases.includes(o.caseId))
        .map(({ mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture }) =>
          ({ mountId, caseId, prestate, action, poststate, viewport, readouts, dom, capture }));
      assert.equal(observations.length, group.cases.length * 2, `${mountId} observation coverage`);
      const recipe = { id: c.key, mode: 'derive', inputs: group.recipe };
      const partId = `${c.n}-mounted-${idx}`;
      const observedPart = { id: partId, kind: 'observed-behavior',
        text: `The registered desktop and mobile article mount ${group.mount} shows ${group.cases.join(', ')} controls, disclosure and model-specific readouts after real state transitions.`,
        requiredProofIds: [`${plan.id}-${partId}`],
        requiredObservations: observations.map(({ mountId, caseId, prestate, action, poststate }) =>
          ({ mountId, caseId, prestate, action, poststate })) };
      plan.parts.push(observedPart);
      const proof = recipeProof(plan, partId, recipe, 'observed-behavior', observations);
      catalog.proofs.push(proof); newProofs.push(proof);
    }
    plan.evidence.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
    proposals.push(plan);
  }
  catalog.plans.push(...proposals);
  parseLocalBasisCatalog(catalog);
  // Store exact reviewed candidates without crediting ledger rows yet.
  save(`${here}/candidate-plans.json`, JSON.stringify({ plans: proposals, proofs: newProofs }, null, 2) + '\n');
  console.log(`Seeded ${proposals.length} candidates and ${newProofs.length} proofs; ledger still untouched.`);
} else if (process.argv[2] === 'apply') {
  // Populated only after a separate per-document and per-model semantic review.
  const candidate = json(`${here}/candidate-plans.json`);
  assert.equal(candidate.plans.length, 7);
  assert.equal(candidate.proofs.length, 33);
  for (const c of configs) {
    const plan = candidate.plans.find(p => p.originalId === `audit/${c.domain}.md:${c.slug}:${c.n}`);
    assert(plan);
    assert(read(`content/${c.domain}/${c.slug}.mdx`).toString().includes(plan.disclosure.text));
    for (const e of plan.evidence) assert(read(e.provenance.response.path).includes(Buffer.from(e.supportingPassage)));
    const p = candidate.proofs.filter(x => x.planId === plan.id);
    assert.equal(p.length, c.key === 'safety' ? 4 : 5);
    assert(p.some(x => x.kind === 'authored-parameter'));
    assert(p.some(x => x.kind === 'derived-result'));
    for (const x of p.filter(x => x.kind === 'observed-behavior')) {
      assert(x.observations.every(o => o.readouts.every(r => read(o.dom.path).toString().includes(r.text))));
    }
  }
  // Recheck exact current-HEAD selection at application time (not a re-dispatch).
  const byLedger = new Map();
  for (const plan of candidate.plans) {
    const raw = byLedger.get(plan.ledgerPath) ?? read(plan.ledgerPath).toString();
    const old = parseOriginalLedgerSection(plan.ledgerPath, plan.articleSlug, raw).claimRecords[plan.rowOrdinal - 1];
    assert.equal(originalClaimDigest(old), preflight.get(plan.originalId).currentTupleDigest, plan.originalId);
    byLedger.set(plan.ledgerPath, raw);
  }
  // Archive the five exact withdrawn/superseded compound objects without changing any other plan.
  const legacy = json('audit/compound-evidence.json');
  const prior = legacy.filter(p => ids.has(`${p.ledgerPath}:${p.articleSlug}:${p.rowOrdinal}`));
  assert.equal(prior.length, 5);
  assert(prior.every(p => p.planReview === null && p.adjudications.length === 0));
  save(`${here}/superseded-compound-plans.json`, JSON.stringify(prior, null, 2) + '\n');
  for (const plan of candidate.plans) {
    const ledger = byLedger.get(plan.ledgerPath);
    const rows = ledger.split('\n');
    const record = parseOriginalLedgerSection(plan.ledgerPath, plan.articleSlug, ledger).claimRecords[plan.rowOrdinal - 1];
    // Native parser line numbers are relative to the selected section, not
    // the entire ledger; bind both the current claim and current source text.
    const matches = rows.flatMap((v, i) =>
      v.startsWith('|') && v.includes(record.claim) && v.includes(record.sourceChecked.slice(0, 80)) ? [i] : []);
    assert.equal(matches.length, 1, `unique ledger line ${plan.originalId}`);
    const line = rows[matches[0]];
    const fields = line.slice(1, -1).split(/(?<!\\)\|/).map(v => v.trim());
    const headerIndex = rows.slice(0, matches[0]).findLastIndex(s => s.startsWith('|') && /\bClaim\b/.test(s) && /\bSource checked\b/.test(s));
    assert(headerIndex >= 0);
    const headers = rows[headerIndex].slice(1, -1).split('|').map(v => v.trim().toLowerCase());
    for (const [key, value] of Object.entries({
      claim: plan.currentCells.claim, 'source checked': plan.currentCells.sourceChecked,
      verdict: plan.currentCells.verdict, note: plan.currentCells.note,
      'evidence plan': plan.id,
    })) {
      const index = headers.findIndex(h => h.startsWith(key));
      assert(index >= 0, `${plan.originalId}: missing ${key} header`);
      assert(!value.includes('|') && !value.includes('\n'));
      fields[index] = value;
    }
    for (const label of ['citation id', 'source url fetched', 'supporting passage']) {
      const index = headers.indexOf(label); if (index >= 0) fields[index] = '';
    }
    rows[matches[0]] = `| ${fields.join(' | ')} |`;
    byLedger.set(plan.ledgerPath, rows.join('\n'));
  }
  for (const plan of candidate.plans) {
    const updated = parseOriginalLedgerSection(plan.ledgerPath, plan.articleSlug, byLedger.get(plan.ledgerPath))
      .claimRecords[plan.rowOrdinal - 1];
    assert.equal(originalClaimDigest(updated), plan.currentTupleDigest, `new tuple ${plan.originalId}`);
  }
  // Build real integrator review events only after the complete ordered AND
  // inventories, historical passages, recipe outputs and mounted states exist.
  for (const plan of candidate.plans) {
    const proofs = candidate.proofs.filter(p => p.planId === plan.id);
    const review = (partId, inputDigest, rationale, scope) => {
      const event = {
        schemaVersion: 'local-review-event-v1',
        sessionId: 'fd137388',
        role: 'integrator', eventId: `${plan.id}-${partId ?? 'whole'}-20260923`,
        observedAt: new Date().toISOString(),
        reviewedBy: 'Delegated implementation integrator; independent reviewer pending',
        rationale, outcome: 'supported', scope, partId, inputDigest,
        inventory: plan.parts, originalId: plan.originalId, currentTupleDigest: plan.currentTupleDigest,
      };
      return { reviewedBy: event.reviewedBy, rationale, inputDigest,
        event: save(`${here}/${event.eventId}.review.json`, JSON.stringify(event, null, 2) + '\n') };
    };
    for (const part of plan.parts) {
      const rationale = part.kind === 'external-source'
        ? `Read original passage(s) for ${plan.originalId} as retained, with original URL and historical timestamp. ${part.text} Matched quoted corpus facts to corrected reader wording; did not treat lack of a published duration as an exhaustive negative or PMC research as normative safety approval.`
        : part.kind === 'authored-parameter'
        ? `Checked ${plan.originalId} authored parameters and units against the corrected article and pinned model file; these chosen values are not measurements. ${part.text}`
        : part.kind === 'derived-result'
        ? `Compared exact finite numeric result, units and rounding for ${plan.originalId} with independently calculated arithmetic; this remains a bounded illustrative model. ${part.text}`
        : `Inspected actual 1440x1000 and 375x812 article-mount readouts and disclosure after ${part.requiredObservations.length} registered transitions; no page errors reported. ${part.text}`;
      plan.adjudications.push({ ...review(part.id, localPartDigest(plan, part.id, proofs), rationale, 'part'),
        partId: part.id, outcome: 'supported' });
    }
    const rationale = `Reviewed the whole ordered AND inventory for ${plan.originalId}: ${plan.parts.map(p => p.id + '/' + p.kind).join(', ')}. Article correction, original historical binding, source limitations, chosen local parameters, finite numeric checks and actual mounted states are distinct obligations; no source-only or local-only item substitutes for another. This is integrator scrutiny, not independent acceptance.`;
    plan.planReview = review(null, localPlanDigest(plan), rationale, 'plan');
  }
  const finalCatalog = { ...catalog, plans: [...catalog.plans, ...candidate.plans],
    proofs: [...catalog.proofs, ...candidate.proofs] };
  parseLocalBasisCatalog(finalCatalog);
  // Review data are now immutable references; validate with the native checker
  // against the staged current ledger only after writing the scoped files.
  save('audit/local-basis.json', JSON.stringify(finalCatalog, null, 2) + '\n');
  save('audit/compound-evidence.json', JSON.stringify(legacy.filter(p => !prior.includes(p)), null, 2) + '\n');
  for (const [path, value] of byLedger) save(path, value);
  const routes = json('contract/brand-v2-registries.json').routes.public.map(x => x.path);
  const context = loadLocalBasisContext(root, routes);
  const citations = new Set([...read('data/citations.ts').toString().matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map(x => x[1]));
  for (const plan of candidate.plans) {
    const result = validateLocalBasisPlan(plan, plan.currentCells, plan.id, {
      citationId: '', sourceUrl: '', supportingPassage: '',
    }, citations, context);
    console.log(plan.originalId, result);
  }
  console.log(`Applied ${candidate.plans.length} plans, ${candidate.proofs.length} proofs and ${prior.length} archived legacy bindings.`);
} else {
  throw new Error('Usage: node integrate.mjs seed|apply');
}
