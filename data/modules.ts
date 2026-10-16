/**
 * Module registry: the taxonomy backbone of Robot Wiki.
 *
 * Source of truth for which modules exist, their domain, slug, order, and
 * publish status. Sidebar navigation, the MDX route's generateStaticParams,
 * the sitemap, and the content validator all read from here. Modules with
 * status 'draft' are planned entries only: they are excluded from the static
 * export, the sidebar's published links, the search indexes, and sitemap.xml.
 *
 * No runtime relative imports with implicit extensions: this file is loaded
 * by Next.js, by Vitest, and by plain node (scripts/validate-content.ts).
 */
import type { Domain } from './domains.ts';
import type { ModuleRegistryEntry } from './schemas/module.ts';

export { ADJACENT_DOMAIN, CORE_DOMAINS, DOMAINS } from './domains.ts';
export type { CoreDomain, Domain } from './domains.ts';
export type { ModuleRegistryEntry } from './schemas/module.ts';

/**
 * A sentence a hub restates from one of its articles. `passage` is the
 * article's own wording, in a paragraph that carries `<Cite id={citationId} />`;
 * tests/unit/domain-hubs.test.ts holds each one to its article.
 */
export type DomainCitedText = {
  /** The article that states it, as `domain/slug`. */
  article: string;
  text: string;
  citationId: string;
  passage: string;
};

/** One row of the adjacent hub's table: how each field shows it is safe enough. */
export type DomainEvidenceRow = {
  slug: string;
  field: string;
  scale: DomainCitedText;
  bar: string;
  record: DomainCitedText;
};

/**
 * What a domain landing page says before its article list.
 *
 * - `description` opens with a sentence that defines the domain. It opens
 *   the hub and is the CollectionPage description.
 * - `fact` is an optional cited sentence that follows it.
 * - `readingOrder` says what the numbered order means, which the
 *   definition cannot: without it a reader cannot tell an editorial order
 *   from an arbitrary one. The page prints it after the article count.
 * - `related` holds trailing-slash links to neighbouring hubs and articles.
 * - `furtherReading` is a citation id for one source worth reading next.
 * - `evidence` is the adjacent hub's table.
 */
