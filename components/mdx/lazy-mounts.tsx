'use client';

import dynamic from 'next/dynamic';

/**
 * Lazily loaded client components for article MDX.
 *
 * Each export wraps one client component in `next/dynamic`. The calls live
 * in this Client Component module on purpose: the Next.js lazy-loading
 * guide notes that a Server Component dynamically importing a Client
 * Component is not code split, while an `import()` inside a Client
 * Component becomes its own chunk. Articles reach these wrappers through
 * components/mdx/article-mounts.tsx (lib/recma-lazy-mounts.mjs rewrites
 * their widget imports there), so an article downloads only the widgets it
 * renders instead of one chunk holding every widget on the site.
 *
 * `ssr` stays on and no `loading` component is declared, so there is no
 * Suspense fallback: prerendering waits for the module and writes the same
 * markup an eager import would, the server preloads the chunk from the
 * page head, and hydration picks the component up once it arrives. The
 * server HTML stays in place meanwhile, so nothing shifts.
 *
 * One entry per module: the loader must name its import literally (the
 * bundler cannot split a computed specifier). tests/unit/article-mounts.test.ts
 * checks that every widget in components/interactive/ has an entry here
 * whose specifier and export name match the module it wraps.
 */

export const ActionConditioning = dynamic(() =>
  import('@/components/interactive/action-conditioning').then((m) => m.ActionConditioning),
);
export const ActionTokenization = dynamic(() =>
  import('@/components/interactive/action-tokenization').then((m) => m.ActionTokenization),
);
export const AdvantageScrubber = dynamic(() =>
  import('@/components/interactive/advantage-scrubber').then((m) => m.AdvantageScrubber),
);
export const AppearancePhysicsPush = dynamic(() =>
  import('@/components/interactive/appearance-physics-push').then((m) => m.AppearancePhysicsPush),
);
export const ChunkSizeCurve = dynamic(() =>
  import('@/components/interactive/chunk-size-curve').then((m) => m.ChunkSizeCurve),
);
export const CollaborativeOperationModes = dynamic(() =>
  import('@/components/interactive/collaborative-operation-modes').then((m) => m.CollaborativeOperationModes),
);
export const ComparisonMatrix = dynamic(() =>
  import('@/components/interactive/comparison-matrix').then((m) => m.ComparisonMatrix),
);
export const CompoundingError = dynamic(() =>
  import('@/components/interactive/compounding-error').then((m) => m.CompoundingError),
);
export const ContactGeometry = dynamic(() =>
  import('@/components/interactive/contact-geometry').then((m) => m.ContactGeometry),
);
export const ControlLoopBudget = dynamic(() =>
  import('@/components/interactive/control-loop-budget').then((m) => m.ControlLoopBudget),
);
export const CrossEmbodimentStrategies = dynamic(() =>
  import('@/components/interactive/cross-embodiment-strategies').then((m) => m.CrossEmbodimentStrategies),
);
export const DataScaleChart = dynamic(() =>
  import('@/components/interactive/data-scale-chart').then((m) => m.DataScaleChart),
);
export const DatasetTable = dynamic(() =>
  import('@/components/interactive/dataset-table').then((m) => m.DatasetTable),
);
export const DenoisingLoop = dynamic(() =>
  import('@/components/interactive/denoising-loop').then((m) => m.DenoisingLoop),
);
export const DeploymentDashboard = dynamic(() =>
  import('@/components/interactive/deployment-dashboard').then((m) => m.DeploymentDashboard),
);
export const DeploymentEconomics = dynamic(() =>
  import('@/components/interactive/deployment-economics').then((m) => m.DeploymentEconomics),
);
export const EgoScaleScaling = dynamic(() =>
  import('@/components/interactive/egoscale-scaling').then((m) => m.EgoScaleScaling),
);
export const EurekaLoop = dynamic(() =>
  import('@/components/interactive/eureka-loop').then((m) => m.EurekaLoop),
);
export const ExecutionModes = dynamic(() =>
  import('@/components/interactive/execution-modes').then((m) => m.ExecutionModes),
);
export const ExpoFtResults = dynamic(() =>
  import('@/components/interactive/expo-ft-results').then((m) => m.ExpoFtResults),
);
export const FlowMatchingTrajectory = dynamic(() =>
  import('@/components/interactive/flow-matching-trajectory').then((m) => m.FlowMatchingTrajectory),
);
export const FrictionTransfer = dynamic(() =>
  import('@/components/interactive/friction-transfer').then((m) => m.FrictionTransfer),
);
export const GaitDiagram = dynamic(() =>
  import('@/components/interactive/gait-diagram').then((m) => m.GaitDiagram),
);
export const GeneralistReleaseTimeline = dynamic(() =>
  import('@/components/interactive/generalist-release-timeline').then((m) => m.GeneralistReleaseTimeline),
);
export const GraspWrenchLab = dynamic(() =>
  import('@/components/interactive/grasp-wrench-lab').then((m) => m.GraspWrenchLab),
);
export const HandComparison = dynamic(() =>
  import('@/components/interactive/hand-comparison').then((m) => m.HandComparison),
);
export const HardwareGuide = dynamic(() =>
  import('@/components/interactive/hardware-guide').then((m) => m.HardwareGuide),
);
export const HierarchyTimescales = dynamic(() =>
  import('@/components/interactive/hierarchy-timescales').then((m) => m.HierarchyTimescales),
);
export const ImpedanceContactLab = dynamic(() =>
  import('@/components/interactive/impedance-contact-lab').then((m) => m.ImpedanceContactLab),
);
export const JepaPlanning = dynamic(() =>
  import('@/components/interactive/jepa-planning').then((m) => m.JepaPlanning),
);
export const KalmanTracker = dynamic(() =>
  import('@/components/interactive/kalman-tracker').then((m) => m.KalmanTracker),
);
export const LatencyComparison = dynamic(() =>
  import('@/components/interactive/latency-comparison').then((m) => m.LatencyComparison),
);
export const LatentImagination = dynamic(() =>
  import('@/components/interactive/latent-imagination').then((m) => m.LatentImagination),
);
export const MilestonesWatchlist = dynamic(() =>
  import('@/components/interactive/milestones-watchlist').then((m) => m.MilestonesWatchlist),
);
export const MotInsulation = dynamic(() =>
  import('@/components/interactive/mot-insulation').then((m) => m.MotInsulation),
);
export const MpcVsRl = dynamic(() =>
  import('@/components/interactive/mpc-vs-rl').then((m) => m.MpcVsRl),
);
export const PendulumController = dynamic(() =>
  import('@/components/interactive/pendulum-controller').then((m) => m.PendulumController),
);
export const PerceptionErrorBudget = dynamic(() =>
  import('@/components/interactive/perception-error-budget').then((m) => m.PerceptionErrorBudget),
);
export const PerceptionLatency = dynamic(() =>
  import('@/components/interactive/perception-latency').then((m) => m.PerceptionLatency),
);
export const PiGenerationTimeline = dynamic(() =>
  import('@/components/interactive/pi-generation-timeline').then((m) => m.PiGenerationTimeline),
);
export const PlanarFkArm = dynamic(() =>
  import('@/components/interactive/planar-fk-arm').then((m) => m.PlanarFkArm),
);
export const RecedingHorizon = dynamic(() =>
  import('@/components/interactive/receding-horizon').then((m) => m.RecedingHorizon),
);
export const ReliabilityCompounding = dynamic(() =>
  import('@/components/interactive/reliability-compounding').then((m) => m.ReliabilityCompounding),
);
export const RewardShaping = dynamic(() =>
  import('@/components/interactive/reward-shaping').then((m) => m.RewardShaping),
);
export const RrtExplorer = dynamic(() =>
  import('@/components/interactive/rrt-explorer').then((m) => m.RrtExplorer),
);
export const SampleEfficiencyLedger = dynamic(() =>
  import('@/components/interactive/sample-efficiency-ledger').then((m) => m.SampleEfficiencyLedger),
);
export const SceneRepresentationLadder = dynamic(() =>
  import('@/components/interactive/scene-representation-ladder').then((m) => m.SceneRepresentationLadder),
);
export const TeacherStudent = dynamic(() =>
  import('@/components/interactive/teacher-student').then((m) => m.TeacherStudent),
);
export const TeleopRigMatrix = dynamic(() =>
  import('@/components/interactive/teleop-rig-matrix').then((m) => m.TeleopRigMatrix),
);
export const ThesisExplorer = dynamic(() =>
  import('@/components/interactive/thesis-explorer').then((m) => m.ThesisExplorer),
);
export const TrainingTimeChart = dynamic(() =>
  import('@/components/interactive/training-time-chart').then((m) => m.TrainingTimeChart),
);
export const WbcDecomposition = dynamic(() =>
  import('@/components/interactive/wbc-decomposition').then((m) => m.WbcDecomposition),
);
export const WmDisambiguator = dynamic(() =>
  import('@/components/interactive/wm-disambiguator').then((m) => m.WmDisambiguator),
);
export const PolicyChunkingTable = dynamic(() =>
  import('@/components/mdx/policy-chunking-table').then((m) => m.PolicyChunkingTable),
);
export const RlMethodsTable = dynamic(() =>
  import('@/components/mdx/rl-methods-table').then((m) => m.RlMethodsTable),
);
