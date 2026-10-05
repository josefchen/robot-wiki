import { AnimatedElement, AnimatedGroup } from '@/components/motion/animated';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * A four-legged robot seen from the side, drawn so a lay reader knows it
 * at a glance: a rounded body, a head with an eye, and four legs that each
 * bend at a knee and end in a foot. The two near legs are drawn in full
 * ink, the far pair lighter behind them.
 *
 * The caller places the four feet; each knee is solved from the hip and the
 * foot with two equal leg segments, so the same drawing stands on uneven
 * ground, tips over or swings a paw through a stride. `RobotDog` has no
 * hooks, so static and server-rendered stages can draw it; scenes use
 * `AnimatedRobotDog`, which draws the same robot from a pose that is a
 * function of scene time.
 */

export type DogPoint = readonly [number, number];

/** Feet in drawing order: rear far, rear near, front far, front near. */
export type DogFeet = readonly [DogPoint, DogPoint, DogPoint, DogPoint];

const r = (v: number) => Number(v.toFixed(2));

/** Hip positions for a dog whose rear hip is at `rear` and front hip at `front`. */
export function robotDogHips(rear: number, front: number, hipY: number): DogFeet {
  return [
    [r(rear + 3), hipY],
    [rear, hipY],
    [r(front + 3), hipY],
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

/** Tail, neck, head and body outline for a dog whose hips sit at `hipY`. */
function DogBody({ rear, front, hipY, ink }: { rear: number; front: number; hipY: number; ink: string }) {
  const bodyTop = hipY - 17;
  const neckX = front + 8;
  const headX = front + 10;
  const headY = bodyTop - 15;
  const paper = MOTION_STAGE.background;
  return (
    <>
      {/* Tail, neck and head behind the body's outline. */}
      <g fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${rear - 9} ${bodyTop + 5} q -7 -4 -9 -12`} />
        <line x1={neckX - 4} y1={bodyTop + 4} x2={neckX + 2} y2={headY + 10} strokeWidth={5} />
      </g>
      <rect x={headX - 4} y={headY} width={20} height={13} rx={5} fill={paper} stroke={ink} strokeWidth={2} />
      <rect x={headX + 13} y={headY + 6} width={7} height={6} rx={2.5} fill={paper} stroke={ink} strokeWidth={2} />
      <circle cx={headX + 9} cy={headY + 5} r={1.8} fill={ink} />
      <rect
        x={rear - 12}
        y={bodyTop}
        width={r(front - rear + 24)}
        height={19}
        rx={8}
        fill={paper}
        stroke={ink}
        strokeWidth={2}
      />
    </>
  );
}

function HipJoints({ rear, front, hipY, ink }: { rear: number; front: number; hipY: number; ink: string }) {
  return (
    <>
      {[rear, front].map((x) => (
        <circle key={x} cx={x} cy={hipY} r={3.2} fill={MOTION_STAGE.background} stroke={ink} strokeWidth={1.5} />
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
}) {
  const hips = robotDogHips(rear, front, hipY);
  const legs = robotDogLegs(hips, feet, segment);
  const paper = MOTION_STAGE.background;
  const leg = (i: number) => {
    const { hip, knee, foot, far } = legs[i];
    return (
      <g key={i} data-dog-leg={i} opacity={far ? 0.45 : undefined}>
        <polyline
          points={`${hip[0]},${hip[1]} ${knee[0]},${knee[1]} ${foot[0]},${foot[1]}`}
          fill="none"
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={knee[0]} cy={knee[1]} r={2.6} fill={paper} stroke={ink} strokeWidth={1.5} />
        <ellipse
          data-dog-foot={i}
          cx={foot[0]}
          cy={r(foot[1] - 2)}
          rx={4.5}
          ry={2.6}
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
      <HipJoints rear={rear} front={front} hipY={hipY} ink={ink} />
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
function poseSolver(rear: number, front: number, segment: number, pose: (t: number) => DogPose) {
  let cachedT = Number.NaN;
  let cached: { pose: DogPose; legs: ReturnType<typeof robotDogLegs> } | null = null;
  return (t: number) => {
    if (cached === null || t !== cachedT) {
      const p = pose(t);
      cachedT = t;
      cached = { pose: p, legs: robotDogLegs(robotDogHips(rear, front, p.hipY), p.feet, segment) };
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
}: {
  rear: number;
  front: number;
  /** Hip height the body is drawn at; the pose's `hipY` shifts it from there. */
  baseHipY: number;
  pose: (t: number) => DogPose;
  segment?: number;
  ink?: string;
  testId?: string;
}) {
  const at = poseSolver(rear, front, segment, pose);
  const paper = MOTION_STAGE.background;
  const leg = (i: number) => (
    <g key={i} data-dog-leg={i} opacity={i % 2 === 0 ? 0.45 : undefined}>
      <AnimatedElement
        as="polyline"
        fill="none"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        bindings={{
          points: (t) => {
            const { hip, knee, foot } = at(t).legs[i];
            return `${hip[0]},${hip[1]} ${knee[0]},${knee[1]} ${foot[0]},${foot[1]}`;
          },
        }}
      />
      <AnimatedElement
        as="circle"
        r={2.6}
        fill={paper}
        stroke={ink}
        strokeWidth={1.5}
        bindings={{ cx: (t) => at(t).legs[i].knee[0], cy: (t) => at(t).legs[i].knee[1] }}
      />
      <AnimatedElement
        as="ellipse"
        data-dog-foot={i}
        rx={4.5}
        ry={2.6}
        bindings={{
          cx: (t) => at(t).legs[i].foot[0],
          cy: (t) => r(at(t).legs[i].foot[1] - 2),
          fill: (t) => at(t).pose.footFill?.[i] ?? ink,
        }}
      />
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
      <AnimatedGroup bindings={lift}>
        <HipJoints rear={rear} front={front} hipY={baseHipY} ink={ink} />
      </AnimatedGroup>
    </g>
  );
}
