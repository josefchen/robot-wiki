'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  INITIAL_STEP,
  WINDOW,
  Y_SPAN,
  generateEpisode,
  playbackCadence,
  rmsError,
  runFilter,
  type KalmanSettings,
} from '@/lib/kalman';
import { cx } from '@/lib/utils';

/**
 * KalmanTracker: a live constant-velocity Kalman filter tracking a
 * wandering 1D target. The white trace is the true path, the gray dots are
 * the position sensor's readings (about one in five drops out), the amber
 * trace is the filter's estimate, and the amber band is the filter's own
 * +/-2 sigma position uncertainty. The two sliders set what the filter
 * BELIEVES about the world: sigma_q, the per-step acceleration noise it
 * assumes, and sigma_r, the sensor scatter it assumes. The world itself is
 * fixed per seed, so raising sigma_r widens the band and lowers the gain
 * (the estimate smooths and lags), and raising sigma_q widens the band
 * between fixes and raises the gain (the estimate hugs each reading).
 *
 * Reproducibility contract: the episode (truth + measurements + dropouts)
 * is a pure function of the seed shown in the readout. Reseed generates the
 * next world; Reset restores the default seed, the default settings, and
 * step 0. Same seed + same sliders + same step always renders the same
 * chart, which is what validators rely on.
 *
 * Interactive contract: native range inputs and buttons
 * (keyboard-accessible), visible monospace readouts (step, seed, sigma,
 * gain, rms error), reset control, fixed SVG viewport (no layout shift).
 * Playback runs on an interval (not rAF) and degrades to coarse discrete
 * jumps under prefers-reduced-motion; nothing animates until Run.
 */

const WIDTH = 640;
const HEIGHT = 360;
const PLOT = { left: 44, right: 624, top: 16, bottom: 336 };
const PLOT_W = PLOT.right - PLOT.left;
const MID_Y = (PLOT.top + PLOT.bottom) / 2;
const HALF_H = (PLOT.bottom - PLOT.top) / 2;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const SLIDERS: {
  id: keyof KalmanSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}[] = [
  {
    id: 'sigmaQ',
    label: 'process noise',
    min: 0.05,
    max: 1.0,
    step: 0.05,
    hint: 'What the filter assumes about the target\u2019s per-step acceleration. Raise it and the band swells between fixes while the estimate chases every reading.',
  },
  {
    id: 'sigmaR',
    label: 'measurement noise',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    hint: 'What the filter assumes about the sensor\u2019s scatter. Raise it and the gain drops: the estimate smooths, lags, and the band widens.',
  },
];

