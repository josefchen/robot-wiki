/**
 * Collaborative-operation model for the frontier safety module's
 * instrument. Pure functions, unit-tested in
 * tests/unit/safety-modes.test.ts.
 *
 * HONESTY CEILING (binding, and it shapes every constant below).
 * ISO/TS 15066 is paywalled and this project does not purchase standards,
 * so nothing here quotes or paraphrases a clause, table or numeric limit
 * from the technical specification itself. Every equation and every
 * traceable constant comes from Marvel and Norcross, "Implementing speed
 * and separation monitoring in collaborative robot workcells" (Robotics
 * and Computer-Integrated Manufacturing, 2017,
 * doi:10.1016/j.rcim.2016.08.001), a NIST paper published open access,
 * which restates the separation model and its terms in public. Constants
 * that paper does NOT supply are marked `modelled` in the term list the
 * component renders, so a reader can tell a sourced number from a chosen
 * one at a glance.
 *
 * The separation model is the linear form Marvel and Norcross print as
 * their Eq. 3, the early-draft approximation they reproduce alongside the
 * integral form:
 *
 *   S = (v_H * T_R + v_H * T_S) + (v_R * T_R) + B + (C + Z_R + Z_S)
 *
 * where v_H is the operator's directed approach speed, v_R the robot's
 * directed speed toward the operator, T_R the safety system's reaction
 * time, T_S the time to bring the robot to a controlled stop, B the
 * distance the robot covers while braking, C an intrusion-distance safety
 * margin, and Z_R, Z_S the robot and operator position uncertainties.
 *
 * The contact-force half never recomputes the limit: it imports the
 * rendered limit string from lib/force-limits, the same module the
 * impedance lab on /classical/control renders, so the two pages cannot
 * drift (VAL-FRONT-029).
 */

import {
  TRANSIENT_CONTACT_LIMIT_LABEL,
  TRANSIENT_CONTACT_LIMIT_N,
} from '@/lib/force-limits';

export type ModeId =
  | 'monitored-stop'
  | 'hand-guiding'
  | 'speed-separation'
  | 'power-force';

export interface CollaborativeMode {
  id: ModeId;
  /** Display name as the literature writes it. */
  name: string;
  /** Short mono label for the selector button. */
  short: string;
  /**
   * What the mode actually constrains, in one sentence. The monitored-stop
   * and hand-guiding modes have no separation distance and no force
   * budget, so their constraint is stated rather than computed, which is
   * the honest rendering of a mode whose rule is procedural.
   */
  constraint: string;
  /** Which quantity the readout shows for this mode. */
  readout: 'separation' | 'force' | 'stated';
}

export const MODES: readonly CollaborativeMode[] = [
  {
    id: 'monitored-stop',
    name: 'Safety-rated monitored stop',
    short: 'monitored stop',
    constraint:
      'The robot holds a monitored standstill whenever a person is inside the collaborative workspace, with power to the drives retained rather than removed, and motion may resume only once the person has left. There is no separation distance to compute and no contact budget to spend, because the mode permits no motion while the person is present.',
    readout: 'stated',
  },
  {
    id: 'hand-guiding',
    name: 'Hand guiding',
    short: 'hand guiding',
    constraint:
      'Motion is commanded directly by the operator through a hand-operated device at the end of the arm, so the robot moves only while a person is deliberately driving it. The constraint is on the control channel rather than on distance or force: the robot has no autonomous trajectory to be separated from.',
    readout: 'stated',
  },
  {
    id: 'speed-separation',
    name: 'Speed and separation monitoring',
    short: 'speed + separation',
    constraint:
      'The robot and the person may both move, and the safety system holds a protective separation distance between them that recomposes continuously from the robot speed, the operator approach speed and the system reaction time. Closing below it triggers a safety-rated stop.',
    readout: 'separation',
  },
  {
    id: 'power-force',
    name: 'Power and force limiting',
    short: 'power + force',
    constraint:
      'Contact between the robot and the person is permitted, and safety comes from bounding what the contact can do: the transient force of an impact is held under a biomechanical threshold stated per body region, so the collision happens but the injury does not.',
    readout: 'force',
  },
] as const;

export function modeById(id: ModeId): CollaborativeMode {
  const mode = MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`unknown collaborative mode: ${id}`);
  return mode;
}

/* ------------------------------------------------------------------ *
 * Separation model constants
 * ------------------------------------------------------------------ */

/**
 * Intrusion-distance safety margin C, in metres. Marvel and Norcross
 * reproduce the ISO 13855 decision table and give 850 mm for a normal
 * direction of approach protected by multiple separate beams; this is
 * that row. Sourced, not chosen.
 */
export const INTRUSION_MARGIN_M = 0.85;

/**
 * Robot deceleration used to derive the stopping time T_S and braking
 * distance B, in m/s^2. Marvel and Norcross work their update-rate
 * example with a robot at a constant acceleration rate of 10.0 m/s^2, and
 * this reuses that figure rather than inventing a braking profile. A real
 * cell measures T_S and B on the machine under test.
 */
