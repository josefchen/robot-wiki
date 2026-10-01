'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  LegendSwatch,
  PointMarker,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_DR_RANGE,
  DEFAULT_REAL_MU,
  DR_RANGE_MAX,
  DR_RANGE_MIN,
  MU_MAX,
  MU_MIN,
  MU_TRAIN,
  POINT_PEAK,
  POINT_SIGMA,
  drCurvePoints,
  drPeak,
  drSuccess,
  formatMu,
  formatPct,
  pointCurvePoints,
  pointSuccess,
} from '@/lib/sim2real';

/**
 * FrictionTransfer draws authored success curves, not trained policies.
 * The selected friction and half-width drive deterministic formulas.
 * Peak-versus-width coupling is a local assumption, not a paper result.
 *
 * Interactive contract: deterministic initial render, native range inputs
 * (keyboard-accessible) plus pointer drag on the real-robot line, visible
 * readouts, reset control, fixed SVG viewport (no layout shift), no
 * JS-driven motion (scrub-only, so reduced-motion safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 244;
const PLOT = { left: 48, right: 322, top: 38, bottom: 198 } as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(mu: number): number {
  const t = (mu - MU_MIN) / (MU_MAX - MU_MIN);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yFor(success: number): number {
  return f(PLOT.bottom - success * (PLOT.bottom - PLOT.top));
}

// The 0.20 origin tick is drawn apart from these: centred like the others,
// its label ran into the 0% tick label at narrow widths, so it starts at
// its tick. The axis still labels both ends of the plotted range, which
// the sampled table's first and last rows carry.
const X_TICKS = [0.5, 0.8, 1.1, 1.5] as const;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

const POINT_POINTS = pointCurvePoints();

function polyline(points: Array<{ mu: number; success: number }>): string {
  return points.map((p) => `${xFor(p.mu)},${yFor(p.success)}`).join(' ');
}

const LABEL_GAP = 4;
/** "DR 74%" at the label size, in stage units. */
const DR_LABEL_WIDTH = CHART_TYPE.labelPx * 3.6;

/** Where the point curve's rising edge crosses a success level. */
function pointEdgeMu(level: number): number {
  if (level >= POINT_PEAK) return MU_TRAIN;
  return MU_TRAIN - POINT_SIGMA * Math.sqrt(2 * Math.log(POINT_PEAK / level));
}

/**
 * The point curve's spike splits the DR plateau in two. The plateau label
 * sits on the plateau's left segment when it fits between the band edge and
 * the spike, and just left of the band otherwise, so it never crosses a curve.
 */
function drLabelPlacement(range: number, peak: number) {
  const bandLeft = xFor(Math.max(MU_MIN, MU_TRAIN - range));
  const room = xFor(pointEdgeMu(peak)) - (bandLeft + LABEL_GAP);
  const inside = room >= DR_LABEL_WIDTH + LABEL_GAP;
  return {
    x: f(inside ? bandLeft + LABEL_GAP : bandLeft - LABEL_GAP),
    y: f(yFor(peak) - 6),
    anchor: inside ? ('start' as const) : ('end' as const),
  };
}

const formatSuccessTick = (t: number) => `${Math.round(t * 100)}%`;

