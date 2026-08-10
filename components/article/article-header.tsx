import { DOMAIN_META } from '@/data/modules';
import type { ModuleRegistryEntry } from '@/data/schemas/module';
import { formatLongDate } from '@/lib/dates';

/**
 * The scholarly header every published article carries (architecture.md
 * section 6b): domain, title, summary, and a quiet metadata line with the
 * last-reviewed date, the reading time and the citation count. All three
 * values are derived at build time (frontmatter `lastReviewed`,
 * lib/reading-time.ts against the compiled article, and the resolved
 * References list); none of them is hand-written per article.
 *
 * Presentation follows the design system: small, monospace-accented,
 * quiet. No badges, no pills, no emoji, nothing that competes with the
 * article title. The line wraps at narrow viewports instead of
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
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-dim">
        {DOMAIN_META[entry.domain].name}
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        {entry.title}
      </h1>
      <p className="mt-3 leading-relaxed text-text-dim">{entry.summary}</p>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-xs leading-relaxed text-text-dim">
        {lastReviewed ? (
          <div
            data-header-last-reviewed={lastReviewed}
            className="flex flex-wrap items-baseline gap-x-1.5"
          >
            <dt>Last reviewed</dt>
            <dd className="text-text">
              <time dateTime={lastReviewed}>{formatLongDate(lastReviewed)}</time>
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <dt>Reading time</dt>
          <dd data-header-reading-minutes={readingTimeMinutes} className="text-text">
            {`${readingTimeMinutes} min`}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <dt>Citations</dt>
          <dd data-header-citation-count={citationCount} className="text-text">
            {citationCount}
          </dd>
        </div>
      </dl>
    </header>
  );
}
