// Stylised robot dog, dog-sized, with 12 motors (three per leg: hip out-and-in, hip forward-and-back, knee).
// As in the MIT Cheetah family, each leg's hip and knee motors sit together at the hip and a belt drives the
// knee, so the legs stay light (Wensing et al. 2017). Knees bend backward.
//
// Facing +z, its left is +x, feet on y = 0.
// buildQuadruped(stage) -> { root, body, legs, motors, pose({ body, feet }), com(), feet(), STAND }
import { THREE, shapes } from '../kit.js';
import { limbGeometry, motorMesh, legIK } from './humanoid.js';

export const DOG = { thigh: 0.25, shank: 0.25, footR: 0.024, hipX: 0.07, hipZ: 0.27, hipY: -0.035, bodyY: 0.44, abdOff: 0.06, legOff: 0.055 };
const LAT = DOG.abdOff + DOG.legOff; // sideways offset from the hip axis to the leg plane

export function buildQuadruped(stage) {
  const clay = stage.mats.clay, dark = stage.mats.dark;
  const M = (geo, mat = clay) => shapes.mesh(geo, mat);
  const root = new THREE.Group(); root.name = 'quadruped';
  const body = new THREE.Group(); root.add(body);
  const masses = [], motors = [];
  const mass = (obj, p, kg) => masses.push({ obj, p: new THREE.Vector3(...p), kg });

  const trunk = M(shapes.box(0.25, 0.14, 0.64, 0.045)); trunk.position.set(0, 0.015, 0); body.add(trunk);
  const deck = M(shapes.box(0.17, 0.025, 0.44, 0.01)); deck.position.set(0, 0.095, -0.02); body.add(deck);
  const headG = new THREE.Group(); headG.position.set(0, 0.02, 0.35); body.add(headG);
  headG.add(M(shapes.box(0.18, 0.1, 0.09, 0.035)));
  const face = M(shapes.box(0.13, 0.045, 0.02, 0.008), dark); face.position.set(0, 0.005, 0.045); headG.add(face);
  mass(body, [0, 0.015, 0], 20); mass(body, [0, 0.02, 0.35], 1.5);

  const legs = [];
  for (const sz of [1, -1]) for (const sx of [1, -1]) {
    const abd = new THREE.Group(); abd.position.set(sx * DOG.hipX, DOG.hipY, sz * DOG.hipZ); body.add(abd); // hip out-and-in (z)
    const mA = motorMesh(stage, 0.042, 0.075, 'z'); mA.position.set(0, 0, -sz * 0.03); abd.add(mA);
    const hfe = new THREE.Group(); hfe.position.set(sx * DOG.abdOff, 0, 0); abd.add(hfe); // hip forward-and-back (x)
    const mH = motorMesh(stage, 0.05, 0.045, 'x'); hfe.add(mH);
    const mK = motorMesh(stage, 0.045, 0.035, 'x'); mK.position.x = sx * 0.04; hfe.add(mK); // knee motor, at the hip
    motors.push(mA, mH, mK);
    const leg = new THREE.Group(); leg.position.x = sx * DOG.legOff; hfe.add(leg);
    const thigh = M(limbGeometry(0.032, 0.024, 0.25)); leg.add(thigh);
    const belt = M(shapes.box(0.008, 0.23, 0.02, 0.003), dark); belt.position.set(sx * 0.03, -0.125, 0); leg.add(belt);
    const knee = new THREE.Group(); knee.position.y = -DOG.thigh; leg.add(knee); // knee (x), driven by the belt
    const pulley = M(shapes.cylinder(0.022, 0.03, 18), dark); pulley.rotation.z = Math.PI / 2; pulley.position.x = sx * 0.02; knee.add(pulley);
    const shank = M(limbGeometry(0.021, 0.014, DOG.shank)); knee.add(shank);
    const foot = M(shapes.sphere(DOG.footR, 18), dark); foot.position.y = -DOG.shank; knee.add(foot);
    mass(hfe, [0, 0, 0], 1.2); mass(leg, [0, -0.1, 0], 0.5); mass(knee, [0, -0.1, 0], 0.25);
    legs.push({ sx, sz, abd, hfe, leg, knee, foot });
  }

  const STAND = () => legs.map((L) => ({ x: L.sx * (DOG.hipX + LAT), y: 0, z: L.sz * DOG.hipZ }));
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), qi = new THREE.Quaternion();
  const Q = {
    root, body, legs, motors, STAND,
    // body: {x,y,z,pitch,roll}; feet: four {x,y,z} foot targets in the root frame (y = lift), order FL, FR, HL, HR.
    pose({ body: B = {}, feet } = {}) {
      const b = { x: 0, y: DOG.bodyY, z: 0, pitch: 0, roll: 0, ...B };
      body.position.set(b.x, b.y, b.z); body.rotation.set(b.pitch, 0, b.roll);
      q.setFromEuler(body.rotation); qi.copy(q).invert();
      const F = feet || STAND();
      legs.forEach((L, i) => {
        const t = F[i];
        tmp.set(t.x, t.y + DOG.footR, t.z).sub(body.position).applyQuaternion(qi).sub(L.abd.position);
        const r = Math.hypot(tmp.x, tmp.y), h = Math.sqrt(Math.max(1e-6, r * r - LAT * LAT));
        L.abd.rotation.z = Math.atan2(tmp.x, -tmp.y) - Math.atan2(L.sx * LAT, h);
        const [a1, a2] = legIK(h, tmp.z, DOG.thigh, DOG.shank, -1);
        L.hfe.rotation.x = a1; L.knee.rotation.x = a2;
      });
      root.updateMatrixWorld(true);
    },
    com(out = new THREE.Vector3()) {
      root.updateMatrixWorld(true); out.set(0, 0, 0); let m = 0;
      for (const k of masses) { out.addScaledVector(k.obj.localToWorld(tmp.copy(k.p)), k.kg); m += k.kg; }
      return out.divideScalar(m);
    },
    // Each foot's world position and whether it is on the floor.
    feet() {
      root.updateMatrixWorld(true);
      return legs.map((L) => { L.foot.getWorldPosition(tmp); return { contact: tmp.y < DOG.footR + 0.006, x: tmp.x, z: tmp.z }; });
    },
  };
  Q.pose();
  return Q;
}
