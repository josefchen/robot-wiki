/**
 * Records the parallel-local revision: exact edits over the checker, over
 * each named verification suite and over each named end-to-end spec as they
 * stood before the revision, the live successors' pins, and the reviews' own
 * pins in lib/audit-parallel-local-continuity.ts.
 *
 *   node scripts/record-parallel-local-continuity.ts [<suite or spec path>...]
 *
 * Suites and specs recorded before are re-recorded with the named ones. A
 * file recorded before keeps its predecessor commit and is re-recorded
 * against it; otherwise HEAD holds the predecessor. Every recorded successor
 * is read back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ParallelLocalCheckerReview, ParallelLocalSource, ParallelLocalSourceReview, ParallelLocalSpecReview,
} from '../lib/audit-parallel-local-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const directory = join(root, 'audit/evidence/parallel-local-20261009');
const reviewPath = join(directory, 'checker-transition.json');
const libPath = join(root, 'lib/audit-parallel-local-continuity.ts');
const reviewedBy = 'implementation worker for the parallel18 BatchScale rebinding (not independent acceptance)';

type Layer = {
  file: string; begin: string; pin: string; map: string; noun: string;
  schemaVersion: (ParallelLocalSourceReview | ParallelLocalSpecReview)['schemaVersion'];
  name: (ParallelLocalSourceReview | ParallelLocalSpecReview)['name'];
  rationale: string;
};
const SUITES: Layer = {
  file: 'source-transition.json', begin: 'parallel-local source pins', pin: 'sourceReviewPin', map: 'successors',
  noun: 'suite', schemaVersion: 'parallel-local-continuity-v1', name: 'parallel-local-suites',
  rationale: 'The parallel18 rebinding to the BatchScale scene brings two verification suites up to date. The parallel-local suite gains cases for the scene binding and the batch-scale recipe, its full-plan case names the rebound proof ids and the scene mount and gets an explicit time limit, and its numeric writer records the batch-scale outputs. The classical closure suite compares the rebound parallel18 plan and proofs with the archived TrainingTimeChart plan and proofs instead of the live catalog, and still holds every other plan and proof byte-equal. Older reviews, proofs and runs pin the suites as they were, so each change is recorded here as exact edits over the bytes the suite had before. The earlier bytes stand in for the live suite only while it is exactly the reviewed successor and keeps at least as many expect and test calls, so older checks still read the bytes they recorded.',
};
const SPECS: Layer = {
  file: 'spec-transition.json', begin: 'parallel-local spec pins', pin: 'specReviewPin', map: 'specSuccessors',
  noun: 'spec', schemaVersion: 'parallel-local-spec-continuity-v1', name: 'parallel-local-specs',
  rationale: 'The parallel18 rebinding to the BatchScale scene rewrites the end-to-end spec that observed the retired TrainingTimeChart. It now drives the scene mount: the 16,384-robot poster on load, each beat stepped back from the poster, the keyboard step to the first beat, the step forward to the recap, Reset and the 375 px view, with the readouts, method times, marker, robot dots, curve vertices and annotation checked against an independent oracle. The retired chart\'s observed proofs, receipts and browser run pin the spec as it was, so the rewrite is recorded here as exact edits over those bytes. The earlier bytes stand in for the live spec only while it is exactly the reviewed successor, stays an end-to-end spec, keeps at least as many expect and test calls and adds no skipped, fixme or focused test.',
};
const checkerFile = 'lib/audit-local-basis.ts';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const observedAt = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

function writePins(begin: string, lines: string[]): void {
  const block = new RegExp(`// BEGIN ${begin}[\\s\\S]*?// END ${begin}`);
  const lib = readFileSync(libPath, 'utf8');
  if (!block.test(lib)) throw new Error(`lib/audit-parallel-local-continuity.ts lost its ${begin} block`);
  writeFileSync(libPath, lib.replace(block, () => [
    `// BEGIN ${begin} (written by scripts/record-parallel-local-continuity.ts)`, ...lines, `// END ${begin}`,
  ].join('\n')));
}

function recordSources(layer: Layer, named: string[]): void {
  const reviewFile = join(directory, layer.file);
  const recorded: { sources: ParallelLocalSource[] } = existsSync(reviewFile)
    ? JSON.parse(readFileSync(reviewFile, 'utf8'))
    : { sources: [] };
  const review = {
    schemaVersion: layer.schemaVersion, name: layer.name, reviewedBy, rationale: layer.rationale,
    observedAt: '', sources: recorded.sources,
  };
  const head = git('rev-parse', 'HEAD').toString().trim();
  const paths = [...new Set([...review.sources.map(({ after }) => after.path), ...named])];
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
    const source: ParallelLocalSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    console.log(`${path}: ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}`);
  }
  if (review.sources.length === 0) return;
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = observedAt();
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewFile), { recursive: true });
  writeFileSync(reviewFile, bytes);
  writePins(layer.begin, [
    `/** The reviewed ${layer.noun} evidence file; a changed review needs a reviewed code change too. */`,
    `const ${layer.pin} = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    `const ${layer.map}: ReadonlyMap<string, readonly [number, string]> = new Map([`,
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
  ]);
  console.log(`recorded ${review.sources.length} ${layer.noun} successor(s); review ${bytes.length} bytes`);
}

