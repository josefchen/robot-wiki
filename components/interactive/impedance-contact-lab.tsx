'use client';

import { useId, useState } from 'react';
import {
  CRUSH_LIMIT_N,
  DEFAULT_PARAMS,
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
import { ChartDescription } from '@/components/ui';
import { CiteRef } from '@/components/mdx/cite-ref';
import { cx } from '@/lib/utils';

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
 * The chart draws the contact-force trace against two labelled reference
 * lines: the object's crush limit and the transient contact-force limit
 * for the relevant body region (research basis stated in the label and
 * cited in the caption, from the shared lib/force-limits module that the
 * frontier safety instrument also imports).
 *
 * Interactive contract: deterministic simulation recomputed from pure
 * functions on every input change (no interval needed: the trace is a
 * fixed-horizon response), native range inputs and a native radio group
 * (keyboard-accessible), visible monospace readouts, Reset restoring the
 * defaults, fixed SVG viewport (no layout shift).
 */

const WIDTH = 640;
const HEIGHT = 300;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 16;
const PAD_B = 26;
/** Force axis ceiling, N: comfortably above the transient limit so both
 * reference lines and every reachable trace fit. */
const AXIS_MAX_N = 320;

const HARDWARE_OPTIONS: ReadonlyArray<{
  value: HardwareMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'position',
    label: 'position-controlled geared arm',
    hint: 'no force channel; the commanded position is enforced against the surface',
  },
  {
    value: 'torque',
    label: 'torque-controlled arm',
    hint: 'joint torques commanded directly, so the impedance law is realizable',
  },
  {
    value: 'sea',
    label: 'series-elastic joint',
    hint: 'a physical spring in the drivetrain filters the contact',
  },
];

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

