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
   * Data-bearing paints the lead series may resolve to. The grayscale chart
   * tones of its stage role are always allowed, since the research-page
   * standard draws the lead at full emphasis in its role and leaves the
   * accent optional. The accent is the default entry; any other is a state
   * semantic the chart discloses (a regime flip), never a decorative
   * alternative.
   */
  leadPaints?: ReadonlyArray<'accent' | 'error' | 'warn' | 'ok' | 'text' | 'text-dim'>;
}

/**
 * Resolved-paint tokens the gates treat as data-bearing. `retired` is a
 * superseded brand-v2 paint, which no figure may draw (VAL-B2-VIZ-003).
 */
export type DataPaintToken =
  | 'accent'
  | 'retired'
  | 'error'
  | 'warn'
  | 'ok'
  | 'text'
  | 'text-dim'
  | 'pattern';

/**
 * The research-page palette (app/globals.css, owner decision of 10 October
 * 2026), keyed by `#RRGGBB`. Browsers serialise a computed colour with or
 * without spaces depending on who reads it, so every lookup goes through
 * `paintHex` and never through the string it was given.
 */
const PAINT_BY_HEX: Readonly<Record<string, DataPaintToken | 'neutral'>> = {
  // The one muted accent, --color-signal (and its --color-accent alias).
  '#3B6EA8': 'accent',
  // Outcome marks, and the offline clip theme's outcome pair the motion
  // tokens fall back to.
  '#A52A1E': 'error',
  '#C4473A': 'error',
  '#8A5A00': 'warn',
  '#1A6F45': 'ok',
  '#3F8F4F': 'ok',
  // Ink and the muted text tone.
  '#1C1C1A': 'text',
  '#6C6B66': 'text-dim',
  // The grayscale chart tones and the page grounds are scaffold.
  '#DEDEDB': 'neutral',
  '#A3A39E': 'neutral',
  '#3F3F3B': 'neutral',
  '#FAFAF8': 'neutral',
  '#F0F3F6': 'neutral',
  '#FFFFFF': 'neutral',
};

/**
 * The superseded brand-v2 paints: highlight lime, the brand-v2 signal blue
 * and the earlier blue VAL-B2-RES-003 retires. They fail at any opacity.
 */
export const RETIRED_PAINTS = ['#C6FF19', '#245FFF', '#245EDB'] as const;

