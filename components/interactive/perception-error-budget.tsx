'use client';

import { useId, useState } from 'react';
import {
  CLEARANCE_MM,
  DEFAULT_PARAMS,
  INSERTION_CLEARANCE_MM,
  NOMINAL_RANGE_M,
  PUBLISHED_DEPTH_SPEC_PCT,
  SLIDER_SPECS,
  TARGET_CLASSES,
  VERDICT_TEXT,
  composeBudget,
  depthFloorPct,
  getTargetClass,
  type BudgetParams,
  type TargetId,
} from '@/lib/perception-error';
import { ChartDescription } from '@/components/ui';
import { CiteRef } from '@/components/mdx/cite-ref';
import { cx } from '@/lib/utils';

/**
 * PerceptionErrorBudget: the composed positioning error of a perception
 * pipeline, drawn against the clearance the grasp actually has.
 *
 * Four sliders (hand-eye rotation, depth error, object-pose error, working
 * distance) and a target selector that sets the depth term's floor. The
 * chart is a horizontal bar per source plus the composed total, with the
 * clearance band shaded behind them.
 *
 * The teaching move is the working-distance slider: a hand-eye rotation is
 * an angle, so a half-degree residual is nothing at 15 cm and dominates
 * everything else at 1.5 m, while the other two terms sit still. That only
 * reads cleanly because the depth term is modelled range-independent,
 * which is stated on the instrument rather than left for the reader to
 * discover.
 */

const WIDTH = 640;
const HEIGHT = 232;
const PAD_L = 132;
const PAD_R = 58;
const PAD_T = 18;
const PAD_B = 30;
const ROW_H = 34;
const BAR_H = 15;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** A readable axis ceiling that always shows the whole marginal band. */
function axisMax(totalMm: number): number {
  const needed = Math.max(totalMm * 1.15, CLEARANCE_MM * 2.4);
  const step = needed <= 40 ? 5 : needed <= 100 ? 10 : 25;
  return Math.ceil(needed / step) * step;
}

