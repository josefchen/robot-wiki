'use client';

/**
 * Jam overhead: the same picking cell twice, one hour each, both getting 99
 * picks in 100 right. The only difference is how long a person needs to
 * clear each failed pick: 15 seconds or 5 minutes. Every number comes from
 * computeEconomics with the calculator's defaults, so the scene and the
 * calculator above it always agree. The poster is the comparison: both
 * hours drawn, the slow cell's jam time named.
 */
import { useId } from 'react';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import {
  AMORTIZATION_MONTHS,
  DEFAULT_INPUTS,
  PAYBACK_TARGET_MONTHS,
  ROBOT_HOURS_PER_MONTH,
  SECONDS_PER_HOUR,
  computeEconomics,
} from '@/lib/deployment-economics';

const SUCCESS = 99;
const QUICK_SECONDS = DEFAULT_INPUTS.jamClearSeconds;
const SLOW_SECONDS = 300;
const QUICK = computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: SUCCESS, jamClearSeconds: QUICK_SECONDS });
const SLOW = computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: SUCCESS, jamClearSeconds: SLOW_SECONDS });
const SLOW_JAM_MINUTES = Math.round(SLOW.timeBreakdown.jamClearing / 60);
const months = (value: number | null) => (value === null ? 'never' : value.toFixed(1));

export const JAM_OVERHEAD_SCENE: SceneDefinition = {
  id: 'jam-overhead',
  title: 'Clearing time takes capacity from an authored picking cell',
  kicker: 'Picking-cell economics',
  headline: `Same 99% success; slow fixes eat ${SLOW_JAM_MINUTES} minutes an hour`,
  beats: [
    {
      id: 'quick',
      caption: 'In a cell where 99 in 100 picks succeed, quick 15-second fixes take under 2 minutes of each hour.',
    },
    {
      id: 'slow',
      duration: 'long',
      linear: true,
      caption: `Same success rate, but each fix now takes 5 minutes: jam time grows to ${SLOW_JAM_MINUTES} minutes of every hour.`,
    },
    {
      id: 'payback',
      caption: `The slow cell finishes fewer picks, so it takes ${months(SLOW.paybackMonths)} months to pay back instead of ${months(QUICK.paybackMonths)}.`,
    },
    {
      id: 'recap',
      caption: 'A robot that rarely fails can still pay off slowly if every failure needs a person for minutes.',
    },
  ],
};

const SPANS = beatSpans(JAM_OVERHEAD_SCENE.beats);
const progress = (t: number, index: number) =>
  clamp01((t - SPANS[index].start) / SPANS[index].duration);

/**
 * The scene at time t: the quick cell is fixed at 99% and 15 seconds; the
 * slow cell's clearing time runs from 15 to 300 seconds over the second
 * beat, so `outputs` is the slow cell at that moment.
 */
export function jamOverheadFrame(t: number) {
  const jamClearSeconds = QUICK_SECONDS + (SLOW_SECONDS - QUICK_SECONDS) * progress(t, 1);
  return {
    successRatePercent: SUCCESS,
    jamClearSeconds,
    quick: QUICK,
    outputs: computeEconomics({
      ...DEFAULT_INPUTS,
      successRatePercent: SUCCESS,
      jamClearSeconds,
    }),
    quickShown: smooth(progress(t, 0)),
    slowShown: t >= SPANS[1].start ? 1 : 0,
    recap: smooth(progress(t, 3)),
  };
}

const FONT = 14;
const BAR_LEFT = 12;
const BAR_WIDTH = 316;
const BAR_HEIGHT = 4;
const ROW_1 = 62;
const ROW_2 = 124;
const AXIS_Y = ROW_2 + BAR_HEIGHT + 8;
const NOTE_Y = AXIS_Y + 50;
const NOTE_LINE = FONT * 1.3;
const HEIGHT = NOTE_Y + NOTE_LINE + 12;
const r1 = (v: number) => Number(v.toFixed(1));
const partWidth = (seconds: number) => (seconds / SECONDS_PER_HOUR) * BAR_WIDTH;

