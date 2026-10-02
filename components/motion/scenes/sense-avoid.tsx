'use client';

import { useLayoutEffect, useRef } from 'react';
import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { useSceneTime, useStaticTime } from '@/components/motion/scene-context';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_AGILITY, INTERACTIVE_MAX_LATENCY_MS, OBSTACLE_RADIUS_M, SENSORS,
  latencyOutcome, formatSpeed, formatSeconds,
} from '@/lib/aerial-latency';

/**
 * Sense-and-avoid: two drones fly at the same wall with the same swerve.
 * The top one has the study's quick camera; the bottom one's camera delay
 * grows to the authored 200 ms setting. The stretch each flies before its
 * camera reports the wall (constraint role) and its swerve (action role)
 * are drawn as distance along the 8 m it can see, so the payoff, a lower
 * top speed, is read off the stage.
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

const TRACK_LEFT = 64;
const WALL_X = 300;
/** Stage pixels per metre of the 8 m the camera can see. */
export const SENSE_AVOID_PX_PER_M = (WALL_X - TRACK_LEFT) / STEREO.rangeM;
const QUICK_Y = 88;
const SLOW_Y = 158;
const TRACK_H = 10;

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
export const SENSE_AVOID_METHOD_NOTE = `The starting model is Falanga, Kim and Scaramuzza's: an ${STEREO.rangeM} m sensing range, ${DEFAULT_AGILITY} m/s² of sideways agility and the stereo camera's ${formatSeconds(STEREO.latencyS)} latency, which give ${formatSpeed(QUICK.maxSpeedMs)}. The slow camera's ${INTERACTIVE_MAX_LATENCY_MS} ms is an authored setting, not a published camera measurement; it gives ${formatSpeed(SLOW.maxSpeedMs)}. Both drones swerve for the same fixed avoidance duration of about ${formatSeconds(QUICK.avoidanceTimeS)}, which depends only on the agility and the ${OBSTACLE_RADIUS_M} m it must move sideways. The figure above lets you set the delay directly, under "Adjust more".`;

/** A quadcopter seen from the side: body, arms, motor posts, spinning rotors, skids, nose camera. */
function Drone({ y }: { y: number }) {
  const x = TRACK_LEFT - 32;
  const ink = 'var(--motion-stage-label)';
  return (
    <g data-scene-structure="drone" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round">
      <rect x={x - 8} y={y - 5} width={16} height={9} rx={3} fill={ink} />
      <line x1={x - 20} y1={y - 8} x2={x - 6} y2={y - 3} />
      <line x1={x + 20} y1={y - 8} x2={x + 6} y2={y - 3} />
      <line x1={x - 20} y1={y - 8} x2={x - 20} y2={y - 12} />
      <line x1={x + 20} y1={y - 8} x2={x + 20} y2={y - 12} />
      <ellipse cx={x - 20} cy={y - 13} rx={10} ry={1.6} strokeWidth={1.5} />
      <ellipse cx={x + 20} cy={y - 13} rx={10} ry={1.6} strokeWidth={1.5} />
      <line x1={x - 5} y1={y + 4} x2={x - 8} y2={y + 9} strokeWidth={1.5} />
      <line x1={x + 5} y1={y + 4} x2={x + 8} y2={y + 9} strokeWidth={1.5} />
      <line x1={x - 11} y1={y + 9} x2={x + 11} y2={y + 9} strokeWidth={1.5} />
      <circle cx={x + 10} cy={y} r={2.5} fill={ink} />
    </g>
  );
}

function Lane({ y, label }: { y: number; label: string }) {
  return (
    <>
      <text x={TRACK_LEFT} y={y - 12} fontSize={14} fill="var(--motion-stage-label)">{label}</text>
      <Drone y={y + TRACK_H / 2} />
    </>
  );
}

/** The slow drone's top speed, updated with scene time. */
function SlowSpeedText() {
  const time = useSceneTime();
  const poster = useStaticTime();
  const node = useRef<SVGTextElement>(null);
  useLayoutEffect(() => {
    if (!time) return;
    const apply = (t: number) => {
      if (node.current) node.current.textContent = `about ${senseAvoidDistances(senseAvoidFrame(t).latency).speedKmh} km/h`;
    };
    apply(time.get());
    return time.on('change', apply);
  }, [time]);
  return (
    <AnimatedElement
      as="text"
      x={TRACK_LEFT}
      y={SLOW_Y + 32}
      fontSize={14}
      fill="var(--motion-stage-label)"
      bindings={{ opacity: (t) => senseAvoidFrame(t).slowShown }}
    >
      <tspan ref={node}>{`about ${senseAvoidDistances(senseAvoidFrame(poster).latency).speedKmh} km/h`}</tspan>
    </AnimatedElement>
  );
}

