/**
 * Sources added to the world-models articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // Google DeepMind blog, dated October 27, 2026, byline "Raia Hadsell, Diego Rivas and Hang Qi", fetched 2026-11-12:
  // research preview for trusted testers, native audio, Gemini steering; "visual details and object permanence can
  // still shift or drift over time".
  {
    id: 'genie-4-2026',
    title: 'Genie 4: A new generation of world simulation',
    authors: ['Raia Hadsell', 'Diego Rivas', 'Hang Qi'],
    year: 2026,
    venue: 'Google DeepMind',
    url: 'https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/',
    type: 'blog',
  },
  // NVIDIA GEAR whitepaper, November 2026, author line "NVIDIA", fetched 2026-11-12: "GR00T 2 is built on
  // Cosmos-Predict2.5-2B"; Dexter-50 "succeeds 40% of the time zero-shot, 71% with one episode, and 95% with five";
  // "The 50 tasks were chosen among those the model learns with five episodes (at least 80% success), so the
  // five-episode rate is high partly by construction."
  {
    id: 'gr00t-2-2026',
    title: 'GR00T 2: Scaling Robot Foundation Models for Generalization, Dexterity, and Adaptation',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'NVIDIA Research',
    url: 'https://research.nvidia.com/labs/gear/gr00t-2/',
    type: 'paper',
  },
  // NVIDIA Blog, published 2026-11-09 (author metadata Sasa Docca), fetched 2026-11-12: "At CoRL, NVIDIA is introducing
  // GR00T 2, an open frontier world action model built on NVIDIA Cosmos"; "Achieved 71% average success across 50
  // tasks with just one demonstration per task, increasing to 95% with five."
  {
    id: 'nvidia-corl-gr00t-2-2026',
    title: 'Practice Makes Precise: At CoRL, NVIDIA and Partners Reveal How Robots Rehearse Delicate Work in Simulation',
    authors: ['Sasa Docca'],
    year: 2026,
    venue: 'NVIDIA Blog',
    url: 'https://blogs.nvidia.com/blog/robotics-simulation-advancements-corl/',
    type: 'blog',
  },
  // Runway news post, "November 11, 2026 · by Runway", fetched 2026-11-12: open weights under Apache 2.0;
  // "27B-parameter mixture-of-experts diffusion transformer that predicts video and actions together"; RoboLab-120
  // 46.2% across 1,200 episodes vs 42.9% FLUX 3 Action, 36.8% Cosmos3 Nano, 28.0% pi0.5 ("Data as of November 2026").
  {
    id: 'runway-praxis-1-open-2026',
    title: 'Praxis-1 Is Now Available',
    authors: ['Runway'],
    year: 2026,
    venue: 'Runway',
    url: 'https://runway.com/news/company-news/praxis-1-is-now-available',
    type: 'blog',
  },
  // World Labs essay dated June 3, 2026, fetched 2026-11-12: renderers output observations, simulators output state,
  // planners output actions; "Increasingly, the most interesting research deliberately blurs the boundaries".
  {
    id: 'worldlabs-taxonomy-2026',
    title: 'A Functional Taxonomy of World Models',
    authors: ['World Labs'],
    year: 2026,
    venue: 'World Labs',
    url: 'https://worldlabs.ai/blog/taxonomy-of-world-models',
    type: 'blog',
  },
  // arXiv Atom API, 2611.14048v1 published 2026-11-10, fetched 2026-11-12: interaction-centric latent expert between
  // world and action experts in a Mixture-of-Transformers; pretrained on over 14k hours; "99.5% on LIBERO".
  {
    id: 'last05-2026',
    title: 'LaST0.5: A Generalist World Action Model with Interaction-Centric Latent Reasoning',
    authors: [
      'Xuheng Zhang', 'Yiming Zhang', 'Jialin Gao', 'Hao Chen', 'Jiaming Liu', 'Ji Li', 'Runzhong Huang',
      'Yinxi Wang', 'Chenyang Gu', 'Zihan Yang', 'Yaowei Liu', 'Zhonghao Yan', 'Ziyu Guo', 'Renrui Zhang',
      'Peng Jia', 'Pheng-Ann Heng', 'Shanghang Zhang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.14048',
    url: 'https://arxiv.org/abs/2611.14048',
    type: 'paper',
  },
  // arXiv Atom API, 2611.08338v1 published 2026-11-05, fetched 2026-11-12: rigid, deformable, cloth and granular
  // materials; 25.5-million-frame ParticleWorlds corpus; "reducing prediction error by 31% on average" across six
  // domains; plans "Executed open-loop in simulation".
  {
    id: 'gpwm-2026',
    title: 'GPWM: Modeling the World as 3D Particle Motion',
    authors: [
      'Robert Ren', 'Matthew Bronars', 'He Zhu', 'Yikai Tang', 'Jianing Zhang', 'Sergey Zakharov',
      'Pavel Tokmakov', 'Katerina Fragkiadaki',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.08338',
    url: 'https://arxiv.org/abs/2611.08338',
    type: 'paper',
  },
  // arXiv Atom API, 2611.12732v1 published 2026-11-09, fetched 2026-11-12: adds a backward dynamics predictor and an
  // inverse dynamics action predictor to LeWorldModel; gains "in both performance and planning efficiency" on
  // standard world model benchmarks and two simulated robot manipulation tasks.
  {
    id: 'sigma-lewm-2026',
    title: 'Σ-LeWM: Learning World Models via S-Information for Robot Control',
    authors: ['Xinrui Zu', 'Michael Przystupa', 'Zhao Yang', 'Shujian Yu', 'Kevin Sebastian Luck'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.12732',
    url: 'https://arxiv.org/abs/2611.12732',
    type: 'paper',
  },
  // arXiv Atom API, 2610.25600v1 published 2026-10-19, fetched 2026-11-12: discrete latent predictor over
  // vector-quantized states plus a continuous visual feedback controller; "100\% success rate with only short-play
  // data" on physical Tower of Hanoi; beats the strongest world models by 13.3 to 85.3 points in simulation.
  {
    id: 'vq-wm-2026',
    title: 'Vector-Quantized World Model: Latent Feedback Motion Planning for Robot Manipulation',
    authors: ['Xuezhou Xu', 'Chung-Pang Wang', 'Zhenzhen Li', 'Benjamin Riviere'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.25600',
    url: 'https://arxiv.org/abs/2610.25600',
    type: 'paper',
  },
  // arXiv Atom API, 2610.40637v1 published 2026-10-29, fetched 2026-11-12: learns latent dynamics without reward
  // "with at least one order of magnitude fewer parameters than DreamerV3, TD-MPC2 and LeWM"; system identification
  // across a benchmark of 71 attractors.
  {
    id: 'world2vec-2026',
    title: 'world2vec: Mechanistic world models through latent dynamics learning',
    authors: ['Tobias Schmidt', 'Rodrigo Gonzalez Laiz', 'Krisztián Szuppinger', 'Steffen Schneider'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.40637',
    url: 'https://arxiv.org/abs/2610.40637',
    type: 'paper',
  },
  // arXiv Atom API, 2610.31617v1 published 2026-10-22, fetched 2026-11-12: learned world model propagates external
  // dynamics while a differentiable simulator propagates the robot's own state; "proof-of-concept real-world flight
  // experiments".
  {
    id: 'diffdreamer-2026',
    title: 'DiffDreamer: Coupling World Models with Differentiable Simulation for Agile Quadrotor Control',
    authors: [
      'Fanxing Li', 'Yuxiang Huang', 'Shengyang Wang', 'Fangyu Sun', 'Shuyu Wu', 'Tianbao Zhang', 'Dexin Zuo',
      'Yan Yufei', 'Danping Zou', 'Wenxian Yu',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.31617',
    url: 'https://arxiv.org/abs/2610.31617',
    type: 'paper',
  },
  // MIT Technology Review, Innovators Under 35, by Mat Honan, September 8, 2026, fetched 2026-11-12: "Affiliation:
  // Google DeepMind (former)"; "His brand-new startup is still in stealth mode"; humanoids in the office; "Hafner
  // relies on something called model-based reinforcement learning".
  {
    id: 'mittr-hafner-2026',
    title: 'This AI entrepreneur is developing agents that can plan ahead for the unexpected',
    authors: ['Mat Honan'],
    year: 2026,
    venue: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/2026/09/08/1142088/danijar-hafner-developing-plan-ahead-agents/',
    type: 'press',
  },
  // Odyssey blog, byline "Oliver Cameron" and "Jeff Hawke", dated September 15th, 2026, fetched 2026-11-12:
  // "autoregressive diffusion transformer"; driving policy from 20 hours of simulated data; "the policies trained
  // entirely in simulation traveled about 77% as far between safety-driver interventions as those trained on real
  // footage"; robot arms "With only tens of hours of robot demonstrations".
  {
    id: 'odyssey-3-2026',
    title: 'Introducing Odyssey-3: A General-Purpose Physical Intelligence',
    authors: ['Oliver Cameron', 'Jeff Hawke'],
    year: 2026,
    venue: 'Odyssey',
    url: 'https://odyssey.systems/introducing-odyssey-3',
    type: 'blog',
  },
  // Hugging Face blog by NVIDIA, published November 5, 2026, fetched 2026-11-12: "adds four new open-weight
  // checkpoints to its Cosmos 3 model family"; "Cosmos3-Nano-Sim-Bimanual simulates how an environment evolves in
  // response to a bimanual robot's actions", for YAM and AgiBot embodiments, "controlled by a policy or
  // human-operated joysticks".
  {
    id: 'cosmos3-interactive-sim-2026',
    title: 'New NVIDIA Cosmos 3 Open Models for Interactive World Simulation',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'Hugging Face blog',
    url: 'https://huggingface.co/blog/nvidia/cosmos-interactive-world-simulation',
    type: 'blog',
  },
  // arXiv Atom API, 2610.34663v1 published 2026-10-26, fetched 2026-11-12: temporal representation objectives plus a
  // past-conditioned decoder give "up to 5x cheaper inference, over 7x faster training, and 15-24% lower pixel and
  // perceptual errors out of distribution and over long horizons", and closer agreement with real policy evaluation.
  {
    id: 'predictable-latents-2026',
    title: 'Video World Models Need Predictable Latents',
    authors: ['Mattia Scardecchia', 'Sherry Yang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.34663',
    url: 'https://arxiv.org/abs/2610.34663',
    type: 'paper',
  },
  // arXiv Atom API, 2608.24885v1 published 2026-08-25, fetched 2026-11-12: WorldEcho benchmark; "expert-trained models
  // perform better on demonstrated actions but struggle with off-expert trajectories"; WorldSync yields higher success
  // "in simulation and on real robots".
  {
    id: 'worldecho-2026',
    title: 'Do Robotic World Models Really Follow Actions? Diagnosing and Aligning Action-Conditioned Generation for Policy Learning',
    authors: [
      'Sixiang Chen', 'Jiaming Liu', 'Jixian Wu', 'Yichen Guo', 'Tinghao Wang', 'QR Li', 'Siyuan Qian', 'Peterson Co',
      'Hao Chen', 'Jiajun Cao', 'Zhoujian Li', 'Lingfei Zhai', 'Jian Tang', 'Shanghang Zhang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2608.24885',
    url: 'https://arxiv.org/abs/2608.24885',
    type: 'paper',
  },
  // arXiv Atom API, 2610.28613v1 published 2026-10-20, fetched 2026-11-12: visuo-tactile world model; across four
  // real tasks the mean Pearson correlation between world-model and real success rose "from 0.602 to 0.885";
  // post-training raised pi0.5's mean real success "from a 59.1% SFT baseline to 70.8%".
  {
    id: 'physcanvas-2026',
    title: 'Physical Canvas: A Vision Tactile World Model For Robot Policy Evaluation And Learning',
    authors: [
      'Zebin Xing', 'Yuhang Zheng', 'Yupeng Zheng', 'Yichen Zhang', 'Zichen Li', 'Shangqing Zhou', 'Yujie Zang',
      'Yuchen Liu', 'Zhongpu Xia', 'Haoran Li', 'Qichao Zhang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.28613',
    url: 'https://arxiv.org/abs/2610.28613',
    type: 'paper',
  },
  // arXiv Atom API, 2611.08156v1 published 2026-11-05, fetched 2026-11-12: compact world-action model trained in the
  // feature space of a pretrained V-JEPA 2.1 encoder; "state-of-the-art performance" among policies without embodied
  // pretraining on RoboTwin 2.0 and LIBERO-Plus; "JEPA features outperform video VAE latents, most clearly out of
  // distribution"; real-robot average "comparable to pi0.5".
  {
    id: 'la-jepa-2026',
    title: 'La-JEPA: Compact Robot Policies with Latent World Modeling',
    authors: [
      'Mateo Clémente', 'George Z. Xue', 'Amin Abyaneh', 'Liheng Ma', 'Rui Heng Yang', 'Tongtong Cao',
      'Zhanguang Zhang', 'Yingxue Zhang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.08156',
    url: 'https://arxiv.org/abs/2611.08156',
    type: 'paper',
  },
  // arXiv Atom API, 2611.05847v1 published 2026-11-04, fetched 2026-11-12: learned temporal metric replaces the
  // Euclidean goal cost of a frozen LeWM; average planning success "from 32.7% (flat LeWM) to 63.0%" over four
  // benchmarks.
  {
    id: 't2g-jepa-2026',
    title: 'Time-to-Goal: Learned Temporal Metrics for Long-Horizon Planning with JEPA World Models',
    authors: ['Ruilong Yu', 'Fei Ye'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.05847',
    url: 'https://arxiv.org/abs/2611.05847',
    type: 'paper',
  },
  // arXiv Atom API, 2610.19375v1 published 2026-10-14, fetched 2026-11-12: across fifteen later checkpoints "the
  // correlation between one-step error and planning success is r = -0.010".
  {
    id: 'one-step-fidelity-2026',
    title: 'One-Step Prediction Fidelity Is a Poor Proxy for Planning Performance in JEPA World Models',
    authors: ['Joshua Cheung', 'Zhang He'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.19375',
    url: 'https://arxiv.org/abs/2610.19375',
    type: 'paper',
  },
  // arXiv Atom API, 2610.25296v1 published 2026-10-18, fetched 2026-11-12: Perspective; JEPA "latent worlds naturally
  // lack a human-interpretable interface"; causal verification and intervention "remains largely unexplored".
  {
    id: 'wm-interpretability-2026',
    title: 'World Model Interpretability: From Decoding Representations to Understanding Latent Worlds',
    authors: ['Jize Wang', 'Yongcheng Jing', 'Xinyi Le', 'Cailian Chen', 'Xinping Guan', 'Dacheng Tao'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.25296',
    url: 'https://arxiv.org/abs/2610.25296',
    type: 'paper',
  },
  // The Chosun Daily (English), by Seongmin K, published 2026-10-12, fetched 2026-11-12: LeCun, "Our basic policy is
  // to open-source the world model we're developing for free. For researchers, it will be open source; for others,
  // we'll provide open weights."
  {
    id: 'chosun-lecun-2026',
    title: "Yann LeCun Calls AI Development Slowdown Debate 'Theatrical Mimicry'",
    authors: ['Seongmin K'],
    year: 2026,
    venue: 'The Chosun Daily',
    url: 'https://www.chosun.com/english/industry-en/2026/10/13/BUCIOFJZV5F2JOBF4LZCGDSW2Y/',
    type: 'press',
  },
  // TechCrunch, by Kate Park, published 2026-07-16, fetched 2026-11-12: "AMI Labs is still pre-product, but it's
  // already courting robotics, manufacturing, and electronics players"; LLMs and world models "complementary, not
  // replaceable".
  {
    id: 'techcrunch-lebrun-2026',
    title: "Why AMI Labs' Alexandre LeBrun won't call his AI 'AGI' or 'superintelligence'",
    authors: ['Kate Park'],
    year: 2026,
    venue: 'TechCrunch',
    url: 'https://techcrunch.com/2026/07/16/why-ami-labs-alexandre-lebrun-wont-call-his-ai-agi-or-superintelligence/',
    type: 'press',
  },
  // arXiv Atom API, 2611.06627v1 published 2026-11-04, author line begins "NVIDIA", fetched 2026-11-12: "supports
  // both predicting the visual consequences of actions and generating observations from physical state maintained
  // by an external simulator"; demonstrated on camera navigation, robot manipulation and multi-view AV simulation.
  {
    id: 'cosmos-interactive-sim-2026',
    title: 'Interactive World Simulation with Cosmos for Physical AI',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.06627',
    url: 'https://arxiv.org/abs/2611.06627',
    type: 'paper',
  },
  // arXiv Atom API, 2610.17651v1 published 2026-10-13, fetched 2026-11-12: SimReady Scene Compiler assigns collision
  // meshes, estimates physical attributes with a VLM and exports MuJoCo MJCF; a simulator critic "inspects penetration
  // depth, collision pairs, stability, contact forces, joint limits, and robot reachability".
  {
    id: 'code2worlds-2-2026',
    title: 'Code2Worlds-2: Physically Plausible Agent Harness for Embodied World Simulation',
    authors: ['Haoyu Zhang', 'Siming Li', 'Zeyu Zhang', 'Yi Zhang', 'Tat-Seng Chua', 'Hao Tang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.17651',
    url: 'https://arxiv.org/abs/2610.17651',
    type: 'paper',
  },
  // World Labs product page, linked from the World Labs blog as "November 12, 2026 · Atlas: Releasing our next
  // generation world model", fetched 2026-11-12: "Convert splats into meshes with real geometry"; for robotics,
  // "Create spatial environments from real or generated scenes for robotics research and simulation workflows";
  // Developer API.
  {
    id: 'worldlabs-atlas-release-2026',
    title: 'Atlas: Next generation world model',
    authors: ['World Labs'],
    year: 2026,
    venue: 'World Labs',
    url: 'https://worldlabs.ai/atlas',
    type: 'docs',
  },
  // NTT press release, Tokyo, November 11, 2026, fetched 2026-11-12: world model that "explicitly handles physical
  // quantities such as an object's mass, orientation, and velocity"; candidate actions evaluated before moving;
  // "In a shelf-loading task using a small robot to simulate the stacking of items, the success rate improved from
  // 73.1% to 92.3%"; field trials planned with Mujin.
  {
    id: 'ntt-physics-wm-2026',
    title: 'NTT Develops Physical AI Technology That Predicts the Future Before Robots Move to Prevent Failures',
    authors: ['NTT, Inc.'],
    year: 2026,
    venue: 'NTT press release',
    url: 'https://group.ntt/en/newsrelease/2026/11/11/261111b.html',
    type: 'press',
  },
  // arXiv Atom API, 2611.11718v1 published 2026-11-09, fetched 2026-11-12: policy trained "in 3 hours on a
  // six-dimensional aSSM-reduced model" and deployed without fine-tuning, against an extrapolated "3 years of hardware
  // interaction"; 40% lower tracking error than policies trained on RNN or transformer models.
  {
    id: 'soft-robot-assm-rl-2026',
    title: 'Accelerated Reinforcement Learning for Soft Robotics: Hours Instead of Years',
    authors: ['Roshan S. Kaundinya', 'Hehui Zheng', 'Robert K. Katzschmann', 'George Haller'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.11718',
    url: 'https://arxiv.org/abs/2611.11718',
    type: 'paper',
  },
  // arXiv Atom API, 2610.35636v1 published 2026-10-26, fetched 2026-11-12: OpTTA "raises final planning success over
  // the frozen model by 13.5 percentage points on average, compared with 6.9 for the prediction-only objective".
  {
    id: 'optta-2026',
    title: 'Adapt for Planning, Not just Prediction: Optimistic Test-Time World Model Adaptation',
    authors: ['Akshay Mete', 'Dileep Kalathil', 'P. R. Kumar'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.35636',
    url: 'https://arxiv.org/abs/2610.35636',
    type: 'paper',
  },
  // arXiv Atom API, 2610.33565v1 published 2026-10-24, fetched 2026-11-12: tests failure reason, failure stage and
  // failure boundary on LIBERO, RoboTwin and real G1 humanoid tasks; "Experiments across seven world models reveal
  // substantial gaps in their understanding of policy failures".
  {
    id: 'worldfailbench-2026',
    title: 'WorldFailBench: Do World Models Understand Policy Failures?',
    authors: [
      'Zheng Zhang', 'Xiaoyang Tang', 'Shuaiqi Cheng', 'Jiakai Huang', 'Zhongbo Wu', 'Ziyi Zhang', 'Yuan Si',
      'Zeyu Liu', 'Weibo Gao', 'Shunyu Liu', 'Shan You', 'Fei Wang', 'Xiaogang Wang', 'Dacheng Tao',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.33565',
    url: 'https://arxiv.org/abs/2610.33565',
    type: 'paper',
  },
  // arXiv Atom API, 2610.33894v1 published 2026-10-24, fetched 2026-11-12: Unity physical simulations as a
  // ground-truth oracle across 9 scenes; matched action sequences in simulator and world model; gaps "hidden by
  // standard perceptual metrics".
  {
    id: 'wmeval-2026',
    title: 'WMEval: Evaluating Interactive World Models Grounded on Physical Simulations',
    authors: [
      'Lanxiang Hu', 'Yixin Huang', 'Abhilash Shankarampeta', 'Zilin Dai', 'Yuyuan Wu', 'Kun Qian', 'Junze Liu',
      'Arvind Srinivasan', 'Mingjia Huo', 'Will Lin', 'Kai Zhong', 'Weiqi Zhang', 'Tian Wang', 'Qingjun Cui',
      'Tajana Rosing', 'Hao Zhang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.33894',
    url: 'https://arxiv.org/abs/2610.33894',
    type: 'paper',
  },
  // arXiv Atom API, 2610.41857v1 published 2026-10-30, fetched 2026-11-12: SimuGuard; fixing one collision constant cut
  // artifact episodes "from 12 in 100 to none" and raised RoboTwin container-task success "from 89% to 98%";
  // "75.8% to 98.5% around a reported 83.1% for LingBot-VA".
  {
    id: 'simuguard-2026',
    title: 'When the Simulator Fails, Not the Policy: Auditing Contact Artifacts in Simulated Robot Benchmarks',
    authors: [
      'Alex Zhou', 'Junhao Wu', 'Xueyang Zhou', 'Yixiao Huo', 'Hongcheng Gao', 'Di Zhu', 'Zhenghao Zhang',
      'Yongchao Chen',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.41857',
    url: 'https://arxiv.org/abs/2610.41857',
    type: 'paper',
  },
];
