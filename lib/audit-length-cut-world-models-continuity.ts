/**
 * Exact successor review for the eight world-models articles the
 * owner-approved length cut of 2026-10-12 shortened (Josef, 12 Oct 2026:
 * "ensure we remove AI slop etc and keep it extremely premium. not too long
 * text."; the length decision in the humanize lane). The world-models domain
 * pass keeps its own record, apart from the one the other domains' humanize
 * passes write. Unlike the word-budget trim, this cut may drop recap
 * paragraphs, repeated numbers, secondary corroboration and minor reporting
 * caveats, so citations, numbers, link and glossary occurrences can leave the
 * body. Every one that leaves is listed in the review with the claim it came
 * from, so the drop is explicit and auditable, and nothing may be added:
 * every citation, number, link target and glossary id the live article holds
 * was already in the article, at least as often.
 *
 * The cut keeps, exactly and in order, the frontmatter, every import line,
 * every one-line figure or component mount and every multi-line component
 * block (stat strips, self-checks); every heading anchor (heading slugs and
 * `<span id="..." />` ids) of the earlier article stays reachable; every link
 * target and glossary id stays at least once; the body still cites at least
 * 30 distinct sources (the rule of 2 Oct); and the body ends shorter than it
 * began. Each change is recorded as exact edits over the bytes the article
 * had before the cut, so the earlier bytes are rebuilt from the live file
 * instead of being archived. The artifact reader hands every older check the
 * rebuilt bytes only while the live article is exactly the reviewed
 * successor, reversing the edits rebuilds bytes that hash to the recorded
 * predecessor, and replaying them gives the live bytes back. No old review,
 * run, receipt, capture or ledger cell is rewritten. Test pins on cut text
 * are retired, and pins whose fact survives in new words are moved, in the
 * same review; a pin whose fact the cut now states only in another article
 * names that article, whose live text holds the new wording.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORLD_MODELS_LENGTH_CUT_CONTINUITY_DIR = 'audit/evidence/length-cut-20261012-world-models/';
const reviewFile = `${WORLD_MODELS_LENGTH_CUT_CONTINUITY_DIR}source-transition.json`;
const drift = 'world-models length cut continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

/** The minimum number of distinct sources an article body must still cite (rule of 2 Oct). */
export const MIN_BODY_SOURCES = 30;

type Artifact = { path: string; bytes: number; sha256: string };
export type LengthCutEdit = { before: string; after: string };
/** One occurrence that left the body, with the sentence of the earlier article it came from. */
export type LengthCutDrop = { value: string; claim: string };
export type LengthCutDrops = {
  citations: LengthCutDrop[];
  numbers: LengthCutDrop[];
  links: LengthCutDrop[];
  terms: LengthCutDrop[];
};
/**
 * A test pin on the earlier article's text: retired with its cut text, or
 * moved to the new wording, in this article or, with `toPath`, in the
 * article that now states the fact.
 */
export type LengthCutPin = {
  test: string; phrase: string; disposition: 'retired' | 'moved'; to?: string; toPath?: string; reason?: string;
};
export type LengthCutSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: LengthCutEdit[];
  dropped: LengthCutDrops;
  pins: LengthCutPin[];
};
export type LengthCutReview = {
  schemaVersion: 'length-cut-continuity-v1';
  name: 'length-cut-20261012-world-models';
  reviewedBy: string;
  ownerApproval: string;
  rationale: string;
  observedAt: string;
  sources: LengthCutSource[];
};

// BEGIN world-models length-cut pins (written by scripts/record-length-cut-world-models-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 208690, sha256: 'dad32bc204ab2dfc2cb888e56777dcee7e3d75708479c24303b5c30c8ee3205e' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/world-models/evaluation.mdx', [9523, 'e05022c80e3c5d293e45fddb6ae696a9e8a234090fc06f2b82377eca4048fa2b']],
  ['content/world-models/generative-sim.mdx', [12515, '64bc0843a0a20709612a441c9f6895cbc8fbdaaaa474a5f621ccc3a9596adb56']],
  ['content/world-models/generative-video.mdx', [13820, 'afec6682b8def24499ee1ad58127f77dd62ba8c4bb395f673ea9edb32b39fa3a']],
  ['content/world-models/jepa.mdx', [11978, 'b2515a8b9a6c3dc11c758b54191df1dcc68842f25b06705be86b575cae571461']],
  ['content/world-models/latent-dynamics.mdx', [10712, '412cfecebc504968491850759dd3bce417d9b2067721bd2e63ae3eb9e3082f8d']],
  ['content/world-models/model-based-robot-learning.mdx', [8862, '304717c7928004c427479c2f6886028323a16f1a0c5e34b58d557442b76f04d3']],
  ['content/world-models/taxonomy.mdx', [12440, 'b9760b615210d4881461da9780ae05ef15b21f49c1d89b26ad212f19322f93cd']],
  ['content/world-models/world-models-vs-simulators.mdx', [11326, '15665e7f2fccf679f5e58b00c6823a5eb42e70b57a0892149739276a968ac216']],
]);
// END world-models length-cut pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const lineList = (text: string, pattern: RegExp) => text.split('\n').filter((line) => pattern.test(line));
const matchList = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => match[1] ?? match[0]);
const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** What a cut must keep exactly and in order. */
const KEPT: readonly ((text: string) => string[])[] = [
  (text) => lineList(text, /^import /),
  (text) => lineList(text, /^<[A-Z][A-Za-z0-9]*\b[^\n]*\/>$/),
  (text) => matchList(text, /\n(<SelfCheck[\s\S]*?\n\/>|<div[\s\S]*?\n<\/div>)/g),
];