/** A resolved paint as `#RRGGBB` plus its alpha, or null for no paint. */
export function paintHex(resolved: string): { hex: string; alpha: number } | null {
  const value = resolved.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(value);
  if (short) {
    return { hex: `#${[...short[1]].map((digit) => digit + digit).join('')}`.toUpperCase(), alpha: 1 };
  }
  const long = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(value);
  if (long) {
    return {
      hex: `#${long[1]}`.toUpperCase(),
      alpha: long[2] === undefined ? 1 : parseInt(long[2], 16) / 255,
    };
  }
  // A color-mix() result computes to `color(srgb r g b / a)` in 0..1 units.
  const srgb = /^color\(srgb\s+([^)]*)\)$/.exec(value);
  const functional = srgb ?? /^rgba?\(([^)]*)\)$/.exec(value);
  if (!functional) return null;
  const parts = functional[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const channels = parts.slice(0, 3).map((part) => Number(part) * (srgb ? 255 : 1));
  if (channels.some((channel) => !Number.isFinite(channel))) return null;
  const alphaPart = parts[3];
  const alpha =
    alphaPart === undefined
      ? 1
      : alphaPart.endsWith('%')
        ? Number(alphaPart.slice(0, -1)) / 100
        : Number(alphaPart);
  return {
    hex: `#${channels
      .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase(),
    alpha,
  };
}

/** Classify one resolved fill/stroke string into a data token. */
export function classifyResolvedPaint(resolved: string): DataPaintToken | 'neutral' {
  if (resolved.trim().startsWith('url(')) return 'pattern';
  const paint = paintHex(resolved);
  if (!paint || paint.alpha === 0) return 'neutral';
  if ((RETIRED_PAINTS as readonly string[]).includes(paint.hex)) return 'retired';
  // Low-alpha washes of a data colour (an uncertainty band at 13 percent)
  // are scaffold, not a series paint; stronger alphas classify by their
  // colour so a translucent mark still counts as its token.
  if (paint.alpha < 0.25) return 'neutral';
  return PAINT_BY_HEX[paint.hex] ?? 'neutral';
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
];

/**
 * How an instrument lets the reader reorder its table (VAL-B2-COMP-009),
 * read from the module source the registry names:
 * - `header-sort`: a `Table` column declared `sortable: true`, which
 *   renders a "Sort by <column>" button inside that column's header.
 * - `control-sort`: a visible "Sort by" preset group in the figure header
 *   orders the rows and the table's own headers carry `aria-sort`. This
 *   is the shape the figure system (library/design-system.md 13.4) gives a
 *   figure whose two visible controls include the sort and whose data
 *   table sits in "How this was made".
 * A module that does both counts as `header-sort`.
 */
export type TableSortKind = 'header-sort' | 'control-sort';

export function tableSortKindOf(sourceText: string): TableSortKind | null {
  if (/\bsortable:\s*true\b/.test(sourceText)) return 'header-sort';
  if (/<th\b[^>]*\baria-sort=/.test(sourceText) && /\blabel="Sort by"/.test(sourceText)) {
    return 'control-sort';
  }
  return null;
}

/**
 * The sortable-table census over the registry's interactive sources: each
 * source whose module sorts a table, with how. `read` returns a module's
 * text by its repository path, so the browser gate and the unit suite
 * derive the same population from the same files.
 */
export function tableSortCensus(
  sources: ReadonlyArray<{ id: string; sourcePath?: string }>,
  read: (sourcePath: string) => string,
): Map<string, TableSortKind> {
  const census = new Map<string, TableSortKind>();
  for (const source of sources) {
    if (!source.sourcePath) continue;
    const kind = tableSortKindOf(read(source.sourcePath));
    if (kind) census.set(source.id, kind);
  }
  return census;
}

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
  'interactive:CalibrationChain': {
    // Published calibration errors from three studies, drawn on a schematic chain.
    kind: 'source-data',
  },
  'interactive:ComparisonMatrix': {
    // Filterable table of published architectural facts.
    kind: 'source-data',
  },
  'interactive:CubeTrials': {
    // OpenAI's Rubik's-cube trial counts: 2 of 10 with a sensor cube, 0 of 10 with vision for face angles.
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
  'interactive:ExcavatorPractice': {
    // Canales and colleagues' published checkpoints (the Fig. 5 snapshots, Table II) on a drawn excavator; the path and the models' spread self-label as illustrative.
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
  'interactive:HumanoidPickHeight': {
    // Gemini Robotics 2's published whole-body pick and gripper insertion rates; the humanoid drawing self-labels as illustrative.
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
  'interactive:RealRobotRlGains': {
    // Before and after real-robot success rates as RankQ, SCORE, PA-RL and BORA report them.
    kind: 'source-data',
  },
  'interactive:RobotsPerGpu': {
    // Rudin and colleagues' robot counts (128 CPU-era, 4,096 deployed policy, 16,384 on one GPU), one square per 128.
    kind: 'source-data',
  },
  'interactive:ScannedTwinCheck': {
    // Kadian and colleagues' sim-versus-real correlations for a 3D-scanned lab (0.18 as scanned, 0.844 tuned).
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
  'interactive:ActuatorGap': {
    // Illustrative motor response curves; the fall-or-walk outcome is Hwangbo and colleagues'.
    kind: 'authored-model',
  },
  'interactive:AdvantageScrubber': {
    // "Deterministic teaching toy" over the Recap portafilter illustration.
    kind: 'authored-model',
  },
  'interactive:ChunkBuffer': {
    // Gemini Robotics' 250 ms and 50 Hz with the reader's chunk size; the ticks it fills are this wiki's arithmetic, slowed and labelled.
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
    // series: robot data, human video, LLM corpora and the farm projection
    // are four peer series.
    kind: 'authored-model',
  },
  'interactive:DeploymentEconomics': {
    // Reader-driven deployment calculator over labelled assumptions.
    kind: 'authored-model',
  },
  'interactive:EgoScaleScaling': {
    // The EgoScale law with a scenario band "not a confidence interval".
    // Lead: the completion fit, the one line the main view draws and the
    // presets move along. The reader-first rewrite (fb57886c, owner
    // decision of 2 October 2026: two visible controls, everything else in
    // "Adjust more") moved the loss law behind its "Show the paper's error
    // measure" toggle, so it no longer renders by default.
    kind: 'authored-model',
    leadSeriesId: 'completion-fit',
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
    // data"), so VIZ-006 holds. Both success curves share the value role,
    // so no single lead series is registered.
    kind: 'authored-model',
  },
  'interactive:GaitDiagram': {
    // Gait parameters of a labelled reference quadruped gait set; the
    // frame self-labels the duty factors as authored teaching values.
    kind: 'authored-model',
  },
  'interactive:HandEyePoses': {
    // Illustrative square-root ring; the 3-pose minimum (OpenCV) and the 12 to 15 sample plateau (MoveIt) are cited.
    kind: 'authored-model',
  },
  'interactive:HierarchyTimescales': {
    // Loop-rate lanes for published system stacks; the overlay sweep is
    // authored. Header vocabulary already carries the disclosure.
    kind: 'authored-model',
  },
  'interactive:LatencyComparison': {
    // Temporal-ensembling vs RTC under an injected delay model.
    kind: 'authored-model',
  },
  'interactive:LatentImagination': {
    // "Illustrative compounding-error toy" with an amplified recurrence.
    kind: 'authored-model',
  },
  'interactive:MotionPantograph': {
    // Motion scaling as a reducing pantograph: an authored stroke divided exactly by the scale; "Illustrative" status line.
    kind: 'authored-model',
  },
  'interactive:MpcVsRl': {
    // Authored side-by-side of two controller families' responses.
    kind: 'authored-model',
  },
  'interactive:OfflineValueOverreach': {
    // Illustrative value curves ("Illustrative curves"); the problem is the offline RL tutorial's, the penalty CQL's.
    kind: 'authored-model',
  },
  'interactive:PerceptionErrorBudget': {
    // "Authored teaching model": RSS-composed magnitudes, not measurements.
    kind: 'authored-model',
  },
  'interactive:QosQueueAge': {
    // Illustrative camera rate; the 10-message default queue is the ROS 2 QoS default profile.
    kind: 'authored-model',
  },
  'interactive:RetargetingGap': {
    // "Illustrative bodies"; the artifacts are the retargeting studies'.
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
    // The caption self-labels ("In this authored toy").
    kind: 'authored-model',
  },
  'interactive:TerrainCurriculum': {
    // Seeded illustrative robots under Rudin and colleagues' three curriculum rules.
    kind: 'authored-model',
  },
  'interactive:TimeOffsetMiss': {
    // Illustrative arm and motion; the 55 ms camera delay is Realtime-VLA V2's measurement.
    kind: 'authored-model',
  },
  'interactive:TrainingTimeChart': {
    // "Illustrative fixed" throughput curve against published anchors; the
    // rendered takeaway self-labels ("This toy adds an assumed
    // per-environment CPU cost"). Audit-frozen, so no lead series ships.
    kind: 'authored-model',
  },
  'interactive:ImpedancePress': {
    // Hogan's impedance law on a spring press with illustrative springs (1, 2 and 4 marks of push per mark of gap), labelled.
    kind: 'authored-model',
  },
  'interactive:WbcDecomposition': {
    // Decomposition comparison with published loop rates; the stack
    // drawing is schematic. Treated as authored for labelling.
    kind: 'authored-model',
  },

  // --- schematic: mechanism illustrations
  'interactive:BearCaseLock': {
    // The article's four falsifying results on an illustrative pin-tumbler lock, each pin set by the watchlist's August 2026 call; "illustrative" status line.
    kind: 'schematic',
  },
  'interactive:KinematicTwin': {
    // The article's GELLO rule (joint readings map one to one onto robot commands) on an illustrative leader and robot; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:NoiseOrEdit': {
    // The article's DSRL ceiling (noise steering reaches only actions a frozen policy makes) and EXPO's small edit on an illustrative cam and hole; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:DeltaFrame': {
    // The roadmap's expressed-in frame rule on an illustrative 5 cm move; the chord between the two readings is exact; "illustrative" status line.
    kind: 'schematic',
  },
  'interactive:HandMotionShare': {
    // The article's relative end-effector rule (GR00T N1.7, EgoScale) on an illustrative person, robot and stroke; the geometry is exact; "illustrative" status line.
    kind: 'schematic',
  },
  'interactive:LinearizationGap': {
    // The EKF's tangent at the estimate against the curve it replaces, on an illustrative one-joint arm; the miss is that arm's exact geometry; "Illustrative" status line.
    kind: 'schematic',
  },
  'interactive:LoopClosure': {
    // A pose chain that drifts and closes, on an illustrative loop and drift; each joint's share is that chain's exact least-squares solution; "Illustrative" status line.
    kind: 'schematic',
  },
  'interactive:HelixClockwork': {
    // Figure's two Helix 02 rates (200 Hz and 1 kHz) on an illustrative clockwork; "Schematic" status line.
    kind: 'schematic',
  },
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
  'interactive:DemoOrSim': {
    // "Schematic pipeline"; the contact-model point is the reality-gap survey's, the two examples Rudin's and ACT's.
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
  'interactive:HindsightRelabel': {
    // "Illustrative push"; the relabelling rule and reward recomputation are hindsight experience replay's.
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
  'interactive:KeypointString': {
    // A picked image point lifted to a target along its camera ray by a depth reading, on an illustrative perspective frame; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:MotInsulation': {
    // Layer-by-layer Mixture-of-Transformers architecture view.
    kind: 'schematic',
  },
  'interactive:NewtonSolvers': {
    // "Schematic of four of Newton's solvers"; the material-to-solver routing is NVIDIA's overview and release post.
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
  'interactive:PlannerExploit': {
    // The article's extrapolation argument on an illustrative fairing bench (one action, a schematic reward and model); "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:RecedingHorizon': {
    // The T_p / T_a replanning dial.
    kind: 'schematic',
  },
  'interactive:ReplayReuse': {
    // "Illustrative batches"; the on-policy discard and off-policy replay rules are PPO's and Q-learning's.
    kind: 'schematic',
  },
  'interactive:Ros2Interfaces': {
    // Message sequences for the three ROS 2 interface types, with example node names.
    kind: 'schematic',
  },
  'interactive:Ros2PolicyLayout': {
    // One recommended node layout; the QoS labels quote the ROS 2 docs.
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
  'interactive:SafetyFilterFence': {
    // A safety filter's least-change rule on an illustrative stroke and keep-out zone; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:SceneSplit': {
    // The article's split rule on twenty illustrative episodes and one seeded random draw; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:ScopeFollow': {
    // ScoPilot's camera following (Level 1 on Yang's scale) on an illustrative box trainer and peg drill; "Schematic" status line.
    kind: 'schematic',
  },
  'interactive:TrajectoryStitching': {
    // "Illustrative map" of two recorded runs crossing once.
    kind: 'schematic',
  },
  'interactive:WmDisambiguator': {
    // Six paradigm panels of the world-model taxonomy.
    kind: 'schematic',
  },
};
