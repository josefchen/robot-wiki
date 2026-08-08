/**
 * World-model taxonomy model for the world-models/taxonomy module.
 *
 * The term "world model" covers six architecturally distinct paradigms
 * that differ in what is predicted, in what space, and what the
 * prediction is for. This file is the single source for the module's
 * disambiguation table and its disambiguator interactive, so prose,
 * table, and viz cannot drift apart. Row content follows the taxonomy in
 * research/02 (Part B) and the 2026 world-model survey (arXiv:2605.00080).
 *
 * Pure data and helpers only; no rendering.
 */

export type WmParadigmId =
  | 'latent-dynamics'
  | 'decoder-free-latent'
  | 'generative-video'
  | 'jepa'
  | 'world-action'
  | 'symbolic';

/** What a world model gets used for, per the survey's functional roles. */
export type WmUseId =
  | 'policy-learning'
  | 'planning'
  | 'evaluation'
  | 'data-generation';

export const WM_USES: Array<{ id: WmUseId; label: string }> = [
  { id: 'policy-learning', label: 'policy learning' },
  { id: 'planning', label: 'planning' },
  { id: 'evaluation', label: 'evaluation' },
  { id: 'data-generation', label: 'data generation' },
];

export interface WmParadigm {
  id: WmParadigmId;
  /** Short label for buttons and readouts. */
  short: string;
  /** Full paradigm name used in the table. */
  name: string;
  /** Table cell: what the model predicts. */
  predicts: string;
  /** Table cell: the space the prediction lives in. */
  space: string;
  /** Table cell: training data. */
  trainedOn: string;
  /** Table cell: primary use. */
  primaryUse: string;
  /** Table cell: representative systems. */
  systems: string;
  /** Which of the four uses this paradigm actually serves. */
  uses: WmUseId[];
  /** One-line description of what the disambiguator panel draws. */
  panelNote: string;
}

export const WM_PARADIGMS: WmParadigm[] = [
  {
    id: 'latent-dynamics',
    short: 'latent dynamics',
    name: 'Latent-dynamics world model (Dreamer-style)',
    predicts: 'Next latent state + reward + continuation flag',
    space: 'Learned compact latent (stochastic + deterministic); decoded to pixels during training',
    trainedOn: "The agent's own interaction data",
    primaryUse: 'Policy optimization on imagined rollouts; sample-efficient RL',
    systems: 'DreamerV3, DayDreamer, Robotic World Model',
    uses: ['policy-learning'],
    panelNote: 'a latent vector, a reward scalar, and a fuzzy decoded reconstruction',
  },
  {
    id: 'decoder-free-latent',
    short: 'decoder-free latent',
    name: 'Decoder-free latent model for planning (TD-MPC-style)',
    predicts: 'Next latent state + reward; no reconstruction, no decoder',
    space: 'Implicit latent trained only for value/reward prediction',
    trainedOn: 'Interaction data',
    primaryUse: 'Latent-space trajectory optimization (MPPI) at every control step',
    systems: 'TD-MPC, TD-MPC2, Dream-MPC',
    uses: ['policy-learning', 'planning'],
    panelNote: 'a latent vector with MPPI candidate trajectories and no image at all',
  },
  {
    id: 'generative-video',
    short: 'generative video',
    name: 'Action-conditioned generative video model',
    predicts: 'Future pixels conditioned on the current frame(s) + action/text',
    space: 'Pixel or VAE-latent video space',
    trainedOn: 'Internet video + robot trajectories',
    primaryUse: 'Data generation, policy evaluation, RL post-training, interactive worlds',
    systems: 'Cosmos 3, Genie 3, Odyssey, Interactive World Simulator',
    uses: ['policy-learning', 'evaluation', 'data-generation'],
    panelNote: 'a photoreal predicted video frame',
  },
  {
    id: 'jepa',
    short: 'JEPA',
    name: 'Non-generative joint-embedding predictor (JEPA)',
    predicts: 'Future representation, never pixels',
    space: 'Learned embedding space; masked/future embedding prediction',
    trainedOn: 'Internet video + a small action-labeled robot set',
    primaryUse: 'Zero-shot planning by energy minimization over latent goals',
    systems: 'V-JEPA, V-JEPA 2, V-JEPA 2-AC',
    uses: ['planning'],
    panelNote: 'an embedding vector and a goal-distance meter, with an explicit no-decoder marker',
  },
  {
    id: 'world-action',
    short: 'world-action',
    name: 'Unified world-action model',
    predicts: 'Future frames and action chunks from one backbone',
    space: 'Shared backbone; parallel generative and action heads',
    trainedOn: 'Robot trajectories + video',
    primaryUse: 'Policy with world-modeling as auxiliary objective / implicit lookahead',
    systems: 'Cosmos Policy, WorldVLA, DreamZero',
    uses: ['policy-learning'],
    panelNote: 'frames and an action chunk emitted together from one backbone',
  },
  {
    id: 'symbolic',
    short: 'symbolic',
    name: 'Symbolic / structured world model',
    predicts: 'Transitions over predicates, object relations, occupancy',
    space: 'Discrete/relational or 3D-occupancy space',
    trainedOn: 'Curated or perception-grounded data',
    primaryUse: 'Long-horizon task planning without pixel-space error accumulation',
    systems: 'OccWorld, symbolic-abstraction hybrids',
    uses: ['planning'],
    panelNote: 'a predicate list, on(cup, table) becoming in(cup, gripper)',
  },
];

export const DEFAULT_PARADIGM: WmParadigmId = 'latent-dynamics';

export function paradigmById(id: WmParadigmId): WmParadigm {
  const found = WM_PARADIGMS.find((p) => p.id === id);
  if (!found) throw new Error(`unknown world-model paradigm: ${id}`);
  return found;
}

export function useLabel(id: WmUseId): string {
  const found = WM_USES.find((u) => u.id === id);
  if (!found) throw new Error(`unknown world-model use: ${id}`);
  return found.label;
}
