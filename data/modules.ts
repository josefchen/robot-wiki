/**
 * Module registry: the taxonomy backbone of robot-atlas.
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

export const DOMAIN_META: Record<Domain, { name: string; description: string }> = {
  manipulation: {
    name: 'Manipulation & Learned Policies',
    description:
      'From behavior cloning to vision-language-action models: how modern robots learn to act.',
  },
  'rl-sim2real': {
    name: 'RL, Sim-to-Real & Locomotion',
    description:
      'Reinforcement learning at scale, massively parallel simulation, and the transfer problem.',
  },
  'world-models': {
    name: 'World Models',
    description:
      'Learned simulators, action-conditioned video prediction, and the JEPA counterargument.',
  },
  'data-hardware': {
    name: 'Data, Hardware & Evaluation',
    description:
      'The embodied data bottleneck, the machines themselves, and the measurement crisis.',
  },
  classical: {
    name: 'Classical Foundations',
    description:
      'Kinematics, planning, control, estimation, and grasping: the stack under every learned policy.',
  },
  frontier: {
    name: 'Frontier & Open Problems',
    description:
      'Reliability, dexterity, generalization, and the competing theses about what wins.',
  },
  adjacent: {
    name: 'Adjacent Domains',
    description:
      'Autonomous vehicles, drones, surgical robotics, and space robotics in brief.',
  },
};

const entries: Array<[Domain, string, string, string]> = [
  // [domain, slug, title, summary]
  [
    'manipulation',
    'bc-foundations',
    'Behavior Cloning Foundations',
    'Covariate shift, compounding error, and why naive imitation breaks in closed loop; the DAgger fix.',
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
    'pi0 to pi0.7: flow-matching action experts, FAST tokenization, open-world generalization, and where open weights stop.',
  ],
  [
    'manipulation',
    'generalist-policies',
    'Other Generalist Policies',
    'Gemini Robotics, GR00T, Helix, Skild, and GO-2: the closed-model landscape and how to read vendor claims.',
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
    'SayCan, code-as-policies, and keypoint affordances; why separate planners gave way to internalized hierarchy.',
  ],
  [
    'manipulation',
    'rl-finetuning',
    'RL Fine-Tuning of Policies',
    'DPPO, ConRFT, Recap, pi_RL, residual RL, and HIL-SERL: closing the reliability gap with on-policy experience.',
  ],
  [
    'manipulation',
    'realtime-execution',
    'Real-Time Execution',
    'Temporal ensembling, real-time chunking, and the latency budgets that decide whether the control loop closes.',
  ],
  [
    'manipulation',
    'cross-embodiment',
    'Cross-Embodiment Transfer',
    'Padded action vectors, motion transfer, and shared relative end-effector frames; the live disagreement.',
  ],
  [
    'manipulation',
    'knowledge-insulation',
    'Knowledge Insulation',
    'Training the VLM backbone on discrete tokens while a flow-matching expert learns actions behind a stop-gradient.',
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
    'Domain randomization, teacher-student distillation, system identification, and real-to-sim correction.',
  ],
  [
    'rl-sim2real',
    'legged-locomotion',
    'Legged Locomotion Lineage',
    'From ANYmal to Unitree and the MIT humanoid line: how learned gaits became the default.',
  ],
  [
    'rl-sim2real',
    'humanoid-wbc',
    'Humanoid Whole-Body Control',
    'H2O, OmniH2O, HumanPlus, ExBody, and ASAP: three decompositions of full-body teleoperation.',
  ],
  [
    'rl-sim2real',
    'reward-design-mpc',
    'Reward Design and the MPC Debate',
    'LLM-written rewards, curricula, and where classical trajectory optimization still wins.',
  ],
  [
    'world-models',
    'taxonomy',
    'What Is a World Model?',
    'Six paradigms share one name: latent dynamics, generative video, JEPA, unified world-action, and symbolic models disambiguated.',
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
    'Cosmos, Genie, and GR-2: action-conditioned video prediction and the conditioning-strength problem.',
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
    'RoboGen, Holodeck, and RoboCasa: generated content inside real physics engines beats generated dynamics.',
  ],
  [
    'data-hardware',
    'data-bottleneck',
    'The Data Bottleneck',
    'Robot-hours versus LLM tokens: the log-log reality of embodied data and teleop-farm economics.',
  ],
  [
    'data-hardware',
    'datasets',
    'Major Datasets',
    'Open X-Embodiment, DROID, BridgeData V2, AgiBot World, and RoboMIND compared.',
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
    'N-of-10 trials, unreported variance, and why 95% per-step success is unusable at 30 steps.',
  ],
  [
    'classical',
    'kinematics',
    'Kinematics',
    'Forward and inverse kinematics, DH parameters, and the Jacobian; the theory behind the 3D playground.',
  ],
  [
    'classical',
    'motion-planning',
    'Motion Planning',
    'RRT and its optimal variants, trajectory optimization, and CHOMP/TrajOpt.',
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
    'frontier',
    'reliability-gap',
    'The Reliability Gap',
    '80% is a demo, 99.9% is a product: what deployment numbers actually show.',
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
    'What the pi0.5 and pi0.7 results demonstrate, and what they do not: the open-world gap.',
  ],
  [
    'frontier',
    'competing-theses',
    'Competing Theses',
    'End-to-end scaling versus hierarchy versus world models versus RL fine-tuning, with falsification criteria.',
  ],
  [
    'frontier',
    'bear-case',
    'The Bear Case',
    'Why this could be another robotics winter, and the milestones that would prove it wrong.',
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
    'Autonomous flight, aggressive maneuvers, and swarm coordination.',
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
  'manipulation/action-chunking',
  'manipulation/bc-foundations',
  'manipulation/comparison-matrix',
  'manipulation/cross-embodiment',
  'manipulation/diffusion-policy',
  'manipulation/generalist-policies',
  'manipulation/hierarchical',
  'manipulation/pi-line',
  'manipulation/realtime-execution',
  'manipulation/rl-finetuning',
  'manipulation/vla-models',
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
