// Body 1: The arm. Takeaway: a robot arm is a chain; each motor moves everything after it,
// so the motors nearest the base work hardest.
import { ExplodedModel, lerp } from '../kit.js';
import { loadSO101, SO101_NAMES } from '../models/so101.js';
import { EXPLAINER_WORDS } from '../words.ts';

// N·m, STS3215 7.4 V stall torque (19.5 kg·cm), Feetech. The stage shows each load as a share of it,
// the motor's full strength, so readers never meet the unit.
const STALL = 1.9;
const TUCKED = { shoulder_pan: 0.35, shoulder_lift: -1.45, elbow_flex: 1.45, wrist_flex: 0.9, wrist_roll: 0, gripper: 0.3 };
const REACHED = { shoulder_pan: 0.35, shoulder_lift: 0.15, elbow_flex: -0.05, wrist_flex: 0.05, wrist_roll: 0, gripper: 0.3 };
const blend = (t) => Object.fromEntries(Object.keys(TUCKED).map((k) => [k, lerp(TUCKED[k], REACHED[k], t)]));

const STEP_TEXT = EXPLAINER_WORDS.arm.steps;

export default {
  id: 'arm',
  how: `<ul>
    <li>Model: the SO-101 follower arm, from <a href="https://github.com/TheRobotStudio/SO-ARM100" target="_blank" rel="noopener">TheRobotStudio/SO-ARM100</a> (Apache-2.0), meshes simplified from 940,000 to 24,000 vertices.</li>
    <li>Holding loads are computed live from the link masses and centres of mass in the arm's URDF, at the pose shown, with no payload. They are what each motor must supply just to stay still, shown as a share of its stall torque.</li>
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
    const linkName = { base_link: 'Base', shoulder_link: 'Shoulder bracket', upper_arm_link: 'Upper arm', lower_arm_link: 'Forearm', wrist_link: 'Wrist', gripper_link: 'Fixed finger', moving_jaw_so101_v1_link: 'Moving finger' };
    const parts = [], motors = [];
    for (const [link, vs] of Object.entries(byLink)) {
      const servo = vs.filter((v) => v.isServo), frame = vs.filter((v) => !v.isServo);
      if (frame.length) parts.push({ id: link, kind: '3D-printed part', name: linkName[link] || link, role: 'Plastic structure. It carries the motors after it.', objects: frame.map((v) => v.holder) });
      if (servo.length) {
        const j = motorOf[link];
        const p = { id: j, kind: `Motor ${motors.length + 1} of 6`, name: SO101_NAMES[j], listName: `${SO101_NAMES[j]} motor`, role: 'Turns one joint. It also carries every part after it.', spec: 'Feetech STS3215 · 55 grams', src: 'Feetech; LeRobot SO-101 guide', objects: servo.map((v) => v.holder), joint: j };
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
    const share = (v) => `${Math.round((100 * Math.max(0, v)) / STALL)}%`;
    const loadLabels = [];
    const showLoads = () => {
      const tau = paintLoad(true);
      const top = [...motors].sort((a, b) => tau[b.joint] - tau[a.joint]).slice(0, 3);
      loadLabels.forEach((l) => l.remove()); loadLabels.length = 0;
      for (const m of top) loadLabels.push(stage.label(`${m.name}: ${share(tau[m.joint])}`, () => model.center(m), { tone: m === top[0] ? 'act' : 'plain' }));
      ui.readout(`Each number is how much of its full strength a motor uses just to hold the arm still; the harder it works, the stronger its colour. The shoulder lift uses <b>${share(tau.shoulder_lift)}</b>. The unlabelled motors hold almost nothing.`);
    };
    const clearLoads = () => { paintLoad(false); loadLabels.forEach((l) => l.remove()); loadLabels.length = 0; ui.readout(''); };

    // Controls (shown per step).
    const explode = ui.slider({ label: '', left: 'Together', right: 'Pulled apart', value: 0, onInput: (v) => model.setExplode(v) });
    const reach = ui.slider({ label: '', left: 'Tucked in', right: 'Reaching out', value: 1, onInput: (v) => { arm.setPose(blend(v)); showLoads(); } });
    explode.show(false); reach.show(false);
    let tapOn = false;
    const tapPart = (p) => {
      model.select(p === model.selected ? null : p);
      ui.card(p && model.selected ? p : null);
    };
    const offClick = stage.onClick((ray) => { if (tapOn) tapPart(model.pick(ray)); });
    const home = () => stage.fit([arm.root], [0.42, 0.18, 0.52], { margin: 0.8, duration: 1.2 });
    stage.camera.position.set(0.5, 0.4, 0.62); stage.controls.target.set(0, 0.14, 0);

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => { stage.focus(arm.root); clearLoads(); explode.show(false); reach.show(false); tapOn = false; ui.card(null); await model.animateExplode(0, 0.6); model.highlight(motors, 'focus'); home(); } },
        { text: STEP_TEXT[1],
          enter: async () => {
            clearLoads(); model.select(null); reach.show(false); explode.show(true); tapOn = true; ui.hint('Tap a part'); ui.parts(parts, tapPart, (p) => model.selected === p);
            // Frame the arm as it will be once apart, so the camera pulls back while the parts separate.
            model.setExplode(0.6);
            const framing = stage.fit([arm.root], stage.camera.position.clone().sub(stage.controls.target), { margin: 0.8, duration: 1.1 });
            model.setExplode(0);
            await Promise.all([framing, model.animateExplode(0.6, 1.1)]); explode.set(0.6);
          },
          leave: () => { ui.hint(''); ui.card(null); ui.parts(null); model.select(null); tapOn = false; } },
        { text: STEP_TEXT[2],
          enter: async () => {
            stage.focus(arm.root); explode.show(false); model.select(null);
            await model.animateExplode(0, 0.6); explode.set(0);
            const from = arm.getPose();
            await stage.tween(1.0, (k) => arm.setPose(Object.fromEntries(Object.keys(REACHED).map((j) => [j, lerp(from[j], REACHED[j], k)]))));
            reach.set(1);
            await stage.view([0.2, 0.14, 0.02], [0.28, 0.3, 1.0], 1.0);
            await ui.predict({ question: 'Which motor works hardest?', answer: 'shoulder_lift',
              options: [{ id: 'gripper', label: 'Gripper' }, { id: 'wrist_flex', label: 'Wrist bend' }, { id: 'elbow_flex', label: 'Elbow' }, { id: 'shoulder_lift', label: 'Shoulder lift' }],
              explain: 'The shoulder lift holds up everything after it, far out from its joint. Now tuck the arm in and see its number drop.' });
            reach.show(true); showLoads(); ui.hint('Move the slider');
          },
          leave: () => { ui.hint(''); } },
        { text: STEP_TEXT[3],
          enter: async () => { stage.focus(arm.root); reach.show(false); clearLoads(); model.select(null); ui.predictEl.hidden = true;
            arm.setPose(blend(0.45)); reach.set(0.45);
            for (const m of motors) { model.highlight([m], 'focus'); await new Promise((r) => setTimeout(r, 260)); }
            model.select(null); home(); } },
      ],
      dispose() { offClick(); },
    };
  },
};
