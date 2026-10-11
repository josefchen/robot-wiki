import type { ReactNode } from 'react';
import type { ModuleRegistryEntry } from '@/data/schemas/module';
import { formatLongDate } from '@/lib/dates';

/**
 * The masthead every published article carries, in the Pantheon research
 * page manner: an uppercase eyebrow naming the domain, one DM Sans display
 * H1, the summary as a Geist lead, and one muted meta line with the
 * last-reviewed date, the reading time and the source count linked to the
 * References list. All three values are derived at build time (frontmatter
 * `lastReviewed`, lib/reading-time.ts against the compiled article, and the
 * resolved References list); none of them is hand-written per article.
 *
 * No badges, pills, portraits, cover art or emoji, and no rule: the sheet
 * closes on space.
 */

type ArticleHeaderProps = {
  entry: ModuleRegistryEntry;
  /** ISO YYYY-MM-DD from the module frontmatter. */
  lastReviewed?: string;
  /** Derived at build time from the compiled article (lib/reading-time.ts). */
  readingTimeMinutes: number;
  /**
   * Length of the resolved References list passed to <References>: the
   * header count and the rendered bibliography always agree because they
   * share the one array.
   */
  citationCount: number;
  /** The eyebrow above the title: the article's breadcrumb trail. */
  eyebrow?: ReactNode;
};

export function ArticleHeader({
  entry,
  lastReviewed,
  readingTimeMinutes,
  citationCount,
  eyebrow,
}: ArticleHeaderProps) {
  return (
    <header data-pagefind-body className="article-masthead">
      {eyebrow}
      <h1 data-tektur-role="article-h1" className="article-title">
        {entry.title}
      </h1>
      <p className="page-lead">{entry.summary}</p>
      {/* The meta line is page chrome, not prose: dates and counts are
          never legitimate excerpt candidates (decision recorded in
          library/search.md). data-pagefind-ignore is index-only: the line
          stays visible above. */}
      <p data-pagefind-ignore data-article-meta className="meta-line">
        {lastReviewed ? (
          <span data-header-last-reviewed={lastReviewed}>
            Updated <time dateTime={lastReviewed}>{formatLongDate(lastReviewed)}</time>
            <span aria-hidden="true"> · </span>
          </span>
        ) : null}
        <span data-header-reading-minutes={readingTimeMinutes}>
          {`${readingTimeMinutes} min read`}
        </span>
        <span aria-hidden="true"> · </span>
        <a
          href="#references-heading"
          data-header-citation-count={citationCount}
          data-brand-control-id="control:link-focus"
        >
          {`${citationCount} ${citationCount === 1 ? 'source' : 'sources'}`}
        </a>
      </p>
    </header>
  );
}
