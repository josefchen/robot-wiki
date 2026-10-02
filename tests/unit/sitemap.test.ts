import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { modules, publishedModules } from '@/data/modules';
import {
  ROUTE_SOURCES,
  articleDateModified,
  routeDateModified,
} from '@/lib/content-dates';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import { SITE_URL } from '@/lib/site';

describe('sitemap', () => {
  it('includes the home page and every published module', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/`);
    for (const m of publishedModules()) {
      expect(urls).toContain(`${SITE_URL}/${m.domain}/${m.slug}/`);
    }
  });

  it('excludes every draft module', () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const m of modules.filter((m) => m.status === 'draft')) {
      expect(urls).not.toContain(`${SITE_URL}/${m.domain}/${m.slug}/`);
    }
  });

  it('includes the editorial policy and excludes noindex utilities', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/editorial-policy/`);
    expect(urls).not.toContain(`${SITE_URL}/search/`);
    expect(urls).not.toContain(`${SITE_URL}/privacy/`);
  });

  it('supplies all three article image aspect ratios as absolute URLs', () => {
    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));
    for (const m of publishedModules()) {
      const url = `${SITE_URL}/${m.domain}/${m.slug}/`;
      expect(entries.get(url)?.images).toEqual(
        articleStructuredImagePaths(m.domain, m.slug).map(
          (path) => `${SITE_URL}${path}`,
        ),
      );
    }
  });

  it('uses the git dateModified as article lastmod', () => {
    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));
    for (const m of publishedModules()) {
      const url = `${SITE_URL}/${m.domain}/${m.slug}/`;
      expect(entries.get(url)?.lastModified).toBe(
        articleDateModified(m.domain, m.slug),
      );
    }
  });

  it('dates every other route by its sources and gives every url a lastmod', () => {
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.lastModified, entry.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const routes = entries
      .map((entry) => entry.url.slice(SITE_URL.length))
      .filter((path) => path.split('/').filter(Boolean).length < 2 || path === '/');
    expect(new Set(routes)).toEqual(
      new Set([...Object.keys(ROUTE_SOURCES)]),
    );
    for (const path of routes) {
      expect(
        entries.find((entry) => entry.url === `${SITE_URL}${path}`)?.lastModified,
      ).toBe(routeDateModified(path));
    }
  });

  it('does not emit changefreq or priority fields that Google ignores', () => {
    for (const entry of sitemap()) {
      expect(entry).not.toHaveProperty('changeFrequency');
      expect(entry).not.toHaveProperty('priority');
    }
  });

  it('uses absolute https urls', () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith('https://')).toBe(true);
    }
  });
});

describe('robots', () => {
  it('allows crawling and points at the sitemap', () => {
    const result = robots();
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules.length).toBeGreaterThan(0);
  });
});
