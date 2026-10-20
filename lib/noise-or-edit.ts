/**
 * The truth model for NoiseOrEdit (manipulation/rl-finetuning): why
 * steering a frozen policy's noise has a ceiling that a small edit on its
 * action does not.
 *
 * A diffusion or flow policy turns a noise sample into an action. DSRL keeps
 * the pretrained policy frozen and runs RL over that noise (Wagenmaker and
 * colleagues, `dsrl-2025`). Dong and Finn give the cost: whatever noise is
 * chosen, "the result is still an action the model already knows how to
 * produce", so "if the skill a robot needs isn't already somewhere in what
 * the base model learned during pretraining, no amount of noise-searching
 * will produce the action" (`perry-dong-post-training-2026`). EXPO pairs the
 * base policy with "a lightweight edit policy that shifts actions toward
 * higher value", with edits "deliberately kept small" (`expo-2025`,
 * `perry-dong-post-training-2026`); EXPO-FT reaches 30 of 30 on every task
 * it reports, where DSRL averages 19 of 30 (`expo-ft-2026`).
 *
 * The bench draws that with one action, a peg's place along a fixture: a
 * frozen pear-shaped cam (the base policy) turns the noise dial's angle into a
 * follower's place, so every noise lands the peg between the cam's lowest
 * and highest lift, and nowhere else. The hole the task needs sits just past
 * the highest. A micrometer between the follower and the peg is the edit: a
 * short, bounded travel added to whatever the cam gives.
 *
 * Schematic: the cam, the hole and the edit's travel are illustrative, and
 * no number is printed. Lengths are in millimetres of the drawing.
 */

/**
 * The cam: a pear-shaped plate turned about its base circle's centre. Its
 * radius at an angle `phi` (degrees, from its nose) is CAM_BASE plus a nose
 * that rises smoothly to CAM_NOSE at phi = 0. The profile is convex, so a
 * flat follower always touches it at one point.
 */
export const CAM_BASE = 12;
export const CAM_NOSE = 12;
const CAM_POWER = 5;
export function camRadius(phi: number): number {
  return CAM_BASE + CAM_NOSE * ((1 + Math.cos((phi * Math.PI) / 180)) / 2) ** CAM_POWER;
}

/** The cam's outline in its own plane, as [along the nose, across it] points, every `step` degrees. */
export function camOutline(step = 4): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let phi = 0; phi < 360; phi += step) {
    const r = camRadius(phi);
    out.push([r * Math.cos((phi * Math.PI) / 180), r * Math.sin((phi * Math.PI) / 180)]);
  }
  return out;
}

/**
 * The follower's place (its face, from the cam's axis) when the dial reads
 * `deg`: the cam turned by `deg` reaches this far toward the flat follower.
 * At 0 the nose points at the follower.
 */
export function liftAt(deg: number): number {
  const turn = (deg * Math.PI) / 180;
  const reachAt = (phi: number) => camRadius(phi) * Math.cos((phi * Math.PI) / 180 + turn);
  // The farthest point of the outline toward +x: the best of every half degree, then narrowed to its peak.
  let peak = 0;
  for (let phi = 0; phi < 360; phi += 0.5) if (reachAt(phi) > reachAt(peak)) peak = phi;
  let low = peak - 0.5;
  let high = peak + 0.5;
  for (let k = 0; k < 60; k++) {
    const a = low + (high - low) / 3;
    const b = high - (high - low) / 3;
    if (reachAt(a) < reachAt(b)) low = a;
    else high = b;
  }
  return reachAt((low + high) / 2);
}

/** Every place the frozen cam can put the follower: the base policy's repertoire. */
export const LIFT_RANGE: readonly [number, number] = [CAM_BASE, CAM_BASE + CAM_NOSE];

/** The peg sits this far along from the follower's face (the rod, the slide head and the arm). */
export const PEG_OFFSET = 66;

/** The hole the task needs: just past the highest lift, out of the cam's reach. */
export const HOLE_GAP = 9;
export const HOLE_X = LIFT_RANGE[1] + PEG_OFFSET + HOLE_GAP;
/** The peg drops in when it is within this of the hole's centre. */
export const HOLE_FIT = 1.2;

/** The edit's travel: small and bounded, as EXPO keeps its edits. */
export const EDIT_MAX = 10;

/** The edit the learned edit policy settles on: the step from the cam's best place to the hole, inside its travel. */
export const LEARNED_EDIT = HOLE_GAP;

export type ModeId = 'noise' | 'edit';
export const MODES: ReadonlyArray<{ id: ModeId; label: string }> = [
  { id: 'noise', label: 'Noise only' },
  { id: 'edit', label: 'Noise and an edit' },
];

/** The dial setting RL settles on: the noise whose action lands nearest the hole (searched every degree, then every tenth). */
let best: number | null = null;
export function bestNoise(): number {
  if (best !== null) return best;
  const miss = (deg: number) => Math.abs(liftAt(deg) + PEG_OFFSET - HOLE_X);
  let found = 0;
  for (let deg = 0; deg < 360; deg++) if (miss(deg) < miss(found) - 1e-12) found = deg;
  const coarse = found;
  for (let k = -10; k <= 10; k++) {
    const deg = (coarse + k / 10 + 360) % 360;
    if (miss(deg) < miss(found) - 1e-12) found = deg;
  }
  best = found;
  return best;
}

