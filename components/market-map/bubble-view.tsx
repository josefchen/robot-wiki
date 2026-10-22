'use client';

import { useId, useMemo, useState } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  bubblePoints,
  formatUsd,
  isBubbleArrowKey,
  stepMark,
  type BubblePoint,
} from '@/lib/market-map';
import { SHEET_ID } from './company-sheet';
import { useChartWidth } from './use-chart-width';

/** Drawing height, and the fallback width before the container is measured. */
const HEIGHT = 420;
const FALLBACK_WIDTH = 720;
const PAD = { top: 24, right: 24, bottom: 48, left: 64 };

type BubbleViewProps = {
  companies: readonly Company[];
  /** The company whose details are open (the #company-<id> in the URL). */
  selectedId: string | null;
  onSelect: (id: string, trigger: HTMLElement | null) => void;
};

function logScale(
  value: number,
  domain: [number, number],
  range: [number, number],
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const t =
    (Math.log10(value) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0));
  return r0 + t * (r1 - r0);
}

function linearScale(
  value: number,
  domain: [number, number],
  range: [number, number],
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

function niceYears(min: number, max: number, width: number): number[] {
  const ticks: number[] = [];
  const start = Math.floor(min);
  const end = Math.ceil(max);
  const span = end - start;
  // About one label per 70 px of axis.
  const room = Math.max(2, Math.floor((width - PAD.left - PAD.right) / 70));
  const step = [1, 2, 4, 5, 10, 20].find((candidate) => span / candidate <= room) ?? 25;
  for (let year = Math.ceil(start / step) * step; year <= end; year += step) ticks.push(year);
  return ticks;
}

function yTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const startExp = Math.floor(Math.log10(min));
  const endExp = Math.ceil(Math.log10(max));
  for (let exp = startExp; exp <= endExp; exp += 1) {
    const value = 10 ** exp;
    if (value >= min / 1.05 && value <= max * 1.05) ticks.push(value);
  }
  return ticks.length > 0 ? ticks : [min, max];
}

function plottedValueLabel(point: BubblePoint): string {
  return point.yKind === 'valuation'
    ? `valuation ${formatUsd(point.yUsd)}`
    : `total raised ${formatUsd(point.yUsd)}`;
}

/**
 * Founding year against funding, one mark per company, as a plain data
 * plot: grey marks, hairline axes, one accent for the open company. A
 * filled mark is the latest valuation; an open mark is the total raised,
 * for a company with no disclosed valuation, so the two kinds of figure
 * are never mistaken for each other. A company with no founding year or no
 * disclosed figure is left off, never drawn at zero, and the count says so.
 *
 * The chart is one tab stop with a roving tabindex: arrow keys move between
 * marks along the two axes (stepMark), Enter or Space opens the company's
 * details. Hover and focus show the same label.
 */
