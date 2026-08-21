/**
 * The perception error budget: how the independent error sources in a
 * calibrate-sense-detect-pose pipeline compose into one positioning error
 * at the gripper. Pure functions, unit-tested in
 * tests/unit/perception-error.test.ts.
 *
 * Three sources, composed in quadrature because they are independent and
 * zero-mean:
 *
 *   e_total = sqrt(e_handeye^2 + e_depth^2 + e_pose^2)
 *
 * 1. Hand-eye rotation. A residual rotation between the camera frame and
 *    the robot frame is an ANGLE, so what it costs in metres depends on
 *    how far away the target is: a target at range d suffers a lateral
 *    offset d * tan(theta). This is the one term that grows with working
 *    distance, and it is the module's teaching point, so it is modelled
 *    exactly. Tsai and Lenz posed the calibration that estimates theta;
 *    Zhang's planar-target method supplies the intrinsics it rides on.
 *
 * 2. Depth. Modelled as RANGE-INDEPENDENT, evaluated once at a fixed
 *    nominal standoff (NOMINAL_RANGE_M). Physically a stereo camera's
 *    depth error grows roughly with the square of range, and this model
 *    deliberately does not: the point being taught is that independent
 *    sources compose into a budget, and a second distance-dependent term
 *    would hide the hand-eye term's signature behind it. The instrument
 *    discloses the simplification in a visible label rather than burying
 *    it here.
 *
 * 3. Object pose. The residual translation error of the 6-DoF pose
 *    estimate itself, already in millimetres, so it enters directly.
 *
 * The target selector sets a FLOOR on the depth term rather than a value.
 * A depth sensor's published accuracy spec is measured against a
 * cooperative matte target; a specular or transparent surface breaks the
 * assumption the spec was measured under, and the vendor datasheets
 * publish no figure for either case. So the degraded floors here are
 * declared illustrative multiples of the published spec, not measurements,
 * and the component says so on screen.
 */

/**
 * Published Z-accuracy of the reference stereo camera, percent of range:
 * RealSense D400-series, +/- 2% at <= 2 m within 80% of the field of view
 * at HD resolution (datasheet 337029-017, table 4-15).
 */
export const PUBLISHED_DEPTH_SPEC_PCT = 2;

/**
 * The standoff the depth term is evaluated at, metres. Fixed by
 * construction: see the range-independence note in the module header.
 */
export const NOMINAL_RANGE_M = 0.5;

/**
 * Task clearance at the gripper, millimetres. Geometric, not measured: a
 * parallel-jaw gripper opening to 90 mm around a 60 mm object part leaves
 * 15 mm of lateral slack per finger before a finger lands where the part
 * is not. Twice the clearance is the marginal band, past which the
 * approach collides instead of grasping.
 */
export const CLEARANCE_MM = 15;

/**
 * The tight reference band, millimetres: the 0.5 mm insertion clearance a
 * precise assembly task holds, which is the tolerance the force-closure
 * analysis in the grasp-planning module quietly assumes somebody else
 * delivered.
 */
export const INSERTION_CLEARANCE_MM = 0.5;

export type TargetId = 'opaque' | 'specular' | 'transparent';

export interface TargetClass {
  id: TargetId;
  /** Reader-facing label. */
  label: string;
  /**
   * Multiple of the published spec used as this surface's depth-error
   * floor. Illustrative, not measured: the datasheets publish no
   * per-material accuracy figure.
   */
  specMultiple: number;
  /** What breaks on this surface, one clause, for the on-screen readout. */
  failureMode: string;
}

export const TARGET_CLASSES: readonly TargetClass[] = [
  {
    id: 'opaque',
    label: 'opaque box',
    specMultiple: 1,
    failureMode: 'matte and textured, so the sensor meets its published spec',
  },
  {
    id: 'specular',
    label: 'specular metal part',
    specMultiple: 3,
    failureMode: 'mirror-like, so the return saturates or leaves the aperture entirely',
  },
  {
    id: 'transparent',
    label: 'transparent bottle',
    specMultiple: 8,
    failureMode: 'refracts, so the sensor ranges the surface behind it',
  },
];

