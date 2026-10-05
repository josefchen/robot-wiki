// Body 2: Inside a humanoid. Takeaway: over half of a humanoid's motors move its legs and keep it balanced,
// hands with fingers need about as many again, and the battery limits how long it can work.
// Numbers: Unitree G1 spec page (unitree.com/g1). Model proportions and joint layout: Unitree's g1_23dof.urdf.
import { THREE, ExplodedModel, shapes, slicer, reduceMotion } from '../kit.js';
import { buildHumanoid, STAND_Y } from '../models/humanoid.js';
import { EXPLAINER_WORDS } from '../words.ts';

const SPEC = 'Unitree G1 spec page';
const REGIONS = {
  legs: { name: 'Legs', count: 12, role: 'Six per leg: three at the hip, one at the knee, two for the ankle. They carry the whole body and keep it balanced.', spec: 'The knees have the strongest motors' },
  arms: { name: 'Arms', count: 10, role: 'Five per arm: three at the shoulder, one at the elbow, one to turn the wrist.', spec: 'Each arm can carry about 2 kilograms' },
  waist: { name: 'Waist', count: 1, role: 'One motor turns the whole upper body left and right.', spec: 'Turns up to 155 degrees each way' },
  hands: { name: 'Hands', count: 0, role: 'The standard hands have no motors. The optional three-finger hand has 7 motors each: 14 for both, more than the legs.', spec: 'Optional hand: 7 motors (thumb 3, two fingers 2 each)' },
  torso: { name: 'Torso and head', count: 0, role: 'No motors here. It holds the battery and the computer, and the head holds a depth camera and a laser scanner.', spec: 'Battery: about 2 hours per charge' },
};
const ORDER = ['legs', 'arms', 'waist', 'hands', 'torso'];

const STEP_TEXT = EXPLAINER_WORDS.humanoid.steps;

