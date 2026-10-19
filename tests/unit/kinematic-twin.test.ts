import { describe, expect, it } from 'vitest';
import {
  ELBOW_RANGE,
  FOLD_POSE,
  LEADER_LINKS,
  LEADER_SCALE,
  REACH_POSE,
  ROBOT_LINKS,
  SHOULDER_RANGE,
  STILL_POSE,
  armPoints,
  clampPose,
  commandFor,
  forearmHeading,
  poseFor,
  readoutFor,
  runAt,
  valueTextFor,
  type Pose,
} from '@/lib/kinematic-twin';
import { handFloors, leaderGrip, leaderParts, leaderWristAt, robotParts, type ArmPart } from '@/components/iso/figures/twin-arm-bench';
import { valueTextCovers } from '@/components/iso/anatomy-stage';
import { symbolHits } from '@/lib/figure-main-view';

/** Every pose between the joint stops, on a grid of whole degrees. */
const grid: Pose[] = [];
for (let shoulder = SHOULDER_RANGE[0]; shoulder <= SHOULDER_RANGE[1]; shoulder += 4) {
  for (let elbow = ELBOW_RANGE[0]; elbow <= ELBOW_RANGE[1]; elbow += 5) grid.push({ shoulder, elbow });
}

/** The screen direction of a straight two-point path ("Mx yLx y"), in degrees. */
function directionOf(d: string): number {
  const [x0, y0, x1, y1] = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return (Math.atan2(y1! - y0!, x1! - x0!) * 180) / Math.PI;
}
const needleOf = (parts: ArmPart[], name: string) => {
  const part = parts.find((p) => p.kind === 'line' && p.name === name);
  if (!part || part.kind !== 'line') throw new Error(`no ${name}`);
  return part.d;
};

describe('the kinematic twin model', () => {
  it('sends the robot the leader’s readings exactly, joint for joint', () => {
    for (const pose of grid) expect(commandFor(pose)).toEqual(pose);
  });

  it('is a twin: every leader link is the same share of the robot’s, so the robot’s hand is the leader’s scaled up', () => {
    expect(LEADER_LINKS.upper / ROBOT_LINKS.upper).toBeCloseTo(LEADER_SCALE, 12);
    expect(LEADER_LINKS.fore / ROBOT_LINKS.fore).toBeCloseTo(LEADER_SCALE, 12);
    for (const pose of grid) {
      const leader = armPoints(LEADER_LINKS, pose);
      const robot = armPoints(ROBOT_LINKS, commandFor(pose));
      for (const key of ['elbow', 'wrist'] as const) {
        expect(robot[key][0]).toBeCloseTo(leader[key][0] / LEADER_SCALE, 9);
        expect(robot[key][1]).toBeCloseTo(leader[key][1] / LEADER_SCALE, 9);
      }
    }
  });

  it('finds the pose that puts the wrist where the hand is, elbow up, and holds it at the joint stops', () => {
    for (const pose of grid) {
      const back = poseFor(LEADER_LINKS, armPoints(LEADER_LINKS, pose).wrist);
      expect(back.shoulder).toBeCloseTo(pose.shoulder, 6);
      expect(back.elbow).toBeCloseTo(pose.elbow, 6);
    }
    // Out of reach, or past a stop, the arm stays inside its stops.
    for (const target of [[3, 0], [0, -3], [-0.2, 0.1], [0.1, 1.5], [1.2, -0.9]] as const) {
      const pose = poseFor(LEADER_LINKS, [target[0] * LEADER_SCALE, target[1] * LEADER_SCALE]);
      expect(pose).toEqual(clampPose(pose));
    }
  });

  it('keeps both hands above the bench at every pose between the stops', () => {
    for (const pose of grid) {
      const floors = handFloors(pose);
      expect(floors.robot).toBeGreaterThan(floors.mat + 2);
      expect(floors.leader).toBeGreaterThan(2);
    }
  });

  it('reads the pose in plain words, and each slider’s value text says the readout’s numbers', () => {
    expect(readoutFor(STILL_POSE)).toBe('Shoulder 28 degrees · elbow 100 degrees');
    expect(readoutFor({ shoulder: 21.6, elbow: 61.4 })).toBe('Shoulder 22 degrees · elbow 61 degrees');
    for (const pose of [STILL_POSE, REACH_POSE, FOLD_POSE]) {
      expect(valueTextCovers(valueTextFor(pose), readoutFor(pose))).toBe(true);
      expect(symbolHits(readoutFor(pose))).toEqual([]);
    }
  });

  it('runs from where the leader is, folds in, and ends reaching out, never past a stop and never jumping', () => {
    for (const from of [STILL_POSE, REACH_POSE, { shoulder: SHOULDER_RANGE[1], elbow: ELBOW_RANGE[0] }]) {
      expect(runAt(from, 0)).toEqual(from);
      expect(runAt(from, 0.5)).toEqual(FOLD_POSE);
      expect(runAt(from, 1)).toEqual(REACH_POSE);
      let last = runAt(from, 0);
      for (let k = 1; k <= 1000; k++) {
        const pose = runAt(from, k / 1000);
        expect(pose).toEqual(clampPose(pose));
        expect(Math.abs(pose.shoulder - last.shoulder)).toBeLessThan(0.2);
        expect(Math.abs(pose.elbow - last.elbow)).toBeLessThan(0.3);
        last = pose;
      }
    }
  });
});

describe('the twin-arm bench drawing', () => {
  it('points both arms’ needles the same way: the dials read the same', () => {
    for (const pose of grid) {
      const leader = leaderParts(pose);
      const robot = robotParts(commandFor(pose));
      for (const joint of ['shoulder', 'elbow'] as const) {
        const a = directionOf(needleOf(leader, `leader-${joint}-needle`));
        const b = directionOf(needleOf(robot, `robot-${joint}-needle`));
        // Rounded to a tenth of a viewBox unit, the two needles agree to well under a degree.
        expect(Math.abs(a - b)).toBeLessThan(1.5);
      }
    }
    // And the needle turns with the joint: the elbow's needle follows the forearm's heading.
    const level = directionOf(needleOf(robotParts({ shoulder: 30, elbow: 50 }), 'robot-elbow-needle'));
    const steep = directionOf(needleOf(robotParts({ shoulder: 30, elbow: 120 }), 'robot-elbow-needle'));
    expect(forearmHeading({ shoulder: 30, elbow: 120 })).toBeLessThan(forearmHeading({ shoulder: 30, elbow: 50 }));
    expect(steep).toBeGreaterThan(level);
  });

  it('maps a point on the screen back to the leader’s wrist, so a drag holds the handle', () => {
    for (const pose of grid) {
      const wrist = armPoints(LEADER_LINKS, pose).wrist;
      const back = leaderWristAt(leaderGrip(pose));
      expect(back[0]).toBeCloseTo(wrist[0], 3);
      expect(back[1]).toBeCloseTo(wrist[1], 3);
    }
  });

  it('lights one part, the leader’s handle, and keeps the same parts in every pose', () => {
    const count = (parts: ArmPart[]) => parts.length;
    const leaderLit = leaderParts(STILL_POSE).filter((p) => p.kind === 'solid' && p.lit);
    expect(leaderLit.map((p) => (p.kind === 'solid' ? p.name : ''))).toEqual(['leader-handle']);
    expect(robotParts(STILL_POSE).some((p) => p.kind === 'solid' && p.lit)).toBe(false);
    for (const pose of grid) {
      expect(count(leaderParts(pose))).toBe(count(leaderParts(STILL_POSE)));
      expect(count(robotParts(pose))).toBe(count(robotParts(STILL_POSE)));
    }
  });
});
