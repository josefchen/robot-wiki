'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  CONFIDENCE_LEVELS,
  MARKET_MAP_QUERY_MAX,
  STATUS_FILTERS,
  STATUS_LABELS,
  VIEW_IDS,
  formatApproach,
  formatSubSegment,
  normalizeQuery,
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
  /** Each segment with the count choosing it would leave. */
  segments: ReadonlyArray<{ value: MarketMapSegment; label: string; count: number }>;
  subSegments: readonly string[];
  countries: readonly string[];
  approaches: readonly string[];
  moreOpen: boolean;
  /** How many of the folded filters are set. */
  moreActive: number;
  onMoreOpenChange: (open: boolean) => void;
  onFilterChange: (patch: Partial<MarketMapFilters>) => void;
  onViewChange: (view: MarketMapViewId) => void;
  onClear: () => void;
  canClear: boolean;
};

/** A text tab: ink with a 1 px rule when on, muted when off (no pills). */
function tabClass(on: boolean) {
  return cx(
    'shrink-0 cursor-pointer border-b py-1.5 font-sans text-[14px] leading-5 whitespace-nowrap transition-colors duration-150',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
    on
      ? 'border-ink text-text'
      : 'border-transparent text-text-dim hover:border-border-strong hover:text-text',
  );
}

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
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="font-sans text-[13px] leading-4 text-text-dim">
        {label}
      </label>
      <div className="relative">
        <select
          data-brand-control-id="control:input"
          id={id}
          value={value}
          onChange={onChange}
          className={cx(
            'h-8 w-full min-w-0 cursor-pointer appearance-none border-0 border-b bg-transparent pr-5 pl-0 font-sans text-[14px] text-text',
            'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
            value ? 'border-ink' : 'border-border-strong',
          )}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="pointer-events-none absolute top-1/2 right-0.5 h-1.5 w-2.5 -translate-y-1/2 text-text-dim"
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

/**
 * One quiet control row: the six segments as text tabs, a name search, a
 * fold for the six finer filters, the count of matching companies (read
 * out as it changes) and the three views. Every control writes the URL.
 */
export function FilterBar({
  filters,
  view,
  resultCount,
  totalCount,
  segments,
  subSegments,
  countries,
  approaches,
  moreOpen,
  moreActive,
  onMoreOpenChange,
  onFilterChange,
  onViewChange,
  onClear,
  canClear,
}: FilterBarProps) {
  const searchId = useId();
  const foldId = useId();
  // The field keeps exactly what the reader typed; the URL keeps the
  // normalized query. A new query from outside (Back, Clear) resets it.
  const [draft, setDraft] = useState(filters.query ?? '');
  const [synced, setSynced] = useState(filters.query);
  if (synced !== filters.query) {
    setSynced(filters.query);
    if (normalizeQuery(draft) !== filters.query) setDraft(filters.query ?? '');
  }
  const allCount = segments.reduce((sum, segment) => sum + segment.count, 0);
  // On a phone the segment tabs scroll sideways; keep the chosen one in view
  // (a link can arrive with the last segment chosen).
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const start = tab.offsetLeft - row.offsetLeft;
    const end = start + tab.offsetWidth;
    if (start < row.scrollLeft || end > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, start - 24);
    }
  }, [filters.segment]);

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={tabsRef}
        role="group"
        aria-label="Segment"
        className="-mx-6 flex gap-x-6 overflow-x-auto border-b border-border px-6 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        <button
          type="button"
          data-brand-control-id="control:selection"
          aria-pressed={filters.segment === null}
          onClick={() => onFilterChange({ segment: null, subSegment: null })}
          className={cx(tabClass(filters.segment === null), '-mb-px')}
        >
          All <span className="tabular-nums text-text-dim">{allCount}</span>
        </button>
        {segments.map((segment) => {
          const on = filters.segment === segment.value;
          return (
            <button
              key={segment.value}
              type="button"
              data-brand-control-id="control:selection"
              aria-pressed={on}
              onClick={() =>
                onFilterChange({ segment: on ? null : segment.value, subSegment: null })
              }
              className={cx(tabClass(on), '-mb-px')}
            >
              {segment.label} <span className="tabular-nums text-text-dim">{segment.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative w-full sm:w-64">
          <label htmlFor={searchId} className="sr-only">
            Search companies by name
          </label>
          <input
            id={searchId}
            type="search"
            data-brand-control-id="control:input"
            data-market-map-search
            value={draft}
            maxLength={MARKET_MAP_QUERY_MAX}
            placeholder="Search companies"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setDraft(event.target.value);
              onFilterChange({ query: normalizeQuery(event.target.value) });
            }}
            className={cx(
              'h-9 w-full border-0 border-b bg-transparent px-0 font-sans text-[14px] text-text placeholder:text-text-dim',
              'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
              filters.query ? 'border-ink' : 'border-border-strong',
            )}
          />
        </div>

        <button
          type="button"
          data-brand-control-id="control:secondary-action"
          aria-expanded={moreOpen}
          aria-controls={foldId}
          onClick={() => onMoreOpenChange(!moreOpen)}
          className="flex cursor-pointer items-center gap-1.5 py-1.5 font-sans text-[14px] leading-5 text-text transition-colors hover:text-text-dim focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          More filters
          {moreActive > 0 ? (
            <span className="tabular-nums text-text-dim">({moreActive})</span>
          ) : null}
          <svg
            aria-hidden="true"
            viewBox="0 0 10 6"
            className={cx('h-1.5 w-2.5 transition-transform duration-150', moreOpen && 'rotate-180')}
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        <p
          aria-live="polite"
          data-result-count
          className="font-sans text-[14px] leading-5 tabular-nums text-text-dim"
        >
          {resultCount} of {totalCount} companies
        </p>

        {canClear ? (
          <button
            data-brand-control-id="control:secondary-action"
            type="button"
            onClick={onClear}
            className="cursor-pointer border-b border-border-strong pt-1.5 pb-1 font-sans text-[14px] leading-5 text-text transition-colors hover:border-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Clear filters
          </button>
        ) : null}

        <div role="group" aria-label="View" className="flex w-full gap-x-5 sm:ml-auto sm:w-auto">
          {VIEW_IDS.map((id) => (
            <button
              data-brand-control-id="control:selection"
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={tabClass(view === id)}
            >
              {VIEW_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div
        id={foldId}
        hidden={!moreOpen}
        className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        <SelectField
          id="filter-subsegment"
          label="Sub-segment"
          value={filters.subSegment ?? ''}
          onChange={(event) => onFilterChange({ subSegment: event.target.value || null })}
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
          onChange={(event) => onFilterChange({ country: event.target.value || null })}
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
            onFilterChange({ status: (event.target.value || null) as StatusFilter | null })
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
          onChange={(event) => onFilterChange({ approach: event.target.value || null })}
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
              confidence: (event.target.value || null) as ConfidenceFilter | null,
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
    </div>
  );
}
