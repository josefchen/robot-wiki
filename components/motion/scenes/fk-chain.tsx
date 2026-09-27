'use client';

import { AnimatedCircle, AnimatedLine, AnimatedElement } from '@/components/motion/animated';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { LegendItem } from '@/components/ui/instrument';
import { DEFAULT_ANGLES_DEG, LINK_LENGTHS, planarForwardKinematics } from '@/lib/planar-fk';

export const FK_CHAIN_SCENE: SceneDefinition = {
  id: 'fk-chain',
  title: 'A joint turns every link downstream',
  beats: [
    { id: 'base', caption: 'The base joint places the first link at 110° in this illustrative three-link arm.' },
    { id: 'elbow', caption: 'The elbow adds −45° relative to its parent, so the second link points at the cumulative angle.' },
    { id: 'wrist', caption: 'The wrist adds −35° and places the tip by summing all three link vectors.' },
    { id: 'recap', caption: 'Moving an upstream joint changes every downstream position; the tip follows the ordered transform product.' },
  ],
};

const SPANS = beatSpans(FK_CHAIN_SCENE.beats);
const POSITION = planarForwardKinematics(LINK_LENGTHS, DEFAULT_ANGLES_DEG);
const POINTS = [...POSITION.pivots, POSITION.effector];
const progress = (t: number, beat: number) =>
  smooth(clamp01((t - SPANS[beat].start) / SPANS[beat].duration));

/** A pure pose derived from the existing lab's link lengths and opening angles. */
export function fkChainFrame(t: number) {
  return {
    points: POINTS.map((point, index) => index === 0
      ? point
      : {
        x: POINTS[index - 1].x + (point.x - POINTS[index - 1].x) * progress(t, index - 1),
        y: POINTS[index - 1].y + (point.y - POINTS[index - 1].y) * progress(t, index - 1),
      }),
    recap: progress(t, 3),
  };
}

const px = (point: { x: number }) => Number((122 + 58 * point.x).toFixed(2));
const py = (point: { y: number }) => Number((179 - 58 * point.y).toFixed(2));

function FkChainStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={27} y={31} fontSize={14} fill="var(--motion-stage-label)">joint order</text>
      <line data-scene-structure="base-axis" x1={35} y1={179} x2={183} y2={179}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <line data-scene-structure="base-axis" x1={122} y1={205} x2={122} y2={48}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      {POINTS.slice(0, -1).map((point, index) => (
        <AnimatedLine
          key={`link-${index}`}
          data-scene-mark={`link-${index + 1}`}
          x1={px(point)} y1={py(point)}
          stroke="var(--role-state-stage)"
          strokeWidth={3}
          strokeLinecap="round"
          bindings={{
            x1: (t) => px(fkChainFrame(t).points[index]),
            y1: (t) => py(fkChainFrame(t).points[index]),
            x2: (t) => px(fkChainFrame(t).points[index + 1]),
            y2: (t) => py(fkChainFrame(t).points[index + 1]),
            opacity: (t) => progress(t, index),
          }}
        />
      ))}
      {POINTS.slice(0, -1).map((point, index) => (
        <AnimatedCircle
          key={`joint-${index}`}
          data-scene-mark={`joint-${index + 1}`}
          r={4}
          fill="var(--role-state-stage)"
          bindings={{
            cx: (t) => px(fkChainFrame(t).points[index]),
            cy: (t) => py(fkChainFrame(t).points[index]),
            opacity: (t) => index === 0 ? 1 : progress(t, index - 1),
          }}
        />
      ))}
      <AnimatedCircle data-scene-mark="end-effector" r={5}
        fill="none" stroke="var(--role-highlight-stage)" strokeWidth={2}
        bindings={{
          cx: (t) => px(fkChainFrame(t).points[3]),
          cy: (t) => py(fkChainFrame(t).points[3]),
          opacity: (t) => fkChainFrame(t).recap,
        }} />
      {['base rotates chain', 'elbow turns two', 'wrist places tip'].map((label, index) => (
        <AnimatedElement key={label} as="text" x={196} y={83 + 31 * index}
          fontSize={13} fill="var(--motion-stage-label)"
          bindings={{ opacity: (t) => progress(t, index) }}>
          {label}
        </AnimatedElement>
      ))}
      <AnimatedElement as="text" x={27} y={225} fontSize={13}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => fkChainFrame(t).recap }}>
        tip = sum of link vectors
      </AnimatedElement>
    </StageSvg>
  );
}

export function FkChain({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={FK_CHAIN_SCENE}
      stage={<FkChainStage />}
      className={className}
      legend={<>
        <LegendItem series="fk-chain-state" swatch={<span aria-hidden className="inline-block h-2.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>link position</LegendItem>
        <LegendItem series="fk-chain-tip" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: 'var(--role-highlight-graphic)' }} />}>indicated tip</LegendItem>
      </>}
      readout={({ beatIndex }) => <><span className="text-text-dim">opening angles</span> {DEFAULT_ANGLES_DEG.join('°, ')}° {beatIndex === 3 ? <><span className="text-text-dim">tip</span> ({POSITION.effector.x.toFixed(2)}, {POSITION.effector.y.toFixed(2)})</> : null}</>}
      statusLine="Schematic, authored link lengths and angles from the planar arm lab below; this is not a traced robot motion. Move the lab's joint sliders to explore other poses."
      textAlternative={`${FK_CHAIN_SCENE.title}. ${FK_CHAIN_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default FkChain;
