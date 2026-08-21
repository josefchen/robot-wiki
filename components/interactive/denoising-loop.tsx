'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  DENOISING_STEPS,
  MODE_CENTERS,
  convergenceAlpha,
  generateDenoisingTrajectory,
  meanDistanceToMode,
  samplesAtStep,
} from '@/lib/denoising';
import { cx } from '@/lib/utils';

/**
 * DenoisingLoop: a step-through of diffusion sampling in action space.
 *
 * Sixty action samples start as Gaussian noise and converge onto two
 * demonstration modes as the user steps through the 10-step DDIM schedule
 * the Diffusion Policy paper uses at inference. Two modes, not one, because
 * preserving multimodality is the property that motivated the method. A
 * dispersion readout (mean distance to the assigned mode) makes the
 * convergence numeric.
 *
 * Interactive contract: deterministic render (fixed seed), visible monospace
 * readouts, slider plus step buttons plus reset, ARIA labels, fixed-height
 * chart (no layout shift), no auto-playing motion (reduced-motion safe by
 * construction).
 */
type DenoisingLoopProps = {
  /** Initial step. Default 0 (pure noise). */
  defaultStep?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 320;
const PAD = { top: 16, right: 16, bottom: 30, left: 40 };

/** Action-space view window. */
const X_RANGE = { min: -3, max: 3 };
const Y_RANGE = { min: -2, max: 2 };

// --color-text-dim and --color-accent. Interpolating between two colours
// needs their channels, which a var() reference cannot supply, so the two
// endpoints are restated here and must track the tokens in globals.css.
const GRAY = { r: 0x55, g: 0x59, b: 0x5d };
const ACCENT = { r: 0x14, g: 0x5c, b: 0x4f };

/** Mode-0 dots resolve from gray to the accent as the schedule converges. */
function sampleFill(mode: number, alpha: number): string {
  if (mode !== 0) return 'var(--color-text-dim)';
  const r = Math.round(GRAY.r + (ACCENT.r - GRAY.r) * alpha);
  const g = Math.round(GRAY.g + (ACCENT.g - GRAY.g) * alpha);
  const b = Math.round(GRAY.b + (ACCENT.b - GRAY.b) * alpha);
  return `rgb(${r}, ${g}, ${b})`;
}

function statusLabel(step: number): string {
  if (step <= 0) return 'pure Gaussian noise';
  if (step >= DENOISING_STEPS) return 'converged on the modes';
  return 'denoising';
}

export function DenoisingLoop({ defaultStep = 0, className }: DenoisingLoopProps) {
  const descriptionId = `${useId()}-description`;
  const [step, setStep] = useState(defaultStep);
  const trajectory = useMemo(() => generateDenoisingTrajectory(), []);
  const samples = useMemo(() => samplesAtStep(trajectory, step), [trajectory, step]);
  const dispersion = meanDistanceToMode(samples);
  const alpha = convergenceAlpha(step, DENOISING_STEPS);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  // Round to 2 decimals: full-precision floats serialize differently on
  // server and client and trigger React hydration mismatches.
  const f = (v: number) => Number(v.toFixed(2));
  const x = (u: number) =>
    f(PAD.left + ((u - X_RANGE.min) / (X_RANGE.max - X_RANGE.min)) * plotWidth);
  const y = (v: number) =>
    f(PAD.top + (1 - (v - Y_RANGE.min) / (Y_RANGE.max - Y_RANGE.min)) * plotHeight);

  function move(delta: number) {
    setStep((s) => Math.min(DENOISING_STEPS, Math.max(0, s + delta)));
  }

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
            htmlFor="dl-step"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Denoising step
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              k = {step} / {DENOISING_STEPS}
            </span>
          </label>
          <input
            id="dl-step"
            type="range"
            min={0}
            max={DENOISING_STEPS}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label={`Denoising step, currently ${step} of ${DENOISING_STEPS}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => move(-1)}
            disabled={step <= 0}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Step back
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => move(1)}
            disabled={step >= DENOISING_STEPS}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Step forward
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => setStep(defaultStep)}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Scatter plot of 60 action samples in a 2D action space at denoising step ${step} of ${DENOISING_STEPS}. The cloud is ${statusLabel(step)}. Two target modes are marked with crosses.`}
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
          action space (2 dims of T_p x 14 shown)
        </text>
        {/* Samples */}
        {samples.map((s, i) => (
          <circle
            key={i}
            cx={x(s.x)}
            cy={y(s.y)}
            r={3}
            fill={sampleFill(s.mode, alpha)}
            opacity={0.55 + 0.45 * alpha}
          />
        ))}
        {/* Mode targets (drawn over the samples so they stay visible) */}
        {MODE_CENTERS.map((m, i) => (
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
        <span data-testid="denoise-step-readout" className="text-accent">
          step {step} of {DENOISING_STEPS} ({statusLabel(step)})
        </span>{' '}
        <span className="text-text-dim">mean distance to mode</span>{' '}
        <span data-testid="denoise-dispersion-readout" className="text-accent">
          {dispersion.toFixed(2)}
        </span>
      </p>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current denoising cloud"
        description={`At denoising step ${step} of ${DENOISING_STEPS} the 60-sample cloud is ${statusLabel(step)}, mean distance to mode ${dispersion.toFixed(2)}; DDIM inference is pulling mass toward the two target crosses.`}
        states={[
          { label: 'step', value: `${step} / ${DENOISING_STEPS}` },
          { label: 'cloud', value: statusLabel(step) },
          { label: 'mean distance', value: dispersion.toFixed(2) },
          { label: 'samples', value: '60' },
        ]}
      />
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Illustrative model: 60 samples with a fixed seed, transported toward
        two demonstration modes over {DENOISING_STEPS} steps, the DDIM
        inference schedule in the published configuration. The real sampler
        refines a whole action sequence jointly; this view shows 2 of its
        dimensions. An MSE policy would land between the modes; the diffusion
        policy commits each sample to one.
      </p>
    </div>
  );
}
