import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassCheckerPredecessor, loadDomainPassCheckerReview } from '../../lib/audit-domain-pass-continuity';
import {
  PARALLEL_LOCAL_CONTINUITY_DIR, keepsParallelLocalObligations, loadParallelLocalCheckerReview,
  loadParallelLocalSourceReview, loadParallelLocalSpecReview, parallelLocalCheckerPredecessor, parallelLocalPredecessor,
  parallelLocalSpecPaths, parallelLocalSuccessorPaths, verifyParallelLocalSource,
} from '../../lib/audit-parallel-local-continuity';
import type { LocalCatalog, LocalPlan, LocalProof } from '../../lib/audit-local-basis';
import { readerFirstPredecessor, readerFirstSuccessorPaths } from '../../lib/audit-reader-first-continuity';
import { RETIRED_LOCAL_BASIS_ARCHIVES, showAt } from './helpers/continuation-merge-ledger';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /parallel local continuity drift/;
const checkerDrift = /parallel local checker continuity drift/;
const blank = { bytes: 0, sha256: '' };
const checkerPath = 'lib/audit-local-basis.ts';

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});
const scratch = (mutate: (path: string) => void, file: string) => {
  const tmp = mkdtempSync(join(tmpdir(), 'parallel-local-continuity-test-'));
  scratchRoots.push(tmp);
  cpSync(join(root, PARALLEL_LOCAL_CONTINUITY_DIR), join(tmp, PARALLEL_LOCAL_CONTINUITY_DIR), { recursive: true });
  mutate(join(tmp, PARALLEL_LOCAL_CONTINUITY_DIR, file));
  return tmp;
};

describe('parallel-local 2026-10-11 checker revision', () => {
  const review = loadParallelLocalCheckerReview(root);
  const checker = read(checkerPath);

  it('hands the domain-pass layer its own checker and passes other bytes through', () => {
    const before = parallelLocalCheckerPredecessor(root, checker);
    expect([checker.length, sha(checker)]).toEqual([review.after.bytes, review.after.sha256]);
    expect([before.length, sha(before)]).toEqual([review.before.bytes, review.before.sha256]);
    const domainPass = loadDomainPassCheckerReview(root);
    expect([review.before.bytes, review.before.sha256]).toEqual([domainPass.after.bytes, domainPass.after.sha256]);
    expect(parallelLocalCheckerPredecessor(root, before)).toBe(before);
    const drifted = Buffer.concat([checker, Buffer.from('\n')]);
    expect(parallelLocalCheckerPredecessor(root, drifted)).toBe(drifted);
    // The domain-pass layer runs this layer first, so both inputs reach the same SEO-pass head.
    expect(domainPassCheckerPredecessor(root, checker)).toEqual(domainPassCheckerPredecessor(root, before));
    expect(review.archivedFrom).toMatch(/^[0-9a-f]{40}$/);
  });

  it('re-pins the live hash of exactly the suites this revision brings up to date', () => {
    const current = checker.toString();
    const before = parallelLocalCheckerPredecessor(root, checker).toString();
    const hash = (text: string, suite: string) => text.slice(text.indexOf(`\n  '${suite}': {\n`))
      .match(/currentTestHash: '([0-9a-f]{64})'/)?.[1];
    for (const suite of parallelLocalSuccessorPaths()) {
      if (hash(before, suite) === undefined) continue;
      expect(hash(current, suite)).toBe(sha(read(suite)));
      expect(hash(before, suite)).toBe(sha(parallelLocalPredecessor(root, { path: suite, ...blank }, read(suite))));
    }
  });

  it('rejects a missing, corrupt or retargeted checker review', () => {
    for (const mode of ['missing', 'corrupt', 'retargeted'] as const) {
      const tmp = scratch(path => {
        if (mode === 'missing') rmSync(path);
        else if (mode === 'corrupt') writeFileSync(path, mode);
        else writeFileSync(path, readFileSync(path, 'utf8')
          .replace(`"bytes": ${review.before.bytes}`, `"bytes": ${review.before.bytes + 1}`));
      }, 'checker-transition.json');
      expect(() => loadParallelLocalCheckerReview(tmp)).toThrow(checkerDrift);
      expect(() => parallelLocalCheckerPredecessor(tmp, checker)).toThrow(checkerDrift);
    }
  });
});

