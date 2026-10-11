import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

type MaterialTreatment = 'paper';

type MaterialProps = HTMLAttributes<HTMLDivElement> & {
  treatment?: MaterialTreatment;
  children: ReactNode;
};

const materialClasses: Record<MaterialTreatment, string> = {
  paper: 'material-paper',
};

export function Material({
  treatment = 'paper',
  className,
  children,
  ...props
}: MaterialProps) {
  return (
    <div
      data-brand-material-id={`material:${treatment}`}
      data-brand-material-owned="owned"
      className={cx(materialClasses[treatment], className)}
      {...props}
    >
      {children}
    </div>
  );
}
