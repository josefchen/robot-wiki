// Body 1: The arm. Takeaway: a robot arm is a chain; each motor moves everything after it,
// so the motors nearest the base work hardest.
import { ExplodedModel, lerp } from '../kit.js';
import { loadSO101, SO101_NAMES } from '../models/so101.js';

const STALL = 1.9; // N·m, STS3215 7.4 V stall torque (19.5 kg·cm), Feetech
const TUCKED = { shoulder_pan: 0.35, shoulder_lift: -1.45, elbow_flex: 1.45, wrist_flex: 0.9, wrist_roll: 0, gripper: 0.3 };
const REACHED = { shoulder_pan: 0.35, shoulder_lift: 0.15, elbow_flex: -0.05, wrist_flex: 0.05, wrist_roll: 0, gripper: 0.3 };
const blend = (t) => Object.fromEntries(Object.keys(TUCKED).map((k) => [k, lerp(TUCKED[k], REACHED[k], t)]));

export default {
  id: 'arm',
  kicker: 'Robot anatomy · the arm',
  question: 'What is a robot arm made of?',
  takeaway: 'A robot arm is a chain: each motor moves everything after it, so the motors nearest the base work hardest.',
  concept: { name: 'This chain of links and joints is called a kinematic chain', article: 'Kinematics', href: 'https://robot-wiki.com/classical/kinematics/' },
  selfCheck: { q: 'Which motor would you make the strongest, and why?', a: 'The shoulder lift. It holds up the whole arm, and the further the arm reaches, the more it has to hold.' },
  how: `<ul>
    <li>Model: the SO-101 follower arm, from <a href="https://github.com/TheRobotStudio/SO-ARM100" target="_blank" rel="noopener">TheRobotStudio/SO-ARM100</a> (Apache-2.0), meshes simplified from 940,000 to 24,000 vertices.</li>
    <li>Holding loads are computed live from the link masses and centres of mass in the arm's URDF, at the pose shown, with no payload. They are what each motor must supply just to stay still.</li>
    <li>Motors: six Feetech STS3215 servos with 1:345 gearing (<a href="https://huggingface.co/docs/lerobot/en/so101" target="_blank" rel="noopener">LeRobot SO-101 guide</a>); stall torque 19.5 kg·cm, about 1.9 N·m, at 7.4 V (<a href="https://www.feetechrc.com/2020-05-13_56655.html" target="_blank" rel="noopener">Feetech</a>); 55 g each (<a href="https://www.feetechrc.com/products.html?keyword=STS3215" target="_blank" rel="noopener">Feetech</a>).</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(0.45);
    const arm = await loadSO101(stage, { pose: blend(0.45) });
    stage.world.add(arm.root); arm.seat();

    // Parts: one per motor and one per printed link group.
    const byLink = {};
    for (const v of arm.visuals) (byLink[v.link] ??= []).push(v);
    const motorOf = { base_link: 'shoulder_pan', shoulder_link: 'shoulder_lift', upper_arm_link: 'elbow_flex', lower_arm_link: 'wrist_flex', wrist_link: 'wrist_roll', gripper_link: 'gripper' };
    const linkName = { base_link: 'Base', shoulder_link: 'Shoulder bracket', upper_arm_link: 'Upper arm', lower_arm_link: 'Forearm', wrist_link: 'Wrist', gripper_link: 'Fixed jaw', moving_jaw_so101_v1_link: 'Moving jaw' };
    const parts = [], motors = [];
    for (const [link, vs] of Object.entries(byLink)) {
      const servo = vs.filter((v) => v.isServo), frame = vs.filter((v) => !v.isServo);
      if (frame.length) parts.push({ id: link, kind: 'Printed link', name: linkName[link] || link, role: 'Plastic structure. It carries the motors after it.', objects: frame.map((v) => v.holder) });
      if (servo.length) {
        const j = motorOf[link];
        const p = { id: j, kind: `Motor ${motors.length + 1} of 6`, name: SO101_NAMES[j], role: 'Turns one joint. It also carries every part after it.', spec: 'Feetech STS3215 · 55 g · stalls at about 1.9 N·m', src: 'Feetech; LeRobot SO-101 guide', objects: servo.map((v) => v.holder), joint: j };
        parts.push(p); motors.push(p);
      }
    }
    const model = new ExplodedModel(stage, arm.root, parts, { flat: true, radial: 0.9 });

    // Load colouring: each motor shades from clay to the force colour by its share of the stall torque.
    const loadMats = Object.fromEntries(motors.map((m) => [m.id, stage.mats.flat.dark.clone()]));
    const paintLoad = (on) => {
      const tau = arm.gravityTorques();
      for (const m of motors) {
        const mat = loadMats[m.id];
        mat.color.copy(stage.colors.dark).lerp(stage.colors.act, Math.min(1, (tau[m.joint] || 0) / (STALL * 0.6)));
        m.objects.forEach((o) => o.traverse((x) => { if (x.isMesh) x.material = on ? mat : x.userData.base; }));
      }
      return tau;
    };
    const fmt = (v) => `${v.toFixed(2)} N·m`;
    const loadLabels = [];
    const showLoads = () => {
      const tau = paintLoad(true);
      const top = [...motors].sort((a, b) => tau[b.joint] - tau[a.joint]).slice(0, 3);
      loadLabels.forEach((l) => l.remove()); loadLabels.length = 0;
      for (const m of top) loadLabels.push(stage.label(`${m.name}: ${fmt(tau[m.joint])}`, () => model.center(m), { tone: m === top[0] ? 'act' : 'plain' }));
      const s = tau.shoulder_lift;
      ui.readout(`Shoulder lift holds <b>${fmt(s)}</b>, ${Math.round((100 * s) / STALL)}% of what its motor can give. The base turn holds <b>0 N·m</b>, because gravity pulls straight down along the axis it turns about.`);
    };
    const clearLoads = () => { paintLoad(false); loadLabels.forEach((l) => l.remove()); loadLabels.length = 0; ui.readout(''); };

    // Controls (shown per step).
    const explode = ui.slider({ label: '', left: 'Together', right: 'Pulled apart', value: 0, onInput: (v) => model.setExplode(v) });
    const reach = ui.slider({ label: '', left: 'Tucked in', right: 'Reaching out', value: 1, onInput: (v) => { arm.setPose(blend(v)); showLoads(); } });
    explode.show(false); reach.show(false);
    let tapOn = false;
    const offClick = stage.onClick((ray) => {
      if (!tapOn) return;
      const p = model.pick(ray);
      model.select(p === model.selected ? null : p);
      ui.card(p && p !== null && model.selected ? p : null);
    });
    const home = () => stage.view([0.0, 0.14, 0.0], [0.42, 0.32, 0.52], 1.2);
    stage.camera.position.set(0.5, 0.4, 0.62); stage.controls.target.set(0, 0.14, 0);

    return {
      steps: [
        { text: 'This is an SO-101, a small arm people build to teach robots. It has six motors, one for each joint.',
          enter: async () => { clearLoads(); explode.show(false); reach.show(false); tapOn = false; ui.card(null); await model.animateExplode(0, 0.6); model.highlight(motors, 'focus'); home(); } },
        { text: 'Pull it apart. Printed plastic links and motors alternate, from the base to the jaw. Tap any part to see what it does.',
          enter: async () => { clearLoads(); model.select(null); reach.show(false); explode.show(true); tapOn = true; ui.hint('Tap a part'); await model.animateExplode(0.6, 1.1); explode.set(0.6); },
          leave: () => { ui.hint(''); ui.card(null); model.select(null); tapOn = false; } },
        { text: 'Each motor carries every part after it. With the arm stretched out like this, which motor works hardest just to hold it still?',
          enter: async () => {
            explode.show(false); model.select(null);
            await model.animateExplode(0, 0.6); explode.set(0);
            const from = arm.getPose();
            await stage.tween(1.0, (k) => arm.setPose(Object.fromEntries(Object.keys(REACHED).map((j) => [j, lerp(from[j], REACHED[j], k)]))));
            reach.set(1);
            await stage.view([0.2, 0.14, 0.02], [0.28, 0.3, 1.0], 1.0);
            await ui.predict({ question: 'Which motor works hardest?', answer: 'shoulder_lift',
              options: [{ id: 'gripper', label: 'Gripper' }, { id: 'wrist_flex', label: 'Wrist flex' }, { id: 'elbow_flex', label: 'Elbow' }, { id: 'shoulder_lift', label: 'Shoulder lift' }],
              explain: 'The shoulder lift holds up everything after it, far out from its joint. Now tuck the arm in and watch its load collapse.' });
            reach.show(true); showLoads(); ui.hint('Move the slider');
          },
          leave: () => { ui.hint(''); } },
        { text: 'So arms need their strongest motors near the base, and can lift only a little at the tip. This chain of links and joints is a kinematic chain.',
          enter: async () => { reach.show(false); clearLoads(); model.select(null); ui.predictEl.hidden = true;
            arm.setPose(blend(0.45)); reach.set(0.45);
            for (const m of motors) { model.highlight([m], 'focus'); await new Promise((r) => setTimeout(r, 260)); }
            model.select(null); home(); } },
      ],
      dispose() { offClick(); },
    };
  },
};
