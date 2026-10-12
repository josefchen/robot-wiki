'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  CARRY,
  DROP_CLIP,
  DROP_REST,
  FED_Z,
  FEED_CLIP,
  HEIGHT,
  LIFT,
  PITCH,
  RELEASE_Z,
  WIDTH,
  sceneOf,
  shiftBy,
  type Group,
  type Part,
} from '@/components/iso/figures/picture-queue';

/**
 * QosQueueAge: why a deep, reliable camera queue makes a learned policy act
 * on old pictures, drawn as a picture queue on a bench.
 *
 * A camera on a carriage drops each picture it takes, as a card, into a
 * channel; an indexer walks the row one slot per camera frame, and a gantry
 * on the model's housing lifts the oldest card out and feeds it to the
 * model. A camera sending pictures faster than the model uses them keeps
 * the queue full, so the model is handed the oldest picture the queue
 * holds: with the ROS 2 default of the last 10 messages that picture is 10
 * frames old, and keeping only the newest makes it one frame old. The
 * camera stands that many slots from the model, and its carriage's pointer
 * reads the age on the scale along the rail. Every card shows one frame of
 * a bouncing ball, so the card in the model's gripper (the one lit part)
 * shows the ball where it was.
 *
 * The queue depth of 10 is the ROS 2 default profile's. The camera rate of
 * 30 pictures a second and a model slower than the camera are
 * illustrative. "Run the queue" plays the cycle slowed down about seventy
 * times; reduced motion keeps the still pose.
 */

/** Illustrative camera rate, pictures a second. */
export const CAMERA_HZ = 30;
/** The ROS 2 default QoS profile keeps the last 10 messages. */
export const DEFAULT_DEPTH = 10;

type QueueId = 'ten' | 'one';
const QUEUES: readonly (Preset<QueueId> & { depth: number })[] = [
  { id: 'ten', label: 'Last 10', depth: DEFAULT_DEPTH },
  { id: 'one', label: 'Newest only', depth: 1 },
];

/** Seconds old the picture the model uses is, for a full queue of `depth`. */
export const pictureAgeS = (depth: number) => depth / CAMERA_HZ;
export const formatAge = (seconds: number) => seconds.toFixed(2);

/** The last picture the camera has taken in the still pose. */
export const STILL_NEWEST = 40;

/** One camera frame of the bench, in seconds on screen: carry, feed, return, then lift the next. */
export const CYCLE_S = 2.3;
/** When, in the cycle, the row has moved one slot along and the bench is redrawn one frame later. */
export const SWAP_S = 1.85;
/** How many times slower than the camera the bench runs. */
export const SLOW = Math.round((CYCLE_S * CAMERA_HZ) / 10) * 10;

export interface QueuePose {
  /** The gantry head, along the bench from the pick slot. */
  head: number;
  /** The picked card: along the bench and up from its slot. */
  picked: [number, number];
  /** The gripper's height over its rest, gripping a card in the row. */
  grip: number;
  /** The row, along the bench. */
  row: number;
  /** The next card, up inside the camera's chute. */
  drop: number;
}

/** The still pose: the oldest card lifted clear of the row, the next one waiting in the chute. */
export const STILL_POSE: QueuePose = { head: 0, picked: [0, LIFT], grip: LIFT, row: 0, drop: DROP_REST };

const ease = (u: number) => {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
};
const span = (t: number, from: number, to: number) => (t - from) / (to - from);

/**
 * The bench `t` seconds into one camera frame, starting from the still
 * pose. The gantry carries the lifted card to the reader slot, lowers it
 * and lets it drop in, and returns; meanwhile the camera drops the next
 * picture into the feed slot and the indexer walks the row one slot
 * toward the model. At SWAP_S the bench is redrawn one frame later, and the
 * gantry lifts the new oldest card back to the still pose.
 */
export function poseAt(t: number): QueuePose {
  const drop = DROP_REST * (1 - Math.min(1, Math.max(0, span(t, 0.1, 0.5))) ** 2);
  const row = PITCH * ease(span(t, 0.55, 1.15));
  if (t >= SWAP_S) {
    const lift = LIFT * ease(span(t, SWAP_S, CYCLE_S));
    return { head: 0, picked: [0, lift], grip: lift, row: 0, drop: DROP_REST };
  }
  if (t < 0.7) {
    const x = CARRY * ease(span(t, 0, 0.7));
    return { head: x, picked: [x, LIFT], grip: LIFT, row, drop };
  }
  if (t < 1.05) {
    const z = LIFT + (RELEASE_Z - LIFT) * ease(span(t, 0.7, 1.05));
    return { head: CARRY, picked: [CARRY, z], grip: z, row, drop };
  }
  const fall = RELEASE_Z + (FED_Z - RELEASE_Z) * Math.min(1, span(t, 1.05, 1.25)) ** 2;
  const back = CARRY * (1 - ease(span(t, 1.25, 1.75)));
  const grip = RELEASE_Z * (1 - ease(span(t, 1.75, SWAP_S)));
  return { head: back, picked: [CARRY, Math.max(fall, FED_Z)], grip, row, drop };
}

