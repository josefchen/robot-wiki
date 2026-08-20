/**
 * arXiv author-metadata projection (citation author integrity, 2026-08-20).
 *
 * The Crossref author sweep (lib/crossref-authors.ts, run by
 * scripts/check-crossref-authors.ts) reaches only the 56 DOI-bearing
 * citations of the registry's 319. Of the 263 without a DOI, 147 cite an
 * arxiv.org URL (every one also carries the schema's bare `arxiv` id field,
 * re-derived from the tree 2026-08-20). The arXiv Atom API
 * (https://export.arxiv.org/api/query?id_list=<id>) publishes a full
 * author list per paper, so this module projects each Atom entry into the
 * same CrossrefWorkRecord shape the shared comparison already consumes:
 * one code path for the rules, one for the plumbing.
 *
 * Differences from Crossref the caller must know (handled in the script,
 * not here): arXiv publishes one `<name>` string per author (no separate
 * given/family fields), which splitArxivName divides at the last token;
 * and arXiv's `<published>` date is the PREPRINT date, which legitimately
 * predates a published version. A citation whose `venue` names a
 * conference or journal (isPublishedVenue) is flagged only on family
 * names and contradicted given names, never on the preprint's year or an
 * author-list shape difference, because a preprint byline and the
 * published version's byline can legitimately differ.
 */
import type { CrossrefWorkRecord } from './crossref-authors.ts';

/**
 * Extract the bare arXiv id from a registry URL, ignoring any version
 * suffix. Returns null for URLs that are not arxiv.org abs/pdf pages.
 */
export function extractArxivId(url: string | undefined): string | null {
  if (url === undefined) return null;
  const match = /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(?:v\d+)?/i.exec(url);
  return match ? match[1]! : null;
}

/** Split one Atom `<name>` into given/family at the last token. */
function splitArxivName(name: string): { family: string; given?: string } {
  const tokens = name.trim().split(/\s+/);
  const family = tokens[tokens.length - 1]!;
  const given = tokens.slice(0, -1).join(' ');
  return given.length > 0 ? { family, given } : { family };
}

/**
 * True when the citation's venue names a conference or journal (so the
 * entry cites the published version, not the preprint): any non-empty
 * venue that is not arXiv itself. The year check against arXiv's
 * `<published>` date is suppressed for these entries.
 */
export function isPublishedVenue(citation: { venue?: string }): boolean {
  const venue = citation.venue?.trim();
  if (venue === undefined || venue.length === 0) return false;
  return !/^arxiv\b/i.test(venue);
}

/**
 * Parse an arXiv Atom feed into a map of bare-id -> work record, the shape
 * lib/crossref-authors.ts's comparison consumes. Ids are version-stripped
 * (both feed keys and entry ids), so a registry `…v3` URL and the API's
 * `…v3` entry id agree with the bare registry id. A requested id with no
 * entry in the feed simply maps to nothing; the sweep reports it as
 * unverified rather than letting it pass vacuously.
 *
 * Hand-rolled XML scanning rather than a parser: the Atom schema for
 * entries is flat, the DOM is not available under plain Node, and every
 * tag we read is a distinct literal (`<entry>`, `<id>`, `<title>`,
 * `<published>`, `<author>`, `<name>`).
 */
export function parseArxivAtom(xml: string): Map<string, CrossrefWorkRecord> {
  const records = new Map<string, CrossrefWorkRecord>();
  for (const entryRaw of xml.split(/<entry>/).slice(1)) {
    const entry = entryRaw.split(/<\/entry>/)[0] ?? entryRaw;

    const idMatch = /<id>\s*https?:\/\/arxiv\.org\/abs\/(\d{4}\.\d{4,5})(?:v\d+)?\s*<\/id>/.exec(entry);
    if (idMatch === null) continue;
    const id = idMatch[1]!;

    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entry);
    const title = titleMatch
      ? titleMatch[1]!.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : undefined;

    const publishedMatch = /<published>(\d{4})-\d{2}-\d{2}T/.exec(entry);
    const years = publishedMatch ? [Number(publishedMatch[1]!)] : [];

    const authors: { family: string; given?: string }[] = [];
    for (const authorRaw of entry.split(/<author>/).slice(1)) {
      const nameMatch = /<name>([\s\S]*?)<\/name>/.exec(authorRaw.split(/<\/author>/)[0] ?? authorRaw);
      if (nameMatch === null) continue;
      const name = nameMatch[1]!.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (name.length > 0) authors.push(splitArxivName(name));
    }

    records.set(id, {
      ...(title !== undefined && title.length > 0 ? { title } : {}),
      authors,
      years,
    });
  }
  return records;
}
