// Small two-wheeled indoor robot in the matte clay style (about 36 cm long, like a delivery or
// research base): two driven wheels, a rear caster ball, a front camera and a spinning-range-sensor puck.
// Origin on the floor under the middle of the robot, nose along +x.
import { THREE, shapes } from '../kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const ROVER = { wheelR: 0.06, length: 0.36, width: 0.3, sensor: new THREE.Vector3(0.07, 0.235, 0) };

export function makeRoverGeometries() {
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);
  const cyl = (r, h, seg = 28) => new THREE.CylinderGeometry(r, r, h, seg);
  return {
    chassis: rbox(0.34, 0.085, 0.23, 0.03),
    deck: rbox(0.25, 0.035, 0.2, 0.014),
    bumper: rbox(0.03, 0.045, 0.22, 0.012),
    tyre: cyl(ROVER.wheelR, 0.036),
    hub: cyl(0.032, 0.038),
    spoke: rbox(0.052, 0.012, 0.04, 0.004),
    caster: shapes.sphere(0.024, 18),
    mast: cyl(0.012, 0.05, 16),
    puck: cyl(0.04, 0.034),
    cap: cyl(0.034, 0.008),
    camBody: rbox(0.03, 0.03, 0.06, 0.007),
    lens: cyl(0.01, 0.01, 18),
  };
}

export function buildRover(stage, { geos = makeRoverGeometries(), mat = null, shadow = !mat } = {}) {
  const clay = mat || stage.mats.clay, dark = mat || stage.mats.dark;
  const mk = (g, m, parent, x = 0, y = 0, z = 0) => { const o = shapes.mesh(g, m, { cast: shadow, receive: !mat }); o.position.set(x, y, z); parent.add(o); return o; };
  const root = new THREE.Group();
  mk(geos.chassis, clay, root, 0, 0.0775, 0);
  mk(geos.deck, clay, root, -0.02, 0.137, 0);
  mk(geos.bumper, dark, root, 0.168, 0.06, 0);
  const cam = mk(geos.camBody, dark, root, 0.13, 0.17, 0);
  const lens = mk(geos.lens, clay, cam, 0.016, 0, 0); lens.rotation.z = Math.PI / 2;
  mk(geos.mast, clay, root, ROVER.sensor.x, 0.18, 0);
  mk(geos.puck, dark, root, ROVER.sensor.x, ROVER.sensor.y - 0.012, 0);
  mk(geos.cap, clay, root, ROVER.sensor.x, ROVER.sensor.y + 0.009, 0);
  mk(geos.caster, dark, root, -0.13, 0.024, 0);
  // Wheels turn about their axle (z); the hub bar makes the turning visible.
  const wheels = [-1, 1].map((side) => {
    const w = new THREE.Group(); w.position.set(0.04, ROVER.wheelR, side * 0.135); root.add(w);
    const t = mk(geos.tyre, dark, w); t.rotation.x = Math.PI / 2;
    const h = mk(geos.hub, clay, w); h.rotation.x = Math.PI / 2;
    mk(geos.spoke, dark, w, 0, 0, side * 0.002);
    return w;
  });
  let rolled = 0;
  return {
    root, wheels,
    // Turn the wheels as if the robot had rolled `dist` metres.
    roll(dist) { rolled += dist; for (const w of wheels) w.rotation.z = -rolled / ROVER.wheelR; },
    resetRoll() { rolled = 0; for (const w of wheels) w.rotation.z = 0; },
  };
}

// A landmark the robot can recognise: a post carrying a square visual marker (like the printed
// tags robots use), facing +z.
export function buildLandmark(stage) {
  const g = new THREE.Group();
  const clay = stage.mats.clay, dark = stage.mats.dark;
  const post = shapes.mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 20), clay); post.position.y = 0.31; g.add(post);
  const foot = shapes.mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 28), clay); foot.position.y = 0.015; g.add(foot);
  const board = shapes.mesh(new RoundedBoxGeometry(0.26, 0.26, 0.02, 2, 0.01), clay); board.position.set(0, 0.68, 0.012); g.add(board);
  // A fixed 4x4 pattern of dark cells (a stand-in for a printed marker; the pattern itself is decorative).
  const cells = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 1, 1]];
  const cellGeo = new THREE.PlaneGeometry(0.044, 0.044);
  const frameGeo = new THREE.PlaneGeometry(0.22, 0.22);
  const frame = new THREE.Mesh(frameGeo, dark); frame.position.set(0, 0.68, 0.0225); g.add(frame);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.176, 0.176), clay); inner.position.set(0, 0.68, 0.023); g.add(inner);
  cells.forEach((row, i) => row.forEach((on, j) => {
    if (!on) return;
    const c = new THREE.Mesh(cellGeo, dark); c.position.set(-0.066 + j * 0.044, 0.746 - i * 0.044, 0.0235); g.add(c);
  }));
  g.top = new THREE.Vector3(0, 0.68, 0.03);
  return g;
}
