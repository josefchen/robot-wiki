import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_CARD_PATH,
  SITE_NAME,
  articleCardPath,
  articleOgImages,
  articleOpenGraph,
  articleTwitter,
  clampTitle,
  ogImageAltForTitle,
  routeOpenGraph,
  routeTwitter,
  sanitizeCardText,
  siteOgImage,
  siteOgImageAlt,
} from '@/lib/og-cards';

/**
 * OG card helpers (VAL-DIST-002/003/005): the vocabulary the emitted
 * PNGs, the metadata tags and the generator all share. Pure logic only;
 * the PNG emission itself is covered by the e2e spec against the built
 * export.
 */

describe('og card vocabulary', () => {
  it('emits a card path per published article, each carrying its slug', () => {
    const published = publishedModules();
    // The registry is the single source of truth for the published count,
    // so no literal total is pinned here (it drifted 42 -> 43 -> 47 across
    // publishes); the distinct-path checks below are the real guard.
    expect(published.length).toBeGreaterThan(0);
    const paths = published.map((m) => articleCardPath(m.domain, m.slug));
    // One distinct URL path per published article (VAL-DIST-003).
    expect(new Set(paths).size).toBe(published.length);
    for (const m of published) {
      const path = articleCardPath(m.domain, m.slug);
      // The route identifier rides in the URL path.
      expect(path).toContain(m.slug);
      expect(path).toBe(`/og/${m.domain}/${m.slug}.png`);
    }
  });

  it('keeps the site-level card path distinct from every article path', () => {
    for (const m of publishedModules()) {
      expect(SITE_CARD_PATH).not.toBe(articleCardPath(m.domain, m.slug));
    }
  });

  it('clamps long titles at a word boundary without injecting dashes', () => {
    const clamped = clampTitle(
      'JEPA and the Non-Generative Counterargument With a Very Long Tail Indeed',
    );
    expect(clamped.length).toBeLessThanOrEqual(64);
    expect(clamped.endsWith(' ')).toBe(false);
    // The clamp must never produce an em-dash or en-dash.
    expect(clamped).not.toMatch(/[\u2010-\u2015]/);
    // A short title passes through untouched.
    expect(clampTitle('Control')).toBe('Control');
  });

  it('sanitizes non-Latin glyphs the card font cannot render', () => {
    expect(sanitizeCardText('The \u03c00 Line')).toBe('The Pi0 Line');
    expect(sanitizeCardText('a\u2014b')).toBe('a-b');
    expect(sanitizeCardText('t\u00e9st')).toBe('t\u00e9st');
  });

  it('produces alt text of at least 15 characters that is not the bare title', () => {
    const alt = ogImageAltForTitle('Diffusion Policy');
    expect(alt.length).toBeGreaterThanOrEqual(15);
    expect(alt).not.toBe('Diffusion Policy');
    expect(alt).not.toMatch(/[\u2010-\u2015]/);
    const siteAlt = siteOgImageAlt();
    expect(siteAlt.length).toBeGreaterThanOrEqual(15);
    expect(siteAlt).not.toMatch(/[\u2010-\u2015]/);
  });

  it('uses the large-card canvas dimensions', () => {
    const ratio = OG_CARD_WIDTH / OG_CARD_HEIGHT;
    expect(OG_CARD_WIDTH).toBeGreaterThanOrEqual(1200);
    expect(OG_CARD_HEIGHT).toBeGreaterThanOrEqual(630);
    expect(Math.abs(ratio - 1.91)).toBeLessThanOrEqual(0.05);
  });

  // VAL-DIST-004: the route blocks pin the PLAIN title. The framework's
  // own fallback fills og:title from the templated document title, which
  // leaves the ' - Robot Wiki' suffix on the card and breaks the h1
  // match; the helpers must declare the title explicitly so that can
  // never happen.
  it('routeOpenGraph declares the plain title, a website card block, and the site card', () => {
    const og = routeOpenGraph('Market Map');
    expect(og.title).toBe('Market Map');
    expect(og.title).not.toContain(SITE_NAME);
    expect(og.type).toBe('website');
    expect(og.url).toBe('./');
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.images).toEqual(siteOgImage());
    expect(og.images[0].url.endsWith(SITE_CARD_PATH)).toBe(true);
  });

  it('routeTwitter pins the plain title, summary_large_image, and the same images as og', () => {
    const tw = routeTwitter('Market Map');
    expect(tw.card).toBe('summary_large_image');
    expect(tw.title).toBe('Market Map');
    expect(tw.title).toBe(routeOpenGraph('Market Map').title);
    expect(tw.images).toEqual(siteOgImage());
  });

  it('articleOpenGraph declares the plain article title and the article card', () => {
    const og = articleOpenGraph('manipulation', 'action-chunking', 'Action Chunking (ACT and ALOHA)');
    expect(og.type).toBe('article');
    expect(og.title).toBe('Action Chunking (ACT and ALOHA)');
    expect(og.title).not.toContain(`- ${SITE_NAME}`);
    expect(og.url).toBe('./');
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.images).toEqual(
      articleOgImages('manipulation', 'action-chunking', 'Action Chunking (ACT and ALOHA)'),
    );
  });

  it('articleTwitter equals its og counterpart on title and images for every published module', () => {
    for (const m of publishedModules()) {
      const og = articleOpenGraph(m.domain, m.slug, m.title);
      const tw = articleTwitter(m.domain, m.slug, m.title);
      expect(tw.card).toBe('summary_large_image');
      expect(tw.title, `${m.slug} twitter:title equals og:title`).toBe(og.title);
      expect(tw.images, `${m.slug} twitter images equal og images`).toEqual(og.images);
    }
  });
});
