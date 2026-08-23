'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import { citationLabel, getCitation } from '@/data/citations';
import {
  LAYER_COUNT,
  TRAINING_STEP_SPEEDUP,
  backboneSupervision,
  gradientBarrier,
  languageScore,
  layerStates,
  type Pass,
} from '@/lib/knowledge-insulation';
import { cx } from '@/lib/utils';

/**
 * MotInsulation: a layer-by-layer Mixture-of-Transformers view of a
 * pi0-style VLA. Two weight stacks side by side: the VLM backbone (3B)
 * and the flow-matching action expert (300M). A depth slider steps the
 * pass through the stacks, so nothing auto-plays.
 *
 * Forward pass: image, text, and state tokens flow up the backbone;
 * action tokens flow up the expert while attending sideways into backbone
 * activations at every layer (blue arrows).
 *
 * Backward pass: the stop-gradient toggle decides what reaches the
 * backbone. On (the Knowledge Insulation recipe): a green barrier at the
 * interface, gradients confined to the expert, and the FAST-token
 * cross-entropy loss shown as the backbone's only supervision. Off:
 * gradient arrows cross from the expert into the backbone at every
 * reached layer and the illustrative language-following meter drops,
 * matching the paper's spoon/trash symptom. The sourced 7.5x
 * training-step figure is pinned next to the meter.
 *
 * Interactive contract: deterministic render, visible monospace readouts,
 * native toggle buttons with aria-pressed plus a labelled slider, a reset
 * control, fixed-height diagram (no layout shift), no auto-playing motion
 * (reduced-motion safe by construction).
 */
type MotInsulationProps = {
  /** Initial pass depth. Default shows the full stack. */
  defaultStep?: number;
  className?: string;
};

const WIDTH = 640;
const STACK_TOP = 64;
const LAYER_H = 30;
const LAYER_GAP = 8;
const STACK_H = LAYER_COUNT * LAYER_H + (LAYER_COUNT - 1) * LAYER_GAP;
const STACK_BOTTOM = STACK_TOP + STACK_H;
const HEIGHT = STACK_BOTTOM + 44;

const BACKBONE = { x: 56, w: 220 };
const EXPERT = { x: 404, w: 180 };
const BARRIER_X = 340;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const layerY = (index: number) =>
  f(STACK_TOP + (LAYER_COUNT - 1 - index) * (LAYER_H + LAYER_GAP));

const SUPERVISION_LABEL: Record<string, string> = {
  none: 'no gradients (inference)',
  'fast-cross-entropy': 'FAST-token cross-entropy only',
  'expert-gradient': 'expert flow-matching gradient (uninsulated)',
};

