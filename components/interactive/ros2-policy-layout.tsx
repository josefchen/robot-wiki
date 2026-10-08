'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, InstrumentLegend, LegendItem, PlotStage } from '@/components/ui/instrument';
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
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * Ros2PolicyLayout: the ROS 2 graph the article recommends for running a
 * learned policy, drawn top to bottom. Sensor data flows from the drivers
 * through state assembly (which also reads the tf2 frame tree) into the
 * policy server; proposed actions pass through a command gate, the only
 * command publisher, to the controller bridge and its real-time loop. A
 * supervisor receives the task goal as an action and drives the policy
 * server, gate and bridge through lifecycle transitions.
 *
 * A static schematic: no controls, no state. The stage draws only the chain
 * that makes the point, from the sensors through the safety check to a
 * drawn robot arm, with two short link labels. The supervisor and the tf2
 * store, the ROS 2 names, every link's delivery details, QoS setting,
 * timeout and source sit in "How this was made".
 */

const W = CHART_VIEW_WIDTH;

/** The node column on the left; arrows run down its left side. */
const BOX = { x: 8, w: 184, h: 30 };
const BOX_RIGHT = BOX.x + BOX.w;
const ARROW_X = 24;
const LABEL_X = 36;
const LINE = 18;
/** First label baseline below the box above a gap. */
const GAP_FIRST = 22;
const gapHeight = (lines: number) => (lines === 0 ? 24 : GAP_FIRST + (lines - 1) * LINE + 16);

const HEAD_LEN = 7;
const HEAD_HALF = 4;

type NodeId = 'drivers' | 'state' | 'policy' | 'gate' | 'bridge' | 'hardware';

/**
 * Box label in plain words, the node's ROS 2 name for the method fold, and
 * how many label lines the gap under the box needs. The hardware is drawn
 * as a robot arm rather than a box, so it cannot be mistaken for the part
 * that drives it.
 */
const NODES: { id: NodeId; label: string; name: string; gapLines: number }[] = [
  { id: 'drivers', label: 'camera and joint sensors', name: 'camera and joint drivers', gapLines: 0 },
  { id: 'state', label: 'gathers the latest readings', name: 'state assembly', gapLines: 0 },
  { id: 'policy', label: 'AI that suggests moves', name: 'policy server', gapLines: 1 },
  { id: 'gate', label: 'safety check', name: 'command gate', gapLines: 1 },
  { id: 'bridge', label: 'drives the motors', name: 'controller bridge', gapLines: 0 },
  { id: 'hardware', label: 'robot arm', name: 'robot hardware', gapLines: 0 },
];
/** Parts of the layout the drawing leaves out; the method fold names them. */
const SUPERVISOR = { label: 'task manager', name: 'supervisor' };
const STORE_NAMES = { label: 'arm positions', name: 'tf2 frame tree' };

const FIRST_BOX_Y = 8;

/** Each box's top edge, stacked with the gap its outgoing label needs. */
const BOX_Y = NODES.reduce<Record<NodeId, number>>(
  (acc, node, i) => {
    acc[node.id] = i === 0 ? FIRST_BOX_Y : acc[NODES[i - 1].id] + BOX.h + gapHeight(NODES[i - 1].gapLines);
    return acc;
  },
  {} as Record<NodeId, number>,
);
const centreY = (id: NodeId) => BOX_Y[id] + BOX.h / 2;

/** The drawn robot arm, side on, standing under the arrow from the motor driver. */
const ARM = (() => {
  const top = BOX_Y.hardware;
  return {
    elbow: { x: ARROW_X, y: top + 10 },
    shoulder: { x: ARROW_X + 12, y: top + 50 },
    wrist: { x: ARROW_X + 76, y: top + 18 },
    ground: top + 66,
  };
})();
const VIEW_H = ARM.ground + 8;

type Edge = {
  id: string;
  /** The words the stage writes beside the link, one entry per line; most links carry none. */
  stage: readonly string[];
  /** What the link carries, in plain words, for the method fold. */
  plain: string;
  /** The ROS 2 interface: kind and payload. */
  kind: string;
  /** The QoS or timing setting. */
  note?: string;
  /** The method-fold entry: QoS and caveats in full. */
  method: string;
  sources: string[];
};

