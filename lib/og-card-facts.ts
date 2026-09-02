/**
 * The article facts an Open Graph card carries, read from the same MDX
 * frontmatter the article template uses. Kept out of the generator script
 * so the renderer font/parity checks can rebuild the exact shipped card
 * corpus without importing a module that renders on import.
 */
import matter from 'gray-matter';

export interface ArticleCardFacts {
  referenceCount: number;
  reviewYear: number;
}

/** Extracts the citations count and lastReviewed year from MDX frontmatter. */
export function articleCardFacts(mdxSource: string): ArticleCardFacts {
  const fm = matter(mdxSource).data as Record<string, unknown>;
  const citations = Array.isArray(fm.citations) ? fm.citations.length : 0;
  const lastReviewed =
    typeof fm.lastReviewed === 'string' ? fm.lastReviewed : '';
  const year = Number.parseInt(lastReviewed.slice(0, 4), 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`invalid lastReviewed: ${lastReviewed}`);
  }
  if (citations < 1) {
    throw new Error(
      'published article cites nothing; refusing to render an empty count',
    );
  }
  return { referenceCount: citations, reviewYear: year };
}
