'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { PartView } from '@/components/iso/part-view';
import {
  BACK_PARTS,
  FRONT_PARTS,
  GANTRY_PARTS,
  HEIGHT,
  INK_START,
  LOW_PARTS,
  POST_PARTS,
  TRACER_PARTS,
  WIDTH as PLOTTER_WIDTH,
  crossPath,
  gantryAt,
  inkPath,
  knobPointer,
  penAt,
  poseAt,
  postFirst,
  runOf,
  type Part,
} from '@/components/iso/figures/averaging-plotter';
import {
  CHART_STROKE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  LineTrace,
  PointMarker,
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
  ensembleCommitWeight,
  isValidModeAction,
  rtcHandoffTrace,
  rtcThroughput,
  teActionAtHandoff,
  teHandoffTrace,
  teStatus,
  teThroughput,
  type ExecutionStatus,
} from '@/lib/latency-chunking';

/**
 * LatencyComparison: why averaging overlapping plans breaks when new plans
 * arrive late, and Real-Time Chunking does not.
 *
 * The stage is an averaging plotter (components/iso/figures/averaging-
 * plotter.ts): two grooves either side of a post are the two good plans,
 * go left and go right. A gantry runs along them, its followers ride one
 * groove each, and the pen sits on the beam between them at the weight
 * temporal ensembling gives the plan under way. When the late plan
 * arrives the pen slides to that weight; past about 96 ms it sits inside
 * the post's width and the stylus runs into the post. The still pose is
 * the end of the run; "Run the plotter" plays it from the start. The main
 * view offers the three delays the π0.5 experiment tested; the free delay
 * slider and Reset sit in "Adjust more"; the model, the experiment it
 * follows, the toy score against delay and both sampled tables sit in
 * "How this was made". The drawing is a qualitative model of the
 * published results (arXiv:2506.07339), labeled as such.
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

/** The plotter runs at this many control ticks a second, so the eye can follow the hand-off. */
export const TICKS_PER_SECOND = 7;
/** How long the finished run holds before the figure settles back to rest. */
const HOLD_S = 0.5;

/** A geometry module's part list, with its slots filled by the live component. */
function partsOf(parts: readonly Part[], slot: (name: string) => ReactNode): ReactNode[] {
  return parts.map((part, index) => (part.kind === 'slot' ? slot(part.name) : <PartView key={index} part={part} />));
}

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

/* The toy score chart in "How this was made". */
const SCORE_H = 150;
const SCORE_PLOT: PlotRect = { left: 44, right: WIDTH - 14, top: 24, bottom: 106 };
const SCORE_HEADROOM = 10;
const DELAY_TICKS = [0, 50, 100, 150, 200, MAX_DELAY_MS];
const delayX = (d: number) =>
  f(SCORE_PLOT.left + ((d - MIN_DELAY_MS) / (MAX_DELAY_MS - MIN_DELAY_MS)) * (SCORE_PLOT.right - SCORE_PLOT.left));
const scoreY = (p: number) =>
  f(SCORE_PLOT.bottom - p * (SCORE_PLOT.bottom - SCORE_PLOT.top - SCORE_HEADROOM));

