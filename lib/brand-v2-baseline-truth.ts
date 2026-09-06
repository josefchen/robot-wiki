import {
  compareBaseline,
  sha256,
  type ApprovedDelta,
  type BaselineBundle,
  type BaselineKind,
  type BaselineManifest,
} from './brand-v2-baseline.ts';

/**
 * The article-truth half of the immutable migration baseline: the evidence
 * `VAL-B2-BASE-002` is decided on.
 *
 * The sealed baseline carries eleven manifest classes and every one of them
 * is compared on every run, but they are not all evidence for the same
 * claim. `VAL-B2-BASE-002` is a claim about what a reader of an article
 * gets — "visible article prose, accessible names, factual claims, citation
 * targets/source labels/dates/quantities, References, See also, and Linked
 * from relationships" — and each clause of that sentence names a class:
 *
 * - "visible article prose" -> `prose`, the body of every published MDX file
 * - "accessible names" -> `accessible-names`, the nav fixture plus every
 *   `aria-label`/`aria-labelledby`/`alt`/`title` literal in app, components
 *   and content
 * - "factual claims, citation targets/source labels/dates/quantities" ->
 *   `article-metadata`, the per-article registry record
 * - "References, See also, and Linked from relationships" ->
 *   `relationships`, the per-article citation, term, see-also and internal
 *   link graph
 *
 * The other seven classes are evidence for their own rows and stay there:
 * `routes` for `VAL-B2-BASE-001`, `navigation` and `behavioral-defaults` for
 * `VAL-B2-BASE-006`, `market-playground` for `VAL-B2-BASE-003`/`-004`,
 * `value-states` for `VAL-B2-BASE-005`/`-013`, `assets-svg` and
 * `interactive-sources-mounts` for the rows that quantify over assets and
 * instrument sources. Recording a green `VAL-B2-BASE-002` member for a
 * restyled `components/interactive/*.tsx` source would be a pass for a
 * member the assertion never quantified over; recording a red one would
 * fail article truth for a file no reader reads. Neither is this row's
 * business, and none of those classes becomes unowned by being left out:
 * they are still compared, still tagged, and still carried by the rows whose
 * sentences name them.
 */
export const ARTICLE_TRUTH_MANIFEST_KINDS = [
  'accessible-names',
  'article-metadata',
  'prose',
  'relationships',
] as const satisfies readonly BaselineKind[];

export type ArticleTruthKind = (typeof ARTICLE_TRUTH_MANIFEST_KINDS)[number];

export const ARTICLE_TRUTH_POPULATION_SOURCE =
  'evidence/brand-v2/baseline/baseline.json#manifests:article-truth';

export type ArticleTruthManifests = Record<ArticleTruthKind, BaselineManifest>;

/**
 * One population member. The class is part of the id because two classes
 * legitimately hold the same member id: `prose` and `relationships` are both
 * keyed by `article:<domain>/<slug>`, and a population that collapsed them
 * would silently measure one article twice and another never.
 */
export function articleTruthMemberId(
  kind: ArticleTruthKind,
  baselineMemberId: string,
): string {
  return `${kind}:${baselineMemberId}`;
}

/** The hash `compareBaseline` uses for a side of a delta that has no member. */
const ABSENT_MEMBER_HASH = sha256('missing');

export function articleTruthMembers(manifests: ArticleTruthManifests): string[] {
  const members: string[] = [];
  for (const kind of ARTICLE_TRUTH_MANIFEST_KINDS) {
    const manifest = manifests[kind];
    if (!manifest) {
      throw new Error(
        `the article-truth population is missing the ${kind} baseline manifest`,
      );
    }
    if (manifest.members.length === 0) {
      throw new Error(
        `the ${kind} baseline manifest is empty, so an article-truth pass over it would quantify over nothing`,
      );
    }
    for (const member of manifest.members) {
      members.push(articleTruthMemberId(kind, member.id));
    }
  }
  return members.sort((left, right) => left.localeCompare(right));
}

/**
 * The population the row quantifies over: what the migration sealed, plus
 * the members an approved delta added, minus the members an approved delta
 * removed.
 *
 * The sealed manifest alone is the wrong population once a delta has added
 * something. Ten table wrappers gained an `aria-label` under named deltas
 * during this rollout, and a population that stopped at the seal would leave
 * each of those accessible names measured by nothing at all — the exact
 * shape of gap a corpus gate exists to prevent. Deriving it from the seal
 * and the checked-in allowlist together keeps every current member owned by
 * a row, and keeps a new member out of the population until someone names it
 * in the allowlist.
 */
export function articleTruthPopulation(input: {
  baseline: ArticleTruthManifests;
  deltas: readonly ApprovedDelta[];
}): string[] {
  const members = new Set(articleTruthMembers(input.baseline));
  for (const delta of input.deltas) {
    if (
      !(ARTICLE_TRUTH_MANIFEST_KINDS as readonly string[]).includes(
        delta.manifest,
      )
    ) {
      continue;
    }
    const id = articleTruthMemberId(
      delta.manifest as ArticleTruthKind,
      delta.memberId,
    );
    if (delta.oldHash === ABSENT_MEMBER_HASH) members.add(id);
    if (delta.newHash === ABSENT_MEMBER_HASH) members.delete(id);
  }
  return [...members].sort((left, right) => left.localeCompare(right));
}

