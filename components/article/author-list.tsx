'use client';

import { useState } from 'react';

/**
 * How many author names a References entry renders before eliding. The
 * registry holds two 87-name entries that both land on /manipulation/pi-line,
 * and joined in full each one runs to sixteen wrapped lines at desktop and
 * thirty-two at 375px, which buries the title it belongs to.
 */
export const AUTHORS_SHOWN = 8;

/**
 * The author line of one References entry: the first AUTHORS_SHOWN names, a
 * marker stating how many are not shown, and an inline control that swaps in
 * the full registry list without leaving the page. Order and spelling are the
 * registry's; nothing is reordered and nothing is summarised away.
 */
export function AuthorList({ authors }: { authors: readonly string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (authors.length <= AUTHORS_SHOWN) {
    return <span data-author-names>{authors.join(', ')}</span>;
  }

  const hidden = authors.length - AUTHORS_SHOWN;

  return (
    <>
      <span data-author-names>
        {expanded
          ? authors.join(', ')
          : `${authors.slice(0, AUTHORS_SHOWN).join(', ')}, and ${hidden} more authors`}
      </span>{' '}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="cursor-pointer font-sans text-[13px] text-text-dim underline decoration-dotted decoration-border-strong underline-offset-[3px] transition-colors hover:text-text hover:decoration-text-dim"
      >
        {expanded
          ? `Show ${AUTHORS_SHOWN} authors`
          : `Show all ${authors.length} authors`}
      </button>
    </>
  );
}