function HourBar({
  y,
  hatchId,
  breakdown,
  shown,
}: {
  y: number;
  hatchId: string;
  breakdown: (t: number) => { productive: number; jamClearing: number; downtime: number };
  shown: (t: number) => number;
}) {
  return (
    <AnimatedGroup bindings={{ opacity: (t) => Number(shown(t).toFixed(3)) }}>
      <AnimatedElement
        as="rect"
        data-scene-mark="productive-time"
        data-legend-series="cell-productive"
        x={BAR_LEFT}
        y={y}
        height={BAR_HEIGHT}
        fill="var(--role-value-stage)"
        bindings={{ width: (t) => r1(partWidth(breakdown(t).productive)) }}
      />
      <AnimatedElement
        as="rect"
        data-scene-mark="clearing-time"
        data-legend-series="cell-clearing"
        y={y}
        height={BAR_HEIGHT}
        fill={`url(#${hatchId})`}
        stroke="var(--role-constraint-stage)"
        strokeWidth={1}
        bindings={{
          x: (t) => r1(BAR_LEFT + partWidth(breakdown(t).productive)),
          width: (t) => r1(partWidth(breakdown(t).jamClearing)),
        }}
      />
      <AnimatedElement
        as="rect"
        data-scene-mark="downtime"
        data-legend-series="cell-downtime"
        y={y + 0.5}
        height={BAR_HEIGHT - 1}
        fill="none"
        stroke="var(--role-constraint-stage)"
        strokeWidth={1}
        strokeDasharray="3 2"
        bindings={{
          x: (t) => r1(BAR_LEFT + partWidth(breakdown(t).productive + breakdown(t).jamClearing)),
          width: (t) => r1(partWidth(breakdown(t).downtime)),
        }}
      />
    </AnimatedGroup>
  );
}

