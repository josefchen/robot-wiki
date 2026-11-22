/** A complete modern arXiv identifier or an arxiv.org paper URL. */
export function arxivPaper(query: string): { id: string; version: string } | undefined {
  const value = query.trim();
  const url = /^https?:\/\/(?:www\.)?arxiv\.org\/(abs|pdf|html)\/([^/?#\s]+)\/?(?:[?#][^\s]*)?$/i.exec(value);
  let identifier = url ? url[2] : value.replace(/^arxiv:\s*/i, '');
  if (url?.[1].toLowerCase() === 'pdf') identifier = identifier.replace(/\.pdf$/i, '');
  const match = /^(\d{2}(?:0[1-9]|1[0-2])\.\d{4,5})(v[1-9]\d*)?$/i.exec(identifier);
  return match ? { id: match[1], version: match[2]?.toLowerCase() ?? '' } : undefined;
}

export type PaperCitations = {
  articles: Record<string, { title: string; summary: string }>;
  papers: Record<string, {
    title: string;
    citations: { article: string; ref: string; version?: string }[];
  }>;
};

let index: Promise<PaperCitations> | undefined;

/** Share the download across lookups. Release a failed request so readers can retry. */
export async function findPaperCitations(id: string) {
  index ??= fetch('/paper-citations.json').then(async (response) => {
    if (!response.ok) throw new Error('Paper citations could not load');
    return await response.json() as PaperCitations;
  }).catch((error: unknown) => {
    index = undefined;
    throw error;
  });

  const { articles, papers } = await index;
  const paper = papers[id];
  return {
    title: paper?.title,
    hits: (paper?.citations ?? []).map(({ article, ref, version }) => {
      const { title, summary } = articles[article];
      const text = version ? `${summary} This article cites ${version}.` : summary;
      return {
        url: `${article}#ref-${ref}`,
        title,
        // The shared result list also accepts Pagefind's HTML highlights.
        excerpt: text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
      };
    }),
  };
}
