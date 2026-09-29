/**
 * Exact successor reviews for the two pinned-leftover repairs of the
 * 2026-09-28 round. (1) FrictionTransfer gains a named width-regime mark so
 * its two mounts on sim2real-transfer describe distinct regimes after digit
 * normalisation, while the ten proofs that pin the predecessor bytes keep
 * reading them. (2) The data-bottleneck and evaluation-crisis first-screen
 * mount moves are admitted as one named exact replacement per article,
 * chained on the unchanged data-hardware motion continuity review, which
 * still gates the prior endpoint and its disclosure inventory. The live
 * checker is admitted only as the exact reader revision reviewed here. No
 * old review, receipt, or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { currentDataHardwareMotionArtifact, loadDataHardwareMotionReview } from './audit-data-hardware-motion-continuity.ts';
import { round5FirstScreenCdCheckerPredecessor } from './audit-round5-first-screen-cd-continuity.ts';

const directory = 'audit/evidence/motion-round5-pinned-leftovers-20260928/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const frictionDrift = 'round5 friction-transfer source continuity drift';
const firstScreenDrift = 'round5 first-screen article continuity drift';
const checkerDrift = 'round5 local-basis checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string; proofIds?: string[];
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

function reviewed(review: Review, schemaVersion: string, label: string): void {
  if (review.schemaVersion !== schemaVersion || !review.reviewedBy || review.rationale.length <= 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(label);
  }
}

const frictionBefore = {
  path: `${directory}friction-transfer-before.tsx.txt`,
  bytes: 15549,
  sha256: 'af16eda88835169e720e7e6a8bb79c3ede65cba005635825a0b27f9aec7d8da9',
};
const frictionAfter = {
  path: 'components/interactive/friction-transfer.tsx',
  bytes: 15835,
  sha256: '45e15e842760f8109e19cd9cded9b066557fc235c0a4ebb51488590b9a2dee44',
};
const frictionProofIds = [
  's23-default',
  's23-observed-default',
  's23-observed-tail',
  's23-observed-wide',
  's23-parameters',
  's23-tail',
  's23-wide',
  's24-observed-default',
  's24-observed-high',
  's24-observed-zero',
];
const frictionEdits: readonly (readonly [string, string])[] = [
  [
    '  }, [realMu, range]);\n\n  const descriptionText =',
    '  }, [realMu, range]);\n\n' +
      '  // Named width regime so two mounts on one route describe distinct regimes\n' +
      '  // even after digit normalisation (mirrors the latency `marked ${status}`).\n' +
      "  const widthMark = range >= 0.5 ? 'wide' : 'ordinary';\n" +
      '\n  const descriptionText =',
  ],
  [
    'Dashed edges mark an assumed range, not a confidence interval. Reset restores this panel',
    'Dashed edges mark an assumed range, not a confidence interval. The randomization band is marked ${widthMark} at the selected half-width. Reset restores this panel',
  ],
];

/** Return the pinned predecessor bytes only for the named width-regime mark. */
export function retainedFrictionTransferSource(root: string, live: Buffer): Buffer {
  const review = JSON.parse(readFileSync(join(root, `${directory}friction-source-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, frictionBefore.path));
  const catalog = JSON.parse(readFileSync(join(root, 'audit/local-basis.json'), 'utf8')) as {
    proofs: { id: string; artifacts: { file: Artifact }[] }[];
  };
  const pinned = catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) =>
    file.path === frictionAfter.path && file.bytes === frictionBefore.bytes && file.sha256 === frictionBefore.sha256,
  )).map(({ id }) => id).sort();
  reviewed(review, 'round5-friction-transfer-source-continuity-v1', frictionDrift);
  if (review.name !== 'width-regime-mark' ||
    review.before.path !== frictionBefore.path || review.before.bytes !== frictionBefore.bytes ||
    review.before.sha256 !== frictionBefore.sha256 ||
    review.after.path !== frictionAfter.path || review.after.bytes !== frictionAfter.bytes ||
    review.after.sha256 !== frictionAfter.sha256 ||
    JSON.stringify(review.proofIds) !== JSON.stringify(frictionProofIds) ||
    JSON.stringify(pinned) !== JSON.stringify(frictionProofIds) ||
    historical.length !== frictionBefore.bytes || digest(historical) !== frictionBefore.sha256 ||
    live.length !== frictionAfter.bytes || digest(live) !== frictionAfter.sha256 ||
    applyExact(historical.toString(), frictionEdits, frictionDrift) !== live.toString()) {
    throw new Error(frictionDrift);
  }
  return historical;
}

const firstScreen = [
  {
    name: 'data-scale-chart-first',
    index: 0,
    path: 'content/data-hardware/data-bottleneck.mdx',
    snapshot: `${directory}data-bottleneck-first-screen-before.mdx`,
    beforeBytes: 12009,
    beforeHash: 'c87047808f50813c39b006870e3d66127dedcd65bb660f37a5908911be30ff6d',
    afterHash: '9720088a7610a92ee62ad2fbd148b95618d27ba098832a6946185031d373285c',
    edit: ['<FarmThroughput className="my-6" />\n\n<DataScaleChart className="my-6" />',
      '<DataScaleChart className="my-6" />\n\n<FarmThroughput className="my-6" />'] as const,
  },
  {
    name: 'reliability-calculator-first',
    index: 1,
    path: 'content/data-hardware/evaluation-crisis.mdx',
    snapshot: `${directory}evaluation-crisis-first-screen-before.mdx`,
    beforeBytes: 17487,
    beforeHash: 'de0c03cf91532b2145f60f3ecab1ebe23a02cfd75b484432ff93f2261b2df9d4',
    afterHash: '193a4eda0bcaf6ff1da6b3e34b60acbfd810a20d99593ab4e23155466fa335de',
    edit: ['<EpisodeSurvival className="my-6" />\n\n<ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} descriptionVariant="evaluation" className="my-6" />',
      '<ReliabilityCompounding minPerStepPercent={0} maxPerStepPercent={100} descriptionVariant="evaluation" className="my-6" />\n\n<EpisodeSurvival className="my-6" />'] as const,
  },
] as const;
const citations = (source: string) =>
  [...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]).sort();
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];

/**
 * Verify the named first-screen mount move and return the pre-motion
 * archived bytes historical proofs still expect. The unchanged data-hardware
 * motion review continues to gate the prior endpoint, its snapshot, its
 * disclosure inventory and its citations before this successor applies.
 */
export function retainedRound5FirstScreenArticle(root: string, index: 0 | 1, live: Buffer): Buffer {
  const spec = firstScreen[index];
  const review = JSON.parse(readFileSync(join(root, `${directory}first-screen-transition.json`), 'utf8')) as
    Review & { sources: { name: string; before: Artifact; after: Artifact }[] };
  const binding = review.sources?.find((source) => source.name === spec.name);
  const historical = readFileSync(join(root, spec.snapshot));
  const prior = currentDataHardwareMotionArtifact(root, spec.index, historical);
  reviewed(review, 'round5-first-screen-continuity-v1', firstScreenDrift);
  const entry = loadDataHardwareMotionReview(root).entries[spec.index];
  if (review.name !== 'pinned-leftover-first-screen-moves' || !binding || review.sources?.length !== 2 ||
    binding.before.path !== spec.path || binding.before.bytes !== spec.beforeBytes ||
    binding.before.sha256 !== spec.beforeHash ||
    binding.after.path !== spec.path || binding.after.bytes !== spec.beforeBytes ||
    binding.after.sha256 !== spec.afterHash ||
    historical.length !== spec.beforeBytes || digest(historical) !== spec.beforeHash ||
    live.length !== spec.beforeBytes || digest(live) !== spec.afterHash ||
    applyExact(historical.toString(), [spec.edit], firstScreenDrift) !== live.toString() ||
    frontmatter(historical.toString()) !== frontmatter(live.toString()) ||
    JSON.stringify(citations(historical.toString())) !== JSON.stringify(citations(live.toString())) ||
    entry.requiredPresent.some((phrase) => !live.toString().includes(phrase)) ||
    entry.requiredAbsent.some((phrase) => live.toString().includes(phrase))) {
    throw new Error(firstScreenDrift);
  }
  return prior;
}

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 112303,
  sha256: '8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedCommitToRevealSource } from './audit-shared-ui-local-basis-continuity.ts';",
    "import { retainedCommitToRevealSource } from './audit-shared-ui-local-basis-continuity.ts';\n" +
      "import { retainedFrictionTransferSource, retainedRound5FirstScreenArticle } from './audit-round5-pinned-leftovers-continuity.ts';",
  ],
  [
    "    ref.bytes === 17843 && ref.sha256 === '4da47ae4cf73f7fe15f1c0347b5df7174e98680a2bc3e97525169e293c017ec8')) {\n    return retainedDomainPairSource(root, ref.path, current);\n  }\n",
    "    ref.bytes === 17843 && ref.sha256 === '4da47ae4cf73f7fe15f1c0347b5df7174e98680a2bc3e97525169e293c017ec8')) {\n    return retainedDomainPairSource(root, ref.path, current);\n  }\n" +
      "  if (ref.path === 'components/interactive/friction-transfer.tsx' &&\n" +
      "    ref.bytes === 15549 && ref.sha256 === 'af16eda88835169e720e7e6a8bb79c3ede65cba005635825a0b27f9aec7d8da9') {\n" +
      '    return retainedFrictionTransferSource(root, current);\n' +
      '  }\n',
  ],
  [
    '    return currentDataHardwareMotionArtifact(root, 1, current);',
    '    return retainedRound5FirstScreenArticle(root, 1, current);',
  ],
  [
    '    return currentDataHardwareMotionArtifact(root, 0, current);',
    '    return retainedRound5FirstScreenArticle(root, 0, current);',
  ],
  [
    '    const preMotion = currentDataHardwareMotionArtifact(root, 0, current);',
    '    const preMotion = retainedRound5FirstScreenArticle(root, 0, current);',
  ],
  [
    '      ? currentDataHardwareMotionArtifact(root, 0, current).toString()',
    '      ? retainedRound5FirstScreenArticle(root, 0, current).toString()',
  ],
];

/**
 * Older checker bytes pass through. The current checker is admitted only as
 * the exact reader revision above the preserved shared-ui predecessor.
 */
export function round5PinnedLeftoversCheckerPredecessor(root: string, live: Buffer): Buffer {
  const through = round5FirstScreenCdCheckerPredecessor(root, live);
  if (digest(through) === checkerBefore.sha256 && through.length === checkerBefore.bytes) return through;
  const historicalHashes = new Map([
    ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
    ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
    ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
  ]);
  if (historicalHashes.get(digest(through)) === through.length) return through;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round5-local-basis-checker-revision-v1', checkerDrift);
  if (review.name !== 'friction-and-first-screen-readers' ||
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
