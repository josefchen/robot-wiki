'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { PartView } from '@/components/iso/part-view';
import {
  BASE_PARTS,
  GATE_PARTS,
  HEIGHT as TRACK_HEIGHT,
  LANES,
  LANE_PARTS,
  NEAR_PARTS,
  WIDTH as TRACK_WIDTH,
  X_START,
  bobPaths,
  dragPath,
  faceMarks,
  knobPointer,
  overPath,
  peakStep,
  rodPath,
  spokePath,
  stepAt,
  swingOf,
  trolleyAt,
  trolleyX,
  type Part,
} from '@/components/iso/figures/handoff-track';
import {
  JERK_LIMIT,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  TICK_MS,
  TRACE_TICKS,
  executedTrace,
  pauseTicks,
  peakDeltaV,
  type ExecutionMode,
} from '@/lib/execution-modes';

/**
 * ExecutionModes: what the arm does when a new plan arrives while it is
 * still moving, drawn as a three-lane test track (components/iso/figures/
 * handoff-track.ts). Three trolleys run the same plan side by side; at the
 * gate the new plan arrives late and each lane hands it over its own way:
 * pause (synchronous: stop, wait, restart), lurch (naive switch: jump to
 * the new speed at once) and blend (real-time chunking: keep the
 * in-flight moves, then ease over). A pendulum gauge on each trolley swings
 * with the speed step of each tick, and its drag pointer keeps the largest
 * step against the 0.30 limit marks. The still pose is the end of the run;
 * "Run the track" plays it ten times slower than the robot. The figure
 * opens on a 0.2 second thinking delay, where the lurch is plain; the
 * presets step down to 0.1 second and none, where all three lanes match.
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

/** The track runs this many control ticks a second: ten times slower than the robot's 20 ms ticks. */
export const TICKS_PER_SECOND = 5;
/** How long the finished run holds before the figure settles back to rest. */
const HOLD_S = 0.5;
/** The bob follows each tick's speed step this fast, in seconds on screen. */
const BOB_TAU = 0.035;

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

/** A geometry module's part list, with its slots filled by the live component. */
function partsOf(parts: readonly Part[], slot: (part: Extract<Part, { kind: 'slot' }>) => ReactNode): ReactNode[] {
  return parts.map((part, index) => (part.kind === 'slot' ? slot(part) : <PartView key={index} part={part} />));
}

