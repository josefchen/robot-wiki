/**
 * Shared view of the 2026-10-06 opus-pass domain passes for tests that pin a
 * state from before them: the registry ids the passes appended, the approval
 * edges they added, and the citation list a frontmatter P1 row declared.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ApprovedDelta } from '@/lib/brand-v2-baseline';
import { preDomainPassCitations as preDomainPassCitationList } from '@/lib/audit-domain-pass-continuity';

const root = resolve(import.meta.dirname, '../..');

export const DOMAIN_PASS_PREFIX = 'domain-pass-20261006-';

/**
 * Registry ids appended by the domain passes; each entry's comment opens with
 * "<id>: domain pass 2026-10-06", followed by its draft file, its KOL intake note or
 * the owner sweep item it answers.
 */
export const DOMAIN_PASS_CITATION_IDS: ReadonlySet<string> = new Set(
  [...readFileSync(resolve(root, 'data/citations.ts'), 'utf8')
    .matchAll(/^ {2}\/\/ ([a-z0-9][a-z0-9.-]*): domain pass 2026-10-06, (?:from drafts\/|KOL intake |owner sweep item )/gm)].map((m) => m[1]),
);

export const isDomainPassEdge = (entry: Pick<ApprovedDelta, 'id'>) => entry.id.startsWith(DOMAIN_PASS_PREFIX);

type Edge = Pick<ApprovedDelta, 'id' | 'manifest' | 'memberId' | 'oldHash' | 'newHash' | 'reconciles'>;

/**
 * The last domain-pass edge on the chain that starts at `edge`: a later batch
 * of the passes continues a member from the previous batch's endpoint, either
 * as a plain edge from that endpoint or as a resolution that reconciles it.
 */
export function domainPassEndpoint<T extends Edge>(entries: readonly T[], edge: T): T {
  let current = edge;
  for (;;) {
    const next = entries.find((entry) => entry !== current && isDomainPassEdge(entry)
      && entry.manifest === current.manifest && entry.memberId === current.memberId
      && (entry.oldHash === current.newHash || (entry.reconciles ?? []).some((binding) =>
        binding.id === current.id && binding.newHash === current.newHash)));
    if (!next) return current;
    current = next;
  }
}

/** The ledger as it stood before the domain passes appended their edges. */
export const withoutDomainPassEdges = <T extends Pick<ApprovedDelta, 'id'>>(entries: readonly T[]): T[] =>
  entries.filter((entry) => !isDomainPassEdge(entry));

/** The citation list a frontmatter P1 row declared for `content/<domain>/<slug>.mdx`. */
export const preDomainPassCitations = (domain: string, slug: string, citations: readonly string[]) =>
  preDomainPassCitationList(root, `content/${domain}/${slug}.mdx`, citations);

/**
 * Corrections the domain passes made to registry entries that already
 * existed, as exact [before, after] runs over the entry's lines. Byte checks
 * on an older registry state swap each reviewed correction back first; any
 * other change to an older entry still fails them.
 */
export const DOMAIN_PASS_REGISTRY_CORRECTIONS: readonly (readonly [string, string])[] = [
  // classical: the ROS 2 Lyrical documentation moved from Concepts/ to
  // ROS-Framework/, so both old URLs return 404 (audit/classical/ros2-for-ml-engineers.md).
  [`    url: 'https://docs.ros.org/en/lyrical/Concepts/Basic/Interfaces-Topics-Services-Actions.html',
`,
    `    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/Interfaces-Topics-Services-Actions.html',
`],
  [`    url: 'https://docs.ros.org/en/lyrical/Concepts/Intermediate/About-Quality-of-Service-Settings.html',
`,
    `    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/interfaces/topics/About-Quality-of-Service-Settings.html',
`],
  // classical: the repository's own description is "Standard Open Arm 100";
  // the earlier title is not on the repository (audit/classical/kinematics.md).
  [`    title: 'SO-ARM100: Low-Cost Robot Arms for Everyone',
`,
    `    title: 'SO-ARM100: Standard Open Arm 100',
`],
];

/** The registry source with every reviewed domain-pass correction swapped back. */
export function withoutDomainPassRegistryCorrections(registry: string): string {
  let result = registry;
  for (const [before, after] of DOMAIN_PASS_REGISTRY_CORRECTIONS) {
    if (result.split(after).length !== 2) throw new Error('a reviewed domain-pass registry correction drifted');
    result = result.split(after).join(before);
  }
  return result;
}
