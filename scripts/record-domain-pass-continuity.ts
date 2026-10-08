/**
 * Records the domain-pass successor review for the named articles: exact
 * edits over each article's bytes before the pass, the live successor's pin,
 * and the review's own pin in lib/audit-domain-pass-continuity.ts.
 *
 *   node scripts/record-domain-pass-continuity.ts <path>...
 *   node scripts/record-domain-pass-continuity.ts --checker <suite>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. Every recorded successor is
 * read back through the written layer before the script exits.
 *
 * With --checker, each named historical verification suite whose assertions
 * the pass brought up to date gets its live hash re-pinned as the
 * currentTestHash of its lib/audit-local-basis.ts entry, and the checker
 * revision is recorded as those line swaps over the checker the pass
 * started from, with its pins in lib/audit-domain-pass-continuity.ts.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  DomainPassCheckerEdit, DomainPassCheckerReview, DomainPassReview, DomainPassSource,
} from '../lib/audit-domain-pass-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/domain-pass-20261006/source-transition.json');
const libPath = join(root, 'lib/audit-domain-pass-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });

function main(paths: string[]): void {
  const review: DomainPassReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'domain-pass-continuity-v1',
      name: 'domain-pass-20261006',
      reviewedBy: 'implementation worker for the opus-pass domain passes of 2026-10-06 (not independent acceptance)',
      rationale: 'The opus-pass domain passes rewrite each article from the owner\'s verified draft: shorter prose, at least 30 cited sources, no Callout or Aside boxes, every non-OK audit finding fixed. Each rewrite is recorded here as exact edits over the bytes the article had before the pass. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, its frontmatter differs only by appended citation ids, every citation it had is still cited and every figure and component mount is unchanged, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
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
    const source: DomainPassSource = {
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
    '// BEGIN domain-pass pins (written by scripts/record-domain-pass-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END domain-pass pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN domain-pass pins[\s\S]*?\/\/ END domain-pass pins/;
  if (!block.test(lib)) throw new Error('lib/audit-domain-pass-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

const checkerReviewPath = join(root, 'audit/evidence/domain-pass-20261006/checker-transition.json');
const checkerFile = 'lib/audit-local-basis.ts';

function recordChecker(suites: string[]): void {
  const recorded: DomainPassCheckerReview | undefined = existsSync(checkerReviewPath)
    ? JSON.parse(readFileSync(checkerReviewPath, 'utf8'))
    : undefined;
  const archivedFrom = recorded?.archivedFrom ?? git('rev-parse', 'HEAD').toString().trim();
  const prior = git('show', `${archivedFrom}:${checkerFile}`);
  if (recorded && digest(prior) !== recorded.before.sha256) {
    throw new Error(`${checkerFile}: ${archivedFrom} no longer holds the recorded predecessor`);
  }
  let checker = readFileSync(join(root, checkerFile), 'utf8');
  for (const suite of suites) {
    const key = `\n  '${suite}': {\n`;
    const start = checker.indexOf(key);
    const end = checker.indexOf('\n  },\n', start);
    if (start < 0 || end < 0 || checker.indexOf(key, start + 1) >= 0) {
      throw new Error(`${suite}: not a historical verification suite of ${checkerFile}`);
    }
    const entry = checker.slice(start, end + 1);
    const line = /\n {4}currentTestHash: '[0-9a-f]{64}',\n/;
    if (!line.test(entry)) throw new Error(`${suite}: its entry has no currentTestHash`);
    const repinned = entry.replace(line, () => `\n    currentTestHash: '${digest(readFileSync(join(root, suite)))}',\n`);
    checker = `${checker.slice(0, start)}${repinned}${checker.slice(end + 1)}`;
  }
  const before = prior.toString().split('\n');
  const after = checker.split('\n');
  if (before.length !== after.length) throw new Error(`${checkerFile}: changed beyond currentTestHash lines`);
  const edits: DomainPassCheckerEdit[] = [];
  for (let index = 0; index < after.length; index++) {
    if (before[index] === after[index]) continue;
    let keyLine = index;
    while (keyLine > 0 && !/^ {2}'[^']+': \{$/.test(after[keyLine])) keyLine--;
    const suite = after[keyLine].match(/^ {2}'([^']+)': \{$/)?.[1];
    if (!suite || !/^ {4}currentTestHash: '[0-9a-f]{64}',$/.test(before[index]) ||
      !/^ {4}currentTestHash: '[0-9a-f]{64}',$/.test(after[index])) {
      throw new Error(`${checkerFile}: line ${index + 1} changed beyond a currentTestHash line`);
    }
    edits.push({ suite, before: `${before[index]}\n`, after: `${after[index]}\n` });
  }
  if (edits.length === 0) throw new Error(`${checkerFile}: no suite hash differs from ${archivedFrom.slice(0, 8)}`);
  writeFileSync(join(root, checkerFile), checker);
  const review: DomainPassCheckerReview = {
    schemaVersion: 'domain-pass-checker-revision-v1',
    name: 'domain-pass-reader',
    reviewedBy: 'integration worker for the domain passes of 2026-10-06 (not independent acceptance)',
    rationale: 'The domain passes bring the assertions of a few historical verification suites up to date with the rewritten articles. The checker lists each such suite with the one live version its retained snapshot stays compatible with, so each of those entries gets the suite\'s new live hash. Every edit swaps one currentTestHash line inside its own suite entry; no computation, threshold, ledger rule, snapshot or negative check changes.',
    observedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    archivedFrom,
    before: artifact(checkerFile, prior),
    after: artifact(checkerFile, Buffer.from(checker)),
    edits,
  };
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  writeFileSync(checkerReviewPath, bytes);
  const pins = [
    '// BEGIN domain-pass checker pins (written by scripts/record-domain-pass-continuity.ts --checker)',
    '/** The reviewed checker evidence file; a changed review needs a reviewed code change too. */',
    `const checkerReviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** The SEO-pass reader head the revision edits, and the reviewed revision. */',
    `const checkerBefore = { bytes: ${review.before.bytes}, sha256: '${review.before.sha256}' };`,
    `const checkerAfter = { bytes: ${review.after.bytes}, sha256: '${review.after.sha256}' };`,
    '// END domain-pass checker pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN domain-pass checker pins[\s\S]*?\/\/ END domain-pass checker pins/;
  if (!block.test(lib)) throw new Error('lib/audit-domain-pass-continuity.ts lost its checker pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${edits.length} suite hash edit(s) over ${archivedFrom.slice(0, 8)}; review ${bytes.length} bytes`);
}

/** Reads the recorded checker revision back through the written layer. */
async function verifyChecker(): Promise<boolean> {
  const layer = await import('../lib/audit-domain-pass-continuity.ts');
  try {
    const review = layer.loadDomainPassCheckerReview(root);
    const prior = layer.domainPassCheckerPredecessor(root, readFileSync(join(root, checkerFile)));
    if (digest(prior) !== review.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
    return true;
  } catch (error) {
    console.error(`${checkerFile}: ${(error as Error).message}`);
    return false;
  }
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-domain-pass-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  let ok = true;
  for (const source of layer.loadDomainPassReview(root).sources) {
    try {
      // The newer figure-mount layer hands back the domain-pass successor first.
      const live = figureMountPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
      const prior = layer.domainPassPredecessor(root, source.before, live);
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
  if (paths[0] === '--checker') {
    if (paths.length === 1) throw new Error('usage: node scripts/record-domain-pass-continuity.ts --checker <suite>...');
    recordChecker(paths.slice(1));
    if (!(await verifyChecker())) process.exit(1);
  } else {
    if (paths.length === 0) throw new Error('usage: node scripts/record-domain-pass-continuity.ts <path>...');
    main(paths);
    if (!(await verify())) process.exit(1);
  }
}