function describe(depth: number): string {
  return `With a camera queue that keeps ${depth === 1 ? 'only the newest picture' : `the last ${depth} pictures`} and a camera sending 30 pictures a second, the model acts on a picture ${formatAge(pictureAgeS(depth))} seconds old; the age equals queue depth over the camera rate.`;
}

const restReadout = (depth: number) =>
  `${depth === 1 ? 'Newest picture only' : `Last ${depth} pictures`} · the model gets one ${formatAge(pictureAgeS(depth))} seconds old`;
/** While running: the camera prints picture newest + 1 as the model is handed the oldest, newest - depth + 1. */
export const runReadout = (depth: number, newest: number) =>
  `camera taking picture ${newest + 1} · model handed picture ${newest - depth + 1} · ${formatAge(pictureAgeS(depth))} seconds old`;

/** A layout effect in the browser; nothing to lay out on the server. */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

function PartView({ part }: { part: Part }): ReactNode {
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
  if (part.kind === 'card') {
    return (
      <g
        data-picture={part.group === 'drop' ? undefined : part.used ? 'used' : 'queued'}
        data-next={part.group === 'drop' ? '' : undefined}
        data-frame={part.frame}
        data-age={part.group === 'drop' ? undefined : part.age}
      >
        {part.parts.map((child, index) => (
          <PartView key={index} part={child} />
        ))}
      </g>
    );
  }
  return null;
}

const MOVING: Group[] = ['row', 'drop', 'picked', 'head', 'grip'];

function transformOf(group: Group, pose: QueuePose): string | undefined {
  if (group === 'row') return shiftBy(pose.row);
  // The next card lands in the feed slot before the indexer moves, then rides the row.
  if (group === 'drop') return shiftBy(pose.row, 0, pose.drop);
  if (group === 'picked') return shiftBy(pose.picked[0], 0, pose.picked[1]);
  if (group === 'head') return shiftBy(pose.head);
  if (group === 'grip') return shiftBy(pose.head, 0, pose.grip);
  return undefined;
}

