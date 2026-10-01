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
  smallMultiplesLayout,
  type ChartPoint,
  type PlotRect,
} from '@/components/motion/chart';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  MODE_VALUE,
  TRACE_TICKS,
  VALID_ACTION_FLOOR,
  isValidModeAction,
  rtcHandoffTrace,
  rtcThroughput,
  teActionAtHandoff,
  teHandoffTrace,
  teStatus,
  teThroughput,
} from '@/lib/latency-chunking';

/**
 * LatencyComparison: why temporal ensembling breaks under inference delay
 * and Real-Time Chunking does not.
 *
 * One slider injects inference delay (0 to 240 ms). Two plots respond:
 * a toy throughput-vs-delay chart (its shape and percentages are assumptions,
 * not a fitted or measured benchmark) and a hand-off action trace showing the ensemble's
 * averaged action leaving both valid modes. Curves are a qualitative model
 * of the published results (arXiv:2506.07339), labeled as such.
 *
 * Interactive contract: deterministic initial render, visible readouts,
 * reset control, native keyboard-accessible slider with an aria-label,
 * fixed-height charts (no layout shift), no auto-playing motion.
 */
type LatencyComparisonProps = {
  /** Initial injected delay in ms. Default 0 (no added latency). */
  defaultDelayMs?: number;
  className?: string;
};

/** Delay window (ms) where Physical Intelligence documents TE failing. */
const FAILURE_WINDOW = { from: 100, to: 200 };

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** Both plots are small multiples with one panel per strategy, in this order. */
const STRATEGIES = ['te', 'rtc'] as const;
type Strategy = (typeof STRATEGIES)[number];
const PANEL_LABELS = ['temporal ensembling', 'real-time chunking'];

const WIDTH = CHART_VIEW_WIDTH;
const LEFT = 48;
const RIGHT = WIDTH - 18;
const LABEL_ASCENT = CHART_TYPE.labelPx * CHART_TYPE.ascent;
const LABEL_DESCENT = CHART_TYPE.labelPx * CHART_TYPE.descent;
/** SmallMultiples sets each panel label this far above its panel. */
const PANEL_LABEL_DROP = CHART_STROKE.tickLength / 2;
/** SmallMultiples' own gap between panels, which holds the next label. */
const PANEL_GAP = CHART_TYPE.labelPx + CHART_STROKE.tickLength;
/** Tick labels and the axis name under the last panel. */
const AXIS_BAND =
  CHART_STROKE.tickLength * 1.25 +
  CHART_TYPE.tickPx * (1 + CHART_TYPE.descent) +
  CHART_TYPE.axisPx * (CHART_TYPE.ascent + CHART_TYPE.descent) +
  6;
/** One top row for a label, then the first panel's label under it. */
const TOP_LABEL_Y = f(6 + LABEL_ASCENT);
const PLOT_TOP = Math.ceil(TOP_LABEL_Y + LABEL_DESCENT + 4 + LABEL_ASCENT + PANEL_LABEL_DROP);

/**
 * SmallMultiples sets each panel label just above the panel, so its
 * descenders reach into the panel's top edge. Marks that span a panel's
 * height start this far down to stay clear of the label.
 */
const PANEL_CLEAR = f(LABEL_DESCENT - CHART_STROKE.tickLength / 2 + 2);

const SCORE_PANEL_H = 40;
/** Room above 100 percent so the next panel's label clears the line. */
const SCORE_HEADROOM = 6;
const SCORE_PLOT: PlotRect = {
  left: LEFT,
  right: RIGHT,
  top: PLOT_TOP,
  bottom: PLOT_TOP + 2 * SCORE_PANEL_H + PANEL_GAP,
};
const SCORE_HEIGHT = Math.ceil(SCORE_PLOT.bottom + AXIS_BAND);
const SCORE_PANELS = smallMultiplesLayout(SCORE_PLOT, STRATEGIES.length, PANEL_GAP);
const DELAY_TICKS = [0, 50, 100, 150, 200, MAX_DELAY_MS];

const ACTION_PANEL_H = 56;
const ACTION_PLOT: PlotRect = {
  left: LEFT,
  right: RIGHT,
  top: PLOT_TOP,
  bottom: PLOT_TOP + 2 * ACTION_PANEL_H + PANEL_GAP,
};
const ACTION_HEIGHT = Math.ceil(ACTION_PLOT.bottom + AXIS_BAND);
const ACTION_PANELS = smallMultiplesLayout(ACTION_PLOT, STRATEGIES.length, PANEL_GAP);
const TICK_MARKS = [0, 8, 16, TRACE_TICKS - 1];

