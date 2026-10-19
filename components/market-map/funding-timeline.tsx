'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  formatShortDate,
  formatUsd,
  isTimelineArrowKey,
  stepTimeline,
  timelineEvents,
  type TimelineEvent,
} from '@/lib/market-map';
import { cx } from '@/lib/utils';
import { SHEET_ID } from './company-sheet';
import { useChartWidth } from './use-chart-width';

type FundingTimelineProps = {
  companies: readonly Company[];
  /** The company whose details are open (the #company-<id> in the URL). */
  selectedId: string | null;
  onSelect: (id: string, trigger: HTMLElement | null) => void;
};

const PLOT_HEIGHT = 232;
const PLOT_PAD = { top: 22, right: 16, bottom: 58, left: 72 };
/** The lane under the axis where rounds without a disclosed amount sit. */
const LANE_OFFSET = 40;

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * Funding and listing events from 2023 to 2026: a dated plot of every round
 * above the list of the same rounds. The plot draws each round at its date
 * and amount (log scale), grey, with the open company's round in the accent;
 * a round whose amount is undisclosed sits on its own lane under the axis
 * rather than at zero. The plot is for the eye and the pointer; the list is
 * the full equivalent for keyboards and screen readers.
 *
 * The list is one tab stop (roving tabindex, parity with the bubble view):
 * ArrowUp and ArrowDown move between rows in date order, Enter or Space
 * opens the company's details, which cite the round's own source.
 */