/** Where the peg is for a dial setting and an edit. */
export const pegAt = (deg: number, edit: number) => liftAt(deg) + PEG_OFFSET + Math.min(EDIT_MAX, Math.max(-EDIT_MAX, edit));

/** Whether a peg place lies over the hole. */
export const inHole = (x: number) => Math.abs(x - HOLE_X) <= HOLE_FIT;

/** Whether a peg place lies inside what the cam alone can reach. */
export const insideRepertoire = (x: number) => x >= LIFT_RANGE[0] + PEG_OFFSET - 1e-9 && x <= LIFT_RANGE[1] + PEG_OFFSET + 1e-9;

/** The pose of the bench: the dial's angle, the edit screw's travel, and how far the peg has dropped (0 up, 1 down). */
export type Phase = 'raise' | 'search' | 'edit' | 'drop' | 'done';
export type Pose = { deg: number; edit: number; drop: number; phase: Phase };

/** What each mode settles on: the best dial setting, the learned edit or none, the peg down. */
export const settledPose = (mode: ModeId): Pose => ({ deg: bestNoise(), edit: mode === 'edit' ? LEARNED_EDIT : 0, drop: 1, phase: 'done' });

/** The still pose: steering the noise only, the dial at its best, the peg down short of the hole. */
export const STILL_MODE: ModeId = 'noise';

const ease = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

/**
 * A run: the peg rises (and any edit winds back), the dial turns once round
 * from its best setting and back to it (the search over noise, with the peg
 * passing over the strip), then, with an edit, the thimble turns, and the
 * peg drops.
 */
export const RAISE_SECONDS = 0.5;
export const SEARCH_SECONDS = 4.2;
export const EDIT_SECONDS = 1.2;
export const DROP_SECONDS = 0.7;
export const runSeconds = (mode: ModeId) => RAISE_SECONDS + SEARCH_SECONDS + (mode === 'edit' ? EDIT_SECONDS : 0) + DROP_SECONDS;

/** The bench at time t (seconds) of a run in `mode` that starts from `from`. */
export function runAt(mode: ModeId, t: number, from: Pose = settledPose(mode)): Pose {
  const home = bestNoise();
  if (t < RAISE_SECONDS) {
    const u = ease(clamp01(t / RAISE_SECONDS));
    return { deg: from.deg + (home - from.deg) * u, edit: from.edit * (1 - u), drop: from.drop * (1 - u), phase: 'raise' };
  }
  let rest = t - RAISE_SECONDS;
  if (rest < SEARCH_SECONDS) return { deg: home + 360 * ease(rest / SEARCH_SECONDS), edit: 0, drop: 0, phase: 'search' };
  rest -= SEARCH_SECONDS;
  if (mode === 'edit') {
    if (rest < EDIT_SECONDS) return { deg: home, edit: LEARNED_EDIT * ease(rest / EDIT_SECONDS), drop: 0, phase: 'edit' };
    rest -= EDIT_SECONDS;
  }
  if (rest < DROP_SECONDS) return { deg: home, edit: mode === 'edit' ? LEARNED_EDIT : 0, drop: ease(rest / DROP_SECONDS), phase: 'drop' };
  return settledPose(mode);
}

/** Switching mode: the peg rises, the edit screw turns to the mode's edit (the learned one, or back to zero), the peg drops. */
export const SWITCH_SECONDS = { raise: 0.4, edit: 0.9, drop: 0.6 } as const;
export const switchSeconds = SWITCH_SECONDS.raise + SWITCH_SECONDS.edit + SWITCH_SECONDS.drop;

/** The bench at time t (seconds) of a switch to `mode` from `from`. */
export function switchAt(mode: ModeId, t: number, from: Pose): Pose {
  const to = settledPose(mode);
  if (t < SWITCH_SECONDS.raise) {
    const u = ease(clamp01(t / SWITCH_SECONDS.raise));
    return { deg: from.deg + (to.deg - from.deg) * u, edit: from.edit, drop: from.drop * (1 - u), phase: 'raise' };
  }
  let rest = t - SWITCH_SECONDS.raise;
  if (rest < SWITCH_SECONDS.edit) return { deg: to.deg, edit: from.edit + (to.edit - from.edit) * ease(rest / SWITCH_SECONDS.edit), drop: 0, phase: 'edit' };
  rest -= SWITCH_SECONDS.edit;
  if (rest < SWITCH_SECONDS.drop) return { deg: to.deg, edit: to.edit, drop: ease(rest / SWITCH_SECONDS.drop), phase: 'drop' };
  return to;
}

/** The readout, in words, for a pose in a mode. Every line fits one line at 360 px (40 characters or fewer). */
export function readoutFor(mode: ModeId, pose: Pose): string {
  if (pose.phase === 'raise') return 'Raising the peg';
  if (pose.phase === 'search') return 'Any noise · the peg stays on the strip';
  if (pose.phase === 'edit') return mode === 'edit' ? 'Best noise · adding the small edit' : 'The edit winds back to zero';
  if (pose.phase === 'drop') return 'Lowering the peg';
  return inHole(pegAt(pose.deg, pose.edit)) ? 'Noise and an edit · peg in the hole' : 'Steered noise only · peg lands short';
}
