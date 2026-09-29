/**
 * Exact successor reviews for the round-6 prose restores of 2026-09-29. An
 * earlier prose pass changed what audited sentences on each of these pinned
 * articles claim, and each restore returns those sentences to their audited
 * source meaning. Every restore is a named exact edit list over the archived
 * pre-restore article, and that archived article is exactly the endpoint the
 * unchanged prior review still gates. The artifact reader admits the live
 * article only as that exact successor, after checking it against the phrases
 * the prior review requires present and absent, and hands every later check
 * the archived bytes. The live checker is admitted only as the exact reader
 * revision reviewed here. No old review, receipt, or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDataHardwareMotionReview } from './audit-data-hardware-motion-continuity.ts';
import { loadRlMotionContinuity } from './audit-rl-motion-continuity.ts';
import { retainedRound5FirstScreenCdArticle } from './audit-round5-first-screen-cd-continuity.ts';
import { round6RemainingRepairsCheckerPredecessor } from './audit-round6-remaining-repairs-continuity.ts';

const directory = 'audit/evidence/motion-round6-prose-restores-20260929/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const articleDrift = 'round6 prose restores article continuity drift';
const checkerDrift = 'round6 prose restores checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type Restore = {
  name: string;
  path: string;
  snapshot: string;
  review: string;
  beforeBytes: number;
  beforeHash: string;
  afterBytes: number;
  afterHash: string;
  prior: 'rl-motion' | 'data-hardware' | 'first-screen-cd';
  edits: readonly (readonly [string, string])[];
  /** Prior-review phrases the restore itself rewrites, each with its replacement. */
  replacedDisclosures?: readonly (readonly [string, string])[];
};

