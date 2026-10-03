// Stylised humanoid proportioned on the Unitree G1: 1.32 m standing, thigh and calf 0.3 m each, and the
// joint layout of Unitree's g1_23dof.urdf (unitree_ros): per leg hip pitch, roll and yaw, knee, ankle pitch
// and roll; one waist yaw; per arm shoulder pitch, roll and yaw, elbow and wrist roll. 23 motors.
// Link masses (for the balance point) follow the same URDF. Optional three-finger hands carry 7 motors each
// (Unitree Dex3-1), drawn as small beads that are hidden until asked for.
//
// Facing +z, its left is +x, soles on y = 0.
// buildHumanoid(stage) -> { root, pelvis, torso, head, cover, battery, computer, pelvisMesh, legGroups, armGroups,
//   hands, motors: { legs, waist, arms }, handMotors, kneeMotors, pose(), com(), soles(), STAND_Y }
import { THREE, shapes } from '../kit.js';

export const G1 = { thigh: 0.30, shin: 0.30, ankle: 0.055, hipX: 0.10, hipY: -0.10, waistY: 0.054 };
const KNEE_BEND = 0.34; // standing knee bend, radians
export const STAND_Y = 2 * G1.thigh * Math.cos(KNEE_BEND / 2) + G1.ankle - G1.hipY;

// A tapered limb with rounded ends, hanging down from the origin: radius rTop at y = 0, rBot at y = -len.
export function limbGeometry(rTop, rBot, len, seg = 22) {
  const pts = [], n = 7;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(rBot * Math.cos(a), -len + rBot * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, rTop * Math.cos(a)), rTop * Math.sin(a))); }
  return new THREE.LatheGeometry(pts, seg);
}

const AXIS = { x: [0, 0, Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };
// A joint motor: a dark drum with a raised hub, its spin axis along x, y or z.
export function motorMesh(stage, r, w, axis) {
  const g = new THREE.Group();
  const body = shapes.mesh(new THREE.CylinderGeometry(r, r, w, 28), stage.mats.dark);
  const hub = shapes.mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, w + 0.01, 20), stage.mats.dark);
  g.add(body, hub);
  g.rotation.set(...AXIS[axis]);
  g.traverse((o) => { if (o.isMesh) o.userData.isMotor = true; });
  return g;
}

// Two-segment leg in its own plane: hip-to-ankle target (down h, forward f), returns [thigh, knee] angles about x.
// knee > 0 bends the knee forward (humanoid); pass kneeSign = -1 for a backward knee (dog).
export function legIK(h, f, l1, l2, kneeSign = 1) {
  const D = Math.min(Math.hypot(h, f), l1 + l2 - 1e-4);
  const c = Math.max(-1, Math.min(1, (D * D - l1 * l1 - l2 * l2) / (2 * l1 * l2)));
  const knee = kneeSign * Math.acos(c);
  const thigh = Math.atan2(-f, h) - Math.atan2(l2 * Math.sin(knee), l1 + l2 * Math.cos(knee));
  return [thigh, knee];
}

