/**
 * Learning-vs-MPC comparison model for the reward-design-mpc module.
 *
 * One quadruped, two controllers, and a set of perturbations. The
 * model-based controller (iLQR whole-body MPC in the style of Zhang et
 * al., ICRA 2026) re-solves against the measured state every step; the
 * learned policy answers with one forward pass. They fail differently,
 * and the failure modes are the argument: MPC degrades when the model is
 * wrong, the policy degrades outside its randomization distribution.
 *
 * Traces are base-height deviation in centimeters over control steps,
 * an illustrative teaching model rather than measured hardware data;
 * the UI labels it as such. Pure data and helpers only.
 */

export type ControllerId = 'mpc' | 'rl';
export type ResponseStatus = 'recovers' | 'degraded' | 'falls';

export interface ControllerResponse {
  status: ResponseStatus;
  /** Base-height deviation in cm, one value per control step. */
  trace: number[];
  /** Why the controller responds this way. */
  annotation: string;
}

export interface Perturbation {
  id: string;
  /** Button label. */
  label: string;
  mpc: ControllerResponse;
  rl: ControllerResponse;
}

export const TRACE_STEPS = 40;
/** Control step at which the perturbation lands. */
export const APPLY_STEP = 4;

export const CONTROLLERS: Record<
  ControllerId,
  { name: string; short: string; compute: string }
> = {
  mpc: {
    name: 'Model-based MPC (iLQR + MuJoCo)',
    short: 'MPC',
    compute: 're-solves iLQR against the current state at every control step',
  },
  rl: {
    name: 'Learned policy (sim RL)',
    short: 'RL policy',
    compute: 'one network forward pass, weights fixed at training',
  },
};

export const STATUS_META: Record<
  ResponseStatus,
  { label: string; tone: 'ok' | 'warn' | 'err' }
> = {
  recovers: { label: 'recovers', tone: 'ok' },
  degraded: { label: 'degraded', tone: 'warn' },
  falls: { label: 'falls', tone: 'err' },
};

function buildTrace(fn: (step: number) => number): number[] {
  return Array.from({ length: TRACE_STEPS }, (_, s) =>
    Number((s < APPLY_STEP ? 0 : fn(s - APPLY_STEP)).toFixed(2)),
  );
}

/** Clean exponential rejection: the modeled-disturbance signature. */
function expDecay(peak: number, timeConstant: number): number[] {
  return buildTrace((t) => peak * Math.exp(-t / timeConstant));
}

/** Damped oscillation: a learned recovery that was randomized over. */
function dampedOscillation(
  peak: number,
  timeConstant: number,
  period: number,
): number[] {
  return buildTrace(
    (t) => peak * Math.exp(-t / timeConstant) * Math.cos(t / period),
  );
}

export const PERTURBATIONS: Perturbation[] = [
  {
    id: 'push',
    label: 'lateral push',
    mpc: {
      status: 'recovers',
      trace: expDecay(6, 6),
      annotation:
        "The push is inside the model's assumptions, so the next re-solve finds a recovery inside the horizon. The deviation decays cleanly and no constraint is ever violated.",
    },
    rl: {
      status: 'recovers',
      trace: dampedOscillation(8, 10, 2.2),
      annotation:
        'Pushes were in the randomization distribution, so a recovery behavior is cached in the weights. It is sloppier: a damped oscillation instead of a clean decay.',
    },
  },
  {
    id: 'low-friction',
    label: 'low-friction patch',
    mpc: {
      status: 'falls',
      trace: buildTrace((t) => Math.min(24, 1.15 * t)),
      annotation:
        'The model assumes a friction coefficient the patch does not provide. The plan is feasible for the wrong floor, the feet slip, and re-solving against a wrong model cannot recover.',
    },
    rl: {
      status: 'recovers',
      trace: dampedOscillation(5.5, 9, 3),
      annotation:
        'Friction was randomized over a wide band at training time, so the patch is in-distribution. The policy absorbs it without ever knowing the coefficient.',
    },
  },
  {
    id: 'payload',
    label: '+5 kg payload',
    mpc: {
      status: 'degraded',
      trace: buildTrace((t) => 3.5 * (1 - Math.exp(-t / 5))),
      annotation:
        'The unmodeled mass biases every torque the optimizer computes. Nothing is violated, but a steady-state tracking error persists until the model is updated.',
    },
    rl: {
      status: 'recovers',
      trace: buildTrace((t) => 0.6 + 3.9 * Math.exp(-t / 8)),
      annotation:
        'Payload variation was randomized at training time. The base sags under the new mass, then re-stabilizes inside the learned margin.',
    },
  },
  {
    id: 'torque-limit',
    label: 'torque-limit cut',
    mpc: {
      status: 'degraded',
      trace: buildTrace((t) => 2.2 * (1 - Math.exp(-t / 7))),
      annotation:
        'The reduced limit enters the optimization as a hard constraint. The controller slows down to stay feasible; the new limit is never violated.',
    },
    rl: {
      status: 'falls',
      trace: buildTrace((t) =>
        Math.min(20, 0.45 * t * (1 + 0.35 * Math.sin(t))),
      ),
      annotation:
        "The limit lived in a reward penalty, not a guarantee. Past the penalty's calibration the policy saturates the actuators, oscillates, and goes down.",
    },
  },
];

export const DEFAULT_PERTURBATION = 'push';

/* ------------------------------------------------------------------ */
/* Comparison table                                                    */
/* ------------------------------------------------------------------ */

export interface ComparisonRow {
  key: string;
  dimension: string;
  mpc: string;
  rl: string;
}

/**
 * The two stacks across the axes the field actually argues about. Row
 * data lives here (next to the interactive's model) so prose, table, and
 * interactive share one source.
 */
export const MPC_RL_COMPARISON_ROWS: ComparisonRow[] = [
  {
    key: 'model-error',
    dimension: 'model error',
    mpc: 'Corrected online: every control step re-solves against the measured state, so model bias is rejected by feedback.',
    rl: 'Must be anticipated at training time with domain randomization or system ID; the residual error is baked into the weights.',
  },
  {
    key: 'constraints',
    dimension: 'constraints',
    mpc: 'Explicit and enforced: friction cones and torque limits are hard constraints in the optimization.',
    rl: 'Implicit: violations are discouraged by reward penalties, with no guarantee they hold.',
  },
  {
    key: 'deploy-compute',
    dimension: 'deploy-time compute',
    mpc: 'High: a trajectory optimization problem is solved at every control step.',
    rl: 'Low: a single network forward pass.',
  },
  {
    key: 'contact-discovery',
    dimension: 'contact-mode discovery',
    mpc: 'Hard: contact schedules are combinatorial, usually given or found by contact-implicit methods.',
    rl: 'Emergent from exploration across thousands of parallel environments.',
  },
  {
    key: 'perception',
    dimension: 'rich perception',
    mpc: 'Awkward: there is no clean way to put an RGB image into a QP.',
    rl: 'Natural: end-to-end from images or heightscans.',
  },
  {
    key: 'task-data',
    dimension: 'task data',
    mpc: 'Zero task data needed; the cost is a dynamics model instead.',
    rl: 'No model needed; the cost is simulation samples and tuning.',
  },
  {
    key: 'dev-cost',
    dimension: 'development cost',
    mpc: 'Model derivation and gain tuning.',
    rl: 'Reward tuning and randomization tuning.',
  },
];
