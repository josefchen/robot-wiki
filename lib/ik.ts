/**
 * Damped-least-squares (DLS) Jacobian inverse kinematics and forward
 * kinematics for URDF-derived serial chains. Pure TypeScript: no three.js,
 * no DOM, so it runs in unit tests and stays trivially portable.
 *
 * The solver is Levenberg-Marquardt style: a step is only accepted when it
 * reduces the residual, and the damping factor adapts (down on acceptance,
 * up on rejection). That makes the residual monotonically non-increasing,
 * keeps motion damped near singularities, and produces honest non-zero
 * residuals for unreachable or joint-limit-locked targets instead of
 * oscillation or joint flips.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Row-major 3x3 rotation matrix. */
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface RevoluteSegment {
  kind: 'revolute';
  name: string;
  /** Fixed transform from the parent link frame to this joint frame. */
  origin: { position: Vec3; quaternion: Quat };
  /** Joint axis in the joint frame (normalized). */
  axis: Vec3;
  lower: number;
  upper: number;
}

export interface FixedSegment {
  kind: 'fixed';
  name: string;
  origin: { position: Vec3; quaternion: Quat };
}

export type ChainSegment = RevoluteSegment | FixedSegment;

/**
 * Structural view over the urdf-loader object graph. URDFRobot/URDFJoint/
 * URDFLink satisfy this shape; tests can build it from plain objects.
 */
export interface UrdfLikeNode {
  name: string;
  children: UrdfLikeNode[];
  isURDFJoint?: boolean;
  isURDFLink?: boolean;
  jointType?: string;
  axis?: Vec3;
  position: Vec3;
  quaternion: Quat;
  limit?: { lower: number; upper: number };
}

export interface FkResult {
  /** End-effector position in the robot base frame (URDF Z-up). */
  position: Vec3;
  /** End-effector orientation in the robot base frame. */
  rotation: Mat3;
}

export interface IkOptions {
  /** Convergence tolerance on the residual, meters. Default 0.5 mm. */
  tolerance?: number;
  /** Hard cap on outer LM iterations. Default 100. */
  maxIterations?: number;
  /** Per-joint step clamp per accepted iteration, radians. Default 0.3. */
  maxStep?: number;
  /** Initial damping factor. Default 1e-3. */
  lambda?: number;
}

export interface IkState {
  /** Joint angles for the chain's revolute segments, radians. */
  angles: number[];
  /** End-effector distance to target, meters. */
  residual: number;
  /** Outer LM iterations used so far. */
  iterations: number;
  converged: boolean;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Minimal 3D math (hand-rolled so this module stays dependency-free)
// ---------------------------------------------------------------------------

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function vec(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return vec(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return vec(a.x - b.x, a.y - b.y, a.z - b.z);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return vec(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

function normalize(a: Vec3): Vec3 {
  const n = norm(a);
  if (n < 1e-12) return vec(0, 0, 1);
  return vec(a.x / n, a.y / n, a.z / n);
}

function matMul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9) as number[];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out as unknown as Mat3;
}

function matVec(m: Mat3, v: Vec3): Vec3 {
  return vec(
    m[0] * v.x + m[1] * v.y + m[2] * v.z,
    m[3] * v.x + m[4] * v.y + m[5] * v.z,
    m[6] * v.x + m[7] * v.y + m[8] * v.z,
  );
}

function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

function fromQuat(q: Quat): Mat3 {
  const { x, y, z, w } = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    1 - (yy + zz),
    xy - wz,
    xz + wy,
    xy + wz,
    1 - (xx + zz),
    yz - wx,
    xz - wy,
    yz + wx,
    1 - (xx + yy),
  ];
}

function fromAxisAngle(axis: Vec3, angle: number): Mat3 {
  const { x, y, z } = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}

/** Solves A x = b for a symmetric positive-definite 3x3 A (adjugate inverse). */
function solve3x3(a: Mat3, b: Vec3): Vec3 {
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = a;
  const c00 = a11 * a22 - a12 * a21;
  const c01 = -(a10 * a22 - a12 * a20);
  const c02 = a10 * a21 - a11 * a20;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) return vec(0, 0, 0);
  // For a symmetric matrix the adjugate is the transpose of the cofactor
  // matrix; cofactors computed along the first row pattern below.
  const c10 = -(a01 * a22 - a02 * a21);
  const c11 = a00 * a22 - a02 * a20;
  const c12 = -(a00 * a21 - a01 * a20);
  const c20 = a01 * a12 - a02 * a11;
  const c21 = -(a00 * a12 - a02 * a10);
  const c22 = a00 * a11 - a01 * a10;
  const inv: Mat3 = [
    c00 / det,
    c10 / det,
    c20 / det,
    c01 / det,
    c11 / det,
    c21 / det,
    c02 / det,
    c12 / det,
    c22 / det,
  ];
  return matVec(inv, b);
}

