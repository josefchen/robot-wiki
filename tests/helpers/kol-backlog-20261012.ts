// Dated paragraphs that the 2026-10-12 KOL triage batch (notes older than 72
// hours) added, keyed by the article path under content/.
// withoutKolBacklogParagraphs in kol-backlog-20261001.ts removes these after
// the earlier batches' paragraphs.
export const KOL_BACKLOG_20261012_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'adjacent/space.mdx': [
    'Learned locomotion meets the same regolith in analogue tests on the ground. In October 2026, Adrian Fuhrer, Marco Hutter and colleagues at ETH Zurich reported on a 2025 campaign in the ESA/DLR LUNA lunar analogue facility in Cologne, where the quadrupeds ANYmal-D and Magnecko walked loose regolith simulant and crater-like terrain. The robots could cross the simulant, but sinkage and slip, dust kicked up by foot contacts, and perception failures from overexposure, shadows and low-texture ground all degraded performance <Cite id="luna-legged-2026" />.',
  ],
  'classical/motion-planning.mdx': [
    'Ariadne, from Carnegie Mellon\'s Silong Yong, Guanya Shi and colleagues (October 2026, accepted at NeurIPS 2026), trains only on valid states, with no trajectories, and builds a path by following the geometry of the learned state manifold. On DualKUKA, where two 7-DoF arms must avoid obstacles and each other, it averaged 53.3% success across three environments, against 44.7% for RRT, 31.7% for a trajectory-trained Diffuser and 53.2% for PBDMP, which also receives the scene layout. Ariadne learns one planner per scene <Cite id="ariadne-2026" />.',
  ],
  'classical/scene-representation.mdx': [
    'Ledger, from Shravan Chaudhari, Homanga Bharadhwaj and colleagues at Johns Hopkins (October 2026), keeps a persistent 3D object memory from a person\'s egocentric video: each object\'s resting locations, its moves and a short description, retained after it leaves view. A language model answering from these records as text, without the images, raised GPT-5.4\'s HD-EPIC accuracy from 29.7% to 42.6%, and on Ego4D the memory located objects with a median error of 0.99 m where it returned a prediction <Cite id="ledger-2026" />.',
  ],
  'data-hardware/data-bottleneck.mdx': [
    'Motion capture trades that scale for precision. HiPHI, a CoRL 2026 dataset from Jiahao Ji, Lei Han and colleagues at Noitom Robotics and several universities, holds 617.5 hours of optical motion capture from 132 performers, 245.7 of them with 40 real objects whose trajectories and meshes are recorded with the body. Retargeted to a Unitree G1 and trained with the same DeepMimic pipeline, its motions gave the highest simulated tracking success at a matched 3-hour budget against AMASS, LAFAN1, Motion-X++ and BONES-SEED, and again at 20 hours, a budget LAFAN1 is too short to fill. The authors also show policies trained on it running, sitting, crawling and carrying a box on a real G1 <Cite id="hiphi-2026" />.',
    'Generation can also widen the robot poses an existing dataset covers. MobileVISTA, from Suzannah Wistreich, Jiajun Wu and colleagues at Stanford and the Toyota Research Institute (October 2026), takes demonstrations recorded from one base pose and synthesizes matching egocentric images and retargeted actions for shifted poses, with no extra demonstrations and no trained generative model. With 50 demonstrations per task on a Galaxea R1 Pro and base offsets sampled within 15 cm of the original pose, its policy stacked a book in 13 of 25 trials, while Canonical-2D, DP3 and a fine-tuned π0.5 stacked it at most twice. From the original pose it stacked 18 of 25, below Canonical-2D\'s 24 and the fine-tuned π0.5\'s 25 <Cite id="mobilevista-2026" />.',
  ],
  'data-hardware/robot-learning-stack.mdx': [
    'Porting the policy from training code to the robot is its own source of bugs. Exploy, an open-source library the RAI Institute announced on October 7, 2026, traces a PyTorch training environment\'s observation code, network and action processing into one ONNX file with its configuration, which a C++ runtime then loads. The institute says this removes hand-written C++ copies of the observation and action code, that the library includes tools to check step-by-step numerical equivalence with the original PyTorch policy before hardware runs, and that it already deploys policies on Spot, Atlas, the Unitree G1 and the institute\'s own robots <Cite id="exploy-2026" />.',
  ],
  'frontier/dexterity.mdx': [
    'In October 2026, Harsh Gupta, Tyler Ga Wei Lum, Jeannette Bohg, Shuran Song and colleagues at Stanford reported that human hand-motion priors help most when they structure exploration and leave the action space unchanged. Their EigenDEXplore adds noise along eigenvectors of human hand motion to ordinary joint-space noise, and across several dexterous hands it outperformed joint-space and learned action-space baselines in grasping, in-hand reorientation and contact-rich manipulation, with the largest gains where rewards and curricula were least engineered <Cite id="eigendexplore-2026" />.',
    'A camera can also stand in for a force sensor. In October 2026, Haonan Chen, Edward Adelson, Jiajun Wu, Robert Howe, Yilun Du and colleagues trained an estimator that reads grip force from how a compliant Fin Ray gripper visibly bends. On three held-out episodes its mean error was 0.91 N, against 4.20 N for an estimate from the gripper\'s motor current. A Diffusion Policy that also outputs a force value then drew 32 candidate actions at each step and kept the one whose force was closest to a target taken from the demonstrations. On an ARX arm with no force or tactile sensor, over 15 trials per task, this raised success compared with a single sample from 46.7% to 86.7% for grasping an empty soda can, 0% to 73.3% for berry picking, 6.7% to 46.7% for in-hand reorientation and 26.7% to 73.3% for plug insertion <Cite id="visual-predicted-force-2026" />.',
    'A hand can also be the whole robot. In September 2026, Amirhossein Kazemipour, Hehui Zheng and Robert Katzschmann of ETH Zurich\'s Soft Robotics Lab trained reinforcement-learning policies that let an off-the-shelf 738 g WUJI hand, carrying its own power and computer, crawl on its fingers and use the same fingers to work. Training ran in a simulator calibrated from hardware measurements. On hardware it got back up from a fall in 21 of 25 trials, pressed the commanded arrow key for 29 of 32 consecutive commands while supporting its own weight, and, guided by an overhead camera, completed 15 cube deliveries to targets 10 to 40 cm away with a mean final error of 17 mm <Cite id="fingers-as-legs-2026" />.',
  ],
  'frontier/safety-and-assurance.mdx': [
    'A position paper from October 2026 asks for the same kind of evidence on the human side of the interaction. Niccolò Pagliarani, Maximilian Stölzle, Daniela Rus, Matteo Cianchetti and colleagues argue that a claim that a robot is trustworthy around people should rest on evidence for three properties in the intended setting: bounded physical risk, behavior that people can anticipate, and expectations that match what the robot has shown it can and cannot do. In their view these should guide design and evaluation from the outset, and the paper offers candidate evaluation criteria as a research agenda, with no new measurements <Cite id="trustworthy-physical-ai-2026" />.',
  ],
  'manipulation/bc-foundations.mdx': [
    'In October 2026, Seohong Park and Sergey Levine of UC Berkeley released OCBench, a GPU-accelerated manipulation benchmark whose scripted demonstrators mimic key properties of human demonstrations, so such effects can be studied under control. In it, success can keep rising as a policy overfits, and on two tasks closed-loop policies almost completely fail where action chunking works, even with streaming data <Cite id="ocbench-2026" />.',
  ],
  'manipulation/cross-embodiment.mdx': [
    'In October 2026, Huang Huang, Li Fei-Fei, Jiajun Wu, Franziska Meier and colleagues at Stanford and Meta FAIR described LAC-WM, a robot world model conditioned on a latent action space shared across embodiments. Used to pick action chunks for a VLA on five unseen LIBERO tasks, it raised average success from 82.4% with an explicit-action world model to 92.0%, and its planning success rose as pretraining added embodiments while the explicit-action model\'s fell <Cite id="lac-wm-2026" />.',
    'EgoLAP, from Lihan Zha, Dhruv Shah, Anirudha Majumdar and colleagues at Princeton, Toyota Research Institute and Physical Intelligence (October 2026), trains on human and robot trajectories through a shared chain of language actions that describe motion intent. On bimanual YAM robots it reached 80.1% mean real-world task progress, 2.3 times the alternative action representations trained the same way, and adding human data lifted simulated success from 7.2% to 16.4% <Cite id="egolap-2026" />.',
  ],
  'manipulation/hierarchical.mdx': [
    'Robo-COP, from Xilun Zhang, Jiajun Wu, Marco Pavone and colleagues at Stanford and NVIDIA (October 2026), updates the VLA under an orchestrator during deployment. It fine-tunes the policy on demonstrations curated from its own runs and adopts each update only after it improves the skills it was trained for. Across ten simulated RoboLab tasks, mean held-out success rose from 64.8% with a frozen policy to 73.8%, against 65.8% for fine-tuning on a fixed schedule without that check, and from 38.3% to 50.0% on three real tasks <Cite id="robo-cop-2026" />.',
  ],
  'manipulation/rl-finetuning.mdx': [
    'In October 2026, Chung Min Kim, Pieter Abbeel, Angjoo Kanazawa and colleagues at UC Berkeley and Amazon FAR described QF3, an off-policy method that trains a flow policy with the flow-matching loss plus the critic\'s action gradient, applied only to action dimensions that stay near the replayed action. They report it as the first off-policy flow RL method to train humanoid locomotion from scratch and transfer it zero-shot to hardware, with a 10× wall-clock speedup over the on-policy FPO++ <Cite id="qf3-2026" />.',
    'In October 2026, Lars Ankile, Perry Dong, Shuran Song, Chelsea Finn and colleagues at Stanford described Mulligan, which starts each round of supervised collection at the initial states where the policy failed or has not been tried, instead of sampling them uniformly. Combined with value-based action selection, HiL-IDQL with Mulligan raised final-round success on three real tasks by 10 to 34 percentage points over HG-DAgger, scored on 2,550 held-out, blinded episodes, and with an operator intervening the team completed 98% of collection episodes <Cite id="mulligan-2026" />.',
  ],
  'rl-sim2real/reward-design-mpc.mdx': [
    'Success Guided Sampling (SGS), from Octi Zhang, Byron Boots and colleagues at the University of Washington and NVIDIA (CoRL 2026), applies the same idea to task configurations in general. It samples the configurations near the edge of what the policy can do, because uniform sampling spends a growing share of each batch on configurations already mastered or still out of reach. With up to about a million parallel environments, it solved multi-terrain quadruped locomotion and contact-rich assembly tasks that the prior methods it was compared with failed to solve, and the distilled RGB assembly policies transferred zero-shot to real hardware <Cite id="sgs-2026" />.',
  ],
  'world-models/generative-video.mdx': [
    'Two October 2026 papers measured WAM design choices directly. OpenWAM, from Heng Yu, Li Fei-Fei, Jiajun Wu, Ehsan Adeli and colleagues at Stanford, pretrains the Wan2.2-5B video model causally on more than 10,000 hours of robot video and attaches an action expert that can generate jointly, video first, action first or decoupled. Against the original Wan2.2-5B starting point, that training raised video-then-action success on LIBERO-Long from 68.4% to 97.8% <Cite id="openwam-2026" />. Long-WAM, from Wei Huang, Linxi Fan, Song Han, Yukang Chen and colleagues at NVIDIA, MIT and HKU, found that longer visual history pays off when the video model was pretrained autoregressively. On RoboCasa GR-1, extending context from 0 to 19.2 seconds raised success from 63.3% to 78.7%, while a bidirectionally pretrained start showed no net gain. Each action chunk took 107.4 ms on an RTX 5090, and on real robots it stacked moving cups in 95% of trials, a task where π0.5 and Fast-WAM succeeded in none of 20 <Cite id="long-wam-2026" />.',
  ],
  'world-models/jepa.mdx': [
    'Leonardo Toso, Yann LeCun, James Anderson and Oumayma Bounou of Columbia, NYU and AMI Labs showed in October 2026 that next-step prediction with anti-collapse regularization can reach its minimum loss while discarding a system\'s controllable unstable modes, which leaves the learned state impossible to stabilize. They add an inverse-dynamics loss that reconstructs actions and prove, for linear systems, that exact reconstruction keeps every state direction reachable within the horizon; experiments on CartPole, Walker2D and PointMaze from pixels extend the finding to nonlinear tasks <Cite id="jepa-unstable-modes-2026" />.',
  ],
};

