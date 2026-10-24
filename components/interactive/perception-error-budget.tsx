'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  CLEARANCE_MM,
  DEFAULT_PARAMS,
  NOMINAL_RANGE_M,
  PUBLISHED_DEPTH_SPEC_PCT,
  SLIDER_SPECS,
  TARGET_CLASSES,
  composeBudget,
  depthFloorPct,
  getTargetClass,
  handEyeErrorMm,
  type BudgetParams,
  type TargetId,
} from '@/lib/perception-error';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  SliderEnds,
} from '@/components/ui/instrument';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { pathOf } from '@/components/iso/iso-kit';
import {
  HEIGHT as BENCH_HEIGHT,
  PARTS,
  WIDTH as BENCH_WIDTH,
  beamOf,
  cableAt,
  cameraAt,
  carriageAt,
  drawnTilt,
  overTop,
  sightTo,
  spindleAt,
  thimbleAt,
  type LiveId,
  type Part,
  M as MISS_UNITS,
  SCALE_MM,
  U as RAIL_UNITS,
} from '@/components/iso/figures/tilt-miss-bench';

/**
 * Authored teaching model: controls select three input magnitudes, composed
 * by root-sum-of-squares, not measured positioning errors or variances.
 * A distance sweep changes only the chosen ray-to-plane term. Model bands
 * and target multipliers are teaching settings, not collision predictions.
 *
 * The stage draws that one distance-dependent term as an optical bench
 * (components/iso/figures/tilt-miss-bench.ts): a camera tilts in a yoke at
 * one end of a rail, set by a micrometer under its tail, and a target staff
 * rides the rail. The camera's line of sight, the lit beam, lands on the
 * staff's scale above the peg that sits on the rail's own line, so the gap
 * is the miss d * tan(theta) at the staff's distance. The miss is drawn far
 * steeper than the distance so a fraction of a degree shows. The composed
 * budget, its other inputs and its readouts sit in "Adjust more".
 *
 * Roles in the budget chart: the three inputs are value bars, the composed
 * total is the state outline, the 15 mm model band is the dashed reference
 * line and the region above the 30 mm band is the constraint hatch.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PAD_L = 76;
/**
 * Right margin: holds the value column outside the plotted bands, wide
 * enough for the longest readout (128.8) at the narrowest stage.
 */
const PAD_R = 52;
const PLOT_RIGHT = WIDTH - PAD_R;
/** Text keeps this inset from the viewBox edge at the narrowest stage. */
const EDGE = 6;
const BAND_TOP = 28;
const ROW_TOP = 38;
const ROW_H = 30;
const BAR_H = 14;
const AXIS_Y = ROW_TOP + 3 * ROW_H + BAR_H + 10;
const TICK_BASELINE = AXIS_Y + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 2;
const HEIGHT = TICK_BASELINE + 10;

/** Short row names on the stage; the description keeps the full names. */
const ROW_LABEL = { handeye: 'hand-eye', depth: 'depth', pose: 'pose', total: 'total' } as const;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** A readable axis ceiling that always shows the whole marginal band. */
function axisMax(totalMm: number): number {
  const needed = Math.max(totalMm * 1.15, CLEARANCE_MM * 2.4);
  const step = needed <= 40 ? 5 : needed <= 100 ? 10 : 25;
  return Math.ceil(needed / step) * step;
}

/** How many times steeper the bench draws the miss than the distance. */
const BENCH_MISS_SCALE = Math.round((MISS_UNITS * 1000) / RAIL_UNITS);

/** The rail's far end, metres: the description also states the miss there. */
const FAR_M = SLIDER_SPECS.distance.max;

