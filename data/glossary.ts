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
