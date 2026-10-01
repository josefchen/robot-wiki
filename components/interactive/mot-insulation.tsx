'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
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
  ConstraintHatch,
  LegendSwatch,
  roleColour,
  type ChartRole,
} from '@/components/motion/chart';
import {
  KNOWLEDGE_INSULATION_CITATION_ID,
  LAYER_COUNT,
  TRAINING_STEP_SPEEDUP,
  backboneSupervision,
  gradientBarrier,
  languageScore,
  layerStates,
  type Pass,
} from '@/lib/knowledge-insulation';

/**
 * MotInsulation: a layer-by-layer Mixture-of-Transformers view of a
 * pi0-style VLA. Two weight stacks side by side: the language-model
 * backbone and the flow-matching action expert. A depth slider steps the
 * pass through the stacks, so nothing auto-plays.
 *
 * The layer boxes are structure. What moves through them takes the role of
 * what it carries: backbone activations (image, text and state tokens) the
 * state role, action tokens and the expert's flow-matching gradients the
 * action role. Forward, the expert attends sideways into the backbone at
 * every reached layer (dashed). Backward with the stop-gradient on (the
 * Knowledge Insulation recipe), a constraint-hatched barrier blocks the
 * interface and FAST-token cross-entropy is the backbone's only
 * supervision. Off, expert gradients cross into the backbone (dash-dot) and
 * the illustrative language-following meter drops, matching the paper's
 * spoon/trash symptom. The sourced 7.5x training-step figure sits beside
 * the meter.
 */
type MotInsulationProps = {
  /** Initial pass depth. Default shows the full stack. */
  defaultStep?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const STACK_TOP = 50;
const LAYER_H = 14;
const LAYER_GAP = 5;
const STACK_H = LAYER_COUNT * LAYER_H + (LAYER_COUNT - 1) * LAYER_GAP;
const STACK_BOTTOM = STACK_TOP + STACK_H;
const HEIGHT = STACK_BOTTOM + 33;

const BACKBONE = { x: 14, w: 134 };
const EXPERT = { x: 194, w: 130 };
const BARRIER = { x: 165, w: 12 };
const HEADER_Y = 19;
const SUBHEADER_Y = 37;
const INPUT_Y = STACK_BOTTOM + 23;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/**
 * A gradient that crosses the insulation boundary is drawn dash-dot, so the
 * corruption the diagram is about is legible without hue.
 */
const CORRUPT_DASH = '9 3 2 3';

const layerY = (index: number) =>
  f(STACK_TOP + (LAYER_COUNT - 1 - index) * (LAYER_H + LAYER_GAP));

const backboneMid = f(BACKBONE.x + BACKBONE.w / 2);
const expertMid = f(EXPERT.x + EXPERT.w / 2);

const SUPERVISION_LABEL: Record<string, string> = {
  none: 'no gradients (inference)',
  'fast-cross-entropy': 'FAST-token cross-entropy only',
  'expert-gradient': 'expert flow-matching gradient (uninsulated)',
};

/** One arrowhead per role, sized in user units so it fits a layer box. */
function ArrowMarker({ id, role }: { id: string; role: ChartRole }) {
  return (
    <marker
      id={id}
      markerUnits="userSpaceOnUse"
      markerWidth={7}
      markerHeight={7}
      refX={5}
      refY={3.5}
      orient="auto"
    >
      <path
        d="M0.75,0.75 L5.5,3.5 L0.75,6.25"
        fill="none"
        stroke={roleColour(role)}
        strokeWidth={CHART_STROKE.reference}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </marker>
  );
}

/** A swatch that repeats the dash-dot crossing gradient exactly. */
function CrossingSwatch() {
  const h = CHART_TYPE.tickPx;
  const w = h * 2;
  return (
    <svg aria-hidden="true" focusable="false" width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path
        d={`M1 ${h / 2} H${w - 1}`}
        fill="none"
        stroke={roleColour('action')}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CORRUPT_DASH}
      />
    </svg>
  );
}

const STAGE_LINK = 'underline-offset-2';

