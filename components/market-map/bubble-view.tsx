'use client';

import { useId, useMemo, useState } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  bubblePoints,
  formatUsd,
  isBubbleArrowKey,
  stepMark,
  unknownFigure,
  type BubblePoint,
} from '@/lib/market-map';

const WIDTH = 720;
const HEIGHT = 420;
const PAD = { top: 24, right: 24, bottom: 48, left: 64 };

type BubbleViewProps = {
  companies: readonly Company[];
  /** Company id from a #company-<id> deep link, if any. */
  highlightedId?: string | null;
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

function niceYears(min: number, max: number): number[] {
  const ticks: number[] = [];
  const start = Math.floor(min);
  const end = Math.ceil(max);
  const step = end - start > 12 ? 4 : end - start > 6 ? 2 : 1;
  for (let year = start; year <= end; year += step) ticks.push(year);
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
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

export function BubbleView({ companies, highlightedId = null }: BubbleViewProps) {
  const clipId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // A deep link names one company explicitly: it arrives as the selected
  // mark, the same treatment a click produces (detail panel included).
  // Sync to prop changes during render (repo convention); the sentinel
  // start (null) makes the sync fire on the first render too, when the
  // anchor is already present at mount. A highlight that goes away never
  // deselects: the user's selection outlives the URL hash.
  const [prevHighlight, setPrevHighlight] = useState<string | null>(null);
  if (highlightedId !== prevHighlight) {
    setPrevHighlight(highlightedId);
    // Only a company this view actually plots can be selected. A hash
    // naming an unplotted company (no disclosed valuation or total
    // raised) would otherwise set an inert selectedId: no mark, no
    // detail panel, nothing the reader can see.
    const plotted =
      highlightedId !== null &&
      points.some((point) => point.id === highlightedId);
    if (plotted) setSelectedId(highlightedId);
  }

  const excluded = companies.length - points.length;

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
    const yDomain: [number, number] = [
      Math.max(1, yMin / 1.4),
      yMax * 1.4,
    ];
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const placed = points.map((point) => ({
      ...point,
      cx: PAD.left + linearScale(point.founded, xDomain, [0, innerW]),
      cy: PAD.top + logScale(point.yUsd, yDomain, [innerH, 0]),
    }));
    return {
      placed,
      xTicks: niceYears(xDomain[0], xDomain[1]),
      yTicks: yTicks(yDomain[0], yDomain[1]),
      xDomain,
      yDomain,
    };
  }, [points]);

  const activeId = hoveredId ?? focusedId;
  const labeled =
    geometry?.placed.find((point) => point.id === activeId) ?? null;
  const focusedMark =
    geometry?.placed.find((point) => point.id === focusedId) ?? null;
  // The selection the reader can see: only a plotted mark. selectedId
  // from a deep link that names an unplotted company is never set (see
  // the render-sync above), but a filter change can make an existing
  // selection unplotted; the detail panel follows the visible truth.
  const selected =
    geometry?.placed.find((point) => point.id === selectedId) ?? null;
  // Roving tabindex: exactly one mark is tabbable (the roving stop, or
  // the first plotted mark before any interaction). The highlighted
  // deep-link target wins when it is plotted, so the hashed mark is the
  // entry point; a hash naming an unplotted company must not leave the
  // chart with zero tab stops, so the fallback always resolves to a
  // plotted mark. The stop survives blur: the last-focused mark keeps
  // the tabindex (WAI-ARIA roving tabindex keeps the position on blur),
  // so Tab re-enters the chart where the reader left it.
  const plottedHighlight =
    geometry?.placed.some((point) => point.id === highlightedId) === true
      ? highlightedId
      : null;
  const rovingId =
    rovingStopId ??
    focusedId ??
    plottedHighlight ??
    geometry?.placed[0]?.id ??
    null;

  return (
    <div className="mt-6">
      <p className="font-sans text-sm text-text-dim">
        Each mark is a company with a known founding year and a disclosed
        valuation or total raised. Missing figures are left off the chart
        instead of being drawn at zero. Hover or focus a mark for its name;
        select it for the full detail.
      </p>
      {excluded > 0 ? (
        <p data-bubble-excluded className="mt-1 font-mono text-xs text-text-dim">
          {excluded} {excluded === 1 ? 'company' : 'companies'} excluded for
          missing founding year or funding
        </p>
      ) : null}

      {geometry ? (
        <svg
          role="group"
          aria-label="Company bubble chart of founding year against valuation or total raised"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          data-bubble-selected={selected ? selected.id : undefined}
          className="mt-4 h-auto w-full"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={PAD.left}
                y={PAD.top}
                width={WIDTH - PAD.left - PAD.right}
                height={HEIGHT - PAD.top - PAD.bottom}
              />
            </clipPath>
          </defs>
          <text
            x={WIDTH / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-text-dim font-sans text-[11px]"
          >
            Founding year
          </text>
          <text
            x={16}
            y={HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${HEIGHT / 2})`}
            className="fill-text-dim font-sans text-[11px]"
          >
            Valuation or total raised (log)
          </text>
          {geometry.xTicks.map((year) => {
            const x =
              PAD.left +
              linearScale(year, geometry.xDomain, [
                0,
                WIDTH - PAD.left - PAD.right,
              ]);
            return (
              <g key={year}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={HEIGHT - PAD.bottom + 18}
                  textAnchor="middle"
                  className="fill-text-dim font-mono text-[10px]"
                >
                  {year}
                </text>
              </g>
            );
          })}
          {geometry.yTicks.map((value) => {
            const y =
              PAD.top +
              logScale(value, geometry.yDomain, [
                HEIGHT - PAD.top - PAD.bottom,
                0,
              ]);
            return (
              <g key={value}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-text-dim font-mono text-[10px]"
                >
                  {formatUsd(value)}
                </text>
              </g>
            );
          })}
          {labeled ? <MarkLabel point={labeled} /> : null}
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
            {geometry.placed.map((point) => (
              <circle
                key={point.id}
                data-company-id={point.id}
                cx={point.cx}
                cy={point.cy}
                r={selectedId === point.id ? 6 : 4.5}
                className={
                  selectedId === point.id ? 'fill-accent' : 'fill-text'
                }
                // Custom focus treatment (the ring circle above): the
                // browser default outline renders inconsistently on SVG
                // shapes, so it is removed here, not styled.
                style={{ outline: 'none' }}
                tabIndex={rovingId === point.id ? 0 : -1}
                role="button"
                aria-label={`${point.name}, founded ${point.founded}, ${
                  point.yKind === 'valuation' ? 'valuation' : 'total raised'
                } ${formatUsd(point.yUsd)}`}
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
                onClick={() =>
                  setSelectedId((current) =>
                    current === point.id ? null : point.id,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedId((current) =>
                      current === point.id ? null : point.id,
                    );
                    return;
                  }
                  if (isBubbleArrowKey(event.key)) {
                    event.preventDefault();
                    if (!geometry) return;
                    const next = stepMark(geometry.placed, point.id, event.key);
                    if (next === point.id) return;
                    setFocusedId(next);
                    setRovingStopId(next);
                    document
                      .querySelector<SVGCircleElement>(
                        `circle[data-company-id="${next}"]`,
                      )
                      ?.focus();
                  }
                }}
              />
            ))}
          </g>
        </svg>
      ) : (
        <p className="mt-4 font-sans text-sm text-text-dim">
          No companies in this set have both a founding year and a disclosed
          valuation or total raised.
        </p>
      )}

      {selected ? <BubbleDetail point={selected} /> : null}
    </div>
  );
}

const LABEL_H = 30;

/**
 * Hover/focus label: the company name in the text color plus the plotted
 * value, set in the chart's own label idiom (mono 10px dim) so it reads as
 * part of the chart rather than a floating UI panel. Clamped inside the
 * viewBox and drawn on top of the grid, below the marks.
 */
function MarkLabel({ point }: { point: BubblePoint & { cx: number; cy: number } }) {
  const x = Math.min(Math.max(point.cx, PAD.left + 4), WIDTH - PAD.right - 4);
  const anchor = point.cx > WIDTH / 2 ? 'end' : 'start';
  const above = point.cy > PAD.top + LABEL_H + 8;
  const y = above ? point.cy - 12 : point.cy + 18;
  return (
    <g
      data-bubble-label
      pointerEvents="none"
      aria-hidden="true"
    >
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        className="fill-text font-sans text-[11px] font-medium"
      >
        {point.name}
      </text>
      <text
        x={x}
        y={y + 13}
        textAnchor={anchor}
        className="fill-text-dim font-mono text-[10px]"
      >
        {plottedValueLabel(point)}
      </text>
    </g>
  );
}

function BubbleDetail({ point }: { point: BubblePoint }) {
  return (
    <div
      data-bubble-detail
      className="mt-4 border-t border-border pt-3 text-sm"
    >
      <p className="font-sans font-medium text-text">{point.name}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-text-dim">Founded</dt>
        <dd>{point.founded}</dd>
        <dt className="text-text-dim">
          {point.yKind === 'valuation' ? 'Valuation' : 'Total raised'}
        </dt>
        <dd className="font-mono tabular-nums">{formatUsd(point.yUsd)}</dd>
        <dt className="text-text-dim">Latest amount</dt>
        <dd>
          {point.amountUsd === null ? (
            <span className="text-text-dim">{unknownFigure()}</span>
          ) : (
            <span className="font-mono tabular-nums">
              {formatUsd(point.amountUsd)}
            </span>
          )}
        </dd>
      </dl>
    </div>
  );
}
