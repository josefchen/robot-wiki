/**
 * Module registry: the taxonomy backbone of robot-wiki.
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
 * `readingOrder` states what the domain landing page's ordering actually
 * means, which the one-line `description` cannot: a reader arriving on a
 * landing route sees a numbered list and has no way to know whether the
 * order is editorial or arbitrary. It is also the landing page's only
 * route-unique prose, so it is what makes the route reachable by search
 * rather than only by the sidebar link that points at it.
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
      'behavior cloning first, then the architectures that scaled it, with the cross-embodiment and real-time constraints those architectures ran into at the end.',
  },
  'rl-sim2real': {
    name: 'RL, Sim-to-Real & Locomotion',
    description:
      'Reinforcement learning at scale, from massively parallel simulation to the transfer problem.',
    readingOrder:
      'why reinforcement learning took locomotion before manipulation, then the parallel-simulation machinery behind that result, then the transfer gap it left over.',
  },
  'world-models': {
    name: 'World Models',
    description:
      'Learned simulators and action-conditioned video prediction, with the JEPA counterargument.',
    readingOrder:
      'what the term denotes, then the latent-dynamics and generative-video families that each claim it, then the argument that generation is the wrong objective entirely.',
  },
  'data-hardware': {
    name: 'Data, Hardware & Evaluation',
    description:
      'The embodied data bottleneck and the machines themselves, with the measurement crisis behind every benchmark claim.',
    readingOrder:
      'where embodied training data comes from, then the rigs that produce it, then why two reported benchmark numbers are usually not comparable at all.',
  },
  classical: {
    name: 'Classical Foundations',
    description:
      'The kinematics, planning, control and estimation stack that sits under every learned policy.',
    readingOrder:
      'a dependency chain rather than a survey. Kinematics is assumed by planning and planning by control. Each entry leans on whatever came before it, so the last two rest on the whole chain.',
  },
  frontier: {
    name: 'Frontier & Open Problems',
    description:
      'The reliability gap that keeps demos out of production, and the competing theses about closing it.',
    readingOrder:
      'the reliability gap first, because the entries after it are competing arguments about how to close that gap.',
  },
  adjacent: {
    name: 'Adjacent Domains',
    description:
      'Autonomous vehicles, drones and surgical and space robotics, each in brief.',
    readingOrder:
      'a survey rather than a sequence, so any entry stands on its own: each field met the same underlying problems under a different safety and certification regime.',
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
    'pi0 to pi0.7: flow-matching action experts, FAST tokenization, open-world generalization, and where open weights stop.',
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
    'Temporal ensembling and real-time chunking: the latency budgets that decide whether the control loop closes.',
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
    'rl-for-robotics',
    'RL for Robotics',
    'Sample efficiency decides which reinforcement learning algorithms a robot can actually be trained with, from PPO in simulation to offline learning on a fixed dataset.',
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
    'Motion tracking from PHC to ASAP and GMT, and the three decompositions of 2026.',
  ],
  [
    'rl-sim2real',
    'reward-design-mpc',
    'Reward Design and the MPC Debate',
    'LLM-written rewards and curricula; where classical trajectory optimization still wins.',
  ],
  [
    'world-models',
    'taxonomy',
    'What Is a World Model?',
    'Six paradigms share one name: latent dynamics, decoder-free latent, generative video, JEPA, unified world-action, and symbolic.',
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
    'Generated content inside real physics engines beats generated dynamics: RoboGen, Holodeck, RoboCasa.',
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
    'Open X-Embodiment, DROID, BridgeData V2, AgiBot World, RoboMIND: five datasets compared.',
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
    'Why N-of-10 trials and unreported variance mislead: 95% per-step success is unusable at 30 steps.',
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
    'classical',
    'perception',
    'Perception for Manipulation',
    'Calibration through 6-DoF pose: the pipeline that finds the object, and its error budget.',
  ],
  [
    'classical',
    'scene-representation',
    'Scene Representation and Mapping',
    'What a robot remembers about the space around it, and why the map that renders best is not the map a planner can use.',
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
    'frontier',
    'safety-and-assurance',
    'Safety and Assurance',
    'Industrial robotics can certify a control system but not a learned policy, so what ships is a verifiable safety layer wrapped around an unverifiable one.',
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
  'world-models/taxonomy',
  'world-models/latent-dynamics',
  'world-models/generative-video',
  'world-models/jepa',
  'world-models/generative-sim',
  'data-hardware/data-bottleneck',
  'data-hardware/datasets',
  'data-hardware/hardware-taxonomy',
  'data-hardware/teleop-rigs',
  'data-hardware/evaluation-crisis',
  'classical/kinematics',
  'classical/motion-planning',
  'classical/control',
  'classical/state-estimation',
  'classical/grasp-planning',
  'classical/perception',
  'classical/scene-representation',
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
