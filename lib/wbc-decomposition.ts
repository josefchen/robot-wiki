/**
 * Whole-body control decomposition model for the humanoid-wbc module.
 *
 * Three decompositions of humanoid whole-body control are shipping in 2026:
 * a single RL policy tracking retargeted human motion (the academic lineage
 * PHC through GMT, industrialized as Figure's Helix 02 S0), a hierarchical
 * split where a VLA emits latent action tokens that a learned whole-body
 * controller decodes (NVIDIA GR00T N1.7 + GEAR-SONIC), and one end-to-end
 * VLA controlling the robot feet to fingertips (Gemini Robotics 2).
 *
 * Every number below comes from the cited primary source (see the module's
 * Cite chips): the Helix 02 announcement, the Isaac GR00T N1.7 repo README,
 * and the Gemini Robotics 2 announcement. Rates and parameter counts the
 * sources do not disclose are null / "not disclosed", never guessed.
 *
 * Pure data and functions only; the components and the tests share this.
 */

export type WbcApproachId = 'tracking-rl' | 'latent-action' | 'end-to-end-vla';

export interface WbcLayer {
  /** Layer name as the source names it. */
  name: string;
  /** What the layer emits to the layer below. */
  output: string;
  /** Display string for the layer's rate. */
  rate: string;
  /** Numeric rate in Hz when the source discloses one. */
  rateHz: number | null;
}

export interface WbcStat {
  label: string;
  value: string;
}

export interface WbcApproach {
  id: WbcApproachId;
  /** Short control-toggle label. */
  name: string;
  /** The 2026 system that carries this decomposition. */
  representative: string;
  /** Other systems using the same decomposition. */
  lineage: string[];
  /** One sentence stating the decomposition. */
  idea: string;
  /** Stack from the slowest, highest layer down to the actuator boundary. */
  layers: WbcLayer[];
  /** Numeric readout figures, each traceable to the source. */
  stats: WbcStat[];
  /** What crosses the policy boundary, in one phrase. */
  interfaceNote: string;
  /** Openness of code and weights. */
  openness: string;
}

export const WBC_APPROACHES: WbcApproach[] = [
  {
    id: 'tracking-rl',
    name: 'Motion-tracking RL',
    representative: 'Figure Helix 02 S0',
    lineage: ['PHC', 'H2O', 'OmniH2O', 'HumanPlus', 'ExBody2', 'ASAP', 'GMT'],
    idea: 'One reinforcement-learned policy tracks a retargeted human reference motion; the reference carries intent and the policy supplies balance and contact feasibility.',
    layers: [
      {
        name: 'S2 semantic reasoning',
        output: 'latent goals',
        rate: 'on demand',
        rateHz: null,
      },
      {
        name: 'S1 visuomotor transformer',
        output: 'full-body joint targets',
        rate: '200 Hz',
        rateHz: 200,
      },
      {
        name: 'S0 whole-body controller',
        output: 'joint actuator commands',
        rate: '1 kHz',
        rateHz: 1000,
      },
    ],
    stats: [
      { label: 'S0 params', value: '10M' },
      { label: 'S0 loop rate', value: '1000 Hz' },
      { label: 'Motion data', value: '1000+ h' },
      { label: 'Sim envs', value: '200,000+' },
    ],
    interfaceNote:
      'the retargeted human motion is the interface: layers above the tracking policy speak motion, never torque',
    openness: 'Helix 02 is closed; the academic lineage is published',
  },
  {
    id: 'latent-action',
    name: 'Latent-action hierarchy',
    representative: 'GR00T N1.7 + GEAR-SONIC',
    lineage: ['LeVERB', 'WholeBodyVLA'],
    idea: 'A vision-language-action model emits compact latent action tokens; a separately trained whole-body controller decodes them into full-body joint commands.',
    layers: [
      {
        name: 'GR00T N1.7 VLA',
        output: 'latent action tokens',
        rate: 'policy rate',
        rateHz: null,
      },
      {
        name: 'GEAR-SONIC whole-body controller',
        output: 'full-body joint commands',
        rate: 'not disclosed',
        rateHz: null,
      },
    ],
    stats: [
      { label: 'VLA params', value: '3B' },
      { label: 'Action horizon', value: '40' },
      { label: 'State/action', value: '132' },
      { label: 'Human video', value: '20,000 h' },
    ],
    interfaceNote:
      'latent tokens are the interface: the VLA never names a joint, the controller never sees pixels',
    openness: 'code Apache-2.0, weights under the NVIDIA Open Model License',
  },
  {
    id: 'end-to-end-vla',
    name: 'End-to-end VLA',
    representative: 'Gemini Robotics 2',
    lineage: [],
    idea: 'One policy takes pixels and language and controls the whole body feet to fingertips, hands included; no separate whole-body controller exists.',
    layers: [
      {
        name: 'ER 2 orchestrator',
        output: 'plans and tool calls',
        rate: 'on demand',
        rateHz: null,
      },
      {
        name: 'Gemini Robotics 2 VLA',
        output: 'full-body actions, feet to fingertips',
        rate: 'not disclosed',
        rateHz: null,
      },
    ],
    stats: [
      { label: 'Embodiments', value: '3' },
      { label: 'Hand DoF', value: '22' },
      { label: 'Adaptation', value: '< 200 examples' },
      { label: 'Architecture', value: 'not disclosed' },
    ],
    interfaceNote:
      'there is no internal interface: the VLA boundary is the robot boundary',
    openness: 'closed; published numbers are vendor-reported',
  },
];