const delayX = (d: number) =>
  f(LEFT + ((d - MIN_DELAY_MS) / (MAX_DELAY_MS - MIN_DELAY_MS)) * (RIGHT - LEFT));
const scoreY = (panel: PlotRect, p: number) =>
  f(panel.bottom - p * (panel.bottom - panel.top - SCORE_HEADROOM));
const tickX = (tick: number) => f(LEFT + (tick / (TRACE_TICKS - 1)) * (RIGHT - LEFT));
/** The action axis spans [-1, 1] of action space with a small margin. */
const actionY = (panel: PlotRect, a: number) =>
  f(panel.top + ((1.1 - a) / 2.2) * (panel.bottom - panel.top));

/** A value label beside a panel; the panels share no y axis line. */
function SideTick({ y, children }: { y: number; children: string }) {
  return (
    <text
      data-scene-tick=""
      x={LEFT - CHART_STROKE.tickLength * 1.5}
      y={y}
      dominantBaseline="middle"
      textAnchor="end"
      fontSize={CHART_TYPE.tickPx}
      fill={CHART_STRUCTURE.labelSecondary}
    >
      {children}
    </text>
  );
}

/**
 * One strategy's toy score against delay. The dot at the current delay
 * belongs to the series, so the score and the executed action (both plain
 * lines) stay distinct without colour.
 */
function ScorePanel({
  panel,
  strategy,
  delayMs,
  hatchId,
}: {
  panel: PlotRect;
  strategy: Strategy;
  delayMs: number;
  hatchId: string;
}) {
  const score = strategy === 'te' ? teThroughput : rtcThroughput;
  const points: ChartPoint[] = [];
  for (let d = MIN_DELAY_MS; d <= MAX_DELAY_MS; d += 4) {
    points.push([delayX(d), scoreY(panel, score(d))]);
  }
  const from = delayX(FAILURE_WINDOW.from);
  const to = delayX(FAILURE_WINDOW.to);
  return (
    <>
      {strategy === 'te' ? (
        <g data-series="lc-window">
          <ConstraintHatch
            id={hatchId}
            x={from}
            y={f(panel.top + PANEL_CLEAR)}
            width={f(to - from)}
            height={f(panel.bottom - panel.top - PANEL_CLEAR)}
          />
          <DirectLabel x={f((from + to) / 2)} y={TOP_LABEL_Y} role="constraint" anchor="middle">
            documented TE failure
          </DirectLabel>
        </g>
      ) : null}
      <SideTick y={scoreY(panel, 1)}>100%</SideTick>
      <SideTick y={scoreY(panel, 0)}>0%</SideTick>
      <g data-series="lc-score">
        <LineTrace role="value" points={points} />
        <PointMarker x={delayX(delayMs)} y={scoreY(panel, score(delayMs))} role="value" />
      </g>
    </>
  );
}

/** One strategy's executed action across the hand-off, between the two modes. */
function ActionPanel({
  panel,
  strategy,
  delayMs,
  offMode,
  hatchId,
}: {
  panel: PlotRect;
  strategy: Strategy;
  delayMs: number;
  offMode: boolean;
  hatchId: string;
}) {
  const trace = strategy === 'te' ? teHandoffTrace(delayMs) : rtcHandoffTrace(delayMs);
  const y = (a: number) => actionY(panel, a);
  const end = trace[trace.length - 1];
  const mode = (a: number): ChartPoint[] => [
    [LEFT, y(a)],
    [RIGHT, y(a)],
  ];
  return (
    <>
      <g data-series="lc-invalid">
        <ConstraintHatch
          id={hatchId}
          x={LEFT}
          y={y(VALID_ACTION_FLOOR)}
          width={RIGHT - LEFT}
          height={f(y(-VALID_ACTION_FLOOR) - y(VALID_ACTION_FLOOR))}
        />
      </g>
      <g data-series="lc-modes">
        <LineTrace role="reference" points={mode(MODE_VALUE)} />
        <LineTrace role="reference" points={mode(-MODE_VALUE)} />
      </g>
      <SideTick y={y(MODE_VALUE)}>left</SideTick>
      <SideTick y={y(-MODE_VALUE)}>right</SideTick>
      <g data-series="lc-action">
        <LineTrace role="action" points={trace.map((p) => [tickX(p.tick), y(p.action)] as const)} />
      </g>
      {strategy === 'te' && offMode ? (
        <g data-testid="te-offmode-marker">
          <PointMarker x={tickX(end.tick)} y={y(end.action)} role="constraint" shape="cross" />
        </g>
      ) : null}
    </>
  );
}

/**
 * The hand-off instant, the same tick in both panels. The guide breaks at
 * each panel label row so it never runs through a label.
 */
