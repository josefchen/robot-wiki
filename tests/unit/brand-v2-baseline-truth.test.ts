import { describe, expect, it } from 'vitest';
import {
  ARTICLE_TRUTH_MANIFEST_KINDS,
  articleTruthMemberId,
  articleTruthPopulation,
  articleTruthVerdicts,
  type ArticleTruthKind,
  type ArticleTruthManifests,
} from '@/lib/brand-v2-baseline-truth';
import {
  buildManifest,
  sha256,
  type ApprovedDelta,
  type JsonValue,
} from '@/lib/brand-v2-baseline';

/**
 * The article-truth half of the immutable baseline, exercised on fixtures
 * small enough to state and mutate.
 *
 * The population here is deliberately four classes wide rather than one, so
 * the namespacing case (two classes that legitimately share a member id) is
 * reachable, and so a fixture cannot pass a clause by having nothing in the
 * class the clause is about.
 */

const ABSENT = sha256('missing');

function manifests(
  values: Partial<Record<ArticleTruthKind, Record<string, JsonValue>>> = {},
): ArticleTruthManifests {
  const defaults: Record<ArticleTruthKind, Record<string, JsonValue>> = {
    'accessible-names': { 'nav:/': { name: 'Home' } },
    'article-metadata': { 'article-metadata:m/a': { citations: ['act'] } },
    prose: { 'article:m/a': { body: 'chunk size is 100' } },
    relationships: { 'article:m/a': { seeAlso: ['m/b'] } },
  };
  return Object.fromEntries(
    ARTICLE_TRUTH_MANIFEST_KINDS.map((kind) => [
      kind,
      buildManifest(
        kind,
        Object.entries({ ...defaults[kind], ...(values[kind] ?? {}) }).map(
          ([id, value]) => ({ id, value }),
        ),
      ),
    ]),
  ) as ArticleTruthManifests;
}

function delta(overrides: Partial<ApprovedDelta>): ApprovedDelta {
  return {
    id: 'fixture-delta',
    manifest: 'prose',
    memberId: 'article:m/a',
    oldHash: ABSENT,
    newHash: ABSENT,
    reason: 'fixture delta naming one exact member',
    ownerApproval: 'owner',
    responsibleMilestone: 'brand-v2-editorial',
    affectedAssertions: ['VAL-B2-BASE-002'],
    disposition: 'permanent',
    ...overrides,
  };
}

function hashOf(
  set: ArticleTruthManifests,
  kind: ArticleTruthKind,
  memberId: string,
): string {
  const member = set[kind].members.find(({ id }) => id === memberId);
  if (!member) throw new Error(`fixture has no ${kind}:${memberId}`);
  return member.hash;
}

