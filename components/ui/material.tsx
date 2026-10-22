import type { HTMLAttributes, ReactNode } from 'react';
import {
  SITE_MATERIALS,
  materialAttributes,
  type MaterialTreatment,
} from '@/lib/brand-v2-materials';
import { cx } from '@/lib/utils';

type MaterialProps = HTMLAttributes<HTMLDivElement> & {
  treatment?: MaterialTreatment;
  children: ReactNode;
};

/**
 * A block that paints one registered material. Surfaces that already own an
 * element spread `materialAttributes()` and the material's class on it
 * instead of adding a wrapper (lib/brand-v2-materials.ts).
 */
export function Material({
  treatment = 'paper',
  className,
  children,
  ...props
}: MaterialProps) {
  return (
    <div
      {...materialAttributes(treatment)}
      className={cx(SITE_MATERIALS[treatment].className, className)}
      {...props}
    >
      {children}
    </div>
  );
}
