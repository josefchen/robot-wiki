// Move 6: Flying. Takeaway: a drone steers only by changing its four propeller speeds:
// speed up the back pair to tilt and fly forward, speed up one spinning pair to turn.
import { THREE, shapes, ExplodedModel, lerp } from '../kit.js';
import { buildQuadcopter, makeQuadGeometries, arcArrow, ROTORS, QUAD } from '../models/quadcopter.js';

const RATE_HZ = 400; // PX4 default for IMU_GYRO_RATEMAX, "the loop rate for the rate controller and outputs"
const DEG = Math.PI / 180;
const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clampN = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- Physics (simplified, slowed down so the eye can follow) ----------
// Thrust grows with the square of propeller speed; each propeller also twists the body the opposite
// way to its spin. Rotation is heavily damped, so the drone turns while the speeds differ and stops
// turning when they are equal again. The "flight computer" is a simple cascade, as in real autopilots:
// position -> wanted tilt -> speed differences between the four motors.
const M = 1, G = 9.81, TH = (M * G) / 4, KQ = 0.025, CP = 0.14, CY = 0.05, DH = 0.9, DV = 6, SLOW = 0.4;
class QuadSim {
  constructor() { this.reset([0, 0.55, 0]); }
  reset(p, yaw = 0) {
    this.p = [...p]; this.v = [0, 0, 0]; this.yaw = yaw; this.pitch = 0; this.roll = 0;
    this.s = [1, 1, 1, 1]; this.t = 0; this.frozen = false;
    this.manual = false; this.boost = [0, 0, 0, 0]; this.ext = 0; this.extP = 0; this.extF = 0; this.plan = null;
    this.home = { p: [...p], yaw };
  }
  up() {
    const cr = Math.cos(this.roll), sr = Math.sin(this.roll), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const x = -cr * sp, y = cr * cp, z = sr;
    return [x * cy + z * sy, y, -x * sy + z * cy];
  }
  targets() {
    const h = this.home, cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const ax = 2.0 * (h.p[0] - this.p[0]) - 2.4 * this.v[0], az = 2.0 * (h.p[2] - this.p[2]) - 2.4 * this.v[2];
    const fwd = ax * cy - az * sy, right = ax * sy + az * cy;
    const out = { pitch: clampN(-fwd / G, -0.3, 0.3), roll: clampN(right / G, -0.3, 0.3), yaw: h.yaw, h: h.p[1] };
    if (this.plan) Object.assign(out, this.plan(this.t, this));
    return out;
  }
  step(dtDisplay) {
    const dt = dtDisplay * SLOW; this.t += dt;
    const tg = this.targets();
    const upY = Math.cos(this.pitch) * Math.cos(this.roll);
    const Tsum = (M * G + DV * 4 * (tg.h - this.p[1])) / Math.max(0.5, upY);
    let Ti;
    if (!this.manual) {
      const tauP = CP * 9 * (tg.pitch - this.pitch), tauR = CP * 9 * (tg.roll - this.roll), tauY = CY * 3 * (tg.yaw - this.yaw);
      const aR = tauR / (4 * QUAD.a), aP = tauP / (4 * QUAD.a), aY = tauY / (4 * KQ);
      Ti = ROTORS.map((r) => Tsum / 4 - aR * Math.sign(r.z) + aP * Math.sign(r.x) + aY * r.dir);
    } else {
      const bT = this.boost.map((b) => TH * ((1 + b) ** 2 - 1));
      const mean = bT.reduce((a, b) => a + b, 0) / 4;
      Ti = bT.map((b) => Tsum / 4 + b - mean); // the computer still holds the height
    }
    const cmd = Ti.map((t) => clampN(Math.sqrt(Math.max(t, 0) / TH), 0.6, 1.4));
    const k = 1 - Math.exp(-dt / 0.025);
    this.s = this.s.map((s, i) => s + (cmd[i] - s) * k);
    const T = this.s.map((s) => TH * s * s);
    let tR = this.ext, tP = this.extP, tY = 0;
    ROTORS.forEach((r, i) => { tR += -r.z * T[i]; tP += r.x * T[i]; tY += r.dir * KQ * T[i]; });
    this.roll += (tR / CP) * dt; this.pitch += (tP / CP) * dt; this.yaw += (tY / CY) * dt;
    const u = this.up(), Ts = T.reduce((a, b) => a + b, 0);
    const acc = [Ts * u[0] - DH * this.v[0] + this.extF, Ts * u[1] - M * G - DV * this.v[1], Ts * u[2] - DH * this.v[2]];
    for (let j = 0; j < 3; j++) { this.v[j] += (acc[j] / M) * dt; this.p[j] += this.v[j] * dt; }
  }
}
// Forward: tip nose-down, hold, tip nose-up to brake, then hold position wherever it stops (sim seconds).
const forwardPlan = () => {
  let stopAt = null;
  const plan = (t, q) => {
    if (t < 1.05) return { pitch: -20 * DEG * sm((t - 0.05) / 0.2), roll: 0 };
    if (stopAt === null && (t < 1.15 || q.v[0] > 0.05)) return { pitch: 16 * DEG * sm((t - 1.05) / 0.15), roll: 0 };
    if (stopAt === null) { stopAt = t; q.home.p = [q.p[0], q.home.p[1], q.p[2]]; }
    plan.done = t > stopAt + 0.7;
    return {};
  };
  return plan;
};

