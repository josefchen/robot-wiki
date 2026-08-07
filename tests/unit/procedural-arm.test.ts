import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createProceduralArm } from '@/components/three/procedural-arm';

describe('createProceduralArm (URDF-missing fallback)', () => {
  it('builds a robot with exactly 3 revolute joints', () => {
    const robot = createProceduralArm();
    const joints = Object.values(robot.joints).filter(
      (joint) => joint.jointType === 'revolute',
    );
    expect(joints).toHaveLength(3);
    for (const joint of joints) {
      expect(joint.jointType).toBe('revolute');
    }
  });

  it('gives every revolute joint a name and finite lower < upper limits', () => {
    const robot = createProceduralArm();
    const revolute = Object.values(robot.joints).filter(
      (joint) => joint.jointType === 'revolute',
    );
    for (const joint of revolute) {
      expect(joint.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(joint.limit.lower)).toBe(true);
      expect(Number.isFinite(joint.limit.upper)).toBe(true);
      expect(joint.limit.lower).toBeLessThan(joint.limit.upper);
    }
  });

  it('moves a joint via setJointValue, matching the URDFRobot API', () => {
    const robot = createProceduralArm();
    const name = Object.keys(robot.joints)[0];
    const joint = robot.joints[name];
    const before = joint.quaternion.clone();
    const changed = robot.setJointValue(name, 0.5);
    expect(changed).toBe(true);
    expect(joint.quaternion.equals(before)).toBe(false);
  });

  it('clamps joint values to the declared limits', () => {
    const robot = createProceduralArm();
    const name = Object.keys(robot.joints)[1];
    const joint = robot.joints[name];
    robot.setJointValue(name, joint.limit.upper + 10);
    expect(joint.jointValue?.[0]).toBeCloseTo(joint.limit.upper, 6);
    robot.setJointValue(name, joint.limit.lower - 10);
    expect(joint.jointValue?.[0]).toBeCloseTo(joint.limit.lower, 6);
  });

  it('contains at least 3 visible mesh segments', () => {
    const robot = createProceduralArm();
    let meshCount = 0;
    robot.traverse((obj) => {
      if ((obj as Mesh).isMesh) meshCount += 1;
    });
    expect(meshCount).toBeGreaterThanOrEqual(3);
  });
});
