/**
 * Exact successor reviews for the four pinned first-screen mount moves of the
 * 2026-09-29 round. On parallel-sim-rl, legged-locomotion, kinematics and
 * motion-planning the first reader-operated lab now precedes its motion scene,
 * so it sits directly after the paragraph that tells the reader how to operate
 * it. Each move is one named exact block swap over the archived pre-move
 * article, and that archived article is exactly the endpoint the unchanged
 * prior review still gates: the RL motion continuity review, the classical
 * correction continuity review, or the industrial-release dependency review.
 * The live checker is admitted only as the exact reader revision reviewed
 * here. No old review, receipt, or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadClassicalCorrectionContinuity } from './audit-classical-continuity.ts';
import { loadRlMotionContinuity } from './audit-rl-motion-continuity.ts';
import { round5ReaderPinsCheckerPredecessor } from './audit-round5-reader-pins-continuity.ts';

const directory = 'audit/evidence/motion-round5-first-screen-cd-20260929/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const articleDrift = 'round5 first-screen cd article continuity drift';
const checkerDrift = 'round5 first-screen cd checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type ArticleReview = Omit<Review, 'before' | 'after'> & {
  sources: { name: string; before: Artifact; after: Artifact }[];
};

function applyExact(
  before: string,
  edits: readonly (readonly [string, string])[],
  label: string,
): string {
  let expected = before;
  for (const [from, to] of edits) {
    if (expected.split(from).length !== 2) throw new Error(label);
    expected = expected.replace(from, to);
  }
  return expected;
}

function reviewed(review: { schemaVersion: string; reviewedBy: string; rationale: string; observedAt: string },
  schemaVersion: string, label: string): void {
  if (review.schemaVersion !== schemaVersion || !review.reviewedBy || review.rationale.length <= 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(label);
  }
}

const swap = (first: string, second: string, separator: string) =>
  [`${first}${separator}${second}`, `${second}${separator}${first}`] as const;

const moves = [
  {
    name: 'training-time-chart-first',
    path: 'content/rl-sim2real/parallel-sim-rl.mdx',
    snapshot: `${directory}parallel-sim-rl-first-screen-before.mdx`,
    bytes: 13046,
    beforeHash: '7a252cd960fe74991fa071ad9aea9634f2fd397b58216950247de436f475eca7',
    afterHash: '37e4930effe0dcfdb8a9ad02c0f9dcfe4e32b124577f7c4e510ff3cb92e0f1f4',
    prior: 'rl-motion',
    edit: swap('<BatchScale className="my-6" />', '<TrainingTimeChart className="my-6" />', '\n\n'),
  },
  {
    name: 'gait-diagram-first',
    path: 'content/rl-sim2real/legged-locomotion.mdx',
    snapshot: `${directory}legged-locomotion-first-screen-before.mdx`,
    bytes: 15213,
    beforeHash: '1eb02d57d099db1c3fc3b61e3828ddc3e0a2591daed6ae047e031190f12d9703',
    afterHash: '515a7768bdc7e0882516a76110324c392f0a9a0b03bff2e8e92bd1436160cceb',
    prior: 'rl-motion',
    edit: swap('<GaitSupport className="my-6" />', '<GaitDiagram className="my-6" />', '\n\n'),
  },
  {
    name: 'planar-arm-first',
    path: 'content/classical/kinematics.mdx',
    snapshot: `${directory}kinematics-first-screen-before.mdx`,
    bytes: 11838,
    beforeHash: 'c7b826733e2b09b53441139ddb644a86608aa73a2e807a79c7a52f8f3100db58',
    afterHash: '0441641cea205541d216c4b6c2aefeb4bf5109561c4d8a3814b904215ee6837e',
    prior: 'classical-correction',
    edit: swap('<FkChain className="my-6" />', '<PlanarFkArm className="my-6" />', '\n'),
  },
  {
    name: 'rrt-explorer-first',
    path: 'content/classical/motion-planning.mdx',
    snapshot: `${directory}motion-planning-first-screen-before.mdx`,
    bytes: 24125,
    beforeHash: 'b94cf433b92a75b20bedb995572739f3bb4a915938b903a471eed4dc76d15465',
    afterHash: '45481dc51d0971859f0d002a2bfe6c7556d32d357501217f12dac0bec5323d2e',
    prior: 'release-dependency',
    edit: swap('<RrtGrowth className="my-6" />', '<RrtExplorer className="my-6" />', '\n'),
  },
] as const;

const citations = (source: string) =>
  [...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]);
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;

/** The pre-move endpoint each named move replaces, as its prior review records it. */
export function round5FirstScreenCdEndpoint(ref: Artifact): boolean {
  return moves.some((move) => same(ref, move.path, move.bytes, move.beforeHash));
}

/**
 * The prior review must still name the archived pre-move bytes as its current
 * endpoint, and the live article must still carry every phrase that review
 * requires (and none it withdrew).
 */
