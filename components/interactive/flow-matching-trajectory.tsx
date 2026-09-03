'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  FLOW_MODES,
  MAX_STEPS,
  MIN_STEPS,
  PI06_STEPS,
  PI0_STEPS,
  endpointDispersion,
  generateFlowField,
  integrateFlow,
  vectorFieldAt,
} from '@/lib/flow-matching';
import { cx } from '@/lib/utils';

/**
 * FlowMatchingTrajectory: the pi0 action expert's inference pass in a 2D
 * action space. Samples start as Gaussian noise; the slider sets how many
 * forward-Euler integration steps transport them toward two action modes.
 * Because flow matching learns near-straight (rectified) transport paths, a
 * handful of steps is enough: at 1-2 steps the cloud visibly misses the
 * modes, at 5-10 it lands on them, and 50 buys nothing you can afford at
 * 50 Hz. The marginal vector field behind the paths shows what the model
 * learns. The real configurations are preset buttons: pi0 ran 10 steps,
 * pi0.6 and pi0.7 run 5.
 *
 * Interactive contract: deterministic render (fixed seed), visible monospace
 * readouts, slider plus step presets plus reset, ARIA labels, fixed-height
 * chart (no layout shift), no auto-playing motion (reduced-motion safe by
 * construction).
 */
type FlowMatchingTrajectoryProps = {
  /** Initial integration steps. Default 10 (the pi0 configuration). */
  defaultSteps?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 340;
const PAD = { top: 18, right: 16, bottom: 30, left: 40 };

/** Action-space view window. */
const X_RANGE = { min: -3, max: 3 };
const Y_RANGE = { min: -2, max: 2 };

const FIELD_COLS = 13;
const FIELD_ROWS = 9;
/** Tau at which the marginal vector field is displayed (mid-transport). */
const FIELD_TAU = 0.5;

const PRESETS: ReadonlyArray<{ steps: number; label: string; note: string }> = [
  { steps: 1, label: '1 step', note: 'too few' },
  { steps: PI06_STEPS, label: `${PI06_STEPS} steps`, note: 'π0.6 / π0.7' },
  { steps: PI0_STEPS, label: `${PI0_STEPS} steps`, note: 'π0' },
  { steps: MAX_STEPS, label: `${MAX_STEPS} steps`, note: 'unaffordable' },
];

export function FlowMatchingTrajectory({
  defaultSteps = PI0_STEPS,
  className,
}: FlowMatchingTrajectoryProps) {
  const descriptionId = `${useId()}-description`;
  const [steps, setSteps] = useState(defaultSteps);
  const field = useMemo(() => generateFlowField(), []);
  const arrows = useMemo(
    () => vectorFieldAt(field, FIELD_TAU, FIELD_COLS, FIELD_ROWS),
    [field],
  );
  const paths = useMemo(
    () => field.samples.map((s) => integrateFlow(s, steps)),
    [field, steps],
  );
  const dispersion = endpointDispersion(field, steps);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  // Round to 2 decimals: full-precision floats serialize differently on
  // server and client and trigger React hydration mismatches.
  const f = (v: number) => Number(v.toFixed(2));
  const x = (u: number) =>
    f(PAD.left + ((u - X_RANGE.min) / (X_RANGE.max - X_RANGE.min)) * plotWidth);
  const y = (v: number) =>
    f(PAD.top + (1 - (v - Y_RANGE.min) / (Y_RANGE.max - Y_RANGE.min)) * plotHeight);

  const maxMagnitude = Math.max(...arrows.map((a) => Math.hypot(a.vx, a.vy)), 1e-6);

  return (
    <div
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="fm-steps"
            className="flex items-baseline justify-between gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Integration steps
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              k = {steps} / {MAX_STEPS}
            </span>
          </label>
          <input
            id="fm-steps"
            type="range"
            data-brand-control-id="control:input"
            min={MIN_STEPS}
            max={MAX_STEPS}
            step={1}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            aria-label={`Integration steps, currently ${steps} of ${MAX_STEPS}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Step presets from the shipped models"
            className="flex flex-wrap gap-1"
          >
            {PRESETS.map((preset) => (
              <button
                data-brand-control-id="control:selection"
                key={preset.steps}
                type="button"
                aria-pressed={steps === preset.steps}
                onClick={() => setSteps(preset.steps)}
                className={cx(
                  'rounded-sm border px-2 py-1 font-mono text-xs transition-colors active:translate-y-[1px]',
                  steps === preset.steps
                    ? 'border-accent text-text'
                    : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                )}
              >
                {preset.label}
                <span className="ml-1.5 text-[10px] text-text-dim">
                  {preset.note}
                </span>
              </button>
            ))}
          </div>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setSteps(defaultSteps)}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`2D action-space view with the learned vector field at mid-transport. ${field.samples.length} samples start as Gaussian noise and are transported toward two action modes along near-straight paths. With ${steps} integration steps the mean endpoint error is ${dispersion.toFixed(2)}.`}
        aria-describedby={descriptionId}
        className="mt-4 block w-full"
      >
        {/* Axes */}
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <line
          x1={x(0)}
          x2={x(0)}
          y1={PAD.top}
          y2={PAD.top + plotHeight}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {[-3, -2, -1, 0, 1, 2, 3].map((u) => (
          <text
            key={u}
            x={x(u)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {u}
          </text>
        ))}
        <text
          x={PAD.left + plotWidth}
          y={PAD.top - 6}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          action space (2 dims of the H x 14 chunk shown)
        </text>

        {/* Marginal vector field at mid-transport */}
        {arrows.map((a, i) => {
          const magnitude = Math.hypot(a.vx, a.vy);
          const length = 3 + (magnitude / maxMagnitude) * 11;
          const ux = a.vx / (magnitude || 1);
          const uy = a.vy / (magnitude || 1);
          return (
            <g key={i} opacity={f(0.25 + 0.45 * (magnitude / maxMagnitude))}>
              <line
                x1={x(a.x)}
                y1={y(a.y)}
                x2={x(a.x + ux * (length / 90))}
                y2={y(a.y + uy * (length / 90))}
                stroke="var(--color-text-dim)"
                strokeWidth={1}
              />
              <circle
                cx={x(a.x + ux * (length / 90))}
                cy={y(a.y + uy * (length / 90))}
                r={1.4}
                fill="var(--color-text-dim)"
              />
            </g>
          );
        })}

        {/* Sample transport paths and endpoints */}
        {paths.map((points, i) => {
          const sample = field.samples[i];
          const end = points[points.length - 1];
          return (
            <g key={i}>
              <polyline
                points={points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
                fill="none"
                stroke={
                  sample.mode === 0
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)'
                }
                strokeWidth={1}
                opacity={0.3}
              />
              <circle
                cx={x(sample.noise.x)}
                cy={y(sample.noise.y)}
                r={1.6}
                fill="none"
                stroke="var(--color-text-dim)"
                strokeWidth={0.75}
                opacity={0.6}
              />
              <circle
                cx={x(end.x)}
                cy={y(end.y)}
                r={3}
                fill={
                  sample.mode === 0
                    ? 'var(--color-accent)'
                    : 'var(--color-text)'
                }
                opacity={0.9}
              />
            </g>
          );
        })}

        {/* Action mode targets (drawn over the paths so they stay visible) */}
        {FLOW_MODES.map((m, i) => (
          <g key={i}>
            <path
              d={`M${x(m.x) - 7},${y(m.y)} L${x(m.x) + 7},${y(m.y)} M${x(m.x)},${y(m.y) - 7} L${x(m.x)},${y(m.y) + 7}`}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
            <text
              x={x(m.x) + 10}
              y={y(m.y) - 10}
              fill="var(--color-text)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              mode {i === 0 ? 'A' : 'B'}
            </text>
          </g>
        ))}
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span data-testid="fm-step-readout" className="text-accent">
          k = {steps} Euler {steps === 1 ? 'step' : 'steps'}
        </span>{' '}
        <span className="text-text-dim">mean endpoint error</span>{' '}
        <span data-testid="fm-dispersion-readout" className="text-accent">
          {dispersion.toFixed(2)}
        </span>
      </p>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current flow-matching transport"
        description={`With ${steps} Euler steps the ${field.samples.length} samples travel near-straight from Gaussian noise toward the two action modes and finish at mean endpoint error ${dispersion.toFixed(2)}; one step would cut the corner, 50 steps is more compute than a 50 Hz loop can spend.`}
        states={[
          { label: 'Euler steps', value: String(steps) },
          { label: 'samples', value: String(field.samples.length) },
          { label: 'endpoint error', value: dispersion.toFixed(2) },
          {
            label: 'regime',
            value:
              steps <= 2
                ? 'too few, cutting the corner'
                : steps >= 50
                  ? 'accurate but unaffordable'
                  : 'on the modes',
          },
        ]}
      />
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Illustrative model: {field.samples.length} samples with a fixed seed,
        transported from Gaussian noise to two action modes along the
        near-straight paths of rectified flow matching. The learned field is
        slightly imperfect (the paths carry a small bend), so the step count
        trades accuracy against latency: one Euler step cuts the corner and
        lands short, 5-10 steps land on the modes, and 50 steps is compute a
        50 Hz control loop cannot spend. pi0 shipped {PI0_STEPS} steps; pi0.6
        and pi0.7 run {PI06_STEPS}. The real expert integrates a whole
        50-step action chunk jointly; this view shows 2 of its dimensions.
      </p>
    </div>
  );
}
