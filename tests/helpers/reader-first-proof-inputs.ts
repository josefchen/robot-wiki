/**
 * Input selection for the immutable October reader-first regression only.
 * These twenty proof/data/documentation files have separately reviewed current
 * successors. Replaying their original edits from actual archived Git inputs
 * tests the old review without forcing current tests to serialize themselves
 * into it. This helper is never imported by a production acceptance gate.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadReaderFirstReview, verifyReaderFirstSource, type ReaderFirstSource } from '../../lib/audit-reader-first-continuity';
import { historicalGit } from './historical-git';

export const READER_FIRST_PROOF_REVIEW = 'tests/fixtures/history/reader-first-proof-review.json';
// BEGIN reader-first proof review pin
const reviewPin = {"bytes": 33933, "sha256": "575e7104a26a7af71482c71ba8952eafbbee1ad2b2ebe021a771d0070a74ff41"};
// END reader-first proof review pin
export const READER_FIRST_PROOF_PATHS = [
  'lib/chart-descriptions.ts',
  'library/design-system.md',
  'scripts/brand-v2-census.ts',
  'scripts/brand-v2-enforcement.ts',
  'tests/component/chart-primitives.test.tsx',
  'tests/component/hand-eye-poses.test.tsx',
  'tests/component/retargeting-gap.test.tsx',
  'tests/e2e/chart-table-agreement.spec.ts',
  'tests/e2e/predict-then-reveal.spec.ts',
  'tests/e2e/safety-and-assurance.spec.ts',
  'tests/unit/brand-v2-annotation-scan.test.ts',
  'tests/unit/main-merge-approved-deltas.test.ts',
  'tests/unit/motion-data-hardware.test.ts',
  'tests/unit/motion-frontier-adjacent-home.test.ts',
  'tests/unit/motion-world-models-continuity.test.ts',
  'tests/unit/reader-release-integration.test.ts',
  'tests/component/egoscale-scaling.test.tsx',
  'tests/unit/classical-closure-evidence.test.ts',
  'tests/unit/content-integration-20260923.test.ts',
  'tests/unit/robomind-hours-evidence.test.ts',
] as const;
const paths = new Set<string>(READER_FIRST_PROOF_PATHS);
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const drift = 'reader-first historical proof input drift';
type Artifact = { path: string; bytes: number; sha256: string };
type ProofEntry = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  reviewSourceSha256: string;
  current: Artifact;
  reason: string;
  coverage: Array<{ path: string; obligations: string[] }>;
};
type ProofReview = {
  schemaVersion: 'reader-first-historical-proof-inputs-v1';
  rationale: string;
  historicalReview: Artifact;
  entries: ProofEntry[];
};
const same = (ref: Artifact, bytes: Buffer) => ref.bytes === bytes.length && ref.sha256 === sha(bytes);

export function loadReaderFirstProofReview(root: string): ProofReview {
  const bytes = readFileSync(join(root, READER_FIRST_PROOF_REVIEW));
  if (!same({ path: READER_FIRST_PROOF_REVIEW, ...reviewPin }, bytes)) throw new Error(drift);
  const review = JSON.parse(bytes.toString('utf8')) as ProofReview;
  if (review.schemaVersion !== 'reader-first-historical-proof-inputs-v1' || review.rationale.length < 100 ||
    review.historicalReview.path !== 'audit/evidence/reader-first-20261002/source-transition.json' ||
    !same(review.historicalReview, readFileSync(join(root, review.historicalReview.path))) ||
    review.entries.length !== paths.size || new Set(review.entries.map((entry) => entry.current.path)).size !== paths.size) {
    throw new Error(drift);
  }
  const historical = loadReaderFirstReview(root);
  for (const entry of review.entries) {
    const source = historical.sources.find(({ after }) => after.path === entry.current.path);
    if (!paths.has(entry.current.path) || !source || entry.reason.length < 80 ||
      entry.archivedFrom !== source.archivedFrom ||
      JSON.stringify(entry.before) !== JSON.stringify(source.before) ||
      JSON.stringify(entry.after) !== JSON.stringify(source.after) ||
      entry.reviewSourceSha256 !== sha(JSON.stringify(source)) ||
      !entry.coverage.length || entry.coverage.some((coverage) =>
        !/^(tests|scripts)\/[\w./-]+\.(ts|tsx)$/.test(coverage.path) ||
        !coverage.obligations.length || coverage.obligations.some((obligation) => obligation.length < 20))) {
      throw new Error(drift);
    }
  }
  return review;
}

/** Replay only the original reviewed edits over the independently archived before bytes. */
export function replayReaderFirstProofInput(source: ReaderFirstSource, prior: Buffer): Buffer {
  if (!same(source.before, prior)) throw new Error(`${drift}: original input`);
  let text = prior.toString('utf8');
  for (const edit of source.edits) {
    const pieces = text.split(edit.before);
    if (!edit.before || pieces.length !== 2) throw new Error(`${drift}: original edit`);
    text = pieces.join(edit.after);
  }
  const successor = Buffer.from(text);
  if (!same(source.after, successor) || !verifyReaderFirstSource(source, successor).equals(prior)) {
    throw new Error(`${drift}: original replay`);
  }
  return successor;
}

export function readerFirstProofInput(root: string, path: string, current: Buffer): Buffer {
  // No regex exemption: every other source still goes through its live chain.
  if (!paths.has(path)) return current;
  const review = loadReaderFirstProofReview(root);
  const entry = review.entries.find(({ current }) => current.path === path)!;
  if (!same(entry.current, current)) throw new Error(`${drift}: current successor ${path}`);
  for (const coverage of entry.coverage) {
    const source = readFileSync(join(root, coverage.path), 'utf8');
    if (coverage.obligations.some((obligation) => !source.includes(obligation))) {
      throw new Error(`${drift}: successor coverage ${coverage.path}`);
    }
  }
  const original = loadReaderFirstReview(root).sources.find(({ after }) => after.path === path)!;
  // Deliberately raw: a vocabulary-rendered input cannot satisfy an original hash.
  const prior = historicalGit(['show', `${entry.archivedFrom}:${path}`], { cwd: root });
  return replayReaderFirstProofInput(original, prior);
}
