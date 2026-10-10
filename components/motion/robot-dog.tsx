import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * A four-legged robot seen from the side, as a technical line drawing: a
 * body outline with a small sensor head at the front, and four thin legs
 * that each bend at a knee and end in a small foot. The two near legs are drawn in full
 * ink, the far pair lighter behind them unless `farLegOpacity` says
 * otherwise; first-time readers can take the lighter pair for ghosts.
 * Hips and knees are drawn as small rings unless `joints` is false: the
 * bend in each leg already shows the knee, and readers asked what the rings
 * were.
 *
 * The caller places the four feet; each knee is solved from the hip and the
 * foot with two equal leg segments, so the same drawing stands on uneven
 * ground, lies fallen on its back (`robotDogFallen`) or swings a
 * paw through a stride. `RobotDog` has no
 * hooks, so static and server-rendered stages can draw it; scenes use
 * `AnimatedRobotDog`, which draws the same robot from a pose that is a
 * function of scene time.
 */

export type DogPoint = readonly [number, number];

/** Feet in drawing order: rear far, rear near, front far, front near. */
export type DogFeet = readonly [DogPoint, DogPoint, DogPoint, DogPoint];

const r = (v: number) => Number(v.toFixed(2));

const FAR_LEG_OPACITY = 0.45;

/**
 * Hip positions for a dog whose rear hip is at `rear` and front hip at `front`.
 * The far legs hang `farOffset` ahead of the near ones; a wider offset keeps
 * a far leg moving in step with its near twin from reading as its shadow.
 */
export function robotDogHips(rear: number, front: number, hipY: number, farOffset = 3): DogFeet {
  return [
    [r(rear + farOffset), hipY],
    [rear, hipY],
    [r(front + farOffset), hipY],
    [front, hipY],
  ];
}

/**
 * The knee for a leg of two `segment`-long links from `hip` to `foot`,
 * bent towards the tail as on most legged robots. A foot out of reach
 * straightens the leg along the line to it.
 */
export function robotDogKnee(hip: DogPoint, foot: DogPoint, segment: number): DogPoint {
  const dx = foot[0] - hip[0];
  const dy = foot[1] - hip[1];
  const d = Math.max(1e-6, Math.hypot(dx, dy));
  const half = Math.min(d / 2, segment);
  const bend = Math.sqrt(Math.max(0, segment * segment - half * half));
  const mx = hip[0] + dx / 2;
  const my = hip[1] + dy / 2;
  // The perpendicular that points backwards (towards smaller x) for a leg hanging down.
  const px = -dy / d;
  const py = dx / d;
  const sign = px > 0 ? -1 : 1;
  return [r(mx + sign * px * bend), r(my + sign * py * bend)];
}

/** Hip, knee and foot for each of the four legs. */
export function robotDogLegs(hips: DogFeet, feet: DogFeet, segment: number) {
  return hips.map((hip, i) => ({
    hip,
    knee: robotDogKnee(hip, feet[i], segment),
    foot: feet[i],
    far: i % 2 === 0,
  }));
}

/**
 * The transform that lays a dog drawn standing (hips at `hipY`) on its back
 * on the ground line `groundY`, and where its body's middle then sits:
 * turned upside down about that middle, then tilted `tilt` degrees head-up
 * so its back and its head both rest on the ground. Draw it with standing
 * feet; they end up in the air. A dog pitched forward mid-stride reads as
 * tipping, not as fallen. `place` maps a point of the standing drawing to
 * where the transform puts it, so a note can point at the raised feet.
 */
export function robotDogFallen(
  rear: number,
  front: number,
  hipY: number,
  groundY: number,
  tilt = 10,
): { transform: string; centre: DogPoint; place: (point: DogPoint) => DogPoint } {
  const cx = r((rear + front) / 2);
  const cy = hipY - 8;
  const a = (-tilt * Math.PI) / 180;
  // Outline points that can touch the ground upside down: the back's ends, the head, the snout, the tail tip.
  const outline: DogPoint[] = [
    [rear - 12, hipY - 17],
    [front + 12, hipY - 17],
    [front + 6, hipY - 32],
    [front + 26, hipY - 32],
    [front + 30, hipY - 26],
    [rear - 18, hipY - 24],
  ];
  const lowest = Math.max(...outline.map(([x, y]) => cy + (x - cx) * Math.sin(a) + (cy - y) * Math.cos(a)));
  const drop = r(groundY - lowest - 1);
  return {
    transform: `translate(0 ${drop}) rotate(${-tilt} ${cx} ${cy}) translate(0 ${r(2 * cy)}) scale(1 -1)`,
    centre: [cx, r(cy + drop)],
    place: ([x, y]) => [
      r(cx + (x - cx) * Math.cos(a) - (cy - y) * Math.sin(a)),
      r(cy + (x - cx) * Math.sin(a) + (cy - y) * Math.cos(a) + drop),
    ],
  };
}

