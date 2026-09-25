/**
 * Neutral-tooling gate: the public repository reads as a normally
 * maintained project.
 *
 * The owner decision owner-decision-public-repo-neutral-tooling-20260925
 * removed assistant/tool names, model routes, session identifiers and local
 * machine paths from every tracked file while keeping the robotics subject
 * matter intact. Nothing enforced that state: a later edit could reintroduce
 * a tool name and every suite would stay green. This gate fails on
 * reintroduction.
 *
 * What this gate checks, over the tracked file set only (git ls-files):
 *
 * - tool and harness names in any spelling this repository used
 *   (Droid in a tooling sense, Codex outside the quoted code-davinci-002
 *   passage, droidproxy, factory-droid, the private branch and checkout
 *   names, FetchUrl/WebSearch tool spellings);
 * - model-route strings (custom:... routes, Astra/Sol effort routes,
 *   GLM-5.3, gpt-6-astra/sol, grok-4.x) that only exist as routing debris;
 * - session and mission identifiers: full UUIDs outside source URLs, the
 *   mission id, `.factory/missions` and `.factory/sessions` paths;
 * - local machine paths (`/home/<user>/...`) except the repository's own
 *   `components/home/` and `app/home/` directories and the `/home/<id>/en/`
 *   URL path segment the market-map sources use;
 * - `Co-authored-by` trailers naming the assistant.
 *
 * Robotics subject matter is explicitly out of scope and never flagged: the
 * DROID dataset and its quoted passages (including the mixed-case "Droid"
 * spelling the dataset's own materials use), model names inside quoted
 * benchmark tables and citations (Claude-3.5-Sonnet, Anthropic, OpenAI
 * Codex code-davinci-002), NASA missions, the Gemini GR-ER orchestrator,
 * human authors such as Claude Shannon or Jean-Claude Latombe, factory-floor
 * KPIs, and UUIDs that are part of a cited URL.
 *
 *   npm run check:neutral-tooling
 *
 * Exit code 1 on the first reintroduction it finds, 0 on a clean tree.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Violation = { file: string; line: number; rule: string; snippet: string };

const root = new URL('..', import.meta.url).pathname;
const files = execSync('git ls-files', { cwd: root, encoding: 'utf8', maxBuffer: 1 << 24 })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !/\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|otf|mp4|webm|glb|bin|drc|ktx2|zip|gz|xz)$/i.test(file))
  // The enforcement files carry the vocabulary they forbid: their tables and
  // rules are the definition of this gate, not reintroduced traces.
  .filter((file) => file !== 'scripts/check-neutral-tooling.ts' && file !== 'lib/neutral-tooling.ts');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** A UUID that is part of a cited URL stays verbatim; URLs are source truth. */
function uuidInsideUrl(line: string, uuid: string): boolean {
  const at = line.indexOf(uuid);
  for (const match of line.matchAll(/https?:\/\/\S+/g)) {
    const url = match[0];
    const start = match.index ?? 0;
    if (at >= start && at + uuid.length <= start + url.length) return true;
  }
  return false;
}

/** Robotics subject-matter scopes where the dataset spelling legitimately lives. */
const SUBJECT_MATTER_SCOPES = /^(content|research|audit|tests|evidence|data)\//;
const TOOLING_CONTEXT = /\b(integrator|auditor|worker|delegated|session|mission|reviewer|harness|watcher|orchestrat(?:ed|ing) by)\b/i;

