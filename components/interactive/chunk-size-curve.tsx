'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  LegendItem,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  ChartAxes,
  DirectLabel,
  LegendSwatch,
  PointMarker,
  roleColour,
  CHART_STROKE,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import {
  ACT_CHUNK_ANCHORS,
  MAX_CHUNK,
  MIN_CHUNK,
  decisionsPerEpisode,
  successAtChunkSize,
} from '@/lib/chunk-size';

/**
 * ChunkSizeCurve: the ACT chunk-size ablation as a live dial.
 *
 * One slider (k = 1..400) moves along the success-rate curve. The two
 * measured anchors (1% at k=1, 44% at k=100) are drawn as solid points;
 * the region past k=100 is dashed because the paper reports only a slight,
 * unquantified taper there. A second readout shows closed-loop decisions
 * per episode (episode length / k), the quantity chunking actually shrinks.
 *
 * Interactive contract: deterministic initial render, visible readouts,
 * reset control, native keyboard-accessible slider with an aria-label,
 * fixed-height chart (no layout shift), no auto-playing motion.
 */
type ChunkSizeCurveProps = {
  /** Initial chunk size. Default 100 (the published ACT configuration). */
  defaultChunkSize?: number;
  /** Episode length in control steps for the decisions readout. Default 400 (8 s at 50 Hz). */
  episodeSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 198;
const PAD = { top: 30, right: 18, bottom: 46, left: 40 };

/** Y axis tops out at 50% so the 44% peak uses most of the plot. */
const MAX_SUCCESS = 0.5;

/**
 * The plot scale, exported so the source/render parity gate can recompute
 * expected user-unit coordinates from the same constants the chart uses
 * (VAL-B2-VIZ-013). Pure: no hooks, no state.
 */
export function chunkScaleX(k: number): number {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  return Number((PAD.left + ((k - MIN_CHUNK) / (MAX_CHUNK - MIN_CHUNK)) * plotWidth).toFixed(2));
}

export function chunkScaleY(success: number): number {
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  return Number((HEIGHT - PAD.bottom - (success / MAX_SUCCESS) * plotHeight).toFixed(2));
}

const PLOT = {
  left: PAD.left,
  right: WIDTH - PAD.right,
  top: PAD.top,
  bottom: HEIGHT - PAD.bottom,
};

function formatPercent(value: number): string {
  const percent = value * 100;
  const needsDecimal = percent < 10 && !Number.isInteger(percent);
  return `${percent.toFixed(needsDecimal ? 1 : 0)}%`;
}

export function ChunkSizeCurve({
  defaultChunkSize = 100,
  episodeSteps = 400,
  className,
}: ChunkSizeCurveProps) {
  const descriptionId = `${useId()}-csc-description`;
  const [chunkSize, setChunkSize] = useState(defaultChunkSize);

  const success = successAtChunkSize(chunkSize);
  const decisions = decisionsPerEpisode(episodeSteps, chunkSize);
  const peakK = ACT_CHUNK_ANCHORS.at(-1)?.k ?? 100;

  const { risePath, taperPath, marker, anchors } = useMemo(() => {
    const rise: string[] = [];
    for (let k = MIN_CHUNK; k <= peakK; k += 1) {
      rise.push(`${k === MIN_CHUNK ? 'M' : 'L'}${chunkScaleX(k)},${chunkScaleY(successAtChunkSize(k))}`);
    }
    const taper: string[] = [`M${chunkScaleX(peakK)},${chunkScaleY(successAtChunkSize(peakK))}`];
    for (let k = peakK + 5; k <= MAX_CHUNK; k += 5) {
      taper.push(`L${chunkScaleX(k)},${chunkScaleY(successAtChunkSize(k))}`);
    }
    return {
      risePath: rise.join(' '),
      taperPath: taper.join(' '),
      marker: { cx: chunkScaleX(chunkSize), cy: chunkScaleY(success) },
      anchors: ACT_CHUNK_ANCHORS.map((a) => ({
        ...a,
        cx: chunkScaleX(a.k),
        cy: chunkScaleY(a.success),
      })),
    };
  }, [chunkSize, success, peakK]);

  // Sampled from successAtChunkSize, the same function the path is drawn
  // from; the provenance column carries the dashed region's qualification
  // into the table rather than leaving it to the picture.
  const sampleRows = useMemo(() => {
    const measuredK = new Set(ACT_CHUNK_ANCHORS.map((a) => a.k));
    return [1, 25, 50, 100, 200, 300, 400].map((k) => ({
      label: `${k}`,
      values: [
        formatPercent(successAtChunkSize(k)),
        `${decisionsPerEpisode(episodeSteps, k)}`,
        measuredK.has(k) ? 'measured' : k < peakK ? 'interpolated' : 'past the measured range',
        k === chunkSize ? 'playhead' : 'off',
      ],
    }));
  }, [chunkSize, episodeSteps, peakK]);

  const descriptionText = `Task success rises from 1% at chunk size k = 1 to the measured 44% peak at k = 100, and at the current k = ${chunkSize} the curve reads ${formatPercent(
    success,
  )} success against ${decisions} closed-loop ${
    decisions === 1 ? 'decision' : 'decisions'
  } per ${episodeSteps}-step episode; the dashed region past k = 100 is interpolated beyond the measured ACT ablation, which reports a slight decline at k = 200 and k = 400 without exact numbers.`;

  function reset() {
    setChunkSize(defaultChunkSize);
  }

  const value = roleColour('value');

  return (
    <InstrumentFigure
      figureId="chunk-size-curve"
      className={className}
      heading="Chunk size and task success"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="csc-chunk-size" value={`k = ${chunkSize}`}>
              Chunk size
            </ControlLabel>
            <input
              id="csc-chunk-size"
              type="range"
              data-brand-control-id="control:input"
              min={MIN_CHUNK}
              max={MAX_CHUNK}
              step={1}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              aria-label={`Chunk size k, currently ${chunkSize}`}
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
                <LegendItem series="measured-rise" swatch={<LegendSwatch role="value" mark="line" />}>
                  measured rise, k = 1 to 100
                </LegendItem>
                <LegendItem series="illustrative-taper" swatch={<LegendSwatch role="value" mark="dash" />}>
                  interpolated taper
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="measurement" mark="dot" />}>
                  measured point
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                k = {chunkSize}:{' '}
                <span data-testid="chunk-success-readout" style={{ color: value }}>
                  {formatPercent(success)}
                </span>{' '}
                success,{' '}
                <span data-testid="chunk-decisions-readout">{decisions}</span>{' '}
                {decisions === 1 ? 'decision' : 'decisions'} per {episodeSteps}-step episode
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="table"
                summary="Sampled success rate and decision count by chunk size"
                rowHeader="chunk size k"
                columns={[
                  { header: 'success', numeric: true },
                  { header: 'decisions', numeric: true },
                  { header: 'provenance', numeric: false },
                  { header: 'playhead', numeric: false },
                ]}
                rows={sampleRows}
                description={descriptionText}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Line chart of task success rate against chunk size k. Success rises to 44 percent at k of 100, then tapers. Current position k equals ${chunkSize}, success ${formatPercent(success)}.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={chunkScaleX}
              y={chunkScaleY}
              xTicks={[1, 100, 200, 300, 400]}
              yTicks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]}
              formatY={(p) => `${Math.round(p * 100)}%`}
              xLabel="chunk size k"
            />
            {/* Measured rise (solid) and interpolated taper (dashed). */}
            <path
              data-series="measured-rise"
              d={risePath}
              fill="none"
              stroke={value}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />
            <path
              data-series="illustrative-taper"
              d={taperPath}
              fill="none"
              stroke={value}
              strokeWidth={CHART_STROKE.trace}
              strokeDasharray={CHART_STROKE.dash}
            />
            {anchors.map((a) => (
              <g key={a.k}>
                <PointMarker x={a.cx} y={a.cy} role="measurement" />
                {/* The 1% anchor sits on the steep rise, so only the peak
                    takes a direct label; the caption states both values. */}
                {a.k === peakK ? (
                  <DirectLabel x={a.cx} y={a.cy - 13} role="measurement" anchor="middle">
                    {formatPercent(a.success)}
                  </DirectLabel>
                ) : null}
              </g>
            ))}
            <circle
              data-chart-mark="playhead"
              data-chart-role="highlight"
              cx={marker.cx}
              cy={marker.cy}
              r={CHART_STROKE.markerRadius + 2}
              fill="none"
              stroke={roleColour('highlight')}
              strokeWidth={CHART_STROKE.trace}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="Success climbs from 1% at k = 1 to the measured 44% at k = 100, then tapers slightly."
      source="Measured points: ACT ablation, mean of two simulated tasks. The taper past k = 100 is interpolated."
    />
  );
}
