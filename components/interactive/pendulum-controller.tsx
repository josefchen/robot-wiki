'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  type PidGains,
  type PendulumState,
  type Stability,
} from '@/lib/pendulum';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { PartView } from '@/components/iso/part-view';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { Stage } from '@/components/iso/react/live';
import {
  DEG_PER_NM,
  PARTS,
  VIEW_BOX,
  WIDTH,
  gaugeNeedles,
  poleParts,
  shaftEnd,
  trailFor,
  type Part,
} from '@/components/iso/figures/pendulum-stand';

/**
 * PendulumController: a live PID lab on a torque-actuated inverted
 * pendulum, drawn as a balance stand (components/iso/figures/pendulum-stand.ts).
 * The pole is released 12 degrees off vertical with a small off-center
 * payload supplying a constant disturbance torque. A motor at the pivot
 * holds the pole in front of a round dial plate that reads the lean, and a
 * torque gauge beside it carries two needles from one zero: the short one
 * gravity's pull on the leaning pole, the long lit one the motor's push
 * back. "Correction strength" picks a
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

/**
 * Gravity's pull on the leaning pole with the side load it carries, in
 * newton-metres: m·g·l·sin(lean) plus the load's constant 0.8. The motor's
 * push must beat it to bring the pole back.
 */
export function gravityPull(theta: number): number {
  const { massKg, gravity, lengthM, biasTorque } = PENDULUM_PARAMS;
  return Math.abs(massKg * gravity * lengthM * Math.sin(theta) + biasTorque);
}

/** A lean in whole degrees, in words: "1 degree", "12 degrees". */
function degreesOff(theta: number): string {
  const deg = Math.round(Math.abs((theta * 180) / Math.PI));
  return `${deg} ${deg === 1 ? 'degree' : 'degrees'}`;
}

/** Parts in drawing order, grouped where consecutive parts share an id (the motor). */
const GROUPS = PARTS.reduce<{ id?: string; parts: Part[] }[]>((groups, part) => {
  const last = groups[groups.length - 1];
  if (last && part.kind !== 'slot' && last.id && last.id === part.id) last.parts.push(part);
  else groups.push({ id: part.kind === 'slot' ? undefined : part.id, parts: [part] });
  return groups;
}, []);

/** What the parts of the stand draw for the moving pole, the needles and the ink. */
function StandSlot({ part, theta, torque, pull, trail }: {
  part: Extract<Part, { kind: 'slot' }>;
  theta: number;
  torque: number;
  pull: number;
  trail: number[];
}) {
  if (part.slot === 'trail') {
    const ink = trailFor(trail);
    return ink ? (
      <g data-testid="pendulum-trail">
        <Line d={ink.d} tone="lo" />
        <Dots points={[ink.start]} size={0.9} tone="mid" />
      </g>
    ) : null;
  }
  if (part.slot === 'pole') {
    const pole = poleParts(theta);
    // The drawing carries no words; the stage status under it names the pole.
    return (
      <g data-series="pendulum-pole" data-series-labelled="" data-part="pole">
        <g data-testid="pendulum-rod">
          {pole.rod.map((p, i) => (p.kind === 'slot' ? null : <PartView key={i} part={p} />))}
        </g>
        <g data-testid="pendulum-mass">
          {pole.weight.map((p, i) => (p.kind === 'slot' ? null : <PartView key={i} part={p} />))}
        </g>
        {pole.hub.map((p, i) => (p.kind === 'slot' ? null : <PartView key={i} part={p} />))}
      </g>
    );
  }
  if (part.slot === 'index') {
    const { index } = poleParts(theta);
    return index.kind === 'line' ? (
      <g data-part="rotor-index">
        <Line d={index.d} tone="hi" />
        <Dots points={[shaftEnd]} size={0.9} tone="hi" />
      </g>
    ) : null;
  }
  const needles = gaugeNeedles(torque, pull);
  return (
    <g data-part="gauge-needles">
      <g data-testid="pendulum-gravity-arrow" data-pull-sweep-deg={needles.pull.sweepDeg.toFixed(2)}>
        <Solid paths={needles.pull.paths} tone="mid" />
      </g>
      <g data-testid="pendulum-push-arrow" data-push-sweep-deg={needles.push.sweepDeg.toFixed(2)}>
        <Solid paths={needles.push.paths} tone="hi" lit />
      </g>
      <Solid paths={needles.hub} tone="mid" />
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
  const torque = controlTorque(sim, gains, PENDULUM_PARAMS);
  // The takeaway names the gains "Default" only while they actually are
  // the defaults: the label follows the live sliders, not the mount, so
  // retuning Kp to 40 stops calling 40 the default.
  const gainsAtDefault =
    gains.kp === DEFAULT_GAINS.kp &&
    gains.ki === DEFAULT_GAINS.ki &&
    gains.kd === DEFAULT_GAINS.kd;

  const strength = STRENGTHS.find((option) => option.kp === gains.kp)?.id ?? null;
  // The weight's path over the last two seconds of the run, inked on the plate.
  const trail = started ? history.map((h) => h.theta) : [];
  // Gravity's pull on the leaning pole, with the side load it carries: the
  // torque the motor must beat, in newton-metres.
  const pull = gravityPull(sim.theta);
  const stageReadout = started ? (
    <>
      <span data-testid="pendulum-stage-status">{stageWord(classifyStability(history), sim.theta)}</span>
      {` · ${degreesOff(sim.theta)} off upright`}
    </>
  ) : (
    `Released ${degreesOff(sim.theta)} off upright`
  );

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
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Long needle: the motor's push. Short needle: gravity's pull."
          readout={stageReadout}
          status="Illustrative simulation: 1 kg on a 1 m pole"
          data-testid="pendulum-stage-frame"
        >
          <Stage className="iso-stage">
            <svg
              className="iso-svg"
              viewBox={VIEW_BOX}
              role="img"
              focusable="false"
              aria-label={`Inverted pendulum with PID control. Pole angle ${formatDeg(
                sim.theta,
              )} degrees from upright, status ${status}.`}
              aria-describedby={descriptionId}
              data-testid="pendulum-scene"
            >
              {GROUPS.map(({ id, parts }, index) => (
                <g key={index} data-testid={id === 'motor' ? 'pendulum-motor' : undefined}>
                  {parts.map((part, n) =>
                    part.kind === 'slot' ? (
                      <StandSlot key={part.slot} part={part} theta={sim.theta} torque={torque} pull={pull} trail={trail} />
                    ) : (
                      <PartView key={n} part={part} />
                    ),
                  )}
                </g>
              ))}
            </svg>
          </Stage>
        </AnatomyStage>
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
            {playing ? 'Pause' : 'Run'}
          </button>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the simulation and restore default gains"
          />
          {/* Quiet while the simulation runs, which rewrites it every tick; the stage speaks where it settles. */}
          <InstrumentReadout aria-live={playing ? 'off' : 'polite'} className="flex basis-full flex-wrap gap-x-3">
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
            25. On the gauge both needles sweep {DEG_PER_NM} degrees per N·m from one zero: the long one is the
            motor&apos;s torque, the short one gravity&apos;s pull on the leaning pole plus the load&apos;s 0.8 N·m, so
            the pole can only come back while the long needle is past the short one. On the dial plate a printed band
            marks upright within 10 degrees and another marks past 60 degrees, where the lab calls the pole fallen; the
            faint ink is the weight&apos;s path over the last two seconds. The balance problem follows Tedrake&apos;s
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
