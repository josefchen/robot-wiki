// Learn 11: Learning from a puppeteer. Takeaway: a person moves a copy of the arm, the robot mirrors it,
// and every moment becomes an example to imitate.
import { THREE, shapes, lerp, clamp, ease, reduceMotion } from '../kit.js';
import { loadSO101 } from '../models/so101.js';
import { EXPLAINER_WORDS } from '../words.ts';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const OPEN = 1.0, SHUT = 0.02;          // gripper joint values (radians): jaw open, jaw closed on the block
const HOME = { shoulder_pan: 0, shoulder_lift: -0.9, elbow_flex: 0.9, wrist_flex: 0.9, wrist_roll: 0, gripper: OPEN };
const RATE = 30;                         // LeRobot records 30 frames a second by default (configs/dataset.py)
const DELAY = 0.2;                       // seconds the follower trails the leader (illustrative)
// Side by side on a wide screen (leader on the left, the person's side); on a tall phone screen the leader sits in front.
const LAYOUT = { wide: [V(-0.36, 0, 0.05), V(0.06, 0, -0.05)], tall: [V(-0.27, 0, 0.15), V(-0.03, 0, -0.15)] };
let LEADER, FOLLOWER;
const CUBE = 0.026, GRASP_Y = 0.017, BLOCK_X = 0.15, MARK_X = 0.275;
const WRIST_TO_TIP = 0.16;               // metres from the wrist-flex joint to the jaw tips (measured on the model)

// One demonstration: pick the block up and put it on the mark. Keys are [reach, height, gripper, seconds to get there].
const DEMO = [
  [0.205, 0.14, OPEN, 0], [0.15, 0.065, OPEN, 0.9], [BLOCK_X, GRASP_Y, OPEN, 0.55], [BLOCK_X, GRASP_Y, SHUT, 0.35],
  [0.18, 0.115, SHUT, 0.7], [MARK_X, 0.115, SHUT, 0.85], [MARK_X, GRASP_Y + 0.003, SHUT, 0.65], [MARK_X, GRASP_Y + 0.003, OPEN, 0.35],
  [0.235, 0.14, OPEN, 0.7], [0.205, 0.14, OPEN, 0.5],
];
// The robot's own attempt after learning: the same task, a little different in path and pace, as a learned policy would be.
const DX = [0, 0.01, 0.002, 0.002, -0.01, 0.008, 0.003, 0.003, -0.012, 0];
const DY = [0, 0.018, 0, 0, 0.022, -0.012, 0, 0, 0.012, 0];
const DT = [1, 0.8, 0.85, 1, 0.75, 0.85, 0.9, 1, 0.8, 1];
const LEARNED = DEMO.map(([x, y, g, t], i) => [x + DX[i], y + DY[i], g, t * DT[i]]);
const duration = (keys) => keys.reduce((s, k) => s + k[3], 0);
function sample(keys, t, out) {
  let acc = 0;
  for (let i = 1; i < keys.length; i++) {
    const d = keys[i][3];
    if (t <= acc + d || i === keys.length - 1) {
      const k = ease(clamp((t - acc) / d, 0, 1)), a = keys[i - 1], b = keys[i];
      out.x = lerp(a[0], b[0], k); out.y = lerp(a[1], b[1], k); out.g = lerp(a[2], b[2], k);
      return out;
    }
    acc += d;
  }
  return out;
}

