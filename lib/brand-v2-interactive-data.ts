/**
 * The interactive data/legend classification and its pure predicates
 * (VAL-B2-VIZ-002/003/004/005/006/013/015, VAL-B2-COL-010,
 * VAL-B2-COMP-009/010).
 *
 * Every registered interactive source is classified here once, with the
 * evidence for the classification in the row's comment. The browser gate
 * (tests/e2e/brand-v2-interactive-data.spec.ts) reconciles the rendered
 * instrument frames against these rows; the classification itself is
 * reconciled against the registry's interactive sources by unit test so a
 * new instrument cannot ship unclassified.
 *
 * Three kinds:
 * - `source-data`   plots or tabulates values a source published. Unknowns
 *                   must stay explicit; no status label is required.
 * - `authored-model` plots values this wiki authored (a labelled assumption,
 *                   a teaching model, a projection). The rendered text must
 *                   carry a generative-status label.
 * - `schematic`     illustrates a mechanism. The rendered text must carry a
 *                   self-label saying so.
 */

export type InteractiveDataKind =
  | 'source-data'
  | 'authored-model'
  | 'schematic';

export interface InteractiveDataSpec {
  /** Documented classification; drives the status-label requirement. */
  kind: InteractiveDataKind;
  /**
   * Series id of the lead active path, when the instrument plots one. The
   * mark group carries the same id on `data-series` and the gate resolves
   * its computed paint (VAL-B2-VIZ-003).
   */
  leadSeriesId?: string;
  /**
   * Paints the lead series may legitimately resolve to. Signal is the
   * default; a registered second entry is a state semantic the chart
   * discloses (a regime flip), never a decorative alternative.
   */
  leadPaints?: ReadonlyArray<'accent' | 'error' | 'warn' | 'ok' | 'text' | 'text-dim'>;
}

/** Resolved-paint tokens the gates treat as data-bearing. */
export type DataPaintToken =
  | 'accent'
  | 'highlight'
  | 'error'
  | 'warn'
  | 'ok'
  | 'text'
  | 'text-dim'
  | 'pattern';

const PAINT_RGB: Record<string, DataPaintToken | 'neutral'> = {
  // highlight #C6FF19
  'rgb(198, 255, 25)': 'highlight',
  // signal #245FFF
  'rgb(36, 95, 255)': 'accent',
  // error #A52A1E
  'rgb(165, 42, 30)': 'error',
  // warn #8A5A00
  'rgb(138, 90, 0)': 'warn',
  // ok #1A6F45
  'rgb(26, 111, 69)': 'ok',
  // ink #0B0B0C
  'rgb(11, 11, 12)': 'text',
  // graphite #242D33
  'rgb(36, 45, 51)': 'text-dim',
  // concrete #D9DADB and the border-strong mix are scaffold paints
  'rgb(217, 218, 219)': 'neutral',
  'rgb(141, 145, 148)': 'neutral',
  'rgb(176, 178, 180)': 'neutral',
  'rgb(226, 227, 228)': 'neutral',
  'rgb(245, 246, 247)': 'neutral',
  'rgb(255, 255, 255)': 'neutral',
  none: 'neutral',
  transparent: 'neutral',
};

/** Classify one resolved fill/stroke string into a data token. */
export function classifyResolvedPaint(resolved: string): DataPaintToken | 'neutral' {
  if (resolved.startsWith('url(')) return 'pattern';
  if (PAINT_RGB[resolved]) return PAINT_RGB[resolved];
  // Low-alpha washes of a data colour (an uncertainty band at 13 percent)
  // are scaffold, not a series paint; stronger alphas classify by their
  // colour so a translucent mark still counts as its token.
  const rgba = /^rgba\((\d+),(\d+),(\d+),(\d*\.?\d+)\)$/.exec(resolved);
  if (rgba && Number(rgba[4]) >= 0.25) {
    return PAINT_RGB[`rgb(${rgba[1]},${rgba[2]},${rgba[3]})`] ?? 'neutral';
  }
  return 'neutral';
}

