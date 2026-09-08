'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  HANDOFF_TICK,
  JERK_LIMIT,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  TICK_MS,
  TRACE_TICKS,
  executedTrace,
  oldPlanVelocity,
  pauseTicks,
  peakDeltaV,
  type ExecutionMode,
} from '@/lib/execution-modes';
import { cx } from '@/lib/utils';

/**
 * Three deterministic teaching traces, not measured robot data or an RTC
 * solver. Velocity units, offsets, ramps and five-tick linear blending are
 * internal assumptions. The 0.30 delta-v threshold is a discontinuity
 * proxy, not physical jerk. Preserve all controls, defaults and traces.
 */

/**
 * Each mode's trace carries its cost in the line itself: the mode that keeps
 * the command stream whole is drawn whole, the mode that stops the robot is
 * drawn with a long broken rhythm, and the mode that tears the command
 * stream is drawn dash-dot. Three panels compared side by side stay
 * separable when the hues are desaturated away.
 */
const MODE_META: Record<
  ExecutionMode,
  { label: string; color: string; textClass: string; dash?: string }
> = {
  synchronous: {
    label: 'synchronous',
    color: 'var(--color-warn)',
    textClass: 'text-warn',
    dash: '8 4',
  },
  naive: {
    label: 'naive switch',
    color: 'var(--color-err)',
    textClass: 'text-err',
    dash: '10 3 2 3',
  },
  rtc: { label: 'real-time chunking', color: 'var(--color-ok)', textClass: 'text-ok' },
};

const MODE_ORDER: ExecutionMode[] = ['synchronous', 'naive', 'rtc'];