function applyExact(
  before: string,
  edits: readonly (readonly [string, string])[],
  label: string,
): string {
  let expected = before;
  for (const [from, to] of edits) {
    const parts = expected.split(from);
    if (parts.length !== 2) throw new Error(label);
    // Joined rather than String#replace: a `$'` in the text would be read as
    // a replacement pattern.
    expected = parts.join(to);
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

const restores: readonly Restore[] = [
  {
    name: 'robogsim-evaluation-scope',
    path: 'content/rl-sim2real/sim2real-transfer.mdx',
    snapshot: `${directory}sim2real-transfer-before.mdx`,
    review: `${directory}sim2real-transfer-transition.json`,
    beforeBytes: 21813,
    beforeHash: '95b7637c9af2f670dcc3a92632e0712d1438a17d08f268a3ecffe1338736898d',
    afterBytes: 21785,
    afterHash: '41ee8c98aa44551dfd2c747223fb9a4e4f8a688c634bd856a49da275df07813c',
    prior: 'rl-motion',
    edits: [[
      'This evaluation uses simulated trials as well as real-robot testing, with different outcomes.',
      'This simulated evaluation cannot stand in for real-robot testing.',
    ]],
  },
  {
    name: 'eureka-detailed-results',
    path: 'content/rl-sim2real/reward-design-mpc.mdx',
    snapshot: `${directory}reward-design-mpc-before.mdx`,
    review: `${directory}reward-design-mpc-transition.json`,
    beforeBytes: 20073,
    beforeHash: 'f5df1d861c9f42b628fa2073a66f9114b887aa0b84c284aaae85739a13b90261',
    afterBytes: 20037,
    afterHash: 'dbfaee9f08f18608e2853f2c6572bcb42fc13d3cb2e4f62e9add3f4452cafd13',
    prior: 'rl-motion',
    // The three-word deletion alone lifts the article just above the
    // 2-per-1,000-word structural-tell floor, so the curriculum sentence
    // states its sourced claim without the contrast.
    edits: [
      [
        '15 of the 20 Dexterity tasks. Some were ties. The human baseline',
        '15 of the 20 Dexterity tasks. The human baseline',
      ],
      [
        'make the difficulty frontier measurable rather than guessed <Cite id="rudin-2021" />.',
        'make the difficulty frontier measurable <Cite id="rudin-2021" />.',
      ],
    ],
  },
  {
    name: 'vulcan-coverage-scope',
    path: 'content/data-hardware/industrial-deployment.mdx',
    snapshot: `${directory}industrial-deployment-before.mdx`,
    review: `${directory}industrial-deployment-transition.json`,
    beforeBytes: 19645,
    beforeHash: '945af0fafede79706cccb8c644d118051e5de7015c8ce290d170ac4126f33457',
    afterBytes: 19654,
    afterHash: '5360b9b7ffb541b73f4abf67e0a664a22327eba7fce29d4696c4d795d28c1550',
    prior: 'data-hardware',
    edits: [[
      'The coverage figure describes item types; pick success and independently validated reliability remain unknown <Cite id="amazon-vulcan-2026" />.',
      'The coverage figure describes item types; the post reports no pick-success rate or independently validated reliability <Cite id="amazon-vulcan-2026" />.',
    ]],
    replacedDisclosures: [[
      'The coverage figure describes item types; pick success and independently validated reliability remain unknown',
      'The coverage figure describes item types; the post reports no pick-success rate or independently validated reliability',
    ]],
  },
  {
    name: 'motion-planning-plain-qualifications',
    path: 'content/classical/motion-planning.mdx',
    snapshot: `${directory}motion-planning-before.mdx`,
    review: `${directory}motion-planning-transition.json`,
    beforeBytes: 24125,
    beforeHash: '45481dc51d0971859f0d002a2bfe6c7556d32d357501217f12dac0bec5323d2e',
    afterBytes: 24327,
    afterHash: '2bef2a93acfbaef49fd1db39b51c317a877b0d9607f1517584a1996259b238ce',
    prior: 'first-screen-cd',
    // The pre-rewrite wording of these qualifications carried not-X
    // contrasts and section locators that put the article over the
    // 2-per-1,000-word structural-tell floor, so each scope returns as a
    // plain statement of the same audited limit.
    edits: [
      [
        'Constructing the collision-constrained space is difficult.',
        'Constructing the collision-constrained space is difficult, but it does not become impossible beyond a fixed number of dimensions.',
      ],
      [
        'The report leaves convergence-rate analysis open, and the book distinguishes exploring free space from solving a start-goal query',
        'These properties do not guarantee fast coverage on every problem: the report leaves convergence-rate analysis open, and the book distinguishes exploring free space from solving a start-goal query',
      ],
      [
        'Those experiments found faster refinement than RRT\\* in that setup; when the informed set covers the planning domain,',
        'Those experiments found faster refinement than RRT\\* in that setup. They do not establish a universal speedup, and when the informed set covers the planning domain,',
      ],
      [
        'The Sample routine describes each sampled state as admitting an improving path, a stronger claim than the admissible-superset construction in the paper\'s algorithm.',
        'The paper\'s description of its Sample routine says every sampled state admits an improving path, a stronger claim than the admissible-superset construction in its algorithm supports.',
      ],
    ],
  },
];

const citations = (source: string) =>
  [...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]);
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;

function releasePreservedText(root: string, path: string): string[] {
  const dependencies = JSON.parse(readFileSync(join(root,
    'audit/evidence/industrial-release-20260924/dependency-review.json'), 'utf8')) as {
    bindings: { current?: Artifact; preservedText?: string[] }[];
  };
  return dependencies.bindings.filter((binding) => binding.current?.path === path)
    .flatMap((binding) => binding.preservedText ?? []);
}

/**
 * The prior review must still name the archived pre-restore bytes as its
 * current endpoint. The live article must still carry every phrase that
 * review and the industrial-release dependency review require of the page,
 * except that a phrase the restore itself rewrites is replaced by its named
 * successor, and it must omit every phrase the prior review requires absent.
 */
function priorDisclosures(root: string, restore: Restore): { present: string[]; absent: string[] } {
  let required: string[];
  let absent: string[] = [];
  if (restore.prior === 'rl-motion') {
    const entry = loadRlMotionContinuity(root).find((candidate) => candidate.article === restore.path);
    if (!entry || !same(entry.current, restore.path, restore.beforeBytes, restore.beforeHash)) {
      throw new Error(articleDrift);
    }
    required = [...entry.requiredPresent, ...releasePreservedText(root, restore.path)];
  } else if (restore.prior === 'first-screen-cd') {
    // The round-5 move review records the archived bytes as its after
    // endpoint, and its own reader still verifies them against the pre-move
    // snapshot the release dependency review gates.
    const moves = JSON.parse(readFileSync(join(root,
      'audit/evidence/motion-round5-first-screen-cd-20260929/first-screen-transition.json'), 'utf8')) as {
      sources?: { after?: Artifact }[];
    };
    const move = moves.sources?.filter((source) => source.after?.path === restore.path) ?? [];
    const archived = readFileSync(join(root, restore.snapshot));
    if (move.length !== 1 || !same(move[0].after, restore.path, restore.beforeBytes, restore.beforeHash) ||
      archived.length !== restore.beforeBytes || digest(archived) !== restore.beforeHash) {
      throw new Error(articleDrift);
    }
    retainedRound5FirstScreenCdArticle(root, restore.path, archived);
    required = releasePreservedText(root, restore.path);
    if (required.length === 0) throw new Error(articleDrift);
  } else {
    // The dependency review's preserved text for this article is matched by
    // the reader against the pre-motion snapshot, never the live article.
    const entry = loadDataHardwareMotionReview(root).entries
      .find((candidate) => candidate.current.path === restore.path);
    if (!entry || !same(entry.current, restore.path, restore.beforeBytes, restore.beforeHash)) {
      throw new Error(articleDrift);
    }
    required = entry.requiredPresent;
    absent = entry.requiredAbsent;
  }
  const replaced = restore.replacedDisclosures ?? [];
  if (replaced.some(([from]) => required.filter((phrase) => phrase === from).length !== 1)) {
    throw new Error(articleDrift);
  }
  return {
    present: required.map((phrase) => replaced.find(([from]) => from === phrase)?.[1] ?? phrase),
    absent: [...absent, ...replaced.map(([from]) => from)],
  };
}

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no named restore, and any bytes other than the
 * reviewed restore come back unchanged, so those checks still decide them.
 * The reviewed restore is verified as the exact edit list over the archived
 * pre-restore article, which is returned.
 */
export function round6ProseRestorePredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const restore = restores.find((candidate) => candidate.path === ref.path);
  if (!restore || live.length !== restore.afterBytes) return live;
  const liveHash = digest(live);
  if (liveHash !== restore.afterHash || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const review = JSON.parse(readFileSync(join(root, restore.review), 'utf8')) as Review;
  reviewed(review, 'round6-prose-restores-article-continuity-v1', articleDrift);
  const historical = readFileSync(join(root, restore.snapshot));
  const before = historical.toString();
  const current = live.toString();
  const disclosures = priorDisclosures(root, restore);
  if (review.name !== restore.name ||
    !same(review.before, restore.snapshot, restore.beforeBytes, restore.beforeHash) ||
    !same(review.after, restore.path, restore.afterBytes, restore.afterHash) ||
    historical.length !== restore.beforeBytes || digest(historical) !== restore.beforeHash ||
    applyExact(before, restore.edits, articleDrift) !== current ||
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
  bytes: 113723,
  sha256: 'ab4e3d50ed3961a293d1e8b8a664d8e8de1f2f1e5cd93ee08785d5402a9465c6',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedRound6KinematicsReaderSource, round6KinematicsReaderEndpoint } from './audit-round6-kinematics-reader-continuity.ts';",
    "import { retainedRound6KinematicsReaderSource, round6KinematicsReaderEndpoint } from './audit-round6-kinematics-reader-continuity.ts';\n" +
      "import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';",
  ],
  [
    '  const current = readBoundedLocalFile(root, ref.path);\n' +
      '  const readContinuity = () => readKrogerContinuity(root, parsedInputCache);\n',
    '  const current = round6ProseRestorePredecessor(root, ref, readBoundedLocalFile(root, ref.path));\n' +
      '  const readContinuity = () => readKrogerContinuity(root, parsedInputCache);\n',
  ],
];

/** The round6 kinematics predecessor and every checker it passes through. */
const historicalCheckers = new Map([
  ['0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756', 113447],
  ['4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69', 113223],
  ['65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b', 112672],
  ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
  ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
  ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
  ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
]);

/**
 * Older checker bytes pass through. The prose-restore reader revision above
 * the round6 kinematics head is admitted exactly, as it reaches this level
 * through the round6 remaining-repairs reader revision.
 */
export function round6ProseRestoresCheckerPredecessor(root: string, live: Buffer): Buffer {
  const through = round6RemainingRepairsCheckerPredecessor(root, live);
  const liveHash = digest(through);
  if (liveHash === checkerBefore.sha256 && through.length === checkerBefore.bytes) return through;
  if (historicalCheckers.get(liveHash) === through.length) return through;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round6-prose-restores-checker-revision-v1', checkerDrift);
  if (review.name !== 'prose-restores-reader' ||
    !same(review.before, checkerBefore.path, checkerBefore.bytes, checkerBefore.sha256) ||
    review.after?.path !== 'lib/audit-local-basis.ts' ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    through.length !== review.after.bytes || liveHash !== review.after.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== through.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
