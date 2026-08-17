/**
 * Reward-shaping model for the reward-design-mpc module.
 *
 * A production locomotion reward is a weighted sum of a dozen-plus
 * hand-tuned terms whose weights interact. This model holds the canonical
 * legged_gym-family term set, computes the weighted total shown in the
 * interactive, classifies a weight configuration into the three classic
 * failure attractors (freeze, prance, chatter), and produces the stick
 * quadruped pose for the behavior preview.
 *
 * The classification thresholds and per-term magnitudes are an
 * illustrative teaching model, not measured simulator output; the
 * surrounding prose says so. Pure functions only; the component and the
 * tests share this model.
 */
import { GAITS, LEGS, legPhase, type LegId } from './gait';

export type TermId =
  | 'velTrack'
  | 'yawTrack'
  | 'torque'
  | 'jointAccel'
  | 'actionRate'
  | 'jointLimit'
  | 'collision'
  | 'baseHeight'
  | 'orientation'
  | 'airTime'
  | 'stumble'
  | 'termination';

export interface RewardTerm {
  id: TermId;
  /** Slider label; also the accessible name of the control. */
  label: string;
  /** Reward terms add to the total, penalties subtract. */
  sign: 1 | -1;
  /** Typical per-step magnitude of the unweighted term (illustrative). */
  magnitude: number;
  defaultWeight: number;
  /** One line on what the term is for. */
  blurb: string;
}

export const TERMS: RewardTerm[] = [
  {
    id: 'velTrack',
    label: 'Linear velocity tracking',
    sign: 1,
    magnitude: 1.0,
    defaultWeight: 1.0,
    blurb: 'Follow the commanded forward velocity. The task itself.',
  },
  {
    id: 'yawTrack',
    label: 'Yaw rate tracking',
    sign: 1,
    magnitude: 0.5,
    defaultWeight: 0.5,
    blurb: 'Follow the commanded turn rate.',
  },
  {
    id: 'torque',
    label: 'Torque penalty',
    sign: -1,
    magnitude: 1.0,
    defaultWeight: 0.8,
    blurb: 'Discourage large joint torques; saves the actuators.',
  },
  {
    id: 'jointAccel',
    label: 'Joint acceleration penalty',
    sign: -1,
    magnitude: 0.5,
    defaultWeight: 0.5,
    blurb: 'Smooths the motion by pricing jerky joints.',
  },
  {
    id: 'actionRate',
    label: 'Action-rate penalty',
    sign: -1,
    magnitude: 1.0,
    defaultWeight: 0.8,
    blurb: 'Penalizes step-to-step action changes; suppresses chatter.',
  },
  {
    id: 'jointLimit',
    label: 'Joint limit penalty',
    sign: -1,
    magnitude: 1.0,
    defaultWeight: 1.0,
    blurb: 'Keeps joints off their mechanical stops.',
  },
  {
    id: 'collision',
    label: 'Collision penalty',
    sign: -1,
    magnitude: 1.0,
    defaultWeight: 1.0,
    blurb: 'Penalizes contact on bodies that should never touch.',
  },
  {
    id: 'baseHeight',
    label: 'Base height',
    sign: 1,
    magnitude: 0.5,
    defaultWeight: 0.5,
    blurb: 'Holds the torso near a target height.',
  },
  {
    id: 'orientation',
    label: 'Orientation penalty',
    sign: -1,
    magnitude: 0.8,
    defaultWeight: 0.8,
    blurb: 'Penalizes roll and pitch away from level.',
  },
  {
    id: 'airTime',
    label: 'Foot air time',
    sign: 1,
    magnitude: 0.6,
    defaultWeight: 0.6,
    blurb: 'Rewards swing time per step; induces a gait instead of shuffling.',
  },
  {
    // Mirrors legged_gym's feet_stumble term, which fires when a foot's
    // horizontal contact force dominates the vertical one (catching a wall
    // or stair edge mid-stride).
    id: 'stumble',
    label: 'Foot stumble penalty',
    sign: -1,
    magnitude: 0.8,
    defaultWeight: 0.8,
    blurb: 'Penalizes feet catching vertical surfaces mid-stride.',
  },
  {
    id: 'termination',
    label: 'Termination penalty',
    sign: -1,
    magnitude: 1.5,
    defaultWeight: 1.5,
    blurb: 'Falling over ends the episode at a cost.',
  },
];

