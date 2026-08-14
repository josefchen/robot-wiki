'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Table, type Column } from '@/components/ui';
import { HARDWARE } from '@/data/hardware';
import type { HardwareEntry } from '@/data/schemas/hardware';
import {
  DEFAULT_HARDWARE_FILTERS,
  filterHardware,
  formatPrice,
  type AvailabilityFilter,
  type CategoryFilter,
  type DofFilter,
  type HardwareFilters,
  type PriceFilter,
} from '@/lib/hardware';
import { cx } from '@/lib/utils';

/**
 * HardwareGuide: a filterable buyer's guide across arms, humanoids, hands,
 * tactile sensors, and edge compute (VAL-DATA-011 through VAL-DATA-016).
 *
 * Honesty rules: figures a source does not publish render as "not
 * disclosed" (dim) and never as invented numbers, and every listed price
 * carries an explicit as-of date because hardware pricing moves fast.
 * Price buckets use the low end of a range.
 *
 * Interactive contract: deterministic render, keyboard-operable filter
 * buttons and sort headers (aria-pressed / aria-sort), a visible row-count
 * readout, a reset control, an explicit empty state with a clear-filter
 * affordance, and horizontal scroll inside its own container at 375px.
 */

const NOT_DISCLOSED: ReactNode = (
  <span className="text-text-dim">not disclosed</span>
);

const CATEGORY_LABELS: Record<HardwareEntry['category'], string> = {
  arm: 'Arm',
  humanoid: 'Humanoid',
  hand: 'Hand',
  sensor: 'Sensor',
  compute: 'Compute',
};

const AVAILABILITY_LABELS: Record<
  NonNullable<HardwareEntry['availability']>,
  string
> = {
  buy: 'Orderable',
  preorder: 'Preorder',
  contact: 'Contact sales',
  closed: 'Not for sale',
};

function nameCell(entry: HardwareEntry): ReactNode {
  return (
    <span>
      <span className="text-text">{entry.name}</span>
      <span className="block text-xs text-text-dim">{entry.maker}</span>
    </span>
  );
}

function priceCell(entry: HardwareEntry): ReactNode {
  const price = formatPrice(entry);
  if (price === null) return NOT_DISCLOSED;
  return (
    <span className="font-mono tabular-nums">
      {price}
      <span className="block font-sans text-xs text-text-dim">
        as of {entry.priceAsOf}
        {entry.priceNote ? ` · ${entry.priceNote}` : ''}
      </span>
    </span>
  );
}

function dofCell(entry: HardwareEntry): ReactNode {
  if (entry.dof === null) return NOT_DISCLOSED;
  return (
    <span className="font-mono tabular-nums">
      {entry.dof}
      {entry.dofNote ? (
        <span className="block font-sans text-xs text-text-dim">
          {entry.dofNote}
        </span>
      ) : null}
    </span>
  );
}

function availabilityCell(entry: HardwareEntry): ReactNode {
  if (entry.availability === null) {
    return (
      <span>
        {NOT_DISCLOSED}
        {entry.availabilityNote ? (
          <span className="block text-xs text-text-dim">
            {entry.availabilityNote}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span>
      <span>{AVAILABILITY_LABELS[entry.availability]}</span>
      {entry.availabilityNote ? (
        <span className="block text-xs text-text-dim">
          {entry.availabilityNote}
        </span>
      ) : null}
    </span>
  );
}

function sourceCell(entry: HardwareEntry): ReactNode {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener"
      className="font-mono text-xs text-accent underline-offset-2 hover:underline"
    >
      {new URL(entry.url).host}
    </a>
  );
}

const COLUMNS: Column<HardwareEntry>[] = [
  { key: 'name', header: 'Entry', sortable: true, render: nameCell },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    render: (entry) => CATEGORY_LABELS[entry.category],
  },
  {
    key: 'priceUsd',
    header: 'Price (USD)',
    sortable: true,
    numeric: true,
    sortValue: (entry) => entry.priceUsd,
    render: priceCell,
  },
  {
    key: 'dof',
    header: 'DoF',
    sortable: true,
    numeric: true,
    sortValue: (entry) => entry.dof,
    render: dofCell,
  },
  { key: 'availability', header: 'Availability', render: availabilityCell },
  {
    key: 'highlight',
    header: 'Distinction',
    render: (entry) => entry.highlight ?? NOT_DISCLOSED,
  },
  { key: 'url', header: 'Source', render: sourceCell },
];

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'arm', label: 'Arms' },
  { value: 'humanoid', label: 'Humanoids' },
  { value: 'hand', label: 'Hands' },
  { value: 'sensor', label: 'Sensors' },
  { value: 'compute', label: 'Compute' },
];

