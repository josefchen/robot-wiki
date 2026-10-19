'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { useSceneTime, useStaticTime } from '@/components/motion/scene-context';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, locate, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import {
  NEEDLE_ZERO_DEG,
  agilityKnobDegrees,
  buildCorridor,
  delayKnobDegrees,
  needleDegrees,
  wheelDegrees,
  type CorridorLane,
  type Part,
} from '@/components/iso/figures/latency-corridor';
import {
  AGILITY_STEPS,
  DEFAULT_AGILITY, INTERACTIVE_MAX_LATENCY_MS, OBSTACLE_RADIUS_M, SENSORS,
  latencyOutcome, formatSpeed, formatSeconds,
} from '@/lib/aerial-latency';

/**
 * Sense-and-avoid: two drones fly at the same wall with the same swerve.
 * The back lane's drone has the study's quick camera; the front lane's
 * camera delay grows to the authored 200 ms setting.
 *
 * The stage is the twin flight-test corridor of the figure above it
 * (components/iso/figures/latency-corridor.ts): both drones sit on their
 * test carriages at the light gate, where the camera first sees the wall 8
 * metres ahead. Each carriage's timer wheel holds the camera's delay; the
 * gauge board in front reads, on one track per lane, the stretch each drone
 * flies before its camera reports the wall (constraint role) and its swerve
 * (action role), drawn to scale along the 8 m, and each console's dial reads
 * the top safe speed. The payoff, a lower top speed, is read off the stage.
 */
export const SENSE_AVOID_SCENE: SceneDefinition = {
  id: 'sense-avoid',
  title: 'Perception delay lowers the safe speed',
  kicker: 'Camera delay',
  headline: 'A slower camera forces the drone to fly slower',
  beats: [
    { id: 'obstacle', caption: 'A drone’s camera spots a wall 8 metres ahead.' },
    {
      id: 'camera',
      linear: true,
      caption: 'With a quick camera, the drone flies about 1.3 metres before the wall is reported, then swerves in time at about 69 km/h.',
    },
    {
      id: 'delay',
      duration: 'long',
      linear: true,
      caption: 'A slower camera takes longer to report the wall, so the drone must fly slower to keep the same swerve.',
    },
    {
      id: 'recap',
      caption: 'When a drone’s camera takes longer to report an obstacle, the drone must fly slower to stay safe, even with the same swerving skill.',
    },
  ],
};

