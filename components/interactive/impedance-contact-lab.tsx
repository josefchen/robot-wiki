'use client';

import { useId, useState } from 'react';
import {
  CRUSH_LIMIT_N,
  DEFAULT_PARAMS,
  EFFECTIVE_MASS_KG,
  SLIDER_SPECS,
  classifyOutcome,
  effectiveStiffness,
  simulateContact,
  type HardwareMode,
  type LabParams,
} from '@/lib/impedance';
import {
  TRANSIENT_CONTACT_LIMIT_CITATION,
  TRANSIENT_CONTACT_LIMIT_LABEL,
  TRANSIENT_CONTACT_LIMIT_N,
} from '@/lib/force-limits';
import { cx } from '@/lib/utils';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
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
  ConstraintHatch,
  LegendSwatch,
  roleColour,
  type PlotRect,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * ImpedanceContactLab: a one-dimensional compliant-contact lab. A
 * commanded penetration depth into a rigid surface (the position error a
 * real controller holds when the surface is 2 mm nearer than the model
 * said), a desired stiffness K and damping D, and a hardware selector with
 * three options: position-controlled geared arm, torque-controlled arm,
 * series-elastic joint.
 *
 * The teaching move: selecting the position-controlled arm greys out K and
 * D with the NATIVE disabled attribute (not aria-disabled; a disabled
 * control is honestly unavailable rather than focusable-and-inert) and
 * pins the force readout to an unbounded label, because a position loop
 * has no force channel at all: the hardware claim of the section is
 * something the reader discovers rather than reads.
 *
 * The chart draws the contact-force trace against the object's crush limit
 * and the transient contact-force limit for the relevant body region, whose
 * research basis the legend states and the source line cites, from the
 * shared lib/force-limits module that the frontier safety instrument also
 * imports.
 *
 * Interactive contract: deterministic simulation recomputed from pure
 * functions on every input change (no interval needed: the trace is a
 * fixed-horizon response), native range inputs and a native radio group
 * (keyboard-accessible), visible readouts, Reset restoring the defaults,
 * fixed SVG viewport (no layout shift).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 204;
const PLOT: PlotRect = { left: 36, right: 322, top: 26, bottom: 158 };
/** Force axis ceiling, N: comfortably above the transient limit so both
 * reference lines and every reachable trace fit. */
const AXIS_MAX_N = 320;
/** The simulated approach, s: simulateContact runs a fixed 0.6 s horizon. */
const HORIZON_S = 0.6;
const HATCH_ID = 'impedance-contact-hatch';

const HARDWARE_OPTIONS: ReadonlyArray<{ value: HardwareMode; label: string }> = [
  { value: 'position', label: 'position-controlled geared arm' },
  { value: 'torque', label: 'torque-controlled arm' },
  { value: 'sea', label: 'series-elastic joint' },
];

/**
 * A hardware option in the shared toggle look. Its native radio covers the
 * whole option, transparent, so the option is the radio's own hit target;
 * the checked option takes the selection fill and the focused one the
 * focus ring the hidden radio cannot paint.
 */
const HARDWARE_OPTION_CLASS = cx(
  INSTRUMENT_TOGGLE_CLASS,
  'relative cursor-pointer has-[:checked]:bg-highlight has-[:checked]:text-ink has-[:checked]:no-underline has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
);

const DISABLED_SLIDER_CLASS = 'disabled:cursor-not-allowed disabled:opacity-40';

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

function xFor(seconds: number): number {
  return PLOT.left + (seconds / HORIZON_S) * (PLOT.right - PLOT.left);
}

function yFor(forceN: number): number {
  const clamped = Math.min(forceN, AXIS_MAX_N);
  return PLOT.bottom - (clamped / AXIS_MAX_N) * (PLOT.bottom - PLOT.top);
}

/** Tick labels in seconds, the zero bare. */
const formatSeconds = (s: number) => (s === 0 ? '0' : s.toFixed(1));

