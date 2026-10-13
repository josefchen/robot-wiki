/**
 * Records the world-models length-cut successor review for the named articles: exact
 * edits over each article's bytes before the cut, every citation, number,
 * link and glossary occurrence the cut dropped with the sentence it came
 * from, the test pins the cut retired or moved, the live successor's pin,
 * and the review's own pin in lib/audit-length-cut-world-models-continuity.ts.
 *
 *   node scripts/record-length-cut-world-models-continuity.ts [--pins <file.json>] <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. `--pins` names a JSON file
 * mapping article paths to their pin entries (a pin moved to another
 * article names it in `toPath`); without it a re-recorded path keeps the pin
 * entries it had. Every recorded successor is read back
 * through the written layer, and its rebuilt bytes through the older
 * word-budget trim, figure-mount and domain-pass layers, before the script
 * exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  LengthCutDrops, LengthCutPin, LengthCutReview, LengthCutSource,
} from '../lib/audit-length-cut-world-models-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/length-cut-20261012-world-models/source-transition.json');
const libPath = join(root, 'lib/audit-length-cut-world-models-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
// The same occurrence lists as COUNTED in the layer, kept here so the layer
// module is first loaded by verify(), after the pins are written.
const COUNTED = {
  citations: /<Cite id="([^"]+)"/g,
  numbers: /\d+(?:[.,]\d+)*/g,
  links: /\]\(([^)\s]+)\)/g,
  terms: /<Term id="([^"]+)"/g,
} as const;

