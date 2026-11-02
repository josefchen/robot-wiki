/** Record reviewed source/reading-order edits without replacing historical proof. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exactEdits } from './record-reader-first-continuity.ts';
import { SOURCE_FLOOR_CONTINUITY_FILE, keepsSourceFloorObligations, verifySourceFloorSource,
  type SourceFloorMetadataChange, type SourceFloorImageRelocation, type SourceFloorReview } from '../lib/audit-source-floor-continuity.ts';

const root = join(import.meta.dirname, '..');
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const args = process.argv.slice(2);
const readOption = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args.splice(index, 2)[1];
};
const base = readOption('--base');
const notesPath = readOption('--notes');
const relocationsPath = readOption('--image-relocations');
const notes: Record<string, SourceFloorMetadataChange[]> = notesPath ? JSON.parse(readFileSync(notesPath, 'utf8')) : {};
const relocations: Record<string, SourceFloorImageRelocation[]> = relocationsPath ? JSON.parse(readFileSync(relocationsPath, 'utf8')) : {};
if (!base || !args.length) throw new Error('usage: record-source-floor-continuity.ts --base <commit> [--notes <json>] <article>...');
const commit = execFileSync('git', ['rev-parse', base], { cwd: root, encoding: 'utf8' }).trim();
const reviewPath = join(root, SOURCE_FLOOR_CONTINUITY_FILE);
const review: SourceFloorReview = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, 'utf8')) : {
  schemaVersion: 'source-floor-continuity-v1',
  reviewedBy: 'Implementation review of exact source additions and reading-order repairs, 2026-11-02; independent acceptance remains separate.',
  rationale: 'The final mission pass supplies primary sources supporting specific inline claims to reach the sealed 1,500-source floor, corrects demonstrated overstatements, and repairs first-interactive placement. Every earlier inline source, front-matter source, imported figure, figure props and figure order remains present. Explicit description corrections are separately named. Exact edits reconstruct the committed post-figure predecessor for historical checks. Current article, citation, paragraph, first-screen and release gates still inspect the live successor; this record does not accept their results.',
  ownerApproval: 'The owner authorized completing the existing Robot Wiki mission on 2026-11-02, including implementation and evidence-backed record updates. This implements VAL-OPUS-152 and VAL-EDU-045 while retaining all prior accepted obligations. It is not independent release approval.',
  observedAt: '', sources: [],
};
for (const path of args) {
  const old = review.sources.find((s) => s.after.path === path);
  const archivedFrom = old?.archivedFrom ?? commit;
  const before = execFileSync('git', ['show', `${archivedFrom}:${path}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  const after = readFileSync(join(root, path));
  if (old && digest(before) !== old.before.sha256) throw new Error(`${path}: predecessor drift`);
  if (before.equals(after)) throw new Error(`${path}: unchanged`);
  const metadataChanges = notes[path] ?? old?.metadataChanges;
  const imageRelocations = relocations[path] ?? old?.imageRelocations;
  if (!keepsSourceFloorObligations(path, before.toString(), after.toString(), metadataChanges, imageRelocations)) throw new Error(`${path}: preserved obligations changed`);
  const source = { archivedFrom, before: artifact(path, before), after: artifact(path, after),
    edits: exactEdits(before.toString(), after.toString()), ...(metadataChanges ? { metadataChanges } : {}),
    ...(imageRelocations ? { imageRelocations } : {}) };
  if (!verifySourceFloorSource(source, after).equals(before)) throw new Error(`${path}: reconstruction failed`);
  review.sources = review.sources.filter((s) => s.after.path !== path).concat(source);
}
review.sources.sort((a, b) => a.after.path.localeCompare(b.after.path));
review.observedAt = new Date().toISOString();
const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
writeFileSync(reviewPath, bytes);
const file = join(root, 'lib/audit-source-floor-continuity.ts');
const text = readFileSync(file, 'utf8');
const pins = [
  '// BEGIN source-floor pins (written by scripts/record-source-floor-continuity.ts)',
  `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
  'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
  ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
  ']);', '// END source-floor pins',
].join('\n');
if (!text.includes('// BEGIN source-floor pins')) throw new Error('pins block missing');
writeFileSync(file, text.replace(/\/\/ BEGIN source-floor pins[\s\S]*?\/\/ END source-floor pins/, () => pins));
console.log(`source-floor continuity: ${review.sources.length} exact article successors recorded; no historical verdict rewritten`);
