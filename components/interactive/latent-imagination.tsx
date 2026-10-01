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
  Bar,
  ChartAxes,
  LegendSwatch,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import {
  MAX_HORIZON,
  REWARD_ERROR_GAIN,
  TYPICAL_HORIZON,
  deviationAt,
  imagineDeviation,
  rewardPredictionError,
  trueLatent,
} from '@/lib/latent-imagination';

/**
 * LatentImagination: an illustrative compounding-error toy.
 *
 * The recurrence deliberately amplifies off-state error. The rollout view,
 * the decoded frames, the deviation curve and the shaded 3-15 step band are
 * generated teaching examples, not measured model predictions, published
 * horizon bounds, or reliability estimates. The model-name toggles
 * illustrate reconstruction versus no reconstruction; the reward-error
 * readout is a chosen multiple of the toy latent deviation.
 *
 * Interactive contract: typed props, deterministic render, reset control,
 * native keyboard-accessible inputs, fixed chart geometry (no layout
 * shift). Scrub-driven only, no auto-playing or JS-driven motion, so it is
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
const HEIGHT = 222;
const PLOT_LEFT = 40;
const PLOT_RIGHT = WIDTH - 18;
const STEP_TICKS = [0, 10, 20, 30, 40, 50];
const stepX = linearScale([0, MAX_HORIZON], [PLOT_LEFT, PLOT_RIGHT]);

/** Rollout view: the latent paths, the step axis, then the frame row. */
const ROLLOUT = { top: 32, bottom: 100, axis: 112 };
const FRAMES = { label: 150, top: 158, height: 38, width: 82, caption: 211 };
const FRAME_GAP = (PLOT_RIGHT - PLOT_LEFT - 3 * FRAMES.width) / 2;
const frameX = (index: number) => PLOT_LEFT + index * (FRAMES.width + FRAME_GAP);
const FRAME_BLOCK = { width: 16, height: 13, inset: 12 };
/** Decoded-object offset per unit of toy deviation, capped inside the frame. */
const FRAME_SHIFT_PER_UNIT = 40;
const FRAME_SHIFT_MAX = FRAMES.width - 2 * FRAME_BLOCK.inset - FRAME_BLOCK.width;

const DEVIATION = { left: PLOT_LEFT, right: PLOT_RIGHT, top: 32, bottom: 168 };
const DEVIATION_TICKS = [0, 1, 2, 3];
// Anchored to the worst case (max error, full horizon) so a longer horizon
// grows the curve instead of rescaling it away.
const DEVIATION_MAX =
  deviationAt({ epsilon: MAX_EPSILON_PERCENT / 100, horizon: MAX_HORIZON }) * 1.05;
const deviationY = linearScale([0, DEVIATION_MAX], [DEVIATION.bottom, DEVIATION.top]);
/** Baseline of the axis-name row, matching the ChartAxes x label. */
const AXIS_NAME_Y =
  DEVIATION.bottom +
  CHART_STROKE.tickLength +
  CHART_TYPE.tickPx * (1 + CHART_TYPE.descent) +
  CHART_TYPE.axisPx * CHART_TYPE.ascent +
  CHART_STROKE.tickLength / 4;

const TRUE_SERIES = Array.from({ length: MAX_HORIZON + 1 }, (_, t) => trueLatent(t));
const TRUE_HIGH = Math.max(...TRUE_SERIES);

const STRUCTURE = {
  stroke: CHART_STRUCTURE.axes,
  strokeWidth: CHART_STROKE.structure,
  opacity: CHART_STRUCTURE.axesOpacity,
};

