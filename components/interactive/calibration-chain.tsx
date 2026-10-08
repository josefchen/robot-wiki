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
  type ChartRole,
} from '@/components/motion/chart';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * CalibrationChain: a side view of a robot arm with a wrist camera looking
 * down at a box, drawn as a frame graph over five frames (robot base,
 * wrist, camera, hand, box); the arrows between them are the links
 * the robot chains to reach what it sees. The box's position comes through
 * base, wrist, camera and box; the hand is placed through base, wrist and
 * hand; so an error on any link moves the hand relative to the box.
 *
 * The stage names each link in plain words. "How this was made" holds its
 * technical name and, where a source reports one, the size of error that
 * link has been measured to carry. The three numbers come from three
 * different studies on three different robots and sensors, so they stay
 * with their sources and caveats in the fold.
 *
 * The figure is static: no controls and a deterministic render.
 */

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 380;
/** The widest the drawing grows, so its labels stay beside their parts on a wide page. */
const MAX_DRAWING_PX = 480;
/**
 * Baseline step between stacked stage lines, in ems: stage text holds its
 * CSS pixel size while the viewBox stretches, so a step in stage units
 * would pull a callout's lines apart on a wide stage.
 */
const LINE_EM = 1.25;

/** Round every rendered geometry value: SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

type Point = { x: number; y: number };
type Anchor = 'start' | 'middle' | 'end';
type FrameId = 'base' | 'wrist' | 'camera' | 'tip' | 'object';
type PathKind = 'robot' | 'camera';

/**
 * The five frames: where each sits and where its name is written. `stage`
 * is the word drawn beside the part when it differs from the frame's name,
 * which the method fold keeps.
 */
const FRAMES: Record<FrameId, Point & { label: string; stage?: string; lx: number; ly: number; anchor: Anchor }> = {
  base: { x: 30, y: 340, label: 'robot base', stage: 'robot arm', lx: 54, ly: 366, anchor: 'start' },
  wrist: { x: 176, y: 92, label: 'wrist', lx: 164, ly: 82, anchor: 'end' },
  camera: { x: 230, y: 76, label: 'camera', lx: 250, ly: 80, anchor: 'start' },
  tip: { x: 176, y: 148, label: 'hand', lx: 194, ly: 132, anchor: 'start' },
  object: { x: 264, y: 342, label: 'box', lx: 264, ly: 366, anchor: 'middle' },
};

/** Only the spot the hand must reach carries a dot; the annotation points at it. */
const MARKED_FRAMES: readonly FrameId[] = ['object'];

/** The arm's joints between the base and the wrist. */
const SHOULDER: Point = { x: 30, y: 324 };
const ELBOW: Point = { x: 40, y: 150 };
const TABLE_Y = 372;
const BOX = { x: 232, y: 316, w: 64, h: TABLE_Y - 316 };
const PEDESTAL = { x: 14, w: 32 };

/**
 * A link's name, set right beside the part it names. Labels carry no
 * leader: stage type holds its CSS pixel size while the viewBox stretches,
 * so a leader planned in stage units drifts off its label on a wide stage.
 */
type Callout = {
  /** Where the anchored line's baseline sits; the other lines stack from it. */
  x: number;
  y: number;
  anchor: Anchor;
  /** The line held at `y`: a callout above its part holds its last line, so it never drifts onto the part. */
  hold?: 'first' | 'last';
  /** The link in plain words, one entry per line. */
  name: readonly string[];
};

type Link = {
  id: string;
  from: FrameId;
  to: FrameId;
  /** Joints the arrow passes through between its two frames. */
  via?: readonly Point[];
  path: PathKind;
  /** What sets this link, in plain words. */
  sets: string;
  callout: Callout;
  /** The source behind the measured error, when one reports a number. */
  citationId?: string;
  /** The finding in full, for "How this was made". */
  finding: string;
  /** The measured error, for the method table. */
  error: string;
};

