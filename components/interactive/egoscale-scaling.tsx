'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  COMPLETION_FIT,
  COMPLETION_POINTS,
  DEFAULT_HORIZON_HOURS,
  LOSS_LAW,
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
import { cx } from '@/lib/utils';

/**
 * EgoScaleScaling: the EgoScale log-linear scaling law with an honest
 * extrapolation control.
 *
 * The chart plots the paper's published law, validation loss
 * L = 0.024 - 0.003 * ln(D) (D in thousands of hours, R^2 = 0.9983), as a
 * solid amber line over its measured range (1k to 20k hours of egocentric
 * human video), with the five reported downstream task-completion scores
 * (0.30 at 1k rising to 0.71 at 20k) on a second axis. The slider extends
 * an extrapolation horizon out to 1M hours: past 20k the lines go dashed
 * and a shaded band brackets the two honest scenarios, the law holding
 * versus a plateau at the last measured value. The band is a scenario
 * bracket, not a confidence interval, and the caveat says so.
 *
 * A dotted "solved bar" sits at 0.90 on the completion axis: the module's
 * criterion for generalization being solved. Every measured point sits
 * below it, and the completion fit crosses it only deep in the
 * extrapolated region (~111k hours). Pushed past ~250k hours the fit
 * exceeds 100%, which is impossible; the chart flags the crossing instead
 * of drawing through it.
 *
 * Interactive contract: deterministic initial render at the 100k-hour
 * default (band and dashed region visible on load), native range input
 * with aria-label, visible monospace readouts, reset control, fixed SVG
 * viewport (no layout shift), no JS-driven motion (scrub-only, so
 * reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 320;
const PLOT = { left: 56, right: 588, top: 22, bottom: 274 } as const;

const HOURS_LOG_MIN = 3; // 10^3 = 1k h
const HOURS_LOG_MAX = 6; // 10^6 = 1M h
/**
 * Loss axis ceiling. 0.030 keeps the measured law's 1k-hour start (0.024)
 * clear of the solved bar, which sits at 0.90 on the completion axis; at
 * 0.026 the two render 6px apart at the left edge and read as one line.
 */
const LOSS_MAX = 0.03;
const SCORE_MAX = 1;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(hours: number): number {
  const t =
    (Math.log10(hours) - HOURS_LOG_MIN) / (HOURS_LOG_MAX - HOURS_LOG_MIN);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yLoss(loss: number): number {
  return f(PLOT.bottom - (loss / LOSS_MAX) * (PLOT.bottom - PLOT.top));
}

function yScore(score: number): number {
  return f(PLOT.bottom - (score / SCORE_MAX) * (PLOT.bottom - PLOT.top));
}

/** Sample a log-spaced path of fn(hours) between two hour values. */
function trace(
  from: number,
  to: number,
  fn: (hours: number) => number,
  yMap: (v: number) => number,
): string {
  const steps = 40;
  const parts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const h = from * (to / from) ** (i / steps);
    // Round the pixel coordinate, never the data value: rounding the loss
    // to 2 decimals quantizes 0.024..0.015 to a flat 0.02.
    parts.push(`${i === 0 ? 'M' : 'L'}${xFor(h)},${f(yMap(fn(h)))}`);
  }
  return parts.join(' ');
}

