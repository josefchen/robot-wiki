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
      'Training a policy by supervised learning on expert demonstrations: each recorded observation is an input, the action the expert took at that moment is the label, and the fitted mapping from state to action is the policy. The recipe predates deep learning; in 1988 ALVINN trained a three-layer network to steer a van from camera images, and the same approach, scaled to modern networks and datasets, still underlies most learned manipulation policies. Its known failure mode in closed loop is covariate shift.',
    citations: ['alvinn-1988', 'dagger-2011'],
  },
  {
    id: 'dagger',
    term: 'DAgger',
    definition:
      'Dataset Aggregation, the iterative fix for behavior cloning\'s distribution mismatch: roll out the current policy, have the expert label the states the policy actually visits, add those labeled states to the training set, and retrain. Ross, Gordon, and Bagnell framed the procedure as a reduction of imitation learning to no-regret online learning, which replaces the quadratic dependence of total cost on episode length with a linear one.',
    citations: ['dagger-2011'],
  },
  {
    id: 'compounding-error',
    term: 'compounding error',
    definition:
      'The accumulation of small per-step mistakes over the course of a sequential task: each error carries the robot into a state slightly outside its training data, where the next error is more likely, so total deviation grows faster than the per-step error rate. Ross, Gordon, and Bagnell bounded the effect for imitation learning with total cost quadratic in episode length, and action chunking attacks the same effect from the other side by shrinking the number of sequential decisions in an episode.',
    citations: ['dagger-2011', 'act-aloha-2023'],
  },
  {
    id: 'cvae',
    term: 'CVAE',
    definition:
      'Conditional variational autoencoder: a generative model that learns a distribution over a latent variable instead of a single deterministic output. ACT trains its action-chunking policy as a CVAE. During training an encoder compresses the demonstrated action sequence into a latent style variable; at test time the decoder generates the chunk conditioned on camera images and joint positions with the latent clamped to the prior mean, which lets one policy cover varied demonstrations of the same task.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'vision-language-action-model',
    term: 'vision-language-action model',
    definition:
      'A robot policy built by adapting a vision-language model, pretrained on web-scale image and text data, to output robot actions. RT-2 established the approach by representing actions as text tokens and co-fine-tuning on web and robot data together, showing that semantic knowledge from web pretraining transfers into control. The same recipe underlies OpenVLA and the π series of generalist policies.',
    citations: ['rt2-2023'],
  },
  {
    id: 'cross-embodiment',
    term: 'cross-embodiment',
    definition:
      'Learning from, or transferring to, robots with different morphologies: different joint counts, action dimensions, and sensor suites. The Open X-Embodiment project pooled data from 22 robot embodiments into a single training mixture and showed that the resulting RT-X policies carry skills across platforms. The gain is not free, because each body defines its actions differently, and the field answers that mismatch with several incompatible conventions.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'action-chunking',
    term: 'action chunking',
    definition:
      'Predicting a sequence of future actions in one inference instead of a single action per timestep. Introduced with ACT on the ALOHA platform, chunking cuts the number of sequential decisions in an episode by the chunk length, which reduces compounding error and gives the policy the temporal context it needs to represent pauses, at the cost of committing to a plan between replans.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'covariate-shift',
    term: 'covariate shift',
    definition:
      'In imitation learning, the mismatch between the state distribution in the training demonstrations and the distribution the learned policy visits at deployment. The policy\'s own errors carry it into states the demonstrations never covered, where it is likelier to err again, so mistakes compound: Ross, Gordon, and Bagnell showed that a behavior-cloned policy with per-step error ε can incur total cost growing quadratically in episode length, and that no i.i.d.-trained policy can guarantee better.',
    citations: ['dagger-2011'],
  },
  {
    id: 'distribution-shift',
    term: 'distribution shift',
    definition:
      'The mismatch between the data distribution a model is trained on and the distribution it must act on at deployment. Robot demonstrations come from a small number of labs with specific robots, cameras, and lighting, while deployment spans unseen homes, objects, and clutter, so a policy can score well on held-out data from its own training distribution and still fail in a new kitchen. Open-world evaluations measure performance under exactly this gap: pi0.5 was evaluated in three real homes absent from its training set, and Lin and colleagues measured how generalization to new environments and objects scales with the diversity of the training data rather than its raw volume.',
    citations: ['pi05-2025', 'lin-data-scaling-laws-2024'],
  },
  {
    id: 'diffusion-policy',
    term: 'diffusion policy',
    definition:
      'A policy that produces actions through a conditional denoising diffusion process over a whole action sequence instead of regressing a single action directly. Introduced by Chi et al. in 2023, it represents multimodal demonstrations faithfully rather than averaging their modes, and it executes only the first few steps of each predicted sequence before observing again and replanning.',
    citations: ['diffusion-policy-2023'],
  },
  {
    id: 'domain-randomization',
    term: 'domain randomization',
    definition:
      'Training a policy across a distribution of simulators with randomized parameters, visual appearance, dynamics, or both, so the real world reads as one more sample from that distribution. Tobin et al. randomized rendering and transferred an object detector to a real arm; Peng et al. randomized dynamics and transferred a pushing policy with no real-world training. The price is conservatism: a policy that does well across a wide distribution is optimal for no single instance of it.',
    citations: ['tobin-2017', 'peng-2018'],
  },
  {
    id: 'forward-kinematics',
    term: 'forward kinematics',
    definition:
      'The map from a robot\'s joint angles to the pose of its end effector: a deterministic composition of per-joint transforms. It is cheap, smooth in the joint angles, and has exactly one answer, which makes it practical to evaluate inside every control cycle.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'inverse-kinematics',
    term: 'inverse kinematics',
    definition:
      'The reverse of the forward map: given a target pose for the end effector, find joint angles that reach it. The problem is nonlinear and can have no solution, one solution, or many, so practical solvers iterate, commonly with damped least squares, which trades a small residual error for bounded, well-conditioned steps near singularities.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'sim-to-real-gap',
    term: 'sim-to-real gap',
    definition:
      'The discrepancy between a simulator\'s physics and rendering and the real world, which makes policies trained in simulation degrade when they are deployed on hardware. The gap has several independent components, dynamics, sensing, and actuation among them, and the standard transfer methods (domain randomization, system identification, teacher-student distillation, real-to-sim reconstruction) each attack a different part of it.',
    citations: ['reality-gap-survey-2026'],
  },
  {
    id: 'temporal-ensembling',
    term: 'temporal ensembling',
    definition:
      'ACT\'s execution scheme for overlapping action chunks: the policy is queried at every timestep, and the predictions that each in-flight chunk made for the current step are averaged with exponential weights that favor the most recent prediction. This smooths the handoff between chunks at the cost of one inference per step instead of one per chunk.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'knowledge-insulation',
    term: 'knowledge insulation',
    definition:
      'Physical Intelligence\'s training recipe for keeping action learning from damaging a vision-language-action model\'s pretrained backbone. The backbone trains on discrete action tokens with its usual autoregressive loss, a separate flow-matching expert produces the continuous actions, and a stop-gradient keeps the expert\'s gradients out of the backbone. On the paper\'s bussing task, a model trained this way reaches a given performance level in 7.5 times fewer steps than π0 and follows language better, in and out of distribution.',
    citations: ['knowledge-insulation-paper-2025'],
  },
  {
    id: 'real-time-chunking',
    term: 'real-time chunking',
    definition:
      'An inference-time scheme that keeps chunked policies responsive when the model is slower than the control loop. While the robot finishes the current chunk, the policy conditions its next prediction on the actions that will already have executed by the time inference returns, holding that committed prefix fixed and generating only the remainder. Black, Galliker, and Levine introduced it for flow-matching policies, where it tracks moving targets under inference delays that break both naive chunk execution and temporal ensembling.',
    citations: ['real-time-chunking-2025'],
  },
  {
    id: 'hierarchical-policy',
    term: 'hierarchical policy',
    definition:
      'A control architecture split across levels of abstraction: a high-level policy decides what to do next in semantic terms, and low-level policies turn each decision into motor commands. SayCan made the split concrete by scoring candidate skills twice, once by a language model\'s estimate of how useful the skill is for the instruction and once by a learned affordance function\'s estimate of whether the robot can execute it in the current scene, and running the skill that scores well on both.',
    citations: ['saycan-2022'],
  },
  {
    id: 'open-x-embodiment',
    term: 'Open X-Embodiment',
    definition:
      'A 2023 collaboration across 34 labs that pooled 60 existing robot datasets into one standardized format: over a million trajectories spanning 22 robot embodiments and 527 skills. The project also trained the RT-X models on the pool, and found that a policy trained across many robots outperforms versions trained on each robot\'s data alone, with skills carrying over to embodiments the policy saw little of.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'teleoperation',
    term: 'teleoperation',
    definition:
      'Direct remote control of a robot by a human operator, used in robot learning mostly to record expert demonstrations. The ALOHA rig made the setup cheap and precise: the operator back-drives a leader arm that is a joint-for-joint twin of the follower the policy will run on, so the recorded motion is already in the robot\'s own action space. Mobile ALOHA extended the same leader-follower scheme to a mobile base for whole-body tasks.',
    citations: ['act-aloha-2023', 'mobile-aloha-2024'],
  },
  {
    id: 'success-rate',
    term: 'success rate',
    definition:
      'The standard headline metric of robot learning evaluation: the fraction of attempted episodes in which the policy completes the task. The number compresses the trial count, the time limit, and the scene distribution into one figure, and most papers measure it on 10 to 20 rollouts, where the confidence interval is wider than the differences being reported. Toyota Research Institute\'s Large Behavior Model study budgeted 1,800 real-world rollouts and concluded that underpowered evaluation, not method equivalence, explains many published comparisons.',
    citations: ['tri-lbm-2025'],
  },
  {
    id: 'ppo',
    term: 'PPO',
    definition:
      'Proximal policy optimization, the on-policy reinforcement learning algorithm the locomotion literature standardized on. Schulman and colleagues introduced it as a policy gradient method that alternates between sampling data through interaction with the environment and optimizing a surrogate objective with stochastic gradient ascent, where the surrogate is what allows several epochs of minibatch updates on each batch of samples instead of the single gradient step standard policy gradient takes. It keeps most of trust region policy optimization\'s reliability without the second-order machinery, and it pairs naturally with massively parallel simulation, where thousands of robots supply the enormous on-policy batches it consumes.',
    citations: ['ppo-2017', 'rudin-2021'],
  },
  {
    id: 'parallel-simulation',
    term: 'parallel simulation',
    definition:
      'Running thousands of physics simulator instances at once on a single GPU so a reinforcement learning agent collects experience at a rate no CPU cluster matches. Isaac Gym made the setup practical by keeping both physics and policy training on the GPU and passing data straight from physics buffers to PyTorch tensors, skipping the CPU round-trip entirely, which bought two to three orders of magnitude in throughput over a CPU simulator feeding a GPU learner. Rudin and colleagues showed what that buys: four thousand parallel ANYmal instances trained with PPO learned flat-terrain walking in under four minutes and uneven terrain in twenty, on one workstation GPU.',
    citations: ['isaac-gym-2021', 'rudin-2021'],
  },
  {
    id: 'reward-shaping',
    term: 'reward shaping',
    definition:
      'Supplying extra training rewards on top of a task\'s base reward to guide the learning agent, usually to turn a sparse success signal into a denser one that learning can climb. Ng, Harada, and Russell asked exactly which modifications to a Markov decision process\'s reward function leave the optimal policy unchanged, and proved that a transition reward expressible as the difference of a potential function across the two states is sufficient, and effectively necessary, for that invariance. The theorem explains the classic shaping bugs, where the agent learns to harvest the bonus instead of doing the task: those bugs come from non-potential-based rewards, the kind the theorem rules out.',
    citations: ['ng-reward-shaping-1999'],
  },
  {
    id: 'whole-body-control',
    term: 'whole-body control',
    definition:
      'Treating all of a robot\'s actuated degrees of freedom, legs, torso, arms, and hands, as one coupled control problem instead of stacking an arm controller on top of a separate locomotion controller. The model-based version optimizes against the full rigid-body dynamics at once: Zhang and colleagues ran whole-body model-predictive control in real time on hardware with plain iLQR and MuJoCo dynamics, across dynamic quadruped locomotion and full-sized humanoid walking. The learned version reframes the same problem as tracking a retargeted human motion, the route H2O took for real-time whole-body teleoperation, with reinforcement learning supplying the balance and contact feasibility that raw retargeting loses.',
    citations: ['mujoco-ilqr-2026', 'h2o-2024'],
  },
  {
    id: 'legged-locomotion',
    term: 'legged locomotion',
    definition:
      'Locomotion through legs rather than wheels or tracks: support comes from discrete, intermittent footholds, so balance is re-established at every step instead of resting on a continuous contact patch. It is the problem that made sim-to-real reinforcement learning a shipping technology instead of a demo. Conventional controllers built it from elaborate state machines that explicitly trigger motion primitives and reflexes, a design that grew more complex without approaching the generality of animal locomotion. The ETH Zurich line replaced that stack outright: Lee and colleagues trained an ANYmal controller by reinforcement learning in simulation and generalized it zero-shot to alpine terrain on proprioception alone, and Miki and colleagues extended the same recipe to perceptive locomotion in the wild, the template humanoid programs have since been rerunning on two legs.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'mpc',
    term: 'model predictive control',
    definition:
      'Control by constant re-planning: at each control step, optimize a short sequence of future actions against an explicit dynamics model, execute only the first action, and solve again from the freshly measured state. Because the plan is recomputed online, model error is rejected by feedback at every step instead of being frozen into a policy\'s weights, so a model-predictive controller shows less of the frozen-policy sim-to-real failure mode, though a wrong dynamics model still costs it closed-loop performance. Long assumed too slow for a robot\'s full dynamics, the method reached whole-body scale in 2026, when Zhang and colleagues solved iLQR against MuJoCo\'s physics fast enough to close the loop in real time on real hardware.',
    citations: ['mujoco-ilqr-2026'],
  },
  {
    id: 'flow-matching',
    term: 'flow matching',
    definition:
      'A generative modeling recipe that learns a time-dependent vector field carrying samples from a noise distribution to the data distribution, trained by regressing the model\'s field against the conditional flow rather than by estimating a score. pi0 brought it to robot control: a dedicated action expert is trained with the flow-matching objective to denoise continuous action chunks, and at inference the learned field is integrated as an ODE for a handful of steps, which keeps the policy fast enough for high-frequency control while keeping the multimodality that made diffusion policies attractive.',
    citations: ['pi0-2024'],
  },
  {
    id: 'world-model',
    term: 'world model',
    definition:
      'A model of how an environment evolves that an agent can query to make decisions: given the current observation or state and a candidate action, it predicts what happens next, so a policy can be trained, evaluated, or planned against the model instead of the real world. The 2026 robotics survey draws the functional line: producing plausible future images is not enough, because a system qualifies only if its predictions change under the agent\'s action in a way that is useful for decision-making. The single name covers at least six architecturally distinct paradigms, from compact latent dynamics models to action-conditioned video generators.',
    citations: ['world-model-survey-2026'],
  },
  {
    id: 'end-effector',
    term: 'end effector',
    definition:
      'The last link of a robot arm and whatever is attached to it: the gripper, hand, or tool whose pose the arm exists to place. Kinematics is conventionally written as the map from joint angles to the end-effector pose, and most action spaces in learned manipulation are defined as end-effector deltas rather than joint targets, because a task is specified in the space where the hand meets the world.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'jacobian',
    term: 'Jacobian',
    definition:
      'The derivative of the forward-kinematics map: the matrix relating joint velocities to end-effector velocity at the current configuration, with one column per joint. It changes with configuration and can lose rank at singularities, where covering some task-space direction would demand unbounded joint speeds. The same matrix maps a wrench at the end effector back to the joint torques that balance it through its transpose, which makes it the working object of both velocity-level control and statics.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'proprioception',
    term: 'proprioception',
    definition:
      'Sensing of the body\'s own state: joint positions and velocities, orientation, and contact, as opposed to exteroception, which senses the outside world through cameras or lidar. Proprioception is fast, cheap, and never occluded, and the ETH Zurich line showed how far it goes: Lee and colleagues trained an ANYmal controller that hiked mud, snow, rubble, and vegetation on proprioception alone, and Miki and colleagues kept it as the trusted channel the policy falls back on when its terrain map disagrees with its body.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'system-identification',
    term: 'system identification',
    definition:
      'Measuring a real robot\'s dynamics and correcting the simulator\'s parameters to match, so the sim-to-real gap shrinks by calibration rather than by randomization. Hwangbo and colleagues replaced a miscalibrated analytic actuator model with a learned network mapping joint-command history to realized torque after identifying actuator error as the dominant transfer obstacle on ANYmal. The method attacks the dynamics component of the gap directly, where domain randomization only averages over it.',
    citations: ['hwangbo-2019', 'reality-gap-survey-2026'],
  },
  {
    id: 'retargeting',
    term: 'retargeting',
    definition:
      'Mapping motion recorded on one body, usually a human\'s, onto a robot with different proportions and joint limits, so human demonstrations become references the robot can track. Raw retargeting ignores the robot\'s physical constraints and can produce references that are morphologically infeasible, which is why systems such as H2O and ASAP pair retargeted human motion with reinforcement learning that restores balance and contact feasibility on the real body.',
    citations: ['h2o-2024', 'asap-2025'],
  },
  {
    id: 'imitation-learning',
    term: 'imitation learning',
    definition:
      'Learning a policy from expert demonstrations rather than from a reward signal: the expert\'s recorded state-action pairs become a supervised training set, and the fitted mapping from observed state to action is the policy. Pomerleau\'s ALVINN steered a van this way in 1988, and the recipe still underlies most learned manipulation. Its structural weakness is that the training distribution comes from the expert while deployment visits the states the learner itself induces, the mismatch DAgger was designed to repair.',
    citations: ['dagger-2011', 'alvinn-1988'],
  },
  {
    id: 'scaling-law',
    term: 'scaling law',
    definition:
      'An empirical regularity between a system\'s performance and the resources it consumes, parameters, data, or compute, first made precise for language models and now measured for robot learning. Lin and colleagues fit imitation-learning success to the training data and found that generalization to new objects and environments tracks data diversity rather than raw hours. EgoScale extended the measurement to egocentric human video, reporting a log-linear relationship between hours of human data and dexterous-manipulation success across four orders of magnitude.',
    citations: ['lin-data-scaling-laws-2024', 'egoscale-2026'],
  },
  {
    id: 'vision-language-model',
    term: 'vision-language model',
    definition:
      'A model pretrained jointly on web-scale image and text data, so visual recognition and language semantics live in one set of weights. RT-2\'s bet was that this pretraining is an asset for robot control: co-fine-tuning a vision-language model on robot trajectories and its original web data together transfers semantic knowledge, recognizing objects and following instructions the robot data never covered, into the policy. The vision-language-action models that followed all start from such a backbone.',
    citations: ['rt2-2023'],
  },
  {
    id: 'affordance',
    term: 'affordance',
    definition:
      'In robot learning, a learned estimate of whether a skill can succeed in the current situation, scored from the robot\'s own observations. SayCan grounded language-model planning in affordances by scoring every candidate skill twice, once by the language model\'s estimate of how useful the skill is for the instruction and once by the affordance function\'s estimate of whether the robot can execute it here and now, and running the skill that scores well on both.',
    citations: ['saycan-2022'],
  },
  {
    id: 'curriculum-learning',
    term: 'curriculum learning',
    definition:
      'Training on a scheduled sequence of tasks that grow harder as the agent improves, instead of sampling the full difficulty range from the start. Rudin and colleagues promoted ANYmal policies to rougher simulated terrain when they succeeded and demoted them when they failed, and the game-inspired schedule is part of what let one workstation GPU train flat-ground walking in under four minutes and uneven-terrain walking in twenty.',
    citations: ['rudin-2021'],
  },
  {
    id: 'teacher-student-distillation',
    term: 'teacher-student distillation',
    definition:
      'Training two policies in sequence to work around partial observability: a teacher trains with privileged simulator state, such as exact terrain friction or object pose, and a student then learns to imitate the teacher using only the observations available at deployment. RMA used the split for rapid adaptation to changing payloads and surfaces, and Lee and colleagues distilled a privileged ANYmal teacher into a proprioceptive student that hikes challenging terrain without ever seeing it.',
    citations: ['rma-2021', 'lee-2020'],
  },
  {
    id: 'action-tokenization',
    term: 'action tokenization',
    definition:
      'Expressing continuous robot actions as discrete tokens so a language model\'s machinery can produce them. RT-2 discretized each action dimension into 256 uniform bins and mapped the bin indices onto rarely used tokens of the model\'s existing vocabulary, which let the policy train with ordinary next-token prediction. The representation is simple and inherits the backbone\'s web knowledge, but 256 bins are coarse and autoregressive decoding is slow, the two weaknesses later work attacked with continuous experts and parallel decoding.',
    citations: ['rt2-2023'],
  },
  {
    id: 'latent-dynamics',
    term: 'latent dynamics',
    definition:
      'A world-model paradigm that predicts in a compact learned latent space instead of in pixels: the model carries a recurrent latent state, forecasts how that state and the reward evolve under candidate actions, and the agent learns or plans entirely inside the imagined rollouts. Dreamer established the recipe of training an actor-critic purely on imagined trajectories, and TD-MPC2 showed the image decoder can be dropped altogether, scoring candidate action sequences under the latent model with a learned terminal value instead of reconstructing pixels.',
    citations: ['dreamer-2019', 'tdmpc2-2023'],
  },
  {
    id: 'degrees-of-freedom',
    term: 'degrees of freedom',
    definition:
      'The number of independent coordinates needed to specify a mechanism\'s configuration. An arm\'s degree-of-freedom count is its number of independent joints, so a 7-DoF arm places its end effector with one coordinate to spare beyond the six a rigid pose needs, and that redundancy is what lets the elbow reconfigure while the hand stays put. More degrees of freedom buy dexterity and obstacle avoidance at the price of a larger control problem.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'denavit-hartenberg-parameters',
    term: 'Denavit-Hartenberg parameters',
    definition:
      'The standard four-parameter bookkeeping for a robot arm\'s geometry, introduced by Denavit and Hartenberg in 1955: each joint is described by a link length, a link twist, a link offset, and a joint angle, and chaining the per-joint transforms yields the full forward kinematics. Four numbers per joint instead of the six a free transform needs is the convention\'s appeal, compact enough to print on a datasheet. Its known cost is a discontinuity when neighboring joint axes drift toward parallel, which later formulations such as the product of exponentials avoid.',
    citations: ['denavit-hartenberg-1955', 'modern-robotics-2017'],
  },
  {
    id: 'configuration-space',
    term: 'configuration space',
    definition:
      'The space of all configurations of a robot: one point per complete joint assignment, so a 7-DoF arm moves through a 7-dimensional space whose coordinates are its joint angles. Lozano-Pérez introduced the planning formulation in 1983: shrink the robot to a point and grow every obstacle by the robot\'s shape, so collision-free motion becomes a path through the free region of that space. Motion planners, sampling-based or optimization-based, all search this space rather than the physical workspace directly.',
    citations: ['lozano-perez-1983', 'lavalle-2006'],
  },
  {
    id: 'trajectory-optimization',
    term: 'trajectory optimization',
    definition:
      'Motion planning as numerical optimization over a whole trajectory at once: the trajectory is the decision variable, a cost functional scores smoothness and obstacle clearance, and a solver descends that cost from an initial guess. CHOMP descends a smoothness-plus-obstacle objective with covariant functional gradients; TrajOpt instead convexifies the collision constraints and solves a sequence of convex programs. The family produces smooth, locally optimal motions in high dimensions but can stall in local minima, so it often refines paths that a sampling-based planner found first.',
    citations: ['ratliff-2009', 'schulman-2013'],
  },
  {
    id: 'kalman-filter',
    term: 'Kalman filter',
    definition:
      'The recursive state estimator for linear systems with Gaussian noise: a predict step propagates the state estimate and its covariance through the motion model, and an update step fuses each new measurement with a gain that weighs the model\'s uncertainty against the sensor\'s. Kalman published the recursion in 1960, and it is the minimum-variance estimator for the linear-Gaussian case. When the dynamics or the measurement model is nonlinear, the extended Kalman filter linearizes both about the current estimate instead.',
    citations: ['kalman-1960-filter', 'thrun-2005'],
  },
  {
    id: 'factor-graph',
    term: 'factor graph',
    definition:
      'A bipartite graph that displays the factorization of a probability distribution: variable nodes hold the unknown states, and factor nodes hold the measurements and motion constraints that tie groups of variables together. Kschischang, Frey, and Loeliger unified the inference algorithms on these graphs under the sum-product algorithm in 2001. In robotics, a factor graph over the whole trajectory turns smoothing and SLAM into one sparse least-squares problem, the formulation behind Square Root SAM and its incremental successors.',
    citations: ['kschischang-2001', 'dellaert-kaess-2006'],
  },
  {
    id: 'slam',
    term: 'SLAM',
    definition:
      'Simultaneous localization and mapping: the concurrent construction of a model of the environment and the estimation of the state of the robot moving within it. The two halves cannot be solved separately, since localizing against an unknown map and mapping from an unknown pose are coupled. The modern formulation is a factor graph over the trajectory and the landmarks; the Cadena et al. survey charts the field\'s move from filtering to smoothing.',
    citations: ['cadena-2016', 'dellaert-kaess-2006'],
  },
  {
    id: 'friction-cone',
    term: 'friction cone',
    definition:
      'The set of forces a frictional point contact can exert without slipping: all force vectors within an angle arctan(mu) of the surface normal, where mu is the Coulomb friction coefficient. A contact resists arbitrary tangential load only up to mu times its normal load, so the cone widens as friction grows and collapses to the normal ray when friction vanishes. In the plane the cone is a wedge bounded by two edge rays, which is what makes planar grasp analysis a convex-geometry problem.',
    citations: ['murray-li-sastry-1994', 'prattichizzo-trinkle-2016'],
  },
  {
    id: 'force-closure',
    term: 'force closure',
    definition:
      'The property that a grasp can resist any externally applied wrench with feasible contact forces: every disturbance force and moment can be balanced by contacts pushing inside their friction cones. Equivalently, the convex hull of the primitive contact wrenches contains the origin of wrench space strictly in its interior. Nguyen showed that two frictional contacts achieve it exactly when the line through the contact points lies strictly inside both friction cones, the antipodal condition.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'form-closure',
    term: 'form closure',
    definition:
      'Force closure achieved by geometry alone, with frictionless contacts: the contact normals themselves positively span the wrench space, so the object is immobilized no matter how small the friction. Bicchi showed form closure is exactly frictionless force closure. It is demanding in contact count, needing at least four contacts in the plane and seven in space, which is why practical grasps lean on friction instead.',
    citations: ['bicchi-1995', 'mishra-1987'],
  },
  {
    id: 'grasp-wrench-space',
    term: 'grasp wrench space',
    definition:
      'The set of net wrenches a grasp can apply to the object, built by mapping every admissible combination of contact forces through the grasp map. Because friction cones are convex, the wrench space is the convex hull of the primitive cone-edge wrenches, a polytope in force-moment space. Closure properties read off it geometrically: force closure is the origin lying strictly inside, and the Ferrari-Canny quality metric is the radius of the largest origin-centered ball that fits.',
    citations: ['ferrari-canny-1992', 'bicchi-kumar-2000'],
  },
  {
    id: 'antipodal-grasp',
    term: 'antipodal grasp',
    definition:
      'A two-contact grasp in which the line through the contact points lies strictly inside both friction cones. Nguyen proved this geometric test is exactly force closure for a frictional pair in the plane: the contacts can squeeze along the line they share and generate torques of both signs. It is the workhorse of parallel-jaw grippers, and its strictness matters, because a line resting exactly on a cone edge resists everything except the one wrench that slides the object out.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'mechanoreceptor',
    term: 'mechanoreceptor',
    definition:
      'A sensory nerve ending that fires under mechanical stimuli such as pressure, vibration, or skin stretch. The glabrous skin of the human hand carries about 17,000 low-threshold mechanoreceptors, roughly 1,000 of them packed at each fingertip, in four varieties that trade spatial localization against temporal response. Robot tactile sensors are closing on raw force threshold but remain far sparser: the best documented arrays put seven sensing cells on a fingerpad where the human finger packs about a thousand receptors.',
    citations: ['macefield-touch-2022', 'brooks-dexterity-2025'],
  },
  {
    id: 'tactile-sensing',
    term: 'tactile sensing',
    definition:
      'Sensing contact through the robot\'s skin: pressure arrays, barometric cells, and optical fingertip cameras that measure where contact happens, how hard it presses, and whether the object is starting to slip. It is the modality manipulation runs on after the fingers close, when the camera can no longer see the contact. Sanctuary\'s micro-barometer arrays resolve about five millinewtons per cell against roughly three for a human fingertip, but coverage, durability, and integration into training pipelines remain the open problems.',
    citations: ['tactile-outlook-2025', 'robozaps-phoenix-2026'],
  },
  {
    id: 'in-hand-manipulation',
    term: 'in-hand manipulation',
    definition:
      'Repositioning or reorienting a grasped object within the hand without setting it down: rolling a pen between the fingers, or walking a key around until it faces the lock. It is the skill that separates a hand from a gripper, and the one vision handles worst, because the fingers occlude exactly the contact that matters. Sanctuary demonstrated zero-shot in-hand reorientation with its 21-DoF hydraulic hands in 2024, and Holson\'s Robot Olympics makes it the gold-medal bar for tool use with the key-in-lock task.',
    citations: ['sanctuary-inhand-2024', 'holson-olympics-2025'],
  },
  {
    id: 'contact-rich-manipulation',
    term: 'contact-rich manipulation',
    definition:
      'Manipulation governed by making, holding, and breaking contact rather than by free-space motion: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since stick flips to slip across a friction boundary, so small sensing errors produce large outcome errors. That discontinuity is why these tasks are the stress test for touch-driven policies, and why TouchWorld\'s six-task tactile benchmark is built entirely from them.',
    citations: ['touchworld-2026', 'tactile-outlook-2025'],
  },
  {
    id: 'long-tail',
    term: 'long tail',
    definition:
      "The part of the scenario distribution that is individually rare and collectively decisive: a couch fallen off a truck, a pedestrian in dark clothing outside a crosswalk, a traffic cop waving cars through a red light. None of these appear often enough in any natural driving log to learn from directly, yet each can decide whether a system is deployable. Autonomous-driving teams attack the tail with simulation, and Waymo's Genie-3-based World Model exists for exactly this: events 'from a tornado to a casual encounter with an elephant' are 'almost impossible to capture at scale in reality'.",
    citations: ['waymo-world-model-2026', 'koopman-safe-enough-2026'],
  },
  {
    id: 'operational-design-domain',
    term: 'operational design domain (ODD)',
    definition:
      'The specific operating conditions an automated driving system is designed for: geography, road types, speed range, weather, and time of day. SAE J3016 makes the ODD part of the level definitions, which is why a Level 4 robotaxi that works in Phoenix and fails in a blizzard is not a contradiction but an ODD boundary. Crash-rate comparisons against human benchmarks align the human baseline to the same vehicle types, road types, and locations as the system\'s ODD, precisely so the comparison is not rigged.',
    citations: ['sae-j3016-2021', 'waymo-crash-rates-2025'],
  },
  {
    id: 'end-to-end-driving',
    term: 'end-to-end driving',
    definition:
      'A driving policy that maps raw sensor input directly to a motion plan or vehicle commands, instead of composing separate perception, prediction, and planning modules. The motivation is joint optimization: modular pipelines accumulate errors across hand-engineered interfaces, while a single network can tune every parameter for the driving objective. UniAD moved the industry compromise by keeping the task structure but training all stages in one differentiable network; EMMA went further by building on Gemini and representing trajectories and 3D locations as text.',
    citations: ['uniad-2023', 'emma-2024', 'e2e-ad-survey-2024'],
  },
  {
    id: 'visual-inertial-odometry',
    term: 'visual-inertial odometry (VIO)',
    definition:
      "State estimation for a flying robot from camera images fused with inertial measurement unit data: the camera fixes long-term drift, the IMU provides high-rate accelerations between frames, and a filter or optimization over both yields the metric pose and velocity a flight controller needs. It is the standard onboard localization for small drones because it needs no external infrastructure and no GPS, and it is what lets a racing drone estimate its state from its own sensors alone. Swift's perception module pairs a visual-inertial estimator with a convolutional gate detector, fusing both in a Kalman filter to supply the control policy.",
    citations: ['swift-drone-racing-2023'],
  },
  {
    id: 'swarm-robotics',
    term: 'swarm robotics',
    definition:
      'Coordination of many relatively simple robots through local interaction rather than a central planner, aiming for collective behavior that no individual achieves: coverage, mapping, or search at fleet scale. The classical models treat the group as a dynamical system of pairwise attractions and repulsions (potential fields, in the lineage of Reynolds flocking), which explains collective motion but guarantees neither safety nor speed in clutter. The aerial-swarm literature moved to onboard trajectory optimization: each drone plans in milliseconds from its own sensors while treating neighbors as constraints, so a ten-drone swarm traverses a bamboo forest with no external localization and no global map.',
    citations: ['micro-drone-swarm-2022', 'soria-nmpc-swarm-2021'],
  },
  {
    id: 'minimally-invasive-surgery',
    term: 'minimally invasive surgery',
    definition:
      "Surgery performed through small incisions with elongated instruments and a camera, instead of a large open incision. In the abdominal variant, laparoscopy, the workspace is insufflated with gas and the surgeon watches a 2D or 3D video feed while working through trocar ports, which trades patient recovery time for a loss of direct touch, natural hand-eye alignment, and fine dexterity. Surgical robots exist to give that trade-off back: wristed instruments restore dexterity at depth, the console restores a stable magnified stereo view, and motion scaling and tremor filtering restore precision. da Vinci systems are cleared for use in these procedures and have been used in millions of them.",
    citations: ['davinci5-clearance-2024', 'intuitive-q4-2025'],
  },
  {
    id: 'robotic-assisted-surgical-device',
    term: 'robotic assisted surgical device',
    definition:
      "The US regulatory category for surgical robots. A RASD is cleared or authorized on the basis that it assists a surgeon rather than practicing medicine itself: the Versius authorization, the first for a multiport soft-tissue general surgical system through the FDA's De Novo pathway, is explicitly worded as assisting in the precise and accurate control of endoscopic instruments, and it names one procedure, adult cholecystectomy, as the indicated use. The indication is the unit of progress: a system earns autonomy or new procedures one cleared indication at a time, which is why the field's shipped autonomy sits far below its research demonstrations.",
    citations: ['cmr-versius-authorization-2024', 'yang-autonomy-2017'],
  },
  {
    id: 'force-feedback',
    term: 'force feedback',
    definition:
      'Sensing of interaction forces at the instrument tip, rendered back to the operator as resistance at the controls. In teleoperation it closes the haptic loop that pure video control leaves open: without it a surgeon infers tissue contact through visual cues alone and can exert more force than intended. da Vinci 5 introduced Force Feedback instruments that measure and display subtle forces on tissue, the first offering of that capability on a surgical system in any modality, and Intuitive reported up to 43 percent less force exerted on tissue in preclinical trials with it. The capability also matters beyond the operator: a measured force signal is a data stream, and data streams are what later automation trains on.',
    citations: ['davinci5-clearance-2024'],
  },
  {
    id: 'in-situ-resource-utilization',
    term: 'in-situ resource utilization (ISRU)',
    definition:
      "Producing mission consumables at the destination from local materials instead of launching them from Earth: oxygen from the Martian atmosphere, water or metals from lunar regolith, propellant from both. NASA frames it as astronauts living off the land, because every kilogram made on site is a kilogram that does not ride a launch vehicle, and for a Mars return the arithmetic is stark, since the propellant for the trip home would dominate an all-Earth-supplied mass budget. The first demonstration on another planet was MOXIE, which electrolyzed atmospheric carbon dioxide into oxygen on the Perseverance rover. The robotics side of ISRU is excavation, drilling, and material handling in vacuum and regolith, the same contact-rich manipulation problems as terrestrial robotics under harsher constraints.",
    citations: ['moxie-completion-2023', 'prime-1-lunar-2025'],
  },
  {
    id: 'on-orbit-servicing',
    term: 'on-orbit servicing',
    definition:
      'Using one spacecraft to work on another after launch: docking with an aging satellite to take over its propulsion, refueling it, replacing failed components, assembling large structures, or removing debris. The robotic content is rendezvous and proximity operations flown to centimeter-per-second tolerances, plus capture and manipulation of hardware that was usually never designed to be serviced. The capability has been demonstrated in stages since Japan\u2019s ETS-VII and DARPA\u2019s Orbital Express, and became a commercial service when Northrop Grumman\u2019s MEV-1 docked with Intelsat 901 in 2020 to extend its life; debris inspection and removal is the unserved variant, where the client is uncooperative and tumbling.',
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
      'Hogan\'s 1985 formulation of compliant contact control: instead of commanding a position or a force, the controller programs the relationship between them, making the manipulator behave at the contact like a mass-spring-damper whose stiffness and damping the programmer chooses. The position error drives a force through the desired mechanical impedance, so the arm yields when it meets the environment and pushes back only as much as the programmed spring says. The port-based argument underneath is a duality: at a contact you may command motion or force, the two conjugate variables of the interaction port, but not both independently, and impedance control takes the motion as input and force as output.',
    citations: ['hogan-1985'],
  },
  {
    id: 'admittance-control',
    term: 'admittance control',
    definition:
      'The dual of impedance control: force is measured and motion is commanded. A wrist force-torque sensor reads the contact force, the admittance law converts it into a position or velocity correction, and the underlying motion controller executes it. It is the natural choice on a stiff, geared, non-backdrivable arm, where the position loop is excellent but no torque command channel exists: admittance control synthesizes compliance in software on top of a position-controlled machine, at the cost of the measurement and the loop delay. Ott, Mukherjee and Nakamura\'s unified formulation shows the two schemes as the two causal assignments of the same interaction port.',
    citations: ['ott-2010'],
  },
  {
    id: 'hybrid-force-position-control',
    term: 'hybrid force/position control',
    definition:
      'Raibert and Craig\'s decomposition of a contact task into orthogonal subspaces: in a task frame chosen from the geometry of the contact, force is controlled along the axes constrained by the environment and position is controlled along the free axes, never both on the same axis. Polishing a surface controls force normal to it and tracks a path tangent to it; sliding a block in a slot controls force pressing into the slot walls and position along the slot. Mason\'s predecessor analysis established how to pick the constrained and free directions from contact geometry, which is what makes the decomposition a property of the task rather than a tuning choice.',
    citations: ['raibert-craig-1981', 'mason-1981'],
  },
  {
    id: 'series-elastic-actuator',
    term: 'series elastic actuator',
    definition:
      'An actuator with a deliberately soft spring placed between the gear train and the load, proposed by Pratt and Williamson in 1995. The spring is a sensor as much as a compliance: its deflection measures the transmitted force cheaply and robustly, the force loop closes on the spring rather than on a fragile wrist sensor, and the spring mechanically low-passes impact forces so a collision loads the drivetrain far below what a rigid joint would see. The cost is bandwidth and position accuracy, which is why the design dominates in legged robots and collaborative arms, where force fidelity and impact tolerance matter more than stiffness.',
    citations: ['pratt-williamson-1995'],
  },
  {
    id: 'backdrivability',
    term: 'backdrivability',
    definition:
      'The ease with which an external force can move a joint with the actuators passive: a direct-drive or quasi-direct-drive arm is backdrivable, because pushing on the link turns the motor with little resistance, while a high-ratio geared arm is not, because the gears and the controller\'s position loop hold the joint rigid against the push. It decides which compliance scheme fits the hardware: impedance control assumes the arm can be commanded as a force source, which suits a low-inertia backdrivable design, while a non-backdrivable geared arm needs admittance control built on a force sensor, or a series elastic element to restore a mechanical force channel.',
    citations: ['hogan-1985', 'pratt-williamson-1995'],
  },
  {
    id: 'camera-intrinsics',
    term: 'camera intrinsics',
    definition:
      'The parameters that describe the camera itself rather than where it sits: focal length in pixels along each axis, the principal point where the optical axis meets the sensor, and the lens distortion coefficients. Zhang\'s method recovers them from a handful of views of a planar target held at arbitrary unknown orientations, which is why calibration on a robot is a printed checkerboard rather than a metrology rig. Without them a pixel is only a direction in an unknown parameterisation, so no image measurement converts into a metric ray.',
    citations: ['zhang-2000-calibration'],
  },
  {
    id: 'hand-eye-calibration',
    term: 'hand-eye calibration',
    definition:
      'Estimating the rigid transform between a camera and the robot frame it must report into: for a wrist-mounted camera, the transform from the gripper to the camera, and for a fixed camera, the transform from the robot base to the camera. Tsai and Lenz posed it as solving AX = XB from a set of robot motions paired with the camera\'s observed motion of a static target, and their formulation is still what most implementations run. The residual matters asymmetrically: a translation error is a constant offset, while a rotation error is an angle, so its cost in millimetres grows with how far away the target is.',
    citations: ['tsai-lenz-1989'],
  },
  {
    id: 'point-cloud',
    term: 'point cloud',
    definition:
      'A set of 3D points, usually with no ordering and no connectivity, which is what a depth camera or a lidar produces once its measurements are back-projected through the camera intrinsics. The awkwardness for learning is that the set is unordered, so a network reading it must be invariant to permutation of its own input. PointNet answered that with a shared per-point encoder followed by a symmetric pooling function, and PointNet++ added a hierarchy of local neighbourhoods so the representation captures fine geometry as well as global shape.',
    citations: ['pointnet-2017', 'pointnet-plus-plus-2017'],
  },
  {
    id: 'semantic-segmentation',
    term: 'semantic segmentation',
    definition:
      'Labelling every pixel of an image with a class, as opposed to drawing a box around each object. For manipulation the per-pixel form is what matters, because a grasp is planned on a region of a surface rather than on a rectangle: a box around a mug also contains the table behind it, and a mask does not.',
    citations: ['segment-anything-2023'],
  },
  {
    id: 'promptable-segmentation',
    term: 'promptable segmentation',
    definition:
      'Segmentation posed so the mask is produced in response to a prompt, a point, a box or a rough mask, rather than to a fixed label set decided at training time. The Segment Anything model was designed and trained for the task explicitly, on a dataset of over a billion masks, so it transfers to new image distributions without retraining, and SAM 2 extends the same interface across video frames with a streaming memory. That is what makes it usable as a grounding layer under a policy: the prompt can come from a detector, a language model, or a keypoint the robot already cares about.',
    citations: ['segment-anything-2023', 'sam2-2024'],
  },
  {
    id: 'pose-estimation',
    term: 'pose estimation',
    definition:
      'Recovering an object\'s full rigid position and orientation, six degrees of freedom, from sensor data, rather than only where it is in the image. Methods divide by what they assume: instance-level ones such as PoseCNN are trained per object and need that exact object\'s model, while model-free methods such as FoundationPose take a CAD model or a few reference images at test time and handle objects they never saw in training. It is the step that turns a detection into something a grasp planner can use, because force closure is computed against a known object pose.',
    citations: ['posecnn-2018', 'foundationpose-2024'],
  },
  {
    id: 'add-s-metric',
    term: 'symmetry-aware pose error (ADD-S)',
    definition:
      'The standard accuracy measure for 6-DoF pose, in the variant that tolerates object symmetry. The base metric, ADD, averages the distance between corresponding model points under the estimated pose and the true pose, and a pose is counted correct when that average falls below a fraction of the object\'s diameter. The symmetry-aware variant matches each transformed point to its nearest neighbour rather than to its counterpart, so a rotationally symmetric object such as a bowl is not penalised for a rotation that is physically indistinguishable. The metric originates in the LINEMOD work of Hinterstoisser and colleagues; the BOP challenge is where methods are now compared on it and its successors.',
    citations: ['hinterstoisser-2012', 'bop-challenge-2023'],
  },
  {
    id: 'visual-servoing',
    term: 'visual servoing',
    definition:
      'Closing the control loop directly on image features rather than on an estimated object pose: define an error in the image, between where features are and where they should be, and drive the robot down that error using the interaction matrix relating feature velocity to camera velocity. Espiau, Chaumette and Rives gave the task-function formulation the field still uses. The appeal for manipulation is that it skips pose estimation entirely, so a calibration error that would bias a pose estimate instead only bends the path the robot takes to a still-correct final configuration.',
    citations: ['espiau-1992', 'chaumette-hutchinson-2006'],
  },
  {
    id: 'occupancy-grid',
    term: 'occupancy grid',
    definition:
      'A map that divides space into cells and stores, per cell, the probability that it is occupied. Moravec and Elfes introduced it for wide-angle sonar: each range reading constrains both the volume the beam passed through and the volume where something reflected it, and many readings accumulate into a map of empty and occupied regions. Its defining property for a planner is the third state. A cell that no sensor has yet observed is held as unknown rather than assumed free, which is exactly the distinction a representation optimised for rendering cannot make.',
    citations: ['moravec-elfes-1985', 'nav2-2020'],
  },
  {
    id: 'signed-distance-field',
    term: 'signed-distance field',
    definition:
      'A volumetric map that stores, per voxel, the distance to the nearest surface, signed so the value is negative behind the surface and positive in front of it. Curless and Levoy introduced the cumulative weighted form for fusing range images, where the surface is recovered as the zero crossing. Two properties earn it its place in a robot stack: the gradient of the field is the surface normal, and the distance value is itself the collision margin, which is why a truncated variant is what collision checkers and GPU trajectory optimisers consume. KinectFusion is where the representation became a real-time product of a commodity depth camera.',
    citations: ['curless-levoy-1996', 'kinectfusion-2011'],
  },
  {
    id: 'neural-radiance-field',
    term: 'neural radiance field',
    definition:
      'A scene stored as a continuous function, realised as a small neural network, from a 3D position and a viewing direction to a volume density and a view-dependent colour. Mildenhall and colleagues introduced it: images are synthesised by classical volume rendering along camera rays, and because that rendering is differentiable the whole representation can be optimised from posed photographs alone. The objective is view synthesis, so the geometry it recovers is whatever explains the images rather than whatever a contact solver would want.',
    citations: ['nerf-2020', 'instant-ngp-2022'],
  },
  {
    id: 'gaussian-splatting',
    term: '3D Gaussian splatting',
    definition:
      'A scene stored as a cloud of anisotropic 3D Gaussians, each carrying a position, a covariance, an opacity and a view-dependent colour, rendered by projecting them to the image plane and rasterising rather than by marching rays. Kerbl and colleagues showed the representation reaches radiance-field quality at real-time frame rates, which is what took the family out of offline rendering. The representation has no surface: opacity is a rendering weight, so contact geometry exists only after a separate surface extraction step.',
    citations: ['3dgs-2023'],
  },
  {
    id: 'loop-closure',
    term: 'loop closure',
    definition:
      'Recognising that the robot has returned to a place it has mapped before, and adding the resulting constraint to the map so accumulated drift is corrected globally rather than allowed to grow. It is the property that separates SLAM from odometry: odometry integrates motion and its error grows without bound, while a closed loop redistributes that error across the whole trajectory. Cadena and colleagues place it in the back end of the standard SLAM decomposition, and it is the reason smoothing formulations displaced filtering, since relinearising the past is only possible if the past is still in the graph.',
    citations: ['cadena-2016', 'orb-slam-2015'],
  },
  {
    id: 'place-recognition',
    term: 'place recognition',
    definition:
      'Deciding, from the current sensor data alone, whether the robot is somewhere it has been before, without relying on its estimated position. Lowry and colleagues survey the problem and its difficulty: the same place changes appearance with viewpoint, illumination, weather and season, while different places can look alike. It is the front-end machinery a loop closure depends on, and a false match is more damaging than a missed one, because a wrong constraint corrupts the map that the constraint was meant to correct.',
    citations: ['lowry-2016-place-recognition', 'cadena-2016'],
  },
  {
    id: 'costmap',
    term: 'costmap',
    definition:
      'The grid a mobile-robot navigation stack plans over: occupancy from the map and the live sensors, inflated by the robot\'s footprint and marked up with whatever else should influence the route, so a planner searching for a cheap path is also searching for a safe one. Lu, Hershberger and Smart introduced the layered form now standard, where each concern is a separate semantic layer that writes into the composed grid, rather than one grid that several subsystems overwrite in place.',
    citations: ['layered-costmaps-2014', 'nav2-2020'],
  },
  {
    id: 'q-learning',
    term: 'Q-learning',
    definition:
      'Learning the value of taking an action in a state, rather than learning a policy directly: the agent fits a function that predicts the return available from a state-action pair, and acts by picking the action its own estimate rates highest. Sutton and Barto set it out as the archetypal off-policy temporal-difference control method, where the update uses the best available next action instead of the action the behaviour policy actually took, which is exactly what lets the method learn from experience it did not generate. Every off-policy and offline algorithm the robotics literature uses is a descendant of that update, with machinery added to keep the value estimate from running away on data it cannot verify.',
    citations: ['sutton-barto-2018', 'cql-2020'],
  },
  {
    id: 'on-policy',
    term: 'on-policy',
    definition:
      'A learning method whose updates are only valid for data collected by the policy currently being improved, so each batch of experience is used once and then discarded. PPO is the robotics default of this kind: it alternates between sampling interaction data and optimizing a surrogate objective, and the surrogate is what allows several minibatch epochs per batch rather than the single gradient step plain policy gradient takes. The property is a cost when samples are expensive and nearly free when a GPU simulator produces them by the hundred million.',
    citations: ['ppo-2017', 'sutton-barto-2018'],
  },
  {
    id: 'off-policy',
    term: 'off-policy',
    definition:
      'A learning method that can improve one policy from data generated by another, which means old experience stays usable after the policy has moved on. Soft actor-critic is the robotics reference point: Haarnoja and colleagues combined off-policy updates with a maximum-entropy objective specifically to attack the sample complexity that keeps model-free deep RL off real hardware, and reported substantially better sample efficiency than on-policy methods on the same tasks. The distinction is about data reuse rather than taxonomy, and on a real robot it is the difference between a feasible experiment and an impossible one.',
    citations: ['sac-2018', 'sutton-barto-2018'],
  },
  {
    id: 'replay-buffer',
    term: 'replay buffer',
    definition:
      'The store of past transitions an off-policy learner samples its gradient batches from, which is the mechanism that makes data reuse concrete. Its contents need not come from the current policy or even from the learner at all: RLPD trains from a buffer holding prior offline data alongside fresh online experience, and HIL-SERL seeds one with human demonstrations before any autonomous collection starts. The buffer is also where the distinction between online and offline learning collapses to a question of whether anything new is still being added.',
    citations: ['rlpd-2023', 'sac-2018'],
  },
  {
    id: 'sample-efficiency',
    term: 'sample efficiency',
    definition:
      'How much environment interaction a method needs to reach a given level of performance, counted in environment steps rather than in wall-clock time or gradient updates. It decides which algorithms are available on a given platform: Haarnoja and colleagues named poor sample complexity as the reason model-free deep RL is rarely applied to real robots, and then learned Minitaur walking from 160,000 control steps, about two hours of real-world time, by attacking exactly that. In simulation the same quantity barely matters, because the sampler is a GPU running thousands of environments at once.',
    citations: ['sac-2018', 'haarnoja-walk-2019'],
  },
  {
    id: 'offline-reinforcement-learning',
    term: 'offline reinforcement learning',
    definition:
      'Learning a policy entirely from a fixed dataset of previously collected transitions, with no further interaction with the environment. Levine and colleagues frame it as the data-driven counterpart to the supervised paradigms that scaled elsewhere, and identify distributional shift as the central obstacle: the learned policy would like to take actions the dataset never contains, and a value function asked about those actions has nothing to correct an overestimate with. The algorithm families that work are the ones that constrain that extrapolation, whether by penalizing out-of-distribution value estimates, by avoiding querying them at all, or by regularizing the policy toward the behaviour that produced the data.',
    citations: ['offline-rl-tutorial-2020', 'cql-2020'],
  },
  {
    id: 'hindsight-experience-replay',
    term: 'hindsight experience replay',
    definition:
      'Relabelling a failed episode with the goal it actually achieved, so that experience which earned no reward under the intended goal becomes a successful demonstration of reaching a different one. Andrychowicz and colleagues introduced it for goal-conditioned policies with binary sparse rewards, where the technique learns from failure without any reward shaping, and showed it solving manipulation tasks that were otherwise unsolvable by the same algorithm. It is the standard answer to sparse reward when a task can be phrased as reaching a goal state.',
    citations: ['her-2017'],
  },
  {
    id: 'reset-free-learning',
    term: 'reset-free learning',
    definition:
      'Training on real hardware without a human returning the scene to a start state between attempts, which is what stands between a working algorithm and an unattended experiment. Sharma and colleagues formalize the setting as autonomous reinforcement learning, where the agent interacts continually and is evaluated on how much human intervention it needs rather than only on final performance. Gupta and colleagues make the operational version work by learning a collection of tasks whose members reset each other, so the behaviour that undoes the last attempt is itself something the agent is trying to learn.',
    citations: ['autonomous-rl-2022', 'reset-free-rl-2021'],
  },
  {
    id: 'risk-assessment',
    term: 'risk assessment',
    definition:
      'The machinery-safety procedure that turns an informal worry about a machine into a documented engineering obligation. ISO 12100:2010 is the general-principles standard behind it: its public abstract describes procedures for identifying hazards and for estimating and evaluating the risks associated with them across the phases of a machine life cycle, together with guidance on documenting and verifying what the assessment concluded. Its output is a record of which hazards were found, what was done about each, and why the residual risk was judged acceptable, which is what makes safety auditable rather than asserted.',
    citations: ['iso-12100'],
  },
  {
    id: 'speed-and-separation-monitoring',
    term: 'speed and separation monitoring',
    definition:
      'The collaborative operating mode in which a robot and a person may both move at the same time, with a safety system continuously maintaining a protective separation distance between them and issuing a safety-rated stop if that distance is closed. Marvel and Norcross restate the distance in public as a sum of four terms: the operator travel during the reaction and stopping intervals, the robot travel before braking begins, the braking distance itself, and an intrusion margin plus the position uncertainty of both parties. Because the braking term is quadratic in the robot speed, the distance grows faster than the speed does.',
    citations: ['marvel-norcross-2017'],
  },
  {
    id: 'power-and-force-limiting',
    term: 'power and force limiting',
    definition:
      'The collaborative operating mode that permits contact between a robot and a person and makes it safe by bounding what the contact can do, rather than by preventing it. The threshold is biomechanical and stated per body region, which is what turns a marketing word into a claim with numbers behind it: Haddadin, Albu-Schaeffer and Hirzinger established the measurement tradition with impact experiments on the human-robot collision itself, and later force-threshold studies report limits by body region and contact geometry. A cobot certified under this mode has been measured, not merely described.',
    citations: ['haddadin-2009', 'han-force-pain-2024'],
  },
  {
    id: 'functional-safety',
    term: 'functional safety',
    definition:
      'The part of a system\u2019s safety that depends on its control system doing the right thing, as opposed to safety that comes from inherent design or physical guarding. Two standards frame it for machinery: IEC 61508:2010 is the generic standard for electrical, electronic and programmable electronic safety-related systems, and ISO 13849-1:2023 gives a design methodology for the safety-related parts of machine control systems, including software, deferring low-demand operation to the IEC 61508 series. Both frame a safety function as something specified in advance and then argued to have been correctly implemented.',
    citations: ['iec-61508-1-2010', 'iso-13849-1-2023'],
  },
  {
    id: 'safety-integrity-level',
    term: 'safety integrity level',
    definition:
      'The IEC 61508:2010 rating of how much confidence a safety function warrants, assigned to the function rather than to the component that implements it. Reaching a level requires more than a measured failure rate: the series also demands the avoidance of systematic faults, which are the design and specification errors that no amount of redundant hardware removes. That requirement is why a learned policy cannot be assigned one. The evidence a level needs is a verifiable specification of what the function must do, and a policy trained from demonstrations has behaviour instead of a specification.',
    citations: ['iec-61508-1-2010'],
  },
  {
    id: 'performance-level',
    term: 'performance level',
    definition:
      'The ISO 13849-1:2023 counterpart of a safety integrity level, and the rating a machinery integrator in Europe most often has to satisfy. It grades a safety-related control function on a discrete scale, and the standard supplies the design methodology by which a claimed level is justified rather than asserted. Like the IEC 61508 levels, it presumes a specification of the function that can be checked against an implementation, which is exactly what a learned policy does not provide.',
    citations: ['iso-13849-1-2023'],
  },
  {
    id: 'safety-case',
    term: 'safety case',
    definition:
      'A structured, documented argument that a system is acceptably safe for a given application in a given environment, with the evidence for each step of the argument attached to it. The tradition exists because testing alone cannot reach the confidence an autonomous system needs, so the artifact is an argument rather than a test report. UL 4600 applies the approach to autonomous products, and the Goal Structuring Notation community standard gives the graphical notation the argument is usually written in, with goals decomposed into subgoals until each rests on cited evidence.',
    citations: ['ul-4600-2023', 'gsn-standard-v3'],
  },
  {
    id: 'conformal-prediction',
    term: 'conformal prediction',
    definition:
      'A distribution-free procedure that converts any model\u2019s raw score into a prediction set with a guaranteed coverage rate: choose a target such as 95 percent, calibrate a threshold on held-out data, and the resulting sets contain the true answer at that rate under exchangeability, whatever the model is. Vovk, Gammerman and Shafer developed the framework; Angelopoulos and Bates wrote the tutorial that carried it into machine-learning practice. Its value for robotics is that the size of the set is a calibrated statement of uncertainty, so a policy can be made to ask for help exactly when its set is ambiguous.',
    citations: ['vovk-conformal-2022', 'angelopoulos-conformal-2021'],
  },
  {
    id: 'out-of-distribution-detection',
    term: 'out-of-distribution detection',
    definition:
      'Deciding, at run time, whether the input a model is being asked about resembles the data it was trained on, so that a policy can decline rather than extrapolate. In robotics the detector runs on the live observation stream and its output gates the policy: Sinha and colleagues use a fast anomaly detector on the observation to trigger a reactive fallback plan while the slower reasoning runs, which is the practical shape of the technique. It answers a different question from uncertainty in the output, and a policy can be confidently wrong on an input it has never seen.',
    citations: ['sinha-anomaly-2024'],
  },
  {
    id: 'control-barrier-function',
    term: 'control barrier function',
    definition:
      'A scalar function of the state, positive on a set you want the system to stay inside, whose derivative condition can be enforced as a constraint on the commanded input, so forward invariance of the safe set becomes a linear constraint in an optimisation the controller solves each step. Ames and colleagues survey the theory and its applications. Its practical importance is architectural: because the constraint filters whatever input arrives, an arbitrary and unverified controller can be wrapped by a verified one, and the guarantee belongs to the wrapper.',
    citations: ['ames-cbf-2019'],
  },
  {
    id: 'emergency-stop',
    term: 'emergency stop',
    definition:
      'A machine function, initiated by a single human action, that brings a hazardous motion to a halt. ISO 13850:2015 specifies the functional requirements and design principles for it independently of the energy the machine uses, and names IEC 60204-1:2016 for the electrical realisation. Two properties are commonly misunderstood: it is a complement to guarding rather than a substitute for it, since it depends on a person noticing the hazard in time, and stopping is not the same as removing power, which is why the electrical standard distinguishes stop categories.',
    citations: ['iso-13850-2015', 'iec-60204-1-2016'],
  },
  {
    id: 'takt-time',
    term: 'takt time',
    definition:
      'The rate of production a line must hold to match customer demand: available production time divided by the quantity demanded in that time. Taiichi Ohno made it the pacing heartbeat of the Toyota Production System, borrowing the German word Takt for the beat a conductor holds. A cell whose cycle time is slower than takt starves the line; a cell faster than takt needs a buffer, because the point is the match, not the speed.',
    citations: ['ohno-tps-1988'],
  },
  {
    id: 'cycle-time',
    term: 'cycle time',
    definition:
      'The elapsed time for one complete repetition of a automated task: from the start of one pick, weld, or load to the start of the next, including every move in between. It is the denominator of a cell\'s throughput and one of the two numbers an operations buyer asks for first; the other is takt time, which decides whether that cycle is fast enough. Vendor cycle times are quoted at the cell\'s designed pace with known parts, so an unmodelled failure mode lengthens the real one.',
    citations: ['evst-cell-cost-2026'],
  },
  {
    id: 'mean-time-between-failures',
    term: 'mean time between failures',
    definition:
      'The average elapsed operating time between one failure of a repairable system and the next, total operating time divided by the number of failures in that window. Together with mean time to repair it composes availability: MTBF over the sum of MTBF and MTTR. It is a maintenance-economics figure rather than a policy figure, but a cell whose robot fails weekly will bury any per-pick success rate the policy reports.',
    citations: ['ohno-tps-1988'],
  },
  {
    id: 'systems-integrator',
    term: 'systems integrator',
    definition:
      'The company that turns a purchased robot into a working production cell: end-of-arm tooling, fixtures and guarding, vision, PLC integration with the surrounding line, commissioning, and sign-off against the agreed cycle time. Under ISO 10218-2 the cell-level risk assessment is the integrator\'s responsibility, not the robot manufacturer\'s. Integration is why a quoted cell commonly lands at two to three times the arm\'s price.',
    citations: ['evst-cell-cost-2026', 'osha-otm-robots'],
  },
  {
    id: 'brownfield-deployment',
    term: 'brownfield deployment',
    definition:
      'Installing automation into a facility that already exists and already runs: existing floor plans, ceiling heights, power drops, traffic lanes, and a production schedule that cannot simply stop. A greenfield site is designed around the automation; a brownfield site makes the automation fit, and retrofit guarding, lockout procedures, and phased go-lives are what make the same technology cost more and take longer there.',
    citations: ['osha-otm-robots'],
  },
  {
    id: 'automated-storage-and-retrieval',
    term: 'automated storage and retrieval system',
    definition:
      'A warehouse subsystem of fixed racking, cranes or shuttles, and control software that stores and retrieves unit loads without a human walking an aisle. Symbotic\'s systems and Ocado\'s customer fulfilment centres are large-scale descendants: high-bay storage, bots that fetch, and pick stations arranged around the software. An AS/RS buys density and precision at the price of being the building\'s skeletal structure, which is why it appears mostly in new builds.',
    citations: ['symbotic-10k-2025'],
  },
  {
    id: 'autonomous-mobile-robot',
    term: 'autonomous mobile robot',
    definition:
      'A self-navigating transport vehicle that plans its own paths through a facility using onboard sensors, as distinct from an automated guided vehicle that follows fixed infrastructure like tape or wire. Amazon\'s Proteus and the case-handling robots inside Symbotic\'s systems are AMRs at fleet scale, and the fleet manager\'s traffic control, not any single robot\'s navigation, is the hard engineering.',
    citations: ['amazon-robot-fleet-2026'],
  },
  {
    id: 'goods-to-person',
    term: 'goods-to-person',
    definition:
      'The warehouse principle of moving stored items to a stationary human at a pick station, instead of sending the human to walk the shelves. It inverts the economics of order picking: the picker stops being paid to travel and spends nearly the whole shift handling items, which raises throughput per person and simultaneously defines the ceiling an automated picker must beat. Sequoia and Ocado\'s pick walls are both goods-to-person systems.',
    citations: ['amazon-sequoia-digit-2023'],
  },
  {
    id: 'payback-period',
    term: 'payback period',
    definition:
      'The time an automation investment takes to return its cost: total cell capital divided by the monthly value it produces, most often displaced labour. Operations buyers screen against a horizon rather than optimizing the number, and vendor guidance for robot cells quotes 12 to 24 month paybacks in multi-shift operation, stretching toward 36 in single shift. A robot whose payback misses the horizon is not a bad robot; it is a bad fit for that facility\'s wage and throughput.',
    citations: ['evst-cell-cost-2026'],
  },
  {
    id: 'intervention-rate',
    term: 'intervention rate',
    definition:
      'How often an automated system needs a human to touch it: the fraction of cycles that end in a jam, mispick, or fault requiring attention, or equivalently one minus the per-cycle success rate. The economics of the rate are set by the intervention time, not the rate alone: a 1 percent intervention rate cleared in seconds is cheaper per pick than a 0.1 percent rate that stops the line for an hour, which is why deployed systems are engineered around cheap recovery rather than perfect autonomy.',
    citations: ['goldberg-data-gap-2025'],
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
