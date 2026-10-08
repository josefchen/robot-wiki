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
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';

/**
 * PendulumController: a live PID lab on a torque-actuated inverted
 * pendulum. The pole is released 12 degrees off vertical with a small
 * off-center payload supplying a constant disturbance torque. The stage
 * draws the motor at the pivot with a curved push-back arrow sized by its
 * torque, and gravity's pull at the tip. "Correction strength" picks a
 * proportional gain just under gravity's pull (9.5) or the stock 25 and
 * releases the pole; "Give it a push" applies a fixed angular-velocity
 * kick. The three gain sliders, Run and Reset sit in "Adjust more": default
 * gains settle into a small steady lean, adding Ki walks the pole back to
 * vertical, cutting Kd toward zero leaves it ringing, a Kp just under the
 * mgl threshold (9.81) lets the pole sag to a steep lean, and a Kp well
 * under it loses the pole entirely. Reset restores the release state and
 * the mount's initial gains.
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
// tumbling through. It stands right of centre so the note fits on the left.
const GROUND_Y = 214;
const PIVOT = { x: 196, y: 116 };
const ROD_PX = 92;
const ROD_WIDTH = CHART_STROKE.trace * 1.5;
const MASS_R = 10;
const MOTOR_R = 11;
const PUSH_ARC_R = 25;
/** How far beyond the push arc its word sits, so the word never touches the arc or the rod. */
const PUSH_WORD_R = PUSH_ARC_R + 14;

/** Degrees of push-back arc per newton-metre of motor torque. */
const PUSH_ARC_DEG_PER_NM = 9;
const GRAVITY_ARROW_PX = 32;

type StrengthId = 'gentle' | 'enough';
const STRENGTHS: readonly (Preset<StrengthId> & { kp: number })[] = [
  { id: 'gentle', label: 'Too gentle', kp: 9.5 },
  { id: 'enough', label: 'Strong enough', kp: DEFAULT_GAINS.kp },
];

/** The regime in the words a reader would use, shown on the stage once the pole moves. */
const STAGE_WORD: Record<Stability, string> = {
  settled: 'balanced',
  settling: 'settling',
  oscillating: 'swinging',
  fallen: 'fallen over',
};
/**
 * Just under the threshold the P term is linear in the lean while gravity
 * grows with its sine, so the pole comes to rest well off upright (about
 * 50 degrees at Kp 9.5). The status still reads settled; the stage must not
 * call that balanced.
 */
const BALANCED_LEAN_RAD = (10 * Math.PI) / 180;
function stageWord(stability: Stability, theta: number): string {
  if (stability === 'settled' && Math.abs(theta) > BALANCED_LEAN_RAD) return 'stuck leaning';
  return STAGE_WORD[stability];
}

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** The note's arrow runs from beside the note to the motor's rim. */
const NOTE_FROM = [162, 141] as const;
const NOTE_TARGET = (() => {
  const [fx, fy] = NOTE_FROM;
  const d = Math.hypot(PIVOT.x - fx, PIVOT.y - fy);
  const rim = MOTOR_R + 2;
  return [f(PIVOT.x - ((PIVOT.x - fx) / d) * rim), f(PIVOT.y - ((PIVOT.y - fy) / d) * rim)] as const;
})();

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

/** What each gain does, in the words of its slider label. */
const GAIN_LABEL: Record<keyof PidGains, string> = {
  kp: 'React to the lean (P)',
  ki: 'Fix lingering drift (I)',
  kd: 'Calm the swing (D)',
};

/** Past this lean the plant is treated as fallen rather than recovering. */
const FALL_LINE_RAD = Math.PI / 3;

/** A point on a circle round the pivot, `angle` measured clockwise from straight up. */
function aroundPivot(angle: number, radius: number): [number, number] {
  return [f(PIVOT.x + radius * Math.sin(angle)), f(PIVOT.y - radius * Math.cos(angle))];
}

/** An arrowhead at (x, y) pointing along the unit direction (dx, dy). */
function arrowHead(x: number, y: number, dx: number, dy: number): string {
  return [
    [x + dx * 4, y + dy * 4],
    [x - dx * 6 - dy * 4.5, y - dy * 6 + dx * 4.5],
    [x - dx * 6 + dy * 4.5, y - dy * 6 - dx * 4.5],
  ].map(([px, py]) => `${f(px)},${f(py)}`).join(' ');
}