const LINKS: readonly Link[] = [
  {
    id: 'base-wrist',
    from: 'base',
    to: 'wrist',
    via: [SHOULDER, ELBOW],
    path: 'robot',
    sets: 'joint readings and link lengths',
    callout: {
      x: 54,
      y: 214,
      anchor: 'start',
      name: ['how far each joint', 'turns, and how long', 'each arm part is'],
    },
    citationId: 'humanoid-geometric-calibration-2025',
    finding:
      "Nguyen and colleagues calibrated a humanoid from 31 chosen postures and cut its RMS error 2.3-fold against the manufacturer's model.",
    error: 'RMS error cut 2.3-fold by calibration',
  },
  {
    id: 'wrist-camera',
    from: 'wrist',
    to: 'camera',
    path: 'camera',
    sets: 'hand-eye calibration',
    callout: {
      x: 150,
      y: 52,
      anchor: 'start',
      hold: 'last',
      name: ['where the camera is', 'fixed on the wrist'],
    },
    citationId: 'omnicalib-2026',
    finding:
      'OmniCalib found the CAD values for a wrist camera off by up to 10.56 mm and 1.74 degrees, and writes back only the corrections its observability checks support.',
    error: 'up to 10.56 mm and 1.74 degrees from CAD',
  },
  {
    id: 'camera-object',
    from: 'camera',
    to: 'object',
    path: 'camera',
    sets: 'what the camera measures (depth)',
    callout: {
      x: 248,
      y: 282,
      anchor: 'end',
      name: ["the camera's measure of", 'how far away the box is'],
    },
    citationId: 'khoshelham-kinect-2012',
    finding:
      'Khoshelham and Oude Elberink found that a Kinect depth sensor’s random depth error grows from a few millimetres to about 4 cm at its maximum range.',
    error: 'random depth error up to about 4 cm',
  },
  {
    id: 'wrist-tip',
    from: 'wrist',
    to: 'tip',
    path: 'robot',
    sets: 'tool offset',
    callout: {
      x: 176,
      y: 168,
      anchor: 'middle',
      name: ['how far the', 'fingertips reach'],
    },
    finding:
      'No source here reports a measured error for the tool offset. It is checked by touching one point with the gripper tip from several angles.',
    error: 'no sourced error; checked by touching one point from several angles',
  },
];

/** Which role and series each path is drawn in. */
const PATH_ROLE: Record<PathKind, ChartRole> = { robot: 'action', camera: 'measurement' };
const PATH_SERIES: Record<PathKind, string> = { robot: 'robot-links', camera: 'camera-links' };

const DOT_R = CHART_STROKE.markerRadius;
/** Arrows stop this far from a frame's centre, so every dot stays visible. */
const DOT_GAP = DOT_R + 3;
const HEAD_LEN = 8;
const HEAD_HALF = 4;
const ARM_W = 12;
const MOUNT_W = 6;
const OUTLINE = 1;
const JOINT_R = 7;
const JOINT_HUB_R = 2;

const ink = CHART_STRUCTURE.label;
const graphite = CHART_STRUCTURE.labelSecondary;
const concrete = CHART_STRUCTURE.grid;
const paper = MOTION_STAGE.background;

/** A point `d` units from `a` towards `b`. */
function toward(a: Point, b: Point, d: number): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: a.x + ((b.x - a.x) / len) * d, y: a.y + ((b.y - a.y) / len) * d };
}

/** A link's shaft and arrowhead, both clear of the frame dots at its ends. */
function linkArrow(link: Link) {
  const pts = [FRAMES[link.from], ...(link.via ?? []), FRAMES[link.to]];
  const first = toward(pts[0], pts[1], DOT_GAP);
  const tip = toward(pts[pts.length - 1], pts[pts.length - 2], DOT_GAP);
  const base = toward(tip, pts[pts.length - 2], HEAD_LEN);
  const nx = (tip.y - base.y) / HEAD_LEN;
  const ny = -(tip.x - base.x) / HEAD_LEN;
  const shaft = [first, ...pts.slice(1, -1), base].map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ');
  return {
    shaft: `M ${shaft}`,
    head: `M ${f(tip.x)} ${f(tip.y)} L ${f(base.x + nx * HEAD_HALF)} ${f(base.y + ny * HEAD_HALF)} L ${f(base.x - nx * HEAD_HALF)} ${f(base.y - ny * HEAD_HALF)} Z`,
  };
}

