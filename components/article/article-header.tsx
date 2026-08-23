import type { ModuleRegistryEntry } from '@/data/schemas/module';
import { formatLongDate } from '@/lib/dates';

/**
 * The scholarly header every published article carries (architecture.md
 * section 6b): title, summary, and a quiet metadata line with the
 * last-reviewed date, the reading time and the citation count. All three
 * values are derived at build time (frontmatter `lastReviewed`,
 * lib/reading-time.ts against the compiled article, and the resolved
 * References list); none of them is hand-written per article.
 *
 * The breadcrumb trail above the header already names the domain, so the
 * header does not repeat it. Presentation follows the design system as a
 * compact technical title block: small mono labels, vertical rules, no
 * badges, pills or emoji. The grid reflows at narrow viewports instead of
 * overflowing.
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
};

export function ArticleHeader({
  entry,
  lastReviewed,
  readingTimeMinutes,
  citationCount,
}: ArticleHeaderProps) {
  return (
    <header data-pagefind-body className="mb-10 border-b border-border pb-6">
      <h1 className="font-sans text-[2rem] font-semibold leading-[1.12] tracking-[-0.025em] text-text sm:text-[2.5rem]">
        {entry.title}
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">{entry.summary}</p>
      {/* The metadata row is page chrome, not prose: dates and counts are
          never legitimate excerpt candidates, and Pagefind joins the dt/dd
          text without the flex gap that separates them on screen, so an
          excerpt through the header read "Last reviewed8 August 2026.
          Reading time8 min. Citations10." (fixed 2026-08-15; decision
          recorded in library/search.md). data-pagefind-ignore is
          index-only: the row stays visible and unchanged above. */}
      <dl
        data-pagefind-ignore
        className="mt-6 grid grid-cols-2 font-mono text-xs leading-relaxed text-text-dim sm:grid-cols-3"
      >
        {lastReviewed ? (
          <div
            data-header-last-reviewed={lastReviewed}
            className="col-span-2 border-l border-border-strong pl-3 sm:col-span-1 sm:pl-4"
          >
            <dt className="text-[10px]">Last reviewed</dt>
            <dd className="mt-0.5 text-text">
              <time dateTime={lastReviewed}>{formatLongDate(lastReviewed)}</time>
            </dd>
          </div>
        ) : null}
        <div className="mt-3 border-l border-border-strong pl-3 sm:mt-0 sm:pl-4">
          <dt className="text-[10px]">Reading time</dt>
          <dd data-header-reading-minutes={readingTimeMinutes} className="mt-0.5 text-text">
            {`${readingTimeMinutes} min`}
          </dd>
        </div>
        <div className="mt-3 border-l border-border-strong pl-3 sm:mt-0 sm:pl-4">
          <dt className="text-[10px]">Citations</dt>
          <dd data-header-citation-count={citationCount} className="mt-0.5 text-text">
            {citationCount}
          </dd>
        </div>
      </dl>
    </header>
  );
}
