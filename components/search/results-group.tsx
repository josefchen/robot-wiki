import type { ReactNode } from 'react';

/**
 * One labeled group inside the search results area. Both result groups
 * (prose modules and structured entities) share it, so both share one
 * visual and accessibility contract: a region named by its heading, a mono
 * result count, and hairline separation rather than card boxes.
 */
type ResultsGroupProps = {
  /** Stable group identifier; drives aria labelling and data hooks. */
  id: string;
  heading: string;
  /** Shown only once the search has settled. */
  count?: number;
  /**
   * Empty-group message (e.g. the no-results state) or an index-failure
   * note. A node rather than a string so a group can carry its own
   * recovery control inline, which the facet-narrowed structured group
   * does.
   */
  note?: ReactNode;
  /**
   * Marks the note as an index failure rather than a query outcome. The
   * note carries the group id as its error marker and the error semantic
   * token, because a surface that failed to load must never read as a
   * surface that answered with nothing (VAL-B2-DISC-001/002).
   */
  noteIsError?: boolean;
  /**
   * True while the group's first results for a query are still in flight
   * and no previous rows remain on screen. Renders one deterministic,
   * non-animated loading row; the live status line carries the
   * announcement, so the row itself stays aria-hidden.
   */
  loading?: boolean;
  children?: ReactNode;
};

export function ResultsGroup({
  id,
  heading,
  count,
  note,
  noteIsError = false,
  loading = false,
  children,
}: ResultsGroupProps) {
  return (
    <section aria-labelledby={`${id}-results-heading`} data-results-group={id}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2
          id={`${id}-results-heading`}
          className="font-sans text-base font-semibold tracking-tight text-text"
        >
          {heading}
        </h2>
        {typeof count === 'number' ? (
          <span
            data-results-group-count
            className="font-mono text-xs text-text-dim"
          >
            {count} {count === 1 ? 'result' : 'results'}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p
          data-search-loading
          aria-hidden="true"
          className="mt-4 font-mono text-xs text-text-dim"
        >
          Searching&hellip;
        </p>
      ) : null}
      {note ? (
        <p
          data-search-group-note
          data-search-group-error={noteIsError ? id : undefined}
          className={
            noteIsError
              ? 'mt-4 border-l-2 border-err pl-3 text-sm leading-relaxed text-err'
              : 'mt-4 text-sm leading-relaxed text-text-dim'
          }
        >
          {note}
        </p>
      ) : null}
      {children}
    </section>
  );
}