function SenseAvoidStage() {
  const quickBlindX = TRACK_LEFT + QUICK_DIST.blindM * SENSE_AVOID_PX_PER_M;
  return (
    <StageSvg viewBox="0 0 340 240">
      <AnimatedElement
        as="g"
        data-figure-annotation=""
        bindings={{ opacity: (t) => senseAvoidFrame(t).recap }}
      >
        <text x={10} y={22} fontSize={14} fontWeight={600} fill="var(--role-highlight-stage)">
          <tspan x={10} dy={0}>Same wall, same swerve: the slow camera</tspan>
          <tspan x={10} dy={17.5}>cuts top speed from about {QUICK_DIST.speedKmh} to {senseAvoidDistances(SLOW_LATENCY_S).speedKmh} km/h</tspan>
        </text>
        {/* Points at the slow drone's lower top speed. */}
        <g stroke="var(--role-highlight-stage)" strokeWidth={2} strokeLinecap="round" fill="none">
          <line x1={30} y1={SLOW_Y + 27} x2={56} y2={SLOW_Y + 27} />
          <polyline points={`50,${SLOW_Y + 22} 56,${SLOW_Y + 27} 50,${SLOW_Y + 32}`} />
        </g>
      </AnimatedElement>

      {/* The wall both drones fly at. */}
      <AnimatedElement
        as="g"
        data-scene-structure="wall"
        fill="none"
        stroke="var(--motion-stage-label)"
        strokeWidth={1.5}
        bindings={{ opacity: (t) => r(0.3 + 0.7 * senseAvoidFrame(t).detected) }}
      >
        <rect x={WALL_X} y={66} width={16} height={118} />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line key={i} x1={WALL_X} x2={WALL_X + 16} y1={r(66 + i * 13.1)} y2={r(66 + i * 13.1)} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line
            key={`joint-${i}`}
            x1={WALL_X + (i % 2 ? 5 : 11)}
            x2={WALL_X + (i % 2 ? 5 : 11)}
            y1={r(66 + i * 13.1)}
            y2={r(Math.min(184, 66 + (i + 1) * 13.1))}
          />
        ))}
      </AnimatedElement>
      <text x={WALL_X + 8} y={198} textAnchor="middle" fontSize={14}
        fill="var(--motion-stage-label-secondary)">
        wall
      </text>

      <Lane y={QUICK_Y} label="quick camera" />
      <AnimatedElement
        as="rect"
        data-scene-structure="quick-blind"
        x={TRACK_LEFT}
        y={QUICK_Y}
        height={TRACK_H}
        fill="var(--role-constraint-stage)"
        bindings={{ width: (t) => r((quickBlindX - TRACK_LEFT) * senseAvoidFrame(t).camera) }}
      />
      <AnimatedElement
        as="rect"
        data-scene-structure="quick-swerve"
        x={r(quickBlindX)}
        y={QUICK_Y}
        height={TRACK_H}
        fill="var(--role-action-stage)"
        bindings={{ width: (t) => r((WALL_X - quickBlindX) * senseAvoidFrame(t).camera) }}
      />
      <AnimatedElement
        as="text"
        x={TRACK_LEFT}
        y={QUICK_Y + 32}
        fontSize={14}
        fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => senseAvoidFrame(t).camera }}
      >
        about {QUICK_DIST.speedKmh} km/h
      </AnimatedElement>

      <AnimatedElement as="g" bindings={{ opacity: (t) => senseAvoidFrame(t).slowShown }}>
        <Lane y={SLOW_Y} label="slow camera" />
      </AnimatedElement>
      <AnimatedElement
        as="rect"
        data-scene-mark="latency-budget"
        x={TRACK_LEFT}
        y={SLOW_Y}
        height={TRACK_H}
        fill="var(--role-constraint-stage)"
        bindings={{
          width: (t) => r(senseAvoidDistances(senseAvoidFrame(t).latency).blindM * SENSE_AVOID_PX_PER_M),
          opacity: (t) => senseAvoidFrame(t).slowShown,
        }}
      />
      <AnimatedElement
        as="rect"
        data-scene-mark="avoidance-budget"
        y={SLOW_Y}
        height={TRACK_H}
        fill="var(--role-action-stage)"
        bindings={{
          x: (t) => r(TRACK_LEFT + senseAvoidDistances(senseAvoidFrame(t).latency).blindM * SENSE_AVOID_PX_PER_M),
          width: (t) => r(senseAvoidDistances(senseAvoidFrame(t).latency).swerveM * SENSE_AVOID_PX_PER_M),
          opacity: (t) => senseAvoidFrame(t).slowShown,
        }}
      />
      <SlowSpeedText />

      <g stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)">
        <line x1={TRACK_LEFT} x2={WALL_X} y1={210} y2={210} />
        <line x1={TRACK_LEFT} x2={TRACK_LEFT} y1={205} y2={215} />
        <line x1={WALL_X} x2={WALL_X} y1={205} y2={215} />
      </g>
      <text x={(TRACK_LEFT + WALL_X) / 2} y={232} textAnchor="middle" fontSize={14}
        fill="var(--motion-stage-label-secondary)">
        it can see {STEREO.rangeM} metres ahead
      </text>
    </StageSvg>
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

export function SenseAvoid({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={SENSE_AVOID_SCENE}
      stage={<SenseAvoidStage />}
      className={className}
      legend={<>
        <LegendItem series="perception-delay" swatch={<span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-constraint-graphic)' }} />}>flown before the camera reports</LegendItem>
        <LegendItem series="avoidance-time" swatch={<span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>swerving</LegendItem>
      </>}
      readout={() => <SenseAvoidReadout />}
      statusLine="illustrative"
      method={<>
        <p data-testid="sense-avoid-method">{SENSE_AVOID_METHOD_NOTE}</p>
        <p>
          Quick camera: {formatSeconds(STEREO.latencyS)} delay, {formatSpeed(QUICK.maxSpeedMs)}, about{' '}
          {QUICK_DIST.blindM.toFixed(1)} m flown before the report. Slow camera:{' '}
          {INTERACTIVE_MAX_LATENCY_MS} ms delay, {formatSpeed(SLOW.maxSpeedMs)}, about{' '}
          {senseAvoidDistances(SLOW_LATENCY_S).blindM.toFixed(1)} m. Speeds on the stage are the same values in km/h.
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
