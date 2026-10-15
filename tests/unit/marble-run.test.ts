import { describe, expect, it } from 'vitest';
import {
  GATES,
  GATES_PER_RAIL,
  GATE_S,
  MARBLES,
  RAILS,
  TRACK_END,
  dropsAt,
  fateOf,
  finishCup,
  gateX,
  jobOf,
  marbleRun,
  railY,
  railZ,
  rejectCup,
  restCounts,
  survivorsAfter,
  trackAt,
} from '@/components/iso/figures/marble-run';
import { compoundedSuccessRate } from '@/lib/reliability';

const SETTINGS: Array<[number, number]> = [
  [0.95, 14], [0.95, 30], [0.99, 30], [0.999, 30], [0.95, 100], [0.5, 1], [0, 100], [1, 100], [0.734, 1], [0.9, 60],
];

describe('marble run: the model behind the board', () => {
  it('keeps round(100 p^k) marbles rolling after k armed gates, the readout in whole jobs', () => {
    for (const [p, n] of SETTINGS) {
      expect(survivorsAfter(p, 0)).toBe(MARBLES);
      for (let k = 1; k <= n; k++) {
        expect(survivorsAfter(p, k), `${p} ${k}`).toBe(Math.round(100 * compoundedSuccessRate(p, k)));
        expect(survivorsAfter(p, k)).toBeLessThanOrEqual(survivorsAfter(p, k - 1));
      }
      // The finish tray holds the readout's share of jobs, rounded to whole marbles.
      expect(restCounts(p, n).finished, `${p} ${n}`).toBe(Math.round(compoundedSuccessRate(p, n) * 100));
      expect(restCounts(p, n).finished + restCounts(p, n).rejected).toBe(MARBLES);
    }
    // The article's cases: 95% over 14 steps and 30, 99% and 99.9% over 30, 95% over 100.
    expect([restCounts(0.95, 14), restCounts(0.95, 30), restCounts(0.99, 30), restCounts(0.999, 30), restCounts(0.95, 100)].map((c) => c.finished))
      .toEqual([49, 21, 74, 97, 1]);
  });

  it('gives every marble one fate: past every armed gate, or through exactly one trapdoor', () => {
    // The release order is a fixed shuffle of the hundred jobs.
    expect(new Set(Array.from({ length: MARBLES }, (_, i) => jobOf(i))).size).toBe(MARBLES);
    for (const [p, n] of SETTINGS) {
      const fates = Array.from({ length: MARBLES }, (_, release) => fateOf(release, p, n));
      const drops = dropsAt(p, n);
      expect(fates.filter((fate) => fate === 'finish')).toHaveLength(survivorsAfter(p, n));
      for (let gate = 0; gate < n; gate++) expect(fates.filter((fate) => fate === gate), `${p} ${n} gate ${gate}`).toHaveLength(drops[gate]);
      // Gates past the job's length are pinned shut: nothing drops there.
      expect(fates.every((fate) => fate === 'finish' || fate < n)).toBe(true);
    }
  });

  it('lays a hundred gates, ten to a rail, along one zig-zag track from the hopper to the finish chute', () => {
    expect(GATES).toBe(100);
    expect(RAILS * GATES_PER_RAIL).toBe(GATES);
    expect(GATE_S).toHaveLength(GATES);
    for (let gate = 1; gate < GATES; gate++) expect(GATE_S[gate]).toBeGreaterThan(GATE_S[gate - 1]);
    expect(TRACK_END).toBeGreaterThan(GATE_S[GATES - 1]);
    for (let gate = 0; gate < GATES; gate++) {
      const rail = Math.floor(gate / GATES_PER_RAIL);
      const point = trackAt(GATE_S[gate]).at;
      // The track passes over the middle of each gate, on its own rail.
      expect(point[0], `gate ${gate}`).toBeCloseTo(gateX(gate), 3);
      expect(point[1], `gate ${gate}`).toBeCloseTo(railY(rail), 6);
      expect(trackAt(GATE_S[gate]).rail).toBe(rail);
    }
    // Each rail sits a step below the one before: the marbles roll downhill.
    for (let rail = 1; rail < RAILS; rail++) expect(railZ(rail)).toBeLessThan(railZ(rail - 1));
    // The track never jumps: neighbouring samples stay within a few millimetres.
    for (let s = 0; s < TRACK_END; s += 2) {
      const a = trackAt(s).at;
      const b = trackAt(s + 2).at;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThanOrEqual(2.01);
    }
  });

  it('ends a run in exactly the still pose: the trays fill cup by cup with the right marbles', () => {
    for (const [p, n] of [[0.95, 14], [0.99, 30], [0.95, 100], [0.999, 30]] as Array<[number, number]>) {
      const run = marbleRun(p, n);
      const end = Array.from({ length: MARBLES }, (_, release) => run.place(release, run.duration));
      const finished = end.filter((place) => place.where === 'finish');
      const rejected = end.filter((place) => place.where === 'reject');
      expect(finished).toHaveLength(restCounts(p, n).finished);
      expect(rejected).toHaveLength(restCounts(p, n).rejected);
      // Cups 0..k-1 in each tray, each marble settled on its cup.
      for (const [list, cupAt] of [[finished, finishCup], [rejected, rejectCup]] as const) {
        const cups = list.map((place) => (place.where === 'finish' || place.where === 'reject' ? place.cup : -1)).sort((a, b) => a - b);
        expect(cups).toEqual(Array.from({ length: list.length }, (_, i) => i));
        for (const place of list) {
          if (place.where !== 'finish' && place.where !== 'reject') continue;
          expect(place.settle).toBe(1);
          expect(place.at[0]).toBeCloseTo(cupAt(place.cup)[0], 6);
          expect(place.at[1]).toBeCloseTo(cupAt(place.cup)[1], 6);
        }
      }
      // Every flap is shut again and the counts agree.
      expect(run.flaps(run.duration).every((open) => open === 0)).toBe(true);
      expect(run.counts(run.duration)).toEqual({ released: MARBLES, finished: finished.length, rejected: rejected.length });
    }
  });

  it('drops a marble only through an armed gate it reached, opening that gate and no other', () => {
    const p = 0.95;
    const n = 30;
    const run = marbleRun(p, n);
    for (let t = 0; t <= run.duration; t += 0.05) {
      const open = run.flaps(t);
      open.forEach((share, gate) => {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(1);
        if (gate >= n) expect(share, `pinned gate ${gate}`).toBe(0);
      });
      for (let release = 0; release < MARBLES; release++) {
        const place = run.place(release, t);
        if (place.where !== 'rail') continue;
        const fate = run.fates[release];
        // A rolling marble never passes the gate it drops at.
        const s = (t - release * 0.05) * 420;
        if (fate !== 'finish') expect(s).toBeLessThanOrEqual(GATE_S[fate] + 1e-6 + 0.2 * 420);
      }
    }
    // Every armed gate that drops a marble opens at some moment of the run.
    const drops = dropsAt(p, n);
    const opened = new Array(n).fill(false);
    for (let t = 0; t <= run.duration; t += 0.01) run.flaps(t).forEach((share, gate) => { if (share > 0 && gate < n) opened[gate] = true; });
    drops.forEach((count, gate) => expect(opened[gate], `gate ${gate}`).toBe(count > 0));
  });
});
