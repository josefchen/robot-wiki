/**
 * Appearance/physics push-test model for the world-models generative-sim
 * module.
 *
 * Pedagogical model of the module's central claim (research/02 Part B4):
 * generated content inside a real physics engine is reliable because the
 * engine, not a learned model, answers "what happens under an action". The
 * interactive stacks three layers on one scene: an appearance layer (the
 * rendered mug, standing in for a neural reconstruction or generated
 * assets), a physics-proxy layer (collision geometry, mass, friction), and a
 * simulation layer (the integrated result). The push test makes the point
 * mechanically: with only the appearance layer enabled, a push produces no
 * motion, because a renderer has no dynamics; with the physics proxy
 * enabled, the same push produces deterministic motion.
 *
 * The motion model is a one-line impulse slide: the push applies a force F
 * for a fixed contact time, giving the mug v0 = F·dt/m, and Coulomb friction
 * stops it after d = v0² / (2μg). Pushes accumulate and the mug clamps at
 * the end of the table. All functions are pure and deterministic.
 * Unit-tested in tests/unit/appearance-physics-push.test.ts.
 */

export interface LayerState {
  /** Rendered assets: the visible mug and table. */
  appearance: boolean;
  /** Collision geometry, mass, and friction: what a push acts on. */
  physics: boolean;
  /** The integrated result: motion trace and displacement. */
  simulation: boolean;
}

export interface MugState {
  /** Position along the table track in meters; 0 is the start. */
  position: number;
  /** Every push activation, effective or not. */
  attempts: number;
  /** Pushes that actually produced motion (physics layer on). */
  effectivePushes: number;
  /** Position after each effective push, starting from 0. */
  history: number[];
}

export interface PushResult {
  state: MugState;
  /** Whether the push produced motion. */
  moved: boolean;
  /** Distance traveled by this push, in meters (0 when it did not move). */
  displacement: number;
}

/** Mug mass in kg. */
export const MASS_KG = 0.3;
/** Coulomb friction coefficient between mug and table. */
export const FRICTION_MU = 0.5;
export const GRAVITY_MS2 = 9.81;
/** How long the push force is applied, in seconds. */
export const CONTACT_TIME_S = 0.1;

export const MIN_FORCE_N = 1;
export const MAX_FORCE_N = 10;
export const DEFAULT_FORCE_N = 4;

/** Length of the table track the mug can slide along, in meters. */
export const TRACK_MAX_M = 0.5;

/** Default stack: rendered scene, no physics proxy, simulation layer idle. */
export const INITIAL_LAYERS: LayerState = {
  appearance: true,
  physics: false,
  simulation: true,
};

export const INITIAL_MUG: MugState = {
  position: 0,
  attempts: 0,
  effectivePushes: 0,
  history: [0],
};

export function clampForce(forceN: number): number {
  if (!Number.isFinite(forceN)) return DEFAULT_FORCE_N;
  return Math.min(MAX_FORCE_N, Math.max(MIN_FORCE_N, forceN));
}

/**
 * Stopping distance of one push: impulse gives the mug v0 = F·dt/m and
 * friction decelerates it at μg, so d = v0² / (2μg). Unclamped; the track
 * limit is applied by applyPush.
 */
export function displacementForForce(forceN: number): number {
  const v0 = (clampForce(forceN) * CONTACT_TIME_S) / MASS_KG;
  return (v0 * v0) / (2 * FRICTION_MU * GRAVITY_MS2);
}

/**
 * One push activation. With the physics-proxy layer off, the appearance
 * layer has no dynamics and nothing moves; the attempt is still counted so
 * the UI can say honestly that the push happened and did nothing. With the
 * layer on, the mug slides by displacementForForce, clamped at the track
 * end.
 */
export function applyPush(
  mug: MugState,
  layers: LayerState,
  forceN: number,
): PushResult {
  const attempts = mug.attempts + 1;
  if (!layers.physics) {
    return {
      state: { ...mug, attempts },
      moved: false,
      displacement: 0,
    };
  }
  const remaining = TRACK_MAX_M - mug.position;
  const displacement = Math.min(displacementForForce(forceN), remaining);
  const position = mug.position + displacement;
  return {
    state: {
      position,
      attempts,
      effectivePushes: mug.effectivePushes + 1,
      history: [...mug.history, position],
    },
    moved: displacement > 0,
    displacement,
  };
}

export function setLayer(
  layers: LayerState,
  layer: keyof LayerState,
  on: boolean,
): LayerState {
  return { ...layers, [layer]: on };
}

export interface PushTestNote {
  title: string;
  body: string;
}

/**
 * The annotation that makes the push-test point explicitly, keyed only on
 * whether the physics proxy is present.
 */
export function pushTestNote(layers: LayerState): PushTestNote {
  if (layers.physics) {
    return {
      title: 'The proxy does the work',
      body: 'Collision geometry, a friction coefficient, and an integrator turn the same push into motion: the impulse gives the mug a velocity, friction dissipates it, and the mug stops after d = v²/(2μg). The generated scene inherited real dynamics from the solver, not from a learned model.',
    };
  }
  return {
    title: 'Nothing moves',
    body: 'The appearance layer renders the mug but has no answer to a push: no collision hull, no friction, no integrator. A renderer is not a simulator. This is the failure mode of appearance-only digital twins and of generative dynamics that looks right but is not causally tied to the action.',
  };
}

/** Format a distance in meters as centimeters, one decimal. */
export function formatCm(meters: number): string {
  return `${(meters * 100).toFixed(1)} cm`;
}
