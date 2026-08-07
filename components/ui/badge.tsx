import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'ok' | 'warn' | 'err';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-border bg-surface-2 text-text-dim',
  accent: 'border-accent text-accent',
  ok: 'border-ok text-ok',
  warn: 'border-accent text-accent',
  err: 'border-err text-err',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={cx(
        'inline-flex items-center rounded-xs border px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-wide',
        variantClasses[variant],
      )}
    >
      {children}
    </span>
  );
}
