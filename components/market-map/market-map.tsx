'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import { formatLongDate } from '@/lib/dates';
import {
  DEFAULT_MARKET_MAP_FILTERS,
  MARKET_MAP_AS_OF,
  SEGMENT_ORDER,
  approachOptions,
  countryOptions,
  filterCompanies,
  hasActiveFilters,
  parseMarketMapSearch,
  segmentCounts,
  serializeMarketMapSearch,
  subSegmentOptions,
  type MarketMapFilters,
  type MarketMapViewId,
} from '@/lib/market-map';
import { useEntityAnchor } from '@/lib/use-entity-anchor';
import { BubbleView } from './bubble-view';
import { FilterBar } from './filter-bar';
import { FundingTimeline } from './funding-timeline';
import { GridView } from './grid-view';

type MarketMapProps = {
  companies: readonly Company[];
};

const searchListeners = new Set<() => void>();

function subscribeSearch(onStoreChange: () => void) {
  searchListeners.add(onStoreChange);
  window.addEventListener('popstate', onStoreChange);
  return () => {
    searchListeners.delete(onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

function getSearchSnapshot() {
  return window.location.search;
}

function getServerSearchSnapshot() {
  return '';
}

function writeSearch(view: MarketMapViewId, filters: MarketMapFilters) {
  if (typeof window === 'undefined') return;
  const query = serializeMarketMapSearch({ view, filters });
  const next = query ? `/market-map/?${query}` : '/market-map/';
  window.history.replaceState(null, '', next);
  searchListeners.forEach((listener) => listener());
}

export function MarketMap({ companies }: MarketMapProps) {
  const search = useSyncExternalStore(
    subscribeSearch,
    getSearchSnapshot,
    getServerSearchSnapshot,
  );
  const parsed = parseMarketMapSearch(search);
  const view = parsed.view;
  const filters = parsed.filters;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const highlightedId = useEntityAnchor('company');

  const visible = useMemo(
    () => filterCompanies(companies, filters),
    [companies, filters],
  );

  useEffect(() => {
    if (!highlightedId) return;
    const target = document.getElementById(`company-${highlightedId}`);
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [highlightedId, view, visible]);
  const counts = useMemo(() => segmentCounts(companies), [companies]);
  const segments = SEGMENT_ORDER.map((value) => ({
    value,
    count: counts[value],
  }));
  const subSegments = useMemo(
    () => subSegmentOptions(companies, filters.segment),
    [companies, filters.segment],
  );
  const countries = useMemo(() => countryOptions(companies), [companies]);
  const approaches = useMemo(() => approachOptions(companies), [companies]);
  const canClear = hasActiveFilters(filters);

  function applyFilters(next: MarketMapFilters) {
    writeSearch(view, next);
  }

  function patchFilters(patch: Partial<MarketMapFilters>) {
    applyFilters({ ...filters, ...patch });
  }

  function changeView(next: MarketMapViewId) {
    writeSearch(next, filters);
  }

  function clearFilters() {
    writeSearch(view, DEFAULT_MARKET_MAP_FILTERS);
  }

  return (
    <div>
      <FilterBar
        filters={filters}
        view={view}
        resultCount={visible.length}
        totalCount={companies.length}
        segments={segments}
        subSegments={subSegments}
        countries={countries}
        approaches={approaches}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        onFilterChange={patchFilters}
        onViewChange={changeView}
        onClear={clearFilters}
        canClear={canClear}
      />

      <p className="mt-4 font-sans text-sm text-text-dim">
        Funding figures are as of {formatLongDate(MARKET_MAP_AS_OF)}.
      </p>

      {visible.length === 0 ? (
        <div role="status" className="mt-8 border-t border-border pt-8">
          <p className="font-sans text-sm text-text">
            No companies match these filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 cursor-pointer font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
          >
            Clear filters
          </button>
        </div>
      ) : view === 'grid' ? (
        <GridView
          companies={visible}
          expandedId={expandedId}
          highlightedId={highlightedId}
          onToggle={(id) =>
            setExpandedId((current) => (current === id ? null : id))
          }
        />
      ) : view === 'bubble' ? (
        <BubbleView companies={visible} />
      ) : (
        <FundingTimeline companies={visible} />
      )}
    </div>
  );
}
