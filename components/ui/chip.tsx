import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

type ChipProps = {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};

export function Chip({
  children,
  selected = false,
  disabled = false,
  className,
  onClick,
}: ChipProps) {
  const classes = cx(
    'inline-flex min-h-6 items-center gap-1 rounded-xs border px-2 py-1 font-sans text-xs',
    selected
      ? 'border-highlight bg-selection font-semibold text-ink'
      : 'border-border bg-surface text-text',
    disabled && 'cursor-not-allowed bg-surface-2 text-text-dim',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        data-brand-control-id={
          disabled ? 'control:disabled' : 'control:selection'
        }
        data-brand-surface-id="surface:flat"
        className={classes}
      >
        {selected ? <span aria-hidden="true">✓</span> : null}
        {children}
      </button>
    );
  }

  return (
    <span
      data-brand-surface-id="surface:flat"
      data-brand-chip-state={selected ? 'selected' : 'default'}
      className={classes}
    >
      {selected ? <span aria-hidden="true">✓</span> : null}
      {children}
    </span>
  );
}
