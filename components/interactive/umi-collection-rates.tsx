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
  UMI_COLLECTION_RATES,
  UMI_RATES_CITATION_ID,
  UMI_RATE_ID,
  rateOf,
} from '@/lib/umi-collection-rates';

/**
 * UmiCollectionRates: demonstrations recorded per hour on UMI's
 * cup-arrangement task, three ways: by bare hand, with the UMI handheld
 * gripper, and by teleoperating a robot with a spacemouse. One bar per way,
 * its name on the line above, the count at its end. UMI, the series the
 * page is about, takes the accent. The chart is static: no controls, no
 * state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 2, right: 300 } as const;
const MAX = 250;
const TICKS = [0, 100, 200] as const;
const TOP = 8;
const ROW_PITCH = 46;
const NAME_BASELINE = 14;
const BAR_OFFSET = 22;
const BAR_THICKNESS = 12;
const AXIS_Y = TOP + UMI_COLLECTION_RATES.length * ROW_PITCH + 6;
const HEIGHT = AXIS_Y + 40;
const sx = linearScale([0, MAX], [PLOT.left, PLOT.right]);
const f = (v: number) => Number(v.toFixed(2));

const UMI = rateOf(UMI_RATE_ID);
const HAND = rateOf('bare-hand');
const TELEOP = rateOf('spacemouse');

const CAPTION = `On one cup-arrangement task, UMI's gripper recorded ${UMI} demonstrations an hour: about half the bare hand's ${HAND}, and over three times teleoperation's ${TELEOP}.`;
const DESCRIPTION = `Demonstrations recorded per hour on UMI's cup-arrangement task: ${HAND} by bare hand with no robot, ${UMI} with the UMI handheld gripper and ${TELEOP} by spacemouse teleoperation of a robot. The UMI gripper ran at ${Math.round((UMI / HAND) * 100)} percent of bare-hand speed and ${(UMI / TELEOP).toFixed(1)} times the teleoperation rate.`;

export function UmiCollectionRates({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  const record = citationFor(UMI_RATES_CITATION_ID);

  return (
    <InstrumentFigure
      figureId="umi-collection-rates"
      className={className}
      kicker="Demonstrations per hour"
      heading="Holding the gripper was three times faster than teleoperation"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Demonstrations per hour by bare hand, UMI gripper and spacemouse teleoperation"
            aria-describedby={descriptionId}
            data-testid="umi-collection-rates-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.slice(1).map((t) => (
                <line key={t} x1={f(sx(t))} x2={f(sx(t))} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
              <line x1={PLOT.left} x2={PLOT.left} y1={TOP} y2={AXIS_Y} />
            </g>
            {UMI_COLLECTION_RATES.map((rate, i) => {
              const top = TOP + i * ROW_PITCH;
              const lead = rate.id === UMI_RATE_ID;
              const end = f(sx(rate.perHour));
              return (
                <g key={rate.id} data-testid={`umi-rate-${rate.id}`} data-series={rate.id} data-per-hour={rate.perHour}>
                  <DirectLabel x={f(PLOT.left + 6)} y={top + NAME_BASELINE} seriesFor={rate.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{rate.label}</tspan>
                  </DirectLabel>
                  <Bar
                    x={PLOT.left}
                    y={top + BAR_OFFSET}
                    width={f(end - PLOT.left)}
                    height={BAR_THICKNESS}
                    role={lead ? 'highlight' : 'measurement'}
                  />
                  <text
                    data-scene-readout=""
                    x={f(end + 6)}
                    y={f(top + BAR_OFFSET + BAR_THICKNESS - 2)}
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {rate.perHour}
                  </text>
                </g>
              );
            })}
            {TICKS.map((t) => (
              <text
                key={t}
                data-scene-tick=""
                x={f(sx(t))}
                y={AXIS_Y + 16}
                textAnchor={t === 0 ? 'start' : 'middle'}
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {t}
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
              demonstrations per hour
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            The UMI project site reports these rates for one task, arranging a cup. The bare hand records no
            robot data; it is the speed the gripper is measured against. The spacemouse drives a robot arm
            directly.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Demonstrations per hour, three ways"
            description={DESCRIPTION}
            rowHeader="collection method"
            columns={[{ header: 'demonstrations per hour', numeric: true }]}
            rows={UMI_COLLECTION_RATES.map((r) => ({ label: r.label, values: [String(r.perHour)] }))}
          />
        </>
      }
      source={
        <span data-testid="umi-collection-rates-source">
          {record ? (
            <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
              {record.label}
            </a>
          ) : (
            'UMI project site'
          )}
          .
        </span>
      }
    />
  );
}
