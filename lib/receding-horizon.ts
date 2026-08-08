/**
 * Receding-horizon control math for the Diffusion Policy interactive. Pure
 * functions, unit-tested in tests/unit/receding-horizon.test.ts.
 *
 * Receding horizon (arXiv:2303.04137): the policy predicts T_p future
 * actions, executes the first T_a of them, then replans, warm-starting from
 * the previous prediction. The tail past T_a is never executed; it is the
 * part that gets revised on the next inference.
 */

/** The published Diffusion Policy configuration. */
export const DIFFUSION_POLICY_HORIZON = { tp: 16, ta: 8 } as const;

/** Policy command rate in the standard configuration (10 Hz, interpolated to 125 Hz on the UR5). */
export const CONTROL_HZ = 10;

export interface HorizonChunk {
  /** Chunk index, 0-based. */
  index: number;
  /** First control step of the chunk (when it was issued, in window steps). */
  start: number;
  /** End of the committed (executed) portion, exclusive. */
  commitEnd: number;
  /** End of the predicted portion, exclusive. May extend past the window. */
  planEnd: number;
}

/**
 * The rolling plan over a window of control steps: a new chunk is issued
 * every `ta` steps, each committing `ta` actions and predicting `tp`.
 */
export function planChunks(
  tp: number,
  ta: number,
  windowSteps: number,
): HorizonChunk[] {
  const { tp: horizon, ta: execute } = clampHorizon(tp, ta);
  const window = Math.max(1, Math.round(windowSteps));
  const chunks: HorizonChunk[] = [];
  for (let start = 0, index = 0; start < window; start += execute, index += 1) {
    chunks.push({
      index,
      start,
      commitEnd: start + execute,
      planEnd: start + horizon,
    });
  }
  return chunks;
}

/** Clamp a single horizon value to at least one step. */
function clampSteps(value: number): number {
  return Math.max(1, Math.round(value) || 1);
}

/** Replans per second: one inference per committed segment. */
export function replanRateHz(ta: number, controlHz = CONTROL_HZ): number {
  return controlHz / clampSteps(ta);
}

/** Wall-clock duration the robot commits to one plan before reacting. */
export function commitDurationS(ta: number, controlHz = CONTROL_HZ): number {
  return clampSteps(ta) / controlHz;
}

/**
 * Clamp the dial: both horizons are at least one step, and the executed
 * horizon can never exceed the predicted horizon.
 */
export function clampHorizon(
  tp: number,
  ta: number,
): { tp: number; ta: number } {
  const horizon = clampSteps(tp);
  const execute = Math.min(horizon, clampSteps(ta));
  return { tp: horizon, ta: execute };
}
