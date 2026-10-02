'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  PointMarker,
  StageAnnotation,
  UncertaintyBand,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import {
  COMPLETION_FIT,
  COMPLETION_POINTS,
  DEFAULT_HORIZON_HOURS,
  MAX_HORIZON_HOURS,
  MEASURED_MAX_HOURS,
  MEASURED_MIN_HOURS,
  R_SQUARED,
  SLIDER_MAX,
  SLIDER_MIN,
  SOLVED_BAR_SCORE,
  completionFit,
  formatHours,
  formatLoss,
  formatScore,
  hoursToSlider,
  plateauCompletion,
  plateauLoss,
  sliderToHours,
  solvedBarCrossingHours,
  validationLoss,
} from '@/lib/egoscale-law';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';
import { PUBLIC_IDENTITY } from '@/lib/identity';

/**
 * EgoScaleScaling: what the EgoScale study measured, and how far a straight
 * line through it can honestly be pushed.
 *
 * The main view is the downstream result alone: the five reported
 * task-completion scores (0.30 at 1k hours rising to 0.71 at 20k) with this
 * wiki's own log-linear fit through them, solid where it is measured and
 * dashed past 20k hours, where the stage is shaded and the annotation says
 * the rest is a guess. Three presets move the reader's point along the
 * line: the measured end, five times more video (100k hours, the fit reads
 * 0.89, still under the 0.90 solved bar) and about twelve times more (250k
 * hours, where the fit passes 100%, which is impossible, so the chart stops
 * the line there and says so).
 *
 * "Adjust more" holds the raw horizon slider (20k to 1M hours, log scale),
 * a toggle that adds the paper's own published law, validation loss
 * L = 0.024 - 0.003 ln D (R^2 = 0.9983), as an upper panel together with
 * the scenario bands (law holds against a plateau at the last measured
 * value, a bracket and not a confidence interval), and the reset.
 *
 * No JS-driven motion: the figure changes only when the reader acts.
 */

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS px of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const ASCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.ascent;
const LINE = CHART_TYPE.labelPx * TEXT_UNITS * 1.25;

/**
 * Right edge leaves room for the "1 million" tick label, which centres on
 * the last tick.
 */
const LEFT = 44;
const RIGHT = WIDTH - 38;

/** The loss panel only exists when the reader asks for it. */
const LOSS_PANEL = { left: LEFT, right: RIGHT, top: 30, bottom: 104 } as const;
const LOSS_BLOCK = 118;
/** Two annotation rows and the y-axis name sit above the completion panel. */
const SCORE_TOP_BAND = ASCENT + LINE * 2 + 12;
/** Tall enough that the 10% between the solved bar and the ceiling holds a label. */
const SCORE_PLOT_HEIGHT = 220;
const SCORE_BOTTOM_BAND = 46;

const HOURS_LOG_MIN = 3; // 10^3 = 1k h
const HOURS_LOG_MAX = 6; // 10^6 = 1M h
const LOSS_MAX = 0.03;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/**
 * The hours scale, exported so the render-parity gate can recompute where
 * each measured point must sit from the same constants the chart uses.
 */
export function xFor(hours: number): number {
  const t =
    (Math.log10(hours) - HOURS_LOG_MIN) / (HOURS_LOG_MAX - HOURS_LOG_MIN);
  return f(LEFT + t * (RIGHT - LEFT));
}

/** Sample fn(hours) at log-spaced hours between two hour values. */
function sample(
  from: number,
  to: number,
  fn: (hours: number) => number,
  yMap: (v: number) => number,
): ChartPoint[] {
  const steps = 40;
  const points: ChartPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const h = from * (to / from) ** (i / steps);
    // Round the pixel coordinate, never the data value: rounding the loss
    // to 2 decimals quantizes 0.024..0.015 to a flat 0.02.
    points.push([xFor(h), yMap(fn(h))]);
  }
  return points;
}

