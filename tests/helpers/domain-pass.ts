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

/** Edges the KOL triage batch of 2026-10-12 appended after every earlier pass. */
export const isKolQueue20261012Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('domain-pass-20261012-kol-');

/**
 * The hash the 2026-10-12 KOL triage batch leaves on a member whose chain
 * ends at `from`: its one edge on the member must continue `from`, as a plain
 * edge or as a resolution that reconciles it; an untouched member stays at
 * `from`.
 */
export function kolQueue20261012Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isKolQueue20261012Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-12 KOL edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the world-models and frontier domain passes appended as their own
 * blocks when they landed on the mission head on 2026-10-10, after the
 * classical pass.
 */
export const isLandedPassEdge = (entry: Pick<ApprovedDelta, 'id'>) =>
  /^(world-models|frontier)-pass-20261010-/.test(entry.id);

/**
 * The hash those blocks leave on a member whose chain ends at `from`. Each
 * of their edges on the member, in ledger order, must continue the previous
 * endpoint, as a plain edge from it or as a resolution that reconciles it; a
 * member no block touched stays at `from`.
 */
export function landedPassEndpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  let endpoint = from;
  for (const entry of entries) {
    if (!isLandedPassEdge(entry) || entry.manifest !== manifest || entry.memberId !== memberId) continue;
    if (entry.oldHash !== endpoint && !(entry.reconciles ?? []).some((binding) => binding.newHash === endpoint)) {
      throw new Error(`${entry.id} does not continue ${manifest} ${memberId} from ${endpoint}`);
    }
    endpoint = entry.newHash;
  }
  return endpoint;
}

/**
 * Edges the humanize pass of 2026-10-12 appended as one block after every
 * earlier pass: per domain (manipulation, classical, rl-sim2real) one prose
 * and one relationships edge for each article its owner-approved length cut
 * shortened.
 */
export const isHumanize20261012Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('humanize-20261012-');

/**
 * The hash the 2026-10-12 humanize pass leaves on a member whose chain ends
 * at `from`: its one prose or relationships edge on the member must continue
 * `from`, as a plain edge or as a resolution that reconciles it; an untouched
 * member stays at `from`.
 */
export function humanize20261012Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isHumanize20261012Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-12 humanize edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges images bundle A of 2026-10-13 appended as one block after every
 * earlier landing: one prose edge per manipulation, world-models, classical
 * and rl-sim2real article that gained image mounts, and one edge from an
 * absent seal per registered image it added.
 */
export const isImagesA20261013Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('images-a-20261013-');

/**
 * Edges the data-hardware domain pass and length cut of 2026-10-13 appended
 * as one block after images bundle A: one prose, relationships and
 * front-matter edge per data-hardware article, its removed state sites, the
 * citation rendering resolution and one edge per registered citation.
 */
export const isDataHardwareCut20261013Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('length-cut-20261013-data-hardware-');

/**
 * The hash the 2026-10-13 data-hardware cut leaves on a member whose chain
 * ends at `from`: its one edge on the member must continue `from`, as a plain
 * edge or as a resolution that reconciles it; an untouched member stays at
 * `from`.
 */
export function dataHardwareCut20261013Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isDataHardwareCut20261013Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-13 data-hardware edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the adjacent domain pass and length cut of 2026-10-14 appended
 * as one block after the data-hardware domain pass and length cut: one prose, relationships and
 * front-matter edge per adjacent article, its removed state sites, the
 * citation rendering resolution and one edge per registered citation.
 */
export const isAdjacentCut20261014Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('length-cut-20261014-adjacent-');

/**
 * The hash the 2026-10-14 adjacent cut leaves on a member whose chain
 * ends at `from`: its one edge on the member must continue `from`, as a plain
 * edge or as a resolution that reconciles it; an untouched member stays at
 * `from`.
 */
export function adjacentCut20261014Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isAdjacentCut20261014Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-14 adjacent edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * The hash images bundle A leaves on a member whose chain ends at `from`:
 * its one edge on the member must continue `from`, as a plain edge or as a
 * resolution that reconciles it; an untouched member stays at `from`.
 */
export function imagesA20261013Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isImagesA20261013Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-13 images edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the discovery pass of 2026-10-14 (opus-pass-home-hubs-and-discovery)
 * appended as one block after the adjacent images: one edge per rewritten
 * article summary in data/modules.ts and one each for the modules and glossary
 * sources.
 */
export const isHomeHubs20261014Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('opus-pass-home-hubs-20261014-');

/**
 * The hash the discovery pass leaves on a member whose chain ends at `from`:
 * its one edge on the member must continue `from`, as a plain edge or as a
 * resolution that reconciles it; an untouched member stays at `from`.
 */
export function homeHubs20261014Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isHomeHubs20261014Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-14 discovery edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the discovery pass of 2026-10-16 appended as one block after the
 * launch sweep: one edge per rewritten article summary, the two accessible
 * names the hub template adds, and one each for the modules and glossary
 * sources.
 */
export const isHomeHubs20261016Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('opus-pass-home-hubs-20261016-');

/** The hash the 2026-10-16 discovery pass leaves on a member whose chain ends at `from`. */
export function homeHubs20261016Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isHomeHubs20261016Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-16 discovery edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the data-hardware images of 2026-10-15 appended as one block after
 * the isometric figure batch b06: one prose edge per data-hardware article that gained
 * image mounts, one edge from an absent seal per registered image they added,
 * and one plain edge for the caption of the bundle A DROID figure they reuse.
 */
export const isImagesDh20261015Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('images-dh-20261015-');

/**
 * The hash the data-hardware images leave on a member whose chain ends at
 * `from`: their one edge on the member must continue `from`, as a plain edge
 * or as a resolution that reconciles it; an untouched member stays at `from`.
 */