export function FundingTimeline({ companies, selectedId, onSelect }: FundingTimelineProps) {
  const events = useMemo(() => timelineEvents(companies), [companies]);
  const [rovingStopId, setRovingStopId] = useState<string | null>(null);
  // Focus moves go through a ref map, not a global querySelector: the
  // handler closes over the row buttons this component rendered, so it
  // stays correct if the timeline is ever mounted more than once.
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusRow = useCallback((id: string) => {
    rowRefs.current.get(id)?.focus();
  }, []);

  if (events.length === 0) {
    return (
      <p className="font-sans text-[14px] text-text-dim">
        No 2023-2026 rounds in the current set.
      </p>
    );
  }

  // Exactly one row is tabbable: the roving stop while its row is still
  // listed, else the open company's row, else the earliest row. Both
  // fallbacks keep the list from losing its only tab stop when a filter
  // removes the last-focused row or the open company has no dated round.
  const selectedRowId =
    selectedId === null
      ? null
      : (events.find((event) => event.companyId === selectedId)?.id ?? null);
  const knownStopId =
    rovingStopId !== null && events.some((event) => event.id === rovingStopId)
      ? rovingStopId
      : null;
  const rovingId = knownStopId ?? selectedRowId ?? events[0].id;
  const disclosed = events.filter((event) => event.amountUsd !== null).length;

  return (
    <div className="max-w-[60rem]">
      <TimelinePlot
        events={events}
        selectedId={selectedId}
        onSelect={(id) => onSelect(id, rowRefs.current.get(
          events.find((event) => event.companyId === id)?.id ?? '',
        ) ?? null)}
      />
      <p className="mt-3 border-t border-border pt-3 font-sans text-[13px] leading-5 text-text-dim">
        {events.length} rounds and listings dated 2023 to 2026, {disclosed} with a
        disclosed amount. Each amount is cited to the source it was read from.
      </p>

      <div
        aria-hidden="true"
        className="mt-8 hidden grid-cols-[6.5rem_minmax(0,1fr)_10rem_9rem] gap-x-4 border-b border-border-strong pb-2 pl-2 font-sans text-[13px] leading-4 text-text-dim sm:grid"
      >
        <span>Date</span>
        <span>Company</span>
        <span>Round</span>
        <span className="text-right">Amount at valuation</span>
      </div>
      <ol aria-label="Funding rounds and listings, oldest first" className="mt-8 sm:mt-0">
        {events.map((event) => {
          const active = selectedId === event.companyId;
          return (
            <li
              key={event.id}
              data-timeline-id={event.id}
              data-company-id={event.companyId}
              id={`company-${event.companyId}`}
              className={cx(
                'scroll-mt-28 border-b border-l-2 border-b-border',
                active ? 'border-l-accent bg-surface-2' : 'border-l-transparent',
              )}
            >
              <button
                data-brand-control-id="control:secondary-action"
                type="button"
                ref={(el) => {
                  if (el === null) rowRefs.current.delete(event.id);
                  else rowRefs.current.set(event.id, el);
                }}
                aria-haspopup="dialog"
                aria-expanded={active}
                aria-controls={active ? SHEET_ID : undefined}
                tabIndex={rovingId === event.id ? 0 : -1}
                onClick={(click) => onSelect(event.companyId, click.currentTarget)}
                onFocus={() => setRovingStopId(event.id)}
                onKeyDown={(keydown) => {
                  if (!isTimelineArrowKey(keydown.key)) return;
                  keydown.preventDefault();
                  const next = stepTimeline(events, event.id, keydown.key);
                  if (next === event.id) return;
                  setRovingStopId(next);
                  focusRow(next);
                }}
                className={cx(
                  'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 py-2.5 pr-1 pl-2 text-left font-sans text-[14px] leading-5 transition-colors duration-150 sm:grid-cols-[6.5rem_minmax(0,1fr)_10rem_9rem]',
                  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-ink',
                  !active && 'hover:bg-surface-2',
                )}
              >
                <span className="col-span-2 text-[13px] leading-4 tabular-nums text-text-dim sm:col-span-1 sm:text-[14px] sm:leading-5">
                  {formatShortDate(event.date)}
                </span>
                <span className="truncate font-medium text-text">{event.companyName}</span>
                <span className="hidden truncate text-text-dim sm:block">
                  {event.type ?? event.typeAbsent}
                </span>
                <span
                  className={cx(
                    'text-right tabular-nums',
                    event.amountUsd === null ? 'text-text-dim' : 'text-text',
                  )}
                >
                  {event.amountUsd === null ? event.amountAbsent : formatUsd(event.amountUsd)}
                  {event.valuationUsd !== null ? ` at ${formatUsd(event.valuationUsd)}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TimelinePlot({
  events,
  selectedId,
  onSelect,
}: {
  events: readonly TimelineEvent[];
  selectedId: string | null;
  onSelect: (companyId: string) => void;
}) {
  const [frameRef, width] = useChartWidth(720);
  const [hovered, setHovered] = useState<string | null>(null);

  const plot = useMemo(() => {
    const innerW = width - PLOT_PAD.left - PLOT_PAD.right;
    const axisY = PLOT_HEIGHT - PLOT_PAD.bottom;
    const innerH = axisY - PLOT_PAD.top;
    const firstYear = Number(events[0].date.slice(0, 4));
    const lastYear = Number(events[events.length - 1].date.slice(0, 4));
    const x0 = dayNumber(`${firstYear}-01-01`);
    const x1 = dayNumber(`${lastYear + 1}-01-01`);
    const x = (iso: string) => PLOT_PAD.left + ((dayNumber(iso) - x0) / (x1 - x0)) * innerW;
    const amounts = events.flatMap((event) => (event.amountUsd === null ? [] : [event.amountUsd]));
    // A set with no disclosed amount still gets an axis ($1M to $1B).
    const exp0 = amounts.length > 0 ? Math.floor(Math.log10(Math.min(...amounts))) : 6;
    const exp1 = amounts.length > 0 ? Math.ceil(Math.log10(Math.max(...amounts))) : 9;
    const y = (value: number) =>
      axisY - ((Math.log10(value) - exp0) / Math.max(1, exp1 - exp0)) * innerH;
    const years = Array.from({ length: lastYear - firstYear + 2 }, (_, i) => firstYear + i);
    const decades = Array.from({ length: exp1 - exp0 + 1 }, (_, i) => 10 ** (exp0 + i));
    const marks = events.map((event) => ({
      event,
      cx: x(event.date),
      cy: event.amountUsd === null ? axisY + LANE_OFFSET : y(event.amountUsd),
    }));
    return { innerW, axisY, x, years, decades, y, marks, x0, x1 };
  }, [events, width]);

  const label = plot.marks.find((mark) => mark.event.companyId === hovered) ?? null;
  // Draw the open company's round last so the accent is never covered.
  const ordered = [...plot.marks].sort(
    (a, b) => Number(a.event.companyId === selectedId) - Number(b.event.companyId === selectedId),
  );

  return (
    <div ref={frameRef} className="w-full">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[13px] leading-5 text-text-dim">
        <span className="text-text">Rounds by date and amount</span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3.5" className="fill-graphite" />
          </svg>
          Disclosed amount
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" className="fill-paper stroke-graphite" strokeWidth={1.25} />
          </svg>
          Amount undisclosed
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="11" height="11" viewBox="0 0 11 11">
            <circle cx="5.5" cy="5.5" r="5.5" className="fill-accent" />
          </svg>
          Open company
        </span>
      </div>
      <svg
        aria-hidden="true"
        data-timeline-plot
        viewBox={`0 0 ${width} ${PLOT_HEIGHT}`}
        width={width}
        height={PLOT_HEIGHT}
        className="mt-4 block h-auto w-full overflow-visible"
      >
        <text x={PLOT_PAD.left} y={10} className="fill-text-dim font-sans text-[12px]">
          Amount, US$, log scale
        </text>
        {plot.decades.map((value) => (
          <g key={value}>
            <line
              x1={PLOT_PAD.left}
              x2={width - PLOT_PAD.right}
              y1={plot.y(value)}
              y2={plot.y(value)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PLOT_PAD.left - 10}
              y={plot.y(value) + 4}
              textAnchor="end"
              className="fill-text-dim font-sans text-[12px] tabular-nums"
            >
              {formatUsd(value)}
            </text>
          </g>
        ))}
        <line
          x1={PLOT_PAD.left}
          x2={width - PLOT_PAD.right}
          y1={plot.axisY}
          y2={plot.axisY}
          className="stroke-border-strong"
          strokeWidth={1}
        />
        {plot.years.map((year) => {
          const at = plot.x(`${year}-01-01`);
          const next = plot.x(`${year + 1}-01-01`);
          return (
            <g key={year}>
              <line x1={at} x2={at} y1={plot.axisY} y2={plot.axisY + 5} className="stroke-border-strong" strokeWidth={1} />
              {year < plot.years[plot.years.length - 1] ? (
                <text
                  x={(at + next) / 2}
                  y={plot.axisY + 18}
                  textAnchor="middle"
                  className="fill-text-dim font-sans text-[12px] tabular-nums"
                >
                  {year}
                </text>
              ) : null}
            </g>
          );
        })}
        <text
          x={0}
          y={plot.axisY + LANE_OFFSET + 4}
          className="fill-text-dim font-sans text-[12px]"
        >
          Undisclosed
        </text>
        <line
          x1={PLOT_PAD.left}
          x2={width - PLOT_PAD.right}
          y1={plot.axisY + LANE_OFFSET}
          y2={plot.axisY + LANE_OFFSET}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {ordered.map(({ event, cx: x, cy: y }) => {
          const on = event.companyId === selectedId;
          const open = event.amountUsd === null;
          return (
            <g key={event.id}>
              <circle
                cx={x}
                cy={y}
                r={on ? 5.5 : open ? 3 : 3.5}
                className={on ? 'fill-accent' : open ? 'fill-paper stroke-graphite' : 'fill-graphite'}
                strokeWidth={open && !on ? 1.25 : undefined}
                pointerEvents="none"
              />
              <circle
                cx={x}
                cy={y}
                r={8}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(event.companyId)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(event.companyId)}
              />
            </g>
          );
        })}
        {label ? (
          <g pointerEvents="none">
            <text
              x={label.cx + (label.cx > width / 2 ? -10 : 10)}
              y={label.cy - 10}
              textAnchor={label.cx > width / 2 ? 'end' : 'start'}
              className="fill-text stroke-bg font-sans text-[13px] font-medium [paint-order:stroke] [stroke-width:4px]"
            >
              {label.event.companyName}
            </text>
            <text
              x={label.cx + (label.cx > width / 2 ? -10 : 10)}
              y={label.cy + 4}
              textAnchor={label.cx > width / 2 ? 'end' : 'start'}
              className="fill-text-dim stroke-bg font-sans text-[12px] tabular-nums [paint-order:stroke] [stroke-width:4px]"
            >
              {`${label.event.amountUsd === null ? label.event.amountAbsent : formatUsd(label.event.amountUsd)}, ${formatShortDate(label.event.date)}`}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
