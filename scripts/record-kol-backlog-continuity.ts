/**
 * Records the KOL backlog successor review for the named articles: exact
 * edits over each article's bytes before the batch, the live successor's
 * pin, and the review's own pin in lib/audit-kol-backlog-continuity.ts.
 *
 *   node scripts/record-kol-backlog-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { KolBacklogReview, KolBacklogSource } from '../lib/audit-kol-backlog-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/kol-backlog-20261005/source-transition.json');
const libPath = join(root, 'lib/audit-kol-backlog-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: KolBacklogReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'kol-backlog-continuity-v1',
      name: 'kol-backlog-20261005',
      reviewedBy: 'implementation helper for the KOL backlog batch of 2026-10-05 (not independent acceptance)',
      rationale: 'The KOL backlog batch of 2026-10-05 added dated, attributed sentences about new primary research to existing articles, each verified against the primary source fetched that day, and declared each new citation id in the article frontmatter. Each change is recorded here as exact edits over the bytes the article had before the batch. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, every earlier line survives in order and the frontmatter differs only by appended citation ids, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
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
    const source: KolBacklogSource = {
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
    '// BEGIN kol-backlog pins (written by scripts/record-kol-backlog-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END kol-backlog pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN kol-backlog pins[\s\S]*?\/\/ END kol-backlog pins/;
  if (!block.test(lib)) throw new Error('lib/audit-kol-backlog-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-kol-backlog-continuity.ts');
  const { answerOptionsPredecessor } = await import('../lib/audit-answer-options-continuity.ts');
  const { convergenceProsePredecessor } = await import('../lib/audit-convergence-prose-continuity.ts');
  const { explainerMountPredecessor } = await import('../lib/audit-explainer-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  const { lengthCutPredecessor } = await import('../lib/audit-length-cut-continuity.ts');
  const { domainPassPredecessor } = await import('../lib/audit-domain-pass-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { wordBudgetTrimPredecessor } = await import('../lib/audit-word-budget-trim-continuity.ts');
  const { worldModelsLengthCutPredecessor } = await import('../lib/audit-length-cut-world-models-continuity.ts');
  const { frontierLengthCutPredecessor } = await import('../lib/audit-length-cut-frontier-continuity.ts');
  const { dataHardwareCutPredecessor } = await import('../lib/audit-length-cut-data-hardware-continuity.ts');
  const { adjacentCutPredecessor } = await import('../lib/audit-length-cut-adjacent-continuity.ts');
  let ok = true;
  for (const source of layer.loadKolBacklogReview(root).sources) {
    try {
      // The newer explainer-mount (2026-10-26), answer-options (2026-10-23), figure-mount (its 2026-10-15 frontier mounts, after the image mounts), image-mount (2026-10-13, extended 2026-10-15), adjacent cut (2026-10-14), data-hardware cut (2026-10-13), frontier length-cut, length-cut (manipulation, classical and
      // rl-sim2real), world-models length-cut, word-budget trim, figure-mount and domain-pass layers hand back the
      // KOL backlog successor first.
      const live = domainPassPredecessor(root, source.before, figureMountPredecessor(root, source.before,
        wordBudgetTrimPredecessor(root, source.before, worldModelsLengthCutPredecessor(root, source.before,
          lengthCutPredecessor(root, source.before,
            frontierLengthCutPredecessor(root, source.before, dataHardwareCutPredecessor(root, source.before, adjacentCutPredecessor(root, source.before, imageMountPredecessor(root, source.before, figureMountPredecessor(root, source.before, answerOptionsPredecessor(root, source.before, explainerMountPredecessor(root, source.before, convergenceProsePredecessor(root, source.before, readFileSync(join(root, source.after.path)))))))))))))));
      const prior = layer.kolBacklogPredecessor(root, source.before, live);
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
  if (paths.length === 0) throw new Error('usage: node scripts/record-kol-backlog-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
