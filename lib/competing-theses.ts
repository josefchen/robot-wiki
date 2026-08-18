/**
 * Competing-theses data for the frontier/competing-theses module.
 *
 * The field's six live disagreements, each stated as a falsifiable thesis
 * with named proponents, the strongest published evidence on both sides,
 * and the observation that would kill it. Row data lives here (not in the
 * component) so the module's prose, the explorer, and the tests share one
 * source, and so the unit suite can assert that every citation id resolves
 * in the registry.
 *
 * The Zod schema is the completeness gate (VAL-FRONT-014): every thesis
 * must carry non-empty proponents, evidenceFor, evidenceAgainst, and
 * falsification. The array is parsed at module scope, so an incomplete row
 * throws during static generation and fails `next build`.
 */
import { z } from 'zod';

/** One piece of evidence, with the registry ids that back it. */
export const evidenceSchema = z.object({
  text: z.string().min(1),
  citationIds: z.array(z.string().min(1)).min(1),
});

export const thesisSchema = z.object({
  /** Stable row id, used for test selectors. */
  id: z.string().min(1),
  /** Short thesis name, e.g. "End-to-end VLA scaling". */
  name: z.string().min(1),
  /** The core claim in one sentence. */
  claim: z.string().min(1),
  /** Named proponents (people or organizations), at least one. */
  proponents: z.array(z.string().min(1)).min(1),
  /** The strongest published evidence for the thesis. */
  evidenceFor: z.array(evidenceSchema).min(1),
  /** The strongest published evidence or argument against it. */
  evidenceAgainst: z.array(evidenceSchema).min(1),
  /** The falsification criterion: the observation that would kill it. */
  falsification: z.string().min(1),
  /** Compressed falsification signal for the table row. */
  falsificationSignal: z.string().min(1),
});

export type Thesis = z.infer<typeof thesisSchema>;
export type ThesisEvidence = z.infer<typeof evidenceSchema>;

