/**
 * Records the scene-craft successor review for the named motion scene
 * sources: exact edits over each scene's bytes before the pass, the live
 * successor's pin, and the review's own pin in
 * lib/audit-scene-craft-continuity.ts.
 *
 *   node scripts/record-scene-craft-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { SceneCraftReview, SceneCraftSource } from '../lib/audit-scene-craft-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/scene-craft-20261018/source-transition.json');
const libPath = join(root, 'lib/audit-scene-craft-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: SceneCraftReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'scene-craft-continuity-v1',
      name: 'scene-craft-20261018',
      reviewedBy: 'implementation worker for the scene-craft pass of 2026-10-18 (not independent acceptance)',
      rationale: 'The scene-craft pass of 2026-10-18 gives the BatchScale scene a continuous change at the boundary between its scale and cpu beats (VAL-OPUS-072). The dashed "with computer overhead" curve used to fade in already bent; it now appears as a copy lying on the solid training-time curve and is lifted vertex by vertex onto the curve with the main-computer cost, its label fading in over the second half of the lift, and its dashes are drawn at a fixed on-screen size so they stay even across the segment joins. The two lines of that label are now one text stepped by the 1.25 em line step of the kit and centred on the end of the dashed curve, so they read as one label apart from "no overhead" at every width; its words are unchanged. The caption, readout, marker, robot dots and curve visibility at every beat end, the curve vertices at the poster and the method note are unchanged. The parallel-local proofs, receipts and browser run of 2026-10-09 pin the scene as it was, so the change is recorded here as exact edits over those bytes. The earlier bytes stand in for the live scene only while it is exactly the reviewed successor and keeps every data attribute, beat id, caption and exported name the earlier scene had, so older checks still read the bytes they recorded.',
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
    const source: SceneCraftSource = {
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
    '// BEGIN scene-craft pins (written by scripts/record-scene-craft-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END scene-craft pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN scene-craft pins[\s\S]*?\/\/ END scene-craft pins/;
  if (!block.test(lib)) throw new Error('lib/audit-scene-craft-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer, which no newer layer precedes. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-scene-craft-continuity.ts');
  let ok = true;
  for (const source of layer.loadSceneCraftReview(root).sources) {
    try {
      const prior = layer.sceneCraftPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
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
  if (paths.length === 0) throw new Error('usage: node scripts/record-scene-craft-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
