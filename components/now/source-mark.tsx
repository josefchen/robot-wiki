import type { SourceType } from '@/data/now';
import { sourceHost } from '@/lib/now-page';
import { cx } from '@/lib/utils';

/**
 * The small mark after a row whose figure or quote comes from a report of
 * the source. The word is the data's own source type, never typed here.
 */
export function SourceTypeMark({ type, className }: { type: SourceType | 'computed'; className?: string }) {
  return (
    <span
      data-source-mark={type}
      className={cx('whitespace-nowrap font-mono text-[12px] leading-none text-text-dim', className)}
    >
      {type}
    </span>
  );
}

/**
 * A link to the page a cell rests on, labelled by its host. The page's own
 * title follows for assistive technology, so the link's name starts with
 * the visible label and still says which page it opens.
 */
export function SourceLink({
  url,
  title,
  label,
  className,
}: {
  url: string;
  title: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-source-link=""
      data-brand-control-id="control:link-focus"
      className={cx('ink-link break-words', className)}
    >
      {label ?? sourceHost(url)}
      <span className="sr-only">: {title}</span>
    </a>
  );
}
