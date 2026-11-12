import { describe, expect, it } from 'vitest';
import dates from '@/data/content-dates.json' with { type: 'json' };
import { publishedModules } from '@/data/modules';
import { articleDateModified, articleDatePublished, recentlyUpdated } from '@/lib/content-dates';
import { moduleDatePublished } from '@/lib/module-source';

const key = ({ domain, slug }: { domain: string; slug: string }) => `${domain}/${slug}`;

describe('article change dates', () => {
  it('records exactly the published articles', () => {
    expect(Object.keys(dates.articles).sort()).toEqual(
      publishedModules().map(key).sort(),
    );
  });

  it('returns the requested number of articles, newest first', () => {
    const recent = recentlyUpdated(publishedModules(), 5);
    expect(recent).toHaveLength(5);
    for (let index = 1; index < recent.length; index += 1) {
      expect(Date.parse(recent[index - 1].modifiedAt)).toBeGreaterThanOrEqual(
        Date.parse(recent[index].modifiedAt),
      );
    }
    for (const article of recent) {
      expect(article.dateModified).toBe(
        articleDateModified(article.domain, article.slug),
      );
      expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('never dates a publication after the latest change', () => {
    for (const entry of publishedModules()) {
      const published = articleDatePublished(
        entry.domain,
        entry.slug,
        moduleDatePublished(entry.domain, entry.slug),
      );
      expect(published, key(entry)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        published <= articleDateModified(entry.domain, entry.slug),
        `${key(entry)} datePublished ${published}`,
      ).toBe(true);
    }
  });

});
