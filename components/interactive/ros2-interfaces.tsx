'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  PresetGroup,
  type Preset,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  CAPSULE_REST,
  CARD_CLIP,
  CARD_RUN,
  CARD_SLOTS,
  FLAG_RISE,
  FROM_X,
  HEIGHT,
  SHUTTLE_AWAY,
  SHUTTLE_HOME,
  TO_X,
  WIDTH,
  WINDOW_CLIP,
  sceneOf,
  shiftBy,
  type Group,
  type Part,
} from '@/components/iso/figures/node-link-bench';

/**
 * Ros2Interfaces: the three ways two ROS 2 nodes talk, drawn as two node
 * cabinets on one bench joined three ways. A topic is a conveyor that
 * carries pictures one way and brings nothing back; a service is a message
 * duct through which a question capsule goes and an answer capsule comes
 * back; an action is a cable-drawn shuttle that carries the job out while
 * flags on the sender rise as progress comes back, the last when the job is
 * done, with a cancel lever on the sender's front.
 *
 * Picking a way of talking (or Replay) sends its messages one after another
 * along its link; the token of the message just sent or arrived is the one
 * lit part, and the readout names it. At rest, and under reduced motion,
 * the bench shows the finished exchange.
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

/** Where each moving part of the bench stands. */
export interface BenchPose {
  /** The cards on the topic belt, along the bench from their drawn places. */
  cards: number;
  /** The question and the answer capsules' centres along the duct. */
  request: number;
  reply: number;
  /** The shuttle, along the rail from the sender's end. */
  shuttle: number;
  /** How far each of the three flags has climbed. */
  flags: [number, number, number];
}

/** The finished exchange: the stream on the belt, both capsules arrived, the job out and all three flags up. */
export const FINISHED: BenchPose = {
  cards: 0,
  request: CAPSULE_REST.request,
  reply: CAPSULE_REST.reply,
  shuttle: SHUTTLE_AWAY - SHUTTLE_HOME,
  flags: [FLAG_RISE, FLAG_RISE, FLAG_RISE],
};

/** How long each way of talking takes to play, in seconds. */
const PLAY_S_TOPIC = 3.2;
export const PLAY_S: Record<ChannelId, number> = { topic: PLAY_S_TOPIC, service: 3.2, action: 3.6 };

