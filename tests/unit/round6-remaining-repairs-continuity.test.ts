import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import matter from 'gray-matter';
import { expect, it } from 'vitest';
import {
  currentDataHardwareMotionArtifact, loadDataHardwareMotionReview,
} from '../../lib/audit-data-hardware-motion-continuity.ts';
import { createLocalArtifactReader } from '../../lib/audit-local-basis.ts';
import { round6ProseRestoresCheckerPredecessor } from '../../lib/audit-round6-prose-restores-continuity.ts';
import {
  round6RemainingRepairPredecessor, round6RemainingRepairsCheckerPredecessor,
} from '../../lib/audit-round6-remaining-repairs-continuity.ts';
// The 2026-10-01 figure migration later edited the three repaired specs; its
// reviewed successor returns the bytes this review names.
import { carriesThroughFigureMigration, preFigureMigration } from '../helpers/figure-migration';

const root = resolve(import.meta.dirname, '../..');
const directory = 'audit/evidence/motion-round6-remaining-repairs-20260929/';
const reviewPath = `${directory}source-transition.json`;
const checkerReviewPath = `${directory}checker-transition.json`;
const checkerArchivePath = `${directory}audit-local-basis-before.ts.txt`;
const suiteArchivePath = `${directory}classical-closure-evidence-before.test.ts.txt`;
const readerPinsPath = 'audit/evidence/motion-round5-reader-pins-20260929/source-transition.json';
const economicsRunPath = 'audit/evidence/economics-release-20260923/browser-run.json';
const dataHardwarePath = 'audit/evidence/motion-data-hardware-20260927/continuity.json';
const dataHardwarePriorPath = 'audit/evidence/motion-data-hardware-20260927/dependency-review-before.json';
const dependencyPath = 'audit/evidence/industrial-release-20260924/dependency-review.json';
const read = (path: string) => readFileSync(resolve(root, path));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const assertions = (text: string) => text.split('\n').filter((line) => line.includes('expect(')).length;
const testHashLine = (sha256: string) => `    currentTestHash: '${sha256}',\n`;

type Artifact = { path: string; bytes: number; sha256: string };
type Source = { name: string; before: Artifact; after: Artifact };
type SourceReview = {
  schemaVersion: string; name: string; reviewedBy: string; rationale: string; observedAt: string;
  sources: Source[];
};
type CheckerReview = Omit<SourceReview, 'sources'> & { before: Artifact; after: Artifact };
type Bindings = { bindings: { current?: Artifact; preservedText?: string[] }[] };
type DataHardwareReview = {
  entries: { current: Artifact; requiredPresent: string[]; requiredAbsent: string[] }[];
};

const refreshWording = [
  ["    await expect(page.locator('#main-content')).toContainText('not a measured intervention rate');",
    "    await expect(page.locator('#main-content')).toContainText('no measured intervention rate behind it');"],
  ["    checkedText.push('not a measured intervention rate', 'no published success rate');",
    "    checkedText.push('no measured intervention rate behind it', 'no published success rate');"],
] as const;
const economicsFrame = [
  ["  const mount = page.locator('div.prose > div.rounded-md:has([data-testid=\"payback-months\"])');",
    "  const mount = page.locator('div.prose > [data-brand-module-signature=\"instrument-frame\"]:has([data-testid=\"payback-months\"])');"],
  ["    await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('not a sourced arm-price quote');",
    "    await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('no sourced arm-price quote');"],
] as const;
const oldDescription = 'An editorial comparison of six world-model example groups: what they predict, in what representation, and for what purpose. The survey-defined functional criterion is decision-relevant prediction, not visual plausibility alone.';
const newDescription = "A world model predicts how an environment evolves in a form useful for a robot's decisions. Six example groups compared, from DreamerV3 to V-JEPA 2.";

