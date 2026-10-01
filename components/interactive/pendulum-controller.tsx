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
import { MOTION_STAGE } from '@/lib/motion-tokens';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';

/**
 * PendulumController: a live PID lab on a torque-actuated inverted
 * pendulum. The pole is released 12 degrees off vertical with a small
 * off-center payload (the dot beside the tip mass) supplying a constant
 * disturbance torque, and the three gain sliders retune the loop while it
 * runs: default gains settle into a small steady lean, adding Ki walks the
 * pole back to vertical, cutting Kd toward zero leaves it ringing, and
 * dropping Kp below the mgl threshold (9.81) loses the pole entirely. Push
 * applies a fixed angular-velocity kick so a tuned loop can be disturbed on
 * demand. Reset restores the release state and the mount's initial gains.
 *
 * Interactive contract: fully deterministic physics (no randomness, fixed
 * substep, identical trajectories for identical inputs), native range
 * inputs and buttons (keyboard-accessible), visible readouts (angle, rate,
 * integral, torque, status), reset control, fixed SVG viewport (no layout
 * shift). Playback runs on an interval (not rAF) and degrades to coarse
 * discrete jumps under prefers-reduced-motion; nothing animates until the
 * user runs or pushes.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 226;
// The pivot sits on a support post well above the ground line, so the pole
// stays fully in frame in every regime: upright, hanging straight down, or
// tumbling through.
const GROUND_Y = 214;
const PIVOT = { x: WIDTH / 2, y: 108 };
const ROD_PX = 92;
const ROD_WIDTH = CHART_STROKE.trace * 1.25;
const MASS_R = 9;
const PAYLOAD_R = 3;
const ARC_R = 26;

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

const GAIN_WORD: Record<keyof PidGains, string> = {
  kp: 'proportional',
  ki: 'integral',
  kd: 'derivative',
};

/** Past this lean the plant is treated as fallen rather than recovering. */
const FALL_LINE_RAD = Math.PI / 3;

/** The off-center payload rides just outside the tip mass, across the rod. */
function payloadPosition(theta: number): { x: number; y: number } {
  const tip = tipPosition(theta, ROD_PX, PIVOT);
  const offset = MASS_R + PAYLOAD_R + 1.5;
  return { x: tip.x + offset * Math.cos(theta), y: tip.y + offset * Math.sin(theta) };
}

