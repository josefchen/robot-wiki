'use client';

import { useMemo, useState } from 'react';
import {
  CONTROL_HZ,
  DIFFUSION_POLICY_HORIZON,
  clampHorizon,
  commitDurationS,
  planChunks,
  replanRateHz,
} from '@/lib/receding-horizon';
import { cx } from '@/lib/utils';

/**
 * RecedingHorizon: the T_p / T_a dial of receding-horizon control.
 *
 * The policy predicts T_p actions, executes the first T_a, then replans.
 * Each lane of the chart is one issued chunk: the committed portion solid,
 * the predicted tail light (it will be revised by the next inference, never
 * executed). Moving T_a changes the replan rate and the wall-clock
 * commitment shown in the readouts. Defaults to the published Diffusion
 * Policy configuration (T_p=16, T_a=8).
 *
 * Interactive contract: deterministic render, visible monospace readouts,
 * named presets, reset control, native keyboard-accessible sliders with
 * aria-labels, fixed-height chart (no layout shift), no auto-playing motion.
 */
type RecedingHorizonProps = {
  /** Window of control steps shown in the rolling plan. Default 32. */
  windowSteps?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 230;
const PAD = { top: 26, right: 16, bottom: 26, left: 52 };

const MIN_TP = 4;
const MAX_TP = 32;

function formatHz(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} Hz`;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

export function RecedingHorizon({
  windowSteps = 32,
  className,
}: RecedingHorizonProps) {
  const [horizon, setHorizon] = useState<{ tp: number; ta: number }>({
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  });
  const clamped = clampHorizon(horizon.tp, horizon.ta);
  const chunks = useMemo(
    () => planChunks(clamped.tp, clamped.ta, windowSteps),
    [clamped.tp, clamped.ta, windowSteps],
  );

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  // Round to 2 decimals: full-precision floats serialize differently on
  // server and client and trigger React hydration mismatches.
  const f = (v: number) => Number(v.toFixed(2));
  const x = (step: number) => f(PAD.left + (step / windowSteps) * plotWidth);
  const laneHeight = f(Math.min(16, plotHeight / chunks.length - 4));

  function set(tp: number, ta: number) {
    setHorizon(clampHorizon(tp, ta));
  }

  const defaults = {
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  };

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="rh-tp"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Predicted horizon
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              T_p = {clamped.tp}
            </span>
          </label>
          <input
            id="rh-tp"
            type="range"
            min={MIN_TP}
            max={MAX_TP}
            step={1}
            value={clamped.tp}
            onChange={(e) => set(Number(e.target.value), clamped.ta)}
            aria-label={`Predicted horizon T_p, currently ${clamped.tp}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor="rh-ta"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Executed horizon
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              T_a = {clamped.ta}
            </span>
          </label>
          <input
            id="rh-ta"
            type="range"
            min={1}
            max={MAX_TP}
            step={1}
            value={clamped.ta}
            onChange={(e) => set(clamped.tp, Number(e.target.value))}
            aria-label={`Executed horizon T_a, currently ${clamped.ta}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => set(defaults.tp, defaults.ta)}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Diffusion Policy (16/8)
        </button>
        <button
          type="button"
          onClick={() => set(MAX_TP, MAX_TP)}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Open-loop (32/32)
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => set(defaults.tp, defaults.ta)}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Receding horizon rolling plan over ${windowSteps} control steps. ${chunks.length} chunks, each predicting T_p of ${clamped.tp} actions and committing the first T_a of ${clamped.ta}. Committed portions are solid, predicted tails are outlined.`}
        className="mt-4 block w-full"
      >
        {chunks.map((c) => {
          const top = f(PAD.top + c.index * (plotHeight / chunks.length));
          const commitWidth = f(
            Math.max(0, x(Math.min(c.commitEnd, windowSteps)) - x(c.start)),
          );
          const tailEnd = Math.min(c.planEnd, windowSteps);
          const tailWidth = f(Math.max(0, x(tailEnd) - x(c.commitEnd)));
          return (
            <g key={c.index}>
              <text
                x={PAD.left - 8}
                y={top + laneHeight / 2 + 3.5}
                textAnchor="end"
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                plan {c.index}
              </text>
              <rect
                data-testid="rh-committed"
                x={x(c.start)}
                y={top}
                width={commitWidth}
                height={laneHeight}
                fill="var(--color-accent)"
                opacity={0.85}
              />
              {tailWidth > 0 && (
                <rect
                  data-testid="rh-predicted"
                  x={x(c.commitEnd)}
                  y={top}
                  width={tailWidth}
                  height={laneHeight}
                  fill="var(--color-surface-2)"
                  stroke="var(--color-border-strong)"
                  strokeDasharray="4 3"
                />
              )}
            </g>
          );
        })}
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {Array.from({ length: windowSteps / 8 + 1 }, (_, i) => i * 8).map(
          (s) => (
            <text
              key={s}
              x={x(s)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {s}
            </text>
          ),
        )}
        <text
          x={PAD.left + plotWidth}
          y={PAD.top - 8}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          control steps at {CONTROL_HZ} Hz
        </text>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">T_p = {clamped.tp},</span>{' '}
        <span className="text-text-dim">T_a = {clamped.ta}:</span>{' '}
        <span data-testid="rh-replan-readout" className="text-accent">
          {formatHz(replanRateHz(clamped.ta))}
        </span>{' '}
        <span className="text-text-dim">replan rate,</span>{' '}
        <span data-testid="rh-commit-readout" className="text-accent">
          {formatSeconds(commitDurationS(clamped.ta))}
        </span>{' '}
        <span className="text-text-dim">committed per plan</span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Solid segments are executed; outlined tails are revised away by the
        next inference. Small T_a reacts quickly but re-samples (and can
        switch modes) often; large T_a is smooth but slow to notice the world
        changed. At T_a = T_p the policy runs open-loop between inferences.
      </p>
    </div>
  );
}
