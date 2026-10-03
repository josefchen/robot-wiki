// A stylised hand with two looks:
//   'human'  a jointed mannequin hand: four fingers and a thumb, round knuckles at every joint.
//   'robot'  a LEAP-style robot hand: three fingers and a thumb, a motor block at every joint (16 in all).
// makeHand(stage) -> { root, digits, setStyle, setLittle, setPose, getPose, tipWorld, solve, knuckles, motors, sensors, ... }
//
// Local frame: the wrist is at the origin, the fingers point along +y, the palm faces +z, the thumb is on the -x side.
// Every joint turns about one local axis: 'z' swings a finger sideways, 'x' bends it toward the palm.
import { THREE, shapes, clamp } from '../kit.js';

const DIGITS = [
  { name: 'index',  x: -0.0285, y: 0.094, fan: 0.07,  r: 0.0088, len: [0.040, 0.025, 0.019] },
  { name: 'middle', x: -0.0095, y: 0.097, fan: 0.0,   r: 0.0090, len: [0.044, 0.027, 0.020] },
  { name: 'ring',   x: 0.0095,  y: 0.095, fan: -0.07, r: 0.0085, len: [0.041, 0.026, 0.020] },
  { name: 'little', x: 0.0285,  y: 0.089, fan: -0.15, r: 0.0076, len: [0.032, 0.020, 0.018] },
  { name: 'thumb',  x: -0.03,   y: 0.02,  fan: 0.7,   r: 0.0102, len: [0.040, 0.030, 0.025], thumb: true },
];
// Ways each human knuckle can move (four per finger, five for the thumb).
const HUMAN_MOVES = { finger: [2, 1, 1], thumb: [2, 2, 1] };
const LIMITS = {
  finger: [[-0.45, 0.45], [-0.3, 1.75], [0, 1.9], [0, 1.5]],
  thumb: [[-0.5, 1.1], [-0.4, 1.4], [-0.3, 1.2], [-0.3, 1.5]],
};

