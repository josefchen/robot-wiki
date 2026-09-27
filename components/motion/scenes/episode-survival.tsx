'use client';

import { AnimatedCircle, AnimatedPath, AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { compoundedSuccessRate } from '@/lib/reliability';

const PER_DECISION = 0.95;
const END = 30;
export const EPISODE_SURVIVAL_SCENE: SceneDefinition = {
  id: 'episode-survival',
  title: 'Conditional success compounds over an illustrative episode',
  beats: [
    { id: 'first', caption: 'The first decision succeeds with 95% conditional probability in this illustrative model.' },
    { id: 'fourteen', duration: 'long', linear: true, caption: 'After fourteen decisions at the same conditional rate, the model gives 48.8% episode success.' },
    { id: 'thirty', duration: 'long', linear: true, caption: 'After thirty decisions, the same constant conditional rate gives 21.5% episode success.' },
    { id: 'recap', caption: 'The curve depends on a constant conditional-probability assumption; it does not measure a real policy.' },
  ],
};

const SPANS = beatSpans(EPISODE_SURVIVAL_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const x = (steps: number) => 48 + steps / END * 245;
const y = (success: number) => 177 - success * 112;

export function episodeSurvivalFrame(t: number) {
  const steps = t < SPANS[1].start
    ? Math.max(0, Math.round(progress(t, 0)))
    : t < SPANS[2].start
      ? 1 + Math.round(13 * progress(t, 1))
      : 14 + Math.round(16 * progress(t, 2));
  return {
    steps,
    success: compoundedSuccessRate(PER_DECISION, steps),
    recap: smooth(progress(t, 3)),
  };
}

const pathTo = (steps: number) =>
  Array.from({ length: steps + 1 }, (_, step) =>
    `${step === 0 ? 'M' : 'L'}${x(step).toFixed(2)} ${y(compoundedSuccessRate(PER_DECISION, step)).toFixed(2)}`,
  ).join(' ');

function EpisodeSurvivalStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={25} y={25} fontSize={13} fill="var(--motion-stage-label)">toy model · constant conditional rate</text>
      <g data-scene-structure="axes">
        <line x1={48} x2={48} y1={59} y2={177} stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={48} x2={293} y1={177} y2={177} stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={48} x2={293} y1={y(0.5)} y2={y(0.5)}
          stroke="var(--role-reference-stage)" strokeDasharray="5 4" />
      </g>
      <text x={39} y={y(1) + 5} textAnchor="end" fontSize={12} fill="var(--motion-stage-label-secondary)">100%</text>
      <text x={42} y={y(0.5) - 5} textAnchor="end" fontSize={12} fill="var(--motion-stage-label-secondary)">50%</text>
      <text x={48} y={198} fontSize={12} fill="var(--motion-stage-label-secondary)">0</text>
      <text x={x(14)} y={198} textAnchor="middle" fontSize={12} fill="var(--motion-stage-label-secondary)">14</text>
      <text x={293} y={198} textAnchor="end" fontSize={12} fill="var(--motion-stage-label-secondary)">30</text>
      <AnimatedPath data-scene-mark="episode-probability" data-legend-series="episode-curve"
        fill="none" stroke="var(--role-value-stage)" strokeWidth={2.5}
        bindings={{ d: (t) => pathTo(episodeSurvivalFrame(t).steps) }} />
      <AnimatedCircle data-scene-mark="current-horizon" r={5}
        fill="var(--role-highlight-stage)" stroke="var(--color-instrument)" strokeWidth={1.5}
        bindings={{
          cx: (t) => x(episodeSurvivalFrame(t).steps),
          cy: (t) => y(episodeSurvivalFrame(t).success),
        }} />
      <text x={100} y={223} fontSize={13} fill="var(--motion-stage-label)">consecutive decisions →</text>
      <AnimatedElement as="text" x={293} y={48} textAnchor="end" fontSize={12}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => episodeSurvivalFrame(t).recap }}>
        pⁿ
      </AnimatedElement>
    </StageSvg>
  );
}

export function EpisodeSurvival({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={EPISODE_SURVIVAL_SCENE}
      stage={<EpisodeSurvivalStage />}
      className={className}
      legend={<>
        <LegendItem series="episode-curve" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>episode success under model</LegendItem>
        <LegendItem swatch={<span aria-hidden className="inline-block h-0.5 w-4 border-t border-dashed" style={{ borderColor: 'var(--role-reference-graphic)' }} />}>one-half reference</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = episodeSurvivalFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">decisions</span> {frame.steps}{' '}
          <span className="text-text-dim">episode success</span> {(frame.success * 100).toFixed(1)}%</>;
      }}
      statusLine="Illustrative constant conditional probability of 95% per decision, not a measured robot policy. The direct-control calculator below includes zero, certainty and single-step boundary cases."
      textAlternative={`${EPISODE_SURVIVAL_SCENE.title}. ${EPISODE_SURVIVAL_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default EpisodeSurvival;
