'use client';

import { useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  SEGMENT_LABELS,
  SEGMENT_ORDER,
  companyShortName,
  isMapArrowKey,
  planMapColumns,
  stepTile,
  tileFact,
} from '@/lib/market-map';
import { cx } from '@/lib/utils';
import { CompanyLogo } from './company-logo';
import { SHEET_ID } from './company-sheet';

type GridViewProps = {
  companies: readonly Company[];
  /** The company whose details are open (the #company-<id> in the URL). */
  selectedId: string | null;
  /**
   * The details are open. From 1024 px they are a side sheet and the map
   * has only the width left of it.
   */
  besideSheet: boolean;
  onSelect: (id: string, trigger: HTMLElement) => void;
};

/** Grid tracks of the widest layout (1280 px and up). */
const MAP_TRACKS = 7;

/**
 * With the page's width the map picks columns or bands by the viewport.
 * Beside the side sheet it picks by its own width instead: columns from
 * 77rem, the width it has at the 1280 px breakpoint, and below that bands
 * of as many tiles abreast as fit at about the width of a column track.
 * Under 1024 px the details are a modal over the page and the two layouts
 * are the same. Each variant names one condition per width, so no class
 * relies on stylesheet order to win.
 */
const LAYOUT = {
  full: {
    root: undefined,
    map: 'grid grid-cols-1 gap-y-9 xl:grid-cols-7 xl:items-start xl:gap-x-5',
    column:
      'contents xl:flex xl:min-w-0 xl:flex-col xl:gap-y-9 xl:[grid-column:span_var(--map-span)/span_var(--map-span)]',
    heading: 'xl:min-h-[3.25rem]',
    tiles:
      'grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:[grid-template-columns:repeat(var(--map-span),minmax(0,1fr))]',
  },
  beside: {
    root: '@container',
    map: 'grid grid-cols-1 gap-y-9 @min-[77rem]:grid-cols-7 @min-[77rem]:items-start @min-[77rem]:gap-x-5',
    column:
      'contents @min-[77rem]:flex @min-[77rem]:min-w-0 @min-[77rem]:flex-col @min-[77rem]:gap-y-9 @min-[77rem]:[grid-column:span_var(--map-span)/span_var(--map-span)]',
    heading: '@min-[77rem]:min-h-[3.25rem]',
    tiles:
      'grid grid-cols-2 gap-x-4 sm:max-md:grid-cols-3 md:max-lg:grid-cols-4 lg:@max-[77rem]:[grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] @min-[77rem]:[grid-template-columns:repeat(var(--map-span),minmax(0,1fr))]',
  },
} as const;

/**
 * The map: the six segments side by side at desktop width, each a column
 * of compact company tiles (mark, name and one quiet fact), A to Z. A
 * segment with many companies takes more than one column, so the whole
 * landscape sits in about one screen. Below 1280 px the segments stack as
 * bands, and on phones each band is two tiles wide. While the details are
 * open beside it the map reflows into the width left of them, so no tile
 * sits under the sheet.
 *
 * The tiles are one tab stop (roving tabindex): arrow keys move between
 * them (lib/market-map.ts stepTile), Enter or Space opens the company's
 * details, which is the same selection the bubble chart and the timeline
 * make, held in the URL hash.
 */
