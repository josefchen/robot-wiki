'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
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
 * visible monospace readouts, slider plus dimension buttons plus reset, ARIA
 * labels, fixed-height SVGs (no layout shift), no auto-playing motion.
 */
type ActionTokenizationProps = {
  /** Initial control step. Default 7 (mid-chunk). */
  defaultStep?: number;
  /** Initial dimension index. Default 0 (Δx). */
  defaultDim?: number;
  className?: string;
};

const WIDTH = 640;
const PAD = { left: 56, right: 16 };
const PLOT_W = WIDTH - PAD.left - PAD.right;

// Chunk chart geometry: one lane per dimension.
const LANE_H = 30;
const CHART_TOP = 10;
const CHART_BOTTOM = 26;
const CHART_H = CHART_TOP + ACTION_DIMS.length * LANE_H + CHART_BOTTOM;

// Binning detail geometry: full 256-bin strip plus a 15-bin zoom window.
const DETAIL_TOP = 12;
const STRIP_H = 22;
const ZOOM_GAP = 30;
const ZOOM_H = 34;
const DETAIL_BOTTOM = 30;
const DETAIL_H = DETAIL_TOP + STRIP_H + ZOOM_GAP + ZOOM_H + DETAIL_BOTTOM;
const ZOOM_BINS = 15;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function chunkX(t: number): number {
  return f(PAD.left + (t / (CHUNK_STEPS - 1)) * PLOT_W);
}

