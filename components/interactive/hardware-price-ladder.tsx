'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  roleColour,
} from '@/components/motion/chart';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  LADDER_POINTS,
  LADDER_ROWS,
  rowPoints,
  usd,
  type PricedPoint,
} from '@/lib/hardware-price-ladder';

/**
 * HardwarePriceLadder: the prices makers and sellers list for the guide's
 * arms, humanoids and robot computers, one strip per family on a ruler that
 * steps by ten times from $100 to $100,000. Only each strip's cheapest and
 * dearest product is named on the stage; the table names every dot. The
 * chart is static: no controls, no state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT_LEFT = 10;
const PLOT_RIGHT = 330;
const LOG = [2, 5] as const;
const TOP = 30;
const ROW_H = 80;
const STRIP_DY = 16;
const AXIS_Y = TOP + LADDER_ROWS.length * ROW_H - 8;
const HEIGHT = AXIS_Y + 44;
const TICKS = [
  { exp: 2, anchor: 'start' as const },
  { exp: 3, anchor: 'middle' as const },
  { exp: 4, anchor: 'middle' as const },
  { exp: 5, anchor: 'end' as const },
];
const MARKER_R = CHART_STROKE.markerRadius + 0.5;
const f = (v: number) => Number(v.toFixed(2));
const xFor = (usdValue: number) =>
  f(PLOT_LEFT + ((Math.log10(usdValue) - LOG[0]) / (LOG[1] - LOG[0])) * (PLOT_RIGHT - PLOT_LEFT));
const rowTop = (index: number) => TOP + index * ROW_H;

/** Where each strip's end labels sit from their dot, clear of the other end and the stage edge. */
const LABEL_PLACEMENT: Record<string, { anchor: 'start' | 'middle' | 'end'; dx: number }> = {
  'so-arm101-pro-unassembled': { anchor: 'start', dx: -4 },
  'reachy-2': { anchor: 'end', dx: 4 },
  'unitree-r1': { anchor: 'end', dx: 4 },
  'unitree-h2': { anchor: 'middle', dx: 0 },
  'jetson-thor-t4000': { anchor: 'end', dx: 0 },
  'jetson-thor-t5000': { anchor: 'start', dx: 0 },
};

const pointKey = (p: PricedPoint) => `${p.rowId}-${p.end}`;

const ARMS = rowPoints('arm');
const HUMANOIDS = rowPoints('humanoid');
const COMPUTERS = rowPoints('compute');
const range = (points: PricedPoint[]) =>
  `from ${usd(points[0].priceUsd)} (${points[0].label}) to ${usd(points[points.length - 1].priceUsd)} (${points[points.length - 1].label})`;

const HEADING = `Listed prices run from ${usd(LADDER_POINTS[0].priceUsd)} to ${usd(LADDER_POINTS[LADDER_POINTS.length - 1].priceUsd)}`;
const CAPTION =
  'No maker price for EngineAI SE01, Fourier GR-3 or UBTECH Walker S2; Figure 03, Atlas and Optimus 3 are not on open sale.';
const DESCRIPTION = `Listed prices of ${LADDER_POINTS.length} robot products on a ruler that steps by ten times: arms ${range(ARMS)}, humanoids ${range(HUMANOIDS)}, and robot computers ${range(COMPUTERS)}. EngineAI SE01, Fourier GR-3 and UBTECH Walker S2 have no maker price, and Figure 03, Atlas and Optimus 3 are not on open sale.`;

