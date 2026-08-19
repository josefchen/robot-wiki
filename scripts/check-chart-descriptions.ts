/**
 * Chart-description enforcement gate (VAL-EDU-026).
 *
 * Wired into validate:content beside the existing checkers. Two halves:
 *
 * 1. Wiring check: every component file in the registry below must import
 *    ChartDescription from the primitive and render it. A retrofitted
 *    chart whose description was deleted fails here, naming the file.
 *
 * 2. Rule check: the authored default-state takeaway for every registered
 *    chart must pass the four mechanical rules in
 *    lib/chart-description-rules.ts (two digit-bearing tokens, both plotted
 *    quantity names, no banned opener, cross-chart uniqueness after digit
 *    normalisation).
 *
 * The registry of default texts lives here, not in the components, because
 * the gate runs under Node (prebuild, no bundler) and the components build
 * their live descriptions from props and state at render time. Keep a
 * component's entry text in sync with its default render BY HAND: nothing
 * downstream catches a drift. The VAL-EDU-023/024 e2e checks compare the
 * rendered description against the chart's own DOM (structure, control
 * tracking, restore-to-default) and never read this registry, and their
 * population is a 16-chart subset of these entries, so a stale entry here
 * passes every gate. The GeneralistReleaseTimeline entry drifted one
 * release (registry "Apr 2026" against a rendered "Jul 2026") and nothing
 * failed anywhere; caught by hand and fixed 2026-08-19.
 *
 * Exits non-zero on any finding. Proved by mutation in the feature
 * handoff: removed description, banned opener, one-digit description and
 * a digit-normalised duplicate each fail the gate naming the component,
 * and the restored tree passes.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  validateChartDescriptionCoverage,
  validateChartDescriptions,
  type ChartDescriptionEntry,
  type ChartMountCount,
} from '../lib/chart-description-rules.ts';

/**
 * Default-state takeaways at each chart's default configuration, exactly
 * as the component renders them (verified in a browser; see the feature
 * handoff). No check asserts this text against the rendered DOM: the
 * chart-descriptions e2e spec validates the rendered description against
 * the chart itself, never against this registry. Entries stay honest only
 * by re-verifying the default render whenever a component or its data
 * module changes.
 */