export function buildHumanoid(stage) {
  const clay = stage.mats.clay, dark = stage.mats.dark;
  const M = (geo, mat = clay) => shapes.mesh(geo, mat);
  const root = new THREE.Group(); root.name = 'humanoid';
  const pelvis = new THREE.Group(); root.add(pelvis);
  const motors = { legs: [], waist: [], arms: [] };
  const handMotors = [], kneeMotors = [], masses = [];
  const mass = (obj, p, kg) => masses.push({ obj, p: new THREE.Vector3(...p), kg });

  // Pelvis and waist.
  const pelvisMesh = M(shapes.box(0.22, 0.12, 0.14, 0.04)); pelvisMesh.position.set(0, -0.04, 0); pelvis.add(pelvisMesh);
  mass(pelvis, [0, -0.07, 0], 3.81);
  const waistMotor = motorMesh(stage, 0.058, 0.05, 'y'); waistMotor.position.set(0, G1.waistY - 0.012, 0); pelvis.add(waistMotor); motors.waist.push(waistMotor);
  mass(pelvis, [0, G1.waistY, 0], 0.24);

  // Torso: back shell, removable front cover, battery and computer inside, neck and head.
  const torso = new THREE.Group(); torso.position.set(0, G1.waistY, 0); pelvis.add(torso);
  const belly = M(shapes.box(0.17, 0.09, 0.13, 0.03)); belly.position.set(0, 0.065, -0.005); torso.add(belly);
  const shell = M(shapes.box(0.25, 0.28, 0.09, 0.03)); shell.position.set(0, 0.235, -0.04); torso.add(shell);
  const cover = M(shapes.box(0.25, 0.28, 0.085, 0.032)); cover.position.set(0, 0.235, 0.045); torso.add(cover);
  const yoke = M(shapes.box(0.33, 0.06, 0.11, 0.025)); yoke.position.set(0, 0.35, -0.01); torso.add(yoke);
  const battery = new THREE.Group(); battery.position.set(0, 0.17, 0.044); torso.add(battery);
  battery.add(M(shapes.box(0.17, 0.1, 0.06, 0.01), dark));
  const computer = new THREE.Group(); computer.position.set(0, 0.29, 0.05); torso.add(computer);
  computer.add(M(shapes.box(0.15, 0.075, 0.014, 0.004), dark));
  for (const x of [-0.035, 0.035]) { const chip = M(shapes.box(0.04, 0.04, 0.012, 0.003), clay); chip.position.set(x, 0, 0.011); computer.add(chip); }
  mass(torso, [0, 0.18, 0], 8.56);
  const neck = M(shapes.cylinder(0.032, 0.06, 20)); neck.position.set(0, 0.395, -0.01); torso.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.445, -0.005); torso.add(head);
  head.add(M(shapes.box(0.15, 0.16, 0.155, 0.065)));
  const visor = M(shapes.box(0.125, 0.07, 0.03, 0.014), dark); visor.position.set(0, 0.005, 0.068); head.add(visor);
  mass(torso, [0, 0.45, 0], 1.04);

  // Arms.
  const armGroups = [], hands = [], armJ = [];
  for (const s of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.165, 0.335, -0.01); torso.add(sh); // shoulder pitch (x)
    const mP = motorMesh(stage, 0.043, 0.05, 'x'); sh.add(mP);
    const roll = new THREE.Group(); roll.position.set(s * 0.03, -0.035, 0); sh.add(roll); // shoulder roll (z)
    const mR = motorMesh(stage, 0.036, 0.065, 'z'); roll.add(mR);
    const yaw = new THREE.Group(); yaw.position.set(0, -0.045, 0); roll.add(yaw); // shoulder yaw (y)
    const mY = motorMesh(stage, 0.042, 0.04, 'y'); mY.position.y = -0.035; yaw.add(mY);
    const upper = M(limbGeometry(0.035, 0.032, 0.19)); yaw.add(upper);
    const elbow = new THREE.Group(); elbow.position.set(0, -0.19, 0); yaw.add(elbow); // elbow (x)
    const mE = motorMesh(stage, 0.036, 0.058, 'x'); elbow.add(mE);
    const fore = M(limbGeometry(0.031, 0.027, 0.14)); elbow.add(fore);
    const wrist = new THREE.Group(); wrist.position.set(0, -0.155, 0); elbow.add(wrist); // wrist roll (y)
    const mW = motorMesh(stage, 0.028, 0.04, 'y'); mW.position.y = 0.012; wrist.add(mW);
    motors.arms.push(mP, mR, mY, mE, mW);
    const hand = buildHand(stage, s, handMotors); hand.position.y = -0.02; wrist.add(hand); hands.push(hand);
    mass(sh, [0, -0.03, 0], 1.36); mass(yaw, [0, -0.11, 0], 0.73); mass(elbow, [0, -0.08, 0], 0.6); mass(wrist, [0, -0.06, 0], 0.36);
    armGroups.push(sh); armJ.push({ s, sh, roll, yaw, elbow, wrist });
  }

  // Legs.
  const legGroups = [], legJ = [];
  for (const s of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(s * G1.hipX, G1.hipY, 0); pelvis.add(hip); // hip roll (z)
    const mR = motorMesh(stage, 0.043, 0.08, 'z'); mR.position.set(-s * 0.01, 0.03, -0.01); hip.add(mR);
    const pitch = new THREE.Group(); hip.add(pitch); // hip pitch (x)
    const mP = motorMesh(stage, 0.054, 0.05, 'x'); mP.position.set(s * 0.05, 0, 0); pitch.add(mP);
    const yaw = new THREE.Group(); pitch.add(yaw); // hip yaw (y)
    const mY = motorMesh(stage, 0.059, 0.045, 'y'); mY.position.set(0, -0.08, 0); yaw.add(mY);
    const thigh = M(limbGeometry(0.052, 0.043, 0.235)); thigh.position.y = -0.03; yaw.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -G1.thigh, 0); yaw.add(knee); // knee (x)
    const mK = motorMesh(stage, 0.05, 0.07, 'x'); knee.add(mK); kneeMotors.push(mK);
    const shin = M(limbGeometry(0.042, 0.03, 0.27)); knee.add(shin);
    // As on the G1, the two ankle motors sit high in the calf and drive the ankle through rods.
    const mA1 = motorMesh(stage, 0.03, 0.05, 'x'); mA1.position.set(0, -0.07, -0.05); knee.add(mA1);
    const mA2 = motorMesh(stage, 0.03, 0.05, 'x'); mA2.position.set(0, -0.125, -0.045); knee.add(mA2);
    for (const dx of [-0.014, 0.014]) {
      const rod = M(shapes.cylinder(0.0045, 0.18, 8), dark); rod.position.set(dx, -0.2, -0.04); rod.rotation.x = -0.06; knee.add(rod);
    }
    const ankle = new THREE.Group(); ankle.position.set(0, -G1.shin, 0); knee.add(ankle); // ankle pitch (x)
    ankle.add(M(shapes.sphere(0.027, 20)));
    const aroll = new THREE.Group(); ankle.add(aroll); // ankle roll (z)
    const foot = M(shapes.box(0.085, 0.036, 0.205, 0.015)); foot.position.set(0, -G1.ankle + 0.018, 0.03); aroll.add(foot);
    motors.legs.push(mR, mP, mY, mK, mA1, mA2);
    mass(hip, [0, 0, 0], 2.87); mass(yaw, [0, -0.15, 0], 1.7); mass(knee, [0, -0.12, 0], 1.93); mass(aroll, [0, -0.03, 0.03], 0.68);
    legGroups.push(hip); legJ.push({ s, hip, pitch, yaw, knee, ankle, aroll, foot });
  }

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), qi = new THREE.Quaternion();
  const H = {
    root, pelvis, torso, head, cover, battery, computer, pelvisMesh, waistMotor, legGroups, armGroups, hands, motors, handMotors, kneeMotors, STAND_Y,
    legs: legJ, arms: armJ,
    // Pose the body. pelvis: {x,y,z,pitch,roll}; l/r: ankle targets {x,y,z} in the root frame (y = sole lift);
    // arms: {pitch, roll, elbow}. Leg angles are solved so each foot lands on its target, sole flat.
    pose({ pelvis: P = {}, l = {}, r = {}, arms = {} } = {}) {
      const p = { x: 0, y: STAND_Y, z: 0, pitch: 0, roll: 0, ...P };
      pelvis.position.set(p.x, p.y, p.z); pelvis.rotation.set(p.pitch, 0, p.roll);
      q.setFromEuler(pelvis.rotation); qi.copy(q).invert();
      for (const L of legJ) {
        const t = { x: L.s * G1.hipX, y: 0, z: 0, ...(L.s > 0 ? l : r) };
        tmp.set(t.x, t.y + G1.ankle, t.z).sub(pelvis.position).applyQuaternion(qi).sub(L.hip.position);
        const rollA = Math.atan2(tmp.x, -tmp.y), h = Math.hypot(tmp.x, tmp.y);
        const [a1, a2] = legIK(h, tmp.z, G1.thigh, G1.shin, 1);
        L.hip.rotation.z = rollA; L.pitch.rotation.x = a1; L.knee.rotation.x = a2;
        L.ankle.rotation.x = -(p.pitch + a1 + a2); L.aroll.rotation.z = -(rollA + p.roll);
      }
      const A = { pitch: -0.05, roll: 0.12, elbow: -0.4, ...arms };
      for (const a of armJ) { a.sh.rotation.x = A.pitch; a.roll.rotation.z = a.s * A.roll; a.elbow.rotation.x = A.elbow; }
      root.updateMatrixWorld(true);
    },
    // Whole-body balance point in world space, from the link masses.
    com(out = new THREE.Vector3()) {
      root.updateMatrixWorld(true); out.set(0, 0, 0); let m = 0;
      for (const k of masses) { out.addScaledVector(k.obj.localToWorld(tmp.copy(k.p)), k.kg); m += k.kg; }
      return out.divideScalar(m);
    },
    // Each sole's four corners on the floor (world x, z) and whether it is touching the floor.
    soles() {
      root.updateMatrixWorld(true);
      return legJ.map((L) => {
        const pts = [], ys = [];
        for (const [x, z] of [[-0.0425, -0.1025], [0.0425, -0.1025], [0.0425, 0.1025], [-0.0425, 0.1025]]) {
          L.foot.localToWorld(tmp.set(x, -0.018, z)); pts.push([tmp.x, tmp.z]); ys.push(tmp.y);
        }
        return { contact: Math.max(...ys) < 0.008, pts };
      });
    },
  };
  H.pose();
  return H;
}