export function makeHand(stage) {
  const M = stage.mats;
  const root = new THREE.Group();
  const hand = new THREE.Group(); root.add(hand);
  const human = [], robot = [];   // meshes shown only in one look

  // Palm and wrist.
  // Palm: a rounded slab that narrows toward the wrist.
  const palmGeo = shapes.box(0.084, 0.098, 0.026, 0.012);
  const pos = palmGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 0.049) / 0.098; pos.setX(i, pos.getX(i) * (0.8 + 0.2 * Math.min(1, t * 1.6))); }
  const palm = shapes.mesh(palmGeo, M.clay); palm.position.set(0, 0.047, 0);
  const wrist = shapes.mesh(shapes.cylinder(0.024, 0.05, 36), M.clay); wrist.position.set(0, -0.022, 0);
  const flange = shapes.mesh(shapes.cylinder(0.03, 0.01, 36), M.dark); flange.position.set(0, -0.002, 0);
  hand.add(palm, wrist, flange);
  robot.push(flange);

  const digits = {}, knuckles = [], motors = [];
  const motorBox = (w, h, d) => shapes.mesh(shapes.box(w, h, d, Math.min(w, h, d) * 0.22), M.dark);

  for (const d of DIGITS) {
    const r = d.r, [L0, L1, L2] = d.len;
    const base = new THREE.Group();
    base.position.set(d.x, d.y, d.thumb ? 0.006 : 0.002);
    base.rotation.z = d.fan;
    if (d.thumb) base.rotation.y = 0.4;
    hand.add(base);
    const side = new THREE.Group(); base.add(side);        // joint 0: swing sideways (z)
    const flex = new THREE.Group(); side.add(flex);        // joint 1: bend at the knuckle (x)
    const mid = new THREE.Group(); mid.position.y = L0; flex.add(mid);  // joint 2
    const end = new THREE.Group(); end.position.y = L1; mid.add(end);   // joint 3
    const tip = new THREE.Object3D(); tip.position.y = L2; end.add(tip); // centre of the round fingertip
    const groups = [side, flex, mid, end], axes = ['z', 'x', 'x', 'x'];
    const lim = d.thumb ? LIMITS.thumb : LIMITS.finger;
    const joints = groups.map((g, i) => {
      const J = { g, axis: axes[i], min: lim[i][0], max: lim[i][1], value: 0 };
      J.set = (v) => { J.value = clamp(v, J.min, J.max); g.rotation[J.axis] = J.value; };
      return J;
    });

    // Human look: capsule bones, round knuckles.
    const hLinks = [
      [flex, L0, r], [mid, L1, r * 0.94], [end, L2, r * 0.9],
    ].map(([g, L, rr]) => { const m = shapes.mesh(shapes.capsule(rr, L), M.clay); m.position.y = L / 2; g.add(m); human.push(m); return m; });
    const moves = d.thumb ? HUMAN_MOVES.thumb : HUMAN_MOVES.finger;
    [flex, mid, end].forEach((g, i) => {
      const k = shapes.mesh(shapes.sphere((i === 0 ? 1.18 : 1.08) * r, 24), M.clay);
      g.add(k); human.push(k);
      knuckles.push({ mesh: k, digit: d.name, moves: moves[i] });
    });

    // Robot look: printed links, a motor at each of the four joints, a rubber-round fingertip.
    const rLinks = [[flex, L0], [mid, L1]].map(([g, L]) => {
      const m = shapes.mesh(shapes.box(r * 1.9, L * 0.62, r * 1.8, r * 0.4), M.clay); m.position.y = L / 2; g.add(m); robot.push(m); return m;
    });
    const rTip = shapes.mesh(shapes.capsule(r * 0.98, L2), M.clay); rTip.position.y = L2 / 2; end.add(rTip); robot.push(rTip);
    const mSide = motorBox(r * 2.5, r * 1.7, r * 2.3); mSide.position.set(0, -r * 0.9, 0); base.add(mSide);
    const mFlex = motorBox(r * 2.6, r * 2.0, r * 2.2); flex.add(mFlex);
    const mMid = motorBox(r * 2.4, r * 1.9, r * 2.1); mid.add(mMid);
    const mEnd = motorBox(r * 2.2, r * 1.8, r * 2.0); end.add(mEnd);
    const ms = [mSide, mFlex, mMid, mEnd];
    ms.forEach((m) => { robot.push(m); if (d.name !== 'little') motors.push({ mesh: m, digit: d.name }); });

    digits[d.name] = { def: d, base, joints, tip, groups, r, human: [...hLinks], robot: [...rLinks, rTip], motors: ms, endGroup: end, len: d.len };
  }

  // Touch sensors: a dense patch of dots over each fingertip's pad (robot look only).
  const sensors = {};
  const dotGeo = new THREE.CircleGeometry(0.00078, 6);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  for (const name of ['index', 'middle', 'ring', 'thumb']) {
    const D = digits[name], L2 = D.len[2], rr = D.r * 0.98 * 1.035;
    const pts = [];
    // Like Digit 360, the patch wraps the whole fingertip, so it feels touch from any side.
    for (let y = L2 * 0.1; y <= L2 + 1e-6; y += 0.0021)
      for (let a = -165; a <= 165; a += 15) { const t = (a * Math.PI) / 180; pts.push([new THREE.Vector3(rr * Math.sin(t), y, rr * Math.cos(t)), new THREE.Vector3(Math.sin(t), 0, Math.cos(t))]); }
    for (let lat = 14; lat <= 80; lat += 14) {       // the rounded end
      const ring = Math.max(1, Math.round(22 * Math.cos((lat * Math.PI) / 180)));
      for (let j = 0; j < ring; j++) {
        const t = (-180 + (360 * (j + 0.5)) / ring) * (Math.PI / 180), p = (lat * Math.PI) / 180;
        const n = new THREE.Vector3(Math.cos(p) * Math.sin(t), Math.sin(p), Math.cos(p) * Math.cos(t));
        pts.push([n.clone().multiplyScalar(rr).add(new THREE.Vector3(0, L2, 0)), n]);
      }
    }
    const inst = new THREE.InstancedMesh(dotGeo, dotMat, pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zf = new THREE.Vector3(0, 0, 1);
    pts.forEach(([p, n], i) => { q.setFromUnitVectors(zf, n); inst.setMatrixAt(i, m4.compose(p, q, one)); inst.setColorAt(i, new THREE.Color(1, 1, 1)); });
    D.endGroup.add(inst);
    inst.visible = false;
    sensors[name] = { inst, local: pts.map(([p]) => p), level: new Float32Array(pts.length) };
  }
  const dim = new THREE.Color(), hot = new THREE.Color(), tmp = new THREE.Color();
  const paintSensors = () => {
    dim.copy(stage.colors.sense).lerp(stage.colors.clay, 0.45); hot.copy(stage.colors.sense);
    for (const s of Object.values(sensors)) {
      for (let i = 0; i < s.level.length; i++) s.inst.setColorAt(i, tmp.copy(dim).lerp(hot, s.level[i]));
      s.inst.instanceColor.needsUpdate = true;
    }
  };
  stage.onTheme(paintSensors);

  const H = {
    root, hand, digits, knuckles, motors, sensors, style: 'human',
    setStyle(style) {
      H.style = style;
      human.forEach((m) => { m.visible = style === 'human'; });
      robot.forEach((m) => { m.visible = style === 'robot'; });
      H.setLittle(H.little || 'on');
    },
    // The little finger: 'on', 'ghost' (faded reference) or 'off'.
    setLittle(mode) {
      H.little = mode;
      const L = digits.little;
      L.base.visible = mode !== 'off';
      L.base.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.base ??= o.material;
        o.material = mode === 'ghost' ? M.ghost : o.userData.base;
        o.castShadow = mode !== 'ghost';
        if (mode === 'ghost') o.visible = human.includes(o);
        else o.visible = H.style === 'human' ? human.includes(o) : robot.includes(o);
      });
    },
    showSensors(on) { for (const s of Object.values(sensors)) s.inst.visible = on; paintSensors(); },
    // Light the dots within `radius` of a world point (k = 0..1); others fade to `rest`.
    lightSensors(worldPoint, radius, k, rest = 0) {
      root.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      for (const [name, s] of Object.entries(sensors)) {
        const mw = digits[name].endGroup.matrixWorld;
        for (let i = 0; i < s.level.length; i++) {
          if (!worldPoint) { s.level[i] = rest; continue; }
          const dd = v.copy(s.local[i]).applyMatrix4(mw).distanceTo(worldPoint);
          s.level[i] = Math.max(rest, k * clamp(1 - dd / radius, 0, 1));
        }
      }
      paintSensors();
    },
    setSensorLevel(k) { for (const s of Object.values(sensors)) s.level.fill(k); paintSensors(); },
    setPose(pose) { for (const [n, vals] of Object.entries(pose)) vals.forEach((v, i) => digits[n]?.joints[i].set(v)); },
    getPose() { return Object.fromEntries(Object.entries(digits).map(([n, D]) => [n, D.joints.map((J) => J.value)])); },
    tipWorld(name, out = new THREE.Vector3()) { root.updateMatrixWorld(true); return digits[name].tip.getWorldPosition(out); },
    // Cyclic coordinate descent: turn one joint at a time so the fingertip centre reaches `target` (world).
    solve(name, target, { iterations = 14 } = {}) {
      const D = digits[name];
      const pj = new THREE.Vector3(), pt = new THREE.Vector3(), ax = new THREE.Vector3(), q = new THREE.Quaternion(), c = new THREE.Vector3();
      const unit = { x: new THREE.Vector3(1, 0, 0), z: new THREE.Vector3(0, 0, 1) };
      root.updateMatrixWorld(true);
      for (let it = 0; it < iterations; it++) {
        for (let j = D.joints.length - 1; j >= 0; j--) {
          const J = D.joints[j];
          J.g.getWorldPosition(pj); D.tip.getWorldPosition(pt);
          ax.copy(unit[J.axis]).applyQuaternion(J.g.getWorldQuaternion(q));
          const a = pt.sub(pj).projectOnPlane(ax), b = target.clone().sub(pj).projectOnPlane(ax);
          if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) continue;
          a.normalize(); b.normalize();
          let ang = Math.acos(clamp(a.dot(b), -1, 1));
          if (c.crossVectors(a, b).dot(ax) < 0) ang = -ang;
          J.set(J.value + ang);
          D.base.updateMatrixWorld(true);
        }
      }
      return D.tip.getWorldPosition(pt).distanceTo(target);
    },
  };
  H.setStyle('human');
  return H;
}
