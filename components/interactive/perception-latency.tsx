'use client';

import { useState } from 'react';
import {
  AGILITY_STEPS,
  DEFAULT_AGILITY,
  DEFAULT_LATENCY_MS,
  INTERACTIVE_MAX_LATENCY_MS,
  SENSORS,
  formatSeconds,
  formatSpeed,
  latencyOutcome,
} from '@/lib/aerial-latency';
import { cx } from '@/lib/utils';

/**
 * PerceptionLatency: how fast is too fast, for the adjacent/drones
 * module. Reproduces the sense-and-avoid analysis of Falanga, Kim, and
 * Scaramuzza (RA-L 2019): a drone flying at the maximum speed its
 * perception pipeline can support, with the latency slider eating the
 * time to contact and the agility selector setting the avoidance
 * maneuver's lateral acceleration.
 *
 * The chart shows the obstacle-detection moment, the latency interval
 * (dead time before control acts), and the avoidance maneuver, laid out
 * on one shared timeline from detection to contact. The readouts give
 * the paper's closed-form maximum speed plus the three time intervals;
 * the sensor reference rows pin the stereo-camera and event-camera
 * latencies the paper compares.
 *
 * Interactive contract: deterministic initial render (70 ms stereo
 * camera, u = 25 m/s^2), native range slider and buttons
 * (keyboard-accessible), visible monospace readouts, reset control,
 * fixed SVG viewport (no layout shift), no auto-playing motion.
 */

const WIDTH = 640;
const HEIGHT = 220;
const PLOT_LEFT = 24;
const PLOT_RIGHT = 616;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const LANE_Y = 96;
const LANE_H = 34;
const LABEL_Y = 40;
const TICK_Y = LANE_Y + LANE_H + 38;

const f = (v: number) => Number(v.toFixed(2));

