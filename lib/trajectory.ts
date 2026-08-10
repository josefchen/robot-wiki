/**
 * Trajectory recording and playback math for the 3D playground.
 *
 * A trajectory is an ordered list of keyframes; each keyframe is a full
 * joint-angle snapshot (radians per joint name). Playback interpolates
 * between consecutive keyframes with cubic ease-in-out easing, one fixed
 * segment duration per keyframe pair. Trajectories serialize to a
 * self-describing JSON file that round-trips through `parseTrajectory`,
 * which validates every edge case (malformed JSON, empty keyframes,
 * mismatched joints, out-of-range angles) with a user-readable error.
 */

export interface JointLimit {
  name: string;
  /** Radians. */
  lower: number;
  /** Radians. */
  upper: number;
}

export interface TrajectoryKeyframe {
  /** Radians per joint name. */
  angles: Record<string, number>;
}

export interface TrajectoryFile {
  format: 'robot-atlas-trajectory';
  version: 1;
  jointNames: string[];
  segmentSeconds: number;
  keyframes: TrajectoryKeyframe[];
}

export type ParseResult =
  | { ok: true; keyframes: TrajectoryKeyframe[] }
  | { ok: false; error: string };

/** Wall-clock time the arm spends easing between two adjacent keyframes. */
export const SEGMENT_SECONDS = 1.2;

const RAD_TO_DEG = 180 / Math.PI;
/** Radians of slack when checking imported angles against joint limits. */
const LIMIT_EPSILON = 1e-6;

/** Classic cubic ease-in-out: slow at both ends, fastest mid-swing. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Total playback duration for a trajectory of `count` keyframes. */
export function durationSeconds(
  count: number,
  segmentSeconds: number = SEGMENT_SECONDS,
): number {
  return Math.max(0, count - 1) * segmentSeconds;
}

/**
 * The joint angles at `timeSeconds` into playback.
 *
 * Returns null for an empty trajectory. A single keyframe holds constant.
 * With `interpolate: false` (the prefers-reduced-motion path) the pose
 * steps discretely from keyframe to keyframe instead of easing.
 */
export function sampleAngles(
  keyframes: TrajectoryKeyframe[],
  timeSeconds: number,
  options: { segmentSeconds?: number; interpolate?: boolean } = {},
): Record<string, number> | null {
  const segmentSeconds = options.segmentSeconds ?? SEGMENT_SECONDS;
  const interpolate = options.interpolate ?? true;
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].angles;

  const duration = durationSeconds(keyframes.length, segmentSeconds);
  if (timeSeconds <= 0) return keyframes[0].angles;
  if (timeSeconds >= duration) return keyframes[keyframes.length - 1].angles;

  const segmentFloat = timeSeconds / segmentSeconds;
  const index = Math.min(
    keyframes.length - 2,
    Math.floor(segmentFloat),
  );
  const local = segmentFloat - index;
  const from = keyframes[index].angles;
  if (!interpolate) return from;

  const eased = easeInOutCubic(local);
  const to = keyframes[index + 1].angles;
  const angles: Record<string, number> = {};
  for (const name of Object.keys(from)) {
    angles[name] = from[name] + (to[name] - from[name]) * eased;
  }
  return angles;
}

function roundAngle(value: number): number {
  // 6 decimals of a radian is about 0.00006 degrees: far below the 1
  // degree round-trip tolerance, and it keeps the JSON tidy.
  return Math.round(value * 1e6) / 1e6;
}

/** Builds the self-describing file object for a recorded trajectory. */
export function buildTrajectoryFile(
  jointNames: string[],
  keyframes: TrajectoryKeyframe[],
  segmentSeconds: number = SEGMENT_SECONDS,
): TrajectoryFile {
  return {
    format: 'robot-atlas-trajectory',
    version: 1,
    jointNames: [...jointNames],
    segmentSeconds,
    keyframes: keyframes.map((keyframe) => {
      const angles: Record<string, number> = {};
      for (const name of jointNames) {
        angles[name] = roundAngle(keyframe.angles[name] ?? 0);
      }
      return { angles };
    }),
  };
}

/** Serializes a recorded trajectory to pretty-printed JSON. */
export function serializeTrajectory(
  jointNames: string[],
  keyframes: TrajectoryKeyframe[],
  segmentSeconds: number = SEGMENT_SECONDS,
): string {
  return JSON.stringify(
    buildTrajectoryFile(jointNames, keyframes, segmentSeconds),
    null,
    2,
  );
}

function formatDeg(radians: number): string {
  return `${(radians * RAD_TO_DEG).toFixed(1)}°`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and validates a trajectory JSON payload against the loaded arm.
 *
 * Every failure returns a specific, user-readable error; nothing throws.
 * On success the keyframes carry every joint the arm has, in range, as
 * finite numbers.
 */
export function parseTrajectory(
  text: string,
  joints: JointLimit[],
): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: 'That file is not valid JSON. Check for typos and try again.',
    };
  }

  if (!isPlainObject(data)) {
    return {
      ok: false,
      error: 'The JSON does not look like a robot-wiki trajectory file.',
    };
  }
  // The 'robot-atlas-trajectory' discriminator is the persisted file-format
  // id from before the robot-wiki rename. It is data, not branding: files
  // exported before the rebrand must keep importing, so it never changes.
  if ('format' in data && data.format !== 'robot-atlas-trajectory') {
    return {
      ok: false,
      error: 'The JSON does not look like a robot-wiki trajectory file.',
    };
  }
  if ('version' in data && data.version !== 1) {
    return {
      ok: false,
      error: `Unsupported trajectory version ${String(data.version)}; this playground reads version 1 files.`,
    };
  }
  if (!Array.isArray(data.keyframes)) {
    return {
      ok: false,
      error: 'The file is missing its keyframes array.',
    };
  }
  if (data.keyframes.length === 0) {
    return {
      ok: false,
      error: 'The file contains no keyframes, so there is nothing to import.',
    };
  }

  const expectedNames = joints.map((joint) => joint.name);
  const keyframes: TrajectoryKeyframe[] = [];

  for (const [index, raw] of data.keyframes.entries()) {
    const label = `keyframe ${index + 1}`;
    if (!isPlainObject(raw) || !isPlainObject(raw.angles)) {
      return {
        ok: false,
        error: `The ${label} is missing its joint angles.`,
      };
    }
    const rawAngles = raw.angles;
    const actualNames = Object.keys(rawAngles);

    const missing = expectedNames.filter((n) => !actualNames.includes(n));
    if (missing.length > 0) {
      return {
        ok: false,
        error: `The ${label} does not match this arm: missing ${missing.join(', ')}.`,
      };
    }
    const unexpected = actualNames.filter((n) => !expectedNames.includes(n));
    if (unexpected.length > 0) {
      return {
        ok: false,
        error: `The ${label} does not match this arm: unknown ${unexpected.length === 1 ? 'joint' : 'joints'} ${unexpected.join(', ')}.`,
      };
    }

    const angles: Record<string, number> = {};
    for (const joint of joints) {
      const value = rawAngles[joint.name];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return {
          ok: false,
          error: `The ${label} has a non-numeric angle for ${joint.name}.`,
        };
      }
      if (
        value < joint.lower - LIMIT_EPSILON ||
        value > joint.upper + LIMIT_EPSILON
      ) {
        return {
          ok: false,
          error: `The ${label} puts ${joint.name} at ${formatDeg(value)}, outside its limits (${formatDeg(joint.lower)} to ${formatDeg(joint.upper)}).`,
        };
      }
      angles[joint.name] = value;
    }
    keyframes.push({ angles });
  }

  return { ok: true, keyframes };
}
