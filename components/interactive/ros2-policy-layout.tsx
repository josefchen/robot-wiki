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
 * server, gate and bridge through lifecycle transitions on a dashed rail.
 *
 * A static schematic: no controls, no state. Every QoS setting, timeout
 * and source sits in "How this was made".
 */

const W = CHART_VIEW_WIDTH;

/** The node column on the left; arrows run down its left side. */
const BOX = { x: 8, w: 176, h: 30 };
const BOX_RIGHT = BOX.x + BOX.w;
const ARROW_X = 24;
const LABEL_X = 36;
const LINE = 18;
/** First label baseline below the box above a gap. */
const GAP_FIRST = 22;
const gapHeight = (lines: number) => GAP_FIRST + (lines - 1) * LINE + 16;

/** The supervisor sits top right; its lifecycle rail runs down the right edge. */
const SUP = { x: 196, y: 52, w: W - 6 - 196, h: 30 };
const RAIL_X = 326;
const TASK_END_X = 96;
const ACTION_LABEL_Y = 100;

const HEAD_LEN = 7;
const HEAD_HALF = 4;

type NodeId = 'drivers' | 'state' | 'policy' | 'gate' | 'bridge' | 'hardware';

/** Box label, and how many label lines the gap under the box needs. */
const NODES: { id: NodeId; label: string; gapLines: number }[] = [
  { id: 'drivers', label: 'camera and joint drivers', gapLines: 2 },
  { id: 'state', label: 'state assembly', gapLines: 3 },
  { id: 'policy', label: 'policy server', gapLines: 2 },
  { id: 'gate', label: 'command gate', gapLines: 2 },
  { id: 'bridge', label: 'controller bridge', gapLines: 1 },
  { id: 'hardware', label: 'robot hardware', gapLines: 0 },
];

const FIRST_BOX_Y = 116;

/** Each box's top edge, stacked with the gap its outgoing label needs. */
const BOX_Y = NODES.reduce<Record<NodeId, number>>(
  (acc, node, i) => {
    acc[node.id] = i === 0 ? FIRST_BOX_Y : acc[NODES[i - 1].id] + BOX.h + gapHeight(NODES[i - 1].gapLines);
    return acc;
  },
  {} as Record<NodeId, number>,
);
const VIEW_H = BOX_Y.hardware + BOX.h + 8;
const centreY = (id: NodeId) => BOX_Y[id] + BOX.h / 2;

/** The tf2 store: an open-sided record beside state assembly. */
const STORE = { x: 204, right: 316 };
const STORE_LABEL_X = 196;

type Edge = {
  id: string;
  /** The interface line on the stage: kind and payload. */
  kind: string;
  /** The QoS or timing line on the stage. */
  note?: string;
  /** The method-fold entry: QoS and caveats in full. */
  method: string;
  sources: string[];
};

/** The vertical edges, keyed by the node they leave. */
const DOWN_EDGES: Partial<Record<NodeId, Edge>> = {
  drivers: {
    id: 'drivers-to-state',
    kind: 'topic: camera images, joint states',
    note: 'sensor data: best effort, small queue',
    method:
      'Camera and joint drivers to state assembly, over topics. The sensor-data QoS profile uses best effort and a smaller queue, because timely readings matter more than complete ones.',
    sources: ['ros2-qos-2026'],
  },
  state: {
    id: 'state-to-policy',
    kind: 'topic: observation',
    note: 'log message age here',
    method:
      'State assembly to the policy server, over a topic. A reliable camera subscription with a deep queue can make a policy act on old images, so log message age at this boundary.',
    sources: [],
  },
  policy: {
    id: 'policy-to-gate',
    kind: 'topic: proposed actions',
    note: 'reliable',
    method:
      'Policy server to the command gate, over a topic. The default QoS profile is reliable and keeps the last 10 messages.',
    sources: ['ros2-qos-2026'],
  },
  gate: {
    id: 'gate-to-bridge',
    kind: 'topic: commands',
    note: 'the only command publisher',
    method:
      'Command gate to the controller bridge, over a topic. The gate is the only node that publishes commands; two command publishers without arbitration is a common integration failure.',
    sources: [],
  },
  bridge: {
    id: 'bridge-to-hardware',
    kind: 'real-time loop',
    method:
      "Controller bridge to the robot hardware, in the real-time loop. ROS 2's real-time guidance keeps page faults, dynamic allocation and indefinitely blocking synchronization out of this path, so inference stays outside it unless its worst case fits.",
    sources: ['ros2-realtime-docs-2026'],
  },
};

