'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage, type AnatomyKey } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { useEasedValue } from '@/components/motion/use-eased-value';
import {
  NEEDLE_ZERO_DEG,
  RANGE_M,
  SPRING_TURNS,
  START_X,
  UNITS_PER_M,
  agilityKnobDegrees,
  buildCorridor,
  delayKnobDegrees,
  needleDegrees,
  throwShare,
  wheelDegrees,
  type CorridorLane,
  type Part,
} from '@/components/iso/figures/latency-corridor';
import {
  AGILITY_STEPS,
  DEFAULT_AGILITY,
  DEFAULT_LATENCY_MS,
  INTERACTIVE_MAX_LATENCY_MS,
  OBSTACLE_RADIUS_M,
  SENSORS,
  formatSeconds,
  formatSpeed,
  latencyOutcome,
} from '@/lib/aerial-latency';

/**
 * PerceptionLatency: how fast is too fast, for the adjacent/drones module.
 * Reproduces the sense-and-avoid analysis of Falanga, Kim, and Scaramuzza
 * (RA-L 2019) as a flight-test corridor (components/iso/figures/latency-corridor.ts).
 *
 * A quadrotor rides a test carriage toward a brick wall. The light gate 8
 * metres out is where its camera first sees the wall. The timer wheel on the
 * carriage is set to the camera's delay: the gate starts it, and only when
 * it has run down is the cross-slide released, so the spring pack throws the
 * drone sideways as hard as the airframe can swerve. The gauge board in
 * front reads the 8 metres at the fastest safe speed: the stretch flown
 * blind, speed x delay (the one lit part), then the swerve, which ends
 * exactly at the wall, the model's equality case (lib/aerial-latency). The
 * dial on the console reads that speed.
 *
 * The still pose is the drone at the gate, the moment it sees the wall.
 * "Fly the corridor" runs it once at its top safe speed, slowed down for the
 * eye; reduced motion keeps the still pose.
 */

const f = (v: number) => Number(v.toFixed(2));
const kmh = (ms: number) => Math.round(ms * 3.6);
const metres = (m: number) => `${m.toFixed(1)} metres`;
const G = 9.81;
/** The run is slowed this many times so the eye can follow it. */
export const SLOW = 10;
/** How long the drone rests at the wall before the rig resets, in seconds. */
const HOLD_S = 1.2;
/** How long the rig takes to roll back to the gate, in seconds. */
const RESET_S = 1.1;
/**
 * The keys under the drawing: they name both gauge riders. The two are
 * like-shaped slabs end to end, so the swerve's dashed outline, not the
 * lit tint alone, is what tells them apart without colour.
 */
export const RIDER_KEYS: readonly AnatomyKey[] = [
  { series: 'perception-latency', words: 'Lit: flown before the camera reports' },
  { series: 'avoidance-maneuver', words: 'Dashed: swerve' },
];

type CameraId = 'stereo' | 'event' | 'custom';
type AgilityId = `${(typeof AGILITY_STEPS)[number]}`;

const STEREO = SENSORS[0];
const EVENT = SENSORS[1];

const CAMERA_PRESETS: { id: CameraId; label: string }[] = [
  { id: 'stereo', label: 'Ordinary camera (7 hundredths of a second)' },
  { id: 'event', label: 'Faster camera (about 1 hundredth)' },
];

const AGILITY_NAMES: Record<AgilityId, string> = {
  '10': 'Gentle',
  '25': 'Standard (the study’s)',
  '50': 'Hard',
  '200': 'Extreme',
};

const AGILITY_PRESETS = AGILITY_STEPS.map((u) => ({
  id: String(u) as AgilityId,
  label: AGILITY_NAMES[String(u) as AgilityId],
}));

const cameraFor = (latencyMs: number): CameraId =>
  latencyMs === Math.round(STEREO.latencyS * 1000)
    ? 'stereo'
    : latencyMs === Math.round(EVENT.latencyS * 1000)
      ? 'event'
      : 'custom';

const CAMERA_WORDS: Record<CameraId, string> = { stereo: 'Ordinary camera', event: 'Faster camera', custom: '' };
const SWERVE_WORDS: Record<AgilityId, string> = { '10': 'gentle swerve', '25': 'standard swerve', '50': 'hard swerve', '200': 'extreme swerve' };

