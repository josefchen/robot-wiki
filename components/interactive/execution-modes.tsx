'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  LineTrace,
  PointMarker,
  StageAnnotation,
  roleColour,
  type PlotRect,
} from '@/components/motion/chart';
import {
  HANDOFF_TICK,
  JERK_LIMIT,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  TICK_MS,
  TRACE_TICKS,
  executedTrace,
  oldPlanVelocity,
  pauseTicks,
  peakDeltaV,
  type ExecutionMode,
} from '@/lib/execution-modes';

/**
 * ExecutionModes: what the arm does when a new plan arrives while it is
 * still moving. Three lanes share one time axis: pause (synchronous: stop,
 * wait, restart), lurch (naive switch: jump to the new plan at once) and
 * blend (real-time chunking: keep the in-flight moves, then ease over).
 * The figure opens on a 0.2 second thinking delay, where the lurch is
 * plain; the presets step down to 0.1 second and none, where all three
 * lanes coincide.
 *
 * "Adjust more" holds the free delay slider, the per-tick velocity-step
 * readouts and Reset. "How this was made" holds the assumptions: these
 * are deterministic teaching traces, not measured robot data or an RTC
 * solver; velocity units, offsets, ramps and the five-tick linear blend
 * are internal assumptions, and the 0.30 delta-v threshold is a
 * discontinuity proxy, not physical jerk (lib/execution-modes.ts).
 */

/**
 * `label` is the technical mode name the accessible names keep; `plain`
 * is the lane title a first-time reader sees.
 */
const MODE_META: Record<ExecutionMode, { label: string; plain: string }> = {
  synchronous: { label: 'synchronous', plain: 'Pause: stop and wait' },
  naive: { label: 'naive switch', plain: 'Lurch: switch at once' },
  rtc: { label: 'real-time chunking', plain: 'Blend: real-time chunking' },
};

const MODE_ORDER: ExecutionMode[] = ['synchronous', 'naive', 'rtc'];

type DelayPreset = 'none' | 'short' | 'long';
const DELAY_PRESETS: ReadonlyArray<{ id: DelayPreset; label: string; ms: number }> = [
  { id: 'none', label: 'None', ms: 0 },
  { id: 'short', label: '0.1 second', ms: 100 },
  { id: 'long', label: '0.2 second', ms: 200 },
];
const DEFAULT_DELAY_MS = 200;

const V_MAX = 2.0;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const WIDTH = CHART_VIEW_WIDTH;
const LEFT = 14;
const RIGHT = WIDTH - 18;
const LABEL_ASCENT = CHART_TYPE.labelPx * CHART_TYPE.ascent;
const PANEL_H = 44;
/** From a lane title's baseline to the top of its panel. */
const TITLE_DROP = 6;
/** From one panel's bottom to the next lane title's baseline. */
const LANE_GAP = 20;
/** The band under the lurch lane that holds the note. */
const NOTE_BAND = 38;

// Rows from the top: the hand-off label, then each lane title over its
// panel, with the note band under the lurch lane, then the time axis.
const HANDOFF_LABEL_Y = f(6 + LABEL_ASCENT);
const PANELS: Record<ExecutionMode, PlotRect> = (() => {
  const rects = {} as Record<ExecutionMode, PlotRect>;
  let titleY = HANDOFF_LABEL_Y + LANE_GAP;
  for (const mode of MODE_ORDER) {
    const top = f(titleY + TITLE_DROP);
    rects[mode] = { left: LEFT, right: RIGHT, top, bottom: top + PANEL_H };
    titleY = rects[mode].bottom + LANE_GAP + (mode === 'naive' ? NOTE_BAND : 0);
  }
  return rects;
})();
const AXIS_Y = PANELS.rtc.bottom;
const TICK_LABEL_Y = f(AXIS_Y + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 2);
const HEIGHT = Math.ceil(TICK_LABEL_Y + 8);
const NOTE_Y = f(PANELS.naive.bottom + 16);

const x = (tick: number) => f(LEFT + (tick / (TRACE_TICKS - 1)) * (RIGHT - LEFT));
/** Time labels every 0.2 second, in trace ticks of TICK_MS each. */
const TIME_TICKS: Array<[number, string]> = [
  [0, '0'],
  [10, '0.2 second'],
  [20, '0.4 second'],
];