export type MarkGeometry =
  | 'line'
  | 'dashed-line'
  | 'dot'
  | 'ring'
  | 'bar'
  | 'dashed-outline'
  | 'outline'
  | 'band';

export function geometryClassOf(observation: {
  tag: string;
  dashed: boolean;
  filled: boolean;
}): MarkGeometry {
  switch (observation.tag) {
    case 'polyline':
      return observation.dashed ? 'dashed-line' : 'line';
    case 'path':
      return observation.dashed
        ? 'dashed-line'
        : observation.filled
          ? 'band'
          : 'line';
    case 'circle':
    case 'ellipse':
      return observation.filled ? 'dot' : 'ring';
    default:
      // Rectangles: a filled bar, a dashed outline and a solid outline are
      // three different marks with the colour removed.
      return observation.filled
        ? 'bar'
        : observation.dashed
          ? 'dashed-outline'
          : 'outline';
  }
}

export interface MarkObservation {
  paint: DataPaintToken | 'neutral';
  /** Every geometry class the series renders (a band plus its line, say). */
  geometries: ReadonlyArray<MarkGeometry>;
  /** The mark (or its group) carries a per-series text label in the plot. */
  labelled: boolean;
}

/**
 * Whether two plotted series stay distinguishable with colour removed:
 * they differ in geometry class (line vs dot vs bar vs band vs ring), in
 * dash, or one of them is directly labelled in the plot (VAL-B2-VIZ-002).
 */
export function nonColourDistinct(a: MarkObservation, b: MarkObservation): boolean {
  if (a.labelled || b.labelled) return true;
  // Two series are confusable only when their encodings are identical:
  // the same geometry classes, the same pattern-ness. Any extra dash,
  // marker or band makes them distinguishable with the colour removed.
  const sameGeometries =
    a.geometries.length === b.geometries.length &&
    a.geometries.every((geometry) => b.geometries.includes(geometry));
  if (!sameGeometries) return true;
  // A hatch or tile pattern is itself a non-colour distinction: patterned
  // versus unpatterned marks stay distinguishable in greyscale.
  if ((a.paint === 'pattern') !== (b.paint === 'pattern')) return true;
  return false;
}

const COLOUR_NAME =
  '(?:blue|red|green|lime|grey|gray|orange|yellow|black|white|ink|signal|accent|error|warn|ok)';

/**
 * Classify one legend entry's text. A subject made only of colour and dash
 * words ("blue:", "dashed blue:", "red line") relies on colour alone and
 * fails VAL-B2-VIZ-004/VAL-B2-COL-010; an entry that names the thing it
 * marks passes.
 */
export function classifyLegendText(text: string): 'named' | 'colour-name-only' | 'empty' {
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  // Split the entry at its first colon: "subject: description".
  const subject = trimmed.includes(':')
    ? trimmed.slice(0, trimmed.indexOf(':'))
    : trimmed;
  const words = subject.split(/[\s,/]+/).filter((word) => word.length > 0);
  const isShapeWord = (word: string) =>
    /^(dashed?|dash-dot|dotted|long-dashed|solid|line|arrow|outline|faint|band)$/i.test(word);
  const isColourWord = (word: string) =>
    new RegExp(`^${COLOUR_NAME}$`, 'i').test(word);
  const meaningful = words.filter((word) => !isShapeWord(word));
  const named = meaningful.filter((word) => !isColourWord(word));
  if (named.length > 0) return 'named';
  // Nothing but shape words and colour words: the entry relies on colour.
  if (meaningful.some(isColourWord)) return 'colour-name-only';
  return 'named';
}

/**
 * The rendered-text vocabulary that labels a schematic or a generated
 * signal for what it is (VAL-B2-VIZ-006). The words come from the
 * instruments' own honest disclosures.
 */
export const STATUS_LABEL_VOCABULARY = {
  source:
    /(schematic|illustrat|toy|authored|synthetic|generat|assumption|not a published|not a confidence|not measured|analytical|scenario band|not a source)/i,
} as const;