export default {
  id: 'flying',
  kicker: 'Drones · flying',
  question: 'How does a drone steer with no wings or rudder?',
  takeaway: 'Only by changing its four propeller speeds: speed up the back pair to tilt and fly forward, and speed up one spinning pair to turn.',
  concept: { name: 'Holding the right tilt by constantly adjusting motor speeds is called attitude control', article: 'Drones and Aerial Robotics', href: 'https://robot-wiki.com/adjacent/drones/#the-autonomy-stack-on-a-flying-robot' },
  selfCheck: { q: 'Why do two propellers spin one way and two the other?', a: 'Each spinning propeller twists the drone the opposite way. With two each way the twists cancel, so it can hover without turning; speeding up one pair lets it turn on purpose.' },
  how: `<ul>
    <li>Model: a stylised quadcopter with a 400 mm motor-to-motor "X" frame. Diagonal motors spin the same way, as in the standard quad layouts in the <a href="https://docs.px4.io/main/en/airframes/airframe_reference.html" target="_blank" rel="noopener">PX4 airframe reference</a>.</li>
    <li>Physics: each propeller's lift grows with the square of its speed, and each one twists the body against its spin. The motion is simplified and slowed down about two and a half times: rotation is heavily damped, so the drone stops tilting as soon as the speeds even out. A real drone also has to brake its own rotation.</li>
    <li>Flight computer: a small cascade like real autopilots use (where to be, then what tilt, then how fast each motor spins), after the <a href="https://docs.px4.io/main/en/flight_stack/controller_diagrams.html" target="_blank" rel="noopener">PX4 controller diagrams</a>.</li>
    <li>"400 times a second": PX4's default for <code>IMU_GYRO_RATEMAX</code>, which its docs describe as "the loop rate for the rate controller and outputs" (<a href="https://docs.px4.io/main/en/advanced_config/parameter_reference.html#IMU_GYRO_RATEMAX" target="_blank" rel="noopener">PX4 parameter reference</a>). It can be set as high as 2,000 times a second.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(1.3);
    const HOME = [0, 0.55, 0], START = [-0.95, 0.55, 0];
    const geos = makeQuadGeometries();
    const quad = buildQuadcopter(stage, { geos });
    quad.root.position.set(...HOME);
    stage.world.add(quad.root);
    const sim = new QuadSim();
    const applyPose = () => { quad.root.position.set(...sim.p); quad.root.rotation.set(sim.roll, sim.yaw, sim.pitch, 'YZX'); };
    applyPose();

    // Parts for step 1.
    const P = {
      frame: { id: 'frame', kind: 'Structure', name: 'Frame', role: 'The body and four arms hold the motors at the corners. The camera marks the front.', objects: [quad.body, ...quad.arms], dir: new THREE.Vector3(0, 1, 0), dist: 0 },
      motors: { id: 'motors', kind: 'Four motors', name: 'Motors', role: 'Each spins one propeller. Motor speed is the only thing the drone can change.', objects: quad.motors, dir: new THREE.Vector3(0, 1, 0), dist: 0.075 },
      props: { id: 'props', kind: 'Four propellers', name: 'Propellers', role: 'Each pushes air down, so the air pushes the drone up. Two spin clockwise and two counter-clockwise.', objects: quad.props, dir: new THREE.Vector3(0, 1, 0), dist: 0.16 },
      battery: { id: 'battery', kind: 'Power', name: 'Battery', role: 'Stores the energy for the motors and the flight computer.', objects: [quad.battery], dir: new THREE.Vector3(0, -1, 0), dist: 0.1 },
      computer: { id: 'computer', kind: 'Electronics', name: 'Flight computer', role: 'Feels how the drone is tilted and turning, and sets each motor\'s speed many times a second.', objects: [quad.computer], dir: new THREE.Vector3(0, 1, 0), dist: 0.12 },
    };
    const model = new ExplodedModel(stage, quad.root, Object.values(P));

    // Thrust arrows (act colour), one per rotor, riding on the body so they tilt with it.
    const UP = new THREE.Vector3(0, 1, 0);
    const thrust = ROTORS.map((r) => { const a = shapes.arrow(stage, 'act', 0.0055); quad.root.add(a); a.base = new THREE.Vector3(r.x, 0.072, r.z); a.visible = false; return a; });
    const arrowLen = (i) => QUAD.hoverArrow * sim.s[i] * sim.s[i];
    const weight = shapes.arrow(stage, 'act', 0.008); weight.visible = false; stage.world.add(weight);
    // Spin-direction arcs over each propeller.
    const spinArcs = ROTORS.map((r) => { const a = arcArrow(stage, 'ref', { r: 0.13, phi0: Math.atan2(r.z, r.x), span: 1.5, dir: r.dir, tube: 0.0026, head: 0.016 }); a.position.set(r.x, QUAD.propY + 0.014, r.z); a.visible = false; quad.root.add(a); return a; });
    // Turning arrow around the drone (stays level, follows the drone).
    const yawArc = arcArrow(stage, 'act', { r: 0.42, phi0: Math.PI / 2 + 1.05, span: 2.1, dir: -1, tube: 0.006, head: 0.05 });
    yawArc.visible = false; stage.world.add(yawArc);
    // Gust arrow for step 5.
    const gust = shapes.arrow(stage, 'act', 0.01); gust.visible = false; stage.world.add(gust);
    // Ghost copies for the strobe of the forward flight.
    const ghosts = [0, 1, 2].map(() => { const g = buildQuadcopter(stage, { geos, mat: stage.mats.ref, lite: true }); g.root.visible = false; stage.world.add(g.root); return g; });

    const v3 = () => new THREE.Vector3();
    const at = (obj, off = [0, 0, 0]) => () => obj.localToWorld(v3().set(...off));
    const L = {
      motor: stage.label('Motor', at(quad.motors[0], [0, 0.03, 0])).show(false),
      battery: stage.label('Battery', at(quad.battery, [0, -0.02, 0])).show(false),
      computer: stage.label('Flight computer', at(quad.computer)).show(false),
      cw: stage.label('Clockwise', at(quad.props[2], [0, 0.01, 0])).show(false),
      ccw: stage.label('Counter-clockwise', at(quad.props[0], [0, 0.01, 0])).show(false),
      lift: stage.label('Lift', () => quad.root.localToWorld(v3().set(ROTORS[0].x, 0.072 + arrowLen(0), ROTORS[0].z)), { tone: 'act' }).show(false),
      weight: stage.label('Weight', () => weight.visible ? weight.position.clone().add(new THREE.Vector3(0.12, -0.36, 0)) : null, { tone: 'act' }).show(false),
      front: stage.label('Front pair', () => quad.root.localToWorld(v3().set(QUAD.a, 0.08 + Math.max(arrowLen(0), arrowLen(2)), 0))).show(false),
      back: stage.label('Back pair', () => quad.root.localToWorld(v3().set(-QUAD.a, 0.08 + Math.max(arrowLen(1), arrowLen(3)), 0))).show(false),
      pair: stage.label('Clockwise pair speeds up', at(quad.props[2], [0, 0.02, 0]), { tone: 'focus' }).show(false),
      turn: stage.label('Drone turns the other way', () => yawArc.localToWorld(yawArc.tip.clone()), { tone: 'act' }).show(false),
      gust: stage.label('Gust', () => gust.position.clone(), { tone: 'act' }).show(false),
      fc: stage.label('Flight computer', at(quad.computer, [0, 0.01, 0]), { tone: 'focus' }).show(false),
    };
    const hideLabels = () => Object.values(L).forEach((l) => l.show(false));

    // ---------- Controls ----------
    let onPreset = () => {};
    const tryIt = ui.choice({ label: 'Try', value: null,
      options: [{ id: 'hover', label: 'Hover' }, { id: 'climb', label: 'Climb' }, { id: 'forward', label: 'Forward' }, { id: 'turn', label: 'Turn' }, { id: 'adjust', label: 'Adjust' }],
      onChange: (id) => onPreset(id) });
    const segs = [...tryIt.el.querySelectorAll('.seg')];
    const showOpts = (ids) => {
      tryIt.show(!!ids.length);
      const vis = segs.filter((b) => ids.includes(b.dataset.id));
      segs.forEach((b) => { b.hidden = !ids.includes(b.dataset.id); b.style.borderRadius = ''; });
      vis.forEach((b, i) => { b.style.borderRadius = vis.length === 1 ? '6px' : i === 0 ? '6px 0 0 6px' : i === vis.length - 1 ? '0 6px 6px 0' : '0'; });
    };
    const again = ui.button('Fly forward again', () => onAgain());
    let onAgain = () => {};
    again.show(false); showOpts([]);

    // ---------- Camera framing that fits both wide and tall stages ----------
    const frame = (target, dir, hw, hh, dur = 1.1) => {
      const cam = stage.camera, vf = THREE.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
      const d = Math.max(hw / Math.tan(hf / 2), hh / Math.tan(vf / 2)) * 1.06 + hw * 0.25;
      const D = new THREE.Vector3(...dir).normalize();
      return stage.view(target, new THREE.Vector3(...target).addScaledVector(D, d), dur);
    };

    // ---------- Frame loop: simulate, pose, arrows, spin, narrate ----------
    let epoch = 0, running = false, narrate = null, lastMsg = '', strobe = null, guardOn = false, suffix = '', gustOn = false, follow = false, recovering = false;
    const narrow = () => stage.camera.aspect < 1.1;
    const say = (html) => { if (html !== lastMsg) { lastMsg = html; ui.readout(html); } };
    const pairs = () => { const s = sim.s; return { front: (s[0] + s[2]) / 2, back: (s[1] + s[3]) / 2, cw: (s[2] + s[3]) / 2, ccw: (s[0] + s[1]) / 2, right: (s[0] + s[3]) / 2, left: (s[1] + s[2]) / 2, mean: (s[0] + s[1] + s[2] + s[3]) / 4 }; };
    const describe = () => {
      const q = pairs(), p = sim.pitch / DEG, r = sim.roll / DEG;
      if (gustOn) return sim.extP ? 'A gust tips it over.' : Math.abs(p) > 1 || Math.abs(r) > 1 ? 'The flight computer speeds up the low side to push it back to level.' : 'Level again, and back to equal speeds.';
      if (q.cw - q.ccw > 0.02) return 'Clockwise pair faster, the other pair slower: their twists no longer cancel, so the drone turns the other way.';
      if (q.ccw - q.cw > 0.02) return 'Counter-clockwise pair faster: the drone turns the other way.';
      if (Math.abs(q.right - q.left) > 0.02) return 'The low side speeds up to push the drone back to level.';
      if (q.back - q.front > 0.02) return p > 3 ? 'Back pair faster: it tips back to level.' : 'Back pair faster: the nose dips.';
      if (q.front - q.back > 0.02) return p < -3 ? 'Front pair faster: it tips nose-up to brake.' : 'Front pair faster: the nose lifts.';
      if (p < -4) return 'All four equal again. Tilted forward, part of the lift now pushes it forward.';
      if (p > 4) return 'Tilted back, part of the lift pushes backward, so it slows down.';
      if (Math.abs(r) > 4) return 'Tilted sideways, it slides.';
      if (q.mean > 1.015) return 'All four faster: it climbs.';
      if (q.mean < 0.985) return 'All four slower: it sinks.';
      return 'All four at the same speed: it hovers. Together they lift exactly its weight.';
    };
    const adjustText = () => {
      const b = sim.boost;
      if (!b.some((x) => x > 0)) return 'Tap a propeller to speed it up. Tap again to slow it back down.';
      let pitch = 0, right = 0, cw = 0;
      ROTORS.forEach((r, i) => { pitch += b[i] * Math.sign(r.x); right += b[i] * Math.sign(r.z); cw += b[i] * r.dir; });
      const fx = [];
      if (pitch < 0) fx.push('the nose dips and it moves forward'); else if (pitch > 0) fx.push('the nose lifts and it moves backward');
      if (right > 0) fx.push('it tips and slides left'); else if (right < 0) fx.push('it tips and slides right');
      if (cw > 0) fx.push('it turns left'); else if (cw < 0) fx.push('it turns right');
      const names = ROTORS.filter((r, i) => b[i] > 0).map((r) => r.name.toLowerCase()).join(', ');
      return `Faster: ${names}. So ${fx.join(', and ') || 'the pushes cancel out'}.`;
    };

    stage.onFrame((dt) => {
      if (!running) return;
      if (!sim.frozen) sim.step(dt); else sim.s = sim.s.map((s) => s + (1 - s) * Math.min(1, dt * 6));
      applyPose();
      thrust.forEach((a, i) => a.set(a.base, UP, arrowLen(i)));
      quad.props.forEach((p, i) => { p.rotation.y += -ROTORS[i].dir * 10 * sim.s[i] * dt; });
      if (weight.visible) weight.set(new THREE.Vector3(sim.p[0], sim.p[1] - 0.07, sim.p[2]), new THREE.Vector3(0, -1, 0), 0.4);
      yawArc.position.set(sim.p[0], sim.p[1] + 0.03, sim.p[2]);
      if (strobe) strobe(dt);
      if (follow) { const dx = (sim.p[0] - stage.controls.target.x) * Math.min(1, dt * 2.5); stage.controls.target.x += dx; stage.camera.position.x += dx; }
      // Adjust mode safety net: past a steep tilt or the edge of the stage, the flight computer takes
      // back control, flies home and levels out, then hands the propellers back to the reader.
      if (guardOn && sim.manual && (Math.abs(sim.pitch) > 25 * DEG || Math.abs(sim.roll) > 25 * DEG || Math.abs(sim.p[0]) > 0.85 || Math.abs(sim.p[2]) > 0.7)) {
        sim.manual = false; sim.boost = [0, 0, 0, 0]; sim.home = { p: [...HOME], yaw: sim.yaw }; recovering = true;
        spinArcs.forEach((a) => a.setRole('ref'));
        narrate = () => 'Too far over: the flight computer took back control and is flying it home.';
      }
      if (recovering && Math.hypot(sim.p[0] - HOME[0], sim.p[1] - HOME[1], sim.p[2] - HOME[2]) < 0.04 && Math.hypot(...sim.v) < 0.04 && Math.abs(sim.pitch) + Math.abs(sim.roll) < 2 * DEG) {
        recovering = false; sim.manual = true; narrate = () => (sim.manual ? adjustText() : describe());
      }
      if (narrate) say(narrate() + suffix);
    });

    // ---------- Shared helpers ----------
    const showThrust = (v) => thrust.forEach((a) => { a.visible = v; });
    const spinning = (v) => { running = v; quad.discs.forEach((d) => { d.visible = v; }); if (!v) { thrust.forEach((a) => { a.visible = false; }); } };
    const reset = (p = HOME) => {
      epoch++; strobe = null; narrate = null; lastMsg = ''; guardOn = false; suffix = ''; gustOn = false; follow = false; recovering = false;
      sim.reset(p); applyPose();
      hideLabels(); ui.readout(''); ui.hint(''); ui.card(null);
      showThrust(false); weight.visible = false; yawArc.visible = false; gust.visible = false;
      spinArcs.forEach((a) => { a.visible = false; a.setRole('ref'); });
      ghosts.forEach((g) => { g.root.visible = false; });
      model.select(null); model.setExplode(0);
      showOpts([]); tryIt.set(null); again.show(false); onPreset = () => {}; onAgain = () => {};
      tapMode = null; stage.hoverPick(() => null);
      return epoch;
    };
    // Glide back to a start pose (not simulated), then hand over to the physics.
    const rewind = async (to, yaw = 0) => {
      const my = epoch; sim.frozen = true; sim.plan = null; sim.manual = false; strobe = null;
      const p0 = [...sim.p], y0 = sim.yaw, pi0 = sim.pitch, r0 = sim.roll;
      const far = Math.hypot(p0[0] - to[0], p0[1] - to[1], p0[2] - to[2]) + Math.abs(y0 - yaw) * 0.3 + Math.abs(pi0) + Math.abs(r0);
      if (far > 0.02) await stage.tween(Math.min(1.3, 0.5 + far * 0.5), (k) => { if (my !== epoch) return; sim.p = p0.map((v, i) => lerp(v, to[i], k)); sim.yaw = lerp(y0, yaw, k); sim.pitch = lerp(pi0, 0, k); sim.roll = lerp(r0, 0, k); });
      if (my !== epoch) return false;
      sim.reset(to, yaw); return true;
    };
    const runForward = async () => {
      ghosts.forEach((g) => { g.root.visible = false; });
      follow = narrow();
      if (!(await rewind(START))) return;
      const plan = forwardPlan(); sim.plan = plan;
      const times = [0, 1.9, 3.2]; let clock = 0, n = 0;
      strobe = (dt) => {
        clock += dt;
        while (n < times.length && clock >= times[n]) { const g = ghosts[n++]; g.root.position.copy(quad.root.position); g.root.quaternion.copy(quad.root.quaternion); g.root.visible = true; }
        if (plan.done) { strobe = null; sim.plan = null; narrate = () => 'It tipped nose-down to go and nose-up to stop. Only the four speeds changed.'; }
      };
      narrate = describe;
    };
    const runTurn = async () => {
      if (!(await rewind(HOME, 0))) return;
      sim.plan = (t) => ({ yaw: 90 * DEG * sm(t / 1.0) });
      narrate = () => (Math.abs(sim.yaw - 90 * DEG) < 3 * DEG && Math.abs(pairs().cw - pairs().ccw) < 0.01 ? 'Speeds equal again: the turn stops. It now faces left.' : describe());
    };
    const runClimb = async (h) => {
      const from = sim.p[1];
      sim.plan = (t) => ({ h: lerp(from, h, sm(t / 1.0)) }); sim.t = 0;
      narrate = describe;
    };

    // Taps: parts in step 1, propellers in Adjust.
    let tapMode = null;
    const propPick = (ray) => { const hit = ray.intersectObjects(quad.discs, false)[0]; return hit ? quad.discs.indexOf(hit.object) : -1; };
    const offClick = stage.onClick((ray) => {
      if (tapMode === 'parts') { const p = model.pick(ray); model.select(p === model.selected ? null : p); ui.card(model.selected ? p : null); }
      if (tapMode === 'props' && sim.manual) {
        const i = propPick(ray); if (i < 0) return;
        sim.boost[i] = sim.boost[i] > 0 ? 0 : 0.05;
        spinArcs[i].setRole(sim.boost[i] > 0 ? 'focus' : 'ref');
      }
    });
    // A gust tips the drone; the flight computer levels it again. The arrow stays until it is level.
    let gustToken = 0;
    const pushGust = async () => {
      const my = epoch, tok = ++gustToken;
      follow = false;
      const view = narrow() ? frame([-0.17, 0.54, 0], [0.32, 0.3, 1], 0.64, 0.34, 1.0) : frame([-0.12, 0.54, 0], [0.32, 0.3, 1], 0.6, 0.34, 1.0);
      if (!(await rewind(HOME, 0))) return;
      await view;
      if (my !== epoch || tok !== gustToken) return;
      tryIt.set(null); guardOn = false; tapMode = null; ui.hint('');
      ghosts.forEach((gh) => { gh.root.visible = false; });
      spinArcs.forEach((a) => { a.visible = false; });
      gust.visible = true; L.gust.show(true); gustOn = true; narrate = describe;
      gust.set(new THREE.Vector3(HOME[0] - 0.66, HOME[1] + 0.03, HOME[2]), new THREE.Vector3(1, 0, 0), 0.32);
      sim.extP = -0.7; sim.extF = 1.5;
      await new Promise((r) => setTimeout(r, 320)); sim.extP = 0; sim.extF = 0;
      if (my !== epoch || tok !== gustToken) return;
      // Keep a faint copy of the most tipped moment, so the correction stays readable after it ends.
      const t0 = performance.now(); let most = 0; const g = ghosts[0];
      const off = stage.onFrame(() => {
        if (my !== epoch || tok !== gustToken) { off(); return; }
        if (Math.abs(sim.pitch) > most) { most = Math.abs(sim.pitch); g.root.position.copy(quad.root.position); g.root.quaternion.copy(quad.root.quaternion); g.root.visible = most > 4 * DEG; }
        if (performance.now() - t0 > 1500 && Math.abs(sim.pitch) < 1 * DEG) off();
      });
    };
    const startAdjust = async () => {
      if (!(await rewind(HOME, 0))) return;
      sim.manual = true; sim.boost = [0, 0, 0, 0]; guardOn = true; follow = narrow();
      spinArcs.forEach((a) => { a.visible = true; a.setRole('ref'); });
      tapMode = 'props'; stage.hoverPick((ray) => propPick(ray) >= 0);
      ui.hint('Tap a propeller');
      narrate = () => (sim.manual ? adjustText() : describe());
    };

    stage.camera.position.set(1.1, 1.3, 1.5); stage.controls.target.set(0, 0.58, 0);

    return {
      steps: [
        { text: 'Four motors, a battery and a flight computer. Two propellers spin clockwise and two counter-clockwise.',
          enter: async () => {
            const my = reset(HOME); spinning(false);
            tapMode = 'parts'; stage.hoverPick((ray) => model.pick(ray)); ui.hint('Tap a part');
            frame([0, 0.6, 0], [0.75, 0.6, 1], 0.36, 0.25, 1.1);
            await model.animateExplode(1, 0.9); if (my !== epoch) return;
            L.motor.show(true); L.battery.show(true); L.computer.show(true);
            await new Promise((r) => setTimeout(r, 1700)); if (my !== epoch) return;
            L.motor.show(false); L.battery.show(false); L.computer.show(false);
            await model.animateExplode(0, 0.9); if (my !== epoch) return;
            spinArcs.forEach((a) => { a.visible = true; });
            L.cw.show(true); L.ccw.show(true);
          },
          leave: () => { tapMode = null; model.select(null); ui.card(null); ui.hint(''); } },

        { text: 'Spin all four at the same speed and it hovers: together they lift exactly its weight. Faster together, it climbs.',
          enter: async () => {
            reset(HOME); spinning(true); showThrust(true); weight.visible = true;
            L.lift.show(true); L.weight.show(true);
            showOpts(['hover', 'climb']); tryIt.set('hover');
            onPreset = (id) => runClimb(id === 'climb' ? 0.95 : HOME[1]);
            narrate = describe;
            await frame([0, 0.55, 0], [0.55, 0.22, 1], 0.42, 0.52, 1.1);
          } },

        { text: 'Now fly forward. No propeller points forward, so something else has to push it that way.',
          enter: async () => {
            const my = reset(START); spinning(true); showThrust(true);
            L.front.show(true); L.back.show(true);
            narrate = describe;
            await (narrow() ? frame([START[0] + 0.2, 0.56, 0], [0, 0.16, 1], 0.55, 0.3, 1.1) : frame([0, 0.56, 0], [0, 0.16, 1], 1.3, 0.34, 1.1)); if (my !== epoch) return;
            await ui.predict({ question: 'To fly forward, which propellers speed up?', answer: 'back',
              options: [{ id: 'front', label: 'The front two' }, { id: 'back', label: 'The back two' }, { id: 'all', label: 'All four' }],
              explain: 'The back two. The nose dips, and the tilted lift now pushes forward as well as up. To stop, the front two speed up.' });
            if (my !== epoch) return;
            onAgain = () => runForward(); again.set('Fly forward again');
            await runForward(); if (my === epoch) again.show(true);
          } },

        { text: 'To turn, speed up one spinning pair and slow the other. Their extra twist turns the whole drone the opposite way.',
          enter: async () => {
            const my = reset(HOME); spinning(true); showThrust(true);
            spinArcs.forEach((a, i) => { a.visible = true; a.setRole(ROTORS[i].dir > 0 ? 'focus' : 'ref'); });
            yawArc.visible = true; L.pair.show(true); L.turn.show(true);
            narrate = describe;
            await frame([0, 0.5, 0], [0.4, 1.25, 0.95], 0.56, 0.5, 1.1); if (my !== epoch) return;
            onAgain = () => runTurn(); again.set('Turn again'); again.show(true);
            await runTurn();
          } },

        { text: 'The flight computer rebalances the four speeds hundreds of times a second to hold the tilt it wants. This is attitude control.',
          enter: async () => {
            reset(HOME); spinning(true); showThrust(true);
            model.highlight([P.computer], 'focus'); L.fc.show(true);
            suffix = `<br>PX4, open-source flight software used on many drones, runs this correction <b>${RATE_HZ} times a second</b> by default.`;
            narrate = () => (sim.manual ? adjustText() : describe());
            showOpts(['climb', 'forward', 'turn', 'adjust']);
            onPreset = async (id) => {
              guardOn = false; sim.manual = false; tapMode = null; ui.hint(''); stage.hoverPick(() => null);
              spinArcs.forEach((a) => { a.visible = false; a.setRole('ref'); });
              ghosts.forEach((g) => { g.root.visible = false; });
              gustToken++; gustOn = false; follow = false; recovering = false; gust.visible = false; L.gust.show(false);
              frame(...(id === 'forward' ? (narrow() ? [[START[0] + 0.2, 0.56, 0], [0.2, 0.25, 1], 0.55, 0.32] : [[0, 0.56, 0], [0.3, 0.3, 1], 1.2, 0.36])
                : id === 'climb' ? [[0, 0.75, 0], [0.5, 0.3, 1], 0.6, 0.45]
                : id === 'adjust' ? [[0, 0.5, 0], [0.5, 0.75, 1], narrow() ? 0.62 : 1.0, 0.42]
                : [[0, 0.52, 0], [0.5, 0.6, 1], 0.6, 0.36]), 0.9);
              if (id === 'climb') { if (await rewind(HOME)) runClimb(0.95); }
              if (id === 'forward') await runForward();
              if (id === 'turn') await runTurn();
              if (id === 'adjust') await startAdjust();
            };
            onAgain = () => pushGust(); again.set('Gust again'); again.show(true);
            await pushGust();
          },
          leave: () => { model.select(null); } },
      ],
      dispose() { offClick(); },
    };
  },
};
