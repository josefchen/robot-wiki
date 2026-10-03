// Stylised quadcopter in the matte clay style (a ~450 mm "X" frame, the classic hobby/research size).
// Body frame: +x is the nose, +y is up, +z is the drone's right. Origin at the centre of the body.
// Spin directions follow the standard quad X layout: diagonal motors spin the same way, so the
// front-right and back-left pair spins counter-clockwise (seen from above) and the other pair clockwise.
import { THREE, shapes } from '../kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const A = 0.2 / Math.SQRT2; // motor offset along x and z (0.2 m from the centre)
export const QUAD = { a: A, propR: 0.115, propY: 0.05, hoverArrow: 0.1 };
// dir: +1 spins clockwise seen from above, -1 counter-clockwise.
export const ROTORS = [
  { id: 'fr', name: 'Front right', x: A, z: A, dir: -1 },
  { id: 'bl', name: 'Back left', x: -A, z: -A, dir: -1 },
  { id: 'fl', name: 'Front left', x: A, z: -A, dir: 1 },
  { id: 'br', name: 'Back right', x: -A, z: A, dir: 1 },
];

const rbox = (w, h, d, r, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);
const cyl = (r, h, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg);

// One propeller blade lying along +x, pitched so it pushes air down when it spins in direction `dir`.
function bladeGeometry(dir) {
  const L = QUAD.propR, s = new THREE.Shape();
  // Planform: narrow root, widest about a third out, rounded tip (u along the blade, v across it).
  const pts = [[0.008, -0.006], [0.03, -0.011], [0.06, -0.01], [0.095, -0.0075], [L - 0.006, -0.005]];
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) s.lineTo(u, v);
  s.quadraticCurveTo(L + 0.002, 0, L - 0.006, 0.005);
  for (const [u, v] of [...pts].reverse().slice(1)) s.lineTo(u, -v * 0.85);
  s.lineTo(pts[0][0], 0.006);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0022, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -0.0011);
  g.rotateX(-Math.PI / 2); // shape's v axis now runs along -z; blade lies flat
  g.rotateX(-dir * 0.21); // pitch: leading edge up for this spin direction
  return g;
}

export function makeQuadGeometries() {
  return {
    shell: rbox(0.17, 0.05, 0.115, 0.02, 3),
    canopy: rbox(0.11, 0.02, 0.08, 0.009),
    fc: rbox(0.052, 0.012, 0.042, 0.004),
    fcMark: new THREE.ConeGeometry(0.008, 0.016, 3),
    camBody: rbox(0.026, 0.03, 0.036, 0.006),
    lens: cyl(0.009, 0.008, 20),
    arm: rbox(0.17, 0.016, 0.022, 0.006),
    pad: cyl(0.024, 0.008),
    stator: cyl(0.019, 0.012),
    bell: cyl(0.022, 0.02),
    bellRing: cyl(0.0225, 0.004),
    nut: cyl(0.0065, 0.012, 16),
    hub: cyl(0.011, 0.009, 18),
    spinner: new THREE.ConeGeometry(0.008, 0.012, 18),
    bladeCW: bladeGeometry(1),
    bladeCCW: bladeGeometry(-1),
    disc: new THREE.CircleGeometry(QUAD.propR, 48),
    battery: rbox(0.13, 0.034, 0.05, 0.008),
    strap: rbox(0.014, 0.04, 0.056, 0.004),
    strut: shapes.capsule(0.0045, 0.06),
    skid: shapes.capsule(0.005, 0.17),
  };
}

