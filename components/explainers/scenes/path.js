// Move 7: Finding a path. Takeaway: the robot tries random moves, keeps the safe ones,
// and grows a tree until a branch reaches the goal.
// Everything shown is computed live: a real rapidly-exploring random tree (LaValle 1998) over the
// gripper's position, with exact box-against-box collision checks, path shortcutting and corner smoothing.
import { THREE, shapes, lerp, clamp, ease, reduceMotion } from '../kit.js';
import { EXPLAINER_WORDS } from '../words.ts';

// ---------- Planning core (pure, no three.js) ----------
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// The gripper only slides (it never turns), so its collision shape is one box around its origin.
const GRIP = { min: [-0.051, -0.074, -0.025], max: [0.051, 0.064, 0.025] };
const BOUNDS = { min: [-0.62, 0.075, -0.32], max: [0.74, 0.82, 0.46] };
const STEP = 0.05;          // metres per step
const GOAL_REACH = 0.1;     // a branch this close to the goal tries a straight hop to it
const SEED = 16;            // fixed so every reader sees the same first tree
const bx = (x0, y0, z0, x1, y1, z1) => [x0, y0, z0, x1, y1, z1];
// Middle shelf, in its own frame (base centre on the floor). Open to the front (+z).
const SHELF = [
  bx(-0.18, 0, -0.13, -0.165, 0.62, 0.13), bx(0.165, 0, -0.13, 0.18, 0.62, 0.13), bx(-0.165, 0, -0.13, 0.165, 0.62, -0.115),
  bx(-0.165, 0, -0.115, 0.165, 0.03, 0.13), bx(-0.165, 0.2, -0.115, 0.165, 0.215, 0.13), bx(-0.165, 0.4, -0.115, 0.165, 0.415, 0.13), bx(-0.165, 0.605, -0.115, 0.165, 0.62, 0.13),
];
const SHELF_BOXES = [bx(-0.14, 0.215, -0.1, -0.02, 0.32, 0.04), bx(0.0, 0.03, -0.1, 0.15, 0.16, 0.06), bx(-0.1, 0.415, -0.09, 0.06, 0.47, 0.05)];
// The far shelf that holds the can, open to the front.
const FAR = [
  bx(0.40, 0, -0.14, 0.68, 0.7, -0.125), bx(0.40, 0, -0.125, 0.415, 0.7, 0.14), bx(0.665, 0, -0.125, 0.68, 0.7, 0.14),
  bx(0.415, 0, -0.125, 0.665, 0.03, 0.14), bx(0.415, 0.24, -0.125, 0.665, 0.255, 0.14), bx(0.415, 0.48, -0.125, 0.665, 0.495, 0.14), bx(0.415, 0.685, -0.125, 0.665, 0.7, 0.14),
];
const FAR_BOXES = [bx(0.45, 0.495, -0.11, 0.6, 0.59, 0.02)];
const CAN = { x: 0.54, y: 0.255, z: 0.0, r: 0.017, h: 0.065 };
const CAN_BOX = bx(CAN.x - CAN.r, CAN.y, CAN.z - CAN.r, CAN.x + CAN.r, CAN.y + CAN.h, CAN.z + CAN.r);
const START = [-0.5, 0.36, 0.06];
const GRASP = [CAN.x, CAN.y + 0.088, CAN.z];        // fingers either side of the can
const PRE = [CAN.x, CAN.y + 0.088, CAN.z + 0.085];  // just in front of it: the planner's goal; the last move is straight in
const shift = (list, sx, sz) => list.map((b) => [b[0] + sx, b[1], b[2] + sz, b[3] + sx, b[4], b[5] + sz]);
// Grow every obstacle by the gripper's box: the gripper's centre hits a box exactly when it enters the grown box.
function cspace(sx, sz) {
  const boxes = [...shift([...SHELF, ...SHELF_BOXES], sx, sz), ...FAR, ...FAR_BOXES, CAN_BOX, bx(-5, -1, -5, 5, 0, 5)];
  const C = new Float64Array(boxes.length * 6);
  boxes.forEach((b, i) => C.set([b[0] - GRIP.max[0], b[1] - GRIP.max[1], b[2] - GRIP.max[2], b[3] - GRIP.min[0], b[4] - GRIP.min[1], b[5] - GRIP.min[2]], i * 6));
  return C;
}
// Earliest contact along a straight move a->b (0..1), or 1 if the whole move is free. Slab test per box.
function firstHit(C, ax, ay, az, bx_, by, bz) {
  const o = [ax, ay, az], d = [bx_ - ax, by - ay, bz - az];
  let best = 1;
  for (let k = 0; k < C.length; k += 6) {
    let t0 = 0, t1 = 1, hit = true;
    for (let i = 0; i < 3; i++) {
      const lo = C[k + i], hi = C[k + 3 + i];
      if (Math.abs(d[i]) < 1e-12) { if (o[i] < lo || o[i] > hi) { hit = false; break; } }
      else { let ta = (lo - o[i]) / d[i], tb = (hi - o[i]) / d[i]; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { hit = false; break; } }
    }
    if (hit && t0 < best) best = t0;
  }
  return best;
}
const free = (C, a, b) => firstHit(C, a[0], a[1], a[2], b[0], b[1], b[2]) >= 1;
const MAXN = 24000;
// The rapidly-exploring random tree. Every try is recorded so the scene can replay it.
function grow(C, seed) {
  const rnd = rng(seed);
  const P = new Float32Array(MAXN * 3), parent = new Int32Array(MAXN);
  P.set(START, 0); parent[0] = -1;
  let n = 1, goal = -1, t = 0;
  const tries = [];
  const [x0, y0, z0] = BOUNDS.min, [x1, y1, z1] = BOUNDS.max;
  for (; t < 60000 && n < MAXN - 1; t++) {
    const sx = x0 + rnd() * (x1 - x0), sy = y0 + rnd() * (y1 - y0), sz = z0 + rnd() * (z1 - z0);
    let bi = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const dx = P[i * 3] - sx, dy = P[i * 3 + 1] - sy, dz = P[i * 3 + 2] - sz; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; bi = i; } }
    const d = Math.sqrt(bd), k = d > STEP ? STEP / d : 1;
    const ax = P[bi * 3], ay = P[bi * 3 + 1], az = P[bi * 3 + 2];
    const qx = ax + (sx - ax) * k, qy = ay + (sy - ay) * k, qz = az + (sz - az) * k;
    const ok = firstHit(C, ax, ay, az, qx, qy, qz) >= 1;
    tries.push({ s: [sx, sy, sz], from: bi, q: [qx, qy, qz], node: ok ? n : -1, kept: n - 1 + (ok ? 1 : 0) });
    if (!ok) continue;
    P[n * 3] = qx; P[n * 3 + 1] = qy; P[n * 3 + 2] = qz; parent[n] = bi; n++;
    const gx = PRE[0] - qx, gy = PRE[1] - qy, gz = PRE[2] - qz;
    if (gx * gx + gy * gy + gz * gz < GOAL_REACH * GOAL_REACH && firstHit(C, qx, qy, qz, ...PRE) >= 1) {
      P.set(PRE, n * 3); parent[n] = n - 1; goal = n; n++; t++; break;
    }
  }
  return { P, parent, n, tries, nTries: t, goal };
}
function branch(T) { const out = []; for (let i = T.goal; i >= 0; i = T.parent[i]) out.push([T.P[i * 3], T.P[i * 3 + 1], T.P[i * 3 + 2]]); return out.reverse(); }
// Shortcutting: from each point, jump to the furthest later point that a straight move reaches safely.
function shortcut(C, pts) {
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !free(C, pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}
// Round the corners (Chaikin), keeping a pass only if every new piece is still safe.
function roundCorners(C, pts, passes = 3) {
  let cur = pts;
  for (let it = 0; it < passes; it++) {
    const nx = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i], b = cur[i + 1];
      if (i > 0) nx.push(a.map((v, k) => v * 0.75 + b[k] * 0.25));
      if (i < cur.length - 2) nx.push(a.map((v, k) => v * 0.25 + b[k] * 0.75));
    }
    nx.push(cur[cur.length - 1]);
    let ok = true; for (let i = 0; i < nx.length - 1 && ok; i++) ok = free(C, nx[i], nx[i + 1]);
    if (!ok) break; cur = nx;
  }
  return cur;
}
const lengthOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) : 0), 0);
const fmt = (n) => n.toLocaleString('en-GB');
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

