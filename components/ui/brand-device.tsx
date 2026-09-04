import { cx } from '@/lib/utils';

type Device =
  | 'outer-rail'
  | 'active-interval-rail'
  | 'section-rule'
  | 'registration-cross'
  | 'dot-grid';

type BrandDeviceProps = {
  device: Device;
  anchorSelector: string;
  deviceEdge?: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';
  anchorEdge?: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';
  className?: string;
};

const deviceClasses: Record<Device, string> = {
  'outer-rail': 'border-l border-concrete',
  // Section 6.2 of the design system reserves lime on a rail for an active
  // measured interval, which is what the current route is inside the
  // taxonomy sequence. Concrete and ink stay with the structural rails.
  'active-interval-rail': 'border-l-[3px] border-selection',
  'section-rule': 'border-t border-concrete',
  'registration-cross':
    'size-3 before:absolute before:left-1/2 before:top-0 before:h-full before:border-l before:border-registration after:absolute after:left-0 after:top-1/2 after:w-full after:border-t after:border-registration',
  'dot-grid': 'engineering-grid',
};

export function BrandDevice({
  device,
  anchorSelector,
  deviceEdge = 'left',
  anchorEdge = 'left',
  className,
}: BrandDeviceProps) {
  return (
    <span
      aria-hidden="true"
      data-registration-device
      data-brand-device-id={`device:${device}`}
      data-brand-anchor-selector={anchorSelector}
      data-brand-device-edge={deviceEdge}
      data-brand-anchor-edge={anchorEdge}
      data-brand-motif={device}
      className={cx(
        'pointer-events-none absolute block',
        deviceClasses[device],
        className,
      )}
    />
  );
}
