import type { GlossaryTerm } from './schemas/glossary';

/**
 * The glossary registry: cited definitions of the jargon used across the
 * wiki. `data/schemas/glossary.ts` holds the schema (a definition with no
 * citation id fails validation); scripts/validate-content.ts checks that
 * every cited id resolves and that no published article uses an unknown
 * term id.
 *
 * Terms are added in batches as coverage grows; every definition is written
 * from its cited source, and an id typo fails the build gate, so keep ids
 * stable and kebab-case.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    id: 'behavior-cloning',
    term: 'behavior cloning',
    definition:
      'Behavior cloning is supervised learning of a policy from expert demonstrations, with observations as inputs and the expert\'s actions as labels. The recipe predates deep learning: ALVINN (1988) used camera and laser-range inputs and trained on simulated road images before NAVLAB tests. Scaled up, it still underlies most learned manipulation policies; its known closed-loop failure mode is covariate shift.',
    citations: ['alvinn-1988', 'dagger-2011'],
  },
  {
    id: 'dagger',
    term: 'DAgger',
    definition:
      'DAgger (Dataset Aggregation) is an iterative fix for behavior cloning\'s distribution mismatch: the expert labels states the current policy visits, and the policy retrains on the aggregate. Ross, Gordon, and Bagnell framed it as reducing imitation learning to no-regret online learning. The task-cost guarantee is existential over the learned sequence and assumes learning and expert-mixing conditions. Linear excess-cost scaling needs a horizon-independent recovery-cost factor u, which can be O(T) at worst.',
    citations: ['dagger-2011'],
  },
  {
    id: 'compounding-error',
    term: 'compounding error',
    definition:
      'Compounding error is the accumulation of small per-step mistakes in a sequential task. Each error moves the robot slightly off its training data, where the next is likelier, so total deviation outgrows the per-step rate. Ross, Gordon, and Bagnell bounded it for imitation learning at total cost quadratic in episode length. Action chunking reduces it by cutting sequential decisions.',
    citations: ['dagger-2011', 'act-aloha-2023'],
  },
  {
    id: 'cvae',
    term: 'CVAE',
    definition:
      'A CVAE (conditional variational autoencoder) is a generative model learning a distribution over a latent variable instead of one deterministic output. ACT trains its action-chunking policy as one, so a single policy covers varied demonstrations of a task. In training, an encoder compresses each demonstrated action sequence into a latent style variable. At test time the decoder generates the chunk from camera images and joint positions, with the latent at the prior mean.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'vision-language-action-model',
    term: 'vision-language-action model',
    definition:
      'A vision-language-action model is a vision-language model, pretrained on web-scale image and text data, adapted to output robot actions. RT-2 established it by encoding actions as text tokens and co-fine-tuning on web and robot data, showing that web-learned semantic knowledge transfers into control. OpenVLA and the π series of generalist policies use the same recipe.',
    citations: ['rt2-2023'],
  },
  {
    id: 'cross-embodiment',
    term: 'cross-embodiment',
    definition:
      'Cross-embodiment learning is learning from, or transferring to, robots with different morphologies: joint counts, action dimensions and sensor suites. The Open X-Embodiment project pooled data from 22 robot embodiments, and its RT-X policies carried skills across platforms. Each body defines actions differently, and the field aligns them with several incompatible conventions.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'action-chunking',
    term: 'action chunking',
    definition:
      'Action chunking is predicting a sequence of future actions in one inference instead of a single action per timestep. Introduced with ACT on ALOHA, it divides an episode\'s sequential decisions by the chunk length, reducing compounding error and giving the policy temporal context to represent pauses. The cost is commitment to a plan between replans.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'covariate-shift',
    term: 'covariate shift',
    definition:
      'Covariate shift is the mismatch between the state distribution of an imitation learner\'s training demonstrations and the distribution its learned policy visits at deployment. The policy\'s own errors lead it to states the demonstrations never covered, where it is likelier to err again, so mistakes compound. Ross, Gordon, and Bagnell showed a behavior-cloned policy with per-step error ε can incur total cost quadratic in episode length, and no i.i.d.-trained policy can guarantee better.',
    citations: ['dagger-2011'],
  },
  {
    id: 'distribution-shift',
    term: 'distribution shift',
    definition:
      'Distribution shift is the mismatch between a model\'s training data and its deployment data. Demonstrations come from a few labs\' robots, cameras and lighting; deployment spans unseen homes, objects and clutter. A policy can do well on held-out data from its training distribution yet fail in a new kitchen. Open-world evaluations test this gap: pi0.5 was evaluated in three real homes outside its training set. Lin et al. found generalization to new environments and objects scales with data diversity more than raw volume.',
    citations: ['pi05-2025', 'lin-data-scaling-laws-2024'],
  },
  {
    id: 'diffusion-policy',
    term: 'diffusion policy',
    definition:
      'A diffusion policy is a policy generating a whole action sequence by conditional denoising diffusion instead of regressing one action. Introduced by Chi et al. in 2023, it represents multimodal demonstrations without averaging their modes. It executes only the first few steps of each sequence, then observes again and replans.',
    citations: ['diffusion-policy-2023'],
  },
  {
    id: 'domain-randomization',
    term: 'domain randomization',
    definition:
      'Domain randomization is training a policy across a distribution of simulators with randomized visual appearance, dynamics or both, so the real world reads as one more sample. Tobin et al. randomized rendering and transferred an object detector to a real arm. Peng et al. randomized dynamics and transferred a pushing policy with no real-world training. The cost is conservatism: such a policy is optimal for no single instance.',
    citations: ['tobin-2017', 'peng-2018'],
  },
  {
    id: 'forward-kinematics',
    term: 'forward kinematics',
    definition:
      'Forward kinematics is the map from a robot\'s joint angles to its end-effector pose, a deterministic composition of per-joint transforms. It is cheap, smooth and single-valued, so it can run in every control cycle.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'inverse-kinematics',
    term: 'inverse kinematics',
    definition:
      'Inverse kinematics is finding joint angles that place the end effector at a target pose, the reverse of forward kinematics. The nonlinear problem can have no solution, one or many; numerical methods search iteratively.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'sim-to-real-gap',
    term: 'sim-to-real gap',
    definition:
      'The sim-to-real gap is the discrepancy between a simulator\'s physics and rendering and the real world, which degrades simulation-trained policies on hardware. Its independent components include dynamics, sensing and actuation. The standard transfer methods (domain randomization, system identification, teacher-student distillation, real-to-sim reconstruction) each attack a different part.',
    citations: ['reality-gap-survey-2026'],
  },
  {
    id: 'temporal-ensembling',
    term: 'temporal ensembling',
    definition:
      'Temporal ensembling is ACT\'s execution scheme for overlapping action chunks: the policy runs every timestep and averages in-flight predictions for the current step with exponential weights. In the pinned ACT reference implementation, predictions ordered oldest to newest get weight exp(-0.01 * i), so the oldest retained prediction has the largest weight. Handoffs are smoother, at the cost of one inference per step instead of per chunk.',
    citations: ['act-aloha-2023', 'act-reference-2023'],
  },
  {
    id: 'knowledge-insulation',
    term: 'knowledge insulation',
    definition:
      'Knowledge insulation is Physical Intelligence\'s recipe for protecting a vision-language-action model\'s pretrained backbone from action learning. The backbone trains on discrete action tokens with its usual autoregressive loss, while a separate flow-matching expert, behind a stop-gradient, produces continuous actions. On the paper\'s bussing task it reaches a given performance in 7.5 times fewer steps than π0 and follows language better, in and out of distribution.',
    citations: ['knowledge-insulation-paper-2025'],
  },
  {
    id: 'real-time-chunking',
    term: 'real-time chunking',
    definition:
      'Real-time chunking is an inference-time scheme keeping chunked policies responsive when inference is slower than control. While the robot finishes the current chunk, the policy conditions the next on the actions that will already have executed when inference returns, holding that prefix fixed. Black, Galliker and Levine introduced it for flow-matching policies; it tracks moving targets under delays that break naive chunking and temporal ensembling.',
    citations: ['real-time-chunking-2025'],
  },
  {
    id: 'hierarchical-policy',
    term: 'hierarchical policy',
    definition:
      'A hierarchical policy is a control architecture in which a high-level policy chooses what to do next and low-level policies execute it. SayCan scores a supplied skill library by language-model relevance times estimated affordance and executes the top skill. Its mobile-robot implementation pairs learned picking with hand-designed navigation and placement.',
    citations: ['saycan-2022'],
  },
  {
    id: 'open-x-embodiment',
    term: 'Open X-Embodiment',
    definition:
      'Open X-Embodiment is a 2023 collaboration of 34 labs that pooled 60 existing robot datasets into one standardized format: over a million trajectories from 22 embodiments, covering 527 skills. Its RT-X models, trained on the pool, beat policies trained on each robot\'s data alone and carried skills to embodiments they saw little of.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'teleoperation',
    term: 'teleoperation',
    definition:
      'Teleoperation is direct remote control of a robot by a human operator, used in robot learning mostly to record expert demonstrations. In the cheap, precise ALOHA rig, the operator back-drives a leader arm twinning the follower joint for joint, so recordings are in the robot\'s own action space. Mobile ALOHA extended this leader-follower scheme to a mobile base for whole-body tasks.',
    citations: ['act-aloha-2023', 'mobile-aloha-2024'],
  },
  {
    id: 'success-rate',
    term: 'success rate',
    definition:
      'Success rate is the fraction of attempted episodes in which a policy completes the task, the standard headline metric of robot learning evaluation. A reported rate needs its trial count, time limit and scene distribution. Toyota Research Institute\'s Large Behavior Model study analyzed 1,800 real-world rollouts and warned of a significant risk of statistical noise from insufficient power. Snyder et al.\'s STEP sequential test needs up to 32% fewer trials than the Lai and SAVI baselines.',
    citations: ['tri-lbm-2025', 'optimal-stopping-2025'],
  },
  {
    id: 'ppo',
    term: 'PPO',
    definition:
      'PPO (proximal policy optimization) is the on-policy reinforcement learning algorithm the locomotion literature standardized on. Schulman and colleagues introduced it as a policy gradient method alternating between sampling environment data and optimizing a surrogate objective by stochastic gradient ascent. The surrogate allows several minibatch epochs per batch where standard policy gradient takes one step. It keeps most of trust region policy optimization\'s reliability without second-order machinery, and suits massively parallel simulation, whose thousands of robots supply its enormous on-policy batches.',
    citations: ['ppo-2017', 'rudin-2021'],
  },
  {
    id: 'parallel-simulation',
    term: 'parallel simulation',
    definition:
      'Parallel simulation is running thousands of physics simulator instances at once on one GPU, so one workstation gathers reinforcement learning experience at rates that once needed CPU clusters. Isaac Gym made this practical by keeping physics and policy training on the GPU, passing data from physics buffers to PyTorch tensors without the CPU. That gave two to three orders of magnitude more throughput over a CPU simulator feeding a GPU learner. With PPO on one workstation GPU, Rudin et al.\'s four thousand ANYmal instances learned flat-terrain walking in under four minutes and uneven terrain in twenty.',
    citations: ['isaac-gym-2021', 'rudin-2021'],
  },
  {
    id: 'reward-shaping',
    term: 'reward shaping',
    definition:
      'Reward shaping is adding rewards to a task\'s base reward to guide learning, usually densifying a sparse success signal. Ng, Harada, and Russell asked which changes leave a Markov decision process\'s optimal policy unchanged. They proved a shaping reward equal to a potential-function difference across the two states is sufficient, and effectively necessary. Classic shaping bugs, where the agent harvests the bonus instead of doing the task, come from non-potential-based rewards, which the theorem excludes.',
    citations: ['ng-reward-shaping-1999'],
  },
  {
    id: 'whole-body-control',
    term: 'whole-body control',
    definition:
      'Whole-body control is treating all of a robot\'s actuated degrees of freedom (legs, torso, arms, hands) as one coupled problem instead of an arm controller stacked on a separate locomotion controller. Model-based versions optimize against the full rigid-body dynamics. Zhang et al. ran whole-body MPC in real time on hardware with plain iLQR and MuJoCo, for dynamic quadruped locomotion and full-sized humanoid walking. Learned versions track retargeted human motion, as H2O did for real-time whole-body teleoperation, with reinforcement learning restoring the balance and contact feasibility raw retargeting loses.',
    citations: ['mujoco-ilqr-2026', 'h2o-2024'],
  },
  {
    id: 'legged-locomotion',
    term: 'legged locomotion',
    definition:
      'Legged locomotion is moving on legs instead of wheels or tracks, re-establishing balance at every discrete, intermittent foothold with no continuous contact patch. Conventional controllers were elaborate state machines triggering motion primitives and reflexes, growing more complex without nearing animal generality. The ETH Zurich line replaced them with simulation-trained reinforcement learning. Lee et al.\'s ANYmal controller generalized zero-shot to alpine terrain on proprioception alone, and Miki et al. extended the recipe to perceptive locomotion in the wild.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'mpc',
    term: 'model predictive control',
    definition:
      'Model predictive control is constant re-planning against an explicit dynamics model: each step it optimizes a short action sequence, executes only the first action and re-solves from the measured state. Per-step feedback corrects model error instead of freezing it into policy weights, so MPC shows less frozen-policy sim-to-real failure; a wrong model still costs closed-loop performance. Long assumed too slow for full robot dynamics, whole-body MPC now runs in real time on quadruped and humanoid hardware with Zhang and colleagues\' MuJoCo-based iLQR controller. Posted in 2025, it was revised in 2026 to appear at ICRA 2026.',
    citations: ['mujoco-ilqr-2026'],
  },
  {
    id: 'flow-matching',
    term: 'flow matching',
    definition:
      'Flow matching is a generative modeling recipe that learns a time-dependent vector field carrying noise to data, by regressing against the conditional flow instead of estimating a score. In pi0, which brought it to robot control, an action expert trained this way denoises continuous action chunks. Integrating the field as an ODE for a handful of steps is fast enough for high-frequency control and keeps diffusion policies\' multimodality.',
    citations: ['pi0-2024'],
  },
  {
    id: 'world-model',
    term: 'world model',
    definition:
      'A world model is a model an agent queries to make decisions: given the current observation or state and a candidate action, it predicts what happens next. Policies can be trained, evaluated or planned against it instead of the real world. The 2026 robotics survey requires predictions that change under the agent\'s action in ways useful for decisions; plausible future images are not enough. The name covers at least six architecturally distinct paradigms, from compact latent dynamics models to action-conditioned video generators.',
    citations: ['world-model-survey-2026'],
  },
  {
    id: 'end-effector',
    term: 'end effector',
    definition:
      'An end effector is the last link of a robot arm plus its gripper, hand or tool, whose pose the arm exists to place. Kinematics is conventionally the map from joint angles to that pose. Many learned manipulation policies act in end-effector deltas, others in joint targets; across 13,000+ real rollouts, joint space favored control stability and task space favored generalization.',
    citations: ['modern-robotics-2017', 'action-space-design-2026', 'act-aloha-2023'],
  },
  {
    id: 'jacobian',
    term: 'Jacobian',
    definition:
      'The Jacobian is the derivative of the forward-kinematics map: a matrix with one column per joint, relating joint velocities to end-effector velocity at the current configuration. It can lose rank at singularities, where some task-space direction needs unbounded joint speeds. Its transpose maps an end-effector wrench to the balancing joint torques, so it serves both velocity-level control and statics.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'proprioception',
    term: 'proprioception',
    definition:
      'Proprioception is sensing the body\'s own state (joint positions and velocities, orientation, contact), as opposed to exteroception of the outside world through cameras or lidar. It is fast, cheap and never occluded. At ETH Zurich, Lee et al.\'s ANYmal controller hiked mud, snow, rubble and vegetation on proprioception alone. Miki et al. kept it as the trusted fallback when the terrain map disagrees with the body.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'system-identification',
    term: 'system identification',
    definition:
      'System identification is fitting a simulator\'s parameters to a real robot\'s measured dynamics, shrinking the sim-to-real gap by calibration. Hwangbo et al. found actuator error the dominant transfer obstacle on ANYmal and replaced its miscalibrated analytic model with a learned network from joint-command history to realized torque. It attacks the gap\'s dynamics component directly; domain randomization only averages over it.',
    citations: ['hwangbo-2019', 'reality-gap-survey-2026'],
  },
  {
    id: 'retargeting',
    term: 'retargeting',
    definition:
      'Retargeting is mapping motion recorded on one body, usually a human\'s, onto a robot with different proportions and joint limits, so human demonstrations become references the robot can track. Raw retargeting ignores the robot\'s physical constraints and can produce morphologically infeasible references. H2O and ASAP therefore add reinforcement learning that restores balance and contact feasibility on the real body.',
    citations: ['h2o-2024', 'asap-2025'],
  },
  {
    id: 'imitation-learning',
    term: 'imitation learning',
    definition:
      'Imitation learning is learning a policy from expert demonstrations instead of a reward signal, by supervised fitting of recorded state-action pairs. Pomerleau\'s ALVINN (1988) trained on simulated road images before steering NAVLAB; the recipe still underlies most learned manipulation. Its structural weakness: training states come from the expert while deployment visits the learner\'s own, the mismatch DAgger was designed to repair.',
    citations: ['dagger-2011', 'alvinn-1988'],
  },
  {
    id: 'scaling-law',
    term: 'scaling law',
    definition:
      'A scaling law is an empirical relation between performance and resources (parameters, data or compute), first made precise for language models and now measured in robot learning. Lin et al. found imitation-learning generalization to new objects and environments tracks data diversity more than raw hours. EgoScale reported a log-linear relationship between hours of egocentric human video and dexterous-manipulation success across four orders of magnitude.',
    citations: ['lin-data-scaling-laws-2024', 'egoscale-2026'],
  },
  {
    id: 'vision-language-model',
    term: 'vision-language model',
    definition:
      'A vision-language model is a model pretrained jointly on web-scale image and text data, so visual recognition and language semantics share one set of weights. RT-2 bet this pretraining helps control: co-fine-tuning on robot trajectories plus the original web data transfers semantic knowledge, like recognizing objects and following instructions the robot data never covered. Later vision-language-action models all start from such a backbone.',
    citations: ['rt2-2023'],
  },
  {
    id: 'affordance',
    term: 'affordance',
    definition:
      'An affordance is an estimate of whether an available skill can succeed now. SayCan combines it with a language model\'s usefulness score for the skill. Its learned picking value functions require empirical calibration, and its navigation and placement affordances use hand-designed rules. A high score is not confirmation of successful execution.',
    citations: ['saycan-2022'],
  },
  {
    id: 'curriculum-learning',
    term: 'curriculum learning',
    definition:
      'Curriculum learning is training on tasks that start easy and grow harder as the agent improves. Rudin et al. adjusted each robot\'s terrain level by its progress. Their documented curriculum-trained policy for simulation and deployment used 4,096 robots, 98,304 transitions per batch and 1,500 updates in under twenty minutes on an i9-11900k CPU and RTX A6000 GPU. Their separate flat-terrain headline is under four minutes on one workstation GPU.',
    citations: ['rudin-2021'],
  },
  {
    id: 'teacher-student-distillation',
    term: 'teacher-student distillation',
    definition:
      'Teacher-student distillation is training two policies in sequence for partial observability. A teacher sees privileged simulator state such as exact terrain friction or object pose; a student imitates it using only deployment observations. RMA instead trained a base policy with a privileged encoder, then a separate state-action-history module predicting its latent extrinsics for asynchronous online inference. Lee and colleagues distilled a privileged ANYmal teacher into a proprioceptive student that hikes challenging terrain without ever seeing it.',
    citations: ['rma-2021', 'lee-2020'],
  },
  {
    id: 'action-tokenization',
    term: 'action tokenization',
    definition:
      'Action tokenization is expressing continuous robot actions as discrete tokens a language model can produce. RT-2 mapped 256 uniform bins per action dimension onto rarely used vocabulary tokens for ordinary next-token training. It is simple and keeps web knowledge, but 256 bins are coarse and autoregressive decoding is slow; later work used continuous experts and parallel decoding.',
    citations: ['rt2-2023'],
  },
  {
    id: 'latent-dynamics',
    term: 'latent dynamics',
    definition:
      'Latent dynamics is a world-model paradigm predicting in a compact learned latent space instead of pixels. The agent learns or plans entirely inside imagined rollouts of a recurrent latent state and reward under candidate actions. Dreamer established training an actor-critic purely on imagined trajectories. TD-MPC2 dropped the image decoder altogether, scoring action sequences under the latent model with a learned terminal value.',
    citations: ['dreamer-2019', 'tdmpc2-2023'],
  },
  {
    id: 'degrees-of-freedom',
    term: 'degrees of freedom',
    definition:
      'Degrees of freedom are the number of independent coordinates needed to specify a mechanism\'s configuration; an arm has one per independent joint. A 7-DoF arm has one redundant coordinate beyond the six a rigid end-effector pose needs, so its elbow can reconfigure while the hand stays put. More degrees of freedom buy dexterity and obstacle avoidance at the price of a larger control problem.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'denavit-hartenberg-parameters',
    term: 'Denavit-Hartenberg parameters',
    definition:
      'Denavit-Hartenberg parameters are a four-parameter representation of a kinematic chain. LaValle describes revolute chains by an axial offset, a joint-axis angle, and the distance and angle between successive axes. Conventions differ in frame assignment, indexing and transform order, so a table must name its convention. Near-parallel axes can make the parameters ill-conditioned; product-of-exponentials avoids this.',
    citations: ['lavalle-2006', 'modern-robotics-2017'],
  },
  {
    id: 'configuration-space',
    term: 'configuration space',
    definition:
      'Configuration space is the space of a robot\'s configurations, one point per complete joint assignment; a 7-DoF arm moves through a 7-dimensional space with joint angles as coordinates. Lozano-Pérez introduced the planning formulation in 1983: shrink the robot to a point and grow obstacles by its shape, making collision-free motion a path through free space. Geometric motion planning searches it for paths. A kinodynamic planner can instead use a state that includes both configuration and velocity.',
    citations: ['lozano-perez-1983', 'lavalle-2006', 'lavalle-1998'],
  },
  {
    id: 'trajectory-optimization',
    term: 'trajectory optimization',
    definition:
      'Trajectory optimization is motion planning by numerically optimizing a candidate trajectory. CHOMP pairs a dynamics prior with a workspace arc-length obstacle cost, using inverse-metric covariant updates. TrajOpt uses sequential convex subproblems, nonlinear constraint penalties and a trust region that can expand or shrink. Such local optimization can fail and depends on its initial trajectory. Ratliff et al. describe refining a feasible PRM/RRT path; Schulman et al. also study planning from infeasible seeds. Neither source shows this is the standard industrial pipeline, and their collision-handling assumptions are not unconditional safety guarantees.',
    citations: ['ratliff-2009', 'schulman-2013'],
  },
  {
    id: 'kalman-filter',
    term: 'Kalman filter',
    definition:
      'The Kalman filter is the recursive state estimator for linear systems with Gaussian noise. It predicts the estimate and covariance through the motion model, then fuses each measurement with a gain weighing model against sensor uncertainty. Kalman published it in 1960; it is minimum-variance in the linear-Gaussian case. The extended Kalman filter linearizes nonlinear models about the current estimate.',
    citations: ['kalman-1960-filter', 'thrun-2005'],
  },
  {
    id: 'factor-graph',
    term: 'factor graph',
    definition:
      'A factor graph is a bipartite graph of a probability distribution\'s factorization: variable nodes hold unknown states, factor nodes the measurements and motion constraints linking them. Kschischang, Frey and Loeliger unified inference on these graphs under the sum-product algorithm in 2001. Over a robot trajectory, it makes smoothing and SLAM one sparse least-squares problem, as in Square Root SAM and its incremental successors.',
    citations: ['kschischang-2001', 'dellaert-kaess-2006'],
  },
  {
    id: 'slam',
    term: 'SLAM',
    definition:
      'SLAM (simultaneous localization and mapping) is estimating a robot\'s state while building a model of its environment. In Square Root SAM\'s landmark-based formulation, the unknowns include the robot trajectory and landmark map. Given known data associations, Gaussian process and measurement models, a uniform landmark prior and a fixed initial reference frame, joint MAP estimation becomes nonlinear least squares. Cadena et al. call MAP estimation, often expressed with factor graphs, a standard SLAM formulation, while noting high-performing EKF-based systems.',
    citations: ['cadena-2016', 'dellaert-kaess-2006'],
  },
  {
    id: 'friction-cone',
    term: 'friction cone',
    definition:
      'A friction cone is the set of forces a frictional point contact can exert without slipping: all forces within arctan(mu) of the surface normal, mu being the Coulomb friction coefficient. Tangential load is resisted only up to mu times the normal load, so the cone widens with friction and collapses to the normal ray without it. In the plane it is a wedge between two edge rays, making planar grasp analysis convex geometry.',
    citations: ['murray-li-sastry-1994', 'prattichizzo-trinkle-2016'],
  },
  {
    id: 'force-closure',
    term: 'force closure',
    definition:
      'Force closure is the property that a grasp can resist any external wrench with contact forces inside the friction cones. Equivalently, the convex hull of the primitive contact wrenches contains the wrench-space origin strictly inside. Nguyen showed two frictional contacts achieve it exactly when the line through the contact points lies strictly inside both friction cones, the antipodal condition.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'form-closure',
    term: 'form closure',
    definition:
      'Form closure is force closure by geometry alone: frictionless contact normals positively span the wrench space, immobilizing the object however small the friction. Bicchi showed it is exactly frictionless force closure. It needs at least four contacts in the plane and seven in space, so practical grasps rely on friction.',
    citations: ['bicchi-1995', 'mishra-1987'],
  },
  {
    id: 'grasp-wrench-space',
    term: 'grasp wrench space',
    definition:
      'The grasp wrench space is the set of net wrenches a grasp can apply, mapped from admissible contact forces through the grasp map. With convex friction cones, it is the convex hull of the primitive cone-edge wrenches, a polytope. Force closure means the origin lies strictly inside; the Ferrari-Canny quality metric is the radius of the largest origin-centered ball inside.',
    citations: ['ferrari-canny-1992', 'bicchi-kumar-2000'],
  },
  {
    id: 'antipodal-grasp',
    term: 'antipodal grasp',
    definition:
      'An antipodal grasp is a two-contact grasp in which the line through the contact points lies strictly inside both friction cones. Nguyen proved this is exactly force closure for a planar frictional pair, which can squeeze along that line and torque both ways. It is the workhorse of parallel-jaw grippers, and strictness matters: a line exactly on a cone edge resists every wrench except the one sliding the object out.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'mechanoreceptor',
    term: 'mechanoreceptor',
    definition:
      'A mechanoreceptor is a sensory nerve ending that fires under mechanical stimuli such as pressure, vibration or skin stretch. The human hand\'s glabrous skin has about 17,000 low-threshold mechanoreceptors, roughly 1,000 per fingertip, in four varieties trading spatial localization against temporal response. Sanctuary\'s Phoenix finger pads use a seven-cell micro-barometer sensitive to 5 mN, against about 3 mN for humans. Meta\'s Digit 360 research fingertip resolves normal force to 1.01 mN.',
    citations: ['macefield-touch-2022', 'brooks-dexterity-2025', 'rr-sanctuary-tactile-2025', 'digit-360-2024'],
  },
  {
    id: 'tactile-sensing',
    term: 'tactile sensing',
    definition:
      'Tactile sensing is sensing contact through a robot\'s skin with pressure arrays, barometric cells or optical fingertip cameras. They measure contact location, pressure and slip, and matter most once closed fingers hide the contact from the camera. Sanctuary\'s micro-barometer finger pads detect about five millinewtons, against roughly three for human touch. Coverage, durability and training-pipeline integration remain open problems.',
    citations: ['tactile-outlook-2025', 'rr-sanctuary-tactile-2025'],
  },
  {
    id: 'in-hand-manipulation',
    term: 'in-hand manipulation',
    definition:
      'In-hand manipulation is repositioning or reorienting a grasped object within the hand without setting it down, like rolling a pen or turning a key. Fingers occlude the contact, so vision handles it poorly. Sanctuary demonstrated zero-shot in-hand reorientation with its 21-DoF hydraulic hands in 2024. Holson\'s Robot Olympics makes it the gold-medal bar for tool use with the key-in-lock task.',
    citations: ['sanctuary-inhand-2024', 'holson-olympics-2025'],
  },
  {
    id: 'contact-rich-manipulation',
    term: 'contact-rich manipulation',
    definition:
      'Contact-rich manipulation is manipulation governed by making, holding and breaking contact: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since stick flips to slip across a friction boundary, so small sensing errors produce large outcome errors. TouchWorld\'s six-task tactile benchmark for touch-driven policies is built entirely from such tasks.',
    citations: ['touchworld-2026', 'tactile-outlook-2025'],
  },
  {
    id: 'long-tail',
    term: 'long tail',
    definition:
      'The long tail is the individually rare, collectively decisive part of the scenario distribution. Examples are a couch fallen off a truck, a pedestrian in dark clothing outside a crosswalk and a traffic cop waving cars through a red light. None appears often enough in natural driving logs to learn from directly, yet each can decide deployability. Autonomous-driving teams attack it with simulation. Waymo\'s Genie-3-based World Model targets events \'from a tornado to a casual encounter with an elephant\', which are \'almost impossible to capture at scale in reality\'.',
    citations: ['waymo-world-model-2026', 'koopman-safe-enough-2026'],
  },
  {
    id: 'operational-design-domain',
    term: 'operational design domain (ODD)',
    definition:
      'An operational design domain (ODD) is the set of conditions an automated driving system is designed for: geography, road types, speed range, weather and time of day. SAE J3016 builds the ODD into the level definitions, so a Level 4 robotaxi can work in Phoenix and fail in a blizzard. Crash-rate comparisons match the human baseline to the ODD\'s vehicle types, road types and locations.',
    citations: ['sae-j3016-2021', 'waymo-crash-rates-2025'],
  },
  {
    id: 'end-to-end-driving',
    term: 'end-to-end driving',
    definition:
      'End-to-end driving is a policy mapping raw sensor input directly to a motion plan or vehicle commands, without separate perception, prediction and planning modules. The motivation is joint optimization: one network tunes every parameter for the driving objective, while modular pipelines accumulate errors at hand-engineered interfaces. UniAD moved the industry compromise by training all stages in one differentiable network with the task structure kept. EMMA went further, building on Gemini and representing trajectories and 3D locations as text.',
    citations: ['uniad-2023', 'emma-2024', 'e2e-ad-survey-2024'],
  },
  {
    id: 'visual-inertial-odometry',
    term: 'visual-inertial odometry (VIO)',
    definition:
      'Visual-inertial odometry (VIO) is state estimation for a flying robot fusing camera images with inertial measurement unit data. The camera fixes long-term drift, the IMU gives high-rate accelerations between frames, and a filter or optimizer over both yields the metric pose and velocity flight control needs. Needing no external infrastructure or GPS, it is the standard onboard localization for small drones. Swift\'s perception fuses a visual-inertial estimator and a convolutional gate detector in a Kalman filter for its control policy.',
    citations: ['swift-drone-racing-2023'],
  },
  {
    id: 'swarm-robotics',
    term: 'swarm robotics',
    definition:
      'Swarm robotics is coordinating many relatively simple robots through local interaction, without a central planner, for collective behavior no individual achieves, such as coverage, mapping or search at fleet scale. Classical models of pairwise attractions and repulsions (potential fields, after Reynolds flocking) explain collective motion but guarantee neither safety nor speed in clutter. Aerial swarms now optimize trajectories onboard: each drone plans in milliseconds from its own sensors, treating neighbors as constraints. Ten drones crossed a bamboo forest this way with no external localization or global map.',
    citations: ['micro-drone-swarm-2022', 'soria-nmpc-swarm-2021'],
  },
  {
    id: 'minimally-invasive-surgery',
    term: 'minimally invasive surgery',
    definition:
      'Minimally invasive surgery is surgery through small incisions with elongated instruments and a camera, instead of a large open incision. In laparoscopy, its abdominal form, the surgeon works through trocar ports in a gas-insufflated workspace, watching 2D or 3D video. Recovery is faster, but direct touch, natural hand-eye alignment and fine dexterity are lost. Surgical robots restore dexterity at depth with wristed instruments, a stable magnified stereo view at the console, and precision with motion scaling and tremor filtering. The da Vinci systems are cleared for these procedures and have been used in millions.',
    citations: ['davinci5-clearance-2024', 'intuitive-q4-2025'],
  },
  {
    id: 'robotic-assisted-surgical-device',
    term: 'robotic assisted surgical device',
    definition:
      'A robotic assisted surgical device (RASD) is the US regulatory category for surgical robots, cleared or authorized to assist a surgeon, who remains the one practicing medicine. The Versius authorization was the first for a multiport soft-tissue general surgical system through the FDA\'s De Novo pathway. It is explicitly worded as assisting in precise and accurate control of endoscopic instruments, for one indicated procedure, adult cholecystectomy. Systems gain autonomy or new procedures one cleared indication at a time, which is why shipped autonomy sits far below research demonstrations.',
    citations: ['cmr-versius-authorization-2024', 'yang-autonomy-2017'],
  },
  {
    id: 'force-feedback',
    term: 'force feedback',
    definition:
      'Force feedback is sensing interaction forces at the instrument tip and rendering them as resistance at the operator\'s controls. In teleoperation it closes the haptic loop: without it, a surgeon infers tissue contact from visual cues alone and can exert more force than intended. The da Vinci 5 introduced Force Feedback instruments that measure and display subtle tissue forces, a first for a surgical system in any modality. Intuitive reported up to 43 percent less force exerted on tissue in preclinical trials with it.',
    citations: ['davinci5-clearance-2024'],
  },
  {
    id: 'in-situ-resource-utilization',
    term: 'in-situ resource utilization (ISRU)',
    definition:
      'In-situ resource utilization (ISRU) is producing mission consumables at the destination from local materials instead of launching them from Earth. Examples are oxygen from the Martian atmosphere, water or metals from lunar regolith, and propellant from both. NASA frames it as astronauts living off the land: each kilogram made on site skips a launch vehicle, and Mars-return propellant would dominate an all-Earth-supplied mass budget. MOXIE, aboard Perseverance, first demonstrated it on another planet by electrolyzing atmospheric carbon dioxide into oxygen. Its robotics side is excavation, drilling and material handling in vacuum and regolith, terrestrial contact-rich manipulation under harsher constraints.',
    citations: ['moxie-completion-2023', 'prime-1-lunar-2025'],
  },
  {
    id: 'on-orbit-servicing',
    term: 'on-orbit servicing',
    definition:
      'On-orbit servicing is using one spacecraft to work on another after launch. Tasks include docking with an aging satellite to take over its propulsion, refueling, replacing failed components, assembling large structures and removing debris. The robotics is rendezvous and proximity operations at centimeter-per-second tolerances, plus capture and manipulation of hardware rarely designed for servicing. Staged demonstrations ran from Japan’s ETS-VII and DARPA’s Orbital Express; it became commercial when Northrop Grumman’s MEV-1 docked with Intelsat 901 in 2020 to extend its life. Debris inspection and removal, with an uncooperative tumbling client, remains unserved.',
    citations: [
      'ets-vii-ard-2001',
      'orbital-express-2008',
      'mev1-servicing-2025',
      'adras-j-15m-2024',
    ],
  },
  {
    id: 'impedance-control',
    term: 'impedance control',
    definition:
      'Impedance control is Hogan\'s 1985 formulation of compliant contact control, programming the relationship between position and force instead of commanding either. The manipulator acts like a mass-spring-damper at the contact: position error drives force through the chosen stiffness and damping, so the arm yields and pushes back only as programmed. By port duality, a contact can be commanded in motion or force, its two conjugate variables, but not both independently; impedance control takes motion as input and force as output.',
    citations: ['hogan-1985'],
  },
  {
    id: 'admittance-control',
    term: 'admittance control',
    definition:
      'Admittance control is compliant control that measures contact force and commands motion in response, the dual of impedance control. A wrist force-torque sensor reads the force, the admittance law turns it into a position or velocity correction, and the motion controller executes it. It suits stiff, geared, non-backdrivable arms with an excellent position loop but no torque channel, adding compliance in software at the cost of measurement and loop delay. Ott, Mukherjee and Nakamura cast both schemes as the two causal assignments of one interaction port.',
    citations: ['ott-2010'],
  },
  {
    id: 'hybrid-force-position-control',
    term: 'hybrid force/position control',
    definition:
      'Hybrid force/position control is Raibert and Craig\'s split of a contact task into orthogonal subspaces. In a task frame chosen from contact geometry, force is controlled along axes the environment constrains and position along free axes, never both on one axis. Polishing controls force normal to the surface and tracks a path tangent to it. Sliding a block in a slot controls force into the walls and position along the slot. Mason\'s earlier analysis showed how to pick those directions from contact geometry.',
    citations: ['raibert-craig-1981', 'mason-1981'],
  },
  {
    id: 'series-elastic-actuator',
    term: 'series elastic actuator',
    definition:
      'A series elastic actuator is one with a deliberately soft spring between gear train and load, proposed by Pratt and Williamson in 1995. The spring\'s deflection measures transmitted force cheaply, replacing a fragile wrist sensor in the force loop. It also mechanically low-passes impacts, so a collision loads the drivetrain far less than a rigid joint. The cost is bandwidth and position accuracy, which is why it dominates in legged robots and collaborative arms, where force fidelity and impact tolerance outweigh stiffness.',
    citations: ['pratt-williamson-1995'],
  },
  {
    id: 'backdrivability',
    term: 'backdrivability',
    definition:
      'Backdrivability is how easily an external force can move a joint with the actuators passive, and it decides which compliance scheme fits the hardware. Direct-drive and quasi-direct-drive arms are backdrivable: pushing the link turns the motor with little resistance. In high-ratio geared arms, the gears and position loop hold the joint rigid. Impedance control assumes a force-source arm, suiting low-inertia backdrivable designs. Non-backdrivable geared arms need admittance control with a force sensor, or a series elastic element to restore a mechanical force channel.',
    citations: ['hogan-1985', 'pratt-williamson-1995'],
  },
  {
    id: 'camera-intrinsics',
    term: 'camera intrinsics',
    definition:
      'Camera intrinsics are the camera\'s own parameters, independent of where it is mounted: focal length in pixels along each axis, the principal point where the optical axis meets the sensor, and lens distortion. Zhang\'s method recovers them from a few views of a planar target at unknown orientations, so robots calibrate with a printed checkerboard instead of a metrology rig. Without them a pixel is only a direction in an unknown parameterisation, and no image measurement converts into a metric ray.',
    citations: ['zhang-2000-calibration'],
  },
  {
    id: 'hand-eye-calibration',
    term: 'hand-eye calibration',
    definition:
      'Hand-eye calibration is estimating the rigid transform between a camera and the robot frame it reports into. That is gripper to camera for a wrist-mounted camera, and the robot base to the camera for a fixed one. Tsai and Lenz posed it as solving AX = XB from robot motions and the camera\'s observed motion of a static target, the formulation most implementations still use. Translation error is a constant offset; rotation error is an angle, so its cost in millimetres grows with target distance.',
    citations: ['tsai-lenz-1989'],
  },
  {
    id: 'point-cloud',
    term: 'point cloud',
    definition:
      'A point cloud is a set of 3D points, usually with no ordering and no connectivity, as produced by back-projecting depth-camera or lidar measurements through the camera intrinsics. A network reading it must be permutation invariant. PointNet uses a shared per-point encoder and symmetric pooling; PointNet++ recursively applies local PointNets to metric-space neighbourhoods for multi-scale features. Pooling summarizes, so some geometry can be lost; density-adaptive grouping addresses sparse neighbourhoods.',
    citations: ['pointnet-2017', 'pointnet-plus-plus-2017'],
  },
  {
    id: 'semantic-segmentation',
    term: 'semantic segmentation',
    definition:
      'Semantic segmentation is labelling every pixel of an image with a class, instead of boxing each object. Manipulation needs the per-pixel form because grasps are planned on surface regions. A box around a mug also contains the table behind it; a mask does not.',
    citations: ['segment-anything-2023'],
  },
  {
    id: 'promptable-segmentation',
    term: 'promptable segmentation',
    definition:
      'Promptable segmentation is predicting a mask from an image plus prompts such as foreground/background points, a box or a mask. SAM trained on SA-1B, reported as 1.1 billion automatically generated masks from 11 million images. Its paper evaluates zero-shot transfer to new datasets; an ambiguous prompt can produce multiple candidate masks, and performance is not guaranteed on every image distribution. SAM 2 extends geometric prompting across video with streaming memory of predictions and prompted frames; further prompts refine masks. Tracking can fail after shot changes, occlusion or similar-object confusion. In SAM\'s instance-segmentation experiment, a separate ViTDet detector supplies the box prompt.',
    citations: ['segment-anything-2023', 'sam2-2024'],
  },
  {
    id: 'pose-estimation',
    term: 'pose estimation',
    definition:
      'Pose estimation is recovering an object\'s full rigid position and orientation, six degrees of freedom, from sensor data. Instance-level methods such as PoseCNN train per object and need that object\'s exact model. Model-free methods such as FoundationPose take a CAD model or a few reference images at test time and handle unseen objects. Pose estimation turns a detection into grasp-planner input, because force closure is computed against a known pose.',
    citations: ['posecnn-2018', 'foundationpose-2024'],
  },
  {
    id: 'add-s-metric',
    term: 'symmetry-aware pose error (ADD-S)',
    definition:
      'Symmetry-aware pose error (ADD-S) is a pose-error rule using nearest-neighbour matches instead of fixed model-point correspondences. In Hinterstoisser and colleagues\' LINEMOD-based paper, the plain error averages distances between corresponding model points under ground-truth and estimated poses; ADD-S instead matches each ground-truth-transformed point to the nearest estimated-pose-transformed model point before averaging. The paper names cup, bowl, box and glue as ambiguous, including from a subset of views. Its correctness rule is inclusive: the average distance must be at most a chosen coefficient times the model diameter, and their LINEMOD evaluation uses 0.1. The score and threshold are evaluation choices, so a visually indistinguishable rotation can still score a nonzero error.',
    citations: ['hinterstoisser-2012'],
  },
  {
    id: 'visual-servoing',
    term: 'visual servoing',
    definition:
      'Visual servoing is controlling a robot\'s motion with computer vision data. Image-based visual servoing (IBVS) builds its error from image features; position-based (PBVS) from estimated pose. Espiau, Chaumette and Rives applied a task-function framework to visual control in 1992, modelling translational and rotational camera velocity relative to the scene, expressed in the camera frame. IBVS\'s point-feature interaction matrix still needs depth and camera intrinsics. Under the tutorial\'s local stability conditions, coarse estimates can perturb a convergent camera path without changing the final pose; poor estimates can cause instability. Large displacements can meet singularities or local minima. PBVS pose errors can also affect final accuracy.',
    citations: ['espiau-1992', 'chaumette-hutchinson-2006'],
  },
  {
    id: 'occupancy-grid',
    term: 'occupancy grid',
    definition:
      'An occupancy grid is a map of cells, each storing the probability that it is occupied. Moravec and Elfes introduced it for wide-angle sonar, where each reading constrains both the space the beam crossed and where it reflected. Many readings build a map of empty and occupied regions. For a planner, its defining property is a third state: an unobserved cell is marked unknown, which rendering-oriented representations cannot express.',
    citations: ['moravec-elfes-1985', 'nav2-2020'],
  },
  {
    id: 'signed-distance-field',
    term: 'signed-distance field',
    definition:
      'A signed-distance field is a scalar field whose zero crossing represents a surface. Curless and Levoy fuse weighted signed distances measured along sensor lines of sight. KinectFusion uses a projective truncated field, an approximation of a true discrete signed-distance field; fusion approximates a pseudo-Euclidean distance metric. It estimates near-surface normals from numerical field derivatives, assuming orthogonality. It predicts the surface by ray marching and approximate interpolation, and no stored value is an exact collision margin.',
    citations: ['curless-levoy-1996', 'kinectfusion-2011'],
  },
  {
    id: 'neural-radiance-field',
    term: 'neural radiance field',
    definition:
      'A neural radiance field is a scene stored as a continuous function, a small neural network, from 3D position and viewing direction to volume density and view-dependent colour. Mildenhall et al. introduced it, synthesising images by differentiable volume rendering along camera rays, so the scene can be optimised from posed photographs alone. Its objective is view synthesis, so nothing in training shapes its geometry for a contact solver.',
    citations: ['nerf-2020', 'instant-ngp-2022'],
  },
  {
    id: 'gaussian-splatting',
    term: '3D Gaussian splatting',
    definition:
      '3D Gaussian splatting is a scene representation of anisotropic 3D Gaussians, each with position, covariance, opacity and view-dependent colour, rasterised onto the image plane instead of ray-marched. Kerbl et al. showed it reaches radiance-field quality at real-time frame rates, taking the family out of offline rendering. It has no surface: opacity is a rendering weight, so contact geometry needs separate surface extraction.',
    citations: ['3dgs-2023'],
  },
  {
    id: 'loop-closure',
    term: 'loop closure',
    definition:
      'Loop closure is recognising a mapped place and adding a validated constraint between observations. Cadena and colleagues note revisiting mapped landmarks can reduce, and possibly correct, odometric drift, whose size depends on the odometry method. In monocular ORB-SLAM, similarity alignment and Essential Graph optimization spread loop-closing error along the graph, so a revisit can leave residual error.',
    citations: ['cadena-2016', 'orb-slam-2015'],
  },
  {
    id: 'place-recognition',
    term: 'place recognition',
    definition:
      'Place recognition is deciding, in visual navigation, whether the current image shows a mapped place. Motion information can also inform that belief. Lowry et al. survey why it is hard: places change appearance, and different places can look alike. In Cadena and colleagues\' robustness argument, false-positive data associations can produce wrong back-end estimates; false negatives discard useful measurements and reduce estimation accuracy. Geometric verification and robust estimation can mitigate outliers, but do not establish a universal ranking of every false match against every missed match.',
    citations: ['lowry-2016-place-recognition', 'cadena-2016'],
  },
  {
    id: 'costmap',
    term: 'costmap',
    definition:
      'A costmap is the grid a mobile-robot navigation stack plans over: map and live sensor occupancy, inflated by the robot\'s footprint and marked with other route costs. A planner seeking a cheap path thus also seeks a safe one. Lu, Hershberger and Smart proposed and implemented layered costmaps in ROS Navigation: ordered semantic layers update a master 2D costmap, bounds first, then values. Layers may keep private grids or write directly to the master. Sensed obstacles may overwrite static-map costs if configured.',
    citations: ['layered-costmaps-2014', 'nav2-2020'],
  },
  {
    id: 'q-learning',
    term: 'Q-learning',
    definition:
      'Q-learning is learning a function predicting the return from each state-action pair, instead of a policy directly, then picking the action its own estimate rates highest. Sutton and Barto present it as the archetypal off-policy temporal-difference control method. Its update uses the best next action, whatever the behaviour policy did, so it can learn from experience it did not generate. Many off-policy and offline robotics algorithms build on it, adding safeguards against value estimates running away on unverifiable data.',
    citations: ['sutton-barto-2018', 'cql-2020'],
  },
  {
    id: 'on-policy',
    term: 'on-policy',
    definition:
      'An on-policy method is a learning method whose updates are valid only for data from the current policy, so each batch of experience is used once and discarded. PPO, the robotics default, alternates between sampling interaction data and optimizing a surrogate objective that allows several minibatch epochs per batch where plain policy gradient takes one step. This is costly when samples are expensive and nearly free when a GPU simulator yields hundreds of millions.',
    citations: ['ppo-2017', 'sutton-barto-2018'],
  },
  {
    id: 'off-policy',
    term: 'off-policy',
    definition:
      'An off-policy method is a learning method that can improve one policy from data generated by another, so old experience stays usable. Haarnoja and colleagues\' soft actor-critic, the robotics reference point, combines off-policy updates with a maximum-entropy objective against the sample complexity that keeps model-free deep RL off real hardware. They reported substantially better sample efficiency than on-policy methods on the same tasks.',
    citations: ['sac-2018', 'sutton-barto-2018'],
  },
  {
    id: 'replay-buffer',
    term: 'replay buffer',
    definition:
      'A replay buffer is the store of past transitions an off-policy learner samples gradient batches from. Its contents need not come from the current policy or even the learner. RLPD mixes prior offline data with fresh online experience in one buffer, and HIL-SERL seeds one with human demonstrations before autonomous collection.',
    citations: ['rlpd-2023', 'sac-2018'],
  },
  {
    id: 'sample-efficiency',
    term: 'sample efficiency',
    definition:
      'Sample efficiency is how much environment interaction a method needs to reach a set performance, counted apart from wall-clock time and gradient updates. Minitaur walking used 160,000 control steps over about two hours of the whole training process. A constant-rate budget illustration can turn steps into modelled time; that does not establish algorithm eligibility or predict another robot task.',
    citations: ['sac-2018', 'haarnoja-walk-2019'],
  },
  {
    id: 'offline-reinforcement-learning',
    term: 'offline reinforcement learning',
    definition:
      'Offline reinforcement learning is learning a policy from a fixed dataset of previously collected transitions, without new environment experience during training. The trained policy can then be deployed. Its central challenge is distributional shift, which is distinct from ordinary supervised generalization: policy improvement can query action values outside the data distribution, and errors can propagate through Bellman backups without environment feedback. Adequate data coverage and finite-data errors still matter.',
    citations: ['offline-rl-tutorial-2020', 'cql-2020'],
  },
  {
    id: 'hindsight-experience-replay',
    term: 'hindsight experience replay',
    definition:
      'Hindsight experience replay (HER) is an off-policy technique that replays stored transitions with alternative goals and recomputed rewards, alongside original-goal replay. It trains goal-conditioned policies and value functions; relabeling is not restricted to failed episodes or final states. Andrychowicz and colleagues tested it with DDPG on a simulated Fetch arm for pushing, sliding and pick-and-place. Their binary-reward description is qualified by a pushing contact-penetration reward penalty and by starting half of pick-and-place training episodes from a grasped state.',
    citations: ['her-2017'],
  },
  {
    id: 'reset-free-learning',
    term: 'reset-free learning',
    definition:
      'Reset-free learning is training on real hardware without a human resetting the scene between attempts. Sharma and colleagues separate deployed-policy regret over training from continuing average reward. Their base setting has no episodic resets; a non-ergodic extension adds a bounded, cost-decremented intervention budget. EARL’s experiments instead schedule occasional resets, reporting learning curves and final deployed-policy performance. Gupta and colleagues chain task-specific policies through a designer-provided task graph, so learned re-centering, pickup and flip-up can restore in-hand reorientation conditions after a drop. Their reported D’Hand/Sawyer training, which also covered pipe insertion, still used supplied rewards and task graphs, motion capture for in-hand manipulation and scripted pickup-arm motion.',
    citations: ['autonomous-rl-2022', 'reset-free-rl-2021'],
  },
  {
    id: 'risk-assessment',
    term: 'risk assessment',
    definition:
      'Risk assessment is the documented machinery-safety procedure for finding a machine\'s hazards and judging their risks. ISO 12100:2010 is its general-principles standard. Its public abstract covers identifying hazards and estimating and evaluating their risks across a machine\'s life-cycle phases, with guidance on documenting and verifying the conclusions. The output records each hazard found, what was done about it and why the residual risk was judged acceptable, so the safety argument can be audited.',
    citations: ['iso-12100'],
  },
  {
    id: 'speed-and-separation-monitoring',
    term: 'speed and separation monitoring',
    definition:
      'Speed and separation monitoring is the collaborative mode in which robot and person may move simultaneously while a safety system continuously keeps a protective separation distance between them. A breach triggers a safety-rated stop. Marvel and Norcross restate the distance publicly as four terms: operator travel during reaction and stopping, robot travel before braking, braking distance, and an intrusion margin plus position uncertainty. The braking term is quadratic in robot speed, so the distance grows faster than speed.',
    citations: ['marvel-norcross-2017'],
  },
  {
    id: 'power-and-force-limiting',
    term: 'power and force limiting',
    definition:
      'Power and force limiting is the collaborative mode that permits robot-person contact and makes it safe by bounding what the contact can do. Thresholds are biomechanical and per body region. The measurement tradition comes from Haddadin, Albu-Schaeffer and Hirzinger\'s impact experiments on human-robot collision. Later force-threshold studies report limits by body region and contact geometry.',
    citations: ['haddadin-2009', 'han-force-pain-2024'],
  },
  {
    id: 'functional-safety',
    term: 'functional safety',
    definition:
      'Functional safety is the part of a system’s safety that depends on its control system working correctly, as opposed to inherent design or physical guarding. For machinery, two standards frame it: IEC 61508:2010 is the generic standard for electrical, electronic and programmable electronic safety-related systems. ISO 13849-1:2023 gives a design methodology for safety-related parts of machine control systems, including software, deferring low-demand operation to the IEC 61508 series. Both treat a safety function as specified in advance, then argued to be correctly implemented.',
    citations: ['iec-61508-1-2010', 'iso-13849-1-2023'],
  },
  {
    id: 'safety-integrity-level',
    term: 'safety integrity level',
    definition:
      'A safety integrity level is the IEC 61508:2010 confidence rating for a safety function; it belongs to the function, whichever component implements it. A measured failure rate is not enough: the series also demands avoiding systematic faults, the design and specification errors redundant hardware cannot remove. A learned policy cannot be assigned one, because a level needs a verifiable specification of the function and a policy trained from demonstrations has only behaviour.',
    citations: ['iec-61508-1-2010'],
  },
  {
    id: 'performance-level',
    term: 'performance level',
    definition:
      'A performance level is the ISO 13849-1:2023 counterpart of a safety integrity level, the rating a machinery integrator in Europe most often must meet. It grades a safety-related control function on a discrete scale, and the standard gives the design methodology for justifying a claimed level. Like IEC 61508 levels, it presumes a function specification checkable against an implementation, which a learned policy lacks.',
    citations: ['iso-13849-1-2023'],
  },
  {
    id: 'safety-case',
    term: 'safety case',
    definition:
      'A safety case is a structured, documented argument, with evidence for each step, that a system is acceptably safe for a given application and environment. The tradition exists because testing alone cannot reach the confidence an autonomous system needs. UL 4600 applies the approach to autonomous products. The Goal Structuring Notation community standard supplies its usual graphical notation, decomposing goals into subgoals until each rests on cited evidence.',
    citations: ['ul-4600-2023', 'gsn-standard-v3'],
  },
  {
    id: 'conformal-prediction',
    term: 'conformal prediction',
    definition:
      'Conformal prediction is a distribution-free procedure that turns any model’s raw score into a prediction set with guaranteed coverage. Calibrate a threshold for a target such as 95 percent on held-out data, and under exchangeability the sets contain the true answer at that rate. Vovk, Gammerman and Shafer developed it; Angelopoulos and Bates\'s tutorial brought it into machine-learning practice. In robotics, set size is calibrated uncertainty, so a policy can ask for help exactly when its set is ambiguous.',
    citations: ['vovk-conformal-2022', 'angelopoulos-conformal-2021'],
  },
  {
    id: 'out-of-distribution-detection',
    term: 'out-of-distribution detection',
    definition:
      'Out-of-distribution detection is deciding at run time whether a model\'s input resembles its training data, so a policy can decline instead of extrapolating. In robotics it runs on the live observation stream and gates the policy. Sinha and colleagues use a fast anomaly detector to trigger a reactive fallback plan while slower reasoning runs. Output uncertainty is a different question: a policy can be confidently wrong on unseen inputs.',
    citations: ['sinha-anomaly-2024'],
  },
  {
    id: 'control-barrier-function',
    term: 'control barrier function',
    definition:
      'A control barrier function is a scalar function of the state that is positive on a set the system should stay inside. Its derivative condition becomes a linear input constraint in an optimisation solved each step, keeping the safe set forward invariant. Ames and colleagues survey the theory and applications. Because the constraint filters any input, a verified wrapper can enclose an arbitrary, unverified controller and owns the guarantee.',
    citations: ['ames-cbf-2019'],
  },
  {
    id: 'emergency-stop',
    term: 'emergency stop',
    definition:
      'An emergency stop is a machine function, started by a single human action, that halts hazardous motion. ISO 13850:2015 gives its functional requirements and design principles, independent of energy source, and names IEC 60204-1:2016 for the electrical realisation. It complements guarding without replacing it, since a person must notice the hazard in time. Stopping also differs from removing power, hence the electrical standard\'s stop categories.',
    citations: ['iso-13850-2015', 'iec-60204-1-2016'],
  },
  {
    id: 'takt-time',
    term: 'takt time',
    definition:
      'Takt time is available production time divided by customer demand over the same period, in time per unit. Its purpose is to match production to demand.',
    citations: ['lei-takt-time-definition'],
  },
  {
    id: 'cycle-time',
    term: 'cycle time',
    definition:
      'Cycle time is the measured time required to produce a part or complete a process.',
    citations: ['lei-cycle-time-definition'],
  },
  {
    id: 'mean-time-between-failures',
    term: 'mean time between failures',
    definition:
      'Mean time between failures (MTBF) is a reliability parameter for repairable systems. NASA uses it with mean time to repair (MTTR) when estimating inherent availability. That measure excludes administrative and logistics delays and preventive maintenance; operational availability includes those times.',
    citations: ['nasa-availability-prediction-analysis'],
  },
  {
    id: 'systems-integrator',
    term: 'systems integrator',
    definition:
      'A systems integrator is an organisation that integrates a robot with end-effectors, sensors, safeguarding and controls needed for an application. Manufacturers or employers may also act as integrators. OSHA\'s Technical Manual, discussing ANSI/RIA R15.06-2012, asks integrators to complete and document an application risk assessment before commissioning; employers remain responsible for a safe workplace. EVST\'s July 15, 2026 commercial palletising guide lists tooling, guarding, controls integration, commissioning and programming beyond the arm price.',
    citations: ['evst-cell-cost-2026', 'osha-otm-robots'],
  },
  {
    id: 'brownfield-deployment',
    term: 'brownfield deployment',
    definition:
      'Brownfield deployment is installing automation in an existing, running facility, around its floor plans, ceiling heights, power drops, traffic lanes and a production schedule that cannot simply stop. A greenfield site is designed around the automation; a brownfield site makes it fit. Retrofit guarding, lockout procedures and phased go-lives make the same technology cost more and take longer there.',
    citations: ['osha-otm-robots'],
  },
  {
    id: 'automated-storage-and-retrieval',
    term: 'automated storage and retrieval system',
    definition:
      'An automated storage and retrieval system is a warehouse subsystem of fixed racking, cranes or shuttles and control software storing and retrieving unit loads without a human walking an aisle. Symbotic\'s systems and Ocado\'s customer fulfilment centres are large-scale descendants: high-bay storage, fetching bots and pick stations arranged around the software. An AS/RS gives density and precision but becomes part of the building\'s structure, so it appears mostly in new builds.',
    citations: ['symbotic-10k-2025'],
  },
  {
    id: 'autonomous-mobile-robot',
    term: 'autonomous mobile robot',
    definition:
      'An autonomous mobile robot is a self-navigating transport vehicle that plans its own paths through a facility with onboard sensors, unlike an automated guided vehicle following fixed tape or wire. Amazon\'s Proteus and the case-handling robots in Symbotic\'s systems are AMRs at fleet scale, where fleet-manager traffic control is the hard engineering.',
    citations: ['amazon-robot-fleet-2026'],
  },
  {
    id: 'goods-to-person',
    term: 'goods-to-person',
    definition:
      'Goods-to-person is the warehouse principle of bringing stored items to a stationary picker at a pick station instead of walking the picker to the shelves. Pickers then spend nearly the whole shift handling items, raising throughput per person and setting the rate an automated picker must beat. Sequoia and Ocado\'s pick walls are goods-to-person systems.',
    citations: ['amazon-sequoia-digit-2023'],
  },
  {
    id: 'payback-period',
    term: 'payback period',
    definition:
      'Payback period is the time an automation investment takes to return its cost: total cell capital over its monthly value, most often displaced labour. Operations buyers screen it against a horizon, and vendor guidance for robot cells quotes 12 to 24 month paybacks in multi-shift operation, stretching toward 36 in single shift.',
    citations: ['evst-cell-cost-2026'],
  },
  {
    id: 'intervention-rate',
    term: 'intervention rate',
    definition:
      'Intervention rate is the fraction of cycles in which an automated system needs a human for a jam, mispick or fault, or one minus the per-cycle success rate. Its economics also depend on intervention time. A 1 percent rate cleared in seconds is cheaper per pick than a 0.1 percent rate that stops the line for an hour, so deployed systems are engineered around cheap recovery.',
    citations: ['goldberg-data-gap-2025'],
  },
  {
    id: 'predicted-horizon',
    term: 'predicted horizon',
    definition:
      'The predicted horizon is the chunk length H: the number of future actions a chunked policy emits in one forward pass, whether or not it executes them all. It is 16 for Diffusion Policy and 50 actions, one second at 50 Hz, for π0. The committed horizon is how many of them run.',
    citations: ['pi0-2024', 'diffusion-policy-2023'],
  },
  {
    id: 'committed-horizon',
    term: 'committed horizon',
    definition:
      'The committed horizon is the number of predicted actions a system executes before a fresh inference replaces them. Diffusion Policy predicts 16 steps and commits 8; π0.7 predicts 50 and commits 15 to 25; original π0, executing synchronously, committed the whole chunk. Real-Time Chunking freezes the first d actions of each new chunk to the values in flight, so the committed horizon can be shorter than the predicted one without pauses.',
    citations: ['diffusion-policy-2023', 'pi07-2026', 'real-time-chunking-2025'],
  },
];

const BY_ID = new Map(GLOSSARY.map((term) => [term.id, term]));

/** Registry lookup; undefined for unknown ids (the build gate catches those). */
export function getTerm(id: string): GlossaryTerm | undefined {
  return BY_ID.get(id);
}

/** All terms sorted by display name, for the /glossary page. */
export function glossaryTermsAlphabetical(): GlossaryTerm[] {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
}
