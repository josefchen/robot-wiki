// walker.js: a stylised four-legged walking robot (ANYmal-like proportions) for the "thousand worlds" explainer, in two forms that share one gait:
//   makeQuadruped(stage)        one detailed robot for close-ups, posed on the CPU
//   quadrupedLowPoly()          one merged low-poly geometry for thousands of instanced copies, posed in a vertex shader
// Body frame: +x forward, +y up. Legs bend with the knee behind the hip-to-foot line, and trot in diagonal pairs.
import { THREE, shapes, clamp } from '../kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const Q = {
  HIP_X: 0.24, HIP_Z: 0.17, HIP_H: 0.37, L1: 0.2, L2: 0.21, FOOT_R: 0.028,
  SPEED: 0.28, FREQ: 1.1, LIFT: 0.06,
};
Q.STRIDE = (Q.SPEED * 0.5) / Q.FREQ; // the foot stays planted: it slides back one stride while the body moves forward

// Legs: 0 front-left, 1 front-right, 2 hind-left, 3 hind-right. Diagonal pairs (0,3) and (1,2) move together.
export const legPhaseOffset = (leg) => (leg === 1 || leg === 2 ? 0.5 : 0);

// Hip and knee angles (radians about the sideways axis) for one leg at gait phase `ph` (cycles), hips at height hipH.
export function legAngles(leg, ph, hipH, out = [0, 0]) {
  const { STRIDE, LIFT, L1, L2, FOOT_R } = Q;
  const p = (((ph + legPhaseOffset(leg)) % 1) + 1) % 1;
  let fx, fy;
  if (p < 0.5) { fx = STRIDE * (0.5 - 2 * p); fy = 0; }
  else { const q = (p - 0.5) * 2; fx = STRIDE * (-0.5 + (0.5 - 0.5 * Math.cos(Math.PI * q))); fy = LIFT * Math.sin(Math.PI * q); }
  fy -= hipH - FOOT_R;
  const d = clamp(Math.hypot(fx, fy), 0.05, L1 + L2 - 0.002);
  const a = Math.atan2(fx, -fy);
  const b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const t1 = a - b, kx = L1 * Math.sin(t1), ky = -L1 * Math.cos(t1);
  out[0] = t1; out[1] = Math.atan2(fx - kx, -(fy - ky));
  return out;
}

// The same gait in GLSL, for the instanced copies.
export const GAIT_GLSL = /* glsl */`
const float Q_HIP_X = ${Q.HIP_X.toFixed(4)}, Q_HIP_Z = ${Q.HIP_Z.toFixed(4)}, Q_HIP_H = ${Q.HIP_H.toFixed(4)};
const float Q_L1 = ${Q.L1.toFixed(4)}, Q_L2 = ${Q.L2.toFixed(4)}, Q_FOOT_R = ${Q.FOOT_R.toFixed(4)};
const float Q_STRIDE = ${Q.STRIDE.toFixed(5)}, Q_LIFT = ${Q.LIFT.toFixed(4)};
vec2 legAngles(float leg, float ph, float hipH) {
  float off = abs(leg - 1.5) < 1.0 ? 0.5 : 0.0;
  float p = fract(ph + off);
  vec2 F;
  if (p < 0.5) F = vec2(Q_STRIDE * (0.5 - 2.0 * p), 0.0);
  else { float q = (p - 0.5) * 2.0; F = vec2(Q_STRIDE * (-0.5 + (0.5 - 0.5 * cos(3.14159265 * q))), Q_LIFT * sin(3.14159265 * q)); }
  F.y -= hipH - Q_FOOT_R;
  float d = clamp(length(F), 0.05, Q_L1 + Q_L2 - 0.002);
  float a = atan(F.x, -F.y);
  float b = acos(clamp((Q_L1 * Q_L1 + d * d - Q_L2 * Q_L2) / (2.0 * Q_L1 * d), -1.0, 1.0));
  float t1 = a - b;
  vec2 K = Q_L1 * vec2(sin(t1), -cos(t1));
  return vec2(t1, atan(F.x - K.x, -(F.y - K.y)));
}
`;