/** Ground, its hatch ticks and the post under the motor. */
function PendulumSupport() {
  return (
    <g data-scene-structure="pendulum-support" stroke={CHART_STRUCTURE.axes}>
      <line x1={34} y1={GROUND_Y + 0.5} x2={306} y2={GROUND_Y + 0.5} strokeWidth={CHART_STROKE.structure} />
      <g opacity={CHART_STRUCTURE.axesOpacity}>
        {Array.from({ length: 21 }, (_, i) => 46 + i * 13).map((x) => (
          <line key={x} x1={x} y1={GROUND_Y + 0.5} x2={x - 4} y2={GROUND_Y + 5} strokeWidth={CHART_STROKE.structure} />
        ))}
        <rect x={PIVOT.x - 4} y={PIVOT.y + MOTOR_R} width={8} height={GROUND_Y - PIVOT.y - MOTOR_R} fill={CHART_STRUCTURE.axes} stroke="none" />
      </g>
    </g>
  );
}

/**
 * The motor at the pivot and its push on the pole: an arc from the rod
 * toward upright whose length grows with the motor's torque.
 */
function MotorPush({ theta, torque }: { theta: number; torque: number }) {
  const colour = roleColour('highlight');
  const sweep = (Math.min(Math.abs(torque) * PUSH_ARC_DEG_PER_NM, 160) * Math.PI) / 180;
  const turn = Math.sign(torque);
  const end = theta + turn * sweep;
  const [x0, y0] = aroundPivot(theta, PUSH_ARC_R);
  const [x1, y1] = aroundPivot(end, PUSH_ARC_R);
  return (
    <g data-testid="pendulum-motor">
      <circle cx={PIVOT.x} cy={PIVOT.y} r={MOTOR_R} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.trace} />
      {Math.abs(torque) > 0.05 ? (
        <g data-testid="pendulum-push-arrow" data-chart-role="highlight" data-push-sweep-deg={f((sweep * 180) / Math.PI)}>
          <path
            d={`M ${x0} ${y0} A ${PUSH_ARC_R} ${PUSH_ARC_R} 0 ${sweep > Math.PI ? 1 : 0} ${turn > 0 ? 1 : 0} ${x1} ${y1}`}
            fill="none"
            stroke={colour}
            strokeWidth={CHART_STROKE.trace}
            strokeLinecap="round"
          />
          <polygon points={arrowHead(x1, y1, turn * Math.cos(end), turn * Math.sin(end))} fill={colour} />
          <PushWord angle={end} colour={colour} />
        </g>
      ) : null}
    </g>
  );
}

/**
 * The word "push" past the arrowhead, on the side the arrow points to, so a
 * reader sees the small arrow is the motor's push.
 */
function PushWord({ angle, colour }: { angle: number; colour: string }) {
  const [x, y] = aroundPivot(angle, PUSH_WORD_R);
  return (
    <text
      data-testid="pendulum-push-word"
      x={x}
      y={f(y + CHART_TYPE.labelPx * 0.35)}
      textAnchor={x < PIVOT.x ? 'end' : 'start'}
      fontSize={CHART_TYPE.labelPx}
      fill={colour}
    >
      push
    </text>
  );
}

