/**
 * The search-facing title, meta description and head term of every route
 * the sitemap lists, plus the two noindex utility routes.
 *
 * Titles are stored without the " | Robot Wiki" suffix that the root
 * layout template appends, so a stored title may run to 47 characters and
 * the rendered one to 60. Home is the exception: its title is the layout
 * default, rendered as written and exempt from the suffix. Each title leads
 * with the head term, the H1 topic or the first intent query, and each
 * description contains the head term. Article and hub entries start from
 * the SEO review's proposals and keep only what the page itself says;
 * where a proposal already carries the H1 topic or its abbreviation, that
 * phrase is the head term. `queries` are the intent queries the domain report
 * lists for the page, first query first. `scripts/check-seo.ts` holds the
 * exported pages to these limits.
 */
import { DEBUTS, PUBLIC_COMPANIES } from '../data/public-companies.ts';

export interface RouteSeoProfile {
  title: string;
  description: string;
  headTerm: string;
  queries: readonly string[];
}

export const ROUTE_SEO_PROFILES: Readonly<Record<string, RouteSeoProfile>> = {
  '/now/': {
    title: 'Robotics Now: Trends, Changes, Open Questions',
    headTerm: 'robotics now',
    description:
      'Robotics now: where the field stands and which way it is moving, in dated trends, recent developments, open questions and promises against delivery.',
    queries: [],
  },
  '/': {
    title: 'Robot Wiki: Modern Robotics and Robot Learning',
    headTerm: 'robot learning',
    description:
      'Citation-first encyclopedia of modern robot learning. Robot Wiki covers VLA models, reinforcement learning, sim-to-real, world models and robot control.',
    queries: [],
  },
  '/market-map/': {
    title: 'Robotics Market Map: 100+ Companies, 6 Segments',
    headTerm: 'robotics market map',
    description:
      'Robotics market map: over 100 robotics and embodied-AI companies in six segments, from humanoids to foundation models, each with its latest round.',
    queries: [],
  },
  // The counts come from the rows, as in publicPageDescription() in
  // lib/public-companies-page.ts, which this module cannot import: scripts
  // load it under plain node, where the @/ alias does not resolve.
  '/market-map/public/': {
    title: 'Public Robotics Companies, Debuts and IPO Watch',
    headTerm: 'public robotics companies',
    description:
      `Public robotics companies: ${PUBLIC_COMPANIES.length} listed companies by market value, ` +
      `the ${DEBUTS.length} debuts of 2026 against their offer price, and who is preparing to list.`,
    queries: [],
  },
  '/market-map/rounds/': {
    title: 'Robotics Funding Rounds of the Last 120 Days',
    headTerm: 'robotics funding rounds',
    description:
      'Robotics funding rounds of the last 120 days, with listings, acquisitions and shutdowns: amounts, lead investors and a source for every row.',
    queries: [],
  },
  '/playground/': {
    title: '3D Kinematics Playground for a Robot Arm',
    headTerm: '3D kinematics playground',
    description:
      '3D kinematics playground for the SO-101 robot arm: joint sliders for forward kinematics, click-to-reach inverse kinematics and trajectory replay.',
    queries: [],
  },
  '/companies/unitree/': {
    title: 'Unitree Robotics: Products, Prices and Results',
    headTerm: 'Unitree Robotics',
    description:
      'Unitree Robotics in sourced tables: product prices and specs, results and units sold, its Shanghai listing, shareholders, timeline and security flaws.',
    queries: [],
  },
  '/how-robots-work/': {
    title: 'How Robots Work: Interactive 3D Explainers',
    headTerm: 'how robots work',
    description:
      'How robots work, in interactive 3D explainers: guess first, then drag, push or tilt a robot model to see why, with a source for every number.',
    queries: [],
  },
  '/glossary/': {
    title: 'Robotics Glossary: Robot Learning Terms Defined',
    headTerm: 'robotics glossary',
    description:
      'Robotics glossary with more than 150 cited definitions of robot and robot learning terms, from action chunking and VLA to Kalman filters and LQR.',
    queries: [],
  },
  '/robots-in-3d/': {
    title: 'Robots in 3D: Maker Models and Their Files',
    headTerm: 'robots in 3D',
    description:
      "Robots in 3D, drawn in the browser from each maker's own URDF and meshes, and the repository, commit and licence of the model files makers publish.",
    queries: [],
  },
  '/credits/': {
    title: 'Credits: Image Sources, Licences and Author',
    headTerm: 'credits',
    description:
      'Credits for Robot Wiki: its author, and the creator, source and licence of every photograph, diagram and logo shown on the site.',
    queries: [],
  },
  '/editorial-policy/': {
    title: 'Editorial Policy: Sources, Review, Corrections',
    headTerm: 'editorial policy',
    description:
      'Robot Wiki\'s editorial policy: how its robotics articles are researched, cited, reviewed, corrected and updated, plus how to report an error.',
    queries: [],
  },
  '/about/': {
    title: 'About Robot Wiki: Scope and Reading Order',
    headTerm: 'about',
    description:
      'About Robot Wiki: what it covers and excludes, the order to read its articles in, what they assume you know and how its citations work.',
    queries: [],
  },
  '/changes/': {
    title: 'Recent Changes to Robotics Articles',
    headTerm: 'recent changes',
    description:
      'Recent changes to Robot Wiki: a dated note on what changed in each robotics article, newest first, with a link to the article.',
    queries: [],
  },
  '/a-z/': {
    title: 'A-Z Index of Robotics Articles and Terms',
    headTerm: 'A-Z index',
    description:
      'A-Z index of every published Robot Wiki article and glossary term, listed alphabetically with a link to each article and definition.',
    queries: [],
  },
  '/privacy/': {
    title: 'Privacy and Anonymous Analytics',
    headTerm: 'privacy',
    description:
      'Privacy on Robot Wiki: what anonymous traffic information it measures, why it is collected and what is deliberately excluded.',
    queries: [],
  },
  '/search/': {
    title: 'Search',
    headTerm: 'search',
    description:
      'Search Robot Wiki: full-text over article prose plus the structured data layer of methods, companies and datasets.',
    queries: [],
  },
  '/manipulation/': {
    title: 'Robot Learning and Manipulation Policies',
    headTerm: 'robot learning',
    description:
      'Guides to robot learning for manipulation: behavior cloning, action chunking, diffusion policy, VLA models, RL fine-tuning and cross-embodiment transfer.',
    queries: ['robot learning manipulation', 'learned robot manipulation policies'],
  },
  '/manipulation/bc-foundations/': {
    title: 'Behavior Cloning, DAgger and Compounding Error',
    headTerm: 'behavior cloning',
    description:
      'Behavior cloning copies demonstrations, and small errors compound. DAgger and recovery data help: DART gained 62% on average at grasping in clutter.',
    queries: ['behavior cloning robotics', 'imitation learning compounding error', 'DAgger'],
  },
  '/manipulation/action-chunking/': {
    title: 'Action Chunking with Transformers (ACT), PACE',
    headTerm: 'action chunking',
    description:
      'Action chunking has a robot policy predict a burst of moves at once. In ACT\'s simulation, success rose from 1% at chunk size 1 to 44% at 100.',
    queries: ['action chunking', 'action chunking with transformers', 'ACT ALOHA', 'PACE phase-aware chunk execution'],
  },
  '/manipulation/diffusion-policy/': {
    title: 'Diffusion Policy Explained (Chi et al., 2023)',
    headTerm: 'diffusion policy',
    description:
      'Diffusion Policy turns random noise into robot actions step by step. In simulation it averaged a 46.9% relative gain over the best earlier method per task.',
    queries: ['diffusion policy', 'diffusion policy robotics', 'diffusion policy paper'],
  },
  '/manipulation/vla-models/': {
    title: 'What Is a VLA Model? RT-2, Octo, OpenVLA, Pi0',
    headTerm: 'vision-language-action model',
    description:
      'A vision-language-action model (VLA) is a vision-language model taught to output robot moves. OpenVLA-OFT took OpenVLA from 4.2 to 109.7 actions a second.',
    queries: ['what is a VLA model', 'vision-language-action model', 'VLA model', 'OpenVLA'],
  },
  '/manipulation/pi-line/': {
    title: 'Pi0, Pi0.5, Pi0.6 and Pi0.7 Explained',
    headTerm: 'pi0',
    description:
      'Physical Intelligence\'s pi0 line, from pi0 (October 2024) to pi0.7 (April 2026). pi0 turns noise into a 50-action chunk in 10 flow-matching steps.',
    queries: ['pi0', 'Physical Intelligence pi0', 'pi0.5', 'pi0.6', 'pi0.7'],
  },
  '/manipulation/generalist-policies/': {
    title: 'Generalist Robot Policies: Gemini, GR00T, Helix',
    headTerm: 'generalist robot policies',
    description:
      'Generalist robot policies from Google DeepMind, NVIDIA, Figure, AgiBot and Skild. Figure\'s Helix reasons at 7 to 9 Hz and sends motor commands at 200 Hz.',
    queries: ['generalist robot policy', 'robot foundation model companies', 'Helix vs GR00T vs Gemini Robotics'],
  },
  '/manipulation/comparison-matrix/': {
    title: 'VLA Models Compared: 23 Policies, RT-1 to Pi0.7',
    headTerm: 'VLA models compared',
    description:
      'VLA models compared in one table: 23 robot policies from RT-1 to pi0.7 on eight design choices, including action format and downloadable weights.',
    queries: ['VLA models compared', 'VLA model architecture', 'VLA architecture'],
  },
  '/manipulation/hierarchical/': {
    title: 'Hierarchical VLAs: SayCan, Hi Robot and Pi0.5',
    headTerm: 'hierarchical robot policies',
    description:
      'Hierarchical robot policies split what to do from how to move, from SayCan to Hi Robot and pi0.5. Text2Motion solved 82% of long-horizon problems.',
    queries: ['hierarchical VLA', 'LLM robot planning', 'SayCan code as policies'],
  },
  '/manipulation/rl-finetuning/': {
    title: 'RL Fine-Tuning for VLAs and Robot Policies',
    headTerm: 'RL fine-tuning',
    description:
      'RL fine-tuning improves a robot policy from its own attempts: DPPO, Recap and HIL-SERL, which trains most tasks on a real robot in 1 to 2.5 hours.',
    queries: ['RL fine-tuning VLA', 'reinforcement learning robot policy fine-tuning'],
  },
  '/manipulation/realtime-execution/': {
    title: 'Real-Time Chunking (RTC) and VLA Latency',
    headTerm: 'real-time chunking',
    description:
      'Real-time chunking and VLA latency, measured: pi0.6 takes 63 ms per chunk on one H100, and 100 ms of lag nearly halves success on moving targets.',
    queries: ['real-time chunking', 'real-time execution of action chunking flow policies', 'VLA inference latency', 'robot policy control frequency'],
  },
  '/manipulation/cross-embodiment/': {
    title: 'Cross-Embodiment Learning for Robot Policies',
    headTerm: 'cross-embodiment learning',
    description:
      'Cross-embodiment learning trains one policy on many robots and human video: padded actions, soft prompts, relative end-effector actions and human data.',
    queries: ['cross-embodiment robot learning', 'human video to robot transfer'],
  },
  '/manipulation/knowledge-insulation/': {
    title: 'Knowledge Insulation by Physical Intelligence',
    headTerm: 'knowledge insulation',
    description:
      'Knowledge insulation trains a VLA\'s backbone on action tokens and blocks the action expert\'s gradients. pi0 needed 7.5x the training steps of pi0.5 + KI.',
    queries: ['knowledge insulation', 'knowledge insulation Physical Intelligence', 'knowledge insulation VLA', 'stop gradient VLA training'],
  },
  '/manipulation/robot-learning-roadmap/': {
    title: 'Robot Learning Roadmap for ML Engineers',
    headTerm: 'robot learning roadmap',
    description:
      'A step-by-step robot learning roadmap for ML engineers: frames, data collection, behavior cloning, action spaces, VLAs, evaluation, and when to add RL.',
    queries: ['robot learning roadmap', 'how to learn robot learning', 'robotics for ML engineers'],
  },
  '/manipulation/action-spaces/': {
    title: 'Robot Action Spaces: Joint, Cartesian, Torque',
    headTerm: 'robot action space',
    description:
      'How to choose a robot action space for learning: joint, Cartesian, torque, impedance, chunked and tokenized actions, and what each asks of the controller.',
    queries: ['robot action space', 'joint vs Cartesian control learning'],
  },
  '/manipulation/foundation-models/': {
    title: 'Robot Foundation Models Explained',
    headTerm: 'robot foundation model',
    description:
      'What makes a robot foundation model: VLAs, world action models and human-video pretraining, with 2026 evidence on scaling, transfer and adaptation cost.',
    queries: ['robot foundation model', 'foundation models for robotics'],
  },
  '/classical/': {
    title: 'Classical Robotics: Kinematics to Control',
    headTerm: 'classical robotics',
    description:
      'Kinematics, planning, control, estimation, grasping, perception, mapping, calibration and ROS 2: the classical robotics stack under learned robot policies.',
    queries: ['classical robotics', 'robotics fundamentals for ML engineers'],
  },
  '/classical/kinematics/': {
    title: 'Robot Kinematics: FK, IK and the Jacobian',
    headTerm: 'robot kinematics',
    description:
      'Forward and inverse robot kinematics for arms: transforms, DH parameters, the Jacobian, singularities and IK solvers, with a live arm.',
    queries: ['robot kinematics', 'forward and inverse kinematics'],
  },
  '/classical/motion-planning/': {
    title: 'Robot Motion Planning: RRT, RRT* and TrajOpt',
    headTerm: 'robot motion planning',
    description:
      'Robot motion planning finds collision-free paths: configuration space, PRM, RRT and RRT*, CHOMP, TrajOpt, GPU planners and the handoff to learned policies.',
    queries: ['robot motion planning', 'RRT vs RRT*', 'trajectory optimization robotics'],
  },
  '/classical/control/': {
    title: 'Robot Control: PID, LQR, MPC and Impedance',
    headTerm: 'robot control',
    description:
      'Robot control explained: PID, LQR, model predictive control, whole-body QP and impedance control, with interactive labs and how learned policies use them.',
    queries: ['robot control PID LQR MPC', 'impedance control robot'],
  },
  '/classical/state-estimation/': {
    title: 'Robot State Estimation: Kalman Filters, EKF',
    headTerm: 'robot state estimation',
    description:
      'Kalman filter, EKF, UKF, particle filters and factor graphs for robot state estimation: how noisy sensors become a state estimate with uncertainty.',
    queries: ['Kalman filter robotics', 'robot state estimation'],
  },
  '/classical/grasp-planning/': {
    title: 'Grasp Planning: Force Closure and Grasp Quality',
    headTerm: 'grasp planning',
    description:
      'Robot grasp planning: friction cones, grasp wrench space, force closure and the Ferrari-Canny metric, plus learned grasp generators and datasets.',
    queries: ['grasp planning', 'force closure grasp'],
  },
  '/classical/perception/': {
    title: 'Robot Perception for Manipulation: 6D Pose',
    headTerm: 'robot perception',
    description:
      'The robot perception pipeline for grasping: camera and hand-eye calibration, depth sensing, open-vocabulary segmentation and 6-DoF pose estimation.',
    queries: ['robot perception', '6D pose estimation robotics'],
  },
  '/classical/scene-representation/': {
    title: 'Robot Mapping: Occupancy, SDF, SLAM, Splats',
    headTerm: 'scene representation',
    description:
      'Robot scene representations compared: point clouds, occupancy grids, signed-distance fields, meshes, NeRF, Gaussian splats, SLAM and costmaps.',
    queries: ['robot mapping', 'occupancy grid vs signed distance field', 'Gaussian splatting robotics'],
  },
  '/classical/calibration/': {
    title: 'Robot Calibration: Hand-Eye and Camera',
    headTerm: 'robot calibration',
    description:
      'Robot calibration step by step: camera intrinsics, depth, hand-eye AX=XB, kinematic and tool calibration, time sync and actuator identification.',
    queries: ['hand-eye calibration', 'robot camera calibration'],
  },
  '/classical/ros2-for-ml-engineers/': {
    title: 'ROS 2 for ML Engineers: Topics, QoS, tf2',
    headTerm: 'ROS 2',
    description:
      'ROS 2 for machine-learning engineers: topics, services, actions, QoS, tf2, rosbag2, MoveIt and GPU message buffers around a deployed robot policy.',
    queries: ['ROS 2 for machine learning', 'ROS 2 tutorial for ML engineers'],
  },
  '/rl-sim2real/': {
    title: 'Reinforcement Learning and Sim-to-Real',
    headTerm: 'reinforcement learning',
    description:
      'Robot reinforcement learning explained: GPU-parallel simulation, sim-to-real transfer, legged and humanoid locomotion, reward design and offline RL.',
    queries: ['reinforcement learning robotics sim to real'],
  },
  '/rl-sim2real/rl-for-robotics/': {
    title: 'Reinforcement Learning for Robotics',
    headTerm: 'reinforcement learning for robotics',
    description:
      'Reinforcement learning for robotics: PPO in GPU simulation, SAC on hardware, offline and human-in-the-loop RL, and why sample cost decides the method.',
    queries: ['reinforcement learning for robotics', 'robot reinforcement learning'],
  },
  '/rl-sim2real/why-rl-locomotion/': {
    title: 'Sim-to-Real RL: Locomotion vs Manipulation',
    headTerm: 'sim-to-real RL',
    description:
      'Why sim-to-real RL made legged walking routine while dexterous manipulation still relies on demonstrations: contact, sensing, rewards and resets.',
    queries: ['why reinforcement learning works for locomotion but not manipulation', 'sim-to-real manipulation RL'],
  },
  '/rl-sim2real/parallel-sim-rl/': {
    title: 'GPU-Parallel Simulation for Robot RL',
    headTerm: 'GPU-parallel simulation',
    description:
      'How GPU-parallel simulation trains robot policies in minutes: Isaac Gym, Isaac Lab 3.0, Newton, MuJoCo Warp, MJX and Genesis, with measured throughput.',
    queries: ['GPU parallel simulation reinforcement learning', 'Isaac Lab vs MuJoCo Playground'],
  },
  '/rl-sim2real/sim2real-transfer/': {
    title: 'Sim-to-Real Transfer for Robot Learning',
    headTerm: 'sim-to-real transfer',
    description:
      'Sim-to-real transfer in robotics: domain randomization, teacher-student distillation, system identification and real-to-sim scene reconstruction.',
    queries: ['sim-to-real transfer', 'sim2real robotics'],
  },
  '/rl-sim2real/legged-locomotion/': {
    title: 'Legged Locomotion with RL: ANYmal to Humanoids',
    headTerm: 'legged locomotion',
    description:
      'How reinforcement learning became the default for legged locomotion, from ANYmal and Spot to Atlas and Unitree G1, with training times and field results.',
    queries: ['legged robot locomotion reinforcement learning', 'quadruped RL locomotion'],
  },
  '/rl-sim2real/humanoid-wbc/': {
    title: 'Humanoid Whole-Body Control, Sim to Real',
    headTerm: 'humanoid whole-body control',
    description:
      'Humanoid whole-body control is trained in simulation to track human motion, then run on the robot. PHC imitated 98.9% of 11,313 motion-capture clips.',
    queries: ['humanoid whole-body control', 'sim2real whole-body control humanoid', 'humanoid motion tracking RL'],
  },
  '/rl-sim2real/motion-retargeting/': {
    title: 'Motion Retargeting: Six Methods Compared',
    headTerm: 'motion retargeting',
    description:
      "Motion retargeting maps human motion onto a humanoid. Six methods compared; on OMOMO, OmniRetarget's peak penetration was 1.34 cm against GMR's 8.50 cm.",
    queries: ['motion retargeting humanoid', 'human to humanoid motion retargeting'],
  },
  '/rl-sim2real/reward-design-mpc/': {
    title: 'Reward Design for Robot RL, and MPC vs RL',
    headTerm: 'reward design',
    description:
      'Reward design for legged robots: Rudin\'s walking reward summed nine weighted terms; Eureka\'s rewards beat the shaped original on 83% of 29 tasks.',
    queries: ['reward design reinforcement learning robotics', 'MPC vs reinforcement learning'],
  },
  '/rl-sim2real/offline-rl/': {
    title: 'Offline Reinforcement Learning for Robotics',
    headTerm: 'offline RL',
    description:
      'Offline RL for robots: CQL, IQL, TD3+BC, Q-Transformer and offline-to-online fine-tuning, with a rule for when behavior cloning is the better baseline.',
    queries: ['offline reinforcement learning robotics', 'offline RL vs behavior cloning'],
  },
  '/world-models/': {
    title: 'World Models for Robotics: Types, Uses, Limits',
    headTerm: 'world models',
    description:
      'How robots use world models: Dreamer and TD-MPC2, Cosmos and Genie video models, V-JEPA, generative simulation, and how to evaluate each.',
    queries: ['world models robotics', 'world models for robots'],
  },
  '/world-models/taxonomy/': {
    title: 'What Is a World Model? Definition and Types',
    headTerm: 'world model',
    description:
      'A world model predicts how the world changes under a robot\'s action. Six types compared, from Dreamer and TD-MPC2 to Cosmos, Genie 3 and V-JEPA 2.',
    queries: ['what is a world model'],
  },
  '/world-models/latent-dynamics/': {
    title: 'Latent-Dynamics World Models: Dreamer, TD-MPC2',
    headTerm: 'latent-dynamics world models',
    description:
      'How latent-dynamics world models work: the RSSM, Dreamer 4 offline imagination training, TD-MPC2 and Newt planning, and results on real robots.',
    queries: ['Dreamer world model', 'TD-MPC2', 'latent dynamics model'],
  },
  '/world-models/generative-video/': {
    title: 'Video World Models: Cosmos 3 and Genie 3',
    headTerm: 'video world models',
    description:
      'Video world models show what a robot\'s camera would see after an action. Genie 3 runs at 24 fps in 720p; RoboWorld\'s rankings matched real ones at 0.989.',
    queries: ['video world models robotics', 'Cosmos world model', 'Genie 3 robotics'],
  },
  '/world-models/jepa/': {
    title: 'JEPA World Models for Robots: V-JEPA 2',
    headTerm: 'JEPA world models',
    description:
      'JEPA world models predict embeddings, not pixels. V-JEPA 2 and 2.1, LeWorldModel and SkyJEPA results, AMI Labs, and the case against generation.',
    queries: ['JEPA world model', 'V-JEPA 2', 'JEPA vs generative'],
  },
  '/world-models/generative-sim/': {
    title: 'Generative Simulation with RoboGen and RoboCasa',
    headTerm: 'generative simulation',
    description:
      'Generative simulation has AI write a simulator\'s tasks and scenes. RoboCasa success rose from 26.3% at 100 generated demos per task to 47.6% at 3,000.',
    queries: ['generative simulation', 'generative simulation robotics', 'RoboGen', 'RoboCasa'],
  },
  '/world-models/model-based-robot-learning/': {
    title: 'Model-Based Robot Learning with World Models',
    headTerm: 'model-based robot learning',
    description:
      'Model-based robot learning: learn dynamics, plan with MPC or train in imagination. Dreamer, TD-MPC2, SimDist and real excavator and insertion results.',
    queries: ['model-based reinforcement learning robotics', 'model-based RL robot'],
  },
  '/world-models/evaluation/': {
    title: 'World Model Evaluation and Benchmarks',
    headTerm: 'world model evaluation',
    description:
      'Robot world model evaluation: action sensitivity, rollout consistency, policy ranking vs real trials, plus WorldArena, WorldSimProbe and Veo.',
    queries: ['world model evaluation', 'world model benchmark robotics'],
  },
  '/world-models/world-models-vs-simulators/': {
    title: 'World Models vs Physics Simulators for Robotics',
    headTerm: 'world models vs physics simulators',
    description:
      'Learned world models vs physics simulators like MuJoCo Warp and Newton: cost per query, counterfactual coverage, and when to use hybrids.',
    queries: ['world model vs simulator', 'world models vs physics engines'],
  },
  '/frontier/': {
    title: 'Robot Learning Open Problems',
    headTerm: 'robot learning open problems',
    description:
      'Robot learning open problems, ranked by evidence: the reliability gap, dexterity, generalization, competing scaling bets, the bear case and robot safety.',
    queries: ['open problems in robot learning', 'robotics challenges 2026'],
  },
  '/frontier/reliability-gap/': {
    title: 'Robot Reliability Gap: 80% Demo, 99.9% Product',
    headTerm: 'robot reliability',
    description:
      'Robot reliability compounds: 95% per step gives 21% over a 30-step task, 99.9% gives 97%. What closes the gap, and what Agility, Figure and Tesla report.',
    queries: ['robot reliability', 'why robot demos fail in production', '99.9% robot success rate'],
  },
  '/frontier/dexterity/': {
    title: 'Robot Dexterity and Tactile Hands',
    headTerm: 'robot dexterity',
    description:
      'Why robot dexterity is unsolved: tactile sensing, in-hand manipulation, deformables, and 2026 robot hands compared on published specs.',
    queries: ['robot dexterity', 'dexterous robot hands', 'tactile sensing robot hand'],
  },
  '/frontier/generalization/': {
    title: 'Robot Generalization in Homes It Has Never Seen',
    headTerm: 'robot generalization',
    description:
      'Robot generalization to unseen homes, in numbers: Figure reports 56% zero-shot success for Helix 2.5 in 30 homes, against 9% when trained from scratch.',
    queries: ['robot generalization', 'zero-shot robot unseen homes', 'generalist robot policy'],
  },
  '/frontier/competing-theses/': {
    title: 'VLAs vs World Models: How Robots Scale',
    headTerm: 'VLAs vs world models',
    description:
      'VLAs vs world models and five other bets on robot intelligence: hierarchy, RL, teleoperation, humanoids and general models, each with a kill test.',
    queries: ['VLA vs world model', 'how will robot learning scale', 'robot foundation model debate'],
  },
  '/frontier/bear-case/': {
    title: 'Humanoid Robot Hype: The Bear Case',
    headTerm: 'humanoid robot hype',
    description:
      'The skeptic case on humanoid robot hype in 2026: Brooks\'s predictions, record funding, and eight milestones that would refute it.',
    queries: ['humanoid robot hype', 'humanoid robot bubble', 'robotics winter'],
  },
  '/frontier/safety-and-assurance/': {
    title: 'Robot Safety Standards for AI and Humanoids',
    headTerm: 'robot safety standards',
    description:
      'Robot safety standards: ISO 10218:2025, the ISO 25785-1 humanoid draft, EU machinery rules from 2027, and why a learned policy cannot be certified alone.',
    queries: ['humanoid robot safety standards', 'ISO 25785', 'robot safety standards AI'],
  },
  '/data-hardware/': {
    title: 'Robot Learning Data, Hardware and Benchmarks',
    headTerm: 'robot learning data',
    description:
      'Where robot learning data comes from, the arms, humanoids and rigs that collect it, and how to read robot learning benchmark claims.',
    queries: ['robot learning data and hardware'],
  },
  '/data-hardware/data-bottleneck/': {
    title: 'Robot Learning Data Bottleneck: Hours vs Tokens',
    headTerm: 'robot learning data bottleneck',
    description:
      'Robot learning data bottleneck: how many hours of robot data exist in 2026, from DROID, AgiBot World and EgoScale to 100,000-hour private corpora.',
    queries: ['robot learning data bottleneck', 'how much data do robots need'],
  },
  '/data-hardware/data-market/': {
    title: 'Robot Training Data: Prices, Sellers, Wages',
    headTerm: 'robot training data',
    description:
      'Robot training data sells by the hour: RMB 500 to 1,000 for real-robot data in China, list prices elsewhere, collector wages and open licenses.',
    queries: ['robot training data cost per hour', 'robot data collection companies'],
  },
  '/data-hardware/datasets/': {
    title: 'Robot Learning Datasets: DROID, BridgeData V2',
    headTerm: 'robot learning datasets',
    description:
      'Robot learning datasets compared by hours, robots and license. Open X-Embodiment pools over a million trajectories from 22 robot types; DROID has 76,000.',
    queries: ['robot learning datasets', 'open robot manipulation datasets comparison', 'BridgeData V2'],
  },
  '/data-hardware/hardware-taxonomy/': {
    title: 'Robot Prices in 2026: Arms, Hands and Humanoids',
    headTerm: 'robot prices',
    description:
      'Robot prices in 2026 as makers list them: about $122 in parts for an SO-101 arm, $29,900 for a Unitree H2 humanoid, plus hands, sensors and Jetson Thor.',
    queries: ['humanoid robot price 2026', 'robot arm price', 'robot hardware'],
  },
  '/data-hardware/teleop-rigs/': {
    title: 'Teleoperation Rig Costs: GELLO, ALOHA and UMI',
    headTerm: 'teleoperation rig',
    description:
      'Teleoperation rig costs, from a $300 GELLO parts list to a $23,996 Trossen bimanual kit. UMI collects 111 demos an hour against 35 for spacemouse teleop.',
    queries: ['teleoperation rig cost', 'robot teleoperation data collection', 'ALOHA vs UMI'],
  },
  '/data-hardware/evaluation-crisis/': {
    title: 'Robot Policy Evaluation and Benchmarks',
    headTerm: 'robot policy evaluation',
    description:
      'Why robot policy evaluation success rates mislead: trial counts, horizon length, LIBERO-Plus robustness, sim proxies and real-robot arenas like RoboArena.',
    queries: ['robot learning benchmarks', 'how to evaluate robot policies'],
  },
  '/data-hardware/industrial-deployment/': {
    title: 'Industrial Robot Deployment: 2026 Stats and ROI',
    headTerm: 'industrial robot deployment',
    description:
      'Industrial robot deployment per IFR 2026: 5 million robots in operation, 600,000+ installed in 2025. Cell costs, payback and jam-rate arithmetic.',
    queries: ['industrial robot statistics 2026', 'robot cell ROI payback'],
  },
  '/data-hardware/robot-learning-stack/': {
    title: 'Robot Learning Pipeline: Data to Deployment',
    headTerm: 'robot learning stack',
    description:
      'The robot learning stack as seven contracts: calibration, episode capture, dataset schema, training, sim and real evaluation, and ROS 2 serving.',
    queries: ['robot learning pipeline', 'MLOps for robotics'],
  },
  '/data-hardware/research-arms-compared/': {
    title: 'Robotic Arms for Research: SO-101 to Franka FR3',
    headTerm: 'robotic arms for research',
    description:
      'Robotic arms for research compared: 11 arms from the SO-101 to the Franka FR3 on reach, repeatability, control rate, LeRobot and ROS 2 support.',
    queries: ['best robotic arm for research', 'robot arm for robot learning', 'lerobot supported robots'],
  },
  '/adjacent/': {
    title: 'Robotics Applications Outside the Lab',
    headTerm: 'robotics applications',
    description:
      'Robotics applications outside the lab: self-driving cars, drones, surgical robots and space robots, plus what each field teaches robot learning.',
    queries: ['robotics applications: self-driving, drones, surgical robots, space robots'],
  },
  '/adjacent/autonomous-vehicles/': {
    title: 'Autonomous Driving Stack: Modular vs End-to-End',
    headTerm: 'autonomous driving stack',
    description:
      'How the autonomous driving stack perceives, predicts, plans and controls, the modular vs end-to-end debate, and 2026 robotaxi safety and deployment data.',
    queries: ['autonomous driving stack', 'how self-driving cars work (perception, prediction, planning, control)', 'modular vs end-to-end autonomous driving'],
  },
  '/adjacent/drones/': {
    title: 'Autonomous Drone Flight, Racing and Swarms',
    headTerm: 'autonomous drone',
    description:
      'How autonomous drones fly: perception latency limits, learned control that beat racing champions, swarm coordination, and delivery at scale.',
    queries: ['autonomous drones', 'how autonomous drones fly', 'AI drone racing'],
  },
  '/adjacent/surgical/': {
    title: 'Surgical Robots: da Vinci 5, Versius and Hugo',
    headTerm: 'surgical robots',
    description:
      'Surgical robots move as the surgeon moves. Intuitive had 12,094 da Vinci systems installed by September 30, 2026, and autonomy stays at level 0 or 1.',
    queries: ['surgical robots', 'surgical robotics', 'robotic surgery systems', 'autonomous surgery'],
  },
  '/adjacent/space/': {
    title: 'Space Robotics: Rovers, Station Arms, Servicing',
    headTerm: 'space robotics',
    description:
      'Space robotics spans planetary rovers, station arms and satellite servicers. Signals take 4 to 20 minutes to reach Mars, so rovers mostly drive themselves.',
    queries: ['space robotics', 'what is space robotics', 'Mars rover autonomy', 'satellite servicing robots'],
  },
};

/** The profile of a route, by its trailing-slash path. */
export function routeSeoProfile(path: string): RouteSeoProfile {
  const profile = ROUTE_SEO_PROFILES[path];
  if (!profile) throw new Error(`lib/seo-profiles.ts has no profile for ${path}`);
  return profile;
}
