/**
 * Records the image-mount successor review for the named articles: exact
 * edits over each article's bytes before its image mounts, the mounted ids,
 * the live successor's pin, and the review's pins (its own bytes, the
 * admitted ids and the successors) in lib/audit-image-mount-continuity.ts.
 *
 *   node scripts/record-image-mount-continuity.ts [--from <rev>] <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor, or <rev> with --from (which
 * also re-reads a recorded path's predecessor from <rev>; its bytes must not
 * change). The mounted ids are the `<Image id="..." />` lines the live
 * article holds and its predecessor lacks. Every recorded successor is read
 * back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ImageMountReview, ImageMountSource } from '../lib/audit-image-mount-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/image-mounts-20261013/source-transition.json');
const libPath = join(root, 'lib/audit-image-mount-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const mountIds = (text: string) => [...text.matchAll(/\n\n<Image id="([^"]+)" \/>\n\n/g)].map((match) => match[1]);

function main(paths: string[], from: string | undefined): void {
  const review: ImageMountReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'image-mount-continuity-v1',
      name: 'image-mounts-20261013',
      reviewedBy: 'integration workers for images bundle A (2026-10-13) and the adjacent images of bundle B (2026-10-15) (not independent acceptance)',
      ownerApproval: 'Owner directive of 2026-10-11 (Josef Chen): "i also want to use proper images etc! [...] license free images to accompany the articles etc. like wikipedia". The owner-session image brief of the same day sets 2 to 4 real images per article, a lead image directly after the lead paragraph and the rest at the sections they illustrate, under the licence gate of data/schemas/image.ts. Not release approval.',
      rationale: 'The manipulation, world-models, classical and rl-sim2real articles each gained registered images on 2026-10-13, and the adjacent articles on 2026-10-15 after their length cut: one `<Image id="..." />` mount per image on its own line between blank lines, the lead image after the lead paragraph and the others after the paragraph of the section each illustrates. An article needs no import line for them, and no prose, number, citation, frontmatter field or other mount moves. Each change is recorded here as exact edits over the bytes the article had before it. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor and taking out the admitted mounts gives the earlier bytes exactly, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      observedAt: '',
      sources: [],
    };
  const fallback = git('rev-parse', from ?? 'HEAD').toString().trim();
  for (const path of paths) {
    const live = readFileSync(join(root, path));
    const index = review.sources.findIndex(({ after }) => after.path === path);
    const archivedFrom = index >= 0 && !from ? review.sources[index].archivedFrom : fallback;
    const prior = git('show', `${archivedFrom}:${path}`);
    if (index >= 0 && digest(prior) !== review.sources[index].before.sha256) {
      throw new Error(`${path}: ${archivedFrom} no longer holds the recorded predecessor`);
    }
    if (prior.equals(live)) {
      if (index >= 0) review.sources.splice(index, 1);
      console.log(`${path}: unchanged from ${archivedFrom.slice(0, 8)}, not recorded`);
      continue;
    }
    const before = new Set(mountIds(prior.toString()));
    const mounts = mountIds(live.toString()).filter((id) => !before.has(id));
    const source: ImageMountSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live), mounts,
      edits: exactEdits(prior.toString(), live.toString()),
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    console.log(`${path}: ${mounts.length} mount(s), ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}`);
  }
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  const ids = [...new Set(review.sources.flatMap(({ mounts }) => mounts))].sort();
  const pins = [
    '// BEGIN image-mount pins (written by scripts/record-image-mount-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** The registered image ids whose one-line mounts the review admits. */',
    'const admitted: ReadonlySet<string> = new Set([',
    ...ids.map((id) => `  '${id}',`),
    ']);',
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END image-mount pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN image-mount pins[\s\S]*?\/\/ END image-mount pins/;
  if (!block.test(lib)) throw new Error('lib/audit-image-mount-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s), ${ids.length} admitted id(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-image-mount-continuity.ts');
  let ok = true;
  for (const source of layer.loadImageMountReview(root).sources) {
    try {
      const prior = layer.imageMountPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--from');
  const from = at >= 0 ? args.splice(at, 2)[1] : undefined;
  if (args.length === 0 || (at >= 0 && !from)) {
    throw new Error('usage: node scripts/record-image-mount-continuity.ts [--from <rev>] <path>...');
  }
  main(args, from);
  if (!(await verify())) process.exit(1);
}
