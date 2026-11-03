import type { PidGains } from './pendulum.ts';

/** Input-only provenance for the two history-dependent teaching figures.
 * Reaching either bound keeps the physics running but makes the witness
 * explicitly incomplete. No displayed/computed result enters these records. */
export const INPUT_TRACE_RECORD_LIMIT = 128;
export const PENDULUM_TRACE_STEP_LIMIT = 480 * 60 * 10;
export type PendulumInputEvent =
  | { kind: 'advance'; steps: number; kp: number; ki: number; kd: number }
  | { kind: 'push'; impulse: number };
export type PendulumInputTrace = { complete: boolean; steps: number; events: PendulumInputEvent[] };
export type ForceInputTrace = { complete: boolean; forces: number[] };
export const beginPendulumTrace = (): PendulumInputTrace => ({ complete: true, steps: 0, events: [] });
export const beginForceTrace = (): ForceInputTrace => ({ complete: true, forces: [] });

export function recordAdvance(trace: PendulumInputTrace, steps: number, gains: PidGains): PendulumInputTrace {
  if (!trace.complete) return trace;
  if (!Number.isSafeInteger(steps) || steps <= 0 || ![gains.kp, gains.ki, gains.kd].every(Number.isFinite) || trace.steps + steps > PENDULUM_TRACE_STEP_LIMIT) return { ...trace, complete: false };
  const last = trace.events.at(-1), event = { kind: 'advance' as const, steps, ...gains };
  if (last?.kind === 'advance' && last.kp === gains.kp && last.ki === gains.ki && last.kd === gains.kd) {
    return { complete: true, steps: trace.steps + steps, events: [...trace.events.slice(0, -1), { ...last, steps: last.steps + steps }] };
  }
  if (trace.events.length >= INPUT_TRACE_RECORD_LIMIT) return { ...trace, complete: false };
  return { complete: true, steps: trace.steps + steps, events: [...trace.events, event] };
}

export function recordPendulumPush(trace: PendulumInputTrace, impulse: number): PendulumInputTrace {
  if (!trace.complete) return trace;
  if (!Number.isFinite(impulse) || trace.events.length >= INPUT_TRACE_RECORD_LIMIT) return { ...trace, complete: false };
  return { ...trace, events: [...trace.events, { kind: 'push', impulse }] };
}

export function recordForce(trace: ForceInputTrace, force: number): ForceInputTrace {
  if (!trace.complete) return trace;
  if (!Number.isFinite(force) || trace.forces.length >= INPUT_TRACE_RECORD_LIMIT) return { ...trace, complete: false };
  return { complete: true, forces: [...trace.forces, force] };
}