function spikeTickOf(trace: ReturnType<typeof executedTrace>): number {
  return trace.reduce(
    (best, p, i) =>
      i > 0 && Math.abs(p.v - trace[i - 1].v) >= Math.abs(trace[best].v - trace[best - 1].v)
        ? i
        : best,
    1,
  );
}

function ModePanel({
  mode,
  delayMs,
  panel,
  hatchId,
}: {
  mode: ExecutionMode;
  delayMs: number;
  panel: PlotRect;
  hatchId: string;
}) {
  const meta = MODE_META[mode];
  const trace = executedTrace(mode, delayMs);
  const peak = peakDeltaV(trace);
  const within = peak <= JERK_LIMIT;

  const y = (v: number) => f(panel.bottom - (v / V_MAX) * (panel.bottom - panel.top));
  const path = trace
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.tick)},${y(p.v)}`)
    .join(' ');
  const guide = trace.map((p) => [x(p.tick), y(oldPlanVelocity(p.tick))] as const);

  const pause = mode === 'synchronous' ? pauseTicks(delayMs) : 0;
  const pauseFromX = x(HANDOFF_TICK + 4);
  const pauseToX = x(HANDOFF_TICK + 4 + pause);
  const spikeTick = spikeTickOf(trace);

  return (
    <g
      data-testid={`panel-${mode}`}
      role="img"
      aria-label={`Illustrative velocity trace for ${meta.label} execution at ${delayMs} milliseconds of inference delay. Peak per-tick velocity step ${peak.toFixed(2)}, ${within ? 'within' : 'above'} the ${JERK_LIMIT.toFixed(2)} discontinuity-proxy limit, not physical jerk.`}
    >
      <DirectLabel x={panel.left} y={f(panel.top - TITLE_DROP)}>
        {meta.plain}
      </DirectLabel>
      {pause > 0 ? (
        <g data-em-stopped="">
          <ConstraintHatch
            id={hatchId}
            x={pauseFromX}
            y={panel.top}
            width={f(pauseToX - pauseFromX)}
            height={PANEL_H}
          />
          {/* The wait, named in words over the hatch. */}
          <text
            data-scene-tick=""
            x={f((pauseFromX + pauseToX) / 2)}
            y={f(panel.top + 12)}
            textAnchor="middle"
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.label}
          >
            waits
          </text>
        </g>
      ) : null}
      <g data-series="em-old-plan">
        <LineTrace role="reference" points={guide} />
      </g>
      <path
        data-series="em-command"
        data-chart-mark="line"
        data-chart-role="action"
        data-testid={`trace-${mode}`}
        d={path}
        fill="none"
        stroke={roleColour('action')}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!within ? (
        <g data-testid={`spike-${mode}`}>
          <PointMarker x={x(spikeTick)} y={y(trace[spikeTick].v)} role="constraint" shape="cross" />
        </g>
      ) : null}
    </g>
  );
}

/** One readout row per lane, in lane order, on the stage text scale. */
function ModeReadouts({ delayMs }: { delayMs: number }) {
  return (
    <div className="grid min-w-0 basis-full gap-y-0.5 font-sans text-[13px] leading-snug">
      {MODE_ORDER.map((mode) => {
        const peak = peakDeltaV(executedTrace(mode, delayMs));
        const within = peak <= JERK_LIMIT;
        return (
          <div key={mode} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-text-dim">{MODE_META[mode].label}</span>
            <span className="tabular-nums text-text">
              peak |Δv|{' '}
              <span data-testid={`dv-${mode}`} data-value={Number(peak.toFixed(3))}>
                {peak.toFixed(2)}
              </span>
            </span>
            <span data-testid={`verdict-${mode}`} className="text-text">
              {within ? `within ${JERK_LIMIT.toFixed(2)} limit` : `exceeds ${JERK_LIMIT.toFixed(2)} limit`}
            </span>
            {mode === 'synchronous' ? (
              <span className="tabular-nums text-text-dim">
                dead time <span data-testid="pause-readout">{pauseTicks(delayMs) * TICK_MS} ms</span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The note at settle, in plain words for the delay on stage. */
function noteLines(delayMs: number, naiveFails: boolean): string[] {
  if (naiveFails) return ['Sudden jump: the arm lurches', 'when the new plan takes over'];
  if (delayMs === 0) return ['With no delay, the new plan', 'arrives in time: all three match'];
  return ['A short delay leaves only', 'a small jump'];
}

export function ExecutionModes({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-em-description`;
  const hatchId = `em-dead-time-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS);

  const naiveTrace = executedTrace('naive', delayMs);
  const naivePeak = peakDeltaV(naiveTrace);
  const naiveFails = naivePeak > JERK_LIMIT;
  const rtcPeak = peakDeltaV(executedTrace('rtc', delayMs));
  const deadMs = pauseTicks(delayMs) * TICK_MS;
  const preset = DELAY_PRESETS.find((p) => p.ms === delayMs)?.id ?? null;

  // Sampled from the same executedTrace calls the three lanes draw, so a
  // cell and a plotted vertex are the same number and the table moves
  // with the delay.
  const sampleRows = useMemo(() => {
    const traces = Object.fromEntries(
      MODE_ORDER.map((mode) => [mode, executedTrace(mode, delayMs)]),
    ) as Record<ExecutionMode, ReturnType<typeof executedTrace>>;
    return [0, 6, 12, 18, 24, TRACE_TICKS - 1].map((tick) => ({
      label: `${tick}`,
      values: MODE_ORDER.map((mode) => {
        const point = traces[mode].find((p) => p.tick === tick);
        return (point?.v ?? 0).toFixed(2);
      }),
    }));
  }, [delayMs]);

  const descriptionText = `At ${delayMs} ms of inference delay the synchronous velocity trace stops for ${deadMs} ms of dead time, while the naive switch reaches a peak velocity step of ${naivePeak.toFixed(
    2,
  )} per 20 ms tick and real-time chunking reaches ${rtcPeak.toFixed(
    2,
  )}, both read against the illustrative ${JERK_LIMIT.toFixed(
    2,
  )} discontinuity-proxy limit; these constructed traces use arbitrary velocity units, not physical jerk or measured robot data. The five-tick linear blend is not RTC inpainting, and the dashed guide is the uninterrupted toy old plan.`;

  function reset() {
    setDelayMs(DEFAULT_DELAY_MS);
  }

  const handoffX = x(HANDOFF_TICK);
  const naive = PANELS.naive;
  const naiveY = (v: number) => f(naive.bottom - (v / V_MAX) * (naive.bottom - naive.top));
  const spikeTick = spikeTickOf(naiveTrace);
  const spike: [number, number] = [x(spikeTick), naiveY(naiveTrace[spikeTick].v)];

  return (
    <InstrumentFigure
      figureId="execution-modes"
      className={className}
      kicker="Chunk hand-off"
      heading="Three ways to swap plans: pause, lurch, or blend"
      controls={
        <PresetGroup<DelayPreset>
          label="Thinking delay"
          presets={DELAY_PRESETS.map(({ id, label }) => ({ id, label }))}
          value={preset}
          onChange={(id) => setDelayMs(DELAY_PRESETS.find((p) => p.id === id)?.ms ?? DEFAULT_DELAY_MS)}
          testId="em-delay"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor="em-delay" value={`d = ${delayMs} ms`}>
              Inference delay, any value
            </ControlLabel>
            <input
              id="em-delay"
              type="range"
              data-brand-control-id="control:input"
              min={MIN_DELAY_MS}
              max={MAX_DELAY_MS}
              step={10}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              aria-label={`Inference delay in milliseconds, currently ${delayMs}`}
              aria-valuetext={`${delayMs} milliseconds`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="none" high="0.2 second" />
          </ControlField>
          <InstrumentReadout>
            d = {delayMs} ms:{' '}
            {naiveFails
              ? `the toy naive switch steps by ${naivePeak.toFixed(2)} per tick`
              : 'all three toy traces stay below the proxy limit'}
            ; Δv proxy limit {JERK_LIMIT.toFixed(2)} per 20 ms tick
          </InstrumentReadout>
          <ModeReadouts delayMs={delayMs} />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <StageStatus>
              Each solid line is the arm&apos;s speed; the dashed line is the old plan, had
              nothing changed.
            </StageStatus>
          }
        >
          {/* A group, not an image, so each lane keeps its own name; the
              shared takeaway describes the group once. */}
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="group"
            aria-label="Velocity traces for the three execution modes on one time axis"
            aria-describedby={descriptionId}
          >
            {/* The hand-off instant is the same time in every lane; the
                guide runs inside the panels only, never through a title. */}
            <g data-scene-structure="handoff">
              {MODE_ORDER.map((mode) => (
                <line
                  key={mode}
                  x1={handoffX}
                  x2={handoffX}
                  y1={PANELS[mode].top}
                  y2={PANELS[mode].bottom}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                  opacity={CHART_STRUCTURE.axesOpacity}
                  strokeDasharray="3 3"
                />
              ))}
              <DirectLabel x={handoffX + 4} y={HANDOFF_LABEL_Y}>
                new plan due
              </DirectLabel>
            </g>
            {MODE_ORDER.map((mode) => (
              <ModePanel key={mode} mode={mode} delayMs={delayMs} panel={PANELS[mode]} hatchId={hatchId} />
            ))}
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={AXIS_Y}
              y2={AXIS_Y}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              opacity={CHART_STRUCTURE.axesOpacity}
            />
            {TIME_TICKS.map(([tick, label]) => (
              <g key={tick}>
                <line
                  x1={x(tick)}
                  x2={x(tick)}
                  y1={AXIS_Y}
                  y2={AXIS_Y + CHART_STROKE.tickLength}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                  opacity={CHART_STRUCTURE.axesOpacity}
                />
                <text
                  data-scene-tick=""
                  x={x(tick)}
                  y={TICK_LABEL_Y}
                  textAnchor={tick === 0 ? 'start' : 'middle'}
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {label}
                </text>
              </g>
            ))}
            <StageAnnotation
              x={f(handoffX + 10)}
              y={NOTE_Y}
              lines={noteLines(delayMs, naiveFails)}
              target={naiveFails ? spike : undefined}
              from={naiveFails ? [spike[0], f(naive.bottom + 4)] : undefined}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="A robot that gets a new plan mid-motion can stop, lurch, or blend the two; blending keeps it moving smoothly."
      method={
        <>
          <p>
            Each lane is the commanded velocity of one arm around a single chunk hand-off: the old
            chunk runs out at the dashed line and the new one, computed during the thinking delay,
            takes over. Pausing (synchronous execution) slows to rest, waits out the delay and
            starts again, so it costs dead time rather than a jump. Switching at once (a naive
            switch) applies the whole disagreement between the stale plan and the fresh one in one
            20 ms tick. Real-time chunking keeps the moves already under way for the length of the
            delay, then eases into the new plan.
          </p>
          <p>
            The velocity-step readouts in &ldquo;Adjust more&rdquo; read each lane against a{' '}
            {JERK_LIMIT.toFixed(2)} per-tick limit. With no delay all three lanes coincide: the new
            plan is ready the tick the old one ends, so the synchronous lane has nothing to wait
            for.
          </p>
          <p data-testid="execution-assumption-note">
            Illustrative hand-off traces, not an RTC solver or measured robot data, in arbitrary units. The 0.30
            per-tick limit is a discontinuity proxy, not physical jerk. The sine-shaped plan, delay-dependent
            offset, four-tick ramps and five-tick linear blend are teaching assumptions, not the paper’s
            inpainting algorithm. RTC (arXiv:2506.07339) motivates overlapping inference and execution; these
            curves do not reproduce its experiments or guarantee safety.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Sampled commanded velocity across the hand-off"
            rowHeader="tick"
            columns={[
              { header: 'synchronous', numeric: true },
              { header: 'naive', numeric: true },
              { header: 'chunking', numeric: true },
            ]}
            rows={sampleRows}
            description={descriptionText}
          />
        </>
      }
      source="Illustrative traces in arbitrary units; method from the real-time chunking paper."
    />
  );
}
