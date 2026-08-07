import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { modules, publishedModules } from '@/data/modules';
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
