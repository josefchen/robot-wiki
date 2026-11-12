import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  leadExcerpt,
  leadParagraph,
  renderedLeadText,
  sentences,
  wordCount,
} from '@/lib/article-lead';
import {
  ENTRY_CROP_RATIO,
  FEATURED_DEK_MAX_WORDS,
  FEATURED_MAX_DOMAIN_NAMES,
  START_HERE_COUNT,
  articleShowsImage,
  domainNamesIn,
  featuredArticle,
  featuredArticleFrom,
  featuredPickProblems,
  startHere,
} from '@/lib/featured-article';
import { homeCopyProblems } from '@/lib/home-copy';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '@/data/home-featured';
import { getImage } from '@/data/images';
import { DOMAIN_META, getModule } from '@/data/modules';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';

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

describe('"Start here" picks', () => {
  afterEach(() => vi.useRealTimers());

  it('starts at four editor picks, hottest first, the world-models taxonomy leading', () => {
    expect(HOME_FEATURED_PICKS.map(({ domain, slug }) => `${domain}/${slug}`)).toEqual([
      'world-models/taxonomy',
      'manipulation/vla-models',
      'rl-sim2real/humanoid-wbc',
      'frontier/reliability-gap',
    ]);
    const entries = startHere();
    expect(entries).toHaveLength(START_HERE_COUNT);
    expect(entries.map(({ title }) => title)).toEqual([
      'What Is a World Model?',
      'Vision-Language-Action Models',
      'Humanoid Whole-Body Control',
      'The Reliability Gap',
    ]);
    expect(featuredArticle()).toEqual(entries[0]);
    expect(entries[0].href).toBe('/world-models/taxonomy/');
  });

  it('keeps the order for every date: only an edit to the list moves it', () => {
    const leads = new Set<string>();
    for (const day of [0, 1, 2, 30, 365]) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 10, 12 + day, 12)));
      leads.add(startHere().map(({ href }) => href).join(' '));
      vi.useRealTimers();
    }
    expect(leads.size).toBe(1);
    // An editor who reorders the list moves the lead, and nothing else does.
    const [first, second, ...rest] = HOME_FEATURED_PICKS;
    const reordered = [{ ...second, crop: first.crop, imageId: first.imageId }, first, ...rest];
    expect(() => startHere(reordered)).toThrow(/not one of manipulation\/vla-models's own images/);
    expect(() => startHere(HOME_FEATURED_PICKS.slice(0, 3))).toThrow(/needs 4 picks/);
    expect(() => featuredArticle([])).toThrow(/no featured pick/);
  });

  it('gives every pick a short plain dek and one of its own article\'s pictures, cropped to the same 3:2', () => {
    expect(FEATURED_DEK_MAX_WORDS).toBe(14);
    expect(ENTRY_CROP_RATIO).toBe(3 / 2);
    HOME_FEATURED_PICKS.forEach((pick) => {
      const label = `${pick.domain}/${pick.slug}`;
      expect(featuredPickProblems(pick), label).toEqual([]);
      expect(pick.crop.width / pick.crop.height, label).toBeCloseTo(1.5, 2);
      expect(getModule(pick.domain, pick.slug)?.status, label).toBe('published');
      expect(wordCount(pick.dek), label).toBeGreaterThan(5);
      expect(wordCount(pick.dek), label).toBeLessThanOrEqual(FEATURED_DEK_MAX_WORDS);
      expect(pick.dek, label).not.toMatch(/\d/);
      expect(pick.dek, label).toMatch(/^[A-Z].*\.$/);
      expect(homeCopyProblems(pick.dek), label).toEqual([]);
      expect(homeCopyProblems(pick.alt), label).toEqual([]);
      // The picture is registered, licensed and shown by the article itself.
      const image = getImage(pick.imageId);
      expect(image, label).toBeDefined();
      expect(image?.licence, label).toBeTruthy();
      expect(articleShowsImage(pick.domain, pick.slug, pick.imageId), label).toBe(true);
      const entry = featuredArticleFrom(pick);
      expect(entry.picture.src).toBe(image?.file);
      expect(entry.picture.width).toBe(image?.width);
      expect(entry.picture.height).toBe(image?.height);
      expect(entry.picture.credit.creator).toBe(image?.creator);
    });
  });

  it('refuses a pick that is unpublished, long, numbered, dashed, banned, borrowed or badly cropped', () => {
    const base = HOME_FEATURED_PICKS[1];
    const problems = (patch: Partial<typeof base>) => featuredPickProblems({ ...base, ...patch });
    expect(problems({})).toEqual([]);
    expect(problems({ slug: 'no-such-article' })).toContain('manipulation/no-such-article is not a published article');
    expect(problems({ dek: Array.from({ length: 15 }, () => 'word').join(' ') })).toEqual([
      'the dek runs to 15 words, over 14',
    ]);
    expect(problems({ dek: 'A model trained on 1,000 hours of video.' })).toEqual([
      'the dek prints a number with no citation',
    ]);
    expect(problems({ dek: 'A model that imagines \u2014 then acts.' })).toEqual([
      'the dek carries an em or en dash',
    ]);
    expect(problems({ dek: 'A groundbreaking model.' })).toEqual(['the dek carries banned wording "groundbreaking"']);
    expect(problems({ dek: 'Its one prerequisite is a model.' })).toEqual([
      'the dek carries reading-guide wording "prerequisite"',
    ]);
    expect(problems({ imageId: 'no-such-image' })).toEqual(['no-such-image is not a registered image']);
    expect(problems({ imageId: 'tesla-optimus-stockholm-2024', crop: { x: 0, y: 0, width: 300, height: 200 } })).toEqual([
      "tesla-optimus-stockholm-2024 is not one of manipulation/vla-models's own images",
    ]);
    expect(problems({ crop: { x: 1300, y: 0, width: 300, height: 200 } })[0]).toMatch(/falls outside/);
    expect(problems({ crop: { x: 0, y: 0, width: 300, height: 300 } })[0]).toMatch(/1\.00:1, not the 1\.50:1/);
    expect(problems({ alt: 'A picture.' })).toEqual(['the picture has no real alternative text']);
    const taxonomy = Object.values(DOMAIN_META).slice(0, 4).map(({ name }) => name).join(', ');
    expect(domainNamesIn(taxonomy).length).toBeGreaterThan(FEATURED_MAX_DOMAIN_NAMES);
    expect(problems({ dek: `It touches ${taxonomy}.` }).join(' ')).toMatch(/name \d+ domains/);
    expect(() =>
      featuredArticleFrom({ ...base, dek: 'A model trained on 1,000 hours of video.' }),
    ).toThrow(/cannot be featured: the dek prints a number/);
  });
});

describe('home scene', () => {
  const scene = HOME_FEATURED_SCENE;

  it('sets one explainer from the How robots work catalog beside the name', () => {
    expect(scene.explainer).toBe('humanoid');
    const entry = EXPLAINER_ORDER.find(({ id }) => id === scene.explainer);
    expect(entry?.label).toBe('Inside a humanoid');
  });

  it('labels the start control in a few plain words', () => {
    expect(wordCount(scene.startLabel)).toBeLessThanOrEqual(4);
    expect(homeCopyProblems(scene.startLabel)).toEqual([]);
  });
});
