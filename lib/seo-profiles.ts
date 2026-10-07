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
 * the owner sweep's proposals and keep only what the page itself says;
 * where a proposal already carries the H1 topic or its abbreviation, that
 * phrase is the head term. `queries` are the intent queries the domain report
 * lists for the page, first query first. `scripts/check-seo.ts` holds the
 * exported pages to these limits.
 */
export interface RouteSeoProfile {
  title: string;
  description: string;
  headTerm: string;
  queries: readonly string[];
}

export const ROUTE_SEO_PROFILES: Readonly<Record<string, RouteSeoProfile>> = {
  '/': {
    title: 'Modern Robotics and Robot Learning | Robot Wiki',
    headTerm: 'robot learning',
    description:
      'Citation-first encyclopedia of modern robot learning. It explains VLA models, reinforcement learning, sim-to-real, world models and robot control.',
    queries: [],
  },
  '/market-map/': {
    title: 'Market Map: Robotics and Embodied AI Companies',
    headTerm: 'market map',
    description:
      'Market map of the embodied-AI industry: robotics companies across six segments, filterable by approach, geography, stage and funding.',
    queries: [],
  },
  '/playground/': {
    title: '3D Kinematics Playground for a Robot Arm',
    headTerm: '3D kinematics playground',
    description:
      '3D kinematics playground for the SO-101 robot arm: joint sliders for forward kinematics, click-to-reach inverse kinematics and trajectory replay.',
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
    title: 'Glossary of Robotics and Robot Learning Terms',
    headTerm: 'glossary',
    description:
      'Glossary of robotics and robot learning terms: cited definitions of the jargon used across Robot Wiki, from action chunking to Kalman filters.',
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
    title: 'Behavior Cloning: Compounding Error and DAgger',
    headTerm: 'behavior cloning',
    description:
      'Behavior cloning trains a robot policy on expert demonstrations. Why errors compound in closed loop, what DAgger fixes, and what action chunking changes.',
    queries: ['behavior cloning robotics', 'imitation learning compounding error', 'DAgger'],
  },
  '/manipulation/action-chunking/': {
    title: 'Action Chunking for Robotics: ACT and ALOHA',
    headTerm: 'action chunking',
    description:
      'Action chunking predicts a sequence of robot actions per inference. How ACT and ALOHA use it, the chunk-size tradeoff, temporal ensembling and theory.',
    queries: ['action chunking', 'ACT ALOHA', 'action chunking transformer'],
  },
  '/manipulation/diffusion-policy/': {
    title: 'Diffusion Policy for Robot Control',
    headTerm: 'diffusion policy',
    description:
      'Diffusion Policy explained: denoising action sequences for visuomotor robot control, receding-horizon execution, and faster one-step and flow successors.',
    queries: ['diffusion policy', 'diffusion policy robotics'],
  },
  '/manipulation/vla-models/': {
    title: 'Vision-Language-Action Models (VLAs) Explained',
    headTerm: 'vision-language-action models',
    description:
      'What vision-language-action models (VLAs) are and how they work: RT-2, OpenVLA, Octo and pi0, and action tokens versus continuous action heads.',
    queries: ['what is a VLA model', 'vision-language-action model'],
  },
  '/manipulation/pi-line/': {
    title: 'Pi0 to Pi0.7: Physical Intelligence VLA Models',
    headTerm: 'pi0',
    description:
      'Physical Intelligence\'s pi0, pi0-FAST, pi0.5, pi0.6 and pi0.7: flow-matching action experts, FAST tokens, RL from experience, memory and open checkpoints.',
    queries: ['pi0', 'Physical Intelligence pi0', 'pi0.5', 'pi0.7'],
  },
  '/manipulation/generalist-policies/': {
    title: 'Generalist Robot Policies: Gemini, GR00T, Helix',
    headTerm: 'generalist robot policies',
    description:
      'Generalist robot policies compared: Gemini Robotics 2, GR00T, Helix 2.5, GEN-1.5, Skild S1 and GO-2 by architecture, evidence quality and open weights.',
    queries: ['generalist robot policy', 'robot foundation model companies', 'Helix vs GR00T vs Gemini Robotics'],
  },
  '/manipulation/comparison-matrix/': {
    title: 'VLA Model Comparison Table for Robot Policies',
    headTerm: 'VLA model comparison',
    description:
      'Side-by-side VLA model comparison from RT-1 to pi0.7, GR00T and Gemini Robotics: action head, chunk horizon, control rate, backbone and open weights.',
    queries: ['VLA comparison', 'robot policy comparison table'],
  },
  '/manipulation/hierarchical/': {
    title: 'Hierarchical Robot Policies: Planners and VLAs',
    headTerm: 'hierarchical robot policies',
    description:
      'Hierarchical robot policies split what to do from how to move: SayCan, Code as Policies, pi0.5 subtasks and orchestrators such as Gemini Robotics ER 2.',
    queries: ['hierarchical VLA', 'LLM robot planning', 'SayCan code as policies'],
  },
  '/manipulation/rl-finetuning/': {
    title: 'RL Fine-Tuning for VLA Robot Policies',
    headTerm: 'RL fine-tuning',
    description:
      'RL fine-tuning of robot policies and VLAs: HIL-SERL, DPPO, Recap, pi_RL, RL tokens and EXPO-FT, with reported results and caveats.',
    queries: ['RL fine-tuning VLA', 'reinforcement learning robot policy fine-tuning'],
  },
  '/manipulation/realtime-execution/': {
    title: 'Real-Time VLA Inference and Action Chunking',
    headTerm: 'real-time VLA inference',
    description:
      'Real-time VLA inference decides robot control quality: latency budgets, temporal ensembling, real-time chunking (RTC) and training-time delay conditioning.',
    queries: ['VLA inference latency', 'real-time chunking', 'robot policy control frequency'],
  },
  '/manipulation/cross-embodiment/': {
    title: 'Cross-Embodiment Learning for Robot Policies',
    headTerm: 'cross-embodiment learning',
    description:
      'Cross-embodiment learning trains one policy on many robots and human video: padded actions, soft prompts, relative end-effector actions and human data.',
    queries: ['cross-embodiment robot learning', 'human video to robot transfer'],
  },
  '/manipulation/knowledge-insulation/': {
    title: 'Knowledge Insulation for VLA Training',
    headTerm: 'knowledge insulation',
    description:
      'Knowledge insulation trains a VLA backbone on FAST action tokens while a flow-matching action expert learns behind a stop-gradient. Recipe and results.',
    queries: ['knowledge insulation VLA', 'stop gradient VLA training'],
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
      'How GPU-parallel simulation trains robot policies in minutes: Isaac Gym, Isaac Lab 3.0, Newton, MuJoCo Warp and MJX, with measured throughput.',
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
    title: 'Humanoid Whole-Body Control and Motion Tracking',
    headTerm: 'humanoid whole-body control',
    description:
      'Humanoid whole-body control via RL motion tracking, from PHC and ASAP to SONIC, and how Helix 02, GR00T and Gemini Robotics 2 split it.',
    queries: ['humanoid whole-body control', 'humanoid motion tracking RL'],
  },
  '/rl-sim2real/reward-design-mpc/': {
    title: 'Reward Design and MPC vs RL for Robots',
    headTerm: 'reward design',
    description:
      'Robot reward design, from hand-tuned terms and constraints to Eureka, and when whole-body model predictive control beats a learned policy.',
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
      'How latent-dynamics world models work: the RSSM, Dreamer imagination training, TD-MPC2 planning, and results on real robots.',
    queries: ['Dreamer world model', 'TD-MPC2', 'latent dynamics model'],
  },
  '/world-models/generative-video/': {
    title: 'Video World Models for Robots: Cosmos, Genie 3',
    headTerm: 'video world models',
    description:
      'Action-conditioned video world models for robotics: Cosmos 3, Genie 3, 1X policy evaluation, and why action sensitivity decides.',
    queries: ['video world models robotics', 'Cosmos world model', 'Genie 3 robotics'],
  },
  '/world-models/jepa/': {
    title: 'JEPA World Models for Robots: V-JEPA 2',
    headTerm: 'JEPA world models',
    description:
      'JEPA world models predict embeddings, not pixels. V-JEPA 2 results, AMI Labs, and the case against generation.',
    queries: ['JEPA world model', 'V-JEPA 2', 'JEPA vs generative'],
  },
  '/world-models/generative-sim/': {
    title: 'Generative Simulation for Robot Learning',
    headTerm: 'generative simulation',
    description:
      'Generative simulation uses AI to author scenes, assets and tasks inside a physics engine: RoboGen and RoboCasa365.',
    queries: ['generative simulation robotics', 'AI-generated simulation environments'],
  },
  '/world-models/model-based-robot-learning/': {
    title: 'Model-Based Robot Learning with World Models',
    headTerm: 'model-based robot learning',
    description:
      'Model-based robot learning: learn dynamics, plan with MPC or train in imagination. Dreamer, TD-MPC2 and real excavator and insertion results.',
    queries: ['model-based reinforcement learning robotics', 'model-based RL robot'],
  },
  '/world-models/evaluation/': {
    title: 'World Model Evaluation and Benchmarks',
    headTerm: 'world model evaluation',
    description:
      'Robot world model evaluation: action sensitivity, rollout consistency and policy ranking vs real trials.',
    queries: ['world model evaluation', 'world model benchmark robotics'],
  },
  '/world-models/world-models-vs-simulators/': {
    title: 'World Models vs Physics Simulators for Robotics',
    headTerm: 'world models vs physics simulators',
    description:
      'Learned world models vs physics simulators like MuJoCo: cost per query, counterfactual coverage, and when to use hybrids.',
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
    title: 'Robot Reliability: Why Demos Fail to Deploy',
    headTerm: 'robot reliability',
    description:
      'Robot reliability: why 95% per-step success fails a 30-step task, which methods raise it, and what Figure, Agility and Tesla deployments report in 2026.',
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
    title: 'Robot Generalization in Unseen Homes',
    headTerm: 'robot generalization',
    description:
      'Robot generalization: how far generalist policies transfer to homes they never saw, what π0.5 and π0.7 show, and what scaling laws measure.',
    queries: ['robot generalization', 'zero-shot robot unseen homes', 'generalist robot policy'],
  },
  '/frontier/competing-theses/': {
    title: 'VLAs vs World Models: How Robots Scale',
    headTerm: 'VLAs vs world models',
    description:
      'VLAs vs world models and four other bets on building robot intelligence: hierarchy, RL fine-tuning, teleoperation and humanoids, each with a kill test.',
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
      'Robot safety standards: ISO 10218:2025, the ISO 25785-1 humanoid draft, and why a learned robot policy cannot be certified alone.',
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
      'Robot learning data bottleneck: how many hours of robot data exist in 2026, from DROID, AgiBot World and EgoScale, with what scaling laws say to collect.',
    queries: ['robot learning data bottleneck', 'how much data do robots need'],
  },
  '/data-hardware/datasets/': {
    title: 'Robot Learning Datasets Compared (2026)',
    headTerm: 'robot learning datasets',
    description:
      'Open robot learning datasets compared by hours, episodes, tasks, embodiments and license: Open X-Embodiment, DROID, AgiBot World and more.',
    queries: ['robot learning datasets', 'open robot manipulation datasets comparison'],
  },
  '/data-hardware/hardware-taxonomy/': {
    title: 'Robot Hardware Prices 2026: Arms to Humanoids',
    headTerm: 'robot hardware',
    description:
      'Dated 2026 prices and specs for robot hardware: arms, humanoids, dexterous hands, tactile sensors and Jetson Thor compute, from a $122 SO-101 to Atlas.',
    queries: ['humanoid robot price 2026', 'robot arm for robot learning'],
  },
  '/data-hardware/teleop-rigs/': {
    title: 'Robot Teleoperation and Data Collection Rigs',
    headTerm: 'robot teleoperation',
    description:
      'Robot teleoperation rigs compared: ALOHA, GELLO, UMI and VR headsets on cost, demos per hour, data quality and the embodiment gap for robot learning.',
    queries: ['robot teleoperation data collection', 'ALOHA vs UMI'],
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
      'Industrial robot deployment per IFR: 4,663,698 robots in operation in 2024. Cell costs, payback, jam-rate arithmetic and where learned robots fit.',
    queries: ['industrial robot statistics 2026', 'robot cell ROI payback'],
  },
  '/data-hardware/robot-learning-stack/': {
    title: 'Robot Learning Pipeline: Data to Deployment',
    headTerm: 'robot learning stack',
    description:
      'The robot learning stack as seven contracts: calibration, episode capture, dataset schema, training, sim and real evaluation, and ROS 2 serving.',
    queries: ['robot learning pipeline', 'MLOps for robotics'],
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
      'How autonomous drones fly: perception latency limits, learned control that beat racing champions, and swarm coordination.',
    queries: ['autonomous drones', 'how autonomous drones fly', 'AI drone racing'],
  },
  '/adjacent/surgical/': {
    title: 'Surgical Robotics: Systems, Safety and Autonomy',
    headTerm: 'surgical robotics',
    description:
      'Surgical robotics from da Vinci 5 to CMR and Moon Surgical: how they work, why they stay surgeon-controlled, and where learned autonomy stands in 2026.',
    queries: ['surgical robotics', 'surgical robots', 'robotic surgery systems', 'autonomous surgery'],
  },
  '/adjacent/space/': {
    title: 'Space Robotics: Rovers, Arms and Autonomy',
    headTerm: 'space robotics',
    description:
      'Space robotics explained: Mars rover autonomy, lunar drilling for ISRU, and robotic satellite servicing and debris removal, with mission data.',
    queries: ['space robotics', 'space robots examples', 'Mars rover autonomy', 'satellite servicing robots'],
  },
};

/** The profile of a route, by its trailing-slash path. */
export function routeSeoProfile(path: string): RouteSeoProfile {
  const profile = ROUTE_SEO_PROFILES[path];
  if (!profile) throw new Error(`lib/seo-profiles.ts has no profile for ${path}`);
  return profile;
}
