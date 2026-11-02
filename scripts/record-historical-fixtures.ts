/** Freeze the exact historical inputs read by regression tests, without shipping Git history. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { neutralizeHistory } from '../lib/neutral-tooling.ts';

const root = resolve(import.meta.dirname, '..');
const captureDirectory = process.argv[2];
if (!captureDirectory) throw new Error('Usage: node scripts/record-historical-fixtures.ts <captured-request-directory>');
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const directory = join(root, 'tests/fixtures/history');
mkdirSync(join(directory, 'blobs'), { recursive: true });
const entries = [];
type Capture = { args: string[]; exitCode: number; stdoutSha256: string; bytes: number };
const requests: Capture[] = statSync(captureDirectory).isDirectory()
  ? readdirSync(captureDirectory).filter((path) => path.endsWith('.json')).sort().map((name) =>
    JSON.parse(readFileSync(join(captureDirectory, name), 'utf8')) as Capture)
  : (JSON.parse(readFileSync(captureDirectory, 'utf8')) as { entries: Array<{
    args: string[]; exitCode: number; original: { sha256: string; bytes: number };
  }> }).entries.map((entry) => ({ args: entry.args, exitCode: entry.exitCode,
    stdoutSha256: entry.original.sha256, bytes: entry.original.bytes }));
for (const capture of requests) {
  if (!['show', 'rev-parse', 'diff-tree', 'cat-file'].includes(capture.args[0]) ||
    !capture.args.slice(1).some((arg) => /^[0-9a-f]{7,40}(?::|\^|$)/.test(arg))) {
    throw new Error(`Not a frozen historical request: ${JSON.stringify(capture.args)}`);
  }
  let original: Buffer;
  let exitCode = 0;
  try {
    original = execFileSync('/usr/bin/git', capture.args, { cwd: root, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const failure = error as { status: number; stdout: Buffer };
    exitCode = failure.status;
    original = failure.stdout;
  }
  if (exitCode !== capture.exitCode || original.length !== capture.bytes || sha(original) !== capture.stdoutSha256) {
    throw new Error(`Captured output does not match actual Git objects: ${JSON.stringify(capture.args)}`);
  }
  const text = original.toString('utf8');
  if (!Buffer.from(text).equals(original)) throw new Error('Historical fixture is not UTF-8 text');
  const rendered = neutralizeHistory(text);
  if (neutralizeHistory(rendered) !== rendered) throw new Error(`Historical vocabulary is not idempotent: ${JSON.stringify(capture.args)}`);
  const bytes = Buffer.from(rendered);
  const digest = sha(bytes);
  const blob = `blobs/${digest}.txt.gz`;
  const compressed = existsSync(join(directory, blob)) ? readFileSync(join(directory, blob)) : gzipSync(bytes, { level: 9 });
  if (!gunzipSync(compressed).equals(bytes)) throw new Error(`Existing archive differs from actual historical input: ${blob}`);
  writeFileSync(join(directory, blob), compressed);
  const revisions = [...new Set(capture.args.flatMap((arg) => arg.match(/^([0-9a-f]{7,40})(?::|\^|$)/)?.[1] ?? []))].map((ref) => {
    const commit = execFileSync('/usr/bin/git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
    const tree = execFileSync('/usr/bin/git', ['rev-parse', `${commit}^{tree}`], { cwd: root, encoding: 'utf8' }).trim();
    return { ref, commit, tree };
  });
  const blobOid = capture.args[0] === 'show' && /^[0-9a-f]{7,40}:[^/]/.test(capture.args[1] ?? '') && exitCode === 0
    ? execFileSync('/usr/bin/git', ['rev-parse', capture.args[1]], { cwd: root, encoding: 'utf8' }).trim() : null;
  entries.push({ args: capture.args, revisions, exitCode, original: { bytes: original.length, sha256: sha(original), gitBlob: blobOid },
    rendered: { bytes: bytes.length, sha256: digest, vocabularyApplied: !bytes.equals(original) },
    blob: { path: blob, bytes: compressed.length, sha256: sha(compressed) } });
}
entries.sort((a, b) => JSON.stringify(a.args).localeCompare(JSON.stringify(b.args)));
const catalog = Buffer.from(JSON.stringify({ schemaVersion: 'historical-test-inputs-v1',
  vocabularySha256: sha(readFileSync(join(root, 'lib/neutral-tooling.ts'))), entries }, null, 2) + '\n');
writeFileSync(join(directory, 'catalog.json'), catalog);
const helperPath = join(root, 'tests/helpers/historical-git.ts');
const helper = readFileSync(helperPath, 'utf8');
const pin = `// BEGIN historical catalog pin\nexport const HISTORY_CATALOG_PIN = ${JSON.stringify({ bytes: catalog.length, sha256: sha(catalog) })};\n// END historical catalog pin`;
if (!helper.includes('// BEGIN historical catalog pin')) throw new Error('Historical helper pin marker missing');
writeFileSync(helperPath, helper.replace(/\/\/ BEGIN historical catalog pin[\s\S]*?\/\/ END historical catalog pin/, pin));
console.log(JSON.stringify({ entries: entries.length, blobs: new Set(entries.map((row) => row.blob.path)).size,
  catalogBytes: catalog.length, catalogSha256: sha(catalog), compressedBytes: entries.reduce((sum, row) => sum + row.blob.bytes, 0) }, null, 2));