const ease = (u: number) => {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => (t - from) / (to - from);

/** When each message of a way of talking goes out or arrives, in seconds into the play. */
export const MESSAGE_AT: Record<ChannelId, readonly number[]> = {
  // A picture is sent when the belt carries it out through the sender's face.
  topic: [...CARD_SLOTS].reverse().map((x) => PLAY_S_TOPIC * (1 - (x - FROM_X) / (CARD_SLOTS[CARD_SLOTS.length - 1] - CARD_RUN.from))),
  service: [0, 1.7],
  action: [0, 1.5, 2.2, 2.9],
};

/**
 * The bench `t` seconds into playing `channel`; at or past its length the
 * finished exchange. Topic: the belt carries the four cards out of the
 * sender into their places. Service: the question travels the duct to the
 * receiver, then the answer travels back. Action: the shuttle carries the
 * job out, then the three flags climb, one per progress update and the
 * last when the job is done.
 */
export function poseAt(channel: ChannelId, t: number): BenchPose {
  const rest = { ...FINISHED, flags: [...FINISHED.flags] as [number, number, number] };
  if (t >= PLAY_S[channel]) return rest;
  if (channel === 'topic') {
    const lead = CARD_SLOTS[CARD_SLOTS.length - 1];
    const run = lead - CARD_RUN.from;
    return { ...rest, cards: -run * (1 - t / PLAY_S.topic) };
  }
  if (channel === 'service') {
    const out = ease(span(t, 0, 1.4));
    const back = ease(span(t, 1.7, 3.1));
    return {
      ...rest,
      request: CARD_RUN.from + (CAPSULE_REST.request - CARD_RUN.from) * out,
      reply: CARD_RUN.to + (CAPSULE_REST.reply - CARD_RUN.to) * back,
    };
  }
  const away = SHUTTLE_AWAY - SHUTTLE_HOME;
  return {
    ...rest,
    shuttle: away * ease(span(t, 0, 1.2)),
    flags: [0, 1, 2].map((k) => FLAG_RISE * ease(span(t, MESSAGE_AT.action[k + 1], MESSAGE_AT.action[k + 1] + 0.45))) as [number, number, number],
  };
}

/** The message just sent or arrived `t` seconds into the play, or the last one once it is finished. */
export function messageAt(channel: ChannelId, t: number): number {
  const times = MESSAGE_AT[channel];
  let index = 0;
  for (let k = 0; k < times.length; k++) if (t >= times[k]) index = k;
  return t >= PLAY_S[channel] ? times.length - 1 : index;
}

function describe(channel: Channel): string {
  return `Through ${channel.id === 'action' ? 'an' : 'a'} ${channel.label.toLowerCase()}, the ${channel.from} and the ${channel.to} exchange ${channel.messages.length} messages: ${channel.plain}. A topic carries 4 pictures one way, a service 2 messages and an action 4.`;
}

const restReadout = (channel: Channel) => `${channel.label} · ${channel.note.join(' ')}`;
const playReadout = (channel: Channel, index: number) =>
  channel.id === 'topic' ? `picture ${index + 1} of 4 · no reply` : channel.messages[index].label;

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

const MOVING: Group[] = ['cards', 'request', 'reply', 'shuttle', 'flag-0', 'flag-1', 'flag-2'];

function transformOf(group: Group, pose: BenchPose): string | undefined {
  if (group === 'cards') return shiftBy(pose.cards);
  if (group === 'request') return shiftBy(pose.request - CAPSULE_REST.request);
  if (group === 'reply') return shiftBy(pose.reply - CAPSULE_REST.reply);
  if (group === 'shuttle') return shiftBy(pose.shuttle);
  if (group === 'flag-0') return shiftBy(0, 0, pose.flags[0]);
  if (group === 'flag-1') return shiftBy(0, 0, pose.flags[1]);
  if (group === 'flag-2') return shiftBy(0, 0, pose.flags[2]);
  return undefined;
}

function PartView({ part, channel }: { part: Part; channel: Channel }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        halo={part.halo}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'fill') return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  if (part.kind === 'token') {
    const message = part.index >= 0 ? channel.messages[part.index] : undefined;
    return (
      <g
        data-link={part.lane}
        data-message={message ? part.index : undefined}
        data-direction={message?.to}
        data-label={message?.label}
      >
        {part.parts.map((child, index) => (
          <PartView key={index} part={child} channel={channel} />
        ))}
      </g>
    );
  }
  return null;
}

