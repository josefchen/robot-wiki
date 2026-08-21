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
export function AuthorList({
  authors,
  /** The rest of the meta line (venue and year), which reads before the control. */
  trailing,
}: {
  authors: readonly string[];
  trailing: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (authors.length <= AUTHORS_SHOWN) {
    return (
      <>
        <span data-author-names>{authors.join(', ')}</span>
        {trailing}
      </>
    );
  }

  const hidden = authors.length - AUTHORS_SHOWN;

  return (
    <>
      <span data-author-names>
        {expanded
          ? authors.join(', ')
          : `${authors.slice(0, AUTHORS_SHOWN).join(', ')}, and ${hidden} more`}
      </span>
      {trailing}{' '}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        // No colour transition: the control re-renders on toggle, and a
        // tweened colour is sampled mid-flight by contrast checkers (and by a
        // reader) as a near-black button against the dark surface.
        className="cursor-pointer font-sans text-[13px] text-text-dim underline decoration-dotted decoration-border-strong underline-offset-[3px] hover:text-text hover:decoration-text-dim"
      >
        {expanded
          ? `Show ${AUTHORS_SHOWN} authors`
          : `Show all ${authors.length} authors`}
      </button>
    </>
  );
}
