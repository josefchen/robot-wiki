import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { NO_SLOP_EXCEPTIONS } from '../../data/no-slop-exceptions.ts';
import {
  currentDataHardwareMotionArtifact, loadDataHardwareMotionReview,
} from '../../lib/audit-data-hardware-motion-continuity.ts';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { loadRlMotionContinuity } from '../../lib/audit-rl-motion-continuity.ts';
import { round6KinematicsReaderCheckerPredecessor } from '../../lib/audit-round6-kinematics-reader-continuity.ts';
import {
  round6ProseRestorePredecessor, round6ProseRestoresCheckerPredecessor,
} from '../../lib/audit-round6-prose-restores-continuity.ts';
import { STRUCTURAL_TELL_LIMIT, structuralTellReport } from '../../lib/no-slop.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round6-prose-restores-20260929/';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const continuityPath = 'audit/evidence/motion-rl-sim2real-20260927/continuity.json';
const dataHardwarePath = 'audit/evidence/motion-data-hardware-20260927/continuity.json';
const dataHardwarePriorPath = 'audit/evidence/motion-data-hardware-20260927/dependency-review-before.json';
const dependencyPath = 'audit/evidence/industrial-release-20260924/dependency-review.json';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type Bindings = { bindings: { current?: Artifact; preservedText?: string[] }[] };
type DataHardwareReview = {
  entries: { current: Artifact; requiredPresent: string[]; requiredAbsent: string[] }[];
};
const oldCoverage = 'The coverage figure describes item types; pick success and independently validated reliability remain unknown';
const newCoverage = 'The coverage figure describes item types; the post reports no pick-success rate or independently validated reliability';
const restores = [
  {
    slug: 'sim2real-transfer',
    path: 'content/rl-sim2real/sim2real-transfer.mdx',
    prior: 'rl-motion',
    name: 'robogsim-evaluation-scope',
    edits: [[
      'This evaluation uses simulated trials as well as real-robot testing, with different outcomes.',
      'This simulated evaluation cannot stand in for real-robot testing.',
    ]],
  },
  {
    slug: 'reward-design-mpc',
    path: 'content/rl-sim2real/reward-design-mpc.mdx',
    prior: 'rl-motion',
    name: 'eureka-detailed-results',
    edits: [
      ['15 of the 20 Dexterity tasks. Some were ties. The human baseline', '15 of the 20 Dexterity tasks. The human baseline'],
      ['the difficulty frontier measurable rather than guessed <Cite', 'the difficulty frontier measurable <Cite'],
    ],
  },
  {
    slug: 'industrial-deployment',
    path: 'content/data-hardware/industrial-deployment.mdx',
    prior: 'data-hardware',
    name: 'vulcan-coverage-scope',
    edits: [[
      `${oldCoverage} <Cite id="amazon-vulcan-2026" />.`,
      `${newCoverage} <Cite id="amazon-vulcan-2026" />.`,
    ]],
  },
] as const;
const reviewOf = (slug: string) => JSON.parse(read(`${directory}${slug}-transition.json`).toString()) as Review;
const endpointOf = (review: Review): Artifact =>
  ({ path: review.after.path, bytes: review.before.bytes, sha256: review.before.sha256 });
const citations = (text: string) => [...text.matchAll(/<Cite\s+id="([^"]+)"/g)].map((match) => match[1]);
const priorEndpoint = (prior: string, path: string, from = root) => prior === 'rl-motion'
  ? loadRlMotionContinuity(from).find((candidate) => candidate.article === path)!.current
  : loadDataHardwareMotionReview(from).entries.find((candidate) => candidate.current.path === path)!.current;

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round6-prose-restores-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

it.each(restores)('returns the archived $slug article exactly where its prior review still points', ({ slug, path, prior, name }) => {
  const review = reviewOf(slug);
  const live = read(review.after.path);
  const archived = read(review.before.path);
  expect(review.name).toBe(name);
  expect(review.before.path).toBe(`${directory}${slug}-before.mdx`);
  expect(review.after.path).toBe(path);
  expect({ bytes: live.length, sha256: digest(live) })
    .toEqual({ bytes: review.after.bytes, sha256: review.after.sha256 });
  expect({ bytes: archived.length, sha256: digest(archived) })
    .toEqual({ bytes: review.before.bytes, sha256: review.before.sha256 });
  const current = priorEndpoint(prior, path);
  expect(current).toEqual(endpointOf(review));
  expect(round6ProseRestorePredecessor(root, current, live)).toEqual(archived);
  expect(createLocalArtifactReader(root)(current)).toEqual(archived);
});

