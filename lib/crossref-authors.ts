/**
 * Crossref author-metadata comparison (VAL-BUILD citation integrity).
 *
 * The URL liveness sweep (check:links) and the document-identity audit
 * (check:citations) both trust Crossref for the paper a DOI resolves to, but
 * neither ever looked at AUTHORS. That is exactly the hole the 2026-08-20
 * audit found: five author names in the registry were written from memory
 * after the DOIs had been verified, so every DOI resolved correctly while
 * named humans were misattributed. This module supplies the pure comparison
 * logic for the author sweep (`npm run check:crossref-authors`), which
 * queries api.crossref.org for every DOI-bearing citation and compares
 * family names, given names, year and title against the registry.
 *
 * The comparison rules encode the registry's author-field policy (see the
 * header of data/citations.ts): render what the source publishes. Family
 * names are hard equality (modulo diacritics, umlaut transliteration and
 * hyphenation; multi-word families like "Di Carlo" are matched on the last
 * one OR two tokens). Given names: when Crossref publishes a full given
 * name, the registry's first given-name token must match it (Crossref is
 * inconsistent about middle initials, so a missing or extra middle initial
 * is not a divergence, but a different primary name — "Josef" vs
 * "Roberto", "Gwanghyun" vs "Gwanghyeon" — is). When Crossref publishes
 * only initials, the registry's initials must agree positionally, and a
 * registry name LONGER than an initial is reported separately as an
 * unverifiable expansion — the precise fabrication pattern this module
 * exists to catch. Expansions that ARE backed by a record that transcribes
 * or states the byline (DBLP, the publisher landing page or PDF, the
 * correct person's ORCID with the work listed) can be documented in
 * data/crossref-author-exceptions.ts rather than downgraded; an
 * aggregator's display name (OpenAlex display_name) is a guess about
 * identity, not corroboration, and never qualifies.
 */
import { normalizeTitle } from './citation-links.ts';

/** The slice of a Crossref author record the sweep compares against. */
export interface CrossrefAuthor {
  /** Family name as Crossref publishes it ("Mukherjee"). */
  family: string;
  /** Given name(s) as Crossref publishes it; may be a full name ("Ranjan"), an initial ("R.", "M. Y."), or absent. */
  given?: string;
}

/**
 * Full Crossref work record as the author sweep consumes it (a projection of
 * api.crossref.org/works/<doi>: message.title, message.author,
 * message.issued/published[-print|-online]).
 */
export interface CrossrefWorkRecord {
  title?: string;
  authors: CrossrefAuthor[];
  /** Every candidate publication year Crossref reports, deduplicated. */
  years: number[];
}

/**
 * Parse the api.crossref.org /works/<doi> JSON into a CrossrefWorkRecord.
 * Returns null when the payload is not shaped like a Crossref work.
 */
export function parseCrossrefRecord(json: unknown): CrossrefWorkRecord | null {
  if (typeof json !== 'object' || json === null) return null;
  const message = (json as Record<string, unknown>)['message'];
  if (typeof message !== 'object' || message === null) return null;
  const record = message as Record<string, unknown>;

  let title: string | undefined;
  const rawTitle = record['title'];
  if (typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
    title = rawTitle;
  } else if (Array.isArray(rawTitle) && typeof rawTitle[0] === 'string' && rawTitle[0].trim().length > 0) {
    title = rawTitle[0];
  }

  const authors: CrossrefAuthor[] = [];
  const rawAuthors = record['author'];
  if (Array.isArray(rawAuthors)) {
    for (const entry of rawAuthors) {
      if (typeof entry !== 'object' || entry === null) continue;
      const author = entry as Record<string, unknown>;
      const family = author['family'];
      if (typeof family !== 'string' || family.trim().length === 0) continue;
      const given = author['given'];
      authors.push({
        family,
        ...(typeof given === 'string' && given.trim().length > 0 ? { given } : {}),
      });
    }
  }

  const years: number[] = [];
  const datePartsYear = (value: unknown): number | null => {
    if (typeof value !== 'object' || value === null) return null;
    const dateParts = (value as Record<string, unknown>)['date-parts'];
    if (
      Array.isArray(dateParts) &&
      Array.isArray(dateParts[0]) &&
      typeof dateParts[0][0] === 'number'
    ) {
      return dateParts[0][0];
    }
    return null;
  };
  for (const field of ['issued', 'published', 'published-print', 'published-online']) {
    const year = datePartsYear(record[field]);
    if (year !== null && !years.includes(year)) years.push(year);
  }

  return { ...(title !== undefined ? { title } : {}), authors, years };
}

