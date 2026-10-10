'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  ChartAxes,
  LegendSwatch,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  linearScale,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import {
  MAX_HORIZON,
  REWARD_ERROR_GAIN,
  TYPICAL_HORIZON,
  deviationAt,
  imagineDeviation,
  rewardPredictionError,
} from '@/lib/latent-imagination';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * LatentImagination: an illustrative compounding-error toy, drawn as a
 * thrown ball. The dashed arc is the real flight; the solid arc is the
 * flight the robot imagines one step at a time, which falls away from the
 * real one by the toy deviation. The recurrence, the throw, the decoded
 * pictures and the shaded 3-15 step band in the method chart are teaching
 * choices, not measured model predictions, published horizon bounds or
 * reliability estimates. Scrub-driven only, with no playback, so it is
 * reduced-motion safe by construction.
 */
type ImaginationMode = 'decoder' | 'decoder-free';

type LatentImaginationProps = {
  /** Initial toy horizon in steps. Default 15; not a published reliability bound. */
  defaultHorizon?: number;
  /** Initial one-step model error. Default 0.02 (2%). */
  defaultEpsilon?: number;
  className?: string;
};

const MIN_EPSILON_PERCENT = 0.5;
const MAX_EPSILON_PERCENT = 6;

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 200;
const GROUND = 190;
const BALL_R = 7;
/** Release point and the real ball's position at the last step. */
const X0 = 48;
const X1 = 324;
/** The real flight: ball-centre height above resting on the floor. */
const RELEASE_H = 44;
const PEAK_H = 116;
const PEAK_AT = 0.6;
const GRAVITY = (PEAK_H - RELEASE_H) / (PEAK_AT * PEAK_AT);
const LAUNCH = 2 * GRAVITY * PEAK_AT;
/** Stage drop below the real arc per unit of toy deviation. */
const DROP_PER_UNIT = 80;
const FLOOR_Y = GROUND - BALL_R;
const NOTE = { left: 8, right: WIDTH - 8, y: 20 };
/** Below this gap the imagined and real balls still overlap. */
const VISIBLE_GAP = 6;

const ballX = (t: number) => X0 + (t / MAX_HORIZON) * (X1 - X0);
const realY = (t: number) => {
  const s = t / MAX_HORIZON;
  return FLOOR_Y - (RELEASE_H + LAUNCH * s - GRAVITY * s * s);
};
const imaginedY = (t: number, deviation: number) => Math.min(FLOOR_Y, realY(t) + DROP_PER_UNIT * deviation);

/** Method chart: deviation against steps imagined ahead. */
const CHART_HEIGHT = 170;
const PLOT = { left: 40, right: WIDTH - 18, top: 16, bottom: 116 };
const STEP_TICKS = [0, 25, 50];
const DEVIATION_TICKS = [0, 1, 2, 3];
const stepX = linearScale([0, MAX_HORIZON], [PLOT.left, PLOT.right]);
// Anchored to the worst case (largest error, full horizon) so a longer
// horizon grows the curve instead of rescaling it away.
const DEVIATION_MAX = deviationAt({ epsilon: MAX_EPSILON_PERCENT / 100, horizon: MAX_HORIZON }) * 1.05;
const deviationY = linearScale([0, DEVIATION_MAX], [PLOT.bottom, PLOT.top]);
const BAND_NOTE_Y =
  PLOT.bottom + CHART_STROKE.tickLength + CHART_TYPE.tickPx * (1 + CHART_TYPE.descent) +
  CHART_TYPE.axisPx * CHART_TYPE.ascent + CHART_STROKE.tickLength / 4 + CHART_TYPE.axisPx * 1.4;

const MODEL_LABEL: Record<ImaginationMode, string> = {
  decoder: 'Dreamer (draws pictures)',
  'decoder-free': 'TD-MPC2 (no pictures)',
};

