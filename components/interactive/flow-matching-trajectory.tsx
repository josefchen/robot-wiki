'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageNumber, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  StageAnnotation,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import {
  FLOW_MODES,
  MAX_STEPS,
  MIN_STEPS,
  PI06_STEPS,
  PI0_STEPS,
  endpointDispersion,
  generateFlowField,
  integrateFlow,
  vectorFieldAt,
} from '@/lib/flow-matching';

/**
 * FlowMatchingTrajectory: why the π0 action expert refines a move in a few
 * small steps instead of one jump. Each drawn path starts at a random guess
 * and is carried toward one of two good moves; the reader picks how many
 * steps the trip is split into. One step cuts the corner and falls short;
 * five or ten land on the good moves. The first frame shows the ten-step
 * paths with the one-step jumps beside them as grey ghosts, so the contrast
 * is visible before any input.
 *
 * Main view: the step presets the shipped models use. "Adjust more" holds
 * the free slider, the 50-step setting, the learned-field arrows and Reset.
 * "How this was made" holds the flow-matching and Euler-integration method,
 * the endpoint error and the sources. The model is illustrative: 48 seeded
 * samples in two of a chunk's dimensions, with a small deterministic bend
 * standing in for the learned field's imperfection (lib/flow-matching.ts).
 */
type FlowMatchingTrajectoryProps = {
  /** Initial integration steps. Default 10 (the π0 configuration). */
  defaultSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 222;
/** Six by 3.6 action units at 50 px each, so both axes share one scale. */
const PLOT = { left: 20, right: 320, top: 36, bottom: 216 };

/** Action-space view window. */
const X_RANGE = { min: -3, max: 3 };
const Y_RANGE = { min: -1.8, max: 1.8 };
const UNIT_PX = (PLOT.right - PLOT.left) / (X_RANGE.max - X_RANGE.min);

const FIELD_COLS = 13;
const FIELD_ROWS = 8;
/** Tau at which the learned vector field is displayed (mid-transport). */
const FIELD_TAU = 0.5;
/** Every fourth seeded sample is drawn: 12 of the 48, so each path reads. */
const DRAW_EVERY = 4;
/**
 * The one drawn path at full emphasis, with its one-jump ghost: seeded
 * sample 0, whose one-jump miss (1.08) is about twice the 48-sample mean.
 */
const FOCUS = 0;

type StepPreset = 'one' | 'five' | 'ten';
const STEP_PRESETS: ReadonlyArray<{ id: StepPreset; steps: number; label: string }> = [
  { id: 'one', steps: 1, label: '1 step' },
  { id: 'five', steps: PI06_STEPS, label: `${PI06_STEPS} steps (π0.6, π0.7)` },
  { id: 'ten', steps: PI0_STEPS, label: `${PI0_STEPS} steps (π0)` },
];

/**
 * Where each good move's name sits. The offsets keep the label clear of every
 * drawn path, ghost and endpoint at any step count from 1 to 50.
 */
const MODE_LABELS = [
  { name: 'a good move', dx: -12, dy: 4, anchor: 'end' as const },
  { name: 'another good move', dx: 0, dy: -22, anchor: 'middle' as const },
];

function regimeFor(steps: number): string {
  if (steps <= 2) return 'too few, cutting the corner';
  if (steps >= 50) return 'accurate but unaffordable';
  return 'on the modes';
}

/** The note at the landing point, in plain words for the current step count. */
function landingNote(steps: number): string[] {
  if (steps === 1) return ['One big jump cuts the', 'corner and misses'];
  if (steps === 2) return ['Two jumps still', 'miss the good move'];
  if (steps <= 4) return [`${steps} steps get close`, 'to the good move'];
  if (steps >= MAX_STEPS) return [`${steps} steps land too, at`, 'five times the cost of ten'];
  return [`${steps} small steps land`, 'on the good move'];
}

function stepWords(steps: number): string {
  return `${steps} ${steps === 1 ? 'step' : 'steps'}`;
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));
const scaleX = linearScale([X_RANGE.min, X_RANGE.max], [PLOT.left, PLOT.right]);
const scaleY = linearScale([Y_RANGE.min, Y_RANGE.max], [PLOT.bottom, PLOT.top]);
const x = (u: number) => f(scaleX(u));
const y = (v: number) => f(scaleY(v));

