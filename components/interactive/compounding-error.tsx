'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import { GripperGlyph } from '@/components/motion/gripper-glyph';
import {
  ChartAxes,
  DirectLabel,
  PointMarker,
  StageAnnotation,
  roleColour,
  CHART_STROKE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import {
  accumulatedCost,
  bcBound,
  COMPOUNDING_GAIN,
  DAGGER_CORRECTION,
  DAGGER_INTERVAL,
  daggerBound,
  DEVIATION_AXIS_TICKS,
  deviationAxisFraction,
  type PredictionMode,
  simulateDeviation,
} from '@/lib/compounding-error';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * CompoundingError: why a robot that copies an expert drifts off course.
 *
 * The stage draws the path a person demonstrated and the path the copying
 * robot actually takes, with the gap between them shaded: the shaded area is
 * the summed deviation the readout reports, and the darker second half shows
 * how much more a task twice as long piles up. The main view offers the task
 * length and how the robot is run; the error size, a free task length and
 * Reset sit in "Adjust more". The textbook reference curves on a log axis,
 * which the VAL-MAN-067 geometry gate measures, live in "How this was made".
 *
 * Deterministic illustration of persistent drift, with quadratic and linear
 * reference scalings. These are not task-cost or regret bounds.
 */
type CompoundingErrorProps = {
  /** Initial per-step error epsilon. Default 0.05 (5%). */
  defaultEpsilon?: number;
  /** Initial episode horizon in steps. Default 120. */
  defaultSteps?: number;
  /** Longest horizon the charts draw. Default 240. */
  maxSteps?: number;
  /** Chunk length k used in chunked-prediction mode. Default 25. */
  chunkSize?: number;
  className?: string;
};

const MIN_EPSILON_PERCENT = 0.5;
const MAX_EPSILON_PERCENT = 15;
const MIN_STEPS = 20;

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;
const LABEL_ASCENT = TEXT_H * CHART_TYPE.ascent;
const LABEL_DESCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.descent;
const LABEL_GAP = 8;

/* The path stage: moves run left to right, drift rises from the taught path. */
const PATH_PLOT = { left: 16, right: WIDTH - 26, top: 60, bottom: 196 };
/** Centre line of the taught path; the robot's drift is drawn upward from it. */
const TAUGHT_Y = 160;
/** Cosmetic sway of the drawn taught path, in stage units. */
const TAUGHT_SWAY = 6;
const PATH_H = 246;
const NOTE_X = PATH_PLOT.left + 4;
const NOTE_Y = LABEL_ASCENT + 4;
/** One annotation line-height, in stage units at the narrowest stage. */
const NOTE_LINE = TEXT_H * 1.25;

/* The method chart: summed deviation against the textbook reference curves. */
const PLOT_LEFT = 48;
const PLOT_RIGHT = WIDTH - 34;
const BOUNDS_H = 204;
const BOUNDS_PLOT = { left: PLOT_LEFT, right: PLOT_RIGHT, top: 32, bottom: BOUNDS_H - 50 };
/** Width of "εT(T+1)/2" on the narrowest stage, rounded up. */
const QUADRATIC_LABEL_W = 72;
const QUADRATIC_LABEL_RIGHT = PLOT_RIGHT - 12;

type TaskPreset = 'short' | 'long';
type RunPreset = 'one' | 'plan' | 'teacher';

function formatUnits(value: number): string {
  if (value >= 100) return String(Math.round(value));
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(3);
}

/**
 * Server and browser can disagree in the last digit of the log-scale and
 * trigonometric maths, which breaks hydration of any attribute that
 * carries the raw value.
 */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** "about four times as far": the ratio of drift over T to drift over T/2. */
function timesWords(ratio: number): string {
  const n = Math.round(ratio);
  if (n <= 1) return 'about as far';
  if (n === 2) return 'about twice as far';
  const words = ['three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return `about ${words[n - 3] ?? String(n)} times as far`;
}

function pathX(t: number, maxSteps: number): number {
  return PATH_PLOT.left + (t / maxSteps) * (PATH_PLOT.right - PATH_PLOT.left);
}

/** The drawn taught path at move t. */
function taughtY(t: number): number {
  return TAUGHT_Y - TAUGHT_SWAY * Math.sin((2 * Math.PI * t) / 150);
}

function stepX(t: number, maxSteps: number): number {
  return PLOT_LEFT + (t / maxSteps) * (PLOT_RIGHT - PLOT_LEFT);
}

function stepAtX(x: number, maxSteps: number): number {
  return Math.round(((x - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * maxSteps);
}

function deviationY(value: number): number {
  const plotH = BOUNDS_PLOT.bottom - BOUNDS_PLOT.top;
  return Math.round((BOUNDS_PLOT.bottom - deviationAxisFraction(value) * plotH) * 100) / 100;
}

/** Highest point a label may reach: clear of the y-axis title. */
const LABEL_TOP_LIMIT = BOUNDS_PLOT.top + LABEL_GAP / 2;

/**
 * Baseline of the quadratic reference label. It prefers the side of its
 * curve away from the simulated curve, which runs just above the quadratic
 * one in per-timestep mode and far below it once chunking or relabeling
 * is on, and takes the other side when the preferred one has no room
 * between the plot edges, the axis title and the other two curves.
 */
function quadraticLabelBaseline(
  epsilon: number,
  cumulative: readonly number[],
  maxSteps: number,
): number {
  const ta = stepAtX(QUADRATIC_LABEL_RIGHT - QUADRATIC_LABEL_W, maxSteps);
  const tb = stepAtX(QUADRATIC_LABEL_RIGHT, maxSteps);
  // All three curves rise with t, so over the label's x range each one
  // covers the y interval between its values at the two ends.
  const span = (fn: (t: number) => number) =>
    [deviationY(fn(tb)), deviationY(fn(ta))] as const;
  const quadratic = span((t) => bcBound(epsilon, t));
  const simulated = span((t) => cumulative[t]);
  const linear = span((t) => daggerBound(epsilon, t));
  const fits = (baseline: number) => {
    const top = baseline - LABEL_ASCENT - LABEL_GAP / 2;
    const bottom = baseline + LABEL_DESCENT + LABEL_GAP / 2;
    if (top < LABEL_TOP_LIMIT || bottom > BOUNDS_PLOT.bottom) return false;
    return [quadratic, simulated, linear].every(([high, low]) => bottom <= high || top >= low);
  };
  const below = quadratic[1] + LABEL_GAP + LABEL_ASCENT;
  const above = (high: number) => high - LABEL_GAP - LABEL_DESCENT;
  const candidates =
    cumulative[ta] >= bcBound(epsilon, ta)
      ? [below, above(Math.min(quadratic[0], simulated[0]))]
      : [above(quadratic[0]), below];
  const chosen = candidates.find(fits) ?? candidates[0];
  return Math.min(
    Math.max(chosen, LABEL_TOP_LIMIT + LABEL_ASCENT),
    BOUNDS_PLOT.bottom - LABEL_DESCENT - 2,
  );
}

/** Baseline of the linear reference label in the right margin. */
function linearLabelBaseline(epsilon: number, maxSteps: number): number {
  const centred = deviationY(daggerBound(epsilon, maxSteps)) + (LABEL_ASCENT - LABEL_DESCENT) / 2;
  return Math.min(centred, BOUNDS_PLOT.bottom - LABEL_DESCENT - 1);
}

export function CompoundingError({
  defaultEpsilon = 0.05,
  defaultSteps = 120,
  maxSteps = 240,
  chunkSize = 25,
  className,
}: CompoundingErrorProps) {
  // useId-derived input ids keep labels bound to their own mount if the
  // figure is ever mounted twice on one page.
  const uid = useId();
  const [epsilonPercent, setEpsilonPercent] = useState(defaultEpsilon * 100);
  const [steps, setSteps] = useState(defaultSteps);
  const [mode, setMode] = useState<PredictionMode>('per-step');
  const [dagger, setDagger] = useState(false);

  const epsilon = epsilonPercent / 100;
  const shortSteps = Math.round(maxSteps / 2);
  const half = Math.round(steps / 2);
  const taskPreset: TaskPreset | null =
    steps === shortSteps ? 'short' : steps === maxSteps ? 'long' : null;
  const runPreset: RunPreset | null =
    mode === 'per-step' ? (dagger ? 'teacher' : 'one') : dagger ? null : 'plan';

  function chooseRun(id: RunPreset) {
    setMode(id === 'plan' ? 'chunk' : 'per-step');
    setDagger(id === 'teacher');
  }

  // Fixed vertical scale anchored to the worst case (max error, full
  // horizon, one move at a time, no teacher) so raising the error or the
  // task length always widens the drawn gap instead of rescaling it away.
  const driftScale = useMemo(() => {
    const worst = simulateDeviation({
      epsilon: MAX_EPSILON_PERCENT / 100,
      steps: maxSteps,
      mode: 'per-step',
      chunkSize,
      dagger: false,
    });
    return (TAUGHT_Y - TAUGHT_SWAY - PATH_PLOT.top) / worst[maxSteps];
  }, [maxSteps, chunkSize]);

  const rollout = useMemo(() => {
    const deviation = simulateDeviation({ epsilon, steps, mode, chunkSize, dagger });
    const x = (t: number) => pathX(t, maxSteps);
    const robotY = (t: number) => taughtY(t) - deviation[t] * driftScale;
    const taught: string[] = [];
    for (let t = 0; t <= maxSteps; t += 2) {
      taught.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${taughtY(t).toFixed(1)}`);
    }
    const robot = deviation
      .map((_, t) => `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${robotY(t).toFixed(1)}`)
      .join(' ');
    // The gap between the two paths, split at half the task so the second
    // half's extra drift reads as extra area.
    const gap = (from: number, to: number) => {
      const top: string[] = [];
      const bottom: string[] = [];
      for (let t = from; t <= to; t += 1) {
        top.push(`${x(t).toFixed(1)},${robotY(t).toFixed(1)}`);
        bottom.unshift(`${x(t).toFixed(1)},${taughtY(t).toFixed(1)}`);
      }
      return `M${top.join(' L')} L${bottom.join(' L')} Z`;
    };
    const corrections: Array<{ x: number; y: number }> = [];
    if (dagger) {
      for (let t = DAGGER_INTERVAL; t <= steps; t += DAGGER_INTERVAL) {
        corrections.push({ x: round1(x(t)), y: round1(robotY(t)) });
      }
    }
    const plans: Array<{ x: number; y: number }> = [];
    if (mode === 'chunk') {
      for (let t = 0; t < steps; t += chunkSize) {
        plans.push({ x: round1(x(t)), y: round1(robotY(t)) });
      }
    }
    const back = Math.max(0, steps - 3);
    const heading =
      (Math.atan2(robotY(steps) - robotY(back), x(steps) - x(back)) * 180) / Math.PI;
    const target = Math.round(steps * 0.78);
    return {
      taughtPath: taught.join(' '),
      robotPath: robot,
      firstHalf: gap(0, half),
      secondHalf: gap(half, steps),
      corrections,
      plans,
      end: { x: round1(x(steps)), y: round1(robotY(steps)), heading: round1(heading) },
      halfX: round1(x(half)),
      halfTop: round1(robotY(half)),
      halfBottom: round1(taughtY(half)),
      target: [round1(x(target)), round1((robotY(target) + taughtY(target)) / 2)] as const,
      finalDeviation: deviation[steps],
      cost: accumulatedCost(deviation),
      halfCost: accumulatedCost(deviation.slice(0, half + 1)),
    };
  }, [epsilon, steps, half, mode, chunkSize, dagger, maxSteps, driftScale]);

  const bounds = useMemo(() => {
    const x = (t: number) => stepX(t, maxSteps);
    const curve = (fn: (t: number) => number) => {
      const parts: string[] = [];
      for (let t = 0; t <= maxSteps; t += 2) {
        parts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${deviationY(fn(t)).toFixed(1)}`);
      }
      return parts.join(' ');
    };
    // Simulated accumulated cost for the current settings, extended across
    // the full horizon so the marker travels along a stable curve.
    const deviation = simulateDeviation({ epsilon, steps: maxSteps, mode, chunkSize, dagger });
    const cumulative: number[] = [];
    let running = 0;
    const simPoints: string[] = [];
    for (let t = 0; t <= maxSteps; t += 1) {
      running += Math.abs(deviation[t]);
      cumulative.push(running);
      simPoints.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${deviationY(running).toFixed(1)}`);
    }
    let simAtT = 0;
    for (let t = 0; t <= steps; t += 1) simAtT += Math.abs(deviation[t]);
    return {
      bcPath: curve((t) => bcBound(epsilon, t)),
      daggerPath: curve((t) => daggerBound(epsilon, t)),
      simPath: simPoints.join(' '),
      marker: { cx: round1(x(steps)), cy: round1(deviationY(simAtT)) },
      bcAtT: bcBound(epsilon, steps),
      daggerAtT: daggerBound(epsilon, steps),
      quadraticLabelY: round1(quadraticLabelBaseline(epsilon, cumulative, maxSteps)),
      linearLabelY: round1(linearLabelBaseline(epsilon, maxSteps)),
      // Sampled from the same cumulative sum and the same two bound
      // functions the three curves are drawn from.
      sampleRows: [0, 48, 96, 144, 192, maxSteps].map((t) => {
        let sum = 0;
        for (let i = 0; i <= t; i += 1) sum += Math.abs(deviation[i]);
        return {
          label: `${t}`,
          values: [
            formatUnits(sum),
            formatUnits(bcBound(epsilon, t)),
            formatUnits(daggerBound(epsilon, t)),
          ],
        };
      }),
    };
  }, [epsilon, steps, mode, chunkSize, dagger, maxSteps]);

  // A mount seeded at another horizon gets a takeaway of a different
  // sentence shape, not only a different numeral, so two mounts on one
  // page never read as one template filled twice (VAL-EDU-036).
  const daggerClause = dagger ? ` and expert relabeling every ${DAGGER_INTERVAL} steps` : '';
  const descriptionText =
    defaultSteps === 120
      ? `With toy error ${epsilonPercent.toFixed(1)}% over ${steps} steps${daggerClause}, summed deviation is ${formatUnits(rollout.cost)} units. The two dashed curves are illustrative reference curves: epsilon T(T+1)/2 = ${formatUnits(bounds.bcAtT)} and epsilon T = ${formatUnits(bounds.daggerAtT)}. They are not bounds on the solid trace or measured robot data. Linear task-cost scaling in DAgger requires a horizon-independent recovery factor u and the paper's learning assumptions.`
      : `The prediction-step reference panel starts at ${steps} steps. Its deterministic recurrence with toy error ${epsilonPercent.toFixed(1)}% gives ${formatUnits(rollout.cost)} units of summed deviation${daggerClause}. Dashed curves show illustrative reference curves, epsilon T(T+1)/2 = ${formatUnits(bounds.bcAtT)} and epsilon T = ${formatUnits(bounds.daggerAtT)}, not bounds on this trace. This is not a task-cost theorem or a source benchmark.`;
  const modeWords = mode === 'per-step' ? 'per-timestep prediction' : `chunked prediction of ${chunkSize} actions`;
  const rolloutText =
    defaultSteps === 120
      ? `${mode === 'per-step' ? 'Per-timestep prediction' : `Chunked prediction of ${chunkSize} actions`} at ${epsilonPercent.toFixed(1)} percent per-step error over ${steps} steps, DAgger relabeling ${dagger ? 'on' : 'off'}, leaves the rollout drifting from the demonstrated path with accumulated deviation ${formatUnits(rollout.cost)} units.`
      : `The doubled-horizon figure keeps ${modeWords} at ${epsilonPercent.toFixed(1)} percent error across ${steps} steps with DAgger ${dagger ? 'on' : 'off'}, so the rollout accumulated deviation is ${formatUnits(rollout.cost)} units under the selected toy correction setting.`;

  function reset() {
    setEpsilonPercent(defaultEpsilon * 100);
    setSteps(defaultSteps);
    setMode('per-step');
    setDagger(false);
  }

  const ratio = rollout.halfCost > 0 ? rollout.cost / rollout.halfCost : 1;
  const noteLines = ['Twice as long:', `${timesWords(ratio)} off course`];
  const noteFrom: [number, number] = [
    Math.min(Math.max(rollout.target[0], NOTE_X + 8), NOTE_X + 80),
    NOTE_Y + NOTE_LINE + TEXT_H * 0.45,
  ];
  const robotLabelX = Math.max(rollout.halfX - 6, PATH_PLOT.left + 84);
  const robotLabelY = Math.min(rollout.halfTop, TAUGHT_Y - TAUGHT_SWAY) - 10;
  const state = roleColour('state');
  const reference = roleColour('reference');
  const value = roleColour('value');
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxSteps));

  return (
    <InstrumentFigure
      figureId="compounding-error"
      className={className}
      kicker="Compounding error"
      heading="Small mistakes snowball: twice the task, four times the drift"
      controls={
        <>
          <PresetGroup<TaskPreset>
            label="Task length"
            presets={[
              { id: 'short', label: `Short task (${shortSteps} moves)` },
              { id: 'long', label: `Twice as long (${maxSteps} moves)` },
            ]}
            value={taskPreset}
            onChange={(id) => setSteps(id === 'short' ? shortSteps : maxSteps)}
            testId="task-length-preset"
          />
          <PresetGroup<RunPreset>
            label="How it’s run"
            presets={[
              { id: 'one', label: 'One move at a time' },
              { id: 'plan', label: `${chunkSize} moves per plan` },
              { id: 'teacher', label: 'A teacher corrects it' },
            ]}
            value={runPreset}
            onChange={chooseRun}
            testId="run-preset"
          />
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-epsilon`} value={`${epsilonPercent.toFixed(1)}%`}>
              How big each slip is
            </ControlLabel>
            <input
              id={`${uid}-epsilon`}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_EPSILON_PERCENT}
              max={MAX_EPSILON_PERCENT}
              step={0.5}
              value={epsilonPercent}
              onChange={(e) => setEpsilonPercent(Number(e.target.value))}
              aria-label={`How big each slip is (per-step error epsilon in percent), currently ${epsilonPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low={`${MIN_EPSILON_PERCENT}%`} high={`${MAX_EPSILON_PERCENT}%`} />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-horizon`} value={`${steps} moves`}>
              How many moves the task has
            </ControlLabel>
            <input
              id={`${uid}-horizon`}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_STEPS}
              max={maxSteps}
              step={5}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              aria-label={`How many moves the task has (episode horizon in steps), currently ${steps}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low={`${MIN_STEPS} moves`} high={`${maxSteps} moves`} />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Total drift over {steps} moves:{' '}
                <span data-testid="accumulated-deviation-readout" style={{ color: value }}>
                  {formatUnits(rollout.cost)}
                </span>{' '}
                units; over the first {half}:{' '}
                <span data-testid="half-deviation-readout">{formatUnits(rollout.halfCost)}</span>
                {dagger ? `. The teacher pulls it back every ${DAGGER_INTERVAL} moves.` : null}
              </StageReadout>
              <StageStatus>Illustrative: a toy model, not a measured robot.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${PATH_H}`}
            aria-label={`Rollout trace of a policy with per-step error ${epsilonPercent.toFixed(1)} percent over ${steps} steps, drifting away from the demonstrated path; the shaded gap is the summed deviation, ${formatUnits(rollout.cost)} units, against ${formatUnits(rollout.halfCost)} over the first ${half} steps.`}
            aria-describedby={`${uid}-rollout-description`}
          >
            <ChartAxes
              plot={PATH_PLOT}
              x={(t) => pathX(t, maxSteps)}
              y={() => PATH_PLOT.bottom}
              xTicks={xTicks}
              xLabel="moves"
              grid={false}
              yAxis={false}
            />
            <g data-series="drift-gap">
              <path
                data-testid="drift-first-half"
                d={rollout.firstHalf}
                fill={state}
                fillOpacity={CHART_UNCERTAINTY.fillAlpha}
                stroke="none"
              />
              <path
                data-testid="drift-second-half"
                d={rollout.secondHalf}
                fill={state}
                fillOpacity={Math.min(1, CHART_UNCERTAINTY.fillAlpha * 2.5)}
                stroke="none"
              />
              <line
                x1={rollout.halfX}
                x2={rollout.halfX}
                y1={rollout.halfTop}
                y2={rollout.halfBottom}
                stroke={state}
                strokeWidth={CHART_STROKE.structure}
              />
            </g>
            <g data-series="demonstration">
              <path
                d={rollout.taughtPath}
                fill="none"
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel
                x={PATH_PLOT.left}
                y={TAUGHT_Y + TAUGHT_SWAY + 4 + LABEL_ASCENT}
                role="reference"
              >
                the path a person showed it
              </DirectLabel>
            </g>
            <g data-series="policy-rollout">
              <path
                d={rollout.robotPath}
                fill="none"
                stroke={state}
                strokeWidth={CHART_STROKE.trace}
                strokeLinejoin="round"
              />
              <DirectLabel x={robotLabelX} y={robotLabelY} role="state" anchor="end">
                the robot
              </DirectLabel>
              <GripperGlyph
                x={rollout.end.x + 7}
                y={rollout.end.y}
                angle={rollout.end.heading}
                size={12}
                testId="robot-gripper"
              />
              {rollout.plans.map((p) => (
                <PointMarker key={`plan-${p.x}`} x={p.x} y={p.y} role="state" />
              ))}
            </g>
            {/* Teacher corrections are crosses on the path, so they stay
                distinct from it under desaturation. */}
            <g data-series="teacher-corrections">
              {rollout.corrections.map((c) => (
                <PointMarker key={c.x} x={c.x} y={c.y} role="action" shape="cross" />
              ))}
            </g>
            <StageAnnotation
              x={NOTE_X}
              y={NOTE_Y}
              lines={noteLines}
              from={noteFrom}
              target={rollout.target}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="A robot that copies an expert makes tiny slips; each slip pushes it somewhere unfamiliar, so mistakes pile up faster than the task grows."
      method={
        <>
          <p>
            Original deterministic toy, not a measured robot. Each move adds a small error to how far
            the robot is off the taught path, and the error grows with that distance: the drift d
            after each decision becomes d + ε(1 + {COMPOUNDING_GAIN}·d), with ε the per-step error
            (now {epsilonPercent.toFixed(1)}%). The shaded gap sums the drift over every move. At 5%
            it is 370 units over 120 moves and 1505 over 240: twice the task, about four times the
            drift.
          </p>
          <p>
            “{chunkSize} moves per plan” makes one decision every {chunkSize} moves (action
            chunking), so errors enter less often. “A teacher corrects it” is DAgger-style
            relabeling: every {DAGGER_INTERVAL} moves an expert removes{' '}
            {Math.round(DAGGER_CORRECTION * 100)}% of the drift. Both are chosen illustration rules,
            not implementations of either method.
          </p>
          <ChartDescription
            id={`${uid}-rollout-description`}
            form="state"
            summary="Current rollout regime"
            description={rolloutText}
            states={[
              {
                label: 'mode',
                value: mode === 'per-step' ? 'per-timestep prediction' : `chunk of ${chunkSize}`,
              },
              { label: 'epsilon', value: `${epsilonPercent.toFixed(1)}%` },
              { label: 'horizon', value: `${steps} steps` },
              { label: 'DAgger', value: dagger ? 'on' : 'off' },
              { label: 'deviation', value: `${formatUnits(rollout.cost)} units` },
              { label: 'final deviation', value: formatUnits(rollout.finalDeviation) },
            ]}
          />
          <p>
            The chart below compares the summed drift with two illustrative reference curves from
            Ross, Gordon and Bagnell (2011): εT(T+1)/2, the quadratic growth of plain copying, and
            εT, the linear growth DAgger can reach under its assumptions. At T = {steps} they read{' '}
            {formatUnits(bounds.bcAtT)} and {formatUnits(bounds.daggerAtT)}; final drift Δ(T) ={' '}
            <span data-testid="final-deviation-readout">{formatUnits(rollout.finalDeviation)}</span>
            . Neither curve bounds this trace.
          </p>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${BOUNDS_H}`}
            aria-label="Accumulated toy deviation and illustrative reference curves over the episode horizon on a logarithmic deviation axis; neither dashed curve is a bound on the solid trace."
            aria-describedby={`${uid}-bounds-description`}
          >
            <ChartAxes
              plot={BOUNDS_PLOT}
              x={(t) => stepX(t, maxSteps)}
              y={deviationY}
              xTicks={xTicks}
              yTicks={DEVIATION_AXIS_TICKS}
              xLabel="step"
              yLabel="summed deviation, log scale"
            />
            <g data-series="quadratic-reference">
              <path
                data-testid="bc-bound-curve"
                d={bounds.bcPath}
                fill="none"
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={QUADRATIC_LABEL_RIGHT} y={bounds.quadraticLabelY} role="reference" anchor="end">
                εT(T+1)/2
              </DirectLabel>
            </g>
            <g data-series="linear-reference">
              <path
                data-testid="dagger-bound-curve"
                d={bounds.daggerPath}
                fill="none"
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={PLOT_RIGHT + 8} y={bounds.linearLabelY} role="reference">
                εT
              </DirectLabel>
            </g>
            <g data-series="summed-deviation">
              <path
                d={bounds.simPath}
                fill="none"
                stroke={value}
                strokeWidth={CHART_STROKE.trace}
                strokeLinejoin="round"
              />
              <circle
                data-chart-mark="playhead"
                data-chart-role="highlight"
                data-selection=""
                cx={bounds.marker.cx}
                cy={bounds.marker.cy}
                r={CHART_STROKE.markerRadius + 2}
                fill="none"
                stroke={roleColour('highlight')}
                strokeWidth={CHART_STROKE.trace}
              />
            </g>
          </PlotStage>
          <ChartDescription
            id={`${uid}-bounds-description`}
            form="table"
            summary="Sampled toy deviation and reference scalings by horizon"
            rowHeader="horizon T (steps)"
            columns={[
              { header: 'simulated', numeric: true },
              { header: 'εT(T+1)/2', numeric: true },
              { header: 'εT', numeric: true },
            ]}
            rows={bounds.sampleRows}
            description={descriptionText}
          />
        </>
      }
      source="Original deterministic toy; reference curves after Ross, Gordon and Bagnell (2011)."
    />
  );
}