/** The toy score of both strategies against added delay, for "How this was made". */
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
        <DirectLabel x={SCORE_PLOT.right} y={f(SCORE_PLOT.top - CHART_STROKE.tickLength)} role="value" anchor="end" seriesFor="lc-score-rtc">
          real-time chunking
        </DirectLabel>
      </g>
      <g data-series="lc-score">
        <LineTrace role="state" points={line(teThroughput)} />
        <PointMarker x={playX} y={scoreY(teThroughput(delayMs))} role="state" />
        <DirectLabel x={delayX(124)} y={f(SCORE_PLOT.bottom - 8)} role="state" seriesFor="lc-score">
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

  // The plotter's run comes from the same hand-off trace the table samples:
  // the pen's place on the beam is the executed action, and an off-plan
  // move stops where the stylus meets the post.
  const run = useMemo(() => runOf(delayMs), [delayMs]);
  const weight = ensembleCommitWeight(delayMs);
  const [running, setRunning] = useState(false);
  const restTick = run.endTick;
  const rest = poseAt(run, restTick);
  // While the plotter runs React renders the start; the loop writes every frame after it.
  const shown = running ? poseAt(run, 0) : rest;
  const shownTick = running ? 0 : restTick;

  const lowRef = useRef<SVGGElement>(null);
  const highRef = useRef<SVGGElement>(null);
  const penRef = useRef<SVGGElement>(null);
  const postBeforeRef = useRef<SVGGElement>(null);
  const postAfterRef = useRef<SVGGElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const crossRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let tick = 0;
    const draw = (t: number) => {
      const pose = poseAt(run, t);
      const gantry = gantryAt(pose.s);
      lowRef.current?.setAttribute('transform', gantry);
      highRef.current?.setAttribute('transform', gantry);
      penRef.current?.setAttribute('transform', penAt(pose.x));
      const first = postFirst(pose.s);
      postBeforeRef.current?.setAttribute('display', first ? 'inline' : 'none');
      postAfterRef.current?.setAttribute('display', first ? 'none' : 'inline');
      inkRef.current?.setAttribute('d', inkPath(run, t));
      crossRef.current?.setAttribute('display', run.hits && t >= run.endTick ? 'inline' : 'none');
      if (phaseRef.current) {
        const step = Math.min(Math.floor(t), Math.floor(run.endTick));
        phaseRef.current.textContent =
          t >= run.endTick
            ? run.hits
              ? 'stopped at the post · '
              : 'past the post · '
            : step < HANDOFF_TICK
              ? `tick ${step} · plan under way · `
              : `tick ${step} · late plan averaged in · `;
      }
    };
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      tick += dt * TICKS_PER_SECOND;
      draw(Math.min(tick, run.endTick));
      if (tick >= run.endTick + HOLD_S * TICKS_PER_SECOND) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    draw(0);
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, run]);

  // At rest the readout carries no phase; a run that stops early leaves none behind.
  useEffect(() => {
    if (!running && phaseRef.current) phaseRef.current.textContent = '';
  }, [running]);

  // The plotter runs from the reader's control; under reduced motion it stays at the end of the run.
  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (still()) return;
    setRunning(true);
  };

  function chooseDelay(ms: number) {
    setRunning(false);
    setDelayMs(ms);
  }

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
      ? `leaves both valid modes, ends at ${teEndAction.toFixed(2)} and runs into the post`
      : `holds within tolerance, ends at ${teEndAction.toFixed(2)} and passes the post`
  }; the post between the two plan grooves is drawn for illustration, and the grooves are the modelled modes rather than measured actions.`;

  const plotterLabel = `Averaging plotter with ${delayWords(delayMs)}: two grooves either side of a post are the two good plans, go left and go right. The pen rides a beam between them at the weight averaging keeps on the plan under way, ${weight.toFixed(2)}, so ${
    offMode ? 'its ink heads into the post and the gantry stops there' : 'its ink stays clear of the post'
  }; real-time chunking keeps to the go-left plan.`;

  const slotOf = (name: string): ReactNode => {
    if (name === 'ink') {
      return (
        <g key="ink" data-part="lc-ink">
          <path ref={inkRef} className="iso-line" data-tone="lit" style={{ strokeWidth: 1.1 }} d={inkPath(run, shownTick)} />
          <Dots points={[INK_START]} size={1.1} tone="hi" />
        </g>
      );
    }
    if (name === 'pointer') return <Line key="pointer" d={knobPointer(delayMs)} tone="hi" free="end" />;
    return null;
  };

  function reset() {
    chooseDelay(defaultDelayMs);
  }

  return (
    <InstrumentFigure
      figureId="latency-comparison"
      className={className}
      kicker="Ensembling vs real-time chunking"
      heading="Averaging two good plans can produce one bad move"
      controls={
        <>
          <PresetGroup<DelayPreset>
            label="Thinking delay"
            presets={DELAY_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={preset}
            onChange={(id) => chooseDelay(DELAY_PRESETS.find((p) => p.id === id)?.ms ?? defaultDelayMs)}
            testId="delay-preset"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={toggleRun}
            data-testid="lc-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the plotter' : 'Run the plotter'}
          </button>
        </>
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
              onChange={(e) => chooseDelay(Number(e.target.value))}
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
            The plotter is a schematic of that hand-off. Each groove is one plan, the pen&apos;s place on
            the beam is the executed move, and the post is as wide as the moves that count as off both
            plans. It replays a {TRACE_TICKS}-tick hand-off sampled once per controller tick; the late
            plan arrives at tick {HANDOFF_TICK}, where the trip dog sits on the ruler. Running, it moves
            {' '}{TICKS_PER_SECOND} ticks a second.
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
        <AnatomyStage
          viewWidth={PLOTTER_WIDTH}
          hint={running ? 'Running at seven control ticks a second' : 'Each groove is a good plan. Run the plotter.'}
          readout={
            <>
              <span ref={phaseRef} data-lc-phase="" />
              averaging <span data-testid="te-throughput-readout">{Math.round(te * 100)}%</span> (
              <span data-testid="te-status-readout">{STATUS_WORDS[status]}</span>) · real-time chunking{' '}
              <span data-testid="rtc-throughput-readout">{Math.round(rtc * 100)}%</span>
            </>
          }
          status="Illustrative: a toy scene, not measured robot data."
          data-testid="lc-stage-frame"
        >
          <IsoFigure width={PLOTTER_WIDTH} height={HEIGHT} label={plotterLabel} describedBy={`${delayId}-trace-description`}>
            <g key={running ? 'running' : 'rest'}>
              <g key="back">{partsOf(BACK_PARTS, slotOf)}</g>
              <g key="post-before" ref={postBeforeRef} display={postFirst(shown.s) ? 'inline' : 'none'}>
                {partsOf(POST_PARTS, slotOf)}
              </g>
              <g key="low" ref={lowRef} transform={gantryAt(shown.s)}>
                {partsOf(LOW_PARTS, slotOf)}
              </g>
              <g key="post-after" ref={postAfterRef} display={postFirst(shown.s) ? 'none' : 'inline'}>
                {partsOf(POST_PARTS, slotOf)}
              </g>
              {run.hits ? (
                <g key="cross" ref={crossRef} display={running ? 'none' : 'inline'} data-testid="te-offmode-marker">
                  <Line d={crossPath(run)} tone="red" />
                </g>
              ) : null}
              <g key="gantry" ref={highRef} transform={gantryAt(shown.s)} data-testid="lc-gantry">
                {partsOf(
                  GANTRY_PARTS.filter((part) => part.group === 'gantry'),
                  slotOf,
                )}
                <g ref={penRef} transform={penAt(shown.x)} data-testid="lc-pen" data-weight={weight.toFixed(2)}>
                  {partsOf(
                    GANTRY_PARTS.filter((part) => part.group === 'pen'),
                    slotOf,
                  )}
                  {partsOf(TRACER_PARTS, slotOf)}
                </g>
              </g>
              <g key="front">{partsOf(FRONT_PARTS, slotOf)}</g>
            </g>
          </IsoFigure>
        </AnatomyStage>
      }
      source="Deterministic toy after the real-time chunking experiment of Black, Galliker and Levine (2025, arXiv 2506.07339)."
    />
  );
}
