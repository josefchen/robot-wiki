'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  DEFAULT_GAIT,
  DEFAULT_PHASE,
  GAITS,
  GAIT_ORDER,
  LEGS,
  footfallOrder,
  formatDuty,
  formatPhase,
  hasFlightPhase,
  inStance,
  minStanceCount,
  playbackCadence,
  stanceLegs,
  stepPhase,
  type GaitId,
} from '@/lib/gait';
import { cx } from '@/lib/utils';

/**
 * GaitDiagram: the quadruped footfall-timing chart for the legged
 * locomotion module. Four rows (one per leg) show stance intervals over
 * one stride cycle; a playhead sweeps the cycle while readouts report the
 * duty factor, the current phase, which feet are down, and whether the
 * gait ever leaves the ground.
 *
 * The point the diagram makes: a gait is only a timing pattern. The walk
 * never drops below three feet of support, the trot balances on diagonal
 * pairs, and the bound and pronk accept flight phases, which is why the
 * fast gaits need dynamics the walk never does.
 *
 * Interactive contract: deterministic initial render (walk, phase 0),
 * native buttons and range input (keyboard-accessible), visible monospace
 * readouts, reset control, fixed SVG viewport (no layout shift). Playback
 * runs on an interval (not rAF) and degrades to discrete PHASE_STEP jumps
 * under prefers-reduced-motion.
 */

const WIDTH = 640;
const HEIGHT = 268;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 632;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const ROW_TOP = 46;
const ROW_H = 34;
const ROW_GAP = 14;
const AXIS_Y = ROW_TOP + LEGS.length * (ROW_H + ROW_GAP) + 6;

const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Stance window of one leg as x-intervals; splits when it wraps the cycle. */
function stanceSpans(
  offset: number,
  duty: number,
): Array<[number, number]> {
  const start = offset;
  const end = offset + duty;
  const spans: Array<[number, number]> = [];
  if (end <= 1) {
    spans.push([start, end]);
  } else {
    spans.push([start, 1]);
    spans.push([0, end - 1]);
  }
  return spans.map(
    ([a, b]) => [f(PLOT_LEFT + a * PLOT_W), f(PLOT_LEFT + b * PLOT_W)] as [
      number,
      number,
    ],
  );
}

function supportText(gaitId: GaitId): string {
  const gait = GAITS[gaitId];
  if (hasFlightPhase(gait)) {
    return 'flight phase: 0 feet';
  }
  const min = minStanceCount(gait);
  if (gaitId === 'walk') return `always ${min} feet down`;
  return `${min} feet at all times`;
}

