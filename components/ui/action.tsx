import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';

type ActionVariant = 'primary' | 'secondary' | 'tertiary' | 'link';

type ActionProps = {
  children: ReactNode;
  variant?: ActionVariant;
  href?: string;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};

const variantClasses: Record<ActionVariant, string> = {
  primary:
    'border-action bg-action text-on-action hover:bg-graphite',
  secondary:
    'border-border-strong bg-transparent text-text hover:bg-surface-2',
  tertiary:
    'border-transparent bg-transparent text-text hover:bg-surface-2',
  link:
    'border-transparent bg-transparent px-0 text-link underline decoration-border-strong underline-offset-4 hover:decoration-link',
};

const controlIds: Record<ActionVariant, string> = {
  primary: 'control:primary-action',
  secondary: 'control:secondary-action',
  tertiary: 'control:secondary-action',
  link: 'control:link-focus',
};

const base =
  'inline-flex min-h-6 items-center justify-center gap-2 rounded-sm border px-3 py-2 font-sans text-sm font-medium transition-colors active:translate-y-[1px] disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-text-dim';

export function Action({
  children,
  variant = 'secondary',
  href,
  className,
  disabled = false,
  pressed,
  type = 'button',
  onClick,
}: ActionProps) {
  const classes = cx(base, variantClasses[variant], className);
  const controlId = disabled ? 'control:disabled' : controlIds[variant];

  if (href && !disabled) {
    return (
      <Link
        href={href}
        data-brand-control-id={controlId}
        data-brand-supported-states="default hover active focus-visible"
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      data-brand-control-id={controlId}
      data-brand-supported-states="default hover active focus-visible disabled"
      className={classes}
    >
      {children}
    </button>
  );
}
