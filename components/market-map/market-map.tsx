'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { Company } from '@/data/schemas/company.ts';
import { formatLongDate } from '@/lib/dates';
import { cx } from '@/lib/utils';
import { parseEntityAnchor } from '@/lib/entity-anchor';
import {
  DEFAULT_MARKET_MAP_FILTERS,
  MARKET_MAP_AS_OF,
  SEGMENT_LABELS,
  SEGMENT_ORDER,
  approachOptions,
  countryOptions,
  filterCompanies,
  hasActiveFilters,
  parseMarketMapSearch,
  relaxFiltersForCompany,
  serializeMarketMapSearch,
  subSegmentOptions,
  type MarketMapFilters,
  type MarketMapViewId,
} from '@/lib/market-map';
import { BubbleView } from './bubble-view';
import { CompanySheet } from './company-sheet';
import { FilterBar } from './filter-bar';
import { FundingTimeline } from './funding-timeline';
import { GridView } from './grid-view';

type MarketMapProps = {
  companies: readonly Company[];
};

/*
 * The URL is the state: filters and the view live in the query (written
 * with replaceState, so they never stack history), and the open company is
 * the #company-<id> hash, the same anchor site search links to. Opening a
 * company pushes one history entry, so the browser's Back button closes the
 * details; switching to another company while they are open replaces it.
 */
const urlListeners = new Set<() => void>();

