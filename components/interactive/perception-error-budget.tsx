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
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ConstraintHatch,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * Authored teaching model: controls select three input magnitudes, composed
 * by root-sum-of-squares, not measured positioning errors or variances.
 * A distance sweep changes only the chosen ray-to-plane term. Model bands
 * and target multipliers are teaching settings, not collision predictions.
 *
 * Roles: the three inputs are value bars, the composed total is the state
 * outline, the 15 mm model band is the dashed reference line and the region
 * above the 30 mm band is the constraint hatch.
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

export function PerceptionErrorBudget({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
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

  const controls = (
    <>
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
      <ControlField>
        <ControlLabel
          htmlFor={`${uid}-handeye`}
          value={<span data-testid="perception-handeye-value">{params.handEyeDeg.toFixed(1)}</span>}
        >
          Hand-eye rotation (deg)
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
          aria-label={`Hand-eye rotation error in degrees, currently ${params.handEyeDeg.toFixed(1)}`}
          data-testid="perception-handeye-slider"
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
      <ControlField>
        <ControlLabel
          htmlFor={`${uid}-distance`}
          value={<span data-testid="perception-distance-value">{params.workingDistanceM.toFixed(2)}</span>}
        >
          Working distance (m)
        </ControlLabel>
        <input
          id={`${uid}-distance`}
          type="range"
          data-brand-control-id="control:input"
          min={SLIDER_SPECS.distance.min}
          max={SLIDER_SPECS.distance.max}
          step={SLIDER_SPECS.distance.step}
          value={params.workingDistanceM}
          onChange={(e) => setParam('workingDistanceM', Number(e.target.value))}
          aria-label={`Working distance in metres, currently ${params.workingDistanceM.toFixed(2)}`}
          data-testid="perception-distance-slider"
          className={INSTRUMENT_SLIDER_CLASS}
        />
      </ControlField>
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
      heading="Perception error budget"
      controls={
        <>
          {controls}
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the error budget to its opening values"
          />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="input" swatch={<LegendSwatch role="value" mark="bar" />}>
                  authored input
                </LegendItem>
                <LegendItem series="total" swatch={<LegendSwatch role="state" mark="line" />}>
                  root-sum-of-squares total
                </LegendItem>
                <LegendItem series="model-band" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  model band, {CLEARANCE_MM} mm
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  above model band, over {2 * CLEARANCE_MM} mm
                </LegendItem>
              </InstrumentLegend>
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
        >
          <div className="@container">{chart}</div>
        </FigureStage>
      }
      caption="Only the hand-eye term grows with working distance, so distance moves the total only when that angle is non-zero."
      source={referenceNote}
    />
  );
}
