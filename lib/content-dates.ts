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
  /** ISO 8601 commit time of the commit that added the file. */
  published: string;
  /** ISO 8601 commit time of the latest non-whitespace change. */
  modified: string;
};

export type RouteDateRecord = {
  /** ISO 8601 commit time of the latest non-whitespace change to any source. */
  modified: string;
};

export const CONTENT_DATES_PATH = 'data/content-dates.json';

const RECORDS = dates.articles as Record<string, ContentDateRecord>;
const ROUTE_RECORDS = dates.routes as Record<string, RouteDateRecord>;

export function contentFilePath(domain: string, slug: string): string {
  return `content/${domain}/${slug}.mdx`;
}

const HUB_SOURCES = ['app/(content)/[domain]/page.tsx', 'data/modules.ts'];

/**
 * The files whose history dates each route that is not an article: the page
 * source plus the registries and data files it renders. Home renders article
 * text (the featured lead, the counts and the recently updated list), so the
 * whole content tree dates it too. The generated date file is never a
 * source: it changes each time it is regenerated, so it could not agree with
 * the date it records.
 */
export const ROUTE_SOURCES: Readonly<Record<string, readonly string[]>> = {
  '/': [
    'app/page.tsx',
    'data/modules.ts',
    'data/did-you-know.ts',
    'data/citations.ts',
    'data/glossary.ts',
    'content',
  ],
  '/manipulation/': HUB_SOURCES,
  '/classical/': HUB_SOURCES,
  '/rl-sim2real/': HUB_SOURCES,
  '/world-models/': HUB_SOURCES,
  '/frontier/': HUB_SOURCES,
  '/data-hardware/': HUB_SOURCES,
  '/adjacent/': HUB_SOURCES,
  '/market-map/': ['app/market-map/page.tsx', 'data/companies.ts', 'data/logos.ts'],
  '/playground/': ['app/playground/page.tsx'],
  '/glossary/': ['app/glossary/page.tsx', 'data/glossary.ts', 'data/citations.ts'],
  '/credits/': [
    'app/credits/page.tsx',
    'data/images.ts',
    'data/companies.ts',
    'data/logos.ts',
  ],
  '/editorial-policy/': ['app/editorial-policy/page.tsx'],
  '/about/': ['app/about/page.tsx', 'data/modules.ts'],
  '/a-z/': ['app/a-z/page.tsx', 'data/modules.ts', 'data/glossary.ts'],
};

/** The `lastmod` of a route that is not an article. */
export function routeDateModified(path: string): string {
  const record = ROUTE_RECORDS[path];
  if (!record) {
    throw new Error(
      `${CONTENT_DATES_PATH} has no date for ${path}: run npm run generate:content-dates`,
    );
  }
  return calendarDate(record.modified);
}

/**
 * The article's `datePublished`: the publication date its front matter
 * declares, or else the day its content file was first committed.
 */
export function articleDatePublished(
  domain: string,
  slug: string,
  declared?: string,
): string {
  if (declared) return declared;
  const record = RECORDS[`${domain}/${slug}`];
  if (!record) {
    throw new Error(
      `${CONTENT_DATES_PATH} has no date for ${domain}/${slug}: run npm run generate:content-dates`,
    );
  }
  return calendarDate(record.published);
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
