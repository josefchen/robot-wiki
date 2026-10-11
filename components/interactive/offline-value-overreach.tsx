'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PlotStage,
  SliderRow,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  LineTrace,
  PointMarker,
  StageAnnotation,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';

/**
 * OfflineValueOverreach: why offline reinforcement learning needs caution
 * about actions its data never tried. A learner fits a guess of how well
 * each action works from recorded tries. Inside the range the data covers
 * the guess follows the real results; outside it nothing corrects the
 * guess, and here it drifts upward, so a learner that picks the best-looking
 * action picks one nobody tried, which really works badly.
 *
 * The one control is how strongly the learner marks down actions far from
 * the data, the idea behind Conservative Q-Learning. Raising it pulls the
 * guess down outside the data, and the choice glides back to the best
 * tried action; reduced motion jumps there. Every curve is illustrative:
 * the shape of the problem is Levine and colleagues', the penalty CQL's.
 */

export const CAUTION_MAX = 10;
export const DEFAULT_CAUTION = 0;

/** The grip strengths the recorded tries used, from gentle (0) to hard (1). */
export const TRIED = [0.18, 0.23, 0.28, 0.33, 0.38, 0.43, 0.48, 0.53, 0.57] as const;
const TRIED_LOW = TRIED[0];
const TRIED_HIGH = TRIED[TRIED.length - 1];

/** How well a squeeze really works: best near the middle, poor when too hard. */
export const realResult = (x: number) => 0.15 + 0.7 * Math.exp(-(((x - 0.45) / 0.22) ** 2));
/** How far a squeeze lies outside the tried range. */
const outside = (x: number) => Math.max(0, TRIED_LOW - x, x - TRIED_HIGH);
/** The learner's guess: right where the data is, drifting up where it is not. */
const rawGuess = (x: number) => realResult(x) + 2.4 * outside(x) ** 1.1;
/** The guess after marking down untried actions, caution from 0 to 1. */
export const guess = (x: number, caution: number) => rawGuess(x) - 1.2 * caution * outside(x);

const GRID = Array.from({ length: 101 }, (_, k) => k / 100);

/** The squeeze the learner picks: the best-looking one under its guess. */
export function chosen(caution: number): number {
  let best = GRID[0];
  for (const x of GRID) if (guess(x, caution) > guess(best, caution)) best = x;
  return best;
}

export const isTried = (x: number) => x >= TRIED_LOW && x <= TRIED_HIGH;

/** The least caution, on the slider's scale, at which the choice is a tried squeeze. */
export const RETURN_AT = Array.from({ length: CAUTION_MAX + 1 }, (_, c) => c).find((c) =>
  isTried(chosen(c / CAUTION_MAX)),
) ?? CAUTION_MAX;

const WIDTH = 340;
const HEIGHT = 202;
const LEFT = 8;
const RIGHT = 332;
const TOP = 34;
const AXIS_Y = 176;
const Y_MAX = 1.15;
const sx = (x: number) => LEFT + x * (RIGHT - LEFT);
const sy = (v: number) => AXIS_Y - (v / Y_MAX) * (AXIS_Y - TOP);
const f = (v: number) => Number(v.toFixed(2));
const percent = (v: number) => Math.round(v * 100);
/** A value on a 0 to 100 score, the top of the drawing being 100. */
export const score = (v: number) => Math.round((v / Y_MAX) * 100);

const curve = (fn: (x: number) => number): ChartPoint[] => GRID.map((x) => [f(sx(x)), f(sy(fn(x)))]);
const REAL_CURVE = curve(realResult);

function describe(caution: number): string {
  const c = caution / CAUTION_MAX;
  const x = chosen(c);
  return `With caution at ${caution} of ${CAUTION_MAX}, the learner picks a squeeze ${percent(x)}% of the way from gentle to hard, ${isTried(x) ? 'inside' : 'outside'} the tried range of ${percent(TRIED_LOW)}% to ${percent(TRIED_HIGH)}%; it expects a score of ${score(guess(x, c))} out of 100 and really gets ${score(realResult(x))}.`;
}