const PANEL = {
  width: 640,
  height: 148,
  pad: { top: 14, right: 14, bottom: 26, left: 44 },
};
const V_MAX = 2.0;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function ModePanel({
  mode,
  delayMs,
  descriptionId,
}: {
  mode: ExecutionMode;
  delayMs: number;
  /** All three panels share one takeaway, so all three point at it. */
  descriptionId: string;
}) {
  const meta = MODE_META[mode];
  const trace = executedTrace(mode, delayMs);
  const peak = peakDeltaV(trace);
  const within = peak <= JERK_LIMIT;

  const plotW = PANEL.width - PANEL.pad.left - PANEL.pad.right;
  const plotH = PANEL.height - PANEL.pad.top - PANEL.pad.bottom;
  const x = (tick: number) => f(PANEL.pad.left + (tick / (TRACE_TICKS - 1)) * plotW);
  const y = (v: number) => f(PANEL.pad.top + (1 - v / V_MAX) * plotH);

  const path = trace
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.tick)},${y(p.v)}`)
    .join(' ');
  const guidePath = trace
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.tick)},${y(oldPlanVelocity(p.tick))}`)
    .join(' ');

  const pause = mode === 'synchronous' ? pauseTicks(delayMs) : 0;
  const pauseFromX = x(HANDOFF_TICK + 4);
  const pauseToX = x(HANDOFF_TICK + 4 + pause);
  const spikeTick = trace.reduce(
    (best, p, i) =>
      i > 0 && Math.abs(p.v - trace[i - 1].v) >= Math.abs(trace[best].v - trace[best - 1].v)
        ? i
        : best,
    1,
  );

  return (
    <div data-testid={`panel-${mode}`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={cx('font-mono text-xs', meta.textClass)}>
          {meta.label}
        </span>
        <span className="font-mono text-xs text-text">
          peak |Δv|{' '}
          <span
            data-testid={`dv-${mode}`}
            data-value={Number(peak.toFixed(3))}
            className="text-accent"
          >
            {peak.toFixed(2)}
          </span>
        </span>
        <span
          data-testid={`verdict-${mode}`}
          className={cx('font-mono text-[11px]', within ? 'text-ok' : 'text-err')}
        >
          {within ? `within ${JERK_LIMIT.toFixed(2)} limit` : `exceeds ${JERK_LIMIT.toFixed(2)} limit`}
        </span>
        {mode === 'synchronous' && (
          <span className="ml-auto font-mono text-[11px] text-text-dim">
            dead time{' '}
            <span data-testid="pause-readout" className="text-warn">
              {pause * TICK_MS} ms
            </span>
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${PANEL.width} ${PANEL.height}`}
        role="img"
        aria-label={`Illustrative velocity trace for ${meta.label} execution at ${delayMs} milliseconds of inference delay. Peak per-tick velocity step ${peak.toFixed(2)}, ${within ? 'within' : 'above'} the ${JERK_LIMIT.toFixed(2)} discontinuity-proxy limit, not physical jerk.`}
        aria-describedby={descriptionId}
        className="mt-1 block w-full"
      >
        {/* Pause window (synchronous only). */}
        {mode === 'synchronous' && pause > 0 && (
          <g>
            <rect
              x={pauseFromX}
              y={PANEL.pad.top}
              width={f(pauseToX - pauseFromX)}
              height={plotH}
              fill="var(--color-warn)"
              fillOpacity={0.08}
              stroke="var(--color-warn)"
              strokeWidth={1}
              strokeDasharray="5 3"
            />
            <text
              x={(pauseFromX + pauseToX) / 2}
              y={PANEL.pad.top + 12}
              textAnchor="middle"
              fill="var(--color-warn)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              robot waits
            </text>
          </g>
        )}
        {/* Zero-velocity baseline. */}
        <line
          x1={PANEL.pad.left}
          x2={PANEL.pad.left + plotW}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <text
          x={PANEL.pad.left - 8}
          y={y(0) + 3}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          0
        </text>
        {/* Hand-off instant. */}
        <line
          x1={x(HANDOFF_TICK)}
          x2={x(HANDOFF_TICK)}
          y1={PANEL.pad.top}
          y2={PANEL.pad.top + plotH}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={x(HANDOFF_TICK) + 5}
          y={PANEL.height - 8}
          fill="var(--color-text-dim)"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          new chunk arrives
        </text>
        {/* Uninterrupted old plan, as a guide. */}
        <path
          d={guidePath}
          fill="none"
          stroke="var(--color-text-dim)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.55}
        />
        {/* Executed trace. */}
        <path
          data-testid={`trace-${mode}`}
          d={path}
          fill="none"
          stroke={meta.color}
          strokeWidth={2}
          strokeDasharray={meta.dash}
        />
        {/* Spike marker where the worst step lands. */}
        {!within && (
          <g data-testid={`spike-${mode}`}>
            {/* Broken ring with a cross marks a toy step above the proxy
                threshold, not a physical controller's execution limit. */}
            <circle
              cx={x(spikeTick)}
              cy={y(trace[spikeTick].v)}
              r={5.5}
              fill="var(--color-bg)"
              stroke="var(--color-err)"
              strokeWidth={1.5}
              strokeDasharray="4 2.5"
            />
            <path
              d={`M ${f(x(spikeTick) - 3)} ${f(y(trace[spikeTick].v) - 3)} L ${f(x(spikeTick) + 3)} ${f(y(trace[spikeTick].v) + 3)} M ${f(x(spikeTick) - 3)} ${f(y(trace[spikeTick].v) + 3)} L ${f(x(spikeTick) + 3)} ${f(y(trace[spikeTick].v) - 3)}`}
              stroke="var(--color-err)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <text
              x={x(spikeTick) + 8}
              y={y(trace[spikeTick].v) - 6}
              fill="var(--color-err)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              Δv spike
            </text>
          </g>
        )}
        {/* Tick axis. */}
        {[0, 10, 20, TRACE_TICKS - 1].map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={PANEL.height - 8}
            textAnchor={tick === 0 ? 'start' : tick === TRACE_TICKS - 1 ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={9}
            fontFamily="var(--font-mono)"
          >
            {tick * TICK_MS}
          </text>
        ))}
        <text
          x={PANEL.pad.left + plotW}
          y={PANEL.height + 6 - 10}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          ms
        </text>
      </svg>
    </div>
  );
}

export function ExecutionModes({ className }: { className?: string }) {
  const descriptionId = `${useId()}-em-description`;
  const [delayMs, setDelayMs] = useState(MIN_DELAY_MS);

  const naivePeak = peakDeltaV(executedTrace('naive', delayMs));
  const naiveFails = naivePeak > JERK_LIMIT;
  const rtcPeak = peakDeltaV(executedTrace('rtc', delayMs));
  const deadMs = pauseTicks(delayMs) * TICK_MS;

  // Sampled from the same executedTrace calls the three panels draw, so a
  // cell and a plotted vertex are the same number and the table moves
  // with the delay slider.
  const sampleRows = useMemo(() => {
    const traces = Object.fromEntries(
      MODE_ORDER.map((mode) => [mode, executedTrace(mode, delayMs)]),
    ) as Record<ExecutionMode, ReturnType<typeof executedTrace>>;
    return [0, 6, 12, 18, 24, TRACE_TICKS - 1].map((tick) => ({
      label: `${tick}`,
      values: MODE_ORDER.map((mode) => {
        const point = traces[mode].find((p) => p.tick === tick);
        return (point?.v ?? 0).toFixed(2);
      }),
    }));
  }, [delayMs]);

  const descriptionText = `At ${delayMs} ms of inference delay the synchronous velocity trace stops for ${deadMs} ms of dead time, while the naive switch reaches a peak velocity step of ${naivePeak.toFixed(
    2,
  )} per 20 ms tick and real-time chunking reaches ${rtcPeak.toFixed(
    2,
  )}, both read against the illustrative ${JERK_LIMIT.toFixed(
    2,
  )} discontinuity-proxy limit; these constructed traces use arbitrary velocity units, not physical jerk or measured robot data. The five-tick linear blend is not RTC inpainting, and the dashed guide is the uninterrupted toy old plan.`;

  function reset() {
    setDelayMs(MIN_DELAY_MS);
  }

  return (
    <div
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="em-delay"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Inference delay
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              d = {delayMs} ms
            </span>
          </label>
          <input
            id="em-delay"
            type="range"
            data-brand-control-id="control:input"
            min={MIN_DELAY_MS}
            max={MAX_DELAY_MS}
            step={10}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            aria-label={`Inference delay in milliseconds, currently ${delayMs}`}
            aria-valuetext={`${delayMs} milliseconds`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-brand-control-id="control:secondary-action"
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-sans text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">d = {delayMs} ms:</span>{' '}
        {naiveFails ? (
          <span className="text-err">
            the toy naive switch steps by {naivePeak.toFixed(2)} per tick
          </span>
        ) : (
          <span className="text-ok">all three toy traces stay below the proxy limit</span>
        )}
        <span className="text-text-dim">
          ; Δv proxy limit {JERK_LIMIT.toFixed(2)} per 20 ms tick
        </span>
      </p>

      <div className="mt-3 grid gap-4">
        {MODE_ORDER.map((mode) => (
          <ModePanel
            key={mode}
            mode={mode}
            delayMs={delayMs}
            descriptionId={descriptionId}
          />
        ))}
      </div>

      <p data-testid="execution-assumption-note" className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
        Illustrative hand-off traces, not an RTC solver or measured robot
        data. Velocity is in arbitrary units; the 0.30 per-20-ms-tick limit
        is a discontinuity proxy, not physical jerk. The sine-shaped plan,
        delay-dependent offset, four-tick ramps and five-tick linear blend
        are teaching assumptions, not the paper’s inpainting algorithm.
        RTC (arXiv:2506.07339) motivates overlapping inference and execution;
        these curves do not reproduce its experiments or guarantee safety.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Sampled commanded velocity across the hand-off"
        rowHeader="tick"
        columns={[
          { header: 'synchronous', numeric: true },
          { header: 'naive', numeric: true },
          { header: 'chunking', numeric: true },
        ]}
        rows={sampleRows}
        description={descriptionText}
      />
    </div>
  );
}
