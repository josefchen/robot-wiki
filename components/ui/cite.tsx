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
  /**
   * Citation registry id, exposed as data-cite-id so chips and References
   * entries can be reconciled. Omitted from the DOM when not given.
   */
  citeId?: string;
  /**
   * In-page anchor (#ref-<id>) of this citation's entry in the article's
   * References section. When set, the chip grows a second affordance that
   * jumps the reader to the full entry.
   */
  referenceHref?: string;
};

/**
 * Inline citation chip. The primary link goes out to the source; a tooltip
 * with the full reference appears on hover and on keyboard focus
 * (aria-describedby). With referenceHref set, a second in-chip affordance
 * jumps to the article's References entry for the same id.
 */
export function Cite({ href, label, title, meta, citeId, referenceHref }: CiteProps) {
  const tooltipId = useId();

  return (
    <span
      {...(citeId ? { 'data-cite-id': citeId } : {})}
      className="group relative inline-block align-baseline"
    >
      <span
        data-brand-surface-id="surface:flat"
        className="inline-flex items-stretch overflow-hidden rounded-xs border border-border bg-surface-2 font-mono text-[0.72em] leading-5 transition-colors group-hover:border-accent group-focus-within:border-accent"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={tooltipId}
          data-brand-control-id="control:link-focus"
          className="inline-flex items-center px-1.5 text-text-dim no-underline transition-colors hover:bg-surface hover:text-accent"
        >
          {label}
        </a>
        {referenceHref ? (
          // data-pagefind-ignore on THIS anchor only: the ↓ glyph is pure
          // excerpt noise (search snippets read "2024↓."), while the chip
          // label link above must stay indexed. Index-only hint — the
          // anchor, its aria-label, and keyboard behavior are untouched.
          <a
            href={referenceHref}
            aria-label={`Jump to the full reference for ${title}`}
            data-pagefind-ignore
            data-brand-control-id="control:link-focus"
            className="inline-flex items-center border-l border-border px-1 text-text-dim no-underline transition-colors hover:bg-surface hover:text-accent"
          >
            <span aria-hidden="true">↓</span>
          </a>
        ) : null}
      </span>
      <span
        role="tooltip"
        id={tooltipId}
        data-brand-surface-id="surface:floating"
        data-brand-frame-depth="1"
        // Hidden copy: excluded from the Pagefind index so search excerpts
        // never fuse the reference title/authors onto the prose. Inert for
        // assistive technology; the aria-describedby wiring is untouched.
        // whitespace-normal: the chip is wrapped in a whitespace-nowrap span
        // at build time (lib/rehype-cite-punctuation.mjs) to bind it to its
        // trailing punctuation, and white-space inherits — without the reset
        // the fixed-width tooltip cannot wrap and its text overflows the box.
        data-pagefind-ignore
        className="absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 max-w-[calc(100vw-3rem)] rounded-sm border border-border bg-surface p-2.5 font-sans text-xs leading-relaxed whitespace-normal text-text shadow-floating group-hover:block group-focus-within:block"
      >
        <span className="block font-medium">{title}</span>
        {meta ? (
          <span className="mt-0.5 block text-text-dim">{meta}</span>
        ) : null}
      </span>
    </span>
  );
}
