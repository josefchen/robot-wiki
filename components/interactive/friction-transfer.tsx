'use client';

import { useRef, useState } from 'react';
import {
  DEFAULT_DR_RANGE,
  DEFAULT_REAL_MU,
  DR_RANGE_MAX,
  DR_RANGE_MIN,
  MU_MAX,
  MU_MIN,
  MU_TRAIN,
  POINT_PEAK,
  drCurvePoints,
  drPeak,
  drSuccess,
  formatMu,
  formatPct,
  pointCurvePoints,
  pointSuccess,
} from '@/lib/sim2real';
import { cx } from '@/lib/utils';

/**
 * FrictionTransfer: task success against ground friction for two policies,
 * one trained at a single friction (tall narrow spike) and one trained over a
 * uniform friction distribution (lower, wider plateau). A vertical "real
 * robot" line marks the hardware's actual friction and drives both success
 * readouts; a second slider widens the randomization range, which widens the
 * plateau and sinks its peak (the over-randomization cost).
 *
 * The curves are an illustrative model, labeled as such in the surrounding
 * prose; the shape relationship (spike beats plateau at the training point,
 * plateau wins away from it, wider range means lower peak) is the teaching
 * content.
 *
 * Interactive contract: deterministic initial render, native range inputs
 * (keyboard-accessible) plus pointer drag on the real-robot line, visible
 * monospace readouts, reset control, fixed SVG viewport (no layout shift),
 * no JS-driven motion (scrub-only, so reduced-motion safe by construction).
 */

