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
 * from, so the drop is explicit and auditable. Nothing may be added without a
 * record either: a later reviewed addition (an attributed, dated paragraph
 * from the KOL intake, checked against its primary source) lists every
 * citation, number, link and glossary occurrence it brought into the body
 * with the sentence it went into, and any source it adds is appended to the
 * frontmatter citations list, the only frontmatter change the layer admits.
 * With no recorded addition, every citation, number, link target and
 * glossary id the live article holds was already in the article, at least as
 * often. The frontier cut, which reuses these obligations, records no
 * additions.
 *
 * The cut keeps, exactly and in order, the frontmatter (apart from those
 * appended citation ids), every import line, every one-line figure or
 * component mount and every multi-line component block (stat strips,
 * self-checks); every heading anchor (heading slugs and `<span id="..." />`
 * ids) of the earlier article stays reachable; every link target and
 * glossary id stays at least once, and an added glossary occurrence keeps
 * their order of first use; the body still cites at least 30 distinct
 * sources (the rule of 2 Oct); and the body ends shorter than it began,
 * additions included. Each change is recorded as exact edits over the bytes
 * the article had before the cut, so the earlier bytes are rebuilt from the
 * live file instead of being archived. The artifact reader hands every older
 * check the rebuilt bytes only while the live article is exactly the reviewed
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
  /** Occurrences a reviewed addition brought into the body, each with the sentence it went into. */
  added?: LengthCutDrops;
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
const reviewPin = { bytes: 218811, sha256: 'f0a9dd4d7cb48ad41bfefe433f67ef20b4fb541ea6d8e46730886691c584c548' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/world-models/evaluation.mdx', [9523, 'e05022c80e3c5d293e45fddb6ae696a9e8a234090fc06f2b82377eca4048fa2b']],
  ['content/world-models/generative-sim.mdx', [13103, 'b961312be3988fa917e33a9afb5ccc7156702dc8b4d1f9315de53e20ee0a0b13']],
  ['content/world-models/generative-video.mdx', [14410, '4084e96053e589275a785b85dde2683b0df301167e925d06026030129c76c3a5']],
  ['content/world-models/jepa.mdx', [12634, '96f0abf25e2973cfb7e3ca18d819ff90032fc426fda524f86a8d3434207b87fb']],
  ['content/world-models/latent-dynamics.mdx', [10712, '412cfecebc504968491850759dd3bce417d9b2067721bd2e63ae3eb9e3082f8d']],
  ['content/world-models/model-based-robot-learning.mdx', [9510, '7e3bd1de20b638ca14b2142c90698dbd3a61d14b6cd0eb90723ec28914edf9da']],
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

const NO_ADDITIONS: LengthCutDrops = { citations: [], numbers: [], links: [], terms: [] };
const citationList = (head: string) =>
  head.match(/\ncitations:\n((?: {2}- [^\n]+\n)*)/)?.[1].split('\n').filter(Boolean).map((line) => line.slice(4)) ?? [];
const firstUse = (list: readonly string[]) => list.filter((item, index) => list.indexOf(item) === index);

/** left minus right as a sorted multiset. */
function minus(left: readonly string[], right: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const item of left) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of right) counts.set(item, (counts.get(item) ?? 0) - 1);
  return [...counts].flatMap(([item, n]) => (n > 0 ? Array<string>(n).fill(item) : [])).sort();
}

/**
 * The earlier frontmatter exactly, except that its citations list may end
 * with appended ids, each new to the list and a recorded added citation.
 */
function keepsFrontmatter(priorHead: string, head: string, added: LengthCutDrops): boolean {
  const before = citationList(priorHead);
  const after = citationList(head);
  const appended = after.slice(before.length);
  const addedIds = new Set((added?.citations ?? []).map(({ value }) => value));
  if (!sameList(after.slice(0, before.length), before) || new Set(appended).size !== appended.length ||
    appended.some((id) => !/^[a-z0-9][a-z0-9.-]*$/.test(id) || before.includes(id) || !addedIds.has(id))) return false;
  const withoutAppended = head.replace(/\ncitations:\n(?: {2}- [^\n]+\n)*/, (block) =>
    block.split('\n').filter((line) => !appended.some((id) => line === `  - ${id}`)).join('\n'));
  return withoutAppended === priorHead;
}

/**
 * The article obligations of a length cut: a content MDX file whose
 * frontmatter (but for citation ids appended with a recorded addition),
 * imports, mounts and component blocks are unchanged and in order, whose
 * earlier heading anchors all survive, whose citations, numbers, link
 * targets and glossary ids changed by exactly the recorded drops and
 * additions (each earlier link target and glossary id still present, no
 * added glossary occurrence changing their order of first use, every added
 * source listed in the frontmatter), which still cites at least 30 distinct
 * sources, and whose
 * body has fewer words. Every pin entry names text the earlier article held;
 * a retired pin's text is gone from the live article and a moved pin's new
 * wording is in it. A caller that passes no additions admits none.
 */
export function keepsWorldModelsLengthCutObligations(
  path: string, prior: string, current: string, dropped: LengthCutDrops, pins: readonly LengthCutPin[],
  added: LengthCutDrops = NO_ADDITIONS,
): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  const priorHead = frontmatter(prior);
  const head = frontmatter(current);
  if (!priorHead || !head || !keepsFrontmatter(priorHead, head, added)) return false;
  const priorBody = prior.slice(priorHead.length);
  const body = current.slice(head.length);
  if (!KEPT.every((kept) => sameList(kept(priorBody), kept(body)))) return false;
  const live = new Set(anchors(body));
  if (!anchors(priorBody).every((anchor) => live.has(anchor))) return false;
  const listed = citationList(head);
  for (const key of Object.keys(COUNTED) as (keyof typeof COUNTED)[]) {
    const was = matchList(priorBody, COUNTED[key]);
    const now = matchList(body, COUNTED[key]);
    const recordedDrops = (dropped?.[key] ?? []).map(({ value }) => value).sort();
    const recordedAdds = (added?.[key] ?? []).map(({ value }) => value).sort();
    if (!sameList(minus(was, now), recordedDrops) || !sameList(minus(now, was), recordedAdds)) return false;
    if ([...(dropped?.[key] ?? []), ...(added?.[key] ?? [])]
      .some(({ claim }) => typeof claim !== 'string' || claim.length < 12)) return false;
    if ((key === 'links' || key === 'terms') && [...new Set(was)].some((value) => !now.includes(value))) return false;
    // An added glossary occurrence brings no new id and leaves the order of first use alone.
    if (key === 'terms' && recordedAdds.length > 0 && !sameList(firstUse(was), firstUse(now))) return false;
    if (key === 'citations' && recordedAdds.some((id) => !listed.includes(id))) return false;
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
    !keepsWorldModelsLengthCutObligations(path, rebuilt, current, source.dropped, source.pins ?? [],
      source.added ?? NO_ADDITIONS)) {
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
 * The citation ids a reviewed addition appended to the front-matter list of
 * the successor at `path`, in list order. Empty unless `live` is that
 * successor; the successor is verified against every obligation first.
 */
export function worldModelsLengthCutAppendedCitations(root: string, path: string, live: Buffer): readonly string[] {
  const pinned = successors.get(path);
  if (!pinned || live.length !== pinned[0] || digest(live) !== pinned[1]) return [];
  const head = (text: string) => text.slice(0, text.indexOf('\n---\n', 3) + 1);
  const before = citationList(head(rebuiltPrior(root, path, live).toString()));
  return citationList(head(live.toString())).slice(before.length);
}

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
