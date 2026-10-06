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
import {
  ChartAxes,
  DirectLabel,
  PointMarker,
  StageAnnotation,
  roleColour,
  CHART_STROKE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
} from '@/components/motion/chart';
import {
  ACT_CHUNK_ANCHORS,
  MAX_CHUNK,
  MIN_CHUNK,
  decisionsPerEpisode,
  successAtChunkSize,
} from '@/lib/chunk-size';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * ChunkSizeCurve: the ACT chunk-size ablation, read as fewer decisions.
 *
 * The stage plots task success against how many moves the robot commits to
 * per decision, on a log axis so the measured rise from 1 to 100 fills most
 * of the plot. Only the two anchors (1% at one move, 44% at 100) have
 * published numbers; the line between them is a drawn interpolation and the
 * taper past 100 is a pale estimate band. Under the plot, one tick per decision
 * in a 400-move task shows what chunking shrinks. The main view offers the
 * two measured settings; the free slider and Reset sit in "Adjust more".
 */
type ChunkSizeCurveProps = {
  /** Initial chunk size. Default 100 (the published ACT configuration). */
  defaultChunkSize?: number;
  /** Episode length in control steps for the decisions readout. Default 400 (8 s at 50 Hz). */
  episodeSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;
const LABEL_ASCENT = TEXT_H * CHART_TYPE.ascent;

const PAD = { top: 70, right: 22, left: 44 };
const PLOT_BOTTOM = 174;
/** The decision strips under the axis: a label row, then a row of ticks. */
const STRIP_TOP = 224;
const STRIP_ROW = 40;
const STRIP_TICK_H = 12;
const HEIGHT = STRIP_TOP + STRIP_ROW * 2 - 2;

/** Y axis tops out at 50% so the 44% peak uses most of the plot. */
const MAX_SUCCESS = 0.5;

/**
 * The plot scale, exported so the source/render parity gate can recompute
 * expected user-unit coordinates from the same constants the chart uses
 * (VAL-B2-VIZ-013). Pure: no hooks, no state. The x axis is logarithmic, so
 * the measured rise from one move to 100 takes most of the width.
 */
export function chunkScaleX(k: number): number {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const t = Math.log(Math.max(MIN_CHUNK, k) / MIN_CHUNK) / Math.log(MAX_CHUNK / MIN_CHUNK);
  return Number((PAD.left + t * plotWidth).toFixed(2));
}

export function chunkScaleY(success: number): number {
  const plotHeight = PLOT_BOTTOM - PAD.top;
  return Number((PLOT_BOTTOM - (success / MAX_SUCCESS) * plotHeight).toFixed(2));
}

const PLOT = {
  left: PAD.left,
  right: WIDTH - PAD.right,
  top: PAD.top,
  bottom: PLOT_BOTTOM,
};

type ChunkPreset = 'one' | 'hundred';

function formatPercent(value: number): string {
  const percent = value * 100;
  const needsDecimal = percent < 10 && !Number.isInteger(percent);
  return `${percent.toFixed(needsDecimal ? 1 : 0)}%`;
}

/** "44 successes in 100 tries": a success rate a reader can count. */
function triesWords(value: number): string {
  const percent = value * 100;
  const count = percent < 10 && !Number.isInteger(percent) ? percent.toFixed(1) : percent.toFixed(0);
  return `${count} ${count === '1' ? 'success' : 'successes'} in 100 tries`;
}

/** One tick per decision across the task, as a single path. */
function ticksPath(count: number, top: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = PLOT.left + ((i + 0.5) / count) * (PLOT.right - PLOT.left);
    parts.push(`M${x.toFixed(2)},${top} V${top + STRIP_TICK_H}`);
  }
  return parts.join(' ');
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
  const preset: ChunkPreset | null = chunkSize === 1 ? 'one' : chunkSize === peakK ? 'hundred' : null;

  const { risePath, taperPath, marker, anchors, taperEnd } = useMemo(() => {
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
      taperEnd: chunkScaleY(successAtChunkSize(MAX_CHUNK)),
      marker: { cx: chunkScaleX(chunkSize), cy: chunkScaleY(success) },
      anchors: ACT_CHUNK_ANCHORS.map((a) => ({
        ...a,
        cx: chunkScaleX(a.k),
        cy: chunkScaleY(a.success),
      })),
    };
  }, [chunkSize, success, peakK]);

  // Sampled from successAtChunkSize, the same function the path is drawn
  // from; the provenance column carries the estimate band's qualification
  // into the table rather than leaving it to the picture.
  const sampleRows = useMemo(() => {
    const measuredK = new Set(ACT_CHUNK_ANCHORS.map((a) => a.k));
    return [1, 25, 50, 100, 200, 300, 400].map((k) => ({
      label: `${k}`,
      values: [
        formatPercent(successAtChunkSize(k)),
        `${decisionsPerEpisode(episodeSteps, k)}`,
        measuredK.has(k) ? 'measured' : k < peakK ? 'interpolated' : 'estimated',
        k === chunkSize ? 'playhead' : 'off',
      ],
    }));
  }, [chunkSize, episodeSteps, peakK]);

  const descriptionText = `Task success rises from 1% at chunk size k = 1 to the measured 44% peak at k = 100, and at the current k = ${chunkSize} the curve reads ${formatPercent(
    success,
  )} success against ${decisions} closed-loop ${
    decisions === 1 ? 'decision' : 'decisions'
  } per ${episodeSteps}-step episode; the pale estimate band past k = 100 stands in for the slight decline the ACT ablation reports at k = 200 and k = 400 without exact numbers.`;

  function reset() {
    setChunkSize(defaultChunkSize);
  }

  const value = roleColour('value');
  const reference = roleColour('reference');
  const movesWords = (k: number) => `${k} ${k === 1 ? 'move' : 'moves'} per plan`;
  const note =
    decisions >= episodeSteps
      ? ['One decision for every move:', triesWords(success)]
      : [`${decisions} ${decisions === 1 ? 'decision' : 'decisions'} per task instead of ${episodeSteps}:`, triesWords(success)];
  const oneAnchor = anchors[0];
  const peakAnchor = anchors[anchors.length - 1];

  return (
    <InstrumentFigure
      figureId="chunk-size-curve"
      className={className}
      kicker="Action chunking"
      heading="Batching 100 moves lifts success from 1% to 44%"
      controls={
        <PresetGroup<ChunkPreset>
          label="How the robot plans"
          presets={[
            { id: 'one', label: 'One move at a time' },
            { id: 'hundred', label: `${peakK} moves per plan` },
          ]}
          value={preset}
          onChange={(id) => setChunkSize(id === 'one' ? 1 : peakK)}
          testId="chunk-preset"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor="csc-chunk-size" value={movesWords(chunkSize)}>
              Moves per plan, any value
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
            <SliderEnds low="1 move" high={`${MAX_CHUNK} moves`} />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                {movesWords(chunkSize)}:{' '}
                <span data-testid="chunk-success-readout" style={{ color: value }}>
                  {formatPercent(success)}
                </span>{' '}
                success, <span data-testid="chunk-decisions-readout">{decisions}</span>{' '}
                {decisions === 1 ? 'decision' : 'decisions'} per {episodeSteps}-move task
              </StageReadout>
              <StageStatus>Only the two dots have published numbers; the line between and the pale band are estimates.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Line chart of task success rate against chunk size k. Success rises to 44 percent at k of 100, then tapers. Current position k equals ${chunkSize}, success ${formatPercent(success)}, with ${decisions} decisions per ${episodeSteps}-step task drawn as ticks.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={chunkScaleX}
              y={chunkScaleY}
              xTicks={[1, 10, 100, MAX_CHUNK]}
              yTicks={[0, 0.25, 0.5]}
              formatY={(p) => `${Math.round(p * 100)}%`}
              xLabel="moves per plan"
              yLabel="task success"
              grid={false}
            />
            {/* The taper past the measured peak is an estimate: a pale band
                with its own label, not a line that reads as data. */}
            <g data-series="illustrative-taper">
              <path
                d={taperPath}
                fill="none"
                stroke={value}
                strokeOpacity={CHART_UNCERTAINTY.fillAlpha * 2}
                strokeWidth={CHART_STROKE.trace * 4}
                strokeLinecap="round"
              />
              <DirectLabel x={PLOT.right} y={taperEnd + 22} role="value" anchor="end">
                estimate
              </DirectLabel>
            </g>
            <g data-series="measured-rise">
              <path
                d={risePath}
                fill="none"
                stroke={value}
                strokeWidth={CHART_STROKE.reference}
                strokeLinejoin="round"
              />
              <DirectLabel x={oneAnchor.cx + 4} y={oneAnchor.cy - 14} role="value">
                {`${formatPercent(oneAnchor.success)}, measured`}
              </DirectLabel>
              <DirectLabel x={peakAnchor.cx} y={peakAnchor.cy - 12} role="value" anchor="middle">
                {`${formatPercent(peakAnchor.success)}, measured`}
              </DirectLabel>
            </g>
            {anchors.map((a) => (
              <PointMarker key={a.k} x={a.cx} y={a.cy} role="measurement" />
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
            {/* One tick per decision across a whole task: a fixed row for one
                move at a time, and a row for the current plan length. */}
            <g data-figure-decisions="">
              {[
                { label: `one move at a time: ${episodeSteps} decisions`, count: episodeSteps, colour: reference },
                {
                  label: `${movesWords(chunkSize)}: ${decisions} ${decisions === 1 ? 'decision' : 'decisions'}`,
                  count: decisions,
                  colour: value,
                },
              ].map((row, i) => {
                const labelY = STRIP_TOP + i * STRIP_ROW + LABEL_ASCENT - 4;
                return (
                  <g key={i} data-testid={i === 0 ? 'decision-ticks-single' : 'decision-ticks-current'} data-count={row.count}>
                    <text x={PLOT.left} y={labelY} fontSize={CHART_TYPE.labelPx} fill={row.colour}>
                      {row.label}
                    </text>
                    <path
                      d={ticksPath(row.count, Math.round(labelY + 6))}
                      fill="none"
                      stroke={row.colour}
                      strokeWidth={row.count > 100 ? CHART_STROKE.structure : CHART_STROKE.trace}
                    />
                  </g>
                );
              })}
            </g>
            <StageAnnotation x={8} y={LABEL_ASCENT + 4} lines={note} />
          </PlotStage>
        </FigureStage>
      }
      caption="Fewer decisions means fewer chances to slip: deciding 4 times per task instead of 400 made a simulated robot far more reliable."
      method={
        <>
          <p>
            Chunk size k is how many moves the robot commits to per decision. The two dots are ACT&apos;s
            own ablation (Zhao et al., 2023): 1% success at k = 1 and 44% at k = 100, the mean of two
            simulated tasks, Cube Transfer and Bimanual Insertion, each trained on scripted and on human
            demonstrations with temporal ensembling disabled. The paper plots the other chunk sizes it
            trained but gives numbers only for these two. The line between them is a log-linear
            interpolation drawn for reading, and the pale band past k = 100 is an estimate: the paper
            reports a slight decline at k = 200 and k = 400 without exact numbers.
          </p>
          <p>
            The ticks count decisions in a {episodeSteps}-step episode, 8 s of motion at 50 Hz: one per
            step at k = 1, and {episodeSteps} / k rounded up otherwise. The x axis is logarithmic.
          </p>
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
      source="Measured points: ACT ablation (Zhao et al., 2023), mean of two simulated tasks. The taper past 100 moves per plan is an estimate."
    />
  );
}
