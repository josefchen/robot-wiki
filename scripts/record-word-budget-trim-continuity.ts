/**
 * Records the word-budget trim successor review for the named articles:
 * exact edits over each article's bytes before the trim, the live
 * successor's pin, and the review's own pin in
 * lib/audit-word-budget-trim-continuity.ts.
 *
 *   node scripts/record-word-budget-trim-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer, and its rebuilt bytes through the
 * older figure-mount layer, before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { WordBudgetTrimReview, WordBudgetTrimSource } from '../lib/audit-word-budget-trim-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/word-budget-trim-20261010/source-transition.json');
const libPath = join(root, 'lib/audit-word-budget-trim-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: WordBudgetTrimReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'word-budget-trim-continuity-v1',
      name: 'word-budget-trim-20261010',
      reviewedBy: 'implementation helper for the word-budget trim of 2026-10-10 (not independent acceptance)',
      rationale: 'The figure restyle of 2026-10-10 mounted two new figures in each of the classical articles on calibration and on ROS 2 for ML engineers, and their rendered words took both pages past the word budgets their domain pass set. The budgets stay; the trim shortens the body prose, cutting repetition, filler and uncited sentences the new figures now carry, and keeps every cited fact. Each change is recorded here as exact edits over the bytes the article had before the trim. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor and the frontmatter, imports, mounts, headings, citation and glossary ids, link targets and numbers are unchanged and in order, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
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
    const source: WordBudgetTrimSource = {
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
    '// BEGIN word-budget-trim pins (written by scripts/record-word-budget-trim-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END word-budget-trim pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN word-budget-trim pins[\s\S]*?\/\/ END word-budget-trim pins/;
  if (!block.test(lib)) throw new Error('lib/audit-word-budget-trim-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer and the figure-mount layer under it. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-word-budget-trim-continuity.ts');
  const { answerOptionsPredecessor } = await import('../lib/audit-answer-options-continuity.ts');
  const { convergenceProsePredecessor } = await import('../lib/audit-convergence-prose-continuity.ts');
  const { explainerMountPredecessor } = await import('../lib/audit-explainer-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  const { lengthCutPredecessor } = await import('../lib/audit-length-cut-continuity.ts');
  const mounts = await import('../lib/audit-figure-mount-continuity.ts');
  const { worldModelsLengthCutPredecessor } = await import('../lib/audit-length-cut-world-models-continuity.ts');
  const { frontierLengthCutPredecessor } = await import('../lib/audit-length-cut-frontier-continuity.ts');
  const { dataHardwareCutPredecessor } = await import('../lib/audit-length-cut-data-hardware-continuity.ts');
  const { adjacentCutPredecessor } = await import('../lib/audit-length-cut-adjacent-continuity.ts');
  let ok = true;
  for (const source of layer.loadWordBudgetTrimReview(root).sources) {
    try {
      // The newer explainer-mount (2026-10-26), answer-options (2026-10-23), figure-mount (its 2026-10-15 frontier mounts, after the image mounts), image-mount (2026-10-13, extended 2026-10-15), adjacent cut (2026-10-14), data-hardware cut (2026-10-13), frontier length-cut, length-cut (manipulation, classical and
      // rl-sim2real) and world-models length-cut layers hand back the word-budget trim successor first.
      const prior = layer.wordBudgetTrimPredecessor(root, source.before, worldModelsLengthCutPredecessor(root, source.before,
        lengthCutPredecessor(root, source.before,
          frontierLengthCutPredecessor(root, source.before, dataHardwareCutPredecessor(root, source.before, adjacentCutPredecessor(root, source.before, imageMountPredecessor(root, source.before, mounts.figureMountPredecessor(root, source.before, answerOptionsPredecessor(root, source.before, explainerMountPredecessor(root, source.before, convergenceProsePredecessor(root, source.before, readFileSync(join(root, source.after.path)))))))))))));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
      if (mounts.figureMountSuccessorPaths().includes(source.after.path)) {
        mounts.figureMountPredecessor(root, { path: source.after.path, bytes: 0, sha256: '' }, prior);
      }
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = process.argv.slice(2);
  if (paths.length === 0) throw new Error('usage: node scripts/record-word-budget-trim-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
