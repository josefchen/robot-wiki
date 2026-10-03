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
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
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
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * RecedingHorizon: plan ahead, act on the first part, then plan again.
 *
 * Each lane of the stage is one plan: the steps the robot acts on solid,
 * the rest of the plan dashed, because the next plan replaces it before the
 * robot gets there. The time axis is in seconds and runs to the end of the
 * last plan, so every dashed tail is drawn whole. The main view offers the
 * Diffusion Policy setting (16 steps planned, 8 acted on, at 10 Hz) and a
 * plan that is never revised; the two step sliders and Reset sit in
 * "Adjust more", and the symbols and the receding-horizon term in "How this
 * was made".
 */
type RecedingHorizonProps = {
  /** Window of control steps in which new plans start. Default 32. */
  windowSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;
const LABEL_ASCENT = TEXT_H * CHART_TYPE.ascent;
const NOTE_Y = LABEL_ASCENT + 4;
const HEIGHT = 222;
const PLOT = { left: 54, right: 326, top: 60, bottom: 176 };

const MIN_TP = 4;
const MAX_TP = 32;

/** The vertical room one lane label needs before every lane can carry one. */
const LABEL_PITCH = CHART_TYPE.tickPx * (CHART_TYPE.ascent + CHART_TYPE.descent) + 2;

type HorizonPreset = 'diffusion' | 'never';

function formatHz(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} Hz`;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

/** "1.25 times a second": the replan rate in plain words. */
function rateWords(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')} times a second`;
}

function secondsWords(value: number): string {
  return `${value.toFixed(1)} seconds`;
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
  // The axis runs to the end of the last plan, so no dashed tail is cut off.
  const domainEnd = Math.max(windowSteps, ...chunks.map((c) => c.planEnd));
  const scaleX = linearScale([0, domainEnd], [PLOT.left, PLOT.right]);
  const x = (step: number) => f(scaleX(step));
  const pitch = (PLOT.bottom - PLOT.top) / chunks.length;
  const laneHeight = f(Math.min(14, pitch * 0.72));
  const laneTop = (index: number) => f(PLOT.top + index * pitch + (pitch - laneHeight) / 2);
  // At small T_a there are more lanes than labels fit beside, so only
  // every n-th lane is named.
  const labelEvery = Math.max(1, Math.ceil(LABEL_PITCH / pitch));
  const action = roleColour('action');
  const tickStep = domainEnd > 48 ? 16 : 8;
  const xTicks: number[] = [];
  for (let s = 0; s <= domainEnd; s += tickStep) xTicks.push(s);

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
  const preset: HorizonPreset | null =
    clamped.tp === defaults.tp && clamped.ta === defaults.ta
      ? 'diffusion'
      : clamped.tp === MAX_TP && clamped.ta === MAX_TP
        ? 'never'
        : null;

  // The note points at the first plan's dashed tail, or at the whole first
  // plan when nothing is thrown away.
  const first = chunks[0];
  const target: [number, number] =
    tailSteps > 0
      ? [f((x(first.commitEnd) + x(Math.min(first.planEnd, domainEnd))) / 2), f(laneTop(0) + laneHeight / 2)]
      : [f((x(first.start) + x(first.commitEnd)) / 2), f(laneTop(0) + laneHeight / 2)];
  const noteLines =
    tailSteps > 0
      ? ['Thrown away: the robot replans', 'before it gets here']
      : ['Acts on every planned step,', 'never rethinking on the way'];
  const noteX = 8;
  const noteFrom: [number, number] = [
    Math.min(Math.max(target[0], noteX + 12), noteX + 200),
    f(NOTE_Y + TEXT_H * 1.25 + TEXT_H * 0.45),
  ];

  return (
    <InstrumentFigure
      figureId="receding-horizon"
      className={className}
      kicker="Receding horizon"
      heading="Plan 1.6 seconds ahead, act on half, then rethink"
      controls={
        <PresetGroup<HorizonPreset>
          label="How often it rethinks"
          presets={[
            {
              id: 'diffusion',
              label: `Diffusion Policy: rethink every ${secondsWords(commitDurationS(defaults.ta))}`,
            },
            { id: 'never', label: 'Never rethink' },
          ]}
          value={preset}
          onChange={(id) => (id === 'diffusion' ? set(defaults.tp, defaults.ta) : set(MAX_TP, MAX_TP))}
          testId="horizon-preset"
        />
      }
      adjust={
        <>
          <div className="grid basis-full gap-3 sm:grid-cols-2">
            <ControlField>
              <ControlLabel htmlFor="rh-tp" value={`${clamped.tp} steps`}>
                Steps planned
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
              <SliderEnds low={`${MIN_TP} steps`} high={`${MAX_TP} steps`} />
            </ControlField>
            <ControlField>
              <ControlLabel htmlFor="rh-ta" value={`${clamped.ta} steps`}>
                Steps acted on
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
              <SliderEnds low="1 step" high={`${MAX_TP} steps`} />
            </ControlField>
          </div>
          <InstrumentReset onClick={() => set(defaults.tp, defaults.ta)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Plans {secondsWords(commitDurationS(clamped.tp))} ahead and acts on the first{' '}
                {secondsWords(commitDurationS(clamped.ta))}: it rethinks{' '}
                <span data-testid="rh-replan-readout" style={{ color: action }}>
                  {rateWords(replanRateHz(clamped.ta))}
                </span>
                , acting on{' '}
                <span data-testid="rh-commit-readout" style={{ color: action }}>
                  {secondsWords(commitDurationS(clamped.ta))}
                </span>{' '}
                of each plan
              </StageReadout>
              <StageStatus>A schematic of the replanning cycle, not a recorded run.</StageStatus>
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
              xTicks={xTicks}
              formatX={(s) => (s === 0 ? '0' : (s / CONTROL_HZ).toFixed(1))}
              xLabel="seconds"
              grid={false}
              yAxis={false}
            />
            {chunks.map((c) => {
              const top = laneTop(c.index);
              const commitWidth = f(Math.max(0, x(Math.min(c.commitEnd, domainEnd)) - x(c.start)));
              const tailWidth = f(Math.max(0, x(Math.min(c.planEnd, domainEnd)) - x(c.commitEnd)));
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
                      plan {c.index + 1}
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
            <StageAnnotation x={noteX} y={NOTE_Y} lines={noteLines} from={noteFrom} target={target} />
          </PlotStage>
        </FigureStage>
      }
      caption="Acting on only the first half of each plan, then replanning, lets the robot react to what it sees while still moving smoothly."
      method={
        <>
          <p>
            This is receding-horizon control. Each plan predicts T_p actions and the robot executes the
            first T_a before it plans again; the dashed rest of each plan is replaced by the next plan
            and never executed. The presets use the Diffusion Policy setting, T_p = {defaults.tp} and
            T_a = {defaults.ta} at {CONTROL_HZ} Hz: 1.25 replans a second and 0.8 s committed per plan.
            “Never rethink” sets both to {MAX_TP}, so the robot runs each plan open-loop. Now T_p ={' '}
            {clamped.tp}, T_a = {clamped.ta}: {replanRate} replan rate, {committed} committed per plan.
            The lanes are a schematic, not a recorded run.
          </p>
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
      source="Schematic of the replanning cycle; the preset uses the Diffusion Policy setting: plan 16 steps, act on 8, ten steps a second."
    />
  );
}
