import { describe, expect, it } from 'vitest';
import {
  CRUSH_LIMIT_N,
  DEFAULT_PARAMS,
  SLIDER_SPECS,
  classifyOutcome,
  effectiveStiffness,
  simulateContact,
  steadyStateForce,
  type LabParams,
} from '@/lib/impedance';
import { TRANSIENT_CONTACT_LIMIT_N } from '@/lib/force-limits';

const at = (over: Partial<LabParams>): LabParams => ({ ...DEFAULT_PARAMS, ...over });

describe('impedance contact lab physics', () => {
  it('defaults to the torque-controlled hardware option', () => {
    expect(DEFAULT_PARAMS.hardware).toBe('torque');
  });

  it('steady-state force tracks commanded stiffness, not environment stiffness', () => {
    const soft = steadyStateForce(at({ stiffnessKNPerM: 500 }));
    const hard = steadyStateForce(at({ stiffnessKNPerM: 2000 }));
    expect(soft).toBeGreaterThan(0);
    expect(hard).toBeCloseTo(soft * 4, 0);
    // The impedance point: the environment is 400 kN/m stiff, the
    // programmer's spring 800 N/m soft, and the steady force is near
    // K * d, set by the programmer.
    expect(steadyStateForce(DEFAULT_PARAMS)).toBeCloseTo(0.002 * 800, -1);
  });

  it('peak force increases with stiffness at fixed depth (the teaching move)', () => {
    const soft = simulateContact(at({ stiffnessKNPerM: SLIDER_SPECS.stiffness.min }));
    const hard = simulateContact(at({ stiffnessKNPerM: SLIDER_SPECS.stiffness.max }));
    expect(soft.peakForceN).toBeGreaterThan(0);
    expect(hard.peakForceN).toBeGreaterThan(soft.peakForceN);
    // Both numeric, finite, distinct.
    expect(Number.isFinite(soft.peakForceN)).toBe(true);
    expect(Number.isFinite(hard.peakForceN)).toBe(true);
    expect(soft.peakForceN).not.toBe(hard.peakForceN);
  });

  it('stiffness extremes bracket the transient contact-force limit', () => {
    // Softer-than-default K stays far under the limit; maximum K with
    // maximum depth blows past 255 N: the limit line is a reachable
    // outcome, not decoration.
    const soft = simulateContact(at({ stiffnessKNPerM: 400 }));
    const hard = simulateContact(at({
      stiffnessKNPerM: SLIDER_SPECS.stiffness.max,
      depthM: SLIDER_SPECS.depth.max,
    }));
    expect(soft.peakForceN).toBeLessThan(TRANSIENT_CONTACT_LIMIT_N);
    expect(hard.peakForceN).toBeGreaterThan(TRANSIENT_CONTACT_LIMIT_N);
  });

  it('damping damps: higher D lowers the peak force', () => {
    const light = simulateContact(at({ dampingNPerM: 10 }));
    const heavy = simulateContact(at({ dampingNPerM: 400 }));
    expect(heavy.peakForceN).toBeLessThan(light.peakForceN);
  });

  it('the series-elastic spring lowers the effective contact stiffness and peak force', () => {
    expect(effectiveStiffness('sea')).toBeLessThan(effectiveStiffness('torque'));
    const sea = simulateContact(at({ hardware: 'sea' }));
    const torque = simulateContact(at({ hardware: 'torque' }));
    expect(sea.peakForceN).toBeLessThan(torque.peakForceN);
  });

  it('simulation is deterministic: identical inputs, identical trajectory', () => {
    const a = simulateContact(at({ stiffnessKNPerM: 1200, depthM: 0.003 }));
    const b = simulateContact(at({ stiffnessKNPerM: 1200, depthM: 0.003 }));
    expect(a.peakForceN).toBe(b.peakForceN);
    expect(a.steps.length).toBe(b.steps.length);
    expect(a.steps.at(-1)?.state.x).toBe(b.steps.at(-1)?.state.x);
  });

  it('the trace carries a visible non-zero force', () => {
    const run = simulateContact(DEFAULT_PARAMS);
    expect(run.steps.some((s) => s.forceN > 0)).toBe(true);
  });

  it('outcome classification covers all four states', () => {
    expect(classifyOutcome(at({ hardware: 'position' }), simulateContact(at({ hardware: 'position' } as LabParams)))).toBe('unbounded');
    const gentle = simulateContact(at({ depthM: 0.0005, stiffnessKNPerM: 200 }));
    expect(classifyOutcome(at({ depthM: 0.0005, stiffnessKNPerM: 200 }), gentle)).toBe('success');
    // Crush: steady force above the crush limit without the peak crossing
    // the transient line. A deep, stiff, well-damped torque-mode command
    // does exactly that (steady near 90 N, peak near 220 N in the
    // calibrated plant).
    const crushParams = at({ hardware: 'torque', depthM: 0.006, stiffnessKNPerM: 15000, dampingNPerM: 400 });
    const crushRun = simulateContact(crushParams);
    expect(crushRun.steadyForceN).toBeGreaterThan(CRUSH_LIMIT_N);
    expect(crushRun.peakForceN).toBeLessThan(TRANSIENT_CONTACT_LIMIT_N);
    expect(classifyOutcome(crushParams, crushRun)).toBe('crushed');
    const harsh = simulateContact(at({
      stiffnessKNPerM: SLIDER_SPECS.stiffness.max,
      depthM: SLIDER_SPECS.depth.max,
    }));
    expect(classifyOutcome(at({
      stiffnessKNPerM: SLIDER_SPECS.stiffness.max,
      depthM: SLIDER_SPECS.depth.max,
    }), harsh)).toBe('over-limit');
  });
});
