'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { compoundedSuccessRate } from '@/lib/reliability';

const HORIZON = 30;
const RATES = [0.95, 0.99, 0.999] as const;
const X = [60, 151, 242] as const;
const BAR_BASE = 172;
const BAR_HEIGHT = 91;

export const RELIABILITY_THRESHOLD_SCENE: SceneDefinition = {
  id: 'reliability-threshold',
  title: 'The last stretch of episode reliability',
  beats: [
    { id: 'episode', caption: 'At 95% success per decision, this thirty-decision toy episode succeeds about 21.5% of the time.' },
    { id: 'ninety-five', duration: 'long', linear: true, caption: 'Raising conditional success from 95% to 99% changes the thirty-step outcome from 21.5% to 74.0%.' },
    { id: 'ninety-nine-nine', duration: 'long', linear: true, caption: 'At 99.9% per decision, the same model gives 97.0% for thirty steps.' },
    { id: 'recap', caption: 'The same horizon exposes the last stretch.' },
  ],
};

const SPANS = beatSpans(RELIABILITY_THRESHOLD_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

export function reliabilityThresholdFrame(t: number) {
  const second = progress(t, 1);
  const third = progress(t, 2);
  const perStep = third > 0
    ? RATES[1] + (RATES[2] - RATES[1]) * third
    : RATES[0] + (RATES[1] - RATES[0]) * second;
  return {
    perStep,
    episodeSuccess: compoundedSuccessRate(perStep, HORIZON),
    second: smooth(second),
    third: smooth(third),
    recap: smooth(progress(t, 3)),
  };
}

function ReliabilityThresholdStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={27} y={25} fontSize={14} fill="var(--motion-stage-label)">
        toy model · 30 decisions
      </text>
      <line x1={43} x2={299} y1={BAR_BASE} y2={BAR_BASE}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      {RATES.map((rate, index) => {
        const height = compoundedSuccessRate(rate, HORIZON) * BAR_HEIGHT;
        const visibility = index === 0 ? () => 1
          : index === 1 ? (t: number) => reliabilityThresholdFrame(t).second
            : (t: number) => reliabilityThresholdFrame(t).third;
        return (
          <g key={rate}>
            <AnimatedElement as="rect" data-scene-mark={`episode-${index}`}
              x={X[index]} y={BAR_BASE - height} width={44}
              fill="var(--role-value-stage)"
              bindings={{ height: (t) => height * visibility(t),
                y: (t) => BAR_BASE - height * visibility(t) }} />
            <AnimatedElement as="text" x={X[index] + 22} y={195} textAnchor="middle" fontSize={14}
              fill="var(--motion-stage-label)" bindings={{ opacity: visibility }}>
              {['95%', '99%', '99.9%'][index]}
            </AnimatedElement>
            <AnimatedElement as="text" x={X[index] + 22} y={217} textAnchor="middle" fontSize={14} data-scene-note
              fill="var(--motion-stage-label-secondary)" bindings={{ opacity: visibility }}>
              {`${(compoundedSuccessRate(rate, HORIZON) * 100).toFixed(1)}%`}
            </AnimatedElement>
          </g>
        );
      })}
      <AnimatedElement as="text" x={285} y={55} textAnchor="end" fontSize={14}
        fill="var(--role-highlight-stage)"
        bindings={{ opacity: (t) => reliabilityThresholdFrame(t).recap }}>
        compare the last bar
      </AnimatedElement>
    </StageSvg>
  );
}

export function ReliabilityThreshold({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={RELIABILITY_THRESHOLD_SCENE}
      stage={<ReliabilityThresholdStage />}
      className={className}
      legend={<LegendItem series="episode-probability" swatch={
        <span aria-hidden className="inline-block h-2.5 w-3"
          style={{ backgroundColor: 'var(--role-value-graphic)' }} />
      }>episode success</LegendItem>}
      readout={({ beatIndex }) => {
        const frame = reliabilityThresholdFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">conditional rate</span> {(frame.perStep * 100).toFixed(1)}%{' '}
          <span className="text-text-dim">episode</span> {(frame.episodeSuccess * 100).toFixed(1)}%</>;
      }}
      statusLine="Illustrative model: all 30 decisions succeed independently at the same rate."
      textAlternative={`${RELIABILITY_THRESHOLD_SCENE.title}. ${RELIABILITY_THRESHOLD_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default ReliabilityThreshold;
