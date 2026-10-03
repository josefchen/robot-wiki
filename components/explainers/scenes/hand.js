// Body 3: The hand. Takeaway: human hands pack about 20 ways to move and dense touch into a small space;
// most robots use a two-finger clamp and lose most of that.
import { THREE, shapes, lerp, ease, reduceMotion } from '../kit.js';
import { makeGripper } from '../models/gripper.js';
import { makeHand } from '../models/hand.js';

const DEG = Math.PI / 180;
const HAND_AT = new THREE.Vector3(0, 0.047, 0);   // the wrist sits on its mount (steps 2 to 4)
const TURN = -50 * DEG;                            // hand and clamp turned so their keys face the camera
const Q = new THREE.Vector3(-0.03, 0.08, 0.055);  // where thumb and index pinch the key (hand frame)
const KEY_HALF = 0.0015;                           // half the key's thickness
const RHO = 0.028;                                 // where the pushing finger presses the blade, from the bow centre
const KEY_DROP = -0.011;                           // the clamp holds the key near the top of its bow
const GOAL = -90 * DEG;                            // the key's goal: a quarter turn, from hanging to pointing sideways
const RELAX = { index: [0.06, 0.12, 0.2, 0.12], middle: [0, 0.1, 0.18, 0.1], ring: [-0.05, 0.12, 0.2, 0.12], little: [-0.1, 0.14, 0.22, 0.14], thumb: [-0.25, 0.35, 0.15, 0.1] };

// A flat key: bow and toothed blade in the local xy plane, blade hanging along -y, thickness along z.
function makeKey(mat) {
  const g = new THREE.Group();
  const ext = { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 28 };
  const bow = new THREE.Shape(); bow.absarc(0, 0, 0.0125, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0.0045, 0.0033, 0, Math.PI * 2, true); bow.holes.push(hole);
  const blade = new THREE.Shape();
  const P = [[-0.0045, -0.009], [0.0045, -0.009], [0.0045, -0.017], [0.0028, -0.021], [0.0045, -0.025], [0.0022, -0.029], [0.0045, -0.033], [0.0026, -0.037], [0.0045, -0.041], [0.0032, -0.046], [0.0, -0.05], [-0.0036, -0.047], [-0.0036, -0.017], [-0.0045, -0.016]];
  blade.moveTo(...P[0]); P.slice(1).forEach((p) => blade.lineTo(...p)); blade.closePath();
  const meshes = [bow, blade].map((s) => { const geo = new THREE.ExtrudeGeometry(s, ext); geo.translate(0, 0, -0.0011); return shapes.mesh(geo, mat); });
  g.add(...meshes);
  g.setMat = (m) => meshes.forEach((x) => { x.material = m; });
  return g;
}
// The key's base orientation in a hand or clamp frame: its face is crossed by the pinch (+x), so turning it by
// beta about its own axis swings the blade from hanging (beta = 0) to pointing forward, +z (beta = GOAL).
const KEY_BASE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
const keyTurn = (key, beta) => key.quaternion.copy(KEY_BASE).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), beta));
const bladeDir = (beta) => new THREE.Vector3(0, -Math.cos(beta), -Math.sin(beta));

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

