'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  ChartAxes,
  DirectLabel,
  LegendSwatch,
  PointMarker,
  roleColour,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import {
  accumulatedCost,
  bcBound,
  DAGGER_CORRECTION,
  DAGGER_INTERVAL,
  daggerBound,
  DEVIATION_AXIS_TICKS,
  deviationAxisFraction,
  expertY,
  type PredictionMode,
  simulateDeviation,
} from '@/lib/compounding-error';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * CompoundingError: why behavior cloning drifts off the expert distribution.
 *
 * Deterministic illustration of persistent drift, with quadratic and linear
 * reference scalings. These are not task-cost or regret bounds. Controls,
 * calculations, defaults and reset semantics are intentionally unchanged.
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
// Both panels share one x scale, so equal steps line up across them; the
// right margin holds the end label of the linear reference curve.
const PLOT_LEFT = 48;
const PLOT_RIGHT = WIDTH - 34;

const ROLLOUT_H = 112;
const ROLLOUT_TOP = 32;
/** Where the demonstrated path runs; the drift is drawn upward from it. */
const ROLLOUT_ZERO = 80;
/** Amplitude of the cosmetic wobble on the drawn rollout trace. */
const ROLLOUT_WOBBLE = 0.08;

const BOUNDS_H = 204;
const BOUNDS_PLOT = { left: PLOT_LEFT, right: PLOT_RIGHT, top: 32, bottom: BOUNDS_H - 50 };

/**
 * Stage text is largest in stage units on the narrowest full-size stage,
 * where the type scale stops following the container; labels are laid
 * out for that box so they clear their marks at every width.
 */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const LABEL_ASCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.ascent;
