import type { ReactNode } from 'react';

/**
 * One labeled group inside the search results area. The prose group uses it
 * today; the structured-entity group (methods, companies, datasets) reuses
 * it unchanged when search-structured-index lands, so both groups share one
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
   * Empty-group message (e.g. the no-results state). A node rather than a
   * string so a group can carry its own recovery control inline, which the
   * facet-narrowed structured group does.
   */
  note?: ReactNode;
  children?: ReactNode;
};

export function ResultsGroup({
  id,
  heading,
  count,
  note,
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
          <span className="font-mono text-xs text-text-dim">
            {count} {count === 1 ? 'result' : 'results'}
          </span>
        ) : null}
      </div>
      {note ? (
        <p className="mt-4 text-sm leading-relaxed text-text-dim">{note}</p>
      ) : null}
      {children}
    </section>
  );
}
