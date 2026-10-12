// Dated paragraphs that the 2026-10-12 KOL triage batch (notes older than 72
// hours) added, keyed by the article path under content/.
// withoutKolBacklogParagraphs in kol-backlog-20261001.ts removes these after
// the earlier batches' paragraphs.
export const KOL_BACKLOG_20261012_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'adjacent/space.mdx': [
    'Learned locomotion meets the same regolith in analogue tests on the ground. In October 2026, Adrian Fuhrer, Marco Hutter and colleagues at ETH Zurich reported on a 2025 campaign in the ESA/DLR LUNA lunar analogue facility in Cologne, where the quadrupeds ANYmal-D and Magnecko walked loose regolith simulant and crater-like terrain. The robots could cross the simulant, but sinkage and slip, dust kicked up by foot contacts, and perception failures from overexposure, shadows and low-texture ground all degraded performance <Cite id="luna-legged-2026" />.',
  ],
  'classical/scene-representation.mdx': [
    'Ledger, from Shravan Chaudhari, Homanga Bharadhwaj and colleagues at Johns Hopkins (October 2026), keeps a persistent 3D object memory from a person\'s egocentric video: each object\'s resting locations, its moves and a short description, retained after it leaves view. A language model answering from these records as text, without the images, raised GPT-5.4\'s HD-EPIC accuracy from 29.7% to 42.6%, and on Ego4D the memory located objects with a median error of 0.99 m where it returned a prediction <Cite id="ledger-2026" />.',
  ],
  'frontier/dexterity.mdx': [
    'In October 2026, Harsh Gupta, Tyler Ga Wei Lum, Jeannette Bohg, Shuran Song and colleagues at Stanford reported that human hand-motion priors help most when they structure exploration and leave the action space unchanged. Their EigenDEXplore adds noise along eigenvectors of human hand motion to ordinary joint-space noise, and across several dexterous hands it outperformed joint-space and learned action-space baselines in grasping, in-hand reorientation and contact-rich manipulation, with the largest gains where rewards and curricula were least engineered <Cite id="eigendexplore-2026" />.',
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
  'classical/scene-representation.mdx': ['ledger-2026'],
  'frontier/dexterity.mdx': ['eigendexplore-2026'],
  'manipulation/bc-foundations.mdx': ['ocbench-2026'],
  'manipulation/cross-embodiment.mdx': ['egolap-2026', 'lac-wm-2026'],
  'manipulation/hierarchical.mdx': ['robo-cop-2026'],
  'manipulation/rl-finetuning.mdx': ['qf3-2026', 'mulligan-2026'],
  'rl-sim2real/reward-design-mpc.mdx': ['sgs-2026'],
  'world-models/generative-video.mdx': ['openwam-2026', 'long-wam-2026'],
  'world-models/jepa.mdx': ['jepa-unstable-modes-2026'],
};
