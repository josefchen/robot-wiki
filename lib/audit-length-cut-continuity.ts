/**
 * Exact successor review for the articles the owner-approved length cut of
 * 2026-10-12 shortened in the manipulation, classical and rl-sim2real domains
 * (Josef, 12 Oct 2026: "ensure we remove AI slop etc and keep it extremely
 * premium. not too long text."; the length decision in the humanize lane).
 * The three domain passes share this one record. Unlike the word-budget trim, this cut may drop recap
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
 * often.
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

export const LENGTH_CUT_CONTINUITY_DIR = 'audit/evidence/length-cut-20261012/';
const reviewFile = `${LENGTH_CUT_CONTINUITY_DIR}source-transition.json`;
const drift = 'length cut continuity drift';
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
  name: 'length-cut-20261012';
  reviewedBy: string;
  ownerApproval: string;
  rationale: string;
  observedAt: string;
  sources: LengthCutSource[];
};

// BEGIN length-cut pins (written by scripts/record-length-cut-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 1048348, sha256: '4b1c0cfea26923c570d0bee838df45e9b9e9fd72a16a37ffa3126af0e90f3eb4' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/classical/calibration.mdx', [8099, '8c2af6b65c09ecadf77fd80864823de848488c1e5e2719415e8243531e725a92']],
  ['content/classical/control.mdx', [16715, '10885711b49bf34aaa2cb5a97bd4c15658d82cb14cb610625b7e31cd1bdc9e57']],
  ['content/classical/grasp-planning.mdx', [12553, '4fdd27edd8d1346ff0c4886ada009b3eddec59bdc120b7eccdf98b8fe68c3f1a']],
  ['content/classical/kinematics.mdx', [10734, 'b83a9e6400a8f3a93e30d1dcb329b4eeaffcb6bc8ebbb1f695a96e726fc76856']],
  ['content/classical/motion-planning.mdx', [18264, 'd84e4d6f47107e3c3292427cabb1f377cec59f97ac4b04a5628ac296ad70ee71']],
  ['content/classical/perception.mdx', [21661, '626c83e23b525154b234668f6f019805f2f1f1cd0395b096a8b2197ed77571aa']],
  ['content/classical/ros2-for-ml-engineers.mdx', [8824, '576f048d435512d798017737b7380a126045353f21f812c2e52bc712cfce957a']],
  ['content/classical/scene-representation.mdx', [16251, '31724309557796eb11ee1512cf17aa2344791eec401f3630a7f7fb4747a94e75']],
  ['content/classical/state-estimation.mdx', [13869, '13c1151dcbd985d003f962b35d81696d39b73b5724747fabeb77032047e199fd']],
  ['content/manipulation/action-chunking.mdx', [10602, '2bd758433044f9e3c8c8c9471056b9d06911ccd0633ba1cb33051089f5942d9a']],
  ['content/manipulation/action-spaces.mdx', [9506, 'b024909320e11737d720cfb1b16559324d641f76e31af0d162898787ded5d1cc']],
  ['content/manipulation/bc-foundations.mdx', [12506, 'e33d1a20ed8cb7d6ba29650063b2e690ea9dbdaaaccd799696aff656f7fa7be9']],
  ['content/manipulation/comparison-matrix.mdx', [9245, '3acd9415130e88c4b80eeb4ad055ef9cc6be044ca0377ed9e53ca900a1e54153']],
  ['content/manipulation/cross-embodiment.mdx', [9663, '1ba71d527e08521870db79810f015190df72c28be1f51f30593b9c7d46e0ec93']],
  ['content/manipulation/diffusion-policy.mdx', [9559, '8ad96dcd6c5c09cca1006d3bf9dcf3d114fde389f08551107b4e148ce40a5f65']],
  ['content/manipulation/foundation-models.mdx', [10223, '382c7b90044932daaad0a68438c78b2a387ec5cf1c6de0b7b0ae7d83e07f0514']],
  ['content/manipulation/generalist-policies.mdx', [11195, '65017b77792f36b851d754b8d6c609466986169b574b789225d00d66fe7576bd']],
  ['content/manipulation/hierarchical.mdx', [11756, '9dba5d207735a0dcaee01289521ceeb1703ee5f9623235bdcf84fdadf485506d']],
  ['content/manipulation/knowledge-insulation.mdx', [8568, '5012e761a81069a2d06fcf44b6766730138f20420716de1bedd579ac1169835f']],
  ['content/manipulation/pi-line.mdx', [12833, '01baa480bef031aa44b8da0b6adf2d782571e5c359f60ddc701e6d365b024477']],
  ['content/manipulation/realtime-execution.mdx', [10498, 'a021c7515e4a295ea126e08c2870e72f774e421b0591c4d749ac8881a3b0e011']],
  ['content/manipulation/rl-finetuning.mdx', [18028, '74e5bdeed2af9e7ec93e87d93315a337badf003cec5c005c0a2e86fcfebae718']],
  ['content/manipulation/robot-learning-roadmap.mdx', [8803, 'a2ac5d083ef93fbc4c0930fc665af6c40de7d9450dc20f85895d54407a775089']],
  ['content/manipulation/vla-models.mdx', [12951, '63e2672a2cc7f81db14bdec9eaa9bdd7f50159669e38e47c1765ffdccbcb6720']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [12375, '260ffc53f857c5d4cd22846d8ffb51713da3a3c5fbdeb8ea5f61cc6de78387b4']],
  ['content/rl-sim2real/legged-locomotion.mdx', [11896, '614156aeae8659d6b5b8ae8f73a5b15687aacc27168efd58d99d8d3d18db7d04']],
  ['content/rl-sim2real/offline-rl.mdx', [10698, '61ecad239228138f25b5e4c5a250b68a8d81123fc42424f8ad8cb50a16e21cf5']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [9977, 'e27bb271f18f76a12e368c27bca2b687fce142bb784850ee20b65dd47bc56218']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [13817, '99d713cd7c97f53c1b9fd6ace3d288de3796354110035c7dbfb30ea38c745102']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [12108, '785251da7ffa9959af66d623489ca2ec2648a8b42b78497a332e92e71d52e6ef']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [15324, '957d5dd8ba8b9554b7fe4d53110859d0f2303bf6dfbf9953ae39516f495ca6b5']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [7813, '31d842b1f5b1175c5e1d1b4d7ecbe16a6265a2b4fed1eb0bdb91d2fbe24e013a']],
]);
// END length-cut pins

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
export function keepsLengthCutObligations(
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
export function verifyLengthCutSource(source: LengthCutSource, live: Buffer): Buffer {
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
    !keepsLengthCutObligations(path, rebuilt, current, source.dropped, source.pins ?? [],
      source.added ?? NO_ADDITIONS)) {
    throw new Error(drift);
  }
  return prior;
}

const reviewCache = new Map<string, LengthCutReview>();
const priorCache = new Map<string, Buffer>();

export function loadLengthCutReview(root: string): LengthCutReview {
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
    review?.schemaVersion !== 'length-cut-continuity-v1' || review.name !== 'length-cut-20261012' ||
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
    const source = loadLengthCutReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyLengthCutSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the length-cut review holds a successor for. */
export const lengthCutSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The citation ids a reviewed addition appended to the front-matter list of
 * the successor at `path`, in list order. Empty unless `live` is that
 * successor; the successor is verified against every obligation first.
 */
export function lengthCutAppendedCitations(root: string, path: string, live: Buffer): readonly string[] {
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
export function lengthCutPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
