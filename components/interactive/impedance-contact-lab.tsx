'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  CRUSH_LIMIT_N,
  DEFAULT_PARAMS,
  EFFECTIVE_MASS_KG,
  ENVIRONMENT_STIFFNESS_N_PER_M,
  SEA_SPRING_STIFFNESS_N_PER_M,
  SLIDER_SPECS,
  classifyOutcome,
  simulateContact,
  type ContactRun,
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
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  SliderEnds,
} from '@/components/ui/instrument';
import { roleColour } from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, Line, Solid, Wire } from '@/components/iso/react/draw';
import { Stage, asksForStillness } from '@/components/iso/react/live';
import {
  CRACK,
  CRUSH_N,
  HEIGHT,
  PARK_LIFT,
  PARTS,
  SCALE_N,
  SQUEEZE_PER_MM,
  STOP_N,
  WIDTH,
  knobAt,
  liftOf,
  needleAt,
  peakAt,
  springAt,
  type LiveId,
  type Part,
} from '@/components/iso/figures/press-test-stand';

/**
 * ImpedanceContactLab: a one-dimensional compliant-contact lab, drawn as a
 * press test stand (components/iso/figures/press-test-stand.ts). A head
 * slides down a column and presses a fingertip onto a glass vial on a load
 * cell; a force gauge wired to the load cell shows the push, its lit needle
 * the push now and a drag pointer the first bump, the hardest push, against
 * a shaded arc where the glass cracks. "Which arm?" swaps the head: a stiff
 * geared drive that only follows a position (it has no softness knob), an
 * arm that controls its own push (a knob on its motor sets the commanded
 * stiffness K) or the same arm with a coil spring built in. "Softness" turns
 * the knob. Press depth, damping D, the exact readouts and Reset sit in
 * "Adjust more".
 *
 * The teaching move: the stiff arm greys out softness and damping
 * with the NATIVE disabled attribute (a disabled control is honestly
 * unavailable rather than focusable-and-inert) and its push runs off the
 * gauge, because a position loop has no force channel at all.
 *
 * Every change of arm or setting presses again: the head lifts, comes down
 * and the contact plays out from the deterministic simulation, slowed for
 * the eye, then rests on the still pose (fingertip on the glass, needle at
 * the settled push, pointer at the first bump, the glass cracked or not).
 * The page opens on that still pose; reduced motion jumps to it.
 *
 * The gauge's only reference is the crush force. The transient
 * contact-force limit from the shared lib/force-limits module sits about
 * ten times higher, off the gauge; the method fold states it, with its
 * citation, in the string the frontier safety instrument also renders.
 *
 * Interactive contract: deterministic simulation recomputed from pure
 * functions on every input change, native range inputs and a native radio
 * group (keyboard-accessible), readouts, Reset restoring the opening
 * settings, fixed SVG viewport (no layout shift).
 */