/** The corridor at the fastest safe speed: the blind stretch, the swerve stretch and the speed. */
export function corridorAt(latencyMs: number, agility: number) {
  const latencyS = latencyMs / 1000;
  const outcome = latencyOutcome(latencyS, agility, STEREO.rangeM);
  const blindM = outcome.maxSpeedMs * latencyS;
  return {
    outcome,
    blindM,
    swerveM: Math.max(0, STEREO.rangeM - blindM),
    speedKmh: kmh(outcome.maxSpeedMs),
  };
}

/**
 * One run of the corridor at its top safe speed, `t` real seconds after it
 * starts (the page plays it SLOW times slower). The carriage starts START_X
 * before the gate and flies at the top safe speed; the gate starts the timer,
 * the timer runs down for the camera's delay, then the swerve throws the
 * drone sideways for 2 sqrt(r / u). Its share of the throw reaches 1 exactly
 * as the drone reaches the wall, because the speed is the model's maximum.
 */
export function runAt(t: number, latencyMs: number, agility: number) {
  const { outcome } = corridorAt(latencyMs, agility);
  const v = outcome.maxSpeedMs;
  const startM = START_X / UNITS_PER_M;
  const xM = Math.min(RANGE_M, startM + v * Math.max(0, t));
  const tGate = -startM / v;
  const latencyS = latencyMs / 1000;
  const released = t - tGate - latencyS;
  const timerLeftMs = t < tGate ? latencyMs : Math.max(0, latencyMs - (t - tGate) * 1000);
  const share = released <= 0 ? 0 : throwShare(released / outcome.avoidanceTimeS);
  const done = t >= tGate + latencyS + outcome.avoidanceTimeS;
  return { xM, timerLeftMs, share, done, duration: tGate + latencyS + outcome.avoidanceTimeS };
}

const RIG = buildCorridor({ tracks: 1 });
const LANE: CorridorLane = RIG.lanes[0];
const FACE = RIG.DIAL_FACE;

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  return (
    <g>
      <path className="iso-fill" d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.fill} d={part.d} />}
    </g>
  );
}

/** The static parts of a list, keyed by their index; the slots are filled by the caller. */
function staticRun(parts: Part[], slot: (name: string) => ReactNode) {
  return parts.map((part, index) => (part.kind === 'slot' ? <g key={part.slot}>{slot(part.slot)}</g> : <PartView key={index} part={part} />));
}

interface Refs {
  carriage: SVGGElement | null;
  slider: SVGGElement | null;
  coilBack: SVGPathElement | null;
  coilFront: SVGPathElement | null;
  wheel: SVGGElement | null;
  props: Array<SVGGElement | null>;
}

