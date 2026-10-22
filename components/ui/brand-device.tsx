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
  /**
   * The module that mounts this instance. Defaults to the registry row's
   * owner surface, so an instance never renders without an owner.
   */
  owner?: string;
  className?: string;
};

/**
 * The registry half of each device: its structural purpose and owner
 * surface, exactly as `contract/brand-v2-registries.json#gridDevices`
 * records them (scripts/brand-v2-census.ts writes that row set;
 * tests/unit/brand-device-registration.test.ts keeps the two equal). Every
 * rendered instance carries both, so the reference rubric's purposeful-device
 * anchor (contract/design-integrity.md §1.12) reads a purpose and an owner
 * off the device itself instead of finding a bare mark.
 */
export const DEVICE_REGISTRATION: Readonly<
  Record<Device, { structuralPurpose: string; ownerSurface: string }>
> = {
  'outer-rail': {
    structuralPurpose: 'content-frame-boundary',
    ownerSurface: 'shared-shell',
  },
  'active-interval-rail': {
    structuralPurpose: 'active-measured-interval',
    ownerSurface: 'shared-shell',
  },
  'section-rule': {
    structuralPurpose: 'section-start-or-apparatus-boundary',
    ownerSurface: 'shared-section',
  },
  'registration-cross': {
    structuralPurpose: 'real-layout-anchor',
    ownerSurface: 'registered-surface',
  },
  'dot-grid': {
    structuralPurpose: 'registered-grid-boundary',
    ownerSurface: 'instrument-or-index',
  },
};

/*
 * Research-page standard (owner decision of 2026-10-10, PANTHEON-SPEC.md):
 * every rail and rule is a 1px hairline in the --line token, the same rule
 * the page draws everywhere else, and a current state is a 1px ink rule,
 * never a thick or coloured accent bar. The registration cross keeps the
 * one muted accent, which is the registration colour (VAL-B2-COL-006).
 */
const deviceClasses: Record<Device, string> = {
  'outer-rail': 'border-l border-border',
  'active-interval-rail': 'border-l border-ink',
  'section-rule': 'border-t border-border',
  'registration-cross':
    'size-3 before:absolute before:left-1/2 before:top-0 before:h-full before:border-l before:border-registration after:absolute after:left-0 after:top-1/2 after:w-full after:border-t after:border-registration',
  'dot-grid': 'engineering-grid',
};

export function BrandDevice({
  device,
  anchorSelector,
  deviceEdge = 'left',
  anchorEdge = 'left',
  owner,
  className,
}: BrandDeviceProps) {
  const registration = DEVICE_REGISTRATION[device];
  return (
    <span
      aria-hidden="true"
      data-registration-device
      data-brand-device-id={`device:${device}`}
      data-brand-anchor-selector={anchorSelector}
      data-brand-device-edge={deviceEdge}
      data-brand-anchor-edge={anchorEdge}
      data-brand-motif={device}
      data-brand-purpose={registration.structuralPurpose}
      data-brand-owner={owner ?? registration.ownerSurface}
      className={cx(
        'pointer-events-none absolute block',
        deviceClasses[device],
        className,
      )}
    />
  );
}
