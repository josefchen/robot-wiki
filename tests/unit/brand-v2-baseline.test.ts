import { describe, expect, it } from 'vitest';
import {
  assertAdditiveBaseline,
  BASELINE_KINDS,
  buildManifest,
  compareBaseline,
  validateApprovedDeltas,
  validateValueStateSeparation,
  type ApprovedDelta,
  type BaselineBundle,
  type BaselineKind,
} from '@/lib/brand-v2-baseline';

function fixtureBundle(): BaselineBundle {
  const manifests = Object.fromEntries(
    BASELINE_KINDS.map((kind) => [
      kind,
      buildManifest(kind, [
        { id: `${kind}:alpha`, value: { label: 'alpha' } },
        { id: `${kind}:beta`, value: { label: 'beta' } },
      ]),
    ]),
  ) as BaselineBundle['manifests'];

  return {
    schemaVersion: 1,
    source: {
      commit: 'a'.repeat(40),
      tree: 'b'.repeat(40),
      trackedWorktreeClean: true,
    },
    tools: {
      node: 'v22.22.3',
      npm: '10.9.8',
      playwright: '1.62.1',
      next: '16.3.0',
      typescript: '7.0.2',
      vitest: '4.1.10',
      lockfileSha256: 'c'.repeat(64),
    },
    manifests,
    manifestRoots: Object.fromEntries(
      BASELINE_KINDS.map((kind) => [kind, manifests[kind].rootHash]),
    ) as Record<BaselineKind, string>,
    rootHash: 'd'.repeat(64),
  };
}

