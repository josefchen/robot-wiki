import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exactEdits } from './record-reader-first-continuity.ts';
import { SOURCE_REGISTRY_REVIEW_FILE, verifySourceRegistryReview, type SourceRegistryReview } from '../lib/audit-source-registry-continuity.ts';

const root = join(import.meta.dirname, '..');
const [base, notes] = process.argv.slice(2);
if (!base || !notes) throw new Error('usage: record-source-registry-continuity.ts <base-commit> <reviewed-changes.json>');
const archivedFrom = execFileSync('git', ['rev-parse', base], { cwd: root, encoding: 'utf8' }).trim();
const path = 'data/citations.ts';
const before = execFileSync('git', ['show', `${archivedFrom}:${path}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
const after = readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const artifact = (bytes: Buffer) => ({ path, bytes: bytes.length, sha256: sha(bytes) });
const review: SourceRegistryReview = {
  schemaVersion: 'source-registry-continuity-v1', archivedFrom, before: artifact(before), after: artifact(after),
  edits: exactEdits(before.toString(), after.toString()), changes: JSON.parse(readFileSync(notes, 'utf8')),
  reviewedBy: 'Implementation review, 2026-11-02; separate source and release checks remain required.',
  rationale: 'The final source pass adds individually fetched primary references and records seven explicitly reviewed product-page date/access corrections. Existing source identities, complete bylines, titles and URLs remain unchanged. The citation label helper now preserves institutional names and disambiguates distinct same-author/year sources, covered by citation component, bibliography and identity tests. Exact edits preserve the pre-pass registry for historical proofs; the live registry still undergoes schema, source-count, duplicate, identity and complete audit-coverage checks. Source passages and per-article transitions are retained in this directory.',
  observedAt: new Date().toISOString(),
};
if (!verifySourceRegistryReview(review, after).equals(before)) throw new Error('source registry reconstruction failed');
const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
writeFileSync(join(root, SOURCE_REGISTRY_REVIEW_FILE), bytes);
const file = join(root, 'lib/audit-source-registry-continuity.ts');
const pins = [
  '// BEGIN source registry pins (written by scripts/record-source-registry-continuity.ts)',
  `const reviewPin = { bytes: ${bytes.length}, sha256: '${sha(bytes)}' };`,
  `const successor = { bytes: ${after.length}, sha256: '${sha(after)}' };`,
  '// END source registry pins',
].join('\n');
writeFileSync(file, readFileSync(file, 'utf8').replace(/\/\/ BEGIN source registry pins[\s\S]*?\/\/ END source registry pins/, () => pins));
console.log(`source registry: exact ${before.length} → ${after.length} byte transition recorded`);
