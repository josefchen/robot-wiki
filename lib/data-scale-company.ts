/**
 * Corpus totals companies report for their own robot models, drawn as a
 * third row kind on the data-bottleneck scale chart next to the public
 * datasets in lib/data-scaling.ts. That module stays byte-stable because the
 * audit's local-basis proofs pin its whole file.
 *
 * Sources (primary, verified 2026-10-26):
 * - Xiaomi-Robotics-1: over 100,000 hours of UMI trajectories (arXiv
 *   2607.15330, title and abstract).
 * - Generalist GEN-0: over 270,000 hours of real-world manipulation data
 *   (Generalist blog).
 * - Generalist GEN-1: over half a million hours (Generalist blog).
 *
 * Each is a lower bound ("over") and none of the data is released, so every
 * point is flagged estimated and kept apart from the public datasets.
 */
import type { DataScalePoint } from './data-scaling.ts';

export type CompanyScalePoint = Omit<DataScalePoint, 'kind'> & { kind: 'company' };
export type ScaleRow = DataScalePoint | CompanyScalePoint;

/** Company-reported totals, ascending. */
export const COMPANY_POINTS: CompanyScalePoint[] = [
  {
    id: 'xiaomi-robotics-1',
    label: 'Xiaomi',
    magnitude: 100_000,
    value: '100,000+ h',
    kind: 'company',
    estimated: true,
    cite: 'xiaomi-robotics-1-2026',
  },
  {
    id: 'gen-0',
    label: 'GEN-0',
    magnitude: 270_000,
    value: '270,000+ h',
    kind: 'company',
    estimated: true,
    cite: 'generalist-gen0-2025',
  },
  {
    id: 'gen-1',
    label: 'GEN-1',
    magnitude: 500_000,
    value: '500,000+ h',
    kind: 'company',
    estimated: true,
    cite: 'generalist-gen1-2026',
  },
];