function formatUnits(value: number): string {
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

function stepPath(values: readonly number[], y: (value: number) => number, first = 0): string {
  return values
    .map((value, i) => `${i === 0 ? 'M' : 'L'}${stepX(first + i).toFixed(2)} ${y(value).toFixed(2)}`)
    .join(' ');
}

/**
 * The rollout view spans the true trajectory plus however far the imagined
 * path has fallen below it, so the peel reads at every horizon; the
 * deviation chart keeps the fixed scale for comparing magnitudes.
 */
function rolloutGeometry(deviation: readonly number[], horizon: number) {
  const imagined = deviation.map((d, t) => TRUE_SERIES[t] - d);
  const low = Math.min(...TRUE_SERIES, ...imagined);
  const y = linearScale([low, TRUE_HIGH], [ROLLOUT.bottom, ROLLOUT.top]);
  return {
    truePath: stepPath(TRUE_SERIES, y),
    imaginedPath: stepPath(imagined, y),
    tip: { x: stepX(horizon), y: y(imagined[horizon]) },
  };
}

/** One decoded frame: the true block (dashed) and the decoded block, offset by the toy deviation. */
function DecodedFrame({ index, step, deviation }: { index: number; step: number; deviation: number }) {
  const x = frameX(index);
  const table = FRAMES.top + FRAMES.height - 8;
  const blockX = x + FRAME_BLOCK.inset;
  const blockY = table - FRAME_BLOCK.height;
  const shift = Math.min(FRAME_SHIFT_MAX, deviation * FRAME_SHIFT_PER_UNIT);
  return (
    <g>
      <g data-scene-structure="frame">
        <rect x={x} y={FRAMES.top} width={FRAMES.width} height={FRAMES.height} fill="none" {...STRUCTURE} />
        <line x1={x + 6} x2={x + FRAMES.width - 6} y1={table} y2={table} {...STRUCTURE} />
      </g>
      <rect
        data-series="true"
        data-chart-role="reference"
        x={blockX}
        y={blockY}
        width={FRAME_BLOCK.width}
        height={FRAME_BLOCK.height}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <rect
        data-series="imagined"
        data-chart-role="state"
        x={blockX + shift}
        y={blockY}
        width={FRAME_BLOCK.width}
        height={FRAME_BLOCK.height}
        fill={roleColour('state')}
        fillOpacity={CHART_UNCERTAINTY.fillAlpha}
        stroke={roleColour('state')}
        strokeWidth={CHART_STROKE.structure}
      />
      <text
        data-scene-tick=""
        x={x + FRAMES.width / 2}
        y={FRAMES.caption}
        textAnchor="middle"
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        t = {step}
      </text>
    </g>
  );
}

/** Decoder-free row: the toy reward error at the same three steps, scaled to the largest. */
function RewardErrorBars({ steps, values }: { steps: readonly number[]; values: readonly number[] }) {
  const base = FRAMES.top + FRAMES.height;
  const peak = Math.max(...values);
  const height = linearScale([0, peak > 0 ? peak : 1], [0, FRAMES.height - 6]);
  return (
    <g data-testid="reward-error-bars">
      <line data-scene-structure="baseline" x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={base} y2={base} {...STRUCTURE} />
      {steps.map((step, index) => {
        const center = frameX(index) + FRAMES.width / 2;
        const barHeight = height(values[index]);
        return (
          <g key={index} data-series="reward-error">
            <Bar x={center - 12} y={base - barHeight} width={24} height={barHeight} role="value" />
            <text
              data-scene-tick=""
              x={center}
              y={FRAMES.caption}
              textAnchor="middle"
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              t = {step}: {formatUnits(values[index])}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function LatentImagination({
  defaultHorizon = TYPICAL_HORIZON[1],
  defaultEpsilon = 0.02,
  className,
}: LatentImaginationProps) {
  const descriptionId = `${useId()}-li-description`;
  const rolloutDescriptionId = `${useId()}-li-rollout`;
  const [horizon, setHorizon] = useState(defaultHorizon);
  const [epsilonPercent, setEpsilonPercent] = useState(defaultEpsilon * 100);
  const [mode, setMode] = useState<ImaginationMode>('decoder');

  const epsilon = epsilonPercent / 100;
  const fullDeviation = useMemo(
    () => imagineDeviation({ epsilon, horizon: MAX_HORIZON }),
    [epsilon],
  );
  const rollout = useMemo(
    () => rolloutGeometry(fullDeviation.slice(0, horizon + 1), horizon),
    [fullDeviation, horizon],
  );
  const deviationNow = deviationAt({ epsilon, horizon });
  const rewardError = rewardPredictionError({ epsilon, horizon });

  const sampleRows = useMemo(() => {
    const steps = [...new Set([0, 10, 20, 30, 40, MAX_HORIZON, horizon])].sort(
      (a, b) => a - b,
    );
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

  // Decoded frames (or reward errors) at quarter, half, and full horizon.
  const frameSteps = [
    Math.max(1, Math.round(horizon / 4)),
    Math.max(1, Math.round(horizon / 2)),
    horizon,
  ];

  function reset() {
    setHorizon(defaultHorizon);
    setEpsilonPercent(defaultEpsilon * 100);
    setMode('decoder');
  }

  const state = roleColour('state');
  const highlight = roleColour('highlight');
  const bandX = stepX(TYPICAL_HORIZON[0]);
  const bandWidth = stepX(TYPICAL_HORIZON[1]) - bandX;
  const playhead = { x: stepX(horizon), y: deviationY(deviationNow) };

  const rolloutStage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Imagined rollout in latent space over ${horizon} steps, peeling away from the true latent trajectory as one-step errors compound.`}
      aria-describedby={rolloutDescriptionId}
    >
      <text
        data-scene-note=""
        x={PLOT_LEFT}
        y={19}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        latent rollout
      </text>
      <ChartAxes
        plot={{ left: PLOT_LEFT, right: PLOT_RIGHT, top: ROLLOUT.top, bottom: ROLLOUT.axis }}
        x={stepX}
        y={(value) => value}
        xTicks={STEP_TICKS}
        grid={false}
        yAxis={false}
      />
      <path
        data-series="true"
        data-chart-role="reference"
        d={rollout.truePath}
        fill="none"
        stroke={roleColour('reference')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <path
        data-series="imagined"
        data-chart-role="state"
        d={rollout.imaginedPath}
        fill="none"
        stroke={state}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        data-series="imagined"
        data-chart-role="state"
        cx={rollout.tip.x}
        cy={rollout.tip.y}
        r={CHART_STROKE.markerRadius}
        fill={state}
      />
      <circle
        data-chart-mark="playhead"
        data-chart-role="highlight"
        cx={rollout.tip.x}
        cy={rollout.tip.y}
        r={CHART_STROKE.markerRadius + 2}
        fill="none"
        stroke={highlight}
        strokeWidth={CHART_STROKE.trace}
      />
      <text
        data-scene-note=""
        x={PLOT_LEFT}
        y={FRAMES.label}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        {mode === 'decoder' ? 'decoded frames' : 'reward prediction error'}
      </text>
      {mode === 'decoder' ? (
        <g data-testid="decoded-frames">
          {frameSteps.map((step, index) => (
            <DecodedFrame key={index} index={index} step={step} deviation={fullDeviation[step]} />
          ))}
        </g>
      ) : (
        <RewardErrorBars
          steps={frameSteps}
          values={frameSteps.map((step) => REWARD_ERROR_GAIN * fullDeviation[step])}
        />
      )}
    </PlotStage>
  );

  const deviationStage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Latent deviation versus imagination step in a deterministic toy. Deviation reaches ${formatUnits(deviationNow)} units at step ${horizon}. The shaded 3 to 15 step band is illustrative, not a published reliability bound.`}
      aria-describedby={descriptionId}
    >
      <rect
        data-testid="typical-range-band"
        data-series="typical-range"
        data-chart-role="reference"
        x={bandX}
        y={DEVIATION.top}
        width={bandWidth}
        height={DEVIATION.bottom - DEVIATION.top}
        fill={roleColour('reference')}
        fillOpacity={CHART_UNCERTAINTY.fillAlpha}
        stroke="none"
      />
      {TYPICAL_HORIZON.map((step) => (
        <line
          key={step}
          data-series="typical-range"
          data-chart-role="reference"
          x1={stepX(step)}
          x2={stepX(step)}
          y1={DEVIATION.top}
          y2={DEVIATION.bottom}
          stroke={roleColour('reference')}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ))}
      <ChartAxes
        plot={DEVIATION}
        x={stepX}
        y={deviationY}
        xTicks={STEP_TICKS}
        yTicks={DEVIATION_TICKS}
        xLabel="imagination step"
        yLabel="latent deviation"
      />
      <text
        data-scene-axis=""
        x={bandX}
        y={AXIS_NAME_Y}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        illustrative {TYPICAL_HORIZON[0]}–{TYPICAL_HORIZON[1]} steps
      </text>
      <path
        data-testid="deviation-curve"
        data-series="deviation"
        data-chart-role="state"
        d={stepPath(fullDeviation.slice(0, horizon + 1), deviationY)}
        fill="none"
        stroke={state}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {horizon < MAX_HORIZON ? (
        <path
          data-series="deviation"
          data-chart-role="state"
          d={stepPath(fullDeviation.slice(horizon), deviationY, horizon)}
          fill="none"
          stroke={state}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
      ) : null}
      <circle
        data-chart-mark="playhead"
        data-chart-role="highlight"
        cx={playhead.x}
        cy={playhead.y}
        r={CHART_STROKE.markerRadius + 2}
        fill="none"
        stroke={highlight}
        strokeWidth={CHART_STROKE.trace}
      />
    </PlotStage>
  );

  return (
    <InstrumentFigure
      figureId="latent-imagination"
      className={className}
      heading="Compounding error in imagination"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="li-horizon" value={`${horizon} steps`}>
              Horizon
            </ControlLabel>
            <input
              id="li-horizon"
              type="range"
              data-brand-control-id="control:input"
              min={1}
              max={MAX_HORIZON}
              step={1}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              aria-label={`Imagination horizon in steps, currently ${horizon}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor="li-epsilon" value={`${epsilonPercent.toFixed(1)}%`}>
              One-step error
            </ControlLabel>
            <input
              id="li-epsilon"
              type="range"
              data-brand-control-id="control:input"
              min={MIN_EPSILON_PERCENT}
              max={MAX_EPSILON_PERCENT}
              step={0.5}
              value={epsilonPercent}
              onChange={(e) => setEpsilonPercent(Number(e.target.value))}
              aria-label={`One-step model error in percent, currently ${epsilonPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <div role="group" aria-label="Model type" className="flex flex-wrap gap-2">
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={mode === 'decoder'}
              onClick={() => setMode('decoder')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Dreamer: with decoder
            </button>
            <button
              data-brand-control-id="control:selection"
              type="button"
              aria-pressed={mode === 'decoder-free'}
              onClick={() => setMode('decoder-free')}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              TD-MPC2: decoder-free
            </button>
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="imagined" swatch={<LegendSwatch role="state" mark="line" />}>
                  imagined
                </LegendItem>
                <LegendItem series="true" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  true
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="dot" />}>
                  current horizon
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                latent deviation Δ({horizon}) ={' '}
                <span data-testid="deviation-readout" style={{ color: state }}>
                  {formatUnits(deviationNow)}
                </span>{' '}
                units at one-step error {epsilonPercent.toFixed(1)}%
                {mode === 'decoder-free' ? (
                  <>
                    , reward prediction error ={' '}
                    <span data-testid="reward-error-readout" style={{ color: roleColour('value') }}>
                      {formatUnits(rewardError)}
                    </span>
                  </>
                ) : null}
              </InstrumentReadout>
              {mode === 'decoder-free' ? (
                <div
                  data-testid="decoder-free-note"
                  className="basis-full font-sans text-[13px] leading-snug text-text-dim"
                >
                  No image reconstruction in this mode. The reward-error readout is a fixed
                  multiple of the toy latent deviation.
                </div>
              ) : null}
              <ChartDescription
                id={rolloutDescriptionId}
                form="state"
                summary="Current imagined rollout"
                description={`In this deterministic toy latent rollout view the solid imagined path leaves the dashed true trajectory after the first few steps and has accumulated ${formatUnits(deviationNow)} units of toy deviation at t = ${horizon} of ${MAX_HORIZON}; that peel illustrates the assumed error recurrence, not measured model drift or a second plot of the same deviation series.`}
                states={[
                  { label: 'horizon', value: `${horizon} steps` },
                  { label: 'one-step error', value: `${epsilonPercent.toFixed(1)}%` },
                  { label: 'endpoint deviation', value: formatUnits(deviationNow) },
                  { label: 'mode', value: mode === 'decoder' ? 'with decoder' : 'decoder-free' },
                ]}
              />
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
            </>
          }
        >
          <div className="grid @min-[640px]:grid-cols-2">
            <div className="@container">{rolloutStage}</div>
            <div className="@container">{deviationStage}</div>
          </div>
        </FigureStage>
      }
      caption="Each imagined step adds error, so the rollout drifts further from the true latent as the horizon grows."
      source="Illustrative toy, not measured model performance. The 3 to 15 step band, error inputs and frames are teaching choices."
    />
  );
}
