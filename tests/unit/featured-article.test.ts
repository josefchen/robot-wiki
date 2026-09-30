import { describe, expect, it } from 'vitest';
import {
  leadExcerpt,
  leadParagraph,
  renderedLeadText,
  sentences,
  wordCount,
} from '@/lib/article-lead';
import {
  FEATURED_LEAD_MAX_WORDS,
  FEATURED_MAX_DOMAIN_NAMES,
  HOME_ROTATING_WORDS,
  domainNamesIn,
  featuredArticleFor,
  featuredArticleWithin,
  featuredCandidates,
  namesTopic,
  recentListWords,
  utcDayNumber,
} from '@/lib/featured-article';
import { homeCopyProblems } from '@/lib/home-copy';
import { moduleSource } from '@/lib/module-source';
import { getModule, publishedModules } from '@/data/modules';

describe('article lead excerpts', () => {
  const source = (body: string) => `---\ntitle: Test\n---\n\n${body}\n`;

  it('reads the first prose paragraph and skips imports and mounted components', () => {
    const body = [
      "import { Chart } from '@/components/chart';",
      '<Chart id="x" />',
      'The first paragraph\nwraps across lines.',
      'The second paragraph.',
    ].join('\n\n');
    expect(leadParagraph(source(body))).toBe('The first paragraph wraps across lines.');
  });

  it('refuses a lead that continues a sentence broken by display maths', () => {
    expect(leadParagraph(source('continues after an equation.'))).toBeNull();
  });

  it('unwraps glossary terms, links and emphasis to the text the reader sees', () => {
    expect(
      renderedLeadText(
        'A <Term id="vla">vision-language-action model</Term> maps [pixels](/x/) to *actions* and **torques**.',
      ),
    ).toBe('A vision-language-action model maps pixels to actions and torques.');
  });

  it('does not end a sentence at an abbreviation', () => {
    expect(sentences('Methods, e.g. ACT, help. Diffusion works too.')).toEqual([
      'Methods, e.g. ACT, help.',
      'Diffusion works too.',
    ]);
  });

  it('stops before a sentence whose rendered text differs from its source', () => {
    const body = 'One clean sentence here. A cited sentence follows <Cite id="x" />. A third.';
    expect(leadExcerpt(source(body), 50)).toBe('One clean sentence here.');
  });

  it('keeps whole sentences within the word budget', () => {
    const body = 'Four words sit here. Then five more words follow. Last.';
    expect(leadExcerpt(source(body), 9)).toBe('Four words sit here. Then five more words follow.');
    expect(leadExcerpt(source(body), 8)).toBe('Four words sit here.');
    expect(leadExcerpt(source(body), 3)).toBeNull();
  });
});

