'use client';

import { useId, useRef, useState, type MouseEvent } from 'react';
import { useCitationNumber } from '@/components/article/citation-numbers';

type CiteProps = {
  /** Canonical URL of the source (arXiv, official docs, lab blog). */
  href: string;
  /** Short inline label, e.g. "Zhao 2023". */
  label: string;
  /** Full title of the source. */
  title: string;
  /** Authors, venue, year. Read as part of the citation's description. */
  meta?: string;
  /**
   * Citation registry id, exposed as data-cite-id so citations and
   * References entries can be reconciled. Omitted from the DOM when not
   * given.
   */
  citeId?: string;
  /**
   * In-page anchor (#ref-<id>) of this citation's entry in the article's
   * References section.
   */
  referenceHref?: string;
};

/**
 * A citation as a sidenote (the Pantheon research-page standard).
 *
 * Inside an article the citation is a small superscript number, the same
 * number its References entry carries. Its note (the number, the source's
 * author-year label linked to the source, and the title in muted 13px)
 * sits beside the line in the right margin from 1200px wherever the
 * citation is part of the running prose (app/globals.css, `.sidenote`).
 * Where there is no margin to use (a phone, a table cell, a figure), the
 * number opens the note inline instead. When the note is already in the
 * margin, the number jumps to the full References entry.
 *
 * Outside an article there is no numbering, and the citation renders as
 * its author-year label linked to the source.
 */
export function Cite({ href, label, title, meta, citeId, referenceHref }: CiteProps) {
  const noteId = useId();
  const noteRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const number = useCitationNumber(citeId);
  const idAttribute = citeId ? { 'data-cite-id': citeId } : {};
  const description = meta ? `${title}. ${meta}.` : `${title}.`;

  if (number === undefined) {
    return (
      <span {...idAttribute} className="cite">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={noteId}
          data-brand-control-id="control:link-focus"
          className="cite-label"
        >
          {label}
        </a>
        {referenceHref ? (
          <a
            href={referenceHref}
            aria-label={`Jump to the full reference for ${title}`}
            data-pagefind-ignore
            data-brand-control-id="control:link-focus"
            className="cite-label ml-0.5 no-underline"
          >
            <span aria-hidden="true">↓</span>
          </a>
        ) : null}
        <span id={noteId} data-pagefind-ignore className="hidden">
          {description}
        </span>
      </span>
    );
  }

  function onMarkClick(event: MouseEvent<HTMLAnchorElement>) {
    const note = noteRef.current;
    if (!note) return;
    // The note already stands in the margin: let the number jump to the
    // full References entry.
    const float = getComputedStyle(note).float;
    if ((float === 'left' || float === 'right') && !open) return;
    event.preventDefault();
    setOpen((value) => !value);
  }

  return (
    <span {...idAttribute} className="cite">
      {/* The number is excerpt noise ("late12"), so only the note's
          author-year label stays in the search index, as the chip label
          did before. */}
      <sup data-pagefind-ignore className="cite-mark">
        <a
          href={referenceHref ?? `#ref-${citeId}`}
          onClick={onMarkClick}
          aria-describedby={noteId}
          data-brand-control-id="control:link-focus"
        >
          <span className="sr-only">Source </span>
          {number}
        </a>
      </sup>
      {/* `hidden` is the note's at-rest state; app/globals.css shows it in
          the margin or when opened. The title and venue are the citation's
          apparatus and stay out of the search index. */}
      <span
        ref={noteRef}
        id={noteId}
        data-sidenote
        data-open={open ? 'true' : 'false'}
        className="sidenote hidden"
      >
        <span data-pagefind-ignore className="sidenote-index">
          {number}
        </span>
        {/* A real space, so the indexed label never fuses onto the cited
            word in the search text. */}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-brand-control-id="control:link-focus"
        >
          {label}
        </a>
        <span data-pagefind-ignore className="sidenote-title">{`, ${title}`}</span>
        {meta ? (
          <span data-pagefind-ignore className="sr-only">{`. ${meta}`}</span>
        ) : null}
      </span>
    </span>
  );
}
