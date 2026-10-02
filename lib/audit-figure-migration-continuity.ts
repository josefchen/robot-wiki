/**
 * Exact successor reviews for the pinned files and interactive registry
 * records that the one-figure-system migration of 2026-10-01 changed. The
 * migration moved every instrument onto the figure frame, retired overview
 * scenes and calculator copies that repeated another figure on the same page,
 * and reworded the lead-ins that named a retired figure. Each changed file is
 * archived at its pre-migration bytes. The artifact reader hands every later
 * check the archive only while the live file is exactly the reviewed
 * successor and still satisfies the named obligations: phrases earlier
 * reviews require, withdrawn phrases, unchanged article frontmatter and
 * citation order, each replaced phrase with its successor, and each retired
 * mount literal with its survivor. Registry records and the checker revision
 * are admitted the same way. No old review, run, receipt, capture or ledger
 * cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { seoPassCheckerPredecessor } from './audit-seo-pass-continuity.ts';

const directory = 'audit/evidence/figure-migration-20261001/';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'figure migration source continuity drift';
const registryDrift = 'figure migration registry continuity drift';
const checkerDrift = 'figure migration checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = { schemaVersion: string; name?: string; reviewedBy: string; rationale: string; observedAt: string };
type Replacement = { before: string; after: string; reason: string };
type Retirement = { literal: string; survivor: string; reason: string };
export type FigureMigrationSource = {
  name: string; before: Artifact; after: Artifact;
  preserved: string[]; preservedOnce: string[]; absent: string[];
  replaced: Replacement[]; retired: Retirement[];
};
type SourceReview = Review & { archivedFrom: string; sources: FigureMigrationSource[] };

/** The reviewed evidence files; a changed review needs a reviewed code change too. */
const sourceReviewPin = { bytes: 48798, sha256: '9d096c8a6bd37e33c21a1093fa5c42a87c378af1dbd331e499ca5cf985740700' };
const registryReviewPin = { bytes: 8055, sha256: '2b9c7d0fa6e77dbcb58f2751c594d8cbb595fc16f384329f8b2cf50e53deb09a' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/interactive/collaborative-operation-modes.tsx', [18893, 'b29dc0b3e8db7c1ecb9345150b1bcddf2cc8c71149e7bade7f05f382aee568e1']],
  ['components/interactive/data-scale-chart.tsx', [22243, '1f730c35ce607f90e9bb552a9618a05af50a2c67c4eadf11c94e9c2299081e3b']],
  ['components/interactive/deployment-economics.tsx', [11507, '94ff1dbeee421bf5f375a2c4cf418f669899607eabb9e8978f68f97b20574e01']],
  ['components/interactive/eureka-loop.tsx', [8758, '63bde0083bb93f53dc8c5bd026da07581e4c81eb630d2d4816f274900c9367dd']],
  ['components/interactive/friction-transfer.tsx', [16665, 'dab247ff28e8fe7a559606cd4c19788e1dae7df68e04f9429bb390312f3d53c1']],
  ['components/interactive/generalist-release-timeline.tsx', [16098, '3fc65b1697c8000e3c74fbecf95fc16bf23d55947d1f71e0be3a95c42d0b61a5']],
  ['components/interactive/impedance-contact-lab.tsx', [16654, '5178ab338d1ead296c94496fae251661bae1fdf4f4455033289abe64ed7a56f8']],
  ['components/interactive/pendulum-controller.tsx', [18878, '8a1086da53876ed485f0c9717d68c2e43b6fc98e0b08245a7ab9285b4d4cd10e']],
  ['components/interactive/perception-error-budget.tsx', [17967, '97e3c0ea19bab721cb4c7e101dc7967e4bb2928918e38bec61fc666782c88880']],
  ['components/interactive/planar-fk-arm.tsx', [10072, 'ae71932097c181a0bc71463e1de009c1bc992bdfc4a6e6cbc255e99bef247419']],
  ['components/interactive/reliability-compounding.tsx', [14060, 'c50d6ba2fc0ae6e9ba55ab7eed332cd69b646b7e9adcb56bf52ebffd1ff2b6f4']],
  ['components/interactive/reward-shaping.tsx', [16807, 'b59d2dab22ef912829f7e782911f0a4eae41f5055bcb7f416d3119237632e404']],
  ['components/interactive/rrt-explorer.tsx', [16114, '07bfef8d62c3b0c2b65ba2fcf772960a84280b7addbf0701d668a500792991ff']],
  ['components/interactive/teacher-student.tsx', [11268, '954f0540bb590956032fc04959f0f25bf4f64ddd465e9aae232ef48cedfaa6c8']],
  ['content/classical/control.mdx', [20898, '9b41f7f068697599c9040c66eaf3dae0b2d90a18742b15e6b2d369dd0fa74bfc']],
  ['content/classical/kinematics.mdx', [11841, '3972d6e123cdee5910beacb08f15f3ba853877c07029a9b7dcf4b0b439fdbbaa']],
  ['content/classical/motion-planning.mdx', [24194, 'b785f6d9a2da5b98d31dc9d384707218ab3dec14d2d9fae9b96e06942b7e58e6']],
  ['content/classical/perception.mdx', [35527, '18e39a144d4085232b2e7dbd4bca98798cd99085fc44340dbdcf2330a7cb0f65']],
  ['content/data-hardware/data-bottleneck.mdx', [11865, '844681ad63310e95b716d1b348d35132de9b4ccda7c3d51ed11e3730fff34e2a']],
  ['content/data-hardware/evaluation-crisis.mdx', [17322, '2337aa7c35bf33dbdc468905802b7346f8247ae39486ce3eb2c291b7d41c9492']],
  ['content/rl-sim2real/legged-locomotion.mdx', [15138, 'd646ead47e43757b3bb2174ca7fd666c5a4aa64062bac05c080b88b2434de4af']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [12933, 'f311364a94dc11f6b1e98bc7ecf7ff80005d4148c8fc64b5beaab45ddb9984bf']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [20184, '47ee34b59c1a6aec096d78cee228d2488ec71c3e871e951821f6be433191a72b']],
  ['tests/e2e/control.spec.ts', [25472, '61673685f0936d8d9bf2dc688ea5be0752fb528a30bdb057550645abee9e81f4']],
  ['tests/e2e/economics-release-evidence.spec.ts', [7215, 'd303dcd54f8b0457ac38bcb1089a51ed5c61d9bde3d37151384fd191794eb6b7']],
  ['tests/e2e/final-seven-closure-evidence.spec.ts', [7396, '53b66fa3ea26f8cac221bec114158ae2205b448be0d4ae282d806e4aed963442']],
  ['tests/e2e/industrial-citation-refresh.spec.ts', [7789, '7d5e30450b260058dc06a573026d9544844a47e4f38a50f7e042644e76be28dd']],
  ['tests/e2e/industrial-deployment.spec.ts', [20044, '93a643879e5be329fa4887d30cabff8a4c5abba5b00b741cbd283e9e56b545cc']],
  ['tests/e2e/reward-local-evidence.spec.ts', [7622, '55523a6c8f3707db36b18438943e51d857e8ad752ae60dac0861d8681d62efe8']],
  ['tests/e2e/sim2real-local-evidence.spec.ts', [8662, 'b4131e7bc949d87310fc1430b40afbc8f481c30b5be8f368636887ba03f4cae9']],
]);

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const count = (text: string, phrase: string) => text.split(phrase).length - 1;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citations = (source: string) =>
  JSON.stringify([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));

