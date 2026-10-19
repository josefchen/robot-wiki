/**
 * The spring press behind ImpedancePress (manipulation/action-spaces): an
 * impedance action is a target and a stiffness, and the controller turns
 * the gap between the target and the tool into a push.
 *
 * Hogan's impedance law, at rest and in one axis (Hogan 1985,
 * hogan-1985): push = stiffness × (target − tool). In free space nothing
 * holds the tool back, so it settles on the target and pushes on nothing.
 * Against a surface the tool stops on it, the target may sit past it, and
 * the push is the stiffness times how far past it sits. The damping term
 * of the full law acts only while the tool moves, so a press at rest reads
 * the spring alone.
 *
 * Units are the press's own: the target and the tool are measured in ruler
 * marks from the surface (positive past it), and the push in marks on the
 * scale's dial. The three springs, at 1, 2 and 4 dial marks per ruler mark,
 * are illustrative; no stiffness or force in newtons is claimed.
 */

export type SpringId = 'soft' | 'medium' | 'stiff';

export type Spring = {
  id: SpringId;
  /** The tab's word. */
  label: string;
  /** Dial marks of push per ruler mark of gap. */
  rate: number;
};

export const SPRINGS: readonly Spring[] = [
  { id: 'soft', label: 'Soft', rate: 1 },
  { id: 'medium', label: 'Medium', rate: 2 },
  { id: 'stiff', label: 'Stiff', rate: 4 },
];

export const springOf = (id: SpringId): Spring => SPRINGS.find((spring) => spring.id === id) ?? SPRINGS[1]!;

/** The reader's target, in ruler marks past the surface: negative is short of it, in free space. */
export const TARGET_MIN = -2;
export const TARGET_MAX = 3;
export const TARGET_STEP = 0.5;
/** The still pose: the medium spring, its target two marks past the surface. */
export const STILL_TARGET = 2;
export const STILL_SPRING: SpringId = 'medium';

/** Where the tool settles for a target: on the target in free space, on the surface once the target is past it. */
export function toolFor(target: number): number {
  return Math.min(target, 0);
}

/** The gap the spring holds: how far the target sits past the tool. */
export function gapFor(target: number): number {
  return target - toolFor(target);
}

/** The push on the surface, in dial marks: stiffness times the gap. */
export function pushFor(spring: SpringId, target: number): number {
  return springOf(spring).rate * gapFor(target);
}

/** The largest push the press can show: the stiff spring at the deepest target. */
export const PUSH_MAX = pushFor('stiff', TARGET_MAX);

const marks = (value: number) => {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${Math.abs(value) === 1 ? 'mark' : 'marks'}`;
};

const dial = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** Where the target sits, in words. */
export function targetWords(target: number): string {
  if (target < 0) return `target ${marks(-target)} short of the surface`;
  if (target === 0) return 'target on the surface';
  return `target ${marks(target)} past the surface`;
}

/** Where the target sits, short: the readout's middle. */
export function targetShort(target: number): string {
  if (target < 0) return `${marks(-target)} short`;
  if (target === 0) return 'on the surface';
  return `${marks(target)} past`;
}

/** The readout, in words, from the same model the press draws: short enough for one line on a phone. */
export function readoutFor(spring: SpringId, target: number): string {
  const name = springOf(spring).label;
  if (target <= 0) return `${name} · ${targetShort(target)} · no push`;
  return `${name} · ${targetShort(target)} · push ${dial(pushFor(spring, target))}`;
}
