// This assembles retained execution outputs; it does not adjudicate a plan.
import fs from 'node:fs';
import { originalClaimDigest } from '../../../lib/audit-ledger.ts';
import { parseLocalBasisCatalog } from '../../../lib/audit-local-basis.ts';
import { ARTICLE, DIRECTORY, ROOT, rewardDisclosure, eurekaDisclosure, artifact, member, save } from './proof-support.ts';
const read = name => JSON.parse(fs.readFileSync(`${DIRECTORY}/${name}`, 'utf8'));
const bindings = read('selected-bindings.json');
const numeric = read('numeric-run.json');
const browser = read('browser-run.json');
const sources = read('source-provenance.json').representations;
const registry = JSON.parse(fs.readFileSync('contract/brand-v2-registries.json', 'utf8')).interactive;
const proofs = [];
const plans = [];
function source(partId, citationId, name, start, end) {
  const file = `${DIRECTORY}/${name}`;
  const body = fs.readFileSync(file, 'utf8');
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw Error(`Missing source boundaries ${partId}`);
  const supportingPassage = body.slice(from, to);
  const p = sources.find(s => s.citationId === citationId);
  return {
    partId, citationId, sourceUrl: p.sourceUrl, supportingPassage,
    provenance: {
      retrievedAt: p.retrievedAt,
      tool: citationId === 'rudin-2021' ? 'Retained web fetch rendered full text; original tool response time'
        : citationId === 'legged-gym-repo-2021' ? 'Retained initial-commit API GET; exact addition reconstructed and upstream Git blob verified'
          : 'Retained original PDF GET and pdftotext reading extraction; matched embedded original capture, no new fetch or conversion',
      response: artifact(file), passage: member(file, supportingPassage),
    },
  };
}
const current = {
  4: {
    claim: 'Twelve authored reward terms and labeled weight controls feed an illustrative signed weighted sum and drawn preview, not the full paper or reference-code objective.',
    sourceChecked: 'Retained Rudin full text (2026-09-06 web fetch); legged_gym initial commit ae614c029977157123225f538ecdd3f873e54bd4 (2026-09-08 API extraction); actual 2026-09-23 typed reward parameter, arithmetic and mounted-browser runs.',
    verdict: 'C',
    note: 'The original full-term-set assertion is corrected, not verified. Nine paper terms and the reference stumble definition have separate fetched-source evidence; twelve UI terms are authored choices. Default total -5.52 is dimensionless per step. Twelve labeled controls and default/reset are observed, not inferred from code. Original cells, prior held tuple, withdrawn reviews and removed legacy plan remain unchanged in correction history and audit/evidence/reward-local-20260923. Owner-approved authored-local-basis-v1 applies only to disclosed local parts; every external AND local obligation is retained. Historical fetch times are not current liveness. No policy training, independent acceptance or green content gate is claimed.',
  },
  5: {
    claim: 'Freeze, prance and chatter are authored classifier and pose choices, distinct from Rudin observed artifacts; actual mounted controls select the three previews and Reset restores balanced.',
    sourceChecked: 'Retained Rudin simulation artifact/tuning paragraph (2026-09-06 web fetch); actual 2026-09-23 reward parameter extraction, six independently checked input cases and mounted freeze/prance/chatter/reset observations.',
    verdict: 'C',
    note: 'The original literature/lab-lore attribution is corrected to a disclosed local taxonomy, not proved by a paper. Chatter actionRate <= 0.2 has priority; otherwise torque >= 2.5 and >= 2*velTrack selects freeze, then the analogous airTime rule selects prance, else balanced. Authored inputs bind default, freeze, prance, chatter, dominance counterexample and priority tie; totals and phase-zero poses are local outputs, not learned optima, physical frequencies or damage predictions. Rudin separately reports a dragging leg and unreasonable base heights before weight tuning and transfer. All prior cells/reviews/plan are archived unchanged; all external AND local parts are required. No new fetch or independent acceptance.',
  },
  11: {
    claim: 'EurekaLoop is a three-generation authored teaching script with fitness 0.31/0.58/0.86, code/statistic/reflection fixtures, derived line diffs and observed 0-to-1-to-2/disabled/reset controls; it is not a recorded Eureka or PPO run.',
    sourceChecked: 'Retained Eureka v2 PDF-derived reading text from the 2026-09-08 GET; actual 2026-09-23 complete scripted-data extraction, independently checked diffs/formatting and mounted replay observations.',
    verdict: 'C',
    note: 'The formerly ambiguous replay paragraph now explicitly identifies every generation, number and reflection as authored teaching data. The methods source supports reward-code search, PPO/task-fitness evaluation and scalar reward reflection, not this walking transcript. Browser actions advance the existing script without training or an LLM call. Final Next is disabled and Reset returns generation zero. Original and held cells, withdrawn reviews and selected legacy plan survive in non-counted history. Full external AND local proof uses the owner-approved typed branch; original retrieval dates remain historical. Not source certification of invented experiment data, whole-article cleanliness or independent acceptance.',
  },
};
function transition(family, caseId, prestate, action, poststate) {
  return { mountId: `mount:/rl-sim2real/reward-design-mpc/:${family === 'reward' ? 'RewardShaping' : 'EurekaLoop'}:1`, caseId, prestate, action, poststate };
}
for (const binding of bindings) {
  const n = binding.rowOrdinal;
  const family = n === 11 ? 'eureka' : 'reward';
  const component = n === 11 ? 'EurekaLoop' : 'RewardShaping';
  const registeredSource = registry.sources.find(s => s.id === `interactive:${component}`);
  const registeredMount = registry.mounts.find(m => m.id === `mount:/rl-sim2real/reward-design-mpc/:${component}:1`);
  const disclosureText = n === 11 ? eurekaDisclosure : rewardDisclosure;
  const plan = {
    id: `reward-local-r${n}-20260923`, kind: 'explicit-parts-v2',
    originalId: binding.originalId, ledgerPath: 'audit/rl-sim2real.md', articleSlug: 'reward-design-mpc', rowOrdinal: n,
    originalBinding: { ...binding.originalBinding, snapshot: artifact(`${DIRECTORY}/original-rl-sim2real.md`) },
    currentCells: current[n], currentTupleDigest: originalClaimDigest(current[n]),
    mounts: [{ sourceId: registeredSource.id, sourceFingerprint: registeredSource.fingerprint,
      mountId: registeredMount.id, mountFingerprint: registeredMount.fingerprint, route: registeredMount.route }],
    disclosure: { member: member(ARTICLE, disclosureText), text: disclosureText },
    parts: [], evidence: [], planReview: null, adjudications: [],
  };
  const prepared = id => binding.parts.find(p => p.id === id);
  const addPart = (id, kind, ids, extra = {}) => plan.parts.push({
    id, kind, text: prepared(id)?.text ?? extra.text,
    ...(kind === 'external-source' ? { requiredCitationIds: ids } : { requiredProofIds: ids }),
    ...(kind === 'observed-behavior' ? { requiredObservations: extra.transitions } : {}),
  });
  function addProof(id, partId, kind, data, run, observations = []) {
    for (const dependency of data.dependencies) {
      if (artifact(dependency.file.path).sha256 !== dependency.file.sha256) throw Error(`Post-run drift: ${dependency.file.path}`);
    }
    const input = save(`${id}.input.json`, data.recipe);
    const output = save(`${id}.output.json`, data.expected);
    const provenance = {
      command: run.command, runner: run.runner, cwd: ROOT, environment: run.environment,
      startedAt: run.startedAt, endedAt: run.endedAt, exitCode: 0, test: run.test,
    };
    const receipt = save(`${id}.receipt.json`, {
      schemaVersion: 'local-run-v1', ...provenance, inputDigest: input.sha256, outputDigest: output.sha256,
      dependencies: data.dependencies, observations,
    });
    const bases = [];
    if (kind !== 'authored-parameter') {
      if (family === 'reward') {
        const defaults = numeric.cases.find(c => c.id === `r${n}-parameters`).expected.values;
        const found = Object.entries(defaults.authoredCases).find(([,c]) => JSON.stringify(c.weights) === JSON.stringify(data.recipe.inputs.weights));
        const pointer = JSON.stringify(defaults.weights) === JSON.stringify(data.recipe.inputs.weights) ? '/weights' : `/authoredCases/${found?.[0]}/weights`;
        bases.push({ input: 'weights', kind: 'authored-parameter', proofId: `r${n}-parameters`, pointer, unit: 'dimensionless' },
          { input: 'phase', kind: 'authored-parameter', proofId: `r${n}-parameters`, pointer: '/phase', unit: 'cycle' });
      } else {
        for (const input of ['previous', 'next']) bases.push({ input, kind: 'authored-parameter', proofId: 'r11-parameters', pointer: `/generations/${data.recipe.inputs[input]}/index`, unit: 'index' });
      }
    }
    proofs.push({
      id, planId: plan.id, partId, originalId: plan.originalId,
      originalTupleDigest: plan.originalBinding.originalTupleDigest, currentTupleDigest: plan.currentTupleDigest,
      kind, artifacts: data.dependencies, disclosure: plan.disclosure, recipe: data.recipe, expected: data.expected,
      input, output, inputDigest: input.sha256, outputDigest: output.sha256,
      provenance: { ...provenance, receipt }, bases,
      ...(kind === 'observed-behavior' ? { observations } : {}),
    });
  }
  const num = (id, part, kind) => addProof(id, part, kind, numeric.cases.find(c => c.id === id), numeric);
  const obs = (name, t) => {
    const captured = browser.observations.find(o => o.name === name);
    if (!captured) throw Error(`Missing actual observation ${name}`);
    return { ...t, viewport: captured.viewport, readouts: captured.readouts, dom: captured.dom, capture: captured.capture };
  };
  function observe(id, part, text, name, t) {
    addPart(part, 'observed-behavior', [id], { text, transitions: [t] });
    addProof(id, part, 'observed-behavior', browser.observations.find(o => o.name === name), browser, [obs(name, t)]);
  }
  if (n === 4) {
    addPart('r4-paper-boundary', 'external-source', ['rudin-2021']);
    addPart('r4-reference-code-boundary', 'external-source', ['legged-gym-repo-2021']);
    plan.evidence.push(source('r4-paper-boundary', 'rudin-2021', 'source-rudin.txt', '|  | definition | weight |', '### A.4'));
    plan.evidence.push(source('r4-reference-code-boundary', 'legged-gym-repo-2021', 'source-legged-robot.txt', '    def _reward_stumble(self):', '    def _reward_stand_still'));
    addPart('r4-parameters', 'authored-parameter', ['r4-parameters']);
    addPart('r4-total', 'derived-result', ['r4-default']);
    num('r4-parameters', 'r4-parameters', 'authored-parameter'); num('r4-default', 'r4-total', 'derived-result');
    const t = [
      transition('reward', 'default', 'Article not loaded', 'Navigate to the registered article mount', 'Twelve labeled controls; default weights; balanced; phase 0; total -5.52'),
      transition('reward', 'reset', 'Chatter with action-rate weight 0', 'Activate RewardShaping Reset', 'All default weights and original phase-zero pose; balanced; total -5.52'),
    ];
    addPart('r4-mounted-controls', 'observed-behavior', ['r4-mounted'], { transitions: t });
    addProof('r4-mounted', 'r4-mounted-controls', 'observed-behavior', browser.observations.find(o => o.name === 'reward-default'), browser, [obs('reward-default', t[0]), obs('reward-reset', t[1])]);
  } else if (n === 5) {
    addPart('r5-rudin-contrast', 'external-source', ['rudin-2021']);
    plan.evidence.push(source('r5-rudin-contrast', 'rudin-2021', 'source-rudin.txt', 'Given our relatively simple rewards', 'To verify the generalizability'));
    addPart('r5-classifier-parameters', 'authored-parameter', ['r5-parameters']);
    const cases = ['default', 'freeze', 'prance', 'chatter', 'dominanceCounterexample', 'priorityTie'];
    addPart('r5-classifier-and-pose', 'derived-result', cases.map(c => `r5-${c}`));
    num('r5-parameters', 'r5-classifier-parameters', 'authored-parameter');
    for (const c of cases) num(`r5-${c}`, 'r5-classifier-and-pose', 'derived-result');
    for (const [name, action, status] of [
      ['freeze', 'Focus Torque penalty weight; press End to set 4', 'freeze, phase 0, total -8.72'],
      ['prance', 'Focus Foot air time weight; press End to set 4', 'prance, phase 0, total -3.48'],
      ['chatter', 'Focus Action-rate penalty weight; press Home to set 0', 'chatter, phase 0, total -4.72'],
      ['reset', 'Activate RewardShaping Reset', 'balanced, original phase-zero pose, total -5.52'],
    ]) observe(`r5-observed-${name}`, `r5-mounted-preview-${name}`,
      `${prepared('r5-mounted-preview').text} This conjunct binds the ${name} transition and its own output.`,
      `reward-${name}`, transition('reward', name === 'reset' ? 'reset' : 'slider-boundaries-and-anchors', name === 'reset' ? 'Chatter at action-rate 0' : 'Reset defaults, balanced, phase 0', action, status));
  } else {
    addPart('r11-eureka-mechanism', 'external-source', ['eureka-2024']);
    plan.evidence.push(source('r11-eureka-mechanism', 'eureka-2024', 'source-eureka.txt', 'Definition 2.1.', 'Human Normalized Score Reporting.'));
    addPart('r11-authored-transcript', 'authored-parameter', ['r11-parameters']);
    addPart('r11-diffs', 'derived-result', [0, 1, 2].map(i => `r11-generation-${i}`));
    num('r11-parameters', 'r11-authored-transcript', 'authored-parameter');
    for (const i of [0, 1, 2]) num(`r11-generation-${i}`, 'r11-diffs', 'derived-result');
    for (const [name, before, action, after, caseId] of [
      ['0', 'Article loaded, replay not advanced', 'Read initial mounted replay', 'Generation 0 of 2, fitness 0.31, sprint/fall fixtures, Next enabled', 'default'],
      ['1', 'Generation 0', 'Focus Run next generation and press Enter', 'Generation 1 of 2, fitness 0.58, standing-still fixtures, diff, Next enabled', 'focus-each-control'],
      ['2', 'Generation 1', 'Focus Run next generation and press Enter', 'Generation 2 of 2, fitness 0.86, tracking fixtures, diff, Next disabled', 'focus-each-control'],
      ['reset', 'Generation 2 with Next disabled', 'Activate EurekaLoop Reset', 'Generation 0 of 2, fitness 0.31, no diff, Next enabled', 'reset'],
    ]) observe(`r11-observed-${name}`, `r11-mounted-replay-${name}`,
      `${prepared('r11-mounted-replay').text} This conjunct binds the ${name} transition; it does not certify the entire registry case population.`,
      `eureka-${name}`, transition('eureka', caseId, before, action, after));
  }
  plans.push(plan);
}
const catalog = parseLocalBasisCatalog({ schemaVersion: 'authored-local-basis-v1', plans, proofs });
save('catalog-draft.json', catalog);
console.log(JSON.stringify({ plans: plans.length, parts: plans.map(p => p.parts.length), external: plans.flatMap(p => p.evidence).length, proofs: proofs.length, reviews: 0, adopted: false }));