/** Stroke widths of the line drawing, in CSS px (stage strokes do not scale). */
const BODY_STROKE = 1.5;
const LEG_STROKE = 1.5;
const JOINT_STROKE = 1;

/** Body outline and the sensor head at its front, for a dog whose hips sit at `hipY`. */
function DogBody({ rear, front, hipY, ink }: { rear: number; front: number; hipY: number; ink: string }) {
  const bodyTop = hipY - 17;
  const paper = MOTION_STAGE.background;
  return (
    <>
      <rect x={front + 4} y={hipY - 31} width={20} height={11} rx={1.5} fill={paper} stroke={ink} strokeWidth={BODY_STROKE} />
      <line x1={front + 8} y1={hipY - 20} x2={front + 8} y2={bodyTop} stroke={ink} strokeWidth={BODY_STROKE} />
      <rect
        x={rear - 12}
        y={bodyTop}
        width={r(front - rear + 24)}
        height={17}
        rx={2}
        fill={paper}
        stroke={ink}
        strokeWidth={BODY_STROKE}
      />
    </>
  );
}

function HipJoints({ rear, front, hipY, ink }: { rear: number; front: number; hipY: number; ink: string }) {
  return (
    <>
      {[rear, front].map((x) => (
        <circle key={x} cx={x} cy={hipY} r={2.8} fill={MOTION_STAGE.background} stroke={ink} strokeWidth={JOINT_STROKE} />
      ))}
    </>
  );
}