export const CHART_DESCRIPTIONS: ChartDescriptionEntry[] = [
  {
    component: 'ReliabilityCompounding',
    file: 'components/interactive/reliability-compounding.tsx',
    quantityNames: ['episode success', 'steps'],
    text: 'At 95.0 percent per-step success, episode success is 21.5% at 30 steps and 0.6% at the 100-step end of the plotted range, crossing 50 percent at 14 steps as the per-step odds compound over the episode length.',
  },
  {
    component: 'EgoScaleScaling',
    file: 'components/interactive/egoscale-scaling.tsx',
    quantityNames: ['loss', 'hours'],
    text: 'Validation loss falls from 0.0240 at 1k hours to 0.0150 at 20k hours, the end of the measured range, while task completion rises from 0.30 to 0.71; past that boundary the dashed extrapolation to the 100k h horizon reads 0.0102 if the law holds against 0.0150 at the plateau, the shaded scenario band between them is a scenario bracket and not a confidence interval, the completion fit stays below the 90 percent solved bar until 111k hours, and it exceeds 100 percent past 250k hours, which the chart flags instead of drawing.',
  },
  {
    component: 'DataScaleChart',
    file: 'components/interactive/data-scale-chart.tsx',
    quantityNames: ['hours', 'tokens'],
    text: 'Demonstration hours span 350 h (DROID) to 20,854 h (EgoScale) across 7 robot and human datasets, while pretraining tokens span 300B (GPT-3) to 15T (Llama 3), 9 orders of magnitude apart with no honest hour-to-token exchange rate between the lanes; your 15-rig farm at the dedicated farm rate projects 15,000 h per year, reaching OXE scale in 8 mo and 100x OXE in 66.7 yr.',
  },
  {
    component: 'GaitDiagram',
    file: 'components/interactive/gait-diagram.tsx',
    quantityNames: ['feet', 'duty'],
    text: 'In the walk, always 3 feet down at duty factor 0.75, and the footfall offsets around the cycle are (LH at 0%, LF at 25%, RH at 50%, RF at 75%); at the current phase of 0% the feet down are RF + LH + RH.',
  },
  {
    component: 'TrainingTimeChart',
    file: 'components/interactive/training-time-chart.tsx',
    quantityNames: ['wall-clock', 'envs'],
    text: 'Wall-clock to the target reward falls steeply from 3.6 h at 64 envs to 4.0 min at the current 4,096 envs, then flattens toward 1.5 min at 16,384: simulation draws level with the fixed learn-and-transfer costs near 12,500 envs, between the 8,192 and 16,384 stops, and is the larger bucket beyond, and the Rudin flat-terrain measurement (under 4 min) sits at 4,096 envs.',
  },
  {
    component: 'ControlLoopBudget',
    file: 'components/interactive/control-loop-budget.tsx',
    quantityNames: ['inference', 'ms'],
    text: 'A 3.0B-parameter model takes 52.6 ms of inference against the 20 ms budget of a 50 Hz loop, missing 2 deadlines and running at 19 Hz; inference stays under budget only below about 1.1B parameters, and beyond the pi0 3B and pi0-L 9.1B measured anchors the scaling is modeled rather than measured.',
  },
  {
    component: 'KalmanTracker',
    file: 'components/interactive/kalman-tracker.tsx',
    quantityNames: ['estimate', 'position'],
    text: "Over the 61-step window ending at step 60, the estimate stays within 0.90 units rms of the true path while roughly one reading in five drops out, and the shaded band is the filter's own plus or minus two sigma position uncertainty under the assumed noise levels (sigma q 0.20, sigma r 1.00), not a measured error bar, so it swells wherever the estimate coasted between fixes.",
  },
  {
    component: 'ChunkSizeCurve',
    file: 'components/interactive/chunk-size-curve.tsx',
    quantityNames: ['success', 'chunk'],
    text: 'Task success rises from 1% at chunk size k = 1 to the measured 44% peak at k = 100, and at the current k = 100 the curve reads 44% success against 4 closed-loop decisions per 400-step episode; the dashed region past k = 100 is interpolated beyond the measured ACT ablation, which reports a slight decline at k = 200 and k = 400 without exact numbers.',
  },
  {
    component: 'CompoundingError',
    file: 'components/interactive/compounding-error.tsx',
    quantityNames: ['deviation', 'horizon'],
    text: 'With per-step error 5.0% over a 120-step horizon, the simulated accumulated deviation reaches 370 units against the quadratic epsilon T(T+1)/2 bound of 363 and the linear epsilon T bound of 6.0; the two dashed curves are the analytic regret bounds from the DAgger analysis and the solid curve is a simulated rollout, not measured robot data.',
  },
  {
    component: 'ExecutionModes',
    file: 'components/interactive/execution-modes.tsx',
    quantityNames: ['velocity', 'delay'],
    text: 'At 0 ms of inference delay the synchronous velocity trace stops for 0 ms of dead time, while the naive switch reaches a peak velocity step of 0.05 per 20 ms tick and real-time chunking reaches 0.05, both read against the illustrative 0.30 limit; the three traces model the published behaviour and are not measured robot data, and the dashed guide is the uninterrupted old plan each executed trace departs from.',
  },
  {
    component: 'ActionTokenization',
    file: 'components/interactive/action-tokenization.tsx',
    quantityNames: ['action', 'step'],
    text: 'Along the Δx action lane of the 16-step chunk, the continuous command runs from 0.183 at t = 0 to 0.183 at t = 15, and at the current step 7 the value -0.056 falls in bin 120 of 255; the 7 dashed rules are each dimension\'s zero line, and the chunk is a fixed synthetic example rather than measured robot data.',
  },
  {
    component: 'LatencyComparisonThroughput',
    file: 'components/interactive/latency-comparison.tsx',
    quantityNames: ['throughput', 'delay'],
    text: 'At 0 ms of injected delay temporal ensembling holds 100% of task throughput and real-time chunking holds 100%, and ensembling falls to zero across the shaded 100 to 200 ms failure window the paper documents; the two curves are a qualitative model of the published results and not a re-run of the experiment, so the shape carries the claim rather than the exact percentages.',
  },
  {
    component: 'LatencyComparisonTraces',
    file: 'components/interactive/latency-comparison.tsx',
    quantityNames: ['action', 'mode'],
    text: 'Across the 24-tick hand-off at 0 ms of delay the real-time chunking action stays flat on the committed mode at 0.80 while the ensembled action holds within tolerance and ends at 0.80; the shaded band between the two dashed mode lines is the invalid middle no demonstration ever commanded, and those lines are the modelled modes rather than measured actions.',
  },
  {
    component: 'AdvantageScrubber',
    file: 'components/interactive/advantage-scrubber.tsx',
    quantityNames: ['value', 'advantage'],
    text: 'At t = 0.0 s the value trace sits at 30.0 inside the Reach segment, tagged high advantage because value changes by +8.0 across that stage; the dashed arc is the credit-assignment link that blames the insertion failure at 32 s on the grasp 20 s earlier, and the tinted stage blocks are an illustrative Recap tagging of this espresso episode rather than measured value-function output.',
  },
  {
    component: 'MpcVsRl',
    file: 'components/interactive/mpc-vs-rl.tsx',
    quantityNames: ['deviation', 'step'],
    text: 'After a lateral push at step 4 the MPC base-height deviation peaks at 6.00 cm and ends at 0.02 cm while the RL policy peaks at 8.00 cm and ends at -0.24 cm; MPC compute per step re-solves iLQR against the current state at every control step, the RL policy is one network forward pass, weights fixed at training, and the dashed RL trace is an illustrative teaching model rather than measured hardware data.',
  },
  {
    component: 'FrictionTransfer',
    file: 'components/interactive/friction-transfer.tsx',
    quantityNames: ['success', 'friction'],
    text: 'At real-robot friction 0.80 the point-trained policy scores 97% against the DR policy\'s 74%, with the DR plateau at 74% across the shaded training band of half-width 0.35; the two dashed edges mark that assumed randomization range, not a confidence interval, and both success curves are an illustrative model of the peak-versus-width trade.',
  },
  {
    component: 'LatentImagination',
    file: 'components/interactive/latent-imagination.tsx',
    quantityNames: ['deviation', 'step'],
    text: 'Latent deviation grows from 0 at step 0 to 0.301 units at the current 15-step horizon under 2.0% one-step error, compounding rather than staying flat; the shaded band marks the published 3 to 15 step range used by TD-MPC2 and DreamerV3, a practice bracket rather than a measured confidence interval.',
  },
  {
    component: 'LatentImaginationRollout',
    file: 'components/interactive/latent-imagination.tsx',
    quantityNames: ['latent', 'trajectory'],
    text: 'In the latent rollout view the solid imagined path leaves the dashed true trajectory after the first few steps and finishes 0.301 units away at t = 15 of 50; that peel is the visual form of one-step error compounding, not a second plot of the same deviation series.',
  },
  {
    component: 'PendulumController',
    file: 'components/interactive/pendulum-controller.tsx',
    quantityNames: ['angle', 'torque'],
    text: 'Default gains Kp 25.0, Ki 0.0 and Kd 3.0 leave the lab pole holding at release at +12.0 degrees with torque -5.2 N·m; angle and status stay frozen until Run or Push.',
  },
  {
    component: 'GraspWrenchLabObject',
    file: 'components/interactive/grasp-wrench-lab.tsx',
    quantityNames: ['contacts', 'cones'],
    text: '3 frictional contacts on the unit square at mu 0.70 open inward cones of half-angle 35.0 degrees; each contact can push along its cone but cannot pull.',
  },
  {
    component: 'GraspWrenchLabWrench',
    file: 'components/interactive/grasp-wrench-lab.tsx',
    quantityNames: ['wrench', 'epsilon'],
    text: 'The grasp wrench hull of 3 contacts currently reports force closure yes with Ferrari-Canny quality epsilon 0.444; that radius is the largest origin-centered wrench ball that still fits inside the hull.',
  },
  {
    component: 'RrtExplorer',
    file: 'components/interactive/rrt-explorer.tsx',
    quantityNames: ['iteration', 'node'],
    text: 'The RRT tree is at iteration 0 of 288 with 1 node and status tree not started; path length is n/a until a branch first reaches the goal.',
  },
  {
    component: 'PlanarFkArm',
    file: 'components/interactive/planar-fk-arm.tsx',
    quantityNames: ['effector', 'degrees'],
    text: 'With base 110 degrees, elbow -45 degrees and wrist -35 degrees the end effector sits at x +0.45, y +1.89 link units; those three link lengths are 1.00, 0.75 and 0.55.',
  },
  {
    component: 'CompoundingErrorRollout',
    file: 'components/interactive/compounding-error.tsx',
    quantityNames: ['rollout', 'deviation'],
    text: 'Per-timestep prediction at 5.0 percent per-step error over 120 steps, DAgger relabeling off, leaves the rollout drifting from the demonstrated path with accumulated deviation 370 units.',
  },
  {
    component: 'DenoisingLoop',
    file: 'components/interactive/denoising-loop.tsx',
    quantityNames: ['step', 'mode'],
    text: 'At denoising step 0 of 10 the 60-sample cloud is pure Gaussian noise, mean distance to mode 1.79; DDIM inference is pulling mass toward the two target crosses.',
  },
  {
    component: 'RecedingHorizon',
    file: 'components/interactive/receding-horizon.tsx',
    quantityNames: ['chunks', 'plan'],
    text: 'A receding-horizon plan with T_p 16 and T_a 8 issues 4 chunks across the 32-step window, replanning at 1.25 Hz and committing 0.8 s per plan; solid bars are executed, outlined tails are thrown away.',
  },
  {
    component: 'ActionTokenizationBin',
    file: 'components/interactive/action-tokenization.tsx',
    quantityNames: ['bin', 'action'],
    text: 'On the Δx axis the continuous action -0.056 at step 7 falls in bin 120 of 255 and reconstructs to -0.0586 with quantization error +0.0025; the 256-bin strip is a uniform grid on [-1, 1], not a learned codebook.',
  },
  {
    component: 'FlowMatchingTrajectory',
    file: 'components/interactive/flow-matching-trajectory.tsx',
    quantityNames: ['steps', 'error'],
    text: 'With 10 Euler steps the 48 samples travel near-straight from Gaussian noise toward the two action modes and finish at mean endpoint error 0.05; one step would cut the corner, 50 steps is more compute than a 50 Hz loop can spend.',
  },
  {
    component: 'MotInsulation',
    file: 'components/interactive/mot-insulation.tsx',
    quantityNames: ['backbone', 'expert'],
    text: 'Forward pass at depth 8 of 8 keeps backbone supervision on no gradients (inference), language following at 92 of 100, and the measured 7.5x fewer training steps vs pi0; the stop-gradient is on so expert gradients stay inside the action expert.',
  },
  {
    component: 'CrossEmbodimentStrategies',
    file: 'components/interactive/cross-embodiment-strategies.tsx',
    quantityNames: ['human', 'slot'],
    text: 'Padded shared vector leaves human video unable to enter this space directly: the 32-slot strips zero-pad unused dims on each of the 4 bodies and leave the human hand with no slot at all.',
  },
  {
    component: 'HierarchyTimescales',
    file: 'components/interactive/hierarchy-timescales.tsx',
    quantityNames: ['playhead', 'lanes'],
    text: 'π0.5 by Physical Intelligence at playhead 0 ms of 2000 ms has 4 timescale lanes with 1 update fired; the 50 Hz Motor commands lane ticks 50 times per 1000 ms Subtask prediction update.',
  },
  {
    component: 'ContactGeometry',
    file: 'components/interactive/contact-geometry.tsx',
    quantityNames: ['error', 'tolerance'],
    text: 'Locomotion at 2.0 mm of injected contact-model error stays stable with all 4 feet loaded inside the 20 mm dashed tolerance band; the near-point contacts remain recoverable because 2.0 mm sits well under that gait-scale band.',
  },
  {
    component: 'TeacherStudent',
    file: 'components/interactive/teacher-student.tsx',
    quantityNames: ['terrain', 'degradation'],
    text: 'At 15 percent proprioceptive degradation the student reconstruction of the teacher terrain sits at 0.01 m MAE with action divergence 0.02, and 3 of 24 input channels are already dashed-occluded; the three stacked panels are the privileged heightfield, the proprioceptive history, and that reconstruction.',
  },
  {
    component: 'WbcDecomposition',
    file: 'components/interactive/wbc-decomposition.tsx',
    quantityNames: ['layers', 'actuators'],
    text: 'Motion-tracking RL, represented by Figure Helix 02 S0, stacks 3 control layers ending at a 1000 Hz S0 actuator loop; amber marks the layer that talks to the actuators, and the retargeted human motion is the interface so layers above never name a torque.',
  },
  {
    component: 'PerceptionLatency',
    file: 'components/interactive/perception-latency.tsx',
    quantityNames: ['latency', 'speed'],
    text: 'At 70 ms of perception latency and 25 m/s² lateral agility the sense-and-avoid timeline supports a maximum speed of 19.21 m/s: 70 ms is lost before control acts, 346 ms is the avoidance maneuver, and the remaining dashed margin still reaches the obstacle at 416 ms time to contact.',
  },
  {
    component: 'AppearancePhysicsPush',
    file: 'components/interactive/appearance-physics-push.tsx',
    quantityNames: ['appearance', 'displacement'],
    text: 'Appearance is on and simulation is on, physics proxy is off, so a 4.0 N push leaves the mug at 0.0 cm of displacement; the pixels have no mass until the physics proxy supplies a collision hull.',
  },
  {
    component: 'PiGenerationTimeline',
    file: 'components/interactive/pi-generation-timeline.tsx',
    quantityNames: ['generations', 'weights'],
    text: 'The π line places 7 generations from Oct 2024 to Apr 2026, with the dashed divider after π0.5 marking where openpi stops; selected now is π0 (PaliGemma 3B + 300M action expert, open weights) and 4 later generations are closed.',
  },
  {
    component: 'GeneralistReleaseTimeline',
    file: 'components/interactive/generalist-release-timeline.tsx',
    quantityNames: ['policies', 'weights'],
    text: '13 of 13 generalist policies sit on a Feb 2025 to Jul 2026 axis; selected is Helix from Figure (closed, lab blog, vendor-reported) and amber nodes mark open weights while dim nodes mark closed ones.',
  },
  {
    component: 'JepaPlanning',
    file: 'components/interactive/jepa-planning.tsx',
    quantityNames: ['latent', 'distance'],
    text: 'At a search budget of 24 sequences the current latent sits 0.813 away from the pick goal after 0 planning steps; the embedding-space plane still shows the start and goal as two points, and the distance strip is a single sample at step 0.',
  },
  {
    component: 'ActionConditioning',
    file: 'components/interactive/action-conditioning.tsx',
    quantityNames: ['sensitivity', 'realism'],
    text: 'Under strong conditioning, push left and lift gripper diverge across 4 predicted frames from the shared initial pose; action sensitivity is 0.419 against the 0.30 threshold while visual realism stays 0.91 in both modes.',
  },
  {
    component: 'RewardShaping',
    file: 'components/interactive/reward-shaping.tsx',
    quantityNames: ['weights', 'total'],
    text: 'The 12 reward weights sum to a total of -5.52 per step, and the preview is a balanced trot: neither torque 0.8 nor air time 0.6 clears the 2.5 attractor bar and 2x the 1.0 velocity-tracking weight together, so the quadruped tracks velocity instead of freezing, prancing, or chattering.',
  },
  {
    component: 'WmDisambiguator',
    file: 'components/interactive/wm-disambiguator.tsx',
    quantityNames: ['latent', 'reward'],
    text: 'Latent-dynamics (Dreamer-style) predicts the next latent, a reward of 0.83 and a continue flag of 1, plus a fuzzy decoded frame used at training only; of the 4 uses, only policy learning is lit.',
  },
];

