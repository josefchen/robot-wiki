import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CANDIDATES,
  GOALS,
  GOAL_TOLERANCE,
  INITIAL_STATE,
  MAX_CANDIDATES,
  MIN_CANDIDATES,
  goalDistance,
  planStep,
  searchAlignmentError,
} from '@/lib/jepa-planning';

const PICK = GOALS[0].point;
const PLACE = GOALS[1].point;

function runDistances(
  steps: number,
  candidateCount: number,
  goal = PICK,
): number[] {
  let state = INITIAL_STATE;
  const distances = [goalDistance(state, goal)];
  for (let i = 0; i < steps; i += 1) {
    const result = planStep({ state, goal, stepIndex: i, candidateCount });
    state = result.next;
    distances.push(result.distance);
  }
  return distances;
}

describe('jepa planning model', () => {
  it('goalDistance is Euclidean distance in latent space', () => {
    expect(goalDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 12);
    expect(goalDistance(INITIAL_STATE, INITIAL_STATE)).toBe(0);
  });

  it('search alignment error shrinks as the candidate budget grows', () => {
    const atMin = searchAlignmentError(MIN_CANDIDATES);
    const atDefault = searchAlignmentError(DEFAULT_CANDIDATES);
    const atMax = searchAlignmentError(MAX_CANDIDATES);
    expect(atMin).toBeGreaterThan(atDefault);
    expect(atDefault).toBeGreaterThan(atMax);
    expect(atMax).toBe(0);
  });

  it('each planning step strictly decreases the goal-latent distance', () => {
    const distances = runDistances(5, DEFAULT_CANDIDATES);
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]).toBeLessThan(distances[i - 1]);
    }
  });

  it('decreases even at the minimum search budget', () => {
    const distances = runDistances(5, MIN_CANDIDATES);
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]).toBeLessThan(distances[i - 1]);
    }
  });

  it('a larger search budget ends closer to the goal after equal steps', () => {
    const few = runDistances(8, MIN_CANDIDATES).at(-1) ?? 1;
    const many = runDistances(8, MAX_CANDIDATES).at(-1) ?? 1;
    expect(many).toBeLessThan(few);
  });

  it('is deterministic for identical inputs', () => {
    const args = {
      state: INITIAL_STATE,
      goal: PICK,
      stepIndex: 2,
      candidateCount: 24,
    };
    expect(planStep(args)).toEqual(planStep(args));
  });

  it('returns one candidate per budget unit and the chosen one has minimal energy', () => {
    const result = planStep({
      state: INITIAL_STATE,
      goal: PICK,
      stepIndex: 0,
      candidateCount: 24,
    });
    expect(result.candidates).toHaveLength(24);
    const minEnergy = Math.min(...result.candidates.map((c) => c.energy));
    expect(result.candidates[result.chosenIndex].energy).toBeCloseTo(
      minEnergy,
      12,
    );
  });

  it('clamps out-of-range candidate counts', () => {
    const args = { state: INITIAL_STATE, goal: PICK, stepIndex: 0 };
    expect(planStep({ ...args, candidateCount: 1 }).candidates).toHaveLength(
      MIN_CANDIDATES,
    );
    expect(planStep({ ...args, candidateCount: 500 }).candidates).toHaveLength(
      MAX_CANDIDATES,
    );
  });

  it('flags the goal as reached once the distance drops under tolerance', () => {
    const near = { x: PICK.x - GOAL_TOLERANCE, y: PICK.y };
    const result = planStep({
      state: near,
      goal: PICK,
      stepIndex: 0,
      candidateCount: MAX_CANDIDATES,
    });
    expect(result.distance).toBeLessThan(GOAL_TOLERANCE);
    expect(result.reached).toBe(true);
  });

  it('decreases toward the alternate goal as well', () => {
    const distances = runDistances(4, DEFAULT_CANDIDATES, PLACE);
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]).toBeLessThan(distances[i - 1]);
    }
  });
});