/** The occurrence lists a cut may only thin, each recorded drop accounted for. */
export const COUNTED = {
  citations: /<Cite id="([^"]+)"/g,
  numbers: /\d+(?:[.,]\d+)*/g,
  links: /\]\(([^)\s]+)\)/g,
  terms: /<Term id="([^"]+)"/g,
} as const;

/** A heading's anchor slug, the same way for both versions. */
export const headingSlug = (line: string) =>
  line.replace(/^#{1,6}\s+/, '').toLowerCase().replace(/[^\w\- ]/g, '').replace(/ /g, '-');
const anchors = (body: string) => [
  ...lineList(body, /^#{1,6} /).map(headingSlug),
  ...matchList(body, /<span id="([^"]+)" \/>/g),
];

function counts(list: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

/** prior minus current as a sorted list, or null when current holds anything prior lacks. */
function removed(prior: readonly string[], current: readonly string[]): string[] | null {
  const left = counts(prior);
  for (const item of current) {
    const n = left.get(item) ?? 0;
    if (n === 0) return null;
    left.set(item, n - 1);
  }
  return [...left].flatMap(([item, n]) => Array<string>(n).fill(item)).sort();
}

/**
 * The article obligations of a length cut: a content MDX file whose
 * frontmatter, imports, mounts and component blocks are unchanged and in
 * order, whose earlier heading anchors all survive, whose citations, numbers,
 * link targets and glossary ids only thinned (each link target and glossary
 * id still present) with exactly the recorded drops, which still cites at
 * least 30 distinct sources, and whose body has fewer words. Every pin entry
 * names text the earlier article held; a retired pin's text is gone from the
 * live article and a moved pin's new wording is in it.
 */
export function keepsWorldModelsLengthCutObligations(
  path: string, prior: string, current: string, dropped: LengthCutDrops, pins: readonly LengthCutPin[],
): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(current);
  if (!priorHead || head !== priorHead) return false;
  const priorBody = prior.slice(priorHead.length);
  const body = current.slice(head.length);
  if (!KEPT.every((kept) => sameList(kept(priorBody), kept(body)))) return false;
  const live = new Set(anchors(body));
  if (!anchors(priorBody).every((anchor) => live.has(anchor))) return false;
  for (const key of Object.keys(COUNTED) as (keyof typeof COUNTED)[]) {
    const before = matchList(priorBody, COUNTED[key]);
    const after = matchList(body, COUNTED[key]);
    const gone = removed(before, after);
    const recorded = (dropped?.[key] ?? []).map(({ value }) => value).sort();
    if (!gone || !sameList(gone, recorded)) return false;
    if ((dropped[key] ?? []).some(({ claim }) => typeof claim !== 'string' || claim.length < 12)) return false;
    if ((key === 'links' || key === 'terms') && new Set(before).size !== new Set(after).size) return false;
  }
  if (new Set(matchList(body, COUNTED.citations)).size < MIN_BODY_SOURCES) return false;
  const pinHolds = ({ phrase, disposition, to, toPath, test }: LengthCutPin) => {
    if (typeof test !== 'string' || !test.startsWith('tests/') || !phrase || !prior.includes(phrase)) return false;
    if (disposition === 'retired') return toPath === undefined && !current.includes(phrase);
    if (disposition !== 'moved' || !to) return false;
    // Moved within this article: the new wording is here. Moved to another article: the
    // phrase left this one; the unit test binds the other article's live text, as the pin's test does.
    return toPath === undefined ? current.includes(to)
      : toPath !== path && toPath.startsWith('content/') && toPath.endsWith('.mdx') && !current.includes(phrase);
  };
  if (!pins.every(pinHolds)) return false;
  return words(body) < words(priorBody);
}

function applyExact(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

/**
 * The pre-cut bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyWorldModelsLengthCutSource(source: LengthCutSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path || source.before?.path !== path || !/^[0-9a-f]{40}$/.test(source.archivedFrom ?? '') ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.some(({ before, after }) => typeof before !== 'string' || typeof after !== 'string' ||
      !before || !after || before === after)) {
    throw new Error(drift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const)) !== current ||
    !keepsWorldModelsLengthCutObligations(path, rebuilt, current, source.dropped, source.pins ?? [])) {
    throw new Error(drift);
  }
  return prior;
}

const reviewCache = new Map<string, LengthCutReview>();
const priorCache = new Map<string, Buffer>();

export function loadWorldModelsLengthCutReview(root: string): LengthCutReview {
  let bytes: Buffer;
  let review: LengthCutReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as LengthCutReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'length-cut-continuity-v1' || review.name !== 'length-cut-20261012-world-models' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !(review.ownerApproval?.length > 40) ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(drift);
  }
  reviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

function rebuiltPrior(root: string, path: string, live: Buffer): Buffer {
  const key = `${root}\0${path}\0${digest(live)}`;
  let prior = priorCache.get(key);
  if (!prior) {
    const source = loadWorldModelsLengthCutReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyWorldModelsLengthCutSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the length-cut review holds a successor for. */
export const worldModelsLengthCutSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function worldModelsLengthCutPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
