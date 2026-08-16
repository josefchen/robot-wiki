/**
 * Goal-latent distance planning model for the world-models JEPA module.
 *
 * Pedagogical model of how V-JEPA 2-AC plans (research/02 Part B3): a goal
 * image is encoded once into the same embedding space as the current state,
 * candidate action sequences are scored by where the learned predictor says
 * they land, the sequence whose predicted latent minimizes the distance to
 * the goal latent wins, its first action is executed, and planning repeats.
 * No pixel decoder appears anywhere in the loop; the energy being minimized
 * is a distance between embeddings.
 *
 * The model here runs in a 2-D projection of the embedding space. The
 * predictor is deliberately imperfect: the executed step carries a small
 * deterministic wobble (the world's response differs from the model's
 * prediction), and the search only approximately aligns with the true goal
 * direction, with alignment improving as the candidate budget grows. Both
 * effects are deterministic so identical inputs reproduce identical plans.
 *
 * Contraction is guaranteed: each executed step covers STEP_FRACTION of the
 * remaining distance with angular error at most pi/3, and the wobble adds at
 * most WOBBLE_GAIN of the remaining distance, so the distance shrinks by a
 * factor of at most sqrt(1 - 2*a*cos(pi/3) + a^2) + WOBBLE_GAIN ~= 0.93 < 1
 * per step at the smallest search budget and ~0.63 at the largest.
 *
 * All functions are pure and deterministic. Unit-tested in
 * tests/unit/jepa-planning.test.ts.
 */

export interface LatentPoint {
  x: number;
  y: number;
}

/** Fraction of the remaining goal distance each executed action covers. */
export const STEP_FRACTION = 0.42;

/**
 * Execution wobble as a fraction of the remaining distance: the true
 * dynamics differ from the learned predictor by this much per step.
 */
export const WOBBLE_GAIN = 0.05;

/** Candidate action sequences searched per planning step. */
export const MIN_CANDIDATES = 4;
export const MAX_CANDIDATES = 64;
export const DEFAULT_CANDIDATES = 24;

/** Half-angle of the cone the search samples directions from. */
const CONE_HALF_ANGLE = Math.PI / 3;

/** Longest plan the interactive draws. */
export const MAX_STEPS = 12;

/** Distance under which the goal latent counts as reached. */
export const GOAL_TOLERANCE = 0.03;

/** Starting latent state (the encoded current observation). */
export const INITIAL_STATE: LatentPoint = { x: 0.16, y: 0.74 };

/**
 * Goal presets. In V-JEPA 2-AC the goal is given as an image and encoded
 * once; here each preset is a fixed point in the embedding plane standing in
 * for that encoded goal image.
 */
export const GOALS: ReadonlyArray<{
  id: string;
  label: string;
  point: LatentPoint;
}> = [
  { id: 'pick', label: 'goal: pick', point: { x: 0.83, y: 0.28 } },
  { id: 'place', label: 'goal: place', point: { x: 0.62, y: 0.82 } },
];

/** Euclidean distance between two latents: the planning energy. */
export function goalDistance(a: LatentPoint, b: LatentPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampCandidates(candidateCount: number): number {
  if (!Number.isFinite(candidateCount)) return DEFAULT_CANDIDATES;
  return Math.min(
    MAX_CANDIDATES,
    Math.max(MIN_CANDIDATES, Math.round(candidateCount)),
  );
}

/**
 * Angular misalignment between the true goal direction and the best
 * candidate the search finds at a given budget. Zero at the maximum budget,
 * one full cone half-angle at the minimum budget.
 */
export function searchAlignmentError(candidateCount: number): number {
  const k = clampCandidates(candidateCount);
  const t = (MAX_CANDIDATES - k) / (MAX_CANDIDATES - MIN_CANDIDATES);
  return CONE_HALF_ANGLE * t;
}

function rotate(v: LatentPoint, theta: number): LatentPoint {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * Deterministic execution wobble for a step: fixed magnitude relative to the
 * remaining distance, direction drawn from a golden-angle sequence so
 * successive steps do not cancel each other out.
 */
function wobble(stepIndex: number, remaining: number): LatentPoint {
  const angle = 2.399963229728653 * (stepIndex + 1);
  const mag = WOBBLE_GAIN * remaining;
  return { x: mag * Math.cos(angle), y: mag * Math.sin(angle) };
}

export interface CandidateSequence {
  /** Where the predictor says this sequence lands. */
  endpoint: LatentPoint;
  /** Perpendicular offset of the midpoint, for drawing a bent two-segment path. */
  bend: number;
  /** Predicted energy: distance from the predicted endpoint to the goal latent. */
  energy: number;
}

export interface PlanStepResult {
  /** Every candidate sequence the search scored this step. */
  candidates: CandidateSequence[];
  /** Index of the energy-minimizing candidate inside `candidates`. */
  chosenIndex: number;
  /** New current latent after executing the chosen first action. */
  next: LatentPoint;
  /** Goal-embedding distance after the step. */
  distance: number;
  /** True once the distance is under GOAL_TOLERANCE. */
  reached: boolean;
}

/**
 * One model-predictive-control step in latent space. Scores
 * `candidateCount` candidate action sequences by predicted final distance to
 * the goal latent, executes the first action of the winner under the true
 * (slightly different) dynamics, and returns the new state.
 */
export function planStep(args: {
  state: LatentPoint;
  goal: LatentPoint;
  stepIndex: number;
  candidateCount: number;
}): PlanStepResult {
  const { state, goal, stepIndex } = args;
  const k = clampCandidates(args.candidateCount);
  const remaining = goalDistance(state, goal);
  const dir =
    remaining === 0
      ? { x: 0, y: 0 }
      : {
          x: (goal.x - state.x) / remaining,
          y: (goal.y - state.y) / remaining,
        };

  const alignment = searchAlignmentError(k);
  const chosenTheta = alignment * (stepIndex % 2 === 0 ? 1 : -1);
  const chosenIndex = ((stepIndex % k) + k) % k;

  // Candidate directions fill the cone outside the best achievable
  // alignment, so the designated winner is always the energy minimizer.
  // Golden-ratio spacing keeps the fan deterministic and visually even.
  const candidates: CandidateSequence[] = [];
  const span = CONE_HALF_ANGLE - alignment;
  for (let i = 0; i < k; i += 1) {
    let theta: number;
    if (i === chosenIndex) {
      theta = chosenTheta;
    } else {
      const frac = ((i + 1) * 0.6180339887498949) % 1;
      const magnitude = alignment + span * Math.min(1, frac + 1 / k);
      theta = magnitude * (i % 2 === 0 ? 1 : -1);
    }
    const step = rotate(
      {
        x: dir.x * STEP_FRACTION * remaining,
        y: dir.y * STEP_FRACTION * remaining,
      },
      theta,
    );
    const endpoint = { x: state.x + step.x, y: state.y + step.y };
    candidates.push({
      endpoint,
      bend: 0.12 * remaining * Math.sin((i + 1) * 2.0943951023931953),
      energy: goalDistance(endpoint, goal),
    });
  }

  const chosen = candidates[chosenIndex];
  const w = wobble(stepIndex, remaining);
  const next = { x: chosen.endpoint.x + w.x, y: chosen.endpoint.y + w.y };
  const distance = goalDistance(next, goal);

  return {
    candidates,
    chosenIndex,
    next,
    distance,
    reached: distance <= GOAL_TOLERANCE,
  };
}
