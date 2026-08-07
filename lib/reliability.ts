/**
 * Reliability compounding math. Powers the featured home interactive and,
 * later, the evaluation-crisis and reliability-gap modules. Pure functions,
 * unit-tested in tests/unit/reliability.test.ts.
 */

/** Clamp a probability into [0, 1]; NaN collapses to 0. */
export function clampProbability(p: number): number {
  if (Number.isNaN(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

/**
 * Probability that an episode of `steps` sequential decisions completes
 * without failure when each step succeeds independently with probability
 * `perStep`: perStep ** steps.
 */
export function compoundedSuccessRate(perStep: number, steps: number): number {
  const p = clampProbability(perStep);
  const n = Math.max(0, Math.round(steps));
  return p ** n;
}

/**
 * The compounding curve P(n) for n = 0..maxSteps (P(0) = 1). Used to draw
 * the SVG trace; monotone non-increasing for p in [0, 1].
 */
export function compoundingCurve(perStep: number, maxSteps: number): number[] {
  const p = clampProbability(perStep);
  const n = Math.max(0, Math.round(maxSteps));
  const points: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    points.push(p ** i);
  }
  return points;
}
