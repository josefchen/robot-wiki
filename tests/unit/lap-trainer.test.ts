import { describe, expect, it } from 'vitest';
import {
  BOARD_TOP,
  FORE,
  LEFT_PORT,
  LEFT_TIP,
  PEGS,
  RIGHT_PORT,
  SCOPE_IN,
  SCOPE_PORT,
  SHOULDER,
  STILL_POSE,
  STILL_TIP,
  TASK_PEGS,
  TASK_SECONDS,
  TIP_Z,
  UPPER,
  armPose,
  clampTip,
  followAim,
  inView,
  instrumentPose,
  length3,
  lookAt,
  mountOf,
  movingAt,
  poolOf,
  scopePose,
  taskTipAt,
} from '@/components/iso/figures/lap-trainer';

type P3 = [number, number, number];
const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** How far `p` lies off the line through `a` and `b`. */
const offLine = (p: P3, a: P3, b: P3) => length3(cross(sub(p, a), sub(b, a))) / length3(sub(b, a));

/** Every tip the figure can show: the drill sampled every 10 ms, and the drag field's corners and middle. */
const DRILL = Array.from({ length: Math.ceil(TASK_SECONDS * 100) + 1 }, (_, k) => taskTipAt(k / 100));
const FIELD = [clampTip([-99, -99]), clampTip([99, -99]), clampTip([-99, 99]), clampTip([99, 99]), clampTip([0, 0])];

/** The drill played at 60 frames a second, the scope following or held where it starts. */
function playDrill(follow: boolean) {
  let aim = STILL_POSE.aim;
  const seen: boolean[] = [];
  for (let t = 0; t <= TASK_SECONDS + 1e-9; t += 1 / 60) {
    const tip = taskTipAt(t);
    if (follow) aim = followAim(aim, tip, 1 / 60);
    seen.push(inView(aim, tip));
  }
  return seen;
}

describe('the box trainer: ports, scope and arm', () => {
  it('runs every instrument straight through its port, so the outside end moves opposite the tip', () => {
    for (const tip of [...DRILL, ...FIELD]) {
      const { end } = instrumentPose(tip, RIGHT_PORT);
      expect(offLine(RIGHT_PORT, tip, end)).toBeLessThan(1e-9);
      expect(length3(sub(end, tip))).toBeCloseTo(116, 9);
    }
    expect(offLine(LEFT_PORT, LEFT_TIP, instrumentPose(LEFT_TIP, LEFT_PORT).end)).toBeLessThan(1e-9);
    // Fulcrum: moving the tip toward +x swings the shaft's outside end toward -x about the port.
    const a = instrumentPose(clampTip([-20, 0]), RIGHT_PORT).out;
    const b = instrumentPose(clampTip([20, 0]), RIGHT_PORT).out;
    expect(b[0]).toBeLessThan(a[0]);
  });

  it('pivots the scope about its port and aims its axis at the look point under the tip', () => {
    for (const tip of [...DRILL, ...FIELD]) {
      const aim = lookAt(tip);
      const { inward, distal, coupler } = scopePose(aim);
      expect(offLine(SCOPE_PORT, distal, coupler)).toBeLessThan(1e-9);
      expect(offLine(aim, SCOPE_PORT, distal)).toBeLessThan(1e-9);
      expect(length3(sub(distal, SCOPE_PORT))).toBeCloseTo(SCOPE_IN, 9);
      // The scope's end stays above the board, and well above the pegs' tops.
      expect(distal[2]).toBeGreaterThan(TIP_Z + 8);
      expect(dot(inward, [0, 0, 1])).toBeLessThan(0);
    }
  });

  it('reaches the scope with two links of fixed length, elbow up, holding the camera head on the scope axis', () => {
    for (const tip of [...DRILL, ...FIELD]) {
      const aim = lookAt(tip);
      const { flange, wrist } = mountOf(aim);
      const { distal, coupler } = scopePose(aim);
      // The flange and the wrist sit on the scope's own axis, beyond the coupler and the camera head.
      expect(offLine(flange, distal, coupler)).toBeLessThan(1e-9);
      expect(offLine(wrist, distal, coupler)).toBeLessThan(1e-9);
      expect(length3(sub(flange, distal))).toBeGreaterThan(length3(sub(coupler, distal)));
      expect(length3(sub(wrist, distal))).toBeGreaterThan(length3(sub(flange, distal)));
      const { elbow } = armPose(wrist);
      expect(length3(sub(elbow, SHOULDER))).toBeCloseTo(UPPER, 6);
      expect(length3(sub(wrist, elbow))).toBeCloseTo(FORE, 6);
      expect(length3(sub(wrist, SHOULDER))).toBeLessThan(UPPER + FORE);
      // Elbow up: above the straight line from the shoulder to the wrist.
      const share = length3(sub(elbow, SHOULDER)) / (UPPER + FORE);
      expect(elbow[2]).toBeGreaterThan(SHOULDER[2] + (wrist[2] - SHOULDER[2]) * share);
    }
  });
});

