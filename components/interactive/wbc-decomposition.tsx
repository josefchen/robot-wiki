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
  CHART_VIEW_WIDTH,
  LegendSwatch,
  StageAnnotation,
  annotationArrow,
  roleColour,
  type ChartPoint,
} from '@/components/motion/chart';
import {
  APPROACH_ORDER,
  DEFAULT_APPROACH,
  approachById,
  fastestRateLabel,
  type WbcApproach,
  type WbcApproachId,
} from '@/lib/wbc-decomposition';
import { MOTION_STAGE } from '@/lib/motion-tokens';

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
const HEIGHT = 228;
const BAND_LEFT = 4;
const BAND_RIGHT = 228;
const BAND_H = 44;
const STACK_TOP = 6;
const STACK_BOTTOM = 168;
const TEXT_X = BAND_LEFT + 14;
const LINE_STEP_EM = 1.25;
const BAND_MID = (BAND_LEFT + BAND_RIGHT) / 2;
/**
 * The note sits under the stack, and its arrow rises from the note's left
 * end to the bottom layer. Grey arrows between the layers run down, so the
 * note's own arrow does not read as something flowing up.
 */
const NOTE_Y = STACK_BOTTOM + 36;
const NOTE_ARROW: { from: ChartPoint; target: ChartPoint } = {
  from: [TEXT_X + 6, NOTE_Y - 16],
  target: [TEXT_X + 6, STACK_BOTTOM],
};

/**
 * Each layer in plain words, keyed by approach and layer order. A line
 * holds about 26 characters, what fits a layer box on a 320 px phone.
 * A rate the source does not disclose stays in "How this was made".
 */
const PLAIN_LAYERS: Record<WbcApproachId, readonly (readonly [string, string])[]> = {
  'tracking-rl': [
    ['Sees the scene and decides', 'what to do next'],
    ['Plans how each arm and leg', 'moves, 200 times a second'],
    ['Drives every joint motor,', '1,000 times a second'],
  ],
  'latent-action': [
    ['Sees, reads the task and', 'sends moves in short code'],
    ['Turns the code into joint', 'moves, 50 times a second'],
  ],
  'end-to-end-vla': [
    ['Plans the task in steps;', 'its speed is not published'],
    ['One network for the whole', 'body; speed not published'],
  ],
};

/** The plain names on the design buttons: whose robot brain each stack is. */
const DESIGN_LABELS: Record<WbcApproachId, string> = {
  'tracking-rl': 'Figure AI',
  'latent-action': 'NVIDIA',
  'end-to-end-vla': 'Google DeepMind',
};
/** The group label says what a choice changes: whose robot brain the stack shows. */
const DESIGN_GROUP_LABEL = 'Robot brain by';

/** The status line names whose published speeds the stack shows. */
const STATUS: Record<WbcApproachId, string> = {
  'tracking-rl': 'Schematic; speeds as published by Figure AI',
  'latent-action': 'Schematic; speeds as published by NVIDIA',
  'end-to-end-vla': 'Schematic; Google DeepMind publishes no speeds',
};

/** The note on the bottom layer, the one that moves the joints. */
const ANNOTATIONS: Record<WbcApproachId, readonly [string, string]> = {
  'tracking-rl': ['Fastest layer: it keeps the', 'robot balanced as it moves'],
  'latent-action': ['Fastest layer: moves every joint', '50 times a second'],
  'end-to-end-vla': ['No separate balance layer: one', 'network drives every joint'],
};

function wbcTakeaway(approach: WbcApproach, fastest: string): string {
  if (approach.id === 'tracking-rl') {
    return `Motion-tracking RL, represented by ${approach.representative}, stacks ${approach.layers.length} control layers ending at a ${fastest} S0 loop that drives the actuators; the note points at that bottom layer, which keeps the robot balanced, and the retargeted human motion is the interface so layers above never name a torque.`;
  }
  if (approach.id === 'latent-action') {
    return `Latent-action hierarchy, represented by ${approach.representative}, splits the stack into ${approach.layers.length} layers (3B-parameter VLA over a ${fastest} controller); the note points at the controller, the layer that drives the joint motors, and latent tokens are the interface so the VLA never names a joint.`;
  }
  return `End-to-end VLA, represented by ${approach.representative}, keeps ${approach.layers.length} layers and no separate whole-body controller; the note points at the VLA itself as the layer that drives the joint motors across 3 embodiments, because there is no internal interface between policy and robot.`;
}

/** A humanoid seen from the front, as tall as the stack, its joint motors marked as dots. */
const BODY_X = 286;
const BODY_TOP = 8;
const by = (y: number) => y - 56 + BODY_TOP;
const MOTORS: readonly (readonly [number, number])[] = [
  [BODY_X - 16, by(92)],
  [BODY_X + 16, by(92)],
  [BODY_X - 27, by(120)],
  [BODY_X + 27, by(120)],
  [BODY_X - 8, by(142)],
  [BODY_X + 8, by(142)],
  [BODY_X - 9, by(178)],
  [BODY_X + 9, by(178)],
];
/** The bottom layer's arrow runs level from its band into the robot's near leg. */
const ROBOT_LINK_Y = STACK_BOTTOM - BAND_H / 2;
const ROBOT_LINK_X = BODY_X - 12;