export function PerceptionLatency({ className }: { className?: string }) {
  const [latencyMs, setLatencyMs] = useState(DEFAULT_LATENCY_MS);
  const [agility, setAgility] = useState<number>(DEFAULT_AGILITY);

  const latencyS = latencyMs / 1000;
  const outcome = latencyOutcome(latencyS, agility, SENSORS[0].rangeM);
  const ttc = outcome.timeToContactS;
  const tAvoid = outcome.avoidanceTimeS;

  const xAt = (t: number) => f(PLOT_LEFT + (t / ttc) * PLOT_W);
  const latencyX0 = PLOT_LEFT;
  const latencyX1 = xAt(latencyS);
  const avoidX1 = xAt(latencyS + tAvoid);
  const contactX = PLOT_RIGHT;

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';
  const buttonActive = 'border-accent bg-surface-2 text-accent';

  const reset = () => {
    setLatencyMs(DEFAULT_LATENCY_MS);
    setAgility(DEFAULT_AGILITY);
  };

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="perception-latency"
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Perception latency
            <span className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text">
              {formatSeconds(latencyS)}
            </span>
          </label>
          <input
            id="perception-latency"
            type="range"
            min={0}
            max={INTERACTIVE_MAX_LATENCY_MS}
            step={5}
            value={latencyMs}
            onChange={(e) => setLatencyMs(Number(e.target.value))}
            aria-label={`Perception latency, currently ${formatSeconds(latencyS)}`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div role="group" aria-label="Maximum lateral acceleration" className="flex flex-wrap gap-1">
          {AGILITY_STEPS.map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={agility === u}
              onClick={() => setAgility(u)}
              className={cx(buttonBase, agility === u ? buttonActive : buttonIdle)}
            >
              {u} m/s²
            </button>
          ))}
          <button type="button" onClick={reset} className={cx(buttonBase, buttonIdle)}>
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-text-dim">
          max speed:{' '}
          <span data-testid="max-speed-readout" className="text-accent">
            {formatSpeed(outcome.maxSpeedMs)}
          </span>
        </span>
        <span className="text-text-dim">
          time to contact:{' '}
          <span data-testid="ttc-readout" className="text-text">
            {formatSeconds(ttc)}
          </span>
        </span>
        <span className="text-text-dim">
          lost to latency:{' '}
          <span data-testid="latency-readout" className="text-text">
            {formatSeconds(latencyS)}
          </span>
        </span>
        <span className="text-text-dim">
          avoidance maneuver:{' '}
          <span data-testid="avoid-readout" className="text-text">
            {formatSeconds(tAvoid)}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Sense-and-avoid timeline at the maximum speed of ${formatSpeed(
          outcome.maxSpeedMs,
        )}. Obstacle detected at the sensing range, ${formatSeconds(
          latencyS,
        )} of perception latency before control acts, then an avoidance maneuver of ${formatSeconds(
          tAvoid,
        )} at ${agility} meters per second squared of lateral acceleration. Time to contact ${formatSeconds(
          ttc,
        )}.`}
        className="mt-3 block w-full"
      >
        {/* Interval band: latency (dead time) then avoidance maneuver. */}
        <rect
          data-testid="latency-band"
          x={latencyX0}
          y={LANE_Y}
          width={Math.max(0, latencyX1 - latencyX0)}
          height={LANE_H}
          fill="var(--color-surface-2)"
          stroke="var(--color-border)"
        />
        <rect
          data-testid="avoid-band"
          x={latencyX1}
          y={LANE_Y}
          width={Math.max(0, avoidX1 - latencyX1)}
          height={LANE_H}
          fill="rgb(245 166 35 / 0.18)"
          stroke="var(--color-accent)"
          strokeOpacity={0.55}
        />
        <rect
          data-testid="margin-band"
          x={avoidX1}
          y={LANE_Y}
          width={Math.max(0, contactX - avoidX1)}
          height={LANE_H}
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />

        {/* Interval labels. */}
        <text
          x={PLOT_LEFT + ((latencyX1 - latencyX0) / 2 || 8)}
          y={LABEL_Y}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          latency
        </text>
        <text
          x={latencyX1 + Math.max(24, (avoidX1 - latencyX1) / 2)}
          y={LABEL_Y}
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          avoid
        </text>
        <text
          x={avoidX1 + (contactX - avoidX1) / 2}
          y={LABEL_Y}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          margin
        </text>

        {/* Contact marker: the obstacle, reached at ttc. */}
        <line
          x1={contactX}
          y1={LANE_Y - 8}
          x2={contactX}
          y2={LANE_Y + LANE_H + 8}
          stroke="var(--color-err)"
          strokeWidth={1.5}
        />
        <text
          x={contactX - 6}
          y={LANE_Y - 14}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          textAnchor="end"
        >
          obstacle
        </text>

        {/* Detection marker at the sensing range. */}
        <line
          x1={PLOT_LEFT}
          y1={LANE_Y - 8}
          x2={PLOT_LEFT}
          y2={LANE_Y + LANE_H + 8}
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
        />
        <text
          x={PLOT_LEFT + 4}
          y={LANE_Y - 14}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          detected
        </text>

        {/* Time axis. */}
        <line
          x1={PLOT_LEFT}
          y1={LANE_Y + LANE_H + 22}
          x2={PLOT_RIGHT}
          y2={LANE_Y + LANE_H + 22}
          stroke="var(--color-border)"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <g key={frac}>
            <line
              x1={f(PLOT_LEFT + frac * PLOT_W)}
              y1={LANE_Y + LANE_H + 22}
              x2={f(PLOT_LEFT + frac * PLOT_W)}
              y2={LANE_Y + LANE_H + 28}
              stroke="var(--color-border)"
            />
            <text
              x={f(PLOT_LEFT + frac * PLOT_W)}
              y={TICK_Y}
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
              textAnchor={frac === 1 ? 'end' : frac === 0 ? 'start' : 'middle'}
            >
              {formatSeconds(ttc * frac)}
            </text>
          </g>
        ))}
      </svg>

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-text-dim">
        Reference latencies from the study (8 m sensing range):{' '}
        {SENSORS.map((s, i) => (
          <span key={s.id}>
            {i > 0 && '; '}
            {s.name} {formatSeconds(s.latencyS)}
          </span>
        ))}
        . Model: maximum speed = range / (latency + 2 sqrt(r / u)), r = 0.75 m.
      </p>
    </div>
  );
}
