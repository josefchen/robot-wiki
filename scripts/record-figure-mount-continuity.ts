/**
 * Records the figure-mount successor review for the named articles: exact
 * edits over each article's bytes before its figure import and mount, the
 * live successor's pin, and the review's own pin in
 * lib/audit-figure-mount-continuity.ts.
 *
 *   node scripts/record-figure-mount-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { FigureMountReview, FigureMountSource } from '../lib/audit-figure-mount-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/figure-mounts-20261007/source-transition.json');
const libPath = join(root, 'lib/audit-figure-mount-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: FigureMountReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'figure-mount-continuity-v1',
      name: 'figure-mounts-20261007',
      reviewedBy: 'implementation worker for the classical figure mounts of 2026-10-07 (not independent acceptance)',
      rationale: 'The classical articles on calibration and on ROS 2 for ML engineers each gained their first interactive figure on 2026-10-07 (VAL-OPUS-057): one import line after the frontmatter and one mount on its own line between blank lines, beside the paragraph the figure illustrates. Each change is recorded here as exact edits over the bytes the article had before it. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor and taking out the admitted import and mount gives the earlier bytes exactly, so no prose, number, citation, frontmatter field or other mount moved and older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      observedAt: '',
      sources: [],
    };
  const head = git('rev-parse', 'HEAD').toString().trim();
  for (const path of paths) {
    const live = readFileSync(join(root, path));
    const index = review.sources.findIndex(({ after }) => after.path === path);
    const archivedFrom = index >= 0 ? review.sources[index].archivedFrom : head;
    const prior = git('show', `${archivedFrom}:${path}`);
    if (index >= 0 && digest(prior) !== review.sources[index].before.sha256) {
      throw new Error(`${path}: ${archivedFrom} no longer holds the recorded predecessor`);
    }
    if (prior.equals(live)) {
      if (index >= 0) review.sources.splice(index, 1);
      console.log(`${path}: unchanged from ${archivedFrom.slice(0, 8)}, not recorded`);
      continue;
    }
    const source: FigureMountSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    console.log(`${path}: ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}`);
  }
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  const pins = [
    '// BEGIN figure-mount pins (written by scripts/record-figure-mount-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END figure-mount pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN figure-mount pins[\s\S]*?\/\/ END figure-mount pins/;
  if (!block.test(lib)) throw new Error('lib/audit-figure-mount-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-figure-mount-continuity.ts');
  const { wordBudgetTrimPredecessor } = await import('../lib/audit-word-budget-trim-continuity.ts');
  let ok = true;
  for (const source of layer.loadFigureMountReview(root).sources) {
    try {
      // The newer word-budget trim layer hands back the figure-mount successor first.
      const prior = layer.figureMountPredecessor(root, source.before,
        wordBudgetTrimPredecessor(root, source.before, readFileSync(join(root, source.after.path))));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = process.argv.slice(2);
  if (paths.length === 0) throw new Error('usage: node scripts/record-figure-mount-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
