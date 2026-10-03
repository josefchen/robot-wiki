// SO-101 arm from its URDF (TheRobotStudio/SO-ARM100, Apache-2.0), with simplified meshes.
// The URDF is the one the playground ships; the simplified meshes are packed in public/explainers/.
// loadSO101(stage) -> arm: { root, links, joints, chain, visuals, tip, setPose, getPose, solveIK, gravityTorques, setMaterial }
import { THREE } from '../kit.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let packed = null, urdfText = null;
const gltf = new GLTFLoader();
const b64 = (b) => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
const meshCache = {};
function loadMesh(file) {
  packed ??= fetch('/explainers/so101-parts.json').then((r) => r.json());
  return (meshCache[file] ??= packed.then((d) => gltf.parseAsync(b64(d[file]), './')));
}
const v3 = (s) => s.trim().split(/\s+/).map(Number);
function applyOrigin(obj, el) {
  if (!el) return;
  const xyz = v3(el.getAttribute('xyz') || '0 0 0'), rpy = v3(el.getAttribute('rpy') || '0 0 0');
  obj.position.set(...xyz); obj.rotation.set(rpy[0], rpy[1], rpy[2], 'ZYX');
}

export const SO101_CHAIN = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper'];
export const SO101_NAMES = { shoulder_pan: 'Shoulder pan', shoulder_lift: 'Shoulder lift', elbow_flex: 'Elbow', wrist_flex: 'Wrist flex', wrist_roll: 'Wrist roll', gripper: 'Gripper' };

export async function loadSO101(stage, { pose = {} } = {}) {
  urdfText ??= fetch('/models/so101/so101.urdf').then((r) => r.text());
  const doc = new DOMParser().parseFromString(await urdfText, 'application/xml');
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; // URDF is Z-up
  const links = {}, inertial = {}, visuals = [];
  for (const l of doc.querySelectorAll('robot > link')) {
    const g = new THREE.Group(); g.name = l.getAttribute('name'); links[g.name] = g;
    const inn = l.querySelector(':scope > inertial');
    if (inn) inertial[g.name] = { mass: parseFloat(inn.querySelector('mass').getAttribute('value')), com: new THREE.Vector3(...v3(inn.querySelector('origin')?.getAttribute('xyz') || '0 0 0')) };
    for (const v of l.querySelectorAll(':scope > visual')) {
      const mesh = v.querySelector('mesh'); if (!mesh) continue;
      const file = mesh.getAttribute('filename').replace('assets/', '').replace('.glb', '');
      const holder = new THREE.Group(); applyOrigin(holder, v.querySelector('origin')); g.add(holder);
      visuals.push({ link: g.name, file, holder, isServo: (v.querySelector('material')?.getAttribute('name') || '') === 'sts3215' });
    }
  }
  const joints = {}, children = new Set();
  for (const j of doc.querySelectorAll('robot > joint')) {
    const parent = links[j.querySelector('parent').getAttribute('link')], child = links[j.querySelector('child').getAttribute('link')];
    children.add(child.name);
    const frame = new THREE.Group(); applyOrigin(frame, j.querySelector('origin'));
    const spin = new THREE.Group(); frame.add(spin); spin.add(child); parent.add(frame);
    const name = j.getAttribute('name');
    if (j.getAttribute('type') === 'revolute') {
      const lim = j.querySelector('limit');
      const J = { name, frame, spin, child: child.name, axis: new THREE.Vector3(...v3(j.querySelector('axis').getAttribute('xyz'))).normalize(),
        lower: parseFloat(lim.getAttribute('lower')), upper: parseFloat(lim.getAttribute('upper')), value: 0 };
      J.set = (v) => { J.value = Math.min(J.upper, Math.max(J.lower, v)); spin.quaternion.setFromAxisAngle(J.axis, J.value); };
      joints[name] = J;
    }
  }
  for (const n in links) if (!children.has(n)) root.add(links[n]);
  const clay = stage.mats.flat.clay, dark = stage.mats.flat.dark;
  await Promise.all(visuals.map(async (v) => {
    const g = await loadMesh(v.file);
    const m = g.scene.clone(true);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = v.isServo ? dark : clay; o.userData.base = o.material; o.userData.visual = v; } });
    v.holder.add(m); v.model = m;
  }));
  const tip = links.gripper_frame_link;
  const arm = {
    root, links, joints, visuals, tip, inertial, chain: SO101_CHAIN.filter((n) => joints[n]),
    setPose(p) { for (const k in p) joints[k]?.set(p[k]); root.updateMatrixWorld(true); },
    getPose() { const o = {}; for (const k in joints) o[k] = joints[k].value; return o; },
    tipWorld(out = new THREE.Vector3()) { root.updateMatrixWorld(true); return tip.getWorldPosition(out); },
    // Lift so the base rests on the floor. Call once after adding to the scene.
    seat() { root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root); root.position.y -= b.min.y; root.updateMatrixWorld(true); },
    // Cyclic coordinate descent on position only. Returns { reached, error } (metres).
    solveIK(target, { use = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex'], iterations = 24, tol = 0.004 } = {}) {
      const tipP = new THREE.Vector3(), jp = new THREE.Vector3(), ax = new THREE.Vector3(), q = new THREE.Quaternion();
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      let err = Infinity;
      for (let it = 0; it < iterations; it++) {
        for (let i = use.length - 1; i >= 0; i--) {
          const J = joints[use[i]];
          root.updateMatrixWorld(true);
          J.spin.getWorldPosition(jp);
          ax.copy(J.axis).applyQuaternion(J.frame.getWorldQuaternion(q));
          tip.getWorldPosition(tipP);
          a.copy(tipP).sub(jp); b.copy(target).sub(jp);
          a.addScaledVector(ax, -a.dot(ax)); b.addScaledVector(ax, -b.dot(ax));
          if (a.lengthSq() < 1e-10 || b.lengthSq() < 1e-10) continue;
          a.normalize(); b.normalize();
          const ang = Math.atan2(ax.dot(a.clone().cross(b)), a.dot(b));
          J.set(J.value + ang);
        }
        root.updateMatrixWorld(true);
        err = tip.getWorldPosition(tipP).distanceTo(target);
        if (err < tol) break;
      }
      return { reached: err < tol, error: err };
    },
    // Static holding torque (N·m) each joint must supply against gravity at the current pose.
    gravityTorques() {
      root.updateMatrixWorld(true);
      const g = new THREE.Vector3(0, -9.81, 0), out = {};
      // links downstream of each joint: walk the object tree under the joint's child link.
      for (const J of Object.values(joints)) {
        const jp = J.spin.getWorldPosition(new THREE.Vector3());
        const ax = J.axis.clone().applyQuaternion(J.frame.getWorldQuaternion(new THREE.Quaternion()));
        const tau = new THREE.Vector3();
        links[J.child].traverse((o) => {
          const I = inertial[o.name]; if (!I || !links[o.name]) return;
          const c = links[o.name].localToWorld(I.com.clone());
          tau.add(c.sub(jp).cross(g.clone().multiplyScalar(I.mass)));
        });
        out[J.name] = Math.abs(tau.dot(ax));
      }
      return out;
    },
    // Total mass carried beyond each joint (kg).
    massAfter() { const out = {}; for (const J of Object.values(joints)) { let m = 0; links[J.child].traverse((o) => { const I = inertial[o.name]; if (I && links[o.name] === o) m += I.mass; }); out[J.name] = m; } return out; },
  };
  arm.setPose(pose);
  return arm;
}
