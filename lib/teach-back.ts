/**
 * The teach-back records of the 3D explainers (VAL-OPUS-044).
 *
 * Each explainer has one record under `evidence/teach-back/`, carrying the
 * latest completed round as measured: a reviewer acting as a curious
 * non-engineer saw only screenshots of every step at 1280 and 390 px (the
 * guess and its reveal, and the self-check question without its answer).
 * The record keeps the reviewer's own takeaway, self-check answer and
 * unclear words, the noise audit of every step, the verdict those answers
 * give, and a digest of the explainer's scene module and the model files it
 * imports. A record is current while that digest matches and its registered
 * takeaway is still the explainer's.
 *
 * The owner accepted the explainers as they are on 12 Oct 2026, so no round
 * runs after round 2. A failing record from a round before that date stands
 * only with a line citing that acceptance and listing the residual unclear
 * words; a changed explainer needs a fresh round that passes.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TEACH_BACK_DIR = 'evidence/teach-back';
export const TEACH_BACK_WIDTHS = [1280, 390] as const;
export const SCENE_DIR = 'components/explainers/scenes';
export const WORDS_FILE = 'components/explainers/words.ts';
export const OWNER_ACCEPTANCE_DATE = '2026-10-12';
export const OWNER_ACCEPTANCE = 'Owner acceptance of 12 Oct 2026';

export type NoiseRow = {
  width: number;
  step: string;
  words: number;
  labels: number;
  controls: number;
  colours: string[];
};

export type TeachBackRecord = {
  schemaVersion: 'teach-back-record-v2';
  explainer: string;
  /** The teach-back round whose results the record carries. */
  round: number;
  screenshots: string[];
  /** The registered takeaway. */
  takeaway: string;
  /** The self-check as the reviewer saw it, and the reviewer's answer. */
  selfCheck: { question: string; answer: string; correct: boolean };
  sentence: string;
  /** The words the reviewer did not understand that count against a pass, each with the reviewer's note. */
  unclearTerms: string[];
  /** Words the reviewer also listed that the test does not count, each with the rule that lets it go. */
  uncountedTerms?: { term: string; why: string }[];
  samePoint: 'yes' | 'no';
  reason: string;
  noiseAudit: NoiseRow[];
  noiseClean: boolean;
  verdict: 'pass' | 'fail';
  /** On a failing record: the owner acceptance of 12 Oct 2026 and the residual unclear words. */
  ownerAcceptance?: string;
  /** Where the screenshots and noise audit come from, when not from the round's own run. */
  provenance?: string;
  screenshotCommit: string;
  date: string;
  reviewerSession: string;
  sourceDigest: string;
};

export const recordPath = (id: string) => `${TEACH_BACK_DIR}/${id}.json`;

const IMPORT = /(?:^|\n)\s*import\s[^;]*?from\s+'(\.[^']+)'/g;

/** The scene module and every model file it reaches through relative imports, kit and words excluded. */
export function explainerSources(root: string, id: string): string[] {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const path = join(root, file);
    if (!existsSync(path)) return;
    for (const [, spec] of readFileSync(path, 'utf8').matchAll(IMPORT)) {
      const next = normalize(join(dirname(file), spec));
      if (next.startsWith('components/explainers/models/')) visit(next);
    }
  };
  visit(`${SCENE_DIR}/${id}.js`);
  return [...seen].sort();
}

/** The explainer's own entry in the words file, read from `root`. */
export async function explainerWords(root: string, id: string): Promise<Record<string, unknown> | null> {
  const file = join(root, WORDS_FILE);
  if (!existsSync(file)) return null;
  const words = (await import(pathToFileURL(file).href)) as { EXPLAINER_WORDS: Record<string, Record<string, unknown>> };
  return words.EXPLAINER_WORDS[id] ?? null;
}

/** SHA-256 over the scene module's and model files' paths and bytes, in path order. */
export function explainerDigest(root: string, id: string): string {
  const hash = createHash('sha256');
  for (const path of explainerSources(root, id)) {
    const file = join(root, path);
    const bytes = existsSync(file) ? readFileSync(file) : Buffer.from('(missing)');
    hash.update(`${path}\0${createHash('sha256').update(bytes).digest('hex')}\n`);
  }
  return hash.digest('hex');
}

/** The verdict a record's measured answers give: a pass needs every part of the test. */
export function measuredVerdict(record: Pick<TeachBackRecord, 'samePoint' | 'selfCheck' | 'unclearTerms' | 'noiseClean'>): 'pass' | 'fail' {
  const pass = record.samePoint === 'yes' && record.selfCheck?.correct === true && (record.unclearTerms ?? []).length === 0 && record.noiseClean === true;
  return pass ? 'pass' : 'fail';
}

/** An unclear-word entry without the reviewer's closing note: `"full strength" (of what)` gives `"full strength"`. */
export const residualTerm = (entry: string) => entry.replace(/\s*\([^()]*\)\s*$/, '').trim();

