'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import {
  DEFAULT_GAINS,
  GAIN_SPECS,
  INITIAL_STATE,
  PENDULUM_PARAMS,
  advancePendulum,
  applyPush,
  classifyStability,
  controlTorque,
  formatDeg,
  playbackCadence,
  tipPosition,
  type PidGains,
  type PendulumState,
  type Stability,
} from '@/lib/pendulum';
import { ChartDescription } from '@/components/ui';
import { cx } from '@/lib/utils';

/**
 * PendulumController: a live PID lab on a torque-actuated inverted
 * pendulum. The pole is released 12 degrees off vertical with a small
 * off-center payload (the dot at the tip) supplying a constant disturbance
 * torque, and the three gain sliders retune the loop while it runs:
 * default gains settle into a small steady lean, adding Ki walks the pole
 * back to vertical, cutting Kd toward zero leaves it ringing, and dropping
 * Kp below the mgl threshold (9.81) loses the pole entirely. Push applies
 * a fixed angular-velocity kick so a tuned loop can be disturbed on
 * demand. Reset restores the release state and the default gains.
 *
 * Interactive contract: fully deterministic physics (no randomness, fixed
 * substep, identical trajectories for identical inputs), native range
 * inputs and buttons (keyboard-accessible), visible monospace readouts
 * (angle, rate, integral, torque, status), reset control, fixed SVG
 * viewport (no layout shift). Playback runs on an interval (not rAF) and
 * degrades to coarse discrete jumps under prefers-reduced-motion; nothing
 * animates until the user runs or pushes.
 */

const WIDTH = 640;
const HEIGHT = 380;
// The pivot sits on a support post well above the ground line, so the pole
// stays fully in frame in every regime: upright, hanging straight down, or
// tumbling through.
const GROUND_Y = 352;
const PIVOT = { x: 320, y: 168 };
const ROD_PX = 150;
const ARC_R = 40;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const STATUS_TEXT: Record<Stability, string> = {
  settled: 'settled',
  settling: 'settling',
  oscillating: 'oscillating',
  fallen: 'fallen',
};

/** Rod and mass color: amber near balance, red past the fall line. */
function poleColor(theta: number): string {
  const abs = Math.abs(theta);
  if (abs > Math.PI / 3) return 'var(--color-err)';
  if (abs <= (10 * Math.PI) / 180) return 'var(--color-accent)';
  return 'var(--color-text)';
}

/** The off-center payload rides 10px off the rod axis at the tip. */
function payloadPosition(theta: number): { x: number; y: number } {
  const tip = tipPosition(theta, ROD_PX, PIVOT);
  return { x: tip.x + 11 * Math.cos(theta), y: tip.y + 11 * Math.sin(theta) };
}

type PendulumControllerProps = {
  /**
   * Initial proportional gain. Defaults to the stock 25; a prediction
   * step mounts the loop at the Kp that answers its prompt (the mgl
   * threshold region). Ki and Kd always start at their defaults.
   */
  defaultKp?: number;
  className?: string;
};