const SPANS = beatSpans(SENSE_AVOID_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const STEREO = SENSORS[0];
const QUICK = latencyOutcome(STEREO.latencyS, DEFAULT_AGILITY, STEREO.rangeM);
const SLOW_LATENCY_S = INTERACTIVE_MAX_LATENCY_MS / 1000;
const SLOW = latencyOutcome(SLOW_LATENCY_S, DEFAULT_AGILITY, STEREO.rangeM);

/**
 * Stage units per metre of the 8 m the camera can see, on the gauge board's
 * tracks: each track is drawn in its own face plane, scaled so a mark's
 * width is its length in metres times this.
 */
export const SENSE_AVOID_PX_PER_M = (300 - 64) / STEREO.rangeM;

const r = (v: number) => Number(v.toFixed(2));
const kmh = (ms: number) => Math.round(ms * 3.6);

export function senseAvoidFrame(t: number) {
  const latency = STEREO.latencyS
    + (INTERACTIVE_MAX_LATENCY_MS / 1000 - STEREO.latencyS) * progress(t, 2);
  return {
    latency,
    outcome: latencyOutcome(latency, DEFAULT_AGILITY, STEREO.rangeM),
    detected: smooth(progress(t, 0)),
    camera: progress(t, 1),
    slowShown: smooth(clamp01(progress(t, 2) * 5)),
    recap: smooth(progress(t, 3)),
  };
}

/** Metres flown before the camera reports, and metres spent swerving. */
export function senseAvoidDistances(latencyS: number) {
  const outcome = latencyOutcome(latencyS, DEFAULT_AGILITY, STEREO.rangeM);
  const blindM = outcome.maxSpeedMs * latencyS;
  return { blindM, swerveM: STEREO.rangeM - blindM, speedKmh: kmh(outcome.maxSpeedMs) };
}

const QUICK_DIST = senseAvoidDistances(STEREO.latencyS);

/** The method note: the model and what is authored rather than measured. */
export const SENSE_AVOID_METHOD_NOTE = `The starting model is Falanga, Kim and Scaramuzza's: an ${STEREO.rangeM} m sensing range, ${DEFAULT_AGILITY} m/s² of sideways agility and the stereo camera's ${formatSeconds(STEREO.latencyS)} latency, which give ${formatSpeed(QUICK.maxSpeedMs)}. The slow camera's ${INTERACTIVE_MAX_LATENCY_MS} ms is a delay chosen for this figure; it gives ${formatSpeed(SLOW.maxSpeedMs)}. Both drones swerve for the same fixed avoidance duration of about ${formatSeconds(QUICK.avoidanceTimeS)}, which depends only on the agility and the ${OBSTACLE_RADIUS_M} m it must move sideways. The figure above lets you set the delay directly, under "Adjust more".`;

// ------------------------------------------------------------------ the rig
const RIG = buildCorridor({ tracks: 2 });
/** The front lane carries the slow camera (its marks are the scene's); the back lane the quick one. */
const SLOW_LANE = 0;
const QUICK_LANE = 1;
const TRACK_DEPTH = RIG.trackDepth(SLOW_LANE, SENSE_AVOID_PX_PER_M);
const FACE = RIG.DIAL_FACE;
const STANDARD_DETENT = AGILITY_STEPS.indexOf(DEFAULT_AGILITY as (typeof AGILITY_STEPS)[number]);

/** Each lane's delay at scene time t, in ms: the quick lane holds 70, the slow lane grows to 200 in the third beat. */
const delayMs = (lane: number, t: number) => (lane === QUICK_LANE ? STEREO.latencyS : senseAvoidFrame(t).latency) * 1000;
/** Each lane's dial reading at t: the quick lane's comes up as it runs, the slow lane's as it is set up, then falls with its delay. */
const dialKmh = (lane: number, t: number) => {
  const frame = senseAvoidFrame(t);
  return lane === QUICK_LANE
    ? QUICK.maxSpeedMs * 3.6 * smooth(frame.camera)
    : frame.outcome.maxSpeedMs * 3.6 * frame.slowShown;
};
/** The one lit part, beat by beat: the gauge board's 8 m, the quick dial, the slow timer, the slow dial. */
const litIn = (part: 'board' | 'quick-dial' | 'slow-timer' | 'slow-dial', t: number) => {
  const beat = locate(SPANS, t).index;
  return (['board', 'quick-dial', 'slow-timer', 'slow-dial'] as const)[beat] === part ? 'lit' : 'hi';
};
/** Propellers turn with scene time. */
const spin = (k: number, t: number) => r(((t * 0.9) + k * 47 + 20) % 360);

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
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

function laneOf(slot: string): CorridorLane {
  return RIG.lanes[Number(slot.split('-').pop())];
}

/** The two stretches on a lane's track: before the report (constraint) and the swerve (action). */
function Track({ lane }: { lane: number }) {
  const matrix = RIG.trackMatrix(lane, SENSE_AVOID_PX_PER_M);
  if (lane === QUICK_LANE) {
    const blind = QUICK_DIST.blindM * SENSE_AVOID_PX_PER_M;
    const swerve = QUICK_DIST.swerveM * SENSE_AVOID_PX_PER_M;
    return (
      <g transform={matrix} data-scene-structure="quick-track">
        <AnimatedElement
          as="rect"
          data-scene-structure="quick-blind"
          data-legend-series="perception-delay"
          x={0}
          y={0}
          height={TRACK_DEPTH}
          fill="var(--role-constraint-stage)"
          bindings={{ width: (t) => r(blind * senseAvoidFrame(t).camera) }}
        />
        <AnimatedElement
          as="rect"
          data-scene-structure="quick-swerve"
          data-legend-series="avoidance-time"
          x={r(blind)}
          y={0.5}
          height={r(TRACK_DEPTH - 1)}
          fill="none"
          stroke="var(--role-action-stage)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          bindings={{ width: (t) => r(swerve * senseAvoidFrame(t).camera) }}
        />
      </g>
    );
  }
  const distances = (t: number) => senseAvoidDistances(senseAvoidFrame(t).latency);
  return (
    <g transform={matrix}>
      <AnimatedElement
        as="rect"
        data-scene-mark="latency-budget"
        data-legend-series="perception-delay"
        x={0}
        y={0}
        height={TRACK_DEPTH}
        fill="var(--role-constraint-stage)"
        bindings={{
          width: (t) => r(distances(t).blindM * SENSE_AVOID_PX_PER_M),
          opacity: (t) => senseAvoidFrame(t).slowShown,
        }}
      />
      <AnimatedElement
        as="rect"
        data-scene-mark="avoidance-budget"
        data-legend-series="avoidance-time"
        y={0.5}
        height={r(TRACK_DEPTH - 1)}
        fill="none"
        stroke="var(--role-action-stage)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        bindings={{
          x: (t) => r(distances(t).blindM * SENSE_AVOID_PX_PER_M),
          width: (t) => r(distances(t).swerveM * SENSE_AVOID_PX_PER_M),
          opacity: (t) => senseAvoidFrame(t).slowShown,
        }}
      />
    </g>
  );
}