function recordChecker(): void {
  const recorded: ParallelLocalCheckerReview | undefined = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : undefined;
  const archivedFrom = recorded?.archivedFrom ?? git('rev-parse', 'HEAD').toString().trim();
  const prior = git('show', `${archivedFrom}:${checkerFile}`);
  if (recorded && digest(prior) !== recorded.before.sha256) {
    throw new Error(`${checkerFile}: ${archivedFrom} no longer holds the recorded predecessor`);
  }
  const live = readFileSync(join(root, checkerFile));
  if (prior.equals(live)) throw new Error(`${checkerFile}: unchanged from ${archivedFrom.slice(0, 8)}`);
  const review: ParallelLocalCheckerReview = {
    schemaVersion: 'parallel-local-checker-revision-v1',
    name: 'parallel-local-reader',
    reviewedBy,
    rationale: 'The checker learns scene targets: a target may name a motion scene, whose source and mounts the checker registers itself (the brand-v2 interactive registry does not list scenes), and a plan bound to it pins the scene records instead of interactive ones. It also gains the batch-scale recipe, which recomputes the BatchScale times and wording from lib/parallel-sim.ts, binds the parallel18 row to the BatchScale scene target in place of the retired TrainingTimeChart, and re-pins the reviewed live hash of each historical verification suite the rebinding brings up to date. Every earlier recipe, input unit, dependency, threshold, ledger rule and negative check is unchanged, and the parallel recipe stays for the retained history.',
    observedAt: observedAt(),
    archivedFrom,
    before: artifact(checkerFile, prior),
    after: artifact(checkerFile, live),
    edits: exactEdits(prior.toString(), live.toString()),
  };
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  writePins('parallel-local checker pins', [
    '/** The reviewed checker evidence file; a changed review needs a reviewed code change too. */',
    `const checkerReviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** The domain-pass reader head the revision edits, and the reviewed revision. */',
    `const checkerBefore = { bytes: ${review.before.bytes}, sha256: '${review.before.sha256}' };`,
    `const checkerAfter = { bytes: ${review.after.bytes}, sha256: '${review.after.sha256}' };`,
  ]);
  console.log(`recorded ${review.edits.length} checker edit(s) over ${archivedFrom.slice(0, 8)}; review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-parallel-local-continuity.ts');
  let ok = true;
  const check = (path: string, expected: string, rebuild: () => Buffer) => {
    try {
      if (digest(rebuild()) !== expected) throw new Error('rebuilt bytes differ from the predecessor');
    } catch (error) {
      ok = false;
      console.error(`${path}: ${(error as Error).message}`);
    }
  };
  const review = layer.loadParallelLocalCheckerReview(root);
  check(checkerFile, review.before.sha256,
    () => layer.parallelLocalCheckerPredecessor(root, readFileSync(join(root, checkerFile))));
  const sources = [
    ...(layer.parallelLocalSuccessorPaths().length > 0 ? layer.loadParallelLocalSourceReview(root).sources : []),
    ...(layer.parallelLocalSpecPaths().length > 0 ? layer.loadParallelLocalSpecReview(root).sources : []),
  ];
  for (const source of sources) {
    check(source.after.path, source.before.sha256,
      () => layer.parallelLocalPredecessor(root, source.before, readFileSync(join(root, source.after.path))));
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const named = process.argv.slice(2);
  recordSources(SUITES, named.filter(path => !path.endsWith('.spec.ts')));
  recordSources(SPECS, named.filter(path => path.endsWith('.spec.ts')));
  recordChecker();
  if (!(await verify())) process.exit(1);
}
