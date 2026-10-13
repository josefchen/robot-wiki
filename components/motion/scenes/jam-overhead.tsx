'use client';

/**
 * Jam overhead: the same picking cell twice, one hour each, both getting 99
 * picks in 100 right. The only difference is how long a person needs to
 * clear each failed pick: 15 seconds or 5 minutes. Every number comes from
 * computeEconomics with the calculator's defaults, so the scene and the
 * calculator above it always agree. The poster is the comparison: both
 * hours drawn, the slow cell's jam time named.
 *
 * The stage is a control desk for the two cells (the isometric figure kit,
 * components/iso/figures/jam-recorder-desk.ts). Each door carries a
 * 60-minute circular chart recorder: the paper turns once an hour and the
 * pen rides the outer ring while the robot picks, the middle ring while a
 * person clears a failed pick and the inner ring while the cell is down for
 * upkeep. Under each chart, a counter counts good picks and a timer shows
 * how long each fix takes. The inked rings are the scene's marks, in their
 * semantic roles; the part to watch in each beat is the one lit part.
 */
import { useId, type ReactNode } from 'react';
import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { clamp01, smooth } from '@/components/motion/easing';
import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { beatSpans, locate, type SceneDefinition } from '@/components/motion/timeline';
import { LegendItem } from '@/components/ui/instrument';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import {
  CELLS,
  CHART_MATRIX,
  CHART_PRINT,
  COUNTER_CLIP,
  HUB,
  LEVELS,
  PARTS,
  PEN_ARM,
  PIVOT_BOSS,
  TIMER_MATRIX,
  TIMER_POINTER,
  VIEW_BOX,
  WINDOW_CLIP,
  armTurn,
  chartTurn,
  counterDigits,
  hourLayout,
  picksBy,
  stateAt,
  timerAngle,
  traceOf,
  type Cell,
  type CellState,
  type Part,
  type Slot,
} from '@/components/iso/figures/jam-recorder-desk';
import {
  AMORTIZATION_MONTHS,
  DEFAULT_INPUTS,
  PAYBACK_TARGET_MONTHS,
  ROBOT_HOURS_PER_MONTH,
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

/** The share of the second beat the slow cell's timer takes to turn to 5 minutes before its hour runs. */
const KNOB_SHARE = 0.25;

/**
 * The scene at time t. The quick cell is fixed at 99% and 15 seconds and
 * runs its hour over the first beat. In the second beat the slow cell's
 * jam timer turns from 15 to 300 seconds, then its hour runs at 5-minute
 * fixes; `outputs` is the slow cell at that moment. `quickHour` and
 * `slowHour` are how far each chart has turned, in seconds of its hour.
 */
export function jamOverheadFrame(t: number) {
  const knob = smooth(clamp01(progress(t, 1) / KNOB_SHARE));
  const jamClearSeconds = QUICK_SECONDS + (SLOW_SECONDS - QUICK_SECONDS) * knob;
  return {
    successRatePercent: SUCCESS,
    jamClearSeconds,
    quick: QUICK,
    outputs: computeEconomics({
      ...DEFAULT_INPUTS,
      successRatePercent: SUCCESS,
      jamClearSeconds,
    }),
    quickHour: 3600 * smooth(progress(t, 0)),
    slowHour: 3600 * clamp01((progress(t, 1) - KNOB_SHARE) / (1 - KNOB_SHARE)),
    /** The beat the stage is in, which picks the one lit part. */
    beat: locate(SPANS, t).index,
    /** The slow cell's jam ink thickens over the recap. */
    emphasis: smooth(progress(t, 3)),
  };
}

const HOUR = {
  cycleTimeSeconds: DEFAULT_INPUTS.cycleTimeSeconds,
  successRatePercent: SUCCESS,
  uptimePercent: DEFAULT_INPUTS.uptimePercent,
};
const QUICK_LAYOUT = hourLayout({ ...HOUR, jamClearSeconds: QUICK_SECONDS });

/** One cell's desk at time t: its hour layout, how far its chart has turned and its timer setting. */
function cellAt(cell: Cell, t: number) {
  const frame = jamOverheadFrame(t);
  const fix = cell === 'quick' ? QUICK_SECONDS : frame.jamClearSeconds;
  const layout = cell === 'quick' ? QUICK_LAYOUT : hourLayout({ ...HOUR, jamClearSeconds: fix });
  const seconds = cell === 'quick' ? frame.quickHour : frame.slowHour;
  return { frame, fix, layout, seconds };
}

const traces = new Map<string, Record<CellState, string>>();
/** The ink on a cell's paper at time t, memoised per frame (three marks read it). */
function inkAt(cell: Cell, t: number) {
  const key = `${cell}:${t}`;
  let ink = traces.get(key);
  if (!ink) {
    const { layout, seconds } = cellAt(cell, t);
    ink = traceOf(layout, seconds);
    if (traces.size > 24) traces.clear();
    traces.set(key, ink);
  }
  return ink;
}

const r2 = (value: number) => Number(value.toFixed(2));
/** The one lit part per beat: the pen drawing the hour, then the slow cell's counter, then its pen. */
const litPen = (cell: Cell, t: number) => {
  const beat = jamOverheadFrame(t).beat;
  return cell === 'quick' ? beat === 0 : beat === 1 || beat === 3;
};
const MARKS: ReadonlyArray<{ state: CellState; mark: string; series: string; role: string; width: number }> = [
  { state: 'picking', mark: 'productive-time', series: 'cell-productive', role: 'var(--role-value-stage)', width: 1.25 },
  { state: 'clearing', mark: 'clearing-time', series: 'cell-clearing', role: 'var(--role-constraint-stage)', width: 1.5 },
  { state: 'downtime', mark: 'downtime', series: 'cell-downtime', role: 'var(--role-constraint-stage)', width: 1.5 },
];

function ChartSlot({ cell, clipId }: { cell: Cell; clipId: string }) {
  const [pu, pv] = PEN_ARM.pivot;
  return (
    <g clipPath={`url(#${clipId})`} data-recorder={cell}>
      <g transform={CHART_MATRIX[cell]}>
        <AnimatedGroup bindings={{ transform: (t) => `rotate(${r2(chartTurn(cellAt(cell, t).seconds))})` }}>
          <path className="iso-fill" d={CHART_PRINT.paper} />
          <path className="iso-top" d={CHART_PRINT.paper} />
          <Line d={CHART_PRINT.rim} tone="lo" />
          <Line d={CHART_PRINT.rings} tone="faint" />
          <Line d={CHART_PRINT.hours} tone="faint" />
          <Line d={CHART_PRINT.minutes} tone="faint" />
          <Line d={CHART_PRINT.hub} tone="lo" />
          {MARKS.map(({ state, mark, series, role, width }) => (
            <AnimatedElement
              key={state}
              as="path"
              data-scene-mark={mark}
              data-legend-series={series}
              fill="none"
              stroke={role}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              bindings={{ d: (t) => inkAt(cell, t)[state] }}
            />
          ))}
          {cell === 'slow' ? (
            // Over the recap the slow cell's jam ink is gone over again, heavier: 19 minutes of every hour.
            <AnimatedElement
              as="path"
              data-scene-mark="clearing-time"
              data-legend-series="cell-clearing"
              fill="none"
              stroke="var(--role-constraint-stage)"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              bindings={{
                d: (t) => inkAt(cell, t).clearing,
                opacity: (t) => r2(jamOverheadFrame(t).emphasis),
              }}
            />
          ) : null}
        </AnimatedGroup>
      </g>
      <Solid paths={HUB[cell]} tone="mid" />
      <g transform={CHART_MATRIX[cell]}>
        <AnimatedGroup
          bindings={{
            transform: (t) => {
              const { layout, seconds } = cellAt(cell, t);
              return `rotate(${r2(armTurn(LEVELS[stateAt(layout, seconds)]))} ${pu} ${pv})`;
            },
          }}
        >
          <path className="iso-fill" d={PEN_ARM.strip} />
          <path className="iso-top" d={PEN_ARM.strip} />
          <Line d={PEN_ARM.rib} tone="faint" />
          <AnimatedElement as="path" className="iso-line" d={PEN_ARM.strip} bindings={{ 'data-tone': (t) => (litPen(cell, t) ? 'lit' : 'mid') }} />
          <path className="iso-fill" d={PEN_ARM.nib} />
          <AnimatedElement as="path" className="iso-line" d={PEN_ARM.nib} bindings={{ 'data-tone': (t) => (litPen(cell, t) ? 'lit' : 'hi') }} />
        </AnimatedGroup>
      </g>
      <Solid paths={PIVOT_BOSS[cell]} tone="mid" />
    </g>
  );
}

function SlotView({ slot, uid }: { slot: Slot; uid: string }): ReactNode {
  const [kind, cell] = slot.split('-') as ['chart' | 'counter' | 'timer', Cell];
  if (kind === 'chart') return <ChartSlot cell={cell} clipId={`${uid}-window-${cell}`} />;
  if (kind === 'counter') {
    return (
      <g clipPath={`url(#${uid}-counter-${cell})`} data-counter={cell}>
        {/* The counter's digits stand for displayed text, so their stroke ends may stop on the window. */}
        <AnimatedElement
          as="path"
          className="iso-line"
          data-free=""
          bindings={{
            d: (t) => {
              const { layout, seconds } = cellAt(cell, t);
              return counterDigits(cell, picksBy(layout, seconds, DEFAULT_INPUTS.cycleTimeSeconds));
            },
            'data-tone': (t) => (cell === 'slow' && jamOverheadFrame(t).beat === 2 ? 'lit' : 'hi'),
          }}
        />
      </g>
    );
  }
  return (
    <g transform={TIMER_MATRIX[cell]} data-timer={cell}>
      <AnimatedGroup bindings={{ transform: (t) => `rotate(${r2(timerAngle(cellAt(cell, t).fix))})` }}>
        <Line d={TIMER_POINTER} tone="hi" free />
      </AnimatedGroup>
    </g>
  );
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  return (
    <g>
      <path className="iso-fill" d={part.d} />
      {part.fill === 'top' ? <path className="iso-top" d={part.d} /> : <path className="iso-shade" data-shade={part.fill} d={part.d} />}
    </g>
  );
}

function JamOverheadStage() {
  const uid = `jam-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div className="iso" data-anatomy-drawing="">
      <StageSvg viewBox={VIEW_BOX} className="iso-svg">
        <defs>
          {CELLS.map((cell) => (
            <g key={cell}>
              <clipPath id={`${uid}-window-${cell}`}>
                <path d={WINDOW_CLIP[cell]} />
              </clipPath>
              <clipPath id={`${uid}-counter-${cell}`}>
                <path d={COUNTER_CLIP[cell]} />
              </clipPath>
            </g>
          ))}
        </defs>
        {PARTS.map((part, index) =>
          part.kind === 'slot' ? <SlotView key={part.slot} slot={part.slot} uid={uid} /> : <PartView key={index} part={part} />,
        )}
      </StageSvg>
    </div>
  );
}

/** A legend swatch: three printed rings, the named one inked in its role. */
function RingSwatch({ level, role }: { level: 0 | 1 | 2; role: string }) {
  const ys = [2.5, 6, 9.5];
  return (
    <svg aria-hidden="true" viewBox="0 0 16 12" className="inline-block h-3 w-4 shrink-0">
      {ys.map((y, index) => (
        <line key={y} x1={1} x2={15} y1={y} y2={y} stroke={index === level ? role : 'var(--line-strong)'} strokeWidth={index === level ? 1.6 : 1} />
      ))}
    </svg>
  );
}

export function JamOverhead({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={JAM_OVERHEAD_SCENE}
      stage={<JamOverheadStage />}
      className={className}
      legend={<>
        <LegendItem series="cell-productive" swatch={<RingSwatch level={0} role="var(--role-value-graphic)" />}>outer ring: robot picking</LegendItem>
        <LegendItem series="cell-clearing" swatch={<RingSwatch level={1} role="var(--role-constraint-graphic)" />}>middle ring: a person fixing a jam</LegendItem>
        <LegendItem series="cell-downtime" swatch={<RingSwatch level={2} role="var(--role-constraint-graphic)" />}>inner ring: stopped for upkeep</LegendItem>
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
            The drawing is a control desk for the two cells. Each door carries a 60-minute
            circular chart recorder whose paper turns once an hour; the pen rides the outer ring
            while the robot picks, the middle ring while a person clears a failed pick and the
            inner ring while the cell is down for upkeep. Each hour is laid out as runs of 100 good
            picks, each followed by one fix, with the last partial run split in the same ratio and
            the downtime at the end, so the inked arcs add up to the calculator&apos;s time split.
            The counter under each chart counts good picks ({Math.floor(QUICK.netPicksPerHour)} and{' '}
            {Math.floor(SLOW.netPicksPerHour)} in the hour) and the timer beside it shows how long
            each fix takes.
          </p>
          <p>
            Illustrative cell, not observed economics or a financial forecast. The seven authored
            inputs and the {ROBOT_HOURS_PER_MONTH}-hour month, {AMORTIZATION_MONTHS}-month
            amortization and {PAYBACK_TARGET_MONTHS}-month verdict assumptions are stated with the
            calculator above.
          </p>
        </>
      }
      textAlternative={`${JAM_OVERHEAD_SCENE.title}: ${JAM_OVERHEAD_SCENE.headline}. Two hours of the same picking cell, both at ${SUCCESS}% per-pick success, logged by a circular chart recorder on each cell's door: the pen rides the outer ring while the robot picks and swings in while a person fixes a jam or the cell is down. ${JAM_OVERHEAD_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')}`}
    />
  );
}

export default JamOverhead;