export function getTargetClass(id: TargetId): TargetClass {
  const found = TARGET_CLASSES.find((t) => t.id === id);
  if (!found) throw new Error(`unknown target class: ${id}`);
  return found;
}

/** The depth-error floor this surface imposes, percent of range. */
export function depthFloorPct(id: TargetId): number {
  return getTargetClass(id).specMultiple * PUBLISHED_DEPTH_SPEC_PCT;
}

export interface BudgetParams {
  /** Residual hand-eye rotation error, degrees. */
  handEyeDeg: number;
  /** Depth error the reader dials in, percent of range. */
  depthPct: number;
  /** Object-pose translation error, millimetres. */
  poseMm: number;
  /** Working distance from camera to target, metres. */
  workingDistanceM: number;
  /** Which surface the pipeline is looking at. */
  target: TargetId;
}

export const DEFAULT_PARAMS: BudgetParams = {
  handEyeDeg: 0.5,
  depthPct: PUBLISHED_DEPTH_SPEC_PCT,
  poseMm: 3,
  workingDistanceM: 0.5,
  target: 'opaque',
};

export const SLIDER_SPECS = {
  handEye: { min: 0, max: 3, step: 0.1 },
  depth: { min: 0, max: 20, step: 0.5 },
  pose: { min: 0, max: 20, step: 0.5 },
  distance: { min: 0.15, max: 1.5, step: 0.05 },
} as const;

export type Verdict = 'within' | 'marginal' | 'jam';

export interface Contribution {
  /** Stable key for test selectors and React keys. */
  key: 'handeye' | 'depth' | 'pose';
  /** Reader-facing source name. */
  label: string;
  /** This source's contribution to the budget, millimetres. */
  mm: number;
  /** Its share of the composed error's variance, 0 to 1. */
  share: number;
}

export interface Budget {
  /** The depth error actually used, percent: the slider raised to the floor. */
  effectiveDepthPct: number;
  /** True when the surface's floor, not the slider, set the depth term. */
  flooredByTarget: boolean;
  contributions: Contribution[];
  /** Composed 3D positioning error at the gripper, millimetres. */
  totalMm: number;
  verdict: Verdict;
}

const DEG_TO_RAD = Math.PI / 180;

/** Lateral offset a residual hand-eye rotation costs at a given range, mm. */
export function handEyeErrorMm(handEyeDeg: number, workingDistanceM: number): number {
  return workingDistanceM * 1000 * Math.tan(handEyeDeg * DEG_TO_RAD);
}

/** The depth term, mm. Range-independent by construction. */
export function depthErrorMm(depthPct: number): number {
  return (depthPct / 100) * NOMINAL_RANGE_M * 1000;
}

export function classifyVerdict(totalMm: number): Verdict {
  if (totalMm <= CLEARANCE_MM) return 'within';
  if (totalMm <= 2 * CLEARANCE_MM) return 'marginal';
  return 'jam';
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  within: 'within clearance',
  marginal: 'marginal',
  jam: 'will jam',
};

export function composeBudget(params: BudgetParams): Budget {
  const floor = depthFloorPct(params.target);
  const effectiveDepthPct = Math.max(params.depthPct, floor);
  const handEye = handEyeErrorMm(params.handEyeDeg, params.workingDistanceM);
  const depth = depthErrorMm(effectiveDepthPct);
  const pose = params.poseMm;
  const variance = handEye ** 2 + depth ** 2 + pose ** 2;
  const totalMm = Math.sqrt(variance);
  const share = (v: number) => (variance === 0 ? 0 : v ** 2 / variance);
  return {
    effectiveDepthPct,
    flooredByTarget: effectiveDepthPct > params.depthPct,
    contributions: [
      { key: 'handeye', label: 'hand-eye rotation', mm: handEye, share: share(handEye) },
      { key: 'depth', label: 'depth sensing', mm: depth, share: share(depth) },
      { key: 'pose', label: 'object pose', mm: pose, share: share(pose) },
    ],
    totalMm,
    verdict: classifyVerdict(totalMm),
  };
}
