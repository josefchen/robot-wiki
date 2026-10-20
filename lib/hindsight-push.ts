/**
 * The recorded push behind HindsightRelabel (rl-sim2real/rl-for-robotics).
 *
 * A robot pushed a puck across a table toward a goal and the puck stopped
 * short. Under a sparse reward, 1 for reaching the goal and 0 otherwise, the
 * push earns 0 and teaches nothing. Hindsight experience replay also stores
 * the push under a goal it did reach, the spot where the puck ended, and
 * recomputes the reward for that goal: 1 (Andrychowicz and colleagues,
 * `her-2017`). The push is illustrative; the relabelling rule is the paper's.
 *
 * Positions are on the felt seen from above, in the units the figure draws:
 * x along the table from the pusher's end, y across it toward the viewer.
 */
export type TablePoint = readonly [number, number];

/** Where the puck was pushed from, where it stopped, and the goal it was given. */
export const PUCK_START: TablePoint = [18, 27];
export const PUCK_END: TablePoint = [64, 22];
export const GIVEN_GOAL: TablePoint = [101, 12.5];
/** A puck that stops within this distance of a goal's centre has reached it. */
export const GOAL_RADIUS = 9;
/** The felt the puck slides on. */
export const FELT = { left: 0, top: 0, right: 124, bottom: 40 } as const;

const f = (v: number) => Number(v.toFixed(2));

/** The recorded push, a gentle curve from the start to where the puck stopped. */
export const PUSH: readonly TablePoint[] = Array.from({ length: 25 }, (_, k) => {
  const t = k / 24;
  const u = 1 - t;
  const c: TablePoint = [40, 29];
  return [f(u * u * PUCK_START[0] + 2 * u * t * c[0] + t * t * PUCK_END[0]), f(u * u * PUCK_START[1] + 2 * u * t * c[1] + t * t * PUCK_END[1])] as const;
});

/** The sparse reward for a puck that stopped at `puck`, judged against a goal at `goal`. */
export const sparseReward = (puck: TablePoint, goal: TablePoint): 0 | 1 =>
  Math.hypot(puck[0] - goal[0], puck[1] - goal[1]) <= GOAL_RADIUS ? 1 : 0;
