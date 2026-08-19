'use client';

import { useId, useMemo, useState } from 'react';
import { compoundingCurve, compoundedSuccessRate } from '@/lib/reliability';
import { ChartDescription } from '@/components/ui/chart-description';
import { cx } from '@/lib/utils';

/**
 * ReliabilityCompounding: the compounding cost of per-step error.
 *
 * Two sliders (per-step success probability, episode length) drive an SVG
 * trace of P(episode success) = p^n, with a live monospace readout. Honors
 * the interactive contract: typed props, deterministic render, visible
 * numeric readout, reset control, keyboard-accessible native sliders, no
 * layout shift (fixed-height chart), no auto-playing motion.
 *
 * Featured on the home page; reusable by the evaluation-crisis and
 * reliability-gap modules with different defaults.
 */
type ReliabilityCompoundingProps = {
  /** Initial per-step success probability in [0, 1]. Default 0.95. */
  defaultPerStep?: number;
  /** Initial episode length in steps. Default 30. */
  defaultSteps?: number;
  /** Longest episode the chart draws. Default 100. */
  maxSteps?: number;
  /**
   * Lowest selectable per-step success, in percent. Default 50; the
   * evaluation-crisis module passes 0 so the 0% boundary is reachable.
   */
  minPerStepPercent?: number;
  /**
   * Highest selectable per-step success, in percent. Default 99.9; the
   * evaluation-crisis module passes 100 so perfect reliability is reachable.
   */
  maxPerStepPercent?: number;
  className?: string;
};

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 14, right: 18, bottom: 30, left: 48 };

const DEFAULT_MIN_PER_STEP_PERCENT = 50;
const DEFAULT_MAX_PER_STEP_PERCENT = 99.9;

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function ReliabilityCompounding({
  defaultPerStep = 0.95,
  defaultSteps = 30,
  maxSteps = 100,
  minPerStepPercent = DEFAULT_MIN_PER_STEP_PERCENT,
  maxPerStepPercent = DEFAULT_MAX_PER_STEP_PERCENT,
  className,
}: ReliabilityCompoundingProps) {
  // useId-derived input ids: this component legitimately renders twice on
  // one page (a standalone mount plus a wrapped prediction figure), and a
  // hardcoded id would duplicate and cross-bind the labels.
  const uid = useId();
  const perStepId = `${uid}-rc-per-step`;
  const stepsId = `${uid}-rc-steps`;
  const descriptionId = `${uid}-rc-description`;
  const [perStepPercent, setPerStepPercent] = useState(defaultPerStep * 100);
  const [steps, setSteps] = useState(defaultSteps);

  const perStep = perStepPercent / 100;
  const episodeSuccess = compoundedSuccessRate(perStep, steps);

  const { path, marker, sampleRows } = useMemo(() => {
    const curve = compoundingCurve(perStep, maxSteps);
    const x = (n: number) =>
      PAD.left + (n / maxSteps) * (WIDTH - PAD.left - PAD.right);
    const y = (p: number) =>
      HEIGHT - PAD.bottom - p * (HEIGHT - PAD.top - PAD.bottom);
    const d = curve
      .map((p, n) => `${n === 0 ? 'M' : 'L'}${x(n).toFixed(2)},${y(p).toFixed(2)}`)
      .join(' ');
    // The sampled table is derived from the same curve the path is drawn
    // from, so the two can never disagree (VAL-EDU-023) and the sample
    // moves with the per-step control (VAL-EDU-024).
    const sample = [0, 10, 25, 50, 75, maxSteps].map((n) => ({
      label: `${n} step${n === 1 ? '' : 's'}`,
      values: [
        `${(compoundedSuccessRate(perStep, n) * 100).toFixed(1)}%`,
      ],
    }));
    return {
      path: d,
      marker: { cx: x(steps), cy: y(compoundedSuccessRate(perStep, steps)) },
      sampleRows: sample,
    };
  }, [perStep, steps, maxSteps]);

  const successPct = formatPercent(episodeSuccess);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  function reset() {
    setPerStepPercent(defaultPerStep * 100);
    setSteps(defaultSteps);
  }

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
            htmlFor={perStepId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Per-step success
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {perStepPercent.toFixed(1)}%
            </span>
          </label>
          <input
            id={perStepId}
            type="range"
            min={minPerStepPercent}
            max={maxPerStepPercent}
            step={0.1}
            value={perStepPercent}
            onChange={(e) => setPerStepPercent(Number(e.target.value))}
            aria-label={`Per-step success probability in percent, currently ${perStepPercent.toFixed(1)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor={stepsId}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Episode length
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {steps} steps
            </span>
          </label>
          <input
            id={stepsId}
            type="range"
            min={1}
            max={maxSteps}
            step={1}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            aria-label={`Episode length in steps, currently ${steps}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Line chart of episode success against episode length at ${perStepPercent.toFixed(1)} percent per-step success`}
        aria-describedby={descriptionId}
        className="mt-4 block w-full"
      >
        {/* Horizontal gridlines at 25/50/75% with axis labels. */}
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = PAD.top + (1 - p) * plotHeight;
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
        {/* X axis labels. */}
        {[0, maxSteps / 2, maxSteps].map((n) => (
          <text
            key={n}
            x={PAD.left + (n / maxSteps) * plotWidth}
            y={HEIGHT - 8}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {n}
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
          steps
        </text>
        {/* Baseline and the compounding trace. */}
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
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
        <span className="text-text-dim">
          ({perStep.toFixed(3)})^{steps} =
        </span>{' '}
        <span data-testid="episode-success-readout" className="text-accent">
          {formatPercent(episodeSuccess)}
        </span>{' '}
        <span className="text-text-dim">episode success</span>
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Sampled episode success by episode length"
        rowHeader="episode length"
        columns={[{ header: 'episode success', numeric: true }]}
        rows={sampleRows}
        description={
          <>
            At {perStepPercent.toFixed(1)} percent per-step success, episode
            success is {successPct} at {steps} steps and{' '}
            {formatPercent(compoundedSuccessRate(perStep, maxSteps))} at the{' '}
            {maxSteps}-step end of the plotted range, crossing 50 percent at{' '}
            {Math.max(1, Math.round(Math.log(0.5) / Math.log(perStep)))} steps as
            the per-step odds compound over the episode length.
          </>
        }
      />
    </div>
  );
}