function slotView(name: string): ReactNode {
  if (name === 'wall') return <g data-scene-part="wall">{run(RIG.WALL_PARTS)}</g>;
  if (name === 'board-ends') {
    return <AnimatedElement as="path" className="iso-line" d={RIG.BOARD_ENDS} bindings={{ 'data-tone': (t) => litIn('board', t) }} />;
  }
  const lane = laneOf(name);
  const which = lane.index === QUICK_LANE ? 'quick' : 'slow';
  if (name.startsWith('carriage-')) return <g data-scene-part={`${which}-carriage`}>{run(lane.carriage)}</g>;
  if (name.startsWith('slider-')) return <g data-scene-part={`${which}-drone`}>{run(lane.slider)}</g>;
  if (name.startsWith('coil-back-')) return <Line d={RIG.coilAt(lane.index, 0).back} tone="lo" />;
  if (name.startsWith('coil-front-')) return <Line d={RIG.coilAt(lane.index, 0).front} tone="mid" />;
  if (name.startsWith('wheel-')) {
    return (
      <g transform={lane.wheelMatrix} data-scene-part={`${which}-timer`}>
        <AnimatedGroup bindings={{ transform: (t) => `rotate(${r(wheelDegrees(delayMs(lane.index, t)))})` }}>
          <Line d={lane.wheelFace.slots} tone="faint" />
          <path className="iso-fill" d={lane.wheelFace.dog} />
          <Line d={lane.wheelFace.dog} tone="mid" />
          <AnimatedElement
            as="path"
            className="iso-line"
            d={lane.wheelFace.pointer}
            bindings={{ 'data-tone': (t) => (lane.index === SLOW_LANE ? litIn('slow-timer', t) : 'hi') }}
          />
          <path className="iso-fill" d={lane.wheelFace.hub} />
          <Line d={lane.wheelFace.hub} tone="lo" />
        </AnimatedGroup>
      </g>
    );
  }
  if (name.startsWith('props-')) {
    return lane.props.map((prop, k) => (
      <g key={k} transform={prop.matrix}>
        <AnimatedGroup bindings={{ transform: (t) => `rotate(${spin(k, t)})` }}>
          <path className="iso-fill" d={prop.blade} />
          <Line d={prop.blade} tone="mid" />
          <path className="iso-fill" d={prop.hub} />
          <Line d={prop.hub} tone="lo" />
        </AnimatedGroup>
      </g>
    ));
  }
  if (name.startsWith('dial-')) {
    const part = lane.index === QUICK_LANE ? 'quick-dial' : 'slow-dial';
    return (
      <g transform={lane.dialMatrix} data-scene-part={`${which}-dial`}>
        <path className="iso-fill" d={FACE.face} />
        <path className="iso-top" d={FACE.face} />
        <Line d={FACE.rim} tone="lo" />
        <Line d={FACE.arc} tone="lo" />
        <Line d={FACE.minor} tone="lo" />
        <Line d={FACE.major} tone="mid" />
        <Line d={FACE.zero} tone="hi" />
        <AnimatedGroup bindings={{ transform: (t) => `rotate(${r(NEEDLE_ZERO_DEG + needleDegrees(dialKmh(lane.index, t)))})` }}>
          <AnimatedElement as="path" className="iso-line" data-free="" d={RIG.NEEDLE} bindings={{ 'data-tone': (t) => litIn(part, t) }} />
        </AnimatedGroup>
        <path className="iso-fill" d={RIG.NEEDLE_HUB} />
        <Line d={RIG.NEEDLE_HUB} tone="lo" />
      </g>
    );
  }
  if (name.startsWith('delay-knob-')) {
    return (
      <g transform={lane.delayKnobMatrix}>
        <Line d={RIG.KNOB_HUB} tone="lo" />
        <AnimatedGroup bindings={{ transform: (t) => `rotate(${r(delayKnobDegrees(delayMs(lane.index, t)))})` }}>
          <Line d={RIG.KNOB_POINTER} tone="hi" free="end" />
        </AnimatedGroup>
      </g>
    );
  }
  if (name.startsWith('agility-knob-')) {
    return (
      <g transform={lane.agilityKnobMatrix}>
        <Line d={RIG.KNOB_HUB} tone="lo" />
        <g transform={`rotate(${r(agilityKnobDegrees(STANDARD_DETENT))})`}>
          <Line d={RIG.KNOB_POINTER} tone="hi" free="end" />
        </g>
      </g>
    );
  }
  if (name.startsWith('track-')) return <Track lane={lane.index} />;
  return null;
}