function formatUnits(value: number): string {
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

const stepsWord = (steps: number) => (steps === 1 ? '1 step' : `${steps} steps`);

function path(points: readonly ChartPoint[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
}

/** The thrower, as a line drawing: an outlined base on the floor and a two-link arm ending at the ball. */
function RobotArm() {
  const shoulder: ChartPoint = [22, GROUND - 7];
  const elbow: ChartPoint = [17, GROUND - 30];
  const hand: ChartPoint = [X0 - BALL_R - 2, realY(0) + 3];
  return (
    <g
      data-scene-structure="robot-arm"
      stroke={CHART_STRUCTURE.label}
      strokeWidth={CHART_STROKE.trace}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <rect x={10} y={GROUND - 6} width={24} height={6} />
      <path d={path([shoulder, elbow, hand])} />
      {[shoulder, elbow].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={MOTION_STAGE.background} />
      ))}
    </g>
  );
}

/** The stage note: how far the imagined ball is from the real one. */
function noteLines(horizon: number, gap: number, landed: boolean): readonly [string, string] {
  if (gap < VISIBLE_GAP) return [`${stepsWord(horizon)} ahead:`, 'still close to the real flight'];
  if (landed) return [`${stepsWord(horizon)} ahead: so far off,`, 'it has already hit the floor'];
  return [`${stepsWord(horizon)} ahead:`, 'already this far off'];
}