const ruleProblems = validateChartDescriptions(CHART_DESCRIPTIONS);

const root = join(import.meta.dirname, '..');

/**
 * The primitive's own definition and the barrel that re-exports it are not
 * mounts; every other component file that renders `<ChartDescription>` is
 * part of the population whether or not anyone remembered to register it.
 */
const NON_MOUNT_FILES = new Set([
  'components/ui/chart-description.tsx',
  'components/ui/index.ts',
]);

/**
 * Word-boundary JSX check: "<ChartDescription" followed by whitespace, ">"
 * or "/>", so a renamed tag like <ChartDescriptionDisabled> does not
 * satisfy the sweep (the primitive feature's mutation proof caught exactly
 * that hole).
 */
const MOUNT_PATTERN = /<ChartDescription(?=[\s>/])/g;

function sweepMounts(dir: string): ChartMountCount[] {
  const found: ChartMountCount[] = [];
  const walk = (absolute: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      const file = relative(root, child).split(sep).join('/');
      if (NON_MOUNT_FILES.has(file)) continue;
      const mounts = (readFileSync(child, 'utf8').match(MOUNT_PATTERN) ?? [])
        .length;
      if (mounts > 0) found.push({ file, mounts });
    }
  };
  walk(dir);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

const mounts = sweepMounts(join(root, 'components'));

