'use client';

import { AnimatedElement, AnimatedLine } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_FORCE_N, INITIAL_LAYERS, INITIAL_MUG, TRACK_MAX_M,
  applyPush, formatCm,
} from '@/lib/appearance-physics-push';

export const PUSH_LAYERS_SCENE: SceneDefinition = {
  id: 'push-layers',
  title: 'A rendered scene needs a solver to answer a push',
  beats: [
    { id: 'appearance', caption: 'The appearance layer draws a toy mug and table but supplies no physical response to an action.' },
    { id: 'unanswered', caption: 'Without a physics proxy, the same toy push leaves the mug in place because the renderer has no dynamics.' },
    { id: 'integrated', duration: 'long', linear: true, caption: 'A physics proxy adds collision and friction, so the solver integrates the push and the toy mug slides.' },
    { id: 'recap', caption: 'The same push changes position only when a solver supplies dynamics; the rendered pixels alone cannot answer it.' },
  ],
};

const SPANS = beatSpans(PUSH_LAYERS_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const pushed = applyPush(INITIAL_MUG, { ...INITIAL_LAYERS, physics: true }, DEFAULT_FORCE_N).state;
const mugX = (position: number) => 88 + position / TRACK_MAX_M * 186;

/** The position advances in the impulse model's linear time. */
export function pushLayersFrame(t: number) {
  return {
    position: pushed.position * progress(t, 2),
    attempted: smooth(progress(t, 1)),
    physics: smooth(progress(t, 2)),
    recap: smooth(progress(t, 3)),
  };
}

function PushLayersStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={28} y={25} fontSize={13} fill="var(--motion-stage-label)">one rendered scene · one push</text>
      <text x={28} y={52} fontSize={12} fill="var(--motion-stage-label-secondary)">appearance</text>
      <AnimatedElement as="text" x={142} y={52} fontSize={12} fill="var(--role-constraint-stage)"
        bindings={{ opacity: (t) => pushLayersFrame(t).physics }}>physics proxy</AnimatedElement>
      <AnimatedElement as="text" x={257} y={52} fontSize={12} fill="var(--role-value-stage)"
        bindings={{ opacity: (t) => pushLayersFrame(t).physics }}>solver</AnimatedElement>
      <line data-scene-structure="table" x1={52} y1={176} x2={300} y2={176}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" strokeWidth={2} />
      <AnimatedElement as="rect" data-scene-mark="mug"
        y={132} width={34} height={44} fill="none"
        stroke="var(--role-state-stage)" strokeWidth={2}
        bindings={{ x: (t) => mugX(pushLayersFrame(t).position) }} />
      <AnimatedElement as="path" data-scene-mark="mug-handle" fill="none"
        stroke="var(--role-state-stage)" strokeWidth={2}
        bindings={{ d: (t) => `M${mugX(pushLayersFrame(t).position) + 34} 142h9a8 8 0 0 1 0 18h-9` }} />
      <AnimatedElement as="rect" data-scene-mark="collision-hull" y={128}
        width={42} height={48} fill="none" stroke="var(--role-constraint-stage)"
        strokeWidth={1.5} strokeDasharray="4 3"
        bindings={{
          x: (t) => mugX(pushLayersFrame(t).position) - 4,
          opacity: (t) => pushLayersFrame(t).physics,
        }} />
      <AnimatedLine data-scene-mark="push-command" x1={38} y1={153} x2={75} y2={153}
        stroke="var(--role-action-stage)" strokeWidth={2.5}
        bindings={{ opacity: (t) => pushLayersFrame(t).attempted }} />
      <AnimatedElement as="polygon" data-scene-mark="push-arrow"
        points="77,153 69,148 69,158" fill="var(--role-action-stage)"
        bindings={{ opacity: (t) => pushLayersFrame(t).attempted }} />
      <AnimatedLine data-scene-mark="displacement" x1={106} y1={195}
        y2={195} stroke="var(--role-state-stage)" strokeWidth={2}
        bindings={{
          x2: (t) => mugX(pushLayersFrame(t).position) + 18,
          opacity: (t) => pushLayersFrame(t).physics,
        }} />
      <AnimatedElement as="text" x={28} y={225} fontSize={13} fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => pushLayersFrame(t).recap }}>
        rendered appearance ≠ integrated dynamics
      </AnimatedElement>
    </StageSvg>
  );
}

export function PushLayers({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={PUSH_LAYERS_SCENE}
      stage={<PushLayersStage />}
      className={className}
      legend={<>
        <LegendItem series="push-object" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 border-2" style={{ borderColor: 'var(--role-state-graphic)' }} />}>rendered mug</LegendItem>
        <LegendItem series="push-action" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>push action</LegendItem>
        <LegendItem series="push-constraint" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 border border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>collision hull</LegendItem>
        <LegendItem series="push-result" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>integrated displacement</LegendItem>
      </>}
      readout={({ beatIndex }) => <><span className="text-text-dim">toy push</span> {DEFAULT_FORCE_N.toFixed(1)} N{' '}
        <span className="text-text-dim">displacement</span> {formatCm(pushLayersFrame(SPANS[beatIndex].end).position)}</>}
      statusLine="Schematic, authored impulse and friction model, not a measured robot result. The direct-control push test above exposes its force and layer switches."
      textAlternative={`${PUSH_LAYERS_SCENE.title}. ${PUSH_LAYERS_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default PushLayers;
