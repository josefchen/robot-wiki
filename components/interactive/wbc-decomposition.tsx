'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
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
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  APPROACH_ORDER,
  DEFAULT_APPROACH,
  approachById,
  fastestRateLabel,
  type WbcApproach,
  type WbcApproachId,
  type WbcLayer,
} from '@/lib/wbc-decomposition';

/**
 * WbcDecomposition: the three-decomposition comparison for the humanoid
 * whole-body control module. Selecting an approach redraws the control
 * stack (one box per layer, arrows labeled with what each layer passes
 * down to the actuators) and updates the readouts with the figures each
 * source actually publishes.
 *
 * The point the diagram makes: all three 2026 stacks reach the same robot,
 * but they draw the learning boundary in different places. Helix 02 keeps
 * a discrete motion-tracking controller at 1 kHz under its VLA, GR00T
 * hands latent tokens to a separate whole-body controller, and Gemini
 * Robotics 2 removes the boundary entirely.
 *
 * Interactive contract: deterministic initial render (motion-tracking RL),
 * native buttons (keyboard-accessible, aria-pressed), visible readouts,
 * reset control, fixed SVG viewport (no layout shift). Nothing animates,
 * so the component is reduced-motion safe by construction.
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 250;
const BOX_LEFT = 4;
const BOX_W = WIDTH - 2 * BOX_LEFT;
const BOX_H = 46;
const TOP = 2;
const ROBOT_H = 28;
/** The robot stays put across approaches; the stack above it is spread to fill the stage. */
const ROBOT_TOP = HEIGHT - 2 - ROBOT_H;
const TEXT_X = BOX_LEFT + 16;
const ARROW_X = BOX_LEFT + 22;
const ARROW_HEAD = 6;

/** Baseline that centres one line of the given type size between two edges. */
function centredBaseline(top: number, bottom: number, px: number): number {
  return Number(((top + bottom) / 2 + ((CHART_TYPE.ascent - CHART_TYPE.descent) / 2) * px).toFixed(2));
}

function wbcTakeaway(approach: WbcApproach, fastest: string): string {
  if (approach.id === 'tracking-rl') {
    return `Motion-tracking RL, represented by ${approach.representative}, stacks ${approach.layers.length} control layers ending at a ${fastest} S0 actuator loop; the lime bar marks the layer that talks to the actuators, and the retargeted human motion is the interface so layers above never name a torque.`;
  }
  if (approach.id === 'latent-action') {
    return `Latent-action hierarchy, represented by ${approach.representative}, splits the stack into ${approach.layers.length} layers (3B-parameter VLA over an undisclosed-rate controller); the lime bar still marks the actuator-facing box, and latent tokens are the interface so the VLA never names a joint.`;
  }
  return `End-to-end VLA, represented by ${approach.representative}, keeps ${approach.layers.length} layers and no separate whole-body controller; the lime bar marks the VLA itself as the layer that talks to the actuators across 3 embodiments, because there is no internal interface between policy and robot.`;
}

/** Legend swatch drawn like the bar inside the actuator-facing layer. */
function ActuatorBarSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <rect x={h - 2} y={0} width={4} height={h} fill={roleColour('highlight')} />
    </svg>
  );
}

/**
 * One layer box, its loop rate, and the labelled arrow carrying its output
 * down to the next layer or to the actuators.
 */
function StackLayer({
  layer,
  index,
  top,
  nextTop,
  actuatorFacing,
}: {
  layer: WbcLayer;
  index: number;
  top: number;
  nextTop: number;
  actuatorFacing: boolean;
}) {
  const action = roleColour('action');
  const gapTop = top + BOX_H;
  const numericRate = layer.rateHz !== null;
  return (
    <g data-testid={`layer-${index}`}>
      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        <rect
          x={BOX_LEFT}
          y={top}
          width={BOX_W}
          height={BOX_H}
          fill="none"
          stroke={CHART_STRUCTURE.axes}
          strokeWidth={CHART_STROKE.structure}
        />
      </g>
      {actuatorFacing && (
        <rect
          data-series="actuator-layer"
          data-chart-role="highlight"
          x={BOX_LEFT + 6}
          y={top + 8}
          width={4}
          height={BOX_H - 16}
          fill={roleColour('highlight')}
        />
      )}
      <text x={TEXT_X} y={top + 19} fill={CHART_STRUCTURE.label}>
        {layer.name}
      </text>
      {numericRate ? (
        <text data-scene-readout="" x={TEXT_X} y={top + 38} fill={CHART_STRUCTURE.label}>
          {layer.rate}
        </text>
      ) : (
        <text data-scene-note="" x={TEXT_X} y={top + 38} fill={CHART_STRUCTURE.labelSecondary}>
          {layer.rate}
        </text>
      )}
      <g data-series="flow" data-chart-role="action">
        <line
          x1={ARROW_X}
          y1={gapTop + 3}
          x2={ARROW_X}
          y2={nextTop - ARROW_HEAD - 1}
          stroke={action}
          strokeWidth={CHART_STROKE.reference}
        />
        <polygon
          points={`${ARROW_X - 4},${nextTop - ARROW_HEAD - 2} ${ARROW_X + 4},${nextTop - ARROW_HEAD - 2} ${ARROW_X},${nextTop - 2}`}
          fill={action}
        />
        <text data-scene-note="" x={ARROW_X + 12} y={centredBaseline(gapTop, nextTop, CHART_TYPE.axisPx)} fill={action}>
          {layer.output}
        </text>
      </g>
    </g>
  );
}

