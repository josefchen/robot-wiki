import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The shipped SO-101 kinematic chain, read out of the URDF the playground
 * itself loads.
 *
 * `VAL-DESIGN-013` requires the home entry to `/playground/` to carry a
 * preview "bound to the shipped model/data". Bound means derived: the
 * schematic below is drawn from `public/models/so101/so101.urdf`, the same
 * file `components/three/load-robot.ts` fetches at runtime, so a joint the
 * model gains or loses moves the drawing and the joint-limit table with it.
 * A hand-placed polyline would look similar and mean nothing.
 *
 * The projection is the zero configuration. Every joint value is zero, so
 * no pose is invented: the only geometry drawn is the link offsets and
 * fixed rotations the URDF declares.
 */

export type UrdfJoint = {
  name: string;
  type: string;
  parent: string;
  child: string;
  /** Joint-frame origin in the parent link frame, metres. */
  xyz: readonly [number, number, number];
  /** Fixed roll/pitch/yaw of the joint frame, radians. */
  rpy: readonly [number, number, number];
  lowerRad: number | null;
  upperRad: number | null;
};

const JOINT_PATTERN =
  /<joint\s+name="([^"]+)"\s+type="([^"]+)"\s*>([\s\S]*?)<\/joint>/g;

function triple(value: string, label: string): [number, number, number] {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`so101.urdf: ${label} is not three finite numbers`);
  }
  return [parts[0], parts[1], parts[2]];
}

/** Every `<joint>` the URDF declares, in document order. */
export function parseUrdfJoints(xml: string): UrdfJoint[] {
  const joints: UrdfJoint[] = [];
  for (const match of xml.matchAll(JOINT_PATTERN)) {
    const [, name, type, body] = match;
    const origin = /<origin\s+xyz="([^"]+)"\s+rpy="([^"]+)"/.exec(body);
    const parent = /<parent\s+link="([^"]+)"/.exec(body);
    const child = /<child\s+link="([^"]+)"/.exec(body);
    if (!origin || !parent || !child) {
      throw new Error(
        `so101.urdf: joint ${name} is missing an origin, parent or child`,
      );
    }
    const limit = /<limit[^>]*\slower="([^"]+)"\s+upper="([^"]+)"/.exec(body);
    joints.push({
      name,
      type,
      parent: parent[1],
      child: child[1],
      xyz: triple(origin[1], `${name} origin xyz`),
      rpy: triple(origin[2], `${name} origin rpy`),
      lowerRad: limit ? Number(limit[1]) : null,
      upperRad: limit ? Number(limit[2]) : null,
    });
  }
  if (joints.length === 0) {
    throw new Error('so101.urdf declares no joints');
  }
  return joints;
}

type Matrix3 = readonly [number, number, number, number, number, number, number, number, number];

/** URDF convention: R = Rz(yaw) Ry(pitch) Rx(roll). */
function rotation(rpy: readonly [number, number, number]): Matrix3 {
  const [roll, pitch, yaw] = rpy;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  return [
    cy * cp,
    cy * sp * sr - sy * cr,
    cy * sp * cr + sy * sr,
    sy * cp,
    sy * sp * sr + cy * cr,
    sy * sp * cr - cy * sr,
    -sp,
    cp * sr,
    cp * cr,
  ];
}

function multiply(left: Matrix3, right: Matrix3): Matrix3 {
  const out = new Array<number>(9).fill(0);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let sum = 0;
      for (let k = 0; k < 3; k += 1) {
        sum += left[row * 3 + k] * right[k * 3 + column];
      }
      out[row * 3 + column] = sum;
    }
  }
  return out as unknown as Matrix3;
}

function apply(
  matrix: Matrix3,
  vector: readonly [number, number, number],
): [number, number, number] {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
  ];
}

export type So101ChainJoint = {
  /** URDF joint name, lowercase snake_case as the model spells it. */
  name: string;
  /** The link this joint drives. */
  child: string;
  /** Joint-frame origin in the base frame at the zero configuration, metres. */
  position: readonly [number, number, number];
  /** Distance from the previous frame, millimetres. */
  segmentLengthMm: number;
  lowerDeg: number;
  upperDeg: number;
  travelDeg: number;
};

