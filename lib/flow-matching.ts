/**
 * Flow-matching transport math for the pi-line interactive. Pure functions,
 * unit-tested in tests/unit/flow-matching.test.ts.
 *
 * This is an illustrative pedagogical model of the pi0 action expert's
 * inference pass, not a reimplementation of the model. Samples start as
 * Gaussian noise in a 2D action space and are transported toward two action
 * modes along near-straight paths, the rectified / optimal-transport
 * character that distinguishes flow matching from curved diffusion paths
 * (arXiv:2410.24164). The paths carry a small deterministic bend standing in
 * for the imperfection of a learned vector field, which is what makes the
 * Euler step count matter: with 1-2 steps the integration error leaves the
 * cloud visibly short of the modes; with 5-10 steps it lands on them. pi0
 * shipped 10 Euler steps; pi0.6 and pi0.7 run 5.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface FlowSample {
  /** Initial Gaussian noise point epsilon ~ N(0, I). */
  noise: Vec2;
  /** The action sample this noise is transported to. */
  target: Vec2;
  /** Index into FLOW_MODES. */
  mode: number;
  /** Quadratic Bezier control point defining the (nearly straight) path. */
  control: Vec2;
}

export interface FlowField {
  samples: FlowSample[];
}

export interface FieldArrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** The two action modes in the 2D action-space view. */
export const FLOW_MODES: ReadonlyArray<Vec2> = [
  { x: -1.35, y: -0.65 },
  { x: 1.3, y: 0.75 },
];

/** Standard deviation of a mode cluster. */
export const MODE_SPREAD = 0.28;

/** Standard deviation of the initial Gaussian noise cloud. */
export const NOISE_SPREAD = 1.0;

export const FLOW_SAMPLE_COUNT = 48;

/** Integration-step slider bounds: 1 to 50 Euler steps. */
export const MIN_STEPS = 1;
export const MAX_STEPS = 50;

/** Euler steps in the shipped configurations: pi0, then pi0.6 / pi0.7. */
export const PI0_STEPS = 10;
export const PI06_STEPS = 5;

/**
 * Bend of the learned transport path, as a fraction of the noise-to-target
 * chord. Zero would be a perfect rectified flow (exact in one Euler step);
 * a small bend stands in for the learned field's imperfection, which is what
 * the step count trades against.
 */
export const PATH_BEND = 0.22;

/** Kernel width for the marginal vector field display. */
const FIELD_KERNEL_SIGMA = 0.8;

/** mulberry32: tiny deterministic PRNG so the render is identical on reload. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller Gaussian sample from a uniform PRNG. */
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), Number.EPSILON);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clampSteps(steps: number): number {
  if (Number.isNaN(steps)) return MIN_STEPS;
  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.round(steps)));
}

/**
 * Deterministic field: `count` noise points, each paired with a target on
 * one of the action modes and a slightly bent transport path.
 */
export function generateFlowField(
  seed = 20241031,
  count = FLOW_SAMPLE_COUNT,
): FlowField {
  const rand = mulberry32(seed);
  const samples: FlowSample[] = [];
  for (let i = 0; i < count; i += 1) {
    const noise: Vec2 = {
      x: gaussian(rand) * NOISE_SPREAD,
      y: gaussian(rand) * NOISE_SPREAD,
    };
    const mode = rand() < 0.55 ? 0 : 1;
    const center = FLOW_MODES[mode];
    const target: Vec2 = {
      x: center.x + gaussian(rand) * MODE_SPREAD,
      y: center.y + gaussian(rand) * MODE_SPREAD,
    };
    const bend = rand() * 2 - 1;
    const chord = { x: target.x - noise.x, y: target.y - noise.y };
    const chordLen = Math.max(Math.hypot(chord.x, chord.y), 1e-6);
    // Unit vector perpendicular to the chord; the control point offsets the
    // path sideways by a deterministic fraction of the chord length.
    const perp = { x: -chord.y / chordLen, y: chord.x / chordLen };
    const offset = PATH_BEND * chordLen * bend;
    samples.push({
      noise,
      target,
      mode,
      control: {
        x: (noise.x + target.x) / 2 + perp.x * offset,
        y: (noise.y + target.y) / 2 + perp.y * offset,
      },
    });
  }
  return { samples };
}

