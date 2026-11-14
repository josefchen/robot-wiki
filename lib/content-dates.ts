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
  /** Commit time of the commit that added the file, ISO 8601 in UTC. */
  published: string;
  /** Commit time of the latest non-whitespace change, ISO 8601 in UTC. */
  modified: string;
};

export type RouteDateRecord = {
  /** Commit time of the latest non-whitespace change to any source, in UTC. */
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
 * text (the "Start here" titles, the counts and the "Latest" list), so the
 * whole content tree dates it too, with its picks and the editor's notes. The generated date file is never a
 * source: it changes each time it is regenerated, so it could not agree with
 * the date it records.
 */
export const ROUTE_SOURCES: Readonly<Record<string, readonly string[]>> = {
  '/': [
    'app/page.tsx',
    'data/modules.ts',
    'data/did-you-know.ts',
    'data/home-featured.ts',
    'data/updates.ts',
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
  '/now/': ['app/now/page.tsx', 'data/now.ts', 'data/now-debates.ts'],
  '/market-map/': ['app/market-map/page.tsx', 'data/companies.ts', 'data/logos.ts'],
  '/market-map/rounds/': [
    'app/market-map/rounds/page.tsx',
    'components/rounds',
    'data/rounds.ts',
    'data/fx-rates.ts',
  ],
  '/playground/': ['app/playground/page.tsx'],
  '/how-robots-work/': ['app/how-robots-work/page.tsx', 'components/explainers'],
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

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * An ISO timestamp as the same instant in UTC, to the second:
 * `2026-11-15T02:45:02+08:00` is `2026-11-14T18:45:02Z`. A timestamp with
 * no offset is refused: it would be read in the zone of whichever machine
 * builds the site.
 */
export function utcTimestamp(timestamp: string): string {
  const time = ISO_INSTANT.test(timestamp) ? Date.parse(timestamp) : Number.NaN;
  if (Number.isNaN(time)) {
    throw new Error(`${timestamp} is not an ISO 8601 timestamp with an offset`);
  }
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * The calendar date of an ISO timestamp in UTC, whatever offset it was
 * written in. Git writes a commit time in the committer's zone, so the
 * first ten characters of an evening commit made east of Greenwich name
 * the next day.
 */
export function calendarDate(timestamp: string): string {
  return utcTimestamp(timestamp).slice(0, 10);
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