/**
 * The frozen-evidence boundary for VAL-B2-VIZ-006 (and the lead-series
 * clause of VAL-B2-VIZ-003). Empty since the status-label closeout: the
 * five formerly unlabeled instruments (gait-diagram, planar-fk-arm,
 * pendulum-controller, impedance-contact-lab, reliability-compounding)
 * now carry an in-frame STATUS_LABEL_VOCABULARY label on every mount,
 * and their component bytes were re-bound in the sealed audit evidence
 * the way 9f190e6 rebound the primitive migration.
 *
 * The map stays as the recorded-residue mechanism: an instrument that
 * genuinely cannot take an in-frame label (for example a component whose
 * bytes sealed audit evidence pins against any edit) is recorded here
 * with its reason rather than silently widening the gate, and the e2e
 * sweep reports exactly the recorded set.
 */
export type StatusLabelException = {
  /** Why this instrument is outside the in-frame rule. */
  reason:
    | 'audit-frozen'
    | 'labelled-in-adjacent-prose';
  /**
   * The routes whose article prose carries the label, when applicable. On
   * any other route the mount counts as audit-frozen, because the same
   * frozen component cannot grow an in-frame label either.
   */
  routes?: ReadonlyArray<string>;
  /** The sentence the gate must still find on the route, when applicable. */
  adjacentProse?: RegExp;
};

export const STATUS_LABEL_EXCEPTIONS: Readonly<Record<string, StatusLabelException>> = {};


/**
 * The honest `n/a` families (VAL-B2-COMP-010). "n/a" is reserved for a
 * field that genuinely does not apply to that row; the gate reconciles
 * the rendered set against this registry in both directions, so a new
 * `n/a` cell cannot appear without a recorded justification, and a
 * registered family whose cells disappear stays honest too.
 */
export interface NaCellFamily {
  /** Registry interactive source id, e.g. `interactive:KalmanTracker`. */
  sourceId: string;
  /** Exact column header whose cells carry the `n/a`. */
  column: string;
  /** Why the field does not apply to those rows. */
  justification: string;
}

export const NA_CELL_FAMILIES: ReadonlyArray<NaCellFamily> = [
  {
    sourceId: 'interactive:DataScaleChart',
    column: 'pretraining tokens',
    justification:
      'A robot-demonstration dataset or teleop farm has no pretraining-token count; the quantity does not exist for those rows.',
  },
  {
    sourceId: 'interactive:DataScaleChart',
    column: 'demonstration hours',
    justification:
      'A language corpus or duration figure has no demonstration-hour count; the quantity does not exist for those rows.',
  },
  {
    sourceId: 'interactive:EgoScaleScaling',
    column: 'reported completion',
    justification:
      'The paper reports completion only inside its measured range; beyond it there is no reported score to disclose, and the region column says extrapolated.',
  },
  {
    sourceId: 'interactive:KalmanTracker',
    column: 'reading',
    justification:
      'The sensor drops out on seeded steps; with no measurement taken there is no reading to print for that step.',
  },
];

/**
 * The value-to-coordinate parity anchors (VAL-B2-VIZ-013). Each anchor
 * names the exported scale and constants its component ships, so the
 * expectation is computed from source data, never copied from the
 * rendered output. The e2e gate imports the anchor modules and compares
 * recomputed user-unit coordinates against rendered mark geometry.
 */
export interface ParityAnchor {
  sourceId: string;
  /** Testid of the rendered mark group the expectation lands on. */
  selector: string;
}

/**
 * The classification rows. Keep every entry's comment as the evidence.
 */
