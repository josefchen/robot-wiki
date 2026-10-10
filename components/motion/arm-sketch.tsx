import { CHART_STROKE, roleColour, type ChartRole } from './chart';
import { GripperGlyph } from './gripper-glyph';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * A two-link robot arm seen from the side, as a clean line drawing: each
 * link one thin stroke, small paper-filled joint circles, a two-finger
 * gripper outline and an outlined pedestal. Stage units, y down; angles in
 * radians, anticlockwise on screen, the shoulder's from the +x axis and
 * the elbow's from the upper arm. No hooks, so any figure can draw it.
 */

export type ArmPoint = { x: number; y: number };
export type ArmAngles = { shoulder: number; elbow: number };

/** The hand's size in stage units; a hanging hand's fingertips sit 1.15 of it below the wrist. */
export const GRIPPER_SIZE = 14;

/** Joint circle radii in stage units: the shoulder a touch larger than the elbow. */
const JOINT_RADIUS = { shoulder: 4.5, elbow: 3.5 } as const;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));

/** The elbow and hand of a two-link arm at the given joint angles. */
export function armPoints(base: ArmPoint, l1: number, l2: number, { shoulder, elbow }: ArmAngles) {
  const e = { x: base.x + l1 * Math.cos(shoulder), y: base.y - l1 * Math.sin(shoulder) };
  const h = { x: e.x + l2 * Math.cos(shoulder + elbow), y: e.y - l2 * Math.sin(shoulder + elbow) };
  return { elbow: e, hand: h };
}

/**
 * The joint angles that put the hand on `target`, with the elbow bent up
 * or down, or null when the target is out of reach (the Modern Robotics
 * law-of-cosines solution for a planar two-link arm).
 */
export function armIk(base: ArmPoint, l1: number, l2: number, target: ArmPoint, bend: 'up' | 'down'): ArmAngles | null {
  const dx = target.x - base.x;
  const dy = base.y - target.y;
  const c = (dx * dx + dy * dy - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  if (c > 1 + 1e-9 || c < -1 - 1e-9) return null;
  const elbow = (bend === 'up' ? -1 : 1) * Math.acos(Math.min(1, Math.max(-1, c)));
  const shoulder = Math.atan2(dy, dx) - Math.atan2(l2 * Math.sin(elbow), l1 + l2 * Math.cos(elbow));
  return { shoulder, elbow };
}

/**
 * The pedestal the shoulder stands on: an outlined column down to a foot
 * plate on `floorY`, and the floor itself as a hairline.
 */
export function ArmPost({ base, floorY, floor = [base.x - 48, base.x + 48] }: {
  base: ArmPoint;
  floorY: number;
  /** The floor hairline's x extent. */
  floor?: readonly [number, number];
}) {
  const { x, y } = base;
  const ink = roleColour('state');
  return (
    <g data-scene-structure="post" fill="none" stroke={ink} strokeWidth={CHART_STROKE.structure}>
      <line x1={f(floor[0])} y1={f(floorY)} x2={f(floor[1])} y2={f(floorY)} stroke="var(--line-strong)" />
      <rect x={f(x - 6)} y={f(y)} width={12} height={f(Math.max(0, floorY - 5 - y))} />
      <rect x={f(x - 18)} y={f(floorY - 5)} width={36} height={5} />
    </g>
  );
}

/**
 * The arm in one pose. A ghost is the same drawing dashed in its role
 * (the reference grey by default at the call site), so a "where it was" or
 * "the other answer" pose reads as a trace beside the solid arm, in
 * grayscale too.
 */
export function ArmSketch({
  base,
  l1,
  l2,
  angles,
  role = 'state',
  ghost = false,
  pointDown = false,
  testId,
}: {
  base: ArmPoint;
  l1: number;
  l2: number;
  angles: ArmAngles;
  role?: ChartRole;
  ghost?: boolean;
  /** Hang the hand straight down from the wrist, fingertips below it. */
  pointDown?: boolean;
  testId?: string;
}) {
  const { elbow, hand } = armPoints(base, l1, l2, angles);
  const colour = roleColour(role);
  const stroke = {
    stroke: colour,
    strokeWidth: ghost ? CHART_STROKE.reference : CHART_STROKE.trace,
    strokeDasharray: ghost ? CHART_STROKE.dash : undefined,
  };
  const handAngle = pointDown ? 90 : -((angles.shoulder + angles.elbow) * 180) / Math.PI;
  const tip = pointDown ? { x: hand.x, y: hand.y + GRIPPER_SIZE * 1.15 } : hand;
  return (
    <g data-testid={testId} data-chart-role={role} data-arm={ghost ? 'ghost' : 'solid'}>
      <path
        d={`M${f(base.x)} ${f(base.y)} L${f(elbow.x)} ${f(elbow.y)} L${f(hand.x)} ${f(hand.y)}`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...stroke}
      />
      <GripperGlyph x={tip.x} y={tip.y} angle={handAngle} size={GRIPPER_SIZE} role={role} dashed={ghost} />
      {([[base, JOINT_RADIUS.shoulder], [elbow, JOINT_RADIUS.elbow]] as const).map(([p, radius], i) => (
        <circle
          key={i}
          cx={f(p.x)}
          cy={f(p.y)}
          r={radius}
          fill={MOTION_STAGE.background}
          {...stroke}
          strokeDasharray={undefined}
        />
      ))}
    </g>
  );
}
