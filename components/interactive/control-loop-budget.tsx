'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness, useInView, useLoop } from '@/components/iso/react/live';
import {
  BEAT_S,
  CRANK_PIN,
  FEELER_PARTS,
  HEAD_PARTS,
  HEIGHT,
  PARTS,
  PHONE_FIT,
  RAM_PARTS,
  RECORD,
  STILL_T,
  TOKEN_PARTS,
  WIDTH,
  feelerShift,
  flywheelAt,
  freshPerSecond,
  pendulumAt,
  poseAt,
  ramShift,
  readoutOf,
  recordCount,
  strokeBeats,
  tokenPoint,
  tokenShift,
  wheelAt,
  type Part,
  type Pose,
} from '@/components/iso/figures/beat-feeder';
import {
  CONTROL_HZ,
  CONTROL_PERIOD_MS,
  LATENCY_REFERENCES,
  MAX_PARAMS_B,
  MIN_PARAMS_B,
  PI0L_ANCHOR,
  PI0_ANCHOR,
  effectiveHz,
  inferenceMsOnThor,
  loopCloses,
  missedTicks,
} from '@/lib/control-loop';

/**
 * ControlLoopBudget: the arm's beat against the time one answer takes,
 * drawn as a beat feeder (components/iso/figures/beat-feeder.ts).
 *
 * A pendulum steps an upright pocket wheel one pocket per beat of the arm,
 * 50 beats a second. The press at the left is the model: one stamping
 * stroke is one answer, and each finished token rolls into the pocket
 * under the press. On the robot's own computer a stroke takes 2.6 beats,
 * so most pockets leave the press empty; at the next pocket the arm's
 * feeler (the one lit part) finds a token, a fresh order, or an empty
 * pocket, where the arm reuses its last order. The tokens ride on over the
 * wheel as a record of the last beats, so the share of filled pockets is
 * the share of beats with a fresh order. The two presets are the two
 * VLA-Perf roofline predictions for π0: a data-center H100 (6.15 ms, inside
 * one beat) and the robot's own Jetson Thor (52.57 ms). The figure opens on
 * the robot's own computer. The machine runs while it is on screen and
 * nobody points at it; reduced motion and the served HTML show one still
 * moment.
 *
 * "Adjust more" holds the teaching curve's model-size slider, the readouts,
 * the other cited latencies and Reset. "How this was made" holds the
 * roofline settings, the RTC breakdown, the π0.7 training-delay setting and
 * the teaching-model disclaimers. VLA-Perf numbers are analytical
 * predictions, not measurements; its π0 is 2.7B and π0-L is hypothetical.
 * The slider deliberately keeps the original 3.0B teaching coordinate and
 * deterministic scaling rule (lib/control-loop.ts).
 */

const DEFAULT_PARAMS_B = PI0_ANCHOR.paramsB;
const SERVER = LATENCY_REFERENCES.find((ref) => ref.id === 'pi0-h100')!;
const THOR = LATENCY_REFERENCES.find((ref) => ref.id === 'pi0-thor')!;

type Computer = 'server' | 'robot';
const COMPUTER_PRESETS: ReadonlyArray<{ id: Computer; label: string }> = [
  { id: 'server', label: 'Data-center computer' },
  { id: 'robot', label: "Robot's own computer" },
];

type ControlLoopBudgetProps = {
  /**
   * Initial teaching coordinate in billions. Defaults to the chosen 3.0B
   * coordinate (not paper π0 size); Reset returns to this value.
   */
  defaultParamsB?: number;
  className?: string;
};

/** The one line under the drawing that says what to watch. */
export const HINT =
  'One swing is one beat · a token is a fresh order · at an empty pocket the blue feeler drops in and the arm reuses its last order';

/** The pose the server, the first render and reduced motion draw. */
export const stillPose = (inferenceMs: number) => poseAt(inferenceMs, STILL_T);

