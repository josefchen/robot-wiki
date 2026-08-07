import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type AsideProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

/** Marginal note inside prose: tangential context that is not load-bearing. */
export function Aside({ title, className, children }: AsideProps) {
  return (
    <aside
      aria-label={title ?? 'Aside'}
      className={cx(
        'my-6 rounded-md border border-border bg-surface p-4',
        className,
      )}
    >
      {title ? (
        <p className="font-sans text-sm font-medium text-text">{title}</p>
      ) : null}
      <div
        className={cx(
          'font-serif text-sm leading-relaxed text-text-dim',
          title && 'mt-1',
        )}
      >
        {children}
      </div>
    </aside>
  );
}
