/**
 * Finite historical compatibility for the shared-reader disclosure edit.
 * The six sim2real proofs keep the commit-to-reveal bytes they observed.
 * The live file is admitted only as one named exact replacement, and the
 * checker revision is the same kind of exact successor. No old review,
 * receipt, or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { round5PinnedLeftoversCheckerPredecessor } from './audit-round5-pinned-leftovers-continuity.ts';

const directory = 'audit/evidence/motion-shared-ui-local-basis-20260928/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'shared-ui commit-to-reveal continuity drift';
const checkerDrift = 'shared-ui local-basis continuity drift';

const sourceBefore = {
  path: `${directory}commit-to-reveal-before.tsx.txt`,
  bytes: 12571,
  sha256: '8642903b3584b2a79ecb27fefbf2cf8652dd86f4600eaa7a5ce6aa03224c4190',
};
const sourceAfter = {
  path: 'components/article/commit-to-reveal.tsx',
  bytes: 12895,
  sha256: 'cd89e02019c260f36f091bae34b1deeffebbfe5128025f7dbe3b99b43140f4d4',
};
const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 111975,
  sha256: 'c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c',
};
const checkerAfter = {
  path: 'lib/audit-local-basis.ts',
  bytes: 112303,
  sha256: '8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507',
};
const proofIds = [
  's23-observed-default',
  's23-observed-tail',
  's23-observed-wide',
  's24-observed-default',
  's24-observed-high',
  's24-observed-zero',
];

const sourceEdits: readonly (readonly [string, string])[] = [
  [
    "import { useId, useState, type ReactNode } from 'react';",
    "import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';",
  ],
  [
    [
      '  const uid = useId();',
      '  const groupName = `${uid}-choice`;',
      '  const [chosen, setChosen] = useState<string | null>(null);',
      '  const [open, setOpen] = useState(false);',
      '',
      '  const commit = (value: string) => {',
      '    setChosen(value);',
      '    setOpen(true);',
      '  };',
    ].join('\n'),
    [
      '  const uid = useId();',
      '  const groupName = `${uid}-choice`;',
      '  const detailsRef = useRef<HTMLDetailsElement>(null);',
      '  const [chosen, setChosen] = useState<string | null>(null);',
      '',
      '  const commit = (value: string) => {',
      '    setChosen(value);',
      "    // The disclosure stays uncontrolled. A controlled `open` prop plus",
      "    // onToggle lets the summary's close event win over this commit, so the",
      '    // radio checks while the reasoning stays shut.',
      '    if (detailsRef.current) detailsRef.current.open = true;',
      '  };',
      '',
      '  useLayoutEffect(() => {',
      '    if (chosen !== null && detailsRef.current) detailsRef.current.open = true;',
      '  }, [chosen]);',
    ].join('\n'),
  ],
  [
    [
      '      <details',
      '        data-reveal=""',
      '        open={open}',
      '        onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}',
      '        className="mt-3 bg-surface-2 p-3 text-sm"',
      '      >',
    ].join('\n'),
    [
      '      <details',
      '        ref={detailsRef}',
      '        data-reveal=""',
      '        className="mt-3 bg-surface-2 p-3 text-sm"',
      '      >',
    ].join('\n'),
  ],
];

const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedDomainPairSource } from './audit-motion-domain-pairs-continuity.ts';",
    "import { retainedDomainPairSource } from './audit-motion-domain-pairs-continuity.ts';\n" +
      "import { retainedCommitToRevealSource } from './audit-shared-ui-local-basis-continuity.ts';",
  ],
  [
    "    return retainedDomainPairSource(root, ref.path, current);\n  }\n" +
      "  if (ref.path === 'content/frontier/safety-and-assurance.mdx' &&",
    "    return retainedDomainPairSource(root, ref.path, current);\n  }\n" +
      "  if (ref.path === 'components/article/commit-to-reveal.tsx' &&\n" +
      "    ref.bytes === 12571 && ref.sha256 === '8642903b3584b2a79ecb27fefbf2cf8652dd86f4600eaa7a5ce6aa03224c4190') {\n" +
      '    return retainedCommitToRevealSource(root, current);\n' +
      '  }\n' +
      "  if (ref.path === 'content/frontier/safety-and-assurance.mdx' &&",
  ],
];

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string; proofIds?: string[];
};

function applyExact(before: string, edits: readonly (readonly [string, string])[], label: string): string {
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

/** Return the proof bytes only when the live file is the named disclosure edit. */
export function retainedCommitToRevealSource(root: string, live: Buffer): Buffer {
  const review = JSON.parse(readFileSync(join(root, `${directory}source-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, sourceBefore.path));
  const catalog = JSON.parse(readFileSync(join(root, 'audit/local-basis.json'), 'utf8')) as {
    proofs: { id: string; artifacts: { file: Artifact }[] }[];
  };
  const pinned = catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) =>
    file.path === sourceAfter.path && file.bytes === sourceBefore.bytes && file.sha256 === sourceBefore.sha256,
  )).map(({ id }) => id).sort();
  reviewed(review, 'shared-ui-commit-to-reveal-source-continuity-v1', sourceDrift);
  if (review.name !== 'uncontrolled-disclosure' ||
    review.before.path !== sourceBefore.path || review.before.bytes !== sourceBefore.bytes ||
    review.before.sha256 !== sourceBefore.sha256 ||
    review.after.path !== sourceAfter.path || review.after.bytes !== sourceAfter.bytes ||
    review.after.sha256 !== sourceAfter.sha256 ||
    JSON.stringify(review.proofIds) !== JSON.stringify(proofIds) ||
    JSON.stringify(pinned) !== JSON.stringify(proofIds) ||
    historical.length !== sourceBefore.bytes || digest(historical) !== sourceBefore.sha256 ||
    live.length !== sourceAfter.bytes || digest(live) !== sourceAfter.sha256 ||
    applyExact(historical.toString(), sourceEdits, sourceDrift) !== live.toString()) {
    throw new Error(sourceDrift);
  }
  return historical;
}

/**
 * Older checker bytes pass through. The current checker is admitted only as
 * the exact reader branch above the preserved article-truth predecessor.
 */
export function sharedUiCheckerPredecessor(root: string, live: Buffer): Buffer {
  const through = round5PinnedLeftoversCheckerPredecessor(root, live);
  const historicalHashes = new Set([
    checkerBefore.sha256,
    '7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6',
    '4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d',
  ]);
  if (historicalHashes.has(digest(through)) && (
    through.length === checkerBefore.bytes || through.length === 111934 || through.length === 111186
  )) return through;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'shared-ui-local-basis-checker-revision-v1', checkerDrift);
  if (review.name !== 'commit-to-reveal-reader' ||
    review.before.path !== checkerBefore.path || review.before.bytes !== checkerBefore.bytes ||
    review.before.sha256 !== checkerBefore.sha256 ||
    review.after.path !== checkerAfter.path || review.after.bytes !== checkerAfter.bytes ||
    review.after.sha256 !== checkerAfter.sha256 ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    through.length !== checkerAfter.bytes || digest(through) !== checkerAfter.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== through.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