const HARDWARE_OPTIONS: ReadonlyArray<{ value: HardwareMode; label: string }> = [
  { value: 'position', label: 'Stiff arm' },
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
 * the checked option reads like a selected text tab (ink over a 1 px
 * underline; nothing fills a figure control) and the focused one
 * takes the focus ring the hidden radio cannot paint.
 */
const HARDWARE_OPTION_CLASS = cx(
  INSTRUMENT_TOGGLE_CLASS,
  'relative cursor-pointer has-[:checked]:text-text has-[:checked]:underline has-[:checked]:decoration-1 has-[:checked]:underline-offset-[6px] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ink)]',
);

const DISABLED_SLIDER_CLASS = 'disabled:cursor-not-allowed disabled:opacity-40';

/** The gauge reads to 50 N; a bigger push rests on the stop pin past the scale. */
const AXIS_MAX_N = SCALE_N;
/** The simulated approach, s: simulateContact runs a fixed 0.6 s horizon, one trace sample a millisecond. */
const HORIZON_S = 0.6;
/** World units the fingertip rises per millimetre it is off the glass during the contact (drawn larger). */
const APPROACH_PER_MM = 8;
/** A press, in page seconds: the head lifts, comes down, the contact plays slowed, then settles. */
export const PRESS = { lift: 0.45, descend: 0.8, slow: 6, settle: 0.6 } as const;
export const PRESS_SECONDS = PRESS.lift + PRESS.descend + HORIZON_S * PRESS.slow + PRESS.settle;

/** What the stand shows at one instant: head and fingertip heights, spring squeeze, gauge and glass. */
export type PressPose = { lift: number; squeeze: number; newtons: number; peak: number; crack: number; pressing: boolean };

const smooth = (t: number) => {
  const u = Math.min(Math.max(t, 0), 1);
  return u * u * (3 - 2 * u);
};
/** The spring arm's squeeze, in world units, for a push in newtons. */
const squeezeOf = (newtons: number) => (newtons / SEA_SPRING_STIFFNESS_N_PER_M) * 1000 * SQUEEZE_PER_MM;

/** The still pose: the fingertip resting on the glass after the contact has settled. */
export function stillPose(hardware: HardwareMode, run: ContactRun, outcome: TaskOutcome): PressPose {
  const stiff = hardware === 'position';
  const newtons = stiff ? STOP_N : run.steadyForceN;
  return {
    lift: 0,
    squeeze: hardware === 'sea' ? squeezeOf(newtons) : 0,
    newtons,
    peak: stiff ? STOP_N : Math.min(run.peakForceN, STOP_N),
    crack: outcome === 'success' ? 0 : 1,
    pressing: false,
  };
}

/** The pose `t` page seconds into a press that started from `from`. */
export function pressAt(t: number, hardware: HardwareMode, run: ContactRun, outcome: TaskOutcome, from: PressPose): PressPose {
  const end = stillPose(hardware, run, outcome);
  const approach = 0.5 * APPROACH_PER_MM;
  if (t <= PRESS.lift) {
    const s = smooth(t / PRESS.lift);
    const k = 1 - s;
    return { lift: from.lift + (PARK_LIFT - from.lift) * s, squeeze: from.squeeze * k, newtons: from.newtons * k, peak: from.peak * k, crack: from.crack * k, pressing: true };
  }
  if (t <= PRESS.lift + PRESS.descend) {
    const s = smooth((t - PRESS.lift) / PRESS.descend);
    return { lift: PARK_LIFT + (approach - PARK_LIFT) * s, squeeze: 0, newtons: 0, peak: 0, crack: 0, pressing: true };
  }
  const runStart = PRESS.lift + PRESS.descend;
  const runEnd = runStart + HORIZON_S * PRESS.slow;
  const sampleAt = (seconds: number) => Math.min(run.steps.length - 1, Math.max(0, Math.floor(seconds * 1000 + 1e-9)));
  const stiff = hardware === 'position';
  const contactIndex = run.steps.findIndex((step) => step.forceN > 0);
  const poseAt = (index: number): PressPose => {
    const { state, forceN } = run.steps[index]!;
    const off = Math.max(0, -state.x) * 1000 * APPROACH_PER_MM;
    let peak = 0;
    for (let k = 0; k <= index; k += 1) peak = Math.max(peak, run.steps[k]!.forceN);
    if (stiff) {
      const touched = contactIndex >= 0 && index >= contactIndex;
      return { lift: touched ? 0 : off, squeeze: 0, newtons: touched ? STOP_N : 0, peak: touched ? STOP_N : 0, crack: touched ? 1 : 0, pressing: true };
    }
    const newtons = Math.min(forceN, STOP_N);
    return {
      lift: forceN > 0 ? 0 : off,
      squeeze: hardware === 'sea' && forceN > 0 ? squeezeOf(forceN) : 0,
      newtons,
      peak: Math.min(peak, STOP_N),
      crack: peak > CRUSH_N ? 1 : 0,
      pressing: true,
    };
  };
  if (t <= runEnd) return poseAt(sampleAt((t - runStart) / PRESS.slow));
  const last = poseAt(run.steps.length - 1);
  if (t >= runEnd + PRESS.settle) return end;
  const s = smooth((t - runEnd) / PRESS.settle);
  const mix = (a: number, b: number) => a + (b - a) * s;
  return {
    lift: mix(last.lift, end.lift),
    squeeze: mix(last.squeeze, end.squeeze),
    newtons: mix(last.newtons, end.newtons),
    peak: mix(last.peak, end.peak),
    crack: Math.max(last.crack, end.crack),
    pressing: true,
  };
}

/** The first bump against the crush force, in the reader's words. */
function bumpWords(peakN: number): string {
  if (peakN > AXIS_MAX_N) return 'off the scale, far past the crushing force';
  if (peakN > CRUSH_LIMIT_N) return 'past the crushing force';
  if (peakN >= 0.8 * CRUSH_LIMIT_N) return 'just under the crushing force';
  return 'well under the crushing force';
}

/** The resting readout: the first bump and where it falls. */
export function stillReadout(hardware: HardwareMode, run: ContactRun): string {
  if (hardware === 'position') return 'No force control: the push runs off the scale';
  return `First bump ${run.peakForceN.toFixed(1)} newtons · ${bumpWords(run.peakForceN)}`;
}

/** The readout while it presses, from the same instant as the gauge. */
export const pressingReadout = (pose: PressPose) =>
  pose.newtons >= STOP_N ? 'Pressing · past the scale' : `Pressing · ${pose.newtons.toFixed(1)} newtons on the glass`;

/** The stand's parts in painter's order, cut into runs of one group: static art, the head, the fingertip. */
function runsOf(parts: readonly Part[]) {
  const runs: Array<{ group: Part['group']; parts: Part[] }> = [];
  for (const part of parts) {
    const last = runs[runs.length - 1];
    if (last && last.group === part.group) last.parts.push(part);
    else runs.push({ group: part.group, parts: [part] });
  }
  return runs;
}
const RUNS = { position: runsOf(PARTS.position), torque: runsOf(PARTS.torque), sea: runsOf(PARTS.sea) };

function StandPart({ part }: { part: Part }) {
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
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  return null;
}

type StandRefs = {
  /** The head and the fingertip are each drawn in several runs (the spring sits between them), all moved together. */
  head: Map<number, SVGGElement | null>;
  tip: Map<number, SVGGElement | null>;
  needle: SVGPathElement | null;
  peak: SVGPathElement | null;
  peakTip: SVGCircleElement | null;
  crack: SVGPathElement | null;
  springBack: SVGPathElement | null;
  springBackCore: SVGPathElement | null;
  springFront: SVGPathElement | null;
  springFrontCore: SVGPathElement | null;
  springEnds: SVGGElement | null;
};

/** Write one pose into the drawing. */
function drawStand(refs: StandRefs, pose: PressPose) {
  refs.head.forEach((group) => group?.setAttribute('transform', liftOf(pose.lift - pose.squeeze)));
  refs.tip.forEach((group) => group?.setAttribute('transform', liftOf(pose.lift)));
  refs.needle?.setAttribute('d', needleAt(pose.newtons));
  const peak = peakAt(pose.peak);
  refs.peak?.setAttribute('d', peak.d);
  refs.peakTip?.setAttribute('cx', String(Math.round(peak.tip[0] * 10) / 10));
  refs.peakTip?.setAttribute('cy', String(Math.round(peak.tip[1] * 10) / 10));
  if (refs.crack) refs.crack.style.opacity = String(Math.round(pose.crack * 100) / 100);
  if (refs.springBack) {
    const spring = springAt(pose.lift, pose.squeeze);
    refs.springBack.setAttribute('d', spring.back);
    refs.springBackCore?.setAttribute('d', spring.back);
    refs.springFront?.setAttribute('d', spring.front);
    refs.springFrontCore?.setAttribute('d', spring.front);
    refs.springEnds?.querySelectorAll('circle').forEach((dot, index) => {
      const point = spring.ends[index];
      if (!point) return;
      dot.setAttribute('cx', String(Math.round(point[0] * 10) / 10));
      dot.setAttribute('cy', String(Math.round(point[1] * 10) / 10));
    });
  }
}

/** The stand is taller than it is wide, so its stage grows no wider than this viewBox width allows. */
const STAGE_WIDTH = 400;

/** The spring wire: a broad stroke with a pale core, so it reads as round wire. */
const WIRE_STYLE = { strokeWidth: 2.2 } as const;
const CORE_STYLE = { strokeWidth: 0.9 } as const;

export function ImpedanceContactLab({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<LabParams>(DEFAULT_PARAMS);

  const positionMode = params.hardware === 'position';
  // One run per setting: the press replays it and the still pose ends on it.
  const run = useMemo(() => simulateContact(params), [params]);
  const outcome = classifyOutcome(params, run);
  const armLabel = HARDWARE_OPTIONS.find((o) => o.value === params.hardware)?.label ?? '';

  const setParam = <K extends keyof LabParams>(key: K, value: LabParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const reset = () => setParams(DEFAULT_PARAMS);

  // Every change of arm or setting presses again, a moment after the reader stops moving the control; the
  // first render is the still pose, and reduced motion jumps to the still pose.
  const hardware = params.hardware;
  const still = stillPose(hardware, run, outcome);
  const refs = useRef<StandRefs>({
    head: new Map(), tip: new Map(), needle: null, peak: null, peakTip: null, crack: null, springBack: null,
    springBackCore: null, springFront: null, springFrontCore: null, springEnds: null,
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef<PressPose>(still);
  /** The run the stand last came to rest on: a re-run of the effect for the same run (React's dev double run) never presses. */
  const pressed = useRef<ContactRun | null>(null);
  const [pressing, setPressing] = useState(false);
  // A layout effect, so the stand is redrawn where it was before the browser paints the new setting's props.
  useLayoutEffect(() => {
    const readout = stageRef.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]');
    const rest = stillPose(hardware, run, outcome);
    const settle = () => {
      shown.current = rest;
      drawStand(refs.current, rest);
      if (readout) readout.textContent = stillReadout(hardware, run);
    };
    const first = pressed.current === null || pressed.current === run;
    pressed.current = run;
    if (first || asksForStillness()) {
      settle();
      return;
    }
    let frame = 0;
    let start = 0;
    const from = shown.current;
    drawStand(refs.current, from);
    if (readout) readout.textContent = pressingReadout(from);
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const pose = pressAt(t, hardware, run, outcome, from);
      shown.current = pose;
      drawStand(refs.current, pose);
      if (t >= PRESS_SECONDS) {
        settle();
        setPressing(false);
        return;
      }
      if (readout) readout.textContent = pressingReadout(pose);
      frame = requestAnimationFrame(tick);
    };
    const wait = window.setTimeout(() => {
      setPressing(true);
      frame = requestAnimationFrame(tick);
    }, 220);
    return () => {
      window.clearTimeout(wait);
      cancelAnimationFrame(frame);
    };
  }, [hardware, run, outcome]);

  const constraint = roleColour('constraint');
  const failedTone = outcome === 'success' ? undefined : { color: constraint };
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
      {/* On the stiff arm softness and damping are natively
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

  const r = refs.current;
  const knob = knobAt(params.stiffnessKNPerM);
  const restSpring = springAt(still.lift, still.squeeze);
  const restPeak = peakAt(still.peak);
  const liveView = (id: LiveId) => {
    if (id === 'crack') {
      return <path key={id} ref={(el) => void (r.crack = el)} className="iso-line" data-tone="hi" data-testid="impedance-crack" style={{ opacity: still.crack }} d={CRACK} />;
    }
    if (id === 'knob') {
      return (
        <g key={id} data-testid="impedance-knob" data-stiffness={params.stiffnessKNPerM}>
          <Solid paths={knob.paths} tone="hi" inner={<Line d={knob.knurl} tone="lo" />} />
          <Line d={knob.pointer} tone="hi" free="end" />
          <Dots points={[knob.hub]} size={0.8} tone="hi" />
        </g>
      );
    }
    if (id === 'spring-back') {
      return (
        <g key={id}>
          <path ref={(el) => void (r.springBack = el)} className="iso-line" data-tone="mid" style={WIRE_STYLE} d={restSpring.back} />
          <path ref={(el) => void (r.springBackCore = el)} className="iso-line" style={{ ...CORE_STYLE, stroke: 'var(--anatomy-shade-1)' }} d={restSpring.back} />
        </g>
      );
    }
    if (id === 'spring-front') {
      return (
        <g key={id} data-testid="impedance-spring">
          <path ref={(el) => void (r.springFront = el)} className="iso-line" data-tone="hi" style={WIRE_STYLE} d={restSpring.front} />
          <path ref={(el) => void (r.springFrontCore = el)} className="iso-line" style={{ ...CORE_STYLE, stroke: 'var(--anatomy-top)' }} d={restSpring.front} />
          <g ref={(el) => void (r.springEnds = el)} className="iso-dots" data-tone="hi">
            {restSpring.ends.map(([x, y], index) => (
              <circle key={index} cx={Math.round(x * 10) / 10} cy={Math.round(y * 10) / 10} r={1.1} />
            ))}
          </g>
        </g>
      );
    }
    if (id === 'peak') {
      return (
        <g key={id} data-testid="impedance-peak-pointer" data-newtons={still.peak.toFixed(1)}>
          <path ref={(el) => void (r.peak = el)} className="iso-line" data-tone="mid" d={restPeak.d} />
          <g className="iso-dots" data-tone="hi">
            <circle ref={(el) => void (r.peakTip = el)} cx={Math.round(restPeak.tip[0] * 10) / 10} cy={Math.round(restPeak.tip[1] * 10) / 10} r={0.9} />
          </g>
        </g>
      );
    }
    return (
      <path
        key={id}
        ref={(el) => void (r.needle = el)}
        className="iso-line"
        data-tone="lit"
        data-free="start"
        data-testid="impedance-needle"
        data-newtons={still.newtons.toFixed(1)}
        style={{ strokeWidth: 1.2 }}
        d={needleAt(still.newtons)}
      />
    );
  };

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
        <AnatomyStage
          viewWidth={STAGE_WIDTH}
          hint={pressing ? 'Pressing, slowed for the eye' : 'The pointer stays at the first bump; past the shaded arc the glass cracks'}
          readout={stillReadout(hardware, run)}
          status="Illustrative model, not measured"
          data-testid="impedance-press"
          data-arm={hardware}
        >
          <div ref={stageRef}>
            <Stage className="iso-stage">
              <svg
                className="iso-svg"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                focusable="false"
                aria-label={`A fingertip pressing a fragile object: the push over time peaks at ${
              positionMode ? 'an unbounded force' : `${run.peakForceN.toFixed(1)} newtons`
            }, ${OUTCOME_TEXT[outcome]}.`}
                aria-describedby={descriptionId}
                data-testid="impedance-chart"
              >
                {RUNS[hardware].map((group, index) => {
                  const body = group.parts.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <StandPart key={k} part={part} />));
                  if (group.group === 'static') return <g key={index}>{body}</g>;
                  const lift = group.group === 'tip' ? still.lift : still.lift - still.squeeze;
                  return (
                    <g
                      key={index}
                      ref={(el) => void (group.group === 'tip' ? r.tip : r.head).set(index, el)}
                      transform={liftOf(lift)}
                      data-testid={group.group === 'tip' ? 'impedance-fingertip' : 'impedance-head'}
                    >
                      {body}
                    </g>
                  );
                })}
              </svg>
            </Stage>
          </div>
        </AnatomyStage>
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
            {SEA_SPRING_STIFFNESS_N_PER_M} N/m spring in series with the contact. The stiff arm, a geared arm
            under position control, only follows its commanded position, so the force is whatever the position
            error makes it. The press is drawn as a test stand: the gauge reads to {AXIS_MAX_N} N and a bigger push
            rests on its stop pin; the head&apos;s travel and the spring&apos;s squeeze are drawn larger than they are,
            and each press plays the 0.6 s contact slowed {PRESS.slow} times. For scale, the human
            pain limit is about {Math.round(TRANSIENT_CONTACT_LIMIT_N / CRUSH_LIMIT_N)} times the crush force:{' '}
            <span data-testid="impedance-limit-label">{TRANSIENT_CONTACT_LIMIT_LABEL}</span>, measured with a
            wedge-shaped impactor <CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />, used in place of the
            paywalled ISO/TS 15066 table.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current contact lab settings and outcome"
            description={
              positionMode
                ? 'With the stiff arm selected, softness and damping are unavailable and the contact force is unbounded by construction: the position loop has no force channel.'
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
    />
  );
}
