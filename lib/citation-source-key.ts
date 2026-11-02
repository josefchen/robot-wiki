import type { Citation } from '../data/schemas/citation.ts';

/** Lowercased URL without scheme, www, query, fragment or trailing slash. */
export function normaliseUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

/** One key per real-world source, shared by counts and citation labels. */
export function sourceKey(citation: Pick<Citation, 'url' | 'arxiv'>): string {
  const arxiv = citation.arxiv ?? citation.url.match(/arxiv\.org\/(?:abs|pdf|html)\/([0-9]{4}\.[0-9]{4,5})/i)?.[1];
  if (arxiv) return `arxiv:${arxiv}`;
  const doi = citation.url.match(/doi\.org\/(10\.[^?#\s]+)/i)?.[1];
  if (doi) return `doi:${doi.replace(/\/+$/, '').toLowerCase()}`;
  return `url:${normaliseUrl(citation.url)}`;
}
