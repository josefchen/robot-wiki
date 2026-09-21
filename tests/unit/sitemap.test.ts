import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { modules, publishedModules } from '@/data/modules';
import { moduleLastReviewed } from '@/lib/module-source';
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

  it('uses the content-reviewed date as article lastmod', () => {
    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));
    for (const m of publishedModules()) {
      const url = `${SITE_URL}/${m.domain}/${m.slug}/`;
      expect(entries.get(url)?.lastModified).toBe(
        moduleLastReviewed(m.domain, m.slug),
      );
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
