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
  PointMarker,
  linearScale,
} from '@/components/motion/chart';
import {
  A2RL_2026_ID,
  CHAMPIONS_SOURCES,
  LEAD_CONTEST_ID,
  MONORACE_ID,
  RACING_CONTESTS,
  SWIFT_ID,
  contestOf,
  yearOf,
} from '@/lib/drone-racing-champions';

/**
 * DroneChampionsTimeline: three contests between autonomous racing drones
 * and human champions on one time axis, each on its own row. A dot marks
 * an AI win and a cross the human win, so the outcome reads without
 * colour; the 2026 loss takes the accent. The chart is static: no
 * controls, no state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 10, right: 330 } as const;
const DOMAIN = [2023, 2026.5] as const;
const TICKS = [2023, 2024, 2025, 2026] as const;
const TOP = 6;
const ROW_PITCH = 42;
const NAME_BASELINE = 12;
const TRACK = 28;
const AXIS_Y = TOP + RACING_CONTESTS.length * ROW_PITCH + 6;
const HEIGHT = AXIS_Y + 40;
const sx = linearScale(DOMAIN, [PLOT.left, PLOT.right]);
const f = (v: number) => Number(v.toFixed(2));

/** Readouts sit right of the mark unless they would run past the plot. */
const READOUT_SIDE: Record<string, 'start' | 'end'> = {
  [SWIFT_ID]: 'start',
  [MONORACE_ID]: 'end',
  [A2RL_2026_ID]: 'end',
};

const SWIFT = contestOf(SWIFT_ID);

const CAPTION =
  'Dots mark drone wins in 2023 and 2025; the cross marks the 2026 final, lost on a gate strike.';
const DESCRIPTION = `Three contests between autonomous racing drones and human champions. Swift, from the University of Zurich, ${SWIFT.readout} against three champions in its own lab, reported in Nature in August 2023. In April 2025 TU Delft's MonoRace won the A2RL race in Abu Dhabi, beating three human world champions in a knockout on hardware and a track the organizers set. In January 2026 world FPV champion Minchan Kim beat TII Racing's drone in a best-of-nine final: at four wins each, the drone struck a gate in the deciding race and could not recover.`;

export function DroneChampionsTimeline({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="drone-champions-timeline"
      className={className}
      kicker="AI against human racing champions"
      heading="Drones won twice; a gate collision decided the 2026 final"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Three races between autonomous drones and human champions, 2023 to 2026"
            aria-describedby={descriptionId}
            data-testid="drone-champions-timeline-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.map((t) => (
                <line key={t} x1={f(sx(t))} x2={f(sx(t))} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
            </g>
            {RACING_CONTESTS.map((contest, i) => {
              const top = TOP + i * ROW_PITCH;
              const track = top + TRACK;
              const lead = contest.id === LEAD_CONTEST_ID;
              const x = f(sx(yearOf(contest)));
              const side = READOUT_SIDE[contest.id];
              return (
                <g
                  key={contest.id}
                  data-testid={`drone-champions-${contest.id}`}
                  data-series={contest.id}
                  data-outcome={contest.outcome}
                  data-year={contest.year}
                  data-month={contest.month}
                >
                  <DirectLabel x={PLOT.left} y={top + NAME_BASELINE} seriesFor={contest.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{contest.label}</tspan>
                  </DirectLabel>
                  <PointMarker
                    x={x}
                    y={track}
                    role={lead ? 'highlight' : 'measurement'}
                    shape={contest.outcome === 'ai-won' ? 'dot' : 'cross'}
                  />
                  <text
                    data-scene-readout=""
                    x={f(side === 'start' ? x + 8 : x - 8)}
                    y={track + 4}
                    textAnchor={side}
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {contest.id === A2RL_2026_ID ? 'hit gate; lost decider at 4 to 4' : contest.readout}
                  </text>
                </g>
              );
            })}
            {TICKS.map((t, i) => (
              <text
                key={t}
                data-scene-tick=""
                x={f(sx(t))}
                y={AXIS_Y + 16}
                textAnchor={i === 0 ? 'start' : 'middle'}
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
              month announced
            </text>
          </PlotStage>
          <p className="font-sans text-sm leading-snug text-text-dim">
            A2RL: Abu Dhabi Autonomous Racing League. TII Racing: Technology Innovation Institute&apos;s team.
          </p>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each contest sits at the month its result was announced. Swift beat Alex Vanover 5 of 9, Thomas Bitmatta
            4 of 7 and Marvin Schaepper 6 of 9, in races held before January 2023.
          </div>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary="Each contest, its result and its setting"
            description={DESCRIPTION}
            rowHeader="contest"
            columns={[{ header: 'announced' }, { header: 'result' }, { header: 'setting' }]}
            rows={RACING_CONTESTS.map((c) => ({ label: c.row, values: [c.when, c.result, c.setting] }))}
          />
        </>
      }
      source={
        <span data-testid="drone-champions-timeline-source">
          {CHAMPIONS_SOURCES.map((id, i) => {
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
