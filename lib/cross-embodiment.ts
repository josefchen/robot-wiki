/**
 * Original slot-layout teaching model for cross-embodiment interfaces.
 * None of the slot widths is a robot specification or a learned architecture.
 * The padded view illustrates an assumed coordinate layout, not a verified
 * shared pi0/Octo implementation. Octo's v2 paper describes delta-EEF dataset
 * curation and adaptable input/output heads.
 * Motion Transfer descriptions below retain the already applied GR1.5
 * source correction; the slot allocation is illustrative.
 * N1.7's README reports shared relative EEF and 20K human-video hours;
 * EgoScale separately describes wrist deltas, retargeted hand joint actions
 * and aligned human-robot mid-training.
 */

/** Illustrative width of the shared action/state vector strip. */
export const SHARED_WIDTH = 32;
/**
 * Illustrative width of the Gemini motion-transfer latent group. Sized so
 * the widest embodiment (29 dims) plus the latent fits the strip exactly;
 * this display choice is not evidence for a model bottleneck or latent size.
 */
export const LATENT_DIMS = 3;
/** Illustrative width of the shared relative-EEF delta space. */
export const EEF_SPACE_DIMS = 8;

export type StrategyId = 'padded' | 'motion-transfer' | 'relative-eef';
export type EmbodimentId = 'arm' | 'bimanual' | 'humanoid' | 'human-hand';

export const STRATEGY_ORDER: readonly StrategyId[] = [
  'padded',
  'motion-transfer',
  'relative-eef',
];

export const EMBODIMENT_ORDER: readonly EmbodimentId[] = [
  'arm',
  'bimanual',
  'humanoid',
  'human-hand',
];

export interface Embodiment {
  id: EmbodimentId;
  label: string;
  /** Illustrative coordinate count; not hardware DoF or a cited model width. */
  nativeDims: number;
  /** One line on where those dims come from. */
  note: string;
}

export const EMBODIMENTS: readonly Embodiment[] = [
  {
    id: 'arm',
    label: '7-DoF arm',
    nativeDims: 8,
    note: '7 joint targets + gripper (illustrative)',
  },
  {
    id: 'bimanual',
    label: 'bimanual setup',
    nativeDims: 16,
    note: 'two arms, two grippers (illustrative)',
  },
  {
    id: 'humanoid',
    label: 'humanoid',
    nativeDims: 29,
    note: '29 illustrative coordinates; not hardware DoF',
  },
  {
    id: 'human-hand',
    label: 'human hand, egocentric video',
    nativeDims: 0,
    note: '3D hand keypoints tracked from video',
  },
];

export function embodimentById(id: EmbodimentId): Embodiment {
  const found = EMBODIMENTS.find((e) => e.id === id);
  if (!found) throw new Error(`unknown embodiment: ${id}`);
  return found;
}

export interface Strategy {
  id: StrategyId;
  /** Toggle button label. */
  label: string;
  /** Who ships this strategy. */
  proponent: string;
  /** What the mechanism is, one or two sentences. */
  mechanism: string;
  /** What the strategy costs or leaves open, one sentence. */
  caveat: string;
  /** Citation registry id backing the mechanism. */
  citationId: string;
  /** True when the source does not specify the illustrated internal layout. */
  underSpecified: boolean;
  /**
   * Verdict line for the summary readout: can egocentric human video
   * enter pretraining directly under this strategy?
   */
  humanVideoVerdict: string;
}

export const STRATEGIES: Record<StrategyId, Strategy> = {
  padded: {
    id: 'padded',
    label: 'Padded shared vector',
    proponent: 'Original slot-layout example',
    mechanism:
      'This toy puts each robot row in the leading coordinates of a 32-slot vector and zero-pads the rest. It is not an implementation of pi0 or Octo and performs no normalization.',
    caveat:
      'The toy does not define a human hand-to-action adapter. Its empty hand row is not a claim that padded models cannot learn from human data.',
    citationId: 'octo-2024',
    underSpecified: false,
    humanVideoVerdict: 'human video: no adapter modelled in this toy',
  },
  'motion-transfer': {
    id: 'motion-transfer',
    label: 'Motion transfer',
    proponent: 'Gemini Robotics 1.5',
    mechanism:
      'The v3 report describes a training recipe that aligns embodiments and extracts shared knowledge. Its generalization ablation compares single- and multi-embodiment GR 1.5 variants without Motion Transfer. The hatched blocks are an illustrative link, not a disclosed latent architecture.',
    caveat:
      'Internal alignment details are not specified. The model card discloses continuous actions; the discussion says the architecture can learn from human and synthetic video without action annotations, while broader use remains future work.',
    citationId: 'gemini-robotics-15-2025',
    underSpecified: true,
    humanVideoVerdict: 'human-hand mapping not specified in this illustration',
  },
  'relative-eef': {
    id: 'relative-eef',
    label: 'Shared relative EEF space',
    proponent: 'GR00T N1.7',
    mechanism:
      'NVIDIA describes N1.7 relative end-effector actions shared across human and robot data. EgoScale separately specifies wrist deltas and retargeted hand joint actions; this eight-slot strip does not implement those adapters.',
    caveat:
      'The N1.7 README reports 20K hours of EgoScale human video alongside robot demonstrations. The separate EgoScale paper also uses aligned human-robot mid-training.',
    citationId: 'isaac-gr00t-repo-2026',
    underSpecified: false,
    humanVideoVerdict: 'N1.7 README: 20K hours of EgoScale human video',
  },
};

