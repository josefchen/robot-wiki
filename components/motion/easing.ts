/**
 * Easing for the motion language.
 *
 * Every eased motion uses the single cubic curve pinned in
 * motion-tokens.json: smooth(t) = t^3 * (10(1-t)^2 + 5t(1-t) + t^2).
 * Simulation time (physics, filters, rollouts) runs linearly in model time
 * and is never eased; the timeline hands scenes raw progress for that.
 */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** The one eased-motion curve. Symmetric, flat at both ends, through (0.5, 0.5). */
export function smooth(t: number): number {
  const x = clamp01(t);
  return x ** 3 * (10 * (1 - x) ** 2 + 5 * x * (1 - x) + x ** 2);
}

/** Out and back along the same curve; used for Indicate. */
export function thereAndBack(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? smooth(2 * x) : smooth(2 - 2 * x);
}

/** Samples of smooth() for CSS linear(); stops includes both endpoints. */
export function sampleSmooth(stops: number): number[] {
  const count = Math.max(2, Math.round(stops));
  return Array.from({ length: count }, (_, i) => smooth(i / (count - 1)));
}

/** The CSS linear() easing string for smooth() with at least 20 stops. */
export function cssLinearEasing(stops = 24): string {
  return `linear(${sampleSmooth(stops)
    .map((value) => Number(value.toFixed(4)))
    .join(', ')})`;
}
