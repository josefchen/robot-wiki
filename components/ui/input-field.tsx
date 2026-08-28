'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  description?: string;
  error?: string;
};

export function InputField({
  label,
  description,
  error,
  className,
  name,
  disabled,
  ...props
}: InputFieldProps) {
  const generatedId = useId();
  const inputId = name ? `${name}-${generatedId}` : generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-2 font-sans text-sm text-text">
      <label htmlFor={inputId} className="font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-brand-control-id={disabled ? 'control:disabled' : 'control:input'}
        data-brand-surface-id="surface:flat"
        className={cx(
          'min-h-10 rounded-sm border border-border bg-surface px-3 py-2 text-text placeholder:text-text-dim disabled:cursor-not-allowed disabled:bg-surface-2',
          error && 'border-error',
          className,
        )}
        {...props}
      />
      {description ? (
        <span id={descriptionId} className="text-xs text-text-dim">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs font-medium text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