function Strip({ index, points }: { index: number; points: PricedPoint[] }) {
  const y0 = rowTop(index);
  const stripY = y0 + STRIP_DY;
  const ends = [points[0], points[points.length - 1]];
  return (
    <g data-testid={`price-strip-${LADDER_ROWS[index].id}`}>
      <DirectLabel x={PLOT_LEFT} y={y0}>
        <tspan fontWeight={600}>{LADDER_ROWS[index].label}</tspan>
      </DirectLabel>
      <line
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={stripY}
        y2={stripY}
        stroke={CHART_STRUCTURE.grid}
        strokeWidth={CHART_STROKE.structure}
      />
      {points.map((p) => (
        <circle
          key={pointKey(p)}
          data-testid={`price-point-${pointKey(p)}`}
          data-price-usd={p.priceUsd}
          data-chart-mark="dot"
          data-chart-role="measurement"
          cx={xFor(p.priceUsd)}
          cy={stripY}
          r={MARKER_R}
          fill={roleColour('measurement')}
          stroke={MOTION_STAGE.background}
          strokeWidth={CHART_STROKE.structure}
        />
      ))}
      {ends.map((p) => {
        const place = LABEL_PLACEMENT[p.rowId] ?? { anchor: 'middle' as const, dx: 0 };
        const x = f(xFor(p.priceUsd) + place.dx);
        return (
          <g key={pointKey(p)} data-testid={`price-label-${pointKey(p)}`}>
            <DirectLabel x={x} y={stripY + 18} anchor={place.anchor}>
              {p.label}
            </DirectLabel>
            <text
              data-scene-readout=""
              x={x}
              y={stripY + 32}
              textAnchor={place.anchor}
              fontSize={CHART_TYPE.readoutPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              {usd(p.priceUsd)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function HardwarePriceLadder({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  const sourceIds = [...new Set(LADDER_POINTS.map((p) => p.citationId))];

  return (
    <InstrumentFigure
      figureId="hardware-price-ladder"
      className={className}
      kicker="Maker list prices"
      heading={HEADING}
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Listed prices of arms, humanoids and robot computers"
            aria-describedby={descriptionId}
            data-testid="hardware-price-ladder-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.map((t) => (
                <line key={t.exp} x1={xFor(10 ** t.exp)} x2={xFor(10 ** t.exp)} y1={TOP - 14} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={AXIS_Y} y2={AXIS_Y} />
            </g>
            {LADDER_ROWS.map((row, index) => (
              <Strip key={row.id} index={index} points={rowPoints(row.id)} />
            ))}
            {TICKS.map((t) => (
              <text
                key={t.exp}
                data-scene-tick=""
                data-testid={`price-tick-${t.exp}`}
                x={xFor(10 ** t.exp)}
                y={AXIS_Y + 16}
                textAnchor={t.anchor}
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {usd(10 ** t.exp)}
              </text>
            ))}
            <text
              data-scene-axis=""
              x={PLOT_RIGHT}
              y={AXIS_Y + 34}
              textAnchor="end"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              listed price, US dollars
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each dot is one product at the price its maker or seller lists, read from the buyer&apos;s guide
            above, which dates each price. The ruler steps by ten times. Trossen&apos;s prices end in
            95 cents, dropped here; LimX lists the Oli at ¥158,000 at launch, about $21,800; NVIDIA&apos;s
            Jetson Thor prices are per module in 1,000-unit orders.
          </div>
          <div>
            Left off: parts lists (the SO-101 and Koch builds, the LEAP Hand), prices only others report (the
            Noetix Bumi, the GelSight Mini and DIGIT sensors), and rows the guide gives no price, among them
            AgiBot A2 and Agility Digit 5, which sell through sales contact or as a service.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Every listed price on the ladder"
            description={DESCRIPTION}
            rowHeader="product"
            columns={[
              { header: 'family' },
              { header: 'listed price (US dollars)', numeric: true },
            ]}
            rows={LADDER_POINTS.map((p) => ({
              label: p.label,
              values: [LADDER_ROWS.find((row) => row.id === p.row)!.label.toLowerCase(), p.priceUsd.toLocaleString('en-US')],
            }))}
          />
        </>
      }
      source={
        <span data-testid="hardware-price-ladder-source">
          {sourceIds.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  id
                )}
              </span>
            );
          })}
          .
        </span>
      }
    />
  );
}