// Coverage check over the DERIVED population: an unregistered mount is a
// loud failure naming its file, and a registered file that lost its mount
// (the VAL-EDU-026(a) deleted-description mutation) fails the same way.
const coverageProblems = validateChartDescriptionCoverage(
  mounts,
  CHART_DESCRIPTIONS,
);

// Registered files must still exist; a stale path would otherwise report
// only as "renders no mount", which reads as a deleted description rather
// than a moved file.
const missingFiles = CHART_DESCRIPTIONS.filter(
  (entry) => !existsSync(join(root, entry.file)),
).map((entry) => ({
  component: entry.component,
  message: `${entry.file} does not exist`,
}));

const problems = [...ruleProblems, ...coverageProblems, ...missingFiles];
if (problems.length > 0) {
  console.error(`chart-descriptions: FAILED (${problems.length} finding(s))`);
  for (const p of problems) console.error(`  ${p.component}: ${p.message}`);
  process.exit(1);
}
const mountTotal = mounts.reduce((sum, m) => sum + m.mounts, 0);
console.log(
  `chart-descriptions: OK (${mountTotal} <ChartDescription> mount(s) swept from ${mounts.length} component file(s); all covered by ${CHART_DESCRIPTIONS.length} registered description(s) passing the five rules)`,
);
