/**
 * Open Graph social-card helpers.
 *
 * The site is output: 'export', so there is no request-time image
 * generation: every card is a real PNG emitted into out/og/ at build
 * time by scripts/generate-og-cards.ts (postbuild). This module owns the
 * shared vocabulary both sides agree on, so the metadata tags a crawler
 * sees and the files on disk can never drift apart:
 *
 *   - articleCardPath(domain, slug): '/og/<domain>/<slug>.png'. The slug
 *     rides in the URL path so a checker can attribute a card to its
 *     article from the URL alone.
 *   - siteCardPath: '/og/robot-wiki.png', the one card the non-article
 *     destinations share. Byte-distinct from every article asset by
 *     construction (different canvas).
 *   - ogImageAltForModule / siteOgImageAlt: the og:image:alt strings.
 *     Card text carries no em-dash or en-dash (the site-wide zero-dash rule).
 *   - articleOgImage / siteOgImage: absolute apex-origin URLs plus the
 *     declared 1200x630 dimensions, for Metadata openGraph.images.
 *   - largeCardTwitter: the twitter block every route re-declares. A
 *     route-level openGraph object replaces the layout's (no deep
 *     merge), so images travel with whichever object wins.
 *
 * The route set is always derived from the module registry
 * (publishedModules()), never a hardcoded list: publishing a module adds
 * its card automatically because the generator and the metadata both
 * walk the registry.
 */

import { DOMAIN_META } from '../data/modules.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';
import { ROUTE_SEO_PROFILES, routeSeoProfile } from './seo-profiles.ts';

/** Card canvas: at least 1200x630, aspect within 0.05 of 1.91:1. */
export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

export const ARTICLE_IMAGE_VARIANTS = [
  { id: 'landscape', suffix: '', width: 1200, height: 630 },
  { id: 'four-three', suffix: '-4x3', width: 1200, height: 900 },
  { id: 'square', suffix: '-square', width: 1200, height: 1200 },
] as const;

export type ArticleImageVariant =
  (typeof ARTICLE_IMAGE_VARIANTS)[number]['id'];

/**
 * The apex origin, restated locally so card URL helpers do not create an
 * import cycle with lib/site.ts (which owns the canonical constant).
 * Kept in lockstep with SITE_URL there; a unit test pins the equality
 * against the module that can import both.
 */
export const SITE_URL_ORIGIN = 'https://robot-wiki.com';

/**
 * The site name every card block restates (og:site_name). This is the
 * public display identity, not the repository slug: the card PATH below
 * keeps `robot-wiki` because it is a stable generated filename.
 */
export const SITE_NAME = PUBLIC_IDENTITY;

/** Where card PNGs live under public/ and out/. */
export const OG_CARD_DIR = '/og';

/** Search-only 4:3 and square article artwork, distinct from OG/X corpus. */
export const STRUCTURED_IMAGE_DIR = '/structured-images';

/** The site-level card the non-article destinations share. */
export const SITE_CARD_PATH = `${OG_CARD_DIR}/robot-wiki.png`;

/** Card path for one published article. Carries the article slug. */
export function articleCardPath(
  domain: string,
  slug: string,
  variant: ArticleImageVariant = 'landscape',
): string {
  const definition = ARTICLE_IMAGE_VARIANTS.find((item) => item.id === variant);
  if (!definition) throw new Error(`unknown article image variant: ${variant}`);
  const directory = variant === 'landscape' ? OG_CARD_DIR : STRUCTURED_IMAGE_DIR;
  return `${directory}/${domain}/${slug}${definition.suffix}.png`;
}

/** Search-facing image set; social metadata continues to use landscape. */
export function articleStructuredImagePaths(
  domain: string,
  slug: string,
): string[] {
  return ARTICLE_IMAGE_VARIANTS.map((variant) =>
    articleCardPath(domain, slug, variant.id),
  );
}

/** Card text never carries an em-dash or en-dash (zero-dash rule). */
export function stripCardDashes(text: string): string {
  return text.replace(/[\u2010-\u2015]/g, '-');
}

/**
 * Card text stays inside the font's Latin coverage: Greek letters that
 * appear in article vocabulary (the pi line) are transliterated, and
 * anything else outside Latin-1 becomes an ASCII stand-in so a missing
 * glyph can never render as tofu on a shipped card.
 */
export function sanitizeCardText(text: string): string {
  return stripCardDashes(text)
    .replace(/\u03c0/g, 'Pi')
    .replace(/[^\u0000-\u00ff]/g, (ch) => (ch === '\u2019' ? "'" : '?'));
}

/**
 * Title clamp for the card canvas: cuts at a word boundary, never
 * mid-glyph, and never injects a dash where the source had none (the
 * clamp simply drops the overflowing word; the source title's own
 * hyphens are the only hyphens that survive).
 */
export function clampTitle(title: string, maxChars = 64): string {
  const cleaned = sanitizeCardText(title);
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(' ');
  // A single word longer than the clamp is hard-cut; titles never hit this.
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cleaned.slice(0, maxChars)).trimEnd();
}

/** og:image:alt for an article card: names the article, never just the title. */
export function ogImageAltForTitle(title: string): string {
  return `Open graph card for the ${PUBLIC_IDENTITY} article ${sanitizeCardText(title)}`;
}

/** og:image:alt for the site-level card. */
export function siteOgImageAlt(): string {
  return `Open graph card for ${PUBLIC_IDENTITY}. ${PUBLIC_DESCRIPTOR}`;
}

/**
 * Site-level og/twitter image block for the shared card. Images are
 * absolute apex-origin URLs (a social scraper resolves neither root- nor
 * protocol-relative values), with declared dimensions matching the
 * decoded ones exactly.
 */