export function GaitDiagram({
  defaultGait = DEFAULT_GAIT,
  className,
}: {
  defaultGait?: GaitId;
  className?: string;
}) {
  const [gaitId, setGaitId] = useState<GaitId>(defaultGait);
  const [phase, setPhase] = useState(DEFAULT_PHASE);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const descriptionId = `${useId()}-description`;

  const gait = GAITS[gaitId];
  const stance = stanceLegs(gait, phase);
  const stanceShorts = LEGS.filter((l) => stance.includes(l.id)).map(
    (l) => l.short,
  );
  const stanceText =
    stanceShorts.length > 0 ? stanceShorts.join(' + ') : 'none (airborne)';

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Interval playback: advances the phase on the cadence for the current
  // motion preference. Cleanup on pause, gait change, or unmount.
  useEffect(() => {
    if (!playing) return;
    const { tickMs, phasePerTick } = playbackCadence(prefersReducedMotion());
    timerRef.current = window.setInterval(() => {
      setPhase((p) => (p + phasePerTick >= 1 ? 0 : f(p + phasePerTick)));
    }, tickMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing]);

  const selectGait = (id: GaitId) => {
    stopTimer();
    setPlaying(false);
    setGaitId(id);
    setPhase(DEFAULT_PHASE);
  };

  const step = (dir: 1 | -1) => {
    setPhase((p) => stepPhase(p, dir));
  };

  const reset = () => {
    stopTimer();
    setPlaying(false);
    setGaitId(DEFAULT_GAIT);
    setPhase(DEFAULT_PHASE);
  };

  const playheadX = f(PLOT_LEFT + Math.min(phase, 1) * PLOT_W);

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
        <div
          role="group"
          aria-label="Gait"
          className="flex flex-wrap gap-1"
        >
          {GAIT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={gaitId === id}
              onClick={() => selectGait(id)}
              className={cx(
                buttonBase,
                gaitId === id ? buttonActive : buttonIdle,
              )}
            >
              {GAITS[id].name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause gait cycle' : 'Play gait cycle'}
            className={cx(buttonBase, buttonIdle, 'inline-flex items-center gap-1.5')}
          >
            {playing ? (
              <Pause size={12} weight="bold" aria-hidden />
            ) : (
              <Play size={12} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => step(-1)}
            aria-label="Step back"
            className={cx(buttonBase, buttonIdle)}
          >
            Step back
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={() => step(1)}
            aria-label="Step forward"
            className={cx(buttonBase, buttonIdle)}
          >
            Step forward
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={reset}
            className={cx(buttonBase, buttonIdle)}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label
          htmlFor="gait-phase"
          className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
        >
          Gait phase
          <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
            {formatPhase(phase)}
          </span>
        </label>
        <input
          id="gait-phase"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(phase * 100)}
          onChange={(e) => setPhase(Number(e.target.value) / 100)}
          aria-label={`Gait phase, currently ${formatPhase(phase)} of the cycle`}
          className="mt-2 w-full accent-accent"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          gait:{' '}
          <span data-testid="gait-name-readout" className="text-text">
            {gait.name}
          </span>
        </span>
        <span className="text-text-dim">
          duty factor:{' '}
          <span data-testid="duty-readout" className="text-text">
            {formatDuty(gait.dutyFactor)}
          </span>
        </span>
        <span className="text-text-dim">
          phase:{' '}
          <span data-testid="phase-readout" className="text-accent">
            {formatPhase(phase)}
          </span>
        </span>
        <span className="text-text-dim">
          feet down:{' '}
          <span data-testid="stance-readout" className="text-text">
            {stanceText}
          </span>
        </span>
        <span className="text-text-dim">
          support:{' '}
          <span data-testid="support-readout" className="text-text">
            {supportText(gaitId)}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Footfall timing for the ${gait.name} gait, duty factor ${formatDuty(gait.dutyFactor)}, phase ${formatPhase(phase)}`}
        aria-describedby={descriptionId}
        className="mt-3 block w-full"
      >
        <text
          x={PLOT_LEFT}
          y={20}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          stance intervals over one stride cycle
        </text>
        <text
          x={PLOT_RIGHT}
          y={20}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {gait.name.toLowerCase()}, duty {formatDuty(gait.dutyFactor)}
        </text>

        {LEGS.map((leg, i) => {
          const top = ROW_TOP + i * (ROW_H + ROW_GAP);
          const active = inStance(gait, leg.id, phase);
          return (
            <g key={leg.id} data-testid={`row-${leg.id}`}>
              <text
                x={PLOT_LEFT - 8}
                y={top + ROW_H / 2 + 3}
                textAnchor="end"
                fill={
                  active ? 'var(--color-accent)' : 'var(--color-text-dim)'
                }
                fontSize={11}
                fontFamily="var(--font-mono)"
              >
                {leg.short}
              </text>
              <rect
                x={PLOT_LEFT}
                y={top}
                width={PLOT_W}
                height={ROW_H}
                fill="var(--color-surface-2)"
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              {stanceSpans(gait.offsets[leg.id], gait.dutyFactor).map(
                ([x1, x2], j) => (
                  <rect
                    key={j}
                    x={x1}
                    y={top + 4}
                    width={f(Math.max(1, x2 - x1))}
                    height={ROW_H - 8}
                    fill={
                      active
                        ? 'var(--color-accent)'
                        : 'var(--color-text-dim)'
                    }
                    opacity={active ? 0.9 : 0.4}
                  />
                ),
              )}
            </g>
          );
        })}

        {/* Playhead */}
        <g data-testid="playhead">
          <line
            x1={playheadX}
            x2={playheadX}
            y1={ROW_TOP - 8}
            y2={AXIS_Y - 4}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
          <circle
            cx={playheadX}
            cy={ROW_TOP - 12}
            r={3}
            fill="var(--color-accent)"
          />
        </g>

        {/* Cycle axis */}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={AXIS_Y}
          y2={AXIS_Y}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {[0, 25, 50, 75, 100].map((tick) => {
          const x = f(PLOT_LEFT + (tick / 100) * PLOT_W);
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={AXIS_Y}
                y2={AXIS_Y + 4}
                stroke="var(--color-border-strong)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={AXIS_Y + 16}
                textAnchor={
                  tick === 0 ? 'start' : tick === 100 ? 'end' : 'middle'
                }
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {tick}%
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">{gait.name.toLowerCase()} at</span>{' '}
        <span className="text-accent">{formatPhase(phase)}</span>{' '}
        <span className="text-text-dim">feet down</span>{' '}
        <span className="text-text">{stanceText}</span>{' '}
        <span className="text-text-dim">duty</span>{' '}
        <span className="text-text">{formatDuty(gait.dutyFactor)}</span>
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary={`Footfall timing for the ${gait.name.toLowerCase()}`}
        rowHeader="cycle phase"
        columns={[
          { header: 'feet down', numeric: true },
          { header: 'feet striking', numeric: false },
        ]}
        rows={[0, 0.2, 0.4, 0.6, 0.8].map((sample) => {
          const down = stanceLegs(gait, sample)
            .map((id) => LEGS.find((l) => l.id === id)!.short)
            .join(' + ');
          const strikes = LEGS.filter(
            (l) => Math.abs(gait.offsets[l.id] - sample) < 0.001,
          )
            .map((l) => l.short)
            .join(' + ');
          return {
            label: `${Math.round(sample * 100)}%`,
            values: [down || 'none', strikes || 'none'],
          };
        })}
        description={
          <>
            In the {gait.name.toLowerCase()}, {supportText(gaitId)} at duty factor{' '}
            {formatDuty(gait.dutyFactor)}, and the footfall offsets around the cycle
            are ({footfallOrder(gait)
              .map(
                (id) =>
                  `${LEGS.find((l) => l.id === id)!.short} at ${Math.round(
                    gait.offsets[id] * 100,
                  )}%`,
              )
              .join(', ')}
            ); at the current phase of {formatPhase(phase)} the feet down are{' '}
            {stanceText}.
          </>
        }
      />
    </div>
  );
}