/** The stage's words: the miss at the staff, in plain words. */
function benchReadout(tiltDeg: number, distanceM: number): string {
  const miss = handEyeErrorMm(tiltDeg, distanceM);
  const where = `${tiltDeg.toFixed(1)} degrees at ${distanceM.toFixed(2)} metres`;
  if (miss < 0.05) return `${where} · the beam lands on the peg`;
  return `${where} · misses by ${miss.toFixed(1)} millimetres${overTop(miss) ? ', past the scale' : ''}`;
}

/** The bench's parts in painter's order, cut into runs: the static art and the staff's moving carriage. */
const RUNS: Array<{ group: Part['group']; parts: Part[] }> = [];
for (const part of PARTS) {
  const last = RUNS[RUNS.length - 1];
  if (last && last.group === part.group) last.parts.push(part);
  else RUNS.push({ group: part.group, parts: [part] });
}

function BenchPart({ part }: { part: Part }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  return null;
}

/**
 * The bench for one tilt (degrees) and distance (metres). The component draws it once, for the settings it
 * opens on, so the server and the first client render agree and later renders never rewrite the live paths.
 */
function benchAt(tiltDeg: number, distanceM: number) {
  const miss = handEyeErrorMm(tiltDeg, distanceM);
  const tilt = drawnTilt(miss, distanceM);
  return {
    tiltDeg,
    distanceM,
    carriage: carriageAt(distanceM),
    sight: sightTo(distanceM),
    beam: beamOf(miss, distanceM),
    camera: cameraAt(tilt),
    spindle: spindleAt(tilt),
    thimble: thimbleAt(tiltDeg),
    cable: cableAt(tilt),
  };
}

type BenchRefs = {
  carriage: SVGGElement | null;
  sight: SVGPathElement | null;
  beam: SVGPathElement | null;
  ramp: SVGPathElement | null;
  rampGradient: SVGLinearGradientElement | null;
  spot: SVGCircleElement | null;
  hood: SVGGElement | null;
  barrel: SVGGElement | null;
  mount: SVGGElement | null;
  body: SVGGElement | null;
  connector: SVGGElement | null;
  screws: SVGGElement | null;
  spindle: SVGGElement | null;
  thimble: SVGGElement | null;
  knurl: SVGPathElement | null;
  cable: SVGPathElement | null;
  cableEnds: SVGGElement | null;
};

const tenth = (value: number) => String(Math.round(value * 10) / 10);

/** Draw the bench for a tilt (degrees) and a distance (metres). */
function drawBench(refs: BenchRefs, tiltDeg: number, distanceM: number) {
  const miss = handEyeErrorMm(tiltDeg, distanceM);
  const tilt = drawnTilt(miss, distanceM);
  refs.carriage?.setAttribute('transform', carriageAt(distanceM));
  refs.sight?.setAttribute('d', sightTo(distanceM));
  const beam = beamOf(miss, distanceM);
  refs.beam?.setAttribute('d', pathOf([beam.from, beam.fadeFrom]));
  refs.ramp?.setAttribute('d', beam.over ? pathOf([beam.fadeFrom, beam.to]) : '');
  if (refs.rampGradient) {
    refs.rampGradient.setAttribute('x1', tenth(beam.fadeFrom[0]));
    refs.rampGradient.setAttribute('y1', tenth(beam.fadeFrom[1]));
    refs.rampGradient.setAttribute('x2', tenth(beam.to[0]));
    refs.rampGradient.setAttribute('y2', tenth(beam.to[1]));
  }
  if (refs.spot) {
    refs.spot.setAttribute('cx', tenth(beam.to[0]));
    refs.spot.setAttribute('cy', tenth(beam.to[1]));
    refs.spot.style.display = beam.over ? 'none' : '';
  }
  const camera = cameraAt(tilt);
  writeSolid(refs.hood, camera.hood);
  writeSolid(refs.barrel, camera.barrel);
  writeSolid(refs.mount, camera.mount);
  writeSolid(refs.body, camera.body);
  writeSolid(refs.connector, camera.connector);
  refs.screws?.querySelectorAll('circle').forEach((dot, index) => {
    const point = camera.screws[index];
    if (!point) return;
    dot.setAttribute('cx', tenth(point[0]));
    dot.setAttribute('cy', tenth(point[1]));
  });
  writeSolid(refs.spindle, spindleAt(tilt));
  const thimble = thimbleAt(tiltDeg);
  writeSolid(refs.thimble, thimble.paths);
  refs.knurl?.setAttribute('d', thimble.knurl);
  const cable = cableAt(tilt);
  refs.cable?.setAttribute('d', pathOf([cable.from, ...cable.via, cable.to]));
  const ends = refs.cableEnds?.querySelectorAll('circle');
  ends?.[0]?.setAttribute('cx', tenth(cable.from[0]));
  ends?.[0]?.setAttribute('cy', tenth(cable.from[1]));
}