export function siteOgImage(): Array<{
  url: string;
  width: number;
  height: number;
  alt: string;
}> {
  return [
    {
      url: `${SITE_URL_ORIGIN}${SITE_CARD_PATH}`,
      width: OG_CARD_WIDTH,
      height: OG_CARD_HEIGHT,
      alt: siteOgImageAlt(),
    },
  ];
}

/**
 * The twitter block every route re-declares. A route-level openGraph
 * object replaces the layout's (no deep merge), so images travel with
 * whichever object wins; declaring twitter at the layout alone would
 * leave it dangling wherever a route declares its own openGraph.
 */
export function largeCardTwitter(): {
  card: 'summary_large_image';
  images: Array<{ url: string; width: number; height: number; alt: string }>;
} {
  return { card: 'summary_large_image', images: siteOgImage() };
}

/**
 * Article og/twitter image blocks: one distinct card per published
 * article, its slug riding in the URL path.
 */
export function articleOgImages(
  domain: string,
  slug: string,
  title: string,
): Array<{ url: string; width: number; height: number; alt: string }> {
  return [
    {
      url: `${SITE_URL_ORIGIN}${articleCardPath(domain, slug)}`,
      width: OG_CARD_WIDTH,
      height: OG_CARD_HEIGHT,
      alt: ogImageAltForTitle(title),
    },
  ];
}

/** The image set every card block carries, absolute on the apex origin. */
export type OgImageSet = Array<{ url: string; width: number; height: number; alt: string }>;

/** The site-name suffix the root layout's title template appends. */
const DOCUMENT_TITLE_SUFFIX = ` | ${PUBLIC_IDENTITY}`;

/**
 * The page name each non-article route passes to routeOpenGraph (its h1,
 * or the site name for home and the layout default), mapped to the route
 * whose search profile holds its document title.
 */
const ROUTE_PATH_BY_PAGE_NAME: Readonly<Record<string, string>> = {
  [PUBLIC_IDENTITY]: '/',
  'A-Z Index': '/a-z/',
  About: '/about/',
  Credits: '/credits/',
  'Editorial policy': '/editorial-policy/',
  Glossary: '/glossary/',
  'How robots work': '/how-robots-work/',
  'Market Map': '/market-map/',
  '3D Kinematics Playground': '/playground/',
  Privacy: '/privacy/',
  Search: '/search/',
  ...Object.fromEntries(
    Object.entries(DOMAIN_META).map(([domain, meta]) => [meta.name, `/${domain}/`]),
  ),
};

function withoutSiteSuffix(title: string): string {
  return title.endsWith(DOCUMENT_TITLE_SUFFIX)
    ? title.slice(0, -DOCUMENT_TITLE_SUFFIX.length)
    : title;
}

/**
 * og:title and twitter:title for a route: its document title without the
 * ' | Robot Wiki' suffix, so a shared link names what the search result
 * promised. Declared explicitly because the framework would otherwise
 * fill og:title from the templated document title, suffix included.
 * A page name with no search profile (the 404 page) is used as written.
 */
export function routeSocialTitle(pageName: string): string {
  const path = ROUTE_PATH_BY_PAGE_NAME[pageName];
  const profile = path === undefined ? undefined : ROUTE_SEO_PROFILES[path];
  return profile ? withoutSiteSuffix(profile.title) : pageName;
}

/** og:title and twitter:title for an article: its search title, unsuffixed. */
export function articleSocialTitle(domain: string, slug: string): string {
  return withoutSiteSuffix(routeSeoProfile(`/${domain}/${slug}/`).title);
}

/**
 * Route-level openGraph block for an article: the full object, because it
 * replaces the layout's (no deep merge). og:title is the article's search
 * title (articleSocialTitle); the card image and its alt text keep the
 * editorial title the card renders. og:description is left to fall back
 * to the route's metadata description, the same value on both sides, so
 * the og and twitter pair can never drift.
 */
export function articleOpenGraph(
  domain: string,
  slug: string,
  title: string,
): {
  type: 'article';
  title: string;
  url: './';
  siteName: string;
  images: OgImageSet;
} {
  return {
    type: 'article',
    title: articleSocialTitle(domain, slug),
    url: './',
    siteName: SITE_NAME,
    images: articleOgImages(domain, slug, title),
  };
}

/**
 * Route-level openGraph block for a non-article destination (the domain
 * landings and the standalone routes), which share the site-level card.
 * Same replacement trap as articleOpenGraph above; the page name resolves
 * to the route's search title (routeSocialTitle).
 */
export function routeOpenGraph(pageName: string): {
  type: 'website';
  title: string;
  url: './';
  siteName: string;
  images: OgImageSet;
} {
  return {
    type: 'website',
    title: routeSocialTitle(pageName),
    url: './',
    siteName: SITE_NAME,
    images: siteOgImage(),
  };
}

/**
 * The twitter block a route re-declares alongside its openGraph. The
 * title resolves exactly as routeOpenGraph's does (a declared
 * twitter:title must equal its og counterpart exactly), so the pair
 * cannot drift whatever the framework's own fallbacks would fill in.
 */
export function routeTwitter(
  pageName: string,
  images: OgImageSet = siteOgImage(),
): {
  card: 'summary_large_image';
  title: string;
  images: OgImageSet;
} {
  return { card: 'summary_large_image', title: routeSocialTitle(pageName), images };
}

export function articleTwitter(
  domain: string,
  slug: string,
  title: string,
): {
  card: 'summary_large_image';
  title: string;
  images: OgImageSet;
} {
  return {
    card: 'summary_large_image',
    title: articleSocialTitle(domain, slug),
    images: articleOgImages(domain, slug, title),
  };
}