export function MotInsulation({ defaultStep = LAYER_COUNT, className }: MotInsulationProps) {
  const descriptionId = `${useId()}-description`;
  const [pass, setPass] = useState<Pass>('forward');
  const [stopGradient, setStopGradient] = useState(true);
  const [step, setStep] = useState(defaultStep);

  const states = layerStates(pass, stopGradient, step);
  const score = languageScore(pass, stopGradient, step);
  const barrier = gradientBarrier(pass, stopGradient);
  const supervision = backboneSupervision(pass, stopGradient);
  const citation = getCitation('knowledge-insulation-paper-2025');

  const corrupted = pass === 'backward' && !stopGradient;
  const meterColor = corrupted ? 'var(--color-err)' : 'var(--color-accent)';

  function toggleStopGradient() {
    // The toggle only has meaning in the backward view, so switching it
    // moves the diagram there (the expected interaction path).
    setStopGradient((on) => !on);
    setPass('backward');
  }

  function reset() {
    setPass('forward');
    setStopGradient(true);
    setStep(defaultStep);
  }

  const passDescription =
    pass === 'forward'
      ? `Forward pass at depth ${step} of ${LAYER_COUNT}. Tokens flow up both stacks; the expert attends into backbone activations at each reached layer.`
      : stopGradient
        ? `Backward pass at depth ${step} of ${LAYER_COUNT} with the stop-gradient on. Gradients stay inside the expert; the backbone is supervised by FAST-token cross-entropy.`
        : `Backward pass at depth ${step} of ${LAYER_COUNT} with the stop-gradient off. Expert gradients cross into the backbone at every reached layer and the language-following score drops to ${score}.`;

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label
            htmlFor="mot-depth"
            className="flex items-baseline justify-between gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          >
            Pass depth
            <span
              data-testid="step-readout"
              className="whitespace-nowrap font-mono text-xs normal-case tracking-normal text-text"
            >
              {step} / {LAYER_COUNT}
            </span>
          </label>
          <input
            id="mot-depth"
            type="range"
            min={0}
            max={LAYER_COUNT}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label={`Pass depth, currently ${step} of ${LAYER_COUNT} layers`}
            className="mt-2 w-full accent-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="group"
            aria-label="Select the pass direction"
            className="flex flex-wrap gap-1"
          >
            {(['forward', 'backward'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={p === pass}
                onClick={() => setPass(p)}
                className={cx(
                  'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
                  p === pass
                    ? 'border-accent text-text'
                    : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                )}
              >
                {p} pass
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={stopGradient}
            onClick={toggleStopGradient}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              stopGradient
                ? 'border-ok text-text'
                : 'border-err text-text',
            )}
          >
            Stop gradient: {stopGradient ? 'on' : 'off'}
          </button>
          <button
            data-pagefind-ignore
            type="button"
            onClick={reset}
            className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
          >
            Reset
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Mixture-of-Transformers diagram. ${passDescription}`}
        aria-describedby={descriptionId}
        data-testid="mot-diagram"
        className="mt-4 block w-full"
      >
        <defs>
          <marker
            id="mot-arrow-accent"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="var(--color-accent)" />
          </marker>
          <marker
            id="mot-arrow-err"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="var(--color-err)" />
          </marker>
          <marker
            id="mot-arrow-ok"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="var(--color-ok)" />
          </marker>
        </defs>

        {/* Column headers */}
        <text
          x={f(BACKBONE.x + BACKBONE.w / 2)}
          y={18}
          textAnchor="middle"
          fill="var(--color-text)"
          fontSize={12}
          fontFamily="var(--font-mono)"
        >
          VLM backbone (3B)
        </text>
        <text
          x={f(EXPERT.x + EXPERT.w / 2)}
          y={18}
          textAnchor="middle"
          fill="var(--color-text)"
          fontSize={12}
          fontFamily="var(--font-mono)"
        >
          action expert (300M)
        </text>
        <text
          x={f(BACKBONE.x + BACKBONE.w / 2)}
          y={32}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {pass === 'forward'
            ? 'out: FAST token logits'
            : stopGradient
              ? 'loss: FAST cross-entropy'
              : 'loss: expert gradient'}
        </text>
        <text
          x={f(EXPERT.x + EXPERT.w / 2)}
          y={32}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {pass === 'forward' ? 'out: continuous actions' : 'loss: flow matching'}
        </text>

        {/* Loss arrows into the stack tops (backward view only) */}
        {pass === 'backward' && (
          <>
            <line
              x1={f(BACKBONE.x + BACKBONE.w / 2)}
              y1={38}
              x2={f(BACKBONE.x + BACKBONE.w / 2)}
              y2={STACK_TOP - 4}
              stroke={stopGradient ? 'var(--color-ok)' : 'var(--color-err)'}
              strokeWidth={1.5}
              markerEnd={`url(#${stopGradient ? 'mot-arrow-ok' : 'mot-arrow-err'})`}
            />
            {stopGradient && (
              <text
                data-testid="fast-loss-label"
                x={f(BACKBONE.x + BACKBONE.w / 2)}
                y={STACK_TOP + 12}
                textAnchor="middle"
                fill="var(--color-ok)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                FAST cross-entropy
              </text>
            )}
            <line
              x1={f(EXPERT.x + EXPERT.w / 2)}
              y1={38}
              x2={f(EXPERT.x + EXPERT.w / 2)}
              y2={STACK_TOP - 4}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              markerEnd="url(#mot-arrow-accent)"
            />
          </>
        )}

        {/* Stop-gradient barrier */}
        {barrier && (
          <g data-testid="gradient-barrier">
            <line
              x1={BARRIER_X}
              y1={STACK_TOP - 10}
              x2={BARRIER_X}
              y2={STACK_BOTTOM + 10}
              stroke="var(--color-ok)"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text
              x={BARRIER_X}
              y={STACK_TOP - 16}
              textAnchor="middle"
              fill="var(--color-ok)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              stop-gradient
            </text>
          </g>
        )}

        {/* Layers */}
        {states.map((s) => {
          const y = layerY(s.index);
          const cy = f(y + LAYER_H / 2);
          return (
            <g key={s.index}>
              <rect
                data-testid={`backbone-layer-${s.index}`}
                x={BACKBONE.x}
                y={y}
                width={BACKBONE.w}
                height={LAYER_H}
                rx={2}
                fill="var(--color-accent)"
                fillOpacity={s.backboneActive ? (corrupted ? 0 : 0.16) : 0}
                stroke={
                  s.backboneActive && corrupted
                    ? 'var(--color-err)'
                    : s.backboneActive
                      ? 'var(--color-accent)'
                      : 'var(--color-border)'
                }
                strokeWidth={1}
              />
              <rect
                data-testid={`expert-layer-${s.index}`}
                x={EXPERT.x}
                y={y}
                width={EXPERT.w}
                height={LAYER_H}
                rx={2}
                fill="var(--color-accent)"
                fillOpacity={s.expertActive ? 0.16 : 0}
                stroke={
                  s.expertActive ? 'var(--color-accent)' : 'var(--color-border)'
                }
                strokeWidth={1}
              />

              {/* In-stack flow arrows */}
              {s.backboneActive && (
                <line
                  x1={f(BACKBONE.x + BACKBONE.w / 2)}
                  y1={pass === 'forward' ? f(y + LAYER_H - 6) : f(y + 6)}
                  x2={f(BACKBONE.x + BACKBONE.w / 2)}
                  y2={pass === 'forward' ? f(y + 6) : f(y + LAYER_H - 6)}
                  stroke={corrupted ? 'var(--color-err)' : 'var(--color-accent)'}
                  strokeWidth={1.5}
                  markerEnd={`url(#${corrupted ? 'mot-arrow-err' : 'mot-arrow-accent'})`}
                />
              )}
              {s.expertActive && (
                <line
                  x1={f(EXPERT.x + EXPERT.w / 2)}
                  y1={pass === 'forward' ? f(y + LAYER_H - 6) : f(y + 6)}
                  x2={f(EXPERT.x + EXPERT.w / 2)}
                  y2={pass === 'forward' ? f(y + 6) : f(y + LAYER_H - 6)}
                  stroke="var(--color-accent)"
                  strokeWidth={1.5}
                  markerEnd="url(#mot-arrow-accent)"
                />
              )}

              {/* Sideways attention: expert reads backbone activations (forward) */}
              {s.sidewaysAttention && (
                <line
                  data-testid={`attention-${s.index}`}
                  x1={f(BACKBONE.x + BACKBONE.w + 6)}
                  y1={cy}
                  x2={f(EXPERT.x - 8)}
                  y2={cy}
                  stroke="var(--color-accent)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  markerEnd="url(#mot-arrow-accent)"
                />
              )}

              {/* Corrupting gradient crossing into the backbone (backward, uninsulated) */}
              {s.gradientCrosses && (
                <line
                  data-testid={`gradient-cross-${s.index}`}
                  x1={f(EXPERT.x - 6)}
                  y1={cy}
                  x2={f(BACKBONE.x + BACKBONE.w + 8)}
                  y2={cy}
                  stroke="var(--color-err)"
                  strokeWidth={1.5}
                  markerEnd="url(#mot-arrow-err)"
                />
              )}
            </g>
          );
        })}

        {/* Input labels */}
        <text
          x={f(BACKBONE.x + BACKBONE.w / 2)}
          y={STACK_BOTTOM + 22}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          in: image, text, state tokens
        </text>
        <text
          x={f(EXPERT.x + EXPERT.w / 2)}
          y={STACK_BOTTOM + 22}
          textAnchor="middle"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          in: action tokens + noise
        </text>
      </svg>

      {/* Language-following meter */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
            Language following (illustrative)
          </span>
          <span className="font-mono text-xs text-text">
            <span data-testid="language-score" style={{ color: meterColor }}>
              {score}
            </span>{' '}
            <span className="text-text-dim">/ 100</span>
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Language-following score, ${score} of 100`}
          className="mt-1.5 h-1.5 w-full rounded-sm border border-border"
        >
          <div
            data-testid="language-meter-fill"
            className="h-full rounded-sm"
            style={{ width: `${score}%`, backgroundColor: meterColor }}
          />
        </div>
      </div>

      <p className="mt-3 font-mono text-sm text-text" aria-live="polite">
        <span className="text-text-dim">backbone supervision:</span>{' '}
        <span data-testid="supervision-readout" className="text-accent">
          {SUPERVISION_LABEL[supervision]}
        </span>
      </p>
      <p className="mt-1.5 font-mono text-sm text-text">
        <span className="text-text-dim">measured effect:</span>{' '}
        <span data-testid="speedup-readout" className="text-accent">
          {TRAINING_STEP_SPEEDUP}x fewer training steps
        </span>{' '}
        <span className="text-text-dim">
          to the same bussing-task performance vs pi0
        </span>
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="state"
        summary="Current MoT pass"
        description={`${pass === 'forward' ? 'Forward' : 'Backward'} pass at depth ${step} of ${LAYER_COUNT} keeps backbone supervision on ${SUPERVISION_LABEL[supervision]}, language following at ${score} of 100, and the measured ${TRAINING_STEP_SPEEDUP}x fewer training steps vs pi0; the stop-gradient is ${stopGradient ? 'on' : 'off'} so expert gradients ${stopGradient ? 'stay inside the action expert' : 'cross into the backbone'}.`}
        states={[
          { label: 'pass', value: pass },
          { label: 'depth', value: `${step} / ${LAYER_COUNT}` },
          { label: 'stop-gradient', value: stopGradient ? 'on' : 'off' },
          { label: 'supervision', value: SUPERVISION_LABEL[supervision] },
          { label: 'language score', value: `${score} / 100` },
        ]}
      />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="font-mono text-[10px] text-text-dim">
          <span className="text-accent">blue</span>: token and activation flow
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          dashed blue: sideways attention (forward)
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          <span className="text-err">red</span>: corrupting gradient (backward)
        </span>
        <span className="font-mono text-[10px] text-text-dim">
          <span className="text-ok">green</span>: gradient barrier
        </span>
      </div>

      <p className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
        Schematic: {LAYER_COUNT} layers drawn per stack for legibility, and
        the 0-100 language-following score is an illustrative rendering of
        the paper&apos;s qualitative finding (an uninsulated model told to
        put a spoon in the dish container grabs the trash instead), not a
        published curve. The sourced figures are the parameter counts and
        the {TRAINING_STEP_SPEEDUP}x training-step ratio.
        {citation && (
          <>
            {' '}
            <a
              href={citation.url}
              target="_blank"
              rel="noopener"
              className="font-mono text-accent underline decoration-border-strong underline-offset-2 transition-colors hover:decoration-accent"
            >
              Source: {citationLabel(citation)}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
