'use client';

import { useId, useMemo, useState } from 'react';
import { compoundingCurve, compoundedSuccessRate } from '@/lib/reliability';
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
  LegendSwatch,
  roleColour,
  CHART_STROKE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';

/**
 * ReliabilityCompounding: the compounding cost of per-step error.
 *
 * Two sliders (per-step success probability, episode length) drive a trace
 * of P(episode success) = p^n with a live readout; optional presets jump to
 * named settings. Honors the interactive contract: typed props,
 * deterministic render, visible numeric readout, reset control,
 * keyboard-accessible native sliders, fixed-height chart, no auto-playing
 * motion. The evaluation-crisis and reliability-gap modules mount it with
 * different defaults.
 */
type ReliabilityCompoundingPreset = {
  /** Per-step success probability in [0, 1]. */
  perStep: number;
  /** Episode length in steps. */
  steps: number;
};

/**
 * Named preset sets, so an article selects one by name and its prose keeps
 * no extra numbers. `per-step-thresholds` is the reliability-gap bar: 95%,
 * 99% and 99.9% per step over one fixed 30-step episode.
 */
const PRESET_SETS = {
  'per-step-thresholds': [
    { perStep: 0.95, steps: 30 },
    { perStep: 0.99, steps: 30 },
    { perStep: 0.999, steps: 30 },
  ],
} as const satisfies Record<string, ReadonlyArray<ReliabilityCompoundingPreset>>;

