// A stylised two-finger parallel gripper (one motor drives both fingers along a rail).
// makeGripper(stage, opts) -> { root, body, motor, fingers, setGap(g), gap, padRadius, fingerLength }
//
// Local frame: the origin is the grip centre between the two pads, the fingers hang down from the body
// (the body is at +y), and the fingers close along x. Depth is z.
//   pad: 'flat'  rubber pads whose inner faces sit at x = ±gap/2
//        'round' rubber ball tips whose centres sit at x = ±gap/2 (they touch like points)
import { THREE, shapes } from '../kit.js';

export function makeGripper(stage, { pad = 'flat', fingerLength = 0.085, padRadius = 0.006, shaftOffset = 0.014 } = {}) {
  const M = stage.mats;
  const root = new THREE.Group();

  // Body: rail, finger housing, the single motor, a flange and a short wrist.
  const body = new THREE.Group();
  body.position.y = fingerLength;
  root.add(body);
  const rail = shapes.mesh(shapes.box(0.112, 0.01, 0.03, 0.004), M.dark); rail.position.y = 0.002;
  const housing = shapes.mesh(shapes.box(0.104, 0.044, 0.056, 0.01), M.clay); housing.position.y = 0.029;
  const motor = shapes.mesh(shapes.box(0.07, 0.034, 0.05, 0.008), M.dark); motor.position.y = 0.067;
  const flange = shapes.mesh(shapes.cylinder(0.031, 0.01, 40), M.clay); flange.position.y = 0.089;
  const wrist = shapes.mesh(shapes.cylinder(0.025, 0.036, 40), M.clay); wrist.position.y = 0.112;
  body.add(rail, housing, motor, flange, wrist);

  const fingers = [-1, 1].map((side) => {
    const f = new THREE.Group();
    f.userData.side = side;
    const shaftH = fingerLength + 0.006;
    if (pad === 'round') {
      // Rubber ball tip on a short toe, so the shaft stays clear of the object's corners.
      const ball = shapes.mesh(shapes.sphere(padRadius, 28), M.dark);
      const toe = shapes.mesh(shapes.box(shaftOffset + 0.004, 0.011, 0.018, 0.004), M.clay);
      toe.position.set(side * (shaftOffset / 2 + 0.002), 0.002, 0);
      const shaft = shapes.mesh(shapes.box(0.012, shaftH, 0.022, 0.004), M.clay);
      shaft.position.set(side * shaftOffset, shaftH / 2 - 0.004, 0);
      f.add(ball, toe, shaft);
    } else {
      // Flat rubber pad on the inside of a plate finger.
      const padM = shapes.mesh(shapes.box(0.004, 0.03, 0.022, 0.0015), M.dark);
      padM.position.set(side * 0.002, 0.001, 0);
      const shaft = shapes.mesh(shapes.box(0.012, shaftH + 0.012, 0.024, 0.004), M.clay);
      shaft.position.set(side * 0.01, shaftH / 2 - 0.01, 0);
      f.add(padM, shaft);
    }
    root.add(f);
    return f;
  });

  const g = { root, body, motor, housing, fingers, padRadius, fingerLength, gap: 0.06 };
  g.setGap = (gap) => {
    g.gap = gap;
    fingers[0].position.x = -gap / 2;
    fingers[1].position.x = gap / 2;
  };
  g.setGap(0.06);
  return g;
}
