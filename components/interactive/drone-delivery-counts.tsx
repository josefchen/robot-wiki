'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  linearScale,
} from '@/components/motion/chart';
import {
  DELIVERY_COUNTS,
  DELIVERY_SOURCES,
  WALMART_NOVEMBER_2026,
  WING_ID,
  ZIPLINE_ID,
  ZIPLINE_JANUARY_2026,
  deliveryOf,
} from '@/lib/drone-deliveries';

/**
 * DroneDeliveryCounts: Zipline's and Wing's reported cumulative drone
 * deliveries as two bars on one ruler. Both are the companies' own lower
 * bounds, so each readout keeps its "more than" wording. Zipline takes
 * the accent. The chart is static: no controls, no state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 6, right: 330 } as const;
const MAX = 3e6;
const TICKS = [
  { value: 0, text: '0' },
  { value: 1e6, text: '1 million' },
  { value: 2e6, text: '2 million' },
  { value: 3e6, text: '3 million' },
] as const;
const TOP = 6;
const ROW_PITCH = 44;
const NAME_BASELINE = 14;
const BAR_OFFSET = 21;
const BAR_THICKNESS = 12;
const AXIS_Y = TOP + DELIVERY_COUNTS.length * ROW_PITCH + 6;
const HEIGHT = AXIS_Y + 40;
const sx = linearScale([0, MAX], [PLOT.left, PLOT.right]);
const f = (v: number) => Number(v.toFixed(2));

const ZIPLINE = deliveryOf(ZIPLINE_ID);
const WING = deliveryOf(WING_ID);

const CAPTION =
  "Each bar is a company's own lower bound on its own date; Walmart's 2 million are not added because they overlap Wing's and Zipline's counts.";
const DESCRIPTION = `Cumulative drone deliveries as the companies report them. Zipline reports ${ZIPLINE.readout} deliveries since its first commercial delivery in 2016, on a fact sheet read in October 2026. Wing reported ${WING.readout} commercial deliveries in June 2026. Both are lower bounds. Walmart's more than 2 million drone deliveries, reported in November 2026, are not added, because its providers include Wing and Zipline.`;

export function DroneDeliveryCounts({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="drone-delivery-counts"
      className={className}
      kicker="Deliveries, as the companies report them"
      heading="Zipline passed 3 million drone deliveries; Wing passed 1 million"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Cumulative drone deliveries reported by Zipline and Wing"
            aria-describedby={descriptionId}
            data-testid="drone-delivery-counts-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.slice(1).map((t) => (
                <line key={t.value} x1={f(sx(t.value))} x2={f(sx(t.value))} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
              <line x1={PLOT.left} x2={PLOT.left} y1={TOP} y2={AXIS_Y} />
            </g>
            {DELIVERY_COUNTS.map((count, i) => {
              const top = TOP + i * ROW_PITCH;
              const lead = count.id === ZIPLINE_ID;
              const end = f(sx(count.atLeast));
              return (
                <g
                  key={count.id}
                  data-testid={`drone-deliveries-${count.id}`}
                  data-series={count.id}
                  data-at-least={count.atLeast}
                >
                  <DirectLabel x={f(PLOT.left + 6)} y={top + NAME_BASELINE} seriesFor={count.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{count.operator}</tspan>
                  </DirectLabel>
                  {/* The readout ends at the plot's right edge on the name line: Zipline's bar
                      runs the full width, so there is no room after its end. */}
                  <text
                    data-scene-readout=""
                    x={PLOT.right}
                    y={top + NAME_BASELINE}
                    textAnchor="end"
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {count.readout}
                  </text>
                  <Bar
                    x={PLOT.left}
                    y={top + BAR_OFFSET}
                    width={f(end - PLOT.left)}
                    height={BAR_THICKNESS}
                    role={lead ? 'highlight' : 'measurement'}
                  />
                </g>
              );
            })}
            {TICKS.map((t, i) => (
              <text
                key={t.value}
                data-scene-tick=""
                x={f(sx(t.value))}
                y={AXIS_Y + 16}
                textAnchor={i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle'}
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {t.text}
              </text>
            ))}
            <text
              data-scene-axis=""
              x={PLOT.right}
              y={AXIS_Y + 34}
              textAnchor="end"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              deliveries made, all time
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each bar is the operator&apos;s own count, drawn to the lower bound it states. Zipline&apos;s safety fact
            sheet, a page it keeps current, said more than {ZIPLINE.atLeast / 1e6} million when read on 27 October
            2026; its January 2026 release had reported passing {ZIPLINE_JANUARY_2026 / 1e6} million. Wing&apos;s
            figure is from its 8 June 2026 post on its Walmart expansion. Walmart reported more
            than {WALMART_NOVEMBER_2026 / 1e6} million drone deliveries on 5 November 2026, made with providers
            including Wing and Zipline, so it overlaps both bars and is not drawn.
          </div>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary="Each operator's reported deliveries"
            description={DESCRIPTION}
            rowHeader="operator"
            columns={[{ header: 'deliveries, as reported' }, { header: 'as of' }]}
            rows={DELIVERY_COUNTS.map((d) => ({ label: d.operator, values: [d.readout, d.asOf] }))}
          />
        </>
      }
      source={
        <span data-testid="drone-delivery-counts-source">
          {DELIVERY_SOURCES.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? '; ' : null}
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
