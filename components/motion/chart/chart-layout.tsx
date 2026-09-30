import type { ReactNode } from 'react';
import { StageLegend } from '../figure-frame';
import { ChartAxes, type PlotRect } from './chart-axes';
import { DirectLabel } from './chart-marks';
import {
  CHART_HATCH,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  roleColour,
  type ChartRole,
} from './chart-tokens';

/** Splits a plot into equal panels stacked over one shared x axis. */
export function smallMultiplesLayout(plot: PlotRect, count: number, gap: number): PlotRect[] {
  const height = (plot.bottom - plot.top - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => {
    const top = plot.top + i * (height + gap);
    return { left: plot.left, right: plot.right, top, bottom: top + height };
  });
}

/**
 * Thin traces as compact small multiples: one labelled panel per series,
 * one baseline each, and a single x axis under the last panel. The gap
 * leaves room for each panel's label.
 */
export function SmallMultiples({
  plot,
  labels,
  x,
  xTicks,
  formatX,
  xLabel,
  renderPanel,
}: {
  plot: PlotRect;
  labels: readonly string[];
  x: (value: number) => number;
  xTicks?: readonly number[];
  formatX?: (value: number) => string;
  xLabel?: string;
  renderPanel: (panel: PlotRect, index: number) => ReactNode;
}) {
  const gap = CHART_TYPE.labelPx + CHART_STROKE.tickLength;
  const panels = smallMultiplesLayout(plot, labels.length, gap);
  const last = panels[panels.length - 1];
  return (
    <g data-chart-small-multiples="">
      {panels.map((panel, i) => (
        <g key={labels[i]} data-chart-panel={i}>
          <DirectLabel x={panel.left} y={panel.top - CHART_STROKE.tickLength / 2}>
            {labels[i]}
          </DirectLabel>
          {i < panels.length - 1 ? (
            <line
              x1={panel.left}
              x2={panel.right}
              y1={panel.bottom}
              y2={panel.bottom}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              opacity={CHART_STRUCTURE.axesOpacity}
            />
          ) : null}
          {renderPanel(panel, i)}
        </g>
      ))}
      {last ? (
        <ChartAxes
          plot={last}
          x={x}
          y={() => last.bottom}
          xTicks={xTicks}
          formatX={formatX}
          xLabel={xLabel}
          grid={false}
          yAxis={false}
        />
      ) : null}
    </g>
  );
}

export type LegendMark = 'line' | 'dash' | 'bar' | 'dot' | 'cross' | 'hatch' | 'band';

function LegendSwatch({ role, mark }: { role: ChartRole; mark: LegendMark }) {
  const h = CHART_TYPE.tickPx;
  const w = h * 2;
  const colour = roleColour(role);
  const line = { stroke: colour, strokeWidth: CHART_STROKE.trace, fill: 'none', strokeLinecap: 'round' as const };
  const s = CHART_HATCH.spacing;
  const r = CHART_STROKE.markerRadius;
  const inset = CHART_STROKE.structure;
  return (
    <svg aria-hidden="true" focusable="false" width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      {mark === 'line' ? <path d={`M${inset} ${h / 2} H${w - inset}`} {...line} /> : null}
      {mark === 'dash' ? (
        <path
          d={`M${inset} ${h / 2} H${w - inset}`}
          {...line}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ) : null}
      {mark === 'bar' ? <rect x={0} y={0} width={w} height={h} fill={colour} /> : null}
      {mark === 'dot' ? <circle cx={w / 2} cy={h / 2} r={r} fill={colour} /> : null}
      {mark === 'cross' ? (
        <path
          d={`M${w / 2 - r} ${h / 2 - r} L${w / 2 + r} ${h / 2 + r} M${w / 2 - r} ${h / 2 + r} L${w / 2 + r} ${h / 2 - r}`}
          {...line}
        />
      ) : null}
      {mark === 'band' ? (
        <rect x={0} y={0} width={w} height={h} fill={colour} fillOpacity={CHART_UNCERTAINTY.fillAlpha} />
      ) : null}
      {mark === 'hatch' ? (
        <g>
          <rect
            x={inset / 2}
            y={inset / 2}
            width={w - inset}
            height={h - inset}
            fill="none"
            stroke={colour}
            strokeWidth={CHART_HATCH.width}
          />
          {Array.from({ length: Math.ceil((w + h) / s) }, (_, i) => (
            <line key={i} x1={i * s} y1={h} x2={i * s - h} y2={0} stroke={colour} strokeWidth={CHART_HATCH.width} />
          ))}
        </g>
      ) : null}
    </svg>
  );
}

/** The on-stage legend: one swatch in the mark's own encoding per series. */
export function ChartLegend({
  items,
}: {
  items: readonly { role: ChartRole; label: string; mark: LegendMark }[];
}) {
  return (
    <StageLegend>
      {items.map((item) => (
        <span
          key={item.label}
          data-legend-item=""
          data-legend-series={item.role}
          className="inline-flex items-center gap-1.5"
        >
          <LegendSwatch role={item.role} mark={item.mark} />
          <span>{item.label}</span>
        </span>
      ))}
    </StageLegend>
  );
}
