/**
 * Article mount registry: the module every article's client-component
 * imports resolve to at build time. lib/recma-lazy-mounts.mjs rewrites
 * `@/components/interactive/*` (and the two client MDX tables) here, so the
 * MDX source keeps naming the real component module.
 *
 * This is a Server Component module. Most widgets need nothing from the
 * server and are re-exported straight from the `next/dynamic` wrappers in
 * ./lazy-mounts, so each loads as its own chunk on the pages that render
 * it. The widgets that link to primary sources are wrapped here instead:
 * the server resolves the few citation records each can show and passes
 * them down, so the citation registry itself never reaches the browser
 * (lib/widget-citations.ts).
 */
import type { ComponentType } from 'react';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { widgetCitationRecords, type CitingWidget } from '@/lib/widget-citations';
import {
  ActuatorGap as LazyActuatorGap,
  CalibrationChain as LazyCalibrationChain,
  ComparisonMatrix as LazyComparisonMatrix,
  CrossEmbodimentStrategies as LazyCrossEmbodimentStrategies,
  CubeTrials as LazyCubeTrials,
  DemoOrSim as LazyDemoOrSim,
  DeploymentDashboard as LazyDeploymentDashboard,
  GeneralistReleaseTimeline as LazyGeneralistReleaseTimeline,
  HandComparison as LazyHandComparison,
  HandEyePoses as LazyHandEyePoses,
  HierarchyTimescales as LazyHierarchyTimescales,
  HindsightRelabel as LazyHindsightRelabel,
  HumanoidPickHeight as LazyHumanoidPickHeight,
  ImpedanceContactLab as LazyImpedanceContactLab,
  MilestonesWatchlist as LazyMilestonesWatchlist,
  MotInsulation as LazyMotInsulation,
  NewtonSolvers as LazyNewtonSolvers,
  OfflineValueOverreach as LazyOfflineValueOverreach,
  PerceptionErrorBudget as LazyPerceptionErrorBudget,
  PiGenerationTimeline as LazyPiGenerationTimeline,
  QosQueueAge as LazyQosQueueAge,
  RealRobotRlGains as LazyRealRobotRlGains,
  ReplayReuse as LazyReplayReuse,
  RetargetingGap as LazyRetargetingGap,
  RobotsPerGpu as LazyRobotsPerGpu,
  Ros2Interfaces as LazyRos2Interfaces,
  Ros2PolicyLayout as LazyRos2PolicyLayout,
  SampleEfficiencyLedger as LazySampleEfficiencyLedger,
  ScannedTwinCheck as LazyScannedTwinCheck,
  SceneRepresentationLadder as LazySceneRepresentationLadder,
  TerrainCurriculum as LazyTerrainCurriculum,
  ThesisExplorer as LazyThesisExplorer,
  TimeOffsetMiss as LazyTimeOffsetMiss,
  TrajectoryStitching as LazyTrajectoryStitching,
} from './lazy-mounts';

export {
  ActionConditioning,
  ActionTokenization,
  AdvantageScrubber,
  AppearancePhysicsPush,
  BearCaseLock,
  ChunkBuffer,
  ChunkSizeCurve,
  CollaborativeOperationModes,
  CompoundingError,
  ContactGeometry,
  ControlLoopBudget,
  DataScaleChart,
  DatasetTable,
  DeltaFrame,
  DeploymentEconomics,
  EgoScaleScaling,
  EurekaLoop,
  ExcavatorPractice,
  ExecutionModes,
  ExplainerFigure,
  ExpoFtResults,
  FlowMatchingTrajectory,
  FrictionTransfer,
  GaitDiagram,
  GraspWrenchLab,
  HandMotionShare,
  HardwareGuide,
  HelixClockwork,
  ImpedancePress,
  JepaPlanning,
  KeypointString,
  KinematicTwin,
  LinearizationGap,
  LoopClosure,
  LatencyComparison,
  LatentImagination,
  MotionPantograph,
  MpcVsRl,
  NoiseOrEdit,
  PendulumController,
  PerceptionLatency,
  PlanarFkArm,
  PlannerExploit,
  RecedingHorizon,
  ReliabilityCompounding,
  RewardShaping,
  RrtExplorer,
  SafetyFilterFence,
  SceneSplit,
  ScopeFollow,
  TeacherStudent,
  TeleopRigMatrix,
  TrainingTimeChart,
  WbcDecomposition,
  WmDisambiguator,
  PolicyChunkingTable,
  RlMethodsTable,
  KalmanPredictUpdate,
  DiffusionDenoising,
  BatchScale,
  GaitSupport,
  JamOverhead,
  TactileSlip,
  SenseAvoid,
  Clip,
} from './lazy-mounts';

