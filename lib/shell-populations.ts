/**
 * Canonical populations for the desktop shell and navigation assertions.
 *
 * Two of the three genuinely quantify over routes. `VAL-B2-SHELL-002` is a
 * claim about what each route exposes as its current-route state, and
 * `VAL-B2-SHELL-003` is a claim about the first keyboard destination on each
 * route, so both keep the public-route population.
 *
 * `VAL-B2-SHELL-005` does not. It is a claim about navigation destinations:
 * the hierarchy, the accessible names, and the hrefs the taxonomy resolves.
 * Recording it per public route would emit sixty-one `passed` rows for a
 * claim about sixty navigation entries, and the two populations are not even
 * the same size, which is the proxy-population failure R8(a) names. Its
 * members are the sealed navigation baseline entries, so each row is
 * evidence about the destination it is named for.
 */
export const SHELL_NAV_DESTINATION_POPULATION_SOURCE =
  'evidence/brand-v2/baseline/baseline.json#manifests.navigation';

export const SHELL_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-SHELL-005': SHELL_NAV_DESTINATION_POPULATION_SOURCE,
};

export type NavigationBaselineMember = {
  id: string;
  /** The hash the rendered entry has to reproduce today. */
  hash: string;
  /** The hash sealed at baseline creation, before any approved change. */
  sealedHash: string;
  /** The approved delta that moved this member, when one exists. */
  approvedDeltaId: string | null;
};

/**
 * The sealed navigation destinations, read from the immutable baseline
 * rather than from the fixture the baseline was built from: the fixture is a
 * working file a worker can regenerate, and the baseline is the record that
 * a regeneration has to be approved against.
 *
 * `VAL-B2-SHELL-005` allows exactly one kind of change, the visible product
 * lockup string, and the repository already expresses that allowance as an
 * approved delta rather than as a hole in the assertion. So the expected
 * hash is the sealed one unless an approved delta names this member, in
 * which case it is that delta's new hash: an unapproved rename still fails,
 * and the approval is a reviewable entry rather than a special case in code.
 */
export function navigationBaselineMembers(
  baseline: unknown,
  approvedDeltas?: unknown,
): NavigationBaselineMember[] {
  const manifests = (
    baseline as {
      manifests?: Record<
        string,
        { members?: Array<{ id: string; hash: string }> }
      >;
    }
  )?.manifests;
  const members = manifests?.navigation?.members ?? [];
  if (members.length === 0) {
    throw new Error(
      'the immutable baseline records no navigation members: VAL-B2-SHELL-005 would quantify over an empty population',
    );
  }
  const entries =
    (
      approvedDeltas as {
        entries?: Array<{
          id: string;
          manifest: string;
          memberId: string;
          oldHash: string;
          newHash: string;
        }>;
      }
    )?.entries ?? [];
  const approved = new Map(
    entries
      .filter(({ manifest }) => manifest === 'navigation')
      .map((entry) => [entry.memberId, entry]),
  );
  return members
    .map(({ id, hash }) => {
      const delta = approved.get(id);
      if (delta && delta.oldHash !== hash) {
        throw new Error(
          `the approved delta ${delta.id} claims to move ${id} from a hash the baseline does not record`,
        );
      }
      return {
        id,
        hash: delta?.newHash ?? hash,
        sealedHash: hash,
        approvedDeltaId: delta?.id ?? null,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}