it('hands the data-hardware motion review the pre-restore article it still gates', () => {
  const review = loadDataHardwareMotionReview(root);
  const entry = review.entries[2];
  const live = read(entry.current.path);
  const preMotion = read(entry.snapshot.path);
  expect(() => currentDataHardwareMotionArtifact(root, 2, live)).toThrow(/endpoint identity drift/);
  expect(currentDataHardwareMotionArtifact(root, 2, round6ProseRestorePredecessor(root, entry.current, live)))
    .toEqual(preMotion);
});

it.each(restores)('changes only the named $name sentences', ({ slug, edits }) => {
  const review = reviewOf(slug);
  const before = read(review.before.path).toString();
  const after = read(review.after.path).toString();
  let expected = before;
  for (const [from, to] of edits) {
    expect(expected.split(from)).toHaveLength(2);
    expect(after.split(from)).toHaveLength(1);
    expected = expected.split(from).join(to);
  }
  expect(expected).toBe(after);
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  expect(afterLines).toHaveLength(beforeLines.length);
  expect(beforeLines.filter((line, index) => line !== afterLines[index])).toHaveLength(edits.length);
  expect(citations(after)).toEqual(citations(before));
});

it('keeps the Eureka restore under the structural-tell floor it would otherwise cross', () => {
  const review = reviewOf('reward-design-mpc');
  const before = read(review.before.path).toString();
  const after = read(review.after.path).toString();
  const [deletion] = restores[1].edits;
  const deletedOnly = structuralTellReport(before.split(deletion[0]).join(deletion[1]), NO_SLOP_EXCEPTIONS);
  expect(structuralTellReport(before, NO_SLOP_EXCEPTIONS).density).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
  expect(deletedOnly.density).toBeGreaterThan(STRUCTURAL_TELL_LIMIT);
  expect(structuralTellReport(after, NO_SLOP_EXCEPTIONS).notX).toBe(deletedOnly.notX - 1);
  expect(structuralTellReport(after, NO_SLOP_EXCEPTIONS).density).toBeLessThanOrEqual(STRUCTURAL_TELL_LIMIT);
});

it('keeps every phrase the RL motion and release reviews require on each live RL article', () => {
  const entries = loadRlMotionContinuity(root);
  const dependencies = JSON.parse(read(dependencyPath).toString()) as Bindings;
  for (const { slug, path } of restores.filter((restore) => restore.prior === 'rl-motion')) {
    const live = read(path).toString();
    const entry = entries.find((candidate) => candidate.article === path)!;
    const preserved = dependencies.bindings.filter((binding) => binding.current?.path === path)
      .flatMap((binding) => binding.preservedText ?? []);
    expect(preserved).toHaveLength(slug === 'sim2real-transfer' ? 1 : 0);
    for (const phrase of [...entry.requiredPresent, ...preserved]) expect(live).toContain(phrase);
  }
});

it('keeps the data-hardware review phrases on the live industrial article with one reviewed replacement', () => {
  const entry = loadDataHardwareMotionReview(root).entries[2];
  const live = read(entry.current.path).toString();
  expect(entry.requiredPresent.filter((phrase) => phrase === oldCoverage)).toHaveLength(1);
  for (const phrase of entry.requiredPresent.filter((candidate) => candidate !== oldCoverage)) {
    expect(live).toContain(phrase);
  }
  expect(live.split(newCoverage)).toHaveLength(2);
  expect(live).not.toContain(oldCoverage);
  expect(entry.requiredAbsent.length).toBeGreaterThan(0);
  for (const phrase of entry.requiredAbsent) expect(live).not.toContain(phrase);
  // The release review's preserved calculator text is matched against the
  // pre-motion snapshot the motion review returns, as it was before.
  const dependencies = JSON.parse(read(dependencyPath).toString()) as Bindings;
  const preserved = dependencies.bindings.filter((binding) => binding.current?.path === entry.current.path)
    .flatMap((binding) => binding.preservedText ?? []);
  expect(preserved.length).toBeGreaterThan(0);
  for (const phrase of preserved) expect(read(entry.snapshot.path).toString()).toContain(phrase);
});