const rules: Array<{
  id: string;
  test: (line: string, file: string) => string | null;
}> = [
  {
    id: 'tool names',
    test: (line) => line.match(/\bdroidproxy\b|\bfactory-droid\b|robot-wiki-droid|josef\/droid-wiki-continuation|\bFetchUrl\b|\bWebSearch\b/i)?.[0] ?? null,
  },
  {
    id: 'Droid in a tooling sense',
    test: (line) => {
      for (const match of line.matchAll(/\bDroid\b/g)) {
        const context = line.slice(Math.max(0, match.index - 60), match.index + 70);
        if (TOOLING_CONTEXT.test(context)) return match[0];
      }
      return null;
    },
  },
  {
    id: 'Droid outside subject matter',
    test: (line, file) => (SUBJECT_MATTER_SCOPES.test(file) ? null : line.match(/\bDroid\b/)?.[0] ?? null),
  },
  {
    id: 'Codex outside the quoted passage',
    test: (line) => (line.includes('OpenAI Codex code-davinci-002') ? null : line.match(/\bCodex\b/)?.[0] ?? null),
  },
  {
    id: 'model routes',
    test: (line) =>
      line.match(/\bcustom:[a-z0-9]+:|Z\.AI-Coding-Plan|\bGLM[- ]5\.3\b|\bGLM\b|gpt-6-(?:astra|sol)\b|grok-4(?:\.\d)?|\bAstra\/(?:max|high)\b|\bSol\/(?:max|high|xhigh)\b|GPT-6 (?:Astra|Sol)\b/i)?.[0] ?? null,
  },
  {
    id: 'model names in a tooling sense',
    test: (line) => {
      for (const match of line.matchAll(/\b(?:Claude|Anthropic)\b/g)) {
        const context = line.slice(Math.max(0, match.index - 60), match.index + 70);
        if (/\b(integrator|delegated|route|custom:|coding agent|assistant|reviewed by)\b/i.test(context)) return match[0];
      }
      return null;
    },
  },
  {
    id: 'mission and session identifiers',
    test: (line, file) => {
      if (/fd137388-f254-4d11-97b1-548904d2cad2/.test(line)) return 'fd137388-f254-4d11-97b1-548904d2cad2';
      if (/\.factory\/(missions|sessions|droids)/.test(line)) return line.match(/\.factory\/(?:missions|sessions|droids)[^"'\s]*/)?.[0] ?? '.factory';
      // Verbatim captures of external pages keep the captured page's own ids.
      if (/\.html$/.test(file)) return null;
      for (const match of line.matchAll(UUID)) {
        if (!uuidInsideUrl(line, match[0])) return match[0];
      }
      return null;
    },
  },
  {
    id: 'local machine paths',
    test: (line) => {
      for (const match of line.matchAll(/\/home\/[A-Za-z0-9][A-Za-z0-9._-]*/g)) {
        const before = line.slice(Math.max(0, match.index - 12), match.index);
        if (/(?:components|app)\/$/.test(before)) continue; // repository's own home/ directories
        // A `/home/...` segment inside a cited URL is the source site's own
        // path, not a checkout on this machine.
        if (uuidInsideUrl(line, match[0])) continue;
        if (/^\/home\/so101-chain-preview/.test(match[0])) continue; // home playground route
        // `/home/<numeric id>/` is the URL path segment the market-map
        // sources use; only flag it when it is not part of a cited URL.
        if (/^\/home\/\d{8,14}\b/.test(match[0]) && uuidInsideUrl(line, `/home/x${match[0].slice(6)}`) === false) {
          if (line.includes('http')) continue;
        }
        if (/^\/home\/\d{8,14}\b/.test(match[0])) continue;
        return match[0];
      }
      return null;
    },
  },
  {
    id: 'local account names',
    test: (line) => line.match(/\bremy-simpc4\b/)?.[0] ?? null,
  },
  {
    id: 'assistant commit trailers',
    test: (line) => line.match(/Co-authored-by:[^\n]{0,90}(factory-droid|droid|codex)/i)?.[0] ?? null,
  },
];

const violations: Violation[] = [];
outer: for (const file of files) {
  let text: string;
  try {
    text = readFileSync(resolve(root, file), 'utf8');
  } catch {
    continue; // deleted in the working tree; not part of the published content
  }
  if (text.includes('\u0000')) continue;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const rule of rules) {
      const hit = rule.test(lines[i], file);
      if (hit) {
        violations.push({ file, line: i + 1, rule: rule.id, snippet: hit });
        if (violations.length >= 25) break outer;
      }
    }
  }
}

if (violations.length) {
  console.error(`neutral-tooling: ${violations.length} reintroduction(s) of non-public tooling traces`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.snippet}`);
  }
  process.exit(1);
}
console.log('neutral-tooling: OK (no tool, route, session or machine traces in tracked files)');
