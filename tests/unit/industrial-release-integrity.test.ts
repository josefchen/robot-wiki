import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import {
  createLocalArtifactReader, loadLocalBasisContext, recomputeLocalDerivation,
  validateLocalBasisPlan, type LocalArtifact, type LocalCatalog,
} from '../../lib/audit-local-basis';
import { sha256 } from '../../lib/brand-v2-baseline';
import { committedSource } from '../helpers/continuation-integration';

const reviewPath = 'audit/evidence/industrial-release-20260923/dependency-review.json';
const review = JSON.parse(readFileSync(reviewPath, 'utf8')) as {
  bindings: Array<{ historical: LocalArtifact; current: LocalArtifact; snapshot: LocalArtifact }>;
};
const catalog: LocalCatalog = JSON.parse(readFileSync('audit/local-basis.json', 'utf8'));
const previous: LocalCatalog = JSON.parse(committedSource('ac65cf4', 'audit/local-basis.json'));
const incoming: LocalCatalog = JSON.parse(committedSource('0a45942', 'audit/local-basis.json'));
const ids = new Set(previous.plans.map(p => p.id));

describe('industrial release preserves both evidence histories', () => {
  it('retains every released plan and proof and appends only the four industrial plans', () => {
    expect(catalog.plans.filter(p => ids.has(p.id))).toEqual(previous.plans);
    expect(catalog.proofs.filter(p => ids.has(p.planId))).toEqual(previous.proofs);
    const added = incoming.plans.filter(p => !ids.has(p.id));
    expect(added.map(p => p.rowOrdinal)).toEqual([9, 10, 32, 33]);
    expect(catalog.plans.filter(p => !ids.has(p.id))).toEqual(added);
    expect(catalog.proofs.filter(p => !ids.has(p.planId)))
      .toEqual(incoming.proofs.filter(p => !ids.has(p.planId)));
  });

  it('recomputes every retained output and validates every original AND obligation', () => {
    const context = loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`));
    for (const proof of catalog.proofs) {
      expect(recomputeLocalDerivation(proof.recipe), proof.id).toEqual(proof.expected);
    }
    for (const plan of catalog.plans) {
      expect(validateLocalBasisPlan(plan, plan.currentCells, plan.id,
        { citationId: '', sourceUrl: '', supportingPassage: '' },
        new Set(CITATIONS.map(c => c.id)), context).failures, plan.id).toEqual([]);
    }
  });

  it('retains exact checkpoint bytes and the one main-only article separator', () => {
    for (const [index, checkpoint] of ['ac65cf4', '0a45942'].entries()) {
      for (const binding of review.bindings.slice(index * 2, index * 2 + 2)) {
        const old = Buffer.from(committedSource(checkpoint, binding.historical.path));
        expect(readFileSync(binding.snapshot.path)).toEqual(old);
        expect(sha256(old)).toBe(binding.historical.sha256);
        expect(createLocalArtifactReader(process.cwd())(binding.historical)).toEqual(old);
      }
    }
    expect(readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8'))
      .toBe(committedSource('0a45942', 'content/data-hardware/industrial-deployment.mdx')
        .replace('note="2021–2024 each above 500k"', 'note="2021-2024 each above 500k"'));
    expect(readFileSync('lib/deployment-economics.ts', 'utf8'))
      .toBe(committedSource('ac65cf4', 'lib/deployment-economics.ts'));
  });

  it('preserves the three old correction records and binds fresh merged reader execution', () => {
    const path = 'audit/evidence/industrial-closure-20260923/corrections.json';
    expect(readFileSync(path, 'utf8')).toBe(committedSource('0a45942', path));
    const old = JSON.parse(readFileSync(path, 'utf8'));
    const current = JSON.parse(readFileSync('audit/evidence/industrial-release-20260923/corrections.json', 'utf8'));
    expect(current.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual([37, 47, 48]);
    for (const [index, record] of current.entries()) {
      for (const key of ['id', 'originalId', 'rowOrdinal', 'kind', 'originalCells',
        'originalTupleDigest', 'snapshot', 'currentCells', 'currentTupleDigest',
        'requiredPresent', 'requiredAbsent']) expect(record[key]).toEqual(old[index][key]);
      expect(record.execution.path).toBe('audit/evidence/industrial-release-20260923/browser-run.json');
      expect(Date.parse(record.review.observedAt)).toBeGreaterThan(Date.parse(old[index].review.observedAt));
    }
    expect(current[2].children).toHaveLength(51);
  });

  it.each(['current', 'snapshot', 'review', 'unknown-hash'] as const)(
    'rejects each reviewed dependency after %s drift', mutation => {
      for (const binding of review.bindings) {
        const root = mkdtempSync(join(tmpdir(), 'industrial-release-test-'));
        const put = (path: string, data: string | Buffer) => {
          mkdirSync(dirname(join(root, path)), { recursive: true });
          writeFileSync(join(root, path), data);
        };
        try {
          for (const path of [reviewPath, binding.current.path, binding.snapshot.path]) put(path, readFileSync(path));
          expect(createLocalArtifactReader(root)(binding.historical)).toEqual(readFileSync(binding.snapshot.path));
          const ref = { ...binding.historical };
          if (mutation === 'current') put(binding.current.path, Buffer.concat([readFileSync(binding.current.path), Buffer.from('\nchanged')]));
          if (mutation === 'snapshot') put(binding.snapshot.path, 'corrupt');
          if (mutation === 'review') put(reviewPath, JSON.stringify({ ...review, bindings: [] }));
          if (mutation === 'unknown-hash') ref.sha256 = '0'.repeat(64);
          expect(() => createLocalArtifactReader(root)(ref)).toThrow();
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  );
});
