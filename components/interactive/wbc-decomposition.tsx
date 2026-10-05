'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  APPROACH_ORDER,
  DEFAULT_APPROACH,
  approachById,
  fastestRateLabel,
  type WbcApproach,
  type WbcApproachId,
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
const HEIGHT = 224;
const BAND_LEFT = 4;
const BAND_RIGHT = 228;
const BAND_H = 44;
const STACK_TOP = 54;
const STACK_BOTTOM = 216;
const TEXT_X = BAND_LEFT + 14;
const ARROW_X = BAND_LEFT + 30;
const ARROW_HEAD = 6;
const LINE_STEP_EM = 1.25;

/** Each layer in plain words, two short lines, keyed by approach and layer order. */
const PLAIN_LAYERS: Record<WbcApproachId, readonly (readonly [string, string])[]> = {
  'tracking-rl': [
    ['Decides the task,', 'when asked'],
    ['Turns what it sees into body', 'poses, 200 times a second'],
    ['Keeps balance and moves every', 'joint, 1,000 times a second'],
  ],
  'latent-action': [
    ['Sees, reads the instruction and', 'writes compact movement codes'],
    ['Turns the codes into joint', 'commands; speed not disclosed'],
  ],
  'end-to-end-vla': [
    ['Plans the task and calls', 'tools, when asked'],
    ['One network moves the whole', 'body; speed not disclosed'],
  ],
};

/** The plain names on the design buttons. */
const DESIGN_LABELS: Record<WbcApproachId, string> = {
  'tracking-rl': 'Copies human motion',
  'latent-action': 'Learned movement codes',
  'end-to-end-vla': 'One big network',
};

const ANNOTATIONS: Record<WbcApproachId, readonly [string, string]> = {
  'tracking-rl': ['Fastest layer: adjusts every joint', '1,000 times a second'],
  'latent-action': ['Only compact movement codes pass', 'between the two networks'],
  'end-to-end-vla': ['No separate balance layer: one', 'network drives every joint'],
};

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

/** A humanoid seen from the front, its joint motors marked as dots. */
const BODY_X = 286;
const MOTORS: readonly (readonly [number, number])[] = [
  [BODY_X - 16, 92],
  [BODY_X + 16, 92],
  [BODY_X - 27, 120],
  [BODY_X + 27, 120],
  [BODY_X - 8, 142],
  [BODY_X + 8, 142],
  [BODY_X - 9, 178],
  [BODY_X + 9, 178],
];

function Humanoid() {
  const ink = CHART_STRUCTURE.label;
  return (
    <g data-testid="robot-boundary">
      <g data-testid="humanoid" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x={BODY_X - 10} y={56} width={20} height={22} rx={6} />
        <line x1={BODY_X} y1={78} x2={BODY_X} y2={84} />
        <rect x={BODY_X - 16} y={84} width={32} height={58} rx={6} />
        <polyline points={`${BODY_X - 16},92 ${BODY_X - 27},120 ${BODY_X - 30},146`} />
        <polyline points={`${BODY_X + 16},92 ${BODY_X + 27},120 ${BODY_X + 30},146`} />
        <polyline points={`${BODY_X - 8},142 ${BODY_X - 9},178 ${BODY_X - 10},212 ${BODY_X - 20},212`} />
        <polyline points={`${BODY_X + 8},142 ${BODY_X + 9},178 ${BODY_X + 10},212 ${BODY_X + 20},212`} />
      </g>
      <g data-series="motors" data-chart-role="action">
        {MOTORS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill={roleColour('action')} />
        ))}
      </g>
    </g>
  );
}

