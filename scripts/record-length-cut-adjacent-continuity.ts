/**
 * Records the adjacent cut successor review for the named articles:
 * exact edits over each article's bytes before the pass, the component blocks
 * the pass corrected with the reason for each, every citation, number, link
 * and glossary occurrence the pass dropped or added with the sentence it came
 * from or went into, the test pins the pass retired or moved, the live
 * successor's pin, and the review's own pin in
 * lib/audit-length-cut-adjacent-continuity.ts.
 *
 *   node scripts/record-length-cut-adjacent-continuity.ts [--pins <file.json>] [--corrections <file.json>] <path>...
 *
 * A path recorded before keeps its predecessor and is re-recorded against
 * it; a new path takes HEAD as its predecessor. `--pins` and `--corrections`
 * name JSON files mapping article paths to their pin entries and to their
 * block corrections ({ before, after, reason }); without them a re-recorded
 * path keeps the entries it had. Every recorded successor is read back
 * through the written layer, and its rebuilt bytes through the older
 * word-budget trim, figure-mount and domain-pass layers, before the script
 * exits.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  AdjacentCorrection, AdjacentCutReview, AdjacentCutSource,
} from '../lib/audit-length-cut-adjacent-continuity.ts';
import type { LengthCutDrops, LengthCutPin } from '../lib/audit-length-cut-world-models-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/length-cut-20261014-adjacent/source-transition.json');
const libPath = join(root, 'lib/audit-length-cut-adjacent-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
// The same occurrence lists as COUNTED in the world-models layer, kept here so
// the adjacent layer module is first loaded by verify(), after the pins are written.
const COUNTED = {
  citations: /<Cite id="([^"]+)"/g,
  numbers: /\d+(?:[.,]\d+)*/g,
  links: /\]\(([^)\s]+)\)/g,
  terms: /<Term id="([^"]+)"/g,
} as const;

