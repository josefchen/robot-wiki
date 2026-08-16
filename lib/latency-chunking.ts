/**
 * Latency model for the temporal-ensembling vs. Real-Time Chunking
 * interactive. Pure functions, unit-tested in
 * tests/unit/latency-chunking.test.ts.
 *
 * Data honesty: the published results are qualitative. Real-Time Chunking
 * (arXiv:2506.07339) reports throughput flat from +0 ms to +200 ms of
 * injected inference delay, and Physical Intelligence documents ACT-style
 * temporal ensembling failing outright at +100 ms and +200 ms because the
 * exponentially weighted average of two disagreeing chunks lands in neither
 * mode. The curves below are a model of those results, not measured data;
 * the UI labels them as such. See
 * research/01-learned-manipulation-lineage.md (RTC section).
 */

export const MIN_DELAY_MS = 0;
/** Slider tops out past the +200 ms the RTC paper evaluates. */
export const MAX_DELAY_MS = 240;

/**
 * The two valid modes of the demonstration scenario: going left (+0.8) or
 * right (-0.8) around an obstacle. An executed action counts as in-mode if
 * it is within MODE_TOLERANCE of either pole; the middle is invalid.
 */
export const MODE_VALUE = 0.8;
export const MODE_TOLERANCE = 0.25;

/** Ticks shown in the hand-off trace; the new chunk arrives at HANDOFF_TICK. */
export const TRACE_TICKS = 24;
export const HANDOFF_TICK = 8;

/**
 * Delay scale (ms) controlling how fast the ensemble's commit weight falls.
 * Tuned so the averaged action leaves the valid mode at ~96 ms, matching
 * the published failure at +100 ms and +200 ms.
 */
const STALENESS_SCALE_MS = 125;

/** Throughput stays full while the executed action hugs the mode... */
const NOMINAL_ACTION = 0.75;
/** ...and hits zero once it leaves the tolerance band of either mode. */
export const VALID_ACTION_FLOOR = MODE_VALUE - MODE_TOLERANCE;

export function clampDelay(delayMs: number): number {
  if (Number.isNaN(delayMs)) return MIN_DELAY_MS;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs));
}

/**
 * Effective weight the ensemble places on the committed (left) mode. With
 * no delay the freshest chunk agrees with the in-flight plan and the weight
 * is 1. As inference latency grows, every chunk in the average is stale, so
 * disagreeing mode samples pull the weight toward the 50/50 midpoint.
 */
export function ensembleCommitWeight(delayMs: number): number {
  const d = clampDelay(delayMs);
  return 0.5 + 0.5 / (1 + Math.pow(d / STALENESS_SCALE_MS, 3));
}

/**
 * The action temporal ensembling actually executes at a chunk hand-off:
 * the weighted average of the committed mode (+MODE_VALUE) and the stale
 * disagreeing mode (-MODE_VALUE). Approaches the invalid midpoint as delay
 * grows; never crosses it.
 */
export function teActionAtHandoff(delayMs: number): number {
  const w = ensembleCommitWeight(delayMs);
  return (2 * w - 1) * MODE_VALUE;
}

/** True when an action sits within tolerance of either valid mode. */
export function isValidModeAction(action: number): boolean {
  return Math.abs(Math.abs(action) - MODE_VALUE) <= MODE_TOLERANCE;
}

/**
 * Modeled task throughput under temporal ensembling: full while the
 * executed action tracks the committed mode, zero once it leaves the valid
 * band. Collapses inside the published 100 to 200 ms failure window.
 */
export function teThroughput(delayMs: number): number {
  const action = teActionAtHandoff(delayMs);
  const t =
    (action - VALID_ACTION_FLOOR) / (NOMINAL_ACTION - VALID_ACTION_FLOOR);
  return Math.min(1, Math.max(0, t));
}

/**
 * Modeled task throughput under Real-Time Chunking. The paper reports
 * throughput flat from +0 ms to +200 ms of injected delay: RTC freezes the
 * actions that will already have executed and commits to the in-flight
 * mode, so the executed trajectory never averages across modes.
 */
export function rtcThroughput(delayMs: number): number {
  // Same input domain as teThroughput so callers can treat the pair uniformly.
  void clampDelay(delayMs);
  return 1;
}

export type ExecutionStatus = 'nominal' | 'degraded' | 'failed';

export function teStatus(delayMs: number): ExecutionStatus {
  const throughput = teThroughput(delayMs);
  if (throughput >= 0.95) return 'nominal';
  if (throughput > 0) return 'degraded';
  return 'failed';
}

export type TracePoint = { tick: number; action: number };

/**
 * Executed action around one chunk hand-off under temporal ensembling.
 * Before HANDOFF_TICK the robot executes the committed chunk. After it, the
 * ensemble's stale average takes over, easing to teActionAtHandoff over a
 * few ticks (the execution filter, not a jump).
 */
export function teHandoffTrace(delayMs: number): TracePoint[] {
  const target = teActionAtHandoff(delayMs);
  const points: TracePoint[] = [];
  for (let tick = 0; tick < TRACE_TICKS; tick += 1) {
    const blend = Math.min(1, Math.max(0, (tick - HANDOFF_TICK + 1) / 3));
    points.push({
      tick,
      action: MODE_VALUE + (target - MODE_VALUE) * blend,
    });
  }
  return points;
}

/**
 * Executed action under RTC: the frozen prefix plus partial attention to
 * the in-flight chunk keep execution on the committed mode at any delay.
 */
export function rtcHandoffTrace(delayMs: number): TracePoint[] {
  void clampDelay(delayMs);
  const points: TracePoint[] = [];
  for (let tick = 0; tick < TRACE_TICKS; tick += 1) {
    points.push({ tick, action: MODE_VALUE });
  }
  return points;
}
