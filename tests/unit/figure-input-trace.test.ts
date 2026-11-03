import { describe, expect, it } from 'vitest';
import { beginForceTrace, beginPendulumTrace, recordAdvance, recordForce, recordPendulumPush, INPUT_TRACE_RECORD_LIMIT, PENDULUM_TRACE_STEP_LIMIT } from '../../lib/figure-input-trace';

describe('bounded figure input provenance', () => {
  it('coalesces equal gain runs without changing time or earlier records', () => {
    const gains = { kp: 25, ki: 0, kd: 3 }, first = recordAdvance(beginPendulumTrace(), 154, gains);
    const second = recordAdvance(first, 154, gains), changed = recordAdvance(second, 16, { ...gains, kp: 40 });
    expect(first.events).toEqual([{ kind: 'advance', steps: 154, ...gains }]);
    expect(second).toEqual({ complete: true, steps: 308, events: [{ kind: 'advance', steps: 308, ...gains }] });
    expect(changed.events).toHaveLength(2);
    const pushed = recordPendulumPush(changed, 2);
    expect(recordAdvance(pushed, 154, gains).events).toHaveLength(4);
    expect(Object.keys(pushed.events.at(-1)!)).toEqual(['kind', 'impulse']);
  });
  it('keeps finite storage and explicitly rejects incomplete record or time histories', () => {
    let force = beginForceTrace(), pendulum = beginPendulumTrace();
    for (let i = 0; i < INPUT_TRACE_RECORD_LIMIT; i++) { force = recordForce(force, 4); pendulum = recordPendulumPush(pendulum, 2); }
    force = recordForce(force, 6); pendulum = recordPendulumPush(pendulum, 2);
    expect(force.complete).toBe(false); expect(force.forces).toHaveLength(INPUT_TRACE_RECORD_LIMIT);
    expect(pendulum.complete).toBe(false); expect(pendulum.events).toHaveLength(INPUT_TRACE_RECORD_LIMIT);
    expect(recordForce(force, 1)).toBe(force);
    const full = recordAdvance(beginPendulumTrace(), PENDULUM_TRACE_STEP_LIMIT, { kp: 25, ki: 0, kd: 3 });
    expect(full.complete).toBe(true);
    expect(recordAdvance(full, 1, { kp: 25, ki: 0, kd: 3 }).complete).toBe(false);
    expect(beginForceTrace().complete).toBe(true); expect(beginPendulumTrace().complete).toBe(true);
  });
  it('never serializes non-finite or fractional integration inputs as valid provenance', () => {
    expect(recordForce(beginForceTrace(), NaN).complete).toBe(false);
    expect(recordAdvance(beginPendulumTrace(), 1.2, { kp: 25, ki: 0, kd: 3 }).complete).toBe(false);
    expect(recordAdvance(beginPendulumTrace(), 1, { kp: Infinity, ki: 0, kd: 3 }).complete).toBe(false);
  });
});
