import { HOME_FEATURED_PICKS, type HomeCrop, type HomeFeaturedPick } from '../data/home-featured.ts';
import { creditNoun, getImage, licenceLabel } from '../data/images.ts';
import { DOMAIN_META, getModule } from '../data/modules.ts';
import { wordCount } from './article-lead.ts';
import { homeCopyProblems } from './home-copy.ts';
import { moduleSource } from './module-source.ts';

/**
 * The home page's "Start here" entries: the editor's picks in
 * data/home-featured.ts, in their order, each with the dek and the picture
 * chosen for home. They change only when an editor edits that list, never
 * with the date.
 */
export const FEATURED_DEK_MAX_WORDS = 14;

/** How many entries "Start here" shows, side by side. */
export const START_HERE_COUNT = 4;

/** The crop shape every entry shares. */
export const ENTRY_CROP_RATIO = 3 / 2;

export type FeaturedPicture = {
  id: string;
  src: string;
  /** The source image's own size, in pixels. */
  width: number;
  height: number;
  crop: HomeCrop;
  alt: string;
  /** The visible credit: what it is, who made it, and its licence. */
  credit: { kind: string; creator: string; licence: string; licenceUrl: string; sourceUrl?: string };
};

export type FeaturedArticle = {
  domain: string;
  slug: string;
  title: string;
  href: string;
  dek: string;
  picture: FeaturedPicture;
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

/** Whether the article's own source mounts the registered image `imageId`. */
export function articleShowsImage(
  domain: string,
  slug: string,
  imageId: string,
  read: (domain: string, slug: string) => string = moduleSource,
): boolean {
  const escaped = imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<Image\\s+id="${escaped}"`).test(read(domain, slug));
}

/**
 * Every reason `pick` could not be shown on home; empty when it can. A dek
 * prints no digit, because a number on home needs a citation and the dek
 * carries none. `ratio` is the crop shape its place on home needs.
 */
export function featuredPickProblems(
  pick: HomeFeaturedPick,
  ratio: number = ENTRY_CROP_RATIO,
  read: (domain: string, slug: string) => string = moduleSource,
): string[] {
  const problems: string[] = [];
  const entry = getModule(pick.domain, pick.slug);
  const published = entry?.status === 'published';
  if (!published) {
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
  const image = getImage(pick.imageId);
  if (!image) {
    problems.push(`${pick.imageId} is not a registered image`);
  } else {
    if (published && !articleShowsImage(pick.domain, pick.slug, pick.imageId, read)) {
      problems.push(`${pick.imageId} is not one of ${pick.domain}/${pick.slug}'s own images`);
    }
    const { x, y, width, height } = pick.crop;
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > image.width || y + height > image.height) {
      problems.push(`the crop falls outside ${pick.imageId}'s ${image.width} by ${image.height} pixels`);
    }
    if (Math.abs(width / height - ratio) > 0.01) {
      problems.push(`the crop is ${(width / height).toFixed(2)}:1, not the ${ratio.toFixed(2)}:1 its place needs`);
    }
  }
  if (wordCount(pick.alt) < 6) problems.push('the picture has no real alternative text');
  return problems;
}

/** One pick as home prints it, or an error naming why it cannot be shown. */
export function featuredArticleFrom(
  pick: HomeFeaturedPick,
  ratio: number = ENTRY_CROP_RATIO,
): FeaturedArticle {
  const problems = featuredPickProblems(pick, ratio);
  if (problems.length > 0) {
    throw new Error(`the featured pick ${pick.domain}/${pick.slug} cannot be featured: ${problems.join('; ')}`);
  }
  const { title } = getModule(pick.domain, pick.slug)!;
  const image = getImage(pick.imageId)!;
  return {
    domain: pick.domain,
    slug: pick.slug,
    title,
    href: `/${pick.domain}/${pick.slug}/`,
    dek: pick.dek,
    picture: {
      id: image.id,
      src: image.file,
      width: image.width,
      height: image.height,
      crop: pick.crop,
      alt: pick.alt,
      credit: {
        kind: creditNoun(image),
        creator: image.creator,
        licence: licenceLabel(image),
        licenceUrl: image.licenceUrl,
        sourceUrl: image.sourceUrl,
      },
    },
  };
}

/** The "Start here" entries: the first four picks, in order. */
export function startHere(
  picks: readonly HomeFeaturedPick[] = HOME_FEATURED_PICKS,
): FeaturedArticle[] {
  if (picks.length < START_HERE_COUNT) {
    throw new Error(`home needs ${START_HERE_COUNT} picks to start from and has ${picks.length}`);
  }
  return picks
    .slice(0, START_HERE_COUNT)
    .map((pick) => featuredArticleFrom(pick));
}

/** The first entry: the hottest pick. */
export function featuredArticle(
  picks: readonly HomeFeaturedPick[] = HOME_FEATURED_PICKS,
): FeaturedArticle {
  if (picks.length === 0) throw new Error('home has no featured pick');
  return featuredArticleFrom(picks[0]);
}
