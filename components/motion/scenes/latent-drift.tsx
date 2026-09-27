'use client';

import { AnimatedCircle, AnimatedElement, AnimatedEllipse, AnimatedPath } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { TYPICAL_HORIZON, deviationAt, imagineDeviation, trueLatent } from '@/lib/latent-imagination';

const EPSILON = 0.02;
const END = TYPICAL_HORIZON[1];
const DEVIATIONS = imagineDeviation({ epsilon: EPSILON, horizon: END });

export const LATENT_DRIFT_SCENE: SceneDefinition = {
  id: 'latent-drift',
  title: 'Small model errors accumulate in imagination',
  beats: [
    { id: 'start', caption: 'An imagined toy trajectory and its reference begin at the same real encoded state.' },
    { id: 'one-step', duration: 'long', linear: true, caption: 'One-step error separates the predicted latent from the reference after the first model step.' },
    { id: 'compound', duration: 'long', linear: true, caption: 'The imagined rollout compounds that error through the authored fifteen-step horizon.' },
    { id: 'recap', caption: 'The toy deviation after fifteen steps depends on the chosen one-step error, not on a published reliability bound.' },
  ],
};

const SPANS = beatSpans(LATENT_DRIFT_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);
const x = (step: number) => 46 + step / END * 248;
const referenceY = (step: number) => 140 - trueLatent(step) * 36;
const predictedY = (step: number, deviation: number) => referenceY(step) + deviation * 120;
const position = (horizon: number) => {
  const before = Math.floor(horizon);
  const after = Math.min(END, before + 1);
  const part = horizon - before;
  const deviation = DEVIATIONS[before] + (DEVIATIONS[after] - DEVIATIONS[before]) * part;
  return { x: x(horizon), y: predictedY(horizon, deviation), deviation };
};

/** The recurrence is sampled in linear model time, not eased UI time. */
export function latentDriftFrame(t: number) {
  const horizon = progress(t, 2) > 0
    ? 1 + (END - 1) * progress(t, 2)
    : progress(t, 1) > 0 ? progress(t, 1) : 0;
  return {
    horizon,
    deviation: position(horizon).deviation,
    recap: smooth(progress(t, 3)),
  };
}

function pathTo(horizon: number) {
  const whole = Math.floor(horizon);
  const points = Array.from({ length: whole + 1 }, (_, step) =>
    `${step === 0 ? 'M' : 'L'}${x(step).toFixed(2)} ${predictedY(step, DEVIATIONS[step]).toFixed(2)}`);
  if (horizon > whole) {
    const end = position(horizon);
    points.push(`L${end.x.toFixed(2)} ${end.y.toFixed(2)}`);
  }
  return points.join(' ');
}

const referencePath = Array.from({ length: END + 1 }, (_, step) =>
  `${step === 0 ? 'M' : 'L'}${x(step).toFixed(2)} ${referenceY(step).toFixed(2)}`).join(' ');

function LatentDriftStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={28} y={25} fontSize={13} fill="var(--motion-stage-label)">latent rollout · authored toy</text>
      <text x={28} y={73} fontSize={13} fill="var(--motion-stage-label-secondary)">encoded start</text>
      <g data-scene-structure="axes">
        <line x1={46} y1={188} x2={302} y2={188}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={46} y1={94} x2={46} y2={188}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      <AnimatedPath data-scene-mark="reference" d={referencePath} fill="none"
        stroke="var(--role-reference-stage)" strokeWidth={1.5} strokeDasharray="5 4"
        bindings={{ opacity: (t) => smooth(progress(t, 0)) }} />
      <AnimatedPath data-scene-mark="imagined" fill="none"
        stroke="var(--role-state-stage)" strokeWidth={2.5}
        bindings={{ d: (t) => pathTo(latentDriftFrame(t).horizon) }} />
      <AnimatedEllipse data-scene-mark="belief-uncertainty" rx={10} ry={12}
        fill="var(--role-state-stage)" fillOpacity="var(--motion-uncertainty-fill-alpha)"
        stroke="var(--role-state-stage)" strokeWidth={1.5} strokeDasharray="4 3"
        bindings={{
          cx: (t) => position(latentDriftFrame(t).horizon).x,
          cy: (t) => position(latentDriftFrame(t).horizon).y,
          opacity: (t) => smooth(progress(t, 0)),
        }} />
      <AnimatedCircle data-scene-mark="current-latent" r={4.5} fill="var(--role-state-stage)"
        bindings={{
          cx: (t) => position(latentDriftFrame(t).horizon).x,
          cy: (t) => position(latentDriftFrame(t).horizon).y,
        }} />
      <text x={48} y={210} fontSize={12} fill="var(--motion-stage-label-secondary)">0</text>
      <text x={296} y={210} fontSize={12} textAnchor="end" fill="var(--motion-stage-label-secondary)">15</text>
      <text x={124} y={229} fontSize={13} fill="var(--motion-stage-label)">imagination step →</text>
      <AnimatedElement as="text" x={176} y={73} fontSize={13} fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => latentDriftFrame(t).recap }}>
        reference vs prediction
      </AnimatedElement>
    </StageSvg>
  );
}

export function LatentDrift({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={LATENT_DRIFT_SCENE}
      stage={<LatentDriftStage />}
      className={className}
      legend={<>
        <LegendItem series="drift-imagined" swatch={<span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--role-state-graphic)' }} />}>imagined latent</LegendItem>
        <LegendItem series="drift-reference" swatch={<span aria-hidden className="inline-block h-0.5 w-4 border-t border-dashed" style={{ borderColor: 'var(--role-reference-graphic)' }} />}>reference trajectory</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = latentDriftFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">toy step</span> {Math.round(frame.horizon)}{' '}
          <span className="text-text-dim">deviation</span> {deviationAt({ epsilon: EPSILON, horizon: Math.round(frame.horizon) }).toFixed(3)} units</>;
      }}
      statusLine="Illustrative toy, not measured Dreamer or TD-MPC performance. The 2% input and 15-step horizon are choices from the lab below, not paper reliability bounds."
      textAlternative={`${LATENT_DRIFT_SCENE.title}. ${LATENT_DRIFT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default LatentDrift;