/** Gravity's pull at the tip mass, drawn while the mass is above the pivot. */
function GravityPull({ tip }: { tip: { x: number; y: number } }) {
  const colour = CHART_STRUCTURE.labelSecondary;
  const top = tip.y + MASS_R + 3;
  const bottom = top + GRAVITY_ARROW_PX;
  return (
    <g data-testid="pendulum-gravity-arrow">
      <line x1={f(tip.x)} y1={f(top)} x2={f(tip.x)} y2={f(bottom - 4)} stroke={colour} strokeWidth={CHART_STROKE.trace} />
      <polygon points={arrowHead(f(tip.x), f(bottom - 4), 0, 1)} fill={colour} />
      <DirectLabel x={f(tip.x + 9)} y={f(bottom - 6)}>
        gravity
      </DirectLabel>
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
  const torque = controlTorque(sim, gains, PENDULUM_PARAMS);
  // The takeaway names the gains "Default" only while they actually are
  // the defaults: the label follows the live sliders, not the mount, so
  // retuning Kp to 40 stops calling 40 the default.
  const gainsAtDefault =
    gains.kp === DEFAULT_GAINS.kp &&
    gains.ki === DEFAULT_GAINS.ki &&
    gains.kd === DEFAULT_GAINS.kd;

  const strength = STRENGTHS.find((option) => option.kp === gains.kp)?.id ?? null;
  // The tip's path over the last two seconds of the run.
  const trail = started
    ? history.map((h) => tipPosition(h.theta, ROD_PX, PIVOT)).map((p) => `${f(p.x)},${f(p.y)}`).join(' ')
    : '';

  const push = () => {
    setRun((prev) => ({ ...prev, sim: applyPush(prev.sim) }));
    if (!playing) setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    setGains({ ...DEFAULT_GAINS, kp: defaultKp });
    setRun({ sim: INITIAL_STATE, history: [INITIAL_STATE] });
  };

  // A strength is a fresh trial: the pole goes back to its release and runs.
  const chooseStrength = (id: StrengthId) => {
    setGains((g) => ({ ...g, kp: STRENGTHS.find((option) => option.id === id)!.kp }));
    setRun({ sim: INITIAL_STATE, history: [INITIAL_STATE] });
    setPlaying(true);
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
        {GAIN_LABEL[spec.id]}
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
        aria-label={`${GAIN_LABEL[spec.id]}: ${spec.name.toLowerCase()} ${spec.symbol}, currently ${gains[
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
      kicker="PID control"
      heading="Push back harder than gravity to keep the pole upright"
      stage={
        <FigureStage>
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
                y1={PIVOT.y - MOTOR_R - 3}
                x2={PIVOT.x}
                y2={PIVOT.y - ROD_PX - 12}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
            </g>
            <DirectLabel x={PIVOT.x - 8} y={PIVOT.y - ROD_PX - 2} anchor="end">
              upright
            </DirectLabel>
            {trail ? (
              <polyline
                data-testid="pendulum-trail"
                points={trail}
                fill="none"
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.structure}
                opacity={0.7}
              />
            ) : null}
            <MotorPush theta={sim.theta} torque={torque} />
            {/* Past the fall line the rod breaks into dashes and the tip mass
                opens into a broken ring, so the failed regime reads from the
                shape as well as from the status word. */}
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
            <circle cx={PIVOT.x} cy={PIVOT.y} r={3} fill={CHART_STRUCTURE.axes} />
            {Math.abs(sim.theta) < Math.PI / 2 ? <GravityPull tip={tip} /> : null}
            {started ? (
              <DirectLabel x={WIDTH - 8} y={22} anchor="end" role={status === 'fallen' ? 'constraint' : undefined}>
                <tspan data-testid="pendulum-stage-status">{stageWord(classifyStability(history), sim.theta)}</tspan>
              </DirectLabel>
            ) : null}
            <StageAnnotation
              x={8}
              y={146}
              lines={['Gravity tips it over;', 'the motor at the base', 'pushes back']}
              target={NOTE_TARGET}
              from={NOTE_FROM}
              pointer="arrow"
            />
          </PlotStage>
        </FigureStage>
      }
      controls={
        <>
          <PresetGroup
            label="How hard the motor pushes back"
            presets={STRENGTHS}
            value={strength}
            onChange={chooseStrength}
            testId="pendulum-strength"
          />
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={push}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Give it a push
          </button>
        </>
      }
      adjust={
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
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the simulation and restore default gains"
          />
          <InstrumentReadout className="flex basis-full flex-wrap gap-x-3">
            <span>
              angle{' '}
              <span data-testid="pendulum-angle-readout" style={{ color: state }}>
                {formatDeg(sim.theta)}°
              </span>
            </span>
            <span>
              rate <span data-testid="pendulum-rate-readout">{formatDeg(sim.thetaDot)}°/s</span>
            </span>
            <span>
              integral <span data-testid="pendulum-integral-readout">{sim.integral.toFixed(2)}</span>
            </span>
            <span>
              torque <span data-testid="pendulum-torque-readout">{torque.toFixed(1)} N·m</span>
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
        </>
      }
      caption="Balancing robots constantly measure their lean and push back; if the push is too gentle, nothing else can save them."
      method={
        <>
          <p>
            A deterministic simulation: a 1 kg point mass on a massless 1 m rod, released 12 degrees off upright,
            with the motor&apos;s torque applied at the pivot and capped at 40 N·m. A small off-centre load adds a
            constant 0.8 N·m that tips the pole right. The motor pushes back with u = −(Kp·θ + Ki·∫θ + Kd·θ̇): P
            reacts to the lean, I removes the steady lean the load leaves, and D damps the swing. Linearised about
            upright, the pole can only be held upright when Kp exceeds m·g·l = {PENDULUM_PARAMS.gravity.toFixed(2)}{' '}
            N·m per radian, so below it no I or D setting helps. Too gentle sets Kp to 9.5: the pole sags until the
            motor&apos;s push matches gravity&apos;s pull, about 50 degrees off upright. Strong enough sets the stock
            25. The push-back arc grows {PUSH_ARC_DEG_PER_NM} degrees per N·m of motor torque, and the faint trail
            is the tip&apos;s path over the last two seconds. The balance problem follows Tedrake&apos;s
            Underactuated Robotics, chapters 2 and 3; the PID structure follows Åström and Murray&apos;s Feedback
            Systems.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current pendulum gains and regime"
            description={
              defaultKp === DEFAULT_GAINS.kp
                ? `${gainsAtDefault ? 'Default gains' : 'Retuned gains'} Kp ${gains.kp.toFixed(1)}, Ki ${gains.ki.toFixed(1)} and Kd ${gains.kd.toFixed(1)} leave the lab pole ${status} at ${formatDeg(sim.theta)} degrees with torque ${torque.toFixed(1)} N·m; angle and status ${playing ? 'update on every playback tick' : 'stay frozen until Run or Give it a push'}.`
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
    />
  );
}
