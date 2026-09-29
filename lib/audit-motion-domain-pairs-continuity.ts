/**
 * Preserve the source bytes observed by historical RL local-basis proofs.
 * This successor admits only two exact, presentation-semantic annotations:
 * the selected gait phase and the selected environment-count marker. The
 * historical receipts, observations, and source fingerprints are unchanged.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedUiCheckerPredecessor } from './audit-shared-ui-local-basis-continuity.ts';

const directory = 'audit/evidence/motion-domain-pairs-20260928/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceTransitions = {
  'components/interactive/gait-diagram.tsx': {
    snapshot: 'gait-diagram-before.tsx.txt',
    beforeBytes: 16503,
    beforeHash: '23ebfff6f843bdacde32e0bac3ed77a494ac0da441af43aa27c7ad281fc9763e',
    afterBytes: 16539,
    afterHash: '7669fccc115fcc41953e3f8b47ce19d3e707a568f5d116c423ac0622cee449db',
    from: '<g data-testid="playhead">',
    to: '<g data-testid="playhead" data-selection="current gait phase">',
    proofCount: 10,
  },
  'components/interactive/training-time-chart.tsx': {
    snapshot: 'training-time-chart-before.tsx.txt',
    beforeBytes: 17843,
    beforeHash: '4da47ae4cf73f7fe15f1c0347b5df7174e98680a2bc3e97525169e293c017ec8',
    afterBytes: 17896,
    afterHash: '6d5f42e269641c661b8a79b3a7e4d7ecc9960ae541f6e68085239319918951fe',
    from: '          data-testid="position-marker"\n          cx={xFor(envs)}',
    to: '          data-testid="position-marker"\n          data-selection="current environment count"\n          cx={xFor(envs)}',
    proofCount: 13,
  },
} as const;

type BoundSource = keyof typeof sourceTransitions;
type Artifact = { path: string; bytes: number; sha256: string };

/** Only the two article-truth helper call sites may pass parsed JSON between proofs. */
function articleTruthPredecessor(root: string, live: Buffer): Buffer {
  const predecessorPath = 'audit/evidence/motion-article-truth-efficiency-20260928/audit-local-basis-before.ts.txt';
  const review = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-article-truth-efficiency-20260928/checker-transition.json'), 'utf8')) as {
      schemaVersion: string; before: Artifact; after: Artifact;
      reviewedBy: string; rationale: string; observedAt: string;
    };
  const old = readFileSync(join(root, predecessorPath));
  const beforeHash = '7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6';
  const afterHash = 'c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c';
  const oldText = old.toString();
  const fromDirect = 'return currentRlMotionArticle(root, ref, loadRlMotionContinuity(root));';
  const toDirect = 'return currentRlMotionArticle(root, ref, loadRlMotionContinuity(root), ref, parsedInputCache);';
  const fromIntegrated = 'currentRlMotionArticle(root, expectedCurrent,\n      loadRlMotionContinuity(root), ref);';
  const toIntegrated = 'currentRlMotionArticle(root, expectedCurrent,\n      loadRlMotionContinuity(root), ref, parsedInputCache);';
  if (review.schemaVersion !== 'motion-article-truth-checker-revision-v1' ||
    review.before.path !== predecessorPath || review.before.bytes !== 111934 ||
    review.before.sha256 !== beforeHash || old.length !== 111934 || digest(old) !== beforeHash ||
    review.after.path !== 'lib/audit-local-basis.ts' || review.after.bytes !== 111975 ||
    review.after.sha256 !== afterHash || live.length !== 111975 || digest(live) !== afterHash ||
    !review.reviewedBy || review.rationale.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now() ||
    oldText.split(fromDirect).length !== 2 || oldText.split(fromIntegrated).length !== 2 ||
    oldText.replace(fromDirect, toDirect).replace(fromIntegrated, toIntegrated) !== live.toString()) {
    throw Error('motion domain-pairs checker continuity drift');
  }
  return old;
}

