'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { computeEconomics, DEFAULT_INPUTS, SECONDS_PER_HOUR } from '@/lib/deployment-economics';

export const JAM_OVERHEAD_SCENE: SceneDefinition = {
  id: 'jam-overhead',
  title: 'Clearing time takes capacity from an authored picking cell',
  beats: [
    { id: 'baseline', caption: 'An authored cell splits an elapsed hour between productive cycles, clearing jams and downtime.' },
    { id: 'short', duration: 'long', linear: true, caption: 'A short jam at 99% per-pick success removes little productive time under these authored inputs.' },
    { id: 'long', duration: 'long', linear: true, caption: 'Long clearing at the same 99% success rate lowers modeled output and lengthens payback.' },
    { id: 'recap', caption: 'The same success rate has different economics when intervention time changes; neither case measures a deployed cell.' },
  ],
};

const SPANS = beatSpans(JAM_OVERHEAD_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

export function jamOverheadFrame(t: number) {
  const successRatePercent = DEFAULT_INPUTS.successRatePercent -
    (DEFAULT_INPUTS.successRatePercent - 99) * progress(t, 1);
  const jamClearSeconds = DEFAULT_INPUTS.jamClearSeconds +
    (300 - DEFAULT_INPUTS.jamClearSeconds) * progress(t, 2);
  return {
    successRatePercent,
    jamClearSeconds,
    outputs: computeEconomics({
      ...DEFAULT_INPUTS,
      successRatePercent,
      jamClearSeconds,
    }),
    recap: smooth(progress(t, 3)),
  };
}

const LEFT = 30;
const WIDTH = 276;
const partWidth = (seconds: number) => seconds / SECONDS_PER_HOUR * WIDTH;

function JamOverheadStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={25} y={26} fontSize={13} fill="var(--motion-stage-label)">one elapsed hour · authored cell</text>
      <text x={LEFT} y={72} fontSize={13} fill="var(--motion-stage-label-secondary)">time in an hour</text>
      <AnimatedElement as="rect" data-scene-mark="productive-time" data-legend-series="cell-productive"
        x={LEFT} y={91} height={28} fill="var(--role-value-stage)"
        bindings={{ width: (t) => partWidth(jamOverheadFrame(t).outputs.timeBreakdown.productive) }} />
      <AnimatedElement as="rect" data-scene-mark="clearing-time" data-legend-series="cell-clearing"
        y={91} height={28} fill="var(--role-constraint-stage)"
        bindings={{
          x: (t) => LEFT + partWidth(jamOverheadFrame(t).outputs.timeBreakdown.productive),
          width: (t) => partWidth(jamOverheadFrame(t).outputs.timeBreakdown.jamClearing),
        }} />
      <AnimatedElement as="rect" data-scene-mark="downtime" data-legend-series="cell-downtime"
        y={91} height={28} fill="var(--role-reference-stage)"
        bindings={{
          x: (t) => LEFT + partWidth(
            jamOverheadFrame(t).outputs.timeBreakdown.productive +
            jamOverheadFrame(t).outputs.timeBreakdown.jamClearing,
          ),
          width: (t) => partWidth(jamOverheadFrame(t).outputs.timeBreakdown.downtime),
        }} />
      <line data-scene-structure="elapsed-hour" x1={LEFT} x2={LEFT + WIDTH} y1={145} y2={145}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <text x={LEFT} y={164} fontSize={12} fill="var(--motion-stage-label-secondary)">0 min</text>
      <text x={LEFT + WIDTH} y={164} fontSize={12} textAnchor="end" fill="var(--motion-stage-label-secondary)">60 min</text>
      <text x={LEFT} y={200} fontSize={13} fill="var(--motion-stage-label)">fixed capital, uptime, cycle and wage</text>
      <AnimatedElement as="text" x={LEFT} y={222} fontSize={13} fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => jamOverheadFrame(t).recap }}>
        same pick success, longer repair
      </AnimatedElement>
    </StageSvg>
  );
}

export function JamOverhead({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={JAM_OVERHEAD_SCENE}
      stage={<JamOverheadStage />}
      className={className}
      legend={<>
        <LegendItem series="cell-productive" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>productive cycles</LegendItem>
        <LegendItem series="cell-clearing" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-constraint-graphic)' }} />}>jam clearing</LegendItem>
        <LegendItem series="cell-downtime" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-reference-graphic)' }} />}>downtime</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = jamOverheadFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">pick success</span> {frame.successRatePercent.toFixed(1)}%{' '}
          <span className="text-text-dim">clearing</span> {frame.jamClearSeconds.toFixed(0)} s{' '}
          <span className="text-text-dim">output</span> {frame.outputs.netPicksPerHour.toFixed(1)} picks/h{' '}
          <span className="text-text-dim">payback</span> {frame.outputs.paybackMonths?.toFixed(1)} mo</>;
      }}
      statusLine="Illustrative cell, not observed economics or a financial forecast. The seven authored inputs and the 730-hour month, 60-month amortization and 24-month verdict assumptions are stated with the calculator below."
      textAlternative={`${JAM_OVERHEAD_SCENE.title}. ${JAM_OVERHEAD_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default JamOverhead;
