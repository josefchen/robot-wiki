/**
 * Exact successor review for the classical kinematics spec. Thirty-seven
 * classical-closure observed-behavior proofs pin it, as an artifact and as
 * their run's test, at the bytes their recorded 2026-09-23 browser run used.
 * The motion-language work later put the FK-chain scene, whose poster has its
 * own reset control, on the kinematics page, and a slider event sent after
 * React attaches fibers but before Next commits the initial route is lost.
 * The live spec names the lab's exact Reset control and waits for the
 * committed route before a slider is operated. Each proof keeps reading the archived
 * bytes its run used. The live file is admitted only as the named exact edit
 * list over that predecessor, and the checker revision is the same kind of
 * exact successor. No proof, run, receipt, capture or ledger cell is
 * rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { round6ProseRestoresCheckerPredecessor } from './audit-round6-prose-restores-continuity.ts';

const directory = 'audit/evidence/motion-round6-kinematics-reader-20260929/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'round6 kinematics reader source continuity drift';
const checkerDrift = 'round6 kinematics reader checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type SourceReview = Omit<Review, 'before' | 'after'> & {
  sources: { name: string; before: Artifact; after: Artifact; consumers: string[] }[];
};
type ProofIndex = {
  proofs: { id: string; artifacts: { file: Artifact }[]; provenance?: { test?: Artifact } }[];
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
    // Joined rather than String#replace: a `$'` in the spec text would be
    // read as a replacement pattern.
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

const specEdits: readonly (readonly [string, string])[] = [
  [
    "import { setSlider } from './slider';",
    [
      "import { setSlider } from './slider';",
      "import { waitForHydration } from './interaction-ready';",
    ].join('\n'),
  ],
  [
    "      Object.keys(el).some(k => k.startsWith('__reactFiber$'))));",
    [
      "      Object.keys(el).some(k => k.startsWith('__reactFiber$'))));",
      '    // A fiber can attach before Next commits the initial route, and a slider',
      '    // event dispatched in that window is lost.',
      '    await page.waitForFunction(() => history.state !== null);',
    ].join('\n'),
  ],
  [
    "    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();",
    "    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();",
  ],
  [
    "    const initialY = await eeValue(page, 'y');",
    [
      "    const initialY = await eeValue(page, 'y');",
      '    await waitForHydration(base);',
    ].join('\n'),
  ],
  [
    "    await page.getByRole('button', { name: /reset/i }).click();",
    "    await page.getByRole('button', { name: 'Reset', exact: true }).click();",
  ],
];

const perceptionStates = ['opening', 'near', 'far', 'zeroFar', 'zeroNear', 'specular', 'transparent', 'reset'];
const consumers = [
  ...['opening', 'step', 'playback', 'scrub', 'reset'].map((state) => `rrt15-observed-${state}`),
  ...[1, 2, 3, 7].flatMap((ordinal) => perceptionStates.map((state) => `p${ordinal}-observed-${state}`)),
];

const pin = {
  name: 'kinematics-spec-exact-reset-hydrated',
  path: 'tests/e2e/kinematics.spec.ts',
  snapshot: `${directory}kinematics-spec-before.ts.txt`,
  beforeBytes: 20967,
  beforeHash: '80dfdd9bf5871b7bf57af3aba585268367c06e0333a5ad496200a67d1d9cf286',
  afterBytes: 21269,
  afterHash: '9119b301459511dffd0708f878072974d7c49d21cdc79c95aab7f494ab31e12e',
} as const;

/** The derivations, readouts and slider bound the recorded observations rely on. */
const preserved = [
  "      const result = recomputeLocalDerivation({ id: 'rrt', mode: 'derive', inputs: { iteration } });",
  '      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(rrtReadouts[i])).toHaveText(display[i]);',
  "    await expect(page.getByTestId('rrt-iteration-readout')).toHaveAttribute('data-playback-cadence', 'smooth');",
  "      const result = recomputeLocalDerivation({ id: 'perception', mode: 'derive', inputs });",
  '      for (let i = 0; i < display.length; i++) await expect(page.getByTestId(perceptionReadouts[i])).toHaveText(display[i]);',
  "    await expect(page.getByTestId('perception-distance-slider')).toHaveAttribute('min', '0.15');",
  "    await expect(page.getByTestId('perception-budget')).not.toContainText('will jam');",
] as const;

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const pinned = (artifact: Artifact | undefined) => same(artifact, pin.path, pin.beforeBytes, pin.beforeHash);
const assertions = (source: string) => source.split('\n').filter((line) => line.includes('expect(')).length;

