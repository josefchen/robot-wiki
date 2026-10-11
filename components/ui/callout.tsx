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

const titleColor: Record<CalloutVariant, string> = {
  info: 'text-text',
  warn: 'text-warn',
  error: 'text-error',
};

export function Callout({ variant = 'info', title, children }: CalloutProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'note'}
      aria-label={title ?? variantLabel[variant]}
      data-variant={variant}
      data-brand-surface-id="surface:flat"
      data-brand-frame-depth="1"
      className="my-6 border border-border bg-surface p-5"
    >
      <p
        className={cx(
          'font-sans text-xs font-medium tracking-wide',
          titleColor[variant],
        )}
      >
        {title ?? variantLabel[variant]}
      </p>
      <div className="mt-1 text-sm leading-relaxed text-text-dim [&_a]:text-ink [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