export function KalmanTracker({ className }: { className?: string }) {
  const [settings, setSettings] = useState<KalmanSettings>(DEFAULT_SETTINGS);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [step, setStep] = useState(INITIAL_STEP);
  const [playing, setPlaying] = useState(false);

  // The world depends only on the seed; the estimate depends on the world
  // plus the assumed noise levels. Both are memoized pure computations, so
  // dragging a slider re-derives the whole run immediately, even paused.
  const episode = useMemo(() => generateEpisode(seed), [seed]);
  const lastStep = episode.steps - 1;
  const frames = useMemo(
    () => runFilter(episode, settings, step),
    [episode, settings, step],
  );
  const frame = frames[frames.length - 1];

  // Running is derived: at the end of the episode the tracker reports
  // paused and the interval effect below cleans itself up, so no effect
  // ever has to set state.
  const atEnd = step >= lastStep;
  const running = playing && !atEnd;

  // Interval playback: each tick advances the tracker by the cadence's
  // fixed number of steps. Deterministic because the episode and filter
  // are pure. Cleanup on pause, at the end of the episode, or on unmount.
  useEffect(() => {
    if (!running) return;
    const { tickMs, stepsPerTick } = playbackCadence(prefersReducedMotion());
    const timer = window.setInterval(() => {
      setStep((s) => Math.min(s + stepsPerTick, lastStep));
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [running, lastStep]);

  const windowStart = Math.max(0, step - WINDOW + 1);
  const visible = frames.slice(windowStart);
  const rms = rmsError(visible, episode.truth);

  const xPx = (t: number) =>
    f(PLOT.left + ((t - windowStart) / (WINDOW - 1)) * PLOT_W);
  const yPx = (pos: number) =>
    f(
      Math.min(
        PLOT.bottom,
        Math.max(PLOT.top, MID_Y - (pos / Y_SPAN) * HALF_H),
      ),
    );

  const truthPoints = visible.map((fr) => `${xPx(fr.t)},${yPx(episode.truth[fr.t])}`).join(' ');
  const estPoints = visible.map((fr) => `${xPx(fr.t)},${yPx(fr.est)}`).join(' ');
  const bandPoints =
    visible.map((fr) => `${xPx(fr.t)},${yPx(fr.est + 2 * fr.sigma)}`).join(' ') +
    ' ' +
    visible
      .slice()
      .reverse()
      .map((fr) => `${xPx(fr.t)},${yPx(fr.est - 2 * fr.sigma)}`)
      .join(' ');

  const togglePlay = () => {
    if (running) {
      setPlaying(false);
    } else {
      if (atEnd) setStep(INITIAL_STEP);
      setPlaying(true);
    }
  };
  const stepOnce = () => {
    setPlaying(false);
    setStep((s) => Math.min(s + 1, lastStep));
  };
  const reseed = () => {
    setPlaying(false);
    setSeed((s) => s + 1);
    setStep(INITIAL_STEP);
  };
  const reset = () => {
    setPlaying(false);
    setSettings(DEFAULT_SETTINGS);
    setSeed(DEFAULT_SEED);
    setStep(INITIAL_STEP);
  };

  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SLIDERS.map((spec) => (
          <div key={spec.id}>
            <label
              htmlFor={`kalman-${spec.id}`}
              className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
            >
              <span>
                <span className="normal-case tracking-normal">
                  {spec.id === 'sigmaQ' ? 'σq' : 'σr'}
                </span>{' '}
                {spec.label}
              </span>
              <span
                className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
                data-testid={`kalman-${spec.id.toLowerCase()}-value`}
              >
                {settings[spec.id].toFixed(2)}
              </span>
            </label>
            <input
              id={`kalman-${spec.id}`}
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={settings[spec.id]}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  [spec.id]: Number(e.target.value),
                }))
              }
              aria-label={`Assumed ${spec.label} ${
                spec.id === 'sigmaQ' ? 'sigma q' : 'sigma r'
              }, currently ${settings[spec.id].toFixed(2)}`}
              className="mt-2 w-full accent-accent"
            />
            <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
              {spec.hint}
            </p>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Kalman filter tracking a wandering target, step ${step} of ${lastStep}. Position uncertainty sigma ${frame.sigma.toFixed(
          2,
        )}, Kalman gain ${frame.gain.toFixed(2)}.`}
        data-testid="kalman-scene"
        className="mt-4 block w-full"
      >
        {/* Horizontal grid and tick labels */}
        {[-Y_SPAN, -Y_SPAN / 2, 0, Y_SPAN / 2, Y_SPAN].map((v) => (
          <g key={v}>
            <line
              x1={PLOT.left}
              y1={yPx(v)}
              x2={PLOT.right}
              y2={yPx(v)}
              stroke={
                v === 0 ? 'var(--color-border-strong)' : 'var(--color-border)'
              }
              strokeWidth={1}
              strokeDasharray={v === 0 ? undefined : '2 5'}
            />
            <text
              x={PLOT.left - 8}
              y={yPx(v) + 3}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}

        {/* Uncertainty band: the filter's own +/-2 sigma position spread */}
        <polygon
          data-testid="kalman-band"
          points={bandPoints}
          fill="var(--color-accent)"
          opacity={0.13}
        />

        {/* True path */}
        <polyline
          data-testid="kalman-truth-line"
          points={truthPoints}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Sensor readings (skip dropouts) */}
        <g data-testid="kalman-measurements">
          {visible.map((fr) => {
            const z = episode.measurements[fr.t];
            if (z === null) return null;
            return (
              <circle
                key={fr.t}
                cx={xPx(fr.t)}
                cy={yPx(z)}
                r={1.75}
                fill="var(--color-text-dim)"
              />
            );
          })}
        </g>

        {/* Filter estimate */}
        <polyline
          data-testid="kalman-estimate-line"
          points={estPoints}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.75}
          strokeLinejoin="round"
        />

        {/* Current truth and estimate markers */}
        <circle
          cx={xPx(step)}
          cy={yPx(episode.truth[step])}
          r={3.5}
          fill="var(--color-text)"
        />
        <circle
          data-testid="kalman-estimate-marker"
          cx={xPx(step)}
          cy={yPx(frame.est)}
          r={3.5}
          fill="var(--color-accent)"
        />
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-4"
            style={{ backgroundColor: 'var(--color-text)' }}
          />
          true path
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-text-dim)' }}
          />
          measurements
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-4"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          estimate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-accent) 13%, transparent)',
            }}
          />
          ±2σ band
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={running ? 'Pause the tracker' : 'Run the tracker'}
          className={cx(buttonBase, 'inline-flex items-center gap-1.5')}
        >
          {running ? (
            <Pause size={12} weight="bold" aria-hidden />
          ) : (
            <Play size={12} weight="bold" aria-hidden />
          )}
          {running ? 'Pause' : 'Run'}
        </button>
        <button
          type="button"
          onClick={stepOnce}
          aria-label="Step the tracker forward one step"
          className={buttonBase}
        >
          Step
        </button>
        <button
          type="button"
          onClick={reseed}
          aria-label="Reseed: generate the next world and restart"
          className={buttonBase}
        >
          Reseed
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset: restore the default world, settings, and opening step"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text">
        <span className="text-text-dim">step</span>{' '}
        <span data-testid="kalman-step-readout" className="text-text">
          {step} / {lastStep}
        </span>{' '}
        <span className="text-text-dim">seed</span>{' '}
        <span data-testid="kalman-seed-readout" className="text-text">
          {seed}
        </span>{' '}
        <span className="text-text-dim">sigma</span>{' '}
        <span data-testid="kalman-sigma-readout" className="text-accent">
          {frame.sigma.toFixed(2)}
        </span>{' '}
        <span className="text-text-dim">gain</span>{' '}
        <span data-testid="kalman-gain-readout" className="text-text">
          {frame.gain.toFixed(2)}
        </span>{' '}
        <span className="text-text-dim">rms err</span>{' '}
        <span data-testid="kalman-rms-readout" className="text-text">
          {rms.toFixed(2)}
        </span>
      </p>

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        A constant-velocity Kalman filter tracking a wandering target from a
        noisy position sensor. The band is the filter&apos;s own ±2σ position
        uncertainty: it is widest where readings dropped out and the estimate
        coasted on the model. The world is fixed by the seed in the readout,
        so a run is exactly reproducible: Reseed generates the next world,
        Reset returns to world {DEFAULT_SEED} with the matched default
        beliefs (σq {DEFAULT_SETTINGS.sigmaQ.toFixed(2)}, σr{' '}
        {DEFAULT_SETTINGS.sigmaR.toFixed(2)}). Things worth trying: drag σr
        up and watch the gain fall and the estimate smooth out; drag σq up
        and watch the estimate hug every reading while the band swells
        between fixes.
      </p>
    </div>
  );
}
