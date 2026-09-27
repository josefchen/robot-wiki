'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';

export const TACTILE_SLIP_SCENE: SceneDefinition = {
  id: 'tactile-slip',
  title: 'A contact channel can reveal slip',
  beats: [
    { id: 'grasp', caption: 'A schematic gripper holds one object while its camera sees the outer pose.' },
    { id: 'slip', duration: 'long', linear: true, caption: 'The toy object slips between the fingers while the camera view remains occluded.' },
    { id: 'touch', caption: 'A touch signal at the contact points can trigger a correcting grip in this schematic.' },
    { id: 'recap', caption: 'The same object is stable again in the toy loop; the diagram makes no measured dexterity claim.' },
  ],
};

const SPANS = beatSpans(TACTILE_SLIP_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

export function tactileSlipFrame(t: number) {
  return {
    slip: progress(t, 1),
    correction: smooth(progress(t, 2)),
    recap: smooth(progress(t, 3)),
  };
}

function TactileSlipStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={27} y={25} fontSize={14} fill="var(--motion-stage-label)">
        contact loop · schematic toy
      </text>
      <g data-scene-structure="gripper">
        <line x1={138} x2={138} y1={67} y2={152}
          stroke="var(--role-action-stage)" strokeWidth={3} />
        <line x1={202} x2={202} y1={67} y2={152}
          stroke="var(--role-action-stage)" strokeWidth={3} />
        <line x1={138} x2={202} y1={67} y2={67}
          stroke="var(--role-action-stage)" strokeWidth={3} />
        <path d="M92 155h156" stroke="var(--motion-stage-axes)"
          opacity="var(--motion-stage-axes-opacity)" />
      </g>
      <AnimatedElement as="rect" data-scene-mark="held-object"
        x={142} width={56} height={32}
        fill="var(--role-state-stage)"
        bindings={{
          y: (t) => 94 + tactileSlipFrame(t).slip * 32 - tactileSlipFrame(t).correction * 32,
        }} />
      <AnimatedElement as="circle" data-scene-mark="left-touch"
        cx={138} cy={111} r={5} fill="var(--role-measurement-stage)"
        bindings={{ opacity: (t) => tactileSlipFrame(t).correction }} />
      <AnimatedElement as="circle" data-scene-mark="right-touch"
        cx={202} cy={111} r={5} fill="var(--role-measurement-stage)"
        bindings={{ opacity: (t) => tactileSlipFrame(t).correction }} />
      <text x={43} y={190} fontSize={14} fill="var(--motion-stage-label)">
        camera: outer pose
      </text>
      <AnimatedElement as="text" x={43} y={214} fontSize={14}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => tactileSlipFrame(t).recap }}>
        touch: contact change
      </AnimatedElement>
    </StageSvg>
  );
}

export function TactileSlip({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={TACTILE_SLIP_SCENE}
      stage={<TactileSlipStage />}
      className={className}
      legend={<>
        <LegendItem series="held-object" swatch={<span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>held object</LegendItem>
        <LegendItem series="contact-action" swatch={<span aria-hidden className="inline-block h-3 w-0.5"
          style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>grip</LegendItem>
        <LegendItem series="contact-signal" swatch={<span aria-hidden className="inline-block size-2 rounded-full"
          style={{ backgroundColor: 'var(--role-measurement-graphic)' }} />}>touch signal</LegendItem>
      </>}
      statusLine="Schematic toy of contact feedback, not a sensor measurement or demonstrated recovery rate. The comparison table below retains source-scoped hardware claims."
      textAlternative={`${TACTILE_SLIP_SCENE.title}. ${TACTILE_SLIP_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default TactileSlip;
