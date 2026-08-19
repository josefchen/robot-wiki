'use client';

import { useId, useState } from 'react';
import { Badge } from '@/components/ui';
import {
  CONTROL_PERIOD_MS,
  LATENCY_REFERENCES,
  MAX_PARAMS_B,
  MIN_PARAMS_B,
  PI0L_ANCHOR,
  PI0_ANCHOR,
  effectiveHz,
  inferenceMsOnThor,
  loopCloses,
  missedTicks,
} from '@/lib/control-loop';
import { cx } from '@/lib/utils';

/**
 * ControlLoopBudget: does the 50 Hz control loop close for a VLA of a
 * given size on on-robot hardware?
 *
 * A model-size slider (0.5B to 9.1B parameters) drives a modeled inference
 * latency on Jetson Thor, anchored to the two VLA-Perf measurements
 * (pi0 ~3B at 52.57 ms / 19.0 Hz, pi0-L 9.1B at 3.9 Hz; arXiv:2602.18397).
 * The timeline shows one inference against the 20 ms control period: under
 * the budget the loop closes, over it the loop misses deadlines and runs at
 * the effective rate. A reference list pins the other sourced latency
 * figures (pi0.6 on H100, the RTC measured totals, pi0.7's tolerance).
 *
 * Interactive contract: deterministic render, native range slider
 * (keyboard arrows step the model size), visible monospace readouts, reset
 * control, fixed-height chart (no layout shift), no auto-playing motion.
 */

const WINDOW_MS = 280;
const CHART = {
  width: 640,
  height: 150,
  pad: { top: 26, right: 14, bottom: 28, left: 44 },
};

const DEFAULT_PARAMS_B = PI0_ANCHOR.paramsB;

