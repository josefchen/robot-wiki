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
 * `readingOrder` is one sentence saying what the landing page's numbered
 * order means, which the one-line `description` cannot: without it a reader
 * cannot tell an editorial order from an arbitrary one. The landing page
 * prints it after the article count.
 */
export const DOMAIN_META: Record<
  Domain,
  { name: string; description: string; readingOrder: string }
> = {
  manipulation: {
    name: 'Manipulation & Learned Policies',
    description:
      'From behavior cloning to vision-language-action models: how modern robots learn to act.',
    readingOrder:
      'Behavior cloning comes first, then the architectures that scaled it and the limits they met, then a curriculum and two reference guides.',
  },
  'rl-sim2real': {
    name: 'RL, Sim-to-Real & Locomotion',
    description:
      'Reinforcement learning at scale, from massively parallel simulation to the transfer problem.',
    readingOrder:
      'The basics come first, then why reinforcement learning won locomotion before manipulation, the simulation and transfer methods behind that result, and the work built on them.',
  },
  'world-models': {
    name: 'World Models',
    description:
      'Learned simulators and action-conditioned video prediction, with the JEPA counterargument.',
    readingOrder:
      'The definition comes first, then the latent, video, representation-space and simulation approaches, then how to learn with, evaluate and compare world models.',
  },
  'data-hardware': {
    name: 'Data, Hardware & Evaluation',
    description:
      'Robot training data, the hardware that collects it and runs the models, plus how results are measured.',
    readingOrder:
      'Data comes first, then the hardware and rigs that collect it, then evaluation, deployment and the full training stack.',
  },
  classical: {
    name: 'Classical Foundations',
    description:
      'The kinematics, planning, control and estimation stack that sits under every learned policy.',
    readingOrder:
      'Each article builds on the ones before it: planning assumes kinematics, and control assumes planning.',
  },
  frontier: {
    name: 'Frontier & Open Problems',
    description:
      'The reliability gap that keeps demos out of production, and the competing theses about closing it.',
    readingOrder:
      'The reliability gap comes first, and the articles after it argue about how to close it.',
  },
  adjacent: {
    name: 'Adjacent Domains',
    description:
      'Autonomous vehicles, drones and surgical and space robotics, each in brief.',
    readingOrder:
      'Each article stands alone: each field met the same robotics problems under its own safety and certification rules.',
  },
};