export function Ros2Interfaces({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clipBase = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-ros2`;
  const citationFor = useCitationLookup();
  const interfacesSource = citationFor('ros2-interfaces-2026');
  const [channelId, setChannelId] = useState<ChannelId>('action');
  /** Which play is running (a counter, so Replay restarts it), or 0 at rest. */
  const [play, setPlay] = useState(0);
  const [lit, setLit] = useState(CHANNELS.find((c) => c.id === 'action')!.messages.length - 1);
  const channel = CHANNELS.find((c) => c.id === channelId)!;
  // At rest the last message of the picked way is the lit one; while playing, the message just sent.
  const litNow = play ? lit : channel.messages.length - 1;
  const parts = useMemo(() => sceneOf({ lane: channelId, lit: litNow }), [channelId, litNow]);
  const runs = useMemo(() => {
    const list: Array<{ group: Group; parts: Part[] }> = [];
    for (const part of parts) {
      const last = list[list.length - 1];
      if (last && last.group === part.group) last.parts.push(part);
      else list.push({ group: part.group, parts: [part] });
    }
    return list;
  }, [parts]);

  const groupRefs = useRef<Partial<Record<Group, SVGGElement | null>>>({});
  const anchor = useRef<SVGDefsElement>(null);
  const readoutEl = useCallback(
    () => anchor.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null,
    [],
  );
  const place = useCallback((pose: BenchPose, moving: boolean) => {
    for (const group of MOVING) {
      const el = groupRefs.current[group];
      if (!el) continue;
      el.setAttribute('transform', transformOf(group, pose) ?? '');
      el.setAttribute('data-pose', moving ? 'moving' : 'finished');
    }
  }, []);

  // Play the picked way of talking once, then rest on the finished exchange.
  useEffect(() => {
    if (!play) return;
    let frame = 0;
    const start = performance.now();
    let shown = -1;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const done = t >= PLAY_S[channelId];
      place(poseAt(channelId, t), !done);
      const index = messageAt(channelId, t);
      if (index !== shown) {
        shown = index;
        setLit(index);
      }
      const readout = readoutEl();
      if (readout) readout.textContent = done ? restReadout(channel) : playReadout(channel, index);
      if (done) {
        setPlay(0);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, channelId, channel, place, readoutEl]);

  // At rest the bench shows the finished exchange of the picked way.
  useEffect(() => {
    if (play) return;
    place(FINISHED, false);
    const readout = readoutEl();
    if (readout) readout.textContent = restReadout(channel);
  }, [play, channel, place, readoutEl]);

  function start(id: ChannelId) {
    setChannelId(id);
    if (still()) {
      setPlay(0);
      return;
    }
    setPlay((n) => n + 1);
  }

  return (
    <InstrumentFigure
      figureId="ros2-interfaces"
      className={className}
      kicker="ROS 2 interfaces"
      heading="Nodes stream, ask, or run a job"
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="Way of talking" presets={CHANNELS} value={channelId} onChange={start} testId="ros2-channel" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="ros2-replay"
            onClick={() => start(channelId)}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Replay
          </button>
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={`Lit: the ${channel.id === 'topic' ? 'picture' : 'message'} just sent; ${channel.from} at left, ${channel.to} at right`}
          readout={restReadout(channel)}
          status="Schematic; node names are examples"
          data-testid="ros2-interfaces-stage"
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={`Two ROS 2 nodes, the ${channel.from} and the ${channel.to}, on one bench joined three ways, talking through a ${channel.label.toLowerCase()}: ${channel.messages.map((m) => m.label).join(', then ')}.`}
            describedBy={descriptionId}
          >
            <defs ref={anchor}>
              <clipPath id={`${clipBase}-cards`}>
                <path d={CARD_CLIP} />
              </clipPath>
              <clipPath id={`${clipBase}-window`}>
                <path d={WINDOW_CLIP} />
              </clipPath>
            </defs>
            {runs.map((run, index) => {
              const body = run.parts.map((part, k) => <PartView key={k} part={part} channel={channel} />);
              if (run.group === 'static') return <g key={`static-${index}`}>{body}</g>;
              const clip = run.group === 'cards' ? `${clipBase}-cards` : run.group === 'request' || run.group === 'reply' ? `${clipBase}-window` : undefined;
              return (
                <g key={run.group} clipPath={clip ? `url(#${clip})` : undefined}>
                  <g
                    ref={(el) => {
                      groupRefs.current[run.group] = el;
                    }}
                    transform={transformOf(run.group, FINISHED)}
                    data-pose="finished"
                    data-testid={`ros2-${run.group}`}
                  >
                    {body}
                  </g>
                </g>
              );
            })}
          </IsoFigure>
        </AnatomyStage>
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
          <div>
            The bench is a schematic: the cabinet at the left is the node that starts the exchange, the one at
            the right the node that answers. The conveyor in front carries a stream of pictures and brings
            nothing back; the duct in the middle carries a question capsule over and an answer capsule back; the
            shuttle at the back carries a job out while the three flags on the left cabinet rise, two for
            progress updates and the last for the result, and the lever on its front can cancel the job.
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

/** The two faces every link runs between, exported for the tests. */
export const LINK_ENDS = { from: FROM_X, to: TO_X } as const;
