'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  LineTrace,
  PointMarker,
  SmallMultiples,
  roleColour,
  smallMultiplesLayout,
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
 * Three deterministic teaching traces, not measured robot data or an RTC
 * solver. Velocity units, offsets, ramps and five-tick linear blending are
 * internal assumptions. The 0.30 delta-v threshold is a discontinuity
 * proxy, not physical jerk. Preserve all controls, defaults and traces.
 */

/**
 * Every trace is a commanded velocity, so all three take the action role.
 * Each mode's cost is carried in the line itself: the mode that keeps the
 * command stream whole is drawn whole, the mode that stops the robot is
 * drawn with a long broken rhythm, and the mode that tears the command
 * stream is drawn dash-dot. The panels stay separable without colour.
 */
const MODE_META: Record<ExecutionMode, { label: string; dash?: string }> = {
  synchronous: { label: 'synchronous', dash: '8 4' },
  naive: { label: 'naive switch', dash: '10 3 2 3' },
  rtc: { label: 'real-time chunking' },
};

const MODE_ORDER: ExecutionMode[] = ['synchronous', 'naive', 'rtc'];

const V_MAX = 2.0;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const WIDTH = CHART_VIEW_WIDTH;
const LEFT = 14;
const RIGHT = WIDTH - 18;
const LABEL_ASCENT = CHART_TYPE.labelPx * CHART_TYPE.ascent;
const LABEL_DESCENT = CHART_TYPE.labelPx * CHART_TYPE.descent;
/** SmallMultiples sets each panel label this far above its panel. */
const PANEL_LABEL_DROP = CHART_STROKE.tickLength / 2;
const PANEL_H = 40;
const PANEL_GAP = CHART_TYPE.labelPx + CHART_STROKE.tickLength;

// Rows from the top: the hand-off annotation, then the three panels with
// their labels, then the shared time axis under the last panel.
const HANDOFF_LABEL_Y = f(6 + LABEL_ASCENT);
const PLOT_TOP = Math.ceil(HANDOFF_LABEL_Y + LABEL_DESCENT + 4 + LABEL_ASCENT + PANEL_LABEL_DROP);
const PLOT = {
  left: LEFT,
  right: RIGHT,
  top: PLOT_TOP,
  bottom: PLOT_TOP + 3 * PANEL_H + 2 * PANEL_GAP,
};
const HEIGHT = Math.ceil(
  PLOT.bottom +
    CHART_STROKE.tickLength * 1.25 +
    CHART_TYPE.tickPx * (1 + CHART_TYPE.descent) +
    CHART_TYPE.axisPx * (CHART_TYPE.ascent + CHART_TYPE.descent) +
    6,
);

/**
 * SmallMultiples sets each panel label just above the panel, so its
 * descenders reach into the panel's top edge. Marks that span a panel's
 * height start this far down to stay clear of the label.
 */
const PANEL_CLEAR = f(LABEL_DESCENT - CHART_STROKE.tickLength / 2 + 2);

const HANDOFF_SPANS: Array<readonly [number, number]> = [
  [f(HANDOFF_LABEL_Y - LABEL_ASCENT), f(HANDOFF_LABEL_Y + LABEL_DESCENT)],
  ...smallMultiplesLayout(PLOT, MODE_ORDER.length, PANEL_GAP).map(
    (panel) => [f(panel.top + PANEL_CLEAR), panel.bottom] as const,
  ),
];

const x = (tick: number) => f(LEFT + (tick / (TRACE_TICKS - 1)) * (RIGHT - LEFT));
/** Time ticks every 100 ms, in trace ticks of TICK_MS each. */
const TIME_TICKS = [0, 5, 10, 15, 20, 25];

