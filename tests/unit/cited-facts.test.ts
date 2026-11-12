import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { publishedModules } from '@/data/modules';
import { citedFactFindings, siteCitedFacts, type CitedFact } from '@/lib/cited-facts';
import { moduleSource } from '@/lib/module-source';

const ARTICLE = [
  '---',
  'title: "Teleoperation rigs"',
  'citations:',
  '  - act-aloha-2023',
  '  - listed-only',
  '---',
  '',
  'ACT learned six bimanual tasks from about 10 minutes of demonstrations each <Cite id="act-aloha-2023" />.',
].join('\n');

const fact = (overrides: Partial<CitedFact> = {}): CitedFact => ({
  where: 'home fact',
  article: 'data-hardware/teleop-rigs',
  citationId: 'act-aloha-2023',
  text: 'ACT learned six bimanual tasks, each from about 10 minutes of demonstrations',
  ...overrides,
});

const options = {
  published: new Set(['data-hardware/teleop-rigs']),
  citationIds: new Set(['act-aloha-2023', 'listed-only', 'never-cited']),
  readArticle: () => ARTICLE,
};

describe('cited facts outside their article', () => {
  it('accepts a fact whose article cites its source inline, in any wording', () => {
    expect(citedFactFindings([fact({ text: 'Ten minutes of demonstrations per task, 10 minutes in all' })], options))
      .toEqual({ errors: [], warnings: [] });
  });

  it('fails a fact whose source the article does not cite inline or at all', () => {
    const { errors } = citedFactFindings([
      fact({ citationId: 'listed-only' }),
      fact({ citationId: 'never-cited' }),
      fact({ citationId: 'not-registered' }),
      fact({ article: 'data-hardware/draft' }),
    ], options);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toMatch(/does not cite inline/);
    expect(errors[1]).toMatch(/does not cite in its citations list/);
    expect(errors[2]).toMatch(/does not hold/);
    expect(errors[3]).toMatch(/not a published article/);
  });

  it('warns, without failing, when the article no longer mentions a number the fact states', () => {
    const { errors, warnings } = citedFactFindings([fact({ text: 'ACT learned from 12 minutes of demonstrations' })], options);
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"12"');
  });

  it('holds every home and hub fact to a source its article cites inline', () => {
    const facts = siteCitedFacts();
    expect(facts.length).toBeGreaterThan(3);
    const { errors } = citedFactFindings(facts, {
      published: new Set(publishedModules().map(({ domain, slug }) => `${domain}/${slug}`)),
      citationIds: new Set(CITATIONS.map(({ id }) => id)),
      readArticle: (article) => {
        const [domain, slug] = article.split('/');
        return moduleSource(domain, slug);
      },
    });
    expect(errors).toEqual([]);
  });
});
