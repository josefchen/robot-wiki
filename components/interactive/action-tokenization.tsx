'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
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
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';
import { cx } from '@/lib/utils';

/**
 * ActionTokenization: how one moment of an arm movement becomes seven
 * words a language model writes, in RT-1 / RT-2 / OpenVLA-style policies.
 *
 * A deterministic 7-motion, 16-moment action chunk drives a drawn gripper.
 * The scrubber picks a moment; the gripper shows the selected motion as an
 * arrow, the list beside it glosses all seven motions in plain words, and
 * the strip underneath traces that motion from start to finish. The ruler
 * below places the selected nudge on the [-1, 1] range and zooms into the
 * 15 slots around it, and the chips under the stage are the seven words
 * for the moment, written one after another. The motion buttons and the
 * full 256-slot strip sit in "Adjust more"; the symbols (Δx, bin, <a120>),
 * the reconstruction error and the decode cost sit in "How this was made".
 *
 * Interactive contract: deterministic render (fixed trajectories, no PRNG),
 * visible readouts, one visible slider, motion buttons and reset in the
 * fold, ARIA labels, fixed-height SVGs (no layout shift), no auto-playing
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

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

// Gripper stage: the drawn hand on the left, the seven motions listed on
// the right, and the selected motion traced from start to finish below.
const HAND = { x: 84, y: 78 };
const LIST_X = 172;
const LIST_TOP = 18;
const LIST_PITCH = 20;
const TRACE_LEFT = 24;
const TRACE_RIGHT = 316;
const TRACE_LABEL_Y = 172;
const TRACE_TOP = 180;
const TRACE_BOTTOM = 206;
const TRACE_ENDS_Y = 224;
const HAND_H = 232;

function traceX(t: number): number {
  return f(TRACE_LEFT + (t / (CHUNK_STEPS - 1)) * (TRACE_RIGHT - TRACE_LEFT));
}

function traceY(value: number): number {
  const u = (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return f(TRACE_BOTTOM - u * (TRACE_BOTTOM - TRACE_TOP));
}

// Ruler stage: the note, the [-1, 1] ruler, and the zoom into 15 slots.
const RULER_LEFT = 20;
const RULER_RIGHT = 320;
const RULER_W = RULER_RIGHT - RULER_LEFT;
const RULER_Y = 96;
const ZOOM_LEFT = 10;
const ZOOM_RIGHT = 330;
const ZOOM_W = ZOOM_RIGHT - ZOOM_LEFT;
const ZOOM_TOP = 132;
const ZOOM_H = 26;
const RULER_H = ZOOM_TOP + ZOOM_H + 24;
const ZOOM_BINS = 15;
/** Zoom-window slots a label needs between it and the assigned slot's label. */
const LABEL_CLEARANCE = 4;

// The full 256-slot strip in "Adjust more".
const STRIP_LEFT = 10;
const STRIP_W = 320;
const STRIP_H = 16;

