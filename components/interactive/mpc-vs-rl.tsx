'use client';

import { useState } from 'react';
import {
  APPLY_STEP,
  CONTROLLERS,
  DEFAULT_PERTURBATION,
  PERTURBATIONS,
  STATUS_META,
  TRACE_STEPS,
  type ControllerId,
} from '@/lib/mpc-vs-rl';
import { cx } from '@/lib/utils';

/**
 * MpcVsRl: one quadruped, two controllers, four perturbations. The
 * model-based controller (iLQR whole-body MPC) and the learned sim-RL
 * policy answer the same disturbance differently, and the difference is
 * the argument: MPC rejects modeled disturbances cleanly and fails when
 * the model is wrong; the policy absorbs what it was randomized over and
 * fails ungracefully outside it. A compute-per-step readout contrasts
 * online re-solving with a single forward pass.
 *
 * Traces are base-height deviation in centimeters, an illustrative
 * teaching model rather than measured hardware data, labeled as such.
 *
 * Interactive contract: deterministic initial render (lateral push),
 * native buttons (keyboard-accessible), visible monospace readouts,
 * reset control, fixed SVG viewport (no layout shift), no JS-driven
 * motion (selection-only, reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 260;
const PLOT = { left: 48, right: 624, top: 24, bottom: 216 } as const;

const f = (v: number) => Number(v.toFixed(2));

const TRACE_STROKE: Record<ControllerId, string> = {
  mpc: 'var(--color-accent)',
  rl: 'var(--color-text)',
};

const STATUS_TONE_TEXT = {
  ok: 'text-ok',
  warn: 'text-warn',
  err: 'text-err',
} as const;

function xFor(step: number): number {
  return f(PLOT.left + (step / (TRACE_STEPS - 1)) * (PLOT.right - PLOT.left));
}

export function MpcVsRl({ className }: { className?: string }) {
  const [selected, setSelected] = useState(DEFAULT_PERTURBATION);
  const perturbation =
    PERTURBATIONS.find((p) => p.id === selected) ?? PERTURBATIONS[0];

  const maxDeviation = Math.max(
    4,
    ...perturbation.mpc.trace,
    ...perturbation.rl.trace,
  );
  const yMax = Math.ceil(maxDeviation / 4) * 4;

  function yFor(deviation: number): number {
    return f(PLOT.bottom - (deviation / yMax) * (PLOT.bottom - PLOT.top));
  }

  function points(trace: number[]): string {
    return trace.map((d, s) => `${xFor(s)},${yFor(d)}`).join(' ');
  }

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';
  const buttonActive = 'border-accent bg-surface-2 text-accent';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="group" aria-label="Perturbation" className="flex flex-wrap gap-1">
          {PERTURBATIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected === p.id}
              onClick={() => setSelected(p.id)}
              className={cx(
                buttonBase,
                selected === p.id ? buttonActive : buttonIdle,
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => setSelected(DEFAULT_PERTURBATION)}
          className={cx(buttonBase, buttonIdle)}
        >
          Reset
        </button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        data-testid="perturbation-chart"
        aria-label={`Base-height deviation after a ${perturbation.label}. MPC: ${STATUS_META[perturbation.mpc.status].label}. RL policy: ${STATUS_META[perturbation.rl.status].label}.`}
        className="mt-3 block w-full"
      >
        <text
          x={PLOT.left}
          y={16}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          base-height deviation (cm), illustrative
        </text>
        <text
          x={PLOT.right}
          y={16}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {perturbation.label} at step {APPLY_STEP}
        </text>

        {/* Zero line and perturbation marker */}
        <line
          x1={PLOT.left}
          x2={PLOT.right}
          y1={PLOT.bottom}
          y2={PLOT.bottom}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <line
          x1={xFor(APPLY_STEP)}
          x2={xFor(APPLY_STEP)}
          y1={PLOT.top}
          y2={PLOT.bottom}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Y ticks */}
        {[0, yMax / 2, yMax].map((tick) => (
          <g key={tick}>
            <line
              x1={PLOT.left - 4}
              x2={PLOT.left}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 8}
              y={yFor(tick) + 3}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 10, 20, 30, TRACE_STEPS - 1].map((tick) => (
          <text
            key={tick}
            x={xFor(tick)}
            y={PLOT.bottom + 16}
            textAnchor={tick === TRACE_STEPS - 1 ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {tick}
          </text>
        ))}
        <text
          x={(PLOT.left + PLOT.right) / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          control steps after perturbation
        </text>

        {/* RL trace (dashed, under) */}
        <polyline
          data-testid="rl-trace"
          points={points(perturbation.rl.trace)}
          fill="none"
          stroke={TRACE_STROKE.rl}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        {/* MPC trace (solid accent, over) */}
        <polyline
          data-testid="mpc-trace"
          points={points(perturbation.mpc.trace)}
          fill="none"
          stroke={TRACE_STROKE.mpc}
          strokeWidth={2}
        />

        {/* Legend */}
        <g fontFamily="var(--font-mono)" fontSize={10}>
          <line
            x1={PLOT.right - 172}
            x2={PLOT.right - 152}
            y1={34}
            y2={34}
            stroke={TRACE_STROKE.mpc}
            strokeWidth={2}
          />
          <text x={PLOT.right - 146} y={38} fill="var(--color-text-dim)">
            {CONTROLLERS.mpc.short}
          </text>
          <line
            x1={PLOT.right - 96}
            x2={PLOT.right - 76}
            y1={34}
            y2={34}
            stroke={TRACE_STROKE.rl}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <text x={PLOT.right - 70} y={38} fill="var(--color-text-dim)">
            {CONTROLLERS.rl.short}
          </text>
        </g>
      </svg>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {(['mpc', 'rl'] as ControllerId[]).map((id) => {
          const controller = CONTROLLERS[id];
          const response = perturbation[id];
          const status = STATUS_META[response.status];
          return (
            <div
              key={id}
              className="rounded-sm border border-border bg-bg p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
                  {controller.name}
                </p>
                <span
                  data-testid={`${id}-status`}
                  className={cx(
                    'whitespace-nowrap font-mono text-xs',
                    STATUS_TONE_TEXT[status.tone],
                  )}
                >
                  {status.label}
                </span>
              </div>
              <p
                data-testid={`${id}-annotation`}
                className="mt-2 font-sans text-xs leading-relaxed text-text"
              >
                {response.annotation}
              </p>
              <p className="mt-2 font-mono text-xs text-text-dim">
                compute per step:{' '}
                <span data-testid={`${id}-compute`} className="text-text">
                  {controller.compute}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-sans text-xs leading-relaxed text-text-dim" aria-live="polite">
        Same robot, same perturbation, two controllers. The traces are an
        illustrative model of the failure modes the literature reports, not
        measured hardware data.
      </p>
    </div>
  );
}