const DEG = 180 / Math.PI;

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * The revolute chain from `root`, resolved at the zero configuration.
 *
 * Each frame is the parent frame composed with the joint's fixed origin
 * translation and rotation; the joint variables are all zero, so the result
 * is the model's own home pose rather than a pose this file chose. The walk
 * follows revolute joints only, which is why the fixed `gripper_frame_joint`
 * does not appear: it is a frame, not a degree of freedom.
 */
export function so101HomeChain(
  joints: readonly UrdfJoint[],
  root = 'base_link',
): So101ChainJoint[] {
  const byParent = new Map<string, UrdfJoint[]>();
  for (const joint of joints) {
    byParent.set(joint.parent, [...(byParent.get(joint.parent) ?? []), joint]);
  }
  const chain: So101ChainJoint[] = [];
  let frame: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  let origin: [number, number, number] = [0, 0, 0];
  let link = root;
  const visited = new Set<string>([root]);
  for (;;) {
    const next = (byParent.get(link) ?? []).filter(
      (joint) => joint.type === 'revolute',
    );
    if (next.length === 0) break;
    if (next.length > 1) {
      throw new Error(
        `so101.urdf: ${link} drives ${next.length} revolute joints, so the chain is not serial`,
      );
    }
    const joint = next[0];
    if (visited.has(joint.child)) {
      throw new Error(`so101.urdf: ${joint.child} is revisited by the chain`);
    }
    if (joint.lowerRad === null || joint.upperRad === null) {
      throw new Error(`so101.urdf: revolute joint ${joint.name} has no limits`);
    }
    const translated = apply(frame, joint.xyz);
    const position: [number, number, number] = [
      origin[0] + translated[0],
      origin[1] + translated[1],
      origin[2] + translated[2],
    ];
    frame = multiply(frame, rotation(joint.rpy));
    chain.push({
      name: joint.name,
      child: joint.child,
      position,
      segmentLengthMm: round(Math.hypot(...joint.xyz) * 1000, 1),
      lowerDeg: round(joint.lowerRad * DEG, 1),
      upperDeg: round(joint.upperRad * DEG, 1),
      travelDeg: round((joint.upperRad - joint.lowerRad) * DEG, 1),
    });
    origin = position;
    visited.add(joint.child);
    link = joint.child;
  }
  if (chain.length === 0) {
    throw new Error(`so101.urdf: no revolute joint is driven by ${root}`);
  }
  return chain;
}

/**
 * The drawing surface, in the same units the rendered `viewBox` uses. Only
 * the height is fixed: the width follows the model's own proportions, so
 * the box is filled by the arm rather than by empty margin chosen to make a
 * card grid line up.
 */
export const SO101_PREVIEW_VIEW = {
  height: 150,
  padding: { top: 14, right: 18, bottom: 30, left: 18 },
} as const;

export type So101PreviewPoint = {
  /** `base` for the root frame, otherwise the joint that reaches it. */
  name: string;
  x: number;
  y: number;
};

export type So101PreviewGeometry = {
  viewBox: string;
  width: number;
  height: number;
  /** The chain polyline, base first, in view units. */
  points: So101PreviewPoint[];
  /** Ground rule, drawn through the base frame. */
  groundY: number;
  /** A 100mm rule, so the drawing states its own scale. */
  scaleBar: { x1: number; x2: number; y: number; labelMm: number };
  /** View units per metre, kept uniform so the projection stays truthful. */
  pixelsPerMetre: number;
};

const SCALE_BAR_MM = 100;

/**
 * The side view: forward (URDF `x`) across, up (URDF `z`) up.
 *
 * One scale is used on both axes, so the drawing keeps the model's real
 * proportions. The small lateral `y` offsets are dropped by the projection
 * rather than folded into the drawn lengths, which is why the schematic
 * names itself a projection wherever it is mounted.
 */