/** The sentences of a body, as written, so an occurrence can name the claim it belongs to. */
function sentences(body: string): string[] {
  return body.split(/\n\s*\n/).flatMap((paragraph) =>
    paragraph.replace(/\s+/g, ' ').trim().split(/(?<=[.?!]["”)]?(?: <Cite [^>]*\/>)*(?:<\/span>)?)\s+(?=[A-Z0-9"(\[`π<])/))
    .filter((sentence) => sentence.length > 0);
}

const plain = (sentence: string) => sentence.replace(/<Cite id="([^"]+)" \/>/g, '[$1]').replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ').trim();

const wordSet = (sentence: string) => new Set(plain(sentence).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

/** The live article with its corrected blocks put back, as the layer checks it. */
function restore(current: string, corrected: readonly AdjacentCorrection[]): string {
  let result = current;
  for (const { before, after } of corrected) {
    if (result.split(after).length !== 2) throw new Error(`correction not found exactly once: ${after.slice(0, 60)}`);
    result = result.split(after).join(before);
  }
  return result;
}

/**
 * The occurrences that left `fromText` for `toText`, each with the sentence of
 * `fromText` it came from: sentences that left outright come first, so a
 * change names the claim that went.
 */
function changes(fromText: string, toText: string): LengthCutDrops {
  const fromBody = fromText.slice(frontmatter(fromText).length);
  const toBody = toText.slice(frontmatter(toText).length);
  const kept = new Set(sentences(toBody));
  const other = sentences(toBody).map(wordSet);
  const survival = (sentence: string) => {
    const words = wordSet(sentence);
    return Math.max(0, ...other.map((o) => [...words].filter((word) => o.has(word)).length / (words.size || 1)));
  };
  const all = sentences(fromBody);
  const gone = all.filter((sentence) => !kept.has(sentence))
    .map((sentence) => [sentence, survival(sentence)] as const)
    .sort(([, x], [, y]) => x - y).map(([sentence]) => sentence);
  const result = { citations: [], numbers: [], links: [], terms: [] } as LengthCutDrops;
  for (const key of Object.keys(COUNTED) as (keyof typeof COUNTED)[]) {
    const left = new Map<string, number>();
    for (const m of fromBody.matchAll(COUNTED[key])) left.set(m[1] ?? m[0], (left.get(m[1] ?? m[0]) ?? 0) + 1);
    for (const m of toBody.matchAll(COUNTED[key])) left.set(m[1] ?? m[0], (left.get(m[1] ?? m[0]) ?? 0) - 1);
    const holds = (value: string) => (sentence: string) => !sentence.startsWith('#') &&
      [...sentence.matchAll(COUNTED[key])].some((m) => (m[1] ?? m[0]) === value);
    const used = new Map<string, number>();
    for (const [value, n] of [...left].sort(([x], [y]) => x.localeCompare(y))) {
      for (let i = 0; i < n; i++) {
        const fromGone = gone.filter(holds(value));
        const candidates = fromGone.length > 0 ? fromGone : all.filter(holds(value));
        const pick = candidates[Math.min(used.get(value) ?? 0, candidates.length - 1)] ?? value;
        used.set(value, (used.get(value) ?? 0) + 1);
        result[key].push({ value, claim: plain(pick).slice(0, 400) });
      }
    }
  }
  return result;
}

const OWNER_APPROVAL = 'Josef, 12 Oct 2026: "ensure we remove AI slop etc and keep it extremely premium. not too long text." The humanize lane\'s length decision of the same day, recorded for Josef, authorizes cutting recap paragraphs, repeated numbers, secondary corroboration and minor reporting caveats, keeps every caveat whose removal would overstate a result and at least 30 cited sources per article, and approves dropped numbers, recap citations, successor reviews of the older continuity records and retired or moved phrase pins. The opus-pass-adjacent feature (owner sweep of 2026-09-29, owner directives of 2026-10-04 and 2026-10-06) adds dated primary sources, corrections and the trailing-slash form of the four article links the sweep found redirecting. Not release approval.';
const RATIONALE = 'The owner asked for short, premium articles, and the adjacent domain pass applies the humanizer standard and the length decision to the four adjacent articles: leads of at most two sentences, paragraphs of at most four and about a quarter less prose. The same pass applies the owner sweep of 2026-09-29: it adds dated primary sources for the 2025 and 2026 record (robotaxi and trucking deployment, safety data and recalls, drone racing and delivery, Mars autonomy and orbital servicing, new surgical systems and learned surgical autonomy), corrects overtaken claims and brings every article to at least 30 cited sources. Neither the domain-pass layer, which admits no dropped inline citation, nor the length-cut layers, which admit no added one, can record that, so this review records each rewrite as exact edits over the bytes the article had before the pass, lists every citation, number, link and glossary occurrence that left or entered the body with the sentence it came from or went into, records each corrected component block with its reason, and lists the test pins the pass retired or moved. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.';

function main(paths: string[], pinFile?: string, correctionFile?: string): void {
  const pinMap: Record<string, LengthCutPin[]> = pinFile ? JSON.parse(readFileSync(pinFile, 'utf8')) : {};
  const fixMap: Record<string, AdjacentCorrection[]> = correctionFile ? JSON.parse(readFileSync(correctionFile, 'utf8')) : {};
  const review: AdjacentCutReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'adjacent-cut-continuity-v1',
      name: 'length-cut-20261014-adjacent',
      reviewedBy: 'helper preparing the adjacent domain pass (opus-pass-adjacent), under the owner directive of 2026-10-12 and the length decision of the same day (not independent acceptance)',
      ownerApproval: OWNER_APPROVAL,
      rationale: RATIONALE,
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
    const corrected = fixMap[path] ?? (index >= 0 ? review.sources[index].corrected : []);
    const restored = restore(live.toString(), corrected);
    const source: AdjacentCutSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
      dropped: changes(prior.toString(), restored),
      added: changes(restored, prior.toString()),
      pins: pinMap[path] ?? (index >= 0 ? review.sources[index].pins : []),
      corrected,
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    const d = source.dropped;
    const a = source.added;
    console.log(`${path}: ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}; dropped ${d.citations.length} citation, ` +
      `${d.numbers.length} number, ${d.links.length} link and ${d.terms.length} glossary occurrence(s); added ` +
      `${a.citations.length} citation, ${a.numbers.length} number, ${a.links.length} link and ${a.terms.length} glossary ` +
      `occurrence(s); ${corrected.length} corrected block(s); ${source.pins.length} pin(s)`);
  }
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  const pins = [
    '// BEGIN adjacent cut pins (written by scripts/record-length-cut-adjacent-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END adjacent cut pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN adjacent cut pins[\s\S]*?\/\/ END adjacent cut pins/;
  if (!block.test(lib)) throw new Error('lib/audit-length-cut-adjacent-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer and the older article layers under it. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-length-cut-adjacent-continuity.ts');
  const { answerOptionsPredecessor } = await import('../lib/audit-answer-options-continuity.ts');
  const { explainerMountPredecessor } = await import('../lib/audit-explainer-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  const { wordBudgetTrimPredecessor } = await import('../lib/audit-word-budget-trim-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { domainPassPredecessor } = await import('../lib/audit-domain-pass-continuity.ts');
  let ok = true;
  for (const source of layer.loadAdjacentCutReview(root).sources) {
    try {
      // The newer explainer-mount (2026-10-26), answer-options (2026-10-23), figure-mount (its 2026-10-15 frontier mounts) and image-mount (the adjacent images of bundle B, 2026-10-15) layers hand back the cut's successor first.
      const prior = layer.adjacentCutPredecessor(root, source.before,
        imageMountPredecessor(root, source.before, figureMountPredecessor(root, source.before, answerOptionsPredecessor(root, source.before, explainerMountPredecessor(root, source.before, readFileSync(join(root, source.after.path)))))));
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
  const flag = (name: string) => {
    const at = args.indexOf(name);
    if (at < 0) return undefined;
    const value = args[at + 1];
    args.splice(at, 2);
    return value;
  };
  const pinFile = flag('--pins');
  const correctionFile = flag('--corrections');
  if (args.length === 0) {
    throw new Error('usage: node scripts/record-length-cut-adjacent-continuity.ts [--pins <file.json>] [--corrections <file.json>] <path>...');
  }
  main(args, pinFile, correctionFile);
  if (!(await verify())) process.exit(1);
}