// Three-finger hand (thumb, index, middle), palm facing the body. Its 7 motor beads start hidden.
function buildHand(stage, s, beads) {
  const clay = stage.mats.clay;
  const hand = new THREE.Group();
  const palm = shapes.mesh(shapes.box(0.042, 0.08, 0.072, 0.016), clay); palm.position.set(0, -0.042, 0); hand.add(palm);
  const bead = (parent, y) => { const b = shapes.mesh(shapes.sphere(0.0135, 14), stage.mats.dark); b.position.y = y; b.visible = false; b.userData.isMotor = true; b.userData.handMotor = true; parent.add(b); beads.push(b); return b; };
  const finger = (parent, pos, rot, segs, n) => {
    let g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); parent.add(g);
    for (let i = 0; i < segs; i++) {
      const seg = shapes.mesh(shapes.capsule(0.0125, 0.02), clay); seg.position.y = -0.019; g.add(seg);
      if (i < n) bead(g, 0);
      const next = new THREE.Group(); next.position.y = -0.038; next.rotation.z = -s * 0.3; g.add(next); g = next;
    }
    if (n > segs) bead(g, 0);
  };
  finger(hand, [s * 0.002, -0.084, 0.019], [0, 0, -s * 0.18], 2, 2);
  finger(hand, [s * 0.002, -0.084, -0.019], [0, 0, -s * 0.18], 2, 2);
  finger(hand, [-s * 0.024, -0.03, 0.034], [-0.55, 0, -s * 0.35], 2, 3);
  return hand;
}