it('passes every other reference and byte string through to the exact checks', () => {
  for (const { slug } of restores) {
    const review = reviewOf(slug);
    const live = read(review.after.path);
    const liveReference = { path: review.after.path, bytes: live.length, sha256: digest(live) };
    expect(round6ProseRestorePredecessor(root, liveReference, live)).toBe(live);
    const longer = Buffer.concat([live, Buffer.from('\n')]);
    expect(round6ProseRestorePredecessor(root, endpointOf(review), longer)).toBe(longer);
    const sameLength = Buffer.from(live.toString().replace('The ', 'the '));
    expect(sameLength.length).toBe(live.length);
    expect(round6ProseRestorePredecessor(root, endpointOf(review), sameLength)).toBe(sameLength);
    const otherPath = `${dirname(review.after.path)}/other.mdx`;
    expect(round6ProseRestorePredecessor(root, { ...endpointOf(review), path: otherPath }, live)).toBe(live);
  }
  const other = read('content/rl-sim2real/parallel-sim-rl.mdx');
  expect(round6ProseRestorePredecessor(root,
    { path: 'content/rl-sim2real/parallel-sim-rl.mdx', bytes: 1, sha256: '0'.repeat(64) }, other)).toBe(other);
});

const articleMutations = ['missing-review', 'missing-snapshot', 'corrupt-snapshot', 'wrong-schema', 'wrong-name',
  'wrong-before-hash', 'wrong-after-hash', 'future-observation', 'short-rationale', 'prior-endpoint',
  'prior-disclosure', 'release-disclosure', 'prior-absent', 'replaced-disclosure'] as const;
const dataHardwareOnly: readonly string[] = ['prior-absent', 'replaced-disclosure'];