/** One layer as a short wide band with its plain label, and the arrow down to the next. */
function StackLayer({
  lines,
  index,
  top,
  nextTop,
  actuatorFacing,
}: {
  lines: readonly [string, string];
  index: number;
  top: number;
  nextTop: number | null;
  actuatorFacing: boolean;
}) {
  const action = roleColour('action');
  const gapTop = top + BAND_H;
  const midY = Number((top + BAND_H / 2).toFixed(2));
  return (
    <g data-testid={`layer-${index}`}>
      <rect
        x={BAND_LEFT}
        y={top}
        width={BAND_RIGHT - BAND_LEFT}
        height={BAND_H}
        rx={4}
        fill="none"
        stroke={CHART_STRUCTURE.axes}
        strokeWidth={CHART_STROKE.reference}
      />
      {actuatorFacing && (
        <rect
          data-series="actuator-layer"
          data-chart-role="highlight"
          x={BAND_LEFT + 5}
          y={top + 7}
          width={4}
          height={BAND_H - 14}
          fill={roleColour('highlight')}
        />
      )}
      <text x={TEXT_X} y={midY} fill={CHART_STRUCTURE.label}>
        <tspan x={TEXT_X} dy={`${-LINE_STEP_EM / 2 + 0.35}em`}>
          {lines[0]}
        </tspan>
        <tspan x={TEXT_X} dy={`${LINE_STEP_EM}em`}>
          {lines[1]}
        </tspan>
      </text>
      {nextTop !== null ? (
        <g data-series="flow" data-chart-role="action">
          <line x1={ARROW_X} y1={gapTop + 2} x2={ARROW_X} y2={nextTop - ARROW_HEAD - 1} stroke={action} strokeWidth={CHART_STROKE.reference} />
          <polygon
            points={`${ARROW_X - 4},${nextTop - ARROW_HEAD - 2} ${ARROW_X + 4},${nextTop - ARROW_HEAD - 2} ${ARROW_X},${nextTop - 2}`}
            fill={action}
          />
        </g>
      ) : (
        <g data-series="flow" data-chart-role="action">
          {/* The bottom band drives the motors on the body. */}
          <polyline
            points={`${BAND_RIGHT},${midY} ${BODY_X - 34},${midY} ${BODY_X - 34},${MOTORS[4][1]} ${MOTORS[4][0] - 6},${MOTORS[4][1]}`}
            fill="none"
            stroke={action}
            strokeWidth={CHART_STROKE.reference}
          />
          <polygon
            points={`${MOTORS[4][0] - 12},${MOTORS[4][1] - 4} ${MOTORS[4][0] - 12},${MOTORS[4][1] + 4} ${MOTORS[4][0] - 5},${MOTORS[4][1]}`}
            fill={action}
          />
        </g>
      )}
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
  const slot = (STACK_BOTTOM - BAND_H - STACK_TOP) / Math.max(1, layerCount - 1);
  const layerTop = (i: number) => Number((STACK_TOP + i * slot).toFixed(2));
  const plain = PLAIN_LAYERS[approach.id];

  return (
    <InstrumentFigure
      figureId="wbc-decomposition"
      className={className}
      kicker="Humanoid whole-body control"
      heading="Robot brains are layered: slow thinking above, fast reflexes below"
      controls={
        <PresetGroup<WbcApproachId>
          label="Design"
          presets={APPROACH_ORDER.map((id) => ({ id, label: DESIGN_LABELS[id] }))}
          value={approachId}
          onChange={setApproachId}
          testId="wbc-design"
        />
      }
      adjust={<InstrumentReset onClick={() => setApproachId(DEFAULT_APPROACH)} />}
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="actuator-layer" swatch={<ActuatorBarSwatch />}>
                  layer that drives the motors
                </LegendItem>
                <LegendItem series="motors" swatch={<LegendSwatch role="action" mark="dot" />}>
                  joint motors
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Original schematic; speeds are published values</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Whole-body control stack for the ${approach.name} decomposition, representative system ${approach.representative}. ${layerCount} layers from ${approach.layers[0].name} down to full-body actuators. Fastest disclosed loop ${fastest}.`}
            aria-describedby={descriptionId}
            data-testid="wbc-diagram"
          >
            <StageAnnotation x={8} y={16} lines={ANNOTATIONS[approach.id]} />
            {approach.layers.map((layer, i) => (
              <StackLayer
                key={layer.name}
                lines={plain[i]}
                index={i}
                top={layerTop(i)}
                nextTop={i === layerCount - 1 ? null : layerTop(i + 1)}
                actuatorFacing={i === layerCount - 1}
              />
            ))}
            <Humanoid />
          </PlotStage>
        </FigureStage>
      }
      caption="Humanoids split control into layers, slow deciding on top and fast balancing below; designs differ in where they draw those lines."
      method={
        <>
          <p>
            The three designs are the three whole-body control decompositions shipping in 2026: copying human motion
            is motion-tracking RL, learned movement codes is a latent-action hierarchy, and one big network is an
            end-to-end VLA. {approach.idea}
          </p>
          <ul data-testid="wbc-layers" className="m-0! grid list-none gap-0.5 p-0!">
            {approach.layers.map((layer) => (
              <li key={layer.name}>
                {layer.name}, {layer.rate}: passes down {layer.output}.
              </li>
            ))}
          </ul>
          <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Representative: <span data-testid="representative-readout">{approach.representative}</span>
            </span>
            <span>
              Layers: <span data-testid="layers-readout">{layerCount}</span>
            </span>
            <span>
              Fastest loop: <span data-testid="fastest-loop-readout">{fastest}</span>
            </span>
          </InstrumentReadout>
          <dl data-testid="wbc-stats" className="m-0! grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {approach.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-text-dim">{stat.label}</dt>
                <dd className="m-0! mt-0.5 tabular-nums text-text">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p>
            In this stack, {approach.interfaceNote}. Openness: {approach.openness}.
            {approach.lineage.length > 0 ? ` Academic lineage: ${approach.lineage.join(', ')}.` : ''}
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
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
      source="Schematic control stacks; the loop rates under each layer name are published values."
    />
  );
}