export function ImpedanceContactLab({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<LabParams>(DEFAULT_PARAMS);

  const positionMode = params.hardware === 'position';
  const run = simulateContact(params);
  const outcome = classifyOutcome(params, run);
  const kEff = effectiveStiffness(params.hardware);

  const outcomeText: Record<typeof outcome, string> = {
    success: 'task succeeded',
    crushed: 'object crushed',
    'over-limit': 'contact-force limit exceeded',
    unbounded: 'unbounded by construction',
  };

  const setParam = <K extends keyof LabParams>(key: K, value: LabParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const reset = () => setParams(DEFAULT_PARAMS);

  // The force trace over the run's simulated time, clamped to the axis.
  const path = run.steps
    .map((s, i) => {
      const x = xFor((i / (run.steps.length - 1)) * HORIZON_S);
      const y = yFor(s.forceN);
      return `${i === 0 ? 'M' : 'L'} ${f(x)} ${f(y)}`;
    })
    .join(' ');

  const constraint = roleColour('constraint');
  const failedTone = outcome === 'success' ? undefined : { color: constraint };
  const plotWidth = PLOT.right - PLOT.left;
  const noteX = (PLOT.left + PLOT.right) / 2;
  const noteY = yFor(AXIS_MAX_N / 2);

  return (
    <InstrumentFigure
      figureId="impedance-contact-lab"
      data-testid="impedance-lab"
      className={className}
      heading="Contact force against a stiff surface"
      controls={
        <>
          {/* A native radio group: tab-reachable in visual order and
              arrow-key operable. */}
          <fieldset className="m-0 flex basis-full flex-wrap items-center gap-2 border-0 p-0">
            <legend className="float-left mr-1 font-sans text-[13px] text-text-dim">
              hardware
            </legend>
            {HARDWARE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                data-brand-surface-id="surface:flat"
                className={HARDWARE_OPTION_CLASS}
              >
                <input
                  type="radio"
                  data-brand-control-id="control:selection"
                  name={`${uid}-hardware`}
                  value={opt.value}
                  checked={params.hardware === opt.value}
                  onChange={() => setParam('hardware', opt.value)}
                  aria-label={opt.label}
                  data-testid={`impedance-hardware-${opt.value}`}
                  className="absolute inset-0 m-0 cursor-pointer opacity-0"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          {/* In position mode K and D are natively disabled: not
              tab-reachable, visibly greyed, honestly unavailable. */}
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-depth`}
              value={
                <span data-testid="impedance-depth-value">
                  {(params.depthM * 1000).toFixed(1)}
                </span>
              }
            >
              depth (mm)
            </ControlLabel>
            <input
              id={`${uid}-depth`}
              type="range"
              data-brand-control-id="control:input"
              min={SLIDER_SPECS.depth.min}
              max={SLIDER_SPECS.depth.max}
              step={SLIDER_SPECS.depth.step}
              value={params.depthM}
              onChange={(e) => setParam('depthM', Number(e.target.value))}
              aria-label={`Commanded penetration depth in millimetres, currently ${(params.depthM * 1000).toFixed(1)}`}
              data-testid="impedance-depth-slider"
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-stiffness`}
              value={
                <span data-testid="impedance-stiffness-value">
                  {params.stiffnessKNPerM.toFixed(0)}
                </span>
              }
            >
              stiffness K (N/m)
            </ControlLabel>
            <input
              id={`${uid}-stiffness`}
              type="range"
              data-brand-control-id="control:input"
              min={SLIDER_SPECS.stiffness.min}
              max={SLIDER_SPECS.stiffness.max}
              step={SLIDER_SPECS.stiffness.step}
              value={params.stiffnessKNPerM}
              onChange={(e) => setParam('stiffnessKNPerM', Number(e.target.value))}
              disabled={positionMode}
              aria-label={`Desired stiffness in newtons per metre, currently ${params.stiffnessKNPerM.toFixed(0)}`}
              data-testid="impedance-stiffness-slider"
              className={cx(INSTRUMENT_SLIDER_CLASS, DISABLED_SLIDER_CLASS)}
            />
          </ControlField>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-damping`}
              value={
                <span data-testid="impedance-damping-value">
                  {params.dampingNPerM.toFixed(0)}
                </span>
              }
            >
              damping D (N·s/m)
            </ControlLabel>
            <input
              id={`${uid}-damping`}
              type="range"
              data-brand-control-id="control:input"
              min={SLIDER_SPECS.damping.min}
              max={SLIDER_SPECS.damping.max}
              step={SLIDER_SPECS.damping.step}
              value={params.dampingNPerM}
              onChange={(e) => setParam('dampingNPerM', Number(e.target.value))}
              disabled={positionMode}
              aria-label={`Desired damping in newton-seconds per metre, currently ${params.dampingNPerM.toFixed(0)}`}
              data-testid="impedance-damping-slider"
              className={cx(INSTRUMENT_SLIDER_CLASS, DISABLED_SLIDER_CLASS)}
            />
          </ControlField>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the lab to the torque-controlled defaults"
          />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="impedance-force" swatch={<LegendSwatch role="state" mark="line" />}>
                  contact force
                </LegendItem>
                <LegendItem series="impedance-crush" swatch={<LegendSwatch role="constraint" mark="dash" />}>
                  <span data-testid="impedance-crush-label">object crush limit {CRUSH_LIMIT_N} N</span>
                </LegendItem>
                <LegendItem series="impedance-limit" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  <span data-testid="impedance-limit-label">{TRANSIENT_CONTACT_LIMIT_LABEL}</span>
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="flex flex-wrap gap-x-3">
                <span>
                  steady{' '}
                  <span data-testid="impedance-steady-readout">
                    {positionMode ? 'unbounded' : `${run.steadyForceN.toFixed(1)} N`}
                  </span>
                </span>
                <span>
                  peak{' '}
                  <span data-testid="impedance-peak-readout" style={failedTone}>
                    {positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} N`}
                  </span>
                </span>
                <span>
                  outcome{' '}
                  <span data-testid="impedance-outcome-readout" style={failedTone}>
                    {outcomeText[outcome]}
                  </span>
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current contact lab settings and outcome"
                description={
                  positionMode
                    ? `With the position-controlled geared arm selected, stiffness and damping are unavailable and the contact force is unbounded by construction: the position loop has no force channel.`
                    : `On the ${HARDWARE_OPTIONS.find((o) => o.value === params.hardware)?.label ?? ''} at depth ${(params.depthM * 1000).toFixed(1)} mm, stiffness ${params.stiffnessKNPerM.toFixed(0)} N/m and damping ${params.dampingNPerM.toFixed(0)} N·s/m, the contact peaks at ${run.peakForceN.toFixed(1)} N and settles at ${run.steadyForceN.toFixed(1)} N against the ${TRANSIENT_CONTACT_LIMIT_N} N research-basis transient limit: ${outcomeText[outcome]}.`
                }
                states={[
                  { label: 'depth', value: `${(params.depthM * 1000).toFixed(1)} mm` },
                  { label: 'K', value: positionMode ? 'n/a' : `${params.stiffnessKNPerM.toFixed(0)} N/m` },
                  { label: 'D', value: positionMode ? 'n/a' : `${params.dampingNPerM.toFixed(0)} N·s/m` },
                  { label: 'peak', value: positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} N` },
                  { label: 'outcome', value: outcomeText[outcome] },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Contact force over the approach. Peak ${positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} newtons`}, outcome ${outcomeText[outcome]}.`}
            aria-describedby={descriptionId}
            data-testid="impedance-chart"
          >
            <ChartAxes
              plot={PLOT}
              x={xFor}
              y={yFor}
              xTicks={[0, 0.2, 0.4, 0.6]}
              yTicks={[0, 100, 200, 300]}
              formatX={formatSeconds}
              xLabel="time (s)"
              yLabel="contact force (N)"
            />
            {/* The band above the transient limit, the region no contact
                may enter. */}
            <g data-series="impedance-limit" data-chart-role="constraint">
              <ConstraintHatch
                id={HATCH_ID}
                x={PLOT.left}
                y={PLOT.top}
                width={plotWidth}
                height={f(yFor(TRANSIENT_CONTACT_LIMIT_N) - PLOT.top)}
              />
            </g>
            <g data-series="impedance-crush" data-chart-role="constraint">
              <line
                x1={PLOT.left}
                y1={f(yFor(CRUSH_LIMIT_N))}
                x2={PLOT.right}
                y2={f(yFor(CRUSH_LIMIT_N))}
                stroke={constraint}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
            </g>
            {positionMode ? (
              <text
                data-scene-note=""
                x={noteX}
                y={noteY}
                textAnchor="middle"
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.label}
              >
                <tspan x={noteX}>no force channel:</tspan>
                <tspan x={noteX} dy={CHART_TYPE.axisPx * 1.4}>
                  the position loop pins the contact force
                </tspan>
              </text>
            ) : (
              <g data-series="impedance-force" data-chart-role="state">
                <path
                  data-testid="impedance-force-trace"
                  d={path}
                  fill="none"
                  stroke={roleColour('state')}
                  strokeWidth={CHART_STROKE.trace}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            )}
          </PlotStage>
        </FigureStage>
      }
      caption="A softer K lowers the peak contact force; a position-controlled arm has no force channel to program."
      source={
        <>
          Schematic model: a {EFFECTIVE_MASS_KG} kg end-effector mass on a{' '}
          {(kEff / 1000).toFixed(kEff < 10_000 ? 1 : 0)} kN/m contact spring.
          Limit from measured pain thresholds{' '}
          <CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />, in place of the
          paywalled ISO/TS 15066 table.
        </>
      }
    />
  );
}