const entries: Array<[Domain, string, string, string]> = [
  // [domain, slug, title, summary]
  [
    'manipulation',
    'bc-foundations',
    'Behavior Cloning Foundations',
    'Covariate shift and compounding error: why naive imitation breaks in closed loop, with DAgger as the standard fix.',
  ],
  [
    'manipulation',
    'action-chunking',
    'Action Chunking (ACT and ALOHA)',
    'Predicting action sequences instead of single steps: the CVAE structure, the chunk-size tradeoff, and temporal ensembling.',
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
    'RT-1, RT-2, RT-X, Octo, and OpenVLA: web-scale pretraining meets robot control, and the cost of discrete action tokens.',
  ],
  [
    'manipulation',
    'pi-line',
    'The Pi Line',
    'pi0 to pi0.7: flow-matching action experts, FAST tokenization, open-world generalization and which checkpoints are released.',
  ],
  [
    'manipulation',
    'generalist-policies',
    'Other Generalist Policies',
    'Gemini Robotics, GR00T, Helix, Skild, and GO-2: how to read closed-model vendor claims.',
  ],
  [
    'manipulation',
    'comparison-matrix',
    'Comparison Matrix',
    'Every major policy across eight architectural axes: action representation, horizon, frequency, backbone, conditioning, cross-embodiment, hierarchy, openness.',
  ],
  [
    'manipulation',
    'hierarchical',
    'Hierarchical Approaches',
    'SayCan, Code as Policies and keypoint affordances, then the learned and orchestrated hierarchies of Helix, pi0.5 and Gemini Robotics ER 2.',
  ],
  [
    'manipulation',
    'rl-finetuning',
    'RL Fine-Tuning of Policies',
    'DPPO, ConRFT, Recap, pi_RL, residual RL and HIL-SERL: improving a pretrained policy from its own online experience.',
  ],
  [
    'manipulation',
    'realtime-execution',
    'Real-Time Execution',
    'Temporal ensembling and real-time chunking: the latency budgets that decide whether the control loop closes.',
  ],
  [
    'manipulation',
    'cross-embodiment',
    'Cross-Embodiment Transfer',
    'Padded action vectors, relative end-effector actions, latent actions and human-to-robot transfer: how one policy learns from many bodies.',
  ],
  [
    'manipulation',
    'knowledge-insulation',
    'Knowledge Insulation',
    'Training the VLM backbone on discrete tokens while a flow-matching expert learns actions behind a stop-gradient.',
  ],
  [
    'manipulation',
    'robot-learning-roadmap',
    'Robot Learning Curriculum for ML Engineers',
    'A dependency-aware route from supervised learning to real robot policies, with the minimum robotics stack each stage assumes.',
  ],
  [
    'manipulation',
    'action-spaces',
    'Action Spaces for Robot Learning',
    'Joint, Cartesian, torque, impedance, chunked and tokenized actions: what each representation gives the learner and pushes onto the controller.',
  ],
  [
    'manipulation',
    'foundation-models',
    'Foundation Models for Robotics',
    'What foundation means in robotics, how VLA, world-model and multimodal pretraining differ, and what adaptation still costs.',
  ],
  [
    'rl-sim2real',
    'rl-for-robotics',
    'RL for Robotics',
    'Sample efficiency decides which reinforcement learning algorithms a robot can be trained with, from PPO in simulation to offline learning on a fixed dataset.',
  ],
  [
    'rl-sim2real',
    'why-rl-locomotion',
    'Why RL Won Locomotion but Not Manipulation',
    'The MDP simulability gap: contact-rich manipulation resists the simulation that made walking routine.',
  ],
  [
    'rl-sim2real',
    'parallel-sim-rl',
    'Massively Parallel Sim RL',
    'Isaac Lab, Newton, MJX, and Brax: GPU-parallel environments and the wall-clock economics of training.',
  ],
  [
    'rl-sim2real',
    'sim2real-transfer',
    'Sim-to-Real Transfer',
    'Domain randomization, teacher-student distillation, system identification and real-to-sim reconstruction.',
  ],
  [
    'rl-sim2real',
    'legged-locomotion',
    'Legged Locomotion Lineage',
    "From ANYmal's actuator networks to Unitree humanoids and Boston Dynamics: how learned gaits became the default.",
  ],
  [
    'rl-sim2real',
    'humanoid-wbc',
    'Humanoid Whole-Body Control',
    'Tracking retargeted human motion, from PHC to ASAP and GMT, and the three decompositions Figure, NVIDIA and Google DeepMind shipped in 2026.',
  ],
  [
    'rl-sim2real',
    'reward-design-mpc',
    'Reward Design and the MPC Debate',
    'Hand-tuned reward weights, reward code written by language models, curricula and the comparison with model-predictive control.',
  ],
  [
    'rl-sim2real',
    'offline-rl',
    'Offline Reinforcement Learning for Robotics',
    'CQL, IQL, TD3+BC and Q-Transformer under the support constraint, with a decision rule for when behavior cloning is the stronger baseline.',
  ],
  [
    'world-models',
    'taxonomy',
    'What Is a World Model?',
    "A world model predicts how an environment evolves in a form useful for a robot's decisions. Six example groups compared, from DreamerV3 to V-JEPA 2.",
  ],
  [
    'world-models',
    'latent-dynamics',
    'Latent-Dynamics World Models',
    'Dreamer, TD-MPC2, and DayDreamer: compact learned dynamics for imagination-based control.',
  ],
  [
    'world-models',
    'generative-video',
    'Generative Video World Models',
    'Cosmos, Genie and GR-2: action-conditioned video prediction as a simulator, and the weak action conditioning that limits it.',
  ],
  [
    'world-models',
    'jepa',
    'JEPA and the Non-Generative Counterargument',
    "V-JEPA 2 and LeCun's case that prediction in representation space beats pixel generation.",
  ],
  [
    'world-models',
    'generative-sim',
    'Generative Simulation',
    'RoboGen, Holodeck and RoboCasa: generated tasks, scenes and assets inside a physics engine that keeps the dynamics.',
  ],
  [
    'world-models',
    'model-based-robot-learning',
    'Model-Based Robot Learning',
    'Learn dynamics, plan through them, and improve from imagined rollouts: the common structure behind Dreamer, TD-MPC2 and robotic world models.',
  ],
  [
    'world-models',
    'evaluation',
    'World Model Evaluation for Robotics',
    'Testing a world model on what a robot needs from it: action sensitivity, temporal consistency, task progress, policy ranking and agreement with real trials.',
  ],
  [
    'world-models',
    'world-models-vs-simulators',
    'World Models vs Physics Simulators',
    'Learned dynamics, explicit physics and hybrid simulation compared by controllability, coverage, speed, debugging and downstream policy value.',
  ],
  [
    'data-hardware',
    'data-bottleneck',
    'The Data Bottleneck',
    'Robot data is counted in hours and language data in trillions of tokens: the gap, the teleop-farm arithmetic and the data that needs no robot.',
  ],
  [
    'data-hardware',
    'datasets',
    'Major Datasets',
    'Open X-Embodiment, DROID, BridgeData V2, AgiBot World and RoboMIND compared by what each collected, on which robots and under which license.',
  ],
  [
    'data-hardware',
    'hardware-taxonomy',
    'Hardware Taxonomy',
    "Arms, humanoids, hands, sensors, and compute: a buyer's guide from SO-101 to Jetson Thor.",
  ],
  [
    'data-hardware',
    'teleop-rigs',
    'Teleoperation Rigs',
    'ALOHA, GELLO, UMI, and VR teleop: cost, data quality, throughput, and the embodiment gap.',
  ],
  [
    'data-hardware',
    'evaluation-crisis',
    'The Evaluation Crisis',
    'What a success rate hides: trial count, task length, setup and scorer. At 95% per step, a 30-step task succeeds about one time in five.',
  ],
  [
    'data-hardware',
    'industrial-deployment',
    'Industrial Deployment',
    'The installed base robot learning is trying to enter, and the jam-rate arithmetic that decides whether a 99 percent cell ships.',
  ],
  [
    'data-hardware',
    'robot-learning-stack',
    'The Robot Learning Stack',
    'Data capture, schemas, training, simulation, evaluation, serving and robot integration as one reproducible system, with the checkpoint as one part.',
  ],
  [
    'classical',
    'kinematics',
    'Kinematics',
    "How joint angles place a robot's hand, and how to find the angles that reach a target: transforms, DH parameters, the Jacobian and inverse kinematics.",
  ],
  [
    'classical',
    'motion-planning',
    'Motion Planning',
    'Configuration space, RRT and its optimal variants, and trajectory optimization with CHOMP and TrajOpt.',
  ],
  [
    'classical',
    'control',
    'Control',
    'PID, LQR, MPC, and whole-body QP: the classical stack under every learned policy.',
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
    "How a robot turns camera images into an object's position and orientation: calibration, depth, detection, pose estimation and the error each step adds.",
  ],
  [
    'classical',
    'scene-representation',
    'Scene Representation and Mapping',
    'What a robot keeps in memory about the space around it, from point clouds and occupancy grids to Gaussian splats, and which of them a planner can use.',
  ],
  [
    'classical',
    'calibration',
    'Robot Calibration',
    'Camera intrinsics, hand-eye transforms, kinematic zeroes, timing and dynamics: the measurements that make sensor coordinates agree with motion.',
  ],
  [
    'classical',
    'ros2-for-ml-engineers',
    'ROS 2 for Machine Learning Engineers',
    'Topics, services, actions, QoS, tf2, rosbag2 and MoveIt explained as the production boundary around a learned policy.',
  ],
  [
    'frontier',
    'reliability-gap',
    'The Reliability Gap',
    '80% task success is a demo and 99.9% is a product: the per-step arithmetic, the methods closing the gap and the deployment records.',
  ],
  [
    'frontier',
    'dexterity',
    'Dexterity',
    'Contact-rich manipulation, the tactile sensing gap, in-hand reorientation, and deformables.',
  ],
  [
    'frontier',
    'generalization',
    'Generalization',
    'What pi0.5 and pi0.7 show about working in unseen homes, the EgoScale scaling law and the bar no system meets yet.',
  ],
  [
    'frontier',
    'competing-theses',
    'Competing Theses',
    'Six bets on how robot intelligence gets built, from end-to-end scaling to the humanoid form, each with the result that would prove it wrong.',
  ],
  [
    'frontier',
    'bear-case',
    'The Bear Case',
    'Why this could be another robotics winter, and the milestones that would prove it wrong.',
  ],
  [
    'frontier',
    'safety-and-assurance',
    'Safety and Assurance',
    'No industrial safety standard certifies a learned policy, so what ships is a verifiable safety layer around it.',
  ],
  [
    'adjacent',
    'autonomous-vehicles',
    'Autonomous Vehicles',
    'The AV stack as a robotics problem: perception, prediction, planning, and the long tail.',
  ],
  [
    'adjacent',
    'drones',
    'Drones and Aerial Robotics',
    'Autonomous flight from state estimation to champion-level racing, swarm coordination, and delivery under regulation.',
  ],
  [
    'adjacent',
    'surgical',
    'Surgical Robotics',
    'Intuitive, CMR, and Moon Surgical: the precision and reliability bar for certified robots.',
  ],
  [
    'adjacent',
    'space',
    'Space Robotics',
    'NASA/JPL systems, orbital servicing, and ISRU: robotics where repair is impossible.',
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