export function PendulumController({
  defaultKp = DEFAULT_GAINS.kp,
  className,
}: PendulumControllerProps) {
  // useId-derived input ids: this component legitimately renders twice on
  // one page (article prose plus a prediction-step figure), and hardcoded
  // ids would duplicate and cross-bind labels between the two mounts.
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [gains, setGains] = useState<PidGains>(() => ({
    ...DEFAULT_GAINS,
    kp: defaultKp,
  }));
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync the Kp slice before painting.
  const [prevDefaultKp, setPrevDefaultKp] = useState(defaultKp);
  if (defaultKp !== prevDefaultKp) {
    setPrevDefaultKp(defaultKp);
    setGains((g) => ({ ...g, kp: defaultKp }));
  }
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState<{
    sim: PendulumState;
    history: PendulumState[];
  }>({ sim: INITIAL_STATE, history: [INITIAL_STATE] });
  // Mirror of `gains` for the interval callback, so retuning mid-run takes
  // effect on the next tick without recreating the timer.
  const gainsRef = useRef(gains);
  useEffect(() => {
    gainsRef.current = gains;
  }, [gains]);

  // Interval playback: each tick advances the sim by the cadence's fixed
  // slice of simulated time. Deterministic because advancePendulum steps
  // fixed PHYSICS_DT substeps regardless of tick size. Cleanup on pause
  // or unmount.
  useEffect(() => {
    if (!playing) return;
    const { tickMs, simSecondsPerTick } = playbackCadence(
      prefersReducedMotion(),
    );
    const timer = window.setInterval(() => {
      setRun((prev) => {
        const sim = advancePendulum(
          prev.sim,
          gainsRef.current,
          PENDULUM_PARAMS,
          simSecondsPerTick,
        );
        const cutoff = sim.t - 2;
        const history = [...prev.history, sim].filter((s) => s.t >= cutoff);
        return { sim, history };
      });
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [playing]);

  const { sim, history } = run;
  const started = sim.t > 0;
  const status = started
    ? STATUS_TEXT[classifyStability(history)]
    : 'holding at release';
  const color = poleColor(sim.theta);
  const tip = tipPosition(sim.theta, ROD_PX, PIVOT);
  const payload = payloadPosition(sim.theta);
  const torque = controlTorque(sim, gains, PENDULUM_PARAMS);

  // Angle arc from the upright setpoint to the rod, plus its label placed
  // along the bisector. Hidden while the pole sits on the setpoint.
  const showArc = Math.abs(sim.theta) > 0.02;
  const arcEnd = {
    x: PIVOT.x + ARC_R * Math.sin(sim.theta),
    y: PIVOT.y - ARC_R * Math.cos(sim.theta),
  };
  const labelAt = {
    x: PIVOT.x + 60 * Math.sin(sim.theta / 2),
    y: PIVOT.y - 60 * Math.cos(sim.theta / 2),
  };

  const push = () => {
    setRun((prev) => ({ ...prev, sim: applyPush(prev.sim) }));
    if (!playing) setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    setGains({ ...DEFAULT_GAINS, kp: defaultKp });
    setRun({ sim: INITIAL_STATE, history: [INITIAL_STATE] });
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
      <div className="grid gap-4 sm:grid-cols-3">
        {GAIN_SPECS.map((spec) => (
          <div key={spec.id}>
            <label
              htmlFor={`${uid}-gain-${spec.id}`}
              className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
            >
              {spec.symbol} {spec.id === 'kp' ? 'proportional' : spec.id === 'ki' ? 'integral' : 'derivative'}
              <span
                className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
                data-testid={`pendulum-gain-${spec.id}-value`}
              >
                {gains[spec.id].toFixed(1)}
              </span>
            </label>
            <input
              id={`${uid}-gain-${spec.id}`}
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={gains[spec.id]}
              onChange={(e) =>
                setGains((g) => ({ ...g, [spec.id]: Number(e.target.value) }))
              }
              aria-label={`${spec.name} ${spec.symbol}, currently ${gains[
                spec.id
              ].toFixed(1)}`}
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
        aria-label={`Inverted pendulum with PID control. Pole angle ${formatDeg(
          sim.theta,
        )} degrees from upright, status ${status}.`}
        aria-describedby={descriptionId}
        data-testid="pendulum-scene"
        className="mt-4 block w-full"
      >
        {/* Ground with hatch ticks */}
        <line
          x1={56}
          y1={GROUND_Y + 0.5}
          x2={584}
          y2={GROUND_Y + 0.5}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        {Array.from({ length: 22 }, (_, i) => 76 + i * 22).map((x) => (
          <line
            key={x}
            x1={x}
            y1={GROUND_Y + 0.5}
            x2={x - 5}
            y2={GROUND_Y + 7}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}
        {/* Support post under the pivot */}
        <line
          x1={PIVOT.x}
          y1={PIVOT.y + 6}
          x2={PIVOT.x}
          y2={GROUND_Y}
          stroke="var(--color-border-strong)"
          strokeWidth={2}
        />
        {/* Upright setpoint */}
        <line
          x1={PIVOT.x}
          y1={PIVOT.y - 8}
          x2={PIVOT.x}
          y2={PIVOT.y - ROD_PX - 14}
          stroke="var(--color-text-dim)"
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.55}
        />
        {/* Angle arc from the setpoint to the rod */}
        {showArc ? (
          <path
            data-testid="pendulum-angle-arc"
            d={`M ${PIVOT.x} ${PIVOT.y - ARC_R} A ${ARC_R} ${ARC_R} 0 0 ${
              sim.theta > 0 ? 1 : 0
            } ${f(arcEnd.x)} ${f(arcEnd.y)}`}
            fill="none"
            stroke="var(--color-text-dim)"
            strokeWidth={1}
            opacity={0.7}
          />
        ) : null}
        {showArc ? (
          <text
            x={f(labelAt.x)}
            y={f(labelAt.y)}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {formatDeg(sim.theta)}°
          </text>
        ) : null}
        {/* Rod */}
        <line
          data-testid="pendulum-rod"
          x1={PIVOT.x}
          y1={PIVOT.y}
          x2={f(tip.x)}
          y2={f(tip.y)}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Off-center payload (the bias torque made visible) */}
        <circle
          data-testid="pendulum-payload"
          cx={f(payload.x)}
          cy={f(payload.y)}
          r={4.5}
          fill="var(--color-text-dim)"
        />
        {/* Tip mass */}
        <circle
          data-testid="pendulum-mass"
          cx={f(tip.x)}
          cy={f(tip.y)}
          r={15}
          fill={color}
        />
        {/* Pivot base, drawn over the rod end */}
        <path
          d={`M ${PIVOT.x - 11} ${PIVOT.y} L ${PIVOT.x} ${PIVOT.y - 10} L ${
            PIVOT.x + 11
          } ${PIVOT.y} Z`}
          fill="var(--color-surface-2)"
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={
            playing ? 'Pause the simulation' : 'Run the simulation'
          }
          className={cx(buttonBase, 'inline-flex items-center gap-1.5')}
        >
          {playing ? (
            <Pause size={12} weight="bold" aria-hidden />
          ) : (
            <Play size={12} weight="bold" aria-hidden />
          )}
          {playing ? 'Pause' : 'Run'}
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={push}
          aria-label="Push the pole with a fixed impulse"
          className={buttonBase}
        >
          Push
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          aria-label="Reset the simulation and restore default gains"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">angle</span>{' '}
        <span data-testid="pendulum-angle-readout" className="text-accent">
          {formatDeg(sim.theta)}°
        </span>{' '}
        <span className="text-text-dim">rate</span>{' '}
        <span data-testid="pendulum-rate-readout" className="text-text">
          {formatDeg(sim.thetaDot)}°/s
        </span>{' '}
        <span className="text-text-dim">integral</span>{' '}
        <span data-testid="pendulum-integral-readout" className="text-text">
          {sim.integral.toFixed(2)}
        </span>{' '}
        <span className="text-text-dim">torque</span>{' '}
        <span data-testid="pendulum-torque-readout" className="text-text">
          {torque.toFixed(1)} N·m
        </span>{' '}
        <span className="text-text-dim">status</span>{' '}
        <span
          data-testid="pendulum-status-readout"
          className={status === 'fallen' ? 'text-err' : 'text-text'}
        >
          {status}
        </span>
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current pendulum gains and regime"
        description={
          defaultKp === DEFAULT_GAINS.kp
            ? `Default gains Kp ${gains.kp.toFixed(1)}, Ki ${gains.ki.toFixed(1)} and Kd ${gains.kd.toFixed(1)} leave the lab pole ${status} at ${formatDeg(sim.theta)} degrees with torque ${torque.toFixed(1)} N·m; angle and status stay frozen until Run or Push.`
            : `The prediction-step pole starts at Kp ${gains.kp.toFixed(1)}, under the 9.81 mgl hold threshold, still ${formatDeg(sim.theta)} degrees off upright and ${status} so the prompt can be answered before playback.`
        }
        states={[
          { label: 'Kp', value: gains.kp.toFixed(1) },
          { label: 'Ki', value: gains.ki.toFixed(1) },
          { label: 'Kd', value: gains.kd.toFixed(1) },
          { label: 'angle', value: `${formatDeg(sim.theta)}°` },
          { label: 'status', value: status },
        ]}
      />

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        A point mass on a 1 m rod with torque applied at the pivot. The dot
        beside the tip mass is a payload bolted slightly off-center, a
        constant disturbance torque the loop must fight. Things worth
        trying: with the defaults the pole settles into a small steady lean,
        which is proportional-plus-derivative action reaching its limit;
        raise Ki and the integrator walks it back to vertical. Cut Kd toward
        zero and the recovery rings instead of settling. Drag Kp below 9.81,
        the mgl threshold for this plant, and no amount of damping can hold
        the pole up. The physics is exact and deterministic: the same gains
        always produce the same motion.
      </p>
    </div>
  );
}
