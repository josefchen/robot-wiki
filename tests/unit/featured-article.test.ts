import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  leadExcerpt,
  leadParagraph,
  renderedLeadText,
  sentences,
  wordCount,
} from '@/lib/article-lead';
import {
  FEATURED_DEK_MAX_WORDS,
  FEATURED_MAX_DOMAIN_NAMES,
  HOME_ROTATING_WORDS,
  domainNamesIn,
  featuredArticle,
  featuredArticleFrom,
  featuredArticleWithin,
  featuredPickProblems,
  longestRecentListWords,
  recentListWords,
} from '@/lib/featured-article';
import { homeCopyProblems } from '@/lib/home-copy';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '@/data/home-featured';
import { DOMAIN_META, getModule, publishedModules } from '@/data/modules';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { EXPLAINER_WORDS } from '@/components/explainers/words';

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
  afterEach(() => vi.useRealTimers());

  it('features the first editor pick, the world-models taxonomy, with its own dek', () => {
    expect(HOME_FEATURED_PICKS[0]).toMatchObject({ domain: 'world-models', slug: 'taxonomy' });
    const featured = featuredArticle();
    expect(featured).toEqual({
      domain: 'world-models',
      slug: 'taxonomy',
      title: getModule('world-models', 'taxonomy')?.title,
      href: '/world-models/taxonomy/',
      dek: HOME_FEATURED_PICKS[0].dek,
    });
    expect(featured.title).toBe('What Is a World Model?');
  });

  it('keeps the pick for every date: only an edit to the list moves it', () => {
    const picks = new Set<string>();
    for (const day of [0, 1, 2, 30, 365]) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 13 + day, 12)));
      picks.add(featuredArticle().href);
      vi.useRealTimers();
    }
    expect([...picks]).toEqual(['/world-models/taxonomy/']);
    // An editor who reorders the list moves the pick, and nothing else does.
    const [first, second, ...rest] = HOME_FEATURED_PICKS;
    expect(featuredArticle([second, first, ...rest]).href).toBe(`/${second.domain}/${second.slug}/`);
    expect(() => featuredArticle([])).toThrow(/no featured pick/);
  });

  it('keeps a short ordered list of hot picks, each a published article with a dek home may show', () => {
    expect(HOME_FEATURED_PICKS.map(({ domain, slug }) => `${domain}/${slug}`)).toEqual([
      'world-models/taxonomy',
      'rl-sim2real/humanoid-wbc',
      'world-models/generative-video',
    ]);
    expect(FEATURED_DEK_MAX_WORDS).toBeLessThanOrEqual(25);
    for (const pick of HOME_FEATURED_PICKS) {
      const label = `${pick.domain}/${pick.slug}`;
      expect(featuredPickProblems(pick), label).toEqual([]);
      expect(getModule(pick.domain, pick.slug)?.status, label).toBe('published');
      expect(wordCount(pick.dek), label).toBeGreaterThan(5);
      expect(wordCount(pick.dek), label).toBeLessThanOrEqual(FEATURED_DEK_MAX_WORDS);
      expect(pick.dek, label).not.toMatch(/\d/);
      expect(pick.dek, label).toMatch(/^[A-Z].*\.$/);
      expect(homeCopyProblems(pick.dek), label).toEqual([]);
      expect(featuredArticleFrom(pick).href).toBe(`/${pick.domain}/${pick.slug}/`);
    }
  });

  it('refuses a pick that is unpublished, long, numbered, dashed, banned or lists the taxonomy', () => {
    const base = HOME_FEATURED_PICKS[0];
    const problems = (dek: string, slug = base.slug) =>
      featuredPickProblems({ domain: base.domain, slug, dek });
    expect(problems(base.dek)).toEqual([]);
    expect(problems(base.dek, 'no-such-article')).toEqual([
      'world-models/no-such-article is not a published article',
    ]);
    expect(problems(Array.from({ length: 26 }, () => 'word').join(' '))).toEqual([
      'the dek runs to 26 words, over 25',
    ]);
    expect(problems('A model trained on 1,000 hours of video.')).toEqual([
      'the dek prints a number with no citation',
    ]);
    expect(problems('A model that imagines \u2014 then acts.')).toEqual([
      'the dek carries an em or en dash',
    ]);
    expect(problems('A groundbreaking model.')).toEqual(['the dek carries banned wording "groundbreaking"']);
    expect(problems('Its one prerequisite is a model.')).toEqual([
      'the dek carries reading-guide wording "prerequisite"',
    ]);
    const taxonomy = Object.values(DOMAIN_META).slice(0, 4).map(({ name }) => name).join(', ');
    expect(domainNamesIn(taxonomy).length).toBeGreaterThan(FEATURED_MAX_DOMAIN_NAMES);
    expect(problems(`It touches ${taxonomy}.`)[0]).toMatch(/name \d+ domains/);
    expect(() =>
      featuredArticle([{ ...base, dek: 'A model trained on 1,000 hours of video.' }]),
    ).toThrow(/cannot be featured: the dek prints a number/);
  });
});

