import type { ReactNode } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';

type CardProps = {
  title?: string;
  /** When set, the whole card becomes an internal next/link navigation. */
  href?: string;
  className?: string;
  children: ReactNode;
};

const baseClasses =
  'block rounded-md border border-border bg-surface p-4 text-left';

export function Card({ title, href, className, children }: CardProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={cx(
          baseClasses,
          'group transition-colors hover:border-border-strong',
          className,
        )}
      >
        {title ? (
          <h3
            data-card-title
            className="font-sans text-sm font-medium text-text group-hover:text-accent"
          >
            {title}
          </h3>
        ) : null}
        <div className={cx('text-sm text-text-dim', title && 'mt-1')}>
          {children}
        </div>
      </Link>
    );
  }

  return (
    <div className={cx(baseClasses, className)}>
      {title ? (
        <h3 data-card-title className="font-sans text-sm font-medium text-text">
          {title}
        </h3>
      ) : null}
      <div className={cx('text-sm text-text-dim', title && 'mt-1')}>
        {children}
      </div>
    </div>
  );
}
