'use client';

import type { ChangeEvent, ReactNode } from 'react';
import {
  CONFIDENCE_LEVELS,
  SEGMENT_LABELS,
  STATUS_FILTERS,
  STATUS_LABELS,
  VIEW_IDS,
  formatApproach,
  formatSubSegment,
  type ConfidenceFilter,
  type MarketMapFilters,
  type MarketMapSegment,
  type MarketMapViewId,
  type OpenSourceFilter,
  type StatusFilter,
} from '@/lib/market-map';
import { cx } from '@/lib/utils';

const VIEW_LABELS: Record<MarketMapViewId, string> = {
  grid: 'Grid',
  bubble: 'Bubble',
  timeline: 'Timeline',
};

type FilterBarProps = {
  filters: MarketMapFilters;
  view: MarketMapViewId;
  resultCount: number;
  totalCount: number;
  segments: ReadonlyArray<{ value: MarketMapSegment; count: number }>;
  subSegments: readonly string[];
  countries: readonly string[];
  approaches: readonly string[];
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onFilterChange: (patch: Partial<MarketMapFilters>) => void;
  onViewChange: (view: MarketMapViewId) => void;
  onClear: () => void;
  canClear: boolean;
};

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-[9.5rem] flex-col gap-1">
      <label htmlFor={id} className="font-sans text-xs text-text-dim">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="rounded-sm border border-border bg-surface-2 px-2 py-1.5 font-mono text-xs text-text"
      >
        {children}
      </select>
    </div>
  );
}

export function FilterBar({
  filters,
  view,
  resultCount,
  totalCount,
  segments,
  subSegments,
  countries,
  approaches,
  filtersOpen,
  onFiltersOpenChange,
  onFilterChange,
  onViewChange,
  onClear,
  canClear,
}: FilterBarProps) {
  const fields = (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
      <SelectField
        id="filter-segment"
        label="Segment"
        value={filters.segment ?? ''}
        onChange={(event) =>
          onFilterChange({
            segment: (event.target.value || null) as MarketMapSegment | null,
            subSegment: null,
          })
        }
      >
        <option value="">All segments</option>
        {segments.map((segment) => (
          <option key={segment.value} value={segment.value}>
            {SEGMENT_LABELS[segment.value]} ({segment.count})
          </option>
        ))}
      </SelectField>

      <SelectField
        id="filter-subsegment"
        label="Sub-segment"
        value={filters.subSegment ?? ''}
        onChange={(event) =>
          onFilterChange({ subSegment: event.target.value || null })
        }
      >
        <option value="">All sub-segments</option>
        {subSegments.map((value) => (
          <option key={value} value={value}>
            {formatSubSegment(value)}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="filter-country"
        label="Country"
        value={filters.country ?? ''}
        onChange={(event) =>
          onFilterChange({ country: event.target.value || null })
        }
      >
        <option value="">All countries</option>
        {countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="filter-status"
        label="Stage / status"
        value={filters.status ?? ''}
        onChange={(event) =>
          onFilterChange({
            status: (event.target.value || null) as StatusFilter | null,
          })
        }
      >
        <option value="">All statuses</option>
        {STATUS_FILTERS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="filter-approach"
        label="Approach"
        value={filters.approach ?? ''}
        onChange={(event) =>
          onFilterChange({ approach: event.target.value || null })
        }
      >
        <option value="">All approaches</option>
        {approaches.map((value) => (
          <option key={value} value={value}>
            {formatApproach(value)}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="filter-opensource"
        label="Open source"
        value={filters.openSource ?? ''}
        onChange={(event) =>
          onFilterChange({
            openSource: (event.target.value || null) as OpenSourceFilter | null,
          })
        }
      >
        <option value="">All</option>
        <option value="yes">Has contributions</option>
        <option value="no">None listed</option>
      </SelectField>

      <SelectField
        id="filter-confidence"
        label="Confidence"
        value={filters.confidence ?? ''}
        onChange={(event) =>
          onFilterChange({
            confidence: (event.target.value ||
              null) as ConfidenceFilter | null,
          })
        }
      >
        <option value="">All levels</option>
        {CONFIDENCE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </SelectField>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="View"
          className="flex flex-wrap gap-1.5"
        >
          {VIEW_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={cx(
                'cursor-pointer rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                view === id
                  ? 'border-accent text-text'
                  : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
              )}
            >
              {VIEW_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <p
            aria-live="polite"
            data-result-count
            className="font-mono text-xs text-text-dim"
          >
            {resultCount} of {totalCount} companies
          </p>
          {canClear ? (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="market-map-filters"
          onClick={() => onFiltersOpenChange(!filtersOpen)}
          className="cursor-pointer rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-border-strong active:translate-y-[1px]"
        >
          {filtersOpen ? 'Close filters' : 'Filters'}
        </button>
      </div>

      <div
        id="market-map-filters"
        className={filtersOpen ? 'block' : 'max-md:hidden'}
      >
        {fields}
      </div>
    </div>
  );
}