type ControlLoopBudgetProps = {
  /**
   * Initial model size in billions of parameters. Defaults to the pi0
   * anchor (3.0B). A prediction step mounts the figure at the size that
   * answers its prompt; existing mounts pass nothing and are unchanged.
   */
  defaultParamsB?: number;
  className?: string;
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

/** Reference figures: whole ms when the source value is whole. */
function formatRefMs(ms: number): string {
  return Number.isInteger(ms) ? `${ms} ms` : formatMs(ms);
}

export function ControlLoopBudget({
  defaultParamsB = DEFAULT_PARAMS_B,
  className,
}: ControlLoopBudgetProps) {
  // useId-derived input id: this component legitimately renders twice on
  // one page (a standalone mount plus a wrapped prediction figure), and a
  // hardcoded id would duplicate and cross-bind the label.
  const modelSizeId = `${useId()}-clb-model-size`;
  const [paramsB, setParamsB] = useState<number>(defaultParamsB);
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultParamsB, setPrevDefaultParamsB] = useState(defaultParamsB);
  if (defaultParamsB !== prevDefaultParamsB) {
    setPrevDefaultParamsB(defaultParamsB);
    setParamsB(defaultParamsB);
  }

  const inferenceMs = inferenceMsOnThor(paramsB);
  const closes = loopCloses(inferenceMs);
  const missed = missedTicks(inferenceMs);
  const hz = effectiveHz(inferenceMs);

  const plotW = CHART.width - CHART.pad.left - CHART.pad.right;
  const x = (ms: number) => f(CHART.pad.left + (ms / WINDOW_MS) * plotW);
  const barY = CHART.pad.top + 34;
  const barH = 26;
  const budgetX = x(CONTROL_PERIOD_MS);
  const barW = Math.max(2, x(Math.min(inferenceMs, WINDOW_MS)) - CHART.pad.left);
  const overflowMs = Math.max(0, inferenceMs - WINDOW_MS);

  function reset() {
    setParamsB(defaultParamsB);
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
            htmlFor={modelSizeId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Model size
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              <span data-testid="params-readout">
                {paramsB.toFixed(1)}B params
              </span>
              {'  '}
              <span data-testid="latency-readout" className="text-accent">
                {formatMs(inferenceMs)}
              </span>
            </span>
          </label>
          <input
            id={modelSizeId}
            type="range"
            min={MIN_PARAMS_B}
            max={MAX_PARAMS_B}
            step={0.1}
            value={paramsB}
            onChange={(e) => setParamsB(Number(e.target.value))}
            aria-label={`Model size in billions of parameters, currently ${paramsB.toFixed(1)}`}
            aria-valuetext={`${paramsB.toFixed(1)} billion parameters`}
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

      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label={`Control-loop timeline. One inference of ${formatMs(inferenceMs)} for a ${paramsB.toFixed(1)} billion parameter model against the 20 millisecond budget of a 50 hertz loop. The loop ${closes ? 'closes' : 'does not close'} at this size.`}
        className="mt-4 block w-full"
      >
        {/* Tick gridlines, one per 20 ms control period. */}
        {Array.from({ length: WINDOW_MS / CONTROL_PERIOD_MS + 1 }, (_, i) => {
          const ms = i * CONTROL_PERIOD_MS;
          return (
            <g key={ms}>
              <line
                x1={x(ms)}
                x2={x(ms)}
                y1={CHART.pad.top}
                y2={CHART.height - CHART.pad.bottom}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              {i % 2 === 0 && (
                <text
                  x={x(ms)}
                  y={CHART.height - 8}
                  textAnchor={ms === 0 ? 'start' : ms === WINDOW_MS ? 'end' : 'middle'}
                  fill="var(--color-text-dim)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  {ms}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={CHART.width - CHART.pad.right}
          y={CHART.height + 4 - 12}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          time (ms)
        </text>

        {/* The 20 ms budget line. */}
        <line
          x1={budgetX}
          x2={budgetX}
          y1={CHART.pad.top}
          y2={CHART.height - CHART.pad.bottom}
          stroke="var(--color-err)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <text
          data-testid="budget-line-label"
          x={budgetX + 5}
          y={CHART.pad.top + 10}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          20 ms budget (50 Hz)
        </text>

        {/* Measured anchors. */}
        {[PI0_ANCHOR, PI0L_ANCHOR].map((anchor) => (
          <g key={anchor.paramsB}>
            <line
              x1={x(anchor.inferenceMs)}
              x2={x(anchor.inferenceMs)}
              y1={CHART.pad.top + 16}
              y2={barY + barH + 10}
              stroke="var(--color-text-dim)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <text
              x={x(anchor.inferenceMs)}
              y={barY + barH + 22}
              textAnchor={anchor === PI0L_ANCHOR ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              {anchor === PI0_ANCHOR ? 'pi0 3B measured' : 'pi0-L 9.1B measured'}
            </text>
          </g>
        ))}

        {/* The inference bar. */}
        <rect
          data-testid="inference-bar"
          x={CHART.pad.left}
          y={barY}
          width={f(barW)}
          height={barH}
          fill={closes ? 'var(--color-ok)' : 'var(--color-err)'}
          opacity={0.22}
        />
        <rect
          x={CHART.pad.left}
          y={barY}
          width={f(barW)}
          height={barH}
          fill="none"
          stroke={closes ? 'var(--color-ok)' : 'var(--color-err)'}
          strokeWidth={1.5}
        />
        {overflowMs > 0 && (
          <text
            x={CHART.width - CHART.pad.right - 4}
            y={barY + barH / 2 + 3}
            textAnchor="end"
            fill="var(--color-err)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            +{Math.round(overflowMs)} ms
          </text>
        )}

        {/* Lane label. */}
        <text
          x={CHART.pad.left - 8}
          y={barY + barH / 2 + 3}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          inference
        </text>
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span data-testid="verdict-readout" className={closes ? 'text-ok' : 'text-err'}>
          {closes ? 'closes at 50 Hz' : 'does not close at 50 Hz'}
        </span>
        <span className="text-text-dim">: </span>
        <span data-testid="hz-readout" className="text-accent">
          {Math.round(hz)} Hz
        </span>
        <span className="text-text-dim"> effective, </span>
        <span data-testid="missed-readout" className="text-accent">
          {missed}
        </span>
        <span className="text-text-dim">
          {' '}
          {missed === 1 ? 'deadline' : 'deadlines'} missed
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Anchors are the VLA-Perf measurements on Jetson Thor
        (arXiv:2602.18397): pi0 at 52.6 ms (19 Hz) and pi0-L at 3.9 Hz. The
        scaling between and below them is an illustrative memory-bound
        model, not a measurement.
      </p>

      <ul className="mt-4 divide-y divide-border border-t border-border">
        {LATENCY_REFERENCES.map((ref) => {
          const refCloses = loopCloses(ref.ms);
          return (
            <li
              key={ref.id}
              data-testid={`ref-${ref.id}`}
              className="flex flex-wrap items-baseline gap-x-3 py-2"
            >
              <span className="font-mono text-xs text-text">{ref.label}</span>
              <span className="font-mono text-xs text-accent">
                {formatRefMs(ref.ms)}
              </span>
              <span className="font-mono text-[10px] text-text-dim">
                {ref.detail}
              </span>
              <span className="ml-auto">
                {ref.absorbed ? (
                  <Badge variant="warn">tolerated by design</Badge>
                ) : refCloses ? (
                  <Badge variant="ok">closes at 50 Hz</Badge>
                ) : (
                  <Badge variant="err">over budget</Badge>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