export function LatentImagination({
  defaultHorizon = TYPICAL_HORIZON[1],
  defaultEpsilon = 0.02,
  className,
}: LatentImaginationProps) {
  const id = useId();
  const descriptionId = `${id}-li-description`;
  const rolloutDescriptionId = `${id}-li-rollout`;
  const horizonId = `${id}-li-horizon`;
  const epsilonId = `${id}-li-epsilon`;
  const [horizon, setHorizon] = useState(defaultHorizon);
  const [epsilonPercent, setEpsilonPercent] = useState(defaultEpsilon * 100);
  const [mode, setMode] = useState<ImaginationMode>('decoder');

  const epsilon = epsilonPercent / 100;
  const fullDeviation = useMemo(() => imagineDeviation({ epsilon, horizon: MAX_HORIZON }), [epsilon]);
  const deviationNow = deviationAt({ epsilon, horizon });
  const rewardError = rewardPredictionError({ epsilon, horizon });
  const errorWords = `${epsilonPercent.toFixed(1)}% off per step`;

  const sampleRows = useMemo(() => {
    const steps = [...new Set([0, 10, 20, 30, 40, MAX_HORIZON, horizon])].sort((a, b) => a - b);
    return steps.map((t) => ({
      label: `${t}`,
      values: [
        formatUnits(fullDeviation[t]),
        t >= TYPICAL_HORIZON[0] && t <= TYPICAL_HORIZON[1]
          ? 'inside illustrative band'
          : t < TYPICAL_HORIZON[0]
            ? 'before illustrative band'
            : 'past illustrative band',
        t === horizon ? 'playhead' : 'off',
      ],
    }));
  }, [fullDeviation, horizon]);

  const descriptionText = `In this deterministic toy, latent deviation grows from 0 at step 0 to ${formatUnits(deviationNow)} units at the current ${horizon}-step horizon under the ${epsilonPercent.toFixed(1)}% one-step-error input. The shaded band is illustrative, from ${TYPICAL_HORIZON[0]} to ${TYPICAL_HORIZON[1]} steps; it is not a published range, confidence interval, or reliability bound.`;

  // Pictures the decoder draws (or reward errors) at a quarter, half and the full horizon.
  const sampleSteps = [...new Set([Math.max(1, Math.round(horizon / 4)), Math.max(1, Math.round(horizon / 2)), horizon])];
  const ghostSteps = [Math.round(horizon / 4), Math.round(horizon / 2), Math.round((3 * horizon) / 4)]
    .filter((t, i, all) => t >= 1 && t < horizon && all.indexOf(t) === i);
  const rewardErrors = sampleSteps.map((t) => ({ t, value: REWARD_ERROR_GAIN * fullDeviation[t] }));

  function reset() {
    setHorizon(defaultHorizon);
    setEpsilonPercent(defaultEpsilon * 100);
    setMode('decoder');
  }

  const state = roleColour('state');
  const reference = roleColour('reference');
  const highlight = roleColour('highlight');
  const tipX = ballX(horizon);
  const real: ChartPoint = [tipX, realY(horizon)];
  const imagined: ChartPoint = [tipX, imaginedY(horizon, deviationNow)];
  const gap = imagined[1] - real[1];
  const landed = realY(horizon) + DROP_PER_UNIT * deviationNow > FLOOR_Y;
  const rightSide = horizon > MAX_HORIZON / 2;
  const bracketX = rightSide ? tipX - BALL_R - 6 : tipX + BALL_R + 6;
  // The bracket's end ticks point back toward the two balls.
  const tick = rightSide ? 3 : -3;
  const bracketMid: ChartPoint = [bracketX, (real[1] + imagined[1]) / 2];
  const lines = noteLines(horizon, gap, landed);
  const noteX = rightSide ? NOTE.right : NOTE.left;
  const realPath = path(Array.from({ length: MAX_HORIZON + 1 }, (_, t) => [ballX(t), realY(t)] as ChartPoint));
  const imaginedPath = path(
    fullDeviation.slice(0, horizon + 1).map((d, t) => [ballX(t), imaginedY(t, d)] as ChartPoint),
  );

  const rolloutStage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`A robot arm throws a ball. The dashed arc is the real flight; the solid arc is the flight the robot imagines ${stepsWord(horizon)} ahead, at ${errorWords}.`}
      aria-describedby={rolloutDescriptionId}
    >
      <line data-scene-structure="floor" x1={6} x2={WIDTH - 6} y1={GROUND} y2={GROUND} stroke={CHART_STRUCTURE.axes} strokeOpacity={CHART_STRUCTURE.axesOpacity} strokeWidth={CHART_STROKE.structure * 2} />
      <RobotArm />
      <path data-series="true" data-chart-role="reference" d={realPath} fill="none" stroke={reference} strokeWidth={CHART_STROKE.reference} strokeDasharray={CHART_STROKE.dash} />
      <path data-testid="imagined-path" data-series="imagined" data-chart-role="state" d={imaginedPath} fill="none" stroke={state} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" strokeLinejoin="round" />
      {mode === 'decoder' ? (
        <g data-testid="decoded-frames">
          {ghostSteps.map((t) => (
            <circle key={t} data-series="imagined-picture" data-chart-role="state" cx={ballX(t)} cy={imaginedY(t, fullDeviation[t])} r={BALL_R} fill={state} fillOpacity={CHART_UNCERTAINTY.fillAlpha} />
          ))}
        </g>
      ) : null}
      <circle data-testid="real-ball" data-series="true" data-chart-role="reference" cx={real[0]} cy={real[1]} r={BALL_R} fill="none" stroke={reference} strokeWidth={CHART_STROKE.reference} strokeDasharray="3 2" />
      <circle data-testid="imagined-ball" data-series="imagined" data-chart-role="state" cx={imagined[0]} cy={imagined[1]} r={BALL_R} fill={state} />
      {gap >= VISIBLE_GAP ? (
        <path
          data-testid="drift-bracket"
          data-chart-mark="playhead"
          data-chart-role="highlight"
          d={`M${bracketX + tick} ${real[1]}H${bracketX}V${imagined[1]}H${bracketX + tick}`}
          fill="none"
          stroke={highlight}
          strokeWidth={CHART_STROKE.trace}
          strokeLinejoin="round"
        />
      ) : null}
      <g data-testid="drift-note">
        <StageAnnotation
          x={noteX}
          y={NOTE.y}
          anchor={rightSide ? 'end' : 'start'}
          lines={lines}
          from={[noteX + (rightSide ? -2 : 2), NOTE.y + CHART_TYPE.labelPx * 1.25 + 6]}
          target={gap >= VISIBLE_GAP ? bracketMid : undefined}
        />
      </g>
    </PlotStage>
  );

  const bandX = stepX(TYPICAL_HORIZON[0]);
  const bandWidth = stepX(TYPICAL_HORIZON[1]) - bandX;
  const deviationStage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`}
      aria-label={`Latent deviation versus imagination step in a deterministic toy. Deviation reaches ${formatUnits(deviationNow)} units at step ${horizon}. The shaded 3 to 15 step band is illustrative, not a published reliability bound.`}
      aria-describedby={descriptionId}
    >
      <rect data-testid="typical-range-band" data-series="typical-range" data-chart-role="reference" x={bandX} y={PLOT.top} width={bandWidth} height={PLOT.bottom - PLOT.top} fill={reference} fillOpacity={CHART_UNCERTAINTY.fillAlpha} stroke="none" />
      <ChartAxes plot={PLOT} x={stepX} y={deviationY} xTicks={STEP_TICKS} yTicks={DEVIATION_TICKS} xLabel="steps imagined ahead" yLabel="how far off" />
      <text data-scene-axis="" x={bandX} y={BAND_NOTE_Y} fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
        shaded: an illustrative {TYPICAL_HORIZON[0]} to {TYPICAL_HORIZON[1]} steps
      </text>
      <path data-testid="deviation-curve" data-series="deviation" data-chart-role="state" d={path(fullDeviation.slice(0, horizon + 1).map((d, t) => [stepX(t), deviationY(d)] as ChartPoint))} fill="none" stroke={state} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" strokeLinejoin="round" />
      {horizon < MAX_HORIZON ? (
        <path data-series="deviation" data-chart-role="state" d={path(fullDeviation.slice(horizon).map((d, i) => [stepX(horizon + i), deviationY(d)] as ChartPoint))} fill="none" stroke={state} strokeWidth={CHART_STROKE.reference} strokeDasharray={CHART_STROKE.dash} />
      ) : null}
      <circle data-chart-mark="playhead" data-chart-role="highlight" cx={stepX(horizon)} cy={deviationY(deviationNow)} r={CHART_STROKE.markerRadius + 2} fill="none" stroke={highlight} strokeWidth={CHART_STROKE.trace} />
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="latent-imagination"
      className={className}
      kicker="Planning in imagination"
      heading="Imagine further ahead and small mistakes snowball"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={horizonId} value={stepsWord(horizon)}>
              How far ahead to imagine
            </ControlLabel>
            <input
              id={horizonId}
              type="range"
              data-brand-control-id="control:input"
              min={1}
              max={MAX_HORIZON}
              step={1}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              aria-label={`How far ahead to imagine, currently ${stepsWord(horizon)}`}
              aria-valuetext={stepsWord(horizon)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="a few steps" high="many steps" />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor={epsilonId} value={errorWords}>
              How accurate each step is
            </ControlLabel>
            <input
              id={epsilonId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_EPSILON_PERCENT}
              max={MAX_EPSILON_PERCENT}
              step={0.5}
              value={epsilonPercent}
              onChange={(e) => setEpsilonPercent(Number(e.target.value))}
              aria-label={`How accurate each step is, currently ${errorWords}`}
              aria-valuetext={errorWords}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="sharp" high="sloppy" />
          </ControlField>
        </>
      }
      adjust={
        <>
          <PresetGroup<ImaginationMode>
            label="Which model?"
            presets={[
              { id: 'decoder', label: MODEL_LABEL.decoder },
              { id: 'decoder-free', label: MODEL_LABEL['decoder-free'] },
            ]}
            value={mode}
            onChange={setMode}
            testId="model"
          />
          {mode === 'decoder-free' ? (
            <p data-testid="decoder-free-note" className="font-sans text-sm leading-snug text-text-dim">
              TD-MPC2 draws no pictures, so the faint balls are gone. Its drift shows up instead as error
              in the reward it predicts, a fixed multiple of the toy deviation:{' '}
              <span data-testid="reward-error-bars">
                {rewardErrors.map(({ t, value }, i) => (
                  <span key={t}>
                    {i === 0 ? '' : i === rewardErrors.length - 1 ? ' and ' : ', '}
                    {t === horizon ? (
                      <span data-testid="reward-error-readout">{formatUnits(rewardError)}</span>
                    ) : (
                      formatUnits(value)
                    )}{' '}
                    at step {t}
                  </span>
                ))}
              </span>
              .
            </p>
          ) : null}
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="true" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  real flight
                </LegendItem>
                <LegendItem series="imagined" swatch={<LegendSwatch role="state" mark="line" />}>
                  what the robot imagines
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative: a toy model, not measured on a real robot.</StageStatus>
            </>
          }
        >
          {rolloutStage}
        </FigureStage>
      }
      caption="Robots plan by imagining the future; each imagined step builds on the last, so short look-aheads stay close and long ones drift."
      method={
        <>
          <p>
            The robot plans a throw by imagining the ball&rsquo;s flight one step at a time, and each
            imagined step starts from the last imagined one, not from the real ball. A small error in
            one step is carried into every later step and grows. The dashed arc is the real flight; the
            solid arc is the imagined one, drawn as far ahead as the first slider says.
          </p>
          <p>
            The drift is a toy recurrence, not a measured model: each step adds the one-step error,
            scaled up by how far the imagined state has already drifted, d(t) = d(t &minus; 1) + e
            &times; (1 + 0.02 &times; d(t &minus; 1)). At {epsilonPercent.toFixed(1)}% error per step
            and {stepsWord(horizon)} it reaches{' '}
            <span data-testid="deviation-readout">{formatUnits(deviationNow)}</span> units of toy
            latent deviation. The picture draws each unit as the same drop below the real arc and stops
            the imagined ball at the floor; the number keeps growing.
          </p>
          <p>
            Dreamer learns with a decoder that turns imagined states back into pictures, drawn here as
            the faint balls. TD-MPC2 has no decoder: it never draws a picture, and its drift shows up as
            error in the reward it predicts (&ldquo;Adjust more&rdquo; switches between the two). TD-MPC
            and TD-MPC2 are also trained to keep imagined and encoded states consistent, so a single
            toy number is not a complete account of either training loss.
          </p>
          <p>
            In the chart below, the shaded band from {TYPICAL_HORIZON[0]} to {TYPICAL_HORIZON[1]} steps
            is a teaching choice, not a published range, a confidence interval or a reliability bound;
            the article discusses the horizons the papers use.
          </p>
          {deviationStage}
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Sampled latent deviation by imagination step"
            rowHeader="step"
            columns={[
              { header: 'deviation', numeric: true },
              { header: 'range', numeric: false },
              { header: 'playhead', numeric: false },
            ]}
            rows={sampleRows}
            description={descriptionText}
          />
          <ChartDescription
            id={rolloutDescriptionId}
            form="state"
            open
            summary="Current imagined throw"
            description={`In this toy, the ball the robot imagines ${stepsWord(horizon)} ahead, at ${errorWords}, is ${formatUnits(deviationNow)} units of toy deviation off the real flight; each imagined step starts from the last imagined one, so the gap grows with every step of the ${MAX_HORIZON}-step range.`}
            states={[
              { label: 'how far ahead', value: stepsWord(horizon) },
              { label: 'error per step', value: `${epsilonPercent.toFixed(1)}%` },
              { label: 'how far off', value: formatUnits(deviationNow) },
              { label: 'model', value: MODEL_LABEL[mode] },
            ]}
          />
        </>
      }
    />
  );
}
