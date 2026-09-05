import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type TableScrollProps = {
  /**
   * The id of the table's own `<caption>`. The region borrows the caption
   * rather than repeating it, so a reader who reaches the scroll container
   * and a reader who reaches the table hear the same sentence.
   */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

/**
 * The horizontal scroll container a dense table sits in.
 *
 * A table wider than the reading column has to scroll inside its own box or
 * it widens the document, and a box that scrolls has to be reachable by
 * keyboard or the columns past its right edge are unreachable without a
 * pointer. Four interactive comparison tables shipped with a bare
 * `overflow-x-auto` div and neither property, which is invisible to an axe
 * run at desktop width because the box only overflows at 375px.
 *
 * The four attributes below are the whole contract, and they live here so a
 * fifth table cannot be authored without them.
 */
export function TableScroll({
  labelledBy,
  className,
  children,
}: TableScrollProps) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={labelledBy}
      className={cx('overflow-x-auto', className)}
    >
      {children}
    </div>
  );
}
