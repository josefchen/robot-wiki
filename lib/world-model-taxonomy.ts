/**
 * World-model taxonomy model for the world-models/taxonomy module.
 *
 * Six families, the article's "six ways to build one", not an exhaustive or
 * universally agreed scientific taxonomy. The local grouping compares
 * prediction target, representation, and intended use. WM_PARADIGMS is the
 * canonical local inventory shared by the table and disambiguator.
 * The survey (arXiv:2605.00080) supplies the functional definition, not a
 * claim that these exact six groups are its taxonomy.
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
  { id: 'policy-learning', label: 'Policy learning' },
  { id: 'planning', label: 'Planning' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'data-generation', label: 'Data generation' },
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
    short: 'Latent dynamics',
    name: 'Latent-dynamics world model (Dreamer-style)',
    predicts: 'Next latent state, reward and continuation (whether the episode goes on)',
    space: 'A short learned list of numbers, part random and part fixed; turned back into pixels only in training',
    trainedOn: "Mostly the robot's own experience; Dreamer 4 learns from video",
    primaryUse: 'Training a policy on imagined experience, saving real trials',
    systems: 'DreamerV3, Dreamer 4, DayDreamer, Robotic World Model',
    uses: ['policy-learning'],
    panelNote: 'a latent vector, a reward scalar, and a fuzzy decoded reconstruction',
  },
  {
    id: 'decoder-free-latent',
    short: 'Decoder-free latent',
    name: 'Decoder-free latent model for planning (TD-MPC-style)',
    predicts: 'Next latent state and reward; no reconstruction, no decoder',
    space: 'A learned list of numbers shaped only to predict reward and value',
    trainedOn: "The robot's own experience",
    primaryUse: 'Planning: try sampled action sequences in the model, act on the best',
    systems: 'TD-MPC, TD-MPC2, Dream-MPC',
    uses: ['policy-learning', 'planning'],
    panelNote: 'a latent vector with candidate trajectories and no image at all',
  },
  {
    id: 'generative-video',
    short: 'Generative video',
    name: 'Action-conditioned generative video model',
    predicts: 'Future pixels, from the current frames and an action or text prompt',
    space: 'Video pixels, or a compressed code for video',
    trainedOn: 'Internet video and robot recordings',
    primaryUse: 'Generating training data, testing policies, further policy training, interactive worlds',
    systems: 'Cosmos 3, Genie 3, Odyssey, Interactive World Simulator',
    uses: ['policy-learning', 'evaluation', 'data-generation'],
    panelNote: 'a photoreal predicted video frame',
  },
  {
    id: 'jepa',
    short: 'JEPA',
    name: 'Non-generative joint-embedding predictor (JEPA)',
    predicts: 'Future representation, never pixels',
    space: 'A learned embedding, trained by predicting hidden or future parts of video',
    trainedOn: 'Internet video, then a small set of robot video with actions',
    primaryUse: 'Planning toward a goal image with no task-specific training',
    systems: 'V-JEPA, V-JEPA 2, V-JEPA 2-AC, LeWorldModel',
    uses: ['planning'],
    panelNote: 'an embedding vector and a goal-distance meter, with an explicit no-decoder marker',
  },
  {
    id: 'world-action',
    short: 'World-action',
    name: 'Unified world-action model',
    predicts: 'Future frames and the next action chunks, from one backbone',
    space: 'One shared network with separate outputs for video and actions',
    trainedOn: 'Robot recordings and video',
    primaryUse: 'A policy that learns physical dynamics by also predicting video',
    systems: 'DreamZero, Cosmos Policy, WorldVLA, GR00T 2',
    uses: ['policy-learning'],
    panelNote: 'frames and an action chunk emitted together from one backbone',
  },
  {
    id: 'symbolic',
    short: 'Structured',
    name: 'Structured world model (objects, points and facts)',
    predicts: 'How facts (predicates), object relations, 3D points or occupied space change',
    space: 'Lists of facts, graphs of objects, point clouds or 3D occupancy grids',
    trainedOn: 'Curated data or the output of perception',
    primaryUse: 'Long task planning without pixel errors piling up',
    systems: 'Interaction Networks, OccWorld, PointWorld, VisualPredicator',
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