/** The vertical edges, keyed by the node they leave. */
const DOWN_EDGES: Partial<Record<NodeId, Edge>> = {
  drivers: {
    id: 'drivers-to-state',
    stage: [],
    plain: 'Camera pictures and joint positions; late readings may be skipped',
    kind: 'topic: camera images, joint states',
    note: 'sensor data: best effort, small queue',
    method:
      'Camera and joint drivers to state assembly, over topics. The sensor-data QoS profile uses best effort and a smaller queue, because timely readings matter more than complete ones.',
    sources: ['ros2-qos-2026'],
  },
  state: {
    id: 'state-to-policy',
    stage: [],
    plain: 'The newest readings, checked to be recent',
    kind: 'topic: observation',
    note: 'log message age here',
    method:
      'State assembly to the policy server, over a topic. A reliable camera subscription with a deep queue can make a policy act on old images, so log message age at this boundary.',
    sources: [],
  },
  policy: {
    id: 'policy-to-gate',
    stage: ['suggested moves'],
    plain: 'Suggested moves, all delivered',
    kind: 'topic: proposed actions',
    note: 'reliable',
    method:
      'Policy server to the command gate, over a topic. The default QoS profile is reliable and keeps the last 10 messages.',
    sources: ['ros2-qos-2026'],
  },
  gate: {
    id: 'gate-to-bridge',
    stage: ['checked moves only'],
    plain: 'Checked moves, the only path to the motors',
    kind: 'topic: commands',
    note: 'the only command publisher',
    method:
      'Command gate to the controller bridge, over a topic. The gate is the only node that publishes commands; two command publishers without arbitration is a common integration failure.',
    sources: [],
  },
  bridge: {
    id: 'bridge-to-hardware',
    stage: [],
    plain: 'Motor commands at steady, exact intervals',
    kind: 'real-time loop',
    method:
      "Controller bridge to the robot hardware, in the real-time loop. ROS 2's real-time guidance keeps page faults, dynamic allocation and indefinitely blocking synchronization out of this path, so inference stays outside it unless its worst case fits.",
    sources: ['ros2-realtime-docs-2026'],
  },
};

const TF2_EDGE: Edge = {
  id: 'tf2-to-state',
  stage: [],
  plain: 'The arm positions (the tf2 frame tree) give the arm position at the moment each photo was taken',
  kind: 'tf2 lookup',
  note: "frames at the image's timestamp",
  method:
    "tf2 frame tree to state assembly, as a tf2 lookup. tf2 keeps a time-buffered tree of coordinate frames. A lookup at the image's timestamp can wait for the transform; the tf2 tutorial raises an exception only if it is still unavailable after a 50 ms timeout.",
  sources: ['tf2-docs-2026', 'tf2-time-tutorial-2026'],
};

const TASK_EDGE: Edge = {
  id: 'task-to-supervisor',
  stage: [],
  plain: 'The task manager (the supervisor) takes the task request',
  kind: 'action: task goal with feedback and cancel',
  method:
    'Task request to the supervisor, as an action: a long-running goal with feedback, cancellation and a result.',
  sources: ['ros2-interfaces-2026'],
};

const LIFECYCLE_EDGE: Edge = {
  id: 'supervisor-lifecycle',
  stage: [],
  plain:
    'The task manager starts and stops these three parts: the AI that suggests moves, the safety check and the part that drives the motors',
  kind: 'lifecycle: start, stop, deactivate',
  method:
    "Supervisor to the policy server, command gate and controller bridge, through lifecycle transitions. ROS 2 managed nodes leave a primary state only at an external supervisor's request or on an error in the Active state.",
  sources: ['ros2-lifecycle-design-2015'],
};

/** Every edge in reading order, for the method list and the description. */
const ALL_EDGES: Edge[] = [
  TASK_EDGE,
  DOWN_EDGES.drivers!,
  TF2_EDGE,
  DOWN_EDGES.state!,
  DOWN_EDGES.policy!,
  DOWN_EDGES.gate!,
  DOWN_EDGES.bridge!,
  LIFECYCLE_EDGE,
];

/** Round every rendered coordinate so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** A straight arrow: the shaft stops at the head's base, the head is filled. */
function arrowPaths(x1: number, y1: number, x2: number, y2: number) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * HEAD_LEN;
  const by = y2 - uy * HEAD_LEN;
  return {
    shaft: `M ${f(x1)} ${f(y1)} L ${f(bx)} ${f(by)}`,
    head: `M ${f(x2)} ${f(y2)} L ${f(bx - uy * HEAD_HALF)} ${f(by + ux * HEAD_HALF)} L ${f(bx + uy * HEAD_HALF)} ${f(by - ux * HEAD_HALF)} Z`,
  };
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  colour,
  edge,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour: string;
  edge: string;
}) {
  const { shaft, head } = arrowPaths(x1, y1, x2, y2);
  return (
    <g data-edge={edge}>
      <path
        d={shaft}
        fill="none"
        stroke={colour}
        strokeWidth={CHART_STROKE.trace}
      />
      <path d={head} fill={colour} />
    </g>
  );
}

