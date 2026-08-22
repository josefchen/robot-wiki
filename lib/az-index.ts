/**
 * The A-Z index model (architecture.md section 6): one flat alphabetical
 * list of every published article and every glossary term, grouped by first
 * letter with jump links. The page at app/a-z/page.tsx renders what this
 * module computes; the registry tests pin completeness.
 *
 * Pure and dependency-free so it can be unit-tested with fixtures and reused
 * by the page, which feeds it the real registries.
 */

export type AzIndexSourceEntry = {
  kind: 'article' | 'term';
  /** Display label: the article title or the glossary term. */
  label: string;
  href: string;
  /** Shown beside the label: the domain name or "Glossary". */
  group: string;
};

export type AzIndexGroup = {
  /** Uppercase first letter, or '#' for labels that start with a non-letter. */
  letter: string;
  entries: AzIndexSourceEntry[];
};

export type AzIndex = {
  groups: AzIndexGroup[];
  articleCount: number;
  termCount: number;
};

/** The letter a label files under: uppercase A-Z, else '#'. */
export function groupLetter(label: string): string {
  const first = label.trim().charAt(0);
  return /^[a-z]$/i.test(first) ? first.toUpperCase() : '#';
}

/**
 * Fragment id for a letter group's heading.
 *
 * The '#' group cannot use its own label: `id="letter-#"` makes the jump
 * link `/a-z/#letter-#`, whose fragment truncates at the second '#' to
 * `letter-`, matching nothing. It files under a spelled-out token instead.
 */
export function letterAnchorId(letter: string): string {
  return `letter-${letter === '#' ? 'other' : letter.toLowerCase()}`;
}

function compareLabels(a: string, b: string): number {
  // Case-insensitive primary ordering (a lowercase title sorts with its
  // capitalised neighbours), exact-case tie-break for determinism.
  const base = a.localeCompare(b, 'en', { sensitivity: 'base' });
  return base !== 0 ? base : a.localeCompare(b, 'en');
}

/**
 * Groups the source entries into letter runs. Groups appear in alphabetical
 * order with '#' last; entries inside a group sort case-insensitively by
 * label, articles and terms interleaved in one run.
 */
export function buildAzIndex(entries: readonly AzIndexSourceEntry[]): AzIndex {
  const sorted = [...entries].sort((a, b) => compareLabels(a.label, b.label));
  const byLetter = new Map<string, AzIndexSourceEntry[]>();
  for (const entry of sorted) {
    const letter = groupLetter(entry.label);
    const bucket = byLetter.get(letter);
    if (bucket) bucket.push(entry);
    else byLetter.set(letter, [entry]);
  }
  const letters = [...byLetter.keys()].sort((a, b) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b, 'en'),
  );
  return {
    groups: letters.map((letter) => ({
      letter,
      entries: byLetter.get(letter) ?? [],
    })),
    articleCount: entries.filter((e) => e.kind === 'article').length,
    termCount: entries.filter((e) => e.kind === 'term').length,
  };
}
