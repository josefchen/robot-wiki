'use client';

import { useId, useMemo, useState } from 'react';
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
 * FlowMatchingTrajectory: the pi0 action expert's inference pass in a 2D
 * action space. Samples start as Gaussian noise; the slider sets how many
 * forward-Euler integration steps transport them toward two action modes.
 * Because flow matching learns near-straight (rectified) transport paths, a
 * handful of steps is enough: at 1-2 steps the cloud visibly misses the
 * modes, at 5-10 it lands on them, and 50 buys nothing you can afford at
 * 50 Hz. The marginal vector field behind the paths shows what the model
 * learns. The real configurations are preset buttons: pi0 ran 10 steps,
 * pi0.6 and pi0.7 run 5.
 *
 * Interactive contract: deterministic render (fixed seed), visible
 * readouts, slider plus step presets plus reset, ARIA labels, fixed-height
 * chart (no layout shift), no auto-playing motion (reduced-motion safe by
 * construction).
 */
type FlowMatchingTrajectoryProps = {
  /** Initial integration steps. Default 10 (the pi0 configuration). */
  defaultSteps?: number;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 270;
/** Six by four action units at 50 px each, so both axes share one scale. */
const PLOT = { left: 30, right: 330, top: 24, bottom: 224 };

/** Action-space view window. */
const X_RANGE = { min: -3, max: 3 };
const Y_RANGE = { min: -2, max: 2 };
const UNIT_PX = (PLOT.right - PLOT.left) / (X_RANGE.max - X_RANGE.min);

const FIELD_COLS = 13;
const FIELD_ROWS = 9;
/** Tau at which the marginal vector field is displayed (mid-transport). */
const FIELD_TAU = 0.5;

const PRESETS: ReadonlyArray<{ steps: number; label: string }> = [
  { steps: 1, label: '1 step' },
  { steps: PI06_STEPS, label: `${PI06_STEPS} steps` },
  { steps: PI0_STEPS, label: `${PI0_STEPS} steps` },
  { steps: MAX_STEPS, label: `${MAX_STEPS} steps` },
];

/**
 * Where each mode's name sits. The offsets keep the label clear of every
 * seeded sample path, noise ring and endpoint at any step count from 1 to 50,
 * so the name never sits on a mark.
 */
const MODE_LABELS = [
  { name: 'mode A', dx: -32, dy: -20, anchor: 'end' as const },
  { name: 'mode B', dx: 32, dy: 4, anchor: 'start' as const },
];

function regimeFor(steps: number): string {
  if (steps <= 2) return 'too few, cutting the corner';
  if (steps >= 50) return 'accurate but unaffordable';
  return 'on the modes';
}

/** A hollow ring, the noise-sample mark, for the legend. */
function NoiseSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <circle cx={h} cy={h / 2} r={2.5} fill="none" stroke={roleColour('action')} strokeWidth={1} />
    </svg>
  );
}

/** A short arrow with a head dot, the vector-field mark, for the legend. */
function FieldSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <line x1={h * 0.4} y1={h / 2} x2={h * 1.6} y2={h / 2} stroke={CHART_STRUCTURE.axes} strokeWidth={1} />
      <circle cx={h * 1.6} cy={h / 2} r={1.5} fill={CHART_STRUCTURE.axes} />
    </svg>
  );
}