export interface ArticleTruthVerdict {
  id: string;
  kind: ArticleTruthKind;
  baselineMemberId: string;
  status: 'identical' | 'approved-delta' | 'approved-addition';
  baselineHash: string | null;
  currentHash: string;
  deltaId: string | null;
  deltaReason: string | null;
}

/**
 * A bundle shell that carries manifests and nothing else.
 *
 * `compareBaseline` is the one place that knows what an approved delta
 * excuses, and re-implementing that here would give article truth a second
 * opinion that could drift from the one the baseline gate enforces. It walks
 * every declared kind and treats an absent kind as an empty manifest on both
 * sides, so handing it only the article-truth classes compares exactly those
 * and reports nothing about the rest.
 */
function truthBundle(manifests: ArticleTruthManifests): BaselineBundle {
  return {
    schemaVersion: 1,
    source: { commit: '', tree: '', trackedWorktreeClean: false },
    tools: {
      node: '',
      npm: '',
      playwright: '',
      next: '',
      typescript: '',
      vitest: '',
      lockfileSha256: '',
    },
    manifests: manifests as unknown as BaselineBundle['manifests'],
    manifestRoots: {} as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

/**
 * Per-member article-truth verdicts, or a throw naming what moved.
 *
 * The reader refuses rather than degrades, the way every other brand-v2
 * evidence reader does: an unapproved difference in an article-truth class
 * means the corpus cannot be regenerated green, so the generator stops with
 * the offending members named instead of writing a row that hides them.
 */
export function articleTruthVerdicts(input: {
  baseline: ArticleTruthManifests;
  current: ArticleTruthManifests;
  deltas: readonly ApprovedDelta[];
}): Map<string, ArticleTruthVerdict> {
  const population = articleTruthPopulation({
    baseline: input.baseline,
    deltas: input.deltas,
  });
  const currentMembers = articleTruthMembers(input.current);
  const comparison = compareBaseline(
    truthBundle(input.baseline),
    truthBundle(input.current),
    input.deltas,
  );
  if (!comparison.ok) {
    const named = comparison.failures
      .slice(0, 5)
      .map(
        (failure) =>
          `${failure.manifest ?? 'delta'}:${failure.memberId ?? '(unnamed)'} (${failure.reason})`,
      );
    throw new Error(
      `article truth differs from the immutable migration baseline in ${comparison.failures.length} member(s) that no approved delta names: ${named.join(', ')}. Register the change in contract/brand-v2-approved-deltas.json or restore the fact.`,
    );
  }

  const deltaByMember = new Map<string, ApprovedDelta>();
  for (const delta of input.deltas) {
    if (!(ARTICLE_TRUTH_MANIFEST_KINDS as readonly string[]).includes(delta.manifest)) {
      continue;
    }
    deltaByMember.set(
      articleTruthMemberId(delta.manifest as ArticleTruthKind, delta.memberId),
      delta,
    );
  }

  const memberIndex = (
    manifests: ArticleTruthManifests,
  ): Map<string, { id: string; hash: string }> =>
    new Map(
      ARTICLE_TRUTH_MANIFEST_KINDS.flatMap((kind) =>
        manifests[kind].members.map(
          (member) => [articleTruthMemberId(kind, member.id), member] as const,
        ),
      ),
    );
  const baselineById = memberIndex(input.baseline);
  const currentById = memberIndex(input.current);

  // Every member the current tree ships is in the derived population, or the
  // population is not the thing being measured.
  const unowned = currentMembers.filter((id) => !population.includes(id));
  if (unowned.length > 0) {
    throw new Error(
      `${unowned.length} article-truth member(s) exist in the current tree and in neither the sealed baseline nor the approved-delta allowlist: ${unowned.slice(0, 5).join(', ')}`,
    );
  }

  const verdicts = new Map<string, ArticleTruthVerdict>();
  for (const id of population) {
    const currentMember = currentById.get(id);
    if (!currentMember) {
      throw new Error(
        `${id} is in the article-truth population and absent from the current tree, and the comparison did not reject it`,
      );
    }
    const baselineMember = baselineById.get(id);
    const delta = deltaByMember.get(id);
    const changed =
      baselineMember === undefined || baselineMember.hash !== currentMember.hash;
    verdicts.set(id, {
      id,
      kind: id.slice(0, id.indexOf(':')) as ArticleTruthKind,
      baselineMemberId: currentMember.id,
      status:
        baselineMember === undefined
          ? 'approved-addition'
          : changed
            ? 'approved-delta'
            : 'identical',
      baselineHash: baselineMember?.hash ?? null,
      currentHash: currentMember.hash,
      deltaId: changed ? (delta?.id ?? null) : null,
      deltaReason: changed ? (delta?.reason ?? null) : null,
    });
  }
  if (verdicts.size !== population.length) {
    throw new Error(
      `article-truth verdicts cover ${verdicts.size} members, not the ${population.length} the derived population holds`,
    );
  }
  return verdicts;
}
