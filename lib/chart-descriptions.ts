/**
 * The default-state chart-description registry (VAL-EDU-026).
 *
 * One entry per <ChartDescription> mount in the component tree: the
 * authored takeaway text at the chart's DEFAULT configuration, the source
 * file, and the plotted quantity names. scripts/check-chart-descriptions.ts
 * sweeps the component tree against this registry (wiring + rules), and
 * tests/e2e/chart-description-registry.spec.ts loads every entry's route
 * from the static export and asserts the registry text equals the rendered
 * default-state description innerText, so a stale entry here fails a gate
 * naming the component instead of drifting silently.
 *
 * RESIDUAL LIMIT, stated plainly. The e2e backstop pins the DEFAULT state
 * only. Per-state falsehoods (a clause that is true at the default and a
 * lie after one slider move, the class that produced the three published
 * false claims) are NOT caught by comparing registry text to the DOM:
 * they are caught by DERIVING the varying clause from state at render
 * time inside the component, which is what the components now do. Do not
 * mistake this registry for truth verification; it is drift verification
 * of the default render.
 *
 * Population note: the source sweep in `npm run check-chart-descriptions`
 * derives JSX mounts and component-file counts at run time. The browser
 * spec derives rendered roots from the static export; that population can
 * be larger because mapped subcomponents render multiple roots. This
 * registry is indexed by source mounts, and every entry names the published
 * route that owns its default render.
 */
import type { ChartDescriptionEntry } from './chart-description-rules.ts';

