'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
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
  ChartAxes,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import {
  CONTROL_HZ,
  DIFFUSION_POLICY_HORIZON,
  clampHorizon,
  commitDurationS,
  planChunks,
  replanRateHz,
} from '@/lib/receding-horizon';

/**
 * RecedingHorizon: the T_p / T_a dial of receding-horizon control.
 *
 * The policy predicts T_p actions, executes the first T_a, then replans.
 * Each lane of the chart is one issued chunk: the committed portion solid,
 * the predicted tail outlined (it will be revised by the next inference,
 * never executed). Moving T_a changes the replan rate and the wall-clock
 * commitment shown in the readouts. Defaults to the published Diffusion
 * Policy configuration (T_p=16, T_a=8).
 *
 * Interactive contract: deterministic render, visible readouts, named
 * presets, reset control, native keyboard-accessible sliders with
 * aria-labels, fixed-height chart (no layout shift), no auto-playing motion.
 */
type RecedingHorizonProps = {
  /** Window of control steps shown in the rolling plan. Default 32. */
  windowSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 196;
const PLOT = { left: 50, right: 328, top: 8, bottom: 150 };

const MIN_TP = 4;
const MAX_TP = 32;

/** The vertical room one lane label needs before every lane can carry one. */
const LABEL_PITCH = CHART_TYPE.tickPx * (CHART_TYPE.ascent + CHART_TYPE.descent) + 2;

function formatHz(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} Hz`;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

export function RecedingHorizon({
  windowSteps = 32,
  className,
}: RecedingHorizonProps) {
  const descriptionId = `${useId()}-description`;
  const [horizon, setHorizon] = useState<{ tp: number; ta: number }>({
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  });
  const clamped = clampHorizon(horizon.tp, horizon.ta);
  const chunks = useMemo(
    () => planChunks(clamped.tp, clamped.ta, windowSteps),
    [clamped.tp, clamped.ta, windowSteps],
  );

  // Round to 2 decimals: full-precision floats serialize differently on
  // server and client and trigger React hydration mismatches.
  const f = (v: number) => Number(v.toFixed(2));
  const scaleX = linearScale([0, windowSteps], [PLOT.left, PLOT.right]);
  const x = (step: number) => f(scaleX(step));
  const pitch = (PLOT.bottom - PLOT.top) / chunks.length;
  const laneHeight = f(Math.min(14, pitch * 0.72));
  // At small T_a there are more lanes than labels fit beside, so only
  // every n-th lane is named.
  const labelEvery = Math.max(1, Math.ceil(LABEL_PITCH / pitch));
  const action = roleColour('action');

  function set(tp: number, ta: number) {
    setHorizon(clampHorizon(tp, ta));
  }

  // Tail width in control steps: T_p - T_a after clamping. At zero there
  // is no outlined tail on any lane, so the takeaway must not claim one.
  const tailSteps = clamped.tp - clamped.ta;
  const tailClause =
    tailSteps > 0
      ? `solid bars are executed while the outlined ${tailSteps}-step tails are thrown away`
      : 'with T_a equal to T_p there is no outlined tail to throw away: every predicted action is executed, so the policy runs open-loop between inferences';

  const defaults = {
    tp: DIFFUSION_POLICY_HORIZON.tp,
    ta: DIFFUSION_POLICY_HORIZON.ta,
  };
  const replanRate = formatHz(replanRateHz(clamped.ta));
  const committed = formatSeconds(commitDurationS(clamped.ta));

  return (
    <InstrumentFigure
      figureId="receding-horizon"
      className={className}
      heading="Predict, execute, replan"
      controls={
        <>
          <div className="grid basis-full gap-3 sm:grid-cols-2">
            <ControlField>
              <ControlLabel htmlFor="rh-tp" value={`T_p = ${clamped.tp}`}>
                Predicted horizon
              </ControlLabel>
              <input
                id="rh-tp"
                type="range"
                data-brand-control-id="control:input"
                min={MIN_TP}
                max={MAX_TP}
                step={1}
                value={clamped.tp}
                onChange={(e) => set(Number(e.target.value), clamped.ta)}
                aria-label={`Predicted horizon T_p, currently ${clamped.tp}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
            <ControlField>
              <ControlLabel htmlFor="rh-ta" value={`T_a = ${clamped.ta}`}>
                Executed horizon
              </ControlLabel>
              <input
                id="rh-ta"
                type="range"
                data-brand-control-id="control:input"
                min={1}
                max={MAX_TP}
                step={1}
                value={clamped.ta}
                onChange={(e) => set(clamped.tp, Number(e.target.value))}
                aria-label={`Executed horizon T_a, currently ${clamped.ta}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
          </div>
          <button
            data-brand-control-id="control:secondary-action"
            type="button"
            onClick={() => set(defaults.tp, defaults.ta)}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Diffusion Policy (16/8)
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            type="button"
            onClick={() => set(MAX_TP, MAX_TP)}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Open-loop (32/32)
          </button>
          <InstrumentReset onClick={() => set(defaults.tp, defaults.ta)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="committed" swatch={<LegendSwatch role="action" mark="bar" />}>
                  executed, T_a steps
                </LegendItem>
                <LegendItem series="predicted" swatch={<LegendSwatch role="action" mark="dash" />}>
                  predicted, then replanned
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                T_p = {clamped.tp}, T_a = {clamped.ta}:{' '}
                <span data-testid="rh-replan-readout" style={{ color: action }}>
                  {replanRate}
                </span>{' '}
                replan rate,{' '}
                <span data-testid="rh-commit-readout" style={{ color: action }}>
                  {committed}
                </span>{' '}
                committed per plan
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current receding-horizon plan"
                description={`A receding-horizon plan with T_p ${clamped.tp} and T_a ${clamped.ta} issues ${chunks.length} chunks across the ${windowSteps}-step window, replanning at ${replanRate} and committing ${committed} per plan; ${tailClause}.`}
                states={[
                  { label: 'T_p', value: String(clamped.tp) },
                  { label: 'T_a', value: String(clamped.ta) },
                  { label: 'chunks', value: String(chunks.length) },
                  { label: 'replan rate', value: replanRate },
                  { label: 'committed', value: committed },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Receding horizon rolling plan over ${windowSteps} control steps. ${chunks.length} chunks, each predicting T_p of ${clamped.tp} actions and committing the first T_a of ${clamped.ta}. Committed portions are solid, predicted tails are outlined.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={scaleX}
              y={(value) => value}
              xTicks={[0, 8, 16, 24, 32].filter((s) => s <= windowSteps)}
              xLabel={`control step at ${CONTROL_HZ} Hz`}
              grid={false}
              yAxis={false}
            />
            {chunks.map((c) => {
              const top = f(PLOT.top + c.index * pitch + (pitch - laneHeight) / 2);
              const commitWidth = f(
                Math.max(0, x(Math.min(c.commitEnd, windowSteps)) - x(c.start)),
              );
              const tailEnd = Math.min(c.planEnd, windowSteps);
              const tailWidth = f(Math.max(0, x(tailEnd) - x(c.commitEnd)));
              return (
                <g key={c.index}>
                  {c.index % labelEvery === 0 ? (
                    <text
                      data-scene-tick=""
                      x={PLOT.left - CHART_STROKE.tickLength}
                      y={f(top + laneHeight / 2)}
                      dominantBaseline="middle"
                      textAnchor="end"
                      fontSize={CHART_TYPE.tickPx}
                      fill={CHART_STRUCTURE.labelSecondary}
                    >
                      plan {c.index}
                    </text>
                  ) : null}
                  <rect
                    data-testid="rh-committed"
                    data-series="committed"
                    x={x(c.start)}
                    y={top}
                    width={commitWidth}
                    height={laneHeight}
                    fill={action}
                  />
                  {tailWidth > 0 && (
                    <rect
                      data-testid="rh-predicted"
                      data-series="predicted"
                      x={x(c.commitEnd)}
                      y={top}
                      width={tailWidth}
                      height={laneHeight}
                      fill="none"
                      stroke={action}
                      strokeWidth={CHART_STROKE.reference}
                      strokeDasharray={CHART_STROKE.dash}
                    />
                  )}
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="Each lane is one plan: the robot executes the solid steps, then replans and drops the dashed tail."
      source="Schematic of the replanning cycle; presets use the Diffusion Policy setting of T_p 16, T_a 8 at 10 Hz."
    />
  );
}