const STEP_TEXT = EXPLAINER_WORDS.path.steps;

export default {
  id: 'path',
  how: `<ul>
    <li>The tree is a real rapidly-exploring random tree, the method introduced by Steven LaValle in 1998 (<a href="https://lavalle.pl/papers/Lav98c.pdf" target="_blank" rel="noopener">"Rapidly-exploring random trees: a new tool for path planning"</a>), running in your browser. Each try picks a random point in the room and steps 5 centimetres toward it from the nearest point of the tree.</li>
    <li>Collision checks are exact: the gripper's bounding box is swept along each step and tested against every shelf board, panel and box. The first tree uses a fixed random seed so every reader sees the same one; each replan uses a new seed.</li>
    <li>The path is smoothed in two passes: shortcutting (jump straight to the furthest point that is still safe) and corner rounding, each piece re-checked for collisions. The last few centimetres into the can are a straight approach.</li>
    <li>Here the tree grows in ordinary 3D space, because this gripper only slides. A real arm grows the same kind of tree in the space of its joint angles, often 7 numbers at a time.</li>
    <li>Speed today: VAMP, a vectorised planner from Rice University, plans for the 7-joint Panda arm in a median 40 millionths of a second (25,000 plans a second) on one CPU core, using RRT-Connect, a two-tree version of this method (Thomason, Kingston and Kavraki, ICRA 2024, <a href="https://arxiv.org/abs/2309.14545" target="_blank" rel="noopener">arXiv:2309.14545</a>). The same paper notes that planners of this kind typically took hundreds of milliseconds to dozens of seconds before. Since April 2026, VAMP is available as an optional fast backend in the Open Motion Planning Library 2.0 (<a href="https://ompl.kavrakilab.org/releaseNotes.html" target="_blank" rel="noopener">OMPL release notes</a>).</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(1.0);
    const W = stage.world;
    const cam = stage.camera;
    // On a tall phone stage, look down more steeply so the room's depth fills the height.
    const tall = () => cam.aspect < 1;
    const corners = (x0, y0, z0, x1, y1, z1) => { const out = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push(new THREE.Vector3(x, y, z)); return out; };
    // The room's key pieces (start, both shelves, room above for labels).
    const roomPts = () => [...corners(START[0] - 0.06, START[1] - 0.08, START[2] - 0.05, START[0] + 0.06, START[1] + 0.16, START[2] + 0.05),
      ...corners(shelfAt.x - 0.18, 0, shelfAt.z - 0.13, shelfAt.x + 0.18, 0.62, shelfAt.z + 0.13), ...corners(0.4, 0, -0.14, 0.68, 0.76, 0.14)];
    // On a tall phone stage, look along the room from the start's end, so start, shelf and goal stack up the screen.
    const OVER = (s) => stage.fit([roomPts], tall() ? [-1, 1.05, 0.5] : [-0.28, 0.72, 1], { margin: 0.86, duration: s });
    // A higher, map-like view for the tree and paths, so it is clear which side of a shelf a path passes.
    const MAP = (s, extra = []) => stage.fit([roomPts, ...extra], tall() ? [-0.75, 2.2, 0.55] : [-0.2, 1.05, 0.85], { margin: 0.86, duration: s });
    const BLOCKING = { x: 0.02, z: 0.22 };

    // ----- The room -----
    const clay = stage.mats.clay;
    const boxMesh = (b, mat, r) => {
      const w = b[3] - b[0], h = b[4] - b[1], d = b[5] - b[2];
      const m = shapes.mesh(shapes.box(w, h, d, r ?? Math.min(w, h, d) * 0.3), mat);
      m.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
      return m;
    };
    const shelf = new THREE.Group();
    SHELF.forEach((b) => shelf.add(boxMesh(b, clay)));
    SHELF_BOXES.forEach((b) => shelf.add(boxMesh(b, clay, 0.008)));
    const far = new THREE.Group();
    FAR.forEach((b) => far.add(boxMesh(b, clay)));
    FAR_BOXES.forEach((b) => far.add(boxMesh(b, clay, 0.008)));
    const can = shapes.mesh(shapes.cylinder(CAN.r, CAN.h, 28), stage.mats.dark);
    can.position.set(CAN.x, CAN.y + CAN.h / 2, CAN.z);
    W.add(shelf, far, can);
    let shelfAt = { x: 0, z: 0 };
    let C = cspace(0, 0);

    // ----- The gripper: wrist, flange, palm and two parallel fingers -----
    const makeGripper = (ghost) => {
      const g = new THREE.Group();
      const body = ghost ? stage.mats.ref : clay, dark = ghost ? stage.mats.ref : stage.mats.dark;
      const opt = { cast: !ghost, receive: !ghost };
      const wrist = shapes.mesh(shapes.cylinder(0.018, 0.03, 24), body, opt); wrist.position.y = 0.0485;
      const flange = shapes.mesh(shapes.cylinder(0.024, 0.016, 28), dark, opt); flange.position.y = 0.0255;
      const palm = shapes.mesh(shapes.box(0.1, 0.035, 0.044, 0.008), body, opt);
      const fingers = [-1, 1].map((s) => {
        const f = new THREE.Group();
        const link = shapes.mesh(shapes.box(0.012, 0.056, 0.03, 0.004), body, opt); link.position.y = -0.0455;
        const pad = shapes.mesh(shapes.box(0.004, 0.03, 0.024, 0.0015), dark, opt); pad.position.set(-s * 0.0075, -0.058, 0);
        f.add(link, pad); f.position.x = s * 0.032; f.userData.s = s; g.add(f); return f;
      });
      g.add(wrist, flange, palm);
      g.setOpen = (t) => fingers.forEach((f) => { f.position.x = f.userData.s * lerp(0.0265, 0.032, t); });
      if (ghost) g.traverse((o) => { if (o.isMesh) o.renderOrder = 3; });
      return g;
    };
    const gripper = makeGripper(false); gripper.position.set(...START); W.add(gripper);
    const ghost = makeGripper(true); ghost.position.set(...GRASP); W.add(ghost);

    // ----- Drawing helpers -----
    // A material whose role (colour meaning) can change, and stays right when the theme changes.
    const roleMat = (role, opts) => { const m = stage.material(role, opts); m.userData.role = role; stage.onTheme(() => m.color.copy(stage.colors[m.userData.role])); m.setRole = (r) => { m.userData.role = r; m.color.copy(stage.colors[r]); }; return m; };
    const tubeOf = (pts, r = 0.0042) => {
      const path = new THREE.CurvePath();
      for (let i = 0; i < pts.length - 1; i++) if (pts[i].distanceTo(pts[i + 1]) > 1e-6) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
      const L = Math.max(0.01, path.getLength());
      return new THREE.TubeGeometry(path, Math.max(12, Math.round(L * 220)), r, 8, false);
    };
    const tubeMesh = (role) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), roleMat(role)); m.castShadow = true; m.visible = false; W.add(m); return m; };
    const setTube = (m, pts, r) => { m.geometry.dispose(); m.geometry = tubeOf(pts, r); m.visible = true; };
    const reveal = (m, k) => { const n = m.geometry.index.count; m.geometry.setDrawRange(0, Math.round((n / 6) * clamp(k, 0, 1)) * 6); };
    const straight = tubeMesh('focus');
    const straightRest = shapes.line(stage, [V(START), V(GRASP)], 'ref', { dashed: true }); straightRest.visible = false; W.add(straightRest);
    const rawPath = tubeMesh('focus');
    const smooth = tubeMesh('focus');
    const oldPath = shapes.line(stage, [V(START), V(START)], 'fail', { dashed: true }); oldPath.visible = false; W.add(oldPath);

    // The tree: one growing buffer of line segments, drawn thin in the reference grey.
    const treePos = new Float32Array(MAXN * 6);
    const treeGeo = new THREE.BufferGeometry();
    treeGeo.setAttribute('position', new THREE.BufferAttribute(treePos, 3));
    treeGeo.setDrawRange(0, 0);
    // Each branch is drawn darker the more of the tree hangs off it, so the trunks stand out from the twigs.
    const treeCol = new Float32Array(MAXN * 8).fill(1);
    const colAttr = new THREE.BufferAttribute(treeCol, 4);
    treeGeo.setAttribute('color', colAttr);
    const TREE_OPACITY = 0.9;
    const treeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, opacity: TREE_OPACITY });
    const treeColor = () => treeMat.color.copy(stage.colors.ref); treeColor(); stage.onTheme(treeColor);
    const tree = new THREE.LineSegments(treeGeo, treeMat); tree.frustumCulled = false; W.add(tree);
    let T = null;
    const loadTree = (t) => {
      T = t;
      for (let i = 1; i < t.n; i++) { const p = t.parent[i]; treePos.set([t.P[p * 3], t.P[p * 3 + 1], t.P[p * 3 + 2], t.P[i * 3], t.P[i * 3 + 1], t.P[i * 3 + 2]], (i - 1) * 6); }
      const pa = treeGeo.attributes.position; pa.clearUpdateRanges(); pa.addUpdateRange(0, t.n * 6); pa.needsUpdate = true;
    };
    const sub = new Int32Array(MAXN);
    const showEdges = (k) => {
      treeGeo.setDrawRange(0, 2 * k);
      const n = k + 1; sub.fill(1, 0, n);
      for (let i = n - 1; i >= 1; i--) sub[T.parent[i]] += sub[i];
      const lmax = Math.log(sub[0] + 1);
      for (let i = 1; i < n; i++) { const a = 0.07 + 0.93 * Math.pow(Math.log(sub[i] + 1) / lmax, 1.4); treeCol[(i - 1) * 8 + 3] = a; treeCol[(i - 1) * 8 + 7] = a; }
      colAttr.clearUpdateRanges(); colAttr.addUpdateRange(0, n * 8); colAttr.needsUpdate = true;
    };
    const showTries = (k) => { const tr = T.tries[Math.min(k, T.tries.length) - 1]; showEdges(tr ? tr.kept : 0); };

    // One try, drawn large: the random point, a guide from the nearest part of the tree, and the step itself.
    const sampleDot = shapes.mesh(shapes.sphere(0.012, 20), stage.material('focus'), { cast: false }); sampleDot.visible = false; W.add(sampleDot);
    const guide = shapes.line(stage, [new THREE.Vector3(), new THREE.Vector3(0, 0.1, 0)], 'focus', { dashed: true }); guide.visible = false; W.add(guide);
    const stickGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 10);
    const stepMat = roleMat('focus');
    const stepMesh = new THREE.Mesh(stickGeo, stepMat); stepMesh.visible = false; W.add(stepMesh);
    // Kept steps in the slow replay are drawn as solid grey sticks so the first branches are easy to see.
    const keptMat = stage.material('ref', { opacity: 0.85 });
    const kept = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(stickGeo, keptMat); m.visible = false; W.add(m); return m; });
    const placeStick = (m, a, b) => {
      const d = b.clone().sub(a), L = d.length();
      m.visible = L > 1e-5; if (!m.visible) return;
      m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    };
    const hideTry = () => { sampleDot.visible = false; guide.visible = false; stepMesh.visible = false; kept.forEach((m) => { m.visible = false; }); };

    // ----- Labels (at most three at once) -----
    const startLabel = stage.label('Start', () => V(START).add(new THREE.Vector3(0, 0.075, 0))).show(false);
    const goalLabel = stage.label('Goal', () => V(GRASP).add(new THREE.Vector3(0, 0.07, 0))).show(false);
    let hitAt = null;
    const hitLabel = stage.label('Hits the shelf', () => hitAt, { tone: 'fail' }).show(false);
    const pointLabel = stage.label('Random point', () => (sampleDot.visible ? sampleDot.position : null), { tone: 'focus' }).show(false);
    let skipAt = null;
    const skipLabel = stage.label('Would hit: skipped', () => skipAt, { tone: 'fail' }).show(false);
    let pathAt = null, rawAt = null;
    const pathLabel = stage.label('Smoothed', () => pathAt, { tone: 'focus' }).show(false);
    const rawLabel = stage.label('Branch, followed back', () => rawAt, { tone: 'focus' }).show(false);
    const dragLabel = stage.label('Drag the shelf', () => new THREE.Vector3(shelfAt.x, 0.66, shelfAt.z + 0.05), { tone: 'focus' }).show(false);
    const allLabels = [startLabel, goalLabel, hitLabel, pointLabel, skipLabel, pathLabel, rawLabel, dragLabel];

    // ----- Shared animation pieces -----
    let epoch = 0;
    const alive = (my) => my === epoch;
    // Eased animation on wall-clock time, so a slow frame rate drops frames instead of stretching the scene.
    // Resolves true if the step that started it is still showing. Instant when the reader prefers reduced motion.
    const anim = (s, fn, my) => new Promise((resolve) => {
      if (reduceMotion || s <= 0) { if (alive(my)) fn(1); resolve(alive(my)); return; }
      const t0 = performance.now();
      const off = stage.onFrame(() => {
        const k = Math.min(1, (performance.now() - t0) / (s * 1000));
        if (!alive(my)) { off(); resolve(false); return; }
        fn(ease(k));
        if (k >= 1) { off(); resolve(true); }
      });
    });
    const wait = (s, my) => anim(s, () => {}, my);
    let route = null; // { raw, smooth, pts, curve }
    const buildRoute = () => {
      const raw = branch(T);
      const sm = roundCorners(C, shortcut(C, raw));
      const pts = [...sm, GRASP].map(V);
      const curve = new THREE.CurvePath();
      for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
      route = { raw, smooth: sm, pts, curve };
      return route;
    };
    const fly = async (my, seconds) => {
      gripper.setOpen(1);
      if (!(await anim(seconds, (k) => gripper.position.copy(route.curve.getPointAt(k)), my))) return false;
      return anim(0.35, (k) => gripper.setOpen(1 - k), my);
    };
    const setShelf = (x, z) => { shelfAt = { x, z }; shelf.position.set(x, 0, z); C = cspace(x, z); };
    let drag = null;
    const resetScene = () => {
      epoch++;
      allLabels.forEach((l) => l.show(false));
      hideTry(); hitAt = null; skipAt = null; pathAt = null; rawAt = null;
      straight.visible = false; straightRest.visible = false; rawPath.visible = false; smooth.visible = false; oldPath.visible = false;
      treeMat.opacity = TREE_OPACITY; tree.visible = true;
      gripper.position.set(...START); gripper.setOpen(1); gripper.visible = true; ghost.visible = true;
      drag?.enable(false); ui.hint(''); ui.readout(''); another.show(false); busy = false;
      return epoch;
    };
    // Steps 1 to 4 always show the first tree, with the shelf in its first place.
    const FIRST = grow(C, SEED);
    const firstTree = () => { if (shelfAt.x !== 0 || shelfAt.z !== 0) setShelf(0, 0); if (T !== FIRST) loadTree(FIRST); };
    firstTree();
    // Step 2 replays tries one at a time, up to the first one that would hit something.
    const SLOW = Math.min(FIRST.tries.findIndex((t) => t.node < 0) + 1, kept.length);
    // One try, animated: show the random point, step toward it, keep it or mark it skipped.
    const playTry = async (i, pace, my, { label = true } = {}) => {
      const tr = T.tries[i];
      const a = V([T.P[tr.from * 3], T.P[tr.from * 3 + 1], T.P[tr.from * 3 + 2]]), s = V(tr.s), q = V(tr.q);
      const blocked = tr.node < 0;
      stepMesh.visible = false; skipLabel.show(false);
      sampleDot.position.copy(s); sampleDot.visible = true;
      guide.update([a, s]); guide.visible = true;
      pointLabel.show(label);
      stepMat.setRole(blocked ? 'fail' : 'focus');
      // One motion per try: the point shows first, then the step grows toward it.
      if (!(await anim(0.8 * pace, (k) => { const g = clamp((k - 0.45) / 0.55, 0, 1); if (g > 0) placeStick(stepMesh, a, a.clone().lerp(q, g)); else stepMesh.visible = false; }, my))) return null;
      if (blocked) { skipAt = q.clone().add(new THREE.Vector3(0, 0.035, 0)); skipLabel.show(true); }
      else { const m = kept.find((x) => !x.visible); if (m) placeStick(m, a, q); stepMesh.visible = false; }
      const k = tr.kept;
      ui.readout(`Tries: <b>${i + 1}</b> · steps kept: <b>${k}</b> · skipped: <b>${i + 1 - k}</b>`);
      return blocked;
    };
    let next = 0, busy = false;
    const another = ui.button('Try another point', async () => {
      if (busy || next >= T.tries.length || T.tries[next].kept > kept.length) return;
      busy = true; const my = epoch;
      startLabel.show(false);
      await playTry(next, 1, my);
      if (alive(my)) next++;
      busy = false;
    });
    another.show(false);

    // ----- Step 5: drag the shelf, and the tree regrows -----
    let seed = 100;
    let pendingCheck = null;
    const pathBlocked = () => { if (!route) return false; for (let i = 0; i < route.smooth.length - 1; i++) if (!free(C, route.smooth[i], route.smooth[i + 1])) return true; return false; };
    const markBlocked = () => {
      const b = pathBlocked();
      smooth.visible = !b;
      if (b) { oldPath.update(route.pts); oldPath.visible = true; } else oldPath.visible = false;
      pathLabel.show(false);
      ui.readout(b ? 'The old path now <b>hits the shelf</b>.' : 'The old path is still clear.');
      return b;
    };
    const replan = async (my) => {
      const t0 = performance.now();
      const t = grow(C, seed++);
      const ms = performance.now() - t0;
      if (!alive(my)) return;
      loadTree(t); showEdges(0); smooth.visible = false; pathLabel.show(false);
      gripper.position.set(...START); gripper.setOpen(1); ghost.visible = true; treeMat.opacity = TREE_OPACITY;
      const nk = t.n - 1;
      if (!(await anim(0.9, (k) => { showEdges(Math.round(nk * k * k)); ui.readout(`New tree: <b>${fmt(Math.round(t.nTries * k * k))}</b> tries`); }, my))) return;
      if (t.goal < 0) { ui.readout(`No way through after <b>${fmt(t.nTries)}</b> tries. Move the shelf again.`); return; }
      buildRoute();
      oldPath.visible = false; treeMat.opacity = 0.4;
      setTube(smooth, route.pts); smooth.material.setRole('ok'); reveal(smooth, 0);
      pathLabel.set('New path').tone('ok'); pathAt = route.curve.getPointAt(0.12); pathLabel.show(true);
      const when = ms < 1 ? 'under 1 millisecond' : `${Math.round(ms)} milliseconds`;
      ui.readout(`New tree: <b>${fmt(t.nTries)}</b> tries, worked out in <b>${when}</b> in your browser. VAMP, fast planning software, plans half its paths for a 7-joint arm in under <b>40 millionths of a second</b>.`);
      if (!(await anim(0.3, (k) => reveal(smooth, k), my))) return;
      if (await fly(my, 1.8)) ghost.visible = false;
    };
    drag = stage.draggable(shelf, {
      handle: shelf, plane: 'horizontal',
      constrain: (q) => { q.x = clamp(q.x, -0.2, 0.2); q.z = clamp(q.z, -0.18, 0.28); q.y = 0; return q; },
      onStart: () => { epoch++; hideTry(); gripper.position.set(...START); gripper.setOpen(1); ghost.visible = true; ui.hint(''); },
      onMove: (q) => {
        setShelf(q.x, q.z);
        if (pendingCheck) return;
        pendingCheck = requestAnimationFrame(() => { pendingCheck = null; markBlocked(); });
      },
      onEnd: () => { const my = ++epoch; replan(my); },
    });
    drag.enable(false);

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => {
            const my = resetScene(); stage.focus(roomPts); firstTree(); tree.visible = false;
            startLabel.show(true); goalLabel.show(true);
            const k = firstHit(C, ...START, ...GRASP);
            const a = V(START), b = V(GRASP), hit = a.clone().lerp(b, k);
            straightRest.update([hit, b]); straightRest.visible = true;
            OVER();
            if (!(await wait(0.3, my))) return;
            setTube(straight, [a, hit]); reveal(straight, 0); straight.material.setRole('focus');
            if (!(await anim(0.9, (e) => { reveal(straight, e); gripper.position.lerpVectors(a, hit, e); }, my))) return;
            straight.material.setRole('fail');
            hitAt = hit.clone().add(new THREE.Vector3(0, 0.08, 0)); hitLabel.show(true);
            ui.readout(`Straight there is <b>${a.distanceTo(b).toFixed(2)} metres</b>, but it is blocked after <b>${a.distanceTo(hit).toFixed(2)} metres</b>.`);
          } },
        { text: STEP_TEXT[1],
          enter: async () => {
            const my = resetScene(); stage.focus(roomPts); firstTree(); tree.visible = false;
            startLabel.show(true); next = 0;
            // Random points can land anywhere in the room, so on a phone look down from above to keep them all in view.
            if (tall()) MAP(0.7); else OVER(0.7);
            if (!(await wait(0.3, my))) return;
            for (let i = 0; i < SLOW; i++) {
              if (!alive(my)) return;
              const last = i === SLOW - 1, pace = i === 0 || last ? 1 : i === 1 ? 0.55 : 0.25;
              startLabel.show(i < 2);
              if ((await playTry(i, pace, my, { label: i < 2 || last })) === null) return;
              next = i + 1;
            }
            another.show(true); ui.hint('Tap for another try');
          } },
        { text: STEP_TEXT[2],
          enter: async () => {
            const my = resetScene(); stage.focus(roomPts); firstTree(); showTries(SLOW);
            goalLabel.show(true);
            MAP();
            await ui.predict({ question: 'Why pick random points, instead of always stepping straight toward the goal?', answer: 'spread',
              options: [{ id: 'spread', label: 'To spread into every gap' }, { id: 'quick', label: 'Random is quicker to compute' }, { id: 'look', label: 'So the motion looks natural' }],
              explain: 'Stepping straight at the goal just runs into the shelf again. Random points pull branches into every open gap, so one finds the way round without a map.' });
            if (!alive(my)) return;
            const n = T.tries.length;
            if (!(await anim(3.0, (k) => {
              const i = Math.max(SLOW, Math.round(SLOW + (n - SLOW) * k * k));
              showTries(i);
              ui.readout(`Tries: <b>${fmt(i)}</b> · steps kept: <b>${fmt(T.tries[i - 1].kept)}</b>`);
            }, my))) return;
            const nk = T.tries[n - 1].kept;
            ui.readout(`<b>${fmt(n)}</b> random points tried · <b>${fmt(nk)}</b> safe steps kept · <b>${fmt(n - nk)}</b> skipped. One branch reached the goal.`);
          } },
        { text: STEP_TEXT[3],
          enter: async () => {
            const my = resetScene(); stage.focus(roomPts); firstTree(); showEdges(T.n - 1);
            buildRoute();
            MAP(0.9);
            // Follow the branch back, from the goal to the start.
            setTube(rawPath, [...route.raw].reverse().map(V), 0.0034); rawPath.material.setRole('focus'); reveal(rawPath, 0);
            if (!(await anim(0.9, (k) => reveal(rawPath, k), my))) return;
            rawAt = V(route.raw[Math.round(route.raw.length * 0.3)]); rawLabel.show(true);
            ui.readout(`Followed back: <b>${route.raw.length - 1}</b> steps, <b>${lengthOf(route.raw).toFixed(2)} metres</b>.`);
            if (!(await anim(0.3, (k) => { treeMat.opacity = lerp(TREE_OPACITY, 0.2, k); }, my))) return;
            rawPath.material.setRole('ref'); rawLabel.tone('plain');
            setTube(smooth, route.pts); smooth.material.setRole('focus'); reveal(smooth, 0);
            if (!(await anim(0.6, (k) => reveal(smooth, k), my))) return;
            pathLabel.set('Smoothed').tone('focus'); pathAt = route.curve.getPointAt(0.62); pathLabel.show(true);
            ui.readout(`Followed back: <b>${route.raw.length - 1}</b> steps, <b>${lengthOf(route.raw).toFixed(2)} metres</b>. Smoothed: <b>${lengthOf(route.smooth).toFixed(2)} metres</b>.`);
            if (await fly(my, 2.0)) ghost.visible = false;
          } },
        { text: STEP_TEXT[4],
          enter: async () => {
            const my = resetScene(); stage.focus(roomPts); firstTree(); showEdges(T.n - 1); buildRoute();
            setTube(smooth, route.pts); smooth.material.setRole('ok'); treeMat.opacity = 0.4;
            dragLabel.show(true);
            // Frame the shelf where it ends up too, so the view holds it after it slides.
            MAP(0.8, corners(BLOCKING.x - 0.18, 0, BLOCKING.z - 0.13, BLOCKING.x + 0.18, 0.62, BLOCKING.z + 0.13));
            if (!(await wait(0.4, my))) return;
            // Show it once: slide the shelf into the path, then let the tree regrow.
            const from = { ...shelfAt };
            if (!(await anim(0.6, (k) => setShelf(lerp(from.x, BLOCKING.x, k), lerp(from.z, BLOCKING.z, k)), my))) return;
            markBlocked();
            if (!(await wait(0.3, my))) return;
            drag.enable(true); ui.hint('Drag the shelf');
            await replan(my);
          },
          leave: () => { drag.enable(false); ui.hint(''); } },
      ],
      dispose() { drag.remove(); if (pendingCheck) cancelAnimationFrame(pendingCheck); },
    };
  },
};