function readEvidence(root: string, path: string, label: string): Buffer {
  try {
    return readFileSync(join(root, path));
  } catch (error) {
    throw new Error(`${label}: ${(error as Error).message}`);
  }
}

function readPinned(root: string, artifact: Artifact, label: string): Buffer {
  const bytes = readEvidence(root, artifact.path, label);
  if (bytes.length !== artifact.bytes || digest(bytes) !== artifact.sha256) throw new Error(label);
  return bytes;
}

function reviewed(review: Review, schemaVersion: string, label: string): void {
  if (review.schemaVersion !== schemaVersion || !review.reviewedBy || !(review.rationale?.length > 80) ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(label);
  }
}

function applyExact(before: string, edits: readonly (readonly [string, string])[], label: string): string {
  let expected = before;
  for (const [from, to] of edits) {
    const parts = expected.split(from);
    if (parts.length !== 2) throw new Error(label);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    expected = parts.join(to);
  }
  return expected;
}

/**
 * Throws unless the live successor keeps every obligation the review names
 * over its archive. Exported so the obligations can be exercised apart from
 * the byte pins that normally gate them.
 */
export function verifyFigureMigrationSource(source: FigureMigrationSource, archive: Buffer, live: Buffer): void {
  const before = archive.toString();
  const current = live.toString();
  const obligations = source.preserved.length + source.preservedOnce.length +
    source.replaced.length + source.retired.length;
  const article = source.after.path.endsWith('.mdx');
  if (obligations === 0 ||
    source.preserved.some((text) => !text || !before.includes(text) || !current.includes(text)) ||
    source.preservedOnce.some((text) => !text || count(before, text) !== 1 || count(current, text) !== 1) ||
    source.absent.some((text) => !text || before.includes(text) || current.includes(text)) ||
    source.replaced.some(({ before: from, after: to, reason }) => !from || !to || !(reason?.length > 40) ||
      !before.includes(from) || current.includes(from) || before.includes(to) || !current.includes(to)) ||
    source.retired.some(({ literal, survivor, reason }) => !literal || !survivor || !(reason?.length > 40) ||
      !before.includes(literal) || current.includes(literal) || !current.includes(survivor)) ||
    (article && (frontmatter(before) === undefined || frontmatter(before) !== frontmatter(current) ||
      citations(before) !== citations(current)))) {
    throw new Error(sourceDrift);
  }
}