export const APPROACH_ORDER: WbcApproachId[] = WBC_APPROACHES.map((a) => a.id);

export const DEFAULT_APPROACH: WbcApproachId = 'tracking-rl';

export function approachById(id: WbcApproachId): WbcApproach {
  const found = WBC_APPROACHES.find((a) => a.id === id);
  if (!found) throw new Error(`unknown WBC approach: ${id}`);
  return found;
}

export function layerCount(approach: WbcApproach): number {
  return approach.layers.length;
}

/** Fastest disclosed loop rate in the stack, or null when none is public. */
export function fastestRateHz(approach: WbcApproach): number | null {
  const rates = approach.layers
    .map((l) => l.rateHz)
    .filter((r): r is number => r !== null);
  return rates.length > 0 ? Math.max(...rates) : null;
}

/** Display string for the fastest-loop readout. */
export function fastestRateLabel(approach: WbcApproach): string {
  const hz = fastestRateHz(approach);
  return hz === null ? 'not disclosed' : `${hz} Hz`;
}

export type Gr2Category =
  | 'whole-body pick'
  | 'multi-finger dexterity'
  | 'gripper dexterity';

export interface Gr2ResultRow {
  category: Gr2Category;
  task: string;
  embodiment: string;
  /** Vendor-reported success rate, percent. */
  success: number;
}

/**
 * Gemini Robotics 2 success rates as published in the 2026-07-30 DeepMind
 * announcement. Vendor-reported; no external replication exists and there
 * is no standardized humanoid benchmark to compare against.
 */
export const GR2_RESULTS: Gr2ResultRow[] = [
  {
    category: 'whole-body pick',
    task: 'pick from table',
    embodiment: 'Apollo 2 + Inspire',
    success: 68.4,
  },
  {
    category: 'whole-body pick',
    task: 'pick from floor',
    embodiment: 'Apollo 2 + Inspire',
    success: 45.7,
  },
  {
    category: 'whole-body pick',
    task: 'pick from shelf',
    embodiment: 'Apollo 2 + Inspire',
    success: 76.3,
  },
  {
    category: 'multi-finger dexterity',
    task: 'unscrew bulb',
    embodiment: 'Apollo 2 + SharpaWave',
    success: 92,
  },
  {
    category: 'multi-finger dexterity',
    task: 'tie trash bag',
    embodiment: 'Apollo 2 + SharpaWave',
    success: 44,
  },
  {
    category: 'multi-finger dexterity',
    task: 'ziplock',
    embodiment: 'Apollo 2 + SharpaWave',
    success: 40,
  },
  {
    category: 'multi-finger dexterity',
    task: 'screw bulb',
    embodiment: 'Apollo 2 + SharpaWave',
    success: 36,
  },
  {
    category: 'multi-finger dexterity',
    task: 'dustpan',
    embodiment: 'Apollo 2 + SharpaWave',
    success: 32,
  },
  {
    category: 'gripper dexterity',
    task: 'precise insertion',
    embodiment: 'Franka Duo',
    success: 89.6,
  },
  {
    category: 'gripper dexterity',
    task: 'diverse tool kitting',
    embodiment: 'Franka Duo',
    success: 78.9,
  },
  {
    category: 'gripper dexterity',
    task: 'general pick-and-place',
    embodiment: 'Franka Duo',
    success: 74.2,
  },
];

/** The easiest and hardest multi-finger tasks, by reported success. */
export function gr2DexterityRange(): { min: Gr2ResultRow; max: Gr2ResultRow } {
  const multi = GR2_RESULTS.filter((r) => r.category === 'multi-finger dexterity');
  const sorted = [...multi].sort((a, b) => a.success - b.success);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

/** '92' renders as '92%', '68.4' as '68.4%': no invented precision. */
export function formatSuccess(success: number): string {
  return `${Number.isInteger(success) ? success : success.toFixed(1)}%`;
}
