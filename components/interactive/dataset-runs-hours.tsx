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
import {
  DATASET_RUNS_HOURS,
  LONG_RUN_ID,
  runLengthInWords,
  secondsPerRun,
  type DatasetRunsHours as Dataset,
} from '@/lib/dataset-runs-hours';

/**
 * DatasetRunsHours: five robot datasets placed by how many runs they
 * recorded (across) and how many hours those runs add up to (up), both on
 * ten-times rulers. One dashed diagonal marks an average of one minute a
 * run: FineART sits above it, the other four well below. The chart is
 * static: no controls, no state, no motion. Label positions are authored
 * for these five points, which cluster near 100,000 runs. The run lengths
 * are left to the caption: stage text keeps its CSS size while the plot
 * narrows, so a phrase beside a point would cross the diagonal on a phone.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 44, right: 326, top: 40, bottom: 214 } as const;
const HEIGHT = PLOT.bottom + 46;
const RUNS_LOG = [4, 6.2] as const;
const HOURS_LOG = [2, 3.6] as const;
const RUN_TICKS = [
  { exp: 4, label: '10,000' },
  { exp: 5, label: '100,000' },
  { exp: 6, label: '1 million' },
] as const;
// 100 is the floor of the ruler and stays unlabelled: on a phone it would
// run into the 10,000 below it.
const HOUR_TICKS = [
  { value: 300, label: '300' },
  { value: 1000, label: '1,000' },
  { value: 3000, label: '3,000' },
] as const;
/** The reference diagonal: an average run of one minute. */
const DIAGONAL_SECONDS = 60;
const MARKER_R = CHART_STROKE.markerRadius;
const f = (v: number) => Number(v.toFixed(2));

const xFor = (runs: number) =>
  f(PLOT.left + ((Math.log10(runs) - RUNS_LOG[0]) / (RUNS_LOG[1] - RUNS_LOG[0])) * (PLOT.right - PLOT.left));
const yFor = (hours: number) =>
  f(PLOT.bottom - ((Math.log10(hours) - HOURS_LOG[0]) / (HOURS_LOG[1] - HOURS_LOG[0])) * (PLOT.bottom - PLOT.top));

/** The diagonal clipped to the plot: hours = runs x seconds / 3,600. */
function diagonal(seconds: number): [number, number, number, number] {
  const offset = Math.log10(seconds / 3600);
  const lo = Math.max(RUNS_LOG[0], HOURS_LOG[0] - offset);
  const hi = Math.min(RUNS_LOG[1], HOURS_LOG[1] - offset);
  return [xFor(10 ** lo), yFor(10 ** (lo + offset)), xFor(10 ** hi), yFor(10 ** (hi + offset))];
}

