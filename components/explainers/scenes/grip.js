// Touch 8: Holding without slipping. Takeaway: a pinch holds only if each finger pushes within a narrow
// cone set by friction; tilt the grip so the line between the fingers leaves the cones and the object slides out.
import { THREE, shapes, lerp, clamp, ease, reduceMotion } from '../kit.js';
import { makeGripper } from '../models/gripper.js';
import { EXPLAINER_WORDS } from '../words.ts';

const DEG = Math.PI / 180;
const W = 0.05, H = 0.08, D = 0.045;          // the block, in metres
const R = 0.006;                               // radius of the rubber ball fingertips
const HOLD = new THREE.Vector3(0, 0.092, 0);   // block centre while held
const REST_Y = H / 2;                          // block centre when it sits on the table
const CONE_H = 0.04;                           // drawn length of each cone
const MAX_TILT = 40 * DEG;
const TRY_TILT = 25 * DEG;                     // the tilt the reader is asked about
// Friction coefficients (see "How this was made"). Half-angle of each cone = atan(coefficient).
const SURF = { rubber: { mu: 1.0, name: 'Rubber' }, plastic: { mu: 0.3, name: 'Plastic' }, ice: { mu: 0.1, name: 'Ice' } };
const gapFor = (th) => (2 * (W / 2 + R)) / Math.cos(th);           // ball-centre spacing that just touches both faces
const lineAngle = (th) => Math.atan(((W / 2 + R) / (W / 2)) * Math.tan(Math.abs(th))); // squeeze line vs face normal

// Wall-clock animation, so motion keeps its timing on slow machines. A new step silences older animations.
function animator(stage) {
  let gen = 0;
  const now = () => performance.now() / 1000;
  const A = {
    next: () => ++gen,
    alive: (my) => my === gen,
    run(d, fn) {
      const my = gen;
      return new Promise((res) => {
        if (reduceMotion || d <= 0) { fn(1); res(); return; }
        const t0 = now();
        const off = stage.onFrame(() => {
          if (my !== gen) { off(); res(); return; }
          const k = Math.min(1, (now() - t0) / d); fn(ease(k));
          if (k >= 1) { off(); res(); }
        });
      });
    },
    wait: (s) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : s * 1000)),
    // Ease the camera to look at `target` from `dir` (a direction), backed off far enough to fit halfW x halfH metres.
    frame(target, dir, halfW, halfH, d = 1.0) {
      const t = Math.tan((stage.camera.fov / 2) * DEG), dist = 1.08 * Math.max(halfH / t, halfW / (t * stage.camera.aspect));
      const T = new THREE.Vector3(...target), P = T.clone().addScaledVector(new THREE.Vector3(...dir).normalize(), dist);
      const t0 = stage.controls.target.clone(), p0 = stage.camera.position.clone();
      return A.run(d, (k) => { stage.controls.target.lerpVectors(t0, T, k); stage.camera.position.lerpVectors(p0, P, k); });
    },
  };
  return A;
}


const STEP_TEXT = EXPLAINER_WORDS.grip.steps;