/** Position on the transport path at time tau in [0, 1] (quadratic Bezier). */
export function transportPoint(sample: FlowSample, tau: number): Vec2 {
  const t = Math.min(1, Math.max(0, tau));
  const u = 1 - t;
  return {
    x:
      u * u * sample.noise.x +
      2 * t * u * sample.control.x +
      t * t * sample.target.x,
    y:
      u * u * sample.noise.y +
      2 * t * u * sample.control.y +
      t * t * sample.target.y,
  };
}

/** Velocity along the transport path at time tau (Bezier derivative). */
export function transportVelocity(sample: FlowSample, tau: number): Vec2 {
  const t = Math.min(1, Math.max(0, tau));
  return {
    x:
      2 * (1 - t) * (sample.control.x - sample.noise.x) +
      2 * t * (sample.target.x - sample.control.x),
    y:
      2 * (1 - t) * (sample.control.y - sample.noise.y) +
      2 * t * (sample.target.y - sample.control.y),
  };
}

/**
 * Forward-Euler integration of the flow with `steps` steps (clamped to
 * [MIN_STEPS, MAX_STEPS]), matching the pi0 inference loop: start from noise
 * at tau = 0 and integrate to tau = 1. Returns the polyline of steps + 1
 * points. Fewer steps cut corners on the (slightly bent) path and land
 * short of the target; that endpoint error is the pedagogical point.
 */
export function integrateFlow(sample: FlowSample, steps: number): Vec2[] {
  const k = clampSteps(steps);
  const dt = 1 / k;
  const points: Vec2[] = [{ ...sample.noise }];
  let current = { ...sample.noise };
  for (let j = 0; j < k; j += 1) {
    const v = transportVelocity(sample, j * dt);
    current = { x: current.x + dt * v.x, y: current.y + dt * v.y };
    points.push(current);
  }
  return points;
}

/** Mean distance from Euler endpoints to their assigned action targets. */
export function endpointDispersion(field: FlowField, steps: number): number {
  if (field.samples.length === 0) return 0;
  let total = 0;
  for (const sample of field.samples) {
    const points = integrateFlow(sample, steps);
    const end = points[points.length - 1];
    total += Math.hypot(end.x - sample.target.x, end.y - sample.target.y);
  }
  return total / field.samples.length;
}

/**
 * Maximum deviation of the transport path from the straight noise-to-target
 * chord, as a fraction of the chord length. Small values are the rectified /
 * OT character of flow matching: paths are nearly straight lines.
 */
export function pathCurvature(sample: FlowSample): number {
  const chord = {
    x: sample.target.x - sample.noise.x,
    y: sample.target.y - sample.noise.y,
  };
  const chordLen = Math.max(Math.hypot(chord.x, chord.y), 1e-6);
  let maxDeviation = 0;
  for (let i = 1; i < 20; i += 1) {
    const p = transportPoint(sample, i / 20);
    // Distance from p to the chord line through noise and target.
    const cross =
      chord.x * (p.y - sample.noise.y) - chord.y * (p.x - sample.noise.x);
    maxDeviation = Math.max(maxDeviation, Math.abs(cross) / chordLen);
  }
  return maxDeviation / chordLen;
}

/**
 * The marginal vector field at time tau, estimated as a kernel-weighted
 * average of the per-sample transport velocities (the same conditional-to-
 * marginal construction flow matching trains against). Rendered as a quiver
 * grid behind the sample paths.
 */
export function vectorFieldAt(
  field: FlowField,
  tau: number,
  cols: number,
  rows: number,
  xRange: { min: number; max: number } = { min: -3, max: 3 },
  yRange: { min: number; max: number } = { min: -2, max: 2 },
): FieldArrow[] {
  const arrows: FieldArrow[] = [];
  const twoSigmaSq = 2 * FIELD_KERNEL_SIGMA * FIELD_KERNEL_SIGMA;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = xRange.min + ((col + 0.5) / cols) * (xRange.max - xRange.min);
      const y = yRange.min + ((row + 0.5) / rows) * (yRange.max - yRange.min);
      let weightSum = 0;
      let vx = 0;
      let vy = 0;
      for (const sample of field.samples) {
        const p = transportPoint(sample, tau);
        const dSq = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        const w = Math.exp(-dSq / twoSigmaSq);
        const v = transportVelocity(sample, tau);
        weightSum += w;
        vx += w * v.x;
        vy += w * v.y;
      }
      if (weightSum > 1e-9) {
        arrows.push({ x, y, vx: vx / weightSum, vy: vy / weightSum });
      } else {
        arrows.push({ x, y, vx: 0, vy: 0 });
      }
    }
  }
  return arrows;
}
