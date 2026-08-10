import type { GlossaryTerm } from './schemas/glossary';

/**
 * The glossary registry: cited definitions of the jargon used across the
 * wiki. `data/schemas/glossary.ts` holds the schema (a definition with no
 * citation id fails validation); scripts/validate-content.ts checks that
 * every cited id resolves and that no published article uses an unknown
 * term id.
 *
 * Terms are added in batches as coverage grows; every definition is written
 * from its cited source, and an id typo fails the build gate, so keep ids
 * stable and kebab-case.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    id: 'behavior-cloning',
    term: 'behavior cloning',
    definition:
      'Training a policy by supervised learning on expert demonstrations: each recorded observation is an input, the action the expert took at that moment is the label, and the fitted mapping from state to action is the policy. The recipe predates deep learning; in 1988 ALVINN trained a three-layer network to steer a van from camera images, and the same approach, scaled to modern networks and datasets, still underlies most learned manipulation policies. Its known failure mode in closed loop is covariate shift.',
    citations: ['alvinn-1988', 'dagger-2011'],
  },
  {
    id: 'dagger',
    term: 'DAgger',
    definition:
      'Dataset Aggregation, the iterative fix for behavior cloning\'s distribution mismatch: roll out the current policy, have the expert label the states the policy actually visits, add those labeled states to the training set, and retrain. Ross, Gordon, and Bagnell framed the procedure as a reduction of imitation learning to no-regret online learning, which replaces the quadratic dependence of total cost on episode length with a linear one.',
    citations: ['dagger-2011'],
  },
  {
    id: 'compounding-error',
    term: 'compounding error',
    definition:
      'The accumulation of small per-step mistakes over the course of a sequential task: each error carries the robot into a state slightly outside its training data, where the next error is more likely, so total deviation grows faster than the per-step error rate. Ross, Gordon, and Bagnell bounded the effect for imitation learning with total cost quadratic in episode length, and action chunking attacks the same effect from the other side by shrinking the number of sequential decisions in an episode.',
    citations: ['dagger-2011', 'act-aloha-2023'],
  },
  {
    id: 'cvae',
    term: 'CVAE',
    definition:
      'Conditional variational autoencoder: a generative model that learns a distribution over a latent variable instead of a single deterministic output. ACT trains its action-chunking policy as a CVAE. During training an encoder compresses the demonstrated action sequence into a latent style variable; at test time the decoder generates the chunk conditioned on camera images and joint positions with the latent clamped to the prior mean, which lets one policy cover varied demonstrations of the same task.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'vision-language-action-model',
    term: 'vision-language-action model',
    definition:
      'A robot policy built by adapting a vision-language model, pretrained on web-scale image and text data, to output robot actions. RT-2 established the approach by representing actions as text tokens and co-fine-tuning on web and robot data together, showing that semantic knowledge from web pretraining transfers into control. The same recipe underlies OpenVLA and the π series of generalist policies.',
    citations: ['rt2-2023'],
  },
  {
    id: 'cross-embodiment',
    term: 'cross-embodiment',
    definition:
      'Learning from, or transferring to, robots with different morphologies: different joint counts, action dimensions, and sensor suites. The Open X-Embodiment project pooled data from 22 robot embodiments into a single training mixture and showed that the resulting RT-X policies carry skills across platforms. The gain is not free, because each body defines its actions differently, and the field answers that mismatch with several incompatible conventions.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'action-chunking',
    term: 'action chunking',
    definition:
      'Predicting a sequence of future actions in one inference instead of a single action per timestep. Introduced with ACT on the ALOHA platform, chunking cuts the number of sequential decisions in an episode by the chunk length, which reduces compounding error and gives the policy the temporal context it needs to represent pauses, at the cost of committing to a plan between replans.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'covariate-shift',
    term: 'covariate shift',
    definition:
      'In imitation learning, the mismatch between the state distribution in the training demonstrations and the distribution the learned policy visits at deployment. The policy\'s own errors carry it into states the demonstrations never covered, where it is likelier to err again, so mistakes compound: Ross, Gordon, and Bagnell showed that a behavior-cloned policy with per-step error ε can incur total cost growing quadratically in episode length, and that no i.i.d.-trained policy can guarantee better.',
    citations: ['dagger-2011'],
  },
  {
    id: 'diffusion-policy',
    term: 'diffusion policy',
    definition:
      'A policy that produces actions through a conditional denoising diffusion process over a whole action sequence instead of regressing a single action directly. Introduced by Chi et al. in 2023, it represents multimodal demonstrations faithfully rather than averaging their modes, and it executes only the first few steps of each predicted sequence before observing again and replanning.',
    citations: ['diffusion-policy-2023'],
  },
  {
    id: 'domain-randomization',
    term: 'domain randomization',
    definition:
      'Training a policy across a distribution of simulators with randomized parameters, visual appearance, dynamics, or both, so the real world reads as one more sample from that distribution. Tobin et al. randomized rendering and transferred an object detector to a real arm; Peng et al. randomized dynamics and transferred a pushing policy with no real-world training. The price is conservatism: a policy that does well across a wide distribution is optimal for no single instance of it.',
    citations: ['tobin-2017', 'peng-2018'],
  },
  {
    id: 'forward-kinematics',
    term: 'forward kinematics',
    definition:
      'The map from a robot\'s joint angles to the pose of its end effector: a deterministic composition of per-joint transforms. It is cheap, smooth in the joint angles, and has exactly one answer, which makes it practical to evaluate inside every control cycle.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'inverse-kinematics',
    term: 'inverse kinematics',
    definition:
      'The reverse of the forward map: given a target pose for the end effector, find joint angles that reach it. The problem is nonlinear and can have no solution, one solution, or many, so practical solvers iterate, commonly with damped least squares, which trades a small residual error for bounded, well-conditioned steps near singularities.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'sim-to-real-gap',
    term: 'sim-to-real gap',
    definition:
      'The discrepancy between a simulator\'s physics and rendering and the real world, which makes policies trained in simulation degrade when they are deployed on hardware. The gap has several independent components, dynamics, sensing, and actuation among them, and the standard transfer methods (domain randomization, system identification, teacher-student distillation, real-to-sim reconstruction) each attack a different part of it.',
    citations: ['reality-gap-survey-2026'],
  },
  {
    id: 'temporal-ensembling',
    term: 'temporal ensembling',
    definition:
      'ACT\'s execution scheme for overlapping action chunks: the policy is queried at every timestep, and the predictions that each in-flight chunk made for the current step are averaged with exponential weights that favor the most recent prediction. This smooths the handoff between chunks at the cost of one inference per step instead of one per chunk.',
    citations: ['act-aloha-2023'],
  },
];

const BY_ID = new Map(GLOSSARY.map((term) => [term.id, term]));

/** Registry lookup; undefined for unknown ids (the build gate catches those). */
export function getTerm(id: string): GlossaryTerm | undefined {
  return BY_ID.get(id);
}

/** All terms sorted by display name, for the /glossary page. */
export function glossaryTermsAlphabetical(): GlossaryTerm[] {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
}
