import type { ReactNode } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';

type CardProps = {
  title?: string;
  /** When set, the whole card becomes an internal next/link navigation. */
  href?: string;
  level?: 'flat' | 'raised';
  className?: string;
  children: ReactNode;
};

const levelClasses = {
  flat: 'bg-surface',
  raised: 'bg-surface shadow-raised',
} as const;

export function Card({
  title,
  href,
  level = 'flat',
  className,
  children,
}: CardProps) {
  const baseClasses = cx(
    'block rounded-sm border border-border p-4 text-left',
    levelClasses[level],
  );
  if (href) {
    return (
      <Link
        href={href}
        data-brand-control-id="control:link-focus"
        data-brand-surface-id={`surface:${level}`}
        data-brand-module-signature="card-heading-action"
        data-brand-frame-depth="1"
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
    <div
      data-brand-surface-id={`surface:${level}`}
      data-brand-module-signature="card-heading-content"
      data-brand-frame-depth="1"
      className={cx(baseClasses, className)}
    >
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