it.each(restores.flatMap(({ slug, prior }) => articleMutations
  .filter((mutation) => slug === 'sim2real-transfer' || mutation !== 'release-disclosure')
  .filter((mutation) => prior === 'data-hardware' || !dataHardwareOnly.includes(mutation))
  .map((mutation) => [slug, mutation] as const)))('rejects a %s successor with %s', (slug, mutation) => {
  const reviewPath = `${directory}${slug}-transition.json`;
  const review = reviewOf(slug);
  const dataHardware = slug === 'industrial-deployment';
  const destination = copied(dataHardware
    ? [reviewPath, review.before.path, dataHardwarePath, dataHardwarePriorPath, dependencyPath]
    : [reviewPath, review.before.path, continuityPath, dependencyPath]);
  try {
    const live = read(review.after.path);
    expect(round6ProseRestorePredecessor(destination, endpointOf(review), live)).toEqual(read(review.before.path));
    if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
    if (mutation === 'missing-snapshot') rmSync(join(destination, review.before.path));
    if (mutation === 'corrupt-snapshot') writeFileSync(join(destination, review.before.path), 'corrupt');
    if (['wrong-schema', 'wrong-name', 'wrong-before-hash', 'wrong-after-hash', 'future-observation',
      'short-rationale'].includes(mutation)) {
      const changed = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8')) as Review;
      if (mutation === 'wrong-schema') changed.schemaVersion = 'round6-prose-restores-article-continuity-v0';
      if (mutation === 'wrong-name') changed.name = 'some-other-restore';
      if (mutation === 'wrong-before-hash') changed.before.sha256 = '0'.repeat(64);
      if (mutation === 'wrong-after-hash') changed.after.sha256 = '0'.repeat(64);
      if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
      if (mutation === 'short-rationale') changed.rationale = 'Exact restore.';
      writeFileSync(join(destination, reviewPath), JSON.stringify(changed));
    }
    if (dataHardware && ['prior-endpoint', 'prior-disclosure', 'prior-absent', 'replaced-disclosure'].includes(mutation)) {
      const continuity = JSON.parse(readFileSync(join(destination, dataHardwarePath), 'utf8')) as DataHardwareReview;
      const entry = continuity.entries.find((candidate) => candidate.current.path === review.after.path)!;
      if (mutation === 'prior-endpoint') entry.current.sha256 = '0'.repeat(64);
      if (mutation === 'prior-disclosure') entry.requiredPresent.push('A phrase the restored article does not carry.');
      if (mutation === 'prior-absent') entry.requiredAbsent.push('The coverage figure describes item types');
      if (mutation === 'replaced-disclosure') {
        entry.requiredPresent = entry.requiredPresent.filter((phrase) => phrase !== oldCoverage);
      }
      writeFileSync(join(destination, dataHardwarePath), JSON.stringify(continuity));
    }
    if (!dataHardware && (mutation === 'prior-endpoint' || mutation === 'prior-disclosure')) {
      const continuity = JSON.parse(readFileSync(join(destination, continuityPath), 'utf8')) as {
        entries: { article: string; current: Artifact; requiredPresent: string[] }[];
      };
      const entry = continuity.entries.find((candidate) => candidate.article === review.after.path)!;
      if (mutation === 'prior-endpoint') entry.current.sha256 = '0'.repeat(64);
      else entry.requiredPresent.push('A phrase the restored article does not carry.');
      writeFileSync(join(destination, continuityPath), JSON.stringify(continuity));
    }
    if (mutation === 'release-disclosure') {
      const dependencies = JSON.parse(readFileSync(join(destination, dependencyPath), 'utf8')) as Bindings;
      dependencies.bindings.find((binding) => binding.current?.path === review.after.path)!.preservedText!
        .push('A phrase the restored article does not carry.');
      writeFileSync(join(destination, dependencyPath), JSON.stringify(dependencies));
    }
    expect(() => round6ProseRestorePredecessor(destination, endpointOf(review), live))
      .toThrow(/round6 prose restores article continuity drift|ENOENT/);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});

it('admits only the exact prose-restores reader revision above the round6 kinematics head', () => {
  const live = read('lib/audit-local-basis.ts');
  const archived = read(`${directory}audit-local-basis-before.ts.txt`);
  expect(archived.length).toBe(113723);
  expect(digest(archived)).toBe('ab4e3d50ed3961a293d1e8b8a664d8e8de1f2f1e5cd93ee08785d5402a9465c6');
  const review = JSON.parse(read(`${directory}checker-transition.json`).toString()) as Review;
  expect(review.after).toEqual({ path: 'lib/audit-local-basis.ts', bytes: live.length, sha256: digest(live) });
  expect(round6ProseRestoresCheckerPredecessor(root, live)).toEqual(archived);
  expect(round6ProseRestoresCheckerPredecessor(root, archived)).toEqual(archived);
  const kinematicsArchived = read('audit/evidence/motion-round6-kinematics-reader-20260929/audit-local-basis-before.ts.txt');
  expect(round6ProseRestoresCheckerPredecessor(root, kinematicsArchived)).toEqual(kinematicsArchived);
  expect(round6KinematicsReaderCheckerPredecessor(root, live)).toEqual(kinematicsArchived);
  const hook = '  const current = round6ProseRestorePredecessor(root, ref, readBoundedLocalFile(root, ref.path));\n';
  const original = '  const current = readBoundedLocalFile(root, ref.path);\n';
  const importLine = "import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';\n";
  expect(live.toString().split(hook)).toHaveLength(2);
  expect(live.toString().split(importLine)).toHaveLength(2);
  expect(live.toString().replace(hook, original).replace(importLine, '')).toBe(archived.toString());
  for (const changed of [Buffer.concat([live, Buffer.from('\n')]), Buffer.from(live.toString().replace(hook, original))]) {
    expect(() => round6ProseRestoresCheckerPredecessor(root, changed)).toThrow(
      /round6 prose restores checker continuity drift/,
    );
  }
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'review-before-hash',
  'review-after-hash', 'wrong-name', 'wrong-schema', 'future-observation', 'short-rationale'] as const)(
  'rejects %s in the prose-restores checker transition', mutation => {
    const reviewPath = `${directory}checker-transition.json`;
    const predecessorPath = `${directory}audit-local-basis-before.ts.txt`;
    const destination = copied([reviewPath, predecessorPath]);
    try {
      const live = read('lib/audit-local-basis.ts');
      expect(round6ProseRestoresCheckerPredecessor(destination, live)).toEqual(read(predecessorPath));
      if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
      if (mutation === 'missing-predecessor') rmSync(join(destination, predecessorPath));
      if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, predecessorPath), 'corrupt');
      if (!mutation.startsWith('missing') && mutation !== 'corrupt-predecessor') {
        const changed = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8')) as Review;
        if (mutation === 'review-before-hash') changed.before.sha256 = '0'.repeat(64);
        if (mutation === 'review-after-hash') changed.after.sha256 = '0'.repeat(64);
        if (mutation === 'wrong-name') changed.name = 'some-other-revision';
        if (mutation === 'wrong-schema') changed.schemaVersion = 'round6-prose-restores-checker-revision-v0';
        if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
        if (mutation === 'short-rationale') changed.rationale = 'Exact hook.';
        writeFileSync(join(destination, reviewPath), JSON.stringify(changed));
      }
      expect(() => round6ProseRestoresCheckerPredecessor(destination, live))
        .toThrow(/round6 prose restores checker continuity drift|ENOENT/);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  },
);
