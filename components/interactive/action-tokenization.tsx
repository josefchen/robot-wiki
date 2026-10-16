'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  SliderEnds,
} from '@/components/ui/instrument';
import { CHART_VIEW_WIDTH, roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  DETAIL_HEIGHT,
  DETAIL_NOTCHES,
  DETAIL_PARTS,
  DETAIL_WIDTH,
  HEIGHT,
  PARTS,
  PIN_LIFT,
  WIDTH,
  detailNeedle,
  detailSlider,
  gantryAt,
  knobPointer,
  notchX,
  pinAt,
  setterAt,
  sliderAt,
  type DetailPart,
  type Part,
} from '@/components/iso/figures/token-rack-bank';
import {
  ACTION_DIMS,
  BIN_COUNT,
  CHUNK_STEPS,
  SEQUENTIAL_DECODES,
  VALUE_MAX,
  VALUE_MIN,
  binCenter,
  binIndex,
  binWidth,
  generateActionChunk,
  tokenForBin,
} from '@/lib/action-tokenization';
import { cx } from '@/lib/utils';

/**
 * ActionTokenization: how one moment of an arm movement becomes seven
 * words a language model writes, in RT-1 / RT-2 / OpenVLA-style policies,
 * drawn as a token rack bank.
 *
 * Seven racks lie side by side, one per motion of the arm, each cut with
 * 256 notches from -1 to +1. A deterministic 7-motion, 16-moment action
 * chunk sets each rack's slider in the notch nearest its smooth command at
 * the chosen moment: the notch number is the word. A setter on a gantry
 * (the one lit part) writes the racks one after another, and a register of
 * seven pins counts the words. A close-up underneath shows fifteen notches
 * of the chosen motion's rack around its slider, with a needle at the
 * smooth command. The scrubber picks a moment; "Write the next moment"
 * moves the setter rack by rack to the next one. The motion buttons and
 * the full 256-slot strip sit in "Adjust more"; the symbols (Δx, bin,
 * <a120>), the reconstruction error and the decode cost sit in "How this
 * was made".
 *
 * Interactive contract: deterministic render (fixed trajectories, no PRNG),
 * visible readouts, one visible slider, motion buttons and reset in the
 * fold, ARIA labels, fixed-size drawings (no layout shift), no auto-playing
 * motion.
 */
type ActionTokenizationProps = {
  /** Initial control step. Default 7 (mid-chunk). */
  defaultStep?: number;
  /** Initial dimension index. Default 0 (forward/back, Δx). */
  defaultDim?: number;
  className?: string;
};

/** Plain-words names of the seven motions, in ACTION_DIMS order. */
const MOTION_GLOSS: Readonly<Record<string, string>> = {
  x: 'forward/back',
  y: 'left/right',
  z: 'up/down',
  roll: 'roll',
  pitch: 'tilt',
  yaw: 'turn',
  gripper: 'open/close',
};

export function motionGloss(dimIndex: number): string {
  return MOTION_GLOSS[ACTION_DIMS[dimIndex].id];
}

const WIDTH_STRIP = CHART_VIEW_WIDTH;
const STRIP_LEFT = 10;
const STRIP_W = 320;
const STRIP_H = 16;
/** Notches shown in the close-up, centred on the assigned one where the range allows. */
const ZOOM_BINS = DETAIL_NOTCHES;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** The first notch the close-up shows for `bin`. */
export function zoomStartFor(bin: number): number {
  return Math.min(BIN_COUNT - ZOOM_BINS, Math.max(0, bin - Math.floor(ZOOM_BINS / 2)));
}

/** Where the smooth command sits in the close-up, in notches from its left end. */
export function needleOffset(value: number, zoomStart: number): number {
  return (value - (VALUE_MIN + zoomStart * binWidth())) / binWidth();
}

/** Seconds on screen for the setter to write one rack, and to travel to the next. */
const WRITE_S = 0.42;

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();
const smooth = (u: number) => {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
};

function PartView({ part }: { part: Part | DetailPart }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  return null;
}

/** Consecutive parts of one group. */
function runsOf<T extends { group?: string }>(list: readonly T[]) {
  const runs: Array<{ group: string; parts: T[] }> = [];
  for (const part of list) {
    const group = part.group ?? 'static';
    const last = runs[runs.length - 1];
    if (last && last.group === group) last.parts.push(part);
    else runs.push({ group, parts: [part] });
  }
  return runs;
}