/** The line a failing record carries: the owner acceptance and its residual unclear words. */
export const ownerAcceptanceLine = (unclearTerms: readonly string[]) =>
  `${OWNER_ACCEPTANCE}: the explainers stay as they are, so no further teach-back round runs. Residual unclear words: ${unclearTerms.map(residualTerm).join('; ')}.`;

// Lower case, punctuation dropped and plurals folded, so "Degrees of freedom" finds "degree of freedom".
const plain = (text: string) =>
  ` ${text.toLowerCase().replace(/[^a-z0-9'\- ]+/g, ' ').split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)).join(' ')} `;

type ReviewedWords = { kicker: string; steps: readonly string[]; concept: { name: string } };

/**
 * Why the test lets a word the reviewer listed go, or null when it counts. Words that appear only in
 * the kicker, and the concept the last step introduces, do not count (VAL-OPUS-044).
 */
export function uncountedReason(words: ReviewedWords, term: string): string | null {
  const t = plain(term).trim();
  if (!t) return null;
  const says = (text: string) => plain(text).includes(` ${t} `);
  const earlier = words.steps.slice(0, -1);
  if (says(words.steps.at(-1) ?? '') && says(words.concept.name) && !earlier.some(says)) return 'the concept the last step introduces';
  if (says(words.kicker) && !words.steps.some(says)) return 'only in the kicker';
  return null;
}

const NAMED_TOOL = /\b(claude|opus|sonnet|haiku|anthropic|openai|gpt|gemini|grok|llm|chatgpt|droid|playwright|chromium)\b/i;
// A short neutral id; a full session UUID is a tooling trace (check:neutral-tooling).
const NEUTRAL_SESSION = /^reader-session-(?![0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-)[0-9a-z-]+$/;

/** Problems with one explainer's record, each naming the explainer. */
export async function teachBackProblems(root: string, id: string): Promise<string[]> {
  const name = `#${id}`;
  const path = join(root, recordPath(id));
  if (!existsSync(path)) return [`${name}: no teach-back record at ${recordPath(id)}`];
  let record: TeachBackRecord;
  try {
    record = JSON.parse(readFileSync(path, 'utf8')) as TeachBackRecord;
  } catch (error) {
    return [`${name}: unreadable teach-back record (${(error as Error).message})`];
  }
  const problems: string[] = [];
  const words = await explainerWords(root, id);
  if (record.schemaVersion !== 'teach-back-record-v2') problems.push(`${name}: record schema ${record.schemaVersion}`);
  if (record.explainer !== id) problems.push(`${name}: record names #${record.explainer}`);
  if (!Number.isInteger(record.round) || record.round < 1) problems.push(`${name}: record does not name its teach-back round`);
  if (!words || record.takeaway !== words.takeaway) problems.push(`${name}: record was tested against another takeaway`);
  const measured = measuredVerdict(record);
  if (record.verdict !== measured) problems.push(`${name}: record says ${record.verdict}, but its measured answers give ${measured}`);
  if (record.verdict !== 'pass') {
    const line = record.ownerAcceptance ?? '';
    if (!line.startsWith(`${OWNER_ACCEPTANCE}:`)) {
      problems.push(`${name}: failing teach-back record lacks the line citing the owner acceptance of 12 Oct 2026`);
    } else {
      for (const term of record.unclearTerms ?? []) {
        if (!line.includes(residualTerm(term))) problems.push(`${name}: the owner-acceptance line does not list the residual unclear word ${residualTerm(term)}`);
      }
    }
    if (!(String(record.date) <= OWNER_ACCEPTANCE_DATE)) {
      problems.push(`${name}: a teach-back that fails after the owner acceptance of 12 Oct 2026 needs a fresh round that passes`);
    }
  }
  for (const { term } of record.uncountedTerms ?? []) {
    if (!words || !uncountedReason(words as ReviewedWords, term)) problems.push(`${name}: the record lets "${term}" go, but it counts as an unclear word`);
  }
  const shots = record.screenshots ?? [];
  for (const width of TEACH_BACK_WIDTHS) {
    if (!shots.some((shot) => shot.startsWith(`${TEACH_BACK_DIR}/${id}/${width}-`))) problems.push(`${name}: no ${width} px screenshots`);
  }
  for (const shot of shots) {
    if (relative(join(root, TEACH_BACK_DIR, id), join(root, shot)).startsWith('..') || !existsSync(join(root, shot))) {
      problems.push(`${name}: missing screenshot ${shot}`);
    }
  }
  if (!/^[0-9a-f]{7,40}$/.test(record.screenshotCommit ?? '') || !NEUTRAL_SESSION.test(record.reviewerSession ?? '') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.date ?? '')) {
    problems.push(`${name}: record lacks its commit, date or neutral reviewer session`);
  }
  if (NAMED_TOOL.test(JSON.stringify(record))) problems.push(`${name}: record names a tool, model or vendor`);
  const digest = explainerDigest(root, id);
  if (record.sourceDigest !== digest) {
    problems.push(`${name}: scene or model files changed since the teach-back (digest ${digest.slice(0, 12)}, record ${String(record.sourceDigest).slice(0, 12)})`);
  }
  return problems;
}