/** Proofs that pin the predecessor as an artifact, and as their run's test, in catalog order. */
function consumersOf(root: string, parsedInputCache?: Map<string, unknown>): { artifacts: string[]; tests: string[] } {
  // Fresh bytes and the root are compared before reusing only the pure parse.
  const catalogBytes = readFileSync(join(root, 'audit/local-basis.json'));
  const key = resolve(root);
  const cached = parsedInputCache?.get(key) as { bytes: Buffer; catalog: ProofIndex } | undefined;
  const unchanged = cached?.bytes.equals(catalogBytes) ?? false;
  const catalog: ProofIndex = unchanged ? cached!.catalog : JSON.parse(catalogBytes.toString()) as ProofIndex;
  if (!unchanged) parsedInputCache?.set(key, { bytes: catalogBytes, catalog });
  return {
    artifacts: catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) => pinned(file)))
      .map((proof) => proof.id),
    tests: catalog.proofs.filter((proof) => pinned(proof.provenance?.test)).map((proof) => proof.id),
  };
}

/** The exact predecessor the classical-closure proofs pin, as their recorded run used it. */
export function round6KinematicsReaderEndpoint(ref: Artifact): boolean {
  return pinned(ref);
}

/**
 * Verify the named successor of the pinned kinematics spec and return the
 * archived predecessor bytes the classical-closure proofs' run observed.
 */
export function retainedRound6KinematicsReaderSource(root: string, path: string, live: Buffer,
  parsedInputCache?: Map<string, unknown>): Buffer {
  if (path !== pin.path) throw new Error(sourceDrift);
  const review = JSON.parse(readFileSync(join(root, `${directory}source-transition.json`), 'utf8')) as SourceReview;
  reviewed(review, 'round6-kinematics-reader-source-continuity-v1', sourceDrift);
  const binding = review.sources?.find((source) => source.name === pin.name);
  const historical = readFileSync(join(root, pin.snapshot));
  const before = historical.toString();
  const current = live.toString();
  const bound = consumersOf(root, parsedInputCache);
  if (review.name !== 'retained-kinematics-reader' || review.sources?.length !== 1 ||
    !binding || !same(binding.before, pin.snapshot, pin.beforeBytes, pin.beforeHash) ||
    !same(binding.after, pin.path, pin.afterBytes, pin.afterHash) ||
    JSON.stringify(binding.consumers) !== JSON.stringify(consumers) ||
    JSON.stringify(bound.artifacts) !== JSON.stringify(consumers) ||
    JSON.stringify(bound.tests) !== JSON.stringify(consumers) ||
    historical.length !== pin.beforeBytes || digest(historical) !== pin.beforeHash ||
    live.length !== pin.afterBytes || digest(live) !== pin.afterHash ||
    applyExact(before, specEdits, sourceDrift) !== current ||
    assertions(before) !== assertions(current) ||
    preserved.some((text) => before.split(text).length !== 2 || current.split(text).length !== 2)) {
    throw new Error(sourceDrift);
  }
  return historical;
}

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 113447,
  sha256: '0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedRound5ReaderPinSource, round5ReaderPinEndpoint } from './audit-round5-reader-pins-continuity.ts';",
    "import { retainedRound5ReaderPinSource, round5ReaderPinEndpoint } from './audit-round5-reader-pins-continuity.ts';\n" +
      "import { retainedRound6KinematicsReaderSource, round6KinematicsReaderEndpoint } from './audit-round6-kinematics-reader-continuity.ts';",
  ],
  [
    '  if (round5ReaderPinEndpoint(ref)) {\n' +
      '    return retainedRound5ReaderPinSource(root, ref.path, current);\n' +
      '  }\n',
    '  if (round5ReaderPinEndpoint(ref)) {\n' +
      '    return retainedRound5ReaderPinSource(root, ref.path, current);\n' +
      '  }\n' +
      '  if (round6KinematicsReaderEndpoint(ref)) {\n' +
      '    return retainedRound6KinematicsReaderSource(root, ref.path, current, parsedInputCache);\n' +
      '  }\n',
  ],
];

/** The round5 reader-pins predecessor and every checker it passes through. */
const historicalCheckers = new Map([
  ['4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69', 113223],
  ['65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b', 112672],
  ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
  ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
  ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
  ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
]);

/**
 * Older checker bytes pass through. The kinematics reader revision above the
 * round5 reader-pins head is admitted exactly, as it reaches this level
 * through the round6 prose-restores reader revision.
 */
export function round6KinematicsReaderCheckerPredecessor(root: string, live: Buffer): Buffer {
  const through = round6ProseRestoresCheckerPredecessor(root, live);
  const liveHash = digest(through);
  if (liveHash === checkerBefore.sha256 && through.length === checkerBefore.bytes) return through;
  if (historicalCheckers.get(liveHash) === through.length) return through;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round6-kinematics-reader-checker-revision-v1', checkerDrift);
  if (review.name !== 'kinematics-reader-branch' ||
    !same(review.before, checkerBefore.path, checkerBefore.bytes, checkerBefore.sha256) ||
    review.after?.path !== 'lib/audit-local-basis.ts' ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    through.length !== review.after.bytes || liveHash !== review.after.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== through.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
