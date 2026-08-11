/**
 * Inverted-pendulum dynamics and PID control for the control module's
 * interactive. Pure functions, unit-tested in tests/unit/pendulum.test.ts.
 *
 * The plant is a torque-actuated inverted pendulum on a fixed pivot: a
 * point mass on a massless rod, angle theta measured from the upright
 * (unstable) equilibrium, so theta = 0 is balanced and |theta| = pi hangs
 * straight down. A small constant bias torque (an off-center payload)
 * gives the integral term something real to correct: a pure PD loop
 * settles with a steady lean into the bias, and adding Ki removes it.
 *
 * Equation of motion (point mass m on a rod of length l):
 *
 *   theta_ddot = (g / l) * sin(theta) + (u + biasTorque) / (m * l^2)
 *
 * Control law (error = theta, setpoint upright):
 *
 *   u = -(Kp * theta + Kd * theta_dot + Ki * integral),  integral' = theta
 *
 * The actuator saturates at +/- torqueLimit and the integral state clamps
 * at +/- integralLimit (anti-windup). Linearizing about upright shows the
 * stabilizing threshold the interactive demonstrates: with m = l = 1 the
 * pole can only be held when Kp > m*g*l = 9.81.
 *
 * There is no randomness anywhere: a given initial state, gain set, and
 * step count always produce the identical trajectory, so Reset restores a
 * perfectly reproducible run.
 *
 * References: the pendulum balance problem and its LQR treatment are
 * chapters 2-3 of Tedrake's Underactuated Robotics
 * (https://underactuated.mit.edu/pend.html); the PID structure and the
 * state-feedback theory are Astrom and Murray, Feedback Systems, chapters
 * 1, 10-11 and 7 (https://fbsbook.org/).
 */

export interface PendulumParams {
  /** Point mass at the rod tip, kg. */
  massKg: number;
  /** Rod length, m. */
  lengthM: number;
  /** Gravitational acceleration, m/s^2. */
  gravity: number;
  /** Constant disturbance torque, N*m (the off-center payload). */
  biasTorque: number;
  /** Actuator saturation: |u| <= torqueLimit, N*m. */
  torqueLimit: number;
  /** Anti-windup clamp on the integral state, |z| <= integralLimit. */
  integralLimit: number;
}

export interface PidGains {
  /** Proportional gain, N*m per radian. */
  kp: number;
  /** Integral gain, N*m per radian-second. */
  ki: number;
  /** Derivative gain, N*m per radian/second. */
  kd: number;
}

export interface PendulumState {
  /** Angle from upright, radians, wrapped to (-pi, pi]. 0 is balanced. */
  theta: number;
  /** Angular velocity, rad/s. */
  thetaDot: number;
  /** Integral of theta over time (the PID integral state). */
  integral: number;
  /** Elapsed simulation time, seconds. */
  t: number;
}

export type Stability = 'settled' | 'settling' | 'oscillating' | 'fallen';

export const PENDULUM_PARAMS: PendulumParams = {
  massKg: 1,
  lengthM: 1,
  gravity: 9.81,
  biasTorque: 0.8,
  torqueLimit: 40,
  integralLimit: 1.5,
};

/** Stable but visibly underdamped defaults: a few swings, then a lean. */
export const DEFAULT_GAINS: PidGains = { kp: 25, ki: 0, kd: 3 };

/** Release the pole 12 degrees off vertical so the loop has work to do. */
export const INITIAL_STATE: PendulumState = {
  theta: (12 * Math.PI) / 180,
  thetaDot: 0,
  integral: 0,
  t: 0,
};

/** Fixed angular-velocity impulse applied by the Push control, rad/s. */
export const PUSH_IMPULSE = 2;

/** Physics substep, seconds. Semi-implicit Euler is stable here. */
export const PHYSICS_DT = 1 / 480;

const FALL_RAD = (60 * Math.PI) / 180;
const OSCILLATION_RAD = (8 * Math.PI) / 180;
const SETTLED_RAD = (1 * Math.PI) / 180;

export interface GainSpec {
  id: keyof PidGains;
  /** KaTeX-free symbol for the slider label. */
  symbol: string;
  name: string;
  min: number;
  max: number;
  step: number;
  /** One line on what moving this slider demonstrates. */
  hint: string;
}

export const GAIN_SPECS: GainSpec[] = [
  {
    id: 'kp',
    symbol: 'Kp',
    name: 'Proportional gain',
    min: 0,
    max: 40,
    step: 0.5,
    hint: 'Below 9.81 the pole cannot be held up at all.',
  },
  {
    id: 'ki',
    symbol: 'Ki',
    name: 'Integral gain',
    min: 0,
    max: 20,
    step: 0.5,
    hint: 'Removes the steady lean left by the offset payload.',
  },
  {
    id: 'kd',
    symbol: 'Kd',
    name: 'Derivative gain',
    min: 0,
    max: 10,
    step: 0.1,
    hint: 'Damping. Near zero, the pole rings instead of settling.',
  },
];