/** Preserve the domain-pairs checker while reviewing one exact pure-input reuse. */
function proofReaderPredecessor(root: string, live: Buffer): Buffer {
  const predecessorPath = 'audit/evidence/motion-proof-reader-efficiency-20260928/audit-local-basis-before.ts.txt';
  const review = JSON.parse(readFileSync(join(root,
    'audit/evidence/motion-proof-reader-efficiency-20260928/checker-transition.json'), 'utf8')) as {
      schemaVersion: string; before: Artifact; after: Artifact;
      reviewedBy: string; rationale: string; observedAt: string;
    };
  const old = readFileSync(join(root, predecessorPath));
  const beforeHash = '4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d';
  const afterHash = '7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6';
  const edits: readonly (readonly [string, string, number])[] = [
    ['function readKrogerContinuity(root: string): RelevantContinuity {',
      'function readKrogerContinuity(root: string, parsedInputCache?: Map<string, unknown>): RelevantContinuity {', 1],
    ["  const catalog = JSON.parse(readBoundedLocalFile(root, 'audit/local-basis.json').toString()) as {\n" +
      '    proofs: { id: string; artifacts: { file: { path: string; sha256: string } }[] }[];\n' +
      '  };',
    "  // Re-read and compare complete current bytes on every obligation. Reuse only the\n" +
      "  // pure JSON parse when the exact bytes and root were already seen here.\n" +
      "  const catalogBytes = readBoundedLocalFile(root, 'audit/local-basis.json');\n" +
      '  const key = resolve(root);\n' +
      '  type ProofIndex = {\n' +
      '    proofs: { id: string; artifacts: { file: { path: string; sha256: string } }[] }[];\n' +
      '  };\n' +
      '  const cached = parsedInputCache?.get(key) as { bytes: Buffer; catalog: ProofIndex } | undefined;\n' +
      '  const catalog: ProofIndex = cached?.bytes.equals(catalogBytes) ? cached.catalog :\n' +
      '    JSON.parse(catalogBytes.toString()) as ProofIndex;\n' +
      '  if (!cached || !cached.bytes.equals(catalogBytes)) {\n' +
      '    parsedInputCache?.set(key, { bytes: catalogBytes, catalog });\n' +
      '  }', 1],
    ['function readRetainedDependency(root: string, ref: LocalArtifact): Buffer {\n' +
      '  const current = readBoundedLocalFile(root, ref.path);',
    'function readRetainedDependency(root: string, ref: LocalArtifact, parsedInputCache?: Map<string, unknown>): Buffer {\n' +
      '  const current = readBoundedLocalFile(root, ref.path);\n' +
      '  const readContinuity = () => readKrogerContinuity(root, parsedInputCache);', 1],
    ['readKrogerContinuity(root)', 'readContinuity()', 8],
    ['export function createLocalArtifactReader(root: string): (ref: LocalArtifact) => Buffer {',
      'export function createLocalArtifactReader(root: string, parsedInputCache?: Map<string, unknown>): (ref: LocalArtifact) => Buffer {', 1],
    ['const bytes = readRetainedDependency(root, ref);',
      'const bytes = readRetainedDependency(root, ref, parsedInputCache);', 1],
    ['  registryIds: ReadonlySet<string>, context: LocalBasisContext): LocalBasisResult {',
      '  registryIds: ReadonlySet<string>, context: LocalBasisContext, parsedInputCache?: Map<string, unknown>): LocalBasisResult {', 1],
    ['const read = createLocalArtifactReader(context.root);',
      'const read = createLocalArtifactReader(context.root, parsedInputCache);', 1],
  ];
  let expected = old.toString();
  for (const [before, after, count] of edits) {
    if (expected.split(before).length !== count + 1) throw Error('motion domain-pairs checker continuity drift');
    expected = expected.split(before).join(after);
  }
  if (review.schemaVersion !== 'motion-proof-reader-checker-revision-v1' ||
    review.before.path !== predecessorPath || review.before.bytes !== 111186 ||
    review.before.sha256 !== beforeHash || old.length !== 111186 || digest(old) !== beforeHash ||
    review.after.path !== 'lib/audit-local-basis.ts' || review.after.bytes !== 111934 ||
    review.after.sha256 !== afterHash || live.length !== 111934 || digest(live) !== afterHash ||
    !review.reviewedBy || review.rationale.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now() ||
    expected !== live.toString()) throw Error('motion domain-pairs checker continuity drift');
  return old;
}

