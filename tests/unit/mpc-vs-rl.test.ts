import { describe, expect, it } from 'vitest';
import {
  CONTROLLERS,
  MPC_RL_COMPARISON_ROWS,
  PERTURBATIONS,
  TRACE_STEPS,
} from '@/lib/mpc-vs-rl';

describe('PERTURBATIONS', () => {
  it('offers at least two perturbations', () => {
    expect(PERTURBATIONS.length).toBeGreaterThanOrEqual(2);
  });

  it('every response trace has the shared trace length', () => {
    for (const p of PERTURBATIONS) {
      expect(p.mpc.trace).toHaveLength(TRACE_STEPS);
      expect(p.rl.trace).toHaveLength(TRACE_STEPS);
    }
  });

  it('the two controllers respond differently to every perturbation', () => {
    for (const p of PERTURBATIONS) {
      expect(
        p.mpc.trace,
        `identical MPC/RL traces for ${p.id}`,
      ).not.toEqual(p.rl.trace);
      expect(p.mpc.annotation).not.toBe(p.rl.annotation);
      expect(p.mpc.annotation.trim().length).toBeGreaterThan(0);
      expect(p.rl.annotation.trim().length).toBeGreaterThan(0);
    }
  });

  it('at least two perturbations give the controllers different outcomes', () => {
    const divergent = PERTURBATIONS.filter(
      (p) => p.mpc.status !== p.rl.status,
    );
    expect(divergent.length).toBeGreaterThanOrEqual(2);
  });

  it('includes a low-friction case where the model-based controller is the one that fails', () => {
    const friction = PERTURBATIONS.find((p) => p.id === 'low-friction');
    expect(friction).toBeDefined();
    expect(friction?.mpc.status).toBe('falls');
    expect(friction?.rl.status).toBe('recovers');
  });
});

describe('CONTROLLERS', () => {
  it('compute-per-step readouts differ between the two controllers', () => {
    expect(CONTROLLERS.mpc.compute).not.toBe(CONTROLLERS.rl.compute);
    expect(CONTROLLERS.mpc.compute.trim().length).toBeGreaterThan(0);
    expect(CONTROLLERS.rl.compute.trim().length).toBeGreaterThan(0);
  });
});

describe('MPC_RL_COMPARISON_ROWS', () => {
  it('covers model error, constraints, and deploy-time compute', () => {
    const dims = MPC_RL_COMPARISON_ROWS.map((r) =>
      r.dimension.toLowerCase(),
    );
    expect(dims.some((d) => d.includes('model error'))).toBe(true);
    expect(dims.some((d) => d.includes('constraint'))).toBe(true);
    expect(dims.some((d) => d.includes('compute'))).toBe(true);
  });

  it('every row states both sides', () => {
    for (const row of MPC_RL_COMPARISON_ROWS) {
      expect(row.mpc.trim().length).toBeGreaterThan(0);
      expect(row.rl.trim().length).toBeGreaterThan(0);
    }
  });
});