export function FlowMatchingTrajectory({
  defaultSteps = PI0_STEPS,
  className,
}: FlowMatchingTrajectoryProps) {
  const descriptionId = `${useId()}-description`;
  const [steps, setSteps] = useState(defaultSteps);
  const field = useMemo(() => generateFlowField(), []);
  const arrows = useMemo(
    () => vectorFieldAt(field, FIELD_TAU, FIELD_COLS, FIELD_ROWS),
    [field],
  );
  const paths = useMemo(
    () => field.samples.map((s) => integrateFlow(s, steps)),
    [field, steps],
  );
  const dispersion = endpointDispersion(field, steps);

  // Round to 2 decimals: full-precision floats serialize differently on
  // server and client and trigger React hydration mismatches.
  const f = (v: number) => Number(v.toFixed(2));
  const scaleX = linearScale([X_RANGE.min, X_RANGE.max], [PLOT.left, PLOT.right]);
  const scaleY = linearScale([Y_RANGE.min, Y_RANGE.max], [PLOT.bottom, PLOT.top]);
  const x = (u: number) => f(scaleX(u));
  const y = (v: number) => f(scaleY(v));

  const maxMagnitude = Math.max(...arrows.map((a) => Math.hypot(a.vx, a.vy)), 1e-6);
  const action = roleColour('action');
  const reference = roleColour('reference');

  // The field grid is denser than a label is wide, so no label position
  // clears every arrow; the arrows under a mode name are left out instead.
  const labelBoxes = FLOW_MODES.map((m, i) => {
    const label = MODE_LABELS[i];
    const width = label.name.length * CHART_TYPE.labelPx * 0.6;
    const anchorX = x(m.x) + label.dx;
    const left = label.anchor === 'end' ? anchorX - width : anchorX;
    const baseline = y(m.y) + label.dy;
    return {
      left: left - 3,
      right: left + width + 3,
      top: baseline - CHART_TYPE.labelPx - 3,
      bottom: baseline + CHART_TYPE.labelPx * 0.3 + 3,
    };
  });
  const underLabel = (px: number, py: number) =>
    labelBoxes.some((b) => px >= b.left && px <= b.right && py >= b.top && py <= b.bottom);

  return (
    <InstrumentFigure
      figureId="flow-matching-trajectory"
      className={className}
      heading="Integration step budget"
      controls={
        <>
          <ControlField>
            <ControlLabel htmlFor="fm-steps" value={`k = ${steps} / ${MAX_STEPS}`}>
              Integration steps
            </ControlLabel>
            <input
              id="fm-steps"
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
          </ControlField>
          <div
            role="group"
            aria-label="Step presets from the shipped models"
            className="flex flex-wrap gap-1"
          >
            {PRESETS.map((preset) => (
              <button
                data-brand-control-id="control:selection"
                key={preset.steps}
                type="button"
                aria-pressed={steps === preset.steps}
                onClick={() => setSteps(preset.steps)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={() => setSteps(defaultSteps)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<NoiseSwatch />}>noise sample</LegendItem>
                <LegendItem swatch={<LegendSwatch role="action" mark="line" />}>Euler path</LegendItem>
                <LegendItem swatch={<LegendSwatch role="action" mark="dot" />}>endpoint</LegendItem>
                <LegendItem swatch={<LegendSwatch role="reference" mark="dash" />}>action mode</LegendItem>
                <LegendItem swatch={<FieldSwatch />}>learned field at τ = 0.5</LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                <span data-testid="fm-step-readout" style={{ color: action }}>
                  k = {steps} Euler {steps === 1 ? 'step' : 'steps'}
                </span>
                : mean endpoint error{' '}
                <span data-testid="fm-dispersion-readout" style={{ color: action }}>
                  {dispersion.toFixed(2)}
                </span>
                , {regimeFor(steps)}
              </InstrumentReadout>
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`2D action-space view with the learned vector field at mid-transport. ${field.samples.length} samples start as Gaussian noise and are transported toward two action modes along near-straight paths. With ${steps} integration steps the mean endpoint error is ${dispersion.toFixed(2)}.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={scaleX}
              y={scaleY}
              xTicks={[-3, -2, -1, 0, 1, 2, 3]}
              yTicks={[-2, -1, 0, 1, 2]}
              xLabel="action dimension 1"
              yLabel="action dimension 2"
              grid={false}
            />

            {/* Marginal vector field at mid-transport */}
            {arrows.map((a, i) => {
              const magnitude = Math.hypot(a.vx, a.vy);
              const length = (2 + (magnitude / maxMagnitude) * 7) / UNIT_PX;
              const ux = a.vx / (magnitude || 1);
              const uy = a.vy / (magnitude || 1);
              const tipX = x(a.x + ux * length);
              const tipY = y(a.y + uy * length);
              if (
                underLabel(x(a.x), y(a.y)) ||
                underLabel(tipX, tipY) ||
                underLabel((x(a.x) + tipX) / 2, (y(a.y) + tipY) / 2)
              ) {
                return null;
              }
              return (
                <g key={i} opacity={f(0.3 + 0.4 * (magnitude / maxMagnitude))}>
                  <line
                    x1={x(a.x)}
                    y1={y(a.y)}
                    x2={tipX}
                    y2={tipY}
                    stroke={CHART_STRUCTURE.axes}
                    strokeWidth={CHART_STROKE.structure}
                  />
                  <circle cx={tipX} cy={tipY} r={1.2} fill={CHART_STRUCTURE.axes} />
                </g>
              );
            })}

            {/* Sample transport paths and endpoints; the endpoint dots are the
                last circles drawn, so they stay on top of every path. */}
            {paths.map((points, i) => {
              const sample = field.samples[i];
              const end = points[points.length - 1];
              return (
                <g key={i}>
                  <polyline
                    points={points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
                    fill="none"
                    stroke={action}
                    strokeWidth={1}
                    opacity={sample.mode === 0 ? 0.5 : 0.38}
                  />
                  <circle
                    cx={x(sample.noise.x)}
                    cy={y(sample.noise.y)}
                    r={1.8}
                    fill="none"
                    stroke={action}
                    strokeWidth={0.75}
                    opacity={0.7}
                  />
                  <circle cx={x(end.x)} cy={y(end.y)} r={2.4} fill={action} />
                </g>
              );
            })}

            {/* Action mode targets, drawn over the paths so they stay visible */}
            {FLOW_MODES.map((m, i) => {
              const label = MODE_LABELS[i];
              return (
                <g key={i}>
                  <path
                    d={`M${x(m.x) - 6},${y(m.y)} L${x(m.x) + 6},${y(m.y)} M${x(m.x)},${y(m.y) - 6} L${x(m.x)},${y(m.y) + 6}`}
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
      caption="One Euler step cuts the corner and lands short of the modes; five to ten steps land on them."
      source={`Illustrative model: ${field.samples.length} seeded samples in 2 of the chunk's dimensions; π0 ran ${PI0_STEPS} steps, π0.6 and π0.7 run ${PI06_STEPS}.`}
    />
  );
}