export function so101PreviewGeometry(
  chain: readonly So101ChainJoint[],
): So101PreviewGeometry {
  const frames: Array<{ name: string; x: number; z: number }> = [
    { name: 'base', x: 0, z: 0 },
    ...chain.map((joint) => ({
      name: joint.name,
      x: joint.position[0],
      z: joint.position[2],
    })),
  ];
  const xs = frames.map((frame) => frame.x);
  const zs = frames.map((frame) => frame.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const { height, padding } = SO101_PREVIEW_VIEW;
  const usableHeight = height - padding.top - padding.bottom;
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanZ = Math.max(maxZ - minZ, 1e-6);
  const pixelsPerMetre = usableHeight / spanZ;
  const drawnWidth = spanX * pixelsPerMetre;
  const width = round(padding.left + drawnWidth + padding.right, 2);
  const left = padding.left;
  const baseline = padding.top + usableHeight;
  const project = (frame: { name: string; x: number; z: number }) => ({
    name: frame.name,
    x: round(left + (frame.x - minX) * pixelsPerMetre, 2),
    y: round(baseline - (frame.z - minZ) * pixelsPerMetre, 2),
  });
  const scaleBarY = round(baseline + 16, 2);
  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    points: frames.map(project),
    groundY: baseline,
    scaleBar: {
      x1: round(left, 2),
      x2: round(left + (SCALE_BAR_MM / 1000) * pixelsPerMetre, 2),
      y: scaleBarY,
      labelMm: SCALE_BAR_MM,
    },
    pixelsPerMetre: round(pixelsPerMetre, 2),
  };
}

/**
 * The authored takeaway for the preview, derived from the chain rather than
 * written beside it. `lib/chart-descriptions.ts` pins this string and
 * `tests/e2e/chart-description-registry.spec.ts` compares it with the
 * rendered text, so a URDF change that moves a number fails a gate instead
 * of leaving a stale sentence under a redrawn schematic.
 */
export type So101DerivedFigures = {
  reachMm: number;
  wristHeightMm: number;
  widestTravelDeg: number;
  widestJoint: string;
  narrowestTravelDeg: number;
  narrowestJoint: string;
  endEffector: string;
};

/**
 * The figures the sentence quotes, named so a test can hold the preview to
 * printing these and nothing else.
 */
export function so101DerivedFigures(
  chain: readonly So101ChainJoint[],
): So101DerivedFigures {
  const last = chain[chain.length - 1];
  const wrist = chain[chain.length - 2] ?? last;
  const widest = chain.reduce((most, joint) =>
    joint.travelDeg > most.travelDeg ? joint : most,
  );
  const narrowest = chain.reduce((least, joint) =>
    joint.travelDeg < least.travelDeg ? joint : least,
  );
  return {
    reachMm: Math.round(Math.hypot(last.position[0], last.position[2]) * 1000),
    wristHeightMm: Math.round(wrist.position[2] * 1000),
    widestTravelDeg: Math.round(widest.travelDeg),
    widestJoint: widest.name,
    narrowestTravelDeg: Math.round(narrowest.travelDeg),
    narrowestJoint: narrowest.name,
    endEffector: last.child
      .replace(/_link$/, '')
      .replace(/_so101_v\d+$/, '')
      .replace(/_/g, ' '),
  };
}

export function so101PreviewDescription(
  chain: readonly So101ChainJoint[],
): string {
  const figures = so101DerivedFigures(chain);
  return `The shipped so101.urdf defines ${chain.length} revolute joints from base_link to the ${figures.endEffector}, and at the zero configuration the chain reaches ${figures.reachMm} mm from the base with the wrist ${figures.wristHeightMm} mm above it; joint travel spans ${figures.widestTravelDeg} degrees at ${figures.widestJoint} and ${figures.narrowestTravelDeg} degrees at ${figures.narrowestJoint}.`;
}

export const SO101_URDF_PATH = 'public/models/so101/so101.urdf';

/**
 * Read lazily rather than at module load: a module-level read runs on every
 * import, including from tools whose working directory is not the
 * repository root, and turns a missing file into an import-time crash far
 * from the caller that needed it.
 */
export function readSo101Urdf(root: string = process.cwd()): string {
  return readFileSync(join(root, SO101_URDF_PATH), 'utf8');
}

export type So101Preview = {
  chain: So101ChainJoint[];
  geometry: So101PreviewGeometry;
  description: string;
};

export function so101Preview(root?: string): So101Preview {
  const chain = so101HomeChain(parseUrdfJoints(readSo101Urdf(root)));
  return {
    chain,
    geometry: so101PreviewGeometry(chain),
    description: so101PreviewDescription(chain),
  };
}