export const ROBOT_DECELERATION_M_PER_S2 = 10;

/**
 * Safety-system reaction time T_R, in seconds. MODELLED. Marvel and
 * Norcross argue a 100 Hz update rate from the operator-locating sensor
 * is not unreasonable for even aged computer hardware; 0.1 s is one
 * update interval at that rate, used here as a round stand-in for the
 * detect-to-command latency a real integrator measures.
 */
export const REACTION_TIME_S = 0.1;

/**
 * Combined position uncertainty Z_R + Z_S, in metres. MODELLED. The
 * paper leaves both terms to the integrator and to the sensor's measured
 * accuracy, so no published value exists to import; 0.10 m keeps the term
 * visible in the composition rather than hiding it at zero.
 */
export const POSITION_UNCERTAINTY_M = 0.1;

/**
 * The geometric distance from the robot's tool centre point to where the
 * operator stands at the edge of the drawn workcell, in metres. This is
 * the diagram's own layout, not a standards quantity: it is the actual
 * separation that the computed protective distance is compared against.
 */
export const WORKCELL_SEPARATION_M = 1.6;

export const ROBOT_SPEED_RANGE = { min: 0, max: 2, step: 0.05 } as const;
export const HUMAN_SPEED_RANGE = { min: 0, max: 2, step: 0.05 } as const;

export const DEFAULT_MODE: ModeId = 'speed-separation';
export const DEFAULT_ROBOT_SPEED_M_S = 1;

/**
 * Default operator approach speed, m/s. Marvel and Norcross state that
 * v_H is assumed to be a worst-case maximum of 1600 mm/s from ISO 13855
 * when it is not measured directly, and that is this default.
 */
export const DEFAULT_HUMAN_SPEED_M_S = 1.6;

/* ------------------------------------------------------------------ *
 * Separation model
 * ------------------------------------------------------------------ */

/** Time to bring the robot to a controlled stop, T_S, in seconds. */
export function stoppingTimeS(robotSpeedMs: number): number {
  return robotSpeedMs / ROBOT_DECELERATION_M_PER_S2;
}

/** Distance the robot covers while braking, B, in metres. */
export function brakingDistanceM(robotSpeedMs: number): number {
  return (
    (robotSpeedMs * robotSpeedMs) / (2 * ROBOT_DECELERATION_M_PER_S2)
  );
}

export interface SeparationTerms {
  /** v_H * (T_R + T_S): the operator's travel while the robot stops. */
  humanTravelM: number;
  /** v_R * T_R: robot travel before braking begins. */
  robotReactionM: number;
  /** B: robot travel during braking. */
  brakingM: number;
  /** C + Z_R + Z_S: intrusion margin plus position uncertainty. */
  marginM: number;
  /** The sum, S. */
  totalM: number;
}

/**
 * The four bracketed groups of Marvel and Norcross's Eq. 3, kept apart
 * rather than summed early: the point of the instrument is that a reader
 * can watch which term grows when a slider moves.
 */
export function separationTerms(
  robotSpeedMs: number,
  humanSpeedMs: number,
): SeparationTerms {
  const ts = stoppingTimeS(robotSpeedMs);
  const humanTravelM = humanSpeedMs * (REACTION_TIME_S + ts);
  const robotReactionM = robotSpeedMs * REACTION_TIME_S;
  const brakingM = brakingDistanceM(robotSpeedMs);
  const marginM = INTRUSION_MARGIN_M + POSITION_UNCERTAINTY_M;
  return {
    humanTravelM,
    robotReactionM,
    brakingM,
    marginM,
    totalM: humanTravelM + robotReactionM + brakingM + marginM,
  };
}

/** The protective separation distance S, in metres. */
export function protectiveSeparationM(
  robotSpeedMs: number,
  humanSpeedMs: number,
): number {
  return separationTerms(robotSpeedMs, humanSpeedMs).totalM;
}

/**
 * The fastest robot speed whose protective separation distance still fits
 * inside the drawn workcell, in m/s.
 *
 * S is quadratic in v_R with all-positive coefficients, so inverting it is
 * the positive root of
 *
 *   v^2 / (2a) + (v_H / a + T_R) v + (C + Z - separation) = 0.
 *
 * Returns 0 when even a stationary robot violates the distance, which is
 * the honest answer: the margin terms alone already exceed the cell, and
 * speed-and-separation monitoring cannot be used in that geometry at all.
 */
export function permittedRobotSpeedMs(
  humanSpeedMs: number,
  separationM: number = WORKCELL_SEPARATION_M,
): number {
  const a = ROBOT_DECELERATION_M_PER_S2;
  const quad = 1 / (2 * a);
  const lin = humanSpeedMs / a + REACTION_TIME_S;
  const constant =
    INTRUSION_MARGIN_M +
    POSITION_UNCERTAINTY_M +
    humanSpeedMs * REACTION_TIME_S -
    separationM;
  if (constant >= 0) return 0;
  const disc = lin * lin - 4 * quad * constant;
  const root = (-lin + Math.sqrt(disc)) / (2 * quad);
  return Math.max(0, root);
}