function yFor(forceN: number): number {
  const clamped = Math.min(forceN, AXIS_MAX_N);
  return PAD_T + (1 - clamped / AXIS_MAX_N) * (HEIGHT - PAD_T - PAD_B);
}

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
      const x = PAD_L + (i / (run.steps.length - 1)) * (WIDTH - PAD_L - PAD_R);
      const y = yFor(s.forceN);
      return `${i === 0 ? 'M' : 'L'} ${f(x)} ${f(y)}`;
    })
    .join(' ');

  const buttonBase =
    'rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]';

  return (
    <div
      data-testid="impedance-lab"
      data-brand-surface-id="surface:flat"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      {/* Hardware selector: a native radio group, tab-reachable in visual
          order, arrow-key operable. */}
      <fieldset className="border-0 p-0">
        <legend className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          hardware
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {HARDWARE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 font-sans text-xs text-text"
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
                className="mt-0.5 accent-accent"
              />
              <span>
                {opt.label}
                <span className="block text-[11px] leading-snug text-text-dim">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Sliders. In position mode K and D are NATIVELY disabled: not
          tab-reachable, visibly greyed, honestly unavailable. */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor={`${uid}-depth`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            depth {`(mm)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="impedance-depth-value"
            >
              {(params.depthM * 1000).toFixed(1)}
            </span>
          </label>
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
            className="mt-2 w-full accent-accent"
          />
          <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
            the surface is closer than the model said, by this much
          </p>
        </div>
        <div>
          <label
            htmlFor={`${uid}-stiffness`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            stiffness K {`(N/m)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="impedance-stiffness-value"
            >
              {params.stiffnessKNPerM.toFixed(0)}
            </span>
          </label>
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
            className="mt-2 w-full accent-accent"
          />
          <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
            the programmable spring at the contact
          </p>
        </div>
        <div>
          <label
            htmlFor={`${uid}-damping`}
            className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            damping D {`(N·s/m)`}
            <span
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
              data-testid="impedance-damping-value"
            >
              {params.dampingNPerM.toFixed(0)}
            </span>
          </label>
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
            className="mt-2 w-full accent-accent"
          />
          <p className="mt-1 font-sans text-[11px] leading-snug text-text-dim">
            the programmable damper at the contact
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Contact force over the approach. Peak ${positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} newtons`}, outcome ${outcomeText[outcome]}.`}
        aria-describedby={descriptionId}
        data-testid="impedance-chart"
        className="mt-4 block w-full"
      >
        {/* Force axis ticks */}
        {[0, 100, 200, AXIS_MAX_N].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_L}
              y1={yFor(tick)}
              x2={WIDTH - PAD_R}
              y2={yFor(tick)}
              stroke="var(--color-border)"
              strokeWidth={1}
              opacity={0.5}
            />
            <text
              x={PAD_L - 6}
              y={yFor(tick) + 3}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={12}
          y={PAD_T + 8}
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          transform={`rotate(-90 12 ${PAD_T + 8})`}
          textAnchor="end"
        >
          contact force (N)
        </text>

        {/* Reference line 1: the object's crush limit. */}
        <line
          x1={PAD_L}
          y1={yFor(CRUSH_LIMIT_N)}
          x2={WIDTH - PAD_R}
          y2={yFor(CRUSH_LIMIT_N)}
          stroke="var(--color-err)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          data-testid="impedance-crush-label"
          x={WIDTH - PAD_R - 4}
          y={yFor(CRUSH_LIMIT_N) - 4}
          textAnchor="end"
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          object crush limit {CRUSH_LIMIT_N} N
        </text>

        {/* Reference line 2: the transient contact-force limit, labelled
            with its research basis from the shared force-limits module. */}
        <line
          x1={PAD_L}
          y1={yFor(TRANSIENT_CONTACT_LIMIT_N)}
          x2={WIDTH - PAD_R}
          y2={yFor(TRANSIENT_CONTACT_LIMIT_N)}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          data-testid="impedance-limit-label"
          x={WIDTH - PAD_R - 4}
          y={yFor(TRANSIENT_CONTACT_LIMIT_N) - 4}
          textAnchor="end"
          fill="var(--color-accent)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {TRANSIENT_CONTACT_LIMIT_LABEL}
        </text>

        {/* The force trace itself. */}
        {positionMode ? (
          <text
            x={(WIDTH + PAD_L) / 2}
            y={HEIGHT / 2}
            textAnchor="middle"
            fill="var(--color-text-dim)"
            fontSize={12}
            fontFamily="var(--font-mono)"
          >
            no force channel: the position loop pins the contact force
          </text>
        ) : (
          <path
            data-testid="impedance-force-trace"
            d={path}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          data-brand-control-id="control:secondary-action"
          data-pagefind-ignore
          type="button"
          onClick={reset}
          aria-label="Reset the lab to the torque-controlled defaults"
          className={buttonBase}
        >
          Reset
        </button>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">steady</span>{' '}
        <span data-testid="impedance-steady-readout" className="text-text">
          {positionMode ? 'unbounded' : `${run.steadyForceN.toFixed(1)} N`}
        </span>{' '}
        <span className="text-text-dim">peak</span>{' '}
        <span
          data-testid="impedance-peak-readout"
          className={outcome === 'success' ? 'text-accent' : 'text-err'}
        >
          {positionMode ? 'unbounded' : `${run.peakForceN.toFixed(1)} N`}
        </span>{' '}
        <span className="text-text-dim">outcome</span>{' '}
        <span
          data-testid="impedance-outcome-readout"
          className={outcome === 'success' ? 'text-accent' : 'text-err'}
        >
          {outcomeText[outcome]}
        </span>
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
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

      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        A 4 kg effective end-effector mass pressing into a surface modelled
        as a {(kEff / 1000).toFixed(0)} kN/m spring, under the impedance
        law the stiffness and damping sliders program. The two reference
        lines are the object&apos;s crush limit and the transient
        contact-force limit for the thigh, {TRANSIENT_CONTACT_LIMIT_N} N,
        stated on the research basis of measured 75th-percentile force
        pain thresholds <CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />{' '}
        rather than the paywalled ISO/TS 15066 table. Things worth trying:
        soften K and the peak force falls with it; harden K toward its
        maximum and the transient limit is crossed even though the steady
        force barely moves; select the position-controlled arm and the
        compliance sliders grey out, because a position loop has no force
        to program.
      </p>
    </div>
  );
}
