'use client';

import { useId, useState, type ChangeEvent } from 'react';
import {
  CRUSH_LIMIT_N,
  DEFAULT_PARAMS,
  EFFECTIVE_MASS_KG,
  ENVIRONMENT_STIFFNESS_N_PER_M,
  SEA_SPRING_STIFFNESS_N_PER_M,
  SLIDER_SPECS,
  classifyOutcome,
  simulateContact,
  type HardwareMode,
  type LabParams,
  type TaskOutcome,
} from '@/lib/impedance';
import {
  TRANSIENT_CONTACT_LIMIT_CITATION,
  TRANSIENT_CONTACT_LIMIT_LABEL,
  TRANSIENT_CONTACT_LIMIT_N,
} from '@/lib/force-limits';
import { cx } from '@/lib/utils';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  StageAnnotation,
  roleColour,
  type PlotRect,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * ImpedanceContactLab: a one-dimensional compliant-contact lab. A
 * fingertip presses a fragile object, and the chart shows the push on the
 * object over the first 0.6 s against the force that crushes it. "Which
 * arm?" picks the hardware: a stiff geared arm that only follows a
 * position, an arm that controls its own push (torque control) or an arm
 * with a built-in spring (series-elastic joint). "Softness" sets the
 * commanded stiffness K. Press depth, damping D, the exact readouts and
 * Reset sit in "Adjust more".
 *
 * The teaching move: the stiff geared arm greys out softness and damping
 * with the NATIVE disabled attribute (a disabled control is honestly
 * unavailable rather than focusable-and-inert) and reads unbounded,
 * because a position loop has no force channel at all.
 *
 * The chart's only reference is the crush line. The transient
 * contact-force limit from the shared lib/force-limits module sits about
 * ten times higher, so the stage points at it with an off-chart arrow, and
 * the method fold renders its label: the string the frontier safety
 * instrument also renders.
 *
 * Interactive contract: deterministic simulation recomputed from pure
 * functions on every input change (no interval: the trace is a
 * fixed-horizon response), native range inputs and a native radio group
 * (keyboard-accessible), readouts, Reset restoring the defaults, fixed SVG
 * viewport (no layout shift).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 280;
const PLOT: PlotRect = { left: 36, right: 322, top: 96, bottom: 232 };
/** Force axis ceiling, N: the default first bump fills about half of it. */
const AXIS_MAX_N = 50;
/** The simulated approach, s: simulateContact runs a fixed 0.6 s horizon. */
const HORIZON_S = 0.6;
/** The table under the object, in the band above the chart. */
const TABLE_Y = 66;
const OBJECT = { x: 70, y: 52, rx: 11, ry: 13 };

const HARDWARE_OPTIONS: ReadonlyArray<{ value: HardwareMode; label: string }> = [
  { value: 'position', label: 'Stiff geared arm' },
  { value: 'torque', label: 'Arm that controls its own push' },
  { value: 'sea', label: 'Arm with a built-in spring' },
];

const OUTCOME_TEXT: Record<TaskOutcome, string> = {
  success: 'object intact',
  crushed: 'object crushed',
  'over-limit': 'past the human pain limit',
  unbounded: 'no force control',
};

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

/** The first bump against the crush force, in the reader's words. */
function bumpWords(peakN: number): readonly string[] {
  if (peakN > AXIS_MAX_N) return ['First bump: off the chart,', 'far past the crushing force'];
  if (peakN > CRUSH_LIMIT_N) return ['First bump: past', 'the crushing force'];
  if (peakN >= 0.8 * CRUSH_LIMIT_N) return ['First bump: just under', 'the crushing force'];
  return ['First bump: well under', 'the crushing force'];
}

/**
 * The band above the chart: the fingertip pressing the object on its
 * table, drawn in the trace's colour so the line below reads as this
 * push. The spring arm shows its spring; a broken object shows a crack.
 */
