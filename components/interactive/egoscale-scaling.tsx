'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  LegendSwatch,
  PointMarker,
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
import { PUBLIC_IDENTITY } from '@/lib/identity';

/**
 * EgoScaleScaling: the EgoScale log-linear scaling law with an honest
 * extrapolation control.
 *
 * Two panels share one log hours axis. The upper panel plots the paper's
 * published law, validation loss L = 0.024 - 0.003 * ln(D) (D in thousands
 * of hours, R^2 = 0.9983), solid over its measured range (1k to 20k hours of
 * egocentric human video). The lower panel plots the five reported
 * downstream task-completion scores (0.30 at 1k rising to 0.71 at 20k) with
 * this wiki's own log-linear fit through them, dashed throughout because it
 * is an editorial fit rather than the paper's. The slider extends an
 * extrapolation horizon out to 1M hours: past 20k the loss law goes dashed
 * and a band in each panel brackets the two honest scenarios, the law
 * holding versus a plateau at the last measured value. The band is a
 * scenario bracket, not a confidence interval, and the legend says so.
 *
 * The solved bar sits at 0.90 completion: the module's criterion for
 * generalization being solved. Every measured point sits below it, and the
 * completion fit crosses it only deep in the extrapolated region (~111k
 * hours). Past ~250k hours the fit exceeds 100%, which is impossible; the
 * chart stops the line at the crossing and flags it instead of drawing
 * through it.
 *
 * Interactive contract: deterministic initial render at the 100k-hour
 * default (band and dashed region visible on load), native range input
 * with aria-label, visible readouts, reset control, fixed SVG viewport (no
 * layout shift), no JS-driven motion (scrub-only, so reduced-motion safe by
 * construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 240;
/**
 * Sized for the narrowest stage: inside the prediction step at a 375px
 * viewport the stage is about 300px wide while stage text keeps its CSS
 * size, so the tick labels and in-plot labels take more room than the
 * 340-unit geometry suggests.
 */
const LEFT = 52;
const RIGHT = WIDTH - 18;
/**
 * The completion panel is the taller one: it carries the measured scores,
 * the solved bar and that bar's label, and the label needs clear space
 * between the bar and the fit below it.
 */
const LOSS_PANEL = { left: LEFT, right: RIGHT, top: 28, bottom: 86 } as const;
const SCORE_PANEL = { left: LEFT, right: RIGHT, top: 112, bottom: HEIGHT - 46 } as const;
/**
 * The boundary note sits right of the boundary between the 0.03 and 0.02
 * gridlines of the loss panel: past 20k hours the loss stays at or below
 * the 0.0150 plateau, so nothing is drawn there, while the row between
 * the panels is too narrow at 375px for both the note and the lower
 * panel's axis name.
 */
const BOUNDARY_NOTE_Y = LOSS_PANEL.top + 14;

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

function yLoss(loss: number): number {
  return f(LOSS_PANEL.bottom - (loss / LOSS_MAX) * (LOSS_PANEL.bottom - LOSS_PANEL.top));
}