export function FrictionTransfer({
  defaultRealMu = DEFAULT_REAL_MU,
  defaultRange = DEFAULT_DR_RANGE,
  className,
}: {
  defaultRealMu?: number;
  defaultRange?: number;
  className?: string;
}) {
  // useId-derived input ids keep each label bound to its own slider if the
  // chart is ever mounted twice on one page.
  const uid = useId();
  const [realMu, setRealMu] = useState(defaultRealMu);
  const [range, setRange] = useState(defaultRange);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const point = pointSuccess(realMu);
  const dr = drSuccess(realMu, range);
  const drPeakValue = drPeak(range);
  const deltaPts = Math.round((dr - point) * 100);

  function muFromPointer(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return realMu;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const t = (x - PLOT.left) / (PLOT.right - PLOT.left);
    const mu = MU_MIN + t * (MU_MAX - MU_MIN);
    return Math.min(MU_MAX, Math.max(MU_MIN, Number(mu.toFixed(2))));
  }

  function reset() {
    setRealMu(defaultRealMu);
    setRange(defaultRange);
  }

  const sampleRows = useMemo(() => {
    const mus = [...new Set([0.2, 0.5, 0.8, 1.1, 1.5, realMu])].sort(
      (a, b) => a - b,
    );
    return mus.map((mu) => ({
      label: formatMu(mu),
      values: [
        formatPct(pointSuccess(mu)),
        formatPct(drSuccess(mu, range)),
        Math.abs(mu - realMu) < 0.001 ? 'playhead' : 'off',
      ],
    }));
  }, [realMu, range]);

  // Named width regime so two mounts on one route describe distinct regimes
  // even after digit normalisation (mirrors the latency `marked ${status}`).
  const widthMark = range >= 0.5 ? 'wide' : 'ordinary';

  const descriptionText =
    `Authored toy, not measured robot data. At selected friction ${formatMu(realMu)}, the point curve is ${formatPct(point)} and the DR curve is ${formatPct(dr)}. The assumed DR half-width is ${formatMu(range)} and its plateau is ${formatPct(drPeakValue)}. Its height follows 0.93 minus 0.55 times the half-width; the point Gaussian has center 0.80, peak 0.97 and width 0.09, and the DR tails have width 0.10. Dashed edges mark an assumed range, not a confidence interval. The randomization band is marked ${widthMark} at the selected half-width. Reset restores this panel to friction ${formatMu(defaultRealMu)} and half-width ${formatMu(defaultRange)}. Selecting friction samples the formulas; no training or adaptation runs.`;

  const lineX = xFor(realMu);
  const bandEdges = [MU_TRAIN - range, MU_TRAIN + range].filter(
    (mu) => mu >= MU_MIN && mu <= MU_MAX,
  );
  const bandLeft = xFor(Math.max(MU_MIN, MU_TRAIN - range));
  const bandRight = xFor(Math.min(MU_MAX, MU_TRAIN + range));
  const drLabel = drLabelPlacement(range, drPeakValue);
  const valueColour = roleColour('value');
  const highlightColour = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="friction-transfer"
      className={className}
      heading="Task success across ground friction"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-real-mu`} value={formatMu(realMu)}>
              Real robot mu
            </ControlLabel>
            <input
              id={`${uid}-real-mu`}
              type="range"
              data-brand-control-id="control:input"
              min={Math.round(MU_MIN * 100)}
              max={Math.round(MU_MAX * 100)}
              step={1}
              value={Math.round(realMu * 100)}
              onChange={(e) => setRealMu(Number(e.target.value) / 100)}
              aria-label={`Real robot friction, currently ${formatMu(realMu)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-range`}
              value={`+/- ${formatMu(range)}`}
            >
              DR half-width
            </ControlLabel>
            <input
              id={`${uid}-range`}
              type="range"
              data-brand-control-id="control:input"
              min={Math.round(DR_RANGE_MIN * 100)}
              max={Math.round(DR_RANGE_MAX * 100)}
              step={5}
              value={Math.round(range * 100)}
              onChange={(e) => setRange(Number(e.target.value) / 100)}
              aria-label={`Randomization half-width, currently plus or minus ${formatMu(range)}`}
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
                <LegendItem series="point-policy" swatch={<LegendSwatch role="value" mark="dash" />}>
                  trained at mu = {formatMu(MU_TRAIN)} only
                </LegendItem>
                <LegendItem series="dr-policy" swatch={<LegendSwatch role="value" mark="line" />}>
                  trained over uniform mu in [{formatMu(MU_TRAIN - range)},{' '}
                  {formatMu(MU_TRAIN + range)}]
                </LegendItem>
                <LegendItem series="training-range" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  assumed training range
                </LegendItem>
                <LegendItem series="real-robot" swatch={<LegendSwatch role="highlight" mark="line" />}>
                  selected real-robot friction
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                Real robot mu{' '}
                <span data-testid="real-mu-readout" style={{ color: highlightColour }}>
                  {formatMu(realMu)}
                </span>
                : point policy{' '}
                <span data-testid="point-readout" style={{ color: valueColour }}>
                  {formatPct(point)}
                </span>
                , DR policy{' '}
                <span data-testid="dr-readout" style={{ color: valueColour }}>
                  {formatPct(dr)}
                </span>
                , edge{' '}
                <span data-testid="delta-readout">
                  {deltaPts >= 0
                    ? `DR +${deltaPts} pts`
                    : `point +${-deltaPts} pts`}
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={`${uid}-ft-description`}
                form="table"
                summary="Sampled task success against ground friction"
                rowHeader="mu"
                columns={[
                  { header: 'point policy', numeric: true },
                  { header: 'DR policy', numeric: true },
                  { header: 'playhead', numeric: false },
                ]}
                rows={sampleRows}
                description={descriptionText}
              />
            </>
          }
        >
          <PlotStage
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Task success against ground friction. Point policy ${formatPct(point)} vs DR policy ${formatPct(dr)} at mu ${formatMu(realMu)}.`}
            aria-describedby={`${uid}-ft-description`}
            onPointerMove={(e) => {
              if (dragging) setRealMu(muFromPointer(e.clientX));
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            <ChartAxes
              plot={PLOT}
              x={xFor}
              y={yFor}
              xTicks={X_TICKS}
              yTicks={Y_TICKS}
              formatX={formatMu}
              formatY={formatSuccessTick}
              xLabel="ground friction coefficient mu"
            />
            <g data-chart-axes="">
              <line
                x1={xFor(MU_MIN)}
                x2={xFor(MU_MIN)}
                y1={PLOT.bottom}
                y2={PLOT.bottom + CHART_STROKE.tickLength}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
              <text
                data-scene-tick=""
                x={xFor(MU_MIN)}
                y={PLOT.bottom + CHART_STROKE.tickLength + CHART_TYPE.tickPx}
                textAnchor="start"
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {formatMu(MU_MIN)}
              </text>
            </g>
            <text
              data-scene-axis=""
              x={PLOT.left}
              y={PLOT.top - 16}
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              task success
            </text>

            <g data-testid="dr-band" data-series="training-range">
              <rect
                x={bandLeft}
                y={PLOT.top}
                width={f(bandRight - bandLeft)}
                height={PLOT.bottom - PLOT.top}
                fill={CHART_STRUCTURE.grid}
                opacity={CHART_STRUCTURE.gridOpacity}
              />
              {bandEdges.map((mu) => (
                <line
                  key={mu}
                  data-chart-mark="line"
                  data-chart-role="reference"
                  x1={xFor(mu)}
                  x2={xFor(mu)}
                  y1={PLOT.top}
                  y2={PLOT.bottom}
                  stroke={roleColour('reference')}
                  strokeWidth={CHART_STROKE.reference}
                  strokeDasharray={CHART_STROKE.dash}
                />
              ))}
            </g>

            <polyline
              data-testid="point-curve"
              data-series="point-policy"
              data-chart-mark="line"
              data-chart-role="value"
              points={polyline(POINT_POINTS)}
              fill="none"
              stroke={valueColour}
              strokeWidth={CHART_STROKE.trace}
              strokeDasharray={CHART_STROKE.dash}
              strokeLinejoin="round"
            />
            <polyline
              data-testid="dr-curve"
              data-series="dr-policy"
              data-chart-mark="line"
              data-chart-role="value"
              points={polyline(drCurvePoints(range))}
              fill="none"
              stroke={valueColour}
              strokeWidth={CHART_STROKE.trace}
              strokeLinejoin="round"
            />

            <text
              data-chart-label=""
              x={f(xFor(MU_TRAIN) + 8)}
              y={f(yFor(POINT_PEAK) + 5)}
              fontSize={CHART_TYPE.labelPx}
              fill={valueColour}
            >
              point {formatPct(POINT_PEAK)}
            </text>
            <text
              data-testid="dr-peak-label"
              data-chart-label=""
              x={drLabel.x}
              y={drLabel.y}
              textAnchor={drLabel.anchor}
              fontSize={CHART_TYPE.labelPx}
              fill={valueColour}
            >
              DR {formatPct(drPeakValue)}
            </text>

            <g data-testid="real-line" data-series="real-robot" data-selection="">
              <line
                x1={lineX}
                x2={lineX}
                y1={PLOT.top - 2}
                y2={PLOT.bottom}
                stroke={highlightColour}
                strokeWidth={CHART_STROKE.reference}
              />
              <path
                d={`M ${f(lineX - 5)},${PLOT.top - 10} L ${f(lineX + 5)},${PLOT.top - 10} L ${lineX},${PLOT.top - 2} Z`}
                fill={highlightColour}
              />
              {/* Fat unpainted hit area for pointer drag. */}
              <rect
                x={f(lineX - 12)}
                y={PLOT.top - 10}
                width={24}
                height={PLOT.bottom - PLOT.top + 10}
                fill="none"
                pointerEvents="all"
                style={{ cursor: 'ew-resize', touchAction: 'none' }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(true);
                  setRealMu(muFromPointer(e.clientX));
                }}
              />
            </g>

            <g data-testid="point-marker" data-series="point-policy">
              <PointMarker x={lineX} y={yFor(point)} role="value" />
            </g>
            <g data-testid="dr-marker" data-series="dr-policy">
              <PointMarker x={lineX} y={yFor(dr)} role="value" />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="In this authored toy, the point policy peaks sharply at its training friction; randomized training trades that peak for breadth."
      source={
        <span data-testid="ft-explanation">
          All curves are authored formulas, not trained policies or robot
          data; every value and the falling DR peak are local assumptions.
        </span>
      }
    />
  );
}