// ---------------------------------------------------------------------------
// Chain extraction
// ---------------------------------------------------------------------------

function isJointNode(node: UrdfLikeNode): boolean {
  return node.isURDFJoint === true || typeof node.jointType === 'string';
}

function toSegment(joint: UrdfLikeNode): ChainSegment {
  // Copy fields explicitly: three.js Quaternion stores _x/_y/_z/_w behind
  // getters, so object spread does not capture the values.
  const origin = {
    position: {
      x: joint.position.x,
      y: joint.position.y,
      z: joint.position.z,
    },
    quaternion: {
      x: joint.quaternion.x,
      y: joint.quaternion.y,
      z: joint.quaternion.z,
      w: joint.quaternion.w,
    },
  };
  if (joint.jointType === 'revolute') {
    return {
      kind: 'revolute',
      name: joint.name,
      origin,
      axis: normalize(joint.axis ?? vec(0, 0, 1)),
      lower: joint.limit?.lower ?? -Math.PI,
      upper: joint.limit?.upper ?? Math.PI,
    };
  }
  return { kind: 'fixed', name: joint.name, origin };
}

/**
 * Flattens the kinematic chain from a robot root to a named end-effector
 * link into an ordered list of segments. Revolute joints become solver
 * degrees of freedom; fixed joints (like the SO-101 gripper frame) become
 * constant transforms. Returns null when the link is not in the tree.
 */
export function buildChainSpec(
  root: UrdfLikeNode,
  eeLinkName: string,
): ChainSegment[] | null {
  if (!isJointNode(root) && root.name === eeLinkName) return [];
  for (const child of root.children ?? []) {
    if (isJointNode(child)) {
      for (const linkChild of child.children ?? []) {
        const rest = buildChainSpec(linkChild, eeLinkName);
        if (rest !== null) return [toSegment(child), ...rest];
      }
    } else {
      const rest = buildChainSpec(child, eeLinkName);
      if (rest !== null) return rest;
    }
  }
  return null;
}

/** The chain's solver degrees of freedom, in base-to-tip order. */
export function revoluteJoints(chain: ChainSegment[]): RevoluteSegment[] {
  return chain.filter(
    (segment): segment is RevoluteSegment => segment.kind === 'revolute',
  );
}

// ---------------------------------------------------------------------------
// Forward kinematics + Jacobian
// ---------------------------------------------------------------------------

interface JointFrame {
  position: Vec3;
  axisWorld: Vec3;
}

interface FkDetailed {
  ee: FkResult;
  joints: JointFrame[];
}

function fkDetailed(chain: ChainSegment[], angles: number[]): FkDetailed {
  let rotation: Mat3 = IDENTITY;
  let translation = vec(0, 0, 0);
  const joints: JointFrame[] = [];
  let angleIndex = 0;

  for (const segment of chain) {
    const originRot = fromQuat(segment.origin.quaternion);
    const worldRot = matMul(rotation, originRot);
    const worldPos = add(
      translation,
      matVec(rotation, segment.origin.position),
    );

    if (segment.kind === 'revolute') {
      joints.push({
        position: worldPos,
        axisWorld: matVec(worldRot, segment.axis),
      });
      const jointRot = fromAxisAngle(segment.axis, angles[angleIndex] ?? 0);
      angleIndex += 1;
      rotation = matMul(worldRot, jointRot);
      translation = worldPos;
    } else {
      rotation = worldRot;
      translation = worldPos;
    }
  }

  return { ee: { position: translation, rotation }, joints };
}

/** Forward kinematics over the chain's revolute angles (radians). */
export function forwardKinematics(
  chain: ChainSegment[],
  angles: number[],
): FkResult {
  return fkDetailed(chain, angles).ee;
}

/**
 * Position Jacobian (3 x n): column j is the linear velocity of the
 * end-effector per unit of joint j, a_j x (p_ee - p_j).
 */
function positionJacobian(joints: JointFrame[], eePosition: Vec3): Vec3[] {
  return joints.map((joint) =>
    cross(joint.axisWorld, sub(eePosition, joint.position)),
  );
}

// ---------------------------------------------------------------------------
// DLS solver (Levenberg-Marquardt flavor)
// ---------------------------------------------------------------------------

