'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Table, type Column } from '@/components/ui';
import { DATASETS, type Dataset } from '@/data/datasets';
import { entityAnchorId } from '@/lib/entity-anchor';
import { useEntityAnchor } from '@/lib/use-entity-anchor';
import {
  DEFAULT_DATASET_FILTERS,
  filterDatasets,
  type DatasetFilters,
  type EmbodimentFilter,
  type SizeFilter,
  type TaskFilter,
} from '@/lib/datasets';
import { cx } from '@/lib/utils';

/**
 * DatasetTable: the major open robot-manipulation datasets as a filterable,
 * sortable comparison table.
 *
 * Honesty rules: figures the source does not
 * publish render as "not disclosed" (dim) and never as invented numbers,
 * null cells always sort last in both directions, and every row links out
 * to its dataset site or paper. Estimates live in the module prose, not in
 * cells.
 *
 * Interactive contract: deterministic render, keyboard-operable filter
 * buttons and sort headers (aria-pressed / aria-sort), a visible row-count
 * readout, a reset control, an explicit empty state with a clear-filter
 * affordance, and horizontal scroll inside its own container at 375px.
 */

const NOT_DISCLOSED: ReactNode = (
  <span className="text-text-dim">not disclosed</span>
);

/** Thousands-grouped count; the Table default deliberately skips grouping. */
function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function countCell(value: number | null, note?: string): ReactNode {
  if (value === null) return NOT_DISCLOSED;
  return (
    <span className="font-mono tabular-nums">
      {formatCount(value)}
      {note ? (
        <span className="block font-sans text-xs text-text-dim">{note}</span>
      ) : null}
    </span>
  );
}

function embodimentsCell(dataset: Dataset): ReactNode {
  const label =
    dataset.embodimentCount === 1
      ? '1 platform'
      : `${dataset.embodimentCount} platforms`;
  return (
    <span>
      <span className="font-mono tabular-nums">{label}</span>
      <span className="block text-xs text-text-dim">
        {dataset.embodiments.join(', ')}
      </span>
    </span>
  );
}

function sourceCell(dataset: Dataset): ReactNode {
  return (
    <a
      href={dataset.url}
      target="_blank"
      rel="noopener"
      className="font-mono text-xs text-accent underline-offset-2 hover:underline"
    >
      {new URL(dataset.url).host}
    </a>
  );
}

const COLUMNS: Column<Dataset>[] = [
  { key: 'name', header: 'Dataset', sortable: true },
  { key: 'year', header: 'Year', sortable: true, numeric: true },
  {
    key: 'episodes',
    header: 'Episodes',
    sortable: true,
    numeric: true,
    sortValue: (row) => row.episodes,
    render: (row) => countCell(row.episodes, row.episodesNote),
  },
  {
    key: 'hours',
    header: 'Hours',
    sortable: true,
    numeric: true,
    sortValue: (row) => row.hours,
    render: (row) => countCell(row.hours, row.hoursNote),
  },
  {
    key: 'tasks',
    header: 'Tasks',
    sortable: true,
    numeric: true,
    sortValue: (row) => row.tasks,
    render: (row) => countCell(row.tasks, row.tasksNote),
  },
  {
    key: 'scenes',
    header: 'Scenes',
    sortable: true,
    numeric: true,
    sortValue: (row) => row.scenes,
    render: (row) => countCell(row.scenes),
  },
  {
    key: 'embodimentCount',
    header: 'Embodiments',
    sortable: true,
    sortValue: (row) => row.embodimentCount,
    render: embodimentsCell,
  },
  {
    key: 'license',
    header: 'License',
    render: (row) => row.license ?? NOT_DISCLOSED,
  },
  {
    key: 'url',
    header: 'Source',
    render: sourceCell,
  },
];

const SIZE_OPTIONS: Array<{ value: SizeFilter; label: string }> = [
  { value: 'all', label: 'All sizes' },
  { value: 'under-100k', label: 'Under 100k episodes' },
  { value: '100k-1m', label: '100k-1M episodes' },
  { value: '1m-plus', label: '1M+ episodes' },
  { value: 'unknown', label: 'Unknown size' },
];

const EMBODIMENT_OPTIONS: Array<{ value: EmbodimentFilter; label: string }> = [
  { value: 'all', label: 'All platforms' },
  { value: 'single', label: 'Single platform' },
  { value: 'multi', label: 'Multi-platform' },
];

const TASK_OPTIONS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: 'All task counts' },
  { value: 'under-100', label: 'Under 100 tasks' },
  { value: '100-1k', label: '100-1,000 tasks' },
  { value: '1k-plus', label: '1,000+ tasks' },
  { value: 'unknown', label: 'Unknown count' },
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

type DatasetTableProps = {
  className?: string;
};

export function DatasetTable({ className }: DatasetTableProps) {
  const [filters, setFilters] = useState<DatasetFilters>(
    DEFAULT_DATASET_FILTERS,
  );
  // Remounting the table restores its internal initial sort on reset.
  const [resetCount, setResetCount] = useState(0);
  const highlightedId = useEntityAnchor('dataset');
  const highlightedAnchor = highlightedId
    ? entityAnchorId('dataset', highlightedId)
    : null;

  const rows = useMemo(() => filterDatasets(DATASETS, filters), [filters]);

  function patchFilters(patch: Partial<DatasetFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_DATASET_FILTERS);
  }

  function reset() {
    setFilters(DEFAULT_DATASET_FILTERS);
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
          label="Filter by size"
          options={SIZE_OPTIONS}
          active={filters.size}
          onSelect={(size) => patchFilters({ size })}
        />
        <FilterGroup
          label="Filter by embodiment"
          options={EMBODIMENT_OPTIONS}
          active={filters.embodiment}
          onSelect={(embodiment) => patchFilters({ embodiment })}
        />
        <FilterGroup
          label="Filter by task count"
          options={TASK_OPTIONS}
          active={filters.tasks}
          onSelect={(tasks) => patchFilters({ tasks })}
        />

        <div className="ml-auto flex items-center gap-3">
          <p aria-live="polite" className="font-mono text-xs text-text-dim">
            {rows.length} of {DATASETS.length} datasets
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
            No datasets match these filters.
          </p>
          <p className="mt-1 font-sans text-xs text-text-dim">
            Rows with unpublished figures only match the Unknown filter
            options; try widening the selection.
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
          caption={`${DATASETS.length} open robot-manipulation datasets. Figures the source does not publish are marked not disclosed and always sort last, in both directions; estimates appear in the prose, never in cells. Every row links to its dataset site or paper.`}
          columns={COLUMNS}
          rows={rows}
          initialSort={{ key: 'episodes', direction: 'desc' }}
          rowAnchor={(row) => entityAnchorId('dataset', row.id)}
          highlightedAnchor={highlightedAnchor}
        />
      )}
    </div>
  );
}
