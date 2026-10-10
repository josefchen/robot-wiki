import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/utils';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE } from './chart-tokens';

/**
 * The drawing surface of a static chart on the graphite stage. It carries
 * the motion-stage-svg class, so stage.css paints its text on the shared
 * type scale at every width. The svg is decorative to assistive technology;
 * the figure frame carries the text alternative.
 */
export function ChartSvg({
  width,
  height,
  children,
  className,
}: {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      data-chart=""
      className={cx('motion-stage-svg block h-auto w-full', className)}
      fontFamily={CHART_TYPE.font}
      style={{ '--motion-stage-view-width': `${width}px` } as CSSProperties}
    >
      {children}
    </svg>
  );
}

export interface PlotRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type Scale = (value: number) => number;

/**
 * Hairline ink axes, an optional hairline grid, ticks and their labels.
 * Tick numerals are muted at the tick size; axis titles, with their units,
 * are ink at the axis size, both in the sans.
 */
export function ChartAxes({
  plot,
  x,
  y,
  xTicks = [],
  yTicks = [],
  formatX = String,
  formatY = String,
  xLabel,
  yLabel,
  grid = true,
  yAxis = true,
}: {
  plot: PlotRect;
  x: Scale;
  y: Scale;
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  xLabel?: string;
  yLabel?: string;
  grid?: boolean;
  /** False draws the x axis alone, as the shared axis of small multiples. */
  yAxis?: boolean;
}) {
  const tick = CHART_STROKE.tickLength;
  const structure = {
    stroke: CHART_STRUCTURE.axes,
    strokeWidth: CHART_STROKE.structure,
    opacity: CHART_STRUCTURE.axesOpacity,
  };
  return (
    <g data-chart-axes="">
      {grid
        ? yTicks.map((value) => (
            <line
              key={`grid-${value}`}
              data-chart-grid=""
              x1={plot.left}
              x2={plot.right}
              y1={y(value)}
              y2={y(value)}
              stroke={CHART_STRUCTURE.grid}
              strokeWidth={CHART_STROKE.structure}
              opacity={CHART_STRUCTURE.gridOpacity}
            />
          ))
        : null}
      <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} {...structure} />
      {yAxis ? (
        <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} {...structure} />
      ) : null}
      {xTicks.map((value) => (
        <g key={`x-${value}`}>
          <line x1={x(value)} x2={x(value)} y1={plot.bottom} y2={plot.bottom + tick} {...structure} />
          <text
            data-scene-tick=""
            x={x(value)}
            y={plot.bottom + tick + tick / 2}
            dominantBaseline="hanging"
            textAnchor="middle"
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.labelSecondary}
          >
            {formatX(value)}
          </text>
        </g>
      ))}
      {yTicks.map((value) => (
        <g key={`y-${value}`}>
          <line x1={plot.left - tick} x2={plot.left} y1={y(value)} y2={y(value)} {...structure} />
          <text
            data-scene-tick=""
            x={plot.left - tick - CHART_STROKE.tickLength / 2}
            y={y(value)}
            dominantBaseline="middle"
            textAnchor="end"
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.labelSecondary}
          >
            {formatY(value)}
          </text>
        </g>
      ))}
      {xLabel ? (
        <text
          data-scene-axis=""
          x={plot.right}
          y={plot.bottom + tick + tick / 2}
          dy={`${(CHART_TYPE.tickPx / CHART_TYPE.axisPx) * (CHART_TYPE.ascent + CHART_TYPE.descent) + 0.25}em`}
          dominantBaseline="hanging"
          textAnchor="end"
          fontSize={CHART_TYPE.axisPx}
          fill={CHART_STRUCTURE.label}
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          data-scene-axis=""
          x={plot.left}
          y={plot.top - tick}
          textAnchor="start"
          fontSize={CHART_TYPE.axisPx}
          fill={CHART_STRUCTURE.label}
        >
          {yLabel}
        </text>
      ) : null}
    </g>
  );
}
