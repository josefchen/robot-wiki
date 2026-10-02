/**
 * Records the reader-first successor review for the named files: exact
 * edits over each file's bytes before the pass, the live successor's pin,
 * and the review's own pin in lib/audit-reader-first-continuity.ts.
 *
 *   node scripts/record-reader-first-continuity.ts <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. A path whose live bytes equal
 * its predecessor is dropped from the review.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReaderFirstEdit, ReaderFirstReview, ReaderFirstSource } from '../lib/audit-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/reader-first-20261002/source-transition.json');
const libPath = join(root, 'lib/audit-reader-first-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const count = (text: string, fragment: string) => text.split(fragment).length - 1;
const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

type Hunk = { a0: number; a1: number; b0: number; b1: number };

/** Changed line ranges between a and b, from a longest-common-subsequence table. */
function hunks(a: string[], b: string[]): Hunk[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const n = a.length - start - end;
  const m = b.length - start - end;
  const table = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] = a[start + i] === b[start + j]
        ? table[(i + 1) * (m + 1) + j + 1] + 1
        : Math.max(table[(i + 1) * (m + 1) + j], table[i * (m + 1) + j + 1]);
    }
  }
  const result: Hunk[] = [];
  let i = 0;
  let j = 0;
  let open: Hunk | undefined;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      if (open) result.push(open);
      open = undefined;
      i++;
      j++;
      continue;
    }
    open ??= { a0: start + i, a1: start + i, b0: start + j, b1: start + j };
    if (j < m && (i >= n || table[i * (m + 1) + j + 1] >= table[(i + 1) * (m + 1) + j])) open.b1 = start + ++j;
    else open.a1 = start + ++i;
  }
  if (open) result.push(open);
  return result;
}

function apply(text: string, edits: readonly (readonly [string, string])[]): string | undefined {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) return undefined;
    result = parts.join(to);
  }
  return result;
}

/** Exact edits that rebuild `before` from `after` and replay to it, each fragment unique. */
export function exactEdits(before: string, after: string): ReaderFirstEdit[] {
  const a = lines(before);
  const b = lines(after);
  const text = (h: Hunk): ReaderFirstEdit => ({ before: a.slice(h.a0, h.a1).join(''), after: b.slice(h.b0, h.b1).join('') });
  // Grows each hunk by shared context lines until both of its fragments are
  // unique, merging it into a neighbour it touches.
  const widen = (list: Hunk[]): Hunk[] => {
    const queue = list.map((h) => ({ ...h }));
    const out: Hunk[] = [];
    while (queue.length) {
      const hunk = queue.shift()!;
      for (;;) {
        const previous = out.at(-1);
        const next = queue[0];
        if (previous && hunk.a0 <= previous.a1) {
          out.pop();
          Object.assign(hunk, { a0: previous.a0, b0: previous.b0 });
          continue;
        }
        if (next && hunk.a1 >= next.a0) {
          queue.shift();
          Object.assign(hunk, { a1: next.a1, b1: next.b1 });
          continue;
        }
        const edit = text(hunk);
        if (edit.before && edit.after && count(before, edit.before) === 1 && count(after, edit.after) === 1) break;
        if (hunk.a0 > (previous?.a1 ?? 0) && hunk.b0 > (previous?.b1 ?? 0)) {
          hunk.a0--;
          hunk.b0--;
        } else if (hunk.a1 < (next?.a0 ?? a.length) && hunk.b1 < (next?.b0 ?? b.length)) {
          hunk.a1++;
          hunk.b1++;
        } else if (next) {
          queue.shift();
          Object.assign(hunk, { a1: next.a1, b1: next.b1 });
        } else if (previous) {
          out.pop();
          Object.assign(hunk, { a0: previous.a0, b0: previous.b0 });
        } else break;
      }
      out.push(hunk);
    }
    return out;
  };
  const works = (edits: ReaderFirstEdit[]) => edits.length > 0 &&
    edits.every((e) => e.before && e.after && e.before !== e.after) &&
    apply(after, edits.map((e) => [e.after, e.before] as const).reverse()) === before &&
    apply(before, edits.map((e) => [e.before, e.after] as const)) === after;
  const found = hunks(a, b);
  for (const candidate of [widen(found), widen(found.length ? [{
    a0: found[0].a0, a1: found.at(-1)!.a1, b0: found[0].b0, b1: found.at(-1)!.b1,
  }] : [])]) {
    const edits = candidate.map(text);
    if (works(edits)) return edits;
  }
  return [{ before, after }];
}

function main(paths: string[]): void {
  const review: ReaderFirstReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'reader-first-continuity-v1',
      name: 'reader-first-figures',
      reviewedBy: 'release steward re-anchoring the reader-first figure pass (not independent acceptance)',
      rationale: 'The reader-first figure pass of 2026-10-02 rewrote each article figure so a reader with no engineering background gets its point in five seconds: a takeaway headline, at most two visible controls with plain labels, every further control in an Adjust more fold, and the method, sources and caveats in a How this was made fold. The articles that point at those controls name them in plain words, the end-to-end specs open a fold before they use a control it now holds, and the figure sources changed with them. Each change is recorded here as exact edits over the bytes the file had before the pass. The earlier bytes stand in for the live file only while the live file is exactly the reviewed successor, so older reviews, runs and receipts that pinned them still check the bytes they recorded.',
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
    const source: ReaderFirstSource = {
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
  writeFileSync(reviewPath, bytes);
  const pins = [
    '// BEGIN reader-first pins (written by scripts/record-reader-first-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END reader-first pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN reader-first pins[\s\S]*?\/\/ END reader-first pins/;
  if (!block.test(lib)) throw new Error('lib/audit-reader-first-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-reader-first-continuity.ts');
  let ok = true;
  for (const source of layer.loadReaderFirstReview(root).sources) {
    try {
      const prior = layer.readerFirstPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
  if (!(await verify())) process.exit(1);
}