/** "0.2 second", "no wait": the dead time in plain words. */
function waitWords(ms: number): string {
  return ms <= 0 ? 'no wait' : `${Number((ms / 1000).toFixed(2))} second`;
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
  )} discontinuity-proxy limit; these constructed traces use arbitrary velocity units, not physical jerk or measured robot data. The five-tick linear blend is not RTC inpainting, and each trolley's pendulum gauge keeps its largest step on a drag pointer.`;

  // The track's runs come from the same executedTrace calls the table samples.
  const traces = useMemo(
    () => Object.fromEntries(LANES.map((mode) => [mode, executedTrace(mode, delayMs)])) as Record<ExecutionMode, ReturnType<typeof executedTrace>>,
    [delayMs],
  );
  const [running, setRunning] = useState(false);
  const lastTick = TRACE_TICKS - 1;
  // While the track runs React renders the start; the loop writes every frame after it.
  const shownTick = running ? 0 : lastTick;
  const trolleyRefs = useRef<Partial<Record<ExecutionMode, SVGGElement | null>>>({});
  const spokeRefs = useRef<Partial<Record<ExecutionMode, SVGPathElement | null>>>({});
  const rodRefs = useRef<Partial<Record<ExecutionMode, SVGPathElement | null>>>({});
  const bobRefs = useRef<Partial<Record<ExecutionMode, SVGGElement | null>>>({});
  const dragRefs = useRef<Partial<Record<ExecutionMode, SVGPathElement | null>>>({});
  const overRefs = useRef<Partial<Record<ExecutionMode, SVGGElement | null>>>({});
  const phaseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let tick = 0;
    const swing: Record<string, number> = {};
    const drag: Record<string, number> = {};
    for (const mode of LANES) {
      swing[mode] = 0;
      drag[mode] = 0;
    }
    const draw = (t: number, dt: number) => {
      for (const mode of LANES) {
        const trace = traces[mode];
        const x = trolleyX(trace, t);
        trolleyRefs.current[mode]?.setAttribute('transform', trolleyAt(x));
        spokeRefs.current[mode]?.setAttribute('d', spokePath(mode, (x - X_START) / 6.8));
        const target = swingOf(stepAt(trace, t));
        swing[mode] = dt > 0 ? swing[mode] + (target - swing[mode]) * (1 - Math.exp(-dt / BOB_TAU)) : target;
        if (Math.abs(swing[mode]) > Math.abs(drag[mode])) drag[mode] = swing[mode];
        rodRefs.current[mode]?.setAttribute('d', rodPath(mode, swing[mode]));
        writeSolid(bobRefs.current[mode] ?? null, bobPaths(mode, swing[mode]));
        dragRefs.current[mode]?.setAttribute('d', dragPath(mode, drag[mode]));
        const over = overRefs.current[mode];
        if (over) {
          over.setAttribute('display', Math.abs(drag[mode]) > Math.abs(swingOf(JERK_LIMIT)) ? 'inline' : 'none');
          over.querySelector('path')?.setAttribute('d', overPath(mode, drag[mode]));
        }
      }
      if (phaseRef.current) {
        const step = Math.min(lastTick, Math.floor(t));
        phaseRef.current.textContent = t >= lastTick ? '' : `tick ${step} · ${step < 8 ? 'old plan' : 'new plan in'} · `;
      }
    };
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      tick += dt * TICKS_PER_SECOND;
      draw(Math.min(tick, lastTick), dt);
      if (tick >= lastTick + HOLD_S * TICKS_PER_SECOND) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    draw(0, 0);
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, traces, lastTick]);

  // At rest the readout carries no phase; a run that stops early leaves none behind.
  useEffect(() => {
    if (!running && phaseRef.current) phaseRef.current.textContent = '';
  }, [running]);

  // The track runs from the reader's control; under reduced motion it stays at the end of the run.
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

  function reset() {
    chooseDelay(DEFAULT_DELAY_MS);
  }

  const peaks = Object.fromEntries(LANES.map((mode) => [mode, peakStep(traces[mode])])) as Record<ExecutionMode, number>;
  const limitSwing = Math.abs(swingOf(JERK_LIMIT));
  const trackLabel = `Three-lane test track for a plan hand-off at ${delayMs} milliseconds of inference delay: back to front, a trolley that pauses, one that lurches and one that blends, each with a pendulum gauge that swings with every tick's speed step. Peak per-tick velocity steps: pause ${peakDeltaV(traces.synchronous).toFixed(2)}, lurch ${naivePeak.toFixed(2)}, blend ${rtcPeak.toFixed(2)}, read against the ${JERK_LIMIT.toFixed(2)} discontinuity-proxy limit, not physical jerk; the pausing trolley stands still for ${deadMs} milliseconds.`;

  const slotOf = (part: Extract<Part, { kind: 'slot' }>): ReactNode => {
    if (part.name === 'knob') return <Line key="knob" d={knobPointer(delayMs)} tone="hi" free="end" />;
    const mode = part.mode!;
    const trace = traces[mode];
    const x = trolleyX(trace, shownTick);
    if (part.name === 'wheels') {
      return (
        <path
          key="wheels"
          ref={(node) => {
            spokeRefs.current[mode] = node;
          }}
          className="iso-line"
          data-tone="lo"
          d={spokePath(mode, (x - X_START) / 6.8)}
        />
      );
    }
    const marks = faceMarks(mode);
    const swing = running ? 0 : swingOf(stepAt(trace, lastTick));
    const drag = running ? 0 : swingOf(peaks[mode]);
    const over = Math.abs(peaks[mode]) > JERK_LIMIT;
    return (
      <g key="gauge" data-part="pendulum-gauge">
        <Line d={marks.arc} tone="lo" />
        <Line d={marks.minor} tone="lo" />
        <Line d={marks.major} tone="mid" />
        <Line d={marks.limit} tone="hi" />
        <Dots points={marks.screws} size={0.45} />
        <path
          ref={(node) => {
            dragRefs.current[mode] = node;
          }}
          className="iso-line"
          data-tone="mid"
          data-drag=""
          d={dragPath(mode, drag)}
        />
        <Dots points={[marks.dragHub]} size={1.1} tone="mid" />
        {over ? (
          <g
            ref={(node) => {
              overRefs.current[mode] = node;
            }}
            display={running || Math.abs(drag) <= limitSwing ? 'none' : 'inline'}
            data-testid={`spike-${mode}`}
          >
            <Line d={overPath(mode, swingOf(peaks[mode]))} tone="red" />
          </g>
        ) : null}
        <Line d={marks.pin} tone="hi" />
        <path
          ref={(node) => {
            rodRefs.current[mode] = node;
          }}
          className="iso-line"
          data-tone="hi"
          d={rodPath(mode, swing)}
        />
        <LiveSolid
          ref={(node) => {
            bobRefs.current[mode] = node;
          }}
          paths={bobPaths(mode, swing)}
          tone="hi"
          lit
        />
        <Dots points={[marks.hub]} size={0.9} tone="hi" />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="execution-modes"
      className={className}
      kicker="Chunk hand-off"
      heading="Three ways to swap plans: pause, lurch, or blend"
      controls={
        <>
          <PresetGroup<DelayPreset>
            label="Thinking delay"
            presets={DELAY_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={preset}
            onChange={(id) => chooseDelay(DELAY_PRESETS.find((p) => p.id === id)?.ms ?? DEFAULT_DELAY_MS)}
            testId="em-delay"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={toggleRun}
            data-testid="em-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the track' : 'Run the track'}
          </button>
        </>
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
              onChange={(e) => chooseDelay(Number(e.target.value))}
              aria-label={`Inference delay, any value: inference delay in milliseconds, currently ${delayMs}`}
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
        <AnatomyStage
          viewWidth={TRACK_WIDTH}
          hint={
            running ? (
              'Running ten times slower than the robot'
            ) : (
              <span data-figure-annotation="">
                {noteLines(delayMs, naiveFails).map((line, k) => (
                  <span key={k} className={k ? 'ml-1' : undefined}>
                    {line}
                  </span>
                ))}
              </span>
            )
          }
          readout={
            <>
              <span ref={phaseRef} data-em-phase="" />
              pause {waitWords(deadMs)} · lurch {naivePeak.toFixed(2)} · blend {rtcPeak.toFixed(2)} · limit {JERK_LIMIT.toFixed(2)}
            </>
          }
          status="Lanes, back to front: pause, lurch, blend. Each gauge swings with the speed step of every tick."
          data-testid="em-stage-frame"
        >
          <IsoFigure width={TRACK_WIDTH} height={TRACK_HEIGHT} label={trackLabel} describedBy={descriptionId}>
            <g key={running ? 'running' : 'rest'}>
              <g key="base">{partsOf(BASE_PARTS, slotOf)}</g>
              {LANES.map((mode) => (
                <g
                  key={mode}
                  data-testid={`panel-${mode}`}
                  data-mode={mode}
                  data-peak-step={Math.abs(peaks[mode]).toFixed(2)}
                  data-em-stopped={mode === 'synchronous' && pauseTicks(delayMs) > 0 ? '' : undefined}
                >
                  {partsOf(LANE_PARTS[mode].bed, slotOf)}
                  <g
                    ref={(node) => {
                      trolleyRefs.current[mode] = node;
                    }}
                    transform={trolleyAt(trolleyX(traces[mode], shownTick))}
                  >
                    {partsOf(LANE_PARTS[mode].trolley, slotOf)}
                  </g>
                </g>
              ))}
              <g key="gate">{partsOf(GATE_PARTS, slotOf)}</g>
              <g key="near">{partsOf(NEAR_PARTS, slotOf)}</g>
            </g>
          </IsoFigure>
        </AnatomyStage>
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
