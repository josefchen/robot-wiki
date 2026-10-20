/**
 * The truth model for HandMotionShare (manipulation/cross-embodiment): why
 * robots and people can share actions written as the hand's motion, and not
 * as joint angles.
 *
 * GR00T N1.7 shares relative end-effector deltas between human and robot
 * embodiments and calls this a key factor in cross-embodiment performance
 * (`isaac-gr00t-repo-2026`); EgoScale uses relative wrist motion
 * (`egoscale-2026`); N1.6 moved most embodiments to state-relative action
 * chunks (`gr00t-n1-6-2025`). The reason is geometry: the same joint angles
 * on an arm of other proportions put the hand somewhere else, while the
 * hand's own motion, replayed from wherever the robot's hand is, draws the
 * same stroke.
 *
 * The bench has two easels. A person's arm draws a check mark on the left
 * one; a robot arm with shorter links copies it on the right one, either by
 * taking the person's shoulder and elbow angles as they are, or by taking the
 * hand's motion from the stroke's start and finding its own joint angles for
 * it. Both arms move in the plane of their easel; lengths are centimetres,
 * angles degrees (shoulder above level, elbow bent down from straight). The
 * arms' lengths, the poses and the stroke are illustrative; the geometry is
 * exact.
 */

export type Pose = { shoulder: number; elbow: number };
export type Links = { upper: number; fore: number };
export type Point = [number, number];

/** The person's arm, and the robot's shorter one. */
export const HUMAN: Links = { upper: 30, fore: 28 };
export const ROBOT: Links = { upper: 24, fore: 18 };

/** Both arms start in this pose: the hand forward and down, at the stroke's start. */
export const START_POSE: Pose = { shoulder: 30, elbow: 115 };

/** The stroke the person draws, as the hand's motion from its start: down and right, then up and right. */
export const STROKE: readonly Point[] = [
  [0, 0],
  [7, -7],
  [19, 4],
];

const RAD = Math.PI / 180;

/** The hand, from the shoulder, for a pose. */
export function handOf(links: Links, { shoulder, elbow }: Pose): Point {
  const a = shoulder * RAD;
  const b = (shoulder - elbow) * RAD;
  return [links.upper * Math.cos(a) + links.fore * Math.cos(b), links.upper * Math.sin(a) + links.fore * Math.sin(b)];
}

/** The elbow, from the shoulder, for a pose. */
export function elbowOf(links: Links, { shoulder }: Pose): Point {
  return [links.upper * Math.cos(shoulder * RAD), links.upper * Math.sin(shoulder * RAD)];
}

/** The pose that puts the hand at `target` (from the shoulder), elbow up as at the start. */
export function poseFor(links: Links, [x, z]: Point): Pose {
  const reach = Math.hypot(x, z);
  const cosine = (reach * reach - links.upper * links.upper - links.fore * links.fore) / (2 * links.upper * links.fore);
  const bend = Math.acos(Math.min(1, Math.max(-1, cosine)));
  const shoulder = Math.atan2(z, x) + Math.atan2(links.fore * Math.sin(bend), links.upper + links.fore * Math.cos(bend));
  return { shoulder: shoulder / RAD, elbow: bend / RAD };
}

/** The stroke's length along its legs, and the point a share 0..1 along it. */
const legLengths = STROKE.slice(1).map((p, k) => Math.hypot(p[0] - STROKE[k]![0], p[1] - STROKE[k]![1]));
const strokeLength = legLengths.reduce((sum, n) => sum + n, 0);
export function strokeAt(share: number): Point {
  let along = Math.min(1, Math.max(0, share)) * strokeLength;
  for (let k = 0; k < legLengths.length; k++) {
    if (along <= legLengths[k]! || k === legLengths.length - 1) {
      const u = Math.min(1, along / legLengths[k]!);
      const a = STROKE[k]!;
      const b = STROKE[k + 1]!;
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    }
    along -= legLengths[k]!;
  }
  return [...STROKE[STROKE.length - 1]!] as Point;
}

export type CopyId = 'joints' | 'hand';
export const COPIES: ReadonlyArray<{ id: CopyId; label: string }> = [
  { id: 'joints', label: 'Joint angles' },
  { id: 'hand', label: "Hand's motion" },
];
export const STILL_COPY: CopyId = 'joints';

