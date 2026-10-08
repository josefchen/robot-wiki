'use client';

import { useId, useState } from 'react';
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
  InstrumentLegend,
  InstrumentReadout,
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
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * Authored teaching model: controls select three input magnitudes, composed
 * by root-sum-of-squares, not measured positioning errors or variances.
 * A distance sweep changes only the chosen ray-to-plane term. Model bands
 * and target multipliers are teaching settings, not collision predictions.
 *
 * The stage draws that one distance-dependent term: a side view of the
 * camera's true line of sight and the one the robot assumes, tilted by the
 * hand-eye angle, with the miss d * tan(theta) bracketed at the working
 * distance. The vertical is drawn far steeper than the horizontal so a
 * fraction of a degree shows. The composed budget, its other inputs and
 * its readouts sit in "Adjust more".
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

/** The side view: where the lens sits and how far the sight lines run. */
const LENS_X = 50;
const SIGHT_RIGHT = WIDTH - 14;
/** The true line of sight, which doubles as the distance axis. */
const SIGHT_Y = 160;
/** The assumed line of sight is clipped here, under the annotation row. */
const SIGHT_TOP = 44;
const NOTE_Y = 22;
/** The object's name sits under its dot, above the distance numbers. */
const OBJECT_LABEL_Y = SIGHT_Y + 16;
const SIDE_TICK_Y = SIGHT_Y + 34;
const SIDE_AXIS_Y = SIGHT_Y + 56;
const SIDE_H = SIDE_AXIS_Y + 8;
const FAR_M = SLIDER_SPECS.distance.max;
const UNITS_PER_M = (SIGHT_RIGHT - LENS_X) / FAR_M;
/**
 * Stage units per millimetre of miss: the vertical runs about 27 times
 * steeper than the horizontal, so half a degree reads as a visible wedge.
 */
const UNITS_PER_MM = 5;
const VISIBLE_MISS_MM = (SIGHT_Y - SIGHT_TOP) / UNITS_PER_MM;
const SIDE_TICKS = [0.5, 1, 1.5] as const;

const sideX = (m: number) => f(LENS_X + m * UNITS_PER_M);
const sideY = (mm: number) => f(SIGHT_Y - Math.min(mm, VISIBLE_MISS_MM) * UNITS_PER_MM);

/** The stage note: how far the robot misses at the chosen distance. */
function missNote(missMm: number): string {
  if (missMm < 0.05) return 'No tilt: the hand reaches the object';
  return `The hand goes here: ${missMm.toFixed(1)} millimetres off`;
}

/** A camera seen from the side, its lens touching the lines of sight. */
function CameraGlyph({ ink }: { ink: string }) {
  const y = SIGHT_Y;
  return (
    <g data-figure-glyph="camera">
      <rect x={12} y={y - 10} width={28} height={20} rx={3} fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace} />
      <rect x={17} y={y - 14} width={9} height={4} fill={ink} />
      <path d={`M40 ${y - 6} L${LENS_X} ${y - 3} L${LENS_X} ${y + 3} L40 ${y + 6} Z`} fill={ink} />
      <text data-chart-label="" x={30} y={SIDE_TICK_Y} textAnchor="middle" fontSize={CHART_TYPE.labelPx} fill={ink}>
        camera
      </text>
    </g>
  );
}