const DEFAULT_TOLERANCE = 5e-4; // 0.5 mm
const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_MAX_STEP = 0.3; // rad per joint per accepted iteration
const DEFAULT_LAMBDA = 1e-3;
const LAMBDA_MIN = 1e-6;
const LAMBDA_MAX = 1e2;
const MAX_RETRIES_PER_STEP = 6;
const MAX_STALLS = 8;
// Deterministic singularity escape: when no damped step reduces the
// residual AND the unclamped step itself is near zero (zero Jacobian
// authority, classic at a fully stretched singular pose), nudge one joint
// a small fixed amount to break the singular configuration. Distal joints
// first. A rejected step with a substantial unclamped delta is a limit
// plateau, not a singularity, and must not trigger an escape.
const ESCAPE_STEP = 0.08;
const ESCAPE_DELTA_THRESHOLD = 1e-3;

interface SolverConfig {
  tolerance: number;
  maxIterations: number;
  maxStep: number;
  lambda: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

class DlsSolver {
  private readonly chain: ChainSegment[];
  private readonly joints: RevoluteSegment[];
  private readonly target: Vec3;
  private readonly config: SolverConfig;
  private theta: number[];
  private lambda: number;
  private iterations = 0;
  private stalls = 0;
  private escapes = 0;
  private converged = false;
  private done = false;
  private residual: number;
  // Best pose seen so far. The reported state is always the best pose, so
  // the displayed residual can never grow, even while an escape nudge
  // explores past a singularity.
  private bestTheta: number[];
  private bestResidual: number;

  constructor(
    chain: ChainSegment[],
    startAngles: number[],
    target: Vec3,
    options: IkOptions = {},
  ) {
    this.chain = chain;
    this.joints = revoluteJoints(chain);
    this.target = target;
    this.config = {
      tolerance: options.tolerance ?? DEFAULT_TOLERANCE,
      maxIterations: options.maxIterations ?? DEFAULT_MAX_ITERATIONS,
      maxStep: options.maxStep ?? DEFAULT_MAX_STEP,
      lambda: options.lambda ?? DEFAULT_LAMBDA,
    };
    this.lambda = this.config.lambda;
    this.theta = this.joints.map((joint, i) =>
      clamp(startAngles[i] ?? 0, joint.lower, joint.upper),
    );
    this.residual = this.residualAt(this.theta);
    this.bestTheta = [...this.theta];
    this.bestResidual = this.residual;
    if (this.bestResidual <= this.config.tolerance) {
      this.converged = true;
      this.done = true;
    }
  }

  private recordBest(): void {
    if (this.residual < this.bestResidual) {
      this.bestResidual = this.residual;
      this.bestTheta = [...this.theta];
    }
  }

  private residualAt(angles: number[]): number {
    const fk = forwardKinematics(this.chain, angles);
    return norm(sub(this.target, fk.position));
  }

  /** Applies a deterministic escape nudge after a stalled iteration. */
  private escape(): void {
    const n = this.joints.length;
    if (n === 0) return;
    this.escapes += 1;
    const index = n - 1 - ((this.escapes - 1) % n);
    const joint = this.joints[index];
    let bestAngle: number | null = null;
    let bestResidual = Number.POSITIVE_INFINITY;
    for (const direction of [1, -1]) {
      const candidate = clamp(
        this.theta[index] + direction * ESCAPE_STEP,
        joint.lower,
        joint.upper,
      );
      if (candidate === this.theta[index]) continue;
      const trialTheta = [...this.theta];
      trialTheta[index] = candidate;
      const residual = this.residualAt(trialTheta);
      if (residual < bestResidual) {
        bestAngle = candidate;
        bestResidual = residual;
      }
    }
    if (bestAngle !== null) {
      this.theta[index] = bestAngle;
      this.residual = bestResidual;
      this.recordBest();
    }
  }