export function retainedDomainPairSource(root: string, path: BoundSource, live: Buffer): Buffer {
  const spec = sourceTransitions[path];
  const historical = readFileSync(join(root, directory, spec.snapshot));
  const review = JSON.parse(readFileSync(join(root, directory, 'transition.json'), 'utf8')) as {
    schemaVersion: string; reviewedBy: string; rationale: string; observedAt: string;
    sources: { before: Artifact; after: Artifact; proofIds: string[] }[];
  };
  const binding = review.sources?.find(({ after }) => after.path === path);
  const catalog = JSON.parse(readFileSync(join(root, 'audit/local-basis.json'), 'utf8')) as {
    proofs: { id: string; artifacts: { file: Artifact }[] }[];
  };
  const proofIds = catalog.proofs.filter((proof) => proof.artifacts.some(({ file }) =>
    file.path === path && file.bytes === spec.beforeBytes && file.sha256 === spec.beforeHash,
  )).map(({ id }) => id).sort();
  const from = spec.from;
  if (review.schemaVersion !== 'motion-domain-pairs-source-continuity-v1' ||
    review.reviewedBy !== 'Batch-2 implementer (not independent acceptance)' ||
    review.rationale?.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() ||
    review.sources?.length !== 2 || !binding ||
    binding.before.path !== `${directory}${spec.snapshot}` ||
    binding.before.bytes !== spec.beforeBytes ||
    binding.before.sha256 !== spec.beforeHash ||
    binding.after.bytes !== spec.afterBytes ||
    binding.after.sha256 !== spec.afterHash ||
    proofIds.length !== spec.proofCount ||
    JSON.stringify(proofIds) !== JSON.stringify(binding.proofIds) ||
    historical.length !== spec.beforeBytes || digest(historical) !== spec.beforeHash ||
    live.length !== spec.afterBytes || digest(live) !== spec.afterHash ||
    historical.toString().split(from).length !== 2 ||
    historical.toString().replace(from, spec.to) !== live.toString()) {
    throw new Error(`motion domain-pairs source continuity drift: ${path}`);
  }
  return historical;
}

/** A later exact checker revision may only append the two source bindings. */
export function reviewedDomainPairsChecker(root: string, live: Buffer): Buffer {
  const retained = sharedUiCheckerPredecessor(root, live);
  const proofReaderInput = (retained.length === 111934 &&
      digest(retained) === '7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6') ||
    (retained.length === 111186 &&
      digest(retained) === '4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d')
    ? retained : articleTruthPredecessor(root, retained);
  const predecessor = proofReaderInput.length === 111186 &&
    digest(proofReaderInput) === '4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d'
    ? proofReaderInput : proofReaderPredecessor(root, proofReaderInput);
  const snapshotPath = `${directory}audit-local-basis-before.ts.txt`;
  const historical = readFileSync(join(root, snapshotPath));
  const review = JSON.parse(readFileSync(join(root, directory, 'checker-transition.json'), 'utf8')) as {
    schemaVersion: string; before: Artifact; after: Artifact;
    reviewedBy: string; rationale: string; observedAt: string;
  };
  const fromImport = "import { currentFrontierSafetyArticle, reviewedFrontierChecker } from './audit-frontier-motion-continuity.ts';";
  const toImport = `${fromImport}\nimport { retainedDomainPairSource } from './audit-motion-domain-pairs-continuity.ts';`;
  const fromReader = '  if (ref.path === \'content/frontier/safety-and-assurance.mdx\' &&';
  const toReader = `  if ((ref.path === 'components/interactive/gait-diagram.tsx' &&
    ref.bytes === 16503 && ref.sha256 === '23ebfff6f843bdacde32e0bac3ed77a494ac0da441af43aa27c7ad281fc9763e') ||
    (ref.path === 'components/interactive/training-time-chart.tsx' &&
    ref.bytes === 17843 && ref.sha256 === '4da47ae4cf73f7fe15f1c0347b5df7174e98680a2bc3e97525169e293c017ec8')) {
    return retainedDomainPairSource(root, ref.path, current);
  }
${fromReader}`;
  const before = historical.toString();
  if (review.schemaVersion !== 'motion-domain-pairs-checker-revision-v1' ||
    review.before.path !== snapshotPath ||
    review.before.bytes !== 110673 ||
    review.before.sha256 !== 'a2264881cb17d1c5c54f23c1178c15c4d74fe4561e431fc7fb0a5b52495b6b30' ||
    historical.length !== review.before.bytes || digest(historical) !== review.before.sha256 ||
    review.after.path !== 'lib/audit-local-basis.ts' ||
    review.after.bytes !== predecessor.length || review.after.sha256 !== digest(predecessor) ||
    review.reviewedBy !== 'Batch-2 implementer (not independent acceptance)' ||
    review.rationale?.length < 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() ||
    before.split(fromImport).length !== 2 || before.split(fromReader).length !== 2 ||
    before.replace(fromImport, toImport).replace(fromReader, toReader) !== predecessor.toString()) {
    throw new Error('motion domain-pairs checker continuity drift');
  }
  return historical;
}
