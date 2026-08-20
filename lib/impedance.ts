/**
 * One-dimensional impedance-contact dynamics for the control module's
 * compliance lab. Pure functions, unit-tested in
 * tests/unit/impedance.test.ts.
 *
 * The plant is the contact half of a manipulator meeting a rigid surface:
 * an effective mass m driven toward a wall whose actual position sits
 * closer than the controller's model said, by a commanded penetration
 * depth d (the position error a real controller holds when the surface is
 * 2 mm nearer than modeled). The contact force is the environment spring
 * stiffness K_e times the actual penetration x (x > 0 means inside the
 * surface).
 *
 * The controller is Hogan's impedance law in the translational axis:
 *
 *   F = -(K * x_c + D * x_c_dot) + F_0
 *
 * with x_c the commanded penetration, F_0 = K * d the feedforward force
 * the equilibrium implies, K and D the programmer-chosen stiffness and
 * damping. For the torque-controlled arm the closed loop is a driven
 * mass-spring-damper (arm inertia m against contact stiffness K_e through
 * the commanded impedance), simulated with fixed-step semi-implicit Euler,
 * fully deterministic: identical inputs produce the identical trajectory.
 *
 * Hardware modes:
 * - position-controlled geared arm: the joint position is commanded
 *   directly, so the arm enforces the commanded penetration x = d exactly,
 *   pinning the contact force at K_e * d regardless of K and D, and in
 *   reality at whatever the model error and gear ratio produce, i.e.
 *   unbounded by construction. Represented by an unbounded readout, not a
 *   number.
 * - series-elastic joint: a physical spring of stiffness K_s between the
 *   gear and the link filters the contact, bounding the peak force near
 *   the spring-limited value and making the loop a double-mass system;
 *   modeled here as the torque-controlled loop with the contact stiffness
 *   series-combined with K_s (1/k_eff = 1/K_e + 1/K_s), the standard
 *   first-order effect Pratt and Williamson identified: the spring
 *   dominates the contact stiffness, so peak force falls and force
 *   resolution rises.
 *
 * Task outcomes: success (steady-state force within the crush limit and
 * the peak under the transient contact-force limit), crushed (steady
 * force exceeds the object's crush limit), or over-limit (peak exceeds the
 * transient contact-force limit even when the steady force is fine).
 *
 * References: Hogan (1985) for the impedance law,
 * 10.1115/1.3140702; Pratt and Williamson (1995) for series elasticity,
 * 10.1109/IROS.1995.525827; Han et al. (2024) for the transient
 * contact-force research basis, 10.3389/frobt.2024.1374999.
 */

import { TRANSIENT_CONTACT_LIMIT_N } from '@/lib/force-limits';

export type HardwareMode = 'position' | 'torque' | 'sea';

/** Rigid-environment contact stiffness, N/m. The "rigid surface" the lab
 * presses into; high enough that the programmed impedance, not the
 * environment, dominates the closed loop in torque mode. */
export const ENVIRONMENT_STIFFNESS_N_PER_M = 400000;

/** Series spring stiffness in the sea mode, N/m. Soft relative to the
 * environment, per the SEA design point. */
export const SEA_SPRING_STIFFNESS_N_PER_M = 800;

/** Effective moving mass at the contact, kg. */
export const EFFECTIVE_MASS_KG = 4;

/** The object's crush limit readout line, N. */
export const CRUSH_LIMIT_N = 25;

export interface LabParams {
  /** Commanded penetration depth d, m (the slider). */
  depthM: number;
  /** Desired stiffness K, N/m (the slider). */
  stiffnessKNPerM: number;
  /** Desired damping D, N·s/m (the slider). */
  dampingNPerM: number;
  /** Hardware selection. */
  hardware: HardwareMode;
}

export const DEFAULT_PARAMS: LabParams = {
  depthM: 0.002,
  stiffnessKNPerM: 800,
  dampingNPerM: 40,
  hardware: 'torque',
};

/** Effective contact stiffness for a mode: the environment alone, or the
 * environment series-combined with the SEA spring. */
export function effectiveStiffness(hardware: HardwareMode): number {
  if (hardware !== 'sea') return ENVIRONMENT_STIFFNESS_N_PER_M;
  const ke = ENVIRONMENT_STIFFNESS_N_PER_M;
  const ks = SEA_SPRING_STIFFNESS_N_PER_M;
  return 1 / (1 / ke + 1 / ks);
}

