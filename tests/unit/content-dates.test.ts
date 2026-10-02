import { describe, expect, it } from 'vitest';
import dates from '@/data/content-dates.json' with { type: 'json' };
import { publishedModules } from '@/data/modules';
import {
  ROUTE_SOURCES,
  articleDateModified,
  articleDatePublished,
  articleModifiedAt,
  calendarDate,
  contentFilePath,
  recentlyUpdated,
  routeDateModified,
} from '@/lib/content-dates';
import {
  gitAddedAt,
  gitModifiedAt,
  gitModifiedAtAny,
  hasUncommittedChange,
} from '@/lib/content-dates-git';
import { moduleDatePublished } from '@/lib/module-source';

const root = process.cwd();
const key = ({ domain, slug }: { domain: string; slug: string }) => `${domain}/${slug}`;

// An article with uncommitted text is stamped when the file is generated, so
// only its lower bound is known until the change is committed.
function gitTruth() {
  return publishedModules().map((entry) => {
    const path = contentFilePath(entry.domain, entry.slug);
    const committed = gitModifiedAt(root, path);
    const dirty = hasUncommittedChange(root, path);
    return { entry, committed, dirty };
  });
}

describe('article change dates', () => {
  it('records exactly the published articles', () => {
    expect(Object.keys(dates.articles).sort()).toEqual(
      publishedModules().map(key).sort(),
    );
  });

  it('matches the latest non-whitespace git change of every article', () => {
    for (const { entry, committed, dirty } of gitTruth()) {
      const recorded = articleModifiedAt(entry.domain, entry.slug);
      if (dirty || committed === null) {
        if (committed) {
          expect(Date.parse(recorded), key(entry)).toBeGreaterThanOrEqual(
            Date.parse(committed),
          );
        }
        continue;
      }
      expect(
        calendarDate(recorded),
        `${key(entry)}: run npm run generate:content-dates`,
      ).toBe(calendarDate(committed));
    }
  }, 60_000);

  it('orders the five latest changes the way git does', () => {
    const expected = gitTruth()
      .map(({ entry, committed, dirty }) => ({
        key: key(entry),
        at: dirty || committed === null
          ? articleModifiedAt(entry.domain, entry.slug)
          : committed,
      }))
      // One commit can change several articles; a tie falls back to the key.
      .sort((left, right) => Date.parse(right.at) - Date.parse(left.at) ||
        left.key.localeCompare(right.key))
      .slice(0, 5)
      .map((row) => row.key);
    expect(recentlyUpdated(publishedModules(), 5).map(key)).toEqual(expected);
  }, 60_000);

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

  it('records the commit that added every article', () => {
    const records = dates.articles as Record<string, { published: string }>;
    for (const entry of publishedModules()) {
      const added = gitAddedAt(root, contentFilePath(entry.domain, entry.slug));
      if (added === null) continue;
      expect(records[key(entry)].published, key(entry)).toBe(added);
    }
  }, 60_000);

  it('dates every other route by the latest change to its sources', () => {
    expect(Object.keys(dates.routes).sort()).toEqual(
      Object.keys(ROUTE_SOURCES).sort(),
    );
    for (const [route, sources] of Object.entries(ROUTE_SOURCES)) {
      const committed = gitModifiedAtAny(root, sources);
      if (committed === null) continue;
      if (sources.some((source) => hasUncommittedChange(root, source))) {
        expect(
          Date.parse((dates.routes as Record<string, { modified: string }>)[route].modified),
          route,
        ).toBeGreaterThanOrEqual(Date.parse(committed));
        continue;
      }
      expect(routeDateModified(route), `${route}: run npm run generate:content-dates`)
        .toBe(calendarDate(committed));
    }
  }, 120_000);
});
