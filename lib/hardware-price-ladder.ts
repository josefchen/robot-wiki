import { HARDWARE } from '@/data/hardware';
import type { HardwareEntry } from '@/data/schemas/hardware';

/**
 * The buyer's-guide prices a maker or seller lists, for the price ladder on
 * hardware-taxonomy. Prices are read from the guide rows (data/hardware.ts),
 * so the ladder and the guide cannot disagree; each point names the maker
 * or seller page that prints its price.
 *
 * Guide prices left off, and why:
 * - Parts lists, not prices: SO-101 self-build, Koch v1.1, LEAP Hand.
 * - Reported by others, not by the maker: Noetix Bumi (press), GelSight
 *   Mini and DIGIT (a review article).
 * - No price in the guide: ALOHA 2, Franka Panda, the hands sold with a
 *   robot, Digit 360, AnySkin, the GPUs, and the humanoids below.
 */

export type LadderRow = 'arm' | 'humanoid' | 'compute';

export interface LadderPoint {
  /** Guide row id (data/hardware.ts). */
  rowId: string;
  label: string;
  row: LadderRow;
  /** The guide row's low price, or its high one when the row lists two products. */
  end: 'low' | 'high';
  /** The maker or seller page that prints this price. */
  citationId: string;
}

export const LADDER_ROWS: readonly { id: LadderRow; label: string }[] = [
  { id: 'arm', label: 'Arms' },
  { id: 'humanoid', label: 'Humanoids' },
  { id: 'compute', label: 'Robot computers' },
];

const POINTS: readonly LadderPoint[] = [
  { rowId: 'so-arm101-pro-unassembled', label: 'SO-ARM101 Pro kit', row: 'arm', end: 'low', citationId: 'seeed-so-arm101-pro-2026' },
  { rowId: 'so-arm101-pro-assembled', label: 'SO-ARM101 Pro, assembled', row: 'arm', end: 'low', citationId: 'seeed-so-arm101-pro-2026' },
  { rowId: 'widowx-ai', label: 'WidowX AI', row: 'arm', end: 'low', citationId: 'trossen-widowx-ai-2026' },
  { rowId: 'solo-ai', label: 'Solo AI', row: 'arm', end: 'low', citationId: 'trossen-ai-2026' },
  { rowId: 'stationary-ai', label: 'Stationary AI', row: 'arm', end: 'low', citationId: 'trossen-ai-2026' },
  { rowId: 'mobile-ai', label: 'Mobile AI', row: 'arm', end: 'low', citationId: 'trossen-ai-2026' },
  { rowId: 'reachy-2', label: 'Reachy 2', row: 'arm', end: 'low', citationId: 'hf-pollen-acquisition-2025' },
  { rowId: 'unitree-r1', label: 'Unitree R1 Air', row: 'humanoid', end: 'low', citationId: 'unitree-r1-2026' },
  { rowId: 'unitree-r1', label: 'Unitree R1', row: 'humanoid', end: 'high', citationId: 'unitree-r1-2026' },
  { rowId: 'unitree-g1', label: 'Unitree G1', row: 'humanoid', end: 'low', citationId: 'unitree-g1-2026' },
  { rowId: '1x-neo', label: '1X NEO', row: 'humanoid', end: 'low', citationId: '1x-order-2026' },
  { rowId: 'limx-oli', label: 'LimX Oli', row: 'humanoid', end: 'low', citationId: 'limx-oli-launch-2025' },
  { rowId: 'unitree-h2', label: 'Unitree H2', row: 'humanoid', end: 'low', citationId: 'unitree-h2-2026' },
  { rowId: 'jetson-thor-t4000', label: 'Jetson Thor T4000', row: 'compute', end: 'low', citationId: 'nvidia-jetson-faq' },
  { rowId: 'jetson-thor-t5000', label: 'Jetson Thor T5000', row: 'compute', end: 'low', citationId: 'nvidia-jetson-faq' },
];

/** Humanoid rows with no maker price, and the ones not on open sale. */
export const NO_MAKER_PRICE = ['engineai-se01', 'fourier-gr3', 'ubtech-walker-s2'] as const;
export const NOT_ON_SALE = ['figure-03', 'atlas-electric', 'tesla-optimus-3'] as const;

export interface PricedPoint extends LadderPoint {
  priceUsd: number;
  priceAsOf: string;
}

function guideRow(id: string): HardwareEntry {
  const row = HARDWARE.find((entry) => entry.id === id);
  if (!row) throw new Error(`hardware-price-ladder: no guide row "${id}"`);
  return row;
}

function priced(point: LadderPoint): PricedPoint {
  const row = guideRow(point.rowId);
  const priceUsd = point.end === 'high' ? row.priceMaxUsd : row.priceUsd;
  if (priceUsd === null || row.priceAsOf === null) {
    throw new Error(`hardware-price-ladder: guide row "${point.rowId}" has no ${point.end} price`);
  }
  return { ...point, priceUsd, priceAsOf: row.priceAsOf };
}

export const LADDER_POINTS: readonly PricedPoint[] = POINTS.map(priced).sort((a, b) => a.priceUsd - b.priceUsd);

export function rowPoints(row: LadderRow): PricedPoint[] {
  return LADDER_POINTS.filter((point) => point.row === row);
}

export function usd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}