/** The sentences of a body, as written, so a dropped occurrence can name the claim it came from. */
function sentences(body: string): string[] {
  return body.split(/\n\s*\n/).flatMap((paragraph) =>
    paragraph.replace(/\s+/g, ' ').trim().split(/(?<=[.?!]["”)]?(?: <Cite [^>]*\/>)*(?:<\/span>)?)\s+(?=[A-Z0-9"(\[`π<])/))
    .filter((sentence) => sentence.length > 0);
}

const plain = (sentence: string) => sentence.replace(/<Cite id="([^"]+)" \/>/g, '[$1]').replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ').trim();

const wordSet = (sentence: string) => new Set(plain(sentence).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

function drops(prior: string, current: string): LengthCutDrops {
  const priorBody = prior.slice(frontmatter(prior).length);
  const body = current.slice(frontmatter(current).length);
  const kept = new Set(sentences(body));
  // A sentence the cut only reworded shares most of its words with a live one; the
  // sentences that left outright come first, so a drop names the claim that went.
  const live = sentences(body).map(wordSet);
  const survival = (sentence: string) => {
    const words = wordSet(sentence);
    return Math.max(0, ...live.map((other) => [...words].filter((word) => other.has(word)).length / (words.size || 1)));
  };
  const cut = sentences(priorBody).filter((sentence) => !kept.has(sentence))
    .map((sentence) => [sentence, survival(sentence)] as const)
    .sort(([, x], [, y]) => x - y).map(([sentence]) => sentence);
  const all = sentences(priorBody);
  const result = { citations: [], numbers: [], links: [], terms: [] } as LengthCutDrops;
  for (const key of Object.keys(COUNTED) as (keyof typeof COUNTED)[]) {
    const left = new Map<string, number>();
    for (const m of priorBody.matchAll(COUNTED[key])) left.set(m[1] ?? m[0], (left.get(m[1] ?? m[0]) ?? 0) + 1);
    for (const m of body.matchAll(COUNTED[key])) left.set(m[1] ?? m[0], (left.get(m[1] ?? m[0]) ?? 0) - 1);
    const holds = (value: string) => (sentence: string) => !sentence.startsWith('#') &&
      [...sentence.matchAll(COUNTED[key])].some((m) => (m[1] ?? m[0]) === value);
    const used = new Map<string, number>();
    for (const [value, n] of [...left].sort(([x], [y]) => x.localeCompare(y))) {
      if (n < 0) throw new Error(`${key} ${value} added by the cut`);
      for (let i = 0; i < n; i++) {
        const fromCut = cut.filter(holds(value));
        const candidates = fromCut.length > 0 ? fromCut : all.filter(holds(value));
        const pick = candidates[Math.min(used.get(value) ?? 0, candidates.length - 1)] ?? value;
        used.set(value, (used.get(value) ?? 0) + 1);
        result[key].push({ value, claim: plain(pick).slice(0, 400) });
      }
    }
  }
  return result;
}

function main(paths: string[], pinFile?: string): void {
  const pinMap: Record<string, LengthCutPin[]> = pinFile ? JSON.parse(readFileSync(pinFile, 'utf8')) : {};
  const review: LengthCutReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'length-cut-continuity-v1',
      name: 'length-cut-20261012-world-models',
      reviewedBy: 'implementation worker for the world-models domain pass (opus-pass-world-models), under the owner directive of 2026-10-12 16:50 (not independent acceptance)',
      ownerApproval: 'Josef, 12 Oct 2026: "ensure we remove AI slop etc and keep it extremely premium. not too long text." The humanize lane\'s length decision of the same day, recorded for Josef, authorizes cutting recap paragraphs, repeated numbers, secondary corroboration and minor reporting caveats, keeps every caveat whose removal would overstate a result and at least 30 cited sources per article, and approves dropped numbers, recap citations, successor reviews of the older continuity records and retired or moved phrase pins. Not release approval.',
      rationale: 'The owner asked for short, premium articles, and the directive of 2026-10-12 16:50 applies the humanizer standard and the length decision to the eight world-models articles. A cut to about a quarter less text must drop recap paragraphs, numbers stated twice, secondary examples and minor reporting caveats, which the word-budget trim cannot admit because it keeps every number, citation and link in place. This review records each such cut as exact edits over the bytes the article had before it, lists every citation, number, link and glossary occurrence that left the body with the sentence it came from, and lists the test pins the cut retired or moved. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.',
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
    const source: LengthCutSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
      dropped: drops(prior.toString(), live.toString()),
      pins: pinMap[path] ?? (index >= 0 ? review.sources[index].pins : []),
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    const d = source.dropped;
    console.log(`${path}: ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}; dropped ${d.citations.length} citation, ` +
      `${d.numbers.length} number, ${d.links.length} link and ${d.terms.length} glossary occurrence(s); ${source.pins.length} pin(s)`);
  }
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  const pins = [
    '// BEGIN world-models length-cut pins (written by scripts/record-length-cut-world-models-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END world-models length-cut pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN world-models length-cut pins[\s\S]*?\/\/ END world-models length-cut pins/;
  if (!block.test(lib)) throw new Error('lib/audit-length-cut-world-models-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer and the older article layers under it. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-length-cut-world-models-continuity.ts');
  const { wordBudgetTrimPredecessor } = await import('../lib/audit-word-budget-trim-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { domainPassPredecessor } = await import('../lib/audit-domain-pass-continuity.ts');
  let ok = true;
  for (const source of layer.loadWorldModelsLengthCutReview(root).sources) {
    try {
      const prior = layer.worldModelsLengthCutPredecessor(root, source.before, readFileSync(join(root, source.after.path)));
      if (digest(prior) !== source.before.sha256) throw new Error('rebuilt bytes differ from the predecessor');
      // The rebuilt bytes are the older layers' successors, which those layers still decide.
      const ref = { path: source.after.path, bytes: 0, sha256: '' };
      domainPassPredecessor(root, ref, figureMountPredecessor(root, ref, wordBudgetTrimPredecessor(root, ref, prior)));
    } catch (error) {
      ok = false;
      console.error(`${source.after.path}: ${(error as Error).message}`);
    }
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--pins');
  const pinFile = at >= 0 ? args[at + 1] : undefined;
  const paths = at >= 0 ? args.filter((_, i) => i !== at && i !== at + 1) : args;
  if (paths.length === 0) throw new Error('usage: node scripts/record-length-cut-world-models-continuity.ts [--pins <file.json>] <path>...');
  main(paths, pinFile);
  if (!(await verify())) process.exit(1);
}
