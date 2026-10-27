/**
 * Records the frontier length-cut successor review for the named articles:
 * exact edits over each article's bytes before the cut, the component blocks
 * the cut corrected with the reason for each, every citation, number, link
 * and glossary occurrence the cut dropped with the sentence it came from,
 * every one a later reviewed addition brought in with the sentence it went
 * into, the test pins the cut retired or moved, the live successor's pin, and
 * the review's own pin in lib/audit-length-cut-frontier-continuity.ts.
 *
 *   node scripts/record-length-cut-frontier-continuity.ts [--pins <file.json>] [--corrections <file.json>] <path>...
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
import type { LengthCutDrops } from '../lib/audit-length-cut-world-models-continuity.ts';
import type {
  FrontierLengthCutReview, FrontierLengthCutSource, LengthCutCorrection,
} from '../lib/audit-length-cut-frontier-continuity.ts';
import type { LengthCutPin } from '../lib/audit-length-cut-world-models-continuity.ts';
import { exactEdits } from './record-reader-first-continuity.ts';

const root = join(import.meta.dirname, '..');
const reviewPath = join(root, 'audit/evidence/length-cut-20261013-frontier/source-transition.json');
const libPath = join(root, 'lib/audit-length-cut-frontier-continuity.ts');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const artifact = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
// The same occurrence lists as COUNTED in the world-models layer, kept here so
// the frontier layer module is first loaded by verify(), after the pins are written.
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

/** The live article with its corrected blocks put back, as the layer checks it. */
function restore(current: string, corrected: readonly LengthCutCorrection[]): string {
  let result = current;
  for (const { before, after } of corrected) {
    if (result.split(after).length !== 2) throw new Error(`correction not found exactly once: ${after.slice(0, 60)}`);
    result = result.split(after).join(before);
  }
  return result;
}

/**
 * The occurrences that left `prior` for `current`, each with the sentence of
 * `prior` it came from. Called the other way round, it lists what a reviewed
 * addition brought in, each with the sentence it went into.
 */
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

const OWNER_APPROVAL = 'Josef, 12 Oct 2026: "ensure we remove AI slop etc and keep it extremely premium. not too long text." The humanize lane\'s length decision of the same day, recorded for Josef, authorizes cutting recap paragraphs, repeated numbers, secondary corroboration and minor reporting caveats, keeps every caveat whose removal would overstate a result and at least 30 cited sources per article, and approves dropped numbers, recap citations, successor reviews of the older continuity records and retired or moved phrase pins. The frontier pass applies it to the frontier articles. Not release approval.';
const RATIONALE = 'The owner asked for short, premium articles, and the frontier domain pass applies the humanizer standard and the length decision to the frontier articles: leads of at most two sentences, paragraphs of at most four, and about a quarter less text. That cut drops recap paragraphs, numbers stated twice, secondary examples and minor reporting caveats, which the word-budget trim cannot admit. This review records each cut as exact edits over the bytes the article had before it, lists every citation, number, link and glossary occurrence that left the body with the sentence it came from, records each corrected component block (an unsourced stat tile, a stale date, an unsupported self-check explanation) with its reason, and lists the test pins the cut retired or moved. The earlier bytes stand in for the live article only while the live article is exactly the reviewed successor, so older reviews, runs and receipts that pinned the earlier bytes still check the bytes they recorded.';

const any = (list: LengthCutDrops) => Object.values(list).some((entries) => entries.length > 0);
// Written into the review once, the first time it records a reviewed addition.
const ADDITIONS_APPROVAL = 'Additions: the owner-proxy directive of 2026-10-21 03:40 (owner-decision-kol-batch-next-dispatch-20261020, under owner-decision-kol-backlog-batch-20260930 and owner-decision-kol-coverage-and-evidence-standards-20260924) admits attributed, dated KOL paragraphs, each claim checked against its primary source, onto these articles; the frontier hand-off routed to opus-pass-convergence on 2026-10-14 23:20 under the same length decision restores cut facts the decision keeps and replaces press sources with primary ones. Each is recorded here as added occurrences and registered in the deltas ledger.';
const ADDITIONS_RATIONALE = 'A later reviewed addition is recorded in the same review: every citation, number, link and glossary occurrence it brings into the body is listed under added with the sentence it went into, its new sources are appended to the frontmatter citations list, and the body stays shorter than it was before the cut.';

