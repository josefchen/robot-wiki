// Move 5: Staying upright. Takeaway: a robot stays up while its balance point is over the patch between its
// feet; four feet make a big patch, two a tiny one.
import { THREE, shapes, ease, clamp, lerp, reduceMotion, slicer } from '../kit.js';
import { buildHumanoid, STAND_Y, G1 } from '../models/humanoid.js';
import { buildQuadruped, DOG } from '../models/quadruped.js';
import { EXPLAINER_WORDS } from '../words.ts';

const DOG_X = -0.62, HUM_X = 0.38; // both face +x (screen right), side by side
const SHIFT = 0.18; // how far the push carries each balance point forward (metres)
const STEP = 0.34; // the humanoid's catching step

// Convex hull of [x, z] points (monotone chain), counter-clockwise.
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const insideHull = (h, x, z) => h.length >= 3 && h.every((a, i) => { const b = h[(i + 1) % h.length]; return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) >= 0; });
const seg = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));

const STEP_TEXT = EXPLAINER_WORDS.upright.steps;

export default {
  id: 'upright',
  how: `<ul>
    <li>Control rate: the learned controller on ANYmal, a dog-sized robot of about 32 kg, "was evaluated at 200 Hz" for walking and running, after training in simulation (<a href="https://arxiv.org/abs/1901.08652" target="_blank" rel="noopener">Hwangbo et al. 2019, Science Robotics</a>).</li>
    <li>Light legs: in the MIT Cheetah, "two actuators and the gear train are coaxially located at the hip of the leg to minimize the total moment of inertia" (<a href="https://doi.org/10.1109/TRO.2016.2640183" target="_blank" rel="noopener">Wensing et al. 2017, IEEE Transactions on Robotics</a>). The dog here is stylised on that layout: three motors per leg, all at the hip, with a belt to the knee.</li>
    <li>The humanoid is proportioned on the Unitree G1, and its balance point is computed live from the link masses in Unitree's <a href="https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description" target="_blank" rel="noopener">g1_23dof.urdf</a>. The patch is the outline around every foot touching the floor.</li>
    <li>The push and the catching step are choreographed, not a physics simulation: both balance points move the same distance, and the legs are solved so planted feet stay put. The dot-over-patch rule is exact for a robot standing still; a moving robot also uses its momentum, which is how a walking robot survives moments with its balance point outside the patch.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(1.6);
    const breathe = slicer();
    const dog = buildQuadruped(stage); dog.root.position.x = DOG_X; dog.root.rotation.y = Math.PI / 2; stage.world.add(dog.root);
    await breathe();
    const hum = buildHumanoid(stage); hum.root.position.x = HUM_X; hum.root.rotation.y = Math.PI / 2; stage.world.add(hum.root);
    await breathe();
    dog.pose(); hum.pose();
    // Looks: 'solid', or fade the bodies to ghosts keeping only the feet ('feet') or the legs ('legs') solid.
    const keep = { feet: new Set(), legs: new Set() };
    const mark = (set, objs) => objs.forEach((o) => o.traverse((m) => { if (m.isMesh) set.add(m); }));
    mark(keep.feet, [...hum.legs.map((l) => l.foot), ...dog.legs.map((l) => l.foot)]);
    mark(keep.legs, [...hum.legGroups, ...dog.legs.map((l) => l.abd)]);
    const bodyMeshes = [];
    [hum.root, dog.root].forEach((r) => r.traverse((m) => { if (m.isMesh && !m.userData.handMotor) { m.userData.base0 = m.material; bodyMeshes.push(m); } }));
    const look = (mode) => bodyMeshes.forEach((m) => {
      const solid = mode === 'solid' || keep[mode]?.has(m);
      m.material = solid ? m.userData.base0 : stage.mats.ref; m.castShadow = solid;
    });

    // ---- Balance gear: dot, drop line, shadow spot, support patch ----
    const S = { dogShift: 0, lean: 0, stepK: 0, settle: 0, gait: false, gt: 0, dogSwing: null, humSwing: null };
    const comDot = () => {
      const g = new THREE.Group();
      const a = stage.material('ink'), b = stage.material('paper');
      [a, b].forEach((m) => { m.depthTest = false; });
      for (const [m, ps, ts] of [[a, 0, 0], [b, Math.PI, 0], [b, 0, Math.PI / 2], [a, Math.PI, Math.PI / 2]]) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 8, ps, Math.PI, ts, Math.PI / 2), m); s.renderOrder = 20; g.add(s);
      }
      return g;
    };
    const tri = [[0, 0], [0.01, 0], [0, 0.01]];
    const makeGear = (contacts, com) => {
      const g = { contacts, com, hull: [], inside: true, com3: new THREE.Vector3() };
      g.dot = comDot(); stage.world.add(g.dot);
      g.drop = shapes.line(stage, [new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], 'ink', { dashed: true });
      g.drop.material.depthTest = false; g.drop.renderOrder = 19; stage.world.add(g.drop);
      g.spotInk = stage.material('ink'); g.spotFail = stage.material('fail');
      [g.spotInk, g.spotFail].forEach((m) => { m.depthTest = false; });
      g.spot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), g.spotInk); g.spot.rotation.x = -Math.PI / 2; g.spot.renderOrder = 21; stage.world.add(g.spot);
      g.patch = shapes.floorPolygon(stage, tri, 'focus', 0.3); stage.world.add(g.patch);
      g.edge = new THREE.LineLoop(new THREE.BufferGeometry(), stage.lineMaterial('focus')); g.edge.renderOrder = 3; stage.world.add(g.edge);
      g.edgeOk = g.edge.material; g.edgeFail = stage.lineMaterial('fail');
      g.patchOk = g.patch.material; g.patchFail = stage.material('fail', { opacity: 0.3 });
      g.show = ({ dot = false, drop = dot, patch = false } = {}) => { g.dot.visible = dot; g.drop.visible = g.spot.visible = drop; g.patch.visible = g.edge.visible = patch; };
      g.update = () => {
        const c = com(g.com3);
        g.dot.position.copy(c);
        g.drop.update([c.clone(), new THREE.Vector3(c.x, 0.004, c.z)]);
        g.spot.position.set(c.x, 0.004, c.z);
        g.hull = hull(contacts());
        if (g.hull.length >= 3) { g.patch.update(g.hull); g.edge.geometry.dispose(); g.edge.geometry = new THREE.BufferGeometry().setFromPoints(g.hull.map(([x, z]) => new THREE.Vector3(x, 0.003, z))); }
        g.inside = insideHull(g.hull, c.x, c.z);
        g.spot.material = g.inside ? g.spotInk : g.spotFail;
        const ok = g.inside || !S.alarm;
        g.patch.material = ok ? g.patchOk : g.patchFail; g.edge.material = ok ? g.edgeOk : g.edgeFail;
      };
      return g;
    };
    const circle = (x, z, r = DOG.footR * 0.95, n = 10) => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * Math.PI * 2), z + r * Math.sin((i / n) * Math.PI * 2)]);
    const dogGear = makeGear(() => dog.feet().flatMap((f, i) => ((S.dogSwing ? !S.dogSwing[i] : f.contact) ? circle(f.x, f.z) : [])), (o) => dog.com(o));
    const humGear = makeGear(() => hum.soles().flatMap((s, i) => ((S.humSwing ? !S.humSwing[i] : s.contact) ? s.pts : [])), (o) => hum.com(o));
    const gears = [dogGear, humGear];
    await breathe();

    // ---- Posing from the animation state ----
    const A = G1.ankle, R = STAND_Y - A;
    const poseAll = () => {
      if (!S.gait) {
        dog.pose({ body: { z: S.dogShift } });
        // Lean pivots on the ankles; the right foot then steps forward; the body settles over both feet.
        const ly = A + R * Math.cos(S.lean), lz = R * Math.sin(S.lean);
        const k = S.stepK;
        hum.pose({
          pelvis: { y: lerp(ly, STAND_Y - 0.035, S.settle), z: lerp(lz, STEP / 2, S.settle), pitch: S.lean * (1 - S.settle) },
          r: { z: STEP * ease(k), y: 0.07 * Math.sin(Math.PI * k) },
          arms: { pitch: -0.05 - 0.55 * Math.sin(Math.PI * clamp(k * 0.8 + S.settle * 0.2, 0, 1)) },
        });
      }
      gears.forEach((g) => g.update());
    };

    // Gait: the dog trots in place (diagonal pairs), the humanoid marches in place, swaying over the standing foot.
    const gaitPose = (t) => {
      const pd = (t / 0.9) % 1;
      const pairA = pd >= 0.5, liftD = 0.075 * Math.sin(Math.PI * ((pd % 0.5) / 0.5));
      S.dogSwing = [pairA, !pairA, !pairA, pairA]; // FL, FR, HL, HR
      const feet = dog.STAND().map((f, i) => ({ ...f, y: S.dogSwing[i] ? liftD : 0 }));
      dog.pose({ body: { y: DOG.bodyY + 0.006 * Math.cos(4 * Math.PI * pd) }, feet });
      const ph = (t / 1.2) % 1;
      const sw = (a) => { const u = (ph - a) / 0.34; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
      const lL = sw(0.08), lR = sw(0.58);
      S.humSwing = [lL > 0, lR > 0];
      hum.pose({ pelvis: { x: -0.04 * Math.sin(2 * Math.PI * ph), y: STAND_Y - 0.01 }, l: { y: 0.075 * lL }, r: { y: 0.075 * lR }, arms: { pitch: -0.05 } });
      gears.forEach((g) => g.update());
    };

    let lastCount = '';
    stage.onFrame((dt) => {
      if (S.gait) {
        S.gt += reduceMotion ? 0 : dt; gaitPose(S.gt);
        const n = `${S.dogSwing.filter((x) => !x).length}|${S.humSwing.filter((x) => !x).length}`;
        if (n !== lastCount) { lastCount = n; const [d, h] = n.split('|'); ui.readout(`Feet on the ground: dog <b>${d}</b> of 4, humanoid <b>${h}</b> of 2.<br>A red spot is outside the patch: the robot tips until its next foot lands.`); }
      } else gears.forEach((g) => g.update());
    });

    // ---- Choreography helpers (each belongs to the step that started it) ----
    let epoch = 0;
    const run = (dur, fn) => new Promise((res) => {
      const my = epoch; let t = 0;
      if (reduceMotion) { fn(dur); res(); return; }
      const off = stage.onFrame((dt) => { if (my !== epoch) { off(); res(); return; } t = Math.min(dur, t + dt); fn(t); if (t >= dur) { off(); res(); } });
    });
    const vf = () => Math.tan((stage.camera.fov * Math.PI) / 360);
    const place = (target, dir, w, h) => { const dist = Math.max(h / 2 / vf(), w / 2 / (vf() * stage.camera.aspect)) * 1.1; return [new THREE.Vector3(...target), new THREE.Vector3(...dir).normalize().multiplyScalar(dist).add(new THREE.Vector3(...target))]; };
    const shot = (target, dir, w, h, d = 1.1) => {
      const [T, P] = place(target, dir, w, h);
      const t0 = stage.controls.target.clone(), p0 = stage.camera.position.clone();
      return run(d, (t) => { const k = ease(t / d); stage.controls.target.lerpVectors(t0, T, k); stage.camera.position.lerpVectors(p0, P, k); });
    };
    // Wide frames show the pair side by side; tall (phone) frames look from further round so they stack diagonally.
    const tall = () => stage.camera.aspect < 1;
    const WIDE = () => (tall() ? [[0.04, 0.6, 0], [1.0, 0.55, 0.95], 1.9, 1.75] : [[-0.2, 0.62, 0], [0.42, 0.4, 1], 2.35, 1.55]);
    const FLOOR = () => (tall() ? [[-0.05, 0.22, 0.05], [0.75, 1.9, 1], 1.95, 1.8] : [[-0.15, 0.2, 0.05], [0.22, 1.9, 1], 2.3, 1.45]);
    { const [T, P] = place(...WIDE()); stage.controls.target.copy(T); stage.camera.position.copy(P); }

    // ---- Push ----
    // Ink, so the patches keep the step's one colour while the push plays.
    const arrows = [shapes.arrow(stage, 'ink', 0.016), shapes.arrow(stage, 'ink', 0.016)];
    arrows.forEach((a) => { a.visible = false; stage.world.add(a); });
    const ARROW = 0.32, fwd = new THREE.Vector3(1, 0, 0);
    const outLabel = stage.label('Outside its patch: it must step', () => humGear.com3.clone().add(new THREE.Vector3(0, 0.62, 0)), { tone: 'fail' }).show(false);
    const standStill = () => { Object.assign(S, { dogShift: 0, lean: 0, stepK: 0, settle: 0, alarm: false }); outLabel.show(false); poseAll(); };
    const LEAN = (() => { // lean angle that carries the humanoid's balance point SHIFT metres forward
      const base = hum.com(new THREE.Vector3()).x; let lo = 0, hi = 0.6;
      for (let i = 0; i < 24; i++) { S.lean = (lo + hi) / 2; poseAll(); if (hum.com(new THREE.Vector3()).x - base < SHIFT) lo = S.lean; else hi = S.lean; }
      S.lean = 0; poseAll(); return (lo + hi) / 2;
    })();
    const DSHIFT = (() => { // body shift that carries the dog's balance point the same SHIFT metres
      const base = dog.com(new THREE.Vector3()).x; let lo = 0, hi = 0.4;
      for (let i = 0; i < 24; i++) { S.dogShift = (lo + hi) / 2; poseAll(); if (dog.com(new THREE.Vector3()).x - base < SHIFT) lo = S.dogShift; else hi = S.dogShift; }
      S.dogShift = 0; poseAll(); return (lo + hi) / 2;
    })();
    let pushing = false;
    const push = async ({ d = true, h = true } = {}) => {
      if (pushing) return; pushing = true;
      standStill(); S.alarm = true;
      const dTail = new THREE.Vector3(DOG_X - 0.33 - 0.02 - ARROW, 0.44, 0), hTail = new THREE.Vector3(HUM_X - 0.09 - ARROW, 0.92, 0);
      await run(2.6, (t) => {
        const g = seg(t, 0, 0.3), p = seg(t, 0.3, 0.85);
        arrows[0].visible = d && t < 0.85; arrows[1].visible = h && t < 0.85;
        arrows[0].set(dTail.clone().addScaledVector(fwd, (d ? DSHIFT : 0) * p), fwd, ARROW * g);
        arrows[1].set(hTail.clone().addScaledVector(fwd, (h ? (0.92 - A) * Math.sin(LEAN) : 0) * p), fwd, ARROW * g);
        if (d) S.dogShift = DSHIFT * (p - seg(t, 1.45, 2.4));
        if (h) {
          S.lean = LEAN * p; S.stepK = clamp((t - 1.0) / 0.45, 0, 1); S.settle = seg(t, 1.45, 2.4);
          outLabel.show(!humGear.inside);
        }
        poseAll();
      });
      arrows.forEach((a) => { a.visible = false; });
      outLabel.show(false); pushing = false;
    };
    const pushBtn = ui.button('Push both', () => push());
    pushBtn.show(false);
    let tapOn = false;
    const offClick = stage.onClick((ray) => {
      if (!tapOn || pushing) return;
      const dd = ray.intersectObject(dog.root, true)[0]?.distance ?? Infinity, dh = ray.intersectObject(hum.root, true)[0]?.distance ?? Infinity;
      if (dd < Infinity || dh < Infinity) push({ d: dd < dh, h: dh <= dd });
    });

    // ---- Labels (at most three) ----
    const L = {
      dotD: stage.label('Balance point', () => dogGear.com3.clone().add(new THREE.Vector3(0, 0.02, 0))),
      dotH: stage.label('Balance point', () => humGear.com3.clone().add(new THREE.Vector3(0, 0.02, 0))),
      patchD: stage.label('Four feet: big patch', () => new THREE.Vector3(DOG_X + 0.1, 0, 0.22), { tone: 'focus' }),
      patchH: stage.label('Two feet: small patch', () => new THREE.Vector3(HUM_X + 0.1, 0, 0.15), { tone: 'focus' }),
      named: stage.label('Support polygon', () => new THREE.Vector3(DOG_X + 0.1, 0, 0.22), { tone: 'focus' }),
    };
    const labels = (...on) => { for (const [k, l] of Object.entries(L)) l.show(on.includes(k)); };
    labels();

    const reset = () => {
      S.gait = false; S.dogSwing = S.humSwing = null; S.gt = 0; lastCount = '';
      tapOn = false; pushBtn.show(false); ui.hint(''); ui.readout('');
      arrows.forEach((a) => { a.visible = false; }); pushing = false;
      standStill(); labels(); look('solid');
    };
    const gearsShow = (o) => gears.forEach((g) => g.show(o));
    gearsShow({});

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => { const my = ++epoch; reset(); stage.focus(dog.root, hum.root); gearsShow({ dot: true, drop: false }); labels('dotD', 'dotH');
            gears.forEach((g) => g.dot.scale.setScalar(0.01));
            shot(...WIDE(), 1.0);
            await run(0.6, (t) => gears.forEach((g) => g.dot.scale.setScalar(Math.max(0.01, ease(t / 0.6)))));
            if (my !== epoch) return; } },
        { text: STEP_TEXT[1],
          enter: async () => { const my = ++epoch; reset(); stage.focus(dog.root, hum.root); gearsShow({ dot: true, patch: true }); gears.forEach((g) => g.dot.scale.setScalar(1));
            labels('patchD', 'patchH'); look('feet');
            ui.readout('The bodies are faded so the feet show. The dashed line drops from each balance point to the spot on the floor below it.');
            gears.forEach((g) => { g.patchOk.opacity = 0; });
            stage.fit([dog.root, hum.root], FLOOR()[1], { margin: 0.84, duration: 1.1 });
            await run(0.8, (t) => gears.forEach((g) => { g.patchOk.opacity = 0.3 * ease(t / 0.8); }));
            if (my !== epoch) return; } },
        { text: STEP_TEXT[2],
          enter: async () => { const my = ++epoch; reset(); stage.focus(dog.root, hum.root); gearsShow({ dot: true, patch: true }); gears.forEach((g) => { g.dot.scale.setScalar(1); g.patchOk.opacity = 0.3; });
            shot(...WIDE(), 0.9);
            await ui.predict({ question: 'Push both. Which one must take a step to stay up?', answer: 'humanoid',
              options: [{ id: 'dog', label: 'The dog' }, { id: 'humanoid', label: 'The humanoid' }, { id: 'both', label: 'Both' }],
              explain: 'The dog\'s balance point stays inside its big patch. The humanoid\'s leaves its small patch, so it steps forward to catch itself.' });
            if (my !== epoch) return;
            await push(); if (my !== epoch) return;
            pushBtn.show(true); tapOn = true; ui.hint('Tap a robot to push it'); },
          leave: () => { tapOn = false; pushBtn.show(false); ui.hint(''); } },
        { text: STEP_TEXT[3],
          enter: async () => { const my = ++epoch; reset(); stage.focus(dog.root, hum.root); gearsShow({ dot: true, patch: true }); gears.forEach((g) => { g.dot.scale.setScalar(1); g.patchOk.opacity = 0.3; });
            S.gait = true; look('legs');
            await stage.fit([dog.root, hum.root], FLOOR()[1], { margin: 0.8, duration: 1.0 }); if (my !== epoch) return; },
          leave: () => { S.gait = false; S.dogSwing = S.humSwing = null; standStill(); look('solid'); } },
        { text: STEP_TEXT[4],
          enter: async () => { const my = ++epoch; reset(); stage.focus(dog.root, hum.root); gearsShow({ dot: true, patch: true }); gears.forEach((g) => { g.dot.scale.setScalar(1); g.patchOk.opacity = 0.3; });
            labels('named');
            ui.readout('ANYmal weighs about <b>32 kilograms</b> and picks new leg moves <b>200 times a second</b>.');
            pushBtn.show(true); tapOn = true; ui.hint('Tap a robot to push it');
            await shot(...WIDE(), 1.0); if (my !== epoch) return; },
          leave: () => { tapOn = false; pushBtn.show(false); ui.hint(''); } },
      ],
      dispose() { offClick(); },
    };
  },
};