describe('the camera: what the scope sees', () => {
  it('lights a pool on the board round the look point, cut to the board', () => {
    for (const tip of PEGS.map(([x, y]) => [x, y, TIP_Z] as P3)) {
      const pool = poolOf(lookAt(tip));
      expect(pool.length).toBeGreaterThan(20);
      for (const point of pool) {
        expect(point[2]).toBe(BOARD_TOP);
        expect(Math.abs(point[0])).toBeLessThanOrEqual(64);
        expect(point[1]).toBeGreaterThanOrEqual(-54);
        expect(point[1]).toBeLessThanOrEqual(50);
      }
      // The tip's own place on the board lies inside the pool (a ray crossing count).
      let inside = false;
      for (let k = 0, j = pool.length - 1; k < pool.length; j = k++) {
        const [xi, yi] = pool[k]!;
        const [xj, yj] = pool[j]!;
        if (yi > tip[1] !== yj > tip[1] && tip[0] < ((xj - xi) * (tip[1] - yi)) / (yj - yi) + xi) inside = !inside;
      }
      expect(inside).toBe(true);
    }
  });

  it('keeps the tip in view through the whole drill when following, and loses it when held still', () => {
    const following = playDrill(true);
    expect(following.every(Boolean)).toBe(true);
    const held = playDrill(false);
    // Held where it was put, the scope sees the tip at the start of the drill, then loses it for good once it leaves.
    expect(held[0]).toBe(true);
    const lost = held.indexOf(false);
    expect(lost).toBeGreaterThan(0);
    expect(held.slice(lost).every((seen) => !seen)).toBe(true);
    expect(held.filter((seen) => !seen).length / held.length).toBeGreaterThan(0.7);
    // Every peg is in view when the scope follows, and only the still pose's peg when it is held at the still pose.
    for (const [x, y] of PEGS) {
      const tip: P3 = [x, y, TIP_Z];
      expect(inView(lookAt(tip), tip)).toBe(true);
      expect(inView(STILL_POSE.aim, tip)).toBe(x === STILL_TIP[0] && y === STILL_TIP[1]);
    }
  });

  it('plays a drill from wherever the tip is to each peg it lists, ending on the last, without jumps', () => {
    const last = PEGS[TASK_PEGS.at(-1)!]!;
    for (const from of [STILL_TIP, [last[0], last[1], TIP_Z] as P3, clampTip([-99, 99])]) {
      const drill = Array.from({ length: Math.ceil(TASK_SECONDS * 100) + 1 }, (_, k) => taskTipAt(k / 100, from));
      expect(drill[0]).toEqual(from);
      expect(taskTipAt(TASK_SECONDS, from)).toEqual([last[0], last[1], TIP_Z]);
      for (const index of TASK_PEGS) {
        const [x, y] = PEGS[index]!;
        expect(drill.some((tip) => Math.hypot(tip[0] - x, tip[1] - y) < 1e-6)).toBe(true);
      }
      for (let k = 1; k < drill.length; k++) expect(length3(sub(drill[k]!, drill[k - 1]!))).toBeLessThan(1.2);
    }
    // The drill's pegs are on the right instrument's side, inside the field a drag may reach.
    for (const index of TASK_PEGS) expect(clampTip(PEGS[index]!)).toEqual([...PEGS[index]!, TIP_Z]);
  });

  it('draws one lit part, the pool, and fills every slot', () => {
    const parts = movingAt(STILL_POSE);
    expect(parts.pool.filter((part) => part.kind === 'line' && part.tone === 'lit')).toHaveLength(1);
    expect([...parts.inside, ...parts.outside].some((part) => part.kind === 'solid' && part.lit)).toBe(false);
    expect(parts.inside.length).toBeGreaterThan(4);
    expect(parts.outside.length).toBeGreaterThan(20);
  });
});