export function PerceptionErrorBudget({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sideDescriptionId = `${uid}-side-description`;
  const hatchId = `perception-above-band-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rampId = `perception-beam-fade-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [params, setParams] = useState<BudgetParams>(DEFAULT_PARAMS);

  const budget = composeBudget(params);
  const target = getTargetClass(params.target);
  const max = axisMax(budget.totalMm);
  const plotW = PLOT_RIGHT - PAD_L;
  const x = (mm: number) => f(PAD_L + Math.min(mm / max, 1) * plotW);

  const setParam = <K extends keyof BudgetParams>(key: K, value: BudgetParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));
  const reset = () => setParams(DEFAULT_PARAMS);

  const rows = [...budget.contributions, {
    key: 'total' as const,
    label: 'composed total',
    mm: budget.totalMm,
    share: 1,
  }];

  const verdictText = { within: 'within model band', marginal: 'marginal', jam: 'above model band' }[budget.verdict];

  const depthMm = budget.contributions.find((c) => c.key === 'depth')!.mm;
  const dominant = [...budget.contributions].sort((a, b) => b.share - a.share)[0];

  const ticks = [0, max / 2, max];
  const value = roleColour('value');
  const state = roleColour('state');
  const reference = roleColour('reference');

  const distance = params.workingDistanceM;
  const missMm = handEyeErrorMm(params.handEyeDeg, distance);
  const farMissMm = handEyeErrorMm(params.handEyeDeg, FAR_M);

  // The bench eases to the chosen tilt and distance: the staff's carriage glides along the rail, the camera tips
  // in its yoke and the beam follows. Reduced motion jumps there. The readout is written from the same instant.
  const stageRef = useRef<HTMLDivElement>(null);
  const bench = useRef<BenchRefs>({
    carriage: null, sight: null, beam: null, ramp: null, rampGradient: null, spot: null, hood: null, barrel: null,
    mount: null, body: null, connector: null, screws: null, spindle: null, thimble: null, knurl: null, cable: null,
    cableEnds: null,
  });
  const [opening] = useState(() => benchAt(params.handEyeDeg, params.workingDistanceM));
  const shown = useRef({ tilt: opening.tiltDeg, distance: opening.distanceM });
  const goalTilt = params.handEyeDeg;
  useEffect(() => {
    const calm = asksForStillness();
    const readout = stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const s = shown.current;
      const ease = (value: number, to: number) => (calm || Math.abs(to - value) < 1e-3 ? to : value + (to - value) * (1 - Math.exp(-dt / 0.16)));
      s.tilt = ease(s.tilt, goalTilt);
      s.distance = ease(s.distance, distance);
      drawBench(bench.current, s.tilt, s.distance);
      if (readout) readout.textContent = benchReadout(s.tilt, s.distance);
      frame = s.tilt === goalTilt && s.distance === distance ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [goalTilt, distance]);
  const b = bench.current;

  const targetField = (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="font-sans text-[13px] text-text-dim">Target surface</legend>
      <div className="flex flex-wrap items-center gap-x-3">
        {TARGET_CLASSES.map((option) => (
          <label
            key={option.id}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-sans text-sm text-text transition-colors hover:text-text-dim"
          >
            <input
              type="radio"
              data-brand-control-id="control:selection"
              name={`${uid}-target`}
              value={option.id}
              checked={params.target === option.id}
              onChange={() => setParam('target', option.id as TargetId)}
              data-testid={`perception-target-${option.id}`}
              className="h-4 w-4 cursor-pointer accent-ink"
            />
            <span>
              {option.label}{' '}
              <span className="text-text-dim">({depthFloorPct(option.id).toFixed(0)}% floor)</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const handEyeField = (
    <ControlField>
      <ControlLabel
        htmlFor={`${uid}-handeye`}
        value={
          <>
            <span data-testid="perception-handeye-value">{params.handEyeDeg.toFixed(1)}</span> degrees
          </>
        }
      >
        How far the camera is tilted
      </ControlLabel>
      <input
        id={`${uid}-handeye`}
        type="range"
        data-brand-control-id="control:input"
        min={SLIDER_SPECS.handEye.min}
        max={SLIDER_SPECS.handEye.max}
        step={SLIDER_SPECS.handEye.step}
        value={params.handEyeDeg}
        onChange={(e) => setParam('handEyeDeg', Number(e.target.value))}
        aria-label={`How far the camera is tilted: the hand-eye rotation error in degrees, currently ${params.handEyeDeg.toFixed(1)}`}
        data-testid="perception-handeye-slider"
        className={INSTRUMENT_SLIDER_CLASS}
      />
      <SliderEnds low="not at all" high="3 degrees" />
    </ControlField>
  );

  const distanceField = (
    <ControlField>
      <ControlLabel
        htmlFor={`${uid}-distance`}
        value={
          <>
            <span data-testid="perception-distance-value">{distance.toFixed(2)}</span> metres
          </>
        }
      >
        Distance to the object
      </ControlLabel>
      <input
        id={`${uid}-distance`}
        type="range"
        data-brand-control-id="control:input"
        min={SLIDER_SPECS.distance.min}
        max={SLIDER_SPECS.distance.max}
        step={SLIDER_SPECS.distance.step}
        value={distance}
        onChange={(e) => setParam('workingDistanceM', Number(e.target.value))}
        aria-label={`Distance to the object: the working distance in metres, currently ${distance.toFixed(2)}`}
        data-testid="perception-distance-slider"
        className={INSTRUMENT_SLIDER_CLASS}
      />
      <SliderEnds low="15 centimetres" high="1.5 metres" />
    </ControlField>
  );

  const budgetFields = (
    <>
      <ControlField>
        <ControlLabel
          htmlFor={`${uid}-depth`}
          value={<span data-testid="perception-depth-value">{params.depthPct.toFixed(1)}</span>}
        >
          Depth error (% of range)
        </ControlLabel>
        <input
          id={`${uid}-depth`}
          type="range"
          data-brand-control-id="control:input"
          min={SLIDER_SPECS.depth.min}
          max={SLIDER_SPECS.depth.max}
          step={SLIDER_SPECS.depth.step}
          value={params.depthPct}
          onChange={(e) => setParam('depthPct', Number(e.target.value))}
          aria-label={`Depth error (% of range), currently ${params.depthPct.toFixed(1)}`}
          data-testid="perception-depth-slider"
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
      <ControlField>
        <ControlLabel
          htmlFor={`${uid}-pose`}
          value={<span data-testid="perception-pose-value">{params.poseMm.toFixed(1)}</span>}
        >
          Object pose (mm)
        </ControlLabel>
        <input
          id={`${uid}-pose`}
          type="range"
          data-brand-control-id="control:input"
          min={SLIDER_SPECS.pose.min}
          max={SLIDER_SPECS.pose.max}
          step={SLIDER_SPECS.pose.step}
          value={params.poseMm}
          onChange={(e) => setParam('poseMm', Number(e.target.value))}
          aria-label={`Object pose (mm): the translation error in millimetres, currently ${params.poseMm.toFixed(1)}`}
          data-testid="perception-pose-slider"
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
    </>
  );

  const chart = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Authored input magnitudes and root-sum-of-squares total against the model band. Total ${budget.totalMm.toFixed(1)} millimetres.`}
      aria-describedby={descriptionId}
      data-testid="perception-chart"
    >
      <ConstraintHatch
        id={hatchId}
        x={x(2 * CLEARANCE_MM)}
        y={BAND_TOP}
        width={f(PLOT_RIGHT - x(2 * CLEARANCE_MM))}
        height={AXIS_Y - BAND_TOP}
      />
      {rows.map((row, i) => {
        const y = ROW_TOP + i * ROW_H;
        const isTotal = row.key === 'total';
        const width = f(Math.max(x(row.mm) - PAD_L, 1));
        return (
          <g key={row.key} data-series={isTotal ? 'total' : 'input'}>
            <text
              data-chart-label=""
              data-series-label-for={isTotal ? 'total' : 'input'}
              x={PAD_L - 8}
              y={y + BAR_H / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={CHART_TYPE.labelPx}
              fill={isTotal ? state : CHART_STRUCTURE.label}
            >
              {ROW_LABEL[row.key]}
            </text>
            {isTotal ? (
              <rect
                data-testid="perception-bar-total"
                data-chart-mark="outline"
                data-chart-role="state"
                x={PAD_L + CHART_STROKE.trace / 2}
                y={y + CHART_STROKE.trace / 2}
                width={f(Math.max(width - CHART_STROKE.trace, 1))}
                height={BAR_H - CHART_STROKE.trace}
                fill="none"
                stroke={state}
                strokeWidth={CHART_STROKE.trace}
              />
            ) : (
              <rect
                data-testid={`perception-bar-${row.key}`}
                data-chart-mark="bar"
                data-chart-role="value"
                x={PAD_L}
                y={y}
                width={width}
                height={BAR_H}
                fill={value}
              />
            )}
            <text
              data-scene-readout=""
              x={WIDTH - EDGE}
              y={y + BAR_H / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={CHART_TYPE.readoutPx}
              fill={isTotal ? state : CHART_STRUCTURE.label}
            >
              {row.mm.toFixed(1)}
            </text>
          </g>
        );
      })}
      <g data-series="model-band">
        <line
          x1={x(CLEARANCE_MM)}
          y1={BAND_TOP}
          x2={x(CLEARANCE_MM)}
          y2={AXIS_Y}
          stroke={reference}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
        <text
          data-testid="perception-clearance-label"
          data-chart-label=""
          data-series-label-for="model-band"
          x={f(x(CLEARANCE_MM) + 4)}
          y={BAND_TOP - 8}
          fontSize={CHART_TYPE.axisPx}
          fill={reference}
        >
          model band {CLEARANCE_MM} mm
        </text>
      </g>
      <line
        x1={PAD_L}
        y1={AXIS_Y}
        x2={PLOT_RIGHT}
        y2={AXIS_Y}
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CHART_STRUCTURE.axesOpacity}
        strokeWidth={CHART_STROKE.structure}
      />
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={x(tick)}
            y1={AXIS_Y}
            x2={x(tick)}
            y2={AXIS_Y + CHART_STROKE.tickLength}
            stroke={CHART_STRUCTURE.axes}
            strokeOpacity={CHART_STRUCTURE.axesOpacity}
            strokeWidth={CHART_STROKE.structure}
          />
          <text
            data-scene-tick=""
            x={x(tick)}
            y={TICK_BASELINE}
            textAnchor="middle"
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.labelSecondary}
          >
            {tick.toFixed(0)}
          </text>
        </g>
      ))}
      <text
        data-scene-axis=""
        x={WIDTH - EDGE}
        y={TICK_BASELINE}
        textAnchor="end"
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        mm
      </text>
    </PlotStage>
  );

  const liveView = (id: LiveId) => {
    if (id === 'sight') return <path key={id} ref={(el) => void (b.sight = el)} className="iso-line" data-tone="lo" d={opening.sight} />;
    if (id === 'beam') {
      return (
        <g key={id} data-testid="perception-beam" data-miss={missMm.toFixed(2)}>
          <defs>
            <linearGradient
              ref={(el) => void (b.rampGradient = el)}
              id={rampId}
              gradientUnits="userSpaceOnUse"
              x1={opening.beam.fadeFrom[0]}
              y1={opening.beam.fadeFrom[1]}
              x2={opening.beam.to[0]}
              y2={opening.beam.to[1]}
            >
              <stop offset="0" stopOpacity={1} style={{ stopColor: 'var(--anatomy-lit)' }} />
              <stop offset="1" stopOpacity={0} style={{ stopColor: 'var(--anatomy-lit)' }} />
            </linearGradient>
          </defs>
          <path ref={(el) => void (b.beam = el)} className="iso-line" data-tone="lit" d={pathOf([opening.beam.from, opening.beam.fadeFrom])} />
          <path ref={(el) => void (b.ramp = el)} className="iso-line" data-tone="lit" data-free="end" style={{ stroke: `url(#${rampId})` }} d={opening.beam.over ? pathOf([opening.beam.fadeFrom, opening.beam.to]) : ''} />
          <g className="iso-wire" data-tone="lit">
            <circle ref={(el) => void (b.spot = el)} className="iso-wire-end" data-testid="perception-spot" cx={opening.beam.to[0]} cy={opening.beam.to[1]} r={1.3} />
          </g>
        </g>
      );
    }
    if (id === 'lens') {
      return (
        <g key={id}>
          <LiveSolid ref={(el) => void (b.hood = el)} paths={opening.camera.hood} tone="mid" />
          <LiveSolid ref={(el) => void (b.barrel = el)} paths={opening.camera.barrel} tone="mid" />
          <LiveSolid ref={(el) => void (b.mount = el)} paths={opening.camera.mount} tone="mid" />
        </g>
      );
    }
    if (id === 'camera') {
      return (
        <g key={id} data-testid="perception-camera">
          <LiveSolid ref={(el) => void (b.body = el)} paths={opening.camera.body} />
          <g ref={(el) => void (b.screws = el)} className="iso-dots" data-tone="mid">
            {opening.camera.screws.map(([x, y], index) => (
              <circle key={index} cx={Math.round(x * 10) / 10} cy={Math.round(y * 10) / 10} r={0.45} />
            ))}
          </g>
          <LiveSolid ref={(el) => void (b.connector = el)} paths={opening.camera.connector} tone="mid" />
        </g>
      );
    }
    if (id === 'spindle') return <LiveSolid key={id} ref={(el) => void (b.spindle = el)} paths={opening.spindle} />;
    if (id === 'thimble') {
      return (
        <g key={id}>
          <LiveSolid ref={(el) => void (b.thimble = el)} paths={opening.thimble.paths} tone="mid" />
          <path ref={(el) => void (b.knurl = el)} className="iso-line" data-tone="lo" d={opening.thimble.knurl} />
        </g>
      );
    }
    return (
      <g key={id} className="iso-wire" data-tone="lo">
        <path ref={(el) => void (b.cable = el)} className="iso-line" data-tone="lo" d={pathOf([opening.cable.from, ...opening.cable.via, opening.cable.to])} />
        <g ref={(el) => void (b.cableEnds = el)}>
          <circle className="iso-wire-end" cx={opening.cable.from[0]} cy={opening.cable.from[1]} r={1.1} />
          <circle className="iso-wire-end" cx={opening.cable.to[0]} cy={opening.cable.to[1]} r={1.1} />
        </g>
      </g>
    );
  };

  const sideView = (
    <Stage className="iso-stage">
      <svg
        className="iso-svg"
        viewBox={`0 0 ${BENCH_WIDTH} ${BENCH_HEIGHT}`}
        role="img"
        focusable="false"
        aria-label={`A camera seen from the side, its assumed line of sight tilted ${params.handEyeDeg.toFixed(1)} degrees from the true one: at ${distance.toFixed(2)} metres the robot misses by ${missMm.toFixed(1)} millimetres.`}
        aria-describedby={sideDescriptionId}
        data-testid="perception-sight-view"
      >
        {RUNS.map((run, index) => {
          const body = run.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <BenchPart key={k} part={part} />));
          if (run.group === 'static') return <g key={index}>{body}</g>;
          return (
            <g key={index} ref={(el) => void (b.carriage = el)} transform={opening.carriage} data-testid="perception-staff">
              {body}
            </g>
          );
        })}
      </svg>
    </Stage>
  );

  const budgetView = (
    <div className="basis-full space-y-2">
      <div className="font-sans text-sm text-text-dim">
        The tilt&apos;s miss is one of three errors a robot stacks up before it grasps. The filled bars are
        those three, set by the controls above; the outlined bar is their root-sum-of-squares total. The
        dashed line marks the {CLEARANCE_MM} mm model band, and hatching covers totals over{' '}
        {2 * CLEARANCE_MM} mm, above the model band.
      </div>
      <div className="@container">{chart}</div>
      <InstrumentReadout>
        <span className="text-text-dim">composed</span>{' '}
        <span data-testid="perception-total-readout" className="font-mono" style={{ color: state }}>
          {budget.totalMm.toFixed(2)} mm
        </span>
        <span className="text-text-dim"> · depth term</span>{' '}
        <span data-testid="perception-depth-readout">
          <span className="font-mono">{depthMm.toFixed(2)} mm</span> at{' '}
          <span className="font-mono">{budget.effectiveDepthPct.toFixed(1)}%</span>
        </span>
        <span className="text-text-dim"> · model band</span>{' '}
        <span data-testid="perception-verdict-readout">{verdictText}</span>
      </InstrumentReadout>
      <p className="w-full font-sans text-[13px] leading-snug text-text-dim">
        <span data-testid="perception-target-note">
          The {target.label} case uses an authored depth floor of{' '}
          {depthFloorPct(params.target).toFixed(0)}% of the fixed nominal range;
          it is not a measured property of that material.
        </span>{' '}
        {budget.flooredByTarget
          ? 'That floor is above the slider, so the floor is what the budget uses.'
          : 'The slider is at or above that floor, so the slider is what the budget uses.'}
      </p>
    </div>
  );

  const referenceNote = (
    <>
      <span data-testid="perception-simplification-label">
        The depth term here is modelled as range-independent, evaluated once
        at a fixed {NOMINAL_RANGE_M.toFixed(1)} m standoff, so the percentage
        you set converts to the same millimetres at every working distance.
        This authored simplification isolates the chosen ray-to-plane term;
        it does not describe how every real depth sensor changes with range.
        Root-sum-of-squares is an authored rule here: these slider values
        are not established standard deviations, and the instrument does
        not establish independence or a real-system error bound.
      </span>{' '}
      The opaque-case floor borrows the ±{PUBLISHED_DEPTH_SPEC_PCT}% Z-accuracy
      entry for D410/D415 and D43x at ranges up to 2 m, 80% ROI and HD
      resolution. The datasheet&apos;s factory KPIs reflect typical conditions;
      these active models use a texture-less white target, default 150 mW
      laser power and auto exposure. This is not an opaque-object measurement
      or a standard deviation <CiteRef id="realsense-d400-datasheet-2026" />.
      The model chooses multipliers 1, 3 and 8 for its opaque, specular and
      transparent cases; none is a measured material-specific floor. Its 15 mm
      and 30 mm bands are authored comparison thresholds, not predictions of
      grasp success or collision.
    </>
  );

  return (
    <InstrumentFigure
      figureId="perception-error-budget"
      data-testid="perception-budget"
      className={className}
      kicker="Camera alignment"
      heading="A tiny camera tilt becomes a bigger miss farther away"
      controls={
        <>
          {handEyeField}
          {distanceField}
        </>
      }
      adjust={
        <>
          {targetField}
          {budgetFields}
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the error budget to its opening values"
          />
          {budgetView}
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={BENCH_WIDTH}
          hint="Slide the target away: the same tilt misses by more"
          readout={benchReadout(opening.tiltDeg, opening.distanceM)}
          status="Schematic: the tilt and the miss are drawn far larger than they are"
          data-testid="perception-bench"
        >
          <div ref={stageRef}>{sideView}</div>
        </AnatomyStage>
      }
      caption="Robots reach for what their camera sees, so a camera angle off by a fraction of a degree puts the hand beside the object."
      method={
        <>
          <p>
            The drawing is the hand-eye term of the budget: a line of sight tilted by an angle θ from the true one
            misses by e = d · tan θ at distance d, about 1.7 mm at 10 cm and 17 mm at 1 m for one degree. At{' '}
            {params.handEyeDeg.toFixed(1)} degrees and {distance.toFixed(2)} m the miss is {missMm.toFixed(2)} mm.
            The tilt runs from 0 to 3 degrees in steps of 0.1 and the distance from 0.15 to 1.5 m in steps of
            0.05 m; both open at 0.5. The drawing is an optical bench: the camera tilts in a yoke, set by the
            micrometer under its tail, and its line of sight, the lit beam, lands on the scale of a target staff
            that slides along the rail. The peg on the staff sits on the rail&apos;s own line, where the robot assumes
            the camera looks. The miss is drawn {BENCH_MISS_SCALE} times steeper than the distance, so the drawn
            tilt is far larger than the real one; a miss above {SCALE_MM} mm passes over the staff&apos;s top.
          </p>
          <p>{referenceNote}</p>
          <ChartDescription
            id={sideDescriptionId}
            form="state"
            summary="Current camera tilt and miss"
            description={`A camera's assumed line of sight is tilted ${params.handEyeDeg.toFixed(1)} degrees from the true one; at ${distance.toFixed(2)} m the gap between them, the miss, is ${missMm.toFixed(2)} mm, and at ${FAR_M} m it is ${farMissMm.toFixed(2)} mm.`}
            states={[
              { label: 'tilt', value: `${params.handEyeDeg.toFixed(1)} deg` },
              { label: 'distance', value: `${distance.toFixed(2)} m` },
              { label: 'miss', value: `${missMm.toFixed(2)} mm` },
            ]}
          />
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current authored budget and model band"
            description={`At an authored angle of ${params.handEyeDeg.toFixed(1)} degrees and axial distance ${params.workingDistanceM.toFixed(2)} m, the model's root-sum-of-squares magnitude is ${budget.totalMm.toFixed(2)} mm against its ${CLEARANCE_MM} mm comparison band. ${dominant.label} contributes ${(dominant.share * 100).toFixed(0)}% of the sum of squared inputs. Model band: ${verdictText}.`}
            states={[
              { label: 'hand-eye', value: `${params.handEyeDeg.toFixed(1)} deg` },
              { label: 'distance', value: `${params.workingDistanceM.toFixed(2)} m` },
              { label: 'depth', value: `${budget.effectiveDepthPct.toFixed(1)}%` },
              { label: 'pose', value: `${params.poseMm.toFixed(1)} mm` },
              { label: 'composed', value: `${budget.totalMm.toFixed(2)} mm` },
              { label: 'model band', value: verdictText },
            ]}
          />
        </>
      }
    />
  );
}
