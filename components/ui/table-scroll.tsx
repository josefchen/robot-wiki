import type { ReactNode } from 'react';
import { scrollRegionAttributes } from '@/lib/scroll-region.mjs';
import { cx } from '@/lib/utils';

type ScrollRegionProps = {
  /**
   * The id of an element whose text already names the content, such as a
   * table's own `<caption>` or a code sample's title bar. The region
   * borrows that text rather than repeating it, so a reader who reaches the
   * scroll container and a reader who reaches the content hear the same
   * sentence.
   */
  labelledBy?: string;
  /** A name for content that has no visible label of its own. */
  label?: string;
  className?: string;
  children: ReactNode;
};

/**
 * A horizontal scroll container, with the three attributes that make it
 * usable without a pointer.
 *
 * Content wider than the reading column has to scroll inside its own box or
 * it widens the document; a box that scrolls has to be reachable by
 * keyboard or everything past its right edge is unreachable; and a box that
 * takes focus has to say what it is, or the keyboard reader lands on
 * something that announces nothing. Four interactive comparison tables
 * shipped with a bare `overflow-x-auto` div and none of the three, which is
 * invisible to an axe run at desktop width because the box only overflows
 * at 375px. Display equations and fenced code samples then shipped with the
 * tab stop and no name, which is the same defect one step along.
 *
 * `lib/scroll-region.mjs` owns the attributes, because the other two call
 * sites are a rehype pass that cannot import a React component.
 */
export function ScrollRegion({
  labelledBy,
  label,
  className,
  children,
}: ScrollRegionProps) {
  const attributes = labelledBy
    ? scrollRegionAttributes({ labelledBy })
    : scrollRegionAttributes({ label: label ?? '' });
  return (
    <div {...attributes} className={cx('overflow-x-auto', className)}>
      {children}
    </div>
  );
}

/**
 * The scroll container a dense table sits in, named by its own caption.
 * Kept as its own export so a table cannot be authored without the caption
 * id the region borrows.
 */
export function TableScroll({
  labelledBy,
  className,
  children,
}: ScrollRegionProps & { labelledBy: string }) {
  return (
    <ScrollRegion labelledBy={labelledBy} className={className}>
      {children}
    </ScrollRegion>
  );
}
