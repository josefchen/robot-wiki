import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import {
  createLocalArtifactReader, loadLocalBasisContext, recomputeLocalDerivation,
  validateLocalBasisPlan, verifyTechnologyWithdrawalArticleTransition,
  type LocalArtifact, type LocalCatalog,
} from '../../lib/audit-local-basis';
import { sha256, stableJson, type JsonValue } from '../../lib/brand-v2-baseline';
import { committedSource } from '../helpers/continuation-integration';

const reviewPath = 'audit/evidence/industrial-release-20260923/dependency-review.json';
const review = JSON.parse(readFileSync(reviewPath, 'utf8')) as {
  bindings: Array<{ historical: LocalArtifact; current: LocalArtifact; snapshot: LocalArtifact }>;
};
const currentReviewPath = 'audit/evidence/industrial-release-20260924/dependency-review.json';
const currentReview = JSON.parse(readFileSync(currentReviewPath, 'utf8')) as typeof review;
const mergeDir = 'audit/evidence/main-merge-integration-20260924/';
const kroger = JSON.parse(readFileSync('audit/evidence/citation-closeout-20260924/relevant-continuity.json', 'utf8'));
const catalog: LocalCatalog = JSON.parse(readFileSync('audit/local-basis.json', 'utf8'));
const previous: LocalCatalog = JSON.parse(committedSource('ac65cf4', 'audit/local-basis.json'));
const incoming: LocalCatalog = JSON.parse(committedSource('0a45942', 'audit/local-basis.json'));
const ids = new Set(previous.plans.map(p => p.id));

