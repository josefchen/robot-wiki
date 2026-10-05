// Move 4: Reaching. Takeaway: the robot works backwards from where the hand must go to an angle
// for every joint, and some places it simply cannot reach.
import { THREE, shapes, slicer } from '../kit.js';
import { loadSO101 } from '../models/so101.js';
import { EXPLAINER_WORDS } from '../words.ts';

const DEG = 180 / Math.PI;
const HOME = { shoulder_pan: 0, shoulder_lift: -0.9, elbow_flex: 0.9, wrist_flex: 0.9, wrist_roll: 0, gripper: 0.5 };

const STEP_TEXT = EXPLAINER_WORDS.reaching.steps;

export default {
  id: 'reaching',
  how: `<ul>
    <li>Arm: SO-101 (<a href="https://github.com/TheRobotStudio/SO-ARM100" target="_blank" rel="noopener">TheRobotStudio</a>, Apache-2.0), with joint limits from its URDF.</li>
    <li>The arm solves for four joints (shoulder pan, shoulder lift, elbow, wrist flex) with cyclic coordinate descent, a simple inverse-kinematics method that turns one joint at a time toward the target. Real controllers usually use faster Jacobian-based solvers; the idea is the same.</li>
    <li>The green ring is every spot on the table where the hand can reach a cup's rim, found by solving at that height outward from the base. The arm turns at its base, so the zone is a ring.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.5);
    const arm = await loadSO101(stage, { pose: HOME });
    stage.world.add(arm.root); arm.seat();
    const SIDE = { t: [0.2, 0.12, 0], p: [0.2, 0.3, 0.95] };
    stage.camera.position.set(...SIDE.p); stage.controls.target.set(...SIDE.t);

    // The cup: the thing the reader moves, so it carries the focus colour.
    const cup = new THREE.Group();
    const cupMat = stage.material('focus');
    const body = shapes.mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.06, 40, 1, true), cupMat);
    body.position.y = 0.03;
    const base = shapes.mesh(new THREE.CircleGeometry(0.02, 32), cupMat); base.rotation.x = -Math.PI / 2; base.position.y = 0.001;
    const handle = shapes.mesh(new THREE.TorusGeometry(0.014, 0.004, 10, 24, Math.PI), cupMat); handle.position.set(0.024, 0.032, 0); handle.rotation.z = -Math.PI / 2;
    cup.add(body, base, handle);
    cup.position.set(0.22, 0, 0.0);
    stage.world.add(cup);
    const grab = () => cup.position.clone().add(new THREE.Vector3(0, 0.085, 0));

    // Reach zone: the ring of table where a cup can be picked up. Found by solving at the grab height
    // along one direction (the arm turns at the base, so the zone is a ring around it).
    const J = arm.joints;
    const saved = arm.getPose();
    let rMin = null, rMax = 0;
    const breathe = slicer();
    for (let r = 0.04; r <= 0.6; r += 0.005) {
      arm.setPose(HOME);
      const ok = arm.solveIK(new THREE.Vector3(r, 0.085, 0), { iterations: 40 }).error < 0.01;
      if (ok) { rMin ??= r; rMax = r; }
      await breathe();
    }
    arm.setPose(saved);
    const ring = (a, b, n = 96) => { const pts = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; pts.push([b * Math.cos(t), b * Math.sin(t)]); } return pts; };
    const zoneShape = new THREE.Shape(ring(0, rMax).map(([x, z]) => new THREE.Vector2(x, -z)));
    zoneShape.holes.push(new THREE.Path(ring(0, rMin).reverse().map(([x, z]) => new THREE.Vector2(x, -z))));
    const cloud = new THREE.Mesh(new THREE.ShapeGeometry(zoneShape, 96), stage.material('ok', { opacity: 0.18 }));
    cloud.rotation.x = -Math.PI / 2; cloud.position.y = 0.001; cloud.visible = false; stage.world.add(cloud);
    const zoneLabel = stage.label('Cups here can be reached', () => new THREE.Vector3(rMax * 0.72, 0.005, rMax * 0.55), { tone: 'ok' }).show(false);

    // Ghost arm for the second solution.
    const ghost = await loadSO101(stage, { pose: HOME });
    ghost.root.traverse((o) => { if (o.isMesh) { o.material = stage.mats.flat.ref; o.castShadow = false; } });
    ghost.root.visible = false; stage.world.add(ghost.root); ghost.seat();

    // Hand trace for step 1.
    const trace = shapes.line(stage, [new THREE.Vector3(), new THREE.Vector3()], 'ref', { dashed: true });
    trace.visible = false; stage.world.add(trace);
    const tracePts = [];

    const handLabel = stage.label('Hand', () => arm.tipWorld(), { tone: 'plain' }).show(false);
    const cupLabel = stage.label('Drag the cup', () => cup.position.clone().add(new THREE.Vector3(0, 0.07, 0)), { tone: 'focus' }).show(false);

    // How far each joint is turned, without a sign: which way it turns is plain on the stage, and a minus sign is not.
    const turned = (rad) => `${Math.abs(Math.round(rad * DEG))}°`;
    const angles = () => `Joints turned: ${['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex'].map((k) => `${{ shoulder_pan: 'base', shoulder_lift: 'shoulder', elbow_flex: 'elbow', wrist_flex: 'wrist' }[k]} <b>${turned(J[k].value)}</b>`).join(', ')}.`;
    let state = 'idle';
    // Next to the green reach zone, a reached cup turns green too, so the step keeps one colour.
    let reachedRole = 'focus';
    const solve = () => {
      const r = arm.solveIK(grab());
      const ok = r.error < 0.01;
      cupMat.color.copy(ok ? stage.colors[reachedRole] : stage.colors.fail);
      cupLabel.set(ok ? 'Reached' : 'Out of reach').tone(ok ? reachedRole : 'fail');
      ui.readout(ok ? angles() : `No joint angles put the hand there; it gets no closer than <b>${Math.round(r.error * 100)} centimetres</b>.`);
      return ok;
    };
    const drag = stage.draggable(cup, { handle: cup, plane: 'horizontal',
      constrain: (q) => { q.y = 0; const r = Math.hypot(q.x, q.z); if (r > 0.6) q.multiplyScalar(0.6 / r); if (r < 0.07) q.multiplyScalar(0.07 / Math.max(r, 1e-3)); return q; },
      onMove: (q) => { cup.position.copy(q); if (state === 'drag') solve(); } });
    drag.enable(false);
    const moveCup = (to, d = 0.9) => { const from = cup.position.clone(); return stage.tween(d, (k) => { cup.position.lerpVectors(from, to, k); solve(); }); };
    // Before the guess the cup slides away on its own, so the stage does not give the answer away.
    const slideCup = (to, d) => { const from = cup.position.clone(); return stage.tween(d, (k) => { cup.position.lerpVectors(from, to, k); }); };
    const reachToward = (from, to, d) => stage.tween(d, (k) => { arm.solveIK(new THREE.Vector3().lerpVectors(from, to, k).add(new THREE.Vector3(0, 0.085, 0))); });

    const shoulder = ui.slider({ label: 'Shoulder', left: 'Tilt back', right: 'Tilt forward', min: J.shoulder_lift.lower, max: J.shoulder_lift.upper, value: HOME.shoulder_lift,
      onInput: (v) => { J.shoulder_lift.set(v); tracePts.push(arm.tipWorld()); trace.update(tracePts); trace.visible = true; ui.readout(`Shoulder turned <b>${turned(v)}</b>. The dashed line is the hand's path.`); } });
    const sol = ui.choice({ label: 'Same cup,', options: [{ id: 'a', label: 'Elbow up' }, { id: 'b', label: 'Elbow down' }], value: 'a', onChange: (id) => showSolution(id) });
    shoulder.show(false); sol.show(false);

    let solA = null, solB = null;
    const showSolution = (id) => {
      arm.setPose(id === 'a' ? solA : solB); ghost.setPose(id === 'a' ? solB : solA);
      ui.readout(angles());
    };

    const reset = () => { state = 'idle'; reachedRole = 'focus'; drag.enable(false); cloud.visible = false; zoneLabel.show(false); ghost.root.visible = false; shoulder.show(false); sol.show(false); trace.visible = false; handLabel.show(false); cupLabel.show(false); ui.hint(''); cup.visible = true; cupMat.color.copy(stage.colors.focus); };

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => { reset(); stage.focus(arm.root); cup.visible = false; arm.setPose(HOME); shoulder.set(HOME.shoulder_lift); tracePts.length = 0; shoulder.show(true); handLabel.show(true); ui.hint('Move the slider'); ui.readout(''); await stage.view([0.12, 0.14, 0], [0.12, 0.28, 0.8], 1); } },
        { text: STEP_TEXT[1],
          enter: async () => { reset(); stage.focus(arm.root, cup); arm.setPose(HOME); cupLabel.set('Drag the cup').tone('focus').show(true); state = 'drag'; drag.enable(true); ui.hint('Drag the cup');
            await moveCup(new THREE.Vector3(0.22, 0, 0.0)); await stage.view(SIDE.t, [0.45, 0.4, 0.85], 1); } },
        { text: STEP_TEXT[2],
          enter: async () => { reset(); stage.focus(arm.root, cup, cloud); state = 'idle';
            const near = new THREE.Vector3(0.22, 0, 0.0), far = new THREE.Vector3(0.56, 0, 0.0);
            await moveCup(near, 0.4);
            ui.readout('');
            await stage.view([0.25, 0.12, 0], [0.25, 0.32, 1.15], 0.8);
            await slideCup(far, 1.0);
            await ui.predict({ question: 'Can the arm reach the cup over there?', answer: 'no',
              options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
              explain: 'It is too far. No set of joint angles puts the hand there. The green ring shows where cups can be reached: not too far, and not too close to the base.' });
            await reachToward(near, far, 1.2);
            state = 'drag'; reachedRole = 'ok'; solve(); cupLabel.show(true);
            cloud.visible = true; zoneLabel.show(true);
            await stage.fit([arm.root, cup, cloud], [0.12, 0.95, 1.0], { margin: 0.86, duration: 1.0 });
            drag.enable(true); ui.hint('Drag it back into the green ring'); } },
        { text: STEP_TEXT[3],
          enter: async () => { reset(); stage.focus(arm.root, ghost.root, cup); state = 'idle';
            cup.position.set(0.2, 0, 0.0); arm.setPose({ ...HOME, elbow_flex: 1.2, shoulder_lift: -1.0 }); arm.solveIK(grab()); solA = arm.getPose();
            arm.setPose({ ...HOME, shoulder_lift: 0.6, elbow_flex: -1.2, wrist_flex: 1.6 }); arm.solveIK(grab(), { iterations: 60 }); solB = arm.getPose();
            ghost.root.visible = true; sol.show(true); sol.set('a'); showSolution('a'); cupLabel.set('Same cup').tone('focus').show(true);
            await stage.view([0.12, 0.13, 0], [0.12, 0.2, 0.8], 1.1); } },
        { text: STEP_TEXT[4],
          enter: async () => { reset(); stage.focus(arm.root, cup); state = 'drag'; arm.setPose(HOME); cup.position.set(0.22, 0, 0.06); solve(); cupLabel.set('Drag the cup').show(true); drag.enable(true); ui.hint('Drag the cup');
            await stage.view(SIDE.t, [0.45, 0.4, 0.85], 1); } },
      ],
      dispose() { drag.remove(); },
    };
  },
};
