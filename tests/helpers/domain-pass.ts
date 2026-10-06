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
 * "<id>: domain pass 2026-10-06", followed by its draft file or its KOL intake note.
 */
export const DOMAIN_PASS_CITATION_IDS: ReadonlySet<string> = new Set(
  [...readFileSync(resolve(root, 'data/citations.ts'), 'utf8')
    .matchAll(/^ {2}\/\/ ([a-z0-9][a-z0-9.-]*): domain pass 2026-10-06, (?:from drafts\/|KOL intake )/gm)].map((m) => m[1]),
);

export const isDomainPassEdge = (entry: Pick<ApprovedDelta, 'id'>) => entry.id.startsWith(DOMAIN_PASS_PREFIX);

/** The ledger as it stood before the domain passes appended their edges. */
export const withoutDomainPassEdges = <T extends Pick<ApprovedDelta, 'id'>>(entries: readonly T[]): T[] =>
  entries.filter((entry) => !isDomainPassEdge(entry));

/** The citation list a frontmatter P1 row declared for `content/<domain>/<slug>.mdx`. */
export const preDomainPassCitations = (domain: string, slug: string, citations: readonly string[]) =>
  preDomainPassCitationList(root, `content/${domain}/${slug}.mdx`, citations);