function pathOf(points: readonly ChartPoint[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}

/** 100k would crowd the 20k label at 375px on a log axis, so it gets no tick. */
const X_TICKS = [MEASURED_MIN_HOURS, MEASURED_MAX_HOURS, MAX_HORIZON_HOURS];
const LOSS_TICKS = [0, 0.01, 0.02, 0.03];
/**
 * The solved bar's level carries the tick label; the 100% ceiling keeps
 * its gridline but no label, which would collide with the 90% label.
 */
const SCORE_TICKS = [0, 0.5, SOLVED_BAR_SCORE, 1];

/** "1,000", "20,000", "100,000", "1 million": plain numbers, no unit letters. */
function plainHours(hours: number): string {
  if (hours >= 999_500) return '1 million';
  const rounded = hours >= 10_000 ? Math.round(hours / 1000) * 1000 : Math.round(hours / 100) * 100;
  return rounded.toLocaleString('en-US');
}
/** "20k", "250k", "1 million": the article's own way of writing hours. */
function shortHours(hours: number): string {
  return hours >= 999_500 ? '1 million' : `${Math.round(hours / 1000)}k`;
}
const formatLossTick = (loss: number) => (loss === 0 ? '0' : loss.toFixed(2));
const formatScoreTick = (score: number) => (score === 1 ? '' : `${Math.round(score * 100)}%`);
const percent = (score: number) => `${Math.round(score * 100)}%`;

type HorizonPreset = 'measured' | 'five' | 'twelve';
const PRESET_HOURS: Record<HorizonPreset, number> = {
  measured: MEASURED_MAX_HOURS,
  five: 100_000,
  twelve: 250_000,
};

type EgoScaleScalingProps = {
  /**
   * Initial extrapolation horizon in hours of egocentric human video.
   * Defaults to the stock 100k; a prediction step mounts the chart at
   * the horizon that answers its prompt.
   */
  defaultHorizonHours?: number;
  className?: string;
};

export function EgoScaleScaling({
  defaultHorizonHours = DEFAULT_HORIZON_HOURS,
  className,
}: EgoScaleScalingProps) {
  // useId-derived ids: a hardcoded id would duplicate and cross-bind labels
  // whenever two mounts share a page.
  const baseId = useId();
  const horizonId = `${baseId}-horizon`;
  const descriptionId = `${baseId}-description`;
  const [sliderValue, setSliderValue] = useState(() =>
    hoursToSlider(defaultHorizonHours),
  );
  const [showLaw, setShowLaw] = useState(false);
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultHours, setPrevDefaultHours] = useState(defaultHorizonHours);
  if (defaultHorizonHours !== prevDefaultHours) {
    setPrevDefaultHours(defaultHorizonHours);
    setSliderValue(hoursToSlider(defaultHorizonHours));
  }
  const horizon = sliderToHours(sliderValue);
  const extrapolating = horizon > MEASURED_MAX_HOURS * 1.001;
  const preset =
    (Object.keys(PRESET_HOURS) as HorizonPreset[]).find(
      (id) => hoursToSlider(PRESET_HOURS[id]) === sliderValue,
    ) ?? null;

  const lawAtHorizon = validationLoss(horizon);
  const plateauAtHorizon = plateauLoss(horizon);
  const fitAtHorizon = completionFit(horizon);
  const plateauScoreAtHorizon = plateauCompletion(horizon);

  /** Hours at which the completion fit hits 100%: beyond it is impossible. */
  const impossibleHours =
    1000 *
    Math.exp((1 - COMPLETION_FIT.intercept) / COMPLETION_FIT.slope);
  const pastImpossible = fitAtHorizon > 1;

  const scoreOffset = showLaw ? LOSS_BLOCK : 0;
  const SCORE_PANEL = {
    left: LEFT,
    right: RIGHT,
    top: f(scoreOffset + SCORE_TOP_BAND),
    bottom: f(scoreOffset + SCORE_TOP_BAND + SCORE_PLOT_HEIGHT),
  };
  const HEIGHT = Math.round(SCORE_PANEL.bottom + SCORE_BOTTOM_BAND);
  const yLoss = (loss: number) =>
    f(LOSS_PANEL.bottom - (loss / LOSS_MAX) * (LOSS_PANEL.bottom - LOSS_PANEL.top));
  const yScore = (score: number) =>
    f(SCORE_PANEL.bottom - score * (SCORE_PANEL.bottom - SCORE_PANEL.top));

  const measuredLoss = sample(MEASURED_MIN_HOURS, MEASURED_MAX_HOURS, validationLoss, yLoss);
  const measuredFit = sample(MEASURED_MIN_HOURS, MEASURED_MAX_HOURS, completionFit, yScore);
  const extrapolatedLoss = extrapolating
    ? sample(MEASURED_MAX_HOURS, horizon, validationLoss, yLoss)
    : null;
  const extrapolatedFit = extrapolating
    ? sample(MEASURED_MAX_HOURS, Math.min(horizon, impossibleHours), completionFit, yScore)
    : null;
  // The completion band's law edge holds at 100% past the crossing: the
  // scenario cannot score above certainty even where the fit line stops.
  const cappedFit = extrapolating
    ? sample(MEASURED_MAX_HOURS, horizon, (h) => Math.min(completionFit(h), 1), yScore)
    : null;

  const boundaryX = xFor(MEASURED_MAX_HOURS);
  const horizonX = xFor(horizon);
  const lossPlateau: ChartPoint[] = [
    [boundaryX, yLoss(plateauAtHorizon)],
    [horizonX, yLoss(plateauAtHorizon)],
  ];
  const scorePlateau: ChartPoint[] = [
    [boundaryX, yScore(plateauScoreAtHorizon)],
    [horizonX, yScore(plateauScoreAtHorizon)],
  ];
  const solvedY = yScore(SOLVED_BAR_SCORE);
  const lastMeasured = COMPLETION_POINTS[COMPLETION_POINTS.length - 1];

  function reset() {
    setSliderValue(hoursToSlider(defaultHorizonHours));
    setShowLaw(false);
  }

  const barRelation = pastImpossible
    ? 'past 100%, which is impossible'
    : fitAtHorizon >= SOLVED_BAR_SCORE
      ? 'past the solved bar'
      : 'below the solved bar';

  const state = roleColour('state');
  const value = roleColour('value');
  const reference = roleColour('reference');
  const highlight = roleColour('highlight');

  const sampleRows = [
    { hours: 1000, region: 'measured' },
    { hours: 4000, region: 'measured' },
    { hours: 10_000, region: 'measured' },
    { hours: 20_000, region: 'measured range ends' },
  ].map(({ hours, region }) => {
    const reported = COMPLETION_POINTS.find((p) => p.hours === hours);
    return {
      label: formatHours(hours),
      values: [
        formatLoss(validationLoss(hours)),
        reported ? formatScore(reported.score) : 'n/a',
        formatScore(completionFit(hours)),
        region,
      ],
    };
  }).concat([
    {
      label: formatHours(100_000),
      values: [
        `${formatLoss(validationLoss(100_000))} holds / ${formatLoss(plateauLoss(100_000))} plateau`,
        'n/a',
        `${formatScore(completionFit(100_000))} holds / ${formatScore(plateauCompletion(100_000))} plateau`,
        'extrapolated, dashed',
      ],
    },
    {
      label: formatHours(1_000_000),
      values: [
        `${formatLoss(validationLoss(1_000_000))} holds / ${formatLoss(plateauLoss(1_000_000))} plateau`,
        'n/a',
        // Uncapped, matching the readout: at 1M the fit reads 1.17,
        // past 100 percent and impossible, which the region cell
        // states in words so the row is honest read cold.
        `${formatScore(completionFit(1_000_000))} holds / ${formatScore(plateauCompletion(1_000_000))} plateau`,
        'extrapolated, dashed, fit past 100 percent, impossible',
      ],
    },
  ]);

  const description =
    defaultHorizonHours !== DEFAULT_HORIZON_HOURS
      ? `The generalization prediction-step law panel is seeded past the 100 percent crossing: validation loss still falls from ${formatLoss(validationLoss(MEASURED_MIN_HOURS))} at 1k hours to ${formatLoss(validationLoss(MEASURED_MAX_HOURS))} at 20k hours, but the completion fit is already flagged as impossible at the ${formatHours(horizon)} horizon rather than drawn through 100 percent.`
      : `Validation loss falls from ${formatLoss(validationLoss(MEASURED_MIN_HOURS))} at 1k hours to ${formatLoss(validationLoss(MEASURED_MAX_HOURS))} at 20k hours, the end of the measured range, while task completion rises from 0.30 to 0.71; past that boundary the dashed extrapolation to the ${formatHours(horizon)} horizon reads ${formatLoss(lawAtHorizon)} if the law holds against ${formatLoss(plateauAtHorizon)} at the plateau, the shaded scenario band between them is a scenario bracket and not a confidence interval, the completion fit stays below the 90 percent solved bar until ${Math.round(solvedBarCrossingHours() / 1000)}k hours, and it exceeds 100 percent past ${Math.round(impossibleHours / 1000)}k hours, which the chart flags instead of drawing.`;

  // The first note names the end of the measurements and rings the last
  // measured score; it is written from the left edge because the shaded
  // region alone is too narrow for it at 375px.
  const noteRow1 = scoreOffset + ASCENT;
  const noteRow2 = noteRow1 + LINE;
  const lastMeasuredPoint: [number, number] = [boundaryX, yScore(lastMeasured.score)];
  // The second note, only past the crossing, sits low in the shaded region
  // where the line never goes, and its leader climbs to the crossing.
  const crossing: [number, number] = [xFor(impossibleHours), yScore(1)];
  const bendNoteTop = yScore(0.43);
  const bendLines = ['Here a straight line', 'would pass 100%:', 'impossible, so the', 'real curve must bend'];

  const ringAt: [number, number] | null = pastImpossible
    ? null
    : extrapolating
      ? [horizonX, yScore(fitAtHorizon)]
      : lastMeasuredPoint;

  // The readout gives the score as the article and its prediction step
  // write it (0.89) and as a percentage, so the two always agree.
  let readout: ReactNode;
  if (!extrapolating) {
    readout = (
      <>
        At {shortHours(MEASURED_MAX_HOURS)} hours, the most the study measured, robots finished{' '}
        <span data-testid="completion-readout" style={{ color: value }}>
          {percent(lastMeasured.score)} of each task (a score of {formatScore(lastMeasured.score)})
        </span>
        .
      </>
    );
  } else if (pastImpossible) {
    readout = (
      <>
        At {shortHours(horizon)} hours a straight line would{' '}
        <span data-testid="completion-readout" style={{ color: value }}>
          pass 100% (a score of {formatScore(fitAtHorizon)}), which is impossible
        </span>
        .
      </>
    );
  } else {
    readout = (
      <>
        At {shortHours(horizon)} hours the trend line scores{' '}
        <span data-testid="completion-readout" style={{ color: value }}>
          {formatScore(fitAtHorizon)}, or {percent(fitAtHorizon)},{' '}
          {fitAtHorizon >= SOLVED_BAR_SCORE ? 'past' : 'still below'} the bar for solved
        </span>
        .
      </>
    );
  }

  return (
    <InstrumentFigure
      figureId="egoscale-scaling"
      className={className}
      kicker="EgoScale scaling law"
      heading="Robots improve with more video; beyond 20,000 hours is guesswork"
      controls={
        <PresetGroup<HorizonPreset>
          label="How much video?"
          presets={[
            { id: 'measured', label: 'Measured (20,000 hours)' },
            { id: 'five', label: '5 times more' },
            { id: 'twelve', label: 'About 12 times more' },
          ]}
          value={preset}
          onChange={(id) => setSliderValue(hoursToSlider(PRESET_HOURS[id]))}
          testId="egoscale-preset"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={horizonId}
              value={<span data-testid="horizon-readout">{formatHours(horizon)}</span>}
            >
              Hours of video
            </ControlLabel>
            <input
              id={horizonId}
              type="range"
              data-brand-control-id="control:input"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={1}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              aria-label={`Hours of video (extrapolation horizon, log scale), currently ${plainHours(horizon)} hours`}
              aria-valuetext={`${plainHours(horizon)} hours`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="20,000" high="1 million" />
          </ControlField>
          <button
            data-brand-control-id="control:selection"
            type="button"
            aria-pressed={showLaw}
            onClick={() => setShowLaw((v) => !v)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            Show the paper&rsquo;s error measure
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <StageReadout data-testid="projection-summary">{readout}</StageReadout>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Task completion against hours of human video, measured from 1,000 to 20,000 hours, with a straight-line trend extended to ${plainHours(horizon)} hours (${formatHours(horizon)})${showLaw ? ', above the paper\u2019s validation-loss law' : ''}`}
            aria-describedby={descriptionId}
          >
            {/* Everything right of 20k hours is not measured: shaded. */}
            <rect
              data-chart-mark="region"
              data-chart-role="reference"
              x={boundaryX}
              y={showLaw ? LOSS_PANEL.top : SCORE_PANEL.top}
              width={f(RIGHT - boundaryX)}
              height={f(SCORE_PANEL.bottom - (showLaw ? LOSS_PANEL.top : SCORE_PANEL.top))}
              fill={reference}
              fillOpacity={CHART_UNCERTAINTY.fillAlpha * 0.6}
            />
            <line
              x1={boundaryX}
              x2={boundaryX}
              y1={showLaw ? LOSS_PANEL.top : SCORE_PANEL.top}
              y2={SCORE_PANEL.bottom}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray={CHART_STROKE.dash}
              opacity={CHART_STRUCTURE.axesOpacity}
            />

            {showLaw ? (
              <g data-series="loss-law">
                <ChartAxes
                  plot={LOSS_PANEL}
                  x={xFor}
                  y={yLoss}
                  yTicks={LOSS_TICKS}
                  formatY={formatLossTick}
                  yLabel="prediction error, lower is better"
                />
                {extrapolatedLoss ? (
                  <g data-testid="uncertainty-band">
                    <UncertaintyBand upper={extrapolatedLoss} lower={lossPlateau} role="state" />
                  </g>
                ) : null}
                <path
                  data-testid="measured-loss-law"
                  d={pathOf(measuredLoss)}
                  fill="none"
                  stroke={state}
                  strokeWidth={CHART_STROKE.reference}
                  strokeLinejoin="round"
                />
                {extrapolatedLoss ? (
                  <path
                    data-testid="extrapolated-loss-law"
                    d={pathOf(extrapolatedLoss)}
                    fill="none"
                    stroke={state}
                    strokeWidth={CHART_STROKE.reference}
                    strokeDasharray={CHART_STROKE.dash}
                  />
                ) : null}
                {COMPLETION_POINTS.map((p) => (
                  <g key={`loss-${p.hours}`} data-testid={`loss-point-${p.hours}`}>
                    <circle cx={xFor(p.hours)} cy={yLoss(validationLoss(p.hours))} r={CHART_STROKE.markerRadius - 1} fill={state} />
                  </g>
                ))}
              </g>
            ) : null}

            <ChartAxes
              plot={SCORE_PANEL}
              x={xFor}
              y={yScore}
              xTicks={X_TICKS}
              formatX={plainHours}
              yTicks={SCORE_TICKS}
              formatY={formatScoreTick}
              xLabel="hours of first-person human video"
              yLabel="share of each task finished"
            />

            {/* The labelled group gives the bar a real bounding box. */}
            <g data-testid="solved-bar">
              <line
                x1={SCORE_PANEL.left}
                x2={SCORE_PANEL.right}
                y1={solvedY}
                y2={solvedY}
                stroke={reference}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={SCORE_PANEL.left + 6} y={f(solvedY - 5)} role="reference">
                the bar for &ldquo;solved&rdquo;
              </DirectLabel>
            </g>

            {/* The editorial fit: thin through the measurements, dashed past them. */}
            <g data-series="completion-fit">
              {showLaw && cappedFit ? (
                <g data-testid="completion-band">
                  <UncertaintyBand upper={cappedFit} lower={scorePlateau} role="value" />
                </g>
              ) : null}
              <path
                data-testid="measured-completion-fit"
                d={pathOf(measuredFit)}
                fill="none"
                stroke={value}
                strokeWidth={CHART_STROKE.reference}
                strokeLinejoin="round"
              />
              {extrapolatedFit ? (
                <path
                  data-testid="extrapolated-completion-fit"
                  d={pathOf(extrapolatedFit)}
                  fill="none"
                  stroke={value}
                  strokeWidth={CHART_STROKE.trace}
                  strokeDasharray={CHART_STROKE.dash}
                />
              ) : null}
              {extrapolatedFit ? (
                <DirectLabel x={f(boundaryX + 6)} y={yScore(0.58)} role="value">
                  if the trend held
                </DirectLabel>
              ) : null}
            </g>

            <g data-series="measured">
              {COMPLETION_POINTS.map((p) => (
                <g key={`completion-${p.hours}`} data-testid={`completion-point-${p.hours}`}>
                  <PointMarker x={xFor(p.hours)} y={yScore(p.score)} />
                </g>
              ))}
              <DirectLabel x={LEFT + 8} y={yScore(0.62)} role="measurement">
                measured
              </DirectLabel>
            </g>

            {ringAt ? (
              <g data-selection="current horizon">
                <circle
                  data-testid="horizon-marker"
                  cx={ringAt[0]}
                  cy={ringAt[1]}
                  r={CHART_STROKE.markerRadius + 2}
                  fill="none"
                  stroke={highlight}
                  strokeWidth={CHART_STROKE.trace}
                />
              </g>
            ) : null}

            <StageAnnotation
              x={8}
              y={f(noteRow1)}
              lines={['Measurements stop at 20,000 hours;', 'everything to the right is a guess']}
              from={[boundaryX, f(noteRow2 + 6)]}
              target={lastMeasuredPoint}
            />
            {pastImpossible ? (
              <g data-testid="impossible-note">
                <StageAnnotation
                  x={RIGHT}
                  y={f(bendNoteTop)}
                  anchor="end"
                  lines={bendLines}
                  from={[crossing[0], f(bendNoteTop - ASCENT - 2)]}
                  target={crossing}
                />
              </g>
            ) : null}
          </PlotStage>
        </FigureStage>
      }
      caption="Training on more first-person human video made robots finish more tasks, but the study stopped at 20,000 hours, so further gains are unproven."
      method={
        <>
          <p>
            EgoScale (Zheng et al. 2026) pretrained one robot model on 1k, 2k, 4k, 10k and 20k
            hours of first-person (egocentric) human video, then post-trained each on robot tasks
            with a 22-DoF dexterous hand. Average task completion rose from 0.30 at 1k hours to
            0.71 at 20k; the dots are those five reported scores. The paper states that it does
            not extrapolate beyond the measured range.
          </p>
          <p data-testid="scaling-legend">
            The line is this wiki&rsquo;s own least-squares log-linear fit through the five
            scores, an editorial completion fit ({PUBLIC_IDENTITY}, R&sup2; ={' '}
            {COMPLETION_FIT.rSquared.toFixed(2)}), not the paper&rsquo;s law. It reads 0.89 at
            100k hours, crosses the 0.90 solved bar near{' '}
            {Math.round(solvedBarCrossingHours() / 1000)}k hours and passes 100% near{' '}
            {Math.round(impossibleHours / 1000)}k hours, which is impossible. The hours axis is
            logarithmic. The solved bar is this article&rsquo;s criterion: one policy above 90%
            success across many unseen homes with no per-site data.
          </p>
          <p>
            The paper&rsquo;s published law is about validation loss (MSE on held-out human
            video): L = 0.024 &minus; 0.003 ln D, D in thousands of hours, R&sup2; = {R_SQUARED},
            over the five scales. &ldquo;Show the paper&rsquo;s error measure&rdquo; in
            &ldquo;Adjust more&rdquo; draws it above the completion panel. Past 20k hours both
            panels then show a scenario band, a scenario bracket between the law holding and a
            plateau at the last measured value, not a confidence interval.
          </p>
          <p>
            At the current setting ({formatHours(horizon)}): loss{' '}
            <span data-testid="loss-readout" style={{ color: state }}>
              {formatLoss(lawAtHorizon)} holds / {formatLoss(plateauAtHorizon)} plateau
            </span>
            ; completion fit{' '}
            <span data-testid="completion-fit-readout" style={{ color: value }}>
              {formatScore(fitAtHorizon)} holds / {formatScore(plateauScoreAtHorizon)} plateau,{' '}
              {barRelation}
            </span>
            {pastImpossible ? '; the curve must bend before then' : ''}.
          </p>
          <p data-testid="scaling-caveat">
            EgoScale (2026) fits the law to held-out human-video validation loss, a proxy that
            correlates with downstream robot performance without establishing real-world success
            rate across unseen environments.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Sampled loss and completion by pretraining hours"
            rowHeader="pretraining hours"
            columns={[
              { header: 'loss (MSE)', numeric: true },
              { header: 'reported completion', numeric: true },
              { header: 'completion fit', numeric: true },
              { header: 'region', numeric: false },
            ]}
            rows={sampleRows}
            description={description}
          />
        </>
      }
      source="Measured points: EgoScale (Zheng et al. 2026), Figure 5."
    />
  );
}