export function PerceptionLatency({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [latencyMs, setLatencyMs] = useState(DEFAULT_LATENCY_MS);
  const [agility, setAgility] = useState<number>(DEFAULT_AGILITY);
  const [running, setRunning] = useState(false);

  const rangeM = STEREO.rangeM;
  const latencyS = latencyMs / 1000;
  const { outcome, blindM, swerveM, speedKmh } = corridorAt(latencyMs, agility);
  const ttc = outcome.timeToContactS;
  const tAvoid = outcome.avoidanceTimeS;
  const speed = outcome.maxSpeedMs;
  const camera = cameraFor(latencyMs);
  const agilityName = AGILITY_NAMES[String(agility) as AgilityId] ?? `${agility}`;
  const detent = Math.max(0, AGILITY_STEPS.indexOf(agility as (typeof AGILITY_STEPS)[number]));

  // The settings ease: the riders slide, the needle swings, the knobs and the wheel turn.
  const shownBlind = useEasedValue(blindM);
  const shownKmh = useEasedValue(speed * 3.6);
  const shownDelay = useEasedValue(latencyMs);
  const shownDetent = useEasedValue(detent);
  const riders = RIG.ridersAt(0, shownBlind, rangeM - shownBlind);

  const refs = useRef<Refs>({ carriage: null, slider: null, coilBack: null, coilFront: null, wheel: null, props: [] });
  const turns = SPRING_TURNS[detent] ?? SPRING_TURNS[1];
  const settings = useRef({ latencyMs, agility, turns });
  useEffect(() => {
    settings.current = { latencyMs, agility, turns };
  }, [latencyMs, agility, turns]);

  useEffect(() => {
    if (!running) return;
    const r = refs.current;
    const { latencyMs: ms, agility: u, turns: coilTurns } = settings.current;
    const total = runAt(0, ms, u).duration;
    let frame = 0;
    let last = performance.now();
    let clock = 0;
    let spin = 0;
    const place = (xM: number, share: number, timerMs: number) => {
      r.carriage?.setAttribute('transform', RIG.carriageShift(xM * UNITS_PER_M));
      r.slider?.setAttribute('transform', RIG.sliderShift(share));
      const coil = RIG.coilAt(0, share, coilTurns);
      r.coilBack?.setAttribute('d', coil.back);
      r.coilFront?.setAttribute('d', coil.front);
      r.wheel?.setAttribute('transform', `rotate(${f(wheelDegrees(timerMs))})`);
    };
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      clock += dt / SLOW;
      spin = (spin + dt * 900) % 360;
      r.props.forEach((node, k) => node?.setAttribute('transform', `rotate(${f(spin + k * 47)})`));
      if (clock <= total) {
        const run = runAt(clock, ms, u);
        place(run.xM, run.share, run.timerLeftMs);
      } else {
        // Hold at the wall, then roll back to the gate and re-cock the slide.
        const back = Math.min(1, Math.max(0, (clock * SLOW - total * SLOW - HOLD_S) / RESET_S));
        const ease = back * back * (3 - 2 * back);
        place(RANGE_M * (1 - ease), 1 - ease, ms * ease);
        if (back >= 1) {
          setRunning(false);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // Any setting, or stopping, puts the rig back in its still pose: the drone at the gate.
  useEffect(() => {
    if (running) return;
    const r = refs.current;
    r.carriage?.setAttribute('transform', RIG.carriageShift(0));
    r.slider?.setAttribute('transform', RIG.sliderShift(0));
    const coil = RIG.coilAt(0, 0, settings.current.turns);
    r.coilBack?.setAttribute('d', coil.back);
    r.coilFront?.setAttribute('d', coil.front);
    r.wheel?.setAttribute('transform', `rotate(${f(wheelDegrees(settings.current.latencyMs))})`);
  }, [running, latencyMs, agility]);

  const reset = () => {
    setRunning(false);
    setLatencyMs(DEFAULT_LATENCY_MS);
    setAgility(DEFAULT_AGILITY);
  };
  const choose = (next: () => void) => {
    setRunning(false);
    next();
  };

  const plainReadout = `At about ${speedKmh} kilometres an hour the drone flies about ${metres(
    blindM,
  )} before its camera reports the wall, then swerves for about ${metres(swerveM)}.`;
  const cameraWords = CAMERA_WORDS[camera] || `Camera ${latencyMs} ms late`;
  const swerveWords = SWERVE_WORDS[String(agility) as AgilityId] ?? 'swerve';
  const restCoil = RIG.coilAt(0, 0, turns);

  const slot = (name: string): ReactNode => {
    switch (name) {
      case 'wall':
        return <g data-testid="wall">{staticRun(RIG.WALL_PARTS, slot)}</g>;
      case 'board-ends':
        return <Line d={RIG.BOARD_ENDS} tone="hi" />;
      case 'carriage-0':
        return (
          <g ref={(el) => { refs.current.carriage = el; }} transform={RIG.carriageShift(0)} data-testid="drone-carriage">
            {staticRun(LANE.carriage, slot)}
          </g>
        );
      case 'slider-0':
        return (
          <g ref={(el) => { refs.current.slider = el; }} transform={RIG.sliderShift(0)} data-testid="drone">
            {staticRun(LANE.slider, slot)}
          </g>
        );
      case 'coil-back-0':
        return <path ref={(el) => { refs.current.coilBack = el; }} className="iso-line" data-tone="lo" d={restCoil.back} />;
      case 'coil-front-0':
        return <path ref={(el) => { refs.current.coilFront = el; }} className="iso-line" data-tone="mid" d={restCoil.front} />;
      case 'wheel-0':
        return (
          <g transform={LANE.wheelMatrix} data-testid="timer-wheel">
            <g ref={(el) => { refs.current.wheel = el; }} transform={`rotate(${f(wheelDegrees(shownDelay))})`}>
              <Line d={LANE.wheelFace.slots} tone="faint" />
              <path className="iso-fill" d={LANE.wheelFace.dog} />
              <Line d={LANE.wheelFace.dog} tone="mid" />
              <Line d={LANE.wheelFace.pointer} tone="hi" />
              <path className="iso-fill" d={LANE.wheelFace.hub} />
              <Line d={LANE.wheelFace.hub} tone="lo" />
            </g>
          </g>
        );
      case 'props-0':
        return LANE.props.map((prop, k) => (
          <g key={k} transform={prop.matrix}>
            <g ref={(el) => { refs.current.props[k] = el; }} transform={`rotate(${k * 47 + 20})`}>
              <path className="iso-fill" d={prop.blade} />
              <Line d={prop.blade} tone="mid" />
              <path className="iso-fill" d={prop.hub} />
              <Line d={prop.hub} tone="lo" />
            </g>
          </g>
        ));
      case 'dial-0':
        return (
          <g transform={LANE.dialMatrix} data-testid="speedometer">
            <path className="iso-fill" d={FACE.face} />
            <path className="iso-top" d={FACE.face} />
            <Line d={FACE.rim} tone="lo" />
            <Line d={FACE.arc} tone="lo" />
            <Line d={FACE.minor} tone="lo" />
            <Line d={FACE.major} tone="mid" />
            <Line d={FACE.zero} tone="hi" />
            <g transform={`rotate(${f(NEEDLE_ZERO_DEG + needleDegrees(shownKmh))})`} data-testid="speed-needle">
              <Line d={RIG.NEEDLE} tone="hi" free />
            </g>
            <path className="iso-fill" d={RIG.NEEDLE_HUB} />
            <Line d={RIG.NEEDLE_HUB} tone="lo" />
          </g>
        );
      case 'delay-knob-0':
        return (
          <g transform={LANE.delayKnobMatrix}>
            <Line d={RIG.KNOB_HUB} tone="lo" />
            <g transform={`rotate(${f(delayKnobDegrees(shownDelay))})`}>
              <Line d={RIG.KNOB_POINTER} tone="hi" free="end" />
            </g>
          </g>
        );
      case 'agility-knob-0':
        return (
          <g transform={LANE.agilityKnobMatrix} data-testid="swerve-knob">
            <Line d={RIG.KNOB_HUB} tone="lo" />
            <g transform={`rotate(${f(agilityKnobDegrees(shownDetent))})`}>
              <Line d={RIG.KNOB_POINTER} tone="hi" free="end" />
            </g>
          </g>
        );
      case 'track-0':
        return (
          <g data-testid="gauge-riders">
            {/* The drawing carries no words; the keys under it name both riders (RIDER_KEYS). */}
            <g data-testid="latency-band" data-series="perception-latency" data-metres={blindM.toFixed(2)}>
              <Solid paths={riders.blind} tone="hi" lit />
            </g>
            <g data-testid="avoid-band" data-series="avoidance-maneuver" data-metres={swerveM.toFixed(2)}>
              <Solid paths={riders.swerve} tone="hi" dashed />
            </g>
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <InstrumentFigure
      figureId="perception-latency"
      className={className}
      kicker="Drone obstacle avoidance"
      heading="A drone that sees faster can safely fly faster"
      controls={
        <>
          <PresetGroup<CameraId>
            label="Camera"
            presets={CAMERA_PRESETS}
            value={camera}
            onChange={(id) =>
              choose(() => {
                if (id === 'stereo') setLatencyMs(Math.round(STEREO.latencyS * 1000));
                if (id === 'event') setLatencyMs(Math.round(EVENT.latencyS * 1000));
              })
            }
            testId="camera"
          />
          <PresetGroup<AgilityId>
            label="How hard it can swerve"
            presets={AGILITY_PRESETS}
            value={String(agility) as AgilityId}
            onChange={(id) => choose(() => setAgility(Number(id)))}
            testId="agility"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={() => {
              // Reduced motion keeps the still pose: the run never starts.
              if (!running && typeof window.matchMedia === 'function' && asksForStillness()) return;
              setRunning((value) => !value);
            }}
            data-testid="corridor-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the run' : 'Fly the corridor'}
          </button>
          <InstrumentReadout data-testid="latency-plain-readout" className="basis-full">
            {plainReadout}
          </InstrumentReadout>
        </>
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
            <ControlLabel htmlFor="perception-latency" value={formatSeconds(latencyS)}>
              Camera delay
            </ControlLabel>
            <input
              id="perception-latency"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={INTERACTIVE_MAX_LATENCY_MS}
              step={1}
              value={latencyMs}
              onChange={(e) => choose(() => setLatencyMs(Number(e.target.value)))}
              aria-label={`Camera delay (perception latency), currently ${formatSeconds(latencyS)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="instant" high="a fifth of a second" />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={RIG.WIDTH}
          keys={RIDER_KEYS}
          hint={running ? `Flying at its top safe speed, slowed ${SLOW} times` : undefined}
          readout={
            <>
              {cameraWords} · {swerveWords} · top safe speed <span data-testid="speedometer-reading">{`about ${speedKmh} km/h`}</span>
            </>
          }
          status="Model from the study; the rig is illustrative"
          data-testid="perception-latency-stage"
        >
          <IsoFigure
            width={RIG.WIDTH}
            height={RIG.HEIGHT}
            label={`A flight-test corridor: a drone on a test carriage at a light gate that sees a brick wall ${rangeM} metres ahead. At its top safe speed of about ${speedKmh} kilometres an hour it flies about ${metres(
              blindM,
            )} before its camera reports the wall, then swerves for about ${metres(swerveM)}, passing the wall's edge just as it reaches it.`}
            describedBy={descriptionId}
          >
            {staticRun(RIG.PARTS, slot)}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="A drone only sees so far ahead; every split-second its vision takes is distance flown blind, which caps how fast it can safely go."
      method={
        <>
          <p>
            Model, from Falanga, Kim and Scaramuzza: maximum speed = range / (latency + 2 sqrt(r / u)),
            where the range is the {rangeM} m the camera can see, r = {OBSTACLE_RADIUS_M} m is how far
            the drone must move sideways to clear the obstacle, and u is how hard it can accelerate
            sideways. The fastest safe speed is the one at which the swerve ends exactly at the wall,
            so no margin is left after the swerve.
          </p>
          <p>
            The rig is illustrative. The gauge board in front is to scale along the corridor: the lit
            rider is the stretch flown before the camera reports (speed times delay), the plain one the
            swerve. The drone and its sideways throw are drawn larger than that scale. A run plays
            {` ${SLOW} `}times slower than the real flight; the carriage starts {Math.abs(START_X / UNITS_PER_M).toFixed(1)} m before the
            gate, and the timer wheel on it runs down the camera&rsquo;s delay before the spring pack throws
            the drone sideways.
          </p>
          <p>
            Swerve settings, as sideways acceleration: Gentle 10 m/s² (about {(10 / G).toFixed(1)} g),
            Standard, the study&rsquo;s value, 25 m/s² (about {(25 / G).toFixed(1)} g), Hard 50 m/s²
            (about {(50 / G).toFixed(1)} g), Extreme 200 m/s² (about {(200 / G).toFixed(1)} g).
          </p>
          <p data-testid="reference-latencies">
            Reference latencies from the study ({rangeM} m sensing range):{' '}
            {SENSORS.map((s, i) => (
              <span key={s.id}>
                {i > 0 && '; '}
                {s.name} {formatSeconds(s.latencyS)}
              </span>
            ))}
            . &ldquo;Ordinary camera&rdquo; is the stereo frame camera and &ldquo;Faster camera&rdquo; is the event camera; the camera-delay slider under
            &ldquo;Adjust more&rdquo; sets any latency from 0 to {INTERACTIVE_MAX_LATENCY_MS} ms.
          </p>
          <p>
            The same budget on a time axis, at the current settings ({agilityName} swerve):
          </p>
          <ul className="m-0! grid list-none gap-0.5 p-0!">
            <Reading label="Lost to latency, before control acts" testId="latency-readout" value={formatSeconds(latencyS)} />
            <Reading label="Avoidance maneuver" testId="avoid-readout" value={formatSeconds(tAvoid)} />
            <Reading label="Time to contact" testId="ttc-readout" value={formatSeconds(ttc)} />
            <Reading label="Maximum speed" testId="max-speed-readout" value={formatSpeed(speed)} />
          </ul>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current sense-and-avoid budget"
            description={`At ${formatSeconds(latencyS)} of perception latency and ${agility} m/s² lateral agility the sense-and-avoid timeline supports a maximum speed of ${formatSpeed(speed)}: ${formatSeconds(latencyS)} is lost before control acts, ${formatSeconds(tAvoid)} is the avoidance maneuver, and the swerve ends at the wall at ${formatSeconds(ttc)} time to contact, with no margin left.`}
            states={[
              { label: 'latency', value: formatSeconds(latencyS) },
              { label: 'agility', value: `${agility} m/s²` },
              { label: 'max speed', value: formatSpeed(speed) },
              { label: 'time to contact', value: formatSeconds(ttc) },
              { label: 'avoidance', value: formatSeconds(tAvoid) },
            ]}
          />
        </>
      }
      source="Model and reference latencies from Falanga, Kim and Scaramuzza (2019)."
    />
  );
}

function Reading({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <li>
      {label}: <span data-testid={testId} className="text-text">{value}</span>
    </li>
  );
}