function run(parts: Part[]): ReactNode[] {
  return parts.map((part, index) => (part.kind === 'slot' ? <g key={part.slot}>{slotView(part.slot)}</g> : <PartView key={index} part={part} />));
}

function SenseAvoidStage() {
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={RIG.VIEW_BOX} className="iso-svg">
        {run(RIG.PARTS)}
      </StageSvg>
    </div>
  );
}

function SenseAvoidReadout() {
  const time = useSceneTime();
  const poster = useStaticTime();
  const node = useRef<HTMLSpanElement>(null);
  const text = (t: number) => {
    const frame = senseAvoidFrame(t);
    const d = senseAvoidDistances(frame.latency);
    return `${frame.slowShown > 0 ? 'Slow' : 'Quick'} camera: top safe speed about ${d.speedKmh} km/h, after flying about ${d.blindM.toFixed(1)} metres before the wall is reported.`;
  };
  useLayoutEffect(() => {
    if (!time) return;
    const apply = (t: number) => {
      if (node.current) node.current.textContent = text(t);
    };
    apply(time.get());
    return time.on('change', apply);
  }, [time]);
  // Readable on navigation; the caption remains the polite announcement.
  // Updating text per animation frame must not flood live regions.
  return <span aria-live="off" ref={node}>{text(poster)}</span>;
}

/** A legend swatch: the gauge board's two tracks, the back one for the quick lane. */
function LaneSwatch() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 12" className="inline-block h-3 w-4 shrink-0">
      <rect x={1} y={2} width={14} height={3} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
      <rect x={1} y={7} width={14} height={3} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
    </svg>
  );
}

export function SenseAvoid({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={SENSE_AVOID_SCENE}
      stage={<SenseAvoidStage />}
      anchorId="sense-avoid"
      className={className}
      legend={<>
        <LegendItem series="perception-delay" swatch={<span aria-hidden className="inline-block h-1.5 w-3"
          style={{ backgroundColor: 'var(--role-constraint-graphic)' }} />}>flown before the camera reports</LegendItem>
        <LegendItem series="avoidance-time" swatch={<span aria-hidden className="inline-block h-1.5 w-3 border"
          style={{ borderColor: 'var(--role-action-graphic)' }} />}>swerving</LegendItem>
        <LegendItem swatch={<LaneSwatch />}>back lane and track: quick camera; front: slow camera</LegendItem>
      </>}
      readout={() => <SenseAvoidReadout />}
      statusLine="illustrative"
      method={<>
        <p data-testid="sense-avoid-method">{SENSE_AVOID_METHOD_NOTE}</p>
        <p>
          Quick camera: {formatSeconds(STEREO.latencyS)} delay, {formatSpeed(QUICK.maxSpeedMs)}, about{' '}
          {QUICK_DIST.blindM.toFixed(1)} m flown before the report. Slow camera:{' '}
          {INTERACTIVE_MAX_LATENCY_MS} ms delay, {formatSpeed(SLOW.maxSpeedMs)}, about{' '}
          {senseAvoidDistances(SLOW_LATENCY_S).blindM.toFixed(1)} m. Speeds on the dials are the same values in km/h.
        </p>
        <p>
          The drawing is the flight-test corridor of the figure above, with two lanes: each drone sits on
          its test carriage at the light gate, where its camera first sees the wall 8 m ahead, with its timer
          wheel set to the camera&apos;s delay. The gauge board in front is to scale along the 8 m, one track
          per lane; the drones are drawn larger than that scale.
        </p>
        <p>The four steps, in order:</p>
        <ol>
          {SENSE_AVOID_SCENE.beats.map((beat) => <li key={beat.id}>{beat.caption}</li>)}
        </ol>
      </>}
      textAlternative={`${SENSE_AVOID_SCENE.title}. ${SENSE_AVOID_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} ${SENSE_AVOID_METHOD_NOTE}`}
    />
  );
}

export default SenseAvoid;
