'use client';

import { useMemo, useState } from 'react';
import {
  ACT_CHUNK_ANCHORS,
  MAX_CHUNK,
  MIN_CHUNK,
  decisionsPerEpisode,
  successAtChunkSize,
} from '@/lib/chunk-size';
import { cx } from '@/lib/utils';

/**
 * ChunkSizeCurve: the ACT chunk-size ablation as a live dial.
 *
 * One slider (k = 1..400) moves along the success-rate curve. The two
 * measured anchors (1% at k=1, 44% at k=100) are drawn as solid points;
 * the region past k=100 is dashed because the paper reports only a slight,
 * unquantified taper there. A second readout shows closed-loop decisions
 * per episode (episode length / k), the quantity chunking actually shrinks.
 *
 * Interactive contract: deterministic initial render, visible monospace
 * readouts, reset control, native keyboard-accessible slider with an
 * aria-label, fixed-height chart (no layout shift), no auto-playing motion.
 */
type ChunkSizeCurveProps = {
  /** Initial chunk size. Default 100 (the published ACT configuration). */
  defaultChunkSize?: number;
  /** Episode length in control steps for the decisions readout. Default 400 (8 s at 50 Hz). */
  episodeSteps?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 14, right: 18, bottom: 30, left: 48 };

/** Y axis tops out at 50% so the 44% peak uses most of the plot. */
const MAX_SUCCESS = 0.5;

function formatPercent(value: number): string {
  const percent = value * 100;
  const needsDecimal = percent < 10 && !Number.isInteger(percent);
  return `${percent.toFixed(needsDecimal ? 1 : 0)}%`;
}

export function ChunkSizeCurve({
  defaultChunkSize = 100,
  episodeSteps = 400,
  className,
}: ChunkSizeCurveProps) {
  const [chunkSize, setChunkSize] = useState(defaultChunkSize);

  const success = successAtChunkSize(chunkSize);
  const decisions = decisionsPerEpisode(episodeSteps, chunkSize);
  const peakK = ACT_CHUNK_ANCHORS.at(-1)?.k ?? 100;

  const { risePath, taperPath, marker, anchors } = useMemo(() => {
    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const x = (k: number) =>
      PAD.left + ((k - MIN_CHUNK) / (MAX_CHUNK - MIN_CHUNK)) * plotWidth;
    const y = (p: number) =>
      HEIGHT - PAD.bottom - (p / MAX_SUCCESS) * plotHeight;

    const rise: string[] = [];
    for (let k = MIN_CHUNK; k <= peakK; k += 1) {
      rise.push(
        `${k === MIN_CHUNK ? 'M' : 'L'}${x(k).toFixed(2)},${y(successAtChunkSize(k)).toFixed(2)}`,
      );
    }
    const taper: string[] = [
      `M${x(peakK).toFixed(2)},${y(successAtChunkSize(peakK)).toFixed(2)}`,
    ];
    for (let k = peakK + 5; k <= MAX_CHUNK; k += 5) {
      taper.push(`L${x(k).toFixed(2)},${y(successAtChunkSize(k)).toFixed(2)}`);
    }
    return {
      risePath: rise.join(' '),
      taperPath: taper.join(' '),
      marker: { cx: x(chunkSize), cy: y(success) },
      anchors: ACT_CHUNK_ANCHORS.map((a) => ({
        ...a,
        cx: x(a.k),
        cy: y(a.success),
      })),
    };
  }, [chunkSize, success, peakK]);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  function reset() {
    setChunkSize(defaultChunkSize);
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
            htmlFor="csc-chunk-size"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Chunk size
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              k = {chunkSize}
            </span>
          </label>
          <input
            id="csc-chunk-size"
            type="range"
            min={MIN_CHUNK}
            max={MAX_CHUNK}
            step={1}
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            aria-label={`Chunk size k, currently ${chunkSize}`}
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
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Line chart of task success rate against chunk size k. Success rises to 44 percent at k of 100, then tapers. Current position k equals ${chunkSize}, success ${formatPercent(success)}.`}
        className="mt-4 block w-full"
      >
        {[0.1, 0.2, 0.3, 0.4, 0.5].map((p) => {
          const y = PAD.top + (1 - p / MAX_SUCCESS) * plotHeight;
          return (
            <g key={p}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
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
        {[1, 100, 200, 300, 400].map((k) => (
          <text
            key={k}
            x={
              PAD.left + ((k - MIN_CHUNK) / (MAX_CHUNK - MIN_CHUNK)) * plotWidth
            }
            y={HEIGHT - 8}
            textAnchor={k === MAX_CHUNK ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {k}
          </text>
        ))}
        <text
          x={PAD.left + plotWidth}
          y={HEIGHT - 8 + 14}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          chunk size k
        </text>
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {/* Measured rise (solid) and illustrative taper (dashed). */}
        <path
          d={risePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        <path
          d={taperPath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="5 4"
          opacity={0.65}
        />
        {anchors.map((a) => (
          <g key={a.k}>
            <circle cx={a.cx} cy={a.cy} r={3.5} fill="var(--color-accent)" />
            <text
              x={a.cx}
              y={a.cy - 10}
              textAnchor="middle"
              fill="var(--color-text)"
              fontSize={11}
              fontFamily="var(--font-mono)"
            >
              {formatPercent(a.success)}
            </text>
          </g>
        ))}
        <circle
          cx={marker.cx}
          cy={marker.cy}
          r={4.5}
          fill="var(--color-bg)"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">k = {chunkSize}:</span>{' '}
        <span data-testid="chunk-success-readout" className="text-accent">
          {formatPercent(success)}
        </span>{' '}
        <span className="text-text-dim">success,</span>{' '}
        <span data-testid="chunk-decisions-readout" className="text-accent">
          {decisions}
        </span>{' '}
        <span className="text-text-dim">
          {decisions === 1 ? 'decision' : 'decisions'} per {episodeSteps}-step
          episode
        </span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Solid points are the measured ACT ablation values (1% at k=1, 44% at
        k=100). The dashed region past k=100 is interpolated: the paper reports
        a slight decline at k=200 and k=400 without exact numbers.
      </p>
    </div>
  );
}
