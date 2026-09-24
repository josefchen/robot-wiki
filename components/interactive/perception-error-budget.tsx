'use client';

import { useId, useState } from 'react';
import {
  CLEARANCE_MM,
  DEFAULT_PARAMS,
  NOMINAL_RANGE_M,
  PUBLISHED_DEPTH_SPEC_PCT,
  SLIDER_SPECS,
  TARGET_CLASSES,
  composeBudget,
  depthFloorPct,
  getTargetClass,
  type BudgetParams,
  type TargetId,
} from '@/lib/perception-error';
import { EDGE_DASH } from '@/lib/semantic-mark-cues';
import { ChartDescription } from '@/components/ui';
import { CiteRef } from '@/components/article/citation-records';
import { cx } from '@/lib/utils';

/**
 * Authored teaching model: controls select three input magnitudes, composed
 * by root-sum-of-squares, not measured positioning errors or variances.
 * A distance sweep changes only the chosen ray-to-plane term. Model bands
 * and target multipliers are teaching settings, not collision predictions.
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

  const verdictText = { within: 'within model band', marginal: 'marginal', jam: 'above model band' }[budget.verdict];
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
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-sans text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  return (
    <div
      data-testid="perception-budget"
      data-brand-surface-id="surface:flat"
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
                data-brand-control-id="control:selection"
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
            data-brand-control-id="control:input"
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
            data-brand-control-id="control:input"
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
            data-brand-control-id="control:input"
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
            data-brand-control-id="control:input"
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
        aria-label={`Authored input magnitudes and root-sum-of-squares total against the model band. Total ${budget.totalMm.toFixed(1)} millimetres.`}
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
          fillOpacity={0.08}
          stroke="var(--color-warn)"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
        {/* Named only when the axis is wide enough to hold both labels: the
            scale grows with the composed total, and past a few clearances the
            band is narrower than the word. */}
        {x(2 * CLEARANCE_MM) - x(CLEARANCE_MM) > 150 && (
          <text
            data-testid="perception-marginal-label"
            x={f(x(2 * CLEARANCE_MM) - 4)}
            y={PAD_T + 9}
            textAnchor="end"
            fill="var(--color-warn)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            marginal
          </text>
        )}
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
          model band {CLEARANCE_MM} mm
        </text>

        {rows.map((row, i) => {
          const y = PAD_T + 14 + i * ROW_H;
          const isTotal = row.key === 'total';
          // Named apart from `fill` so the tone is attributable to the bar it
          // paints rather than to every element that sets a fill.
          const barTone = isTotal
            ? budget.verdict === 'within'
              ? 'var(--color-accent)'
              : 'var(--color-err)'
            : 'var(--color-border-strong)';
          const overBudget = isTotal && budget.verdict !== 'within';
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
                fill={barTone}
                fillOpacity={isTotal ? (overBudget ? 0.2 : 1) : 0.75}
                stroke={overBudget ? barTone : 'none'}
                strokeWidth={1.5}
                strokeDasharray={overBudget ? EDGE_DASH.error : undefined}
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
          data-brand-control-id="control:secondary-action"
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
        <span className="text-text-dim">model band</span>{' '}
        <span data-testid="perception-verdict-readout" className={verdictTone}>
          {verdictText}
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        <span data-testid="perception-target-note">
          The {target.label} case uses an authored depth floor of{' '}
          {depthFloorPct(params.target).toFixed(0)}% of the fixed nominal range;
          it is not a measured property of that material.
        </span>{' '}
        {budget.flooredByTarget
          ? 'That floor is above the slider, so the floor is what the budget uses.'
          : 'The slider is at or above that floor, so the slider is what the budget uses.'}
      </p>

      <p
        data-testid="perception-simplification-label"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        Simplification, stated rather than hidden: the depth term here is
        modelled as range-independent, evaluated once at a fixed{' '}
        {NOMINAL_RANGE_M.toFixed(1)} m standoff, so the percentage you set
        converts to the same millimetres at every working distance. This
        authored simplification isolates the chosen ray-to-plane term;
        it does not describe how every real depth sensor changes with range.
        Root-sum-of-squares is an authored rule here: these slider values
        are not established standard deviations, and the instrument does
        not establish independence or a real-system error bound.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current authored budget and model band"
        description={`At an authored angle of ${params.handEyeDeg.toFixed(1)} degrees and axial distance ${params.workingDistanceM.toFixed(2)} m, the model's root-sum-of-squares magnitude is ${budget.totalMm.toFixed(2)} mm against its ${CLEARANCE_MM} mm comparison band. ${dominant.label} contributes ${(dominant.share * 100).toFixed(0)}% of the sum of squared inputs. Model band: ${verdictText}.`}
        states={[
          { label: 'hand-eye', value: `${params.handEyeDeg.toFixed(1)} deg` },
          { label: 'distance', value: `${params.workingDistanceM.toFixed(2)} m` },
          { label: 'depth', value: `${budget.effectiveDepthPct.toFixed(1)}%` },
          { label: 'pose', value: `${params.poseMm.toFixed(1)} mm` },
          { label: 'composed', value: `${budget.totalMm.toFixed(2)} mm` },
          { label: 'model band', value: verdictText },
        ]}
      />

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        These are authored teaching settings. The opaque-case floor borrows
        the ±{PUBLISHED_DEPTH_SPEC_PCT}% Z-accuracy entry for D410/D415 and D43x
        at ranges up to 2 m, 80% ROI and HD resolution. The datasheet&apos;s factory
        KPIs reflect typical conditions; these active models use a texture-less
        white target, default 150 mW laser power and auto exposure. This is not
        an opaque-object measurement or a standard deviation{' '}
        <CiteRef id="realsense-d400-datasheet-2026" />. The model chooses
        multipliers 1, 3 and 8 for its opaque, specular and transparent cases;
        none is a measured material-specific floor. Its 15 mm and 30 mm bands
        are authored comparison thresholds, not predictions of grasp success
        or collision. Try the distance sweep with the other inputs held fixed,
        then repeat with the angle set to zero. Reset restores the authored
        opening inputs.
      </p>
    </div>
  );
}
