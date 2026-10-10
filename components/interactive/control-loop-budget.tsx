'use client';

import { useId, useState } from 'react';
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
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
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
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * ControlLoopBudget: one synchronous inference call drawn against the
 * arm's beat. The arm wants a fresh command every fiftieth of a second;
 * each beat that passes while the brain is still working is drawn hollow
 * and grey. The two presets are the two VLA-Perf roofline predictions for
 * pi0: a data-centre H100 (6.15 ms, inside one beat) and the robot's own
 * Jetson Thor (52.57 ms, two beats missed). The figure opens on the robot's
 * own computer.
 *
 * "Adjust more" holds the teaching curve's model-size slider, the readouts,
 * the other cited latencies and Reset. "How this was made" holds the
 * roofline settings, the RTC breakdown, the π0.7 training-delay setting and
 * the teaching-model disclaimers. VLA-Perf numbers are analytical
 * predictions, not measurements; its pi0 is 2.7B and pi0-L is hypothetical.
 * The slider deliberately keeps the original 3.0B teaching coordinate and
 * deterministic scaling rule (lib/control-loop.ts).
 */

const WINDOW_MS = 160;
const WIDTH = CHART_VIEW_WIDTH;
const LEFT = 14;
const RIGHT = WIDTH - 18;
const LABEL_ASCENT = CHART_TYPE.labelPx * CHART_TYPE.ascent;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const BRAIN_LABEL_Y = f(4 + LABEL_ASCENT);
const BAR_TOP = BRAIN_LABEL_Y + 8;
const BAR_H = 5;
const ARM_LABEL_Y = f(BAR_TOP + BAR_H + 18 + LABEL_ASCENT);
const BEAT_Y = ARM_LABEL_Y + 18;
const BEAT_R = 3;
const NOTE_Y = BEAT_Y + 30;
const HEIGHT = Math.ceil(NOTE_Y + CHART_TYPE.labelPx * 1.25 * 3 + 6);

const x = (ms: number) => f(LEFT + (ms / WINDOW_MS) * (RIGHT - LEFT));

const DEFAULT_PARAMS_B = PI0_ANCHOR.paramsB;
const SERVER = LATENCY_REFERENCES.find((ref) => ref.id === 'pi0-h100')!;
const THOR = LATENCY_REFERENCES.find((ref) => ref.id === 'pi0-thor')!;

type Computer = 'server' | 'robot';
const COMPUTER_PRESETS: ReadonlyArray<{ id: Computer; label: string }> = [
  { id: 'server', label: 'Data-centre computer' },
  { id: 'robot', label: "Robot's own computer" },
];

type ControlLoopBudgetProps = {
  /**
   * Initial teaching coordinate in billions. Defaults to the chosen 3.0B
   * coordinate (not paper pi0 size); Reset returns to this value.
   */
  defaultParamsB?: number;
  className?: string;
};

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

/** Reference figures: whole ms when the source value is whole. */
function formatRefMs(ms: number): string {
  return Number.isInteger(ms) ? `${ms} ms` : `${ms.toFixed(2)} ms`;
}

/** How many beats one answer takes, in words. */
function beatsWords(ms: number): string {
  const ratio = ms / CONTROL_PERIOD_MS;
  if (ratio <= 0.5) return 'answers well inside one beat';
  if (ratio <= 1) return 'answers just inside one beat';
  const whole = Math.floor(ratio);
  if (whole === 1) return 'takes longer than one beat';
  return `takes over ${whole === 2 ? 'twice' : `${whole} times`} as long`;
}

