import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'ok' | 'warn' | 'err';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
};

// No pill: a badge is a short label in small tracked capitals, its words
// the cue and its colour only a second one.
const variantClasses: Record<BadgeVariant, string> = {
  default: 'text-text-dim',
  accent: 'font-semibold text-ink',
  ok: 'text-ok',
  warn: 'text-warn',
  err: 'text-error',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      data-brand-surface-id="surface:flat"
      className={cx(
        'inline-flex items-center font-sans text-[11px] font-medium uppercase leading-none tracking-[0.08em]',
        variantClasses[variant],
      )}
    >
      {children}
    </span>
  );
}
