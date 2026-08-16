import { describe, expect, it } from 'vitest';
import { createProceduralArm } from '@/components/three/procedural-arm';
import {
  buildChainSpec,
  createIkSolver,
  forwardKinematics,
  mat3ToEulerZYX,
  revoluteJoints,
  robotToScene,
  robotToSceneRotation,
  sceneToRobot,
  solveIk,
  type ChainSegment,
  type Mat3,
  type UrdfLikeNode,
} from '@/lib/ik';

const TOL = 1e-6;

function closeTo(actual: number, expected: number, tol = 1e-4) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

function makeJointNode(
  name: string,
  jointType: string,
  children: UrdfLikeNode[],
  origin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): UrdfLikeNode {
  return {
    name,
    jointType,
    isURDFJoint: true,
    axis: { x: 0, y: 0, z: 1 },
    position: origin,
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    limit: { lower: -1, upper: 1 },
    children,
  };
}

function makeLinkNode(name: string, children: UrdfLikeNode[]): UrdfLikeNode {
  return {
    name,
    isURDFLink: true,
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    children,
  };
}

describe('buildChainSpec', () => {
  it('finds the path to the end-effector link through revolute and fixed joints', () => {
    const ee = makeLinkNode('tool', []);
    const fixed = makeJointNode('tool_fixed', 'fixed', [ee], {
      x: 0,
      y: 0,
      z: 0.05,
    });
    const linkA = makeLinkNode('link_a', [fixed]);
    const rev = makeJointNode('joint_a', 'revolute', [linkA], {
      x: 0.1,
      y: 0,
      z: 0,
    });
    const root = makeLinkNode('base_link', [rev]);

    const chain = buildChainSpec(root, 'tool');
    expect(chain).not.toBeNull();
    expect(chain).toHaveLength(2);
    expect(chain![0]).toMatchObject({
      kind: 'revolute',
      name: 'joint_a',
      lower: -1,
      upper: 1,
    });
    expect(chain![1]).toMatchObject({ kind: 'fixed', name: 'tool_fixed' });
    expect(chain![1].origin.position).toEqual({ x: 0, y: 0, z: 0.05 });
  });

  it('returns null when the end-effector link is not in the tree', () => {
    const root = makeLinkNode('base_link', [
      makeJointNode('j', 'revolute', [makeLinkNode('other', [])]),
    ]);
    expect(buildChainSpec(root, 'missing')).toBeNull();
  });

  it('extracts the fallback arm chain: 3 revolute joints plus a fixed tool tip', () => {
    const robot = createProceduralArm();
    const chain = buildChainSpec(robot as unknown as UrdfLikeNode, 'tool_tip');
    expect(chain).not.toBeNull();
    const revolute = revoluteJoints(chain!);
    expect(revolute.map((j) => j.name)).toEqual([
      'shoulder_pan',
      'shoulder_lift',
      'elbow_flex',
    ]);
    expect(chain!.at(-1)).toMatchObject({ kind: 'fixed' });
    // Limits come straight from the URDF-style joint definitions.
    closeTo(revolute[0].lower, -1.92);
    closeTo(revolute[0].upper, 1.92);
  });
});

describe('forwardKinematics (procedural fallback arm)', () => {
  // Segments: pan z 0.03, lift z 0.11, flex z 0.1, fixed tip z 0.09. Z-up.
  const chain = buildChainSpec(
    createProceduralArm() as unknown as UrdfLikeNode,
    'tool_tip',
  )!;

  it('places the tip at (0, 0, 0.33) at the zero pose', () => {
    const fk = forwardKinematics(chain, [0, 0, 0]);
    closeTo(fk.position.x, 0, TOL);
    closeTo(fk.position.y, 0, TOL);
    closeTo(fk.position.z, 0.33, TOL);
  });

  it('rotates the forearm about the lift axis (lift = 90 deg)', () => {
    const fk = forwardKinematics(chain, [0, Math.PI / 2, 0]);
    closeTo(fk.position.x, 0.19, TOL);
    closeTo(fk.position.y, 0, TOL);
    closeTo(fk.position.z, 0.14, TOL);
  });

  it('rotates only the tip offset about the elbow (flex = 90 deg)', () => {
    const fk = forwardKinematics(chain, [0, 0, Math.PI / 2]);
    closeTo(fk.position.x, 0.09, TOL);
    closeTo(fk.position.y, 0, TOL);
    closeTo(fk.position.z, 0.24, TOL);
  });

  it('composes pan with downstream joints (pan = 90 deg, lift = 90 deg)', () => {
    const fk = forwardKinematics(chain, [Math.PI / 2, Math.PI / 2, 0]);
    closeTo(fk.position.x, 0, TOL);
    closeTo(fk.position.y, 0.19, TOL);
    closeTo(fk.position.z, 0.14, TOL);
  });
});