describe('featured article beside "Recently updated"', () => {
  it('counts each update as its ISO date and its title', () => {
    expect(
      recentListWords([{ title: 'State Estimation' }, { title: 'What Is a World Model?' }]),
    ).toBe(1 + 2 + 1 + 5);
  });

  it('fits every pick beside the five longest titles an update list could print', () => {
    const longest = [...publishedModules()]
      .sort((left, right) => wordCount(right.title) - wordCount(left.title))
      .slice(0, 5);
    expect(longestRecentListWords()).toBe(recentListWords(longest));
    for (const pick of HOME_FEATURED_PICKS) {
      const { title, dek } = featuredArticleFrom(pick);
      expect(
        wordCount(title) + wordCount(dek) + longestRecentListWords(),
        `${pick.domain}/${pick.slug} beside the longest update list`,
      ).toBeLessThanOrEqual(HOME_ROTATING_WORDS);
      // So no content commit can leave the build without room for it.
      expect(featuredArticleWithin(HOME_ROTATING_WORDS - longestRecentListWords(), [pick]).href)
        .toBe(`/${pick.domain}/${pick.slug}/`);
    }
  });

  it('refuses a featured title and dek that do not fit the words left', () => {
    const { title, dek } = featuredArticle();
    const fit = wordCount(title) + wordCount(dek);
    expect(featuredArticleWithin(fit).href).toBe('/world-models/taxonomy/');
    expect(() => featuredArticleWithin(fit - 1)).toThrow(/over the \d+ home has left/);
  });
});

describe('featured scene', () => {
  const scene = HOME_FEATURED_SCENE;
  const sceneSource = readFileSync(
    join(process.cwd(), 'components/explainers/scenes', `${scene.explainer}.js`),
    'utf8',
  );

  it('features one explainer from the How robots work catalog, credited to a published article', () => {
    expect(scene.explainer).toBe('humanoid');
    const entry = EXPLAINER_ORDER.find(({ id }) => id === scene.explainer);
    expect(entry?.label).toBe('Inside a humanoid');
    expect(scene.related).toEqual({ domain: 'rl-sim2real', slug: 'humanoid-wbc' });
    expect(getModule(scene.related.domain, scene.related.slug)).toMatchObject({
      status: 'published',
      title: 'Humanoid Whole-Body Control',
    });
  });

  it('captions the scene in 25 words or fewer, with only numbers the scene itself prints from its spec page', () => {
    expect(wordCount(scene.caption)).toBeGreaterThan(5);
    expect(wordCount(scene.caption)).toBeLessThanOrEqual(25);
    expect(homeCopyProblems(scene.caption)).toEqual([]);
    // The scene's own motor tally and the spec page it cites for it.
    expect(sceneSource).toContain('Numbers: Unitree G1 spec page (unitree.com/g1)');
    const tally = /ui\.readout\('Motors: legs <b>(\d+)<\/b>, arms <b>(\d+)<\/b>, waist <b>(\d+)<\/b>\. That is all <b>(\d+)<\/b>/.exec(
      sceneSource,
    );
    expect(tally, 'the scene prints its motor tally').not.toBeNull();
    const [legs, arms, waist, total] = tally!.slice(1).map(Number);
    expect(legs + arms + waist).toBe(total);
    expect(EXPLAINER_WORDS.humanoid.steps.join(' ')).toContain(`It has ${total} motors`);
    // Numbers as words: the 1 in the model name G1 is no count.
    const numbers = [...scene.caption.matchAll(/(?<![A-Za-z\d])\d+(?![A-Za-z\d])/g)].map(([value]) => Number(value));
    expect(numbers).toEqual([total, legs]);
    expect(scene.caption).toMatch(new RegExp(`${total} motors, ${legs} move its legs`));
  });

  it('labels the start control in a few plain words', () => {
    expect(wordCount(scene.startLabel)).toBeLessThanOrEqual(4);
    expect(homeCopyProblems(scene.startLabel)).toEqual([]);
  });
});
