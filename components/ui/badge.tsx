import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'ok' | 'warn' | 'err';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
};

// No pill: a badge is a short lowercase table value, like "not disclosed",
// its words the cue and its colour only a second one. Tracked capitals stay
// with eyebrows and section heads: one per table row would put a page over
// its five micro-labels (VAL-DESIGN-010).
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
      data-badge=""
      data-variant={variant}
      data-brand-surface-id="surface:flat"
      className={cx(
        'inline-flex items-center font-sans text-[13px] font-medium leading-none',
        variantClasses[variant],
      )}
    >
      {children}
    </span>
  );
}
