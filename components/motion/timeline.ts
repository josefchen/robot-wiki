/**
 * The timeline model. One timeline owns time t; a scene is a list of beats
 * and a pure frame function of t. Play, pause, step, scrub, tests and
 * captures only set t.
 */
import { smooth } from './easing';
import { MOTION_TIMING, type MotionRoleName } from '@/lib/motion-tokens';

export { MOTION_TIMING };

export type BeatDuration = 'short' | 'default' | 'long';

export interface SceneBeat {
  /** Stable id, also the capture file name stem. */
  id: string;
  /** One sentence that stands on its own; announced once per beat. */
  caption: string;
  /** Ladder duration; defaults to the standard beat. */
  duration?: BeatDuration;
  /**
   * Linear beats report their raw progress as eased progress, for
   * simulation time (physics, filters, rollouts) which is never eased.
   */
  linear?: boolean;
}

export interface SceneDefinition {
  /** Scene id, kebab-case; also the registry key for captures. */
  id: string;
  /** Short human title, used by the poster button label. */
  title: string;
  beats: SceneBeat[];
}

const DURATION_MS: Record<BeatDuration, number> = {
  short: MOTION_TIMING.beatShort,
  default: MOTION_TIMING.beat,
  long: MOTION_TIMING.beatLong,
};

export interface BeatSpan {
  beat: SceneBeat;
  index: number;
  start: number;
  end: number;
  duration: number;
  linear: boolean;
}

/** Lays the beats end to end. Pure in the beat list. */
export function beatSpans(beats: SceneBeat[]): BeatSpan[] {
  let start = 0;
  return beats.map((beat, index) => {
    const duration = DURATION_MS[beat.duration ?? 'default'];
    const span: BeatSpan = {
      beat,
      index,
      start,
      end: start + duration,
      duration,
      linear: beat.linear === true,
    };
    start = span.end;
    return span;
  });
}

export function totalDuration(spans: BeatSpan[]): number {
  return spans.length === 0 ? 0 : spans[spans.length - 1].end;
}

/** The poster is the final frame of the last beat: the summarizing still. */
export function posterTime(spans: BeatSpan[]): number {
  return totalDuration(spans);
}

export interface BeatLocation {
  index: number;
  /** Raw progress through the beat, [0, 1]. */
  raw: number;
  /** Eased progress; equals raw for linear beats. */
  eased: number;
}

export function locate(spans: BeatSpan[], t: number): BeatLocation {
  if (spans.length === 0) {
    return { index: 0, raw: 0, eased: 0 };
  }
  const clamped = Math.min(Math.max(t, 0), totalDuration(spans));
  let index = spans.length - 1;
  for (let i = 0; i < spans.length; i += 1) {
    // A beat boundary belongs to the beat it completes, so a stepped
    // end-state is captioned by the beat the reader just arrived at.
    if (clamped <= spans[i].end || i === spans.length - 1) {
      index = i;
      break;
    }
  }
  const span = spans[index];
  const raw = span.duration === 0 ? 1 : (clamped - span.start) / span.duration;
  return {
    index,
    raw,
    eased: span.linear ? raw : smooth(raw),
  };
}

/**
 * The time a beat step lands on: the next (or previous) beat end-state,
 * strictly beyond the current time. The poster state and Home are 0 and the
 * total, so every stepped state is an end-state a capture can pin.
 */
export function stepTarget(
  spans: BeatSpan[],
  t: number,
  delta: 1 | -1,
): number {
  const ends = spans.map((span) => span.end);
  const total = totalDuration(spans);
  if (delta === 1) {
    return ends.find((end) => end > t + 1e-6) ?? total;
  }
  for (let i = ends.length - 1; i >= 0; i -= 1) {
    if (ends[i] < t - 1e-6) return ends[i];
  }
  return 0;
}

/** Role a legend swatch or stage mark is drawn in. */
export type { MotionRoleName };
