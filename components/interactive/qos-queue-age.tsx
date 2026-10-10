'use client';

import { useId, useState, type CSSProperties } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * QosQueueAge: why a deep, reliable camera queue makes a learned policy act
 * on old pictures. A camera sends pictures faster than the model can use
 * them, so the queue stays full and, delivering in order, hands the model
 * the oldest picture it holds. With the ROS 2 default of the last 10
 * messages that picture is 10 frames old; keeping only the newest picture
 * makes it one frame old.
 *
 * The queue depth of 10 is the ROS 2 default profile's. The camera rate of
 * 30 pictures a second and a model slower than the camera are
 * illustrative. The queue is a row of thin outlined frames between two
 * labelled boxes; the picture the model uses is the one accent, and an
 * age axis under the row marks how old it is. Switching the preset glides
 * the queue and the age marker to their new places; reduced motion jumps.
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

const WIDTH = 460;
const HEIGHT = 236;
const BOX_W = 54;
const BOX_H = 30;
const ROW_Y = 40;
const CAMERA_X = 2;
const MODEL_X = WIDTH - 2 - BOX_W;
const SLOT_W = 22;
const SLOT_H = 30;
const SLOT_GAP = 6;
const QUEUE_RIGHT = MODEL_X - 32;
const QUEUE_LEFT = QUEUE_RIGHT - DEFAULT_DEPTH * SLOT_W - (DEFAULT_DEPTH - 1) * SLOT_GAP;
const AXIS_Y = 160;
/** The age axis runs from 0 to 0.4 seconds under the queue. */
const AXIS_MAX_S = 0.4;
const AXIS_TICKS = [0, 0.1, 0.2, 0.3, 0.4] as const;
const ageX = (seconds: number) => QUEUE_LEFT + (seconds / AXIS_MAX_S) * (QUEUE_RIGHT - QUEUE_LEFT);
/** The drawing grows to at most 1.6 times its viewBox, so the row stays a diagram on a wide page. */
const STAGE_STYLE = { '--motion-stage-max-scale': 1.6 } as CSSProperties;

const f = (v: number) => Number(v.toFixed(2));
const slotX = (k: number) => f(QUEUE_RIGHT - (k + 1) * SLOT_W - k * SLOT_GAP);
const midY = ROW_Y + BOX_H / 2;

/** A labelled box at one end of the row: the camera or the model. */
function EndBox({ x, label, part, anchor }: { x: number; label: string; part: string; anchor: 'start' | 'end' }) {
  return (
    <g data-scene-part={part}>
      <rect x={x} y={ROW_Y} width={BOX_W} height={BOX_H} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure} />
      <DirectLabel x={anchor === 'start' ? x : x + BOX_W} y={ROW_Y - 8} anchor={anchor}>
        {label}
      </DirectLabel>
    </g>
  );
}