describe('brand-v2 article truth', () => {
  it('reports every sealed member as identical when nothing moved', () => {
    const sealed = manifests();
    const verdicts = articleTruthVerdicts({
      baseline: sealed,
      current: manifests(),
      deltas: [],
    });
    expect(verdicts.size).toBe(4);
    expect([...verdicts.values()].every((v) => v.status === 'identical')).toBe(
      true,
    );
    expect(verdicts.get('prose:article:m/a')?.currentHash).toBe(
      hashOf(sealed, 'prose', 'article:m/a'),
    );
  });

  it('keeps two classes that share a member id apart', () => {
    const verdicts = articleTruthVerdicts({
      baseline: manifests(),
      current: manifests(),
      deltas: [],
    });
    expect(verdicts.has('prose:article:m/a')).toBe(true);
    expect(verdicts.has('relationships:article:m/a')).toBe(true);
    expect(articleTruthMemberId('prose', 'article:m/a')).not.toBe(
      articleTruthMemberId('relationships', 'article:m/a'),
    );
  });

  it('refuses a changed article body that no approved delta names', () => {
    expect(() =>
      articleTruthVerdicts({
        baseline: manifests(),
        current: manifests({ prose: { 'article:m/a': { body: 'chunk size is 400' } } }),
        deltas: [],
      }),
    ).toThrow(/prose:article:m\/a \(changed-member\)/);
  });

  it('refuses a changed accessible name that no approved delta names', () => {
    expect(() =>
      articleTruthVerdicts({
        baseline: manifests(),
        current: manifests({
          'accessible-names': { 'nav:/': { name: 'robot-wiki' } },
        }),
        deltas: [],
      }),
    ).toThrow(/accessible-names:nav:\/ \(changed-member\)/);
  });

  it('refuses a changed relationship graph that no approved delta names', () => {
    expect(() =>
      articleTruthVerdicts({
        baseline: manifests(),
        current: manifests({ relationships: { 'article:m/a': { seeAlso: [] } } }),
        deltas: [],
      }),
    ).toThrow(/relationships:article:m\/a \(changed-member\)/);
  });

  it('accepts a changed member the allowlist names, and says which entry', () => {
    const sealed = manifests();
    const current = manifests({
      prose: { 'article:m/a': { body: 'chunk size is 400' } },
    });
    const verdicts = articleTruthVerdicts({
      baseline: sealed,
      current,
      deltas: [
        delta({
          id: 'content-audit-fixture',
          oldHash: hashOf(sealed, 'prose', 'article:m/a'),
          newHash: hashOf(current, 'prose', 'article:m/a'),
          reason: 'the cited ablation reports 400, not 100',
        }),
      ],
    });
    expect(verdicts.get('prose:article:m/a')).toMatchObject({
      status: 'approved-delta',
      deltaId: 'content-audit-fixture',
      deltaReason: 'the cited ablation reports 400, not 100',
    });
  });

  it('refuses a changed member whose delta names a different old value', () => {
    const current = manifests({
      prose: { 'article:m/a': { body: 'chunk size is 400' } },
    });
    expect(() =>
      articleTruthVerdicts({
        baseline: manifests(),
        current,
        deltas: [
          delta({
            oldHash: sha256('some other body'),
            newHash: hashOf(current, 'prose', 'article:m/a'),
          }),
        ],
      }),
    ).toThrow(/changed-member/);
  });

  it('measures a member an approved delta added, rather than skipping it', () => {
    const current = manifests({
      'accessible-names': {
        'literal:components/mdx/mpc-comparison.tsx:aria-label:1': {
          attribute: 'aria-label',
          text: 'MPC comparison table',
        },
      },
    });
    const added = delta({
      id: 'brand-v2-table-scroll-name-fixture',
      manifest: 'accessible-names',
      memberId: 'literal:components/mdx/mpc-comparison.tsx:aria-label:1',
      oldHash: ABSENT,
      newHash: hashOf(
        current,
        'accessible-names',
        'literal:components/mdx/mpc-comparison.tsx:aria-label:1',
      ),
      reason: 'scrollable table wrapper gains an accessible name',
    });
    const population = articleTruthPopulation({
      baseline: manifests(),
      deltas: [added],
    });
    expect(population).toContain(
      'accessible-names:literal:components/mdx/mpc-comparison.tsx:aria-label:1',
    );
    const verdicts = articleTruthVerdicts({
      baseline: manifests(),
      current,
      deltas: [added],
    });
    expect(
      verdicts.get(
        'accessible-names:literal:components/mdx/mpc-comparison.tsx:aria-label:1',
      ),
    ).toMatchObject({ status: 'approved-addition', baselineHash: null });
  });

  it('refuses a member the current tree adds with no allowlist entry', () => {
    expect(() =>
      articleTruthVerdicts({
        baseline: manifests(),
        current: manifests({
          'accessible-names': { 'nav:/glossary/': { name: 'Glossary' } },
        }),
        deltas: [],
      }),
    ).toThrow(/unexpected-member/);
  });

  it('refuses an empty class rather than passing over nothing', () => {
    const emptied = manifests();
    (emptied.prose as { members: unknown[] }).members = [];
    expect(() =>
      articleTruthPopulation({ baseline: emptied, deltas: [] }),
    ).toThrow(/prose baseline manifest is empty/);
  });

  it('quantifies over the four classes the assertion names and no others', () => {
    expect([...ARTICLE_TRUTH_MANIFEST_KINDS]).toEqual([
      'accessible-names',
      'article-metadata',
      'prose',
      'relationships',
    ]);
  });
});
