'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import {
  ChartAxes,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  linearScale,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  HEIGHT as BENCH_HEIGHT,
  PHONE_FIT,
  WIDTH as BENCH_WIDTH,
  benchParts,
  offsetOf,
  stoppedByHub,
  type Part,
} from '@/components/iso/figures/track-laying-bench';
import {
  MAX_HORIZON,
  REWARD_ERROR_GAIN,
  TYPICAL_HORIZON,
  deviationAt,
  imagineDeviation,
  rewardPredictionError,
} from '@/lib/latent-imagination';

/**
 * LatentImagination: an illustrative compounding-error toy, drawn as a
 * track-laying bench. Each imagined step is one section of track bolted to
 * the end of the last, so the track's head peels away from the curved
 * steel template that marks the real route, by the toy deviation. A
 * trolley (the one lit part) stands at the head; a radius arm on the hub
 * reads how far it is from the route. The recurrence, the bench, the
 * picture flags and the shaded 3-15 step band in the method chart are
 * teaching choices, not measured model predictions, published horizon
 * bounds or reliability estimates. The sliders redraw the bench at once;
 * "Lay the track" lays it again section by section and is the only motion,
 * which reduced motion skips.
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
/** Below this inward offset (world units, about 0.075 of toy deviation) the head still sits on the route. */
const VISIBLE_GAP = 8;
/** Seconds between sections while the track is laid again. */
const LAY_STEP_S = 0.14;
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

/** The note under the bench: how far the imagined head is from the real route. */
function noteLines(horizon: number, gap: number, stopped: boolean): readonly [string, string] {
  if (gap < VISIBLE_GAP) return [`${stepsWord(horizon)} ahead:`, 'still close to the real route'];
  if (stopped) return [`${stepsWord(horizon)} ahead: so far off,`, 'it has already run into the hub'];
  return [`${stepsWord(horizon)} ahead:`, 'already this far off'];
}

/** The imagined steps Dreamer decodes into pictures: a quarter, a half and three quarters of the way. */
function pictureSteps(horizon: number): number[] {
  return [Math.round(horizon / 4), Math.round(horizon / 2), Math.round((3 * horizon) / 4)].filter(
    (t, i, all) => t >= 1 && t < horizon && all.indexOf(t) === i,
  );
}

const GROUP_TEST_IDS: Record<string, string> = {
  'decoded-frames': 'decoded-frames',
  'drift-bracket': 'drift-bracket',
  trolley: 'imagined-head',
};

