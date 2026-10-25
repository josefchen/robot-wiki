import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Citation } from '../data/schemas/citation.ts';
import { inlineCitationIds, moduleBody } from './references.ts';

/**
 * Distinct sources per article (VAL-OPUS-152). A source an article cites is a
 * registry entry it marks with an inline <Cite>; a front-matter id the body
 * never cites renders under "Further reading" and does not count. Entries
 * that share an arXiv id, a DOI or a normalised URL are one source.
 */

export const MIN_DISTINCT_SOURCES = 30;

/** Lowercased URL without scheme, `www.`, query, fragment or trailing slash. */
export function normaliseUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

/** One key per real-world source: arXiv id, then DOI, then normalised URL. */
export function sourceKey(citation: Pick<Citation, 'url' | 'arxiv'>): string {
  const arxiv = citation.arxiv ?? citation.url.match(/arxiv\.org\/(?:abs|pdf|html)\/([0-9]{4}\.[0-9]{4,5})/i)?.[1];
  if (arxiv) return `arxiv:${arxiv}`;
  const doi = citation.url.match(/doi\.org\/(10\.[^?#\s]+)/i)?.[1];
  if (doi) return `doi:${doi.replace(/\/+$/, '').toLowerCase()}`;
  return `url:${normaliseUrl(citation.url)}`;
}

export type ArticleSourceCount = {
  route: string;
  file: string;
  /** Inline-cited ids, in order of first use. */
  cited: string[];
  /** Distinct source keys behind `cited`. */
  sources: string[];
  /** Cited ids the registry does not hold (the content validator rejects these). */
  unknown: string[];
};

export function countArticleSources(
  contentDir: string,
  modules: readonly { domain: string; slug: string }[],
  lookup: (id: string) => Citation | undefined,
): ArticleSourceCount[] {
  return modules.map(({ domain, slug }) => {
    const file = join(contentDir, domain, `${slug}.mdx`);
    const cited = inlineCitationIds(moduleBody(readFileSync(file, 'utf8')));
    const unknown = cited.filter((id) => !lookup(id));
    const sources = [...new Set(cited.flatMap((id) => {
      const citation = lookup(id);
      return citation ? [sourceKey(citation)] : [];
    }))];
    return { route: `/${domain}/${slug}/`, file, cited, sources, unknown };
  });
}
