'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import { GripperGlyph } from '@/components/motion/gripper-glyph';
import {
  CHART_STROKE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  ConstraintHatch,
  DirectLabel,
  LineTrace,
  PointMarker,
  StageAnnotation,
  roleColour,
  type ChartPoint,
  type PlotRect,
} from '@/components/motion/chart';
import {
  HANDOFF_TICK,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  MODE_TOLERANCE,
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
  type ExecutionStatus,
  type TracePoint,
} from '@/lib/latency-chunking';

/**
 * LatencyComparison: why averaging overlapping plans breaks when new plans
 * arrive late, and Real-Time Chunking does not.
 *
 * The stage is a top-down drawing: the arm can pass an obstacle on the left
 * or on the right, and both are good plans. Temporal ensembling averages
 * the plan in flight with a late one; past a delay the average of "go left"
 * and "go right" points straight at the obstacle. The main view offers the
 * three delays the π0.5 experiment tested; the free delay slider, the toy
 * score against delay and Reset sit in "Adjust more"; the model, the
 * experiment it follows and both sampled tables sit in "How this was made".
 * The curves and the drawing are a qualitative model of the published
 * results (arXiv:2506.07339), labeled as such.
 */
type LatencyComparisonProps = {
  /** Initial injected delay in ms. Default 200, the larger tested setting. */
  defaultDelayMs?: number;
  className?: string;
};

type DelayPreset = 'none' | 'tenth' | 'fifth';
const DELAY_PRESETS: ReadonlyArray<{ id: DelayPreset; ms: number; label: string }> = [
  { id: 'none', ms: 0, label: 'None' },
  { id: 'tenth', ms: 100, label: '+0.1 second' },
  { id: 'fifth', ms: 200, label: '+0.2 second' },
];

const STATUS_WORDS: Record<ExecutionStatus, string> = {
  nominal: 'works',
  degraded: 'wobbles',
  failed: 'fails',
};

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