function subscribeUrl(onStoreChange: () => void) {
  urlListeners.add(onStoreChange);
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener('hashchange', onStoreChange);
  return () => {
    urlListeners.delete(onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener('hashchange', onStoreChange);
  };
}

function getUrlSnapshot() {
  return `${window.location.search}${window.location.hash}`;
}

function getServerUrlSnapshot() {
  return '';
}

function notifyUrl() {
  urlListeners.forEach((listener) => listener());
}

function marketMapUrl(view: MarketMapViewId, filters: MarketMapFilters, hash: string) {
  const query = serializeMarketMapSearch({ view, filters });
  return query ? `/market-map/?${query}${hash}` : `/market-map/${hash}`;
}

/**
 * Brings an element to the middle of the window unless it already shows
 * whole below the sticky site bar (the page's scroll padding).
 */
function reveal(element: Element) {
  if (typeof element.scrollIntoView !== 'function') return;
  const box = element.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (box.top >= top && box.bottom <= window.innerHeight) return;
  element.scrollIntoView({ block: 'center', inline: 'nearest' });
}

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function MarketMap({ companies }: MarketMapProps) {
  const url = useSyncExternalStore(subscribeUrl, getUrlSnapshot, getServerUrlSnapshot);
  const hashAt = url.indexOf('#');
  const search = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt);

  const parsed = parseMarketMapSearch(search, companies);
  const view = parsed.view;
  const filters = parsed.filters;

  const anchor = parseEntityAnchor(hash);
  const selected =
    anchor?.kind === 'company'
      ? (companies.find((company) => company.id === anchor.id) ?? null)
      : null;
  const selectedId = selected?.id ?? null;

  const visible = useMemo(() => filterCompanies(companies, filters), [companies, filters]);

  const [focusRequest, setFocusRequest] = useState(0);
  const [moreOpen, setMoreOpen] = useState<boolean | null>(null);
  // The element that opened the details, so closing can hand focus back.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const seenSelectionRef = useRef<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const previousSelectionRef = useRef<string | null>(null);
  // The history entry this map pushed for the open company, with the query
  // it was pushed under. Closing goes Back over it only while the query is
  // unchanged; after a filter change the entry below holds older filters,
  // so closing then drops the hash in place instead of undoing that change.
  // A selection that arrived with the page (a link, Back, Forward) has no
  // pushed entry and also closes in place.
  const pushedRef = useRef<{ search: string } | null>(null);

  const writeFilters = useCallback(
    (nextView: MarketMapViewId, next: MarketMapFilters) => {
      // Filter writes own the query; the open company's hash survives them.
      window.history.replaceState(null, '', marketMapUrl(nextView, next, window.location.hash));
      notifyUrl();
    },
    [],
  );

  // A company named in the URL is an explicit request. When it arrives
  // (a deep link, a search result, Back or Forward) and the URL's filters
  // exclude it, the filters it fails are dropped so its tile shows and is
  // scrolled to. Once seen, later filter changes may exclude it again.
  useEffect(() => {
    if (!selected) {
      seenSelectionRef.current = null;
      return;
    }
    if (seenSelectionRef.current === selected.id) return;
    const arrived = returnFocusRef.current === null;
    seenSelectionRef.current = selected.id;
    if (arrived) pendingScrollRef.current = selected.id;
    if (!visible.some((company) => company.id === selected.id)) {
      writeFilters(view, relaxFiltersForCompany(filters, selected));
    }
  }, [selected, visible, view, filters, writeFilters]);

  // Scroll an arriving company's tile or row into view once it renders.
  useEffect(() => {
    const id = pendingScrollRef.current;
    if (!id) return;
    // The chart has no element per company to scroll to; bring the chart
    // itself into view (the server-rendered page may have scrolled to the
    // grid tile of the same id before the chart replaced it).
    const target =
      view === 'bubble'
        ? document.querySelector<Element>('svg[data-bubble-selected], [data-bubble-chart]')
        : document.getElementById(`company-${id}`);
    if (!target) return;
    pendingScrollRef.current = null;
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  });

  const closeSelection = useCallback(() => {
    const pushed = pushedRef.current;
    pushedRef.current = null;
    if (pushed && pushed.search === window.location.search) {
      window.history.back();
      return;
    }
    window.history.replaceState(null, '', marketMapUrl(view, filters, ''));
    notifyUrl();
  }, [view, filters]);

  const select = useCallback(
    (id: string, trigger: HTMLElement | null) => {
      if (id === selectedId) {
        closeSelection();
        return;
      }
      returnFocusRef.current = trigger;
      const target = marketMapUrl(view, filters, `#company-${id}`);
      if (selectedId === null) {
        pushedRef.current = { search: new URL(target, window.location.href).search };
        window.history.pushState(null, '', target);
      } else {
        window.history.replaceState(null, '', target);
      }
      notifyUrl();
      setFocusRequest((count) => count + 1);
    },
    [selectedId, view, filters, closeSelection],
  );

  // Escape closes the details from anywhere on the page, except inside a
  // field, where it keeps its own meaning (clearing a search).
  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (isTextEntry(event.target)) return;
      event.preventDefault();
      closeSelection();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, closeSelection]);

  // When the details close (Escape, Close, Back), focus goes back to what
  // opened them, or to the company's tile, row or mark if that is gone, but
  // only when the closing left focus nowhere.
  //
  // Opening and closing the side sheet also narrows and widens the views,
  // which can carry what the reader chose, or where their focus is, out of
  // the window. This runs before paint so that element is back in view
  // when the new layout first shows.
  useLayoutEffect(() => {
    const previous = previousSelectionRef.current;
    previousSelectionRef.current = selectedId;
    if (previous === null && selectedId !== null) {
      if (returnFocusRef.current?.isConnected) reveal(returnFocusRef.current);
      return;
    }
    if (selectedId !== null || previous === null) return;
    // However it closed, no pushed entry is open any more.
    pushedRef.current = null;
    const opener = returnFocusRef.current;
    returnFocusRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) {
      reveal(active);
      return;
    }
    const fallback = document.querySelector<HTMLElement>(
      `[data-map-tile="${previous}"], [data-company-id="${previous}"] > button, circle[data-company-id="${previous}"]`,
    );
    const target = opener?.isConnected ? opener : fallback;
    if (!target) return;
    target.focus({ preventScroll: true });
    reveal(target);
  }, [selectedId]);

  // Segment counts under every other active filter, so a segment shows how
  // many companies choosing it would leave.
  const segments = useMemo(() => {
    const pool = filterCompanies(companies, { ...filters, segment: null, subSegment: null });
    return SEGMENT_ORDER.map((value) => ({
      value,
      label: SEGMENT_LABELS[value],
      count: pool.filter((company) => company.segment === value).length,
    }));
  }, [companies, filters]);
  const subSegments = useMemo(
    () => subSegmentOptions(companies, filters.segment),
    [companies, filters.segment],
  );
  const countries = useMemo(() => countryOptions(companies), [companies]);
  const approaches = useMemo(() => approachOptions(companies), [companies]);
  const moreActive = [
    filters.subSegment,
    filters.country,
    filters.status,
    filters.approach,
    filters.openSource,
    filters.confidence,
  ].filter((value) => value !== null).length;

  // Both Clear filters buttons leave the page once nothing is filtered, and
  // a removed control drops focus to the body. Focus moves first to the tab
  // the reset selects, so it is never lost.
  const allTabRef = useRef<HTMLButtonElement>(null);
  function clearFilters() {
    allTabRef.current?.focus();
    writeFilters(view, DEFAULT_MARKET_MAP_FILTERS);
  }

  const onSelect = (id: string, trigger: HTMLElement | null) => select(id, trigger);

  // Beside an open side sheet the controls and every view narrow to the
  // space left of it, so nothing the keyboard reaches sits under the
  // sheet: the charts redraw at any width and the map reflows its tiles.
  const besideSheet =
    'lg:max-w-[calc(100vw_-_440px_-_max(24px,(100vw_-_84rem)/2_+_24px)_-_32px)]';

  return (
    <div>
      <div className={cx(selected && besideSheet)}>
        <FilterBar
          filters={filters}
          view={view}
          resultCount={visible.length}
          totalCount={companies.length}
          segments={segments}
          subSegments={subSegments}
          countries={countries}
          approaches={approaches}
          moreOpen={moreOpen ?? moreActive > 0}
          moreActive={moreActive}
          onMoreOpenChange={setMoreOpen}
          onFilterChange={(patch) => writeFilters(view, { ...filters, ...patch })}
          onViewChange={(next) => writeFilters(next, filters)}
          onClear={clearFilters}
          canClear={hasActiveFilters(filters)}
          allTabRef={allTabRef}
        />

        <p
          data-as-of
          className="mt-6 max-w-[62ch] font-sans text-[13px] leading-5 text-text-dim"
        >
          Funding figures are as of {formatLongDate(MARKET_MAP_AS_OF)}.
          {view === 'grid'
            ? ' A tile shows the latest disclosed round, or its status once a company is no longer private.'
            : null}
        </p>
      </div>

      <div className={cx('mt-5', selected && besideSheet)}>
        {visible.length === 0 ? (
          <EmptyState filters={filters} onClear={clearFilters} />
        ) : view === 'grid' ? (
          <GridView
            companies={visible}
            selectedId={selectedId}
            besideSheet={selected !== null}
            onSelect={onSelect}
          />
        ) : view === 'bubble' ? (
          <BubbleView companies={visible} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <FundingTimeline companies={visible} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>

      {selected ? (
        <CompanySheet company={selected} focusRequest={focusRequest} onClose={closeSelection} />
      ) : null}
    </div>
  );
}

function EmptyState({
  filters,
  onClear,
}: {
  filters: MarketMapFilters;
  onClear: () => void;
}) {
  const scope = filters.segment ? ` in ${SEGMENT_LABELS[filters.segment]}` : '';
  const hint = filters.query
    ? `No company name${scope} starts with “${filters.query}”.`
    : `Nothing${scope} matches every filter at once.`;
  return (
    <div role="status" data-market-map-empty className="border-t border-border-strong pt-8 pb-16">
      <p className="font-display text-[18px] leading-6 text-text">No companies match these filters.</p>
      <p className="mt-1 font-sans text-[14px] leading-5 text-text-dim">{hint}</p>
      <button
        data-brand-control-id="control:secondary-action"
        type="button"
        onClick={onClear}
        className="mt-4 cursor-pointer border-b border-ink pt-1.5 pb-1 font-sans text-[14px] leading-5 text-text transition-colors hover:border-text-dim hover:text-text-dim"
      >
        Clear filters
      </button>
    </div>
  );
}
