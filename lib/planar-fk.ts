/**
 * Planar serial-chain forward kinematics for the 2D FK arm visualizer on
 * /classical/kinematics. Pure TypeScript: no DOM, no React, so unit tests
 * exercise the math directly and the component stays a thin render layer.
 *
 * Convention (matches the module's FK math): joint 1 sits at the origin,
 * angle zero points along +x, positive angles rotate counter-clockwise
 * (y up), and each joint angle is relative to its parent link. The
 * end-effector position is the running sum of link vectors at cumulative
 * angles, which is exactly the planar reduction of the homogeneous-
 * transform product T_0^1 T_1^2 ... T_{n-1}^n.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface PlanarFkResult {
  /**
   * Frame origins along the chain: the base (always {0,0}) followed by the
   * position of each downstream joint. For n links this has n entries; the
   * tip of the final link is `effector`, not a pivot.
   */
  pivots: Point2[];
  /** Tip of the last link. */
  effector: Point2;
}

/** Link lengths in abstract units; the visualizer scales them to pixels. */
export const LINK_LENGTHS: readonly number[] = [1.0, 0.75, 0.55];

/**
 * Default pose (degrees): a bent elbow that stays strictly inside the
 * workspace, so the reset state is visibly not a singular full extension.
 */
export const DEFAULT_ANGLES_DEG: readonly number[] = [110, -45, -35];

/** Symmetric joint limit used by the visualizer's sliders, degrees. */
export const JOINT_LIMIT_DEG = 180;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Forward kinematics for a planar revolute chain. `anglesDeg[i]` is joint
 * i+1's angle relative to link i; missing angles read as zero. Returns
 * joint-frame origins and the end-effector position, all in the base frame.
 */
export function planarForwardKinematics(
  lengths: readonly number[],
  anglesDeg: readonly number[],
): PlanarFkResult {
  const pivots: Point2[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  let cumulative = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    cumulative += toRad(anglesDeg[i] ?? 0);
    x += lengths[i] * Math.cos(cumulative);
    y += lengths[i] * Math.sin(cumulative);
    if (i < lengths.length - 1) pivots.push({ x, y });
  }
  return { pivots, effector: { x, y } };
}

/** Full-extension radius of the chain's reachable disc. */
export function totalReach(lengths: readonly number[]): number {
  return lengths.reduce((sum, l) => sum + l, 0);
}