export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 4;
/** Slider granularity: weights move in tenths. */
export const WEIGHT_STEP = 0.1;

export type Weights = Record<TermId, number>;

export function defaultWeights(): Weights {
  return Object.fromEntries(
    TERMS.map((t) => [t.id, t.defaultWeight]),
  ) as Weights;
}

/** Signed contribution of one term at a given weight. */
export function termContribution(term: RewardTerm, weight: number): number {
  return term.sign * term.magnitude * weight;
}

/** The weighted total the policy actually maximizes, per step. */
export function weightedTotal(weights: Weights): number {
  const total = TERMS.reduce(
    (sum, t) => sum + termContribution(t, weights[t.id]),
    0,
  );
  // Round to cents so SSR HTML and client hydration serialize identically.
  return Number(total.toFixed(2));
}

export function formatWeight(w: number): string {
  return w.toFixed(1);
}

export function formatTotal(total: number): string {
  const rounded = total.toFixed(2);
  return total > 0 ? `+${rounded}` : rounded;
}

export type BehaviorId = 'balanced' | 'frozen' | 'prancing' | 'chatter';

export interface Behavior {
  id: BehaviorId;
  /** Short display name. */
  name: string;
  /** One-line status readout. */
  status: string;
  tone: 'ok' | 'warn' | 'err';
  /** Why this configuration produces this behavior. */
  description: string;
}

export const BEHAVIORS: Record<BehaviorId, Behavior> = {
  balanced: {
    id: 'balanced',
    name: 'balanced trot',
    status: 'balanced gait',
    tone: 'ok',
    description:
      'No single term dominates. The policy tracks the velocity command with a proper trot because every penalty stays cheap relative to the task reward.',
  },
  frozen: {
    id: 'frozen',
    name: 'freeze attractor',
    status: 'failure attractor: freeze',
    tone: 'err',
    description:
      'The torque penalty outweighs the velocity reward, so the optimal policy is to stand still: any motion costs more torque than the tracking reward pays back. The robot accepts the tracking penalty and does nothing.',
  },
  prancing: {
    id: 'prancing',
    name: 'prance attractor',
    status: 'failure attractor: prance',
    tone: 'err',
    description:
      'The foot air time reward outweighs the velocity reward, so the policy maximizes swing time by bouncing in place. Spectacular air time, zero forward progress.',
  },
  chatter: {
    id: 'chatter',
    name: 'chatter attractor',
    status: 'failure attractor: chatter',
    tone: 'err',
    description:
      'With almost no action-rate penalty, nothing prices step-to-step action changes. The policy vibrates the joints at control frequency, a motion that would destroy a real actuator within minutes.',
  },
};

/**
 * Thresholds for the three failure attractors, checked in priority order.
 * Chatter wins ties: an unpenalized action rate corrupts every other
 * behavior at the actuator level. Freeze and prance require the offending
 * term to both clear an absolute bar and dominate the velocity reward.
 */
const CHATTER_ACTION_RATE_MAX = 0.2;
const ATTRACTOR_WEIGHT_MIN = 2.5;
const ATTRACTOR_DOMINANCE_RATIO = 2;

export function classifyBehavior(w: Weights): BehaviorId {
  if (w.actionRate <= CHATTER_ACTION_RATE_MAX) return 'chatter';
  if (
    w.torque >= ATTRACTOR_WEIGHT_MIN &&
    w.torque >= ATTRACTOR_DOMINANCE_RATIO * w.velTrack
  ) {
    return 'frozen';
  }
  if (
    w.airTime >= ATTRACTOR_WEIGHT_MIN &&
    w.airTime >= ATTRACTOR_DOMINANCE_RATIO * w.velTrack
  ) {
    return 'prancing';
  }
  return 'balanced';
}

/* ------------------------------------------------------------------ */
/* Behavior preview geometry                                           */
/* ------------------------------------------------------------------ */

