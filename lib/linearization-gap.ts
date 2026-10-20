/**
 * The linearization gap behind LinearizationGap (classical/state-estimation).
 *
 * The extended Kalman filter keeps a Gaussian belief and, to move its
 * covariance, replaces each nonlinear model by its tangent at the current
 * estimate: the Jacobians G and H (Thrun, Burgard and Fox, `thrun-2005`).
 * Joint angles enter a robot's models through sines and cosines, so the
 * model for where a one-joint arm's hand is, given its angle, is a circle;
 * its tangent at the estimate is a straight line. The two agree at the
 * estimate and part away from it: the farther the belief spreads, the more
 * the straight line misses the curve, which is why linearization holds only
 * near the estimate, and why the filter can grow overconfident where the
 * nonlinearity is strong over the region the covariance covers (McGee and
 * Schmidt, `mcgee-schmidt-1985`; Dellaert and Kaess, `dellaert-kaess-2006`).
 *
 * The model is that geometry, exactly. An angle Δ from the estimate puts the
 * hand at L(cos Δ, sin Δ) about the pivot in the estimate's frame; the
 * tangent puts it at L(1, Δ). The miss between them is
 * L·√((1 − cos Δ)² + (Δ − sin Δ)²), about LΔ²/2 for small Δ: twice the
 * spread, about four times the miss. The arm's length (50 cm) and the
 * spreads are illustrative; the miss is the geometry of that arm.
 */

/** The arm's length, centimetres (illustrative). */
export const ARM_CM = 50;
/** The spread of the belief either side of the estimate, degrees: the slider's range, step and opening value. */
export const SPREAD_RANGE: readonly [number, number] = [5, 40];
export const SPREAD_STEP = 5;
export const OPENING_SPREAD = 30;
/** One swing of the arm across the spread and back, seconds. */
export const SWING_SECONDS = 4;

const RAD = Math.PI / 180;

/** The hand, in centimetres from the pivot, at `angleDeg` from the estimate: along the estimate (x) and across it (y). */
export const handAt = (angleDeg: number): [number, number] => [ARM_CM * Math.cos(angleDeg * RAD), ARM_CM * Math.sin(angleDeg * RAD)];

/** Where the tangent at the estimate puts the hand for the same angle: one arm's length along, the arc's length across. */
export const tangentAt = (angleDeg: number): [number, number] => [ARM_CM, ARM_CM * angleDeg * RAD];

/** The straight line's miss at an angle from the estimate, centimetres: the distance between the two. */
export function missCm(angleDeg: number): number {
  const [hx, hy] = handAt(angleDeg);
  const [tx, ty] = tangentAt(angleDeg);
  return Math.hypot(hx - tx, hy - ty);
}

/** A spread inside the slider's range, on its step. */
export const clampSpread = (spreadDeg: number) =>
  Math.min(SPREAD_RANGE[1], Math.max(SPREAD_RANGE[0], Math.round(spreadDeg / SPREAD_STEP) * SPREAD_STEP));

/** The miss at the edge of a spread, one decimal of a centimetre, as the readout prints it. */
export const edgeMiss = (spreadDeg: number) => Math.round(missCm(spreadDeg) * 10) / 10;

/** The stage's words. */
export const readoutFor = (spreadDeg: number) => `Spread ${spreadDeg} degrees · ${edgeMiss(spreadDeg).toFixed(1)} cm off at the edge`;

/** The slider's value text, which says every number the readout prints. */
export const valueTextFor = (spreadDeg: number) =>
  `Spread ${spreadDeg} degrees either side of the guess; at the edge the straight line is ${edgeMiss(spreadDeg).toFixed(1)} cm off the arc`;

/**
 * The arm's angle from the estimate, `t` seconds into a swing across a spread: from the + stop down to the − stop
 * and back, eased at each end. It starts and ends at the + stop, where the still pose holds it.
 */
export function swingAt(spreadDeg: number, t: number): number {
  const u = Math.max(0, Math.min(1, t / SWING_SECONDS));
  return spreadDeg * Math.cos(u * Math.PI * 2);
}
