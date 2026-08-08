'use client';

import { useMemo, useState } from 'react';
import {
  accumulatedCost,
  bcBound,
  DAGGER_INTERVAL,
  daggerBound,
  expertY,
  type PredictionMode,
  simulateDeviation,
} from '@/lib/compounding-error';
import { cx } from '@/lib/utils';

/**
 * CompoundingError: why behavior cloning drifts off the expert distribution.
 *
 * Panel 1 draws the demonstrated path against the policy rollout; panel 2
 * plots accumulated deviation against the O(epsilon * T^2) and O(epsilon * T)
 * regret bounds from the DAgger analysis. Controls: per-step error epsilon,
 * episode horizon T, per-timestep vs chunked prediction, and a DAgger
 * relabeling toggle. Honors the interactive contract: typed props,
 * deterministic render, monospace numeric readout, reset control, native
 * keyboard-accessible inputs, fixed-height charts (no layout shift), no
 * auto-playing motion.
 */
type CompoundingErrorProps = {
  /** Initial per-step error epsilon. Default 0.05 (5%). */
  defaultEpsilon?: number;
  /** Initial episode horizon in steps. Default 120. */
  defaultSteps?: number;
  /** Longest horizon the charts draw. Default 240. */
  maxSteps?: number;
  /** Chunk length k used in chunked-prediction mode. Default 25. */
  chunkSize?: number;
  className?: string;
};

const MIN_EPSILON_PERCENT = 0.5;
const MAX_EPSILON_PERCENT = 15;
const MIN_STEPS = 20;

const ROLLOUT_W = 640;
const ROLLOUT_H = 220;
const BOUNDS_W = 640;
const BOUNDS_H = 170;
const BOUNDS_PAD = { top: 12, right: 16, bottom: 26, left: 56 };

function formatUnits(value: number): string {
  if (value >= 100) return String(Math.round(value));
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(3);
}

