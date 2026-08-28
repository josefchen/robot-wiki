import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

export type SurfaceLevel = 'flat' | 'raised' | 'floating' | 'bounded-dark';

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: Extract<ElementType, 'div' | 'section' | 'aside' | 'figure'>;
  level?: SurfaceLevel;
  children: ReactNode;
};

const surfaceIds: Record<SurfaceLevel, string> = {
  flat: 'surface:flat',
  raised: 'surface:raised',
  floating: 'surface:floating',
  'bounded-dark': 'surface:bounded-dark-instrument',
};

const surfaceClasses: Record<SurfaceLevel, string> = {
  flat: 'bg-surface text-text',
  raised:
    'rounded-md border border-border bg-surface text-text shadow-raised',
  floating:
    'rounded-md border border-border bg-surface text-text shadow-floating',
  'bounded-dark':
    'rounded-sm border border-graphite bg-instrument text-on-instrument',
};

export function Surface({
  as: Component = 'div',
  level = 'flat',
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <Component
      data-brand-surface-id={surfaceIds[level]}
      data-brand-surface-level={level}
      className={cx(surfaceClasses[level], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