// One detailed robot. pose({ ph, drop, bob, roll, side, heavy, fail }) moves it; root sits on the ground.
export function makeQuadruped(stage) {
  const { HIP_X, HIP_Z, HIP_H, L1, L2, FOOT_R } = Q;
  const clay = stage.material('clay'), dark = stage.material('dark');
  const M = (geo, mat) => shapes.mesh(geo, mat);
  const root = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
  root.add(pivot); pivot.add(body);
  const torso = M(shapes.box(0.62, 0.14, 0.27, 0.045), clay); torso.position.y = HIP_H + 0.025;
  const head = M(shapes.box(0.07, 0.1, 0.2, 0.025), dark); head.position.set(0.335, HIP_H + 0.03, 0);
  const tail = M(shapes.box(0.05, 0.08, 0.17, 0.02), dark); tail.position.set(-0.325, HIP_H + 0.025, 0);
  const deck = M(shapes.box(0.3, 0.025, 0.15, 0.01), dark); deck.position.set(-0.03, HIP_H + 0.1, 0);
  body.add(torso, head, tail, deck);
  const legs = [];
  for (let leg = 0; leg < 4; leg++) {
    const hip = new THREE.Group(); hip.position.set(leg < 2 ? HIP_X : -HIP_X, HIP_H, leg % 2 === 0 ? HIP_Z : -HIP_Z);
    const motor = M(shapes.cylinder(0.05, 0.075, 28), dark); motor.rotation.x = Math.PI / 2;
    const thighG = new THREE.Group();
    const thigh = M(shapes.capsule(0.03, L1 - 0.05), clay); thigh.position.y = -L1 / 2;
    const kneeG = new THREE.Group(); kneeG.position.y = -L1;
    const knee = M(shapes.cylinder(0.036, 0.055, 24), dark); knee.rotation.x = Math.PI / 2;
    const shank = M(shapes.capsule(0.021, L2 - 0.04), clay); shank.position.y = -L2 / 2;
    const foot = M(shapes.sphere(FOOT_R, 16), dark); foot.position.y = -L2;
    kneeG.add(knee, shank, foot); thighG.add(thigh, kneeG); hip.add(motor, thighG); body.add(hip);
    legs.push({ thighG, kneeG });
  }
  const ang = [0, 0];
  const pose = ({ ph = 0, drop = 0, bob = 0, roll = 0, side = 1, heavy = 0, fail = 0 } = {}) => {
    const hipH = HIP_H - drop;
    body.position.y = bob - drop;
    for (let i = 0; i < 4; i++) { legAngles(i, ph, hipH, ang); legs[i].thighG.rotation.z = ang[0]; legs[i].kneeG.rotation.z = ang[1] - ang[0]; }
    pivot.position.z = side * 0.2; body.position.z = -side * 0.2; pivot.rotation.x = roll;
    const C = stage.colors;
    clay.color.copy(C.clay).lerp(C.dark, heavy * 0.6).lerp(C.fail, fail * 0.85);
    dark.color.copy(C.dark).lerp(C.fail, fail * 0.6);
  };
  pose();
  return { root, pose };
}

// Merged low-poly robot for instancing (indexed, so each corner is shaded once).
// Vertex attributes: aPart (0 body, 1-4 thighs, 5-8 shanks), aShade (0 clay, 1 dark).
// far = true drops the head and uses three-sided legs, for when each robot is only a few pixels tall.
export function quadrupedLowPoly({ far = false } = {}) {
  const { HIP_H, L1, L2 } = Q;
  const parts = [];
  const add = (geo, part, shade) => {
    const n = geo.attributes.position.count;
    geo.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(part), 1));
    geo.setAttribute('aShade', new THREE.Float32BufferAttribute(new Float32Array(n).fill(shade), 1));
    geo.deleteAttribute('uv');
    parts.push(geo);
  };
  const sides = far ? 3 : 4;
  add(new THREE.BoxGeometry(far ? 0.68 : 0.62, 0.14, 0.27).translate(0, HIP_H + 0.025, 0), 0, 0);
  if (!far) add(new THREE.BoxGeometry(0.07, 0.1, 0.2).translate(0.335, HIP_H + 0.03, 0), 0, 1);
  for (let leg = 0; leg < 4; leg++) {
    add(new THREE.CylinderGeometry(0.034, 0.028, L1, sides, 1, true).rotateY(Math.PI / 4).translate(0, -L1 / 2, 0), 1 + leg, 0);
    add(new THREE.CylinderGeometry(0.024, 0.018, L2, sides, 1, true).rotateY(Math.PI / 4).translate(0, -L2 / 2, 0), 5 + leg, 1);
  }
  const geo = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return geo;
}
