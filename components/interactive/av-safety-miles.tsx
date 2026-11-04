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
  roleColour,
} from '@/components/motion/chart';
import {
  AV_SAFETY_CITATION_ID,
  FATALITY_ID,
  FLEET_YEARS,
  SAFETY_BENCHMARKS,
  benchmarkOf,
} from '@/lib/av-safety-miles';

/**
 * AvSafetyMiles: the failure-free miles Kalra and Paddock's RAND study
 * says a driverless fleet must drive to show, at 95 percent confidence,
 * that it fails no more often than human drivers, against three human
 * benchmarks on a ruler that steps by ten times. The deaths benchmark
 * takes the accent and carries the report's 12.5-year fleet note. The
 * chart is static: no controls, no state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 10, right: 330 } as const;
const LOG = [6, 9] as const;
const TICKS = [
  { exp: 6, text: '1 million', anchor: 'start' as const },
  { exp: 7, text: '10 million', anchor: 'middle' as const },
  { exp: 8, text: '100 million', anchor: 'middle' as const },
  { exp: 9, text: '1 billion', anchor: 'end' as const },
];
const TOP = 6;
const ROW_PITCH = 40;
const NAME_BASELINE = 12;
const TRACK = 28;
// Stage text keeps its CSS size while the viewBox shrinks on phones, so the
// note sits a full line plus margin below the readout it annotates.
const NOTE_OFFSET = 25;
const NOTE_GAP = 22;
const LEAD_INDEX = SAFETY_BENCHMARKS.findIndex((b) => b.id === FATALITY_ID);
const rowTop = (i: number) => TOP + i * ROW_PITCH + (i > LEAD_INDEX ? NOTE_GAP : 0);
const AXIS_Y = rowTop(SAFETY_BENCHMARKS.length - 1) + ROW_PITCH;
const HEIGHT = AXIS_Y + 40;
const f = (v: number) => Number(v.toFixed(2));
const xFor = (miles: number) =>
  f(PLOT.left + ((Math.log10(miles) - LOG[0]) / (LOG[1] - LOG[0])) * (PLOT.right - PLOT.left));

const DEATHS = benchmarkOf(FATALITY_ID);
const INJURIES = benchmarkOf('injuries');
const CRASHES = benchmarkOf('crashes');

const CAPTION = 'At 95% confidence, 275 million miles without a fatality supports a rate no higher than the study’s US human-driver benchmark.';
const DESCRIPTION = `Miles a driverless fleet must drive with no failure to show, with 95% confidence, that its failure rate is no higher than human drivers', from Kalra and Paddock's RAND study: ${DEATHS.printedText} miles against ${DEATHS.per100MillionMiles} deaths per 100 million miles, ${INJURIES.printedText} against ${INJURIES.per100MillionMiles} reported injuries and ${CRASHES.printedText} against ${CRASHES.per100MillionMiles} reported crashes. The deaths test would take a fleet of 100 cars driving around the clock about ${FLEET_YEARS} years. These are lower bounds that assume perfect driving.`;

export function AvSafetyMiles({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  const record = citationFor(AV_SAFETY_CITATION_ID);

  return (
    <InstrumentFigure
      figureId="av-safety-miles"
      className={className}
      kicker="Miles needed to prove safety"
      heading="Fleet: 275 million miles without deaths, at 95% confidence"
      stage={
        <FigureStage>
          <div className="grid gap-2 pb-3 font-sans leading-snug text-text" data-testid="av-confidence-summary">
            <dl className="grid gap-2">
              <div data-testid="av-required-run" className="grid gap-1">
                <dt className="text-lg font-medium">Required fleet run at <span className="font-mono text-2xl">95%</span> confidence</dt>
                <dd className="flex flex-wrap gap-x-4 font-mono text-2xl font-medium"><span>275 million miles</span>{' '}<span className="whitespace-nowrap">0 deaths</span></dd>
              </div>
              <div data-testid="av-upper-limit" className="grid gap-1">
                <dt className="text-base">Calculated upper bound for this hypothetical run</dt>
                <dd className="grid gap-2">
                  <p className="text-lg">About <strong className="font-mono text-2xl font-medium">1.09</strong> deaths per 100 million miles</p>
                  <p className="text-lg font-medium">No higher than the study’s US human-driver benchmark</p>
                  <p data-testid="av-confidence-coverage" className="text-sm">
                    The true fatality rate remains unknown. In the long run, at least 95 out of 100 upper bounds from studies of the same design would reach or exceed it.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Failure-free miles needed to match human death, injury and crash rates"
            aria-describedby={descriptionId}
            data-testid="av-safety-miles-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.map((t) => (
                <line key={t.exp} x1={xFor(10 ** t.exp)} x2={xFor(10 ** t.exp)} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
            </g>
            {SAFETY_BENCHMARKS.map((benchmark, i) => {
              const top = rowTop(i);
              const track = top + TRACK;
              const lead = benchmark.id === FATALITY_ID;
              const x = xFor(benchmark.printedMiles);
              return (
                <g
                  key={benchmark.id}
                  data-testid={`av-safety-miles-${benchmark.id}`}
                  data-series={benchmark.id}
                  data-miles={benchmark.printedMiles}
                >
                  <DirectLabel x={PLOT.left} y={top + NAME_BASELINE} seriesFor={benchmark.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{benchmark.label}</tspan>
                  </DirectLabel>
                  <line
                    x1={PLOT.left}
                    x2={PLOT.right}
                    y1={track}
                    y2={track}
                    stroke={CHART_STRUCTURE.grid}
                    strokeWidth={CHART_STROKE.structure}
                  />
                  <PointMarker x={x} y={track} role={lead ? 'highlight' : 'measurement'} />
                  <text
                    data-scene-readout=""
                    x={f(lead ? x - 8 : x + 8)}
                    y={track + 4}
                    textAnchor={lead ? 'end' : 'start'}
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {benchmark.printedText}; no {lead ? 'death' : benchmark.id === 'injuries' ? 'reported injury' : 'reported crash'}
                  </text>
                  {lead ? (
                    <text
                      data-figure-annotation=""
                      data-testid="av-safety-miles-fleet-years"
                      data-series-label-for={benchmark.id}
                      x={PLOT.left}
                      y={track + NOTE_OFFSET}
                      fontSize={CHART_TYPE.labelPx}
                      fill={roleColour('highlight')}
                    >
                      {`about ${FLEET_YEARS} years for 100 cars driving nonstop`}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {TICKS.map((t) => (
              <text
                key={t.exp}
                data-scene-tick=""
                x={xFor(10 ** t.exp)}
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
              Required miles; each tick is ten times farther
            </text>
          </PlotStage>

        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <p data-testid="av-model-assumptions">
            This is a hypothetical test with a fixed distance and zero deaths. The model assumes independent miles
            with the same failure probability on every mile. The study’s 2013 US benchmark includes all motor vehicles.
          </p>
          <p data-testid="av-rare-event-explanation" className="font-sans text-sm leading-snug text-text">
            Under the study’s per-mile model, a fleet at the US benchmark rate would finish this many miles without a death only about 1 time in 20. A higher fatality rate makes that result still less likely.
          </p>
          <div>
            Kalra and Paddock treat each mile as a trial that either fails or does not. If the chance of no
            failure in a mile is R, the miles n that must pass without one to show the rate at confidence C are
            n = ln(1 − C) / ln(R), their Eq. 2. The figure plots the first row of their Table 1, at C = 95%,
            against the total rates of human drivers in the United States: {DEATHS.per100MillionMiles} deaths and{' '}
            {INJURIES.per100MillionMiles} reported injuries per 100 million miles in 2013, and{' '}
            {CRASHES.per100MillionMiles} reported crashes per 100 million miles. The {FLEET_YEARS} years assume 100
            cars at 25 miles per hour, 24 hours a day. A fleet that has any failures needs more miles. Showing, with
            80% power, that a fleet is 20% better than human drivers on deaths takes 11 billion miles, their row 3.
          </div>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary="Failure-free miles for each human benchmark"
            description={DESCRIPTION}
            rowHeader="human benchmark"
            columns={[{ header: 'failure-free miles at 95% confidence', numeric: true }]}
            rows={SAFETY_BENCHMARKS.map((b) => ({ label: b.row, values: [b.printedText] }))}
          />
        </>
      }
      source={
        <span data-testid="av-safety-miles-source">
          {record ? (
            <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
              {record.label}
            </a>
          ) : (
            'Kalra and Paddock, RAND, 2016'
          )}
          .
        </span>
      }
    />
  );
}
