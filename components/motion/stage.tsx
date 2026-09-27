'use client';

/**
 * Shared stage furniture: the SVG canvas, the concrete axes at 45%, the
 * quiet grid, and the label styles. Roles and structure come from the tokens;
 * nothing here may carry a colour or timing literal (the token check
 * enforces that).
 */
import type { ReactNode } from 'react';

export const STAGE_FONT = 'var(--motion-stage-label-font)';

export function StageSvg({
  viewBox,
  children,
  className,
}: {
  viewBox: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      className={`motion-stage-svg block h-auto w-full ${className ?? ''}`}
      fontFamily={STAGE_FONT}
    >
      {children}
    </svg>
  );
}

export interface PlotArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function StageGrid({
  plot,
  xTicks,
  yTicks,
  xScale,
  yScale,
  xLabel,
  yLabel,
}: {
  plot: PlotArea;
  xTicks: number[];
  yTicks: number[];
  xScale: (value: number) => number;
  yScale: (value: number) => number;
  /** Axis names; omit when the scene labels its own axes. */
  xLabel?: string;
  yLabel?: string;
}) {
  return (
    <g data-scene-structure="axes-and-grid">
      {xTicks.map((value) => (
        <line
          key={`gx-${value}`}
          x1={xScale(value)}
          x2={xScale(value)}
          y1={plot.top}
          y2={plot.bottom}
          stroke="var(--motion-stage-grid)"
          strokeWidth={1}
          opacity="var(--motion-stage-grid-opacity)"
        />
      ))}
      {yTicks.map((value) => (
        <line
          key={`gy-${value}`}
          x1={plot.left}
          x2={plot.right}
          y1={yScale(value)}
          y2={yScale(value)}
          stroke="var(--motion-stage-grid)"
          strokeWidth={1}
          opacity="var(--motion-stage-grid-opacity)"
        />
      ))}
      <line
        x1={plot.left}
        x2={plot.right}
        y1={yScale(0)}
        y2={yScale(0)}
        stroke="var(--motion-stage-axes)"
        strokeWidth={1.25}
        opacity="var(--motion-stage-axes-opacity)"
      />
      <line
        x1={xScale(0)}
        x2={xScale(0)}
        y1={plot.top}
        y2={plot.bottom}
        stroke="var(--motion-stage-axes)"
        strokeWidth={1.25}
        opacity="var(--motion-stage-axes-opacity)"
      />
      {xLabel ? (
        <text
          x={plot.right}
          y={plot.bottom + 16}
          textAnchor="end"
          fontSize={13}
          fill="var(--motion-stage-label-secondary)"
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          x={plot.left}
          y={plot.top - 6}
          textAnchor="start"
          fontSize={13}
          fill="var(--motion-stage-label-secondary)"
        >
          {yLabel}
        </text>
      ) : null}
    </g>
  );
}

/** Formats a stage number without trailing float noise. */
export function stageNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}