function rulerX(v: number): number {
  return f(RULER_LEFT + ((v - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * RULER_W);
}

/** An arrow along `points`, with its head on the last segment. */
function Arrow({ points, colour }: { points: readonly [number, number][]; colour: string }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`).join(' ');
  const [x1, y1] = points[points.length - 2];
  const [x2, y2] = points[points.length - 1];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = 7;
  const half = 4;
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  return (
    <g data-testid="tok-motion-arrow">
      <path d={d} fill="none" stroke={colour} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" />
      <polygon
        points={`${f(x2)},${f(y2)} ${f(bx - uy * half)},${f(by + ux * half)} ${f(bx + uy * half)},${f(by - ux * half)}`}
        fill={colour}
      />
    </g>
  );
}

/** The selected motion drawn on the hand, its length set by the nudge. */
function motionArrow(dimId: string, value: number): [number, number][] {
  const sign = value >= 0 ? 1 : -1;
  const length = Math.max(10, 46 * Math.abs(value));
  const below = HAND.y + 46;
  switch (dimId) {
    case 'x':
      return [
        [HAND.x, below],
        [HAND.x + sign * length, below],
      ];
    case 'y':
      return [
        [HAND.x, below],
        [HAND.x + sign * length * 0.7, below - sign * length * 0.55],
      ];
    case 'z':
      return [
        [HAND.x + 52, HAND.y],
        [HAND.x + 52, HAND.y - sign * length],
      ];
    case 'gripper':
      return [
        [HAND.x + 28, HAND.y + 30],
        [HAND.x + 28 + sign * Math.max(8, length / 2), HAND.y + 30],
      ];
    default: {
      // Rotations: an arc around the hand, flattened to show the axis.
      const [rx, ry] = dimId === 'roll' ? [40, 40] : dimId === 'pitch' ? [14, 40] : [40, 14];
      const sweep = sign * Math.max(0.35, Math.abs(value) * Math.PI);
      const start = -Math.PI / 2;
      return Array.from({ length: 13 }, (_, i) => {
        const angle = start + (sweep * i) / 12;
        return [HAND.x + rx * Math.cos(angle), HAND.y + ry * Math.sin(angle)] as [number, number];
      });
    }
  }
}

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
  const chunk = useMemo(() => generateActionChunk(), []);

  const value = chunk[dim][step];
  const bin = binIndex(value);
  const center = binCenter(bin);
  const error = value - center;
  const token = tokenForBin(bin);
  const stepBins = chunk.map((row) => binIndex(row[step]));
  const gloss = motionGloss(dim);

  // Zoom window: ZOOM_BINS consecutive slots centered on the current slot.
  const zoomStart = Math.min(BIN_COUNT - ZOOM_BINS, Math.max(0, bin - Math.floor(ZOOM_BINS / 2)));
  const selectedK = bin - zoomStart;
  const bw = binWidth();
  const zoomValueMin = VALUE_MIN + zoomStart * bw;
  const zoomX = (v: number) => f(ZOOM_LEFT + ((v - zoomValueMin) / (ZOOM_BINS * bw)) * ZOOM_W);
  const zoomBinW = f(ZOOM_W / ZOOM_BINS);

  // Sampled along the selected motion, the same polyline the trace draws.
  // Endpoints are t = 0 and t = 15, and the playhead row moves with the
  // scrubber.
  const sampleTicks = [...new Set([0, 3, 6, 9, 12, CHUNK_STEPS - 1, step])].sort((a, b) => a - b);
  const sampleRows = sampleTicks.map((t) => ({
    label: `${t}`,
    values: [chunk[dim][t].toFixed(3), `${binIndex(chunk[dim][t])}`, t === step ? 'playhead' : 'off'],
  }));

  const descriptionText = `Along the ${gloss} (${ACTION_DIMS[dim].label}) motion of the ${CHUNK_STEPS}-step action chunk, the continuous command runs from ${chunk[dim][0].toFixed(3)} at t = 0 to ${chunk[dim][CHUNK_STEPS - 1].toFixed(3)} at t = ${CHUNK_STEPS - 1}, and at the current step ${step} the value ${value.toFixed(3)} falls in bin ${bin} of ${BIN_COUNT - 1}; the dashed rule under the trace is the motion's zero line, the arrow on the drawn gripper shows that nudge, and the chunk is a fixed synthetic example rather than measured robot data.`;

  const action = roleColour('action');
  const highlight = roleColour('highlight');
  const reference = roleColour('reference');
  const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`;
  const small = Math.abs(value) < 0.1;
  const tracePoints = chunk[dim].map((v, t) => `${traceX(t)},${traceY(v)}`).join(' ');

  // The note sits above the ruler; its leader drops to the nudge's mark.
  const noteLines = [`This ${small ? 'small ' : ''}nudge lands`, `in slot ${bin} of ${BIN_COUNT},`, `written as word ${bin}`];
  const noteY = f(TEXT_H * CHART_TYPE.ascent + 8);
  const markX = rulerX(value);
  const noteFrom: [number, number] = [
    Math.min(Math.max(markX, 40), WIDTH - 40),
    f(noteY + TEXT_H * 1.25 * (noteLines.length - 1) + TEXT_H * 0.4),
  ];

  return (
    <InstrumentFigure
      figureId="action-tokenization"
      className={className}
      kicker="Action tokens"
      heading="Each arm movement becomes seven words a language model writes"
      controls={
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
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label={`Control step, currently ${step} of ${CHUNK_STEPS - 1}`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
          <SliderEnds low="start" high="finish" />
        </ControlField>
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
                onClick={() => setDim(i)}
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
            viewBox={`0 0 ${WIDTH} ${STRIP_H + 4}`}
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
              setStep(defaultStep);
              setDim(defaultDim);
            }}
          />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                At moment {step + 1}, the {gloss} nudge{' '}
                <span data-testid="tok-value-readout" style={{ color: action }}>
                  {value.toFixed(3)}
                </span>{' '}
                lands in{' '}
                <span data-testid="tok-bin-readout" style={{ color: highlight }}>
                  slot {bin} of {BIN_COUNT}
                </span>{' '}
                and is written as{' '}
                <span data-testid="tok-token-readout" style={{ color: action }}>
                  word {bin}
                </span>
              </StageReadout>
              <div className="basis-full font-sans text-sm">
                <div className="text-text-dim">The seven words for this moment, written one after another:</div>
                <ol data-testid="token-stream" className="mt-1.5 flex flex-wrap gap-1.5">
                  {ACTION_DIMS.map((d, i) => (
                    <li
                      key={d.id}
                      data-brand-surface-id="surface:flat"
                      className={cx(
                        'inline-flex items-baseline gap-1.5 border px-2 py-0.5',
                        i === dim ? 'border-highlight' : 'border-border-strong',
                      )}
                    >
                      <span className="text-text">{motionGloss(i)}</span>
                      <span style={{ color: action }}>word {stepBins[i]}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <StageStatus>Illustrative: a made-up movement, not recorded robot data.</StageStatus>
            </>
          }
        >
          {/* The gripper, its seven motions, and the selected motion over time */}
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HAND_H}`}
            aria-label={`Continuous action chunk: ${ACTION_DIMS.length} dimensions over ${CHUNK_STEPS} control steps, drawn as a gripper with its ${ACTION_DIMS.length} motions. The marker at step ${step} selects the action vector being tokenized.`}
            aria-describedby={descriptionId}
          >
            <g data-testid="tok-gripper" fill="none" stroke={CHART_STRUCTURE.label} strokeWidth={2.5} strokeLinejoin="round">
              <rect x={HAND.x - 8} y={HAND.y - 50} width={16} height={18} />
              <rect x={HAND.x - 32} y={HAND.y - 32} width={64} height={12} rx={3} />
              <path d={`M${HAND.x - 26} ${HAND.y - 20} V${HAND.y + 26} l6 6`} strokeLinecap="round" />
              <path d={`M${HAND.x + 26} ${HAND.y - 20} V${HAND.y + 26} l-6 6`} strokeLinecap="round" />
            </g>
            <Arrow points={motionArrow(ACTION_DIMS[dim].id, value)} colour={action} />
            {ACTION_DIMS.map((d, i) => {
              const selected = i === dim;
              return (
                <text
                  key={d.id}
                  data-selection={selected ? 'selected motion' : undefined}
                  x={LIST_X}
                  y={LIST_TOP + i * LIST_PITCH}
                  dominantBaseline="middle"
                  fontSize={CHART_TYPE.labelPx}
                  fontWeight={selected ? 600 : 400}
                  fill={selected ? highlight : CHART_STRUCTURE.labelSecondary}
                >
                  {motionGloss(i)}
                </text>
              );
            })}
            <text x={TRACE_LEFT} y={TRACE_LABEL_Y} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
              {gloss} over the movement
            </text>
            <line
              x1={TRACE_LEFT}
              x2={TRACE_RIGHT}
              y1={traceY(0)}
              y2={traceY(0)}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray="2 3"
              opacity={CHART_STRUCTURE.axesOpacity}
            />
            <polyline points={tracePoints} fill="none" stroke={action} strokeWidth={CHART_STROKE.trace} />
            <line
              x1={traceX(step)}
              x2={traceX(step)}
              y1={TRACE_TOP - 2}
              y2={TRACE_BOTTOM + 2}
              stroke={highlight}
              strokeWidth={CHART_STROKE.structure}
              opacity={0.8}
            />
            <circle
              data-selection="current coordinate"
              cx={traceX(step)}
              cy={traceY(value)}
              r={3.5}
              fill={highlight}
            />
            <text x={TRACE_LEFT} y={TRACE_ENDS_Y} fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              start
            </text>
            <text
              x={TRACE_RIGHT}
              y={TRACE_ENDS_Y}
              textAnchor="end"
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              finish
            </text>
          </PlotStage>

          {/* One ruler for the selected nudge, zoomed into the slots around it */}
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${RULER_H}`}
            aria-label={`Binning detail for ${ACTION_DIMS[dim].label}: the value ${value.toFixed(3)} at step ${step} falls into bin ${bin} of 255 on a uniform grid of 256 bins per dimension. A zoomed window shows individual bins around the assigned bin.`}
            aria-describedby={binDescriptionId}
            className="mt-3"
          >
            <line
              x1={RULER_LEFT}
              x2={RULER_RIGHT}
              y1={RULER_Y}
              y2={RULER_Y}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure * 2}
            />
            {[VALUE_MIN, 0, VALUE_MAX].map((tick) => (
              <g key={tick}>
                <line
                  x1={rulerX(tick)}
                  x2={rulerX(tick)}
                  y1={RULER_Y - 4}
                  y2={RULER_Y + 4}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                />
                <text
                  data-scene-tick=""
                  x={tick === VALUE_MIN ? RULER_LEFT : tick === VALUE_MAX ? RULER_RIGHT : rulerX(tick)}
                  y={RULER_Y + 4 + CHART_TYPE.tickPx}
                  textAnchor={tick === VALUE_MIN ? 'start' : tick === VALUE_MAX ? 'end' : 'middle'}
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {tick}
                </text>
              </g>
            ))}
            {/* Bracket linking the ruler to the zoom window */}
            {[zoomStart, zoomStart + ZOOM_BINS].map((edge, side) => (
              <line
                key={edge}
                x1={f(RULER_LEFT + (edge / BIN_COUNT) * RULER_W)}
                x2={side === 0 ? ZOOM_LEFT : ZOOM_RIGHT}
                y1={RULER_Y + 2}
                y2={ZOOM_TOP - 2}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
            ))}
            {Array.from({ length: ZOOM_BINS }, (_, k) => {
              const i = zoomStart + k;
              const zx = zoomX(VALUE_MIN + i * bw);
              const isBin = i === bin;
              const edge = k === 0 || k === ZOOM_BINS - 1;
              const showLabel = isBin || (edge && Math.abs(k - selectedK) >= LABEL_CLEARANCE);
              const anchor = k === 0 ? 'start' : k === ZOOM_BINS - 1 ? 'end' : 'middle';
              const labelX = k === 0 ? zx : k === ZOOM_BINS - 1 ? f(zx + zoomBinW) : f(zx + zoomBinW / 2);
              return (
                <g key={i}>
                  <rect
                    data-selection={isBin ? 'assigned bin' : undefined}
                    x={zx}
                    y={ZOOM_TOP}
                    width={zoomBinW}
                    height={ZOOM_H}
                    fill={isBin ? highlight : reference}
                    fillOpacity={isBin ? 1 : 0.28}
                    stroke={CHART_STRUCTURE.axes}
                    strokeWidth={0.5}
                    strokeOpacity={CHART_STRUCTURE.axesOpacity}
                  />
                  {showLabel && (
                    <text
                      data-scene-tick=""
                      x={labelX}
                      y={ZOOM_TOP + ZOOM_H + 16}
                      textAnchor={anchor}
                      fontSize={CHART_TYPE.tickPx}
                      fill={isBin ? highlight : CHART_STRUCTURE.labelSecondary}
                    >
                      slot {i}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Exact nudge on the ruler and inside the zoom window */}
            <line
              x1={markX}
              x2={markX}
              y1={RULER_Y - 7}
              y2={RULER_Y + 7}
              stroke={action}
              strokeWidth={CHART_STROKE.trace}
            />
            <line
              x1={zoomX(value)}
              x2={zoomX(value)}
              y1={ZOOM_TOP - 3}
              y2={ZOOM_TOP + ZOOM_H + 3}
              stroke={action}
              strokeWidth={CHART_STROKE.reference}
            />
            <StageAnnotation x={8} y={noteY} lines={noteLines} from={noteFrom} target={[markX, RULER_Y - 9]} />
          </PlotStage>
        </FigureStage>
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
            model’s real vocabulary.
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