export const CHART_DESCRIPTIONS: ChartDescriptionEntry[] = [
  {
    component: 'ExpoFtResults',
    file: 'components/interactive/expo-ft-results.tsx',
    route: '/manipulation/rl-finetuning/',
    quantityNames: ['successes', 'trials'],
    text: 'On the four shared comparison tasks EXPO-FT completes 30 of 30 trials on every task, against average successes of 18.8 for supervised finetuning, 20.5 for HG-DAgger, 19 for DSRL and 5.5 for HIL-SERL; the same paper notes HIL-SERL is highly reliable in its original evaluations and that this suite randomizes a substantially larger initial-state space, and with extra training samples HIL-SERL reaches 27 of 30 on Cube Pick and 13 of 30 on Pool Shot.',
  },
  {
    component: 'ReliabilityCompounding',
    file: 'components/interactive/reliability-compounding.tsx',
    route: '/frontier/reliability-gap/',
    quantityNames: ['episode success', 'steps'],
    text: 'On the reliability-gap calculator a 95.0 percent per-step policy yields 21.5% episode success at 30 steps and only 0.6% at the 100-step far end, with the 50 percent crossing near step 14.',
  },
  {
    component: 'EgoScaleScaling',
    file: 'components/interactive/egoscale-scaling.tsx',
    route: '/frontier/generalization/',
    quantityNames: ['loss', 'hours'],
    text: 'The generalization prediction-step law panel is seeded past the 100 percent crossing: validation loss still falls from 0.0240 at 1k hours to 0.0150 at 20k hours, but the completion fit is already flagged as impossible at the 250k h horizon rather than drawn through 100 percent.',
  },
  {
    component: 'DataScaleChart',
    file: 'components/interactive/data-scale-chart.tsx',
    route: '/data-hardware/data-bottleneck/',
    quantityNames: ['hours', 'tokens'],
    text: 'Demonstration hours span 350 h (DROID) to 20,854 h (EgoScale) across 6 robot and human datasets, while pretraining tokens span 300B (GPT-3) to 15T (Llama 3), 9 orders of magnitude apart with no honest hour-to-token exchange rate between the lanes; your 10-rig farm at the low-rate hypothetical rate projects 70 h per year, reaching the authored 10,000-hour target in 143 yr and the authored 1,000,000-hour target in 14,286 yr. No OXE hour estimate is supplied or plotted here.',
  },
  {
    component: 'GaitDiagram',
    file: 'components/interactive/gait-diagram.tsx',
    route: '/rl-sim2real/legged-locomotion/',
    unmounted: true,
    quantityNames: ['feet', 'duty'],
    text: 'In the walk, always 3 feet down at duty factor 0.75, and the footfall offsets around the cycle are (LH at 0%, LF at 25%, RH at 50%, RF at 75%); at the current phase of 0% the feet down are RF + LH + RH. The sampled table carries the rendered tick grid exactly: rows at 0%, 25%, 50%, 75% and 100%, the last row being the same instant as the cycle start.',
  },
  {
    component: 'TrainingTimeChart',
    file: 'components/interactive/training-time-chart.tsx',
    route: '/rl-sim2real/parallel-sim-rl/',
    unmounted: true,
    quantityNames: ['wall-clock', 'envs'],
    text: 'Wall-clock to the target reward falls steeply from 3.6 h at 64 envs to 4.0 min at the current 4,096 envs, then flattens toward 1.5 min at 16,384: simulation draws level with the fixed learn-and-transfer costs near 12,500 envs, between the 8,192 and 16,384 stops, and is the larger bucket beyond, and the flat-terrain time bound (under 4 min) is shown at an illustrative 4,096-env position, not a source-established flat-run environment count.',
  },
  {
    component: 'ControlLoopBudget',
    file: 'components/interactive/control-loop-budget.tsx',
    route: '/manipulation/realtime-execution/',
    quantityNames: ['inference', 'ms'],
    text: 'In this toy, the 3.0B coordinate gives 52.6 ms of inference against the 20 ms budget of a 50 Hz loop, missing 2 deadlines and running at 19 Hz; inference stays under budget only below about 1.1B toy parameters. The 3.0B coordinate is deliberately chosen; VLA-Perf models pi0 at 2.7B and pi0-L as hypothetical. All displayed rates are reciprocal toy inference rates, not robot/controller frequencies.',
  },
  {
    component: 'ChunkSizeCurve',
    file: 'components/interactive/chunk-size-curve.tsx',
    route: '/manipulation/action-chunking/',
    quantityNames: ['success', 'chunk'],
    text: 'Task success rises from 1% at chunk size k = 1 to the measured 44% peak at k = 100, and at the current k = 100 the curve reads 44% success against 4 closed-loop decisions per 400-step episode; the dashed region past k = 100 is interpolated beyond the measured ACT ablation, which reports a slight decline at k = 200 and k = 400 without exact numbers.',
  },
  {
    component: 'CompoundingError',
    file: 'components/interactive/compounding-error.tsx',
    route: '/manipulation/bc-foundations/',
    quantityNames: ['deviation', 'steps'],
    text: 'The prediction-step reference panel starts at 240 steps. Its deterministic recurrence with toy error 5.0% gives 1505 units of summed deviation. Dashed curves show illustrative reference curves, epsilon T(T+1)/2 = 1446 and epsilon T = 12.0, not bounds on this trace. This is not a task-cost theorem or a source benchmark.',
  },
  {
    component: 'ExecutionModes',
    file: 'components/interactive/execution-modes.tsx',
    route: '/manipulation/realtime-execution/',
    quantityNames: ['velocity', 'delay'],
    text: 'At 0 ms of inference delay the synchronous velocity trace stops for 0 ms of dead time, while the naive switch reaches a peak velocity step of 0.05 per 20 ms tick and real-time chunking reaches 0.05, both read against the illustrative 0.30 discontinuity-proxy limit; these constructed traces use arbitrary velocity units, not physical jerk or measured robot data. The five-tick linear blend is not RTC inpainting, and the dashed guide is the uninterrupted toy old plan.',
  },
  {
    component: 'ActionTokenization',
    file: 'components/interactive/action-tokenization.tsx',
    route: '/manipulation/vla-models/',
    quantityNames: ['action', 'step'],
    text: 'Along the Δx action lane of the 16-step chunk, the continuous command runs from 0.183 at t = 0 to 0.183 at t = 15, and at the current step 7 the value -0.056 falls in bin 120 of 255; the 7 dashed rules are each dimension\'s zero line, and the chunk is a fixed synthetic example rather than measured robot data.',
  },
  {
    component: 'LatencyComparisonThroughput',
    file: 'components/interactive/latency-comparison.tsx',
    route: '/manipulation/action-chunking/',
    quantityNames: ['throughput', 'delay'],
    text: 'Deterministic toy, not measured throughput: at 0 ms of added delay, the normalized toy scores are 100% for temporal ensembling, marked nominal, and 100% for RTC. The shaded 100 to 200 ms failure window marks the experiment\'s two failed TE settings, not a universal latency threshold. The curve between settings and its continuation beyond +200 ms are illustrative assumptions.',
  },
  {
    component: 'LatencyComparisonTraces',
    file: 'components/interactive/latency-comparison.tsx',
    route: '/manipulation/action-chunking/',
    quantityNames: ['action', 'mode'],
    text: 'Across the 24-tick hand-off at 0 ms of delay the real-time chunking action stays flat on the committed mode at 0.80 while the ensembled action holds within tolerance and ends at 0.80; the shaded band between the two dashed mode lines is the invalid middle no demonstration ever commanded, and those lines are the modelled modes rather than measured actions.',
  },
  {
    component: 'AdvantageScrubber',
    file: 'components/interactive/advantage-scrubber.tsx',
    route: '/manipulation/rl-finetuning/',
    quantityNames: ['value', 'advantage'],
    text: 'At t = 0.0 s this teaching toy shows an arbitrary value score of 30.0 in the Reach segment, tagged high advantage because its score changes by +8.0. The dashed arc links a fictional insertion failure at 32 s to a grasp 20 s earlier. The tinted stage blocks show these fictional stage tags. Its timings, values and stage-difference tags are illustrative, not a measured Recap episode or its reward-inclusive, task-thresholded advantage estimator.',
  },
  {
    component: 'MpcVsRl',
    file: 'components/interactive/mpc-vs-rl.tsx',
    route: '/rl-sim2real/reward-design-mpc/',
    quantityNames: ['deviation', 'step'],
    text: 'After a lateral push at step 4 the MPC base-height deviation peaks at 6.00 cm and ends at 0.02 cm while the RL policy peaks at 8.00 cm and ends at -0.24 cm; MPC compute per step re-solves iLQR against the current state at every control step, the RL policy is one network forward pass, weights fixed at training, and the dashed RL trace is an illustrative teaching model rather than measured hardware data.',
  },
  {
    component: 'FrictionTransfer',
    file: 'components/interactive/friction-transfer.tsx',
    route: '/rl-sim2real/sim2real-transfer/',
    quantityNames: ['friction', 'half-width'],
    text: 'Authored toy, not measured robot data. At selected friction 0.80, the point curve is 97% and the DR curve is 74%. The assumed DR half-width is 0.35 and its plateau is 74%. Its height follows 0.93 minus 0.55 times the half-width; the point Gaussian has center 0.80, peak 0.97 and width 0.09, and the DR tails have width 0.10. Dashed edges mark an assumed range, not a confidence interval. The randomization band is marked ordinary at the selected half-width. Reset restores this panel to friction 0.80 and half-width 0.35. Selecting friction samples the formulas; no training or adaptation runs.',
  },
  {
    component: 'LatentImagination',
    file: 'components/interactive/latent-imagination.tsx',
    route: '/world-models/latent-dynamics/',
    quantityNames: ['deviation', 'step'],
    text: 'In this deterministic toy, latent deviation grows from 0 at step 0 to 0.301 units at the current 15-step horizon under the 2.0% one-step-error input. The shaded band is illustrative, from 3 to 15 steps; it is not a published range, confidence interval, or reliability bound.',
  },
  {
    component: 'LatentImaginationRollout',
    file: 'components/interactive/latent-imagination.tsx',
    route: '/world-models/latent-dynamics/',
    quantityNames: ['latent', 'trajectory'],
    text: 'In this deterministic toy latent rollout view the solid imagined path leaves the dashed true trajectory after the first few steps and has accumulated 0.301 units of toy deviation at t = 15 of 50; that peel illustrates the assumed error recurrence, not measured model drift or a second plot of the same deviation series.',
  },
  {
    component: 'PendulumController',
    file: 'components/interactive/pendulum-controller.tsx',
    route: '/classical/control/',
    quantityNames: ['pole', 'upright'],
    text: 'The prediction-step pole starts at Kp 9.5, under the 9.81 mgl hold threshold, still +12.0 degrees off upright and holding at release so the prompt can be answered before playback.',
  },
  {
    component: 'ImpedanceContactLab',
    file: 'components/interactive/impedance-contact-lab.tsx',
    route: '/classical/control/',
    quantityNames: ['contact', 'limit'],
    text: 'On the torque-controlled arm at depth 2.0 mm, stiffness 800 N/m and damping 40 N·s/m, the contact peaks at 23.7 N and settles at 1.6 N against the 255 N research-basis transient limit: task succeeded.',
  },
  {
    component: 'PerceptionErrorBudget',
    file: 'components/interactive/perception-error-budget.tsx',
    route: '/classical/perception/',
    quantityNames: ['root-sum-of-squares magnitude', 'model band'],
    text: 'At an authored angle of 0.5 degrees and axial distance 0.50 m, the model\'s root-sum-of-squares magnitude is 11.32 mm against its 15 mm comparison band. depth sensing contributes 78% of the sum of squared inputs. Model band: within model band.',
  },
  {
    component: 'SampleEfficiencyLedger',
    file: 'components/interactive/sample-efficiency-ledger.tsx',
    route: '/rl-sim2real/rl-for-robotics/',
    quantityNames: ['wall clock', 'environment steps'],
    text: 'In the constant-rate toy, 158M environment steps take 21.5 min of model wall clock in massively parallel simulation, 82.5 d on one robot and 11.8 d on a fleet of 7. The single-robot-to-simulation duration ratio is 5,530. Their toy bands are on-policy, offline and off-policy; these are editorial categories, not algorithm eligibility.',
  },
  {
    component: 'CollaborativeOperationModes',
    file: 'components/interactive/collaborative-operation-modes.tsx',
    route: '/frontier/safety-and-assurance/',
    quantityNames: ['protective separation distance', 'robot speed'],
    text: 'At 1.00 m/s robot speed and 1.60 m/s operator approach, the protective separation distance is 1.42 m against a 1.60 m workcell: 0.32 m of operator travel, 0.10 m of robot travel before braking, 0.05 m of braking, and 0.95 m of intrusion margin and position uncertainty.',
  },
  {
    component: 'SceneRepresentationLadder',
    file: 'components/interactive/scene-representation-ladder.tsx',
    route: '/classical/scene-representation/',
    quantityNames: ['occupancy', 'voxels'],
    text: 'Stored as an occupancy grid at 20 cm, the same scene costs 2.2 KB across 2,250 voxels, and answers 1 of the 3 queries: free space yes, a contact normal no, a novel view no.',
  },
  {
    component: 'GraspWrenchLabObject',
    file: 'components/interactive/grasp-wrench-lab.tsx',
    route: '/classical/grasp-planning/',
    quantityNames: ['contacts', 'cones'],
    text: '3 frictional contacts on the unit square at mu 0.70 open inward cones of half-angle 35.0 degrees; each contact can push along its cone but cannot pull.',
  },
  {
    component: 'GraspWrenchLabWrench',
    file: 'components/interactive/grasp-wrench-lab.tsx',
    route: '/classical/grasp-planning/',
    quantityNames: ['wrench', 'epsilon'],
    text: 'The grasp wrench hull of 3 contacts currently reports force closure yes with Ferrari-Canny quality epsilon 0.444; that radius is the largest origin-centered wrench ball that still fits inside the hull.',
  },
  {
    component: 'RrtExplorer',
    file: 'components/interactive/rrt-explorer.tsx',
    route: '/classical/motion-planning/',
    quantityNames: ['iteration', 'node'],
    text: 'The RRT tree is at iteration 0 of 288 with 1 node and status tree not started; path length is n/a until a branch first reaches the goal.',
  },
  {
    component: 'PlanarFkArm',
    file: 'components/interactive/planar-fk-arm.tsx',
    route: '/classical/kinematics/',
    quantityNames: ['effector', 'degrees'],
    text: 'With base 110 degrees, elbow -45 degrees and wrist -35 degrees the end effector sits at x +0.45, y +1.89 link units; those three link lengths are 1.00, 0.75 and 0.55.',
  },
  {
    component: 'CompoundingErrorRollout',
    file: 'components/interactive/compounding-error.tsx',
    route: '/manipulation/bc-foundations/',
    quantityNames: ['rollout', 'deviation'],
    text: 'The doubled-horizon figure keeps per-timestep prediction at 5.0 percent error across 240 steps with DAgger off, so the rollout accumulated deviation is 1505 units under the selected toy correction setting.',
  },
  {
    component: 'RecedingHorizon',
    file: 'components/interactive/receding-horizon.tsx',
    route: '/manipulation/diffusion-policy/',
    quantityNames: ['chunks', 'plan'],
    text: 'A receding-horizon plan with T_p 16 and T_a 8 issues 4 chunks across the 32-step window, replanning at 1.25 Hz and committing 0.8 s per plan; solid bars are executed while the outlined 8-step tails are thrown away.',
  },
  {
    component: 'ActionTokenizationBin',
    file: 'components/interactive/action-tokenization.tsx',
    route: '/manipulation/vla-models/',
    quantityNames: ['bin', 'action'],
    text: 'On the Δx axis the continuous action -0.056 at step 7 falls in bin 120 of 255 and reconstructs to -0.0586 with quantization error +0.0025; the 256-bin strip is a uniform grid on [-1, 1], not a learned codebook.',
  },
  {
    component: 'FlowMatchingTrajectory',
    file: 'components/interactive/flow-matching-trajectory.tsx',
    route: '/manipulation/pi-line/',
    quantityNames: ['steps', 'error'],
    text: 'With 10 Euler steps the 48 samples travel near-straight from Gaussian noise toward the two action modes and finish at mean endpoint error 0.05; one step would cut the corner, 50 steps is more compute than a 50 Hz loop can spend.',
  },
  {
    component: 'MotInsulation',
    file: 'components/interactive/mot-insulation.tsx',
    route: '/manipulation/knowledge-insulation/',
    quantityNames: ['backbone', 'expert'],
    text: 'Forward pass at depth 8 of 8 keeps backbone supervision on no gradients (inference), language following at 92 of 100, and the separately reported 7.5x fewer training steps for the π0.5 + KI generalist versus π0 at similar table-bussing performance; the stop-gradient is on so expert gradients stay inside the action expert.',
  },
  {
    component: 'CrossEmbodimentStrategies',
    file: 'components/interactive/cross-embodiment-strategies.tsx',
    route: '/manipulation/cross-embodiment/',
    quantityNames: ['human', 'slots'],
    text: 'Shared relative end-effector space is illustrated with 8 shared slots. N1.7 reports 20K hours of EgoScale human video; EgoScale separately uses wrist deltas, hand joint targets and aligned mid-training. These operations are not implemented by the strips.',
  },
  {
    component: 'HierarchyTimescales',
    file: 'components/interactive/hierarchy-timescales.tsx',
    route: '/manipulation/hierarchical/',
    quantityNames: ['playhead', 'lanes'],
    text: 'π0.5 by Physical Intelligence at playhead 0 ms of 2000 ms has 4 timescale lanes with 1 update fired; the 50 Hz Motor commands lane ticks 50 times (schematic) during one Subtask prediction update at ~1 Hz (schematic).',
  },
  {
    component: 'ContactGeometry',
    file: 'components/interactive/contact-geometry.tsx',
    route: '/rl-sim2real/why-rl-locomotion/',
    quantityNames: ['error', 'tolerance'],
    text: 'Locomotion at 2.0 mm of injected contact-model error stays stable with all 4 feet loaded inside the 20 mm dashed tolerance band; the near-point contacts remain recoverable with 18.0 mm of margin left inside that gait-scale band.',
  },
  {
    component: 'TeacherStudent',
    file: 'components/interactive/teacher-student.tsx',
    route: '/rl-sim2real/sim2real-transfer/',
    quantityNames: ['terrain', 'degradation'],
    text: 'At 15 percent proprioceptive degradation the student reconstruction of the teacher terrain sits at 0.01 m MAE with action divergence 0.02, and 3 of 24 input channels are already dashed-occluded; the three stacked panels are the privileged heightfield, the proprioceptive history, and that reconstruction.',
  },
  {
    component: 'WbcDecomposition',
    file: 'components/interactive/wbc-decomposition.tsx',
    route: '/rl-sim2real/humanoid-wbc/',
    quantityNames: ['layers', 'actuators'],
    text: 'Motion-tracking RL, represented by Figure Helix 02 S0, stacks 3 control layers ending at a 1000 Hz S0 actuator loop; the lime bar marks the layer that talks to the actuators, and the retargeted human motion is the interface so layers above never name a torque.',
  },
  {
    component: 'PerceptionLatency',
    file: 'components/interactive/perception-latency.tsx',
    route: '/adjacent/drones/',
    quantityNames: ['latency', 'speed'],
    text: 'At 70 ms of perception latency and 25 m/s² lateral agility the sense-and-avoid timeline supports a maximum speed of 19.21 m/s: 70 ms is lost before control acts, 346 ms is the avoidance maneuver, and the remaining dashed margin still reaches the obstacle at 416 ms time to contact.',
  },
  {
    component: 'AppearancePhysicsPush',
    file: 'components/interactive/appearance-physics-push.tsx',
    route: '/world-models/generative-sim/',
    quantityNames: ['picture', 'push'],
    text: 'With only the picture, a push of 4 newtons leaves the mug at 0 centimetres: a picture has no shape, weight or friction for a solver to push against.',
  },
  {
    component: 'PiGenerationTimeline',
    file: 'components/interactive/pi-generation-timeline.tsx',
    route: '/manipulation/pi-line/',
    quantityNames: ['generations', 'weights'],
    text: 'The π line contains 7 generations, with established source months from Oct 2024 to Apr 2026. MEM has no established month and is not plotted. The divider after π0.5 marks the pinned checkpoint catalogue, not licensing; selected now is π0 (PaliGemma 3B + 300M action expert, weights downloadable) and 4 other entries have unverified availability.',
  },
  {
    component: 'GeneralistReleaseTimeline',
    file: 'components/interactive/generalist-release-timeline.tsx',
    route: '/manipulation/generalist-policies/',
    quantityNames: ['policy records', 'weight availability'],
    text: '13 of 13 selected generalist policy records are shown; selected is Helix from Figure (not disclosed, lab blog, vendor-reported) and weight availability is stated by each node label; dim nodes do not establish closed licensing.',
  },
  {
    component: 'JepaPlanning',
    file: 'components/interactive/jepa-planning.tsx',
    route: '/world-models/jepa/',
    quantityNames: ['latent', 'distance'],
    text: 'With 24 options tried each step, the current latent sits 0.443 from the pick goal after 2 planning steps, 55% of the starting distance of 0.813; the plane shows the walked path and the fan of 24 tried moves, and the distance strip falls from 100% to 55%.',
  },
  {
    component: 'ActionConditioning',
    file: 'components/interactive/action-conditioning.tsx',
    route: '/world-models/generative-video/',
    quantityNames: ['sensitivity', 'realism'],
    text: 'With a model that listens to the action, push left and lift gripper lead to different futures across 4 imagined frames: action sensitivity is 0.419, above the 0.30 threshold, while visual realism stays 0.91 for both models.',
  },
  {
    component: 'RewardShaping',
    file: 'components/interactive/reward-shaping.tsx',
    route: '/rl-sim2real/reward-design-mpc/',
    quantityNames: ['reward terms', 'total'],
    text: 'The 12 weighted reward terms give an illustrative total of -5.52 per step, and the preview is a balanced trot: neither torque 0.8 nor air time 0.6 clears the 2.5 attractor bar and 2x the 1.0 velocity-tracking weight together, so the chosen rule draws a trot instead of freezing, prancing, or chattering.',
  },
  {
    component: 'WmDisambiguator',
    file: 'components/interactive/wm-disambiguator.tsx',
    route: '/world-models/taxonomy/',
    quantityNames: ['latent', 'reward'],
    text: 'Latent dynamics (Dreamer-style), one of 3 groups out of 6 that imagine a compressed summary, predicts the next latent, a reward and a continue signal, and draws pictures only during training; of the 4 uses, it serves policy learning.',
  },
  {
    component: 'DeploymentEconomics',
    file: 'components/interactive/deployment-economics.tsx',
    route: '/data-hardware/industrial-deployment/',
    quantityNames: ['months', 'jam-clearing'],
    text: 'Months to pay back rise with jam-clearing time. At 99% per-pick success they go from 11.8 months with 15-second clearing to 17.3 months with 300-second clearing; at 99.9% they reach 12.1 months at 300 seconds. The current case pays back in 11.6 months.',
  },
];