function drawingLabel(inferenceMs: number): string {
  const pose = stillPose(inferenceMs);
  const filled = recordCount(pose);
  const per = freshPerSecond(inferenceMs);
  const stroke = strokeBeats(inferenceMs);
  return `A beat feeder. A pendulum turns an upright pocket wheel one pocket for each of the arm's ${CONTROL_HZ} beats a second. A press at the left, the model, takes ${stroke.toFixed(1)} beats to stamp each token and rolls it into the pocket under it; at the next pocket the arm's feeler finds a token, a fresh order, or an empty pocket, where the arm reuses its last order. Of the ${RECORD} pockets past the feeler, ${filled} hold a token: ${per} of every ${CONTROL_HZ} beats get a fresh order.`;
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}
const partsView = (parts: readonly Part[]) => parts.map((part, index) => (part.kind === 'slot' ? null : <PartView key={index} part={part} />));

const r3 = (value: number) => String(Math.round(value * 1000) / 1000);

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

/** Reference figures: whole ms when the source value is whole. */
function formatRefMs(ms: number): string {
  return Number.isInteger(ms) ? `${ms} ms` : `${ms.toFixed(2)} ms`;
}

/**
 * The cited latencies, kept apart from the toy curve: each keeps its own
 * protocol detail and its reading against the 20 ms budget, in plain text.
 * A training-delay setting is not read against the budget; its label says
 * what it is. Divs with list roles, because the article's unlayered prose
 * list rules would indent and space a real list.
 */