function loadSourceReview(root: string): SourceReview {
  const review = JSON.parse(readPinned(root,
    { path: `${directory}source-transition.json`, ...sourceReviewPin }, sourceDrift).toString()) as SourceReview;
  reviewed(review, 'figure-migration-source-continuity-v1', sourceDrift);
  const names = new Set(review.sources?.map((source) => source.name));
  const paths = new Set(review.sources?.map((source) => source.after?.path));
  if (review.name !== 'one-figure-system-migration' || review.sources?.length !== successors.size ||
    names.size !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(sourceDrift);
  }
  return review;
}

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so those checks still decide them.
 * The reviewed successor is verified against its archive, which is returned.
 */
export function figureMigrationPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadSourceReview(root).sources.find(({ after }) => after.path === ref.path)!;
  if (!source.before.path.startsWith(directory)) throw new Error(sourceDrift);
  const archive = readPinned(root, source.before, sourceDrift);
  verifyFigureMigrationSource(source, archive, live);
  return archive;
}

type RegistryRecord = { id: string };
type RegistryShape = { sources: RegistryRecord[]; mounts: RegistryRecord[] };
type Survivor = { mountId: string } | { path: string; literal: string };
type RegistryReview = Review & {
  before: Artifact;
  records: ({ id: string; before: string; reason: string } &
    ({ change: 'changed'; after: string } | { change: 'retired'; survivor: Survivor }))[];
};
type RegistryArchive = RegistryShape & {
  schemaVersion: string; archivedFrom: string; path: string; section: string;
};
const recordHash = (record: RegistryRecord) => digest(JSON.stringify(record));

/** An unreadable survivor article leaves the retired id absent, so only plans naming it fail. */
function survives(root: string, survivor: Survivor, live: RegistryShape): boolean {
  if ('mountId' in survivor) return live.mounts.some((mount) => mount.id === survivor.mountId);
  if (!survivor.path?.startsWith('content/') || !survivor.literal) return false;
  try {
    return readFileSync(join(root, survivor.path), 'utf8').includes(survivor.literal);
  } catch {
    return false;
  }
}

/**
 * The interactive registry the caller's fingerprint checks should see. Each
 * reviewed record is replaced by its archived pre-migration record only while
 * the live record is exactly the reviewed successor or, for a retired id,
 * while the id stays absent and its named survivor is present. Any other
 * record, including a reviewed one that drifted again, comes back unchanged.
 */