describe('solveIk (DLS, adaptive damping)', () => {
  const chain = buildChainSpec(
    createProceduralArm() as unknown as UrdfLikeNode,
    'tool_tip',
  )!;
  const home = [0, 0, 0];

  it('converges on a reachable target from the straight-up (near-singular) home pose', () => {
    const target = { x: 0.15, y: 0, z: 0.2 };
    const result = solveIk(chain, home, target);
    expect(result.converged).toBe(true);
    expect(result.residual).toBeLessThan(1e-3);
    expect(result.iterations).toBeLessThan(100);
    expect(result.angles).toHaveLength(3);
    const fk = forwardKinematics(chain, result.angles);
    closeTo(fk.position.x, target.x, 1e-3);
    closeTo(fk.position.y, target.y, 1e-3);
    closeTo(fk.position.z, target.z, 1e-3);
  });

  it('keeps every angle inside its joint limits across solves', () => {
    const targets = [
      { x: 0.15, y: 0.05, z: 0.2 },
      { x: -0.1, y: -0.08, z: 0.25 },
      { x: 0, y: 0.18, z: 0.16 },
    ];
    const revolute = revoluteJoints(chain);
    for (const target of targets) {
      const result = solveIk(chain, home, target);
      result.angles.forEach((angle, i) => {
        expect(angle).toBeGreaterThanOrEqual(revolute[i].lower - 1e-9);
        expect(angle).toBeLessThanOrEqual(revolute[i].upper + 1e-9);
        expect(Number.isFinite(angle)).toBe(true);
      });
    }
  });

  it('reports an honest non-zero residual for unreachable targets', () => {
    const result = solveIk(chain, home, { x: 0.5, y: 0, z: 0.14 });
    expect(result.converged).toBe(false);
    expect(result.done).toBe(true);
    expect(result.residual).toBeGreaterThan(0.25);
    for (const angle of result.angles)
      expect(Number.isFinite(angle)).toBe(true);
  });

  it('clamps at a joint limit instead of overshooting for limit-locked targets', () => {
    // Planar 2-link chain, both joints capped at ±0.5 rad (about 29 deg).
    // The target needs a 90 deg fold, so both joints must pin at the cap.
    const limited: ChainSegment[] = [
      {
        kind: 'revolute',
        name: 'j1',
        origin: {
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
        axis: { x: 0, y: 0, z: 1 },
        lower: -0.5,
        upper: 0.5,
      },
      {
        kind: 'fixed',
        name: 'l1',
        origin: {
          position: { x: 0.1, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
      {
        kind: 'revolute',
        name: 'j2',
        origin: {
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
        axis: { x: 0, y: 0, z: 1 },
        lower: -0.5,
        upper: 0.5,
      },
      {
        kind: 'fixed',
        name: 'tip',
        origin: {
          position: { x: 0.1, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
    ];
    const result = solveIk(limited, [0, 0], { x: 0, y: 0.2, z: 0 });
    expect(result.converged).toBe(false);
    expect(result.residual).toBeGreaterThan(0.1);
    // Both joints are driven to the cap, never beyond it.
    closeTo(result.angles[0], 0.5, 1e-3);
    closeTo(result.angles[1], 0.5, 1e-3);
    const revolute = revoluteJoints(limited);
    result.angles.forEach((angle, i) => {
      expect(angle).toBeGreaterThanOrEqual(revolute[i].lower - 1e-9);
      expect(angle).toBeLessThanOrEqual(revolute[i].upper + 1e-9);
    });
  });

  it('never increases the residual between accepted steps', () => {
    const solver = createIkSolver(chain, home, { x: 0.12, y: 0.04, z: 0.18 });
    const residuals: number[] = [];
    let state = solver.snapshot();
    while (!state.done) {
      state = solver.step(1);
      residuals.push(state.residual);
    }
    expect(residuals.length).toBeGreaterThan(0);
    for (let i = 1; i < residuals.length; i++) {
      expect(residuals[i]).toBeLessThanOrEqual(residuals[i - 1] + 1e-12);
    }
  });

  it('stays finite for absurd targets', () => {
    const result = solveIk(chain, home, { x: 1e6, y: 1e6, z: 1e6 });
    expect(result.done).toBe(true);
    expect(Number.isFinite(result.residual)).toBe(true);
    for (const angle of result.angles)
      expect(Number.isFinite(angle)).toBe(true);
  });

  it('respects the iteration cap', () => {
    const result = solveIk(
      chain,
      home,
      { x: 0.5, y: 0.5, z: 0.5 },
      {
        maxIterations: 20,
      },
    );
    expect(result.iterations).toBeLessThanOrEqual(20);
    expect(result.done).toBe(true);
  });
});

describe('frame conversion (robot Z-up to scene Y-up)', () => {
  it('maps robot up to scene up and round-trips', () => {
    const up = robotToScene({ x: 0, y: 0, z: 1 });
    closeTo(up.x, 0, TOL);
    closeTo(up.y, 1, TOL);
    closeTo(up.z, 0, TOL);

    const v = { x: 0.12, y: -0.34, z: 0.56 };
    const back = sceneToRobot(robotToScene(v));
    closeTo(back.x, v.x, TOL);
    closeTo(back.y, v.y, TOL);
    closeTo(back.z, v.z, TOL);
  });

  it('conjugates rotations into the scene frame', () => {
    // Robot-frame rotation of +90 deg about robot z (up) becomes +90 deg
    // about scene y (up).
    const rRobot: Mat3 = [0, -1, 0, 1, 0, 0, 0, 0, 1];
    const rScene = robotToSceneRotation(rRobot);
    // Column 0: robot x maps to (0, 0, -1) in scene coords under R_y(90).
    closeTo(rScene[0], 0, 1e-6);
    closeTo(rScene[3], 0, 1e-6);
    closeTo(rScene[6], -1, 1e-6);
  });
});

describe('mat3ToEulerZYX', () => {
  it('returns zeros for the identity rotation', () => {
    const euler = mat3ToEulerZYX([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    closeTo(euler.roll, 0, TOL);
    closeTo(euler.pitch, 0, TOL);
    closeTo(euler.yaw, 0, TOL);
  });

  it('extracts a pure roll', () => {
    const c = Math.cos(Math.PI / 2);
    const s = Math.sin(Math.PI / 2);
    const euler = mat3ToEulerZYX([1, 0, 0, 0, c, -s, 0, s, c]);
    closeTo(euler.roll, Math.PI / 2, 1e-6);
    closeTo(euler.pitch, 0, 1e-6);
    closeTo(euler.yaw, 0, 1e-6);
  });

  it('extracts a pure yaw', () => {
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const euler = mat3ToEulerZYX([c, -s, 0, s, c, 0, 0, 0, 1]);
    closeTo(euler.roll, 0, 1e-6);
    closeTo(euler.pitch, 0, 1e-6);
    closeTo(euler.yaw, 0.7, 1e-6);
  });
});

describe('forwardKinematics rotation output', () => {
  it('reports the identity rotation at the zero pose of the fallback arm', () => {
    const chain = buildChainSpec(
      createProceduralArm() as unknown as UrdfLikeNode,
      'tool_tip',
    )!;
    const fk = forwardKinematics(chain, [0, 0, 0]);
    const identity: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    fk.rotation.forEach((value, i) => closeTo(value, identity[i], 1e-6));
  });

  it('tracks pan rotation about the robot z axis', () => {
    const chain: ChainSegment[] = [
      {
        kind: 'revolute',
        name: 'j',
        origin: {
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
        axis: { x: 0, y: 0, z: 1 },
        lower: -Math.PI,
        upper: Math.PI,
      },
      {
        kind: 'fixed',
        name: 'tip',
        origin: {
          position: { x: 0.1, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
    ];
    const fk = forwardKinematics(chain, [Math.PI / 2]);
    closeTo(fk.position.x, 0, TOL);
    closeTo(fk.position.y, 0.1, TOL);
    const euler = mat3ToEulerZYX(fk.rotation);
    closeTo(euler.yaw, Math.PI / 2, 1e-6);
  });
});