const WIDTH = 640;
const HEIGHT = 340;
const PLOT = { left: 56, right: 624, top: 20, bottom: 296 } as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(mu: number): number {
  const t = (mu - MU_MIN) / (MU_MAX - MU_MIN);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yFor(success: number): number {
  return f(PLOT.bottom - success * (PLOT.bottom - PLOT.top));
}

const X_TICKS = [0.2, 0.5, 0.8, 1.1, 1.5] as const;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

const POINT_POINTS = pointCurvePoints();

function polyline(points: Array<{ mu: number; success: number }>): string {
  return points.map((p) => `${xFor(p.mu)},${yFor(p.success)}`).join(' ');
}

export function FrictionTransfer({
  defaultRealMu = DEFAULT_REAL_MU,
  defaultRange = DEFAULT_DR_RANGE,
  className,
}: {
  defaultRealMu?: number;
  defaultRange?: number;
  className?: string;
}) {
  const [realMu, setRealMu] = useState(defaultRealMu);
  const [range, setRange] = useState(defaultRange);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const point = pointSuccess(realMu);
  const dr = drSuccess(realMu, range);
  const drPeakValue = drPeak(range);
  const deltaPts = Math.round((dr - point) * 100);
  const insideBand = Math.abs(realMu - MU_TRAIN) <= range;

  function muFromPointer(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return realMu;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const t = (x - PLOT.left) / (PLOT.right - PLOT.left);
    const mu = MU_MIN + t * (MU_MAX - MU_MIN);
    return Math.min(MU_MAX, Math.max(MU_MIN, Number(mu.toFixed(2))));
  }

  function reset() {
    setRealMu(defaultRealMu);
    setRange(defaultRange);
  }

  const lineX = xFor(realMu);
  const labelAnchor = lineX > WIDTH - 150 ? 'end' : 'start';
  const labelX = labelAnchor === 'end' ? f(lineX - 8) : f(lineX + 8);

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="ft-real-mu"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Real robot mu
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatMu(realMu)}
            </span>
          </label>
          <input
            id="ft-real-mu"
            type="range"
            min={Math.round(MU_MIN * 100)}
            max={Math.round(MU_MAX * 100)}
            step={1}
            value={Math.round(realMu * 100)}
            onChange={(e) => setRealMu(Number(e.target.value) / 100)}
            aria-label={`Real robot friction, currently ${formatMu(realMu)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor="ft-range"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            DR half-width
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              +/- {formatMu(range)}
            </span>
          </label>
          <input
            id="ft-range"
            type="range"
            min={Math.round(DR_RANGE_MIN * 100)}
            max={Math.round(DR_RANGE_MAX * 100)}
            step={5}
            value={Math.round(range * 100)}
            onChange={(e) => setRange(Number(e.target.value) / 100)}
            aria-label={`Randomization half-width, currently plus or minus ${formatMu(range)}`}
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

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          real mu:{' '}
          <span data-testid="real-mu-readout" className="text-text">
            {formatMu(realMu)}
          </span>
        </span>
        <span className="text-text-dim">
          point policy:{' '}
          <span data-testid="point-readout" className="text-text">
            {formatPct(point)}
          </span>
        </span>
        <span className="text-text-dim">
          DR policy:{' '}
          <span data-testid="dr-readout" className="text-accent">
            {formatPct(dr)}
          </span>
        </span>
        <span className="text-text-dim">
          edge:{' '}
          <span data-testid="delta-readout" className="text-text">
            {deltaPts >= 0
              ? `DR +${deltaPts} pts`
              : `point +${-deltaPts} pts`}
          </span>
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Task success against ground friction. The point-trained policy peaks at ${formatPct(POINT_PEAK)} at its training friction ${formatMu(MU_TRAIN)} and falls off sharply; the distribution-trained policy holds a plateau near ${formatPct(drPeakValue)} over its randomization range. The real robot line sits at mu ${formatMu(realMu)}, where the point policy scores ${formatPct(point)} and the DR policy ${formatPct(dr)}.`}
        className="mt-3 block w-full"
        onPointerMove={(e) => {
          if (dragging) setRealMu(muFromPointer(e.clientX));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <text
          x={PLOT.left}
          y={12}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          task success
        </text>
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 8}
              y={f(yFor(t) + 3)}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {X_TICKS.map((mu) => (
          <g key={mu}>
            <line
              x1={xFor(mu)}
              x2={xFor(mu)}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={xFor(mu)}
              y={f(PLOT.bottom + 14)}
              textAnchor={mu === MU_MAX ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {formatMu(mu)}
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
          ground friction coefficient mu
        </text>

        {/* DR training distribution band. */}
        <g data-testid="dr-band">
          <rect
            x={xFor(MU_TRAIN - range)}
            y={PLOT.top}
            width={f(xFor(MU_TRAIN + range) - xFor(MU_TRAIN - range))}
            height={PLOT.bottom - PLOT.top}
            fill="var(--color-accent)"
            opacity={0.07}
          />
          <line
            x1={xFor(MU_TRAIN - range)}
            x2={xFor(MU_TRAIN - range)}
            y1={PLOT.top}
            y2={PLOT.bottom}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.4}
          />
          <line
            x1={xFor(MU_TRAIN + range)}
            x2={xFor(MU_TRAIN + range)}
            y1={PLOT.top}
            y2={PLOT.bottom}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.4}
          />
          <text
            x={f(xFor(MU_TRAIN + range) - 6)}
            y={f(PLOT.bottom - 8)}
            textAnchor="end"
            fill="var(--color-accent)"
            fontSize={10}
            fontFamily="var(--font-mono)"
            opacity={0.8}
          >
            training distribution
          </text>
        </g>

        {/* Policy curves. */}
        <polyline
          data-testid="point-curve"
          points={polyline(POINT_POINTS)}
          fill="none"
          stroke="var(--color-text-dim)"
          strokeWidth={2}
        />
        <polyline
          data-testid="dr-curve"
          points={polyline(drCurvePoints(range))}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />

        {/* Peak annotations. */}
        <text
          x={f(xFor(MU_TRAIN) + 10)}
          y={f(yFor(POINT_PEAK) + 4)}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          point peak {formatPct(POINT_PEAK)}
        </text>
        <text
          data-testid="dr-peak-label"
          x={f(xFor(MU_TRAIN - range) + 6)}
          y={f(yFor(drPeakValue) - 8)}
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          DR plateau {formatPct(drPeakValue)}
        </text>

        {/* Real-robot line, draggable. */}
        <g data-testid="real-line">
          <line
            x1={lineX}
            x2={lineX}
            y1={PLOT.top}
            y2={PLOT.bottom}
            stroke="var(--color-text)"
            strokeWidth={1.5}
          />
          <path
            d={`M ${lineX},${PLOT.top - 6} L ${f(lineX + 5)},${PLOT.top + 2} L ${f(lineX - 5)},${PLOT.top + 2} Z`}
            fill="var(--color-text)"
          />
          <text
            x={labelX}
            y={f(PLOT.bottom - 24)}
            textAnchor={labelAnchor}
            fill="var(--color-text)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            real robot
          </text>
          {/* Fat invisible hit area for pointer drag. */}
          <rect
            x={f(lineX - 12)}
            y={PLOT.top - 6}
            width={24}
            height={PLOT.bottom - PLOT.top + 6}
            fill="transparent"
            style={{ cursor: 'ew-resize', touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              setRealMu(muFromPointer(e.clientX));
            }}
          />
        </g>

        {/* Success markers where the line crosses each curve. */}
        <circle
          data-testid="point-marker"
          cx={lineX}
          cy={yFor(point)}
          r={4}
          fill="var(--color-text-dim)"
          stroke="var(--color-bg)"
          strokeWidth={1.5}
        />
        <circle
          data-testid="dr-marker"
          cx={lineX}
          cy={yFor(dr)}
          r={4.5}
          fill="var(--color-accent)"
          stroke="var(--color-bg)"
          strokeWidth={1.5}
        />
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[1px]"
            style={{ background: 'var(--color-text-dim)' }}
          />
          trained at mu = {formatMu(MU_TRAIN)} only
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[1px]"
            style={{ background: 'var(--color-accent)' }}
          />
          trained over uniform mu in [{formatMu(MU_TRAIN - range)},{' '}
          {formatMu(MU_TRAIN + range)}]
        </span>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">real mu {formatMu(realMu)}:</span>{' '}
        <span className="text-text">point {formatPct(point)}</span>{' '}
        <span className="text-text-dim">vs</span>{' '}
        <span className="text-accent">DR {formatPct(dr)}</span>
      </p>
      <p
        data-testid="ft-explanation"
        className="mt-2 font-sans text-xs leading-relaxed text-text-dim"
      >
        {insideBand
          ? 'The real robot sits inside the training distribution, where the point-trained policy wins: specializing at one friction bought it a higher peak than any robust policy reaches. Move the line outside the shaded band and the ranking flips.'
          : 'The real robot sits outside the point policy\'s narrow spike, so its success collapses while the distribution-trained policy still covers this friction. That wider basin is what domain randomization buys; the lower plateau is what it costs.'}
      </p>
    </div>
  );
}
