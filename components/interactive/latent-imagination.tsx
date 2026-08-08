'use client';

import { useMemo, useState } from 'react';
import {
  MAX_HORIZON,
  TYPICAL_HORIZON,
  deviationAt,
  imagineDeviation,
  rewardPredictionError,
  trueLatent,
} from '@/lib/latent-imagination';
import { cx } from '@/lib/utils';

/**
 * LatentImagination: why imagination horizons stay short.
 *
 * An imagined rollout starts from a real encoded state and every step feeds
 * the model's own prediction back in, so one-step errors compound. The top
 * chart draws the imagined latent trajectory peeling away from the true one;
 * the bottom chart plots latent deviation against step with the published
 * 15-50 step typical range shaded. The horizon slider extends the rollout
 * and the deviation readout grows monotonically with it.
 *
 * The mode toggle is the Dreamer versus TD-MPC distinction: with a decoder,
 * the drift shows up as decoded frames dissolving into noise; decoder-free,
 * there is no image to inspect at all and the readout switches to reward
 * prediction error, the only quantity the model was trained to keep
 * calibrated.
 *
 * Interactive contract: typed props, deterministic render, monospace
 * numeric readouts, reset control, native keyboard-accessible inputs, fixed
 * chart geometry (no layout shift). Scrub-driven only, no auto-playing or
 * JS-driven motion, so it is reduced-motion safe by construction.
 */
type ImaginationMode = 'decoder' | 'decoder-free';

type LatentImaginationProps = {
  /** Initial imagination horizon in steps. Default 15 (low end of the published range). */
  defaultHorizon?: number;
  /** Initial one-step model error. Default 0.02 (2%). */
  defaultEpsilon?: number;
  className?: string;
};

const MIN_EPSILON_PERCENT = 0.5;
const MAX_EPSILON_PERCENT = 6;

const ROLLOUT_W = 640;
const ROLLOUT_H = 170;
const DEV_W = 640;
const DEV_H = 196;
const DEV_PAD = { top: 16, right: 16, bottom: 30, left: 56 };

const MONO = 'var(--font-mono)';
const DIM = 'var(--color-text-dim)';
const ACCENT = 'var(--color-accent)';
const BORDER = 'var(--color-border)';
const BORDER_STRONG = 'var(--color-border-strong)';
const SURFACE_2 = 'var(--color-surface-2)';

