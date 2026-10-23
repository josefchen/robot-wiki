/**
 * Records the answer-options successor review for the named articles: exact
 * edits over each article's bytes before its self-check option sets were
 * rebalanced, the live successor's pin, and the review's own pin in
 * lib/audit-answer-options-continuity.ts.
 *
 *   node scripts/record-answer-options-continuity.ts <path>...
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
import type { AnswerOptionsReview, AnswerOptionsSource } from '../lib/audit-answer-options-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/answer-options-20261023/source-transition.json');
const libPath = join(root, 'lib/audit-answer-options-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: AnswerOptionsReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'answer-options-continuity-v1',
      name: 'answer-options-20261023',
      reviewedBy: 'implementation worker for the brand-v2-interactives round-1 product fixes of 2026-10-23 (not independent acceptance)',
      rationale: 'VAL-EDU-041 bounds how much an option set gives away by its shape: in every answer-feedback region the correct option may be at most 1.5 times as long as its longest distractor, and it may be the longest option (ties counted) in no more than a third of the regions plus one. The 2026-10-10 word-budget trim pushed the calibration self-check to 1.63, and the correct option was the longest in 12 of 21 regions. The fix of 2026-10-23 lengthens or qualifies distractors and rewords a few prompts so that no option set leaks its answer, without trimming any correct option. Each change is recorded here as exact edits over the bytes the article had before it. An article may differ from those bytes only in the text of self-check prompts and option labels: its frontmatter, prose, mounts, option values, explanations, takeaways, answer, option order and every number, citation, link and glossary occurrence are unchanged. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
      ownerApproval: 'Sealed mission contract authority: contract/educational-ux.md VAL-EDU-041 bounds the option-length ratio and the share of regions whose correct option is the longest; brand-v2-interactives user testing round 1 (validation/brand-v2-interactives/user-testing/triage-round1.md) found both unmet and dispatched interactives-r1-product-fixes-and-successors to rebalance the option sets under the AGENTS.md brand-v2 operating authority and the owner directive of 2026-10-12 16:50 (no AI slop, short text). Fact-preserving educational repair, not new factual claims. Not release approval.',
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
    const source: AnswerOptionsSource = {
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
    '// BEGIN answer-options pins (written by scripts/record-answer-options-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END answer-options pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN answer-options pins[\s\S]*?\/\/ END answer-options pins/;
  if (!block.test(lib)) throw new Error('lib/audit-answer-options-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer, which no newer layer precedes. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-answer-options-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  let ok = true;
  for (const source of layer.loadAnswerOptionsReview(root).sources) {
    try {
      const prior = layer.answerOptionsPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
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
  if (paths.length === 0) throw new Error('usage: node scripts/record-answer-options-continuity.ts <path>...');
  main(paths);
  if (!(await verify())) process.exit(1);
}