type ReliabilityCompoundingProps = {
  /** Initial per-step success probability in [0, 1]. Default 0.95. */
  defaultPerStep?: number;
  /** Initial episode length in steps. Default 30. */
  defaultSteps?: number;
  /** Longest episode the chart draws. Default 100. */
  maxSteps?: number;
  /**
   * Lowest selectable per-step success, in percent. Default 50; the
   * evaluation-crisis module passes 0 so the 0% boundary is reachable.
   */
  minPerStepPercent?: number;
  /**
   * Highest selectable per-step success, in percent. Default 99.9; the
   * evaluation-crisis module passes 100 so perfect reliability is reachable.
   */
  maxPerStepPercent?: number;
  /** A named set of settings the reader can jump to with one press. */
  presets?: keyof typeof PRESET_SETS;
  /**
   * Distinguishes reused mounts so VAL-EDU-036 takeaways stay structurally
   * different after digit-run normalisation.
   */
  descriptionVariant?: 'home' | 'evaluation' | 'reliability' | 'prediction';
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 190;
const PAD = { top: 16, right: 18, bottom: 46, left: 52 };

const PLOT = {
  left: PAD.left,
  right: WIDTH - PAD.right,
  top: PAD.top,
  bottom: HEIGHT - PAD.bottom,
};

const PLAYHEAD_RADIUS = CHART_STROKE.markerRadius + 2;

/** The legend swatch for the playhead ring, drawn as the plot draws it. */
function PlayheadSwatch() {
  const size = CHART_TYPE.tickPx;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size * 2}
      height={size}
      viewBox={`0 0 ${size * 2} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={size}
        cy={size / 2}
        r={size / 2 - CHART_STROKE.trace / 2 - 0.5}
        fill="none"
        stroke={roleColour('highlight')}
        strokeWidth={CHART_STROKE.trace}
      />
    </svg>
  );
}

function scaleX(n: number, maxSteps: number): number {
  return PLOT.left + (n / maxSteps) * (PLOT.right - PLOT.left);
}

function scaleY(p: number): number {
  return PLOT.bottom - p * (PLOT.bottom - PLOT.top);
}

const DEFAULT_MIN_PER_STEP_PERCENT = 50;
const DEFAULT_MAX_PER_STEP_PERCENT = 99.9;

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** A preset's per-step success on the slider's 0.1-point grid. */
function presetPercent(preset: ReliabilityCompoundingPreset): number {
  return Math.round(preset.perStep * 1000) / 10;
}

function presetLabel(percent: number): string {
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function reliabilityTakeaway(args: {
  variant: NonNullable<ReliabilityCompoundingProps['descriptionVariant']>;
  perStepPercent: number;
  steps: number;
  maxSteps: number;
  successPct: string;
  endPct: string;
  crossSteps: number;
}): string {
  const { variant, perStepPercent, steps, maxSteps, successPct, endPct, crossSteps } =
    args;
  if (variant === 'prediction') {
    return `The evaluation-crisis prediction panel is seeded at ${steps} steps so episode success sits at ${successPct} when per-step success is ${perStepPercent.toFixed(1)} percent, and the curve still ends at ${endPct} by step ${maxSteps} after crossing 50 percent near step ${crossSteps}.`;
  }
  if (variant === 'reliability') {
    return `On the reliability-gap calculator a ${perStepPercent.toFixed(1)} percent per-step policy yields ${successPct} episode success at ${steps} steps and only ${endPct} at the ${maxSteps}-step far end, with the 50 percent crossing near step ${crossSteps}.`;
  }
  if (variant === 'evaluation') {
    return `The evaluation calculator at ${perStepPercent.toFixed(1)} percent per-step success reports ${successPct} episode success after ${steps} decisions and ${endPct} at the ${maxSteps}-step end of the range, crossing half only around step ${crossSteps}.`;
  }
  return `At ${perStepPercent.toFixed(1)} percent per-step success, episode success is ${successPct} at ${steps} steps and ${endPct} at the ${maxSteps}-step end of the plotted range, crossing 50 percent at ${crossSteps} steps as the per-step odds compound over the episode length.`;
}

export function ReliabilityCompounding({
  defaultPerStep = 0.95,
  defaultSteps = 30,
  maxSteps = 100,
  minPerStepPercent = DEFAULT_MIN_PER_STEP_PERCENT,
  maxPerStepPercent = DEFAULT_MAX_PER_STEP_PERCENT,
  presets,
  descriptionVariant = 'home',
  className,
}: ReliabilityCompoundingProps) {
  // useId-derived ids: this component can render twice on one page, and a
  // hardcoded id would duplicate and cross-bind the labels.
  const uid = useId();
  const perStepId = `${uid}-rc-per-step`;
  const stepsId = `${uid}-rc-steps`;
  const descriptionId = `${uid}-rc-description`;
  const presetsLabelId = `${uid}-rc-presets`;
  const [perStepPercent, setPerStepPercent] = useState(defaultPerStep * 100);
  const [steps, setSteps] = useState(defaultSteps);

  const perStep = perStepPercent / 100;
  const episodeSuccess = compoundedSuccessRate(perStep, steps);
  const presetList: ReadonlyArray<ReliabilityCompoundingPreset> = presets
    ? PRESET_SETS[presets]
    : [];

  const { path, marker, sampleRows } = useMemo(() => {
    const curve = compoundingCurve(perStep, maxSteps);
    const d = curve
      .map((p, n) => `${n === 0 ? 'M' : 'L'}${scaleX(n, maxSteps).toFixed(2)},${scaleY(p).toFixed(2)}`)
      .join(' ');
    // The sampled table is derived from the same curve the path is drawn
    // from, so the two can never disagree (VAL-EDU-023) and the sample
    // moves with the per-step control (VAL-EDU-024).
    const sample = [0, 10, 25, 50, 75, maxSteps].map((n) => ({
      label: `${n} step${n === 1 ? '' : 's'}`,
      values: [
        `${(compoundedSuccessRate(perStep, n) * 100).toFixed(1)}%`,
      ],
    }));
    return {
      path: d,
      marker: { cx: scaleX(steps, maxSteps), cy: scaleY(compoundedSuccessRate(perStep, steps)) },
      sampleRows: sample,
    };
  }, [perStep, steps, maxSteps]);

  const successPct = formatPercent(episodeSuccess);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxSteps));
  const value = roleColour('value');

  function reset() {
    setPerStepPercent(defaultPerStep * 100);
    setSteps(defaultSteps);
  }

  return (
    <InstrumentFigure
      figureId="reliability-compounding"
      className={className}
      heading="Episode success by episode length"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={perStepId} value={`${perStepPercent.toFixed(1)}%`}>
              Per-step success
            </ControlLabel>
            <input
              id={perStepId}
              type="range"
              data-brand-control-id="control:input"
              min={minPerStepPercent}
              max={maxPerStepPercent}
              step={0.1}
              value={perStepPercent}
              onChange={(e) => setPerStepPercent(Number(e.target.value))}
              aria-label={`Per-step success probability in percent, currently ${perStepPercent.toFixed(1)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor={stepsId} value={`${steps} steps`}>
              Episode length
            </ControlLabel>
            <input
              id={stepsId}
              type="range"
              data-brand-control-id="control:input"
              min={1}
              max={maxSteps}
              step={1}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              aria-label={`Episode length in steps, currently ${steps}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          {presetList.length > 0 ? (
            <div
              role="group"
              aria-labelledby={presetsLabelId}
              className="flex flex-wrap items-center gap-1"
            >
              <span id={presetsLabelId} className="font-sans text-[13px] text-text-dim">
                Presets
              </span>
              {presetList.map((preset) => {
                const percent = presetPercent(preset);
                const label = presetLabel(percent);
                const active =
                  Math.abs(perStepPercent - percent) < 0.05 && steps === preset.steps;
                return (
                  <button
                    key={`${percent}-${preset.steps}`}
                    type="button"
                    data-brand-control-id="control:selection"
                    aria-pressed={active}
                    aria-label={`${label} per step, ${preset.steps} steps`}
                    onClick={() => {
                      setPerStepPercent(percent);
                      setSteps(preset.steps);
                    }}
                    className={INSTRUMENT_TOGGLE_CLASS}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="episode-success" swatch={<LegendSwatch role="value" mark="line" />}>
                  episode success, p^n
                </LegendItem>
                <LegendItem swatch={<PlayheadSwatch />}>current episode length</LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span className="text-text-dim">
                  ({perStep.toFixed(3)})^{steps} =
                </span>{' '}
                <span data-testid="episode-success-readout" style={{ color: value }}>
                  {successPct}
                </span>{' '}
                <span className="text-text-dim">episode success</span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="table"
                summary="Sampled episode success by episode length"
                rowHeader="episode length"
                columns={[{ header: 'episode success', numeric: true }]}
                rows={sampleRows}
                description={reliabilityTakeaway({
                  variant: descriptionVariant,
                  perStepPercent,
                  steps,
                  maxSteps,
                  successPct,
                  endPct: formatPercent(compoundedSuccessRate(perStep, maxSteps)),
                  crossSteps: Math.max(
                    1,
                    Math.round(Math.log(0.5) / Math.log(perStep)),
                  ),
                })}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Line chart of episode success against episode length at ${perStepPercent.toFixed(1)} percent per-step success`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={(n) => scaleX(n, maxSteps)}
              y={scaleY}
              xTicks={xTicks}
              yTicks={[0, 0.25, 0.5, 0.75, 1]}
              formatY={(p) => `${Math.round(p * 100)}%`}
              xLabel="episode length (steps)"
            />
            <path
              data-series="episode-success"
              d={path}
              fill="none"
              stroke={value}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />
            <circle
              data-chart-mark="playhead"
              data-chart-role="highlight"
              data-selection=""
              cx={marker.cx}
              cy={marker.cy}
              r={PLAYHEAD_RADIUS}
              fill="none"
              stroke={roleColour('highlight')}
              strokeWidth={CHART_STROKE.trace}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="Episode success is per-step success raised to the episode length, so small per-step errors compound over long episodes."
      source="Illustrative probability model: computed compounding curves, not a measured robot policy."
    />
  );
}