export function WbcDecomposition({
  defaultApproach = DEFAULT_APPROACH,
  className,
}: {
  defaultApproach?: WbcApproachId;
  className?: string;
}) {
  const descriptionId = `${useId()}-description`;
  const [approachId, setApproachId] = useState<WbcApproachId>(defaultApproach);
  const approach = approachById(approachId);
  const fastest = fastestRateLabel(approach);
  const layerCount = approach.layers.length;
  const slot = (ROBOT_TOP - TOP) / layerCount;
  const layerTop = (i: number) => Number((TOP + i * slot).toFixed(2));

  return (
    <InstrumentFigure
      figureId="wbc-decomposition"
      className={className}
      heading="Whole-body control stacks, top layer to actuators"
      controls={
        <>
          <div
            role="group"
            aria-label="Whole-body control decomposition"
            className="flex flex-wrap items-center gap-1"
          >
            {APPROACH_ORDER.map((id) => (
              <button
                data-brand-control-id="control:selection"
                key={id}
                type="button"
                aria-pressed={approachId === id}
                onClick={() => setApproachId(id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {approachById(id).name}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={() => setApproachId(DEFAULT_APPROACH)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="flow" swatch={<LegendSwatch role="action" mark="line" />}>
                  what each layer passes down
                </LegendItem>
                <LegendItem series="actuator-layer" swatch={<ActuatorBarSwatch />}>
                  layer that talks to the actuators
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Representative:{' '}
                  <span data-testid="representative-readout">{approach.representative}</span>
                </span>
                <span>
                  Layers: <span data-testid="layers-readout">{layerCount}</span>
                </span>
                <span>
                  Fastest loop: <span data-testid="fastest-loop-readout">{fastest}</span>
                </span>
              </InstrumentReadout>
              <dl
                data-testid="wbc-stats"
                className="grid basis-full grid-cols-2 gap-x-4 gap-y-2 border-t border-border-strong pt-2 font-sans text-[13px] leading-snug sm:grid-cols-4"
              >
                {approach.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-text-dim">{stat.label}</dt>
                    <dd className="mt-0.5 tabular-nums text-text">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="basis-full pt-1 font-sans text-[13px] leading-snug text-text">
                In this stack, {approach.interfaceNote}. Openness: {approach.openness}.
              </p>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current whole-body stack"
                description={wbcTakeaway(approach, fastest)}
                states={[
                  { label: 'approach', value: approach.name },
                  { label: 'representative', value: approach.representative },
                  { label: 'layers', value: String(layerCount) },
                  { label: 'fastest loop', value: fastest },
                  { label: 'top layer', value: approach.layers[0].name },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Whole-body control stack for the ${approach.name} decomposition, representative system ${approach.representative}. ${layerCount} layers from ${approach.layers[0].name} down to full-body actuators. Fastest disclosed loop ${fastest}.`}
            aria-describedby={descriptionId}
            data-testid="wbc-diagram"
          >
            {approach.layers.map((layer, i) => (
              <StackLayer
                key={layer.name}
                layer={layer}
                index={i}
                top={layerTop(i)}
                nextTop={i === layerCount - 1 ? ROBOT_TOP : layerTop(i + 1)}
                actuatorFacing={i === layerCount - 1}
              />
            ))}
            <g data-testid="robot-boundary">
              <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
                <rect
                  x={BOX_LEFT}
                  y={ROBOT_TOP}
                  width={BOX_W}
                  height={ROBOT_H}
                  fill="none"
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.reference}
                />
              </g>
              <text
                data-scene-note=""
                x={WIDTH / 2}
                y={centredBaseline(ROBOT_TOP, ROBOT_TOP + ROBOT_H, CHART_TYPE.axisPx)}
                textAnchor="middle"
                fill={CHART_STRUCTURE.label}
              >
                full-body actuators: legs, torso, arms, hands
              </text>
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Every stack drives the same actuators; the stacks differ in where the learning boundary sits and what crosses it."
      source="Schematic control stacks; the loop rates under each layer name are published values."
    />
  );
}