function HandoffGuide() {
  const x = tickX(HANDOFF_TICK);
  const spans: Array<readonly [number, number]> = [
    [f(TOP_LABEL_Y - LABEL_ASCENT), f(TOP_LABEL_Y + LABEL_DESCENT)],
    ...ACTION_PANELS.map((panel) => [f(panel.top + PANEL_CLEAR), panel.bottom] as const),
  ];
  return (
    <g data-scene-structure="handoff">
      {spans.map(([y1, y2]) => (
        <line
          key={y1}
          x1={x}
          x2={x}
          y1={y1}
          y2={y2}
          stroke={CHART_STRUCTURE.axes}
          strokeWidth={CHART_STROKE.structure}
          opacity={CHART_STRUCTURE.axesOpacity}
          strokeDasharray="3 3"
        />
      ))}
      <DirectLabel x={x + 4} y={TOP_LABEL_Y}>
        new chunk arrives
      </DirectLabel>
    </g>
  );
}

export function LatencyComparison({
  defaultDelayMs = MIN_DELAY_MS,
  className,
}: LatencyComparisonProps) {
  // useId-derived ids: a second mount on the same page must not duplicate
  // the input id (and cross-bind its label) or the hatch pattern ids.
  const uid = useId();
  const delayId = `${uid}-lc-delay`;
  const hatchBase = `lc-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [delayMs, setDelayMs] = useState(defaultDelayMs);

  const te = teThroughput(delayMs);
  const rtc = rtcThroughput(delayMs);
  const status = teStatus(delayMs);
  const offMode = !isValidModeAction(teActionAtHandoff(delayMs));

  // Sampled from teThroughput/rtcThroughput, the two functions the
  // curves are drawn from.
  const throughputRows = useMemo(
    () =>
      [...new Set([0, 60, 100, 140, 200, MAX_DELAY_MS, delayMs])]
        .sort((a, b) => a - b)
        .map((d) => ({
          label: `${d}`,
          values: [
            `${Math.round(teThroughput(d) * 100)}%`,
            `${Math.round(rtcThroughput(d) * 100)}%`,
            teStatus(d),
            d === delayMs ? 'playhead' : 'off',
          ],
        })),
    [delayMs],
  );

  // Sampled from the same two trace functions, so a row and a plotted
  // vertex are the same number.
  const { traceRows, teEndAction } = useMemo(() => {
    const tePoints = teHandoffTrace(delayMs);
    const rtcPoints = rtcHandoffTrace(delayMs);
    return {
      teEndAction: tePoints.at(-1)?.action ?? 0,
      traceRows: [0, 4, HANDOFF_TICK, 12, 18, TRACE_TICKS - 1].map((tick) => {
        const teAction = tePoints.find((p) => p.tick === tick)?.action ?? 0;
        const rtcAction = rtcPoints.find((p) => p.tick === tick)?.action ?? 0;
        return {
          label: `${tick}`,
          values: [
            teAction.toFixed(2),
            rtcAction.toFixed(2),
            isValidModeAction(teAction) ? 'on a mode' : 'off-mode',
          ],
        };
      }),
    };
  }, [delayMs]);

  // Naming the TE status keeps descriptions at delays in different regimes
  // distinct after digit normalisation, which the site-wide uniqueness
  // sweep compares.
  const throughputDescription =
    `Deterministic toy, not measured throughput: at ${formatMs(delayMs)} of added delay, ` +
    `the normalized toy scores are ${Math.round(te * 100)}% for temporal ensembling, ` +
    `marked ${status}, and ${Math.round(rtc * 100)}% for RTC. ` +
    `The shaded 100 to 200 ms failure window marks ` +
    `the experiment's two failed TE settings, not a universal latency threshold. ` +
    `The curve between settings and its continuation beyond +200 ms are illustrative assumptions.`;

  const traceDescription = `Across the ${TRACE_TICKS}-tick hand-off at ${formatMs(
    delayMs,
  )} of delay the real-time chunking action stays flat on the committed mode at ${MODE_VALUE.toFixed(
    2,
  )} while the ensembled action ${
    offMode
      ? `leaves both valid modes and ends at ${teEndAction.toFixed(2)}`
      : `holds within tolerance and ends at ${teEndAction.toFixed(2)}`
  }; the shaded band between the two dashed mode lines is the invalid middle no demonstration ever commanded, and those lines are the modelled modes rather than measured actions.`;

  function reset() {
    setDelayMs(defaultDelayMs);
  }

  const playX = delayX(delayMs);

  return (
    <InstrumentFigure
      figureId="latency-comparison"
      className={className}
      heading="Ensembling versus RTC under added delay"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={delayId} value={`d = ${formatMs(delayMs)}`}>
              Injected inference delay
            </ControlLabel>
            <input
              id={delayId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_DELAY_MS}
              max={MAX_DELAY_MS}
              step={5}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              aria-label={`Injected inference delay, currently ${formatMs(delayMs)}`}
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
                <LegendItem series="lc-score" swatch={<LegendSwatch role="value" mark="line" />}>
                  toy throughput score
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="line" />}>current delay</LegendItem>
                <LegendItem series="lc-action" swatch={<LegendSwatch role="action" mark="line" />}>
                  executed action
                </LegendItem>
                <LegendItem series="lc-modes" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  valid modes
                </LegendItem>
                <LegendItem series="lc-invalid" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  no valid mode
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="cross" />}>
                  averaged action off both modes
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                d = {formatMs(delayMs)}: temporal ensembling{' '}
                <span data-testid="te-throughput-readout">{Math.round(te * 100)}%</span>{' '}
                <span data-testid="te-status-readout">{status}</span>, real-time chunking{' '}
                <span data-testid="rtc-throughput-readout">{Math.round(rtc * 100)}%</span> holding
              </InstrumentReadout>
              <ChartDescription
                id={`${delayId}-throughput-description`}
                form="table"
                summary="Sampled toy throughput scores by added delay"
                rowHeader="delay (ms)"
                columns={[
                  { header: 'ensembling', numeric: true },
                  { header: 'chunking', numeric: true },
                  { header: 'ensembling status', numeric: false },
                  { header: 'playhead', numeric: false },
                ]}
                rows={throughputRows}
                description={throughputDescription}
              />
              <ChartDescription
                id={`${delayId}-trace-description`}
                form="table"
                summary="Sampled executed action across the hand-off"
                rowHeader="tick"
                columns={[
                  { header: 'ensembling', numeric: true },
                  { header: 'chunking', numeric: true },
                  { header: 'ensembling validity', numeric: false },
                ]}
                rows={traceRows}
                description={traceDescription}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${SCORE_HEIGHT}`}
            aria-label={`Toy normalized throughput scores against added inference delay, not measured task throughput. Temporal ensembling falls to zero while RTC is fixed at 100 percent by assumption. Current delay ${formatMs(delayMs)}.`}
            aria-describedby={`${delayId}-throughput-description`}
          >
            {/* Under the panels, so each series dot sits on top of it; one
                segment per panel keeps it out of the label rows. */}
            <g data-selection="">
              {SCORE_PANELS.map((panel) => (
                <LineTrace
                  key={panel.top}
                  role="highlight"
                  points={[
                    [playX, f(panel.top + PANEL_CLEAR)],
                    [playX, f(panel.bottom)],
                  ]}
                />
              ))}
            </g>
            <SmallMultiples
              plot={SCORE_PLOT}
              labels={PANEL_LABELS}
              x={delayX}
              xTicks={DELAY_TICKS}
              xLabel="injected delay (ms)"
              renderPanel={(panel, i) => (
                <ScorePanel
                  panel={panel}
                  strategy={STRATEGIES[i]}
                  delayMs={delayMs}
                  hatchId={`${hatchBase}-window`}
                />
              )}
            />
          </PlotStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${ACTION_HEIGHT}`}
            aria-label={`Trace of the executed action across a chunk hand-off at ${formatMs(delayMs)} delay. The temporal ensembling trace ${offMode ? 'leaves both valid modes' : 'stays on the committed mode'}; the real-time chunking trace stays flat on the committed mode.`}
            aria-describedby={`${delayId}-trace-description`}
            className="mt-3"
          >
            <SmallMultiples
              plot={ACTION_PLOT}
              labels={PANEL_LABELS}
              x={tickX}
              xTicks={TICK_MARKS}
              xLabel="controller tick"
              renderPanel={(panel, i) => (
                <ActionPanel
                  panel={panel}
                  strategy={STRATEGIES[i]}
                  delayMs={delayMs}
                  offMode={offMode}
                  hatchId={`${hatchBase}-invalid-${i}`}
                />
              )}
            />
            <HandoffGuide />
          </PlotStage>
        </FigureStage>
      }
      caption="Added delay collapses the toy ensembling score and pulls its averaged action between the two modes; real-time chunking holds."
      source={
        <span>
          Deterministic toy, not measured throughput. This qualitative model illustrates a possible cross-mode
          hand-off; its percentages, transition curve, and flat RTC line are assumptions. The π0.5 experiment
          reported average task throughput across six tasks at +0, +100, and +200 ms of added delay. The slider
          extends beyond those tested settings.
        </span>
      }
    />
  );
}
