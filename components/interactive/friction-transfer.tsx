'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  LegendSwatch,
  PointMarker,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_DR_RANGE,
  DR_RANGE_MAX,
  DR_RANGE_MIN,
  MU_MAX,
  MU_MIN,
  MU_TRAIN,
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
 * The robot trained on one floor (the point curve) is the grey dashed
 * spike; the robot trained on many floors (the domain-randomized curve) is
 * the solid value-coloured plateau. The real floor starts on the practice
 * floor (0.80), where the one-floor robot wins 97% against 74%; moving it
 * off that floor shows why randomization is used.
 *
 * Interactive contract: deterministic initial render, native range inputs
 * (keyboard-accessible) plus pointer drag on the real-floor line, readouts
 * one click away, reset control, fixed SVG viewport (no layout shift), no
 * JS-driven motion (scrub-only, so reduced-motion safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 242;
const PLOT = { left: 72, right: 326, top: 86, bottom: 210 } as const;

/** The real floor the figure opens on: the practice floor itself. */
export const OPENING_REAL_MU = 0.8;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(mu: number): number {
  const t = (mu - MU_MIN) / (MU_MAX - MU_MIN);
  return f(PLOT.left + t * (PLOT.right - PLOT.left));
}

function yFor(success: number): number {
  return f(PLOT.bottom - success * (PLOT.bottom - PLOT.top));
}

const Y_TICKS = [0, 0.5, 1] as const;

const POINT_POINTS = pointCurvePoints();

function polyline(points: Array<{ mu: number; success: number }>): string {
  return points.map((p) => `${xFor(p.mu)},${yFor(p.success)}`).join(' ');
}

const formatSuccessTick = (t: number) => `${Math.round(t * 100)}%`;

/** The practice floors as plain words: "0.45 to 1.15". */
const floorSpan = (range: number) =>
  `${formatMu(Math.max(MU_MIN, MU_TRAIN - range))} to ${formatMu(Math.min(MU_MAX, MU_TRAIN + range))}`;

/** The real floor in words, against the one practice floor. */
function floorWords(mu: number): string {
  const gap = mu - MU_TRAIN;
  if (Math.abs(gap) < 0.05) return 'like the practice floor';
  if (gap < -0.25) return 'much more slippery';
  if (gap < 0) return 'a bit more slippery';
  return gap > 0.25 ? 'much grippier' : 'a bit grippier';
}

/** How widely the practice floors spread, in words. */
const spreadWords = (range: number) =>
  range <= 0.15 ? 'a narrow spread' : range <= 0.4 ? 'a middling spread' : 'a wide spread';

function annotationLines(realMu: number, point: number, dr: number): string[] {
  if (point >= dr) return ['On the practice floor itself the', `one-floor robot wins, ${formatPct(point)} against ${formatPct(dr)}`];
  if (dr < 0.2) return ['Far from every practice floor,', 'both robots mostly fail'];
  if (point < 0.1) {
    return [
      `Floor ${realMu < MU_TRAIN ? 'more slippery' : 'grippier'} than practised:`,
      'the one-floor robot fails, the',
      'many-floor robot keeps going',
    ];
  }
  return ['Off the practice floor the many-floor', `robot does better, ${formatPct(dr)} against ${formatPct(point)}`];
}

export function FrictionTransfer({
  defaultRealMu = OPENING_REAL_MU,
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
    `Illustrative, not measured robot data. At selected friction ${formatMu(realMu)}, the point curve is ${formatPct(point)} and the DR curve is ${formatPct(dr)}. The assumed DR half-width is ${formatMu(range)} and its plateau is ${formatPct(drPeakValue)}. Its height follows 0.93 minus 0.55 times the half-width; the point Gaussian has center 0.80, peak 0.97 and width 0.09, and the DR tails have width 0.10. Dashed edges mark an assumed range, not a confidence interval. The randomization band is marked ${widthMark} at the selected half-width. Reset restores this panel to friction ${formatMu(defaultRealMu)} and half-width ${formatMu(defaultRange)}. Selecting friction samples the formulas; no training or adaptation runs.`;

  const lineX = xFor(realMu);
  const bandEdges = [MU_TRAIN - range, MU_TRAIN + range].filter(
    (mu) => mu >= MU_MIN && mu <= MU_MAX,
  );
  const bandLeft = xFor(Math.max(MU_MIN, MU_TRAIN - range));
  const bandRight = xFor(Math.min(MU_MAX, MU_TRAIN + range));
  const valueColour = roleColour('value');
  const greyColour = roleColour('reference');
  const highlightColour = roleColour('highlight');
  const realLabelX = Math.min(PLOT.right - 34, Math.max(PLOT.left + 34, lineX));
  const practiceX = xFor(MU_TRAIN);
  const higher = point > dr ? 'point curve is higher' : 'DR curve is higher';

  return (
    <InstrumentFigure
      figureId="friction-transfer"
      className={className}
      kicker="Domain randomization"
      heading="A specialist wins on one floor; a generalist survives many"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-real-mu`} value={floorWords(realMu)}>
              Real floor
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
            <SliderEnds low="slippery" high="grippy" />
          </ControlField>
          <ControlField>
            <ControlLabel htmlFor={`${uid}-range`} value={spreadWords(range)}>
              Range of practice floors
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
            <SliderEnds low="nearly one floor" high="many floors" />
          </ControlField>
        </>
      }
      adjust={<InstrumentReset onClick={reset} />}
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="point-policy" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  trained on one floor
                </LegendItem>
                <LegendItem series="dr-policy" swatch={<LegendSwatch role="value" mark="line" />}>
                  trained on many floors
                </LegendItem>
                <LegendItem series="training-range" swatch={<BandSwatch />}>
                  the many practice floors
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative, not measured</StageStatus>
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
            <StageAnnotation x={8} y={16} lines={annotationLines(realMu, point, dr)} />
            <ChartAxes plot={PLOT} x={xFor} y={yFor} yTicks={Y_TICKS} formatY={formatSuccessTick} />
            <text
              data-scene-axis=""
              transform={`rotate(-90 16 ${f((PLOT.top + PLOT.bottom) / 2)})`}
              x={16}
              y={f((PLOT.top + PLOT.bottom) / 2)}
              textAnchor="middle"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              chance of success
            </text>
            <g data-chart-axes="">
              <line
                x1={practiceX}
                x2={practiceX}
                y1={PLOT.bottom}
                y2={PLOT.bottom + CHART_STROKE.tickLength}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
              {(
                [
                  [PLOT.left, 'start', 'slippery'],
                  [practiceX, 'middle', 'practice floor'],
                  [PLOT.right, 'end', 'grippy'],
                ] as const
              ).map(([x, anchor, word]) => (
                <text
                  key={word}
                  data-scene-tick=""
                  x={x}
                  y={PLOT.bottom + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 2}
                  textAnchor={anchor}
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {word}
                </text>
              ))}
            </g>

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
                  stroke={greyColour}
                  strokeWidth={CHART_STROKE.structure}
                  strokeDasharray={CHART_STROKE.dash}
                  opacity={0.6}
                />
              ))}
            </g>

            <polyline
              data-testid="point-curve"
              data-series="point-policy"
              data-chart-mark="line"
              data-chart-role="reference"
              points={polyline(POINT_POINTS)}
              fill="none"
              stroke={greyColour}
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
            <DirectLabel x={realLabelX} y={PLOT.top - 14} anchor="middle" role="highlight">
              real floor
            </DirectLabel>

            <g data-testid="point-marker" data-series="point-policy">
              <PointMarker x={lineX} y={yFor(point)} role="reference" />
            </g>
            <g data-testid="dr-marker" data-series="dr-policy">
              <PointMarker x={lineX} y={yFor(dr)} role="value" />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Real floors never match the simulator exactly, so engineers vary the practice world on purpose to get robots that cope everywhere."
      method={
        <>
          <p>
            Friction is the ground friction coefficient, mu: low is slippery, high is grippy. The robot trained on one
            floor is a point policy trained at mu {formatMu(MU_TRAIN)} only. The robot trained on many floors is a
            domain-randomized (DR) policy trained over uniform mu in [{formatMu(MU_TRAIN - range)},{' '}
            {formatMu(MU_TRAIN + range)}], a half-width of {formatMu(range)} either side of the practice floor; the
            shaded band is that assumed training range, not a confidence interval.
          </p>
          <p>
            Real robot mu{' '}
            <span data-testid="real-mu-readout" style={{ color: highlightColour }}>
              {formatMu(realMu)}
            </span>
            : point policy <span data-testid="point-readout">{formatPct(point)}</span>, DR policy{' '}
            <span data-testid="dr-readout" style={{ color: valueColour }}>
              {formatPct(dr)}
            </span>
            , edge{' '}
            <span data-testid="delta-readout">
              {deltaPts >= 0 ? `DR +${deltaPts} pts` : `point +${-deltaPts} pts`}
            </span>
            . The practice floors span friction {floorSpan(range)}, and the DR plateau is{' '}
            <span data-testid="dr-peak-label">DR {formatPct(drPeakValue)}</span>; the point peak is{' '}
            {formatPct(pointSuccess(MU_TRAIN))}.
          </p>
          <p data-testid="ft-explanation">
            At friction {formatMu(realMu)} the {higher}. All curves are authored formulas, not trained policies or
            robot data, and not measured robot performance. All values and the falling DR peak are local
            assumptions: the plateau height is 0.93 minus 0.55 times the half-width, so it widens and falls together,
            74% at half-width 0.35 and 57% at 0.65. These authored values do not come from Peng paper results, and
            domain randomization has no measured universal law of this shape.
          </p>
          <ChartDescription
            id={`${uid}-ft-description`}
            form="table"
            open
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
      source="All curves are authored formulas, not trained policies or robot data; every value and the falling DR peak are local assumptions."
    />
  );
}

/** The practice-floor band's legend swatch: the band's own quiet fill. */
function BandSwatch() {
  return (
    <svg aria-hidden="true" focusable="false" width={28} height={14} viewBox="0 0 28 14" className="shrink-0">
      <rect x={0} y={0} width={28} height={14} fill={CHART_STRUCTURE.grid} opacity={CHART_STRUCTURE.gridOpacity} />
    </svg>
  );
}