const repairs = [
  {
    name: 'cite-jump-closes-hover', path: 'components/ui/cite.tsx', prior: 'reader-pins',
    edits: [['            href={referenceHref}', [
      '            href={referenceHref}',
      '            onClick={() => {',
      '              // The jump scrolls the entry under the fixed popup, which a',
      '              // pending hover grace would otherwise keep over its title.',
      '              clearTimeout(leaveTimer.current);',
      '              setHovered(false);',
      '            }}',
    ].join('\n')]],
  },
  {
    name: 'citation-refresh-current-wording', path: 'tests/e2e/industrial-citation-refresh.spec.ts',
    prior: 'reader-pins', edits: refreshWording,
  },
  {
    name: 'economics-instrument-frame', path: 'tests/e2e/economics-release-evidence.spec.ts',
    prior: 'economics-run', edits: economicsFrame,
  },
  {
    name: 'industrial-deployment-hydrated-slider', path: 'tests/e2e/industrial-deployment.spec.ts',
    prior: 'data-hardware',
    edits: [["import { setSlider } from './slider';", "import { setHydratedSlider as setSlider } from './interaction-ready';"]],
  },
  {
    name: 'taxonomy-search-description', path: 'content/world-models/taxonomy.mdx', prior: 'release-dependency',
    edits: [[`description: "${oldDescription}"`, `description: "${newDescription}"`]],
  },
  {
    name: 'classical-closure-suite-budget', path: 'tests/unit/classical-closure-evidence.test.ts', prior: 'checker',
    edits: [["describe('classical closure native evidence and preservation', () => {",
      "describe('classical closure native evidence and preservation', { timeout: 60_000 }, () => {"]],
  },
] as const;
type Repair = (typeof repairs)[number];

const review = JSON.parse(read(reviewPath).toString()) as SourceReview;
const sourceOf = (name: string) => review.sources.find((source) => source.name === name)!;
const endpointOf = (source: Source): Artifact =>
  ({ path: source.after.path, bytes: source.before.bytes, sha256: source.before.sha256 });

/** The endpoint the prior record names, read from that record itself. */
function priorEndpoint(repair: Repair, from = root): Artifact {
  const json = <T,>(path: string) => JSON.parse(readFileSync(join(from, path), 'utf8')) as T;
  if (repair.prior === 'reader-pins') {
    return json<{ sources: Source[] }>(readerPinsPath).sources.find((source) => source.after.path === repair.path)!.after;
  }
  if (repair.prior === 'economics-run') return json<{ test: Artifact }>(economicsRunPath).test;
  if (repair.prior === 'data-hardware') {
    return loadDataHardwareMotionReview(from).entries.find((entry) => entry.current.path === repair.path)!.current;
  }
  if (repair.prior === 'release-dependency') {
    return json<Bindings>(dependencyPath).bindings.find((binding) => binding.current?.path === repair.path)!.current!;
  }
  const checker = readFileSync(join(from, checkerArchivePath)).toString();
  const source = sourceOf(repair.name);
  expect(checker.split(testHashLine(source.before.sha256))).toHaveLength(2);
  return endpointOf(source);
}

const priorFiles = (repair: Repair) => repair.prior === 'reader-pins' ? [readerPinsPath]
  : repair.prior === 'economics-run' ? [economicsRunPath]
    : repair.prior === 'data-hardware' ? [dataHardwarePath, dataHardwarePriorPath, dependencyPath]
      : repair.prior === 'release-dependency' ? [dependencyPath] : [checkerArchivePath];

function copied(paths: readonly string[]) {
  const destination = mkdtempSync(join(tmpdir(), 'round6-remaining-repairs-'));
  for (const path of paths) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    copyFileSync(join(root, path), join(destination, path));
  }
  return destination;
}

it('reviews exactly the six named repairs under the recorded schema', () => {
  expect(review.schemaVersion).toBe('round6-remaining-repairs-source-continuity-v1');
  expect(review.name).toBe('remaining-repairs');
  expect(review.reviewedBy).toBe('Round-6 repair implementer, not independent acceptance');
  expect(review.sources.map((source) => [source.name, source.after.path]))
    .toEqual(repairs.map((repair) => [repair.name, repair.path]));
  for (const source of review.sources) expect(source.before.path.startsWith(directory)).toBe(true);
  expect(Date.parse(review.observedAt)).toBeLessThanOrEqual(Date.now());
});