const SAMPLE_CAUTIONS = [0, RETURN_AT - 1, RETURN_AT, CAUTION_MAX] as const;

export function OfflineValueOverreach({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-caution`;
  const citationFor = useCitationLookup();
  const tutorial = citationFor('offline-rl-tutorial-2020');
  const cql = citationFor('cql-2020');
  const [caution, setCaution] = useState(DEFAULT_CAUTION);
  const target = caution / CAUTION_MAX;
  const pick = chosen(target);
  const tried = isTried(pick);
  const shownCaution = useEasedValue(target);
  const shownPick = useEasedValue(pick);
  const accent = roleColour('highlight');

  const px = f(sx(shownPick));
  const expected = f(sy(guess(shownPick, shownCaution)));
  const real = f(sy(realResult(shownPick)));
  const valueText = caution === 0 ? 'none' : caution === CAUTION_MAX ? 'strong' : `${caution} of ${CAUTION_MAX}`;

  return (
    <InstrumentFigure
      figureId="offline-value-overreach"
      className={className}
      kicker="Distributional shift"
      heading="Recorded data alone overrates untried actions"
      controls={
        <SliderRow
          htmlFor={sliderId}
          label="Caution about untried actions"
          value={<span data-testid="overreach-caution">{valueText}</span>}
        >
          <input
            id={sliderId}
            type="range"
            data-brand-control-id="control:input"
            min={0}
            max={CAUTION_MAX}
            step={1}
            value={caution}
            onChange={(e) => setCaution(Number(e.target.value))}
            aria-label={`Caution about untried actions, from 0 to ${CAUTION_MAX}, currently ${caution}`}
            aria-valuetext={`${caution} of ${CAUTION_MAX}; the learner picks ${tried ? 'the best squeeze it tried' : 'a squeeze nobody tried, which really works badly'}`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
        </SliderRow>
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative curves</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A learner's guess of how well each grip works, against the real results. ${tried ? 'With enough caution it picks the best grip it tried.' : 'It picks a hard grip nobody tried, which it rates highly but which really works badly.'}`}
            aria-describedby={descriptionId}
            data-testid="overreach-stage"
          >
            <text data-scene-axis="" x={LEFT} y={TOP - 18} fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              how well it works
            </text>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} />
            </g>
            <g data-testid="overreach-tried-range" stroke={CHART_STRUCTURE.labelSecondary} strokeWidth={CHART_STROKE.structure}>
              <line x1={f(sx(TRIED_LOW))} y1={AXIS_Y - 8} x2={f(sx(TRIED_HIGH))} y2={AXIS_Y - 8} />
              <line x1={f(sx(TRIED_LOW))} y1={AXIS_Y - 12} x2={f(sx(TRIED_LOW))} y2={AXIS_Y - 4} />
              <line x1={f(sx(TRIED_HIGH))} y1={AXIS_Y - 12} x2={f(sx(TRIED_HIGH))} y2={AXIS_Y - 4} />
            </g>
            <DirectLabel x={f(sx((TRIED_LOW + TRIED_HIGH) / 2))} y={AXIS_Y - 16} anchor="middle">
              tried in the data
            </DirectLabel>
            <g data-series="real">
              <LineTrace points={REAL_CURVE} role="reference" />
            </g>
            <text x={f(sx(0.72))} y={AXIS_Y - 8} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              real result
            </text>
            <g data-series="guess" data-testid="overreach-guess">
              <LineTrace points={curve((x) => guess(x, shownCaution))} role="state" />
            </g>
            <DirectLabel x={LEFT} y={f(sy(guess(0, shownCaution)) - 14)}>
              learner&apos;s guess
            </DirectLabel>
            <g data-series="tries">
              {TRIED.map((x) => (
                <PointMarker key={x} x={f(sx(x))} y={f(sy(realResult(x)))} role="measurement" />
              ))}
            </g>
            <g data-testid="overreach-choice" data-tried={tried ? 'yes' : 'no'} data-chart-role="highlight">
              {Math.abs(expected - real) > 2 ? (
                <line x1={px} y1={expected} x2={px} y2={real} stroke={accent} strokeWidth={CHART_STROKE.structure} strokeDasharray="2 3" />
              ) : null}
              <circle cx={px} cy={expected} r={CHART_STROKE.markerRadius + 1} fill={accent} />
              <circle cx={px} cy={real} r={CHART_STROKE.markerRadius + 1} fill="none" stroke={accent} strokeWidth={CHART_STROKE.structure} />
            </g>
            {tried ? (
              <StageAnnotation x={px} y={f(expected - 14)} anchor="middle" lines={['Picks the best tried squeeze']} />
            ) : (
              <StageAnnotation
                x={f(px - 42)}
                y={TOP + 2}
                anchor="end"
                lines={['Picks an untried squeeze;', 'it works badly']}
                from={[f(px - 38), TOP - 2]}
                target={[px, expected]}
                pointer="arrow"
              />
            )}
            <text data-scene-tick="" x={LEFT} y={AXIS_Y + 6} dominantBaseline="hanging" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              gentle
            </text>
            <text data-scene-axis="" x={(LEFT + RIGHT) / 2} y={AXIS_Y + 6} dominantBaseline="hanging" textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              grip strength
            </text>
            <text data-scene-tick="" x={RIGHT} y={AXIS_Y + 6} dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              hard
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="Marking down untried actions keeps an offline learner's choice where its data can vouch for it."
      method={
        <>
          <div>
            The dots are recorded tries of one grip at different strengths, with how well each worked. The learner
            fits a guess of how well every strength works. Where tries exist the guess follows them; beyond the last
            try nothing checks it, and here it drifts upward. A learner that picks the best-looking strength then
            picks one nobody tried, and the real result there is poor. Levine and colleagues name this the central
            difficulty of offline reinforcement learning: the value function overrates actions the data never
            tested, and no live trial corrects it.
          </div>
          <div>
            Conservative Q-Learning marks down the value of actions outside the data while keeping the values of
            the tried ones. The slider sets how strongly; here the choice returns to the tried range from {RETURN_AT} of{' '}
            {CAUTION_MAX}.
            Every curve is illustrative, drawn to show the shape of the problem, not taken from a trained robot.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Which squeeze the learner picks at each caution"
            description={describe(caution)}
            rowHeader="caution (of 10)"
            columns={[
              { header: 'squeeze picked (% of the way to hard)', numeric: true },
              { header: 'expected score (of 100)', numeric: true },
              { header: 'real score (of 100)', numeric: true },
            ]}
            rows={[...new Set([...SAMPLE_CAUTIONS, caution])]
              .sort((a, b) => a - b)
              .map((c) => {
                const x = chosen(c / CAUTION_MAX);
                return {
                  label: String(c),
                  values: [String(percent(x)), String(score(guess(x, c / CAUTION_MAX))), String(score(realResult(x)))],
                };
              })}
          />
        </>
      }
      source={
        <span data-testid="overreach-source">
          {tutorial ? (
            <a data-brand-control-id="control:link-focus" href={tutorial.url} target="_blank" rel="noopener" className="underline-offset-2">
              {tutorial.label}
            </a>
          ) : (
            'Levine and colleagues'
          )}
          ;{' '}
          {cql ? (
            <a data-brand-control-id="control:link-focus" href={cql.url} target="_blank" rel="noopener" className="underline-offset-2">
              {cql.label}
            </a>
          ) : (
            'Conservative Q-Learning'
          )}
          .
        </span>
      }
    />
  );
}