/* ------------------------------------------------------------------ *
 * Contact-force model
 * ------------------------------------------------------------------ */

/**
 * Effective moving mass at the contact, kg. MODELLED, and deliberately
 * the same 4 kg the impedance lab on /classical/control uses for its
 * contact plant, so the two instruments describe one machine rather than
 * two.
 */
export const CONTACT_EFFECTIVE_MASS_KG = 4;

/**
 * Contact stiffness of the struck body region, N/m. MODELLED. Han and
 * colleagues report force thresholds rather than stiffnesses, so no
 * published figure backs this one; it is chosen to put the limit crossing
 * inside the slider's range so a reader can find it.
 */
export const BODY_CONTACT_STIFFNESS_N_PER_M = 25000;

/**
 * Peak transient contact force for an impact at this speed, N.
 *
 * Energy balance for a mass meeting a linear contact spring: all the
 * kinetic energy (1/2) m v^2 goes into the spring at (1/2) F^2 / k, so
 * F = v * sqrt(k m). This is the textbook first-order impact estimate,
 * not a measurement, and the component labels it as modelled.
 */
export function peakContactForceN(robotSpeedMs: number): number {
  return (
    robotSpeedMs *
    Math.sqrt(BODY_CONTACT_STIFFNESS_N_PER_M * CONTACT_EFFECTIVE_MASS_KG)
  );
}

/**
 * The fastest robot speed whose peak transient contact force stays under
 * the shared limit, m/s. Inverts peakContactForceN against the limit
 * imported from lib/force-limits, never against a local copy of it.
 */
export function forceLimitedSpeedMs(): number {
  return (
    TRANSIENT_CONTACT_LIMIT_N /
    Math.sqrt(BODY_CONTACT_STIFFNESS_N_PER_M * CONTACT_EFFECTIVE_MASS_KG)
  );
}

/* ------------------------------------------------------------------ *
 * Verdict
 * ------------------------------------------------------------------ */

export interface Verdict {
  /** True when S fits inside the drawn workcell separation. */
  separationSatisfied: boolean;
  /** True when the peak transient force stays under the shared limit. */
  forceSatisfied: boolean;
  /** Ids of the modes this speed pair could legally run under. */
  satisfiedModes: ModeId[];
  /** One sentence naming what the current settings do and do not permit. */
  summary: string;
}

/**
 * Which modes the current settings satisfy.
 *
 * Monitored stop and hand guiding are always in the satisfied set, and
 * that is the substantive claim rather than a default: neither mode
 * permits autonomous motion beside a person, so no speed setting can
 * violate them. They are the fallback the other two modes fall back TO.
 */
export function verdict(
  robotSpeedMs: number,
  humanSpeedMs: number,
  separationM: number = WORKCELL_SEPARATION_M,
): Verdict {
  const s = protectiveSeparationM(robotSpeedMs, humanSpeedMs);
  const separationSatisfied = s <= separationM;
  const forceSatisfied = peakContactForceN(robotSpeedMs) <= TRANSIENT_CONTACT_LIMIT_N;
  const satisfiedModes: ModeId[] = ['monitored-stop', 'hand-guiding'];
  if (separationSatisfied) satisfiedModes.push('speed-separation');
  if (forceSatisfied) satisfiedModes.push('power-force');

  let summary: string;
  if (separationSatisfied && forceSatisfied) {
    summary =
      'Both continuous-motion modes are available at these speeds: the protective separation distance fits inside the cell, and an impact would land under the contact-force limit.';
  } else if (separationSatisfied) {
    summary =
      'Speed and separation monitoring is available at these speeds, but power and force limiting is not: an impact at this robot speed would exceed the contact-force limit, so contact must be prevented rather than survived.';
  } else if (forceSatisfied) {
    summary =
      'Power and force limiting is available at these speeds, but speed and separation monitoring is not: the protective separation distance no longer fits inside the cell, so the robot has to be allowed to touch the operator rather than kept away from them.';
  } else {
    summary =
      'Neither continuous-motion mode is available at these speeds. The protective separation distance overruns the cell and an impact would exceed the contact-force limit, which leaves a monitored stop or hand guiding as the only options.';
  }
  return { separationSatisfied, forceSatisfied, satisfiedModes, summary };
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function formatMetres(m: number): string {
  return `${m.toFixed(2)} m`;
}

export function formatSpeed(v: number): string {
  return `${v.toFixed(2)} m/s`;
}

export function formatForce(n: number): string {
  return `${Math.round(n)} N`;
}

/**
 * The contact-force limit label, re-exported rather than re-stated. Any
 * component rendering this module's force half renders THIS string, which
 * is the same string the impedance lab renders, so VAL-FRONT-029's
 * character-for-character match holds by construction rather than by
 * two authors agreeing.
 */
export const CONTACT_LIMIT_LABEL = TRANSIENT_CONTACT_LIMIT_LABEL;
export const CONTACT_LIMIT_N = TRANSIENT_CONTACT_LIMIT_N;
