import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAINS,
  GAIN_SPECS,
  INITIAL_STATE,
  PENDULUM_PARAMS,
  PUSH_IMPULSE,
  advancePendulum,
  applyPush,
  classifyStability,
  controlTorque,
  playbackCadence,
  simulate,
  stepPendulum,
  tipPosition,
  type PidGains,
  type PendulumState,
} from '@/lib/pendulum';

const DEG = Math.PI / 180;

function last<T>(xs: T[]): T {
  const v = xs.at(-1);
  if (v === undefined) throw new Error('empty array');
  return v;
}

/** States from `run` covering the trailing `seconds` of sim time. */
function tail(run: PendulumState[], seconds: number): PendulumState[] {
  const end = last(run).t;
  return run.filter((s) => s.t >= end - seconds);
}

describe('pendulum plant and PID law', () => {
  it('ships the documented plant: unit point mass on a 1 m rod with a bias payload', () => {
    expect(PENDULUM_PARAMS.massKg).toBe(1);
    expect(PENDULUM_PARAMS.lengthM).toBe(1);
    expect(PENDULUM_PARAMS.gravity).toBeCloseTo(9.81, 2);
    // The constant bias torque is what gives the integral term something
    // real to correct: pure PD settles leaning into it.
    expect(PENDULUM_PARAMS.biasTorque).toBeGreaterThan(0);
  });

  it('starts the pole 12 degrees off vertical, at rest, unforced', () => {
    expect(INITIAL_STATE.theta).toBeCloseTo(12 * DEG, 5);
    expect(INITIAL_STATE.thetaDot).toBe(0);
    expect(INITIAL_STATE.integral).toBe(0);
    expect(INITIAL_STATE.t).toBe(0);
  });

  it('computes u = -(Kp*theta + Kd*thetaDot + Ki*integral) inside the torque limit', () => {
    const state: PendulumState = {
      theta: 0.1,
      thetaDot: -0.2,
      integral: 0.05,
      t: 0,
    };
    const gains: PidGains = { kp: 25, ki: 4, kd: 3 };
    // -(25*0.1 + 4*0.05 + 3*(-0.2)) = -(2.5 + 0.2 - 0.6) = -2.1
    expect(controlTorque(state, gains, PENDULUM_PARAMS)).toBeCloseTo(-2.1, 9);
  });

  it('saturates the actuator at the torque limit', () => {
    const state: PendulumState = { theta: 3, thetaDot: 8, integral: 1, t: 0 };
    const gains: PidGains = { kp: 40, ki: 20, kd: 10 };
    expect(
      Math.abs(controlTorque(state, gains, PENDULUM_PARAMS)),
    ).toBeLessThanOrEqual(PENDULUM_PARAMS.torqueLimit);
    // Unsaturated it would be far larger.
    expect(Math.abs(-(40 * 3 + 20 * 1 + 10 * 8))).toBeGreaterThan(
      PENDULUM_PARAMS.torqueLimit,
    );
  });

  it('clamps the integral state against windup even after a long fall', () => {
    const run = simulate({ kp: 4, ki: 20, kd: 0 }, 30);
    expect(Math.abs(last(run).theta)).toBeGreaterThan(60 * DEG);
    for (const s of run) {
      expect(Math.abs(s.integral)).toBeLessThanOrEqual(
        PENDULUM_PARAMS.integralLimit + 1e-9,
      );
    }
  });

  it('wraps theta into (-pi, pi] so a fallen pole reads as hanging down', () => {
    let s: PendulumState = { theta: 3.0, thetaDot: 6, integral: 0, t: 0 };
    for (let i = 0; i < 100; i += 1) {
      s = stepPendulum(s, { kp: 0, ki: 0, kd: 0 }, PENDULUM_PARAMS, 1 / 240);
      expect(Math.abs(s.theta)).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});

describe('closed-loop regimes (the interactive contract)', () => {
  it('default gains stabilize the pole but hold a steady lean against the bias payload', () => {
    const run = simulate(DEFAULT_GAINS, 8);
    const end = last(run);
    // Settled: residual motion is tiny.
    expect(Math.abs(end.thetaDot)).toBeLessThan(2 * DEG);
    // Steady-state lean of roughly bias / (Kp - mgl) ~ 0.8 / 15.2 ~ 3 deg.
    expect(Math.abs(end.theta)).toBeGreaterThan(1.5 * DEG);
    expect(Math.abs(end.theta)).toBeLessThan(6 * DEG);
    expect(classifyStability(tail(run, 2))).toBe('settled');
  });

  it('adding integral gain removes the steady-state lean', () => {
    const run = simulate({ kp: 25, ki: 8, kd: 3 }, 25);
    expect(Math.abs(last(run).theta)).toBeLessThan(0.5 * DEG);
    // The integral state holds the bias compensation after theta reaches 0.
    expect(Math.abs(last(run).integral)).toBeGreaterThan(0.05);
  });

  it('proportional gain below the gravity threshold cannot hold the pole up', () => {
    // Linearized threshold is Kp > m*g*l = 9.81.
    const run = simulate({ kp: 6, ki: 0, kd: 3 }, 4);
    expect(Math.abs(last(run).theta)).toBeGreaterThan(60 * DEG);
    expect(classifyStability(tail(run, 2))).toBe('fallen');
  });

  it('near-zero derivative gain leaves a sustained oscillation', () => {
    const run = simulate({ kp: 25, ki: 0, kd: 0.3 }, 6);
    expect(classifyStability(tail(run, 2))).toBe('oscillating');
  });

  it('with no control at all the released pole falls over', () => {
    const run = simulate({ kp: 0, ki: 0, kd: 0 }, 3);
    // It goes past 60 degrees within the first second (theta wraps once the
    // pole tumbles through the bottom, so check the max, not the endpoint).
    const peak = Math.max(...run.map((s) => Math.abs(s.theta)));
    const firstFall = run.find((s) => Math.abs(s.theta) > 60 * DEG);
    expect(peak).toBeGreaterThan(60 * DEG);
    expect(firstFall && firstFall.t < 1).toBe(true);
  });
});

describe('determinism and stepping', () => {
  it('reproduces a trajectory exactly: same inputs, same states', () => {
    const a = simulate({ kp: 25, ki: 5, kd: 3 }, 5);
    const b = simulate({ kp: 25, ki: 5, kd: 3 }, 5);
    expect(a).toEqual(b);
  });

  it('advancePendulum matches the equivalent run of raw steps', () => {
    const gains: PidGains = { kp: 18, ki: 2, kd: 2 };
    const stepped = simulate(gains, 1).at(-1);
    const advanced = advancePendulum(INITIAL_STATE, gains, PENDULUM_PARAMS, 1);
    expect(stepped).toEqual(advanced);
  });

  it('applies the push as a fixed angular-velocity impulse', () => {
    const pushed = applyPush(INITIAL_STATE);
    expect(pushed.thetaDot).toBeCloseTo(INITIAL_STATE.thetaDot + PUSH_IMPULSE, 9);
    expect(pushed.theta).toBe(INITIAL_STATE.theta);
  });

  it('exposes smooth playback normally and coarse jumps under reduced motion', () => {
    const smooth = playbackCadence(false);
    const coarse = playbackCadence(true);
    expect(smooth.tickMs).toBeLessThan(100);
    expect(coarse.tickMs).toBeGreaterThanOrEqual(300);
    // Both advance sim time at roughly real-time rate; only the frame
    // granularity changes, so behavior is identical at a coarser cadence.
    expect(smooth.simSecondsPerTick).toBeCloseTo(smooth.tickMs / 1000, 2);
    expect(coarse.simSecondsPerTick).toBeCloseTo(coarse.tickMs / 1000, 2);
  });
});

describe('geometry and gain metadata', () => {
  it('maps theta to the tip position: 0 is straight up, +90 deg is right', () => {
    const pivot = { x: 320, y: 320 };
    const up = tipPosition(0, 230, pivot);
    expect(up.x).toBeCloseTo(320, 6);
    expect(up.y).toBeCloseTo(90, 6);
    const right = tipPosition(90 * DEG, 230, pivot);
    expect(right.x).toBeCloseTo(550, 6);
    expect(right.y).toBeCloseTo(320, 6);
  });

  it('exposes exactly the three PID gain sliders with sane bounds', () => {
    expect(GAIN_SPECS.map((g) => g.id)).toEqual(['kp', 'ki', 'kd']);
    for (const spec of GAIN_SPECS) {
      expect(spec.min).toBe(0);
      expect(spec.max).toBeGreaterThan(spec.min);
      expect(spec.step).toBeGreaterThan(0);
      expect(DEFAULT_GAINS[spec.id]).toBeGreaterThanOrEqual(spec.min);
      expect(DEFAULT_GAINS[spec.id]).toBeLessThanOrEqual(spec.max);
      // Defaults land exactly on the slider grid.
      const steps = (DEFAULT_GAINS[spec.id] - spec.min) / spec.step;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    }
    // The default Kp sits above the 9.81 instability threshold and the
    // slider range reaches well below it, so the fall is reachable.
    const kp = GAIN_SPECS.find((g) => g.id === 'kp');
    expect(kp && DEFAULT_GAINS.kp > 9.81).toBe(true);
    expect(kp && kp.max > 9.81 && kp.min < 9.81).toBe(true);
  });
});
