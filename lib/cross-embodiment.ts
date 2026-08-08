/**
 * Structured data and slot-layout logic for the cross-embodiment
 * interactive: the same task across three robots (plus an egocentric
 * human-hand data source), viewed through the three published strategies
 * for making one policy span heterogeneous bodies.
 *
 * Sources (research/01-learned-manipulation-lineage.md):
 * - Padded shared action/state vector with per-embodiment normalization:
 *   pi0 (arXiv:2410.24164), also Octo (arXiv:2405.12213).
 * - Motion Transfer: Gemini Robotics 1.5 (arXiv:2510.03342). Named but
 *   not specified publicly; the latent rendering here is schematic.
 * - Shared relative end-effector action space across robot and human
 *   data: GR00T N1.7 (Isaac-GR00T repo), the mechanism that lets 20K
 *   hours of EgoScale human video enter pretraining directly.
 *
 * Data honesty: the shared vector width (32 slots), the motion latent
 * width (8), and the shared-EEF width (8) are illustrative renderings,
 * labeled as such in the UI. The only sourced dims on display are the
 * humanoid's 29 state/action dims (GR00T N1, per its paper) and the
 * 20K-hour EgoScale figure (N1.7 README).
 */

/** Illustrative width of the shared action/state vector strip. */
export const SHARED_WIDTH = 32;
/**
 * Illustrative width of the Gemini motion-transfer latent group. Sized so
 * the widest embodiment (29 dims) plus the latent fits the strip exactly;
 * a compact bottleneck is the right intuition for a shared motion latent.
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
  /**
   * Native action/state dims this source produces. The humanoid's 29 is
   * the GR00T N1 figure from its paper; the arm and bimanual counts are
   * an illustrative model (7 joints + gripper per arm). The human hand
   * produces keypoint tracks, not a fixed-width vector, so 0 here.
   */
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
    note: 'full-body dims as in GR00T N1',
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
  /** True when the published description does not specify the mechanism. */
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
    proponent: 'pi0 family, Octo',
    mechanism:
      'One action/state vector sized for the widest embodiment in the training mix. Narrower robots occupy the leading dims and zero-pad the tail; each embodiment normalizes with its own statistics.',
    caveat:
      'The padding wastes capacity, and human hand keypoints have no slot in this space, so egocentric video cannot enter pretraining directly.',
    citationId: 'pi0-2024',
    underSpecified: false,
    humanVideoVerdict: 'human video cannot enter this space directly',
  },
  'motion-transfer': {
    id: 'motion-transfer',
    label: 'Motion transfer',
    proponent: 'Gemini Robotics 1.5',
    mechanism:
      'A named architecture and training recipe that transfers motion knowledge between very different robots. Published ablations beat both single-embodiment training and multi-embodiment training without the recipe. The shared motion latent shown here is a schematic: the representation itself is not disclosed.',
    caveat:
      'Publicly under-specified. The report names Motion Transfer but discloses neither the representation nor whether human video participates.',
    citationId: 'gemini-robotics-15-2025',
    underSpecified: true,
    humanVideoVerdict: 'human-video path not disclosed',
  },
  'relative-eef': {
    id: 'relative-eef',
    label: 'Shared relative EEF space',
    proponent: 'GR00T N1.7',
    mechanism:
      'Every embodiment acts in deltas from its current end-effector pose rather than absolute joint targets. A per-embodiment frame transform (the EmbodimentTag system) maps each body, and a tracked human hand, into the same relative space.',
    caveat:
      'Because a human hand already lives in this space, 20,000 hours of EgoScale egocentric video enter pretraining with no domain-adaptation step.',
    citationId: 'isaac-gr00t-repo-2026',
    underSpecified: false,
    humanVideoVerdict: 'human video enters directly: 20,000 hours of EgoScale',
  },
};

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
 * The slot layout one embodiment occupies under one strategy, always
 * SHARED_WIDTH wide so the three strategies render at identical geometry:
 *
 * - padded: the embodiment's native dims lead, the tail is zero-padding.
 *   The human hand has no slot at all (all blocked).
 * - motion-transfer: native dims lead, then the shared motion-latent
 *   group (schematic), then unused. The human-video path is undisclosed,
 *   so the hand row is fully blocked.
 * - relative-eef: every embodiment, hand included, occupies the same
 *   leading EEF_SPACE_DIMS shared dims; nothing is zero-padded.
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
          ? 'no slot for human hand data'
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
          ? 'human-video path not disclosed'
          : `${active} embodiment dims + ${latent} shared latent dims (schematic)`,
    };
  }
  return {
    active,
    zeroed,
    sharedDims: active,
    sharesSpace: true,
    note: `${active} shared dims, deltas from current end-effector pose`,
  };
}