export const INTERACTIVE_DATA_CLASSIFICATION: Record<string, InteractiveDataSpec> = {
  // --- source-data: published values, tables of record, dated registries
  'interactive:ActionConditioning': {
    // Two rollouts of a real generative-video comparison; the conditioning
    // strength is a reader control, not an authored number.
    kind: 'source-data',
  },
  'interactive:ComparisonMatrix': {
    // Filterable table of published architectural facts.
    kind: 'source-data',
  },
  'interactive:DatasetTable': {
    // Dataset registry table (sizes, embodiments, licences).
    kind: 'source-data',
  },
  'interactive:DeploymentDashboard': {
    // Deployment claims with issuer/as-of scope, verified vs claimed.
    kind: 'source-data',
  },
  'interactive:ExpoFtResults': {
    // Every plotted count comes from the EXPO-FT paper's own table.
    kind: 'source-data',
    leadSeriesId: 'expo-ft',
    leadPaints: ['accent'],
  },
  'interactive:GeneralistReleaseTimeline': {
    // Release dates and availability from public model releases.
    kind: 'source-data',
  },
  'interactive:HandComparison': {
    // Dexterity hand table with vendor-published specs.
    kind: 'source-data',
  },
  'interactive:HardwareGuide': {
    // Buyer's-guide table; undisclosed figures render "not disclosed".
    kind: 'source-data',
  },
  'interactive:MilestonesWatchlist': {
    // Status board of published milestone outcomes.
    kind: 'source-data',
  },
  'interactive:PerceptionLatency': {
    // Reproduces the Falanga/Kim/Scaramuzza sense-and-avoid analysis.
    kind: 'source-data',
  },
  'interactive:PiGenerationTimeline': {
    // Source publication months and the pinned openpi catalogue.
    kind: 'source-data',
  },
  'interactive:TeleopRigMatrix': {
    // Rig comparison across published cost/quality figures.
    kind: 'source-data',
  },
  'interactive:ThesisExplorer': {
    // Six falsifiable theses with named proponents and evidence.
    kind: 'source-data',
  },

  // --- authored-model: this wiki's own labelled numbers
  'interactive:AdvantageScrubber': {
    // "Deterministic teaching toy" over the Recap portafilter illustration.
    kind: 'authored-model',
  },
  'interactive:ChunkSizeCurve': {
    // ACT ablation anchors are source data; the curve between them is an
    // authored interpolation and is disclosed as such in its description.
    kind: 'authored-model',
    leadSeriesId: 'measured-rise',
    leadPaints: ['accent'],
  },
  'interactive:CollaborativeOperationModes': {
    // Mode constraints are computed live from the ISO mode definitions.
    kind: 'source-data',
  },
  'interactive:CompoundingError': {
    // "Deterministic illustration" of drift with quadratic/linear fits.
    kind: 'authored-model',
  },
  'interactive:ControlLoopBudget': {
    // "One synchronous toy inference"; VLA-Perf numbers are analytical.
    kind: 'authored-model',
  },
  'interactive:DataScaleChart': {
    // Published robot-hours and token counts plus a teleop-farm projection
    // the reader drives; the projection is the authored part. No lead
    // series: the component is audit-frozen (see STATUS_LABEL_EXCEPTIONS)
    // and ships no data-series marks.
    kind: 'authored-model',
  },
  'interactive:DeploymentEconomics': {
    // Reader-driven deployment calculator over labelled assumptions.
    kind: 'authored-model',
  },
  'interactive:EgoScaleScaling': {
    // The EgoScale law with a scenario band "not a confidence interval".
    kind: 'authored-model',
    leadSeriesId: 'loss-law',
    leadPaints: ['accent'],
  },
  'interactive:EurekaLoop': {
    // Reader-composed weighted reward over the Eureka-style loop; the
    // weights are illustrative, not a pinned reward configuration.
    kind: 'authored-model',
  },
  'interactive:ExecutionModes': {
    // Timing modes of a labelled real-time-chunking model.
    kind: 'authored-model',
  },
  'interactive:FrictionTransfer': {
    // Deterministic transfer model over a trained-mu policy sweep. The
    // rendered takeaway self-labels ("Authored toy, not measured robot
    // data"), so VIZ-006 holds; no lead series is registered because the
    // component is audit-frozen and ships no data-series marks.
    kind: 'authored-model',
  },
  'interactive:GaitDiagram': {
    // Gait parameters of a labelled reference quadruped gait set; the
    // frame self-labels the duty factors as authored teaching values.
    kind: 'authored-model',
  },
  'interactive:HierarchyTimescales': {
    // Loop-rate lanes for published system stacks; the overlay sweep is
    // authored. Header vocabulary already carries the disclosure.
    kind: 'authored-model',
  },
  'interactive:KalmanTracker': {
    // The tracked world is generated on the client ("Reseed: generate the
    // next world"); the filter math itself is real.
    kind: 'authored-model',
    leadSeriesId: 'estimate',
    leadPaints: ['accent'],
  },
  'interactive:LatencyComparison': {
    // Temporal-ensembling vs RTC under an injected delay model.
    kind: 'authored-model',
  },
  'interactive:LatentImagination': {
    // "Illustrative compounding-error toy" with an amplified recurrence.
    kind: 'authored-model',
  },
  'interactive:MpcVsRl': {
    // Authored side-by-side of two controller families' responses.
    kind: 'authored-model',
  },
  'interactive:PerceptionErrorBudget': {
    // "Authored teaching model": RSS-composed magnitudes, not measurements.
    kind: 'authored-model',
  },
  'interactive:ReliabilityCompounding': {
    // The compounding calculator over reader-set per-step probabilities;
    // every mount self-labels as an illustrative probability model.
    kind: 'authored-model',
  },
  'interactive:RewardShaping': {
    // "Twelve sliders set illustrative weights, not a pinned simulator".
    kind: 'authored-model',
  },
  'interactive:SampleEfficiencyLedger': {
    // "Constant-rate budget illustration... toy outputs, not measured".
    kind: 'authored-model',
  },
  'interactive:TeacherStudent': {
    // "Authored illustration motivated by input mismatch".
    kind: 'authored-model',
  },
  'interactive:TrainingTimeChart': {
    // "Illustrative fixed" throughput curve against published anchors; the
    // rendered takeaway self-labels ("This toy adds an assumed
    // per-environment CPU cost"). Audit-frozen, so no lead series ships.
    kind: 'authored-model',
  },
  'interactive:WbcDecomposition': {
    // Decomposition comparison with published loop rates; the stack
    // drawing is schematic. Treated as authored for labelling.
    kind: 'authored-model',
  },

  // --- schematic: mechanism illustrations
  'interactive:ActionTokenization': {
    // Deterministic tokenization walk of a continuous action vector.
    kind: 'schematic',
  },
  'interactive:AppearancePhysicsPush': {
    // The three-layer push test: one scene drawn per abstraction layer.
    kind: 'schematic',
  },
  'interactive:ContactGeometry': {
    // Injects a contact-model error into two MDP schematics.
    kind: 'schematic',
  },
  'interactive:CrossEmbodimentStrategies': {
    // "Original deterministic slot-layout illustration".
    kind: 'schematic',
  },
  'interactive:DenoisingLoop': {
    // Step-through of the denoising recurrence.
    kind: 'schematic',
  },
  'interactive:FlowMatchingTrajectory': {
    // Flow-matching sweep from noise to action.
    kind: 'schematic',
  },
  'interactive:GraspWrenchLab': {
    // Wrench-hull lab with computed geometry.
    kind: 'schematic',
  },
  'interactive:ImpedanceContactLab': {
    // One-dimensional compliant-contact lab.
    kind: 'schematic',
  },
  'interactive:JepaPlanning': {
    // "Deterministic two-dimensional teaching model".
    kind: 'schematic',
  },
  'interactive:MotInsulation': {
    // Layer-by-layer Mixture-of-Transformers architecture view.
    kind: 'schematic',
  },
  'interactive:PendulumController': {
    // Live PID lab; the simulation is the point, not a data claim.
    kind: 'schematic',
  },
  'interactive:PlanarFkArm': {
    // 2D forward-kinematics visualizer.
    kind: 'schematic',
  },
  'interactive:RecedingHorizon': {
    // The T_p / T_a replanning dial.
    kind: 'schematic',
  },
  'interactive:RrtExplorer': {
    // RRT growth in a synthetic 100x64 planning world.
    kind: 'schematic',
  },
  'interactive:SceneRepresentationLadder': {
    // "One fixed synthetic scene, drawn five times".
    kind: 'schematic',
  },
  'interactive:WmDisambiguator': {
    // Six paradigm panels of the world-model taxonomy.
    kind: 'schematic',
  },
};
