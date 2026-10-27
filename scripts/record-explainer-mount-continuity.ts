/**
 * Records the explainer-mount successor review for the named articles: exact
 * edits over each article's bytes before its explainer mount, cue sentence
 * or /how-robots-work/ link, the live successor's pin, and the review's own
 * pin in lib/audit-explainer-mount-continuity.ts.
 *
 *   node scripts/record-explainer-mount-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer, and its rebuilt bytes through the
 * figure-mount and image-mount layers under it, before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ExplainerMountReview, ExplainerMountSource } from '../lib/audit-explainer-mount-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/explainer-mounts-20261026/source-transition.json');
const libPath = join(root, 'lib/audit-explainer-mount-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: ExplainerMountReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'explainer-mount-continuity-v1',
      name: 'explainer-mounts-20261026',
      reviewedBy: 'implementation worker for opus-pass-convergence, 2026-10-26 (not independent acceptance)',
      rationale: 'VAL-OPUS-153 and rule 12 of the 3D curriculum (owner-decision-3d-curriculum-20261002) mount each of the twelve curriculum explainers once, in the first home article the curriculum names for it, where that article first introduces the concept, with prose beside it that refers to it; every other home article the curriculum names links to the explainer. Each article change is recorded here as exact edits over the bytes the article had before it. An article may differ from those bytes only by the explainer figure import line, the one-line mount of the explainer its row in components/explainers/mounts.ts names, that row\'s one cue sentence appended to the paragraph before the mount, and links to /how-robots-work/ anchors wrapped around existing words; every number, citation, glossary occurrence and other link is unchanged. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      ownerApproval: 'Owner directives of 2026-10-02 16:40 item 6 ("its home article") and 13:45 ("linked from"), with rule 12 of owner-decision-3d-curriculum-20261002 (mount where the concept is first introduced, the prose refers to it, never stacked at the top), as sealed in contract/opus-pass.md VAL-OPUS-153 and routed to opus-pass-convergence by the parent note of 2026-10-19 06:20 (add only the mount and its one sentence where a home article is held by an owner lane). Not release approval.',
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
    const source: ExplainerMountSource = {
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
    '// BEGIN explainer-mount pins (written by scripts/record-explainer-mount-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END explainer-mount pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN explainer-mount pins[\s\S]*?\/\/ END explainer-mount pins/;
  if (!block.test(lib)) throw new Error('lib/audit-explainer-mount-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the newer convergence-prose layer and the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-explainer-mount-continuity.ts');
  const { convergenceProsePredecessor } = await import('../lib/audit-convergence-prose-continuity.ts');
  const { owedFiguresPredecessor } = await import('../lib/audit-owed-figures-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  let ok = true;
  for (const source of layer.loadExplainerMountReview(root).sources) {
    try {
      const prior = layer.explainerMountPredecessor(root, source.before,
        convergenceProsePredecessor(root, source.before, owedFiguresPredecessor(root, source.before, readFileSync(join(root, source.after.path)))));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
      // The rebuilt bytes are the newest older layer's successor, which that layer still decides.
      const ref = { path: source.after.path, bytes: 0, sha256: '' };
      const older = imageMountPredecessor(root, ref, figureMountPredecessor(root, ref, prior));
      if (older.equals(prior)) throw new Error('no older layer decides the rebuilt bytes');
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = process.argv.slice(2);
  if (paths.length === 0) throw new Error('usage: node scripts/record-explainer-mount-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
