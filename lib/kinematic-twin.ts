/**
 * The kinematic twin behind KinematicTwin (data-hardware/teleop-rigs).
 *
 * GELLO is a scaled replica of the arm it drives, built from 3D-printed links
 * and off-the-shelf motors, so its joint readings map one to one onto robot
 * commands (Wu and colleagues, `gello-2023`); ALOHA's leader arm twins its
 * follower the same way, so demonstrations arrive in the robot's joint space
 * (Zhao and colleagues, `act-aloha-2023`). The model is that sentence: the
 * command the robot gets is the leader's reading, joint for joint, and
 * because every link of the leader is the same share of the robot's, the
 * robot's hand lands where the leader's would, scaled up by that share.
 *
 * Angles are in degrees in the arm's own plane. The shoulder lifts the upper
 * arm above level; the elbow bends the forearm down from straight. Lengths
 * are in robot upper-arm lengths. The leader's share of the robot's size, the
 * joint ranges, the still pose and the run are illustrative; the copy is
 * exact.
 */

export type Pose = { shoulder: number; elbow: number };
export type Links = { upper: number; fore: number };

/** The joint stops, the same on both arms: a twin has the robot's joints and the robot's limits. */
export const SHOULDER_RANGE: readonly [number, number] = [18, 44];
export const ELBOW_RANGE: readonly [number, number] = [50, 140];

/** The still pose: the hand reaching forward and down. */
export const STILL_POSE: Pose = { shoulder: 28, elbow: 100 };

/** The robot's links, in upper-arm lengths. */
export const ROBOT_LINKS: Links = { upper: 1, fore: 0.875 };

/** Every length of the leader is this share of the robot's (illustrative: each GELLO design is scaled to its arm). */
export const LEADER_SCALE = 0.6;
export const LEADER_LINKS: Links = { upper: ROBOT_LINKS.upper * LEADER_SCALE, fore: ROBOT_LINKS.fore * LEADER_SCALE };

const RAD = Math.PI / 180;
const clamp = (value: number, [low, high]: readonly [number, number]) => Math.min(high, Math.max(low, value));

/** A pose inside the shared joint stops. */
export const clampPose = ({ shoulder, elbow }: Pose): Pose => ({
  shoulder: clamp(shoulder, SHOULDER_RANGE),
  elbow: clamp(elbow, ELBOW_RANGE),
});

/** What the robot is told: the leader's joint readings, exactly as read. */
export const commandFor = (reading: Pose): Pose => ({ shoulder: reading.shoulder, elbow: reading.elbow });

/** The direction of the forearm, in degrees above level. */
export const forearmHeading = ({ shoulder, elbow }: Pose) => shoulder - elbow;

/** The elbow and the wrist, from the shoulder, in the arm's plane (x forward, z up). */
export function armPoints(links: Links, pose: Pose) {
  const a = pose.shoulder * RAD;
  const b = forearmHeading(pose) * RAD;
  const elbow: [number, number] = [links.upper * Math.cos(a), links.upper * Math.sin(a)];
  const wrist: [number, number] = [elbow[0] + links.fore * Math.cos(b), elbow[1] + links.fore * Math.sin(b)];
  return { elbow, wrist };
}

/**
 * The pose that puts the wrist at `target` (from the shoulder), elbow up,
 * held inside the joint stops. Out of reach, the arm stretches toward the
 * target as far as its stops allow.
 */
export function poseFor(links: Links, [x, z]: readonly [number, number]): Pose {
  const reach = Math.hypot(x, z);
  const cosine = (reach * reach - links.upper * links.upper - links.fore * links.fore) / (2 * links.upper * links.fore);
  const elbow = Math.acos(Math.min(1, Math.max(-1, cosine)));
  const shoulder = Math.atan2(z, x) + Math.atan2(links.fore * Math.sin(elbow), links.upper + links.fore * Math.cos(elbow));
  return clampPose({ shoulder: shoulder / RAD, elbow: elbow / RAD });
}

/** Whole degrees, as the readout and the dials' reading show them. */
export const degrees = (pose: Pose): Pose => ({ shoulder: Math.round(pose.shoulder), elbow: Math.round(pose.elbow) });

/** The readout: the leader's two readings, which the robot is sent as they are. */
export function readoutFor(pose: Pose): string {
  const { shoulder, elbow } = degrees(pose);
  return `Shoulder ${shoulder} degrees · elbow ${elbow} degrees`;
}

/** A joint slider's value, in words; it carries both readings, as the readout does. */
export function valueTextFor(pose: Pose): string {
  const { shoulder, elbow } = degrees(commandFor(pose));
  return `Leader's shoulder ${shoulder} degrees and elbow ${elbow} degrees; the robot is sent ${shoulder} and ${elbow}`;
}

/** "Move the leader" plays this long, in seconds. */
export const RUN_SECONDS = 5;

/** The run folds the leader in, then reaches it out low over the robot's mat, where it ends. */
export const FOLD_POSE: Pose = { shoulder: 40, elbow: 128 };
export const REACH_POSE: Pose = { shoulder: 22, elbow: 62 };

const smooth = (u: number) => u * u * (3 - 2 * u);

/** The leader's pose a share 0..1 of the way through a run that starts at `from`: eased into and out of each leg. */
export function runAt(from: Pose, share: number): Pose {
  const legs = [from, FOLD_POSE, REACH_POSE];
  const at = Math.min(1, Math.max(0, share)) * (legs.length - 1);
  const leg = Math.min(legs.length - 2, Math.floor(at));
  const u = smooth(at - leg);
  const a = legs[leg]!;
  const b = legs[leg + 1]!;
  return { shoulder: a.shoulder + (b.shoulder - a.shoulder) * u, elbow: a.elbow + (b.elbow - a.elbow) * u };
}
