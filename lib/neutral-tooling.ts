/**
 * Neutral tooling vocabulary for the public repository.
 *
 * The repository is published as a normally maintained project: local
 * absolute paths, private mission identifiers, assistant/tool names, model
 * routes and session identifiers never appear in tracked files. Robotics
 * subject matter that legitimately carries similar words (the DROID dataset
 * and its citations, model names inside quoted benchmark tables, NASA
 * missions, the Gemini GR-ER orchestrator, human authors such as Claude
 * Shannon or Jean-Claude Latombe, factory-floor sources) is explicitly not
 * in scope.
 *
 * `neutralizeHistory` renders a historical revision of a tracked file with
 * the same neutral vocabulary used today, so evidence archives can keep
 * proving "these are the exact pre-change bytes" against the current
 * spelling of identifiers that the project deliberately re-worded. It is a
 * presentation of the committed bytes, never a rewrite of them.
 */

type Rule = [RegExp, string | ((...args: never[]) => string)];

// Glued forms ("thread01a05ed5-...") are recorded the same way, so the
// pattern matches them too; only URL-embedded ids stay verbatim.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;

const RULES: readonly Rule[] = [
  // A. absolute local paths -> repo-relative / run-relative
  // The local username is matched literally: a generic `/home/<name>` rule
  // would also swallow legitimate repository paths such as
  // `components/home/so101-chain-preview.tsx` inside historical evidence.
  [/\/home\/remy-simpc4\/Projects\/robot-wiki-droid-continuation\//g, ''],
  [/\/home\/remy-simpc4\/\.factory\/missions\/fd137388-f254-4d11-97b1-548904d2cad2\//g, ''],
  [/\/home\/remy-simpc4\/\.local\/share\/robot-wiki-codex-bridge\//g, ''],
  [/\/home\/remy-simpc4\/\.factory\/sessions\/-home-remy-simpc4-Projects-robot-wiki-droid-continuation\//g, 'run/'],
  [/\/home\/remy-simpc4\/\.factory\/sessions\/-home-remy-simpc4-Projects-robot-wiki-release\//g, 'run/'],
  [/\/home\/remy-simpc4\/\.factory\/sessions\//g, 'run/'],
  [/"cwd": "\/home\/remy-simpc4\/Projects\/robot-wiki-droid-continuation\/([^"]*)"/g, '"cwd": "/srv/robot-wiki/$1"'],
  [/"cwd": "\/home\/remy-simpc4\/Projects\/robot-wiki-release\/([^"]*)"/g, '"cwd": "/srv/robot-wiki/$1"'],
  [/"cwd": "\/home\/remy-simpc4\/Projects\/robot-wiki-droid-continuation"/g, '"cwd": "/srv/robot-wiki"'],
  [/"cwd": "\/home\/remy-simpc4\/Projects\/robot-wiki-release"/g, '"cwd": "/srv/robot-wiki"'],
  [/`\/home\/remy-simpc4\/Projects\/robot-wiki-droid-continuation`/g, '`the repository root`'],
  [/\/home\/remy-simpc4\/Projects\/robot-wiki-droid-continuation/g, '.'],
  [/\/home\/remy-simpc4\/Projects\/robot-wiki-release/g, '.'],
  [/\/home\/remy-simpc4\/Projects\//g, ''],
  [/\/home\/remy-simpc4\/\.local\/share\//g, ''],
  [/\/home\/remy-simpc4\/\.factory\//g, ''],
  [/\/home\/remy-simpc4/g, ''],
  // B. mission id forms
  [/fd137388-f254-4d11-97b1-548904d2cad2-as([0-9a-z]+)/g, 'as$1'],
  [/fd137388-f254-4d11-97b1-548904d2cad2/g, 'fd137388'],
  [/fd137388-techwithdraw/g, 'techwithdraw'],
  [/mis_2b1673fa/g, '2b1673fa'],
  // C. model routes
  [/Delegated Droid Sol\/max integrator/g, 'Delegated implementation integrator'],
  [/Droid Sol\/max integrator/g, 'implementation integrator'],
  [/\(GPT 6 Astra\)/g, ''],
  [/independent Sol\/high /g, 'independent '],
  [/independent Sol\/max /g, 'independent '],
  [/independent Sol /g, 'independent '],
  [/GLM-5\.3\/max integrator as/g, 'integrator run as'],
  [/GLM-5\.3\/max integrator/g, 'integrator'],
  [/GLM 5\.3\/max/g, 'integrator review'],
  [/GLM-5\.3\/max/g, 'integrator review'],
  [/custom:droidproxy:gpt-6-astra\/max/g, 'integrator review'],
  [/custom:droidproxy:gpt-6-sol\/max/g, 'integrator review'],
  [/custom:droidproxy:grok-4\.6\/high/g, 'independent review'],
  [/custom:droidproxy:grok-4\.6/g, 'independent review'],
  [/custom:droidproxy:gpt-6-sol/g, 'integrator review'],
  [/custom:droidproxy:gpt-6-astra/g, 'integrator review'],
  [/custom:GLM-\[Z\.AI-Coding-Plan\]---Anthropic-2/g, 'review pass'],
  [/custom:GLM Z\.AI Coding Plan, max effort/g, 'review pass'],
  [/GLM\/Anthropic-2 max route/g, 'review route'],
  [/historical GLM\/max integration/g, 'historical integration'],
  [/historical GLM attribution/g, 'historical attribution'],
  [/Astra\/max/g, 'integrator review'],
  [/Sol\/high/g, 'independent review'],
  [/Sol\/max/g, 'integrator review'],
  // D. harness tool names
  [/FetchUrl/g, 'web fetch'],
  [/WebSearch/g, 'web search'],
  [/Factory API error/g, 'API error'],
  [/Factory Droid and other coding agents/g, 'coding agents'],
  [/robot-wiki-droid-mission\.service/g, 'robot-wiki.service'],
  [/\n?Co-authored-by: factory-droid\[bot\] <138933559\+factory-droid\[bot\]@users\.noreply\.github\.com>/g, ''],
  [/\\nCo-authored-by: factory-droid\[bot\] <138933559\+factory-droid\[bot\]@users\.noreply\.github\.com>/g, ''],
  [/kroger-archive-fetchurl/g, 'kroger-archive-webfetch'],
  [/fetchurl/g, 'webfetch'],
  // E. Droid roles (the DROID dataset and its quoted passages are untouched)
  [/"reviewedBy": "Droid delegated integrator/g, '"reviewedBy": "delegated integrator run'],
  [/"reviewedBy": "Droid integrator /g, '"reviewedBy": "integrator run '],
  [/"reviewedBy": "Droid source auditor, session /g, '"reviewedBy": "source auditor, run '],
  [/"reviewedBy": "Droid content-auditor\/integrator /g, '"reviewedBy": "content-auditor/integrator run '],
  [/"reviewedBy": "Droid source auditor/g, '"reviewedBy": "source auditor'],
  [/"reviewedBy": "Droid /g, '"reviewedBy": "reviewer run '],
  [/Applied and reviewed by Droid /g, 'Applied and reviewed in run '],
  [/Droid integrator /g, 'integrator run '],
  [/ by Droid source-auditor\/integrator /g, ' by source-auditor/integrator run '],
  [/source-auditor Droid worker /g, 'source-auditor run '],
  [/source-auditor Droid /g, 'source-auditor run '],
  [/implementation writer: Droid /g, 'implementation writer run '],
  [/, Droid ([0-9a-f]{8})/g, ', run $1'],
  [/the Robot Wiki Droid mission branch josef\/droid-wiki-continuation/g, 'the Robot Wiki continuation branch'],
  [/josef\/droid-wiki-continuation/g, 'the continuation branch'],
  [/the Droid audit lane/g, 'the audit lane'],
  [/uncommitted Droid worktree/g, 'uncommitted working tree'],
  // F. mission -> project/program/record
  [/Robot Wiki mission continuation/g, 'Robot Wiki project continuation'],
  [/Mission continuation/g, 'Project continuation'],
  [/mission continuation/g, 'project continuation'],
  [/Mission final-two-citation/g, 'Record final-two-citation'],
  [/Mission 2b1673fa/g, 'Record 2b1673fa'],
  [/\(Mission skills\/content-auditor\)/g, '(recorded procedure inventory)'],
  [/mission-local/g, 'local'],
  [/Mission-local/g, 'local'],
  [/mission editorial authority/g, 'project editorial authority'],
  [/mission PDF\/text/g, 'record PDF/text'],
  [/the mission branch/g, 'the continuation branch'],
  [/exact mission industrial/g, 'exact industrial'],
  [/Robot Wiki Mission/g, 'Robot Wiki project'],
  [/features\/Mission\/controller/g, 'features/controller'],
  [/feature\/Mission\/controller/g, 'feature/controller'],
  [/ Mission\/controller/g, ' controller'],
  [/inherited Mission/g, 'inherited project'],
  [/new Mission/g, 'new project'],
  [/Mission acceptance/g, 'project acceptance'],
  [/the Mission packet/g, 'the record packet'],
  [/The broader Mission/g, 'The broader project'],
  [/assigned Mission\/product/g, 'assigned project'],
  [/non-Mission /g, 'non-project '],
  [/mission owner brief/g, 'project owner brief'],
  [/the mission directory/g, 'the records directory'],
  [/finishing the mission remainder/g, 'finishing the remaining work'],
  [/Mission status/g, 'program status'],
  [/Mission skill inventory/g, 'procedure inventory'],
  [/Formal Mission progress/g, 'Formal program progress'],
  [/in the existing Mission/g, 'in the existing project'],
  [/the existing Mission's/g, "the existing project's"],
  [/Mission gate inputs/g, 'program gate inputs'],
  [/&lt;mission captures/g, '&lt;review captures'],
  [/<mission captures/g, '<review captures'],
  [/mission captures-mobile/g, 'review captures-mobile'],
  [/with Mission output path/g, 'with program output path'],
  [/Mission-only evidence input/g, 'program-only evidence input'],
  [/the mission's uncredentialed/g, "the program's uncredentialed"],
  [/the mission's residual/g, "the program's residual"],
  [/the mission evidence directory/g, 'the evidence directory'],
  [/Mission-state change/g, 'program-state change'],
  [/existing-Mission source-backed/g, 'existing source-backed'],
  [/mission industrial52/g, 'project industrial52'],
  [/the mission RoboMIND/g, 'the project RoboMIND'],
  [/mission primary citations/g, 'project primary citations'],
  [/a separate mission hold/g, 'a separate program hold'],
  [/mission-owned dev/g, 'program-owned dev'],
  [/at mission worker-transcripts\.jsonl/g, 'at the recorded worker-transcripts.jsonl'],
  [/the Mission/g, 'the program'],
  [/The Mission/g, 'The program'],
  // G. worker -> run/reviewer (worker-robot subject matter untouched)
  [/implementation worker /g, 'implementation run '],
  [/source worker session/g, 'source review run'],
  [/Same-worker/g, 'Same-session'],
  [/source-worker review/g, 'source review'],
  [/source-worker proposals/g, 'source proposals'],
  [/worker proposals/g, 'source proposals'],
  [/source-worker prerequisites/g, 'source-review prerequisites'],
  [/No source-worker proposal label/g, 'No source proposal label'],
  [/either worker/g, 'either reviewer'],
  [/a single worker/g, 'a single writer'],
  [/in this worker/g, 'in this run'],
  [/worker-source-proof/g, 'source-proof'],
  [/worker-native/g, 'review-native'],
  [/worker-runtime\.py/g, 'review-runtime.py'],
  [/worker-readers\.mjs/g, 'review-readers.mjs'],
  [/The interrupted worker preservation helper/g, 'The interrupted preservation helper'],
  // H. Watcher
  [/native Watcher thread/g, 'recorded thread'],
  [/Watcher's bounded/g, 'The recorded bounded'],
  [/The Watcher policy\.py/g, 'The policy.py'],
  [/reused Watcher preservation/g, 'reused preservation'],
  // I. approvals and roles
  [/to the Claude release session/g, 'to the delegated release reviewer'],
  [/in this Codex task/g, 'in this review session'],
  [/in the Devin session/g, 'in the recorded owner session'],
  [/"implementer": "droid"/g, '"implementer": "implementation"'],
  [/"reviewer": "codex"/g, '"reviewer": "review"'],
  [/"owner": "codex"/g, '"owner": "review"'],
  [/ready_for_droid/g, 'ready_for_implementation'],
  // J. polished compounds
  [/integrator review implementation integrator/g, 'implementation integrator'],
  [/integrator review implementation source auditor/g, 'implementation source auditor'],
  [/reviewer run implementation run/g, 'implementation run'],
  [/run([0-9a-f]{8})\b/g, 'run $1'],
];

/** Is this UUID occurrence part of a URL (source identifiers stay verbatim)? */
function uuidInsideUrl(text: string, index: number): boolean {
  const windowStart = Math.max(0, index - 2048);
  const before = text.slice(windowStart, index);
  const lastOpen = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'), before.lastIndexOf('"'), before.lastIndexOf("'"));
  return before.slice(lastOpen + 1).includes('://');
}

export function neutralizeHistory(text: string): string {
  let out = text;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, replacement as never);
  }
  out = out.replace(UUID, (match, offset: number) =>
    uuidInsideUrl(out, offset) ? match : match.slice(0, 8));
  return out;
}
