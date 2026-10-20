import { describe, expect, it } from 'vitest';
import {
  CLOSE_SECONDS,
  DRIFT_RANGE,
  DRIFT_STEP,
  DRIFT_WEIGHTS,
  DRIVEN_LEGS,
  FINAL_HEADING,
  JOINTS,
  LEG_M,
  OPENING_DRIFT,
  TRUE_CHAIN,
  TRUE_TURNS,
  chainAt,
  clampDrift,
  closeShareAt,
  gapM,
  lapDrift,
  measuredTurns,
  movingReadout,
  printed,
  readoutFor,
  sharesFor,
  valueTextFor,
  worstOffM,
} from '@/lib/loop-closure';
import { PARTS, START, U, movingAt, pinsAt, socketAt, toWorld, type TablePart } from '@/components/iso/figures/chain-map-table';
import { symbolHits } from '@/lib/figure-main-view';

const DRIFTS = [0.5, 1, 1.5, 2];
/** Every part, with the slid groups opened. */
const flat = (parts: readonly TablePart[]): TablePart[] => parts.flatMap((part) => (part.kind === 'group' ? flat(part.parts) : [part]));
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('loop closure model', () => {
  it('drives a 5 by 3 loop of 2 m legs and stops one leg short of the start, facing it', () => {
    expect(DRIVEN_LEGS).toBe(15);
    expect(JOINTS).toBe(14);
    expect(TRUE_TURNS.filter((turn) => turn === 90)).toHaveLength(3);
    const { pins, headings, end } = TRUE_CHAIN;
    expect(pins).toHaveLength(DRIVEN_LEGS + 1);
    for (let k = 1; k < pins.length; k++) expect(Math.hypot(pins[k]![0] - pins[k - 1]![0], pins[k]![1] - pins[k - 1]![1])).toBeCloseTo(LEG_M, 12);
    expect(pins[5]![0]).toBeCloseTo(10, 12);
    expect(pins[8]![1]).toBeCloseTo(6, 12);
    expect(headings[DRIVEN_LEGS - 1]).toBe(FINAL_HEADING);
    // The camera's view, one leg ahead of the last pose, lands on the start.
    expect(Math.hypot(...end)).toBeLessThan(1e-12);
  });

  it('measures every turn short by an uneven drift that averages the set drift', () => {
    const mean = DRIFT_WEIGHTS.slice(1).reduce((sum, w) => sum + w, 0) / JOINTS;
    expect(mean).toBeCloseTo(1, 12);
    expect(DRIFT_WEIGHTS[1]).toBeCloseTo(1.8, 12);
    expect(DRIFT_WEIGHTS[JOINTS]).toBeCloseTo(0.2, 12);
    for (const drift of DRIFTS) {
      const turns = measuredTurns(drift);
      for (let joint = 1; joint <= JOINTS; joint++) expect(TRUE_TURNS[joint]! - turns[joint]!).toBeCloseTo(drift * DRIFT_WEIGHTS[joint]!, 12);
      expect(lapDrift(drift)).toBeCloseTo(JOINTS * drift, 9);
    }
  });

  it('leaves a gap that grows with the drift, the end coming round short of the start', () => {
    let last = 0;
    for (const drift of DRIFTS) {
      const gap = gapM(drift);
      expect(gap).toBeGreaterThan(last);
      last = gap;
      // Short of the start: the open chain's end still lies on the far side of it, up the last leg.
      expect(chainAt(drift, 0).end[1]).toBeGreaterThan(0);
    }
    expect(printed(OPENING_DRIFT).gap).toBe('2.6');
  });

  it('closes the loop exactly, end on the start and facing the right way, with the smallest equal-weight corrections', () => {
    for (const drift of DRIFTS) {
      const shares = sharesFor(drift);
      const closed = chainAt(drift, 1);
      expect(Math.hypot(...closed.end)).toBeLessThan(1e-9);
      expect(closed.headings[DRIVEN_LEGS - 1]).toBeCloseTo(FINAL_HEADING, 9);
      // The heading closes, so the shares give back the whole lap's drift between them.
      expect(shares.slice(1).reduce((sum, d) => sum + d, 0)).toBeCloseTo(lapDrift(drift), 9);
      // Least norm: the shares satisfy the Lagrange condition, so they lie in the span of the closure's three
      // gradients at the closed chain (end x, end y, heading), d = J^T λ.
      const RAD = Math.PI / 180;
      const J = [0, 1, 2].map((row) =>
        Array.from({ length: JOINTS }, (_, k) => {
          const [px, py] = closed.pins[k + 1]!;
          return row === 0 ? -(closed.end[1] - py) * RAD : row === 1 ? (closed.end[0] - px) * RAD : RAD;
        }),
      );
      const d = shares.slice(1);
      const JJt = J.map((a) => J.map((b) => a.reduce((sum, v, k) => sum + v * b[k]!, 0)));
      const Jd = J.map((a) => a.reduce((sum, v, k) => sum + v * d[k]!, 0));
      const det = (m: number[][]) =>
        m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) - m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) + m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
      const lambda = [0, 1, 2].map((c) => det(JJt.map((r, i) => r.map((v, j) => (j === c ? Jd[i]! : v)))) / det(JJt));
      for (let k = 0; k < JOINTS; k++) expect(J[0]![k]! * lambda[0]! + J[1]![k]! * lambda[1]! + J[2]![k]! * lambda[2]!).toBeCloseTo(d[k]!, 6);
      // Every joint turns back, none more than the largest drift on any one joint.
      for (let joint = 1; joint <= JOINTS; joint++) {
        expect(shares[joint]).toBeGreaterThan(0);
        expect(shares[joint]).toBeLessThan(2 * drift);
      }
    }
  });

  it('pulls the map back close to the course, but not exactly onto it', () => {
    for (const drift of DRIFTS) {
      const before = worstOffM(drift, 0);
      const after = worstOffM(drift, 1);
      expect(after).toBeLessThan(before / 10);
      expect(after).toBeGreaterThan(0.01);
    }
    expect(printed(OPENING_DRIFT).worstClosed).toBe('0.12');
    expect(printed(OPENING_DRIFT).lap).toBe('21');
  });

  it('says its numbers in plain words that the slider’s value text covers, open and closed', () => {
    expect(readoutFor(1.5, false)).toBe('Drift 1.5 degrees a leg · the bar misses the start by 2.6 m');
    expect(readoutFor(1.5, true)).toBe('Closed · 14 joints share 21 degrees · worst pose 0.12 m off');
    for (const drift of DRIFTS) {
      for (const closed of [false, true]) {
        const readout = readoutFor(drift, closed);
        expect(symbolHits(readout)).toEqual([]);
        for (const number of readout.match(/\d+(?:\.\d+)?/g) ?? []) expect(valueTextFor(drift, closed)).toContain(number);
      }
      expect(symbolHits(movingReadout(drift, 0.5, true))).toEqual([]);
    }
    expect(clampDrift(1.3)).toBe(1.5);
    expect(clampDrift(0)).toBe(DRIFT_RANGE[0]);
    expect(clampDrift(9)).toBe(DRIFT_RANGE[1]);
    expect(DRIFT_STEP).toBe(0.5);
  });

  it('closes on an eased clock that starts and ends still', () => {
    expect(closeShareAt(0)).toBe(0);
    expect(closeShareAt(CLOSE_SECONDS)).toBe(1);
    expect(closeShareAt(CLOSE_SECONDS / 2)).toBeCloseTo(0.5, 12);
    let last = 0;
    for (let t = 0.01; t <= CLOSE_SECONDS; t += 0.01) {
      const share = closeShareAt(t);
      expect(share).toBeGreaterThanOrEqual(last);
      // No jump: at most π/2 of the close a second's worth over 10 ms.
      expect(share - last).toBeLessThan((Math.PI / 2 / CLOSE_SECONDS) * 0.01 + 1e-9);
      last = share;
    }
  });
});

