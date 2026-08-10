import type { GlossaryTerm } from './schemas/glossary';

/**
 * The glossary registry: cited definitions of the jargon used across the
 * wiki. `data/schemas/glossary.ts` holds the schema (a definition with no
 * citation id fails validation); scripts/validate-content.ts checks that
 * every cited id resolves and that no published article uses an unknown
 * term id.
 *
 * This is the seed set: eight terms, enough to prove the mechanism end to
 * end. Full coverage is a separate content effort; add terms here as
 * articles need them, each definition written from its cited source.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
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
