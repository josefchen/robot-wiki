import dates from '../data/content-dates.json' with { type: 'json' };

/**
 * When each published article's text last changed, as git records it.
 *
 * The site is built from a checkout that may carry only a few commits of
 * history, so the dates are generated from the full history into
 * `data/content-dates.json` and committed. `npm run generate:content-dates`
 * rewrites the file; `tests/unit/content-dates.test.ts` holds it to git.
 */
export type ContentDateRecord = {
  /** ISO 8601 commit time of the latest non-whitespace change. */
  modified: string;
};

export const CONTENT_DATES_PATH = 'data/content-dates.json';

const RECORDS = dates.articles as Record<string, ContentDateRecord>;

export function contentFilePath(domain: string, slug: string): string {
  return `content/${domain}/${slug}.mdx`;
}

/** The calendar date of an ISO timestamp, in the offset it was written in. */
export function calendarDate(timestamp: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(timestamp);
  if (!match) throw new Error(`${timestamp} is not an ISO 8601 timestamp`);
  return match[0];
}

export function articleModifiedAt(domain: string, slug: string): string {
  const record = RECORDS[`${domain}/${slug}`];
  if (!record) {
    throw new Error(
      `${CONTENT_DATES_PATH} has no date for ${domain}/${slug}: run npm run generate:content-dates`,
    );
  }
  return record.modified;
}

/** The article's `dateModified`: the calendar date of its latest change. */
export function articleDateModified(domain: string, slug: string): string {
  return calendarDate(articleModifiedAt(domain, slug));
}

/** The `count` articles changed most recently, newest first. */
export function recentlyUpdated<T extends { domain: string; slug: string }>(
  articles: readonly T[],
  count: number,
): Array<T & { modifiedAt: string; dateModified: string }> {
  return articles
    .map((article) => {
      const modifiedAt = articleModifiedAt(article.domain, article.slug);
      return { ...article, modifiedAt, dateModified: calendarDate(modifiedAt) };
    })
    .sort(
      (left, right) =>
        Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt) ||
        `${left.domain}/${left.slug}`.localeCompare(`${right.domain}/${right.slug}`),
    )
    .slice(0, count);
}
