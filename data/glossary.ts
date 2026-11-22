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
      'Behavior cloning is training a policy by supervised learning on expert demonstrations, with observations as inputs and the expert\'s actions as labels. ALVINN learned road following this way in 1988, and most learned manipulation still builds on it. Its typical failure is covariate shift.',
    citations: ['alvinn-1988', 'dagger-2011'],
  },
  {
    id: 'dagger',
    term: 'DAgger',
    definition:
      'DAgger (Dataset Aggregation) is an iterative fix for covariate shift in behavior cloning. The expert labels the states the learner\'s own policy reaches, and the policy retrains on everything collected so far. Under its assumptions, cost grows linearly with task length instead of quadratically.',
    citations: ['dagger-2011'],
  },
  {
    id: 'compounding-error',
    term: 'compounding error',
    definition:
      'Compounding error is the build-up of small per-step mistakes in a sequential task. Each mistake moves the robot away from its training data, where the next one is more likely, so a cloned policy\'s total cost can grow with the square of episode length.',
    citations: ['dagger-2011', 'act-aloha-2023'],
  },
  {
    id: 'cvae',
    term: 'CVAE',
    definition:
      'A CVAE (conditional variational autoencoder) is a generative model that captures variation in its training data in a hidden latent variable. ACT trains its policy as one, so a single policy can absorb demonstrations that differ in style; at test time the latent is fixed.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'vision-language-action-model',
    term: 'vision-language-action model',
    definition:
      'A vision-language-action (VLA) model is a vision-language model, pretrained on web images and text, fine-tuned to output robot actions. RT-2 introduced the recipe in 2023 by writing actions as text tokens. OpenVLA and Physical Intelligence\'s π models also start from such a model.',
    citations: ['rt2-2023'],
  },
  {
    id: 'cross-embodiment',
    term: 'cross-embodiment',
    definition:
      'Cross-embodiment learning is training one policy on data from robots with different bodies, joint counts and sensors, or transferring skills between them. Open X-Embodiment pooled data from 22 robot types, and its RT-X policies carried skills across platforms.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'action-chunking',
    term: 'action chunking',
    definition:
      'Action chunking is predicting a short sequence of future actions in one inference instead of one action per timestep. Introduced with ACT, it cuts the number of decisions in an episode, which reduces compounding error. The cost is that the robot commits to each chunk.',
    citations: ['act-aloha-2023'],
  },
  {
    id: 'covariate-shift',
    term: 'covariate shift',
    definition:
      'Covariate shift is the gap between the states in an imitation learner\'s demonstrations and the states its own policy reaches. Small errors lead to unfamiliar states, where errors are more likely, so mistakes compound. DAgger was designed to close it.',
    citations: ['dagger-2011'],
  },
  {
    id: 'distribution-shift',
    term: 'distribution shift',
    definition:
      'Distribution shift is a mismatch between a model\'s training data and the data it meets in use, such as a new kitchen, new objects or different lighting. Lin et al. found robot policies generalize better with more diverse data than with more data.',
    citations: ['pi05-2025', 'lin-data-scaling-laws-2024'],
  },
  {
    id: 'diffusion-policy',
    term: 'diffusion policy',
    definition:
      'A diffusion policy is a robot policy that generates a sequence of actions by gradually removing noise, guided by what the robot observes. Chi et al. introduced it in 2023. It can learn a task demonstrated in several different ways without averaging them together.',
    citations: ['diffusion-policy-2023'],
  },
  {
    id: 'domain-randomization',
    term: 'domain randomization',
    definition:
      'Domain randomization is training in simulation with randomized appearance, physics or both, so the real world looks like one more variation. Tobin et al. randomized rendering; Peng et al. randomized dynamics and transferred a pushing policy with no real-world training.',
    citations: ['tobin-2017', 'peng-2018'],
  },
  {
    id: 'forward-kinematics',
    term: 'forward kinematics',
    definition:
      'Forward kinematics is computing the position and orientation of a robot\'s end effector from its joint angles. It always has exactly one answer and is cheap enough to run in every control cycle.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'inverse-kinematics',
    term: 'inverse kinematics',
    definition:
      'Inverse kinematics is finding the joint angles that put the end effector at a target position and orientation. A target can have no solution, one or many, so solvers usually search for one numerically.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'sim-to-real-gap',
    term: 'sim-to-real gap',
    definition:
      'The sim-to-real gap is the difference between a simulator and the real world, in physics, sensing and actuation, that makes simulation-trained policies perform worse on hardware. Domain randomization, system identification and teacher-student distillation each target part of it.',
    citations: ['reality-gap-survey-2026'],
  },
  {
    id: 'temporal-ensembling',
    term: 'temporal ensembling',
    definition:
      'Temporal ensembling is ACT\'s way of smoothing overlapping action chunks. The policy runs every timestep, and each executed action is a weighted average of all predictions for that step; in ACT\'s reference code the oldest retained prediction has the largest weight.',
    citations: ['act-aloha-2023', 'act-reference-2023'],
  },
  {
    id: 'knowledge-insulation',
    term: 'knowledge insulation',
    definition:
      'Knowledge insulation is Physical Intelligence\'s method for teaching a vision-language model to output continuous actions without eroding what it learned in pretraining. The backbone trains on discrete action tokens, while a separate action expert, which cannot send gradients back, produces continuous actions.',
    citations: ['knowledge-insulation-paper-2025'],
  },
  {
    id: 'real-time-chunking',
    term: 'real-time chunking',
    definition:
      'Real-time chunking is a way to run a chunked policy when inference is slower than control. While the robot executes the current chunk, the next one is generated with the actions due in the meantime held fixed, so motion neither pauses nor jumps.',
    citations: ['real-time-chunking-2025'],
  },
  {
    id: 'hierarchical-policy',
    term: 'hierarchical policy',
    definition:
      'A hierarchical policy is a controller split into levels: a high level chooses the next step and low-level skills carry it out. In SayCan a language model picks from a fixed skill library; its mobile robot paired learned picking with hand-designed navigation and placement.',
    citations: ['saycan-2022'],
  },
  {
    id: 'open-x-embodiment',
    term: 'Open X-Embodiment',
    definition:
      'Open X-Embodiment is a 2023 dataset from 34 labs that pools 60 existing robot datasets in one format: over a million trajectories from 22 robot types. RT-X models trained on it outperformed models trained on each robot\'s data alone.',
    citations: ['open-x-embodiment-2023'],
  },
  {
    id: 'teleoperation',
    term: 'teleoperation',
    definition:
      'Teleoperation is a person controlling a robot remotely, in robot learning mainly to record demonstrations. In the ALOHA rig the operator moves a leader arm and an identical follower arm copies it joint for joint, so recordings are already in the robot\'s own actions.',
    citations: ['act-aloha-2023', 'mobile-aloha-2024'],
  },
  {
    id: 'success-rate',
    term: 'success rate',
    definition:
      'Success rate is the fraction of trials in which a policy completes its task, the headline number in robot learning. It means little without the trial count, time limit and test scenes; Toyota Research Institute warns that few trials carry a significant risk of noise.',
    citations: ['tri-lbm-2025', 'optimal-stopping-2025'],
  },
  {
    id: 'ppo',
    term: 'PPO',
    definition:
      'PPO (proximal policy optimization) is the on-policy reinforcement learning algorithm most locomotion work uses. It alternates between collecting experience and taking several small, bounded update steps on it, which keeps training stable and suits GPU simulators running thousands of robots at once.',
    citations: ['ppo-2017', 'rudin-2021'],
  },
  {
    id: 'parallel-simulation',
    term: 'parallel simulation',
    definition:
      'Parallel simulation is running thousands of copies of a physics simulation at once on one GPU. Isaac Gym keeps both physics and learning on the GPU; with it, Rudin et al. trained ANYmal to walk on flat ground in under four minutes.',
    citations: ['isaac-gym-2021', 'rudin-2021'],
  },
  {
    id: 'reward-shaping',
    term: 'reward shaping',
    definition:
      'Reward shaping is adding extra rewards to guide learning, usually to turn a rare success signal into frequent feedback. Ng, Harada and Russell proved that shaping from a potential function leaves the best policy unchanged; other bonuses can teach the agent to farm the bonus.',
    citations: ['ng-reward-shaping-1999'],
  },
  {
    id: 'whole-body-control',
    term: 'whole-body control',
    definition:
      'Whole-body control is controlling all of a robot\'s joints (legs, torso, arms and hands) as one coupled problem instead of with separate controllers. It can be model-based, as in Zhang et al.\'s real-time MPC, or learned, as in H2O\'s humanoid teleoperation.',
    citations: ['mujoco-ilqr-2026', 'h2o-2024'],
  },
  {
    id: 'legged-locomotion',
    term: 'legged locomotion',
    definition:
      'Legged locomotion is moving on legs, which means keeping balance on a changing set of footholds. ETH Zurich replaced hand-built controllers with policies trained by reinforcement learning in simulation; its ANYmal controllers walk over rough outdoor terrain.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'mpc',
    term: 'model predictive control',
    definition:
      'Model predictive control (MPC) is control by constant replanning: each step it optimizes a short action sequence against a dynamics model, executes the first action and replans from the new state. Zhang et al. run it in real time on quadruped and humanoid hardware.',
    citations: ['mujoco-ilqr-2026'],
  },
  {
    id: 'flow-matching',
    term: 'flow matching',
    definition:
      'Flow matching is a way to train a generative model to turn random noise into data along a smooth path. π0 uses it to generate continuous action chunks in a few steps, fast enough for high-frequency robot control.',
    citations: ['pi0-2024'],
  },
  {
    id: 'world-model',
    term: 'world model',
    definition:
      'A world model is a model that predicts what happens next given the current state and an action, so an agent can plan, train or be tested on predictions instead of reality. The predictions must depend on the action; realistic video is not enough.',
    citations: ['world-model-survey-2026'],
  },
  {
    id: 'end-effector',
    term: 'end effector',
    definition:
      'An end effector is the device at the end of a robot arm that acts on the world, such as a gripper, hand or tool. Learned policies command it either directly, as end-effector motions, or indirectly through joint targets.',
    citations: ['modern-robotics-2017', 'action-space-design-2026', 'act-aloha-2023'],
  },
  {
    id: 'jacobian',
    term: 'Jacobian',
    definition:
      'The Jacobian is the matrix that converts a robot\'s joint velocities into the velocity of its end effector at the current pose. At a singularity it loses rank and some hand motions need unbounded joint speeds. Its transpose converts hand forces into joint torques.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'proprioception',
    term: 'proprioception',
    definition:
      'Proprioception is a robot\'s sense of its own body: joint positions and velocities, orientation and contact. Unlike cameras or lidar it is fast and cheap and is never blocked. ETH Zurich\'s ANYmal crossed mud, snow and rubble using it alone.',
    citations: ['lee-2020', 'miki-2022'],
  },
  {
    id: 'system-identification',
    term: 'system identification',
    definition:
      'System identification is measuring a real robot\'s dynamics and tuning a simulator to match. Hwangbo et al. found ANYmal\'s actuators were the main mismatch and replaced their analytic model with a neural network trained on measured data.',
    citations: ['hwangbo-2019', 'reality-gap-survey-2026'],
  },
  {
    id: 'retargeting',
    term: 'retargeting',
    definition:
      'Retargeting is mapping motion recorded on one body, usually a human, onto a robot with different proportions and joint limits. The raw result can be physically impossible, so H2O drops retargeted motions a simulated tracker cannot follow; ASAP filters the human motion that way before retargeting.',
    citations: ['h2o-2024', 'asap-2025'],
  },
  {
    id: 'imitation-learning',
    term: 'imitation learning',
    definition:
      'Imitation learning is learning a policy from expert demonstrations instead of from a reward. Its simplest form is behavior cloning. Its main weakness is that the learner drifts into states the expert never showed, the problem DAgger addresses.',
    citations: ['dagger-2011', 'alvinn-1988'],
  },
  {
    id: 'scaling-law',
    term: 'scaling law',
    definition:
      'A scaling law is a measured relation between performance and resources such as model size, data or compute. In robot learning, Lin et al. found generalization tracks data diversity more than hours, and EgoScale reported success rising log-linearly with hours of human video.',
    citations: ['lin-data-scaling-laws-2024', 'egoscale-2026'],
  },
  {
    id: 'vision-language-model',
    term: 'vision-language model',
    definition:
      'A vision-language model (VLM) is a model pretrained on web-scale images and text, so it can recognize objects and follow written instructions. Vision-language-action models start from one; RT-2 showed that its web knowledge carries over to robot control.',
    citations: ['rt2-2023'],
  },
  {
    id: 'affordance',
    term: 'affordance',
    definition:
      'An affordance, in SayCan, is an estimate of whether a skill can succeed from the robot\'s current situation. SayCan multiplies it by a language model\'s estimate of how useful the skill is. A high score does not guarantee the skill will work.',
    citations: ['saycan-2022'],
  },
  {
    id: 'curriculum-learning',
    term: 'curriculum learning',
    definition:
      'Curriculum learning is training on tasks that start easy and get harder as the agent improves. Rudin et al. moved each simulated ANYmal to harder terrain when it crossed its current tile and to easier terrain when it fell short.',
    citations: ['rudin-2021'],
  },
  {
    id: 'teacher-student-distillation',
    term: 'teacher-student distillation',
    definition:
      'Teacher-student distillation is training a policy in two stages. A teacher learns with privileged simulator information, such as exact terrain or friction; a student then imitates it using only the real robot\'s sensors. Lee et al. trained ANYmal\'s rough-terrain controller this way.',
    citations: ['rma-2021', 'lee-2020'],
  },
  {
    id: 'action-tokenization',
    term: 'action tokenization',
    definition:
      'Action tokenization is turning continuous robot actions into discrete tokens that a language model can output. RT-2 split each action dimension into 256 bins, each mapped to a rarely used word. It is simple but coarse, and producing tokens one at a time is slow.',
    citations: ['rt2-2023'],
  },
  {
    id: 'latent-dynamics',
    term: 'latent dynamics',
    definition:
      'Latent dynamics is a world-model approach that predicts in a compact learned representation instead of in pixels. Dreamer trains a policy entirely on rollouts imagined in this space; TD-MPC2 plans with such a model and never reconstructs images.',
    citations: ['dreamer-2019', 'tdmpc2-2023'],
  },
  {
    id: 'degrees-of-freedom',
    term: 'degrees of freedom',
    definition:
      'Degrees of freedom are the independent ways a mechanism can move; an arm has one per joint. Placing a hand anywhere in space, at any angle, takes six, so a 7-DoF arm can move its elbow while the hand stays still.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'denavit-hartenberg-parameters',
    term: 'Denavit-Hartenberg parameters',
    definition:
      'Denavit-Hartenberg parameters are a standard way to describe each link of a robot arm with four numbers: two distances and two angles between neighboring joint axes. Several incompatible conventions exist, so a parameter table must say which one it uses.',
    citations: ['lavalle-2006', 'modern-robotics-2017'],
  },
  {
    id: 'configuration-space',
    term: 'configuration space',
    definition:
      'Configuration space is the space of all possible joint settings of a robot, one point per configuration; a 7-joint arm moves in a 7-dimensional space. Lozano-Pérez (1983) turned obstacle avoidance into finding a path through the collision-free part of this space.',
    citations: ['lozano-perez-1983', 'lavalle-2006', 'lavalle-1998'],
  },
  {
    id: 'trajectory-optimization',
    term: 'trajectory optimization',
    definition:
      'Trajectory optimization is motion planning by numerically improving a candidate path until it is short, smooth and collision-free. CHOMP and TrajOpt are well-known examples. They find local solutions, so the result depends on the starting path and can fail.',
    citations: ['ratliff-2009', 'schulman-2013'],
  },
  {
    id: 'kalman-filter',
    term: 'Kalman filter',
    definition:
      'The Kalman filter is a method for tracking a changing state from noisy measurements. It predicts the state with a motion model, then corrects it with each measurement, weighted by uncertainty. Kalman published it in 1960; it is optimal for linear systems with Gaussian noise.',
    citations: ['kalman-1960-filter', 'thrun-2005'],
  },
  {
    id: 'factor-graph',
    term: 'factor graph',
    definition:
      'A factor graph is a graph that breaks an estimation problem into unknowns, such as robot poses, and factors, such as the measurements that link them. In robotics it turns SLAM and trajectory smoothing into one sparse least-squares problem.',
    citations: ['kschischang-2001', 'dellaert-kaess-2006'],
  },
  {
    id: 'slam',
    term: 'SLAM',
    definition:
      'SLAM (simultaneous localization and mapping) is estimating a robot\'s path while building a map of its surroundings, each from the other. Most modern systems solve both together as one estimation problem over a factor graph; filter-based systems can also perform well.',
    citations: ['cadena-2016', 'dellaert-kaess-2006'],
  },
  {
    id: 'friction-cone',
    term: 'friction cone',
    definition:
      'A friction cone is the set of forces a contact, such as a fingertip, can apply without slipping: every force within a fixed angle of the surface normal, set by the friction coefficient. More friction widens the cone; without friction it shrinks to the normal.',
    citations: ['murray-li-sastry-1994', 'prattichizzo-trinkle-2016'],
  },
  {
    id: 'force-closure',
    term: 'force closure',
    definition:
      'Force closure is the property of a grasp that can resist any push or twist on the object using contact forces inside the friction cones. For two fingers, Nguyen showed it holds exactly when the line between the contacts lies inside both cones.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'form-closure',
    term: 'form closure',
    definition:
      'Form closure is a grasp that holds an object by geometry alone, so it stays immobilized even with no friction. It needs at least four contacts in the plane and seven in 3D, which is why practical grasps rely on friction.',
    citations: ['bicchi-1995', 'mishra-1987'],
  },
  {
    id: 'grasp-wrench-space',
    term: 'grasp wrench space',
    definition:
      'The grasp wrench space is the set of all forces and torques a grasp can apply to an object. The grasp has force closure if this set surrounds the origin; the Ferrari-Canny quality score measures how far it reaches in its weakest direction.',
    citations: ['ferrari-canny-1992', 'bicchi-kumar-2000'],
  },
  {
    id: 'antipodal-grasp',
    term: 'antipodal grasp',
    definition:
      'An antipodal grasp is a two-finger grasp in which the line between the contacts lies strictly inside both friction cones. Nguyen proved that this gives force closure for a planar two-contact grasp. It is the usual target for parallel-jaw grippers.',
    citations: ['nguyen-1988', 'murray-li-sastry-1994'],
  },
  {
    id: 'mechanoreceptor',
    term: 'mechanoreceptor',
    definition:
      'A mechanoreceptor is a nerve ending in the skin that responds to pressure, vibration or stretch. The palm side of a human hand has about 17,000, roughly 1,000 per fingertip. Humans feel about 3 mN; Sanctuary\'s robot finger pads detect about 5 mN.',
    citations: ['macefield-touch-2022', 'brooks-dexterity-2025', 'rr-sanctuary-tactile-2025', 'digit-360-2024'],
  },
  {
    id: 'tactile-sensing',
    term: 'tactile sensing',
    definition:
      'Tactile sensing is measuring contact through a robot\'s skin or fingertips: where it touches, how hard and whether it is slipping. It matters most once closed fingers hide the contact from cameras. Sensors include pressure arrays, barometric cells and fingertip cameras.',
    citations: ['tactile-outlook-2025', 'rr-sanctuary-tactile-2025'],
  },
  {
    id: 'in-hand-manipulation',
    term: 'in-hand manipulation',
    definition:
      'In-hand manipulation is repositioning an object within the hand without putting it down, such as rolling a pen or turning a key. Cameras struggle because the fingers hide the contacts. Sanctuary showed in-hand reorientation with a 21-DoF hydraulic hand in 2024.',
    citations: ['sanctuary-inhand-2024', 'holson-olympics-2025'],
  },
  {
    id: 'contact-rich-manipulation',
    term: 'contact-rich manipulation',
    definition:
      'Contact-rich manipulation is manipulation that depends on making and controlling contact, such as inserting, screwing, wiping or folding. Contact switches abruptly between sticking and slipping, so small sensing errors can cause large failures.',
    citations: ['touchworld-2026', 'tactile-outlook-2025'],
  },
  {
    id: 'long-tail',
    term: 'long tail',
    definition:
      'The long tail is the mass of rare situations that each almost never occur but together decide whether a robot can be deployed, such as a couch falling off a truck. Logs hold too few examples to learn from, so Waymo generates them in simulation.',
    citations: ['waymo-world-model-2026', 'koopman-safe-enough-2026'],
  },
  {
    id: 'operational-design-domain',
    term: 'operational design domain (ODD)',
    definition:
      'An operational design domain (ODD) is the set of conditions an automated driving system is designed to handle, such as area, road types, speeds, weather and time of day. A Level 4 robotaxi drives itself only inside its ODD.',
    citations: ['sae-j3016-2021', 'waymo-crash-rates-2025'],
  },
  {
    id: 'end-to-end-driving',
    term: 'end-to-end driving',
    definition:
      'End-to-end driving is a single learned model that maps sensor input directly to a driving plan or vehicle commands, instead of separate perception, prediction and planning modules. UniAD trains all stages together in one network; Waymo\'s EMMA builds on Gemini and writes trajectories as text.',
    citations: ['uniad-2023', 'emma-2024', 'e2e-ad-survey-2024'],
  },
  {
    id: 'visual-inertial-odometry',
    term: 'visual-inertial odometry (VIO)',
    definition:
      'Visual-inertial odometry (VIO) is estimating a robot\'s motion by combining camera images with an inertial measurement unit (IMU). The IMU tracks fast motion between frames and the camera keeps its error from building up. It needs no GPS, so small drones commonly use it.',
    citations: ['swift-drone-racing-2023'],
  },
  {
    id: 'swarm-robotics',
    term: 'swarm robotics',
    definition:
      'Swarm robotics is coordinating many robots through local interaction, without a central controller. In a 2022 demonstration, ten drones flew through a bamboo forest, each planning its own path onboard in milliseconds and treating its neighbors as obstacles, with no external positioning or shared map.',
    citations: ['micro-drone-swarm-2022', 'soria-nmpc-swarm-2021'],
  },
  {
    id: 'minimally-invasive-surgery',
    term: 'minimally invasive surgery',
    definition:
      'Minimally invasive surgery is surgery through small incisions using long instruments and a camera, instead of one large opening. Patients recover faster, but surgeons lose touch and dexterity. Surgical robots such as da Vinci restore dexterity with wristed instruments and a magnified 3D view.',
    citations: ['davinci5-clearance-2024', 'intuitive-q4-2025'],
  },
  {
    id: 'robotic-assisted-surgical-device',
    term: 'robotic assisted surgical device',
    definition:
      'A robotic assisted surgical device (RASD) is the US regulatory category for surgical robots that assist a surgeon, who stays in control. Each system is cleared for specific procedures, so new uses and any added autonomy arrive one cleared indication at a time.',
    citations: ['cmr-versius-authorization-2024', 'yang-autonomy-2017'],
  },
  {
    id: 'force-feedback',
    term: 'force feedback',
    definition:
      'Force feedback is measuring the forces at a tool tip and letting the operator feel them through the controls; without it, surgeons judge tissue contact by sight. Intuitive reports that the da Vinci 5\'s force-feedback instruments cut force on tissue by up to 43 percent in preclinical trials.',
    citations: ['davinci5-clearance-2024'],
  },
  {
    id: 'in-situ-resource-utilization',
    term: 'in-situ resource utilization (ISRU)',
    definition:
      'In-situ resource utilization (ISRU) is making supplies such as oxygen, water or rocket propellant from materials at the destination instead of launching them from Earth. NASA\'s MOXIE first did it on Mars, making oxygen from carbon dioxide in the atmosphere.',
    citations: ['moxie-completion-2023', 'prime-1-lunar-2025'],
  },
  {
    id: 'on-orbit-servicing',
    term: 'on-orbit servicing',
    definition:
      'On-orbit servicing is using one spacecraft to inspect, refuel, repair, move or extend the life of another. It became commercial in 2020, when Northrop Grumman\'s MEV-1 docked with the Intelsat 901 satellite to keep it in service.',
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
      'Impedance control is controlling how a robot responds to contact instead of commanding position or force alone: the arm behaves like a programmed spring and damper, pushing back in proportion when moved off its target. Hogan introduced it in 1985.',
    citations: ['hogan-1985'],
  },
  {
    id: 'admittance-control',
    term: 'admittance control',
    definition:
      'Admittance control is compliant control that measures contact force and responds with a programmed motion, the reverse of impedance control. It suits stiff, geared arms with precise position control, adding compliance in software at the cost of a force sensor and some delay.',
    citations: ['ott-2010'],
  },
  {
    id: 'hybrid-force-position-control',
    term: 'hybrid force/position control',
    definition:
      'Hybrid force/position control is splitting a contact task into directions where force is controlled and directions where position is controlled. When polishing, the robot controls force into the surface and position along it. Raibert and Craig formalized it in 1981.',
    citations: ['raibert-craig-1981', 'mason-1981'],
  },
  {
    id: 'series-elastic-actuator',
    term: 'series elastic actuator',
    definition:
      'A series elastic actuator is a motor with a deliberate spring between the gearbox and the load. The spring\'s stretch measures force cheaply and cushions impacts, at the cost of speed and position accuracy. Pratt and Williamson proposed it in 1995.',
    citations: ['pratt-williamson-1995'],
  },
  {
    id: 'backdrivability',
    term: 'backdrivability',
    definition:
      'Backdrivability is how easily an outside force can turn a robot\'s joint when the motors are not resisting. Direct-drive joints move freely when pushed; high-ratio geared joints barely move. It decides whether impedance control works directly or the arm needs a force sensor.',
    citations: ['hogan-1985', 'pratt-williamson-1995'],
  },
  {
    id: 'camera-intrinsics',
    term: 'camera intrinsics',
    definition:
      'Camera intrinsics are a camera\'s internal parameters: focal length, the principal point where the optical axis meets the image, and lens distortion. They turn a pixel into a direction in space. Zhang\'s method estimates them from a few photos of a printed checkerboard.',
    citations: ['zhang-2000-calibration'],
  },
  {
    id: 'hand-eye-calibration',
    term: 'hand-eye calibration',
    definition:
      'Hand-eye calibration is finding the exact position and orientation of a camera relative to the robot, whether the camera rides on the gripper or is fixed in the cell. Tsai and Lenz posed it in 1989 as solving AX = XB from several robot motions.',
    citations: ['tsai-lenz-1989'],
  },
  {
    id: 'point-cloud',
    term: 'point cloud',
    definition:
      'A point cloud is an unordered set of 3D points, as produced by a depth camera or lidar. A network that reads one must give the same answer for any point order; PointNet does this by encoding each point separately and pooling the results.',
    citations: ['pointnet-2017', 'pointnet-plus-plus-2017'],
  },
  {
    id: 'semantic-segmentation',
    term: 'semantic segmentation',
    definition:
      'Semantic segmentation is labeling every pixel of an image with a class instead of drawing boxes around objects. Grasping needs the pixel version: a box around a mug also contains the table behind it, and a mask does not.',
    citations: ['segment-anything-2023'],
  },
  {
    id: 'promptable-segmentation',
    term: 'promptable segmentation',
    definition:
      'Promptable segmentation is producing an object mask from an image plus a hint, such as a click, a box or a rough mask. Meta\'s Segment Anything (SAM) was trained on 1.1 billion masks; SAM 2 extends it to video, following the object across frames.',
    citations: ['segment-anything-2023', 'sam2-2024'],
  },
  {
    id: 'pose-estimation',
    term: 'pose estimation',
    definition:
      'Pose estimation is recovering an object\'s full position and orientation in 3D, six numbers in all, from sensor data. Methods such as PoseCNN are trained for each known object; FoundationPose handles new objects given a CAD model or a few reference photos.',
    citations: ['posecnn-2018', 'foundationpose-2024'],
  },
  {
    id: 'add-s-metric',
    term: 'symmetry-aware pose error (ADD-S)',
    definition:
      'Symmetry-aware pose error (ADD-S) is a pose-accuracy score that compares each model point with the nearest point of the estimated model, so rotating a symmetric object such as a bowl costs little. On LINEMOD a pose is correct below 10 percent of the object\'s diameter.',
    citations: ['hinterstoisser-2012'],
  },
  {
    id: 'visual-servoing',
    term: 'visual servoing',
    definition:
      'Visual servoing is controlling a robot\'s motion directly from camera feedback. Image-based servoing drives the difference between seen and desired image features to zero; position-based servoing works from an estimated pose. Espiau, Chaumette and Rives set out the framework in 1992.',
    citations: ['espiau-1992', 'chaumette-hutchinson-2006'],
  },
  {
    id: 'occupancy-grid',
    term: 'occupancy grid',
    definition:
      'An occupancy grid is a map divided into cells, each holding the probability that it is occupied. Moravec and Elfes introduced it in 1985 for sonar. Unlike maps built for rendering, it can mark a cell as unknown, which a planner needs.',
    citations: ['moravec-elfes-1985', 'nav2-2020'],
  },
  {
    id: 'signed-distance-field',
    term: 'signed-distance field',
    definition:
      'A signed-distance field is a grid in which each cell stores its distance to the nearest surface, positive in free space and negative behind it; the surface lies where the value crosses zero. KinectFusion builds an approximate, truncated version live from a depth camera.',
    citations: ['curless-levoy-1996', 'kinectfusion-2011'],
  },
  {
    id: 'neural-radiance-field',
    term: 'neural radiance field',
    definition:
      'A neural radiance field (NeRF) is a scene stored as a small neural network that returns density and color for any 3D point and viewing direction. Trained from posed photos, it renders new views well, but its geometry is not built for contact checks.',
    citations: ['nerf-2020', 'instant-ngp-2022'],
  },
  {
    id: 'gaussian-splatting',
    term: 'Gaussian splatting',
    definition:
      'Gaussian splatting (3DGS) is a scene representation made of many small, colored, semi-transparent 3D blobs drawn directly onto the image. It matches neural radiance fields in image quality at real-time frame rates, but has no explicit surface, so contact geometry must be extracted separately.',
    citations: ['3dgs-2023'],
  },
  {
    id: 'loop-closure',
    term: 'loop closure',
    definition:
      'Loop closure is recognizing that a robot has returned to a place it has already mapped and adding that link to the map. The new constraint spreads the accumulated drift back along the trajectory and reduces it, though some error can remain.',
    citations: ['cadena-2016', 'orb-slam-2015'],
  },
  {
    id: 'place-recognition',
    term: 'place recognition',
    definition:
      'Place recognition is deciding whether the current camera view shows a place already in the map. It is hard because places change appearance and different places can look alike. A false match can corrupt the map, so systems check candidate matches geometrically.',
    citations: ['lowry-2016-place-recognition', 'cadena-2016'],
  },
  {
    id: 'costmap',
    term: 'costmap',
    definition:
      'A costmap is the grid a mobile robot\'s navigation stack plans over: obstacles from the map and live sensors, inflated by the robot\'s size, plus other route costs. ROS navigation builds it from ordered layers, such as the static map, live obstacles and inflation.',
    citations: ['layered-costmaps-2014', 'nav2-2020'],
  },
  {
    id: 'q-learning',
    term: 'Q-learning',
    definition:
      'Q-learning is a reinforcement learning method that learns how much future reward each action is worth in each state, then picks the action with the highest estimate. Because each update assumes the best next action, it can learn from experience gathered by any policy.',
    citations: ['sutton-barto-2018', 'cql-2020'],
  },
  {
    id: 'on-policy',
    term: 'on-policy',
    definition:
      'An on-policy method is a reinforcement learning method that learns only from experience collected by its current policy, so data is used briefly and then discarded. PPO is the robotics default; the waste matters little when a GPU simulator produces data cheaply.',
    citations: ['ppo-2017', 'sutton-barto-2018'],
  },
  {
    id: 'off-policy',
    term: 'off-policy',
    definition:
      'An off-policy method is a reinforcement learning method that can learn from experience collected by other policies, including older versions of itself, so past data stays useful. Soft actor-critic, the usual robotics example, needs far fewer samples than on-policy methods.',
    citations: ['sac-2018', 'sutton-barto-2018'],
  },
  {
    id: 'replay-buffer',
    term: 'replay buffer',
    definition:
      'A replay buffer is a store of past experience that an off-policy learner samples training batches from. Its contents can come from any source: RLPD mixes offline data with new experience, and HIL-SERL starts from human demonstrations.',
    citations: ['rlpd-2023', 'sac-2018'],
  },
  {
    id: 'sample-efficiency',
    term: 'sample efficiency',
    definition:
      'Sample efficiency is how much experience a method needs to reach a given performance. It matters most on real hardware, where experience is slow and costly: soft actor-critic taught a Minitaur robot to walk in about two hours of real-world training.',
    citations: ['sac-2018', 'haarnoja-walk-2019'],
  },
  {
    id: 'offline-reinforcement-learning',
    term: 'offline reinforcement learning',
    definition:
      'Offline reinforcement learning is learning a policy from a fixed dataset of past experience, with no new interaction during training. Its main difficulty is that the learner can overrate actions the data never shows, with no environment to correct it.',
    citations: ['offline-rl-tutorial-2020', 'cql-2020'],
  },
  {
    id: 'hindsight-experience-replay',
    term: 'hindsight experience replay',
    definition:
      'Hindsight experience replay (HER) is a training method for goal-reaching tasks that replays past attempts as if their goal had been a state they actually reached, so misses still teach. Andrychowicz et al. trained a simulated arm with it to push, slide and place objects.',
    citations: ['her-2017'],
  },
  {
    id: 'reset-free-learning',
    term: 'reset-free learning',
    definition:
      'Reset-free learning is training a robot on real hardware without a person resetting the scene between attempts. The robot has to recover on its own: Gupta et al. trained a robot hand to pick up a dropped object and carry on practicing.',
    citations: ['autonomous-rl-2022', 'reset-free-rl-2021'],
  },
  {
    id: 'risk-assessment',
    term: 'risk assessment',
    definition:
      'Risk assessment is the documented process of finding a machine\'s hazards, estimating their risks and deciding whether the remaining risk is acceptable. ISO 12100 sets out the general method, and the record lets others check each safety decision.',
    citations: ['iso-12100'],
  },
  {
    id: 'speed-and-separation-monitoring',
    term: 'speed and separation monitoring',
    definition:
      'Speed and separation monitoring is a collaborative-robot mode in which a safety system keeps a minimum distance between robot and person and stops the robot if it is breached. The required distance grows faster than robot speed, because braking distance grows with its square.',
    citations: ['marvel-norcross-2017'],
  },
  {
    id: 'power-and-force-limiting',
    term: 'power and force limiting',
    definition:
      'Power and force limiting is a collaborative-robot mode that allows contact with people but caps the force and pressure the robot can apply. The limits differ by body region and come from human-robot impact and pain-threshold studies.',
    citations: ['haddadin-2009', 'han-force-pain-2024'],
  },
  {
    id: 'functional-safety',
    term: 'functional safety',
    definition:
      'Functional safety is the part of a system\'s safety that depends on its control system working correctly, as opposed to guards or inherently safe design. IEC 61508 is the general standard; ISO 13849-1 covers the safety-related parts of machine control systems.',
    citations: ['iec-61508-1-2010', 'iso-13849-1-2023'],
  },
  {
    id: 'safety-integrity-level',
    term: 'safety integrity level',
    definition:
      'A safety integrity level (SIL) is IEC 61508\'s rating, from 1 to 4, of how reliably a safety function must work. It requires a verifiable specification of the function, which a policy learned from demonstrations does not have.',
    citations: ['iec-61508-1-2010'],
  },
  {
    id: 'performance-level',
    term: 'performance level',
    definition:
      'A performance level (PL) is ISO 13849-1\'s rating, from a to e, of how reliably a machine safety function works, the machinery counterpart of a safety integrity level. Like a SIL, it assumes a specified function that can be checked against its implementation.',
    citations: ['iso-13849-1-2023'],
  },
  {
    id: 'safety-case',
    term: 'safety case',
    definition:
      'A safety case is a structured argument, backed by evidence at every step, that a system is safe enough for a given use. UL 4600 applies it to autonomous products. Goal Structuring Notation draws it as goals broken into subgoals that each rest on evidence.',
    citations: ['ul-4600-2023', 'gsn-standard-v3'],
  },
  {
    id: 'conformal-prediction',
    term: 'conformal prediction',
    definition:
      'Conformal prediction is a method that turns any model\'s scores into answer sets that contain the right answer at a chosen rate, such as 95 percent, when new data resembles the calibration data. A large set signals doubt, so a robot can ask for help.',
    citations: ['vovk-conformal-2022', 'angelopoulos-conformal-2021'],
  },
  {
    id: 'out-of-distribution-detection',
    term: 'out-of-distribution detection',
    definition:
      'Out-of-distribution detection is checking at run time whether an input looks unlike a model\'s training data, so the system can fall back instead of guessing. It differs from output confidence: a policy can be confidently wrong on inputs it has never seen.',
    citations: ['sinha-anomaly-2024'],
  },
  {
    id: 'control-barrier-function',
    term: 'control barrier function',
    definition:
      'A control barrier function is a function of a system\'s state that is positive inside a safe region. At each control step a small optimization adjusts the command just enough to stay inside, so it can wrap any controller, including an unverified learned one.',
    citations: ['ames-cbf-2019'],
  },
  {
    id: 'emergency-stop',
    term: 'emergency stop',
    definition:
      'An emergency stop is a machine function, triggered by a single human action, that halts hazardous motion. ISO 13850 sets its requirements and IEC 60204-1 its electrical design. It backs up guarding without replacing it, since someone has to notice the danger first.',
    citations: ['iso-13850-2015', 'iec-60204-1-2016'],
  },
  {
    id: 'takt-time',
    term: 'takt time',
    definition:
      'Takt time is the available production time divided by customer demand over the same period, giving the time allowed per unit. A line keeps up with demand when its cycle time is at or below takt time.',
    citations: ['lei-takt-time-definition'],
  },
  {
    id: 'cycle-time',
    term: 'cycle time',
    definition:
      'Cycle time is the measured time it takes to make one part or complete one process.',
    citations: ['lei-cycle-time-definition'],
  },
  {
    id: 'mean-time-between-failures',
    term: 'mean time between failures',
    definition:
      'Mean time between failures (MTBF) is the average operating time between failures of a repairable system. NASA combines it with mean time to repair to estimate inherent availability, which leaves out logistics delays and preventive maintenance.',
    citations: ['nasa-availability-prediction-analysis'],
  },
  {
    id: 'systems-integrator',
    term: 'systems integrator',
    definition:
      'A systems integrator is a company that turns a robot into a working cell, adding tooling, sensors, guarding and controls, then commissioning and programming it. Under OSHA guidance the integrator documents a risk assessment before commissioning; the employer remains responsible for workplace safety.',
    citations: ['evst-cell-cost-2026', 'osha-otm-robots'],
  },
  {
    id: 'brownfield-deployment',
    term: 'brownfield deployment',
    definition:
      'Brownfield deployment is installing automation in an existing, running facility, around its layout, ceilings, power supply and a schedule that cannot stop. A greenfield site is built around the automation. The same equipment usually costs more and takes longer to install in a brownfield site.',
    citations: ['osha-otm-robots'],
  },
  {
    id: 'automated-storage-and-retrieval',
    term: 'automated storage and retrieval system',
    definition:
      'An automated storage and retrieval system (AS/RS) is a warehouse system of racks, cranes or shuttles and software that stores and fetches goods with no one walking the aisles. It is dense and precise but built into the structure, so it suits new buildings.',
    citations: ['symbotic-10k-2025'],
  },
  {
    id: 'autonomous-mobile-robot',
    term: 'autonomous mobile robot',
    definition:
      'An autonomous mobile robot (AMR) is a vehicle that finds its way through a facility with its own sensors and plans its own routes, unlike an automated guided vehicle that follows fixed tape or wire. Amazon\'s Proteus is one.',
    citations: ['amazon-robot-fleet-2026'],
  },
  {
    id: 'goods-to-person',
    term: 'goods-to-person',
    definition:
      'Goods-to-person is the warehouse method of bringing stored items to a picker at a fixed station instead of sending the picker to the shelves. Pickers spend almost all their time handling items, which sets the rate a picking robot must beat.',
    citations: ['amazon-sequoia-digit-2023'],
  },
  {
    id: 'payback-period',
    term: 'payback period',
    definition:
      'Payback period is the time an automation investment takes to pay for itself: the cost of the cell divided by its monthly savings, mostly labor. Vendor guidance quotes 12 to 24 months for multi-shift operation and up to 36 for a single shift.',
    citations: ['evst-cell-cost-2026'],
  },
  {
    id: 'intervention-rate',
    term: 'intervention rate',
    definition:
      'Intervention rate is the fraction of cycles in which a person must clear a jam, a missed pick or a fault. Recovery time sets its cost: a 1 percent rate cleared in seconds can cost less than 0.1 percent that stops the line for an hour.',
    citations: ['goldberg-data-gap-2025'],
  },
  {
    id: 'predicted-horizon',
    term: 'predicted horizon',
    definition:
      'The predicted horizon is the number of future actions a chunked policy outputs in one inference, whether or not all of them run. It is 16 steps for Diffusion Policy and 50 for π0, one second at 50 Hz.',
    citations: ['pi0-2024', 'diffusion-policy-2023'],
  },
  {
    id: 'committed-horizon',
    term: 'committed horizon',
    definition:
      'The committed horizon is the number of predicted actions a robot executes before a new prediction replaces them. Diffusion Policy predicts 16 steps and executes 8; π0.7 predicts 50 and executes 15 to 25.',
    citations: ['diffusion-policy-2023', 'pi07-2026', 'real-time-chunking-2025'],
  },
  {
    id: 'policy',
    term: 'policy',
    definition:
      'A policy is the rule an agent uses to choose actions, a mapping from what it observes to what it does. In robot learning it is usually a neural network that takes camera images, joint readings and sometimes an instruction and outputs motor commands.',
    citations: ['sutton-barto-2018', 'rt2-2023'],
  },
  {
    id: 'reinforcement-learning',
    term: 'reinforcement learning (RL)',
    definition:
      'Reinforcement learning (RL) is learning to act by trial and error. The agent is never told the right action; it tries actions, receives a numerical reward and adjusts its policy to earn more. Locomotion controllers are often trained this way in simulation.',
    citations: ['sutton-barto-2018', 'rudin-2021'],
  },
  {
    id: 'fine-tuning',
    term: 'fine-tuning',
    definition:
      'Fine-tuning is continuing to train an already trained model on a smaller dataset for a new task, robot or setting, instead of training from scratch. Vision-language-action models are fine-tuned vision-language models, and OpenVLA can be fine-tuned again for new robots.',
    citations: ['openvla-2024', 'rt2-2023'],
  },
  {
    id: 'zero-shot-transfer',
    term: 'zero-shot',
    definition:
      'Zero-shot means using a trained model in a new setting with no extra training there. Peng et al. moved a pushing policy trained only in simulation to a real arm; RT-2 handled objects and commands absent from its robot data.',
    citations: ['peng-2018', 'rt2-2023'],
  },
  {
    id: 'rollout',
    term: 'rollout',
    definition:
      'A rollout is one run of a policy from a starting state to the end of an episode, with the states, actions and rewards it produced. It can run on a real robot, in a simulator or inside a learned world model.',
    citations: ['sutton-barto-2018', 'dreamer-2019'],
  },
  {
    id: 'transformer',
    term: 'transformer',
    definition:
      'A transformer is a neural network built on attention, which lets each part of an input weigh every other part. Vaswani et al. introduced it for translation in 2017. Language models, VLA models and robot policies such as ACT use it.',
    citations: ['transformer-2017', 'act-aloha-2023'],
  },
  {
    id: 'rrt',
    term: 'rapidly-exploring random tree (RRT)',
    definition:
      'A rapidly-exploring random tree (RRT) is a motion-planning method that grows a tree of safe motions from the start. Each step picks a random point and extends the nearest branch a short step toward it, kept only if collision-free. LaValle introduced it in 1998.',
    citations: ['lavalle-1998', 'lavalle-2006'],
  },
  {
    id: 'prm',
    term: 'probabilistic roadmap (PRM)',
    definition:
      'A probabilistic roadmap (PRM) is a motion-planning method that samples many random collision-free configurations and links nearby ones with short safe paths. The resulting graph can answer many start-goal queries. Kavraki and colleagues published it in 1996.',
    citations: ['kavraki-1996'],
  },
  {
    id: 'lqr',
    term: 'linear quadratic regulator (LQR)',
    definition:
      'The linear quadratic regulator (LQR) is a feedback controller for linear systems whose gains minimize a cost that trades state error against control effort. Kalman worked out the theory in 1960. Iterative LQR (iLQR) reapplies it along a trajectory to control nonlinear robots.',
    citations: ['kalman-1960', 'tedrake-underactuated', 'mujoco-ilqr-2026'],
  },
  {
    id: 'pid-control',
    term: 'PID controller',
    definition:
      'A PID controller sets the actuator command from the error between target and measurement, using three terms: proportional to the error, to its accumulated sum (integral) and to its rate of change (derivative). It dominates industrial process control.',
    citations: ['fbs-2020', 'ziegler-nichols-1942'],
  },
  {
    id: 'imu',
    term: 'inertial measurement unit (IMU)',
    definition:
      'An inertial measurement unit (IMU) is a sensor that measures rotation rate with gyroscopes and acceleration with accelerometers, usually three of each. Integrating its readings tracks motion, but small errors grow quickly, so robots fuse it with cameras or other sensors.',
    citations: ['woodman-inertial-navigation-2007', 'vins-mono-2018'],
  },
  {
    id: 'lidar',
    term: 'lidar',
    definition:
      'Lidar (light detection and ranging) is a sensor that measures distances with pulses of laser light. A scanning lidar sweeps its beams across the surroundings to build a 3D point cloud, which self-driving cars and mobile robots use for mapping and detecting objects.',
    citations: ['noaa-lidar-2026', 'nuscenes-2020', 'fast-lio2-2021'],
  },
  {
    id: 'urdf',
    term: 'URDF',
    definition:
      'URDF (Unified Robot Description Format) is the most common file format for robot models. Its XML lists rigid links, with their mass, inertia, visual shape and collision geometry, and the joints between them, with their type and limits. Simulators and planners load it.',
    citations: ['urdf-dataset-2023'],
  },
  {
    id: 'ros-2',
    term: 'ROS 2',
    definition:
      'ROS 2 (Robot Operating System 2) is open-source middleware for robot software, a ground-up redesign of the original ROS built on the DDS communication standard. Programs run as separate nodes that exchange data through topics, services and actions.',
    citations: ['ros2-science-robotics-2022', 'ros2-dds-design-2014', 'ros2-interfaces-2026'],
  },
  {
    id: 'co-training',
    term: 'co-training',
    definition:
      'Co-training is training one model on several datasets at once, such as a few demonstrations on the target robot plus data from other robots, simulation or the web. Mixing in static ALOHA data raised Mobile ALOHA\'s success rates by up to 90 percent.',
    citations: ['mobile-aloha-2024', 'sim-real-cotraining-2025', 'rt2-2023'],
  },
  {
    id: 'egocentric-video',
    term: 'egocentric video',
    definition:
      'Egocentric video is video recorded from a person\'s own point of view, usually by a head-worn camera, so it shows their hands and the objects they handle. Ego4D holds 3,670 hours of it; EgoScale trains robot hands on such footage.',
    citations: ['ego4d-2022', 'egoscale-2026'],
  },
  {
    id: 'foundation-model',
    term: 'foundation model',
    definition:
      'A foundation model is a large model trained on broad data at scale that can then be adapted, for example by fine-tuning, to many downstream tasks. Bommasani et al. named the category in 2021, with BERT, DALL-E and GPT-3 as examples.',
    citations: ['bommasani-foundation-models-2021'],
  },
  {
    id: 'latent-action',
    term: 'latent action',
    definition:
      'A latent action is a learned code for what changed between two video frames, inferred from video with no recorded actions. Genie learned them from internet video; LAPA pretrains a policy to predict them, then fine-tunes it on robot data to output real actions.',
    citations: ['genie-1-2024', 'lapa-2025'],
  },
  {
    id: 'value-function',
    term: 'value function',
    definition:
      'A value function estimates the total future reward an agent can expect from a state, or from an action in a state, under a policy. Actor-critic methods learn two parts: an actor (the policy) and a critic (a value function scoring the actor\'s choices).',
    citations: ['sutton-barto-2018', 'sac-2018'],
  },
  {
    id: 'kinematic-chain',
    term: 'kinematic chain',
    definition:
      'A kinematic chain is a series of rigid links connected by joints, such as a robot arm. In an open (serial) chain each joint moves every link beyond it. In a closed chain, as in a parallel robot, the links form a loop.',
    citations: ['modern-robotics-2017'],
  },
  {
    id: 'support-polygon',
    term: 'support polygon',
    definition:
      'The support polygon is the ground area enclosed by a legged robot\'s contact points. On flat ground a robot standing still balances only while its center of mass is directly above it; walking controllers often keep the zero moment point inside it instead.',
    citations: ['wieber-legged-robots-2016'],
  },
  {
    id: 'attitude-control',
    term: 'attitude control',
    definition:
      'Attitude control is keeping a vehicle at a chosen orientation: its roll, pitch and yaw. A drone\'s flight controller does it in a fast loop that reads its gyroscopes and adjusts its motors. Spacecraft turn with reaction wheels, magnetic torquers or thrusters.',
    citations: ['px4-controller-diagrams', 'mahony-multirotor-2012', 'nasa-smallsat-gnc-2026'],
  },
  {
    id: 'world-action-model',
    term: 'world action model',
    definition:
      'A world action model, or WAM, is a robot policy, usually built on a pretrained video model, that predicts future video frames and the robot\'s next actions together. DreamZero, NVIDIA\'s GR00T 2 and Runway\'s Praxis-1 are examples.',
    citations: ['nvidia-wam-blog-2026', 'dreamzero-2026', 'gr00t-2-2026', 'runway-praxis-1-2026'],
  },
  {
    id: 'umi',
    term: 'Universal Manipulation Interface (UMI)',
    definition:
      'The Universal Manipulation Interface (UMI) is a handheld gripper for recording demonstrations without a robot. A person uses a 3D-printed gripper carrying a GoPro, software recovers its path from the footage, and the policy runs on arms with a matching gripper and camera.',
    citations: ['umi-2024'],
  },
  {
    id: 'safety-component',
    term: 'safety component',
    definition:
      'In EU product law, a safety component is a part of a product, hardware or software, meant to prevent or reduce risks to health and safety, or whose failure would endanger people. AI used only for convenience or efficiency is not one.',
    citations: ['eu-machinery-regulation-2023', 'eu-ai-omnibus-2026'],
  },
  {
    id: 'differentiable-simulator',
    term: 'differentiable simulator',
    definition:
      'A differentiable simulator is a physics simulator that computes how its results change with its inputs, such as actions or physical parameters. A policy can then improve by gradient descent through the physics; a quadruped policy trained this way transferred to a real robot.',
    citations: ['schwarke-2024', 'shac-2022'],
  },
  {
    id: 'differential-flatness',
    term: 'differential flatness',
    definition:
      'Differential flatness is the property that a few chosen outputs of a system and their derivatives determine all its states and inputs. A quadrotor is flat in position and heading: a smooth path in those four values fixes the required thrust and torques.',
    citations: ['faessler-flatness-2018'],
  },
  {
    id: 'de-novo-pathway',
    term: 'De Novo pathway',
    definition:
      'The De Novo pathway is the FDA\'s route to market for a novel low- or moderate-risk medical device with no legally marketed equivalent. A granted request places the device in class I or II, and later similar devices can cite it as a predicate.',
    citations: ['fda-de-novo-classification-2025', 'cmr-versius-authorization-2024'],
  },
  {
    id: 'rider-only-miles',
    term: 'rider-only miles',
    definition:
      'Rider-only miles are miles a self-driving vehicle covers with no human driver behind the wheel. Waymo measures its safety record against them: 56.7 million in its 2025 peer-reviewed crash study and 271.3 million through June 2026.',
    citations: ['waymo-crash-rates-2025', 'waymo-safety-hub-2026'],
  },
  {
    id: 'stop-gradient',
    term: 'stop-gradient',
    definition:
      'A stop-gradient is an operation in neural-network training that passes a value forward unchanged but blocks the gradient flowing back through it. Knowledge insulation uses one so a VLA\'s action expert cannot disturb its pretrained backbone; BYOL and V-JEPA use one against collapse.',
    citations: ['knowledge-insulation-paper-2025', 'vjepa-2024', 'byol-2020'],
  },
  {
    id: 'inpainting',
    term: 'inpainting',
    definition:
      'Inpainting is filling in the missing part of a signal so it fits the known parts, first done for holes in images. Diffusion models can inpaint while generating: Diffuser plans trajectories this way, and real-time chunking fills each new action chunk around committed actions.',
    citations: ['diffuser-2022', 'real-time-chunking-2025'],
  },
  {
    id: 'wrench',
    term: 'wrench',
    definition:
      'A wrench is a force and a torque on a rigid body stacked into one vector; in 3D, three numbers for the push and three for the twist. Grasp analysis sums the wrenches finger contacts can apply to find which loads a grasp resists.',
    citations: ['murray-li-sastry-1994', 'modern-robotics-2017'],
  },
  {
    id: 'tsdf',
    term: 'truncated signed distance field (TSDF)',
    definition:
      'A truncated signed distance field (TSDF) is a signed-distance field that keeps distances only in a thin band around surfaces and clips them beyond it. Depth images fuse into it quickly, as KinectFusion showed live, but its values are exact only near the surface.',
    citations: ['kinectfusion-2011', 'voxblox-2016'],
  },
  {
    id: 'esdf',
    term: 'Euclidean signed distance field (ESDF)',
    definition:
      'A Euclidean signed distance field (ESDF) is a signed-distance field that holds the true distance to the nearest obstacle everywhere, not only near surfaces. Planners use it to push paths away from obstacles; Voxblox builds one incrementally from a TSDF for drone planning.',
    citations: ['voxblox-2016'],
  },
  {
    id: 'iterated-ekf',
    term: 'iterated extended Kalman filter (iterated EKF)',
    definition:
      'An iterated extended Kalman filter (iterated EKF) is a Kalman filter for nonlinear systems that repeats each measurement update, relinearizing around its newest estimate, until the estimate stops changing. This cuts linearization error. FAST-LIO2 builds its lidar-inertial odometry on one.',
    citations: ['fast-lio2-2021'],
  },
  {
    id: 'zenoh-router',
    term: 'Zenoh router',
    definition:
      'A Zenoh router is a background process that relays discovery information between ROS 2 nodes running the rmw_zenoh middleware. Multicast discovery is off there by default, so the nodes cannot find each other until a router is running.',
    citations: ['rmw-zenoh-readme-2026'],
  },
  {
    id: 'mppi',
    term: 'model predictive path integral (MPPI)',
    definition:
      'Model predictive path integral (MPPI) control is a sampling-based form of model predictive control. It simulates many randomly varied action sequences, averages them with more weight on low-cost ones, applies the start of the result and repeats. It has controlled real legged robots.',
    citations: ['mppi-whole-body-2024'],
  },
  {
    id: 'mmrv',
    term: 'mean maximum rank violation (MMRV)',
    definition:
      'Mean maximum rank violation (MMRV) scores how well a simulator or world model ranks policies the way real tests do. For each policy it finds the worst misordered pair, weighted by their real success gap, then averages; 0 means the ranking is perfect.',
    citations: ['simpler-2024', 'runway-gwm-robotics-eval-2026'],
  },
  {
    id: 'representation-collapse',
    term: 'representation collapse',
    definition:
      'Representation collapse is a failure of self-supervised training in which the encoder maps every input to the same embedding, which predicts itself perfectly but carries no information. V-JEPA resists it with a slowly updated target encoder and a stop-gradient; LeJEPA uses a regularizer instead.',
    citations: ['byol-2020', 'vjepa-2024', 'lejepa-2025'],
  },
  {
    id: 'speculative-contact',
    term: 'speculative contact',
    definition:
      'A speculative contact is one a physics engine sets up before two objects touch, by sweeping a fast-moving object ahead along its path, so thin or fast objects cannot pass through each other within a time step. MuJoCo 4.0 added them in November 2026.',
    citations: ['mujoco-4-2026'],
  },
  {
    id: 'potential-based-shaping',
    term: 'potential-based shaping',
    definition:
      'Potential-based shaping is reward shaping where each step\'s bonus is the change in a chosen function of the state, its potential: the discounted potential of the new state minus the old one\'s. Ng, Harada and Russell proved it leaves the optimal policy unchanged.',
    citations: ['ng-reward-shaping-1999', 'mit-humanoid-rewards-2023'],
  },
  {
    id: 'partial-credit',
    term: 'partial credit',
    definition:
      'Partial credit is scoring a robot trial by how much of the task it finished, not just pass or fail. The 2026 BEHAVIOR Challenge scores each episode by the share of goal conditions met at the end and ranks entries by the average, Q.',
    citations: ['behavior-challenge-evaluation-2026', 'behavior-challenge-2026'],
  },
  {
    id: 'covered-list',
    term: 'Covered List',
    definition:
      'The Covered List is the FCC\'s list of communications equipment and services judged an unacceptable risk to US national security. New listed models cannot get the FCC authorization needed for US sale; in July 2026 the FCC added foreign-produced mobile robots.',
    citations: ['fcc-covered-list-robots-2026'],
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