function StageText({
  x,
  y,
  children,
  secondary = false,
  anchor = 'start',
  weight,
}: {
  x: number;
  y: number;
  children: string;
  secondary?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
}) {
  return (
    <text
      data-chart-label=""
      x={f(x)}
      y={f(y)}
      textAnchor={anchor}
      fontSize={CHART_TYPE.labelPx}
      fontWeight={weight}
      fill={secondary ? CHART_STRUCTURE.labelSecondary : CHART_STRUCTURE.label}
    >
      {children}
    </text>
  );
}

/** Drops a label's baseline so the text sits centred on a row. */
const BASELINE_DROP = Math.round(CHART_TYPE.labelPx * 0.35);

/** The node the annotation points at, drawn at full emphasis. */
const FOCUS: NodeId = 'gate';

function NodeBox({ id, x, y, w, label }: { id: NodeId; x: number; y: number; w: number; label: string }) {
  const focus = id === FOCUS;
  return (
    <g data-node={id}>
      <rect
        x={x}
        y={y}
        width={w}
        height={BOX.h}
        fill={MOTION_STAGE.background}
        stroke={CHART_STRUCTURE.label}
        strokeWidth={focus ? CHART_STROKE.trace : CHART_STROKE.structure}
      />
      <StageText x={x + w / 2} y={y + BOX.h / 2 + BASELINE_DROP} anchor="middle" weight={focus ? 600 : 500}>
        {label}
      </StageText>
    </g>
  );
}

const ARM_W = 10;
const JOINT_R = 6;

