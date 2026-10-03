import { describe, expect, it } from 'vitest';
import { DOMAIN_META, DOMAINS, publishedModules } from '@/data/modules';
import { AUTHOR_NAME, AUTHOR_PROFILE_URL, PUBLIC_DESCRIPTOR } from '@/lib/identity';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import {
  ACQUISITION_CLUSTERS,
  articleJsonLd,
  articleSeoProfile,
  articleSeoTitle,
  domainCollectionJsonLd,
  domainSeoTitle,
  HOME_META_DESCRIPTION,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  SEARCH_URL_TEMPLATE,
  SEO_TITLE_SUFFIX,
  serializeJsonLd,
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
  websiteJsonLd,
} from '@/lib/seo';
import { ROUTE_SEO_PROFILES, routeSeoProfile } from '@/lib/seo-profiles';
import { SITE_URL } from '@/lib/site';

const BRAND_FIRST = /^robot wiki\b/i;

describe('search titles', () => {
  it('keeps every published article title within 60 characters with its suffix', () => {
    const titles = publishedModules().map(articleSeoTitle);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title.length).toBeGreaterThanOrEqual(20);
      expect(`${title}${SEO_TITLE_SUFFIX}`.length, title).toBeLessThanOrEqual(60);
      expect(title, title).not.toMatch(BRAND_FIRST);
    }
  });

  it('leads every title with its search term', () => {
    // VAL-OPUS-023 accepts the H1 topic or the first intent query; the head
    // term is the description's anchor and usually the same phrase.
    const h1s = new Map<string, string>([
      ...publishedModules().map((m) => [`/${m.domain}/${m.slug}/`, m.title] as [string, string]),
      ...DOMAINS.map((domain) => [`/${domain}/`, DOMAIN_META[domain].name] as [string, string]),
    ]);
    for (const [route, profile] of Object.entries(ROUTE_SEO_PROFILES)) {
      if (route === '/' || route === '/search/') continue;
      const leads = [profile.headTerm, profile.queries[0], h1s.get(route)].filter(
        (lead): lead is string => Boolean(lead),
      );
      expect(
        leads.some((lead) => profile.title.toLowerCase().startsWith(lead.toLowerCase())),
        `${route}: "${profile.title}" starts with one of ${leads.map((lead) => `"${lead}"`).join(', ')}`,
      ).toBe(true);
    }
  });

  it('gives every domain a unique robotics-specific title and snippet', () => {
    const titles = DOMAINS.map(domainSeoTitle);
    expect(new Set(titles).size).toBe(DOMAINS.length);
    // The owner's rl-sim2real title names no robot; its description does.
    for (const domain of DOMAINS) {
      const { title, description } = routeSeoProfile(`/${domain}/`);
      expect(`${title} ${description}`, domain).toMatch(/robot/i);
    }
    for (const title of titles) {
      expect(`${title}${SEO_TITLE_SUFFIX}`.length, title).toBeLessThanOrEqual(60);
    }
  });

  it('keeps home search copy inside useful snippet lengths', () => {
    expect(HOME_SEO_TITLE.length).toBeLessThanOrEqual(60);
    expect(HOME_SEO_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(HOME_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(HOME_META_DESCRIPTION.startsWith(PUBLIC_DESCRIPTOR)).toBe(true);
  });

  it('gives every standalone page a concise unique title', () => {
    const titles = Object.values(STANDALONE_SEO_TITLES);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title.length).toBeGreaterThanOrEqual(20);
      expect(`${title}${SEO_TITLE_SUFFIX}`.length, title).toBeLessThanOrEqual(60);
      expect(title, title).not.toMatch(BRAND_FIRST);
    }
  });

  it('assigns every article one typed acquisition cluster and search intent', () => {
    for (const entry of publishedModules()) {
      const profile = articleSeoProfile(entry);
      const route = routeSeoProfile(`/${entry.domain}/${entry.slug}/`);
      expect(ACQUISITION_CLUSTERS).toContain(profile.acquisitionCluster);
      expect(profile.primaryIntent).toBe(route.queries[0] ?? route.headTerm);
      expect(profile.description).toBe(route.description);
      expect(profile.keywords[0]).toBe(route.headTerm);
      expect(profile.indexable).toBe(true);
    }
    expect(
      articleSeoProfile(
        publishedModules().find((entry) => entry.domain === 'classical')!,
      ).acquisitionCluster,
    ).toBe('classical-robotics');
  });
});