/**
 * Mounts a lazily loaded widget under the citation records it renders.
 * The provider adds no markup, so the widget's HTML is unchanged.
 */
function withCitationRecords<Props extends object>(
  widget: CitingWidget,
  Widget: ComponentType<Props>,
) {
  function CitingMount(props: Props) {
    return (
      <CitationRecordsProvider records={widgetCitationRecords(widget)}>
        <Widget {...props} />
      </CitationRecordsProvider>
    );
  }
  CitingMount.displayName = `CitingMount(${widget})`;
  return CitingMount;
}

export const ActuatorGap = withCitationRecords('ActuatorGap', LazyActuatorGap);
export const CalibrationChain = withCitationRecords('CalibrationChain', LazyCalibrationChain);
export const ComparisonMatrix = withCitationRecords('ComparisonMatrix', LazyComparisonMatrix);
export const CrossEmbodimentStrategies = withCitationRecords('CrossEmbodimentStrategies', LazyCrossEmbodimentStrategies);
export const CubeTrials = withCitationRecords('CubeTrials', LazyCubeTrials);
export const DemoOrSim = withCitationRecords('DemoOrSim', LazyDemoOrSim);
export const DeploymentDashboard = withCitationRecords('DeploymentDashboard', LazyDeploymentDashboard);
export const GeneralistReleaseTimeline = withCitationRecords('GeneralistReleaseTimeline', LazyGeneralistReleaseTimeline);
export const HandComparison = withCitationRecords('HandComparison', LazyHandComparison);
export const HandEyePoses = withCitationRecords('HandEyePoses', LazyHandEyePoses);
export const HierarchyTimescales = withCitationRecords('HierarchyTimescales', LazyHierarchyTimescales);
export const HindsightRelabel = withCitationRecords('HindsightRelabel', LazyHindsightRelabel);
export const HumanoidPickHeight = withCitationRecords('HumanoidPickHeight', LazyHumanoidPickHeight);
export const ImpedanceContactLab = withCitationRecords('ImpedanceContactLab', LazyImpedanceContactLab);
export const MilestonesWatchlist = withCitationRecords('MilestonesWatchlist', LazyMilestonesWatchlist);
export const MotInsulation = withCitationRecords('MotInsulation', LazyMotInsulation);
export const NewtonSolvers = withCitationRecords('NewtonSolvers', LazyNewtonSolvers);
export const OfflineValueOverreach = withCitationRecords('OfflineValueOverreach', LazyOfflineValueOverreach);
export const PerceptionErrorBudget = withCitationRecords('PerceptionErrorBudget', LazyPerceptionErrorBudget);
export const PiGenerationTimeline = withCitationRecords('PiGenerationTimeline', LazyPiGenerationTimeline);
export const QosQueueAge = withCitationRecords('QosQueueAge', LazyQosQueueAge);
export const RealRobotRlGains = withCitationRecords('RealRobotRlGains', LazyRealRobotRlGains);
export const ReplayReuse = withCitationRecords('ReplayReuse', LazyReplayReuse);
export const RetargetingGap = withCitationRecords('RetargetingGap', LazyRetargetingGap);
export const RobotsPerGpu = withCitationRecords('RobotsPerGpu', LazyRobotsPerGpu);
export const Ros2Interfaces = withCitationRecords('Ros2Interfaces', LazyRos2Interfaces);
export const Ros2PolicyLayout = withCitationRecords('Ros2PolicyLayout', LazyRos2PolicyLayout);
export const SampleEfficiencyLedger = withCitationRecords('SampleEfficiencyLedger', LazySampleEfficiencyLedger);
export const ScannedTwinCheck = withCitationRecords('ScannedTwinCheck', LazyScannedTwinCheck);
export const SceneRepresentationLadder = withCitationRecords('SceneRepresentationLadder', LazySceneRepresentationLadder);
export const TerrainCurriculum = withCitationRecords('TerrainCurriculum', LazyTerrainCurriculum);
export const ThesisExplorer = withCitationRecords('ThesisExplorer', LazyThesisExplorer);
export const TimeOffsetMiss = withCitationRecords('TimeOffsetMiss', LazyTimeOffsetMiss);
export const TrajectoryStitching = withCitationRecords('TrajectoryStitching', LazyTrajectoryStitching);