/** The robot hardware as a side view of an arm: a base, two parts, two joints and a gripper. */
function RobotArm() {
  const { elbow, shoulder, wrist, ground } = ARM;
  const outline = CHART_STRUCTURE.labelSecondary;
  const palmY = wrist.y + 12;
  const label = NODES.find((node) => node.id === 'hardware')!.label;
  return (
    <g data-node="hardware">
      <line x1={BOX.x} y1={ground} x2={wrist.x + 40} y2={ground} stroke={outline} strokeWidth={CHART_STROKE.trace} />
      <rect
        x={shoulder.x - 14}
        y={shoulder.y}
        width={28}
        height={ground - shoulder.y}
        fill={CHART_STRUCTURE.grid}
        stroke={outline}
        strokeWidth={CHART_STROKE.structure}
      />
      {[ARM_W + 2, ARM_W].map((width) => (
        <path
          key={width}
          d={`M ${shoulder.x} ${shoulder.y} L ${elbow.x} ${elbow.y} L ${wrist.x} ${wrist.y}`}
          fill="none"
          stroke={width === ARM_W ? CHART_STRUCTURE.grid : outline}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <g fill="none" stroke={outline} strokeLinecap="round">
        <path d={`M ${wrist.x} ${wrist.y} V ${palmY}`} strokeWidth={5} />
        <path d={`M ${wrist.x - 10} ${palmY} H ${wrist.x + 10}`} strokeWidth={3} />
        <path d={`M ${wrist.x - 9} ${palmY} v 16 M ${wrist.x + 9} ${palmY} v 16`} strokeWidth={3} />
      </g>
      {[shoulder, elbow].map((joint) => (
        <circle
          key={`${joint.x}-${joint.y}`}
          cx={joint.x}
          cy={joint.y}
          r={JOINT_R}
          fill={MOTION_STAGE.background}
          stroke={outline}
          strokeWidth={CHART_STROKE.trace}
        />
      ))}
      <StageText x={wrist.x + 24} y={palmY + BASELINE_DROP} weight={500}>
        {label}
      </StageText>
    </g>
  );
}

function RowSource({ id, lookup }: { id: string; lookup: ReturnType<typeof useCitationLookup> }) {
  const record = lookup(id);
  if (!record) return null;
  return (
    <a
      data-brand-control-id="control:link-focus"
      data-source-id={id}
      href={record.url}
      target="_blank"
      rel="noopener"
      className="underline-offset-2"
    >
      {record.label}
    </a>
  );
}

function PolicyGraph({ descriptionId }: { descriptionId: string }) {
  const sensing = roleColour('state');
  const command = roleColour('action');
  const below = (id: NodeId) => BOX_Y[id] + BOX.h;
  const noteTop = BOX_Y[FOCUS] + 2;
  return (
    <PlotStage
      viewBox={`0 0 ${W} ${VIEW_H}`}
      aria-label="ROS 2 graph for a learned policy, top to bottom: camera and joint sensors (drivers), a part that gathers the latest readings (state assembly), the AI that suggests moves (policy server), a safety check (command gate), the part that drives the motors (controller bridge) and a drawn robot arm (the robot hardware). Every move the AI suggests passes the safety check before it reaches the motors."
      aria-describedby={descriptionId}
      data-testid="ros2-policy-graph"
    >
      {NODES.filter((node) => node.id !== 'hardware').map((node) => (
        <NodeBox key={node.id} id={node.id} x={BOX.x} y={BOX_Y[node.id]} w={BOX.w} label={node.label} />
      ))}
      <RobotArm />

      {NODES.map((node) => {
        const edge = DOWN_EDGES[node.id];
        if (!edge || edge.stage.length === 0) return null;
        const top = below(node.id) + GAP_FIRST;
        return (
          <g key={edge.id} data-edge-label={edge.id}>
            {edge.stage.map((line, i) => (
              <StageText key={line} x={LABEL_X} y={top + i * LINE} secondary={i > 0}>
                {line}
              </StageText>
            ))}
          </g>
        );
      })}

      <g data-series="sensing" data-chart-role="state">
        <Arrow edge="drivers-to-state" x1={ARROW_X} y1={below('drivers')} x2={ARROW_X} y2={BOX_Y.state} colour={sensing} />
        <Arrow edge="state-to-policy" x1={ARROW_X} y1={below('state')} x2={ARROW_X} y2={BOX_Y.policy} colour={sensing} />
      </g>
      <g data-series="commands" data-chart-role="action">
        <Arrow edge="policy-to-gate" x1={ARROW_X} y1={below('policy')} x2={ARROW_X} y2={BOX_Y.gate} colour={command} />
        <Arrow edge="gate-to-bridge" x1={ARROW_X} y1={below('gate')} x2={ARROW_X} y2={BOX_Y.bridge} colour={command} />
        <Arrow
          edge="bridge-to-hardware"
          x1={ARROW_X}
          y1={below('bridge')}
          x2={ARROW_X}
          y2={ARM.elbow.y - JOINT_R - 2}
          colour={command}
        />
      </g>

      <StageAnnotation
        x={226}
        y={noteTop}
        lines={['Every suggested', 'move is checked', 'here first']}
        from={[222, centreY(FOCUS) - 2]}
        target={[BOX_RIGHT + 2, centreY(FOCUS)]}
        pointer="arrow"
      />
    </PlotStage>
  );
}

export function Ros2PolicyLayout({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="ros2-policy-layout"
      className={className}
      kicker="ROS 2 software layout"
      heading="The AI's moves pass a safety check first"
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="sensing" swatch={<LegendSwatch role="state" mark="line" />}>
                  what the robot senses
                </LegendItem>
                <LegendItem series="commands" swatch={<LegendSwatch role="action" mark="line" />}>
                  moves
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Schematic: one recommended layout, not a required one</StageStatus>
            </>
          }
        >
          {/* The wrapper is the type-scale container, so stage text keeps its size on a capped drawing. */}
          <div className="@container max-w-[400px]">
            <PolicyGraph descriptionId={descriptionId} />
          </div>
        </FigureStage>
      }
      caption="Separate parts let engineers test, stop or swap the AI without touching what moves the robot."
      method={
        <>
          <div>
            One robust layout for a learned-policy graph, as the article recommends: drivers, state assembly, a
            policy server, a command gate, a controller bridge and a supervisor, each its own node. The drawing
            names them in plain words:{' '}
            {NODES.map((node) => `"${node.label}" is the ${node.name}`).join('; ')}. It leaves out two parts
            to keep the chain to the motors in view:{' '}
            {[SUPERVISOR, STORE_NAMES].map((node) => `the ${node.name}, a "${node.label}"`).join(', and ')}.
            Each link below says in plain words what it carries, then names its ROS 2 interface, its QoS or
            timing, and its source.
          </div>
          <ul data-testid="ros2-policy-edges" className="list-disc space-y-1.5 pl-5">
            {ALL_EDGES.map((edge) => (
              <li key={edge.id} data-edge-method={edge.id}>
                <span className="font-medium" data-edge-plain="">{edge.plain}.</span> {edge.method}
                {edge.sources.length > 0 ? (
                  <>
                    {' '}
                    Source:{' '}
                    {edge.sources.map((id, i) => (
                      <span key={id}>
                        {i > 0 ? '; ' : null}
                        <RowSource id={id} lookup={citationFor} />
                      </span>
                    ))}
                    .
                  </>
                ) : (
                  ' Source: this article.'
                )}
              </li>
            ))}
          </ul>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Graph data"
            description="Six ROS 2 nodes run top to bottom from camera and joint drivers to the controller bridge; sensor topics use best effort, proposed actions travel reliably with the last 10 messages kept, a tf2 lookup waits up to 50 ms, and only the command gate publishes commands."
            states={ALL_EDGES.map((edge) => ({
              label: edge.id.replace(/-/g, ' '),
              value: edge.note ? `${edge.kind}; ${edge.note}` : edge.kind,
            }))}
          />
        </>
      }
    />
  );
}
