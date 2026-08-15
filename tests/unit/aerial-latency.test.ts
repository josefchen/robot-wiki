import { describe, expect, it } from 'vitest';
import {
  AGILITY_STEPS,
  DEFAULT_LATENCY_MS,
  LATENCY_STEPS_MS,
  OBSTACLE_RADIUS_M,
  SENSORS,
  avoidanceTimeS,
  latencyOutcome,
  maxSpeedMs,
} from '@/lib/aerial-latency';

/**
 * Expected values reproduce rows of Table I in Falanga, Kim, and
 * Scaramuzza (RA-L 2019): sensing range 8 m, latency 0.070 s (stereo
 * upper bound) and the u = 25 and 50 m/s^2 columns.
 */
describe('maxSpeedMs reproduces the paper Table I rows', () => {
  it('stereo camera at 8 m range, 70 ms latency, u = 25 m/s^2', () => {
    expect(maxSpeedMs(0.07, 25, 8)).toBeCloseTo(19.21, 1);
  });

  it('stereo camera at 8 m range, 70 ms latency, u = 50 m/s^2', () => {
    expect(maxSpeedMs(0.07, 50, 8)).toBeCloseTo(25.4, 1);
  });

  it('zero latency at 8 m range matches the geometric limit', () => {
    // tau = 0: v = s / (2*sqrt(r/u)) = 8 / (2*sqrt(0.75/50)).
    expect(maxSpeedMs(0, 50, 8)).toBeCloseTo(8 / (2 * Math.sqrt(0.75 / 50)), 6);
  });
});

describe('latencyOutcome geometry', () => {
  it('at the maximum speed the maneuver exactly fits the remaining time', () => {
    const o = latencyOutcome(0.07, 25, 8);
    expect(o.avoidable).toBe(true);
    expect(o.timeRemainingS).toBeCloseTo(o.avoidanceTimeS, 6);
  });

  it('latency reduces the maximum speed monotonically at fixed agility', () => {
    let previous = Infinity;
    for (const ms of LATENCY_STEPS_MS) {
      const v = maxSpeedMs(ms / 1000, 25, 8);
      expect(v).toBeLessThanOrEqual(previous + 1e-9);
      previous = v;
    }
  });

  it('agility increases the maximum speed monotonically at fixed latency', () => {
    let previous = -Infinity;
    for (const u of AGILITY_STEPS) {
      const v = maxSpeedMs(0.07, u, 8);
      expect(v).toBeGreaterThan(previous);
      previous = v;
    }
  });

  it('the avoidance time is 2*sqrt(r/u) with the paper obstacle radius', () => {
    for (const u of AGILITY_STEPS) {
      expect(avoidanceTimeS(u)).toBeCloseTo(
        2 * Math.sqrt(OBSTACLE_RADIUS_M / u),
        9,
      );
    }
    // u = 50 m/s^2 gives 2*sqrt(0.015) = 0.245 s.
    expect(avoidanceTimeS(50)).toBeCloseTo(0.2449, 3);
  });
});

describe('the event-camera argument', () => {
  it('the event camera beats the stereo camera at every agility', () => {
    const stereo = SENSORS.find((s) => s.id === 'stereo');
    const event = SENSORS.find((s) => s.id === 'event');
    if (!stereo || !event) throw new Error('sensor fixtures missing');
    for (const u of AGILITY_STEPS) {
      expect(maxSpeedMs(event.latencyS, u, event.rangeM)).toBeGreaterThan(
        maxSpeedMs(stereo.latencyS, u, stereo.rangeM),
      );
    }
  });

  it('the event camera speedup is the paper percentage, not an order of magnitude', () => {
    // Paper Table I, 8 m sensing range, u = 50 m/s^2: stereo 25.40 m/s
    // versus event 31.03 m/s = +22 percent; the paper reports 7 to 12
    // percent at other latency bounds and calls the gap "significant"
    // only at high agility, so a same-order gain is the honest claim.
    const stereo = maxSpeedMs(0.07, 50, 8);
    const event = maxSpeedMs(SENSORS[1].latencyS, 50, SENSORS[1].rangeM);
    expect(event).toBeCloseTo(31.13, 1);
    const gain = (event - stereo) / stereo;
    expect(gain).toBeGreaterThan(0.07);
    expect(gain).toBeLessThan(0.3);
  });

  it('latency consumes a larger share of the time to contact at low latency', () => {
    // At tau = 0 the share is 0; it grows with tau; it is capped at 1.
    expect(latencyOutcome(0, 25, 8).latencyShare).toBe(0);
    const at70 = latencyOutcome(0.07, 25, 8).latencyShare;
    const at200 = latencyOutcome(0.2, 25, 8).latencyShare;
    expect(at200).toBeGreaterThan(at70);
    expect(at200).toBeLessThanOrEqual(1);
  });
});

describe('interactive bounds', () => {
  it('the default state is a real stereo-camera drone, not pre-broken', () => {
    const o = latencyOutcome(DEFAULT_LATENCY_MS / 1000, 25, 8);
    expect(o.avoidable).toBe(true);
    expect(o.maxSpeedMs).toBeGreaterThan(10);
  });

  it('the slider maximum sits well below the zero-latency limit', () => {
    // At 200 ms latency the speed is about 63 percent of the
    // zero-latency limit at u = 25, so the slider spans a visible
    // dynamic range.
    const atMax = maxSpeedMs(0.2, 25, 8);
    const atZero = maxSpeedMs(0, 25, 8);
    expect(atMax).toBeLessThan(atZero * 0.7);
    expect(atMax).toBeGreaterThan(atZero * 0.5);
  });
});