/** Horizontal travel of a foot over one stride, in preview pixels. */
export const STRIDE_PX = 26;
/** Peak foot lift during swing, in preview pixels. */
export const LIFT_PX = 12;
/** Chatter vibration amplitude, in preview pixels. */
export const CHATTER_AMPLITUDE = 3;
/** Chatter cycles per nominal stride cycle. */
export const CHATTER_CYCLES = 8;
/** Prance bounce amplitude, in preview pixels. */
export const PRANCE_LIFT_PX = 14;

export interface LegPose {
  /** Horizontal foot offset from directly below the hip. */
  footDx: number;
  /** Foot height above the ground line. */
  footDy: number;
}

export interface QuadPose {
  /** Vertical body offset from neutral (negative is up). */
  bodyY: number;
  legs: Record<LegId, LegPose>;
  /** Scroll offset of the ground ticks; only a moving robot scrolls ground. */
  groundOffset: number;
}

const TROT = GAITS.trot;

/** Trot foot position at one phase: stance sweeps back, swing lifts forward. */
function trotLeg(leg: LegId, phase: number): LegPose {
  const lp = legPhase(TROT, leg, phase);
  if (lp < TROT.dutyFactor) {
    const s = lp / TROT.dutyFactor;
    return { footDx: STRIDE_PX / 2 - s * STRIDE_PX, footDy: 0 };
  }
  const s = (lp - TROT.dutyFactor) / (1 - TROT.dutyFactor);
  return {
    footDx: -STRIDE_PX / 2 + s * STRIDE_PX,
    footDy: Math.sin(Math.PI * s) * LIFT_PX,
  };
}

function sameLeg(pose: LegPose): Record<LegId, LegPose> {
  return Object.fromEntries(LEGS.map((l) => [l.id, pose])) as Record<
    LegId,
    LegPose
  >;
}

const FROZEN_POSE: QuadPose = {
  bodyY: 0,
  legs: sameLeg({ footDx: 0, footDy: 0 }),
  groundOffset: 0,
};

/**
 * Pose of the preview quadruped for a behavior at a cycle phase in [0, 1).
 * Deterministic; the frozen attractor is constant in phase by construction.
 */
export function quadrupedPose(behavior: BehaviorId, phase: number): QuadPose {
  const p = ((phase % 1) + 1) % 1;
  switch (behavior) {
    case 'frozen':
      return FROZEN_POSE;
    case 'balanced':
      return {
        bodyY: 0,
        legs: Object.fromEntries(
          LEGS.map((l) => [l.id, trotLeg(l.id, p)]),
        ) as Record<LegId, LegPose>,
        groundOffset: Number((p * STRIDE_PX).toFixed(2)),
      };
    case 'prancing': {
      const lift = Math.max(0, Math.sin(2 * Math.PI * p)) * PRANCE_LIFT_PX;
      return {
        bodyY: Number((-lift * 0.6).toFixed(2)),
        legs: sameLeg({
          footDx: 0,
          footDy: Number(lift.toFixed(2)),
        }),
        groundOffset: 0,
      };
    }
    case 'chatter': {
      const legs = Object.fromEntries(
        LEGS.map((l, i) => {
          const sign = i % 2 === 0 ? 1 : -1;
          const wave = Math.sin(2 * Math.PI * p * CHATTER_CYCLES);
          return [
            l.id,
            {
              footDx: Number((sign * wave * CHATTER_AMPLITUDE).toFixed(2)),
              footDy: Number(
                (Math.abs(wave) * CHATTER_AMPLITUDE * 0.5).toFixed(2),
              ),
            },
          ];
        }),
      ) as Record<LegId, LegPose>;
      return {
        bodyY: Number(
          (Math.sin(2 * Math.PI * p * CHATTER_CYCLES * 2) * 0.8).toFixed(2),
        ),
        legs,
        groundOffset: 0,
      };
    }
  }
}

/** Interval playback cadence, matching the gait-diagram convention. */
export function playbackCadence(reducedMotion: boolean): {
  tickMs: number;
  phasePerTick: number;
} {
  return reducedMotion
    ? { tickMs: 200, phasePerTick: 0.125 }
    : { tickMs: 50, phasePerTick: 0.02 };
}
