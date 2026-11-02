/** Pinned regression inputs exported from actual Git objects; no historical object database is required. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

export const HISTORY_DIRECTORY = 'tests/fixtures/history';
// BEGIN historical catalog pin
export const HISTORY_CATALOG_PIN = {"bytes":636796,"sha256":"593cad3771db75e80fefb1523dcecaee56d2bd782f79680896796cb3a55a5098"};
// END historical catalog pin
const repository = resolve(import.meta.dirname, '../..');
const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
type Options = { cwd?: string; maxBuffer?: number; encoding?: 'utf8'; neutralVocabulary?: boolean };
export type HistoricalEntry = {
  args: string[];
  revisions: Array<{ ref: string; commit: string; tree: string }>;
  exitCode: number;
  original: { bytes: number; sha256: string; gitBlob: string | null };
  rendered: { bytes: number; sha256: string; vocabularyApplied: boolean };
  blob: { path: string; bytes: number; sha256: string };
};
type Catalog = { schemaVersion: string; vocabularySha256: string; entries: HistoricalEntry[] };
const catalogCache = new Map<string, { vocabularySha256: string; entries: ReadonlyMap<string, HistoricalEntry> }>();

export class HistoricalFileAbsent extends Error {}

export function historicalCatalog(root = repository): ReadonlyMap<string, HistoricalEntry> {
  const bytes = readFileSync(join(root, HISTORY_DIRECTORY, 'catalog.json'));
  if (bytes.length !== HISTORY_CATALOG_PIN.bytes || sha(bytes) !== HISTORY_CATALOG_PIN.sha256) {
    throw new Error('Historical input catalog drift');
  }
  const cached = catalogCache.get(root);
  const vocabularySha256 = sha(readFileSync(join(root, 'lib/neutral-tooling.ts')));
  if (cached) {
    if (cached.vocabularySha256 !== vocabularySha256) throw new Error('Historical vocabulary drift');
    return cached.entries;
  }
  const catalog = JSON.parse(bytes.toString('utf8')) as Catalog;
  if (catalog.schemaVersion !== 'historical-test-inputs-v1' || !catalog.entries.length ||
    catalog.vocabularySha256 !== vocabularySha256) {
    throw new Error('Historical input schema or vocabulary drift');
  }
  const entries = new Map<string, HistoricalEntry>();
  for (const entry of catalog.entries) {
    const key = JSON.stringify(entry.args);
    if (entries.has(key) || !['show', 'rev-parse', 'diff-tree', 'cat-file'].includes(entry.args[0]) ||
      !entry.revisions.length || entry.revisions.some(({ ref, commit, tree }) =>
        !/^[0-9a-f]{7,40}$/.test(ref) || !/^[0-9a-f]{40}$/.test(commit) || !/^[0-9a-f]{40}$/.test(tree)) ||
      !/^blobs\/[0-9a-f]{64}\.txt\.gz$/.test(entry.blob.path) ||
      ![entry.original, entry.rendered, entry.blob].every((value) =>
        Number.isSafeInteger(value.bytes) && value.bytes >= 0 && /^[0-9a-f]{64}$/.test(value.sha256)) ||
      !Number.isInteger(entry.exitCode) || entry.exitCode < 0 || entry.exitCode > 255 ||
      entry.rendered.vocabularyApplied !== (entry.original.sha256 !== entry.rendered.sha256)) {
      throw new Error(`Invalid historical input: ${key}`);
    }
    entries.set(key, entry);
  }
  catalogCache.set(root, { vocabularySha256, entries });
  return entries;
}

export function historicalGit(args: readonly string[], options: Options & { encoding: 'utf8' }): string;
export function historicalGit(args: readonly string[], options?: Options & { encoding?: undefined }): Buffer;
export function historicalGit(args: readonly string[], options: Options = {}): string | Buffer {
  const root = options.cwd ?? repository;
  const key = JSON.stringify(args);
  const entry = historicalCatalog(root).get(key);
  if (!entry) throw new Error(`Unarchived historical input: ${key}`);
  const packed = readFileSync(join(root, HISTORY_DIRECTORY, entry.blob.path));
  if (packed.length !== entry.blob.bytes || sha(packed) !== entry.blob.sha256) throw new Error(`Historical archive drift: ${key}`);
  const bytes = gunzipSync(packed, { maxOutputLength: 128 * 1024 * 1024 });
  if (bytes.length !== entry.rendered.bytes || sha(bytes) !== entry.rendered.sha256) throw new Error(`Historical input bytes drift: ${key}`);
  if (entry.exitCode !== 0) throw new HistoricalFileAbsent(`Git recorded an absent historical input: ${key}`);
  // Only readers that already applied the approved vocabulary may receive a
  // rendered historical input. Raw byte comparisons retain the original hash.
  if (entry.rendered.vocabularyApplied && !options.neutralVocabulary) throw new Error(`Historical input requires its recorded vocabulary rendering: ${key}`);
  return options.encoding === 'utf8' ? bytes.toString('utf8') : bytes;
}
