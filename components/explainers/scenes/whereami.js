// Sense 10: Knowing where you are. Takeaway: a robot never knows exactly where it is. It keeps a best
// guess and a cloud of doubt; moving grows the doubt and every measurement shrinks it.
import { THREE, shapes, lerp, reduceMotion } from '../kit.js';
import { buildRover, makeRoverGeometries, buildLandmark, ROVER } from '../models/rover.js';
import { EXPLAINER_WORDS } from '../words.ts';

const GPS_M = 4.9; // gps.gov: GPS-enabled smartphones are typically accurate to within a 4.9 m radius under open sky
const STEP = 0.5; // metres per Move
const QA = 0.015, QC = 0.05; // doubt added per metre driven (variance, square metres), along and across the direction of travel
const SENSOR = { good: 0.05, poor: 0.25 }; // spread of one reading (one standard deviation, metres)
const P0 = 0.03 * 0.03; // it knows its starting spot well
const START = [-1.5, 0], END_X = 2.0;
const LANDMARKS = [{ x: 0.55, z: -0.95, face: 0 }, { x: 1.8, z: -0.85, face: 0 }];
const SEED_MOVE = 2, SEED_LOOK = 10;

// Seeded randomness so every reader sees the same drift.
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const gauss = (r) => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ---------- The filter: 2D position, covariance P = [[a, b], [b, c]] stored as [a, b, c] ----------
const predictQ = (d) => [QA * d, 0, QC * d]; // driving along +x
function kalmanUpdate(x, P, z, r2) {
  const S = [P[0] + r2, P[1], P[2] + r2], det = S[0] * S[2] - S[1] * S[1];
  const Si = [S[2] / det, -S[1] / det, S[0] / det];
  const K = [P[0] * Si[0] + P[1] * Si[1], P[0] * Si[1] + P[1] * Si[2], P[1] * Si[0] + P[2] * Si[1], P[1] * Si[1] + P[2] * Si[2]]; // [k00, k01, k10, k11]
  const y = [z[0] - x[0], z[1] - x[1]];
  const xn = [x[0] + K[0] * y[0] + K[1] * y[1], x[1] + K[2] * y[0] + K[3] * y[1]];
  const a = (1 - K[0]) * P[0] - K[1] * P[1], c = -K[2] * P[1] + (1 - K[3]) * P[2];
  const b = 0.5 * (((1 - K[0]) * P[1] - K[1] * P[2]) + (-K[2] * P[0] + (1 - K[3]) * P[1]));
  return { x: xn, P: [a, b, c] };
}
const ellipseOf = (P) => { const [a, b, c] = P, m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b); return { A: 2 * Math.sqrt(m + d), B: 2 * Math.sqrt(Math.max(1e-10, m - d)), ang: 0.5 * Math.atan2(2 * b, a - c) }; };
const area = (P) => Math.sqrt(Math.max(1e-12, P[0] * P[2] - P[1] * P[1]));
const times = (r) => (r >= 3 ? `${Math.round(r)}` : r.toFixed(1));

const STEP_TEXT = EXPLAINER_WORDS.whereami.steps;