/** Ground, its hatch ticks and the support post under the pivot. */
function PendulumSupport() {
  return (
    <g data-scene-structure="pendulum-support" stroke={CHART_STRUCTURE.axes}>
      <line
        x1={34}
        y1={GROUND_Y + 0.5}
        x2={306}
        y2={GROUND_Y + 0.5}
        strokeWidth={CHART_STROKE.structure}
      />
      <g opacity={CHART_STRUCTURE.axesOpacity}>
        {Array.from({ length: 21 }, (_, i) => 46 + i * 13).map((x) => (
          <line
            key={x}
            x1={x}
            y1={GROUND_Y + 0.5}
            x2={x - 4}
            y2={GROUND_Y + 5}
            strokeWidth={CHART_STROKE.structure}
          />
        ))}
        <line
          x1={PIVOT.x}
          y1={PIVOT.y + 5}
          x2={PIVOT.x}
          y2={GROUND_Y}
          strokeWidth={CHART_STROKE.trace}
        />
      </g>
    </g>
  );
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
  // useId-derived input ids: two mounts on one page must never share ids,
  // or the labels would cross-bind between them.
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
  // Reduced motion tracked reactively, not read once at play time. A
  // one-shot read can go stale before or during playback (the setting
  // can land after hydration, or change mid-run), and a cadence captured
  // from it would keep animating smoothly under prefers-reduced-motion
  // for the rest of the playback with nothing to correct it.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
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
  // fixed PHYSICS_DT substeps regardless of tick size. The cadence
  // combines the tracked state with a fresh read at timer start, and the
  // tracked state sits in the deps so a mid-playback media change
  // rebuilds the timer at the correct cadence. Cleanup on pause or
  // unmount.
  useEffect(() => {
    if (!playing) return;
    const { tickMs, simSecondsPerTick } = playbackCadence(
      reducedMotion || prefersReducedMotion(),
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
  }, [playing, reducedMotion]);

  const { sim, history } = run;
  const started = sim.t > 0;
  const status = started
    ? STATUS_TEXT[classifyStability(history)]
    : 'holding at release';
  const pastFallLine = Math.abs(sim.theta) > FALL_LINE_RAD;
  const tip = tipPosition(sim.theta, ROD_PX, PIVOT);
  const payload = payloadPosition(sim.theta);
  const torque = controlTorque(sim, gains, PENDULUM_PARAMS);
  // The takeaway names the gains "Default" only while they actually are
  // the defaults: the label follows the live sliders, not the mount, so
  // retuning Kp to 40 stops calling 40 the default.
  const gainsAtDefault =
    gains.kp === DEFAULT_GAINS.kp &&
    gains.ki === DEFAULT_GAINS.ki &&
    gains.kd === DEFAULT_GAINS.kd;

  // Angle arc from the upright setpoint to the rod, hidden while the pole
  // sits on the setpoint.
  const showArc = Math.abs(sim.theta) > 0.02;
  const arcEnd = {
    x: PIVOT.x + ARC_R * Math.sin(sim.theta),
    y: PIVOT.y - ARC_R * Math.cos(sim.theta),
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

  const state = roleColour('state');

  const gainSliders = GAIN_SPECS.map((spec) => (
    <ControlField key={spec.id}>
      <ControlLabel
        htmlFor={`${uid}-gain-${spec.id}`}
        value={
          <span data-testid={`pendulum-gain-${spec.id}-value`}>
            {gains[spec.id].toFixed(1)}
          </span>
        }
      >
        {spec.symbol} {GAIN_WORD[spec.id]}
      </ControlLabel>
      <input
        id={`${uid}-gain-${spec.id}`}
        type="range"
        data-brand-control-id="control:input"
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
        className={INSTRUMENT_SLIDER_CLASS}
      />
    </ControlField>
  ));

  // The stage is written before the controls so the accessible-name
  // expressions keep the source order the sealed baseline numbers them by.
  return (
    <InstrumentFigure
      figureId="pendulum-controller"
      className={className}
      heading="Inverted pendulum under PID control"
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="pendulum-pole" swatch={<LegendSwatch role="state" mark="line" />}>
                  pole and tip mass
                </LegendItem>
                <LegendItem series="pendulum-payload" swatch={<LegendSwatch role="state" mark="dot" />}>
                  off-center payload
                </LegendItem>
                <LegendItem series="pendulum-setpoint" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  upright setpoint
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="flex flex-wrap gap-x-3">
                <span>
                  angle{' '}
                  <span data-testid="pendulum-angle-readout" style={{ color: state }}>
                    {formatDeg(sim.theta)}°
                  </span>
                </span>
                <span>
                  rate{' '}
                  <span data-testid="pendulum-rate-readout">{formatDeg(sim.thetaDot)}°/s</span>
                </span>
                <span>
                  integral{' '}
                  <span data-testid="pendulum-integral-readout">{sim.integral.toFixed(2)}</span>
                </span>
                <span>
                  torque{' '}
                  <span data-testid="pendulum-torque-readout">{torque.toFixed(1)} N·m</span>
                </span>
                <span>
                  status{' '}
                  <span
                    data-testid="pendulum-status-readout"
                    style={status === 'fallen' ? { color: roleColour('constraint') } : undefined}
                  >
                    {status}
                  </span>
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current pendulum gains and regime"
                description={
                  defaultKp === DEFAULT_GAINS.kp
                    ? `${gainsAtDefault ? 'Default gains' : 'Retuned gains'} Kp ${gains.kp.toFixed(1)}, Ki ${gains.ki.toFixed(1)} and Kd ${gains.kd.toFixed(1)} leave the lab pole ${status} at ${formatDeg(sim.theta)} degrees with torque ${torque.toFixed(1)} N·m; angle and status ${playing ? 'update on every playback tick' : 'stay frozen until Run or Push'}.`
                    : // The threshold clause branches on the live Kp against
                      // PENDULUM_PARAMS.gravity (with massKg = lengthM = 1 the
                      // mgl hold threshold equals g): a Kp dragged past the
                      // threshold must not be described as under it. "starts at"
                      // holds only while the reader has not moved the mount's
                      // own initial gain. The load-state sentence (Kp 9.5 on the
                      // control page) is byte-identical to the pre-branch text.
                      `The prediction-step pole ${
                        gains.kp === defaultKp ? 'starts at' : 'now sits at'
                      } Kp ${gains.kp.toFixed(1)}, ${
                        gains.kp < PENDULUM_PARAMS.gravity
                          ? `under the ${PENDULUM_PARAMS.gravity.toFixed(2)} mgl hold threshold`
                          : `above the ${PENDULUM_PARAMS.gravity.toFixed(2)} mgl hold threshold where the loop can hold it`
                      }, still ${formatDeg(sim.theta)} degrees off upright and ${status} so the prompt can be answered before playback.`
                }
                states={[
                  { label: 'Kp', value: gains.kp.toFixed(1) },
                  { label: 'Ki', value: gains.ki.toFixed(1) },
                  { label: 'Kd', value: gains.kd.toFixed(1) },
                  { label: 'angle', value: `${formatDeg(sim.theta)}°` },
                  { label: 'status', value: status },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Inverted pendulum with PID control. Pole angle ${formatDeg(
              sim.theta,
            )} degrees from upright, status ${status}.`}
            aria-describedby={descriptionId}
            data-testid="pendulum-scene"
          >
            <PendulumSupport />
            <g data-series="pendulum-setpoint" data-chart-role="reference">
              <line
                x1={PIVOT.x}
                y1={PIVOT.y - 6}
                x2={PIVOT.x}
                y2={PIVOT.y - ROD_PX - 10}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
            </g>
            {showArc ? (
              <g data-scene-structure="pendulum-angle">
                <path
                  data-testid="pendulum-angle-arc"
                  d={`M ${PIVOT.x} ${PIVOT.y - ARC_R} A ${ARC_R} ${ARC_R} 0 0 ${
                    sim.theta > 0 ? 1 : 0
                  } ${f(arcEnd.x)} ${f(arcEnd.y)}`}
                  fill="none"
                  stroke={CHART_STRUCTURE.labelSecondary}
                  strokeWidth={CHART_STROKE.structure}
                />
              </g>
            ) : null}
            {/* Past the fall line the rod breaks into dashes and the tip mass
                opens into a broken ring, so the failed regime reads from the
                shape as well as from the status readout. */}
            <g data-series="pendulum-pole" data-chart-role="state">
              <line
                data-testid="pendulum-rod"
                x1={PIVOT.x}
                y1={PIVOT.y}
                x2={f(tip.x)}
                y2={f(tip.y)}
                stroke={state}
                strokeWidth={ROD_WIDTH}
                strokeLinecap="round"
                strokeDasharray={pastFallLine ? CHART_STROKE.dash : undefined}
              />
              <circle
                data-testid="pendulum-mass"
                cx={f(tip.x)}
                cy={f(tip.y)}
                r={MASS_R}
                fill={pastFallLine ? MOTION_STAGE.background : state}
                stroke={state}
                strokeWidth={pastFallLine ? CHART_STROKE.trace : 0}
                strokeDasharray={pastFallLine ? '5 3' : undefined}
              />
            </g>
            <g data-series="pendulum-payload" data-chart-role="state">
              <circle
                data-testid="pendulum-payload"
                cx={f(payload.x)}
                cy={f(payload.y)}
                r={PAYLOAD_R}
                fill={state}
              />
            </g>
            <g data-scene-structure="pendulum-pivot">
              <path
                d={`M ${PIVOT.x - 7} ${PIVOT.y + 1} L ${PIVOT.x} ${PIVOT.y - 6} L ${
                  PIVOT.x + 7
                } ${PIVOT.y + 1} Z`}
                fill={MOTION_STAGE.background}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
              />
            </g>
          </PlotStage>
        </FigureStage>
      }
      controls={
        <>
          {gainSliders}
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={
              playing ? 'Pause the simulation' : 'Run the simulation'
            }
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {playing ? (
              <Pause size={14} weight="bold" aria-hidden />
            ) : (
              <Play size={14} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Run'}
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={push}
            aria-label="Push the pole with a fixed impulse"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Push
          </button>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the simulation and restore default gains"
          />
        </>
      }
      caption="Below Kp 9.81, the mgl threshold of this plant, no setting of Ki or Kd keeps the pole up."
      source="Deterministic schematic simulation: a 1 kg point mass on a 1 m rod, torque applied at the pivot, and an off-center payload as a constant disturbance."
    />
  );
}