export interface ContactState {
  /** Actual penetration into the surface, m (x > 0 inside). */
  x: number;
  /** Penetration rate, m/s. */
  xDot: number;
  /** Simulated seconds. */
  t: number;
}

export interface ContactStep {
  state: ContactState;
  /** Contact force this instant, N (>= 0; zero off the surface). */
  forceN: number;
}

/** Steady-state contact force for the mode, N. The impedance equilibrium
 * balances the commanded spring against the environment spring, so
 * F* = k_eff * K * d / (k_eff + K), which for a stiff environment is
 * close to K * d: the programmer's stiffness, not the environment's,
 * sets the steady force. That is the point of impedance control. The SEA
 * spring enters through the series-combined k_eff. Position mode is
 * unbounded by construction (the arm enforces the commanded position
 * against the surface, and the force is whatever the geometry error
 * gives). */
export function steadyStateForce(params: LabParams): number {
  const kEff = effectiveStiffness(params.hardware);
  return (kEff * params.stiffnessKNPerM * params.depthM) / (kEff + params.stiffnessKNPerM);
}

/** Advance one fixed physics substep. Semi-implicit Euler: update the rate
 * from the force, then the position from the new rate. The commanded
 * impedance applies only while in contact (x > 0); off the surface the
 * arm accelerates freely toward the commanded depth. */
function step(state: ContactState, params: LabParams, dt: number): ContactState {
  const kEff = effectiveStiffness(params.hardware);
  const inContact = state.x > 0;
  let force = 0;
  let accel = 0;
  if (inContact) {
    force = kEff * state.x;
    // Impedance law: the commanded spring-damper pushes back against the
    // penetration relative to the commanded depth.
    const restore = params.stiffnessKNPerM * (params.depthM - state.x) - params.dampingNPerM * state.xDot;
    accel = (restore - force) / EFFECTIVE_MASS_KG;
  } else {
    // Free space: drive toward the commanded depth with the same desired
    // impedance acting as the motion controller.
    const restore = params.stiffnessKNPerM * (params.depthM - state.x) - params.dampingNPerM * state.xDot;
    accel = restore / EFFECTIVE_MASS_KG;
  }
  const xDot = state.xDot + accel * dt;
  const x = state.x + xDot * dt;
  return { x, xDot, t: state.t + dt };
}

export interface ContactRun {
  steps: ContactStep[];
  /** Peak contact force over the run, N. */
  peakForceN: number;
  /** Steady-state (settled) force, N. */
  steadyForceN: number;
}

/** Simulate the contact from a fresh approach for a fixed horizon.
 * Deterministic: fixed substep count and dt. */
export function simulateContact(params: LabParams): ContactRun {
  const dt = 0.0002;
  const steps = Math.round(0.6 / dt);
  const kEff = effectiveStiffness(params.hardware);
  // Start just off the surface, at rest.
  let state: ContactState = { x: -0.0005, xDot: 0, t: 0 };
  const trace: ContactStep[] = [];
  let peak = 0;
  for (let i = 0; i < steps; i++) {
    const force = state.x > 0 ? kEff * state.x : 0;
    if (force > peak) peak = force;
    if (i % 5 === 0) trace.push({ state, forceN: force });
    state = step(state, params, dt);
  }
  return {
    steps: trace,
    peakForceN: peak,
    steadyForceN: steadyStateForce(params),
  };
}

export type TaskOutcome = 'success' | 'crushed' | 'over-limit' | 'unbounded';

/** Classify the outcome for a run. Position mode is unbounded by
 * construction; otherwise the object crushes if the steady force exceeds
 * the crush limit, or the contact exceeds the transient limit if the peak
 * does, and only a run inside both succeeds. */
export function classifyOutcome(params: LabParams, run: ContactRun): TaskOutcome {
  if (params.hardware === 'position') return 'unbounded';
  if (run.peakForceN > TRANSIENT_CONTACT_LIMIT_N) return 'over-limit';
  if (run.steadyForceN > CRUSH_LIMIT_N) return 'crushed';
  return 'success';
}

/** Slider specs, shared by the component and the tests. */
export const SLIDER_SPECS = {
  depth: { min: 0.0005, max: 0.006, step: 0.0005 },
  stiffness: { min: 100, max: 20000, step: 100 },
  damping: { min: 0, max: 400, step: 10 },
} as const;
