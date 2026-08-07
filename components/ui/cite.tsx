'use client';

import { useId } from 'react';

type CiteProps = {
  /** Canonical URL of the source (arXiv, official docs, lab blog). */
  href: string;
  /** Short inline label, e.g. "Zhao 2023". */
  label: string;
  /** Full title of the source, shown in the hover/focus tooltip. */
  title: string;
  /** Authors, venue, year. Shown under the title in the tooltip. */
  meta?: string;
};

/**
 * Inline citation chip. Links out to the source; a tooltip with the full
 * reference appears on hover and on keyboard focus (aria-describedby).
 */
export function Cite({ href, label, title, meta }: CiteProps) {
  const tooltipId = useId();

  return (
    <span className="group relative inline-block align-baseline">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={tooltipId}
        className="inline-flex items-center rounded-xs border border-border bg-surface-2 px-1.5 font-mono text-[0.72em] leading-5 text-text-dim no-underline transition-colors hover:border-accent hover:text-accent"
      >
        {label}
      </a>
      <span
        role="tooltip"
        id={tooltipId}
        className="absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-surface-2 p-2.5 font-sans text-xs leading-relaxed text-text group-hover:block group-focus-within:block"
      >
        <span className="block font-medium">{title}</span>
        {meta ? (
          <span className="mt-0.5 block text-text-dim">{meta}</span>
        ) : null}
      </span>
    </span>
  );
}