function ModePanel({
  mode,
  delayMs,
  panel,
  hatchId,
  descriptionId,
}: {
  mode: ExecutionMode;
  delayMs: number;
  panel: PlotRect;
  hatchId: string;
  /** All three panels share one takeaway, so all three point at it. */
  descriptionId: string;
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
  const spikeTick = trace.reduce(
    (best, p, i) =>
      i > 0 && Math.abs(p.v - trace[i - 1].v) >= Math.abs(trace[best].v - trace[best - 1].v)
        ? i
        : best,
    1,
  );

  return (
    <g
      data-testid={`panel-${mode}`}
      role="img"
      aria-label={`Illustrative velocity trace for ${meta.label} execution at ${delayMs} milliseconds of inference delay. Peak per-tick velocity step ${peak.toFixed(2)}, ${within ? 'within' : 'above'} the ${JERK_LIMIT.toFixed(2)} discontinuity-proxy limit, not physical jerk.`}
      aria-describedby={descriptionId}
    >
      {pause > 0 ? (
        <ConstraintHatch
          id={hatchId}
          x={pauseFromX}
          y={f(panel.top + PANEL_CLEAR)}
          width={f(pauseToX - pauseFromX)}
          height={f(panel.bottom - panel.top - PANEL_CLEAR)}
        />
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
        strokeDasharray={meta.dash}
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

/** One readout row per panel, in panel order, on the stage text scale. */
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

export function ExecutionModes({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-em-description`;
  const hatchId = `em-dead-time-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [delayMs, setDelayMs] = useState(MIN_DELAY_MS);

  const naivePeak = peakDeltaV(executedTrace('naive', delayMs));
  const naiveFails = naivePeak > JERK_LIMIT;
  const rtcPeak = peakDeltaV(executedTrace('rtc', delayMs));
  const deadMs = pauseTicks(delayMs) * TICK_MS;

  // Sampled from the same executedTrace calls the three panels draw, so a
  // cell and a plotted vertex are the same number and the table moves
  // with the delay slider.
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
    setDelayMs(MIN_DELAY_MS);
  }

  const handoffX = x(HANDOFF_TICK);

  return (
    <InstrumentFigure
      figureId="execution-modes"
      className={className}
      heading="Chunk hand-off modes"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="em-delay" value={`d = ${delayMs} ms`}>
              Inference delay
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
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="em-command" swatch={<LegendSwatch role="action" mark="line" />}>
                  commanded velocity
                </LegendItem>
                <LegendItem series="em-old-plan" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  old plan, uninterrupted
                </LegendItem>
                {/* Delay-dependent marks carry no series id: at zero delay
                    they render nothing for a legend entry to map to. */}
                <LegendItem swatch={<LegendSwatch role="constraint" mark="hatch" />}>robot waits</LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="cross" />}>
                  step over the limit
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                d = {delayMs} ms:{' '}
                {naiveFails
                  ? `the toy naive switch steps by ${naivePeak.toFixed(2)} per tick`
                  : 'all three toy traces stay below the proxy limit'}
                ; Δv proxy limit {JERK_LIMIT.toFixed(2)} per 20 ms tick
              </InstrumentReadout>
              <ModeReadouts delayMs={delayMs} />
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
        >
          <PlotStage viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group">
            <SmallMultiples
              plot={PLOT}
              labels={MODE_ORDER.map((mode) => MODE_META[mode].label)}
              x={x}
              xTicks={TIME_TICKS}
              formatX={(tick) => `${tick * TICK_MS}`}
              xLabel="time (ms)"
              renderPanel={(panel, i) => (
                <ModePanel
                  mode={MODE_ORDER[i]}
                  delayMs={delayMs}
                  panel={panel}
                  hatchId={hatchId}
                  descriptionId={descriptionId}
                />
              )}
            />
            {/* The hand-off instant is the same time in every panel. The
                guide breaks at each panel label row so it never runs
                through a label. */}
            <g data-scene-structure="handoff">
              {HANDOFF_SPANS.map(([y1, y2]) => (
                <line
                  key={y1}
                  x1={handoffX}
                  x2={handoffX}
                  y1={y1}
                  y2={y2}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                  opacity={CHART_STRUCTURE.axesOpacity}
                  strokeDasharray="3 3"
                />
              ))}
              <DirectLabel x={handoffX + 4} y={HANDOFF_LABEL_Y}>
                new chunk arrives
              </DirectLabel>
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Under delay, waiting stops the robot, an instant switch jumps the command, and blending stays under the 0.30 limit."
      source={
        <span data-testid="execution-assumption-note">
          Illustrative hand-off traces, not an RTC solver or measured robot data, in arbitrary units. The 0.30
          per-tick limit is a discontinuity proxy, not physical jerk. The sine-shaped plan, delay-dependent
          offset, four-tick ramps and five-tick linear blend are teaching assumptions, not the paper’s
          inpainting algorithm. RTC (arXiv:2506.07339) motivates overlapping inference and execution; these
          curves do not reproduce its experiments or guarantee safety.
        </span>
      }
    />
  );
}