const TF2_EDGE: Edge = {
  id: 'tf2-to-state',
  kind: 'tf2 lookup',
  note: "frames at the image's timestamp",
  method:
    "tf2 frame tree to state assembly, as a tf2 lookup. tf2 keeps a time-buffered tree of coordinate frames. A lookup at the image's timestamp can wait for the transform; the tf2 tutorial raises an exception only if it is still unavailable after a 50 ms timeout.",
  sources: ['tf2-docs-2026', 'tf2-time-tutorial-2026'],
};
/** The tf2 lookup label, wrapped to fit between the store and the rail. */
const TF2_LABEL = ['tf2 lookup:', 'frames at the', "image's timestamp"];

const TASK_EDGE: Edge = {
  id: 'task-to-supervisor',
  kind: 'action: task goal with feedback and cancel',
  method:
    'Task request to the supervisor, as an action: a long-running goal with feedback, cancellation and a result.',
  sources: ['ros2-interfaces-2026'],
};

const LIFECYCLE_EDGE: Edge = {
  id: 'supervisor-lifecycle',
  kind: 'lifecycle: start, stop, deactivate',
  method:
    "Supervisor to the policy server, command gate and controller bridge, through lifecycle transitions. ROS 2 managed nodes leave a primary state only at an external supervisor's request or on an error in the Active state.",
  sources: ['ros2-lifecycle-design-2015'],
};
/** The lifecycle label, wrapped between the first two rail branches. */
const LIFECYCLE_LABEL = ['lifecycle: start,', 'stop, deactivate'];
const SUPERVISED: NodeId[] = ['policy', 'gate', 'bridge'];

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
  dashed = false,
  edge,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colour: string;
  dashed?: boolean;
  edge: string;
}) {
  const { shaft, head } = arrowPaths(x1, y1, x2, y2);
  return (
    <g data-edge={edge}>
      <path
        d={shaft}
        fill="none"
        stroke={colour}
        strokeWidth={dashed ? CHART_STROKE.reference : CHART_STROKE.trace}
        strokeDasharray={dashed ? CHART_STROKE.dash : undefined}
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

function NodeBox({ id, x, y, w, label }: { id: string; x: number; y: number; w: number; label: string }) {
  const hardware = id === 'hardware';
  return (
    <g data-node={id}>
      <rect
        x={x}
        y={y}
        width={w}
        height={BOX.h}
        fill={hardware ? CHART_STRUCTURE.grid : MOTION_STAGE.background}
        fillOpacity={hardware ? CHART_STRUCTURE.gridOpacity : undefined}
        stroke={CHART_STRUCTURE.label}
        strokeWidth={CHART_STROKE.structure}
      />
      <StageText x={x + w / 2} y={y + BOX.h / 2 + BASELINE_DROP} anchor="middle" weight={500}>
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
  const supervision = roleColour('reference');
  const stateMid = centreY('state');
  const railTop = SUP.y + SUP.h;
  const railBottom = centreY('bridge');
  return (
    <PlotStage
      viewBox={`0 0 ${W} ${VIEW_H}`}
      aria-label="ROS 2 graph for a learned policy, top to bottom: camera and joint drivers, state assembly reading the tf2 frame tree, policy server, command gate, controller bridge and robot hardware. A supervisor takes the task goal and starts or stops the policy server, command gate and controller bridge."
      aria-describedby={descriptionId}
      data-testid="ros2-policy-graph"
    >
      <StageAnnotation x={8} y={18} lines={['Only the command gate talks', 'to the controller']} />

      <StageText x={8} y={SUP.y + SUP.h / 2 + BASELINE_DROP}>task request</StageText>
      <NodeBox id="supervisor" x={SUP.x} y={SUP.y} w={SUP.w} label="supervisor" />
      <StageText x={8} y={ACTION_LABEL_Y} secondary>
        {TASK_EDGE.kind}
      </StageText>
      {LIFECYCLE_LABEL.map((line, i) => (
        <StageText
          key={line}
          x={RAIL_X - 8}
          y={BOX_Y.policy + BOX.h + GAP_FIRST + i * LINE}
          anchor="end"
          secondary={i > 0}
        >
          {line}
        </StageText>
      ))}

      {NODES.map((node) => (
        <NodeBox key={node.id} id={node.id} x={BOX.x} y={BOX_Y[node.id]} w={BOX.w} label={node.label} />
      ))}

      <g data-node="tf2-store">
        <path
          d={`M ${STORE.right} ${BOX_Y.state} H ${STORE.x} V ${BOX_Y.state + BOX.h} H ${STORE.right}`}
          fill="none"
          stroke={CHART_STRUCTURE.label}
          strokeWidth={CHART_STROKE.structure}
        />
        <StageText x={(STORE.x + STORE.right) / 2} y={stateMid + BASELINE_DROP} anchor="middle" weight={500}>
          tf2 frame tree
        </StageText>
      </g>
      {TF2_LABEL.map((line, i) => (
        <StageText
          key={line}
          x={STORE_LABEL_X}
          y={BOX_Y.state + BOX.h + GAP_FIRST + i * LINE}
          secondary={i > 0}
        >
          {line}
        </StageText>
      ))}

      {NODES.map((node) => {
        const edge = DOWN_EDGES[node.id];
        if (!edge) return null;
        const top = BOX_Y[node.id] + BOX.h + GAP_FIRST;
        return (
          <g key={edge.id} data-edge-label={edge.id}>
            <StageText x={LABEL_X} y={top}>
              {edge.kind}
            </StageText>
            {edge.note ? (
              <StageText x={LABEL_X} y={top + LINE} secondary>
                {edge.note}
              </StageText>
            ) : null}
          </g>
        );
      })}

      <g data-series="sensing" data-chart-role="state">
        <Arrow edge="drivers-to-state" x1={ARROW_X} y1={BOX_Y.drivers + BOX.h} x2={ARROW_X} y2={BOX_Y.state} colour={sensing} />
        <Arrow edge="tf2-to-state" x1={STORE.x - 2} y1={stateMid} x2={BOX_RIGHT} y2={stateMid} colour={sensing} />
        <Arrow edge="state-to-policy" x1={ARROW_X} y1={BOX_Y.state + BOX.h} x2={ARROW_X} y2={BOX_Y.policy} colour={sensing} />
      </g>
      <g data-series="commands" data-chart-role="action">
        <Arrow edge="task-to-supervisor" x1={TASK_END_X} y1={SUP.y + SUP.h / 2} x2={SUP.x} y2={SUP.y + SUP.h / 2} colour={command} />
        <Arrow edge="policy-to-gate" x1={ARROW_X} y1={BOX_Y.policy + BOX.h} x2={ARROW_X} y2={BOX_Y.gate} colour={command} />
        <Arrow edge="gate-to-bridge" x1={ARROW_X} y1={BOX_Y.gate + BOX.h} x2={ARROW_X} y2={BOX_Y.bridge} colour={command} />
        <Arrow edge="bridge-to-hardware" x1={ARROW_X} y1={BOX_Y.bridge + BOX.h} x2={ARROW_X} y2={BOX_Y.hardware} colour={command} />
      </g>
      <g data-series="lifecycle" data-chart-role="reference">
        <path
          d={`M ${RAIL_X} ${railTop} V ${railBottom}`}
          fill="none"
          stroke={supervision}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
        {SUPERVISED.map((id) => (
          <Arrow
            key={id}
            edge={`supervisor-to-${id}`}
            x1={RAIL_X}
            y1={centreY(id)}
            x2={BOX_RIGHT}
            y2={centreY(id)}
            colour={supervision}
            dashed
          />
        ))}
      </g>
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
      kicker="ROS 2 policy layout"
      heading="Keep the model one gate away from the motors"
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="sensing" swatch={<LegendSwatch role="state" mark="line" />}>
                  sensor data and frames
                </LegendItem>
                <LegendItem series="commands" swatch={<LegendSwatch role="action" mark="line" />}>
                  goals, actions and commands
                </LegendItem>
                <LegendItem series="lifecycle" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  supervisor start and stop
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
      caption="Separate nodes let you test, stop or swap the learned policy without touching drivers or the real-time controller."
      method={
        <>
          <div>
            One robust layout for a learned-policy graph, as the article recommends: drivers, state assembly, a
            policy server, a command gate, a controller bridge and a supervisor, each its own node. Each link below
            names its ROS 2 interface, its QoS or timing, and its source.
          </div>
          <ul data-testid="ros2-policy-edges" className="list-disc space-y-1.5 pl-5">
            {ALL_EDGES.map((edge) => (
              <li key={edge.id} data-edge-method={edge.id}>
                {edge.method}
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
