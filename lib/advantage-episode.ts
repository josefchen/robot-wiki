/**
 * Episode data and advantage math for the advantage-conditioning scrubber
 * in the rl-finetuning module. The episode is the espresso portafilter
 * example from the Recap (pi*0.6) report: a grasp at a bad angle around
 * t=12 s only becomes visible as a failure when the insertion fails around
 * t=32 s, twenty seconds later. A value function is what attributes the
 * failure back to the grasp; advantage conditioning is what Recap does
 * with that attribution.
 *
 * The value trace here is illustrative, not measured: it encodes the
 * shape of the story (value rises on progress, falls on the bad grasp and
 * the failed insertion) so the scrubber can show how Recap binarizes
 * advantage per segment. The component labels it as illustrative.
 *
 * Unit-tested in tests/unit/advantage-episode.test.ts.
 */

/** Episode length in seconds. */
export const EPISODE_LENGTH_S = 40;

export interface ValueKeypoint {
  /** Seconds from episode start. */
  t: number;
  /** Value estimate V(s_t), arbitrary units; rising means closer to success. */
  v: number;
}

/**
 * Piecewise-linear value trace. Rises through the reach, falls through the
 * bad grasp, recovers during dosing and tamping, then collapses when the
 * misaligned insertion fails.
 */
export const VALUE_TRACE: readonly ValueKeypoint[] = [
  { t: 0, v: 30 },
  { t: 8, v: 38 },
  { t: 12, v: 31 },
  { t: 16, v: 26 },
  { t: 26, v: 33 },
  { t: 30, v: 27 },
  { t: 32, v: 18 },
  { t: 36, v: 12 },
  { t: 40, v: 10 },
];

export interface EpisodeSegment {
  /** Stable id, also used in test selectors. */
  id: string;
  /** Stage label shown on the timeline. */
  label: string;
  /** Seconds from episode start. */
  start: number;
  end: number;
  /** One-line description of what the robot does in this segment. */
  note: string;
}

export const EPISODE_SEGMENTS: readonly EpisodeSegment[] = [
  {
    id: 'reach',
    label: 'Reach',
    start: 0,
    end: 8,
    note: 'The arm approaches the portafilter and pre-shapes the hand.',
  },
  {
    id: 'grasp',
    label: 'Grasp',
    start: 8,
    end: 16,
    note: 'The portafilter is grasped at a bad angle. Nothing looks wrong yet; the value function is the only signal that the episode just got worse.',
  },
  {
    id: 'tamp',
    label: 'Dose and tamp',
    start: 16,
    end: 26,
    note: 'Grounds are dosed and tamped. Locally competent, but the grasp angle has not been corrected.',
  },
  {
    id: 'insert',
    label: 'Insert and lock',
    start: 26,
    end: 36,
    note: 'The misaligned portafilter will not seat. The failure is observed here, 20 s after the grasp that caused it.',
  },
  {
    id: 'outcome',
    label: 'Outcome',
    start: 36,
    end: 40,
    note: 'No extraction. The episode ends in failure and every transition keeps its advantage tag.',
  },
];

/**
 * The credit-assignment link: the failure is observed mid-insertion, but
 * the value function assigns the blame to the grasp about 20 s earlier.
 */
export const CREDIT_ASSIGNMENT = {
  failureSegmentId: 'insert',
  failureAtS: 32,
  blamedSegmentId: 'grasp',
  blamedAtS: 12,
} as const;

export type AdvantageTag = 'high' | 'low';

export interface TaggedSegment extends EpisodeSegment {
  /** Value change across the segment, V(end) - V(start). */
  delta: number;
  tag: AdvantageTag;
}

/** Piecewise-linear interpolation over VALUE_TRACE, clamped to the episode. */
export function valueAt(t: number): number {
  const trace = VALUE_TRACE;
  if (t <= trace[0].t) return trace[0].v;
  if (t >= trace[trace.length - 1].t) return trace[trace.length - 1].v;
  for (let i = 1; i < trace.length; i += 1) {
    const prev = trace[i - 1];
    const next = trace[i];
    if (t <= next.t) {
      const span = next.t - prev.t;
      const frac = span === 0 ? 0 : (t - prev.t) / span;
      return prev.v + frac * (next.v - prev.v);
    }
  }
  return trace[trace.length - 1].v;
}

/** The segment containing time t; segment starts are inclusive. */
export function segmentAt(t: number): EpisodeSegment {
  for (const segment of EPISODE_SEGMENTS) {
    if (t >= segment.start && t < segment.end) return segment;
  }
  return EPISODE_SEGMENTS[EPISODE_SEGMENTS.length - 1];
}

/**
 * Every segment with its n-step advantage (the change in value across it)
 * and the binarized tag Recap feeds back to the VLA as a conditioning
 * input. All segments are kept; nothing is filtered out.
 */
export function taggedSegments(): TaggedSegment[] {
  return EPISODE_SEGMENTS.map((segment) => {
    const delta = valueAt(segment.end) - valueAt(segment.start);
    return { ...segment, delta, tag: delta > 0 ? 'high' : 'low' };
  });
}
