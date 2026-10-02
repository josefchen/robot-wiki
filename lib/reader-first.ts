/**
 * The reader-first registry and its five-second reader test records.
 *
 * The registry (`contract/reader-first-registry.json`) holds one entry per
 * figure on an article, on `/credits/`, and the home featured scene: its
 * route, mount identity, frame id, audit item, source files and the
 * takeaway in one plain sentence. Each entry has one record under
 * `evidence/reader-first/`, written after a reviewer with no engineering
 * background saw only the frame's two screenshots, at 1280 and 375 px wide.
 * A record is current while the digest of the registered source files
 * equals the digest stored at the commit its screenshots were taken at.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REGISTRY_PATH = 'contract/reader-first-registry.json';
export const RECORD_DIR = 'evidence/reader-first';
export const READER_WIDTHS = [1280, 375] as const;

export type RegistryEntry = {
  /** File stem of the record and its screenshots. */
  id: string;
  route: string;
  /** `mount:<route>:<Component>:<n>`, or the scene, clip or image id. */
  mount: string;
  /** The frame's `data-figure-frame` value in the export. */
  figure: string;
  /** The audit item (A1 to A60), or null for a figure added since. */
  audit: string | null;
  sources: string[];
  takeaway: string;
};

export type Registry = { schemaVersion: 'reader-first-registry-v1'; figures: RegistryEntry[] };

export type ReaderRecord = {
  schemaVersion: 'reader-first-record-v1';
  route: string;
  mount: string;
  screenshots: Record<'1280' | '375', string>;
  takeaway: string;
  sentence: string;
  unclearTerms: string[];
  samePoint: 'yes' | 'no';
  reason: string;
  verdict: 'pass' | 'fail';
  screenshotCommit: string;
  date: string;
  reviewerSession: string;
  sourceDigest: string;
};

export const recordPath = (id: string) => `${RECORD_DIR}/${id}.json`;
export const screenshotPath = (id: string, width: number) => `${RECORD_DIR}/${id}.${width}.png`;

export function readRegistry(root: string): Registry {
  return JSON.parse(readFileSync(join(root, REGISTRY_PATH), 'utf8')) as Registry;
}

/** SHA-256 over each registered source's path and bytes, in path order. */
export function sourceDigest(root: string, sources: readonly string[]): string {
  const hash = createHash('sha256');
  for (const path of [...sources].sort()) {
    const file = join(root, path);
    const bytes = existsSync(file) ? readFileSync(file) : Buffer.from('(missing)');
    hash.update(`${path}\0${createHash('sha256').update(bytes).digest('hex')}\n`);
  }
  return hash.digest('hex');
}

/** Names a tool, model or vendor; a record must stay neutral. */
const NAMED_TOOL = /\b(claude|opus|sonnet|haiku|anthropic|openai|gpt|gemini|grok|llm|chatgpt|droid|playwright|chromium)\b/i;
const NEUTRAL_SESSION = /^reader-session-[0-9a-z-]+$/;

/** Problems with one entry's record, each naming the figure. */
export function recordProblems(root: string, entry: RegistryEntry): string[] {
  const name = `${entry.route} [${entry.figure}]`;
  const path = join(root, recordPath(entry.id));
  if (!existsSync(path)) return [`${name}: no reader-test record at ${recordPath(entry.id)}`];
  let record: ReaderRecord;
  try {
    record = JSON.parse(readFileSync(path, 'utf8')) as ReaderRecord;
  } catch (error) {
    return [`${name}: unreadable reader-test record (${(error as Error).message})`];
  }
  const problems: string[] = [];
  if (record.schemaVersion !== 'reader-first-record-v1') problems.push(`${name}: record schema ${record.schemaVersion}`);
  if (record.route !== entry.route || record.mount !== entry.mount) {
    problems.push(`${name}: record names ${record.route} ${record.mount}, not the registered figure`);
  }
  if (record.takeaway !== entry.takeaway) problems.push(`${name}: record was tested against another takeaway`);
  if (record.verdict !== 'pass') problems.push(`${name}: reader-test verdict is ${record.verdict}`);
  if (record.samePoint !== 'yes' || (record.unclearTerms ?? []).length > 0) {
    problems.push(`${name}: reader-test record does not support a pass`);
  }
  for (const width of READER_WIDTHS) {
    const shot = record.screenshots?.[String(width) as '1280' | '375'];
    if (shot !== screenshotPath(entry.id, width) || !existsSync(join(root, shot))) {
      problems.push(`${name}: missing ${width} px screenshot`);
    }
  }
  if (!/^[0-9a-f]{7,40}$/.test(record.screenshotCommit ?? '') || !NEUTRAL_SESSION.test(record.reviewerSession ?? '') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.date ?? '')) {
    problems.push(`${name}: record lacks its commit, date or neutral reviewer session`);
  }
  if (NAMED_TOOL.test(JSON.stringify(record))) problems.push(`${name}: record names a tool, model or vendor`);
  const digest = sourceDigest(root, entry.sources);
  if (record.sourceDigest !== digest) {
    problems.push(`${name}: source files changed since the reader test (digest ${digest.slice(0, 12)}, record ${String(record.sourceDigest).slice(0, 12)})`);
  }
  return problems;
}

/** Problems with the registry itself: duplicates and missing source files. */
export function registryProblems(root: string, registry: Registry): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const entry of registry.figures) {
    for (const key of [`id ${entry.id}`, `mount ${entry.route} ${entry.mount}`, `figure ${entry.route} ${entry.figure}`]) {
      if (seen.has(key)) problems.push(`${entry.route} [${entry.figure}]: duplicate registry ${key}`);
      seen.set(key, entry.id);
    }
    if (!entry.takeaway?.trim()) problems.push(`${entry.route} [${entry.figure}]: registry entry has no takeaway`);
    if (!entry.sources?.length) problems.push(`${entry.route} [${entry.figure}]: registry entry has no source files`);
    for (const source of entry.sources ?? []) {
      if (!existsSync(join(root, source))) problems.push(`${entry.route} [${entry.figure}]: source ${source} is missing`);
    }
  }
  return problems;
}