export function figureMigrationRegistry<T extends RegistryShape>(root: string, live: T): T {
  const review = JSON.parse(readPinned(root,
    { path: `${directory}registry-transition.json`, ...registryReviewPin }, registryDrift).toString()) as RegistryReview;
  reviewed(review, 'figure-migration-registry-continuity-v1', registryDrift);
  if (review.name !== 'one-figure-system-registry' || review.before?.path !== `${directory}registry-before.json`) {
    throw new Error(registryDrift);
  }
  const archived = JSON.parse(readPinned(root, review.before, registryDrift).toString()) as RegistryArchive;
  if (archived.schemaVersion !== 'figure-migration-registry-archive-v1' ||
    archived.path !== 'contract/brand-v2-registries.json' || archived.section !== 'interactive' ||
    new Set(review.records.map(({ id }) => id)).size !== review.records.length ||
    archived.sources.length + archived.mounts.length !== review.records.length) {
    throw new Error(registryDrift);
  }
  const sources = [...live.sources];
  const mounts = [...live.mounts];
  for (const record of review.records) {
    const isSource = record.id.startsWith('interactive:');
    const list = isSource ? sources : mounts;
    const prior = (isSource ? archived.sources : archived.mounts).filter(({ id }) => id === record.id);
    if (prior.length !== 1 || recordHash(prior[0]) !== record.before || !(record.reason?.length > 40)) {
      throw new Error(registryDrift);
    }
    const index = list.findIndex(({ id }) => id === record.id);
    if (record.change === 'changed') {
      if (index >= 0 && recordHash(list[index]) === record.after) list[index] = prior[0];
    } else if (record.change === 'retired' && !isSource) {
      if (index < 0 && survives(root, record.survivor, live)) list.push(prior[0]);
    } else {
      throw new Error(registryDrift);
    }
  }
  return { ...live, sources, mounts };
}

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 114006,
  sha256: 'a5bce56232d1ac63ce3f94add1bdc7d2a7964bf1f40bb6bd431b746ccb510a1a',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { round6RemainingRepairPredecessor } from './audit-round6-remaining-repairs-continuity.ts';",
    "import { round6RemainingRepairPredecessor } from './audit-round6-remaining-repairs-continuity.ts';\n" +
      "import { figureMigrationPredecessor, figureMigrationRegistry } from './audit-figure-migration-continuity.ts';",
  ],
  [
    '  const current = round6ProseRestorePredecessor(root, ref,\n' +
      '    round6RemainingRepairPredecessor(root, ref, readBoundedLocalFile(root, ref.path)));\n',
    '  const current = round6ProseRestorePredecessor(root, ref, round6RemainingRepairPredecessor(root, ref,\n' +
      '    figureMigrationPredecessor(root, ref, readBoundedLocalFile(root, ref.path))));\n',
  ],
  [
    "  const registry = JSON.parse(readBoundedLocalFile(root, 'contract/brand-v2-registries.json').toString('utf8')).interactive as Registry;\n",
    '  const registry = figureMigrationRegistry(root,\n' +
      "    JSON.parse(readBoundedLocalFile(root, 'contract/brand-v2-registries.json').toString('utf8')).interactive as Registry);\n",
  ],
];

/** The round6 remaining-repairs predecessor and every checker it passes through. */
const historicalCheckers = new Map([
  ['647d182bb6090f369f13a9a7076f2b6fad242f09ff0886d08c40b51fe01043e0', 113858],
  ['ab4e3d50ed3961a293d1e8b8a664d8e8de1f2f1e5cd93ee08785d5402a9465c6', 113723],
  ['0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756', 113447],
  ['4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69', 113223],
  ['65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b', 112672],
  ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
  ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
  ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
  ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
]);

/**
 * The SEO-pass revision above this head is unwound first. Older checker
 * bytes pass through. The figure-migration checker is admitted only as the
 * exact reader revision above the round6 remaining-repairs head.
 */
export function figureMigrationCheckerPredecessor(root: string, checker: Buffer): Buffer {
  const live = seoPassCheckerPredecessor(root, checker);
  const liveHash = digest(live);
  if (liveHash === checkerBefore.sha256 && live.length === checkerBefore.bytes) return live;
  if (historicalCheckers.get(liveHash) === live.length) return live;
  const text = readEvidence(root, `${directory}checker-transition.json`, checkerDrift).toString();
  let review: Review & { before: Artifact; after: Artifact };
  try {
    review = JSON.parse(text);
  } catch (error) {
    throw new Error(`${checkerDrift}: ${(error as Error).message}`);
  }
  reviewed(review, 'figure-migration-checker-revision-v1', checkerDrift);
  const historical = readPinned(root, checkerBefore, checkerDrift);
  if (review.name !== 'figure-migration-reader' ||
    !same(review.before, checkerBefore.path, checkerBefore.bytes, checkerBefore.sha256) ||
    review.after?.path !== 'lib/audit-local-basis.ts' ||
    live.length !== review.after.bytes || liveHash !== review.after.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== live.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
