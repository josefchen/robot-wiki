import { describe, expect, it } from 'vitest';
import {
  buildTrajectoryFile,
  durationSeconds,
  easeInOutCubic,
  parseTrajectory,
  sampleAngles,
  serializeTrajectory,
  SEGMENT_SECONDS,
  type JointLimit,
  type TrajectoryKeyframe,
} from '@/lib/trajectory';

const JOINTS: JointLimit[] = [
  { name: 'shoulder_pan', lower: -1.92, upper: 1.92 },
  { name: 'shoulder_lift', lower: -1.745, upper: 1.745 },
  { name: 'elbow_flex', lower: -1.69, upper: 1.69 },
];

function kf(angles: Record<string, number>): TrajectoryKeyframe {
  return { angles };
}

const HOME = kf({ shoulder_pan: 0, shoulder_lift: 0, elbow_flex: 0 });
const POSE_A = kf({ shoulder_pan: 0.5, shoulder_lift: -0.25, elbow_flex: 1 });
const POSE_B = kf({ shoulder_pan: -0.5, shoulder_lift: 0.75, elbow_flex: 0 });

describe('easeInOutCubic', () => {
  it('pins the endpoints and the midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it('eases in below the linear diagonal and out above it', () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
  });

  it('is monotonically non-decreasing across the domain', () => {
    let previous = 0;
    for (let i = 1; i <= 100; i += 1) {
      const value = easeInOutCubic(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('moves slower near the endpoints than mid-swing', () => {
    const at = (t: number) => easeInOutCubic(t);
    const firstQuarter = at(0.25) - at(0);
    const midQuarter = at(0.5) - at(0.25);
    const lastQuarter = at(1) - at(0.75);
    expect(firstQuarter).toBeLessThan(midQuarter);
    expect(lastQuarter).toBeLessThan(midQuarter);
  });
});

describe('durationSeconds', () => {
  it('is zero for zero or one keyframe', () => {
    expect(durationSeconds(0)).toBe(0);
    expect(durationSeconds(1)).toBe(0);
  });

  it('grows by one segment per additional keyframe', () => {
    expect(durationSeconds(2)).toBeCloseTo(SEGMENT_SECONDS, 10);
    expect(durationSeconds(4)).toBeCloseTo(3 * SEGMENT_SECONDS, 10);
  });
});

describe('sampleAngles', () => {
  it('returns null for an empty trajectory', () => {
    expect(sampleAngles([], 0.5)).toBeNull();
  });

  it('holds a single keyframe constant at any time', () => {
    expect(sampleAngles([POSE_A], 0)).toEqual(POSE_A.angles);
    expect(sampleAngles([POSE_A], 99)).toEqual(POSE_A.angles);
  });

  it('clamps to the first and last keyframes outside the duration', () => {
    expect(sampleAngles([HOME, POSE_A], -1)).toEqual(HOME.angles);
    expect(sampleAngles([HOME, POSE_A], 999)).toEqual(POSE_A.angles);
  });

  it('hits exact keyframe poses at segment boundaries', () => {
    const keyframes = [HOME, POSE_A, POSE_B];
    expect(sampleAngles(keyframes, 0)).toEqual(HOME.angles);
    expect(sampleAngles(keyframes, SEGMENT_SECONDS)).toEqual(POSE_A.angles);
    expect(sampleAngles(keyframes, 2 * SEGMENT_SECONDS)).toEqual(
      POSE_B.angles,
    );
  });

  it('interpolates with easing, not linearly, mid-segment', () => {
    const quarter = sampleAngles([HOME, POSE_A], SEGMENT_SECONDS * 0.25);
    const half = sampleAngles([HOME, POSE_A], SEGMENT_SECONDS * 0.5);
    // Eased: at 25% of the segment we are less than 25% of the way.
    expect(quarter!.shoulder_pan).toBeCloseTo(
      0.5 * easeInOutCubic(0.25),
      10,
    );
    expect(quarter!.shoulder_pan).toBeLessThan(0.5 * 0.25);
    // The eased midpoint coincides with the linear midpoint.
    expect(half!.shoulder_pan).toBeCloseTo(0.25, 10);
    expect(half!.elbow_flex).toBeCloseTo(0.5, 10);
  });

  it('steps discretely between keyframes when interpolation is off', () => {
    const keyframes = [HOME, POSE_A, POSE_B];
    const midFirst = sampleAngles(keyframes, SEGMENT_SECONDS * 0.9, {
      interpolate: false,
    });
    expect(midFirst).toEqual(HOME.angles);
    const midSecond = sampleAngles(keyframes, SEGMENT_SECONDS * 1.5, {
      interpolate: false,
    });
    expect(midSecond).toEqual(POSE_A.angles);
  });
});

describe('buildTrajectoryFile / serializeTrajectory', () => {
  it('produces a documented, self-describing file shape', () => {
    const file = buildTrajectoryFile(
      JOINTS.map((j) => j.name),
      [HOME, POSE_A],
    );
    expect(file.format).toBe('robot-atlas-trajectory');
    expect(file.version).toBe(1);
    expect(file.jointNames).toEqual([
      'shoulder_pan',
      'shoulder_lift',
      'elbow_flex',
    ]);
    expect(file.segmentSeconds).toBe(SEGMENT_SECONDS);
    expect(file.keyframes).toHaveLength(2);
  });

  it('serializes to valid JSON that re-parses to the same keyframes', () => {
    const text = serializeTrajectory(
      JOINTS.map((j) => j.name),
      [HOME, POSE_A, POSE_B],
    );
    const parsed = JSON.parse(text);
    expect(parsed.keyframes).toHaveLength(3);
    const result = parseTrajectory(text, JOINTS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.keyframes).toHaveLength(3);
      expect(result.keyframes[1].angles.shoulder_lift).toBeCloseTo(-0.25, 10);
    }
  });
});

describe('parseTrajectory validation', () => {
  const validText = serializeTrajectory(
    JOINTS.map((j) => j.name),
    [HOME, POSE_A],
  );

  it('rejects malformed JSON with a clear error', () => {
    const result = parseTrajectory('{not json', JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid json/i);
  });

  it('rejects JSON that is not a trajectory object', () => {
    for (const text of ['42', '"hello"', '[1,2,3]', 'null']) {
      const result = parseTrajectory(text, JOINTS);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects a payload with no keyframes array', () => {
    const result = parseTrajectory('{"format":"robot-atlas-trajectory"}', JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/keyframe/i);
  });

  it('rejects well-formed JSON with an empty keyframes array', () => {
    const result = parseTrajectory(
      '{"format":"robot-atlas-trajectory","version":1,"keyframes":[]}',
      JOINTS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no keyframes/i);
  });

  it('rejects an unsupported version', () => {
    const file = JSON.parse(validText);
    file.version = 99;
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });

  it('rejects keyframes with missing joint angles and names them', () => {
    const file = JSON.parse(validText);
    delete file.keyframes[0].angles.elbow_flex;
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/elbow_flex/);
      expect(result.error).toMatch(/keyframe 1/i);
    }
  });

  it('rejects keyframes with joints the arm does not have', () => {
    const file = JSON.parse(validText);
    file.keyframes[0].angles.mystery_joint = 0.1;
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/mystery_joint/);
  });

  it('rejects keyframes whose joint count differs from the arm', () => {
    const file = JSON.parse(validText);
    file.keyframes = [
      { angles: { shoulder_pan: 0, shoulder_lift: 0, elbow_flex: 0, wrist: 0 } },
    ];
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
  });

  it('rejects non-numeric angle values', () => {
    const file = JSON.parse(validText);
    file.keyframes[0].angles.shoulder_pan = 'fast';
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/shoulder_pan/);
  });

  it('rejects out-of-range angles and names the joint, value, and limits', () => {
    const file = JSON.parse(validText);
    file.keyframes[0].angles.shoulder_pan = 5; // past the 1.92 rad limit
    const result = parseTrajectory(JSON.stringify(file), JOINTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/shoulder_pan/);
      expect(result.error).toMatch(/limit/i);
    }
  });

  it('accepts angles sitting exactly on the limits', () => {
    const onLimits = kf({
      shoulder_pan: -1.92,
      shoulder_lift: 1.745,
      elbow_flex: -1.69,
    });
    const text = serializeTrajectory(
      JOINTS.map((j) => j.name),
      [onLimits],
    );
    expect(parseTrajectory(text, JOINTS).ok).toBe(true);
  });

  it('round-trips poses to full precision', () => {
    const text = serializeTrajectory(
      JOINTS.map((j) => j.name),
      [POSE_A, POSE_B],
    );
    const result = parseTrajectory(text, JOINTS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const [i, pose] of [POSE_A, POSE_B].entries()) {
        for (const joint of JOINTS) {
          expect(result.keyframes[i].angles[joint.name]).toBeCloseTo(
            pose.angles[joint.name],
            10,
          );
        }
      }
    }
  });
});