export type DomainMeta = {
  name: string;
  description: string;
  fact?: DomainCitedText;
  readingOrder: string;
  related: readonly string[];
  furtherReading?: string;
  evidence?: readonly DomainEvidenceRow[];
};

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  manipulation: {
    name: 'Manipulation & Learned Policies',
    description:
      'Manipulation is a robot handling objects with its arms and hands, and a learned policy maps what the robot senses to its next action.',
    readingOrder:
      'Behavior cloning comes first, then the models that scaled it, a curriculum and two guides.',
    related: ['/frontier/generalization/', '/data-hardware/datasets/', '/world-models/'],
  },
  'rl-sim2real': {
    name: 'RL, Sim-to-Real & Locomotion',
    description:
      'Reinforcement learning (RL) is trial-and-error training of a robot controller, usually in simulation before transfer to hardware.',
    fact: {
      article: 'rl-sim2real/why-rl-locomotion',
      text: 'In 2021 an ANYmal quadruped learned to walk on flat ground in under four minutes on one GPU',
      citationId: 'rudin-2021',
      passage: 'In 2021 an ANYmal quadruped learned to walk on flat ground in under four minutes',
    },
    readingOrder: 'Basics first, then locomotion and the methods behind it.',
    related: [
      '/manipulation/rl-finetuning/',
      '/world-models/model-based-robot-learning/',
      '/classical/control/',
    ],
    furtherReading: 'gu-humanoid-review-2026',
  },
  'world-models': {
    name: 'World Models',
    description:
      'World models are learned models that predict how an environment changes when a robot acts, so it can plan, train or be tested on predictions. World-action models also predict actions and run as policies.',
    readingOrder:
      'Definition first, then four approaches, evaluation and comparison.',
    related: [
      '/frontier/competing-theses/',
      '/rl-sim2real/sim2real-transfer/',
      '/manipulation/vla-models/',
    ],
  },
  'data-hardware': {
    name: 'Data, Hardware & Evaluation',
    description:
      'Data, hardware and evaluation are what robot learning runs on: training data, the robots that collect it and the tests that score results.',
    fact: {
      article: 'data-hardware/industrial-deployment',
      text: 'In 2025, 5 million industrial robots were in operation',
      citationId: 'ifr-world-robotics-2026-release',
      passage: 'counts a record operational stock of 5 million industrial robots in 2025',
    },
    readingOrder: 'Data first, then hardware, evaluation and deployment.',
    related: ['/market-map/', '/manipulation/robot-learning-roadmap/', '/frontier/reliability-gap/'],
  },
  classical: {
    name: 'Classical Foundations',
    description:
      'Classical robotics is the model-based stack that learned policies still run on: kinematics, planning, control, estimation, grasping, perception, mapping, calibration and ROS 2.',
    fact: {
      article: 'classical/control',
      text: "In Intrinsic's 2026 AI for Industry Challenge, 90% of the top teams in the real-workcell phase inserted the connector with rules-based routines and force-torque feedback",
      citationId: 'intrinsic-ai-for-industry-challenge-2026',
      passage:
        'reports that 90% of the top teams in its real-workcell phase inserted the connector with rules-based routines, such as spiral searches, and force-torque feedback',
    },
    readingOrder: 'Each article builds on the ones before it.',
    related: [
      '/manipulation/robot-learning-roadmap/',
      '/data-hardware/robot-learning-stack/',
      '/frontier/safety-and-assurance/',
    ],
  },
  frontier: {
    name: 'Frontier & Open Problems',
    description:
      'Frontier problems are the open questions that keep robot demos from becoming products: reliability, dexterity, generalization and safety.',
    fact: {
      article: 'data-hardware/industrial-deployment',
      text: 'About 7,000 full-size humanoids were sold in 2025',
      citationId: 'ifr-service-robots-2026',
      passage: 'IFR counts about 7,000 full-size humanoids sold in 2025',
    },
    readingOrder: 'The reliability gap comes first, then ways to close it.',
    related: [
      '/data-hardware/evaluation-crisis/',
      '/data-hardware/industrial-deployment/',
      '/manipulation/generalist-policies/',
    ],
  },
  adjacent: {
    name: 'Adjacent Domains',
    description:
      'Adjacent domains are robotics fields that meet the same problems under their own safety and certification rules: driving, drones, surgery and space.',
    readingOrder: 'Each article stands alone.',
    related: [
      '/frontier/reliability-gap/',
      '/frontier/safety-and-assurance/',
      '/data-hardware/industrial-deployment/',
    ],
    evidence: [
      {
        slug: 'autonomous-vehicles',
        field: 'Autonomous vehicles',
        scale: {
          article: 'adjacent/autonomous-vehicles',
          text: 'Waymo gave more than 500,000 fully autonomous rides a week in April 2026',
          citationId: 'alphabet-q1-2026',
          passage: 'more than 500,000 fully autonomous rides a week in April 2026',
        },
        bar: 'Crash rates against human drivers',
        record: {
          article: 'adjacent/autonomous-vehicles',
          text: '95 percent fewer serious-injury-or-worse crashes over 271.3 million rider-only miles',
          citationId: 'waymo-safety-hub-2026',
          passage: '95 percent fewer serious-injury-or-worse crashes',
        },
      },
      {
        slug: 'drones',
        field: 'Drones',
        scale: {
          article: 'adjacent/drones',
          text: 'Zipline reports more than 3 million deliveries since 2016',
          citationId: 'zipline-safety-facts',
          passage: 'Zipline reports more than 3 million deliveries',
        },
        bar: 'Wins against named champions',
        record: {
          article: 'adjacent/drones',
          text: 'Swift won races against each of three human champions',
          citationId: 'swift-drone-racing-2023',
          passage: 'raced three human champions',
        },
      },
      {
        slug: 'surgical',
        field: 'Surgical robots',
        scale: {
          article: 'adjacent/surgical',
          text: '11,710 da Vinci systems installed by June 30, 2026',
          citationId: 'intuitive-q2-2026',
          passage: 'Intuitive had 11,710 da Vinci systems installed by June 30, 2026',
        },
        bar: 'Clearance for each indication',
        record: {
          article: 'adjacent/surgical',
          text: 'Hugo cleared for urologic procedures on December 3, 2025',
          citationId: 'medtronic-hugo-clearance-2025',
          passage: "Medtronic's Hugo was cleared on December 3, 2025 for urologic procedures",
        },
      },
      {
        slug: 'space',
        field: 'Space robots',
        scale: {
          article: 'adjacent/space',
          text: "AutoNav evaluated 88 percent of the 17.7 km Perseverance drove in its first Mars year",
          citationId: 'perseverance-autonomy-2023',
          passage: 'AutoNav evaluated 88 percent of the 17.7 km driven',
        },
        bar: 'Autonomy added in bounded, verified steps',
        record: {
          article: 'adjacent/space',
          text: 'A digital twin verified over 500,000 telemetry variables before AI-planned drives',
          citationId: 'perseverance-ai-drive-2026',
          passage: 'After a digital twin verified over 500,000 telemetry variables',
        },
      },
    ],
  },
};