describe('meta descriptions', () => {
  const all = Object.entries(ROUTE_SEO_PROFILES);

  it('profiles every published article, hub and fixed route', () => {
    const expected = [
      '/',
      ...DOMAINS.map((domain) => `/${domain}/`),
      ...publishedModules().map((m) => `/${m.domain}/${m.slug}/`),
    ];
    for (const route of expected) expect(ROUTE_SEO_PROFILES, route).toHaveProperty([route]);
    expect(Object.keys(STANDALONE_SEO_DESCRIPTIONS)).toHaveLength(10);
  });

  it('runs 70 to 155 characters, states the head term and never teases', () => {
    for (const [route, profile] of all) {
      const { description } = profile;
      expect(description.length, route).toBeGreaterThanOrEqual(70);
      expect(description.length, route).toBeLessThanOrEqual(155);
      expect(description.toLowerCase(), route).toContain(profile.headTerm.toLowerCase());
      expect(description, route).not.toMatch(/(\?|\.\.\.|\u2026)\s*$/);
      expect(description, route).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('is unique per route', () => {
    const descriptions = all.map(([, profile]) => profile.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe('JSON-LD', () => {
  it('escapes a closing script sequence', () => {
    const serialized = serializeJsonLd({ value: '</script><script>' });
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual({ value: '</script><script>' });
  });

  it('describes the site, its creator and its search action', () => {
    expect(JSON.parse(websiteJsonLd())).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Robot Wiki',
      creator: {
        '@type': 'Person',
        name: AUTHOR_NAME,
        url: AUTHOR_PROFILE_URL,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://robot-wiki.com/search/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });
    expect(SEARCH_URL_TEMPLATE).toBe('https://robot-wiki.com/search/?q={search_term_string}');
  });

  it('describes a published article with its topic, keywords and cited sources', () => {
    const entry = publishedModules().find(
      (module) => module.domain === 'manipulation' && module.slug === 'vla-models',
    );
    expect(entry).toBeDefined();
    const profile = articleSeoProfile(entry!);
    const parsed = JSON.parse(
      articleJsonLd({
        entry: entry!,
        datePublished: '2026-08-20',
        dateModified: '2026-08-22',
        readingTimeMinutes: 12,
        wordCount: 2_640,
        citations: [
          { title: 'A paper', url: 'https://example.com/paper', type: 'paper' },
          { title: 'A paper', url: 'https://example.com/paper', type: 'paper' },
          { title: 'Docs', url: 'https://example.com/docs', type: 'docs' },
        ],
      }),
    );
    expect(parsed).toMatchObject({
      '@type': 'Article',
      headline: entry!.title,
      description: profile.description,
      about: { '@type': 'Thing', name: profile.headTerm },
      url: `${SITE_URL}/manipulation/vla-models/`,
      datePublished: '2026-08-20',
      dateModified: '2026-08-22',
      wordCount: 2_640,
      timeRequired: 'PT12M',
      author: { name: AUTHOR_NAME, url: AUTHOR_PROFILE_URL },
      citation: [
        { '@type': 'ScholarlyArticle', name: 'A paper', url: 'https://example.com/paper' },
        { '@type': 'CreativeWork', name: 'Docs', url: 'https://example.com/docs' },
      ],
    });
    expect(parsed.keywords).toContain(profile.headTerm);
    expect(parsed.image).toEqual(
      articleStructuredImagePaths('manipulation', 'vla-models').map(
        (path) => `${SITE_URL}${path}`,
      ),
    );
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