describe('brand-v2 immutable baseline', () => {
  it('builds deterministic manifests independent of input order', () => {
    const forward = buildManifest('routes', [
      { id: 'route:/b/', value: { path: '/b/' } },
      { id: 'route:/a/', value: { path: '/a/' } },
    ]);
    const reverse = buildManifest('routes', [
      { id: 'route:/a/', value: { path: '/a/' } },
      { id: 'route:/b/', value: { path: '/b/' } },
    ]);

    expect(reverse).toEqual(forward);
  });

  it.each(BASELINE_KINDS)(
    'fails with a tagged omission when one %s member is deleted',
    (kind) => {
      const baseline = fixtureBundle();
      const current = structuredClone(baseline);
      current.manifests[kind].members.pop();
      current.manifests[kind] = buildManifest(
        kind,
        current.manifests[kind].members.map((member) => ({
          id: member.id,
          value: member.value!,
        })),
      );

      const result = compareBaseline(baseline, current, []);
      expect(result.ok).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          assertionId:
            kind === 'value-states' ? 'VAL-B2-BASE-013' : 'VAL-B2-BASE-011',
          manifest: kind,
          memberId: `${kind}:beta`,
          reason: 'missing-member',
        }),
      );
    },
  );

  it.each([
    ['routes', 'route:/article/'],
    ['prose', 'article:domain/article'],
    ['relationships', 'article:domain/article'],
    ['navigation', 'nav:/article/'],
    ['market-playground', 'company:example'],
    ['market-playground', 'playground-source:lib/trajectory.ts'],
    ['assets-svg', 'registered-image:example'],
    ['assets-svg', 'public-svg:example.svg'],
    ['interactive-sources-mounts', 'source:components/interactive/example.tsx'],
    ['interactive-sources-mounts', 'mount:content/domain/article.mdx:Example:1'],
    ['behavioral-defaults', 'default:Example:1'],
    ['value-states', 'state:undisclosed-canonical'],
    ['article-metadata', 'article-metadata:domain/article'],
  ] satisfies Array<[BaselineKind, string]>)(
    'detects the required %s omission fixture %s',
    (kind, omittedId) => {
      const baseline = fixtureBundle();
      baseline.manifests[kind] = buildManifest(kind, [
        { id: omittedId, value: { protected: true } },
        { id: `${kind}:control`, value: { protected: true } },
      ]);
      const current = structuredClone(baseline);
      current.manifests[kind] = buildManifest(kind, [
        { id: `${kind}:control`, value: { protected: true } },
      ]);

      expect(compareBaseline(baseline, current, []).failures).toContainEqual(
        expect.objectContaining({
          assertionId:
            kind === 'value-states' ? 'VAL-B2-BASE-013' : 'VAL-B2-BASE-011',
          manifest: kind,
          memberId: omittedId,
          reason: 'missing-member',
        }),
      );
    },
  );

  it('accepts only an exact assertion-linked approved delta', () => {
    const baseline = fixtureBundle();
    const current = structuredClone(baseline);
    current.manifests.routes = buildManifest('routes', [
      { id: 'routes:alpha', value: { label: 'alpha' } },
      { id: 'routes:beta', value: { label: 'changed' } },
    ]);
    const oldMember = baseline.manifests.routes.members[1];
    const newMember = current.manifests.routes.members[1];
    const delta: ApprovedDelta = {
      id: 'brand-string-route-beta',
      manifest: 'routes',
      memberId: 'routes:beta',
      oldHash: oldMember.hash,
      newHash: newMember.hash,
      reason: 'Exact public brand-string migration.',
      ownerApproval: 'mission-owner:brand-v2-contract',
      responsibleMilestone: 'brand-v2-shell-home',
      affectedAssertions: ['VAL-B2-BASE-012', 'VAL-B2-ID-001'],
      disposition: 'permanent',
    };

    expect(validateApprovedDeltas([delta])).toEqual([]);
    expect(compareBaseline(baseline, current, [delta])).toEqual({
      ok: true,
      failures: [],
      approvedDifferences: [delta.id],
    });
  });

  it('rejects wildcard, broad, unowned, or unlinked delta entries', () => {
    const invalid = {
      id: 'visual-redesign',
      manifest: 'routes',
      memberId: '*',
      oldHash: '*',
      newHash: '*',
      reason: 'visual redesign',
      ownerApproval: '',
      responsibleMilestone: '',
      affectedAssertions: [],
      disposition: 'permanent',
    } satisfies ApprovedDelta;

    expect(validateApprovedDeltas([invalid]).map((failure) => failure.field))
      .toEqual(
        expect.arrayContaining([
          'memberId',
          'oldHash',
          'newHash',
          'reason',
          'ownerApproval',
          'responsibleMilestone',
          'affectedAssertions',
        ]),
      );
  });

  it('keeps published, not-disclosed, and n/a as distinct states', () => {
    expect(
      validateValueStateSeparation([
        { id: 'published', state: 'published', rendered: '42' },
        {
          id: 'undisclosed',
          state: 'not-disclosed',
          rendered: 'not disclosed',
        },
        { id: 'inapplicable', state: 'not-applicable', rendered: 'n/a' },
      ]),
    ).toEqual([]);
  });

  it('fails when not disclosed and n/a collapse to the same rendering', () => {
    expect(
      validateValueStateSeparation([
        {
          id: 'undisclosed',
          state: 'not-disclosed',
          rendered: 'not disclosed',
        },
        {
          id: 'inapplicable',
          state: 'not-applicable',
          rendered: 'not disclosed',
        },
      ]),
    ).toContainEqual(
      expect.objectContaining({
        assertionId: 'VAL-B2-BASE-013',
        reason: 'collapsed-value-states',
      }),
    );
  });

  it.each([
    ['not-disclosed', 'n/a'],
    ['not-applicable', 'not disclosed'],
  ] as const)(
    'fails when the derived %s population is empty',
    (missingState, otherRendering) => {
      const otherState =
        missingState === 'not-disclosed' ? 'not-applicable' : 'not-disclosed';
      expect(
        validateValueStateSeparation([
          {
            id: 'remaining-site',
            state: otherState,
            rendered: otherRendering,
          },
        ]),
      ).toContainEqual(
        expect.objectContaining({
          assertionId: 'VAL-B2-BASE-013',
          expected: `non-empty ${missingState} population`,
          actual: 0,
          reason: 'empty-value-state-population',
        }),
      );
    },
  );

  it.each([
    ['value-states', 'VAL-B2-BASE-013'],
    ['article-metadata', 'VAL-B2-BASE-012'],
  ] as const)(
    'tags changed %s members with %s',
    (kind, assertionId) => {
      const baseline = fixtureBundle();
      const current = structuredClone(baseline);
      current.manifests[kind] = buildManifest(kind, [
        { id: `${kind}:alpha`, value: { label: 'changed' } },
        { id: `${kind}:beta`, value: { label: 'beta' } },
      ]);

      expect(compareBaseline(baseline, current, []).failures).toContainEqual(
        expect.objectContaining({
          assertionId,
          manifest: kind,
          memberId: `${kind}:alpha`,
          reason: 'changed-member',
        }),
      );
    },
  );

  it('accepts recreation only when all existing member hashes are preserved', () => {
    const previous = fixtureBundle();
    const recreated = structuredClone(previous);
    recreated.manifests['value-states'] = buildManifest('value-states', [
      ...recreated.manifests['value-states'].members.map((member) => ({
        id: member.id,
        value: member.value!,
      })),
      { id: 'state-site:lib/example.ts:not-disclosed:1', value: { state: 'not-disclosed' } },
    ]);

    expect(assertAdditiveBaseline(previous, recreated)).toEqual({
      addedKinds: [],
      addedMembers: 1,
    });

    recreated.manifests.routes = buildManifest('routes', [
      { id: 'routes:alpha', value: { label: 'changed' } },
      { id: 'routes:beta', value: { label: 'beta' } },
    ]);
    expect(() => assertAdditiveBaseline(previous, recreated)).toThrow(
      /changed pre-existing member routes:routes:alpha/,
    );
  });

  it('rejects recreation when a previously persisted kind is no longer registered', () => {
    const previous = fixtureBundle();
    const recreated = structuredClone(previous);
    (
      previous.manifests as unknown as Record<
        string,
        BaselineBundle['manifests'][BaselineKind]
      >
    )['legacy-kind'] = buildManifest('routes', [
      { id: 'legacy:member', value: { protected: true } },
    ]);

    expect(() => assertAdditiveBaseline(previous, recreated)).toThrow(
      /removed baseline kind legacy-kind/,
    );
  });
});
