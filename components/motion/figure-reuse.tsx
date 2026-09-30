import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';
import { FIGURE_TEXT_CLASS } from './figure-frame';

/**
 * The caption line of a visual shown outside the article that teaches it:
 * what this placement uses it for, then a link to that article. Each
 * concept has one canonical visual, and every reuse says why it is there
 * (one visual per concept); data-figure-reuse names the canonical route so
 * a census can join the two.
 */
export function FigureReuse({
  href,
  page,
  children,
  className,
}: {
  /** The canonical article's route. */
  href: string;
  /** The canonical article's title, used as the link text. */
  page: string;
  /** The purpose this placement serves, as the start of a sentence. */
  children: ReactNode;
  className?: string;
}) {
  // A <div>, like the frame's own caption: the article sheet reads every
  // <p> in the reading column as running prose.
  return (
    <div
      data-figure-reuse={href}
      className={cx(FIGURE_TEXT_CLASS.caption, 'mt-2', className)}
    >
      {children}{' '}
      <Link
        data-brand-control-id="control:link-focus"
        href={href}
        className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
      >
        {page}
      </Link>
      .
    </div>
  );
}
