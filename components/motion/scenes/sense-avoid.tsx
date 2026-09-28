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
  DEFAULT_AGILITY, INTERACTIVE_MAX_LATENCY_MS, SENSORS,
  latencyOutcome, formatSpeed, formatSeconds,
} from '@/lib/aerial-latency';

export const SENSE_AVOID_SCENE: SceneDefinition = {
  id: 'sense-avoid',
  title: 'Perception delay lowers the safe speed',
  beats: [
    { id: 'obstacle', caption: 'An obstacle enters the camera range in the cited sense-and-avoid model.' },
    { id: 'camera', duration: 'long', linear: true, caption: 'The camera takes 70 ms to report it; the modeled avoidance maneuver takes about 346 ms.' },
    { id: 'delay', duration: 'long', linear: true, caption: 'At 200 ms of authored pipeline delay, avoidance still takes about 346 ms, but the maximum safe speed falls.' },
    { id: 'recap', caption: 'The same obstacle and agility require a lower speed when more time is spent before control acts.' },
  ],
};

const SPANS = beatSpans(SENSE_AVOID_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const LEFT = 55;
const WIDTH = 235;
const STEREO = SENSORS[0];
// Render delay and the fixed agility-dependent maneuver on the same time
// axis. Maximum safe speed changes; the maneuver duration does not.
const timeWidth = (seconds: number) => seconds * 430;
const AVOIDANCE_LABEL = formatSeconds(latencyOutcome(
  STEREO.latencyS, DEFAULT_AGILITY, STEREO.rangeM,
).avoidanceTimeS);

export function senseAvoidFrame(t: number) {
  const latency = STEREO.latencyS
    + (INTERACTIVE_MAX_LATENCY_MS / 1000 - STEREO.latencyS) * progress(t, 2);
  return {
    latency,
    outcome: latencyOutcome(latency, DEFAULT_AGILITY, STEREO.rangeM),
    detected: smooth(progress(t, 0)),
    camera: progress(t, 1),
    recap: smooth(progress(t, 3)),
  };
}

function SenseAvoidStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={27} y={25} fontSize={14} fill="var(--motion-stage-label)">
        sense → avoid · model
      </text>
      <text x={LEFT} y={66} fontSize={14} fill="var(--motion-stage-label)">
        perception delay
      </text>
      <text x={LEFT} y={123} fontSize={14} fill="var(--motion-stage-label)">
        avoidance duration
      </text>
      <text x={LEFT + WIDTH} y={123} textAnchor="end" fontSize={14}
        fill="var(--motion-stage-label-secondary)">≈{AVOIDANCE_LABEL}</text>
      <line x1={LEFT} x2={LEFT + WIDTH} y1={169} y2={169}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <AnimatedElement as="rect" data-scene-mark="latency-budget"
        x={LEFT} y={76} height={18} fill="var(--role-constraint-stage)"
        bindings={{ width: (t) => {
          const frame = senseAvoidFrame(t);
          return timeWidth(frame.latency) * frame.camera;
        } }} />
      <AnimatedElement as="rect" data-scene-mark="avoidance-budget"
        x={LEFT} y={133} height={18} fill="var(--role-action-stage)"
        bindings={{ width: (t) => {
          const frame = senseAvoidFrame(t);
          return timeWidth(frame.outcome.avoidanceTimeS) * frame.camera;
        } }} />
      <AnimatedElement as="circle" data-scene-mark="obstacle"
        cx={LEFT + WIDTH} cy={169} r={5} fill="var(--role-constraint-stage)"
        bindings={{ opacity: (t) => senseAvoidFrame(t).detected }} />
      <text x={LEFT} y={193} fontSize={14} fill="var(--motion-stage-label-secondary)">
        detection
      </text>
      <text x={LEFT + WIDTH} y={193} textAnchor="end" fontSize={14}
        fill="var(--motion-stage-label-secondary)">
        obstacle
      </text>
      <AnimatedElement as="text" x={LEFT} y={218} fontSize={14}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => senseAvoidFrame(t).recap }}>
        slower flight buys reaction time
      </AnimatedElement>
    </StageSvg>
  );
}

function SenseAvoidReadout() {
  const time = useSceneTime();
  const poster = useStaticTime();
  const delay = useRef<HTMLSpanElement>(null);
  const avoidance = useRef<HTMLSpanElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!time) return;
    const apply = (t: number) => {
      const frame = senseAvoidFrame(t);
      if (delay.current) delay.current.textContent = formatSeconds(frame.latency);
      if (avoidance.current) avoidance.current.textContent = formatSeconds(frame.outcome.avoidanceTimeS);
      if (speed.current) speed.current.textContent = formatSpeed(frame.outcome.maxSpeedMs);
    };
    apply(time.get());
    return time.on('change', apply);
  }, [time]);
  const frame = senseAvoidFrame(poster);
  // Readable on navigation; the caption remains the polite announcement.
  // Updating three numeric nodes per animation frame must not flood live regions.
  return <span aria-live="off">
    <span className="text-text-dim">delay</span> <span ref={delay}>{formatSeconds(frame.latency)}</span>{' '}
    <span className="text-text-dim">avoidance</span> <span ref={avoidance}>{formatSeconds(frame.outcome.avoidanceTimeS)}</span>{' '}
    <span className="text-text-dim">maximum speed</span> <span ref={speed}>{formatSpeed(frame.outcome.maxSpeedMs)}</span>
  </span>;
}

export function SenseAvoid({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={SENSE_AVOID_SCENE}
      stage={<SenseAvoidStage />}
      className={className}
      legend={<>
        <LegendItem series="perception-delay" swatch={<span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-constraint-graphic)' }} />}>perception delay</LegendItem>
        <LegendItem series="avoidance-time" swatch={<span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>modeled avoidance duration</LegendItem>
      </>}
      readout={() => <SenseAvoidReadout />}
      statusLine="Falanga et al.'s cited 8 m range, 25 m/s² agility, and stereo-camera latency set the starting model. The 200 ms contrast is an authored slider setting, not a published camera measurement; the lab below varies it directly."
      textAlternative={`${SENSE_AVOID_SCENE.title}. ${SENSE_AVOID_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default SenseAvoid;