// Frame a box from a direction: returns { target, position } so the box fills and is centred in the current viewport.
function frameBox(stage, box, dir, pad = 1.08) {
  const c = box.getCenter(V()), cam = stage.camera.clone(), d0 = dir.clone().normalize();
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(V(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  let d = 2;
  const vf = THREE.MathUtils.degToRad(cam.fov) / 2, right = V(), up = V();
  for (let k = 0; k < 10; k++) {
    cam.position.copy(c).addScaledVector(d0, d); cam.lookAt(c); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of corners) { const v = p.clone().project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const m = Math.max((x1 - x0) / 2, (y1 - y0) / 2);
    right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
    const hh = d * Math.tan(vf), hw = hh * cam.aspect;
    c.addScaledVector(right, ((x0 + x1) / 2) * hw * 0.8).addScaledVector(up, ((y0 + y1) / 2) * hh * 0.8);
    d *= lerp(1, m * pad, 0.8);
  }
  return { target: c, position: c.clone().addScaledVector(d0, d) };
}

const STEP_TEXT = EXPLAINER_WORDS.puppeteer.steps;

export default {
  id: 'puppeteer',
  how: `<ul>
    <li>Arms: two SO-101s, the leader on the left and the follower on the right, from <a href="https://github.com/TheRobotStudio/SO-ARM100" target="_blank" rel="noopener">TheRobotStudio/SO-ARM100</a> (Apache-2.0). Both are drawn with the follower's model. The real leader has a handle in place of the jaw (the guide's assembly step is called "Gripper / Handle"), and "uses three differently geared motors to make sure it can both sustain its own weight and it can be moved without requiring much force" (<a href="https://huggingface.co/docs/lerobot/en/so101" target="_blank" rel="noopener">LeRobot SO-101 guide</a>).</li>
    <li>This is how the SO-101 is used: "you'll use a 'teloperation' device, such as a leader arm or keyboard to teleoperate the robot and record its motion trajectories. Once you've gathered enough trajectories, you'll train a neural network to imitate these trajectories" (<a href="https://huggingface.co/docs/lerobot/en/il_robots" target="_blank" rel="noopener">LeRobot, imitation learning on real-world robots</a>). LeRobot records 30 frames a second by default (<code>fps: int = 30</code> in <a href="https://github.com/huggingface/lerobot/blob/main/src/lerobot/configs/dataset.py" target="_blank" rel="noopener">configs/dataset.py</a>); each frame stores the camera pictures and the joint positions.</li>
    <li>Anchor: "ACT allows the robot to learn 6 difficult tasks in the real world, such as opening a translucent condiment cup and slotting a battery with 80-90% success, with only 10 minutes worth of demonstrations" (Zhao, Kumar, Levine and Finn, <a href="https://arxiv.org/abs/2304.13705" target="_blank" rel="noopener">arXiv 2304.13705</a>, 2023). The paper records 50 demonstrations per task, each 8 to 14 seconds long, at 50 frames a second, on ALOHA, a two-arm leader-and-follower rig. It records "the joint positions of the leader robots (i.e. input from the human operator)" and uses them as the actions to imitate.</li>
    <li>Method: the leader's joints are solved from the dragged hand position (cyclic coordinate descent, with the jaw kept pointing down). The follower copies the leader's six joint angles 0.2 seconds later; on a real rig the lag depends on the motors. The robot's solo run is a hand-made variation of the demonstration, to show what a learned policy looks like; it is not the output of a trained network.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.6);
    const tall = stage.camera.aspect < 1;
    [LEADER, FOLLOWER] = (tall ? LAYOUT.tall : LAYOUT.wide).map((v) => v.clone());
    const mkBase = (p) => { const g = new THREE.Group(); g.position.copy(p); stage.world.add(g); return g; };
    const lBase = mkBase(LEADER), fBase = mkBase(FOLLOWER);
    const [leader, follower] = await Promise.all([loadSO101(stage, { pose: HOME }), loadSO101(stage, { pose: HOME })]);
    lBase.add(leader.root); leader.seat();
    fBase.add(follower.root); follower.seat();
    stage.world.updateMatrixWorld(true);

    // The leader's hand is what the reader holds, so its jaw carries the focus colour.
    // In the solo step the leader becomes a grey ghost that replays the demonstration.
    const handMeshes = new Set();
    for (const n of ['gripper_link', 'moving_jaw_so101_v1_link']) leader.links[n].traverse((o) => { if (o.isMesh && o.userData.visual?.link === n) handMeshes.add(o); });
    const paintLeader = (mode) => leader.root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = mode === 'ghost' ? stage.mats.flat.ref : (mode === 'hand' && handMeshes.has(o) ? stage.mats.flat.focus : o.userData.base);
      o.castShadow = mode !== 'ghost'; o.renderOrder = mode === 'ghost' ? 3 : 0;
    });

    // Table props: the block, its target mark, and a camera on a post.
    const block = shapes.mesh(shapes.box(CUBE, CUBE, CUBE, 0.003), stage.mats.dark);
    stage.world.add(block);
    const blockHome = V(FOLLOWER.x + BLOCK_X, CUBE / 2, FOLLOWER.z);
    const markAt = V(FOLLOWER.x + MARK_X, 0, FOLLOWER.z);
    const ring = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; ring.push(V(markAt.x + Math.cos(a) * 0.024, 0.0015, markAt.z + Math.sin(a) * 0.024)); }
    const mark = shapes.line(stage, ring, 'ref', { dashed: true }); stage.world.add(mark);

    const cam = new THREE.Group();
    const post = shapes.mesh(shapes.cylinder(0.005, 0.24, 12), stage.mats.clay); post.position.y = 0.12;
    const foot = shapes.mesh(shapes.cylinder(0.03, 0.008, 24), stage.mats.clay); foot.position.y = 0.004;
    const head = new THREE.Group(); head.position.y = 0.25;
    const body = shapes.mesh(shapes.box(0.034, 0.03, 0.044, 0.006), stage.mats.dark);
    const lens = shapes.mesh(shapes.cylinder(0.01, 0.012, 20), stage.mats.dark); lens.rotation.x = Math.PI / 2; lens.position.z = 0.026;
    head.add(body, lens); cam.add(post, foot, head);
    cam.position.set(FOLLOWER.x + (tall ? 0.36 : 0.4), 0, FOLLOWER.z - (tall ? 0.1 : 0.14));
    stage.world.add(cam);
    const lookAt = V(FOLLOWER.x + 0.2, 0.03, FOLLOWER.z);
    head.lookAt(lookAt);
    // What the camera sees: a faint pyramid in the sensor colour, shown while recording.
    const camEye = head.getWorldPosition(V());
    const reach = camEye.distanceTo(lookAt) * 1.25;
    const coneGeo = new THREE.ConeGeometry(reach * 0.36, reach, 4, 1, true); coneGeo.rotateY(Math.PI / 4); coneGeo.translate(0, -reach / 2, 0); coneGeo.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(coneGeo, stage.material('sense', { opacity: 0.08 }));
    cone.position.copy(camEye); cone.lookAt(lookAt); cone.visible = false; cone.renderOrder = 4;
    stage.world.add(cone);

    // Recorded examples: one dot per saved frame at the follower's hand, fading with age.
    const MAXD = 420;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 10, 8), new THREE.MeshBasicMaterial(), MAXD);
    dots.count = 0; dots.frustumCulled = false; stage.world.add(dots);
    const dotPos = [], dotAge = [];
    const _m = new THREE.Matrix4(), _c = new THREE.Color(), _q = new THREE.Quaternion(), _s = V();
    let dotRole = 'sense';
    const paintDots = () => {
      const base = stage.colors[dotRole], bg = stage.colors.paper;
      for (let i = 0; i < dotPos.length; i++) {
        const k = dotRole === 'sense' ? clamp(dotAge[i] / 7, 0, 0.7) : 0.2;
        _s.setScalar(1 - k * 0.5); _m.compose(dotPos[i], _q, _s); dots.setMatrixAt(i, _m);
        dots.setColorAt(i, _c.copy(base).lerp(bg, k));
      }
      dots.count = dotPos.length; dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    };
    const clearDots = () => { dotPos.length = 0; dotAge.length = 0; dots.count = 0; };
    stage.onTheme(() => { if (dotPos.length) paintDots(); });

    // Inverse kinematics with the jaw pointing down: place the wrist above the target, then aim the jaw at it.
    const jp = V(), ax = V(), tp = V(), va = V(), vb = V(), qq = new THREE.Quaternion(), W = V(), P = V();
    const ccd = (arm, eff, goal, use, its) => {
      const J = arm.joints;
      for (let it = 0; it < its; it++) for (let i = use.length - 1; i >= 0; i--) {
        const j = J[use[i]]; arm.root.updateMatrixWorld(true);
        j.spin.getWorldPosition(jp); ax.copy(j.axis).applyQuaternion(j.frame.getWorldQuaternion(qq));
        eff.getWorldPosition(tp); va.copy(tp).sub(jp); vb.copy(goal).sub(jp);
        va.addScaledVector(ax, -va.dot(ax)); vb.addScaledVector(ax, -vb.dot(ax));
        if (va.lengthSq() < 1e-10 || vb.lengthSq() < 1e-10) continue;
        va.normalize(); vb.normalize();
        j.set(j.value + Math.atan2(ax.dot(va.clone().cross(vb)), va.dot(vb)));
      }
      arm.root.updateMatrixWorld(true);
    };
    const solveDown = (arm, p) => {
      W.copy(p); W.y += WRIST_TO_TIP;
      ccd(arm, arm.joints.wrist_flex.spin, W, ['shoulder_pan', 'shoulder_lift', 'elbow_flex'], 10);
      ccd(arm, arm.tip, p, ['wrist_flex'], 2);
      ccd(arm, arm.tip, p, ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex'], 4);
    };
    const local = (base, x, y, out = V()) => out.set(base.x + x, y, base.z);

    // State.
    const target = local(LEADER, 0.205, 0.14);
    let leaderGrip = OPEN, gripGoal = OPEN;
    const history = [];       // leader poses over time, for the follower's delay
    let driver = null;        // 'drag' | 'demo' | 'replay' (leader as ghost) | null
    let clock = 0, tDemo = 0, onDemoEnd = null;
    let recording = false, recT = 0, examples = 0;
    let held = false, heldT = 0, placed = false;
    let solo = null;          // { t } while the follower moves alone
    let soloEnd = null;
    const heldOff = V(), smp = { x: 0, y: 0, g: OPEN }, followerTip = V();

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    stage.world.add(handle);
    const plane = new THREE.Plane(V(0, 0, 1), -LEADER.z);
    let grabOff = null;
    const clampReach = (q) => {
      q.x = clamp(q.x, LEADER.x + 0.09, LEADER.x + 0.31); q.y = clamp(q.y, GRASP_Y - 0.004, 0.22); q.z = LEADER.z;
      const sx = LEADER.x + 0.07, sy = 0.12, dx = q.x - sx, dy = q.y - sy, r = Math.hypot(dx, dy);
      if (r > 0.27) { q.x = sx + (dx * 0.27) / r; q.y = sy + (dy * 0.27) / r; }
      return q;
    };
    const drag = stage.draggable(handle, { plane: 'vertical',
      onStart: () => { grabOff = null; if (driver === 'demo' && !story) { driver = 'drag'; onDemoEnd?.(); } },
      constrain: (p) => {
        const hit = stage.ray.ray.intersectPlane(plane, V()) || p;
        if (!grabOff) grabOff = handle.position.clone().sub(hit);
        return clampReach(hit.add(grabOff));
      },
      onMove: (q) => { target.copy(q); } });
    drag.enable(false);

    const leaderLabel = stage.label('Leader', () => lBase.position.clone().add(V(tall ? 0.12 : 0.03, 0.29, 0)), { tone: 'plain' }).show(false);
    const followerLabel = stage.label('Follower', () => fBase.position.clone().add(V(0.03, 0.29, 0)), { tone: 'plain' }).show(false);
    const handLabel = stage.label('Drag this hand', () => leader.tipWorld().add(V(-0.02, 0.11, 0)), { tone: 'focus' }).show(false);
    const camLabel = stage.label('Camera and what it sees', () => camEye.clone().add(V(0, 0.035, 0)), { tone: 'sense' }).show(false);

    const recBtn = ui.button('Record', () => {
      if (recording) { recording = false; recBtn.set('Record again'); writeReadout(); return; }
      clearDots(); examples = 0; recT = 0; recording = true; driver = 'drag'; onDemoEnd = null; recBtn.set('Stop');
      resetBlock(); ui.hint('Drag the hand');
    });
    const playBtn = ui.button('Watch it again', () => startSolo());
    recBtn.show(false); playBtn.show(false);

    const resetBlock = () => { held = false; placed = false; block.position.copy(blockHome); };
    const writeReadout = () => {
      if (recording || examples) ui.readout(`${recording ? 'Recording' : 'Recorded'} <b>${examples}</b> examples, ${RATE} a second. Each dot is one: a camera picture plus the position of all six joints.`);
    };

    const setFollowerFromHistory = () => {
      const want = clock - DELAY;
      while (history.length > 2 && history[1].t <= want) history.shift();
      const a = history[0], b = history[1] || a;
      const k = b.t > a.t ? clamp((want - a.t) / (b.t - a.t), 0, 1) : 1;
      const p = {};
      for (const j in a.pose) p[j] = lerp(a.pose[j], b.pose[j], k);
      follower.setPose(p);
    };

    // The block rides in the follower's jaw once the jaw closes around it. When the reader drags,
    // the jaw closes by itself at the block and opens when the block touches the table again.
    const stepBlock = (dt, auto) => {
      follower.tipWorld(followerTip);
      const g = follower.joints.gripper.value;
      if (held) {
        heldT += dt;
        block.position.copy(followerTip).add(heldOff);
        if (auto && heldT > 0.6 && followerTip.y < GRASP_Y + 0.008) gripGoal = OPEN;
        if (g > 0.45) {
          held = false; block.position.y = CUBE / 2;
          if (Math.hypot(block.position.x - markAt.x, block.position.z - markAt.z) < 0.03) { block.position.x = markAt.x; block.position.z = markAt.z; placed = true; }
        }
      } else {
        const near = followerTip.distanceTo(V(block.position.x, GRASP_Y, block.position.z)) < 0.022;
        if (near && auto && !placed) gripGoal = SHUT;
        if (near && g < 0.3) { held = true; heldT = 0; heldOff.copy(block.position).sub(followerTip); }
      }
    };

    const startSolo = () => {
      resetBlock(); follower.setPose(HOME);
      solo = { t: -0.6 }; tDemo = -0.2;
    };

    let story = null;
    const tick = (dt) => {
      clock += dt;
      for (const tw of [...tweens]) tw();
      if (driver === 'demo') {
        tDemo += dt;
        sample(DEMO, Math.max(0, tDemo), smp);
        local(LEADER, smp.x, smp.y, target); gripGoal = smp.g;
        if (tDemo > duration(DEMO) + 0.3) { driver = story ? null : 'drag'; const f = onDemoEnd; onDemoEnd = null; f?.(); }
      }
      if (driver === 'demo' || driver === 'drag') {
        leaderGrip += clamp(gripGoal - leaderGrip, -dt * 4, dt * 4);
        solveDown(leader, target);
        leader.joints.gripper.set(leaderGrip); leader.root.updateMatrixWorld(true);
        if (!stage.dragging) leader.tipWorld(handle.position);
        history.push({ t: clock, pose: leader.getPose() });
        setFollowerFromHistory();
        stepBlock(dt, driver === 'drag');
        if (recording) {
          recT += dt;
          const n = Math.floor(recT * RATE);
          while (examples < n) { examples++; dotPos.push(follower.tipWorld()); dotAge.push(0); if (dotPos.length > MAXD) { dotPos.shift(); dotAge.shift(); } }
          if (!story) writeReadout();
        }
      }
      if (driver === 'replay') {
        tDemo += dt;
        sample(DEMO, Math.max(0, tDemo), smp);
        solveDown(leader, local(LEADER, smp.x, smp.y, P)); leader.joints.gripper.set(smp.g); leader.root.updateMatrixWorld(true);
      }
      if (solo) {
        solo.t += dt;
        sample(LEARNED, Math.max(0, solo.t), smp);
        solveDown(follower, local(FOLLOWER, smp.x, smp.y, P));
        follower.joints.gripper.set(smp.g); follower.root.updateMatrixWorld(true);
        stepBlock(dt, false);
        // Under reduced motion a run plays once and stops; otherwise it loops, or hands over to the next part of the story.
        if (solo.t > duration(LEARNED) + 1.4) { const f = soloEnd; if (reduceMotion) solo = null; else if (f) f(); else startSolo(); }
      }
      if (dotRole === 'sense' && dotPos.length) { for (let i = 0; i < dotAge.length; i++) dotAge[i] += dt; paintDots(); }
    };
    // Under reduced motion anything that plays by itself (a demonstration, a run alone, the recorded dots
    // fading) plays out within one frame, so it jumps to its end state.
    const playing = () => driver === 'demo' || solo !== null || (driver === 'replay' && tDemo < duration(DEMO))
      || (dotRole === 'sense' && dotAge.some((age) => age < 4.9));
    const offFrame = stage.onFrame((dt) => {
      if (!reduceMotion) { tick(dt); return; }
      let n = 0;
      do { tick(1 / 60); n += 1; } while (n < 3600 && playing());
    });

    // Camera moves run on the wall clock, so a slow device still lands each step on time.
    const tweens = new Set();
    const tween = (duration, fn) => new Promise((resolve) => {
      if (reduceMotion || duration <= 0) { fn(1); resolve(); return; }
      const t0 = performance.now();
      const tw = () => { const k = clamp((performance.now() - t0) / (duration * 1000), 0, 1); fn(ease(k)); if (k >= 1) { tweens.delete(tw); resolve(); } };
      tweens.add(tw);
    });
    const BOX = tall ? new THREE.Box3(V(LEADER.x - 0.02, 0.02, FOLLOWER.z - 0.1), V(FOLLOWER.x + 0.36, 0.3, LEADER.z + 0.0))
      : new THREE.Box3(V(LEADER.x - 0.05, 0, FOLLOWER.z - 0.15), V(FOLLOWER.x + 0.42, 0.27, LEADER.z + 0.05));
    const DIR = tall ? V(-0.35, 0.8, 1) : V(-0.3, 0.5, 1);
    const home = (d = 1.1) => {
      const f = frameBox(stage, BOX, DIR), t0 = stage.controls.target.clone(), p0 = stage.camera.position.clone();
      return tween(d, (k) => { stage.controls.target.lerpVectors(t0, f.target, k); stage.camera.position.lerpVectors(p0, f.position, k); });
    };
    { const f = frameBox(stage, BOX, DIR); stage.camera.position.copy(f.position); stage.controls.target.copy(f.target); }

    const reset = () => {
      driver = null; solo = null; soloEnd = null; story = null; onDemoEnd = null;
      recording = false; examples = 0; recT = 0; clearDots(); dotRole = 'sense';
      drag.enable(false); cone.visible = false;
      [leaderLabel, followerLabel, handLabel, camLabel].forEach((l) => l.show(false));
      leaderLabel.set('Leader').tone('plain'); followerLabel.set('Follower').tone('plain');
      recBtn.show(false); playBtn.show(false); ui.hint(''); ui.readout('');
      paintLeader('hand'); resetBlock();
      leader.setPose(HOME); follower.setPose(HOME);
      local(LEADER, 0.205, 0.14, target); leaderGrip = gripGoal = OPEN;
      history.length = 0; history.push({ t: clock, pose: leader.getPose() });
      leader.tipWorld(handle.position);
    };

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => {
            reset(); stage.focus(leader.root, follower.root); driver = 'drag'; drag.enable(true);
            leaderLabel.show(true); followerLabel.show(true); handLabel.show(true); ui.hint('Drag the hand');
            await home();
            if (driver !== 'drag' || stage.dragging) return;
            const a = target.clone(), b = local(LEADER, 0.25, 0.07);
            await tween(0.9, (k) => { if (!stage.dragging && driver === 'drag') target.lerpVectors(a, b, k); });
            await tween(0.9, (k) => { if (!stage.dragging && driver === 'drag') target.lerpVectors(b, a, k); });
          } },
        { text: STEP_TEXT[1],
          enter: async () => {
            reset(); stage.focus(leader.root, follower.root); cone.visible = true; camLabel.show(true); leaderLabel.show(true); followerLabel.show(true);
            recBtn.show(true); recBtn.set('Stop'); drag.enable(true);
            driver = 'demo'; tDemo = -0.3; recording = true; recT = 0; examples = 0;
            onDemoEnd = () => { recording = false; recBtn.set('Record again'); writeReadout(); ui.hint('Drag the hand, or record again'); };
            await home();
          } },
        { text: STEP_TEXT[2],
          enter: async () => {
            reset(); stage.focus(leader.root, follower.root); paintLeader('ghost');
            // The demonstration it learned from, drawn as grey dots on the follower's table.
            dotRole = 'ref';
            for (let t = 0; t <= duration(DEMO); t += 1 / RATE) { sample(DEMO, t, smp); dotPos.push(local(FOLLOWER, smp.x, smp.y)); dotAge.push(0); }
            paintDots();
            await home();
            await ui.predict({ question: 'A 2023 robot learned delicate tasks this way, such as fitting a battery into its slot. How much demonstrating did each task take?', answer: 'min',
              options: [{ id: 'min', label: 'About 10 minutes' }, { id: 'hour', label: 'About 10 hours' }, { id: 'day', label: 'About 10 days' }],
              explain: 'About 10 minutes: 50 demonstrations of 8 to 14 seconds each. On its own, the robot then got tasks like these right 80 to 90% of the time.' });
            ui.readout('In 2023, a robot learned tasks like fitting a battery into its slot, working <b>80 to 90%</b> of the time, from about <b>10 minutes</b> of demonstrations. Grey dots: the demonstration it copies.');
            leaderLabel.set('The demonstration').show(true);
            followerLabel.set('Moving alone').tone('focus').show(true);
            playBtn.show(true);
            driver = 'replay'; startSolo();
          } },
        { text: STEP_TEXT[3],
          enter: async () => {
            reset(); stage.focus(leader.root, follower.root);
            const teleop = () => {
              paintLeader('hand'); resetBlock(); clearDots(); dotRole = 'sense'; solo = null;
              leader.setPose(HOME); follower.setPose(HOME); local(LEADER, 0.205, 0.14, target);
              history.length = 0; history.push({ t: clock, pose: leader.getPose() });
              leaderLabel.set('Teleoperation').tone('focus').show(true); followerLabel.show(false);
              recording = true; recT = 0; examples = 0;
              driver = 'demo'; tDemo = -0.4; onDemoEnd = alone;
            };
            const alone = () => {
              recording = false; dotRole = 'ref'; paintDots(); paintLeader('plain');
              leaderLabel.show(false); followerLabel.set('Imitation learning').tone('focus').show(true);
              startSolo(); soloEnd = teleop;
            };
            story = { teleop };
            await home();
            teleop();
          } },
      ],
      dispose() { offFrame(); tweens.clear(); drag.remove(); },
    };
  },
};