/** "no added delay", "+0.2 second of delay": the delay in plain words. */
function delayWords(ms: number): string {
  if (ms <= 0) return 'no added delay';
  return `+${Number((ms / 1000).toFixed(3))} second of delay`;
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const WIDTH = CHART_VIEW_WIDTH;

/* The scene: the arm starts at the bottom and moves up past an obstacle. */
const SCENE_H = 284;
const CX = WIDTH / 2;
const Y_START = 262;
const Y_END = 12;
/** How far sideways a full "go left" or "go right" plan swings, per unit of action. */
const SWING = 120;
const OBSTACLE_TOP = 126;
const OBSTACLE_BOTTOM = 166;
/**
 * The obstacle's half-width is the swing of the weakest move that still
 * counts as on a plan, so the drawn collision and the model's off-plan
 * verdict agree.
 */
const OBSTACLE_HALF = Math.floor(SWING * VALID_ACTION_FLOOR);
/** Share of the route over which the sampled hand-off ticks are drawn. */
const TRACE_SPAN = 0.5;
const ROUTE_LABEL_Y = 110;
const NOTE_Y = 22;

const progressY = (t: number) => Y_START - t * (Y_START - Y_END);
const OBSTACLE_T = (Y_START - OBSTACLE_BOTTOM) / (Y_START - Y_END);

/** How far the route has swung out, from 0 at the start to 1 before the obstacle. */
function spread(t: number): number {
  const u = Math.min(1, Math.max(0, (t - 0.04) / 0.3));
  return u * u * (3 - 2 * u);
}

/** Screen x of a move with lateral action `a` at progress t; left is +a. */
const sceneX = (t: number, a: number) => CX - a * SWING * spread(t);

/** The executed action at progress t, read off the sampled hand-off trace. */
function actionAt(trace: readonly TracePoint[], t: number): number {
  const tick = Math.min(TRACE_TICKS - 1, (t / TRACE_SPAN) * (TRACE_TICKS - 1));
  const i = Math.floor(tick);
  const next = trace[Math.min(TRACE_TICKS - 1, i + 1)].action;
  return trace[i].action + (next - trace[i].action) * (tick - i);
}

/* The toy score chart in "Adjust more". */
const SCORE_H = 150;
const SCORE_PLOT: PlotRect = { left: 44, right: WIDTH - 14, top: 24, bottom: 106 };
const SCORE_HEADROOM = 10;
const DELAY_TICKS = [0, 50, 100, 150, 200, MAX_DELAY_MS];
const delayX = (d: number) =>
  f(SCORE_PLOT.left + ((d - MIN_DELAY_MS) / (MAX_DELAY_MS - MIN_DELAY_MS)) * (SCORE_PLOT.right - SCORE_PLOT.left));
const scoreY = (p: number) =>
  f(SCORE_PLOT.bottom - p * (SCORE_PLOT.bottom - SCORE_PLOT.top - SCORE_HEADROOM));

/** The two good plans, drawn as dashed routes around the obstacle. */
function PlanRoutes() {
  const route = (a: number) => {
    const parts: string[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      parts.push(`${i === 0 ? 'M' : 'L'}${f(sceneX(t, a))},${f(progressY(t))}`);
    }
    return parts.join(' ');
  };
  const reference = roleColour('reference');
  return (
    <g data-series="lc-modes">
      <path d={route(MODE_VALUE)} fill="none" stroke={reference} strokeWidth={CHART_STROKE.reference} strokeDasharray={CHART_STROKE.dash} />
      <path d={route(-MODE_VALUE)} fill="none" stroke={reference} strokeWidth={CHART_STROKE.reference} strokeDasharray={CHART_STROKE.dash} />
      <DirectLabel x={f(sceneX(1, MODE_VALUE) - 6)} y={ROUTE_LABEL_Y} role="reference" anchor="end">
        go left
      </DirectLabel>
      <DirectLabel x={f(sceneX(1, -MODE_VALUE) + 6)} y={ROUTE_LABEL_Y} role="reference">
        go right
      </DirectLabel>
    </g>
  );
}

/** The thing both plans steer around: a solid part, outlined and hatched. */
function Obstacle() {
  const hatchId = `${useId().replace(/:/g, '')}-lc-obstacle`;
  return (
    <g data-series="lc-obstacle">
      <ConstraintHatch
        id={hatchId}
        x={CX - OBSTACLE_HALF}
        y={OBSTACLE_TOP}
        width={OBSTACLE_HALF * 2}
        height={OBSTACLE_BOTTOM - OBSTACLE_TOP}
      />
      <DirectLabel x={CX} y={f((OBSTACLE_TOP + OBSTACLE_BOTTOM) / 2 + 5)} anchor="middle">
        in the way
      </DirectLabel>
    </g>
  );
}

/** The toy score of both strategies against added delay, for "Adjust more". */
function ScoreChart({ delayMs }: { delayMs: number }) {
  const line = (score: (d: number) => number) => {
    const points: ChartPoint[] = [];
    for (let d = MIN_DELAY_MS; d <= MAX_DELAY_MS; d += 4) points.push([delayX(d), scoreY(score(d))]);
    return points;
  };
  const playX = delayX(delayMs);
  return (
    <>
      <ChartAxes
        plot={SCORE_PLOT}
        x={delayX}
        y={scoreY}
        xTicks={DELAY_TICKS}
        yTicks={[0, 1]}
        formatY={(v) => `${Math.round(v * 100)}%`}
        xLabel="added delay (ms)"
        yLabel="toy score"
        grid={false}
      />
      <g data-selection="">
        <LineTrace
          role="highlight"
          points={[
            [playX, SCORE_PLOT.top],
            [playX, SCORE_PLOT.bottom],
          ]}
        />
      </g>
      <g data-series="lc-score-rtc">
        <LineTrace role="value" points={line(rtcThroughput)} />
        <PointMarker x={playX} y={scoreY(rtcThroughput(delayMs))} role="value" />
        <DirectLabel x={SCORE_PLOT.right} y={f(SCORE_PLOT.top - CHART_STROKE.tickLength)} role="value" anchor="end">
          real-time chunking
        </DirectLabel>
      </g>
      <g data-series="lc-score">
        <LineTrace role="state" points={line(teThroughput)} />
        <PointMarker x={playX} y={scoreY(teThroughput(delayMs))} role="state" />
        <DirectLabel x={delayX(124)} y={f(SCORE_PLOT.bottom - 8)} role="state">
          averaging plans
        </DirectLabel>
      </g>
    </>
  );
}

export function LatencyComparison({
  defaultDelayMs = 200,
  className,
}: LatencyComparisonProps) {
  // useId-derived ids: a second mount on the same page must not duplicate
  // the input id and cross-bind its label.
  const uid = useId();
  const delayId = `${uid}-lc-delay`;
  const [delayMs, setDelayMs] = useState(defaultDelayMs);

  const te = teThroughput(delayMs);
  const rtc = rtcThroughput(delayMs);
  const status = teStatus(delayMs);
  const offMode = !isValidModeAction(teActionAtHandoff(delayMs));
  const preset = DELAY_PRESETS.find((p) => p.ms === delayMs)?.id ?? null;

  // The averaged move drawn from the same hand-off trace the table samples;
  // an off-plan move stops where it meets the obstacle.
  const scene = useMemo(() => {
    const trace = teHandoffTrace(delayMs);
    const points: ChartPoint[] = [];
    const steps = 60;
    const last = offMode ? OBSTACLE_T : 1;
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * last;
      points.push([f(sceneX(t, actionAt(trace, t))), f(progressY(t))]);
    }
    const end = points[points.length - 1];
    const before = points[points.length - 3];
    const heading = (Math.atan2(end[1] - before[1], end[0] - before[0]) * 180) / Math.PI;
    return { points, end, heading: f(heading) };
  }, [delayMs, offMode]);

  // Sampled from teThroughput/rtcThroughput, the two functions the
  // score curves are drawn from.
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

  // Sampled from the same two trace functions, so a row and a drawn
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
    `The experiment's temporal-ensembling variants triggered protective stops at its +100 and +200 ms settings; ` +
    `where this toy collapses between them is an assumption, not a universal latency threshold. ` +
    `The curve between settings and its continuation beyond +200 ms are illustrative assumptions.`;

  const traceDescription = `Across the ${TRACE_TICKS}-tick hand-off at ${formatMs(
    delayMs,
  )} of delay the real-time chunking action stays on the committed go-left mode at ${MODE_VALUE.toFixed(
    2,
  )} while the ensembled action ${
    offMode
      ? `leaves both valid modes, ends at ${teEndAction.toFixed(2)} and runs into the obstacle`
      : `holds within tolerance, ends at ${teEndAction.toFixed(2)} and passes the obstacle`
  }; the obstacle between the two dashed plan routes is drawn for illustration, and those routes are the modelled modes rather than measured actions.`;

  const note = offMode
    ? ['Average of go left', 'and go right:', 'straight ahead']
    : delayMs > 0
      ? ['A late plan tugs', 'the arm toward', 'the middle']
      : ['No delay: the', 'plans agree, so', 'the arm goes left'];

  function reset() {
    setDelayMs(defaultDelayMs);
  }

  return (
    <InstrumentFigure
      figureId="latency-comparison"
      className={className}
      kicker="Ensembling vs real-time chunking"
      heading="Averaging two good plans can produce one bad move"
      controls={
        <PresetGroup<DelayPreset>
          label="Thinking delay"
          presets={DELAY_PRESETS.map(({ id, label }) => ({ id, label }))}
          value={preset}
          onChange={(id) => setDelayMs(DELAY_PRESETS.find((p) => p.id === id)?.ms ?? defaultDelayMs)}
          testId="delay-preset"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={delayId} value={delayWords(delayMs)}>
              Thinking delay, any value
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
            <SliderEnds low="no delay" high={`+${MAX_DELAY_MS / 1000} second`} />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      caption="When a new plan arrives late, averaging it with the old one can pick a path neither plan chose; real-time chunking keeps them consistent."
      method={
        <>
          <p>
            Deterministic toy, not measured throughput. This qualitative model illustrates a possible
            cross-mode hand-off: the arm can pass an obstacle on the left or on the right, and the
            demonstrations hold both. Temporal ensembling averages the plan in flight with newer ones.
            With an added delay d, the weight it keeps on the committed go-left plan is
            w = 0.5 + 0.5 / (1 + (d / 125 ms)³), and the executed move is (2w − 1) × {MODE_VALUE.toFixed(1)},
            where +{MODE_VALUE.toFixed(1)} is go left and −{MODE_VALUE.toFixed(1)} go right. A move within{' '}
            {MODE_TOLERANCE} of either counts as on a plan; anything weaker than{' '}
            {VALID_ACTION_FLOOR.toFixed(2)} heads into the obstacle, and the toy score falls from 100%
            to 0% as it does. Real-time chunking freezes the moves already committed, so it stays on
            the go-left plan at every delay and its score is held at 100% by assumption.
          </p>
          <p>
            The presets are the three settings the π0.5 real-time chunking experiment tested: +0, +100
            and +200 ms of injected delay on top of 76 ms model latency for the baselines (97 ms for
            RTC) and 10 to 20 ms over the network. Its temporal-ensembling variants triggered
            protective stops at +100 and +200 ms, and RTC showed no drop in average task throughput
            across six tasks through +200 ms (Black, Galliker and Levine, 2025). The toy&apos;s
            percentages, its curve between those settings, the flat RTC line and the slider&apos;s
            reach past +200 ms are assumptions; the delay where it collapses is not a universal latency
            threshold.
          </p>
          <p>
            The drawing replays a {TRACE_TICKS}-tick hand-off sampled once per controller tick; the
            late plan arrives at tick {HANDOFF_TICK}.
          </p>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${SCORE_H}`}
            aria-label={`Toy normalized throughput scores against added inference delay, not measured task throughput. Temporal ensembling falls to zero while RTC is fixed at 100 percent by assumption. Current delay ${formatMs(delayMs)}.`}
            aria-describedby={`${delayId}-throughput-description`}
          >
            <ScoreChart delayMs={delayMs} />
          </PlotStage>
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
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Toy score with {delayWords(delayMs)}: averaging the plans{' '}
                <span data-testid="te-throughput-readout">{Math.round(te * 100)}%</span> (
                <span data-testid="te-status-readout">{STATUS_WORDS[status]}</span>), real-time chunking{' '}
                <span data-testid="rtc-throughput-readout">{Math.round(rtc * 100)}%</span>.
              </StageReadout>
              <StageStatus>Illustrative: a toy scene, not measured robot data.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${SCENE_H}`}
            aria-label={`Top-down drawing of the arm's move with ${delayWords(delayMs)}: two good plans pass an obstacle on the left or on the right. Averaging them ${offMode ? 'sends the arm straight into the obstacle' : 'keeps the arm on the go-left route'}; real-time chunking keeps to the go-left plan.`}
            aria-describedby={`${delayId}-trace-description`}
          >
            <PlanRoutes />
            <Obstacle />
            <g data-series="lc-action">
              <LineTrace role="state" points={scene.points} />
              <GripperGlyph
                x={f(scene.end[0] - (offMode ? 4 : 0) * Math.cos((scene.heading * Math.PI) / 180))}
                y={f(scene.end[1] - (offMode ? 4 : 0) * Math.sin((scene.heading * Math.PI) / 180))}
                angle={scene.heading}
                size={14}
                testId="lc-gripper"
              />
            </g>
            {offMode ? (
              <g data-testid="te-offmode-marker">
                <PointMarker x={scene.end[0]} y={scene.end[1]} role="constraint" shape="cross" />
              </g>
            ) : null}
            <StageAnnotation x={CX} y={NOTE_Y} anchor="middle" lines={note} />
          </PlotStage>
        </FigureStage>
      }
      source="Deterministic toy after the real-time chunking experiment of Black, Galliker and Levine (2025, arXiv 2506.07339)."
    />
  );
}
