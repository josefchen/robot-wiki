'use client';

import { AnimatedElement, AnimatedLine } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  REALISM_SCORE, ROLLOUT_STEPS, SENSITIVITY_THRESHOLD,
  actionSensitivity, rollout, type SceneState,
} from '@/lib/action-conditioning';

export const ACTION_FORK_SCENE: SceneDefinition = {
  id: 'action-fork',
  title: 'Two actions fork one predicted future',
  beats: [
    { id: 'same-frame', caption: 'The same tabletop frame starts both toy rollouts before either action is applied.' },
    { id: 'strong-fork', duration: 'long', linear: true, caption: 'Strongly conditioned toy rollouts follow the two commands: push left moves the block, while lift raises the gripper.' },
    { id: 'weak-collapse', caption: 'Weakly conditioned toy rollouts converge toward the same intention-consistent future despite different commands.' },
    { id: 'recap', caption: 'Sharp frames keep the same toy realism score in both modes, while action sensitivity distinguishes the futures.' },
  ],
};

const SPANS = beatSpans(ACTION_FORK_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const blend = (a: SceneState, b: SceneState, amount: number): SceneState => ({
  blockX: a.blockX + (b.blockX - a.blockX) * amount,
  gripperY: a.gripperY + (b.gripperY - a.gripperY) * amount,
});
const strongA = rollout({ action: 'push-left', conditioning: 'strong' });
const strongB = rollout({ action: 'lift', conditioning: 'strong' });
const weakA = rollout({ action: 'push-left', conditioning: 'weak' });
const weakB = rollout({ action: 'lift', conditioning: 'weak' });
const strongScore = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'strong' });
const weakScore = actionSensitivity({ actionA: 'push-left', actionB: 'lift', conditioning: 'weak' });

/** A simulated rollout advances linearly; the later comparison morph is eased. */
export function actionForkFrame(t: number) {
  const modelStep = progress(t, 1) * ROLLOUT_STEPS;
  const interpolate = (frames: SceneState[]) => {
    const before = Math.min(ROLLOUT_STEPS - 1, Math.floor(modelStep));
    return blend(frames[before], frames[before + 1], modelStep - before);
  };
  const collapse = smooth(progress(t, 2));
  const forkedA = interpolate(strongA);
  const forkedB = interpolate(strongB);
  return {
    rolloutA: blend(forkedA, weakA[ROLLOUT_STEPS], collapse),
    rolloutB: blend(forkedB, weakB[ROLLOUT_STEPS], collapse),
    sensitivity: progress(t, 2) > 0 ? weakScore : strongScore,
    realism: REALISM_SCORE,
    commands: smooth(progress(t, 1)),
    score: smooth(progress(t, 3)),
    weak: collapse,
  };
}

const blockX = (state: SceneState) => 80 + state.blockX * 210;
const blockY = (top: number) => top + 43;
const gripperY = (state: SceneState, top: number) => top + 41 - state.gripperY * 35;

function RolloutLane({ top, panel }: { top: number; panel: 'A' | 'B' }) {
  const state = (t: number) => panel === 'A' ? actionForkFrame(t).rolloutA : actionForkFrame(t).rolloutB;
  return (
    <g>
      <text x={28} y={top - 5} fontSize={13} fill="var(--motion-stage-label)">
        {panel === 'A' ? 'A · push left' : 'B · lift'}
      </text>
      <rect data-scene-mark={`goal-${panel}`} x={110} y={top + 43} width={20} height={14}
        fill="none" stroke="var(--role-reference-stage)" strokeDasharray="3 3" strokeWidth={1.5} />
      <line data-scene-structure="table" x1={52} x2={306} y1={top + 58} y2={top + 58}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <AnimatedElement as="rect" data-scene-mark={`block-${panel}`} y={blockY(top)}
        width={14} height={14} fill="var(--role-state-stage)"
        bindings={{ x: (t) => blockX(state(t)) }} />
      <AnimatedLine data-scene-mark={`gripper-${panel}`} x1={185} x2={185}
        stroke="var(--role-action-stage)" strokeWidth={3}
        bindings={{
          y1: (t) => gripperY(state(t), top) - 13,
          y2: (t) => gripperY(state(t), top),
        }} />
      <AnimatedElement as="path" data-scene-mark={`fingers-${panel}`}
        fill="none" stroke="var(--role-action-stage)" strokeWidth={2}
        bindings={{ d: (t) => {
          const y = gripperY(state(t), top);
          return `M179 ${y - 5}v8h3 M191 ${y - 5}v8h-3`;
        } }} />
    </g>
  );
}

function ActionForkStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={28} y={25} fontSize={13} fill="var(--motion-stage-label)">two commands · one starting frame</text>
      <RolloutLane top={65} panel="A" />
      <RolloutLane top={137} panel="B" />
      <AnimatedElement as="text" x={28} y={228} fontSize={13} fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => actionForkFrame(t).score }}>
        same realism; different action response
      </AnimatedElement>
    </StageSvg>
  );
}

export function ActionFork({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={ACTION_FORK_SCENE}
      stage={<ActionForkStage />}
      className={className}
      legend={<>
        <LegendItem series="fork-state" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>predicted block</LegendItem>
        <LegendItem series="fork-action" swatch={<span aria-hidden className="inline-block h-3 w-0.5" style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>commanded gripper</LegendItem>
        <LegendItem series="fork-target" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 border border-dashed" style={{ borderColor: 'var(--role-reference-graphic)' }} />}>goal zone</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = actionForkFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">toy sensitivity</span> {frame.sensitivity.toFixed(3)}{' '}
          <span className="text-text-dim">threshold</span> {SENSITIVITY_THRESHOLD.toFixed(2)}{' '}
          <span className="text-text-dim">toy realism</span> {frame.realism.toFixed(2)}</>;
      }}
      statusLine="Illustrative toy, not measured model performance. The two action rollouts, sensitivity threshold, and fixed realism score come from the direct-control lab below."
      textAlternative={`${ACTION_FORK_SCENE.title}. ${ACTION_FORK_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default ActionFork;
