/**
 * Chunk hand-off model for the three-mode execution comparison
 * (synchronous pause vs. naive switch vs. Real-Time Chunking). Pure
 * functions, unit-tested in tests/unit/execution-modes.test.ts.
 *
 * Data honesty: the published results (Real-Time Chunking,
 * arXiv:2506.07339; the Physical Intelligence RTC blog) are qualitative:
 * synchronous execution introduces off-distribution pauses, naive switching
 * at inference delay produces command discontinuities, temporal ensembling
 * fails outright at +100 ms and +200 ms, and RTC holds throughput flat to
 * +200 ms. The traces below are a model of those behaviors, not measured
 * robot data; the UI says so. The jerk limit is an illustrative threshold
 * the interactive states explicitly.
 */

export const TICK_MS = 20;
export const TRACE_TICKS = 30;
export const HANDOFF_TICK = 8;
export const MIN_DELAY_MS = 0;
export const MAX_DELAY_MS = 200;

/**
 * Stated discontinuity threshold: the per-tick commanded-velocity step the
 * comparison treats as a hard jerk event. Illustrative, labeled in the UI.
 */
export const JERK_LIMIT = 0.3;

/** Ticks the naive spike is spread over by RTC's partial-attention blend. */
const RTC_BLEND_TICKS = 5;
/** Ticks the synchronous mode takes to decelerate to rest and back. */
const SYNC_RAMP_TICKS = 4;

export type ExecutionMode = 'synchronous' | 'naive' | 'rtc';
export type TracePoint = { tick: number; v: number };

export function clampDelay(delayMs: number): number {
  if (Number.isNaN(delayMs)) return MIN_DELAY_MS;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs));
}

/** The in-flight chunk's commanded velocity profile (smooth cruise). */
export function oldPlanVelocity(tick: number): number {
  return 0.6 + 0.25 * Math.sin(tick / 5);
}

/**
 * How far the freshly inferred chunk disagrees with the in-flight one.
 * Disagreement grows with staleness: at zero delay the new chunk agrees
 * with the old; at +200 ms the world has moved and the plans diverge by a
 * full unit of commanded velocity. Linear model, illustrative.
 */
export function modeShift(delayMs: number): number {
  return clampDelay(delayMs) / MAX_DELAY_MS;
}

/** The freshly inferred chunk's commanded velocity profile. */
export function newPlanVelocity(tick: number, delayMs: number): number {
  return oldPlanVelocity(tick) + modeShift(delayMs);
}

/** Ticks the robot sits still in synchronous mode waiting for inference. */
export function pauseTicks(delayMs: number): number {
  return Math.ceil(clampDelay(delayMs) / TICK_MS);
}

/**
 * The commanded-velocity trace the robot executes under each hand-off
 * strategy, around one chunk boundary at HANDOFF_TICK.
 *
 * - synchronous: the old chunk runs out, the robot decelerates to rest,
 *   waits out the inference delay, then accelerates into the new chunk.
 *   The new chunk was computed from the stopped state, so it carries no
 *   staleness shift; the cost is dead time, not jerk.
 * - naive: execution switches to the new chunk the instant it arrives,
 *   mid-motion, so the full staleness disagreement lands in one tick.
 * - rtc: the first d ticks of the new chunk are frozen to the in-flight
 *   values (that time has already passed), then partial attention blends
 *   toward the new plan over a few ticks. No pause, no spike.
 */
export function executedTrace(
  mode: ExecutionMode,
  delayMs: number,
): TracePoint[] {
  const d = clampDelay(delayMs);
  const shift = modeShift(d);
  const points: TracePoint[] = [];

  if (mode === 'naive') {
    for (let tick = 0; tick < TRACE_TICKS; tick += 1) {
      points.push({
        tick,
        v:
          tick < HANDOFF_TICK
            ? oldPlanVelocity(tick)
            : oldPlanVelocity(tick) + shift,
      });
    }
    return points;
  }

  if (mode === 'rtc') {
    const frozenUntil = HANDOFF_TICK + Math.ceil(d / TICK_MS);
    for (let tick = 0; tick < TRACE_TICKS; tick += 1) {
      const blend = Math.min(
        1,
        Math.max(0, (tick - frozenUntil + 1) / RTC_BLEND_TICKS),
      );
      points.push({ tick, v: oldPlanVelocity(tick) + shift * blend });
    }
    return points;
  }

  // synchronous
  const pause = pauseTicks(d);
  const vStart = oldPlanVelocity(HANDOFF_TICK);
  for (let tick = 0; tick < TRACE_TICKS; tick += 1) {
    const k = tick - HANDOFF_TICK;
    let v: number;
    if (k < 0) {
      v = oldPlanVelocity(tick);
    } else if (k < SYNC_RAMP_TICKS) {
      // Decelerate toward rest as the old chunk runs out. The +1 keeps the
      // last ramp tick just above zero so the at-rest window is exactly the
      // inference pause.
      v = vStart * (1 - (k + 1) / (SYNC_RAMP_TICKS + 1));
    } else if (k < SYNC_RAMP_TICKS + pause) {
      v = 0;
    } else {
      // Accelerate into the new chunk, computed from the stopped state, so
      // it resumes the same smooth cruise profile (no staleness shift).
      const j = k - SYNC_RAMP_TICKS - pause;
      if (j < SYNC_RAMP_TICKS) {
        v = vStart * ((j + 1) / (SYNC_RAMP_TICKS + 1));
      } else {
        v = oldPlanVelocity(tick - pause);
      }
    }
    points.push({ tick, v });
  }
  return points;
}

/** The largest per-tick commanded-velocity step in a trace. */
export function peakDeltaV(trace: TracePoint[]): number {
  let peak = 0;
  for (let i = 1; i < trace.length; i += 1) {
    peak = Math.max(peak, Math.abs(trace[i].v - trace[i - 1].v));
  }
  return peak;
}

/** True when a mode's executed trace stays within the jerk limit. */
export function passesJerkLimit(mode: ExecutionMode, delayMs: number): boolean {
  return peakDeltaV(executedTrace(mode, delayMs)) <= JERK_LIMIT;
}
