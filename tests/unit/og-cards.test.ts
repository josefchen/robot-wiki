import { describe, expect, it } from 'vitest';
import { publishedModules } from '@/data/modules';
import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  SITE_CARD_PATH,
  articleCardPath,
  clampTitle,
  ogImageAltForTitle,
  sanitizeCardText,
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
    expect(published.length).toBe(42);
    const paths = published.map((m) => articleCardPath(m.domain, m.slug));
    // 42 distinct URL paths (VAL-DIST-003).
    expect(new Set(paths).size).toBe(42);
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
});
