'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  MODE_VALUE,
  TRACE_TICKS,
  VALID_ACTION_FLOOR,
  isValidModeAction,
  rtcHandoffTrace,
  rtcThroughput,
  teActionAtHandoff,
  teHandoffTrace,
  teStatus,
  teThroughput,
  type ExecutionStatus,
} from '@/lib/latency-chunking';
import { cx } from '@/lib/utils';

/**
 * LatencyComparison: why temporal ensembling breaks under inference delay
 * and Real-Time Chunking does not.
 *
 * One slider injects inference delay (0 to 240 ms). Two panels respond:
 * a throughput-vs-delay chart (temporal ensembling collapses inside the
 * documented 100 to 200 ms failure window; RTC holds flat, matching the
 * published result) and a hand-off action trace showing the ensemble's
 * averaged action leaving both valid modes. Curves are a qualitative model
 * of the published results (arXiv:2506.07339), labeled as such.
 *
 * Interactive contract: deterministic initial render, visible monospace
 * readouts, reset control, native keyboard-accessible slider with an
 * aria-label, fixed-height charts (no layout shift), no auto-playing motion.
 */
type LatencyComparisonProps = {
  /** Initial injected delay in ms. Default 0 (no added latency). */
  defaultDelayMs?: number;
  className?: string;
};

const CHART = { width: 640, height: 210, pad: { top: 14, right: 18, bottom: 30, left: 48 } };
const TRACE = { width: 640, height: 190, pad: { top: 14, right: 18, bottom: 30, left: 48 } };

/** Delay window (ms) where Physical Intelligence documents TE failing. */
const FAILURE_WINDOW = { from: 100, to: 200 };

const STATUS_COLOR: Record<ExecutionStatus, string> = {
  nominal: 'text-ok',
  degraded: 'text-warn',
  failed: 'text-err',
};

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