it.each(repairs)('returns the archived $name bytes exactly where its prior record still points', (repair) => {
  const source = sourceOf(repair.name);
  const live = preFigureMigration(source.after);
  const archived = read(source.before.path);
  expect({ bytes: live.length, sha256: digest(live) }).toEqual({ bytes: source.after.bytes, sha256: source.after.sha256 });
  expect({ bytes: archived.length, sha256: digest(archived) })
    .toEqual({ bytes: source.before.bytes, sha256: source.before.sha256 });
  const prior = priorEndpoint(repair);
  expect(prior).toEqual(endpointOf(source));
  expect(round6RemainingRepairPredecessor(root, prior, live)).toEqual(archived);
  if (repair.prior === 'reader-pins' || repair.prior === 'economics-run') {
    expect(createLocalArtifactReader(root)(prior)).toEqual(archived);
  }
});

it('hands the data-hardware motion review the pre-repair spec it still gates', () => {
  const index = loadDataHardwareMotionReview(root).entries
    .findIndex((entry) => entry.current.path === 'tests/e2e/industrial-deployment.spec.ts');
  const entry = loadDataHardwareMotionReview(root).entries[index];
  const live = preFigureMigration(sourceOf('industrial-deployment-hydrated-slider').after);
  expect(() => currentDataHardwareMotionArtifact(root, index, live)).toThrow(/endpoint identity drift/);
  expect(currentDataHardwareMotionArtifact(root, index, round6RemainingRepairPredecessor(root, entry.current, live)))
    .toEqual(read(entry.snapshot.path));
});

it.each(repairs)('changes only the named $name edits and keeps every assertion line', (repair) => {
  const before = read(sourceOf(repair.name).before.path).toString();
  const after = preFigureMigration(sourceOf(repair.name).after).toString();
  let expected = before;
  for (const [from, to] of repair.edits) {
    expect(expected.split(from)).toHaveLength(2);
    expected = expected.split(from).join(to);
  }
  expect(expected).toBe(after);
  expect(assertions(after)).toBe(assertions(before));
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  if (repair.name === 'cite-jump-closes-hover') {
    let cursor = 0;
    for (const line of afterLines) if (line === beforeLines[cursor]) cursor += 1;
    expect(cursor).toBe(beforeLines.length);
    expect(afterLines.length - beforeLines.length).toBe(6);
  } else {
    expect(afterLines).toHaveLength(beforeLines.length);
    expect(beforeLines.filter((line, index) => line !== afterLines[index])).toHaveLength(repair.edits.length);
  }
});

