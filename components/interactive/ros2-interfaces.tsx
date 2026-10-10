'use client';

import { useId, useState, type CSSProperties } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  PlotStage,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  StageAnnotation,
} from '@/components/motion/chart';
import { usePlayback } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * Ros2Interfaces: the three ways two ROS 2 nodes talk, as a message
 * sequence read top to bottom. A topic is a one-way stream with no reply,
 * a service is one request and one response, and an action is a long job
 * with a goal, progress updates along the way and a result, which can be
 * cancelled. Picking one draws its messages in one after another on the
 * motion curve; reduced motion and the served HTML show them all.
 *
 * Drawn as a plain sequence diagram: two outlined node boxes, hairline
 * lifelines, a solid ink arrow for a message sent and a dashed grey one
 * for a reply, labels in ink, and the one-line note as the accent.
 */

type ChannelId = 'topic' | 'service' | 'action';
type Message = { to: 'right' | 'left'; label: string };
type Channel = Preset<ChannelId> & {
  from: string;
  to: string;
  messages: readonly Message[];
  note: readonly string[];
  plain: string;
};

export const CHANNELS: readonly Channel[] = [
  {
    id: 'topic',
    label: 'Topic',
    from: 'camera driver',
    to: 'policy server',
    messages: [
      { to: 'right', label: 'picture' },
      { to: 'right', label: 'picture' },
      { to: 'right', label: 'picture' },
      { to: 'right', label: 'picture' },
    ],
    note: ['A stream: no reply,', 'nobody waits'],
    plain: 'a one-way stream with no reply',
  },
  {
    id: 'service',
    label: 'Service',
    from: 'policy server',
    to: 'gripper driver',
    messages: [
      { to: 'right', label: 'Is the gripper closed?' },
      { to: 'left', label: 'Yes' },
    ],
    note: ['One question,', 'one quick answer'],
    plain: 'one request and one quick response',
  },
  {
    id: 'action',
    label: 'Action',
    from: 'task manager',
    to: 'fetch skill',
    messages: [
      { to: 'right', label: 'Goal: fetch the cup' },
      { to: 'left', label: 'Progress: 30%' },
      { to: 'left', label: 'Progress: 60%' },
      { to: 'left', label: 'Done: cup fetched' },
    ],
    note: ['Progress updates;', 'it can be cancelled'],
    plain: 'a goal, progress updates and a result, and it can be cancelled',
  },
];

const WIDTH = 400;
const HEIGHT = 236;
const LEFT_X = 78;
const RIGHT_X = 322;
const BOX_W = 144;
const BOX_TOP = 4;
const BOX_H = 30;
const FIRST_Y = 66;
const STEP_Y = 30;
/** The drawing grows to at most 1.6 times its viewBox, so it stays a diagram on a wide page. */
const STAGE_STYLE = { '--motion-stage-max-scale': 1.6 } as CSSProperties;

const f = (v: number) => Number(v.toFixed(2));

function NodeBox({ x, name }: { x: number; name: string }) {
  return (
    <g data-node={name}>
      <rect
        x={f(x - BOX_W / 2)}
        y={BOX_TOP}
        width={BOX_W}
        height={BOX_H}
        fill={MOTION_STAGE.background}
        stroke={CHART_STRUCTURE.label}
        strokeWidth={CHART_STROKE.structure}
      />
      <text
        data-chart-label=""
        x={x}
        y={BOX_TOP + BOX_H / 2 + CHART_TYPE.labelPx * 0.35}
        textAnchor="middle"
        fontSize={CHART_TYPE.labelPx}
        fill={CHART_STRUCTURE.label}
      >
        {name}
      </text>
    </g>
  );
}

/** One message arrow, drawn in as `t` runs from 0 to 1: a request solid in ink, a reply dashed in grey. */
function MessageArrow({ message, index, t }: { message: Message; index: number; t: number }) {
  const y = FIRST_Y + index * STEP_Y;
  const [x0, x1] = message.to === 'right' ? [LEFT_X, RIGHT_X] : [RIGHT_X, LEFT_X];
  const dir = Math.sign(x1 - x0);
  const end = x0 + (x1 - x0 - dir * 2) * t;
  const reply = message.to === 'left';
  const colour = reply ? 'var(--chart-dark)' : CHART_STRUCTURE.label;
  return (
    <g data-message={index} data-direction={message.to} opacity={t > 0 ? 1 : 0}>
      <g fill="none" stroke={colour} strokeWidth={CHART_STROKE.structure}>
        <line x1={x0} y1={y} x2={f(end)} y2={y} strokeDasharray={reply ? CHART_STROKE.dash : undefined} />
        <path d={`M${f(end - dir * 7)} ${f(y - 4)} L${f(end)} ${y} L${f(end - dir * 7)} ${f(y + 4)}`} />
      </g>
      <text
        data-chart-label=""
        x={(LEFT_X + RIGHT_X) / 2}
        y={y - 7}
        textAnchor="middle"
        fontSize={CHART_TYPE.labelPx}
        fill={CHART_STRUCTURE.label}
        opacity={f(Math.min(1, t * 1.5))}
      >
        {message.label}
      </text>
    </g>
  );
}

