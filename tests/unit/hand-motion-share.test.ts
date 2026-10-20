import { describe, expect, it } from 'vitest';
import {
  DRAW_SECONDS,
  HUMAN,
  RETURN_SECONDS,
  ROBOT,
  START_POSE,
  STROKE,
  doneState,
  drawAt,
  elbowOf,
  handOf,
  humanPoseAt,
  poseFor,
  readoutAt,
  readoutFor,
  robotPoseAt,
  robotStrokeAt,
  strayCm,
  strokeAt,
  type CopyId,
} from '@/lib/hand-motion-share';
import { PARTS, benchPose, humanParts, movingAt, robotParts, type LivePart } from '@/components/iso/figures/two-easel-bench';
import { symbolHits } from '@/lib/figure-main-view';

const shares = Array.from({ length: 201 }, (_, k) => k / 200);

describe('the hand-motion model', () => {
  it('draws the person’s check mark exactly, with the elbow bent throughout', () => {
    const start = handOf(HUMAN, START_POSE);
    for (const share of shares) {
      const pose = humanPoseAt(share);
      const [x, z] = handOf(HUMAN, pose);
      const [dx, dz] = strokeAt(share);
      expect(x - start[0]).toBeCloseTo(dx, 9);
      expect(z - start[1]).toBeCloseTo(dz, 9);
      expect(pose.elbow).toBeGreaterThan(20);
    }
    expect(strokeAt(0)).toEqual([0, 0]);
    expect(strokeAt(1)).toEqual([...STROKE[STROKE.length - 1]!]);
  });

  it('finds the robot’s own angles for the hand’s motion, and so draws the same stroke from its own start', () => {
    expect(robotPoseAt('hand', 0).shoulder).toBeCloseTo(START_POSE.shoulder, 9);
    expect(robotPoseAt('hand', 0).elbow).toBeCloseTo(START_POSE.elbow, 9);
    for (const share of shares) {
      const [rx, rz] = robotStrokeAt('hand', share);
      const [dx, dz] = strokeAt(share);
      expect(rx).toBeCloseTo(dx, 9);
      expect(rz).toBeCloseTo(dz, 9);
      expect(robotPoseAt('hand', share).elbow).toBeGreaterThan(5);
    }
    expect(strayCm('hand')).toBeLessThan(1e-6);
  });

  it('copies the joint angles as they are, so the shorter arm draws a smaller, skewed stroke that strays by centimetres', () => {
    for (const share of shares) expect(robotPoseAt('joints', share)).toEqual(humanPoseAt(share));
    expect(strayCm('joints')).toBeGreaterThan(5);
    // The arms really are of other proportions, which is the whole cause.
    expect(ROBOT.upper / HUMAN.upper).not.toBeCloseTo(ROBOT.fore / HUMAN.fore, 2);
    // The inverse kinematics round-trips: the hand the pose puts somewhere gives the pose back.
    for (const share of shares) {
      const pose = humanPoseAt(share);
      const back = poseFor(HUMAN, handOf(HUMAN, pose));
      expect(back.shoulder).toBeCloseTo(pose.shoulder, 9);
      expect(back.elbow).toBeCloseTo(pose.elbow, 9);
    }
  });

  it('draws by lifting the pens back to the start and then drawing, with no jump, ending on the finished strokes', () => {
    for (const copy of ['joints', 'hand'] as CopyId[]) {
      for (const from of [doneState('joints'), doneState('hand')]) {
        let last = drawAt(copy, 0, from);
        expect(last.phase).toBe('return');
        for (let k = 1; k <= 1000; k++) {
          const state = drawAt(copy, (k / 1000) * (RETURN_SECONDS + DRAW_SECONDS + 0.2), from);
          expect(Math.abs(state.human.shoulder - last.human.shoulder)).toBeLessThan(1.5);
          expect(Math.abs(state.robot.elbow - last.robot.elbow)).toBeLessThan(2.5);
          expect(state.lift).toBeGreaterThanOrEqual(0);
          if (state.phase === 'draw') expect(state.lift).toBe(0);
          last = state;
        }
        expect(last).toEqual(doneState(copy));
      }
    }
  });

  it('reads every moment in plain words on one line', () => {
    expect(readoutFor('joints')).toBe('Joint angles copied · strays 6.8 cm');
    expect(readoutFor('hand')).toBe("Hand's motion copied · same stroke");
    for (const copy of ['joints', 'hand'] as CopyId[]) {
      for (let k = 0; k <= 50; k++) {
        const text = readoutAt(copy, drawAt(copy, (k / 50) * (RETURN_SECONDS + DRAW_SECONDS)));
        expect(text.length).toBeLessThanOrEqual(40);
        expect(symbolHits(text)).toEqual([]);
      }
    }
  });
});

describe('the two-easel bench drawing', () => {
  const lit = (parts: LivePart[]) => parts.filter((p) => (p.kind === 'solid' && p.lit) || (p.kind === 'line' && p.tone === 'lit'));

  it('lights one part, the robot’s ink, and keeps the same arm parts in every pose', () => {
    expect(PARTS.some((p) => (p.kind === 'solid' && p.lit) || (p.kind === 'line' && p.tone === 'lit'))).toBe(false);
    for (const copy of ['joints', 'hand'] as CopyId[]) {
      const live = movingAt(benchPose(copy, 1));
      const litParts = Object.values(live).flatMap(lit);
      expect(litParts).toHaveLength(1);
      expect(litParts[0]!.kind === 'line' && litParts[0]!.name).toBe('ink');
    }
    expect(Object.values(movingAt(benchPose('joints', 0))).flatMap(lit)).toHaveLength(0);
    for (const share of [0, 0.5, 1]) {
      expect(humanParts(humanPoseAt(share)).length).toBe(humanParts(START_POSE).length);
      expect(robotParts(robotPoseAt('hand', share)).length).toBe(robotParts(START_POSE).length);
    }
  });

  it('keeps every elbow above its own hand’s reach line, as drawn: elbow up throughout', () => {
    for (const share of shares) {
      for (const [links, pose] of [[HUMAN, humanPoseAt(share)], [ROBOT, robotPoseAt('hand', share)]] as const) {
        const elbow = elbowOf(links, pose);
        const hand = handOf(links, pose);
        // The elbow lies on the upper side of the line from the shoulder to the hand.
        expect(hand[0] * elbow[1] - hand[1] * elbow[0]).toBeGreaterThan(0);
      }
    }
  });
});