type Placement = { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
/** Where each name sits from its point, clear of the diagonal and its neighbours. */
const PLACEMENT: Record<string, Placement> = {
  fineart: { dx: 0, dy: -10, anchor: 'middle' },
  droid: { dx: -7, dy: 4, anchor: 'end' },
  galaxea: { dx: -7, dy: 4, anchor: 'end' },
  robomind: { dx: 7, dy: 4, anchor: 'start' },
  agibot: { dx: -7, dy: 4, anchor: 'end' },
};

const BY_RUNS = [...DATASET_RUNS_HOURS].sort((a, b) => b.runs - a.runs);
const MOST_RUNS = BY_RUNS[0];
const LONG = DATASET_RUNS_HOURS.find((d) => d.id === LONG_RUN_ID)!;
const OTHERS = DATASET_RUNS_HOURS.filter((d) => d.id !== LONG_RUN_ID);
const RUN_RATIO = Math.round(MOST_RUNS.runs / LONG.runs);
const shortest = Math.min(...OTHERS.map(secondsPerRun));
const longestOther = Math.max(...OTHERS.map(secondsPerRun));

const CAPTION = `AgiBot World has about ${RUN_RATIO} times FineART's runs but under twice its hours. FineART's runs average ${runLengthInWords(secondsPerRun(LONG))}, the others under 20 seconds.`;

const DESCRIPTION = `Five robot datasets by runs and hours: ${DATASET_RUNS_HOURS.map(
  (d) => `${d.label} ${d.runs.toLocaleString('en-US')} runs and ${d.hours.toLocaleString('en-US')} hours`,
).join(', ')}. AgiBot World has about ${RUN_RATIO} times FineART's runs but ${(MOST_RUNS.hours / LONG.hours).toFixed(1)} times its hours, because FineART's runs average ${runLengthInWords(secondsPerRun(LONG))} and the other four average ${Math.round(shortest)} to ${Math.round(longestOther)} seconds.`;

function Point({ d }: { d: Dataset }) {
  const x = xFor(d.runs);
  const y = yFor(d.hours);
  const lead = d.id === LONG_RUN_ID;
  const place = PLACEMENT[d.id];
  const role = lead ? 'highlight' : 'measurement';
  const labelY = f(y + place.dy);
  return (
    <g data-testid={`dataset-point-${d.id}`} data-series={d.id} data-runs={d.runs} data-hours={d.hours}>
      <circle
        data-chart-mark="dot"
        data-chart-role={role}
        cx={x}
        cy={y}
        r={lead ? MARKER_R + 1 : MARKER_R}
        fill={roleColour(role)}
      />
      <DirectLabel x={f(x + place.dx)} y={labelY} anchor={place.anchor} seriesFor={d.id}>
        <tspan fontWeight={lead ? 700 : 600}>{d.label}</tspan>
      </DirectLabel>
    </g>
  );
}

export function DatasetRunsHours({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  const [x1, y1, x2, y2] = diagonal(DIAGONAL_SECONDS);

  return (
    <InstrumentFigure
      figureId="dataset-runs-hours"
      className={className}
      kicker="Five robot datasets"
      heading="Run counts and hours rank these datasets differently"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Recorded runs against recorded hours for five robot datasets"
            aria-describedby={descriptionId}
            data-testid="dataset-runs-hours-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} opacity={CHART_STRUCTURE.gridOpacity}>
              {RUN_TICKS.map((t) => (
                <line key={t.exp} x1={xFor(10 ** t.exp)} x2={xFor(10 ** t.exp)} y1={PLOT.top} y2={PLOT.bottom} />
              ))}
              {HOUR_TICKS.map((t) => (
                <line key={t.value} x1={PLOT.left} x2={PLOT.right} y1={yFor(t.value)} y2={yFor(t.value)} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} opacity={CHART_STRUCTURE.axesOpacity}>
              <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
              <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} />
            </g>
            <text
              data-scene-axis=""
              x={0}
              y={14}
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              hours recorded
            </text>
            {HOUR_TICKS.map((t) => (
              <text
                key={t.value}
                data-scene-tick=""
                data-testid={`hours-tick-${t.value}`}
                x={PLOT.left - 5}
                y={f(yFor(t.value) + 4)}
                textAnchor="end"
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {t.label}
              </text>
            ))}
            {RUN_TICKS.map((t) => (
              <text
                key={t.exp}
                data-scene-tick=""
                data-testid={`runs-tick-${t.exp}`}
                x={xFor(10 ** t.exp)}
                y={PLOT.bottom + 16}
                textAnchor="middle"
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {t.label}
              </text>
            ))}
            <text
              data-scene-axis=""
              x={PLOT.right}
              y={PLOT.bottom + 36}
              textAnchor="end"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              runs recorded
            </text>
            <g data-testid="minute-diagonal">
              <line
                data-chart-role="reference"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <text
                data-chart-label=""
                data-chart-role="reference"
                x={x2}
                y={f(PLOT.top - 6)}
                textAnchor="middle"
                fontSize={CHART_TYPE.labelPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                1 minute a run
              </text>
            </g>
            {DATASET_RUNS_HOURS.map((d) => (
              <Point key={d.id} d={d} />
            ))}
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each point is one dataset&apos;s own totals: the runs it recorded (the papers say trajectories or
            episodes) and the hours they add up to. Both rulers step by ten times. The run lengths are
            hours times 3,600 divided by runs; the dashed line is where an average run lasts one minute.
          </div>
          <ul className="list-disc space-y-1 pl-5" data-testid="dataset-runs-hours-notes">
            {DATASET_RUNS_HOURS.map((d) => (
              <li key={d.id}>
                {d.label}: {d.runsAsPrinted ? `${d.runsAsPrinted} runs as printed` : `${d.runs.toLocaleString('en-US')} runs`},{' '}
                {d.hours.toLocaleString('en-US')} hours, about {runLengthInWords(secondsPerRun(d))} a run.
              </li>
            ))}
          </ul>
          <div>
            RoboMIND&apos;s total mixes real and simulated runs, and AgiBot World is its Beta release.
            BridgeData V2 is left off: it reports 60,096 trajectories but no total hours, and its 5 Hz
            recording rate is stated for the teleoperated runs only, so any hours figure would be a guess.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Runs, hours and average run length per dataset"
            description={DESCRIPTION}
            rowHeader="dataset"
            columns={[
              { header: 'runs', numeric: true },
              { header: 'hours', numeric: true },
              { header: 'seconds per run', numeric: true },
            ]}
            rows={DATASET_RUNS_HOURS.map((d) => ({
              label: d.label,
              values: [d.runs.toLocaleString('en-US'), d.hours.toLocaleString('en-US'), Math.round(secondsPerRun(d)).toLocaleString('en-US')],
            }))}
          />
        </>
      }
      source={
        <span data-testid="dataset-runs-hours-source">
          {DATASET_RUNS_HOURS.map((d, i) => {
            const record = citationFor(d.citationId);
            return (
              <span key={d.id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  d.label
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