const entries: Array<[Domain, string, string, string]> = [
  // [domain, slug, title, summary]
  [
    'manipulation',
    'bc-foundations',
    'Behavior Cloning Foundations',
    'Covariate shift makes naive imitation drift, and DAgger is the standard fix.',
  ],
  [
    'manipulation',
    'action-chunking',
    'Action Chunking (ACT and ALOHA)',
    'ACT predicts short action sequences and smooths them with temporal ensembling.',
  ],
  [
    'manipulation',
    'diffusion-policy',
    'Diffusion Policy',
    'Visuomotor control as conditional denoising over action sequences, with receding-horizon execution.',
  ],
  [
    'manipulation',
    'vla-models',
    'Vision-Language-Action Models',
    'RT-1, RT-2, Octo and OpenVLA, and what web-scale pretraining adds to robot control.',
  ],
  [
    'manipulation',
    'pi-line',
    'The Pi Line',
    'From pi0 to pi0.7, with flow-matching action experts and FAST tokenization.',
  ],
  [
    'manipulation',
    'generalist-policies',
    'Other Generalist Policies',
    'How to read the claims for Gemini Robotics, GR00T, Helix and GO-2.',
  ],
  [
    'manipulation',
    'comparison-matrix',
    'Comparison Matrix',
    'Every major policy compared on eight architectural axes.',
  ],
  [
    'manipulation',
    'hierarchical',
    'Hierarchical Approaches',
    'From SayCan and Code as Policies to the hierarchies in Helix and pi0.5.',
  ],
  [
    'manipulation',
    'rl-finetuning',
    'RL Fine-Tuning of Policies',
    'Improving a pretrained policy from its own online experience.',
  ],
  [
    'manipulation',
    'realtime-execution',
    'Real-Time Execution',
    'The latency budgets that decide whether the control loop closes.',
  ],
  [
    'manipulation',
    'cross-embodiment',
    'Cross-Embodiment Transfer',
    'How one policy learns from many robot bodies and from humans.',
  ],
  [
    'manipulation',
    'knowledge-insulation',
    'Knowledge Insulation',
    'Discrete tokens train the backbone while the action expert trains behind a stop-gradient.',
  ],
  [
    'manipulation',
    'robot-learning-roadmap',
    'Robot Learning Curriculum for ML Engineers',
    'A dependency-ordered route from supervised learning to real robot policies.',
  ],
  [
    'manipulation',
    'action-spaces',
    'Action Spaces for Robot Learning',
    'What each action representation gives the learner and asks of the controller.',
  ],
  [
    'manipulation',
    'foundation-models',
    'Foundation Models for Robotics',
    'What foundation means in robotics, and what adaptation still costs.',
  ],
  [
    'rl-sim2real',
    'rl-for-robotics',
    'RL for Robotics',
    'Sample efficiency decides which RL algorithm a robot can use.',
  ],
  [
    'rl-sim2real',
    'why-rl-locomotion',
    'Why RL Won Locomotion but Not Manipulation',
    'Walking is cheap to simulate; contact-rich manipulation is not.',
  ],
  [
    'rl-sim2real',
    'parallel-sim-rl',
    'Massively Parallel Sim RL',
    'GPU-parallel simulation with Isaac Lab, Newton, MJX and Brax.',
  ],
  [
    'rl-sim2real',
    'sim2real-transfer',
    'Sim-to-Real Transfer',
    'Domain randomization, distillation, system identification and real-to-sim reconstruction.',
  ],
  [
    'rl-sim2real',
    'legged-locomotion',
    'Legged Locomotion Lineage',
    'How learned gaits became the default for legged robots.',
  ],
  [
    'rl-sim2real',
    'humanoid-wbc',
    'Humanoid Whole-Body Control',
    'How humanoids track retargeted human motion.',
  ],
  [
    'rl-sim2real',
    'reward-design-mpc',
    'Reward Design and the MPC Debate',
    'Hand-tuned and language-model rewards, and the MPC debate.',
  ],
  [
    'rl-sim2real',
    'offline-rl',
    'Offline Reinforcement Learning for Robotics',
    'CQL and TD3+BC, and when behavior cloning is the stronger baseline.',
  ],
  [
    'world-models',
    'taxonomy',
    'What Is a World Model?',
    'Six example groups compared, from DreamerV3 to V-JEPA 2.',
  ],
  [
    'world-models',
    'latent-dynamics',
    'Latent-Dynamics World Models',
    'Dreamer 4, TD-MPC2 and Newt: compact learned dynamics for imagination-based control.',
  ],
  [
    'world-models',
    'generative-video',
    'Generative Video World Models',
    'Cosmos, Genie and GR-2 use action-conditioned video prediction as a simulator.',
  ],
  [
    'world-models',
    'jepa',
    'JEPA and the Non-Generative Counterargument',
    'V-JEPA 2 and 2.1 predict in representation space, with no pixel decoder.',
  ],
  [
    'world-models',
    'generative-sim',
    'Generative Simulation',
    'Generated tasks, scenes and assets inside a physics engine.',
  ],
  [
    'world-models',
    'model-based-robot-learning',
    'Model-Based Robot Learning',
    'Learn dynamics, plan through them, and improve from imagined rollouts.',
  ],
  [
    'world-models',
    'evaluation',
    'World Model Evaluation for Robotics',
    'Testing a world model on what a robot needs.',
  ],
  [
    'world-models',
    'world-models-vs-simulators',
    'World Models vs Physics Simulators',
    'Learned dynamics, physics engines and hybrids compared as robot simulators.',
  ],
  [
    'data-hardware',
    'data-bottleneck',
    'The Data Bottleneck',
    'Robot data comes in hours; language data in trillions of tokens.',
  ],
  [
    'data-hardware',
    'datasets',
    'Major Datasets',
    'The major open robot datasets and what each collected.',
  ],
  [
    'data-hardware',
    'hardware-taxonomy',
    'Hardware Taxonomy',
    "A buyer's guide from SO-101 to Jetson Thor.",
  ],
  [
    'data-hardware',
    'teleop-rigs',
    'Teleoperation Rigs',
    'ALOHA, GELLO, UMI and VR rigs compared on cost and quality.',
  ],
  [
    'data-hardware',
    'evaluation-crisis',
    'The Evaluation Crisis',
    'What a success rate hides, from trial count to scorer.',
  ],
  [
    'data-hardware',
    'industrial-deployment',
    'Industrial Deployment',
    'The jam-rate arithmetic that decides whether a 99 percent cell ships.',
  ],
  [
    'data-hardware',
    'robot-learning-stack',
    'The Robot Learning Stack',
    'From data capture to robot integration as one reproducible system.',
  ],
  [
    'classical',
    'kinematics',
    'Kinematics',
    "How joint angles place a robot's hand, and the reverse.",
  ],
  [
    'classical',
    'motion-planning',
    'Motion Planning',
    'Configuration space, RRT and its variants, and trajectory optimization.',
  ],
  [
    'classical',
    'control',
    'Control',
    'PID, LQR, MPC and whole-body QP, the stack under every learned policy.',
  ],
  [
    'classical',
    'state-estimation',
    'State Estimation',
    'Kalman filters, factor graphs, and pose estimation from noisy sensors.',
  ],
  [
    'classical',
    'grasp-planning',
    'Grasp Planning',
    'Contact mechanics, grasp quality metrics, and force closure.',
  ],
  [
    'classical',
    'perception',
    'Perception for Manipulation',
    "How camera images become an object's position and orientation.",
  ],
  [
    'classical',
    'scene-representation',
    'Scene Representation and Mapping',
    'From point clouds to Gaussian splats: what a robot remembers about space.',
  ],
  [
    'classical',
    'calibration',
    'Robot Calibration',
    'The measurements that make sensor coordinates agree with motion.',
  ],
  [
    'classical',
    'ros2-for-ml-engineers',
    'ROS 2 for Machine Learning Engineers',
    'ROS 2 as the production boundary around a learned policy.',
  ],
  [
    'frontier',
    'reliability-gap',
    'The Reliability Gap',
    '80% task success is a demo; 99.9% is a product.',
  ],
  [
    'frontier',
    'dexterity',
    'Dexterity',
    'Contact-rich manipulation, touch sensing, in-hand reorientation and deformables.',
  ],
  [
    'frontier',
    'generalization',
    'Generalization',
    "From pi0.5's three unseen homes to Helix 2.5's 30.",
  ],
  [
    'frontier',
    'competing-theses',
    'Competing Theses',
    'Six bets on how robot intelligence gets built.',
  ],
  [
    'frontier',
    'bear-case',
    'The Bear Case',
    'Why this could be another robotics winter.',
  ],
  [
    'frontier',
    'safety-and-assurance',
    'Safety and Assurance',
    'What ships is a verifiable safety layer around the learned policy.',
  ],
  [
    'adjacent',
    'autonomous-vehicles',
    'Autonomous Vehicles',
    'Driving as a robotics problem, down to the long tail.',
  ],
  [
    'adjacent',
    'drones',
    'Drones and Aerial Robotics',
    'Autonomous flight, from state estimation to champion-level racing.',
  ],
  [
    'adjacent',
    'surgical',
    'Surgical Robotics',
    'From da Vinci to Hugo and OTTAVA, authorized one indication at a time.',
  ],
  [
    'adjacent',
    'space',
    'Space Robotics',
    'Robots where repair is impossible, from Mars to orbit.',
  ],
];