function ContactSketch({ hardware, outcome }: { hardware: HardwareMode; outcome: TaskOutcome }) {
  const push = roleColour('state');
  const top = OBJECT.y - OBJECT.ry;
  const left = OBJECT.x - 7;
  const cracked = outcome === 'crushed' || outcome === 'over-limit';
  const spring = Array.from({ length: 7 }, (_, i) => `${OBJECT.x + (i % 2 === 0 ? 0 : i % 4 === 1 ? 6 : -6)},${8 + i * (16 / 6)}`);
  return (
    <g data-testid="impedance-contact-sketch" data-hardware={hardware}>
      <g stroke={CHART_STRUCTURE.axes}>
        <line x1={30} y1={TABLE_Y + 0.5} x2={124} y2={TABLE_Y + 0.5} strokeWidth={CHART_STROKE.structure} />
        <g opacity={CHART_STRUCTURE.axesOpacity}>
          {Array.from({ length: 8 }, (_, i) => 40 + i * 12).map((x) => (
            <line key={x} x1={x} y1={TABLE_Y + 0.5} x2={x - 4} y2={TABLE_Y + 5} strokeWidth={CHART_STROKE.structure} />
          ))}
        </g>
      </g>
      <ellipse
        data-testid="impedance-object"
        cx={OBJECT.x}
        cy={OBJECT.y}
        rx={OBJECT.rx}
        ry={OBJECT.ry}
        fill={MOTION_STAGE.background}
        stroke={CHART_STRUCTURE.label}
        strokeWidth={CHART_STROKE.trace}
      />
      {cracked ? (
        <polyline
          data-testid="impedance-object-crack"
          points={`${OBJECT.x - 10},${OBJECT.y - 1} ${OBJECT.x - 5},${OBJECT.y + 4} ${OBJECT.x},${OBJECT.y - 3} ${OBJECT.x + 5},${OBJECT.y + 4} ${OBJECT.x + 10},${OBJECT.y - 1}`}
          fill="none"
          stroke={roleColour('constraint')}
          strokeWidth={CHART_STROKE.trace}
        />
      ) : null}
      {hardware === 'sea' ? (
        <>
          <rect x={left} y={-8} width={14} height={16} rx={3} fill={push} />
          <polyline points={spring.join(' ')} fill="none" stroke={push} strokeWidth={CHART_STROKE.trace} />
          <rect x={left} y={24} width={14} height={top - 24} rx={7} fill={push} />
        </>
      ) : (
        <rect x={left} y={-8} width={14} height={top + 8} rx={hardware === 'position' ? 2 : 7} fill={push} />
      )}
      <LabelLines
        x={96}
        y={42}
        lines={[`Crushes at ${CRUSH_LIMIT_N} newtons,`, `the weight of a ${(CRUSH_LIMIT_N / 9.81).toFixed(1)} kg bag`]}
      />
    </g>
  );
}

/**
 * A direct label over several lines. The stage holds its type at one CSS
 * size while the viewBox stretches, so the lines step in ems.
 */
function LabelLines({
  x,
  y,
  lines,
  anchor = 'start',
  role,
}: {
  x: number;
  y: number;
  lines: readonly string[];
  anchor?: 'start' | 'end' | 'middle';
  role?: 'constraint';
}) {
  return (
    <text
      data-chart-label=""
      data-chart-role={role}
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.labelPx}
      fill={role ? roleColour(role) : CHART_STRUCTURE.label}
    >
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? 0 : '1.25em'}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * The pain limit, far above the chart: an arrow out of its top edge. One
 * line, so the space under it stays free for the first-bump note.
 */
function PainLimitArrow() {
  const colour = roleColour('constraint');
  const x = PLOT.right - 6;
  const tipY = PLOT.top - 6;
  return (
    <g data-testid="impedance-pain-arrow" data-chart-role="constraint">
      <line x1={x} y1={PLOT.top + 18} x2={x} y2={tipY + 6} stroke={colour} strokeWidth={CHART_STROKE.trace} />
      <polygon points={`${x},${tipY} ${x - 4.5},${tipY + 8} ${x + 4.5},${tipY + 8}`} fill={colour} />
      <DirectLabel x={x - 9} y={PLOT.top + 14} anchor="end" role="constraint">
        Human pain limit: about {Math.round(TRANSIENT_CONTACT_LIMIT_N / CRUSH_LIMIT_N)} times higher
      </DirectLabel>
    </g>
  );
}

