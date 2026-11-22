import matter from 'gray-matter';
import { getCitation } from '@/data/citations';
import { publishedModules } from '@/data/modules';
import { arxivPaper, type PaperCitations } from '@/lib/arxiv-search';
import { moduleSource } from '@/lib/module-source';
import { inlineCitationIds, resolveReferences } from '@/lib/references';

export const dynamic = 'force-static';

export function GET() {
  const { articles, papers }: PaperCitations = { articles: {}, papers: {} };
  const published = publishedModules().sort((a, b) => a.title.localeCompare(b.title, 'en'));
  for (const { domain, slug, title, summary } of published) {
    const article = `/${domain}/${slug}/`;
    const { content, data } = matter(moduleSource(domain, slug));
    const references = resolveReferences(data.citations ?? [], inlineCitationIds(content), getCitation);
    const seen = new Set<string>();
    for (const { citation, furtherReading } of references) {
      if (furtherReading) continue;
      const paper = arxivPaper(citation.url) ?? (citation.arxiv && arxivPaper(citation.arxiv));
      if (!paper || seen.has(paper.id)) continue;
      seen.add(paper.id);
      articles[article] ??= { title, summary };
      const entry = papers[paper.id] ??= { title: citation.title, citations: [] };
      entry.citations.push({ article, ref: citation.id, version: paper.version || undefined });
    }
  }
  return Response.json({ articles, papers });
}