export default {
  id: 'grip',
  how: `<ul>
    <li>The rule: two fingertips can hold an object against any push or pull only if the line between the two contacts lies inside both friction cones (V.-D. Nguyen, <a href="https://doi.org/10.1177/027836498800700301" target="_blank" rel="noopener">"Constructing force-closure grasps"</a>, International Journal of Robotics Research, 1988). The scene checks exactly that condition as you tilt.</li>
    <li>Cone widths: each cone opens to the angle whose tangent is the friction coefficient. Rubber (1.0) and ice (0.1) are the static coefficients for rubber on dry concrete and ice on ice in <a href="https://openstax.org/books/college-physics-2e/pages/5-1-friction" target="_blank" rel="noopener">OpenStax College Physics 2e, Table 5.1</a>. Plastic (0.3) is the measured sliding friction of 3D-printed PLA on steel (Ramadan et al., <a href="https://www.tribology.rs/journals/2023/2023-1/13-1410.pdf" target="_blank" rel="noopener">Tribology in Industry, 2023</a>). Real values depend on both surfaces, so treat them as typical values.</li>
    <li>Why it matters: FIRMGrasp (Enwerem, Baras and Belta, <a href="https://arxiv.org/abs/2607.25049" target="_blank" rel="noopener">arXiv 2607.25049</a>, 2026) tested 1,599 LEAP Hand and Allegro Hand grasps and found that "53% of the nominally force-closed grasps lose closure in the adverse friction tail", that is, when friction is at the low end of what is plausible.</li>
    <li>Model: a stylised parallel gripper with rubber ball fingertips, so each finger touches the block at one point. The block is 5 cm wide. The slip is animated to show the outcome; it is not a physics simulation.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.32);
    const M = stage.mats;
    const A = animator(stage);

    // ---------- Gripper ----------
    const grip = makeGripper(stage, { pad: 'round', fingerLength: 0.075, padRadius: R });
    stage.world.add(grip.root);
    const knob = new THREE.Object3D(); knob.position.y = 0.105; grip.root.add(knob); // drag anchor on the housing

    // ---------- Block ----------
    const block = new THREE.Group();
    const solid = shapes.mesh(shapes.box(W, H, D, 0.004), M.clay);
    const glassMat = stage.material('clay', { opacity: 0.42 });
    const glass = shapes.mesh(shapes.box(W, H, D, 0.004), glassMat, { cast: true, receive: false });
    glass.renderOrder = 1;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), stage.lineMaterial('dim', { opacity: 0.55 }));
    block.add(solid, glass, edges);
    stage.world.add(block);
    const blockPos = HOLD.clone(); let blockRot = 0;
    const setSee = (through) => { solid.visible = !through; glass.visible = through; edges.visible = through; };

    // ---------- Friction cones: apex at each contact, opening into the block along the face normal ----------
    const coneMats = { ok: stage.material('focus', { opacity: 0.3 }), bad: stage.material('fail', { opacity: 0.3 }) };
    const edgeMats = { ok: stage.lineMaterial('focus'), bad: stage.lineMaterial('fail') };
    const unitCone = new THREE.ConeGeometry(1, 1, 48, 1, true); unitCone.translate(0, -0.5, 0); // apex at origin, opens along -y
    const vGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, -1, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, -1, 0)]);
    const rimGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return new THREE.Vector3(Math.cos(a), -1, Math.sin(a)); }));
    const cones = [1, -1].map((nx) => {
      const g = new THREE.Group();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(nx, 0, 0));
      const s = new THREE.Group(); g.add(s);
      const mesh = new THREE.Mesh(unitCone, coneMats.ok); mesh.renderOrder = 2;
      const v = new THREE.Line(vGeo, edgeMats.ok), rim = new THREE.Line(rimGeo, edgeMats.ok);
      s.add(mesh, v, rim);
      stage.world.add(g);
      return { g, s, mesh, lines: [v, rim] };
    });
    let alpha = Math.atan(SURF.plastic.mu); // current cone half-angle (animated)
    let coneGrow = 0;                        // 0..1, for the cones' entrance

    // ---------- Squeeze line between the contacts ----------
    const lineMats = { ok: stage.material('ink'), bad: stage.material('fail') };
    const squeeze = shapes.mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 10), lineMats.ok, { cast: false, receive: false });
    const dots = [0, 1].map(() => shapes.mesh(shapes.sphere(0.0024, 16), lineMats.ok, { cast: false, receive: false }));
    stage.world.add(squeeze, ...dots);

    // ---------- State ----------
    let theta = 0, surface = 'plastic', mode = 'script', showLine = false, showCones = false;
    let blockState = 'held', anim = null; // anim: { kind: 'fall' | 'rise', t, from, rot0 }
    let forceBad = false, lastReadout = '', readoutTail = '';
    const alive = A.alive, run = A.run, wait = A.wait;

    const contacts = () => {
      const s = gapFor(theta) / 2, c = Math.cos(theta), sn = Math.sin(theta), G = grip.root.position;
      return [new THREE.Vector3(G.x - s * c + R, G.y - s * sn, 0), new THREE.Vector3(G.x + s * c - R, G.y + s * sn, 0)];
    };
    const holds = () => lineAngle(theta) <= alpha + 1e-4;
    const applyGrip = () => { grip.root.rotation.z = theta; grip.setGap(gapFor(theta)); };

    // Labels (at most three on stage at once).
    // Plain when it holds: the cones carry the step's one colour, and only a slip turns red.
    const status = stage.label('Holds', () => new THREE.Vector3(blockPos.x, Math.max(blockPos.y - H / 2 - 0.016, 0.014), D / 2), { tone: 'plain' }).show(false);
    const coneLabel = stage.label('Fingertip cone', () => { const [a] = contacts(); return a.add(new THREE.Vector3(CONE_H * 0.55, CONE_H * Math.tan(alpha) * 0.7 * coneGrow, 0)); }, { tone: 'focus' }).show(false);
    const lineLabel = stage.label('Line between fingertips', () => { const [a, b] = contacts(); return a.lerp(b, 0.78).add(new THREE.Vector3(0, 0.004, 0)); }, { tone: 'plain' }).show(false);
    let statusOn = false;

    // Controls: tilt (with drag), surface.
    const tilt = ui.slider({ label: 'Tilt', left: 'Straight', right: 'Tilted', min: 0, max: 40, step: 1, value: 0, onInput: (v) => setTilt((theta < 0 ? -1 : 1) * v * DEG) });
    const surf = ui.choice({ label: 'Surface', value: 'plastic', options: Object.entries(SURF).map(([id, s]) => ({ id, label: s.name })), onChange: (id) => setSurface(id) });
    tilt.show(false); surf.show(false);
    const setTilt = (th) => { theta = clamp(th, -MAX_TILT, MAX_TILT); applyGrip(); tilt.set(Math.round(Math.abs(theta) / DEG)); };
    let surfTween = 0;
    const setSurface = (id, d = 0.55) => {
      surface = id; surf.set(id);
      const from = alpha, to = Math.atan(SURF[id].mu), my = ++surfTween;
      const t0 = performance.now();
      return new Promise((res) => { const off = stage.onFrame(() => { const k = reduceMotion ? 1 : Math.min(1, (performance.now() - t0) / (d * 1000)); if (my === surfTween) alpha = lerp(from, to, ease(k)); if (k >= 1 || my !== surfTween) { off(); res(); } }); });
    };
    const drag = stage.draggable(knob, { handle: grip.root, plane: 'vertical',
      onMove: (q) => setTilt(Math.atan2(-(q.x - HOLD.x), Math.max(0.01, q.y - HOLD.y))) });
    drag.enable(false);

    // Slip and re-grab, in live mode.
    const startAnim = (kind) => { anim = { kind, t: 0, from: blockPos.clone(), rot0: blockRot, dir: Math.sign(theta) || 1 }; blockState = kind === 'fall' ? 'falling' : 'rising'; };
    let last = performance.now();
    stage.onFrame(() => {
      const nowMs = performance.now(), dt = Math.min(0.25, (nowMs - last) / 1000); last = nowMs;
      if (mode === 'live') {
        const ok = holds();
        if (!ok && (blockState === 'held' || blockState === 'rising')) startAnim('fall');
        if (ok && (blockState === 'down' || blockState === 'falling')) startAnim('rise');
      }
      if (anim) {
        if (anim.kind === 'fall') {
          anim.t = Math.min(1, anim.t + dt / 0.7); const t = anim.t;
          blockPos.set(anim.from.x - anim.dir * 0.012 * t, lerp(anim.from.y, REST_Y, t * t), 0);
          blockRot = lerp(anim.rot0, 0, t) + anim.dir * 0.16 * Math.sin(Math.PI * t);
          if (t >= 1) { anim = null; blockState = 'down'; blockRot = 0; }
        } else {
          anim.t = Math.min(1, anim.t + dt / 0.6); const k = ease(anim.t);
          blockPos.lerpVectors(anim.from, HOLD, k); blockRot = lerp(anim.rot0, 0, k);
          if (anim.t >= 1) { anim = null; blockState = 'held'; }
        }
      }
      block.position.copy(blockPos); block.rotation.z = blockRot;

      // Cones, squeeze line and colours follow the grip.
      const [a, b] = contacts();
      const bad = mode === 'live' ? !holds() : false;
      const showBad = bad || forceBad;
      cones.forEach((c, i) => {
        c.g.position.copy(i ? b : a); c.g.visible = showCones && coneGrow > 0.001;
        const r = Math.tan(alpha) * CONE_H * coneGrow; c.s.scale.set(r, CONE_H * coneGrow, r);
        c.mesh.material = showBad ? coneMats.bad : coneMats.ok; c.lines.forEach((l) => { l.material = showBad ? edgeMats.bad : edgeMats.ok; });
      });
      const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
      squeeze.position.copy(mid); squeeze.scale.set(1, len, 1);
      squeeze.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      squeeze.visible = showLine; dots[0].position.copy(a); dots[1].position.copy(b); dots.forEach((d) => { d.visible = showLine; });
      const lm = showBad ? lineMats.bad : lineMats.ok; squeeze.material = lm; dots.forEach((d) => { d.material = lm; });

      if (statusOn) { const ok = !showBad && blockState !== 'down'; status.set(ok ? 'Holds' : 'Slips').tone(ok ? 'plain' : 'fail'); }
      if (mode === 'live') {
        const phi = Math.round(lineAngle(theta) / DEG), al = Math.round(alpha / DEG);
        const html = `The line between the fingertips leans <b>${phi}°</b>; each ${SURF[surface].name.toLowerCase()} cone allows up to <b>${al}°</b>. Both are measured from straight across.${readoutTail}`;
        if (html !== lastReadout) { ui.readout(html); lastReadout = html; }
      }
    });

    // Put everything in a known state; every step starts from here.
    const reset = () => {
      mode = 'script'; anim = null; forceBad = false; lastReadout = ''; readoutTail = '';
      drag.enable(false); tilt.show(false); surf.show(false); ui.hint(''); ui.readout('');
      status.show(false); coneLabel.show(false); lineLabel.show(false); statusOn = false;
      showLine = false; showCones = false; coneGrow = 0;
      surfTween++; surface = 'plastic'; alpha = Math.atan(SURF.plastic.mu); surf.set('plastic');
      grip.root.position.copy(HOLD); setTilt(0);
      blockPos.copy(HOLD); blockRot = 0; blockState = 'held'; setSee(false);
    };
    const growCones = (d = 0.8) => { showCones = true; const from = coneGrow; return run(d, (k) => { coneGrow = lerp(from, 1, k); }); };
    const goLive = () => { mode = 'live'; drag.enable(true); tilt.show(true); ui.hint('Drag the gripper to tilt it'); };

    stage.camera.position.set(0.12, 0.19, 0.52); stage.controls.target.set(0, 0.115, 0);

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => {
            const my = A.next(); reset(); stage.focus(...grip.fingers, block);
            blockPos.set(0, REST_Y, 0); blockState = 'down';
            grip.root.position.set(0, REST_Y + 0.1, 0); grip.setGap(0.096);
            A.frame([0, 0.15, 0], [0.22, 0.14, 1], 0.075, 0.15);
            await run(0.7, (k) => { grip.root.position.y = lerp(REST_Y + 0.1, REST_Y, k); }); if (!alive(my)) return;
            await run(0.35, (k) => grip.setGap(lerp(0.096, gapFor(0), k))); if (!alive(my)) return;
            await run(0.8, (k) => { const y = lerp(REST_Y, HOLD.y, k); grip.root.position.y = y; blockPos.y = y; }); if (!alive(my)) return;
            blockState = 'held'; statusOn = true; status.show(true);
          } },
        { text: STEP_TEXT[1],
          enter: async () => {
            const my = A.next(); reset(); stage.focus(block, ...cones.map((c) => c.g)); setSee(true);
            A.frame([0, HOLD.y + 0.012, 0], [0.1, 0.1, 1], 0.07, 0.068);
            await growCones(0.9); if (!alive(my)) return;
            coneLabel.show(true);
          } },
        { text: STEP_TEXT[2],
          enter: async () => {
            const my = A.next(); reset(); stage.focus(...grip.fingers, block, ...cones.map((c) => c.g)); setSee(true);
            blockPos.set(0, REST_Y, 0); blockState = 'down';
            grip.root.position.set(0, REST_Y + 0.1, 0); grip.setGap(0.11);
            A.frame([0, 0.1, 0], [0.12, 0.12, 1], 0.075, 0.112);
            await run(0.6, (k) => { theta = lerp(0, TRY_TILT, k); grip.root.rotation.z = theta; }); if (!alive(my)) return;
            await run(0.6, (k) => { grip.root.position.y = lerp(REST_Y + 0.1, REST_Y, k); }); if (!alive(my)) return;
            await run(0.35, (k) => grip.setGap(lerp(0.11, gapFor(theta), k))); if (!alive(my)) return;
            setTilt(TRY_TILT);
            await growCones(0.5); if (!alive(my)) return;
            await ui.predict({ question: 'When the gripper lifts, does the block come up with it?', answer: 'slips',
              options: [{ id: 'holds', label: 'It comes up' }, { id: 'slips', label: 'It slips out' }],
              explain: `It slips. The line between the fingertips leans ${Math.round(lineAngle(TRY_TILT) / DEG)}°, but each plastic cone allows only ${Math.round(Math.atan(SURF.plastic.mu) / DEG)}°, so the fingers slide. Drag the gripper back toward straight until it holds.` });
            if (!alive(my)) return;
            showLine = true; forceBad = true; statusOn = true; status.show(true); lineLabel.show(true);
            await run(0.8, (k) => { grip.root.position.y = lerp(REST_Y, HOLD.y, k); blockPos.y = REST_Y + 0.006 * Math.sin(Math.PI * Math.min(1, k * 2.5)); }); if (!alive(my)) return;
            blockPos.y = REST_Y; forceBad = false; goLive();
          } },
        { text: STEP_TEXT[3],
          enter: async () => {
            const my = A.next(); reset(); stage.focus(...grip.fingers, block, ...cones.map((c) => c.g)); setSee(true); showCones = true; showLine = true; coneGrow = 1;
            setTilt(TRY_TILT); surfTween++; surface = 'ice'; alpha = Math.atan(SURF.ice.mu); surf.set('ice');
            blockPos.set(0, REST_Y, 0); blockState = 'down';
            goLive(); surf.show(true); statusOn = true; status.show(true);
            readoutTail = `<br>Each cone allows: ${Object.values(SURF).map((s) => `${s.name.toLowerCase()} <b>${Math.round(Math.atan(s.mu) / DEG)}°</b>`).join(', ')}.`;
            ui.hint('Pick a surface, or drag the gripper');
            await A.frame([0, 0.1, 0], [0.12, 0.12, 1], 0.075, 0.112); if (!alive(my)) return;
            await wait(0.4); if (!alive(my) || surface !== 'ice') return; // the reader may have picked already
            await setSurface('rubber', 0.8);
          } },
        { text: STEP_TEXT[4],
          enter: async () => {
            const my = A.next(); reset(); stage.focus(block, ...cones.map((c) => c.g)); setSee(true); showCones = true; showLine = true; coneGrow = 1;
            goLive(); surf.show(true); statusOn = true; status.show(true);
            await A.frame([0, HOLD.y + 0.016, 0], [0.12, 0.12, 1], 0.07, 0.09); if (!alive(my)) return;
            readoutTail = '<br>In a 2026 study of 1,599 robot-hand grasps, <b>53%</b> of the grasps that should hold would fail on surfaces at the slippery end of what is realistic.';
          } },
      ],
      dispose() { drag.remove(); },
    };
  },
};
