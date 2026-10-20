import { describe, expect, it } from 'vitest';
import { GIVEN_GOAL, GOAL_RADIUS, PUCK_END, PUCK_START, PUSH, sparseReward } from '@/lib/hindsight-push';
import { PARTS, S, SCREEN, movingAt, onFelt, poseFrom, type TablePart } from '@/components/iso/figures/puck-push-table';

const parts = (raw: Parameters<typeof poseFrom>[0]): TablePart[] => Object.values(movingAt(poseFrom(raw))).flat();

describe('puck-push table', () => {
  it('judges the same push by its two goals: a miss against the given goal, a success where it ended', () => {
    expect(sparseReward(PUCK_END, GIVEN_GOAL)).toBe(0);
    expect(sparseReward(PUCK_END, PUCK_END)).toBe(1);
    expect(Math.hypot(PUCK_END[0] - GIVEN_GOAL[0], PUCK_END[1] - GIVEN_GOAL[1])).toBeGreaterThan(GOAL_RADIUS);
    // The recorded push runs from the start to where the puck stopped.
    expect(PUSH[0]).toEqual(PUCK_START);
    expect(PUSH[PUSH.length - 1]).toEqual(PUCK_END);
  });

  it('draws every distance at one scale, so the ring drawn round a goal is the reward’s radius', () => {
    const [ax, ay] = onFelt(PUCK_END);
    const [bx, by] = onFelt(GIVEN_GOAL);
    expect(Math.hypot(ax - bx, ay - by)).toBeCloseTo(Math.hypot(PUCK_END[0] - GIVEN_GOAL[0], PUCK_END[1] - GIVEN_GOAL[1]) * S, 9);
  });

  it('moves the ring from the given goal to the puck along a straight line, and raises the flag only at the puck', () => {
    expect(poseFrom({ goal: 'given' }).goal).toEqual(GIVEN_GOAL);
    expect(poseFrom({ goal: 'reached' }).goal).toEqual(PUCK_END);
    expect(poseFrom({ goal: 'given' }).flag).toBe(0);
    expect(poseFrom({ goal: 'reached' }).flag).toBe(1);
    const mid = poseFrom({ share: 0.5 }).goal;
    expect(mid[0]).toBeCloseTo((GIVEN_GOAL[0] + PUCK_END[0]) / 2, 9);
    expect(mid[1]).toBeCloseTo((GIVEN_GOAL[1] + PUCK_END[1]) / 2, 9);
  });

  it('has one lit part, the ring in its two halves, the same parts in every pose but the given goal’s mark, and no words', () => {
    for (const raw of [{ goal: 'given' as const }, { share: 0.4, flag: 0, relabelled: true }, { goal: 'reached' as const }]) {
      const lit = parts(raw).filter((part) => part.kind === 'solid' && part.lit).map((part) => (part as { name?: string }).name);
      expect(lit.sort()).toEqual(['ring-back', 'ring-front']);
    }
    expect(parts({ goal: 'given' }).some((part) => (part as { name?: string }).name === 'given-goal')).toBe(false);
    expect(parts({ goal: 'reached' }).some((part) => (part as { name?: string }).name === 'given-goal')).toBe(true);
    expect(parts({ goal: 'reached' })).toHaveLength(parts({ goal: 'given' }).length + 1);
    expect(PARTS.filter((part) => part.kind === 'solid' && part.lit)).toHaveLength(0);
    expect(JSON.stringify([PARTS, parts({ goal: 'reached' })])).not.toMatch(/<text|<title|<desc|foreignObject/);
  });

  it('marks the given goal with its own pin in every pose, and keeps the two goals apart by more than a hoop', () => {
    const names = (raw: Parameters<typeof poseFrom>[0]) =>
      [...PARTS, ...parts(raw)].map((part) => (part as { name?: string }).name).filter(Boolean);
    for (const raw of [{ goal: 'given' as const }, { share: 0.5 }, { goal: 'reached' as const }]) {
      expect(names(raw)).toEqual(expect.arrayContaining(['goal-pin', 'goal-pin-head', 'puck']));
    }
    // The hoop round the puck and the printed circle round the pin never touch: the two goals read as two things.
    expect(Math.hypot(PUCK_END[0] - GIVEN_GOAL[0], PUCK_END[1] - GIVEN_GOAL[1])).toBeGreaterThan(4 * GOAL_RADIUS);
  });

  it('draws the push as a chalk trail from the start mark to the puck, on the felt', () => {
    const trail = PARTS.filter((part) => part.kind === 'face' && part.name === 'trail');
    expect(trail).toHaveLength(1);
    const [sx, sy] = onFelt(PUCK_START);
    const [ex, ey] = onFelt(PUCK_END);
    const ends = [SCREEN.at([sx, sy, 1]), SCREEN.at([ex, ey, 1])];
    // The trail's outline runs between the start mark and the puck, never past either.
    const xs = (trail[0] as { d: string }).d.match(/-?\d+(?:\.\d+)?/g)!.map(Number).filter((_, index) => index % 2 === 0);
    expect(Math.min(...xs)).toBeGreaterThan(Math.min(ends[0]![0], ends[1]![0]) - 12);
    expect(Math.max(...xs)).toBeLessThan(Math.max(ends[0]![0], ends[1]![0]) + 12);
  });
});