export function imagesDh20261015Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isImagesDh20261015Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-15 data-hardware images edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
}

/**
 * Edges the manipulation isometric figures of 2026-10-15 (batch
 * manipulation-b04) appended as one block after the data-hardware images: one
 * prose edge per article that gained a figure mount (action spaces, the
 * comparison matrix, hierarchical policies) and one edge from an absent seal
 * per new figure source and mount.
 */
export const isAnatomyManipB0420261015Edge = (entry: Pick<ApprovedDelta, 'id'>) =>
  entry.id.startsWith('anatomy-manip-b04-figures-20261015-');

/**
 * The hash the manipulation isometric figures leave on a member whose chain
 * ends at `from`: their one edge on the member must continue `from`, as a
 * plain edge or as a resolution that reconciles it; an untouched member stays
 * at `from`.
 */
export function anatomyManipB0420261015Endpoint(
  entries: readonly Edge[], manifest: string, memberId: string, from: string,
): string {
  const edges = entries.filter((entry) => isAnatomyManipB0420261015Edge(entry)
    && entry.manifest === manifest && entry.memberId === memberId);
  if (edges.length > 1) throw new Error(`more than one 2026-10-15 manipulation figure edge on ${manifest} ${memberId}`);
  const [edge] = edges;
  if (!edge) return from;
  if (edge.oldHash !== from && !(edge.reconciles ?? []).some((binding) => binding.newHash === from)) {
    throw new Error(`${edge.id} does not continue ${manifest} ${memberId} from ${from}`);
  }
  return edge.newHash;
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
  // rl-sim2real: why-rl-locomotion now cites the current version's sentence,
  // so the arXiv v1 pin is lifted (verify/rl-sim2real/why-rl-locomotion.md).
  [`    // Versioned URL, per the audit/README.md quote policy: the article
    // quotes a sentence ("...much more laborious real-to-sim engineering
    // efforts...") that exists only in arXiv v1; v2 dropped it, so the
    // unversioned abs URL would serve a text the reader cannot find.
    url: 'https://arxiv.org/abs/2502.20396v1',
`,
    `    // Unversioned URL: since the 2026-10-06 domain pass the article cites the
    // current version's sentence (dexterous sim-to-real RL "remains largely
    // limited to single-hand ... or state-based setups"), which arXiv v1
    // does not hold; the earlier v1-only quote is no longer on the page.
    url: 'https://arxiv.org/abs/2502.20396',
`],
  // rl-sim2real: Play2Perfect was accepted at CoRL 2026, as its project page
  // prints under the byline (owner sweep rl-sim2real/why-rl-locomotion).
  [`    year: 2026,
    arxiv: '2606.26428',
`,
    `    year: 2026,
    // Accepted at CoRL 2026: the project page (play2perfect.github.io), fetched 2026-10-07,
    // prints "Conference on Robot Learning (CoRL) 2026" under the byline.
    venue: 'CoRL 2026',
    arxiv: '2606.26428',
`],
  // world-models: the page cites dreamerv3-nature-2025 for the Nature paper, so
  // the 2023 preprint entry drops its 'Nature 2025' venue (audit/world-models/latent-dynamics.md, R1).
  [`    // Verified against the arXiv abs page (2026-08-08): 4 authors; the
    // DreamerV3 paper, published in Nature 2025.
    id: 'dreamerv3-2023',
    title: 'Mastering Diverse Domains through World Models',
    authors: [
      'Danijar Hafner',
      'Jurgis Pasukonis',
      'Jimmy Ba',
      'Timothy Lillicrap',
    ],
    year: 2023,
    venue: 'Nature 2025',
`,
    `    // Verified against the arXiv abs page (2026-08-08): 4 authors. This is the
    // 2023 arXiv preprint; the Nature 2025 version is dreamerv3-nature-2025,
    // so this entry carries no venue (audit/world-models/latent-dynamics.md, R1).
    id: 'dreamerv3-2023',
    title: 'Mastering Diverse Domains through World Models',
    authors: [
      'Danijar Hafner',
      'Jurgis Pasukonis',
      'Jimmy Ba',
      'Timothy Lillicrap',
    ],
    year: 2023,
`],
  // adjacent, 2026-10-14 (owner sweep item: Reynolds reference defect): Crossref
  // gives the canonical venue, Computer Graphics 21(4):25-34, so the venue drops
  // the Soria-printed range and the process note (audit/citations.md).
  [`    // behavioral model. Comput. Graph. 21, 25-43 (1987)." The ACM DL record
    // (doi 10.1145/37402.37406) is Cloudflare-walled to machines (HTTP 403
    // in the preparing session), so the ACM-canonical page range is not
    // confirmed; the venue records the Soria-printed range with that caveat.
    id: 'reynolds-boids-1987',
    title: 'Flocks, Herds and Schools: A Distributed Behavioral Model',
    authors: ['Craig W. Reynolds'],
    year: 1987,
    venue:
      "Computer Graphics (SIGGRAPH '87) 21, pages 25-43 as printed by the fetched Soria reference list; ACM DL machine-walled so canonical pages unconfirmed",
`,
    `    // behavioral model. Comput. Graph. 21, 25-43 (1987)." Crossref (doi
    // 10.1145/37402.37406, read 2026-10-14) gives the canonical record: ACM
    // SIGGRAPH Computer Graphics 21(4):25-34, August 1987, so the venue
    // carries Crossref's page range, not the Soria-printed one.
    id: 'reynolds-boids-1987',
    title: 'Flocks, Herds and Schools: A Distributed Behavioral Model',
    authors: ['Craig W. Reynolds'],
    year: 1987,
    venue: "Computer Graphics 21(4):25-34 (SIGGRAPH '87)",
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
