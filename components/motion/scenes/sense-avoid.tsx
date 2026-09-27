'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
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
  title: 'Perception delay consumes the avoidance budget',
  beats: [
    { id: 'obstacle', caption: 'An obstacle enters the camera range in the cited sense-and-avoid model.' },
    { id: 'camera', duration: 'long', linear: true, caption: 'The camera takes 70 ms to report it, leaving the remaining interval for avoidance.' },
    { id: 'delay', duration: 'long', linear: true, caption: 'With 200 ms of authored pipeline delay, the maximum safe speed falls for the same airframe.' },
    { id: 'recap', caption: 'The same obstacle and agility require a lower speed when more time is spent before control acts.' },
  ],
};

const SPANS = beatSpans(SENSE_AVOID_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const LEFT = 55;
const WIDTH = 235;
const STEREO = SENSORS[0];

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
        maneuver time
      </text>
      <line x1={LEFT} x2={LEFT + WIDTH} y1={169} y2={169}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <AnimatedElement as="rect" data-scene-mark="latency-budget"
        x={LEFT} y={76} height={18} fill="var(--role-constraint-stage)"
        bindings={{ width: (t) => {
          const frame = senseAvoidFrame(t);
          return WIDTH * frame.outcome.latencyShare * frame.camera;
        } }} />
      <AnimatedElement as="rect" data-scene-mark="avoidance-budget"
        x={LEFT} y={133} height={18} fill="var(--role-action-stage)"
        bindings={{ width: (t) => {
          const frame = senseAvoidFrame(t);
          return WIDTH * (1 - frame.outcome.latencyShare) * frame.camera;
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
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>avoidance maneuver</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = senseAvoidFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">delay</span> {formatSeconds(frame.latency)}{' '}
          <span className="text-text-dim">maximum speed</span> {formatSpeed(frame.outcome.maxSpeedMs)}</>;
      }}
      statusLine="Falanga et al.'s cited 8 m range, 25 m/s² agility, and stereo-camera latency set the starting model. The 200 ms contrast is an authored slider setting, not a published camera measurement; the lab below varies it directly."
      textAlternative={`${SENSE_AVOID_SCENE.title}. ${SENSE_AVOID_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default SenseAvoid;
