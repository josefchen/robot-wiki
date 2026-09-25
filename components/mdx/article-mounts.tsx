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
  ComparisonMatrix as LazyComparisonMatrix,
  CrossEmbodimentStrategies as LazyCrossEmbodimentStrategies,
  DeploymentDashboard as LazyDeploymentDashboard,
  GeneralistReleaseTimeline as LazyGeneralistReleaseTimeline,
  HandComparison as LazyHandComparison,
  HierarchyTimescales as LazyHierarchyTimescales,
  ImpedanceContactLab as LazyImpedanceContactLab,
  MilestonesWatchlist as LazyMilestonesWatchlist,
  MotInsulation as LazyMotInsulation,
  PerceptionErrorBudget as LazyPerceptionErrorBudget,
  PiGenerationTimeline as LazyPiGenerationTimeline,
  SampleEfficiencyLedger as LazySampleEfficiencyLedger,
  SceneRepresentationLadder as LazySceneRepresentationLadder,
  ThesisExplorer as LazyThesisExplorer,
} from './lazy-mounts';

export {
  ActionConditioning,
  ActionTokenization,
  AdvantageScrubber,
  AppearancePhysicsPush,
  ChunkSizeCurve,
  CollaborativeOperationModes,
  CompoundingError,
  ContactGeometry,
  ControlLoopBudget,
  DataScaleChart,
  DatasetTable,
  DenoisingLoop,
  DeploymentEconomics,
  EgoScaleScaling,
  EurekaLoop,
  ExecutionModes,
  ExpoFtResults,
  FlowMatchingTrajectory,
  FrictionTransfer,
  GaitDiagram,
  GraspWrenchLab,
  HardwareGuide,
  JepaPlanning,
  KalmanTracker,
  LatencyComparison,
  LatentImagination,
  MpcVsRl,
  PendulumController,
  PerceptionLatency,
  PlanarFkArm,
  RecedingHorizon,
  ReliabilityCompounding,
  RewardShaping,
  RrtExplorer,
  TeacherStudent,
  TeleopRigMatrix,
  TrainingTimeChart,
  WbcDecomposition,
  WmDisambiguator,
  PolicyChunkingTable,
  RlMethodsTable,
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

export const ComparisonMatrix = withCitationRecords('ComparisonMatrix', LazyComparisonMatrix);
export const CrossEmbodimentStrategies = withCitationRecords('CrossEmbodimentStrategies', LazyCrossEmbodimentStrategies);
export const DeploymentDashboard = withCitationRecords('DeploymentDashboard', LazyDeploymentDashboard);
export const GeneralistReleaseTimeline = withCitationRecords('GeneralistReleaseTimeline', LazyGeneralistReleaseTimeline);
export const HandComparison = withCitationRecords('HandComparison', LazyHandComparison);
export const HierarchyTimescales = withCitationRecords('HierarchyTimescales', LazyHierarchyTimescales);
export const ImpedanceContactLab = withCitationRecords('ImpedanceContactLab', LazyImpedanceContactLab);
export const MilestonesWatchlist = withCitationRecords('MilestonesWatchlist', LazyMilestonesWatchlist);
export const MotInsulation = withCitationRecords('MotInsulation', LazyMotInsulation);
export const PerceptionErrorBudget = withCitationRecords('PerceptionErrorBudget', LazyPerceptionErrorBudget);
export const PiGenerationTimeline = withCitationRecords('PiGenerationTimeline', LazyPiGenerationTimeline);
export const SampleEfficiencyLedger = withCitationRecords('SampleEfficiencyLedger', LazySampleEfficiencyLedger);
export const SceneRepresentationLadder = withCitationRecords('SceneRepresentationLadder', LazySceneRepresentationLadder);
export const ThesisExplorer = withCitationRecords('ThesisExplorer', LazyThesisExplorer);
