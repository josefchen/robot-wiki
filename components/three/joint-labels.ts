import { sceneToRobot, type Vec3 } from '@/lib/ik';

/**
 * Plain names for the arm's joints. Readers see these; the URDF names
 * (shoulder_pan, ...) stay in the "Technical names" fold, in the trajectory
 * file and in the code. The gripper reads as how far it is open, the other
 * joints as an angle.
 */
export interface JointLabel {
  name: string;
  kind: 'angle' | 'opening';
}

export const SO101_JOINT_LABELS: Record<string, JointLabel> = {
  shoulder_pan: { name: 'Base turn', kind: 'angle' },
  shoulder_lift: { name: 'Shoulder', kind: 'angle' },
  elbow_flex: { name: 'Elbow', kind: 'angle' },
  wrist_flex: { name: 'Wrist bend', kind: 'angle' },
  wrist_roll: { name: 'Wrist turn', kind: 'angle' },
  gripper: { name: 'Gripper open', kind: 'opening' },
};

/** The SO-101's joints in chain order, for the deck shown while the arm loads. */
export const SO101_JOINT_ORDER = Object.keys(SO101_JOINT_LABELS);

export function jointLabel(name: string): JointLabel {
  return (
    SO101_JOINT_LABELS[name] ?? {
      name: name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      kind: 'angle',
    }
  );
}

const RAD_TO_DEG = 180 / Math.PI;
const MINUS = '−';

function signedInteger(value: number): string {
  const rounded = Math.round(value);
  // Never print "-0".
  return rounded < 0 ? `${MINUS}${Math.abs(rounded)}` : String(rounded === 0 ? 0 : rounded);
}

/** How far the gripper is open, 0 to 100 percent of its opening range. */
export function openingPercent(radians: number, upper: number): number {
  if (!(upper > 0)) return 0;
  return Math.round((100 * Math.min(upper, Math.max(0, radians))) / upper);
}

/** The value a reader sees beside a joint's name: "45°", "−30°" or "40%". */
export function plainJointValue(
  name: string,
  radians: number,
  upper: number,
): string {
  if (jointLabel(name).kind === 'opening') {
    return `${openingPercent(radians, upper)}%`;
  }
  return `${signedInteger(radians * RAD_TO_DEG)}°`;
}

/** The same value for a screen reader. */
export function spokenJointValue(
  name: string,
  radians: number,
  upper: number,
): string {
  if (jointLabel(name).kind === 'opening') {
    return `${openingPercent(radians, upper)} percent open`;
  }
  const degrees = Math.round(radians * RAD_TO_DEG);
  return `${degrees === 0 ? 0 : degrees} degrees`;
}

/** A signed fixed-point number that never prints "-0.0". */
function signedFixed(value: number, digits: number): string {
  let text = value.toFixed(digits);
  if (Number(text) === 0) text = (0).toFixed(digits);
  return text.startsWith('-') ? text : `+${text}`;
}

/** Technical readout: signed degrees to a tenth, "+45.0°" or "-30.0°". */
export function technicalDegrees(radians: number): string {
  return `${signedFixed(radians * RAD_TO_DEG, 1)}°`;
}

/**
 * A point in the arm's base frame, the URDF's own: x points the way the arm
 * faces with the base turned to zero, y to its left, z up from the table.
 * The scene is three.js Y-up, so this undoes that turn.
 */
export interface BaseFramePoint {
  forward: number;
  left: number;
  up: number;
}

export function sceneToBaseFrame(scene: Vec3): BaseFramePoint {
  const robot = sceneToRobot(scene);
  return { forward: robot.x, left: robot.y, up: robot.z };
}

function centimetres(metres: number, positive: string, negative: string): string {
  const cm = Math.round(metres * 100);
  if (cm === 0) return `0 cm ${positive}`;
  return cm > 0 ? `${cm} cm ${positive}` : `${-cm} cm ${negative}`;
}

/** "39 cm forward, 0 cm left, 23 cm up" */
export function plainPosition(point: BaseFramePoint): string {
  return [
    centimetres(point.forward, 'forward', 'back'),
    centimetres(point.left, 'left', 'right'),
    centimetres(point.up, 'up', 'down'),
  ].join(', ');
}

/** Technical readout in metres, base frame: "x +0.391 y +0.000 z +0.226". */
export function technicalPosition(point: BaseFramePoint): string {
  return `x ${signedFixed(point.forward, 3)} y ${signedFixed(point.left, 3)} z ${signedFixed(point.up, 3)}`;
}
