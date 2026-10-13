/**
 * The order an article's References section prints its entries in.
 *
 * Sources the prose cites come first, then the sources the frontmatter
 * declares but the prose never cites, under one "Further reading" heading.
 * Each group keeps frontmatter declaration order. The superscript in the
 * text, its sidenote and its References entry all take their number from a
 * source's position in this order, so the article template, the References
 * component and the evidence sweeps that check the printed bibliography all
 * read it from here rather than each deciding it again.
 *
 * Kept apart from `lib/references.ts`, whose source the brand-v2 migration
 * baseline seals as a canonical metadata source.
 */
import type { ResolvedReference } from './references.ts';

export interface ReferenceGroups {
  /** Entries the prose cites inline, numbered from 1. */
  cited: ResolvedReference[];
  /** Entries declared but never cited inline, numbered after `cited`. */
  furtherReading: ResolvedReference[];
}

export function referenceGroups(
  entries: readonly ResolvedReference[],
): ReferenceGroups {
  return {
    cited: entries.filter((entry) => !entry.furtherReading),
    furtherReading: entries.filter((entry) => entry.furtherReading),
  };
}

/** One list in print order: the cited group, then further reading. */
export function referencesInPrintOrder(
  entries: readonly ResolvedReference[],
): ResolvedReference[] {
  const { cited, furtherReading } = referenceGroups(entries);
  return [...cited, ...furtherReading];
}