const PRICE_OPTIONS: Array<{ value: PriceFilter; label: string }> = [
  { value: 'all', label: 'All prices' },
  { value: 'under-1k', label: 'Under $1k' },
  { value: '1k-10k', label: '$1k-$10k' },
  { value: '10k-25k', label: '$10k-$25k' },
  { value: '25k-plus', label: '$25k and up' },
  { value: 'unlisted', label: 'No listed price' },
];

const DOF_OPTIONS: Array<{ value: DofFilter; label: string }> = [
  { value: 'all', label: 'Any DoF' },
  { value: 'under-10', label: 'Under 10' },
  { value: '10-30', label: '10-30' },
  { value: '30-plus', label: '30+' },
  { value: 'unknown', label: 'Not disclosed' },
];

const AVAILABILITY_OPTIONS: Array<{
  value: AvailabilityFilter;
  label: string;
}> = [
  { value: 'all', label: 'Any availability' },
  { value: 'buy', label: 'Orderable' },
  { value: 'preorder', label: 'Preorder' },
  { value: 'contact', label: 'Contact sales' },
  { value: 'closed', label: 'Not for sale' },
  { value: 'unknown', label: 'Not listed' },
];

const filterButtonClasses = (active: boolean) =>
  cx(
    'cursor-pointer rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
    active
      ? 'border-accent text-text'
      : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
  );

type FilterGroupProps<T extends string> = {
  label: string;
  options: Array<{ value: T; label: string }>;
  active: T;
  onSelect: (value: T) => void;
};

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
}: FilterGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1">
      <span className="font-sans text-xs text-text-dim">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={active === option.value}
            onClick={() => onSelect(option.value)}
            className={filterButtonClasses(active === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type HardwareGuideProps = {
  className?: string;
};

export function HardwareGuide({ className }: HardwareGuideProps) {
  const [filters, setFilters] = useState<HardwareFilters>(
    DEFAULT_HARDWARE_FILTERS,
  );
  // Remounting the table restores its internal initial sort on reset.
  const [resetCount, setResetCount] = useState(0);

  const rows = useMemo(() => filterHardware(HARDWARE, filters), [filters]);

  function patchFilters(patch: Partial<HardwareFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_HARDWARE_FILTERS);
  }

  function reset() {
    setFilters(DEFAULT_HARDWARE_FILTERS);
    setResetCount((count) => count + 1);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <FilterGroup
          label="Filter by category"
          options={CATEGORY_OPTIONS}
          active={filters.category}
          onSelect={(category) => patchFilters({ category })}
        />
        <FilterGroup
          label="Filter by price"
          options={PRICE_OPTIONS}
          active={filters.price}
          onSelect={(price) => patchFilters({ price })}
        />
        <FilterGroup
          label="Filter by DoF"
          options={DOF_OPTIONS}
          active={filters.dof}
          onSelect={(dof) => patchFilters({ dof })}
        />
        <FilterGroup
          label="Filter by availability"
          options={AVAILABILITY_OPTIONS}
          active={filters.availability}
          onSelect={(availability) => patchFilters({ availability })}
        />

        <div className="ml-auto flex items-center gap-3">
          <p aria-live="polite" className="font-mono text-xs text-text-dim">
            {rows.length} of {HARDWARE.length} entries
          </p>
          <button
            data-pagefind-ignore
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          role="status"
          className="mt-4 rounded-sm border border-dashed border-border bg-surface-2 px-4 py-6 text-center"
        >
          <p className="font-sans text-sm text-text">
            No hardware matches these filters.
          </p>
          <p className="mt-1 font-sans text-xs text-text-dim">
            Entries without a listed price only match the No listed price
            option; try widening the selection.
          </p>
          <button
            data-pagefind-ignore
            type="button"
            onClick={clearFilters}
            className="mt-3 cursor-pointer rounded-sm border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-border-strong active:translate-y-[1px]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <Table
          key={resetCount}
          className="mt-4"
          caption={`${HARDWARE.length} hardware entries across arms, humanoids, hands, sensors, and compute. Figures a source does not publish are marked not disclosed and always sort last; every listed price carries an as-of date. Price buckets use the low end of a range.`}
          columns={COLUMNS}
          rows={rows}
          initialSort={{ key: 'category', direction: 'asc' }}
        />
      )}
    </div>
  );
}