describe('chain-map table', () => {
  it('lays the model’s pins and the camera’s view on the table at 20 units a metre', () => {
    for (const drift of DRIFTS) {
      for (const share of [0, 0.4, 1]) {
        const pose = { drift, share };
        const chain = chainAt(drift, share);
        const pins = pinsAt(pose);
        for (let k = 0; k < pins.length; k++) {
          const [x, y] = toWorld(chain.pins[k]!);
          expect(close(pins[k]![0], x) && close(pins[k]![1], y)).toBe(true);
        }
        for (let k = 1; k < pins.length; k++) expect(Math.hypot(pins[k]![0] - pins[k - 1]![0], pins[k]![1] - pins[k - 1]![1]) / U).toBeCloseTo(LEG_M, 9);
        const socket = socketAt(pose);
        const last = pins[DRIVEN_LEGS]!;
        expect(Math.hypot(socket[0] - last[0], socket[1] - last[1]) / U).toBeCloseTo(LEG_M, 9);
      }
      // Open, the socket misses the start post by the gap; closed, it sits on it.
      const open = socketAt({ drift, share: 0 });
      expect(Math.hypot(open[0] - START[0], open[1] - START[1]) / U).toBeCloseTo(gapM(drift), 9);
      const shut = socketAt({ drift, share: 1 });
      expect(Math.hypot(shut[0] - START[0], shut[1] - START[1])).toBeLessThan(1e-6);
    }
  });

  it('prints a ring at every true pose, and the closed chain’s pins sit inside them', () => {
    expect(PARTS.filter((part) => part.kind === 'line' && part.name === 'true-poses')).toHaveLength(1);
    const pins = pinsAt({ drift: OPENING_DRIFT, share: 1 });
    for (let k = 1; k <= DRIVEN_LEGS; k++) {
      const [x, y] = toWorld(TRUE_CHAIN.pins[k]!);
      // The ring is 5.6 units across its radius; the closed pin lands well inside it.
      expect(Math.hypot(pins[k]![0] - x, pins[k]![1] - y)).toBeLessThan(5.6);
    }
  });

  it('has one lit assembly, the bar and its socket, a spring at every joint, and no words', () => {
    for (const drift of DRIFTS) {
      for (const share of [0, 0.5, 1]) {
        const parts = flat(Object.values(movingAt({ drift, share })).flat() as TablePart[]);
        const lit = parts.filter((part) => part.kind === 'solid' && part.lit).map((part) => (part as { name?: string }).name);
        expect(lit.sort()).toEqual(['bar', 'socket']);
        expect(parts.filter((part) => part.kind === 'solid' && (part as { name?: string }).name?.startsWith('link-'))).toHaveLength(DRIVEN_LEGS);
        const slid = Object.values(movingAt({ drift, share })).flat().filter((part) => part.kind === 'group');
        // A pin with its spring at every joint, a puck under it, two anchor posts.
        expect(slid.filter((part) => part.name === 'joint')).toHaveLength(JOINTS);
        expect(slid.filter((part) => part.name === 'puck')).toHaveLength(JOINTS);
      }
    }
    expect(PARTS.filter((part) => part.kind === 'solid' && part.lit)).toHaveLength(0);
    expect(JSON.stringify([PARTS, movingAt({ drift: 1.5, share: 0 })])).not.toMatch(/<text|<title|<desc|foreignObject/);
  });
});