/** The citation ids the batch appended to each article's frontmatter list, in order. */
export const KOL_BACKLOG_20261012_CITATIONS: Readonly<Record<string, readonly string[]>> = {
  'adjacent/space.mdx': ['luna-legged-2026'],
  'classical/motion-planning.mdx': ['ariadne-2026'],
  'classical/scene-representation.mdx': ['ledger-2026'],
  'data-hardware/data-bottleneck.mdx': ['mobilevista-2026', 'hiphi-2026'],
  'data-hardware/robot-learning-stack.mdx': ['exploy-2026'],
  'frontier/dexterity.mdx': ['eigendexplore-2026', 'visual-predicted-force-2026', 'fingers-as-legs-2026'],
  'frontier/safety-and-assurance.mdx': ['trustworthy-physical-ai-2026'],
  'manipulation/bc-foundations.mdx': ['ocbench-2026'],
  'manipulation/cross-embodiment.mdx': ['egolap-2026', 'lac-wm-2026'],
  'manipulation/hierarchical.mdx': ['robo-cop-2026'],
  'manipulation/rl-finetuning.mdx': ['qf3-2026', 'mulligan-2026'],
  'rl-sim2real/reward-design-mpc.mdx': ['sgs-2026'],
  'world-models/generative-video.mdx': ['openwam-2026', 'long-wam-2026'],
  'world-models/jepa.mdx': ['jepa-unstable-modes-2026'],
};
