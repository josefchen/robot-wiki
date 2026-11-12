/**
 * Sources added to the rl-sim2real articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // rl-for-robotics, 2026-11-12. Crossref record read 2026-11-12 (Science Robotics 10(105), 20 Aug 2025):
  // "Within 1 to 2.5 hours of real-world training, our approach outperformed other baselines".
  {
    id: 'hil-serl-scirobotics-2025',
    title: 'Precise and dexterous robotic manipulation via human-in-the-loop reinforcement learning',
    authors: ['Jianlan Luo', 'Charles Xu', 'Jeffrey Wu', 'Sergey Levine'],
    year: 2025,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.ads5033',
    type: 'paper',
  },
  // rl-for-robotics, 2026-11-12. Crossref record read 2026-11-12 (Science Robotics 11(116), 22 Jul 2026):
  // "RL-100 achieved 100% success in the evaluated trials (1000 of 1000 episodes)" across eight real-robot tasks.
  {
    id: 'rl-100-scirobotics-2026',
    title: 'Performant robotic manipulation with real-world reinforcement learning',
    authors: ['Kun Lei', 'Huanyu Li', 'Dongjie Yu', 'Zhenyu Wei', 'Lingxiao Guo', 'Zhennan Jiang', 'Ziyu Wang', 'Shiyu Liang', 'Huazhe Xu'],
    year: 2026,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.aed6267',
    type: 'paper',
  },
  // rl-for-robotics, 2026-11-12. Crossref record read 2026-11-12 (Science Robotics 11(116), 22 Jul 2026,
  // same issue as RL-100); standfirst: "Real-world learning can push robot manipulation beyond imitation alone."
  {
    id: 'stork-beyond-imitation-2026',
    title: 'Beyond imitation: Robots that learn to work in the real world',
    authors: ['Johannes A. Stork'],
    year: 2026,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.aei2397',
    type: 'paper',
  },
  // rl-for-robotics, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 24 May 2026); RSL-RL-SAC technical
  // report: evaluated "across seven legged robot platforms ... using the same reward functions originally
  // designed for PPO"; abstract: "our approach closes the performance gap with PPO entirely".
  {
    id: 'rsl-rl-sac-2026',
    title: 'Bridging the Gap: Enabling Soft Actor Critic for High Performance Legged Locomotion',
    authors: ['Gianluca Sabatini', 'Chenhao Li', 'Marco Hutter'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2605.24975',
    url: 'https://arxiv.org/abs/2605.24975',
    type: 'paper',
  },
  // rl-for-robotics, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 6 Apr 2026): "Across over 60 tasks
  // in 10 simulators, FlashSAC consistently outperforms PPO and strong off-policy baselines".
  {
    id: 'flashsac-2026',
    title: 'FlashSAC: Fast and Stable Off-Policy Reinforcement Learning for High-Dimensional Robot Control',
    authors: ['Donghu Kim', 'Youngdo Lee', 'Minho Park', 'Kinam Kim', 'I Made Aswin Nahendra', 'Takuma Seno', 'Sehee Min', 'Daniel Palenicek', 'Florian Vogt', 'Danica Kragic', 'Jan Peters', 'Jaegul Choo', 'Hojoon Lee'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.04539',
    url: 'https://arxiv.org/abs/2604.04539',
    type: 'paper',
  },
  // rl-for-robotics, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 25 Sep 2026): success "improves
  // from 55% to 71.9%" across eight real tasks; "456 autonomous episodes within 6 hours of interaction,
  // requiring 30 scene-recovery interventions and no human-provided reward labels".
  {
    id: 'find-2026',
    title: "Find Something You Can't Do: Agentic Real-World Reinforcement Learning for Self-Improving VLA Models",
    authors: ['Yuan Fang', 'Zechu Li', 'Haolei Tong', 'Puze Liu', 'Georgia Chalvatzaki'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.32069',
    url: 'https://arxiv.org/abs/2609.32069',
    type: 'paper',
  },
  // why-rl-locomotion, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 24 Oct 2026): "This survey covers 113
  // learning-based methods"; "reinforcement learning on privileged state in a GPU simulator, distilled into a
  // vision-only student ... Almost half the corpus trains that way"; demonstration branch "faster-growing".
  {
    id: 'dexterous-learning-survey-2026',
    title: 'Learning Dexterous Manipulation: Hands, Simulators, Training, and Evaluation',
    authors: ['Luai Abuelsamen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.33486',
    url: 'https://arxiv.org/abs/2610.33486',
    type: 'paper',
  },
  // why-rl-locomotion, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 16 Oct 2026): policies observe only
  // joint history; "The peg insertion policy transfers zero-shot to the real world and inserts pegs of
  // different shapes and sizes in 73% of trials".
  {
    id: 'blind-precise-assembly-2026',
    title: 'Blind Precise Assembly: Proprioceptive Sim-to-Real Peg-in-Hole for Diverse Parts',
    authors: ['Antonia Bronars', 'Younghyo Park', 'Kushal Kedia', 'Pulkit Agrawal'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.23849',
    url: 'https://arxiv.org/abs/2610.23849',
    type: 'paper',
  },
  // why-rl-locomotion, 2026-11-12. arXiv abs and full text read 2026-11-12 (v1 13 Jul 2026): "dexterous
  // manipulation exhibits substantially greater sensitivity to sim-to-real discrepancies ... small modeling
  // errors in friction, compliance, or geometry compound quickly".
  {
    id: 'regrind-2026',
    title: 'A Minimalist Retargeting-Guided Reinforcement Learning Recipe for Dexterous Manipulation',
    authors: ['Yunhai Feng', 'Natalie Leung', 'Jiaxuan Wang', 'Lujie Yang', 'Haozhi Qi', 'Preston Culbertson'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2607.11874',
    url: 'https://arxiv.org/abs/2607.11874',
    type: 'paper',
  },
  // why-rl-locomotion, 2026-11-12. arXiv abs and v2 full text read 2026-11-12 (v1 28 Feb 2026): sim-to-real
  // shift "has yet to materialize for contact-rich manipulation. The primary bottleneck is tactile sensing";
  // "a 32% increase in task success compared to the best performing baseline".
  {
    id: 'hydroshear-2026',
    title: 'HydroShear: Hydroelastic Shear Simulation for Tactile Sim-to-Real Reinforcement Learning',
    authors: ['An Dang', 'Jayjun Lee', 'Mustafa Mukadam', 'X. Alice Wu', 'Bernadette Bucher', 'Manikantan Nambi', 'Nima Fazeli'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2603.00446',
    url: 'https://arxiv.org/abs/2603.00446',
    type: 'paper',
  },
  // parallel-sim-rl, 2026-11-12. GitHub release v3.0.0, published 2026-10-20T02:05:51Z, read 2026-11-12: "Isaac Lab
  // 3.0 is now generally available"; "one task API across multiple physics, rendering, and visualization backends";
  // Isaac Sim "now fully optional"; Newton backend "with multiple solver paths, including MuJoCo-Warp, VBD, and MPM".
  {
    id: 'isaac-lab-3-0-2026',
    title: 'Isaac Lab 3.0',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub release v3.0.0, isaac-sim/IsaacLab',
    url: 'https://github.com/isaac-sim/IsaacLab/releases/tag/v3.0.0',
    type: 'docs',
  },
  // parallel-sim-rl, 2026-11-12. GitHub release v1.8.0, published 2026-11-11T15:53:37Z, read 2026-11-12: "introduces
  // the experimental Steel solver for articulated rigid bodies"; "Developed in collaboration with Skild AI";
  // "support for run-to-run determinism, island-based sleeping, and patch-based Coulomb friction".
  {
    id: 'newton-v1-8-0-2026',
    title: 'Newton v1.8.0',
    authors: ['Newton project (Linux Foundation)'],
    year: 2026,
    venue: 'GitHub release v1.8.0, newton-physics/newton',
    url: 'https://github.com/newton-physics/newton/releases/tag/v1.8.0',
    type: 'docs',
  },
  // parallel-sim-rl, 2026-11-12. MuJoCo 4.0 announcement (linked from the 4.0.0 release of 2026-11-06), read
  // 2026-11-12: "Humanoid stair climbing and thin-object grasping run 6 to 9 times faster, because they can use
  // larger timesteps. In 4.0, speculative contacts cover convex primitives and meshes on CPU; heightfields, SDFs,
  // flexes, MJX and MuJoCo Warp will follow." Posted 2026-11-07 by a maintainer account in Google DeepMind's
  // repository; the byline is a handle only, so the organisation stands as author.
  {
    id: 'mujoco-4-2026',
    title: 'MuJoCo 4: Studio & Filament, Deformables, Speculative Contacts',
    authors: ['Google DeepMind'],
    year: 2026,
    venue: 'GitHub Discussions, google-deepmind/mujoco',
    url: 'https://github.com/google-deepmind/mujoco/discussions/3773',
    type: 'docs',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 2 Nov 2026): "contact-rich dynamics such as
  // friction and restitution cannot be observed without interaction"; "CUE reduces held-out ball-position error by
  // 72% relative to the strongest baseline across 25 hidden-physics conditions in simulation".
  {
    id: 'cue-dynamics-2026',
    title: 'Closing the Dynamics Gap through Self-Directed Robotic Interaction',
    authors: ['Xilun Zhang', 'Liam Achenbach', 'Luis Pabon', 'Matthew Foutter', 'Marco Pavone'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.02691',
    url: 'https://arxiv.org/abs/2611.02691',
    type: 'paper',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 25 Oct 2026): online fine-tuning with a
  // real-world-trained neural dynamics model on a Unitree G1; "the first online, MoCap-free fine-tuning framework
  // for humanoid tracking policies".
  {
    id: 'humanoid-ndm-2026',
    title: 'HumanoidNDM: Closing the Training-Deployment Gap of Motion Tracking via Humanoid Neural Dynamics Model',
    authors: ['Chao Chen', 'Zhenrong Wang', 'Jilong Wang', 'Yusen Feng', 'Jiangran Lyu', 'Li Yi', 'He Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.34126',
    url: 'https://arxiv.org/abs/2610.34126',
    type: 'paper',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 27 Sep 2026): image-to-3D meshes for parallel
  // RL; "ZeroBot achieves an 87% success rate with an average training time of 119 seconds" on real-world tasks.
  {
    id: 'zerobot-2026',
    title: 'ZeroBot: Learning from Scratch in Minutes with Generative Real2Sim',
    authors: ['Ivan Kapelyukh', 'Xiaohan Zhang', 'Stephen James', 'Laura Herlant', 'Edward Johns'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.34010',
    url: 'https://arxiv.org/abs/2609.34010',
    type: 'paper',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 14 Oct 2026): "policies trained on 1K
  // automatically generated episodes per task achieve 73.3--86.7% real-world success rates, comparable to pi 0.5
  // trained from 150 human teleoperated demonstrations".
  {
    id: 'autorsr-2026',
    title: 'AutoRSR: Automated Real-to-Sim-to-Real Data Generation for Scalable Robot Learning',
    authors: ['Jiawei Zhang', 'Chang Liu', 'Litao Deng', 'Tao Zhang', 'Qin Jin'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.20336',
    url: 'https://arxiv.org/abs/2610.20336',
    type: 'paper',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 23 Oct 2026): PPO, "weakly regularised",
  // remains "the de facto choice in sim-to-real pipelines"; on real robots SMM-AC "achieves higher return, while
  // exhibiting greater robustness to perturbations".
  {
    id: 'smm-ac-2026',
    title: 'Regularised RL improves sim-to-real transfer',
    authors: ['Danilo Vucetic', 'Mohamad H. Danesh', 'Florence Clerc', 'Hsiu-Chin Lin', 'Jonathan Tremblay'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.32855',
    url: 'https://arxiv.org/abs/2610.32855',
    type: 'paper',
  },
  // sim2real-transfer, 2026-11-12. arXiv Atom API read 2026-11-12 (v5 22 Oct 2026; v1 13 Feb 2026): SFT warm start,
  // then RL in simulation with a supervised loss on real data; "+24% real-world success on OpenVLA and +20% on
  // pi0.5" over four real tabletop tasks.
  {
    id: 'rl-co-2026',
    title: 'Beyond Imitation: Reinforcement Learning-Based Sim-Real Co-Training for VLA Models',
    authors: ['Liangzhi Shi', 'Shuaihang Chen', 'Feng Gao', 'Yinuo Chen', 'Kang Chen', 'Tonghe Zhang', 'Hongzhi Zang', 'Jiakai Zhou', 'Weinan Zhang', 'Chao Yu', 'Yu Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2602.12628',
    url: 'https://arxiv.org/abs/2602.12628',
    type: 'paper',
  },
  // legged-locomotion, 2026-11-12. Boston Dynamics blog, published 2026-11-09T14:50:00Z, read 2026-11-12: "A wheeled
  // Atlas isn't a product. It's a research testbed"; "tuning the simulated motor model to match what we measured on the
  // robot"; "training did, in fact, figure out how to use the wheels". Byline is a site account, so the company stands.
  {
    id: 'bd-atlas-on-a-roll-2026',
    title: 'Atlas On a Roll',
    authors: ['Boston Dynamics'],
    year: 2026,
    venue: 'Boston Dynamics blog',
    url: 'https://bostondynamics.com/blog/atlas-on-a-roll/',
    type: 'blog',
  },
  // legged-locomotion, 2026-11-12. Agility press release dated November 5, 2026, read 2026-11-12: began trading "on the
  // Nasdaq Stock Market under the ticker symbols AGLT and AGLTW"; "approximately $465 million in gross capital raised".
  {
    id: 'agility-nasdaq-2026',
    title: 'Agility Becomes First U.S. Publicly Listed Pure-Play Humanoid Robotics Company, Begins Trading Today on Nasdaq as AGLT',
    authors: ['Agility Robotics'],
    year: 2026,
    venue: 'Agility Robotics press release, 2026-11-05',
    url: 'https://www.agilityrobotics.com/content/agility-becomes-first-u-s-publicly-listed-pure-play-humanoid-robotics-company-begins-trading-today-on-nasdaq-as-aglt',
    type: 'press',
  },
  // legged-locomotion, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 15 Oct 2026): on scanned construction-site
  // terrain "FCTS raises success rate from 28.4% to 85.8% on a medium-difficulty course and from 14.9% to 44.7% on a
  // hard course"; "Hardware experiments on a quadruped robot confirm that the learned FCTS policies transfer".
  {
    id: 'fcts-parkour-2026',
    title: 'FCTS: Failure-Guided Curriculum Tree Search Over Generated Terrain for Legged Parkour',
    authors: ['Narayanan Palghat Parameswaran', 'Dong-Ki Kim', 'Jay Patrikar', 'Santiago Gutierrez', 'Harshad Zade', 'Shayegan Omidshafiei', 'Harmish Khambhaita'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22619',
    url: 'https://arxiv.org/abs/2610.22619',
    type: 'paper',
  },
  // legged-locomotion, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 14 Oct 2026): "a single locomotion policy for
  // heterogeneous legged robots"; evaluated across bipedal, tripedal and quadrupedal robots in simulation and deployed
  // "on real quadruped platforms operated in multiple configurations".
  {
    id: 'polymorph-2026',
    title: 'PolyMorph: Learning Locomotion Policy for Cross-Embodiment Adaptation',
    authors: ['Hyunsik Oh', 'Seunghun Jeon', 'Donghoon Youm', 'Jungwoo Hur', 'Hyeongjun Kim', 'Jeong Hyun Lee', 'Moonkyu Jung', 'Jemin Hwangbo'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.19615',
    url: 'https://arxiv.org/abs/2610.19615',
    type: 'paper',
  },
  // legged-locomotion, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 16 Oct 2026): "a quadruped robot can learn to
  // traverse diverse real-world terrains reliably---including in a lunar-analog facility---after less than 20 minutes
  // of training on a single consumer-grade GPU".
  {
    id: 'space-quadruped-rl-2026',
    title: 'Towards Reinforcement Learning for Space Robotics: Fast Training and Reliable Real-World Transfer',
    authors: ['Abhishek Naik', 'Michael Wu', "Michael O'Sullivan", 'Colin Bellinger', 'Yunli Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.24241',
    url: 'https://arxiv.org/abs/2610.24241',
    type: 'paper',
  },
  // humanoid-wbc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 30 Oct 2026): exact simulator gradients with
  // per-sample clipping; on "all 40 LAFAN1 clips with one policy on one GPU", reaches "the score reported by the
  // state-of-the-art world-model method, 0.82, in 20 minutes instead of 1.2 h". Simulation results.
  {
    id: 'nabla-mimic-2026',
    title: '∇Mimic: Ultra-Efficient Humanoid Control with Differentiable Simulation',
    authors: ['Weyl Lu', 'Yubei Chen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.41654',
    url: 'https://arxiv.org/abs/2610.41654',
    type: 'paper',
  },
  // humanoid-wbc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 1 Aug 2026): "where FastSAC trains in about 15
  // minutes but underperforms, and PPO achieves stronger results but requires about 6 hours, LooperMuscle recovers a
  // substantial fraction of the remaining gap to PPO in roughly 45 minutes".
  {
    id: 'loopermuscle-2026',
    title: 'LooperMuscle: Fast and Stable Learning of Humanoid Whole-Body Tracking via Structured Mixture-of-Experts',
    authors: ['Boyi Liu', 'Qijin Li', 'Tianqi Yu', 'Qinrui Yan', 'Xingxing Zuo'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2608.00820',
    url: 'https://arxiv.org/abs/2608.00820',
    type: 'paper',
  },
  // humanoid-wbc, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 30 Oct 2026): on a physical G1 "completes all
  // 27 nominal tracking trials across nine diverse whole-body motion sequences without falling"; with an onboard-LiDAR
  // steering cost "passes under a 1.1 m low bar in four of five attempts".
  {
    id: 'onesteer-2026',
    title: 'OneSteer: Unlocking Steerable General Humanoid Motion Tracking via One-Step Diffusion Whole-Body Control',
    authors: ['Yifei Huang', 'Yazhao Yang', 'Weijia Li', 'Zhiheng Ma', 'Dian Shen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.41354',
    url: 'https://arxiv.org/abs/2610.41354',
    type: 'paper',
  },
  // humanoid-wbc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 27 Oct 2026): frozen generative base policy driven
  // by prompts; "Skills are ordinary code, refined by coding agents"; "On the physical Unitree G1, one frozen
  // checkpoint supports walking, recovery, teleoperated object pickup, and sitting on furniture".
  {
    id: 'metatron-2026',
    title: 'METATRON: A Promptable Whole-Body Execution Layer for Humanoids',
    authors: ['Chen Tessler', 'Yifeng Jiang', 'Alec Otto', 'Yi Shi', 'Umar Iqbal', 'Gal Chechik', 'Xue Bin Peng'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.38027',
    url: 'https://arxiv.org/abs/2610.38027',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 12 Aug 2026): sample-based MPC "entirely in
  // simulation as an automated, rapidly tunable expert"; off-policy RL "using purely sparse task rewards"; policies
  // "surpass the original optimal control teacher"; deployed on "an arm-equipped Spot quadruped and a G1 humanoid".
  {
    id: 'smpc-sparse-rl-2026',
    title: 'Learning Loco-Manipulation From SMPC Demonstrations With Sparse Offline-to-Online RL',
    authors: ['Martin Schuck', 'Maks Sorokin', 'Simone Manni', 'Duy Ta', 'Angela P. Schoellig', 'Marco Hutter', "Simon Le Cleac'H", 'Jan Brüdigam'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2608.12063',
    url: 'https://arxiv.org/abs/2608.12063',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v3; v1 9 Apr 2026): "test-time steering of a
  // pre-trained whole-body control policy with a sample-based planner"; Spot "uprighting a tire heavier than the
  // robot's nominal lifting capacity"; humanoid tasks "in simulation".
  {
    id: 'sumo-2026',
    title: 'Sumo: Dynamic and Generalizable Whole-Body Loco-Manipulation',
    authors: ['John Z. Zhang', 'Maks Sorokin', 'Jan Brüdigam', 'Brandon Hung', 'Stephen Phillips', 'Dmitry Yershov', 'Farzad Niroui', 'Tong Zhao', 'Leonor Fermoselle', 'Xinghao Zhu', 'Chao Cao', 'Duy Ta', 'Tao Pang', 'Jiuguang Wang', 'Preston Culbertson', 'Zachary Manchester', "Simon Le Cléac'h"],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.08508',
    url: 'https://arxiv.org/abs/2604.08508',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 3 Nov 2026): iLQR-MPC "replans at 100 Hz (mean
  // solve time 8.9 ms)" in MuJoCo; whole-body controller at 500 Hz; "requires no platform-specific policy training";
  // the G1 "recovers from impulsive 245 N forward and 175 N lateral pushes".
  {
    id: 'ilqr-mpc-humanoid-2026',
    title: 'Online iLQR-MPC with Whole-Body Control for Robust Humanoid Locomotion',
    authors: ['Xiang Li', 'Linlin Ou', 'Ruihan Wu', 'Xinyi Yu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.04204',
    url: 'https://arxiv.org/abs/2611.04204',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 21 Oct 2026): "the same reward structure and
  // weights across nine humanoid robots, requiring only robot-specific metadata"; "reduced tuning sensitivity across
  // robots".
  {
    id: 'mpbrs-2026',
    title: 'MPBRS: Multi-Potential-Based Reward Shaping for Unified Reward Configuration in Humanoid Locomotion',
    authors: ['Van Chung Nguyen', 'Hung Manh La'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.30334',
    url: 'https://arxiv.org/abs/2610.30334',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 17 Oct 2026): RL adapts references while a
  // model-based backbone executes; "77.29% mean survival across the tested disturbance grid, compared with 50.35%
  // for the model-based reference controller" (simulation).
  {
    id: 'structured-references-2026',
    title: 'Learning Structured Locomotion References for Optimization-Based Whole-Body Control',
    authors: ['Ömer Tarık Banuş', 'Uluç Saranlı', 'M. Mert Ankaralı'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.24779',
    url: 'https://arxiv.org/abs/2610.24779',
    type: 'paper',
  },
  // reward-design-mpc, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 3 Nov 2026): LLMs "as designers that construct
  // RL pipelines before deployment, including Markov decision process (MDP) formulation"; "executable code may still
  // yield non-learnable policies when state, action, reward, and termination artifacts are not semantically aligned".
  {
    id: 'arpg-2026',
    title: 'LLMs as MDP Designers: A Dependency-Aware Agentic Framework for Automated Robot Policy Generation',
    authors: ['Hong Je-Gal', 'Jinwoo Kim', 'Chanbin Yi', 'Hyun-Suk Lee'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.04974',
    url: 'https://arxiv.org/abs/2611.04974',
    type: 'paper',
  },
  // offline-rl, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 2 Mar 2026); RSS 2026 proceedings listing
  // (roboticsproceedings.org/rss22/p140) seen 2026-11-12: "RBM-1M, a reward-learning dataset comprising over one
  // million trajectories ... including substantial suboptimal and failure data"; used for offline IQL on mixed data.
  {
    id: 'robometer-2026',
    title: 'Robometer: Scaling General-Purpose Robotic Reward Models via Trajectory Comparisons',
    authors: ['Anthony Liang', 'Yigit Korkmaz', 'Jiahui Zhang', 'Minyoung Hwang', 'Abrar Anwar', 'Sidhant Kaushik', 'Aditya Shah', 'Alex S. Huang', 'Luke Zettlemoyer', 'Dieter Fox', 'Yu Xiang', 'Anqi Li', 'Andreea Bobu', 'Abhishek Gupta', 'Stephen Tu', 'Erdem Biyik', 'Jesse Zhang'],
    year: 2026,
    venue: 'RSS 2026',
    arxiv: '2603.02115',
    url: 'https://arxiv.org/abs/2603.02115',
    type: 'paper',
  },
  // offline-rl, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 15 Oct 2026): "transitions from offline RL warmup to
  // online autonomous learning with sparse rewards"; "a 32.8% gain with online autonomous learning over matched
  // offline training".
  {
    id: 'value-as-memory-2026',
    title: 'Value as Memory: Online Value-Guided Post-training for General Robot Policies',
    authors: ['Wenye Yu', 'Yijin Chen', 'Kaiyi Xiong', 'Wenbo Han', 'Wendi Chen', 'Yang Jin', 'Han Xue', 'Jun Lv', 'Cewu Lu', 'Chuan Wen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22368',
    url: 'https://arxiv.org/abs/2610.22368',
    type: 'paper',
  },
  // offline-rl, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 9 Nov 2026): training on the policy's own rollouts
  // "with filtered behavior cloning, RECAP-style advantage conditioning, corrections from an automatic coach, or
  // residual reinforcement learning did not yield a measurable improvement over plain behavior cloning in our setting".
  {
    id: 'chess-vla-adaptation-2026',
    title: 'VLA Adaptation with Real and Simulated Data: A Case Study on Robotic Chess',
    authors: ['Matěj Kripner', 'Milan Straka'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.12676',
    url: 'https://arxiv.org/abs/2611.12676',
    type: 'paper',
  },
];
