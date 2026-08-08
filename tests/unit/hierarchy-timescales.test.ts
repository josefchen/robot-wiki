import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  HIERARCHY_SYSTEMS,
  HORIZON_MS,
  displayTicks,
  getSystem,
  laneEventTimes,
  lastUpdateAt,
  updateCountAt,
} from '@/lib/hierarchy-timescales';

describe('HIERARCHY_SYSTEMS registry', () => {
  it('covers the four required system overlays', () => {
    const ids = HIERARCHY_SYSTEMS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['pi05', 'gemini-15', 'helix-02', 'go2']),
    );
  });

  it('gives every system at least four lanes at different rates', () => {
    for (const system of HIERARCHY_SYSTEMS) {
      expect(system.lanes.length, system.id).toBeGreaterThanOrEqual(4);
      const rates = system.lanes.map((l) => l.rate);
      expect(new Set(rates).size, system.id).toBe(rates.length);
    }
  });

  it('orders lanes slowest to fastest within each system', () => {
    for (const system of HIERARCHY_SYSTEMS) {
      const periods = system.lanes.map((l) => l.periodMs ?? Number.POSITIVE_INFINITY);
      const sorted = [...periods].sort((a, b) => b - a);
      expect(periods, system.id).toEqual(sorted);
    }
  });

  it('every system starts with a task-instruction lane that fires once', () => {
    for (const system of HIERARCHY_SYSTEMS) {
      const first = system.lanes[0];
      expect(first.periodMs, system.id).toBeNull();
      expect(laneEventTimes(first)).toEqual([0]);
    }
  });

  it('Helix 02 carries the vendor-reported 200 Hz S1 and 1 kHz S0 lanes', () => {
    const helix = getSystem('helix-02');
    const s1 = helix.lanes.find((l) => l.id === 's1');
    const s0 = helix.lanes.find((l) => l.id === 's0');
    expect(s1?.periodMs).toBe(5);
    expect(s0?.periodMs).toBe(1);
    expect(s1?.disclosed).toBe(true);
    expect(s0?.disclosed).toBe(true);
  });

  it('GO-2 shows the asynchronous low-frequency planner / high-frequency follower split', () => {
    const go2 = getSystem('go2');
    const planner = go2.lanes.find((l) => l.id === 'planner');
    const follower = go2.lanes.find((l) => l.id === 'follower');
    expect(planner).toBeDefined();
    expect(follower).toBeDefined();
    expect(planner!.periodMs!).toBeGreaterThan(follower!.periodMs!);
  });

  it('every system cites a registered source', () => {
    for (const system of HIERARCHY_SYSTEMS) {
      expect(
        getCitation(system.citationId),
        `${system.id} citation ${system.citationId}`,
      ).toBeDefined();
    }
  });

  it('undisclosed rates are flagged as schematic', () => {
    for (const system of HIERARCHY_SYSTEMS) {
      for (const lane of system.lanes) {
        if (!lane.disclosed) {
          expect(
            lane.note.toLowerCase(),
            `${system.id}/${lane.id}`,
          ).toContain('schematic');
        }
      }
    }
  });
});

describe('laneEventTimes', () => {
  it('emits one event per period within the horizon', () => {
    const lane = getSystem('pi05').lanes.find((l) => l.id === 'control')!;
    const events = laneEventTimes(lane);
    // 50 Hz over a 2000 ms horizon: one event every 20 ms, starting at 20.
    expect(events).toHaveLength(HORIZON_MS / 20);
    expect(events[0]).toBe(20);
    expect(events[events.length - 1]).toBe(HORIZON_MS);
  });

  it('emits nothing before the first period elapses', () => {
    const lane = getSystem('pi05').lanes.find((l) => l.id === 'subtask')!;
    expect(laneEventTimes(lane, 500)).toEqual([]);
    expect(laneEventTimes(lane, 1000)).toEqual([1000]);
  });
});

describe('updateCountAt and lastUpdateAt', () => {
  const pi05 = getSystem('pi05');
  const instruction = pi05.lanes.find((l) => l.id === 'instruction')!;
  const subtask = pi05.lanes.find((l) => l.id === 'subtask')!;
  const control = pi05.lanes.find((l) => l.id === 'control')!;

  it('fires the instruction lane exactly once at t=0', () => {
    expect(updateCountAt(instruction, 0)).toBe(1);
    expect(updateCountAt(instruction, 1999)).toBe(1);
    expect(lastUpdateAt(instruction, 0)).toBe(0);
  });

  it('counts only elapsed periods while scrubbing', () => {
    // At t=1030 the 50 Hz lane has fired 51 times, the ~1 Hz lane once.
    expect(updateCountAt(control, 1030)).toBe(51);
    expect(updateCountAt(subtask, 1030)).toBe(1);
    expect(lastUpdateAt(control, 1030)).toBe(1020);
    expect(lastUpdateAt(subtask, 1030)).toBe(1000);
  });

  it('returns null before a lane has fired', () => {
    expect(lastUpdateAt(subtask, 999)).toBeNull();
    expect(updateCountAt(subtask, 999)).toBe(0);
  });

  it('clamps to the horizon', () => {
    expect(updateCountAt(control, 10000)).toBe(HORIZON_MS / 20);
    expect(lastUpdateAt(control, 10000)).toBe(HORIZON_MS);
  });

  it('advances a fast lane while a slow lane holds still', () => {
    // Scrubbing from 1020 to 1080 advances control but not subtask.
    expect(lastUpdateAt(control, 1020)).toBe(1020);
    expect(lastUpdateAt(control, 1080)).toBe(1080);
    expect(lastUpdateAt(subtask, 1020)).toBe(lastUpdateAt(subtask, 1080));
  });
});

describe('displayTicks', () => {
  it('returns every event for slow lanes', () => {
    const control = getSystem('pi05').lanes.find((l) => l.id === 'control')!;
    expect(displayTicks(control)).toEqual(laneEventTimes(control));
  });

  it('subsamples dense lanes to a bounded tick count', () => {
    const s0 = getSystem('helix-02').lanes.find((l) => l.id === 's0')!;
    const ticks = displayTicks(s0);
    expect(ticks.length).toBeLessThanOrEqual(120);
    expect(ticks[0]).toBeGreaterThan(0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(HORIZON_MS);
  });
});