function wrapPi(theta: number): number {
  const twoPi = 2 * Math.PI;
  const wrapped = ((theta + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** Saturating PID torque for the current state. */
export function controlTorque(
  state: PendulumState,
  gains: PidGains,
  params: PendulumParams,
): number {
  const raw = -(
    gains.kp * state.theta +
    gains.kd * state.thetaDot +
    gains.ki * state.integral
  );
  return Math.max(-params.torqueLimit, Math.min(params.torqueLimit, raw));
}

/**
 * One semi-implicit Euler step of size dt: velocity updates from the
 * current acceleration, position from the new velocity. Theta wraps into
 * (-pi, pi] so a pole that goes over reads as hanging down, not spinning
 * through ever-growing angles.
 */
export function stepPendulum(
  state: PendulumState,
  gains: PidGains,
  params: PendulumParams,
  dt: number,
): PendulumState {
  const u = controlTorque(state, gains, params);
  const inertia = params.massKg * params.lengthM * params.lengthM;
  const thetaDdot =
    (params.gravity / params.lengthM) * Math.sin(state.theta) +
    (u + params.biasTorque) / inertia;
  const thetaDot = state.thetaDot + thetaDdot * dt;
  const theta = wrapPi(state.theta + thetaDot * dt);
  const integral = Math.max(
    -params.integralLimit,
    Math.min(params.integralLimit, state.integral + state.theta * dt),
  );
  return { theta, thetaDot, integral, t: state.t + dt };
}

/**
 * Advance by `simSeconds` of simulated time using fixed PHYSICS_DT
 * substeps, so the trajectory is identical regardless of how the caller
 * chunks time into ticks.
 */
export function advancePendulum(
  state: PendulumState,
  gains: PidGains,
  params: PendulumParams,
  simSeconds: number,
): PendulumState {
  const steps = Math.round(simSeconds / PHYSICS_DT);
  let s = state;
  for (let i = 0; i < steps; i += 1) {
    s = stepPendulum(s, gains, params, PHYSICS_DT);
  }
  return s;
}

/**
 * Simulate from the release state under constant gains for `seconds`,
 * returning every physics state. Used by the unit tests; the component
 * drives the same stepping through advancePendulum.
 */
export function simulate(gains: PidGains, seconds: number): PendulumState[] {
  const states: PendulumState[] = [INITIAL_STATE];
  const steps = Math.round(seconds / PHYSICS_DT);
  let s = INITIAL_STATE;
  for (let i = 0; i < steps; i += 1) {
    s = stepPendulum(s, gains, PENDULUM_PARAMS, PHYSICS_DT);
    states.push(s);
  }
  return states;
}

/** The Push control: a fixed angular-velocity kick, position unchanged. */
export function applyPush(state: PendulumState): PendulumState {
  return { ...state, thetaDot: state.thetaDot + PUSH_IMPULSE };
}

/**
 * Qualitative regime of a recent run of states, classified on the trailing
 * window the caller passes (the component keeps roughly the last 2 s):
 * fallen once the pole is past 60 degrees from upright, oscillating while
 * the window's peak-to-peak swing exceeds 8 degrees, settled when it is
 * under 1 degree, and settling in between.
 *
 * "Settled" additionally requires the window to span at least
 * MIN_SETTLE_SPAN_S: a window that has barely started filling (the first
 * ticks after Run) has near-zero swing by construction, and the pole is
 * mid-recovery, not settled.
 */
export const MIN_SETTLE_SPAN_S = 1.5;

export function classifyStability(states: PendulumState[]): Stability {
  const last = states.at(-1);
  const first = states[0];
  if (!last || !first) return 'settling';
  if (Math.abs(last.theta) > FALL_RAD) return 'fallen';
  let min = Infinity;
  let max = -Infinity;
  for (const s of states) {
    if (s.theta < min) min = s.theta;
    if (s.theta > max) max = s.theta;
  }
  const peakToPeak = max - min;
  if (peakToPeak > OSCILLATION_RAD) return 'oscillating';
  if (peakToPeak <= SETTLED_RAD) {
    return last.t - first.t >= MIN_SETTLE_SPAN_S ? 'settled' : 'settling';
  }
  return 'settling';
}

/** Rod tip in SVG coordinates: theta = 0 points straight up from the pivot. */
export function tipPosition(
  theta: number,
  lengthPx: number,
  pivot: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: pivot.x + lengthPx * Math.sin(theta),
    y: pivot.y - lengthPx * Math.cos(theta),
  };
}

export interface PlaybackCadence {
  tickMs: number;
  simSecondsPerTick: number;
}

/**
 * Playback cadence. Normal playback advances in small real-time steps so
 * the swing reads as continuous motion; under prefers-reduced-motion the
 * sim advances the same rate in coarse discrete jumps, so every regime is
 * still reachable without sustained animation.
 */
export function playbackCadence(reducedMotion: boolean): PlaybackCadence {
  return reducedMotion
    ? { tickMs: 320, simSecondsPerTick: 0.32 }
    : { tickMs: 33, simSecondsPerTick: 0.033 };
}

/** Angle readout formatting: signed degrees, one decimal. */
export function formatDeg(radians: number): string {
  const deg = (radians * 180) / Math.PI;
  return `${deg >= 0 ? '+' : ''}${deg.toFixed(1)}`;
}
