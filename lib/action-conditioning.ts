/**
 * Action-conditioning model for the world-models generative-video module.
 *
 * Pedagogical model of the property the 2026 world-model survey names as the
 * top open challenge (research/02, survey section 8.1): a video world model
 * should produce different futures for different candidate actions. Many
 * models are trained mostly from observation history and task intent, so
 * their predicted futures are "semantically plausible or
 * intention-consistent, but not necessarily faithful to the physical
 * consequences of the candidate action." That failure is invisible in a
 * single rollout: both a well-conditioned and a weakly-conditioned model
 * produce sharp, realistic video.
 *
 * The model below makes the distinction measurable. One shared initial
 * frame (a block on a table, a gripper above it) is rolled forward under
 * two different actions. A strongly conditioned model tracks the action:
 * push-left slides the block left, lift raises the gripper and leaves the
 * block. A weakly conditioned model predicts the same intention-consistent
 * future for every action: the block drifts toward the goal zone and the
 * gripper rises a little, because that is what successful task videos
 * usually show. Action sensitivity is the mean distance between the two
 * predicted futures; visual realism is reported separately and is
 * deliberately identical in both modes, because realism does not
 * discriminate conditioning strength.
 *
 * All functions are pure and deterministic. Unit-tested in
 * tests/unit/action-conditioning.test.ts.
 */

export type ActionId = 'push-left' | 'push-right' | 'lift';

export type Conditioning = 'strong' | 'weak';

export interface SceneState {
  /** Block horizontal position, normalized 0..1 across the table. */
  blockX: number;
  /** Gripper height above the table, normalized 0..1. */
  gripperY: number;
}

export interface ActionSpec {
  id: ActionId;
  label: string;
  description: string;
}

export const ACTIONS: readonly ActionSpec[] = [
  {
    id: 'push-left',
    label: 'Push left',
    description: 'slide the block toward the goal zone',
  },
  {
    id: 'push-right',
    label: 'Push right',
    description: 'slide the block away from the goal zone',
  },
  {
    id: 'lift',
    label: 'Lift gripper',
    description: 'raise the gripper and leave the block',
  },
];

/** The single initial frame both rollouts start from. */
export const INITIAL_STATE: SceneState = { blockX: 0.5, gripperY: 0.12 };

/**
 * Where each action physically leads under perfect action conditioning.
 * Pushes move only the block; lifting moves only the gripper.
 */
export const GROUND_TRUTH_FINAL: Record<ActionId, SceneState> = {
  'push-left': { blockX: 0.2, gripperY: 0.12 },
  'push-right': { blockX: 0.8, gripperY: 0.12 },
  lift: { blockX: 0.5, gripperY: 0.72 },
};

/**
 * The intention-consistent future a weakly conditioned model predicts for
 * every action: the block drifts toward the goal zone on the left and the
 * gripper rises a little. Plausible, realistic, and wrong for two of the
 * three actions.
 */
export const INTENT_FINAL: SceneState = { blockX: 0.3, gripperY: 0.4 };

/**
 * Effective action strength. Strong conditioning tracks the action exactly;
 * weak conditioning retains a whisper of it (4%) so the futures are near
 * zero apart rather than bit-identical.
 */
export const CONDITIONING_STRENGTH: Record<Conditioning, number> = {
  strong: 1,
  weak: 0.04,
};

/** Number of predicted frames drawn per rollout (after the initial frame). */
export const ROLLOUT_STEPS = 4;

/**
 * Stated threshold for the sensitivity score: above it the two predicted
 * futures genuinely differ, below it the model is effectively ignoring the
 * action. Anchored well below the strong-conditioning scores (roughly 0.38
 * to 0.42 for the available action pairs) and well above the weak scores
 * (roughly 0.02).
 */
export const SENSITIVITY_THRESHOLD = 0.3;

/**
 * Visual realism of the predicted frames. Intentionally constant across
 * conditioning states: a weakly conditioned model still renders sharp,
 * plausible video, which is why realism alone cannot tell the two apart.
 */
export const REALISM_SCORE = 0.91;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Euclidean distance between two scene states in normalized units. */
export function stateDistance(a: SceneState, b: SceneState): number {
  return Math.hypot(a.blockX - b.blockX, a.gripperY - b.gripperY);
}

/**
 * The final state a model predicts for an action: the action-specific
 * ground truth blended toward the intention-consistent future according to
 * the conditioning strength. Strong conditioning returns the ground truth;
 * weak conditioning returns (nearly) the intent future for every action.
 */
export function finalState(
  action: ActionId,
  conditioning: Conditioning,
): SceneState {
  const c = CONDITIONING_STRENGTH[conditioning];
  const truth = GROUND_TRUTH_FINAL[action];
  return {
    blockX: clamp01(lerp(INTENT_FINAL.blockX, truth.blockX, c)),
    gripperY: clamp01(lerp(INTENT_FINAL.gripperY, truth.gripperY, c)),
  };
}

export interface RolloutParams {
  action: ActionId;
  conditioning: Conditioning;
  /** Predicted frames after the initial one. Default ROLLOUT_STEPS. */
  steps?: number;
}

/**
 * Predicted future under one action: frame 0 is the shared initial state,
 * then a linear ramp to the model's final state. Deterministic.
 */
export function rollout(params: RolloutParams): SceneState[] {
  const steps = Math.max(
    1,
    Math.round(Number.isFinite(params.steps) ? (params.steps as number) : ROLLOUT_STEPS),
  );
  const end = finalState(params.action, params.conditioning);
  const frames: SceneState[] = new Array(steps + 1);
  frames[0] = INITIAL_STATE;
  for (let k = 1; k <= steps; k += 1) {
    const t = k / steps;
    frames[k] = {
      blockX: lerp(INITIAL_STATE.blockX, end.blockX, t),
      gripperY: lerp(INITIAL_STATE.gripperY, end.gripperY, t),
    };
  }
  return frames;
}

export interface SensitivityParams {
  actionA: ActionId;
  actionB: ActionId;
  conditioning: Conditioning;
  steps?: number;
}

/**
 * Action sensitivity: the mean per-frame distance between the predicted
 * futures of two actions from the same initial frame. High means the model
 * responds to the action; near zero means it is predicting from task intent
 * regardless of which action was issued.
 */
export function actionSensitivity(params: SensitivityParams): number {
  const framesA = rollout({
    action: params.actionA,
    conditioning: params.conditioning,
    steps: params.steps,
  });
  const framesB = rollout({
    action: params.actionB,
    conditioning: params.conditioning,
    steps: params.steps,
  });
  let total = 0;
  for (let k = 1; k < framesA.length; k += 1) {
    total += stateDistance(framesA[k], framesB[k]);
  }
  return total / (framesA.length - 1);
}

/**
 * Visual realism of the predicted frames. Independent of conditioning by
 * construction: this is the metric that looks fine even when the model
 * ignores the action.
 */
export function realismScore(conditioning: Conditioning): number {
  void conditioning;
  return REALISM_SCORE;
}