describe('parallel-local 2026-10-11 suite successors', () => {
  const review = loadParallelLocalSourceReview(root);

  it('reviews exactly the suites the rebinding brings up to date', () => {
    expect(parallelLocalSuccessorPaths()).toEqual([
      'tests/unit/classical-closure-evidence.test.ts', 'tests/unit/parallel-local-evidence.test.ts',
    ]);
    expect(review.sources.map(({ after }) => after.path)).toEqual(parallelLocalSuccessorPaths());
  });

  it('rebuilds every reviewed successor into the bytes the older layers still decide', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = parallelLocalPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(parallelLocalPredecessor(root, source.after, live)).toBe(live);
      // The rebuilt suite is the reader-first successor, which that layer still decides.
      expect(readerFirstSuccessorPaths()).toContain(source.after.path);
      expect(readerFirstPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      expect(readerFirstPredecessor(root, { path: source.after.path, ...blank }, live)).toBe(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(parallelLocalPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(parallelLocalPredecessor(root, { path: 'tests/unit/sim2real-local-evidence.test.ts', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyParallelLocalSource(source, drifted)).toThrow(drift);
  });

  it('admits only a suite that keeps at least as many expect and test calls', () => {
    const prior = "it('a', () => {\n  expect(1).toBe(1);\n});\n";
    const grown = `${prior}it('b', () => {\n  expect(2).toBe(2);\n});\n`;
    const path = 'tests/unit/x.test.ts';
    expect(keepsParallelLocalObligations(path, prior, grown)).toBe(true);
    expect(keepsParallelLocalObligations(path, prior, prior)).toBe(false);
    expect(keepsParallelLocalObligations('components/x.tsx', prior, grown)).toBe(false);
    expect(keepsParallelLocalObligations(path, grown, prior)).toBe(false);
    expect(keepsParallelLocalObligations(path, grown, grown.replace('  expect(2).toBe(2);\n', ''))).toBe(false);
    expect(keepsParallelLocalObligations(path, grown, grown.replace("it('b'", "describe('b'"))).toBe(false);
    for (const modifier of ['skip', 'only', 'fixme']) {
      expect(keepsParallelLocalObligations(path, prior, grown.replace("it('b'", `it.${modifier}('b'`))).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed suite review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = scratch(path => {
        if (mode === 'missing') rmSync(path);
        else if (mode === 'corrupt') writeFileSync(path, mode);
        else writeFileSync(path, readFileSync(path, 'utf8').replace('"parallel-local-suites"', '"parallel-local-drift"'));
      }, 'source-transition.json');
      expect(() => loadParallelLocalSourceReview(tmp)).toThrow(drift);
      expect(() => parallelLocalPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});

describe('parallel-local 2026-10-11 end-to-end spec successor', () => {
  const review = loadParallelLocalSpecReview(root);
  const spec = 'tests/e2e/parallel-local-evidence.spec.ts';
  const archive = JSON.parse(read(`${PARALLEL_LOCAL_CONTINUITY_DIR}previous-parallel-plan-and-proofs.json`).toString()) as {
    proofs: LocalProof[];
  };

  it('rebuilds the spec the retired chart\'s observed proofs pin from the live BatchScale spec', () => {
    expect(parallelLocalSpecPaths()).toEqual([spec]);
    expect(review.sources.map(({ after }) => after.path)).toEqual([spec]);
    const live = read(spec);
    const pinned = archive.proofs.filter(proof => proof.kind === 'observed-behavior').map(proof => proof.provenance.test);
    expect(pinned).toHaveLength(6);
    for (const ref of pinned) {
      expect(ref.path).toBe(spec);
      const prior = parallelLocalPredecessor(root, ref, live);
      expect([prior.length, sha(prior)]).toEqual([ref.bytes, ref.sha256]);
    }
    expect(parallelLocalPredecessor(root, review.sources[0].after, live)).toBe(live);
    const drifted = Buffer.concat([live, Buffer.from('\n')]);
    expect(parallelLocalPredecessor(root, review.sources[0].before, drifted)).toBe(drifted);
    expect(() => verifyParallelLocalSource(review.sources[0], drifted)).toThrow(drift);
  });

  it('admits only an end-to-end spec that keeps its expect and test calls and adds no skip, fixme or only', () => {
    const prior = "test('a', async () => {\n  expect(1).toBe(1);\n});\n";
    const grown = `${prior}test('b', async () => {\n  expect(2).toBe(2);\n});\n`;
    expect(keepsParallelLocalObligations(spec, prior, grown)).toBe(true);
    expect(keepsParallelLocalObligations('tests/e2e/helpers/x.spec.ts', prior, grown)).toBe(false);
    expect(keepsParallelLocalObligations('tests/e2e/x.ts', prior, grown)).toBe(false);
    expect(keepsParallelLocalObligations(spec, grown, prior)).toBe(false);
    for (const modifier of ['skip', 'fixme', 'only']) {
      expect(keepsParallelLocalObligations(spec, prior, grown.replace("test('b'", `test.${modifier}('b'`))).toBe(false);
    }
  });

  it('rejects a missing, corrupt or renamed spec review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = scratch(path => {
        if (mode === 'missing') rmSync(path);
        else if (mode === 'corrupt') writeFileSync(path, mode);
        else writeFileSync(path, readFileSync(path, 'utf8').replace('"parallel-local-specs"', '"parallel-local-drift"'));
      }, 'spec-transition.json');
      expect(() => loadParallelLocalSpecReview(tmp)).toThrow(drift);
      expect(() => parallelLocalPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});

describe('parallel18 TrainingTimeChart archive', () => {
  const path = `${PARALLEL_LOCAL_CONTINUITY_DIR}previous-parallel-plan-and-proofs.json`;
  const archive = JSON.parse(read(path).toString()) as { plan: LocalPlan; proofs: LocalProof[] };
  const id = 'parallel-local-p18-20260923';

  it('holds the exact plan and proofs the catalog had before the rebinding', () => {
    // The catalog as rendered at the head the parallel-local revisions start from.
    const before = JSON.parse(showAt(loadParallelLocalCheckerReview(root).archivedFrom, 'audit/local-basis.json')) as LocalCatalog;
    expect(archive).toEqual({ plan: before.plans.find(p => p.id === id), proofs: before.proofs.filter(p => p.planId === id) });
    expect(archive.plan.mounts.map(({ mountId }) => mountId)).toEqual(['mount:/rl-sim2real/parallel-sim-rl/:TrainingTimeChart:1']);
    const counts = ['64', '4096', '16384'];
    expect(archive.proofs.map(proof => proof.id)).toEqual(['p18-parameters',
      ...counts.flatMap(n => [`p18-${n}-off`, `p18-${n}-on`]),
      ...counts.flatMap(n => [`p18-observed-${n}-off`, `p18-observed-${n}-on`])]);
  });

  it('is the archive historical renders take retired proof pins from', () => {
    expect(RETIRED_LOCAL_BASIS_ARCHIVES).toContain(path);
  });
});