export default {
  id: 'whereami',
  how: `<ul>
    <li>The cloud is drawn two standard deviations wide, so the true position should fall inside it about 86 times in 100. The faint robot shows where it really is; the robot itself never sees that.</li>
    <li>Moving adds doubt in proportion to the distance driven (more sideways than forward, as small heading errors build up). Each reading is combined with the guess by the standard Kalman update: the gain is the guess's doubt divided by the guess's doubt plus the reading's doubt (<a href="https://doi.org/10.1115/1.3662552" target="_blank" rel="noopener">Kalman 1960</a>). The noise sizes are illustrative, chosen to be visible at this scale.</li>
    <li>A reading here is the position the robot works out from a landmark whose place on its map it knows. Real robots usually measure distance and direction to the landmark, which needs the extended version of the filter.</li>
    <li>GPS figure: "GPS-enabled smartphones are typically accurate to within a 4.9 m (16 ft.) radius under open sky" (<a href="https://www.gps.gov/gps-accuracy" target="_blank" rel="noopener">GPS.gov, GPS Accuracy</a>).</li>
    <li>Uses: NASA Ames adapted the filter for Apollo navigation (<a href="https://ntrs.nasa.gov/citations/19860003843" target="_blank" rel="noopener">McGee and Schmidt, NASA TM-86847, 1985</a>); PX4 drones run an extended Kalman filter (<a href="https://docs.px4.io/main/en/advanced_config/tuning_the_ecl_ekf.html" target="_blank" rel="noopener">PX4 EKF2</a>); ROS robots commonly use <a href="https://docs.ros.org/en/noetic/api/robot_localization/html/index.html" target="_blank" rel="noopener">robot_localization</a>, which provides extended and unscented Kalman filter nodes.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(2.2);
    const Y = 0.003; // floor overlays sit just above the floor

    // Landmarks.
    const marks = LANDMARKS.map((l) => { const g = buildLandmark(stage); g.position.set(l.x, 0, l.z); g.rotation.y = l.face; stage.world.add(g); g.boardWorld = () => g.localToWorld(g.top.clone()); return g; });

    // The robot itself, drawn faint where it really is (it cannot see this), and its best guess:
    // a solid dot, like the blue dot on a phone map.
    const geos = makeRoverGeometries();
    const ghost = buildRover(stage, { geos, mat: stage.material('ref', { opacity: 0.5 }), shadow: true }); stage.world.add(ghost.root);
    const dot = new THREE.Group();
    const dotMat = stage.material('focus');
    const puck = shapes.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 32), dotMat); puck.position.y = 0.011;
    dot.add(puck); stage.world.add(dot);

    // Cloud of doubt: translucent fill plus a rim, scaled into an ellipse.
    const makeEllipse = (role, fillOpacity, rimOpacity) => {
      const g = new THREE.Group();
      const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 72), stage.material(role, { opacity: fillOpacity }));
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 72), stage.material(role, { opacity: rimOpacity }));
      for (const m of [fill, rim]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 2; g.add(m); }
      g.position.y = Y; g.fill = fill;
      g.setFrom = (cx, cz, P) => { const e = ellipseOf(P); g.position.set(cx, Y, cz); g.rotation.y = -e.ang; g.scale.set(e.A, 1, e.B); g.size = e.A; return g; };
      return g;
    };
    const cloud = makeEllipse('focus', 0.2, 0.85); cloud.position.y = Y * 2; stage.world.add(cloud);
    // The guess is the step's one colour, so the sensor and its reading stay neutral.
    const readCloud = makeEllipse('ref', 0.16, 0.8); readCloud.visible = false; stage.world.add(readCloud);
    // Reading: a pin standing where the sensor says the robot is.
    const pin = new THREE.Group();
    const senseMat = stage.material('dark');
    const stem = shapes.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.44, 12), senseMat); stem.position.y = 0.22;
    const head = shapes.mesh(shapes.sphere(0.035, 20), senseMat); head.position.y = 0.46;
    pin.add(stem, head); pin.visible = false; stage.world.add(pin);
    // Line of sight from the sensor to the landmark.
    const sight = shapes.mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 10), stage.material('dark', { opacity: 0.85 }), { cast: false });
    sight.visible = false; stage.world.add(sight);
    // Outline of the other sensor's result, for comparison (ref, dashed).
    const ellPts = (cx, cz, P, n = 72) => { const e = ellipseOf(P), pts = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2, u = e.A * Math.cos(t), v = e.B * Math.sin(t); pts.push(new THREE.Vector3(cx + u * Math.cos(e.ang) - v * Math.sin(e.ang), Y * 3, cz + u * Math.sin(e.ang) + v * Math.cos(e.ang))); } return pts; };
    const makeOutline = () => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), stage.material('ref', { opacity: 0.95 }));
      m.visible = false; m.renderOrder = 3; stage.world.add(m);
      m.setFrom = (cx, cz, P) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ellPts(cx, cz, P, 64).slice(0, -1), true), 128, 0.007, 6, true); m.info = { x: [cx, cz], P: [...P] }; return m; };
      return m;
    };
    const other = makeOutline(); // the other sensor's result, for comparison
    const before = makeOutline(); // the cloud just before a reading

    // ---------- State ----------
    let st, rMove, rLook, epoch = 0, busy = false, otherInfo = null;
    const draw = () => {
      dot.position.set(st.x[0], 0.004, st.x[1]);
      ghost.root.position.set(st.truth[0], 0, st.truth[1]); ghost.root.rotation.y = st.th;
      cloud.setFrom(st.x[0], st.x[1], st.P);
      cloud.fill.material.opacity = Math.min(0.5, Math.max(0.2, (0.2 * 0.35) / cloud.size)); // a small cloud is a dense one
    };
    const restart = () => {
      st = { x: [...START], P: [P0, 0, P0], truth: [...START], th: 0, driven: 0 };
      rMove = rng(SEED_MOVE); rLook = rng(SEED_LOOK);
      ghost.resetRoll(); draw();
    };
    const tw = (d, fn) => { const my = epoch; return stage.tween(d, (k) => { if (my === epoch) fn(k); }); };

    // Drive one step forward by counting wheel turns: the guess moves exactly STEP, the truth slips a little.
    const move = async (animate = true) => {
      const d = STEP, my = epoch;
      const to = [st.truth[0] + d + gauss(rMove) * Math.sqrt(QA * d), st.truth[1] + gauss(rMove) * Math.sqrt(QC * d)];
      const from = { x: [...st.x], P: [...st.P], t: [...st.truth], th: st.th };
      const target = { x: [st.x[0] + d, st.x[1]], P: from.P.map((v, i) => v + predictQ(d)[i]), t: to, th: -Math.atan2(to[1] - from.t[1], to[0] - from.t[0]) };
      pin.visible = false; readCloud.visible = false; before.visible = false;
      let last = 0;
      const apply = (k) => {
        st.x = [lerp(from.x[0], target.x[0], k), from.x[1]];
        st.P = from.P.map((v, i) => lerp(v, target.P[i], k));
        st.truth = [lerp(from.t[0], to[0], k), lerp(from.t[1], to[1], k)];
        st.th = lerp(from.th, target.th, Math.min(1, k * 3));
        ghost.roll((k - last) * d); last = k;
        draw();
      };
      if (animate) await tw(0.95, apply); else apply(1);
      if (my !== epoch) return;
      st.driven += d;
    };
    // Look at the nearest landmark: a reading appears, then the guess and cloud blend toward it.
    const nearest = () => marks.reduce((b, m) => (Math.hypot(m.position.x - st.x[0], m.position.z - st.x[1]) < Math.hypot(b.position.x - st.x[0], b.position.z - st.x[1]) ? m : b));
    const look = async (quality, { animate = true, e = null, showBefore = false } = {}) => {
      const r = SENSOR[quality], my = epoch;
      const n = e || [gauss(rLook), gauss(rLook)];
      const z = [st.truth[0] + r * n[0], st.truth[1] + r * n[1]];
      const prior = { x: [...st.x], P: [...st.P] };
      const post = kalmanUpdate(prior.x, prior.P, z, r * r);
      const lm = nearest();
      before.visible = false;
      if (showBefore) before.setFrom(prior.x[0], prior.x[1], prior.P).visible = true;
      const showReading = () => { pin.position.set(z[0], 0, z[1]); pin.visible = true; readCloud.setFrom(z[0], z[1], [r * r, 0, r * r]); readCloud.visible = true; };
      if (animate) {
        const a = ghost.root.localToWorld(ROVER.sensor.clone()), b = lm.boardWorld();
        sight.visible = true;
        await tw(0.5, (k) => { const end = a.clone().lerp(b, k); sight.position.copy(a).lerp(end, 0.5); sight.scale.set(1, a.distanceTo(end), 1); sight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); });
        if (my !== epoch) return null;
        showReading(); pin.scale.setScalar(0.01); readCloud.scale.multiplyScalar(0.01);
        await tw(0.35, (k) => { pin.scale.setScalar(Math.max(0.01, k)); readCloud.setFrom(z[0], z[1], [r * r * k * k + 1e-8, 0, r * r * k * k + 1e-8]); });
        await tw(1.0, (k) => { st.x = [lerp(prior.x[0], post.x[0], k), lerp(prior.x[1], post.x[1], k)]; st.P = prior.P.map((v, i) => lerp(v, post.P[i], k)); draw(); });
        if (my !== epoch) return null;
        sight.visible = false;
      } else { showReading(); st.x = post.x; st.P = post.P; draw(); }
      // How far the guess moved toward the reading, and how much the cloud shrank.
      const y = [z[0] - prior.x[0], z[1] - prior.x[1]], dx = [post.x[0] - prior.x[0], post.x[1] - prior.x[1]];
      const pct = Math.round((100 * (dx[0] * y[0] + dx[1] * y[1])) / Math.max(1e-9, y[0] * y[0] + y[1] * y[1]));
      return { pct, shrink: area(prior.P) / area(post.P), prior, post, z };
    };

    // ---------- Labels (at most three at a time) ----------
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    // Label point on the cloud's rim, toward the front-right (lower right on screen), so the label does not cover it.
    const nearEdge = () => { const [a, b, c] = st.P, w = [Math.SQRT1_2, Math.SQRT1_2], Pw = [a * w[0] + b * w[1], b * w[0] + c * w[1]], n = Math.sqrt(w[0] * Pw[0] + w[1] * Pw[1]); return v3(st.x[0] + (2 * Pw[0]) / n, Y, st.x[1] + (2 * Pw[1]) / n); };
    const L = {
      guess: stage.label('Where it thinks it is', () => v3(st.x[0], 0.03, st.x[1]), { tone: 'focus' }).show(false),
      truth: stage.label('Where it really is', () => v3(st.truth[0] - 0.04, 0.3, st.truth[1])).show(false),
      cloud: stage.label('Cloud of doubt', () => (cloud.size > 0.22 ? nearEdge() : null), { tone: 'focus' }).show(false), // hidden while the cloud is too small to point at
      landmark: stage.label('Landmark it knows', () => marks[0].boardWorld().add(v3(0, 0.16, 0))).show(false),
      before: stage.label('Cloud before looking', () => { if (!before.visible) return null; const { x, P } = before.info, s = Math.sqrt(P[2]); return v3(x[0] + (2 * P[1]) / s, Y, x[1] + 2 * s); }).show(false),
      reading: stage.label('Where the landmark says it is', () => (pin.visible ? pin.position.clone().add(v3(0, 0.5, 0)) : null), { tone: 'plain' }).show(false),
      other: stage.label('With a good sensor', () => (other.visible && otherInfo ? v3(otherInfo.x[0] - 2 * Math.sqrt(otherInfo.P[0]), Y, otherInfo.x[1]) : null)).show(false),
    };
    const hideLabels = () => Object.values(L).forEach((l) => l.show(false));

    // ---------- Controls ----------
    const report = { last: '' };
    const say = (html) => { report.last = html; ui.readout(html + (gpsLine ? `<br>${gpsLine}` : '')); };
    let gpsLine = '';
    const moveText = () => `Driven <b>${st.driven.toFixed(1)} metres</b> by counting wheel turns. Every turn adds a little error, so the cloud keeps growing.`;
    const lookText = (res, prefix = '') => `${prefix}${prefix ? 'its' : 'Its'} guess moved <b>${res.pct}%</b> of the way to where the landmark says it is. The cloud is now <b>${times(res.shrink)} times</b> smaller.`;
    const doMove = async () => {
      if (busy) return; busy = true;
      if (st.x[0] + STEP > END_X + 1e-6) { restart(); say('Back at the start, where it knows exactly where it is.'); busy = false; moveBtn.set('Move'); return; }
      await move(); say(moveText()); busy = false;
      if (st.x[0] + STEP > END_X + 1e-6) moveBtn.set('Start again');
    };
    const doLook = async (quality) => { if (busy) return; busy = true; const res = await look(quality, { showBefore: true }); if (res) say(lookText(res)); busy = false; return res; };
    const moveBtn = ui.button('Move', () => doMove());
    const lookBtn = ui.button('Look', () => doLook('good'));
    let onSensor = () => {};
    const sensor = ui.choice({ label: 'Sensor', value: 'poor', options: [{ id: 'good', label: 'Good' }, { id: 'poor', label: 'Poor' }], onChange: (id) => onSensor(id) });
    moveBtn.show(false); lookBtn.show(false); sensor.show(false);

    // Camera framing that fits wide and tall stages.
    const frame = (target, dir, hw, hh, dur = 1.1) => {
      const cam = stage.camera, vf = THREE.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
      const d = Math.max(hw / Math.tan(hf / 2), hh / Math.tan(vf / 2)) * 1.05 + hw * 0.2;
      const D = new THREE.Vector3(...dir).normalize();
      return stage.view(target, new THREE.Vector3(...target).addScaledVector(D, d), dur);
    };

    const narrow = () => stage.camera.aspect < 1.1;
    const reset = () => {
      epoch++; busy = false; restart();
      pin.visible = false; readCloud.visible = false; sight.visible = false; other.visible = false; before.visible = false; otherInfo = null;
      L.cloud.set('Cloud of doubt'); marks.forEach((m) => { m.visible = true; });
      hideLabels(); moveBtn.show(false); lookBtn.show(false); sensor.show(false); moveBtn.set('Move');
      gpsLine = ''; ui.readout(''); ui.hint(''); onSensor = () => {};
      return epoch;
    };
    const driveTo = async (n, animate) => { for (let i = 0; i < n; i++) { const my = epoch; await move(animate); if (my !== epoch) return false; } return true; };

    // Keep the robot's guess in view as it drives: the camera slides along the route when the guess
    // nears the right edge (or falls far behind on the left).
    stage.onFrame((dt) => {
      if (stage.dragging) return;
      const T = stage.controls.target, cam = stage.camera;
      const half = cam.position.distanceTo(T) * Math.tan(Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect));
      const off = st.x[0] - T.x, want = off > 0.42 * half ? off - 0.42 * half : off < -0.85 * half ? off + 0.85 * half : 0;
      if (Math.abs(want) < 1e-4) return;
      const dx = reduceMotion ? want : want * Math.min(1, dt * 2.5); T.x += dx; cam.position.x += dx;
    });
    stage.camera.position.set(-0.4, 3.0, 3.9); stage.controls.target.set(-0.6, 0.1, -0.15);
    restart();

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => {
            const my = reset(); marks.forEach((m) => { m.visible = false; }); stage.focus(dot, ghost.root, cloud);
            L.guess.show(true); L.truth.show(true); L.cloud.show(true);
            if (narrow()) frame([-0.2, 0.1, -0.15], [0.1, 1.15, 1], 0.75, 0.5, 1.0); else frame([-0.6, 0.1, -0.12], [0.1, 1.15, 1], 1.05, 0.5, 1.0);
            await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 450)); if (my !== epoch) return;
            busy = true;
            for (let i = 0; i < 3; i++) { await move(true); if (my !== epoch) return; say(moveText()); }
            busy = false; moveBtn.show(true); ui.hint('Press Move');
          } },
        { text: STEP_TEXT[1],
          enter: async () => {
            const my = reset(); await driveTo(3, false); if (my !== epoch) return;
            L.landmark.show(true); L.cloud.show(true); L.truth.show(true);
            await stage.fit([marks[0], ghost.root, cloud, dot], narrow() ? [0.15, 1.0, 1] : [0.2, 0.95, 1], { margin: 0.74 }); if (my !== epoch) return;
            await ui.predict({ question: 'It spots a landmark. What happens to the cloud?', answer: 'shrinks',
              options: [{ id: 'grows', label: 'It grows' }, { id: 'same', label: 'It stays the same' }, { id: 'shrinks', label: 'It shrinks' }],
              explain: 'It shrinks sharply. Seeing a landmark it knows tells the robot roughly where it must be, which rules out most of the cloud.' });
            if (my !== epoch) return;
            L.landmark.show(false); L.truth.show(false); L.cloud.show(false); L.reading.show(true); L.before.show(true);
            busy = true; const res = await look('good', { showBefore: true }); if (my !== epoch || !res) return; busy = false;
            say(lookText(res));
            moveBtn.show(true); lookBtn.show(true);
          } },
        { text: STEP_TEXT[2],
          enter: async () => {
            const my = reset(); await driveTo(3, false); if (my !== epoch) return;
            const base = { x: [...st.x], P: [...st.P], truth: [...st.truth], th: st.th };
            const e = (() => { const r = rng(SEED_LOOK); return [gauss(r), gauss(r)]; })();
            const results = {};
            const restore = () => { st.x = [...base.x]; st.P = [...base.P]; st.truth = [...base.truth]; st.th = base.th; draw(); };
            const showOther = (q) => {
              const oq = q === 'good' ? 'poor' : 'good';
              restore(); const r = SENSOR[oq];
              const z = [base.truth[0] + r * e[0], base.truth[1] + r * e[1]];
              otherInfo = kalmanUpdate(base.x, base.P, z, r * r);
              other.setFrom(otherInfo.x[0], otherInfo.x[1], otherInfo.P); other.visible = true;
              L.other.set(oq === 'good' ? 'With a good sensor' : 'With a poor sensor').show(true);
            };
            const run = async (q, animate = true) => {
              const mine = epoch; busy = true; showOther(q); pin.visible = false; readCloud.visible = false;
              const res = await look(q, { e, animate }); if (mine !== epoch || !res) return;
              results[q] = res; busy = false;
              say(lookText(res, q === 'good' ? 'Good sensor: ' : 'Poor sensor: '));
            };
            onSensor = (q) => { if (!busy) run(q); else sensor.set(q === 'good' ? 'poor' : 'good'); };
            L.cloud.set('Cloud after looking').show(true); L.reading.show(true); stage.focus(cloud, other, readCloud, pin, dot);
            sensor.set('poor'); sensor.show(true); ui.hint('Switch the sensor');
            await frame([0.08, 0.1, -0.22], [0.12, 1.3, 1], 0.68, 0.5, 1.0); if (my !== epoch) return;
            await run('poor');
          },
          leave: () => { L.cloud.set('Cloud of doubt'); } },
        { text: STEP_TEXT[3],
          enter: async () => {
            const my = reset(); await driveTo(3, false); if (my !== epoch) return;
            await look('good', { animate: false }); await move(false); if (my !== epoch) return;
            gpsLine = `A phone's GPS alone is typically within <b>${GPS_M} metres</b> under open sky, and worse near buildings and trees.`;
            say('Each Move grows the cloud. Each Look shrinks it.'); stage.focus(dot, ghost.root, cloud);
            L.cloud.show(true); L.truth.show(true);
            moveBtn.show(true); lookBtn.show(true); ui.hint('Move, then Look');
            await (narrow() ? frame([0.65, 0.2, -0.3], [0.1, 0.95, 1], 0.95, 0.7, 1.1) : frame([0.85, 0.2, -0.3], [0.1, 0.9, 1], 1.25, 0.7, 1.1));
          } },
      ],
      dispose() {},
    };
  },
};