function laneValueY(dimIndex: number, value: number): number {
  const top = CHART_TOP + dimIndex * LANE_H;
  const u = (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return f(top + (1 - u) * (LANE_H - 8) + 4);
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
  const bw = binWidth();
  const zoomValueMin = VALUE_MIN + zoomStart * bw;
  const zoomX = (v: number) =>
    f(PAD.left + ((v - zoomValueMin) / (ZOOM_BINS * bw)) * PLOT_W);

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

  return (
    <div
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="at-step"
            className="flex items-baseline justify-between gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Control step
            <span className="font-mono text-xs normal-case tracking-normal text-text">
              t = {step} / {CHUNK_STEPS - 1}
            </span>
          </label>
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
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                className={cx(
                  'rounded-sm border px-2 py-1 font-mono text-xs transition-colors active:translate-y-[1px]',
                  i === dim
                    ? 'border-accent text-text'
                    : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => {
              setStep(defaultStep);
              setDim(defaultDim);
            }}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Continuous action chunk, one lane per dimension */}
      <svg
        viewBox={`0 0 ${WIDTH} ${CHART_H}`}
        role="img"
        aria-label={`Continuous action chunk: ${ACTION_DIMS.length} dimensions over ${CHUNK_STEPS} control steps. The marker at step ${step} selects the action vector being tokenized.`}
        aria-describedby={descriptionId}
        className="mt-4 block w-full"
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
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={f(top + LANE_H / 2)}
                y2={f(top + LANE_H / 2)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text
                x={PAD.left - 8}
                y={f(top + LANE_H / 2 + 3)}
                textAnchor="end"
                fill={selected ? 'var(--color-text)' : 'var(--color-text-dim)'}
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {d.label}
              </text>
              <polyline
                points={points}
                fill="none"
                stroke={selected ? 'var(--color-accent)' : 'var(--color-text-dim)'}
                strokeWidth={selected ? 1.8 : 1}
                opacity={selected ? 1 : 0.55}
              />
              <circle
                cx={chunkX(step)}
                cy={laneValueY(i, chunk[i][step])}
                r={selected ? 4 : 2.5}
                fill={selected ? 'var(--color-accent)' : 'var(--color-text-dim)'}
              />
            </g>
          );
        })}
        <line
          x1={chunkX(step)}
          x2={chunkX(step)}
          y1={CHART_TOP - 4}
          y2={CHART_TOP + ACTION_DIMS.length * LANE_H}
          stroke="var(--color-accent)"
          strokeWidth={1}
          opacity={0.6}
        />
        {[0, 5, 10, 15].map((t) => (
          <text
            key={t}
            x={chunkX(t)}
            y={CHART_H - 8}
            textAnchor={t === CHUNK_STEPS - 1 ? 'end' : 'middle'}
            fill="var(--color-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            t={t}
          </text>
        ))}
      </svg>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
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

      {/* Binning detail: 256-bin strip plus zoom window for the selected dim */}
      <svg
        viewBox={`0 0 ${WIDTH} ${DETAIL_H}`}
        role="img"
        aria-label={`Binning detail for ${ACTION_DIMS[dim].label}: the value ${value.toFixed(3)} at step ${step} falls into bin ${bin} of 255 on a uniform grid of 256 bins per dimension. A zoomed window shows individual bins around the assigned bin.`}
        aria-describedby={binDescriptionId}
        className="mt-2 block w-full"
      >
        <text
          x={PAD.left}
          y={8}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {ACTION_DIMS[dim].label} axis, 256 uniform bins on [{VALUE_MIN}, {VALUE_MAX}]
        </text>
        {/* Full strip: one rect per bin */}
        {Array.from({ length: BIN_COUNT }, (_, i) => (
          <rect
            key={i}
            x={f(PAD.left + (i / BIN_COUNT) * PLOT_W)}
            y={DETAIL_TOP}
            width={f(PLOT_W / BIN_COUNT) + 0.3}
            height={STRIP_H}
            fill={i === bin ? 'var(--color-accent)' : 'var(--color-surface-2)'}
            stroke="var(--color-border)"
            strokeWidth={0.25}
          />
        ))}
        {/* Exact continuous value marker on the full strip */}
        <line
          x1={f(PAD.left + ((value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * PLOT_W)}
          x2={f(PAD.left + ((value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * PLOT_W)}
          y1={DETAIL_TOP - 4}
          y2={DETAIL_TOP + STRIP_H + 4}
          stroke="var(--color-text)"
          strokeWidth={1.5}
        />
        <text
          x={PAD.left}
          y={DETAIL_TOP + STRIP_H + 14}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {VALUE_MIN}
        </text>
        <text
          x={PAD.left + PLOT_W}
          y={DETAIL_TOP + STRIP_H + 14}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {VALUE_MAX}
        </text>

        {/* Zoom window around the assigned bin */}
        {Array.from({ length: ZOOM_BINS }, (_, k) => {
          const i = zoomStart + k;
          const zx = zoomX(VALUE_MIN + i * bw);
          const zw = f(PLOT_W / ZOOM_BINS);
          return (
            <g key={i}>
              <rect
                x={zx}
                y={DETAIL_TOP + STRIP_H + ZOOM_GAP}
                width={zw}
                height={ZOOM_H}
                fill={i === bin ? 'var(--color-accent)' : 'var(--color-surface-2)'}
                stroke="var(--color-border)"
                strokeWidth={0.5}
              />
              {(k === 0 || i === bin || k === ZOOM_BINS - 1) && (
                <text
                  x={f(zx + zw / 2)}
                  y={DETAIL_TOP + STRIP_H + ZOOM_GAP + ZOOM_H + 14}
                  textAnchor={k === ZOOM_BINS - 1 ? 'end' : 'middle'}
                  fill={i === bin ? 'var(--color-text)' : 'var(--color-text-dim)'}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
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
          y1={DETAIL_TOP + STRIP_H + ZOOM_GAP - 5}
          y2={DETAIL_TOP + STRIP_H + ZOOM_GAP + ZOOM_H + 5}
          stroke="var(--color-text)"
          strokeWidth={1.5}
        />
        <text
          x={Math.min(Math.max(zoomX(value), PAD.left + 40), PAD.left + PLOT_W - 40)}
          y={DETAIL_TOP + STRIP_H + ZOOM_GAP - 8}
          textAnchor="middle"
          fill="var(--color-text)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {value.toFixed(3)}
        </text>
        {/* Bracket linking the full strip to the zoom window */}
        <line
          x1={f(PAD.left + (zoomStart / BIN_COUNT) * PLOT_W)}
          x2={zoomX(VALUE_MIN + zoomStart * bw)}
          y1={DETAIL_TOP + STRIP_H + 2}
          y2={DETAIL_TOP + STRIP_H + ZOOM_GAP - 2}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <line
          x1={f(PAD.left + ((zoomStart + ZOOM_BINS) / BIN_COUNT) * PLOT_W)}
          x2={zoomX(VALUE_MIN + (zoomStart + ZOOM_BINS) * bw)}
          y1={DETAIL_TOP + STRIP_H + 2}
          y2={DETAIL_TOP + STRIP_H + ZOOM_GAP - 2}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
      </svg>

      <ChartDescription
        id={binDescriptionId}
        className="mt-3"
        form="state"
        summary="Current bin assignment"
        description={`On the ${ACTION_DIMS[dim].label} axis the continuous action ${value.toFixed(3)} at step ${step} falls in bin ${bin} of ${BIN_COUNT - 1} and reconstructs to ${center.toFixed(4)} with quantization error ${error >= 0 ? '+' : ''}${error.toFixed(4)}; the ${BIN_COUNT}-bin strip is a uniform grid on [${VALUE_MIN}, ${VALUE_MAX}], not a learned codebook.`}
        states={[
          { label: 'dimension', value: ACTION_DIMS[dim].label },
          { label: 'step', value: String(step) },
          { label: 'action', value: value.toFixed(3) },
          { label: 'bin', value: `${bin} of ${BIN_COUNT - 1}` },
          {
            label: 'reconstructed',
            value: `${center.toFixed(4)} (${error >= 0 ? '+' : ''}${error.toFixed(4)})`,
          },
        ]}
      />

      {/* Serialized token stream for the selected control step */}
      <div className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          Serialized action tokens at t = {step}
        </p>
        <div data-testid="token-stream" className="mt-2 flex flex-wrap gap-1.5">
          {ACTION_DIMS.map((d, i) => (
            <span
              key={d.id}
              className={cx(
                'inline-flex items-baseline gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs',
                i === dim
                  ? 'border-accent text-text'
                  : 'border-border bg-surface-2 text-text-dim',
              )}
            >
              <span className="text-[10px] text-text-dim">{i + 1}</span>
              <span>{d.label}</span>
              <span className={i === dim ? 'text-accent' : 'text-text'}>
                {tokenForBin(stepBins[i])}
              </span>
            </span>
          ))}
        </div>
        <p data-testid="decode-order" className="mt-2 font-mono text-xs text-text-dim">
          {SEQUENTIAL_DECODES} sequential decodes per control step: token n+1
          cannot start until token n has been emitted.
        </p>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span data-testid="tok-value-readout" className="text-accent">
          {ACTION_DIMS[dim].label} = {value.toFixed(3)}
        </span>{' '}
        <span className="text-text-dim">→</span>{' '}
        <span data-testid="tok-bin-readout" className="text-accent">
          bin {bin} of {BIN_COUNT - 1}
        </span>{' '}
        <span className="text-text-dim">→</span>{' '}
        <span data-testid="tok-token-readout" className="text-accent">
          {token}
        </span>{' '}
        <span data-testid="tok-error-readout" className="text-text-dim">
          reconstructs to {center.toFixed(4)} (error {error >= 0 ? '+' : ''}
          {error.toFixed(4)})
        </span>
      </p>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Illustrative model: a smooth 7-dim action chunk in the normalized
        [-1, 1] range, binned exactly as RT-1 and OpenVLA bin real actions
        (256 uniform bins per dimension). One shared 256-token vocabulary
        serves every dimension; the position in the sequence carries the
        dimension. OpenVLA maps the bins onto the 256 least-frequent tokens
        of the LLaMA tokenizer, so each token above stands in for a real
        vocabulary entry, emitted like a word of text.
      </p>
    </div>
  );
}
