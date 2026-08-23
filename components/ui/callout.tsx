import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type CalloutVariant = 'info' | 'warn' | 'error';

type CalloutProps = {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
};

const variantLabel: Record<CalloutVariant, string> = {
  info: 'Note',
  warn: 'Warning',
  error: 'Error',
};

const borderColor: Record<CalloutVariant, string> = {
  info: 'border-l-border-strong',
  warn: 'border-l-warn',
  error: 'border-l-err',
};

const titleColor: Record<CalloutVariant, string> = {
  info: 'text-text',
  warn: 'text-warn',
  error: 'text-err',
};

export function Callout({ variant = 'info', title, children }: CalloutProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'note'}
      aria-label={title ?? variantLabel[variant]}
      data-variant={variant}
      className={cx(
        'my-6 rounded-md border border-border border-l-2 bg-surface p-4',
        borderColor[variant],
      )}
    >
      <p
        className={cx(
          'font-sans text-xs font-medium tracking-wide',
          titleColor[variant],
        )}
      >
        {title ?? variantLabel[variant]}
      </p>
      <div className="mt-1 text-sm leading-relaxed text-text-dim [&_a]:text-accent">
        {children}
      </div>
    </div>
  );
}