function PartView({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  const data = Object.fromEntries(Object.entries(part.data ?? {}).map(([key, value]) => [`data-${key}`, value]));
  return (
    <g data-testid={GROUP_TEST_IDS[part.role]} data-part={part.role} {...data}>
      {part.parts.map((child, index) => (
        <PartView key={index} part={child} />
      ))}
    </g>
  );
}

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

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
  // While the track is laid again, how many sections are down; null when the bench shows the whole look-ahead.
  const [laying, setLaying] = useState<number | null>(null);

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
  const rewardErrors = sampleSteps.map((t) => ({ t, value: REWARD_ERROR_GAIN * fullDeviation[t] }));

  function reset() {
    setLaying(null);
    setHorizon(defaultHorizon);
    setEpsilonPercent(defaultEpsilon * 100);
    setMode('decoder');
  }

  // "Lay the track": the sections go down one at a time, each from the end of the last; once the last
  // section is down the bench is back at rest.
  useEffect(() => {
    if (laying === null) return;
    const timer = window.setTimeout(
      () => setLaying((n) => (n === null || n + 1 >= horizon ? null : n + 1)),
      LAY_STEP_S * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [laying, horizon]);

  function layTrack() {
    if (laying !== null) {
      setLaying(null);
      return;
    }
    // A one-step horizon is already fully laid, so there is nothing to lay.
    if (calm() || horizon <= 1) return;
    setLaying(1);
  }

  const shown = laying ?? horizon;
  const shownDeviation = fullDeviation[shown] ?? 0;
  const gap = offsetOf(deviationNow);
  const stopped = stoppedByHub(deviationNow);
  const lines = noteLines(horizon, gap, stopped);
  const parts = benchParts({
    deviation: fullDeviation,
    laid: shown,
    errorShare: (epsilonPercent - MIN_EPSILON_PERCENT) / (MAX_EPSILON_PERCENT - MIN_EPSILON_PERCENT),
    pictures: mode === 'decoder' ? pictureSteps(horizon) : [],
    visibleGap: VISIBLE_GAP,
  });
  // TD-MPC2 shows its drift as reward error, so the stage says that number too.
  const rewardWords = mode === 'decoder-free' ? ` · reward error ${formatUnits(rewardError)}` : '';
  const readout =
    laying === null
      ? `${stepsWord(horizon)} ahead · ${formatUnits(deviationNow)} off the route${rewardWords}`
      : `laying step ${shown} of ${horizon} · ${formatUnits(shownDeviation)} off the route`;

  const rolloutStage = (
    <AnatomyStage
      viewWidth={BENCH_WIDTH}
      hint={<span data-testid="drift-note">{lines.join(' ')}</span>}
      readout={readout}
      status="Illustrative: a toy model, not measured on a real robot."
      data-testid="latent-imagination-stage"
      data-stopped={stopped ? '' : undefined}
    >
      <IsoFigure
        width={BENCH_WIDTH}
        height={BENCH_HEIGHT}
        fit={PHONE_FIT}
        label={`A robot's imagined track ${stepsWord(horizon)} ahead, at ${errorWords}, ending ${formatUnits(deviationNow)} units of toy deviation off the real route`}
        describedBy={rolloutDescriptionId}
      >
        {parts.map((part, index) => (
          <PartView key={index} part={part} />
        ))}
      </IsoFigure>
    </AnatomyStage>
  );

  const state = roleColour('state');
  const reference = roleColour('reference');
  const highlight = roleColour('highlight');
  const bandX = stepX(TYPICAL_HORIZON[0]);
  const bandWidth = stepX(TYPICAL_HORIZON[1]) - bandX;
  const deviationStage = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`}
      aria-label={`Latent deviation versus imagination step in a deterministic toy. Deviation reaches ${formatUnits(deviationNow)} units at step ${horizon}. The shaded 3 to 15 step band is illustrative, not a published reliability bound.`}
      aria-describedby={descriptionId}
    >
      {/* Labelled by the "shaded: …" note drawn after the axes. */}
      <rect data-testid="typical-range-band" data-series="typical-range" data-chart-role="reference" x={bandX} y={PLOT.top} width={bandWidth} height={PLOT.bottom - PLOT.top} fill={reference} fillOpacity={CHART_UNCERTAINTY.fillAlpha} stroke="none" />
      <ChartAxes plot={PLOT} x={stepX} y={deviationY} xTicks={STEP_TICKS} yTicks={DEVIATION_TICKS} xLabel="steps imagined ahead" yLabel="how far off" yLabelFor="deviation" />
      <text data-scene-axis="" data-series-label-for="typical-range" x={bandX} y={BAND_NOTE_Y} fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
        shaded: an illustrative {TYPICAL_HORIZON[0]} to {TYPICAL_HORIZON[1]} steps
      </text>
      {/* The one curve is the quantity the y axis names ("how far off"), solid to the horizon and dashed past it. */}
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
              onChange={(e) => {
                setLaying(null);
                setHorizon(Number(e.target.value));
              }}
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
              onChange={(e) => {
                setLaying(null);
                setEpsilonPercent(Number(e.target.value));
              }}
              aria-label={`How accurate each step is, currently ${errorWords}`}
              aria-valuetext={errorWords}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="sharp" high="sloppy" />
          </ControlField>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={layTrack}
            data-testid="lay-track"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {laying !== null ? 'Stop laying' : 'Lay the track'}
          </button>
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
              TD-MPC2 draws no pictures, so the picture flags are gone. Its drift shows up instead as error
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
      stage={rolloutStage}
      caption="Robots plan by imagining the future; each imagined step builds on the last, so short look-aheads stay close and long ones drift."
      method={
        <>
          <p>
            The robot plans by imagining its future one step at a time, and each imagined step starts
            from the last imagined one, not from the real state. On the bench each imagined step is one
            section of track, bolted to the end of the section before it, and the curved steel template
            with a station post every five steps is the real route. A small error at one joint is
            carried into every later section and grows. The bench lays as many sections as the first
            slider says; the knob on the controller turns with the second.
          </p>
          <p>
            The drift is a toy recurrence, not a measured model: each step adds the one-step error,
            scaled up by how far the imagined state has already drifted, d(t) = d(t &minus; 1) + e
            &times; (1 + 0.02 &times; d(t &minus; 1)). At {epsilonPercent.toFixed(1)}% error per step
            and {stepsWord(horizon)} it reaches{' '}
            <span data-testid="deviation-readout">{formatUnits(deviationNow)}</span> units of toy
            latent deviation. The bench draws each unit as the same inward step off the template, read on
            the radius arm, and stops the track at the hub&rsquo;s flange; the number keeps growing.
          </p>
          <p>
            Dreamer learns with a decoder that turns imagined states back into pictures, drawn here as
            picture cards on flags along the track. TD-MPC2 has no decoder: it never draws a picture, and its drift shows up as
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
            summary="Current imagined track"
            description={`In this toy, the head of the track the robot imagines ${stepsWord(horizon)} ahead, at ${errorWords}, is ${formatUnits(deviationNow)} units of toy deviation off the real route; each imagined section is bolted to the last imagined one, so the gap grows with every step of the ${MAX_HORIZON}-step range.`}
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
