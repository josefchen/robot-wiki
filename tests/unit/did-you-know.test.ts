import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { citationLabel, getCitation } from '@/data/citations';
import { DID_YOU_KNOW, didYouKnowText } from '@/data/did-you-know';
import { getModule } from '@/data/modules';
import { wordCount } from '@/lib/article-lead';
import { homeCopyProblems } from '@/lib/home-copy';
import { moduleSource } from '@/lib/module-source';

/** A paragraph's reader-visible prose: chips dropped, inline markup unwrapped. */
function plainParagraph(paragraph: string): string {
  return paragraph
    .replace(/<Cite\b[^>]*\/>/g, '')
    .replace(/<Term\b[^>]*>([^<]*)<\/Term>/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function paragraphs(domain: string, slug: string): string[] {
  return matter(moduleSource(domain, slug))
    .content.split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).join(' '));
}

describe('Did you know (VAL-OPUS-018)', () => {
  it('holds exactly three facts from three different articles', () => {
    expect(DID_YOU_KNOW).toHaveLength(3);
    expect(new Set(DID_YOU_KNOW.map((fact) => fact.id)).size).toBe(3);
    expect(new Set(DID_YOU_KNOW.map((fact) => `${fact.domain}/${fact.slug}`)).size).toBe(3);
  });

  for (const fact of DID_YOU_KNOW) {
    describe(fact.id, () => {
      const citation = getCitation(fact.citationId);

      it('links a published article and cites a registered source', () => {
        expect(getModule(fact.domain, fact.slug)?.status).toBe('published');
        expect(citation, fact.citationId).toBeDefined();
        expect(fact.linked.trim().length).toBeGreaterThan(0);
      });

      it('runs to 20 words or fewer with its citation label counted', () => {
        const label = citationLabel(citation!);
        expect(wordCount(`${didYouKnowText(fact)} ${label}.`)).toBeLessThanOrEqual(20);
      });

      it('is stated, with the same citation, in the article it links to', () => {
        const holding = paragraphs(fact.domain, fact.slug).filter((paragraph) =>
          plainParagraph(paragraph).includes(fact.passage),
        );
        expect(holding, `${fact.domain}/${fact.slug} states "${fact.passage}"`).toHaveLength(1);
        expect(holding[0]).toContain(`<Cite id="${fact.citationId}"`);
        const cited = matter(moduleSource(fact.domain, fact.slug)).data.citations;
        expect(cited).toContain(fact.citationId);
      });

      it('uses wording home may show', () => {
        expect(homeCopyProblems(didYouKnowText(fact))).toEqual([]);
      });
    });
  }
});