const HUMAN_START = handOf(HUMAN, START_POSE);
const ROBOT_START = handOf(ROBOT, START_POSE);

/** The person's pose a share of the way through the stroke. */
export const humanPoseAt = (share: number): Pose => {
  const [dx, dz] = strokeAt(share);
  return poseFor(HUMAN, [HUMAN_START[0] + dx, HUMAN_START[1] + dz]);
};

/** The robot's pose a share of the way through, for each way of copying. */
export function robotPoseAt(copy: CopyId, share: number): Pose {
  if (copy === 'joints') return humanPoseAt(share);
  const [dx, dz] = strokeAt(share);
  return poseFor(ROBOT, [ROBOT_START[0] + dx, ROBOT_START[1] + dz]);
}

/** The robot's stroke relative to its own start, a share of the way through. */
export const robotStrokeAt = (copy: CopyId, share: number): Point => {
  const [x, z] = handOf(ROBOT, robotPoseAt(copy, share));
  return [x - ROBOT_START[0], z - ROBOT_START[1]];
};

/** How far the robot's stroke strays from the person's, in centimetres: the worst point along the way. */
export function strayCm(copy: CopyId, upTo = 1): number {
  let worst = 0;
  for (let k = 0; k <= 400; k++) {
    const share = (k / 400) * upTo;
    const [rx, rz] = robotStrokeAt(copy, share);
    const [hx, hz] = strokeAt(share);
    worst = Math.max(worst, Math.hypot(rx - hx, rz - hz));
  }
  return worst;
}

export const tenthCm = (cm: number) => Math.round(cm * 10) / 10;

/** The readout once the stroke is drawn. Fits one line at 360 px (40 characters or fewer). */
export function readoutFor(copy: CopyId): string {
  const stray = tenthCm(strayCm(copy));
  return copy === 'joints' ? `Joint angles copied · strays ${stray} cm` : stray === 0 ? "Hand's motion copied · same stroke" : `Hand's motion copied · ${stray} cm off`;
}

/**
 * Drawing the stroke: the pens lift and both arms go back to the start (any old
 * strokes are cleared), then the person draws and the robot copies it live.
 */
export const RETURN_SECONDS = 0.9;
export const DRAW_SECONDS = 3.6;
export const PEN_LIFT_CM = 3;

export type DrawState = { phase: 'return' | 'draw' | 'done'; share: number; lift: number; human: Pose; robot: Pose };

const ease = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const mix = (a: Pose, b: Pose, u: number): Pose => ({ shoulder: a.shoulder + (b.shoulder - a.shoulder) * u, elbow: a.elbow + (b.elbow - a.elbow) * u });

/** The finished drawing for a way of copying. */
export const doneState = (copy: CopyId): DrawState => ({ phase: 'done', share: 1, lift: 0, human: humanPoseAt(1), robot: robotPoseAt(copy, 1) });

/** The bench at time t (seconds) of a drawing in `copy`, starting with the arms in `from`. */
export function drawAt(copy: CopyId, t: number, from: { human: Pose; robot: Pose } = doneState(copy)): DrawState {
  if (t < RETURN_SECONDS) {
    const u = ease(clamp01(t / RETURN_SECONDS));
    const lift = PEN_LIFT_CM * Math.sin(Math.PI * clamp01(t / RETURN_SECONDS));
    return { phase: 'return', share: 0, lift, human: mix(from.human, START_POSE, u), robot: mix(from.robot, START_POSE, u) };
  }
  const u = clamp01((t - RETURN_SECONDS) / DRAW_SECONDS);
  if (u >= 1) return doneState(copy);
  const share = ease(u);
  return { phase: 'draw', share, lift: 0, human: humanPoseAt(share), robot: robotPoseAt(copy, share) };
}

/** The readout for a moment of the drawing. Fits one line at 360 px (40 characters or fewer). */
export function readoutAt(copy: CopyId, state: DrawState): string {
  if (state.phase === 'return') return 'Pens back to the start';
  if (state.phase === 'draw') return 'Drawing · the robot copies live';
  return readoutFor(copy);
}