it('keeps the recorded industrial and economics checks and matches the live article wording', () => {
  const article = read('content/data-hardware/industrial-deployment.mdx').toString();
  const refreshPath = 'tests/e2e/industrial-citation-refresh.spec.ts';
  const economicsPath = 'tests/e2e/economics-release-evidence.spec.ts';
  const refresh = preFigureMigration(sourceOf('citation-refresh-current-wording').after).toString();
  const economics = preFigureMigration(sourceOf('economics-instrument-frame').after).toString();
  const refreshBefore = read(sourceOf('citation-refresh-current-wording').before.path).toString();
  const economicsBefore = read(sourceOf('economics-instrument-frame').before.path).toString();
  for (const line of [
    '      await expect(tooltip).toContainText(canonical!.definition);',
    "    for (const value of ['4,663,698', '542,076', '54%']) {",
    "    await expect(page.locator('#main-content')).toContainText('no published success rate');",
    "  const dashboardLinkStatus = (await page.request.get('/frontier/reliability-gap/')).status();",
    '  expect(dashboardLinkStatus).toBe(200); expect(errors).toEqual([]);',
  ]) {
    expect(refreshBefore.split(line)).toHaveLength(2);
    expect(refresh.split(line)).toHaveLength(2);
    expect(carriesThroughFigureMigration(refreshPath, line, read(refreshPath).toString())).toBe(true);
  }
  for (const line of [
    "    await expect(slider.locator('xpath=following-sibling::p')).toContainText('not a sourced arm-price quote');",
    "    await expect(mount).not.toContainText('$25k-$80k');",
    '      await expect(mount.getByTestId(id)).toHaveText(o.display[i]);',
    "    await expect(mount.getByTestId('payback-verdict')).toHaveText(o.paysBack ? 'Pays back inside 24 months' : 'Outside a 24-month horizon');",
    "    await expect(page.locator('p').filter({ hasText: 'The calculator above reports capital cost per modeled pick' })).toContainText('It does not include running costs.');",
    '  expect(errors).toEqual([]);',
  ]) {
    expect(economicsBefore.split(line)).toHaveLength(2);
    expect(economics.split(line)).toHaveLength(2);
    expect(carriesThroughFigureMigration(economicsPath, line, read(economicsPath).toString())).toBe(true);
  }
  expect(article).toContain('no measured intervention rate behind it');
  expect(article).not.toContain('not a measured intervention rate');
  expect(article).toContain('with no sourced arm-price quote;');
  expect(read('components/interactive/deployment-economics.tsx').toString()).toContain('not a sourced arm-price quote');
});

it('keeps every phrase the data-hardware review requires on the live industrial spec', () => {
  const entry = loadDataHardwareMotionReview(root).entries
    .find((candidate) => candidate.current.path === 'tests/e2e/industrial-deployment.spec.ts')!;
  const live = read(entry.current.path).toString();
  expect(entry.requiredPresent.length + entry.requiredAbsent.length).toBeGreaterThan(0);
  for (const phrase of entry.requiredPresent) expect(live).toContain(phrase);
  for (const phrase of entry.requiredAbsent) expect(live).not.toContain(phrase);
  expect(live).toContain("from './interaction-ready';");
  expect(live).not.toContain("from './slider';");
});

it('changes only the taxonomy search description and keeps the release disclosure', () => {
  const before = read(sourceOf('taxonomy-search-description').before.path).toString();
  const after = read('content/world-models/taxonomy.mdx').toString();
  expect(matter(after).content).toBe(matter(before).content);
  expect({ ...matter(after).data, description: oldDescription }).toEqual(matter(before).data);
  expect(matter(after).data.description).toBe(newDescription);
  expect(newDescription.length).toBeGreaterThanOrEqual(50);
  expect(newDescription.length).toBeLessThanOrEqual(155);
  const preserved = (JSON.parse(read(dependencyPath).toString()) as Bindings).bindings
    .filter((binding) => binding.current?.path === 'content/world-models/taxonomy.mdx')
    .flatMap((binding) => binding.preservedText ?? []);
  expect(preserved.length).toBeGreaterThan(0);
  for (const phrase of preserved) expect(after).toContain(phrase);
});

it('passes every other reference and byte string through to the exact checks', () => {
  for (const repair of repairs) {
    const source = sourceOf(repair.name);
    const live = preFigureMigration(source.after);
    const liveReference = { path: repair.path, bytes: live.length, sha256: digest(live) };
    expect(round6RemainingRepairPredecessor(root, liveReference, live)).toBe(live);
    const longer = Buffer.concat([live, Buffer.from('\n')]);
    expect(round6RemainingRepairPredecessor(root, endpointOf(source), longer)).toBe(longer);
    const text = live.toString();
    const at = text.search(/[a-z]/);
    const sameLength = Buffer.from(`${text.slice(0, at)}${text[at].toUpperCase()}${text.slice(at + 1)}`);
    expect(sameLength.length).toBe(live.length);
    expect(round6RemainingRepairPredecessor(root, endpointOf(source), sameLength)).toBe(sameLength);
    const otherPath = `${dirname(repair.path)}/other${repair.path.slice(repair.path.lastIndexOf('.'))}`;
    expect(round6RemainingRepairPredecessor(root, { ...endpointOf(source), path: otherPath }, live)).toBe(live);
  }
  const other = read('content/world-models/latent-dynamics.mdx');
  expect(round6RemainingRepairPredecessor(root,
    { path: 'content/world-models/latent-dynamics.mdx', bytes: 1, sha256: '0'.repeat(64) }, other)).toBe(other);
});

