/**
 * Data-scale model for the data-bottleneck interactive. Pure functions and
 * constants, unit-tested in tests/unit/data-scaling.test.ts.
 *
 * The chart plots the two data universes of embodied AI on one log-log
 * plane: robot and human demonstration data measured in hours (x axis),
 * language pretraining corpora measured in tokens (y axis). The two series
 * hug their own axes; the empty middle is the point of the chart. There is
 * no honest exchange rate between an hour of robot data and a token of text,
 * so none is drawn.
 *
 * Anchors (all verified against primary sources, cited in the module):
 * - DROID: 76k trajectories, 350 hours, 564 scenes, 50 collectors over 12
 *   months (arXiv 2403.12945). The 12-month, 50-collector figure calibrates
 *   the "DROID-measured" teleop rate: 350 / 50 = 7 hours per collector-year.
 * - TRI LBM: ~1,700 hours total training corpus (468 h internal bimanual,
 *   45 h simulation, 32 h UMI, ~1,150 h OXE) (arXiv 2507.05331).
 * - Ego4D: 3,670 hours of egocentric video (arXiv 2110.07058).
 * - EgoDex: 829 hours of egocentric hand video with 3D tracking
 *   (arXiv 2505.11709).
 * - EgoScale: 20,854 hours of action-labeled egocentric human video
 *   (arXiv 2602.16710).
 * - Open X-Embodiment: 1M+ trajectories across 22 embodiments; hours are an
 *   estimate (~10k), flagged as such (arXiv 2310.08864).
 * - AgiBot World (Beta): 1,003,672 trajectories; hours estimated (~100k),
 *   flagged (arXiv 2503.06669).
 * - GPT-3: 300B training tokens (arXiv 2005.14165).
 * - Llama 3: over 15T tokens (Meta blog, April 2024); FineWeb replicates
 *   that scale openly (arXiv 2406.17557).
 *
 * Determinism: no Math.random anywhere; rendered values are rounded so SSR
 * HTML and client hydration serialize identically.
 */

export interface DataScalePoint {
  id: string;
  /** Dataset or corpus name rendered beside the marker. */
  label: string;
  /** Hours for robot/human-video points, tokens for llm points. */
  magnitude: number;
  /** Pre-rendered magnitude string ("350 h", "15T"). */
  value: string;
  kind: 'robot' | 'human-video' | 'llm';
  /** True when the hours figure is an estimate, not a published count. */
  estimated: boolean;
  /** Citation registry id backing the number. */
  cite: string;
}

/** Robot and human demonstration data, in hours, ascending by scale. */
export const ROBOT_POINTS: DataScalePoint[] = [
  {
    id: 'droid',
    label: 'DROID',
    magnitude: 350,
    value: '350 h',
    kind: 'robot',
    estimated: false,
    cite: 'droid-2024',
  },
  {
    id: 'egodex',
    label: 'EgoDex',
    magnitude: 829,
    value: '829 h',
    kind: 'human-video',
    estimated: false,
    cite: 'egodex-2025',
  },
  {
    id: 'tri-lbm',
    label: 'TRI LBM',
    magnitude: 1700,
    value: '~1,700 h',
    kind: 'robot',
    estimated: true,
    cite: 'tri-lbm-2025',
  },
  {
    id: 'ego4d',
    label: 'Ego4D',
    magnitude: 3670,
    value: '3,670 h',
    kind: 'human-video',
    estimated: false,
    cite: 'ego4d-2022',
  },
  {
    id: 'oxe',
    label: 'OXE',
    magnitude: 10_000,
    value: '~10k h',
    kind: 'robot',
    estimated: true,
    cite: 'open-x-embodiment-2023',
  },
  {
    id: 'egoscale',
    label: 'EgoScale',
    magnitude: 20_854,
    value: '20,854 h',
    kind: 'human-video',
    estimated: false,
    cite: 'egoscale-2026',
  },
  {
    id: 'agibot',
    label: 'AgiBot World',
    magnitude: 100_000,
    value: '~100k h',
    kind: 'robot',
    estimated: true,
    cite: 'agibot-world-2025',
  },
];

/** Language pretraining corpora, in tokens. */
export const LLM_POINTS: DataScalePoint[] = [
  {
    id: 'gpt3',
    label: 'GPT-3',
    magnitude: 3e11,
    value: '300B tokens',
    kind: 'llm',
    estimated: false,
    cite: 'gpt3-2020',
  },
  {
    id: 'llama3',
    label: 'Llama 3',
    magnitude: 1.5e13,
    value: '15T tokens',
    kind: 'llm',
    estimated: false,
    cite: 'llama-3-2024',
  },
];

/* Teleop-farm projection model. */

