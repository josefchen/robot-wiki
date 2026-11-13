import { describe, expect, it } from 'vitest';
import { citationLabel, getCitation } from '@/data/citations';
import { DID_YOU_KNOW, didYouKnowText } from '@/data/did-you-know';
import { getModule } from '@/data/modules';
import { wordCount } from '@/lib/article-lead';
import { homeCopyProblems } from '@/lib/home-copy';

describe('Did you know', () => {
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

      it('uses wording home may show', () => {
        expect(homeCopyProblems(didYouKnowText(fact))).toEqual([]);
      });
    });
  }
});
