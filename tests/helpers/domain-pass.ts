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

/**
 * Edges the classical pass of 2026-10-07 and 2026-10-08 appended after the
 * domain passes (figures, reader-first rework, registry fixes, sweep items).
 */
export const isClassicalPassEdge = (entry: Pick<ApprovedDelta, 'id'>) =>
  /^(reader-first|figure-mounts|domain-pass)-2026100[78]-/.test(entry.id);

/**
 * The hash the classical pass leaves on a member whose domain-pass chain
 * ends at `from`. Each of its edges on the member, in ledger order, must
 * continue the previous endpoint, as a plain edge from it or as a resolution
 * that reconciles it; a member the pass did not touch stays at `from`.
 */
export function classicalPassEndpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  let endpoint = from;
  for (const entry of entries) {
    if (!isClassicalPassEdge(entry) || entry.manifest !== manifest || entry.memberId !== memberId) continue;
    if (entry.oldHash !== endpoint && !(entry.reconciles ?? []).some((binding) => binding.newHash === endpoint)) {
      throw new Error(`${entry.id} does not continue ${manifest} ${memberId} from ${endpoint}`);
    }
    endpoint = entry.newHash;
  }
  return endpoint;
}

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
  // classical, 2026-10-08 (sweep item RF.2): the old book-site URL now
  // redirects to one lecture-video page; modernrobotics.org lands on the
  // book's home page, which hosts the preprint.
  [`    // 2017, ISBN 9781107156302. Free full text and video lectures.
    id: 'modern-robotics-2017',
    title: 'Modern Robotics: Mechanics, Planning, and Control',
    authors: ['Kevin M. Lynch', 'Frank C. Park'],
    year: 2017,
    venue: 'Cambridge University Press',
    url: 'https://modernrobotics.northwestern.edu/',
`,
    `    // 2017, ISBN 9781107156302. Free full text and video lectures.
    // 2026-10-08: modernrobotics.northwestern.edu now redirects to a single
    // lecture-video page, so the entry links the book's home page, where
    // modernrobotics.org lands and the authors post the full-text preprint.
    id: 'modern-robotics-2017',
    title: 'Modern Robotics: Mechanics, Planning, and Control',
    authors: ['Kevin M. Lynch', 'Frank C. Park'],
    year: 2017,
    venue: 'Cambridge University Press',
    url: 'https://hades.mech.northwestern.edu/index.php/Modern_Robotics',
`],
  // classical, 2026-10-08 (sweep item RF.10): the entry carries the 2012
  // paper's metadata, so it now links the paper's DOI as a paper.
  [`    // This entry links to project documentation, not a version-pinned copy
    // of the associated 2012 paper. The fetched project page lists PRM/RRT
    // implementations and benchmarking/integration capabilities; it does
    // not establish field-wide adoption or testing certification. The
    // paper title, authors and year below remain a separate P1 identity check.
    id: 'ompl-2012',
    title: 'The Open Motion Planning Library',
    authors: ['Ioan A. Șucan', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2012,
    venue: 'IEEE Robotics & Automation Magazine',
    url: 'https://ompl.kavrakilab.org/',
    type: 'docs',
`,
    `    // The 2012 paper itself (Crossref, 2026-10-08: IEEE RAM 19(4):72-82,
    // December 2012). The authors' preprint lists PRM and RRT among the
    // implemented planners, describes the Benchmark class, and says OMPL
    // includes no collision checker or visualization and plugs into host
    // systems that do. It does not establish field-wide adoption or testing
    // certification.
    id: 'ompl-2012',
    title: 'The Open Motion Planning Library',
    authors: ['Ioan A. Șucan', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2012,
    venue: 'IEEE Robotics & Automation Magazine',
    url: 'https://doi.org/10.1109/MRA.2012.2205651',
    type: 'paper',
`],
  // classical, 2026-10-08 (sweep items RF.11 and X.6b): the page prints no
  // year of its own, so the year is the access year of its "as of" venue.
  [`    // the force-mode behavior exposed to UR programs.
    id: 'ur-force-mode-docs',
    title: 'URScript: Dynamic Force Control',
    authors: ['Universal Robots'],
    year: 2025,
`,
    `    // the force-mode behavior exposed to UR programs. The page shows only
    // "Last modified on Feb 17, 2016" (re-read 2026-10-08), so the year is
    // the access year, as for the other "as of" entries.
    id: 'ur-force-mode-docs',
    title: 'URScript: Dynamic Force Control',
    authors: ['Universal Robots'],
    year: 2026,
`],
  // classical, 2026-10-08 (sweep item X.6b): the reference printed the access
  // date and the page's 2019 date side by side; the venue now states both.
  [`    // multi-path cases.
    id: 'azure-kinect-depth-docs-2026',
    title: 'Azure Kinect DK depth camera',
    authors: ['Microsoft'],
    year: 2019,
    venue: 'Microsoft Learn, as of 2026-08-22',
`,
    `    // multi-path cases. The page is dated 2019-06-26 (ms.date, re-read
    // 2026-10-08), so the year is the page's own; the venue states it next to
    // the access date so the reference prints one of each.
    id: 'azure-kinect-depth-docs-2026',
    title: 'Azure Kinect DK depth camera',
    authors: ['Microsoft'],
    year: 2019,
    venue: 'Microsoft Learn, 2019; accessed 2026-08-22',
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
