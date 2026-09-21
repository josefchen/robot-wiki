import { describe, expect, it } from 'vitest';
import { DOMAINS, publishedModules } from '@/data/modules';
import { AUTHOR_NAME, AUTHOR_PROFILE_URL } from '@/lib/identity';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import {
  ACQUISITION_CLUSTERS,
  articleJsonLd,
  articleSeoProfile,
  articleSeoTitle,
  domainCollectionJsonLd,
  domainSeoTitle,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  serializeJsonLd,
  STANDALONE_SEO_TITLES,
  websiteJsonLd,
} from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

describe('search titles', () => {
  it('keeps every published article title concise and unique', () => {
    const titles = publishedModules().map(articleSeoTitle);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title.length).toBeGreaterThanOrEqual(20);
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it('gives every domain a unique robotics-specific title', () => {
    const titles = DOMAINS.map(domainSeoTitle);
    expect(new Set(titles).size).toBe(DOMAINS.length);
    expect(titles.every((title) => /robot/i.test(title))).toBe(true);
  });

  it('keeps home search copy inside useful snippet lengths', () => {
    expect(HOME_SEO_TITLE.length).toBeLessThanOrEqual(60);
    expect(HOME_SEO_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(HOME_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it('gives every indexable standalone page a concise unique title', () => {
    const titles = Object.values(STANDALONE_SEO_TITLES);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title.length).toBeGreaterThanOrEqual(25);
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it('assigns every article one typed acquisition cluster and search intent', () => {
    for (const entry of publishedModules()) {
      const profile = articleSeoProfile(entry);
      expect(ACQUISITION_CLUSTERS).toContain(profile.acquisitionCluster);
      expect(profile.primaryIntent).toBe(profile.title);
      expect(profile.description).toBe(entry.summary);
      expect(profile.indexable).toBe(true);
    }
    expect(
      articleSeoProfile(
        publishedModules().find((entry) => entry.domain === 'classical')!,
      ).acquisitionCluster,
    ).toBe('classical-robotics');
  });
});

describe('JSON-LD', () => {
  it('escapes a closing script sequence', () => {
    const serialized = serializeJsonLd({ value: '</script><script>' });
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual({ value: '</script><script>' });
  });

  it('describes the site and its creator', () => {
    expect(JSON.parse(websiteJsonLd())).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'robot-wiki',
      creator: {
        '@type': 'Person',
        name: AUTHOR_NAME,
        url: AUTHOR_PROFILE_URL,
      },
    });
  });

  it('describes a published article with content-backed facts', () => {
    const entry = publishedModules().find(
      (module) => module.domain === 'manipulation' && module.slug === 'vla-models',
    );
    expect(entry).toBeDefined();
    const parsed = JSON.parse(
      articleJsonLd({
        entry: entry!,
        datePublished: '2026-08-20',
        lastReviewed: '2026-08-22',
        readingTimeMinutes: 12,
        wordCount: 2_640,
        citationUrls: ['https://example.com/paper', 'https://example.com/paper'],
      }),
    );
    expect(parsed).toMatchObject({
      '@type': 'Article',
      headline: entry!.title,
      description: entry!.summary,
      url: `${SITE_URL}/manipulation/vla-models/`,
      datePublished: '2026-08-20',
      dateModified: '2026-08-22',
      wordCount: 2_640,
      timeRequired: 'PT12M',
      author: { name: AUTHOR_NAME, url: AUTHOR_PROFILE_URL },
      citation: ['https://example.com/paper'],
    });
    expect(parsed.image).toEqual(
      articleStructuredImagePaths('manipulation', 'vla-models').map(
        (path) => `${SITE_URL}${path}`,
      ),
    );
  });

  it('omits an unverified publication date instead of inventing one', () => {
    const entry = publishedModules()[0];
    const parsed = JSON.parse(
      articleJsonLd({
        entry,
        lastReviewed: '2026-08-22',
        readingTimeMinutes: 5,
        wordCount: 900,
        citationUrls: [],
      }),
    );
    expect(parsed).not.toHaveProperty('datePublished');
  });

  it('lists every published article on a domain collection page', () => {
    const entries = publishedModules().filter(
      (module) => module.domain === 'world-models',
    );
    const parsed = JSON.parse(domainCollectionJsonLd('world-models', entries));
    expect(parsed).toMatchObject({
      '@type': 'CollectionPage',
      url: `${SITE_URL}/world-models/`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: entries.length,
      },
    });
    expect(parsed.mainEntity.itemListElement).toHaveLength(entries.length);
  });
});
