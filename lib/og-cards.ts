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

export function articleTwitter(
  domain: string,
  slug: string,
  title: string,
): {
  card: 'summary_large_image';
  images: Array<{ url: string; width: number; height: number; alt: string }>;
} {
  return { card: 'summary_large_image', images: articleOgImages(domain, slug, title) };
}