export function CompoundingError({
  defaultEpsilon = 0.05,
  defaultSteps = 120,
  maxSteps = 240,
  chunkSize = 25,
  className,
}: CompoundingErrorProps) {
  const [epsilonPercent, setEpsilonPercent] = useState(defaultEpsilon * 100);
  const [steps, setSteps] = useState(defaultSteps);
  const [mode, setMode] = useState<PredictionMode>('per-step');
  const [dagger, setDagger] = useState(false);

  const epsilon = epsilonPercent / 100;

  // Fixed vertical scale anchored to the worst case (max error, full
  // horizon, per-step, no corrections) so raising epsilon or T always
  // increases the visible divergence instead of rescaling it away.
  const rolloutScale = useMemo(() => {
    const worst = simulateDeviation({
      epsilon: MAX_EPSILON_PERCENT / 100,
      steps: maxSteps,
      mode: 'per-step',
      chunkSize,
      dagger: false,
    });
    const maxDeviation = worst[maxSteps] + 0.5;
    return (ROLLOUT_H / 2 - 14) / maxDeviation;
  }, [maxSteps, chunkSize]);

  const rollout = useMemo(() => {
    const deviation = simulateDeviation({
      epsilon,
      steps,
      mode,
      chunkSize,
      dagger,
    });
    const x = (t: number) =>
      16 + (t / maxSteps) * (ROLLOUT_W - 32);
    const cy = ROLLOUT_H / 2 + 6;
    const y = (t: number) =>
      cy -
      (expertY(t) + deviation[t] * (1 + 0.08 * Math.sin(t * 0.55))) *
        rolloutScale;
    const expertPath: string[] = [];
    for (let t = 0; t <= maxSteps; t += 2) {
      const ey = cy - expertY(t) * rolloutScale;
      expertPath.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${ey.toFixed(1)}`);
    }
    const tracePath = deviation
      .map((_, t) => `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(t).toFixed(1)}`)
      .join(' ');
    const corrections: Array<{ x: number; y: number }> = [];
    if (dagger) {
      for (let t = DAGGER_INTERVAL; t <= steps; t += DAGGER_INTERVAL) {
        corrections.push({ x: x(t), y: y(t) });
      }
    }
    return {
      expertPath: expertPath.join(' '),
      tracePath,
      corrections,
      finalDeviation: deviation[steps],
      cost: accumulatedCost(deviation),
    };
  }, [epsilon, steps, mode, chunkSize, dagger, maxSteps, rolloutScale]);

  const bounds = useMemo(() => {
    const plotW = BOUNDS_W - BOUNDS_PAD.left - BOUNDS_PAD.right;
    const plotH = BOUNDS_H - BOUNDS_PAD.top - BOUNDS_PAD.bottom;
    const yMax = bcBound(MAX_EPSILON_PERCENT / 100, maxSteps) * 1.05;
    const x = (t: number) => BOUNDS_PAD.left + (t / maxSteps) * plotW;
    const y = (v: number) => BOUNDS_PAD.top + plotH - (v / yMax) * plotH;
    const curve = (fn: (t: number) => number) => {
      const parts: string[] = [];
      for (let t = 0; t <= maxSteps; t += 2) {
        parts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(fn(t)).toFixed(1)}`);
      }
      return parts.join(' ');
    };
    // Simulated accumulated cost for the current settings, extended across
    // the full horizon so the marker travels along a stable curve.
    const deviation = simulateDeviation({
      epsilon,
      steps: maxSteps,
      mode,
      chunkSize,
      dagger,
    });
    let running = 0;
    const simPoints: string[] = [];
    for (let t = 0; t <= maxSteps; t += 1) {
      running += Math.abs(deviation[t]);
      simPoints.push(
        `${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(Math.min(running, yMax)).toFixed(1)}`,
      );
    }
    let simAtT = 0;
    for (let t = 0; t <= steps; t += 1) simAtT += Math.abs(deviation[t]);
    return {
      plotW,
      plotH,
      x,
      y,
      yMax,
      bcPath: curve((t) => bcBound(epsilon, t)),
      daggerPath: curve((t) => daggerBound(epsilon, t)),
      simPath: simPoints.join(' '),
      marker: { cx: x(steps), cy: y(Math.min(simAtT, yMax)) },
      bcAtT: bcBound(epsilon, steps),
      daggerAtT: daggerBound(epsilon, steps),
    };
  }, [epsilon, steps, mode, chunkSize, dagger, maxSteps]);

  function reset() {
    setEpsilonPercent(defaultEpsilon * 100);
    setSteps(defaultSteps);
    setMode('per-step');
    setDagger(false);
  }

  const toggleBase =
    'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const toggleOn = 'border-accent text-accent';
  const toggleOff =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="ce-epsilon"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Per-step error
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {epsilonPercent.toFixed(1)}%
            </span>
          </label>
          <input
            id="ce-epsilon"
            type="range"
            min={MIN_EPSILON_PERCENT}
            max={MAX_EPSILON_PERCENT}
            step={0.5}
            value={epsilonPercent}
            onChange={(e) => setEpsilonPercent(Number(e.target.value))}
            aria-label={`Per-step error epsilon in percent, currently ${epsilonPercent.toFixed(1)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor="ce-horizon"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Episode horizon
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {steps} steps
            </span>
          </label>
          <input
            id="ce-horizon"
            type="range"
            min={MIN_STEPS}
            max={maxSteps}
            step={5}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            aria-label={`Episode horizon in steps, currently ${steps}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Prediction mode"
          className="flex gap-2"
        >
          <button
            type="button"
            aria-pressed={mode === 'per-step'}
            onClick={() => setMode('per-step')}
            className={cx(toggleBase, mode === 'per-step' ? toggleOn : toggleOff)}
          >
            Per-timestep prediction
          </button>
          <button
            type="button"
            aria-pressed={mode === 'chunk'}
            onClick={() => setMode('chunk')}
            className={cx(toggleBase, mode === 'chunk' ? toggleOn : toggleOff)}
          >
            Chunk of {chunkSize} actions
          </button>
        </div>
        <button
          type="button"
          aria-pressed={dagger}
          onClick={() => setDagger((v) => !v)}
          className={cx(toggleBase, dagger ? toggleOn : toggleOff)}
        >
          DAgger relabeling
        </button>
      </div>

      <svg
        viewBox={`0 0 ${ROLLOUT_W} ${ROLLOUT_H}`}
        role="img"
        aria-label={`Rollout trace of a policy with per-step error ${epsilonPercent.toFixed(1)} percent over ${steps} steps, drifting away from the demonstrated path.`}
        className="mt-4 block w-full"
      >
        <text
          x={16}
          y={16}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          rollout view: demonstrated path vs policy
        </text>
        <line
          x1={16}
          x2={ROLLOUT_W - 16}
          y1={ROLLOUT_H / 2 + 6}
          y2={ROLLOUT_H / 2 + 6}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <path
          d={rollout.expertPath}
          fill="none"
          stroke="var(--color-text-dim)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <path
          d={rollout.tracePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        {rollout.corrections.map((c) => (
          <line
            key={c.x}
            x1={c.x}
            x2={c.x}
            y1={c.y - 6}
            y2={c.y + 6}
            stroke="var(--color-ok)"
            strokeWidth={1.5}
          />
        ))}
        <text
          x={ROLLOUT_W - 16}
          y={ROLLOUT_H - 8}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {dagger ? 'ticks: expert relabeling rounds' : `t = 0 to ${steps}`}
        </text>
      </svg>

      <svg
        viewBox={`0 0 ${BOUNDS_W} ${BOUNDS_H}`}
        role="img"
        aria-label={`Accumulated deviation and regret bounds over the episode horizon; the simulated cost tracks the quadratic epsilon T squared bound and outgrows the linear epsilon T bound.`}
        className="mt-2 block w-full"
      >
        <text
          x={BOUNDS_PAD.left}
          y={10}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          accumulated deviation vs step
        </text>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = BOUNDS_PAD.top + (1 - f) * bounds.plotH;
          return (
            <g key={f}>
              <line
                x1={BOUNDS_PAD.left}
                x2={BOUNDS_PAD.left + bounds.plotW}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={BOUNDS_PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {formatUnits(bounds.yMax * f)}
              </text>
            </g>
          );
        })}
        {[0, maxSteps / 2, maxSteps].map((t) => (
          <text
            key={t}
            x={BOUNDS_PAD.left + (t / maxSteps) * bounds.plotW}
            y={BOUNDS_H - 8}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {t}
          </text>
        ))}
        <path
          data-testid="bc-bound-curve"
          d={bounds.bcPath}
          fill="none"
          stroke="var(--color-text-dim)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <path
          data-testid="dagger-bound-curve"
          d={bounds.daggerPath}
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <path
          d={bounds.simPath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <circle
          cx={bounds.marker.cx}
          cy={bounds.marker.cy}
          r={4.5}
          fill="var(--color-bg)"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <g fontSize={10} fontFamily="var(--font-mono)" fill="var(--color-text-dim)">
          <line
            x1={BOUNDS_PAD.left + bounds.plotW - 218}
            x2={BOUNDS_PAD.left + bounds.plotW - 196}
            y1={16}
            y2={16}
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
          <text x={BOUNDS_PAD.left + bounds.plotW - 190} y={20}>
            simulated
          </text>
          <line
            x1={BOUNDS_PAD.left + bounds.plotW - 126}
            x2={BOUNDS_PAD.left + bounds.plotW - 104}
            y1={16}
            y2={16}
            stroke="var(--color-text-dim)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={BOUNDS_PAD.left + bounds.plotW - 98} y={20}>
            eT(T+1)/2
          </text>
          <line
            x1={BOUNDS_PAD.left + bounds.plotW - 218}
            x2={BOUNDS_PAD.left + bounds.plotW - 196}
            y1={32}
            y2={32}
            stroke="var(--color-ok)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={BOUNDS_PAD.left + bounds.plotW - 190} y={36}>
            eT (DAgger)
          </text>
        </g>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">accumulated deviation =</span>{' '}
        <span data-testid="accumulated-deviation-readout" className="text-accent">
          {formatUnits(rollout.cost)}
        </span>{' '}
        <span className="text-text-dim">
          units over {steps} steps, final deviation Δ(T) =
        </span>{' '}
        <span data-testid="final-deviation-readout">
          {formatUnits(rollout.finalDeviation)}
        </span>
      </p>
      <p className="mt-1 font-mono text-xs text-text-dim">
        bounds at T = {steps}: εT(T+1)/2 = {formatUnits(bounds.bcAtT)}, εT ={' '}
        {formatUnits(bounds.daggerAtT)}
      </p>
    </div>
  );
}
