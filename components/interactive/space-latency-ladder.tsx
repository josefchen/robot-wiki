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
  PointMarker,
  roleColour,
} from '@/components/motion/chart';
import {
  CAMERA_ID,
  DELAY_ROWS,
  GEO_ROUND_TRIP_SECONDS,
  MARS_AVERAGE_ROUND_TRIP_MINUTES,
  MARS_ID,
  MARS_ONE_WAY_MINUTES,
  MONOCULAR_SECONDS,
  MOON_ID,
  SPACE_LATENCY_SOURCES,
  delayOf,
} from '@/lib/space-latency';

/**
 * SpaceLatencyLadder: three delays on one ruler that steps by ten times,
 * a drone's own camera perception, a round trip to the Moon and a round
 * trip to Mars. Ranges draw as bars, a single value as a dot. The Mars
 * round trip takes the accent and carries JPL's note that it rules out
 * driving a rover from Earth. The chart is static: no controls, no
 * state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 10, right: 330 } as const;
const LOG = [-2, Math.log10(3600)] as const;
// No label at the 10-millisecond edge: at 375 px it would run into
// "1 second", and the camera readout already names milliseconds.
const TICKS = [
  { seconds: 1, text: '1 second', anchor: 'middle' as const },
  { seconds: 60, text: '1 minute', anchor: 'middle' as const },
  { seconds: 3600, text: '1 hour', anchor: 'end' as const },
];
const TOP = 6;
const ROW_PITCH = 40;
const NAME_BASELINE = 12;
const TRACK = 28;
const BAR_THICKNESS = 8;
// Stage text keeps its CSS size while the viewBox shrinks on phones, so the
// Mars note sits a full line plus margin below the readout it annotates.
const NOTE_OFFSET = 25;
const AXIS_Y = TOP + DELAY_ROWS.length * ROW_PITCH + 30;
const HEIGHT = AXIS_Y + 40;
const f = (v: number) => Number(v.toFixed(2));
const xFor = (seconds: number) =>
  f(PLOT.left + ((Math.log10(seconds) - LOG[0]) / (LOG[1] - LOG[0])) * (PLOT.right - PLOT.left));

const CAMERA = delayOf(CAMERA_ID);
const MOON = delayOf(MOON_ID);
const MARS = delayOf(MARS_ID);

const CAPTION =
  'Drones use two camera views to sense in hundredths of a second; Mars takes 8 to 40 minutes round-trip, so robots there must act independently.';
const DESCRIPTION = `Three delays on a compressed scale. The labeled ticks are one second, one minute and one hour: each is 60 times the previous one. A drone's stereo camera needs ${CAMERA.readout} from an obstacle coming into view to the start of a dodge, by Falanga and colleagues' bounds. A signal to the Moon and back takes ${MOON.readout}, and to Mars and back ${MARS.readout}, twice JPL's one-way ${MARS_ONE_WAY_MINUTES[0]} to ${MARS_ONE_WAY_MINUTES[1]} minutes. JPL says the Mars delay rules out driving a rover from Earth and motivates autonomy.`;

export function SpaceLatencyLadder({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="space-latency-ladder"
      className={className}
      kicker="Delays a robot works within"
      heading="Camera: hundredths of seconds; Mars replies: 8 to 40 minutes"
      stage={
        <FigureStage>
          <p className="font-sans text-sm leading-snug text-text">
            A drone’s camera reacts in hundredths of a second. <strong className="font-medium">Mars messages take 8 to 40 minutes there and back</strong>, so a rover must act on its own.
          </p>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Drone camera delay against round trips to the Moon and Mars"
            aria-describedby={descriptionId}
            data-testid="space-latency-ladder-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.map((t) => (
                <line key={t.seconds} x1={xFor(t.seconds)} x2={xFor(t.seconds)} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
            </g>
            {DELAY_ROWS.map((delay, i) => {
              const top = TOP + i * ROW_PITCH;
              const track = top + TRACK;
              const lead = delay.id === MARS_ID;
              const role = lead ? 'highlight' : 'measurement';
              const lo = xFor(delay.lowSeconds);
              const hi = xFor(delay.highSeconds);
              const range = delay.highSeconds > delay.lowSeconds;
              return (
                <g
                  key={delay.id}
                  data-testid={`space-latency-${delay.id}`}
                  data-series={delay.id}
                  data-low-seconds={delay.lowSeconds}
                  data-high-seconds={delay.highSeconds}
                >
                  <DirectLabel x={lead ? PLOT.right : PLOT.left} y={top + NAME_BASELINE} anchor={lead ? 'end' : 'start'} seriesFor={delay.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{delay.id === CAMERA_ID ? "Drone camera: hundredths of a second" : delay.label}</tspan>
                  </DirectLabel>
                  {range ? (
                    <Bar x={lo} y={f(track - BAR_THICKNESS / 2)} width={f(hi - lo)} height={BAR_THICKNESS} role={role} />
                  ) : (
                    <PointMarker x={lo} y={track} role={role} />
                  )}
                  <text
                    data-scene-readout=""
                    x={f(lead ? lo - 6 : hi + 8)}
                    y={track + 4}
                    textAnchor={lead ? 'end' : 'start'}
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {delay.readout}
                  </text>
                </g>
              );
            })}
            <text
              data-figure-annotation=""
              data-testid="space-latency-mars-note"
              data-series-label-for={MARS_ID}
              x={PLOT.right}
              y={TOP + (DELAY_ROWS.length - 1) * ROW_PITCH + TRACK + NOTE_OFFSET}
              textAnchor="end"
              fontSize={CHART_TYPE.labelPx}
              fill={roleColour('highlight')}
            >
              8 to 40 minutes round trip: rover acts on its own
            </text>
            {TICKS.map((t) => (
              <text
                key={t.seconds}
                data-scene-tick=""
                x={xFor(t.seconds)}
                y={AXIS_Y + 16}
                textAnchor={t.anchor}
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
              Delay; each tick is 60 times longer
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            JPL&apos;s 2024 progress report on navigation at the Moon and Mars gives a two-way delay of{' '}
            {GEO_ROUND_TRIP_SECONDS} seconds to geostationary orbit, {MOON.lowSeconds} seconds to the Moon and{' '}
            {MARS_AVERAGE_ROUND_TRIP_MINUTES} minutes on average to Mars, and a one-way light time to Mars of{' '}
            {MARS_ONE_WAY_MINUTES[0]} to {MARS_ONE_WAY_MINUTES[1]} minutes as the planets move. The Mars bar doubles
            that one-way range. The camera bar is Falanga, Kim and Scaramuzza&apos;s bound for a quadrotor&apos;s
            stereo camera: {CAMERA.lowSeconds} seconds, the frame period of the fastest sensor they found, to{' '}
            {CAMERA.highSeconds} seconds, a datasheet latency. Their monocular camera, {MONOCULAR_SECONDS[0]} to{' '}
            {MONOCULAR_SECONDS[1]} seconds, falls inside it.
          </div>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary="Each delay, shortest to longest"
            description={DESCRIPTION}
            rowHeader="delay"
            columns={[{ header: 'time', numeric: true }]}
            rows={DELAY_ROWS.map((d) => ({ label: d.row, values: [d.readout] }))}
          />
        </>
      }
      source={
        <span data-testid="space-latency-ladder-source">
          {SPACE_LATENCY_SOURCES.map((id, i) => {
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