/** A small open arrowhead pointing right, its tip at (x, y). */
function Head({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 6} ${y - 3.5} L${x} ${y} L${x - 6} ${y + 3.5}`} fill="none" />;
}

/** One picture in the queue: a thin outlined frame; the one the model uses is the accent. */
function Picture({ x, used, opacity }: { x: number; used: boolean; opacity: number }) {
  return (
    <rect
      data-picture={used ? 'used' : 'queued'}
      data-chart-role={used ? 'highlight' : 'measurement'}
      x={x}
      y={f(midY - SLOT_H / 2)}
      width={SLOT_W}
      height={SLOT_H}
      fill={MOTION_STAGE.background}
      stroke={used ? roleColour('highlight') : CHART_STRUCTURE.label}
      strokeWidth={used ? CHART_STROKE.trace : CHART_STROKE.structure}
      opacity={f(opacity)}
    />
  );
}

function describe(depth: number): string {
  return `With a camera queue that keeps ${depth === 1 ? 'only the newest picture' : `the last ${depth} pictures`} and a camera sending 30 pictures a second, the model acts on a picture ${formatAge(pictureAgeS(depth))} seconds old; the age equals queue depth over the camera rate.`;
}

export function QosQueueAge({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const qosSource = citationFor('ros2-qos-2026');
  const [queue, setQueue] = useState<QueueId>('ten');
  const depth = QUEUES.find((q) => q.id === queue)!.depth;
  const age = pictureAgeS(depth);
  const shownDepth = useEasedValue(depth);
  const shownAge = useEasedValue(age);
  const accent = roleColour('highlight');
  const marker = f(ageX(shownAge));
  const noteRight = marker > (QUEUE_LEFT + QUEUE_RIGHT) / 2;

  return (
    <InstrumentFigure
      figureId="qos-queue-age"
      className={className}
      kicker="Quality of Service"
      heading="Deep queues feed the robot old pictures"
      controls={
        <PresetGroup label="Queue keeps" presets={QUEUES} value={queue} onChange={setQueue} testId="qos-queue" />
      }
      stage={
        <FigureStage
          footer={<StageStatus>Illustrative camera rate</StageStatus>}
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A camera feeds pictures into a queue that holds ${depth === 1 ? 'one picture' : `${depth} pictures`}; the robot's model takes the oldest one, which is ${formatAge(age)} seconds old.`}
            aria-describedby={descriptionId}
            data-testid="qos-stage"
            style={STAGE_STYLE}
          >
            <g stroke="var(--line-strong)" strokeWidth={CHART_STROKE.structure}>
              <line x1={CAMERA_X + BOX_W} y1={midY} x2={MODEL_X - 1} y2={midY} />
            </g>
            <g stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure}>
              <Head x={MODEL_X - 1} y={midY} />
            </g>
            <EndBox x={CAMERA_X} label="camera" part="camera" anchor="start" />
            <EndBox x={MODEL_X} label="model" part="model" anchor="end" />
            {Array.from({ length: DEFAULT_DEPTH }, (_, k) => {
              const fill = Math.min(1, Math.max(0, shownDepth - k));
              return fill > 0 ? <Picture key={k} x={slotX(k)} used={k === 0} opacity={fill} /> : null;
            })}
            {depth > 1 ? (
              <DirectLabel x={slotX(DEFAULT_DEPTH - 1)} y={ROW_Y - 8} anchor="start">
                newest
              </DirectLabel>
            ) : null}
            <DirectLabel x={QUEUE_RIGHT} y={ROW_Y - 8} anchor="end">
              {depth === 1 ? 'newest, used' : 'oldest, used'}
            </DirectLabel>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={QUEUE_LEFT} y1={AXIS_Y} x2={QUEUE_RIGHT} y2={AXIS_Y} />
              {AXIS_TICKS.map((t) => (
                <line key={t} x1={f(ageX(t))} y1={AXIS_Y} x2={f(ageX(t))} y2={AXIS_Y + 4} />
              ))}
            </g>
            {AXIS_TICKS.map((t) => (
              <text key={t} data-scene-tick="" x={f(ageX(t))} y={AXIS_Y + 7} dominantBaseline="hanging" textAnchor="middle" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
                {t === 0 ? '0' : t.toFixed(1)}
              </text>
            ))}
            <text data-scene-axis="" x={QUEUE_RIGHT} y={AXIS_Y + 7} dy="1.5em" dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              picture age (seconds)
            </text>
            <g data-testid="qos-age-bar" data-chart-role="highlight">
              <line x1={QUEUE_LEFT} y1={AXIS_Y} x2={marker} y2={AXIS_Y} stroke={accent} strokeWidth={CHART_STROKE.trace + 0.5} />
              <circle cx={marker} cy={AXIS_Y} r={CHART_STROKE.markerRadius} fill={accent} />
            </g>
            <StageAnnotation
              x={noteRight ? marker : f(marker + 6)}
              y={AXIS_Y - 14}
              stack="up"
              anchor={noteRight ? 'end' : 'start'}
              lines={['Uses a picture', `${formatAge(age)} seconds old`]}
            />
          </PlotStage>
        </FigureStage>
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
