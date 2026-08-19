'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  DEFAULT_ENVS,
  MAX_ENVS,
  MIN_ENVS,
  RUDIN_MARKERS,
  curvePoints,
  formatEnvs,
  formatFps,
  formatWallClock,
  iterationBreakdown,
  iterationsToTarget,
  throughputFps,
  wallClockSeconds,
} from '@/lib/parallel-sim';
import { cx } from '@/lib/utils';

/**
 * TrainingTimeChart: wall-clock time-to-target-reward against parallel
 * environment count, on a log-log chart.
 *
 * The curve is an illustrative fixed-transitions model tuned to pass through
 * the Rudin et al. 2021 anchor (ANYmal flat terrain in under four minutes at
 * 4,096 environments on one workstation GPU); both Rudin ground-truth marks
 * (flat < 4 min, uneven 20 min) are drawn as labeled diamonds. A stacked bar
 * splits one training iteration into simulation, learning update, and
 * CPU + transfer work, recomposing as the env count moves. The CPU
 * single-core bottleneck toggle adds a per-environment CPU cost (the Isaac
 * Lab finding behind a single 5090 workstation approaching a 2x RTX PRO 6000
 * server) and overlays the GPU-scaling curve as a dashed reference.
 *
 * Interactive contract: deterministic initial render, native range input and
 * aria-pressed toggle (keyboard-accessible), visible monospace readouts,
 * reset control, fixed SVG viewport (no layout shift), no JS-driven motion
 * (scrub-only, so reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 360;
const PLOT = { left: 64, right: 624, top: 16, bottom: 316 } as const;

const MIN_LOG2 = Math.log2(MIN_ENVS); // 6
const MAX_LOG2 = Math.log2(MAX_ENVS); // 14
const Y_MIN_MINUTES = 1;
const Y_MAX_MINUTES = 300;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(envs: number): number {
  const t = (Math.log2(envs) - MIN_LOG2) / (MAX_LOG2 - MIN_LOG2);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yFor(minutes: number): number {
  const t =
    Math.log10(minutes) / Math.log10(Y_MAX_MINUTES / Y_MIN_MINUTES);
  return f(PLOT.bottom - t * (PLOT.bottom - PLOT.top));
}

const Y_TICKS: Array<{ minutes: number; label: string }> = [
  { minutes: 1, label: '1 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 300, label: '5 h' },
];

const X_TICKS = [64, 256, 1024, 4096, 16384] as const;

function polylinePoints(cpuBound: boolean): string {
  return curvePoints(cpuBound)
    .map((p) => `${xFor(p.envs)},${yFor(p.minutes)}`)
    .join(' ');
}

export function TrainingTimeChart({
  defaultEnvs = DEFAULT_ENVS,
  className,
}: {
  defaultEnvs?: number;
  className?: string;
}) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [log2Envs, setLog2Envs] = useState(Math.log2(defaultEnvs));
  const [cpuBound, setCpuBound] = useState(false);

  const envs = 2 ** log2Envs;
  const breakdown = iterationBreakdown(envs, cpuBound);
  const wallSeconds = wallClockSeconds(envs, cpuBound);
  const fps = throughputFps(envs, cpuBound);
  const iterations = iterationsToTarget(envs);

  const simPct = f((breakdown.simSeconds / breakdown.totalSeconds) * 100);
  const learnPct = f((breakdown.learnSeconds / breakdown.totalSeconds) * 100);
  const cpuPct = f((breakdown.cpuSeconds / breakdown.totalSeconds) * 100);

  function reset() {
    setLog2Envs(Math.log2(defaultEnvs));
    setCpuBound(false);
  }

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <div>
          <label
            htmlFor="ttc-envs"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Parallel environments
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatEnvs(envs)} envs
            </span>
          </label>
          <input
            id="ttc-envs"
            type="range"
            min={MIN_LOG2}
            max={MAX_LOG2}
            step={1}
            value={log2Envs}
            onChange={(e) => setLog2Envs(Number(e.target.value))}
            aria-label={`Parallel environments, currently ${formatEnvs(envs)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          type="button"
          aria-pressed={cpuBound}
          onClick={() => setCpuBound((v) => !v)}
          className={cx(
            'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
            cpuBound
              ? 'border-accent text-text'
              : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
          )}
        >
          CPU single-core bottleneck
        </button>
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
          envs:{' '}
          <span data-testid="envs-readout" className="text-text">
            {formatEnvs(envs)}
          </span>
        </span>
        <span className="text-text-dim">
          wall-clock:{' '}
          <span data-testid="wallclock-readout" className="text-accent">
            {formatWallClock(wallSeconds)}
          </span>
        </span>
        <span className="text-text-dim">
          throughput:{' '}
          <span data-testid="fps-readout" className="text-text">
            {formatFps(fps)}
          </span>
        </span>
        <span className="text-text-dim">
          iteration:{' '}
          <span data-testid="iter-readout" className="text-text">
            {Math.round(breakdown.totalSeconds * 1000)} ms x{' '}
            {formatEnvs(Math.round(iterations))} iters
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Wall-clock training time against parallel environments, ${formatEnvs(envs)} envs`}
        aria-describedby={descriptionId}
        className="mt-3 block w-full"
      >
        {/* Axes caption. */}
        <text
          x={PLOT.left}
          y={10}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          wall-clock to target reward (log)
        </text>
        {/* Horizontal gridlines and y tick labels. */}
        {Y_TICKS.map((t) => (
          <g key={t.minutes}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yFor(t.minutes)}
              y2={yFor(t.minutes)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 8}
              y={f(yFor(t.minutes) + 3)}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {t.label}
            </text>
          </g>
        ))}
        {/* Vertical gridlines and x tick labels. */}
        {X_TICKS.map((n) => (
          <g key={n}>
            <line
              x1={xFor(n)}
              x2={xFor(n)}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={xFor(n)}
              y={f(PLOT.bottom + 14)}
              textAnchor={n === MAX_ENVS ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {formatEnvs(n)}
            </text>
          </g>
        ))}
        <text
          x={f((PLOT.left + PLOT.right) / 2)}
          y={HEIGHT - 8}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          parallel environments (log2)
        </text>

        {/* GPU-scaling reference curve, shown only in bottleneck mode. */}
        {cpuBound && (
          <polyline
            data-testid="reference-curve"
            points={polylinePoints(false)}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Active curve. */}
        <polyline
          data-testid="active-curve"
          points={polylinePoints(cpuBound)}
          fill="none"
          stroke={cpuBound ? 'var(--color-err)' : 'var(--color-accent)'}
          strokeWidth={2}
        />

        {/* Rudin ground-truth markers at 4,096 envs. */}
        {RUDIN_MARKERS.map((m) => {
          const x = xFor(m.envs);
          const y = yFor(m.minutes);
          return (
            <g key={m.id} data-testid={`rudin-marker-${m.id}`}>
              <path
                d={`M ${x},${f(y - 5)} L ${f(x + 5)},${y} L ${x},${f(y + 5)} L ${f(x - 5)},${y} Z`}
                fill="var(--color-bg)"
                stroke="var(--color-text)"
                strokeWidth={1.5}
              />
              <text
                x={f(x - 10)}
                y={f(m.id === 'uneven' ? y - 8 : y + 16)}
                textAnchor="end"
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Current slider position on the active curve. */}
        <circle
          data-testid="position-marker"
          cx={xFor(envs)}
          cy={yFor(f(wallSeconds / 60))}
          r={4.5}
          fill={cpuBound ? 'var(--color-err)' : 'var(--color-accent)'}
          stroke="var(--color-bg)"
          strokeWidth={1.5}
        />
      </svg>

      {/* Iteration-time breakdown bar. */}
      <div
        className="mt-3 flex h-[18px] overflow-hidden rounded-sm border border-border"
        role="img"
        aria-label={`Iteration time breakdown: simulation ${Math.round(simPct)} percent, learning update ${Math.round(learnPct)} percent, CPU and transfer ${Math.round(cpuPct)} percent.`}
      >
        <div
          data-testid="breakdown-sim"
          style={{ width: `${simPct}%`, background: 'var(--color-accent)' }}
        />
        <div
          data-testid="breakdown-learn"
          style={{ width: `${learnPct}%`, background: 'var(--color-text-dim)' }}
        />
        <div
          data-testid="breakdown-cpu"
          style={{ width: `${cpuPct}%`, background: 'var(--color-err)' }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[1px]"
            style={{ background: 'var(--color-accent)' }}
          />
          simulation{' '}
          <span data-testid="share-sim" className="text-text">
            {Math.round(simPct)}%
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[1px]"
            style={{ background: 'var(--color-text-dim)' }}
          />
          learning update{' '}
          <span data-testid="share-learn" className="text-text">
            {Math.round(learnPct)}%
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[1px]"
            style={{ background: 'var(--color-err)' }}
          />
          CPU + transfer{' '}
          <span data-testid="share-cpu" className="text-text">
            {Math.round(cpuPct)}%
          </span>
        </span>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">{formatEnvs(envs)} envs:</span>{' '}
        <span className="text-accent">{formatWallClock(wallSeconds)}</span>{' '}
        <span className="text-text-dim">to target reward at</span>{' '}
        <span className="text-text">{formatFps(fps)}</span>
      </p>
      <p
        data-testid="cpu-explanation"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        {cpuBound
          ? 'With the PhysX CPU APIs and the main training loop bound to a single core, every added environment carries a CPU cost the GPU cannot absorb, and the curve flattens (dashed: the same run without the bottleneck). This is the Isaac Lab finding behind a single 5090 workstation approaching a 2x RTX PRO 6000 server on the Franka task.'
          : 'At low env counts the fixed per-iteration costs (learning update, host-device transfer, the Python loop) dominate and the GPU idles; at high counts simulation takes over and wall-clock falls from hours to minutes. Diamonds are measured wall-clock from Rudin et al. 2021 at 4,096 envs on one workstation GPU.'}
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Sampled wall-clock by parallel environment count"
        rowHeader="parallel envs"
        columns={[
          { header: 'wall-clock', numeric: true },
          { header: 'throughput', numeric: true },
        ]}
        rows={X_TICKS.map((n) => ({
          label: formatEnvs(n),
          values: [
            formatWallClock(wallClockSeconds(n, cpuBound)),
            formatFps(throughputFps(n, cpuBound)),
          ],
        }))}
        description={
          <>
            Wall-clock to the target reward falls steeply from{' '}
            {formatWallClock(wallClockSeconds(MIN_ENVS, cpuBound))} at {formatEnvs(MIN_ENVS)}{' '}
            envs to {formatWallClock(wallClockSeconds(envs, cpuBound))} at the current{' '}
            {formatEnvs(envs)} envs, then flattens toward{' '}
            {formatWallClock(wallClockSeconds(MAX_ENVS, cpuBound))} at{' '}
            {formatEnvs(MAX_ENVS)}: the knee sits near 1,024 envs where simulation
            overtakes the fixed per-iteration costs, and the Rudin flat-terrain
            measurement (under 4 min) sits at 4,096 envs
            {cpuBound
              ? '; with the CPU single-core bottleneck on, the curve flattens earlier and higher'
              : ''}
            .
          </>
        }
      />
    </div>
  );
}
