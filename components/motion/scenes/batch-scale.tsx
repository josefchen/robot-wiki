'use client';

import { AnimatedCircle, AnimatedElement, AnimatedPath } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  DEFAULT_ENVS,
  MAX_ENVS,
  MIN_ENVS,
  formatEnvs,
  formatWallClock,
  wallClockSeconds,
} from '@/lib/parallel-sim';

export const BATCH_SCALE_SCENE: SceneDefinition = {
  id: 'batch-scale',
  title: 'Parallel rollouts change a fixed training budget',
  beats: [
    { id: 'one-batch', caption: 'At 64 parallel environments, the illustrative fixed-transition budget takes many small batches.' },
    { id: 'scale', duration: 'long', linear: true, caption: 'At 4,096 environments, the same toy budget takes fewer iterations and less wall-clock time.' },
    { id: 'cpu', caption: 'CPU-side work can grow with each environment, flattening the authored training-time curve.' },
    { id: 'recap', caption: 'At 16,384 environments, the two toy curves show why parallelism lowers time without making per-iteration work free.' },
  ],
};

const SPANS = beatSpans(BATCH_SCALE_SCENE.beats);
const eased = (t: number, index: number) =>
  smooth(clamp01((t - SPANS[index].start) / SPANS[index].duration));
const linear = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

/** The two curves come directly from the same fixed-transition lab. */
export function batchScaleFrame(t: number) {
  const environments = t < SPANS[1].start
    ? MIN_ENVS
    : t < SPANS[3].start
      ? Math.round(2 ** (Math.log2(MIN_ENVS) +
          (Math.log2(DEFAULT_ENVS) - Math.log2(MIN_ENVS)) * linear(t, 1)))
      : Math.round(2 ** (Math.log2(DEFAULT_ENVS) +
          (Math.log2(MAX_ENVS) - Math.log2(DEFAULT_ENVS)) * eased(t, 3)));
  return {
    environments,
    wallSeconds: wallClockSeconds(environments, false),
    cpuSeconds: wallClockSeconds(environments, true),
    cpuVisible: eased(t, 2),
    recap: eased(t, 3),
  };
}

const LEFT = 50;
const RIGHT = 298;
const TOP = 47;
const BOTTOM = 164;
const x = (envs: number) => LEFT + (Math.log2(envs / MIN_ENVS) / Math.log2(MAX_ENVS / MIN_ENVS)) * (RIGHT - LEFT);
const maxMinutes = wallClockSeconds(MIN_ENVS, true) / 60;
const y = (seconds: number) => BOTTOM - Math.log10(1 + seconds / 60) /
  Math.log10(1 + maxMinutes) * (BOTTOM - TOP);

function curve(cpuBound: boolean) {
  return Array.from({ length: 33 }, (_, index) => {
    const envs = MIN_ENVS * (MAX_ENVS / MIN_ENVS) ** (index / 32);
    return `${index === 0 ? 'M' : 'L'}${x(envs).toFixed(2)} ${y(wallClockSeconds(envs, cpuBound)).toFixed(2)}`;
  }).join(' ');
}

const gpuCurve = curve(false);
const cpuCurve = curve(true);

function BatchScaleStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={28} y={25} fontSize={16} fill="var(--motion-stage-label)">toy fixed-transition budget</text>
      <g data-scene-structure="axes">
        <line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      <text data-scene-stage-label="axis-tick" x={LEFT} y={182} fontSize={16} fill="var(--motion-stage-label-secondary)">64</text>
      <text data-scene-stage-label="axis-tick" x={RIGHT} y={182} fontSize={16} textAnchor="end" fill="var(--motion-stage-label-secondary)">16,384</text>
      <text data-scene-stage-label="axis-caption" x={174} y={205} textAnchor="middle" fontSize={16} fill="var(--motion-stage-label)">parallel environments</text>
      <text data-scene-stage-label="time-axis" x={RIGHT} y={25} textAnchor="end" fontSize={16} fill="var(--motion-stage-label-secondary)">time ↓</text>
      <AnimatedPath data-scene-mark="fixed-budget-time" d={gpuCurve}
        fill="none" stroke="var(--role-value-stage)" strokeWidth={2.4}
        bindings={{ opacity: () => 1 }} />
      <AnimatedPath data-scene-mark="cpu-cost-time" d={cpuCurve}
        fill="none" stroke="var(--role-constraint-stage)" strokeWidth={2}
        strokeDasharray="6 4" bindings={{ opacity: (t) => batchScaleFrame(t).cpuVisible }} />
      <AnimatedCircle data-scene-mark="selected-environment-count" r={5}
        fill="var(--role-highlight-stage)" stroke="var(--color-instrument)" strokeWidth={1.5}
        bindings={{
          cx: (t) => x(batchScaleFrame(t).environments),
          cy: (t) => y(batchScaleFrame(t).wallSeconds),
          opacity: (t) => eased(t, 0),
        }} />
      <AnimatedElement as="text" x={28} y={226} fontSize={16}
        fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => batchScaleFrame(t).recap }}>
        same budget · different iteration cost
      </AnimatedElement>
    </StageSvg>
  );
}

export function BatchScale({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={BATCH_SCALE_SCENE}
      stage={<BatchScaleStage />}
      className={className}
      legend={<>
        <LegendItem series="batch-time" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>fixed-budget time</LegendItem>
        <LegendItem series="batch-cpu" swatch={<span aria-hidden className="inline-block h-0.5 w-4 border-t border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>assumed CPU cost</LegendItem>
        <LegendItem series="batch-selected" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--role-highlight-graphic)' }} />}>selected count</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = batchScaleFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">envs</span> {formatEnvs(frame.environments)}{' '}
          <span className="text-text-dim">toy time</span> {formatWallClock(frame.wallSeconds)}</>;
      }}
      statusLine="Illustrative fixed-transition calculation, not a measured training curve. The reported Rudin time bounds, their separate protocols and the CPU benchmark qualification remain in the lab below."
      textAlternative={`${BATCH_SCALE_SCENE.title}. ${BATCH_SCALE_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default BatchScale;
