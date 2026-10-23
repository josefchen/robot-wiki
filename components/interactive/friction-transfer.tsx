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
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

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

function stagePoints(points: Array<{ mu: number; success: number }>): Array<[number, number]> {
  return points.map((p) => [xFor(p.mu), yFor(p.success)]);
}

function polyline(points: Array<{ mu: number; success: number }>): string {
  return stagePoints(points)
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

const POINT_STAGE = stagePoints(POINT_POINTS);

const formatSuccessTick = (t: number) => `${Math.round(t * 100)}%`;

/** The practice floors as plain words: "0.45 to 1.15". */
const floorSpan = (range: number) =>
  `${formatMu(Math.max(MU_MIN, MU_TRAIN - range))} to ${formatMu(Math.min(MU_MAX, MU_TRAIN + range))}`;

/** The real floor in words, against the one practice floor. */
function floorWords(mu: number): string {
  const gap = mu - MU_TRAIN;
  if (Math.abs(gap) < 0.05) return 'same as the practice floor';
  if (gap < -0.25) return 'much more slippery';
  if (gap < 0) return 'a bit more slippery';
  return gap > 0.25 ? 'much grippier' : 'a bit grippier';
}

/** How widely the practice floors spread, in words. */
const spreadWords = (range: number) =>
  range <= 0.15 ? 'a narrow spread' : range <= 0.4 ? 'a middling spread' : 'a wide spread';

/**
 * Label type at its largest against the drawing: stage units per em on the
 * narrowest full-size stage (a 375 px phone), so a spot clear there is clear
 * at every width.
 */
const LABEL_EM = (CHART_TYPE.labelPx * WIDTH) / MOTION_STAGE_TYPE.fullSizeMinStagePx;
/** Room kept between a readout's glyphs and any mark: two units of air plus half a trace. */
const READOUT_CLEARANCE = 2 + (CHART_STROKE.trace * WIDTH) / MOTION_STAGE_TYPE.fullSizeMinStagePx / 2;
/** The nearest a readout's edge comes to the real-floor line. */
const READOUT_OFFSET = 9;

type Point = readonly [number, number];
type Box = { x0: number; y0: number; x1: number; y1: number };
type ReadoutSpot = { x: number; y: number; anchor: 'start' | 'end'; box: Box; cost: number };

/** A percentage readout's box in stage units, generous for the widest digits. */
const readoutWidth = (text: string) => LABEL_EM * (0.6 * (text.length - 1) + 0.9);
const readoutHeight = LABEL_EM * (CHART_TYPE.ascent + CHART_TYPE.descent);

function boxesMeet(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Whether segment a-b passes through the box (Liang-Barsky clipping). */
function segmentMeetsBox([ax, ay]: Point, [bx, by]: Point, box: Box): boolean {
  if (Math.max(ax, bx) < box.x0 || Math.min(ax, bx) > box.x1) return false;
  if (Math.max(ay, by) < box.y0 || Math.min(ay, by) > box.y1) return false;
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  for (const [p, q] of [
    [-dx, ax - box.x0],
    [dx, box.x1 - ax],
    [-dy, ay - box.y0],
    [dy, box.y1 - ay],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Offsets from a dot, nearest first. Sliding along the line costs half what
 * leaving it does: a readout beside the line still reads as the real floor's,
 * one out in the plot reads as whichever curve it lands on.
 */
const READOUT_OFFSETS = (() => {
  const offsets: Array<{ across: boolean; dx: number; dy: number; cost: number }> = [];
  for (const across of [false, true]) {
    for (let dx = 0; dx <= 64; dx += 2) {
      for (let dy = -112; dy <= 112; dy += 2) {
        offsets.push({ across, dx, dy, cost: Math.abs(dy) + 2 * dx + (across ? 10 : 0) });
      }
    }
  }
  return offsets.sort((a, b) => a.cost - b.cost);
})();

/**
 * Where the two dots' readouts sit: inside the plot (below the line's own
 * label), beside the real-floor line, as near each dot as a spot clear of
 * both curves, the line, the dots, the plot's rules and each other allows,
 * stacked in the dots' order. Spots are measured with the type at its
 * largest, so they hold at any width. The fallback, at the dots' heights, is
 * never reached on the slider's grid (the component test walks all of it).
 */
export function readoutSpots({
  lineX,
  pointY,
  drY,
  pointText,
  drText,
  curves,
}: {
  lineX: number;
  pointY: number;
  drY: number;
  pointText: string;
  drText: string;
  curves: ReadonlyArray<ReadonlyArray<Point>>;
}): { point: ReadoutSpot; dr: ReadoutSpot } {
  const preferRight = lineX <= PLOT.right - 44;
  const marker = CHART_STROKE.markerRadius;
  const segments: Array<[Point, Point]> = [
    ...curves.flatMap((pts) => pts.slice(1).map((p, i) => [pts[i], p] as [Point, Point])),
    [[lineX, PLOT.top - 2], [lineX, PLOT.bottom]],
    ...Y_TICKS.map((t) => [[PLOT.left, yFor(t)], [PLOT.right, yFor(t)]] as [Point, Point]),
    [[PLOT.left, PLOT.top], [PLOT.left, PLOT.bottom]],
  ];
  const dots: Box[] = [pointY, drY].map((y) => ({ x0: lineX - marker, x1: lineX + marker, y0: y - marker, y1: y + marker }));
  const inner: Box = { x0: PLOT.left, x1: WIDTH, y0: PLOT.top, y1: PLOT.bottom };

  function place(dotY: number, text: string, taken: Box[], order: (box: Box) => boolean): ReadoutSpot | null {
    const width = readoutWidth(text);
    for (const { across, dx, dy, cost } of READOUT_OFFSETS) {
      const right = preferRight !== across;
      const near = right ? lineX + READOUT_OFFSET + dx : lineX - READOUT_OFFSET - dx;
      const x0 = right ? near : near - width;
      const y0 = dotY + dy - readoutHeight / 2;
      const glyphs: Box = { x0, x1: x0 + width, y0, y1: y0 + readoutHeight };
      const clear: Box = {
        x0: glyphs.x0 - READOUT_CLEARANCE,
        x1: glyphs.x1 + READOUT_CLEARANCE,
        y0: glyphs.y0 - READOUT_CLEARANCE,
        y1: glyphs.y1 + READOUT_CLEARANCE,
      };
      if (clear.x0 < inner.x0 || clear.x1 > inner.x1 || clear.y0 < inner.y0 || clear.y1 > inner.y1) continue;
      if (!order(glyphs)) continue;
      if ([...dots, ...taken].some((b) => boxesMeet(clear, b))) continue;
      if (segments.some(([a, b]) => segmentMeetsBox(a, b, clear))) continue;
      return { x: f(near), y: f(y0 + LABEL_EM * CHART_TYPE.ascent), anchor: right ? 'start' : 'end', box: glyphs, cost };
    }
    return null;
  }

  // On one side of the line, the lower dot's readout stays the lower one.
  const mid = (b: Box) => (b.y0 + b.y1) / 2;
  const rightOfLine = (b: Box) => b.x0 >= lineX;
  const fallback = (dotY: number, text: string): ReadoutSpot => {
    const x0 = preferRight ? lineX + READOUT_OFFSET : lineX - READOUT_OFFSET - readoutWidth(text);
    const y0 = dotY - readoutHeight / 2;
    return {
      x: f(preferRight ? lineX + READOUT_OFFSET : lineX - READOUT_OFFSET),
      y: f(y0 + LABEL_EM * CHART_TYPE.ascent),
      anchor: preferRight ? 'start' : 'end',
      box: { x0, x1: x0 + readoutWidth(text), y0, y1: y0 + readoutHeight },
      cost: Infinity,
    };
  };

  let best: { point: ReadoutSpot; dr: ReadoutSpot } | null = null;
  for (const pointFirst of [true, false]) {
    const first = pointFirst ? place(pointY, pointText, [], () => true) : place(drY, drText, [], () => true);
    if (!first) continue;
    const keepsOrder = (box: Box) => {
      if (rightOfLine(box) !== rightOfLine(first.box)) return true;
      const [p, d] = pointFirst ? [first.box, box] : [box, first.box];
      if (pointY > drY + 0.5) return mid(p) > mid(d);
      if (drY > pointY + 0.5) return mid(d) > mid(p);
      return true;
    };
    const second = pointFirst
      ? place(drY, drText, [first.box], keepsOrder)
      : place(pointY, pointText, [first.box], keepsOrder);
    if (!second) continue;
    const [point, dr] = pointFirst ? [first, second] : [second, first];
    if (!best || point.cost + dr.cost < best.point.cost + best.dr.cost) best = { point, dr };
  }
  return best ?? { point: fallback(pointY, pointText), dr: fallback(drY, drText) };
}

function annotationLines(realMu: number, point: number, dr: number): string[] {
  if (point >= dr) {
    return [
      Math.abs(realMu - MU_TRAIN) < 0.05 ? 'Real floor same as the practice floor:' : 'Real floor close to the practice floor:',
      `the one-floor robot wins, ${formatPct(point)} against ${formatPct(dr)}`,
    ];
  }
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
    `Illustrative, not measured robot data. At selected friction ${formatMu(realMu)}, the point curve is ${formatPct(point)} and the DR curve is ${formatPct(dr)}. The assumed DR half-width is ${formatMu(range)} and its plateau is ${formatPct(drPeakValue)}. Its height follows 0.93 minus 0.55 times the half-width; the point Gaussian has center 0.80, peak 0.97 and width 0.09, and the DR tails have width 0.10. The shaded band marks an assumed range, not a confidence interval. The randomization band is marked ${widthMark} at the selected half-width. Reset restores this panel to friction ${formatMu(defaultRealMu)} and half-width ${formatMu(defaultRange)}. Selecting friction samples the formulas; no training or adaptation runs.`;

  const lineX = xFor(realMu);
  const bandLeft = xFor(Math.max(MU_MIN, MU_TRAIN - range));
  const bandRight = xFor(Math.min(MU_MAX, MU_TRAIN + range));
  const valueColour = roleColour('value');
  const greyColour = roleColour('reference');
  const highlightColour = roleColour('highlight');
  const realLabelX = Math.min(PLOT.right - 34, Math.max(PLOT.left + 34, lineX));
  const values = readoutSpots({
    lineX,
    pointY: yFor(point),
    drY: yFor(dr),
    pointText: formatPct(point),
    drText: formatPct(dr),
    curves: [POINT_STAGE, stagePoints(drCurvePoints(range))],
  });
  const practiceX = xFor(MU_TRAIN);
  const onPracticeFloor = Math.abs(realMu - MU_TRAIN) < 0.05;
  const higher = point > dr ? 'point curve is higher' : 'DR curve is higher';

  return (
    <InstrumentFigure
      figureId="friction-transfer"
      className={className}
      kicker="Domain randomization"
      heading="One-floor robot wins on its floor; many-floor robot copes widely"
      controls={
        <ControlField>
          {/* The setting reads as one phrase: a value on its own read as a second label. */}
          <ControlLabel htmlFor={`${uid}-real-mu`} className="justify-start">
            <span>
              Real floor: <span className="text-text">{floorWords(realMu)}</span>
            </span>
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
      }
      adjust={
        <>
          <ControlField className="w-full basis-full content-start sm:max-w-sm">
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
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="point-policy" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  one-floor robot
                </LegendItem>
                <LegendItem series="dr-policy" swatch={<ManyFloorsSwatch />}>
                  many-floor robot, practised on the shaded floors
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
              tries without a fall
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

            {/* The band belongs to the many-floor robot's series: one legend entry names both. */}
            <g data-testid="dr-band" data-series="dr-policy">
              <rect
                x={bandLeft}
                y={PLOT.top}
                width={f(bandRight - bandLeft)}
                height={PLOT.bottom - PLOT.top}
                fill={CHART_STRUCTURE.grid}
                opacity={CHART_STRUCTURE.gridOpacity}
              />
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
              {/* On the practice floor the two would share one line, so the label says so. */}
              <DirectLabel x={realLabelX} y={PLOT.top - 8} anchor="middle" role="highlight">
                {onPracticeFloor ? 'real floor is the practice floor' : 'real floor'}
              </DirectLabel>
            </g>

            <g data-testid="point-marker" data-series="point-policy">
              <PointMarker x={lineX} y={yFor(point)} role="reference" />
            </g>
            <g data-testid="dr-marker" data-series="dr-policy">
              <PointMarker x={lineX} y={yFor(dr)} role="value" />
            </g>
            {/* Each robot's chance of success on the real floor, placed clear of every mark, so it needs no halo. */}
            <g data-testid="real-floor-values" fontWeight={600}>
              <DirectLabel x={values.point.x} y={values.point.y} anchor={values.point.anchor} role="reference">
                {formatPct(point)}
              </DirectLabel>
              <DirectLabel x={values.dr.x} y={values.dr.y} anchor={values.dr.anchor} role="value">
                {formatPct(dr)}
              </DirectLabel>
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Robots practise on computer-simulated floors that never match a real floor exactly, so engineers vary them on purpose."
      method={
        <>
          <p>
            The task in this example is walking across the floor without falling, and the chart shows the share of
            tries that end without a fall. Friction is the ground friction
            coefficient, mu: low is slippery, high is grippy. The robot trained on one
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
    />
  );
}

/** The many-floor robot's legend swatch: its line over the band's own quiet fill. */
function ManyFloorsSwatch() {
  return (
    <svg aria-hidden="true" focusable="false" width={28} height={14} viewBox="0 0 28 14" className="shrink-0">
      <rect x={0} y={0} width={28} height={14} fill={CHART_STRUCTURE.grid} opacity={CHART_STRUCTURE.gridOpacity} />
      <line x1={2} x2={26} y1={7} y2={7} stroke={roleColour('value')} strokeWidth={CHART_STROKE.trace} />
    </svg>
  );
}