/** Deterministic pseudo-random stream so noise dots never move between renders. */
function seededNoise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function formatUnits(value: number): string {
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

/**
 * One decoded frame: a tiny scene (horizon line, object) plus noise dots
 * whose count and spread scale with the latent deviation at that step. The
 * further imagination has drifted, the less the reconstruction resembles a
 * scene.
 */
function DecodedFrame({
  deviation,
  seed,
  label,
  maxDots,
}: {
  deviation: number;
  seed: number;
  label: string;
  maxDots: number;
}) {
  const dots = useMemo(() => {
    const rand = seededNoise(seed);
    const count = Math.min(maxDots, Math.round(deviation * 30));
    const spread = 4 + deviation * 14;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: 6 + rand() * 76,
      y: 6 + rand() * 44,
      r: 0.8 + rand() * spread * 0.22,
      o: 0.25 + rand() * 0.55,
    }));
  }, [deviation, seed, maxDots]);

  const fade = Math.min(1, deviation * 1.6);

  return (
    <g>
      <rect x={0} y={0} width={88} height={56} fill={SURFACE_2} stroke={BORDER_STRONG} strokeWidth={1} />
      {/* scene content fades as imagination drifts */}
      <g opacity={Math.max(0.12, 1 - fade)}>
        <line x1={4} y1={36} x2={84} y2={36} stroke={DIM} strokeWidth={1} />
        <circle cx={30} cy={20} r={7} fill={ACCENT} opacity={0.85} />
        <rect x={52} y={26} width={24} height={10} fill="none" stroke={DIM} strokeWidth={1} />
      </g>
      {dots.map((d) => (
        <circle key={d.key} cx={d.x} cy={d.y} r={d.r} fill={DIM} opacity={d.o} />
      ))}
      <text x={44} y={66} textAnchor="middle" fill={DIM} fontSize={8} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

function CrossedFrame({ label }: { label: string }) {
  return (
    <g>
      <rect x={0} y={0} width={88} height={56} fill="none" stroke={BORDER_STRONG} strokeWidth={1} />
      <line x1={0} y1={0} x2={88} y2={56} stroke={BORDER_STRONG} strokeWidth={1} />
      <line x1={88} y1={0} x2={0} y2={56} stroke={BORDER_STRONG} strokeWidth={1} />
      <text x={44} y={66} textAnchor="middle" fill={DIM} fontSize={8} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

export function LatentImagination({
  defaultHorizon = TYPICAL_HORIZON[0],
  defaultEpsilon = 0.02,
  className,
}: LatentImaginationProps) {
  const [horizon, setHorizon] = useState(defaultHorizon);
  const [epsilonPercent, setEpsilonPercent] = useState(defaultEpsilon * 100);
  const [mode, setMode] = useState<ImaginationMode>('decoder');

  const epsilon = epsilonPercent / 100;

  // Fixed vertical scales anchored to the worst case (max error, full
  // horizon) so extending the horizon always grows the visible divergence
  // instead of rescaling it away.
  const deviationMax = useMemo(
    () => deviationAt({ epsilon: MAX_EPSILON_PERCENT / 100, horizon: MAX_HORIZON }),
    [],
  );

  const rollout = useMemo(() => {
    const deviation = imagineDeviation({ epsilon, horizon });
    const scale = (ROLLOUT_H / 2 - 24) / (deviationMax + 0.5);
    const x = (t: number) => 16 + (t / MAX_HORIZON) * (ROLLOUT_W - 32);
    const cy = ROLLOUT_H / 2;
    const y = (t: number) => {
      const drift = deviation[t] * (0.7 + 0.3 * Math.sin(t * 0.35));
      return cy - (trueLatent(t) + drift) * scale;
    };
    const trueParts: string[] = [];
    for (let t = 0; t <= MAX_HORIZON; t += 1) {
      const ty = cy - trueLatent(t) * scale;
      trueParts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${ty.toFixed(1)}`);
    }
    const imaginedParts: string[] = [];
    for (let t = 0; t <= horizon; t += 1) {
      imaginedParts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(t).toFixed(1)}`);
    }
    return {
      truePath: trueParts.join(' '),
      imaginedPath: imaginedParts.join(' '),
      end: { cx: x(horizon), cy: y(horizon) },
      trueEnd: { cx: x(horizon), cy: cy - trueLatent(horizon) * scale },
    };
  }, [epsilon, horizon, deviationMax]);

  const deviationChart = useMemo(() => {
    const plotW = DEV_W - DEV_PAD.left - DEV_PAD.right;
    const plotH = DEV_H - DEV_PAD.top - DEV_PAD.bottom;
    const yMax = deviationMax * 1.05;
    const x = (t: number) => DEV_PAD.left + (t / MAX_HORIZON) * plotW;
    const y = (v: number) => DEV_PAD.top + plotH - (v / yMax) * plotH;
    const full = imagineDeviation({ epsilon, horizon: MAX_HORIZON });
    const parts: string[] = [];
    for (let t = 0; t <= MAX_HORIZON; t += 1) {
      parts.push(`${t === 0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(full[t]).toFixed(1)}`);
    }
    return {
      plotW,
      plotH,
      yMax,
      x,
      y,
      path: parts.join(' '),
      marker: { cx: x(horizon), cy: y(full[horizon]) },
      bandX: x(TYPICAL_HORIZON[0]),
      bandW: x(TYPICAL_HORIZON[1]) - x(TYPICAL_HORIZON[0]),
    };
  }, [epsilon, horizon, deviationMax]);

  const deviationNow = deviationAt({ epsilon, horizon });
  const rewardError = rewardPredictionError({ epsilon, horizon });

  // Decoded frames at quarter, half, and full horizon (decoder mode only).
  const frameSteps = [
    Math.max(1, Math.round(horizon / 4)),
    Math.max(1, Math.round(horizon / 2)),
    horizon,
  ];
  const fullDeviation = imagineDeviation({ epsilon, horizon });

  function reset() {
    setHorizon(defaultHorizon);
    setEpsilonPercent(defaultEpsilon * 100);
    setMode('decoder');
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
            htmlFor="li-horizon"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Imagination horizon
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {horizon} steps
            </span>
          </label>
          <input
            id="li-horizon"
            type="range"
            min={1}
            max={MAX_HORIZON}
            step={1}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            aria-label={`Imagination horizon in steps, currently ${horizon}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div>
          <label
            htmlFor="li-epsilon"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            One-step model error
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              {epsilonPercent.toFixed(1)}%
            </span>
          </label>
          <input
            id="li-epsilon"
            type="range"
            min={MIN_EPSILON_PERCENT}
            max={MAX_EPSILON_PERCENT}
            step={0.5}
            value={epsilonPercent}
            onChange={(e) => setEpsilonPercent(Number(e.target.value))}
            aria-label={`One-step model error in percent, currently ${epsilonPercent.toFixed(1)}`}
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
        <div role="group" aria-label="Model type" className="flex gap-2">
          <button
            type="button"
            aria-pressed={mode === 'decoder'}
            onClick={() => setMode('decoder')}
            className={cx(toggleBase, mode === 'decoder' ? toggleOn : toggleOff)}
          >
            Dreamer: with decoder
          </button>
          <button
            type="button"
            aria-pressed={mode === 'decoder-free'}
            onClick={() => setMode('decoder-free')}
            className={cx(toggleBase, mode === 'decoder-free' ? toggleOn : toggleOff)}
          >
            TD-MPC2: decoder-free
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${ROLLOUT_W} ${ROLLOUT_H}`}
        role="img"
        aria-label={`Imagined rollout in latent space over ${horizon} steps, peeling away from the true latent trajectory as one-step errors compound.`}
        className="mt-4 block w-full"
      >
        <text x={16} y={16} fill={DIM} fontSize={10} fontFamily={MONO}>
          latent rollout view: true trajectory vs imagined
        </text>
        <line
          x1={16}
          x2={ROLLOUT_W - 16}
          y1={ROLLOUT_H / 2}
          y2={ROLLOUT_H / 2}
          stroke={BORDER}
          strokeWidth={1}
        />
        <path
          d={rollout.truePath}
          fill="none"
          stroke={DIM}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <path
          d={rollout.imaginedPath}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2}
        />
        <circle
          cx={rollout.end.cx}
          cy={rollout.end.cy}
          r={4.5}
          fill="var(--color-bg)"
          stroke={ACCENT}
          strokeWidth={2}
        />
        <circle cx={rollout.trueEnd.cx} cy={rollout.trueEnd.cy} r={3} fill={DIM} />
        <text
          x={ROLLOUT_W - 16}
          y={ROLLOUT_H - 8}
          textAnchor="end"
          fill={DIM}
          fontSize={10}
          fontFamily={MONO}
        >
          t = 0 to {horizon} of {MAX_HORIZON}
        </text>
      </svg>

      <svg
        viewBox={`0 0 ${DEV_W} ${DEV_H}`}
        role="img"
        aria-label={`Latent deviation versus imagination step. Deviation compounds superlinearly and reaches ${formatUnits(deviationNow)} units at step ${horizon}. The shaded band marks the published typical range of 15 to 50 steps.`}
        className="mt-2 block w-full"
      >
        <text x={DEV_PAD.left} y={11} fill={DIM} fontSize={10} fontFamily={MONO}>
          latent deviation vs imagination step
        </text>
        <rect
          data-testid="typical-range-band"
          x={deviationChart.bandX}
          y={DEV_PAD.top}
          width={deviationChart.bandW}
          height={deviationChart.plotH}
          fill={SURFACE_2}
          opacity={0.55}
        />
        <text
          x={deviationChart.bandX + deviationChart.bandW / 2}
          y={DEV_PAD.top + 11}
          textAnchor="middle"
          fill={DIM}
          fontSize={8}
          fontFamily={MONO}
        >
          typical 15-50
        </text>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = DEV_PAD.top + (1 - f) * deviationChart.plotH;
          return (
            <g key={f}>
              <line
                x1={DEV_PAD.left}
                x2={DEV_PAD.left + deviationChart.plotW}
                y1={y}
                y2={y}
                stroke={BORDER}
                strokeWidth={1}
              />
              <text
                x={DEV_PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill={DIM}
                fontSize={10}
                fontFamily={MONO}
              >
                {formatUnits(deviationChart.yMax * f)}
              </text>
            </g>
          );
        })}
        {[0, MAX_HORIZON / 2, MAX_HORIZON].map((t) => (
          <text
            key={t}
            x={deviationChart.x(t)}
            y={DEV_H - 10}
            textAnchor={t === MAX_HORIZON ? 'end' : 'middle'}
            fill={DIM}
            fontSize={10}
            fontFamily={MONO}
          >
            {t}
          </text>
        ))}
        <path
          data-testid="deviation-curve"
          d={deviationChart.path}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2}
        />
        <circle
          cx={deviationChart.marker.cx}
          cy={deviationChart.marker.cy}
          r={4.5}
          fill="var(--color-bg)"
          stroke={ACCENT}
          strokeWidth={2}
        />
      </svg>

      {mode === 'decoder' ? (
        <div data-testid="decoded-frames" className="mt-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
            decoded imagined frames
          </div>
          <svg
            viewBox="0 0 296 72"
            aria-hidden="true"
            className="mt-1.5 block w-full max-w-md"
          >
            <g transform="translate(0,0)">
              <DecodedFrame
                deviation={fullDeviation[frameSteps[0]]}
                seed={11}
                label={`t = ${frameSteps[0]}`}
                maxDots={26}
              />
            </g>
            <g transform="translate(104,0)">
              <DecodedFrame
                deviation={fullDeviation[frameSteps[1]]}
                seed={29}
                label={`t = ${frameSteps[1]}`}
                maxDots={26}
              />
            </g>
            <g transform="translate(208,0)">
              <DecodedFrame
                deviation={fullDeviation[frameSteps[2]]}
                seed={47}
                label={`t = ${frameSteps[2]}`}
                maxDots={26}
              />
            </g>
          </svg>
        </div>
      ) : (
        <div data-testid="decoder-free-note" className="mt-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
            decoder-free: prediction without reconstruction
          </div>
          <div className="mt-1.5 flex items-start gap-3">
            <svg
              viewBox="0 0 88 72"
              aria-hidden="true"
              className="block w-28 shrink-0"
            >
              <CrossedFrame label="no image" />
            </svg>
            <p className="font-sans text-xs leading-relaxed text-text-dim">
              No image reconstruction is ever produced. The latent is trained
              only for reward and value prediction, so the quantity to watch
              is not frame quality but how far the scalar heads drift over the
              imagination horizon.
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">latent deviation Δ({horizon}) =</span>{' '}
        <span data-testid="deviation-readout" className="text-accent">
          {formatUnits(deviationNow)}
        </span>{' '}
        <span className="text-text-dim">units at one-step error</span>{' '}
        {epsilonPercent.toFixed(1)}%
        {mode === 'decoder-free' && (
          <>
            <span className="text-text-dim">, reward prediction error =</span>{' '}
            <span data-testid="reward-error-readout">
              {formatUnits(rewardError)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