const X_TICKS: Array<{ hours: number; label: string }> = [
  { hours: 1000, label: '1k' },
  { hours: 10_000, label: '10k' },
  { hours: 100_000, label: '100k' },
  { hours: 1_000_000, label: '1M' },
];
const LOSS_TICKS = [0.005, 0.01, 0.015, 0.02, 0.025];
const SCORE_TICKS = [0.25, 0.5, 0.75, 1];

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
  // useId-derived input id: this component legitimately renders twice on
  // one page (article prose plus a prediction-step figure), and a
  // hardcoded id would duplicate and cross-bind labels between the mounts.
  const horizonId = `${useId()}-horizon`;
  const descriptionId = `${useId()}-description`;
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

  const measuredLossPath = trace(
    MEASURED_MIN_HOURS,
    MEASURED_MAX_HOURS,
    validationLoss,
    yLoss,
  );
  const measuredFitPath = trace(
    MEASURED_MIN_HOURS,
    MEASURED_MAX_HOURS,
    completionFit,
    yScore,
  );
  const extrapolatedLossPath = extrapolating
    ? trace(MEASURED_MAX_HOURS, horizon, validationLoss, yLoss)
    : null;
  const extrapolatedFitPath = extrapolating
    ? trace(
        MEASURED_MAX_HOURS,
        Math.min(horizon, impossibleHours),
        completionFit,
        yScore,
      )
    : null;

  /** Scenario band polygons, only meaningful past the measured range. */
  const lossBandPath = extrapolating
    ? `${trace(MEASURED_MAX_HOURS, horizon, validationLoss, yLoss)} ${`L${xFor(horizon)},${yLoss(plateauAtHorizon)}`} ${`L${xFor(MEASURED_MAX_HOURS)},${yLoss(plateauAtHorizon)}`} Z`
    : null;
  const completionBandPath = extrapolating
    ? `${trace(MEASURED_MAX_HOURS, horizon, (h) => Math.min(completionFit(h), 1), yScore)} ${`L${xFor(horizon)},${yScore(plateauScoreAtHorizon)}`} ${`L${xFor(MEASURED_MAX_HOURS)},${yScore(plateauScoreAtHorizon)}`} Z`
    : null;

  const solvedY = yScore(SOLVED_BAR_SCORE);
  const boundaryX = xFor(MEASURED_MAX_HOURS);

  function reset() {
    setSliderValue(hoursToSlider(defaultHorizonHours));
  }

  const barRelation = pastImpossible
    ? 'past 100%, which is impossible'
    : fitAtHorizon >= SOLVED_BAR_SCORE
      ? 'past the solved bar'
      : 'below the solved bar';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor={horizonId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Extrapolation horizon
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatHours(horizon)}
            </span>
          </label>
          <input
            id={horizonId}
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            aria-label={`Extrapolation horizon in hours of egocentric human video, log scale, currently ${formatHours(horizon)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          horizon:{' '}
          <span data-testid="horizon-readout" className="text-text">
            {formatHours(horizon)}
          </span>
        </span>
        <span className="text-text-dim">
          loss:{' '}
          <span data-testid="loss-readout" className="text-accent">
            {formatLoss(lawAtHorizon)} holds / {formatLoss(plateauAtHorizon)}{' '}
            plateau
          </span>
        </span>
        <span className="text-text-dim">
          completion fit:{' '}
          <span data-testid="completion-readout" className="text-text">
            {formatScore(fitAtHorizon)} holds / {formatScore(plateauScoreAtHorizon)}{' '}
            plateau, {barRelation}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`EgoScale scaling law: validation loss and task completion against pretraining hours, horizon ${formatHours(horizon)}`}
        aria-describedby={descriptionId}
        className="mt-3 block w-full"
      >
        <text
          x={PLOT.left}
          y={12}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          validation loss (MSE)
        </text>
        <text
          x={PLOT.right}
          y={12}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          avg task completion
        </text>

        {/* Gridlines and left axis (loss). */}
        {LOSS_TICKS.map((loss) => (
          <g key={loss}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yLoss(loss)}
              y2={yLoss(loss)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 8}
              y={f(yLoss(loss) + 3)}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {loss.toFixed(3)}
            </text>
          </g>
        ))}
        {/* Right axis (completion, as percent). */}
        {SCORE_TICKS.map((score) => (
          <text
            key={score}
            x={PLOT.right + 8}
            y={f(yScore(score) + 3)}
            textAnchor="start"
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {`${Math.round(score * 100)}%`}
          </text>
        ))}
        {/* X axis ticks (hours, log). */}
        {X_TICKS.map(({ hours, label }) => (
          <g key={hours}>
            <line
              x1={xFor(hours)}
              x2={xFor(hours)}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={xFor(hours)}
              y={f(PLOT.bottom + 16)}
              textAnchor={hours === MAX_HORIZON_HOURS ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          </g>
        ))}
        <text
          x={boundaryX}
          y={f(PLOT.bottom + 16)}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          20k
        </text>
        <text
          x={f((PLOT.left + PLOT.right) / 2)}
          y={HEIGHT - 6}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          egocentric human video pretraining (hours, log)
        </text>

        {/* Extrapolated region shading, boundary, and scenario bands. */}
        {extrapolating && (
          <g>
            <rect
              x={boundaryX}
              y={PLOT.top}
              width={f(xFor(horizon) - boundaryX)}
              height={PLOT.bottom - PLOT.top}
              fill="var(--color-surface-2)"
              fillOpacity={0.55}
            />
            <path
              data-testid="uncertainty-band"
              d={lossBandPath ?? ''}
              fill="var(--color-accent)"
              fillOpacity={0.13}
            />
            <path
              data-testid="completion-band"
              d={completionBandPath ?? ''}
              fill="var(--color-text-dim)"
              fillOpacity={0.13}
            />
          </g>
        )}
        <line
          x1={boundaryX}
          x2={boundaryX}
          y1={PLOT.top}
          y2={PLOT.bottom}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={boundaryX + 6}
          y={f(PLOT.top + 14)}
          textAnchor="start"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          measured range ends
        </text>

        {/* Solved bar: >90% across N unseen homes. A 2px-high stroked rect
            rather than a hairline, so the bar has a real bounding box. */}
        <rect
          data-testid="solved-bar"
          x={PLOT.left}
          y={f(solvedY - 1)}
          width={PLOT.right - PLOT.left}
          height={2}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
        />
        <text
          x={PLOT.left + 90}
          y={f(solvedY - 6)}
          textAnchor="start"
          fill="var(--color-text)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          solved bar (&gt;90%)
        </text>

        {/* Measured series: solid lines, five scales each. */}
        <path
          data-testid="measured-loss-law"
          d={measuredLossPath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <path
          data-testid="measured-completion-fit"
          d={measuredFitPath}
          fill="none"
          stroke="var(--color-text-dim)"
          strokeWidth={1.5}
        />
        {COMPLETION_POINTS.map((p) => (
          <circle
            key={`loss-${p.hours}`}
            data-testid={`loss-point-${p.hours}`}
            cx={xFor(p.hours)}
            cy={yLoss(validationLoss(p.hours))}
            r={3.5}
            fill="var(--color-bg)"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
        ))}
        {COMPLETION_POINTS.map((p) => (
          <circle
            key={`completion-${p.hours}`}
            data-testid={`completion-point-${p.hours}`}
            cx={xFor(p.hours)}
            cy={yScore(p.score)}
            r={3.5}
            fill="var(--color-bg)"
            stroke="var(--color-text)"
            strokeWidth={1.5}
          />
        ))}

        {/* Extrapolated series: dashed, the completion fit stops at 100%. */}
        {extrapolatedLossPath && (
          <path
            data-testid="extrapolated-loss-law"
            d={extrapolatedLossPath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {extrapolatedFitPath && (
          <path
            data-testid="extrapolated-completion-fit"
            d={extrapolatedFitPath}
            fill="none"
            stroke="var(--color-text-dim)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}
        {pastImpossible && (
          <text
            data-testid="impossible-note"
            x={PLOT.right - 4}
            y={f(yScore(1) + 16)}
            textAnchor="end"
            fill="var(--color-err)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            fit exceeds 100%: impossible
          </text>
        )}

        {/* Horizon marker on the loss law, drawn last. */}
        <circle
          data-testid="horizon-marker"
          cx={xFor(horizon)}
          cy={yLoss(lawAtHorizon)}
          r={4.5}
          fill="var(--color-bg)"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: 'var(--color-accent)' }}
          />
          loss law (R² = {R_SQUARED})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: 'var(--color-text-dim)' }}
          />
          completion fit (robot-wiki, R² = {COMPLETION_FIT.rSquared.toFixed(2)})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full border"
            style={{ borderColor: 'var(--color-text)' }}
          />
          measured (1k-20k h)
        </span>
        <span>shaded: scenario band, not a confidence interval</span>
      </div>

      <p
        data-testid="projection-summary"
        className="mt-3 font-mono text-sm text-text"
        aria-live="polite"
      >
        {extrapolating ? (
          <>
            <span className="text-text-dim">At {formatHours(horizon)}:</span>{' '}
            <span className="text-accent">{formatLoss(lawAtHorizon)}</span>{' '}
            <span className="text-text-dim">
              loss if the law holds, {formatLoss(plateauAtHorizon)} if it
              plateaus. The completion fit reads
            </span>{' '}
            <span className="text-text">{formatScore(fitAtHorizon)}</span>
            <span className="text-text-dim">
              , {barRelation}
              {pastImpossible ? '; the curve must bend before then' : ''}.
            </span>
          </>
        ) : (
          <span className="text-text-dim">
            At {formatHours(horizon)}: the end of the measured range.
            Everything past here is extrapolation.
          </span>
        )}
      </p>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Sampled loss and completion by pretraining hours"
        rowHeader="pretraining hours"
        columns={[
          { header: 'loss (MSE)', numeric: true },
          { header: 'task completion', numeric: true },
          { header: 'region', numeric: false },
        ]}
        rows={[
          { label: '1k h', values: [formatLoss(validationLoss(1000)), formatScore(completionFit(1000)), 'measured'] },
          { label: '4k h', values: [formatLoss(validationLoss(4000)), formatScore(completionFit(4000)), 'measured'] },
          { label: '10k h', values: [formatLoss(validationLoss(10_000)), formatScore(completionFit(10_000)), 'measured'] },
          { label: '20k h', values: [formatLoss(validationLoss(20_000)), formatScore(completionFit(20_000)), 'measured range ends'] },
          { label: '100k h', values: [`${formatLoss(validationLoss(100_000))} holds / ${formatLoss(plateauLoss(100_000))} plateau`, `${formatScore(completionFit(100_000))} holds / ${formatScore(plateauCompletion(100_000))} plateau`, 'extrapolated, dashed'] },
          { label: '1M h', values: [`${formatLoss(validationLoss(1_000_000))} holds / ${formatLoss(plateauLoss(1_000_000))} plateau`, `${formatScore(Math.min(completionFit(1_000_000), 1))} holds / ${formatScore(plateauCompletion(1_000_000))} plateau`, 'extrapolated, dashed'] },
        ]}
        description={
          <>
            Validation loss falls from {formatLoss(validationLoss(MEASURED_MIN_HOURS))} at 1k
            hours to {formatLoss(validationLoss(MEASURED_MAX_HOURS))} at 20k hours, the end
            of the measured range, while task completion rises from 0.30 to 0.71; past
            that boundary the dashed extrapolation to the {formatHours(horizon)} horizon
            reads {formatLoss(lawAtHorizon)} if the law holds against{' '}
            {formatLoss(plateauAtHorizon)} at the plateau, the shaded scenario band
            between them is a scenario bracket and not a confidence interval, the
            completion fit stays below the 90 percent solved bar until{' '}
            {Math.round(solvedBarCrossingHours() / 1000)}k hours, and it exceeds 100
            percent past {Math.round(impossibleHours / 1000)}k hours, which the chart
            flags instead of drawing.
          </>
        }
      />
      <p
        data-testid="scaling-caveat"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        The law (L = {LOSS_LAW.intercept} - {LOSS_LAW.slope} ln D, R² ={' '}
        {R_SQUARED}) is fit to held-out human-video validation loss, a proxy
        that correlates with downstream robot performance but is not a
        real-world success rate across unseen environments. The band brackets
        two scenarios, continued scaling versus plateau; it is not a
        confidence interval. EgoScale&apos;s authors report no saturation in
        the measured range and do not extrapolate beyond it.
      </p>
    </div>
  );
}