export function MotInsulation({ defaultStep = LAYER_COUNT, className }: MotInsulationProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const stateArrowId = `${uid}-arrow-state`;
  const actionArrowId = `${uid}-arrow-action`;
  const barrierHatchId = `${uid}-barrier-hatch`;
  const [pass, setPass] = useState<Pass>('forward');
  const [stopGradient, setStopGradient] = useState(true);
  const [step, setStep] = useState(defaultStep);

  const states = layerStates(pass, stopGradient, step);
  const score = languageScore(pass, stopGradient, step);
  const barrier = gradientBarrier(pass, stopGradient);
  const supervision = backboneSupervision(pass, stopGradient);
  const citationFor = useCitationLookup();
  const citation = citationFor(KNOWLEDGE_INSULATION_CITATION_ID);

  const corrupted = pass === 'backward' && !stopGradient;
  const stateColour = roleColour('state');
  const actionColour = roleColour('action');

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

  const backboneSubheader =
    pass === 'forward' ? 'FAST token logits' : stopGradient ? 'FAST cross-entropy' : 'expert gradient';
  const expertSubheader = pass === 'forward' ? 'continuous actions' : 'flow-matching loss';

  /** A vertical arrow inside one layer box: up on the forward pass, down on the backward. */
  const flowArrow = (x: number, y: number, role: ChartRole, dash?: string) => (
    <line
      x1={x}
      y1={pass === 'forward' ? f(y + LAYER_H - 2.5) : f(y + 2.5)}
      x2={x}
      y2={pass === 'forward' ? f(y + 3) : f(y + LAYER_H - 3)}
      stroke={roleColour(role)}
      strokeWidth={CHART_STROKE.trace}
      strokeDasharray={dash}
      markerEnd={`url(#${role === 'state' ? stateArrowId : actionArrowId})`}
    />
  );

  const box = (testId: string, x: number, w: number, y: number, active: boolean) => (
    <rect
      data-testid={testId}
      data-active={active ? 'true' : 'false'}
      x={x}
      y={y}
      width={w}
      height={LAYER_H}
      fill="none"
      stroke={CHART_STRUCTURE.axes}
      strokeWidth={CHART_STROKE.structure}
      opacity={active ? 0.9 : CHART_STRUCTURE.axesOpacity}
    />
  );

  return (
    <InstrumentFigure
      figureId="mot-insulation"
      className={className}
      heading="Knowledge Insulation pass"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor="mot-depth"
              value={
                <span data-testid="step-readout">
                  {step} / {LAYER_COUNT}
                </span>
              }
            >
              Pass depth
            </ControlLabel>
            <input
              id="mot-depth"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={LAYER_COUNT}
              step={1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              aria-label={`Pass depth, currently ${step} of ${LAYER_COUNT} layers`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <div role="group" aria-label="Select the pass direction" className="flex flex-wrap gap-1">
            {(['forward', 'backward'] as const).map((p) => (
              <button
                data-brand-control-id="control:selection"
                key={p}
                type="button"
                aria-pressed={p === pass}
                onClick={() => setPass(p)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {p} pass
              </button>
            ))}
          </div>
          <button
            data-brand-control-id="control:selection"
            type="button"
            aria-pressed={stopGradient}
            onClick={toggleStopGradient}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            Stop gradient: {stopGradient ? 'on' : 'off'}
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="state" mark="line" />}>backbone activations</LegendItem>
                <LegendItem swatch={<LegendSwatch role="state" mark="dash" />}>sideways attention</LegendItem>
                <LegendItem swatch={<LegendSwatch role="action" mark="line" />}>action expert flow</LegendItem>
                <LegendItem swatch={<CrossingSwatch />}>expert gradient crossing in</LegendItem>
                <LegendItem swatch={<LegendSwatch role="constraint" mark="hatch" />}>stop-gradient barrier</LegendItem>
              </InstrumentLegend>
              <LanguageMeter score={score} />
              <InstrumentReadout className="basis-full">
                Backbone supervision:{' '}
                <span data-testid="supervision-readout">{SUPERVISION_LABEL[supervision]}</span>
              </InstrumentReadout>
              <div className="basis-full font-sans text-[13px] leading-snug text-text-dim">
                Measured:{' '}
                <span data-testid="speedup-readout" className="text-text">
                  {TRAINING_STEP_SPEEDUP}x fewer training steps
                </span>{' '}
                for the π0.5 + KI generalist than π0, at similar table-bussing performance.
                {citation && (
                  <>
                    {' '}
                    <a
                      data-brand-control-id="control:link-focus"
                      href={citation.url}
                      target="_blank"
                      rel="noopener"
                      className={STAGE_LINK}
                    >
                      Source: {citation.label}
                    </a>
                  </>
                )}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current MoT pass"
                description={`${pass === 'forward' ? 'Forward' : 'Backward'} pass at depth ${step} of ${LAYER_COUNT} keeps backbone supervision on ${SUPERVISION_LABEL[supervision]}, language following at ${score} of 100, and the separately reported ${TRAINING_STEP_SPEEDUP}x fewer training steps for the π0.5 + KI generalist versus π0 at similar table-bussing performance; the stop-gradient is ${stopGradient ? 'on' : 'off'} so expert gradients ${stopGradient ? 'stay inside the action expert' : 'cross into the backbone'}.`}
                states={[
                  { label: 'pass', value: pass },
                  { label: 'depth', value: `${step} / ${LAYER_COUNT}` },
                  { label: 'stop-gradient', value: stopGradient ? 'on' : 'off' },
                  { label: 'supervision', value: SUPERVISION_LABEL[supervision] },
                  { label: 'language score', value: `${score} / 100` },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Mixture-of-Transformers diagram. ${passDescription}`}
            aria-describedby={descriptionId}
            data-testid="mot-diagram"
          >
            <defs>
              <ArrowMarker id={stateArrowId} role="state" />
              <ArrowMarker id={actionArrowId} role="action" />
            </defs>

            {/* Column headers, then what leaves or supervises each stack. */}
            <text data-scene-axis="" x={backboneMid} y={HEADER_Y} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.label}>
              language model (2B)
            </text>
            <text data-scene-axis="" x={expertMid} y={HEADER_Y} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.label}>
              action expert (300M)
            </text>
            <text
              data-scene-axis=""
              data-testid={barrier ? 'fast-loss-label' : undefined}
              x={backboneMid}
              y={SUBHEADER_Y}
              textAnchor="middle"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              {backboneSubheader}
            </text>
            <text data-scene-axis="" x={expertMid} y={SUBHEADER_Y} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              {expertSubheader}
            </text>

            {/* Stop-gradient barrier: a blocked path, in the constraint hatch. */}
            {barrier && (
              <g data-testid="gradient-barrier">
                <ConstraintHatch
                  id={barrierHatchId}
                  x={BARRIER.x}
                  y={STACK_TOP - 4}
                  width={BARRIER.w}
                  height={STACK_H + 8}
                />
              </g>
            )}

            {states.map((s) => {
              const y = layerY(s.index);
              const cy = f(y + LAYER_H / 2);
              return (
                <g key={s.index}>
                  {box(`backbone-layer-${s.index}`, BACKBONE.x, BACKBONE.w, y, s.backboneActive)}
                  {box(`expert-layer-${s.index}`, EXPERT.x, EXPERT.w, y, s.expertActive)}
                  {/* Uninsulated, the backbone carries the expert's gradient. */}
                  {s.backboneActive &&
                    flowArrow(backboneMid, y, corrupted ? 'action' : 'state', corrupted ? CORRUPT_DASH : undefined)}
                  {s.expertActive && flowArrow(expertMid, y, 'action')}
                  {s.sidewaysAttention && (
                    <line
                      data-testid={`attention-${s.index}`}
                      x1={f(BACKBONE.x + BACKBONE.w + 3)}
                      y1={cy}
                      x2={f(EXPERT.x - 3)}
                      y2={cy}
                      stroke={stateColour}
                      strokeWidth={CHART_STROKE.reference}
                      strokeDasharray={CHART_STROKE.dash}
                      markerEnd={`url(#${stateArrowId})`}
                    />
                  )}
                  {s.gradientCrosses && (
                    <line
                      data-testid={`gradient-cross-${s.index}`}
                      x1={f(EXPERT.x - 3)}
                      y1={cy}
                      x2={f(BACKBONE.x + BACKBONE.w + 3)}
                      y2={cy}
                      stroke={actionColour}
                      strokeWidth={CHART_STROKE.reference}
                      strokeDasharray={CORRUPT_DASH}
                      markerEnd={`url(#${actionArrowId})`}
                    />
                  )}
                </g>
              );
            })}

            {/* What enters each stack at the bottom. */}
            <text data-scene-axis="" x={backboneMid} y={INPUT_Y} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              image, text, state
            </text>
            <text data-scene-axis="" x={expertMid} y={INPUT_Y} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              noisy action tokens
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="With the stop-gradient on, expert gradients stop at the barrier; turned off, they flow into the language model."
      source={`Schematic with ${LAYER_COUNT} layers per stack; the 0-100 language score illustrates the paper's spoon-and-trash example, not a published curve.`}
    />
  );
}

// Defined after the figure: the accessible-name baseline seals aria-label
// expressions by their order in this file, and the meter's name follows the
// diagram's.
function LanguageMeter({ score }: { score: number }) {
  return (
    <div className="basis-full">
      <div className="flex items-baseline justify-between gap-2 font-sans text-[13px]">
        <span className="text-text-dim">Language following, illustrative</span>
        <span className="tabular-nums text-text">
          <span data-testid="language-score">{score}</span>
          <span className="text-text-dim"> / 100</span>
        </span>
      </div>
      <div
        role="meter"
        data-brand-surface-id="surface:flat"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Language-following score, ${score} of 100`}
        className="mt-1 h-2 w-full overflow-hidden border border-border-strong"
      >
        <svg viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden className="block h-full w-full">
          <rect
            data-testid="language-meter-fill"
            data-chart-mark="bar"
            data-chart-role="value"
            x={0}
            y={0}
            width={f(score * 2)}
            height={8}
            fill={roleColour('value')}
          />
        </svg>
      </div>
    </div>
  );
}