export function RobotDog({
  rear,
  front,
  hipY,
  feet,
  segment = 20,
  ink = MOTION_STAGE.label,
  footFill,
  testId = 'robot-dog',
  transform,
  farLegOpacity = FAR_LEG_OPACITY,
  joints = true,
}: {
  /** x of the rear hip. */
  rear: number;
  /** x of the front hip. */
  front: number;
  /** y of both hips, on the underside of the body. */
  hipY: number;
  feet: DogFeet;
  /** Length of each leg segment, hip to knee and knee to foot. */
  segment?: number;
  ink?: string;
  /** Per-foot fill, for example the focus colour for a paw on the ground. */
  footFill?: (index: number) => string | undefined;
  testId?: string;
  transform?: string;
  /** Opacity of the far pair of legs; 1 draws all four in full ink. */
  farLegOpacity?: number;
  /** Rings at the hips and knees. */
  joints?: boolean;
}) {
  const hips = robotDogHips(rear, front, hipY);
  const legs = robotDogLegs(hips, feet, segment);
  const paper = MOTION_STAGE.background;
  const leg = (i: number) => {
    const { hip, knee, foot, far } = legs[i];
    return (
      <g key={i} data-dog-leg={i} opacity={far && farLegOpacity < 1 ? farLegOpacity : undefined}>
        <polyline
          points={`${hip[0]},${hip[1]} ${knee[0]},${knee[1]} ${foot[0]},${foot[1]}`}
          fill="none"
          stroke={ink}
          strokeWidth={LEG_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {joints ? <circle cx={knee[0]} cy={knee[1]} r={2.2} fill={paper} stroke={ink} strokeWidth={JOINT_STROKE} /> : null}
        <ellipse
          data-dog-foot={i}
          cx={foot[0]}
          cy={r(foot[1] - 1.5)}
          rx={2.6}
          ry={1.6}
          fill={footFill?.(i) ?? ink}
        />
      </g>
    );
  };
  return (
    <g data-testid={testId} transform={transform}>
      {leg(0)}
      {leg(2)}
      <DogBody rear={rear} front={front} hipY={hipY} ink={ink} />
      {leg(1)}
      {leg(3)}
      {joints ? <HipJoints rear={rear} front={front} hipY={hipY} ink={ink} /> : null}
    </g>
  );
}

/** Where the dog's hips ride and where its four feet are, with an optional fill per foot. */
export interface DogPose {
  hipY: number;
  feet: DogFeet;
  footFill?: readonly (string | undefined)[];
}

/** The pose and solved legs at a scene time; every binding of one frame reads the same time, so it is solved once. */
function poseSolver(rear: number, front: number, segment: number, pose: (t: number) => DogPose, farOffset?: number) {
  let cachedT = Number.NaN;
  let cached: { pose: DogPose; legs: ReturnType<typeof robotDogLegs> } | null = null;
  return (t: number) => {
    if (cached === null || t !== cachedT) {
      const p = pose(t);
      cachedT = t;
      cached = { pose: p, legs: robotDogLegs(robotDogHips(rear, front, p.hipY, farOffset), p.feet, segment) };
    }
    return cached;
  };
}

/**
 * The same robot as `RobotDog`, posed by a function of scene time. The body
 * is drawn once at `baseHipY` and shifted with the pose's hip height; legs,
 * knees and feet are rewritten each frame through the scene kit's bindings,
 * so playing the scene never re-renders React.
 */
export function AnimatedRobotDog({
  rear,
  front,
  baseHipY,
  pose,
  segment = 20,
  ink = MOTION_STAGE.label,
  testId = 'robot-dog',
  farOffset,
  farLegOpacity = FAR_LEG_OPACITY,
  footMarks,
  joints = true,
}: {
  rear: number;
  front: number;
  /** Hip height the body is drawn at; the pose's `hipY` shifts it from there. */
  baseHipY: number;
  pose: (t: number) => DogPose;
  segment?: number;
  ink?: string;
  testId?: string;
  /** How far ahead of the near legs the far legs hang (see `robotDogHips`). */
  farOffset?: number;
  /** Opacity of the far pair of legs, as on `RobotDog`. */
  farLegOpacity?: number;
  /**
   * Scene-mark names for the four feet, in drawing order. Each named foot
   * gets a mark that shows only while the pose fills that foot, so a scene's
   * colour-role checks see the paint of feet on the ground and nothing else.
   */
  footMarks?: readonly [string, string, string, string];
  /** Rings at the hips and knees, as on `RobotDog`. */
  joints?: boolean;
}) {
  const at = poseSolver(rear, front, segment, pose, farOffset);
  const paper = MOTION_STAGE.background;
  const leg = (i: number) => (
    <g key={i} data-dog-leg={i} opacity={i % 2 === 0 && farLegOpacity < 1 ? farLegOpacity : undefined}>
      <AnimatedElement
        as="polyline"
        fill="none"
        stroke={ink}
        strokeWidth={LEG_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        bindings={{
          points: (t) => {
            const { hip, knee, foot } = at(t).legs[i];
            return `${hip[0]},${hip[1]} ${knee[0]},${knee[1]} ${foot[0]},${foot[1]}`;
          },
        }}
      />
      {joints ? (
        <AnimatedElement
          as="circle"
          r={2.2}
          fill={paper}
          stroke={ink}
          strokeWidth={JOINT_STROKE}
          bindings={{ cx: (t) => at(t).legs[i].knee[0], cy: (t) => at(t).legs[i].knee[1] }}
        />
      ) : null}
      <AnimatedElement
        as="ellipse"
        data-dog-foot={i}
        rx={2.6}
        ry={1.6}
        bindings={{
          cx: (t) => at(t).legs[i].foot[0],
          cy: (t) => r(at(t).legs[i].foot[1] - 1.5),
          fill: (t) => at(t).pose.footFill?.[i] ?? ink,
        }}
      />
      {footMarks ? (
        <AnimatedElement
          as="ellipse"
          data-scene-mark={footMarks[i]}
          rx={4.5}
          ry={2.4}
          bindings={{
            cx: (t) => at(t).legs[i].foot[0],
            cy: (t) => r(at(t).legs[i].foot[1] - 1.5),
            fill: (t) => at(t).pose.footFill?.[i] ?? 'none',
            opacity: (t) => (at(t).pose.footFill?.[i] ? 1 : 0),
          }}
        />
      ) : null}
    </g>
  );
  const lift = { transform: (t: number) => `translate(0 ${r(at(t).pose.hipY - baseHipY)})` };
  return (
    <g data-testid={testId}>
      {leg(0)}
      {leg(2)}
      <AnimatedGroup bindings={lift}>
        <DogBody rear={rear} front={front} hipY={baseHipY} ink={ink} />
      </AnimatedGroup>
      {leg(1)}
      {leg(3)}
      {joints ? (
        <AnimatedGroup bindings={lift}>
          <HipJoints rear={rear} front={front} hipY={baseHipY} ink={ink} />
        </AnimatedGroup>
      ) : null}
    </g>
  );
}
