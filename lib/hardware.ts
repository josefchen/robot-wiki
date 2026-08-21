/**
 * Filter logic for the hardware buyer's guide
 * (components/interactive/hardware-guide.tsx). Pure and unit-tested in
 * tests/unit/hardware.test.ts.
 *
 * Filters are conjunctive and null-honest: a row with an unpublished figure
 * (null) never matches a numeric bucket, only the explicit "not disclosed" /
 * "not listed" options. Price buckets use the row's quoted (low-end) price,
 * so a $17,000-$32,000 ALOHA 2 lands in the $10k-$25k bucket.
 */
import type { HardwareEntry } from '@/data/schemas/hardware.ts';

export type CategoryFilter =
  | 'all'
  | 'arm'
  | 'humanoid'
  | 'hand'
  | 'sensor'
  | 'compute'
  | 'wheelbase'
  | 'lidar'
  | 'camera'
  | 'imu'
  | 'mobile-manipulator'
  | 'quadruped';

export type PriceFilter =
  | 'all'
  | 'under-1k'
  | '1k-10k'
  | '10k-25k'
  | '25k-plus'
  | 'unlisted';

export type DofFilter = 'all' | 'under-10' | '10-30' | '30-plus' | 'unknown';

export type AvailabilityFilter =
  | 'all'
  | 'buy'
  | 'preorder'
  | 'contact'
  | 'closed'
  | 'unknown';

export interface HardwareFilters {
  category: CategoryFilter;
  price: PriceFilter;
  dof: DofFilter;
  availability: AvailabilityFilter;
}

export const DEFAULT_HARDWARE_FILTERS: HardwareFilters = {
  category: 'all',
  price: 'all',
  dof: 'all',
  availability: 'all',
};

function matchesCategory(entry: HardwareEntry, category: CategoryFilter) {
  return category === 'all' || entry.category === category;
}

function matchesPrice(entry: HardwareEntry, price: PriceFilter): boolean {
  if (price === 'all') return true;
  if (price === 'unlisted') return entry.priceUsd === null;
  if (entry.priceUsd === null) return false;
  switch (price) {
    case 'under-1k':
      return entry.priceUsd < 1_000;
    case '1k-10k':
      return entry.priceUsd >= 1_000 && entry.priceUsd < 10_000;
    case '10k-25k':
      return entry.priceUsd >= 10_000 && entry.priceUsd < 25_000;
    case '25k-plus':
      return entry.priceUsd >= 25_000;
    default: {
      const _exhaustive: never = price;
      return _exhaustive;
    }
  }
}

function matchesDof(entry: HardwareEntry, dof: DofFilter): boolean {
  if (dof === 'all') return true;
  if (dof === 'unknown') return entry.dof === null;
  if (entry.dof === null) return false;
  switch (dof) {
    case 'under-10':
      return entry.dof < 10;
    case '10-30':
      return entry.dof >= 10 && entry.dof <= 30;
    case '30-plus':
      return entry.dof > 30;
    default: {
      const _exhaustive: never = dof;
      return _exhaustive;
    }
  }
}

function matchesAvailability(
  entry: HardwareEntry,
  availability: AvailabilityFilter,
): boolean {
  if (availability === 'all') return true;
  if (availability === 'unknown') return entry.availability === null;
  return entry.availability === availability;
}

/** Conjunctive filtering: every active filter must match. */
export function filterHardware(
  entries: readonly HardwareEntry[],
  filters: HardwareFilters,
): HardwareEntry[] {
  return entries.filter(
    (entry) =>
      matchesCategory(entry, filters.category) &&
      matchesPrice(entry, filters.price) &&
      matchesDof(entry, filters.dof) &&
      matchesAvailability(entry, filters.availability),
  );
}

/** "$17,000" or "$17,000-$32,000" when the source gives a range. */
export function formatPrice(entry: HardwareEntry): string | null {
  if (entry.priceUsd === null) return null;
  const low = entry.priceUsd.toLocaleString('en-US');
  if (entry.priceMaxUsd === null) return `$${low}`;
  return `$${low}-$${entry.priceMaxUsd.toLocaleString('en-US')}`;
}