describe('featured article', () => {
  const candidates = featuredCandidates();

  it('holds the lead within the 50-word bound of VAL-OPUS-016', () => {
    expect(FEATURED_LEAD_MAX_WORDS).toBeLessThanOrEqual(50);
  });

  it('draws from a pool of published articles', () => {
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    for (const candidate of candidates) {
      expect(getModule(candidate.domain, candidate.slug)?.status).toBe('published');
      expect(candidate.href).toBe(`/${candidate.domain}/${candidate.slug}/`);
    }
  });

  it('features each lead verbatim, within budget and in wording home may show', () => {
    for (const candidate of candidates) {
      const paragraph = leadParagraph(moduleSource(candidate.domain, candidate.slug));
      expect(paragraph, candidate.href).not.toBeNull();
      const rendered = renderedLeadText(paragraph ?? '');
      expect(rendered.startsWith(candidate.excerpt), candidate.href).toBe(true);
      expect(wordCount(candidate.excerpt)).toBeLessThanOrEqual(FEATURED_LEAD_MAX_WORDS);
      expect(homeCopyProblems(candidate.excerpt), candidate.href).toEqual([]);
      expect(namesTopic(candidate.title, candidate.excerpt), candidate.href).toBe(true);
      expect(
        domainNamesIn(`${candidate.title} ${candidate.excerpt}`).length,
        candidate.href,
      ).toBeLessThanOrEqual(FEATURED_MAX_DOMAIN_NAMES);
    }
  });

  it('passes over a lead that reads as a reading guide or lists the taxonomy', () => {
    const [guide, order, taxonomy, plain] = publishedModules();
    const taxonomyLead = `${taxonomy.title} touches World Models, Classical Foundations, Adjacent Domains and Frontier & Open Problems.`;
    const bodies = new Map([
      [`${guide.domain}/${guide.slug}`, `${guide.title} has one prerequisite, supervised learning.`],
      [`${order.domain}/${order.slug}`, `The reading order for ${order.title} starts with the basics.`],
      [`${taxonomy.domain}/${taxonomy.slug}`, taxonomyLead],
      [`${plain.domain}/${plain.slug}`, `${plain.title} is one way to train a robot policy.`],
    ]);
    const picked = featuredCandidates((domain, slug) => {
      const body = bodies.get(`${domain}/${slug}`);
      return body ? `---\ntitle: Test\n---\n\n${body}\n` : '';
    });
    expect(picked.map(({ href }) => href)).toEqual([`/${plain.domain}/${plain.slug}/`]);
    expect(domainNamesIn(taxonomyLead).length).toBeGreaterThan(FEATURED_MAX_DOMAIN_NAMES);
    expect(homeCopyProblems('It has one prerequisite.')).toEqual([
      'reading-guide wording "prerequisite"',
    ]);
  });

  it('rotates by date without a code edit', () => {
    const today = featuredArticleFor(new Date('2026-09-30T12:00:00Z'), candidates);
    const tomorrow = featuredArticleFor(new Date('2026-10-01T12:00:00Z'), candidates);
    expect(today.href).not.toBe(tomorrow.href);
    const picks = new Set(
      Array.from({ length: candidates.length }, (_, day) =>
        featuredArticleFor(new Date(Date.UTC(2026, 8, 30 + day)), candidates).href,
      ),
    );
    expect(picks.size).toBe(candidates.length);
  });

  it('keeps one choice for the whole of a UTC day', () => {
    const morning = featuredArticleFor(new Date('2026-09-30T00:00:01Z'), candidates);
    const night = featuredArticleFor(new Date('2026-09-30T23:59:59Z'), candidates);
    expect(morning.href).toBe(night.href);
    expect(utcDayNumber(new Date('2026-09-30T23:59:59Z'))).toBe(
      utcDayNumber(new Date('2026-09-30T00:00:00Z')),
    );
  });

  it('fails loudly when no lead can be featured', () => {
    expect(() => featuredArticleFor(new Date(), [])).toThrow(/no published article/);
  });
});

describe('featured article beside "Recently updated"', () => {
  const candidates = featuredCandidates();
  const fitWords = ({ title, excerpt }: { title: string; excerpt: string }) =>
    wordCount(title) + wordCount(excerpt);

  it('counts each update as its ISO date and its title', () => {
    expect(
      recentListWords([{ title: 'State Estimation' }, { title: 'What Is a World Model?' }]),
    ).toBe(1 + 2 + 1 + 5);
  });

  it('only picks a title and lead that fit the words left', () => {
    const tightest = Math.min(...candidates.map(fitWords));
    for (let day = 0; day < candidates.length; day += 1) {
      const pick = featuredArticleWithin(new Date(Date.UTC(2026, 8, 30 + day)), tightest, candidates);
      expect(fitWords(pick)).toBe(tightest);
    }
    expect(() => featuredArticleWithin(new Date(), tightest - 1, candidates)).toThrow(
      /no featured title and lead fit/,
    );
  });

  it('still rotates when the five longest titles are the latest updates', () => {
    const longest = [...publishedModules()]
      .sort((left, right) => wordCount(right.title) - wordCount(left.title))
      .slice(0, 5);
    const left = HOME_ROTATING_WORDS - recentListWords(longest);
    const picks = new Set(
      Array.from({ length: candidates.length }, (_, day) =>
        featuredArticleWithin(new Date(Date.UTC(2026, 8, 30 + day)), left, candidates).href,
      ),
    );
    expect(picks.size).toBeGreaterThanOrEqual(2);
  });
});