export function LatencyComparison({
  defaultDelayMs = MIN_DELAY_MS,
  className,
}: LatencyComparisonProps) {
  // useId-derived input id: this component legitimately renders twice on
  // one page (a standalone mount plus a wrapped prediction figure), and a
  // hardcoded id would duplicate and cross-bind the label.
  const delayId = `${useId()}-lc-delay`;
  const [delayMs, setDelayMs] = useState(defaultDelayMs);

  const te = teThroughput(delayMs);
  const rtc = rtcThroughput(delayMs);
  const status = teStatus(delayMs);
  const handoffAction = teActionAtHandoff(delayMs);
  const offMode = !isValidModeAction(handoffAction);

  const throughputChart = useMemo(() => {
    const plotW = CHART.width - CHART.pad.left - CHART.pad.right;
    const plotH = CHART.height - CHART.pad.top - CHART.pad.bottom;
    const x = (d: number) =>
      CHART.pad.left + ((d - MIN_DELAY_MS) / (MAX_DELAY_MS - MIN_DELAY_MS)) * plotW;
    const y = (p: number) => CHART.pad.top + (1 - p) * plotH;

    const tePath: string[] = [];
    const rtcPath: string[] = [];
    for (let d = MIN_DELAY_MS; d <= MAX_DELAY_MS; d += 4) {
      const prefix = d === MIN_DELAY_MS ? 'M' : 'L';
      tePath.push(`${prefix}${x(d).toFixed(2)},${y(teThroughput(d)).toFixed(2)}`);
      rtcPath.push(`${prefix}${x(d).toFixed(2)},${y(rtcThroughput(d)).toFixed(2)}`);
    }
    return {
      tePath: tePath.join(' '),
      rtcPath: rtcPath.join(' '),
      plotW,
      plotH,
      x,
      y,
      markerX: x(delayMs),
      teMarkerY: y(te),
      rtcMarkerY: y(rtc),
      windowFromX: x(FAILURE_WINDOW.from),
      windowToX: x(FAILURE_WINDOW.to),
      // Sampled from teThroughput/rtcThroughput, the two functions the
      // curves are drawn from.
      sampleRows: [...new Set([0, 60, 100, 140, 200, MAX_DELAY_MS, delayMs])]
        .sort((a, b) => a - b)
        .map((d) => ({
          label: `${d}`,
          values: [
            `${Math.round(teThroughput(d) * 100)}%`,
            `${Math.round(rtcThroughput(d) * 100)}%`,
            teStatus(d),
            d === delayMs ? 'playhead' : 'off',
          ],
        })),
    };
  }, [delayMs, te, rtc]);

  const traceChart = useMemo(() => {
    const plotW = TRACE.width - TRACE.pad.left - TRACE.pad.right;
    const plotH = TRACE.height - TRACE.pad.top - TRACE.pad.bottom;
    const x = (tick: number) => TRACE.pad.left + (tick / (TRACE_TICKS - 1)) * plotW;
    // y spans [-1, 1] of action space with a small margin.
    const y = (a: number) => TRACE.pad.top + ((1.1 - a) / 2.2) * plotH;

    const toPath = (points: { tick: number; action: number }[]) =>
      points
        .map(
          (p, i) =>
            `${i === 0 ? 'M' : 'L'}${x(p.tick).toFixed(2)},${y(p.action).toFixed(2)}`,
        )
        .join(' ');

    const tePoints = teHandoffTrace(delayMs);
    const rtcPoints = rtcHandoffTrace(delayMs);
    return {
      plotW,
      plotH,
      x,
      y,
      tePath: toPath(tePoints),
      rtcPath: toPath(rtcPoints),
      teEnd: { cx: x(TRACE_TICKS - 1), cy: y(tePoints.at(-1)?.action ?? 0) },
      handoffX: x(HANDOFF_TICK),
      modeY: y(MODE_VALUE),
      negModeY: y(-MODE_VALUE),
      floorY: y(VALID_ACTION_FLOOR),
      negFloorY: y(-VALID_ACTION_FLOOR),
      teEndAction: tePoints.at(-1)?.action ?? 0,
      // Sampled from the same two trace functions, so a row and a plotted
      // vertex are the same number.
      sampleRows: [0, 4, HANDOFF_TICK, 12, 18, TRACE_TICKS - 1].map((tick) => {
        const teAction = tePoints.find((p) => p.tick === tick)?.action ?? 0;
        const rtcAction = rtcPoints.find((p) => p.tick === tick)?.action ?? 0;
        return {
          label: `${tick}`,
          values: [
            teAction.toFixed(2),
            rtcAction.toFixed(2),
            isValidModeAction(teAction) ? 'on a mode' : 'off-mode',
          ],
        };
      }),
    };
  }, [delayMs]);

  const throughputDescription = `At ${formatMs(
    delayMs,
  )} of injected delay temporal ensembling holds ${Math.round(
    te * 100,
  )}% of task throughput and real-time chunking holds ${Math.round(
    rtc * 100,
  )}%, and ensembling falls to zero across the shaded ${FAILURE_WINDOW.from} to ${
    FAILURE_WINDOW.to
  } ms failure window the paper documents; the two curves are a qualitative model of the published results and not a re-run of the experiment, so the shape carries the claim rather than the exact percentages.`;

  const traceDescription = `Across the ${TRACE_TICKS}-tick hand-off at ${formatMs(
    delayMs,
  )} of delay the real-time chunking action stays flat on the committed mode at ${MODE_VALUE.toFixed(
    2,
  )} while the ensembled action ${
    offMode
      ? `leaves both valid modes and ends at ${traceChart.teEndAction.toFixed(2)}`
      : `holds within tolerance and ends at ${traceChart.teEndAction.toFixed(2)}`
  }; the shaded band between the two dashed mode lines is the invalid middle no demonstration ever commanded, and those lines are the modelled modes rather than measured actions.`;

  function reset() {
    setDelayMs(defaultDelayMs);
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
            htmlFor={delayId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Injected inference delay
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              d = {formatMs(delayMs)}
            </span>
          </label>
          <input
            id={delayId}
            type="range"
            min={MIN_DELAY_MS}
            max={MAX_DELAY_MS}
            step={5}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            aria-label={`Injected inference delay, currently ${formatMs(delayMs)}`}
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

      {/* Panel 1: task throughput against injected delay. */}
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label={`Chart of task throughput against injected inference delay. Temporal ensembling collapses to zero inside the 100 to 200 millisecond failure window while real-time chunking holds at 100 percent. Current delay ${formatMs(delayMs)}.`}
        aria-describedby={`${delayId}-throughput-description`}
        className="mt-4 block w-full"
      >
        {/* Documented TE failure window. */}
        <rect
          x={throughputChart.windowFromX}
          y={CHART.pad.top}
          width={throughputChart.windowToX - throughputChart.windowFromX}
          height={throughputChart.plotH}
          fill="var(--color-err)"
          opacity={0.08}
        />
        <text
          x={(throughputChart.windowFromX + throughputChart.windowToX) / 2}
          y={CHART.pad.top + 12}
          textAnchor="middle"
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          documented TE failure
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const gy = throughputChart.y(p);
          return (
            <g key={p}>
              <line
                x1={CHART.pad.left}
                x2={CHART.pad.left + throughputChart.plotW}
                y1={gy}
                y2={gy}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={CHART.pad.left - 8}
                y={gy + 4}
                textAnchor="end"
                fill="var(--color-text-dim)"
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {Math.round(p * 100)}%
              </text>
            </g>
          );
        })}
        {[0, 50, 100, 150, 200, 240].map((d) => (
          <text
            key={d}
            x={throughputChart.x(d)}
            y={CHART.height - 8}
            textAnchor={d === MAX_DELAY_MS ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {d}
          </text>
        ))}
        <text
          x={CHART.pad.left + throughputChart.plotW}
          y={CHART.height - 8 + 14}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          injected delay (ms)
        </text>
        <line
          x1={CHART.pad.left}
          x2={CHART.pad.left + throughputChart.plotW}
          y1={CHART.pad.top + throughputChart.plotH}
          y2={CHART.pad.top + throughputChart.plotH}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <path
          d={throughputChart.rtcPath}
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth={2}
        />
        <path
          d={throughputChart.tePath}
          fill="none"
          stroke="var(--color-err)"
          strokeWidth={2}
        />
        {/* Current-delay marker. */}
        <line
          x1={throughputChart.markerX}
          x2={throughputChart.markerX}
          y1={CHART.pad.top}
          y2={CHART.pad.top + throughputChart.plotH}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle
          cx={throughputChart.markerX}
          cy={throughputChart.teMarkerY}
          r={4}
          fill="var(--color-bg)"
          stroke="var(--color-err)"
          strokeWidth={2}
        />
        <circle
          cx={throughputChart.markerX}
          cy={throughputChart.rtcMarkerY}
          r={4}
          fill="var(--color-bg)"
          stroke="var(--color-ok)"
          strokeWidth={2}
        />
        {/* Legend. */}
        <g fontSize={11} fontFamily="var(--font-mono)">
          <line
            x1={CHART.pad.left + 4}
            x2={CHART.pad.left + 22}
            y1={CHART.pad.top + 26}
            y2={CHART.pad.top + 26}
            stroke="var(--color-err)"
            strokeWidth={2}
          />
          <text
            x={CHART.pad.left + 28}
            y={CHART.pad.top + 30}
            fill="var(--color-text)"
          >
            temporal ensembling
          </text>
          <line
            x1={CHART.pad.left + 4}
            x2={CHART.pad.left + 22}
            y1={CHART.pad.top + 44}
            y2={CHART.pad.top + 44}
            stroke="var(--color-ok)"
            strokeWidth={2}
          />
          <text
            x={CHART.pad.left + 28}
            y={CHART.pad.top + 48}
            fill="var(--color-text)"
          >
            real-time chunking
          </text>
        </g>
      </svg>

      <ChartDescription
        id={`${delayId}-throughput-description`}
        className="mt-3"
        form="table"
        summary="Sampled throughput for both schemes by injected delay"
        rowHeader="delay (ms)"
        columns={[
          { header: 'ensembling', numeric: true },
          { header: 'chunking', numeric: true },
          { header: 'ensembling status', numeric: false },
          { header: 'playhead', numeric: false },
        ]}
        rows={throughputChart.sampleRows}
        description={throughputDescription}
      />

      {/* Panel 2: executed action across one chunk hand-off. */}
      <svg
        viewBox={`0 0 ${TRACE.width} ${TRACE.height}`}
        role="img"
        aria-label={`Trace of the executed action across a chunk hand-off at ${formatMs(delayMs)} delay. The temporal ensembling trace ${offMode ? 'leaves both valid modes' : 'stays on the committed mode'}; the real-time chunking trace stays flat on the committed mode.`}
        aria-describedby={`${delayId}-trace-description`}
        className="mt-2 block w-full"
      >
        {/* Invalid middle band: between the two valid modes. */}
        <rect
          x={TRACE.pad.left}
          y={traceChart.floorY}
          width={traceChart.plotW}
          height={traceChart.negFloorY - traceChart.floorY}
          fill="var(--color-err)"
          opacity={0.07}
        />
        <text
          x={TRACE.pad.left + 6}
          y={(traceChart.floorY + traceChart.negFloorY) / 2 + 4}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          no valid mode
        </text>
        {/* Valid mode guides. */}
        <line
          x1={TRACE.pad.left}
          x2={TRACE.pad.left + traceChart.plotW}
          y1={traceChart.modeY}
          y2={traceChart.modeY}
          stroke="var(--color-text-dim)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <line
          x1={TRACE.pad.left}
          x2={TRACE.pad.left + traceChart.plotW}
          y1={traceChart.negModeY}
          y2={traceChart.negModeY}
          stroke="var(--color-text-dim)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <text
          x={TRACE.pad.left - 8}
          y={traceChart.modeY + 4}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          left
        </text>
        <text
          x={TRACE.pad.left - 8}
          y={traceChart.negModeY + 4}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          right
        </text>
        {/* Hand-off instant. */}
        <line
          x1={traceChart.handoffX}
          x2={traceChart.handoffX}
          y1={TRACE.pad.top}
          y2={TRACE.pad.top + traceChart.plotH}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={traceChart.handoffX + 5}
          y={TRACE.pad.top + 12}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          new chunk arrives
        </text>
        <line
          x1={TRACE.pad.left}
          x2={TRACE.pad.left + traceChart.plotW}
          y1={TRACE.pad.top + traceChart.plotH}
          y2={TRACE.pad.top + traceChart.plotH}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {[0, 8, 16, 23].map((tick) => (
          <text
            key={tick}
            x={traceChart.x(tick)}
            y={TRACE.height - 8}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {tick}
          </text>
        ))}
        <text
          x={TRACE.pad.left + traceChart.plotW}
          y={TRACE.height - 8 + 14}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          controller tick
        </text>
        <path
          d={traceChart.rtcPath}
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth={2}
        />
        <path
          d={traceChart.tePath}
          fill="none"
          stroke="var(--color-err)"
          strokeWidth={2}
        />
        {offMode && (
          <g data-testid="te-offmode-marker">
            <circle
              cx={traceChart.teEnd.cx}
              cy={traceChart.teEnd.cy}
              r={4.5}
              fill="var(--color-err)"
            />
            <text
              x={traceChart.teEnd.cx - 8}
              y={traceChart.teEnd.cy + 4}
              textAnchor="end"
              fill="var(--color-err)"
              fontSize={11}
              fontFamily="var(--font-mono)"
            >
              off-mode
            </text>
          </g>
        )}
      </svg>

      <ChartDescription
        id={`${delayId}-trace-description`}
        className="mt-3"
        form="table"
        summary="Sampled executed action across the hand-off"
        rowHeader="tick"
        columns={[
          { header: 'ensembling', numeric: true },
          { header: 'chunking', numeric: true },
          { header: 'ensembling validity', numeric: false },
        ]}
        rows={traceChart.sampleRows}
        description={traceDescription}
      />

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">d = {formatMs(delayMs)}:</span>{' '}
        <span className="text-text-dim">temporal ensembling</span>{' '}
        <span data-testid="te-throughput-readout" className="text-accent">
          {Math.round(te * 100)}%
        </span>{' '}
        <span data-testid="te-status-readout" className={STATUS_COLOR[status]}>
          {status}
        </span>
        <span className="text-text-dim">, real-time chunking</span>{' '}
        <span data-testid="rtc-throughput-readout" className="text-accent">
          {Math.round(rtc * 100)}%
        </span>{' '}
        <span className="text-ok">holding</span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        The curves are a qualitative model of the published results
        (arXiv:2506.07339): temporal ensembling fails outright at +100 ms and
        +200 ms of injected delay because the weighted average of disagreeing
        chunks lands between modes, while real-time chunking holds throughput
        flat to +200 ms. They are not a re-run of the experiment.
      </p>
    </div>
  );
}