function priorDisclosures(root: string, move: typeof moves[number]): { present: string[]; absent: string[] } {
  if (move.prior === 'rl-motion') {
    const entry = loadRlMotionContinuity(root).find((candidate) => candidate.article === move.path);
    if (!entry || !same(entry.current, move.path, move.bytes, move.beforeHash)) throw new Error(articleDrift);
    return { present: entry.requiredPresent, absent: [] };
  }
  if (move.prior === 'classical-correction') {
    const entry = loadClassicalCorrectionContinuity(root).find((candidate) => candidate.article === move.path);
    if (!entry || !same(entry.current, move.path, move.bytes, move.beforeHash)) throw new Error(articleDrift);
    return { present: entry.requiredPresent, absent: entry.requiredAbsent };
  }
  const review = JSON.parse(readFileSync(join(root,
    'audit/evidence/industrial-release-20260924/dependency-review.json'), 'utf8')) as {
    bindings: { current: Artifact; preservedText?: string[] }[];
  };
  const bindings = review.bindings.filter((binding) => binding.current?.path === move.path);
  if (bindings.length !== 1 || !same(bindings[0].current, move.path, move.bytes, move.beforeHash) ||
    !bindings[0].preservedText?.length) {
    throw new Error(articleDrift);
  }
  return { present: bindings[0].preservedText, absent: [] };
}

/**
 * Verify the named first-screen mount move and return the archived pre-move
 * bytes, which the unchanged prior review continues to gate.
 */
export function retainedRound5FirstScreenCdArticle(root: string, path: string, live: Buffer): Buffer {
  const move = moves.find((candidate) => candidate.path === path);
  if (!move) throw new Error(articleDrift);
  const review = JSON.parse(readFileSync(join(root, `${directory}first-screen-transition.json`), 'utf8')) as ArticleReview;
  reviewed(review, 'round5-first-screen-cd-continuity-v1', articleDrift);
  const binding = review.sources?.find((source) => source.name === move.name);
  const historical = readFileSync(join(root, move.snapshot));
  const before = historical.toString();
  const current = live.toString();
  const disclosures = priorDisclosures(root, move);
  if (review.name !== 'pinned-first-screen-cd-moves' || review.sources?.length !== moves.length ||
    !binding || !same(binding.before, move.path, move.bytes, move.beforeHash) ||
    !same(binding.after, move.path, move.bytes, move.afterHash) ||
    historical.length !== move.bytes || digest(historical) !== move.beforeHash ||
    live.length !== move.bytes || digest(live) !== move.afterHash ||
    applyExact(before, [move.edit], articleDrift) !== current ||
    frontmatter(before) === undefined || frontmatter(before) !== frontmatter(current) ||
    JSON.stringify(citations(before)) !== JSON.stringify(citations(current)) ||
    disclosures.present.some((phrase) => !current.includes(phrase)) ||
    disclosures.absent.some((phrase) => current.includes(phrase))) {
    throw new Error(articleDrift);
  }
  return historical;
}

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 112672,
  sha256: '65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedFrictionTransferSource, retainedRound5FirstScreenArticle } from './audit-round5-pinned-leftovers-continuity.ts';",
    "import { retainedFrictionTransferSource, retainedRound5FirstScreenArticle } from './audit-round5-pinned-leftovers-continuity.ts';\n" +
      "import { retainedRound5FirstScreenCdArticle, round5FirstScreenCdEndpoint } from './audit-round5-first-screen-cd-continuity.ts';",
  ],
  [
    "  if (['content/rl-sim2real/parallel-sim-rl.mdx',",
    '  if (round5FirstScreenCdEndpoint(ref)) {\n' +
      '    return retainedRound5FirstScreenCdArticle(root, ref.path, current);\n' +
      '  }\n' +
      "  if (['content/rl-sim2real/parallel-sim-rl.mdx',",
  ],
  [
    "      expectedCurrent.sha256 === sha256(preMotion), 'stale data-bottleneck predecessor review');\n  } else {",
    "      expectedCurrent.sha256 === sha256(preMotion), 'stale data-bottleneck predecessor review');\n" +
      "  } else if (ref.path === 'content/classical/motion-planning.mdx') {\n" +
      '    const preMove = retainedRound5FirstScreenCdArticle(root, ref.path, current);\n' +
      '    requireThat(expectedCurrent.bytes === preMove.length &&\n' +
      "      expectedCurrent.sha256 === sha256(preMove), 'stale motion-planning predecessor review');\n" +
      '  } else {',
  ],
];

/**
 * Older checker bytes pass through. The current checker is admitted only as
 * the exact reader revision above the preserved round5 pinned-leftovers head.
 */
export function round5FirstScreenCdCheckerPredecessor(root: string, live: Buffer): Buffer {
  const through = round5ReaderPinsCheckerPredecessor(root, live);
  if (digest(through) === checkerBefore.sha256 && through.length === checkerBefore.bytes) return through;
  const historicalHashes = new Map([
    ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
    ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
    ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
    ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
  ]);
  if (historicalHashes.get(digest(through)) === through.length) return through;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round5-first-screen-cd-checker-revision-v1', checkerDrift);
  if (review.name !== 'first-screen-cd-readers' ||
    review.before.path !== checkerBefore.path || review.before.bytes !== checkerBefore.bytes ||
    review.before.sha256 !== checkerBefore.sha256 ||
    review.after.path !== 'lib/audit-local-basis.ts' ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    through.length !== review.after.bytes || digest(through) !== review.after.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== through.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
