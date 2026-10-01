'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  ChartAxes,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
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
import { cx } from '@/lib/utils';

/**
 * ActionTokenization: how a continuous action vector becomes discrete
 * vocabulary tokens in RT-1 / RT-2 / OpenVLA-style policies.
 *
 * A deterministic 7-dim, 16-timestep action chunk is rendered as continuous
 * traces. Scrubbing the control step picks one action vector; the detail
 * view shows the selected dimension's value falling into one of 256 uniform
 * bins, and the token stream shows the full vector serialized as vocabulary
 * tokens, emitted one autoregressive decode per dimension. The decode-order
 * row makes the throughput cost visible: 7 sequential passes per step.
 *
 * Interactive contract: deterministic render (fixed trajectories, no PRNG),
 * visible readouts, slider plus dimension buttons plus reset, ARIA labels,
 * fixed-height SVGs (no layout shift), no auto-playing motion.
 */
type ActionTokenizationProps = {
  /** Initial control step. Default 7 (mid-chunk). */
  defaultStep?: number;
  /** Initial dimension index. Default 0 (Δx). */
  defaultDim?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;

// Chunk chart geometry: one lane per dimension, lane names on the left.
const CHUNK_LEFT = 52;
const CHUNK_RIGHT = 327;
const LANE_H = 22;
const CHART_TOP = 6;
const LANES_BOTTOM = CHART_TOP + ACTION_DIMS.length * LANE_H;
const CHART_H = LANES_BOTTOM + 46;

// Binning detail geometry: full 256-bin strip plus a 15-bin zoom window.
const DETAIL_LEFT = 10;
const DETAIL_RIGHT = 330;
const DETAIL_W = DETAIL_RIGHT - DETAIL_LEFT;
const NOTE_Y = 18;
const STRIP_TOP = 27;
const STRIP_H = 16;
const ZOOM_TOP = 85;
const ZOOM_H = 30;
const DETAIL_H = ZOOM_TOP + ZOOM_H + 26;
const ZOOM_BINS = 15;
/** Zoom-window bins a label needs between it and the assigned bin's label. */
const LABEL_CLEARANCE = 3;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function chunkX(t: number): number {
  return f(CHUNK_LEFT + (t / (CHUNK_STEPS - 1)) * (CHUNK_RIGHT - CHUNK_LEFT));
}

function laneValueY(dimIndex: number, value: number): number {
  const top = CHART_TOP + dimIndex * LANE_H;
  const u = (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return f(top + (1 - u) * (LANE_H - 6) + 3);
}

function stripX(v: number): number {
  return f(DETAIL_LEFT + ((v - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * DETAIL_W);
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

  // Zoom window: ZOOM_BINS consecutive bins centered on the current bin.
  const zoomStart = Math.min(
    BIN_COUNT - ZOOM_BINS,
    Math.max(0, bin - Math.floor(ZOOM_BINS / 2)),
  );
  const selectedK = bin - zoomStart;
  const bw = binWidth();
  const zoomValueMin = VALUE_MIN + zoomStart * bw;
  const zoomX = (v: number) =>
    f(DETAIL_LEFT + ((v - zoomValueMin) / (ZOOM_BINS * bw)) * DETAIL_W);
  const zoomBinW = f(DETAIL_W / ZOOM_BINS);

  // Sampled along the selected lane, the same polyline the traces root
  // draws. Endpoints are t = 0 and t = 15, matching the axis ticks, and
  // the playhead column moves with the step slider.
  const sampleTicks = [...new Set([0, 3, 6, 9, 12, CHUNK_STEPS - 1, step])].sort(
    (a, b) => a - b,
  );
  const sampleRows = sampleTicks.map((t) => ({
    label: `${t}`,
    values: [
      chunk[dim][t].toFixed(3),
      `${binIndex(chunk[dim][t])}`,
      t === step ? 'playhead' : 'off',
    ],
  }));

  const descriptionText = `Along the ${ACTION_DIMS[dim].label} action lane of the ${CHUNK_STEPS}-step chunk, the continuous command runs from ${chunk[dim][0].toFixed(3)} at t = 0 to ${chunk[dim][CHUNK_STEPS - 1].toFixed(3)} at t = ${CHUNK_STEPS - 1}, and at the current step ${step} the value ${value.toFixed(3)} falls in bin ${bin} of ${BIN_COUNT - 1}; the ${ACTION_DIMS.length} dashed rules are each dimension's zero line, and the chunk is a fixed synthetic example rather than measured robot data.`;

  const action = roleColour('action');
  const highlight = roleColour('highlight');
  const reference = roleColour('reference');
  const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`;

  return (
    <InstrumentFigure
      figureId="action-tokenization"
      className={className}
      heading="From action chunk to tokens"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor="at-step"
              value={`t = ${step} / ${CHUNK_STEPS - 1}`}
            >
              Control step
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
          </ControlField>
          <div
            role="group"
            aria-label="Action dimension"
            className="flex flex-wrap gap-1"
          >
            {ACTION_DIMS.map((d, i) => (
              <button
                data-brand-control-id="control:selection"
                key={d.id}
                type="button"
                aria-pressed={i === dim}
                onClick={() => setDim(i)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {d.label}
              </button>
            ))}
          </div>
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
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="action" mark="line" />}>continuous action</LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="bar" />}>selected step and bin</LegendItem>
                <LegendItem swatch={<LegendSwatch role="reference" mark="band" />}>uniform bins</LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span data-testid="tok-value-readout" style={{ color: action }}>
                  {ACTION_DIMS[dim].label} = {value.toFixed(3)}
                </span>{' '}
                <span className="text-text-dim">→</span>{' '}
                <span data-testid="tok-bin-readout" style={{ color: highlight }}>
                  bin {bin} of {BIN_COUNT - 1}
                </span>{' '}
                <span className="text-text-dim">→</span>{' '}
                <span data-testid="tok-token-readout" style={{ color: action }}>
                  {token}
                </span>{' '}
                <span data-testid="tok-error-readout" className="text-text-dim">
                  reconstructs to {center.toFixed(4)} (error {signed(error)})
                </span>
              </InstrumentReadout>
              <div className="basis-full font-sans text-[13px]">
                <div className="text-text-dim">Tokens at t = {step}</div>
                <div data-testid="token-stream" className="mt-1.5 flex flex-wrap gap-1.5">
                  {ACTION_DIMS.map((d, i) => (
                    <span
                      key={d.id}
                      data-brand-surface-id="surface:flat"
                      className={cx(
                        'inline-flex items-baseline gap-1.5 border px-2 py-0.5',
                        i === dim ? 'border-highlight' : 'border-border-strong',
                      )}
                    >
                      <span className="text-xs text-text-dim">{i + 1}</span>
                      <span className="text-text">{d.label}</span>
                      <span style={{ color: action }}>{tokenForBin(stepBins[i])}</span>
                    </span>
                  ))}
                </div>
                <div data-testid="decode-order" className="mt-1.5 text-text-dim">
                  {SEQUENTIAL_DECODES} sequential decodes per control step: token n+1
                  cannot start until token n has been emitted.
                </div>
              </div>
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
                  {
                    label: 'reconstructed',
                    value: `${center.toFixed(4)} (${signed(error)})`,
                  },
                ]}
              />
            </>
          }
        >
          {/* Continuous action chunk, one lane per dimension */}
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${CHART_H}`}
            aria-label={`Continuous action chunk: ${ACTION_DIMS.length} dimensions over ${CHUNK_STEPS} control steps. The marker at step ${step} selects the action vector being tokenized.`}
            aria-describedby={descriptionId}
          >
            {ACTION_DIMS.map((d, i) => {
              const top = CHART_TOP + i * LANE_H;
              const points = chunk[i]
                .map((v, t) => `${chunkX(t)},${laneValueY(i, v)}`)
                .join(' ');
              const selected = i === dim;
              return (
                <g key={d.id}>
                  <line
                    x1={CHUNK_LEFT}
                    x2={CHUNK_RIGHT}
                    y1={f(top + LANE_H / 2)}
                    y2={f(top + LANE_H / 2)}
                    stroke={CHART_STRUCTURE.axes}
                    strokeWidth={CHART_STROKE.structure}
                    strokeDasharray="2 3"
                    opacity={CHART_STRUCTURE.axesOpacity}
                  />
                  <text
                    data-scene-tick=""
                    x={CHUNK_LEFT - CHART_STROKE.tickLength}
                    y={f(top + LANE_H / 2)}
                    dominantBaseline="middle"
                    textAnchor="end"
                    fontSize={CHART_TYPE.tickPx}
                    fill={selected ? highlight : CHART_STRUCTURE.labelSecondary}
                  >
                    {d.label}
                  </text>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={action}
                    strokeWidth={selected ? CHART_STROKE.trace : 1}
                    opacity={selected ? 1 : 0.55}
                  />
                  <circle
                    data-selection={selected ? 'current coordinate' : undefined}
                    cx={chunkX(step)}
                    cy={laneValueY(i, chunk[i][step])}
                    r={selected ? 3.5 : 2}
                    fill={selected ? highlight : action}
                  />
                </g>
              );
            })}
            <line
              x1={chunkX(step)}
              x2={chunkX(step)}
              y1={CHART_TOP - 2}
              y2={LANES_BOTTOM}
              stroke={highlight}
              strokeWidth={CHART_STROKE.structure}
              opacity={0.8}
            />
            <ChartAxes
              plot={{ left: CHUNK_LEFT, right: CHUNK_RIGHT, top: CHART_TOP, bottom: LANES_BOTTOM }}
              x={chunkX}
              y={(v) => v}
              xTicks={[0, 5, 10, 15]}
              xLabel="control step t"
              grid={false}
              yAxis={false}
            />
          </PlotStage>

          {/* Binning detail: 256-bin strip plus zoom window for the selected
              dim. The strip rects come first, so the nth rect is bin n. */}
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${DETAIL_H}`}
            aria-label={`Binning detail for ${ACTION_DIMS[dim].label}: the value ${value.toFixed(3)} at step ${step} falls into bin ${bin} of 255 on a uniform grid of 256 bins per dimension. A zoomed window shows individual bins around the assigned bin.`}
            aria-describedby={binDescriptionId}
            className="mt-3"
          >
            <text
              data-scene-note=""
              x={DETAIL_LEFT}
              y={NOTE_Y}
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              {ACTION_DIMS[dim].label} axis, 256 uniform bins on [{VALUE_MIN}, {VALUE_MAX}]
            </text>
            {Array.from({ length: BIN_COUNT }, (_, i) => (
              <rect
                key={i}
                data-selection={i === bin ? 'assigned bin' : undefined}
                x={f(DETAIL_LEFT + (i / BIN_COUNT) * DETAIL_W)}
                y={STRIP_TOP}
                width={f(DETAIL_W / BIN_COUNT) + 0.3}
                height={STRIP_H}
                fill={i === bin ? highlight : reference}
                fillOpacity={i === bin ? 1 : 0.28}
              />
            ))}
            {/* Exact continuous value marker on the full strip */}
            <line
              x1={stripX(value)}
              x2={stripX(value)}
              y1={STRIP_TOP - 3}
              y2={STRIP_TOP + STRIP_H + 3}
              stroke={action}
              strokeWidth={CHART_STROKE.reference}
            />
            {/* Bracket linking the full strip to the zoom window */}
            {[zoomStart, zoomStart + ZOOM_BINS].map((edge, side) => (
              <line
                key={edge}
                x1={f(DETAIL_LEFT + (edge / BIN_COUNT) * DETAIL_W)}
                x2={side === 0 ? DETAIL_LEFT : DETAIL_RIGHT}
                y1={STRIP_TOP + STRIP_H + 2}
                y2={ZOOM_TOP - 2}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
            ))}
            {/* Zoom window around the assigned bin */}
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
                      bin {i}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Exact value marker inside the zoom window */}
            <line
              x1={zoomX(value)}
              x2={zoomX(value)}
              y1={ZOOM_TOP - 3}
              y2={ZOOM_TOP + ZOOM_H + 3}
              stroke={action}
              strokeWidth={CHART_STROKE.reference}
            />
            <text
              x={Math.min(Math.max(zoomX(value), DETAIL_LEFT + 28), DETAIL_RIGHT - 28)}
              y={ZOOM_TOP - 8}
              textAnchor="middle"
              fontSize={CHART_TYPE.labelPx}
              fill={action}
            >
              {value.toFixed(3)}
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="Each control step's seven coordinates fall into 256 uniform bins and leave the model as seven sequential tokens."
      source={`Illustrative toy chunk with fixed [${VALUE_MIN}, ${VALUE_MAX}] bounds and synthetic token labels.`}
    />
  );
}