const sourceMutations = ['missing-review', 'missing-snapshot', 'corrupt-snapshot', 'wrong-schema', 'wrong-name',
  'wrong-before-hash', 'wrong-after-hash', 'future-observation', 'short-rationale', 'dropped-source',
  'prior-endpoint', 'prior-disclosure', 'prior-absent'] as const;

it.each(repairs.flatMap((repair) => sourceMutations
  .filter((mutation) => mutation !== 'prior-disclosure' || ['data-hardware', 'release-dependency'].includes(repair.prior))
  .filter((mutation) => mutation !== 'prior-absent' || repair.prior === 'data-hardware')
  .map((mutation) => [repair.name, mutation] as const)))('rejects a %s successor with %s', (name, mutation) => {
  const repair = repairs.find((candidate) => candidate.name === name)!;
  const source = sourceOf(name);
  const destination = copied([reviewPath, source.before.path, ...priorFiles(repair)]);
  try {
    const live = preFigureMigration(source.after);
    const prior = priorEndpoint(repair, destination);
    expect(round6RemainingRepairPredecessor(destination, prior, live)).toEqual(read(source.before.path));
    if (mutation === 'missing-review') rmSync(join(destination, reviewPath));
    if (mutation === 'missing-snapshot') rmSync(join(destination, source.before.path));
    if (mutation === 'corrupt-snapshot') writeFileSync(join(destination, source.before.path), 'corrupt');
    if (['wrong-schema', 'wrong-name', 'wrong-before-hash', 'wrong-after-hash', 'future-observation',
      'short-rationale', 'dropped-source'].includes(mutation)) {
      const changed = JSON.parse(readFileSync(join(destination, reviewPath), 'utf8')) as SourceReview;
      const own = changed.sources.find((candidate) => candidate.name === name)!;
      if (mutation === 'wrong-schema') changed.schemaVersion = 'round6-remaining-repairs-source-continuity-v0';
      if (mutation === 'wrong-name') changed.name = 'some-other-repairs';
      if (mutation === 'wrong-before-hash') own.before.sha256 = '0'.repeat(64);
      if (mutation === 'wrong-after-hash') own.after.sha256 = '0'.repeat(64);
      if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
      if (mutation === 'short-rationale') changed.rationale = 'Exact edits.';
      if (mutation === 'dropped-source') changed.sources = changed.sources.filter((candidate) => candidate !== own);
      writeFileSync(join(destination, reviewPath), JSON.stringify(changed));
    }
    if (mutation === 'prior-endpoint' && repair.prior === 'reader-pins') {
      const pins = JSON.parse(readFileSync(join(destination, readerPinsPath), 'utf8')) as { sources: Source[] };
      pins.sources.find((candidate) => candidate.after.path === repair.path)!.after.sha256 = '0'.repeat(64);
      writeFileSync(join(destination, readerPinsPath), JSON.stringify(pins));
    }
    if (mutation === 'prior-endpoint' && repair.prior === 'economics-run') {
      const run = JSON.parse(readFileSync(join(destination, economicsRunPath), 'utf8')) as { test: Artifact };
      run.test.sha256 = '0'.repeat(64);
      writeFileSync(join(destination, economicsRunPath), JSON.stringify(run));
    }
    if (repair.prior === 'data-hardware' && mutation.startsWith('prior-')) {
      const continuity = JSON.parse(readFileSync(join(destination, dataHardwarePath), 'utf8')) as DataHardwareReview;
      const entry = continuity.entries.find((candidate) => candidate.current.path === repair.path)!;
      if (mutation === 'prior-endpoint') entry.current.sha256 = '0'.repeat(64);
      if (mutation === 'prior-disclosure') entry.requiredPresent.push('A phrase the repaired spec does not carry.');
      if (mutation === 'prior-absent') entry.requiredAbsent.push("from './interaction-ready';");
      writeFileSync(join(destination, dataHardwarePath), JSON.stringify(continuity));
    }
    if (repair.prior === 'release-dependency' && mutation.startsWith('prior-')) {
      const dependencies = JSON.parse(readFileSync(join(destination, dependencyPath), 'utf8')) as Bindings;
      const binding = dependencies.bindings.find((candidate) => candidate.current?.path === repair.path)!;
      if (mutation === 'prior-endpoint') binding.current!.sha256 = '0'.repeat(64);
      else binding.preservedText!.push('A phrase the repaired article does not carry.');
      writeFileSync(join(destination, dependencyPath), JSON.stringify(dependencies));
    }
    if (mutation === 'prior-endpoint' && repair.prior === 'checker') {
      writeFileSync(join(destination, checkerArchivePath), 'corrupt');
    }
    expect(() => round6RemainingRepairPredecessor(destination, prior, live))
      .toThrow(/round6 remaining repairs source continuity drift|ENOENT/);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});

const checkerEdits = [
  ["import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';\n",
    "import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';\n" +
      "import { round6RemainingRepairPredecessor } from './audit-round6-remaining-repairs-continuity.ts';\n"],
  ['  const current = round6ProseRestorePredecessor(root, ref, readBoundedLocalFile(root, ref.path));\n',
    '  const current = round6ProseRestorePredecessor(root, ref,\n' +
      '    round6RemainingRepairPredecessor(root, ref, readBoundedLocalFile(root, ref.path)));\n'],
  [testHashLine('42cfb7e1f3f5d73652d11fe6950188dde4aeb1d7928cc0100f1d223c70ec6a38'),
    testHashLine('cf53d3e938e03ddeef8028aa289edecaee34eb30e5a943756fad8d3bf35b4eb9')],
] as const;

it('admits only the exact remaining-repairs reader revision above the round6 prose-restores head', () => {
  // This revision's output is now preserved as the input of the later
  // figure-migration reader revision, which the live checker reaches first.
  const reviewedAfter = read('audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt');
  expect(reviewedAfter.length).toBe(114006);
  expect(digest(reviewedAfter)).toBe('a5bce56232d1ac63ce3f94add1bdc7d2a7964bf1f40bb6bd431b746ccb510a1a');
  const live = read('lib/audit-local-basis.ts');
  const archived = read(checkerArchivePath);
  expect(archived.length).toBe(113858);
  expect(digest(archived)).toBe('647d182bb6090f369f13a9a7076f2b6fad242f09ff0886d08c40b51fe01043e0');
  const checkerReview = JSON.parse(read(checkerReviewPath).toString()) as CheckerReview;
  expect(checkerReview.schemaVersion).toBe('round6-remaining-repairs-checker-revision-v1');
  expect(checkerReview.name).toBe('remaining-repairs-reader');
  expect(checkerReview.before).toEqual({ path: checkerArchivePath, bytes: archived.length, sha256: digest(archived) });
  expect(checkerReview.after).toEqual({
    path: 'lib/audit-local-basis.ts', bytes: reviewedAfter.length, sha256: digest(reviewedAfter),
  });
  expect(round6RemainingRepairsCheckerPredecessor(root, reviewedAfter)).toEqual(archived);
  expect(round6RemainingRepairsCheckerPredecessor(root, live)).toEqual(archived);
  expect(round6RemainingRepairsCheckerPredecessor(root, archived)).toEqual(archived);
  const proseArchived = read('audit/evidence/motion-round6-prose-restores-20260929/audit-local-basis-before.ts.txt');
  expect(round6RemainingRepairsCheckerPredecessor(root, proseArchived)).toEqual(proseArchived);
  expect(round6ProseRestoresCheckerPredecessor(root, live)).toEqual(proseArchived);
  let expected = archived.toString();
  for (const [from, to] of checkerEdits) {
    expect(expected.split(from)).toHaveLength(2);
    expect(reviewedAfter.toString().split(to)).toHaveLength(2);
    expected = expected.split(from).join(to);
  }
  expect(expected).toBe(reviewedAfter.toString());
  for (const [from, to] of checkerEdits) {
    const reverted = Buffer.from(reviewedAfter.toString().split(to).join(from));
    expect(() => round6RemainingRepairsCheckerPredecessor(root, reverted)).toThrow(
      /figure migration checker continuity drift/,
    );
  }
  expect(() => round6RemainingRepairsCheckerPredecessor(root, Buffer.concat([reviewedAfter, Buffer.from('\n')])))
    .toThrow(/figure migration checker continuity drift/);
});

it('names the live classical-closure suite as the budget-only edit of the archived suite', () => {
  const suite = read('tests/unit/classical-closure-evidence.test.ts');
  const archived = read(suiteArchivePath);
  expect(digest(suite)).toBe('cf53d3e938e03ddeef8028aa289edecaee34eb30e5a943756fad8d3bf35b4eb9');
  expect(digest(archived)).toBe('42cfb7e1f3f5d73652d11fe6950188dde4aeb1d7928cc0100f1d223c70ec6a38');
  expect(read('lib/audit-local-basis.ts').toString().split(testHashLine(digest(suite)))).toHaveLength(2);
  expect(read(checkerArchivePath).toString().split(testHashLine(digest(archived)))).toHaveLength(2);
  expect(read('lib/audit-local-basis.ts').toString().split(testHashLine(digest(archived)))).toHaveLength(1);
});

it.each(['missing-review', 'missing-predecessor', 'corrupt-predecessor', 'missing-suite', 'corrupt-suite',
  'review-before-hash', 'review-after-hash', 'wrong-name', 'wrong-schema', 'future-observation',
  'short-rationale'] as const)('rejects %s in the remaining-repairs checker transition', (mutation) => {
  const destination = copied([checkerReviewPath, checkerArchivePath, suiteArchivePath,
    'audit/evidence/figure-migration-20261001/checker-transition.json',
    'audit/evidence/figure-migration-20261001/audit-local-basis-before.ts.txt']);
  try {
    const live = read('lib/audit-local-basis.ts');
    expect(round6RemainingRepairsCheckerPredecessor(destination, live)).toEqual(read(checkerArchivePath));
    if (mutation === 'missing-review') rmSync(join(destination, checkerReviewPath));
    if (mutation === 'missing-predecessor') rmSync(join(destination, checkerArchivePath));
    if (mutation === 'corrupt-predecessor') writeFileSync(join(destination, checkerArchivePath), 'corrupt');
    if (mutation === 'missing-suite') rmSync(join(destination, suiteArchivePath));
    if (mutation === 'corrupt-suite') writeFileSync(join(destination, suiteArchivePath), 'corrupt');
    if (!mutation.startsWith('missing') && !mutation.startsWith('corrupt')) {
      const changed = JSON.parse(readFileSync(join(destination, checkerReviewPath), 'utf8')) as CheckerReview;
      if (mutation === 'review-before-hash') changed.before.sha256 = '0'.repeat(64);
      if (mutation === 'review-after-hash') changed.after.sha256 = '0'.repeat(64);
      if (mutation === 'wrong-name') changed.name = 'some-other-revision';
      if (mutation === 'wrong-schema') changed.schemaVersion = 'round6-remaining-repairs-checker-revision-v0';
      if (mutation === 'future-observation') changed.observedAt = '2999-01-01T00:00:00Z';
      if (mutation === 'short-rationale') changed.rationale = 'Exact hook.';
      writeFileSync(join(destination, checkerReviewPath), JSON.stringify(changed));
    }
    expect(() => round6RemainingRepairsCheckerPredecessor(destination, live))
      .toThrow(/round6 remaining repairs checker continuity drift|ENOENT/);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
});