export function PerceptionErrorBudget({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sideDescriptionId = `${uid}-side-description`;
  const hatchId = `perception-above-band-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
  const highlight = roleColour('highlight');

  const distance = params.workingDistanceM;
  const missMm = handEyeErrorMm(params.handEyeDeg, distance);
  const farMissMm = handEyeErrorMm(params.handEyeDeg, FAR_M);
  // The miss grows linearly with distance, so the assumed line leaves the
  // drawing at the distance where it reaches the visible ceiling.
  const sightEndM = farMissMm > VISIBLE_MISS_MM ? FAR_M * (VISIBLE_MISS_MM / farMissMm) : FAR_M;
  const offChart = missMm > VISIBLE_MISS_MM;
  const objectX = sideX(distance);
  const aimY = sideY(missMm);

  const targetField = (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="font-sans text-[13px] text-text-dim">Target surface</legend>
      <div className="flex flex-wrap items-center gap-x-3">
        {TARGET_CLASSES.map((option) => (
          <label
            key={option.id}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-sans text-sm text-text"
          >
            <input
              type="radio"
              data-brand-control-id="control:selection"
              name={`${uid}-target`}
              value={option.id}
              checked={params.target === option.id}
              onChange={() => setParam('target', option.id as TargetId)}
              aria-label={option.label}
              data-testid={`perception-target-${option.id}`}
              className="h-4 w-4 cursor-pointer accent-highlight"
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
          aria-label={`Depth error as a percentage of range, currently ${params.depthPct.toFixed(1)}`}
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
          aria-label={`Object-pose translation error in millimetres, currently ${params.poseMm.toFixed(1)}`}
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
      <line
        data-series="model-band"
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
        x={f(x(CLEARANCE_MM) + 4)}
        y={BAND_TOP - 8}
        fontSize={CHART_TYPE.axisPx}
        fill={reference}
      >
        model band {CLEARANCE_MM} mm
      </text>
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

  const sideView = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${SIDE_H}`}
      aria-label={`A camera seen from the side, its assumed line of sight tilted ${params.handEyeDeg.toFixed(1)} degrees from the true one: at ${distance.toFixed(2)} metres the robot misses by ${missMm.toFixed(1)} millimetres.`}
      aria-describedby={sideDescriptionId}
      data-testid="perception-sight-view"
    >
      <line
        data-series="true-sight"
        x1={LENS_X}
        y1={SIGHT_Y}
        x2={SIGHT_RIGHT}
        y2={SIGHT_Y}
        stroke={reference}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      {SIDE_TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={sideX(tick)}
            y1={SIGHT_Y}
            x2={sideX(tick)}
            y2={SIGHT_Y + CHART_STROKE.tickLength}
            stroke={CHART_STRUCTURE.axes}
            strokeOpacity={CHART_STRUCTURE.axesOpacity}
            strokeWidth={CHART_STROKE.structure}
          />
          <text
            data-scene-tick=""
            x={sideX(tick)}
            y={SIDE_TICK_Y}
            textAnchor={tick === FAR_M ? 'end' : 'middle'}
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.labelSecondary}
          >
            {tick}
          </text>
        </g>
      ))}
      <text
        data-scene-axis=""
        x={f((LENS_X + SIGHT_RIGHT) / 2)}
        y={SIDE_AXIS_Y}
        textAnchor="middle"
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        distance from the camera, in metres
      </text>
      <line
        data-series="assumed-sight"
        data-chart-role="state"
        x1={LENS_X}
        y1={SIGHT_Y}
        x2={sideX(sightEndM)}
        y2={sideY(handEyeErrorMm(params.handEyeDeg, sightEndM))}
        stroke={state}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
      />
      {missMm >= 0.05 ? (
        <g data-series="miss" data-testid="perception-miss-bracket">
          <line x1={objectX} y1={SIGHT_Y} x2={objectX} y2={aimY} stroke={highlight} strokeWidth={CHART_STROKE.structure * 2} />
          {/* End caps make the bracket read as a measured gap, not a pointer. */}
          <line x1={objectX - 5} y1={SIGHT_Y} x2={objectX + 5} y2={SIGHT_Y} stroke={highlight} strokeWidth={CHART_STROKE.structure * 2} />
          {offChart ? null : (
            <line x1={objectX - 5} y1={aimY} x2={objectX + 5} y2={aimY} stroke={highlight} strokeWidth={CHART_STROKE.structure * 2} />
          )}
          {offChart ? (
            <path d={`M${objectX - 5} ${aimY + 6} L${objectX} ${aimY - 2} L${objectX + 5} ${aimY + 6} Z`} fill={highlight} />
          ) : null}
        </g>
      ) : null}
      <circle data-series="object" cx={objectX} cy={SIGHT_Y} r={CHART_STROKE.markerRadius + 1} fill={CHART_STRUCTURE.label} />
      <DirectLabel x={f(Math.min(objectX, WIDTH - 24))} y={OBJECT_LABEL_Y} anchor="middle">
        object
      </DirectLabel>
      <StageAnnotation
        x={EDGE + 2}
        y={NOTE_Y}
        lines={[missNote(missMm)]}
        target={[objectX, aimY]}
        from={[f(Math.min(Math.max(objectX - 36, EDGE + 16), WIDTH - 90)), NOTE_Y + 6]}
        pointer="arrow"
      />
      <CameraGlyph ink={CHART_STRUCTURE.label} />
    </PlotStage>
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
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="assumed-sight" swatch={<LegendSwatch role="state" mark="line" />}>
                  where the robot thinks the camera looks
                </LegendItem>
                <LegendItem series="true-sight" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  where the camera really looks
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Schematic: the tilt and the miss are drawn far larger than they are</StageStatus>
            </>
          }
        >
          <div className="@container">{sideView}</div>
        </FigureStage>
      }
      caption="Robots reach for what their camera sees, so a camera angle off by a fraction of a degree puts the hand beside the object."
      method={
        <>
          <p>
            The drawing is the hand-eye term of the budget: a line of sight tilted by an angle θ from the true one
            misses by e = d · tan θ at distance d, about 1.7 mm at 10 cm and 17 mm at 1 m for one degree. At{' '}
            {params.handEyeDeg.toFixed(1)} degrees and {distance.toFixed(2)} m the miss is {missMm.toFixed(2)} mm.
            The tilt runs from 0 to 3 degrees in steps of 0.1 and the distance from 0.15 to 1.5 m in steps of
            0.05 m; both open at 0.5. The vertical is drawn {UNITS_PER_MM} stage units per millimetre against{' '}
            {f(UNITS_PER_M / 1000)} per millimetre of distance, so the drawn angle is far steeper than the real one;
            a miss above {VISIBLE_MISS_MM.toFixed(1)} mm runs off the top of the drawing.
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
