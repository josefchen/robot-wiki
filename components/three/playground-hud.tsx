'use client';

import type { Vec3 } from '@/lib/ik';
import { plainPosition, sceneToBaseFrame } from './joint-labels';

export type ReachState = 'idle' | 'solving' | 'reached' | 'unreachable';

/** A reach within a millimetre of the target counts as reached. */
export const REACHED_WITHIN_MM = 1;

export function reachState({
  target,
  solving,
  residualMm,
}: {
  target: Vec3 | null;
  solving: boolean;
  residualMm: number | null;
}): ReachState {
  if (target === null) return 'idle';
  if (solving) return 'solving';
  return residualMm !== null && residualMm <= REACHED_WITHIN_MM ? 'reached' : 'unreachable';
}

/** The reach verdict in plain words. */
export function reachText(
  state: ReachState,
  iterations: number | null,
  residualMm: number | null,
): string {
  if (state === 'solving') return 'Reaching the target…';
  if (state === 'reached') {
    const steps = iterations ?? 0;
    return `Reached in ${steps} ${steps === 1 ? 'step' : 'steps'}`;
  }
  if (state === 'unreachable') {
    const mm = residualMm ?? 0;
    const gap = mm >= 10 ? `${Math.round(mm / 10)} cm` : `${Math.max(1, Math.round(mm))} mm`;
    return `Out of reach, ${gap} short`;
  }
  return '';
}

interface PlaygroundReadoutProps {
  hand: Vec3 | null;
  state: ReachState;
  iterations: number | null;
  residualMm: number | null;
}

/**
 * The line under the stage, which replaced the monospace HUD that sat over
 * the canvas: where the hand is, in centimetres from the base, and how the
 * last reach went. The verdict is a live region, so a
 * screen reader hears "Reached in 12 steps" or "Out of reach" when it
 * settles.
 */
export function PlaygroundReadout({
  hand,
  state,
  iterations,
  residualMm,
}: PlaygroundReadoutProps) {
  return (
    <div className="pg-readout" data-empty={hand ? undefined : ''}>
      <p data-testid="hand-readout">
        <span className="pg-label">Hand </span>
        {hand ? plainPosition(sceneToBaseFrame(hand)) : ''}
      </p>
      <p data-testid="reach-status" data-state={state} role="status">
        {reachText(state, iterations, residualMm)}
      </p>
    </div>
  );
}