/** Publish status lives here, not in the tuple, to keep the taxonomy readable. */
const PUBLISHED = new Set([
  'adjacent/autonomous-vehicles',
  'adjacent/drones',
  'adjacent/surgical',
  'adjacent/space',
  'manipulation/action-chunking',
  'manipulation/bc-foundations',
  'manipulation/comparison-matrix',
  'manipulation/cross-embodiment',
  'manipulation/diffusion-policy',
  'manipulation/generalist-policies',
  'manipulation/hierarchical',
  'manipulation/knowledge-insulation',
  'manipulation/robot-learning-roadmap',
  'manipulation/action-spaces',
  'manipulation/foundation-models',
  'manipulation/pi-line',
  'manipulation/realtime-execution',
  'manipulation/rl-finetuning',
  'manipulation/vla-models',
  'rl-sim2real/humanoid-wbc',
  'rl-sim2real/legged-locomotion',
  'rl-sim2real/parallel-sim-rl',
  'rl-sim2real/reward-design-mpc',
  'rl-sim2real/rl-for-robotics',
  'rl-sim2real/sim2real-transfer',
  'rl-sim2real/why-rl-locomotion',
  'rl-sim2real/offline-rl',
  'world-models/taxonomy',
  'world-models/latent-dynamics',
  'world-models/generative-video',
  'world-models/jepa',
  'world-models/generative-sim',
  'world-models/model-based-robot-learning',
  'world-models/evaluation',
  'world-models/world-models-vs-simulators',
  'data-hardware/data-bottleneck',
  'data-hardware/datasets',
  'data-hardware/hardware-taxonomy',
  'data-hardware/teleop-rigs',
  'data-hardware/evaluation-crisis',
  'data-hardware/industrial-deployment',
  'data-hardware/robot-learning-stack',
  'classical/kinematics',
  'classical/motion-planning',
  'classical/control',
  'classical/state-estimation',
  'classical/grasp-planning',
  'classical/perception',
  'classical/scene-representation',
  'classical/calibration',
  'classical/ros2-for-ml-engineers',
  'frontier/reliability-gap',
  'frontier/dexterity',
  'frontier/generalization',
  'frontier/competing-theses',
  'frontier/bear-case',
  'frontier/safety-and-assurance',
]);

export const modules: ModuleRegistryEntry[] = entries.map(
  ([domain, slug, title, summary]) => ({
    domain,
    slug,
    title,
    summary,
    order:
      entries.filter(([d]) => d === domain).findIndex(([, s]) => s === slug) + 1,
    status: PUBLISHED.has(`${domain}/${slug}`) ? 'published' : 'draft',
  }),
);

/** Modules that ship: routes, sidebar links, search indexes, sitemap. */
export function publishedModules(): ModuleRegistryEntry[] {
  return modules.filter((m) => m.status === 'published');
}

export function getModule(
  domain: string,
  slug: string,
): ModuleRegistryEntry | undefined {
  return modules.find((m) => m.domain === domain && m.slug === slug);
}

/** Registry entries grouped by domain, each group in registry order. */
export function modulesByDomain(): Record<string, ModuleRegistryEntry[]> {
  const grouped: Record<string, ModuleRegistryEntry[]> = {};
  for (const m of modules) {
    (grouped[m.domain] ??= []).push(m);
  }
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.order - b.order);
  }
  return grouped;
}