/**
 * The EgoScale paper, cited as extra source context beside the
 * relative-EEF strategy's own source (its caveat names EgoScale's separate
 * specification). Named here rather than inline in the component so the
 * server can resolve the record the widget renders (lib/widget-citations.ts).
 */
export const RELATIVE_EEF_CONTEXT_CITATION_ID = 'egoscale-2026';

export function strategyById(id: StrategyId): Strategy {
  const found = STRATEGIES[id];
  if (!found) throw new Error(`unknown strategy: ${id}`);
  return found;
}

export type SlotState = 'active' | 'zeroed' | 'latent' | 'blocked';

export interface Slot {
  index: number;
  state: SlotState;
}

function row(active: number, latent: number, rest: SlotState): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < SHARED_WIDTH; i += 1) {
    let state: SlotState;
    if (i < active) state = 'active';
    else if (i < active + latent) state = 'latent';
    else state = rest;
    slots.push({ index: i, state });
  }
  return slots;
}

/**
 * Original fixed-width slot layout, not a learned transfer model.
 * Padding and empty human rows are local toy choices.
 * Motion-transfer and relative-EEF slots are illustrative allocations.
 * No control equations, hand retargeting, model adapters or training occur here.
 */
export function slotRow(strategy: StrategyId, embodiment: EmbodimentId): Slot[] {
  strategyById(strategy);
  const body = embodimentById(embodiment);
  switch (strategy) {
    case 'padded':
      return embodiment === 'human-hand'
        ? row(0, 0, 'blocked')
        : row(body.nativeDims, 0, 'zeroed');
    case 'motion-transfer':
      return embodiment === 'human-hand'
        ? row(0, 0, 'blocked')
        : row(body.nativeDims, LATENT_DIMS, 'blocked');
    case 'relative-eef':
      return row(EEF_SPACE_DIMS, 0, 'blocked');
  }
}

export interface RowSummary {
  /** Dims this embodiment actually drives. */
  active: number;
  /** Dims carried as zero-padding. */
  zeroed: number;
  /** Dims in a shared cross-embodiment representation (latent or EEF). */
  sharedDims: number;
  /** True when this source acts in the same space as the other rows. */
  sharesSpace: boolean;
  /** One-line readout note for the row. */
  note: string;
}

/** Numeric readout for one embodiment row under one strategy. */
export function rowSummary(
  strategy: StrategyId,
  embodiment: EmbodimentId,
): RowSummary {
  const slots = slotRow(strategy, embodiment);
  const count = (state: SlotState) =>
    slots.filter((s) => s.state === state).length;
  const active = count('active');
  const zeroed = count('zeroed');
  const latent = count('latent');

  if (strategy === 'padded') {
    return {
      active,
      zeroed,
      sharedDims: 0,
      sharesSpace: false,
      note:
        embodiment === 'human-hand'
          ? 'no adapter modelled for human data (toy)'
          : `${active} active, ${zeroed} zero-padded`,
    };
  }
  if (strategy === 'motion-transfer') {
    return {
      active,
      zeroed,
      sharedDims: latent,
      sharesSpace: embodiment !== 'human-hand',
      note:
        embodiment === 'human-hand'
          ? 'human-hand mapping not specified in this illustration'
          : `${active} illustrative embodiment slots + ${latent} hatched link slots (not model dimensions)`,
    };
  }
  return {
    active,
    zeroed,
    sharedDims: active,
    sharesSpace: true,
    note: `${active} shared dims (toy); wrist and hand actions not separately modelled`,
  };
}
