/**
 * Records the site-foundation re-skin successor review: exact edits over
 * each presentation source's bytes before the re-skin, the live successor's
 * pin, and the review's own pin in
 * lib/audit-reskin-site-foundation-continuity.ts.
 *
 *   node scripts/record-reskin-site-foundation-continuity.ts <base> <path>...
 *
 * <base> is the commit the re-skin started from. A path whose live bytes
 * equal the base is dropped from the review. Every recorded successor is
 * read back through the written layer before the script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  isReskinPresentationPath, type ReskinReview, type ReskinSource,
} from '../lib/audit-reskin-site-foundation-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/reskin-site-foundation-20261010/source-transition.json');
const libPath = join(root, 'lib/audit-reskin-site-foundation-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(base: string, paths: string[]): void {
  const review: ReskinReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'reskin-site-foundation-continuity-v1',
      name: 'reskin-site-foundation-20261010',
      reviewedBy: 'implementation worker for the site-foundation re-skin of 2026-10-10 (not independent acceptance)',
      rationale: 'On 2026-10-10 the owner replaced the brand-v2 visual identity with the Pantheon research-page standard (PANTHEON-SPEC.md): paper and ink tokens, DM Sans, Geist and Geist Mono, a single top bar, and an article template with an eyebrow, a display title, a sticky contents rail, margin sidenotes, numbered findings and booktabs tables, carried to the home, hub, glossary, A-Z and search pages. The change is presentation only. Each presentation source it touched is recorded here as exact edits over the bytes it had before, and the earlier bytes stand in for the live file only while the live file is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      observedAt: '',
      sources: [],
    };
  const commit = git('rev-parse', base).toString().trim();
  for (const path of paths) {
    if (!isReskinPresentationPath(path)) throw new Error(`${path}: not a presentation source the re-skin may record`);
    const live = readFileSync(join(root, path));
    const index = review.sources.findIndex(({ after }) => after.path === path);
    const archivedFrom = index >= 0 ? review.sources[index].archivedFrom : commit;
    const prior = git('show', `${archivedFrom}:${path}`);
    if (prior.equals(live)) {
      if (index >= 0) review.sources.splice(index, 1);
      console.log(`${path}: unchanged from ${archivedFrom.slice(0, 8)}, not recorded`);
      continue;
    }
    const source: ReskinSource = {
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
    '// BEGIN reskin site-foundation pins (written by scripts/record-reskin-site-foundation-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END reskin site-foundation pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN reskin site-foundation pins[\s\S]*?\/\/ END reskin site-foundation pins/;
  if (!block.test(lib)) throw new Error('lib/audit-reskin-site-foundation-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import(`../lib/audit-reskin-site-foundation-continuity.ts?${Date.now()}`);
  let ok = true;
  for (const source of layer.loadReskinReview(root).sources) {
    try {
      const prior = layer.reskinPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, ...paths] = process.argv.slice(2);
  if (!base || paths.length === 0) {
    throw new Error('usage: node scripts/record-reskin-site-foundation-continuity.ts <base> <path>...');
  }
  main(base, paths);
  if (!(await verify())) process.exit(1);
}