function yScore(score: number): number {
  return f(SCORE_PANEL.bottom - score * (SCORE_PANEL.bottom - SCORE_PANEL.top));
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

const X_TICKS = [1000, 10_000, MEASURED_MAX_HOURS, 100_000, MAX_HORIZON_HOURS];
const LOSS_TICKS = [0, 0.01, 0.02, 0.03];
/**
 * The solved bar's level carries the tick label; the 100% ceiling keeps
 * its gridline but no label, which would collide with the 90% label.
 */
const SCORE_TICKS = [0, 0.5, SOLVED_BAR_SCORE, 1];

const formatHourTick = (hours: number) =>
  hours >= 1_000_000 ? `${hours / 1_000_000}M` : `${hours / 1000}k`;
const formatLossTick = (loss: number) => (loss === 0 ? '0' : loss.toFixed(2));
const formatScoreTick = (score: number) => (score === 1 ? '' : `${Math.round(score * 100)}%`);

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

  const lawAtHorizon = validationLoss(horizon);
  const plateauAtHorizon = plateauLoss(horizon);
  const fitAtHorizon = completionFit(horizon);
  const plateauScoreAtHorizon = plateauCompletion(horizon);

  /** Hours at which the completion fit hits 100%: beyond it is impossible. */
  const impossibleHours =
    1000 *
    Math.exp((1 - COMPLETION_FIT.intercept) / COMPLETION_FIT.slope);
  const pastImpossible = fitAtHorizon > 1;

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

  function reset() {
    setSliderValue(hoursToSlider(defaultHorizonHours));
  }

  const barRelation = pastImpossible
    ? 'past 100%, which is impossible'
    : fitAtHorizon >= SOLVED_BAR_SCORE
      ? 'past the solved bar'
      : 'below the solved bar';

  const state = roleColour('state');
  const value = roleColour('value');
  const constraint = roleColour('constraint');
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

  return (
    <InstrumentFigure
      figureId="egoscale-scaling"
      className={className}
      heading="EgoScale scaling law"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={horizonId}
              value={<span data-testid="horizon-readout">{formatHours(horizon)}</span>}
            >
              Extrapolation horizon
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
              aria-label={`Extrapolation horizon in hours of egocentric human video, log scale, currently ${formatHours(horizon)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="loss-law" swatch={<LegendSwatch role="state" mark="line" />}>
                  loss law (EgoScale, R² = {R_SQUARED})
                </LegendItem>
                <LegendItem series="completion-fit" swatch={<LegendSwatch role="value" mark="dash" />}>
                  editorial completion fit ({PUBLIC_IDENTITY}, R² ={' '}
                  {COMPLETION_FIT.rSquared.toFixed(2)})
                </LegendItem>
                <LegendItem series="measured" swatch={<LegendSwatch role="measurement" mark="dot" />}>
                  measured (1k-20k h)
                </LegendItem>
                <LegendItem
                  swatch={
                    <span className="flex shrink-0 gap-0.5">
                      <LegendSwatch role="state" mark="band" />
                      <LegendSwatch role="value" mark="band" />
                    </span>
                  }
                >
                  scenario band, not a confidence interval
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout data-testid="projection-summary">
                At {formatHours(horizon)}
                {extrapolating ? '' : ', the end of the measured range'}: loss{' '}
                <span data-testid="loss-readout" style={{ color: state }}>
                  {formatLoss(lawAtHorizon)} holds / {formatLoss(plateauAtHorizon)} plateau
                </span>
                ; completion fit{' '}
                <span data-testid="completion-readout" style={{ color: value }}>
                  {formatScore(fitAtHorizon)} holds / {formatScore(plateauScoreAtHorizon)}{' '}
                  plateau, {barRelation}
                </span>
                {pastImpossible ? '; the curve must bend before then' : ''}.
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="table"
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`EgoScale scaling law: validation loss and task completion against pretraining hours, horizon ${formatHours(horizon)}`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={LOSS_PANEL}
              x={xFor}
              y={yLoss}
              yTicks={LOSS_TICKS}
              formatY={formatLossTick}
              yLabel="validation loss (MSE)"
            />
            <ChartAxes
              plot={SCORE_PANEL}
              x={xFor}
              y={yScore}
              xTicks={X_TICKS}
              formatX={formatHourTick}
              yTicks={SCORE_TICKS}
              formatY={formatScoreTick}
              xLabel="egocentric human video (hours, log)"
              yLabel="avg task completion"
            />

            {/* The measured range ends at 20k hours in both panels. */}
            <line
              x1={boundaryX}
              x2={boundaryX}
              y1={LOSS_PANEL.top}
              y2={SCORE_PANEL.bottom}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray={CHART_STROKE.dash}
              opacity={CHART_STRUCTURE.axesOpacity}
            />
            <text
              data-scene-note=""
              x={f(boundaryX + 4)}
              y={BOUNDARY_NOTE_Y}
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              measured range ends
            </text>

            {/* The labelled group gives the bar a real bounding box. */}
            <g data-testid="solved-bar">
              <line
                x1={SCORE_PANEL.left}
                x2={SCORE_PANEL.right}
                y1={solvedY}
                y2={solvedY}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={SCORE_PANEL.left + 4} y={f(solvedY + 18)} role="reference">
                solved bar
              </DirectLabel>
            </g>

            <g data-series="loss-law">
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
                strokeWidth={CHART_STROKE.trace}
                strokeLinejoin="round"
              />
              {extrapolatedLoss ? (
                <path
                  data-testid="extrapolated-loss-law"
                  d={pathOf(extrapolatedLoss)}
                  fill="none"
                  stroke={state}
                  strokeWidth={CHART_STROKE.trace}
                  strokeDasharray={CHART_STROKE.dash}
                />
              ) : null}
            </g>

            {/* The editorial fit is dashed in and past the measured range. */}
            <g data-series="completion-fit">
              {cappedFit ? (
                <g data-testid="completion-band">
                  <UncertaintyBand upper={cappedFit} lower={scorePlateau} role="value" />
                </g>
              ) : null}
              <path
                data-testid="measured-completion-fit"
                d={pathOf(measuredFit)}
                fill="none"
                stroke={value}
                strokeWidth={CHART_STROKE.trace}
                strokeDasharray={CHART_STROKE.dash}
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
            </g>

            <g data-series="measured">
              {COMPLETION_POINTS.map((p) => (
                <g key={`loss-${p.hours}`} data-testid={`loss-point-${p.hours}`}>
                  <PointMarker x={xFor(p.hours)} y={yLoss(validationLoss(p.hours))} />
                </g>
              ))}
              {COMPLETION_POINTS.map((p) => (
                <g key={`completion-${p.hours}`} data-testid={`completion-point-${p.hours}`}>
                  <PointMarker x={xFor(p.hours)} y={yScore(p.score)} />
                </g>
              ))}
            </g>

            {pastImpossible ? (
              <text
                data-testid="impossible-note"
                data-scene-note=""
                x={RIGHT - 2}
                y={f(yScore(plateauScoreAtHorizon) + 26)}
                textAnchor="end"
                fontSize={CHART_TYPE.axisPx}
                fill={constraint}
              >
                fit &gt; 100%: impossible
              </text>
            ) : null}

            {/* The reader's horizon, drawn last; past 100% the fit has no point to mark. */}
            <g data-selection="current horizon">
              <circle
                data-testid="horizon-marker"
                cx={horizonX}
                cy={yLoss(lawAtHorizon)}
                r={CHART_STROKE.markerRadius + 2}
                fill="none"
                stroke={highlight}
                strokeWidth={CHART_STROKE.trace}
              />
              {pastImpossible ? null : (
                <circle
                  cx={horizonX}
                  cy={yScore(fitAtHorizon)}
                  r={CHART_STROKE.markerRadius + 2}
                  fill="none"
                  stroke={highlight}
                  strokeWidth={CHART_STROKE.trace}
                />
              )}
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Measured to 20k hours; beyond that both series are extrapolation, and the completion fit passes 100% near 250k hours."
      source={
        <span data-testid="scaling-caveat">
          EgoScale (2026) fits the law to held-out human-video validation loss, a proxy that
          correlates with downstream robot performance without establishing real-world success
          rate across unseen environments.
        </span>
      }
    />
  );
}