  /** One outer LM iteration (with bounded damping retries). */
  private iterate(): void {
    const detailed = fkDetailed(this.chain, this.theta);
    const error = sub(this.target, detailed.ee.position);
    const currentResidual = norm(error);
    const columns = positionJacobian(detailed.joints, detailed.ee.position);

    let accepted = false;
    let maxAbsDelta = 0;
    for (let retry = 0; retry < MAX_RETRIES_PER_STEP; retry++) {
      // A = J J^T + lambda^2 I (3x3, symmetric positive definite)
      const a: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (const column of columns) {
        a[0] += column.x * column.x;
        a[1] += column.x * column.y;
        a[2] += column.x * column.z;
        a[3] += column.y * column.x;
        a[4] += column.y * column.y;
        a[5] += column.y * column.z;
        a[6] += column.z * column.x;
        a[7] += column.z * column.y;
        a[8] += column.z * column.z;
      }
      const damping = this.lambda * this.lambda;
      a[0] += damping;
      a[4] += damping;
      a[8] += damping;

      const x = solve3x3(a, error);
      const trial = this.theta.map((angle, i) => {
        const raw = dot(columns[i], x);
        maxAbsDelta = Math.max(maxAbsDelta, Math.abs(raw));
        const delta = clamp(raw, -this.config.maxStep, this.config.maxStep);
        return clamp(angle + delta, this.joints[i].lower, this.joints[i].upper);
      });

      const trialResidual = this.residualAt(trial);
      if (Number.isFinite(trialResidual) && trialResidual < currentResidual) {
        this.theta = trial;
        this.residual = trialResidual;
        this.recordBest();
        this.lambda = Math.max(LAMBDA_MIN, this.lambda * 0.5);
        accepted = true;
        break;
      }
      this.lambda = Math.min(LAMBDA_MAX, this.lambda * 4);
    }

    this.iterations += 1;
    if (!accepted) {
      this.stalls += 1;
      if (maxAbsDelta < ESCAPE_DELTA_THRESHOLD) {
        this.escape();
      }
    } else {
      this.stalls = 0;
    }

    if (this.bestResidual <= this.config.tolerance) {
      this.converged = true;
      this.done = true;
    } else if (
      this.iterations >= this.config.maxIterations ||
      this.stalls >= MAX_STALLS
    ) {
      this.done = true;
    }
  }

  step(count = 1): IkState {
    for (let i = 0; i < count && !this.done; i++) this.iterate();
    return this.snapshot();
  }

  snapshot(): IkState {
    return {
      angles: [...this.bestTheta],
      residual: this.bestResidual,
      iterations: this.iterations,
      converged: this.converged,
      done: this.done,
    };
  }
}

/**
 * Creates an incremental solver so the UI can step a few iterations per
 * tick and show the residual and iteration count live while the arm moves.
 */
export function createIkSolver(
  chain: ChainSegment[],
  startAngles: number[],
  target: Vec3,
  options: IkOptions = {},
): { step: (count?: number) => IkState; snapshot: () => IkState } {
  const solver = new DlsSolver(chain, startAngles, target, options);
  return {
    step: (count = 1) => solver.step(count),
    snapshot: () => solver.snapshot(),
  };
}

/** Runs a solve to completion (converged, stalled, or iteration cap). */
export function solveIk(
  chain: ChainSegment[],
  startAngles: number[],
  target: Vec3,
  options: IkOptions = {},
): IkState {
  const solver = new DlsSolver(chain, startAngles, target, options);
  let state = solver.snapshot();
  while (!state.done) state = solver.step(1);
  return state;
}

// ---------------------------------------------------------------------------
// Robot (URDF Z-up) to scene (three.js Y-up) frame conversion.
// The scene wrapper rotates the robot by -90 deg about scene X.
// ---------------------------------------------------------------------------

/** Rotation matrix for -90 deg about X: robot coords -> scene coords. */
const ROBOT_TO_SCENE: Mat3 = [1, 0, 0, 0, 0, 1, 0, -1, 0];
const SCENE_TO_ROBOT: Mat3 = transpose(ROBOT_TO_SCENE);

export function robotToScene(v: Vec3): Vec3 {
  return matVec(ROBOT_TO_SCENE, v);
}

export function sceneToRobot(v: Vec3): Vec3 {
  return matVec(SCENE_TO_ROBOT, v);
}

/** Conjugates a robot-frame rotation into the scene frame: C R C^T. */
export function robotToSceneRotation(r: Mat3): Mat3 {
  return matMul(matMul(ROBOT_TO_SCENE, r), SCENE_TO_ROBOT);
}

export interface EulerZYX {
  /** Rotation about X, radians. */
  roll: number;
  /** Rotation about Y, radians. */
  pitch: number;
  /** Rotation about Z, radians. */
  yaw: number;
}

/** Extracts ZYX Euler angles (yaw-pitch-roll) from a rotation matrix. */
export function mat3ToEulerZYX(m: Mat3): EulerZYX {
  const sp = -m[6];
  if (Math.abs(sp) >= 1 - 1e-9) {
    // Gimbal lock: collapse yaw to zero.
    return {
      roll: Math.atan2(-m[1], m[4]),
      pitch: Math.asin(clamp(sp, -1, 1)),
      yaw: 0,
    };
  }
  return {
    roll: Math.atan2(m[7], m[8]),
    pitch: Math.asin(clamp(sp, -1, 1)),
    yaw: Math.atan2(m[3], m[0]),
  };
}
