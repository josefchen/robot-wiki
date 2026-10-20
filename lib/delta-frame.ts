/**
 * The truth model for DeltaFrame (manipulation/robot-learning-roadmap): why
 * an end-effector delta means nothing until you say which frame it is in.
 *
 * Tedrake: "Every time we describe the (relative) position as a vector of
 * numbers, we need to be explicit about the frame we are using, specifically
 * the 'expressed-in' frame" (`tedrake-manipulation-2026`); Lynch and Park
 * write the same motion in the fixed space frame or in the body frame
 * (`modern-robotics-2017`). The roadmap's first stage is exactly this: which
 * frame an object pose or end-effector delta uses.
 *
 * The bench is a plotter with a turret: a demonstration recorded the move
 * "5 cm forward" in the tool's own frame while the tool was turned by some
 * angle, and its stroke is on the paper. A replay reads the same two numbers
 * either in the tool's frame, which turns them with the tool, or in the
 * table's frame, which does not. The two land 2 × 5 × sin(angle / 2) cm apart:
 * nothing when the tool is square to the table, so the mistake hides there,
 * and more the further it is turned.
 *
 * The move's length and the angles are illustrative; the geometry is exact.
 * Lengths are in centimetres on the paper, x along the table's rails and y
 * across them, the angle in degrees from the table's x toward its y.
 */

/** The recorded delta, in the tool's frame: 5 cm forward along the tool, nothing across. */
export const DELTA_CM: readonly [number, number] = [5, 0];

/** Where the pen starts on the paper, in centimetres from the paper's centre. */
export const START_CM: readonly [number, number] = [-3.6, -2.4];

/** How far the tool can be turned, and the still pose's angle. */
export const ANGLE_RANGE: readonly [number, number] = [0, 90];
export const STILL_ANGLE = 60;

export type FrameId = 'tool' | 'table';
export const FRAMES: ReadonlyArray<{ id: FrameId; label: string }> = [
  { id: 'tool', label: "The tool's frame" },
  { id: 'table', label: "The table's frame" },
];
export const STILL_FRAME: FrameId = 'table';

const RAD = Math.PI / 180;

/** The move on the table for the recorded delta read in `frame`, with the tool turned `angle` degrees. */
export function moveFor(frame: FrameId, angle: number): [number, number] {
  const [dx, dy] = DELTA_CM;
  if (frame === 'table') return [dx, dy];
  const c = Math.cos(angle * RAD);
  const s = Math.sin(angle * RAD);
  return [c * dx - s * dy, s * dx + c * dy];
}

/** Where the pen ends, in centimetres on the paper. */
export const endFor = (frame: FrameId, angle: number): [number, number] => {
  const [mx, my] = moveFor(frame, angle);
  return [START_CM[0] + mx, START_CM[1] + my];
};

/** How far the replay lands from the demonstration's stroke end, in centimetres. */
export function gapCm(frame: FrameId, angle: number): number {
  const [ax, ay] = endFor(frame, angle);
  const [bx, by] = endFor('tool', angle);
  return Math.hypot(ax - bx, ay - by);
}

/** The same gap in closed form, for the table's frame: the chord 2 × 5 × sin(angle / 2). */
export const chordCm = (angle: number) => 2 * Math.hypot(...DELTA_CM) * Math.sin((angle * RAD) / 2);

/** Whole degrees and one decimal of a centimetre, as the readout and the slider say them. */
export const wholeDegrees = (angle: number) => Math.round(angle);
export const tenthCm = (cm: number) => Math.round(cm * 10) / 10;

const frameWords = (frame: FrameId) => (frame === 'tool' ? 'tool frame' : 'table frame');

/** The readout once the move is made. Fits one line at 360 px (40 characters or fewer). */
export function readoutFor(frame: FrameId, angle: number): string {
  const gap = tenthCm(gapCm(frame, angle));
  return `${wholeDegrees(angle)} degrees · ${frameWords(frame)} · ${gap === 0 ? 'on the stroke' : `${gap} cm off`}`;
}

/** The slider's value, in words: it says every number the readout prints. */
export function valueTextFor(frame: FrameId, angle: number): string {
  const gap = tenthCm(gapCm(frame, angle));
  return `Tool turned ${wholeDegrees(angle)} degrees; read in the ${frameWords(frame)}, the replay ${
    gap === 0 ? 'lands on the stroke' : `lands ${gap} cm off the stroke`
  }`;
}

/**
 * Between replays the pen is lifted and the arm rests at the left end of its rail, beside the paper and clear
 * of both strokes, the way a plotter parks when it has finished drawing.
 */
export const PARK_CM: readonly [number, number] = [-5.75, START_CM[1]];

/** A replay: the pen goes back to the start lifted, drops and makes the move, then lifts and parks; seconds of each phase. */
export const RETURN_SECONDS = 1.1;
export const MOVE_SECONDS = 2.4;
export const PARK_SECONDS = 1.3;
export const REPLAY_SECONDS = RETURN_SECONDS + MOVE_SECONDS + PARK_SECONDS;

export type PenPose = { at: [number, number]; down: boolean; inked: number; phase: 'return' | 'move' | 'park' | 'done' };

const ease = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const toward = (a: readonly [number, number], b: readonly [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** The settled pen: the move inked all the way, the pen lifted and the arm parked. */
export const settledPen = (): PenPose => ({ at: [...PARK_CM], down: false, inked: 1, phase: 'done' });

/** The pen at time t of a replay that starts with the pen at `from` (the share of the move already inked is cleared). */
export function replayAt(frame: FrameId, angle: number, t: number, from: readonly [number, number] = PARK_CM): PenPose {
  if (t < RETURN_SECONDS) return { at: toward(from, START_CM, ease(clamp01(t / RETURN_SECONDS))), down: false, inked: 0, phase: 'return' };
  if (t < RETURN_SECONDS + MOVE_SECONDS) {
    const k = ease(clamp01((t - RETURN_SECONDS) / MOVE_SECONDS));
    return { at: toward(START_CM, endFor(frame, angle), k), down: true, inked: k, phase: 'move' };
  }
  const u = clamp01((t - RETURN_SECONDS - MOVE_SECONDS) / PARK_SECONDS);
  if (u >= 1) return settledPen();
  return { at: toward(endFor(frame, angle), PARK_CM, ease(u)), down: false, inked: 1, phase: 'park' };
}
