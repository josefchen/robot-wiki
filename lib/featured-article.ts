import { HOME_FEATURED_PICKS, type HomeFeaturedPick } from '../data/home-featured.ts';
import { DOMAIN_META, getModule, publishedModules } from '../data/modules.ts';
import { wordCount } from './article-lead.ts';
import { homeCopyProblems } from './home-copy.ts';

/**
 * The home page's featured article: the first of the editor's picks in
 * data/home-featured.ts, with the dek written for home. It changes only
 * when an editor edits that list, never with the date.
 */
export const FEATURED_DEK_MAX_WORDS = 25;

/**
 * The words the featured article and "Recently updated" share on home: the
 * featured title and dek, and each update's date and title. The update
 * titles change with each content commit, so every pick has to fit this
 * share beside the five longest titles any update could print; the rest of
 * <main> fits in what this leaves of the 250-word VAL-OPUS-021 budget,
 * which tests/e2e/home-front-page.spec.ts measures.
 */
export const HOME_ROTATING_WORDS = 56;

/** The words a "Recently updated" list prints: an ISO date and a title per row. */
export function recentListWords(entries: readonly { title: string }[]): number {
  return entries.reduce((sum, { title }) => sum + 1 + wordCount(title), 0);
}

/**
 * The most words a five-row "Recently updated" list can print: the five
 * longest published titles, each with its date.
 */
export function longestRecentListWords(
  entries: readonly { title: string }[] = publishedModules(),
): number {
  return recentListWords(
    [...entries].sort((left, right) => wordCount(right.title) - wordCount(left.title)).slice(0, 5),
  );
}

export type FeaturedArticle = {
  domain: string;
  slug: string;
  title: string;
  href: string;
  dek: string;
};

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

/**
 * Every reason `pick` could not be featured on home; empty when it can. A
 * dek prints no digit, because a number on home needs a citation and the
 * dek carries none.
 */
export function featuredPickProblems(pick: HomeFeaturedPick): string[] {
  const problems: string[] = [];
  const entry = getModule(pick.domain, pick.slug);
  if (!entry || entry.status !== 'published') {
    problems.push(`${pick.domain}/${pick.slug} is not a published article`);
  }
  const words = wordCount(pick.dek);
  if (words === 0) problems.push('the dek is empty');
  if (words > FEATURED_DEK_MAX_WORDS) {
    problems.push(`the dek runs to ${words} words, over ${FEATURED_DEK_MAX_WORDS}`);
  }
  if (/\d/.test(pick.dek)) problems.push('the dek prints a number with no citation');
  for (const problem of homeCopyProblems(pick.dek)) problems.push(`the dek carries ${problem}`);
  const named = domainNamesIn(`${entry?.title ?? ''} ${pick.dek}`);
  if (named.length > FEATURED_MAX_DOMAIN_NAMES) {
    problems.push(`the title and dek name ${named.length} domains, which only the contents index may list`);
  }
  return problems;
}

/** One pick as home prints it, or an error naming why it cannot be featured. */
export function featuredArticleFrom(pick: HomeFeaturedPick): FeaturedArticle {
  const problems = featuredPickProblems(pick);
  if (problems.length > 0) {
    throw new Error(`the featured pick ${pick.domain}/${pick.slug} cannot be featured: ${problems.join('; ')}`);
  }
  const { title } = getModule(pick.domain, pick.slug)!;
  return {
    domain: pick.domain,
    slug: pick.slug,
    title,
    href: `/${pick.domain}/${pick.slug}/`,
    dek: pick.dek,
  };
}

/** The featured article: the first pick, and only the first. */
export function featuredArticle(
  picks: readonly HomeFeaturedPick[] = HOME_FEATURED_PICKS,
): FeaturedArticle {
  if (picks.length === 0) throw new Error('home has no featured pick');
  return featuredArticleFrom(picks[0]);
}

/**
 * The featured article, refused when its title and dek do not fit in
 * `maxWords`, so a list of updates that leaves too little room fails the
 * build rather than the word budget.
 */
export function featuredArticleWithin(
  maxWords: number,
  picks: readonly HomeFeaturedPick[] = HOME_FEATURED_PICKS,
): FeaturedArticle {
  const featured = featuredArticle(picks);
  const words = wordCount(featured.title) + wordCount(featured.dek);
  if (words > maxWords) {
    throw new Error(
      `the featured title and dek run to ${words} words, over the ${maxWords} home has left`,
    );
  }
  return featured;
}