/** Normalize a name for comparison: expand German umlauts (so "Schäffer"
 *  matches Crossref's "Schaeffer"), fold remaining diacritics, drop
 *  periods, case-fold. */
function nameKey(name: string): string {
  return name
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
}

/** Normalize a family name, additionally treating spaces/hyphens as equivalent. */
function familyKey(family: string): string {
  return nameKey(family)
    // Fold the umlaut transliteration both ways, so "Schäffer" (expanded to
    // "schaeffer") and Crossref's literal "Schaeffer"/"Schaffer" all agree.
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[\s-]+/g, '');
}

/**
 * Given-name initials, in order: "Ranjan" -> ["r"], "M. Y." -> ["m","y"],
 * "Michelle A." -> ["m","a"]. Empty for a bare family name.
 */
export function givenInitials(given: string | undefined): string[] {
  if (given === undefined) return [];
  return given
    .split(/[\s.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => token[0]!.toLowerCase());
}

/** True when a given-name string is initials only ("M.", "M. Y.", "J.-C."), not a full name. */
export function isInitialOnlyName(given: string | undefined): boolean {
  if (given === undefined) return false;
  const tokens = given
    .split(/[\s.]+/)
    .filter((t) => t.length > 0);
  return tokens.length > 0 && tokens.every((t) => t.replace(/-/, '').length === 1);
}

/** Split a registered "Given Names Family" string into {given, family},
 *  trying the last token as the family first, then the last two (so
 *  "Jared Di Carlo" parses with family "Di Carlo" when Crossref agrees). */
function splitRegisteredName(
  registered: string,
  crossrefFamily: string,
): { given: string; family: string } {
  const parts = registered.trim().split(/\s+/);
  const one = parts[parts.length - 1]!;
  if (familyKey(one) === familyKey(crossrefFamily) || parts.length === 1) {
    return { given: parts.slice(0, -1).join(' '), family: one };
  }
  const two = parts.slice(-2).join(' ');
  if (familyKey(two) === familyKey(crossrefFamily)) {
    return { given: parts.slice(0, -2).join(' '), family: two };
  }
  return { given: parts.slice(0, -1).join(' '), family: one };
}

/** First given-name token of a full (non-initial-only) given string. */
function primaryGivenToken(given: string): string {
  return given.split(/\s+/)[0] ?? '';
}

/**
 * Compare a registered author string against one Crossref author record.
 * Returns the divergence, or null when the registered name is consistent
 * with what the source publishes. See the module header for the rules.
 */
export function compareAuthorName(
  registered: string,
  crossref: CrossrefAuthor,
): string | null {
  const { given: registeredGiven, family: registeredFamily } = splitRegisteredName(
    registered,
    crossref.family,
  );
  if (familyKey(registeredFamily) !== familyKey(crossref.family)) {
    return `family "${registeredFamily}" vs Crossref "${crossref.family}"`;
  }
  const registeredInitials = givenInitials(registeredGiven);
  const crossrefInitials = givenInitials(crossref.given);

  const initialMismatch = (): string | null => {
    for (let i = 0; i < Math.min(registeredInitials.length, crossrefInitials.length); i++) {
      if (registeredInitials[i] !== crossrefInitials[i]) {
        return `given "${registeredGiven}" vs Crossref "${crossref.given ?? ''}" (initial ${registeredInitials[i]!.toUpperCase()} vs ${crossrefInitials[i]!.toUpperCase()})`;
      }
    }
    return null;
  };

  if (crossref.given !== undefined && !isInitialOnlyName(crossref.given)) {
    // The source publishes a full given name: the registry's primary token
    // must match (middle-initial completeness differs legitimately between
    // records; a different primary name never does).
    if (registeredGiven.length > 0 && !isInitialOnlyName(registeredGiven)) {
      const registryPrimary = nameKey(primaryGivenToken(registeredGiven)).replace(/\s/g, '');
      const crossrefPrimary = nameKey(primaryGivenToken(crossref.given)).replace(/\s/g, '');
      if (registryPrimary !== crossrefPrimary) {
        return `given "${registeredGiven}" vs Crossref "${crossref.given}"`;
      }
    }
    return initialMismatch();
  }
  // The source publishes only initials (or nothing): compare positionally.
  return initialMismatch();
}

/** The class of a reported divergence, so exceptions can be scoped precisely. */
export type DivergenceKind =
  | 'author-mismatch'
  | 'author-count'
  | 'author-expansion'
  | 'no-authors'
  | 'year'
  | 'title';

/** One reported divergence against one citation. */
export interface AuthorDivergence {
  citationId: string;
  kind: DivergenceKind;
  /** 1-based author position, for author-scoped kinds. */
  authorIndex?: number;
  problem: string;
}

/** A documented, verified exception (data/crossref-author-exceptions.ts). */
export interface CrossrefAuthorException {
  id: string;
  /**
   * Which check to skip: a divergence at exactly ONE named author
   * position ('author' or 'author-expansion', both of which REQUIRE
   * authorIndex), a position-less author-shape divergence ('author-count'
   * or 'no-authors', which take no authorIndex), or the year/title checks.
   * A blanket author-scoped entry without authorIndex is rejected outright
   * by crossrefAuthorExceptionProblems: before 2026-08-20 such an entry
   * was silently treated as a wildcard that muted its class for EVERY
   * author position on the id.
   */
  skip: 'author' | 'author-expansion' | 'author-count' | 'no-authors' | 'year' | 'title';
  authorIndex?: number;
  reason: string;
  /** How and when a human verified the claim the exception rests on. */
  verified: string;
}

/**
 * Compare a registry entry (id, authors, year, title) against its Crossref
 * record and return every divergence. Pure: the caller supplies the fetched
 * record, so the logic is unit-testable and offline.
 */
export function compareCitationAuthors(
  citation: { id: string; authors: string[]; year: number; title: string },
  work: CrossrefWorkRecord,
): AuthorDivergence[] {
  const divergences: AuthorDivergence[] = [];
  const add = (kind: DivergenceKind, problem: string, authorIndex?: number): void => {
    divergences.push({ citationId: citation.id, kind, ...(authorIndex !== undefined ? { authorIndex } : {}), problem });
  };

  if (work.authors.length > 0) {
    if (citation.authors.length !== work.authors.length) {
      add('author-count', `author count ${citation.authors.length} vs Crossref ${work.authors.length}`);
    }
    const paired = Math.min(citation.authors.length, work.authors.length);
    for (let i = 0; i < paired; i++) {
      const problem = compareAuthorName(citation.authors[i]!, work.authors[i]!);
      if (problem !== null) add('author-mismatch', `author ${i + 1}: ${problem}`, i + 1);
    }
    // The unverifiable-expansion pattern: Crossref publishes only an
    // initial and the registry stores a fuller name. The initial may agree,
    // but nothing in the record of source vouches for the expansion.
    // Byline-backed expansions belong in data/crossref-author-exceptions.ts.
    for (let i = 0; i < paired; i++) {
      const registered = citation.authors[i]!;
      const crossref = work.authors[i]!;
      if (!isInitialOnlyName(crossref.given)) continue;
      const { given: registeredGiven } = splitRegisteredName(registered, crossref.family);
      // An expansion is any registered given name that is NOT itself
      // initials ("J.-C." is initials; "Jean-Claude" and "Micha" are not).
      const expansion = registeredGiven.length > 0 && !isInitialOnlyName(registeredGiven);
      if (expansion) {
        add(
          'author-expansion',
          `author ${i + 1}: given name "${registeredGiven}" expands an initial; Crossref publishes only "${crossref.given}"`,
          i + 1,
        );
      }
    }
  } else if (citation.authors.length > 0) {
    add('no-authors', `Crossref publishes no personal authors for this DOI (registry lists ${citation.authors.length})`);
  }

  if (work.years.length > 0 && !work.years.includes(citation.year)) {
    add('year', `year ${citation.year} vs Crossref ${work.years.join('/')}`);
  }

  if (work.title !== undefined) {
    const registryTitle = normalizeTitle(citation.title);
    const crossrefTitle = normalizeTitle(work.title);
    if (
      registryTitle.length > 0 &&
      crossrefTitle.length > 0 &&
      !registryTitle.includes(crossrefTitle) &&
      !crossrefTitle.includes(registryTitle)
    ) {
      add('title', `title "${citation.title}" vs Crossref "${work.title}"`);
    }
  }

  return divergences;
}

/** True when a documented exception covers exactly this divergence. */
export function isDocumentedDivergence(
  divergence: AuthorDivergence,
  exceptions: CrossrefAuthorException[],
): boolean {
  return exceptions.some((exception) => {
    if (exception.id !== divergence.citationId) return false;
    switch (exception.skip) {
      // Author-scoped entries are position-exact: the entry must name the
      // same 1-based authorIndex as the divergence. An entry without an
      // authorIndex matches no position at all (and is rejected as
      // malformed by crossrefAuthorExceptionProblems), so it can never act
      // as a wildcard. Before 2026-08-20 a missing authorIndex muted the
      // entry's class for every author position on the id, which is how a
      // planted wrong name at an unprotected position survived a green
      // sweep.
      case 'author':
        return (
          (divergence.kind === 'author-mismatch' || divergence.kind === 'author-expansion') &&
          exception.authorIndex === divergence.authorIndex
        );
      case 'author-expansion':
        return (
          divergence.kind === 'author-expansion' &&
          exception.authorIndex === divergence.authorIndex
        );
      // Position-less author divergences have no author position to name,
      // so they are masked by their own dedicated skip values.
      case 'author-count':
        return divergence.kind === 'author-count';
      case 'no-authors':
        return divergence.kind === 'no-authors';
      case 'year':
        return divergence.kind === 'year';
      case 'title':
        return divergence.kind === 'title';
    }
  });
}

/** Skip values whose exceptions are scoped to one author position. */
const POSITION_SCOPED_SKIPS = new Set(['author', 'author-expansion']);

/**
 * Validate exception entries before they are allowed to mask anything.
 * An author-scoped entry (skip 'author' or 'author-expansion') MUST name
 * its 1-based authorIndex: a blanket entry without one used to mute its
 * class for every author position on the id, so the sweep treats the
 * whole file as malformed and exits 1 rather than running with a hole
 * open. Position-less skips must not carry an authorIndex, and every
 * entry must carry evidence (reason + verified).
 */
export function crossrefAuthorExceptionProblems(
  exceptions: CrossrefAuthorException[],
): string[] {
  const problems: string[] = [];
  for (const [index, exception] of exceptions.entries()) {
    const label = `[${exception.id}] entry ${index + 1} (skip: ${exception.skip})`;
    if (POSITION_SCOPED_SKIPS.has(exception.skip)) {
      if (exception.authorIndex === undefined) {
        problems.push(
          `${label}: author-scoped exceptions must name a 1-based authorIndex; a blanket entry would mask every author position on this id`,
        );
      } else if (!Number.isInteger(exception.authorIndex) || exception.authorIndex < 1) {
        problems.push(
          `${label}: authorIndex must be a 1-based position, got ${String(exception.authorIndex)}`,
        );
      }
    } else if (exception.authorIndex !== undefined) {
      problems.push(
        `${label}: skip '${exception.skip}' is not author-scoped, so authorIndex does not apply`,
      );
    }
    if (typeof exception.reason !== 'string' || exception.reason.trim().length === 0) {
      problems.push(`${label}: reason must say why the registry is right anyway`);
    }
    if (typeof exception.verified !== 'string' || exception.verified.trim().length === 0) {
      problems.push(`${label}: verified must name the source and date that was checked`);
    }
  }
  return problems;
}