function main(paths: string[], pinFile?: string, correctionFile?: string): void {
  const pinMap: Record<string, LengthCutPin[]> = pinFile ? JSON.parse(readFileSync(pinFile, 'utf8')) : {};
  const fixMap: Record<string, LengthCutCorrection[]> = correctionFile ? JSON.parse(readFileSync(correctionFile, 'utf8')) : {};
  const review: FrontierLengthCutReview = existsSync(reviewPath)
    ? JSON.parse(readFileSync(reviewPath, 'utf8'))
    : {
      schemaVersion: 'length-cut-continuity-v1',
      name: 'length-cut-20261013-frontier',
      reviewedBy: 'implementation worker for the frontier domain pass (opus-pass-frontier), under the owner directive of 2026-10-12 and the length decision of the same day (not independent acceptance)',
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
    const added = drops(restored, prior.toString());
    const source: FrontierLengthCutSource = {
      archivedFrom, before: artifact(path, prior), after: artifact(path, live),
      edits: exactEdits(prior.toString(), live.toString()),
      dropped: drops(prior.toString(), restored),
      ...(any(added) ? { added } : {}),
      pins: pinMap[path] ?? (index >= 0 ? review.sources[index].pins : []),
      corrected,
    };
    if (index >= 0) review.sources[index] = source;
    else review.sources.push(source);
    const d = source.dropped;
    console.log(`${path}: ${source.edits.length} edit(s) over ${archivedFrom.slice(0, 8)}; dropped ${d.citations.length} citation, ` +
      `${d.numbers.length} number, ${d.links.length} link and ${d.terms.length} glossary occurrence(s); added ` +
      `${added.citations.length} citation, ${added.numbers.length} number, ${added.links.length} link and ` +
      `${added.terms.length} glossary occurrence(s); ${corrected.length} corrected block(s); ${source.pins.length} pin(s)`);
  }
  if (review.sources.some(({ added }) => added && any(added))) {
    if (!review.ownerApproval.includes(ADDITIONS_APPROVAL)) review.ownerApproval += ` ${ADDITIONS_APPROVAL}`;
    if (!review.rationale.includes(ADDITIONS_RATIONALE)) review.rationale += ` ${ADDITIONS_RATIONALE}`;
  }
  review.sources.sort((x, y) => x.after.path.localeCompare(y.after.path));
  review.observedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
  mkdirSync(dirname(reviewPath), { recursive: true });
  writeFileSync(reviewPath, bytes);
  const pins = [
    '// BEGIN frontier length-cut pins (written by scripts/record-length-cut-frontier-continuity.ts)',
    '/** The reviewed evidence file; a changed review needs a reviewed code change too. */',
    `const reviewPin = { bytes: ${bytes.length}, sha256: '${digest(bytes)}' };`,
    '',
    '/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */',
    'const successors: ReadonlyMap<string, readonly [number, string]> = new Map([',
    ...review.sources.map(({ after }) => `  ['${after.path}', [${after.bytes}, '${after.sha256}']],`),
    ']);',
    '// END frontier length-cut pins',
  ].join('\n');
  const lib = readFileSync(libPath, 'utf8');
  const block = /\/\/ BEGIN frontier length-cut pins[\s\S]*?\/\/ END frontier length-cut pins/;
  if (!block.test(lib)) throw new Error('lib/audit-length-cut-frontier-continuity.ts lost its pins block');
  writeFileSync(libPath, lib.replace(block, () => pins));
  console.log(`recorded ${review.sources.length} successor(s); review ${bytes.length} bytes`);
}

/** Reads every recorded successor back through the written layer and the older article layers under it. */
async function verify(): Promise<boolean> {
  const layer = await import('../lib/audit-length-cut-frontier-continuity.ts');
  const { answerOptionsPredecessor } = await import('../lib/audit-answer-options-continuity.ts');
  const { convergenceProsePredecessor } = await import('../lib/audit-convergence-prose-continuity.ts');
  const { owedFiguresPredecessor } = await import('../lib/audit-owed-figures-continuity.ts');
  const { explainerMountPredecessor } = await import('../lib/audit-explainer-mount-continuity.ts');
  const { imageMountPredecessor } = await import('../lib/audit-image-mount-continuity.ts');
  const { wordBudgetTrimPredecessor } = await import('../lib/audit-word-budget-trim-continuity.ts');
  const { figureMountPredecessor } = await import('../lib/audit-figure-mount-continuity.ts');
  const { domainPassPredecessor } = await import('../lib/audit-domain-pass-continuity.ts');
  let ok = true;
  for (const source of layer.loadFrontierLengthCutReview(root).sources) {
    try {
      // The newer explainer-mount (2026-10-26), answer-options (2026-10-23), figure-mount (its 2026-10-15 frontier mounts, after the images) and image-mount (the frontier images of 2026-10-15) layers hand back the length-cut successor first.
      const prior = layer.frontierLengthCutPredecessor(root, source.before,
        imageMountPredecessor(root, source.before, figureMountPredecessor(root, source.before, answerOptionsPredecessor(root, source.before, explainerMountPredecessor(root, source.before, convergenceProsePredecessor(root, source.before, owedFiguresPredecessor(root, source.before, readFileSync(join(root, source.after.path)))))))));
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
    throw new Error('usage: node scripts/record-length-cut-frontier-continuity.ts [--pins <file.json>] [--corrections <file.json>] <path>...');
  }
  main(args, pinFile, correctionFile);
  if (!(await verify())) process.exit(1);
}
