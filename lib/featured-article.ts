import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import { leadExcerpt, wordCount } from './article-lead.ts';
import { homeCopyProblems } from './home-copy.ts';
import { moduleSource } from './module-source.ts';

/**
 * The home page's featured article: one published article's opening
 * sentences, verbatim, chosen by the date so the choice rotates without an
 * edit. The selection runs when the page is built.
 */
export const FEATURED_LEAD_MAX_WORDS = 25;

/**
 * The words the featured article and "Recently updated" share on home: the
 * featured title and lead, and each update's date and title. Both change
 * without an edit to home, one with the date and the other with each
 * content commit, so on a day when the update titles run long the featured
 * pick passes over the longer leads. The rest of <main> fits in what this
 * leaves of the 250-word VAL-OPUS-021 budget, which
 * tests/e2e/home-front-page.spec.ts measures.
 */
export const HOME_ROTATING_WORDS = 54;

/** The words a "Recently updated" list prints: an ISO date and a title per row. */
export function recentListWords(entries: readonly { title: string }[]): number {
  return entries.reduce((sum, { title }) => sum + 1 + wordCount(title), 0);
}

export type FeaturedArticle = {
  domain: string;
  slug: string;
  title: string;
  href: string;
  excerpt: string;
};

// An opening that points at the rest of the site ("the previous module",
// "the scene below") reads as a fragment once it is lifted onto home.
const SITE_REFERENCE = /\b(?:modules?|previous|below|above|scrubber|scene)\b/i;

const TITLE_STOPWORDS = new Set([
  'about',
  'and',
  'for',
  'from',
  'into',
  'other',
  'that',
  'the',
  'what',
  'when',
  'where',
  'which',
  'with',
]);

/** Whether the excerpt names what the article is about, by a title word. */
export function namesTopic(title: string, excerpt: string): boolean {
  const text = excerpt.toLowerCase();
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !TITLE_STOPWORDS.has(word))
    .some((word) => text.includes(word.slice(0, 5)));
}

/**
 * The domain display names `text` mentions. VAL-DESIGN-008 fails a home
 * prose section that names four or more, since only the contents index may
 * list the taxonomy.
 */
export function domainNamesIn(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.values(DOMAIN_META)
    .map(({ name }) => name)
    .filter((name) => lower.includes(name.toLowerCase()));
}

export const FEATURED_MAX_DOMAIN_NAMES = 3;

/** Every published article whose lead can be featured, in registry order. */
export function featuredCandidates(
  read: (domain: string, slug: string) => string = moduleSource,
): FeaturedArticle[] {
  const candidates: FeaturedArticle[] = [];
  for (const { domain, slug, title } of publishedModules()) {
    const excerpt = leadExcerpt(read(domain, slug), FEATURED_LEAD_MAX_WORDS);
    if (!excerpt || SITE_REFERENCE.test(excerpt)) continue;
    if (!namesTopic(title, excerpt)) continue;
    if (homeCopyProblems(excerpt).length > 0) continue;
    if (domainNamesIn(`${title} ${excerpt}`).length > FEATURED_MAX_DOMAIN_NAMES) continue;
    candidates.push({ domain, slug, title, href: `/${domain}/${slug}/`, excerpt });
  }
  return candidates;
}

/** Days since the Unix epoch for the calendar date `date` falls on in UTC. */
export function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/** The article featured on `date`; consecutive days step through the pool. */
export function featuredArticleFor(
  date: Date,
  candidates: readonly FeaturedArticle[] = featuredCandidates(),
): FeaturedArticle {
  if (candidates.length === 0) {
    throw new Error('no published article has a lead that can be featured');
  }
  return candidates[utcDayNumber(date) % candidates.length];
}

/** The article featured on `date` among those whose title and lead fit in `maxWords`. */
export function featuredArticleWithin(
  date: Date,
  maxWords: number,
  candidates: readonly FeaturedArticle[] = featuredCandidates(),
): FeaturedArticle {
  const fitting = candidates.filter(
    ({ title, excerpt }) => wordCount(title) + wordCount(excerpt) <= maxWords,
  );
  if (fitting.length === 0) {
    throw new Error(`no featured title and lead fit in the ${maxWords} words home has left`);
  }
  return featuredArticleFor(date, fitting);
}
