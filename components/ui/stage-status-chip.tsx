import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

type StageStatusChipProps = {
  /**
   * The Badge variant the status stands for, kept on `data-variant` so the
   * page-ground Badge and this chip expose the same state to tests.
   */
  variant: 'default' | 'ok' | 'warn';
  /** The border that repeats the status without colour. */
  line: 'solid' | 'dashed' | 'bold';
  children: ReactNode;
};

/**
 * A status chip for a table on the figure stage. The page-ground Badge
 * paints status in the status hues, which are reserved inside figures for
 * data; here the word carries the status in the stage text colour and the
 * border style (or weight) repeats it. The border stays 1px, the widest a
 * flat surface registers.
 */
export function StageStatusChip({ variant, line, children }: StageStatusChipProps) {
  return (
    <span
      data-variant={variant}
      data-brand-surface-id="surface:flat"
      className={cx(
        'inline-flex items-center rounded-xs px-1.5 py-0.5 font-sans text-sm leading-none text-text',
        line === 'solid' && 'border border-solid border-text',
        line === 'dashed' && 'border border-dashed border-text-dim',
        line === 'bold' && 'border border-solid border-text font-semibold',
      )}
    >
      {children}
    </span>
  );
}
