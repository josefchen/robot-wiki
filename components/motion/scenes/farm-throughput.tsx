'use client';

import { AnimatedElement } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  formatHours, formatDuration, hoursPerYear, OXE_SCALE_HOURS, yearsToTarget,
  type CollectionRateId,
} from '@/lib/data-scaling';

const RIGS = 10;
const LOW_RATE: CollectionRateId = 'droid-measured'; // Legacy ID; the rate is authored, not measured.
const FAST_RATE: CollectionRateId = 'dedicated';

export const FARM_THROUGHPUT_SCENE: SceneDefinition = {
  id: 'farm-throughput',
  title: 'How a farm rate changes time to an authored target',
  beats: [
    { id: 'target', caption: 'Ten rigs and a 10,000-hour target are authored inputs, not estimates of OXE duration or DROID rig productivity.' },
    { id: 'low-rate', duration: 'long', linear: true, caption: 'At the low-rate hypothetical, ten rigs collect 70 hours in a year and need about 143 years for the authored target.' },
    { id: 'dedicated', duration: 'long', linear: true, caption: 'At the dedicated-farm hypothetical, the same ten rigs collect 10,000 hours in a year and reach the target.' },
    { id: 'recap', caption: 'The same target has different collection times because the two per-rig rates are authored alternatives, not measurements.' },
  ],
};

const SPANS = beatSpans(FARM_THROUGHPUT_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

export function farmThroughputFrame(t: number) {
  const rate: CollectionRateId = t > SPANS[2].start ? FAST_RATE : LOW_RATE;
  return {
    rate,
    hoursPerYear: hoursPerYear(RIGS, rate),
    years: yearsToTarget(RIGS, rate, OXE_SCALE_HOURS),
    lowYear: hoursPerYear(RIGS, LOW_RATE) * progress(t, 1),
    fastYear: hoursPerYear(RIGS, FAST_RATE) * progress(t, 2),
    recap: smooth(progress(t, 3)),
  };
}

const LEFT = 50;
const WIDTH = 244;
// The 70 h/yr bar would occupy fewer than two stage pixels on a linear
// 10,000-hour axis. Use a declared log1p scale, including a true zero.
const hoursWidth = (hours: number) =>
  WIDTH * Math.log1p(hours) / Math.log1p(OXE_SCALE_HOURS);

function FarmThroughputStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={27} y={26} fontSize={13} fill="var(--motion-stage-label)">one year of ten rigs · toy projection</text>
      <g data-scene-structure="hour-axis">
        <line x1={LEFT} x2={LEFT + WIDTH} y1={181} y2={181}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={LEFT} x2={LEFT} y1={72} y2={181}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
        <line x1={LEFT + WIDTH} x2={LEFT + WIDTH} y1={72} y2={181}
          stroke="var(--role-reference-stage)" strokeDasharray="4 4" />
      </g>
      <circle data-scene-mark="authored-target" cx={LEFT + WIDTH} cy={173} r={4}
        fill="var(--role-reference-stage)" />
      <text x={LEFT} y={64} fontSize={13} fill="var(--motion-stage-label)">low-rate hypothetical</text>
      <text x={LEFT} y={123} fontSize={13} fill="var(--motion-stage-label)">dedicated-farm hypothetical</text>
      <AnimatedElement as="rect" data-scene-mark="low-rate-year" data-legend-series="farm-low"
        x={LEFT} y={78} height={17} fill="var(--role-constraint-stage)"
        bindings={{ width: (t) => hoursWidth(farmThroughputFrame(t).lowYear) }} />
      <AnimatedElement as="rect" data-scene-mark="dedicated-year" data-legend-series="farm-dedicated"
        x={LEFT} y={137} height={17} fill="var(--role-value-stage)"
        bindings={{ width: (t) => hoursWidth(farmThroughputFrame(t).fastYear) }} />
      <text x={LEFT} y={202} fontSize={12} fill="var(--motion-stage-label-secondary)">0</text>
      <text x={LEFT + hoursWidth(hoursPerYear(RIGS, LOW_RATE))} y={202}
        fontSize={12} textAnchor="middle" fill="var(--motion-stage-label-secondary)">70 h</text>
      <text x={LEFT + WIDTH} y={202} fontSize={12} textAnchor="end" fill="var(--motion-stage-label-secondary)">10,000 h</text>
      <text x={LEFT} y={224} fontSize={13} fill="var(--motion-stage-label)">hours · log scale →</text>
      <AnimatedElement as="text" x={294} y={224} textAnchor="end" fontSize={13}
        fill="var(--motion-stage-label-secondary)"
        bindings={{ opacity: (t) => farmThroughputFrame(t).recap }}>
        same fleet
      </AnimatedElement>
    </StageSvg>
  );
}

export function FarmThroughput({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={FARM_THROUGHPUT_SCENE}
      stage={<FarmThroughputStage />}
      className={className}
      legend={<>
        <LegendItem series="farm-low" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-constraint-graphic)' }} />}>low-rate year</LegendItem>
        <LegendItem series="farm-dedicated" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>dedicated year</LegendItem>
      </>}
      readout={({ beatIndex }) => {
        const frame = farmThroughputFrame(SPANS[beatIndex].end);
        return <><span className="text-text-dim">annual output</span> {formatHours(frame.hoursPerYear)}{' '}
          <span className="text-text-dim">time to target</span> {formatDuration(frame.years)}</>;
      }}
      statusLine="Illustrative log-scaled hours with authored 7- and 1,000-hour rates per rig-year, 10 rigs and a hypothetical 10,000-hour target. DROID's collector counts do not determine annual rig exposure; OXE's total hours remain unknown. Use the chart below to vary the assumptions."
      textAlternative={`${FARM_THROUGHPUT_SCENE.title}. ${FARM_THROUGHPUT_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default FarmThroughput;