// Build one drone. mat: a single material for every mesh (used for ghosts). lite: skip small details.
export function buildQuadcopter(stage, { geos = makeQuadGeometries(), mat = null, lite = false, shadows = true } = {}) {
  const clay = mat || stage.mats.clay, dark = mat || stage.mats.dark;
  const mk = (g, m, parent, x = 0, y = 0, z = 0) => { const o = shapes.mesh(g, m, { cast: shadows && !mat, receive: !mat }); o.position.set(x, y, z); parent?.add(o); return o; };
  const root = new THREE.Group();

  // Frame: body shell, canopy, nose camera, landing skids and four arms.
  const body = new THREE.Group(); root.add(body);
  mk(geos.shell, clay, body);
  mk(geos.canopy, clay, body, -0.01, 0.031, 0);
  if (!lite) {
    const cam = mk(geos.camBody, dark, body, 0.088, -0.004, 0);
    const lens = mk(geos.lens, clay, cam, 0.014, 0, 0); lens.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      for (const sx of [-1, 1]) { const st = mk(geos.strut, clay, body, sx * 0.05, -0.058, side * 0.055); st.rotation.x = side * 0.32; }
      const sk = mk(geos.skid, clay, body, 0, -0.088, side * 0.066); sk.rotation.z = Math.PI / 2;
    }
  }
  const arms = ROTORS.map((r) => {
    const g = new THREE.Group(); root.add(g);
    const ang = Math.atan2(r.z, r.x);
    const arm = mk(geos.arm, clay, g, 0.11 * Math.cos(ang), 0.004, 0.11 * Math.sin(ang)); arm.rotation.y = -ang;
    mk(geos.pad, clay, g, r.x, 0.008, r.z);
    return g;
  });

  // Motors: dark stator and bell on each arm tip.
  const motors = ROTORS.map((r) => {
    const g = new THREE.Group(); g.position.set(r.x, 0, r.z); root.add(g);
    mk(geos.stator, dark, g, 0, 0.018, 0);
    mk(geos.bell, dark, g, 0, 0.034, 0);
    if (!lite) mk(geos.bellRing, clay, g, 0, 0.027, 0);
    mk(geos.nut, dark, g, 0, 0.048, 0);
    return g;
  });

  // Propellers: two pitched blades, a hub and a spinner. The group spins about y.
  const props = ROTORS.map((r) => {
    const g = new THREE.Group(); g.position.set(r.x, QUAD.propY, r.z); root.add(g);
    if (!lite) {
      const geo = r.dir > 0 ? geos.bladeCW : geos.bladeCCW;
      const b1 = mk(geo, clay, g); const b2 = mk(geo, clay, g); b2.rotation.y = Math.PI;
      b1.rotation.y = 0.35; b2.rotation.y = Math.PI + 0.35;
      mk(geos.hub, dark, g, 0, 0.002, 0);
      mk(geos.spinner, clay, g, 0, 0.012, 0);
    }
    return g;
  });

  // Battery under the body, held by a strap.
  const battery = new THREE.Group(); battery.position.set(-0.005, -0.046, 0); root.add(battery);
  mk(geos.battery, dark, battery);
  if (!lite) mk(geos.strap, clay, battery, 0.02, 0, 0);

  // Flight computer on top, with an arrow that marks the nose.
  const computer = new THREE.Group(); computer.position.set(-0.01, 0.047, 0); root.add(computer);
  mk(geos.fc, dark, computer);
  if (!lite) { const mark = mk(geos.fcMark, clay, computer, 0.006, 0.007, 0); mark.rotation.set(Math.PI / 2, 0, -Math.PI / 2); mark.scale.set(1, 1, 0.25); }

  // Faint spinning discs (lite ghosts show these instead of blades) and spin-direction arcs.
  const discMat = mat || stage.material('ref', { opacity: 0.1 });
  const discs = ROTORS.map((r) => {
    const d = new THREE.Mesh(geos.disc, discMat); d.rotation.x = -Math.PI / 2; d.position.set(r.x, QUAD.propY + 0.001, r.z);
    d.visible = lite; d.renderOrder = 3; root.add(d); return d;
  });
  return { root, body, arms, motors, props, battery, computer, discs, rotors: ROTORS };
}

// A curved arrow lying flat (in the x–z plane) around a centre: r radius, phi0 centre angle
// (point = (r cos phi, 0, r sin phi)), span in radians, dir +1 clockwise / -1 counter-clockwise seen from above.
export function arcArrow(stage, role, { r, phi0 = 0, span = 1.9, dir = 1, tube = 0.0022, head = 0.014 }) {
  const g = new THREE.Group();
  const pts = [];
  const n = 28;
  for (let i = 0; i <= n; i++) { const phi = phi0 + dir * span * (i / n - 0.5); pts.push(new THREE.Vector3(r * Math.cos(phi), 0, r * Math.sin(phi))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mats = { current: stage.mats[role] };
  const tubeM = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, tube, 6, false), mats.current);
  const tang = pts[n].clone().sub(pts[n - 1]).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(head * 0.42, head, 14), mats.current);
  cone.position.copy(pts[n]).addScaledVector(tang, head * 0.35);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tang);
  g.add(tubeM, cone);
  g.tip = cone.position.clone();
  g.setRole = (rl) => { tubeM.material = stage.mats[rl]; cone.material = stage.mats[rl]; return g; };
  return g;
}