function Humanoid() {
  const ink = CHART_STRUCTURE.label;
  return (
    <g data-testid="robot-boundary">
      <g data-testid="humanoid" fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" strokeLinejoin="round">
        <rect x={BODY_X - 10} y={by(56)} width={20} height={22} rx={2} />
        <line x1={BODY_X} y1={by(78)} x2={BODY_X} y2={by(84)} />
        <rect x={BODY_X - 16} y={by(84)} width={32} height={58} rx={2} />
        <polyline points={`${BODY_X - 16},${by(92)} ${BODY_X - 27},${by(120)} ${BODY_X - 30},${by(146)}`} />
        <polyline points={`${BODY_X + 16},${by(92)} ${BODY_X + 27},${by(120)} ${BODY_X + 30},${by(146)}`} />
        <polyline points={`${BODY_X - 8},${by(142)} ${BODY_X - 9},${by(178)} ${BODY_X - 10},${by(212)} ${BODY_X - 20},${by(212)}`} />
        <polyline points={`${BODY_X + 8},${by(142)} ${BODY_X + 9},${by(178)} ${BODY_X + 10},${by(212)} ${BODY_X + 20},${by(212)}`} />
      </g>
      <g data-series="motors" data-chart-role="action">
        {MOTORS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.75} fill={MOTION_STAGE.background} stroke={roleColour('action')} strokeWidth={CHART_STROKE.structure} />
        ))}
      </g>
    </g>
  );
}

/**
 * A grey arrow for what passes down the stack: from one layer to the
 * next, and from the bottom layer into the robot it drives.
 */
function FlowArrow({ from, to }: { from: ChartPoint; to: ChartPoint }) {
  const arrow = annotationArrow(from, to);
  if (!arrow) return null;
  return (
    <g data-flow-arrow="">
      <line
        x1={from[0]}
        y1={from[1]}
        x2={arrow.end[0]}
        y2={arrow.end[1]}
        stroke={CHART_STRUCTURE.axes}
        strokeWidth={CHART_STROKE.reference}
      />
      <polygon points={arrow.head.map(([x, y]) => `${x},${y}`).join(' ')} fill={CHART_STRUCTURE.axes} />
    </g>
  );
}

/**
 * One layer as a short wide band with its plain label. The bottom band,
 * the one the note names, carries the full-weight outline; the others
 * step back to a thin grey one.
 */
function StackLayer({
  lines,
  index,
  top,
  noted,
}: {
  lines: readonly [string, string];
  index: number;
  top: number;
  noted: boolean;
}) {
  const midY = Number((top + BAND_H / 2).toFixed(2));
  return (
    <g data-testid={`layer-${index}`} data-noted={noted ? '' : undefined}>
      <rect
        x={BAND_LEFT}
        y={top}
        width={BAND_RIGHT - BAND_LEFT}
        height={BAND_H}
        fill="none"
        stroke={noted ? CHART_STRUCTURE.label : 'var(--chart-medium)'}
        strokeWidth={noted ? CHART_STROKE.trace : CHART_STROKE.reference}
      />
      <text x={TEXT_X} y={midY} fill={CHART_STRUCTURE.label}>
        <tspan x={TEXT_X} dy={`${-LINE_STEP_EM / 2 + 0.35}em`}>
          {lines[0]}
        </tspan>
        <tspan x={TEXT_X} dy={`${LINE_STEP_EM}em`}>
          {lines[1]}
        </tspan>
      </text>
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
          label={DESIGN_GROUP_LABEL}
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
                <LegendItem series="motors" swatch={<LegendSwatch role="action" mark="dot" />}>
                  joint motors
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>{STATUS[approach.id]}</StageStatus>
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
                lines={plain[i]}
                index={i}
                top={layerTop(i)}
                noted={i === layerCount - 1}
              />
            ))}
            {approach.layers.slice(1).map((layer, i) => (
              <FlowArrow key={layer.name} from={[BAND_MID, layerTop(i) + BAND_H + 1]} to={[BAND_MID, layerTop(i + 1)]} />
            ))}
            <FlowArrow from={[BAND_RIGHT + 2, ROBOT_LINK_Y]} to={[ROBOT_LINK_X, ROBOT_LINK_Y]} />
            <StageAnnotation
              x={TEXT_X}
              y={NOTE_Y}
              lines={ANNOTATIONS[approach.id]}
              from={NOTE_ARROW.from}
              target={NOTE_ARROW.target}
              pointer="arrow"
            />
            <Humanoid />
          </PlotStage>
        </FigureStage>
      }
      caption="Splitting the work lets a slow planner think while a fast layer keeps the robot balanced and moving."
      method={
        <>
          <p>
            The three robot brains are the three whole-body control decompositions shipping in 2026: Figure AI&rsquo;s
            Helix 02 is motion-tracking RL, NVIDIA&rsquo;s GR00T with GEAR-SONIC is a latent-action hierarchy, and
            Google DeepMind&rsquo;s Gemini Robotics 2 is an end-to-end VLA. They differ in where they draw the lines
            between layers. {approach.idea}
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
    />
  );
}