export function PerceptionErrorBudget({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<BudgetParams>(DEFAULT_PARAMS);

  const budget = composeBudget(params);
  const target = getTargetClass(params.target);
  const max = axisMax(budget.totalMm);
  const plotW = WIDTH - PAD_L - PAD_R;
  const x = (mm: number) => PAD_L + Math.min(mm / max, 1) * plotW;

  const setParam = <K extends keyof BudgetParams>(key: K, value: BudgetParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));
  const reset = () => setParams(DEFAULT_PARAMS);

  const rows = [...budget.contributions, {
    key: 'total' as const,
    label: 'composed total',
    mm: budget.totalMm,
    share: 1,
  }];

  const verdictText = VERDICT_TEXT[budget.verdict];
  const verdictTone =
    budget.verdict === 'within'
      ? 'text-accent'
      : budget.verdict === 'marginal'
        ? 'text-warn'
        : 'text-err';

  const depthMm = budget.contributions.find((c) => c.key === 'depth')!.mm;
  const dominant = [...budget.contributions].sort((a, b) => b.share - a.share)[0];

  const ticks = [0, max / 2, max];

  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  return (
    <div
      data-testid="perception-budget"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <fieldset className="border-0 p-0">
        <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          target surface
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TARGET_CLASSES.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-2 font-sans text-xs text-text"
            >
              <input
                type="radio"
                name={`${uid}-target`}
                value={option.id}
                checked={params.target === option.id}
                onChange={() => setParam('target', option.id as TargetId)}
                aria-label={option.label}
                data-testid={`perception-target-${option.id}`}
                className="mt-0.5 accent-accent"
              />
              <span>
                {option.label}
                <span className="block text-[11px] leading-snug text-text-dim">
                  depth floor {depthFloorPct(option.id).toFixed(0)}% of range
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${uid}-handeye`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            hand-eye rotation {`(deg)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="perception-handeye-value"
            >
              {params.handEyeDeg.toFixed(1)}
            </span>
          </label>
          <input
            id={`${uid}-handeye`}
            type="range"
            min={SLIDER_SPECS.handEye.min}
            max={SLIDER_SPECS.handEye.max}
            step={SLIDER_SPECS.handEye.step}
            value={params.handEyeDeg}
            onChange={(e) => setParam('handEyeDeg', Number(e.target.value))}
            aria-label={`Hand-eye rotation error in degrees, currently ${params.handEyeDeg.toFixed(1)}`}
            data-testid="perception-handeye-slider"
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-distance`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            working distance {`(m)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="perception-distance-value"
            >
              {params.workingDistanceM.toFixed(2)}
            </span>
          </label>
          <input
            id={`${uid}-distance`}
            type="range"
            min={SLIDER_SPECS.distance.min}
            max={SLIDER_SPECS.distance.max}
            step={SLIDER_SPECS.distance.step}
            value={params.workingDistanceM}
            onChange={(e) => setParam('workingDistanceM', Number(e.target.value))}
            aria-label={`Working distance in metres, currently ${params.workingDistanceM.toFixed(2)}`}
            data-testid="perception-distance-slider"
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-depth`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            depth error {`(% of range)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="perception-depth-value"
            >
              {params.depthPct.toFixed(1)}
            </span>
          </label>
          <input
            id={`${uid}-depth`}
            type="range"
            min={SLIDER_SPECS.depth.min}
            max={SLIDER_SPECS.depth.max}
            step={SLIDER_SPECS.depth.step}
            value={params.depthPct}
            onChange={(e) => setParam('depthPct', Number(e.target.value))}
            aria-label={`Depth error as a percentage of range, currently ${params.depthPct.toFixed(1)}`}
            data-testid="perception-depth-slider"
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-pose`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            object pose {`(mm)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="perception-pose-value"
            >
              {params.poseMm.toFixed(1)}
            </span>
          </label>
          <input
            id={`${uid}-pose`}
            type="range"
            min={SLIDER_SPECS.pose.min}
            max={SLIDER_SPECS.pose.max}
            step={SLIDER_SPECS.pose.step}
            value={params.poseMm}
            onChange={(e) => setParam('poseMm', Number(e.target.value))}
            aria-label={`Object-pose translation error in millimetres, currently ${params.poseMm.toFixed(1)}`}
            data-testid="perception-pose-slider"
            className="mt-2 w-full accent-accent"
          />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Per-source contribution to the composed positioning error against the clearance band. Total ${budget.totalMm.toFixed(1)} millimetres.`}
        aria-describedby={descriptionId}
        data-testid="perception-chart"
        className="mt-4 block w-full"
      >
        {/* The clearance band: within to the left of the first edge,
            marginal out to twice it. */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={f(x(CLEARANCE_MM) - PAD_L)}
          height={f(HEIGHT - PAD_T - PAD_B)}
          fill="var(--color-accent)"
          opacity={0.09}
        />
        <rect
          x={f(x(CLEARANCE_MM))}
          y={PAD_T}
          width={f(x(2 * CLEARANCE_MM) - x(CLEARANCE_MM))}
          height={f(HEIGHT - PAD_T - PAD_B)}
          fill="var(--color-warn)"
          opacity={0.08}
        />
        <line
          x1={f(x(CLEARANCE_MM))}
          y1={PAD_T}
          x2={f(x(CLEARANCE_MM))}
          y2={f(HEIGHT - PAD_B)}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <text
          data-testid="perception-clearance-label"
          x={f(x(CLEARANCE_MM) + 4)}
          y={PAD_T + 9}
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          clearance {CLEARANCE_MM} mm
        </text>

        {rows.map((row, i) => {
          const y = PAD_T + 14 + i * ROW_H;
          const isTotal = row.key === 'total';
          const fill = isTotal
            ? budget.verdict === 'within'
              ? 'var(--color-accent)'
              : 'var(--color-err)'
            : 'var(--color-border-strong)';
          return (
            <g key={row.key}>
              <text
                x={PAD_L - 8}
                y={y + BAR_H - 3}
                textAnchor="end"
                fill={isTotal ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {row.label}
              </text>
              <rect
                data-testid={`perception-bar-${row.key}`}
                x={PAD_L}
                y={y}
                width={f(Math.max(x(row.mm) - PAD_L, 1))}
                height={BAR_H}
                fill={fill}
                opacity={isTotal ? 1 : 0.75}
              />
              <text
                x={f(Math.max(x(row.mm) - PAD_L, 1) + PAD_L + 5)}
                y={y + BAR_H - 3}
                fill={isTotal ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={10.5}
                fontFamily="var(--font-mono)"
              >
                {row.mm.toFixed(1)}
              </text>
            </g>
          );
        })}

        {ticks.map((tick, i) => (
          <text
            key={tick}
            x={f(x(tick))}
            y={HEIGHT - 10}
            textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {tick.toFixed(0)}
          </text>
        ))}
        <text
          x={WIDTH - PAD_R + 4}
          y={HEIGHT - 10}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          mm
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          aria-label="Reset the error budget to its opening values"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">composed</span>{' '}
        <span data-testid="perception-total-readout" className="text-text">
          {budget.totalMm.toFixed(2)} mm
        </span>{' '}
        <span className="text-text-dim">depth term</span>{' '}
        <span data-testid="perception-depth-readout" className="text-text">
          {depthMm.toFixed(2)} mm at {budget.effectiveDepthPct.toFixed(1)}%
        </span>{' '}
        <span className="text-text-dim">verdict</span>{' '}
        <span data-testid="perception-verdict-readout" className={verdictTone}>
          {verdictText}
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        <span data-testid="perception-target-note">
          The {target.label} is {target.failureMode}, so its depth floor is{' '}
          {depthFloorPct(params.target).toFixed(0)}% of range.
        </span>{' '}
        {budget.flooredByTarget
          ? 'That floor is above the slider, so the floor is what the budget uses.'
          : 'The slider sits above that floor, so the slider is what the budget uses.'}
      </p>

      <p
        data-testid="perception-simplification-label"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        Simplification, stated rather than hidden: the depth term here is
        modelled as range-independent, evaluated once at a fixed{' '}
        {NOMINAL_RANGE_M.toFixed(1)} m standoff, so the percentage you set
        converts to the same millimetres at every working distance. A real
        stereo camera is worse than that, because its ranging error grows
        roughly with the square of distance. The simplification is here
        because the point of this instrument is that independent error
        sources compose into one budget, and the hand-eye rotation is the
        term whose distance dependence carries that lesson. A second
        distance-dependent term would swamp it.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current error budget and verdict"
        description={`At ${params.handEyeDeg.toFixed(1)} degrees of hand-eye rotation and ${params.workingDistanceM.toFixed(2)} m of working distance, the composed positioning error is ${budget.totalMm.toFixed(2)} mm against a ${CLEARANCE_MM} mm clearance band, and ${dominant.label} dominates at ${(dominant.share * 100).toFixed(0)}% of the variance: ${verdictText}.`}
        states={[
          { label: 'hand-eye', value: `${params.handEyeDeg.toFixed(1)} deg` },
          { label: 'distance', value: `${params.workingDistanceM.toFixed(2)} m` },
          { label: 'depth', value: `${budget.effectiveDepthPct.toFixed(1)}%` },
          { label: 'pose', value: `${params.poseMm.toFixed(1)} mm` },
          { label: 'composed', value: `${budget.totalMm.toFixed(2)} mm` },
          { label: 'verdict', value: verdictText },
        ]}
      />

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        The opaque floor is the published Z-accuracy of the reference stereo
        camera, {PUBLISHED_DEPTH_SPEC_PCT}% of range within 80% of the field
        of view <CiteRef id="realsense-d400-datasheet-2026" />. The specular
        and transparent floors are illustrative multiples of it, not
        measurements: the datasheet publishes no per-material figure, and
        the research on transparent-object depth exists precisely because
        the sensors return garbage there <CiteRef id="cleargrasp-2020" />.
        Things worth trying: park the hand-eye slider at half a degree and
        walk the working distance from {SLIDER_SPECS.distance.min} m to{' '}
        {SLIDER_SPECS.distance.max} m, and watch a term that was invisible
        become the one that decides the outcome. Then set hand-eye to zero
        and do it again: nothing moves, which is what it means for the other
        terms to be range-independent. Either way the whole budget is an
        order of magnitude above the {INSERTION_CLEARANCE_MM} mm insertion
        clearance a precision assembly needs, which is why those tasks are
        closed on force and contact rather than on vision alone.
      </p>
    </div>
  );
}