export function QosQueueAge({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clipBase = `${uid.replace(/[^a-zA-Z0-9_-]/g, '')}-qos`;
  const citationFor = useCitationLookup();
  const qosSource = citationFor('ros2-qos-2026');
  const [queue, setQueue] = useState<QueueId>('ten');
  const [running, setRunning] = useState(false);
  const [newest, setNewest] = useState(STILL_NEWEST);
  const depth = QUEUES.find((q) => q.id === queue)!.depth;
  const age = pictureAgeS(depth);
  const ageText = formatAge(age);
  const scene = useMemo(() => sceneOf(depth, newest), [depth, newest]);
  const runs = useMemo(() => {
    const list: Array<{ group: Group; parts: Part[] }> = [];
    for (const part of scene.parts) {
      const last = list[list.length - 1];
      if (last && last.group === part.group) last.parts.push(part);
      else list.push({ group: part.group, parts: [part] });
    }
    return list;
  }, [scene]);

  const groupRefs = useRef<Partial<Record<Group, SVGGElement | null>>>({});
  const svgAnchor = useRef<SVGDefsElement>(null);
  /** The pose to show once React has drawn the frame the loop asked for. */
  const pending = useRef<{ newest: number; pose: QueuePose } | null>(null);
  const settings = useRef({ depth, newest });
  useBeforePaint(() => {
    settings.current = { depth, newest };
  }, [depth, newest]);

  const readoutEl = useCallback(
    () => svgAnchor.current?.closest('[data-anatomy-stage]')?.querySelector<HTMLElement>('[data-readout]') ?? null,
    [],
  );
  const place = useCallback((pose: QueuePose) => {
    for (const group of MOVING) groupRefs.current[group]?.setAttribute('transform', transformOf(group, pose) ?? '');
  }, []);

  // Run the bench: one camera frame per cycle, redrawn one frame later at each swap.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      if (pending.current) {
        // Hold the clock until React has drawn the next frame's cards.
        frame = requestAnimationFrame(tick);
        return;
      }
      const { depth: d, newest: n } = settings.current;
      const before = t;
      t += dt;
      if (before < SWAP_S && t >= SWAP_S) {
        pending.current = { newest: n + 1, pose: poseAt(t) };
        setNewest(n + 1);
        frame = requestAnimationFrame(tick);
        return;
      }
      if (t >= CYCLE_S) t -= CYCLE_S;
      place(poseAt(t));
      const readout = readoutEl();
      if (readout) readout.textContent = runReadout(d, n);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, place, readoutEl]);

  // Once the next frame's cards are drawn, put every moving group where the loop left off, before paint.
  useBeforePaint(() => {
    const next = pending.current;
    if (next && next.newest === newest) {
      place(next.pose);
      pending.current = null;
    }
  }, [newest, place]);

  // At rest, or after a stop, the bench stands in the still pose with the resting readout.
  useEffect(() => {
    if (running) return;
    pending.current = null;
    place(STILL_POSE);
    const readout = readoutEl();
    if (readout) readout.textContent = restReadout(depth);
  }, [running, depth, newest, place, readoutEl]);

  // The bench runs from the reader's control; under reduced motion it stays in the still pose.
  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (still()) return;
    setRunning(true);
  };

  function choose(id: QueueId) {
    setRunning(false);
    setQueue(id);
  }

  return (
    <InstrumentFigure
      figureId="qos-queue-age"
      className={className}
      kicker="Quality of Service"
      heading="Deep queues feed the robot old pictures"
      controls={
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <PresetGroup label="Queue keeps" presets={QUEUES} value={queue} onChange={choose} testId="qos-queue" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="qos-run"
            onClick={toggleRun}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the queue' : 'Run the queue'}
          </button>
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint={running ? `Running, slowed about ${SLOW} times` : 'Lit: the picture the model is handed'}
          readout={restReadout(depth)}
          status="Illustrative camera rate"
          data-testid="qos-stage-frame"
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={`A camera drops each picture it takes into a queue that holds ${depth === 1 ? 'one picture' : `${depth} pictures`}; at the far end the model's gantry lifts out the oldest, which is ${ageText} seconds old.`}
            describedBy={descriptionId}
          >
            <defs ref={svgAnchor}>
              <clipPath id={`${clipBase}-drop`}>
                <path d={DROP_CLIP} />
              </clipPath>
              <clipPath id={`${clipBase}-feed`}>
                <path d={FEED_CLIP} />
              </clipPath>
            </defs>
            {runs.map((run, index) => {
              const body = run.parts.map((part, k) => <PartView key={k} part={part} />);
              if (run.group === 'static') return <g key={`static-${index}`}>{body}</g>;
              const clip = run.group === 'drop' ? `${clipBase}-drop` : run.group === 'picked' ? `${clipBase}-feed` : undefined;
              return (
                <g key={run.group} clipPath={clip ? `url(#${clip})` : undefined}>
                  <g
                    ref={(el) => {
                      groupRefs.current[run.group] = el;
                    }}
                    transform={transformOf(run.group, STILL_POSE)}
                    data-testid={`qos-${run.group}`}
                  >
                    {body}
                  </g>
                </g>
              );
            })}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="A deep queue hands the model old pictures first, so log each picture's age at the model."
      method={
        <>
          <div>
            The ROS 2 default Quality of Service profile keeps the last 10 messages and delivers them reliably,
            in order. The sensor-data profile uses best effort and a smaller queue, because a fresh reading
            matters more than a complete one. When the camera sends pictures faster than the model can use
            them, a reliable queue of 10 stays full, and the model is always handed the oldest of the 10.
          </div>
          <div>
            The figure assumes a camera sending 30 pictures a second and a model slower than that, both
            illustrative, so the picture used is the queue depth divided by 30 seconds old. Log message age at
            the policy boundary to catch it.
          </div>
          <div>
            The bench is illustrative: the camera drops each picture as a card into the slot it stands over, an
            indexer moves the row one slot toward the model per camera frame, and the model&apos;s gantry lifts
            the oldest card out. The camera stands as many slots from the model as the queue keeps pictures, so
            its pointer reads the age on the scale, one tick a frame and a long tick every tenth of a second.
            Running, the bench is slowed about {SLOW} times.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="How old the picture the model uses is"
            description={describe(depth)}
            rowHeader="queue keeps"
            columns={[{ header: 'age of the picture used (seconds)', numeric: true }]}
            rows={QUEUES.map((q) => ({ label: q.label, values: [formatAge(pictureAgeS(q.depth))] }))}
          />
        </>
      }
      source={
        <span data-testid="qos-source">
          Queue default:{' '}
          {qosSource ? (
            <a data-brand-control-id="control:link-focus" href={qosSource.url} target="_blank" rel="noopener" className="underline-offset-2">
              {qosSource.label}
            </a>
          ) : (
            'ROS 2 Quality of Service documentation'
          )}
          .
        </span>
      }
    />
  );
}