const LABEL_DESCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.descent;
const LABEL_GAP = 8;
/** Width of "εT(T+1)/2" in that box, rounded up. */
const QUADRATIC_LABEL_W = 72;
const QUADRATIC_LABEL_RIGHT = PLOT_RIGHT - 12;

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

  // Fixed vertical scale anchored to the worst case (max error, full
  // horizon, per-step, no corrections) so raising epsilon or T always
  // increases the visible divergence instead of rescaling it away.
  const rolloutScale = useMemo(() => {
    const worst = simulateDeviation({
      epsilon: MAX_EPSILON_PERCENT / 100,
      steps: maxSteps,
      mode: 'per-step',
      chunkSize,
      dagger: false,
    });
    const maxDeviation = worst[maxSteps] + 0.5;
    return (ROLLOUT_ZERO - ROLLOUT_TOP) / (maxDeviation * (1 + ROLLOUT_WOBBLE));
  }, [maxSteps, chunkSize]);

  const rollout = useMemo(() => {
    const deviation = simulateDeviation({
      epsilon,
      steps,
      mode,
      chunkSize,
      dagger,
    });
    const x = (t: number) => stepX(t, maxSteps);
    const y = (t: number) =>
      ROLLOUT_ZERO -
      (expertY(t) + deviation[t] * (1 + ROLLOUT_WOBBLE * Math.sin(t * 0.55))) *
        rolloutScale;
    const expertPath: string[] = [];
    for (let t = 0; t <= maxSteps; t += 2) {
      const ey = ROLLOUT_ZERO - expertY(t) * rolloutScale;
      expertPath.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${ey.toFixed(1)}`);
    }
    const tracePath = deviation
      .map((_, t) => `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(t).toFixed(1)}`)
      .join(' ');
    const corrections: Array<{ x: number; y: number }> = [];
    if (dagger) {
      for (let t = DAGGER_INTERVAL; t <= steps; t += DAGGER_INTERVAL) {
        corrections.push({ x: round1(x(t)), y: round1(y(t)) });
      }
    }
    return {
      expertPath: expertPath.join(' '),
      tracePath,
      corrections,
      finalDeviation: deviation[steps],
      cost: accumulatedCost(deviation),
    };
  }, [epsilon, steps, mode, chunkSize, dagger, maxSteps, rolloutScale]);

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
    const deviation = simulateDeviation({
      epsilon,
      steps: maxSteps,
      mode,
      chunkSize,
      dagger,
    });
    const cumulative: number[] = [];
    let running = 0;
    const simPoints: string[] = [];
    for (let t = 0; t <= maxSteps; t += 1) {
      running += Math.abs(deviation[t]);
      cumulative.push(running);
      simPoints.push(
        `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${deviationY(running).toFixed(1)}`,
      );
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
  const daggerClause = dagger
    ? ` and expert relabeling every ${DAGGER_INTERVAL} steps`
    : '';
  const descriptionText =
    defaultSteps === 120
      ? `With toy error ${epsilonPercent.toFixed(1)}% over ${steps} steps${daggerClause}, summed deviation is ${formatUnits(rollout.cost)} units. The two dashed curves are illustrative reference curves: epsilon T(T+1)/2 = ${formatUnits(bounds.bcAtT)} and epsilon T = ${formatUnits(bounds.daggerAtT)}. They are not bounds on the solid trace or measured robot data. Linear task-cost scaling in DAgger requires a horizon-independent recovery factor u and the paper's learning assumptions.`
      : `The prediction-step reference panel starts at ${steps} steps. Its deterministic recurrence with toy error ${epsilonPercent.toFixed(1)}% gives ${formatUnits(rollout.cost)} units of summed deviation${daggerClause}. Dashed curves show illustrative reference curves, epsilon T(T+1)/2 = ${formatUnits(bounds.bcAtT)} and epsilon T = ${formatUnits(bounds.daggerAtT)}, not bounds on this trace. This is not a task-cost theorem or a source benchmark.`;

  function reset() {
    setEpsilonPercent(defaultEpsilon * 100);
    setSteps(defaultSteps);
    setMode('per-step');
    setDagger(false);
  }

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxSteps));
  const reference = roleColour('reference');
  const value = roleColour('value');

  return (
    <InstrumentFigure
      figureId="compounding-error"
      className={className}
      heading="Compounding error in a toy rollout"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-epsilon`} value={`${epsilonPercent.toFixed(1)}%`}>
              Per-step error
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
              aria-label={`Per-step error epsilon in percent, currently ${epsilonPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-horizon`} value={`${steps} steps`}>
              Episode horizon
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
              aria-label={`Episode horizon in steps, currently ${steps}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <div role="group" aria-label="Prediction mode" className="flex flex-wrap gap-2">
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={mode === 'per-step'}
              onClick={() => setMode('per-step')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Per-timestep prediction
            </button>
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={mode === 'chunk'}
              onClick={() => setMode('chunk')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Chunk of {chunkSize} actions
            </button>
          </div>
          <button
            data-brand-control-id="control:selection"
            type="button"
            aria-pressed={dagger}
            onClick={() => setDagger((v) => !v)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            DAgger relabeling
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="policy-rollout" swatch={<LegendSwatch role="state" mark="line" />}>
                  policy rollout
                </LegendItem>
                {/* Relabeling marks render only in DAgger mode, so the
                    entry carries no series id to map at the default. */}
                <LegendItem swatch={<LegendSwatch role="action" mark="cross" />}>
                  expert relabeling round
                </LegendItem>
                <LegendItem series="summed-deviation" swatch={<LegendSwatch role="value" mark="line" />}>
                  summed toy deviation
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span className="text-text-dim">accumulated deviation =</span>{' '}
                <span data-testid="accumulated-deviation-readout" style={{ color: value }}>
                  {formatUnits(rollout.cost)}
                </span>{' '}
                <span className="text-text-dim">
                  units over {steps} steps, final deviation Δ(T) =
                </span>{' '}
                <span data-testid="final-deviation-readout">
                  {formatUnits(rollout.finalDeviation)}
                </span>
                <span className="block text-text-dim">
                  reference scalings at T = {steps}: εT(T+1)/2 = {formatUnits(bounds.bcAtT)}, εT ={' '}
                  {formatUnits(bounds.daggerAtT)}
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={`${uid}-rollout-description`}
                form="state"
                summary="Current rollout regime"
                description={
                  defaultSteps === 120
                    ? `${mode === 'per-step' ? 'Per-timestep prediction' : `Chunked prediction of ${chunkSize} actions`} at ${epsilonPercent.toFixed(1)} percent per-step error over ${steps} steps, DAgger relabeling ${dagger ? 'on' : 'off'}, leaves the rollout drifting from the demonstrated path with accumulated deviation ${formatUnits(rollout.cost)} units.`
                    : `The doubled-horizon figure keeps ${mode === 'per-step' ? 'per-timestep prediction' : `chunked prediction of ${chunkSize} actions`} at ${epsilonPercent.toFixed(1)} percent error across ${steps} steps with DAgger ${dagger ? 'on' : 'off'}, so the rollout accumulated deviation is ${formatUnits(rollout.cost)} units under the selected toy correction setting.`
                }
                states={[
                  {
                    label: 'mode',
                    value:
                      mode === 'per-step'
                        ? 'per-timestep prediction'
                        : `chunk of ${chunkSize}`,
                  },
                  { label: 'epsilon', value: `${epsilonPercent.toFixed(1)}%` },
                  { label: 'horizon', value: `${steps} steps` },
                  { label: 'DAgger', value: dagger ? 'on' : 'off' },
                  { label: 'deviation', value: `${formatUnits(rollout.cost)} units` },
                ]}
              />
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${ROLLOUT_H}`}
            aria-label={`Rollout trace of a policy with per-step error ${epsilonPercent.toFixed(1)} percent over ${steps} steps, drifting away from the demonstrated path.`}
            aria-describedby={`${uid}-rollout-description`}
          >
            <line
              x1={PLOT_LEFT}
              x2={PLOT_LEFT}
              y1={ROLLOUT_TOP}
              y2={ROLLOUT_ZERO}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              opacity={CHART_STRUCTURE.axesOpacity}
            />
            <text
              data-scene-axis=""
              x={PLOT_LEFT}
              y={ROLLOUT_TOP - CHART_STROKE.tickLength - 5}
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              lateral offset
            </text>
            <g data-series="demonstration">
              <path
                d={rollout.expertPath}
                fill="none"
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel
                x={PLOT_RIGHT}
                y={ROLLOUT_ZERO + 4 + LABEL_ASCENT}
                role="reference"
                anchor="end"
              >
                demonstration
              </DirectLabel>
            </g>
            <path
              data-series="policy-rollout"
              d={rollout.tracePath}
              fill="none"
              stroke={roleColour('state')}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />
            {/* Relabeling rounds are crosses on the trace, so they stay
                distinct from the curve under desaturation. */}
            <g>
              {rollout.corrections.map((c) => (
                <PointMarker key={c.x} x={c.x} y={c.y} role="action" shape="cross" />
              ))}
            </g>
          </PlotStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${BOUNDS_H}`}
            aria-label={`Accumulated toy deviation and illustrative reference curves over the episode horizon on a logarithmic deviation axis; neither dashed curve is a bound on the solid trace.`}
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
            {/* Each reference curve and its direct label share one series
                group: the two curves are drawn alike and only the label
                tells them apart. */}
            <g data-series="quadratic-reference">
              <path
                data-testid="bc-bound-curve"
                d={bounds.bcPath}
                fill="none"
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel
                x={QUADRATIC_LABEL_RIGHT}
                y={bounds.quadraticLabelY}
                role="reference"
                anchor="end"
              >
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
            {/* The ring marks the series at the chosen horizon, so it
                belongs to the series group. */}
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
        </FigureStage>
      }
      caption="Drift from the demonstration compounds with the horizon; chunking and relabeling both cut the summed deviation."
      source={`Original deterministic toy: the error slider sets an additive error size, chunk mode adds one error per ${chunkSize} steps, and relabeling removes ${Math.round(DAGGER_CORRECTION * 100)}% of the deviation every ${DAGGER_INTERVAL} steps.`}
    />
  );
}