function describe(channel: Channel): string {
  return `Through ${channel.id === 'action' ? 'an' : 'a'} ${channel.label.toLowerCase()}, the ${channel.from} and the ${channel.to} exchange ${channel.messages.length} messages: ${channel.plain}. A topic carries 4 pictures one way, a service 2 messages and an action 4.`;
}

export function Ros2Interfaces({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const interfacesSource = citationFor('ros2-interfaces-2026');
  const [channelId, setChannelId] = useState<ChannelId>('action');
  const [progress, play] = usePlayback();
  const channel = CHANNELS.find((c) => c.id === channelId)!;
  const count = channel.messages.length;
  const noteY = FIRST_Y + count * STEP_Y + 4;

  function choose(id: ChannelId) {
    setChannelId(id);
    play();
  }

  return (
    <InstrumentFigure
      figureId="ros2-interfaces"
      className={className}
      kicker="ROS 2 interfaces"
      heading="Nodes stream, ask, or run a job"
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="Way of talking" presets={CHANNELS} value={channelId} onChange={choose} testId="ros2-channel" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="ros2-replay"
            onClick={play}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Replay
          </button>
        </div>
      }
      stage={
        <FigureStage footer={<StageStatus>Schematic; time runs down</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Two ROS 2 nodes, the ${channel.from} and the ${channel.to}, talking through a ${channel.label.toLowerCase()}: ${channel.messages.map((m) => m.label).join(', then ')}.`}
            aria-describedby={descriptionId}
            data-testid="ros2-interfaces-stage"
            style={STAGE_STYLE}
          >
            <NodeBox x={LEFT_X} name={channel.from} />
            <NodeBox x={RIGHT_X} name={channel.to} />
            {[LEFT_X, RIGHT_X].map((x) => (
              <line
                key={x}
                x1={x}
                y1={BOX_TOP + BOX_H}
                x2={x}
                y2={FIRST_Y + (count - 1) * STEP_Y + 16}
                stroke="var(--line-strong)"
                strokeWidth={CHART_STROKE.structure}
              />
            ))}
            {channel.messages.map((message, i) => (
              <MessageArrow
                key={`${channel.id}-${i}`}
                message={message}
                index={i}
                t={Math.min(1, Math.max(0, progress * count - i))}
              />
            ))}
            <g opacity={f(Math.min(1, Math.max(0, progress * count - (count - 1))))}>
              <StageAnnotation x={(LEFT_X + RIGHT_X) / 2} y={noteY + 18} anchor="middle" lines={channel.note} />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Use a stream for sensor data, a question for quick answers, an action for long tasks."
      method={
        <>
          <div>
            In ROS 2, nodes talk through topics for continuous streams, services for short request and response
            calls, and actions for long-running goals with feedback, cancellation and a result. The node names
            are examples: a camera driver publishes pictures on a topic, a policy server asks a gripper driver a
            yes-or-no question as a service, and a task manager sends a 30-second fetch job as an action.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="The messages each way of talking sends"
            description={describe(channel)}
            rowHeader="way of talking"
            columns={[{ header: 'messages, in order' }, { header: 'reply' }]}
            rows={CHANNELS.map((c) => ({
              label: c.label,
              values: [c.messages.map((m) => m.label).join('; '), c.id === 'topic' ? 'none' : c.id === 'service' ? 'one answer' : 'progress, then a result'],
            }))}
          />
        </>
      }
      source={
        <span data-testid="ros2-interfaces-source">
          {interfacesSource ? (
            <a data-brand-control-id="control:link-focus" href={interfacesSource.url} target="_blank" rel="noopener" className="underline-offset-2">
              {interfacesSource.label}
            </a>
          ) : (
            'ROS 2 interfaces documentation'
          )}
          .
        </span>
      }
    />
  );
}
