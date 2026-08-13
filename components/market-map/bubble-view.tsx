'use client';

import { useId, useMemo, useState } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  bubblePoints,
  formatUsd,
  unknownFigure,
  type BubblePoint,
} from '@/lib/market-map';

const WIDTH = 720;
const HEIGHT = 420;
const PAD = { top: 24, right: 24, bottom: 48, left: 64 };

type BubbleViewProps = {
  companies: readonly Company[];
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

export function BubbleView({ companies }: BubbleViewProps) {
  const clipId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const points = useMemo(() => bubblePoints(companies), [companies]);
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

  const selected =
    geometry?.placed.find((point) => point.id === selectedId) ?? null;

  return (
    <div className="mt-6">
      <p className="font-sans text-sm text-text-dim">
        Each mark is a company with a known founding year and a disclosed
        valuation or total raised. Missing figures are left off the chart
        instead of being drawn at zero.
      </p>
      {excluded > 0 ? (
        <p data-bubble-excluded className="mt-1 font-mono text-xs text-text-dim">
          {excluded} {excluded === 1 ? 'company' : 'companies'} excluded for
          missing founding year or funding
        </p>
      ) : null}

      {geometry ? (
        <svg
          role="img"
          aria-label="Company bubble chart of founding year against valuation or total raised"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
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
                tabIndex={0}
                role="button"
                aria-label={`${point.name}, founded ${point.founded}, ${
                  point.yKind === 'valuation' ? 'valuation' : 'total raised'
                } ${formatUsd(point.yUsd)}`}
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