function JamOverheadStage() {
  const hatchId = `jam-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const slowJamStart = BAR_LEFT + partWidth(SLOW.timeBreakdown.productive);
  const slowJamCentre = slowJamStart + partWidth(SLOW.timeBreakdown.jamClearing) / 2;
  return (
    <StageSvg viewBox={`0 0 340 ${HEIGHT}`}>
      <defs>
        <pattern id={hatchId} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke="var(--role-constraint-stage)" strokeWidth={1} />
        </pattern>
      </defs>
      <text x={12} y={22} fontSize={FONT} fill="var(--motion-stage-label)">
        One working hour, 99 in 100 picks right
      </text>

      <AnimatedElement as="text" x={BAR_LEFT} y={ROW_1 - 8} fontSize={FONT}
        fill="var(--motion-stage-label)" bindings={{ opacity: (t) => Number(jamOverheadFrame(t).quickShown.toFixed(3)) }}>
        Quick fixes: 15 seconds each
      </AnimatedElement>
      <HourBar
        y={ROW_1}
        hatchId={hatchId}
        breakdown={() => QUICK.timeBreakdown}
        shown={(t) => jamOverheadFrame(t).quickShown}
      />

      <AnimatedElement as="text" x={BAR_LEFT} y={ROW_2 - 8} fontSize={FONT}
        fill="var(--motion-stage-label)" bindings={{ opacity: (t) => jamOverheadFrame(t).slowShown }}>
        Slow fixes: 5 minutes each
      </AnimatedElement>
      <HourBar
        y={ROW_2}
        hatchId={hatchId}
        breakdown={(t) => jamOverheadFrame(t).outputs.timeBreakdown}
        shown={(t) => jamOverheadFrame(t).slowShown}
      />

      <g data-scene-structure="hour-axis">
        <line x1={BAR_LEFT} x2={BAR_LEFT + BAR_WIDTH} y1={AXIS_Y} y2={AXIS_Y}
          stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      </g>
      <text x={BAR_LEFT} y={AXIS_Y + 18} fontSize={FONT} data-scene-tick fill="var(--motion-stage-label-secondary)">0</text>
      <text x={BAR_LEFT + BAR_WIDTH / 2} y={AXIS_Y + 18} fontSize={FONT} data-scene-tick textAnchor="middle" fill="var(--motion-stage-label-secondary)">30</text>
      <text x={BAR_LEFT + BAR_WIDTH} y={AXIS_Y + 18} fontSize={FONT} data-scene-tick textAnchor="end" fill="var(--motion-stage-label-secondary)">60 min</text>

      {/* The settle note: the slow cell's jam time. */}
      <AnimatedGroup
        data-figure-annotation=""
        bindings={{ opacity: (t) => Number(jamOverheadFrame(t).recap.toFixed(3)) }}
      >
        <g data-scene-structure="settle-note-leader">
          <line x1={r1(slowJamCentre)} x2={r1(slowJamCentre)} y1={ROW_2 + BAR_HEIGHT + 2} y2={NOTE_Y - FONT - 2}
            stroke="var(--role-highlight-stage)" strokeWidth={1} />
        </g>
        <text data-scene-label="settle-note" x={12} y={NOTE_Y - 2} fontSize={FONT}
          fill="var(--role-highlight-stage)">
          <tspan x={12} dy={0}>{`A person fixing jams: ${SLOW_JAM_MINUTES} minutes`}</tspan>
          <tspan x={12} dy={NOTE_LINE}>of every hour, while the robot waits</tspan>
        </text>
      </AnimatedGroup>
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
        <LegendItem series="cell-productive" swatch={<span aria-hidden className="inline-block h-2.5 w-3" style={{ backgroundColor: 'var(--role-value-graphic)' }} />}>robot picking</LegendItem>
        <LegendItem series="cell-clearing" swatch={<span aria-hidden className="inline-block h-2.5 w-3 border" style={{ borderColor: 'var(--role-constraint-graphic)', backgroundImage: 'repeating-linear-gradient(45deg, var(--role-constraint-graphic) 0 1.5px, transparent 1.5px 4px)' }} />}>a person fixing jams</LegendItem>
        <LegendItem series="cell-downtime" swatch={<span aria-hidden className="inline-block h-2.5 w-3 border border-dashed" style={{ borderColor: 'var(--role-constraint-graphic)' }} />}>stopped for upkeep</LegendItem>
      </>}
      readout={({ beatIndex }) => (beatIndex === 0
        ? <>Pays for itself in {months(QUICK.paybackMonths)} months with quick fixes</>
        : <>Pays for itself in {months(QUICK.paybackMonths)} months with quick fixes,{' '}
          {months(jamOverheadFrame(SPANS[beatIndex].end).outputs.paybackMonths)} with slow ones</>)}
      statusLine="Illustrative: chosen inputs, not a measured cell."
      method={
        <>
          <p>
            Both hours come from the cell economics calculator above, with its seven authored
            defaults except per-pick success, set to {SUCCESS}%: robot cost{' '}
            {DEFAULT_INPUTS.robotCost.toLocaleString('en-US')} USD, integration multiple{' '}
            {DEFAULT_INPUTS.integrationMultiple}x, a {DEFAULT_INPUTS.cycleTimeSeconds}-second
            cycle, {DEFAULT_INPUTS.uptimePercent}% uptime and a {DEFAULT_INPUTS.wageUsdPerHour} USD
            hourly wage. Only the jam-clearing time changes: {QUICK_SECONDS} s against{' '}
            {SLOW_SECONDS} s. Downtime is the {100 - DEFAULT_INPUTS.uptimePercent}% of the hour the
            cell is not up.
          </p>
          <p>
            Quick fixes: {QUICK.timeBreakdown.jamClearing.toFixed(0)} s of jam clearing per elapsed
            hour, {QUICK.netPicksPerHour.toFixed(1)} picks/h, payback {months(QUICK.paybackMonths)} mo.
            Slow fixes: {SLOW.timeBreakdown.jamClearing.toFixed(0)} s of jam clearing,{' '}
            {SLOW.netPicksPerHour.toFixed(1)} picks/h, payback {months(SLOW.paybackMonths)} mo.
          </p>
          <p>
            Illustrative cell, not observed economics or a financial forecast. The seven authored
            inputs and the {ROBOT_HOURS_PER_MONTH}-hour month, {AMORTIZATION_MONTHS}-month
            amortization and {PAYBACK_TARGET_MONTHS}-month verdict assumptions are stated with the
            calculator above.
          </p>
        </>
      }
      textAlternative={`${JAM_OVERHEAD_SCENE.title}: ${JAM_OVERHEAD_SCENE.headline}. Two hours of the same picking cell, both at ${SUCCESS}% per-pick success. ${JAM_OVERHEAD_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default JamOverhead;