export const MIN_RIGS = 1;
export const MAX_RIGS = 500;
/**
 * Default fleet: 15 rigs puts the projection marker at 15,000 h/yr, clear of
 * every dataset marker on the chart (OXE sits at 10k, EgoScale at ~21k).
 */
export const DEFAULT_RIGS = 15;

/** "OXE scale": the order of magnitude of the largest aggregated corpus. */
export const OXE_SCALE_HOURS = 10_000;
/** "Frontier target": 100x OXE scale, the ambition the scaling laws imply. */
export const FRONTIER_HOURS = 1_000_000;

export type CollectionRateId = 'dedicated' | 'droid-measured';

export interface CollectionRate {
  id: CollectionRateId;
  /** Short toggle label. */
  label: string;
  hoursPerRigYear: number;
  /** One-line provenance note rendered with the toggle. */
  note: string;
}

export const COLLECTION_RATES: CollectionRate[] = [
  {
    id: 'dedicated',
    label: 'Dedicated farm',
    hoursPerRigYear: 1000,
    note: 'Assumption: about 4 productive teleop hours per rig per day. A modeling choice, not a measurement; flip to the DROID rate to see measured distributed throughput.',
  },
  {
    id: 'droid-measured',
    label: 'DROID-measured',
    hoursPerRigYear: 7,
    note: 'Measured: DROID collected 350 hours with 50 collectors in 12 months, about 7 hours per collector-year. Part-time distributed collection is far slower than a dedicated farm.',
  },
];

export function rateById(id: CollectionRateId): CollectionRate {
  const rate = COLLECTION_RATES.find((r) => r.id === id);
  if (!rate) throw new Error(`unknown collection rate: ${id}`);
  return rate;
}

/** Projected demonstration hours collected per year. */
export function hoursPerYear(rigs: number, rateId: CollectionRateId): number {
  return rigs * rateById(rateId).hoursPerRigYear;
}

/** Years to accumulate targetHours at the current fleet throughput. */
export function yearsToTarget(
  rigs: number,
  rateId: CollectionRateId,
  targetHours: number,
): number {
  return targetHours / hoursPerYear(rigs, rateId);
}

/* Formatters. */

/** "70 h", "350 h", "1,700 h", "10,000 h", "100,000 h", "1.0M h". */
export function formatHours(hours: number): string {
  if (hours >= 1e6) return `${(hours / 1e6).toFixed(1)}M h`;
  return `${Math.round(hours).toLocaleString('en-US')} h`;
}

/** "300B", "15T". */
export function formatTokens(tokens: number): string {
  if (tokens >= 1e12) return `${(tokens / 1e12).toFixed(tokens >= 1e13 ? 0 : 1)}T`;
  if (tokens >= 1e9) return `${Math.round(tokens / 1e9)}B`;
  return `${Math.round(tokens)}`;
}

/** "6 mo" under a year, "1.0 yr" to "99.9 yr", then "100 yr", "14,286 yr". */
export function formatDuration(years: number): string {
  if (years >= 100) return `${Math.round(years).toLocaleString('en-US')} yr`;
  if (years >= 1) return `${years.toFixed(1)} yr`;
  return `${Math.max(1, Math.round(years * 12))} mo`;
}

/** "1", "10", "500". */
export function formatRigs(rigs: number): string {
  return rigs.toLocaleString('en-US');
}

/**
 * The what-to-scale summary table rendered by ScalingLawsTable. One row per
 * data dimension across the two scaling-laws papers (Lin et al. 2024,
 * Shi et al. 2025); kept here so the prose claims and the table share one
 * source.
 */
export interface ScalingLawRow {
  key: string;
  dimension: string;
  effect: string;
  saturation: string;
  source: string;
}

export const SCALING_LAW_ROWS: ScalingLawRow[] = [
  {
    key: 'environments',
    dimension: 'Environments',
    effect: 'strong positive, power law',
    saturation: 'none found up to 32 envs',
    source: 'Lin et al. 2024',
  },
  {
    key: 'objects',
    dimension: 'Objects',
    effect: 'strong positive, power law',
    saturation: 'none found',
    source: 'Lin et al. 2024',
  },
  {
    key: 'demos',
    dimension: 'Demos per environment',
    effect: 'positive, saturating',
    saturation: 'about 50 per env',
    source: 'Lin et al. 2024',
  },
  {
    key: 'tasks',
    dimension: 'Task diversity',
    effect: 'strong positive',
    saturation: 'none found',
    source: 'Shi et al. 2025',
  },
  {
    key: 'experts',
    dimension: 'Expert diversity',
    effect: 'negative unless debiased',
    saturation: 'multimodal action distributions',
    source: 'Shi et al. 2025',
  },
  {
    key: 'embodiments',
    dimension: 'Multi-embodiment pretraining',
    effect: 'optional',
    saturation: 'single-embodiment suffices',
    source: 'Shi et al. 2025',
  },
];