export default {
  id: 'humanoid',
  how: `<ul>
    <li>Numbers: the <a href="https://www.unitree.com/g1/" target="_blank" rel="noopener">Unitree G1 spec page</a>. Standard G1: 23 degrees of freedom, 6 per leg, 1 at the waist, 5 per arm, none in the hands; 1.32 m standing; about 35 kg with battery; strongest joint motor (the knee) up to 90 N·m; arm load about 2 kg; quick-release 9,000 mAh battery, about 2 h per charge. G1 EDU: 23 to 43 degrees of freedom, with 2 optional waist joints, 2 optional wrist joints per arm and the optional Dex3-1 three-finger hand (7 motors per hand).</li>
    <li>Model: stylised, not a scan. Proportions and the order of joints follow Unitree's published robot description <a href="https://github.com/unitreerobotics/unitree_ros/tree/master/robots/g1_description" target="_blank" rel="noopener">g1_23dof.urdf</a> (hip pitch, roll and yaw; knee; ankle pitch and roll; waist yaw; shoulder pitch, roll and yaw; elbow; wrist roll). As on the real robot, the two ankle motors sit high in the calf and turn the ankle through rods.</li>
    <li>Each dark drum is one motor and one degree of freedom. Battery and computer placement inside the torso is simplified.</li>
  </ul>`,

  async mount(stage, ui) {
    stage.setScale(1.4);
    const breathe = slicer();
    const H = buildHumanoid(stage);
    stage.world.add(H.root);
    H.pose();
    await breathe();

    // Context for step 1: a doorway and a short stair, drawn as ghosts.
    const ctx = new THREE.Group(); stage.world.add(ctx);
    const refMat = stage.material('ref', { opacity: 0.32 });
    const post = (x) => { const m = shapes.mesh(shapes.box(0.07, 2.0, 0.13, 0.015), refMat, { cast: false }); m.position.set(x, 1.0, -0.45); ctx.add(m); };
    post(-1.25); post(-0.35);
    const lintel = shapes.mesh(shapes.box(0.97, 0.07, 0.13, 0.015), refMat, { cast: false }); lintel.position.set(-0.8, 2.0, -0.45); ctx.add(lintel);
    // Stairs: one solid with a three-step profile, rising away from the viewer.
    const prof = new THREE.Shape([[0, 0], [0, 0.17], [-0.28, 0.17], [-0.28, 0.34], [-0.56, 0.34], [-0.56, 0.51], [-0.84, 0.51], [-0.84, 0]].map(([z, y]) => new THREE.Vector2(z, y)));
    const stairs = shapes.mesh(new THREE.ExtrudeGeometry(prof, { depth: 0.8, bevelEnabled: false }), refMat, { cast: false });
    stairs.rotation.y = -Math.PI / 2; stairs.position.set(1.35, 0, 0.3); ctx.add(stairs);

    // Invisible, slightly larger tap targets for the thin parts (arms, hands, waist motor), so they are easy to tap on a phone.
    const proxyMat = new THREE.MeshBasicMaterial();
    const proxy = (parent, geo, pos) => { const m = new THREE.Mesh(geo, proxyMat); m.visible = false; m.position.set(...pos); parent.add(m); };
    for (const a of H.arms) { proxy(a.yaw, new THREE.CapsuleGeometry(0.06, 0.13, 4, 8), [0, -0.1, 0]); proxy(a.elbow, new THREE.CapsuleGeometry(0.055, 0.1, 4, 8), [0, -0.08, 0]); }
    for (const h of H.hands) proxy(h, new THREE.SphereGeometry(0.07, 12, 8), [0, -0.05, 0]);
    proxy(H.waistMotor, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), [0, 0, 0]);
    await breathe();

    // Region parts. Later parts claim their meshes, so torso comes first and hands last.
    const parts = [
      { id: 'torso', objects: [H.torso] },
      { id: 'waist', objects: [H.waistMotor] },
      { id: 'legs', objects: [...H.legGroups, H.pelvisMesh] },
      { id: 'arms', objects: H.armGroups },
      { id: 'hands', objects: H.hands },
    ].map((p) => ({ ...p, kind: 'Body region', ...REGIONS[p.id] }));
    const model = new ExplodedModel(stage, H.root, parts);
    // Pull regions apart along the body's own lines: torso up, legs and arms out sideways, hands down.
    for (const p of parts) for (const it of p.items) {
      const s = Math.sign(it.base.x) || 0;
      it.delta.set(...({ torso: [0, 0.13, 0], waist: [0, 0.06, 0], legs: [s * 0.1, 0, 0], arms: [s * 0.13, 0.0, 0], hands: [0, -0.07, 0] })[p.id]);
    }

    // Painting: a region's motors in the focus colour, everything else as built (or faded).
    const paint = (ids = [], { fade = false, beads = false } = {}) => {
      H.handMotors.forEach((b) => { b.visible = beads; });
      H.root.traverse((m) => {
        if (!m.isMesh || !m.userData.part) return;
        const on = ids.includes(m.userData.part.id);
        if (m.userData.isMotor) m.material = on ? stage.mats.focus : (fade ? stage.mats.ghost : stage.mats.dark);
        else m.material = fade && !on ? stage.mats.ghost : m.userData.base;
        m.castShadow = !fade || on;
      });
    };
    const paintMeshes = (meshes, mat) => meshes.forEach((g) => g.traverse((m) => { if (m.isMesh) m.material = mat; }));

    // Choreography helpers. Every tween and camera move belongs to the step that started it.
    let epoch = 0;
    const tw = (d, fn) => { const my = epoch; return stage.tween(d, (k) => { if (my === epoch) fn(k); }); };
    const vf = () => Math.tan((stage.camera.fov * Math.PI) / 360);
    // Frame a box of width w and height h around target, looking along dir.
    const shot = (target, dir, w, h, d = 1.1) => {
      const dist = Math.max(h / 2 / vf(), w / 2 / (vf() * stage.camera.aspect)) * 1.08;
      const T = new THREE.Vector3(...target), P = new THREE.Vector3(...dir).normalize().multiplyScalar(dist).add(T);
      const t0 = stage.controls.target.clone(), p0 = stage.camera.position.clone();
      return tw(d, (k) => { stage.controls.target.lerpVectors(t0, T, k); stage.camera.position.lerpVectors(p0, P, k); });
    };
    const HOME = () => shot([0, 0.7, 0], [0.55, 0.22, 1], 0.9, 1.45);
    { const dist = 1.45 / 2 / vf() * 1.08; stage.controls.target.set(0, 0.7, 0); stage.camera.position.copy(new THREE.Vector3(0.55, 0.22, 1).normalize().multiplyScalar(dist).add(new THREE.Vector3(0, 0.7, 0))); }

    // Cover hinge for step 4: the chest cover swings open like a cabinet door.
    const hinge = new THREE.Group(); hinge.position.set(0.125, 0.235, 0.0875); H.torso.add(hinge);
    hinge.attach(H.cover);
    const setCover = (k) => { hinge.rotation.y = 1.95 * k; };

    // Labels (at most three at a time).
    const wp = (obj, off = [0, 0, 0]) => () => obj.localToWorld(new THREE.Vector3(...off));
    const L = {
      g1: stage.label('Unitree G1', wp(H.head, [0, 0.1, 0])),
      legs: stage.label('Legs: 12 motors', wp(H.legs[0].knee, [0.08, 0, 0]), { tone: 'focus' }),
      arms: stage.label('Arms: 10 motors', wp(H.arms[1].elbow, [-0.03, 0, 0])),
      waist: stage.label('Waist: 1 motor', wp(H.waistMotor, [0, 0, 0])),
      hands: stage.label('Three-finger hands: 14 motors', wp(H.hands[1], [0, -0.05, 0]), { tone: 'focus' }),
      knee: stage.label('Knee: the strongest motor', wp(H.legs[0].knee, [0.08, 0, 0.03]), { tone: 'focus' }),
      weight: stage.label('Weight pulling down: about 35 kilograms', () => H.com().add(new THREE.Vector3(0, 0.08, 0)), { tone: 'act' }),
      battery: stage.label('Battery: about 2 hours', wp(H.battery, [0, -0.02, 0.03]), { tone: 'focus' }),
      computer: stage.label('Computer: controls the motors', wp(H.computer, [0, 0.02, 0.02])),
      cover: stage.label('Chest cover', () => new THREE.Box3().setFromObject(H.cover).getCenter(new THREE.Vector3())),
    };
    const labels = (...on) => { for (const [k, l] of Object.entries(L)) l.show(on.includes(k)); };
    labels();

    // Weight arrow for step 3.
    const weight = shapes.arrow(stage, 'act', 0.013); weight.visible = false; stage.world.add(weight);
    weight.traverse((m) => { if (m.isMesh) { m.material.depthTest = false; m.renderOrder = 20; m.castShadow = false; } }); // seen through the body
    const down = new THREE.Vector3(0, -1, 0);

    // The one interaction: tap a region to count its motors.
    let tapOn = false;
    const showRegion = (p) => {
      if (!p) { paint(['legs']); ui.card(null); return; }
      paint([p.id], { fade: true, beads: p.id === 'hands' });
      ui.card({ kind: `${p.count} motor${p.count === 1 ? '' : 's'}`, name: p.name, role: p.role, spec: p.spec, src: SPEC });
    };
    const tapPart = (p) => {
      showRegion(p && p !== model.selected ? p : null);
      model.selected = p && p !== model.selected ? p : null;
    };
    const offClick = stage.onClick((ray) => { if (tapOn) tapPart(model.pick(ray)); });
    const tally = () => ui.readout('Motors: legs <b>12</b>, arms <b>10</b>, waist <b>1</b>. That is all <b>23</b>; the standard hands and the torso have none.');

    const reset = () => {
      tapOn = false; model.selected = null; ui.card(null); ui.hint(''); ui.readout('');
      labels(); weight.visible = false; ctx.visible = false;
      paint([]); setCover(0); H.pose();
    };

    return {
      steps: [
        { text: STEP_TEXT[0],
          enter: async () => { const my = ++epoch; reset(); ctx.visible = true; labels('g1'); stage.focus(H.root, ctx);
            ui.readout('The G1, made by the company Unitree: <b>1.32 metres</b> tall, about <b>35 kilograms</b>.');
            // Frame the robot as it will stand once put back together, with its doorway and stairs.
            const was = model.explode; model.setExplode(0);
            const framing = stage.fit([H.root, ctx], [0.5, 0.3, 1], { margin: 0.86, duration: 1.2 });
            model.setExplode(was); model.animateExplode(0, 0.5);
            await framing; if (my !== epoch) return; } },
        { text: STEP_TEXT[1],
          enter: async () => { const my = ++epoch; reset(); stage.focus(H.root);
            model.animateExplode(1, 1.0);
            shot([0, 0.72, 0], [0.32, 0.18, 1], 1.15, 1.6, 1.1);
            await ui.predict({ question: 'Where do most of its 23 motors go?', answer: 'legs',
              options: [{ id: 'legs', label: 'Legs' }, { id: 'arms', label: 'Arms' }, { id: 'hands', label: 'Hands' }, { id: 'torso', label: 'Torso' }],
              explain: 'The legs: 12 of the 23, over half. The arms have 10 and the waist 1. The standard hands are fixed, with no motors.' });
            if (my !== epoch) return;
            paint(['legs']); labels('legs', 'arms', 'waist'); tally();
            tapOn = true; ui.hint('Tap a part of the body'); ui.parts(ORDER.map((id) => parts.find((p) => p.id === id)), tapPart, (p) => model.selected === p); },
          leave: () => { tapOn = false; ui.hint(''); ui.card(null); ui.parts(null); } },
        { text: STEP_TEXT[2],
          enter: async () => { ++epoch; reset(); stage.focus(H.root);
            model.animateExplode(0, 0.6);
            paint(['legs']); paintMeshes(H.kneeMotors, stage.mats.focus);
            labels('knee', 'weight');
            ui.readout('The knees have the strongest motors. Each arm can carry only about <b>2 kilograms</b>.');
            const place = () => { const c = H.com(); weight.set(c, down, 0.5); };
            place(); weight.visible = true;
            shot([0, 0.64, 0], [0.85, 0.3, 1], 1.0, 1.5, 1.0);
            // A slow half squat, held: the legs lower the whole body and hold it up.
            await tw(1.6, (k) => { H.pose({ pelvis: { y: STAND_Y - 0.12 * k, z: -0.03 * k, pitch: 0.14 * k }, arms: { pitch: -0.05 - 0.75 * k, elbow: -0.4 + 0.15 * k } }); place(); }); } },
        { text: STEP_TEXT[3],
          enter: async () => { const my = ++epoch; reset(); stage.focus(H.battery, H.computer);
            model.animateExplode(0, 0.5);
            paint(['torso'], { fade: true }); paintMeshes([H.battery], stage.mats.focus); paintMeshes([H.computer], stage.mats.dark);
            ui.readout('One charge lasts about <b>2 hours</b>. Then a person can swap in a charged battery.');
            shot([0, 1.0, 0.06], [-0.55, 0.28, 1], 0.72, 0.8, 1.0);
            await tw(1.0, (k) => setCover(k)); if (my !== epoch) return;
            labels('battery', 'computer', 'cover'); } },
        { text: STEP_TEXT[4],
          enter: async () => { const my = ++epoch; reset(); stage.focus(H.root);
            model.animateExplode(0, 0.5);
            HOME();
            const all = [...H.motors.legs, ...H.motors.waist, ...H.motors.arms];
            for (let i = 0; i < all.length; i++) {
              paintMeshes([all[i]], stage.mats.focus);
              ui.readout(`Motors: <b>${i + 1}</b>`);
              await new Promise((r) => setTimeout(r, 60)); if (my !== epoch) return;
            }
            await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 500)); if (my !== epoch) return;
            // Then the optional three-finger hands light up beside the legs: 14 motors against 12.
            paint(['legs', 'hands'], { beads: true }); labels('legs', 'hands');
            ui.readout('The standard G1 has <b>23</b>. Optional three-finger hands add <b>14</b>, more than the <b>12</b> in the legs. With every optional extra, a G1 has up to <b>43</b>.'); } },
      ],
      dispose() { offClick(); },
    };
  },
};
