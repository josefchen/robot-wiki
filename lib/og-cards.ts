/**
 * Open Graph social-card helpers (VAL-DIST-002/003/005).
 *
 * The site is output: 'export', so there is no request-time image
 * generation: every card is a real PNG emitted into out/og/ at build
 * time by scripts/generate-og-cards.ts (postbuild). This module owns the
 * shared vocabulary both sides agree on, so the metadata tags a crawler
 * sees and the files on disk can never drift apart:
 *
 *   - articleCardPath(domain, slug): '/og/<domain>/<slug>.png'. The slug
 *     rides in the URL path so a validator can attribute a card to its
 *     article from the URL alone (VAL-DIST-003).
 *   - siteCardPath: '/og/robot-wiki.png', the one card the non-article
 *     destinations share. Byte-distinct from every article asset by
 *     construction (different canvas).
 *   - ogImageAltForModule / siteOgImageAlt: the og:image:alt strings.
 *     Card text carries no em-dash or en-dash (mission zero-dash rule).
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

/** Card canvas: at least 1200x630, aspect within 0.05 of 1.91:1. */
export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

/**
 * The apex origin, restated locally so card URL helpers do not create an
 * import cycle with lib/site.ts (which owns the canonical constant).
 * Kept in lockstep with SITE_URL there; a unit test pins the equality
 * against the module that can import both.
 */
export const SITE_URL_ORIGIN = 'https://robot-wiki.com';

/** The site name every card block restates (og:site_name). */
export const SITE_NAME = 'robot-wiki';

/** Where card PNGs live under public/ and out/. */
export const OG_CARD_DIR = '/og';

/** The site-level card the non-article destinations share. */
export const SITE_CARD_PATH = `${OG_CARD_DIR}/robot-wiki.png`;

/** Card path for one published article. Carries the article slug. */
export function articleCardPath(domain: string, slug: string): string {
  return `${OG_CARD_DIR}/${domain}/${slug}.png`;
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
  return `Open graph card for the robot-wiki article ${sanitizeCardText(title)}`;
}

/** og:image:alt for the site-level card. */
export function siteOgImageAlt(): string {
  return 'Open graph card for robot-wiki, an interactive encyclopedia of modern robotics';
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

/**
 * Route-level openGraph block for an article: the full object, because it
 * replaces the layout's (no deep merge). The PLAIN article title is
 * declared explicitly (VAL-DIST-004): left unset, the framework fills
 * og:title from the templated document title, which leaves the
 * ' - robot-wiki' suffix on the card, and the card title must equal the
 * page's rendered h1. og:description is left to fall back to the route's
 * metadata description (the module summary), the same value on both
 * sides, so the og and twitter pair can never drift.
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
    title,
    url: './',
    siteName: SITE_NAME,
    images: articleOgImages(domain, slug, title),
  };
}

/**
 * Route-level openGraph block for a non-article destination (the domain
 * landings and the standalone routes), which share the site-level card.
 * Same replacement trap and same plain-title rule as
 * articleOpenGraph above.
 */
export function routeOpenGraph(title: string): {
  type: 'website';
  title: string;
  url: './';
  siteName: string;
  images: OgImageSet;
} {
  return {
    type: 'website',
    title,
    url: './',
    siteName: SITE_NAME,
    images: siteOgImage(),
  };
}

/**
 * The twitter block a route re-declares alongside its openGraph. The
 * plain title is pinned to the same string the route declares as
 * og:title (VAL-DIST-004: a declared twitter:title must equal its og
 * counterpart exactly), so the pair cannot drift whatever the
 * framework's own fallbacks would fill in.
 */
export function routeTwitter(
  title: string,
  images: OgImageSet = siteOgImage(),
): {
  card: 'summary_large_image';
  title: string;
  images: OgImageSet;
} {
  return { card: 'summary_large_image', title, images };
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
  return routeTwitter(title, articleOgImages(domain, slug, title));
}