function ReferenceList() {
  return (
    <div className="min-w-0 basis-full">
      <div className="font-sans text-xs text-text-dim">Cited latencies</div>
      <div role="list">
        {LATENCY_REFERENCES.map((ref) => (
          <div
            key={ref.id}
            role="listitem"
            data-testid={`ref-${ref.id}`}
            className="flex flex-wrap items-baseline gap-x-2 py-0.5 font-sans text-[13px] leading-snug"
          >
            <span className="text-text">{ref.label}</span>
            <span className="tabular-nums text-text">{formatRefMs(ref.ms)}</span>
            {ref.absorbed ? null : (
              <span className="text-text-dim">
                {loopCloses(ref.ms) ? 'closes at 50 Hz' : 'over budget'}
              </span>
            )}
            <span className="basis-full text-xs text-text-dim">{ref.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ControlLoopBudget({
  defaultParamsB = DEFAULT_PARAMS_B,
  className,
}: ControlLoopBudgetProps) {
  // useId-derived ids keep the label binding unique if the figure is
  // mounted more than once on a page.
  const uid = useId();
  const modelSizeId = `${uid}-clb-model-size`;
  const descriptionId = `${uid}-clb-description`;
  const [paramsB, setParamsB] = useState<number>(defaultParamsB);
  const [onServer, setOnServer] = useState(false);
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultParamsB, setPrevDefaultParamsB] = useState(defaultParamsB);
  if (defaultParamsB !== prevDefaultParamsB) {
    setPrevDefaultParamsB(defaultParamsB);
    setParamsB(defaultParamsB);
    setOnServer(false);
  }

  const curveMs = inferenceMsOnThor(paramsB);
  // The data-centre preset swaps the computer, not the model: the stage
  // then shows the cited H100 prediction instead of the teaching curve.
  const inferenceMs = onServer ? SERVER.ms : curveMs;
  const closes = loopCloses(inferenceMs);
  const missed = missedTicks(inferenceMs);
  const hz = effectiveHz(inferenceMs);
  const preset: Computer | null = onServer
    ? 'server'
    : paramsB === PI0_ANCHOR.paramsB
      ? 'robot'
      : null;

  function reset() {
    setParamsB(defaultParamsB);
    setOnServer(false);
  }

  function choose(id: Computer) {
    setOnServer(id === 'server');
    if (id === 'robot') setParamsB(PI0_ANCHOR.paramsB);
  }

  // ------------------------------------------------------------ the machine in motion
  // What the server and the first render draw; the loop moves the parts from there on.
  const [first] = useState(() => {
    const ms = inferenceMsOnThor(defaultParamsB);
    const pose = stillPose(ms);
    return { ms, pose, wheel: wheelAt(pose.turn), fly: flywheelAt(pose.press.turn), pendulum: pendulumAt(pose.swing) };
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<SVGGElement>(null);
  const starRef = useRef<SVGGElement>(null);
  const tokenRefs = useRef<Array<SVGGElement | null>>([]);
  const ramRef = useRef<SVGGElement>(null);
  const spokesRef = useRef<SVGPathElement>(null);
  const pinRef = useRef<SVGGElement>(null);
  const pressTokenRef = useRef<SVGGElement>(null);
  const feelerRef = useRef<SVGGElement>(null);
  const pendulumRefs = useRef<Array<SVGGElement | null>>([]);
  const fallingRef = useRef<SVGGElement>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const run = useRef({
    t: STILL_T,
    ms: first.ms,
    held: false,
    turn: Number.NaN,
  });

  const draw = useCallback((pose: Pose) => {
    const s = run.current;
    if (pose.turn !== s.turn) {
      const { wheel, star } = wheelAt(pose.turn);
      writeSolid(wheelRef.current, wheel);
      writeSolid(starRef.current, star);
      s.turn = pose.turn;
    }
    pose.pockets.forEach((pocket, j) => {
      const group = tokenRefs.current[j];
      if (!group) return;
      if (!pocket.token) {
        group.setAttribute('display', 'none');
        return;
      }
      group.removeAttribute('display');
      group.setAttribute('transform', tokenShift(tokenPoint(pocket)));
    });
    ramRef.current?.setAttribute('transform', ramShift(pose.press.down));
    const fly = flywheelAt(pose.press.turn);
    spokesRef.current?.setAttribute('d', fly.spokes);
    pinRef.current?.setAttribute('transform', fly.pin);
    const token = pressTokenRef.current;
    if (token) {
      if (pose.press.token && pose.press.tokenOpacity > 0.001) {
        token.removeAttribute('display');
        token.setAttribute('opacity', r3(pose.press.tokenOpacity));
        token.setAttribute('transform', tokenShift(pose.press.token));
      } else token.setAttribute('display', 'none');
    }
    feelerRef.current?.setAttribute('transform', feelerShift(pose.feeler));
    pendulumAt(pose.swing).forEach((paths, index) => writeSolid(pendulumRefs.current[index] ?? null, paths));
    const falling = fallingRef.current;
    if (falling) {
      if (pose.falling && pose.falling.opacity > 0.001) {
        falling.removeAttribute('display');
        falling.setAttribute('opacity', r3(pose.falling.opacity));
        falling.setAttribute('transform', tokenShift(pose.falling.at));
      } else falling.setAttribute('display', 'none');
    }
    const root = rootRef.current;
    if (root) {
      root.dataset.beat = String(pose.beat);
      root.dataset.fresh = String(pose.fresh);
    }
    if (readoutRef.current) readoutRef.current.textContent = readoutOf(s.ms, pose);
  }, []);

  const visible = useInView(rootRef);
  const kick = useLoop((dt, calm) => {
    const s = run.current;
    if (calm) s.t = STILL_T;
    else if (!s.held) s.t += dt / BEAT_S;
    draw(poseAt(s.ms, s.t));
    return !calm && !s.held;
  }, visible);

  // A new computer (or model size) changes the machine at once: the wheel shows the new pattern straight away.
  useEffect(() => {
    const s = run.current;
    if (s.ms === inferenceMs) return;
    s.ms = inferenceMs;
    if (typeof window.matchMedia === 'function' && asksForStillness()) s.t = STILL_T;
    draw(poseAt(s.ms, s.t));
    kick();
  }, [inferenceMs, draw, kick]);

  useEffect(() => {
    readoutRef.current = rootRef.current?.closest('[data-figure-frame]')?.querySelector<HTMLSpanElement>('[data-readout]') ?? null;
  }, []);

  // Pointing at the drawing holds the machine still, so a pocket can be looked at; it runs on when the pointer leaves.
  const hold = (held: boolean) => {
    run.current.held = held;
    if (!held) kick();
  };

  const firstTokens = first.pose.pockets;
  const stage = (
    <div ref={rootRef} data-testid="beat-feeder" data-beat={first.pose.beat} data-fresh={String(first.pose.fresh)} onPointerEnter={() => hold(true)} onPointerLeave={() => hold(false)}>
      <IsoFigure width={WIDTH} height={HEIGHT} label={drawingLabel(inferenceMs)} describedBy={descriptionId} fit={PHONE_FIT}>
        {PARTS.map((part, index) => {
          if (part.kind !== 'slot') return <PartView key={index} part={part} />;
          switch (part.slot) {
            case 'press-moving':
              return (
                <g key="press-moving">
                  <g ref={ramRef} transform={ramShift(first.pose.press.down)}>
                    {partsView(RAM_PARTS)}
                  </g>
                  {partsView(HEAD_PARTS)}
                  <path ref={spokesRef} className="iso-line" data-tone="lo" d={first.fly.spokes} />
                  <g ref={pinRef} transform={first.fly.pin}>
                    <Solid paths={CRANK_PIN} tone="mid" />
                  </g>
                </g>
              );
            case 'press-token':
              return (
                <g
                  key="press-token"
                  ref={pressTokenRef}
                  data-testid="press-token"
                  display={first.pose.press.token ? undefined : 'none'}
                  opacity={first.pose.press.tokenOpacity}
                  transform={first.pose.press.token ? tokenShift(first.pose.press.token) : undefined}
                >
                  {partsView(TOKEN_PARTS)}
                </g>
              );
            case 'wheel':
              return <LiveSolid key="wheel" ref={wheelRef} paths={first.wheel.wheel} tone="mid" />;
            case 'tokens':
              return (
                <g key="tokens" data-testid="wheel-tokens">
                  {firstTokens.map((pocket, j) => (
                    <g
                      key={j}
                      ref={(el) => {
                        tokenRefs.current[j] = el;
                      }}
                      data-pocket={j}
                      display={pocket.token ? undefined : 'none'}
                      transform={tokenShift(tokenPoint(pocket))}
                    >
                      {partsView(TOKEN_PARTS)}
                    </g>
                  ))}
                </g>
              );
            case 'star':
              return <LiveSolid key="star" ref={starRef} paths={first.wheel.star} tone="mid" />;
            case 'feeler':
              return (
                <g key="feeler" ref={feelerRef} data-testid="feeler" transform={feelerShift(first.pose.feeler)}>
                  {partsView(FEELER_PARTS)}
                </g>
              );
            case 'pendulum':
              return (
                <g key="pendulum">
                  {first.pendulum.map((paths, index) => (
                    <LiveSolid
                      key={index}
                      ref={(el) => {
                        pendulumRefs.current[index] = el;
                      }}
                      paths={paths}
                      tone="mid"
                    />
                  ))}
                </g>
              );
            default:
              return (
                <g key="falling" ref={fallingRef} display={first.pose.falling ? undefined : 'none'} transform={first.pose.falling ? tokenShift(first.pose.falling.at) : undefined}>
                  {partsView(TOKEN_PARTS)}
                </g>
              );
          }
        })}
      </IsoFigure>
    </div>
  );

  return (
    <InstrumentFigure
      figureId="control-loop-budget"
      className={className}
      kicker="Control-loop budget"
      heading={`Choosing a move takes ${(inferenceMs / CONTROL_PERIOD_MS).toFixed(1)} times the available time`}
      controls={
        <PresetGroup<Computer>
          label="Where the model runs"
          presets={COMPUTER_PRESETS}
          value={preset}
          onChange={choose}
          testId="clb-computer"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={modelSizeId}
              value={
                <>
                  <span data-testid="params-readout">{paramsB.toFixed(1)}B params</span>
                  {', '}
                  <span data-testid="latency-readout">{formatMs(curveMs)}</span>
                </>
              }
            >
              Model size on the robot&apos;s own computer, teaching curve
            </ControlLabel>
            <input
              id={modelSizeId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_PARAMS_B}
              max={MAX_PARAMS_B}
              step={0.1}
              value={paramsB}
              onChange={(e) => {
                setOnServer(false);
                setParamsB(Number(e.target.value));
              }}
              aria-label="Model size on the robot's own computer, teaching curve, in billions of parameters"
              aria-valuetext={`${paramsB.toFixed(1)} billion parameters, ${formatMs(curveMs)} per inference`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds
              low={`${MIN_PARAMS_B.toFixed(1)}B`}
              high={`${PI0L_ANCHOR.paramsB}B, π0-L hypothetical`}
            />
          </ControlField>
          <InstrumentReadout>
            Synchronous toy:{' '}
            <span data-testid="verdict-readout">
              {closes ? 'closes at 50 Hz' : 'does not close at 50 Hz'}
            </span>
            :{' '}
            <span data-testid="hz-readout">{Math.round(hz)} Hz</span>
            {' '}reciprocal inference rate, not robot Hz;{' '}
            <span data-testid="missed-readout">{missed}</span>
            {' '}
            {missed === 1 ? 'deadline' : 'deadlines'} missed
          </InstrumentReadout>
          <ReferenceList />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={HINT}
          readout={readoutOf(inferenceMs, stillPose(inferenceMs))}
          status="Illustrative teaching model of predicted timings, slowed down"
          data-testid="beat-feeder-stage"
        >
          <p className="mb-2 font-sans text-[14px] leading-normal text-text" data-testid="control-time-comparison">
            Choosing a move takes <strong className="font-mono text-[24px]">{inferenceMs.toFixed(1)}</strong> milliseconds; the arm has{' '}
            <strong className="font-mono text-[24px]">{CONTROL_PERIOD_MS}</strong> milliseconds between commands. That is{' '}
            <strong className="font-mono text-[24px]">{(inferenceMs / CONTROL_PERIOD_MS).toFixed(1)}</strong> times the available time.
          </p>
          {stage}
        </AnatomyStage>
      }
      caption={loopCloses(inferenceMs) ? "This computer chooses a move before the next motor command is due." : `This computer takes ${(inferenceMs / CONTROL_PERIOD_MS).toFixed(1)} command intervals to choose a move; the arm must wait or reuse old orders.`}
      method={
        <>
          <p data-testid="clb-machine-note">
            The arm in this figure runs a {CONTROL_HZ} Hz control loop, so a command is due every{' '}
            {Math.round(CONTROL_PERIOD_MS)} ms. The drawing is that loop made of parts. Each swing of the
            pendulum lets the star wheel on the axle, and the pocket wheel with it, step one pocket: one
            beat. The press at the left is the model. One turn of its flywheel is one inference call, and
            the policy is asked again as soon as it answers, so a token, a fresh order, rolls into the
            pocket under the press each time a call ends. On the robot&apos;s own computer a call takes{' '}
            {strokeBeats(THOR.ms).toFixed(1)} beats, so the first beats of each call pass with no fresh
            order; a faster call fills every pocket. At the next pocket the blue feeler drops onto each
            pocket as it arrives: on a token it stops, and in an empty pocket it falls in and the arm
            repeats its last order. The tokens ride on over the wheel as a record of the last {RECORD}{' '}
            beats and tip into the bin at the bottom, so the share of filled pockets is the share of
            beats with a fresh order, {freshPerSecond(inferenceMs)} of every {CONTROL_HZ} at the current
            setting. The machine runs slowed down, about {(BEAT_S * 1000).toFixed(0)} ms of screen time
            for each {Math.round(CONTROL_PERIOD_MS)} ms beat. Real systems hide this wait with action
            chunks and asynchronous execution, described further down the article.
          </p>
          <p>
            The two presets are VLA-Perf v1 roofline predictions for π0, not measurements:{' '}
            {formatRefMs(SERVER.ms)} on an H100 server and {formatRefMs(THOR.ms)} on a Jetson Thor,
            both at BF16/FP16 with three cameras, ten denoising steps, a chunk of 50 and no network.
            The other cited latencies in &ldquo;Adjust more&rdquo;: the π0.6 model card reports
            63 ms per chunk on an H100 with five denoising steps; the real-time chunking paper
            measured 108.76 ms (±2.34 ms) mean total on a non-mobile robot over a wired LAN with an
            RTX 4090 at bfloat16, and 138.98 ms (±6.71 ms) on a mobile robot (model 96.89, network
            21.20, image resize 11.22, other 9.67 ms). The π0.7 paper trains with up to 12
            simulated ticks of delay at 50 Hz, a 240 ms training-delay setting rather than a
            measured latency.
          </p>
          <p data-testid="model-assumption-note">
            Illustrative teaching model, not hardware profiling. VLA-Perf v1 models 2.7B π0 at 52.57 ms
            and hypothetical 9.1B π0-L at 3.9 Hz; this figure deliberately places the first reference at 3.0B.
          </p>
          <p>
            The model-size slider follows a teaching curve on the robot&apos;s own computer: linear
            below the π0 reference (modeled) at {PI0_ANCHOR.paramsB.toFixed(1)}B, a power law up to
            the π0-L hypothetical at {PI0L_ANCHOR.paramsB}B. Neither rule is a hardware measurement or
            a size limit. The inference rate in the readout, {Math.round(hz)} answers a second at
            the current setting, is the reciprocal of one call&apos;s latency, not the rate at which
            the robot&apos;s controller runs.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Teaching-model inference by toy size, against the 20 ms budget"
            rowHeader="model size"
            columns={[
              { header: 'inference', numeric: true },
              { header: 'effective rate', numeric: true },
              { header: 'loop', numeric: false },
            ]}
            rows={[0.5, 1.0, 2.0, 3.0, 6.0, 9.1].map((b) => {
              const ms = inferenceMsOnThor(b);
              return {
                label: `${b.toFixed(1)}B`,
                values: [
                  formatMs(ms),
                  `${Math.round(effectiveHz(ms))} Hz`,
                  loopCloses(ms) ? 'closes' : 'does not close',
                ],
              };
            })}
            description={
              <>
                {onServer ? (
                  <>
                    On the data-center computer, π0 is predicted at {formatMs(inferenceMs)}, inside
                    the {Math.round(CONTROL_PERIOD_MS)} ms budget of a {CONTROL_HZ} Hz loop. On the
                    robot&apos;s own computer, the
                  </>
                ) : (
                  <>In this toy, the</>
                )}{' '}
                {paramsB.toFixed(1)}B coordinate gives {formatMs(curveMs)} of inference against the{' '}
                {Math.round(CONTROL_PERIOD_MS)} ms budget of a {CONTROL_HZ} Hz loop,{' '}
                {loopCloses(curveMs)
                  ? 'closing the loop'
                  : `missing ${missedTicks(curveMs)} ${missedTicks(curveMs) === 1 ? 'deadline' : 'deadlines'} and running at ${Math.round(effectiveHz(curveMs))} Hz`}
                ; inference stays under budget only below about{' '}
                {(PI0_ANCHOR.paramsB * CONTROL_PERIOD_MS / PI0_ANCHOR.inferenceMs).toFixed(1)}B toy
                parameters. The 3.0B coordinate is deliberately chosen; VLA-Perf models π0 at 2.7B
                and π0-L as hypothetical. All displayed rates are reciprocal toy inference rates,
                not robot/controller frequencies.
              </>
            }
          />
        </>
      }
      source="Computer timings are predictions from VLA-Perf, a robot timing study; values for other model sizes are illustrative. The other cited times come from the π0.6 model card, the π0.7 paper and the Real-Time Chunking paper."
    />
  );
}
