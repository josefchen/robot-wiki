/**
 * The teach-back records of the 3D explainers (VAL-OPUS-044).
 *
 * Each explainer has one record under `evidence/teach-back/`, written after a
 * reviewer acting as a curious non-engineer saw only screenshots of every
 * step at 1280 and 390 px (the guess and its reveal, and the self-check
 * question without its answer). The record keeps the reviewer's own
 * takeaway, self-check answer and unclear words, the noise audit of every
 * step, and a digest of the explainer's scene module, the model files it
 * imports and its words. A record is current while that digest matches.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TEACH_BACK_DIR = 'evidence/teach-back';
export const TEACH_BACK_WIDTHS = [1280, 390] as const;
export const SCENE_DIR = 'components/explainers/scenes';
export const WORDS_FILE = 'components/explainers/words.ts';

export type NoiseRow = {
  width: number;
  step: string;
  words: number;
  labels: number;
  controls: number;
  colours: string[];
};

export type TeachBackRecord = {
  schemaVersion: 'teach-back-record-v1';
  explainer: string;
  screenshots: string[];
  takeaway: string;
  selfCheck: { question: string; answer: string; correct: boolean };
  sentence: string;
  unclearTerms: string[];
  samePoint: 'yes' | 'no';
  reason: string;
  noiseAudit: NoiseRow[];
  noiseClean: boolean;
  verdict: 'pass' | 'fail';
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

/** SHA-256 over each source's path and bytes, in path order, then the explainer's words. */
export async function explainerDigest(root: string, id: string): Promise<string> {
  const hash = createHash('sha256');
  for (const path of explainerSources(root, id)) {
    const file = join(root, path);
    const bytes = existsSync(file) ? readFileSync(file) : Buffer.from('(missing)');
    hash.update(`${path}\0${createHash('sha256').update(bytes).digest('hex')}\n`);
  }
  hash.update(`words\0${JSON.stringify(await explainerWords(root, id))}\n`);
  return hash.digest('hex');
}

const NAMED_TOOL = /\b(claude|opus|sonnet|haiku|anthropic|openai|gpt|gemini|grok|llm|chatgpt|droid|playwright|chromium)\b/i;
const NEUTRAL_SESSION = /^reader-session-[0-9a-z-]+$/;

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
  if (record.schemaVersion !== 'teach-back-record-v1') problems.push(`${name}: record schema ${record.schemaVersion}`);
  if (record.explainer !== id) problems.push(`${name}: record names #${record.explainer}`);
  if (!words || record.takeaway !== words.takeaway) problems.push(`${name}: record was tested against another takeaway`);
  if (record.verdict !== 'pass') problems.push(`${name}: teach-back verdict is ${record.verdict}`);
  if (record.samePoint !== 'yes' || !record.selfCheck?.correct || (record.unclearTerms ?? []).length > 0 || !record.noiseClean) {
    problems.push(`${name}: teach-back record does not support a pass`);
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
  const digest = await explainerDigest(root, id);
  if (record.sourceDigest !== digest) {
    problems.push(`${name}: scene or model files changed since the teach-back (digest ${digest.slice(0, 12)}, record ${String(record.sourceDigest).slice(0, 12)})`);
  }
  return problems;
}
