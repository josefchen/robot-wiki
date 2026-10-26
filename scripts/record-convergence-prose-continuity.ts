/**
 * Records the convergence-prose successor review for the named articles:
 * exact edits over each article's bytes before the 2026-10-26 convergence
 * prose and sources edits, the live successor's pin, and the review's own
 * pin in lib/audit-convergence-prose-continuity.ts.
 *
 *   node scripts/record-convergence-prose-continuity.ts [--replaced <file.json>] <path>...
 *
 * The optional JSON file maps an article path to the citations its body
 * replaced: `{ "<path>": [{ "from": "<id>", "to": "<id>", "reason": "..." }] }`.
 * A path recorded before keeps its predecessor and its recorded replacements
 * unless the file names new ones; a new path takes HEAD as its predecessor.
 * Every recorded successor is read back through the written layer and then
 * through the whole older chain (lib/audit-seo-pass-continuity.ts) before the
 * script exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ConvergenceProseReplacement, ConvergenceProseReview, ConvergenceProseSource,
} from '../lib/audit-convergence-prose-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/convergence-prose-20261026/source-transition.json');
const libPath = join(root, 'lib/audit-convergence-prose-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[], replaced: Record<string, ConvergenceProseReplacement[]>): void {
  const review: ConvergenceProseReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'convergence-prose-continuity-v1',
      name: 'convergence-prose-20261026',
      reviewedBy: 'implementation worker for opus-pass-convergence-prose-and-sources, 2026-10-26 (not independent acceptance)',
      rationale: 'The opus-pass convergence prose and sources slice applies the items the domain passes routed to convergence: plain-prose fixes (curly quotes, a staged heading, a restated set of calculator defaults, dated status lines, a cue sentence that names what the first step of its explainer shows), numbers restored from their sources, primary sources placed beside or in place of press stories, citations for authored paragraphs that had none, inbound links, and the review dates those edits move. Each article change is recorded here as exact edits over the bytes the article had before it. No figure is added, dropped or reordered, and every source the earlier body cited is still cited unless this review names the source that replaced it and why. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      ownerApproval: 'Owner directives sealed in contract/opus-pass.md (VAL-OPUS-091 to 094, 101, 152 and the frontier and world-models report items) and routed to opus-pass-convergence by the domain-pass handoffs of 2026-10-14 to 2026-10-16, split to opus-pass-convergence-prose-and-sources on 2026-10-26. Not release approval.',
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
    const replacedCitations = replaced[path] ?? (index >= 0 ? review.sources[index].replacedCitations : undefined);
    const source: ConvergenceProseSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
      ...(replacedCitations?.length ? { replacedCitations } : {}),
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
    '// BEGIN convergence-prose pins (written by scripts/record-convergence-prose-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END convergence-prose pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN convergence-prose pins[\s\S]*?\/\/ END convergence-prose pins/;
  if (!block.test(lib)) throw new Error('lib/audit-convergence-prose-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer, which no newer layer precedes, and the older chain. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-convergence-prose-continuity.ts');
  const { seoPassPredecessor } = await import('../lib/audit-seo-pass-continuity.ts');
  let ok = true;
  for (const source of layer.loadConvergenceProseReview(root).sources) {
    try {
      const live = readFileSync(join(root, source.after.path));
      const prior = layer.convergenceProsePredecessor(root, source.before, live);
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
      // The whole older chain reads the live article through this layer without drift.
      seoPassPredecessor(root, { path: source.after.path, bytes: 0, sha256: '' }, live);
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--replaced');
  const replaced = flag >= 0 ? JSON.parse(readFileSync(args[flag + 1], 'utf8')) : {};
  const paths = flag >= 0 ? args.filter((_, i) => i !== flag && i !== flag + 1) : args;
  if (paths.length === 0) {
    throw new Error('usage: node scripts/record-convergence-prose-continuity.ts [--replaced <file.json>] <path>...');
  }
  main(paths, replaced);
  if (!(await verify())) process.exit(1);
}