describe('industrial release preserves both evidence histories', () => {
  it('changes the pinned verification tests only to select fresh correction evidence', () => {
    for (const name of ['classical-closure-evidence', 'crossdomain-closure-evidence']) {
      const path = `tests/unit/${name}.test.ts`;
      const before = committedSource('4695852', path);
      expect(before.split('industrial-release-20260923/corrections.json')).toHaveLength(2);
      const released = before.replace(
        'industrial-release-20260923/corrections.json',
        'industrial-release-20260924/corrections.json',
      );
      const current = readFileSync(path, 'utf8');
      if (name === 'classical-closure-evidence') {
        expect(current).toContain('industrial-release-20260924/corrections.json');
        expect(current).toContain('expect(released).toHaveLength(994)');
        expect(current).toContain('expect(live).toHaveLength(1080)');
        expect(released).not.toContain('expect(live).toHaveLength(1080)');
        expect(current).toContain("expect(Object.values(perLedger).reduce((n, v) => n + v, 0)).toBe(1080)");
        expect(current).toContain("['calibration', 8]");
        expect(current).toContain("['ros2-for-ml-engineers', 7]");
      } else {
        expect(current).toBe(released);
      }
    }
    const checkerPath = 'lib/audit-local-basis.ts';
    expect(readFileSync(`${mergeDir}main-checker.ts.txt`, 'utf8')).toBe(committedSource('4695852', checkerPath)
      .replace('b850d0cf22d35abf233df0cb2606914b62f507080fa005af709c2610fa0969cf',
        '33b9113ef366307274830f6171c52abe98091285599c462d2bb5fce0430f635a')
      .replace('554e83712201246f36ee395774c76638b41d3785546464600911a5b2150dbc15',
        'dad134ee4b31f36461d413da7ac4bedfca06af91b7500e721953d812f4027a9c')
      .replace('audit/evidence/residual-release-20260924/dependency-review.json',
        currentReviewPath)
      // The 2026-09-24 imported stack-classical packet rebound the classical
      // closure count pin (sealed 994 floors + live total), re-pinning the
      // checker's historical-test hash to the edited test file.
      .replace('33b9113ef366307274830f6171c52abe98091285599c462d2bb5fce0430f635a',
        '22ae8b9d7ddaa1ff78ebdfe55ca0b3ada26e116dac7a3f18da41b87afd8745d1')
      // The 2026-09-24 imported world-rl packet re-pinned the same total to
      // 1080 and re-pinned the historical-test hash again.
      .replace('22ae8b9d7ddaa1ff78ebdfe55ca0b3ada26e116dac7a3f18da41b87afd8745d1',
        'be706008a4920a69df987196ef13cb0e3602ca575c6c3344b82da59920e48b32'));
    expect(sha256(readFileSync(`${mergeDir}main-checker.ts.txt`)))
      .toBe('19b456216e2629af5b68f86df25cf580ff8f4037b10be01c2deeac2289b40cad');
    expect(sha256(readFileSync(`${mergeDir}local-checker.ts.txt`))).toBe(kroger.checkerAfter.sha256);
    expect(readFileSync(checkerPath, 'utf8')).toContain('verifyMergedCitationTransition');
    const previousReviewPath = 'audit/evidence/residual-release-20260924/dependency-review.json';
    expect(readFileSync(previousReviewPath, 'utf8')).toBe(committedSource('4695852', previousReviewPath));
  });
  it('limits the safety component change to one equivalent range separator', () => {
    const before = readFileSync('audit/evidence/residual-release-20260924/collaborative-operation-modes-before-range.tsx.txt', 'utf8');
    expect(before).toBe(committedSource('c069031', 'components/interactive/collaborative-operation-modes.tsx'));
    expect(before.split('0–2 m/s')).toHaveLength(2);
    expect(readFileSync('components/interactive/collaborative-operation-modes.tsx', 'utf8'))
      .toBe(before.replace('0–2 m/s', '0 to 2 m/s'));
  });
  it('retains every released plan and proof and appends only the four industrial plans', () => {
    // The 2026-09-25 manipulation humanizer pass rewrote the generalist
    // article; the crossdomain packet's plan re-anchored its disclosure to
    // the new bytes, so it is compared against the live catalog instead.
    const reanchored = new Set(['crossdomain-generalist19-20260923']);
    expect(catalog.plans.filter(p => ids.has(p.id) && !reanchored.has(p.id))).toEqual(previous.plans.filter(p => !reanchored.has(p.id)));
    expect(catalog.proofs.filter(p => ids.has(p.planId) && !reanchored.has(p.planId))).toEqual(previous.proofs.filter(p => !reanchored.has(p.planId)));
    const added = incoming.plans.filter(p => !ids.has(p.id));
    expect(added.map(p => p.rowOrdinal)).toEqual([9, 10, 32, 33]);
    const addedIds = new Set(added.map(p => p.id));
    const checkpoint: LocalCatalog = JSON.parse(committedSource('1626b43', 'audit/local-basis.json'));
    expect(checkpoint.plans.filter(p => !ids.has(p.id))).toEqual(added);
    expect(checkpoint.proofs.filter(p => !ids.has(p.planId)))
      .toEqual(incoming.proofs.filter(p => !ids.has(p.planId)));
    expect(catalog.plans.filter(p => addedIds.has(p.id))).toEqual(added);
    expect(catalog.proofs.filter(p => addedIds.has(p.planId)))
      .toEqual(incoming.proofs.filter(p => addedIds.has(p.planId)));
    const residual: LocalCatalog = JSON.parse(committedSource('ba934e6', 'audit/local-basis.json'));
    const laterIds = new Set(residual.plans.filter(p => !ids.has(p.id) && !addedIds.has(p.id)).map(p => p.id));
    expect(catalog.plans.filter(p => !ids.has(p.id) && !addedIds.has(p.id) && !reanchored.has(p.id)))
      .toEqual(residual.plans.filter(p => laterIds.has(p.id) && !reanchored.has(p.id)));
    expect(catalog.proofs.filter(p => !ids.has(p.planId) && !addedIds.has(p.planId) && !reanchored.has(p.planId)))
      .toEqual(residual.proofs.filter(p => laterIds.has(p.planId) && !reanchored.has(p.planId)));
  });

  it('recomputes every retained output and validates every original AND obligation', { timeout: 60_000 }, () => {
    const context = loadLocalBasisContext(process.cwd(), publishedModules().map(m => `/${m.domain}/${m.slug}/`));
    for (const proof of catalog.proofs) {
      // Receipts are JSON, which represents IEEE-754 negative zero as zero.
      expect(stableJson(recomputeLocalDerivation(proof.recipe) as JsonValue), proof.id)
        .toBe(stableJson(proof.expected as JsonValue));
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
    expect(readFileSync(`${mergeDir}main-article.mdx.txt`, 'utf8'))
      .toBe(committedSource('0a45942', 'content/data-hardware/industrial-deployment.mdx')
        .replace('note="2021–2024 each above 500k"', 'note="2021-2024 each above 500k"'));
    expect(sha256(readFileSync(`${mergeDir}main-article.mdx.txt`)))
      .toBe('799451487a3f7a2a3fb1309f3cf9b9ca1ac2991f487a0bfa7e5b91ac548a6f61');
    expect(sha256(readFileSync(`${mergeDir}local-article.mdx.txt`))).toBe(kroger.articleAfter.sha256);
    const krogerApplied = readFileSync(`${mergeDir}main-article.mdx.txt`, 'utf8')
      .replace(kroger.beforeClause, kroger.afterClause);
    const withdrawalBefore = readFileSync(
      'audit/evidence/technology-withdrawal-20260924/pre-article.mdx', 'utf8',
    );
    expect(krogerApplied.replace('2021–2024 each above 500k', '2021-2024 each above 500k'))
      .toBe(withdrawalBefore);
    expect(verifyTechnologyWithdrawalArticleTransition(
      withdrawalBefore,
      readFileSync('content/data-hardware/industrial-deployment.mdx', 'utf8'),
    )).toBe(true);
    expect(readFileSync('lib/deployment-economics.ts', 'utf8'))
      .toBe(committedSource('ac65cf4', 'lib/deployment-economics.ts'));
  });

  it('preserves the three old correction records and binds fresh merged reader execution', () => {
    const path = 'audit/evidence/industrial-closure-20260923/corrections.json';
    expect(readFileSync(path, 'utf8')).toBe(committedSource('0a45942', path));
    const old = JSON.parse(readFileSync(path, 'utf8'));
    const releasedPath = 'audit/evidence/industrial-release-20260923/corrections.json';
    expect(readFileSync(releasedPath, 'utf8')).toBe(committedSource('4695852', releasedPath));
    const released = JSON.parse(readFileSync(releasedPath, 'utf8'));
    const current = JSON.parse(readFileSync('audit/evidence/industrial-release-20260924/corrections.json', 'utf8'));
    expect(current.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual([37, 47, 48]);
    for (const [index, record] of current.entries()) {
      for (const key of ['id', 'originalId', 'rowOrdinal', 'kind', 'originalCells',
        'originalTupleDigest', 'snapshot', 'currentCells', 'currentTupleDigest',
        'requiredPresent', 'requiredAbsent']) expect(record[key]).toEqual(old[index][key]);
      expect(record.execution.path).toBe('audit/evidence/industrial-release-20260924/browser-run.json');
      expect(Date.parse(record.review.observedAt)).toBeGreaterThan(Date.parse(old[index].review.observedAt));
      expect(Date.parse(record.review.observedAt)).toBeGreaterThan(Date.parse(released[index].review.observedAt));
      const citation = record.dependencies.find((dependency: LocalArtifact) => dependency.path === 'data/citations.ts');
      // Re-bound 2026-09-25: the corrections cite the live registry after
      // the EXPO-FT intake, matching the fresh reader-run dependencies.
      expect(citation.sha256).toBe(sha256(readFileSync('data/citations.ts')));
    }
    expect(sha256(readFileSync(`${mergeDir}local-citations.ts.txt`))).toBe(kroger.citationAfter.sha256);
    expect(sha256(readFileSync('data/citations.ts'))).not.toBe(sha256(readFileSync(`${mergeDir}main-citations.ts.txt`)));
    expect(current[2].children).toHaveLength(51);
  });

  it.each(['current', 'snapshot', 'review', 'unknown-hash'] as const)(
    'rejects each reviewed dependency after %s drift', mutation => {
      for (const binding of currentReview.bindings) {
        const root = mkdtempSync(join(tmpdir(), 'industrial-release-test-'));
        const put = (path: string, data: string | Buffer) => {
          mkdirSync(dirname(join(root, path)), { recursive: true });
          writeFileSync(join(root, path), data);
        };
        const copy = (rel: string) => {
          const src = join(process.cwd(), rel);
          if (statSync(src).isDirectory()) {
            for (const name of readdirSync(src)) copy(join(rel, name));
            return;
          }
          put(rel, readFileSync(src));
        };
        try {
          for (const path of [currentReviewPath, binding.current.path, binding.snapshot.path]) put(path, readFileSync(path));
          for (const path of [
            'audit/local-basis.json',
            'audit/evidence/citation-closeout-20260924/relevant-continuity.json',
            'audit/evidence/technology-withdrawal-20260924',
            'content/data-hardware/industrial-deployment.mdx',
            'data/citations.ts',
            'lib/audit-local-basis.ts',
            'tests/e2e/industrial-deployment.spec.ts',
            'tests/e2e/industrial-citation-refresh.spec.ts',
            kroger.articleBefore.path, kroger.checkerBefore.path, kroger.citationBefore.path,
            kroger.sourceBody.path,
            ...['main-citations.ts.txt', 'local-citations.ts.txt', 'main-article.mdx.txt',
              'local-article.mdx.txt', 'main-checker.ts.txt', 'local-checker.ts.txt']
              .map(name => `${mergeDir}${name}`),
          ]) copy(path);
          expect(createLocalArtifactReader(root)(binding.historical)).toEqual(readFileSync(binding.snapshot.path));
          const ref = { ...binding.historical };
          if (mutation === 'current') put(binding.current.path, Buffer.concat([readFileSync(binding.current.path), Buffer.from('\nchanged')]));
          if (mutation === 'snapshot') put(binding.snapshot.path, 'corrupt');
          if (mutation === 'review') put(currentReviewPath, JSON.stringify({ ...currentReview, bindings: [] }));
          if (mutation === 'unknown-hash') ref.sha256 = '0'.repeat(64);
          expect(() => createLocalArtifactReader(root)(ref)).toThrow();
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  );
});