export function GridView({ companies, selectedId, besideSheet, onSelect }: GridViewProps) {
  const layout = besideSheet ? LAYOUT.beside : LAYOUT.full;
  const hintId = useId();
  const mapRef = useRef<HTMLDivElement>(null);
  const [rovingStopId, setRovingStopId] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      SEGMENT_ORDER.map((segment) => ({
        segment,
        companies: companies
          .filter((company) => company.segment === segment)
          .sort((a, b) =>
            companyShortName(a.name).localeCompare(companyShortName(b.name), 'en', {
              sensitivity: 'base',
            }),
          ),
      })),
    [companies],
  );
  const columns = useMemo(
    () => planMapColumns(groups.map((group) => group.companies.length), MAP_TRACKS),
    [groups],
  );
  const ordered = columns.flatMap((column) =>
    column.segments.flatMap((index) => groups[index].companies.map((company) => company.id)),
  );
  // Exactly one tile is tabbable: the last one focused while it is still on
  // the map, else the open company's tile, else the first.
  const rovingId =
    (rovingStopId && ordered.includes(rovingStopId) ? rovingStopId : null) ??
    (selectedId && ordered.includes(selectedId) ? selectedId : null) ??
    ordered[0] ??
    null;

  function moveFocus(fromId: string, key: Parameters<typeof stepTile>[2]) {
    const root = mapRef.current;
    if (!root) return;
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-map-tile]')];
    const boxes = buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        id: button.dataset.mapTile ?? '',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    const next = stepTile(boxes, fromId, key);
    if (next === fromId) return;
    setRovingStopId(next);
    buttons.find((button) => button.dataset.mapTile === next)?.focus();
  }

  return (
    <div ref={mapRef} className={layout.root}>
      <p id={hintId} className="sr-only">
        Arrow keys move between companies. Enter opens a company&apos;s details.
      </p>
      <div
        role="group"
        aria-label="Market map"
        aria-describedby={hintId}
        className={layout.map}
      >
        {columns.map((column) => (
          // A column is a layout box only at the widest size; below it the
          // segments stack as full-width bands.
          <div
            key={column.segments.join('-')}
            data-map-column={column.span}
            className={layout.column}
            style={{ '--map-span': column.span } as CSSProperties}
          >
            {column.segments.map((index) => {
              const { segment, companies: group } = groups[index];
              return (
                <section
                  key={segment}
                  aria-labelledby={`segment-${segment}`}
                  data-segment={segment}
                  className="min-w-0"
                >
                  <h2
                    id={`segment-${segment}`}
                    className={cx(
                      'flex items-end justify-between gap-3 border-b border-border-strong pb-2 font-display text-[14px] leading-5 font-semibold tracking-[-0.005em] text-text',
                      layout.heading,
                    )}
                  >
                    <span>{SEGMENT_LABELS[segment]}</span>
                    <span className="font-sans text-[13px] font-normal tabular-nums text-text-dim">
                      {group.length}
                    </span>
                  </h2>
                  <ul className={layout.tiles}>
                    {group.map((company) => (
                      <MapTile
                        key={company.id}
                        company={company}
                        selected={company.id === selectedId}
                        tabbable={company.id === rovingId}
                        onSelect={onSelect}
                        onFocus={() => setRovingStopId(company.id)}
                        onArrow={(key) => moveFocus(company.id, key)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapTile({
  company,
  selected,
  tabbable,
  onSelect,
  onFocus,
  onArrow,
}: {
  company: Company;
  selected: boolean;
  tabbable: boolean;
  onSelect: (id: string, trigger: HTMLElement) => void;
  onFocus: () => void;
  onArrow: (key: Parameters<typeof stepTile>[2]) => void;
}) {
  const fact = tileFact(company);
  return (
    <li
      id={`company-${company.id}`}
      data-company-id={company.id}
      className="min-w-0 scroll-mt-28"
    >
      <button
        type="button"
        data-map-tile={company.id}
        data-brand-control-id="control:selection"
        tabIndex={tabbable ? 0 : -1}
        aria-label={`${company.name}, ${fact.label}`}
        aria-haspopup="dialog"
        aria-expanded={selected}
        aria-controls={selected ? SHEET_ID : undefined}
        onClick={(event) => onSelect(company.id, event.currentTarget)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (!isMapArrowKey(event.key)) return;
          event.preventDefault();
          onArrow(event.key);
        }}
        // Selected reads as ink weight on a 1 px ink rule, never a fill; the
        // rule is always present (transparent when unselected) so selecting
        // a tile does not move it.
        className={cx(
          'flex w-full cursor-pointer flex-col items-start gap-[5px] border-l py-[7px] pr-1.5 pl-2 text-left transition-colors duration-150',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-ink',
          selected ? 'border-l-ink' : 'border-l-transparent hover:border-l-border-strong',
        )}
      >
        {/* No mark to show (none registered, or the file is withheld):
            the line stays empty and the name below is the identification. */}
        <span className="flex h-[22px] w-full min-w-0 items-center">
          <CompanyLogo company={company} preset="tile" fallback="none" />
        </span>
        <span className="flex w-full min-w-0 items-baseline justify-between gap-2">
          <span
            data-tile-name
            className={cx(
              'min-w-0 font-sans text-[13px] leading-4 break-words text-text',
              selected ? 'font-semibold' : 'font-medium',
            )}
          >
            {companyShortName(company.name)}
          </span>
          {fact.text ? (
            <span
              data-tile-fact={fact.kind}
              className="shrink-0 font-sans text-[13px] leading-4 tabular-nums text-text-dim"
            >
              {fact.text}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
