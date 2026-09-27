'use client';

import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { AnimatedCircle, AnimatedElement, AnimatedLine } from '@/components/motion/animated';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { FLOW_MODES, generateFlowField, integrateFlow, endpointDispersion } from '@/lib/flow-matching';
import { LegendItem } from '@/components/ui/instrument';

const FIELD = generateFlowField();
const STEPS = 10;
const PATHS = FIELD.samples.map((sample) => integrateFlow(sample, STEPS));
const ONE_STEP = FIELD.samples.map((sample) => integrateFlow(sample, 1)[1]);
const PLOT = { left: 38, right: 304, top: 66, bottom: 185 };
const x = (v: number) => PLOT.left + ((v + 4.5) / 9) * (PLOT.right - PLOT.left);
const y = (v: number) => PLOT.bottom - ((v + 3.5) / 7) * (PLOT.bottom - PLOT.top);

export const FLOW_TRANSPORT_SCENE: SceneDefinition = {
  id: 'flow-transport',
  title: 'Flow matching transports action samples',
  beats: [
    { id: 'noise', caption: 'A seeded toy cloud begins as Gaussian noise in a two-dimensional action space.' },
    { id: 'transport', duration: 'long', linear: true, caption: 'Ten linear-in-model-time Euler steps move each sample along the action field toward a target mode.' },
    { id: 'compare', caption: 'A one-step endpoint remains offset from the action target; the ten-step endpoint is closer.' },
    { id: 'recap', caption: 'Two action clusters remain after transport; the step-count lab below compares the paper configurations.' },
  ],
};

const SPANS = beatSpans(FLOW_TRANSPORT_SCENE.beats);
const beatProgress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

/** The positions follow simulation time, not the UI easing curve. */
export function flowTransportFrame(t: number) {
  const fraction = beatProgress(t, 1);
  const position = (path: typeof PATHS[number]) => {
    const continuousStep = fraction * STEPS;
    const before = Math.min(STEPS - 1, Math.floor(continuousStep));
    const portion = continuousStep - before;
    return {
      x: path[before].x + (path[before + 1].x - path[before].x) * portion,
      y: path[before].y + (path[before + 1].y - path[before].y) * portion,
    };
  };
  return {
    positions: PATHS.map(position),
    noiseOpacity: 1 - smooth(beatProgress(t, 1)),
    actionOpacity: smooth(beatProgress(t, 1)),
    targetsOpacity: smooth(beatProgress(t, 1)),
    compareOpacity: smooth(beatProgress(t, 2)),
    recapOpacity: smooth(beatProgress(t, 3)),
  };
}

function FlowTransportStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={38} y={32} fontSize={14} fill="var(--motion-stage-label)">noise → action</text>
      <AnimatedElement as="text" x={247} y={32} fontSize={14} fill="var(--role-action-stage)"
        bindings={{ opacity: (t) => flowTransportFrame(t).recapOpacity }}>two modes</AnimatedElement>
      <AnimatedElement as="text" x={38} y={51} fontSize={13} fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => flowTransportFrame(t).compareOpacity }}>
        one step misses; ten steps approach
      </AnimatedElement>
      <g data-scene-structure="flow-axes">
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      {FLOW_MODES.map((mode, index) => (
        <AnimatedCircle key={`target-${index}`} data-scene-mark={`mode-${index}`}
          cx={x(mode.x)} cy={y(mode.y)} r={12}
          fill="none" stroke="var(--role-reference-stage)" strokeWidth={1.5} strokeDasharray="4 3"
          bindings={{ opacity: (t) => flowTransportFrame(t).targetsOpacity }} />
      ))}
      {FIELD.samples.map((sample, index) => {
        const cx = (t: number) => Number(x(flowTransportFrame(t).positions[index].x).toFixed(2));
        const cy = (t: number) => Number(y(flowTransportFrame(t).positions[index].y).toFixed(2));
        return (
          <g key={index}>
            <AnimatedCircle data-scene-mark={`noise-${index}`}
              r={2} fill="var(--role-reference-stage)"
              bindings={{ cx, cy, opacity: (t) => Number(flowTransportFrame(t).noiseOpacity.toFixed(3)) }} />
            <AnimatedCircle data-scene-mark={`action-${index}`}
              r={2} fill="var(--role-action-stage)"
              bindings={{ cx, cy, opacity: (t) => Number(flowTransportFrame(t).actionOpacity.toFixed(3)) }} />
          </g>
        );
      })}
      <AnimatedCircle data-scene-mark="one-step-endpoint"
        cx={x(ONE_STEP[0].x)} cy={y(ONE_STEP[0].y)} r={4.5}
        fill="none" stroke="var(--role-constraint-stage)" strokeWidth={2}
        bindings={{ opacity: (t) => flowTransportFrame(t).compareOpacity }} />
      <AnimatedLine data-scene-structure="comparison-leader"
        x1={x(ONE_STEP[0].x)} y1={y(ONE_STEP[0].y)}
        x2={x(PATHS[0][STEPS].x)} y2={y(PATHS[0][STEPS].y)}
        stroke="var(--role-constraint-stage)" strokeWidth={1} strokeDasharray="3 3"
        bindings={{ opacity: (t) => flowTransportFrame(t).compareOpacity }} />
      <text x={38} y={216} fontSize={13} fill="var(--motion-stage-label-secondary)">
        action dimension 1 → action dimension 2
      </text>
    </StageSvg>
  );
}

export function FlowTransport({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={FLOW_TRANSPORT_SCENE}
      stage={<FlowTransportStage />}
      className={className}
      legend={
        <>
          <LegendItem series="flow-noise" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--role-reference-graphic)' }} />}>noise draw</LegendItem>
          <LegendItem series="flow-action" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>transported action</LegendItem>
          <LegendItem series="flow-one-step" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>one-step error</LegendItem>
        </>
      }
      readout={() => <><span className="text-text-dim">toy samples</span> {FIELD.samples.length} <span className="text-text-dim">ten-step mean endpoint error</span> {endpointDispersion(FIELD, STEPS).toFixed(2)}</>}
      statusLine="Illustrative seeded two-dimensional transport, not learned policy output or measured robot performance. The existing lab below retains its selectable integration steps and source-scoped configuration notes."
      textAlternative={`${FLOW_TRANSPORT_SCENE.title}. ${FLOW_TRANSPORT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default FlowTransport;