export function FlowMatchingTrajectory({
  defaultSteps = PI0_STEPS,
  className,
}: FlowMatchingTrajectoryProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-fm-steps`;
  const [steps, setSteps] = useState(defaultSteps);
  const [showField, setShowField] = useState(false);
  const field = useMemo(() => generateFlowField(), []);
  const drawn = useMemo(
    () => field.samples.filter((_, i) => i % DRAW_EVERY === 0),
    [field],
  );
  const arrows = useMemo(
    () => vectorFieldAt(field, FIELD_TAU, FIELD_COLS, FIELD_ROWS),
    [field],
  );
  const paths = useMemo(() => drawn.map((s) => integrateFlow(s, steps)), [drawn, steps]);
  const dispersion = endpointDispersion(field, steps);
  const oneJump = endpointDispersion(field, 1);
  const preset = STEP_PRESETS.find((p) => p.steps === steps)?.id ?? null;

  const maxMagnitude = Math.max(...arrows.map((a) => Math.hypot(a.vx, a.vy)), 1e-6);
  const action = roleColour('action');
  const reference = roleColour('reference');
  const ghost = CHART_STRUCTURE.labelSecondary;

  const focusSample = field.samples[FOCUS];
  const focusPath = integrateFlow(focusSample, steps);
  const focusEnd = focusPath[focusPath.length - 1];
  const jumpEnd = integrateFlow(focusSample, 1)[1];
  const target: [number, number] = [x(focusEnd.x), y(focusEnd.y)];

  function reset() {
    setSteps(defaultSteps);
    setShowField(false);
  }

  return (
    <InstrumentFigure
      figureId="flow-matching-trajectory"
      className={className}
      kicker="Flow matching: refining steps"
      heading="Five small steps land where one big jump misses"
      controls={
        <PresetGroup<StepPreset>
          label="Refining steps per move"
          presets={STEP_PRESETS.map(({ id, label }) => ({ id, label }))}
          value={preset}
          onChange={(id) => setSteps(STEP_PRESETS.find((p) => p.id === id)?.steps ?? defaultSteps)}
          testId="fm-preset"
        />
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={sliderId} value={stepWords(steps)}>
              Refining steps, any number
            </ControlLabel>
            <input
              id={sliderId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_STEPS}
              max={MAX_STEPS}
              step={1}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              aria-label={`Integration steps, currently ${steps} of ${MAX_STEPS}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="one jump" high={`${MAX_STEPS} steps`} />
          </ControlField>
          <button
            type="button"
            data-brand-control-id="control:selection"
            aria-pressed={steps === MAX_STEPS}
            onClick={() => setSteps(MAX_STEPS)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {MAX_STEPS} steps
          </button>
          <button
            type="button"
            data-brand-control-id="control:selection"
            aria-pressed={showField}
            onClick={() => setShowField((on) => !on)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            Show the learned field
          </button>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout>
                Average distance from the good move with{' '}
                <span data-testid="fm-step-readout" style={{ color: action }}>
                  {stepWords(steps)}
                </span>
                :{' '}
                <StageNumber data-testid="fm-dispersion-readout" style={{ color: action }}>
                  {dispersion.toFixed(2)}
                </StageNumber>
                {steps === 1 ? null : <>; with one jump: {oneJump.toFixed(2)}</>}.
              </StageReadout>
              <StageStatus>Illustrative model, not measured.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`2D action-space view: ${drawn.length} of ${field.samples.length} samples start as random noise and are carried toward two good moves along near-straight paths. With ${stepWords(steps)} the mean endpoint error is ${dispersion.toFixed(2)}${steps === 1 ? '' : `; one big jump would leave it at ${oneJump.toFixed(2)}`}. The learned vector field at mid-transport is ${showField ? 'shown' : 'hidden'}.`}
            aria-describedby={descriptionId}
          >
            <StageAnnotation
              x={8}
              y={16}
              lines={landingNote(steps)}
              target={target}
              from={[f(target[0] - 30), 42]}
            />

            {showField
              ? arrows.map((a, i) => {
                  const magnitude = Math.hypot(a.vx, a.vy);
                  const length = (2 + (magnitude / maxMagnitude) * 7) / UNIT_PX;
                  const ux = a.vx / (magnitude || 1);
                  const uy = a.vy / (magnitude || 1);
                  const tipX = x(a.x + ux * length);
                  const tipY = y(a.y + uy * length);
                  return (
                    <g key={i} data-flow-field="" opacity={f(0.3 + 0.4 * (magnitude / maxMagnitude))}>
                      <line x1={x(a.x)} y1={y(a.y)} x2={tipX} y2={tipY} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
                      <circle cx={tipX} cy={tipY} r={1.2} fill={CHART_STRUCTURE.axes} />
                    </g>
                  );
                })
              : null}

            {/* The other drawn paths, at lower emphasis than the focus path. */}
            {paths.map((points, i) => {
              if (i === FOCUS / DRAW_EVERY) return null;
              const sample = drawn[i];
              const end = points[points.length - 1];
              return (
                <g key={i} opacity={0.32}>
                  <polyline
                    points={points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
                    fill="none"
                    stroke={action}
                    strokeWidth={CHART_STROKE.structure}
                    strokeLinejoin="round"
                  />
                  <circle cx={x(sample.noise.x)} cy={y(sample.noise.y)} r={1.8} fill="none" stroke={action} strokeWidth={1} />
                  <circle cx={x(end.x)} cy={y(end.y)} r={2.2} fill={action} />
                </g>
              );
            })}

            {/* The focus path's one big jump: a grey dashed ghost. */}
            {steps === 1 ? null : (
              <g data-flow-ghost="">
                <line
                  x1={x(focusSample.noise.x)}
                  y1={y(focusSample.noise.y)}
                  x2={x(jumpEnd.x)}
                  y2={y(jumpEnd.y)}
                  stroke={ghost}
                  strokeWidth={CHART_STROKE.reference}
                  strokeDasharray="4 3"
                />
                <circle cx={x(jumpEnd.x)} cy={y(jumpEnd.y)} r={3} fill="none" stroke={ghost} strokeWidth={1.5} />
                <DirectLabel x={f(x(jumpEnd.x) + 10)} y={f(y(jumpEnd.y) + 5)}>
                  one big jump misses
                </DirectLabel>
              </g>
            )}

            {/* The focus path at full emphasis; its endpoint is the last
                circle drawn, so it stays on top of every path. */}
            <g data-flow-focus="">
              <polyline
                points={focusPath.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
                fill="none"
                stroke={action}
                strokeWidth={CHART_STROKE.trace}
                strokeLinejoin="round"
              />
              <circle cx={x(focusSample.noise.x)} cy={y(focusSample.noise.y)} r={3} fill="none" stroke={action} strokeWidth={1.5} />
              <DirectLabel x={x(focusSample.noise.x)} y={f(y(focusSample.noise.y) - 10)} role="action" anchor="middle">
                random start
              </DirectLabel>
              <circle cx={target[0]} cy={target[1]} r={3.5} fill={action} />
            </g>

            {/* The two good moves, drawn over the paths so they stay visible */}
            {FLOW_MODES.map((m, i) => {
              const label = MODE_LABELS[i];
              return (
                <g key={i}>
                  <path
                    d={`M${x(m.x) - 7},${y(m.y)} L${x(m.x) + 7},${y(m.y)} M${x(m.x)},${y(m.y) - 7} L${x(m.x)},${y(m.y) + 7}`}
                    fill="none"
                    stroke={reference}
                    strokeWidth={CHART_STROKE.reference}
                    strokeDasharray="3 2"
                  />
                  <text
                    x={x(m.x) + label.dx}
                    y={y(m.y) + label.dy}
                    textAnchor={label.anchor}
                    fontSize={CHART_TYPE.labelPx}
                    fill={reference}
                  >
                    {label.name}
                  </text>
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="Getting a precise move takes several small refining steps, each costing time; π0 used ten, π0.6 and π0.7 use five."
      method={
        <>
          <p>
            Flow matching turns a random guess into a move by following a learned field for a set
            number of Euler integration steps. Each step samples the field once and goes straight,
            so with one or two steps the path cuts the corner and lands short of the good move;
            with five to ten it lands on it. The grey arrows in &ldquo;Adjust more&rdquo; show the
            learned field at τ = {FIELD_TAU}, halfway through the trip. Every step costs one forward
            pass through the action expert, which is why more steps are not free at a 50 Hz control
            rate.
          </p>
          <p>
            Illustrative model, not a reimplementation: {field.samples.length} seeded noise samples
            in 2 of the chunk&apos;s dimensions (action dimension 1 and action dimension 2) are carried
            to two action modes along slightly bent, near-straight paths. The stage draws {drawn.length}{' '}
            of them. The mean endpoint error is{' '}
            <span data-testid="fm-step-method">k = {steps} Euler {steps === 1 ? 'step' : 'steps'}</span>
            : {dispersion.toFixed(2)}, {regimeFor(steps)}; one step gives {oneJump.toFixed(2)}, ten
            give {endpointDispersion(field, PI0_STEPS).toFixed(2)} and {MAX_STEPS} give{' '}
            {endpointDispersion(field, MAX_STEPS).toFixed(2)}. π0 ran {PI0_STEPS} integration
            steps; π0.6 and π0.7 run {PI06_STEPS}.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current flow-matching transport"
            description={`With ${steps} Euler steps the ${field.samples.length} samples travel near-straight from Gaussian noise toward the two action modes and finish at mean endpoint error ${dispersion.toFixed(2)}; one step would cut the corner, 50 steps is more compute than a 50 Hz loop can spend.`}
            states={[
              { label: 'Euler steps', value: String(steps) },
              { label: 'samples', value: String(field.samples.length) },
              { label: 'endpoint error', value: dispersion.toFixed(2) },
              { label: 'regime', value: regimeFor(steps) },
            ]}
          />
        </>
      }
      source="Illustrative model; step counts from the π0, π0.6 and π0.7 papers."
    />
  );
}