/** The note at settle, in plain words for the latency on stage. */
function noteLines(ms: number): string[] {
  if (loopCloses(ms)) return ['This computer answers before', 'the next beat, so no beat goes', 'without a fresh command'];
  return ['The arm needs a new command', 'every fiftieth of a second; this', `computer ${beatsWords(ms)}`];
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
  // useId-derived ids keep the label binding and the hatch pattern unique
  // if the figure is mounted more than once on a page.
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

  const budgetX = x(CONTROL_PERIOD_MS);
  const beats = Array.from(
    { length: WINDOW_MS / CONTROL_PERIOD_MS + 1 },
    (_, i) => i * CONTROL_PERIOD_MS,
  );
  const missedBeat = (t: number) => t > 0 && t < inferenceMs;

  function reset() {
    setParamsB(defaultParamsB);
    setOnServer(false);
  }

  function choose(id: Computer) {
    setOnServer(id === 'server');
    if (id === 'robot') setParamsB(PI0_ANCHOR.paramsB);
  }

  const action = roleColour('action');
  const reference = roleColour('reference');
  const hatchId = `clb-overrun-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // The bar fills one beat in the value role; any inference past the
  // beat continues as the constraint hatch, so the verdict reads from the
  // mark pattern as well as from the beats below it.
  const withinW = f(Math.max(2, x(Math.min(inferenceMs, CONTROL_PERIOD_MS)) - LEFT));
  const overrunEndMs = Math.min(inferenceMs, WINDOW_MS);
  const answerX = x(Math.min(inferenceMs, WINDOW_MS));
  // The note points at the first beat after the call starts: hollow when
  // the answer is late, filled when it arrived in time.
  const target: [number, number] = [x(CONTROL_PERIOD_MS), BEAT_Y];

  return (
    <InstrumentFigure
      figureId="control-loop-budget"
      className={className}
      kicker="Control-loop budget"
      heading="The robot's brain thinks slower than the arm needs"
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
              aria-label={`Model size in billions of parameters, currently ${paramsB.toFixed(1)}`}
              aria-valuetext={`${paramsB.toFixed(1)} billion parameters`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds
              low={`${MIN_PARAMS_B.toFixed(1)}B`}
              high={`${PI0L_ANCHOR.paramsB}B, pi0-L hypothetical`}
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
        <FigureStage
          footer={
            <StageStatus>
              A filled beat gets a fresh command; a hollow grey beat passes with none.
            </StageStatus>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Control-loop timeline at ${paramsB.toFixed(1)}B parameters`}
            aria-describedby={descriptionId}
          >
            <DirectLabel x={LEFT} y={BRAIN_LABEL_Y}>
              The brain working out the next move
            </DirectLabel>
            <g data-series="clb-inference" data-testid="inference-bar">
              <Bar x={LEFT} y={BAR_TOP} width={withinW} height={BAR_H} />
            </g>
            {inferenceMs > CONTROL_PERIOD_MS ? (
              <g data-series="clb-overrun">
                <ConstraintHatch
                  id={hatchId}
                  x={budgetX}
                  y={BAR_TOP}
                  width={f(x(overrunEndMs) - budgetX)}
                  height={BAR_H}
                />
              </g>
            ) : null}
            {inferenceMs > WINDOW_MS ? (
              <path
                data-clb-runs-on=""
                d={`M${RIGHT + 4},${BAR_TOP} l5,${BAR_H / 2} l-5,${BAR_H / 2}`}
                fill="none"
                stroke={roleColour('constraint')}
                strokeWidth={CHART_STROKE.trace}
              />
            ) : null}
            {/* The moment the answer arrives, carried down to the beats.
                It breaks around the beat label so it never runs through it. */}
            <path
              data-clb-answer=""
              d={`M${answerX},${BAR_TOP + BAR_H} V${f(ARM_LABEL_Y - LABEL_ASCENT - 3)} M${answerX},${ARM_LABEL_Y + 4} V${BEAT_Y - BEAT_R}`}
              fill="none"
              stroke={reference}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray="2 2"
            />

            <DirectLabel x={LEFT} y={ARM_LABEL_Y}>
              The arm&apos;s beat, {CONTROL_HZ} times a second
            </DirectLabel>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={BEAT_Y}
              y2={BEAT_Y}
              stroke={CHART_STRUCTURE.axes}
              strokeOpacity={CHART_STRUCTURE.axesOpacity}
              strokeWidth={CHART_STROKE.structure}
            />
            {beats.map((t) => {
              const lost = missedBeat(t);
              return (
                <circle
                  key={t}
                  data-clb-beat={lost ? 'missed' : 'served'}
                  cx={x(t)}
                  cy={BEAT_Y}
                  r={BEAT_R}
                  fill={lost ? MOTION_STAGE.background : action}
                  stroke={lost ? CHART_STRUCTURE.labelSecondary : action}
                  strokeWidth={1.5}
                />
              );
            })}

            <StageAnnotation
              x={LEFT}
              y={NOTE_Y}
              lines={noteLines(inferenceMs)}
              target={target}
              from={[target[0], NOTE_Y - CHART_TYPE.labelPx]}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="If the robot's brain can't answer before the next beat, the arm either waits or keeps going on stale orders, which is why speed matters."
      method={
        <>
          <p>
            The arm in this figure runs a {CONTROL_HZ} Hz control loop, so a command is due every{' '}
            {Math.round(CONTROL_PERIOD_MS)} ms. The bar is one synchronous inference call: the
            policy is asked once at time zero and the arm gets nothing new until it answers. Every
            beat that passes inside the call is a missed deadline. Real systems hide this wait
            with action chunks and asynchronous execution, described further down the article.
          </p>
          <p>
            The two presets are VLA-Perf v1 roofline predictions for pi0, not measurements:{' '}
            {formatRefMs(SERVER.ms)} on an H100 server and {formatRefMs(THOR.ms)} on a Jetson Thor,
            both at BF16/FP16 with three cameras, ten denoising steps, a chunk of 50 and no network.
            The other cited latencies in &ldquo;Adjust more&rdquo;: the pi0.6 model card reports
            63 ms per chunk on an H100 with five denoising steps; the real-time chunking paper
            measured 108.76 ms (±2.34 ms) mean total on a non-mobile robot over a wired LAN with an
            RTX 4090 at bfloat16, and 138.98 ms (±6.71 ms) on a mobile robot (model 96.89, network
            21.20, image resize 11.22, other 9.67 ms). The pi0.7 paper trains with up to 12
            simulated ticks of delay at 50 Hz, a 240 ms training-delay setting rather than a
            measured latency.
          </p>
          <p data-testid="model-assumption-note">
            Illustrative teaching model, not hardware profiling. VLA-Perf v1 models 2.7B pi0 at 52.57 ms
            and hypothetical 9.1B pi0-L at 3.9 Hz; this plot deliberately places the first reference at 3.0B.
          </p>
          <p>
            The model-size slider follows a teaching curve on the robot&apos;s own computer: linear
            below the pi0 reference (modeled) at {PI0_ANCHOR.paramsB.toFixed(1)}B, a power law up to
            the pi0-L hypothetical at {PI0L_ANCHOR.paramsB}B. Neither rule is a hardware measurement or
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
                    On the data-centre computer, pi0 is predicted at {formatMs(inferenceMs)}, inside
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
                parameters. The 3.0B coordinate is deliberately chosen; VLA-Perf models pi0 at 2.7B
                and pi0-L as hypothetical. All displayed rates are reciprocal toy inference rates,
                not robot/controller frequencies.
              </>
            }
          />
        </>
      }
      source="Latencies from VLA-Perf, the π0.6 model card, the real-time chunking paper and the π0.7 paper; teaching curve in between."
    />
  );
}