export function BubbleView({ companies, selectedId, onSelect }: BubbleViewProps) {
  const clipId = useId();
  const captionId = `${useId()}-caption`;
  const [frameRef, width] = useChartWidth(FALLBACK_WIDTH);
  // Hover and focus reveal the same label (parity) but stay separate
  // signals: the focus ring means keyboard focus, so hovering with a
  // mouse never paints a focus ring.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // The roving tab stop outlives focus: blur clears the ring and label
  // but keeps the stop on the last-focused mark (WAI-ARIA roving
  // tabindex keeps the position on blur), so Tab re-enters the chart
  // where the reader left it instead of resetting to the first mark.
  const [rovingStopId, setRovingStopId] = useState<string | null>(null);

  const points = useMemo(() => bubblePoints(companies), [companies]);
  const excluded = companies.length - points.length;
  const valuations = points.filter((point) => point.yKind === 'valuation').length;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const years = points.map((point) => point.founded);
    const values = points.map((point) => point.yUsd);
    const xDomain: [number, number] = [
      Math.min(...years) - 1,
      Math.max(...years) + 1,
    ];
    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const yDomain: [number, number] = [Math.max(1, yMin / 1.4), yMax * 1.4];
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const placed = points.map((point) => ({
      ...point,
      cx: PAD.left + linearScale(point.founded, xDomain, [0, innerW]),
      cy: PAD.top + logScale(point.yUsd, yDomain, [innerH, 0]),
    }));
    return {
      placed,
      xTicks: niceYears(xDomain[0], xDomain[1], width),
      yTicks: yTicks(yDomain[0], yDomain[1]),
      xDomain,
      yDomain,
      innerW,
      innerH,
    };
  }, [points, width]);

  // The label names the hovered or focused mark, else the open company's.
  const activeId = hoveredId ?? focusedId ?? selectedId;
  const labeled = geometry?.placed.find((point) => point.id === activeId) ?? null;
  const focusedMark = geometry?.placed.find((point) => point.id === focusedId) ?? null;
  // The selection the chart can show: only a plotted mark. A company with
  // no plotted figure can still be open (its details are), but no mark
  // pretends to be it.
  const selected = geometry?.placed.find((point) => point.id === selectedId) ?? null;
  // Roving tabindex: exactly one mark is tabbable: the roving stop while it
  // is still plotted, else the open company's mark, else the first.
  const rovingId =
    (rovingStopId && geometry?.placed.some((point) => point.id === rovingStopId)
      ? rovingStopId
      : null) ??
    selected?.id ??
    geometry?.placed[0]?.id ??
    null;

  return (
    <figure data-bubble-chart className="max-w-[60rem]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[13px] leading-5 text-text-dim">
        <span className="text-text">Founding year against funding</span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4.5" className="fill-graphite" />
          </svg>
          Latest valuation
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="3.75" className="fill-paper stroke-graphite" strokeWidth={1.5} />
          </svg>
          Total raised, where no valuation is disclosed
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <circle data-legend-key="open-company" cx="6" cy="6" r="6" className="fill-accent" />
          </svg>
          Open company
        </span>
      </div>

      <div ref={frameRef} className="mt-4 w-full">
        {geometry ? (
          <svg
            role="group"
            aria-label="Company bubble chart of founding year against valuation or total raised"
            aria-describedby={captionId}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width={width}
            height={HEIGHT}
            data-bubble-selected={selected ? selected.id : undefined}
            className="block h-auto w-full overflow-visible"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={PAD.left} y={PAD.top} width={geometry.innerW} height={geometry.innerH} />
              </clipPath>
            </defs>
            <text
              x={PAD.left}
              y={12}
              className="fill-text-dim font-sans text-[12px]"
            >
              US$, log scale
            </text>
            {geometry.yTicks.map((value) => {
              const y =
                PAD.top + logScale(value, geometry.yDomain, [geometry.innerH, 0]);
              return (
                <g key={value}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-text-dim font-sans text-[12px] tabular-nums"
                  >
                    {formatUsd(value)}
                  </text>
                </g>
              );
            })}
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={HEIGHT - PAD.bottom}
              y2={HEIGHT - PAD.bottom}
              className="stroke-border-strong"
              strokeWidth={1}
            />
            {geometry.xTicks.map((year) => {
              const x = PAD.left + linearScale(year, geometry.xDomain, [0, geometry.innerW]);
              return (
                <g key={year}>
                  <line
                    x1={x}
                    x2={x}
                    y1={HEIGHT - PAD.bottom}
                    y2={HEIGHT - PAD.bottom + 5}
                    className="stroke-border-strong"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={HEIGHT - PAD.bottom + 19}
                    textAnchor="middle"
                    className="fill-text-dim font-sans text-[12px] tabular-nums"
                  >
                    {year}
                  </text>
                </g>
              );
            })}
            <text
              x={width - PAD.right}
              y={HEIGHT - 6}
              textAnchor="end"
              className="fill-text-dim font-sans text-[12px]"
            >
              Founding year
            </text>
            {labeled ? <MarkLabel point={labeled} width={width} /> : null}
            {/* The focus ring must NOT live inside the clip group below: a
                mark at the extreme top/bottom of the plot would get its
                ring cut by the clip rect there (the ring's painted edge
                extends past the plot area by design, r + halfStroke).
                Rendered as a sibling, it is always fully visible. */}
            {focusedMark ? (
              <circle
                data-focus-ring
                aria-hidden="true"
                cx={focusedMark.cx}
                cy={focusedMark.cy}
                r={selectedId === focusedMark.id ? 10 : 8.5}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                className="pointer-events-none"
              />
            ) : null}
            <g clipPath={`url(#${clipId})`}>
              {geometry.placed.map((point) => {
                const isSelected = selectedId === point.id;
                const open = point.yKind === 'totalRaised';
                return (
                  <g key={point.id}>
                    {/* The visible mark: filled for a valuation, open for a
                        total raised, accent when its company is open. It is
                        decorative geometry of the control next to it, never
                        a pointer target. */}
                    <circle
                      data-mark-ink
                      data-mark-kind={point.yKind}
                      cx={point.cx}
                      cy={point.cy}
                      r={isSelected ? 6 : open ? 3.75 : 4.5}
                      className={
                        isSelected
                          ? 'fill-accent'
                          : open
                            ? 'fill-paper stroke-graphite'
                            : 'fill-graphite'
                      }
                      strokeWidth={open && !isSelected ? 1.5 : undefined}
                      aria-hidden="true"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* The control. Its hit geometry is 24 units wide, and a
                        transparent non-scaling 24px stroke keeps the outer
                        hit radius at least 12 screen px at every render
                        width, so the WCAG 2.2 SC 2.5.8 minimum holds without
                        moving data-encoded marks. Dense stacks keep their
                        data positions; the hover label names the company the
                        ring under the pointer will open. */}
                    <circle
                      data-company-id={point.id}
                      data-brand-control-id="control:selection"
                      cx={point.cx}
                      cy={point.cy}
                      r={12}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth={24}
                      vectorEffect="non-scaling-stroke"
                      // Custom focus treatment (the ring circle above): the
                      // browser default outline renders inconsistently on SVG
                      // shapes, so it is removed here, not styled.
                      style={{ outline: 'none', cursor: 'pointer' }}
                      tabIndex={rovingId === point.id ? 0 : -1}
                      role="button"
                      aria-label={`${point.name}, founded ${point.founded}, ${
                        point.yKind === 'valuation' ? 'valuation' : 'total raised'
                      } ${formatUsd(point.yUsd)}`}
                      aria-haspopup="dialog"
                      aria-expanded={isSelected}
                      aria-controls={isSelected ? SHEET_ID : undefined}
                      onMouseEnter={() => setHoveredId(point.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => {
                        setFocusedId(point.id);
                        setRovingStopId(point.id);
                      }}
                      // Blur ends the focus treatment (label and ring clear)
                      // but keeps the roving stop: WAI-ARIA roving tabindex
                      // keeps the position on blur, so Tab re-enters the chart
                      // on the mark the reader last focused.
                      onBlur={() => setFocusedId(null)}
                      onClick={(event) =>
                        onSelect(point.id, event.currentTarget as unknown as HTMLElement)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(point.id, event.currentTarget as unknown as HTMLElement);
                          return;
                        }
                        if (isBubbleArrowKey(event.key)) {
                          event.preventDefault();
                          const next = stepMark(geometry.placed, point.id, event.key);
                          if (next === point.id) return;
                          setFocusedId(next);
                          setRovingStopId(next);
                          document
                            .querySelector<SVGCircleElement>(`circle[data-company-id="${next}"]`)
                            ?.focus();
                        }
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          <p className="font-sans text-[14px] text-text-dim">
            No company in this set has both a founding year and a disclosed
            valuation or total raised.
          </p>
        )}
      </div>

      <figcaption id={captionId} className="mt-3 border-t border-border pt-3 font-sans text-[13px] leading-5 text-text-dim">
        {points.length} of {companies.length} companies plotted, {valuations} by
        valuation and {points.length - valuations} by total raised.{' '}
        {excluded > 0 ? (
          <span data-bubble-excluded>
            {excluded} {excluded === 1 ? 'is' : 'are'} left off, not drawn at zero:
            the founding year or the funding figure is undisclosed.
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

const LABEL_H = 30;

/**
 * Hover/focus label: the company name in ink plus the plotted value in
 * muted text, set in the chart's own label size so it reads as part of the
 * chart rather than a floating panel. Clamped inside the drawing and drawn
 * on top of the grid, below the marks.
 */
function MarkLabel({
  point,
  width,
}: {
  point: BubblePoint & { cx: number; cy: number };
  width: number;
}) {
  const x = Math.min(Math.max(point.cx, PAD.left + 4), width - PAD.right - 4);
  const anchor = point.cx > width / 2 ? 'end' : 'start';
  const dx = anchor === 'end' ? -12 : 12;
  const above = point.cy > PAD.top + LABEL_H + 8;
  const y = above ? point.cy - 14 : point.cy + 20;
  return (
    <g data-bubble-label pointerEvents="none" aria-hidden="true">
      <text
        x={x + dx}
        y={y}
        textAnchor={anchor}
        className="fill-text stroke-bg font-sans text-[13px] font-medium [paint-order:stroke] [stroke-width:4px]"
      >
        {point.name}
      </text>
      <text
        x={x + dx}
        y={y + 14}
        textAnchor={anchor}
        className="fill-text-dim stroke-bg font-sans text-[12px] tabular-nums [paint-order:stroke] [stroke-width:4px]"
      >
        {plottedValueLabel(point)}
      </text>
    </g>
  );
}