const ROWS: Thesis[] = [
  {
    id: 'end-to-end-vla',
    name: 'End-to-end VLA scaling',
    claim:
      'More data and bigger models produce generalist robot intelligence, the way scaling produced generalist language models.',
    proponents: [
      'Physical Intelligence (π0 to π0.7)',
      'NVIDIA EgoScale team',
      'Bessemer Venture Partners',
    ],
    evidenceFor: [
      {
        text: 'EgoScale fit a log-linear scaling law (R² = 0.9983) from egocentric human-video pretraining hours to downstream robot performance, with a 54% success-rate gain over the no-pretraining baseline.',
        citationIds: ['egoscale-2026'],
      },
      {
        text: 'π0.7 shows compositional generalization and cross-embodiment transfer emerging from a deliberately diverse data mixture rather than new architecture.',
        citationIds: ['pi07-2026'],
      },
      {
        text: 'π0.5 cleaned kitchens and bedrooms in homes that were entirely absent from its training data, the reference open-world result.',
        citationIds: ['pi05-2025'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'Rodney Brooks argues the celebrated vision and speech wins rode on human-engineered front ends (convolutional networks for translational invariance, telephone-derived spectral processing for speech), and that vision-only training gives a robot no tactile channel at all.',
        citationIds: ['brooks-better-lesson-2019', 'brooks-dexterity-2025'],
      },
      {
        text: "Ken Goldberg's 100,000-year data gap: it would take about 100,000 years of human reading to cover the text used to train LLMs, and robot data collection has nothing comparable, so engineering has to bootstrap the robots that collect it.",
        citationIds: ['goldberg-data-gap-2025'],
      },
      {
        text: 'Karcini and co-authors argue that policy scaling alone misses the interfaces that turn unstructured physical data into grounded supervision.',
        citationIds: ['karcini-position-2026'],
      },
      {
        text: 'The reliability gap is not obviously a curve more data smooths: closing 99% to 99.9% is, in Lisa Yan\'s words via Bessemer, a steep hill climb.',
        citationIds: ['bessemer-robotics-2026'],
      },
    ],
    falsification:
      'A plateau in real-world success rate despite a 10x increase in training data, with no architectural change.',
    falsificationSignal: '10x more data, no gain',
  },
  {
    id: 'hierarchical-planner',
    name: 'Hierarchical planner over skills',
    claim:
      'A vision-language model reasons about goals and decomposes them into subtasks; learned skills or a low-level policy execute the plan.',
    proponents: [
      'Google DeepMind (Gemini Robotics ER 2)',
      'Figure (Helix S2/S1/S0)',
      'NVIDIA (GR00T dual-system)',
    ],
    evidenceFor: [
      {
        text: 'Gemini Robotics ER 2 is explicitly built as the high-level brain: it plans multi-step tasks and hands motor execution to a lower-level VLA.',
        citationIds: ['gemini-robotics-er2-2026'],
      },
      {
        text: 'Figure Helix 02 sequenced 61 loco-manipulation actions across a continuous four-minute dishwasher unload, ordered correctly, with implicit error recovery.',
        citationIds: ['helix-02-2026'],
      },
      {
        text: 'π0.7 absorbs new tasks through its hierarchy: language coaching fine-tunes the high-level policy, which then runs the task autonomously.',
        citationIds: ['pi07-2026'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'π0.7\'s compositional generalization emerges from one network, which suggests the skill library can be implicit rather than engineered.',
        citationIds: ['pi07-2026'],
      },
      {
        text: 'The SayCan lineage already showed the planner-side weakness: the planner can only pick skills someone already trained, and recovery from a failed skill means another expensive pass through the loop.',
        citationIds: ['saycan-2022'],
      },
    ],
    falsification:
      'A flat end-to-end model with no high-level inference pass outperforming the best hierarchical system on long-horizon tasks.',
    falsificationSignal: 'flat model beats hierarchy',
  },
  {
    id: 'world-model-training',
    name: 'World-model-based training',
    claim:
      'Learn a model that predicts how the world evolves, then plan in it or train the policy inside it, instead of scaling real-robot data.',
    proponents: ['NVIDIA (Cosmos 3)', 'Meta (V-JEPA 2)'],
    evidenceFor: [
      {
        text: 'V-JEPA 2 plans zero-shot reaching, grasping, and pick-and-place on Franka arms in unseen labs after action-conditioned post-training on less than 62 hours of unlabeled robot video.',
        citationIds: ['vjepa2-2025'],
      },
      {
        text: 'π0.7 already uses its world model to generate the visual subgoals that steer execution, a lightweight version of the bet.',
        citationIds: ['pi07-2026'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'Cosmos 3 was pretrained on up to 31 trillion tokens, on clusters as large as 2,048 GB200 GPUs; world models at useful fidelity are the most expensive objects in the pipeline.',
        citationIds: ['cosmos-3-2026'],
      },
      {
        text: 'No world model has demonstrated physics predictions accurate enough for contact-rich manipulation, and Karcini et al. argue world models alone are not sufficient.',
        citationIds: ['karcini-position-2026'],
      },
    ],
    falsification:
      'World-model training failing to improve real-world contact-rich task performance beyond what VLA scaling alone achieves.',
    falsificationSignal: 'no gain beyond VLA scaling',
  },
  {
    id: 'rl-finetuning',
    name: 'RL fine-tuning on imitation',
    claim:
      'Pretrain on demonstrations, then close the reliability gap with reinforcement learning on the real robot.',
    proponents: [
      'Physical Intelligence (π*0.6 Recap)',
      'RL-100 team',
      'ENPIRE team (NVIDIA, CMU, UC Berkeley)',
    ],
    evidenceFor: [
      {
        text: 'π*0.6 with Recap more than doubled throughput and passed 90% success on espresso, laundry, and box assembly after RL on the robot\'s own experience.',
        citationIds: ['pistar06-2025'],
      },
      {
        text: 'RL-100 reports 100% success across 1,000 evaluation episodes on eight tasks, including a juicing robot serving customers for seven hours without failure.',
        citationIds: ['rl-100-2025'],
      },
      {
        text: 'ENPIRE hands the improvement loop to coding agents and reaches 99% success on dexterous tasks such as pin-box organizing.',
        citationIds: ['enpire-2026'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'Every one of these results is per-task: hours of on-robot training buy a specialist, and neither paper claims transfer to unseen tasks.',
        citationIds: ['pistar06-2025', 'rl-100-2025'],
      },
      {
        text: 'The generalist comparison is sobering: π0.7 matches specialist throughput on exactly the Recap tasks, by distilling specialist experience into the generalist.',
        citationIds: ['pi07-2026'],
      },
    ],
    falsification:
      'RL-finetuned specialists consistently failing to generalize to unseen tasks or environments without another round of per-task training.',
    falsificationSignal: 'specialists stay specialists',
  },
  {
    id: 'teleop-bridge',
    name: 'Teleoperation as a bridge',
    claim:
      'Deploy teleoperated or human-supervised robots for real work now, harvest the data, and fade the human out as autonomy improves.',
    proponents: [
      'Nucleus (supervised operations)',
      'Physical Intelligence (Recap coaching)',
      'Bessemer (data flywheel)',
    ],
    evidenceFor: [
      {
        text: 'π*0.6\'s Recap turns human coaching with corrections into more than doubled throughput on production-style tasks.',
        citationIds: ['pistar06-2025'],
      },
      {
        text: 'The two strongest verified deployment records, Agility\'s 65,000+ operating hours and Figure\'s 1,250+ hours at BMW Spartanburg, are supervised programs that generate training data as a byproduct.',
        citationIds: ['technology-org-deployed-2026'],
      },
      {
        text: 'Bessemer\'s data-flywheel thesis, in its words: turning robot data into better decisions, better models, and better deployments.',
        citationIds: ['bessemer-robotics-2026'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'Teleoperation is expensive and slow, and Bessemer\'s own sources doubt it scales: Ian Glow argues you will never get the scale or diversity you need from teleop alone.',
        citationIds: ['bessemer-robotics-2026'],
      },
      {
        text: 'Egocentric human video is already demonstrating a cheaper data source with a measured scaling law, no robot required.',
        citationIds: ['egoscale-2026'],
      },
    ],
    falsification:
      'Autonomous policies reaching better than 99% success trained without any teleoperation data, which removes the bridge\'s reason to exist.',
    falsificationSignal: '>99% with zero teleop data',
  },
  {
    id: 'form-factor',
    name: 'Humanoid versus task-specific',
    claim:
      'One side bets a human body is the right interface to a world built for humans; the other bets purpose-built robots win on cost and reliability for any known task.',
    proponents: [
      'Humanoid side: Figure, Tesla, 1X, Apptronik, Unitree',
      'Task-specific side: Rodney Brooks (Robust.AI), Agility Robotics',
    ],
    evidenceFor: [
      {
        text: 'Figure\'s Helix 02 runs whole-body loco-manipulation, including a livestreamed eight-hour autonomous shift on a factory floor.',
        citationIds: ['helix-02-2026', 'figure-8hr-shift-2026'],
      },
      {
        text: 'Gemini Robotics 2 controls full humanoids from feet to fingertips with a single model.',
        citationIds: ['gemini-robotics-2-2026'],
      },
    ],
    evidenceAgainst: [
      {
        text: 'Brooks calls practical humanoids within decades pure fantasy thinking, and notes that no human-like robot hand has yet survived real-world deployment.',
        citationIds: ['brooks-dexterity-2025'],
      },
      {
        text: 'The verified deployment records belong to narrow applications: Agility\'s 65,000+ hours are logistics work, where purpose-built systems already carry the revenue.',
        citationIds: ['technology-org-deployed-2026'],
      },
    ],
    falsification:
      'Task-specific robots consistently beating humanoids on cost per task and reliability in the same applications kills the humanoid side; a humanoid reaching cost-per-task parity with purpose-built systems across a broad task range kills the task-specific side.',
    falsificationSignal: 'cost-per-task parity test',
  },
];

/**
 * The six theses, schema-validated at module load. An incomplete row throws
 * here, which fails `next build` during static generation of the module
 * page (VAL-FRONT-014's build-time step).
 */
export const THESES: Thesis[] = z.array(thesisSchema).length(6).parse(ROWS);

/** The explorer opens on the scaling thesis: it is the debate's center. */
export const DEFAULT_THESIS_ID = 'end-to-end-vla';