/** The robot, camera, box and table in greys: context under the links. */
function Scene() {
  const { base, wrist, camera, tip } = FRAMES;
  const lens = { x: camera.x, y: camera.y + 12 };
  return (
    <g data-scene="robot">
      <line x1={8} y1={TABLE_Y} x2={VIEW_W - 8} y2={TABLE_Y} stroke={graphite} strokeWidth={CHART_STROKE.trace} />
      <rect
        x={PEDESTAL.x}
        y={base.y}
        width={PEDESTAL.w}
        height={TABLE_Y - base.y}
        fill={concrete}
        stroke={graphite}
        strokeWidth={CHART_STROKE.structure}
      />
      {/* Each part is an outlined solid: a graphite band under a narrower concrete one. */}
      {[ARM_W + OUTLINE * 2, ARM_W].map((width) => (
        <path
          key={`arm-${width}`}
          data-scene-part={width === ARM_W ? 'arm' : undefined}
          d={`M ${base.x} ${base.y} L ${SHOULDER.x} ${SHOULDER.y} L ${ELBOW.x} ${ELBOW.y} L ${wrist.x} ${wrist.y}`}
          fill="none"
          stroke={width === ARM_W ? concrete : graphite}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {[MOUNT_W + OUTLINE * 2, MOUNT_W].map((width) => (
        <line
          key={`mount-${width}`}
          x1={wrist.x}
          y1={wrist.y}
          x2={camera.x}
          y2={camera.y}
          stroke={width === MOUNT_W ? concrete : graphite}
          strokeWidth={width}
        />
      ))}
      {[SHOULDER, ELBOW].map((joint) => (
        <g key={`${joint.x}-${joint.y}`} data-scene-part="joint">
          <circle cx={joint.x} cy={joint.y} r={JOINT_R} fill={paper} stroke={graphite} strokeWidth={CHART_STROKE.trace} />
          <circle cx={joint.x} cy={joint.y} r={JOINT_HUB_R} fill={graphite} />
        </g>
      ))}
      <g data-scene-part="gripper" fill="none" stroke={graphite} strokeLinecap="round">
        <path d={`M ${wrist.x} ${wrist.y} V ${wrist.y + 14}`} strokeWidth={6} />
        <path d={`M ${wrist.x - 13} ${wrist.y + 14} H ${wrist.x + 13}`} strokeWidth={4} />
        <path
          d={`M ${wrist.x - 12} ${wrist.y + 14} V ${tip.y - 2} M ${wrist.x + 12} ${wrist.y + 14} V ${tip.y - 2}`}
          strokeWidth={3}
        />
      </g>
      <g data-scene-part="camera">
        <rect x={camera.x - 14} y={camera.y - 10} width={28} height={20} rx={2} fill={paper} stroke={graphite} strokeWidth={CHART_STROKE.trace} />
        <rect x={lens.x - 5} y={lens.y - 2} width={10} height={4} fill={graphite} />
      </g>
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill={concrete} stroke={graphite} strokeWidth={CHART_STROKE.structure} />
    </g>
  );
}

/** A link's label, in the path colour. */
function LinkCallout({ link }: { link: Link }) {
  const { x, y, anchor, hold = 'first', name } = link.callout;
  const colour = roleColour(PATH_ROLE[link.path]);
  const held = hold === 'last' ? name.length - 1 : 0;
  const dy = (i: number) => `${f((i - held) * LINE_EM)}em`;
  return (
    <g data-link-label={link.id}>
      {name.map((line, i) => (
        <text
          key={`name-${line}`}
          data-chart-label=""
          data-chart-role={PATH_ROLE[link.path]}
          x={x}
          y={y}
          dy={dy(i)}
          textAnchor={anchor}
          fontSize={CHART_TYPE.labelPx}
          fontWeight={600}
          fill={colour}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function RowSource({ id, lookup }: { id: string; lookup: ReturnType<typeof useCitationLookup> }) {
  const record = lookup(id);
  if (!record) return <span className="text-text-dim">not listed</span>;
  return (
    <a
      data-brand-control-id="control:link-focus"
      href={record.url}
      target="_blank"
      rel="noopener"
      className="underline-offset-2"
    >
      {record.label}
    </a>
  );
}

/** The link's name in the method fold: "robot base to wrist". */
const linkName = (link: Link) => `${FRAMES[link.from].label} to ${FRAMES[link.to].label}`;

const DESCRIPTION =
  "Four calibrated links join the robot base to the box its camera sees: calibration cut a humanoid's error 2.3-fold, a wrist camera's drawing values were off by up to 10.56 mm and 1.74 degrees, a Kinect's depth error reaches about 4 cm, and the tool offset has no sourced error.";

export function CalibrationChain({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const target = FRAMES.object;

  return (
    <InstrumentFigure
      figureId="calibration-chain"
      className={className}
      kicker="Camera-to-hand chain"
      heading="A wrong measurement anywhere makes the hand miss the box"
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="robot-links" swatch={<LegendSwatch role="action" mark="line" />}>
                  what the arm measures
                </LegendItem>
                <LegendItem series="camera-links" swatch={<LegendSwatch role="measurement" mark="line" />}>
                  what the camera measures
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Schematic: not drawn to scale</StageStatus>
            </>
          }
        >
          {/* The wrapper is the type-scale container, so stage text keeps its size on a capped drawing. */}
          <div className="@container" style={{ maxWidth: MAX_DRAWING_PX }}>
          <PlotStage
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            aria-label="Side view of a robot arm with a camera on its wrist looking down at a box on a table. Arrows join five frames: robot base to wrist, wrist to camera, camera to box, and wrist to hand."
            aria-describedby={descriptionId}
            data-testid="calibration-chain-stage"
          >
            <Scene />
            {LINKS.map((link) => {
              const { shaft, head } = linkArrow(link);
              const colour = roleColour(PATH_ROLE[link.path]);
              return (
                <g
                  key={link.id}
                  data-series={PATH_SERIES[link.path]}
                  data-chart-role={PATH_ROLE[link.path]}
                  data-link={link.id}
                >
                  <path
                    d={shaft}
                    fill="none"
                    stroke={colour}
                    strokeWidth={CHART_STROKE.trace}
                    strokeLinejoin="round"
                  />
                  <path d={head} fill={colour} />
                </g>
              );
            })}
            {(Object.keys(FRAMES) as FrameId[]).map((id) => {
              const frame = FRAMES[id];
              return (
                <g key={id} data-frame={id}>
                  {MARKED_FRAMES.includes(id) ? (
                    <circle cx={frame.x} cy={frame.y} r={DOT_R} fill={ink} stroke={paper} strokeWidth={CHART_STROKE.structure} />
                  ) : null}
                  <text
                    data-chart-label=""
                    x={frame.lx}
                    y={frame.ly}
                    textAnchor={frame.anchor}
                    fontSize={CHART_TYPE.labelPx}
                    fill={ink}
                  >
                    {frame.stage ?? frame.label}
                  </text>
                </g>
              );
            })}
            {LINKS.map((link) => (
              <LinkCallout key={link.id} link={link} />
            ))}
            <StageAnnotation
              x={224}
              y={328}
              anchor="end"
              lines={['The hand must', 'reach this spot']}
              from={[228, 340]}
              target={[target.x - DOT_R - 1, target.y]}
              pointer="arrow"
            />
          </PlotStage>
          </div>
        </FigureStage>
      }
      caption="The robot reaches what its camera sees only through these measurements, so each one must be checked."
      method={
        <>
          <div>
            The drawing is a schematic. Each arrow is a link between two frames, places the robot keeps
            track of; the dot marks the spot on the box the hand must reach, and the robot base is
            where the drawn robot arm stands. To find the box,
            the robot chains robot base to wrist,
            wrist to camera and camera to box. It places the gripper through robot base to wrist and
            wrist to hand, the gripper tip. An error on any of these links moves where the gripper lands
            relative to the box. Calibration measures each link.
          </div>
          <div>
            Each number comes from a different study and robot: a humanoid&apos;s kinematics, a wrist
            camera&apos;s CAD values and a Kinect depth sensor. The numbers show the size of error each
            link can carry, not one robot&apos;s error budget.
          </div>
          <ul className="list-disc space-y-1 pl-5" data-testid="calibration-chain-sources">
            {LINKS.map((link) => (
              <li key={link.id} data-link-source={link.id}>
                <span className="font-medium">{linkName(link)}</span>, set by {link.sets}. {link.finding}
                {link.citationId ? (
                  <>
                    {' '}Source: <RowSource id={link.citationId} lookup={citationFor} />.
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          <div>
            The article recommends storing each calibration together with its residuals, the error left
            over after calibrating.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="The four links and their measured errors"
            description={DESCRIPTION}
            rowHeader="link"
            columns={[{ header: 'what sets it' }, { header: 'measured error' }]}
            rows={LINKS.map((link) => ({ label: linkName(link), values: [link.sets, link.error] }))}
          />
        </>
      }
    />
  );
}