/**
 * Where the first-bump note sits: under the crush line beside a small
 * bump, at the top left above a bump that nears the line, and to the right
 * of a bump that crosses it.
 */
function notePlacement(peakN: number, bump: readonly [number, number]): { x: number; y: number } {
  if (peakN < 0.5 * CRUSH_LIMIT_N) return { x: bump[0] + 12, y: f(bump[1] - 34) };
  if (peakN <= CRUSH_LIMIT_N) return { x: PLOT.left + 8, y: PLOT.top + 42 };
  return { x: bump[0] + 12, y: PLOT.top + 34 };
}

/** The index where the first bump ends: the force back at zero or at its first low. */
function firstBumpEnd(forces: readonly number[], peakIndex: number): number {
  let end = peakIndex;
  while (end < forces.length - 1 && forces[end + 1] > 0 && forces[end + 1] <= forces[end]) end += 1;
  return Math.min(end + 1, forces.length - 1);
}

export function ImpedanceContactLab({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<LabParams>(DEFAULT_PARAMS);

  const positionMode = params.hardware === 'position';
  const run = simulateContact(params);
  const outcome = classifyOutcome(params, run);
  const armLabel = HARDWARE_OPTIONS.find((o) => o.value === params.hardware)?.label ?? '';

  const setParam = <K extends keyof LabParams>(key: K, value: LabParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const reset = () => setParams(DEFAULT_PARAMS);

  // The push over the run's simulated time, clamped to the axis. The first
  // bump, the one the note names, is the run's largest: every later bounce
  // is smaller, and is drawn fainter.
  const last = run.steps.length - 1;
  const forces = run.steps.map((s) => s.forceN);
  const pointAt = (i: number) => `${f(xFor((i / last) * HORIZON_S))} ${f(yFor(forces[i]))}`;
  const peakIndex = forces.reduce((best, v, i) => (v > forces[best] ? i : best), 0);
  const split = firstBumpEnd(forces, peakIndex);
  const pathOver = (from: number, to: number) =>
    forces
      .slice(from, to + 1)
      .map((_, k) => `${k === 0 ? 'M' : 'L'} ${pointAt(from + k)}`)
      .join(' ');
  const bump: [number, number] = [f(xFor((peakIndex / last) * HORIZON_S)), f(yFor(run.peakForceN))];
  const note = notePlacement(run.peakForceN, bump);

  const constraint = roleColour('constraint');
  const failedTone = outcome === 'success' ? undefined : { color: constraint };
  const crushY = f(yFor(CRUSH_LIMIT_N));
  const noteX = (PLOT.left + PLOT.right) / 2;
  const depthMm = (params.depthM * 1000).toFixed(1);
  const peakText = positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} N`;

  // The accessible-name baseline reads aria-label attributes from source, so each slider keeps its own.
  const sliderProps = (
    key: 'depthM' | 'stiffnessKNPerM' | 'dampingNPerM',
    spec: { min: number; max: number; step: number },
    id: string,
    disabled = false,
  ) => ({
    id: `${uid}-${id}`,
    min: spec.min,
    max: spec.max,
    step: spec.step,
    value: params[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setParam(key, Number(e.target.value)),
    disabled,
    'data-testid': `impedance-${id}-slider`,
    className: cx(INSTRUMENT_SLIDER_CLASS, disabled ? DISABLED_SLIDER_CLASS : undefined),
  });

  const controls = (
    <>
      {/* A native radio group: tab-reachable in visual order and
          arrow-key operable. */}
      <fieldset className="m-0 flex basis-full flex-wrap items-center gap-2 border-0 p-0">
        <legend className="float-left mr-1 font-sans text-sm text-text-dim">Which arm?</legend>
        {HARDWARE_OPTIONS.map((opt) => (
          <label key={opt.value} data-brand-surface-id="surface:flat" className={HARDWARE_OPTION_CLASS}>
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
      {/* On the stiff geared arm softness and damping are natively
          disabled: not tab-reachable, visibly greyed, honestly unavailable. */}
      <ControlField>
        <ControlLabel htmlFor={`${uid}-stiffness`}>Softness</ControlLabel>
        <input
          type="range"
          data-brand-control-id="control:input"
          {...sliderProps('stiffnessKNPerM', SLIDER_SPECS.stiffness, 'stiffness', positionMode)}
          aria-label={`Softness: desired stiffness in newtons per metre, currently ${params.stiffnessKNPerM.toFixed(0)}`}
        />
        <SliderEnds low="soft" high="stiff" />
      </ControlField>
    </>
  );

  const adjust = (
    <>
      <ControlField>
        <ControlLabel htmlFor={`${uid}-depth`} value={<span data-testid="impedance-depth-value">{depthMm} mm</span>}>
          How far it presses in
        </ControlLabel>
        <input
          type="range"
          data-brand-control-id="control:input"
          {...sliderProps('depthM', SLIDER_SPECS.depth, 'depth')}
          aria-label={`How far it presses in: commanded press depth in millimetres, currently ${depthMm}`}
        />
      </ControlField>
      <ControlField>
        <ControlLabel
          htmlFor={`${uid}-damping`}
          value={<span data-testid="impedance-damping-value">{params.dampingNPerM.toFixed(0)}</span>}
        >
          Calm the bounce
        </ControlLabel>
        <input
          type="range"
          data-brand-control-id="control:input"
          {...sliderProps('dampingNPerM', SLIDER_SPECS.damping, 'damping', positionMode)}
          aria-label={`Calm the bounce: desired damping in newton-seconds per metre, currently ${params.dampingNPerM.toFixed(0)}`}
        />
      </ControlField>
      <InstrumentReset onClick={reset} aria-label="Reset the lab to the arm that controls its own push" />
      <InstrumentReadout className="flex basis-full flex-wrap gap-x-3">
        <span>
          softness <span data-testid="impedance-stiffness-value">{params.stiffnessKNPerM.toFixed(0)}</span> N/m
        </span>
        <span>
          settles at{' '}
          <span data-testid="impedance-steady-readout">
            {positionMode ? 'unbounded' : `${run.steadyForceN.toFixed(1)} N`}
          </span>
        </span>
        <span>
          peak <span data-testid="impedance-peak-readout" style={failedTone}>{peakText}</span>
        </span>
        <span>
          outcome <span data-testid="impedance-outcome-readout" style={failedTone}>{OUTCOME_TEXT[outcome]}</span>
        </span>
      </InstrumentReadout>
    </>
  );

  return (
    <InstrumentFigure
      figureId="impedance-contact-lab"
      data-testid="impedance-lab"
      className={className}
      kicker="Impedance control"
      heading="A softer arm touches gently enough not to crush"
      controls={controls}
      adjust={adjust}
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A fingertip pressing a fragile object: the push over time peaks at ${
              positionMode ? 'an unbounded force' : `${run.peakForceN.toFixed(1)} newtons`
            }, ${OUTCOME_TEXT[outcome]}.`}
            aria-describedby={descriptionId}
            data-testid="impedance-chart"
          >
            <ContactSketch hardware={params.hardware} outcome={outcome} />
            <ChartAxes
              plot={PLOT}
              x={xFor}
              y={yFor}
              xTicks={[0, 0.2, 0.4, 0.6]}
              yTicks={[0, 10, 20, 30, 40, 50]}
              formatX={formatSeconds}
              xLabel="time (seconds)"
              yLabel="push on the object (newtons)"
            />
            {positionMode ? null : (
              <g data-series="impedance-force" data-chart-role="state" stroke={roleColour('state')}>
                <path
                  data-testid="impedance-force-trace"
                  d={pathOver(0, split)}
                  fill="none"
                  strokeWidth={CHART_STROKE.trace}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {split < last ? (
                  <path
                    d={pathOver(split, last)}
                    fill="none"
                    strokeWidth={CHART_STROKE.trace}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.4}
                  />
                ) : null}
              </g>
            )}
            <g data-series="impedance-crush" data-chart-role="constraint">
              <line
                x1={PLOT.left}
                y1={crushY}
                x2={PLOT.right}
                y2={crushY}
                stroke={constraint}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={PLOT.right - 2} y={crushY - 5} anchor="end" role="constraint">
                <tspan data-testid="impedance-crush-label">crushes the object</tspan>
              </DirectLabel>
            </g>
            <PainLimitArrow />
            {positionMode ? (
              <text
                data-scene-note=""
                x={noteX}
                y={f(yFor(12))}
                textAnchor="middle"
                fontSize={CHART_TYPE.labelPx}
                fill={CHART_STRUCTURE.label}
              >
                <tspan x={noteX}>This arm only follows a position:</tspan>
                <tspan x={noteX} dy="1.25em">
                  nothing sets how hard it pushes
                </tspan>
              </text>
            ) : (
              <StageAnnotation x={note.x} y={note.y} lines={bumpWords(run.peakForceN)} target={bump} />
            )}
          </PlotStage>
        </FigureStage>
      }
      caption="An arm that controls how hard it pushes can be tuned to touch gently; a position-only arm has no such dial."
      method={
        <>
          <p>
            An illustrative model, not measured: a {EFFECTIVE_MASS_KG} kg fingertip mass starts 0.5 mm above the
            object and is commanded {depthMm} mm into it. The object is a stiff{' '}
            {ENVIRONMENT_STIFFNESS_N_PER_M / 1000} kN/m contact spring that crushes at {CRUSH_LIMIT_N} N, at the
            first bump or once settled. The arm that controls its own push runs an impedance law with stiffness K
            (Softness, {params.stiffnessKNPerM.toFixed(0)} N/m) and damping D (Calm the bounce,{' '}
            {params.dampingNPerM.toFixed(0)} N·s/m). The arm with a built-in spring adds an{' '}
            {SEA_SPRING_STIFFNESS_N_PER_M} N/m spring in series with the contact. The stiff geared arm only
            follows its commanded position, so the force is whatever the position error makes it. The chart stops
            at {AXIS_MAX_N} N and clips any bump above it. Pain limit:{' '}
            <span data-testid="impedance-limit-label">{TRANSIENT_CONTACT_LIMIT_LABEL}</span>, measured with a
            wedge-shaped impactor, used in place of the paywalled ISO/TS 15066 table.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current contact lab settings and outcome"
            description={
              positionMode
                ? 'With the stiff geared arm selected, softness and damping are unavailable and the contact force is unbounded by construction: the position loop has no force channel.'
                : `On the ${armLabel.toLowerCase()} at press depth ${depthMm} mm, stiffness ${params.stiffnessKNPerM.toFixed(0)} N/m and damping ${params.dampingNPerM.toFixed(0)} N·s/m, the contact peaks at ${run.peakForceN.toFixed(1)} N, ${run.peakForceN > CRUSH_LIMIT_N ? 'over' : 'under'} the ${CRUSH_LIMIT_N} N crush force, and settles at ${run.steadyForceN.toFixed(1)} N; the ${TRANSIENT_CONTACT_LIMIT_N} N research-basis transient limit is ${run.peakForceN > TRANSIENT_CONTACT_LIMIT_N ? 'exceeded' : 'not reached'}: ${OUTCOME_TEXT[outcome]}.`
            }
            states={[
              { label: 'depth', value: `${depthMm} mm` },
              { label: 'K', value: positionMode ? 'n/a' : `${params.stiffnessKNPerM.toFixed(0)} N/m` },
              { label: 'D', value: positionMode ? 'n/a' : `${params.dampingNPerM.toFixed(0)} N·s/m` },
              { label: 'peak', value: peakText },
              { label: 'outcome', value: OUTCOME_TEXT[outcome] },
            ]}
          />
        </>
      }
      source={
        <>
          Illustrative model, not measured. Pain limit from measured pain thresholds{' '}
          <CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />.
        </>
      }
    />
  );
}