export default {
  id: 'hand',
  kicker: 'Robot anatomy · the hand',
  question: 'Why are robot hands so hard?',
  takeaway: 'A human hand packs about 20 ways to move and dense touch into a small space. Many robots use a simple two-finger clamp instead, and lose most of that.',
  concept: { name: 'Using the fingers to move an object within the hand is called dexterous manipulation', article: 'Dexterity', href: 'https://robot-wiki.com/frontier/dexterity/' },
  selfCheck: { q: 'Why do so many robots still use two-finger grippers?', a: 'One motor is cheap, strong and reliable, and most jobs only need to pick something up and put it down. A hand needs many motors, many sensors and much harder control, so it pays off only where the fingers must do the work.' },
  how: `<ul>
    <li>Bones: the wrist and hand contain 27 bones: 8 carpals, 5 metacarpals and 14 phalanges (StatPearls, <a href="https://www.ncbi.nlm.nih.gov/books/NBK507841/" target="_blank" rel="noopener">Anatomy, Shoulder and Upper Limb, Arm Structure and Function</a>).</li>
    <li>Ways to move: each finger has four (its knuckle bends and swings sideways, and two more joints bend) and the thumb has five, 21 in all, the count used by Cao et al. (<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11940047/" target="_blank" rel="noopener">2025, Biomimetics</a>). Anatomy models differ by a few, so the text says "about 20".</li>
    <li>LEAP Hand: Shaw, Agarwal and Pathak, <a href="https://arxiv.org/abs/2309.06440" target="_blank" rel="noopener">"LEAP Hand: Low-Cost, Efficient, and Anthropomorphic Hand for Robot Learning"</a> (RSS 2023). Its control policy reads "joint angles (16 values) from the motors", and its <a href="https://github.com/leap-hand/LEAP_Hand_Sim/blob/master/assets/leap_hand/robot.urdf" target="_blank" rel="noopener">published model</a> has 16 joints: three fingers and a thumb, four each. The paper also shows it rotating a cube within the hand.</li>
    <li>Touch: people correct a slipping grip within 0.06 to 0.08 seconds, and small slips reach the skin as vibrations (Johansson and Westling, <a href="https://doi.org/10.1007/BF00237997" target="_blank" rel="noopener">Experimental Brain Research, 1984</a>). Meta's Digit 360 fingertip has "~8.3 million taxels" (sensing points), responds to touch from any direction and perceives "vibrations up to 10 kHz" (Lambeta et al., <a href="https://arxiv.org/abs/2411.02479" target="_blank" rel="noopener">arXiv 2411.02479</a>, 2024).</li>
    <li>Models: a stylised parallel gripper and a stylised hand, not to scale with any product. The robot look follows LEAP Hand's layout: three fingers, a thumb and a motor at every joint. The pushing finger is placed by inverse kinematics so its tip really touches the key; the motion is scripted, not learned.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.42);
    const M = stage.mats;
    const A = animator(stage);

    // ---------- The clamp ----------
    const grip = makeGripper(stage, { pad: 'flat', fingerLength: 0.08 });
    stage.world.add(grip.root);
    const gripKey = makeKey(M.clay); grip.root.add(gripKey); keyTurn(gripKey, 0);
    const gripGhost = makeKey(M.ref); grip.root.add(gripGhost); keyTurn(gripGhost, GOAL); gripGhost.position.y = KEY_DROP;
    gripGhost.traverse((o) => { o.castShadow = false; });

    // ---------- The hand ----------
    const hand = makeHand(stage);
    const mount = shapes.mesh(shapes.cylinder(0.04, 0.008, 40), M.dark); mount.position.y = -0.043; hand.root.add(mount);
    stage.world.add(hand.root);
    const handKey = makeKey(M.clay); hand.hand.add(handKey); handKey.position.copy(Q); keyTurn(handKey, 0);
    const handGhost = makeKey(M.ref); hand.hand.add(handGhost); handGhost.position.copy(Q); keyTurn(handGhost, GOAL);
    handGhost.traverse((o) => { o.castShadow = false; });
    const keyMats = { plain: M.focus, ok: stage.material('ok'), fail: stage.material('fail') };

    // Pinch pose, found once by inverse kinematics: thumb and index pads on either face of the key's bow.
    const H2W = (p) => { hand.root.updateMatrixWorld(true); return hand.hand.localToWorld(p.clone()); };
    hand.root.position.copy(HAND_AT); hand.root.rotation.set(0, 0, 0);
    hand.setPose({ ...RELAX, index: [0.12, 0.9, 0.9, 0.5], thumb: [-0.2, 0.0, 0.6, 1.2], middle: [-0.14, 0.55, 0.8, 0.55], ring: [-0.06, 1.05, 1.3, 0.9], little: [-0.1, 1.0, 1.25, 0.85] });
    const pinchIdx = Q.clone().add(new THREE.Vector3(KEY_HALF + hand.digits.index.r, 0, 0));
    const pinchThb = Q.clone().add(new THREE.Vector3(-(KEY_HALF + hand.digits.thumb.r), 0, 0));
    hand.solve('thumb', H2W(pinchThb), { iterations: 40 }); hand.solve('index', H2W(pinchIdx), { iterations: 40 });
    const PINCH = hand.getPose();
    hand.setPose(RELAX);
    const pressAt = (beta, lift = 0) => Q.clone().addScaledVector(bladeDir(beta), RHO).add(new THREE.Vector3(KEY_HALF + hand.digits.middle.r + lift, 0, 0));

    // ---------- Labels and controls ----------
    const labels = [0, 1, 2].map(() => stage.label('', () => null).show(false));
    const [L1, L2, L3] = labels;
    const place = (L, text, at, tone = 'plain') => { L.set(text).tone(tone).show(true); L.at = at; };
    const replay = ui.button('Let it slip again', () => slipDemo(A.next()));
    const tryWith = ui.choice({ label: 'Turn the key with', value: 'hand', options: [{ id: 'clamp', label: 'The clamp' }, { id: 'hand', label: 'The hand' }],
      onChange: (id) => { const my = A.next(); if (id === 'clamp') clampTry(my); else handTurn(my); } });
    replay.show(false); tryWith.show(false);

    const lerpPose = (a, b, k) => Object.fromEntries(Object.keys(b).map((n) => [n, b[n].map((v, i) => lerp(a[n][i], v, k))]));
    const toPose = (to, d) => { const from = hand.getPose(); return A.run(d, (k) => hand.setPose(lerpPose(from, to, k))); };
    const paintKnuckles = (n) => hand.knuckles.forEach((K, i) => { K.mesh.material = i < n ? M.focus : M.clay; });
    const ORDER = ['index', 'middle', 'ring', 'little', 'thumb'];
    hand.knuckles.sort((a, b) => ORDER.indexOf(a.digit) - ORDER.indexOf(b.digit));
    hand.motors.sort((a, b) => ORDER.indexOf(a.digit) - ORDER.indexOf(b.digit));
    const knuckleAt = (i, up = 0) => () => hand.knuckles[i].mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, up, 0));

    const reset = () => {
      replay.show(false); tryWith.show(false); ui.hint(''); ui.readout(''); ui.card(null);
      labels.forEach((L) => L.show(false));
      grip.root.visible = false; grip.motor.material = M.dark; gripKey.visible = false; gripGhost.visible = false;
      grip.root.position.set(0, 0.11, 0); grip.root.rotation.set(0, 0, 0); grip.setGap(0.05);
      gripKey.position.set(0, KEY_DROP, 0); keyTurn(gripKey, 0); gripKey.setMat(keyMats.plain);
      hand.root.visible = false; hand.root.position.copy(HAND_AT);
      handKey.visible = false; handGhost.visible = false; handKey.position.copy(Q); keyTurn(handKey, 0); handKey.setMat(keyMats.plain);
      paintKnuckles(0); hand.motors.forEach((m) => { m.mesh.material = M.dark; m.mesh.scale.setScalar(1); });
      hand.showSensors(false); hand.setSensorLevel(0);
    };
    const showHand = (style, little, turn) => { hand.root.visible = true; hand.setStyle(style); hand.setLittle(little); if (turn !== undefined) hand.root.rotation.set(0, turn, 0); };

    // Step 4: a small slip reaches the fingertips as a vibration; the sensors there light up.
    async function slipDemo(my) {
      handKey.position.copy(Q); hand.setSensorLevel(0.15); L2.show(false);
      const pinchMid = () => hand.tipWorld('index').lerp(hand.tipWorld('thumb'), 0.5);
      await A.wait(0.35); if (!A.alive(my)) return;
      await A.run(0.7, (k) => {
        handKey.position.set(Q.x + 0.0003 * Math.sin(k * 90), Q.y - 0.004 * k, Q.z + 0.0004 * Math.sin(k * 71));
        hand.lightSensors(pinchMid(), 0.026, Math.min(1, k * 2), 0.15);
      }); if (!A.alive(my)) return;
      handKey.position.set(Q.x, Q.y - 0.004, Q.z);
      place(L2, 'Slip felt: grip tightens', () => hand.tipWorld('index').add(new THREE.Vector3(0, 0.016, 0)), 'sense');
      await A.run(0.6, (k) => hand.lightSensors(pinchMid(), 0.026, 1 - 0.4 * k, 0.15));
    }

    // Step 5: the clamp can only open and close, so its key stays as it was picked up.
    async function clampTry(my) {
      gripKey.setMat(keyMats.plain); keyTurn(gripKey, 0); gripKey.position.set(0, KEY_DROP, 0); grip.setGap(0.0032);
      place(L1, 'Clamp', () => grip.root.localToWorld(new THREE.Vector3(0, 0.25, 0)), 'plain');
      for (let i = 0; i < 2; i++) {
        await A.run(0.3, (k) => { grip.setGap(lerp(0.0032, 0.012, k)); gripKey.position.y = KEY_DROP - 0.003 * k; keyTurn(gripKey, 0.07 * Math.sin(k * Math.PI)); }); if (!A.alive(my)) return;
        await A.run(0.3, (k) => { grip.setGap(lerp(0.012, 0.0032, k)); gripKey.position.y = KEY_DROP - 0.003 * (1 - k); keyTurn(gripKey, 0); }); if (!A.alive(my)) return;
      }
      gripKey.setMat(keyMats.fail);
      place(L1, "Can't turn it", () => grip.root.localToWorld(new THREE.Vector3(0, -0.068, 0)), 'fail');
    }
    // Step 5: the hand walks the key round with three pushes of its middle finger, lifting off between pushes.
    async function handTurn(my) {
      hand.setPose(PINCH); keyTurn(handKey, 0); handKey.position.copy(Q); handKey.setMat(keyMats.plain);
      place(L2, 'Hand', () => H2W(new THREE.Vector3(0, 0.2, 0)), 'plain');
      const reach = (to) => hand.solve('middle', H2W(to), { iterations: 6 });
      let beta = 0;
      for (let s = 0; s < 3; s++) {
        const b0 = beta, b1 = beta + GOAL / 3;
        const from = hand.hand.worldToLocal(hand.tipWorld('middle'));
        await A.run(0.3, (k) => reach(from.clone().lerp(pressAt(b0, 0.012), k))); if (!A.alive(my)) return;
        await A.run(0.15, (k) => reach(pressAt(b0, 0.012 * (1 - k)))); if (!A.alive(my)) return;
        await A.run(0.45, (k) => { beta = lerp(b0, b1, k); keyTurn(handKey, beta); reach(pressAt(beta)); }); if (!A.alive(my)) return;
        await A.run(0.15, (k) => reach(pressAt(b1, 0.012 * k))); if (!A.alive(my)) return;
      }
      await toPose(PINCH, 0.35); if (!A.alive(my)) return;
      handKey.setMat(keyMats.ok);
      place(L2, 'Turned it', () => H2W(Q.clone().addScaledVector(bladeDir(GOAL), 0.032).add(new THREE.Vector3(0, 0.016, 0))), 'ok');
    }

    stage.camera.position.set(0.16, 0.24, 0.6); stage.controls.target.set(0, 0.17, 0);

    return {
      steps: [
        { text: 'Many robots hold things with a simple clamp: two fingers and one motor that opens and closes them.',
          enter: async () => {
            const my = A.next(); reset();
            grip.root.visible = true; grip.motor.material = M.focus;
            place(L1, 'One motor', () => grip.motor.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.02, 0)), 'focus');
            place(L2, 'Two fingers', () => grip.fingers[1].localToWorld(new THREE.Vector3(0.012, 0.03, 0)), 'plain');
            A.frame([0, 0.2, 0], [0.45, 0.32, 1], 0.08, 0.13);
            await A.run(0.5, (k) => grip.setGap(lerp(0.05, 0.085, k))); if (!A.alive(my)) return;
            await A.run(0.6, (k) => grip.setGap(lerp(0.085, 0.012, k))); if (!A.alive(my)) return;
            await A.run(0.5, (k) => grip.setGap(lerp(0.012, 0.05, k)));
          } },
        { text: 'A human hand has 27 bones and about 20 ways to move. Each finger bends at three joints and swings sideways.',
          enter: async () => {
            const my = A.next(); reset();
            showHand('human', 'on', 0); hand.setPose(RELAX);
            A.frame([-0.008, 0.128, 0], [0.12, 0.12, 1], 0.092, 0.122);
            const say = (n) => ui.readout(`Ways to move counted: <b>${n}</b> · Bones in the wrist and hand: <b>27</b>`);
            say(0);
            let n = 0;
            for (let i = 0; i < hand.knuckles.length; i++) {
              await A.wait(0.16); if (!A.alive(my)) return;
              paintKnuckles(i + 1); n += hand.knuckles[i].moves; say(n);
              if (i === 0) place(L1, 'Bends and swings sideways', knuckleAt(0), 'focus');
              if (i === 2) place(L2, 'Bends', knuckleAt(2), 'plain');
            }
          } },
        { text: 'Robot hands copy this. LEAP Hand keeps three fingers and a thumb: 16 joints, each turned by its own motor.',
          enter: async () => {
            const my = A.next(); reset();
            showHand('robot', 'ghost', 0); hand.setPose(RELAX);
            hand.motors.forEach((m) => m.mesh.scale.setScalar(0.001));
            place(L3, 'Little finger left off', () => hand.digits.little.tip.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.012, 0)), 'plain');
            A.frame([-0.008, 0.128, 0], [0.12, 0.12, 1], 0.092, 0.122);
            ui.readout('Joints, each with its own motor: <b>0</b>');
            for (let i = 0; i < hand.motors.length; i++) {
              await A.wait(0.12); if (!A.alive(my)) return;
              const m = hand.motors[i].mesh; m.material = M.focus;
              A.run(0.18, (k) => m.scale.setScalar(Math.max(0.001, k)));
              ui.readout(`Joints, each with its own motor: <b>${i + 1}</b>`);
            }
          } },
        { text: 'Touch matters too. A slip starts as a tiny vibration; fingertip sensors feel it, and the hand squeezes before the object falls.',
          enter: async () => {
            const my = A.next(); reset();
            showHand('robot', 'off'); handKey.visible = true;
            hand.showSensors(true); hand.setSensorLevel(0.15);
            place(L1, 'Touch sensors', () => hand.tipWorld('middle').add(new THREE.Vector3(0, 0.016, 0)), 'sense');
            ui.readout("Meta's Digit 360 research fingertip: about <b>8.3 million</b> sensing points, feeling vibrations up to <b>10,000</b> times a second.");
            const r0 = hand.root.rotation.y;
            hand.root.rotation.y = TURN; const pw = H2W(Q); hand.root.rotation.y = r0;
            A.frame([pw.x - 0.008, pw.y + 0.012, pw.z], [-0.12, 0.22, 1], 0.08, 0.085);
            await A.run(0.9, (k) => { hand.root.rotation.y = lerp(r0, TURN, k); hand.setPose(lerpPose(hand.getPose(), PINCH, k)); }); if (!A.alive(my)) return;
            hand.setPose(PINCH); replay.show(true);
            await slipDemo(my);
          } },
        { text: 'Last test: turn the key to point sideways, using only the fingers. Doing that is called dexterous manipulation.',
          enter: async () => {
            const my = A.next(); reset();
            const wide = stage.camera.aspect >= 1;
            const gx = wide ? 0.11 : 0.085, hx = wide ? -0.09 : -0.05;
            const left = hx - 0.125, right = gx + 0.07; // the hand's turned key reaches out to the left
            grip.root.visible = true; grip.root.position.set(gx, 0.078, 0); grip.root.rotation.y = TURN; grip.setGap(0.0032);
            gripKey.visible = true; gripGhost.visible = true;
            showHand('robot', 'off', TURN); hand.root.position.set(hx, HAND_AT.y, 0); hand.setPose(PINCH); handKey.visible = true; handGhost.visible = true;
            place(L1, 'Clamp', () => grip.root.localToWorld(new THREE.Vector3(0, 0.25, 0)), 'plain');
            place(L2, 'Hand', () => H2W(new THREE.Vector3(0, 0.2, 0)), 'plain');
            place(L3, 'Goal', () => grip.root.localToWorld(bladeDir(GOAL).multiplyScalar(0.045).add(new THREE.Vector3(0, KEY_DROP + 0.008, 0))), 'plain');
            await A.frame([(left + right) / 2, 0.148, 0], [-0.04, 0.2, 1], (right - left) / 2, 0.16); if (!A.alive(my)) return;
            await ui.predict({ question: 'Keeping the wrist still, which one can turn its key to the goal?', answer: 'hand',
              options: [{ id: 'clamp', label: 'The clamp' }, { id: 'hand', label: 'The hand' }, { id: 'both', label: 'Both' }],
              explain: 'Only the hand. The clamp can only open and close, so its key stays the way it was picked up. The hand walks the key round, one finger push at a time.' });
            if (!A.alive(my)) return;
            await Promise.all([clampTry(my), handTurn(my)]); if (!A.alive(my)) return;
            tryWith.show(true); ui.hint('Try each one again');
          } },
      ],
      dispose() {},
    };
  },
};