const GANTRY_FROM = PARTS.findIndex((part) => part.group === 'gantry');
const GANTRY_TO = PARTS.length - [...PARTS].reverse().findIndex((part) => part.group === 'gantry' || part.group === 'setter');
const BEFORE_RUNS = runsOf(PARTS.slice(0, GANTRY_FROM));
const GANTRY_RUNS = runsOf(PARTS.slice(GANTRY_FROM, GANTRY_TO));
const AFTER_RUNS = runsOf(PARTS.slice(GANTRY_TO));

export function ActionTokenization({
  defaultStep = 7,
  defaultDim = 0,
  className,
}: ActionTokenizationProps) {
  const uid = useId();
  const descriptionId = `${uid}-at-description`;
  const binDescriptionId = `${uid}-at-bin-description`;
  const [step, setStep] = useState(defaultStep);
  const [dim, setDim] = useState(defaultDim);
  const [writing, setWriting] = useState(false);
  const chunk = useMemo(() => generateActionChunk(), []);

  const value = chunk[dim][step];
  const bin = binIndex(value);
  const center = binCenter(bin);
  const error = value - center;
  const token = tokenForBin(bin);
  const stepBins = useMemo(() => chunk.map((row) => binIndex(row[step])), [chunk, step]);
  const gloss = motionGloss(dim);

  // The close-up: ZOOM_BINS consecutive notches around the assigned one.
  const zoomStart = zoomStartFor(bin);
  const selectedK = bin - zoomStart;
  const offset = needleOffset(value, zoomStart);
  const detailSliderPaths = detailSlider(selectedK);
  const needle = detailNeedle(offset);

  // Sampled along the selected motion. Endpoints are t = 0 and t = 15, and
  // the playhead row moves with the scrubber.
  const sampleTicks = [...new Set([0, 3, 6, 9, 12, CHUNK_STEPS - 1, step])].sort((a, b) => a - b);
  const sampleRows = sampleTicks.map((t) => ({
    label: `${t}`,
    values: [chunk[dim][t].toFixed(3), `${binIndex(chunk[dim][t])}`, t === step ? 'playhead' : 'off'],
  }));

  const descriptionText = `Along the ${gloss} (${ACTION_DIMS[dim].label}) motion of the ${CHUNK_STEPS}-step action chunk, the continuous command runs from ${chunk[dim][0].toFixed(3)} at t = 0 to ${chunk[dim][CHUNK_STEPS - 1].toFixed(3)} at t = ${CHUNK_STEPS - 1}, and at the current step ${step} the value ${value.toFixed(3)} falls in bin ${bin} of ${BIN_COUNT - 1}; the slider on the ${gloss} rack sits in that notch, the setter writes the seven racks one after another, and the chunk is a fixed synthetic example rather than measured robot data.`;

  const highlight = roleColour('highlight');
  const reference = roleColour('reference');
  const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`;

  const sliderRefs = useRef<Array<SVGGElement | null>>([]);
  const pinRefs = useRef<Array<SVGGElement | null>>([]);
  const gantryRef = useRef<SVGGElement>(null);
  const setterRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ step, dim, chunk });
  useLayoutEffect(() => {
    state.current = { step, dim, chunk };
  }, [step, dim, chunk]);

  // Write the next moment: the setter visits the seven racks in order and drops each slider into its new notch,
  // one pin popping per word; then it returns over the chosen motion's rack.
  useEffect(() => {
    if (!writing) return;
    const { step: from, dim: home, chunk: rows } = state.current;
    const to = (from + 1) % CHUNK_STEPS;
    const oldX = rows.map((row) => notchX(binIndex(row[from])));
    const newX = rows.map((row) => notchX(binIndex(row[to])));
    const legs = ACTION_DIMS.length;
    let frame = 0;
    let last = performance.now();
    let t = 0;
    const place = (index: number, x: number) => sliderRefs.current[index]?.setAttribute('transform', sliderAt(x));
    for (let index = 0; index < legs; index++) pinRefs.current[index]?.setAttribute('transform', pinAt(0));
    const tick = (now: number) => {
      t += Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      const leg = Math.min(legs, Math.floor(t / WRITE_S));
      const u = (t - leg * WRITE_S) / WRITE_S;
      if (leg >= legs) {
        // Back over the chosen motion's rack, then the moment is written.
        const v = smooth(u);
        const fromX = newX[legs - 1];
        gantryRef.current?.setAttribute('transform', gantryAt(fromX + (newX[home] - fromX) * v));
        setterRef.current?.setAttribute('transform', setterAt(legs - 1 + (home - (legs - 1)) * v, PIN_LIFT));
        if (u >= 1) {
          setterRef.current?.setAttribute('transform', setterAt(home, 0));
          setWriting(false);
          setStep(to);
          return;
        }
      } else {
        // Travel to rack `leg` (first half), then carry its slider to the new notch (second half).
        const start = leg === 0 ? oldX[home] : newX[leg - 1];
        const fromRack = leg === 0 ? home : leg - 1;
        const travel = smooth(u / 0.45);
        const carry = smooth((u - 0.45) / 0.45);
        const x = u < 0.45 ? start + (oldX[leg] - start) * travel : oldX[leg] + (newX[leg] - oldX[leg]) * carry;
        const rack = u < 0.45 ? fromRack + (leg - fromRack) * travel : leg;
        // The pin lifts off the last slider, rides over, and drops onto the next one.
        const lift = u < 0.45 ? PIN_LIFT * smooth(Math.min(1, u / 0.1, (0.45 - u) / 0.1)) : 0;
        gantryRef.current?.setAttribute('transform', gantryAt(x));
        setterRef.current?.setAttribute('transform', setterAt(rack, lift));
        if (u >= 0.45) place(leg, x);
        if (u >= 0.92) pinRefs.current[leg]?.setAttribute('transform', pinAt(1));
        for (let done = 0; done < leg; done++) {
          place(done, newX[done]);
          pinRefs.current[done]?.setAttribute('transform', pinAt(1));
        }
        if (phaseRef.current) phaseRef.current.textContent = `writing moment ${to + 1}: word ${leg + 1} of ${legs} · `;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [writing]);

  // At rest, every slider, pin and the gantry sit where this moment and motion put them.
  useEffect(() => {
    if (writing) return;
    stepBins.forEach((b, index) => {
      sliderRefs.current[index]?.setAttribute('transform', sliderAt(notchX(b)));
      pinRefs.current[index]?.setAttribute('transform', pinAt(1));
    });
    gantryRef.current?.setAttribute('transform', gantryAt(notchX(bin)));
    setterRef.current?.setAttribute('transform', setterAt(dim, 0));
    if (phaseRef.current) phaseRef.current.textContent = '';
  }, [writing, stepBins, bin, dim]);

  // Under reduced motion the next moment is written at once, without the setter's tour.
  const writeNext = () => {
    if (writing) return;
    if (still()) {
      setStep((s) => (s + 1) % CHUNK_STEPS);
      return;
    }
    setWriting(true);
  };

  const scrub = (next: number) => {
    setWriting(false);
    setStep(next);
  };

  const stageLabel = `Continuous action chunk: ${ACTION_DIMS.length} dimensions over ${CHUNK_STEPS} control steps, drawn as seven racks side by side, one per motion (${ACTION_DIMS.map((_, i) => motionGloss(i)).join(', ')}), each cut with ${BIN_COUNT} notches from ${VALUE_MIN} to ${VALUE_MAX}. At moment ${step + 1} every slider sits in the notch nearest its smooth command; the setter on the gantry stands over the ${gloss} rack, and the register at the front has popped one pin for each of the seven words, written one after another.`;

  const renderRun = (run: { group: string; parts: Array<Part | DetailPart> }, key: string) => {
    const body = run.parts.map((part, k) => {
      if (part.kind === 'slot' && part.group === 'knob') return <Line key={k} d={knobPointer(step / (CHUNK_STEPS - 1))} tone="hi" />;
      return <PartView key={k} part={part} />;
    });
    const slider = run.group.match(/^slider(\d)$/);
    if (slider) {
      const index = Number(slider[1]);
      return (
        <g
          key={key}
          ref={(node) => {
            sliderRefs.current[index] = node;
          }}
          transform={sliderAt(notchX(stepBins[index]))}
          data-motion={motionGloss(index)}
          data-word={stepBins[index]}
          data-selection={index === dim ? 'selected motion' : undefined}
        >
          {body}
        </g>
      );
    }
    const pin = run.group.match(/^pin(\d)$/);
    if (pin) {
      const index = Number(pin[1]);
      return (
        <g
          key={key}
          ref={(node) => {
            pinRefs.current[index] = node;
          }}
          transform={pinAt(1)}
          data-register-pin={index}
        >
          {body}
        </g>
      );
    }
    return <g key={key}>{body}</g>;
  };

  return (
    <InstrumentFigure
      figureId="action-tokenization"
      className={className}
      kicker="Action tokens"
      heading="Each arm movement becomes seven words a language model writes"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="at-step" value={`${step + 1} of ${CHUNK_STEPS}`}>
              Moment in the movement
            </ControlLabel>
            <input
              id="at-step"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={CHUNK_STEPS - 1}
              step={1}
              value={step}
              onChange={(e) => scrub(Number(e.target.value))}
              aria-label={`Control step, currently ${step} of ${CHUNK_STEPS - 1}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="start" high="finish" />
          </ControlField>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            aria-disabled={writing || undefined}
            onClick={writeNext}
            data-testid="tok-write"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {writing ? 'Writing the seven words' : 'Write the next moment'}
          </button>
        </>
      }
      adjust={
        <>
          <div role="group" aria-label="Action dimension" className="flex flex-wrap gap-1">
            {ACTION_DIMS.map((d, i) => (
              <button
                data-brand-control-id="control:selection"
                key={d.id}
                type="button"
                aria-pressed={i === dim}
                onClick={() => {
                  setWriting(false);
                  setDim(i);
                }}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {motionGloss(i)}
              </button>
            ))}
          </div>
          <div className="basis-full font-sans text-sm text-text-dim">
            All {BIN_COUNT} slots for {gloss}, from -1 to 1; the lit slot is this moment’s.
          </div>
          <svg
            data-testid="tok-bin-strip"
            viewBox={`0 0 ${WIDTH_STRIP} ${STRIP_H + 4}`}
            aria-hidden="true"
            focusable="false"
            className="block h-auto w-full basis-full"
          >
            {Array.from({ length: BIN_COUNT }, (_, i) => (
              <rect
                key={i}
                data-selection={i === bin ? 'assigned bin' : undefined}
                x={f(STRIP_LEFT + (i / BIN_COUNT) * STRIP_W)}
                y={2}
                width={f(STRIP_W / BIN_COUNT) + 0.3}
                height={STRIP_H}
                fill={i === bin ? highlight : reference}
                fillOpacity={i === bin ? 1 : 0.28}
              />
            ))}
          </svg>
          <InstrumentReset
            onClick={() => {
              setWriting(false);
              setStep(defaultStep);
              setDim(defaultDim);
            }}
          />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={writing ? 'The setter writes one rack at a time' : 'Scrub the moment, or write the next one'}
          readout={
            <>
              <span ref={phaseRef} data-tok-phase="" />
              At moment {step + 1}, the {gloss} nudge <span data-testid="tok-value-readout">{value.toFixed(3)}</span> lands in{' '}
              <span data-testid="tok-bin-readout">
                slot {bin} of {BIN_COUNT}
              </span>{' '}
              and is written as <span data-testid="tok-token-readout">word {bin}</span>
            </>
          }
          status="Illustrative: a made-up movement, not recorded robot data."
          data-testid="tok-stage-frame"
        >
          <IsoFigure width={WIDTH} height={HEIGHT} label={stageLabel} describedBy={descriptionId}>
            {BEFORE_RUNS.map((run, index) => renderRun(run, `before-${index}`))}
            <g ref={gantryRef} transform={gantryAt(notchX(bin))} data-testid="tok-gantry">
              {GANTRY_RUNS.map((run, index) =>
                run.group === 'setter' ? (
                  <g key={`setter-${index}`} ref={setterRef} transform={setterAt(dim, 0)} data-testid="tok-setter">
                    {run.parts.map((part, k) => (
                      <PartView key={k} part={part} />
                    ))}
                  </g>
                ) : (
                  renderRun(run, `gantry-${index}`)
                ),
              )}
            </g>
            {AFTER_RUNS.map((run, index) => renderRun(run, `after-${index}`))}
          </IsoFigure>
          <div className="mt-3 font-sans text-[12px] text-text-dim" data-testid="tok-detail-intro">
            Up close, the {gloss} rack: its slider sits in notch {bin}, and the needle marks the smooth command, {value.toFixed(3)}.
          </div>
          <IsoFigure
            width={DETAIL_WIDTH}
            height={DETAIL_HEIGHT}
            className="mt-1"
            label={`Binning detail for ${ACTION_DIMS[dim].label}: the value ${value.toFixed(3)} at step ${step} falls into bin ${bin} of 255 on a uniform grid of 256 bins per dimension. A close-up of the ${gloss} rack shows ${ZOOM_BINS} notches around it, the slider seated in slot ${bin} of 256, written as word ${bin}, and a needle at the exact value.`}
            describedBy={binDescriptionId}
          >
            {DETAIL_PARTS.map((part, k) => {
              if (part.kind === 'notch') {
                const assigned = part.index === selectedK;
                return (
                  <g key={k} data-notch={zoomStart + part.index} data-selection={assigned ? 'assigned bin' : undefined}>
                    <path className="iso-shade" data-shade="0" d={part.d} />
                    <Line d={part.d} tone="mid" />
                  </g>
                );
              }
              if (part.kind === 'slot' && part.group === 'detailSlider') {
                return (
                  <g key={k} data-testid="tok-detail-slider">
                    <Solid paths={detailSliderPaths.pawl} tone="hi" />
                    <Solid paths={detailSliderPaths.body} tone="hi" lit />
                    <Line d={detailSliderPaths.index} tone="hi" />
                  </g>
                );
              }
              if (part.kind === 'slot' && part.group === 'detailNeedle') {
                return (
                  <g key={k} data-testid="tok-detail-needle">
                    <Solid paths={needle.blade} tone="hi" />
                    <Line d={needle.tip} tone="hi" />
                  </g>
                );
              }
              return <PartView key={k} part={part} />;
            })}
          </IsoFigure>
          <div className="mt-3 font-sans text-[12px]">
            <div className="text-text-dim">The seven words for this moment, written one after another:</div>
            <ol data-testid="token-stream" className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {ACTION_DIMS.map((d, i) => (
                <li
                  key={d.id}
                  data-brand-surface-id="surface:flat"
                  data-selected={i === dim ? '' : undefined}
                  className={cx(
                    'inline-flex items-baseline gap-1.5',
                    i === dim && 'underline decoration-1 underline-offset-4',
                  )}
                >
                  <span className={i === dim ? 'text-text' : 'text-text-dim'}>{motionGloss(i)}</span>
                  <span className="text-text">word {stepBins[i]}</span>
                </li>
              ))}
            </ol>
          </div>
        </AnatomyStage>
      }
      caption="Chopping each motion into 256 levels lets a language model steer an arm by writing seven words per moment, one after another."
      method={
        <>
          <p>
            In the symbols robotics papers use, the seven motions are Δx, Δy and Δz (forward/back,
            left/right, up/down), Δroll, Δpitch and Δyaw (roll, tilt, turn) and grip (open/close).
            Each is a number on [{VALUE_MIN}, {VALUE_MAX}], cut into {BIN_COUNT} uniform bins, and
            each bin is one vocabulary token. Now: {ACTION_DIMS[dim].label} = {value.toFixed(3)} at
            step {step}, bin {bin} of {BIN_COUNT - 1}, token {token};{' '}
            <span data-testid="tok-error-readout">
              reconstructs to {center.toFixed(4)} (error {signed(error)})
            </span>
            .
          </p>
          <p data-testid="decode-order">
            {SEQUENTIAL_DECODES} sequential decodes per control step: token n+1 cannot start until
            token n has been emitted.
          </p>
          <p>
            A toy chunk with fixed [{VALUE_MIN}, {VALUE_MAX}] bounds and synthetic token labels, after
            the action tokenization of RT-1, RT-2 and OpenVLA; the token names are stand-ins, not any
            model’s real vocabulary. The racks are a schematic: one notch is one bin, and the close-up
            magnifies the {ZOOM_BINS} bins around the chosen one.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Sampled action value along the selected dimension"
            rowHeader="step"
            columns={[
              { header: 'value', numeric: true },
              { header: 'bin', numeric: true },
              { header: 'playhead', numeric: false },
            ]}
            rows={sampleRows}
            description={descriptionText}
          />
          <ChartDescription
            id={binDescriptionId}
            form="state"
            summary="Current bin assignment"
            description={`On the ${ACTION_DIMS[dim].label} axis the continuous action ${value.toFixed(3)} at step ${step} falls in bin ${bin} of ${BIN_COUNT - 1} and reconstructs to ${center.toFixed(4)} with quantization error ${signed(error)}; the ${BIN_COUNT}-bin strip is a uniform grid on [${VALUE_MIN}, ${VALUE_MAX}], not a learned codebook.`}
            states={[
              { label: 'dimension', value: ACTION_DIMS[dim].label },
              { label: 'step', value: String(step) },
              { label: 'action', value: value.toFixed(3) },
              { label: 'bin', value: `${bin} of ${BIN_COUNT - 1}` },
              { label: 'reconstructed', value: `${center.toFixed(4)} (${signed(error)})` },
            ]}
          />
        </>
      }
      source={`Toy movement with every nudge kept between ${VALUE_MIN} and ${VALUE_MAX}, and made-up word labels.`}
    />
  );
}
