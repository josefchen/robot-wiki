/**
 * Author-year agreement between prose and the citation registry.
 *
 * An article that writes "(Chen et al., 2025)" and then renders a chip whose
 * registry year is 2026 shows a reader two years for one paper in a single
 * sentence. Nothing else compares those two surfaces: the registry gates
 * check that every referenced id exists, and the no-slop lint reads prose
 * without knowing what a chip resolves to, so this class of drift is
 * invisible to every existing check.
 *
 * The whole difficulty is precision. Most parenthesised years in this corpus
 * are not citations ("(September 2025)", "(2019)", a date range in a
 * sentence about funding), and a scan that matches any year near a <Cite>
 * reports them as violations. So a mention only counts when it looks like an
 * author-year citation, and it is only bound to a chip when it actually
 * introduces that chip: same paragraph, and the surname must be an author of
 * the entry the chip resolves to. Anything less specific produces noise that
 * trains people to ignore the check.
 *
 * Binding is paragraph-scoped rather than sentence-scoped, which is not a
 * detail. The defect this was written for opens a paragraph with "**pi_RL**
 * (Chen et al., 2025)" and places the chip three sentences later at the end
 * of the same paragraph; a sentence-scoped rule reports zero hits on the
 * exact corpus it was built to check. The surname test is what keeps the
 * wider window precise: within a paragraph, a mention is only compared
 * against a chip whose entry that surname actually wrote.
 */

export interface ProseCitationEntry {
  id: string;
  year: number;
  authors: string[];
}

export interface ProseCitationYearHit {
  file: string;
  citationId: string;
  surname: string;
  proseYear: number;
  registryYear: number;
  excerpt: string;
}

export interface ProseCitationYearInput {
  file: string;
  body: string;
  citations: readonly ProseCitationEntry[];
  /**
   * Citation ids exempted from the comparison. Exists for tests and for a
   * future divergence that is genuinely defensible to a reader; the build
   * gate passes nothing, deliberately. Wiring this to the registry's
   * `skip: 'year'` list muted the check on the one article it was written
   * for, because that list settles registry-vs-arXiv, not prose-vs-chip.
   */
  exemptIds?: ReadonlySet<string>;
}

/**
 * An author-year mention: an opening paren, one or two capitalised surnames
 * joined by "and"/"&" or followed by "et al.", then a year or year range.
 * The leading surname requirement is what excludes bare dates, and the
 * optional month name is what excludes "(September 2025)" specifically,
 * since a month makes it a date rather than a citation.
 */
const MENTION =
  /\(([A-Z][\p{L}'’-]+)(?:\s+(?:and|&)\s+[A-Z][\p{L}'’-]+|\s+et\s+al\.?)?,\s*(\d{4})(?:\s*[-–—]\s*(\d{4}))?\)/gu;

/** A citation chip, capturing the id it resolves to. */
const CITE = /<Cite\s+id=["']([^"']+)["']/g;

/** A blank line ends the paragraph and severs a mention from later chips. */
const SEVERING = /\n\s*\n/;

/** Strip fenced code so a code sample cannot be scanned as prose. */
function stripFences(body: string): string {
  return body.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '));
}

/**
 * The surname the registry would print for an author entry. Entries store
 * full names ("Kang Chen", "Tony Z. Zhao"), so the surname is the last
 * whitespace-separated token.
 */
function surnameOf(author: string): string {
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

export function findProseCitationYearDisagreements(
  input: ProseCitationYearInput,
): ProseCitationYearHit[] {
  const { file, body, citations } = input;
  const exempt = input.exemptIds ?? new Set<string>();
  const byId = new Map(citations.map((c) => [c.id, c]));
  const source = stripFences(body);

  const chips: { id: string; index: number }[] = [];
  for (const match of source.matchAll(CITE)) {
    chips.push({ id: match[1], index: match.index ?? 0 });
  }
  if (chips.length === 0) return [];

  const hits: ProseCitationYearHit[] = [];
  for (const mention of source.matchAll(MENTION)) {
    const start = mention.index ?? 0;
    const end = start + mention[0].length;
    const surname = mention[1];
    // A range cites the later version, which is the year a chip should carry.
    const proseYear = Number(mention[3] ?? mention[2]);

    // Every chip in the same paragraph is a candidate; the surname decides
    // which one (if any) this mention is actually about.
    const candidates = chips.filter(
      (c) => c.index >= end && !SEVERING.test(source.slice(end, c.index)),
    );

    for (const chip of candidates) {
      const entry = byId.get(chip.id);
      if (!entry) continue;
      if (exempt.has(entry.id)) continue;
      // A different paper named just before a chip is normal prose, not a
      // wrong year on the cited entry.
      if (!entry.authors.some((a) => surnameOf(a) === surname)) continue;
      if (entry.year === proseYear) break;

      hits.push({
        file,
        citationId: entry.id,
        surname,
        proseYear,
        registryYear: entry.year,
        excerpt: source
          .slice(start, Math.min(chip.index + 40, source.length))
          .replace(/\s+/g, ' '),
      });
      break;
    }
  }
  return hits;
}
